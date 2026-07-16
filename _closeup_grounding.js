// $0 verification that the PC-gesture closeup render is now grounded in the
// scene (no default glass), the PC wardrobe (no leather-bracer leak), and the
// PC species (no human-hand→tentacle blend). Stubs the image call to capture
// the built prompt + cacheKey without a paid render.
const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/grok-image**', '**/api/visualize-flux**'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  const logs = [];
  page.on('console', m => logs.push(m.text()));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._renderCutCloseup === 'function', { timeout: 40000 });

  const R = await page.evaluate(async () => {
    const s = window.state;
    s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen';
    s._stagedCloseupCache = {};
    const vs = {
      background: 'Gloamwater Bay depths, silt currents under filtered moonlight',
      pc_wardrobe: 'linen shift billowing in current, water-breathing talisman on a cord at throat',
      lighting: 'cool'
    };
    s._stagedActive = s._stagedActive || {};
    s._stagedActive.plan = { visualState: vs };

    // The internal image call resolves to the closure binding (not window), so we
    // read the prompt via the _lastCloseupPrompt diagnostic hook the builder stashes.
    window._lastCloseupPrompt = '';
    await window._renderCutCloseup('neutral', 'cool', 'protagonist', 'gesture',
      { background: vs.background, pcWardrobe: vs.pc_wardrobe, pcSpecies: 'Human' }).catch(function () {});
    return { prompt: window._lastCloseupPrompt || '', completed: (window._lastCloseupPrompt || '').length > 0 };
  });

  await browser.close();
  const p = R.prompt;
  const cacheLog = logs.find(l => /\[STAGED:CUT\] Cache MISS — generating closeup/.test(l)) || '';
  const checks = [
    ['closeup prompt was built', R.completed && p.length > 0],
    ['SCENE SETTING grounding present (names the underwater setting)', /SCENE SETTING \(HARD/.test(p) && /Gloamwater Bay depths/.test(p) && /belongs entirely to THIS setting/.test(p)],
    ['WARDROBE grounding present (PC linen + talisman, refs=linework-only)', /PROTAGONIST WARDROBE \(HARD/.test(p) && /water-breathing talisman/.test(p) && /inform LINEWORK and shading ONLY — never clothing/.test(p)],
    ['SPECIES lock present (positive HUMAN hand, five fingers)', /PROTAGONIST SPECIES \(HARD\): the protagonist is HUMAN/.test(p) && /five fingers, human skin/.test(p)],
    ['grounding is POSITIVE-ONLY (no negation-attractor nouns: glass/leather/tentacle/steering)', !/glass|leather|tentacle|steering wheel/i.test(p.split('SCENE SETTING')[1] || '')],
    ['old hardcoded "a glass edge" prop REMOVED from subjectDesc', !/a glass edge/.test(p)],
    ['cacheKey uses pc_reaction (NOT an LI signature gesture like glass_rim)', /pc_reaction/.test(cacheLog) && !/glass_rim/.test(cacheLog)],
    ['cacheKey carries scene-context token (gloamwat_human)', /gloamwat_human/.test(cacheLog)]
  ];

  let pass = 0, fail = 0;
  console.log('\n  CLOSEUP GROUNDING  ($0)\n  ' + '─'.repeat(58));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  if (cacheLog) console.log('  · cacheKey log: ' + cacheLog.replace(/^.*generating closeup /, '').slice(0, 70));
  console.log('  ' + '─'.repeat(58) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
