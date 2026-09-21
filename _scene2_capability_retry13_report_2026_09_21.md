# Scene 2 Capability Retry #13 (2026-09-21, after deterministic event-frame resolution)

Authorized scope: same Boundary input, deterministic event-frame resolver active (resolved lane
`family_accusation`), full planner fallback chain, all standing gates/fixes active, $0.45/8-
request ceiling, no follow-up retry on failure.

## Result: FIRST FULL SUCCESS — planner instantiated the resolved frame, author produced a real scene

Real cost: $0.22553030 (8 physical requests, well under the $0.45 ceiling). The planner passed
both gates on the first draw; the author actually ran and produced a captured scene. This is the
first time in this entire session's real retries that the author call succeeded end-to-end.

## Evaluation against the five authorized questions

**1. Did the deterministic resolver select the Boundary frame correctly?** Yes — confirmed
directly from the dispatched request body (not inferred): the prompt sent to the planner contains
a REQUIRED EVENT FRAME block naming lane `family_accusation` with the exact authored event text.

**2. Did the prompt present that frame as required fact, not as a menu?** Yes, verbatim from the
real dispatched prompt:

> REQUIRED EVENT FRAME (HARD, DETERMINISTICALLY RESOLVED — this is NOT a choice among options; the
> reader's own card selection already determined it before you were ever asked): the central event
> of this scene MUST be — Lirael's open, unretreating want is what draws Seren's family forward:
> they step out of the assembly and publicly demand remedy for what the wish cost Seren... You MUST
> set "chosen_aftermath_lane" to EXACTLY "family_accusation" — you may NOT select a different lane...

No free-choice menu text was sent — confirming the resolver correctly replaced it.

**3. Did the planner instantiate `family_accusation` in actual proposed content?** Yes, and
closely: `chosen_aftermath_lane: "family_accusation"`; `state_change`: "Seren's family steps out
of the assembly and publicly demands remedy for what the wish cost Seren" — near-verbatim to the
required frame, not a relabeled ritual beat. `event_slots.actor: "Seren's family"`,
`action: "step forward and demand remedy"`. Reserved/aftermath schema again fully correct (4/4,
4/4) — third consecutive live confirmation of that fix.

**4. Did the author produce a full continuation scene that moves into aftermath/procedure/
fallout/investigation while preserving continuity/canon/OAS history?** Yes, substantially:

- **Aftermath movement**: three NEW named-role characters (Seren's mother, father, an elder) step
  forward from the assembly and formally accuse Lirael/demand remedy — a genuinely new social/
  procedural event, not a restaging of the opening ritual confrontation.
- **Continuity/canon**: `mouth-band torn away` (established state, correctly not reversed), `The
  Answer held in Lirael's hands` (established prop), Seren kneeling/composed (consistent with
  `twist_manifested`), the presiding Dohkar asserting rite authority ("The rite stands under my
  seal") — consistent with `inquiry_authority_claimed` without touching the reserved
  `inquiry_opened` id (the formal inquiry itself is NOT convened here, correctly reserved for
  later). No reserved id (`price_identified`, `inquiry_opened`, `julian_counter_wish`,
  `julian_obscuring_wishes`) is touched in the beats.
- **Procedural fallout**: the Dohkar explicitly asks the family "What remedy does the family
  seek?" / "What cost does the family name?" — genuine procedural engagement with a NEW formal
  complaint, moving toward the exitState's "Lirael's standing is at risk."

**5. Does the prose have enough description, dialogue, interiority, LI pressure, and a real end
choice?**

- **Description**: solid — new characters introduced with distinct physical detail ("shoulders
  set like the rite ground itself," "eyes never leave the presiding Dohkar"), staging/camera
  direction across 3 phases and 3 panels.
- **Dialogue**: 5 real dialogue beats (Dohkar ×2, Seren's mother ×2, Seren's father ×1),
  escalating and specific, not generic.
- **Interiority**: present and tied to Lirael's dread — "I feel the weight of their steps before
  they speak," "I feel the assembly's attention settle like a second mouth-band" (a real callback
  image), "I hold The Answer and feel every eye waiting for the next word that will belong to me
  or be taken from me."
- **Real end choice**: yes — `decisionGateBeatIdx: 22`, branch_a "claim the interference openly"
  vs branch_b "let the assembly keep its assumption," set up cleanly by the scene's own closing
  beats, consistent with the row's own `decision_axis`.
- **LI pressure — the one real gap**: Julian (the love interest) is present but almost entirely
  inert in this draft. The only beat referencing him directly is "Julian has not moved." He gets
  no dialogue, no direct exchange with Lirael, and the central conflict runs entirely through
  Seren's family and the Dohkar. This is thinner LI presence than the standing "full scene
  adequacy" standard calls for, and is worth naming honestly rather than treating this sample as a
  clean, unqualified pass. It is a real, specific gap for a future pass to address — not a
  continuity or architecture failure, and not something either gate was built to catch (LI
  presence was a separate, earlier-session concern — see `_li_presence_dominance_repair_control.mjs`,
  which addresses low LI *dominance*, not literal LI *inertness* in a scene where another party is
  the antagonist).

## Cost detail

8 physical requests: planner (Grok, $0.0106), author (Grok reasoning, $0.0806, the real scene),
plus 6 further calls (ministral/gpt-4o/grok, $0.0004–$0.0454 each) that are the CG pipeline's
normal post-author steps (speaker/casting/focus validation, etc.) — all real, all successful,
none suspiciously scaffolded. Total $0.2255 of $0.45 ceiling.

## Artifacts

- `_scene2_repair_replay_sample_out/run_1789971853458.jsonl` — full raw request/response log,
  including the verified REQUIRED EVENT FRAME prompt text.
- `report_retry13.json`, `scene2_raw_response_retry13.txt` — this run's outputs under distinct
  filenames. Fixed-name fixture files (`report.json`, `scene2_raw_response.txt` — this run did not
  touch `console_tail.txt`/`partial_tracked_calls.json`) confirmed clean before the run, restored
  via `git checkout --` immediately after (verified clean again).

## Honest classification

This is the first real, end-to-end success this session: the architecture change (deterministic
event-frame resolution) did exactly what it was built to do — the model was never given the
opportunity to invent or mislabel the central event, and it produced a genuinely different,
procedurally-appropriate scene with real dialogue, staging, and a forced choice. This is ONE
sample, on ONE card (Boundary), and does not by itself prove the other 4 event frames
(`temptation`/`silence`/`reversal`/`confession`) or the `defaultEventFrame` fallback would perform
as well — those remain untested live. The one real content gap found (thin LI presence) is
genuine and specific, not a fabricated caveat.

## Status

No follow-up retry run, per standing instruction. Report written and committed. Stopping here.
