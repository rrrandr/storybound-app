// ANTAGONIST IDENTITY — the prerequisite for portfolio authoring. Free, no model calls.
//
// The ordering this exists to establish:
//   A-plot PERSON classification → canonical plot-role identity → scaffold invocation roster
// and NOT: scaffold returns a name → guess an identity afterwards. If identity were minted after
// the scaffold, the scaffold could only key its output by NAME, or a second paid call would be
// needed to attach it.
//
// Two things this deliberately refuses to do: infer personhood from `antagonistShape` (A/B/C
// describes the antagonist's relation to the WOUND, not what it is), and require a proper name
// (an unnamed person — "the presiding Dohkar", "her supervisor" — is a person, and the engine
// already handles role-based characters well).
//
// usage: node _antagonist_identity.mjs   (needs vercel dev on :3000)
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

async function preflight(url = 'http://localhost:3000/') {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(url, { signal: ctl.signal });
    clearTimeout(timer);
    const body = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!/<\s*script|<\s*html/i.test(body)) throw new Error('not the app shell');
  } catch (e) {
    console.error(`\n  ✗ INFRASTRUCTURE: ${url} not serving the app (${e.message}).`);
    console.error('    npx vercel dev --listen 3000  —  if hung, lsof -nP -iTCP:3000 and kill that PID.\n');
    process.exit(2);
  }
}
await preflight();

console.log(`\n${'═'.repeat(88)}\nANTAGONIST IDENTITY — classification, then identity, then the scaffold\n${'═'.repeat(88)}\n`);

