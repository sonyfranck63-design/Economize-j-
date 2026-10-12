// Supabase Edge Function (Deno): valida assinaturas do Google Play no servidor.
//
// Fluxo:
//   1. Autentica o usuário pelo JWT do Supabase enviado pelo app.
//   2. Consulta a Google Play Developer API (purchases.subscriptionsv2) com uma
//      conta de serviço vinculada à Play Console.
//   3. Só ativa o plano (via RPC restrita ao service_role) se o Google confirmar
//      que a assinatura existe, é do produto certo e está vigente.
//
// Secrets necessários (supabase secrets set ...):
//   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON  JSON completo da conta de serviço
//   GOOGLE_PLAY_PACKAGE_NAME          opcional, padrão com.economizaja.app
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY são injetados
// automaticamente pelo Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Assinaturas (planos)
const PRODUCTS: Record<string, 'pro' | 'premium'> = {
  economizaja_pro_monthly: 'pro',
  economizaja_premium_monthly: 'premium',
};

// Compras únicas consumíveis (destaque patrocinado)
const FEATURED_PRODUCTS: Record<string, number> = {
  economizaja_destaque_7_dias: 7,
  economizaja_destaque_15_dias: 15,
  economizaja_destaque_30_dias: 30,
};

// Estados em que o usuário ainda tem direito ao benefício (até expiryTime)
const ENTITLED_STATES = new Set([
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
  'SUBSCRIPTION_STATE_CANCELED',
]);

