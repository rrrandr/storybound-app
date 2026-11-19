BEGIN;
-- Refuse an incomplete deployment before changing privileges or installing functions.
DO $$ BEGIN
  PERFORM id, fortunes, is_subscriber, bonus_tempt_charges FROM public.profiles LIMIT 0;
  PERFORM operation_id, user_id, amount, context, story_id, status, balance_after FROM public.fortune_operations LIMIT 0;
  PERFORM user_id, amount, direction, context, story_id, balance_after, source_endpoint, metadata, operation_id FROM public.fortune_ledger LIMIT 0;
END $$;

-- Quotas and Tempt receipts are private server state, never browser-editable.
CREATE TABLE IF NOT EXISTS public.model_request_windows (
  user_id uuid NOT NULL, bucket text NOT NULL, hits integer NOT NULL,
  touched_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id, bucket)
);
CREATE TABLE IF NOT EXISTS public.tempt_charge_operations (
  operation_id text PRIMARY KEY, user_id uuid NOT NULL,
  remaining integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.model_request_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tempt_charge_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.model_request_windows, public.tempt_charge_operations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.model_request_windows, public.tempt_charge_operations TO service_role;

CREATE OR REPLACE FUNCTION public.admit_model_request(p_user_id uuid, p_story_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE p record; n integer; h integer;
BEGIN
  SELECT fortunes, is_subscriber INTO p FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('outcome','forbidden'); END IF;
  IF NOT (coalesce(p.is_subscriber,false) OR coalesce(p.fortunes,0) > 0 OR EXISTS (
    SELECT 1 FROM public.fortune_operations WHERE user_id=p_user_id AND story_id=p_story_id
      AND status='succeeded' AND amount>0)) THEN
    RETURN jsonb_build_object('outcome','forbidden');
  END IF;
  -- Consistent order prevents minute/hour lock inversions across concurrent instances.
  INSERT INTO public.model_request_windows(user_id,bucket,hits)
    VALUES(p_user_id,'m:'||floor(extract(epoch FROM now())/60)::text,1)
    ON CONFLICT(user_id,bucket) DO UPDATE SET hits=model_request_windows.hits+1,touched_at=now()
    RETURNING hits INTO n;
  INSERT INTO public.model_request_windows(user_id,bucket,hits)
    VALUES(p_user_id,'h:'||floor(extract(epoch FROM now())/3600)::text,1)
    ON CONFLICT(user_id,bucket) DO UPDATE SET hits=model_request_windows.hits+1,touched_at=now()
    RETURNING hits INTO h;
  DELETE FROM public.model_request_windows WHERE user_id=p_user_id AND touched_at < now()-interval '2 hours';
  IF n>120 OR h>1200 THEN RETURN jsonb_build_object('outcome','capped'); END IF;
  RETURN jsonb_build_object('outcome','admitted');
END $$;

CREATE OR REPLACE FUNCTION public.consume_tempt_charge_v1(p_user_id uuid, p_operation_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE op record; remaining integer;
BEGIN
  IF p_operation_id IS NULL OR length(p_operation_id) NOT BETWEEN 1 AND 200 THEN
    RETURN jsonb_build_object('outcome','invalid_operation');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('tempt:'||p_operation_id,0));
  SELECT * INTO op FROM public.tempt_charge_operations WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF op.user_id<>p_user_id THEN RETURN jsonb_build_object('outcome','mismatch'); END IF;
    SELECT bonus_tempt_charges INTO remaining FROM public.profiles WHERE id=p_user_id;
    RETURN jsonb_build_object('outcome','replay','remaining',coalesce(remaining,0));
  END IF;
  SELECT bonus_tempt_charges INTO remaining FROM public.profiles WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('outcome','not_found'); END IF;
  IF coalesce(remaining,0)<1 THEN RETURN jsonb_build_object('outcome','insufficient','remaining',0); END IF;
  remaining:=remaining-1;
  UPDATE public.profiles SET bonus_tempt_charges=remaining WHERE id=p_user_id;
  INSERT INTO public.tempt_charge_operations(operation_id,user_id,remaining) VALUES(p_operation_id,p_user_id,remaining);
  RETURN jsonb_build_object('outcome','consumed','remaining',remaining);
END $$;

CREATE OR REPLACE FUNCTION public.refund_fortunes_v4(p_user_id uuid, p_operation_id text, p_requested_amount integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE paid record; refunded record; before_balance integer; after_balance integer; refund_id text;
BEGIN
  IF p_operation_id IS NULL OR length(p_operation_id) NOT BETWEEN 1 AND 200 THEN
    RETURN jsonb_build_object('outcome','invalid_operation');
  END IF;
  refund_id:='refund:'||p_operation_id;
  PERFORM pg_advisory_xact_lock(hashtextextended(refund_id,0));
  SELECT * INTO paid FROM public.fortune_operations WHERE operation_id=p_operation_id FOR UPDATE;
  IF NOT FOUND OR paid.user_id<>p_user_id OR coalesce(paid.amount,0)<1 OR paid.balance_after IS NULL THEN
    RETURN jsonb_build_object('outcome','unverified');
  END IF;
  IF p_requested_amount IS NOT NULL AND p_requested_amount<>paid.amount THEN
    RETURN jsonb_build_object('outcome','amount_mismatch');
  END IF;
  SELECT * INTO refunded FROM public.fortune_operations WHERE operation_id=refund_id;
  IF FOUND THEN
    IF refunded.user_id<>p_user_id OR refunded.amount<>-paid.amount OR refunded.status<>'succeeded' THEN
      RETURN jsonb_build_object('outcome','unverified');
    END IF;
    SELECT fortunes INTO after_balance FROM public.profiles WHERE id=p_user_id;
    RETURN jsonb_build_object('outcome','replay','fortunes',after_balance);
  END IF;
  IF paid.status<>'succeeded' THEN RETURN jsonb_build_object('outcome','unverified'); END IF;
  SELECT fortunes INTO before_balance FROM public.profiles WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('outcome','not_found'); END IF;
  after_balance:=before_balance+paid.amount;
  UPDATE public.profiles SET fortunes=after_balance WHERE id=p_user_id;
  INSERT INTO public.fortune_operations(operation_id,user_id,context,amount,story_id,status,balance_after)
    VALUES(refund_id,p_user_id,'refund_'||coalesce(paid.context,'purchase'),-paid.amount,paid.story_id,'succeeded',after_balance);
  INSERT INTO public.fortune_ledger(user_id,amount,direction,context,story_id,balance_after,source_endpoint,metadata,operation_id)
    VALUES(p_user_id,paid.amount,'credit','refund_'||coalesce(paid.context,'purchase'),paid.story_id,after_balance,'refund-fortune',
      jsonb_build_object('original_operation_id',p_operation_id),refund_id);
  UPDATE public.fortune_operations SET status='refunded' WHERE operation_id=p_operation_id;
  RETURN jsonb_build_object('outcome','refunded','fortunes',after_balance);
END $$;

REVOKE ALL ON FUNCTION public.admit_model_request(uuid,text), public.consume_tempt_charge_v1(uuid,text),
  public.refund_fortunes_v4(uuid,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admit_model_request(uuid,text), public.consume_tempt_charge_v1(uuid,text),
  public.refund_fortunes_v4(uuid,text,integer) TO service_role;
-- The old welcome RPC itself admitted anonymous calls, bypassing its HTTP handler.
DO $$ BEGIN
  IF to_regprocedure('public.grant_welcome_milestone(uuid,text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.grant_welcome_milestone(uuid,text) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.grant_welcome_milestone(uuid,text) TO service_role;
  END IF;
END $$;
DO $$ BEGIN
  IF has_function_privilege('anon','public.refund_fortunes_v4(uuid,text,integer)','EXECUTE')
    OR has_function_privilege('authenticated','public.consume_tempt_charge_v1(uuid,text)','EXECUTE')
    OR has_function_privilege('anon','public.admit_model_request(uuid,text)','EXECUTE') THEN
    RAISE EXCEPTION 'audit boundary RPCs must be service-role-only';
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
