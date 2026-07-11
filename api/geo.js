// Client-facing geo decision. Returns the country + gate decision derived from
// Vercel's edge geo header (x-vercel-ip-country). UX only — the REAL enforcement
// is server-side on the payment path (create-checkout-session + stripe-webhook).
// Never exposes the block list or the raw IP.
import geoPolicy from '../config/geo-policy.js';
const { evaluateGeo, readRequestCountry, isDevEnv, geoLog } = geoPolicy;

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const geo = evaluateGeo(readRequestCountry(req), { isDev: isDevEnv() });
  geoLog('geo_gate_decision', geo, { path: 'geo' });

  return res.status(200).json({
    country: geo.country,
    decision: geo.decision,
    blocked: geo.blocked,
    mode: geo.mode,
    source: 'x-vercel-ip-country',
  });
}
