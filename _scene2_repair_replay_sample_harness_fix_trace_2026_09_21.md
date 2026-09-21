# Replay Harness Accounting/Correlation Fix (2026-09-21)

Roman, after retry 15: "The caveat is the harness bug. The system underreported cost and falsely
thought the author never settled, even though the raw log had the response. That must be fixed
before more paid testing, because otherwise you can't trust the run summaries." Dry work only, no
provider calls, no image calls, no story retry, no forks. Retry 15's real prose was not touched.

## 1. What happened

Retry #15's real author call genuinely settled with a 200 response and real content — confirmed
independently by the app's own browser console (`[CG:SCREENPLAY] generated via
grok/grok-4-1-fast-reasoning`) and by the raw persisted network log, which contains the complete
response body. `_scene2_repair_replay_sample.mjs`'s own in-memory tracking nonetheless recorded
`status: null, "no usage block returned"` for that call and exited via its "never settled" path.
Consequences: `scene2_raw_response.txt` was never written automatically, and the script's own
reported cost ($0.0108684) badly undercounted the real spend.

Recovering the real content (done manually, in the original retry 15 report) and then building the
regression control for this fix (below) surfaced that the undercount was worse than first found:
**two additional real calls** that same run — a ministral-8b-2512 call ($0.0006303) and a gpt-4o
call ($0.0399175) — were ALSO missed by the identical gap. Fully corrected total for retry 15:
**$0.13614335** (4 real calls: planner + author + those two), not the $0.0955956 first reported.
`_scene2_capability_retry15_report_2026_09_21.md` was corrected to this figure.

## 2. Root cause

`_e2e_network_gate.mjs`'s `page.on('response', ...)` and `page.on('requestfailed', ...)` handlers
correlated an incoming response to its dispatch record by **URL string alone**
(`r.url === response.url()`), picking the "most recently dispatched, still-unsettled" record for
that URL — a LIFO heuristic. Multiple requests to the same URL (e.g. `/api/proxy`, used by both
the scene-spine planner and the Scene 2 author, plus any tiered fallback attempts) are routinely in
flight concurrently in the real flow this script exercises. When their responses arrive out of
dispatch order, this heuristic can attribute a response to the wrong tracked record, leaving the
true originating dispatch permanently unsettled even though its own real response genuinely
arrived — exactly the retry 15 symptom.

## 3. Fix — two independent layers

### Layer 1: `_e2e_network_gate.mjs` — correlate by request identity, not URL

Both handlers now match by Playwright's own request-object identity: the exact `route.request()`
object captured at dispatch time is stored on the tracked record (`rec.request`), and
`response.request()` / the failed `request` object are compared against it directly
(`r.request === response.request()`). This is unambiguous regardless of how many concurrent
same-URL requests are in flight or what order their responses arrive in — no ordering assumption
required. The old URL-based match is kept as a secondary fallback (for the rare case a redirect
chain creates a new Request object), not the primary discriminator.

This fixes the shared harness layer used by every real-browser control in the repo, not just this
one script.

### Layer 2: `_scene2_repair_replay_sample.mjs` — persisted-log reconciliation as a safety net

Independent of Layer 1, the script now cross-checks its OWN persisted JSONL log before ever
concluding "never settled." That log is the one guaranteed-complete record — every dispatch and
every response is appended the instant it is observed, regardless of in-memory correlation. A new
`reconcileFromPersistedLog(roleTag)` re-derives dispatch/response pairs directly from the file
(FIFO within each URL — the order responses are actually observed to arrive in) and, if it finds a
real, settled author record the in-memory view missed, uses THAT record — and its real cost —
instead of giving up. This is deliberately a second, independent line of defense: even if some
other correlation gap Layer 1 doesn't cover ever recurs, the persisted log — which cannot lie about
what actually happened — is checked before the script ever declares defeat.

## 4. Proof — 11/11, new `_e2e_network_gate_response_correlation_control.mjs`

- **A (synthetic race)** — two concurrent real-lane requests to the same stubbed URL, deliberately
  resolved OUT OF dispatch order (the first-dispatched request's response arrives second). Both
  settle with their own distinct content — never swapped — proving Layer 1's general correctness
  deterministically, not just for this one incident.
- **B (real log reconciliation)** — retry 15's actual, unmodified persisted log, read verbatim,
  fed through the same reconciliation logic Layer 2 added. Confirms it correctly identifies the
  real author response (status 200, real usage block matching the app's own console log,
  `prompt_tokens: 54721`), computes its real cost (~$0.0847), finds ALL 4 real calls that run (not
  just 2), and the combined total matches the fully corrected $0.13614335 figure exactly.

## 5. Status

Dry, committed, generic (Layer 1 benefits every real-browser control using this gate). No provider
or image calls. No story retry. Retry 15's real captured prose was NOT touched — only its report's
cost figure and status language were corrected, twice, each time because a subsequent, more
rigorous check (the regression control itself) found a more complete answer than the one before it.
