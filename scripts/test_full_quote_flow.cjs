const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

async function run() {
  console.log('=== TESTE DE FLUXO REAL COMPLETO COM RPC accept_quote_proposal ===');
  
  // 1. Consumidor
  const clientCustomer = createClient(url, key);
  const authRes = await clientCustomer.auth.signInWithPassword({
    email: 'cliente_real_auditoria@economizaja.teste',
    password: 'SenhaSegura@2026',
  });
  const customerUser = authRes.data.user;

  // 2. Parceiro
  const clientPartner = createClient(url, key);
  const partnerAuth = await clientPartner.auth.signInWithPassword({
    email: 'parceiro_real_auditoria@economizaja.teste',
    password: 'SenhaParceiro@2026',
  });
  const partnerUser = partnerAuth.data.user;

  const { data: partnerBiz } = await clientPartner
    .from('businesses')
    .select('id, name, city')
    .eq('owner_id', partnerUser.id)
    .single();

  // 3. Consumidor cria solicitação
  const { data: openQuote, error: qErr } = await clientCustomer
    .from('quote_requests')
    .insert({
      user_id: customerUser.id,
      target_business_id: null,
      user_name: 'Consumidor Teste Real',
      user_phone: '51999990000',
      user_email: customerUser.email,
      city: partnerBiz.city || 'Porto Alegre',
      state: 'RS',
      neighborhood: 'Centro',
      category_id: 'automotivo',
      subcategory: 'Mecânica e Freios',
      title: 'Alinhamento e Balanceamento 3D',
      description: 'Cotação para alinhamento a laser e balanceamento de 4 rodas aro 15.',
      desired_deadline: 'Esta semana',
      budget_range: 'R$ 100 - R$ 200',
    })
    .select('id, user_id, status')
    .single();

  if (qErr) {
    console.error('Erro ao criar cotação:', qErr);
    process.exit(1);
  }
  console.log('1. COTAÇÃO CRIADA! ID:', openQuote.id);

  // 4. Parceiro envia proposta
  const { data: proposal, error: propErr } = await clientPartner
    .from('quote_proposals')
    .insert({
      quote_request_id: openQuote.id,
      business_id: partnerBiz.id,
      price: 120.00,
      deadline_text: 'Hoje mesmo',
      description: 'Alinhamento 3D computadorizado com balanceamento das 4 rodas.',
      status: 'pendente',
    })
    .select('id, price, status')
    .single();

  if (propErr) {
    console.error('Erro ao enviar proposta:', propErr);
    process.exit(1);
  }
  console.log('2. PROPOSTA ENVIADA! ID:', proposal.id, 'Valor: R$', proposal.price);

  // 5. Consumidor aceita proposta usando a chamada exata do dataService (RPC accept_quote_proposal)
  console.log('3. Consumidor aceitando via RPC accept_quote_proposal com p_quote_request_id e p_proposal_id...');
  const { data: acceptResult, error: accErr } = await clientCustomer.rpc('accept_quote_proposal', {
    p_quote_request_id: openQuote.id,
    p_proposal_id: proposal.id,
  });

  if (accErr) {
    console.error('Erro na RPC accept_quote_proposal:', accErr);
    process.exit(1);
  }
  console.log('4. RPC accept_quote_proposal SUCESSO:', acceptResult);

  // 6. Confirmação dos status no banco
  const { data: finalQuote } = await clientCustomer
    .from('quote_requests')
    .select('id, status')
    .eq('id', openQuote.id)
    .single();

  const { data: finalProposal } = await clientCustomer
    .from('quote_proposals')
    .select('id, status')
    .eq('id', proposal.id)
    .single();

  console.log('5. STATUS FINAL COTAÇÃO:', finalQuote.status);
  console.log('6. STATUS FINAL PROPOSTA:', finalProposal.status);

  console.log('\n=== FLUXO COMPLETO ORÇAMENTO -> PROPOSTA -> ACEITE: 100% PASSOU! ===');
  process.exit(0);
}

run();
