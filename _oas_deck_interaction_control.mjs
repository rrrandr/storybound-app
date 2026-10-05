// THE WHOLE OAS CARD INTERACTION on the active reader. Provider-free, $0.
// Rendering is not the contract: a trusted click must select the INTENDED card, its suggestion
// must land in THAT reader's Say/Do, the VISIBLE Submit must send those exact values, and the
// next turn must refresh the deck.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { findFSDef, launchFS, unlockFS, finalizePreview, enterOAS } from './_fs_story_setup.mjs';
import { stageOf, isProviderEndpoint, oasTurn, OAS_TURNS } from './_replay_fixtures.mjs';
import { setupStageOf, SETUP_RESPONSES } from './_reader_setup_fixtures.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
const sent = [];
const otherStages = [];
let n = 0;
await page.route('**/api/**', async (route) => {
  const req = route.request(); const url = req.url();
  if (/\/api\/config/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ supabaseUrl: 'http://localhost:3000/_h', supabaseAnonKey: 'h' }) });
  if (!isProviderEndpoint(url)) return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, fortunesRemaining: 9999, entitled: true, storypassEligible: true }) });
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let sys = '', rest = '';
  try { const b = JSON.parse(raw || '{}'); const m = b.messages || [];
    sys = String(m[0]?.content || ''); rest = m.slice(1).map(x => String(x.content || '')).join('\n'); } catch (_) {}
  if (stageOf(sys) === 'oas') { sent.push({ turn: n, body: rest });
    const b = oasTurn(Math.min(n++, OAS_TURNS.length - 1));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: b }) }); }
  const st = setupStageOf(sys);
  if (st && SETUP_RESPONSES[st]) return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: JSON.stringify(SETUP_RESPONSES[st]) }) });
  // THE FATE-PREVIEW CALLS LAND HERE, and they do NOT take JSON. The BATCH prompt asks for five
  // delimiter lines ("ARCHETYPE ||| action ||| dialogue"); returning JSON made the Do/Say fields
  // fall back to the placeholder "Reversal…". That was a FIXTURE shape error of mine, not a
  // product defect — see feedback_shape_faithful_mocks: a mock returns ONE real shape.
  otherStages.push(sys.slice(0, 90).replace(/\s+/g, ' '));
  // THE INTIMATE BATCH takes FOUR fields (ARCHETYPE ||| variant ||| action ||| dialogue) and
  // shares its system prompt with the prose author, so it is identified by its variant template.
  // Without this branch the previews fell back to the card title ("Confession…") and the check
  // passed only when the randomly chosen card happened to match my single-line reply.
  if (/amplify\|ruin\|redirect/.test(sys)) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      content: [
        'TEMPTATION ||| amplify ||| I close the gap and let my sleeve touch his ||| Ask me again, slower.',
        'BOUNDARY ||| redirect ||| I set the ledger flat and keep my hand on it ||| Not here. Not in front of them.',
        'CONFESSION ||| amplify ||| I turn The Answer so its cut edge faces him ||| I felt it choose. I was holding it.',
        'REVERSAL ||| redirect ||| I put The Answer down between us and do not let go ||| Ask me whose hands shaped it.',
        'SILENCE ||| ruin ||| I go still and let the clearing finish its noise ||| mm'
      ].join('\n') }) });
  }
  if (/5 contextual Say\/Do previews/i.test(sys)) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      content: [
        'TEMPTATION ||| I step close enough that the stone warms between us ||| Ask me again, slower.',
        'BOUNDARY ||| I put the ledger flat on the table and leave my hand on it ||| Not here. Not in front of them.',
        'CONFESSION ||| I turn The Answer so the cut edge faces him ||| I held it when it twisted. I felt it choose.',
        'REVERSAL ||| I set The Answer down between us and do not let go ||| Ask me whose hands shaped it.',
        'SILENCE ||| I go still and let the clearing finish its noise ||| mm'
      ].join('\n') }) });
  }
  if (/contextual Say\/Do previews/i.test(sys)) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      content: 'REVERSAL ||| I set The Answer down between us and do not let go '
        + '||| Ask me whose hands shaped it.' }) });
  }
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: '{}' }) });
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._advanceStagedScene === 'function', { timeout: 30000 });
await page.evaluate(() => { window.state.profileId = 'p'; window.state.fortunes = 9999;
  window.state.storypassEligible = true; window.state.subscribed = true; });
