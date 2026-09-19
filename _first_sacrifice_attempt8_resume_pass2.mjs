#!/usr/bin/env node
// FIRST SACRIFICE — RESUME Attempt 8's bounded repair, PASS 2 ONLY (Roman, 2026-09-20).
//
// Pass 1 (real, $0.005058, already run and preserved) correctly fixed the 4 genuinely-short slots
// but could not see or fix the 8 narration beats that ended up OVER the 90-word ceiling — a real
// gap in the engine (it only ever checked the floor). That gap is now closed
// (_first_sacrifice_bounded_repair_engine.mjs: measureBeatDeficiencies detects both directions,
// buildRepairPrompt frames each correctly) and proven dry (100/100,
// _first_sacrifice_bounded_repair_engine_control.mjs section 10, using Attempt 8's own real
// pass-1-merged draft as the fixture).
//
// This script resumes Attempt 8 from its REAL, already-saved pass-1-merged draft
// (07_final_draft_after_pass1.json) at repairPassesRun=1, and runs ONLY the second and FINAL
// bounded repair pass (planNextRepairPass enforces MAX_REPAIR_PASSES=2 — this is the last one,
// under any circumstance). No new primary call. No Attempt 9. No third repair pass. Preserves the
// result as the Attempt 8 artifact. Does NOT write to starter-scenes.js or ship anywhere.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const OUT_DIR = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package');
if (!fs.existsSync(path.join(OUT_DIR, '07_final_draft_after_pass1.json'))) {
  throw new Error('Pass 1 artifact not found — this script only resumes FROM a real, already-completed pass 1, it never starts pass 1 itself.');
}

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
console.log('Env loaded. Keys present: XAI=' + !!process.env.XAI_API_KEY + ' MISTRAL=' + !!process.env.MISTRAL_API_KEY + ' OPENAI=' + !!process.env.OPENAI_API_KEY + ' SUPABASE=' + !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY));

const {
  buildRepairFallbackChain, mergeRepairIntoDraft, planNextRepairPass, MAX_REPAIR_PASSES,
} = await import('./_first_sacrifice_bounded_repair_engine.mjs');
const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));

const starterSrc = fs.readFileSync(path.join(__dirname, 'public/starter-scenes.js'), 'utf8');
const beatsBlockMatch = starterSrc.match(/beats: \[([\s\S]*?)\],\s*\n\s*endsAt:/);
const oasHandoffBlockMatch = starterSrc.match(/oasHandoff: \{([\s\S]*?)\n      \},\s*\n\s*emitted:/);
const beats = new Function('return [' + beatsBlockMatch[1] + ']')();
const oasHandoff = new Function('return {' + oasHandoffBlockMatch[1] + '\n}')();

