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

const supabase = createClient(url, key);

async function verify() {
  console.log('--- Verificando conexão e tabelas no Supabase ---');
  
  // 1. Verificar tabela notifications
  const { data: notifs, error: notifErr } = await supabase.from('notifications').select('id, user_id, title, read, created_at').limit(5);
  if (notifErr) {
    console.log('[FALHA] Tabela public.notifications:', notifErr.message, notifErr.code);
  } else {
    console.log('[SUCESSO] Tabela public.notifications está ativa e respondendo!');
    console.log('Registros retornados:', notifs?.length ?? 0);
  }

  // 2. Verificar secure_leads_view
  const { data: viewData, error: viewErr } = await supabase.from('secure_leads_view').select('id, user_name, user_phone, status').limit(5);
  if (viewErr) {
    console.log('[FALHA] View public.secure_leads_view:', viewErr.message, viewErr.code);
  } else {
    console.log('[SUCESSO] View public.secure_leads_view está ativa e respondendo!');
    console.log('Registros retornados:', viewData?.length ?? 0);
  }

  // 3. Verificar RPC mark_all_notifications_read
  const { data: rpcData, error: rpcErr } = await supabase.rpc('mark_all_notifications_read');
  if (rpcErr) {
    console.log('[INFO] RPC mark_all_notifications_read (esperado erro de autenticação se deslogado ou resposta):', rpcErr.message);
  } else {
    console.log('[SUCESSO] RPC mark_all_notifications_read existe e está instalada!');
  }
}

verify().then(() => process.exit(0)).catch(e => {
  console.error('Erro na validação:', e);
  process.exit(1);
});
