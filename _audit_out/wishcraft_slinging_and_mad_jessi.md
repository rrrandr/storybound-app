# WISH-SLINGING, THE FORMULAS, AND MAD JESSI
Canon addition 2026-10-13. Lore memo for the material now shipped in `public/app.js`.
[C]=existing canon in code · [NEW]=added here · [P]=assessment made here, open to revision

WHERE IT LIVES — one definition each, no duplicates:
  `_buildFatelandsWishSlingingDirective(sceneText, opts)`  self-gating on `_WISH_SLINGING_RX`
  `_buildMadJessiDirective(sceneText, opts)`               self-gating on `_MAD_JESSI_RX`, TWO TIERS
  `_buildWishcraftPlanningCheck()`                         unconditional, SPINE only, Fantasy only
Control: `_wish_slinging_lore_control.mjs` — 55/55, with the negative cases as the point.

## 1. WHY THESE ARE GATED AND NOT ALWAYS-ON
The wish-canon block states its own architectural law at `app.js:238096`: *"a prompt layer should
exist because it CHANGES THE MODEL'S DECISIONS in the scenes where it fires — NOT because the
information belongs to the same topic."* Tournament culture does not change how a model writes a
scene about grief. So both modules self-gate, and the control proves silence on an ordinary
breakfast, a quiet walk, and grief with no craft in it.

THE JESSI GATE IS NARROWER THAN THE SLINGING GATE, on purpose. My first draft triggered on bare
`legend`, `greatest`, `vanish`, `disappear` and `retir` — all ordinary English. Over-firing there
is not a token problem, it is a CONTENT problem: hand an author a famous name and a character will
eventually mention him. He now fires only when NAMED, when his title is used, or when Lytharyn is
in play. Six negative cases lock that in, including "he disappeared into the crowd".

## 2. THE SHAPE OF THE SKILL  [NEW]
Chess supplies the strategy; rap battle supplies the delivery; the sacrifice makes every move
consequential. A slinger is not merely fast — they recognise situations, anticipate replies, and
know which familiar formula can be safely altered and which alteration could ruin them.

RHYME IS A MNEMONIC AND NOTHING ELSE. It helps a frightened person remember wording when they
cannot think. It grants no bonus and no protection. **A rhyme is not a safety rating** — which is
the single most load-bearing line in the module, and §4 is built to prove it.

