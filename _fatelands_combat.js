// $0 verification of the Fatelands species-native combat directives + gating.
const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/grok-image**', '**/api/visualize-flux**'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._buildFatelandsCombatDirective === 'function', { timeout: 40000 });

  const R = await page.evaluate(() => {
    const s = window.state;
    const build = (sp, apGoal) => { s._liSpecies = sp; s._playerSpecies = 'Human'; s._stagedActive = null; s.aPlot = { goal: apGoal, antagonistOrAntiForce: '' }; s._sceneWant = ''; s.ffContract = null; s.cgScaffold = null; s.currentCrisis = ''; return window._buildFatelandsCombatDirective() || ''; };
    return {
      kwCombat: build('Kwisheen', 'survive the ambush and fight off the raider with a blade'),
      ffCombat: build('First Favored', 'win the duel before the guards arrive'),
      kwPeace: build('Kwisheen', 'reconcile with her estranged mother over a quiet dinner'),
      humanCombat: (function () { s._liSpecies = 'Human'; s._playerSpecies = 'Human'; s.aPlot = { goal: 'survive the ambush and fight', antagonistOrAntiForce: '' }; s._stagedActive = null; s.ffContract = null; s.cgScaffold = null; return window._buildFatelandsCombatDirective() || ''; })()
    };
  });
  await browser.close();

  const checks = [
    ['Kwisheen + combat → Many-Tide Method directive', /THE MANY-TIDE METHOD/.test(R.kwCombat) && /spear or trident/i.test(R.kwCombat) && /Breaking the Mask/i.test(R.kwCombat)],
    ['Kwisheen NEVER uses ranged weapons (bow/sling) underwater', /NO RANGED WEAPONS/.test(R.kwCombat) && /NEVER uses a bow or a sling/.test(R.kwCombat)],
    ['Kwisheen human-passing + death-break stigma present', /PASSING AS HUMAN/.test(R.kwCombat) && /shameful and politically reckless/.test(R.kwCombat)],
    ['First Favored + combat → Unveiled Hand directive', /THE UNVEILED HAND/.test(R.ffCombat) && /NAME it/.test(R.ffCombat) && /NAMING.*ALIGNMENT.*REVELATION/s.test(R.ffCombat)],
    ['First Favored weapons: Vowstaff + Open Blade', /VOWSTAFF/.test(R.ffCombat) && /OPEN BLADE/.test(R.ffCombat)],
    ['First Favored DO use slings and bows (unlike Kwisheen)', /use SLINGS and BOWS for distance/.test(R.ffCombat)],
    ['non-combat scene → no combat directive (no bloat)', R.kwPeace === ''],
    ['no Kwisheen/First-Favored present → no directive', R.humanCombat === '']
  ];
  let pass = 0, fail = 0;
  console.log('\n  FATELANDS SPECIES-NATIVE COMBAT  ($0)\n  ' + '─'.repeat(58));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  ' + '─'.repeat(58) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
