# First Sacrifice — Human Review Rubric (Roman, sixth redesign pass, 2026-09-17)

**This is NOT a validator, and it never runs automatically.** `_first_sacrifice_packet_validator.mjs`
checks structure only — schema shape, beat count, word-count floor, image order/allowlist, POV
pronoun heuristic, required-beat coverage claims, card key/format compliance. It explicitly
**cannot** certify anything below, per `validator_limits` in the packet. This rubric is what a
human (Roman) uses to judge a draft that has already passed structural validation. A draft can be
100% structurally compliant and still fail every dimension on this page — that is expected, not a
validator gap.

Score each dimension **Fail / Weak / Pass / Strong** against the current baked scene as the
comparison baseline (not an absolute standard) — the point of a candidate is to beat or match the
baked scene, not to clear an abstract bar.

---

## 1. Interiority
- Does the reader get *specific* interior thought, not a labeled emotion? ("I envied her that
  plainness" beats "I felt jealous.")
- Does interiority *decode* the external situation (per the author-floor doctrine: interiority
  reveals what the external action alone doesn't show) rather than just re-describing it?
- Is there a distinct interior beat at each of the required turns: the cost statement, the wish
  bending, the public charge, Julian's approach? (Cross-check against `required_beat_coverage_map`
  — coverage proves the EVENT is present; this judges whether the INTERIORITY around it is real.)

## 2. Dramatic causality
- Does each beat follow causally from the one before it, or does it read as a list of things that
  happened? (Synopsis-construction — see `prose_construction_requirement` — is the structural
  symptom; this is the craft judgment behind it.)
- Does the scene build — does the reader's understanding of the stakes sharpen beat over beat — or
  does it stay flat?
- Do consequences land? (The wish bending should cost something visible in the next beat; the
  public charge should visibly change how the assembly treats Lirael.)

## 3. C+/E+/fusion expression
- Are the `cplus_eplus_fusion_grounds` facets *expressed* through action/thought/dialogue, or
  merely *cited* in a `grounded_inference` provenance tag? (A correct citation is a structural
  pass; a live expression of the facet in the actual prose is the craft pass.)
- Does Julian's `julian_status_without_display` actually read as quiet authority, not just "he was
  quiet"? Does Seren's `seren_goodness_needs_witness` read as a specific, visible need for an
  audience, not just a label?
- Is there a fusion moment — where two characters' facets collide and produce something neither
  facet alone would predict?

## 4. Character legibility
- Could a reader who has never seen this world tell Lirael, Seren, Julian, and the presiding Dohkar
  apart by voice and behavior alone, without name tags?
- Does each character want something *specific* in this scene, visible in their actions?
- Is the presiding Dohkar's authority/register consistent with the baked scene's established voice
  (procedural, lesson-making, unmoved) or does the candidate flatten him into a generic obstacle?

## 5. Voice
- Does the prose sound like a specific person narrating her own worst morning, or like competent
  generic fantasy prose?
- Sentence rhythm: does it vary, or does every beat land the same shape and length? (The baked
  scene mixes long accumulating sentences with short, blunt ones at moments of shock — "Nothing
  flared. Nothing was seen." — candidates should be judged on whether they use rhythm as a tool,
  not just on total word count.)
- Are there any of the BANNED synopsis constructions from `prose_construction_requirement`
  ("X felt Y," "X stepped forward," "the charge landed") that slipped past the structural check
  because they were embedded in an otherwise-long paragraph?

## 6. Card desirability (the 5 Fate cards)
- Are the 5 cards genuinely distinct choices a reader would agonize between, or do 2+ cards read as
  the same move with different words?
- Does each card's `action`/`dialogue` feel like something THIS Lirael, grounded in her established
  facets, would actually do — not a generic "assertive response" template?
- Does the `variant` (amplify/ruin/redirect) distribution feel earned by the scene's actual content,
  or arbitrarily assigned?

---

## Not this rubric's job
- Structural compliance (schema, word count, image order, POV pronoun ratio, coverage map presence)
  — that's the validator's job, already run before this rubric is ever reached.
- Canon/citation correctness (`locked_canon_fact` citations resolve to real packet facts,
  `grounded_inference` names real facets) — also the validator's job.
- Whether the current baked scene should be replaced — that is Roman's decision after using this
  rubric, not a score this rubric produces on its own.

## How to use
1. Confirm the validator passed first (`node _first_sacrifice_packet_validator.mjs` against the
   draft, or check `03_validation_result.json` from a real run) — if it failed, there is no point
   scoring craft on a structurally broken draft.
2. Read the candidate against the baked scene side by side (the rendered review preview already
   does this).
3. Score each of the 6 dimensions above, Fail/Weak/Pass/Strong, with one sentence of why.
4. A candidate needs Pass-or-better on Interiority, Dramatic causality, and Voice at minimum to be
   worth considering as a replacement — Weak on those three specifically was exactly how the real
   2026-09-17 draft failed, even though (after the sixth-pass fixes) it might now pass every
   structural check.
