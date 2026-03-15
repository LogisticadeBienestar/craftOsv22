import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const accountId = '2ca6491d-e087-418b-8012-70bbed46a50e'; // A client ID, I need to get one first
  const { data: clients } = await supabase.from('clients').select('id, name').limit(5);
  console.log('Sample clients:', clients);
  
  if (clients && clients.length > 0) {
    const cid = clients[0].id;
    const { data: d1, error: e1 } = await supabase.from('settings').select('value').eq('key', `balance_obs_${cid}`).maybeSingle();
    console.log(`Checking obs for ${clients[0].name}:`, d1, e1);
  }
}

main();
