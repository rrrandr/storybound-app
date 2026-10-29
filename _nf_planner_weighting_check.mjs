// ══════════════════════════════════════════════════════════════════════════════════════════
// ONE WEIGHTING RULE REACHES THE OPENING PLANNER, NOT TWO.
//
// `_twoEngineProportionCompact('scaffold')` returns the ESTABLISHED-SCENE OVERRIDE for a seeded
// fixed Scene 1 — "do NOT apply a target R-plot/A-plot split". app.js then appended the generic
// "(This is Scene 1 — the 80/20 relationship-weighting applies" sentence unconditionally, so both
// the applicable explicit exception AND a generic rule contradicting it arrived in the same
// request, about a thousand characters apart.
//
// The OPENING_PLANNER request is captured at the transport and the door is then answered from a
// fixture, so the run proceeds exactly as production does. Nothing is dispatched to a provider.
//
//   UNSEEDED (ordinary story) → the 80/20 sentence IS present, the override is NOT.   [no regression]
//   SEEDED   (fixed Scene 1)  → the override IS present, the 80/20 sentence is NOT.   [the fix]
//
// usage: node _nf_planner_weighting_check.mjs
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { configBody, isAuthOrigin, installSession, makeSession, installEntitledProfileStub }
  from './_test_session_env.mjs';

const OUT = '/Users/romantsukerman/storybound-app/_nf_planner_weighting_out';
try { fs.rmSync(OUT, { recursive: true, force: true }); } catch (_) {}
fs.mkdirSync(OUT, { recursive: true });

const OVERRIDE  = 'TWO-ENGINE GRAVITY — SCENE 1 OVERRIDE (ESTABLISHED SCENE)';
const DEFERRED  = 'TWO-ENGINE GRAVITY — SCENE 1 OVERRIDE (LI-ARRIVAL=DEFERRED)';
const GENERIC   = 'the 80/20 relationship-weighting applies';   // the caller's old proportion claim
const HELPER9010 = 'SCENE 1 ≈ 90/10';                            // the helper's own Scene-1 figure
const FIELDGUIDE = 'apply the Scene-1 split stated above';       // the kept planner-field guidance

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
let ARM = 'none';
const planner = [], logs = [];
const STATIC = /\/api\/(geo|csp-report|beta-events|bug-report-awards)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 },
                '/api/refund-fortune':  { success: true, fortunesRemaining: 9999 } };
await installSession(page, makeSession());
await installEntitledProfileStub(page, {});
await page.route('**/api/**', async (route) => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(req.url())) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (STATIC.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  const k = Object.keys(LOCAL).find((x) => url.startsWith(x));
  if (k) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL[k]) });
  let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const msgs = (b && b.messages) || [];
  const sys = String((msgs.find((m) => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find((m) => m.role === 'user') || {}).content || '');
  if (String(b && b.role) === 'OPENING_PLANNER') {
    planner.push({ arm: ARM, sys: sys.length, usr: usr.length,
      hasOverride: sys.includes(OVERRIDE) || usr.includes(OVERRIDE),
      hasDeferred: sys.includes(DEFERRED) || usr.includes(DEFERRED),
      hasGeneric: sys.includes(GENERIC) || usr.includes(GENERIC),
      has9010: sys.includes(HELPER9010) || usr.includes(HELPER9010),
      hasFieldGuide: sys.includes(FIELDGUIDE) || usr.includes(FIELDGUIDE) });
    fs.writeFileSync(OUT + '/planner__' + ARM + '__' + planner.length + '.txt',
      `=== ARM ${ARM}\n=== SYSTEM (${sys.length}) ===\n${sys}\n\n=== USER (${usr.length}) ===\n${usr}\n`);
    return route.abort();   // the measurement is the request; nothing downstream is needed
  }
  return route.abort();
});
await page.route('**/sb-test.localhost/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
page.on('console', (m) => { const t = m.text();
  if (/SCENE1:PLANNER|TWO-ENGINE|established-scene override/.test(t)) logs.push(ARM + ' | ' + t.slice(0, 200)); });

await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 60000 });
await page.waitForFunction(() => window.state && window.handleBeginStory, null, { timeout: 180000 });

// A REAL starter id, read from production data — one whose seed actually stages Scene 1.
const starterId = await page.evaluate(() => {
  try {
    const S = window.STARTER_SEEDS || {};
    return Object.keys(S).find((k) => S[k] && S[k].sceneOne
      && String((S[k].sceneOne.present || '')).trim()) || null;
  } catch (_) { return null; }
});

