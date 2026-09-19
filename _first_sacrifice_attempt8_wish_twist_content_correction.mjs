#!/usr/bin/env node
// FIRST SACRIFICE — Attempt 8, FOCUSED WISH-TWIST CONTENT CORRECTION (Roman, 2026-09-20, authorized).
//
// The real, corrected Attempt 8 candidate (08_corrected_candidate_from_pass1.json) fails the NEW
// wish_twist_wrong_visual_grammar validator rule on exactly 3 beats — the same 3 beats the shared
// _fatelands_ordinary_wish_misalignment_law.json / _fatelands_misalignment_perception_law.json
// correction targets:
//   - beat[12] (slot 13, wish_visibly_twists): "A dark seam opened..." ("seam")
//   - beat[13] (slot 14, twist_unnaturally_arrested): "The seam stopped..." ("seam")
//   - beat[14] (slot 15, public_charge): "...The residue on the grass stands as witness." ("residue")
//
// This is a SEPARATE, narrowly-scoped, EXPLICITLY AUTHORIZED real repair pass — NOT the density
// bounded-repair engine (wish_twist_wrong_visual_grammar is not in REPAIR_ELIGIBLE_VALIDATOR_RULES
// and never will be; canon violations are never auto-repaired by that engine). It reuses
// mergeRepairIntoDraft's proven bounded-merge contract (only 'n'/'text' fields, full-slot
// replacement, fails closed) with a purpose-built, content-focused prompt for exactly these 3
// slots — never a whole-scene rewrite, never touching any other beat, oasOpening, or
// postInterruptionBeat.
//
// Real, paid call. Explicitly authorized by Roman ("authorize the focused revision for the
// wish-twist beats"). Preserves 08_corrected_candidate_from_pass1.json untouched; writes a NEW
// artifact. Does NOT write to starter-scenes.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const OUT_DIR = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package');
const SOURCE_PATH = path.join(OUT_DIR, '08_corrected_candidate_from_pass1.json');
if (!fs.existsSync(SOURCE_PATH)) throw new Error('08_corrected_candidate_from_pass1.json not found — this script only corrects FROM that real, already-derived candidate.');

const envPath = path.join(__dirname, '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
envText.split('\n').forEach(line => {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) return;
  let val = m[2];
  if (val.length >= 2 && ((val[0] === '"' && val[val.length - 1] === '"') || (val[0] === "'" && val[val.length - 1] === "'"))) {
    val = val.slice(1, -1);
  }
  if (!process.env[m[1]]) process.env[m[1]] = val;
});
console.log('Env loaded. Keys present: XAI=' + !!process.env.XAI_API_KEY + ' MISTRAL=' + !!process.env.MISTRAL_API_KEY + ' OPENAI=' + !!process.env.OPENAI_API_KEY);

const { mergeRepairIntoDraft } = await import('./_first_sacrifice_bounded_repair_engine.mjs');
const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));
const LAW = JSON.parse(fs.readFileSync(path.join(__dirname, '_fatelands_ordinary_wish_misalignment_law.json'), 'utf8'));
const sourceArtifact = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
const draft = sourceArtifact.draft;
const bnt = PACKET.scene1_beat_number_template;
const wta = PACKET.wish_twist_and_arrest_requirement;

// ── The 3 real, already-identified violating slots (n = 1-indexed slot number = beat index + 1) ──
const TARGET_SLOT_NS = [13, 14, 15];
const targets = TARGET_SLOT_NS.map(n => {
  const slot = bnt.slots[n - 1];
  const beat = draft.scene1Candidate.beats[n - 1];
  return { n, slot, beat, currentWords: beat.text.trim().split(/\s+/).filter(Boolean).length };
});

