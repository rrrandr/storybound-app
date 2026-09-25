# Correction to this run's PRINTED summary

`report.json` and the console output of this run are preserved UNEDITED. Three lines in that
printed summary were wrong, produced by defects in the summariser, not by anything the run did.
They are corrected here rather than rewritten there, so the original artefact stays honest.

| Printed | Correct |
|---|---|
| `usable responses : 7/8` | **0/8.** One fixture was dispatched and refused; seven were never dispatched. `usableResponses` subtracted only unavailable+invalid, not skipped, so it counted seven never-sent requests as usable. |
| `RESULT: INFRASTRUCTURE-INCONCLUSIVE — the local function layer failed` | **PROVIDER-INCONCLUSIVE.** The local function layer worked correctly and faithfully relayed Mistral's real HTTP 429. `infrastructureInconclusive` fired on `skipped.length > 0` alone, assuming only the infra fail-fast ever skips — the canary and rate-limit stops skip too. |
| `7 NOT DISPATCHED — run stopped on the local function layer` | **Stopped on a PROVIDER rate limit.** Same wrong attribution; the per-fixture skip note also hardcoded "local function-layer failures". |

Also corrected in the code: in canary mode a single 429 is now decisive (`rateLimitStopAfter: 1`),
so the operational verdict prints instead of falling through to the infrastructure branch.

All four fixes are dry-proven in `_canon_audit_calibration_dry_proof.mjs` (79/79) against this
run's exact row shape, including the converse — a genuine 502 run is still reported as
infrastructure-inconclusive.

**None of this changes the outcome:** one dispatch, refused 429/1300, **$0.000000 realized**,
provider published no reset or limit headers.
