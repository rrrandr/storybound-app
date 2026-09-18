#!/usr/bin/env node
// FIRST SACRIFICE — ONE canonical FULL-PACKAGE draft-authoring operation (Roman's fourth redesign
// pass, 2026-09-17; AUTHORIZED by Roman: "authorize the one First Sacrifice draft").
//
// Scope (Roman's standing authorization, applied to the current full-package schema):
//   - Grok-4.3 primary -> ministral-8b-2512 fallback ONLY on genuine Grok failure -> GPT-4o
//     terminal ONLY if both fail. No DeepSeek.
//   - Maximum ONE attempt per tier for the PRIMARY (whole-scene) draft. No second primary call,
//     ever, regardless of outcome.
//   - SUPERSEDED as of v7 attempt 7 (Roman, 2026-09-20 operational redesign): "no repair pass" is
//     no longer the rule. AT MOST ONE additional BOUNDED repair call (its own 3-tier chain) is now
//     permitted, and ONLY when the primary draft is structurally correct but fails purely on the
//     two density rules — see the v7 attempt 7 note below and
//     _first_sacrifice_bounded_repair_engine.mjs for the full, dry-proven design. Still no images,
//     no live-reader launch, no starter-scenes.js / canon write, and no second primary call.
//   - The model writes scene1Candidate (EXACTLY 20 numbered beats, full candidate replacement
//     Scene 1) + scene1Coverage + first_person_lirael + oasOpening (Julian's ONE authored opening
//     turn, 35-80 words) + postInterruptionBeat (authored beat crystallizing an unresolved choice
//     after the Dohkar's interruption, WITHOUT deciding it) — the fixed 3-line interruption tail
//     is NEVER asked of the model; this script splices it in deterministically, in code, after a
//     successful call. fateCards is NOT authored (Roman, 2026-09-17 correction) — the real 5 fixed
//     archetype cards are dealt live by the app's own dynamic mechanism after each OAS exchange.
//   - SIXTH REDESIGN PASS (Roman, 2026-09-17): the old scripted `interrogationExchange` (~7
//     canned Julian/Lirael lines) is SUPERSEDED — the player IS Lirael, so no OAS reply is ever
//     pre-scripted. Everything between `oasOpening` and the Dohkar's interruption is live,
//     player-driven OAS, produced by the real app at read time, never by this script.
//   - Emit a versioned draft artifact + a FULL side-by-side review preview (current baked Scene 1
//     vs. the candidate, both converging into the shared oasOpening -> [LIVE OAS] -> fixed
//     interruption/tail -> postInterruptionBeat -> [LIVE fate cards] sequence).
//   - Validate structurally/canon-wise (eligibility for review, NOT a prose-quality pass) —
//     including provenance proportionality: only locked_canon_fact needs a citation,
//     grounded_inference needs named grounds, generated_expression needs neither.
//   - Retain request/response/usage records; report actual calls, model, tokens, cost.
//   - Do NOT make a second draft call if this one fails validation or reads poorly.
//
// This calls the REAL production proxy handlers (api/proxy.js, api/mistral-proxy.js,
// api/chatgpt-proxy.js) IN-PROCESS (no browser, no dev server, no live app UI, no window.state)
// via mock req/res objects — the same code path real production traffic uses, at the network
// boundary of THIS operation only. Real money is spent by this script when it is run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
// v7 attempt 3: attempt 1 (thin, 507 words, coverage-map bug) and attempt 2 (coverage-map fixed,
// but thinner still at 425 words, plus a new scene1/OAS scope leak) are preserved untouched as
// disclosed history, never overwritten. Both bugs found in attempt 2 are now patched: the density
// instruction carries a worked example, and a mechanical scene1/OAS boundary guard is in place.
// v7 attempt 4: attempts 1-3 preserved as disclosed history. Composition contract added
// (18-22 beats, >=12 narration beats of 55-110 words each, dialogue adjacency, no synopsis
// stand-ins) and oasOpening lengthened to 35-80 words with concrete-behavior/question/subtext
// requirements, following the density fix's failure across all 3 prior attempts.
// v7 attempt 5: attempts 1-4 preserved as disclosed history (attempt 4 in particular kept as a
// REJECTED-BUT-USEFUL reference for its real craft strengths — see attempt4_positive_exemplars in
// the packet). This attempt targets the editorial corrections (concrete Seren sacrifice, social
// fallout beat, non-binary postInterruptionBeat), the shared dramatize-present-speech rule, and
// the fate-card lifecycle correction (fateCards no longer authored).
// v7 attempt 6: attempts 1-5 preserved as disclosed history. Attempt 5 hit exactly 20 beats and
// came closest on density (1,035/1,100 words) but the exemplar-copy guard caught real verbatim
// copying on both exemplars — those are now removed from the prompt entirely (replaced with
// abstract, non-quotable craft requirements) and the numbered template now declares kind + word
// range + function per slot, unmissably. RESULT (disclosed, preserved untouched at
// _first_sacrifice_draft_v7_attempt6_full_package/): 751/1,100 words, plus a NEW real
// exemplar_verbatim_copy hit in oasOpening (7+ word match against a NEVER-RENDERED historical
// exemplar) — real evidence that removing verbatim text from the prompt did not stop convergence,
// because the abstract instruction replacing it still prescribed one specific rhetorical shape.
// Two prompt-level fixes were made and committed (b1a9b2c2): a final self-check reminder, and a
// generalized (non-prescriptive) craft requirement #2.
//
// v7 attempt 7 — OPERATIONAL REDESIGN (Roman, 2026-09-20): "five rejected samples say 'add another
// reminder' is not enough." Real trace across all 6 attempts (finish_reason="stop" on every single
// one, completion_tokens 1,570-2,412 against an 8,000-token ceiling never approached) proves this
// is GENUINE MODEL EARLY COMPLETION, not truncation of any kind — see
// _first_sacrifice_bounded_repair_engine_control.mjs section 8 for the full real-data trace. A
// text-only reminder asks the model to notice its own under-delivery; it does not reliably change
// it. This attempt adds a BOUNDED REPAIR PASS (_first_sacrifice_bounded_repair_engine.mjs, proven
// dry, 56/56, zero fetch calls): if the primary draft is structurally correct (exactly 20 beats,
// correct locked image/kind mapping) but fails ONLY on the two density rules
// (scene1_too_thin / scene1_insufficient_narration_density — REPAIR_ELIGIBLE_VALIDATOR_RULES), ONE
// additional bounded repair call (its own Grok -> Ministral -> GPT-4o fallback chain) requests
// structured replacement text for ONLY the named deficient slots, preserving beat order, image
// mapping, canon metadata, and every already-valid beat untouched. The merge happens LOCALLY (no
// provider call), then the REAL validator runs again on the merged candidate. If the draft is not
// structurally repairable, or still fails after the merge, or the merge itself is malformed in any
// way, this rejects with ZERO package write — identical failure posture to every prior attempt,
// just with one more real chance to clear a purely mechanical density bar before giving up.
const OUT_DIR = path.join(__dirname, '_first_sacrifice_draft_v7_attempt7_full_package');
fs.mkdirSync(OUT_DIR, { recursive: true });

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

