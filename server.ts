import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env file. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Render.com Persistent Disk config (Kept for static files or backups if needed, though DB is now Supabase)
const renderDataPath = path.join(__dirname, 'data');
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Users
  app.get('/api/users', async (req, res) => {
    try {
      const { data: users, error } = await supabase.from('users').select('*');
      if (error) throw error;
      res.json(users);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/users', async (req, res) => {
    const { id, name, role } = req.body;
    try {
      const { error } = await supabase.from('users').insert({ id, name, role });
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, role } = req.body;
    try {
      const { error } = await supabase.from('users').update({ name, role }).eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Products
  app.get('/api/products', async (req, res) => {
    try {
      const { data: products, error } = await supabase.from('products').select('*');
      if (error) throw error;
      res.json(products || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/products', async (req, res) => {
    const { id, sku, name, description, image, price, category } = req.body;
    try {
      const { error } = await supabase.from('products').upsert({ id, sku, name, description, image, price, category });
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { sku, name, description, image, price, category } = req.body;
    try {
      const { error } = await supabase.from('products').update({ sku, name, description, image, price, category }).eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Zones
  app.get('/api/zones', async (req, res) => {
    try {
      const { data: zones, error } = await supabase.from('zones').select('*');
      if (error) throw error;
      res.json(zones || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/zones', async (req, res) => {
    const { id, code, name, commissioner_price } = req.body;
    try {
      const { error } = await supabase.from('zones').upsert({ id, code, name, commissioner_price: commissioner_price || 0 });
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/zones/:id', async (req, res) => {
    const { id } = req.params;
    const { code, name, commissioner_price } = req.body;
    try {
      const { error } = await supabase.from('zones').update({ code, name, commissioner_price: commissioner_price || 0 }).eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/zones/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await supabase.from('zones').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Error deleting zone' });
    }
  });

  // Settings
  app.get('/api/settings', async (req, res) => {
    try {
      const { data: settings, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      const settingsObj = (settings || []).reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      res.json(settingsObj);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/settings', async (req, res) => {
    const settings = req.body;
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({ key, value: String(value) }));
      const { error } = await supabase.from('settings').upsert(updates);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Clients
  app.get('/api/clients', async (req, res) => {
    try {
      const { data: clients, error } = await supabase.from('clients').select('*');
      if (error) throw error;
      res.json(clients || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/clients', async (req, res) => {
    const { id, name, email, registered, accept_marketing, zone, zone_id, address, phone, notes } = req.body;
    try {
      const { error } = await supabase.from('clients').upsert({ id, name, email, registered, accept_marketing: accept_marketing ? 1 : 0, zone: zone || '', zone_id: zone_id || null, address: address || '', phone: phone || '', notes: notes || '' });
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/clients/bulk-update-zone', async (req, res) => {
    const { clientIds, zone_id, zone_name } = req.body;
    try {
      const { error } = await supabase.from('clients').update({ zone_id, zone: zone_name }).in('id', clientIds);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/clients/:id/balance', async (req, res) => {
    const { id } = req.params;
    const { balance, observation } = req.body;
    try {
      const { error } = await supabase.from('clients').update({ balance }).eq('id', id);
      if (error) throw error;

      if (observation !== undefined) {
        await supabase.from('settings').upsert({ key: `balance_obs_${id}`, value: observation });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put('/api/clients/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, zone, zone_id, address, phone, notes } = req.body;
    try {
      const { error } = await supabase.from('clients').update({ name, email: email || '', zone: zone || '', zone_id: zone_id || null, address: address || '', phone: phone || '', notes: notes || '' }).eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/clients/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await supabase.from('payments').delete().eq('client_id', id);
      // Delete order_items linked to this client's orders
      const { data: orders } = await supabase.from('orders').select('id').eq('client_id', id);
      const orderIds = orders?.map(o => o.id) || [];
      if (orderIds.length > 0) {
        await supabase.from('order_items').delete().in('order_id', orderIds);
      }
      await supabase.from('orders').delete().eq('client_id', id);
      await supabase.from('clients').delete().eq('id', id);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error deleting client' });
    }
  });

  // Orders (Remitos)
  app.get('/api/orders', async (req, res) => {
    try {
      const { data: orders, error } = await supabase.from('orders').select('*').order('date', { ascending: false });
      if (error) throw error;
      res.json(orders || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/orders/:id/items', async (req, res) => {
    const { id } = req.params;
    try {
      const { data: items, error } = await supabase.from('order_items').select('*').eq('order_id', id);
      if (error) throw error;
      res.json(items || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/orders/:id/payments', async (req, res) => {
    const { id } = req.params;
    try {
      const { data: payments, error } = await supabase.from('payments').select('*').eq('order_id', id).order('date', { ascending: true });
      if (error) throw error;
      res.json(payments || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/orders', async (req, res) => {
    try {
      const { client_id, user_id, total_amount, containers_returned, status, date, items, zone_id, subtotal, iva_amount, container_quantity, container_price, container_total, commissioner_amount, has_iva, has_commissioner } = req.body;

      // Generate Serial Number
      const { data: nextSerialRow } = await supabase.from('settings').select('value').eq('key', 'next_serial_number').single();
      const serial_number = parseInt(nextSerialRow?.value || '100', 10);
      await supabase.from('settings').update({ value: (serial_number + 1).toString() }).eq('key', 'next_serial_number');

      // Get Zone Code
      const { data: zoneRow } = await supabase.from('zones').select('code').eq('id', zone_id).single();
      const zoneCode = zoneRow?.code || 'Z00';

      // Generate ID
      const id = `${zoneCode}-${serial_number}`;

      const payment_status = total_amount === 0 ? 'paid' : 'pending';

      const { error: insertError } = await supabase.from('orders').insert({
        id, serial_number: serial_number.toString(), client_id, user_id, total_amount, containers_returned, status, date, zone_id, subtotal, iva_amount, container_quantity, container_price, container_total, commissioner_amount, has_iva: has_iva ? 1 : 0, has_commissioner: has_commissioner ? 1 : 0, payment_status
      });
      if (insertError) throw insertError;

      if (items && items.length > 0) {
        const orderItems = items.map((item: any) => ({
          id: crypto.randomUUID(), order_id: id, product_id: item.product_id, quantity: item.quantity, price: item.price
        }));
        await supabase.from('order_items').insert(orderItems);
      }

      // Update client balance
      const { data: client } = await supabase.from('clients').select('balance').eq('id', client_id).single();
      if (client) {
        await supabase.from('clients').update({ balance: client.balance + total_amount }).eq('id', client_id);
      }

      res.json({ success: true, id, serial_number });
    } catch (error: any) {
      console.error('Error in POST /api/orders:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put('/api/orders/:id', async (req, res) => {
    const { id } = req.params;
    const {
      payment_status, fulfillment_status, total_amount, containers_returned,
      items, subtotal, iva_amount, container_quantity, container_price,
      container_total, commissioner_amount, has_iva, has_commissioner, delivered_by
    } = req.body;

    try {
      const { data: currentOrder } = await supabase.from('orders').select('total_amount, client_id, payment_status').eq('id', id).single();

      if (items) {
        // Full edit
        await supabase.from('orders').update({
          total_amount, subtotal, iva_amount, container_quantity,
          container_price, container_total, commissioner_amount,
          has_iva: has_iva ? 1 : 0, has_commissioner: has_commissioner ? 1 : 0, delivered_by: delivered_by || null
        }).eq('id', id);

        // Adjust client balance if total_amount changed
        if (currentOrder && currentOrder.total_amount !== total_amount) {
          const difference = total_amount - currentOrder.total_amount;
          const { data: client } = await supabase.from('clients').select('balance').eq('id', currentOrder.client_id).single();
          if (client) {
            await supabase.from('clients').update({ balance: client.balance + difference }).eq('id', currentOrder.client_id);
          }
        }

        // Update items
        await supabase.from('order_items').delete().eq('order_id', id);
        if (items.length > 0) {
          const orderItems = items.map((item: any) => ({
            id: crypto.randomUUID(), order_id: id, product_id: item.product_id, quantity: item.quantity, price: item.price
          }));
          await supabase.from('order_items').insert(orderItems);
        }

        // Re-evaluate payment status based on new total_amount
        const { data: payments } = await supabase.from('payments').select('amount').eq('order_id', id);
        const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        let newStatus = payment_status;
        if (totalPaid >= total_amount) {
          newStatus = 'paid';
        } else if (totalPaid > 0) {
          newStatus = 'partially_paid';
        } else {
          newStatus = 'pending';
        }
        await supabase.from('orders').update({ payment_status: newStatus }).eq('id', id);

      } else if (total_amount !== undefined && containers_returned !== undefined) {
        // Partial edit from Deliveries
        await supabase.from('orders').update({
          payment_status, fulfillment_status, total_amount, containers_returned, delivered_by: delivered_by || null
        }).eq('id', id);

        // Adjust client balance if total_amount changed
        if (currentOrder && currentOrder.total_amount !== total_amount) {
          const difference = total_amount - currentOrder.total_amount;
          const { data: client } = await supabase.from('clients').select('balance').eq('id', currentOrder.client_id).single();
          if (client) {
            await supabase.from('clients').update({ balance: client.balance + difference }).eq('id', currentOrder.client_id);
          }
        }

        // Re-evaluate payment status based on new total_amount
        const { data: payments } = await supabase.from('payments').select('amount').eq('order_id', id);
        const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        let newStatus = payment_status;
        if (totalPaid >= total_amount) {
          newStatus = 'paid';
        } else if (totalPaid > 0) {
          newStatus = 'partially_paid';
        } else {
          newStatus = 'pending';
        }
        await supabase.from('orders').update({ payment_status: newStatus }).eq('id', id);
      } else {
        // Status only edit
        await supabase.from('orders').update({ payment_status, fulfillment_status, delivered_by: delivered_by || null }).eq('id', id);
      }

      // Auto-generate payment if marked as paid and wasn't paid before
      if (payment_status === 'paid' && currentOrder && currentOrder.payment_status !== 'paid') {
        const { data: payments } = await supabase.from('payments').select('amount').eq('order_id', id);
        const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const orderTotal = total_amount !== undefined ? total_amount : currentOrder.total_amount;
        const remaining = orderTotal - totalPaid;

        if (remaining > 0) {
          const paymentId = crypto.randomUUID();
          await supabase.from('payments').insert({
            id: paymentId, client_id: currentOrder.client_id, order_id: id, amount: remaining, method: 'EFECTIVO', date: new Date().toISOString()
          });
          const { data: client } = await supabase.from('clients').select('balance').eq('id', currentOrder.client_id).single();
          if (client) {
            await supabase.from('clients').update({ balance: client.balance - remaining }).eq('id', currentOrder.client_id);
          }
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating order:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
      if (!order) {
        throw new Error('Order not found');
      }

      // Revert client balance
      const { data: client } = await supabase.from('clients').select('balance').eq('id', order.client_id).single();
      if (client) {
        await supabase.from('clients').update({ balance: client.balance - order.total_amount }).eq('id', order.client_id);
      }

      // Delete associated payments and revert their balance effects
      const { data: payments } = await supabase.from('payments').select('*').eq('order_id', id);
      if (payments && payments.length > 0) {
        for (const payment of payments) {
          const { data: clientForPayment } = await supabase.from('clients').select('balance').eq('id', payment.client_id).single();
          if (clientForPayment) {
            await supabase.from('clients').update({ balance: clientForPayment.balance + payment.amount }).eq('id', payment.client_id);
          }
        }
        await supabase.from('payments').delete().eq('order_id', id);
      }

      // Delete items
      await supabase.from('order_items').delete().eq('order_id', id);

      // Delete order
      await supabase.from('orders').delete().eq('id', id);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting order:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Payments
  app.post('/api/payments', async (req, res) => {
    const { id, client_id, order_id, amount, method, date } = req.body;

    try {
      const { error: insertError } = await supabase.from('payments').insert({ id, client_id, order_id, amount, method, date });
      if (insertError) throw insertError;

      // Update client balance
      const { data: client } = await supabase.from('clients').select('balance').eq('id', client_id).single();
      if (client) {
        await supabase.from('clients').update({ balance: client.balance - amount }).eq('id', client_id);
      }

      // Update order payment status if linked to an order
      if (order_id) {
        const { data: order } = await supabase.from('orders').select('total_amount').eq('id', order_id).single();
        const { data: payments } = await supabase.from('payments').select('amount').eq('order_id', order_id);
        const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

        if (order) {
          let newStatus = 'pending';
          if (totalPaid >= order.total_amount) {
            newStatus = 'paid';
          } else if (totalPaid > 0) {
            newStatus = 'partially_paid';
          }
          await supabase.from('orders').update({ payment_status: newStatus }).eq('id', order_id);
        }
      } else {
        // Auto-allocate general payment if client balance is <= 0
        const { data: updatedClient } = await supabase.from('clients').select('balance').eq('id', client_id).single();
        if (updatedClient && updatedClient.balance <= 0) {
          await supabase.from('orders').update({ payment_status: 'paid' }).eq('client_id', client_id).neq('payment_status', 'cancelled');
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error posting payment:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete Payment
  app.delete('/api/payments/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const { data: payment } = await supabase.from('payments').select('*').eq('id', id).single();
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Revert client balance
      const { data: client } = await supabase.from('clients').select('balance').eq('id', payment.client_id).single();
      if (client) {
        await supabase.from('clients').update({ balance: client.balance + payment.amount }).eq('id', payment.client_id);
      }

      // Delete payment
      await supabase.from('payments').delete().eq('id', id);

      // Update order payment status if linked to an order
      if (payment.order_id) {
        const { data: order } = await supabase.from('orders').select('total_amount').eq('id', payment.order_id).single();
        const { data: payments } = await supabase.from('payments').select('amount').eq('order_id', payment.order_id);
        const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

        if (order) {
          let newStatus = 'pending';
          if (totalPaid >= order.total_amount) {
            newStatus = 'paid';
          } else if (totalPaid > 0) {
            newStatus = 'partially_paid';
          }
          await supabase.from('orders').update({ payment_status: newStatus }).eq('id', payment.order_id);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      res.status(500).json({ error: error.message });
    }
  });



  // Current Account (Cuenta Corriente)
  app.get('/api/clients/:id/account', async (req, res) => {
    const { id } = req.params;
    try {
      const { data: orders } = await supabase.from('orders').select('*').eq('client_id', id).order('date', { ascending: false });
      const { data: payments } = await supabase.from('payments').select('*').eq('client_id', id).order('date', { ascending: false });
      const { data: client } = await supabase.from('clients').select('balance').eq('id', id).single();
      const { data: obsData } = await supabase.from('settings').select('value').eq('key', `balance_obs_${id}`).maybeSingle();

      res.json({
        balance: client ? client.balance : 0,
        initialObservation: obsData ? obsData.value : null,
        movements: [
          ...(orders || []).map((o: any) => ({ ...o, type: 'order' })),
          ...(payments || []).map((p: any) => ({ ...p, type: 'payment' }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      });
    } catch (error: any) {
      console.error('Error getting client account:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // -------------------------
  // Audit / Records Edits
  // -------------------------

  // Advances (Adelantos)
  app.get('/api/advances', async (req, res) => {
    try {
      const { data: records, error } = await supabase.from('advances').select('*').order('date', { ascending: false });
      if (error) throw error;
      res.json(records || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/advances', async (req, res) => {
    try {
      const { date, user_id, amount, description } = req.body;
      const id = crypto.randomUUID();
      const { error } = await supabase.from('advances').insert({ id, date, user_id, amount, description });
      if (error) throw error;
      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put('/api/advances/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { date, amount, description } = req.body;
      const { error } = await supabase.from('advances').update({ date, amount, description }).eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/advances/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabase.from('advances').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put('/api/advances/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, settlement_id } = req.body;
      const { error } = await supabase.from('advances').update({ status, settlement_id: settlement_id || null }).eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });


  // Vehicle Usage
  app.get('/api/vehicle-usage', async (req, res) => {
    try {
      const { data: records, error } = await supabase.from('vehicle_usage').select('*').order('date', { ascending: false });
      if (error) throw error;
      res.json(records || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/vehicle-usage', async (req, res) => {
    try {
      const { date, user_id } = req.body;
      const { error } = await supabase.from('vehicle_usage').insert({ id: crypto.randomUUID(), date, user_id });
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/vehicle-usage/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { date, user_id } = req.body;
      const { error } = await supabase.from('vehicle_usage').update({ date, user_id }).eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/vehicle-usage/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabase.from('vehicle_usage').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put('/api/vehicle-usage/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, settlement_id } = req.body;
      const { error } = await supabase.from('vehicle_usage').update({ status, settlement_id: settlement_id || null }).eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Washing prices
  app.get('/api/washing-prices', async (req, res) => {
    try {
      const { data: prices, error } = await supabase.from('washing_prices').select('*');
      if (error) throw error;

      if (!prices || prices.length === 0) {
        const defaultPrices = [
          { container_type: '100cc', price: 0 },
          { container_type: '200cc', price: 20 },
          { container_type: '500cc', price: 25 },
          { container_type: '800cc', price: 30 },
          { container_type: '910cc', price: 35 },
          { container_type: 'bidones', price: 50 }
        ];

        const insertData = defaultPrices.map(p => ({
          id: crypto.randomUUID(),
          container_type: p.container_type,
          price: p.price,
          effective_date: new Date().toISOString()
        }));

        await supabase.from('washing_prices').insert(insertData);
        return res.json(defaultPrices);
      }

      res.json(prices);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/washing-prices', async (req, res) => {
    try {
      const prices = req.body;
      for (const p of prices) {
        await supabase.from('washing_prices').update({ price: p.price }).eq('container_type', p.container_type);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/washing-prices/:type', async (req, res) => {
    try {
      const { type } = req.params;
      const { price, effective_date } = req.body;

      const { error } = await supabase.from('washing_prices')
        .update({ price, effective_date })
        .eq('container_type', type);

      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Washing records
  app.get('/api/washing-records', async (req, res) => {
    try {
      const { data: records, error } = await supabase.from('washing_records').select('*').order('date', { ascending: false });
      if (error) throw error;
      res.json(records || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/washing-records', async (req, res) => {
    try {
      const { date, user_id, qty_200cc, qty_500cc, qty_800cc, qty_910cc, qty_bidones } = req.body;
      const { error } = await supabase.from('washing_records').insert({
        id: crypto.randomUUID(), date, user_id,
        qty_200cc: qty_200cc || 0, qty_500cc: qty_500cc || 0, qty_800cc: qty_800cc || 0, qty_910cc: qty_910cc || 0, qty_bidones: qty_bidones || 0
      });
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/washing-records/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { date, qty_200cc, qty_500cc, qty_800cc, qty_910cc, qty_bidones } = req.body;
      const { error } = await supabase.from('washing_records').update({
        date, qty_200cc, qty_500cc, qty_800cc, qty_910cc, qty_bidones
      }).eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/washing-records/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabase.from('washing_records').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Company Expenses
  app.get('/api/company-expenses', async (req, res) => {
    try {
      const { user_id } = req.query;
      let query = supabase.from('company_expenses').select(`
        *,
        users ( name )
      `).order('date', { ascending: false });

      if (user_id) query = query.eq('user_id', user_id);

      const { data: records, error } = await query;
      if (error) throw error;

      const formatted = records?.map((r: any) => ({ ...r, user_name: r.users?.name, rubro: r.rubro || 'General' })) || [];
      res.json(formatted);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/company-expenses', async (req, res) => {
    try {
      const { id, date, user_id, description, amount, rubro } = req.body;
      const expenseId = id || crypto.randomUUID();
      const { error } = await supabase.from('company_expenses').insert({
        id: expenseId, date, user_id, description, amount, rubro: rubro || 'General'
      });
      if (error) throw error;
      res.json({ success: true, id: expenseId });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // PUT — Admin re-imputation of rubro
  app.put('/api/company-expenses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rubro } = req.body;
      const { error } = await supabase.from('company_expenses').update({ rubro }).eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/company-expenses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabase.from('company_expenses').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Expense Categories (Rubros)
  app.get('/api/expense-categories', async (req, res) => {
    try {
      const { data, error } = await supabase.from('expense_categories').select('*').order('name');
      if (error) throw error;
      res.json(data || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/expense-categories', async (req, res) => {
    try {
      const { name, admin_only } = req.body;
      if (!name) return res.status(400).json({ error: 'Name required' });
      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
      const { error } = await supabase.from('expense_categories').insert({ id, name, admin_only: admin_only || false });
      if (error) throw error;
      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/expense-categories/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (id === 'general') return res.status(400).json({ error: 'Cannot delete General category' });
      const { error } = await supabase.from('expense_categories').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Tasks (Tareas de Charlie)
  app.get('/api/tasks', async (req, res) => {
    try {
      const { data: records, error } = await supabase.from('tasks').select('*').order('date', { ascending: false });
      if (error) throw error;
      res.json(records || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/tasks', async (req, res) => {
    try {
      const { date, user_id, description } = req.body;
      const { error } = await supabase.from('tasks').insert({
        id: crypto.randomUUID(), date, user_id, description, amount: 0
      });
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/tasks/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, settlement_id } = req.body;
      const { error } = await supabase.from('tasks').update({ status, settlement_id: settlement_id || null }).eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/tasks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { description, amount, status, settlement_id } = req.body;

      const updateData: any = {};
      if (description !== undefined) updateData.description = description;
      if (amount !== undefined) updateData.amount = amount;
      if (status !== undefined) {
        updateData.status = status;
        updateData.settlement_id = settlement_id || null;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase.from('tasks').update(updateData).eq('id', id);
        if (error) throw error;
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.put('/api/washing-records/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, settlement_id } = req.body;
      const { error } = await supabase.from('washing_records').update({ status, settlement_id: settlement_id || null }).eq('id', id);
      if (error) throw error;
      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Settlements
  app.get('/api/settlements', async (req, res) => {
    try {
      const { data: records, error } = await supabase.from('settlements').select('*').order('date', { ascending: false });
      if (error) throw error;
      res.json(records || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/settlements', async (req, res) => {
    try {
      const { id, date, user_id, type, amount, details } = req.body;
      const settlementId = id || crypto.randomUUID();
      const { error } = await supabase.from('settlements').insert({
        id: settlementId, date, user_id, type, amount, details
      });
      if (error) throw error;
      res.json({ success: true, id: settlementId });
    } catch (e: any) {
      console.error('ERROR CREATING SETTLEMENT:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/settlements/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const { data: settlement } = await supabase.from('settlements').select('*').eq('id', id).single();
      if (!settlement) throw new Error('Settlement not found');

      // Revert linked records back to pending independently of type as they're linked directly via settlement_id field
      await supabase.from('vehicle_usage').update({ status: 'pending', settlement_id: null }).eq('settlement_id', id);
      await supabase.from('washing_records').update({ status: 'pending', settlement_id: null }).eq('settlement_id', id);
      await supabase.from('advances').update({ status: 'pending', settlement_id: null }).eq('settlement_id', id);
      await supabase.from('tasks').update({ status: 'pending', settlement_id: null }).eq('settlement_id', id);

      // Finally delete the settlement
      const { error } = await supabase.from('settlements').delete().eq('id', id);
      if (error) throw error;

      res.json({ success: true });
    } catch (e: any) {
      console.error('Error deleting settlement:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Dashboard Metrics
  app.get('/api/dashboard', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      const day = String(now.getDate()).padStart(2, '0');

      let startMonthString = `${year}-${month}-01T00:00:00.000Z`;
      let endMonthString = `${year}-${month}-${lastDay}T23:59:59.999Z`;

      if (startDate && endDate) {
        startMonthString = `${startDate}T00:00:00.000Z`;
        endMonthString = `${endDate}T23:59:59.999Z`;
      }

      const startOfDayUTC = `${year}-${month}-${day}T00:00:00.000Z`;
      const endOfDayUTC = `${year}-${month}-${day}T23:59:59.999Z`;

      // Fetch data
      const { data: monthOrders } = await supabase.from('orders').select('*').gte('date', startMonthString).lte('date', endMonthString);
      const { data: monthPayments } = await supabase.from('payments').select('amount').gte('date', startMonthString).lte('date', endMonthString);
      const { data: clients } = await supabase.from('clients').select('balance');
      const { data: todayOrders } = await supabase.from('orders').select('fulfillment_status').gte('date', startOfDayUTC).lte('date', endOfDayUTC).neq('fulfillment_status', 'cancelled').neq('fulfillment_status', 'delivered');
      const { data: washingRecords } = await supabase.from('washing_records').select('*').gte('date', startMonthString).lte('date', endMonthString);

      // 1. Total Sales (Mes actual)
      const validMonthOrders = (monthOrders || []).filter((o: any) => o.status !== 'cancelled');
      const totalSales = validMonthOrders.reduce((sum: number, o: any) => sum + o.total_amount, 0);

      // 2. Total Collections (Cobranzas del mes)
      const totalCollections = (monthPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0);

      // 2b. Pending Collections (Deuda Global Pendiente)
      const pendingCollections = (clients || []).reduce((sum: number, c: any) => sum + (c.balance > 0 ? c.balance : 0), 0);

      // 3. Active Clients
      const activeClients = new Set(validMonthOrders.map((o: any) => o.client_id)).size;

      // 4. Pending Deliveries
      const pendingDeliveries = todayOrders?.length || 0;

      // 5. Container Stats
      const totalDeliveredContainers = validMonthOrders.reduce((sum: number, o: any) => sum + o.container_quantity, 0);
      const totalReturnedContainers = validMonthOrders.reduce((sum: number, o: any) => sum + (o.containers_returned || 0), 0);

      // 6. Washed Containers Stats
      const washedContainersStats = {
        qty200cc: 0, qty500cc: 0, qty800cc: 0, qty910cc: 0, qtyBidones: 0, total: 0
      };
      (washingRecords || []).forEach((r: any) => {
        washedContainersStats.qty200cc += r.qty_200cc || 0;
        washedContainersStats.qty500cc += r.qty_500cc || 0;
        washedContainersStats.qty800cc += r.qty_800cc || 0;
        washedContainersStats.qty910cc += r.qty_910cc || 0;
        washedContainersStats.qtyBidones += r.qty_bidones || 0;
      });
      washedContainersStats.total = washedContainersStats.qty200cc + washedContainersStats.qty500cc + washedContainersStats.qty800cc + washedContainersStats.qty910cc + washedContainersStats.qtyBidones;

      // 7. Chart Data (Ventas vs Cobranzas últimos 7 días)
      const chartData = [];
      const { data: weekOrders } = await supabase.from('orders').select('date, total_amount, status').gte('date', new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString());
      const { data: weekPayments } = await supabase.from('payments').select('date, amount').gte('date', new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString());

      for (let i = 6; i >= 0; i--) {
        const dStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const y = dStart.getFullYear();
        const m = String(dStart.getMonth() + 1).padStart(2, '0');
        const d = String(dStart.getDate()).padStart(2, '0');

        const startUTC = `${y}-${m}-${d}T00:00:00.000Z`;
        const endUTC = `${y}-${m}-${d}T23:59:59.999Z`;

        const daySales = (weekOrders || []).filter((o: any) => o.date >= startUTC && o.date <= endUTC && o.status !== 'cancelled').reduce((sum: number, o: any) => sum + o.total_amount, 0);
        const dayCollections = (weekPayments || []).filter((p: any) => p.date >= startUTC && p.date <= endUTC).reduce((sum: number, p: any) => sum + p.amount, 0);

        chartData.push({
          name: dStart.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit' }),
          ventas: daySales,
          cobranzas: dayCollections
        });
      }

      res.json({
        totalSales,
        totalCollections,
        pendingCollections,
        activeClients,
        pendingDeliveries,
        totalDeliveredContainers,
        totalReturnedContainers,
        washedContainersStats,
        chartData
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: 'Error fetching dashboard data' });
    }
  });

  // Database Backup Endpoint
  app.get('/api/backup', async (req, res) => {
    res.status(501).json({ error: 'Local database backup is no longer supported after the migration to Supabase. Please use Supabase dashboard features.' });
  });

  // Top Products Dashboard
  app.get('/api/dashboard/products', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      let ordersQuery = supabase.from('orders').select('id, date');
      if (startDate && endDate) {
        ordersQuery = ordersQuery.gte('date', `${startDate}T00:00:00.000Z`).lte('date', `${endDate}T23:59:59.999Z`);
      }

      const { data: orders } = await ordersQuery;
      if (!orders || orders.length === 0) return res.json([]);

      const orderIds = orders.map((o: any) => o.id);

      const { data: orderItems } = await supabase.from('order_items').select('product_id, quantity, products(name)').in('order_id', orderIds);

      const productTotals: { [key: string]: { name: string, total_quantity: number } } = {};

      (orderItems || []).forEach((item: any) => {
        if (!productTotals[item.product_id]) {
          productTotals[item.product_id] = { name: item.products?.name || 'Unknown Product', total_quantity: 0 };
        }
        productTotals[item.product_id].total_quantity += item.quantity;
      });

      const topProducts = Object.values(productTotals)
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 10);

      res.json(topProducts);

    } catch (error) {
      console.error("Top products error:", error);
      res.status(500).json({ error: 'Error fetching top products data' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
