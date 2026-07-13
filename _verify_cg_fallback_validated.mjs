// Guard (Fable CG audit — A1-F1): when all screenplay providers fail, CG falls back to the literary
// analyzer (_runStagedAnalysis → _completeStagedSceneFromLiterary). That plan previously mounted WITHOUT
// _validateAndNormalizeCGPlan — skipping the intimacy-LEGALITY gate (the analyzer re-derives
// is_consummate_scene from prose with no phase/canon awareness) AND structural validation. Fix: route
// the fallback plan through the same validator, and NEVER mount unvalidated (null/throw → stay on prior
// scene). This guard proves the validator sits between analysis and any plan consumption.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

const fnStart = src.indexOf('async function _completeStagedSceneFromLiterary(');
A(fnStart >= 0, '_completeStagedSceneFromLiterary not found');
const fnEnd = src.indexOf('window._completeStagedSceneFromLiterary =', fnStart);
const fn = fnStart >= 0 ? src.slice(fnStart, fnEnd > fnStart ? fnEnd : fnStart + 12000) : '';

// (1) The fallback plan is run through the SAME validator the screenplay path uses.
A(fn.includes('_validateAndNormalizeCGPlan(plan, sceneIndex)'), 'fallback plan is not routed through _validateAndNormalizeCGPlan');

// (2) Ordering: analysis → validate → consume. The validator must run AFTER _runStagedAnalysis and
//     BEFORE the plan is consumed (region contract / phase images).
const idxAnalysis = fn.indexOf('_runStagedAnalysis(rawProse');
const idxValidate = fn.indexOf('_validateAndNormalizeCGPlan(plan, sceneIndex)');
const idxConsume  = fn.indexOf('_buildStagedRegionContract(plan)');
A(idxAnalysis >= 0 && idxValidate > idxAnalysis, 'validator does not run after analysis');
A(idxConsume >= 0 && idxValidate < idxConsume, 'validator does not run before the plan is consumed');

// (3) NEVER MOUNT UNVALIDATED: null OR throw both bail to stay-on-prior-scene (the guarded return),
//     and the consumed `plan` is reassigned to the validated result.
A(/_validatedFallbackPlan = null;/.test(fn), 'validated-plan holder missing (throw path not caught)');
A(/if \(!_validatedFallbackPlan\)/.test(fn), 'no bail when validation fails');
A(fn.includes('never mount unvalidated'), 'bail path not documented/anchored');
A(fn.includes('plan = _validatedFallbackPlan;'), 'downstream still consumes the raw (unvalidated) plan');
// The bail must actually stop execution (return) before consumption.
const bailIdx = fn.indexOf('if (!_validatedFallbackPlan)');
const bailReturn = fn.indexOf('return;', bailIdx);
A(bailIdx >= 0 && bailReturn >= 0 && bailReturn < idxConsume, 'validation-fail bail does not return before consumption');

if (fail) process.exit(1);
console.log('PASS: CG literary-fallback plan is routed through _validateAndNormalizeCGPlan (intimacy legality + structural) before any consumption; a null/throwing validator stays on the prior scene — the fallback can never mount unvalidated.');
