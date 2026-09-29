# SEED EDITS + CONTRACT TIGHTENING + 18-PLAN REPLAY · 2026-09-06

Authorized: the two seed edits from `seed_calibration_memo.md`, the last structural tightening
(binding free text derived from selected ids where possible), a free replay of the frozen plans,
and a decision on whether another 14B run is justified. **No route enablement, no drafts applied,
no retest call, no commit. 0 provider dispatches.** Working tree: 5 files, +912/−84, uncommitted.

## 1 · Seed edits (First Sacrifice `sceneOne`)

| edit | delivered? |
|---|---|
| **1A** third pressure on `presiding_dohkar_sacrificial_arrogance`: *"a wish misaligning under his ear before the supervisor has ruled"*, `evidence_requires: misalign\|wording\|sooner\|perceiv\|reacts?\|halt\|interrupt\|correct\|cuts? in\|signal\|before (?:she\|seren) (?:finish\|has finished)` — established by E6 | **yes**: the dispatched planner request now offers **OPT-10** for the Dohkar, "established by: E6" (fingerprint `v2-tight`) |
| **2A** `narrator` gains: *"You wear the one ornamented ceremonial sash of the officiating Sacrificiant — nobody else here does; the presiding Dohkar wears none."* | **yes**: present in the NARRATOR block and in fact E7 of the dispatched request; the `groundedObjects` comment ("every one is named in the text") is now true |

## 2 · Tightening — binding free text derived from ids (`public/app.js`, seed-owned stages only)

| channel | before | now |
|---|---|---|
| fusion referent | free beat, instructed to be about E+'s thing; 5/6 real plans handled the sash instead | the beat carries the literal `{TARGET}` exactly once; the record's name is substituted **after the identity scan**; any other grounded object's head noun in the beat is a named fault ("names another object") |
| E+ beat referent | free beat, `_namesTarget` head-noun check; "mouthband"/"the cloth" failed it | same `{TARGET}` rule — the object is never typed, so it cannot be misnamed |
| option evidence | `enacts_evidence_id` typed by the planner, checked ∈ option evidence; 4/6 typed E6 for an E5-only option | when the option rests on **one** fact the id is **derived** and a typed id is logged and replaced (`[SCENE1:CPLUS:EVIDENCE-DERIVED]`); a choice exists only when the option has several facts, and then it is still checked ∈ the set |
| environmental realization | optional free text per element id; the same invented wind arrived through realization and beat | **removed** from the contract. Elements are the record's names; `environment_plus.beat` is the one trace; a sent `environment_realizations` is a named old-shape fault |

Planner-owned (corridor) stages are untouched. Prompt delta (`v2-corr` → `v2-tight`): the two
seed sentences (NARRATOR + E7), OPT-10, the removed realization line, and the two `{TARGET}`
instructions — 6 lines out, 9 in, nothing else. Determinism control ✓.

## 3 · Controls

Dry delivery suite: **403 passed · 0 failed** (previous 397 + new cases − none removed).
New cases: `v2EvidenceDerived` (typed E6 for a single-fact option → derived E5, logged, accepted —
also asserted on the commit in V13), `v2BeatOtherObject` (E+ beat mentions the sash while about the
carpet → rejected "names another object"), `v2NoPlaceholder` (planner named the thing itself →
rejected "must contain the literal {TARGET} exactly once"), `v2RealizationsSent` (→ rejected
"no longer part of the contract"). PART V now also asserts that both committed beats carry the
seed's name and that no literal `{TARGET}` survives anywhere in the author payload (V5/V5b/V6).
The discriminating cross-option case was re-targeted at a **multi-fact** option (a single-fact
option can no longer be mis-cited, by construction) and cites a fact from another character; it
still throws if the packet cannot support it. `verify:*` green.

## 4 · Replay of all 18 frozen plans (real validators, valve off) — before = corrections run

| set | movement | why |
|---|---|---|
| 12 pre-v2 plans (8B ×3, 14B ×3, retest #1 ×6) | each −1 (13→12, 13→12, 16→15, 17→16, 9→8, 15→14, 15→14, 14→13, 12→11, 16→15, 16→15, 13→10) | the "names no enacts_evidence_id" fault on the Dohkar is gone — it is derived now; retest #1 S6 also lost its two sash-grounding faults because the narrator now names the sash |
| retest #2 (v2) S1 | 5 → 8 | −E6 binding (derived) · +3 shape faults the plan predates (realizations sent, no `{TARGET}` in either beat) |
| S2 | 4 → 6 | −E6 binding · +3 shape |
| S3 | 5 → 10 | +3 shape, +2 "names another object" (band, sash) |
| S4 | 4 → 6 | −wind in element and realization (channel gone) · +3 shape |
| S5 | 4 → 6 | −E6 binding · +3 shape |
| S6 | 3 → 3 | −E6 binding, −wind in element/realization · +3 shape |

**Accepted: 0 of 18** — every v2 plan now fails at least on the three new-shape faults it could
not have known about. Setting those aside, the **content** residual on the six v2 plans is:

| content fault | plans | under the tightened contract, for a NEW plan |
|---|---|---|
| fusion beat never reaches / names another object (the sash habit) | S1 S2 S3 S4 S5 | "never reaches" is gone by construction (`{TARGET}`); "names another object" remains a live planner fault (3/6 here) |
| Dohkar act never engages OPT-8's condition | S1 S2 S5 | OPT-10 now exists for exactly the acts the planner writes; whether it picks it is the open question |
| E+ beat does not name its target ("mouthband") | S1 S2 S5 | gone by construction |
| wind in the E+ beat | S4 | remains, correctly caught |
| Julian not offered, `first_mention:false`, generic read | S3 | remains |
| pc_interpretation never names the person | S1 | remains |
| **S6** | **0 content faults** | would be ACCEPTED had it used `{TARGET}` and sent no realizations |

## 5 · Decision: is another 14B run justified?

**Yes — and it is the cheapest decisive step available.** Three of the four content classes that
rejected every plan in retest #2 are now inexpressible or newly answerable: the referent noun is
substituted, single-fact evidence is derived, and the Dohkar has a condition his natural act
establishes. What is left to the planner is the sash habit in the fusion beat, invented weather,
and roster discipline — one plan already clears everything. Projection from the six frozen plans
is 3–4 of 6 under the new contract, i.e. around the bar, which is precisely when a six-sample
screen is worth $0.025 and a projection is not.

Conditions unchanged: six calls, $0.05 ceiling, valve off, drafts applied for the run and
reversed, fresh blinded readers, bar ≥ 4/6 and no genuine fault class on > 2/6. **Not run.**

Residual worth knowing before that run: "his sash" on the Dohkar (a pronoun possessive) is not
caught by the ownership check; the narrator now tells the author he wears none, but the planner
can still write it. It would show up as a "names another object" fault only if the fusion/E+
beat is where it appears.

## 6 · State
Uncommitted: repair + v2 + corrections + seed edits + tightening + suite. Drafts unapplied.
Valve opt-in (default abort). Dev server stopped. Blind packs sealed. Cumulative Ministral spend
unchanged at ≈ $0.071.
