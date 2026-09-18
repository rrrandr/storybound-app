#!/usr/bin/env node
// FIRST SACRIFICE SOURCE PACKET — rendered review-preview fixture (Roman, sixth redesign pass, 2026-09-17)
//
// CORRECTION HISTORY (disclosed, not erased):
//   Pass 3: showed ONLY the new-content delta, never the baked Scene 1. Roman: "where's the
//           800-word scene itself?" — fixed by rendering the real baked Scene 1 alongside it.
//   Pass 4: Roman corrected further — rendering the baked scene as "the reading experience"
//           silently treated it as approved-by-presence. The canonical authoring pass must
//           produce a full CANDIDATE REPLACEMENT Scene 1 for comparison, never a silent
//           substitute. This preview renders CURRENT (baked) vs CANDIDATE (new,
//           placeholder-marked) SIDE BY SIDE.
//   Pass 6 (this one): Roman's real-draft review found the whole `interrogationExchange` design
//           (a canned 7-line Julian/Lirael transcript) structurally wrong — the PLAYER IS LIRAEL,
//           so no OAS reply may ever be pre-scripted. That block is replaced here with:
//             oasOpening         — Julian's single authored opening line (≤14 words, one sentence)
//             [LIVE OAS]         — player-driven exchange; NOT produced by this adapter, NOT
//                                  rendered here beyond a marker; escalates from real player input
//             fixed interruption — unchanged, baked (interruptionImage/interruption)
//             fixed tail         — unchanged, baked (interruptionExchange)
//             postInterruptionBeat — authored narration/dialogue crystallizing an unresolved
//                                  choice WITHOUT deciding it, framed at image d4
//           This also fixed the sequencing error in the pre-Pass-6 design, which spliced the
//           fixed tail immediately at OAS entry instead of holding it for the real OAS exit event.
//
// Validates the placeholder draft through the real validator before rendering, so the preview can
// never show a shape the validator would reject.
//
// usage: node _first_sacrifice_review_preview.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));

// ── READ-ONLY: the real baked Scene 1 + oasHandoff, extracted directly from starter-scenes.js.
// Never modified, never re-narrated — quoted verbatim as the CURRENT comparison baseline. ──
const starterSrc = fs.readFileSync(path.join(__dirname, 'public/starter-scenes.js'), 'utf8');
const beatsBlockMatch = starterSrc.match(/beats: \[([\s\S]*?)\],\s*\n\s*endsAt:/);
const oasHandoffBlockMatch = starterSrc.match(/oasHandoff: \{([\s\S]*?)\n      \},\s*\n\s*emitted:/);
const currentBeats = new Function('return [' + beatsBlockMatch[1] + ']')();
const oasHandoff = new Function('return {' + oasHandoffBlockMatch[1] + '\n}')();

// Import the real validator function by re-reading its source and eval'ing just the function —
// simplest safe reuse without turning the validator script into a module export surface it
// doesn't otherwise need.
const validatorSrc = fs.readFileSync(path.join(__dirname, '_first_sacrifice_packet_validator.mjs'), 'utf8');
const fnMatch = validatorSrc.match(/function validateDraft[\s\S]*?\n}\n/);
const patternsMatch = validatorSrc.match(/const SEALED_PATTERNS[\s\S]*?(?=\nfunction validateDraft)/);
const sandbox = new Function('module', patternsMatch[0] + fnMatch[0] + '\nmodule.exports = validateDraft;');
const modObj = { exports: null };
sandbox(modObj);
const validateDraft = modObj.exports;

