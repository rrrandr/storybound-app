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
  const stage = stageOf(String((msgs[0] || {}).content || ''));
  stages.push(stage);
  let body = '{}';
  if (stage === 'planner') body = FS_PLANNER || '{}';
  else if (stage === 'memory') body = MEMORY;
  else if (stage === 'verifier') body = verifierVerdict([]);
  else if (stage === 'bible') body = JSON.stringify({ ok: true });
  try { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: body }) }); } catch (_) {}
});
await installEntitledProfileStub(page);

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
// BOOT COMPLETE, on boot's own terms.
const booted = await page.waitForFunction(() => {
  const a = document.getElementById('app');
  return !!(a && !a.classList.contains('hidden') && a.getClientRects().length > 0)
    && typeof window._advanceStagedScene === 'function';
}, { timeout: 45000 }).then(() => true).catch(() => false);
console.log('boot complete: ' + booted);
t('boot completes and reveals the app on its own', booted === true);

// The portrait modals are the product's own opt-out; images are blocked here anyway.
await page.evaluate(() => {
  try { window.state._pcLookSkipped = true; window.state._liRenderSkipped = true; } catch (_) {}
});

// LAUNCH ONCE. Nothing else.
const def = await findFSDef(page);
await launchFS(page, def);
// THE LOOK MODAL RE-OPENS AFTER LAUNCH and intercepts the page-turn — measured, with the refusal
// quoted: "<summary>Need help? Optional fields ▾</summary> from <div class=overlay id=pcLookModal>".
// These are the product's OWN opt-out flags (a reader reaches this state by clicking Skip), and
// _fs_live_sequence re-applies them after every launch for the same reason. Not a lock issue.
await page.evaluate(() => {
  try { window.state._pcLookSkipped = true; window.state._liRenderSkipped = true; } catch (_) {}
});
const modalTrail = [];
for (let i = 0; i < 12; i++) {
  const step = await page.evaluate(() => {
    const ids = ['skipRenderWarnModal', 'liRenderModal', 'pcLookModal'];
    for (const id of ids) {
      const m = document.getElementById(id);
      if (!m || m.getClientRects().length === 0) continue;
      const btns = Array.from(m.querySelectorAll('button, [role=button]'))
        .filter(b => b.getClientRects().length > 0);
      const pick = btns.find(b => /skip anyway|skip|not now|later|continue|confirm/i.test(b.textContent || ''))
                || btns[btns.length - 1];
      if (pick) return { id: id, sel: '#' + id, label: (pick.textContent || '').trim().slice(0, 24) };
      return { id: id, sel: null, label: 'no control' };
    }
    return null;
  });
  if (!step) { modalTrail.push('clear'); break; }
  if (!step.sel) { modalTrail.push(step.id + ':' + step.label); break; }
  const clicked = await page.evaluate((id) => {
    const m = document.getElementById(id);
    const btns = Array.from(m.querySelectorAll('button, [role=button]'))
      .filter(b => b.getClientRects().length > 0);
    const pick = btns.find(b => /skip anyway|skip|not now|later|continue|confirm/i.test(b.textContent || ''))
              || btns[btns.length - 1];
    if (!pick) return false;
    pick.click();
    return true;
  }, step.id);
  modalTrail.push(step.id + ' -> "' + step.label + '"' + (clicked ? '' : ' (click failed)'));
  await page.waitForTimeout(1500);
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

fs.writeFileSync(OUT + '/console.full.log', consoleAll.join('\n'));
fs.writeFileSync(OUT + '/result.json', JSON.stringify(
  { booted, afterLaunch, navigation: log, final, stages }, null, 2));
console.log('\nfull console: ' + consoleAll.length + ' lines -> ' + OUT + '/console.full.log');
const notable = consoleAll.filter(l => /ABORTED|BeginStory|threw|PAGEERROR|REQFAILED|invalid|refus|fail/i.test(l));
console.log('notable lines (' + notable.length + '):');
notable.slice(0, 14).forEach(l => console.log('   ' + l.slice(0, 165)));
await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
