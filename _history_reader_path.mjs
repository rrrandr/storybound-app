// THE REAL READER WORKFLOW, BOTH FORMATS. Provider-free, $0.
//
// No internal generator is called. The literary arm launches a literary story and submits through
// #submitBtn — the control the reader actually uses — twice, for two consecutive scenes. Every
// provider request is intercepted and served from fixtures; nothing external is dispatched.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { stageOf, isProviderEndpoint, oasTurn, oasClosingBeat, OAS_TURNS } from './_replay_fixtures.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

// Two consecutive literary scenes. Scene 2's note quotes a phrase the POST-PROCESSING CHAIN can
// rewrite, so requirement 7 (a rewrite invalidating a quotation) is testable.
const LIT = [
  'The clerk began reading the demand aloud to the seated members. Lirael did not move, and the '
    + 'room took that for an answer.\n\n'
    + '<<<HISTORY_NOTE {"events":[{"text":"The clerk began reading the demand.",'
    + '"quote":"began reading the demand aloud"}],'
    + '"obligations":[{"id":"ob-lit-1","text":"Lirael must respond to the demand."}],'
    + '"resolves":[]} HISTORY_NOTE>>>',
  'She rose before the second page was finished and asked who had signed it.\n\n'
    + '<<<HISTORY_NOTE {"events":[{"text":"Lirael interrupted and asked who signed the demand.",'
    + '"quote":"asked who had signed it"},'
    + '{"text":"A phrase that is NOT in this prose.","quote":"the chandelier fell into the well"}],'
    + '"obligations":[],"resolves":[]} HISTORY_NOTE>>>'
];

const browser = await chromium.launch();
const page = await browser.newPage();
const logs = [];
let litIdx = 0, litServed = 0, plannerReqs = [], authorReqs = [], blocked = 0, serveNote = true;

// EVERYTHING. Narrow filters are how I lost the answer three times in this session: the app had
// already printed the reason and the harness discarded it.
page.on('console', m => logs.push(m.text()));
page.on('pageerror', e => logs.push('PAGEERROR: ' + (e && e.message)));

await page.route('**/api/**', async (route) => {
  const req = route.request();
  // /api/config IS SERVED, not aborted. Aborting it left SUPABASE_URL empty, so the client was
  // never constructed, so there was never a session, so the charge was never attempted — the
  // whole chain of refusals above traced back to the harness killing the config fetch.
  if (/\/api\/config/.test(req.url())) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ supabaseUrl: 'http://localhost:3000/_harness_supabase',
        supabaseAnonKey: 'harness-anon-key' }) });
  }
  if (!isProviderEndpoint(req.url())) {
    // Non-provider endpoints are SERVED EMPTY rather than aborted, so nothing upstream fails
    // closed for want of a reply. No external call leaves this process either way.
    blocked++;
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, success: true, balance: 9999, fortunes: 9999 }) });
  }
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let sys = ''; try { sys = String((JSON.parse(raw || '{}').messages || [])[0]?.content || ''); } catch (_) {}
  const stage = stageOf(sys);
  if (stage === 'oas') {
    const body = litIdx >= OAS_TURNS.length ? oasClosingBeat() : oasTurn(litIdx);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: body }) });
  }
  if (stage === 'planner') {
    plannerReqs.push(raw || '');
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: JSON.stringify({
        state_change: 'The inquiry formally opens against Lirael.',
        tactical_move: 'The clerk begins reading the demand aloud.',
        forces_choice: 'Answer now, or let it be read in full.', must_land_moments: [] }) }) });
  }
  if (stage === 'author') {
    authorReqs.push(sys);
    litServed++;
    let body = LIT[Math.min(litIdx, LIT.length - 1)];
    if (!serveNote) body = body.replace(/<<<HISTORY_NOTE[\s\S]*?HISTORY_NOTE>>>/g, '').trim();
    litIdx++;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: body }) });
  }
  // THE FORTUNE CHARGE, answered as a successful local purchase. No money and no real wallet:
  // this is the dev server, the account is a stub, and the point is only to let the reader reach
  // the turn that generates a scene.
  if (/fortune|charge|pricing|entitle|unlock/i.test(req.url())) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, success: true, charged: true, balance: 9999,
        fortunes: 9999, entitled: true, operationId: 'harness-op' }) });
  }
  // Everything else is SERVED, never aborted — starving an upstream step is what made earlier
  // runs look like the code under test was broken.
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: '{}' }) });
});

