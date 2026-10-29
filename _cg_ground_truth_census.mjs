// GROUND-TRUTH, ZERO-PROVIDER CG CENSUS FOR FIRST SACRIFICE (Roman, corrective pass 2026-09-16)
//
// Supersedes _scene1_call_census.mjs for First Sacrifice specifically: that harness forced
// renderMode:'literary'/currentEngine:'literary' and called window.handleBeginStory() DIRECTLY
// (not through the real click path), silently hiding First Sacrifice's real render_mode
// ('staged_story_mode', the CG/OAS starter — Glass House is the real literary starter as of the
// 2026-08-11 format swap). This harness launches ONLY through the real UI: Library -> Read ->
// baked OAS entry -> buGoBtn (the exact sequence _tiered_provider_policy_control.mjs already
// proved reaches the real deferred handleBeginStory() pipeline) — NO renderMode/currentEngine
// override anywhere. It reads the EXPECTED engine live from window.STARTER_STORIES before
// launch and asserts the ACTUAL post-launch state matches, hard-failing on any mismatch. Every
// /api/** request is stack-traced to its real caller (fetch wrapper + exposeFunction, same
// mechanism as _scene1_call_census.mjs) and stubbed locally — nothing ever reaches a real
// provider.
//
// usage: node _cg_ground_truth_census.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import { installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody } from './_test_session_env.mjs';

const DIR = '_cg_ground_truth_census_out';
// CLEARED EACH RUN. The directory survived failed runs, so after the entrance-affordance change
// aborted this harness before any CG request, Sep-16 artifacts were still sitting here and read
// as current CG coverage. A run's output directory now contains only that run's output.
try { fs.rmSync(DIR, { recursive: true, force: true }); } catch (_) {}
fs.mkdirSync(DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 600) : '')); };

const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const LOCAL_STUB = {
  '/api/consume-fortune':          { success: true, fortunesRemaining: 9999 },
  '/api/verify-subscription':      { success: true, subscribed: true, tier: 'sub' },
  '/api/claim-issue-number':       { success: true, issueNumber: 1 },
  '/api/refund-fortune':           { success: true },
  '/api/grant-welcome-milestone':  { success: true },
  '/api/record-legal-acceptance':  { success: true },
};
const IMAGE_ROUTES = /\/api\/(image|bfl-kontext|visualize-flux|grok-image|dashscope-image|img-proxy|cine-styled-manifest|mouth-approve|verify-anatomy)\b/;
const MODEL_ROUTES = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/;

