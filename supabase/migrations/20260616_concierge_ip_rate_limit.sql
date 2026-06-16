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
-- RPC below and is blocked when either exceeds its cap. Buckets churn with time
-- (a new minute/hour = a new row starting at 1), so old rows just go stale and
-- can be purged by a daily cron. The proxy fails OPEN on any DB error.
-- ============================================================================

create table if not exists public.concierge_ip_rate (
  ip          text        not null,
  bucket      text        not null,            -- 'm:<minute-index>' | 'h:<hour-index>'
  count       integer     not null default 0,
  expires_at  timestamptz not null default now(),
  primary key (ip, bucket)
);

create index if not exists concierge_ip_rate_expires_idx
  on public.concierge_ip_rate (expires_at);

-- Lock the table down: only the service role (used by the proxy) may touch it.
alter table public.concierge_ip_rate enable row level security;
-- (No policies created → anon/authenticated have no access; service_role bypasses RLS.)

-- Atomic bump-and-check. Increments the minute + hour buckets and returns the
-- limited window ('minute' | 'hour') or NULL when the request is within caps.
create or replace function public.concierge_ip_bump(
  p_ip         text,
  p_min_bucket text,
  p_hr_bucket  text,
  p_min_cap    integer,
  p_hr_cap     integer
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min integer;
  v_hr  integer;
begin
  insert into public.concierge_ip_rate (ip, bucket, count, expires_at)
    values (p_ip, p_min_bucket, 1, now() + interval '2 minutes')
    on conflict (ip, bucket) do update set count = public.concierge_ip_rate.count + 1
    returning count into v_min;

  insert into public.concierge_ip_rate (ip, bucket, count, expires_at)
    values (p_ip, p_hr_bucket, 1, now() + interval '70 minutes')
    on conflict (ip, bucket) do update set count = public.concierge_ip_rate.count + 1
    returning count into v_hr;

  if v_min > p_min_cap then return 'minute'; end if;
  if v_hr  > p_hr_cap  then return 'hour';   end if;
  return null;
end;
$$;

revoke all on function public.concierge_ip_bump(text, text, text, integer, integer) from public;
grant execute on function public.concierge_ip_bump(text, text, text, integer, integer) to service_role;

-- Optional cleanup of stale buckets (schedule via pg_cron or a daily job):
--   delete from public.concierge_ip_rate where expires_at < now();
