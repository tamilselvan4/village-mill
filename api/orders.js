const crypto = require('crypto');
const {
  ORDER_STATUSES,
  errorResponse,
  json,
  priceItems,
  razorpayClient,
  readBody,
  requireAdmin,
  supabaseAdmin,
  verifyUser,
} = require('./_lib');

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const user = await verifyUser(req);
      const db = supabaseAdmin();
      const { user: adminUser } = await requireAdmin(req).catch(() => ({ user: null }));
      let query = db
        .from('orders')
        .select('id,user_id,customer,items,subtotal_inr,delivery_fee_inr,total_inr,status,payment_status,razorpay_order_id,razorpay_payment_id,created_at,updated_at')
        .order('created_at', { ascending: false });

      if (!adminUser) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      json(res, 200, { orders: data || [] });
      return;
    }

    if (req.method === 'POST') {
      const user = await verifyUser(req);
      const db = supabaseAdmin();
      const body = await readBody(req);
      const priced = await priceItems(db, body.items);
      const customer = {
        email: user.email,
        full_name: String(body.customer?.full_name || '').trim(),
        phone: String(body.customer?.phone || '').trim(),
        address: String(body.customer?.address || '').trim(),
        pincode: String(body.customer?.pincode || '').trim(),
      };

      if (!customer.full_name || !customer.phone || !customer.address || !customer.pincode) {
        json(res, 400, { error: 'Customer profile is incomplete' });
        return;
      }

      await db.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: customer.full_name,
        phone: customer.phone,
        address: customer.address,
        pincode: customer.pincode,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      const orderId = crypto.randomUUID();
      const razorpayOrder = await razorpayClient().orders.create({
        amount: priced.total * 100,
        currency: 'INR',
        receipt: orderId.slice(0, 36),
        notes: {
          order_id: orderId,
          customer: customer.full_name.slice(0, 40),
        },
      });

      const order = {
        id: orderId,
        user_id: user.id,
        customer,
        items: priced.items,
        subtotal_inr: priced.subtotal,
        delivery_fee_inr: priced.deliveryFee,
        total_inr: priced.total,
        status: 'placed',
        payment_status: 'created',
        razorpay_order_id: razorpayOrder.id,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await db
        .from('orders')
        .insert(order)
        .select()
        .single();

      if (error) throw error;

      await db.from('order_tracks').insert({
        order_id: orderId,
        status: 'placed',
        note: 'Order created',
      });

      json(res, 201, {
        order: data,
        razorpayOrder,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      });
      return;
    }

    if (req.method === 'PATCH') {
      const { db } = await requireAdmin(req);
      const body = await readBody(req);
      const status = String(body.status || '').trim();

      if (!ORDER_STATUSES.includes(status)) {
        json(res, 400, { error: 'Invalid order status' });
        return;
      }

      const updates = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'paid') {
        updates.payment_status = 'paid';
      }

      const { data, error } = await db
        .from('orders')
        .update(updates)
        .eq('id', body.id)
        .select()
        .single();

      if (error) throw error;

      await db.from('order_tracks').insert({
        order_id: body.id,
        status,
        note: `Admin marked ${status}`,
      });

      json(res, 200, { order: data });
      return;
    }

    json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    errorResponse(res, error);
  }
};