// ── ROLE CLASSIFICATION — sys/user signature + stack, merged from _scene1_call_census.mjs and
// _tiered_provider_policy_control.mjs's classifyModelCall, PLUS new CG-path signatures.
function classify(url, body, stack) {
  const route = url.split('?')[0];
  const s = stack || '';
  const mt = body?.max_tokens, temp = body?.temperature;
  const sysMsg = String((body?.messages?.find(m => m.role === 'system') || {}).content || '');
  const usrMsg = String((body?.messages?.find(m => m.role === 'user') || {}).content || '');

  // CG-path signatures (new — these did not exist in the literary-forced census)
  if (/screenplay-native cinematic-romance writer/.test(sysMsg)) return { role: 'CG_SCREENPLAY', evidence: 'sys signature "screenplay-native cinematic-romance writer"' };
  if (/opening an intimate dialogue/.test(sysMsg)) return { role: 'OAS_DIALOGUE', evidence: 'sys signature "opening an intimate dialogue"' };

  if (route === '/api/proxy' && /scene-structure planner for the OPENING scene/.test(sysMsg)) {
    if (/Your previous response had one or more fields that failed validation/.test(usrMsg)) return { role: 'OPENING_PLANNER_REPAIR', evidence: 'sys+usr signature' };
    return { role: 'OPENING_PLANNER', evidence: 'sys signature' };
  }
  if (route === '/api/proxy' && /ARCHITECTURE LAWS/.test(sysMsg)) return { role: 'AUTHOR', evidence: 'sys signature (literary prose author)' };

  if (mt === 2500 && temp === 0.6) return { role: 'PC_BODY_BIBLE', evidence: 'max_tokens=2500 temp=0.6' };
  if (mt === 3000 && temp === 0.6) return { role: 'LI_BODY_BIBLE', evidence: 'max_tokens=3000 temp=0.6' };
  if (mt === 1100 && temp === 0.65) return { role: 'ANTAGONIST_BODY_BIBLE', evidence: 'max_tokens=1100 temp=0.65' };
  if (mt === 600 && temp === 0.97) return { role: (/\bli\b bible|romance li bible/i.test(sysMsg) ? 'LI' : 'PC') + '_PHYSICAL_CANON_DECALCIFY', evidence: 'max_tokens=600 temp=0.97' };
  if (mt === 800 && temp === 0.98) return { role: (/\bli\b bible|romance li bible/i.test(sysMsg) ? 'LI' : 'PC') + '_BEHAVIORAL_CANON_DECALCIFY', evidence: 'max_tokens=800 temp=0.98' };
  if (mt === 300 && temp === 0.9) return { role: 'PC_CRISIS_REROLL', evidence: 'max_tokens=300 temp=0.9' };
  if (mt === 500 && temp === 0.9) return { role: 'PC_BODY_TELL_REROLL', evidence: 'max_tokens=500 temp=0.9' };
  if (route === '/api/proxy' && mt === 220 && temp === 0.95) return { role: 'EDITORIAL_PASS', evidence: 'max_tokens=220 temp=0.95' };
  if (mt === 1800 && temp === 0.55) return { role: 'PAIR_BOND', evidence: 'max_tokens=1800 temp=0.55' };
  if (mt === 1200 && temp === 0.6 && /_generateRPlot|_ensureRPlot/.test(s)) return { role: 'R_PLOT', evidence: 'stack _generateRPlot/_ensureRPlot' };
  if (mt === 500 && temp === 0.3 && /_auditWoundLIIntegration/.test(s)) return { role: 'WOUND_LI_INTEGRATION_AUDIT', evidence: 'stack _auditWoundLIIntegration' };
  if (mt === 2000 && temp === 0.7 && /_buildCGScaffold|_ensureCGScaffold|_runEnsureCGScaffold/.test(s)) return { role: 'CG_SCAFFOLD', evidence: 'stack _buildCGScaffold/_ensureCGScaffold' };
  if (route === '/api/proxy' && mt === 900 && temp === 0.8 && /_grokLiteraryAuthor/.test(s) && !/_grokAuthor\b/.test(s)) return { role: 'GROK_DECALC_EDITOR', evidence: 'stack _grokLiteraryAuthor (de-calc editor)' };
  if (route === '/api/chatgpt-proxy' && mt === 900 && temp === 0.3) return { role: 'GROK_DECALC_EDITOR_FALLBACK', evidence: 'gpt-4o-mini fallback' };
  if (route === '/api/mistral-proxy' && mt === 2400 && temp === 0.2 && /_mistralRepairPass/.test(s)) return { role: 'MECHANICAL_REPAIR', evidence: 'stack _mistralRepairPass' };
  if (route === '/api/chatgpt-proxy' && mt === 2400 && temp === 0.2) return { role: 'MECHANICAL_REPAIR_FALLBACK', evidence: 'gpt-4o-mini fallback' };
  if (route === '/api/proxy' && mt === 110 && temp === 0.85) return { role: 'PREWRITE_HINT_EXPANSION', evidence: 'max_tokens=110 temp=0.85' };
  if (route === '/api/chatgpt-proxy' && mt === 400 && temp === 0.4) return { role: 'VOICE_ANCHOR', evidence: 'max_tokens=400 temp=0.4' };
  if (route === '/api/mistral-proxy' && mt === 1500 && temp === 0.2 && /_targetedSceneEdit|_cheapLineEdit/.test(s)) return { role: 'LI_DESC_PROSE_REPAIR', evidence: 'stack _targetedSceneEdit' };
  if (route === '/api/chatgpt-proxy' && mt === 400 && temp === 0.2 && /_auditPost|_extractAndRecordScene1SignaturePhrases/.test(s)) return { role: 'SIGNATURE_PHRASE_AUDIT', evidence: 'stack _extractAndRecordScene1SignaturePhrases' };
  if (mt === 800 && temp === 0.2 && /_extractCharacterDisclosure/.test(s)) return { role: 'CHARACTER_DISCLOSURE_EXTRACTION', evidence: 'stack _extractCharacterDisclosure' };

  return null; // truly unknown — will be blocked and its stack captured
}

