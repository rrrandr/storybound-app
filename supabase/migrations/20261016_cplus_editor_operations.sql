-- ── DURABLE ADMISSION AND SETTLEMENT FOR THE CHARACTER+ EDITOR ──────────────────────────────
-- (Roman 2026-10-16)
--
-- The spending protection used during the bounded experiments lived in a browser module: a
-- position counter, a per-tab allowance and a boolean flag. A reload reset it, a second tab
-- doubled it, and the reader's own devtools could change it. This table is what replaces it.
--
-- TWO PROPERTIES THIS FILE EXISTS FOR, and the first version had only one of them:
--
--  1. IDEMPOTENCY — operation_id is the primary key and is deterministic
--     (cplus-editor:<account>:<story>:scene<n>:<draft revision>), so a reload, a retried host
--     request or a second tab mints the SAME id, loses the insert, and replays the winner's row
--     instead of buying a second pass. A regenerated scene is a different revision, so it gets
--     its own pass.
--
--  2. AN ATOMIC ACCOUNT QUOTA — the route used to COUNT recent operations and then SEPARATELY
--     insert the reservation. Two requests with DIFFERENT operation ids could both see the last
--     free slot and both proceed; the unique key stopped duplicate purchases of the same
--     operation and did nothing about the account-wide cap. cplus_editor_admit() below does the
--     count and the insert inside one transaction under a per-account advisory lock, so the cap
--     is enforced across different operations and not merely against a repeat of one.
--
-- EVERY ROW IS AN AUDIT RECORD, including a priced USD reservation taken BEFORE the provider is
-- called. An unresolved call retains that amount; an exposure that disappears from the ledger is
-- an unmeasured one.

create table if not exists public.cplus_editor_operations (
  operation_id      text primary key,
  account_id        uuid not null references auth.users(id) on delete cascade,
  story_id          text not null,
  scene             integer not null,
  revision_id       text not null,

  -- reserved → settled | unresolved | refused. A 'reserved' row older than a few minutes is a
  -- crashed pass; it is NOT retried, and it KEEPS its reserved_usd as retained exposure.
  status            text not null default 'reserved',
  model             text not null,
  obligations       jsonb,

  -- policy as applied to THIS pass, recorded so a later price change cannot rewrite history
  price_fortunes    numeric not null default 0,
  charged_fortunes  numeric,

  -- ── THE PRICED RESERVATION, PERSISTED BEFORE FORWARDING ───────────────────────────────────
  -- The first version stored a status and a Fortune price and called that a reservation. It was
  -- not one: there was no monetary amount anywhere, so an unresolved call retained a record
  -- rather than priced exposure. This column is the amount, computed server-side from the
  -- assembled request (never from a client-supplied figure) and written before the upstream call.
  reserved_usd      numeric not null,
  retained_usd      numeric,

  -- Which kind of entitlement admitted this pass: 'authoritative' or 'registration'. Recorded
  -- per pass so the audit trail never implies verified ownership where only registration
  -- happened.
  entitlement       text check (entitlement in ('authoritative', 'registration')),

  reply             text,
  truncated         boolean default false,
  usage_in          integer,
  usage_out         integer,
  usage_reasoning   integer,
  cost_usd          numeric,
  cost_basis        text,
  http_status       integer,
  latency_ms        integer,
  refusal           text,

  created_at        timestamptz not null default now(),
  settled_at        timestamptz
);

-- ── WHO OWNS AN IN-PROGRESS STORY (Roman 2026-10-16) ───────────────────────────────────────
-- THE DEFECT THIS EXISTS FOR. The entitlement check originally read public.stories. Tracing the
-- real lifecycle showed that cannot work:
--   · `state.storyId` is minted IN THE BROWSER (crypto.randomUUID, kept in localStorage) and is
--     never the database's stories.id, which Postgres generates on insert;
--   · the app never calls POST /api/stories at all;
--   · the row the client does key on, library_entries.story_id, is written AT PUBLISH TIME
--     ("publisher must stamp when row is created" — api/claim-issue-number.js).
-- The editor runs during scene generation, before any of that. So at the moment it runs there is
-- NO pre-existing record binding the story to the account, and reading public.stories would have
-- refused every pass in production.
--
-- FIRST CLAIM WINS, AND IS THEN ENFORCED. The first admitted pass for a story id binds it to the
-- authenticated account; every later pass for that story id must come from the same account or it
-- is refused. This does not weaken anything: the JWT is still required, the account still comes
-- from the token, and a story id can never be used across accounts. What it does NOT claim is
-- that the story pre-existed — because it does not, and asserting otherwise was the error.
--
-- WHERE AN AUTHORITATIVE RECORD DOES EXIST IT WINS. If public.stories holds a row for this id and
-- it belongs to someone else, the pass is refused regardless of any claim.
create table if not exists public.cplus_editor_story_claims (
  story_id    text primary key,
  account_id  uuid not null references auth.users(id) on delete cascade,
  -- 'authoritative' = an existing ownership record named this account.
  -- 'registration'  = no record existed; a new local draft was registered on first contact.
  -- These are NOT equivalent and the column exists so nothing downstream can conflate them.
  basis       text not null default 'registration'
              check (basis in ('authoritative', 'registration')),
  claimed_at  timestamptz not null default now()
);
create index if not exists cplus_editor_story_claims_account_idx
  on public.cplus_editor_story_claims (account_id);