EXPERTISE, beyond vocabulary and speed: assessing alignment · choosing an affordable sacrifice ·
reading an opponent's intention · **preparing the circumstances the next wish will need**. The last
is the mark of a master, and most of a duel is won before anyone speaks. (It also, later, becomes
the explanation for Jessi's anonymity — §6.)

FOUR TIERS OF FAMILIARITY, so "everyone can wish" never means "everyone is trained":
| tier | repertoire | cultural analogue |
|---|---|---|
| children | a small emergency set | first aid, drilled and mostly never used |
| most adults | three to five formulas, reliably | …and they fumble a sixth |
| beginning student | ~a dozen standard openings | learned WITH scope and cost, not the rhyme alone |
| expert slinger | large, plus counters and combinations | **the notebook** of revised wordings |

The notebook is the characterising object: crossings-out, a price that proved too high, a line that
worked once and is circled twice.

## 3. THE SIX EVERYDAY FORMULAS  [NEW]
Central-Fatelands register (hair, lashes, dreams, taste, a tune). Each reconciled against shipped
law rather than accepted because it scans:

1. **Kettle-warming** — "Warm my kettle, spare me care; / take this offered strand of hair."
   [C] Order ② temporary aid, Fate WELCOMES.
2. **A precarious step** — "Steady feet upon this stair; / take from me this strand of hair."
   Order ②. Same offering because the ask is the same size.
3. **A small flame** — "Let this little ember die; / take a lash beneath my eye." Order ②. For an
   ember. Not for a burning house.
4. **A shallow cut** — "Let this shallow bleeding cease; / take tonight's sweet dreams for peace."
   Order ① restoration, welcomed — **and its scope is in its own first line.** It says SHALLOW. A
   frightened person reaching for it over a mortal wound is a recognisable kind of tragedy.
5. **A misplaced belonging** — "Bring my missing key to sight; / take my taste of sweet tonight."
   Order ③ revelation, welcomed. **[P] WHY IT IS WELL MADE: it asks to SEE, not to RECEIVE.**
   [C] NO OBJECT FROM NOTHING means Fate conjures and carries nothing, so a formula asking for the
   key *in hand* would reach past what Fate readily does. "To sight" stays inside the law. This is
   the craft in one word, and it is the best teaching example in the set.
6. **Calling for help** — "Let my cry find someone near; / take the tune I hold most dear."
   Order ⑤ fortune — RISKY, for two reasons a teacher names aloud. [C] FATE GOVERNS EVENTS, NEVER
   CONSENT: Fate can arrange that someone is within earshot; it can NEVER arrange that they choose
   to help. And "someone near" never says WHO. The person who comes may be the last one you wanted.

**[P] SMALL PRICES ARE STILL REAL.** Hair and lashes regrow, which is exactly why they pay for
trivial aid and nothing more: what is given is *gone from the giver*, satisfying [C] CONSERVATION
without pretending a strand of hair buys anything large. "The tune I hold most dear" is a real
remembered tune the wisher may lose — and a child offering it for a warm kettle has been badly
taught.

**REGIONAL REGISTER IS NOT UNIVERSAL** [C: LOCAL CURRENCY]. These are central-Fatelands sayings.
First Favored instruction runs on **memory and emotion** — "take the name of a street I walked
once", "take my pleasure in the first cold morning", "take how my mother's voice sounded saying my
name". A First Favored child offering hair reads as foreign, ill-taught, or deliberately
provocative.

## 4. THE TWO RHYMES THAT ARE TAUGHT IN ORDER TO BE UNLEARNED
Roman's additional formulations, assessed honestly as asked — and they turn out to be the module's
teaching centre rather than development offcuts.

**"Ward my health, for a day's wealth."** [P] Both halves are unbounded. Warded against *what*,
for *how long*? A *day's* wealth measured against *whose* day? Open scope with an unanchored
quantity is an invitation to a warp. Verdict: a folk charm, not an opening. It belongs on a street,
not in a curriculum.

**"Give me skill to win for the pain of a pin."** [P] **This one is wrong in law, not merely
sloppy**, and it is the first thing a student unlearns. [C] CIRCUMSTANCES, NOT MINDS: *"Fate does
not install knowledge, skill, memory, language or mastery... a knowledge/skill wish is the start of
an adventure, never a shortcut."* So it buys no ability at all — only the improbable events by
which you might one day have earned it, arriving on Fate's schedule: the rival who withdraws, the
teacher met years too late, the contest cancelled. The pin is also an insult of an offering.

It rhymes beautifully and it is a trap, **which is precisely why it is taught.** A formula that
scans perfectly and is lawfully impossible is the most efficient possible proof that rhyme carries
no protection.

## 5. THE ADVANCED RESCUE FORMULA, AND WHAT IT DOES TO AUGAR  [NEW]
> "Let death pass — / I offer [amount] of my past."

A memorised STRUCTURE with a deliberately specified offering — **never words containing a literal
placeholder.** A practitioner names the memory or the bounded portion as they speak it, and the
naming *is* the formula. Order ① restoration, which is why it works at all.

**THE BLANK IS THE SAFETY.** This reframes the First Sacrifice foundation at no cost and makes it
much sharper:

- Augar did not improvise a reckless wish. He reached for the formula his rank has memorised, under
  the correct Order, with the correct structure — **and did not fill in the blank.** He said his
  past and meant all of it. Fate took exactly what was offered.
- And Julian's culpability stops being vague. [P] A Chayr's whole office at a bargain is to make
  certain the amount gets named. **The formula has a blank in it, and filling that blank is
  literally the job Julian was standing there to do.** He did not do it. That is a specific
  dereliction with a name, not a general failure of nerve.
- The rhyme with Scene 1 is now exact: Julian failed to bound a price once, and in the beat after
  Seren's words land he leaves *his own* price open. He knows better than anyone present, because
  he watched an unbounded offering empty a man out, and he does it anyway.

Seeded in `STARTER_SEEDS.starter_first_sacrifice.causalFoundation.spine`. The approved outcome is
unchanged and Julian's later price stays sealed.

## 6. MAD JESSI — TWO TIERS, NEVER INFERRED
Same contract as the causal foundation, for the same reason: a model told a secret in the same
breath as the legend will eventually narrate the secret.

**PUBLIC LEGEND (any author).** The measure of the craft — an improviser who could recognise a
developing combination before its first wish had finished leaving his opponent's mouth. Tournaments
paid him not to enter; his presence could empty a registration list. Rulers brought him to
negotiations without asking him to speak. People admired his brilliance and feared **what he was
willing to spend.** One notorious duel in which he offered and paid a sacrifice so frightening that
every later challenger had to ask whether beating him meant matching his willingness to destroy
himself — turning a contest into a game of chicken where the question stopped being "who can win?"
and became **"who can bear the price of refusing to lose?"**

The accounts disagree, and that disagreement is canon: versions differ on the sacrifice, the
opponent, and what was left of him. ONE demonstration became a reputation for limitless
recklessness. **The real sacrifice is deliberately NOT established** — if a story means to make it
consequential, that bargain is resolved in planning first, never improvised in prose. He was never
technically defeated.

**THE DEAN'S WISH, as rumour tells it** — *"I wish Jessi would find the peace he seeks."* No
hostile move to answer, no duel to win. Then he disappeared. Told both as a warning about careless
wishes and as proof that the greatest slinger can be undone by someone who understands what he
wants. Labelled in the prompt as BELIEF, not authoritative narration.

**PRIVATE TRUTH (planning tier only).** He did not cease to exist. He was exhausted by the
scrutiny and the endless supply of challengers, and understood that fatigue, a misjudgment or a
sufficiently reckless opponent would eventually kill him. **The Dean's wish gave him an opening and
he took it** — nothing was done to him; he recognised an opportunity serving a desire he already
had and used it to cover a deliberate departure. He let the world believe he was undone, because a
missing legend can finally stop accepting challenges. He is alive, retired into anonymity, and a
reader may meet him without recognising him.

The irony is deliberate: the escape that saved his life also preserved his undefeated record.

## 7. THE MECHANICAL GUARDS, which are the point of the whole entry
- [C] A kindly worded wish is **not** mechanically uncounterable. FATE GOVERNS EVENTS, NEVER
  CONSENT — no wish removed Jessi's agency or forced him anywhere. "Peace" is not a command that
  erases a person, and benevolent phrasing is **not an assassination loophole**.
- The Dean's wish obeys ordinary wishcraft like any other: sincere desire, personal offering,
  lawful fulfilment, consequences. Depicting or investigating that night requires establishing the
  actual bargain first.
- Jessi is not omnipotent, not exempt from sacrifice, and not available to fix a protagonist's
  problem. His reason for staying hidden is substantial.
- **[P] HIS ANONYMITY IS CRAFT, NOT AN EXEMPTION.** There is no rule that search wishes cannot find
  him. A wish to find him is Order ③, which Fate WELCOMES and answers as the start of an adventure —
  an opportunity that then has to close. What keeps closing them is that the greatest living
  tactician is the one person who knows how to arrange a life so they keep not closing: *preparing
  the circumstances the next wish will need*, which is the mastery §2 opened with, turned on his own
  disappearance. Any story that finds him must account for the earlier attempts and say why THIS
  one succeeds.
- Note this is the SAME law that keeps Augar unfound, arrived at independently: event-arrangement
  and ordinary failure, never an unexplained magical exemption.

## 8. TOURNAMENTS, AND WHY SPORT DOES NOT SUSPEND THE LAW  [NEW]
The Lytharyn Institute of Thaumaturgy has fields of study in wish composition, pricing, alignment,
counters and combinations. Four tournament forms: **timed** contests with a speed-chess quality;
**one-on-one verbal** confrontations with rap-battle intensity; **weapons-and-wishes** combat,
which is literally dangerous; and **team** events on coordinated, complementary wishes.
Contestants create openings, bait costly responses, give up position for later advantage, and
interrupt an opponent's opportunity before it can be used.

And then the guards, each pinned to shipped law:
- Each wish is **its own bargain**, its own price, its own account. [C] Teams do NOT pool
  sacrifices; no coordination lets one contestant spend another's life.
- [C] NO VISIBLE WISH-DUELS. No beams, no clash, no "whose wish is stronger." Each meets Fate
  separately; outcomes fall out as luck and coincidence.
- **Sporting limits are rules and supervision, not physics.** A tournament wish is not free, not
  reversible and not harmless. The difference between a regulated bout and open combat is the
  referee, the declared ceiling on offerings, and the people standing ready — never a softer Fate.

## 9. THE PLANNING CHECK, EXTENDED
`_buildWishcraftPlanningCheck()` now goes to the SPINE unconditionally for Fantasy stories —
unconditionally because at outline time there is no scene text to gate on, and this is exactly the
question that must be answered *before* outlining. Seven legitimate sources of difficulty (cost,
cultural practice, training, risk, misalignment, conflicting wishes, incomplete knowledge), and
"wishing cannot do that" is explicitly not an answer unless a law says so.

**The new clause:** *account for the formulas ordinary people actually know.* Children are taught an
emergency repertoire the way they are taught first aid, so a character who does not reach for the
familiar remedy needs a situational reason — too hurt to speak, the formula does not cover this,
the price is one they refuse, never taught, or **reaching for it is what causes the disaster.**
Ignoring an available remedy is a plot hole unless the scene explains it. Reaching *past* the
familiar formula for something far more ambitious is a different and much larger risk — and is a
story in itself.

Verified on the wire: the spine request carries the check and the ordinary-formulas requirement;
a non-Fantasy spine receives neither.
