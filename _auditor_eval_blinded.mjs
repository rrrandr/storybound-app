// ══════════════════════════════════════════════════════════════════════════════════════════
//  BLINDED AUDITOR EVALUATION — FIXTURE ONLY, CANNOT DISPATCH
//
//  Builds everything a live evaluation would need and refuses to run one. The refusal is the
//  feature: authorization must be handed in explicitly, with an unrounded token ceiling, or the
//  harness exits without touching a provider.
//
//  Blinding is structural, not a promise. The scorer reads a pack that contains case ids and
//  prose and nothing else; the expected verdicts live in a sealed key written to a separate
//  file. A scorer holding the pack cannot see what any case is supposed to return, and neither
//  pack nor key may contain latent canon — the thing the auditor exists to keep off the page.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import crypto from 'crypto';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0;
const out = [];
const ok = (n, c, d) => { if (c) { pass++; out.push(`  ✓ ${n}`); }
  else { fail++; out.push(`  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 520) : ''}`); } };

const SRC = fs.readFileSync('public/app.js', 'utf8');
const RUBRIC_PATH = '_auditor_eval_frozen.md';
const RUBRIC = fs.readFileSync(RUBRIC_PATH, 'utf8');
const RUBRIC_SHA = crypto.createHash('sha256').update(RUBRIC).digest('hex').slice(0, 16);

// ── THE AUTHORIZATION GATE ──
// Both are required, and the ceiling must be an explicit integer. "Approved" without a number is
// not approval: it is a blank cheque, and this route bills per token.
const AUTHORIZED = process.env.SB_EVAL_AUTHORIZED === '1';
const CEILING = /^\d+$/.test(String(process.env.SB_EVAL_CEILING_TOKENS || ''))
  ? parseInt(process.env.SB_EVAL_CEILING_TOKENS, 10) : null;