const inventory = [];      // every /api/** request seen, in order
const blockedUnknown = []; // unclassified requests — blocked, never forwarded
const roleLog = [];        // every matched request with role+trigger+blocking info
let cgScreenplayCaptured = null;
let authorCaptured = null;
let oasDialogueCaptured = null;
let cgScaffoldCaptured = null;
const imageCalls = [];

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
const consoleLines = [];
page.on('console', m => consoleLines.push(m.text()));

// ── STACK-CAPTURE (identical mechanism to _scene1_call_census.mjs) ──
const stackById = new Map();
await page.exposeFunction('__reportCensusCall', (id, info) => { stackById.set(id, info); });
await page.addInitScript(() => {
  const realFetch = window.fetch;
  let seq = 0;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (/\/api\//.test(url) && !/\/api\/(config|geo|csp-report|beta-events)/.test(url)) {
        const id = 'g' + (++seq) + '-' + Date.now();
        const stack = (new Error().stack || '').split('\n').slice(1, 14).join(' | ');
        init = Object.assign({}, init);
        const h = new Headers(init.headers || {});
        h.set('x-census-id', id);
        init.headers = h;
        window.__reportCensusCall(id, { url, stack });
        return realFetch.call(this, input, init);
      }
    } catch (_) {}
    return realFetch.call(this, input, init);
  };
});

await installSession(page);
await page.route('**/sb-test.localhost/**', route => {
  const accept = route.request().headers()['accept'] || '';
  const single = /vnd\.pgrst\.object\+json/.test(accept);
  return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
});
await installEntitledProfileStub(page, { log: () => {} });

