// SETTLEMENT THROUGH THE REAL ADJUDICATION HANDLER. Provider-free, $0.
//
// The settlement helper is NEVER called directly here. An obligation is created through the
// normal accepted-scene path, the ACTUAL adjudication request is captured and inspected, the
// verdict is served at the NETWORK boundary, and the production response handler
// (app.js:32060 ff) does the settling.
//
// ENTITLEMENT/PAYMENT RESPONSES SIMULATED. PURCHASING AND BILLING ARE NOT TESTED.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { stageOf, isProviderEndpoint } from './_replay_fixtures.mjs';
import { setupStageOf, SETUP_RESPONSES } from './_reader_setup_fixtures.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const OBLIGATION_ID = 'ob-answer-the-demand';
const SCENE_PROSE = 'The clerk began reading the demand aloud to the seated members. '
  + 'Lirael did not move, and the room took that for an answer.';
// ONLY THE FIRST SCENE RAISES THE OBLIGATION. Serving the same id on every turn gave eight
// scenes the same commitment, and the settler then refused it as AMBIGUOUS — correctly, since one
// verdict cannot close eight. That was my fixture, not the product: a story raises a commitment
// once, so later scenes carry none and the target obligation stays unambiguous.
let sceneNo = 0;
const litResponse = () => {
  sceneNo += 1;
  const note = (sceneNo === 1)
    ? '{"events":[{"text":"The clerk began reading the demand.",'
      + '"quote":"began reading the demand aloud"}],"obligations":[{"id":"' + OBLIGATION_ID
      + '","text":"Lirael must answer the demand.","owedBy":"Lirael"}],"resolves":[]}'
    : '{"events":[{"text":"The room waited.","quote":"took that for an answer"}],'
      + '"obligations":[],"resolves":[]}';
  return SCENE_PROSE + '\n\n<<<HISTORY_NOTE ' + note + ' HISTORY_NOTE>>>';
};

// What the adjudicator "returns". `verdict` is swapped between arms; nothing else changes.
let verdict = null, adjudicationReqs = [], plannerReqs = [], authorAll = '';

const browser = await chromium.launch();
const page = await browser.newPage();
const logs = [];
page.on('console', m => logs.push(m.text()));

await page.addInitScript(() => {
  const session = { access_token: 'harness-session-token', user: { id: 'harness-reader' } };
  window.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: session.user }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInAnonymously: async () => ({ data: { session, user: session.user }, error: null }) },
    from: () => ({ select() { return this; }, eq() { return this; }, order() { return this; },
      limit() { return this; }, single: async () => ({ data: null, error: null }),
      insert: async () => ({ data: null, error: null }), upsert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null }), then: (r) => r({ data: [], error: null }) }),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: () => {} }) };
});

await page.route('**/*', async (route) => {
  const u = route.request().url();
  if (/^https?:\/\//.test(u) && !/^https?:\/\/localhost:3000/.test(u)) { try { await route.abort(); } catch (_) {} return; }
  return route.fallback();
});

await page.route('**/api/**', async (route) => {
  const req = route.request(); const url = req.url();
  if (/\/api\/config/.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ supabaseUrl: 'http://localhost:3000/_h', supabaseAnonKey: 'h' }) });
  }
  if (/consume-fortune|fortune|charge|pricing|entitle|storypass|subscription/i.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, success: true, charged: true, fortunesRemaining: 9999,
        balance: 9999, fortunes: 9999, entitled: true, eligible: true, storypassEligible: true }) });
  }
  if (!isProviderEndpoint(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  }
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let sys = ''; try { sys = String((JSON.parse(raw || '{}').messages || [])[0]?.content || ''); } catch (_) {}

  // THE ADJUDICATION REQUEST — the one that carries the solicited obligations.
  if (/HISTORY OBLIGATIONS/.test(sys)) {
    // Capture the WHOLE request: the obligation block is in the system message, the scene being
    // judged is in the user message, and the earlier check read only the first of those.
    let whole = sys;
    try { whole = String((JSON.parse(raw || '{}').messages || []).map(m => m.content).join('\n')); } catch (_) {}
    adjudicationReqs.push(whole);
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: JSON.stringify(verdict || {}) }) });
  }
  const stage = stageOf(sys);
  if (stage === 'planner') {
    plannerReqs.push(raw || '');
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: JSON.stringify({
        state_change: 'The inquiry opens.', tactical_move: 'The clerk reads.',
        forces_choice: 'Answer or leave.', must_land_moments: [] }) }) });
  }
  if (stage === 'author') {
    try { authorAll += '\n' + String((JSON.parse(raw || '{}').messages || []).map(m => m.content).join('\n')); } catch (_) {}
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: litResponse() }) });
  }
  const st = setupStageOf(sys);
  if (st === 'mech_fix') {
    let given = ''; try { given = String((JSON.parse(raw || '{}').messages || [])[1]?.content || ''); } catch (_) {}
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: given }) });
  }
  if (st === 'line_edit') {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '[]' }) });
  }
  if (st && SETUP_RESPONSES[st]) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: JSON.stringify(SETUP_RESPONSES[st]) }) });
  }
  return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'unfixtured' }) });
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!window.STARTER_STORIES, { timeout: 30000 });