// ── Build the adapter's real, packet-derived chain (identical prompt across all 3 tiers) ────
const { buildFixedInputView, buildAuthoringFallbackChain } = await import('./_first_sacrifice_authoring_adapter.mjs');
const {
  measureBeatDeficiencies, isRepairEligible, buildRepairFallbackChain, mergeRepairIntoDraft,
} = await import('./_first_sacrifice_bounded_repair_engine.mjs');
const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));
const chain = buildAuthoringFallbackChain(PACKET, buildFixedInputView());

// ── READ-ONLY: the real baked Scene 1 + oasHandoff, for splicing + full-preview rendering ──
const starterSrc = fs.readFileSync(path.join(__dirname, 'public/starter-scenes.js'), 'utf8');
const beatsBlockMatch = starterSrc.match(/beats: \[([\s\S]*?)\],\s*\n\s*endsAt:/);
const oasHandoffBlockMatch = starterSrc.match(/oasHandoff: \{([\s\S]*?)\n      \},\s*\n\s*emitted:/);
const beats = new Function('return [' + beatsBlockMatch[1] + ']')();
const oasHandoff = new Function('return {' + oasHandoffBlockMatch[1] + '\n}')();

// ── Mock req/res factory matching the Vercel serverless contract these handlers expect ──────
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

// ── Generic tiered-attempt dispatcher, shared by BOTH the primary chain and the (at most one)
// bounded repair chain — identical real handler-calling logic either way, parameterized on a ctx
// object instead of module-level state, so the two phases can never silently diverge in behavior. ──
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

const primaryCtx = makeCtx();
let ok = await runChain(chain, primaryCtx, 'PRIMARY');
const records = primaryCtx.records;
let winningTier = primaryCtx.winningTier, winningContent = primaryCtx.winningContent, winningUsage = primaryCtx.winningUsage, winningModel = primaryCtx.winningModel;