const run = async (arm, seeded, deferLi) => {
  ARM = arm;
  await page.evaluate(({ sid, useSeed, deferLi }) => {
    const S = window.state;
    Object.keys(S).forEach((k) => { try { delete S[k]; } catch (_) {} });
    Object.assign(S, {
      world: 'Modern', worldSubtype: 'small_town', flavor: 'Billionaire', dynamic: 'Enemies',
      archetype: { primary: 'BEAUTIFUL_RUIN', modifier: null },
      name: 'Nadia', playerName: 'Nadia', loveInterestName: 'Julian', partnerName: 'Julian',
      loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', pov: 'first_person',
      storyLength: 'taste', tier: 'taste', access: 'sub', subscribed: true, fortunes: 9999999,
      intensity: 'Steamy', identity: { playerName: 'Nadia', partnerName: 'Julian' },
      renderMode: 'literary', currentEngine: 'literary', storyModality: 'literary',
      storyId: 'weight-' + (useSeed ? 'seeded' : 'plain'), myUid: 'probe',
      turnCount: 0, _skipCorridorValidation: true,
    });
    if (useSeed && sid) S._starterId = sid;
    // DETERMINISTIC ARRIVAL, THROUGH THE LEVER PRODUCTION ITSELF NAMES. app.js:153116 is
    // explicit: "THE FLAG IS THE LEVER, NOT state.liArrival: _setLiArrival commits
    // FROM_START/DEFERRED from a weighted RANDOM roll later in the launch and would overwrite
    // it". Setting state.liArrival therefore held only until the roll ran, and this arm flipped
    // branches between runs. `_liDeferred()` short-circuits to false on _ffCanonLIPresent === true
    // (ROSTER AUTHORITY, Tier A), which is the documented way to pin the LI as present.
    if (deferLi === 'FROM_START') { S._ffCanonLIPresent = true; S._liDeferIntent = false; }
    if (deferLi === 'DEFERRED')   { S._liDeferIntent = true; S.liArrival = 'DEFERRED';
                                    S.pairDynamic = { romanceEngine: 'COLLISION' }; }
    S.picks = { world: S.world, worldSubtype: S.worldSubtype, flavor: S.flavor, dynamic: S.dynamic,
                tone: 'Earnest', pov: 'First', length: 'taste', identity: S.identity };
  }, { sid: starterId, useSeed: seeded, deferLi: deferLi || null });
  try { await Promise.race([page.evaluate(() => window.handleBeginStory()),
                            new Promise((r) => setTimeout(r, 150000))]); } catch (_) {}
  const branch = await page.evaluate(() => String(window._2egLastBranch || '?'));
  planner.filter((p) => p.arm === arm).forEach((p) => { p.branch = branch; });
  return branch;
};

const bOrd = await run('ORDINARY',    false, 'FROM_START');
const bEst = await run('ESTABLISHED', true,  'FROM_START');
const bDef = await run('DEFERRED',    false, 'DEFERRED');
console.log('  branch per arm: ORDINARY→' + bOrd + '  ESTABLISHED→' + bEst + '  DEFERRED→' + bDef);
await browser.close();
fs.writeFileSync(OUT + '/RESULT.json', JSON.stringify({ starterId, planner, logs }, null, 2));

const P = console.log;
let fails = 0;
const chk = (n, ok, d) => { if (!ok) fails++; P('  ' + (ok ? '✓' : '✗') + ' ' + n + (d ? '   — ' + d : '')); };
P('\nONE WEIGHTING RULE REACHES THE OPENING PLANNER, NOT TWO\n');
P('  seed used for the SEEDED arm: ' + (starterId || 'NONE FOUND — the seeded arm proves nothing'));
P('  OPENING_PLANNER requests captured: ' + planner.length);
planner.forEach((p) => P(`    [${p.arm}] sys ${p.sys.toLocaleString()} + usr ${p.usr.toLocaleString()}`
  + `   established=${p.hasOverride} deferred=${p.hasDeferred}`
  + `  generic80/20=${p.hasGeneric}  helper90/10=${p.has9010}  fieldGuide=${p.hasFieldGuide}`));
logs.forEach((l) => P('    log  ' + l));

const byBranch = (b) => planner.filter((p) => p.branch === b);
const est = byBranch('override_established');
const def = byBranch('override_deferred');
const ord = byBranch('ordinary');
P('\n  branches actually exercised: established=' + est.length
  + '  deferred=' + def.length + '  ordinary=' + ord.length);
chk('all three weighting branches were exercised', est.length > 0 && def.length > 0 && ord.length > 0,
  `established ${est.length}, deferred ${def.length}, ordinary ${ord.length}`);
chk('NO captured request asserts the caller\'s old 80/20 claim — on ANY branch',
  planner.length > 0 && planner.every((p) => !p.hasGeneric),
  planner.map((p) => (p.branch || p.arm) + '=' + p.hasGeneric).join(' '));
chk('ESTABLISHED override arrives on its branch and carries no second proportion',
  est.length > 0 && est.every((p) => p.hasOverride && !p.has9010 && !p.hasFieldGuide),
  JSON.stringify(est.map((p) => [p.hasOverride, p.has9010]))); 
chk('DEFERRED override arrives on its branch and carries no second proportion',
  def.length > 0 && def.every((p) => p.hasDeferred && !p.has9010 && !p.hasFieldGuide),
  JSON.stringify(def.map((p) => [p.hasDeferred, p.has9010])));
chk('ORDINARY branch states the Scene-1 split EXACTLY ONCE (the helper\'s 90/10)',
  ord.length > 0 && ord.every((p) => p.has9010), JSON.stringify(ord.map((p) => p.has9010)));
chk('ORDINARY branch keeps the planner-field guidance', ord.length > 0 && ord.every((p) => p.hasFieldGuide),
  JSON.stringify(ord.map((p) => p.hasFieldGuide)));
const un = [], se = [];
P('\n  written: ' + OUT + '   ' + (fails ? fails + ' CHECK(S) FAILED' : 'all checks passed'));
P('  NOTHING WAS DISPATCHED TO A PROVIDER.');
