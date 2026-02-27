export default function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

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
  });
}