// ── RESUME POINT: load the REAL, already-saved pass-1-merged draft. Primary + pass 1 are NOT
// re-run — this is the SAME real data the prior two real calls produced. ──
const primaryArtifact = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '02_draft.json'), 'utf8'));
const winningTier = primaryArtifact.generated_by.tier, winningModel = primaryArtifact.generated_by.model, winningUsage = primaryArtifact.generated_by.usage;
const records = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '01_request_response_records.json'), 'utf8'));
const pass1Artifact = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '07_final_draft_after_pass1.json'), 'utf8'));
let draft = pass1Artifact.draft;
const pass1Records = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '05_repair_pass1_request_response_records.json'), 'utf8'));
const pass1Winning = pass1Records.find(r => r.hadContent);
const pass1HistoricalRecord = { pass: 1, outcome: pass1Artifact.repair_outcome, callMade: true, usage: pass1Winning && pass1Winning.responseBody && pass1Winning.responseBody.usage, model: (pass1Winning && pass1Winning.responseBody && pass1Winning.responseBody._orchestration && pass1Winning.responseBody._orchestration.model) || (pass1Winning && pass1Winning.requestedModel), tier: pass1Winning && pass1Winning.tier };
console.log('RESUMING Attempt 8 from its REAL, already-saved pass-1-merged draft (repairPassesRun=1). Pass 1 outcome (historical): ' + pass1HistoricalRecord.outcome);

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
  const record = { tier: tier.tier, provider: tier.name, requestedModel: tier.preferredModel, endpoint: '/api/proxy (in-process)', requestBody: body, httpStatus, threw, elapsedMs: elapsed, responseBody: respBody, hadContent };
  ctx.records.push(record);
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
  const record = { tier: tier.tier, provider: tier.name, requestedModel: tier.billedModel, endpoint: '/api/mistral-proxy (in-process)', requestBody: body, httpStatus, threw, elapsedMs: elapsed, responseBody: respBody, hadContent };
  ctx.records.push(record);
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
  const record = { tier: tier.tier, provider: tier.name, requestedModel: tier.model, endpoint: '/api/chatgpt-proxy (in-process)', requestBody: body, httpStatus, threw, elapsedMs: elapsed, responseBody: respBody, hadContent };
  ctx.records.push(record);
  console.log('[' + tier.name + '] status=' + httpStatus + ' hadContent=' + hadContent + ' elapsed=' + elapsed + 'ms' + (threw ? ' THREW: ' + threw : ''));
  if (!threw && httpStatus === 200 && hadContent) {
    ctx.winningTier = tier.tier; ctx.winningContent = content; ctx.winningUsage = respBody.usage || null;
    ctx.winningModel = (respBody._orchestration && respBody._orchestration.model) || tier.model;
    return true;
  }
  return false;
}

async function runChain(theChain, ctx, label) {
  console.log('\n=== ' + label + ' TIER 1: Grok primary (ONE attempt) ===');
  let ok = await attemptGrok(theChain[0], ctx);
  if (!ok) {
    console.log('\n=== ' + label + ': Grok failed — TIER 2: ministral-8b-2512 fallback (ONE attempt) ===');
    ok = await attemptMistral(theChain[1], ctx);
  }
  if (!ok) {
    console.log('\n=== ' + label + ': Ministral-8B failed — TIER 3: GPT-4o terminal (ONE attempt) ===');
    ok = await attemptOpenAI(theChain[2], ctx);
  }
  return ok;
}

const validatorSrc = fs.readFileSync(path.join(__dirname, '_first_sacrifice_packet_validator.mjs'), 'utf8');
const fnMatch = validatorSrc.match(/function validateDraft[\s\S]*?\n}\n/);
const patternsMatch = validatorSrc.match(/const SEALED_PATTERNS[\s\S]*?(?=\nfunction validateDraft)/);
const sandbox = new Function('module', patternsMatch[0] + fnMatch[0] + '\nmodule.exports = validateDraft;');
const modObj = { exports: null };
sandbox(modObj);
const validateDraft = modObj.exports;
let validation;
try { validation = validateDraft(draft, PACKET); }
catch (e) { validation = { ok: false, violations: [{ rule: 'validator_threw', detail: String(e.message || e) }] }; }
console.log('\nRe-validation of the real pass-1-merged draft (extended validator, both-direction engine): ' + (validation.ok ? 'ELIGIBLE' : 'NOT ELIGIBLE — ' + validation.violations.map(v => v.rule).join(', ')));

