// STAGE 3 — LIVE AUTHOR-OBEDIENCE RUN.  AUTHORIZED (Roman, "go", 2026-09-29).
//
// Tests ONE thing: does the author obey a compiled consequence?
// Pass criteria pre-registered in _live_run_pass_criteria.md (C1–C4), fixed before this ran.
//
// SAFETY / ACCOUNTING
//   - $0.25 ceiling for the WHOLE exercise (conservative reading of "per-run"), reserved before
//     each dispatch and refused past it.
//   - ONE upstream attempt per outcome. _noFallback: true. No fallback chain.
//   - Node dispatches directly to the local proxy, so there is no page-route boundary to deadlock
//     on — the failure that lost the Grok response. Raw response + receipt are written to disk
//     BEFORE any scoring touches them.
//   - The API key is server-side in .env.local. This process never reads or handles it.
//   - Post-prose extraction and automatic commitment stay DISABLED. Nothing here commits canon.
import fs from 'fs';
import path from 'path';

const AUTHORIZED = process.argv.includes('--authorized');
const CEILING_USD = 0.25;
const MODEL = 'grok-4-1-fast-reasoning';
const PROXY = 'http://localhost:3000/api/proxy';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = path.join('_tempt_fate_fixtures', 'fsc_obedience_' + STAMP);

const PRESENT = ['the_assembly', 'named:seren', 'named:julian',
                 'role:first_sacrifice_presiding_dohkar', 'pc:lirael'];
const ASSEMBLY = ['the_assembly'];

// The two outcomes, chosen so C2 is tested in BOTH directions.
const RUNS = [
  { key: 'time_gives_way', wish: 'I wish this had never happened to me.', flags: {},
    expectId: 'unm.time_gives_way', roster: PRESENT, mustAffectLirael: true, expectChoiceStop: true },
  { key: 'turning_forgotten', wish: 'I want to disappear.', flags: {},
    expectId: 'unm.the_turning_forgotten', roster: ASSEMBLY, mustAffectLirael: false, expectChoiceStop: false }
];

// ── Load the REAL compiler and produce the REAL prompt block. No re-implementation. ──────────
const SRC = fs.readFileSync('public/app.js', 'utf8');
const S = SRC.indexOf('// STAGE 3 — ISSUE 1 OPENING CONSEQUENCE COMPILER');
if (S < 0) { console.error('FATAL: compiler section not found'); process.exit(2); }
const win = {}; globalThis.window = win;
new Function('window', SRC.slice(S - 100))(win);

function compileFor(r) {
  win.state = Object.assign({ _fscDeltas: [], _fscCompiled: [] }, r.flags);
  const rec = win._fscCompileAndPersist(r.wish);
  return { rec, block: win._fscPromptBlock() };
}

const SYS = [
  'You are the prose author for an interactive romantasy novel set in the Fatelands.',
  'Write ONE scene in third-person past tense, 220-320 words.',
  'A player has spent Fortune on Tempt Fate. The consequence has ALREADY been decided and is',
  'given to you below. Your job is to RENDER it. You are not choosing what happens.'
].join('\n');

function userFor(block) {
  return [
    'SCENE: a ceremony clearing in the Veilwood at dawn. Lirael, a Sacrificiant’s guide, stands',
    'before an assembly of First Favored after her ward Seren’s First Sacrifice wish twisted.',
    'Present: Lirael, Seren, Julian (the Chayr), the presiding Dohkar, and the assembled crowd.',
    '',
    block,
    '',
    'Write the scene now.'
  ].join('\n');
}

// ── Reservation ledger ──────────────────────────────────────────────────────────────────────
let reservedUsd = 0;
const RESERVE_PER_CALL = 0.10;   // conservative pre-charge; measured cost replaces it after
function reserve(tag) {
  if (reservedUsd + RESERVE_PER_CALL > CEILING_USD) {
    return { ok: false, reason: 'ceiling', reservedUsd, ceiling: CEILING_USD };
  }
  reservedUsd += RESERVE_PER_CALL;
  return { ok: true, reservedUsd };
}

function log(...a) { console.log(...a); }

// ── Dry preview: exactly what WOULD be sent. No dispatch. ───────────────────────────────────
if (!AUTHORIZED) {
  log('=== FSC LIVE OBEDIENCE RUN — NOT AUTHORIZED, NOTHING DISPATCHED ===\n');
  log('  ceiling      : $' + CEILING_USD.toFixed(2) + ' for the whole exercise');
  log('  model        : ' + MODEL + '  (one upstream attempt each, _noFallback)');
  log('  endpoint     : ' + PROXY);
  log('  outcomes     : ' + RUNS.map(r => r.expectId).join(', '));
  RUNS.forEach(r => {
    const { rec, block } = compileFor(r);
    log('\n--- ' + r.key + ' ---');
    log('  compiled     : ' + rec.outcomeId + (rec.outcomeId === r.expectId ? '  [expected]' : '  [MISMATCH]'));
    log('  roster       : ' + (rec.population ? rec.population.roster.join(', ') : 'none'));
    log('  invokerScope : ' + rec.invokerScope);
    log('  prompt block : ' + block.split('\n').length + ' lines, ' + block.length + ' chars');
  });
  log('\nRe-run with --authorized to dispatch.');
  process.exit(0);
}