await page.route('**/api/**', async route => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  const p = url.split('?')[0];
  inventory.push({ url, method: req.method(), t: Date.now() });

  if (PASSTHROUGH.test(url)) {
    if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  }
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  if (/\/api\/verify-subscription\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) });
  const stub = Object.keys(LOCAL_STUB).find(x => p.startsWith(x));
  if (stub) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL_STUB[stub]) });

  if (IMAGE_ROUTES.test(p)) {
    // Do NOT abort — Roman wants image/panel requests CAPTURED, not hidden. Log role + stack +
    // the FULL body (prompt/context/intent) so each of the 36 calls can be individually
    // distinguished (which mouth STATE, which context) rather than aggregated.
    const censusId = req.headers()['x-census-id'];
    const stackInfo = censusId ? stackById.get(censusId) : null;
    const stack = stackInfo ? stackInfo.stack : '(no stack captured)';
    let imgBody = null;
    try { imgBody = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const promptText = String(imgBody?.prompt || '');
    const exprMatch = promptText.match(/EXPRESSION:\s*([^.]+)\./);
    const contextMatch = promptText.match(/context:\s*['"]?([\w-]+)/i);
    imageCalls.push({ url, prompt: promptText, tier: imgBody?.tier, costTier: imgBody?.costTier,
      context: imgBody?.context, intent: imgBody?.intent, expression: exprMatch ? exprMatch[1].trim() : null,
      stack, t: Date.now() });
    roleLog.push({ role: 'IMAGE/PANEL:' + p, url, blocking: 'confirmed non-blocking (see report)', stack, t: Date.now() });
    console.log('[IMAGE] ' + p + '  expr=' + (exprMatch ? exprMatch[1].trim().slice(0,40) : '?') + '  context=' + imgBody?.context + '  stack: ' + stack.replace(/\n/g, ' | ').slice(0, 200));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', success: true }) });
  }
  if (!MODEL_ROUTES.test(p)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });

  let body = null;
  try { body = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const censusId = req.headers()['x-census-id'];
  const stackInfo = censusId ? stackById.get(censusId) : null;
  const stack = stackInfo ? stackInfo.stack : '(no stack captured — fetch wrapper missed this call)';

  const match = classify(p, body, stack);
  if (!match) {
    const rec = { url, model: body?.model, max_tokens: body?.max_tokens, temperature: body?.temperature,
      sysHead: String((body?.messages?.find(m => m.role === 'system') || {}).content || '').slice(0, 200),
      usrHead: String((body?.messages?.find(m => m.role === 'user') || {}).content || '').slice(0, 200), stack };
    // ── KEEP THE WHOLE BODY, NOT A 200-CHAR HEAD (2026-10-28) ──
    // An undeclared call is still a real outgoing request built by real source. Recording only
    // sysHead/usrHead meant the CG path's author-scale calls — the three _authorFullScenePolicy
    // tiers reached through the OAS Say/Do entrance — left nothing that could be checked against
    // the prompt source. The full system+user text is written per call so a later check reads the
    // request that was actually assembled. Still blocked: nothing is forwarded.
    const _un = blockedUnknown.length;
    const _sys = String((body?.messages?.find(m => m.role === 'system') || {}).content || '');
    const _usr = String((body?.messages?.find(m => m.role === 'user') || {}).content || '');
    rec.dump = `undeclared_${_un}_${p.replace(/[^a-z0-9]+/gi, '_')}.txt`;
    rec.sysLen = _sys.length; rec.usrLen = _usr.length;
    try {
      fs.writeFileSync(DIR + '/' + rec.dump,
        `=== UNDECLARED MODEL CALL (BLOCKED, NOT FORWARDED)\n=== url=${url} model=${body?.model} `
        + `max_tokens=${body?.max_tokens} temperature=${body?.temperature}\n=== stack: ${stack}\n\n`
        + `=== SYSTEM (${_sys.length} chars) ===\n${_sys}\n\n=== USER (${_usr.length} chars) ===\n${_usr}\n`);
    } catch (_) {}
    blockedUnknown.push(rec);
    console.error('[UNDECLARED] ' + url + ' mt=' + body?.max_tokens + ' t=' + body?.temperature
      + ' sys=' + _sys.length + ' usr=' + _usr.length + ' -> ' + rec.dump);
    console.error('             stack: ' + stack.replace(/\n/g, ' | '));
    return route.fulfill({ status: 599, contentType: 'application/json', body: JSON.stringify({ error: 'UNDECLARED_MODEL_ROLE', blocked: true }) });
  }

  roleLog.push({ role: match.role, url, model: body?.model, max_tokens: body?.max_tokens, temperature: body?.temperature, evidence: match.evidence, stack, t: Date.now() });
  console.log('[ROLE] ' + match.role + '  ' + p + '  mt=' + body?.max_tokens + ' t=' + body?.temperature);
  console.log('       stack: ' + stack.replace(/\n/g, ' | ').slice(0, 300));

  if (match.role === 'CG_SCREENPLAY' && !cgScreenplayCaptured) {
    cgScreenplayCaptured = { request: body, stack, route: p };
    fs.writeFileSync(DIR + '/cg_screenplay_full.json', JSON.stringify(body, null, 2));
    fs.writeFileSync(DIR + '/cg_screenplay_system.txt', String((body?.messages || []).find(m => m.role === 'system')?.content || ''));
    fs.writeFileSync(DIR + '/cg_screenplay_user.txt', String((body?.messages || []).find(m => m.role === 'user')?.content || ''));
  }
  if (match.role === 'AUTHOR' && !authorCaptured) {
    authorCaptured = { request: body, stack, route: p };
    fs.writeFileSync(DIR + '/author_full.json', JSON.stringify(body, null, 2));
  }
  if (match.role === 'OAS_DIALOGUE' && !oasDialogueCaptured) {
    oasDialogueCaptured = { request: body, stack, route: p };
    fs.writeFileSync(DIR + '/oas_dialogue_full.json', JSON.stringify(body, null, 2));
    fs.writeFileSync(DIR + '/oas_dialogue_system.txt', String((body?.messages || []).find(m => m.role === 'system')?.content || ''));
    fs.writeFileSync(DIR + '/oas_dialogue_user.txt', String((body?.messages || []).find(m => m.role === 'user')?.content || ''));
  }
  if (match.role === 'CG_SCAFFOLD' && !cgScaffoldCaptured) {
    cgScaffoldCaptured = { request: body, stack, route: p };
    fs.writeFileSync(DIR + '/cg_scaffold_full.json', JSON.stringify(body, null, 2));
  }

  // Generic, minimal valid fixtures — good enough to let the pipeline proceed; content quality is
  // irrelevant here, only WHICH roles fire and WHAT their real request payload contains matters.
  const route_ = p;
  const openaiShape = (t) => JSON.stringify({ content: t, usage: { prompt_tokens: 100, completion_tokens: 100 } });
  const grokShape = (t) => JSON.stringify({ choices: [{ message: { content: t } }], usage: { prompt_tokens: 100, completion_tokens: 100, cost_in_usd_ticks: 0 } });
  const mistralShape = (t) => JSON.stringify({ choices: [{ message: { content: t } }], usage: { prompt_tokens: 100, completion_tokens: 100 } });
  const shapeFor = (t) => route_ === '/api/chatgpt-proxy' ? openaiShape(t) : route_ === '/api/proxy' ? grokShape(t) : mistralShape(t);

  let respText;
  if (match.role === 'CG_SCREENPLAY') {
    respText = JSON.stringify({ panels: [{ narration: 'The gossamer band sits loose across her mouth.', dialogue: null, image_directive: 'ritual clearing, ceremonial light' }] });
  } else if (match.role === 'OAS_DIALOGUE') {
    respText = JSON.stringify({ li_dialogue: 'placeholder', li_action: 'placeholder', face_state: 'intent', scene_state: 'building', release_state: 'none' });
  } else if (match.role === 'OPENING_PLANNER' || match.role === 'OPENING_PLANNER_REPAIR') {
    respText = JSON.stringify({ opening_spine: { pressure_source_type: 'moral', pressure_source: 'a redirected rite', opening_beat: 'she presses her palm flat against the band', rising_beats: ['x', 'y'], decision_beat: 'tear the band or stay bound?', staged_characters: [{ name: 'Lirael', presence: 'IN_PERSON' }], scene_skeleton: { pc_opening_fusion: { character: 'Lirael', beat: 'I press my palm flat against the {TARGET} as the words land.' } } } });
  } else if (match.role === 'AUTHOR') {
    respText = 'The gossamer band sits loose across my mouth. I press my palm flat against it as Seren’s words land, and the ritual clearing goes very still.';
  } else if (match.role === 'PC_BODY_BIBLE' || match.role === 'LI_BODY_BIBLE' || match.role === 'ANTAGONIST_BODY_BIBLE' || match.role === 'PAIR_BOND' || match.role === 'R_PLOT' || match.role === 'WOUND_LI_INTEGRATION_AUDIT' || match.role === 'CG_SCAFFOLD' || match.role === 'CHARACTER_DISCLOSURE_EXTRACTION') {
    respText = JSON.stringify({ ok: true, placeholder: true, core_contradiction: 'x', wound: { core: 'x' }, current_crisis: { event: 'x' }, coreTension: 'x', escalationAxis: 'trust', verdict: 'INTEGRATED', integration_mode: 'INTERACTION', runThesis: 'x', issueArcs: [] });
  } else if (/DECALCIFY|REROLL/.test(match.role)) {
    respText = JSON.stringify({ signature_feature: 'x' });
  } else if (match.role === 'GROK_DECALC_EDITOR' || match.role === 'GROK_DECALC_EDITOR_FALLBACK') {
    respText = '[]';
  } else if (match.role === 'MECHANICAL_REPAIR' || match.role === 'MECHANICAL_REPAIR_FALLBACK' || match.role === 'LI_DESC_PROSE_REPAIR') {
    respText = 'The gossamer band sits loose across my mouth. I press my palm flat against it as Seren’s words land.';
  } else if (match.role === 'PREWRITE_HINT_EXPANSION') {
    respText = 'She says it plainly.';
  } else if (match.role === 'VOICE_ANCHOR') {
    respText = 'A controlled, present-tense first-person voice.';
  } else if (match.role === 'SIGNATURE_PHRASE_AUDIT' || match.role === 'EDITORIAL_PASS') {
    respText = '{}';
  } else {
    respText = '{}';
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: shapeFor(respText) });
});

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

