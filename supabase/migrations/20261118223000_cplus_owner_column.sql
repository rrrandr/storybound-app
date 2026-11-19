BEGIN;
-- Production's completed-book owner is profile_id. Patch only this lookup in the
-- installed function, preserving its current policy, quotas, replay and locking logic.
DO $$
DECLARE fn regprocedure; definition text; old_query text; new_query text;
BEGIN
  fn := to_regprocedure('public.cplus_editor_admit(text,uuid,text,integer,text,text,jsonb,numeric,numeric,integer)');
  IF fn IS NULL THEN RAISE EXCEPTION 'cplus_editor_admit is missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='story_library_versions' AND column_name='profile_id') THEN
    RAISE EXCEPTION 'completed-book profile_id owner column is missing';
  END IF;
  definition := pg_get_functiondef(fn);
  old_query := 'select author_id from public.story_library_versions where id::text = $1';
  new_query := 'select profile_id from public.story_library_versions where id::text = $1';
  IF position(old_query IN definition)>0 THEN
    EXECUTE replace(definition,old_query,new_query);
  ELSIF position(new_query IN definition)=0 THEN
    RAISE EXCEPTION 'unexpected C+ owner lookup; refusing to rewrite an unknown definition';
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
