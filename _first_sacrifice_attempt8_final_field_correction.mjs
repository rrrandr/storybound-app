#!/usr/bin/env node
// FIRST SACRIFICE — Attempt 8, SURGICAL THREE-FIELD FINAL CORRECTION (Roman, 2026-09-20, authorized: "go-ahead").
//
// The candidate (09_wish_twist_content_correction.json) is REAL, UNSHIPPED, and FAILING under the
// strengthened validator (see the wish-twist continuity-scope + blocking-causal-specificity commit,
// 9c0acfcf) for exactly 3 remaining real reasons — not "validator-pass with notes":
//   - beat[12] (slot 13, wish_visibly_twists): wish_twist_causal_specificity + real referent-
//     misattribution risk. "A cold directionality opened beneath my ribs, as though the loss Seren
//     had named was already searching for a new anchor..." never names the WISH's own object ("the
//     one she lost") or states wrong/dangerous-fulfillment language, and reads as Seren's OWN
//     sacrificed loss relocating rather than the wish's actual object being at risk.
//   - beat[19] (slot 20, last beat): wish_twist_wrong_visual_grammar — "...the scorch line still
//     visible in the grass."
//   - postInterruptionBeat: wish_twist_wrong_visual_grammar — "...the line of scorched grass..."
//
// Beats 14 (twist_unnaturally_arrested) and 15 (public_charge) already read cleanly (confirmed in
// the prior read-through) and are NOT touched. Every other beat, oasOpening, and the rest of the
// scene stays immutable.
//
// mergeRepairIntoDraft (the shared bounded-repair-engine merge) explicitly REJECTS any touch to
// postInterruptionBeat by design (one of its own RED tests) — it is scoped to scene1Candidate beats
// only. This script therefore uses its OWN self-contained, purpose-built bounded-merge function,
// permitting EXACTLY beat13/beat20/postInterruptionBeat and nothing else, failing closed on any
// deviation — same discipline as mergeRepairIntoDraft, new contract for these 3 named fields.
//
// Real, paid call. Explicitly authorized by Roman ("go-ahead"). Preserves
// 09_wish_twist_content_correction.json (and every earlier artifact) untouched; writes NEW,
// distinctly-numbered artifacts only. Does NOT write to starter-scenes.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const OUT_DIR = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package');
const SOURCE_PATH = path.join(OUT_DIR, '09_wish_twist_content_correction.json');
if (!fs.existsSync(SOURCE_PATH)) throw new Error('09_wish_twist_content_correction.json not found — this script only corrects FROM that real, current (still-failing) candidate.');

const FINAL_ARTIFACT_PATH = path.join(OUT_DIR, '13_final_field_correction.json');
const RECORDS_PATH = path.join(OUT_DIR, '12_final_field_correction_request_response_records.json');
const RAW_PATH = path.join(OUT_DIR, 'raw_final_field_correction_content.txt');
[FINAL_ARTIFACT_PATH, RECORDS_PATH, RAW_PATH].forEach(p => {
  if (fs.existsSync(p)) throw new Error('Refusing to overwrite an existing artifact: ' + p + ' — every generated artifact is preserved untouched; pick a new output name instead.');
});

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

const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));
const LAW = JSON.parse(fs.readFileSync(path.join(__dirname, '_fatelands_ordinary_wish_misalignment_law.json'), 'utf8'));
const sourceArtifact = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
const draft = sourceArtifact.draft;
const bnt = PACKET.scene1_beat_number_template;
const wta = PACKET.wish_twist_and_arrest_requirement;
const pibReq = PACKET.oas_sequence_v3.post_interruption_beat_requirement;

const beat13 = draft.scene1Candidate.beats[12];
const beat20 = draft.scene1Candidate.beats[19];
const pib = draft.postInterruptionBeat;
const slot13 = bnt.slots[12];
const slot20 = bnt.slots[19];
const wc = t => t.trim().split(/\s+/).filter(Boolean).length;

