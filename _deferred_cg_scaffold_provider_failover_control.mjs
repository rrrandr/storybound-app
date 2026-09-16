// DEFERRED CG_SCAFFOLD — POST-SUBMIT PROVIDER FAILOVER control (Roman, 2026-09-16)
//
// _tiered_provider_policy_control.mjs proves the GENERIC tiered-provider mechanism
// (Mistral primary -> Grok fallback -> Claude/OpenAI terminal) using rplot as its HTTP-500
// example — rplot is a fine proxy for the GENERIC mechanism, but it is NOT coverage of
// CG_SCAFFOLD's own deferred lifecycle (moved out of handleBeginStory's baked-setup-only run,
// now firing only from inside _advanceStagedScene after the reader's Submit — see
// _deferred_cg_scaffold_control.mjs). This file is that missing, focused proof: drives the real
// OAS path through an ACTUAL Submit, forces CG_SCAFFOLD's Mistral attempt to fail specifically
// (every other role's Mistral tier succeeds), and proves — from the real app's own
// window._providerTierLog, not an inference — that (a) CG_SCAFFOLD is still absent before
// Submit, (b) its Mistral failure correctly falls back to Grok, attempt-accounted (1=mistral
// fail, 2=grok success), and (c) Claude/OpenAI is never reached (Grok succeeded).
//
// Real Library -> Read -> Genesis -> OAS -> Submit launch, zero renderMode/currentEngine
// override. The interruption UI is reached via the same real-baked-data direct mount
// _deferred_cg_scaffold_control.mjs already established (bypasses only the separately-tested
// live intimacy-dialogue-turn mechanism — never the mechanism under test here).
//
// usage: node _deferred_cg_scaffold_provider_failover_control.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import { installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody } from './_test_session_env.mjs';
const F = await import('./_seed_fixtures.generated.mjs');

const DIR = '_deferred_cg_scaffold_provider_failover_out';
fs.mkdirSync(DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 700) : '')); };

// ── Reused verbatim from _tiered_provider_policy_control.mjs (that file is a script, not a
// module — no exports to import from) ──
function classifyModelCall(sys, usr) {
  if (/opening an intimate dialogue/.test(sys)) return 'oasDialogue';
  if (/uninhibited romance fiction author/.test(sys) && /TEMPTATION \|\|\|/.test(usr)) return 'fatePreviews';
  if (/screenplay-native cinematic-romance writer/.test(sys)) return 'cgScreenplay';
  if (/SCENE-SPINE planner/.test(sys) || /"hardBeats"/.test(sys)) return 'sceneSpine';
  if (/rewrite 5 body-tell fields for a romance heroine bible/.test(sys)) return 'pcBible_tellReroll_nonViolating';
  if (/rewrite the CURRENT CRISIS of a billionaire-world romance heroine/.test(sys)) return 'pcBible_crisisReroll_nonViolating';
  if (/architect of WHY THIS PAIR/.test(sys)) return 'pairBond';
  if (/editorial auditor reviewing an R-plot/.test(sys)) return 'rplotAudit';
  const hits = F.REQUEST_KINDS.filter(([, t]) => t(sys + '\n' + usr, sys, usr)).map(([k]) => k);
  return hits.length === 1 ? hits[0] : 'unclassified';
}
function contentFor(kind, sys, usr) {
  if (kind === 'pcBodyBible') return JSON.stringify(F.PC_BIBLE);
  if (kind === 'liBodyBible') return JSON.stringify(F.LI_BIBLE);
  if (kind === 'rplot') return JSON.stringify({ coreTension: 'x', relationshipQuestion: 'x', escalationAxis: 'trust', issueRelationshipStates: ['x'], issuePressures: ['x'], relationshipMilestones: ['x'] });
  if (kind === 'scaffold') { const ref = (sys + usr).match(/subject_ref:\s*(\S+)/); return JSON.stringify(F.scaffoldReply(ref ? ref[1] : null, null)); }
  if (kind === 'aplotGenerator' || kind === 'aplotCorrection') return JSON.stringify(F.APLOT_VALID);
  if (kind === 'antagonistBodyBible') return JSON.stringify(F.ANTAGONIST_BIBLE);
  if (kind === 'pairBond') return JSON.stringify({ psychological_key_a: 'x', psychological_key_b: 'x', erotic_register: 'x', why_this_pair: 'x' });
  if (kind === 'rplotAudit') return JSON.stringify({ fingerprint_strength: 'STRONG', fingerprint_reason: 'x', sequence_verdict: 'PASS', sequence_reason: 'x' });
  if (kind === 'planner') return F.plannerReply(usr, null);
  if (kind === 'author') return F.PROSE || '';
  if (kind === 'oasDialogue') return JSON.stringify({ li_dialogue: 'placeholder', li_action: 'placeholder', face_state: 'intent', scene_state: 'building', release_state: 'none' });
  if (kind === 'fatePreviews') return ['TEMPTATION ||| amplify ||| a ||| b', 'SILENCE ||| redirect ||| a ||| b', 'REVERSAL ||| amplify ||| a ||| b', 'BOUNDARY ||| amplify ||| a ||| b', 'CONFESSION ||| amplify ||| CONF-OPT-ACTION: a ||| CONF-OPT-LINE: b'].join('\n');
  if (kind === 'sceneSpine') return JSON.stringify({ hardBeats: ['x'] });
  return JSON.stringify(F.GENERIC);
}
function shapeSuccess(pathname, text) {
  if (/\/api\/chatgpt-proxy\b/.test(pathname)) return { content: text, usage: { prompt_tokens: 100, completion_tokens: 100 }, _orchestration: { model: 'stub' } };
  return { id: 'ctrl', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: text } }], usage: { prompt_tokens: 100, completion_tokens: 100 } };
}

