# PLANNER CONTRACT v2 — structural proposal (no code, no calls) · 2026-09-05

Written against `main` @ `d41dc35` + the uncommitted validator repair. Evidence: 12 real 14B/8B plans
(`_stage0_out/arm_*`, `_stage0_out/retest_14b`), the seed `sceneOne`, the request/validator code
(`app.js` 263244–265520, 96520–96560, 128560–128760). **Nothing here is built, enabled or dispatched.**

## Recommendation (single)

Change the SHAPE of the Scene-1 planner contract so the five observed failure classes cannot be
expressed, keep the author untouched, add an availability valve so an invalid plan degrades Scene 1
instead of aborting it, then earn the 14B route with the existing six-sample retest. Do not touch the
governor, do not add a provider call, do not let the planner write prose.

## Decision gate

1. Approve the five field changes in §2 and the availability valve in §4 (a product-behaviour change:
   Scene 1 may ship without C+/E+ when the plan is invalid, logged).
2. Code + tests land green (§5.1) — all free.
3. **Then** authorize the 14B retest (six calls, ≈ $0.025, bar ≥ 4/6 accepted, fresh readers).
4. GO ⇒ scoped route enable for the Scene-1 opening planner only, deploy, live check. NO-GO ⇒ stop;
   the valve alone still restores Scene 1 availability on Small-refused traffic? **No** — see §4: the
   valve needs an admitted planner or a decided "no planner" path; state it before choosing.

---

## 1 · Failure classes → what removes them by construction

| observed (12 plans) | today the planner is asked to… | v2: the planner instead… | removed how |
|---|---|---|---|
| opening character gets a second, different C+ act (5/6 retest, 4/6 stage 0) | write `opening_beat` AND a free `visible_action` for the same person, with a sentence asking them to match | names `opening_actor_id`; that person's `visible_action` is **not requested** — it is derived from `opening_beat` by the backend | two fields → one source |
| invented weather / marks / elaborations typed into the inventory (breeze 5/6) | type `environment_elements` as free text | selects `environment_element_ids` from the seed's `groundedObjects`; elaboration goes in a separate optional `realization` field checked only for forbidden facts | the *thing* is an id; only the *trace* is text |
| fusion points at a different target/axis than E+ (4 plans) | repeat E+'s target and axis "verbatim" | has no fusion target/axis fields; both are E+'s by definition | field deleted |
| act never engages the chosen condition (act gate 4–6/plan set) | write a free act after picking an option | additionally cites `enacts_evidence_id` ∈ the option's `evidence_ids`; the act must satisfy the seed's `evidence_requires` for that option (already enforced) | binds act → fact, and the fact is seed-owned |
| ownership error ("the Dohkar's sash") | write object names in text | cites object ids; seed objects carry `owner_ref`; a possessive-mismatch check runs on the remaining free-text beats | the name and owner are rendered from the seed, never re-typed |

---

## 2 · Field by field

### 2.1 `opening_actor_id` + derived opening C+ act

