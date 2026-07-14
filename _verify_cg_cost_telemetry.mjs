// Guard (Fable CG audit — A3-F3/A3-F8): CG primary-author cost was invisible. The raw Grok/Mistral/
// DeepSeek author fetches bypass orchestration's _accumulateTokens, TEXT_PRICING had no mistral/deepseek
// keys (mispriced as gpt-4o-mini default), and _finalizeSceneCost was NEVER called on the CG path — so
// per-scene CG cost + _cumulativeAPICost were blind. Fix: record each author leg via _recordProxyTextCost,
// price mistral/deepseek explicitly, finalize at mount, and stamp the winning provider for attribution.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) TEXT_PRICING now has explicit mistral + deepseek keys (no longer 'default').
A(src.includes("'mistral-small-latest':        { in:"), 'mistral-small-latest pricing key missing');
A(src.includes("'deepseek-v4-pro':             { in:"), 'deepseek-v4-pro pricing key missing');

// (2) _resolveTextPricingKey routes mistral/deepseek to those keys.
A(src.includes("if (m.indexOf('mistral') !== -1) return 'mistral-small-latest';"), 'mistral pricing-key routing missing');
A(src.includes("if (m.indexOf('deepseek') !== -1) return 'deepseek-v4-pro';"), 'deepseek pricing-key routing missing');

// (3) Each of the 3 raw-fetch author legs records its usage; the callChatGPT default leg does NOT
//     (already counted via orchestration) — so exactly 3 recorders inside _callScreenplayProvider.
const cpStart = src.indexOf('var _callScreenplayProvider = async function(prov)');
const cpEnd = src.indexOf('for (var _pIdx = 0;', cpStart);
const cp = cpStart >= 0 ? src.slice(cpStart, cpEnd > cpStart ? cpEnd : cpStart + 8000) : '';
A(cp.includes('_recordProxyTextCost(gData, prov.grokModel, \'scene\')'), 'Grok leg does not record cost');
A(cp.includes('_recordProxyTextCost(mData, prov.mistralModel, \'scene\')'), 'Mistral leg does not record cost');
A(cp.includes('_recordProxyTextCost(dData, prov.dsModel, \'scene\')'), 'DeepSeek leg does not record cost');
const recCount = (cp.match(/_recordProxyTextCost\(/g) || []).length;
A(recCount === 3, `expected exactly 3 _recordProxyTextCost calls (grok/mistral/deepseek, NOT the counted callChatGPT leg), found ${recCount}`);

// (4) The winning provider is persisted for author-mix attribution.
A(src.includes('window.state._lastCGAuthor = _prov.name;'), 'winning-provider attribution stamp missing');

// (5) _finalizeSceneCost is called on the CG screenplay path, after the scene mounts.
const compStart = src.indexOf('async function _completeStagedSceneFromScreenplay(');
const compEnd = src.indexOf('window._completeStagedSceneFromScreenplay =', compStart);
const comp = compStart >= 0 ? src.slice(compStart, compEnd > compStart ? compEnd : compStart + 120000) : '';
A(comp.includes('_finalizeSceneCost()'), 'CG screenplay path does not call _finalizeSceneCost');
const idxRender = comp.indexOf('_renderStagedScene(plan, phaseImagesPromise);');
const idxFinal = comp.indexOf('_finalizeSceneCost()');
A(idxRender >= 0 && idxFinal > idxRender, 'finalize does not run after the scene mounts');

if (fail) process.exit(1);
console.log('PASS: CG author legs (Grok/Mistral/DeepSeek) record token cost; mistral/deepseek priced explicitly; scene cost finalized at mount (late images via sealed-acc delayed charge); winning provider attributed. callChatGPT leg not double-counted.');
