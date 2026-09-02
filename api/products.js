const {
  errorResponse,
  json,
  readBody,
  requireAdmin,
  supabaseAdmin,
} = require('./_lib');

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin()
        .from('products')
        .select('id,name,slug,description,size,price_inr,image_label,stock,active')
        .eq('active', true)
        .order('id', { ascending: true });

      if (error) throw error;
      json(res, 200, { products: data || [] });
      return;
    }

    if (req.method === 'POST') {
      const { db } = await requireAdmin(req);
      const body = await readBody(req);
      const product = {
        name: String(body.name || '').trim(),
        slug: String(body.slug || '').trim().toLowerCase(),
        description: String(body.description || '').trim(),
        size: String(body.size || '1 L').trim(),
        price_inr: Number(body.price_inr),
        image_label: String(body.image_label || body.name || '').trim(),
        stock: Number(body.stock || 0),
        active: body.active !== false,
      };

      if (!product.name || !product.slug || !Number.isInteger(product.price_inr) || product.price_inr < 1) {
        json(res, 400, { error: 'Product name, slug, and valid price are required' });
        return;
      }

      const { data, error } = await db
        .from('products')
        .insert(product)
        .select()
        .single();

      if (error) throw error;
      json(res, 201, { product: data });
      return;
    }

    json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    errorResponse(res, error);
  }
};
