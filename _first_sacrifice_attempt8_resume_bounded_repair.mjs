#!/usr/bin/env node
// FIRST SACRIFICE — RESUME Attempt 8's bounded repair path (Roman, 2026-09-20).
//
// Attempt 8's original authorization ("make it so") covered its primary draft AND its bounded
// repair path. The now-corrected exemplar_verbatim_copy rule wrongly blocked that authorized
// repair from ever running: Attempt 8's real primary draft (1,478/1,100 words) was rejected only
// because of a match against a WITHHELD historical exemplar that was never actually a copy-source
// violation (see _first_sacrifice_packet_validator.mjs's diagnostics_policy and
// _first_sacrifice_attempt8_corrected_validator_diagnostic.mjs). Its one REAL blocking issue was
// always narration density (7/16 qualifying, need 12) — which IS repair-eligible.
//
// This script does NOT make a new primary call and does NOT constitute Attempt 9 — it resumes the
// SAME Attempt 8 operation exactly where the (now-corrected) validator would have let it continue:
// loads the REAL, already-saved Attempt 8 primary draft (02_draft.json) and the REAL, already-saved
// primary request/response records (01_request_response_records.json) UNCHANGED, re-validates with
// the corrected validator, and — if still repair-eligible — runs the SAME adaptive, bounded
// two-pass repair loop the run script would have run (repair pass 1, and pass 2 ONLY if pass 1's
// merged result is still purely density-deficient), using the IDENTICAL real handler-calling logic
// as _first_sacrifice_draft_authoring_run.mjs. Writes its result back into the SAME
// _first_sacrifice_draft_v7_attempt8_full_package/ directory (updating 03_validation_result.json,
// 04_review_preview.md, REPORT.md to reflect the final state; adding 05/06/07 pass artifacts).
//
// HARD SCOPE: no new primary draft, no third repair pass (MAX_REPAIR_PASSES=2 enforced by
// planNextRepairPass), no starter-scenes.js write, no live-reader launch, no auto-ship of the
// result anywhere — this only produces and preserves the Attempt 8 artifact for human review.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const OUT_DIR = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package');
if (!fs.existsSync(OUT_DIR)) throw new Error('Attempt 8 output directory does not exist — this script only RESUMES an already-run attempt, it never starts a new one.');

// ── Load .env.local into process.env (values never logged) ──────────────────────────────────
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

// ── READ-ONLY: the real baked Scene 1 + oasHandoff, for the full-preview rendering ──
const starterSrc = fs.readFileSync(path.join(__dirname, 'public/starter-scenes.js'), 'utf8');
const beatsBlockMatch = starterSrc.match(/beats: \[([\s\S]*?)\],\s*\n\s*endsAt:/);
const oasHandoffBlockMatch = starterSrc.match(/oasHandoff: \{([\s\S]*?)\n      \},\s*\n\s*emitted:/);
const beats = new Function('return [' + beatsBlockMatch[1] + ']')();
const oasHandoff = new Function('return {' + oasHandoffBlockMatch[1] + '\n}')();

// ── RESUME POINT: load the REAL, already-saved Attempt 8 primary artifacts UNCHANGED. No new
// primary call is made — records/draft below are the SAME real data the original run produced. ──
const records = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '01_request_response_records.json'), 'utf8'));
const primaryArtifact = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '02_draft.json'), 'utf8'));
let draft = primaryArtifact.draft;
const winningTier = primaryArtifact.generated_by.tier, winningModel = primaryArtifact.generated_by.model, winningUsage = primaryArtifact.generated_by.usage;
console.log('RESUMING Attempt 8 from its real, already-saved primary draft (no new primary call). Winning tier: ' + winningTier + ' | model: ' + winningModel);
console.log('usage: ' + JSON.stringify(winningUsage));

// ── Mock req/res factory + tiered dispatcher — IDENTICAL real logic to
// _first_sacrifice_draft_authoring_run.mjs, copied verbatim so the repair pass(es) below use
// exactly the same real handler-calling path. ──
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

// ── Re-validate the REAL primary draft with the CORRECTED validator ─────────────────────────
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
console.log('\nCorrected re-validation of the real primary draft: ' + (validation.ok ? 'ELIGIBLE' : 'NOT ELIGIBLE — ' + validation.violations.map(v => v.rule).join(', ')));

