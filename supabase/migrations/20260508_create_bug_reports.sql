-- ═══════════════════════════════════════════════════════════════════════
-- BUG REPORTS — user-submitted issue tracking + admin-gated 1F bounty
-- ═══════════════════════════════════════════════════════════════════════
-- Users submit reports via the Vault → "Report an Issue" button. Each
-- report carries free-text description, severity, and auto-attached
-- diagnostic context (storyId, sceneIdx, console buffer, state snapshot).
-- Admin reviews via /admin/bug-reports page. On approval, the
-- grant_bug_bounty() RPC atomically credits the user 1F + flags the
-- report awarded; on rejection, sets rejected_at with a note.
--
-- Rate-limit (3 submissions per user per 24h) enforced server-side in
-- /api/bug-report — DB doesn't reject on insert; the API rejects.
-- ═══════════════════════════════════════════════════════════════════════

-- Table -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.bug_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email      TEXT,                          -- denormalized for admin readability
    description     TEXT NOT NULL,                  -- free-text, min 30 chars (validated server-side)
    severity        TEXT NOT NULL DEFAULT 'minor',  -- 'typo' | 'minor' | 'breaking'
    -- Auto-attached context
    story_id        TEXT,
    scene_idx       INTEGER,
    render_mode     TEXT,                           -- 'literary' | 'staged_story_mode' | etc.
    user_agent      TEXT,
    console_buffer  JSONB DEFAULT '[]'::jsonb,      -- last ~10 log lines
    state_snapshot  JSONB DEFAULT '{}'::jsonb,      -- world/tone/storyturn/intensity/etc.
    -- Lifecycle timestamps
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at     TIMESTAMPTZ,
    awarded_at      TIMESTAMPTZ,
    rejected_at     TIMESTAMPTZ,
    awarded_seen_at TIMESTAMPTZ,                    -- when user has seen the award toast
    admin_notes     TEXT,
    CONSTRAINT bug_reports_severity_check
        CHECK (severity IN ('typo', 'minor', 'breaking')),
    CONSTRAINT bug_reports_lifecycle_check
        CHECK (
            (awarded_at IS NULL OR rejected_at IS NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id
    ON public.bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_submitted_at
    ON public.bug_reports(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_reports_pending
    ON public.bug_reports(submitted_at DESC)
    WHERE awarded_at IS NULL AND rejected_at IS NULL;

-- RLS — user can read/insert own, admins read all (admin gate via service role) -----

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own reports (user_id must match auth.uid())
DROP POLICY IF EXISTS bug_reports_insert_own ON public.bug_reports;
CREATE POLICY bug_reports_insert_own ON public.bug_reports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Authenticated users can read their own reports (for the "awarded toast" lookup)
DROP POLICY IF EXISTS bug_reports_select_own ON public.bug_reports;
CREATE POLICY bug_reports_select_own ON public.bug_reports
    FOR SELECT
    USING (auth.uid() = user_id);

-- Authenticated users can mark their own awarded report as seen
DROP POLICY IF EXISTS bug_reports_update_seen_own ON public.bug_reports;
CREATE POLICY bug_reports_update_seen_own ON public.bug_reports
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admin operations (list-all, approve, reject) go through service-role API endpoint;
-- service role bypasses RLS, so no admin-specific policy needed.

-- RPC: grant_bug_bounty ---------------------------------------------------

CREATE OR REPLACE FUNCTION public.grant_bug_bounty(p_report_id UUID, p_admin_notes TEXT DEFAULT NULL)
RETURNS TABLE(source TEXT, fortunes INTEGER, user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_user_id UUID;
    v_existing_award TIMESTAMPTZ;
    v_new_fortunes INTEGER;
BEGIN
    -- Fetch report + lock the row
    SELECT br.user_id, br.awarded_at INTO v_user_id, v_existing_award
    FROM public.bug_reports br
    WHERE br.id = p_report_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'not_found'::TEXT, 0::INTEGER, NULL::UUID;
        RETURN;
    END IF;

    IF v_existing_award IS NOT NULL THEN
        -- Idempotent: already awarded, return current state
        SELECT p.fortunes INTO v_new_fortunes FROM public.profiles p WHERE p.id = v_user_id;
        RETURN QUERY SELECT 'already_awarded'::TEXT, COALESCE(v_new_fortunes, 0), v_user_id;
        RETURN;
    END IF;

    IF v_user_id IS NULL THEN
        -- Report exists but user_id is null (orphaned) — mark reviewed without grant
        UPDATE public.bug_reports
        SET reviewed_at = NOW(), rejected_at = NOW(),
            admin_notes = COALESCE(p_admin_notes, 'No user_id on report — cannot grant bounty.')
        WHERE id = p_report_id;
        RETURN QUERY SELECT 'no_user'::TEXT, 0::INTEGER, NULL::UUID;
        RETURN;
    END IF;

    -- Atomic: increment fortunes + flag report awarded.
    -- Alias the table so RETURNING is unambiguous against the function's
    -- RETURN TABLE column also named `fortunes`.
    UPDATE public.profiles AS p
    SET fortunes = COALESCE(p.fortunes, 0) + 1
    WHERE p.id = v_user_id
    RETURNING p.fortunes INTO v_new_fortunes;

    UPDATE public.bug_reports
    SET awarded_at = NOW(), reviewed_at = NOW(), admin_notes = p_admin_notes
    WHERE id = p_report_id;

    RETURN QUERY SELECT 'granted'::TEXT, v_new_fortunes, v_user_id;
END;
$$;

-- RPC: reject_bug_report --------------------------------------------------

CREATE OR REPLACE FUNCTION public.reject_bug_report(p_report_id UUID, p_admin_notes TEXT DEFAULT NULL)
RETURNS TABLE(source TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_existing_award TIMESTAMPTZ;
    v_existing_reject TIMESTAMPTZ;
BEGIN
    SELECT awarded_at, rejected_at INTO v_existing_award, v_existing_reject
    FROM public.bug_reports
    WHERE id = p_report_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'not_found'::TEXT;
        RETURN;
    END IF;
    IF v_existing_award IS NOT NULL THEN
        RETURN QUERY SELECT 'already_awarded'::TEXT;
        RETURN;
    END IF;
    IF v_existing_reject IS NOT NULL THEN
        RETURN QUERY SELECT 'already_rejected'::TEXT;
        RETURN;
    END IF;

    UPDATE public.bug_reports
    SET rejected_at = NOW(), reviewed_at = NOW(), admin_notes = p_admin_notes
    WHERE id = p_report_id;
    RETURN QUERY SELECT 'rejected'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_bug_bounty(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_bug_report(UUID, TEXT) TO service_role;
