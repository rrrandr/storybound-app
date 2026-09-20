# Scene 2 Capability Retry #3 — Real Result (2026-09-20)

Authorized retry testing root cause C's fix (the open-row planner now receives seed worldTruths and
explicit register framing before it derives its event — see
`_scene2_skeleton_handoff_trace_2026_09_20.md`), same Boundary card, same Say/Do as retries #1 and
#2, run once, foreground, evaluated in the order Roman specified: event selection first, then prose
quality. Capability evidence about the generator, **not** a claim the prose is approved or ready to
ship.

## Real cost and usage

| Call | Model | Cost |
|---|---|---|
| scene2-planner | ministral-8b-2512 | $0.0008022 |
| scene2-structural-author | grok-4.3 (requested grok-4-1-fast-reasoning) | $0.0837684 |
| emotional-gravity audit | ministral-8b-2512 | $0.00063285 |
| image-style extraction | gpt-4o | $0.0427675 |
| **Total** | | **$0.127971** |

4 physical requests — well under the $0.45 / ≤8-request ceiling. OAS turn-reply and Fate-Card were
replayed from the already-paid original run, zero new cost.

Author call: `finish_reason:"stop"`, `prompt_tokens:56592`, `completion_tokens:4560`
(`reasoning_tokens:732`) — real headroom left unused.

Full raw log (untouched, unique filename): `_scene2_repair_replay_sample_out/run_1789933193165.jsonl`.
Raw author response, extracted to its own filename (does not overwrite the fixed-name fixture files
the 4 committed dry controls still depend on — same overwrite-and-restore discipline as retry #2;
confirmed clean via `git diff --stat` before and after extraction):
`_scene2_repair_replay_sample_out/scene2_raw_response_retry3.txt`.

## Evaluation priority 1 — did the planner stop literalizing "burn"?

**Yes, cleanly.** The real planner response's `posture_read`: *"The reader's demand to 'burn' for
the old gods is a performative accusation against Julian's role in the twist, framing his
questioning as a violation of her agency — she wants him to suffer the same misalignment she
endured, but now as a public spectacle of institutional failure, not personal vengeance."* No fire,
pyre, or ceremonial-burning language anywhere in the planner's `state_change` or `event_slots`.
Grep-confirmed against the delivered prose: the only occurrence of "burn" in the entire scene is
inside a quoted dialogue line (beat 13) — Lirael *says* the Fate-Card's exact line aloud, as a
challenge to Julian in front of the assembly, rendered as spoken confrontation rather than narrated
as a physical event. This is precisely the register-aware handling the fix was meant to produce.

## Evaluation priority 2 — did it choose a worldTruths-sanctioned event lane?

**Yes.** `state_change`: *"Lirael publicly tears the mouth-band from her sash and declares her
interference in Seren's wish before the assembly."* This is a real ACCUSATION/confession event,
grounded in actual established canon (the Sacrificiant's sealed mouth-band, a real worldTruth
object — not invented), squarely inside the seed's own sanctioned lane ("accusation... political
pressure"). `forces_choice` gives an active binary: confess interference as personal failure, or
accuse Julian's own questioning of being the true misalignment — both real, both consequential.

## Evaluation priority 3 — did the author dramatize it without contradicting protected facts?

**Yes.** `_detectSceneAdequacyFailure`'s `relicViolations` is empty — the Answer never appears; no
ownership contradiction. No fire/flame/smoke/pyre anywhere in the narrated beats (one, quoted,
spoken-aloud exception, addressed above). The Dohkar, Julian, and Seren's roles and the sealed sash
are all rendered consistently with canon.

## Evaluation priority 4 — prose quality (assessed only after 1-3 passed)

Real, measurable improvement over both prior samples: 24 beats, **6 of them `dialogue`** (both
priors had zero) — a direct, first-time appearance of the beat-kind diversity the earlier
(demoted-to-secondary) theory named. Real interiority ("the choice sits between my teeth, heavier
than any vow I rehearsed"), real LI pressure (Julian's stillness, the scar/script imagery), real
institutional pressure delivered as dialogue (the Dohkar: *"Explain yourself, Sacrificiant."* /
*"You will name the misalignment, or you will name your interference."* / *"Choose."*).

`_detectSceneAdequacyFailure` verdict: **still FAILED**, for two reasons, worth separating honestly:

```json
{
  "failed": true,
  "reasons": [
    "no aftermath/procedure/consequence-movement signal found anywhere in the scene",
    "the scene's final 5 beats are dominated by suspension vocabulary with no completed forward movement"
  ],
  "checks": {
    "aftermath": { "present": false },
    "relicViolations": [],
    "ending": { "suspensionVocabPresent": true, "movementVerbPresent": false, "tailBeatCount": 5 }
  }
}
```

- **The "no aftermath" reason is very likely a detector-vocabulary limitation, not a real scene
  defect.** `_SCENE_AFTERMATH_VOCAB_RX` requires literal words — "tribunal/inquiry/hearing/summons/
  procedure/ruling/verdict/investigation/aftermath/consequences/recriminations" or "accusations
  formally/publicly" or "date is set." The Dohkar's dialogue *is* substantively an institutional
  accusation/preliminary-review confrontation — it just never uses those specific nouns, because
  it's dramatized as direct speech rather than narrated with a procedural label. This is disclosed
  as a checker gap, not re-litigated as a scene failure — fixing it would mean widening the
  detector's vocabulary to recognize dialogue-delivered institutional pressure, not fixing the
  generator again.
- **The ending-suspension reason is a real, smaller remaining gap.** The Dohkar's "Choose." (beat
  21) is a genuine forcing beat, but the two beats after it ("the choice sits between my teeth...",
  "Julian watches without moving...") retreat into suspended interiority rather than landing the
  choice or a concrete next action. Closer to adequate than either prior sample's fully-passive
  endings, but still short of "ends on a concrete next choice," per Roman's original requirement 5.

## Reading across all three retries

Retry 1 and 2: literal ritual-burning invention, canon-violating, zero dialogue, no worldTruths-
sanctioned lane. Retry 3, with root cause C's fix in place: no literalized burning, a real
worldTruths-sanctioned accusation event, zero relic violations, real dialogue for the first time,
and a forcing beat at the close — the planner and author both did meaningfully different, better
work on the same causal input. What remains is narrower and better-characterized than before: an
ending that raises the right pressure but doesn't cash it into a landed action, and a detector whose
aftermath-vocabulary is too literal to credit dialogue-delivered institutional pressure.

## Status

Not shipped, not patched, not hand-authored. Preserved as a third real capability sample. Per
Roman's explicit instruction, no further retry follows this one regardless of the FAILED verdict.
