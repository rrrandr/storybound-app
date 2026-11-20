import fallbackApi from './_model-fallback.js';
// ── THE EDITION DECISION IS MADE ONCE, SERVER-SIDE, AND PUBLISHED HERE (Roman 2026-11-08) ────
// A shared module (api/_edition.js), not a reimplementation: the same function decides what the
// server will PRODUCE in api/cplus-editor.js. Reimplementing it in either place is how the two
// would drift and a restricted client would end up displaying enhanced prose.
import { editionForRequest, platformForRequest } from './_edition.js';

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
    modelBackups: fallbackApi.configuredPairs(process.env),
    // ── WHICH EDITION THIS CLIENT MAY RECEIVE ────────────────────────────────────────────────
    // 'base' or 'enhanced', decided from the deployment variables AND this request's own Origin.
    // The client stores it and uses it to pick which stored text to display; it never decides
    // for itself, and a client that cannot reach this route falls back to 'base'.
    //
    // `editionWhy` is included because a reader of a support log should be able to tell
    // "this build does not produce enhanced prose" from "this origin is not the website".
    edition: editionForRequest(process.env, origin).edition,
    editionWhy: editionForRequest(process.env, origin).why,
    // SEPARATE AXIS, SEPARATE FIELD. `platform` picks WHICH MODEL starts an operation (the
    // website OAS route is an intentional Grok exception); `edition` picks WHICH TEXT may be
    // delivered. A client reads both and never infers one from the other.
    platform: platformForRequest(process.env, origin).platform,
    platformWhy: platformForRequest(process.env, origin).why,
  });
}