const census = [];
let submitClickedAt = null;

function makeRouteHandler({ failMistralFor = new Set() }) {
  return async (route) => {
    const req = route.request();
    const url = req.url();
    const p = new URL(url).pathname;
    if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
    if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (/\/api\/verify-subscription\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) });
    if (F.PASSTHROUGH.test(url)) return route.continue();
    if (F.LOCAL[p]) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(F.LOCAL[p]) });
    if (!F.MODEL.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });

    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const flat = m => typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(x => x && x.text || '').join('\n') : '');
    const sys = (b.messages || []).filter(m => m.role === 'system').map(flat).join('\n');
    const usr = (b.messages || []).filter(m => m.role === 'user').map(flat).join('\n');
    const kind = classifyModelCall(sys, usr);
    const isMistral = /\/api\/mistral-proxy\b/.test(p);
    census.push({ kind, url: p, beforeSubmit: submitClickedAt == null, t: Date.now() });

    if (isMistral && failMistralFor.has(kind)) {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'stub_induced_mistral_failure_scaffold_only', kind }) });
    }
    const text = contentFor(kind, sys, usr);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(shapeSuccess(p, text)) });
  };
}

async function dismissPcLookModalIfOpen(page) {
  for (let i = 0; i < 10; i++) {
    const st = await page.evaluate(() => ({
      pcOpen: (() => { const m = document.getElementById('pcLookModal'); return !!(m && !m.classList.contains('hidden') && m.getClientRects().length > 0); })(),
      liOpen: (() => { const m = document.getElementById('liRenderModal'); return !!(m && !m.classList.contains('hidden') && m.getClientRects().length > 0); })(),
      warnOpen: !!document.getElementById('skipRenderWarnModal'),
    }));
    if (!st.pcOpen && !st.liOpen && !st.warnOpen) break;
    if (st.warnOpen) { try { await page.click('#skipRenderWarnModal [data-act="skip"]', { timeout: 5000 }); } catch (_) {} }
    else if (st.pcOpen) { try { await page.click('#pcLookSkipBtn', { timeout: 5000 }); } catch (_) {} }
    else if (st.liOpen) { try { await page.click('#liRenderSkipBtn', { timeout: 5000 }); } catch (_) {} }
    await page.waitForTimeout(400);
  }
}

console.log('\n' + '='.repeat(92) + '\nDEFERRED CG_SCAFFOLD — POST-SUBMIT PROVIDER FAILOVER control\n' + '='.repeat(92) + '\n');

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
const consoleLines = [];
page.on('console', m => consoleLines.push(m.text()));
await installSession(page);
await page.route('**/sb-test.localhost/**', route => {
  const accept = route.request().headers()['accept'] || '';
  const single = /vnd\.pgrst\.object\+json/.test(accept);
  return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
});
await installEntitledProfileStub(page, { log: () => {} });
await page.route('**/api/**', makeRouteHandler({ failMistralFor: new Set(['scaffold']) }));

const t0 = Date.now(); let up = false;
while (Date.now() - t0 < 120000 && !up) {
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
    await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_STORIES && window._bakedScene1For, null, { timeout: 60000 });
    up = true;
  } catch (_) { await page.waitForTimeout(3000); }
}
if (!up) { ok('server ready', false); await browser.close(); process.exit(1); }
await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2000);

const burgerVisible = await page.evaluate(() => { const b = document.getElementById('burgerBtn'); return !!(b && b.getClientRects().length > 0); });
if (burgerVisible) {
  await page.click('#burgerBtn'); await page.waitForTimeout(400);
  await page.click('.vault-tab[data-vault-section="Account"]'); await page.waitForTimeout(300);
  await page.click('#menuLibraryBtn'); await page.waitForTimeout(1200);
}
await page.click('.library-book[data-story-id="starter_first_sacrifice"]');
await page.waitForTimeout(800);
await page.click('#zoomReadBtn');
await page.waitForTimeout(2000);
const oasBtnVisible = await page.evaluate(() => !!document.getElementById('bakedOASEnterBtn') && document.getElementById('bakedOASEnterBtn').getClientRects().length > 0);
ok('baked OAS entry button visible', oasBtnVisible);
if (!oasBtnVisible) { await browser.close(); process.exit(1); }

