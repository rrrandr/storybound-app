# 14B RETEST — RESULT: NO-GO (2026-09-05)

Authorized: six calls, $0.05 ceiling. Run on `main` @ `d41dc35` + the uncommitted validator repair
(`validator_repair_control.md`) + the two `_drafts/` patches applied for the run and **reverse-applied
afterwards** (repair intact, route flag and allowlist gone, verified). Dev server started and stopped.

```
real dispatches : 6 (cap 6, never reached)     Grok : 0     escaped : 0     attempts : 1 per sample
spend (provisional $0.20/M) : $0.02492 of $0.05       tokens : 116,147 in / 8,451 out    latency ≈ 19 s
admission : 6/6 HTTP 200 on ministral-14b-2512 · reserve 75.8–83.2k vs 937,500 · reasoning_effort ABSENT
delivery  : both new prompt sentences present in every dispatched request (checked S1, S3, S6)
artifacts : _stage0_out/retest_14b/sample{1..6}_{request,response,verdict}.json · _stage0_summary.json
blind pack: _stage0_out/blind_retest/plan_pack.md (six plans, labels random, key sealed, unread by me)
```

## The bar, and the result

| criterion | bar | observed |
|---|---|---|
| plans accepted by the product | ≥ 4 of 6 | **0 of 6** |
| any single genuine fault class on more than 2 of 6 | none | **two**: duplicate first appearance on 5 of 6; "dawn breeze" on 5 of 6 |

**NO-GO.** 14B stays disabled; nothing is committed as a success. The blind pack exists but the gate is
decided deterministically; the read is optional.

## What the six plans did

Every plan kept the cast (exact four, all IN_PERSON) and the setting ("Veilwood ceremony clearing"),
returned valid JSON with every schema key, and chose option ids from the offered set. The failures
are now all planner behaviour against a contract that no longer rejects for lexical reasons:

| fault (genuine, class A) | plans | note |
|---|---|---|
| the opening beat stages Seren (once also the Dohkar) AND character_plus gives them a different act | **5 of 6** | despite the new sentence "IF YOUR opening_beat STAGES ONE OF THESE PEOPLE, THAT OPENING ACT IS THEIR character_plus visible_action" being in the request. The model reads the instruction and still splits the two |
| "the pale mated-pair trees' leaf-curtains trembling in the dawn breeze" | **5 of 6** | the seed has no wind; the new sentence forbidding weather was in the request. The model reaches for the same breeze almost every time — the forbidden-fact rule is doing exactly its job |
| visible_action never engages the chosen condition | 4 hits (Dohkar/"offering being named aloud" ×3, Dohkar/"cost too small" ×1, Seren ×1) | the Dohkar's act is repeatedly posture/gaze, never the offering or the cost |
| fusion points at a different target/axis than E+, or never reaches it | 4 plans | schema says "the SAME string, verbatim" |
| E+ beat does not name its target (head noun, post-fix rule) | 2 | genuine: beats about "the grass's braids" / "the frayed edge" for a carpet / sash target |
| invented ownership: "the Dohkar's ceremonial sash" | 1 | the sash is the officiating Sacrificiant's (Lirael's, O5); E+ target not in the scene |
| `behavior_person_ids` cites `pc` | 1 | id format error (the roster id is `pc:lirael`) |
| pc_interpretation never names the person | 1 | |
| E+ beat "unmarked" | 1 | contradiction of the seed |

No fault in the six is of the classes the repair removed (word-overlap bridge, last-token head noun,
"dig into", elaboration-as-new-fact). One plan (S3) is three faults from acceptance, all the
opening/C+ split plus one breeze.

## Reading

1. **The repair held.** Zero validator-noise rejections in six fresh plans; every rejection is a
   planner or canon fault a human would also reject. That was the repair's claim and it is now shown
   on unseen output, not only on the six frozen plans.
2. **14B does not follow two of the three policy sentences.** The opening/C+ unity rule and the
   no-weather rule were delivered and ignored in 5 of 6 plans each. Both are stated once, as prose,
   deep in a ~75 KB request. This is the project's own known result about instruction volume and
   compliance (`feedback_bans_vs_exemplars`, `project_arms4_directive_result`): a stated rule is not
   a followed rule, and naming "breeze" as forbidden did not stop the breeze.
3. **The Dohkar condition is structurally hard for this planner.** "An offering being named aloud"
   needs an act about the offering or the cost; the model keeps giving him a face and a posture.
   Four of six Dohkar acts fail the act gate.

## What this does and does not decide

- It does **not** earn the route change. 14B remains unenabled and the drafts remain unapplied.
- It does **not** reopen the governor question: admission and schema shape are settled (12/12 across
  stage 0 and the retest). The open problem is planner compliance with the contract, and no model
  has been shown to pass it — Small cannot even be sent the request.
- The next decision is about the planner contract's *shape*, not its wording or its model: the two
  5-of-6 failures are the kind a schema can enforce and a sentence cannot (e.g. the opening character's
  `visible_action` prefilled from `opening_beat` rather than requested; environment elements chosen
  from the seed's `groundedObjects` ids rather than typed free). That is a design decision with its own
  costing, and it is not authorized by anything here.

## State

`public/app.js`, `public/index.html` (repair + seed pattern) and `_planner_probe3.mjs` modified,
uncommitted. Drafts not applied. No push, no deploy, no enablement. Cumulative Ministral spend
today: $0.02143 + $0.02492 = **$0.04635** (provisional rates).
