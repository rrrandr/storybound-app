// DOES THE COVERAGE REACH THE NEXT SCENE? (Roman 2026-11-18)
//
// Not a unit test of the ledger — a reopen. A continuation COPY of the published Scene 3 save
// has the existing physical-attraction passage recorded into it, with the quoted evidence and
// its provenance, and is then reopened in a real browser so the next scene's AUTHOR
// INSTRUCTIONS and CRAFT OBLIGATIONS can be read off the live page.
//
// Expected: physical delivered, social and capability owed, and the first-description
// requirement reported as already satisfied.
//
// The published baseline is never touched: everything happens on a copy.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const ROOT = '/Users/romantsukerman/storybound-app/';
const BASE = ROOT + '_ft_scene3_published/RESUMABLE_STATE.json';
const COPY = ROOT + '_ft_fixtures/scene4_coverage.json';
const PORT = 3990;
let n = 0, bad = 0;
const ck = (nm, c, d) => { n += 1; if (!c) { bad += 1; console.log('  ✗ ' + nm + (d ? ('  — ' + String(d).slice(0, 260)) : '')); } else console.log('  ✓ ' + nm); };

// ── THE PASSAGE, TAKEN FROM THE PUBLISHED PAGE ───────────────────────────────────────────
const PAGE = fs.readFileSync(ROOT + '_FT_SCENE3_PUBLISHED.txt', 'utf8');
const start = PAGE.indexOf('I had prepared myself to dislike');
const end = PAGE.indexOf('finish the thought.', start);
const PHYS = PAGE.slice(start, end + 'finish the thought.'.length);
if (!PHYS) { console.error('could not locate the physical passage on the published page'); process.exit(2); }
const WHY = 'his mouth interrupts the dislike she had prepared for him; the attraction '
  + 'contradicts her position without softening it';

// ── THE CONTINUATION COPY ────────────────────────────────────────────────────────────────
const dump = JSON.parse(fs.readFileSync(BASE, 'utf8'));
const saved = JSON.parse(String(dump.storage.sb_saved_story));
const snap = saved.stateSnapshot;
console.log('the baseline save: issueIndexInRun=' + snap.issueIndexInRun
  + '  issueNumber=' + JSON.stringify(snap.issueNumber) + '  turnCount=' + snap.turnCount);

// RECORD THE BEAT exactly as the live credit path would: the same shape, the same provenance,
// and the passage copied from the page rather than retyped.
snap._liAdmirationLedger = {
  storyId: String(snap.storyId || ''),
  issue: (Number.isInteger(snap.issueIndexInRun) && snap.issueIndexInRun > 0) ? snap.issueIndexInRun : 1,
  issueKey: 'issueIndexInRun',
  areas: {
    physical: { status: 'delivered', beats: [{ scene: 3, passage: PHYS, why: WHY,
      via: 'author-passage', semanticallyVerified: false,
      recordedAt: new Date().toISOString() }] },
    social: { status: 'owed', beats: [] },
    capability: { status: 'owed', beats: [] },
  },
};
saved.stateSnapshot = snap;
dump.storage.sb_saved_story = JSON.stringify(saved);
fs.writeFileSync(COPY, JSON.stringify(dump, null, 2));
console.log('recorded into the COPY: physical delivered (scene 3, author-passage)');
console.log('  evidence: "' + PHYS.slice(0, 96) + '…"');
console.log('  compelling: ' + WHY + '\n');
ck('the published baseline is unchanged',
  JSON.parse(fs.readFileSync(BASE, 'utf8')).storage.sb_saved_story !== dump.storage.sb_saved_story);

// ── SERVE AND REOPEN ─────────────────────────────────────────────────────────────────────
const slog = ROOT + '_ft_scene4_coverage_static.log';
try { fs.unlinkSync(slog); } catch (_) {}
const srv = spawn('node', [ROOT + '_ft_static_server.mjs'], { cwd: ROOT,
  env: Object.assign({}, process.env, { PORT: String(PORT) }) });
const sw = fs.createWriteStream(slog); srv.stdout.pipe(sw); srv.stderr.pipe(sw);
let up = false;
for (let i = 0; i < 60 && !up; i++) {
  await new Promise((r) => setTimeout(r, 250));
  let t = ''; try { t = fs.readFileSync(slog, 'utf8'); } catch (_) {}
  if (/listening|serving/i.test(t)) up = true; else if (/CANNOT BIND|EADDRINUSE/i.test(t)) break;
}
if (!up) { console.error('static server did not bind ' + PORT); srv.kill('SIGTERM'); process.exit(2); }

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await ctx.route('**/api/**', (route) => route.fulfill({ status: 200,
  contentType: 'application/json', body: JSON.stringify({ ok: true, offline: true }) }));
