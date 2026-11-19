'use strict';
const { createClient } = require('@supabase/supabase-js');

// A service-role mutation must derive its owner from a verified session.
async function requireAccount(req, res, keys = ['userId', 'supabaseUserId', 'user_id']) {
  const header = (req.headers || {}).authorization || '';
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim();
  if (!token) { res.status(401).json({ error: 'authentication_required' }); return null; }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { res.status(503).json({ error: 'authentication_unavailable' }); return null; }
  try {
    const auth = createClient(url, process.env.SUPABASE_ANON_KEY || key, { auth: { persistSession: false } });
    const { data, error } = await auth.auth.getUser(token);
    const id = data?.user?.id;
    if (error || !id) { res.status(401).json({ error: 'invalid_session' }); return null; }
    for (const k of keys) {
      const supplied = req.body?.[k];
      if (supplied != null && supplied !== '' && supplied !== id) {
        res.status(403).json({ error: 'user_mismatch' }); return null;
      }
    }
    return { id, user: data.user, db: createClient(url, key, { auth: { persistSession: false } }) };
  } catch (_) { res.status(503).json({ error: 'authentication_unavailable' }); return null; }
}

// Paid proxies share authentication, a server-read entitlement and a durable account quota.
// Browser role labels and balance claims never authorize a provider dispatch.
async function requireModelAccess(req, res) {
  const account = await requireAccount(req, res);
  if (!account) return null;
  try {
    const storyId = req.body?.storyId;
    if (storyId != null && (typeof storyId !== 'string' || storyId.length > 200)) {
      res.status(400).json({ error: 'invalid_story_id' }); return null;
    }
    const { data, error } = await account.db.rpc('admit_model_request', {
      p_user_id: account.id, p_story_id: storyId || null
    });
    if (error || !data?.outcome) { res.status(503).json({ error: 'generation_admission_unavailable' }); return null; }
    if (data.outcome === 'forbidden') { res.status(403).json({ error: 'generation_not_entitled' }); return null; }
    if (data.outcome === 'capped') { res.status(429).json({ error: 'generation_rate_limited' }); return null; }
    if (data.outcome !== 'admitted') { res.status(503).json({ error: 'generation_admission_unavailable' }); return null; }
    req.body.user_id = account.id;
    return account;
  } catch (_) { res.status(503).json({ error: 'generation_admission_unavailable' }); return null; }
}
module.exports = { requireAccount, requireModelAccess };
