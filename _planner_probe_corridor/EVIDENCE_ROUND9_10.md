# Corridor samples, rounds 9 and 10 — the second-person leak traced to its source

Two sequential corridor planner-only samples, one before and one after `d7ea080`.
**$0.00251 + $0.00264 · 1 attempt each, no retry · 0 Grok requests dispatched · 0 escaped.**

## Round 9 — the validator worked, and led to the real culprit

Verdict **REJECTED** by the new solo-interaction validator:

```
[SOLO_VOICE] opening_spine.reader_state.must_not_confuse
  — a voice belonging to someone other than the narrator: "an unseen voice"
```

Zero invented identities (`['Destroy', 'Lirael']` — the first is a sentence-initial verb). But the
plan contained **three** second-person passages and the validator caught **one**:

| passage | field | caught? |
|---|---|---|
| "the accusation is being read aloud by **an unseen voice**" | `reader_state.must_not_confuse` | ✅ |
| "the accusation **is being read aloud** as she walks in" | `pressure_source` | ❌ passive voice, no subject to match |
| "**the reader's voice** stumbles on the same syllable" | `rising_beats[1]` | ❌ possessive frame only fired on a/an/another |

Chasing the two misses found the actual source, and it was not the model. Under `HOT_CRISIS`,
`pressure_source` carried this as **REQUIRED PHRASING**:

> write this as an EVENT UNDERWAY IN THE ROOM RIGHT NOW — **someone is doing or saying it AT THIS
> MOMENT** (e.g. *"a rival is denouncing her to the room, mid-sentence"*, *"the accuser is in the
> doorway, still speaking"*, *"the summons is being read aloud as she walks in"*)

Round 8 returned *"a rival denounces her lineage."* Round 9 returned *"the accusation is being read
aloud."* **Those are the worked examples, echoed back.** `opening_beat` did the same job with
"a person present" and "a hand is already on her". We were requiring a second person in the room
and then rejecting the plan for having one — the same contradiction as the interlocutor field, two
fields over, and the strongest instance because it was flagged REQUIRED.

## Round 10 — after gating both fields, the leak is gone

Same probe, same model, same settings:

```
pressure_source : the rite must be finished before the light fails, and her hands will not
                  hold steady enough to mark the final sigil
opening_beat    : the wax cooling on the final sigil, her fingers trembling over the line
                  she cannot close
scene_want      : wants the final sigil to hold the light until the rite is complete
scene_mission   : finish the rite before the light fails
must_not_confuse: the wax is cooling, not hardening; her hands are shaking from exertion,
                  not fear; the light is fading naturally, not magically
capitalised tokens in the whole plan: ['Lirael']
```

**Both required invariants hold:**

- **No invented proper identity** — `Lirael` is the only name anywhere.
- **No unauthorised second body, voice or live interaction** — not one. No voice, no role-noun
  acting, no message, no dependency on another party. The pressure is a procedure under a
  world-deadline (the failing light) and her own unsteady hands. `must_not_confuse` is about wax,
  hands and light; there is no one else in it to be confused about.

This is the first corridor plan in the series that is clean on both axes. It went from
*"a rival denounces her lineage"* to *"her hands will not hold steady enough to mark the final
sigil"* on a template change alone.

## It was still rejected — for a third unrelated reason

```
VALIDATION : REJECTED — scene_skeleton is present BOTH at the envelope top level and inside
             opening_spine — refusing to choose between two skeletons
```

The planner emitted the skeleton twice. **The two copies are byte-identical.** This is the F10
envelope rule doing exactly what it was written to do, and it is orthogonal to staging, identity
and presence.

Worth flagging as a product question, not fixing here: F10 refuses "to choose between two
skeletons", but when the two are byte-identical there is nothing to choose. The neighbouring
F5–F7 rules reject byte-equivalent duplicate scalars/arrays/objects on the same principle, so the
behaviour is consistent and deliberate — relaxing it for the identical case would be a design
decision, not a bug fix.

## Post-fix tally — three rejections, three different one-off slips

| round | invented identity | second person | verdict | rejected for |
|---|---|---|---|---|
| 7 | none | unnamed voice (undetected then) | rejected | planner omitted E+/fusion |
| 8 | none | **"the rival" speaking** | ACCEPTED | — leak shipped |
| 9 | none | **3 passages** | rejected | solo validator (1 of 3 caught) |
| 10 | none | **none** | rejected | duplicate scene_skeleton |

No rejection since round 8 has been an identity or presence failure. The three causes were three
distinct planner formatting slips, none repeated.

## Status

- Free suites: universal **124/124** · delivery **173/173** · continuation compat **12/12**.
- Corridor: staging CLOSED · invented identity CLOSED · second body/voice CLOSED at content level.
- Outstanding: no single sample has yet been both content-clean AND structurally accepted.
- Spend: rounds 9+10 **$0.00515**. Series total: **$0.0475**. Zero Grok requests, ever.

No paid prose run. Nothing pushed. A/50 untouched.
