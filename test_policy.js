import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'matheusfranck2013@gmail.com',
    password: 'Password123!',
  });
  if (error) {
    console.log('Login falhou. Erro esperado ou nao:', error.message);
  }
}
run();
