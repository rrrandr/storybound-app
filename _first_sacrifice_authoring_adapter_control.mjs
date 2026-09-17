#!/usr/bin/env node
// FIRST SACRIFICE AUTHORING ADAPTER — outbound-boundary-stubbed control (Roman, 2026-09-16)
//
// Proves the 5 properties Roman required before any draft-generation authorization is requested,
// plus (fourth redesign pass, 2026-09-17) the FULL-PACKAGE requirement — scene1Candidate is not
// optional, is grounded, reuses only existing images, and is structurally distinct from a
// silent-preservation of the current baked scene:
//   1. packet facts appear once in the constructed prompt; no unrelated starter/live-reader state leaks in
//   2. the adapter's output is a draft artifact only — never a starter-package or canon write
//   3. the OAS output has exactly five reviewable interaction cards and no auto-advance behavior encoded
//   3b. the schema REQUIRES a full candidate Scene 1 (~20 beats, existing images only, in order)
//   4. the structural scope gate rejects continuation-shaped output
//   5. a failure leaves no draft marked approved
//
// OUTBOUND BOUNDARY: global.fetch is stubbed to THROW on any invocation. The adapter module makes
// zero fetch calls by construction (it only builds prompt/request objects) — this proves that
// empirically rather than by code inspection alone. If any path in this control ever reaches
// fetch, the run fails loud, not silently.
//
// SIXTH REDESIGN PASS (Roman, 2026-09-17): the scripted `interrogationExchange` design is
// SUPERSEDED — the player IS Lirael, so no OAS reply may ever be pre-scripted. Fixtures here now
// use `oasOpening` (Julian's single authored opening line) and `postInterruptionBeat` (the
// authored narration/dialogue beat after the Dohkar's interruption); everything between those two
// points is live, player-driven OAS and is never produced by this adapter.
//
// usage: node _first_sacrifice_authoring_adapter_control.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let fetchCalls = 0;
global.fetch = function () { fetchCalls++; throw new Error('OUTBOUND BOUNDARY VIOLATION: fetch() was called — this control run must never reach the network'); };

let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));
const { buildFixedInputView, buildPacketAuthoringPrompt, buildAuthoringFallbackChain, ALLOWED_OUTPUT_SCHEMA } =
  await import('./_first_sacrifice_authoring_adapter.mjs');

// Reuse the REAL validator (same extraction technique as _first_sacrifice_review_preview.mjs —
// re-read its source and eval just the function, so this control never forks its own copy of the
// rejection rules).
const validatorSrc = fs.readFileSync(path.join(__dirname, '_first_sacrifice_packet_validator.mjs'), 'utf8');
const fnMatch = validatorSrc.match(/function validateDraft[\s\S]*?\n}\n/);
const patternsMatch = validatorSrc.match(/const SEALED_PATTERNS[\s\S]*?(?=\nfunction validateDraft)/);
const sandbox = new Function('module', patternsMatch[0] + fnMatch[0] + '\nmodule.exports = validateDraft;');
const modObj = { exports: null };
sandbox(modObj);
const validateDraft = modObj.exports;

const view = buildFixedInputView();
const { system, user } = buildPacketAuthoringPrompt(PACKET, view);
const chain = buildAuthoringFallbackChain(PACKET, view);

// ═══════════════════════════════════════════════════════════════════════════════
section('1. PACKET FACTS APPEAR ONCE; NO UNRELATED STARTER/LIVE-READER STATE LEAKS IN');
// ═══════════════════════════════════════════════════════════════════════════════
const combinedPrompt = system + '\n' + user;
function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0, idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) { count++; idx += needle.length; }
  return count;
}
// A distinctive locked fact string, unique to this packet — must appear exactly once (the packet
// renderer emits it in exactly one place; if it appeared 0 or >1 times, that would mean either the
// packet content didn't reach the prompt, or something is duplicating/re-injecting it).
const distinctiveFact = PACKET.locked_world_facts.the_answer.ownership;
ok('a distinctive locked-fact string (the_answer.ownership) appears in the prompt exactly once',
  countOccurrences(combinedPrompt, distinctiveFact) === 1,
  'found ' + countOccurrences(combinedPrompt, distinctiveFact) + ' occurrences');
const scopeLockStatement = PACKET.scope_lock.statement;
ok('the scope_lock statement appears in the prompt exactly once',
  countOccurrences(combinedPrompt, scopeLockStatement) === 1);