// ── Build the focused, content-correction prompt (full-slot replacement, NOT the density engine's
// word-count-midpoint framing — this preserves length, corrects CONTENT). ──
function buildWishTwistCorrectionPrompt() {
  const L = [];
  L.push('You are performing a BOUNDED CONTENT CORRECTION on exactly 3 beats of an otherwise-accepted, otherwise-approved Scene 1 candidate. Every other beat, oasOpening, and postInterruptionBeat is already final and must not be touched or echoed back.');
  L.push('');
  L.push('WHY THESE 3 BEATS ARE BEING REPLACED (HARD — this is the entire task): they currently depict the wish\'s misalignment as a visible magical ATTACK (a "dark seam," a directed force, scorch-mark "residue" cited as evidence). A Fatelands canon correction has determined this is WRONG for an ORDINARY wish misalignment. Your job is to rewrite these 3 beats so they follow the corrected law below, while preserving everything else already established: the same causal event (Seren\'s wish bending toward Lirael, Lirael\'s already-established recognition that Seren\'s performance was self-serving, an unexplained cessation, then the Dohkar\'s public charge), the same speakers, the same images, and the same approximate scope/weight in the scene.');
  L.push('');
  L.push('THE CORRECTED FATELANDS LAW (HARD, mechanically checked — see _fatelands_ordinary_wish_misalignment_law.json):');
  L.push(LAW.statement);
  L.push('VALID shapes: ' + LAW.effect_classification.valid_for_ordinary_wish_misalignment.map(e => e.id + ' (' + e.description + ')').join(' | '));
  L.push('INVALID — never write these: ' + LAW.effect_classification.invalid_for_ordinary_wish_misalignment.map(e => e.id + ' (' + e.description + ')').join(' | '));
  L.push('BANNED VOCABULARY (mechanically checked): ' + wta.banned_wrong_visual_grammar);
  L.push('');
  L.push('FULL REQUIREMENT (HARD — all 6 bullets, unchanged from the approved packet):');
  wta.requirement.forEach((r, i) => L.push('  ' + (i + 1) + '. ' + r));
  L.push('Hard boundary: ' + wta.hard_boundary);
  L.push('');
  L.push('SEALED — MUST NOT SURFACE OR IMPLY (unchanged from the approved packet):');
  PACKET.sealed_facts_forbidden_pre_surface.forEach(f => L.push('  - ' + f.rule));
  L.push('');
  L.push('FULL ACCEPTED SCENE — for continuity only (you are replacing ONLY the 3 [NEEDS CORRECTION] slots below; every other beat shown here is already final and must not be echoed back):');
  draft.scene1Candidate.beats.forEach((b, i) => {
    const n = i + 1;
    const flagged = TARGET_SLOT_NS.includes(n);
    L.push('Beat ' + n + (flagged ? ' [NEEDS CORRECTION — REPLACE ENTIRELY]' : ' [ACCEPTED — do not return this one]') + ' (' + b.kind + ', image=' + b.image + '): ' + b.text);
  });
  L.push('');
  L.push('SLOTS TO REPLACE — each is a COMPLETE rewrite, correcting content only, never a mechanical edit of the flagged text:');
  targets.forEach(t => {
    L.push('  - Slot ' + t.n + ' (id=' + (t.slot.id || 'null') + ', image=' + t.slot.image + ', kind=' + t.slot.kind + '): current text (' + t.currentWords + ' words) uses attack-grammar vocabulary and must be REPLACED — do not simply delete the banned word(s), rewrite the beat\'s content to follow the corrected law above. Aim for roughly ' + t.currentWords + ' words (this slot\'s stated floor is ' + t.slot.wordRange[0] + '; there is no longer a hard ceiling, but stay reasonably close to the original length — do not pad). This slot\'s corrected function: ' + t.slot.fn);
  });
  L.push('');
  L.push('SPECIFIC NOTE for slot 15 (public_charge, dialogue): the presiding Dohkar\'s charge must be grounded in what the assembly directly perceived of the misalignment and its unexplained arrest (Lirael\'s visible reaction, the felt wrongness, Seren\'s own words) — never in scorch marks or residue treated as physical evidence.');
  L.push('');
  L.push('OUTPUT SCHEMA (HARD — return ONLY this JSON object, nothing else): { "repairs": [ { "n": <slot number>, "text": "<complete corrected text>" }, ... ] } — exactly 3 entries, "n" values exactly: ' + TARGET_SLOT_NS.join(', ') + '. No other top-level field. No other field inside a repair entry.');
  const system = 'You are performing a bounded content correction on 3 specific beats of an already-mostly-accepted scene, replacing wrong magical-attack visual grammar with the corrected Fatelands ordinary-wish-misalignment shape (recognition, pull, unexplained arrest — never an attack). You return ONLY the corrected beat text for the named slots as structured JSON — nothing else, no commentary, no full-scene rewrite.';
  return { system, user: L.join('\n') };
}