console.log('\n' + '='.repeat(92) + '\nGROUND-TRUTH, ZERO-PROVIDER CG CENSUS — FIRST SACRIFICE, REAL CLICK PATH, NO MODE OVERRIDE\n' + '='.repeat(92) + '\n');

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

// ── STEP 2: derive EXPECTED engine from the REAL, LIVE window.STARTER_STORIES — never hardcoded.
const expected = await page.evaluate(() => {
  const list = Array.isArray(window.STARTER_STORIES) ? window.STARTER_STORIES : Object.values(window.STARTER_STORIES || {});
  const def = list.find(d => d && d.id === 'starter_first_sacrifice');
  return def ? { render_mode: def.render_mode || null, launchKind: def.launchKind || null, found: true } : { found: false };
});
ok('First Sacrifice STARTER_STORIES entry found', expected.found, JSON.stringify(expected));
console.log('  [EXPECTED] render_mode (live from app) = ' + JSON.stringify(expected.render_mode));
if (!expected.found) { await browser.close(); process.exit(1); }

// ── DISMISS THE CHROME THAT NOW SITS OVER THE MENU (2026-10-28) ──
// This harness predates the splash overlay and the promo dev banner, both of which intercept
// pointer events on #burgerBtn: Playwright reported "<img id=splashTitle …> from
// <div id=splashOverlay> subtree intercepts pointer events", then the same for
// <button data-promo-action=dismiss> in #promoDevBanner, and the click timed out. They are
// dismissed through the page's OWN controls where one exists, and otherwise hidden — no state
// writes, no mode override, and the launch sequence below is unchanged.
await page.evaluate(() => {
  try { document.querySelector('#promoDevBanner [data-promo-action="dismiss"]')?.click(); } catch (_) {}
  for (const sel of ['#splashOverlay', '#promoDevBanner']) {
    try { const el = document.querySelector(sel); if (el) el.style.display = 'none'; } catch (_) {}
  }
});
await page.waitForTimeout(300);

