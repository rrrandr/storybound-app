# Pre-registered pass criteria — live verifier judgement under the expanded contract

> **Registered 2026-10-11, BEFORE any provider call of this run.**
> Authorization: explicit go from Roman, **$5 of new spend**. Prior ledger exposure
> $9.67936137, so the runner ceiling is set to $14.67936137 and this run can add at most $5.
> The verdict is fixed here so it cannot drift after the output is read.

**What is being tested:** whether a REAL model, serving as the RUNTIME COMMIT verifier, can
discharge the **expanded** per-slot evidence contract against **real generated prose** — and
whether its verdict is actually supported by the prose it was given.

**What is NOT being tested:** prose quality. Scene quality is observed and reported, never scored
as pass/fail here. A run may produce weak prose and still pass.

---

## V1 — The expanded contract is populated, not stubbed
The verifier reply carries `precondition_evidence`, `actor_evidence`, `action_evidence`,
`target_evidence`, `exit_state_evidence` as **non-empty** fields on each per-proposal entry.

| verdict | |
|---|---|
| **PASS** | every per-proposal entry returned for a judged proposal carries all five fields non-empty |
| **FAIL** | any field empty, omitted, or filled with a restatement of the proposal rather than the prose |

## V2 — Every quote is verbatim from the prose it judged
Each evidence string is checked **mechanically** as a substring of the scene text the verifier was
given (whitespace-normalised). This is the check the constructed two-turn fixture could only assert
about itself.

| verdict | |
|---|---|
| **PASS** | all five evidence strings are verbatim substrings of the submitted unit's prose |
| **FAIL** | any fabricated, paraphrased, or cross-scene quote |

> A quote drawn from a DIFFERENT scene than the bound unit is the specific failure to watch for.

## V3 — The verdict matches the prose
Read the scene; decide independently whether the proposed transition actually occurred in it.
Compare to the verifier's `delivery`.

| verdict | |
|---|---|
| **PASS** | DELIVERED only where the prose shows the transition; MISSED/other where it does not |
| **FAIL** | a DELIVERED whose transition the prose does not show, or a MISSED the prose plainly delivers |

> **Scored by reading, before looking at the label.** My reading is recorded first.

## V4 — A rejected delivery writes nothing
On any non-DELIVERED verdict, committed facts are unchanged and pending intent is preserved.

| verdict | |
|---|---|
| **PASS** | `facts_before == facts_after` and pendingIntent retained on every rejection |
| **FAIL** | any fact committed against a rejected delivery |

---

## Secondary observation — the live spine and per-issue outlines (NOT pass/fail)
Recorded, not scored: whether `_resolveIssueOutline` reports `covered` rows carrying real
prerequisites / routes / cliffhanger content for the issue window, and whether that content
reaches the scaffold request on a live run. A reported `ABSENT`/`UNREACHABLE` is a RESULT here,
not a failure to repair mid-run.

## Tertiary observation — writing quality (NOT pass/fail)
Scenes are kept for reading. The known intrinsic stall (~scene 4-6) is the region of interest.
No scoring, no repair, no rerun on the basis of quality.

---

## Conditions, fixed here

- **Ceiling $14.67936137 total** = prior $9.67936137 + **$5 authorized now**. The runner reserves
  before dispatch and halts rather than exceed it.
- **One upstream attempt per stage; no deliberate provider breakage.** Fallback is observed if it
  happens naturally, never induced.
- **Images BLOCKED. Entitlement/payment SIMULATED.** Scene 1 is the FIXED hand-authored opening and
  generates nothing, so no paid Scene 1 is produced (the CG-census block stands).
- **Results are reported BEFORE any fix or rerun.** A truncated or invalid response is a reported
  result, not permission to repair it.
- **The real ledger `_fs_live_out/BUDGET.json` is authoritative**; unresolved exposure is retained,
  never forgiven.