const { system, user } = buildWishTwistCorrectionPrompt();
const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
const MAX_TOKENS = 2000;
const chain = [
  { tier: 'primary', name: 'Grok-4.3', roleTag: 'firstSacrificeWishTwistContentCorrection', endpoint: '/api/proxy', role: 'STRUCTURE_GENERATOR', preferredModel: 'grok-4-1-fast-reasoning', billedModel: 'grok-4.3', messages, max_tokens: MAX_TOKENS, temperature: 0.85, timeoutMs: 60000 },
  { tier: 'fallback', name: 'Ministral-8B', roleTag: 'firstSacrificeWishTwistContentCorrection', endpoint: '/api/mistral-proxy', billedModel: 'ministral-8b-2512', messages, max_tokens: MAX_TOKENS, temperature: 0.7, timeoutMs: 45000 },
  { tier: 'terminal', name: 'GPT-4o', roleTag: 'firstSacrificeWishTwistContentCorrection', role: 'PRIMARY_AUTHOR', model: 'gpt-4o', responseFormat: 'json_object', messages, max_tokens: MAX_TOKENS, temperature: 0.85, timeoutMs: 45000 },
];

function makeReqRes(body) {
  const res = {
    _status: 200, _headers: {}, _body: null,
    setHeader(k, v) { this._headers[k] = v; },
    status(code) { this._status = code; return this; },
    json(obj) { this._body = obj; return this; },
    end() { return this; },
  };
  const req = { method: 'POST', headers: { origin: 'http://localhost:3000' }, body };
  return { req, res };
}
function makeCtx() { return { records: [], winningTier: null, winningContent: null, winningUsage: null, winningModel: null }; }

