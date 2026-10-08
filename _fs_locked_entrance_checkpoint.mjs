// CAN A LOCKED READER REACH THE ENTRANCE? Provider-free, $0. One question, nothing else.
//
// WITHDRAWN PREMISE: I claimed the entrance exists only after _unlockBakedGenesis. The code says
// otherwise — _launchStarterStory calls _renderBakedScene1 (app.js:143878) BEFORE any unlock, and
// that renderer calls _mountBakedOASHandoff (app.js:143277), gated only on
// isCG && pkg.endsAt === 'oas_interrupt'. _commitBakedScene, inside the unlock, PERSISTS the
// opening; it does not create its entrance.
//
// THE CHECKPOINT: fresh browser -> boot complete -> launch First Sacrifice ONCE -> read to the
// entrance with Genesis still LOCKED. No unlockFS, no finalizePreview, no screen rescue, no
// resetting of lifecycle flags. Where it stops is the result.
//
// THE CONSOLE IS CAPTURED IN FULL — unfiltered. A narrow filter kept [BeginStory] and the
// validation messages out, so the final ABORTED line could hide the earlier reason.
import { chromium } from 'playwright-core';
import fs from 'fs';
import { stageOf, isProviderEndpoint, MEMORY, verifierVerdict, fsPlannerCaptured }
  from './_replay_fixtures.mjs';
import { configBody, installSession, isAuthOrigin, installEntitledProfileStub }
  from './_test_session_env.mjs';
import { findFSDef, launchFS } from './_fs_story_setup.mjs';

const OUT = '_audit_out/locked_entrance';
fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const FS_PLANNER = (() => { try { return fsPlannerCaptured(); } catch (_) { return null; } })();
const browser = await chromium.launch();
const page = await browser.newPage();

// FULL console, nothing filtered out.
const consoleAll = [];
page.on('console', (m) => consoleAll.push(m.type().toUpperCase() + ' ' + m.text()));
page.on('pageerror', (e) => consoleAll.push('PAGEERROR ' + String(e.message)));
page.on('requestfailed', (r) => consoleAll.push('REQFAILED ' + r.url().slice(0, 120)));

const stages = [];
await installSession(page);
await page.route('**/*', async (route) => {
  const req = route.request(), url = req.url();
  if (isAuthOrigin(url)) { try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch (_) {} return; }
  if (!/\/api\//.test(url)) { try { await route.continue(); } catch (_) {} return; }
  if (/\/api\/config\b/.test(url)) { try { await route.fulfill({ status: 200, contentType: 'application/json', body: configBody() }); } catch (_) {} return; }
  if (/\/api\/(geo|csp-report|beta-events)\b/.test(url)) { try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch (_) {} return; }
  if (/\/api\/consume-fortune/.test(url)) {
    // NOTHING SHOULD BE CHARGED on this checkpoint — the reader never confirms.
    consoleAll.push('HARNESS unexpected consume-fortune request');
    try { await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"fortunesRemaining":9999999}' }); } catch (_) {}
    return;
  }
  if (!isProviderEndpoint(url)) { try { await route.abort(); } catch (_) {} return; }
  let msgs = []; try { msgs = (JSON.parse(req.postData() || '{}').messages) || []; } catch (_) {}
  const sys0 = String((msgs[0] || {}).content || '');
  const stage = stageOf(sys0);
  stages.push({ stage, head: sys0.replace(/\s+/g, ' ').slice(0, 110), chars: sys0.length,
                model: (() => { try { const b = JSON.parse(req.postData() || '{}');
                  return b.preferredModel || b.grokModel || b.model || null; } catch (_) { return null; } })() });
  let body = '{}';
  if (stage === 'planner') body = FS_PLANNER || '{}';
  else if (stage === 'memory') body = MEMORY;
  else if (stage === 'verifier') body = verifierVerdict([]);
  else if (stage === 'bible') body = JSON.stringify({ ok: true });
  try { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: body }) }); } catch (_) {}
});
await installEntitledProfileStub(page);
const purchaseIntentReqs = [];
await page.route('**/sb-test.localhost/**', async (route) => {
  const req = route.request(), url = req.url();
  if (req.method() === 'GET' && /\/rest\/v1\/purchase_intents(\?|$)/.test(url)) {
    purchaseIntentReqs.push(url.slice(url.indexOf('purchase_intents')).slice(0, 120));
    try { await route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'Content-Range': '*/0' }, body: '[]' }); } catch (_) {}
    return;
  }
  try { await route.fallback(); } catch (_) {}
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
// BOOT COMPLETE, on boot's own terms.
// BOOT COMPLETE = the app's own entry points are live. #app VISIBILITY is not part of it on this
// path: with the phantom purchase intent gone, boot no longer detours through showScreen('setup'),
// so the app is revealed later, when the reader opens the Book. That visibility is asserted where
// it belongs — the locked entrance being on screen at the end of this checkpoint.
const booted = await page.waitForFunction(
  () => typeof window._advanceStagedScene === 'function' && document.readyState === 'complete',
  { timeout: 45000 }).then(() => true).catch(() => false);
