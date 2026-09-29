# STAGE 0 RESULT — preprocessor comparison, Ministral 8B vs 14B (2026-09-05)

Authorized: 8B vs 14B, 3 samples each, $0.10 ceiling. Run against `main` @ `d41dc35` with the two
`_drafts/` patches applied to the working tree for the duration and **reverted afterwards**.
Harness: `_planner_probe3.mjs` (working-tree edits, uncommitted: route knob, hard dispatch cap,
request-identity log, session seeding, settle wait). Dev server started for the run and stopped.

```
real Mistral dispatches : 6 (cap 6, never reached)     Grok dispatches : 0     escaped : 0
spend (provisional rates) : 8B $0.00901 · 14B $0.01242 · TOTAL $0.02143   (ceiling $0.10)
tokens : 8B 55,806 in / 4,256 out · 14B 57,788 in / 4,306 out · latency ≈ 18 s per call, both
artifacts : _stage0_out/arm_{8b,14b}/sample{1..3}_{request,response,verdict}.json · _stage0_summary.json
            _stage0_out/control_small/ ($0 control) · _stage0_out/blind/ (G3 pack + sealed key)
```

Rates are the ones the draft recorded ($0.15/M 8B, $0.20/M 14B, in = out); neither pricing page
exposed a table to the fetcher, so the dollar figures are **provisional**. Even at 5× those rates
the run stays under the ceiling.

---

## 1 · The $0 control reproduced the blocker on the live code path

Route forced to `small`, cap 1. Production built and sent its real planner request:

```
model=mistral-small-latest  bytes=72,249  max_tokens=2,921  reserve=75,170  allowance=20,000
→ HTTP 507  governor: reservation_exceeds_model_allowance  (no provider call, $0)
client: "[SCENE1:PLANNER:TRANSPORT] … not retryable"  →  "[SCENE1:ABORT] … refusing to author Scene 1"
```

This is the mutation control stage 1 requires, already observed. It also fixes the request size on
today's `main`: **72–80 KB, not 90 KB** — smaller than the September-4 capture, still 3.6–4× the
Small allowance. (Sample-to-sample variation of 72,227–79,848 bytes comes from the fact corpus the
product assembles, not from anything the harness changes.)

A second finding from the control: the probe had to be given a **seeded session**. The
wallet-security merge makes the issue purchase refuse without a token
(`[FORTUNE] no session token — charge not attempted` → `authentication_required`), and
`handleBeginStory` then exits before any planner call. Production is right to refuse; the harness
now presents a dummy session the way `_cold_scene1_cost_run.mjs` does.

---

## 2 · Both Ministral routes are admitted and answer the contract's shape questions

| | 8B | 14B |
|---|---|---|
| governor admission | 3/3 (`Role: PROMPT_PREPROCESSOR, Model: ministral-8b-2512`, HTTP 200) | 3/3 |
| reserve vs allowance | 75–83k vs 625,000 | 75–83k vs 937,500 |
| `reasoning_effort` on the wire | ABSENT (proxy drops it, per the draft) | ABSENT |
| `response_format` | `json_object` preserved | preserved |
| JSON parsed, top-level shape | 3/3 | 3/3 |
| opening_setting | "Veilwood ceremony clearing" ×2, "ceremony clearing" ×1 | "Veilwood ceremony clearing" ×3 |
| staged cast | exact 4, all IN_PERSON, nobody invented, nobody relocated | same |
| option ids | from the offered set (OPT-4 Seren, OPT-8 Dohkar) | same |
| product verdict | **REJECTED 3/3** | **REJECTED 3/3** |

The two historical failure modes — the planner inventing a setting and mis-staging Julian
(`project_scene1_paid_compliance_run`) — did not recur on either model.

---

## 3 · Why production rejected every plan — fault by fault

| fault (product text, abridged) | 8B | 14B | class |
|---|---|---|---|
| `character_plus … gives no "revelation_bridge"` | S1 S2 S3 (both characters) | — | **schema: required key omitted** |
| `character_plus … has first_mention undefined` | S3 | — | schema: required key omitted |
| `bridge never refers to the condition that puts the truth in play` — Seren | — | S1 S2 | **lexical**: bridge says "avoidance of direct naming"; condition says "pain becomes *nameable* in public"; the check is word-set overlap with no stemming (`_portfolioContentWords`, 4+ letter words) |
| same — the presiding Dohkar | — | S1 S2 | **substantive**: bridge is about authority of judgement; the condition is "an offering being named aloud", which the bridge never touches |
| `environment element … is not grounded in the authoritative scene material` | S1 S2 S3 | S1 | **embellishment**: the seed's carpet/canopy/trees quoted, then decorated — "untrampled", "swaying in the dawn breeze", "crushed where Seren knelt", "leaf-curtains… like a veil of whispered secrets". Those words are not in the seed; the rule is every content token must be (`_targetInSceneDetail`), and the seed comment forbids new set-dressing by design |
| `environment_plus.beat does not name its own target` | S1 S2 S3 | S1 S3 | heuristic: the beats do name "the carpet" but not the full target string |
| `pc_opening_fusion.environment_target/axis does not match environment_plus` | — | S1 S3 | substantive: the opening points at a different thing than E+ |
| `pc_opening_fusion.beat is neither contact nor sensory juxtaposition` | — | S2 | heuristic, borderline (the beat has fingers in the carpet) |
| Seren given two first appearances (opening beat AND character_plus) | — | S3 | substantive planning fault |