async function attemptGrok(tier, ctx) {
  const { default: grokHandler } = await import('./api/proxy.js');
  const body = { messages: tier.messages, role: tier.role, preferredModel: tier.preferredModel, temperature: tier.temperature, max_tokens: tier.max_tokens };
  const { req, res } = makeReqRes(body);
  const t0 = Date.now();
  let threw = null;
  try { await grokHandler(req, res); } catch (e) { threw = String(e && e.stack || e); }
  const elapsed = Date.now() - t0;
  const httpStatus = res._status;
  const respBody = res._body;
  const content = respBody && respBody.choices && respBody.choices[0] && respBody.choices[0].message && respBody.choices[0].message.content;
  const hadContent = !!(content && String(content).trim());
  ctx.records.push({ tier: tier.tier, provider: tier.name, requestedModel: tier.preferredModel, endpoint: '/api/proxy (in-process)', requestBody: body, httpStatus, threw, elapsedMs: elapsed, responseBody: respBody, hadContent });
  console.log('[' + tier.name + '] status=' + httpStatus + ' hadContent=' + hadContent + ' elapsed=' + elapsed + 'ms' + (threw ? ' THREW: ' + threw : ''));
  if (!threw && httpStatus === 200 && hadContent) {
    ctx.winningTier = tier.tier; ctx.winningContent = content; ctx.winningUsage = respBody.usage || null;
    ctx.winningModel = (respBody._orchestration && respBody._orchestration.model) || tier.preferredModel;
    return true;
  }
  return false;
}
async function attemptMistral(tier, ctx) {
  const mistralHandler = require('./api/mistral-proxy.js');
  const body = { messages: tier.messages, model: tier.billedModel, temperature: tier.temperature, max_tokens: tier.max_tokens };
  const { req, res } = makeReqRes(body);
  const t0 = Date.now();
  let threw = null;
  try { await mistralHandler(req, res); } catch (e) { threw = String(e && e.stack || e); }
  const elapsed = Date.now() - t0;
  const httpStatus = res._status;
  const respBody = res._body;
  const content = respBody && respBody.choices && respBody.choices[0] && respBody.choices[0].message && respBody.choices[0].message.content;
  const hadContent = !!(content && String(content).trim());
  ctx.records.push({ tier: tier.tier, provider: tier.name, requestedModel: tier.billedModel, endpoint: '/api/mistral-proxy (in-process)', requestBody: body, httpStatus, threw, elapsedMs: elapsed, responseBody: respBody, hadContent });
  console.log('[' + tier.name + '] status=' + httpStatus + ' hadContent=' + hadContent + ' elapsed=' + elapsed + 'ms' + (threw ? ' THREW: ' + threw : ''));
  if (!threw && httpStatus === 200 && hadContent) {
    ctx.winningTier = tier.tier; ctx.winningContent = content; ctx.winningUsage = respBody.usage || null;
    ctx.winningModel = (respBody._orchestration && respBody._orchestration.model) || tier.billedModel;
    return true;
  }
  return false;
}
async function attemptOpenAI(tier, ctx) {
  const chatgptHandler = require('./api/chatgpt-proxy.js');
  const body = { messages: tier.messages, role: tier.role, model: tier.model, temperature: tier.temperature, max_tokens: tier.max_tokens, response_format: { type: 'json_object' } };
  const { req, res } = makeReqRes(body);
  const t0 = Date.now();
  let threw = null;
  try { await chatgptHandler(req, res); } catch (e) { threw = String(e && e.stack || e); }
  const elapsed = Date.now() - t0;
  const httpStatus = res._status;
  const respBody = res._body;
  const content = respBody && respBody.content;
  const hadContent = !!(content && String(content).trim());
  ctx.records.push({ tier: tier.tier, provider: tier.name, requestedModel: tier.model, endpoint: '/api/chatgpt-proxy (in-process)', requestBody: body, httpStatus, threw, elapsedMs: elapsed, responseBody: respBody, hadContent });
  console.log('[' + tier.name + '] status=' + httpStatus + ' hadContent=' + hadContent + ' elapsed=' + elapsed + 'ms' + (threw ? ' THREW: ' + threw : ''));
  if (!threw && httpStatus === 200 && hadContent) {
    ctx.winningTier = tier.tier; ctx.winningContent = content; ctx.winningUsage = respBody.usage || null;
    ctx.winningModel = (respBody._orchestration && respBody._orchestration.model) || tier.model;
    return true;
  }
  return false;
}

const ctx = makeCtx();
console.log('\n=== WISH-TWIST CONTENT CORRECTION — TIER 1: Grok primary (ONE attempt) ===');
let ok = await attemptGrok(chain[0], ctx);
if (!ok) { console.log('\n=== Grok failed — TIER 2: ministral-8b-2512 fallback ==='); ok = await attemptMistral(chain[1], ctx); }
if (!ok) { console.log('\n=== Ministral-8B failed — TIER 3: GPT-4o terminal ==='); ok = await attemptOpenAI(chain[2], ctx); }

fs.writeFileSync(path.join(OUT_DIR, '10_wish_twist_correction_request_response_records.json'), JSON.stringify(ctx.records, null, 2));

if (!ok) {
  console.log('\nALL TIERS EXHAUSTED. No correction applied. 08_corrected_candidate_from_pass1.json remains the current (still-violating) artifact. NO further call will be made.');
  process.exit(1);
}
console.log('\nWinning tier: ' + ctx.winningTier + ' | model: ' + ctx.winningModel);
console.log('usage: ' + JSON.stringify(ctx.winningUsage));
fs.writeFileSync(path.join(OUT_DIR, 'raw_wish_twist_correction_content.txt'), ctx.winningContent || '');

let repairResponse = null;
try { repairResponse = JSON.parse(ctx.winningContent); }
catch (e) {
  const first = ctx.winningContent.indexOf('{'), last = ctx.winningContent.lastIndexOf('}');
  if (first >= 0 && last > first) { try { repairResponse = JSON.parse(ctx.winningContent.slice(first, last + 1)); } catch (e2) { repairResponse = null; } }
}
if (!repairResponse) {
  console.log('\nResponse was not parseable JSON. No correction applied.');
  process.exit(1);
}