// THE READER HAS OPTED OUT OF PORTRAITS. These are the product's OWN opt-out flags —
// _pcLookSkipped is commented in app.js as 'user clicked "skip"' and _liRenderSkipped as 'has
// the user opted out for this story'. Setting them is the same state a reader reaches by
// clicking Skip, and unlike clicking it holds: the look modal re-opened after every dismissal.
// Images are blocked here regardless. This does NOT touch the deck, the inputs or Submit.
await page.evaluate(() => { window.state._pcLookSkipped = true; window.state._liRenderSkipped = true; });
const def = await findFSDef(page); await launchFS(page, def);
await page.evaluate(() => { window.state._pcLookSkipped = true; window.state._liRenderSkipped = true; });
await unlockFS(page, 'deck-interact'); await finalizePreview(page);
await page.evaluate(() => { window.state._pcLookSkipped = true; window.state._liRenderSkipped = true; });
await enterOAS(page, { settleMs: 9000 });

// A READER CLEARS THE PORTRAIT PROMPTS. Three overlays stand between the opening and the deck
// — pcLookModal, its "Skip anyway" confirmation, and liRenderModal — each intercepting pointer
// events. A real reader skips each one; images are blocked in this harness anyway. These were
// invisible to the read-only probe because it never clicked.
const DISMISS = ['#pcLookSkipBtn', '#pcLookCancelBtn',
  '#skipRenderWarnModal .skip-render-warn-btn[data-act="skip"]',
  '#liRenderSkipBtn', '#liRenderSkipBtn2', '#liRenderCloseBtn'];
const overlaysUp = () => page.evaluate(() =>
  ['pcLookModal', 'skipRenderWarnModal', 'liRenderModal']
    .filter(id => { const m = document.getElementById(id); return !!(m && m.offsetParent !== null); }));
for (let round = 0; round < 8; round++) {
  const up = await overlaysUp();
  if (!up.length) break;
  let clicked = null;
  for (const sel of DISMISS) {
    const el = page.locator(sel);
    if (await el.count() && await el.first().isVisible().catch(() => false)) {
      await el.first().click({ timeout: 10000 }).catch(() => {});
      clicked = sel; break;
    }
  }
  console.log('  overlays ' + JSON.stringify(up) + (clicked ? ' -> dismissed via ' + clicked
    : ' -> NO DISMISS CONTROL FOUND'));
  if (!clicked) break;
  await page.waitForTimeout(1200);
}
const modalUp = await overlaysUp();
t('no modal is covering the reader', modalUp.length === 0, 'still up: ' + JSON.stringify(modalUp));

// ── WHERE ARE WE, AND WHICH MOUNT IS LIVE ──────────────────────────────────────────────────
const where = await page.evaluate(() => {
  const m = window._activeCardMount ? window._activeCardMount() : null;
  const inp = window._getActiveTurnInputs ? window._getActiveTurnInputs() : null;
  return { mountId: m && m.id, mountVisible: !!(m && m.offsetParent !== null),
    cards: m ? m.querySelectorAll('.fate-card').length : 0,
    actId: inp && inp.actInput && inp.actInput.id, diaId: inp && inp.diaInput && inp.diaInput.id,
    gnSubmitVisible: !!(document.getElementById('gnSubmitBtn')
      && document.getElementById('gnSubmitBtn').offsetParent !== null),
    dupCardMounts: document.querySelectorAll('#cardMount').length,
    dupGnMounts: document.querySelectorAll('#gnCardMount').length,
    dupGnAct: document.querySelectorAll('#gnActionInput').length };
});
console.log('=== THE ACTIVE READER ===');
console.log('  mount=#' + where.mountId + ' visible=' + where.mountVisible + ' cards=' + where.cards);
console.log('  inputs=#' + where.actId + ' / #' + where.diaId
  + '   gnSubmit visible=' + where.gnSubmitVisible);
t('the deck is on the VISIBLE reader', where.mountId === 'gnCardMount' && where.mountVisible);
t('it holds the five cards', where.cards === 5, 'cards=' + where.cards);
t('the active inputs are that SAME reader\'s', where.actId === 'gnActionInput'
  && where.diaId === 'gnDialogueInput', where.actId + '/' + where.diaId);
t('its Submit control is visible', where.gnSubmitVisible);
t('NO DUPLICATE IDs for mounts or inputs',
  where.dupCardMounts <= 1 && where.dupGnMounts === 1 && where.dupGnAct === 1,
  JSON.stringify(where));