console.log('=== SETTLEMENT THROUGH THE REAL ADJUDICATION HANDLER (provider-free, $0) ===');
console.log('ENTITLEMENT/PAYMENT RESPONSES SIMULATED. PURCHASING AND BILLING ARE NOT TESTED.\n');

// ── create the obligation through the NORMAL accepted-scene path ───────────────────────────
await page.evaluate(async () => {
  const all = window.STARTER_STORIES || [];
  const def = all.find(d => d && d.id === 'starter_the_first_taste');
  try { await window._launchStarterStory(def); } catch (_) {}
});
await page.waitForTimeout(6000);
await page.evaluate(() => {
  window.state.profileId = 'harness-reader'; window.state.fortunes = 9999;
  window.state.storypassEligible = true; window.state.subscribed = true;
  const s = window.state;
  if (s.archetype && s.archetype.primary) {
    if (!s.playerMask) s.playerMask = s.archetype.primary;
    s.picks = s.picks || {}; if (!s.picks.playermask) s.picks.playermask = s.playerMask;
  }
  [...document.querySelectorAll('.sb-card[data-grp]')].forEach(c => {
    const g = c.getAttribute('data-grp');
    if (!document.querySelector('.sb-card[data-grp="' + g + '"].selected')) c.click();
  });
});
await page.evaluate(async () => { try { await window._unlockBakedGenesis('settlement'); } catch (_) {} });
await page.waitForTimeout(5000);
// The ORDER matters and is the one the working reader driver uses: the reader SUBMITS a turn,
// which raises the unlock gate, and then confirms it through the gate's own Continue button.
await page.evaluate(() => {
  const ai = document.getElementById('actionInput'), di = document.getElementById('dialogueInput');
  if (ai) { ai.value = 'I wait for the clerk to finish.'; ai.dispatchEvent(new Event('input', { bubbles: true })); }
  if (di) { di.value = 'Who signed this?'; di.dispatchEvent(new Event('input', { bubbles: true })); }
  const b = document.getElementById('submitBtn'); if (b && !b.disabled) b.click();
});
await page.waitForTimeout(3000);
await page.evaluate(() => { const b = document.querySelector('#buGoBtn'); if (b && b.offsetParent !== null) b.click(); });
await page.waitForTimeout(60000);

const created = await page.evaluate(() => ({
  notes: (window.state._historyNotes || []).map(n => ({ ref: n.ref,
    obligations: (n.obligations || []).map(o => ({ id: o.id, resolved: !!o.resolved })) })),
  open: (window._openObligations ? window._openObligations(window.state) : []).map(o => o.id)
}));
console.log('1. THE OBLIGATION, CREATED THROUGH THE ACCEPTED-SCENE PATH');
console.log('   notes: ' + JSON.stringify(created.notes));
console.log('   open: ' + JSON.stringify(created.open));
t('an obligation exists, created by the normal path', created.open.includes(OBLIGATION_ID),
  'no obligation was created — the rest cannot be measured');


// ── 2. THE ACTUAL ADJUDICATION REQUEST ──────────────────────────────────────────────────────
console.log('\n2. THE ADJUDICATION REQUEST THE APPLICATION ACTUALLY SENT');
console.log('   adjudication requests captured: ' + adjudicationReqs.length);
const adjSys = adjudicationReqs.join('\n');
t('an adjudication request was sent at all', adjudicationReqs.length > 0,
  'nothing solicited the obligation, so no verdict could settle it');
if (adjudicationReqs.length) {
  t('it NAMES THAT EXACT OBLIGATION, id and text',
    adjSys.includes('[' + OBLIGATION_ID + ']') && /Lirael must answer the demand/.test(adjSys),
    'the request does not identify the obligation being judged');
  t('and it names the SCENE BEING JUDGED, not some other text',
    /began reading the demand aloud/.test(adjSys),
    'the request does not carry the scene the verdict is about');
  t('it asks for the verdict in its own field',
    /history_obligations_fulfilled/.test(adjSys));
  const sample = adjSys.match(/SEPARATELY, judge HISTORY OBLIGATIONS[\s\S]{0,220}/);
  if (sample) console.log('   > ' + sample[0].replace(/\s+/g, ' ').slice(0, 210));
}