fs.writeFileSync(path.join(OUT_DIR, '01_request_response_records.json'), JSON.stringify(records, null, 2));

if (!ok) {
  console.log('\n' + '='.repeat(70));
  console.log('ALL APPROVED PRIMARY TIERS EXHAUSTED. No draft produced. NO second primary call will be made (per authorization). A bounded repair pass only ever applies to a real, structurally-valid primary draft — there is nothing to repair here. Records saved to ' + OUT_DIR + '/01_request_response_records.json');
  process.exit(1);
}

console.log('\n=== Winning tier: ' + winningTier + ' | model: ' + winningModel + ' ===');
console.log('usage: ' + JSON.stringify(winningUsage));

// ── Parse the winning content as the v2 draft schema (tolerant extraction, matching the real
// code's own JSON-recovery pattern) ──
let draft = null;
try { draft = JSON.parse(winningContent); }
catch (e) {
  const first = winningContent.indexOf('{'), last = winningContent.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { draft = JSON.parse(winningContent.slice(first, last + 1)); } catch (e2) { draft = null; }
  }
}
fs.writeFileSync(path.join(OUT_DIR, 'raw_winning_content.txt'), winningContent);

if (!draft) {
  console.log('\n⚠ WINNING RESPONSE WAS NOT PARSEABLE JSON. Raw content saved to raw_winning_content.txt. NO second call will be made. Stopping.');
  fs.writeFileSync(path.join(OUT_DIR, 'REPORT.md'), '# First Sacrifice draft-authoring run (full-package v3) — FAILED (unparseable output)\n\nWinning tier: ' + winningTier + ' (' + winningModel + ')\n\nThe response was not parseable JSON. See raw_winning_content.txt. No second call was made.\n');
  process.exit(1);
}

const draftArtifact = { packet_id: PACKET.packet_id, packet_version: PACKET.version, draft_version: 'draft-v7-full-package', generated_by: { tier: winningTier, model: winningModel, usage: winningUsage }, generated_at: new Date().toISOString(), draft };
fs.writeFileSync(path.join(OUT_DIR, '02_draft.json'), JSON.stringify(draftArtifact, null, 2));

// ── Structural/canon validation — reuse the REAL validator function exactly as the other
// scripts in this session do (eligibility for review, not a quality judgment). ──
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
fs.writeFileSync(path.join(OUT_DIR, '03_validation_result.json'), JSON.stringify(validation, null, 2));

