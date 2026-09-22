# Temptation Attempt 4: Tracing the Omitted Gaze and Julian's Thin Response (2026-09-22)

Roman: "reference-image style extraction now uses Gemini... return to Temptation's unresolved
result: the submitted gaze/action was omitted and Julian never meaningfully responded. Don't
classify thin dialogue as inherent to CG formatting; the format permits substantive dialogue. Trace
those omissions through the actual player input, accepted plan, and author prompt before proposing
another paid test."

Pure trace. No code changes, no paid calls, no candidate prose edits. Every quote below is read
verbatim from the real, persisted request log (`_scene2_repair_replay_sample_out/run_1790040773323.jsonl`)
and the corresponding `public/app.js` source — not reconstructed from memory or inferred.

## The chain, traced stage by stage

### 1. The player's actual input (typed during the OAS turn, before the Fate-Card interruption)

```
SAY: "Then step forward, Julian. But do not call it rescue when you want me to ask."
DO:  "I keep my hands folded at my waist and meet his eyes across Seren's bowed head,
      refusing to give the assembly the satisfaction of looking away."
```

This is the harness's fixed `REAL_SAY`/`REAL_DO` input, submitted via `#gnActionInput`/
`#gnDialogueInput` → Submit, exactly as a real player's OAS turn would be.

### 2. The planner receives it — and correctly synthesizes it

The planner's own dispatch (first real call, `max_tokens: 1200`) carries it in TWO places:

- **`RECENT OAS EXCHANGE`** block (archived turn history, world-register-transmuted by the app's
  own dialogue-transmutation layer):
  > "PLAYER: Step forward then, Julian. But name it not rescue when your hunger bids me ask. / I
  > keep my hands folded at my waist and meet your eyes across Seren's bowed head, refusing the
  > assembly any satisfaction of retreat."
- **`READER'S SAY/DO for this scene`** (a SEPARATE field — the Fate-Card's own short flavor
  dialogue, not the OAS exchange): action `"**"`, dialogue `"Let the wind of your breath unravel
  me, as I've unraveled yours by oath."`

The planner's real, accepted output correctly synthesizes BOTH sources:
```
posture_read: "The reader steps forward with folded hands and defiant gaze, meeting Julian's eyes
  while owning the accusation through seductive language that reframes unraveling as mutual"
lane_posture_modulation: "The defiant, seductive posture makes Lirael conceal the fact while
  holding Julian's gaze, risking that her refusal to retreat reads as further manipulation to
  the Dohkar"
```
The gaze/eye-contact detail is present, specific, and correctly attributed here — **the planner did
its job.**

### 3. The author never receives it

