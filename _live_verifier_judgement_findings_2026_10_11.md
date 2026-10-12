# Live run 2026-10-11 — findings, corrections, and what remains open

Run: `_fs_live_out/run_2026-10-12T02-16-25-745Z` · 7 scenes generated (2-8) · 80 calls
Spend: **$1.082838** of a $5 authorization ($0.970414 receipted, $0.111503 retained unresolved).
Ledger after: $9.142167 receipted + $1.620032 unresolved = **$10.762199**.
Pre-registered criteria: `_live_verifier_judgement_pass_criteria_2026_10_11.md`.

---

## Corrections to my own first report

Two of my conclusions were wrong and were withdrawn after checking the wire captures.

**1. I named the wrong failing layer.** I reported the Scene Scaffold as failing 14/14. In fact
`[CG:SCAFFOLD]` labels the **CONTINUITY ARCHITECT**, which owns the per-issue scene-by-scene plot:
the **Issue Spine**. It truncated 14/14 at exactly 2,000 completion tokens
(`finish_reason: "length"`). The seven **Scene Scaffolds** succeeded (1,612-1,837 tokens under a
3,800 allowance, `finish_reason: "stop"`) and their causal outlines reached all seven author
requests. The issue-outline resolver that worked well was reading the **authored** plan, which is
not evidence that live spine generation works.

**2. I invented a lexical exit-state matcher.** `MATCH=` is
`(_delivery === 'DELIVERED' ? 'PASS' : 'FAIL')` — a restatement of the aggregate label that never
compared planned to actual wording. My claim that "the two successes had per-ref statuses while the
failures didn't" was also false: **all six replies carried `per_proposal`** and none carried a
top-level `delivery`, which is why the aggregate read MISSED six times. The real discriminator was
the citation span count.

**3. Two further overclaims, withdrawn.** "The author can only caption them" does not follow — the
notice and the three restrictions could carry substantial interaction; what the capture shows is
that the author *did* caption them. And I did not rule out the screenplay framing: "No novel prose"
sits in the same request as the 700-1000 word budget, and I cited one while ignoring the other.
The weak outline is demonstrated; its share of the shortness is **not** established.

---

## Fixed

### The Issue Spine's output allowance (`_spineOutputAllowance`)
- Derived from the **schema**, never the serving model's identity. The old rule gave 2,000 tokens
  for the whole schema unless the model was opus/grok/haiku.
- Priced **per row × issues**, because a literary issue asks for 20 rows where CG asks for 10
  (`ISSUE_PRICING.scenesPerIssue`). A first pass priced per *issue* and would have under-funded
  literary by half — the same bug wearing a different number.
- Constants set by `_spine_contract_preflight.mjs`, which builds a reply filling the **complete**
  response contract and solves for them. They are **estimates** and say so (`isEstimate: true`);
  no tokenizer was consulted.
- A clamp is **logged** at request time. Silent clamping is what hid the original defect.

### One doomed spine request per turn, not two
The in-flight guard shares a *concurrent* generation only. After a failure `s.cgScaffold` stayed
unset, so the next consumer in the same turn re-dispatched an identically doomed request: 14 calls
across 7 scenes. A failure is now remembered for its turn; a later turn still retries.

### Citation defects are unverified, never proof of absence
`_hasUsableEvidence` bounds arrays at 4, so a 5-span array was indistinguishable from a missing
field. Two DELIVERED verdicts were discarded on that basis and one was recorded as proof "the event
could not have happened".
- `_evidenceDefect` separates `missing` / `too_short` / `over_limit` / `malformed`.
- **No defect class establishes absence or impossibility.** My first repair still allowed `""` and
  `"No"` to license the absence claim; it no longer does. The per-proposal downgrade reports
  `precondition_unverified` for every class.
- `[SLOT-CHECK]` prints `OVER-LIMIT(n)` / `MALFORMED` / `TOO-SHORT` / `NONE`; the
  `IMPOSSIBLE-EVENT: PLANNER error` line is gone, replaced by an explicit "the reply did not
  support it; NOT a finding that it was absent".
