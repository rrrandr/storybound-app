# Does anyone "cancel" a wish? — investigation + proposal
Provider-free, $0. Nothing implemented. 2026-10-13.

## 1. WHAT JULIAN ACTUALLY DOES — established, not inferred

The mechanism is ALREADY CANON and already in the code. It is not a gap.

`public/app.js:134640-134641` (author-side sealed truths):
  SEALED (julian_counter_wish): "Julian sensed Seren's misalignment and that Lirael
    would be its target, and secretly spent HIS OWN WISH to counter it — a forbidden
    intervention at enormous unseen cost."
  SEALED (julian_obscuring_wishes): "Julian later uses smaller wishes to obscure
    that intervention."

`public/app.js:134816-134818` — both are `sealedEvents` with `unsealsAtScene: 16`.
The planner receives ID + LABEL ONLY ("a sealed future reveal concerning Julian,
not to be delivered, named or pre-empted"), with leak control at S19.

Seed TRUTHS[] (immutable secrets), `project_first_sacrifice_seed`:
  · the youth slipped into catastrophic misalignment (the wish SHOULD have twisted)
  · it succeeded CLEANLY — "impossible without illegal intervention"
  · JULIAN made the forbidden wish + paid an enormous unseen sacrifice
  · THE PC DID NOT INTERVENE (innocent)
  · the youth never realizes any of this

CATEGORY, kept separate as instructed:
  AUTHOR-SIDE ESTABLISHED FACT ... Julian counter-wished and paid enormously.
                                   Sealed; a PLANNED REVELATION at scene 16.
  LIRAEL'S SUSPICION .............. nothing in canon says she suspects in Scene 1.
                                   She is innocent and uninformed.
  ACCIDENTALLY PROMOTED INFERENCE . "an elder/Sacrificiant can cancel a wish."
                                   This appears NOWHERE in canon. It is an artefact
                                   of the saved planner reply's wording, not a rule.

### The decisive point
Julian used THE ORDINARY MECHANISM: a wish, with a sacrifice. He exercised no
authority, no office, no protocol power. Nothing new has to be invented, and no
elder gains a cancellation power. The only reason it is remarkable is that it is
FORBIDDEN and the price was enormous.

### Timing
He "sensed Seren's misalignment AND that Lirael would be its target" — so his wish
is made BEFORE Seren's binds, or as it binds. His OBSERVABLE action is separate and
late: the approved opening has him present at the edge throughout (beat 16, "the man
who had not moved") and physically moving only at beat 17, after Fate has answered.
Presence, attention, intervention and his unseen wish are four different things, and
only the first three are visible to anyone in the clearing.

### What each party causes
  SEREN'S WISH ... should have twisted catastrophically. Instead Fate honoured the
    words as spoken and denied the intent as meant: "find" was granted as the
    assembly's ATTENTION turning to Lirael (approved opening beat 13; the editorial
    record calls this the twist mechanism — literal "find" honoured as attention).
  JULIAN'S COUNTER-WISH ... converted catastrophe into that clean literal landing,
    at enormous unseen cost. The CLEAN LANDING IS ITSELF THE EVIDENCE: every
    experienced First Favored knows a misaligned wish cannot land clean, which is
    exactly why an inquiry follows and why charges are laid.
  LIRAEL ... causes NOTHING magical. She tears the band and speaks, which is
    evidence against her and nothing more. Canon: she did not intervene.

## 2. SYSTEM-WIDE IMPLICATIONS

The five operations the brief asks to distinguish, scored against EXISTING canon:

  INTERRUPT BEFORE COMPLETION .... Physically possible (shout, cover a mouth). Canon
    already requires EXTERNALIZATION — a wish must be given form; "Fate does not read
    the mind". An unfinished wish was never a bargain. This needs NO new rule and
    grants NO power over Fate. It is just stopping a person talking.
  PREVENT BINDING ................ No canon mechanism. The design-only
    `wish_intent`->`wish_sealed` layer (project_wish_override_adjudication_design,
    NOT implemented) permits a knowledgeable character to WARN ONCE, preserving reader
    agency. A warning is not a veto.
  REDIRECT THE OUTCOME ........... THIS IS WHAT JULIAN DID, via his own counter-wish.
    Available to anyone in principle, priced by Fate, forbidden by law.
  CONTAIN / MITIGATE CONSEQUENCES  Same route: another wish, another sacrifice.
  REVERSE AN ESTABLISHED RESULT .. Order 8, HISTORY = "nearly impossible". Canon
    already closes this. Nothing to add.

Under the Eight Orders, a wish aimed at overriding another person's wish is an
AGENCY operation (Order 6, "resists") — Fate prices it steeply BY EXISTING LAW.
That is the canonical reason Julian's cost was enormous. We do not need a new rule
to make it expensive; the Orders already do.

NOTE, 2026-07-16: the wish-magic rewrite explicitly REPLACED "magic-shop / wish-wars
/ permanent-guarding" framing. Wish-duels were considered and removed once already.

## 3. THREE COHERENT RULE SETS

### A — NO OVERRIDE LAYER (strict reading of current canon)
A wish, once externalized and accepted, resolves. Nobody affects anybody's wish.
Julian's counter-wish is a SEPARATE bargain whose consequence happens to overlap
Seren's; Fate reconciles two bargains by its own law, not by contest.
  binds: when spoken and Fate accepts.  who can affect: no one.
  cost: ordinary Orders pricing. terminates: trivially — no stack exists.
  · novice's bad wording in practice: a supervisor must interrupt the SENTENCE, or
    the rite is simply dangerous. Training is risky by nature.
  · Seren's rite: works exactly as sealed canon states.
  · Lirael intervening: impossible, which matches "the PC did not intervene".
  · two enemies: each wishes; both resolve; no duel, only consequences.
  · chained quick wishes: limited by sacrifice, not by speed.
  · "I wish your wish fails": an AGENCY wish against a person; Fate may warp it
    into something it recognizes. No counter-stack.
  COST: training looks reckless, and "supervised practice" has no safety mechanism.

### B — PROTECTED PRACTICE (recommended)
A, plus ONE addition that is institutional rather than magical: the First Sacrifice
and formal teaching happen inside a PREPARED RITE whose protections were PAID FOR IN
ADVANCE — the institution's standing sacrifice, renewed, maintained by the Dohkar
order. Inside a prepared rite, a badly worded novice wish is bounded in SCOPE by the
prepared terms, not cancelled. Outside one, nothing protects anybody.
  binds: as A. who can affect: nobody, but the prepared rite's pre-paid terms
  constrain the SHAPE of what can land. cost: paid in advance, by the institution.
  terminates: no stack; the protection is a standing condition, not a counter-move.
  · novice in practice: scope-bounded. Teaching is survivable WITHOUT giving any
    elder a cancellation power. This is the whole reason to prefer B.
  · Seren's rite: the prepared terms are why it was survivable at all; Julian's
    counter-wish still explains why it landed CLEAN rather than merely contained.
    Both causes coexist, which is better mystery: the Dohkar can believe the rite
    held, and still know that is not sufficient to explain cleanliness.
  · Lirael: still cannot intervene. Still innocent. Tearing cloth still does nothing.
  · two enemies: unprotected, so A applies. Wishcraft stays dangerous where it counts.
  · chained wishes: unchanged — sacrifice is the limit.
  · "I wish your wish fails": unchanged from A.
  · Julian's exception: NOT a special power. He is exceptional only in having sensed
    the misalignment early, having been willing to break the law, and having had
    something enormous left to pay. It cannot solve later crises because each use
    costs that much again AND is prosecutable — which is precisely why he then needs
    `julian_obscuring_wishes`.
  COST: adds one institutional fact. It is an ARRANGEMENT, not a new magic rule.

### C — CONTESTED WISHES (duels permitted)
A wish can be answered by a counter-wish while still "open", resolved by comparative
sacrifice weight.
  binds: after a contest window closes. who can affect: anyone present who can pay.
  cost: comparative. terminates: only by exhausting what the parties can sacrifice.
  · novice in practice: a supervisor CAN cancel — convenient, and it is exactly the
    universal cancellation power the brief warns against.
  · Seren's rite: Julian's act becomes ordinary rather than forbidden, which
    DESTROYS the sealed scene-16 revelation and the inquiry's reason to exist.
  · two enemies / chained wishes: combat becomes dominated by SPEED, WORDING and
    ACCUMULATED SACRIFICE — a resource duel. Genuinely interesting as a system, and
    it would make Wishcraft feel tactical.
  · "I wish your wish fails" + counter: needs an arbitrary stack-depth or
    diminishing-returns rule to terminate. That rule would be pure invention.
  COST: contradicts the 2026-07-16 removal of wish-wars, and voids an immutable
  sealed truth. If duels are wanted, they belong in a LATER arc with their own
  design, not retrofitted to explain Scene 1.

RECOMMENDATION: B. It changes no magic, keeps every sealed truth intact, makes
teaching coherent, keeps Wishcraft lethal outside prepared rites, and leaves duels
available as a future design rather than an accident of this opening.

## 4. THE OPENING UNDER B — causal sequence only, not prose

  1 Seren names a real offering aloud (cost before desire — the established order).
  2 She abandons the rehearsed wish and spends her First Sacrifice on Lirael,
    in loose wording, out of performed empathy over real self-aggrandizement.
  3 Experienced First Favored HEAR the misalignment immediately. UNAVOIDABLE.
  4 UNSEEN, UNLOCATED, UNRENDERED: Julian's counter-wish. Not depicted, not hinted
    as his, not timed on the page. Sealed until scene 16.
  5 Fate answers. No visible sign — "Nothing flared. Nothing was seen." The words
    are honoured and the intent denied: "find" lands as the assembly's attention
    turning to Lirael. UNAVOIDABLE.
  6 The Dohkar names the mechanism; the clean landing is itself wrong, and he knows it.
  7 CHARGES: the wish was shaped for its supervisor's benefit, and the supervisor
    broke her seal. UNAVOIDABLE — they follow from what the assembly SAW.
  8 Lirael understands: Seren misaligned, Fate answered literally, she is implicated,
    and the cleanliness does not add up. She does NOT know Julian wished.
  9 Julian moves, reads her alignment aloud, puts The Answer in her hand.
 10 Intimate interrogation (required fixed aftermath) -> Dohkar interrupts ->
    ONLY THEN the run/remain choice, which is the OAS's and the player's.

  WITNESSES OBSERVE: loose wording; stuttering Weave-Script; Lirael tearing the band
  and speaking; no visible Fate effect; a clean result that should have been a
  disaster. They do NOT observe Julian's wish.
  REMAINS FOR LATER: who paid, what was paid, that it was forbidden, the obscuring
  wishes — all sealed to scene 16.

  PLAYER AGENCY: the player does NOT get a choice to prevent the wish, halt it, or
  save Seren — all three are foreclosed by canon (she is innocent; Fate answers; the
  band is cloth). What remains genuinely open is HOW SHE CARRIES IT: what she says or
  withholds under interrogation, and run-or-remain. Those are real and untouched.

## 5. SMALLEST COHERENT RECONCILIATION

The defect is NOT a missing magic rule. It is that the saved planner reply asserts a
power the world does not have, in five fields:
    decision_beat          "Tear the gossamer band and halt the wish..."
    reader_state.believes  "the only way to stop it is to tear the band"
    reader_state.wondering "Will she break protocol to intervene or stay silent"
    scene_mission          "Protect the rite's alignment without breaking protocol"
    scene_want             "wants the rite to hold its shape long enough to decide"
Each presumes the wish is PREVENTABLE BY LIRAEL. Canon says it is not, three times
over. Sonnet reproduced that fork verbatim as its closing line, which is the
cleanest proof yet that the ASSIGNMENT, not the author, truncates these scenes.

PROPOSED, NOT IMPLEMENTED — one change at the source, not a new warning layer:
  · PLANNER (opening-spine instructions): state that the scene's turn is FIXED and
    already determined, and that the closing beat hands off to the OAS. The planner
    must NOT author a closing fork, and must NOT describe the PC as able to prevent
    the scene's event. This is the one edit that drains all five fields at once,
    because all five are downstream of "propose a decision the PC makes".
  · SCAFFOLD (causal spec): nothing to add. It already says a development changes
    what is possible next, and that an earlier event does not happen twice.
  · AUTHOR: nothing to add. The length and LI-presence contradictions are already
    reconciled; the remaining failure is inherited from the plan.
  · VERIFICATION: the Scene-1 validator should reject an opening whose closing beat
    offers the PC a choice to prevent an event the plan marks as having happened.
    That is a CONTRACT check on the plan, not a prose rewrite.
  · DO NOT: add Wishcraft rules to any prompt. Under B nothing new reaches the
    author; the prepared-rite fact is world background, and the counter-wish stays
    sealed.
