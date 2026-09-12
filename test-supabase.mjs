import { createClient } from '@supabase/supabase-js';

const url = 'https://hycixtbsczawkzrjswbx.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y2l4dGJzY3phd2t6cmpzd2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1OTkxMzMsImV4cCI6MjEwNDE3NTEzM30.gt8F5-L33lkO2DJ8BZCweg2dv2XJjaovek3ZehnycfU';

const supabase = createClient(url, key);

async function test() {
  console.log('Testing connection to:', url);
  
  // 1. Test businesses
  const { data: bizData, error: bizError } = await supabase.from('businesses').select('*').limit(5);
  if (bizError) {
    console.error('businesses error:', bizError.message, bizError.code);
  } else {
    console.log('businesses count:', bizData.length, 'data:', bizData);
  }

  // 2. Test profiles
  const { data: profData, error: profError } = await supabase.from('profiles').select('id, email, role').limit(5);
  if (profError) {
    console.error('profiles error:', profError.message, profError.code);
  } else {
    console.log('profiles count:', profData.length);
  }

  // 3. Test quote_requests
  const { data: quotes, error: quoteError } = await supabase.from('quote_requests').select('id, title').limit(5);
  if (quoteError) {
    console.error('quote_requests error:', quoteError.message, quoteError.code);
  } else {
    console.log('quote_requests count:', quotes.length);
  }

  // 4. Test featured_audit_log
  const { data: audit, error: auditError } = await supabase.from('featured_audit_log').select('*').limit(1);
  if (auditError) {
    console.error('featured_audit_log error:', auditError.message);
  } else {
    console.log('featured_audit_log exists, records:', audit.length);
  }

  // 5. Test RPC if any
  const { data: rpcData, error: rpcError } = await supabase.rpc('confirm_featured_payment_and_highlight', {
    p_business_id: '00000000-0000-0000-0000-000000000000',
    p_plan_id: 'test',
    p_amount: 10,
    p_days: 30
  });
  if (rpcError) {
    console.log('RPC test response (esperado erro de validação se existir):', rpcError.message);
  } else {
    console.log('RPC executed successfully:', rpcData);
  }
}

test();
