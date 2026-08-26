# Corridor sample, round 7 — after the solo-stage contradiction fix (`2859565`)

One sequential corridor planner-only sample. **$0.00287 · 1 attempt, no retry · 0 Grok requests
dispatched · 0 attempted · 0 escaped.**

**Required proof — NO INVENTED IDENTITY ANYWHERE IN THE PLAN: PASSED.**
**Product verdict: REJECTED**, for an unrelated structural miss (see below).

## The identity result

The only capitalised token in the entire normalised envelope — spine and skeleton, every field —
is `Lirael`.

```
ALL capitalised tokens in the plan: ['Lirael']
staged_characters : [{ "name":"Lirael", "presence":"IN_PERSON", "anchor_beat":"opening" }]
interlocutor_placement present? False
```

The three fields that produced "Quinn" in round 6 now read:

```
scene_want    : wants the ledger to stay closed so the accusations can't see the ink inside
scene_mission : keep the ledger unopened until the rival finishes speaking
reader_state.knows            : Lirael is ALONE in the guild hall antechamber, holding a sealed
                                ledger while a rival's voice rises outside the door
reader_state.must_not_confuse : the ledger is sealed and unread; the rival is speaking OUTSIDE
                                the room, not inside it
```

The want is object-and-procedure shaped and satisfiable by her alone. The mission is a
`RESIST / ENDURE` shape. Where round 6 invented a named clerk to have someone to convince, this
plan reaches for **an unnamed role-noun** — "the rival" — and then explicitly places them outside
the room. That is the sanctioned escape hatch behaving exactly as intended, and it is the
strongest available evidence that the failure was a schema contradiction rather than disobedience:
same model, same settings, contradiction removed, invention stops.

Template verified in the dispatched bytes (60 731 chars):

| check | count |
|---|---|
| `"interlocutor_placement"` in template | **0** |
| old clause "achievable through human interaction in this room or this call" | **0** |
| old mission shapes "A mission can equally be to CONVINCE someone" | **0** |
| solo want ("SATISFIABLE BY HER ALONE") | 1 |
| solo mission ("COMPLETE something, DISCOVER something…") | 1 |
| reader_state guard ("may NOT introduce a new named or embodied person") | 1 |
| solo-stage directive ("Only the narrator (Lirael) is physically present") | 1 |

No double-emission, no leftover branch.

## Why it was still rejected

```
VALIDATION : REJECTED — environment_plus MISSING — it is required every scene
skeleton keys returned: ['character_plus']     (no environment_plus, no fusion)
finish_reason: stop · 554 output tokens
```

The planner returned a complete, valid spine — including a good four-element
`environment_elements` inventory `["wax-sealed ledger","ceremonial table","melted candle stubs"]`
— and a correct single `character_plus`, then simply stopped without emitting `environment_plus`
or `fusion`. `finish_reason` is `stop`, not `length`, so this is not truncation against the
1800-token cap.

This is **not** an identity failure and **not** a template defect: both fields are still declared
in the dispatched template, verified above. Round 6 emitted both. n=1 either way, so this is
currently indistinguishable from planner variance, and one more sample (~$0.003) would settle it.

## One nuance worth recording

The solo directive forbids materialising "another person, **voice**, caller, messenger…". The plan
creates an unnamed **voice outside the door**. No identity is invented and the person is kept out
of the room, so the scanner correctly stays silent — but the letter of the directive was bent, by
the same scene pressure, through the one channel still open to it. Whether an offstage unnamed
voice is acceptable pressure or the next thing to close is a product call, not a validator gap.

## Status

- Free suites: universal **90/90** · delivery **151/151** · continuation compat **12/12**.
- Corridor: staging CLOSED · invented identity CLOSED · one structural miss outstanding.
- Round-7 spend: **$0.00287**. Series total: **$0.0394**. Zero Grok requests, ever.

No production code changed in response to this sample. No paid prose run. Nothing pushed.
