# Confession Attempt 1 — Real Paid Success, One Design Finding (2026-09-22)

Roman, closing out the five-card capability sweep: "test Confession once, because it's the last
untested card slot and likely has its own shape: admission/charge becoming consequence rather than
concealment or silence." First and only Confession continuation test.

## Result — successful, one genuine design-level finding

Real cost: $0.094287 / $0.45 ceiling. 3 physical requests, all status 200 (one fewer round than
other attempts — no problem, just factual). Provider-authoritative (`cost_in_usd_ticks`) for the two
Grok calls: `grok-4-1-fast-non-reasoning` $0.0105484 + `grok-4-1-fast-reasoning` $0.0830947 ≈
$0.0936; estimated for the single `ministral-8b-2512` call, $0.00064395.

**Lane resolution — confirmed.** `chosen_aftermath_lane: "dohkar_preliminary_review"`, matching
Confession's own `eventFrameBySlot` mapping. No `[CG:PLANNER-GATE]` rejection — cleared first try.

**Obligation type — `register`, reported plainly as unvalidated.** The dispatched directive used the
`register` wording verbatim. This is the conservative default from `_INTR_OBLIGATION_TYPE`; this run
shows it did not cause an obvious failure, NOT that `register` is proven the correct standard for
Confession specifically — still a placeholder, per the standing caveat carried since the per-slot
policy work.

**Gates cleared without suppressing Lirael's agency.** `li_pressure_actor` present and grounded in
her real submitted line, not a generic substitute: beat 6 of the authored scene — "He registers the
blame I placed on the one who left me" — reflects what she actually said.

**Real consequence, not another round of interrogation or suspended mood.** The Dohkar halts further
questioning immediately and sets a concrete formal review: three days, "the Open," "before a Chayr
and two Dohkars."

**The design-level finding.** The planner's own `tactical_move` claimed *"Julian's confession
destabilizes his accuser position"* — but nothing in the reader's actual submission or the authored
beats shows Julian confessing anything. The reader's real submitted dialogue was Lirael's own line:
*"You're not the one who left me in the braided trees—she was."* — her own admission/deflection,
redirecting blame to an unnamed third party, not an admission FROM Julian. This traces to the
Confession slot's own pre-existing `eventFrameBySlot` text in `public/app.js` (predates this
session), which assumes Julian is the confessor. The scene still worked dramatically (the Dohkar's
response reads as real institutional consequence either way), but the "whose confession is this"
framing is internally inconsistent at the design level.

**Julian's registration — appropriate, does not take over the scene.** Beat 5: "Julian's posture
tightens... He registers the blame I placed on the one who left me" — restrained, register-
consistent; the Dohkar drives the actual consequence, not Julian.

**Canon/continuity — clean.** Dohkar, Julian, Seren, The Answer, "the Open," "a Chayr and two
Dohkars," "the Provast's inquiry" all consistent. No anachronistic-object leak in `pc_proxy_action`.

## What this does NOT do

- Does not edit the generated scene or any preserved artifact.
- Does not retry Confession.

## Branch status after this sample

- Boundary: successful
- Reversal: successful
- Temptation: successful
- Silence: successful
- Confession: successful, with the design-level finding above (fix tracked separately, dry-only,
  same day)

## Status

Real paid attempt, committed as a successful capability sample with a documented design finding.
`report_confession.json` / `scene2_raw_response_confession.txt` (the fixed-name files) hold the same
content as the `_attempt1` copies — this was Confession's first run this session, so there was no
prior committed baseline to protect.