// Live-reader-state / other-starter concepts that exist elsewhere in this codebase and must NEVER
// appear in a packet-only prompt — if any of these leak in, the adapter silently pulled from a
// broader source than the immutable packet.
const FORBIDDEN_LEAK_TERMS = ['window.state', 'state.picks', 'state.storyId', 'state.turnCount',
  'corridor-mode', 'microDecision', 'Glass House', 'glass_house', 'arcTitle', 'STARTER_STORIES',
  'render_mode', 'staged_story_mode'];
const leaked = FORBIDDEN_LEAK_TERMS.filter(t => combinedPrompt.includes(t));
ok('no forbidden live-reader-state / other-starter terms leak into the constructed prompt', leaked.length === 0, JSON.stringify(leaked));
// The fixed input view itself must be exactly the minimal shape — no extra keys beyond what
// _authorMode's traced dependency footprint actually reads.
const viewKeys = Object.keys(view).sort();
ok('fixed input view has exactly the minimal traced key set, nothing extra',
  JSON.stringify(viewKeys) === JSON.stringify(['_authorModeOverride', 'picks', 'world', 'worldSubtype']));

// ═══════════════════════════════════════════════════════════════════════════════
section('2. OUTPUT IS A DRAFT ARTIFACT ONLY — NEVER A STARTER-PACKAGE OR CANON WRITE');
// ═══════════════════════════════════════════════════════════════════════════════
const adapterSrc = fs.readFileSync(path.join(__dirname, '_first_sacrifice_authoring_adapter.mjs'), 'utf8');
ok('adapter module source contains no fs.writeFileSync / fs.appendFileSync call anywhere',
  !/fs\.(writeFileSync|appendFileSync|writeFile|appendFile)/.test(adapterSrc));
// A DISCLOSED explanatory comment mentioning starter-scenes.js (why a full candidate is needed —
// Roman's fourth-pass correction) is legitimate; what must never exist is actual CODE that reads
// or writes that file. Tests the real safety property, not a blanket textual ban.
ok('adapter module source never READS OR WRITES starter-scenes.js (a mention in an explanatory comment is fine)',
  !/(?:readFileSync|writeFileSync|readFile|writeFile|require|import)\s*\([^)]*starter-scenes\.js/.test(adapterSrc));