| | |
|---|---|
| **source of truth** | `opening_beat` (planner text, staging only) + roster `person_id` (backend, `_cpContract.people`). For seeded stages where the seed's `aboutToHappen` fixes the opener (First Sacrifice: Seren's E3/E4), the backend may **prefill** `opening_actor_id` and the planner may not change it — same convention as `staged_characters` (PREFILLED AND FIXED, `263956`) |
| **schema** | `"opening_actor_id": "<person_id of the ONE candidate the opening beat stages, or null>"`; the matching `character_plus[]` entry carries `"visible_action": "FROM_OPENING_BEAT"` (same prefill idiom as `anchor_beat: FROM_CHARACTER_PLUS`, `263973`) |
| **validation (exact)** | (a) `opening_actor_id` ∈ on-stage ids or null; (b) if non-null, `opening_beat` must name that person's label (`\bname\b`, the existing regex at `265386`); (c) if `opening_beat` names any candidate and `opening_actor_id` is null → fault; (d) the opening actor's C+ entry must have `visible_action === "FROM_OPENING_BEAT"` — any other text → fault ("second first appearance"); (e) backend sets `behavior := opening_beat` and runs the **existing act gate** (`evidence_requires` over the derived act) and the existing prop/id checks on it. If (e) fails: the C+ **entry is dropped** with reason `opening_does_not_enact_condition` (C+ closed for that person, plan proceeds); the opening beat itself stays |
| **rendered to the author** | unchanged three-part block (`96530–96546`): SOURCE TRUTH — DO NOT STATE / VISIBLE ACTION — MUST OCCUR / PC INTERPRETATION. For the opening actor the VISIBLE ACTION line reads the opening beat text once; the opening directive no longer repeats it. The author still writes every sentence |
| **backward / fail-closed** | an old-shape reply (free `visible_action` for the opening actor) is rejected with a named fault, never silently accepted; a reply with no `opening_actor_id` key is rejected as schema-incomplete; the retry policy is unchanged (transport-only) |
| **request byte delta** | +~250 B (field + one line of instruction) − ~220 B (delete the "IF YOUR opening_beat STAGES…" sentence added 2026-09-05) ≈ **0** |
| **response ceiling delta** | −~150 chars per plan (one free act not written); `_SCAFFOLD_MAX_TOKENS` formula untouched (2,921 for 4 eligible) |
| **reservation** | unchanged (75–83k → 75–83k) |

### 2.2 `environment_element_ids` + optional `environment_realizations`

| | |
|---|---|
| **source of truth** | seed `sceneOne.groundedObjects[]` (O1–O7 today), already delivered to the planner as citable `O` lines (`263246–263253`). For a planner-owned stage (corridor) the planner still declares free-text elements — that path is untouched; ids are minted from them as today (`263253`) |
| **schema** | `"environment_element_ids": ["<2–3 DISTINCT object_ids from the objects listed above>"]`; `"environment_realizations": { "<object_id>": "<optional, ≤120 chars: a visible state or trace OF that thing, here, now — nothing the description does not contain>" }`; `environment_elements` free-text field **removed** for seed-owned stages |
| **validation (exact)** | (a) 2 ≤ ids ≤ 3, all ∈ `groundedObjects`, distinct; (b) every realization key ∈ the chosen ids; (c) each realization ≤ 120 chars, passes `forbiddenEnvironmentFacts`, passes the possessive-mismatch check (§2.5), contains no object name other than its own head (no smuggled second thing — `_cpUngroundedProp` already exists); (d) no grounding check on realizations beyond (c): the *thing* is grounded by the id, by construction |
| **rendered to the author** | `seed name` + (realization ? ` — ` + realization : ``), e.g. "the deep-crimson carpet of braided mated-pair spiralgrass underfoot — pressed flat where Seren kneels". Author prose freedom unchanged: it is still a noun phrase the author may use or not |
| **backward / fail-closed** | free-text `environment_elements` on a seed-owned stage → fault `environment_elements_must_be_ids`; unknown id → fault; empty → fault (as today) |
| **request byte delta** | −~1,100 B (the two free-text instruction blocks at `263858–263860`) + ~450 B (id/realization instruction) ≈ **−650 B** |
| **response ceiling delta** | −~120 chars (two ids instead of two 80-char phrases; realizations optional) |
| **reservation** | unchanged in class; Small stays refused (72–80 KB is 3.6–4× its 20k allowance — this change cannot fit it) |

### 2.3 `environment_plus.target_object_id`; fusion target/axis **deleted**

| | |
|---|---|
| **source of truth** | E+ target = one of `environment_element_ids`; fusion target and axis = E+'s, by definition |
| **schema** | `"environment_plus": { "target_object_id": "<one of environment_element_ids>", "axis": "<enum>", "beat": "<free, as today>" }`; `pc_opening_fusion` loses `environment_target` and `environment_axis`; keeps `character_angle`, `beat`, `placement` (placement can also be prefilled — it is always `PC_FIRST_EMBODIED_BEAT`) |
| **validation (exact)** | target id ∈ chosen ids; axis ∈ enum; `beat` keeps today's checks with the *rendered seed name* as the target string: `_namesTarget` (head-noun rule, post-repair), concreteness, forbidden facts, possessive check; fusion `beat` keeps `_namesTarget` + contact/sensory (post-repair) + forbidden facts, against the same rendered name |
| **rendered to the author** | E+ line: rendered name + axis + beat; fusion line: unchanged text, no target repetition |
| **backward / fail-closed** | a reply carrying `environment_target` in the fusion is rejected as old-shape (named fault); a `target` string instead of `target_object_id` → fault |
| **request byte delta** | −~380 B (two fusion field descriptions + "SAME string verbatim" prose) + ~60 B ≈ **−320 B** |
| **response ceiling delta** | −~100 chars |
| **reservation** | unchanged |

