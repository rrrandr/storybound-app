// SCENE 3 NEEDS TWO READER INPUTS: IS SAY/DO ALONE ACTUALLY BLOCKED? (Roman 2026-11-18)
//
// Scene 2 ended on the Petition Fate reveal, so the Submit gate was pending when the save was
// written. Two arms, offline, against the preserved Scene 2 save:
//
//   RED   typed Say/Do only, Submit clicked  → must NOT advance; the petition modal reopens
//   GREEN petition sealed, then Say/Do, Submit → must advance, and the outgoing turn must carry
//         BOTH the sealed wish and the separate Say/Do
//
// The RED arm is why this is a separate check: the literary runner asserts that no modal
// intercepts the submit, which is exactly what a working gate does, so the runner would abort on
// the very behaviour being verified.
//
// Nothing is written by hand. The petition goes in through #petitionInput + #btnSealPetition and
// the turn through #submitBtn, and `state.fate.pendingPetition` is only ever READ back.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const ROOT = '/Users/romantsukerman/storybound-app/';
const SAVE = ROOT + '_ft_scene2_published/RESUMABLE_STATE.json';
const PORT = 3993;
const WISH = 'To hear Roman’s answer without the gala deciding what mine means.';
const DO = 'Hold my ground at the counter and ask for the footage.';
const SAY = 'Send me the uncut segment.';

let n = 0, bad = 0;
const ck = (nm, c, d) => { n += 1; if (!c) { bad += 1; console.log('  ✗ ' + nm + (d ? ('  — ' + String(d).slice(0, 300)) : '')); } else console.log('  ✓ ' + nm); };

// ── SERVE THE LOCAL BUILD ────────────────────────────────────────────────────────────────
const slog = ROOT + '_ft_scene3_gate_static.log';
try { fs.unlinkSync(slog); } catch (_) {}
const srv = spawn('node', [ROOT + '_ft_static_server.mjs'], { cwd: ROOT,
  env: Object.assign({}, process.env, { PORT: String(PORT) }) });
const sw = fs.createWriteStream(slog); srv.stdout.pipe(sw); srv.stderr.pipe(sw);
let up = false;
for (let i = 0; i < 60 && !up; i++) {
  await new Promise((r) => setTimeout(r, 250));
  let t = ''; try { t = fs.readFileSync(slog, 'utf8'); } catch (_) {}
  if (/listening|serving/i.test(t)) up = true; else if (/CANNOT BIND|EADDRINUSE/i.test(t)) break;
}
if (!up) { console.error('the static server did not bind ' + PORT); srv.kill('SIGTERM'); process.exit(2); }

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

// ── EVERY MODEL ROUTE IS CAPTURED AND REFUSED. No provider is contacted. ─────────────────
const captured = [];
await ctx.route('**/api/**', async (route) => {
  const req = route.request();
  const url = req.url();
  let body = '';
  try { body = req.postData() || ''; } catch (_) {}
  if (/\/api\/config/.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, offline: true }) });
  }
  captured.push({ url, chars: body.length, body });
  return route.fulfill({ status: 503, contentType: 'application/json',
    body: JSON.stringify({ error: 'offline_gate_check: captured, never sent' }) });
});
page.on('console', (m) => {
  const t = m.text();
  if (/PETITION|EMERGENCE|GATE/i.test(t)) console.log('    [page] ' + t.slice(0, 150));
});

const dump = JSON.parse(fs.readFileSync(SAVE, 'utf8'));
await page.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.evaluate((d) => { Object.keys(d).forEach((k) => { try { localStorage.setItem(k, d[k]); } catch (_) {} }); }, dump.storage);
await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => typeof window.continueStory === 'function', null, { timeout: 120000 });
const resumed = await page.evaluate(async (sid) => {
  try { await window.continueStory(sid); } catch (e) { return { threw: e.message }; }
  return { pages: window.StoryPagination.getPageCount(), turnCount: (window.state || {}).turnCount || 0 };
}, dump.storyId);
console.log('\nRESUMED: ' + JSON.stringify(resumed));
ck('the preserved Scene 2 save reopened', !resumed.threw && resumed.pages >= 2, JSON.stringify(resumed));
ck('it reopened on turnCount 1, the turn the petition gate expects', resumed.turnCount === 1,
  'turnCount ' + resumed.turnCount);

