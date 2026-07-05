-- ═══════════════════════════════════════════════════════════════════════
-- FAMOUS FATE BETA REPORTS — crowdsourced QA for the Famous Fate beta
-- ═══════════════════════════════════════════════════════════════════════
-- Readers report issues from inside Famous Fate stories (the repurposed
-- Vision Orb → 🐞). Each report carries a tiny bit of user-typed text plus a
-- rich auto-attached telemetry payload (reading position, original inputs,
-- classifier output, runtime state, prompt/model versions, scene snapshot,
-- character state, image-generation flag). Engineering reviews via
-- /admin/famous-fate-reports and optionally credits Fortune rewards.
--
-- DESIGN NOTES
--   • The full telemetry lives in the `telemetry` JSONB column. The most-
--     searched fields are ALSO denormalized into typed columns + indexed so
--     the dashboard filters are fast — but because `telemetry` has a GIN
--     index, ANY nested field is searchable (e.g. by prompt hash, seed,
--     dynamic, partner archetype) WITHOUT a schema change. This satisfies the
--     "future-proof search" requirement.
--   • Rewards are granted via set_famous_fate_report_status() (admin-triggered
--     now; the grant logic lives server-side so automatic rewards can be added
--     later without a redesign). Idempotent — never double-credits.
--   • Mirrors the conventions of bug_reports (20260508): service-role admin
--     API bypasses RLS; users may insert/read their own rows.
-- ═══════════════════════════════════════════════════════════════════════

-- Table -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.famous_fate_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Reporter
    user_id             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email          TEXT,

    -- User-entered (sanitized client-side; NO IP allow-list on these fields)
    category            TEXT NOT NULL,
    description         TEXT,                          -- "What happened?" (<=500)
    expected            TEXT,                          -- "What did you expect?" (<=500, optional)
    screenshot_url      TEXT,                          -- optional (data URL or storage URL)

    -- Denormalized searchable columns (full payload also in `telemetry`)
    story_id            TEXT,
    issue_id            TEXT,
    scene_number        INTEGER,
    scene_id            TEXT,
    franchise           TEXT,                          -- original user `world` input
    embodied_character  TEXT,                          -- original user `embody` input
    resolved_world      TEXT,                          -- classifier world
    classifier_version  TEXT,
    author_model        TEXT,
    build_version       TEXT,
    images_generated    BOOLEAN NOT NULL DEFAULT FALSE,
    high_priority       BOOLEAN NOT NULL DEFAULT FALSE, -- auto-true if images_generated

    -- Full structured telemetry — searchable via GIN without schema changes
    telemetry           JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Review workflow
    status              TEXT NOT NULL DEFAULT 'pending',
    reward_fortunes     INTEGER,                        -- 1|3|5|10|25 (null until set)
    reward_granted      BOOLEAN NOT NULL DEFAULT FALSE,
    reward_granted_at   TIMESTAMPTZ,
    reviewer_notes      TEXT,
    reviewed_at         TIMESTAMPTZ,

    CONSTRAINT famous_fate_reports_status_check
        CHECK (status IN ('pending', 'confirmed', 'duplicate',
                          'not_reproducible', 'working_as_intended', 'needs_discussion')),
    CONSTRAINT famous_fate_reports_reward_check
        CHECK (reward_fortunes IS NULL OR reward_fortunes >= 0)
);

-- Indexes — dashboard filters + arbitrary nested search ------------------

