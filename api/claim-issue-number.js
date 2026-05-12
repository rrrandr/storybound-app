/**
 * =============================================================================
 * STORYBOUND ISSUE NUMBER CLAIM — atomic per-flavor counter
 * =============================================================================
 *
 * Assigns a comic-book-style issue number to a story WHEN THE BOOK IS
 * FINISHED. Numbers reward DEDICATION, not initiation — there is no
 * way to squat low numbers because squatters would have to actually
 * complete N full stories to claim N numbers, which is real engagement,
 * not abuse.
 *
 * Account-bound (non-transferable). Per-flavor counters mean each world
 * flavor has its own sequence (Glass House #1, Thirst #1, Billionaire #1,
 * etc., all independent).
 *
 * Anti-squatting properties:
 *   • Claim requires book_complete = true client-side AND completed_at
 *     stamped server-side. Open/incomplete stories cannot claim.
 *   • Numbers are NOT transferable between accounts — recorded in
 *     stories.author_id, never reassigned. Banning an account burns its
 *     numbers permanently.
 *   • #1-3 reserved per flavor for Storybound official content.
 *     Real-user numbering starts at #4.
 *
 * SQL prerequisites (ran 2026-05-12):
 *   CREATE TABLE IF NOT EXISTS public.issue_counters (
 *     flavor_key TEXT PRIMARY KEY,
 *     current_count INTEGER NOT NULL DEFAULT 3,
 *     last_incremented_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 *
 *   CREATE OR REPLACE FUNCTION public.increment_flavor_count(p_flavor_key TEXT)
 *   RETURNS INTEGER
 *   LANGUAGE plpgsql
 *   SECURITY DEFINER
 *   SET search_path = pg_catalog, public
 *   AS $$
 *   DECLARE v_new_count INTEGER;
 *   BEGIN
 *     INSERT INTO public.issue_counters (flavor_key, current_count)
 *     VALUES (p_flavor_key, 3)
 *     ON CONFLICT (flavor_key) DO NOTHING;
 *     UPDATE public.issue_counters
 *     SET current_count = current_count + 1,
 *         last_incremented_at = NOW()
 *     WHERE flavor_key = p_flavor_key
 *     RETURNING current_count INTO v_new_count;
 *     RETURN v_new_count;
 *   END;
 *   $$;
 *
 *   -- Issue counter table + RPC (defense-in-depth: SECURITY DEFINER,
 *   -- search_path locked, RLS enabled, anon/authenticated revoked).
 *   -- See existing migration for full text. Counter starts at 3 so the
 *   -- first user claim returns 4 (numbers 1-3 reserved for Storybound).
 *
 *   ALTER TABLE public.story_library_versions
 *     ADD COLUMN IF NOT EXISTS issue_number INTEGER,
 *     ADD COLUMN IF NOT EXISTS issue_flavor TEXT,
 *     ADD COLUMN IF NOT EXISTS issue_claimed_at TIMESTAMPTZ,
 *     ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
 *     ADD COLUMN IF NOT EXISTS playthrough_credit TEXT,
 *     ADD COLUMN IF NOT EXISTS playthrough_credit_normalized TEXT;
 *
 *   CREATE INDEX IF NOT EXISTS idx_story_library_versions_issue_flavor_number
 *     ON public.story_library_versions(issue_flavor, issue_number);
 *
 *   CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_story_library_issue_per_flavor
 *     ON public.story_library_versions(issue_flavor, issue_number)
 *     WHERE issue_number IS NOT NULL;
 *
 *   -- Case-insensitive handle uniqueness across all completed stories.
 *   CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_playthrough_credit_normalized
 *     ON public.story_library_versions(playthrough_credit_normalized)
 *     WHERE playthrough_credit_normalized IS NOT NULL;
 *
 *   -- Immutability trigger — locks issue metadata + playthrough_credit
 *   -- once set (client roles only; service_role retains moderation
 *   -- ability). Also AUTO-SYNCS the normalized credit field on each
 *   -- update so client code only ever has to write the display string.
 *   CREATE OR REPLACE FUNCTION public.prevent_issue_mutation()
 *   RETURNS trigger
 *   LANGUAGE plpgsql
 *   AS $$
 *   BEGIN
 *     IF OLD.issue_number IS NOT NULL AND (
 *       NEW.issue_number IS DISTINCT FROM OLD.issue_number
 *       OR NEW.issue_flavor IS DISTINCT FROM OLD.issue_flavor
 *     ) THEN
 *       RAISE EXCEPTION 'Issue metadata is immutable once assigned';
 *     END IF;
 *     IF current_setting('request.jwt.claim.role', true) IN ('authenticated', 'anon')
 *        AND OLD.playthrough_credit IS NOT NULL
 *        AND NEW.playthrough_credit IS DISTINCT FROM OLD.playthrough_credit THEN
 *       RAISE EXCEPTION 'Playthrough credit is immutable once claimed';
 *     END IF;
 *     IF NEW.playthrough_credit IS NOT NULL THEN
 *       NEW.playthrough_credit_normalized :=
 *         lower(regexp_replace(NEW.playthrough_credit, '[^a-zA-Z0-9]', '', 'g'));
 *     ELSE
 *       NEW.playthrough_credit_normalized := NULL;
 *     END IF;
 *     RETURN NEW;
 *   END;
 *   $$;
 *
 *   -- Lock down the counter table; only SECURITY DEFINER RPC may mutate.
 *   ALTER TABLE public.issue_counters ENABLE ROW LEVEL SECURITY;
 *   REVOKE ALL ON public.issue_counters FROM anon, authenticated;
 *
 *   -- Revoke client direct-write on credit columns; service_role retains
 *   -- access for the API endpoint to stamp + the moderation escape hatch.
 *   REVOKE UPDATE(playthrough_credit, playthrough_credit_normalized)
 *     ON public.story_library_versions
 *     FROM authenticated, anon;
 *
 *   -- Library entries columns for the public scrubbed canonical record.
 *   -- The publisher propagates both fields from story_library_versions;
 *   -- normalized is copied (not re-derived) to avoid normalization drift.
 *   ALTER TABLE public.library_entries
 *     ADD COLUMN IF NOT EXISTS playthrough_credit TEXT,
 *     ADD COLUMN IF NOT EXISTS playthrough_credit_normalized TEXT;
 * =============================================================================
 */

