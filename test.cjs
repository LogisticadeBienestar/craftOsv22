const db = require('better-sqlite3')('admin.db');
const startOfMonthUTC = '2026-03-01T00:00:00.000Z';
const endOfMonthUTC = '2026-03-31T23:59:59.999Z';

const salesQuery = db.prepare(`
  SELECT SUM(total_amount) as total
  FROM orders
  WHERE date >= ? AND date <= ? AND status != 'cancelled'
`).get(startOfMonthUTC, endOfMonthUTC);

console.log('Result:', salesQuery);
