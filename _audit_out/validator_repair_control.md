# VALIDATOR REPAIR — implementation + control (2026-09-05)

Implements the three policy calls Roman adopted from `validator_triage_memo.md` and fixes the two
validator bugs, on `main` @ `d41dc35`. **Working tree only, uncommitted. No route enabled, no
paid call, no deploy.** The Ministral drafts stay unapplied.

## What changed (`public/app.js`, 10 hunks; `public/index.html` cache-buster `20260905b-validator-policy`)

| # | change | where |
|---|---|---|
| bug 1 | `_namesTarget` head noun = head of the noun phrase (text before " of "), not the last token | `~265262` |
| bug 2 | `_FUSION_CONTACT` gains dig/dug into, sink/sank into, curl around/into, knead, claw | `128202` |
| policy 2 | bridge no longer gates. The ACT (`visible_action`) must match the seed's authored `evidence_requires` for the chosen option's pressure; the bridge is logged as `[SCENE1:CPLUS:BRIDGE]`. The "no bridge at all" fault is kept (schema). LEAK check unchanged | `~264849-264870` |
| policy 2 | grounded option records now carry `evidence_requires` (backend-only; the prompt prints truth / pressure_text / evidence_ids as before) | `128622` |
| policy 1 | element grounding checks the element's nominal HEAD (before a comma, relative clause, non-"of" preposition, or trailing participle), not every qualifier | `~265123-265165` |
| policy 1 | seed-owned `forbiddenEnvironmentFacts` regex applied to declared elements, the E+ beat and the fusion beat; carried by the stage contract as `_stage.forbiddenEnvironmentFacts`; authored on the First Sacrifice `sceneOne` (wind, rain, blood, flame, moon/night, "untrampled/unmarked/pristine") | seed `~126138`, stage `~127167`, validator |
| policy 1 | prompt: one sentence after the environment_elements rule — name things as the description names them, put what happened to them in the beat, add no weather/light/marks/fluids | `263860` |
| policy 3 | prompt: one sentence at the top of CHARACTER+ CANDIDATES — if the opening stages a candidate, that opening act IS their `visible_action` | `263534` |

Two defects in my first cut were caught by the control and fixed before anything else: the head
helper called `_contentToks` before its declaration (builder threw, every plan "cleared" — a false
green), and the participle regex matched "weeping" inside "weeping-willow" (head collapsed to
"the white"). Both are why the control runs the real validators, not a replica.

## Control — the six frozen stage-0 plans replayed through the real validators, $0

Harness: `_planner_probe3.mjs` with `REPLAY_DIR` (planner route served from the frozen response
files, `CAP=0`, dev server local, Grok blocked). Zero provider dispatches in the whole session
(dev-server log: 0 `Model: ministral` lines).

**Pre-fix replay reproduced all six recorded verdicts byte-identically** — the instrument reads
the same thing the paid run read.

**Post-fix**, fault by fault (predicted in the memo → observed):

| class | predicted | observed |
|---|---|---|
| B · beat "does not name its own target" (head-noun bug) | clears on 4 (8B ×3, 14B-S3), stays on 14B-S1 | **as predicted** — 14B-S1's beat names "crushed grass", not the carpet |
| B · NO_CONTACT ("dig into") | clears on 14B-S2 | **cleared** |
| B · bridge word-overlap (naming/nameable) | clears on 14B-S1/S2 Seren | **cleared**; replaced by the act gate |
| C→policy 1 · elaborated elements | clears where the head is a seed object and no new fact | **cleared on 8B-S3 ×2, 14B-S1 ×2**; the head also passes on 8B-S1/S2 (grounding no longer fires there) |
| policy 1 · new facts | fires on breeze/wind, blood, untrampled/unmarked | **8 hits**: 8B-S1 untrampled + breeze · 8B-S2 unmarked + breeze + E+ beat "unmarked" · 14B-S1 E+ beat "blood" + fusion beat "gust" |
| policy 2 · act gate | passes 14B-S1 both acts (wound/aloud; cost); fails 14B-S2 both, 14B-S3 Dohkar | **as predicted**, plus 14B-S3 Seren fails (see note) |
| A · 8B missing keys, fusion target/axis mismatch, duplicate first appearance, 8B-S2 fusion on the sash | all kept | **all kept** |

Final verdicts: **0 of 6 accepted** — exactly the memo's expectation, since every plan retains at
least one genuine (A-class) fault. Post-fix fault counts: 8B 6/6/7 · 14B 8/2/7. 14B-S2 is now two
faults away from acceptance, both the act gate.

**Note on the act gate (a seed calibration, not a validator issue).** 14B-S3's Seren act — she
*blurs the words of the wish* while glancing at Lirael's covered mouth — is on the condition in
meaning, but the seed's `evidence_requires` for "someone's pain becomes nameable in public" is
`wound|grief|the one she lost|bereave|pain|name (it|the loss)|aloud`, which "blur" does not hit.
The gate is only as good as that authored pattern. If blurring counts as engaging the condition,
the pattern should say so (e.g. add `blur|soften|the wish`) — a seed edit, Roman's call, not made here.

**Prompt delta, measured.** Pre vs post planner request (same sample): system bytes 4,283 → 4,283;
user 68,056 → 68,599. The added lines are the two policy sentences; every other differing line is
the pinned anti-calcification rotation (story shape, crisis family, LI archetype) that
`_scene1_prompt_fingerprint.mjs` documents as intentionally variable. No parameter changed.

## Verify suite after the change (network blocked)

verify:scene1 PASS · verify:files 47/47 · verify:baked 113/113 · verify:economy 332/332 ·
verify:security 163/163 · verify:causal 14/14 + 3/3 + 3/3 · verify:geo PASS · verify:sacred PASS.

## State

- `public/app.js`, `public/index.html`: modified, **uncommitted**. `_planner_probe3.mjs`: modified
  (stage-0 knobs + replay mode), uncommitted.
- Ministral drafts: not applied. Route default: Small. Nothing pushed or deployed.
- Artifacts: `_stage0_out/control_prefix_{8b,14b}/`, `_stage0_out/control_postfix_{8b,14b}/`.

## Addendum — seed pattern (Roman, 2026-09-05)

`blur|soften` added to the OPT-4 pressure's `evidence_requires` on the First Sacrifice seed
(`app.js:~126278`; the seed's own E4 mechanism). Replayed all six plans again: **exactly one flip**
— 14B-S3's Seren act-gate fault cleared (7 → 6 faults); every other verdict and fault count is
unchanged (14B 8/2/6 · 8B 6/6/7). Still 0 of 6 accepted; every plan retains genuine faults.
14B-S2 now stands two faults from acceptance, both act-gate: Seren's act (hands clutching the sash,
words "dissolving into something raw") never blurs, names or softens anything, and the Dohkar's act
never touches the offering being named. Those are the planner's, not the rule's.

**Standing instruction:** the repair removed validator noise; it has not shown a valid 14B plan.
Do not enable 14B and do not record this as a success until the six-sample retest meets the
4-of-6 acceptance bar with fresh blind readers.

## What a 14B retest would now measure

The memo's GO rule stands (≥ 4/6 accepted, no single A-class fault on > 2/6, fresh blind readers).
On the frozen plans the remaining faults are all genuine, so the retest measures the planner
against a contract that no longer rejects it for lexical reasons. It stays a separate
authorization: `PP_ROUTE=14b CAP=6`, drafts applied for the run and reverted, ≈ $0.025.