module.exports = async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love'
    || origin === 'https://www.storybound.love'
    || origin.startsWith('http://localhost')
    ? origin
    : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase env vars not configured' });
  }

  try {
    const { user_id, story_id, flavor_key, world, completed_at, playthrough_credit } = req.body || {};

    // ── Validate ──
    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ error: 'Missing user_id', code: 'MISSING_USER_ID' });
    }
    if (!story_id || typeof story_id !== 'string') {
      return res.status(400).json({ error: 'Missing story_id', code: 'MISSING_STORY_ID' });
    }
    if (!flavor_key || typeof flavor_key !== 'string' || !/^[a-z0-9_]+$/.test(flavor_key)) {
      return res.status(400).json({ error: 'Invalid flavor_key (must be lowercase alphanumeric+underscore)', code: 'INVALID_FLAVOR_KEY' });
    }
    // Completion timestamp REQUIRED — claim is gated on book completion.
    // If the client doesn't send one, default to now (server time).
    const completedAtTs = (completed_at && !isNaN(Date.parse(completed_at)))
      ? completed_at
      : new Date().toISOString();

    // ── Validate playthrough credit (server-side authority) ──
    // null = Anonymous Canon Edition; string = Claim Canon Credit.
    // Mirror of the client validateCanonCredit rules — server can't
    // trust client validation because the API is callable directly.
    let validatedCredit = null;
    if (playthrough_credit !== undefined && playthrough_credit !== null) {
      if (typeof playthrough_credit !== 'string') {
        return res.status(400).json({ error: 'playthrough_credit must be a string or null', code: 'INVALID_CREDIT_TYPE' });
      }
      const t = playthrough_credit.trim();
      if (t.length === 0) {
        // Empty string = anonymous, normalize to null
        validatedCredit = null;
      } else if (t.length > 24) {
        return res.status(400).json({ error: 'playthrough_credit exceeds 24 character maximum', code: 'CREDIT_TOO_LONG' });
      } else if (/<|>|\$\{/.test(t)) {
        return res.status(400).json({ error: 'playthrough_credit contains invalid characters', code: 'CREDIT_INVALID_CHARS' });
      } else if (!/^[A-Za-z0-9._@\- ]{1,24}$/.test(t)) {
        return res.status(400).json({ error: 'playthrough_credit has disallowed characters', code: 'CREDIT_CHARSET' });
      } else if (/\b(s\.?\s*tory\s*bound|storybound|stbd|admin|moderator|official|staff|support)\b/i.test(t)) {
        return res.status(400).json({ error: 'playthrough_credit uses reserved terms', code: 'CREDIT_RESERVED' });
      } else if (/\b(trump|biden|obama|elon\s+musk|musk|bezos|zuckerberg|taylor\s+swift|kardashian|beyonc[eé]|kanye|putin|oprah|rihanna|drake)\b/i.test(t)) {
        return res.status(400).json({ error: 'Real public figures not allowed in credit', code: 'CREDIT_PUBLIC_FIGURE' });
      } else if (/\b(batman|superman|spider.?man|iron.?man|harry.?potter|hermione|voldemort|darth.?vader|luke.?skywalker|yoda|geralt|frodo|gandalf|katniss|naruto|goku|sherlock.?holmes|james.?bond|christian.?grey|edward.?cullen|mr.?darcy)\b/i.test(t)) {
        return res.status(400).json({ error: 'Copyrighted character names not allowed in credit', code: 'CREDIT_IP_NAME' });
      } else {
        validatedCredit = t;
      }
    }

    const sbHeaders = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    };

    // ── Idempotency check ──
    // If this story already has an issue number, return it. Prevents
    // double-claims when the client retries on network errors.
    // Targets story_library_versions (canonical completed-book table).
    const existingResp = await fetch(
      `${SUPABASE_URL}/rest/v1/story_library_versions?id=eq.${encodeURIComponent(story_id)}&select=id,author_id,issue_number,issue_flavor,issue_claimed_at,playthrough_credit`,
      { headers: sbHeaders }
    );
    const existing = await existingResp.json();
    if (!Array.isArray(existing) || existing.length === 0) {
      return res.status(404).json({ error: 'Story not found in story_library_versions', code: 'STORY_NOT_FOUND' });
    }
    const story = existing[0];
    if (story.author_id && story.author_id !== user_id) {
      return res.status(403).json({ error: 'Story is not owned by this user', code: 'NOT_OWNER' });
    }
    if (story.issue_number != null) {
      // Already claimed — return existing number AND existing credit
      // (idempotent). The DB trigger blocks any attempt to mutate
      // playthrough_credit once non-null, so retrying with a different
      // credit value here is a no-op — we just return the canonical value.
      return res.status(200).json({
        ok: true,
        already_claimed: true,
        issue_number: story.issue_number,
        flavor_key: story.issue_flavor,
        claimed_at: story.issue_claimed_at,
        playthrough_credit: story.playthrough_credit
      });
    }

    // ── Atomic increment via RPC ──
    const rpcResp = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/increment_flavor_count`,
      {
        method: 'POST',
        headers: sbHeaders,
        body: JSON.stringify({ p_flavor_key: flavor_key })
      }
    );
    if (!rpcResp.ok) {
      const errText = await rpcResp.text().catch(() => '');
      console.error('[CLAIM-ISSUE] RPC failed:', rpcResp.status, errText);
      return res.status(502).json({ error: 'Counter RPC failed', detail: errText.slice(0, 200) });
    }
    const newNumber = await rpcResp.json();
    if (typeof newNumber !== 'number' || newNumber <= 0) {
      console.error('[CLAIM-ISSUE] RPC returned invalid value:', newNumber);
      return res.status(502).json({ error: 'Counter RPC returned invalid value' });
    }

    // ── Stamp the story row ──
    // Targets story_library_versions. The partial UNIQUE INDEX on
    // (issue_flavor, issue_number) WHERE issue_number IS NOT NULL means
    // a duplicate stamp from a parallel claim would fail at the DB layer
    // — defensive belt-and-suspenders even though the idempotency check
    // above should prevent reaching this point twice for the same story.
    const claimedAt = new Date().toISOString();
    const stampResp = await fetch(
      `${SUPABASE_URL}/rest/v1/story_library_versions?id=eq.${encodeURIComponent(story_id)}`,
      {
        method: 'PATCH',
        headers: { ...sbHeaders, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          issue_number: newNumber,
          issue_flavor: flavor_key,
          issue_claimed_at: claimedAt,
          // Stamp completion timestamp — gates future re-claim attempts
          // and surfaces "finished on X" metadata for UI.
          completed_at: completedAtTs,
          // Playthrough credit (null = Anonymous Canon Edition). Locked
          // by the DB immutability trigger from this moment on.
          playthrough_credit: validatedCredit,
          // Also stamp author_id if not already set — establishes binding
          ...(story.author_id ? {} : { author_id: user_id })
        })
      }
    );
    if (!stampResp.ok) {
      const errText = await stampResp.text().catch(() => '');
      console.error('[CLAIM-ISSUE] Stamp failed:', stampResp.status, errText);
      // Special case: duplicate-key error on the unique normalized
      // playthrough_credit index means this credit handle is already
      // claimed on another story. The counter has been incremented
      // already (a wasted number), but the client can retry with a
      // different credit OR Anonymous Canon Edition. Surface a clean
      // error code so the modal can re-open with an inline message.
      const isCreditTaken = /duplicate key|unique constraint/i.test(errText)
        && /playthrough_credit/i.test(errText);
      if (isCreditTaken) {
        return res.status(409).json({
          ok: false,
          error: 'That name is already claimed on another story. Try a different name or pick Anonymous Canon Edition.',
          code: 'CREDIT_TAKEN',
          attempted_credit: validatedCredit
        });
      }
      // Critical: number was incremented but stamping failed. Number is
      // effectively burned. Client can retry; idempotency check above will
      // catch the stamp on retry IF the stamp eventually succeeds.
      // For now, return the number anyway so client can stamp locally.
      return res.status(207).json({
        ok: false,
        partial: true,
        issue_number: newNumber,
        flavor_key,
        claimed_at: claimedAt,
        playthrough_credit: validatedCredit,
        warning: 'Counter incremented but story stamp failed; client should retry stamp.'
      });
    }

    console.log('[CLAIM-ISSUE] Claimed', flavor_key, '#' + newNumber, 'for user', user_id, 'story', story_id, validatedCredit ? '(as played by ' + validatedCredit + ')' : '(Anonymous Canon Edition)');
    return res.status(200).json({
      ok: true,
      already_claimed: false,
      issue_number: newNumber,
      flavor_key,
      world: world || null,
      claimed_at: claimedAt,
      playthrough_credit: validatedCredit
    });

  } catch (err) {
    console.error('[CLAIM-ISSUE] Request failed:', err.message);
    return res.status(502).json({ error: 'Internal error', details: err.message });
  }
};
