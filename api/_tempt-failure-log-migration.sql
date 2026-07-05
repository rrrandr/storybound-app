-- Three-tier scene-gen failure handling with server-authoritative dedup.
-- Run once against the Storybound Supabase project (SQL editor or psql).
--
-- Philosophy: most scene-gen failures are transient. Granting a Tempt Fate
-- charge on every single one trains players to associate glitches with
-- bonuses rather than reliability. So we log every failure but only grant
-- after the SAME scene fails ≥ threshold (default 2) — the second failure
-- of the same scene proves the failure isn't a one-off flake.
--
-- PK is (user_id, story_id, scene_idx) — NOT keyed on reason. From the
-- player's POV "scene 12 blew up" is one incident regardless of how the
-- failure is classified internally. Different reasons hitting the same
-- (story, scene) feed the same attempt_count.
--
-- record_tempt_failure() returns one of three sources:
--   • 'recovered'        — logged, attempt_count < threshold, no grant
--   • 'granted'          — logged, threshold reached, +1 charge, granted_at set
--   • 'already_granted'  — already granted for this (user, story, scene);
--                          subsequent failures increment count + update
--                          last_reason for telemetry but do not re-grant
--
-- Security model:
--   • SECURITY DEFINER + locked search_path so the function bypasses RLS as
--     the owner (writes to profiles and tempt_failure_log are otherwise
--     blocked for non-superuser callers).
--   • EXECUTE is revoked from public/anon/authenticated and granted only to
--     service_role — clients cannot call the RPC directly via PostgREST;
--     they must go through /api/record-tempt-failure (which uses the
--     SUPABASE_SERVICE_ROLE_KEY) and which validates the payload first.

CREATE TABLE IF NOT EXISTS public.tempt_failure_log (
    user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    story_id        text        NOT NULL,
    scene_idx       integer     NOT NULL,
    attempt_count   integer     NOT NULL DEFAULT 0,
    granted_at      timestamptz,                       -- null until grant fires
    last_reason     text,                              -- metadata only
    first_failed_at timestamptz NOT NULL DEFAULT now(),
    last_failed_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, story_id, scene_idx)
);

CREATE INDEX IF NOT EXISTS idx_tempt_failure_log_user
    ON public.tempt_failure_log(user_id, last_failed_at DESC);

CREATE OR REPLACE FUNCTION public.record_tempt_failure(
    p_user_id   uuid,
    p_story_id  text,
    p_scene_idx integer,
    p_reason    text,
    p_threshold integer DEFAULT 2
)
RETURNS TABLE(
    source              text,
    attempt_count       integer,
    bonus_tempt_charges integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_balance    integer;
    v_attempts   integer;
    v_granted_at timestamptz;
BEGIN
    -- Verify profile exists.
    SELECT p.bonus_tempt_charges
    INTO v_balance
    FROM public.profiles AS p
    WHERE p.id = p_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'profile_not_found'::text, 0, 0;
        RETURN;
    END IF;

    -- Upsert the log row; always increment attempt_count + update
    -- last_reason/last_failed_at. Records EVERY failure so logs are
    -- complete for telemetry / support tier.
    INSERT INTO public.tempt_failure_log (
        user_id,
        story_id,
        scene_idx,
        attempt_count,
        last_reason,
        first_failed_at,
        last_failed_at
    )
    VALUES (
        p_user_id,
        p_story_id,
        p_scene_idx,
        1,
        p_reason,
        now(),
        now()
    )
    ON CONFLICT (user_id, story_id, scene_idx) DO UPDATE
        SET attempt_count  = public.tempt_failure_log.attempt_count + 1,
            last_reason    = EXCLUDED.last_reason,
            last_failed_at = EXCLUDED.last_failed_at
    RETURNING public.tempt_failure_log.attempt_count,
              public.tempt_failure_log.granted_at
    INTO v_attempts, v_granted_at;

    -- Already granted for this scene-incident → record-only, no grant.
    IF v_granted_at IS NOT NULL THEN
        RETURN QUERY SELECT 'already_granted'::text, v_attempts, COALESCE(v_balance, 0);
        RETURN;
    END IF;

    -- Below threshold → silent recovery only.
    IF v_attempts < p_threshold THEN
        RETURN QUERY SELECT 'recovered'::text, v_attempts, COALESCE(v_balance, 0);
        RETURN;
    END IF;

    -- Threshold reached → fire the grant + stamp granted_at so future
    -- failures of THIS scene short-circuit to 'already_granted'.
    UPDATE public.tempt_failure_log AS tfl
    SET granted_at = now()
    WHERE tfl.user_id = p_user_id
      AND tfl.story_id = p_story_id
      AND tfl.scene_idx = p_scene_idx;

    UPDATE public.profiles AS p
    SET bonus_tempt_charges = COALESCE(p.bonus_tempt_charges, 0) + 1
    WHERE p.id = p_user_id
    RETURNING p.bonus_tempt_charges INTO v_balance;

    RETURN QUERY SELECT 'granted'::text, v_attempts, COALESCE(v_balance, 0);
END;
$$;

-- Lock down EXECUTE: only the service role (i.e. the /api/record-tempt-failure
-- endpoint using SUPABASE_SERVICE_ROLE_KEY) can call this RPC. anon and
-- authenticated cannot reach it via PostgREST.
REVOKE ALL ON FUNCTION public.record_tempt_failure(uuid, text, integer, text, integer)
    FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_tempt_failure(uuid, text, integer, text, integer)
    TO service_role;

-- Table-level lockdown. The RPC bypasses RLS via SECURITY DEFINER, but the
-- table itself is otherwise reachable via PostgREST. Block direct REST
-- queries from anon/authenticated — clients should never see the failure
-- log; only the service-role-key API handler should touch it.
REVOKE ALL ON public.tempt_failure_log FROM anon, authenticated;
GRANT  ALL ON public.tempt_failure_log TO service_role;

-- Tell PostgREST to reload its schema cache so the RPC is immediately
-- callable without waiting for auto-reload.
NOTIFY pgrst, 'reload schema';