// ── BOUNDED REPAIR PASS (Roman, 2026-09-20 operational redesign) — AT MOST ONE additional call,
// and ONLY when the primary draft is structurally correct (exactly 20 beats, locked image/kind
// mapping intact) but fails PURELY on the two density rules (REPAIR_ELIGIBLE_VALIDATOR_RULES).
// Never attempted for any canon/structural violation. Never a second primary call, never a
// whole-scene rewrite. See _first_sacrifice_bounded_repair_engine.mjs + its dry control (56/56,
// zero fetch calls) for the full design and proof. `draft`/`validation` are reassigned to the
// merged, re-validated result ONLY if the repair call succeeds AND the merge is well-formed —
// every failure mode below falls back to the ORIGINAL primary draft/validation, unchanged. ──
let repairOutcome = 'not_needed';
let deficiencyReport = null;
let repairCallMade = false, repairWinningUsage = null, repairWinningModel = null, repairWinningTier = null;
if (!validation.ok) {
  deficiencyReport = measureBeatDeficiencies(draft.scene1Candidate, PACKET);
  if (!isRepairEligible(validation.violations)) {
    repairOutcome = 'not_eligible';
    console.log('\nBounded repair NOT attempted: primary violations are not purely density-class (' + validation.violations.map(v => v.rule).join(', ') + '). REPAIR_ELIGIBLE_VALIDATOR_RULES = ' + JSON.stringify(['scene1_too_thin', 'scene1_insufficient_narration_density']) + '.');
  } else if (!deficiencyReport.structurallyRepairable) {
    repairOutcome = 'not_structurally_repairable';
    console.log('\nBounded repair NOT attempted: ' + deficiencyReport.reason);
  } else {
    console.log('\n=== BOUNDED REPAIR ELIGIBLE — ' + deficiencyReport.deficiencies.length + ' deficient slot(s): ' + deficiencyReport.deficiencies.map(d => d.n).join(', ') + ' ===');
    const repairChain = buildRepairFallbackChain(PACKET, draft, deficiencyReport.deficiencies);
    const repairCtx = makeCtx();
    const repairOk = await runChain(repairChain, repairCtx, 'REPAIR');
    repairCallMade = true; repairWinningUsage = repairCtx.winningUsage; repairWinningModel = repairCtx.winningModel; repairWinningTier = repairCtx.winningTier;
    fs.writeFileSync(path.join(OUT_DIR, '05_repair_request_response_records.json'), JSON.stringify(repairCtx.records, null, 2));
    if (!repairOk) {
      repairOutcome = 'repair_call_failed';
      console.log('\nBounded repair call FAILED on all 3 tiers. Keeping the primary draft/validation as final. NO further call will be made.');
    } else {
      fs.writeFileSync(path.join(OUT_DIR, 'raw_repair_content.txt'), repairCtx.winningContent || '');
      let repairResponse = null;
      try { repairResponse = JSON.parse(repairCtx.winningContent); }
      catch (e) {
        const first = repairCtx.winningContent.indexOf('{'), last = repairCtx.winningContent.lastIndexOf('}');
        if (first >= 0 && last > first) { try { repairResponse = JSON.parse(repairCtx.winningContent.slice(first, last + 1)); } catch (e2) { repairResponse = null; } }
      }
      if (!repairResponse) {
        repairOutcome = 'repair_response_unparseable';
        console.log('\nBounded repair response was not parseable JSON. Keeping the primary draft/validation as final. NO further call will be made.');
      } else {
        const { merged, errors } = mergeRepairIntoDraft(draft, repairResponse, deficiencyReport.deficiencies);
        if (!merged) {
          repairOutcome = 'merge_rejected';
          console.log('\nBounded repair response REJECTED at merge (' + errors.length + ' error(s)): ' + errors.join('; ') + '. Keeping the primary draft/validation as final. NO further call will be made.');
          fs.writeFileSync(path.join(OUT_DIR, '06_repair_merge_result.json'), JSON.stringify({ merged: false, errors }, null, 2));
        } else {
          let mergedValidation;
          try { mergedValidation = validateDraft(merged, PACKET); }
          catch (e) { mergedValidation = { ok: false, violations: [{ rule: 'validator_threw', detail: String(e.message || e) }] }; }
          fs.writeFileSync(path.join(OUT_DIR, '06_repair_merge_result.json'), JSON.stringify({ merged: true, errors: [], mergedValidation }, null, 2));
          const stillDensityFailing = mergedValidation.violations.some(v => v.rule === 'scene1_too_thin' || v.rule === 'scene1_insufficient_narration_density');
          repairOutcome = stillDensityFailing ? 'merged_still_density_failing' : 'merged_density_resolved';
          console.log('\nBounded repair merged. Re-validated merged candidate: ' + (mergedValidation.ok ? 'ELIGIBLE FOR REVIEW' : 'still NOT eligible — ' + mergedValidation.violations.map(v => v.rule).join(', ')));
          // `draft`/`validation` now refer to the merged, re-validated candidate for every artifact
          // written below (02b, REPORT.md, review preview) — the repair genuinely happened and its
          // real result, pass or fail, is what gets reported, not the pre-repair draft.
          draft = merged;
          validation = mergedValidation;
          fs.writeFileSync(path.join(OUT_DIR, '07_final_draft_after_repair.json'), JSON.stringify({ packet_id: PACKET.packet_id, packet_version: PACKET.version, draft_version: 'draft-v7-full-package-repaired', repair_outcome: repairOutcome, generated_at: new Date().toISOString(), draft }, null, 2));
        }
      }
    }
  }
}
fs.writeFileSync(path.join(OUT_DIR, '03_validation_result.json'), JSON.stringify({ finalValidation: validation, repairOutcome }, null, 2));

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
const repairRealCostUSD = repairCallMade ? realCostFor(repairWinningUsage, repairWinningModel) : null;
const realCostUSD = primaryRealCostUSD == null ? null : +(primaryRealCostUSD + (repairRealCostUSD || 0)).toFixed(6);

