// NO-SPEND DIAGNOSIS. Identifies the TERMINAL AUTHOR request among the app's provider calls by
// capturing every body with its declared role, rather than inferring from size or position.
// Every network request is aborted: nothing leaves the machine.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';

const OUT = '_tempt_fate_fixtures/fsc_diagnosis_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
const calls = [];
// Narrow pattern only: routing '**/*' and continuing assets broke page load (the only
// captured call was a CSP report). Intercept provider endpoints, leave everything else alone.
await page.route('**/api/**', async (route) => {
  const req = route.request();
  let body = null;
  try { body = req.postData(); } catch (_) {}
  calls.push({ n: calls.length, url: req.url(), bytes: body ? body.length : 0, body });
  try { await route.abort(); } catch (_) {}
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._fscCompileAndPersist === 'function', { timeout: 20000 });

const info = await page.evaluate(async (wish) => {
  const o = {};
  window.state = window.state || {};
  const rec = window._fscCompileAndPersist(wish, { source: 'diagnosis' });
  o.outcomeId = rec && rec.outcomeId;
  o.block = window._fscPromptBlock ? window._fscPromptBlock() : '';
  try {
    await Promise.race([window._runCGScreenplayGen(1, '', ''), new Promise(r => setTimeout(r, 25000))]);
  } catch (e) { o.genErr = String(e && e.message); }
  return o;
}, 'I want to disappear.');
await browser.close();

console.log('=== NO-SPEND DIAGNOSIS — terminal author request ===\n');
console.log('  compiled outcome : ' + info.outcomeId);
console.log('  POST /api/ calls : ' + calls.length + '   (all aborted, $0 spent)\n');

const rows = calls.map(c => {
  let roleTag = null, role = null, model = null, msgs = null, sysHead = '';
  try {
    const j = JSON.parse(c.body);
    role = j.role || null; model = j.model || j._sbModelOverride || null;
    msgs = Array.isArray(j.messages) ? j.messages.length : null;
    roleTag = j.roleTag || null;
    const sys = (j.messages || []).find(m => m.role === 'system');
    sysHead = sys ? String(sys.content).slice(0, 90).replace(/\s+/g, ' ') : '';
  } catch (_) {}
  return { n: c.n, bytes: c.bytes, url: c.url.replace('http://localhost:3000', ''),
           role, roleTag, model, msgs, sysHead, body: c.body };
});

// The terminal AUTHOR request: the one carrying the production scene-authoring instruction stack.
const AUTHOR_MARKERS = [/FORBIDDEN INVENTIONS/i, /You are (?:the )?(?:prose )?author/i,
  /SCENE DIRECTIVES/i, /write the scene/i, /DIRECTIVE/];
rows.forEach(r => {
  r.authorScore = AUTHOR_MARKERS.reduce((n, rx) => n + (rx.test(r.body || '') ? 1 : 0), 0);
  r.hasConsequence = /PRESELECTED CONSEQUENCE/.test(r.body || '');
  r.hasWeave = /FATE SCENARIO WEAVE/.test(r.body || '');
});

console.log('   #   bytes   role                    msgs  authorMarks  consequence  weave  endpoint');
rows.forEach(r => console.log('  ' + String(r.n).padStart(2) + '  ' + String(r.bytes).padStart(7)
  + '   ' + String(r.role || '-').padEnd(22) + '  ' + String(r.msgs || '-').padStart(4)
  + '  ' + String(r.authorScore).padStart(11) + '  ' + String(r.hasConsequence).padStart(11)
  + '  ' + String(r.hasWeave).padStart(5) + '  ' + r.url));

const authorCalls = rows.filter(r => r.authorScore >= 2).sort((a, b) => b.bytes - a.bytes);
console.log('\n  candidate author requests (>=2 markers): ' + authorCalls.length);
const terminal = authorCalls[0] || rows.slice().sort((a, b) => b.bytes - a.bytes)[0];
if (terminal) {
  console.log('\n  TERMINAL AUTHOR REQUEST: #' + terminal.n + '  ' + terminal.bytes + ' bytes  role='
    + terminal.role + '  msgs=' + terminal.msgs);
  console.log('    system head : ' + terminal.sysHead);
  console.log('    carries the compiled consequence : ' + terminal.hasConsequence);
  console.log('    carries the legacy Fate weave    : ' + terminal.hasWeave);
  fs.writeFileSync(path.join(OUT, 'terminal_author_request.json'), terminal.body || '');
}
fs.writeFileSync(path.join(OUT, 'all_calls.json'), JSON.stringify(
  rows.map(({ body, ...r }) => r), null, 2));
fs.writeFileSync(path.join(OUT, 'compiled_block.txt'), info.block || '');
console.log('\n  evidence: ' + OUT);
