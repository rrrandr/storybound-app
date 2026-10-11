// ── EVERY CAPTURED VERIFIER RESPONSE, AGAINST ITS OWN REQUEST'S PROSE ($0) ──────────────────
// Runs the SHIPPED window._quoteIsInProse (not a copy) over all runtime-commit verifier responses
// in the run, each judged against the prose from ITS OWN request. No substitutions anywhere.
import fs from 'fs';
import { chromium } from 'playwright-core';

const D = '_fs_live_out/run_2026-10-10T13-32-11-777Z/wire';
const unfence = (x) => String(x || '').replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

// Pair each response with its request, and keep only the runtime-commit verifier calls.
const cases = [];
for (const f of fs.readdirSync(D).filter(x => /_req\.json$/.test(x)).sort()) {
  const n = f.slice(0, 3);
  let req, res;
  try {
    req = JSON.parse(fs.readFileSync(D + '/' + f, 'utf8'));
    res = JSON.parse(fs.readFileSync(D + '/' + n + '_res.json', 'utf8'));
  } catch (_) { continue; }
  const msgs = req.messages || [];
  const sys = String(msgs[0]?.content || '');
  if (!/RUNTIME COMMIT verifier/i.test(sys)) continue;
  // ONLY the SCENE PROSE block, exactly as the prompt delimits it. If the boundaries are not
  // found the case is reported as unusable rather than silently widened to the whole message.
  const usr = String(msgs[msgs.length - 1]?.content || '');
  const a = usr.indexOf('SCENE PROSE:\n');
  const b = usr.indexOf('\n\nReturn the JSON now.', a);
  if (a < 0 || b < 0) { cases.push({ n, boundaryFailed: true }); continue; }
  const prose = usr.slice(a + 'SCENE PROSE:\n'.length, b);
  let v = null;
  try { v = JSON.parse(unfence(res.choices?.[0]?.message?.content)); } catch (_) {}
  if (!v) { cases.push({ n, parseFailed: true }); continue; }
  cases.push({ n, prose: prose, v });
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', async (r) => {
  try { await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch (_) {}
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._quoteIsInProse === 'function', { timeout: 30000 });

console.log('=== ' + cases.length + ' CAPTURED RUNTIME-COMMIT VERIFIER RESPONSES ===');
console.log('    (each judged against ONLY the SCENE PROSE block of its own request)\n');
const summary = [];
for (const c of cases) {
  if (c.boundaryFailed) {
    console.log('  ' + c.n + '  SKIPPED — SCENE PROSE boundaries not found in the request');
    continue;
  }
  if (c.parseFailed) { console.log('  ' + c.n + '  (response did not parse)'); continue; }
  const sc = c.v.slots_check || {};
  const pp = (c.v.per_proposal || [])[0] || {};
  const fields = {
    'pp.evidence': pp.evidence,
    'pp.precondition': pp.precondition_evidence,
    'slots.precondition': sc.precondition_evidence,
    'slots.actor': sc.actor_evidence,
    'slots.action': sc.action_evidence,
    'slots.target': sc.target_evidence,
    'slots.exit': sc.exit_state_evidence
  };
  const verdicts = await page.evaluate((a) => {
    const o = {};
    for (const k of Object.keys(a.f)) o[k] = window._quoteIsInProse(a.f[k], a.p);
    return o;
  }, { f: fields, p: c.prose });

  const failing = Object.keys(fields).filter(k => fields[k] != null && String(fields[k]).trim()
    && !verdicts[k]);
  const delivery = String(pp.delivery || c.v.delivery || '(none)');
  console.log('  ' + c.n + '  delivery=' + delivery.padEnd(10)
    + ' occurred=' + String(sc.occurred_this_scene)
    + '  failing citations: ' + (failing.length ? failing.join(', ') : 'none'));
  // WHY each one fails, from the string itself - not a guess.
  for (const k of failing) {
    const str = String(fields[k]);
    const why = [];
    if (/\\[nrt]/.test(str)) why.push('literal \\n escape');
    // A stitched citation: more than one quoted span, or an embedded paragraph break.
    const spans = str.split(/\\n+|\n+/).map(x => x.trim()).filter(Boolean);
    if (spans.length > 1) why.push(spans.length + ' separate spans joined');
    const each = await page.evaluate((a) => a.s.map(x => window._quoteIsInProse(x, a.p)),
      { s: spans, p: c.prose });
    const okCount = each.filter(Boolean).length;
    why.push(okCount + '/' + spans.length + ' spans verify individually');
    console.log('        ' + k + ': ' + why.join(' · '));
  }
  summary.push({ n: c.n, delivery: delivery, failing: failing.length,
    recoverableBySplit: failing.length > 0 && failing.every(k => {
      const spans = String(fields[k]).split(/\\n+|\n+/).map(x => x.trim()).filter(Boolean);
      return spans.length > 1;
    }) });
}

console.log('\n=== SUMMARY ===');
const delivered = summary.filter(s => /DELIVERED/i.test(s.delivery));
const partial = summary.filter(s => /PARTIAL/i.test(s.delivery));
console.log('  DELIVERED: ' + delivered.map(s => s.n).join(', ')
  + '  — of which ' + delivered.filter(s => s.failing > 0).length + ' fail a citation check');
console.log('  PARTIAL:   ' + partial.map(s => s.n).join(', ')
  + '  — incomplete DELIVERY, not a citation problem');
console.log('  DELIVERED cases whose every failing citation is several joined spans: '
  + delivered.filter(s => s.recoverableBySplit).map(s => s.n).join(', '));

await browser.close();
