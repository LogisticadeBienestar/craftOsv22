import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const cid = '37ae7f41-4e7a-47f5-9121-1708a7ed643a'; // SHAMAN
  const { data: obsData } = await supabase.from('settings').select('*').eq('key', `balance_obs_${cid}`);
  console.log('Shaman settings:', JSON.stringify(obsData, null, 2));
}

main();
