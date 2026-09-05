// PRESENCE-GATE TEST — $0 (spec construction only; the live verify at the end is ~$0.002).
// Reproduces the exact failure the smoke gate hit: a crop containing ONE character, canon = Human,
// in a story whose LI species is Kwisheen. Before the gate the spec carried the KWISHEEN rule and
// the verifier replied "Human legs were drawn; canon requires a tentacle mantle for a Kwisheen."
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');

const DIR = process.env.DIR || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/structref_ab';
const MIRA_CROP = 'kwisheen__kw_combat__refs_on__CROP_mira.png';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._structuralIdentitySpec === 'function', { timeout: 40000 });

  const specs = await page.evaluate(() => {
    // A Kwisheen story — the global state that used to leak into every panel.
    window.state._playerSpecies = 'Human';
    window.state._liSpecies = 'Kwisheen';
    return {
      soloHuman: window._structuralIdentitySpec([{ name: 'Mira', species: 'Human' }]),
      mixed:     window._structuralIdentitySpec([{ name: 'Mira', species: 'Human' }, { name: 'Vael', species: 'Kwisheen' }]),
      noCanon:   window._structuralIdentitySpec()          // legacy fallback
    };
  });

  const has = (s, t) => s.indexOf(t) !== -1;
  const checks = [
    ['solo-human panel OMITS the Kwisheen rule',       !has(specs.soloHuman, 'KWISHEEN —')],
    ['solo-human panel KEEPS the human rule',           has(specs.soloHuman, 'HUMAN —')],
    ['solo-human panel carries the SCOPE fence',        has(specs.soloHuman, 'SCOPE:')],
    ['mixed panel INCLUDES the Kwisheen rule',          has(specs.mixed, 'KWISHEEN —')],
    ['mixed panel INCLUDES the human rule',             has(specs.mixed, 'HUMAN —')],
    ['no-canon fallback still emits Kwisheen (legacy)', has(specs.noCanon, 'KWISHEEN —')],
    ['no-canon fallback has NO scope fence',           !has(specs.noCanon, 'SCOPE:')]
  ];
  console.log('SPEC CONSTRUCTION\n' + '─'.repeat(58));
  checks.forEach(([label, ok]) => console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`));

  console.log('\n  solo-human spec, verbatim:');
  specs.soloHuman.split('\n').forEach(l => console.log('    | ' + l.slice(0, 150)));

  // Live re-verify of the exact crop that produced the false positive (~$0.002).
  let live = null;
  const p = path.join(DIR, MIRA_CROP);
  if (fs.existsSync(p)) {
    const b64 = fs.readFileSync(p).toString('base64');
    live = await page.evaluate(async ({ b64 }) => {
      const v = await window._verifyPanelAnatomy('data:image/png;base64,' + b64, 'medium', false, {
        mode: 'structural', expectedPeople: 1,
        canon: [{ name: 'Mira', species: 'Human', position: 'center' }], authorized: null, wishAnchor: null
      });
      return { pass: v && v.pass, defect: (v && v.defect_type) || null, reason: String((v && v.reason) || '').slice(0, 220) };
    }, { b64 });
    console.log('\nLIVE RE-VERIFY — the crop that failed 3/3 in both arms\n' + '─'.repeat(58));
    console.log(`  pass=${live.pass}  defect=${live.defect || '—'}`);
    if (live.reason) console.log(`  reason: ${live.reason}`);
    console.log(`\n  ${live.pass !== false ? 'PASS — the false positive is gone.' : 'STILL FAILING — read the reason above.'}`);
  } else {
    console.log('\n(crop not found — skipping live re-verify)');
  }

  const allPass = checks.every(([, ok]) => ok) && (!live || live.pass !== false);
  await browser.close();
  process.exit(allPass ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
