import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const cid = '37ae7f41-4e7a-47f5-9121-1708a7ed643a'; // SHAMAN
  
  // Try to upsert without onConflict
  const { data, error } = await supabase.from('settings').upsert({ key: `balance_obs_${cid}`, value: 'TEST' });
  console.log('Upsert without onConflict error:', error);
  
  // Try with onConflict
  const { data: d2, error: e2 } = await supabase.from('settings').upsert({ key: `balance_obs_${cid}`, value: 'TEST 2' }, { onConflict: 'key' });
  console.log('Upsert with onConflict error:', e2);
}

main();