// ── FULL READING-EXPERIENCE preview: baked Scene 1 + oasHandoff fixed content + the model's new
// oasOpening / postInterruptionBeat around the live OAS gap and the fixed 3-line tail + the 5
// fate cards. Never the delta alone — Roman's explicit correction (2026-09-17): "where's the
// 800-word scene itself?" ──
function renderPreview() {
  const L = [];
  L.push('# First Sacrifice — Full-Package Draft (v3) Review Preview (REAL, authorized draft)');
  L.push('');
  L.push('**Packet**: ' + PACKET.packet_id + ' v' + PACKET.version);
  L.push('**Primary generated by**: ' + winningModel + ' (' + winningTier + ' tier) | usage: ' + JSON.stringify(winningUsage) + ' | real cost: ' + (primaryRealCostUSD != null ? '$' + primaryRealCostUSD : 'unknown — usage block missing'));
  L.push('**Bounded repair pass**: ' + repairOutcome + (repairCallMade ? ' | ' + repairWinningModel + ' (' + repairWinningTier + ' tier) | usage: ' + JSON.stringify(repairWinningUsage) + ' | real cost: ' + (repairRealCostUSD != null ? '$' + repairRealCostUSD : 'unknown') : ' (no repair call made)'));
  L.push('**Total real cost this operation**: ' + (realCostUSD != null ? '$' + realCostUSD : 'unknown — usage block missing'));
  L.push('');
  L.push('## Validator result (FINAL — reflects the bounded repair merge if one was applied): ' + (validation.ok ? '✅ ELIGIBLE FOR REVIEW (structural/canon checks passed — this is NOT a prose-quality judgment)' : '❌ NOT ELIGIBLE — structural/canon violations found'));
  if (!validation.ok) validation.violations.forEach(v => L.push('- **' + v.rule + '**: ' + v.detail));
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
  L.push('- Primary tiers attempted: ' + records.map(r => r.provider + ' (status ' + r.httpStatus + (r.threw ? ', threw' : '') + ')').join(', '));
  L.push('- Primary winning tier: ' + winningTier + ' / ' + winningModel);
  L.push('- Bounded repair: ' + repairOutcome + (repairCallMade ? ' — tiers attempted: unavailable in this view, see 05_repair_request_response_records.json' : ' (never invoked — see reason above/in REPORT.md)'));
  L.push('- At most ONE primary call and at most ONE bounded repair call were made — no second primary (whole-scene) call was ever made regardless of the validator result above.');
  L.push('- No images were generated. No package/starter-scenes.js write occurred. No live-reader launch occurred.');
  return L.join('\n');
}
const preview = renderPreview();
fs.writeFileSync(path.join(OUT_DIR, '04_review_preview.md'), preview);

const report = [
  '# First Sacrifice full-package draft-authoring operation (v3, bounded-repair-capable) — REPORT',
  '',
  '**Primary calls made**: ' + records.length + ' (' + records.map(r => r.provider).join(' -> ') + ')',
  '**Primary winning tier/model**: ' + winningTier + ' / ' + winningModel,
  '**Primary tokens (usage)**: ' + JSON.stringify(winningUsage),
  '**Primary real cost**: ' + (primaryRealCostUSD != null ? '$' + primaryRealCostUSD : 'unknown — usage block missing from provider response'),
  '',
  '**Bounded repair outcome**: ' + repairOutcome,
  '**Bounded repair call made**: ' + repairCallMade,
  repairCallMade ? '**Bounded repair tier/model**: ' + repairWinningTier + ' / ' + repairWinningModel : null,
  repairCallMade ? '**Bounded repair tokens (usage)**: ' + JSON.stringify(repairWinningUsage) : null,
  repairCallMade ? '**Bounded repair real cost**: ' + (repairRealCostUSD != null ? '$' + repairRealCostUSD : 'unknown') : null,
  '',
  '**TOTAL real cost this operation**: ' + (realCostUSD != null ? '$' + realCostUSD : 'unknown — usage block missing from provider response'),
  '**FINAL Validator result** (reflects the repair merge if one was applied): ' + (validation.ok ? 'ELIGIBLE FOR REVIEW' : 'NOT ELIGIBLE — see 03_validation_result.json') + ' (structural/canon check only — NOT a prose-quality judgment)',
  '**At most ONE primary call and at most ONE bounded repair call were made.**',
  '',
  'Files: 01_request_response_records.json (primary attempt records), 02_draft.json (primary draft artifact, pre-repair), 03_validation_result.json ({finalValidation, repairOutcome}), 04_review_preview.md (FULL reading-experience preview of the FINAL — possibly repaired — candidate, READ THIS for the fiction), 05_repair_request_response_records.json (bounded-repair attempt records, only if a repair was attempted), 06_repair_merge_result.json (local merge result, only if a repair call succeeded), 07_final_draft_after_repair.json (the final, merged draft, only if repair was applied), raw_winning_content.txt / raw_repair_content.txt (raw model output).',
].filter(line => line !== null).join('\n');
fs.writeFileSync(path.join(OUT_DIR, 'REPORT.md'), report);

console.log('\n' + '='.repeat(70));
console.log(report);
