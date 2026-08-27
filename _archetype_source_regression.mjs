// PC/LI ARCHETYPE SOURCE + KEY-CASE REGRESSIONS — free, no model calls, no network.
//
// Two bugs, one family, four sites. state.archetype.primary is the LOVE INTEREST's archetype
// (the PC's is playerMask), and the profile tables are keyed UPPER_SNAKE while three call sites
// lowercased before lookup. Both shipped silently for months because nothing asserted the
// RESOLVED VALUES — the suites only ever checked that blocks were present, never whose
// psychology was inside them.
//
// usage: node _archetype_source_regression.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

console.log(`\n${'═'.repeat(86)}\nPC / LI ARCHETYPE SOURCE — the lens must belong to the protagonist\n${'═'.repeat(86)}\n`);

// ── STATIC: no surviving lowercase lookup against the UPPER_SNAKE tables ──
{
  const bad = SRC.split('\n')
    .map((l, i) => ({ l, n: i + 1 }))
    .filter(x => /_PC_NARRATOR_ARCHETYPE_PROFILES\[|_LI_ATTRACTION_ARCHETYPE_VECTORS\[/.test(x.l))
    .filter(x => /toLowerCase\(\)/.test(x.l) || /\[_?(pc|li)K\]/.test(x.l) && /toLowerCase/.test(SRC.split('\n')[x.n - 2] || ''));
  t('S1: no archetype-table lookup uses a lowercased key',
    bad.length === 0, bad.map(x => `${x.n}: ${x.l.trim().slice(0, 110)}`).join('\n      '));
}

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
page.setDefaultTimeout(120000); page.setDefaultNavigationTimeout(120000);
await page.route('**/app.js*', r => r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: SRC }));
await page.route('**/api/**', route => PASSTHROUGH.test(route.request().url()) ? route.continue() : route.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 60000 });
await page.waitForFunction(() => window.state && window._buildCharacterPlusShared && window._resolvePairDynamic, { timeout: 120000 });

// The discriminating fixture: PC and LI carry DIFFERENT archetypes, so a mix-up is visible.
const R = await page.evaluate(() => {
  const s = window.state;
  Object.assign(s, { playerName: 'Lirael', name: 'Lirael', loveInterestName: 'Julian',
    playerMask: 'OPEN_VEIN', archetype: { primary: 'BEAUTIFUL_RUIN', modifier: null } });
  s.picks = s.picks || {};
  const doctrine = window._buildCharacterPlusShared({ visFloor: false }) || '';
  const pd = window._resolvePairDynamic(s) || {};
  s.pairDynamic = pd;
  return { doctrine, pd,
    profileKeys: Object.keys(window._PC_NARRATOR_ARCHETYPE_PROFILES || {}) };
});

console.log(` fixture: PC playerMask=OPEN_VEIN · LI archetype.primary=BEAUTIFUL_RUIN\n`);

// ── 1. the PC lens names the PC's archetype, never the LI's ──
t('1a: LAYER 1A renders the PC NARRATOR VOICE as OPEN VEIN',
  /LAYER 1A — PC NARRATOR VOICE: OPEN VEIN/i.test(R.doctrine),
  (R.doctrine.match(/LAYER 1A — PC NARRATOR VOICE: [^\n]*/i) || ['(block absent)'])[0]);
t('1b: it is NOT the love interest\'s archetype',
  !/PC NARRATOR VOICE: BEAUTIFUL RUIN/i.test(R.doctrine),
  'the protagonist was handed the LI\'s psychology as her observing lens');
t('1c: the PC lens block was actually emitted (not silently empty)',
  R.doctrine.length > 500 && /WHO GETS CHARACTER\+/.test(R.doctrine));

// ── 2. the pair resolver produces values, not nulls ──
t('2a: pairDynamic.pcMovement resolves', !!R.pd.pcMovement, JSON.stringify(R.pd.pcMovement));
t('2b: pairDynamic.liMovement resolves', !!R.pd.liMovement, JSON.stringify(R.pd.liMovement));
t('2c: pairDynamic.collisionGeometry resolves', !!R.pd.collisionGeometry, JSON.stringify(R.pd.collisionGeometry));
t('2d: pcMovement is the PC\'s archetype movement, not the LI\'s',
  typeof R.pd.pcMovement === 'string' && /INWARD TRANSLATION/i.test(R.pd.pcMovement),
  JSON.stringify(String(R.pd.pcMovement || '').slice(0, 90)));
