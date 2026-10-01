// NARRATIVE-INDEX SEAM PARITY CONTROL. Provider-free, no network, $0.
//
// The seam is PREPARATION, not separation: currentNarrativeIssueIndex() returns the paid-unit
// index exactly, so behaviour must be identical by construction. This control proves that
// identity, and pins which consumers read which index so the split cannot later half-happen.
//
// STATIC sections run FIRST, before any browser, so a build without the seam reports clean named
// failures instead of dying in waitForFunction. (Both this control and the anchor control did
// exactly that on their first bite check — a valid RED, a useless diagnostic.)
//
// It deliberately does NOT invoke _advanceToNextIssueIfNeeded: that boundary reaches the real
// cover renderer and synopsis refresh through closure variables, not window, so it cannot be
// stubbed and driving it would mean running real generation. Those behaviours are pinned
// statically instead — the honest tool for "this code did not change".
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const SRC = fs.readFileSync('public/app.js', 'utf8');

console.log('=== NARRATIVE-INDEX SEAM PARITY (no network, $0) ===\n');

console.log('A. the seam is a pure delegation — no new logic  [STATIC]');
const seamAt = SRC.indexOf('function currentNarrativeIssueIndex()');
t('the seam exists', seamAt >= 0);
const seam = seamAt >= 0 ? SRC.slice(seamAt, seamAt + 180) : '';
t('its body returns _currentIssueIndex() and nothing else',
  /function currentNarrativeIssueIndex\(\) \{\s*return _currentIssueIndex\(\);/.test(seam),
  seam.slice(0, 90));
t('it declares no transition, terminal, or new state',
  seamAt >= 0 && !/issueIndexInRun\s*=|_narrativeIssue|terminal/.test(seam));

console.log('\nB. EVERY issueArcs index read goes through the seam  [STATIC]');
// The invariant that makes the later split a one-line change: no issueArcs[i] may be indexed by a
// value derived from the paid index. (issueArcs[0] literals in the devtools readout aren't reads.)
const lines = SRC.split('\n');
const arcLines = lines.map((l, i) => ({ n: i + 1, l }))
  .filter(x => /issueArcs\[/.test(x.l) && !/issueArcs\[0\]/.test(x.l) && !/^\s*\/\//.test(x.l));
console.log('   ' + arcLines.length + ' indexed issueArcs reads at lines: ' + arcLines.map(x => x.n).join(', '));
t('there are indexed issueArcs reads to check', arcLines.length >= 7, 'found=' + arcLines.length);
arcLines.forEach(x => {
  const m = x.l.match(/issueArcs\[\s*([A-Za-z_$][\w$]*)\s*-\s*1\s*\]/);
  if (!m) { t('  line ' + x.n + ' indexes from the narrative seam', false, 'index not a simple var'); return; }
  const v = m[1].replace('$', '\\$');
  const win = lines.slice(Math.max(0, x.n - 9), x.n).join('\n');
  const ok = new RegExp('\\b' + v + '\\s*=\\s*\\(?\\s*typeof currentNarrativeIssueIndex|\\b' + v + '\\s*=\\s*currentNarrativeIssueIndex\\(').test(win);
  t('  line ' + x.n + ' indexes from the narrative seam', ok, m[1] + ' not assigned from the seam');
});

console.log('\nC. billing consumers still read the PAID index  [STATIC]');
// A named list, so a later change that quietly moves one of these goes red.
[['preview/paywall idempotency', /state\.previewActive && _currentIssueIndex\(\) === 1/],
 ['next-issue label', /return 'Issue ' \+ \(\(typeof _currentIssueIndex/],
 ['state.nextIssueNumber', /state\.nextIssueNumber = \(typeof _currentIssueIndex/],
 ['issue-one claim', /_currentIssueIndex\(\) === 1 && state\.issueNumber == null/],
 ['begin-button charge', /_issueIdxBegin = _issueAppliesBegin && \(typeof _currentIssueIndex/],
 ['charge-declined (CG)', /charge declined for issue ' \+ _currentIssueIndex\(\)/],
 ['refund popup issue match', /state\._issuePurchaseIssueIndex === _currentIssueIndex\(\)/],
 ['first-scene-of-later-issue gate', /_currentIssueIndex\(\) > 1/]
].forEach(([name, rx]) => t('`' + name + '` still on the paid index', rx.test(SRC)));

console.log('\nD. ambiguous consumers are UNCHANGED, pending a decision  [STATIC]');
[['relationship-span index', /var idx = issueIndex \|\| \(function \(\) \{ try \{ return \(typeof _currentIssueIndex/],
 ['cliffhanger-family memo key', /var ii = \(typeof _currentIssueIndex === 'function'\) \? _currentIssueIndex\(\) : \(s\.issueIndexInRun \|\| 1\);/],
 ['secret-quest selection', /var issue = \(typeof _currentIssueIndex === 'function'\) \? _currentIssueIndex\(\) : 1;[\s\S]{0,80}byScope/],
 ['descLedger issue key', /var key = String\(s\.storyId \|\| ''\) \+ ':' \+ \(s\.issueIndexInRun \|\| 1\);/],
 ['embodiment-ledger stamp', /issueIndex:\s*\(typeof _currentIssueIndex === 'function'\) \? _currentIssueIndex\(\) : null/]
].forEach(([name, rx]) => t('`' + name + '` left on the paid index', rx.test(SRC)));

console.log('\nE. the paid-unit boundary is unchanged  [STATIC]');
const b0 = SRC.indexOf('function _advanceToNextIssueIfNeeded(');
const body = b0 >= 0 ? SRC.slice(b0, SRC.indexOf('window._advanceToNextIssueIfNeeded', b0)) : '';
t('boundary body located', body.length > 0);
t('still computes the index from scene count', /Math\.floor\(sceneIndex \/ pricing\.scenesPerIssue\) \+ 1/.test(body));
t('still renders the prior issue cover', /_autoRenderIssueCover\('issue_boundary'\)/.test(body));
t('still refreshes the back-cover synopsis', /_refreshBackCoverSynopsisAtIssueEnd\('issue_boundary'\)/.test(body));
t('still ticks the secret quest', /_advanceFatelandsMysteryForIssue\(\)/.test(body));
t('still clears purchase status so the next charge fires',
  /_issuePurchaseStatus = null/.test(body) && /_issuePurchaseOpId = null/.test(body)
  && /_issuePurchasedAmount = 0/.test(body));
t('still writes the PAID counter, never a narrative one',
  /state\.issueIndexInRun = idxFromScene/.test(body) && !/currentNarrativeIssueIndex/.test(body));

// ══════════════════════════════════════════════════════════════════
// BEHAVIOURAL: the accessor equals the paid index, at every value.
// ══════════════════════════════════════════════════════════════════
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._currentIssueIndex === 'function'
  || typeof window.state === 'object', { timeout: 20000 });

const installed = await page.evaluate(() => typeof window.currentNarrativeIssueIndex);
console.log('\nF. the seam is installed and reachable  [BEHAVIOURAL]');
t('window.currentNarrativeIssueIndex is a function', installed === 'function', 'typeof=' + installed);

if (installed !== 'function') {
  console.log('\n  the narrative seam is NOT installed — parity cannot be measured.');
  await browser.close();
  console.log('\n' + pass + '/' + (pass + fail) + ' passed');
  process.exit(1);
}

const r = await page.evaluate(() => {
  const out = { pairs: [] };
  window.state = window.state || {};
  [undefined, null, 0, 1, 2, 5, 9, 37].forEach((v) => {
    if (v === undefined) delete window.state.issueIndexInRun; else window.state.issueIndexInRun = v;
    out.pairs.push({ set: v === undefined ? 'unset' : v,
      narrative: window.currentNarrativeIssueIndex(),
      paid: (window.state.issueIndexInRun) || 1 });
  });
  window.state.issueIndexInRun = 3;
  const before = Object.keys(window.state).sort().join(',');
  window.currentNarrativeIssueIndex(); window.currentNarrativeIssueIndex();
  out.stateKeysTouched = (before === Object.keys(window.state).sort().join(',')) ? 'none' : 'CHANGED';
  out.pure = window.currentNarrativeIssueIndex() === 3 && window.state.issueIndexInRun === 3;
  return out;
});
await browser.close();

console.log('\nG. the accessor equals the paid-unit index at every value  [BEHAVIOURAL]');
r.pairs.forEach(p => t('issueIndexInRun=' + p.set + ' → narrative=' + p.narrative + ' paid=' + p.paid,
  p.narrative === p.paid, 'narrative=' + p.narrative + ' paid=' + p.paid));
t('the seam adds no state key', r.stateKeysTouched === 'none', r.stateKeysTouched);
t('the seam is read-only', r.pure === true);

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
