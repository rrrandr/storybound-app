-- Cross-user mouth bank — durable, shared cache of per-LI OAS mouth frames.
-- Run this in the Supabase SQL editor.
--
-- WHY: a DISTINCTIVE love interest (beard / scar / fangs / specific skin tone /
-- teeth / cyber features) can't reuse the shipped generic mouth frames, so OAS
-- renders the full ~35-state mouth vocabulary for that LI via BFL Kontext —
-- ~$2 of image-gen, ONE TIME. The feature signature (`_liMouthFeatureKey`,
-- e.g. `male_beard+scar`, `female_dark_skin`) is SMALL and SHARED across all
-- users — two LIs with the same distinguishing features have visually
-- interchangeable mouth crops. So banking the frames by feature_key and serving
-- them to every user amortizes that ~$2 to ONCE across the entire user base,
-- instead of once per user per device.
--
-- The localStorage `sb_mouth_db` stays as the per-device HOT cache (synchronous,
-- fast); this table is the durable cross-user backing it hydrates from / writes
-- through to.
--
-- Frames are stored as base64 data URLs (BFL output is FileReader-encoded to a
-- data URL, see _transformMouthForLI) — durable (no expiry) but ~60-120KB each,
-- so a full row is a few MB. The feature_key space is small (dozens of realistic
-- keys ever), so total table size stays bounded. If row size becomes a concern
-- at scale, migrate `urls` values to Supabase Storage public URLs (the client
-- read/write path is URL-agnostic and won't need changing).

CREATE TABLE IF NOT EXISTS public.mouth_bank (
  feature_key TEXT PRIMARY KEY,            -- _liMouthFeatureKey() signature
  urls        JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { <mouthState>: <data-url-or-href> }
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.mouth_bank ENABLE ROW LEVEL SECURITY;

-- Shared global asset cache: ANYONE may READ (cross-user amortization is the
-- whole point — even pre-auth). Frames are non-sensitive generated art keyed by
-- an anonymous feature signature; nothing user-identifying is stored.
DROP POLICY IF EXISTS mouth_bank_read ON public.mouth_bank;
CREATE POLICY mouth_bank_read ON public.mouth_bank
  FOR SELECT TO anon, authenticated
  USING (true);

-- No direct writes from clients — all writes go through the merge RPC below so
-- partial frame sets from different users ACCUMULATE rather than clobber.
REVOKE INSERT, UPDATE, DELETE ON public.mouth_bank FROM anon, authenticated;

-- Merge-upsert: fills MISSING states without overwriting frames already banked
-- (EXCLUDED || existing → existing wins on key conflict, new keys are added).
-- So the first user to render `male_beard` banks it; later users only ever ADD
-- states that weren't there yet. Idempotent.
CREATE OR REPLACE FUNCTION public.mouth_bank_merge(p_feature_key TEXT, p_urls JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public  -- pin pg_catalog FIRST: blocks search_path hijacking in a SECURITY DEFINER fn
AS $$
DECLARE
  v_merged JSONB;
BEGIN
  IF p_feature_key IS NULL
     OR length(p_feature_key) = 0
     OR p_urls IS NULL
     OR jsonb_typeof(p_urls) <> 'object' THEN
    RETURN '{}'::jsonb;
  END IF;

  INSERT INTO public.mouth_bank (feature_key, urls, updated_at)
  VALUES (p_feature_key, p_urls, NOW())
  ON CONFLICT (feature_key) DO UPDATE
    SET urls       = EXCLUDED.urls || public.mouth_bank.urls,  -- existing frames win
        updated_at = NOW()
  RETURNING urls INTO v_merged;

  RETURN v_merged;
END;
$$;

REVOKE ALL ON FUNCTION public.mouth_bank_merge(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mouth_bank_merge(TEXT, JSONB) TO anon, authenticated;

-- Force PostgREST to reload its schema cache so the new table + RPC are
-- reachable immediately (otherwise the client can 404 on the RPC until the
-- next periodic cache refresh).
NOTIFY pgrst, 'reload schema';
