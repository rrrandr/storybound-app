#!/usr/bin/env node
// FIRST SACRIFICE AUTHORING ADAPTER — outbound-boundary-stubbed control (Roman, 2026-09-16)
//
// Proves the 5 properties Roman required before any draft-generation authorization is requested,
// plus (fourth redesign pass, 2026-09-17) the FULL-PACKAGE requirement — scene1Candidate is not
// optional, is grounded, reuses only existing images, and is structurally distinct from a
// silent-preservation of the current baked scene:
//   1. packet facts appear once in the constructed prompt; no unrelated starter/live-reader state leaks in
//   2. the adapter's output is a draft artifact only — never a starter-package or canon write
//   3. fateCards is NOT an authored field (Roman, 2026-09-17 correction) — the real 5 fixed archetype
//      cards are dealt live by the app's own dynamic mechanism after each OAS exchange, never
//      pre-authored; this control proves the schema no longer declares it and the prompt no longer
//      asks the model to write it
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
// THE ANSWER — STATEFUL MANIFESTATION RECEIPT (Roman, 2026-09-19, corrected to a stateful identity-
// vs-manifestation model 2026-09-20): "prove the authoring prompt contains the staff-and-hooks
// identity" as the CURRENT manifestation, not a permanently-fixed form. Real invocation, not static
// packet inspection — checks the ACTUAL constructed prompt text.
const manFact = PACKET.scene1_answer_manifestation;
const curFact = manFact.current_manifestation;
ok('the constructed prompt states The Answer\'s CURRENT manifestation ("staff", "double-ended shaft") as a HARD object-fidelity constraint',
  /CURRENT MANIFESTATION for this scene/.test(user) && new RegExp(curFact.form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(user) && new RegExp('manifestation_id: "' + curFact.manifestation_id + '"').test(user));
ok('the constructed prompt states the SHARED FATELANDS REALITY LAW explicitly — wish-crafted relics may shift manifestation only via a declared wielder need, not a First-Sacrifice-only rule',
  /SHARED FATELANDS REALITY LAW/.test(user) && /wish-crafted relics may shift physical manifestation/.test(user) && /only as the declared consequence of a concrete wielder need/.test(user) && /_fatelands_reality_seam_and_manifestation_law\.json/.test(user) && /this law never applies outside Fatelands Fantasy/.test(user));
ok('the constructed prompt states that NO manifestation-change event is permitted in this scene (real packet state: zero permitted events)',
  /NO manifestation-change event is permitted anywhere in this scene/.test(user));
ok('constructing the prompt throws if the packet is not scoped to fatelands_fantasy (the shared law must never be imposed on Famous Fate or another independently-canonical world)',
  (() => { const p = JSON.parse(JSON.stringify(PACKET)); p.world_scope = 'famous_fate'; try { buildPacketAuthoringPrompt(p, view); return false; } catch (e) { return /refusing to render the shared Fatelands manifestation law/.test(e.message); } })());
// WISH-MISALIGNMENT VISUAL GRAMMAR (Roman, 2026-09-20, real Attempt 8 finding) — real invocation,
// not static packet inspection: the constructed prompt must state all 6 requirement bullets, the
// banned attack-grammar vocabulary list, and the shared law citation. Also proves the fix reaches
// the model where it actually lands: the per-slot numbered template (which real Attempt 8's own
// convergence traced back to) now states the corrected fn text, not the old "concrete FORCE" one.
const wtaFact = PACKET.wish_twist_and_arrest_requirement;
ok('the constructed prompt renders all 6 real wish_twist_and_arrest_requirement bullets, including the NEW recognition-of-wrongness and quiet-pull bullets', wtaFact.requirement.every(r => user.includes(r)));
ok('the constructed prompt states the banned attack-grammar vocabulary list and cites the shared wish-misalignment law file', user.includes(wtaFact.banned_wrong_visual_grammar) && user.includes(wtaFact.governing_law.file));
ok('the constructed prompt\'s hard boundary explicitly forbids a projectile/rift/burst/beam/scorch-trail visible attack', /do not write an on-screen magical projectile, dark rift\/seam, burst, beam, scorch trail/.test(user));
ok('the per-slot numbered template (real convergence source) now states the CORRECTED wish_visibly_twists fn text — a subjective pull, never "concrete FORCE... physical/magical threat"', user.includes(PACKET.scene1_beat_number_template.slots[12].fn) && !/concrete FORCE: a real, immediate physical\/magical threat/.test(user));
ok('the per-slot numbered template states the CORRECTED twist_unnaturally_arrested fn text — no scorch marks left behind', user.includes(PACKET.scene1_beat_number_template.slots[13].fn) && /do not describe scorch marks/.test(user));
ok('the per-slot numbered template states the CORRECTED public_charge fn text — never scorch marks or physical damage as evidence', user.includes(PACKET.scene1_beat_number_template.slots[14].fn) && /NEVER in scorch marks or other physical damage/.test(user));
// CAUSAL-CHAIN SPECIFICITY (Roman, 2026-09-20, following a real human read-through finding: the
// mechanically-clean wish-twist correction was still too abstract — "cold directionality... a new
// anchor" named no referent and no danger). Real invocation proving the STRENGTHENED requirement
// (not just the attack-grammar ban) reaches the actual prompt.
ok('the constructed prompt requires the wish_visibly_twists beat to stay connected to the WISH\'s own object ("find the one she lost," still deliberately unnamed) and to WRONG/HORRIBLE-fulfillment danger language — not merely the absence of attack-grammar vocabulary', /must remain legible in THIS beat, not merely assumed from an earlier one/.test(user) && /find the one she lost/.test(user) && /WRONGLY or HORRIBLY/.test(user));
ok('the constructed prompt explicitly distinguishes the WISH\'s object from Seren\'s own separate sacrificed cost — the real, disclosed root cause of the ambiguous "her stated loss" phrasing that produced the too-abstract real correction', /Distinguish clearly from Seren's OWN sacrificed cost/.test(user));
ok('the constructed prompt explicitly says not to invent material, color, weight, powers, or additional history',
  /Do not invent its material, color, weight, powers, or additional history/.test(user));
// STRUCTURED OBJECT-CLAIM METADATA RECEIPT — widened 2026-09-20: mandatory not merely on a literal
// name, but on any physical handling, visual description, or transformation.
ok('the constructed prompt mandates objectClaims metadata for naming, physical handling, visual description, OR transformation — not merely literal naming',
  /MANDATORY WHENEVER YOU NAME, PHYSICALLY HANDLE, VISUALLY DESCRIBE, OR NARRATE A TRANSFORMATION/.test(user) && /objectClaims array with exactly one entry/.test(user));
ok('the constructed prompt states physical_form_claim as a closed choice resolved against the packet\'s OWN declared manifestations (never free text)',
  /CLOSED CHOICE/.test(user) && /"neutral_reference"/.test(user) && new RegExp(curFact.manifestation_id).test(user) && /Never write a free-text form description here/.test(user) && /never claim a manifestation_id that is not active at that exact position/.test(user));
ok('the constructed prompt requires claim_kind="locked_canon_fact" + cites whenever a manifestation is restated',
  /claim_kind MUST be "locked_canon_fact" and cites MUST be present/.test(user));
ok('the constructed prompt gives a worked example of both the neutral and current-manifestation-restated claim shapes',
  user.includes(manFact.object_claim_schema.example_neutral) && user.includes(manFact.object_claim_schema.example_current_manifestation_restated));
// ATTEMPT-6 DIAGNOSIS FIXES (Roman, 2026-09-20) — real invocation, not static packet inspection:
// Fix 1 (density): a FINAL SELF-CHECK block, placed last in the prompt to exploit recency, with a
// dynamically-computed word-count arithmetic anchor (never a hardcoded number that could drift from
// the real per-slot template).
const bntCheck = PACKET.scene1_beat_number_template;
const minTotalCheck = bntCheck.slots.reduce((n, s) => n + s.wordRange[0], 0);
ok('the constructed prompt ends with a FINAL SELF-CHECK block instructing the model to verify each beat\'s word count before returning JSON',
  /BEFORE YOU RETURN JSON — SELF-CHECK EVERY BEAT\'S WORD COUNT/.test(user) && /never by padding with generic description/.test(user));
ok('the FINAL SELF-CHECK block states the correct, dynamically-computed sum of the 20 slots\' stated minimums (not a stale hardcoded figure)',
  user.includes('those 20 minimums alone total ' + minTotalCheck + ' words'));
ok('the FINAL SELF-CHECK block is the LAST thing in the constructed prompt (recency placement, not buried mid-prompt)',
  user.trim().endsWith('length and density are not optional polish, they are the task.'));
// Fix 2 (convergence): requirement #2 was generalized from a prescriptive 3-step rhetorical formula
// to a looser functional requirement, after the real Attempt 6 draft independently converged on a
// 7+ word verbatim match against a historical exemplar that was never rendered into the prompt.
const req2 = PACKET.attempt4_craft_requirements_abstract.requirements[1];
ok('the constructed prompt renders the GENERALIZED requirement #2 (specific observed behavior + genuine subtext, no fixed rhetorical shape) — real 2026-09-20 packet content',
  user.includes(req2) && /Do NOT reuse any single fixed rhetorical shape/.test(user));
ok('the constructed prompt does NOT contain the OLD prescriptive 3-step formula language retired after Attempt 6\'s convergence finding',
  !/UNCONSCIOUS influence/.test(user) && !/invert the expected accusation into something closer to an invitation/.test(user));
ok('the constructed prompt renders the strengthened hard_boundary warning that a shared convergent shape for requirement #2 is itself too prescriptive',
  user.includes(PACKET.attempt4_craft_requirements_abstract.hard_boundary));
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
section('3. FATE CARDS ARE NOT AN AUTHORED FIELD — dealt live by the real dynamic mechanism');
// ═══════════════════════════════════════════════════════════════════════════════
// FATE-CARD LIFECYCLE CORRECTION (Roman, 2026-09-17): this packet no longer authors a fateCards
// field. The 5 fixed archetypes (temptation/silence/reversal/boundary/confession) are dealt fresh
// by the real, already-existing generateIntimateFatePreviewsBatch after EACH live OAS exchange,
// including post-interruption — never pre-authored once. See packet fate_card_lifecycle_correction.
ok('ALLOWED_OUTPUT_SCHEMA no longer declares fateCards anywhere (top-level or card-shape fields)',
  !ALLOWED_OUTPUT_SCHEMA.top_level.includes('fateCards') && !ALLOWED_OUTPUT_SCHEMA.card_keys_exact && !ALLOWED_OUTPUT_SCHEMA.card_fields && !ALLOWED_OUTPUT_SCHEMA.variant_values);
ok('the constructed prompt no longer contains a TASK 4 / fateCards authoring task', !/TASK 4/.test(user) && !/you choose HOW each manifests/.test(user));
ok('the constructed prompt explicitly tells the model it does NOT author fate cards, and names the real mechanism', /NOTE ON FATE CARDS \(you do NOT author these\)/.test(user) && /generated fresh by the real, already-existing app mechanism/.test(user));
const SCENE1_IMAGES = ALLOWED_OUTPUT_SCHEMA.scene1_allowed_images_in_order;
function compliantScene1() {
  // Walks the packet's OWN scene1_beat_number_template.slots in order — one output beat per slot,
  // using that slot's exact image, an eligible kind, and a word count inside its declared
  // wordRange — rather than a hand-rolled independent distribution. This is the fix for the real
  // scene1_beat_asset_mapping_locked violations discovered 2026-09-18: this fixture's OWN prior
  // uniform "4 images get 2 narr+1 dial, 4 get 1 narr+1 dial" distribution didn't match the rich
  // template's actual non-uniform per-image beat counts (2,2,2,2,2,4,3,3), so most beat indices'
  // images disagreed with the locked template slot at that index. Deriving directly from the
  // template makes this fixture correct-by-construction and immune to future template edits.
  const bntSlots = PACKET.scene1_beat_number_template.slots;
  const word = (n) => Array.from({ length: n }, (_, i) => 'word' + i).join(' ');
  return {
    beats: bntSlots.map((slot, i) => {
      const kind = slot.kind === 'dialogue' ? 'dialogue' : (slot.kind === 'narration_or_dialogue' && i % 2 ? 'dialogue' : 'narration');
      const targetWords = Math.min(slot.wordRange[1], Math.max(slot.wordRange[0], slot.wordRange[0] + 5));
      return {
        kind,
        speaker: kind === 'dialogue' ? (i % 2 ? 'Julian' : 'Lirael') : null,
        image: slot.image,
        text: 'placeholder scene1 ' + kind + ' beat ' + (i + 1) + ' for image ' + slot.image + ' — ' + word(targetWords) + '.',
        provenance: { kind: 'generated_expression' },
      };
    }),
  };
}
// SEVENTH PASS (Roman, 2026-09-17): 10 ids now (was 8) — wish_visibly_twists and
// twist_unnaturally_arrested added for the mandatory causal-and-strategic revision.
const REQUIRED_BEAT_IDS = ['ceremony_setting', 'seren_kneeling_rehearsed', 'cost_offering_statement', 'julian_introduced', 'invocation_begins', 'wish_and_sacrifice', 'wish_visibly_twists', 'twist_unnaturally_arrested', 'public_charge', 'social_fallout_family_reaction', 'julian_claims_the_answer'];
function compliantDraft() {
  const scene1Beats = compliantScene1().beats;
  return {
    scene1Candidate: { beats: scene1Beats },
    first_person_lirael: true,
    // Modulo into the fixed 16-beat fixture — this file proves the ADAPTER's declared schema is
    // structurally validator-compliant, not a model of real non-overlapping content coverage (see
    // the packet validator's own compliantDraft() for that, which uses real distinct beat indices).
    scene1Coverage: Object.fromEntries(REQUIRED_BEAT_IDS.map((id, i) => [id, [(i * 2) % scene1Beats.length, (i * 2 + 1) % scene1Beats.length]])),
    oasOpening: { speaker: 'Julian', text: 'placeholder opening accusation turn, expanded to a full multi-sentence length so this structural fixture clears the real 35-80 word range requirement without pretending to be finished authored dialogue, padding padding padding padding padding padding padding.' },
    postInterruptionBeat: { speaker: null, image: 'd4', kind: 'narration', text: 'placeholder post-interruption beat crystallizing an unresolved choice.' },
    // fateCards deliberately absent — no longer an authored field (Roman, 2026-09-17).
  };
}
const goodDraft = compliantDraft();
const goodResult = validateDraft(goodDraft, PACKET);
ok('the real validator ACCEPTS the compliant draft (no false rejection)', goodResult.ok, JSON.stringify(goodResult.violations));

// RED: a draft that DOES include fateCards (old habit / stale model memory / regression) must now
// be rejected as an unapproved field — the schema-removal has real teeth, not just documentation.
const fateCardsDraft = compliantDraft();
fateCardsDraft.fateCards = { temptation: { action: 'x', dialogue: 'y', variant: 'amplify' } };
const fateCardsResult = validateDraft(fateCardsDraft, PACKET);
ok('a draft that still includes fateCards is REJECTED as an unapproved top-level field', !fateCardsResult.ok && fateCardsResult.violations.some(v => v.rule === 'unapproved_output_field' && /fateCards/.test(v.detail)), JSON.stringify(fateCardsResult.violations));

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
  /TASK 1 — scene1Candidate/.test(user) && /EXACTLY 20 beats/.test(user));
ok('the constructed prompt states the current baked scene is not being shown/copied and is not pre-approved',
  /not approval of its quality or provenance/.test(user) && /CANDIDATE, not an approved rewrite/.test(user));

const goodScene1Draft = compliantDraft();
const goodScene1Result = validateDraft(goodScene1Draft, PACKET);
ok('a compliant scene1Candidate (exactly 20 beats, images in order, all cited/tagged) is ACCEPTED', goodScene1Result.ok, JSON.stringify(goodScene1Result.violations));

const tooShortScene1 = compliantDraft(); tooShortScene1.scene1Candidate.beats = tooShortScene1.scene1Candidate.beats.slice(0, 4);
const tooShortResult = validateDraft(tooShortScene1, PACKET);
ok('a scene1Candidate with only 4 beats (far short of ~20) is REJECTED', !tooShortResult.ok);

const badImageScene1 = compliantDraft(); badImageScene1.scene1Candidate.beats[0].image = 'a_brand_new_image_never_generated_before';
const badImageResult = validateDraft(badImageScene1, PACKET);
ok('a scene1Candidate beat referencing an image outside the 8 existing ones is REJECTED — no new image generation', !badImageResult.ok);

// ═══════════════════════════════════════════════════════════════════════════════
section('3c. THE ADAPTER RECEIVES THE LOCKED scene1_visual_storyboard — cannot assign a beat elsewhere');
// ═══════════════════════════════════════════════════════════════════════════════
// "Prove the authoring adapter receives this locked mapping and cannot assign a candidate beat to a
// different asset/occurrence" (Roman, 2026-09-19). Two real proofs: (a) the rendered prompt's per-
// beat lines are BYTE-IDENTICAL to what scene1_visual_storyboard.beats declares — real receipt, not
// a coincidence with the older template; (b) tampering the storyboard to disagree with the template
// makes prompt construction THROW rather than silently build from an inconsistent packet — proving
// the adapter's code path genuinely DEPENDS on the storyboard, it doesn't merely happen to agree.
const sbForCheck = PACKET.scene1_visual_storyboard;
ok('every rendered "Beat N [occurrence]" line in the prompt matches scene1_visual_storyboard.beats exactly (real receipt, not coincidence)',
  sbForCheck.beats.every(b => user.includes('Beat ' + b.n + ' [' + b.occurrence + ']' + (b.id ? ' id="' + b.id + '"' : ' (free)') + ' — kind: ' + b.kind + ' — words: ' + b.wordRange[0] + '-' + b.wordRange[1])));
{
  const tamperedPacket = JSON.parse(JSON.stringify(PACKET));
  tamperedPacket.scene1_visual_storyboard.beats[8].occurrence = 'd3'; // template slot 9 (n=9) says "d1" — deliberate drift
  let threw = null;
  try { buildPacketAuthoringPrompt(tamperedPacket, view); } catch (e) { threw = e && e.message; }
  ok('RED: a packet whose scene1_visual_storyboard has been tampered to drift from scene1_beat_number_template makes prompt construction THROW — the adapter refuses to build a prompt from an internally-inconsistent packet',
    !!threw && /drifted from the locked scene1_beat_number_template/.test(threw), threw);
}
{
  const tamperedPacket2 = JSON.parse(JSON.stringify(PACKET));
  delete tamperedPacket2.scene1_visual_storyboard;
  let threw2 = null;
  try { buildPacketAuthoringPrompt(tamperedPacket2, view); } catch (e) { threw2 = e && e.message; }
  ok('RED: a packet with NO scene1_visual_storyboard at all makes prompt construction THROW rather than silently falling back to an unreviewed mapping',
    !!threw2 && /refusing to construct a beat-plan prompt without the locked, reviewed storyboard/.test(threw2), threw2);
}

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
    && draft.postInterruptionBeat && typeof draft.postInterruptionBeat === 'object');
  if (!hasMinimumContent) return { approved: false, violations: [{ rule: 'no_content_present', detail: 'draft is null/empty/malformed — nothing to approve' }] };
  try {
    const result = validateDraft(draft, PACKET);
    return { approved: result.ok === true, violations: result.violations };
  } catch (e) {
    // A crashed validator call must fail CLOSED, not leave "approved" ambiguous or throw past the gate uncaught.
    return { approved: false, violations: [{ rule: 'validator_threw', detail: String(e.message || e) }] };
  }
}
const failingDrafts = [fateCardsDraft, tooShortScene1, badImageScene1, continuationPlanDraft, sceneSpineDraft, nestedContinuationDraft];
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