alter table public.cplus_editor_story_claims enable row level security;
drop policy if exists cplus_editor_story_claims_select_own on public.cplus_editor_story_claims;
create policy cplus_editor_story_claims_select_own
  on public.cplus_editor_story_claims for select
  using (auth.uid() = account_id);

create index if not exists cplus_editor_operations_account_created_idx
  on public.cplus_editor_operations (account_id, created_at desc);
create index if not exists cplus_editor_operations_story_scene_idx
  on public.cplus_editor_operations (story_id, scene);

create or replace function public.cplus_editor_stamp_settled()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status
     and new.status in ('settled', 'unresolved', 'refused')
     and new.settled_at is null then
    new.settled_at := now();
  end if;
  return new;
end $$;

drop trigger if exists cplus_editor_stamp_settled_trg on public.cplus_editor_operations;
create trigger cplus_editor_stamp_settled_trg
  before update on public.cplus_editor_operations
  for each row execute function public.cplus_editor_stamp_settled();

-- ── ATOMIC ADMISSION: ENTITLEMENT, QUOTA AND RESERVATION IN ONE TRANSACTION ─────────────────
-- Returns one row: (outcome, detail, entitlement, used_today, existing_*…).
--
--   'replay'     this operation already exists for this account — the caller returns the stored
--                outcome, INCLUDING its truncation flag and status. No new call, no new charge.
--   'mismatch'   the operation id exists under a DIFFERENT account.
--   'forbidden'  the account may not spend on this story: an authoritative record names someone
--                else, or the story id is already registered to another account.
--   'capped'     the account's 24h quota is full, counted under the lock.
--   'admitted'   the row is inserted with status 'reserved' and the priced reservation held.
--
-- `entitlement` says WHICH of two different things was established, and they are not equivalent:
--   'authoritative' — an existing ownership record names this account (story_library_versions
--                     .profile_id, the canonical completed-book mapping the issue-claim route
--                     uses; or public.stories.author_user_id).
--   'registered'    — NO ownership record exists, so this is a new local draft and the story id
--                     was REGISTERED to this account on first contact. That is registration, NOT
--                     proof of pre-existing ownership, and nothing may describe it as such.
--
-- ── TWO LOCKS, IN A FIXED ORDER ────────────────────────────────────────────────────────────
-- The first version locked only on the ACCOUNT, which does not serialize two different accounts
-- racing for the same unclaimed story id: both saw no claim, both passed entitlement, one won the
-- INSERT … ON CONFLICT DO NOTHING, and the LOSER NEVER CHECKED WHO WON and was admitted anyway.
-- So:
--   · a STORY lock serializes claim acquisition across accounts;
--   · the ACCOUNT lock still serializes that account's quota count and insert.
-- Always story-then-account, so two transactions cannot hold them in opposite order.
-- And after the upsert the claim owner is READ BACK and compared: only the confirmed owner
-- receives a reservation.
create or replace function public.cplus_editor_admit(
  p_operation_id   text,
  p_account_id     uuid,
  p_story_id       text,
  p_scene          integer,
  p_revision_id    text,
  p_model          text,
  p_obligations    jsonb,
  p_price_fortunes numeric,
  p_reserved_usd   numeric,
  p_daily_cap      integer
) returns table (
  outcome          text,
  detail           text,
  entitlement      text,
  used_today       integer,
  existing_status  text,
  existing_reply   text,
  existing_truncated boolean,
  existing_usage_in  integer,
  existing_usage_out integer,
  existing_cost_usd  numeric,
  existing_charged   numeric
) language plpgsql security definer set search_path = public as $$
declare
  v_existing public.cplus_editor_operations;
  v_count    integer;
  v_owner    uuid;
  v_claim    uuid;
  v_basis    text;
  v_claim_basis text;
  v_auth     boolean := false;