// ── A TRUSTED CLICK SELECTS THE INTENDED CARD ──────────────────────────────────────────────
console.log('\n=== TRUSTED CLICK -> SELECTION -> INPUTS ===');
const TARGET = 2;
await page.evaluate(() => {
  const i = window._getActiveTurnInputs();
  if (i.actInput) i.actInput.value = ''; if (i.diaInput) i.diaInput.value = '';
});
const wantId = await page.evaluate((k) => (window.state.fateOptions[k] || {}).id || null, TARGET);
await page.locator('#gnCardMount .fate-card').nth(TARGET).click({ timeout: 15000 });
await page.waitForFunction(() => {
  const i = window._getActiveTurnInputs();
  return !!(i && ((i.actInput && i.actInput.value.trim()) || (i.diaInput && i.diaInput.value.trim())));
}, { timeout: 25000 }).catch(() => {});
const after = await page.evaluate(() => {
  const i = window._getActiveTurnInputs();
  const m = window._activeCardMount();
  const sel = m.querySelector('.fate-card.selected');
  return { selectedIndex: window.state.fateSelectedIndex,
    selectedInDom: sel ? Number(sel.dataset.cardIndex) : null,
    act: (i.actInput && i.actInput.value) || '', dia: (i.diaInput && i.diaInput.value) || '',
    hiddenAct: (document.getElementById('actionInput') || {}).value || '' };
});
console.log('  clicked slot ' + TARGET + ' (' + wantId + ')  state.fateSelectedIndex='
  + after.selectedIndex + '  .selected in DOM=' + after.selectedInDom);
console.log('  gnDo : ' + JSON.stringify(after.act.slice(0, 90)));
console.log('  gnSay: ' + JSON.stringify(after.dia.slice(0, 90)));
t('the trusted click selected THE INTENDED card',
  after.selectedIndex === TARGET && after.selectedInDom === TARGET,
  'wanted ' + TARGET + ', got state=' + after.selectedIndex + ' dom=' + after.selectedInDom);
t('its suggestion POPULATED the visible reader\'s inputs',
  after.act.trim().length > 0 || after.dia.trim().length > 0);
t('and NOT the hidden reader\'s', after.hiddenAct.trim() === '',
  'hidden #actionInput got: ' + JSON.stringify(after.hiddenAct.slice(0, 60)));

// ── THE VISIBLE SUBMIT SENDS THOSE EXACT VALUES ────────────────────────────────────────────
console.log('\n=== VISIBLE SUBMIT -> THE OUTGOING REQUEST ===');
const before = sent.length;
const expectAct = after.act.trim(), expectDia = after.dia.trim();
await page.locator('#gnSubmitBtn').click({ timeout: 15000 });
await page.waitForFunction((b) => true, before, { timeout: 1000 }).catch(() => {});
const dl = Date.now() + 30000;
while (sent.length <= before && Date.now() < dl) await page.waitForTimeout(500);
const req = sent[sent.length - 1];
t('A REQUEST WAS SENT by the visible Submit', sent.length > before,
  'captured ' + sent.length + ', had ' + before);
if (req) {
  // THE CONTRACT IS FIDELITY, NOT LENGTH. A card clicked before the preview batch returns gets
  // the template placeholder ("Reversal…") instead of a model preview — a real product fallback,
  // and the reason this check was intermittent. Either way, whatever is in the inputs must reach
  // the request UNCHANGED, so compare the exact value and only require it to be non-trivial.
  const needle = (s) => s && s.trim().length >= 5 && req.body.includes(s);
  const placeholder = /…$/.test(expectAct) || /…$/.test(expectDia);
  console.log('  request carries Do: ' + needle(expectAct) + '   Say: ' + needle(expectDia)
    + (placeholder ? '   (template placeholder — the batch had not returned before the click)' : ''));
  t('THE EXACT CARD VALUES reached the outgoing request',
    (expectAct ? needle(expectAct) : true) && (expectDia ? needle(expectDia) : true),
    'Do=' + JSON.stringify(expectAct.slice(0, 50)) + ' Say=' + JSON.stringify(expectDia.slice(0, 50)));
}

// ── THE NEXT TURN REFRESHES THE DECK ───────────────────────────────────────────────────────
console.log('\n=== NEXT TURN ===');
await page.waitForTimeout(6000);
const next = await page.evaluate(() => {
  const m = window._activeCardMount();
  const i = window._getActiveTurnInputs();
  return { mountId: m && m.id, cards: m ? m.querySelectorAll('.fate-card').length : 0,
    clickable: m ? m.querySelectorAll('.fate-card:not(.locked)').length : 0,
    inputsCleared: !((i.actInput && i.actInput.value.trim()) || (i.diaInput && i.diaInput.value.trim())),
    beat: (window.state.intimacyDialogue || {}).beatCount };
});
console.log('  mount=#' + next.mountId + ' cards=' + next.cards + ' clickable=' + next.clickable
  + ' beat=' + next.beat + ' inputsCleared=' + next.inputsCleared);