Searching the author's own dispatch (second real call, `max_tokens: 8000`, 93,259 characters) for
any of: `RECENT OAS EXCHANGE`, `meet his eyes` / `meet your eyes`, `hands folded`, `posture_read`,
`lane_posture_modulation`, `holding Julian's gaze` — **zero matches** (the only incidental hits are
generic schema boilerplate: an enum listing "defiant" as one of many possible `li_expression`
values, and an unrelated style-guide example warning against "hands folded in laps" as a *bad*
visual register — neither is this scene's content).

What the author's prompt actually shows as the player's input:
```
PLAYER DID: "**"
PLAYER SAID: "Let the wind of your breath unravel me, as I've unraveled yours by oath."
```
— the Fate-Card's own flavor line, not the OAS exchange, and not the planner's posture synthesis
either. **The gaze, the hands, the refusal to look away — all of it — never reaches the model that
writes the scene.**

### 4. Root cause, located in source

`buildPlayerImpactDirective()` (`public/app.js` ~line 100870) builds the "PLAYER DID/SAID" block
from `state._playerImpactRead.raw.do` / `.raw.say`. `_computePlayerImpactRead()` has one
persisting call site (`~line 302668`, `_computePlayerImpactRead(rawAct, rawDia, act, dia)`, no
`noPersist` flag) sitting inside a GENERIC per-turn input processor — the same code path any
`act`/`dia` submission runs through, whether it's a real OAS free-text turn or a Fate-Card
selection. The harness's own Fate-Card flow fills `#gnActionInput`/`#gnDialogueInput` with the
card's own action/dialogue text and clicks Submit — exactly the same mechanism a real player's
turn uses. **Each submission overwrites `state._playerImpactRead` wholesale**, and only the LAST
one survives to author time. Since the Fate-Card selection happens AFTER the OAS-turn Say/Do
(chronologically the more recent "player move"), it wins — the richer, earlier OAS exchange is
silently discarded before the author ever asks for it.

This is a genuine, traceable **plumbing gap**, not a model-compliance failure: the data the author
needed was computed (by the planner) and available (in the OAS exchange archive), but the specific
channel the author's prompt-builder actually reads (`state._playerImpactRead`) had already been
overwritten by a later, thinner event by the time it got there.

## Julian's thin response — a second, related gap

The author's prompt DOES carry a real, explicit instruction on this exact point:

> **LI PRESENCE FLOOR (HARD — Roman 2026-09-21)**: if Julian is present in this scene, Julian MUST
> have at least ONE meaningful moment that affects the scene — a line of dialogue, a visible/felt
> emotional reaction, a refusal, an intervention, a procedural move, or a charged silence the room
> reacts to... It IS a requirement that Julian never simply stand in the room doing nothing while
> everyone else acts — **a bare "Julian has not moved" or "Julian says nothing" with no felt
> reaction underneath it is NOT enough on its own.**

The delivered scene's beat 22 is, almost verbatim, the exact forbidden phrase this rule names:
**"Julian has not moved."** The scene's one arguable qualifying moment is beat 13 ("Julian's silver
script shifts once across his wrist scar" — Weave-Script is this world's established emotional
tell), which may technically clear the rule's stated MINIMUM ("at least ONE meaningful moment").
But a floor set at "at least one" is not the same thing as "meaningfully responds" — and the
specific, higher-stakes hook the planner itself identified (`lane_posture_modulation`: holding
Julian's gaze risks her defiance "reading as further manipulation **to the Dohkar**" — a real,
specific narrative consequence tying Julian's presence to something at stake) never reached the
author either, for the SAME root cause traced above. The author had a generic minimum-floor rule,
but not the specific material that would have made clearing it feel substantive rather than
token.

## On "thin dialogue is inherent to CG formatting" — checked directly, and rejected

The author's prompt contains no dialogue cap, discouragement, or format-imposed ceiling anywhere.
It explicitly invites dialogue:
- **AUTHOR FLOOR, rule 4** (HARD): "DRAMATIZE CONSEQUENTIAL PRESENT SPEECH... When a character
  present in the scene makes a consequential wish, sacrifice, accusation, confession, command,
  vow, threat, or ruling, render the act itself in its natural in-scene form — direct speech...
  Do not replace it with retrospective summary merely because narration is easier."
- **SCENE DENSITY (CONTINUATION)**: "Give it FULL scene weight: real aftermath... enough DIALOGUE
  and INTERIORITY to carry it (this is not a declarative-only wrap-up — characters think, argue,
  and are changed by what just happened)."

Zero lines of Lirael's own dialogue and one non-verbal Julian beat is a **model choice within an
under-supplied prompt**, not a constraint the format imposed. My prior report's framing ("terse
staccato interiority consistent with this starter's established CG beat-format style") was
correct about the STYLE (short beats are this format's norm) but should not have been read as
excusing the THINNESS — the format permits, and this session's own AUTHOR FLOOR/SCENE DENSITY
rules actively invite, substantive dialogue; nothing here caps it. Given the author never received
the charged material (the gaze, the specific stakes) that would give a model something concrete to
dramatize between Lirael and Julian, the thinness is at minimum partly explained by data-starvation
— but the model also had the bare `state_change` and the LI PRESENCE FLOOR rule and chose the
sparsest compliant path anyway, which is a separate, real observation about model behavior under an
under-supplied prompt.

## Summary — where each omission actually originates

| Omission | Located at | Class |
|---|---|---|
| Reader's gaze/hands/refusal-to-look-away never reaches the author | `state._playerImpactRead` overwritten by the Fate-Card submission before the author reads it (root: `_computePlayerImpactRead`'s one persisting call site, `~line 302668`, sits in a generic per-turn pipeline both a real OAS turn and a Fate-Card selection route through) | **Plumbing gap** — data computed and available, never threaded to the author |
| Planner's own posture synthesis (`posture_read`, `lane_posture_modulation`) never reaches the author | Simply never rendered into the author prompt at all — `buildPlayerImpactDirective()` reads only `_playerImpactRead`, never the planner's stateChange object | **Plumbing gap** — same root, second symptom |
| Julian's response is technically-compliant but not substantive | LI PRESENCE FLOOR sets a floor ("at least one moment"), satisfied minimally by a Weave-Script shift; the specific stakes that would have made it land are the SAME posture data lost above | **Downstream of the same plumbing gap**, not a separate defect |
| Thin dialogue overall | Not format-imposed — actively invited by AUTHOR FLOOR + SCENE DENSITY — a model choice given an under-supplied prompt | **Partly data-starvation (same root cause), partly a raw model-compliance observation** |

## Status

Trace only. No code changes were made. No paid calls, no candidate prose edits. This report
identifies the mechanism (`state._playerImpactRead` overwritten by the Fate-Card submission before
the author reads it) precisely enough that a dry fix — threading either the RECENT OAS EXCHANGE
block or the planner's own `posture_read`/`lane_posture_modulation` fields into the author's
prompt — is now well-specified, but implementing it is a separate decision, not made here.