begin
  if p_account_id is null then
    return query select 'forbidden'::text, 'no account'::text, null::text, 0,
      null::text, null::text, null::boolean, null::integer, null::integer, null::numeric, null::numeric;
    return;
  end if;

  -- ── FAST PATH ONLY. NOT THE IDEMPOTENCY CHECK. ──────────────────────────────────────────
  -- A replay that is already visible here skips the locks entirely. This CANNOT be the only
  -- check: two identical requests can both miss it, and then the second one — after waiting for
  -- the locks — would fall through to the quota or to a duplicate-key error instead of replaying.
  -- The authoritative check is repeated AFTER the locks below.
  select * into v_existing from public.cplus_editor_operations
    where operation_id = p_operation_id;
  if found then
    if v_existing.account_id <> p_account_id then
      return query select 'mismatch'::text, 'operation belongs to another account'::text,
        null::text, 0,
        null::text, null::text, null::boolean, null::integer, null::integer, null::numeric, null::numeric;
      return;
    end if;
    return query select 'replay'::text, v_existing.refusal, null::text, 0, v_existing.status,
      v_existing.reply, coalesce(v_existing.truncated, false), v_existing.usage_in,
      v_existing.usage_out, v_existing.cost_usd, v_existing.charged_fortunes;
    return;
  end if;

  -- LOCK 1: the story. Serializes claim acquisition ACROSS accounts.
  perform pg_advisory_xact_lock(hashtextextended('cplus-story:' || p_story_id, 0));
  -- LOCK 2: the account. Serializes this account's quota count and insert.
  perform pg_advisory_xact_lock(hashtextextended('cplus-acct:' || p_account_id::text, 0));

  -- ── THE AUTHORITATIVE IDEMPOTENCY CHECK, AFTER THE LOCKS ─────────────────────────────────
  -- Whoever waited here must converge on REPLAY. Without this recheck the loser of the race for
  -- the locks would continue as if it were a first admission and either be refused by the quota
  -- or collide with the primary key — the key would still prevent a double purchase, but the
  -- promised duplicate/reload behaviour would be broken.
  select * into v_existing from public.cplus_editor_operations
    where operation_id = p_operation_id;
  if found then
    if v_existing.account_id <> p_account_id then
      return query select 'mismatch'::text, 'operation belongs to another account'::text,
        null::text, 0,
        null::text, null::text, null::boolean, null::integer, null::integer, null::numeric, null::numeric;
      return;
    end if;
    return query select 'replay'::text, v_existing.refusal, null::text, 0, v_existing.status,
      v_existing.reply, coalesce(v_existing.truncated, false), v_existing.usage_in,
      v_existing.usage_out, v_existing.cost_usd, v_existing.charged_fortunes;
    return;
  end if;

  -- ── AUTHORITATIVE OWNERSHIP, where a record exists ───────────────────────────────────────
  -- story_library_versions is the canonical completed-book mapping (id = the client's story id,
  -- profile_id = owner), as defined by the deployed completed-book schema. public.stories is also
  -- consulted; the app does not write it, but a row there is still authoritative if present.
  -- Looked up through to_regclass so a deployment missing either table does not error.
  -- The comparison is ::text on both sides: an uncast uuid = text comparison RAISES on a
  -- non-uuid client id, which would turn every pass into a 500 instead of a decision.
  if to_regclass('public.story_library_versions') is not null then
    execute 'select profile_id from public.story_library_versions where id::text = $1'
      into v_owner using p_story_id;
  end if;
  if v_owner is null and to_regclass('public.stories') is not null then
    execute 'select author_user_id from public.stories where id::text = $1'
      into v_owner using p_story_id;
  end if;

  if v_owner is not null then
    v_auth := true;
    if v_owner <> p_account_id then
      return query select 'forbidden'::text,
        'an existing ownership record names another account'::text, 'authoritative'::text, 0,
        null::text, null::text, null::boolean, null::integer, null::integer, null::numeric, null::numeric;
      return;
    end if;
  end if;

  -- ── CLAIM INSPECTION — READ ONLY. NOTHING IS WRITTEN YET. ────────────────────────────────
  -- The claim used to be inserted here, BEFORE the quota check, so a capped request registered a
  -- story it was never admitted for. Reading first keeps both tables untouched on a refusal; the
  -- story lock makes read-then-write atomic for this story id.
  v_basis := case when v_auth then 'authoritative' else 'registration' end;
  select account_id, basis into v_claim, v_claim_basis
    from public.cplus_editor_story_claims where story_id = p_story_id;
  if v_claim is not null and v_claim <> p_account_id and not v_auth then
    -- Someone else registered this id and we have no ownership record to outrank it.
    return query select 'forbidden'::text,
      'this story id is registered to another account'::text, 'registration'::text, 0,
      null::text, null::text, null::boolean, null::integer, null::integer, null::numeric, null::numeric;
    return;
  end if;

  -- ── QUOTA, under the account lock, BEFORE ANY WRITE ──────────────────────────────────────
  select count(*)::integer into v_count from public.cplus_editor_operations
    where account_id = p_account_id and created_at >= now() - interval '24 hours';
  if v_count >= p_daily_cap then
    return query select 'capped'::text,
      format('%s passes in the last 24h; the cap is %s', v_count, p_daily_cap),
      v_basis, v_count,
      null::text, null::text, null::boolean, null::integer, null::integer, null::numeric, null::numeric;
    return;
  end if;

  -- ── NOW ACQUIRE OR RECOVER THE CLAIM, then CONFIRM it is ours ───────────────────────────
  -- Only reached when this pass is actually being admitted.
  if v_claim is null then
    insert into public.cplus_editor_story_claims (story_id, account_id, basis)
    values (p_story_id, p_account_id, v_basis)
    on conflict (story_id) do nothing;
  elsif v_auth and (v_claim <> p_account_id or v_claim_basis <> 'authoritative') then
    -- A proven owner outranks an earlier registration.
    update public.cplus_editor_story_claims
      set account_id = p_account_id, basis = 'authoritative', claimed_at = now()
      where story_id = p_story_id;
  end if;

  -- The confirmation stays, as the belt behind the story lock: whoever does not hold the claim
  -- cannot reach the reservation below.
  select account_id into v_claim from public.cplus_editor_story_claims
    where story_id = p_story_id;
  if v_claim is null or v_claim <> p_account_id then
    return query select 'forbidden'::text,
      'this story id is registered to another account'::text, 'registration'::text, 0,
      null::text, null::text, null::boolean, null::integer, null::integer, null::numeric, null::numeric;
    return;
  end if;

  insert into public.cplus_editor_operations (
    operation_id, account_id, story_id, scene, revision_id, status, model, obligations,
    price_fortunes, reserved_usd, entitlement)
  values (p_operation_id, p_account_id, p_story_id, p_scene, p_revision_id, 'reserved', p_model,
    p_obligations, coalesce(p_price_fortunes, 0), p_reserved_usd, v_basis);

  return query select 'admitted'::text, null::text, v_basis, v_count,
    null::text, null::text, null::boolean, null::integer, null::integer, null::numeric, null::numeric;
