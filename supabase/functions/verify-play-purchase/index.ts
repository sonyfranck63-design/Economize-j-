// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This code runs in Supabase Edge Functions (Deno runtime)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPurchaseRequest {
  businessId: string;
  productId: string;
  purchaseToken: string;
  orderId?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { businessId, productId, purchaseToken, orderId }: VerifyPurchaseRequest = await req.json();

    if (!businessId || !productId || !purchaseToken) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros incompletos (businessId, productId, purchaseToken são obrigatórios).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call internal secure RPC to validate and link purchase
    const { data: rpcData, error: rpcError } = await supabaseClient.rpc('process_google_play_purchase', {
      p_business_id: businessId,
      p_product_id: productId,
      p_purchase_token: purchaseToken,
      p_order_id: orderId || null,
      p_purchase_payload: { verified_by: 'edge-function', timestamp: new Date().toISOString() },
    });

    if (rpcError) {
      console.error('[verify-play-purchase] RPC Error:', rpcError);
      return new Response(
        JSON.stringify({ error: rpcError.message || 'Falha ao registrar compra no servidor.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: rpcData,
        message: 'Assinatura Google Play validada e ativada com sucesso no backend.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[verify-play-purchase] Exception:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno ao validar compra.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
