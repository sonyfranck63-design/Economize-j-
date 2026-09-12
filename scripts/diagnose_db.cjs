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

async function run() {
  const { data: profs, error: pErr } = await supabase.from('profiles').select('*');
  console.log('Profiles in DB:', profs, pErr);

  // Check quote_requests foreign key definition via rpc if possible or inspect quotes
  const { data: qr, error: qrErr } = await supabase.from('quote_requests').select('*');
  console.log('Quote requests:', qr, qrErr);

  process.exit(0);
}

run();