CREATE INDEX IF NOT EXISTS idx_ff_reports_created_at      ON public.famous_fate_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ff_reports_status          ON public.famous_fate_reports(status);
CREATE INDEX IF NOT EXISTS idx_ff_reports_category        ON public.famous_fate_reports(category);
CREATE INDEX IF NOT EXISTS idx_ff_reports_franchise       ON public.famous_fate_reports(franchise);
CREATE INDEX IF NOT EXISTS idx_ff_reports_embodied        ON public.famous_fate_reports(embodied_character);
CREATE INDEX IF NOT EXISTS idx_ff_reports_classifier_ver  ON public.famous_fate_reports(classifier_version);
CREATE INDEX IF NOT EXISTS idx_ff_reports_story_id        ON public.famous_fate_reports(story_id);
CREATE INDEX IF NOT EXISTS idx_ff_reports_scene_number    ON public.famous_fate_reports(scene_number);
CREATE INDEX IF NOT EXISTS idx_ff_reports_author_model    ON public.famous_fate_reports(author_model);
CREATE INDEX IF NOT EXISTS idx_ff_reports_build_version   ON public.famous_fate_reports(build_version);
CREATE INDEX IF NOT EXISTS idx_ff_reports_high_priority   ON public.famous_fate_reports(high_priority) WHERE high_priority = TRUE;
CREATE INDEX IF NOT EXISTS idx_ff_reports_telemetry_gin   ON public.famous_fate_reports USING GIN (telemetry);

-- RLS -------------------------------------------------------------------
-- Admin operations (list-all, set status, grant reward) go through the
-- service-role API endpoint, which bypasses RLS. Users may insert/read their own.

ALTER TABLE public.famous_fate_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ff_reports_insert_own ON public.famous_fate_reports;
CREATE POLICY ff_reports_insert_own ON public.famous_fate_reports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ff_reports_select_own ON public.famous_fate_reports;
CREATE POLICY ff_reports_select_own ON public.famous_fate_reports
    FOR SELECT
    USING (auth.uid() = user_id);

-- RPC: set status + optionally grant a Fortune reward (idempotent) --------
-- Admin-triggered today; the crediting logic lives here so an automated path
-- can call the same RPC later. Never double-credits (guards on reward_granted).

CREATE OR REPLACE FUNCTION public.set_famous_fate_report_status(
    p_report_id      UUID,
    p_status         TEXT,
    p_reward         INTEGER DEFAULT NULL,
    p_notes          TEXT DEFAULT NULL
)
RETURNS TABLE(source TEXT, fortunes INTEGER, user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_user_id        UUID;
    v_already_granted BOOLEAN;
    v_new_fortunes   INTEGER;
BEGIN
    IF p_status NOT IN ('pending','confirmed','duplicate','not_reproducible','working_as_intended','needs_discussion') THEN
        RETURN QUERY SELECT 'bad_status'::TEXT, 0::INTEGER, NULL::UUID;
        RETURN;
    END IF;

    SELECT r.user_id, r.reward_granted INTO v_user_id, v_already_granted
    FROM public.famous_fate_reports r
    WHERE r.id = p_report_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'not_found'::TEXT, 0::INTEGER, NULL::UUID;
        RETURN;
    END IF;

    -- Always update status + notes + reviewed timestamp.
    UPDATE public.famous_fate_reports
    SET status = p_status,
        reviewer_notes = COALESCE(p_notes, reviewer_notes),
        reviewed_at = NOW(),
        reward_fortunes = COALESCE(p_reward, reward_fortunes)
    WHERE id = p_report_id;

    -- Grant the Fortune reward exactly once, only when a positive reward is
    -- supplied and not already granted. (Crediting can be triggered manually
    -- by passing p_reward; or automatically later by the same call.)
    IF p_reward IS NOT NULL AND p_reward > 0 AND NOT v_already_granted AND v_user_id IS NOT NULL THEN
        UPDATE public.profiles AS p
        SET fortunes = COALESCE(p.fortunes, 0) + p_reward
        WHERE p.id = v_user_id
        RETURNING p.fortunes INTO v_new_fortunes;

        UPDATE public.famous_fate_reports
        SET reward_granted = TRUE, reward_granted_at = NOW()
        WHERE id = p_report_id;

        RETURN QUERY SELECT 'granted'::TEXT, COALESCE(v_new_fortunes, 0), v_user_id;
        RETURN;
    END IF;

    RETURN QUERY SELECT 'updated'::TEXT, NULL::INTEGER, v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_famous_fate_report_status(UUID, TEXT, INTEGER, TEXT) TO service_role;
