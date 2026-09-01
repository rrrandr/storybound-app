// ══════════════════════════════════════════════════════════════════════════════════════════
//  THE DETERMINISTIC CANON GATE
//
//  The forbidden restatements are validated matchers, so the literal contradiction costs
//  nothing to catch. This proves the gate is PRECISE — that it fires on the real thing, and
//  refuses to fire on the four ways a careless matcher would produce a false accusation.
//  Zero model calls, by construction: this component never dispatches.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0; const log = [];
const ok = (n, c, d) => { if (c) { pass++; log.push(`  ✓ ${n}`); } else { fail++; log.push(`  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 400) : ''}`); } };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext(); const page = await ctx.newPage();
await installSession(page);
let escaped = 0;
await page.route('**/*', async route => {
  const url = route.request().url(); const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/.test(path)) escaped++;
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window._cpCanonDeterministicCheck && window._cpBuildEstablishedCanon, { timeout: 60000 });

// Jess: décolletage signature revealed, plus a second character with a DIFFERENT prohibition,
// so a global scan and a subject-scoped one give different answers.
const setup = () => page.evaluate(() => {
  const s = window.state;
  s.storyId = 'gate'; s._relationshipLedger = null;
  s.playerName = 'Ilse'; s.name = 'Ilse'; s.loveInterestName = 'Adan'; s.partnerName = 'Adan';
  delete s._starterId; s.is_starter_story = false;
  const jess = window._relEntityForName('Jess', { create: true });
  window._attachPortfolio(jess, [{ category: 'value',
    canonical_truth: 'She leads with her decolletage to control where attention lands.',
    possible_pressures: [{ text: 'a room not centred on her', evidence_requires: 'room' }],
    forbidden_restatements: [{ forbid: 'naturally modest|avoids being noticed|shrinks from attention',
                               why: 'inverts the mechanism' }] }], { provenance: 'generated_cast' });
  const jf = window._relLedger().entities[jess].authorProfile.cPlusFacets[0].facet_id;
  s._cpDirectedBeats = [{ character: 'Jess', facet_id: jf, expressionMode: 'DISPLAY',
    visibleAction: 'she turns so the lamp finds her collarbone', pcInterpretation: 'she chooses where my eyes go' }];
  window._cpCommitScene({ sceneUid: 'G1', ordinal: 1, issue: 1,
    delivered: [{ canonicalId: jess, facet_id: jf, category: 'value', verified: true, persistence: 'recurring_signature' }], appeared: [] });

  const mara = window._relEntityForName('Mara', { create: true });
  window._attachPortfolio(mara, [{ category: 'value',
    canonical_truth: 'She answers a question with the rule that governs it.',
    possible_pressures: [{ text: 'a direct question', evidence_requires: 'question' }],
    forbidden_restatements: [{ forbid: 'improvises freely', why: 'inverts it' }] }], { provenance: 'generated_cast' });
  const mf = window._relLedger().entities[mara].authorProfile.cPlusFacets[0].facet_id;
  s._cpDirectedBeats = [{ character: 'Mara', facet_id: mf, expressionMode: 'CONTROL',
    visibleAction: 'she cites the clause number', pcInterpretation: 'the rule is her shield' }];
  window._cpCommitScene({ sceneUid: 'G2', ordinal: 2, issue: 1,
    delivered: [{ canonicalId: mara, facet_id: mf, category: 'value', verified: true }], appeared: [] });
  return { jess, mara, jf, mf };
});
const F = await setup();

const check = (text) => page.evaluate(({ text, ids }) => {
  const st = { onStage: [{ id: ids.jess, label: 'Jess' }, { id: ids.mara, label: 'Mara' }] };
  const model = window._cpBuildEstablishedCanon(st, {});
  return window._cpCanonDeterministicCheck(text, model, {});
}, { text, ids: F });

// ══ 1. THE LITERAL CONTRADICTION ══
const LIT = await check('The room filled slowly. Jess is naturally modest, and she took the far chair.');
ok('★ a literal "Jess is naturally modest" is a CONTRADICTION, deterministically',
   LIT.verdict === 'contradiction' && LIT.findings.length === 1, JSON.stringify(LIT.findings));
