/**
 * TEASE GUARD — DEPRECATED (no-op shim)
 *
 * This endpoint previously enforced a 20-scene cap on the free tier. The cap
 * has been removed: the only gate now is balance-zero (`fortunes <= 0`),
 * enforced by `consume-fortune` and the client-side paywall trigger.
 *
 * The endpoint is kept as a no-op so existing client call sites at
 * app.js:146306 and 153568 don't 404. Once the next client deploy removes
 * those calls, this file can be deleted.
 */

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  return res.status(200).json({
    allowed: true,
    bypassed: true,
    deprecated: true,
  });
}