// ── Build the focused, three-field content-correction prompt ──────────────────────────────────
function buildFinalFieldCorrectionPrompt() {
  const L = [];
  L.push('You are performing a BOUNDED CONTENT CORRECTION on EXACTLY 3 fields of an otherwise-final, otherwise-accepted Scene 1 candidate: beat 13, beat 20 (the scene\'s last beat), and postInterruptionBeat. Every other beat, oasOpening, and every other field is already final and must not be touched or echoed back.');
  L.push('');
  L.push('WHY EACH OF THESE 3 FIELDS IS BEING REPLACED (HARD — this is the entire task):');
  L.push('  1. Beat 13 is too ABSTRACT and MISATTRIBUTES the danger. It currently reads: "' + beat13.text + '" — this never legibly names that the WISH\'s own object (Lirael finding "the one Seren lost," still deliberately unnamed) is what is at risk of being fulfilled WRONGLY or HORRIBLY. Worse, "the loss Seren had named was already searching for a new anchor" reads as SEREN\'S OWN sacrificed memory/cost relocating — not the wish\'s actual object being at risk. That is a real, specific bug: never frame Seren\'s own sacrificed loss/memory/cost as the thing that is searching, anchoring, or relocating.');
  L.push('  2. Beat 20 currently ends on "...the scorch line still visible in the grass" — this is banned attack-grammar/damage-residue vocabulary carried forward from the incident.');
  L.push('  3. postInterruptionBeat currently contains "...the line of scorched grass..." — the same banned callback.');
  L.push('');
  L.push('THE CORRECTED FATELANDS LAW (HARD, mechanically checked — see _fatelands_ordinary_wish_misalignment_law.json):');
  L.push(LAW.statement);
  L.push('VALID shapes: ' + LAW.effect_classification.valid_for_ordinary_wish_misalignment.map(e => e.id + ' (' + e.description + ')').join(' | '));
  L.push('INVALID — never write these, anywhere, including in later callbacks: ' + LAW.effect_classification.invalid_for_ordinary_wish_misalignment.map(e => e.id + ' (' + e.description + ')').join(' | '));
  L.push('BANNED VOCABULARY (mechanically checked, in EVERY field, not only the 3 beats that directly depict the incident): ' + wta.banned_wrong_visual_grammar);
  L.push('');
  L.push('THE REQUIRED CAUSAL CHAIN for beat 13 specifically (HARD — must be legible, direct speech or first-person recognition both acceptable, no exact wording required):');
  L.push('  spoken wish object (Lirael finding the one Seren lost, already established by Seren\'s own dialogue earlier in the scene) -> Seren\'s self-serving desire (already established: she wants to be SEEN as good, not to actually help) -> the danger that Fate may fulfill that wish object WRONGLY or HORRIBLY -> a quiet, subjective pull (already present in the beat, keep this) -> an unexplained arrest (handled by beat 14, already accepted, do not resolve it here).');
  L.push('  Full requirement (HARD, all 6 bullets, unchanged from the approved packet):');
  wta.requirement.forEach((r, i) => L.push('    ' + (i + 1) + '. ' + r));
  L.push('  Hard boundary: ' + wta.hard_boundary);
  L.push('');
  L.push('postInterruptionBeat requirement (HARD, unchanged from the approved packet, now also banning the scorch/residue callback):');
  L.push('  ' + pibReq.hard_boundary);
  L.push('');
  L.push('SEALED — MUST NOT SURFACE OR IMPLY (unchanged from the approved packet):');
  PACKET.sealed_facts_forbidden_pre_surface.forEach(f => L.push('  - ' + f.rule));
  L.push('');
  L.push('FULL ACCEPTED SCENE — for continuity only (you are replacing ONLY the 3 [NEEDS CORRECTION] fields below; every other beat/field shown here is already final and must not be echoed back):');
  draft.scene1Candidate.beats.forEach((b, i) => {
    const n = i + 1;
    const flagged = n === 13 || n === 20;
    L.push('Beat ' + n + (flagged ? ' [NEEDS CORRECTION — REPLACE ENTIRELY]' : ' [ACCEPTED — do not return this one]') + ' (' + b.kind + ', image=' + b.image + '): ' + b.text);
  });
  L.push('oasOpening [ACCEPTED — do not return this one] (' + draft.oasOpening.speaker + '): ' + draft.oasOpening.text);
  L.push('postInterruptionBeat [NEEDS CORRECTION — REPLACE ENTIRELY] (' + pib.kind + ', image=' + pib.image + '): ' + pib.text);
  L.push('');
  L.push('FIELDS TO REPLACE — each is a COMPLETE rewrite, correcting content only, never a mechanical word-swap of the flagged text:');
  L.push('  - beat13 (id=' + (slot13.id || 'null') + ', image=' + slot13.image + ', kind=' + slot13.kind + '): current text is ' + wc(beat13.text) + ' words. This slot\'s function: ' + slot13.fn + '. Aim for roughly ' + wc(beat13.text) + ' words — stay reasonably close to the original length, do not pad.');
  L.push('  - beat20 (id=' + (slot20.id || 'null') + ', image=' + slot20.image + ', kind=' + slot20.kind + '): current text is ' + wc(beat20.text) + ' words. This slot\'s function: ' + slot20.fn + '. Keep the same content otherwise (The Answer\'s weight/balance in Lirael\'s hands, the open unresolved question of what happens next) — only remove/replace the scorch-line callback. Aim for roughly ' + wc(beat20.text) + ' words.');
  L.push('  - postInterruptionBeat: current text is ' + wc(pib.text) + ' words. Keep its function unchanged (the moment sits suspended between the Dohkar\'s ruling and Julian\'s claim, The Answer resting in Lirael\'s hands, nothing yet resolved) — only remove/replace the scorched-grass callback. Never resolve the player\'s eventual choice here. Aim for roughly ' + wc(pib.text) + ' words.');
  L.push('');
  L.push('OUTPUT SCHEMA (HARD — return ONLY this JSON object, nothing else, exactly these 3 keys, no others): { "beat13": "<complete corrected text>", "beat20": "<complete corrected text>", "postInterruptionBeat": "<complete corrected text>" }');
  const system = 'You are performing a bounded content correction on exactly 3 named fields of an already-mostly-accepted scene: replacing an abstract/misattributed causal beat and removing 2 banned damage-residue callbacks, while preserving everything else exactly as already accepted. You return ONLY the corrected text for the 3 named fields as structured JSON — nothing else, no commentary, no full-scene rewrite.';
  return { system, user: L.join('\n') };
}

