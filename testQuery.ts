import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const { data, error } = await supabase.from('settings').select('*').like('key', 'balance_obs_%');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  const keys = data?.map(d => d.key) || [];
  const duplicates = keys.filter((item, index) => keys.indexOf(item) !== index);
  
  console.log('Total keys:', keys.length);
  console.log('Duplicate keys:', duplicates);

  const { data: d2, error: e2 } = await supabase.from('settings').select('*').eq('key', 'balance_obs_bde6b6d3-5f90-4b4c-b786-9d680ee402b2');
  console.log('Specifc client entries count:', d2?.length);
  
}

main();