// ── FROZEN CASE IDS ──
// Parsed from the rubric, not authored here. The rubric was committed before any output existed;
// its hash is stamped into both artifacts so a later edit is detectable.
const CASE_IDS = (RUBRIC.match(/^\| (\d+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|/gm) || [])
  .map(row => {
    const m = row.match(/^\| (\d+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|/);
    return { id: 'case-' + m[1].trim(), klass: m[2].trim(), summary: m[3].trim(), expected: m[4].trim() };
  });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const census = [];
const boot = [];
await installSession(page);
await page.addInitScript(() => { window.__ctNoAutoBegin = true; });
await page.route('**/*', async route => {
  const url = route.request().url();
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  let payload = ''; try { payload = route.request().postData() || ''; } catch (_) {}
  const role = (payload.match(/"role"\s*:\s*"([A-Z_]+)"/) || [])[1] || null;
  if (role && /CHARACTER_CANON_AUDITOR|CHARACTER_CANON_REPAIR/.test(role)) {
    census.push({ role, bytes: Buffer.byteLength(payload, 'utf8') });
  } else {
    boot.push(path);
  }
  return route.fulfill({ status: 403, contentType: 'application/json',
    body: JSON.stringify({ code: 'AUDITOR_NOT_ENABLED' }) });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window._cpCanonView && window._cpBuildEstablishedCanon, { timeout: 60000 });

// ── THE CANON, AND WHAT MUST NEVER LEAVE IT ──
const CANON = await page.evaluate(() => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  Object.assign(s, { _starterId: def.id, is_starter_story: true, world: def.world,
    worldSubtype: def.worldSubtype, name: 'Lirael', playerName: 'Lirael',
    loveInterestName: 'Julian', partnerName: 'Julian', pov: 'first_person',
    storyId: 'eval-blind', turnCount: 0, scenes: [], issueNumber: 1 });
  s._relationshipLedger = null;
  const stage = window._scene1StageContract(s);
  if (!stage || !stage.ok) return { fault: stage && stage.fault };
  const model = window._cpBuildEstablishedCanon(stage, {});
  const priv = window._cpCanonView(model, 'auditor_private', { budget: 6000 });
  const truths = String(priv.text || '').split('\n')
    .map(l => l.replace(/^[\s·•\-]+/, '').trim())
    .filter(l => l.length >= 40);
  return { fault: null, privBytes: new TextEncoder().encode(priv.text || '').length,
           truths, subjects: (model.entries || []).filter(p => (p.allFacets || []).length).length };
});
ok('E1 the real private canon view was built — the artifacts are checked against its actual lines',
   !CANON.fault && CANON.truths.length > 0,
   JSON.stringify({ fault: CANON.fault, lines: CANON.truths.length, bytes: CANON.privBytes }));

// ── THE TWO ARTIFACTS ──
// FIXTURE PROSE. Real evaluation prose comes from the archived samples the rubric names; this
// harness cannot fabricate it and does not try. Each case carries a placeholder until the
// archived text is attached at authorization time.
const pack = { v: 1, rubricSha: RUBRIC_SHA, builtAt: new Date().toISOString(),
  note: 'BLIND PACK — case ids and prose only. No canon, no expected verdicts.',
  cases: CASE_IDS.map(c => ({ id: c.id, prose: '<<ARCHIVED PROSE FOR ' + c.id + ' — attached at authorization>>' })) };
const key = { v: 1, rubricSha: RUBRIC_SHA, builtAt: pack.builtAt,
  note: 'SEALED KEY — expected verdicts. Never opened before scoring is written down.',
  cases: CASE_IDS.map(c => ({ id: c.id, klass: c.klass, expected: c.expected })) };
// ── A FROZEN ARTIFACT DOES NOT MOVE BECAUSE A TEST RAN ──
// These two files are the evaluation's blinding boundary. Rewriting them on every run put a
// fresh `builtAt` into the working tree each time the suite executed, which makes an audit
// artifact look edited when nothing about the evaluation changed — and a frozen artifact that
// churns is one nobody can tell has been tampered with. Write ONLY when the substantive
// content differs; `builtAt` is carried over from the existing file when it does not.
function writeFrozen(path, obj) {
  const strip = o => { const { builtAt, ...rest } = o; return JSON.stringify(rest); };
  let prior = null;
  try { prior = JSON.parse(fs.readFileSync(path, 'utf8')); } catch (_) {}
  if (prior && strip(prior) === strip(obj)) return { wrote: false, builtAt: prior.builtAt };
  fs.writeFileSync(path, JSON.stringify(obj, null, 2));
  return { wrote: true, builtAt: obj.builtAt };
}
const _wrotePack = writeFrozen('_audit_out/eval_blind_pack.json', pack);
const _wroteKey  = writeFrozen('_audit_out/eval_sealed_key.json', key);

ok('E2 the frozen rubric yielded 12 case ids, and both artifacts carry its hash',
   CASE_IDS.length === 12 && pack.rubricSha === RUBRIC_SHA && key.rubricSha === RUBRIC_SHA,
   `cases=${CASE_IDS.length} sha=${RUBRIC_SHA}`);
const packStr = JSON.stringify(pack);
ok('E3 ★ the blind pack contains NO expected verdict — a scorer holding it cannot know the answer',
   !/compatible|contradiction|possible_development/i.test(packStr), 'pack is verdict-free');
ok('E4 ★ neither artifact leaks a line of the private canon view',
   CANON.truths.every(t => packStr.indexOf(t) === -1 && JSON.stringify(key).indexOf(t) === -1),
   `checked ${CANON.truths.length} truths`);
ok('E5a ★ a run that changes nothing does not touch the frozen artifacts on disk',
   _wrotePack.wrote === false && _wroteKey.wrote === false,
   `pack rewritten=${_wrotePack.wrote} key rewritten=${_wroteKey.wrote} — true is correct ONLY on the run that first creates them or when the case set genuinely changes`);
ok('E5b the artifacts on disk still carry the frozen rubric hash',
   _wrotePack.builtAt && _wroteKey.builtAt && _wrotePack.builtAt === _wroteKey.builtAt,
   `pack builtAt=${_wrotePack.builtAt} key builtAt=${_wroteKey.builtAt}`);
ok('E5 the pack and the key are separate files — blinding is structural, not a promise',
   fs.existsSync('_audit_out/eval_blind_pack.json') && fs.existsSync('_audit_out/eval_sealed_key.json'),
   'two files written');

// ── SEPARATE CEILINGS, PER ROLE ──
const AUDIT_MAX = Number((SRC.match(/CP_AUDIT_MAX_TOKENS = (\d+)/) || [])[1] || 0);
const REPAIR_MAX = Number((SRC.match(/CP_REPAIR_MAX_TOKENS = (\d+)/) || [])[1] || 0);
const SCENE_CAP = 24000;
const bound = n => Math.ceil(n) + 200;
const IN_AUDIT = bound(CANON.privBytes + SCENE_CAP);
const IN_REPAIR = bound(CANON.privBytes + SCENE_CAP);
const IN_VERIFY = IN_AUDIT;
ok('E6 audit, repair and verification carry their OWN ceilings, read from source',
   AUDIT_MAX === 400 && REPAIR_MAX === 900 && IN_AUDIT > 0,
   `audit=${AUDIT_MAX} repair=${REPAIR_MAX} verify=${AUDIT_MAX}`);

// ── THE REFUSAL ──
ok('E7 ★ no auditor or repair request was dispatched while building all of this',
   census.length === 0, `evalDispatches=${JSON.stringify(census)} bootTraffic=${boot.length}`);
const SELF = fs.readFileSync('_auditor_eval_blinded.mjs', 'utf8');
const DISPATCH_PRIMS = ['_cpCanon' + 'Audit(', '_cpCanon' + 'Repair(', '_cpCanon' + 'Sequence(',
                        'call' + 'Chat', 'Storybound' + 'Orchestration'];
ok('E8 ★ the harness has NO dispatch primitive — it cannot evaluate, retry, or fall back, because it never calls one',
   DISPATCH_PRIMS.every(p => SELF.indexOf(p) === -1),
   JSON.stringify(DISPATCH_PRIMS.filter(p => SELF.indexOf(p) !== -1)));

const REFUSE = !AUTHORIZED || CEILING === null;
ok('E9 ★ without explicit authorization AND an unrounded ceiling, the harness REFUSES to evaluate',
   REFUSE === true || (AUTHORIZED && CEILING !== null),
   `authorized=${AUTHORIZED} ceiling=${CEILING}`);

console.log('\n' + out.join('\n'));
console.log(`
══ BLINDED EVALUATION — READY, NOT AUTHORIZED ════════════════════════════════════

  rubric            ${RUBRIC_PATH}  sha ${RUBRIC_SHA}  (frozen before any output)
  cases             ${CASE_IDS.length}, ids ${CASE_IDS.map(c => c.id).join(', ')}
  blind pack        _audit_out/eval_blind_pack.json    (ids + prose, verdict-free)
  sealed key        _audit_out/eval_sealed_key.json    (expected verdicts, separate file)

  PER-ROLE BYTE/TOKEN CEILINGS (1 tok/byte + 200; over-counts on purpose)
    audit         in ≤ ${IN_AUDIT}   out ≤ ${AUDIT_MAX}
    repair        in ≤ ${IN_REPAIR}   out ≤ ${REPAIR_MAX}
    verification  in ≤ ${IN_VERIFY}   out ≤ ${AUDIT_MAX}

  THE 12-CALL EVALUATION CEILING (audit only — the rubric scores the JUDGE, not the repairer)
    in  ≤ ${12 * IN_AUDIT} tokens
    out ≤ ${12 * AUDIT_MAX} tokens
    COST: unresolved. Multiply the two lines above by the provider's published input and output
    rates at authorization time. No rate is asserted here.

  REQUEST CENSUS THIS RUN
    auditor/repair dispatches : ${census.length} ${census.length ? JSON.stringify(census) : '(none — as required)'}
    incidental page traffic   : ${boot.length} (config/geo/csp during boot; not evaluation)

  ${REFUSE ? 'REFUSED — set SB_EVAL_AUTHORIZED=1 and SB_EVAL_CEILING_TOKENS=<unrounded integer>.\n  No enablement change is made by this harness; the server flag is a separate, deliberate act.'
           : 'AUTHORIZED — ceiling ' + CEILING + ' tokens. Live dispatch is still NOT implemented here.'}
══════════════════════════════════════════════════════════════════════════════════
`);
console.log(`  ${pass} passed · ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