t('the deck is STILL on the visible reader next turn',
  next.mountId === 'gnCardMount' && next.cards === 5);
t('and still has clickable cards', next.clickable > 0);

// ── A SECOND CARD-DRIVEN TURN ──────────────────────────────────────────────────────────────
// The runner gets through turn 1 and then finds turn 2's click accepted but producing no
// preview. This looks at the DOM and the commit state instead of inferring it.
console.log('\n=== TURN 2 ===');
const pre2 = await page.evaluate(() => {
  const m = window._activeCardMount();
  const els = [...m.querySelectorAll('.fate-card')];
  return { cards: els.length,
    visible: els.filter(e => e.offsetParent !== null).length,
    locked: els.filter(e => e.classList.contains('locked')).length,
    selected: els.filter(e => e.classList.contains('selected')).length,
    disintegrating: els.filter(e => e.className.includes('disintegrat')).length,
    flipped: els.filter(e => e.classList.contains('flipped')).length,
    fateCommitted: window.state.fateCommitted,
    fateSelectedIndex: window.state.fateSelectedIndex,
    sceneKey: window.state._fateOptionsSceneKey,
    optionIds: (window.state.fateOptions || []).map(o => o.id) };
});
console.log('  ' + JSON.stringify(pre2));
t('turn 2 still has visible cards', pre2.visible > 0, JSON.stringify(pre2));
t('the hand is NOT still committed from turn 1', pre2.fateCommitted !== true,
  'fateCommitted=' + pre2.fateCommitted + ' — a committed hand cannot be re-played');
t('and no card is left selected from turn 1', pre2.selected === 0,
  'selected=' + pre2.selected);

if (pre2.visible > 0) {
  await page.evaluate(() => { const i = window._getActiveTurnInputs();
    if (i.actInput) i.actInput.value = ''; if (i.diaInput) i.diaInput.value = ''; });
  const T2 = 0;
  await page.locator('#gnCardMount .fate-card').nth(T2).click({ timeout: 15000 }).catch(e =>
    console.log('  click error: ' + e.message.split('\n')[0]));
  await page.waitForFunction(() => { const i = window._getActiveTurnInputs();
    return !!(i && ((i.actInput && i.actInput.value.trim()) || (i.diaInput && i.diaInput.value.trim())));
  }, { timeout: 20000 }).catch(() => {});
  const got2 = await page.evaluate(() => { const i = window._getActiveTurnInputs();
    return { act: (i.actInput && i.actInput.value) || '', dia: (i.diaInput && i.diaInput.value) || '',
      selIdx: window.state.fateSelectedIndex }; });
  console.log('  after click: selIdx=' + got2.selIdx);
  console.log('    Do : ' + JSON.stringify(got2.act.slice(0, 80)));
  console.log('    Say: ' + JSON.stringify(got2.dia.slice(0, 80)));
  t('TURN 2 populated a preview from the card',
    got2.act.trim().length > 0 || got2.dia.trim().length > 0,
    'both inputs empty — this is the runner\'s turn-2 failure');
}

// ── THE LITERARY READER IS UNTOUCHED ───────────────────────────────────────────────────────
console.log('\n=== THE LITERARY READER ===');
const lit = await page.evaluate(() => {
  document.getElementById('gnReader').classList.add('hidden');
  const m = window._activeCardMount();
  const i = window._getActiveTurnInputs();
  const r = { mountId: m && m.id, actId: i.actInput && i.actInput.id };
  document.getElementById('gnReader').classList.remove('hidden');
  return r;
});
t('with gnReader hidden the resolver returns #cardMount', lit.mountId === 'cardMount', lit.mountId);
t('and the literary inputs come back too', lit.actId === 'actionInput', lit.actId);

console.log('\n  non-OAS provider calls seen (first 120 chars of each system prompt):');
[...new Set(otherStages)].slice(0, 6).forEach(x => console.log('    - ' + x));
fs.mkdirSync('_audit_out/deck', { recursive: true });
fs.writeFileSync('_audit_out/deck/interaction.json', JSON.stringify({ where, after, next, lit,
  requestCarriedDo: req ? req.body.includes(expectAct) : null }, null, 2));
await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
