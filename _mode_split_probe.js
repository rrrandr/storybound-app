// MODE-SPLIT VALIDATION — verify the SAME real image in structural vs cosmetic vs full mode and
// confirm each mode reports ONLY its own defect class. Uses saved cond images (no image gen; ~3 verify calls).
const { chromium } = require('playwright-core');
const fs = require('fs');
const IMG = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/80c638ef-dc45-46dc-ad83-43ad5d0e1a40/scratchpad/cond_test3_transform_final.png';
const STRUCTURAL = ['species_anatomy','body_plan','gender','extra_person','extra_hand','extra_limb','kwisheen_face'];
const COSMETIC = ['eye_color','skin_pattern','jewelry','weapon','wardrobe','held_prop','sacrifice_mark','wish_burst_anchor'];

(async () => {
  const b64 = 'data:image/png;base64,' + fs.readFileSync(IMG).toString('base64');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._verifyPanelAnatomy === 'function', { timeout: 40000 });

  const canon = [{ name: 'the transforming woman', species: 'human-becoming-kwisheen',
    body_plan: 'human upper body; lower body mid-transformation from legs into a tentacle mantle',
    gender: 'female', weapon: '', armor: 'torn tunic', injuries: 'LEFT hand sacrificed — a dark shadow-stump at the left wrist' }];

  const run = (mode) => page.evaluate(async ({ b64, canon, mode }) => {
    window.state._playerSpecies = 'Human'; window.state._liSpecies = 'Kwisheen';
    const v = await window._verifyPanelAnatomy(b64, '', false, { expectedPeople: 1, canon, authorized: [], wishAnchor: "the woman's right hand", mode });
    return { defect_type: v.defect_type, priority: v.priority, pass: v.pass, filteredOut: v._modeFilteredOut || null, reason: v.reason || null, violations: (v.violations||[]).length };
  }, { b64, canon, mode });

  const full = await run(undefined);
  const structural = await run('structural');
  const cosmetic = await run('cosmetic');

  const show = (label, r) => console.log('  ' + label.padEnd(12) + 'defect=' + (r.defect_type || 'none') + (r.priority ? '/P' + r.priority : '') +
    ' pass=' + r.pass + (r.filteredOut ? ' [filtered-out: ' + r.filteredOut + ']' : '') + ' | ' + (r.reason || ''));
  console.log('\n  MODE-SPLIT (image: test3 transform final — has body-plan/topology + sacrifice-stain defects)');
  console.log('  ' + '─'.repeat(66));
  show('FULL:', full); show('STRUCTURAL:', structural); show('COSMETIC:', cosmetic);
  const inSet = (d, set) => !d || set.indexOf(d) !== -1;
  const P = (n, c) => console.log((c ? '  PASS ' : '  FAIL ') + n);
  console.log('  ── contract checks ──');
  P('structural mode emits only structural (or none)', inSet(structural.defect_type, STRUCTURAL));
  P('cosmetic mode emits only cosmetic (or none)', inSet(cosmetic.defect_type, COSMETIC));
  P('cosmetic mode does NOT re-flag structural', !(cosmetic.defect_type && STRUCTURAL.indexOf(cosmetic.defect_type) !== -1));
  console.log('  ' + '─'.repeat(66) + '\n');
  await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(2); });