const appAtBoot = await page.evaluate(() => {
  const a = document.getElementById('app');
  return { hidden: !!(a && a.classList.contains('hidden')), rects: a ? a.getClientRects().length : null };
});
console.log('boot complete: ' + booted + '  app at boot: ' + JSON.stringify(appAtBoot));
t('boot completes on its own', booted === true);

// VERIFY THE FIXTURE PRODUCES data:null, not {} — through the same query production runs.
const intentProbe = await page.evaluate(async () => {
  try {
    const sb = window.sb || window._sb || null;
    if (!sb || !sb.from) return { ok: false, why: 'supabase client not reachable from window' };
    const r = await sb.from('purchase_intents').select('*')
      .eq('user_id', '00000000-0000-0000-0000-000000000001')
      .eq('status', 'completed').is('resumed_at', null)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    return { ok: true, data: r.data, dataIsNull: r.data === null,
             error: r.error ? String(r.error.message || r.error).slice(0, 80) : null };
  } catch (e) { return { ok: false, why: String(e.message).slice(0, 80) }; }
});
console.log('maybeSingle probe: ' + JSON.stringify(intentProbe));
if (intentProbe.ok) {
  t('maybeSingle on zero rows yields data:null, not {}', intentProbe.dataIsNull === true,
    JSON.stringify(intentProbe));
} else {
  console.log('   (the client is not exposed on window; the boot-path assertions below cover it)');
}

// LAUNCH ONCE. Nothing else.
const def = await findFSDef(page);
await launchFS(page, def);
// THE ONBOARDING OVERLAYS intercept the page-turn — measured, with the refusal quoted from the
// click itself. A reader clicks through them, so this clicks their EXACT controls with TRUSTED
// pointer clicks: #pcLookSkipBtn, then the confirmation's .skip-render-warn-btn[data-act="skip"].
// No "last button" fallback and NO opt-out flags are written — a flag write proves nothing about
// whether a reader can get past the overlay.
const modalTrail = [];
const ONBOARD = [
  { sel: '.skip-render-warn-btn[data-act="skip"]', what: '"Skip anyway" (the confirmation, on top)' },
  { sel: '#pcLookSkipBtn', what: 'the look modal\'s Skip' },
  { sel: '#liRenderSkipBtn', what: 'the LI render modal\'s Skip' }
];
for (let round = 0; round < 6; round++) {
  let acted = false;
  for (const o of ONBOARD) {
    const visible = await page.evaluate((sel) => {
      const e = document.querySelector(sel);
      return !!(e && e.getClientRects().length > 0);
    }, o.sel);
    if (!visible) continue;
    try {
      await page.click(o.sel, { timeout: 6000 });     // TRUSTED pointer click
      modalTrail.push(o.what + ' (trusted click)');
    } catch (e) {
      const line = (String(e.message || '').split('\n').find(l => /intercepts pointer events/.test(l)) || '').trim();
      modalTrail.push(o.what + ' REFUSED: ' + (line ? line.slice(0, 80) : String(e.message).split('\n')[0].slice(0, 50)));
    }
    acted = true;
    await page.waitForTimeout(1500);
    break;
  }
  if (!acted) { modalTrail.push('clear'); break; }
}
console.log('onboarding chain: ' + modalTrail.join(' | '));
await page.waitForTimeout(5000);

