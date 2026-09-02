const {
  errorResponse,
  json,
  readBody,
  supabaseAdmin,
  verifyRazorpaySignature,
  verifyUser,
} = require('../_lib');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }

    const user = await verifyUser(req);
    const db = supabaseAdmin();
    const body = await readBody(req);

    const { data: order, error } = await db
      .from('orders')
      .select('id,user_id,razorpay_order_id')
      .eq('razorpay_order_id', body.razorpay_order_id)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;

    const isValid = verifyRazorpaySignature(
      order.razorpay_order_id,
      body.razorpay_payment_id,
      body.razorpay_signature
    );

    if (!isValid) {
      json(res, 400, { error: 'Payment signature verification failed' });
      return;
    }

    const { data, error: updateError } = await db
      .from('orders')
      .update({
        status: 'paid',
        payment_status: 'paid',
        razorpay_payment_id: body.razorpay_payment_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select()
      .single();

    if (updateError) throw updateError;

    await db.from('order_tracks').insert({
      order_id: order.id,
      status: 'paid',
      note: 'Razorpay payment verified',
    });

    json(res, 200, { order: data });
  } catch (error) {
    errorResponse(res, error);
  }
};