// ── PASS 2 (and, per MAX_REPAIR_PASSES, the FINAL possible pass) — starts the loop at
// repairPassesRun=1 so planNextRepairPass authorizes AT MOST one more real call. ──
let repairOutcome = pass1HistoricalRecord.outcome;
let repairPassesRun = 1;
const repairPassRecords = [pass1HistoricalRecord];
for (;;) {
  const plan = planNextRepairPass(draft, validation, PACKET, repairPassesRun);
  if (!plan.authorized) {
    console.log('\nNo further bounded repair pass authorized (passesRun=' + repairPassesRun + '): ' + plan.reason);
    break;
  }
  const passN = repairPassesRun + 1;
  console.log('\n=== BOUNDED REPAIR PASS ' + passN + '/' + MAX_REPAIR_PASSES + ' (FINAL) ELIGIBLE — ' + plan.deficiencyReport.deficiencies.length + ' deficient slot(s): ' + plan.deficiencyReport.deficiencies.map(d => d.n + '(' + d.direction + ')').join(', ') + ' ===');
  const repairChain = buildRepairFallbackChain(PACKET, draft, plan.deficiencyReport.deficiencies);
  const repairCtx = makeCtx();
  const repairOk = await runChain(repairChain, repairCtx, 'REPAIR PASS ' + passN);
  const passRecord = { pass: passN, outcome: null, callMade: true, usage: repairCtx.winningUsage, model: repairCtx.winningModel, tier: repairCtx.winningTier };
  fs.writeFileSync(path.join(OUT_DIR, '05_repair_pass' + passN + '_request_response_records.json'), JSON.stringify(repairCtx.records, null, 2));
  if (!repairOk) {
    passRecord.outcome = 'repair_call_failed';
    console.log('\nBounded repair pass ' + passN + ' call FAILED on all 3 tiers. Keeping the last good draft/validation as final.');
    repairPassRecords.push(passRecord); repairPassesRun++; repairOutcome = passRecord.outcome;
    break;
  }
  fs.writeFileSync(path.join(OUT_DIR, 'raw_repair_pass' + passN + '_content.txt'), repairCtx.winningContent || '');
  let repairResponse = null;
  try { repairResponse = JSON.parse(repairCtx.winningContent); }
  catch (e) {
    const first = repairCtx.winningContent.indexOf('{'), last = repairCtx.winningContent.lastIndexOf('}');
    if (first >= 0 && last > first) { try { repairResponse = JSON.parse(repairCtx.winningContent.slice(first, last + 1)); } catch (e2) { repairResponse = null; } }
  }
  if (!repairResponse) {
    passRecord.outcome = 'repair_response_unparseable';
    console.log('\nBounded repair pass ' + passN + ' response was not parseable JSON. Keeping the last good draft/validation as final.');
    repairPassRecords.push(passRecord); repairPassesRun++; repairOutcome = passRecord.outcome;
    break;
  }
  const { merged, errors } = mergeRepairIntoDraft(draft, repairResponse, plan.deficiencyReport.deficiencies);
  if (!merged) {
    passRecord.outcome = 'merge_rejected';
    console.log('\nBounded repair pass ' + passN + ' response REJECTED at merge (' + errors.length + ' error(s)): ' + errors.join('; ') + '. Keeping the last good draft/validation as final.');
    fs.writeFileSync(path.join(OUT_DIR, '06_repair_pass' + passN + '_merge_result.json'), JSON.stringify({ merged: false, errors }, null, 2));
    repairPassRecords.push(passRecord); repairPassesRun++; repairOutcome = passRecord.outcome;
    break;
  }
  let mergedValidation;
  try { mergedValidation = validateDraft(merged, PACKET); }
  catch (e) { mergedValidation = { ok: false, violations: [{ rule: 'validator_threw', detail: String(e.message || e) }] }; }
  fs.writeFileSync(path.join(OUT_DIR, '06_repair_pass' + passN + '_merge_result.json'), JSON.stringify({ merged: true, errors: [], mergedValidation }, null, 2));
  const stillDensityFailing = mergedValidation.violations.some(v => v.rule === 'scene1_too_thin' || v.rule === 'scene1_insufficient_narration_density');
  passRecord.outcome = mergedValidation.ok ? 'merged_passing' : (stillDensityFailing ? 'merged_still_density_failing' : 'merged_failing_other_violation');
  console.log('\nBounded repair pass ' + passN + ' merged. Re-validated merged candidate: ' + (mergedValidation.ok ? 'ELIGIBLE FOR REVIEW' : 'still NOT eligible — ' + mergedValidation.violations.map(v => v.rule).join(', ')));
  draft = merged;
  validation = mergedValidation;
  repairOutcome = passRecord.outcome;
  fs.writeFileSync(path.join(OUT_DIR, '07_final_draft_after_pass' + passN + '.json'), JSON.stringify({ packet_id: PACKET.packet_id, packet_version: PACKET.version, draft_version: 'draft-v7-full-package-repaired-pass' + passN, repair_outcome: passRecord.outcome, generated_at: new Date().toISOString(), draft }, null, 2));
  repairPassRecords.push(passRecord);
  repairPassesRun++;
  break; // MAX_REPAIR_PASSES=2 — this loop can never run more than once starting from passesRun=1 anyway, but break explicitly for clarity: pass 2 is final.
}
fs.writeFileSync(path.join(OUT_DIR, '03_validation_result.json'), JSON.stringify({ finalValidation: validation, repairOutcome, repairPassesRun, repairPassRecords: repairPassRecords.map(r => ({ pass: r.pass, outcome: r.outcome })), resumed_from: 'real Attempt 8 pass-1-merged draft (07_final_draft_after_pass1.json), over-ceiling-capable engine, pass 2 (final)' }, null, 2));

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
const primaryRealCostUSD = realCostFor(winningUsage, winningModel);
const repairPassCosts = repairPassRecords.map(r => ({ pass: r.pass, cost: realCostFor(r.usage, r.model) }));
const repairRealCostUSD = repairPassCosts.length > 0 ? +repairPassCosts.reduce((sum, r) => sum + (r.cost || 0), 0).toFixed(6) : null;
const realCostUSD = primaryRealCostUSD == null ? null : +(primaryRealCostUSD + (repairRealCostUSD || 0)).toFixed(6);
console.log('\nThis session\'s OWN spend (pass 2 call only — primary and pass 1 were NOT re-run): $' + (realCostFor(repairPassRecords[repairPassRecords.length - 1].usage, repairPassRecords[repairPassRecords.length - 1].model) ?? 0));
console.log('TOTAL real cost across the whole Attempt 8 operation (primary + pass 1 + pass 2): $' + realCostUSD);

