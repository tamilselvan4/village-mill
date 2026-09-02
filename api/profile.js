const {
  errorResponse,
  json,
  readBody,
  supabaseAdmin,
  verifyUser,
} = require('./_lib');

module.exports = async function handler(req, res) {
  try {
    const user = await verifyUser(req);
    const db = supabaseAdmin();

    if (req.method === 'GET') {
      const { data, error } = await db
        .from('profiles')
        .select('id,email,full_name,phone,address,pincode,is_admin,updated_at')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      json(res, 200, { profile: data });
      return;
    }

    if (req.method === 'PUT') {
      const body = await readBody(req);
      const profile = {
        id: user.id,
        email: user.email,
        full_name: String(body.full_name || '').trim(),
        phone: String(body.phone || '').trim(),
        address: String(body.address || '').trim(),
        pincode: String(body.pincode || '').trim(),
        updated_at: new Date().toISOString(),
      };

      if (!profile.full_name || !profile.phone || !profile.address || !profile.pincode) {
        json(res, 400, { error: 'Full name, phone, address, and pincode are required' });
        return;
      }

      const { data, error } = await db
        .from('profiles')
        .upsert(profile, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      json(res, 200, { profile: data });
      return;
    }

    json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    errorResponse(res, error);
  }
};
