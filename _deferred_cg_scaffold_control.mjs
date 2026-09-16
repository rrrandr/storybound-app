// DEFERRED CG SCAFFOLD — outbound-stubbed, real-click control (Roman, 2026-09-16)
//
// Proves the two-part fix: (1) handleBeginStory's baked-setup-only run no longer awaits
// _ensureCGScaffold (public/app.js, gated on state._bakedSetupOnly); (2) _advanceStagedScene now
// fires it once, idempotently guarded, immediately after the reader's Submit actually records
// their posture — the real "immediately before Scene-2 CG continuation needs it" point.
//
// Real Library -> Read -> Genesis -> OAS launch (same proven sequence as
// _cg_ground_truth_census.mjs / _baked_oas_mouth_prebatch_disabled_control.mjs). The interruption
// UI is reached by mounting it directly from the REAL baked oasHandoff data already in state
// (window._mountIntimateInterruption is already window-exposed for this exact purpose) — this
// bypasses only the separately-tested live intimacy-dialogue-turn mechanism, never the mechanism
// under test here (card click / Say-Do / Submit / deferred scaffold). From that point on, every
// interaction (card click, typing, Submit click) is a REAL DOM click/input against the REAL
// rendered controls — this is a runtime proof, not an inference from source.
//
// usage: node _deferred_cg_scaffold_control.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import { installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody } from './_test_session_env.mjs';

const DIR = '_deferred_cg_scaffold_out';
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

function classify(sysMsg, usrMsg, stack) {
  const s = stack || '';
  if (/screenplay-native cinematic-romance writer/.test(sysMsg)) return 'CG_SCREENPLAY';
  if (/opening an intimate dialogue/.test(sysMsg)) return 'OAS_DIALOGUE';
  if (/_buildCGScaffold|_ensureCGScaffold|_runEnsureCGScaffold/.test(s)) return 'CG_SCAFFOLD';
  if (/uninhibited romance fiction author/.test(sysMsg) && /TEMPTATION \|\|\|/.test(usrMsg || '')) return 'fatePreviews';
  if (/SCENE-SPINE planner/.test(sysMsg) || /"hardBeats"/.test(sysMsg) || /_generateLiteraryPlotContract/.test(s)) return 'sceneSpine';
  return 'UNKNOWN';
}

// VALID FIXTURE — First Sacrifice's real reserved events / aftermath truths (confirmed via a real
// [OBJECTIVE:REJECTED] console line captured from an earlier run of this exact harness: "reserved
// event price_identified (scene 3): no status declared; reserved event inquiry_opened (scene 4):
// no status declared; reserved event julian_counter_wish (scene 16): no status declared; reserved
// event julian_obscuring_wishes (scene 16): no status declared; aftermath truth twist_manifested:
// no status declared; aftermath truth interrogation_interrupted: no status declared; aftermath
// truth the_answer_institutional: no status declared; aftermath truth inquiry_authority_claimed:
// no status declared") so the NORMAL path exercises real _validateLocalObjective acceptance
// instead of a guaranteed rejection/retry.
const VALID_SCENE_SPINE_REPLY = JSON.stringify({
  local_objective: 'Lirael answers the presiding Dohkar\'s challenge before the gathered assembly.',
  posture_read: 'defiant but composed — she will not let the accusation stand unanswered',
  present: ['Lirael'],
  local_objective_actor: 'Lirael',
  state_change: 'Lirael publicly answers the Dohkar\'s accusation in front of the assembly.',
  state_change_precondition: 'The Dohkar has just charged her with shaping and interfering.',
  forces_choice: 'whether she answers plainly or deflects',
  branch_a: 'she answers plainly, staking her credibility on the truth',
  branch_b: 'she deflects, buying time but looking evasive',
  reserved: { price_identified: 'untouched', inquiry_opened: 'untouched', julian_counter_wish: 'untouched', julian_obscuring_wishes: 'untouched' },
  aftermath: { twist_manifested: 'kept', interrogation_interrupted: 'kept', the_answer_institutional: 'kept', inquiry_authority_claimed: 'kept' },
});
const VALID_FATE_BATCH_TEXT = [
  'TEMPTATION ||| amplify ||| I close the distance between us ||| Don\'t make me wait.',
  'SILENCE ||| redirect ||| I let the look between us land ||| (no words)',
  'REVERSAL ||| amplify ||| I take her hand and hold it still ||| Stay there.',
  'BOUNDARY ||| ruin ||| I step back from the mark ||| Not yet.',
  'CONFESSION ||| amplify ||| I say the part I have not said ||| I haven\'t stopped thinking about this.',
].join('\n');

