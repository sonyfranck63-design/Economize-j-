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

async function verify() {
  console.log('--- Testando Usuário Autenticado no Supabase ---');
  const client = createClient(url, key);
  
  const authRes = await client.auth.signInWithPassword({
    email: 'cliente_real_auditoria@economizaja.teste',
    password: 'SenhaSegura@2026',
  });

  if (authRes.error) {
    console.log('Não foi possível logar com usuário de teste:', authRes.error.message);
  } else {
    console.log('[SUCESSO] Login realizado com sucesso para:', authRes.data.user.email);
    
    // Testar secure_leads_view autenticado
    const { data: viewData, error: viewErr } = await client.from('secure_leads_view').select('id, user_name, user_phone, status').limit(5);
    if (viewErr) {
      console.log('[FALHA] View secure_leads_view (autenticado):', viewErr.message, viewErr.code);
    } else {
      console.log('[SUCESSO] View secure_leads_view acessada com sucesso por usuário autenticado!');
      console.log('Leads retornados:', viewData?.length ?? 0);
    }

    // Testar tabela notifications autenticado
    const { data: notifs, error: notifErr } = await client.from('notifications').select('*').limit(5);
    if (notifErr) {
      console.log('[FALHA] notifications (autenticado):', notifErr.message);
    } else {
      console.log('[SUCESSO] notifications acessada com sucesso por usuário autenticado!');
      console.log('Notificações encontradas:', notifs?.length ?? 0);
    }

    // Testar RPC mark_all_notifications_read autenticado
    const { data: rpcRes, error: rpcErr } = await client.rpc('mark_all_notifications_read');
    if (rpcErr) {
      console.log('[FALHA] RPC mark_all_notifications_read:', rpcErr.message);
    } else {
      console.log('[SUCESSO] RPC mark_all_notifications_read executada com sucesso!');
    }
  }
}

verify().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
