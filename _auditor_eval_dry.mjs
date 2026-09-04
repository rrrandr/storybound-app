// ══════════════════════════════════════════════════════════════════════════════════════════
//  AUDITOR / REPAIR — DRY EVALUATION HARNESS AND PRICING
//
//  Builds the REAL auditor request production would send, for every frozen case, and dispatches
//  NONE of them. The capability stays off; the client hint stays false; the proxy would refuse
//  anyway. What this produces is the number needed to ASK for authorization, plus the evidence
//  that the harness is wired to the real payload rather than a reconstruction of one.
//
//  The rubric in _auditor_eval_frozen.md was frozen and committed before this existed. Nothing
//  here may edit it, and a case that turns out badly built is reported as badly built.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0;
const out = [];
const ok = (n, c, d) => { if (c) { pass++; out.push(`  ✓ ${n}`); }
  else { fail++; out.push(`  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 500) : ''}`); } };

const SRC = fs.readFileSync('public/app.js', 'utf8');
const RUBRIC = fs.existsSync('_auditor_eval_frozen.md')
  ? fs.readFileSync('_auditor_eval_frozen.md', 'utf8') : '';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const dispatched = [], escaped = [];
await installSession(page);
await page.addInitScript(() => { window.__ctNoAutoBegin = true; });
await page.route('**/*', async route => {
  const url = route.request().url();
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  let payload = ''; try { payload = route.request().postData() || ''; } catch (_) {}
  // ANY auditor or repair request reaching here is a FAILURE of this harness, not a data point.
  if (/CHARACTER_CANON_AUDITOR|CHARACTER_CANON_REPAIR/.test(payload)) dispatched.push({ path, bytes: payload.length });
  return route.fulfill({ status: 403, contentType: 'application/json',
    body: JSON.stringify({ code: 'AUDITOR_NOT_ENABLED' }) });
});
page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window._cpCanonAudit && window.__CP_REPAIR, { timeout: 60000 });

// ── THE REAL PAYLOAD, BUILT BUT NOT SENT ──
// The auditor's system prompt is the private canon view; the user message is the scene text.
// Both are constructed here exactly as _cpCanonAudit constructs them.
const M = await page.evaluate(() => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  Object.assign(s, { _starterId: def.id, is_starter_story: true, world: def.world,
    worldSubtype: def.worldSubtype, name: 'Lirael', playerName: 'Lirael',
    loveInterestName: 'Julian', partnerName: 'Julian', pov: 'first_person',
    storyId: 'audit-dry', turnCount: 0, scenes: [], issueNumber: 1 });
  s._relationshipLedger = null;
  const stage = window._scene1StageContract(s);
  if (!stage || !stage.ok) return { fault: stage && stage.fault };
  const model = window._cpBuildEstablishedCanon(stage, {});
  const priv = window._cpCanonView(model, 'auditor_private', { budget: 6000 });
  const subjects = (model.entries || []).filter(p => (p.allFacets || []).length > 0)
    .map(p => ({ subject_ref: p.canonicalId, label: p.label }));
  return { fault: null, sysBytes: new TextEncoder().encode(priv.text || '').length,
           subjects: subjects.length, privOk: priv.ok, cfg: window.__CP_REPAIR,
           enabledHint: window.__cpCanonAuditorEnabled === true };
});
ok('A1 the harness built the REAL private canon view production audits against',
   !M.fault && M.privOk && M.sysBytes > 0 && M.subjects > 0, JSON.stringify(M));
ok('A2 ★ the auditor is DORMANT — the client hint is false and nothing was dispatched',
   M.enabledHint === false && dispatched.length === 0,
   `hint=${M.enabledHint} dispatched=${dispatched.length}`);

// ── THE FROZEN RUBRIC ──
const caseRows = (RUBRIC.match(/^\| \d+ \| /gm) || []).length;
ok('A3 the rubric is frozen, committed, and carries its 12 cases',
   caseRows === 12 && /Frozen and committed BEFORE/.test(RUBRIC), `cases=${caseRows}`);
ok('A4 …and it states what it cannot establish, rather than implying proof',
   /DIRECTIONAL EVIDENCE, not statistical proof/.test(RUBRIC), 'limits declared');

// ── THE NUMBERS ──
const AUDIT_MAX = Number((SRC.match(/CP_AUDIT_MAX_TOKENS = (\d+)/) || [])[1] || 0);
const REPAIR_MAX = Number((SRC.match(/CP_REPAIR_MAX_TOKENS = (\d+)/) || [])[1] || 0);
const SCENE_CAP = 24000;                       // .slice(0, 24000) on the user message
const bound = n => Math.ceil(n) + 200;         // 1 token/byte + protocol overhead, over-counting
const perAudit = bound(M.sysBytes + SCENE_CAP);
const CASES = 12;

ok('A5 both ceilings are hard numbers read from source, not assumed',
   AUDIT_MAX === 400 && REPAIR_MAX === 900, `audit=${AUDIT_MAX} repair=${REPAIR_MAX}`);
ok('A6 the model is pinned to mistral-small-latest on both roles',
   /role: CP_AUDITOR_ROLE, model: 'mistral-small-latest'/.test(SRC)
   && M.cfg && M.cfg.model === 'mistral-small-latest', JSON.stringify(M.cfg));
ok('A7 nothing escaped to a paid provider', escaped.length === 0, JSON.stringify(escaped.slice(0, 3)));

console.log('\n' + out.join('\n'));
console.log(`
══ AUDITOR / REPAIR — DRY PRICING ════════════════════════════════════════════════

  ROUTE (read from source)
    auditor role    CHARACTER_CANON_AUDITOR   model mistral-small-latest  temp 0
    repair  role    ${M.cfg && M.cfg.role}   model ${M.cfg && M.cfg.model}
    audit  ceiling  ${AUDIT_MAX} tokens   (a verdict list, not prose)
    repair ceiling  ${REPAIR_MAX} tokens
    reasoning       not requested on this route — the ceiling is real

  ONE AUDIT (measured, not estimated)
    private canon view   ${M.sysBytes} bytes      subjects ${M.subjects}
    scene text cap       ${SCENE_CAP} bytes      (.slice(0, 24000))
    input bound          ≤ ${perAudit} tokens    (1 tok/byte + 200, over-counts on purpose)
    output bound         ≤ ${AUDIT_MAX} tokens

  CALLS PER SCENE, WHEN ENABLED
    1 audit. A contradiction adds 1 repair + 1 verify audit → worst case 3.
    Worst-case scene bound: ${perAudit * 2 + bound(SCENE_CAP)} in, ${AUDIT_MAX * 2 + REPAIR_MAX} out.

  THE 12-CASE EVALUATION
    ${CASES} dispatches, one per case. No repair arm: the rubric scores the JUDGE.
    Evaluation bound: ≤ ${CASES * perAudit} tokens in, ≤ ${CASES * AUDIT_MAX} out.

  LATENCY: UNKNOWN. Not measurable without dispatching. Mistral Small with reasoning off has
    been fast on the planner route, but no number is asserted here from that.

  RATES: NOT FILLED IN. Read from the provider's published page when authorization is asked for.

  REPAIR BEHAVIOR, when enabled: audit → if contradiction and the capability is on, repair the
    affected paragraphs → verify audit. If the verify still contradicts, the repair is DISCARDED
    and the author's words stand. Dormant, the free deterministic layer still runs and its
    finding is recorded as a known contradiction, published, with no repair attempted.

  dispatched this run: ${dispatched.length}   escaped: ${escaped.length}
══════════════════════════════════════════════════════════════════════════════════
`);
console.log(`  ${pass} passed · ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