// ── STEP 1: launch ONLY via the real Library -> Read -> baked OAS -> Go path. NO state writes. ──
const burgerVisible = await page.evaluate(() => { const b = document.getElementById('burgerBtn'); return !!(b && b.getClientRects().length > 0); });
if (burgerVisible) {
  await page.click('#burgerBtn'); await page.waitForTimeout(400);
  await page.click('.vault-tab[data-vault-section="Account"]'); await page.waitForTimeout(300);
  await page.click('#menuLibraryBtn'); await page.waitForTimeout(1200);
}
const bookInfo = await page.evaluate(() => {
  const el = document.querySelector('.library-book[data-story-id="starter_first_sacrifice"]');
  return el ? { found: true, rectN: el.getClientRects().length } : { found: false };
});
ok('shelf book visible', bookInfo.found && bookInfo.rectN > 0, JSON.stringify(bookInfo));
if (!(bookInfo.found && bookInfo.rectN > 0)) { await browser.close(); process.exit(1); }

await page.click('.library-book[data-story-id="starter_first_sacrifice"]');
await page.waitForTimeout(800);
await page.click('#zoomReadBtn');
await page.waitForTimeout(4000);
// ── TWO ENTRANCE AFFORDANCES, NOT ONE (2026-10-06 product change) ──
// This harness drove #bakedOASEnterBtn, the standalone "Continue". app.js:152702 now renders
// that ONLY for packages without `oasHandoff.oasEntrance`; where the entrance is declared, the
// authored page ends on an open question and the reader's own Say/Do submission IS the OAS's
// first turn (#bakedOASSay / #bakedOASDo / #bakedOASSubmitBtn, app.js:152728). First Sacrifice
// now declares one, so the old button is never in the DOM and the run stopped before any CG
// request was made. Whichever affordance the package actually renders is used; a package with
// neither is still a hard failure.
const entrance = await page.evaluate(() => {
  const vis = (id) => { const el = document.getElementById(id); return !!(el && el.getClientRects().length > 0); };
  if (vis('bakedOASEnterBtn')) return 'continue';
  if (vis('bakedOASSubmitBtn')) return 'sayDo';
  return null;
});
console.log('  [ENTRANCE] baked OAS entrance affordance = ' + JSON.stringify(entrance));
const oasBtnVisible = !!entrance;
// OBSERVE THE PAGE BEFORE GUESSING AT A NEW SELECTOR. When the entry button is not visible,
// dump what IS on screen — whether the element is absent or merely hidden, and every visible
// button id/text — so the next step is read off the real DOM instead of another guess.
if (!oasBtnVisible) {
  const diag = await page.evaluate(() => {
    const el = document.getElementById('bakedOASEnterBtn');
    const vis = (n) => n.getClientRects().length > 0;
    return {
      entryBtn: el ? { present: true, visible: vis(el),
        display: getComputedStyle(el).display, visibility: getComputedStyle(el).visibility,
        parentHidden: !!(el.closest('[hidden]') || el.closest('.hidden')),
        parentId: el.parentElement && el.parentElement.id } : { present: false },
      visibleButtons: [...document.querySelectorAll('button,[role="button"]')].filter(vis)
        .slice(0, 40).map((b) => ({ id: b.id || null, cls: b.className || null,
          txt: (b.textContent || '').trim().slice(0, 40) })),
      overlays: [...document.querySelectorAll('[class*=overlay],[class*=modal],[id*=Overlay],[id*=Modal]')]
        .filter(vis).map((o) => o.id || o.className).slice(0, 15),
      zoomOpen: !!document.querySelector('.library-zoom, #libraryZoom, [class*=zoom]'),
    };
  });
  fs.writeFileSync(DIR + '/oas_entry_diag.json', JSON.stringify(diag, null, 2));
  console.log('  [DIAG] wrote ' + DIR + '/oas_entry_diag.json');
  console.log('  [DIAG] entryBtn: ' + JSON.stringify(diag.entryBtn));
  console.log('  [DIAG] overlays: ' + JSON.stringify(diag.overlays));
}
ok('baked OAS entrance affordance visible', oasBtnVisible, JSON.stringify({ entrance }));
if (!oasBtnVisible) { await browser.close(); process.exit(1); }