ok('adapter module source never sets an "approved" or "canon" flag', !/\bapproved\s*[:=]\s*true\b|STARTER_SEEDS\s*\[/.test(adapterSrc));
const starterScenesPath = path.join(__dirname, 'public/starter-scenes.js');
const beforeMtime = fs.statSync(starterScenesPath).mtimeMs;
// Exercise every exported function fully (build view, prompt, full 3-tier chain) — proves running
// the adapter end-to-end has zero observable side effect on the real starter file.
buildFixedInputView(); buildPacketAuthoringPrompt(PACKET, view); buildAuthoringFallbackChain(PACKET, view);
const afterMtime = fs.statSync(starterScenesPath).mtimeMs;
ok('public/starter-scenes.js mtime is unchanged after fully exercising the adapter', beforeMtime === afterMtime);
ok('buildPacketAuthoringPrompt returns a plain {system,user} string pair, not a draft/approval object',
  typeof system === 'string' && typeof user === 'string' && Object.keys({ system, user }).length === 2);
ok('buildAuthoringFallbackChain returns exactly the APPROVED 3-tier order: Grok primary, ministral-8b-2512 fallback, OpenAI terminal, same token ceiling on every tier',
  chain.length === 3 && chain[0].name === 'Grok-4.3' && chain[0].tier === 'primary'
  && chain[1].name === 'Ministral-8B' && chain[1].tier === 'fallback' && chain[1].billedModel === 'ministral-8b-2512'
  && chain[2].name === 'GPT-4o' && chain[2].tier === 'terminal'
  && chain.every(t => t.max_tokens === chain[0].max_tokens));
// NOTE: the adapter's SOURCE COMMENTS legitimately mention "DeepSeek" — disclosed correction
// history explaining why it was rejected (this session's no-erase-on-correction norm). What must
// never contain DeepSeek is the ACTUAL RETURNED CHAIN the adapter would fire against, which this
// checks directly, not the comments explaining why it doesn't.
ok('DeepSeek never appears anywhere in the actual returned chain — not an approved provider for this task',
  !chain.some(t => /deepseek/i.test(JSON.stringify(t))));
ok('buildAuthoringFallbackChain returns an unfired chain (no fetch invoked by constructing it)', fetchCalls === 0);

// ═══════════════════════════════════════════════════════════════════════════════
section('3. OAS OUTPUT HAS EXACTLY FIVE REVIEWABLE CARDS (FIXED ARCHETYPE KEYS); NO AUTO-ADVANCE');
// ═══════════════════════════════════════════════════════════════════════════════
// A hand-built draft matching the adapter's declared ALLOWED_OUTPUT_SCHEMA (v2, real 5-archetype
// contract, traced from public/app.js:_INTR_SLOTS) exactly — proving the schema the adapter
// promises to emit is itself validator-compliant.
const CARD_KEYS = ALLOWED_OUTPUT_SCHEMA.card_keys_exact;
const SCENE1_IMAGES = ALLOWED_OUTPUT_SCHEMA.scene1_allowed_images_in_order;
function compliantScene1() {
  // 16 beats (minimum of the 16–24 tolerance), walking the 8 fixed images in order, each cited.
  // Each beat is a padded ~75-word placeholder paragraph — not real prose, but long enough to
  // clear the validator's 1,100-word density floor (Roman, sixth pass, 2026-09-17, raised from
  // 900), matching the real requirement that beats be full paragraphs, not flat one-liners.
  const pad = (label) => label + ' repeated across a full placeholder paragraph so this structural fixture clears the real word-count density floor without pretending to be finished prose, padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding padding.';
  return {
    beats: SCENE1_IMAGES.flatMap((img, i) => ([
      { kind: 'narration', speaker: null, image: img, text: pad('placeholder scene1 narration beat ' + i + ' for image ' + img + '.'), provenance: { kind: 'generated_expression' } },
      { kind: 'dialogue', speaker: i % 2 ? 'Julian' : 'Lirael', image: img, text: pad('placeholder scene1 dialogue beat ' + i + ' for image ' + img + '.'), provenance: { kind: 'generated_expression' } },
    ])),
  };
}
// SEVENTH PASS (Roman, 2026-09-17): 10 ids now (was 8) — wish_visibly_twists and
// twist_unnaturally_arrested added for the mandatory causal-and-strategic revision.
const REQUIRED_BEAT_IDS = ['ceremony_setting', 'seren_kneeling_rehearsed', 'cost_offering_statement', 'julian_introduced', 'invocation_begins', 'wish_and_sacrifice', 'wish_visibly_twists', 'twist_unnaturally_arrested', 'public_charge', 'julian_claims_the_answer'];
function compliantDraft() {
  const scene1Beats = compliantScene1().beats;
  return {
    scene1Candidate: { beats: scene1Beats },
    first_person_lirael: true,
    // Modulo into the fixed 16-beat fixture — this file proves the ADAPTER's declared schema is
    // structurally validator-compliant, not a model of real non-overlapping content coverage (see
    // the packet validator's own compliantDraft() for that, which uses real distinct beat indices).
    scene1Coverage: Object.fromEntries(REQUIRED_BEAT_IDS.map((id, i) => [id, [(i * 2) % scene1Beats.length, (i * 2 + 1) % scene1Beats.length]])),
    oasOpening: { speaker: 'Julian', text: 'placeholder opening accusation line.' },
    postInterruptionBeat: { speaker: null, image: 'd4', kind: 'narration', text: 'placeholder post-interruption beat crystallizing an unresolved choice.' },
    fateCards: Object.fromEntries(CARD_KEYS.map((k, i) => [k, {
      action: 'placeholder action ' + i, dialogue: 'placeholder dialogue text ' + i, variant: ['amplify', 'ruin', 'redirect'][i % 3],
    }])),
  };
}
const goodDraft = compliantDraft();
ok('adapter-schema-shaped draft has exactly the 5 fixed archetype keys', JSON.stringify(Object.keys(goodDraft.fateCards).sort()) === JSON.stringify([...CARD_KEYS].sort()));
const goodResult = validateDraft(goodDraft, PACKET);
ok('the real validator ACCEPTS the compliant draft (no false rejection)', goodResult.ok, JSON.stringify(goodResult.violations));

// RED: an invalid variant (auto-advance-equivalent misuse of the schema) must be rejected.
const badVariantDraft = compliantDraft();
badVariantDraft.fateCards.temptation.variant = 'auto_advance_on_click';
const badVariantResult = validateDraft(badVariantDraft, PACKET);
ok('a card with an invalid variant value is REJECTED', !badVariantResult.ok,
  badVariantResult.ok ? 'validator wrongly accepted an invalid variant' : undefined);

// RED: wrong card keys must be rejected (already covered by the packet validator's own suite,
// re-asserted here against the adapter's exact schema shape for end-to-end confidence).
const missingCardDraft = compliantDraft();
delete missingCardDraft.fateCards.boundary;
const missingCardResult = validateDraft(missingCardDraft, PACKET);
ok('a draft missing one of the 5 fixed archetype keys is REJECTED', !missingCardResult.ok);

// RED: an oversized action/dialogue line must be rejected — the real UI card contract is
// short-form (≤12/≤15 words), not free-length prose.
const oversizedDraft = compliantDraft();
oversizedDraft.fateCards.confession.dialogue = 'this dialogue line is deliberately far too long and rambling to fit the fifteen word ceiling the real card contract requires of every single card';
const oversizedResult = validateDraft(oversizedDraft, PACKET);
ok('a card with a dialogue line over 15 words is REJECTED', !oversizedResult.ok);

// ═══════════════════════════════════════════════════════════════════════════════
section('3b. THE SCHEMA REQUIRES A FULL CANDIDATE SCENE 1 (fourth redesign pass)');
// ═══════════════════════════════════════════════════════════════════════════════
// The adapter's own declared schema and constructed prompt must ASK for scene1Candidate — proves
// Roman's correction ("restore a full-package authoring contract") actually reached the request,
// not just the packet's design documentation.
ok('ALLOWED_OUTPUT_SCHEMA declares scene1Candidate as a required top-level field',
  ALLOWED_OUTPUT_SCHEMA.top_level.includes('scene1Candidate'));
ok('ALLOWED_OUTPUT_SCHEMA fixes the exact 8 existing images, in order — no new image may ever be requested',
  JSON.stringify(ALLOWED_OUTPUT_SCHEMA.scene1_allowed_images_in_order) === JSON.stringify(['intro_lirael', 'intro_seren', 'intro_dohkar', 'intro_julian', 'd1', 'd2', 'd3', 'd4']));
ok('the constructed prompt actually instructs the model to write scene1Candidate (not just the packet, the real request text)',
  /TASK 1 — scene1Candidate/.test(user) && /approximately 20 beats/.test(user));
ok('the constructed prompt states the current baked scene is not being shown/copied and is not pre-approved',
  /not approval of its quality or provenance/.test(user) && /CANDIDATE, not an approved rewrite/.test(user));

const goodScene1Draft = compliantDraft();
const goodScene1Result = validateDraft(goodScene1Draft, PACKET);
ok('a compliant scene1Candidate (16 beats, images in order, all cited/tagged) is ACCEPTED', goodScene1Result.ok, JSON.stringify(goodScene1Result.violations));

const tooShortScene1 = compliantDraft(); tooShortScene1.scene1Candidate.beats = tooShortScene1.scene1Candidate.beats.slice(0, 4);
const tooShortResult = validateDraft(tooShortScene1, PACKET);
ok('a scene1Candidate with only 4 beats (far short of ~20) is REJECTED', !tooShortResult.ok);

const badImageScene1 = compliantDraft(); badImageScene1.scene1Candidate.beats[0].image = 'a_brand_new_image_never_generated_before';
const badImageResult = validateDraft(badImageScene1, PACKET);
ok('a scene1Candidate beat referencing an image outside the 8 existing ones is REJECTED — no new image generation', !badImageResult.ok);

// ═══════════════════════════════════════════════════════════════════════════════
section('4. STRUCTURAL SCOPE GATE REJECTS CONTINUATION-SHAPED OUTPUT');
// ═══════════════════════════════════════════════════════════════════════════════
const continuationPlanDraft = compliantDraft();
continuationPlanDraft.continuationPlan = { nextScene: 'scene2', hook: 'placeholder' };
const cpResult = validateDraft(continuationPlanDraft, PACKET);
ok('a draft with an unapproved top-level continuationPlan field is REJECTED', !cpResult.ok,
  cpResult.ok ? 'validator wrongly accepted a continuation-shaped field' : undefined);
ok('the rejection is the STRUCTURAL unapproved_output_field rule, not a lexical scan',
  !cpResult.ok && cpResult.violations.some(v => v.rule === 'unapproved_output_field'));

const sceneSpineDraft = compliantDraft();
sceneSpineDraft.sceneSpine = { local_objective: 'placeholder' };
const ssResult = validateDraft(sceneSpineDraft, PACKET);
ok('a draft with an unapproved top-level sceneSpine field is REJECTED', !ssResult.ok);

// GREEN control proving the gate is genuinely structural, not lexical: ordinary prose that
// MENTIONS "Scene 2" in dialogue/narration text must NOT be rejected — only unapproved STRUCTURE is.
const mentionsScene2Draft = compliantDraft();
mentionsScene2Draft.postInterruptionBeat.text = 'Somewhere distantly Lirael wonders what Scene 2, if there is one, will bring.';
const mentionsResult = validateDraft(mentionsScene2Draft, PACKET);
ok('a draft whose PROSE merely mentions "Scene 2" (no unapproved field) is NOT rejected', mentionsResult.ok, JSON.stringify(mentionsResult.violations));

// A continuation-shaped field smuggled onto a line itself (nested, not top-level) must also be caught.
const nestedContinuationDraft = compliantDraft();
nestedContinuationDraft.oasOpening.continuationHint = 'sets up scene 2';
const nestedResult = validateDraft(nestedContinuationDraft, PACKET);
ok('an unapproved field nested on oasOpening is REJECTED', !nestedResult.ok);

// A field belonging to the OLD (superseded) card schema (posture_label/prefill_text) smuggled
// onto a v2 card must also be caught — proves the gate did not just get lucky on new field names.
const oldSchemaFieldDraft = compliantDraft();
oldSchemaFieldDraft.fateCards.silence.posture_label = 'an old-schema leftover';
const oldSchemaResult = validateDraft(oldSchemaFieldDraft, PACKET);
ok('an old-schema field (posture_label) smuggled onto a v2 card is REJECTED', !oldSchemaResult.ok);

// ═══════════════════════════════════════════════════════════════════════════════
section('5. A FAILURE LEAVES NO DRAFT MARKED APPROVED');
// ═══════════════════════════════════════════════════════════════════════════════
// A minimal, honest simulation of the review gate Roman specified (review_defaults.on_rejection):
// a draft is "approved" ONLY if validateDraft(...).ok is true; nothing else in this codebase can
// set that flag today (the adapter itself never writes one — proven in section 2).
function reviewGate(draft) {
  // MINIMUM PRESENCE PRECONDITION (a property of THIS REVIEW GATE, not the shared validator —
  // validateDraft stays reject-only per doctrine and legitimately returns ok:true/no-violations
  // on null/empty input, since there is nothing present to reject; a real approval pipeline adds
  // its own "is there actually content here" check on top, which is what this does).
  const hasMinimumContent = !!(draft && draft.oasOpening && typeof draft.oasOpening === 'object'
    && draft.postInterruptionBeat && typeof draft.postInterruptionBeat === 'object'
    && draft.fateCards && typeof draft.fateCards === 'object');
  if (!hasMinimumContent) return { approved: false, violations: [{ rule: 'no_content_present', detail: 'draft is null/empty/malformed — nothing to approve' }] };
  try {
    const result = validateDraft(draft, PACKET);
    return { approved: result.ok === true, violations: result.violations };
  } catch (e) {
    // A crashed validator call must fail CLOSED, not leave "approved" ambiguous or throw past the gate uncaught.
    return { approved: false, violations: [{ rule: 'validator_threw', detail: String(e.message || e) }] };
  }
}
const failingDrafts = [badVariantDraft, missingCardDraft, oversizedDraft, continuationPlanDraft, sceneSpineDraft, nestedContinuationDraft, oldSchemaFieldDraft];
const anyWronglyApproved = failingDrafts.some(d => reviewGate(d).approved === true);
ok('every failing fixture used above results in approved:false through the review gate', !anyWronglyApproved);
ok('a malformed/crashed adapter output (null) fails CLOSED — approved:false, not an uncaught throw',
  reviewGate(null).approved === false);
// Confirm the passing draft DOES get approved:true — proves the gate isn't just always-false either.
ok('the one genuinely compliant draft used above IS approved:true through the same gate', reviewGate(goodDraft).approved === true);

// ═══════════════════════════════════════════════════════════════════════════════
section('OUTBOUND BOUNDARY');
// ═══════════════════════════════════════════════════════════════════════════════
ok('fetch was never called anywhere in this entire control run', fetchCalls === 0);

console.log('\n' + '='.repeat(70));
console.log(`FIRST SACRIFICE AUTHORING ADAPTER CONTROL: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  - ' + f)); process.exitCode = 1; }