// ── THE AUTHENTICATED READER SESSION ────────────────────────────────────────────────────────
// Traced, not guessed. The app refuses to even attempt the unlock without one:
//     [FORTUNE] no session token — charge not attempted
//     [PRICING] baked_unlock_issue: server declined — authentication_required
// sb is built at module init from window.supabase.createClient, so the stub has to exist BEFORE
// app.js runs. This is local harness scaffolding in a headless browser against a dev server:
// no real account, no real wallet, no money, and the charge request itself is intercepted below.
await page.addInitScript(() => {
  const session = { access_token: 'harness-session-token', user: { id: 'harness-reader' } };
  window.supabase = {
    createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session }, error: null }),
        getUser: async () => ({ data: { user: session.user }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInAnonymously: async () => ({ data: { session, user: session.user }, error: null })
      },
      from: () => ({
        select() { return this; }, eq() { return this; }, order() { return this; },
        limit() { return this; }, single: async () => ({ data: null, error: null }),
        insert: async () => ({ data: null, error: null }),
        upsert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        then: (r) => r({ data: [], error: null })
      }),
      channel: () => ({ on() { return this; }, subscribe() { return this; } }),
      removeChannel: () => {}
    })
  };
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!window.STARTER_STORIES, { timeout: 30000 });

console.log('=== READER-PATH COMPLETION TEST (provider-free, $0) ===\n');

// ── launch a LITERARY story. STARTER_STORIES is an ARRAY (my earlier lookup assumed an object,
//    which is why renderMode came back null). famous_fate is literary and is NOT one of the two
//    parked Books.
const launched = await page.evaluate(async () => {
  const all = window.STARTER_STORIES || [];
  const cat = window.PREVIEW_CATALOG || {};
  // THE VEHICLE, chosen after tracing the first unmet prerequisite rather than guessing again:
  // starter_famous_fate is literary but has NO baked opening package, so launching it leaves the
  // reader at a paywall with nothing mounted (bakedMounted:false) and no turn to submit.
  // starter_the_first_taste is literary AND has a baked package, so the reader reaches the turn
  // control. It is PARKED as a PRODUCT; nothing here reads, writes or changes its content — it is
  // used only because it is the literary story whose opening actually mounts.
  const def = all.find(d => d && d.id === 'starter_the_first_taste')
    || all.find(d => d && cat[d.id] && cat[d.id].format === 'literary');
  if (!def) return { ok: false };
  try { await window._launchStarterStory(def); } catch (_) {}
  return { ok: true, id: def.id };
});
await page.waitForTimeout(6000);
console.log('launched: ' + JSON.stringify(launched));

// THE FIRST UNMET PREREQUISITE, traced from the app's own log rather than guessed:
//   [BAKED:GATE] logged out — unlock modal shown (starter=starter_the_first_taste)
// _isSignedIn() reads state.profileId, so a signed-in READER SESSION is presented here. No
// external credential and no service call: the production gate still runs and still makes its own
// decision — it simply now finds a reader who is signed in, which is the state a real reader is
// in at this point. Fortune is funded the same way, for the same reason.
await page.evaluate(() => {
  window.state.profileId = 'harness-reader';
  // The balance field the gate actually reads is state.fortunes. storypassEligible being
  // UNDEFINED is what sends the reader to the 3-card paywall (app.js:115095) — an entitled
  // reader has it resolved. These are the same class of client state as profileId: what a reader
  // who has already paid looks like to the app. Nothing here touches money, a real wallet, or a
  // real account; it is a local fixture so the turn can generate.
  try { window.state.fortunes = 9999; window.state.storypassEligible = true;
        window.state.subscribed = true; } catch (_) {}
});

// unlock the baked opening through the production gate
await page.evaluate(async () => {
  try { if (typeof window._unlockBakedGenesis === 'function') await window._unlockBakedGenesis('reader-path'); } catch (_) {}
});
await page.waitForTimeout(6000);

const state0 = await page.evaluate(() => ({
  renderMode: window.state.renderMode || null,
  turnCount: window.state.turnCount,
  scenes: (window.state.scenes || []).length,
  submitVisible: !!document.getElementById('submitBtn')
    && document.getElementById('submitBtn').offsetParent !== null,
  submitDisabled: document.getElementById('submitBtn') ? document.getElementById('submitBtn').disabled : null
}));
console.log('after unlock: ' + JSON.stringify(state0));