// ── PLACEHOLDER new content — structural only, every string is explicitly marked [PLACEHOLDER] ──
const PLACEHOLDER = '[PLACEHOLDER — not generated prose; structure only]';
const CARD_KEYS = ['temptation', 'silence', 'reversal', 'boundary', 'confession'];
const IMAGE_ORDER = ['intro_lirael', 'intro_seren', 'intro_dohkar', 'intro_julian', 'd1', 'd2', 'd3', 'd4'];
// SEVENTH PASS (Roman, 2026-09-17): 10 ids now (was 8) — wish_visibly_twists and
// twist_unnaturally_arrested added for the mandatory causal-and-strategic revision.
const REQUIRED_BEAT_IDS = ['ceremony_setting', 'seren_kneeling_rehearsed', 'cost_offering_statement', 'julian_introduced', 'invocation_begins', 'wish_and_sacrifice', 'wish_visibly_twists', 'twist_unnaturally_arrested', 'public_charge', 'social_fallout_family_reaction', 'julian_claims_the_answer'];
// Padded to clear scene1_composition_contract's per-beat 60-90 word range (Roman, 2026-09-17,
// tightened from 55-110) — still structurally placeholder, marked as such, not real prose.
// EXACTLY 20 beats — one per scene1_beat_number_template.slots entry, walking the packet's OWN
// template in order (image, kind, wordRange) rather than a hand-rolled uniform distribution. Fix
// for the real scene1_beat_asset_mapping_locked mismatches discovered 2026-09-18: the prior
// "4 images get 2 narr+1 dial, 4 get 1 narr+1 dial" split didn't match the template's actual
// non-uniform per-image beat counts (2,2,2,2,2,4,3,3), so most indices disagreed with the locked
// template slot at that index. Deriving directly from the template is correct-by-construction.
const padText = (label) => PLACEHOLDER + ' ' + label + ' padded to a full paragraph length so this placeholder fixture demonstrates the real required per-beat density range rather than a flat one-line summary, padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding.';
const BNT_SLOTS = PACKET.scene1_beat_number_template.slots;
const candidateBeats = BNT_SLOTS.map((slot, i) => {
  const kind = slot.kind === 'dialogue' ? 'dialogue' : (slot.kind === 'narration_or_dialogue' && i % 2 ? 'dialogue' : 'narration');
  return {
    kind,
    speaker: kind === 'dialogue' ? (i % 2 ? 'Julian' : 'Lirael') : null,
    image: slot.image,
    text: padText('candidate ' + kind + ' beat ' + (i + 1) + ' for ' + slot.image),
    provenance: { kind: 'generated_expression' },
  };
});
const draft = {
  scene1Candidate: { beats: candidateBeats },
  first_person_lirael: true,
  // Modulo into the fixed placeholder beat set — this preview proves rendering, not real
  // non-overlapping content coverage (the packet validator's own compliantDraft() models that).
  scene1Coverage: Object.fromEntries(REQUIRED_BEAT_IDS.map((id, i) => [id, [(i * 2) % candidateBeats.length, (i * 2 + 1) % candidateBeats.length]])),
  oasOpening: { speaker: 'Julian', text: PLACEHOLDER + ' Julian\'s opening turn, expanded to a full multi-sentence length so this placeholder fixture demonstrates the real 35-80 word range rather than a single blunt clause, padding padding padding padding padding.' },
  postInterruptionBeat: { speaker: null, image: 'd4', kind: 'narration', text: PLACEHOLDER + ' post-interruption beat crystallizing an unresolved choice, without deciding it.' },
  // fateCards deliberately absent — no longer an authored field (Roman, 2026-09-17 correction):
  // the real 5 fixed archetype cards are dealt live by generateIntimateFatePreviewsBatch after
  // each OAS exchange, including post-interruption, never pre-authored by this packet.
};

const validation = validateDraft(draft, PACKET);

function renderScene1(beats, label) {
  const L = [];
  L.push('### ' + label + ' (' + beats.length + ' beats, ~' + beats.reduce((n, b) => n + String(b.text).split(/\s+/).length, 0) + ' words)');
  L.push('');
  beats.forEach(b => {
    if (b.speaker) L.push('**' + b.speaker + '** _(' + b.kind + ', image=' + b.image + ')_');
    else L.push('_(' + b.kind + ', image=' + b.image + ')_');
    L.push(b.text);
    L.push('');
  });
  return L.join('\n');
}