end $$;

-- ── THE MIGRATION GRANTS WHAT THE HANDLER NEEDS. IT IS SELF-CONTAINED. ─────────────────────
-- An earlier version revoked client execution and said nothing about the service role, which the
-- route connects as. The verification had to grant it separately in test setup — i.e. the test
-- was proving a permission the migration did not actually create, and activation would have hit
-- `admission_unavailable` on the first pass. Nothing is left as a manual step.
revoke all on function public.cplus_editor_admit(text, uuid, text, integer, text, text, jsonb,
  numeric, numeric, integer) from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.cplus_editor_admit(text, uuid, text, integer, '
      || 'text, text, jsonb, numeric, numeric, integer) to service_role';
    -- The handler reads nothing directly but UPDATEs the row to settle it, so it needs update and
    -- select on the operations table. The claim table is written only inside the function, which
    -- is SECURITY DEFINER, so no direct grant is needed there.
    execute 'grant select, insert, update on public.cplus_editor_operations to service_role';
  end if;
end $$;

-- ── RLS ─────────────────────────────────────────────────────────────────────────────────────
-- The route writes with the service-role key, which bypasses RLS. The policy below exists so a
-- reader can see their own passes and nobody else's if the table is ever read with a user token.
-- There is deliberately NO insert, update or delete policy: only the server writes here.
alter table public.cplus_editor_operations enable row level security;

drop policy if exists cplus_editor_operations_select_own on public.cplus_editor_operations;
create policy cplus_editor_operations_select_own
  on public.cplus_editor_operations for select
  using (auth.uid() = account_id);
