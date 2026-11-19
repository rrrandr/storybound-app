BEGIN;
-- New profiles receive the gift through their column default, once. Existing
-- balances are deliberately untouched; logging in is never a top-up operation.
DO $$
DECLARE prior text; verified_default text; actual integer;
BEGIN
  SELECT pg_get_expr(d.adbin,d.adrelid) INTO prior
    FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid='public.profiles'::regclass AND a.attname='fortunes';
  RAISE NOTICE 'profiles.fortunes default before verification: %',prior;
  ALTER TABLE public.profiles ALTER COLUMN fortunes SET DEFAULT 90;
  SELECT pg_get_expr(d.adbin,d.adrelid) INTO verified_default
    FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid='public.profiles'::regclass AND a.attname='fortunes';
  EXECUTE format('CREATE TEMP TABLE signup_fortune_grant_probe(fortunes integer DEFAULT %s) ON COMMIT DROP', verified_default);
  INSERT INTO signup_fortune_grant_probe DEFAULT VALUES;
  SELECT fortunes INTO actual FROM signup_fortune_grant_probe;
  IF actual<>90 THEN RAISE EXCEPTION 'new-account Fortune gift verification failed'; END IF;
  RAISE NOTICE 'Verified: new profiles receive 90 Fortunes; existing profile balances unchanged.';
END $$;
COMMIT;
