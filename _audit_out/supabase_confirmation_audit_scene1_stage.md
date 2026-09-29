# SUPABASE READ-ONLY CONFIRMATION AUDIT — unseeded Scene-1 stage fatal, production exposure since 2026-08-30 · 2026-09-07

Authorized scope: read-only, aggregates only, existing credentials used in-process (never printed), no writes, no
provider calls, no code changes. Identity check: the local `SUPABASE_URL` host equals the host the live site's public
`/api/config` returns (same prefix `riut…supabase.co`) — the queries below ran against the production project.
Cutoff = 2026-08-30 16:00 UTC (first production deployment carrying commit `c8d08fc`).

## 1 · Schema / discriminator availability
| table | present | columns relevant here | verdict |
|---|---|---|---|
| `fortune_operations` | yes | `operation_id, user_id, amount, context, story_id, status, balance_after, created_at` | has the fields to pair a purchase with a `refund_issue` row — but see §2: it is empty all-time |
| `story_snapshots` | yes | `story_id, turn_count, updated_at, snapshot(jsonb)` — starter id / fateMode / page uids read from JSON paths only | sufficient to classify entry form and count saved pages without prose |
| `library_entries` | yes | `story_id, scene_count, render_mode, world, created_at` | sufficient for counterexamples |
| `user_events` | yes | `event_type, created_at` (metadata not read) | the older client-side collector (direct insert from `app.js`) |
| `beta_events` | **absent** (PostgREST `PGRST205`, hint offers `user_events`) | — | the newer collector (`/api/beta-events`, added 2026-07-09) has never had a table; its inserts fail in production |

## 2 · Purchase → refund pairing (the abort's server-visible signature)
- `fortune_operations` rows since cutoff: **0**. All-time: **0**. Purchases are executed by the `consume_fortunes_v3`
  RPC against `profiles` and are not journaled here; the refund endpoint is the only writer of this table and has
  never written a row. ⇒ **The refund discriminator does not exist in production data** — inconclusive on this
  axis by construction, not by absence of events.

## 3 · Counterexamples (unseeded / no-starter stories that reached a saved page)
- `story_snapshots` updated since cutoff: **0**. `library_entries` created since cutoff: **0** (all-time 0).
- All-time snapshots: **5** (2026-02-15, 02-18, 02-26, 03-07, 07-24), every one unseeded (no starter id, no Famous
  Fate flag), `turn_count 0`, 1–2 saved pages. These are pre-rule successes of unseeded Scene 1 — evidence that the
  path worked before `c8d08fc`, **not** counterexamples for the current code.

## 4 · Any production activity at all since the cutoff
- `user_events` since cutoff: **0**. Latest event of any kind: **2026-08-09** (`issue_purchase`, `story_mode_selected`,
  `story_started` ×2). Since 2026-07-24 the whole table holds 16 events across 2 days (07-26, 08-09). All-time
  mix: story_started 216, fortune_spent 211, story_mode_selected 210, issue_purchase 147, petition_opened 87,
  fate_used 70, preview_slice_purchase 22, petition_submitted 18, scene_3_reached 16, scene_6_reached 3.
- `profiles`: 25 all-time; latest created 2026-07-04; latest `last_seen_date` 2026-07-07.
- Caveat on "no activity": the newer telemetry endpoint has been dropping events since 2026-07-09 (missing table),
  so silence in `beta_events` proves nothing; but `user_events` (direct client insert), snapshots, library entries
  and the refund ledger are independent of that defect and are all silent after 2026-08-09 / 07-24.

## 5 · Conclusion
- **Exposure: none recorded.** Every durable production record is silent since 2026-08-30 — no story attempt, no
  purchase event, no snapshot, no library entry. The unseeded Scene-1 abort has not affected a recorded production
  reader because none has started a story since the rule shipped.
- **Confirmation of the behavior: inconclusive.** There is no post-cutoff success (counterexample) and no
  post-cutoff failure signature; and the refund ledger cannot carry the signature at all. Dry reproduction under
  shape-faithful fixtures plus the committed-code reading remain the evidence.
- **Two unrelated defects surfaced, not repaired:** `public.beta_events` does not exist (all Beta Observatory
  telemetry since 2026-07-09 dropped); `fortune_operations` has never received a row, so refunds are not journaled
  and the wallet has no operation ledger to reconcile against.
No writes, migrations, user changes, provider calls or code changes were made; no identities, prose or payloads
were retrieved beyond JSON path fields for classification (starter id, fate mode, page-uid count, render mode).