// ── ADAPTIVE, BOUNDED TWO-PASS REPAIR — identical logic/scope to the run script's own loop ──
let repairOutcome = 'not_needed';
let repairPassesRun = 0;
const repairPassRecords = [];
for (;;) {
  const plan = planNextRepairPass(draft, validation, PACKET, repairPassesRun);
  if (!plan.authorized) {
    if (repairPassesRun === 0 && !validation.ok) repairOutcome = 'not_eligible_or_not_repairable: ' + plan.reason;
    if (repairPassesRun === 0 && validation.ok) repairOutcome = 'not_needed';
    if (repairPassesRun > 0) repairOutcome = repairPassRecords[repairPassRecords.length - 1].outcome;
    console.log('\nNo further bounded repair pass authorized (passesRun=' + repairPassesRun + '): ' + plan.reason);
    break;
  }
  const passN = repairPassesRun + 1;
  console.log('\n=== BOUNDED REPAIR PASS ' + passN + '/' + MAX_REPAIR_PASSES + ' ELIGIBLE — ' + plan.deficiencyReport.deficiencies.length + ' deficient slot(s): ' + plan.deficiencyReport.deficiencies.map(d => d.n).join(', ') + ' ===');
  const repairChain = buildRepairFallbackChain(PACKET, draft, plan.deficiencyReport.deficiencies);
  const repairCtx = makeCtx();
  const repairOk = await runChain(repairChain, repairCtx, 'REPAIR PASS ' + passN);
  const passRecord = { pass: passN, outcome: null, callMade: true, usage: repairCtx.winningUsage, model: repairCtx.winningModel, tier: repairCtx.winningTier };
  fs.writeFileSync(path.join(OUT_DIR, '05_repair_pass' + passN + '_request_response_records.json'), JSON.stringify(repairCtx.records, null, 2));
  if (!repairOk) {
    passRecord.outcome = 'repair_call_failed';
    console.log('\nBounded repair pass ' + passN + ' call FAILED on all 3 tiers. Keeping the last good draft/validation as final.');
    repairPassRecords.push(passRecord); repairPassesRun++;
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
    repairPassRecords.push(passRecord); repairPassesRun++;
    break;
  }
  const { merged, errors } = mergeRepairIntoDraft(draft, repairResponse, plan.deficiencyReport.deficiencies);
  if (!merged) {
    passRecord.outcome = 'merge_rejected';
    console.log('\nBounded repair pass ' + passN + ' response REJECTED at merge (' + errors.length + ' error(s)): ' + errors.join('; ') + '. Keeping the last good draft/validation as final.');
    fs.writeFileSync(path.join(OUT_DIR, '06_repair_pass' + passN + '_merge_result.json'), JSON.stringify({ merged: false, errors }, null, 2));
    repairPassRecords.push(passRecord); repairPassesRun++;
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
  fs.writeFileSync(path.join(OUT_DIR, '07_final_draft_after_pass' + passN + '.json'), JSON.stringify({ packet_id: PACKET.packet_id, packet_version: PACKET.version, draft_version: 'draft-v7-full-package-repaired-pass' + passN, repair_outcome: passRecord.outcome, generated_at: new Date().toISOString(), draft }, null, 2));
  repairPassRecords.push(passRecord);
  repairPassesRun++;
  if (mergedValidation.ok) { repairOutcome = 'merged_passing'; break; }
}
const repairCallMade = repairPassRecords.length > 0;
fs.writeFileSync(path.join(OUT_DIR, '03_validation_result.json'), JSON.stringify({ finalValidation: validation, repairOutcome, repairPassesRun, repairPassRecords: repairPassRecords.map(r => ({ pass: r.pass, outcome: r.outcome })), resumed_from: 'real Attempt 8 primary draft (02_draft.json), corrected validator policy' }, null, 2));

// ── Real cost from actual usage + the real/externally-sourced pricing this session established ──
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
console.log('\nThis resume session\'s OWN spend (repair pass calls only — primary was NOT re-run): $' + (repairRealCostUSD != null ? repairRealCostUSD : 0));

// ── FULL READING-EXPERIENCE preview — identical rendering to the run script ──────────────────
function renderPreview() {
  const L = [];
  L.push('# First Sacrifice — Full-Package Draft (v3) Review Preview (REAL, authorized draft)');
  L.push('');
  L.push('**Packet**: ' + PACKET.packet_id + ' v' + PACKET.version);
  L.push('**Primary generated by**: ' + winningModel + ' (' + winningTier + ' tier) | usage: ' + JSON.stringify(winningUsage) + ' | real cost: ' + (primaryRealCostUSD != null ? '$' + primaryRealCostUSD : 'unknown — usage block missing'));
  L.push('**Bounded repair passes run**: ' + repairPassesRun + '/' + MAX_REPAIR_PASSES + ' | final outcome: ' + repairOutcome);
  repairPassRecords.forEach(r => L.push('  - Pass ' + r.pass + ': ' + r.outcome + ' | ' + r.model + ' (' + r.tier + ' tier) | usage: ' + JSON.stringify(r.usage) + ' | real cost: $' + (realCostFor(r.usage, r.model) ?? 'unknown')));
  L.push('**Total real cost this operation**: ' + (realCostUSD != null ? '$' + realCostUSD : 'unknown — usage block missing') + ' (this resume session itself only spent on the repair pass(es) above — the primary call was made in the original run, not repeated here)');
  L.push('');
  L.push('## Validator result (FINAL — reflects the bounded repair merge if one was applied): ' + (validation.ok ? '✅ ELIGIBLE FOR REVIEW (structural/canon checks passed — this is NOT a prose-quality judgment)' : '❌ NOT ELIGIBLE — structural/canon violations found'));
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
  L.push('- This is Attempt 8, RESUMED — no new primary call was made; the primary draft/usage above is the REAL, already-saved result from the original run.');
  L.push('- Primary tiers attempted (original run): ' + records.map(r => r.provider + ' (status ' + r.httpStatus + (r.threw ? ', threw' : '') + ')').join(', '));
  L.push('- Primary winning tier: ' + winningTier + ' / ' + winningModel);
  L.push('- Bounded repair passes: ' + repairPassesRun + '/' + MAX_REPAIR_PASSES + ' run, final outcome ' + repairOutcome + (repairCallMade ? ' — see 05_repair_pass*_request_response_records.json' : ' (never invoked — see reason above/in REPORT.md)'));
  L.push('- At most ONE primary call and at most ' + MAX_REPAIR_PASSES + ' bounded repair pass(es) total for this attempt — no second primary (whole-scene) call was ever made, no third repair pass, regardless of the validator result above.');
  L.push('- No images were generated. No package/starter-scenes.js write occurred. No live-reader launch occurred. This artifact is NOT auto-shipped anywhere — it awaits explicit human review/approval.');
  return L.join('\n');
}
const preview = renderPreview();
fs.writeFileSync(path.join(OUT_DIR, '04_review_preview.md'), preview);

const report = [
  '# First Sacrifice full-package draft-authoring operation (v3, bounded-repair-capable) — REPORT',
  '',
  '**THIS IS ATTEMPT 8, RESUMED** (Roman, 2026-09-20) — the corrected exemplar-similarity policy made its already-authorized bounded repair path eligible; this run performs ONLY the repair pass(es), not a new primary draft.',
  '',
  '**Primary calls made (original run)**: ' + records.length + ' (' + records.map(r => r.provider).join(' -> ') + ')',
  '**Primary winning tier/model**: ' + winningTier + ' / ' + winningModel,
  '**Primary tokens (usage)**: ' + JSON.stringify(winningUsage),
  '**Primary real cost**: ' + (primaryRealCostUSD != null ? '$' + primaryRealCostUSD : 'unknown — usage block missing from provider response'),
  '',
  '**Bounded repair outcome**: ' + repairOutcome,
  '**Bounded repair passes run**: ' + repairPassesRun + '/' + MAX_REPAIR_PASSES,
  ...repairPassRecords.map(r => '**Pass ' + r.pass + '**: ' + r.outcome + ' | ' + r.model + ' (' + r.tier + ' tier) | usage: ' + JSON.stringify(r.usage) + ' | real cost: $' + (realCostFor(r.usage, r.model) ?? 'unknown')),
  repairCallMade ? '**Bounded repair TOTAL real cost**: ' + (repairRealCostUSD != null ? '$' + repairRealCostUSD : 'unknown') : '**Bounded repair TOTAL real cost**: $0 (no repair call made)',
  '',
  '**TOTAL real cost this operation (primary + repair)**: ' + (realCostUSD != null ? '$' + realCostUSD : 'unknown — usage block missing from provider response'),
  '**FINAL Validator result** (reflects the repair merge if one was applied): ' + (validation.ok ? 'ELIGIBLE FOR REVIEW' : 'NOT ELIGIBLE — see 03_validation_result.json') + ' (structural/canon check only — NOT a prose-quality judgment)',
  (validation.diagnostics && validation.diagnostics.length) ? '**Non-blocking diagnostics** (human-review-only, never affect ELIGIBLE/NOT ELIGIBLE or repair eligibility): ' + validation.diagnostics.map(d => d.rule + ' — ' + d.detail).join(' | ') : null,
  '**At most ONE primary call and at most ' + MAX_REPAIR_PASSES + ' bounded repair pass(es) were made for this attempt.**',
  '**NOT auto-shipped to starter-scenes.js or anywhere else — this artifact awaits explicit human review/approval.**',
  '',
  'Files: 01_request_response_records.json (primary attempt records, unchanged from original run), 02_draft.json (primary draft artifact, unchanged, pre-repair), 03_validation_result.json ({finalValidation, repairOutcome, repairPassesRun, repairPassRecords, resumed_from} — UPDATED by this resume), 04_review_preview.md (FULL reading-experience preview of the FINAL — possibly repaired — candidate, READ THIS for the fiction — UPDATED), 05_repair_passN_request_response_records.json (one per repair pass actually attempted, N=1..' + MAX_REPAIR_PASSES + ' — NEW), 06_repair_passN_merge_result.json (local merge result per pass — NEW), 07_final_draft_after_passN.json (the merged draft after each successful pass — NEW), raw_winning_content.txt (unchanged) / raw_repair_passN_content.txt (NEW, raw model output per repair call).',
].filter(line => line !== null).join('\n');
fs.writeFileSync(path.join(OUT_DIR, 'REPORT.md'), report);

console.log('\n' + '='.repeat(70));
console.log(report);