interface VerifyPurchaseRequest {
  businessId: string;
  productId: string;
  purchaseToken: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const base64url = (data: ArrayBuffer | Uint8Array | string): string => {
  const bytes =
    typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array
      ? data
      : new Uint8Array(data);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function getGoogleAccessToken(serviceAccount: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );

  const pem = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${claims}`)
  );

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${base64url(signature)}`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao autenticar na Google Play Developer API (${res.status}).`);
  }
  const data = await res.json();
  return data.access_token as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const serviceAccountRaw = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
    const packageName = Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME') || 'com.economizaja.app';

    if (!serviceAccountRaw || !serviceRoleKey) {
      console.error('[verify-play-purchase] Secrets ausentes: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON / SERVICE_ROLE');
      return json({ error: 'Validação de compras ainda não configurada no servidor.' }, 503);
    }

    // 1. Usuário autenticado
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return json({ error: 'Usuário não autenticado.' }, 401);
    }

    const { businessId, productId, purchaseToken }: VerifyPurchaseRequest = await req.json();
    if (!businessId || !productId || !purchaseToken) {
      return json({ error: 'Parâmetros incompletos (businessId, productId, purchaseToken).' }, 400);
    }
    const planTier = PRODUCTS[productId];
    const featuredDays = FEATURED_PRODUCTS[productId];
    if (!planTier && !featuredDays) {
      return json({ error: `Produto não reconhecido: ${productId}` }, 400);
    }

    // 2. Consulta oficial ao Google Play
    const accessToken = await getGoogleAccessToken(JSON.parse(serviceAccountRaw));
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 2a. Compra única de destaque patrocinado
    if (featuredDays) {
      const productUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
        packageName
      )}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;

      const productRes = await fetch(productUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (productRes.status === 404 || productRes.status === 400 || productRes.status === 410) {
        return json({ error: 'Comprovante de compra inválido ou inexistente no Google Play.' }, 400);
      }
      if (!productRes.ok) {
        console.error('[verify-play-purchase] Google API (produto) status', productRes.status, await productRes.text());
        return json({ error: 'Não foi possível consultar o Google Play. Tente novamente.' }, 502);
      }

      const purchase = await productRes.json();
      // purchaseState: 0 = comprado, 1 = cancelado, 2 = pendente
      if (purchase.purchaseState !== 0) {
        return json(
          {
            error:
              purchase.purchaseState === 2
                ? 'Pagamento ainda pendente no Google Play. O destaque será ativado após a confirmação.'
                : 'Esta compra foi cancelada no Google Play.',
          },
          400
        );
      }
      if (purchase.obfuscatedExternalAccountId && purchase.obfuscatedExternalAccountId !== businessId) {
        return json({ error: 'Esta compra pertence a outra empresa.' }, 403);
      }

      const { data: rpcData, error: rpcError } = await adminClient.rpc('apply_verified_featured_purchase', {
        p_user_id: user.id,
        p_business_id: businessId,
        p_product_id: productId,
        p_purchase_token: purchaseToken,
        p_order_id: purchase.orderId || null,
      });
      if (rpcError) {
        console.error('[verify-play-purchase] RPC destaque error:', rpcError);
        return json({ error: rpcError.message || 'Falha ao ativar o destaque.' }, 400);
      }

      // Consome a compra no Google (confirma a entrega e permite comprar de novo).
      // consumptionState: 0 = ainda não consumida
      if (purchase.consumptionState === 0) {
        const consumeRes = await fetch(`${productUrl}:consume`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!consumeRes.ok) {
          // O destaque já foi concedido; o app tentará reconsumir na próxima abertura do portal
          console.error('[verify-play-purchase] Falha ao consumir', consumeRes.status, await consumeRes.text());
        }
      }

      return json({ success: true, data: rpcData, featuredDays });
    }
    const googleRes = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
        packageName
      )}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (googleRes.status === 404 || googleRes.status === 400 || googleRes.status === 410) {
      return json({ error: 'Comprovante de compra inválido ou inexistente no Google Play.' }, 400);
    }
    if (!googleRes.ok) {
      console.error('[verify-play-purchase] Google API status', googleRes.status, await googleRes.text());
      return json({ error: 'Não foi possível consultar o Google Play. Tente novamente.' }, 502);
    }

    const sub = await googleRes.json();
    const lineItem = (sub.lineItems || []).find((li: any) => li.productId === productId);
    const expiryTime = lineItem?.expiryTime ? new Date(lineItem.expiryTime) : null;

    if (!lineItem || !expiryTime) {
      return json({ error: 'A assinatura não corresponde ao plano informado.' }, 400);
    }
    if (!ENTITLED_STATES.has(sub.subscriptionState) || expiryTime.getTime() <= Date.now()) {
      return json({ error: 'Esta assinatura não está ativa no Google Play.' }, 400);
    }

    // O app envia o id da empresa como obfuscatedExternalAccountId na compra
    const linkedAccount = sub.externalAccountIdentifiers?.obfuscatedExternalAccountId;
    if (linkedAccount && linkedAccount !== businessId) {
      return json({ error: 'Esta assinatura pertence a outra empresa.' }, 403);
    }

    // 3. Ativa o benefício (RPC executável somente pelo service_role)
    const { data: rpcData, error: rpcError } = await adminClient.rpc('apply_verified_google_play_purchase', {
      p_user_id: user.id,
      p_business_id: businessId,
      p_product_id: productId,
      p_purchase_token: purchaseToken,
      p_order_id: sub.latestOrderId || null,
      p_expiry_time: expiryTime.toISOString(),
      p_purchase_payload: {
        verified_by: 'google-play-developer-api',
        subscription_state: sub.subscriptionState,
        acknowledgement_state: sub.acknowledgementState,
        verified_at: new Date().toISOString(),
      },
    });

    if (rpcError) {
      console.error('[verify-play-purchase] RPC error:', rpcError);
      return json({ error: rpcError.message || 'Falha ao registrar a assinatura.' }, 400);
    }

    return json({ success: true, data: rpcData, planTier, expiresAt: expiryTime.toISOString() });
  } catch (err: any) {
    console.error('[verify-play-purchase] Exception:', err);
    return json({ error: err?.message || 'Erro interno ao validar compra.' }, 500);
  }
});
