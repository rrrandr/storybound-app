# Confession Frame: Confessing-Party Fix (2026-09-22)

Roman, closing out the five-card capability sweep: "Confession works mechanically and narratively
enough, but the lane text has the wrong confessing party baked into it... The right next step is
dry-fix the Confession frame so it does not assume Julian confesses. It should describe the
player/Lirael's admission, deflection, blame-placement, or truth-leak as the trigger, while Julian
registers/responds according to the `register` obligation." Instruction: default the frame to
Lirael's own admission, preserve the institutional consequence, preserve (never forbid) a genuine
Julian-confession path when the player's own text delivers it, prove against attempt 1 as the
red/design fixture plus a contrasting fixture, no provider calls, no prose edits, no retry.

## The bug, confirmed by real paid data (Confession attempt 1, committed separately)

The reader's real submitted Confession-card dialogue was Lirael's OWN line: *"You're not the one
who left me in the braided trees—she was."* — her own admission/deflection, redirecting blame to
an unnamed third party. The OLD `eventFrameBySlot.confession` text
(`public/app.js`) read: *"Julian's own confession destabilizes his position as accuser..."* The
real planner reply then echoed that framing verbatim — *"Julian's confession destabilizes his
accuser position"* — despite nothing in the reader's actual words showing Julian confessing
anything. The frame text told the planner whose confession this was, and it was wrong.

## The fix

Rewrote `eventFrameBySlot.confession` in `public/app.js` so the default confessing party is Lirael
herself (matching what the card mechanism actually produces), while explicitly permitting — never
requiring — Julian as the confessor when the reader's own custom text genuinely delivers that:

> "An admission has just landed — most naturally Lirael's OWN (redirected blame, a
> self-incriminating deflection, a truth she can no longer keep folded away), though if the
> reader's own submitted words instead have Julian confess something on his own account, that
> admission destabilizes HIS position exactly the same way; this frame does not require that —
> only allows it when the reader's own text actually delivers it. Whichever party's truth just
> surfaced, the presiding Dohkar reacts to that shift by setting formal terms and a date for
> review rather than letting the interrogation continue informally."

The institutional consequence (`laneId: 'dohkar_preliminary_review'`, the Dohkar setting formal
review terms) is unchanged. Julian's own reaction remains governed separately by the pre-existing,
unmodified per-slot `obligationType` mechanism (`confession -> 'register'`) — this fix only decides
whose truth triggers the Dohkar's procedural response, not how Julian reacts to it.

Checked (not assumed) that the new text does not accidentally interact with the separate
causal-legibility mechanism: Confession is active disclosure, not a withholding/non-action pattern,
so it correctly does not trigger `_causalLinkFrameTrigger` — unaffected before and after this
change.

## Proof — `_confession_frame_confessing_party_control.mjs`, 16/16, fully dry

Because this fix is a prompt-text change (not new executable logic), the control resolves the REAL
text through the REAL, unmodified `_effectiveSceneRow` + `_resolveStarterEventFrame` mechanism
(live app, not a hand-typed copy) and asserts on that real resolved string:

- **A-D** — the real resolved frame still maps to `dohkar_preliminary_review`; defaults the
  confessing party to Lirael; explicitly permits a genuine Julian-confession path; preserves the
  institutional consequence.
- **E (RED/design fixture)** — attempt 1's real, committed submitted dialogue is confirmed as
  Lirael's own admission/deflection line (not Julian's); the OLD frame text (quoted for the
  record) asserted Julian as confessor unconditionally; the NEW text is coherent with the real
  evidence.
- **F (contrasting fixture)** — the frame's own permissive clause explicitly names "Julian confess
  something on his own account" as a valid path, gated only on the reader's own words, not on any
  other condition a hypothetical Julian-confession submission could fail.
- **G (coexistence)** — the other 4 slots' resolved frame text (Temptation, Silence, Boundary,
  Reversal) is confirmed byte-identical to before this change.
- **H** — causal-legibility still correctly does not fire for Confession, unaffected.

## Full regression — zero collateral damage

- `_confession_frame_confessing_party_control.mjs`: 16/16 (new).
- `_relational_obligation_contract_control.mjs`: 47/47, unaffected.
- `_planner_function_gate_diagnosis_control.mjs`: unaffected.
- `_cg_proxy_world_guard_control.mjs`: 15/15, unaffected.
- `_cg_causal_link_legibility_control.mjs`: 25/25, unaffected.
- `_scene2_aftermath_lane_control.mjs`: 22/22, unaffected.
- `_scene2_planner_function_gate_control.mjs`: 10/10, unaffected.
- `_scene2_lirael_defensive_path_lane_semantics_control.mjs`: 22/22, unaffected.
- `_continuity_spine_dry.mjs`: 69/80, identical 11 pre-existing failing test names, no new
  failures.

Several controls hit transient `page.goto` timeouts during this pass, traced to genuine host-level
memory pressure at the time (`vm_stat` showed under 65MB free physical memory, driven by the user's
own long-running applications — not leaked Playwright processes, confirmed zero headless/orphaned
Chrome instances present). Server itself was confirmed responsive via direct `curl` throughout;
every affected control passed clean on retry.

## What this does NOT do

- Does not edit Confession attempt 1's generated scene or its preserved artifacts.
- Does not retry Confession or make any provider call.
- Does not change Julian's `register` obligation type or its own directive wording — untouched,
  separate mechanism.

## Branch status — all five Fate-card slots now have a successful generated Scene 2 sample

- Boundary: successful
- Reversal: successful
- Temptation: successful
- Silence: successful
- Confession: successful, design frame corrected dry (confessing-party fix, this document)

## Status

Dry, uncommitted at time of writing. No provider or image calls. No candidate prose edits. Cache-
buster bumped (`?v=20260922m-confession-confessing-party-fix`).