function renderMarkdown() {
  const L = [];
  L.push('# First Sacrifice — Current vs. Candidate Review Preview');
  L.push('');
  L.push('**Packet**: ' + PACKET.packet_id + ' v' + PACKET.version + ' — ' + PACKET.status);
  L.push('**CORRECTION (Roman): the baked scene\'s presence in starter-scenes.js is NOT approval of its quality or provenance. This preview renders the CURRENT baked scene and a CANDIDATE replacement side by side for explicit review — it never silently substitutes one for the other. The candidate below is a STRUCTURAL PLACEHOLDER (not generated prose) — the actual draft comes from an authorized Grok call.**');
  L.push('');
  L.push('**SIXTH-PASS STRUCTURAL CORRECTION: the player IS Lirael. No OAS reply is ever pre-scripted.** The authored material is limited to `oasOpening` (Julian\'s one opening line) and `postInterruptionBeat` (the authored beat after the Dohkar\'s interruption) — everything between them is live, player-driven OAS, not produced by this adapter and not rendered below beyond a marker.');
  L.push('');
  L.push('## Validator result (on the placeholder candidate shape only): ' + (validation.ok ? '✅ PASS — zero violations' : '❌ FAIL'));
  if (!validation.ok) validation.violations.forEach(v => L.push('- **' + v.rule + '**: ' + v.detail));
  if (validation.diagnostics && validation.diagnostics.length) { L.push('  (non-blocking diagnostics, human-review-only, never affect PASS/FAIL):'); validation.diagnostics.forEach(d => L.push('  - **' + d.rule + '**: ' + d.detail)); }
  L.push('');
  L.push('## Required-beat coverage map (scene1Coverage)');
  REQUIRED_BEAT_IDS.forEach(id => {
    L.push('- `' + id + '`  ->  beats[' + draft.scene1Coverage[id].join(', ') + ']');
  });
  L.push('');
  L.push('═'.repeat(70));
  L.push('# OPTION A — CURRENT (baked, real, public/starter-scenes.js, read-only)');
  L.push('═'.repeat(70));
  L.push('');
  L.push(renderScene1(currentBeats, 'Scene 1 — CURRENT'));
  L.push('');
  L.push('═'.repeat(70));
  L.push('# OPTION B — CANDIDATE (new authoring pass, placeholder shown here)');
  L.push('═'.repeat(70));
  L.push('');
  L.push(renderScene1(candidateBeats, 'Scene 1 — CANDIDATE'));
  L.push('');
  L.push('═'.repeat(70));
  L.push('# OAS SEQUENCE — identical regardless of which Scene 1 is selected');
  L.push('═'.repeat(70));
  L.push('');
  L.push('## [FIXED — already baked, never regenerated] handoff cue');
  L.push('> ' + oasHandoff.cue);
  L.push('');
  L.push('## [NEW CONTENT — oasOpening, placeholder shown here, real content from an authorized Grok call]');
  L.push('**' + draft.oasOpening.speaker + ':** ' + draft.oasOpening.text);
  L.push('_(' + draft.oasOpening.text.split(/\s+/).length + ' words — real constraint: ONE sentence, ≤14 words, per the live OAS opener\'s own constraint at app.js:184458)_');
  L.push('');
  L.push('## [LIVE — player-driven OAS, NOT produced by this adapter, NOT rendered here]');
  L.push('The player answers Julian in real time via custom Say/Do, a Fate-card prefill (see below), or Petition/Tempt Fate. Julian\'s replies are generated live from the actual player input by the real `_handleIntimacyTurn` mechanism (app.js:193970), escalating toward inappropriately intimate/sexually charged territory without dictating Lirael\'s response. This adapter never authors any line in this range.');
  L.push('');
  L.push('## [FIXED — already baked, never regenerated] the Dohkar\'s interruption');
  L.push('_(image=' + oasHandoff.interruptionImage + ')_');
  L.push('_' + oasHandoff.interruption + '_');
  L.push('');
  oasHandoff.interruptionExchange.forEach(l => L.push((l.speaker ? '**' + l.speaker + ':** ' : '_(narration)_ ') + l.text));
  L.push('');
  L.push('_Open finding (NOT implemented, per Roman\'s "no provider call or package write" instruction): the real code has no guard requiring the player to have had a real turn before this interruption fires (`d.beatCount` can still be 0 if the player\'s first input is an exit phrase). Proposed structural condition: `d.beatCount >= 1`, reusing the real existing counter — an open decision item, not made in this pass.');
  L.push('');
  L.push('## [NEW CONTENT — postInterruptionBeat, placeholder shown here, real content from an authorized Grok call]');
  L.push((draft.postInterruptionBeat.speaker ? '**' + draft.postInterruptionBeat.speaker + ':** ' : '_(' + draft.postInterruptionBeat.kind + ', image=' + draft.postInterruptionBeat.image + ')_ ') + draft.postInterruptionBeat.text);
  L.push('_(must crystallize an unresolved choice/threat/invitation WITHOUT deciding it — the player then gets editable Say/Do, the 5 Fate cards below, and Petition/Tempt Fate)_');
  L.push('');
  L.push('## FIVE FATE CARDS — [LIVE, NOT produced by this adapter] (fixed archetypes: ' + CARD_KEYS.join(', ') + ')');
  L.push('Dealt fresh by the real, already-existing `generateIntimateFatePreviewsBatch` (public/orchestration-client.js:6511) — including right here, right after postInterruptionBeat — never a static authored set (Roman, 2026-09-17 correction). This packet authors nothing for them. Prefill Say/Do only; card click never advances, only a real Submit does.');
  L.push('');
  L.push('---');
  L.push('## Open review items (Roman\'s call, not decided by this preview)');
  L.push('- Roman authored the OUTLINE (locked facts, causal sequence, C+/E+ grounds, emotional requirement) — never the current baked Scene 1\'s prose, descriptions, or dialogue. Its presence is not approval; it is Option A, to be compared against Option B, not assumed superior.');
  L.push('- The candidate (Option B) must reuse ONLY the 8 existing images (' + IMAGE_ORDER.join(', ') + ') in this fixed order — no new image is ever generated.');
  L.push('- The 5 fate cards use the REAL, FIXED archetype contract traced from public/app.js:_INTR_SLOTS (temptation/silence/reversal/boundary/confession) — never freely-labeled postures. As of 2026-09-17 this packet authors NONE of their content: they are dealt live, fresh, per exchange, by generateIntimateFatePreviewsBatch, which now also receives this scene\'s authored context (see fate_card_lifecycle_correction in the packet).');
  L.push('- The whole `interrogationExchange` design is SUPERSEDED (Roman, sixth pass): the player is Lirael, so no OAS reply is ever pre-scripted. Only `oasOpening` and `postInterruptionBeat` are authored; the exchange between them is live, real-time player-driven OAS.');
  L.push('- The fixed tail (`interruptionImage`/`interruption`/`interruptionExchange`) is held for the real OAS exit event, not spliced immediately at OAS entry — this corrects a sequencing error in the pre-sixth-pass design.');
  { const census = PACKET.full_package_authoring_operation_census;
    L.push('- The authoring adapter (`_first_sacrifice_authoring_adapter.mjs`) is DRY — never calls a provider on its own. Real, current budget (measured ' + census.measured_on + '): ~' + census.real_prompt_size.est_input_tokens_chars_over_4_convention + ' est. input tokens, $' + census.cost_ceilings.expected_grok_success_1_call + ' expected-success ceiling, governor-admitted at ' + census.governor_check.utilization_pct + '% utilization — no provider call has been made under this exact schema yet.'); }
  return L.join('\n');
}

const rendered = renderMarkdown();
fs.writeFileSync(path.join(__dirname, '_first_sacrifice_review_preview.md'), rendered);
console.log(rendered);
console.log('\n' + '='.repeat(70));
console.log('Validator: ' + (validation.ok ? 'PASS' : 'FAIL') + (validation.ok ? '' : ' — ' + JSON.stringify(validation.violations)));
console.log('Rendered preview written to _first_sacrifice_review_preview.md');
if (!validation.ok) process.exitCode = 1;
