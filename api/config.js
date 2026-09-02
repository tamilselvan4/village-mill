const { env, json } = require('./_lib');

module.exports = async function handler(_req, res) {
  json(res, 200, {
    supabaseUrl: env('SUPABASE_URL'),
    supabaseAnonKey: env('SUPABASE_ANON_KEY'),
    razorpayKeyId: env('RAZORPAY_KEY_ID'),
  });
};