if (entrance === 'continue') {
  await page.click('#bakedOASEnterBtn');
} else {
  // The reader's answer to the authored page's open question. This is the OAS's first turn, so
  // it is a real submission through the product's own control — not a state write.
  await page.fill('#bakedOASDo', 'she stays where she is and lets him finish the question');
  await page.click('#bakedOASSubmitBtn');
}
await page.waitForTimeout(1000);
const goBtnVisible = await page.evaluate(() => { const el = document.getElementById('buGoBtn'); return !!(el && el.getClientRects().length > 0); });
ok('Genesis gate #buGoBtn visible', goBtnVisible);
if (!goBtnVisible) { await browser.close(); process.exit(1); }

await page.click('#buGoBtn');
let unlocked = false;
for (let i = 0; i < 240 && !unlocked; i++) { await page.waitForTimeout(1000); unlocked = consoleLines.some(l => /\[BAKED:GATE\] Genesis unlocked/.test(l)); }
ok('Genesis charge completes ("[BAKED:GATE] Genesis unlocked")', unlocked, unlocked ? '' : 'timed out; last 30 lines: ' + JSON.stringify(consoleLines.slice(-30)));
await dismissPcLookModalIfOpen(page);
// Wait further past unlock — the baked comment says the caller's resume ("generate Scene 2, open
// the OAS") starts only after init finishes; give that resume time to fire any CG-panel/OAS calls.
await page.waitForTimeout(8000);