const inventory = [];
const modelOrImageRequests = []; // ANY request matching MODEL_ROUTES or IMAGE_ROUTES, timestamped+classified
let submitClickedAt = null;      // set the instant we click the real Submit button

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
const stackById = new Map();
await page.exposeFunction('__reportDeferCall', (id, info) => { stackById.set(id, info); });
await page.addInitScript(() => {
  const realFetch = window.fetch;
  let seq = 0;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (/\/api\//.test(url) && !/\/api\/(config|geo|csp-report|beta-events)/.test(url)) {
        const id = 'd' + (++seq) + '-' + Date.now();
        const stack = (new Error().stack || '').split('\n').slice(1, 14).join(' | ');
        init = Object.assign({}, init);
        const h = new Headers(init.headers || {});
        h.set('x-defer-id', id);
        init.headers = h;
        window.__reportDeferCall(id, { url, stack });
        return realFetch.call(this, input, init);
      }
    } catch (_) {}
    return realFetch.call(this, input, init);
  };
});
const consoleLines = [];
page.on('console', m => consoleLines.push(m.text()));

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

  if (IMAGE_ROUTES.test(p) || MODEL_ROUTES.test(p)) {
    const deferId = req.headers()['x-defer-id'];
    const stackInfo = deferId ? stackById.get(deferId) : null;
    const stack = stackInfo ? stackInfo.stack : '(no stack captured)';
    let body = null; try { body = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const sysMsg = String((body?.messages?.find(m => m.role === 'system') || {}).content || '');
    const usrMsg = String((body?.messages?.find(m => m.role === 'user') || {}).content || '');
    const role = IMAGE_ROUTES.test(p) ? 'IMAGE' : classify(sysMsg, usrMsg, stack);
    modelOrImageRequests.push({ url, role, kind: IMAGE_ROUTES.test(p) ? 'image' : 'model', t: Date.now(), beforeSubmit: submitClickedAt == null, stack: stack.slice(0, 300) });
    if (IMAGE_ROUTES.test(p)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'data:image/png;base64,x', success: true }) });
    let respText = '{}';
    if (role === 'OAS_DIALOGUE') respText = JSON.stringify({ li_dialogue: 'placeholder', li_action: 'placeholder', face_state: 'intent', scene_state: 'building', release_state: 'none' });
    else if (role === 'sceneSpine') respText = VALID_SCENE_SPINE_REPLY;
    else if (role === 'fatePreviews') respText = VALID_FATE_BATCH_TEXT;
    else respText = JSON.stringify({ ok: true, placeholder: true, runThesis: 'x', issueArcs: [], coreTension: 'x', escalationAxis: 'trust' });
    const grokShape = (t) => JSON.stringify({ choices: [{ message: { content: t } }], usage: { prompt_tokens: 100, completion_tokens: 100, cost_in_usd_ticks: 0 } });
    const mistralShape = (t) => JSON.stringify({ choices: [{ message: { content: t } }], usage: { prompt_tokens: 100, completion_tokens: 100 } });
    const openaiShape = (t) => JSON.stringify({ content: t, usage: { prompt_tokens: 100, completion_tokens: 100 } });
    const shapeFor = (t) => p === '/api/chatgpt-proxy' ? openaiShape(t) : p === '/api/proxy' ? grokShape(t) : mistralShape(t);
    return route.fulfill({ status: 200, contentType: 'application/json', body: shapeFor(respText) });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
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

console.log('\n' + '='.repeat(92) + '\nDEFERRED CG SCAFFOLD — real-click control\n' + '='.repeat(92) + '\n');

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
const bookInfo = await page.evaluate(() => {
  const el = document.querySelector('.library-book[data-story-id="starter_first_sacrifice"]');
  return el ? { found: true, rectN: el.getClientRects().length } : { found: false };
});
ok('shelf book visible', bookInfo.found && bookInfo.rectN > 0, JSON.stringify(bookInfo));
if (!(bookInfo.found && bookInfo.rectN > 0)) { await browser.close(); process.exit(1); }

await page.click('.library-book[data-story-id="starter_first_sacrifice"]');
await page.waitForTimeout(800);
const tReadClick = Date.now();
await page.click('#zoomReadBtn');
let proseVisibleAt = null;
for (let i = 0; i < 40; i++) {
  const visible = await page.evaluate(() => !!document.getElementById('bakedOASEnterBtn') && document.getElementById('bakedOASEnterBtn').getClientRects().length > 0);
  if (visible) { proseVisibleAt = Date.now(); break; }
  await page.waitForTimeout(200);
}
ok('baked Scene 1 prose / OAS entry button became visible', !!proseVisibleAt, proseVisibleAt ? ((proseVisibleAt - tReadClick) + 'ms after Read click') : 'never appeared');

await page.click('#bakedOASEnterBtn');
await page.waitForTimeout(1000);
const goBtnVisible = await page.evaluate(() => { const el = document.getElementById('buGoBtn'); return !!(el && el.getClientRects().length > 0); });
ok('Genesis gate #buGoBtn visible', goBtnVisible);
if (!goBtnVisible) { await browser.close(); process.exit(1); }