t('2e: the tables are UPPER_SNAKE, so a lowercase key could never have resolved',
  R.profileKeys.length > 0 && R.profileKeys.every(k => k === k.toUpperCase()),
  JSON.stringify(R.profileKeys));

// ══════════════════════════════════════════════════════════════════════════════════════
// 3 · THE R-PLOT PLANNING REQUEST — where these values are actually spent
//
// The movements and the collision geometry do NOT reach the author directly: they enter the
// R-plot PLANNING request first (~251724 / ~251730 / ~251735), and the resulting R-plot
// influences author context later. Each line is emitted only when its value is truthy, so
// while the lookups returned null all three were silently absent from the request.
//
// _generateRPlot is nested inside handleBeginStory, so it exists only once that is running —
// the story is driven through the real entry point with EVERY model call intercepted and
// answered from a stub. Nothing is dispatched and nothing is paid for.
// ══════════════════════════════════════════════════════════════════════════════════════
const captured = [];
const page2 = await (await browser.newContext()).newPage();
page2.setDefaultTimeout(180000); page2.setDefaultNavigationTimeout(180000);
await page2.route('**/app.js*', r => r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: SRC }));
await page2.route('**/api/**', async route => {
  const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
  if (PASSTHROUGH.test(url)) return route.continue();
  if (/\/api\/(image|bfl-kontext|visualize-flux|grok-image|dashscope-image|img-proxy)\b/.test(url)) return route.abort();
  let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const m = (b && b.messages) || [];
  captured.push({ url,
    system: String((m.find(x => x.role === 'system') || {}).content || ''),
    user:   String((m.find(x => x.role === 'user')   || {}).content || '') });
  const stub = JSON.stringify({ coreTension: 'x', issueRelationshipState: ['a', 'b'] });
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, content: stub, choices: [{ message: { content: stub } }] }) });
});
await page2.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 60000 });
await page2.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 180000 });

const drive = await page2.evaluate(async () => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  s.picks = s.picks || {};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
    .forEach(k => { s.picks[k] = def[k]; });
  Object.assign(s, { world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor, dynamic: def.dynamic,
    archetype: { primary: 'BEAUTIFUL_RUIN', modifier: null },      // LI archetype
    playerMask: 'OPEN_VEIN',                                       // PC archetype
    name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
    liGender: 'male', storyLength: 'fling', tier: 'fling', access: 'sub', subscribed: true,
    fortunes: 9999999, intensity: 'Steamy', pov: 'first_person',
    identity: { playerName: 'Lirael', partnerName: 'Julian' },
    renderMode: 'literary', currentEngine: 'literary', storyId: 'archreg', myUid: 'probe',
    _starterId: def.id, is_starter_story: true, immutableTitle: def.title });
  s.picks.identity = s.identity; s._skipCorridorValidation = true;
  let threw = null;
  try { await Promise.race([window.handleBeginStory(), new Promise(r => setTimeout(r, 150000))]); }
  catch (e) { threw = String(e && e.message); }
  return { threw, pd: s.pairDynamic || null };
});

const rReq = captured.map(c => c.system + '\n' + c.user).join('\n');
t('3a: model requests were captured (nothing dispatched, nothing paid)',
  captured.length > 0, `captured=${captured.length} threw=${drive.threw}`);
t('3b: the R-plot request carries the PC narrator movement',
  /PC narrator movement:/.test(rReq),
  'emitted only when truthy — a null lookup dropped it silently');
t('3c: the R-plot request carries the LI attraction movement',
  /LI attraction movement:/.test(rReq));
t('3d: the R-plot request carries the combined collision geometry',
  /Collision geometry:/.test(rReq));
t('3e: the PC movement in the request is the PC\'s, not the LI\'s',
  /PC narrator movement: [^\n]*INWARD TRANSLATION/i.test(rReq),
  (rReq.match(/PC narrator movement: [^\n]{0,90}/) || ['(absent)'])[0]);
t('3f: the resolved pair dynamic survived the real story path',
  !!(drive.pd && drive.pd.pcMovement && drive.pd.collisionGeometry),
  JSON.stringify(drive.pd && { pc: !!drive.pd.pcMovement, li: !!drive.pd.liMovement, cg: !!drive.pd.collisionGeometry }));

await browser.close();
console.log(`\n${'─'.repeat(86)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
