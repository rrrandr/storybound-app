// COLD RESTORE — the substrate must survive a reload, free, no model calls.
//
// _resolveSocialEcosystem, _socialEcoRecord, _materializeSocialSlot and _resolveAllyFunction all
// used to be defined ~6,600 lines INSIDE handleBeginStory(). continueStory() does not call
// handleBeginStory(), so on a cold reload of a saved story every one of them was undefined: the
// stamped ecosystem sat in restored state with nothing able to open it. This suite loads the page
// and NEVER starts a story — if the hoist regressed, nothing here can even be called.
//
// usage: node _cold_restore_identity.mjs   (needs vercel dev on :3000)
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

console.log(`\n${'═'.repeat(88)}\nCOLD RESTORE — a saved story reopens without regenerating anything\n${'═'.repeat(88)}\n`);

const browser = await chromium.launch({ headless: true });
let _closing = false;
const closeBrowser = async () => { if (_closing) return; _closing = true; try { await browser.close(); } catch (_) {} };
process.on('uncaughtException', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('unhandledRejection', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('exit', () => { try { browser.close(); } catch (_) {} });

const ctx = await browser.newContext();
try {
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000); page.setDefaultNavigationTimeout(120000);
  const modelCalls = [];
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
  await page.route('**/api/**', async route => {
    const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (PASSTHROUGH.test(url)) return route.continue();
    // ANY model call during a cold restore is a FAILURE OF THIS SUITE'S PREMISE, not a fixture
    // detail: reopening a saved story must not regenerate or re-roll anything.
    if (/proxy|chat|complet|grok|mistral|openai|anthropic/i.test(url)) modelCalls.push(url);
    return route.fulfill({ status:200, contentType:'application/json', body: '{"ok":true}' });
  });
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  // NOTE: handleBeginStory is never called anywhere in this file.
  await page.waitForFunction(() => typeof window.state === 'object' && window.state !== null, { timeout:60000 });
  await page.waitForTimeout(2500);

  const R = await page.evaluate(() => {
    const out = {};
    out.availableBeforeAnyStory = {
      resolve:     typeof window._resolveSocialEcosystem,
      record:      typeof window._socialEcoRecord,
      materialize: typeof window._materializeSocialSlot,
      allyFn:      typeof window._resolveAllyFunction,
      allyList:    Array.isArray(window._ALLY_FUNCTIONS) ? window._ALLY_FUNCTIONS.length : 0,
      rolePools:   typeof window._SOCIAL_ROLE_POOLS,
      slotEntity:  typeof window._relSocialSlotEntity,
      nameSlot:    typeof window._relNameSlot,
      project:     typeof window._relProjectEntity,
    };
    if (typeof window._resolveSocialEcosystem !== 'function') return out;

    // ── SIMULATE THE RESTORE ──
    // A saved story: a storyId, a stamped ecosystem and a ledger, all arriving as plain data
    // through the state spread — exactly what continueStory() rehydrates.
    const s = window.state;
    Object.assign(s, { world:'modern', worldSubtype:'city', flavor:'slow_burn',
      dynamic:'friends_to_lovers', name:'Ava', playerName:'Ava', loveInterestName:'Ben',
      partnerName:'Ben', storyLength:'epic', tier:'epic', playerMask:'OPEN_VEIN',
      storyId:'saved-story-1', _socialEcosystem:null, _allyFunctionPick:null, _relationshipLedger:null });

    // First run: the circle a previous session would have built and saved.
    const built = window._resolveSocialEcosystem(s);
    const savedRecord = JSON.parse(JSON.stringify(window._socialEcoRecord(s)));
    const firstSlot = built.filter(x => x.slotKind)[0];
    const firstId = firstSlot ? window._materializeSocialSlot(firstSlot.slotId) : null;
    const savedLedger = JSON.parse(JSON.stringify(window._relLedger()));

    // ── THE COLD RELOAD ── every derived value gone; only persisted data returns.
    s._socialEcosystem = savedRecord;
    s._relationshipLedger = savedLedger;
    s._allyFunctionPick = null;

    out.readsEcosystem = (window._resolveSocialEcosystem(s) || []).map(x => x.slotId);
    out.originalSlots  = built.map(x => x.slotId);
    out.resolvesSlot   = !!firstSlot && (window._resolveSocialEcosystem(s) || [])
      .some(x => x.slotId === firstSlot.slotId);
    // the person materialised before the reload is the SAME person after it
    out.rematerialised = firstSlot ? window._materializeSocialSlot(firstSlot.slotId) : null;
    out.firstId = firstId;
    // a NEWLY relevant slot can still be materialised after the reload
    const second = (window._resolveSocialEcosystem(s) || []).filter(x => x.slotKind && x.slotId !== (firstSlot||{}).slotId)[0];
    out.newSlotAfterRestore = second ? window._materializeSocialSlot(second.slotId) : null;
    // and a name can still be reconciled
    out.reconciledAfterRestore = out.rematerialised
      ? window._relNameSlot(out.rematerialised, 'Priya', { sceneUid: 'restored-scene-9' }) : null;
    out.reconciledKeptId = out.reconciledAfterRestore === out.rematerialised;
    out.projAfterRestore = out.rematerialised ? window._relProjectEntity(out.rematerialised, 'pc') : null;
    return out;
  });

  const A = R.availableBeforeAnyStory;
  console.log(' 1 · THE HELPERS EXIST WITHOUT EVER STARTING A STORY');
  t('1a: _resolveSocialEcosystem is defined at module scope', A.resolve === 'function', JSON.stringify(A));
  t('1b: _socialEcoRecord is defined', A.record === 'function', A.record);
  t('1c: _materializeSocialSlot is defined', A.materialize === 'function', A.materialize);
  t('1d: _resolveAllyFunction is defined', A.allyFn === 'function', A.allyFn);
  t('1e: the constants moved with them (_ALLY_FUNCTIONS, _SOCIAL_ROLE_POOLS)',
    A.allyList > 0 && A.rolePools === 'object', JSON.stringify([A.allyList, A.rolePools]));
  t('1f: the ledger-side identity API is reachable too',
    A.slotEntity === 'function' && A.nameSlot === 'function' && A.project === 'function', JSON.stringify(A));

  console.log('\n 2 · A RESTORED STORY IS FULLY OPERATIONAL');
  t('2a: it reads its own stamped ecosystem back, unchanged',
    JSON.stringify(R.readsEcosystem) === JSON.stringify(R.originalSlots),
    JSON.stringify([R.originalSlots, R.readsEcosystem]));
  t('2b: it can resolve a slot', R.resolvesSlot, JSON.stringify(R.readsEcosystem));
  t('2c: a person materialised BEFORE the reload is the same person after it',
    !!R.firstId && R.firstId === R.rematerialised, JSON.stringify([R.firstId, R.rematerialised]));
  t('2d: a NEWLY relevant slot can still be materialised after the reload',
    !!R.newSlotAfterRestore && R.newSlotAfterRestore !== R.rematerialised,
    String(R.newSlotAfterRestore));
  t('2e: a name can still be reconciled, keeping the canonical id',
    R.reconciledKeptId && !!R.reconciledAfterRestore, JSON.stringify(R.reconciledAfterRestore));
  t('2f: …and the projection stays safe — no semantic id reaches the PC',
    !!R.projAfterRestore && !/role:pc|social_slot|close_friend/.test(JSON.stringify(R.projAfterRestore)),
    JSON.stringify(R.projAfterRestore));

  console.log('\n 3 · NOTHING WAS REGENERATED');
  t('3a: the cold restore made NO model call', modelCalls.length === 0, JSON.stringify(modelCalls.slice(0, 3)));
} finally { await ctx.close().catch(() => {}); }

console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
await closeBrowser();
process.exit(fail ? 1 : 0);