await page.click('#buGoBtn');
let unlocked = false;
for (let i = 0; i < 240 && !unlocked; i++) { await page.waitForTimeout(1000); unlocked = consoleLines.some(l => /\[BAKED:GATE\] Genesis unlocked/.test(l)); }
ok('Genesis charge completes ("[BAKED:GATE] Genesis unlocked")', unlocked, unlocked ? '' : 'timed out');
await dismissPcLookModalIfOpen(page);
await page.waitForTimeout(1500);

const _deferLogMatches = consoleLines.filter(l => /\[TIER0\] CG_SCAFFOLD deferred/.test(l));
ok('the deferred-scaffold log fired in handleBeginStory ("[TIER0] CG_SCAFFOLD deferred")',
  _deferLogMatches.length > 0, _deferLogMatches.length + ' matching line(s)');
// CG_SCAFFOLD is what THIS pass defers — asserted strictly. Other roles (OAS_DIALOGUE's
// fire-and-forget opener line) are PRE-EXISTING, untouched-by-this-pass behavior — reported
// honestly as a separate data point, never folded into a blanket "zero" claim this pass didn't
// actually deliver. Baking OAS_DIALOGUE/cards is separate canonical-package work, not done here.
const cgScaffoldBeforeMount = modelOrImageRequests.filter(r => r.role === 'CG_SCAFFOLD');
ok('ZERO CG_SCAFFOLD requests before the interruption is mounted (the thing THIS pass defers)', cgScaffoldBeforeMount.length === 0, JSON.stringify(cgScaffoldBeforeMount));
console.log('  [INFO] other requests observed before interruption mount (pre-existing, not addressed by this pass): ' + JSON.stringify(modelOrImageRequests.map(r => r.role + ':' + r.url)));

// ── Mount the REAL interruption UI directly from the REAL baked oasHandoff data already in
// state — bypassing only the separately-tested live intimacy-dialogue-turn mechanism, never the
// card/Say-Do/Submit/deferred-scaffold behavior this control actually exercises.
const mountResult = await page.evaluate(() => {
  const pkg = (typeof window._bakedScene1For === 'function') ? window._bakedScene1For(window.state._starterId) : null;
  const oh = pkg && pkg.oasHandoff;
  if (!oh || !oh.interruption) return { ok: false, reason: 'no pkg.oasHandoff.interruption in the real baked package', pkgFound: !!pkg, oasHandoffFound: !!oh };
  // Mirror exactly what the REAL _resolveIntimacyScene does right before mounting the
  // interruption in production (public/app.js ~197617: "state.intimacyDialogue = null;") — without
  // this, _advanceStagedScene's own intimacy-turn-consumption guard intercepts Submit and routes
  // it into ANOTHER live OAS turn instead of the deferred-scaffold path this control tests.
  window.state.intimacyDialogue = null;
  window._mountIntimateInterruption({ host: 'auto', frame: { interruption: oh.interruption, interruptionImage: oh.interruptionImage, interruptionExchange: Array.isArray(oh.interruptionExchange) ? oh.interruptionExchange : [] }, sceneNum: 1 });
  return { ok: true };
});
ok('real baked interruption frame found and mounted', mountResult.ok, JSON.stringify(mountResult));
await page.waitForTimeout(500);

const interrVisible = await page.evaluate(() => !!document.getElementById('intimateInterruption'));
ok('interruption UI actually rendered in the DOM', interrVisible);

// ── CARD CLICK — real DOM click on a real rendered card. Must fill Say/Do, never advance. ──
const beforeCardClickCount = modelOrImageRequests.length;
await page.waitForTimeout(1200); // let the async five-card preview batch attempt land (stubbed, harmless)
const cardSlots = await page.evaluate(() => Array.from(document.querySelectorAll('[data-fate-card-slot]')).map(el => el.getAttribute('data-fate-card-slot')));
ok('exactly 5 fate cards rendered', cardSlots.length === 5, JSON.stringify(cardSlots));

await page.click('[data-fate-card-slot="temptation"]');
await page.waitForTimeout(300);
const afterCardClick = await page.evaluate(() => {
  const a = document.getElementById('gnActionInput'), d = document.getElementById('gnDialogueInput');
  return { actionVal: a ? a.value : null, dialogueVal: d ? d.value : null, submitted: !!(window.state && window.state._intimateInterruption && window.state._intimateInterruption.submitted) };
});
ok('card click filled the Say/Do draft (editable), did not submit', !!(afterCardClick.actionVal || afterCardClick.dialogueVal) && afterCardClick.submitted === false, JSON.stringify(afterCardClick));
ok('card click made ZERO provider requests', modelOrImageRequests.length === beforeCardClickCount, JSON.stringify(modelOrImageRequests.slice(beforeCardClickCount)));

