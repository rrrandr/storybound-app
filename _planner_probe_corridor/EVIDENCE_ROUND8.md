# Corridor sample, round 8 — the variance question, settled

One sequential corridor planner-only sample, same build as round 7 (`2859565`), no code changed
between them. **$0.00293 · 1 attempt, no retry · 0 Grok requests dispatched · 0 escaped**
(3 author attempts blocked at the route layer, because the plan was ACCEPTED and the pipeline
reached authoring).

**Product verdict: ACCEPTED. All seven scorecard columns green. Inline verdict == product verdict.**

## Round 7's rejection was variance, not a regression

Round 7 returned `scene_skeleton: ['character_plus']` and was rejected for a missing
`environment_plus`. Round 8, identical build:

```
skeleton keys: ['character_plus', 'environment_plus', 'fusion']
E+     : { "target":"the guild ledger", "axis":"damage" }
fusion : { "character":"Lirael", "target":"the guild ledger",
           "beat":"presses her palm flat against the ledger's spine, the parchment buckling under her weight" }
```

Same template, same model, same settings — the fields are emitted. The round-7 omission was the
planner dropping two optional-looking trailing fields on one draw, not damage from the solo-stage
change. No further action.

## Identity holds, and Julian behaves exactly as designed

Every capitalised token in the whole envelope: **`Lirael`, `Julian`, `Preserve`.**

- `Lirael` — the narrator, the entire fixed cast.
- `Julian` — the ESTABLISHED OFFSTAGE love interest, referenced in
  `reader_state.wondering`: *"why Julian's name keeps surfacing in her thoughts under pressure"*.
  A thought, not a body. He is not staged, gets no C+, no fusion, and never enters the room.
  This is the permitted case working: **a reference is not an entrance.**
  Note the scanner's possessive frame *does* fire on `Julian's name` — and correctly stays silent
  because Julian is in the known-name registry. The frame caught it; the registry cleared it.
- `Preserve` — sentence-initial verb in `scene_mission`. Not in any person frame, not reported.
  A live negative control, in real output rather than a fixture.

```
staged_characters : [{ "name":"Lirael", "presence":"IN_PERSON", "anchor_beat":"opening" }]
interlocutor_placement present? False
scene_want    : wants the ledger to stay intact until she can get it to the vault
scene_mission : Preserve the ledger's integrity before the rival finishes speaking
reader_state.knows : Lirael is ALONE in the guildhall loft, holding a guild ledger while a rival
                     denounces her lineage
presenceOwner=narrator-only · onStage=[Lirael] · offStage=[Julian] · fatal=None
```

The want is object-and-destination shaped; the mission is a `PRESERVE / ENDURE` shape. Both are
satisfiable by one person.

## The unnamed offstage voice recurs

As in round 7, the scene reaches for an unnamed **"rival"** who speaks from outside the room. Two
for two. No identity is invented and no body enters, so the scanner is right to stay silent — but
this is clearly where the residual scene pressure goes now, and it is consistent rather than
incidental. Whether an unnamed offstage voice is legitimate pressure or the next thing to close
is a product call, not a validator gap.

## Post-fix corridor tally

| round | invented identity | verdict | note |
|---|---|---|---|
| 6 (pre-fix) | **Quinn**, in 4 spine fields | ACCEPTED | staging correct, invention displaced |
| 7 | none | rejected | planner omitted E+/fusion — variance |
| 8 | none | **ACCEPTED** | full skeleton, all columns green |

Two consecutive samples with zero invented identity. Zero Grok requests across the entire series.

## Status

- Free suites: universal **90/90** · delivery **151/151** · continuation compat **12/12**.
- Corridor: staging CLOSED · invented identity CLOSED · structural miss was variance.
- Round-8 spend: **$0.00293**. Series total: **$0.0423**.

No production code changed in response to this sample. No paid prose run. Nothing pushed.
