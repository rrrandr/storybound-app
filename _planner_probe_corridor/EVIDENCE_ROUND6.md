# Corridor sample, round 6 — deterministic presence + prefilled staged_characters

One sequential corridor planner-only sample. **$0.00268 · 1 attempt, no retry · 0 Grok requests
dispatched · 0 escaped** (3 author attempts blocked at the route layer — the plan was ACCEPTED,
so the pipeline reached authoring for the first time in this series).

**Product result: ACCEPTED.** First corridor sample ever to pass validation.

## What the fix proved

Presence is now application state. The planner was never asked who is present — it received the
array already filled in:

```
"staged_characters": [
    { "name": "Lirael", "presence": "IN_PERSON", "anchor_beat": "<CONCRETE BEAT TO FILL>" }
  ]  (PREFILLED AND FIXED — ... Do NOT add a person, do NOT remove one, do NOT rename one ...)
```

and returned it echoed exactly, filling only the blank:

```json
[{ "name":"Lirael", "presence":"IN_PERSON",
   "anchor_beat":"braced against the doorframe, sleeve pressed to the carved oak door" }]
```

| required proof | result |
|---|---|
| narrator-only fixed presence | ✅ `presenceOwner=narrator-only`, `onStage=[Lirael]`, Julian offstage ("mention is not presence") |
| exact staged-cast echo | ✅ one entry, canonical label, presence unchanged |
| no invented identity **in the guarded fields** | ✅ staged_characters / C+ / fusion all clean |
| valid environment inventory | ✅ 4 concrete distinct elements, none copied from the prompt |
| one C+ per fixed staged recipient | ✅ exactly 1, for Lirael, `first_mention=true`, concrete angle |
| valid E+ and fusion | ✅ E+ `{carved oak door, ritual}` — a declared element; fusion concrete |
| inline verdict == product verdict | ✅ CONSISTENT |

## The invention did not stop — it MOVED

The scene pressure round 5 identified is unchanged, and the planner satisfied it through fields
nobody validates. **"Quinn" — an invented person — appears in four spine fields:**

```
opening_spine.interlocutor_placement : "Quinn — the magistrate's clerk, a woman who has known me
                                        since the dye-shop days, her silver-streaked braid ..."
opening_spine.scene_want             : "wants Quinn to notice the dye on my sleeves ..."
opening_spine.scene_mission          : "Convince Quinn to delay the verdict ..."
opening_spine.reader_state.must_not_confuse : "... (the magistrate, not Quinn) ..."
```

This is not a leak the fixed-cast validator missed — those fields are outside its remit. It is the
**prompt mandating the pathology**, in three places, for a scene whose cast is one person:

- `interlocutor_placement` — asks for NAME + RELATIONSHIP + TELL. Its own escape hatch ("Null only
  if no named character is engaging with the protagonist") is unreachable once the model invents an
  engager, and nothing gates the field on cast size.
- `scene_want` — "achievable through **human interaction in this room or this call**". A one-person
  room cannot satisfy this as written.
- `scene_mission` — the offered shapes are CONVINCE someone / EARN a person's trust / PROTECT
  someone. All require a second body.

**It is delivered.** `public/app.js:94607`:

```js
if (sk.interlocutor_placement) {
  directive += `\nINTERLOCUTOR ON FIRST MENTION (HARD): realize this on the FIRST time the
                 named character speaks or acts: ${sk.interlocutor_placement}\n ...`
```

So on a real run the Author would be handed a HARD directive to materialise Quinn — with a face,
per the FUSED COMBO-DESCRIPTOR rule — in a scene the product has correctly fixed to Lirael alone.
A `famous_fate` guard for exactly this exists at `app.js:253355` ("NEVER invent a proper name",
use an unnamed role-noun); the corridor path has no equivalent.

## Assessment

The presence architecture works and should stand: staging is deterministic, the echo is exact, and
the validator holds. What round 6 shows is that **fixing the field the model was scored on moved
the invention to the fields it was not**. The remaining problem is a prompt contradiction, not a
validator gap — a one-person cast is issued three simultaneous demands for a second person.

Options, for your decision (no code changed in response to this sample):

1. **Gate the three fields on cast size.** When the fixed cast is narrator-only, force
   `interlocutor_placement: null` in the template and re-word `scene_want` / `scene_mission` to the
   one-person shapes the prefilled block already names (action, place, anticipation, pressure).
   Smallest change; directly removes the contradiction.
2. **Extend the corridor to the role-noun rule** already shipped for Famous Fate — an unnamed
   "the clerk" is not an invented identity and cannot become a C+ recipient.
3. **Validate the spine's prose fields against the fixed cast**, rejecting any proper name that is
   not on it. Catches the class rather than these three instances — but rejects a plan for wording,
   which is closer to a competing author than a validator.

## Status

- Free suites: universal **74/74** · delivery **122/122** · compat **12/12**.
- Corridor: staging CLOSED; invention displaced to unguarded spine fields.
- Round-6 spend: **$0.00268**. Zero Grok requests dispatched, zero escaped.

No production code changed in response to this sample. No paid prose run. Nothing pushed.
