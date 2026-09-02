const crypto = require('crypto');
const Razorpay = require('razorpay');
const { createClient } = require('@supabase/supabase-js');

const ORDER_STATUSES = ['placed', 'paid', 'shipped', 'delivered'];

function env(name) {
  return process.env[name] || '';
}

function requiredEnv(name) {
  const value = env(name);
  if (!value) {
    const error = new Error(`${name} is not configured`);
    error.statusCode = 500;
    throw error;
  }
  return value;
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function errorResponse(res, error) {
  json(res, error.statusCode || 500, { error: error.message || 'Server error' });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Request body is too large'));
      }
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function supabaseAdmin() {
  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}

function supabaseAuth() {
  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false },
  });
}

async function verifyUser(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    const error = new Error('Login required');
    error.statusCode = 401;
    throw error;
  }

  const { data, error } = await supabaseAuth().auth.getUser(token);
  if (error || !data.user) {
    const authError = new Error('Invalid login session');
    authError.statusCode = 401;
    throw authError;
  }

  return data.user;
}

async function isAdmin(user, db = supabaseAdmin()) {
  const adminEmails = env('ADMIN_EMAILS')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.includes(String(user.email || '').toLowerCase())) {
    return true;
  }

  const { data } = await db
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  return Boolean(data?.is_admin);
}

async function requireAdmin(req) {
  const user = await verifyUser(req);
  const db = supabaseAdmin();

  if (!(await isAdmin(user, db))) {
    const error = new Error('Admin access required');
    error.statusCode = 403;
    throw error;
  }

  return { user, db };
}

function razorpayClient() {
  return new Razorpay({
    key_id: requiredEnv('RAZORPAY_KEY_ID'),
    key_secret: requiredEnv('RAZORPAY_KEY_SECRET'),
  });
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map(item => ({
      product_id: Number(item.product_id),
      quantity: Math.min(20, Math.max(1, Number(item.quantity || 1))),
    }))
    .filter(item => Number.isInteger(item.product_id) && item.product_id > 0);
}

async function priceItems(db, requestedItems) {
  const items = normalizeItems(requestedItems);
  if (!items.length) {
    const error = new Error('Cart is empty');
    error.statusCode = 400;
    throw error;
  }

  const productIds = [...new Set(items.map(item => item.product_id))];
  const { data: products, error } = await db
    .from('products')
    .select('id,name,slug,size,price_inr,stock,active')
    .in('id', productIds)
    .eq('active', true);

  if (error) throw error;

  const pricedItems = items.map(item => {
    const product = products.find(row => Number(row.id) === Number(item.product_id));
    if (!product) {
      const missingError = new Error('One cart item is no longer available');
      missingError.statusCode = 400;
      throw missingError;
    }
    if (Number(product.stock) < item.quantity) {
      const stockError = new Error(`${product.name} has only ${product.stock} in stock`);
      stockError.statusCode = 400;
      throw stockError;
    }

    return {
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      size: product.size,
      quantity: item.quantity,
      unit_price_inr: product.price_inr,
      line_total_inr: product.price_inr * item.quantity,
    };
  });

  const subtotal = pricedItems.reduce((sum, item) => sum + item.line_total_inr, 0);

  return {
    items: pricedItems,
    subtotal,
    deliveryFee: 0,
    total: subtotal,
  };
}

function verifyRazorpaySignature(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac('sha256', requiredEnv('RAZORPAY_KEY_SECRET'))
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(String(signature || ''));

  return expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

module.exports = {
  ORDER_STATUSES,
  env,
  json,
  errorResponse,
  readBody,
  supabaseAdmin,
  verifyUser,
  requireAdmin,
  razorpayClient,
  priceItems,
  verifyRazorpaySignature,
};
