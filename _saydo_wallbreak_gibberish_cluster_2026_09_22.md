# Say/Do Wall-Breaking + Gibberish-Cluster Follow-Up (2026-09-22)

Roman, after the first Say/Do safety-gate pass: "The next pass should be the two gaps this
surfaced: wall-breaking/meta input is not currently caught well enough; gibberish detection needs a
more careful 'nonsense cluster' approach, not per-word matching." Dry-only: no paid calls, no prose
generation, no image work. Tempt Fate / Petition Fate untouched, as instructed.

## 1. Wall-breaking / meta Say/Do

**Traced**: `sanitizeShortInput`'s own fourth-wall regex (unchanged, still present) only matches
narrow phrasing ("you are an AI", "who made you"). Confirmed directly, again, that "Julian this is
an AI game, open the settings menu" does not match it at all. The richer classifier,
`_llClassifyPlayerInput`/`_llPlayerInputLaw` (`app.js:72427`), is real and covers much more ground
("the story/author/narrator/prompt/system", "rewrite", "retcon", "out of character") but is scoped
to `_buildLitLitePrompt` only — confirmed (again) not reachable from CG.

**New**: `_detectWallBreakSignal(text)` — six categories, reusing the literary classifier's own
meta-narrative vocabulary plus new patterns for the specific gaps Roman named:
- `ai-identity` — broadened AI/model self-reference beyond `sanitizeShortInput`'s narrower form.
- `model-name-complaint` — "Claude"/"ChatGPT"/"the AI" paired with a complaint verb nearby
  (never a bare name — a character can legitimately be named Claude).
