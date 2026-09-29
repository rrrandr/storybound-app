// SEED-PROSE RECONCILIATION CONTROL. Provider-free, every network call aborted.
//
// Proves the precedence-and-provenance rule on the real First Sacrifice scene row:
//   the FULL SEED REMAINS STORED, and the unsupported cost / wish-causation clauses
//   CANNOT REACH THE WRITER.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const SUPPRESSED = ['the cost is still uncounted', 'The price has not yet been named',
  'the words came true and everyone can see how'];

console.log('=== SEED-PROSE RECONCILIATION CONTROL (all network aborted, $0) ===\n');

console.log('A. THE SEED IS UNCHANGED — source material is not rewritten');
const srcFile = fs.readFileSync('public/app.js', 'utf8');
SUPPRESSED.forEach(s => t('seed still contains: "' + s.slice(0, 44) + '"',
  srcFile.indexOf(s) >= 0));
t('the exitState row is intact, both clauses together',
  /exitState: 'RESOLVED: the words came true and everyone can see how\. NEW PROBLEM: Lirael\\'s standing is at risk and the cost is still uncounted\.'/.test(srcFile));
t('the requiredTruth row is intact',
  srcFile.indexOf('Julian is not an antagonist. The price has not yet been named.') >= 0);

const browser = await chromium.launch();
const page = await browser.newPage();
const calls = [];
await page.route('**/api/**', async (route) => {
  let body = null; try { body = route.request().postData(); } catch (_) {}
  calls.push({ bytes: body ? body.length : 0, body });
  try { await route.abort(); } catch (_) {}
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._fscReconcileSeedProse === 'function', { timeout: 20000 });

console.log('\nB. THE PASS ITSELF — clause by clause');
const r = await page.evaluate(() => {
  const def = window.STARTER_STORIES.find(s => s.id === 'starter_first_sacrifice');
  return { ready: !!def,
    exit: window._fscReconcileSeedProse(
      "RESOLVED: the words came true and everyone can see how. NEW PROBLEM: Lirael's standing is at risk and the cost is still uncounted.",
      { field: 'exitState' }),
    req: window._fscReconcileSeedProse(
      'The twist is an EVENT, not a recognition of one. Julian is not an antagonist. The price has not yet been named.',
      { field: 'requiredTruth' }),
    note: window._fscReconcileSeedProse('The loose note was heard by everyone present.', { field: 'x' }),
    plain: window._fscReconcileSeedProse('Seren kneels at the centre of the spiralgrass.', { field: 'x' })
  };
});
t('the app exposes the pass', r.ready);
t('"the cost is still uncounted" is SUPPRESSED',
  r.exit.suppressed.some(s => /cost is still uncounted/i.test(s.clause)));
t('  with a stated reason', r.exit.suppressed.some(s => /no atom/i.test(s.why)));
t('"the words came true and everyone can see how" is SUPPRESSED',
  r.exit.suppressed.some(s => /everyone can see how/i.test(s.clause)));
t('  because no atom makes the mechanism legible',
  r.exit.suppressed.some(s => /legible/i.test(s.why)));
t('"Lirael’s standing is at risk" is KEPT',
  r.exit.kept.some(k => /standing is at risk/i.test(k.clause)));
t('  on a named atom', r.exit.kept.some(k => /twist\.assembly_turned/.test(k.why)));
t('the surviving exitState text no longer mentions a cost',
  !/cost|price/i.test(r.exit.text), r.exit.text);
t('"The price has not yet been named" is SUPPRESSED',
  r.req.suppressed.some(s => /price has not yet been named/i.test(s.clause)));
t('  and the craft clauses survive',
  /twist is an EVENT/i.test(r.req.text) && /not an antagonist/i.test(r.req.text), r.req.text);
t('a clause on an ACTIVE atom passes', /loose note/i.test(r.note.text));
t('ordinary scene direction passes untouched',
  r.plain.text === 'Seren kneels at the centre of the spiralgrass.');

console.log('\nC. THE REAL AUTHOR PAYLOAD — the clauses cannot reach the writer');
await page.evaluate(async () => {
  const def = window.STARTER_STORIES.find(s => s.id === 'starter_first_sacrifice');
  await window._launchStarterStory(def);
  await new Promise(res => setTimeout(res, 1500));
  window._fscCompileAndPersist('I want this to have never happened.', { source: 'reconcile_control' });
  for (const idx of [2, 3, 1]) {
    try { await Promise.race([window._runCGScreenplayGen(idx, '', ''), new Promise(res => setTimeout(res, 35000))]); }
    catch (_) {}
    if (window.__sawAuthor) break;
  }
});
await browser.close();
const MARKERS = [/FORBIDDEN INVENTIONS/i, /SCENE DIRECTIVES/i, /DIRECTIVE/, /write the scene/i];
const authored = calls.filter(c => c.body).filter(c => {
  let msgs = null; try { msgs = (JSON.parse(c.body).messages || []).length; } catch (_) {}
  return msgs === 2 && MARKERS.reduce((n, rx) => n + (rx.test(c.body) ? 1 : 0), 0) >= 2;
}).sort((a, b) => b.bytes - a.bytes);
t('a terminal author request was captured', authored.length > 0);
const body = authored.length ? authored[0].body.replace(/\\"/g, '"').replace(/\\n/g, '\n') : '';
console.log('  payload: ' + (authored.length ? authored[0].bytes : 0) + ' bytes, '
  + calls.length + ' calls aborted ($0)');
SUPPRESSED.forEach(s => t('ABSENT from the author request: "' + s.slice(0, 44) + '"',
  body.indexOf(s) < 0));
t('and EVERY author request is clean, not just the terminal one',
  authored.every(a => SUPPRESSED.every(s =>
    a.body.replace(/\\"/g, '"').indexOf(s) < 0)),
  authored.length + ' requests checked');
t('the supported clause still reaches the writer',
  /standing is at risk/i.test(body));

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + '  ' + pass + '/' + (pass + fail) + ' assertions');
process.exit(fail === 0 ? 0 : 1);
