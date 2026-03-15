import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const accountId = '83bae3f2-597c-4505-ab5d-994917b8d395'; // Using a real ID from db
  
  // get orders and payments
  const { data: orders } = await supabase.from('orders').select('*').limit(2);
  const { data: payments } = await supabase.from('payments').select('*').limit(2);
  
  const movements = [
    ...(orders || []).map((o: any) => ({ ...o, type: 'order' })),
    ...(payments || []).map((p: any) => ({ ...p, type: 'payment' }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  console.log('movements:', movements.map(m => ({ id: m.id, type: m.type })));
  
  // The loop logic from Accounts.tsx
  movements.slice().reverse().map((mov, idx) => {
    const sortedMovementsForBalance = [...movements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let totalSumOfAllMovements = 0;
    for (const m of sortedMovementsForBalance) {
      if (m.type === 'order') {
          totalSumOfAllMovements += m.total_amount;
      } else {
          totalSumOfAllMovements -= m.amount;
      }
    }
    const clientBalance = 1000;
    const initialBalance = clientBalance - totalSumOfAllMovements;

    let sumOfMovementsBeforeCurrent = 0;
    let found = false;
    for (const m of sortedMovementsForBalance) {
      if (m.id === mov.id) {
        found = true;
        break; // Stop at the current movement
      }
      if (m.type === 'order') {
        sumOfMovementsBeforeCurrent += m.total_amount;
      } else {
        sumOfMovementsBeforeCurrent -= m.amount;
      }
    }
    
    console.log(`id: ${mov.id}, found: ${found}, init: ${initialBalance}, sumBefore: ${sumOfMovementsBeforeCurrent}`);
  });
}

main();