const browser = await chromium.launch({ headless: true });
let _closing = false;
const closeBrowser = async () => { if (_closing) return; _closing = true; try { await browser.close(); } catch (_) {} };
process.on('uncaughtException', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('unhandledRejection', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('exit', () => { try { browser.close(); } catch (_) {} });

const ctx = await browser.newContext();
try {
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000); page.setDefaultNavigationTimeout(120000);
  let paid = 0;
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
  await page.route('**/api/**', async route => {
    const u = route.request().url();
    if (/\/api\/(config|geo|csp-report|beta-events)\b/.test(u)) return route.continue();
    if (/proxy|chat|complet|grok|mistral/i.test(u)) paid++;
    return route.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' });
  });
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window._normalizeAntagonistSubject && window._relPlotRoleEntity
    && window._validateAPlotOutput && window._antagonistBibleEligible, { timeout:60000 });

  const R = await page.evaluate(() => {
    const s = window.state;
    const out = {};
    const reset = (id) => Object.assign(s, { storyId: id, _relationshipLedger: null,
      name: 'Lirael', playerName: 'Lirael', aPlot: null });
    const N = (subj, prose) => window._normalizeAntagonistSubject(subj, prose);

    // ── CLASSIFICATION ──
    out.namedPerson   = N({ kind: 'PERSON', reference_label: 'Marcus Vale', proper_name: 'Marcus Vale' }, 'Marcus Vale');
    out.unnamedPerson = N({ kind: 'PERSON', reference_label: 'the presiding Dohkar', proper_name: null }, 'the presiding Dohkar');
    out.titleOnly     = N({ kind: 'PERSON', reference_label: 'her supervisor' }, 'her supervisor');
    out.group         = N({ kind: 'GROUP', reference_label: 'the raiders' }, 'the raiders');
    out.institution   = N({ kind: 'INSTITUTION', reference_label: 'the Ministry' }, 'the Ministry');
    out.force         = N({ kind: 'FORCE', reference_label: 'the long winter' }, 'the long winter');
    out.contradicted  = N({ kind: 'PERSON', reference_label: 'the corporation' }, 'the corporation');
    out.contradicted2 = N({ kind: 'PERSON', reference_label: 'the raiders' }, 'the raiders');
    out.badKind       = N({ kind: 'VILLAIN', reference_label: 'x' }, 'x');
    out.missing       = N(null, 'someone');

    // ── IDENTITY: minted only for PERSON, keyed by A-plot instance, never by name ──
    reset('t-id');
    const mint = (kind, label, proper, plotId) => {
      const norm = N({ kind, reference_label: label, proper_name: proper || null }, label);
      if (!norm.ok || norm.subject.kind !== 'PERSON') return null;
      return window._relPlotRoleEntity(plotId || 'aplot:one', 'primary_antagonist',
        { label: norm.subject.reference_label, properName: norm.subject.proper_name, provenance: 'aplot_antagonist' });
    };
    out.personId    = mint('PERSON', 'the presiding Dohkar', null);
    out.personAgain = mint('PERSON', 'the presiding Dohkar', null);      // idempotent
    out.groupId     = mint('GROUP', 'the raiders', null);
    out.forceId     = mint('FORCE', 'the long winter', null);
    out.namedById   = mint('PERSON', 'Marcus Vale', 'Marcus Vale', 'aplot:two');
    out.keyedByPlot = out.personId !== out.namedById;
    out.notNameKeyed = !Object.keys(window._relLedger().entities).some(k => /^ent:/.test(k));
    out.entityKind  = (window._relLedger().entities[out.personId] || {}).kind;
    out.hasProfile  = !!((window._relLedger().entities[out.personId] || {}).authorProfile);

    // a CONTINUATION replaces the A-plot: the new antagonist is a different person
    out.continuationId = mint('PERSON', 'the presiding Dohkar', null, 'aplot:three');
    out.continuationDistinct = out.continuationId !== out.personId;

    // ── A LATER DISCLOSED NAME RECONCILES ONTO THE ROLE IDENTITY ──
    // The reconciliation fixture is GONE with the capability it exercised. _relReconcileRole
    // accepts kinship roles only again, and a plot-role antagonist renamed on the page stays a
    // separate identity — asserted at 0n, where the boundary is recorded rather than papered over.
    // ── VALIDATION MODES ──
    const base = { goal: 'She must reach the harbour before the tide turns and the ship leaves',
      namedClock: 'the tide at dawn', antagonistOrAntiForce: 'Marcus Vale',
      stakesIfFail: 'she loses the only passage out', stakesIfWin: 'she reaches her sister in time',
      milestones: [{ beat: 'a', crisis: false }, { beat: 'b', crisis: false }, { beat: 'c', crisis: true }] };
    const withSubj = Object.assign({}, base, { antagonistSubject: { kind: 'PERSON', reference_label: 'Marcus Vale', proper_name: 'Marcus Vale' } });
    out.freshMissing = window._validateAPlotOutput(base, { freshOutput: true });
    out.freshValid   = window._validateAPlotOutput(withSubj, { freshOutput: true });
    out.legacyMissing = window._validateAPlotOutput(base, {});

    // ── BODY-BIBLE GATE ──
    const gate = (subj, shape, prose) => { s.aPlot = { antagonistSubject: subj, antagonistShape: shape,
      antagonistOrAntiForce: prose }; return window._antagonistBibleEligible(); };
    out.gateLegacyA   = gate(null, 'A', 'Marcus Vale');                                       // old behaviour
    out.gateLegacyC   = gate(null, 'C', 'Marcus Vale');
    out.gatePersonA   = gate({ kind: 'PERSON', reference_label: 'Marcus Vale' }, 'A', 'Marcus Vale');
    out.gatePersonC   = gate({ kind: 'PERSON', reference_label: 'Marcus Vale' }, 'C', 'Marcus Vale');
    out.gateInstA     = gate({ kind: 'INSTITUTION', reference_label: 'the Ministry' }, 'A', 'the Ministry');
    return out;
  });

  // ══════════════════════════════════════════════════════════════════════════════════════
  // 0 · THE PRODUCTION PATH — generateAPlot → _runInitAPlot → state.aPlot → ledger
  //
  // The helper-level tests below all passed while production minted NOTHING, because
  // gen.antagonistSubject was never copied across the state handoff. A high count proved the
  // helpers; it bypassed the seam. This drives the real request flow with an intercepted
  // response and asserts what lands on state and in the ledger.
  // ══════════════════════════════════════════════════════════════════════════════════════
  // FOUR SEPARATE NUMBERS. `paid === expected || paid > 0` was vacuous — any intercepted
  // request satisfied it. Each is counted on its own and asserted with exact deltas.
  let aplotRequests = 0, scaffoldRequests = 0, escapedModel = 0, paidReal = 0;
  let aplotInitial = 0, aplotCorrections = 0, aplotClassCorrections = 0;
  let aplotCompress = 0, aplotOther = 0;
  const reqLog = [];
  let lastScaffoldBody = null;
  const PAID_HOST = /api\.openai|api\.anthropic|api\.x\.ai|api\.mistral|generativelanguage|api\.groq/i;
  await page.route('**/*', async route => {
    const u = route.request().url();
    if (/^http:\/\/localhost:3000\//.test(u)) return route.fallback();
    if (PAID_HOST.test(u)) { paidReal++; return route.abort(); }
    if (/fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|unpkg|typekit/i.test(u)) return route.abort();
    escapedModel++;
    return route.abort();
  });
  const APLOT = (subject) => ({
    goal: 'She must reach the harbour before the tide turns and the ship leaves without her sister',
    namedClock: 'the tide at dawn', clockUnit: 'turns', totalClockUnits: 12,
    antagonistOrAntiForce: 'the presiding Dohkar', antagonistShape: 'A',
    antagonistPersonalTie: 'he sealed the passage her mother once bought',
    ...(subject === undefined ? {} : { antagonistSubject: subject }),
    stakesIfFail: 'she loses the only passage out and her sister sails alone',
    stakesIfWin: 'she reaches her sister before the ship clears the headland',
    pcWound: 'she was left behind once and has never said so out loud to anyone',
    liWound: 'he promised passage to someone once and could not deliver it in time',
    woundLoadBearingProof: 'her fear of being left drives every choice; his failed promise is why he will not promise again',
    milestones: [{ atScene: 1, event: 'she reaches the harbour office and is refused' },
                 { atScene: 2, event: 'she finds the sealed manifest with her mother\'s name' },
                 { atScene: 3, event: 'the crisis: the tide turns and she must choose', crisis: true }]
  });
  const runAPlot = async (subject) => page.evaluate(async ({ payload }) => {
    const s = window.state;
    // EXPLICITLY ORDINARY. Famous Fate and canon-goal inputs trigger their own regeneration
    // paths, and leaving them set would let ambient state masquerade as a baseline.
    Object.assign(s, { storyId: 'prod-' + Math.random().toString(36).slice(2, 8),
      _relationshipLedger: null, aPlot: null, name: 'Lirael', playerName: 'Lirael',
      fateMode: null, ffContract: null, canonGoal: null, _canonGoal: null,
      sourceMaterial: null, embody: null, world: 'modern', worldSubtype: 'city' });
    window.__aplotPayload = payload;
    try { await window.initAPlot({ tier: 'fling' }); } catch (e) { return { threw: String(e && e.message).slice(0, 120) }; }
    const ap = s.aPlot || {};
    const L = window._relLedger();
    return { id: ap.id || null, subject: ap.antagonistSubject || null,
      prose: ap.antagonistOrAntiForce || null,
      entities: L ? Object.keys(L.entities).filter(k => /^plot:/.test(k)) : [],
      canonicalId: (ap.antagonistSubject || {}).canonicalId || null };
  }, { payload: APLOT(subject) });

  await page.route('**/api/**', async route => {
    const u = route.request().url();
    if (/\/api\/(config|geo|csp-report|beta-events)\b/.test(u)) return route.continue();
    if (/proxy|chat|complet|grok|mistral/i.test(u)) {
      const body = route.request().postData() || '';
      if (/scene-structure planner|characterPortfolios|issueArcs/i.test(body)) {
        lastScaffoldBody = body; scaffoldRequests++;
        return route.fulfill({ status:200, contentType:'application/json',
          body: JSON.stringify({ ok: true, content: '{"issueArcs":[],"characterPortfolios":[],"characterIcebergs":{}}' }) });
      }
      // IDENTIFY EACH REQUEST BY ITS PROMPT SIGNATURE. An unexplained "baseline of 2" is not a
      // measurement, it is an unexamined behaviour — it could equally be ambient FF/canon-goal
      // state leaking into an ordinary fixture. Correction attempts carry the validation errors
      // back to the model, so they are distinguishable from an initial request.
      // CLASSIFIED BY SYSTEM PROMPT, having actually looked. The "baseline of 2" was neither a
      // correction nor FF leakage: an ordinary A-plot costs one GENERATOR call plus one
      // COMPRESSION call ("compressing the procedural A-plot into SIX one-sentence summaries for
      // the Scene 1 planner") — a separate downstream step with nothing to do with classification.
      // The earlier `canonish` flag was a false positive on the phrase "CANONICAL NAMES".
      aplotRequests++;
      const _isGen = /A-PLOT GENERATOR/i.test(body);
      const _isCompress = /compressing the procedural A-plot/i.test(body);
      if (_isGen) {
        // A correction re-sends the validation errors; a first attempt does not.
        if (/validation|error|invalid|missing_|antagonistSubject/i.test(body) && aplotInitial > 0) {
          aplotCorrections++;
          if (/antagonistSubject/i.test(body)) aplotClassCorrections++;
        } else { aplotInitial++; }
      } else if (_isCompress) { aplotCompress++; }
      else { aplotOther++; }
      if (process.env.SB_REQ) {
        try {
          const j = JSON.parse(body);
          const sys = String((j.messages || []).find(m => m.role === 'system')?.content || '').slice(0, 110);
          const usr = String((j.messages || []).find(m => m.role === 'user')?.content || '').slice(0, 110);
          reqLog.push({ n: aplotRequests, sys, usr });
        } catch (_) { reqLog.push({ n: aplotRequests, raw: body.slice(0, 140) }); }
      }
      // FAIL FOR THE WHOLE ATTEMPT, not once: generateAPlot walks the provider chain on failure,
      // so a single 500 is simply retried on the next provider and the carry-forward succeeds —
      // which is exactly what happened the first time this test was written.
      const _fail = await page.evaluate(() => !!window.__failAllAplot);
      if (_fail && _isGen) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' });
      const payload = await page.evaluate(() => {
        window.__lastGoodPayload = window.__aplotPayload;
        return JSON.stringify(window.__aplotPayload || {});
      });
      return route.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify({ ok: true, content: payload }) });
    }
    return route.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' });
  });

  console.log(' 0 · THE PRODUCTION PATH');
  const P1 = await runAPlot({ kind: 'PERSON', proper_name: null });
  t('0a: initAPlot mints and persists an A-plot id', /^aplot:/.test(String(P1.id)), JSON.stringify(P1.id));
  t('0b: the CLASSIFICATION survives the state handoff — the seam that was silently dropping it',
    !!P1.subject && P1.subject.kind === 'PERSON', JSON.stringify(P1.subject));
  t('0c: the reference label is DERIVED from antagonistOrAntiForce, not model-restated',
    P1.subject && P1.subject.reference_label === 'the presiding Dohkar', JSON.stringify(P1.subject));
  t('0d: production actually mints a canonical identity',
    !!P1.canonicalId && P1.entities.length === 1, JSON.stringify([P1.canonicalId, P1.entities]));
  const P2 = await runAPlot({ kind: 'INSTITUTION', proper_name: null });
  t('0e: an INSTITUTION mints nothing through the real path',
    P2.entities.length === 0 && !P2.canonicalId && P2.subject.kind === 'INSTITUTION', JSON.stringify(P2));
  const P3 = await runAPlot({ kind: 'person', proper_name: null });
  t('0f: a lowercase "person" is NORMALISED, not silently un-mintable',
    P3.subject && P3.subject.kind === 'PERSON' && !!P3.canonicalId, JSON.stringify(P3.subject));
  // MEASURE THE BASELINE, DO NOT ASSUME IT. The A-plot flow has a pre-validation regen guard of
  // its own (a project-shape goal check that runs before the soft-pass), so a valid response does
  // not necessarily cost exactly one request. What must hold is that a valid classification adds
  // NOTHING, and a missing one adds exactly one correction on top of whatever the baseline is.
  aplotInitial = 0; aplotCorrections = 0; aplotClassCorrections = 0; aplotCompress = 0; aplotOther = 0;
  await runAPlot({ kind: 'PERSON', proper_name: null });
  t('0g0: a VALID ordinary A-plot makes exactly ONE generator request and NO correction',
    aplotInitial === 1 && aplotCorrections === 0,
    `generator=${aplotInitial} corrections=${aplotCorrections} compression=${aplotCompress} other=${aplotOther}`);
  t('0g0b: …and the second request is the ACCOUNTED-FOR compression step, not ambient leakage',
    aplotCompress === 1 && aplotOther === 0,
    `compression=${aplotCompress} unclassified=${aplotOther}`);
  aplotInitial = 0; aplotCorrections = 0; aplotClassCorrections = 0; aplotCompress = 0; aplotOther = 0;
  const P4 = await runAPlot(undefined);
  t('0g: a fresh response with NO block degrades to UNKNOWN and mints nothing',
    P4.subject && P4.subject.kind === 'UNKNOWN' && P4.entities.length === 0, JSON.stringify(P4));
  t('0g2: …after exactly ONE generator, ONE classification correction, ONE compression and ' +
    'nothing unclassified — the soft-pass no longer waves a missing classification through',
    aplotInitial === 1 && aplotCorrections === 1 && aplotClassCorrections === 1
      && aplotCompress === 1 && aplotOther === 0,
    `generator=${aplotInitial} corrections=${aplotCorrections} carrying-classification=${aplotClassCorrections} compression=${aplotCompress} unclassified=${aplotOther}`);
  aplotInitial = 0; aplotCorrections = 0;
  const beforeLegacy = aplotRequests;
  const legacy = await page.evaluate(() => {
    const s = window.state;
    // A restored pre-schema A-plot: present, complete, and carrying no antagonistSubject.
    s.aPlot = { id: null, goal: 'g', namedClock: 'c', antagonistOrAntiForce: 'the presiding Dohkar',
                antagonistShape: 'A', milestones: [{ atScene: 1, event: 'x' }] };
    return { kind: (s.aPlot.antagonistSubject || {}).kind || 'absent' };
  });
  t('0g3: a LEGACY restored A-plot performs NO request at all',
    aplotRequests === beforeLegacy && aplotInitial === 0 && aplotCorrections === 0
      && legacy.kind === 'absent', `${beforeLegacy} → ${aplotRequests}`);
  const P5 = await runAPlot({ kind: 'PERSON', proper_name: null });
  t('0h: two A-plots receive DISTINCT ids', P5.id !== P1.id, JSON.stringify([P1.id, P5.id]));

  // ── THE SCAFFOLD REQUEST ITSELF, CAPTURED ──
  // Comparing source positions proved neither execution nor delivery. This drives the real
  // scaffold and reads what was actually sent.
  const scaffoldFor = async (subject) => {
    lastScaffoldBody = null;
    await runAPlot(subject);
    await page.evaluate(async () => {
      window.state._cgScaffoldPromise = null; window.state.cgScaffold = null;
      try { if (typeof window._ensureCGScaffold === 'function') await window._ensureCGScaffold(window.state); } catch (_) {}
    });
    return lastScaffoldBody;
  };
  const sPerson = await scaffoldFor({ kind: 'PERSON', proper_name: null });
  const sForce  = await scaffoldFor({ kind: 'FORCE', proper_name: null });
  if (process.env.SB_REQ) console.log('  [requests]', JSON.stringify(reqLog.slice(0, 6), null, 1));
  console.log(' 0b · THE SCAFFOLD HANDOFF');
  t('0i: a PERSON\'s backend subject_ref reaches the scaffold request EXACTLY once',
    !!sPerson && (sPerson.match(/plot:[A-Za-z0-9_]+:primary_antagonist/g) || []).length === 1,
    sPerson ? JSON.stringify((sPerson.match(/plot:[^"\\ ]{6,60}/g) || []).slice(0, 3)) : 'NO SCAFFOLD REQUEST CAPTURED');
  t('0j: …and a FORCE supplies NO roster block and no subject_ref at all',
    !!sForce && !/plot:[A-Za-z0-9_]+:primary_antagonist/.test(sForce)
      && !/PORTFOLIO SUBJECTS \(/.test(sForce),
    sForce ? ('ref=' + /plot:[A-Za-z0-9_]+:primary_antagonist/.test(sForce)
              + ' roster=' + /PORTFOLIO SUBJECTS \(/.test(sForce)) : 'NO SCAFFOLD REQUEST CAPTURED');
  // ── UPDATED WITH THE PROVIDER COMMIT (2026-08-29) ──
  // This asserted that NEITHER request asks for portfolios, which was true while the roster was
  // input-only. Portfolios are now generated, so the real contract is CONDITIONAL: a PERSON gets
  // both the roster and the response schema; a FORCE gets neither. The schema used to be printed
  // unconditionally — telling a model with no subject list to "COPY a subject_ref from PORTFOLIO
  // SUBJECTS below", which is an instruction to invent one.
  t('0j2: the PERSON request asks for portfolios; the FORCE request is not shown the schema at all',
    !!sPerson && /characterPortfolios/.test(sPerson)
      && !!sForce && !/characterPortfolios/.test(sForce),
    `person=${sPerson && /characterPortfolios/.test(sPerson)} force=${sForce && /characterPortfolios/.test(sForce)}`);

  // ── A-PLOT ID: PRODUCTION MINT + RERENDER, THEN A JSON ROUND-TRIP ──
  // Honest scope: the mint and rerender ARE production. The restore half is a serialise/assign
  // round-trip, not continueStory. Continuation is covered through the real seam at 0p–0s.
  // A PERSON plot is established first: the preceding FORCE case correctly mints nothing, so
  // running the lifecycle on it would compare against an absent canonicalId.
  await runAPlot({ kind: 'PERSON', proper_name: null });
  const lifecycle = await page.evaluate(async () => {
    const s = window.state;
    const out = {};
    out.id1 = s.aPlot && s.aPlot.id;
    // rerender: initAPlot must not re-mint when an A-plot already exists
    try { await window.initAPlot({ tier: 'fling' }); } catch (_) {}
    out.idAfterRerender = s.aPlot && s.aPlot.id;
    // save/restore
    const snap = JSON.parse(JSON.stringify({ aPlot: s.aPlot, rel: s._relationshipLedger }));
    s.aPlot = null; s._relationshipLedger = null;
    Object.assign(s, { aPlot: snap.aPlot, _relationshipLedger: snap.rel });
    out.idAfterRestore = s.aPlot && s.aPlot.id;
    out.identityAfterRestore = window._relPlotRoleEntity(s.aPlot.id, 'primary_antagonist', {});
    out.canonicalOnPlot = (s.aPlot.antagonistSubject || {}).canonicalId;
    return out;
  });
  t('0k: a rerender REUSES the A-plot id, it does not re-mint',
    lifecycle.idAfterRerender === lifecycle.id1, JSON.stringify(lifecycle));
  t('0l: a JSON round-trip of state preserves the id and resolves the same identity ' +
    '(NOT continueStory — the real restore boundary is not driven here)',
    lifecycle.idAfterRestore === lifecycle.id1
      && lifecycle.identityAfterRestore === lifecycle.canonicalOnPlot, JSON.stringify(lifecycle));

  // ── VERIFIED ADMISSION vs THE PLOT ROLE: what production can and cannot do ──
  const adm = await page.evaluate(() => {
    const s = window.state;
    Object.assign(s, { storyId: 'adm-1', _relationshipLedger: null, _characterDisclosureLedger: {},
      name: 'Lirael', playerName: 'Lirael' });
    const roleId = window._relPlotRoleEntity('aplot:adm', 'primary_antagonist',
      { label: 'the presiding Dohkar', provenance: 'aplot_antagonist' });
    window._relEnsureAuthorProfile(window._relLedger().entities[roleId], 'aplot_antagonist', null);
    const before = Object.keys(window._relLedger().entities).length;
    // (a) admitted under the SAME label the role carries
    const same = window._charLedgerApplyVerified({ name: 'the presiding Dohkar', present: true,
      newLayer: 'says the final clause a half-beat fast' }, 3);
    const afterSame = Object.keys(window._relLedger().entities).length;
    // (b) admitted under a NEW proper name — the rename case
    const renamed = window._charLedgerApplyVerified({ name: 'Dohkar Aemon', present: true,
      newLayer: 'answers to a name nobody has used yet' }, 4);
    const afterRenamed = Object.keys(window._relLedger().entities).length;
    return { roleId, before, sameId: same && same.canonicalId, afterSame,
             renamedId: renamed && renamed.canonicalId, afterRenamed,
             liveRoleStillThere: !window._relLedger().entities[roleId].supersededBy };
  });
  console.log(' 0c · VERIFIED ADMISSION AND THE PLOT ROLE');
  t('0m: admitted under the SAME label, admission attaches to the existing plot-role identity',
    adm.sameId === adm.roleId && adm.afterSame === adm.before, JSON.stringify(adm));
  t('0n: RECORDED BOUNDARY — a NEW proper name creates a second identity, because production ' +
    'has no evidence linking them',
    adm.renamedId !== adm.roleId && adm.afterRenamed === adm.afterSame + 1, JSON.stringify(adm));
  console.log('      ⚠ RECORDED LIMIT: the disclosure extractor returns name / newLayer /');
  console.log('        framing / relationshipToPC only — no alias, knownAs or equivalence field.');
  console.log('        So "Dohkar Aemon is the presiding Dohkar" is not assertable from any');
  console.log('        structured source today. Reconciliation is DELIBERATELY not wired: linking');
  console.log('        them would be a guess, and a wrong guess merges two people permanently.');

  // ── CONTINUATION, THROUGH THE PRODUCTION CARRY-FORWARD SEAM ──
  // The helper test supplied two literal ids and so could not see that
  // _snapshotAPlotForCarryForward minted a SYNTHETIC id and discarded the real one — the new
  // stable id died at the single seam whose job is carrying lineage across.
  await runAPlot({ kind: 'PERSON', proper_name: null });
  const cf = await page.evaluate(async () => {
    const s = window.state;
    const P = s.aPlot.id;
    const priorAntagonist = (s.aPlot.antagonistSubject || {}).canonicalId;
    s.aPlot.generatedAt = 1700000000000;
    (s.aPlot.milestones || []).forEach(m => { m.triggered = true; });
    let threw = null;
    // A REAL Pattern-A transition from the production table. 'fling->fling' is not one, and the
    // code correctly clears the A-plot for regeneration when asked for a rule that does not
    // exist — which is why the first version of this test saw a null replacement.
    try { await window.carryForwardAPlot({ fromTier: 'taste', toTier: 'fling', atScene: 3 }); }
    catch (e) { threw = String(e && e.message).slice(0, 140); }
    const a = s.aPlot || {};
    const L = window._relLedger();
    const newAntagonist = (a.antagonistSubject || {}).canonicalId || null;
    // ── OWNERSHIP PROVED THROUGH THE CANONICAL API, COUNT-INVARIANT ──
    // A uuid substring match is indirect, and a lookup that MINTS on miss could manufacture the
    // very mapping it claims to verify. The count is recorded first: if either call created
    // anything, the count moves and the assertion fails.
    const countBefore = Object.keys(L.entities).length;
    const lookupN = window._relPlotRoleEntity(a.id, 'primary_antagonist', {});
    const lookupP = window._relPlotRoleEntity(P, 'primary_antagonist', {});
    const countAfter = Object.keys(L.entities).length;
    return { P, N: a.id || null, continuationOf: a.continuationOf || null,
             snapshotId: (a.priorSnapshot || {}).id || null,
             priorAntagonist, newAntagonist,
             lookupN, lookupP, countBefore, countAfter,
             bothPresent: !!L.entities[lookupN] && !!L.entities[lookupP],
             plotKeys: L ? Object.keys(L.entities).filter(k => /^plot:/.test(k)) : [],
             threw };
  });
  console.log(' 0d · CONTINUATION THROUGH carryForwardAPlot');
  t('0p: the replacement A-plot has a DISTINCT stable id',
    !!cf.P && !!cf.N && cf.N !== cf.P, JSON.stringify(cf));
  t('0q: continuationOf records the PRIOR id — the lineage the synthetic snapshot id destroyed',
    cf.continuationOf === cf.P, JSON.stringify({ continuationOf: cf.continuationOf, P: cf.P }));
  t('0r: priorSnapshot.id is the authoritative prior id, not a minted stand-in',
    cf.snapshotId === cf.P, JSON.stringify({ snapshotId: cf.snapshotId, P: cf.P }));
  t('0s: N resolves to the NEW antagonist and P still resolves to the PRIOR one',
    cf.lookupN === cf.newAntagonist && cf.lookupP === cf.priorAntagonist
      && cf.newAntagonist !== cf.priorAntagonist,
    JSON.stringify({ lookupN: cf.lookupN, newAntagonist: cf.newAntagonist,
                     lookupP: cf.lookupP, priorAntagonist: cf.priorAntagonist }));
  t('0s2: …and BOTH mappings already existed — the verification minted nothing',
    cf.countAfter === cf.countBefore && cf.bothPresent,
    JSON.stringify({ before: cf.countBefore, after: cf.countAfter, bothPresent: cf.bothPresent }));

  // ── REPLAY OF A COMPLETED UPGRADE ──
  // The caller's guard (aPlot.tier !== storyLength) self-closes once this completes, but the call
  // is fire-and-forget, so two invocations arriving before the first finishes both read the stale
  // tier. One purchased upgrade would then produce two A-plots and two antagonist identities.
  const replay = await page.evaluate(async () => {
    const s = window.state;
    const idAfterFirst = s.aPlot.id;
    const beforeCount = Object.keys(window._relLedger().entities).length;
    // (a) sequential replay of the SAME completed transition
    await window.carryForwardAPlot({ fromTier: 'taste', toTier: 'fling', atScene: 3 });
    const afterSequential = { id: s.aPlot.id, count: Object.keys(window._relLedger().entities).length };
    // (b) CONCURRENT double-invocation, the actual race the fire-and-forget caller allows
    s._aPlotCarryDone = {};                       // pretend it has not completed yet
    s.aPlot.tier = 'taste';
    const both = await Promise.all([
      window.carryForwardAPlot({ fromTier: 'taste', toTier: 'fling', atScene: 4 }),
      window.carryForwardAPlot({ fromTier: 'taste', toTier: 'fling', atScene: 4 })
    ]);
    const idBeforeRace = afterSequential.id;
    const countBeforeRace = afterSequential.count;
    return { idAfterFirst, beforeCount, afterSequential,
             concurrentRefused: both.filter(x => x === null).length,
             survivorOk: both.some(x => x && x.id),
             newPlots: (s.aPlot && s.aPlot.id && s.aPlot.id !== idBeforeRace) ? 1 : 0,
             newIdentities: Object.keys(window._relLedger().entities).length - countBeforeRace,
             markedAfter: !!(s._aPlotCarryDone || {})[String(s.storyId) + '::taste->fling'],
             inFlightDrained: (window.__aPlotCarryInFlight && window.__aPlotCarryInFlight.size) || 0 };
  });
  // ── FAIL THEN RETRY, THROUGH THE REAL SEAM ──
  const failRetry = await page.evaluate(async () => {
    const s = window.state;
    Object.assign(s, { storyId: 'fr-1', _relationshipLedger: null, aPlot: null,
      _aPlotCarryDone: {}, fateMode: null, ffContract: null, world: 'modern', worldSubtype: 'city',
      name: 'Lirael', playerName: 'Lirael' });
    window.__aplotPayload = window.__lastGoodPayload;
    await window.initAPlot({ tier: 'taste' });
    const before = { id: s.aPlot.id, tier: s.aPlot.tier,
      antagonist: (s.aPlot.antagonistSubject || {}).canonicalId,
      count: Object.keys(window._relLedger().entities).length };
    window.__failAllAplot = true;                           // every generator request 500s
    const failed = await window.carryForwardAPlot({ fromTier: 'taste', toTier: 'fling', atScene: 3 });
    window.__failAllAplot = false;
    const afterFail = { returned: failed, plotPresent: !!s.aPlot,
      id: s.aPlot && s.aPlot.id, tier: s.aPlot && s.aPlot.tier,
      antagonist: s.aPlot && (s.aPlot.antagonistSubject || {}).canonicalId,
      count: Object.keys(window._relLedger().entities).length,
      marked: !!(s._aPlotCarryDone || {})['fr-1::taste->fling'],
      inFlight: (window.__aPlotCarryInFlight && window.__aPlotCarryInFlight.size) || 0,
      callerWouldRetry: !!(s.aPlot && s.aPlot.tier && s.aPlot.tier !== 'fling') };
    const ok = await window.carryForwardAPlot({ fromTier: 'taste', toTier: 'fling', atScene: 3 });
    const afterOk = { returned: !!ok, id: s.aPlot && s.aPlot.id,
      antagonist: s.aPlot && (s.aPlot.antagonistSubject || {}).canonicalId,
      count: Object.keys(window._relLedger().entities).length,
      marked: !!(s._aPlotCarryDone || {})['fr-1::taste->fling'] };
    return { before, afterFail, afterOk };
  });
  // ── THE EMPTY-storyId GUARD ──
  // Without ownership the key would be "::taste->fling" for EVERY unstamped story, so one
  // story's in-flight transition would refuse another's. It must mutate nothing at all.
  const noStory = await page.evaluate(async () => {
    const s = window.state;
    const beforeReq = { plot: JSON.stringify(s.aPlot), ledger: JSON.stringify(s._relationshipLedger),
                        done: JSON.stringify(s._aPlotCarryDone || {}) };
    s.storyId = '';
    const ret = await window.carryForwardAPlot({ fromTier: 'taste', toTier: 'fling', atScene: 3 });
    const after = { plot: JSON.stringify(s.aPlot), ledger: JSON.stringify(s._relationshipLedger),
                    done: JSON.stringify(s._aPlotCarryDone || {}) };
    s.storyId = 'fr-1';
    return { ret, same: beforeReq.plot === after.plot && beforeReq.ledger === after.ledger
                          && beforeReq.done === after.done,
             inFlight: (window.__aPlotCarryInFlight && window.__aPlotCarryInFlight.size) || 0,
             doneKeys: Object.keys(JSON.parse(after.done)) };
  });
  const reqBeforeNoStory = aplotRequests;
  console.log(' 0e1 · NO storyId → NO OWNERSHIP → NO MUTATION');
  t('0x: carry-forward with an empty storyId returns null', noStory.ret === null, JSON.stringify(noStory.ret));
  t('0x2: …the A-plot, ledger and completed set are byte-equivalent afterwards',
    noStory.same, JSON.stringify(noStory));
  t('0x3: …no in-flight key is left behind and no completed key was added',
    noStory.inFlight === 0 && !noStory.doneKeys.some(k => k.indexOf('::') === 0), JSON.stringify(noStory));
  t('0x4: …and it made zero model requests', aplotRequests === reqBeforeNoStory,
    `${reqBeforeNoStory} → ${aplotRequests}`);

  console.log(' 0e0 · FAIL THEN RETRY');
  t('0w: a FAILED carry-forward leaves the prior A-plot intact — id, tier and antagonist unchanged',
    failRetry.afterFail.plotPresent && failRetry.afterFail.id === failRetry.before.id
      && failRetry.afterFail.tier === failRetry.before.tier
      && failRetry.afterFail.antagonist === failRetry.before.antagonist
      && failRetry.afterFail.count === failRetry.before.count,
    JSON.stringify(failRetry));
  t('0w2: …the completed marker is absent and the in-flight key drained',
    !failRetry.afterFail.marked && failRetry.afterFail.inFlight === 0, JSON.stringify(failRetry.afterFail));
  t('0w3: …and the PRODUCTION caller\'s condition still holds, so it would retry',
    failRetry.afterFail.callerWouldRetry, JSON.stringify(failRetry.afterFail));
  t('0w4: the retry succeeds — exactly one replacement plot and one new antagonist identity',
    failRetry.afterOk.returned && failRetry.afterOk.id !== failRetry.before.id
      && failRetry.afterOk.antagonist !== failRetry.before.antagonist
      && failRetry.afterOk.count === failRetry.before.count + 1,
    JSON.stringify(failRetry.afterOk));
  t('0w5: …and the transition is then marked completed', failRetry.afterOk.marked,
    JSON.stringify(failRetry.afterOk));

  console.log(' 0e · REPLAY OF A COMPLETED UPGRADE');
  t('0t: replaying a COMPLETED transition creates no second A-plot and no second identity',
    replay.afterSequential.id === replay.idAfterFirst
      && replay.afterSequential.count === replay.beforeCount, JSON.stringify(replay));
  t('0u: two CONCURRENT invocations collapse to ONE — and the survivor SUCCEEDS, creating ' +
    'exactly one plot and one identity, then marking the transition done',
    replay.concurrentRefused === 1 && replay.survivorOk && replay.newPlots === 1
      && replay.newIdentities === 1 && replay.markedAfter, JSON.stringify(replay));
  t('0v: the in-flight set drains, so a transition is never permanently un-runnable',
    replay.inFlightDrained === 0, String(replay.inFlightDrained));

  console.log(' 1 · CLASSIFICATION');
  t('1a: a NAMED person classifies', R.namedPerson.ok && R.namedPerson.subject.kind === 'PERSON', JSON.stringify(R.namedPerson));
  t('1b: an UNNAMED person classifies — proper_name is optional, not required',
    R.unnamedPerson.ok && R.unnamedPerson.subject.kind === 'PERSON' && R.unnamedPerson.subject.proper_name === null,
    JSON.stringify(R.unnamedPerson));
  t('1c: a title-only person classifies', R.titleOnly.ok && R.titleOnly.subject.kind === 'PERSON', JSON.stringify(R.titleOnly));
  t('1d: GROUP / INSTITUTION / FORCE classify as themselves',
    R.group.subject.kind === 'GROUP' && R.institution.subject.kind === 'INSTITUTION' && R.force.subject.kind === 'FORCE',
    JSON.stringify([R.group.subject.kind, R.institution.subject.kind, R.force.subject.kind]));
  t('1e: PERSON contradicted by an institutional label FAILS CLOSED',
    !R.contradicted.ok && R.contradicted.subject.kind === 'UNKNOWN', JSON.stringify(R.contradicted));
  t('1f: …and by a faceless-plural label too', !R.contradicted2.ok, JSON.stringify(R.contradicted2));
  t('1g: an unknown kind is rejected, not coerced', !R.badKind.ok, JSON.stringify(R.badKind));
  t('1h: a missing block normalises to UNKNOWN', R.missing.subject.kind === 'UNKNOWN', JSON.stringify(R.missing));

  console.log('\n 2 · IDENTITY');
  t('2a: a PERSON gets a canonical plot-role identity', /^plot:/.test(String(R.personId)), String(R.personId));
  t('2b: …idempotent — the same A-plot and role return the same entity',
    R.personId === R.personAgain, JSON.stringify([R.personId, R.personAgain]));
  t('2c: GROUP and FORCE mint NOTHING', R.groupId === null && R.forceId === null,
    JSON.stringify([R.groupId, R.forceId]));
  t('2d: identity is keyed by A-PLOT INSTANCE, not by name',
    R.keyedByPlot && R.notNameKeyed, JSON.stringify([R.personId, R.namedById]));
  t('2e: two DIFFERENT supplied plot ids yield different people (helper-level; the real ' +
    'continuation seam is covered at 0p–0s)',
    R.continuationDistinct, JSON.stringify([R.personId, R.continuationId]));
  t('2f: the entity is a plot_role carrying a portfolio compartment',
    R.entityKind === 'plot_role' && R.hasProfile, JSON.stringify([R.entityKind, R.hasProfile]));

  console.log('\n 4 · VALIDATION MODES');
  t('4a: FRESH output missing the block is REJECTED',
    !R.freshMissing.valid && R.freshMissing.errors.some(e => /antagonistSubject/.test(e)),
    JSON.stringify(R.freshMissing.errors));
  // Scoped to the property under test: this fixture A-plot is deliberately minimal and trips
  // unrelated milestone/specificity rules, which is fine — what must hold is that a VALID
  // subject block contributes no antagonistSubject error, while a missing one does.
  t('4b: fresh output WITH a valid block raises NO antagonistSubject error',
    !R.freshValid.errors.some(e => /antagonistSubject/.test(e)), JSON.stringify(R.freshValid.errors));
  t('4c: a LEGACY restore missing the block is NOT an error — no repair, no paid retry',
    R.legacyMissing.valid || !R.legacyMissing.errors.some(e => /antagonistSubject/.test(e)),
    JSON.stringify(R.legacyMissing.errors));

  console.log('\n 5 · BODY-BIBLE GATE');
  t('5a: legacy UNKNOWN keeps the old behaviour exactly (A yes, C no)',
    R.gateLegacyA === true && R.gateLegacyC === false, JSON.stringify([R.gateLegacyA, R.gateLegacyC]));
  t('5b: a classified INSTITUTION is refused whatever its shape', R.gateInstA === false, String(R.gateInstA));
  t('5c: a PERSON keeps the A/B body-bible policy — Shape C gets no BODY bible',
    R.gatePersonA === true && R.gatePersonC === false, JSON.stringify([R.gatePersonA, R.gatePersonC]));

  console.log('\n 6 · ORDERING AND COST');
  t('6a: the A-plot request flow ran — this suite drives production, not helpers',
    aplotRequests > 0, String(aplotRequests));
  t('6b: the scaffold request flow ran too', scaffoldRequests > 0, String(scaffoldRequests));
  t('6c: ZERO model requests escaped to the real network', escapedModel === 0, String(escapedModel));
  t('6d: ZERO paid provider calls', paidReal === 0, String(paidReal));
} finally { await ctx.close().catch(() => {}); }

console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
await closeBrowser();
process.exit(fail ? 1 : 0);
