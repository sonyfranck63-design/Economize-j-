import { createClient } from '@supabase/supabase-js';

const url = 'https://mpqvldznudbohfqcinkg.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wcXZsZHpudWRib2hmcWNpbmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MzMwMDgsImV4cCI6MjEwNDAwOTAwOH0.2C5JXzrYA5vVXsjJvq95lUivNq2Qttahl2kxHwMiSCQ';

const supabase = createClient(url, key);

async function test() {
  console.log('Testing connection to:', url);
  const { data, error } = await supabase.from('businesses').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success, data:', data);
  }
}

test();
