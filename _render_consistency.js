// $0 verification of three render-consistency fixes (Roman 2026-07-16):
//   1. PC hairstyle is a LOCKED field (hairStyle) → no frame-to-frame drift.
//   2. Manta-cloak render-side expansion → terse "manta-cloak" wardrobe becomes the
//      full manta-hide / Storm-cape / pearls-or-shells canon (never seaweed/cloth/ragged).
//   3. Cut-in closeups inject UNDERWATER PHYSICS so hair/fabric billow, not gravity.
const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/grok-image**', '**/api/visualize-flux**'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._renderCutCloseup === 'function' && typeof window._resolvePcAppearance === 'function' && typeof window._expandMantaWardrobe === 'function', { timeout: 40000 });

  const R = await page.evaluate(async () => {
    const s = window.state;
    s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen';
    s.picks = { identity: { playerName: 'Mira' } };
    s.pcAppearance = {}; // fresh lock
    s.worldInstanceId = 'render-consistency-probe';

    // (1) hairstyle lock — resolve twice, must be identical + include a style
    const a1 = window._resolvePcAppearance();
    const a2 = window._resolvePcAppearance();

    // (2) manta expansion — manta term expands; non-manta is a no-op
    const mantaExp = window._expandMantaWardrobe('a manta-cloak clasped at the shoulders');
    const plainExp = window._expandMantaWardrobe('emerald silk gown, gold drop earrings');

    // (3) underwater cut-in billow
    const vs = { background: 'Gloamwater Bay depths, silt currents under filtered moonlight', pc_wardrobe: 'a manta-cloak', lighting: 'cool' };
    s._stagedActive = s._stagedActive || {}; s._stagedActive.plan = { visualState: vs }; s._stagedCloseupCache = {};
    window._lastCloseupPrompt = '';
    await window._renderCutCloseup('neutral', 'cool', 'protagonist', 'gesture', { background: vs.background, pcWardrobe: vs.pc_wardrobe, pcSpecies: 'Human' }).catch(function () {});
    const cuPrompt = window._lastCloseupPrompt || '';

    // dry-land control: cut-in for a non-underwater scene must NOT inject water physics
    const vs2 = { background: 'a sunlit marble balcony over the city', pc_wardrobe: 'emerald silk gown', lighting: 'warm' };
    s._stagedActive.plan = { visualState: vs2 };
    window._lastCloseupPrompt = '';
    await window._renderCutCloseup('neutral', 'warm', 'protagonist', 'gesture', { background: vs2.background, pcWardrobe: vs2.pc_wardrobe, pcSpecies: 'Human' }).catch(function () {});
    const dryPrompt = window._lastCloseupPrompt || '';

    return { a1, a2, mantaExp, plainExp, cuPrompt, dryPrompt };
  });

  await browser.close();
  const { a1, a2, mantaExp, plainExp, cuPrompt, dryPrompt } = R;
  const checks = [
    ['PC appearance lock includes a hairStyle field', !!(a1 && a1.hairStyle && a1.hairStyle.length)],
    ['hairStyle is STABLE across resolves (locked, no drift)', a1 && a2 && a1.hairStyle === a2.hairStyle && a1.hairColor === a2.hairColor && a1.hairLength === a2.hairLength],
    ['manta expansion adds the manta-HIDE material + Storm-cape form', /MANTA-RAY HIDE/.test(mantaExp) && /CLASPED AT BOTH SHOULDERS/.test(mantaExp) && /both wrists and both ankles/.test(mantaExp)],
    ['manta expansion adds pearls/shells + forbids seaweed/cloth/ragged', /PEARLS or SHELLS/.test(mantaExp) && /never seaweed/.test(mantaExp) && /never ordinary woven cloth/.test(mantaExp)],
    ['manta expansion is a NO-OP for a non-manta wardrobe', plainExp === 'emerald silk gown, gold drop earrings'],
    ['underwater cut-in injects UNDERWATER PHYSICS + BILLOW', /UNDERWATER PHYSICS \(HARD/.test(cuPrompt) && /BILLOW/.test(cuPrompt) && /NEVER hanging straight down/.test(cuPrompt)],
    ['underwater cut-in wardrobe carries the expanded manta canon', /MANTA-RAY HIDE/.test(cuPrompt)],
    ['dry-land cut-in does NOT inject water physics (no false-positive)', !/UNDERWATER PHYSICS/.test(dryPrompt)]
  ];

  let pass = 0, fail = 0;
  console.log('\n  RENDER CONSISTENCY — hair lock / manta cloak / underwater cut-ins  ($0)\n  ' + '─'.repeat(64));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  · locked hair: ' + (a1 ? (a1.hairLength + ' ' + a1.hairColor + ', ' + a1.hairStyle) : '(none)'));
  console.log('  ' + '─'.repeat(64) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