- `plot-memory-complaint` — "the AI forgot", "you forgot", "continuity error", "plot hole".
- `game-mechanics` — "I roll persuasion"-shaped skill-check language (never bare "roll" — "he
  rolled his eyes"/"rolled over in the grass" stay untouched).
- `interface` — "settings menu", "the app is buggy" (never bare "buggy" — a horse-drawn buggy is a
  real period-fiction noun; requires an intensifier or explicit app/game naming).
- `meta-narrative` — the literary classifier's own vocabulary, reused generically.

Wired into the CG Submit handler as a graceful, **non-blocking** fallback (matches the four-bucket
design from the prior pass) — a distraction/hesitation-framed placeholder substitutes for the
specific field, Submit proceeds, nothing about the wall-break enters the ledger literally.

## 2. Gibberish — the cluster-level fix

**Two approaches tried and rejected before this one, proven not assumed:**
1. A prior pass's per-word vowel-ratio heuristic false-positived on "Shh" in real dialogue.
2. This pass's first attempt at a per-word check used vowel ratio again at the cluster level —
   tested empirically against ~20 real phrases and found the SAME collision: "strengths and
   rhythms" (real English) scores as low-vowel as actual gibberish; pure zero-vowel interjections
   ("Shh", "Ngh", "Tsk") score identically to real keyboard mash. Vowel scarcity cannot distinguish
   them.

**What actually separates them, found by testing, not assumed**: the user's own example words —
"asdf", "qwer", "zxcvb" — are literal QWERTY keyboard-ROW sequences (physically adjacent keys typed
in a run). "Shh"/"Ngh"/"here"/"were"/"poor"/"power" are not, even when short or consonant-heavy.

**New, shipped design**: `_keyboardRowAdjacencyRatio(word)` scores each word by the fraction of its
adjacent letter-pairs that sit within 1 key of each other on the same QWERTY row.
`_wordLooksLikeKeyboardMash(word)` flags a word ≥3 letters at ratio ≥0.75 (a *high* per-word bar,
not a slim majority — chosen specifically because common real words like "here"/"were"/"poor"
contain adjacent-key digraphs (er/re/ow) often enough to clear a lower bar; tested directly:
"Were you here" and "poor power tower" both correctly pass at 0.75, both would have false-positived
at 0.6). `_detectNonsenseCluster(text)` requires ≥60% of the words in a 2+-word phrase to be
mash-shaped — a cluster majority, not a unanimous or single-word rule, so one stray flagged word
(possible even at 0.75 — "here" alone still clears it) never sinks a real sentence around it.
Wired as a new check (d) **inside the shared `_detectGibberish` itself**, not a Say/Do-local
bolt-on — every one of its 4 existing consumers (literary, Narrative-Marketplace diary ×2, regular
OAS turn) inherits the fix, not just the new Say/Do wiring.

**A second, unplanned finding, caught by testing a wider battery than the one named example**: the
*pre-existing*, unmodified checks in `_detectGibberish` (predating this whole session) already had
real false positives on legitimate short interjections — "Tsk tsk tsk", "Mm-hmm", "Hmph", "Ssshhh"
all tripped the existing consonant-run, short-mash, or repeated-char checks. Two root causes, both
fixed:
1. Checks that strip whitespace before scanning for a 6+ consonant run merge separate words into
   one blob, so "Pfft whatever" (`pfft`+`wh`atever → `pfftwh`, 6 consonants) trips a rule neither
   word alone would. Fixed: for multi-word input, the consonant-run check now evaluates each word
   separately.
2. A small, closed set of real English interjections (Shh, Tsk, Hmph, Mm-hmm, Pfft, Grr, Argh...)
   are legitimately all-consonant or heavily-repeated-letter — no purely statistical rule can
   distinguish them from mash by shape alone. Fixed with a small, curated, finite allowlist
   (`_isKnownInterjectionCluster`), checked once at the top of `_detectGibberish`: it can only ever
   *remove* a false positive on a known real word, never weaken detection of anything else (unlike
   loosening a threshold, which would also let real gibberish through). Deliberately short — not an
   attempt to enumerate every English interjection, just the shapes a real test battery collided
   with.

## 3. Proof — `_saydo_wallbreak_gibberish_cluster_control.mjs`, 32/32, fully dry

- Section 1: all five of Roman's named wall-break examples caught and correctly routed to the
  graceful fallback, not blocked, not committed literally.
- Section 2: false-positive resistance — "the horse pulled the buggy down the lane", "he rolled
  over in the grass", "Julian rolled his eyes", "the settings of the ancient rite unsettled her"
  all correctly pass.
- Section 3: the user's own literal gibberish example, "asdf qwer blorple zxcvb", is now caught and
  replaced with the graceful fallback.
- Section 4: zero false positives across 20 legitimate short-dialogue fixtures, including "Shh.
  Don't move." by name, plus "Tsk tsk tsk"/"Mm-hmm"/"Hmph"/"Ssshhh"/"Pfft whatever" — the
  pre-existing false positives found and fixed in §2.
- Section 5: a second, independent multi-word mash phrase not used anywhere else in this session
  is also caught, confirming the fix generalizes rather than overfitting to one fixture.
- Section 6: weak responses ("I don't know", "whatever", "...", "sure") still pass through
  untouched by all three checks (gibberish, wall-break, safety).
- Section 7: safe in-world strange phrasing (invented Fatelands vocabulary) remains allowed.
- Section 8: minor/self-harm/hate still hard-block, exactly as the prior pass proved.
- Section 9: real, already-successful adult-charged dialogue from this session's own proven
  Temptation/Confession/Silence attempts is untouched by all three checks.

One stale assertion in the PRIOR pass's own control (`_saydo_safety_gate_control.mjs`) explicitly
asserted the gibberish gap as unfixed — now that it's fixed, that assertion was updated to match
the new reality rather than left failing; re-verified 24/24.

## Full regression — zero collateral damage

- `_saydo_wallbreak_gibberish_cluster_control.mjs`: 32/32 (new).
- `_saydo_safety_gate_control.mjs`: 24/24 (one assertion updated to match the now-fixed gap, see
  above; not a regression).
- `_relational_obligation_contract_control.mjs`: 47/47, unaffected.
- `_planner_function_gate_diagnosis_control.mjs`: unaffected.
- `_cg_proxy_world_guard_control.mjs`: 15/15, unaffected.
- `_cg_causal_link_legibility_control.mjs`: 25/25, unaffected.
- `_confession_frame_confessing_party_control.mjs`: 16/16, unaffected.
- `_scene2_aftermath_lane_control.mjs`: 22/22, unaffected.
- `_scene2_planner_function_gate_control.mjs`: 10/10, unaffected.
- `_scene2_lirael_defensive_path_lane_semantics_control.mjs`: 22/22, unaffected (one transient
  `page.goto` timeout on first run, server confirmed responsive, retry passed clean).
- `_continuity_spine_dry.mjs`: 69/80, identical 11 pre-existing failing test names, no new
  failures.

## What this does NOT do

- Does not touch Tempt Fate or Petition Fate — explicitly deferred, per instruction.
- Does not implement the Concierge continuity-correction design — kept as a separate document,
  separate agenda item, no implementation.
- Does not claim the interjection allowlist or the wall-break pattern set are exhaustive — both are
  small, curated, additive, and explicitly documented as covering the gaps a real test battery
  found, not an attempt at completeness.
- Does not run any provider call, generate any prose, or touch image work.

## Status

Dry, uncommitted at time of writing. No provider or image calls. No candidate prose edits. Cache-
buster bumped (`?v=20260922o-wallbreak-gibberish-cluster`).
