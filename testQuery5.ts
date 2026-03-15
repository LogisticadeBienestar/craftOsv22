import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const { data: clients } = await supabase.from('clients').select('id, name').ilike('name', '%shaman%');
  console.log('Shaman clients:', clients);

  if (clients && clients.length > 0) {
    const cid = clients[0].id;
    const { data: obsData } = await supabase.from('settings').select('*').eq('key', `balance_obs_${cid}`);
    console.log('Shaman settings:', obsData);
  }
  
  // Also get the most recently updated settings
  const { data: allSettings } = await supabase.from('settings').select('*').like('key', 'balance_obs_%').order('key', { ascending: false });
  // Just print a few to see
  console.log('Recent settings total:', allSettings?.length);
  console.log('First 3:', allSettings?.slice(0, 3));
}

main();