function renderPreview() {
  const L = [];
  L.push('# First Sacrifice — Full-Package Draft (v3) Review Preview (REAL, authorized draft)');
  L.push('');
  L.push('**Packet**: ' + PACKET.packet_id + ' v' + PACKET.version);
  L.push('**Primary generated by**: ' + winningModel + ' (' + winningTier + ' tier) | usage: ' + JSON.stringify(winningUsage) + ' | real cost: ' + (primaryRealCostUSD != null ? '$' + primaryRealCostUSD : 'unknown — usage block missing'));
  L.push('**Bounded repair passes run**: ' + repairPassesRun + '/' + MAX_REPAIR_PASSES + ' | final outcome: ' + repairOutcome);
  repairPassRecords.forEach(r => L.push('  - Pass ' + r.pass + ': ' + r.outcome + ' | ' + r.model + ' (' + r.tier + ' tier) | usage: ' + JSON.stringify(r.usage) + ' | real cost: $' + (realCostFor(r.usage, r.model) ?? 'unknown')));
  L.push('**Total real cost this operation (primary + pass 1 + pass 2)**: ' + (realCostUSD != null ? '$' + realCostUSD : 'unknown — usage block missing'));
  L.push('');
  L.push('## Validator result (FINAL — reflects BOTH bounded repair passes): ' + (validation.ok ? '✅ ELIGIBLE FOR REVIEW (structural/canon checks passed — this is NOT a prose-quality judgment)' : '❌ NOT ELIGIBLE — structural/canon violations found'));
  if (!validation.ok) validation.violations.forEach(v => L.push('- **' + v.rule + '**: ' + v.detail));
  if (validation.diagnostics && validation.diagnostics.length) { L.push('  (non-blocking diagnostics — human-review-only, never affect ELIGIBLE/NOT ELIGIBLE or repair eligibility):'); validation.diagnostics.forEach(d => L.push('  - **' + d.rule + '**: ' + d.detail)); }
  L.push('');
  L.push('═'.repeat(70));
  L.push('# OPTION A — CURRENT (baked, real, public/starter-scenes.js, read-only, ' + beats.length + ' beats)');
  L.push('═'.repeat(70));
  L.push('');
  beats.forEach(b => { if (b.speaker) L.push('**' + b.speaker + '**'); L.push(b.text); L.push(''); });
  L.push('═'.repeat(70));
  const scene1Beats = (draft.scene1Candidate && Array.isArray(draft.scene1Candidate.beats)) ? draft.scene1Candidate.beats : [];
  L.push('# OPTION B — CANDIDATE (this generation, ' + scene1Beats.length + ' beats)');
  L.push('═'.repeat(70));
  L.push('');
  if (!scene1Beats.length) L.push('⚠ NONE — see validator violations above.');
  scene1Beats.forEach(b => {
    if (!b) return;
    if (b.speaker) L.push('**' + b.speaker + '** _(' + b.kind + ', image=' + b.image + ')_');
    else L.push('_(' + b.kind + ', image=' + b.image + ')_');
    L.push(b.text); L.push('');
  });
  L.push('═'.repeat(70));
  L.push('# SHARED DOWNSTREAM — identical regardless of which Scene 1 is selected');
  L.push('═'.repeat(70));
  L.push('');
  L.push('## OAS HANDOFF');
  L.push('> ' + oasHandoff.cue);
  L.push('');
  L.push('### oasOpening (NEW — this generation; Julian\'s ONE opening line, ≤14 words)');
  const oo = draft.oasOpening && typeof draft.oasOpening === 'object' ? draft.oasOpening : null;
  if (!oo) L.push('⚠ NONE — see validator violations above.');
  else L.push('**' + oo.speaker + ':** ' + oo.text);
  L.push('');
  L.push('### [LIVE — player-driven OAS, NOT produced by this call, NOT rendered here]');
  L.push('The player answers Julian in real time (custom Say/Do, Fate-card prefill, or Petition/Tempt Fate); Julian\'s replies are generated live by the real app from actual player input. Neither this script nor the model authors any line in this range.');
  L.push('');
  L.push('### Interruption + tail (FIXED, baked, spliced in — not generated by this call)');
  L.push('_(image=' + oasHandoff.interruptionImage + ')_');
  L.push('_' + oasHandoff.interruption + '_');
  oasHandoff.interruptionExchange.forEach(l => L.push((l.speaker ? '**' + l.speaker + ':** ' : '_(narration)_ ') + l.text));
  L.push('');
  L.push('### postInterruptionBeat (NEW — this generation; crystallizes an unresolved choice WITHOUT deciding it)');
  const pib = draft.postInterruptionBeat && typeof draft.postInterruptionBeat === 'object' ? draft.postInterruptionBeat : null;
  if (!pib) L.push('⚠ NONE — see validator violations above.');
  else L.push((pib.speaker ? '**' + pib.speaker + ':** ' : '_(' + pib.kind + ', image=' + pib.image + ')_ ') + pib.text);
  L.push('');
  L.push('---');
  L.push('## FIVE FATE CARDS — [LIVE, not authored by this operation]');
  L.push('Dealt fresh by the real app mechanism (generateIntimateFatePreviewsBatch) after each OAS exchange, including right here — never a static authored set (Roman, 2026-09-17 correction). Nothing to render from this draft.');
  L.push('');
  L.push('---');
  L.push('## Operation record');
  L.push('- This is Attempt 8, RESUMED for its FINAL (2nd) bounded repair pass — no new primary call, no repeat of pass 1.');
  L.push('- Primary tiers attempted (original run): ' + records.map(r => r.provider + ' (status ' + r.httpStatus + (r.threw ? ', threw' : '') + ')').join(', '));
  L.push('- Primary winning tier: ' + winningTier + ' / ' + winningModel);
  L.push('- Bounded repair passes: ' + repairPassesRun + '/' + MAX_REPAIR_PASSES + ' run (BOTH used), final outcome ' + repairOutcome);
  L.push('- At most ONE primary call and at most ' + MAX_REPAIR_PASSES + ' bounded repair pass(es) total for this attempt — both now used; no further repair is authorized for Attempt 8 under any circumstance.');
  L.push('- No images were generated. No package/starter-scenes.js write occurred. No live-reader launch occurred. This artifact is NOT auto-shipped anywhere — it awaits explicit human review/approval.');
  return L.join('\n');
}
const preview = renderPreview();
fs.writeFileSync(path.join(OUT_DIR, '04_review_preview.md'), preview);

