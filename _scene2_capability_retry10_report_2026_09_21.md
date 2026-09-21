# Scene 2 Capability Retry #10 (2026-09-21)

Authorized scope: same Boundary input, real calls from Submit onward, planner
chain Grok primary → ministral-8b-2512 fallback → gpt-4o terminal, tier-log
cross-checking harness, all six standing continuity/canon/schema fixes
active, $0.45 / ≤8-physical-request ceiling, no follow-up retry on failure.

## Result: ZERO capability evidence — blocked by a local infra fault, not the app

Both real dispatch rounds (2 rounds × 3 tiers = 6 calls) for the scene
planner returned **502 `NO_RESPONSE_FROM_FUNCTION`** — identical across
Grok, Mistral, and OpenAI proxies, exactly as in the prior (retry 6-8)
incident. This time the cause was traced to a **different, more specific**
root: the live `vercel dev` server log (`/private/tmp/vercel_dev_fresh.log`,
the actively-running parent process, PID 24065, uptime since last
Wednesday) shows a burst of 95 `Error: spawn EBADF` lines landing exactly
between the successful replayed phase-1/phase-2 calls and the first failed
scene-planner attempt.

`EBADF` is an OS-level bad-file-descriptor error — the `vercel dev` parent
process itself failed to spawn a child handler process for the incoming
function invocation, independent of which serverless function
(`/api/proxy`, `/api/mistral-proxy`, `/api/chatgpt-proxy`) was being
invoked. This is why all three providers failed identically: the fault is
upstream of any provider-specific code path, in the local dev harness's
process-spawning layer.

**This is a different failure mode from the retry 6-8 incident** (155
leaked stale `@vercel/node/dist/dev-server.mjs` child processes). This
time, `ps aux` showed only 6 dev-server children, all freshly spawned
(~1 minute old, ~1.3s CPU time each) for this exact request — not stale
leakage. The likely cause here is the **parent process's own file
descriptor table** becoming exhausted or corrupted after several days of
continuous uptime, not child-process accumulation. Not confirmed further
this pass — no destructive or corrective action taken beyond read-only log
inspection, per "do not run follow-up retries if this one fails."

## Evaluation against the five authorized questions

1-5. **Not answerable.** The author call never ran; the planner never
produced a single reply this pass. Both real dispatch rounds died in the
network layer before any model returned content. No plan, no reserved-key
compliance, no gate evaluation, no prose — nothing about the planner's
actual behavior was tested. The reserved-schema hardening, the required
scene function frame, the planner function gate, and the terminal tier
are all still unproven against a live 200 response.

## Cost

$0 spent. Both replayed phases (opener, OAS reply, Fate card) cost $0 as
designed. All 6 real scene-planner dispatch attempts returned 502 with no
usage block — no provider billed a failed request.

## Artifacts (preserved, non-destructive to prior fixtures)

- `_scene2_repair_replay_sample_out/run_1789966803033.jsonl` — full raw
  request/response log for this run.
- `_scene2_repair_replay_sample_out/report_retry10.json`,
  `console_tail_retry10.txt`, `partial_tracked_calls_retry10.json` — this
  run's outputs, extracted to distinct filenames. The fixed-name files
  (`report.json`, `console_tail.txt`, `partial_tracked_calls.json`,
  `scene2_raw_response.txt`) were confirmed clean via `git status` before
  the run, restored via `git checkout --` immediately after (verified
  clean again afterward) — they still hold retry 9's committed content and
  remain valid red fixtures for `_scene2_reserved_schema_control.mjs` and
  the other dry controls.
- `scene2_raw_response.txt` was **not** touched this run — the author call
  never received a 200, so no raw author response ever existed to write.

## Honest classification

Per the standing rule to classify results as capability evidence, not
approved prose: **this run produced no capability evidence at all**, in
either direction. It is neither a pass nor a fail of the reserved-schema
hardening or any other fix built this session — it is a local
infrastructure fault that pre-empted the app entirely. The six fixes
built and dry-proven across this session (continuity/canon, Grok-primary
routing, required scene function, planner function gate, terminal tier,
reserved-schema hardening) remain dry-proven only; none has yet been
confirmed against a live 200 response end-to-end.

## Recommendation (not actioned — requires separate authorization)

The most likely fix is restarting the `vercel dev` parent process itself
(PID 24065), not just cleaning up child processes as before — this is a
more invasive action than the prior cleanup since it means stopping the
currently-listening server, and was not in scope for this retry's
authorization. No such restart was performed. If a further retry is
wanted, restarting the dev server first (and confirming `localhost:3000`
still serves correctly afterward) would need explicit authorization,
distinct from "run another retry."

## Status

No follow-up retry run, per explicit instruction. Report written and
committed. Stopping here.