await page.click('#bakedOASEnterBtn');
await page.waitForTimeout(1000);
const goBtnVisible = await page.evaluate(() => { const el = document.getElementById('buGoBtn'); return !!(el && el.getClientRects().length > 0); });
ok('Genesis gate #buGoBtn visible', goBtnVisible);
if (!goBtnVisible) { await browser.close(); process.exit(1); }

await page.click('#buGoBtn');
let unlocked = false;
for (let i = 0; i < 240 && !unlocked; i++) { await page.waitForTimeout(1000); unlocked = consoleLines.some(l => /\[BAKED:GATE\] Genesis unlocked/.test(l)); }
ok('Genesis charge completes ("[BAKED:GATE] Genesis unlocked")', unlocked);
await dismissPcLookModalIfOpen(page);
await page.waitForTimeout(1500);

const preSubmitScaffold = census.filter(c => c.kind === 'scaffold' && c.beforeSubmit);
ok('CG_SCAFFOLD is still ABSENT before Submit (re-confirmed under a scaffold-Mistral-fails policy too)', preSubmitScaffold.length === 0, JSON.stringify(preSubmitScaffold));

// ── Mount the real interruption from the real baked package, submit a custom Say/Do ──
const mountResult = await page.evaluate(() => {
  const pkg = (typeof window._bakedScene1For === 'function') ? window._bakedScene1For(window.state._starterId) : null;
  const oh = pkg && pkg.oasHandoff;
  if (!oh || !oh.interruption) return { ok: false, reason: 'no pkg.oasHandoff.interruption' };
  window.state.intimacyDialogue = null;
  window._mountIntimateInterruption({ host: 'auto', frame: { interruption: oh.interruption, interruptionImage: oh.interruptionImage, interruptionExchange: Array.isArray(oh.interruptionExchange) ? oh.interruptionExchange : [] }, sceneNum: 1 });
  return { ok: true };
});
ok('real baked interruption frame found and mounted', mountResult.ok, JSON.stringify(mountResult));
await page.waitForTimeout(500);
const interrVisible = await page.evaluate(() => !!document.getElementById('intimateInterruption'));
ok('interruption UI rendered', interrVisible);

await page.fill('#gnActionInput', 'I hold still and let him ask.');
await page.fill('#gnDialogueInput', 'Ask, then. I will answer once, in front of all of them.');
submitClickedAt = Date.now();
await page.click('#gnSubmitBtn');
await page.waitForTimeout(6000);

const tierLog = await page.evaluate(() => (window._providerTierLog || []).filter(r => r.role === 'scaffold' || r.role === 'cgScaffold' || r.role === 'CG_SCAFFOLD'));
console.log('  [PROVIDER-TIER-LOG scaffold] ' + JSON.stringify(tierLog));
ok('CG_SCAFFOLD attempt #1 hit Mistral (primary tier)', tierLog.some(x => x.tier === 'primary' && x.provider === 'mistral' && x.attempt === 1), JSON.stringify(tierLog));
ok('CG_SCAFFOLD attempt #2 hit Grok (fallback tier), only after the induced Mistral failure', tierLog.some(x => x.tier === 'fallback' && x.provider === 'grok' && x.attempt === 2), JSON.stringify(tierLog));
ok('exactly 2 physical CG_SCAFFOLD attempts (Mistral fail -> Grok success, no terminal needed)', tierLog.length === 2, JSON.stringify(tierLog));
const fallbackEntry = tierLog.find(x => x.tier === 'fallback');
ok('the fallback attempt\'s fallbackReason names the induced Mistral failure (not null/generic)', !!(fallbackEntry && fallbackEntry.fallbackReason && /stub_induced_mistral_failure_scaffold_only|500/.test(fallbackEntry.fallbackReason)), JSON.stringify(fallbackEntry));
ok('Claude/OpenAI (chatgpt-proxy) never reached for CG_SCAFFOLD — Grok fallback succeeded', !tierLog.some(x => x.provider === 'openai'), JSON.stringify(tierLog));

const postSubmitScaffold = census.filter(c => c.kind === 'scaffold' && !c.beforeSubmit);
ok('the census independently agrees: exactly 2 scaffold-classified requests, both after Submit', postSubmitScaffold.length === 2, JSON.stringify(postSubmitScaffold));

const err = await page.evaluate(() => window.__err || null);
await browser.close();

fs.writeFileSync(DIR + '/census.json', JSON.stringify(census, null, 2));
fs.writeFileSync(DIR + '/tierLog.json', JSON.stringify(tierLog, null, 2));
fs.writeFileSync(DIR + '/consoleLines.json', JSON.stringify(consoleLines, null, 2));

console.log('\n' + '-'.repeat(92));
console.log(' page error : ' + (err || 'none'));
console.log('\n artifacts -> ' + DIR + '/\n');

const allPass = results.every(r => r.pass);
console.log(`\nDEFERRED CG_SCAFFOLD POST-SUBMIT PROVIDER FAILOVER CONTROL: ${results.filter(r=>r.pass).length}/${results.length} passed`);
process.exit(allPass ? 0 : 1);