- **Nothing is weakened**: every value unusable before is still unusable and still commits nothing.

### Contract cleanup
- The watch-evidence instructions contradicted themselves and the engine: the two schemas offered
  "an ARRAY of up to 4 such substrings" while a later line said "never an array, never several
  spans", and `_evOk` accepts arrays. Reconciled to the engine's rule, which is what validates.
- The slot-check parenthetical "(Empty precondition_evidence means the event was IMPOSSIBLE)" —
  the wording that seeded the overstatement — now says the precondition is UNVERIFIED and that
  only the verifier stating absence in `reason` makes it a finding.

### Format and causal specification, reconciled rather than appended to
- **Author.** "No novel prose" now says what it governs: the delivery FORMAT. Screenplay-native
  means staged beats rather than novelistic interiority, and explicitly **not** a thin scene. Both
  failure directions are named: literary prose cut into beats, and an outline rendered as captions.
- **Scene Scaffold.** A development must **change what is possible next**; `therefore`/`but`
  describe a causal relation and do not create one. **Restatement is not development** — the
  measured failure, with the four real restatements quoted from the run. The requested count is a
  consequence of a developed encounter, not a quota to fill. No word-count or keyword gate was
  added; player ownership of the unresolved choice is preserved.

Both new blocks were verified present in the **intercepted outgoing requests**
(`_audit_out/outline_v2/REAL_cg_scaffold_request.txt`, `REAL_cg_author_request.txt`), not only in
source.

---

## Open, explicitly unresolved

**1. A wrong history judgement was accepted.** Asked whether `prereq:investigation_open`
("Lirael's conduct at the rite is under investigation and she is restricted") still held, the
verifier returned `invalidated_on_page`, citing the Dohkar's line that **establishes** the review,
with `scope: "Lirael is now under formal restrictions"`. The acceptance gate
(`!stale && status === 'invalidated_on_page' && evidence verifies && participants && scope`) checks
that the reply is well formed and its quotation real; **none of it checks that the quotation
supports the verdict.** Accepted, and two planned rows went to `overturned` for the rest of the run.
Not patched: a verbatim citation proves the quotation exists, not that the conclusion follows, and a
keyword test would swap one unreliable judgement for another.

**2. The complete contract does not fit one reply at the largest tier.** `literary/soulmates`
(5 issues × 20 rows) needs ~33,025 tokens against a 32,000 bound. The allowance formula cannot fix
this; either the spine is generated **per issue** or the per-row contract sheds optional blocks.
Reported by the preflight and warned about in production at request time.

**3. Scene length and the screenplay framing.** Seven scenes at ~161/214/209/171/209/208/189 words
(~194 average, speaker labels included). The author produced ~16.9 KB of JSON per scene of which
~1,107 chars were beat prose (~7%); the rest is `phases`, `visualState`, `microDecision`, kink
fields, `panels`, `history_note`. The outline defect is demonstrated; **how much of the shortness it
explains is not.** The format instructions have been reconciled, and whether that changes the output
is unmeasured.

**4. Unchanged from before this run.** Live verifier judgement under the expanded contract remains
only partly characterised; no immediate invalidation hook on literary page edits; replay /
legacy-load / baked-opening mounts record other ledger kinds, so scenes mounted only through those
report UNAVAILABLE and commit nothing; pre-existing ANCHOR DRIFT in
`_stage_fact_participant_attribution_control.mjs`; eleven drafted story outcomes still quarantined.

---

## Controls (all provider-free, $0)

| control | result |
|---|---|
| `_evidence_path_control` | 23/23 (was 12/12) |
| `_spine_contract_preflight` | 11/11 (new) |
| `_verifier_contract_preflight` | 29/29 |
| `_history_chain_control` | 194/194 |
| `_two_turn_ownership_control` | 15/15 |
| `_commit_replay_control` | 15/15 |
| `_commit_integrity_control` | 30/30 |
| `_issue_outline_control` | 45/45 |
| `_outline_delivery_control` | 76/76 |
| `_issue_boundary_control` | 80/80 |
| `_scene_brief_control` | 10/10 |

No provider call was made for any of the repairs or checks above.