### 2.4 `character_plus[].enacts_evidence_id`

| | |
|---|---|
| **source of truth** | the chosen option's `evidence_ids` / `evidence_texts` (backend-composed, `128610–128625`) and the pressure's `evidence_requires` (seed-authored; now carried on the option record by the repair) |
| **schema** | `"enacts_evidence_id": "<EXACTLY one evidence id from THIS option's 'established by' list — the fact this act is your character's part of>"` |
| **validation (exact)** | (a) id ∈ `optionById[option_id].evidence_ids`; (b) act gate as repaired: `evidence_requires` regex over `visible_action` (or the derived opening act); (c) **seed lint (free, at verify time)**: every `possible_pressures[]` entry on every facet must author `evidence_requires` — a pressure without one is not offered (`_cpEvidenceEstablishes` today treats "no requirement" as ok; v2 treats it as "not offerable"), so the gate can never be silently absent. The bridge stays logged, not gated |
| **rendered to the author** | nothing new. The author never sees ids (existing rule: no option ids, evidence ids, bridge or facet JSON reach the author, `_acceptance_rubric_frozen.md` §3) |
| **backward / fail-closed** | missing or foreign id → fault; option with no `evidence_requires` → not composed, so the planner cannot pick it |
| **request byte delta** | +~180 B |
| **response ceiling delta** | +~12 chars per C+ entry |
| **reservation** | unchanged |

### 2.5 seed `groundedObjects[].owner_ref` + possessive-mismatch check

| | |
|---|---|
| **source of truth** | the seed. First Sacrifice today: O4 (gossamer band) and O5 (ceremonial sash) → `pc:lirael`; O6 (Veilweave) → everyone present; O1–O3, O7 → none |
| **schema (seed data, not planner output)** | `{ object_id:'O5', name:'…ceremonial sash', owner_ref:'pc:lirael' }`; the `O` line rendered to the planner gains `(owner: Lirael)` |
| **validation (exact)** | over every free-text field that survives (`opening_beat`, `visible_action`, E+ `beat`, fusion `beat`, realizations): for each owned object, build `\b(<label or first name of any OTHER on-stage person>)['’]s\s+(?:\w+\s+){0,2}<object head noun>\b` from seed data; a hit → fault `object_owner_mismatch` naming the object and its seed owner. Handling another's object is still allowed ("her fingers on Lirael's sash" is fine; "the Dohkar's sash" is not) |
| **rendered to the author** | object names come from the seed record already; no change |
| **backward / fail-closed** | seeds without `owner_ref` → check inert (no false faults); a planner cannot rename ownership because names are no longer planner text where ids are used |
| **request byte delta** | +~15 B per owned object (≈ +45 B) |
| **response ceiling delta** | 0 |
| **reservation** | unchanged |

### Net effect on the request

Request: ≈ **−900 B** on 72–80 KB. Reservation 75–83k → ~74–82k: same admission class on 14B (937.5k) and 8B (625k); **Small remains refused** — v2 is not a size fix and does not pretend to be. Response: ≈ −350 chars per plan; keep `max_tokens` at the current formula (a smaller ceiling buys nothing and risks truncation).

### What v2 does NOT do

- The planner still writes no prose: `opening_beat`, one `visible_action` per non-opening candidate, E+ `beat`, fusion `beat`, realizations — all staging notes, all bounded, none rendered verbatim to a reader.
- No new provider call anywhere. The two Mistral calls on the Scene-1 path stay two.
- No governor change, no allowlist change beyond the already-drafted Ministral ids, no threshold loosening: the repaired validators are kept and now run on rendered seed names.