// ── STEP 2 (assertion): what engine ACTUALLY ran, read live from state. FAIL LOUD on mismatch. ──
const actual = await page.evaluate(() => ({
  currentEngine: window.state ? window.state.currentEngine : null,
  renderMode: window.state ? window.state.renderMode : null,
  bakedSetupOnly: window.state ? !!window.state._bakedSetupOnly : null,
  bakedSetupComplete: window.state ? !!window.state._bakedSetupComplete : null,
  bakedSetupRunning: window.state ? !!window.state._bakedSetupRunning : null,
}));
console.log('  [ACTUAL] ' + JSON.stringify(actual));
const engineMatches = expected.render_mode ? (actual.renderMode === expected.render_mode) : (actual.renderMode === 'literary' || actual.renderMode == null);
ok('ACTUAL engine matches EXPECTED (from live STARTER_STORIES, no override) — HARD REQUIREMENT', engineMatches,
  'expected.render_mode=' + JSON.stringify(expected.render_mode) + ' actual.renderMode=' + JSON.stringify(actual.renderMode));
if (!engineMatches) {
  console.error('\n*** FAIL LOUD: engine mismatch. Expected render_mode=' + expected.render_mode + ', got state.renderMode=' + actual.renderMode + '. This harness refuses to report a manifest under a mismatched/overridden mode. ***\n');
}

const err = await page.evaluate(() => window.__err || null);
await browser.close();

fs.writeFileSync(DIR + '/imageCalls.json', JSON.stringify(imageCalls, null, 2));
fs.writeFileSync(DIR + '/roleLog.json', JSON.stringify(roleLog, null, 2));
fs.writeFileSync(DIR + '/blockedUnknown.json', JSON.stringify(blockedUnknown, null, 2));
fs.writeFileSync(DIR + '/consoleLines.json', JSON.stringify(consoleLines, null, 2));
fs.writeFileSync(DIR + '/expected_vs_actual.json', JSON.stringify({ expected, actual }, null, 2));

console.log('\n' + '-'.repeat(92));
console.log(' expected render_mode : ' + expected.render_mode);
console.log(' actual renderMode    : ' + actual.renderMode + '  (currentEngine=' + actual.currentEngine + ', bakedSetupComplete=' + actual.bakedSetupComplete + ')');
console.log(' page error           : ' + (err || 'none'));
console.log(' roles observed       : ' + roleLog.length + '  (' + [...new Set(roleLog.map(r => r.role))].join(', ') + ')');
console.log(' UNDECLARED blocked   : ' + blockedUnknown.length);
blockedUnknown.forEach((b, i) => { console.log('   [' + i + '] ' + b.url + ' mt=' + b.max_tokens + ' t=' + b.temperature); console.log('       stack: ' + b.stack.replace(/\n/g, ' | ').slice(0, 500)); });
console.log(' CG_SCREENPLAY captured : ' + (cgScreenplayCaptured ? 'YES -> ' + DIR + '/cg_screenplay_full.json' : 'NO'));
console.log(' AUTHOR captured        : ' + (authorCaptured ? 'YES -> ' + DIR + '/author_full.json' : 'NO'));
console.log('\n artifacts -> ' + DIR + '/\n');

const allPass = results.every(r => r.pass);
console.log(`\nRESULT: ${results.filter(r=>r.pass).length}/${results.length} checks passed. Manifest ${allPass ? 'IS' : 'is NOT'} trustworthy (engine assertion ${engineMatches ? 'held' : 'FAILED'}).`);
process.exit(allPass ? 0 : 1);