ok('the finding names the subject, the facet and the reason code',
   LIT.findings[0].subject_ref === F.jess && LIT.findings[0].facet_id === F.jf
   && LIT.findings[0].reason_code === 'forbidden_restatement_literal', JSON.stringify(LIT.findings[0]));
const ALT = await check('Jess shrinks from attention these days.');
ok('any branch of the alternation fires, not only the first',
   ALT.verdict === 'contradiction' && ALT.findings[0].matched === 'shrinks from attention', JSON.stringify(ALT.findings[0]));

// ══ 2. THE FOUR WAYS A CARELESS MATCHER WOULD LIE ══
const OTHER = await check('Mara avoids being noticed, and Jess watched her do it.');
ok('★ a phrase attributed to ANOTHER character does not convict Jess',
   OTHER.findings.every(f => f.label !== 'Jess'), JSON.stringify(OTHER.findings));
// The mirrored case: the same sentence with the roles reversed must convict the OTHER one, so
// the rule above is "nearest preceding subject" and not "never fires when two names appear".
const OTHER2 = await check('Jess avoids being noticed, and Mara watched her do it.');
ok('★ …and the mirrored sentence DOES convict Jess — the rule is attribution, not silence',
   OTHER2.verdict === 'contradiction' && OTHER2.findings[0].label === 'Jess', JSON.stringify(OTHER2.findings));
const OTHER3 = await check('Jess watched Mara avoid being noticed all evening.');
ok('a phrase after another name inside one clause belongs to that name',
   OTHER3.findings.every(f => f.label !== 'Jess'), JSON.stringify(OTHER3.findings));

const SPLIT = await check('Jess crossed to the window. Nobody here avoids being noticed for long.');
ok('★ a match in a DIFFERENT sentence does not attach to her',
   SPLIT.verdict === 'unresolved', JSON.stringify(SPLIT.findings));
const NEG = await check('Jess is not naturally modest, whatever the room decided.');
ok('★ a NEGATED match is agreement with canon, not a violation',
   NEG.verdict === 'unresolved', JSON.stringify(NEG.findings));
const NEG2 = await check('Jess never shrinks from attention.');
ok('…and so is "never"', NEG2.verdict === 'unresolved', JSON.stringify(NEG2.findings));
const SUB = await check('Jess is immodest in a way the room reads as confidence.');
ok('the matcher respects word boundaries — "immodest" is not "modest"',
   SUB.verdict === 'unresolved', JSON.stringify(SUB.findings));

// ══ 3. THE COMPATIBLE CASE — MECHANISM, NOT SURFACE ══
const DEM = await check(
  'Jess had dressed plainly tonight, and she had done it on purpose: in a room this loud, ' +
  'the one woman not asking to be looked at is the one they look at. She let the plainness work.');
ok('★ strategic demureness passes the gate — it contradicts no stored phrase',
   DEM.verdict === 'unresolved', JSON.stringify(DEM.findings));

// ══ 4. A MISS IS NOT A PASS ══
const PARA = await check('Jess had become someone the room simply never turned toward, and she preferred it.');
ok('★ a semantic paraphrase is MISSED by the matcher — and returns unresolved, not compatible',
   PARA.verdict === 'unresolved' && PARA.findings.length === 0, JSON.stringify(PARA));
ok('the gate reports how many prohibitions it actually checked, so a silent no-op is visible',
   PARA.checked > 0, String(PARA.checked));

