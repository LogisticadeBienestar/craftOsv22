const db = require('better-sqlite3')('admin.db');
console.log('Orders:', db.prepare('SELECT id, status, fulfillment_status, total_amount, date FROM orders').all());
