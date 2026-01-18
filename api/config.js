export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Environment detection (defaults to production for safety)
  const env = process.env.NODE_ENV || 'production';

  // Admin check: compare provided user_id against ADMIN_USER_ID
  // Client passes user_id after authentication to determine admin status
  // ADMIN_USER_ID is never exposed to client
  const userId = req.query.user_id;
  const adminUserId = process.env.ADMIN_USER_ID;
  const isAdmin = !!(userId && adminUserId && userId === adminUserId);

  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    // Empty proxyUrl means use local /api/proxy (requires XAI_API_KEY)
    proxyUrl: process.env.PROXY_URL || "",
    imageProxyUrl: process.env.IMAGE_PROXY_URL || "",
    has_SUPABASE_URL: !!process.env.SUPABASE_URL,
    has_SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    has_PROXY_URL: !!process.env.PROXY_URL,
    has_IMAGE_PROXY_URL: !!process.env.IMAGE_PROXY_URL,
    has_XAI_API_KEY: !!process.env.XAI_API_KEY,
    // Environment and admin status for client
    env: env,
    isAdmin: isAdmin,
  });
}