// ══ 5. A CONTROL THAT THE GATE CAN FAIL AT ALL ══
const CTRL = await page.evaluate(({ ids }) => {
  const st = { onStage: [{ id: ids.jess, label: 'Jess' }] };
  const model = window._cpBuildEstablishedCanon(st, {});
  const text = 'Jess is naturally modest.';
  const withCanon = window._cpCanonDeterministicCheck(text, model, {});
  const stripped = JSON.parse(JSON.stringify(model));
  stripped.entries.forEach(e => e.allFacets.forEach(f => { f.rawGuards = []; }));
  const withoutGuards = window._cpCanonDeterministicCheck(text, stripped, {});
  const noModel = window._cpCanonDeterministicCheck(text, { entries: [] }, {});
  return { withCanon: withCanon.verdict, withoutGuards: withoutGuards.verdict, noModel: noModel.verdict };
}, { ids: F });
ok('★ CONTROL: remove the prohibitions and the same sentence stops being caught',
   CTRL.withCanon === 'contradiction' && CTRL.withoutGuards === 'unresolved' && CTRL.noModel === 'unresolved',
   JSON.stringify(CTRL));

// ══ 6. EVERY CHARACTER TYPE USES THE SAME GATE ══
const PAR = await page.evaluate(() => {
  const s = window.state; s.storyId = 'gate-parity'; s._relationshipLedger = null;
  s.playerName = 'Ilse'; s.name = 'Ilse'; s.loveInterestName = 'Adan'; s.partnerName = 'Adan';
  const kinds = { pc: window._relPcId(), li: window._relLiId(),
                  antagonist: window._relEntityForName('The Chayr', { create: true }),
                  seeded: window._relEntityForName('Seren', { create: true }),
                  generated: window._relEntityForName('A Porter', { create: true }) };
  const stage = { onStage: [] }; const labels = {};
  Object.keys(kinds).forEach((k, i) => {
    const id = kinds[k];
    const ent = window._relLedger().entities[id];
    labels[k] = ent.label;
    window._attachPortfolio(id, [{ category: 'value',
      canonical_truth: 'They hold one line longer than the room expects.',
      possible_pressures: [{ text: 'a pause', evidence_requires: 'pause' }],
      forbidden_restatements: [{ forbid: 'fills every silence', why: 'inverts it' }] }], { provenance: 'generated_cast' });
    const fid = (ent.authorProfile.cPlusFacets[0] || {}).facet_id;
    window.state._cpDirectedBeats = [{ character: k, facet_id: fid, expressionMode: 'CONTROL',
      visibleAction: 'waits a beat too long', pcInterpretation: 'the pause does the work' }];
    window._cpCommitScene({ sceneUid: 'GP' + i, ordinal: i + 1, issue: 1,
      delivered: [{ canonicalId: id, facet_id: fid, category: 'value', verified: true }], appeared: [] });
    stage.onStage.push({ id: id, label: ent.label });
  });
  const model = window._cpBuildEstablishedCanon(stage, {});
  const res = {};
  Object.keys(kinds).forEach(k => {
    const r = window._cpCanonDeterministicCheck(labels[k] + ' fills every silence in the room.', model, {});
    res[k] = { caught: r.findings.some(f => f.label === labels[k]) };
  });
  return res;
});
['pc', 'li', 'antagonist', 'seeded', 'generated'].forEach(k => {
  ok(`${k} is checked by the SAME gate`, PAR[k] && PAR[k].caught === true, JSON.stringify(PAR[k]));
});

// ══ 7. THE GATE IS READ-ONLY AND DISPATCHES NOTHING ══
const RO = await page.evaluate(({ ids }) => {
  const before = JSON.stringify(window.state._relationshipLedger);
  const st = { onStage: [{ id: ids.jess, label: 'Jess' }] };
  const m = window._cpBuildEstablishedCanon(st, {});
  for (let i = 0; i < 5; i++) window._cpCanonDeterministicCheck('Jess is naturally modest.', m, {});
  return { same: JSON.stringify(window.state._relationshipLedger) === before };
}, { ids: F });
ok('the gate mutates nothing', RO.same === true, JSON.stringify(RO));
ok('★ the gate dispatched nothing — zero requests escaped', escaped === 0, String(escaped));

console.log(`\n${'═'.repeat(78)}\nDETERMINISTIC CANON GATE\n${'═'.repeat(78)}`);
console.log(log.join('\n'));
console.log(`${'─'.repeat(78)}\n ${pass} passed · ${fail} failed\n`);
await ctx.close().catch(() => {}); await browser.close().catch(() => {});
process.exit(fail ? 1 : 0);