const { system, user } = buildFinalFieldCorrectionPrompt();
const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
const MAX_TOKENS = 1500;
const chain = [
  { tier: 'primary', name: 'Grok-4.3', roleTag: 'firstSacrificeFinalFieldCorrection', endpoint: '/api/proxy', role: 'STRUCTURE_GENERATOR', preferredModel: 'grok-4-1-fast-reasoning', billedModel: 'grok-4.3', messages, max_tokens: MAX_TOKENS, temperature: 0.85, timeoutMs: 60000 },
  { tier: 'fallback', name: 'Ministral-8B', roleTag: 'firstSacrificeFinalFieldCorrection', endpoint: '/api/mistral-proxy', billedModel: 'ministral-8b-2512', messages, max_tokens: MAX_TOKENS, temperature: 0.7, timeoutMs: 45000 },
  { tier: 'terminal', name: 'GPT-4o', roleTag: 'firstSacrificeFinalFieldCorrection', role: 'PRIMARY_AUTHOR', model: 'gpt-4o', responseFormat: 'json_object', messages, max_tokens: MAX_TOKENS, temperature: 0.85, timeoutMs: 45000 },
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
console.log('\n=== FINAL FIELD CORRECTION (beat13, beat20, postInterruptionBeat) — TIER 1: Grok primary (ONE attempt) ===');
let ok = await attemptGrok(chain[0], ctx);
if (!ok) { console.log('\n=== Grok failed — TIER 2: ministral-8b-2512 fallback ==='); ok = await attemptMistral(chain[1], ctx); }
if (!ok) { console.log('\n=== Ministral-8B failed — TIER 3: GPT-4o terminal ==='); ok = await attemptOpenAI(chain[2], ctx); }

fs.writeFileSync(RECORDS_PATH, JSON.stringify(ctx.records, null, 2));

if (!ok) {
  console.log('\nALL TIERS EXHAUSTED. No correction applied. 09_wish_twist_content_correction.json remains the current (still-failing) artifact. NO further call will be made.');
  process.exit(1);
}
console.log('\nWinning tier: ' + ctx.winningTier + ' | model: ' + ctx.winningModel);
console.log('usage: ' + JSON.stringify(ctx.winningUsage));
fs.writeFileSync(RAW_PATH, ctx.winningContent || '');

let response = null;
try { response = JSON.parse(ctx.winningContent); }
catch (e) {
  const first = ctx.winningContent.indexOf('{'), last = ctx.winningContent.lastIndexOf('}');
  if (first >= 0 && last > first) { try { response = JSON.parse(ctx.winningContent.slice(first, last + 1)); } catch (e2) { response = null; } }
}
if (!response) {
  console.log('\nResponse was not parseable JSON. No correction applied.');
  process.exit(1);
}

// ── SELF-CONTAINED BOUNDED MERGE — EXACTLY {beat13, beat20, postInterruptionBeat}, fails closed ──
function mergeFinalFieldCorrection(primaryDraft, resp) {
  const errors = [];
  const REQUIRED_KEYS = ['beat13', 'beat20', 'postInterruptionBeat'];
  if (!resp || typeof resp !== 'object' || Array.isArray(resp)) return { merged: null, errors: ['response is not a JSON object'] };
  Object.keys(resp).forEach(k => { if (!REQUIRED_KEYS.includes(k)) errors.push('unapproved field in response: "' + k + '" — this correction may only return beat13/beat20/postInterruptionBeat'); });
  REQUIRED_KEYS.forEach(k => {
    if (typeof resp[k] !== 'string' || !resp[k].trim()) errors.push('response is missing usable text for "' + k + '"');
  });
  if (errors.length > 0) return { merged: null, errors };
  const merged = JSON.parse(JSON.stringify(primaryDraft));
  merged.scene1Candidate.beats[12].text = resp.beat13;
  merged.scene1Candidate.beats[19].text = resp.beat20;
  merged.postInterruptionBeat.text = resp.postInterruptionBeat;
  return { merged, errors: [] };
}

const { merged, errors } = mergeFinalFieldCorrection(draft, response);
if (!merged) {
  console.log('\nCorrection response REJECTED at merge (' + errors.length + ' error(s)): ' + errors.join('; ') + '. No correction applied.');
  fs.writeFileSync(FINAL_ARTIFACT_PATH, JSON.stringify({ merged: false, errors, raw_response: response }, null, 2));
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

const finalArtifact = {
  packet_id: PACKET.packet_id, packet_version: PACKET.version,
  draft_version: 'draft-v7-full-package-final-field-corrected',
  derived_from: '09_wish_twist_content_correction.json + surgical 3-field correction (beat13, beat20, postInterruptionBeat) — real, paid, explicitly authorized ("go-ahead")',
  corrected_fields: ['beat13', 'beat20', 'postInterruptionBeat'],
  generated_at: new Date().toISOString(),
  generated_by: { tier: ctx.winningTier, model: ctx.winningModel, usage: ctx.winningUsage, real_cost_usd: realCost },
  validation,
  draft: merged,
};
fs.writeFileSync(FINAL_ARTIFACT_PATH, JSON.stringify(finalArtifact, null, 2));

console.log('\n' + '='.repeat(70));
console.log('Real cost: $' + realCost);
console.log('FINAL validation: ' + (validation.ok ? 'ELIGIBLE (validation.ok === true)' : 'NOT ELIGIBLE — ' + validation.violations.map(v => v.rule + ': ' + v.detail).join(' | ')));
console.log('\nCorrected field texts:');
console.log('  beat13: ' + merged.scene1Candidate.beats[12].text);
console.log('  beat20: ' + merged.scene1Candidate.beats[19].text);
console.log('  postInterruptionBeat: ' + merged.postInterruptionBeat.text);
console.log('\nWritten to: ' + FINAL_ARTIFACT_PATH);
console.log('NOT written to starter-scenes.js or shipped anywhere — awaits explicit human review/approval.');
