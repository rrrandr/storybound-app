# Silence Attempt 3 — Real Paid Success (2026-09-22)

Roman: "That's a real success. I'd have Claude commit it as a successful Silence capability
sample." First fully successful Silence continuation sample: the frame-based causal-legibility fix
proved out live, on the actual thing it was built to fix.

## Result — success

Real cost: $0.10011185 / $0.45 ceiling. 5 physical requests, all status 200. Provider-authoritative
(`cost_in_usd_ticks`) for the three Grok calls (grok-4-1-fast-non-reasoning $0.0116534,
grok-4-1-fast-reasoning $0.08258465, grok-4.20-0309-non-reasoning $0.00489715 — combined
~$0.09914); estimated for the two small Mistral calls (ministral-8b-2512 $0.0006309 +
$0.00034575).

**CAUSAL LEGIBILITY fired via the resolved event frame, not the precondition string — confirmed,
not assumed.** This run's real `state_change_precondition` was "The presiding Dohkar has not yet
announced any preliminary review date or terms before the assembly." Ran that exact string through
the non-action detector regex in isolation: no match. The directive appeared in the real dispatched
request anyway, because the resolved lane's own `eventFrame` text ("...is what prompts the
presiding Dohkar...") triggered it — the primary, frame-based signal doing exactly the job it was
built for, independent of how the planner happened to phrase precondition this run.

**Julian correctly stayed in `register`, not Temptation's `active` wording** — dispatched directive
confirmed; `li_pressure_actor`: "Julian registers the rasp of Lirael's teeth on the lace with a
single controlled glance, his shoulders settling as he absorbs her wordless refusal without
stepping forward" — restrained, no dialogue, no active pursuit.

**The authored prose makes the causal link explicit, not merely sequenced** — beat 2: *"The words
land because I stayed silent."* A direct, unambiguous statement tying the Dohkar's procedural
announcement to her silence — the clearest of the three Silence attempts on this exact axis.

**Concrete consequence + clean forward choice, no repeated dilemma** — "A preliminary review will
be held at the next turning of the moons," "Terms will be set by the Dohkar council alone" (specific
procedural content); closing dilemma stated once (beat 19), with a distinct, non-repeated closing
line (beat 22: "I taste iron and know the cost has not yet been named").

**Canon/continuity clean** — "next turning of the moons" matches established Fatelands lunar
time-telling; Dohkar, Julian, Seren, The Answer all consistent; no anachronistic-object leak in any
`pc_proxy_action` this run.

## Known diagnostic limitation, noted and deliberately NOT fixed this pass

The diagnostic proxy `_causalLinkBeatsCoOccurrence` scored this run `{ applicable: true, ok: false
}` — a false negative. Beat 2's "The words land because I stayed silent" ties the causal claim to
"the words" rather than to a literal response-category keyword (review/hearing/ruling/etc.) in the
SAME beat, so the coarse same-beat co-occurrence check missed it despite the actual prose being
unambiguous. Roman: "Don't chase it now; the prose itself is clearer than the proxy. If Claude
starts 'fixing' that diagnostic immediately, we'll get dragged into another regex swamp for no
product gain." Left exactly as-is — diagnostic-only, never blocking, already documented as a
coarse necessary-but-not-sufficient proxy; this is a known, accepted limitation, not a defect to
patch in this pass.

## What this does NOT do

- Does not edit the generated scene or any preserved artifact.
- Does not fix the diagnostic's same-beat limitation.
- Does not run another paid call.

## Branch status after this sample

- Boundary: successful
- Reversal: successful
- Temptation: successful
- Silence: successful
- Confession: untested

## Status

Real paid attempt, committed as a successful capability sample. `report_silence.json` /
`scene2_raw_response_silence.txt` (the fixed-name files) remain restored to attempt 1's committed
content, unaffected by this run.