const afterLaunch = await page.evaluate(() => {
  const v = (id) => { const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); };
  const w = document.getElementById('bakedOASHandoff');
  return {
    genesisUnlocked: !!window.state._bakedGenesisUnlocked,
    setupComplete: !!window.state._bakedSetupComplete,
    scene1MountedAt: window.state._bakedScene1MountedAt || null,
    handoffInDom: !!w,
    submitInDom: !!document.getElementById('bakedOASSubmitBtn'),
    examineOnScreen: v('bakedOASExamineBtn'), submitOnScreen: v('bakedOASSubmitBtn'),
    titleActive: !!window._titlePageActive, frontActive: !!window._frontispieceActive,
    plateActive: !!window._settingPlateActive,
    appHidden: !!(document.getElementById('app') || {}).classList?.contains('hidden'),
    gameHidden: !!(document.getElementById('game') || {}).classList?.contains('hidden'),
    storyContentCls: (document.getElementById('storyContent') || {}).className || null,
    readerPages: (window.StoryPagination && window.StoryPagination.getPageCount)
      ? window.StoryPagination.getPageCount() : null
  };
});
console.log('after one launch: ' + JSON.stringify(afterLaunch));
t('GENESIS IS STILL LOCKED — nothing unlocked it', afterLaunch.genesisUnlocked === false);
t('and setup has not run', afterLaunch.setupComplete === false);
t('_renderBakedScene1 ran', !!afterLaunch.scene1MountedAt);
t('THE ENTRANCE IS IN THE DOM BEFORE ANY UNLOCK', afterLaunch.handoffInDom === true
  && afterLaunch.submitInDom === true, JSON.stringify(afterLaunch));

// READ TO THE ENTRANCE with the reader's own page turns. No class edits, no screen rescue.
const log = [];
for (let i = 0; i < 25; i++) {
  const st = await page.evaluate(() => {
    const v = (id) => { const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); };
    return { entrance: v('bakedOASExamineBtn') && v('bakedOASSubmitBtn'),
             cover: v('coverNextBtn'), next: v('nextPageBtn'),
             title: !!window._titlePageActive, front: !!window._frontispieceActive };
  });
  if (st.entrance) { log.push('ENTRANCE REACHED after ' + i + ' turns'); break; }
  if (st.cover) {
    await page.click('#coverNextBtn', { timeout: 6000 }).catch((e) => {
      const msg = String(e.message || '');
      const inter = (msg.split('\n').find(l => /intercepts pointer events/.test(l)) || '').trim();
      log.push('cover click REFUSED: ' + (inter ? inter.slice(0, 95) : msg.split('\n')[0].slice(0, 60)));
    });
  }
  else if (st.next) { await page.click('#nextPageBtn', { timeout: 6000 }).catch(() => log.push('next click failed')); log.push('next(click)'); }
  else if (st.front) {
    await page.evaluate(() => { try { window.dismissFatelandsFrontispiece(); } catch (_) {} });
    log.push('frontispiece(dismiss)');
    for (let w = 0; w < 12; w++) {
      const clear = await page.evaluate(() => !window._frontispieceActive);
      if (clear) break;
      await page.waitForTimeout(500);
    }
  } else if (st.title) {
    await page.evaluate(() => { try { window.StoryPagination.goToNextPage(); } catch (_) {} });
    log.push('title(pagination)');
  } else { log.push('NO CONTROL ON SCREEN'); break; }
  await page.waitForTimeout(1200);
}
console.log('navigation: ' + log.join(' -> '));