// ── 3. THE NEGATIVE ARMS, each a verdict served to the PRODUCTION handler ───────────────────
// A fresh turn is run per arm so each verdict travels the real path. The settlement helper is
// never called by this harness.
async function turnWithVerdict(v, act) {
  verdict = v; adjudicationReqs.length = 0;
  await page.evaluate(({ a }) => {
    const ai = document.getElementById('actionInput');
    if (ai) { ai.value = a; ai.dispatchEvent(new Event('input', { bubbles: true })); }
    const b = document.getElementById('submitBtn'); if (b && !b.disabled) b.click();
  }, { a: act });
  await page.waitForTimeout(4000);
  // clear the one-time Petition interstitial the same way the reader does
  await page.evaluate(async () => {
    const input = document.getElementById('petitionInput');
    if (input) {
      input.value = 'Let the clerk falter before he reaches the part that names me.';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const seal = document.getElementById('btnSealPetition'); if (seal) seal.click();
    }
  });
  await page.waitForTimeout(2500);
  await page.evaluate(({ a }) => {
    const ai = document.getElementById('actionInput');
    if (ai) { ai.value = a; ai.dispatchEvent(new Event('input', { bubbles: true })); }
    const b = document.getElementById('submitBtn'); if (b && !b.disabled) b.click();
  }, { a: act });
  await page.waitForTimeout(50000);
  console.log('     adjudication requests this arm: ' + adjudicationReqs.length);
  return page.evaluate((id) => {
    const open = (window._openObligations ? window._openObligations(window.state) : []).map(o => o.id);
    let settled = null;
    (window.state._historyNotes || []).forEach(n => (n.obligations || []).forEach(o => {
      if (String(o.id) === id) settled = { resolved: !!o.resolved, by: o.settledBy || null,
        evidence: o.settledEvidence || null };
    }));
    return { open, settled };
  }, OBLIGATION_ID);
}

const EVID = 'did not move, and the room took that for an answer';

console.log('\n3. VERDICTS THAT MUST CLOSE NOTHING');
{
  const r1 = await turnWithVerdict(
    { history_obligations_fulfilled: [{ id: OBLIGATION_ID, evidence: '' }] }, 'I listen.');
  t('MISSING EVIDENCE closes nothing', r1.open.includes(OBLIGATION_ID) && !r1.settled.resolved,
    JSON.stringify(r1.settled));

  const r2 = await turnWithVerdict(
    { history_obligations_fulfilled: [{ id: OBLIGATION_ID, evidence: 'she fled the chamber entirely' }] },
    'I wait.');
  t('NON-MATCHING EVIDENCE closes nothing', r2.open.includes(OBLIGATION_ID) && !r2.settled.resolved);

  const r3 = await turnWithVerdict(
    { history_obligations_fulfilled: [{ id: 'ob-never-solicited', evidence: EVID }] }, 'I stay.');
  t('AN UNSOLICITED ID closes nothing', r3.open.includes(OBLIGATION_ID) && !r3.settled.resolved);
}

console.log('\n4. THE VALID VERDICT');
{
  const beforePlanner = plannerReqs.length;
  const r = await turnWithVerdict(
    { history_obligations_fulfilled: [{ id: OBLIGATION_ID, evidence: EVID }] }, 'I answer.');
  console.log('   settled: ' + JSON.stringify(r.settled));
  t('THE PRODUCTION HANDLER SETTLED IT — the helper was never called here',
    !!r.settled && r.settled.resolved === true, JSON.stringify(r.settled));
  t('and it recorded the adjudicator and the evidence',
    !!r.settled && /history_obligations_fulfilled/.test(r.settled.by || '')
      && /took that for an answer/.test(r.settled.evidence || ''));
  t('it is gone from the open set', !r.open.includes(OBLIGATION_ID));
  // SETTLEMENT HAPPENS IN THE POST-SCENE PASS, which runs AFTER that turn's planner. Checking
  // the requests from the settling turn therefore reads planning that was assembled while the
  // obligation was still legitimately open. The question is what the NEXT planner receives, so
  // one more turn is run and ITS request is the evidence.
  plannerReqs.length = 0;
  const after = await turnWithVerdict({ history_obligations_fulfilled: [] }, 'I go on.');
  const later = plannerReqs.join('\n');
  console.log('   planner requests after settlement: ' + plannerReqs.length
    + ' (' + later.length + ' chars)');
  t('a SUBSEQUENT planner request was actually assembled', plannerReqs.length > 0,
    'nothing to measure — the check below would pass vacuously');
  t('AND THE SETTLED OBLIGATION NO LONGER REACHES PLANNING CONTEXT',
    plannerReqs.length > 0 && !/Lirael must answer the demand/.test(later),
    'a settled obligation is still being carried to the planner');
  t('it stayed closed across that turn', !after.open.includes(OBLIGATION_ID));
}

fs.mkdirSync('_audit_out/settle', { recursive: true });
fs.writeFileSync('_audit_out/settle/state.json', JSON.stringify({ created, logs: logs.slice(-80) }, null, 2));
if (adjSys) fs.writeFileSync('_audit_out/settle/adjudication.txt', adjSys);
await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