const pageLogs = [];
page.on('console', (m) => { const t = m.text(); if (/LI-ADMIRE|ADMIRATION/i.test(t)) pageLogs.push(t); });

await page.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.evaluate((d) => { Object.keys(d).forEach((k) => { try { localStorage.setItem(k, d[k]); } catch (_) {} }); }, dump.storage);
await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => typeof window.continueStory === 'function', null, { timeout: 120000 });
const resumed = await page.evaluate(async (sid) => {
  try { await window.continueStory(sid); } catch (e) { return { threw: e.message }; }
  const s = window.state || {};
  return { pages: window.StoryPagination.getPageCount(), turnCount: s.turnCount || 0,
    issueIndexInRun: s.issueIndexInRun, issueNumber: s.issueNumber === undefined ? null : s.issueNumber,
    ledger: s._liAdmirationLedger || null };
}, dump.storyId);
console.log('\nREOPENED: pages=' + resumed.pages + ' turnCount=' + resumed.turnCount
  + ' issueIndexInRun=' + resumed.issueIndexInRun);
ck('the copy reopened with the recorded coverage intact',
  !resumed.threw && resumed.ledger && resumed.ledger.areas
  && resumed.ledger.areas.physical.status === 'delivered',
  JSON.stringify(resumed).slice(0, 220));
ck('the recorded evidence survived the reopen',
  !!resumed.ledger && String(resumed.ledger.areas.physical.beats[0].passage || '')
    .indexOf('My attention caught on his mouth') !== -1);
ck('and its provenance survived',
  !!resumed.ledger && resumed.ledger.areas.physical.beats[0].via === 'author-passage',
  resumed.ledger && resumed.ledger.areas.physical.beats[0].via);
ck('the ledger says it is keyed on issueIndexInRun',
  !!resumed.ledger && resumed.ledger.issueKey === 'issueIndexInRun');

// ── WHAT THE NEXT SCENE'S AUTHOR IS TOLD ─────────────────────────────────────────────────
const live = await page.evaluate(() => {
  const out = { owed: null, firstDone: null, directive: null, obligations: null, err: null };
  try {
    out.owed = window._liAdmireOwed(window.state);
    out.firstDone = window._liAdmireFirstPhysicalDone(window.state);
    const d = (typeof window.buildLiAttractionTextureDirective === 'function')
      ? window.buildLiAttractionTextureDirective() : '';
    const i = d.indexOf('ADMIRATION COVERAGE');
    out.directive = i === -1 ? null : d.slice(i, d.indexOf('SEPARATE FROM PICTURABILITY', i) + 220);
  } catch (e) { out.err = e.message; }
  return out;
});
console.log('\n  live: owed=' + JSON.stringify(live.owed) + '  firstPhysicalDone=' + live.firstDone
  + (live.err ? ('  err=' + live.err) : ''));
ck('the live ledger reports physical delivered', Array.isArray(live.owed)
  && live.owed.indexOf('physical') === -1, JSON.stringify(live.owed));
ck('social and capability are still owed',
  Array.isArray(live.owed) && live.owed.join(',') === 'social,capability', JSON.stringify(live.owed));
ck('the first-description requirement reports as satisfied', live.firstDone === true);

console.log('\n' + '═'.repeat(74));
console.log('THE NEXT SCENE’S AUTHOR INSTRUCTIONS, FROM THE REOPENED SAVE');
console.log('═'.repeat(74));
console.log(live.directive || '(the directive did not render — see err above)');
console.log('═'.repeat(74));
ck('the author is told the first physical description already landed',
  !!live.directive && /already landed/.test(live.directive));
ck('and is NOT asked for another one',
  !!live.directive && !/FIRST PHYSICAL DESCRIPTION \(HARD\)/.test(live.directive));
ck('the owed list names social and capability only',
  !!live.directive && /STILL OWED THIS ISSUE: SOCIAL, CAPABILITY/.test(live.directive));
ck('picturability is still held apart',
  !!live.directive && /SEPARATE FROM PICTURABILITY/.test(live.directive));

