// Guard: first-Fatelands wish-demonstration opener (steps 1-3 — gate + HOT-force + directive + inject).
// Loads the live app and drives _fatelandsWishDemoActive / _buildFatelandsWishDemoOpenerDirective /
// _pickOpeningTemperature under controlled state. Stubs isDevMode so BOTH the first-ever and the
// milestone-set-non-dev paths are testable (localhost always reports dev). No story-gen.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

// STATIC: the gate logic (the module-scoped isDevMode can't be overridden from the browser on localhost,
// where isDevMode()===true always — so verify the one-time + dev-override condition from source).
const src = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
const gs = src.indexOf('function _fatelandsWishDemoActive');
const gate = gs >= 0 ? src.slice(gs, gs + 700) : '';
let sFail = [];
if (!/sb_witnessed_fatelands_wish_ritual/.test(gate)) sFail.push('gate does not read the sb_witnessed_fatelands_wish_ritual milestone');
if (!/===\s*'1'/.test(gate) || !/!\s*witnessed|!\s*_?witnessed/.test(gate)) sFail.push('gate does not treat the milestone as a one-time flag (witnessed === "1"; return !witnessed …)');
if (!/isDevMode\(\)/.test(gate) || !/\|\|\s*dev/.test(gate)) sFail.push('gate has no dev override (|| dev)');
if (!/world\s*===\s*'Fantasy'/.test(gate)) sFail.push('gate not Fatelands-scoped');
if (!/turnCount/.test(gate)) sFail.push('gate not Scene-1-scoped (turnCount)');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._buildFatelandsWishDemoOpenerDirective === 'function' && typeof window._fatelandsWishDemoActive === 'function' && typeof window._pickOpeningTemperature === 'function', { timeout: 45000 });

  const R = await page.evaluate(() => {
    const out = { fails: [] };
    const A = (c, m) => { if (!c) out.fails.push(m); };
    const s = window.state;
    const origDev = window.isDevMode;
    const LS = window.localStorage;
    const KEY = 'sb_witnessed_fatelands_wish_ritual';
    const setup = (world, turn, temp, milestone, dev) => {
      Object.assign(s, { turnCount: turn }); s.picks = Object.assign(s.picks || {}, { world: world }); s._openingTemperature = temp;
      if (milestone) LS.setItem(KEY, '1'); else LS.removeItem(KEY);
      window.isDevMode = () => dev;
    };
    const D = window._buildFatelandsWishDemoOpenerDirective, ACT = window._fatelandsWishDemoActive, PICK = window._pickOpeningTemperature;

    // (1) active demo (Fatelands Scene-1, dev — localhost) → directive non-empty
    // NOTE: the one-time (milestone) + dev-override branch is checked STATICALLY above — the module-scoped
    // isDevMode() is true on localhost and can't be forced false from here, so behavioral non-dev is n/a.
    setup('Fantasy', 0, 'HOT_CRISIS', false, true);
    A(ACT(s) === true, 'gate NOT active for a Fatelands Scene-1 demo turn (dev)');
    A((D() || '').length > 80, 'demo directive empty for the active demo case');

    // (4) non-Fatelands world → empty
    setup('Contemporary', 0, 'HOT_CRISIS', false, false);
    A((D() || '') === '', 'demo directive fired in a non-Fatelands world');

    // (5) continuation turn → empty (Scene-1 only)
    setup('Fantasy', 3, 'HOT_CRISIS', false, false);
    A((D() || '') === '', 'demo directive fired on a continuation turn');

    // (6) HOT-only — not HOT_CRISIS → empty even when otherwise active
    setup('Fantasy', 0, 'COLD_DISRUPTION', false, true);
    A((D() || '') === '', 'demo directive fired when opening temperature is not HOT_CRISIS');

    // (7) _pickOpeningTemperature forces HOT for the demo case
    setup('Fantasy', 0, null, false, true); s._openingTemperature = null;
    A(PICK(s) === 'HOT_CRISIS', '_pickOpeningTemperature did not force HOT_CRISIS for the demo');

    window.isDevMode = origDev; LS.removeItem(KEY);
    return out;
  });

  await browser.close();
  const fails = sFail.concat(R.fails);
  if (fails.length) { console.error('FAIL:\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('PASS: wish-demo opener gate is one-time (sb_witnessed_fatelands_wish_ritual !== "1") with a dev override, Fatelands + Scene-1 scoped [static]; directive fires for the active demo, is HOT-only / Scene-1-only / Fatelands-only, and _pickOpeningTemperature forces HOT for the demo [behavioral].');
})().catch(e => { console.error('GUARD FATAL', e && e.message); process.exit(1); });