const deficiencyShapedTargets = TARGET_SLOT_NS.map(n => ({ n }));
const { merged, errors } = mergeRepairIntoDraft(draft, repairResponse, deficiencyShapedTargets);
if (!merged) {
  console.log('\nCorrection response REJECTED at merge (' + errors.length + ' error(s)): ' + errors.join('; ') + '. No correction applied.');
  fs.writeFileSync(path.join(OUT_DIR, '11_wish_twist_correction_merge_result.json'), JSON.stringify({ merged: false, errors }, null, 2));
  process.exit(1);
}

// ── Re-validate with the REAL validator ──
const validatorSrc = fs.readFileSync(path.join(__dirname, '_first_sacrifice_packet_validator.mjs'), 'utf8');
const fnMatch = validatorSrc.match(/function validateDraft[\s\S]*?\n}\n/);
const patternsMatch = validatorSrc.match(/const SEALED_PATTERNS[\s\S]*?(?=\nfunction validateDraft)/);
const sandbox = new Function('module', patternsMatch[0] + fnMatch[0] + '\nmodule.exports = validateDraft;');
const modObj = { exports: null };
sandbox(modObj);
const validateDraft = modObj.exports;
let validation;
try { validation = validateDraft(merged, PACKET); }
catch (e) { validation = { ok: false, violations: [{ rule: 'validator_threw', detail: String(e.message || e) }] }; }
fs.writeFileSync(path.join(OUT_DIR, '11_wish_twist_correction_merge_result.json'), JSON.stringify({ merged: true, errors: [], validation }, null, 2));

const PRICING = {
  'grok-4.3': { in: 0.00000125, out: 0.0000025 }, 'grok-4-1-fast-reasoning': { in: 0.00000125, out: 0.0000025 },
  'ministral-8b-2512': { in: 0.00000015, out: 0.00000015 },
  'gpt-4o': { in: 0.0000025, out: 0.00001 },
};
function realCostFor(usage, model) {
  if (!usage) return null;
  const promptTok = usage.prompt_tokens || usage.promptTokens || 0;
  const compTok = usage.completion_tokens || usage.completionTokens || 0;
  const p = PRICING[model] || PRICING[Object.keys(PRICING).find(k => model && model.indexOf(k) !== -1)];
  return p ? +(promptTok * p.in + compTok * p.out).toFixed(6) : null;
}
const realCost = realCostFor(ctx.winningUsage, ctx.winningModel);

const correctedArtifact = {
  packet_id: PACKET.packet_id, packet_version: PACKET.version,
  draft_version: 'draft-v7-full-package-wish-twist-corrected',
  derived_from: '08_corrected_candidate_from_pass1.json + focused wish-twist content correction (real, paid, authorized)',
  corrected_slots: TARGET_SLOT_NS,
  generated_at: new Date().toISOString(),
  generated_by: { tier: ctx.winningTier, model: ctx.winningModel, usage: ctx.winningUsage, real_cost_usd: realCost },
  validation,
  draft: merged,
};
fs.writeFileSync(path.join(OUT_DIR, '09_wish_twist_content_correction.json'), JSON.stringify(correctedArtifact, null, 2));

console.log('\n' + '='.repeat(70));
console.log('Real cost: $' + realCost);
console.log('FINAL validation: ' + (validation.ok ? 'ELIGIBLE (validation.ok === true)' : 'NOT ELIGIBLE — ' + validation.violations.map(v => v.rule + ': ' + v.detail).join(' | ')));
const stillWrongGrammar = validation.violations.filter(v => v.rule === 'wish_twist_wrong_visual_grammar');
console.log('wish_twist_wrong_visual_grammar violations remaining: ' + stillWrongGrammar.length);
console.log('\nCorrected slot texts:');
TARGET_SLOT_NS.forEach(n => console.log('  Slot ' + n + ': ' + merged.scene1Candidate.beats[n - 1].text));
console.log('\nWritten to: ' + path.join(OUT_DIR, '09_wish_twist_content_correction.json'));
console.log('NOT written to starter-scenes.js or shipped anywhere — awaits explicit human review/approval.');
