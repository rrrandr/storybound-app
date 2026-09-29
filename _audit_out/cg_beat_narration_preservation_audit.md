# CG beat-text preservation — audit + minimal design proposal (2026-09-13, Roman's scoped follow-on)

Read-only audit of `public/app.js`. No code changed. No paid calls. This is a design proposal for review, not an implementation.

## 1. The schema, as authored (already separates narration/interiority/dialogue)

`_buildCGScreenplaySystemPrompt` (app.js ~217924) defines the CG author's JSON contract. Each element of `beats[]` has one `kind`: `"narration | exposition | dialogue"` (schema at ~218032-218034), and the TEXT RULES (~218957-218959) instruct the model explicitly:
- **dialogue** beat `text` = "JUST the spoken line... NO he-said, NO she-replied, NO action tags, NO [NAME] brackets."
- **narration** beat `text` = descriptive action / staging / sensory detail.
- **exposition** beat `text` = the PC's internal thought / reflection (interior monologue).

So the architecture already asks for narration-before, dialogue, narration-after, and interior thought to be **separate beat objects in sequence**, not one blob. `_validateAndNormalizeCGPlan` (~223062) does light defensive cleanup (drops empty-text beats, dedupes a beat that echoes the mandated closer, clamps a few numeric/enum fields) but does **not** merge, drop, or truncate narration/exposition beats, and does not cap beat count. The reader walks every beat in `plan.beats[]` in order via `#stagedNextBtn` (confirmed at app.js ~213745-213770) — nothing in the advance mechanism skips a beat. `pc_proxy_action` (a short body-language caption, ~219187) is a deliberately separate, always-rendered italic line under the main beat text (~213710-213711) — not a hidden or image-only field; not part of this problem.

**Conclusion: for compliant output, nothing is discarded upstream of the renderer.** The loss is a single site, downstream, in the renderer.

## 2. The actual discard site

`public/app.js` ~213619-213636, inside the per-beat render step, gated on `beat.kind === 'dialogue'`:

```js
// ── SCREENPLAY-STYLE DIALOGUE CLEANING ──
// For dialogue beats in staged (CG) mode, strip novel-style
// attribution ("he said", "she replied", etc.) so the displayed
// text reads as pure screenplay...
var _displayText = beat.text;
if (beat.kind === 'dialogue' && typeof _displayText === 'string') {
  var _qMatch = _displayText.match(/["“]([^"”]+)["”]/);
  if (_qMatch && _qMatch[1] && _qMatch[1].trim().length > 0) {
    _displayText = '"' + _qMatch[1].trim() + '"';
  }
}
```

This runs **unconditionally on every dialogue beat**, regardless of whether the model actually violated the "quote only" instruction. In the common, schema-compliant case it's a no-op (there's nothing else to strip). But whenever a dialogue beat's `text` field contains anything beyond the first quoted span — a lead-in action, a trailing reaction, an aside, a second sentence, C+/E+ material the model folded in next to the line rather than emitting as its own narration beat — that content is deleted with **no separate beat capturing it**. It never reaches the page. This is the "keep only the first quoted span" behavior Roman named exactly.

Two things this is *not*: it's not a parser/validator defect (the validator never touches `beat.text` for dialogue beats), and it's not a beat-count or advance-mechanism problem (every beat that exists gets shown). It is one rendering line whose intent — remove redundant "he said" scaffolding — is stated far more broadly than what it actually does, which is discard everything but the quote.

## 3. Minimal design proposal (not implemented — for review)

**Do not touch:** the schema, the author prompt's TEXT RULES, `_validateAndNormalizeCGPlan`, the speaker-label guard (`_hasQuotedLine` / known-cast check, ~213524-213570 — already reads the ORIGINAL `beat.text`, independent of the display-text step, so it needs no change), `pc_proxy_action`, the beat-advance mechanism, or anything about how many beats a scene has. Do not adopt OAS's chat-bubble/transcript renderer for CG — CG needs a beat-by-beat narration renderer with screenplay-labelled dialogue, not a two-party chat log; OAS's shape is a useful cross-reference, not a target design.

**Change, at the one site above:** replace "extract the first quote, discard the rest" with "preserve everything, in original order; strip only a narrowly-matched trailing/leading dialogue tag directly touching the quote."

```
_displayText = beat.text   // verbatim, same as narration/exposition — no reduction by default

// OPTIONAL narrow cleanup — remove ONLY a dialogue-tag phrase immediately before or after the quote
// (e.g. `"You're late," she said.` → strip the trailing `she said.`), never anything else:
//   leading:  /^\s*[A-Z][a-z]+ (said|replied|asked|murmured|whispered)[,:]?\s*/  (only if it precedes the FIRST quote with nothing else before it)
//   trailing: /,?\s*(he|she|[A-Z][a-z]+) (said|replied|asked|murmured|whispered)\.?\s*$/  (only if it's the LAST thing after the closing quote)
// Everything else in beat.text — a lead-in action, a reaction after, an interior aside, a second
// sentence, C+/E+/fusion material — is left exactly where the model put it, in original sequence.
```

