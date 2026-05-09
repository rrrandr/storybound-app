// Image proxy — fetches whitelisted upstream image URLs server-side and
// streams them back same-origin so the client doesn't hit CORS.
//
// Used when BFL delivery URLs (delivery.us2.bfl.ai/...) need to be loaded
// from the browser. The bfl-kontext endpoint normally inlines the image
// as a base64 data URL on success; this endpoint is the fallback when
// inlining fails (very large image, fetch timeout, etc.) so the client
// always has a CORS-clean way to display the result.

export const config = {
  maxDuration: 30
};

const ALLOWED_HOSTS = /^([\w-]+\.)*bfl\.(ai|ml)$/;

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url query param required' });
  }

  let upstream;
  try {
    upstream = new URL(url);
  } catch (_) {
    return res.status(400).json({ error: 'Malformed url' });
  }

  // Whitelist: only proxy known image hosts. Prevents this endpoint from
  // being used as an open SSRF vector.
  if (!ALLOWED_HOSTS.test(upstream.hostname)) {
    return res.status(403).json({ error: 'Host not allowed', host: upstream.hostname });
  }

  try {
    const imgRes = await fetch(upstream.toString());
    if (!imgRes.ok) {
      return res.status(imgRes.status).json({ error: 'Upstream fetch failed', status: imgRes.status });
    }

    const ct = imgRes.headers.get('content-type') || 'image/png';
    const buf = Buffer.from(await imgRes.arrayBuffer());

    res.setHeader('Content-Type', ct);
    res.setHeader('Content-Length', buf.length);
    // Cache for 1 hour — BFL delivery URLs are short-lived signed URLs but
    // within their TTL the same content is stable.
    res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
    return res.status(200).send(buf);
  } catch (err) {
    console.error('[img-proxy] fetch error:', err.message);
    return res.status(502).json({ error: 'Failed to proxy image', detail: err.message });
  }
}