// ── THE RESTORE CLEARS THE PENDING GATE; PUT BACK ONLY THAT ──────────────────────────────
const gate = await page.evaluate(() => {
  const s = window.state || {};
  const before = { awaitingArm: !!s._petitionFrameLandedAwaitingArm,
    emergenceFired: !!s._petitionEmergenceFired, emergenceArmed: !!s._petitionEmergenceArmed,
    deckExamineFired: !!s._deckExamineFired, onboardingComplete: !!s.onboardingComplete,
    pendingPetition: !!(s.fate && s.fate.pendingPetition) };
  s._petitionFrameLandedAwaitingArm = true;
  let armed = false;
  try { if (typeof window._armLiteraryPetitionEmergence === 'function') { window._armLiteraryPetitionEmergence(); armed = true; } } catch (e) { return { before, err: e.message }; }
  const t = window.state || {};
  return { before, armed, after: { emergenceArmed: !!t._petitionEmergenceArmed,
    deckExamineFired: !!t._deckExamineFired, onboardingComplete: !!t.onboardingComplete,
    pendingPetition: !!(t.fate && t.fate.pendingPetition) } };
});
console.log('GATE: ' + JSON.stringify(gate));
// READ FROM THE SAVE FILE. app.js:129609 clears this flag during continueStory, so live state
// after the restore always reports false — the earlier version of this check asserted against
// the very clearing it exists to document.
const savedSnap = (() => {
  try { return JSON.parse(String((dump.storage || {}).sb_saved_story || '{}')).stateSnapshot || {}; }
  catch (_) { return {}; }
})();
ck('the SAVE FILE carried the gate as PENDING (awaiting arm, never fired)',
  savedSnap._petitionFrameLandedAwaitingArm === true && !savedSnap._petitionEmergenceFired,
  'saved awaitingArm=' + savedSnap._petitionFrameLandedAwaitingArm
  + ' emergenceFired=' + savedSnap._petitionEmergenceFired);
ck('and the restore cleared it, which is why it must be put back',
  gate.before.awaitingArm === false, 'live awaitingArm was ' + gate.before.awaitingArm);
ck('the submit gate armed through the shipped function', gate.armed === true && gate.after.emergenceArmed === true, gate.err);
ck('arming did NOT seal a petition — the reader does that', gate.after.pendingPetition === false);
ck('and it did NOT re-arm completed onboarding (deck examine still fired)',
  gate.after.deckExamineFired === gate.before.deckExamineFired && gate.before.deckExamineFired === true);
ck('onboardingComplete untouched', gate.after.onboardingComplete === gate.before.onboardingComplete);

const fill = async (a, d) => page.evaluate(([act, dia]) => {
  const ai = document.getElementById('actionInput') || document.querySelector('[id*="action" i] textarea, textarea[id*="action" i]');
  const di = document.getElementById('dialogueInput') || document.querySelector('textarea[id*="dialogue" i]');
  if (ai) { ai.value = act; ai.dispatchEvent(new Event('input', { bubbles: true })); }
  if (di) { di.value = dia; di.dispatchEvent(new Event('input', { bubbles: true })); }
  return { action: ai ? ai.value : null, dialogue: di ? di.value : null };
}, [a, d]);

// ══ ARM RED: SAY/DO ALONE ════════════════════════════════════════════════════════════════
console.log('\nARM RED — typed Say/Do with NO petition sealed');
const typed = await fill(DO, SAY);
ck('the Say/Do reached the real inputs', typed.action === DO && typed.dialogue === SAY, JSON.stringify(typed));
const beforeRed = captured.length;
const red = await page.evaluate(async () => {
  const b = document.getElementById('submitBtn');
  if (!b) return { why: 'no #submitBtn' };
  const turnBefore = (window.state || {}).turnCount || 0;
  b.click();
  await new Promise((x) => setTimeout(x, 1500));
  // openPetitionZoom marks the CARD, it does not unhide #petitionFateModal.
  const card = document.querySelector('.petition-fate-card');
  const modal = document.getElementById('petitionFateModal');
  return { clicked: true, turnBefore, turnAfter: (window.state || {}).turnCount || 0,
    petitionCardZoomed: !!(card && card.classList.contains('petition-zoomed')),
    petitionModalOpen: !!(modal && !modal.classList.contains('hidden')),
    pending: !!(window.state && window.state.fate && window.state.fate.pendingPetition),
    freeCredit: !!(window.state || {})._petitionGrantsFreeCredit };
});
console.log('  ' + JSON.stringify(red));
ck('Submit did NOT advance the turn', red.turnAfter === red.turnBefore, JSON.stringify(red));
ck('the petition card was re-zoomed instead',
  red.petitionCardZoomed === true || red.petitionModalOpen === true,
  'card zoomed ' + red.petitionCardZoomed + ', modal open ' + red.petitionModalOpen);
