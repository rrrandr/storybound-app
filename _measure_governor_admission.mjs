// Honest re-measurement (2026-09-13): runs the REAL governor.admit() — not a hand-computed
// bytes+maxTokens eyeball comparison — against each of the four setup-phase roles' REAL measured
// message sizes (captured live from an instrumented run of _cg_oas_library_reload_proof.mjs).
// Synthetic messages of the EXACT measured byte length stand in for the real prompt text —
// reservationFor() only sums UTF-8 byte length of message content, so this reproduces the
// identical reservation number the real governor would compute for the real prompts.
//
// TWO separate scenarios, reported separately, because they answer different questions:
//   (A) ISOLATED — each role's own admission verdict, fresh bucket, no sibling contention. This
//       answers "is this role's OWN size within the model's allowance."
//   (B) REALISTIC BURST — all four roles fired near-simultaneously against the SAME model bucket,
//       exactly as the real Genesis-gate setup does (a Promise.all-style parallel kickoff). This
//       answers "does firing them together, unspaced, survive the model's RPS ceiling too" — a
//       separate constraint from TPM, and the first run of this script (unspaced) showed it bites.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createGovernor, MODEL_LIMITS, minIntervalMs } = require('./api/_mistral-governor.js');
const { memoryStore } = require('./api/_mistral-governor-store.js');

const ROLES = [
  { role: 'pcBodyBible', sysBytes: 11541, usrBytes: 23494, maxTokens: 2500 },
  { role: 'liBodyBible',  sysBytes: 24591, usrBytes: 44257, maxTokens: 3000 },
  { role: 'rplot',        sysBytes: 6768,  usrBytes: 5518,  maxTokens: 1200 },
  { role: 'scaffold',     sysBytes: 15590, usrBytes: 7868,  maxTokens: 2000 }
];
function synthMessages(sysBytes, usrBytes) {
  return [ { role: 'system', content: 'x'.repeat(sysBytes) }, { role: 'user', content: 'x'.repeat(usrBytes) } ];
}
function rowFor(r, res, limits) {
  const promptReservationEstimate = r.sysBytes + r.usrBytes;
  return { role: r.role, requestBytes: promptReservationEstimate, promptTokenReservationEstimate: promptReservationEstimate,
    maxCompletionReservation: r.maxTokens, finalAdmittedTokenTotal: promptReservationEstimate + r.maxTokens,
    configuredModelAllowanceTpm: limits ? limits.tpm : null, configuredModelAllowanceRps: limits ? limits.rps : null,
    outcome: res.outcome, detail: res.detail || null };
}

async function isolated(model) {
  const limits = MODEL_LIMITS[model];
  const rows = [];
  for (const r of ROLES) {
    const g = createGovernor(memoryStore(), { now: () => Date.now() }); // FRESH bucket per role — isolates the TPM/OVERSIZED question alone
    const res = await g.admit({ model, messages: synthMessages(r.sysBytes, r.usrBytes), maxTokens: r.maxTokens, opId: 'iso-' + r.role + '-' + model });
    rows.push(rowFor(r, res, limits));
  }
  return rows;
}

async function realisticBurst(model) {
  const limits = MODEL_LIMITS[model];
  const g = createGovernor(memoryStore(), { now: () => Date.now() }); // ONE shared bucket, as real production has (all four roles hit the same model)
  const settled = await Promise.all(ROLES.map(r =>
    g.admit({ model, messages: synthMessages(r.sysBytes, r.usrBytes), maxTokens: r.maxTokens, opId: 'burst-' + r.role + '-' + model })
      .then(res => rowFor(r, res, limits))
  ));
  return settled;
}

async function realisticSpaced(model) {
  // What the shared helper SHOULD do: space admits by the model's own minIntervalMs(rps) so a
  // real burst never trips RPS. Proves the fix, not just the problem.
  const limits = MODEL_LIMITS[model];
  const g = createGovernor(memoryStore(), { now: () => Date.now() });
  const spacing = limits ? minIntervalMs(limits.rps) : 0;
  const rows = [];
  for (const r of ROLES) {
    const res = await g.admit({ model, messages: synthMessages(r.sysBytes, r.usrBytes), maxTokens: r.maxTokens, opId: 'spaced-' + r.role + '-' + model });
    rows.push(rowFor(r, res, limits));
    if (spacing) await new Promise(res2 => setTimeout(res2, spacing));
  }
  return rows;
}

for (const model of ['mistral-small-latest', 'ministral-3b-2512', 'ministral-8b-2512', 'ministral-14b-2512']) {
  console.log('\n\n════════════════════════════════ ' + model + ' ════════════════════════════════');
  console.log('governor MODEL_LIMITS entry: ' + JSON.stringify(MODEL_LIMITS[model]));
  console.log('\n-- (A) ISOLATED (each role alone, fresh bucket — the TPM/size question) --');
  console.table(await isolated(model));
  console.log('\n-- (B) REALISTIC BURST (all 4 roles fired together, unspaced, shared bucket — what production actually does today) --');
  console.table(await realisticBurst(model));
  console.log('\n-- (C) REALISTIC SPACED (all 4 roles, spaced by minIntervalMs(rps)=' + (MODEL_LIMITS[model] ? minIntervalMs(MODEL_LIMITS[model].rps) : 'n/a') + 'ms — what the shared helper should do) --');
  console.table(await realisticSpaced(model));
}
process.exit(0);