const report = [
  '# First Sacrifice full-package draft-authoring operation (v3, bounded-repair-capable) — REPORT',
  '',
  '**THIS IS ATTEMPT 8 — BOTH bounded repair passes now complete** (Roman, 2026-09-20) — pass 1 fixed genuinely-short slots; the over-ceiling engine extension then let pass 2 fix the 8 real overlong narration beats pass 1\'s own repair left behind.',
  '',
  '**Primary calls made (original run)**: ' + records.length + ' (' + records.map(r => r.provider).join(' -> ') + ')',
  '**Primary winning tier/model**: ' + winningTier + ' / ' + winningModel,
  '**Primary real cost**: ' + (primaryRealCostUSD != null ? '$' + primaryRealCostUSD : 'unknown'),
  '',
  '**Bounded repair outcome**: ' + repairOutcome,
  '**Bounded repair passes run**: ' + repairPassesRun + '/' + MAX_REPAIR_PASSES,
  ...repairPassRecords.map(r => '**Pass ' + r.pass + '**: ' + r.outcome + ' | ' + r.model + ' (' + r.tier + ' tier) | usage: ' + JSON.stringify(r.usage) + ' | real cost: $' + (realCostFor(r.usage, r.model) ?? 'unknown')),
  '**Bounded repair TOTAL real cost (pass 1 + pass 2)**: ' + (repairRealCostUSD != null ? '$' + repairRealCostUSD : 'unknown'),
  '',
  '**TOTAL real cost this operation (primary + pass 1 + pass 2)**: ' + (realCostUSD != null ? '$' + realCostUSD : 'unknown'),
  '**FINAL Validator result**: ' + (validation.ok ? 'ELIGIBLE FOR REVIEW' : 'NOT ELIGIBLE — see 03_validation_result.json') + ' (structural/canon check only — NOT a prose-quality judgment)',
  (validation.diagnostics && validation.diagnostics.length) ? '**Non-blocking diagnostics**: ' + validation.diagnostics.map(d => d.rule + ' — ' + d.detail).join(' | ') : null,
  '**Both bounded repair passes are now used — no further repair is authorized for Attempt 8 under any circumstance.**',
  '**NOT auto-shipped to starter-scenes.js or anywhere else — this artifact awaits explicit human review/approval.**',
  '',
  'Files: 01_request_response_records.json / 02_draft.json (primary, unchanged), 05_repair_pass1_*/06_repair_pass1_*/07_final_draft_after_pass1.json (pass 1, unchanged), 05_repair_pass2_*/06_repair_pass2_*/07_final_draft_after_pass2.json (pass 2, NEW — the FINAL artifact), 03_validation_result.json + 04_review_preview.md + REPORT.md (UPDATED to reflect the final, twice-repaired state).',
].filter(line => line !== null).join('\n');
fs.writeFileSync(path.join(OUT_DIR, 'REPORT.md'), report);

console.log('\n' + '='.repeat(70));
console.log(report);
