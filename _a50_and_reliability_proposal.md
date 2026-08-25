# A/50 correction + genre-profile split + transport-retry proposal

Free analysis. Nothing here is activated, wired, or implemented. 2026-08-25.

---

## 1. A/50 status — correction of the record

`_buildA50ModeDirective()` (app.js:95167) returns `''` unless `window._armA50 === true`. Nothing
in production sets that flag. **The A/50 COMMERCIAL ROMANCE MODE block has never shipped to an
author on the default path.**

What *does* ship is the narrower `MEANING FIRST, FEELING SECOND — the A/50 order` rule inside the
system voice layer. Confirmed against the captured live payload.

**Withdrawn claims.** Every earlier statement in this workstream that "A/50 reaches HEAVY and
HOTFAST", or that a Scene-1 test proved "A/50 intact", referred only to the order rule. The test
asserted `/A\/50|A-50|A50/`, which the order rule satisfies — a false positive for the mode block.
Assertions must target the header string `A/50 COMMERCIAL ROMANCE MODE`.

## 2. Duplication audit — A/50 block vs the live voice layer

Regex probe of the captured payload (system + user). Proxy matching, so treat as indicative.

| A/50 rule | Already in the live payload? |
|---|---|
| THE ONE LAW — write the moment, not the interpretation | **duplicate** ("never name a feeling an action could show") |
| Scene over summary | **duplicate** ("SHOW each stake, never state it") |
| Desire through choices, not declarations | **duplicate** ("write the choice, not the diagnosis") |
| Metaphor only when it reveals | **duplicate** ("never two figures of speech in a paragraph") |
| Use plain declarative prose freely | **duplicate** ("plain, concrete, unhurried") |
| Physical detail must be INTERACTIVE | absent — genuinely additive |
| Dialogue carries pressure | absent — genuinely additive |
| Do not manufacture tension (hitched breath, racing pulse, thickening air…) | absent — genuinely additive |
| Description is character-biased | absent as phrased; partially covered by the PC perception lens |
| Every paragraph advances one of four things | absent — genuinely additive |
| Calibration to two named works | absent — **and should stay absent** |

**Conclusion: roughly half the block is redundant.** Arming it as-is would re-send five rules the
author already has, at the cost of restating them in different words — which is the
re-expression-leak failure mode this project has already paid for. The five additive rules are
the part worth keeping.

**Conflict to resolve before arming:** the block's "DO NOT MANUFACTURE TENSION" bans the
environment reacting to attraction, while the romance layer asks for embodied attraction cues.
These are reconcilable (one strong response, not five) but the wording must be merged, not
stacked.

**Genre assumptions embedded in the block:** it is written as *contemporary/mainstream romance*.
"CALIBRATION … the forward pull and accessibility of bestselling romantic fantasy (A Court of
Thorns and Roses) and mainstream romance (Fifty Shades of Grey)" ties craft to two named works;
"boardroom's HVAC chill" style examples assume a modern setting. Applied unchanged to Fatelands
this pulls prose toward modern-realist register — the exact drift the FORBIDDEN COLLAPSE PATTERNS
line already fights.

## 3. Proposed split — shared core + five profiles

Named works and author imitation are removed entirely. Each profile is expressed as **original
craft characteristics**: what the sentences DO, not who they sound like.

### Shared intimacy core (applies to every profile)
- Write the event that causes the feeling; never the summary of the feeling.
- Desire is legible through what a character chooses, risks, or declines — not through declaration.
- Physical detail happens BETWEEN people and changes something. Description that only decorates a
  body is inert.
- One strong physical response beats five weak ones. No stacked autonomic signalling (breath,
  pulse, ribs, narrowing world) and no environment reacting to attraction.
- Dialogue applies pressure: provoke, evade, deflect, lie, interrupt. Do not wrap every line in
  interpretation.
- Every paragraph advances action, dialogue, discovery, or decision. Pure atmosphere is rare.

