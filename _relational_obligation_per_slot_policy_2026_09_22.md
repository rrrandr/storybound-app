# Per-Slot Relational-Obligation Standard: Temptation vs. Boundary (2026-09-22)

Roman: "If the relational-obligation gate now engages on Boundary too, we need to decide whether
that is desired... Boundary is still relationship-bearing if the submitted line is charged toward
Julian, but the valid response can be much more restrained... It should not require the same kind
of active LI pressure that Temptation does." Instruction: diagnose why, decide the policy
deliberately (not per-card uniformly), update the mechanism to be per-slot, update the two older
controls honestly, prove distinctness with real fixtures. No provider calls, no retry.

## 1. Why Boundary now trips the gate

Traced in the prior pass's own trace doc (`_attempt10_dry_fixes_2026_09_22.md`): before the
Julian-label fix, `_relationalObligationForPosture`'s target always resolved to the generic
fallback string "the love interest" — which never literally appears in any real reply's own
`present` array, so the check's `targetPresent` guard could never match, and the relational
obligation was silently inert for every card, not just Boundary. Fixing the label bug is exactly
what lets the target correctly resolve to "Julian," and, as a direct and correct consequence, the
already-existing, always-generic relational-obligation check can now actually engage wherever it
was designed to — including Boundary.

## 2. Is Boundary relationship-bearing here? Yes — decided, not assumed

Boundary is submitted through the exact same mechanism as Temptation: a committed
`oas_interrupt` ledger entry, inside the same live intimate exchange with the same love interest.
Nothing about the MECHANISM distinguishes the five cards — `_INTR_SLOTS`' own generic descriptions
("Cross the next threshold" / "Name the want") are all charged, all addressed at the LI within the
same scene. The real content proves it too: retry 11's real Boundary plan already has JULIAN
himself crossing the circle and naming himself before her — hardly a card with no relational
stakes. Boundary is relationship-bearing. What differs is not WHETHER it obligates a response, but
HOW MUCH the response must show.

## 3. The two standards, defined separately

- **Temptation — `'active'`** (unchanged, evidenced by real attempts 5/6/9/10): the LI must
  visibly register, answer, resist, or be affected via dialogue, a felt reaction, a refusal, or a
  charged restraint that is ITSELF a response — never silence alone, never absence.
- **Boundary — `'register'`** (new, decided here): restrained recognition, a controlled refusal,
  silence described AS visible pressure (not silence left unremarked, which still reads as
  absence), or a procedural deflection — as long as the LI visibly registers the player's
  challenge. Never requires active romantic engagement.
- **silence/reversal/confession — default to `'register'`**, explicitly NOT because their own
  semantics have been individually decided (no real attempt has tested any of them against this
  mechanism), but because `'register'` is the more conservative standard, and each of their own
  card descriptions reads as at least as restrained as Boundary's. Flagged for revisiting on real
  evidence, matching this whole mechanism's "never assume, only decide from real data" discipline.

## 4. The generic mechanism

`public/app.js`:
- `_INTR_OBLIGATION_TYPE` — new, keyed by the same generic `_INTR_SLOTS` keys, never story-specific
  (`{temptation: 'active', silence: 'register', reversal: 'register', boundary: 'register',
  confession: 'register'}`).
- `_relationalObligationForPosture` now also returns `obligationType`, resolved from the raw slot
  key (or `'register'` for a custom, no-card submission — same conservative-default reasoning).
- The planner's schema-request directive now renders genuinely different guidance per type — the
  `'active'` wording is unchanged verbatim; `'register'` explicitly allows silence-as-pressure and
  procedural deflection, explicitly never requiring dialogue or a felt reaction.
- `_validateLocalObjective`'s mechanical floor (non-empty + minimum length) is DELIBERATELY
  unchanged for both types — it exists to catch an omitted/placeholder field, not to judge semantic
  register, and both types genuinely need some non-trivial content. Only the rejection message now
  names which standard applied (`(active)` / `(register)`), so a future diagnosis never has to
  re-derive it.

## 5. Updating the two older controls — honestly, not suppressed

Both `_scene2_aftermath_lane_control.mjs` (retry 11's real reply) and
`_scene2_planner_function_gate_control.mjs` (retry 4's real reply) drive a REAL Boundary submission
through the real pipeline with a stubbed planner reply that predates the relational-obligation gate
entirely. Per the policy decision above (Boundary IS relationship-bearing), each fixture gets a
`li_pressure_actor` added — not invented from nothing: retry 11's own event already has Julian
crossing the circle and naming himself; retry 4's own `stage_affordances` already anticipates
"Julian can respond... with a visible reaction (e.g., a shift in his posture...)". Each added line
realizes exactly that already-present content, register-shaped, not a new claim. Both were 22/22
and 10/10 before the label fix, dropped to 21/22 and 9/10 once it correctly re-engaged the gate,
and are 22/22 and 10/10 again now — restored honestly, not by suppressing the check.

## 6. Proof — distinctness, not just classification

New section I, `_relational_obligation_contract_control.mjs`:
- Temptation resolves `obligationType: 'active'`; Boundary resolves `'register'`; Silence (no real
  evidence yet) defaults to the conservative `'register'`, not assumed `'active'`.
- The two prompt-directive wordings are genuinely different text, source-traced (not merely
  parameterized labels): the `'active'` branch's "never silence alone and never absence" and the
  `'register'` branch's "silence described AS visible pressure" both present, distinct strings.
- **TEMPTATION RED**: the real attempt-5 reply with `li_pressure_actor` removed is rejected, reason
  explicitly names `(active)`.
- **BOUNDARY RED**: a Boundary plan with NO `li_pressure_actor` at all is STILL rejected under
  `'register'` — the looser type is not an exemption, reason names `(register)`.
- **BOUNDARY GREEN**: the exact shape Temptation's own wording forbids — "Julian says nothing, but
  he does not look away either — the silence itself is the answer the assembly reads" (silence,
  explicitly framed as pressure, no dialogue, no felt physical reaction) — PASSES under
  `'register'`. This is the concrete proof the two standards are distinct in practice, not only in
  classification: content that would fail Temptation's own wording passes Boundary's.

## Proof — full suite

`_relational_obligation_contract_control.mjs`: 47/47 (was 39/39 — 8 new checks). Both restored
controls: `_scene2_aftermath_lane_control.mjs` 22/22, `_scene2_planner_function_gate_control.mjs`
10/10. `_scene2_lirael_defensive_path_lane_semantics_control.mjs`: 22/22, unaffected.
`_planner_function_gate_diagnosis_control.mjs`: attempts 6/9/10 unaffected (6 still correctly
rejected, 9 and 10 still correctly pass). `_continuity_spine_dry.mjs`: 69/80, identical 11
pre-existing failing test names, no additional failures.

## What this does NOT do

- Does not decide silence/reversal/confession's own obligation type from real evidence — they
  inherit the conservative default, explicitly flagged as undecided, not settled.
- Does not add a mechanical distinction beyond the shared floor between 'active' and 'register' —
  the difference lives in prompt guidance and classification; the floor (non-empty, minimum length)
  is deliberately identical for both, since it guards against omission, not semantic depth.
- Does not touch the lane-instantiation gate (`_detectPlannerFunctionGap`) or its own recent fix —
  a completely separate mechanism, untouched this pass.
- Does not run any paid call, retry Temptation, or edit any candidate prose.

## Status

Dry, committed. No provider or image calls. No candidate prose edits. Cache-buster bumped
(`?v=20260922i-per-slot-obligation-type`).