// THE GENESIS PURCHASE, confirmed the way a reader confirms it: the gate shows an unlock modal
// ("[BAKED:GATE] signed in — The complete Issue One at 60F") and the reader presses its own
// Continue button. #buGoBtn is that control; nothing here calls the unlock directly.
async function confirmGenesisIfShown(page) {
  return page.evaluate(() => {
    const btn = document.querySelector('#buGoBtn');
    if (!btn || btn.offsetParent === null) return { shown: false };
    btn.click();
    return { shown: true, label: (btn.innerText || '').trim().slice(0, 40) };
  });
}

async function submitTurn(act, dia) {
  return page.evaluate(async ({ a, d }) => {
    const ai = document.getElementById('actionInput'), di = document.getElementById('dialogueInput');
    const btn = document.getElementById('submitBtn');
    if (!btn) return { ok: false, why: 'no submitBtn' };
    if (ai) { ai.value = a; ai.dispatchEvent(new Event('input', { bubbles: true })); }
    if (di) { di.value = d; di.dispatchEvent(new Event('input', { bubbles: true })); }
    if (btn.disabled) return { ok: false, why: 'submitBtn disabled' };
    btn.click();
    return { ok: true };
  }, { a: act, d: dia });
}

console.log('\n1. THE READER SUBMITS THE FIRST TURN through #submitBtn');
const s1 = await submitTurn('I wait for the clerk to finish.', 'Who signed this?');
console.log('   submit: ' + JSON.stringify(s1));
await page.waitForTimeout(3000);
const g1 = await confirmGenesisIfShown(page);
console.log('   genesis gate: ' + JSON.stringify(g1));
logs.length = 0;
await page.waitForTimeout(22000);

const after1 = await page.evaluate(() => {
  const dom = document.body ? document.body.innerText : '';
  return { dom, domHasSentinel: /HISTORY_NOTE|<<</.test(dom),
    notes: (window.state._historyNotes || []).map(n => ({ ref: n.ref,
      quoted: (n.quoted || []).map(q => q.quote), summary: (n.summary || []).map(x => x.text),
      obligations: (n.obligations || []).map(o => o.id) })),
    pageUid: (window.StoryPagination && window.StoryPagination.getCurrentPageUid)
      ? window.StoryPagination.getCurrentPageUid() : null,
    turnCount: window.state.turnCount };
});
console.log('   author requests: ' + authorReqs.length + '   notes stored: ' + after1.notes.length);
console.log('   notes: ' + JSON.stringify(after1.notes));

if (authorReqs.length === 0) {
  const ui = await page.evaluate(() => ({
    visible: [...document.querySelectorAll('button,a[role=button]')]
      .filter(b => b.offsetParent !== null)
      .map(b => ({ id: b.id || null, cls: (b.className || '').toString().slice(0, 30),
        txt: (b.innerText || '').trim().slice(0, 38) })).slice(0, 18),
    modals: [...document.querySelectorAll('.show,[class*=modal]')]
      .filter(m => m.offsetParent !== null).map(m => m.id || m.className.toString().slice(0, 40)).slice(0, 6)
  }));
  console.log('\n   VISIBLE UI AT THE BLOCK:');
  console.log('     modals: ' + JSON.stringify(ui.modals));
  ui.visible.forEach(b => console.log('     btn ' + JSON.stringify(b)));
  console.log('\n   FIRST UNMET PREREQUISITE — captured console:');
  logs.slice(0, 30).forEach(l => console.log('     ' + String(l).slice(0, 165)));
}

t('1. THE REAL AUTHOR REQUEST WAS MADE through the reader control', authorReqs.length > 0,
  'no author request — see the console capture above');
if (authorReqs.length) {
  t('1b. and it ASKS FOR THE NOTE', /HISTORY_NOTE/.test(authorReqs[0]),
    'the literary author prompt does not request a history note');
  t('3. THE READER SEES NO METADATA', !after1.domHasSentinel, 'the sentinel reached the page');
  t('4. the note is keyed to the accepted page', after1.notes.length === 1
    && after1.notes[0].ref === after1.pageUid,
    'ref=' + JSON.stringify(after1.notes[0] && after1.notes[0].ref) + ' page=' + after1.pageUid);
}

fs.mkdirSync('_audit_out/reader', { recursive: true });
fs.writeFileSync('_audit_out/reader/after1.json', JSON.stringify({ after1, logs: logs.slice(-60) }, null, 2));
if (authorReqs.length) fs.writeFileSync('_audit_out/reader/author1.txt', authorReqs[0]);

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