// ── AUTHORIZED ──────────────────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true });
log('=== FSC LIVE OBEDIENCE RUN — AUTHORIZED ===');
log('    ceiling $' + CEILING_USD.toFixed(2) + ' (whole exercise) · model ' + MODEL
  + ' · one attempt each · output ' + OUT + '\n');

const results = [];
for (const r of RUNS) {
  const { rec, block } = compileFor(r);
  log('── ' + r.key + ' ──');
  log('  compiled : ' + rec.outcomeId + '  roster=[' + (rec.population ? rec.population.roster.join(',') : '') + ']'
    + '  invokerScope=' + rec.invokerScope);

  const res = reserve(r.key);
  if (!res.ok) { log('  REFUSED  : ceiling reached ($' + reservedUsd.toFixed(4) + ') — not dispatched');
                 results.push({ key: r.key, dispatched: false, reason: 'ceiling' }); continue; }

  const body = { messages: [{ role: 'system', content: SYS }, { role: 'user', content: userFor(block) }],
    model: MODEL, temperature: 0.8, max_tokens: 1400, role: 'SPECIALIST_RENDERER',
    _sbModelOverride: MODEL, _noFallback: true };

  // PERSIST THE REQUEST BEFORE DISPATCH — so a hang loses nothing.
  fs.writeFileSync(path.join(OUT, r.key + '_request.json'),
    JSON.stringify({ proxy: PROXY, body, compiled: rec, promptBlock: block }, null, 2));

  let raw = null, err = null, status = null;
  const t0 = Date.now();
  try {
    const resp = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body) });
    status = resp.status;
    raw = await resp.text();
  } catch (e) { err = String(e && e.message || e); }
  const ms = Date.now() - t0;

  // PERSIST RAW + RECEIPT BEFORE ANY EVALUATION.
  fs.writeFileSync(path.join(OUT, r.key + '_raw_response.txt'), raw == null ? '' : raw);
  fs.writeFileSync(path.join(OUT, r.key + '_receipt.json'), JSON.stringify(
    { key: r.key, status, ms, err, reservedUsd: RESERVE_PER_CALL, at: new Date().toISOString() }, null, 2));
  log('  upstream : status=' + status + ' ' + ms + 'ms' + (err ? ' ERR=' + err : '') + ' — raw + receipt persisted');

  results.push({ key: r.key, dispatched: true, status, ms, err, raw, rec, r });
}

// ── SCORING. C2 first, mechanically. ────────────────────────────────────────────────────────
log('\n' + '='.repeat(78));
log('SCORING — pre-registered criteria, C2 scored mechanically first');
log('='.repeat(78));

const NAMED_TOKENS = { 'named:seren': /\bSeren\b/i, 'named:julian': /\bJulian\b/i,
  'role:first_sacrifice_presiding_dohkar': /\bDohkar\b/i, 'pc:lirael': /\bLirael\b/i,
  'the_assembly': /\b(assembly|crowd|gathering|First Favored)\b/i };

const verdicts = [];
for (const out of results) {
  if (!out.dispatched) { verdicts.push({ key: out.key, verdict: 'NOT RUN', reason: out.reason }); continue; }
  let text = '';
  try {
    const j = JSON.parse(out.raw);
    text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    out.usage = j.usage || null;
  } catch (_) { text = ''; }
  fs.writeFileSync(path.join(OUT, out.key + '_scene.txt'), text);

  log('\n── ' + out.key + ' ──  (' + text.split(/\s+/).filter(Boolean).length + ' words)');
  if (!text) { verdicts.push({ key: out.key, verdict: 'FAIL', why: 'no scene text returned' });
               log('  NO SCENE TEXT — FAIL'); continue; }

  // C2 — mechanical roster check
  const roster = out.rec.population ? out.rec.population.roster : [];
  const mentioned = Object.keys(NAMED_TOKENS).filter(k => NAMED_TOKENS[k].test(text));
  const nonMembersMentioned = mentioned.filter(m => roster.indexOf(m) < 0);
  log('  C2 roster      : declared=[' + roster.join(',') + ']');
  log('       mentioned : [' + mentioned.join(',') + ']');
  log('       non-members appearing in prose: [' + nonMembersMentioned.join(',') + ']');
  log('       (appearing is not being AFFECTED — human call below decides C2)');

  verdicts.push({ key: out.key, roster, mentioned, nonMembersMentioned,
    wordCount: text.split(/\s+/).filter(Boolean).length, usage: out.usage || null,
    expectChoiceStop: out.r.expectChoiceStop, mustAffectLirael: out.r.mustAffectLirael });
}

fs.writeFileSync(path.join(OUT, 'verdict_input.json'), JSON.stringify(verdicts, null, 2));

// ── Cost, from the provider's own figure where available ────────────────────────────────────
let measured = 0;
results.forEach(o => {
  const ticks = o.usage && o.usage.cost_in_usd_ticks;
  if (ticks) measured += ticks * 1e-10;
});
log('\n' + '='.repeat(78));
log('  reserved : $' + reservedUsd.toFixed(6) + ' of $' + CEILING_USD.toFixed(2));
log('  measured : ' + (measured ? '$' + measured.toFixed(6) + '  (cost_in_usd_ticks, authoritative)' : 'not reported by provider'));
log('  evidence : ' + OUT);
log('\n  NO VERDICT IS RENDERED HERE. C1, C3 and C4 are human calls against the sealed record.');
log('  Scenes and the mechanical C2 input are on disk for that reading.');
process.exit(0);