---

## 4 · Gates, as fixed in the protocol

| gate | 8B | 14B |
|---|---|---|
| G1 contract (parses, validates, zero schema faults, offered option ids) | **FAIL** — required key missing in 3/3 | **PASS** — every key present 3/3 |
| G2 substantive plan (≥2/3 with zero substantive faults; lexical counted apart) | FAIL (0/3; also the schema faults) | **FAIL** — 0/3: Dohkar bridge off-condition ×2, fusion/E+ mismatch ×2, double first appearance ×1 |
| G3 blind plan quality | pack built, **not yet read** | same |
| G4 admission | PASS 3/3 | PASS 3/3 |

**Selection by the pre-registered rule: neither arm passes G1+G2 → stage 1 is not authorized as
written.** That is the verdict on the gate. What follows is what the run showed underneath it.

---

## 5 · What the run actually established

1. **8B is out.** It drops required fields the schema states in plain text and 14B honours. That
   is a model contract failure, not a validator quirk.
2. **14B honours the contract's shape completely** — every field, every id from the offered set,
   correct cast and setting, ~18 s, on a bucket with 12× headroom. Its rejections are plan-quality
   and validator-strictness faults.
3. **There is no Mistral Small baseline for this contract, and there cannot be one.** The current
   `revelation_bridge` schema post-dates both archived Small plans (0 mentions in the 2026-08-25
   and the later request captures), and Small cannot be sent today's request at all. The last real
   Small plan was itself rejected on 4 faults, 3 of them lexical (`_paid_scene1_v2/EVIDENCE.md`).
   **Nothing in the record shows any model passing the validators as they stand.**
4. **The binding constraint has moved to the post-planner validators**, exactly as the last Small
   run concluded: strict exact-token grounding rejected the seed's own scenery once a qualifier was
   added, and the bridge check is a stemless word-overlap that fails "naming" against "nameable".
   Some of the rejections are real (an off-condition bridge, a double first appearance, a fusion
   pointed elsewhere); several are the lexical-shell class the project's debugging law already names
   (`feedback_bans_vs_exemplars`, `project_calcified_shell_vs_literal`).
5. **Every model embellished the seed's environment.** Whether "still and untrampled" on a carpet
   the seed already names is forbidden set-dressing or acceptable realization is a canon decision
   (`feedback_realization_not_replacement`), not a validator setting.

---

## 6 · Decision this leaves open (not taken here)

The gate did not pass, so the route is not enabled and the patches are reverted. The evidence
supports one of these, and choosing is yours:

- **A. 14B as the planner transport, validators as the next work item.** Enable the 14B route on
  its transport evidence (admission, schema shape, cast/setting fidelity), then treat the rejection
  classes in §3 as the planner-quality backlog they were before this run — with the honest caveat
  that Small was never shown to pass them either, so this is not a regression introduced by the
  route change. A bounded 14B re-probe (same harness, n=6) after any validator decision would be
  the stage-1 admission proof.
- **B. Hold.** Leave Scene 1 refused in production until the validator question is decided, then
  re-run stage 0 on 14B only.

Neither weakens the governor. 8B needs no further spend.

**G3 is ready for a human read:** `_stage0_out/blind/plan_pack.md` — seven plans (six from this
run plus the 2026-08-25 Small plan as a reference, which used the older schema and says so only in
the key), labels randomized, key sealed at `plan_KEY.sealed.json`. Two questions per plan and a
ranking, written before the key is opened. Its result informs A vs B; it does not change the gate.

---

## 7 · State after the run

- `api/mistral-proxy.js`, `public/app.js`: **reverted to HEAD** (`git checkout --`). The drafts
  remain in `_drafts/` and still apply clean.
- `_planner_probe3.mjs`: modified, uncommitted (the stage-0 knobs). Reusable for a 14B re-probe as
  `PP_ROUTE=14b CAP=<n>`.
- Dev server stopped; port 3000 free. Governor rows for the two Ministral buckets were written to
  the shared table by the six admissions, as any real request would.
- No push, no deploy, no prompt or validator change, no Grok call.