// ── THE CRAFT OBLIGATIONS THE EDITOR WOULD RECEIVE ───────────────────────────────────────
const obs = await page.evaluate(() => {
  const owed = window._liAdmireOwed(window.state);
  const li = (window.state && window.state.liName) || 'the LI';
  const ask = {
    physical: 'something about ' + li + '’s body, face, voice or movement that provokes a PRIVATE response in the PC',
    social: 'how ' + li + ' handles people — commanding attention, showing consideration, holding ground — which the PC secretly admires',
    capability: li + ' doing something WELL, demonstrated in action in this draft, which the PC privately responds to',
  };
  return owed.map((area) => ({ id: 'liadmire:' + area, kind: 'li_admiration', due: 'this_issue',
    ask: 'QUOTE the passage in this draft that delivers ' + area + ' admiration — ' + ask[area]
      + ' — and say what the PC finds compelling in it.' }));
});
console.log('\nTHE CRAFT OBLIGATIONS FOR THE NEXT SCENE');
obs.forEach((o) => console.log('  ' + o.id + '  — ' + o.ask.replace(/\s+/g, ' ').slice(0, 150)));
ck('exactly two obligations are raised', obs.length === 2, JSON.stringify(obs.map((o) => o.id)));
ck('no physical obligation is raised again',
  !obs.some((o) => o.id === 'liadmire:physical'), JSON.stringify(obs.map((o) => o.id)));

// ── THE TWO ISSUE KEYS BEHAVE DIFFERENTLY ────────────────────────────────────────────────
console.log('\nADVANCING THE ISSUE vs RENUMBERING THE ANTHOLOGY');
const keys = await page.evaluate(() => {
  const s = window.state;
  const before = { idx: s.issueIndexInRun, num: s.issueNumber,
    owed: window._liAdmireOwed(s).join(',') };
  // (1) the anthology id is allocated/changed — the reader is in the SAME issue
  s.issueNumber = 4211;
  const renumbered = { num: s.issueNumber, owed: window._liAdmireOwed(s).join(','),
    firstDone: window._liAdmireFirstPhysicalDone(s) };
  // (2) the run advances to the next issue
  s.issueIndexInRun = (Number(before.idx) || 1) + 1;
  const advanced = { idx: s.issueIndexInRun, owed: window._liAdmireOwed(s).join(','),
    firstDone: window._liAdmireFirstPhysicalDone(s) };
  return { before, renumbered, advanced };
});
console.log('  before     : issueIndexInRun=' + keys.before.idx + ' issueNumber='
  + JSON.stringify(keys.before.num) + '  owed=' + keys.before.owed);
console.log('  renumbered : issueNumber=' + keys.renumbered.num + '  owed=' + keys.renumbered.owed
  + '  firstPhysicalDone=' + keys.renumbered.firstDone);
console.log('  advanced   : issueIndexInRun=' + keys.advanced.idx + '  owed=' + keys.advanced.owed
  + '  firstPhysicalDone=' + keys.advanced.firstDone);
ck('renumbering the anthology leaves this issue’s coverage intact',
  keys.renumbered.owed === keys.before.owed && keys.renumbered.firstDone === true,
  JSON.stringify(keys.renumbered));
ck('advancing issueIndexInRun RENEWS coverage',
  keys.advanced.owed === 'physical,social,capability', keys.advanced.owed);
ck('and the first-description requirement goes live again for the new issue',
  keys.advanced.firstDone === false);

if (pageLogs.length) {
  console.log('\n  page logs: ');
  pageLogs.slice(0, 6).forEach((l) => console.log('    ' + l.slice(0, 150)));
}
fs.writeFileSync(ROOT + '_FT_SCENE4_COVERAGE.json', JSON.stringify({
  recorded: { area: 'physical', scene: 3, passage: PHYS, why: WHY, via: 'author-passage' },
  reopened: { owed: live.owed, firstPhysicalDone: live.firstDone },
  authorInstructions: live.directive, obligations: obs, issueKeys: keys,
  checks: { total: n, failed: bad },
}, null, 2));

await browser.close();
srv.kill('SIGTERM');
await new Promise((r) => setTimeout(r, 400));
console.log('\n  ' + (n - bad) + '/' + n + ' checks passed');
console.log('  OFFLINE — every API route was stubbed; no provider was contacted, nothing was generated.');
process.exit(bad ? 1 : 0);