ck('the gate granted the promised free credit', red.freeCredit === true);
// The blocked click still opens the petition zoom, and the zoom generates its own content.
// Those calls are NOT the turn, but they are real provider calls and must be budgeted.
const redReqs = captured.slice(beforeRed);
// WHAT MAKES A CALL "THE TURN": it carries the READER'S INPUT. The petition zoom's own
// generation (suggestions, then the characterDisclosure cascade across mistral -> grok ->
// openai) sends the PUBLISHED SCENE TEXT and never the player's action, which is why a
// keyword classifier labelled three 13.3KB disclosure calls as the turn and reported a leak
// that had not happened.
// THE TURN IS THE SCENE-GENERATION CHAIN, identified from the parsed dispatch, not from size
// or from whether the reader's words appear. Ground truth from the captured bodies:
//   BACK_COVER_SYNOPSIS  max_tokens 180   the "Previously..." recap  — carries DID/SAID, not the turn
//   STRUCTURE_GENERATOR / PRIMARY_AUTHOR  max_tokens 1100  the CHARACTER MEMORY EXTRACTOR
//        cascading mistral -> grok -> openai; its openai tier dispatches under PRIMARY_AUTHOR,
//        so role is not the operation here either
//   NORMALIZATION axis=player_action      the first step of the actual turn
const isTurnDispatch = (c) => {
  let j = null; try { j = JSON.parse(String(c.body || '')); } catch (_) { return false; }
  const role = String((j && j.role) || '');
  if (role === 'NORMALIZATION') return true;
  if (/SCENE_PROPOSAL|STRATEGY_PASS/.test(role)) return true;
  // A prose author call is the turn; the extractor's openai tier is not (1100 tokens).
  if (role === 'PRIMARY_AUTHOR' && Number(j.max_tokens || 0) > 4000) return true;
  return false;
};
const redTurn = redReqs.filter(isTurnDispatch);
console.log('  the blocked click dispatched ' + redReqs.length + ' call(s), of which '
  + redTurn.length + ' were the TURN:');
redReqs.forEach((c) => console.log('      ' + c.url.replace(/^.*\/api/, '/api') + '  ' + c.chars
  + ' chars' + (isTurnDispatch(c) ? '   \u2190 TURN' : '   (petition UI)')));
ck('the TURN was not dispatched by the blocked click', redTurn.length === 0,
  redTurn.map((c) => c.url).join(', '));