// ── CUSTOM SAY/DO — overwrite the draft with the reader's own words, no card needed. ──
const customAction = 'I step back from the mark and do not answer him yet.';
const customDialogue = 'You already know I did not shape it. Ask the Dohkar why he needed someone to blame before the wound even cooled.';
await page.fill('#gnActionInput', customAction);
await page.fill('#gnDialogueInput', customDialogue);
const filledVals = await page.evaluate(() => ({ a: document.getElementById('gnActionInput').value, d: document.getElementById('gnDialogueInput').value }));
// FINDING (pre-existing app behavior, not introduced by this pass): the dialogue input
// auto-wraps its value in smart/curly quotes on fill/input — the action field does not. Strip a
// matching leading/trailing quote pair (straight or curly) before comparing content.
const stripQuotes = (s) => String(s || '').replace(/^["“]([\s\S]*)["”]$/, '$1');
ok('custom Say/Do accepted without selecting a card (content match; dialogue auto-quote-wrapping is a pre-existing app behavior, not stripped content)',
  filledVals.a === customAction && stripQuotes(filledVals.d) === customDialogue, JSON.stringify(filledVals));

// ── SUBMIT — the ONLY action that may advance. Proves: posture persisted verbatim, THEN (and
// only then) the deferred scaffold work is permitted to begin. ──
const beforeSubmitCount = modelOrImageRequests.length;
submitClickedAt = Date.now();
await page.click('#gnSubmitBtn');
await page.waitForTimeout(3000);

const postureRecord = await page.evaluate(() => {
  const s = window.state || {};
  return {
    interruptionSubmitted: !!(s._intimateInterruption && s._intimateInterruption.submitted),
    interruptionAction: s._intimateInterruption ? s._intimateInterruption.action : null,
    interruptionDialogue: s._intimateInterruption ? s._intimateInterruption.dialogue : null,
    sceneDecision: s._sceneDecisions ? s._sceneDecisions['1'] : null,
  };
});
ok('Submit persisted the EXACT entered text (action) as the recorded posture', postureRecord.interruptionAction === customAction, JSON.stringify(postureRecord));
ok('Submit persisted the EXACT entered text (dialogue) as the recorded posture (content match; see auto-quote-wrapping finding above)', stripQuotes(postureRecord.interruptionDialogue) === customDialogue, JSON.stringify(postureRecord));
ok('the interruption record is marked submitted', postureRecord.interruptionSubmitted === true, JSON.stringify(postureRecord));
ok('a scene-1 posture decision was recorded (source=interruption_submit path)', !!postureRecord.sceneDecision, JSON.stringify(postureRecord.sceneDecision));

const cgScaffoldAfterSubmit = modelOrImageRequests.filter(r => r.role === 'CG_SCAFFOLD' && !r.beforeSubmit);
const cgScaffoldBeforeSubmit = modelOrImageRequests.filter(r => r.role === 'CG_SCAFFOLD' && r.beforeSubmit);
ok('ZERO CG_SCAFFOLD requests fired before Submit (the thing THIS pass defers)', cgScaffoldBeforeSubmit.length === 0, JSON.stringify(cgScaffoldBeforeSubmit));
ok('the deferred CG_SCAFFOLD work fired AFTER Submit — deferred, not deleted', cgScaffoldAfterSubmit.length > 0, JSON.stringify(cgScaffoldAfterSubmit));
console.log('  [INFO] full request list, role+timing: ' + JSON.stringify(modelOrImageRequests.map(r => r.role + ':' + r.url + ':' + (r.beforeSubmit ? 'before' : 'after') + 'Submit')));

const err = await page.evaluate(() => window.__err || null);
await browser.close();

fs.writeFileSync(DIR + '/modelOrImageRequests.json', JSON.stringify(modelOrImageRequests, null, 2));
fs.writeFileSync(DIR + '/consoleLines.json', JSON.stringify(consoleLines, null, 2));
fs.writeFileSync(DIR + '/postureRecord.json', JSON.stringify(postureRecord, null, 2));

console.log('\n' + '-'.repeat(92));
console.log(' page error            : ' + (err || 'none'));
console.log(' requests before Submit: ' + modelOrImageRequests.filter(r => r.beforeSubmit).length);
console.log(' requests after Submit : ' + modelOrImageRequests.filter(r => !r.beforeSubmit).length);
console.log(' full request list     : ' + JSON.stringify(modelOrImageRequests.map(r => r.kind + ':' + r.url)));
console.log('\n artifacts -> ' + DIR + '/\n');

const allPass = results.every(r => r.pass);
console.log(`\nDEFERRED CG SCAFFOLD CONTROL: ${results.filter(r=>r.pass).length}/${results.length} passed`);
process.exit(allPass ? 0 : 1);
