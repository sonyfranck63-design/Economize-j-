import { createClient } from '@supabase/supabase-js';

const url = 'https://mpqvldznudbohfqcinkg.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wcXZsZHpudWRib2hmcWNpbmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MzMwMDgsImV4cCI6MjEwNDAwOTAwOH0.2C5JXzrYA5vVXsjJvq95lUivNq2Qttahl2kxHwMiSCQ';

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
  await testTable('businesses');
  await testTable('offers');
  await testTable('quote_requests');
  await testTable('secure_leads_view');
  await testTable('profiles');
}

run();