This is a small, bounded change (net: delete the current reduction, optionally add two narrow anchored regexes) with three properties Roman asked for directly:
- **Original sequence preserved** — no reordering, no "quote first, narration discarded."
- **Speaker attribution unaffected** — the name-tag label logic is untouched and already independent of this step.
- **Fails safe toward keeping content** — if the narrow dialogue-tag regexes don't match, nothing is stripped; the only way this design loses text is the same way narration/exposition beats already work today (verbatim).

**Not addressed by this change, flagged for Roman's decision, not built:** if the model bundles narration + dialogue + interiority into ONE beat instead of the three separate beats the schema asks for, this fix preserves all of it as one continuous block of text under a single speaker-labeled beat, rather than as the intended separate narration/dialogue/exposition beats with their own pacing (a Next-click each). That's strictly better than today's silent deletion, but it's not identical to "the schema worked as designed." Whether that gap needs its own repair (e.g. a normalization step that SPLITS a compound dialogue beat back into multiple beats) is a separate, larger design decision — out of scope for this minimal proposal.

## 4. Red control — BUILT and CONFIRMED (2026-09-13), `_cg_beat_narration_loss_control.mjs`, no paid call, no production file touched

Fixture (one `dialogue` beat, speaker `Seren`, real render path — First Sacrifice's baked launch → OAS one-on-one → interruption submit → real `_runCGScreenplayGen` fired against a hand-authored JSON plan stubbed at `/api/mistral-proxy`, never a model call → `_validateAndNormalizeCGPlan` → `_renderStagedScene` → real `#stagedNextBtn` clicks → text read back from the real `#stagedBeatText` DOM node):
> She set the letter face-down before he could read the return address. "You're late, McBrayn." His jaw ticked once, the only sign he'd heard her. I didn't know whether to believe him or let him tighten his own noose. The ledger under his arm was cracked open to a page marked with a single strand of his own hair — he trusted no clerk enough to hold his place for him, not even a scrap of paper.

Rendered DOM text for that beat, captured live: `"You're late, McBrayn."` — the quote only. Narration-before, narration-after, the interior line, and the Character+-shaped detail (obsessive distrust/control, read through the strand-of-hair tell) are all confirmed absent from the rendered page. The speaker label (`Seren`) still renders correctly, confirming that logic is independent of the text loss, as this audit's §2 claimed.

Independently re-run in the main session (not just trusted from the building subagent's report): same result, 6/6 assertions as predicted — RED-1/RED-2/RED-3 all PASS (i.e. the defect reproduces exactly as described), CONTROL-1/2/3 all PASS (pure narration, pure exposition, and a compliant quote-only dialogue beat are all unaffected). Two adjacent, unrelated findings surfaced and worked around without touching production code: (a) the baked First Sacrifice starter never sets `state.playerName`/`state.loveInterestName`, so `protagonist`/`li` speaker tags resolve to null under this fixture — irrelevant to the defect, worked around with a named side-character speaker; (b) a pre-existing UI quirk where an exposition beat's typewriter-complete flag can cause the immediately-following `#stagedNextBtn` click to be silently swallowed (`_advanceStagedBeat`'s fast-forward guard, ~app.js:213866) — not fixed, not in scope, flagged for whoever picks it up.

This closes the diagnostic phase. The defect is proven through the real render path with a real authored fixture; the design in §3 is ready for review before any code changes.

## 5. Two adjacent defects, fixed on Roman's explicit go-ahead (2026-09-13) — separate from the §3 design, not the narration-loss fix itself

**Starter fixed-cast names never reached `state`.** `_launchStarterStory` (app.js) copied every other starter-def field into `state.picks`/`state.*` but never set `state.playerName`/`state.loveInterestName`. For First Sacrifice specifically (`STARTER_SEEDS.starter_first_sacrifice` — the only starter with a seed entry) this meant `_resolveStagedPlayerName()`/`_resolveStagedPartnerName()` had nothing to resolve even though the delivered baked prose is fixed to "Lirael" and "Julian" throughout. Added `name: 'Lirael'` to the seed's PC cast entry (the LI entry already had `name: 'Julian'`) — this makes an already-true fact machine-readable, not a new invention. `_launchStarterStory` now reads `STARTER_SEEDS[def.id].cast` when it exists (today: First Sacrifice only, so no other starter's real casting-line flow is touched) and sets both fields. Verified live: `nameDbg` now reports `{"playerName":"Lirael","loveInterestName":"Julian"}` where it previously reported nothing.

**Typewriter-complete flag left dangling after natural completion.** `_advanceStagedBeat`'s fast-forward guard (`if (active._typewriterComplete) { active._typewriterComplete(); return; }`) is meant to fast-forward a beat that's still mid-typing on the click that follows it — but when the typewriter finished ON ITS OWN (all characters typed, no click involved), the natural-completion branch cleared `_typewriterRaf` and never cleared `_typewriterComplete`, so the reader's very next Next-click was silently consumed as a no-op fast-forward instead of an advance, requiring a second click. Fixed by clearing `active._typewriterComplete = null` in that branch too, matching what the manual completion path already does.

Both: `node --check public/app.js` clean; `env OAS=1 node _first_sacrifice_seed_contract.mjs` 49/49; `env LAUNCH=afterboot node _baked_screen_probe.mjs` 11/11; `_cg_beat_narration_loss_control.mjs` re-run, unaffected, still 6/6 (RED-1/2/3 + CONTROL-1/2/3), confirming these two fixes don't touch the narration-loss defect either way. `app.js?v=20260913b-starter-names-typewriter-fix`.

## 6. FIX IMPLEMENTED (2026-09-13, uncommitted, no paid call)

Applied exactly §3's minimal design at the one discard site (`app.js` ~213668, now titled "DIALOGUE BEAT TEXT — PRESERVED, NOT REDUCED"): the "keep only the first quoted span" reduction is deleted; `_displayText = beat.text` now renders verbatim for every beat kind, dialogue included, matching narration/exposition. The speaker-label logic (independent, reads the original `beat.text`) is untouched. The optional "strip a narrowly-matched redundant dialogue tag" refinement from §3 was deliberately NOT added — the schema already instructs quote-only dialogue text in compliant output, and a regex loose enough to catch "he said" but tight enough to never risk eating genuine narration is exactly the kind of risk this fix exists to remove; add it later only against real authored evidence of a genuine redundancy problem, not preemptively. `node --check` clean. `app.js?v=20260913e-cg-narration-preserved`.

**Verified two ways:**
1. `_cg_beat_narration_loss_control.mjs` rewritten in place (RED group → PRESERVE group; new order-check assertion added: narration-before / quote / narration-after / interior line / C+ detail must all appear AND in that authored order, not just anywhere on the page) — run directly by the main session: **PRESERVE 3/3 · CONTROL 3/3, exit 0.** The compound beat's full text now renders exactly as authored: *"She set the letter face-down before he could read the return address. "You're late, McBrayn." His jaw ticked once, the only sign he'd heard her. I didn't know whether to believe him or let him tighten his own noose. The ledger under his arm was cracked open to a page marked with a single strand of his own hair — he trusted no clerk enough to hold his place for him, not even a scrap of paper."* — narration, quote, narration, interior thought, and the Character+ detail all present, in order, with the speaker label still correctly attached.
2. Broader regression, unaffected: seed contract OAS 49/49 · afterboot probe 11/11 · C+ render regression 10/10.

**This is a real code fix, not just a design proposal** — but it does not by itself prove real authored CG prose reads well; it proves the renderer no longer discards what the author writes. Whether real Grok/Mistral CG output actually bundles narration into dialogue beats often enough to matter, and how the preserved prose reads in practice, is an open question for real (paid) play — not addressed here, no paid call made.

## 7. Presentation control — BUILT, 17/17, screenshots reviewed directly (2026-09-13)

`_cg_beat_presentation_control.mjs`, same fixture as §6, real render path, screenshot artifacts saved to `_validate_out/`. Independently re-run: 17/17. Speaker label visible and correctly styled, quote intact, all five pieces of the compound beat present in correct reading order, all living in one single-text-node `<p>` (so DOM order and visual order cannot diverge), and a whole-page duplicate scan found exactly one visible occurrence of every piece — no stale hidden copy left behind by the render's `replaceChild`.

**Additional finding from actually looking at the screenshots (not just the automated result):** the compound beat renders as one visually undifferentiated paragraph. `.staged-beat-text[data-kind="exposition"]` (a genuine, separate exposition beat) gets italic + muted color + wider letterspacing specifically for "a different voice register" (`styles.css` ~26366-26372, with typewriter reveal JS-gated to that kind only). But the fixture's interior-thought line — *"I didn't know whether to believe him or let him tighten his own noose."* — is bundled inside a `kind:"dialogue"` beat, so it's tagged `data-kind="dialogue"` and renders in the exact same plain roman type as the surrounding third-person narration, with zero typographic signal of the POV shift into first person. Every literal requirement (present, correct order, no duplication, legible) is satisfied — this is a real gap between "the content survives and reads clearly enough to parse" and "the visual hierarchy signals a register shift the way it does when the schema is followed." It only affects the compound-beat FALLBACK case this whole repair targets (a model bundling narration/interiority into one dialogue beat instead of the schema's separate beats) — compliant output, which puts interior thought in its own exposition beat, already gets the distinct treatment. Not fixed here; flagged for Roman's decision on whether it needs its own follow-up.

Screenshots: `_validate_out/cg_beat_presentation_narration.png` (pure narration beat), `cg_beat_presentation_dialogue.png` (compliant quote-only beat — clean, centered), `cg_beat_presentation_compound.png` (the compound beat, cropped to the reader panel — this is where the flat-register finding above is visible), `cg_beat_presentation_compound_fullpage.png` (same, full viewport).
