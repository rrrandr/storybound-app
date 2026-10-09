# Two traced causes, and narrow proposals (2026-10-09)

Provider-free; reads the saved run only. Nothing implemented. Scope: **Scenes 2-6**. Later-scene
quality is unknown.

## Corrections to my previous report

| claim | corrected |
|---|---|
| "Scene author calls: 54388 and 66146 ms" | calls **17/24/32/37/43 = 54.388, 66.146, 54.687, 43.392, 50.320 s** — mean **53.8 s**, all five |
| "Editor calls are sub-second" | OAS editor calls **9/11/13 = 2.574, 2.224, 2.259 s** — not sub-second |
| "43 calls dispatched" | **44 dispatched, 43 answered.** Call 44 (ministral, 12525c) is logged `DISPATCHED, NO RESPONSE: route.fetch: Request context disposed` |
| neither figure | **Neither measures the complete reader wait** — they are per-invocation latencies only |

Retained exposure reconciles with no write-off and no double count: the log states
`$0.000942 of reservations were still outstanding at exit and are carried as UNRESOLVED exposure,
not forgiven`, and that amount is already inside `unresolved to date $1.274519` and the
`$4.286365` total. Receipted this run $0.8752178; retained without receipt $0.032225.

## 1. Silence becomes spoken content — it is the card, not the author

`cards.json`, both selections, `cardId: "silence"`:

```
scene 2  submitted.dialogue = "(The thing you almost said folds back into your chest.)"
         submitted.action   = "My breath catches in my throat, the weight of the moment pressing down"
         provenance: UNKNOWN — one field matched a preview record, the other did not
scene 3  submitted.dialogue = "*mm*"
         submitted.action   = "Hold my breath, fingers tightening around the Answer"
         provenance: matched-response — identical to the preview reply served on call 27
```

That exact parenthetical is a literal in `public/fatecards.js` `getSilenceOptions`
(~1827). Every branch of that function puts a **second-person description of NOT speaking** into
the `dialogue` field:

```
(You don't say it. You don't know why.)
(Something in you decides not to speak.)
(The thing you almost said folds back into your chest.)
(You decide to say nothing. <LI> notices anyway.)
(You change the subject without speaking.)
(Your stillness is the answer.)
```

**The chain:** `getSilenceOptions.dialogue` (or, when the preview model fills the field instead,
`*mm*`) → the visible Say field → `submitted.dialogue` → the author payload's spoken line →
`LIRAEL: "..."` in the prose. Nothing downstream can tell this apart from typed speech: whatever
occupies the dialogue slot **is** speech by definition.

So the cause is structural — the Silence card encodes "says nothing" by writing a sentence about
silence into the speech field — and `*mm*` is the preview model doing as asked when it is handed a
dialogue field for a card whose meaning is "say nothing".

### Proposal (narrow)

1. Silence submits an **empty** dialogue. Its meaning travels in the action/narration slot, which
   already carries it ("My breath catches in my throat…"). An empty Say is exactly what silence is.
2. Keep the parentheticals as **reader-facing preview text** — they read well and tell the reader
   what the card does. Mark them as display-only so the submit path cannot promote them to speech.
3. Do not ask the preview model for dialogue on this card at all; that request is what produced
   `*mm*`.
4. No global ban on vocalizations, and no change to genuinely typed player speech.

## 2. Prose rhythm — the rule that wants variation is outranked

Measured, dialogue separated from narration, fixed deck-affordance paragraphs excluded:

```
NARRATION  n=109  mean 8.2 words  median 8  min 3  MAX 15  single-sentence 106/109 (97%)
DIALOGUE   n=11   mean 7.9 words  median 7  min 2  max 12  single-sentence 11/11 (100%)
```

Not one narration beat exceeds **15 words** in five scenes. Variation exists inside 3-15; the
envelope never opens.

The outgoing request (`wire/017_req.json`, 274,967 chars) already asks for the opposite, with
exemplars:

> LENGTH FOLLOWS THE MOMENT. … Give a moment ONE sharp sentence when that is all it needs, or let
> it open into a compact paragraph (commonly two to four sentences) when it earns the development.
> This is PERMISSION, not a target and not a minimum … **do not settle into a uniform rhythm of
> either.**
> A MOMENT THAT NEEDS ONE LINE: "He does not move to follow me."
> A MOMENT THAT EARNS DEVELOPMENT: "I press it into his palm before anyone can speak again. It is
> still warm from my own grip, and his fingers close over it without hesitation…"

So the instruction and its exemplars are present and are losing. What outranks them, in the same
payload:

1. `GRAMMATICAL CAPTIONS (HARD): every beat is a COMPLETE, readable sentence with its articles and
   verbs intact. **Terse is good**; telegram/headline-ese …` — a **HARD** rule that calls beats
   *captions* and blesses terseness, while the variation rule is labelled *PERMISSION*.
2. `INTENSITY — terse input stays terse but lands HARDER. … Don't force ornamentation onto a moment
   that's powerful BECAUSE it's spare.`
3. `DON'T OVERWRITE SHORT INPUTS (adaptive amplification): "kiss her." can stay almost "kiss her."
   — brevity is confidence … Terse input → terse transmutation.`
4. `The FINAL beat of the scene is EXACTLY ONE SENTENCE.`

(2) and (3) are written about the **player's submitted words** — the transmutation — but nothing
scopes them there, and every card-driven input this run WAS terse ("Hold my breath, fingers
tightening around the Answer"). The author appears to generalise "terse input stays terse" to the
narration it writes around that input.

### Proposal (narrow)

1. Take pacing language out of the grammar rule: `GRAMMATICAL CAPTIONS` should guard only what it
   is for — complete sentences, no headline-ese — and drop "Terse is good" and the word *captions*,
   which does pacing work inside a grammar rule and frames the unit as inherently short.
2. **Scope (2) and (3) explicitly to the transmuted player line**, not to scene narration.
3. Give the existing variation rule the same force as the rule that outranks it: state the uniform-
   rhythm prohibition as HARD, in the terms the measurement can check — *a scene whose narration
   beats are all one sentence has failed the rule* — without mandating multi-sentence beats,
   minimum lengths, padding, another polishing pass, or a blacklist of any word.
4. Leave `stillness` and the other recurrences alone for now: they are a separate signature-phrase
   problem, and banning lexis is the approach that has failed before.

**Writing quality cannot be verified provider-free.** These are proposals; whether they change the
prose is only answerable by a paid run, and I am not requesting one here.
