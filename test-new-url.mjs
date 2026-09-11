import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function testTable(tableName) {
  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
      console.log(`[${tableName}] FAILED:`, error.message);
    } else {
      console.log(`[${tableName}] SUCCESS:`, data.length, 'rows');
    }
  } catch (e) {
    console.log(`[${tableName}] CRITICAL EXCEPTION:`, e.message);
  }
}

async function run() {
  console.log('Testing NEW URL:', url);
  await testTable('businesses');
}

run();