const final = await page.evaluate(() => {
  const v = (id) => { const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); };
  const w = document.getElementById('bakedOASHandoff');
  let why = null;
  if (w && w.getClientRects().length === 0) {
    const chain = []; let el = w;
    while (el && el !== document.documentElement) {
      const cs = getComputedStyle(el);
      chain.push({ id: el.id || null, cls: (el.className || '').toString().slice(0, 34), d: cs.display, rects: el.getClientRects().length });
      el = el.parentElement;
    }
    why = chain.slice(0, 5);
  }
  return { examineOnScreen: v('bakedOASExamineBtn'), submitOnScreen: v('bakedOASSubmitBtn'),
           genesisUnlocked: !!window.state._bakedGenesisUnlocked,
           setupComplete: !!window.state._bakedSetupComplete, whyHidden: why };
});
console.log('final: ' + JSON.stringify(final));
t('A LOCKED READER REACHES THE ENTRANCE ON SCREEN',
  final.examineOnScreen === true && final.submitOnScreen === true, JSON.stringify(final));
t('and it is still locked when they get there', final.genesisUnlocked === false);
t('nothing was charged', !consoleAll.some(l => /unexpected consume-fortune/.test(l)));

// DID REACHING THE ENTRANCE START A SECOND GENERATION PATH?
const secondPath = {
  checkoutAutoBegin: consoleAll.filter(l => /CHECKOUT_RETURN.*auto-beginning/.test(l)),
  beginStoryCalled: consoleAll.filter(l => /\[BeginStory\] handleBeginStory\(\) called/.test(l)).length,
  literaryAuthoring: consoleAll.filter(l => /MODEL\] Literary prose|GROK-LIT/.test(l)).length,
  zeroApiViolations: await page.evaluate(() => (window.__bakedZeroApiViolations || []).length),
  providerRequests: stages.length
};
console.log('\nSECOND GENERATION PATH: ' + JSON.stringify(secondPath, null, 1));
console.log('INTERCEPTED PROVIDER REQUESTS, classified:');
stages.forEach((x, i) => console.log('   ' + (i + 1) + '. [' + x.stage + '] model=' + x.model
  + ' sys=' + x.chars + 'c :: ' + x.head));
const phantom = consoleAll.filter(l => /Found unresumed purchase intent/.test(l));
console.log('purchase_intents GETs served: ' + JSON.stringify(purchaseIntentReqs));
console.log('phantom intent lines: ' + JSON.stringify(phantom));
t('NO phantom purchase intent was found', phantom.length === 0, JSON.stringify(phantom));
t('NO checkout-triggered auto-begin', secondPath.checkoutAutoBegin.length === 0,
  JSON.stringify(secondPath.checkoutAutoBegin));
t('handleBeginStory was never called', secondPath.beginStoryCalled === 0,
  'called ' + secondPath.beginStoryCalled + ' time(s)');
t('NO provider requests at all', secondPath.providerRequests === 0,
  JSON.stringify(stages.map(x => x.stage + '/' + (x.model || '?'))));
t('NO charge requests', !consoleAll.some(l => /unexpected consume-fortune/.test(l)));
fs.writeFileSync(OUT + '/console.full.log', consoleAll.join('\n'));
fs.writeFileSync(OUT + '/second_path.json', JSON.stringify({ secondPath, stages }, null, 2));
fs.writeFileSync(OUT + '/result.json', JSON.stringify(
  { booted, afterLaunch, navigation: log, final, stages }, null, 2));
console.log('\nfull console: ' + consoleAll.length + ' lines -> ' + OUT + '/console.full.log');
const notable = consoleAll.filter(l => /ABORTED|BeginStory|threw|PAGEERROR|REQFAILED|invalid|refus|fail/i.test(l));
console.log('notable lines (' + notable.length + '):');
notable.slice(0, 14).forEach(l => console.log('   ' + l.slice(0, 165)));
await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