---

## 3 · What the 12 plans would have done under v2 (thought experiment, not a test)

Of the 12 rejections, the classes that v2 makes inexpressible account for: opening/C+ split (9 plans),
free-text environment inventions (8 elements across 7 plans), fusion mismatch (6 plans), the sash
ownership (1). What remains are act-gate failures where the act itself does not enact the condition
(the Dohkar in 5 plans) — which is a true planner-quality signal and exactly what the 4/6 bar should
be measuring. **This is why the bar is unchanged, not lowered.**

---

## 4 · Availability valve (policy, needs its own yes)

Today an invalid skeleton **aborts Scene 1** (`[SCENE1:ABORT] … refusing to author Scene 1 without it`,
`267281`); only transport errors retry, once. v2 proposes: after the single attempt, an invalid plan
→ **drop the assignments** (C+, E+, fusion), log `[SCENE1:ASSIGNMENTS:DROPPED] <faults>`, and author
Scene 1 from the seed stage alone — the doctrine already written at `263376` ("an absent introduction
is a missing FEATURE, not a broken story"). What ships in that case is a Scene 1 without C+/E+.
Governor refusal is different: it is a transport terminal (no plan at all), and stays the reader-facing
"at capacity" — the valve does not bypass admission. So: **availability on the live site requires an
admitted planner** (the route decision) **and** the valve makes an imperfect plan non-fatal.

---

## 5 · Minimum migration path

### 5.1 Code + tests (free, no dispatch)
1. Seed: `owner_ref` on O4/O5/O6; seed lint for `evidence_requires` (extend `verify:baked` or `verify:files`).
2. Request builder: the five schema changes (§2); prefill `opening_actor_id` for seeded openers.
3. Normalizer/validator: id resolution → rendered names; deletion of the fusion target/axis fields;
   derived opening act + act gate; possessive check; old-shape replies rejected by name.
4. Renderer (`96530+`): rendered names + realizations; opening actor's VISIBLE ACTION = opening beat.
5. Valve (§4) behind the existing fail-C+-closed path.
6. Controls: `_scene1_prompt_fingerprint.mjs` — new baseline, delta must be exactly the §2 text;
   dry suite fixtures (`_scene1_skeleton_delivery.mjs` responders) moved to the v2 shape — one real
   shape, never a union; **replay of the 12 frozen plans must yield 12 named old-shape rejections and 0
   crashes** (backward/fail-closed proof); per-validator positive + mutation control through the real
   page (`_planner_probe3.mjs REPLAY_DIR`), each mutation observed RED; `verify:*` green.
   No new harness: the replay knob and the suite fixtures cover it.

### 5.2 14B retest (paid, separate go)
Same harness, `PP_ROUTE=14b CAP=6`, six sequential samples, ≈ $0.025, $0.05 ceiling, drafts applied
for the run and reverse-applied. **Bar unchanged:** ≥ 4/6 accepted; no single genuine fault class on
> 2/6; blind read by readers who have not seen any attributed report. Report the act-gate rate
separately — it is the planner-quality number this contract exposes.

### 5.3 Scoped route enable (on GO only)
One scoped commit: the two drafts + `_preprocessorRoute` default `14b` **for the Scene-1 opening
planner site only** (`264215`). The continuation skeleton site (`96169`, Small, ~2.3k out) is **not
measured here** — measure its request size before touching it; if it fits Small it stays. Deploy, then
the live check §0 of the pilot protocol still owes: one real Scene 1 on the live site admitted and
authored.

### 5.4 Rollback
Revert the route commit (redeploy). Be explicit about what that restores: today's state, in which
Small is governor-refused and Scene 1 is unavailable — rollback protects against a *worse* 14B
behaviour, not against the outage. The valve (§4) is independent of the route and can stay.

---

## Decision gate — restated

**Approve §2 + §4 → build 5.1 → authorize 5.2 → GO ⇒ 5.3.** If the retest is NO-GO under v2, the
remaining failures are planner quality against a contract that can no longer be blamed; the next
decision is then the planner model or the seed's conditions, not the validators — and that is a
different proposal.
