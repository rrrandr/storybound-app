// ══════════════════════════════════════════════════════════════════════════════════════════
// CONTROLLED BEFORE/AFTER for _buildFlavorVarietyGuard — the changed builder, measured directly.
//
// The inputs are FROZEN IN THE TEST, not in production: one fixed play history, one fixed state.
// The same frozen history is fed to the PRE-CHANGE file and the POST-CHANGE file, and the
// builder's own returned string is compared byte for byte. Rotating exemplars live in other
// builders and cannot move this number.
//
// `node _nf_variety_guard_controlled.mjs <appjs-path>` prints the builder's output and size for
// that file; with no argument it uses the live public/app.js. The caller diffs the two.
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { configBody, isAuthOrigin, installSession, makeSession, installEntitledProfileStub }
  from './_test_session_env.mjs';

const OUT = '/Users/romantsukerman/storybound-app/_nf_variety_guard_out';
fs.mkdirSync(OUT, { recursive: true });
const LABEL = process.argv[2] || 'live';

// ── THE FROZEN HISTORY: five recent plays that repeat their values, as a real reader's would ──
const HISTORY = [
  { aPlotGoal: 'get the photographs off the venue screen before the room finishes looking, and keep her name',
    antagonist: 'Rourke, the ex who kept the photographs', liCareer: 'property developer',
    pcCareer: 'ceramicist', liArchetype: 'BEAUTIFUL_RUIN', liName: 'Julian',
    worldCustomText: 'the one who draws them forward', setting: 'a gallery', flavor: 'smalltown',
    sideCharNames: ['Dalia'], pcWoundCategory: 'PUBLIC', liWoundCategory: 'PARENTAL' },
  { aPlotGoal: 'get the photographs off the venue screen before the room finishes looking, and keep her name',
    antagonist: 'Rourke, the ex who kept the photographs', liCareer: 'property developer',
    pcCareer: 'ceramicist', liArchetype: 'BEAUTIFUL_RUIN', liName: 'Julian',
    worldCustomText: 'the one who draws them forward', setting: 'a gallery', flavor: 'smalltown',
    sideCharNames: ['Dalia'], pcWoundCategory: 'PUBLIC', liWoundCategory: 'PARENTAL' },
  { aPlotGoal: 'get the photographs off the venue screen before the room finishes looking, and keep her name',
    antagonist: 'Rourke, the ex who kept the photographs', liCareer: 'restaurateur',
    pcCareer: 'ceramicist', liArchetype: 'BEAUTIFUL_RUIN', liName: 'Julian',
    worldCustomText: 'the one who draws them forward', setting: 'a café', flavor: 'smalltown',
    sideCharNames: ['Dalia'], pcWoundCategory: 'PUBLIC', liWoundCategory: 'PARENTAL' },
  { aPlotGoal: 'get the photographs off the venue screen before the room finishes looking, and keep her name',
    antagonist: 'Rourke, the ex who kept the photographs', liCareer: 'property developer',
    pcCareer: 'archivist', liArchetype: 'ARMORED_FOX', liName: 'Julian',
    worldCustomText: 'the one who draws them forward', setting: 'a café', flavor: 'smalltown',
    sideCharNames: ['Mira'], pcWoundCategory: 'PUBLIC', liWoundCategory: 'PARENTAL' },
  { aPlotGoal: 'keep the inheritance hearing from naming her', antagonist: 'the estate solicitor',
    liCareer: 'vintner', pcCareer: 'archivist', liArchetype: 'ARMORED_FOX', liName: 'Aurel',
    worldCustomText: 'a debt coming due', setting: 'a café', flavor: 'smalltown',
    sideCharNames: ['Mira'], pcWoundCategory: 'PUBLIC', liWoundCategory: 'PARENTAL' },
];

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await installSession(page, makeSession());
await installEntitledProfileStub(page, {});
await page.route('**/api/**', async (route) => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(req.url())) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  return route.abort();
});
await page.route('**/sb-test.localhost/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 60000 });
await page.waitForFunction(() => window.state && window._buildFlavorVarietyGuard, null, { timeout: 180000 });

const out = await page.evaluate((hist) => {
  // FREEZE THE INPUT IN THE TEST: the builder reads the play history from localStorage, so the
  // same fixed five plays are written before each measurement. Nothing in production changes.
  const S = window.state;
  Object.assign(S, {
    world: 'Modern', worldSubtype: 'smalltown', flavor: 'smalltown', dynamic: 'Enemies',
    name: 'Nadia', playerName: 'Nadia', loveInterestName: 'Julian', partnerName: 'Julian',
    loveInterest: 'Male', liGender: 'male', pov: 'first_person', turnCount: 0,
    renderMode: 'literary', currentEngine: 'literary', storyId: 'variety-control',
    picks: { world: 'Modern', worldSubtype: 'smalltown', flavor: 'smalltown', dynamic: 'Enemies' },
  });
  // `sb_flavor_history` is an OBJECT KEYED BY FLAVOUR (not a flat array), and the key is the
  // one `_flavorVarietyKey` derives from state — writing a bare array produced an empty guard.
  let key = 'smalltown';
  try { if (typeof window._flavorVarietyKey === 'function') key = window._flavorVarietyKey(S) || key; } catch (_) {}
  try { localStorage.setItem('sb_flavor_history', JSON.stringify({ [key]: hist })); } catch (_) {}
  let txt = '';
  try { txt = String(window._buildFlavorVarietyGuard(S) || ''); } catch (e) { txt = 'THREW ' + e.message; }
  return { txt: txt, key: key };
}, HISTORY);
await browser.close();

const txt = out.txt || '';
const f = OUT + '/guard__' + LABEL.replace(/[^\w.-]/g, '_') + '.txt';
fs.writeFileSync(f, txt);
console.log(`[${LABEL}] flavour key "${out.key}" · _buildFlavorVarietyGuard output: ${txt.length.toLocaleString()} chars  → ${f}`);
const dup = (label, re) => {
  const m = txt.match(re);
  if (!m) return console.log(`    ${label}: (list absent)`);
  const parts = m[1].split('|').map((x) => x.trim());
  const counts = {}; parts.forEach((p) => { counts[p] = (counts[p] || 0) + 1; });
  const worst = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  console.log(`    ${label}: ${parts.length} entries, most-repeated x${worst[1]}  "${worst[0].slice(0, 58)}"`);
};
dup('A-plot goals   ', /AVOID these A-plot goals \/ shapes: ([^\n]*)/);
dup('antagonists    ', /AVOID these antagonists[^:]*: ([^\n]*)/);
dup('LI careers     ', /AVOID these LI careers[^:]*: ([^\n]*)/);
dup('PC occupations ', /AVOID these PROTAGONIST occupations[^:]*: ([^\n]*)/);
dup('LI archetypes  ', /AVOID these LI archetype variants: ([^\n]*)/);
dup('LI names       ', /AVOID these LI names[^:]*: ([^\n]*)/);
dup('customizations ', /AVOID these flavor-customizations[^:]*: ([^\n]*)/);
