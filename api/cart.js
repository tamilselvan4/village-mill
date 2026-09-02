const {
  errorResponse,
  json,
  readBody,
  supabaseAdmin,
  verifyUser,
} = require('./_lib');

function cleanCartItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map(item => ({
      product_id: Number(item.product_id),
      quantity: Math.min(20, Math.max(1, Number(item.quantity || 1))),
    }))
    .filter(item => Number.isInteger(item.product_id) && item.product_id > 0);
}

module.exports = async function handler(req, res) {
  try {
    const user = await verifyUser(req);
    const db = supabaseAdmin();

    if (req.method === 'GET') {
      const { data, error } = await db
        .from('carts')
        .select('user_id,items,updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      json(res, 200, { cart: data || { user_id: user.id, items: [] } });
      return;
    }

    if (req.method === 'PUT') {
      const body = await readBody(req);
      const cart = {
        user_id: user.id,
        items: cleanCartItems(body.items),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await db
        .from('carts')
        .upsert(cart, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      json(res, 200, { cart: data });
      return;
    }

    json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    errorResponse(res, error);
  }
};
