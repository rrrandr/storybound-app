# Paid run — 2026-09-23, Scene A only, `remain` branch — DELIVERED BUT COMMITTED NOTHING

**These are the RAW artifacts, copied byte-for-byte from the run's own output directory.** Unlike
`../scene_a_failed_2026_09_23.json` — which is a reconstruction from verbatim quotes because its
originals were destroyed — everything in this directory is the real captured material. They are
committed here precisely so the next run cannot delete them: the live script writes to
`_tempt_fate_memory_erasure_live_run_out/`, which it clears on every run.

## What this run was

Authorized: thirteenth-revision sheet, Scene A only, `remain` branch, additional hard cap $0.20,
stop unconditionally after Scene A, no Scene B, no images, no automated semantic approval.

## What happened

Scene A **delivered** (2338 chars of prose) and prompt parity held — the planner and the author both
received `ACTIVE INVOCATION THIS SCENE`, and the author received no historical `MEMORY CALLBACK`.
**Nothing committed:**

```
[TEMPT-OUTCOME] scene 1 report invalid, no commit: delivered:true but requestedScope missing …
deliveredScope missing … scopeMatch must be … ruptureClass must be …
```

The cause was a code defect, not a model failure: the scope and rupture-class fields had been added
to a schema builder that no prompt ever called, while the validator was changed to require them. The
author was rejected for omitting fields it was never asked for. That defect is what the outcome
contract descriptor and the zero-cost preflight invariant now exist to make structurally impossible.

**So this run carries no durable outcome record and no declared rupture class.** `outcome_record.json`
shows `durableConsequences: []`. That absence is the evidence.

## Accounting

- 7 of 33 permitted requests (Scene A 6 of 32, wish classifier 1 of 1)
- **$0.114544** of the $0.20 run cap
- zero real image dispatches
- clean `safeExit`

## Files

| File | What it is |
|---|---|
| `scene_a_rendered_text.txt` | the rendered prose |
| `scene_a_raw_output.txt` | the author's raw JSON response |
| `scene_a_system_prompt.txt`, `scene_a_user_prompt.txt` | the author's prompts |
| `scene_a_planner_requests.json`, `scene_a_author_requests.json`, `scene_a_other_requests.json` | full request bodies by layer |
| `scene_a_tracked_calls.json` | per-call model, status, usage, cost |
| `outcome_record.json` | the (empty) durable record + the owned proposal |
| `report.json` | structural summary, cap accounting, costs |
| `run_*.jsonl` | the complete persisted request/response log |
