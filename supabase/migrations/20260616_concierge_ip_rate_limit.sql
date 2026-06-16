-- ============================================================================
-- Concierge per-IP rate limiting — cross-instance durable store (Roman 2026-06-16)
-- ----------------------------------------------------------------------------
-- The proxy (api/chatgpt-proxy.js) enforces a per-IP rate limit on CONCIERGE
-- requests. In-memory limiting is per-instance and resets on cold start; this
-- table is the durable, cross-instance backstop a bot cannot evade by spreading
-- load across serverless instances.
--
-- Design: FIXED-WINDOW bucket counters keyed by (ip, time-bucket). Per request
-- the proxy increments BOTH a minute bucket and an hour bucket via the atomic
-- RPC below and is blocked when either exceeds its cap. Buckets churn with time;
-- stale rows can be purged by a daily cron. The proxy fails OPEN on any DB error.
--
-- NOTE: this file reflects the version APPLIED to production (2026-06-16) — it
-- hardens the original with: search_path=pg_catalog,public (SECURITY DEFINER
-- safety), expires_at = GREATEST(...) on conflict, explicit anon/authenticated
-- revokes, and NOTIFY pgrst to refresh the PostgREST schema cache immediately.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.concierge_ip_rate (
  ip         TEXT        NOT NULL,
  bucket     TEXT        NOT NULL,            -- 'm:<minute-index>' | 'h:<hour-index>'
  count      INTEGER     NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ip, bucket)
);

CREATE INDEX IF NOT EXISTS concierge_ip_rate_expires_idx
  ON public.concierge_ip_rate(expires_at);

ALTER TABLE public.concierge_ip_rate ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.concierge_ip_rate FROM anon, authenticated;
GRANT ALL ON public.concierge_ip_rate TO service_role;

-- Atomic bump-and-check. Increments the minute + hour buckets and returns the
-- limited window ('minute' | 'hour') or NULL when the request is within caps.
CREATE OR REPLACE FUNCTION public.concierge_ip_bump(
  p_ip          TEXT,
  p_min_bucket  TEXT,
  p_hr_bucket   TEXT,
  p_min_cap     INTEGER,
  p_hr_cap      INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_min INTEGER;
  v_hr  INTEGER;
BEGIN
  INSERT INTO public.concierge_ip_rate (ip, bucket, count, expires_at)
  VALUES (p_ip, p_min_bucket, 1, NOW() + INTERVAL '2 minutes')
  ON CONFLICT (ip, bucket) DO UPDATE
    SET count = public.concierge_ip_rate.count + 1,
        expires_at = GREATEST(public.concierge_ip_rate.expires_at, EXCLUDED.expires_at)
  RETURNING count INTO v_min;

  INSERT INTO public.concierge_ip_rate (ip, bucket, count, expires_at)
  VALUES (p_ip, p_hr_bucket, 1, NOW() + INTERVAL '70 minutes')
  ON CONFLICT (ip, bucket) DO UPDATE
    SET count = public.concierge_ip_rate.count + 1,
        expires_at = GREATEST(public.concierge_ip_rate.expires_at, EXCLUDED.expires_at)
  RETURNING count INTO v_hr;

  IF v_min > p_min_cap THEN
    RETURN 'minute';
  END IF;

  IF v_hr > p_hr_cap THEN
    RETURN 'hour';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL
ON FUNCTION public.concierge_ip_bump(TEXT, TEXT, TEXT, INTEGER, INTEGER)
FROM public, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.concierge_ip_bump(TEXT, TEXT, TEXT, INTEGER, INTEGER)
TO service_role;

NOTIFY pgrst, 'reload schema';

-- Optional cleanup of stale buckets (schedule via pg_cron or a daily job):
--   DELETE FROM public.concierge_ip_rate WHERE expires_at < NOW();