ck('specifically: no NORMALIZATION (the turn\u2019s first step) went out',
  !redReqs.some((c) => /\"role\":\"NORMALIZATION\"/.test(String(c.body || ''))));
console.log('  \u26a0 the petition zoom itself makes ' + redReqs.length
  + ' provider call(s) \u2014 budget them for the live run');

// ══ ARM GREEN: SEAL, THEN SAY/DO ═════════════════════════════════════════════════════════
console.log('\nARM GREEN — petition sealed through the real controls, then the same Say/Do');
const sealed = await page.evaluate(async (wish) => {
  const r = { opened: false, typed: null, sealClicked: false, pendingAfter: null, toast: null, why: null };
  const m = document.getElementById('petitionFateModal');
  if (!m) { r.why = 'no #petitionFateModal'; return r; }
  if (m.classList.contains('hidden')) {
    if (typeof window.openPetitionZoom === 'function') { window.openPetitionZoom(); await new Promise((x) => setTimeout(x, 500)); }
  }
  r.opened = !m.classList.contains('hidden');
  const input = document.getElementById('petitionInput');
  if (!input) { r.why = 'no #petitionInput'; return r; }
  input.value = wish; input.dispatchEvent(new Event('input', { bubbles: true }));
  r.typed = input.value;
  const seal = document.getElementById('btnSealPetition');
  if (!seal) { r.why = 'no #btnSealPetition'; return r; }
  seal.click(); r.sealClicked = true;
  await new Promise((x) => setTimeout(x, 900));
  const p = (window.state && window.state.fate && window.state.fate.pendingPetition) || null;
  r.pendingAfter = p ? { text: p.text, classification: p.classification } : null;
  const t = document.querySelector('.toast, #toast');
  r.toast = t ? String(t.textContent || '').trim().slice(0, 140) : null;
  return r;
}, WISH);
console.log('  ' + JSON.stringify(sealed).slice(0, 400));
ck('the wish went in through #petitionInput', sealed.typed === WISH, sealed.why || sealed.toast);
ck('#btnSealPetition sealed it — state.fate.pendingPetition is set',
  !!sealed.pendingAfter, sealed.why || sealed.toast || 'no pendingPetition');
ck('and it is the exact wish text', !!sealed.pendingAfter && sealed.pendingAfter.text.indexOf('without the gala deciding') !== -1,
  sealed.pendingAfter && sealed.pendingAfter.text);

await fill(DO, SAY);
const beforeGreen = captured.length;
const green = await page.evaluate(async () => {
  const b = document.getElementById('submitBtn');
  const turnBefore = (window.state || {}).turnCount || 0;
  b.click();
  await new Promise((x) => setTimeout(x, 6000));
  const modal = document.getElementById('petitionFateModal');
  return { turnBefore, petitionModalOpen: !!(modal && !modal.classList.contains('hidden')) };
});
console.log('  ' + JSON.stringify(green) + ' · requests dispatched: ' + (captured.length - beforeGreen));
ck('Submit was NOT blocked once the petition was sealed', captured.length > beforeGreen,
  'no request went out, so the gate still held');

// ── DID BOTH INPUTS REACH THE TURN? ──────────────────────────────────────────────────────
const fresh = captured.slice(beforeGreen);
const all = fresh.map((c) => c.body).join('\n');
console.log('\nWHAT REACHED THE TURN  (' + fresh.length + ' request(s), '
  + all.length + ' chars)');
fresh.slice(0, 6).forEach((c) => console.log('    ' + c.url.replace(/^.*\/api/, '/api') + '  ' + c.chars + ' chars'));
const hasWish = /without the gala deciding what mine means/i.test(all);
const hasDo = /Hold my ground at the counter/i.test(all);
const hasSay = /Send me the uncut segment/i.test(all);
// WHAT THIS ARM CAN AND CANNOT SHOW. Refusing every route stops the turn at its FIRST step:
// the log reads [NORMALIZATION FAILED] HTTP 503 → [SCENE-GEN:FAIL], so the author request is
// never built and the absence of the wish here is an artifact of the refusal, not evidence.
// What it does show: the gate released, and the turn began.
ck('the gate RELEASED and the turn actually began once the wish was sealed',
  /NORMALIZATION|chatgpt-proxy/i.test(all) && fresh.length > 0);
ck('the DO is already on the first outgoing turn request', hasDo);
console.log('  wish on this first request: ' + hasWish + ' \u00b7 say: ' + hasSay
  + '  \u2014 the chain died at normalization (503), so the AUTHOR request was never built here.');
console.log('  Delivery of the wish + Say/Do to the author is proven in the runner arm, which');
console.log('  serves the setup replies instead of refusing them.');

fs.writeFileSync(ROOT + '_FT_SCENE3_GATE.json', JSON.stringify({
  resumed, gate, red, sealed, green,
  requests: fresh.map((c) => ({ url: c.url, chars: c.chars })),
  carries: { wish: hasWish, action: hasDo, dialogue: hasSay },
  checks: { total: n, failed: bad },
}, null, 2));
if (fresh.length) fs.writeFileSync(ROOT + '_FT_SCENE3_TURN_REQUEST.txt', fresh.map((c) => '=== ' + c.url + ' ===\n' + c.body).join('\n\n'));
// Every captured body, so the classification above is checkable rather than asserted.
fs.writeFileSync(ROOT + '_FT_SCENE3_ALL_CAPTURED.txt', captured.map((c, i) =>
  '=== #' + i + '  ' + c.url + '  ' + c.chars + ' chars  carriesReaderInput='
  + (String(c.body || '').indexOf(DO) !== -1 || String(c.body || '').indexOf(SAY) !== -1)
  + ' ===\n' + String(c.body || '').slice(0, 1200)).join('\n\n'));

await browser.close();
srv.kill('SIGTERM');
await new Promise((r) => setTimeout(r, 400));
console.log('\n  ' + (n - bad) + '/' + n + ' checks passed');
console.log('  OFFLINE — every model route was captured and refused; no provider was contacted.');
process.exit(bad ? 1 : 0);
