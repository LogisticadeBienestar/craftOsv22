import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const cid = '83bae3f2-597c-4505-ab5d-994917b8d395'; // ALMACEN NATURAL CONI
  
  // 1. Simulate saving balance and observation
  const observation = "PEDIDO NEW-TEST REMITO NEW-TEST";
  
  const { error: err1 } = await supabase.from('settings').upsert({ key: `balance_obs_${cid}`, value: observation });
  console.log('Upsert settings result:', err1);
  
  // 2. Fetch it back exactly like /api/clients/:id/account does
  const { data: obsData, error: err2 } = await supabase.from('settings').select('value').eq('key', `balance_obs_${cid}`).maybeSingle();
  console.log('Fetch after upsert:', obsData, err2);
}

main();