### Fatelands / romantic-fantasy profile
Sensory grammar is material and pre-industrial: cloth, stone, weather, ceremony, growing things.
The strange is rendered as ordinary and lived-in — a rite has procedure and etiquette before it
has wonder. Power is social and ritual, so status shows in who speaks first, who is permitted to
touch, and what a silence costs. Comprehension debts are paid in-scene: the reader learns why the
forbidden thing is forbidden by watching it matter, never by exposition.

### Historical profile
Constraint is the engine: what a character *may* do is narrower than what they want, and the gap
is the drama. Objects carry ownership and labour. Register is period-plausible without pastiche —
modern idiom is the failure, archaic decoration is the other failure. Propriety is a pressure
system; a violation is an event.

### Modern profile
Interruption is structural — phones, notifications, third parties, logistics. Money, work and
scheduling are real forces, not backdrop. Intimacy is negotiated in fragments across a day.
Vocabulary is contemporary and unmarked; specificity comes from brand-free concrete detail.

### Sci-fi profile
The rules of the world are demonstrated through use, never through explanation. Technology is
mundane to those who live with it and only strange to the reader. Bodies are mediated — by
augment, distance, interface, or delay — and intimacy has to cross that mediation. Consequence is
systemic: a personal choice propagates through infrastructure.

### Dystopian / post-apocalyptic profile
Scarcity governs sentence content: what is counted, rationed, hidden, or spent. Trust is the
scarcest resource and the central romantic stake. Surveillance or exposure shapes where intimacy
is possible at all. Tenderness is an act with a cost attached, and the cost is visible.

### Suggested activation path (not taken)
1. Strip the five duplicate rules and the named-work calibration from the block.
2. Merge the manufactured-tension ban with the romance layer's embodiment ask into one rule.
3. Ship the shared core only, behind the existing flag, and A/B it blind against the control —
   the standing evidence is that addition hurts and subtraction helps, so the core must earn its
   place before any profile is added.
4. Only then trial ONE profile (Fatelands), blind, against the same control.

## 4. Transport-only retry — proposal with costs

**Scope.** Retry exactly one additional planner request, and only for:
- a network/connection failure (no HTTP response),
- HTTP 429,
- HTTP 500/502/503/504.

**Never retried:**
- any response that arrived successfully and failed to parse (HTTP 200, malformed JSON),
- any response that parsed and failed semantic validation.

Those stay hard faults. A retry there would be a second author, which is the thing this
architecture forbids.

**Behaviour.** Respect `Retry-After` when present (seconds or HTTP-date), else one fixed backoff
(~2s). Maximum one retry, so at most two planner requests per story. `[SCENE1:PLANNER:RETRY]`
logged with the status and the wait. If the retry also fails at transport level, the existing
ABORT fires unchanged.

**Cost — measured, not estimated.** From the captured planner call: `prompt_tokens 22189`,
`completion_tokens 804`. At the in-repo rate for `mistral-small-latest` ($0.15/MTok in,
$0.60/MTok out):

```
22189 × 0.00000015  =  $0.00333
  804 × 0.00000060  =  $0.00048
                       -------
one planner call    ≈  $0.0038
```

**Request-count implications**
- Happy path: **unchanged** — exactly one planner request. The "exactly one planning request"
  contract holds for every successful story.
- Transport failure: at most two. Bounded, never a loop.
- Malformed or invalid plan: still exactly one. Zero added spend.
- Expected added spend per story = (transport failure rate) × $0.0038. At a pathological 25%
  failure rate that is **$0.00095/story**, about 0.3% of the ~$0.31 scene cost.

**Why it is worth it.** Under the current hard-abort semantics a transient 429 costs the entire
opening — a full story failure for a condition that resolves in seconds. A 429 was observed live
today. The trade is a fraction of a cent against losing a paid story.

**Recommendation.** Implement as scoped above. It does not weaken any semantic guarantee, because
it cannot fire on a response the model actually returned.
