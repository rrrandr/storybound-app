// ══════════════════════════════════════════════════════════════════════════════════════════
//  PREVENTION WIRING — DOES THE CANON ACTUALLY ARRIVE?
//
//  A projection that exists and reaches nobody is the defect this whole phase started from, so
//  this asserts DELIVERY: the planner request and the author directive built by production
//  actually carry the established canon, for every kind of character, with none of the
//  machinery. [[feedback_delivered_to_wrong_layer]] — defined is not delivered.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0; const log = [];
const ok = (n, c, d) => { if (c) { pass++; log.push(`  ✓ ${n}`); } else { fail++; log.push(`  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 420) : ''}`); } };

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
await page.waitForFunction(() => window._cpBuildEstablishedCanon && window.buildSkeletonDirective !== undefined || window.state, { timeout: 60000 });

// ── FIXTURE: five kinds, each with a revealed truth and a latent one ──
// REBUILDABLE ON PURPOSE. Cases below deliberately switch storyId, and the ledger is
// story-scoped, so a section that inherited a previous section's story would be asking about
// characters who no longer exist — and would "pass" by finding nothing. This has now bitten
// three separate suites; the fixture is a function so every section can insist on its own.
const buildFixture = () => page.evaluate(() => {
  const s = window.state;
  s.storyId = 'wiring'; s._relationshipLedger = null;
  s.playerName = 'Ilse'; s.name = 'Ilse'; s.loveInterestName = 'Adan'; s.partnerName = 'Adan';
  s.gender = 'Female'; s.turnCount = 4;
  const kinds = { pc: window._relPcId(), li: window._relLiId(),
                  antagonist: window._relEntityForName('The Chayr', { create: true }),
                  seeded: window._relEntityForName('Seren', { create: true }),
                  generated: window._relEntityForName('A Porter', { create: true }) };
  const out = { ids: {}, labels: {} };
  Object.keys(kinds).forEach((k, i) => {
    const id = kinds[k];
    const ent = window._relLedger().entities[id];
    out.ids[k] = id; out.labels[k] = ent.label;
    window._attachPortfolio(id, [
      { category: 'value', canonical_truth: 'REVEALED-' + k + ': they hold one line longer than the room expects.',
        possible_pressures: [{ text: 'a pause', evidence_requires: 'pause' }],
        forbidden_restatements: [{ forbid: 'fills every silence', why: 'inverts it' }] },
      { category: 'insecurity', canonical_truth: 'LATENT-' + k + ': they rehearse the sentence before they say it.',
        possible_pressures: [{ text: 'a rehearsal', evidence_requires: 'rehearse' }],
        forbidden_restatements: [{ forbid: 'speaks without thinking', why: 'inverts it' }] },
    ], { provenance: 'generated_cast' });
    const f = ent.authorProfile.cPlusFacets.map(x => x.facet_id);
    window.state._cpDirectedBeats = [{ character: ent.label, facet_id: f[0], expressionMode: 'CONTROL',
      visibleAction: 'waits a beat too long', pcInterpretation: 'the pause does the work' }];
    window._cpCommitScene({ sceneUid: 'W' + i, ordinal: i + 1, issue: 1,
      delivered: [{ canonicalId: id, facet_id: f[0], category: 'value', verified: true }], appeared: [] });
  });
  // A stage naming all five, as a scene would.
  s.__wiringStage = { onStage: Object.keys(kinds).map(k => ({ id: kinds[k], label: out.labels[k] })) };
  return out;
});
const FX = await buildFixture();

// ══ 1. THE AUTHOR DIRECTIVE ══
const AUT = await page.evaluate(() => {
  const s = window.state;
  s.sceneSkeleton = { environment_anchor: 'the customs hall', tension_rhythm: 'rising' };
  // Production's own builder, with the stage resolver pointed at the fixture stage.
  // The author reads the invocation's snapshot. Building it here is exactly what the planner
  // seam does — one model, one render — so this drives the real path rather than a second one.
  const model = window._cpBuildEstablishedCanon(s.__wiringStage, {});
  const view = window._cpCanonView(model, 'creative', {});
  s._cpCanonSnapshot = { storyId: s.storyId, text: view.text, entries: model.entries.length,
                         ok: view.ok, code: view.code };
  const d = window.buildSkeletonDirective ? window.buildSkeletonDirective() : '';
  return { chars: d.length, text: d };
});
ok('the author directive is built and carries the established canon',
   /ESTABLISHED CHARACTER CANON/.test(AUT.text), AUT.text.slice(-260));
['pc', 'li', 'antagonist', 'seeded', 'generated'].forEach(k => {
  ok(`★ the author receives ${k}'s revealed truth`,
     AUT.text.indexOf('REVEALED-' + k) !== -1, `label=${FX.labels[k]}`);
});
['pc', 'li', 'antagonist', 'seeded', 'generated'].forEach(k => {
  ok(`the author does NOT receive ${k}'s latent truth`,
     AUT.text.indexOf('LATENT-' + k) === -1, 'latent leaked into the author payload');
});
ok('★ the author payload carries no facet ids, no matcher syntax, no evidence machinery',
   !/gen:|OPT-|evidence_|possible_pressures/.test(AUT.text)
   && !/fills every silence\|/.test(AUT.text), AUT.text.slice(-200));
ok('the prohibition reaches the author as ordinary language',
   /never write [“"]/.test(AUT.text), (AUT.text.match(/never write[^\n]{0,70}/) || [''])[0]);

// ══ 2. OPTION COMPOSITION SEES STRUCTURED CANON, NOT PROSE ══
const OPT = await page.evaluate((ids) => {
  const p = window._cpCanonFor(ids.antagonist, {});
  const revealed = p.allFacets.find(f => f.disclosureStatus === 'revealed');
  const latent = p.allFacets.find(f => f.disclosureStatus === 'latent');
  return { hasStructured: !!(revealed && latent),
           revealed: revealed && { st: revealed.disclosureStatus, cls: revealed.continuityClass, n: revealed.manifestationCount },
           latent: latent && { st: latent.disclosureStatus, n: latent.manifestationCount },
           isObject: typeof p === 'object' && !Array.isArray(p) };
}, FX.ids);
ok('★ option composition can read facet state as DATA (not parsed from a prompt)',
   OPT.hasStructured && OPT.isObject && OPT.revealed.st === 'revealed'
   && OPT.revealed.n === 1 && OPT.latent.st === 'latent' && OPT.latent.n === 0, JSON.stringify(OPT));

// ══ 2b. COVERAGE — COUNTED IS NOT PROTECTED ══
// A subject can be counted, contribute nothing to any prompt, and leave the reader's exposure
// exactly where it was. These two numbers are reported separately so that can never be quietly
// rounded into "protected".
const COV = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'coverage'; s._relationshipLedger = null;
  s.playerName = 'Ilse'; s.name = 'Ilse'; s.loveInterestName = 'Adan'; s.partnerName = 'Adan';
  delete s._starterId; s.is_starter_story = false;
  const safe = window._relEntityForName('Safe', { create: true });
  const unsafe = window._relEntityForName('Unsafe', { create: true });
  window._attachPortfolio(safe, [{ category: 'value', canonical_truth: 'SAFE-TRUTH: she keeps the receipt.',
    possible_pressures: [{ text: 'a favour', evidence_requires: 'favour' }],
    forbidden_restatements: [{ forbid: 'is generous', why: 'verdict, not mechanism' }] }], { provenance: 'generated_cast' });
  // A regex matcher AND a `why` that quotes the truth — both unsafe for a creative prompt.
  window._attachPortfolio(unsafe, [{ category: 'value', canonical_truth: 'UNSAFE-TRUTH: he counts what he is owed.',
    possible_pressures: [{ text: 'a debt', evidence_requires: 'debt' }],
    forbidden_restatements: [{ forbid: 'owed\\w+|(?:counts|tallies)\\s+what',
                               why: 'that is UNSAFE-TRUTH said out loud rather than shown' }] }], { provenance: 'generated_cast' });
  const stage = { onStage: [{ id: safe, label: 'Safe' }, { id: unsafe, label: 'Unsafe' }] };
  const model = window._cpBuildEstablishedCanon(stage, {});
  const creative = window._cpCanonView(model, 'creative', { budget: 100000 });
  const priv = window._cpCanonView(model, 'auditor_private', { budget: 100000 });
  const cov = window._cpCanonCoverage(model);
  const raw = [];
  model.entries.forEach(e => (e.allFacets || []).forEach(f => (f.rawGuards || []).forEach(g => raw.push(g))));
  return { cov, creative: creative.text, priv: priv.text, raw,
           unrenderableLatent: creative.unrenderableLatent };
});
ok('★ coverage separates canon-bearing from creatively protected',
   COV.cov.cplusCanonBearingSubjects === 2 && COV.cov.cplusCreativelyProtectedSubjects === 1
   && COV.cov.cplusAuditorOnlySubjects === 1, JSON.stringify(COV.cov));
ok('★ the auditor-only subject is named as such, not counted as protected',
   COV.cov.subjects.some(x => x.label === 'Unsafe' && x.protection === 'auditor_only')
   && COV.cov.subjects.some(x => x.label === 'Safe' && x.protection === 'creative+auditor'),
   JSON.stringify(COV.cov.subjects));
ok('the unrenderable latent facet count is reported, not silently dropped',
   COV.cov.cplusUnrenderableLatentFacets === 1 && COV.unrenderableLatent === 1, JSON.stringify(COV.unrenderableLatent));
ok('★ no regex syntax reaches the creative view',
   !/[\\(){}\[\]^$*+?]/.test(COV.creative), COV.creative.slice(0, 200));
ok('★ the truth-leaking `why` reaches NEITHER planner nor author',
   COV.creative.indexOf('UNSAFE-TRUTH') === -1
   && !/said out loud rather than shown/.test(COV.creative), COV.creative);
ok('★ …while the full truths DO reach auditor_private',
   /UNSAFE-TRUTH/.test(COV.priv) && /SAFE-TRUTH/.test(COV.priv), COV.priv.slice(0, 200));
ok('★ the validated matcher stays available to the deterministic gate',
   COV.raw.some(g => /owed\\w\+|\(\?:counts/.test(g)), JSON.stringify(COV.raw));

await buildFixture();
// ══ 3. THE CONTROL — REMOVE THE PROJECTION, THE CANON STOPS ARRIVING ══
const CTRL = await page.evaluate(() => {
  const s = window.state;
  const model = window._cpBuildEstablishedCanon(s.__wiringStage, {});
  const view = window._cpCanonView(model, 'creative', {});
  s._cpCanonSnapshot = { storyId: s.storyId, text: view.text, entries: model.entries.length, ok: true, code: null };
  const withIt = window.buildSkeletonDirective();
  s._cpCanonSnapshot = null;                       // the projection never ran for this invocation
  const without = window.buildSkeletonDirective();
  return { withIt: /ESTABLISHED CHARACTER CANON/.test(withIt), without: /ESTABLISHED CHARACTER CANON/.test(without),
           withLen: withIt.length, withoutLen: without.length };
});
ok('★ CONTROL: with no snapshot the author directive loses the canon entirely',
   CTRL.withIt === true && CTRL.without === false && CTRL.withoutLen < CTRL.withLen, JSON.stringify(CTRL));

// ══ 4. A REFUSED VIEW PREVENTS THE CONSUMER FROM RUNNING AT ALL ══
// "No block" is NOT an acceptable outcome when protected characters are present — that is the
// original defect wearing a diagnostic. These are CONSUMER-level: they assert the author
// builder REFUSES, not merely that a helper returned an empty string.
const REFUSE = await page.evaluate(() => {
  const s = window.state;
  // the fixture story, five protected characters (rebuilt immediately above)
  const model = window._cpBuildEstablishedCanon(s.__wiringStage, {});
  s._cpCanonSnapshot = { storyId: s.storyId, text: '', entries: model.entries.length,
                         ok: false, code: 'canon_budget_exceeded' };
  let threw = null, produced = null;
  try { produced = window.buildSkeletonDirective(); } catch (e) { threw = String(e && e.message); }
  const fault = s._cpCanonFault;
  s._cpCanonSnapshot = null;
  return { threw, produced: produced === null ? null : produced.length, fault };
});
ok('★ AUTHOR: a refused projection with protected characters THROWS — no directive is produced',
   REFUSE.threw !== null && REFUSE.produced === null, JSON.stringify(REFUSE).slice(0, 220));
ok('★ …and the failure is NAMED canon_projection_failed, with the protected count',
   /canon_projection_failed/.test(REFUSE.threw || '') && REFUSE.fault
   && REFUSE.fault.code === 'canon_projection_failed' && REFUSE.fault.protected === 5,
   JSON.stringify(REFUSE.fault));

// The same refusal with NOBODY protected is legal — omitting the block is correct there.
const REFUSE_EMPTY = await page.evaluate(() => {
  const s = window.state;
  // BORROWS the story and gives it back. Four separate cases in this project have now been
  // broken by a block that switched storyId and left it switched: the ledger is story-scoped,
  // so every fixture handle taken earlier silently points at nobody, and the symptom is a green
  // assertion that proves nothing rather than a red one.
  const _prevStory = s.storyId, _prevLedger = s._relationshipLedger;
  s.storyId = 'wiring-none'; s._relationshipLedger = null;
  const id = window._relEntityForName('Nobody', { create: true });
  // A refusal with NOBODY protected: entries = 0, so the author must proceed.
  s._cpCanonSnapshot = { storyId: s.storyId, text: '', entries: 0, ok: false,
                         code: 'canon_budget_exceeded' };
  let threw = null, produced = null;
  try { produced = window.buildSkeletonDirective(); } catch (e) { threw = String(e && e.message); }
  s._cpCanonSnapshot = null;
  s.storyId = _prevStory; s._relationshipLedger = _prevLedger;      // given back
  return { threw, produced: produced === null ? null : produced.length };
});
ok('★ CONTROL: the same refusal with NO protected character is legal — the scene proceeds',
   REFUSE_EMPTY.threw === null && REFUSE_EMPTY.produced > 0, JSON.stringify(REFUSE_EMPTY));

// A canon FAULT propagates; an unrelated fault still must not cost the scene.
const UNRELATED = await page.evaluate(() => {
  const s = window.state;
  const realStage = window._sceneStageContract, realBuild = window._cpBuildEstablishedCanon;
  window._sceneStageContract = function () { return s.__wiringStage; };
  // OUTSIDE the canon path: the helper is absent entirely, so the path is never entered.
  window._cpBuildEstablishedCanon = undefined;
  let threw = null, produced = null;
  try { produced = window.buildSkeletonDirective(); } catch (e) { threw = String(e && e.message); }
  window._cpBuildEstablishedCanon = realBuild; window._sceneStageContract = realStage;
  return { threw, produced: produced === null ? null : produced.length };
});
ok('a failure BEFORE the canon path is entered is still non-fatal',
   UNRELATED.threw === null && UNRELATED.produced > 0, JSON.stringify(UNRELATED));

// ══ 4c. THE AUTHOR DOES NOT REBUILD THE PROJECTION ══
// It used to resolve the stage again and rebuild the model for itself. That made planner/author
// agreement a coincidence, and put a second full stage resolution on the author path where a
// fault in RE-DERIVATION could refuse to write a scene whose canon was fine. The delivery suite
// showed it as an intermittent S7 failure. These assert the rebuild is gone.
const NOREBUILD = await page.evaluate(() => {
  const s = window.state;
  const model = window._cpBuildEstablishedCanon(s.__wiringStage, {});
  const view = window._cpCanonView(model, 'creative', {});
  s._cpCanonSnapshot = { storyId: s.storyId, text: view.text, entries: model.entries.length, ok: true, code: null };
  let builds = 0, stages = 0, views = 0;
  const rb = window._cpBuildEstablishedCanon, rv = window._cpCanonView, rs = window._sceneStageContract;
  window._cpBuildEstablishedCanon = function () { builds++; return rb.apply(null, arguments); };
  window._cpCanonView = function () { views++; return rv.apply(null, arguments); };
  window._sceneStageContract = function () { stages++; return rs.apply(null, arguments); };
  const d = window.buildSkeletonDirective();
  window._cpBuildEstablishedCanon = rb; window._cpCanonView = rv; window._sceneStageContract = rs;
  s._cpCanonSnapshot = null;
  return { builds, views, stages, gotCanon: /ESTABLISHED CHARACTER CANON/.test(d) };
});
ok('★ the author builds NO model, renders NO view and resolves NO stage — it reads the snapshot',
   NOREBUILD.builds === 0 && NOREBUILD.views === 0 && NOREBUILD.stages === 0, JSON.stringify(NOREBUILD));
ok('★ …and still receives the canon', NOREBUILD.gotCanon === true, JSON.stringify(NOREBUILD));

// A snapshot belonging to a DIFFERENT story is not this scene's canon and must be ignored.
const FOREIGN = await page.evaluate(() => {
  const s = window.state;
  const model = window._cpBuildEstablishedCanon(s.__wiringStage, {});
  const view = window._cpCanonView(model, 'creative', {});
  s._cpCanonSnapshot = { storyId: 'some-other-story', text: view.text,
                         entries: model.entries.length, ok: true, code: null };
  const d = window.buildSkeletonDirective();
  s._cpCanonSnapshot = null;
  return { gotCanon: /ESTABLISHED CHARACTER CANON/.test(d) };
});
ok('★ a snapshot stamped with another storyId is ignored, not borrowed',
   FOREIGN.gotCanon === false, JSON.stringify(FOREIGN));

// ══ 4d. A REFUSED VIEW DELIVERS NOTHING, NOT A TRIMMED PACKET ══
const REF = await page.evaluate(() => {
  const s = window.state;
  const realStage = window._sceneStageContract;
  const realView = window._cpCanonView;
  window._sceneStageContract = function () { return s.__wiringStage; };
  window._cpCanonView = function () { return { ok: false, code: 'canon_budget_exceeded', text: '' }; };
  const d = window.buildSkeletonDirective();
  window._cpCanonView = realView;
  window._sceneStageContract = realStage;
  return { hasCanon: /ESTABLISHED CHARACTER CANON/.test(d), hasPartial: /never write/.test(d) };
});
ok('★ a refused view yields NO block rather than a partial one',
   REF.hasCanon === false && REF.hasPartial === false, JSON.stringify(REF));

// ══ 5. A SCENE WITH NOBODY KNOWN GETS NO BLOCK (no empty scaffolding) ══
const NONE = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'wiring-empty'; s._relationshipLedger = null;
  const id = window._relEntityForName('Stranger', { create: true });
  const realStage = window._sceneStageContract;
  window._sceneStageContract = function () { return { onStage: [{ id: id, label: 'Stranger' }] }; };
  const d = window.buildSkeletonDirective();
  window._sceneStageContract = realStage;
  return { hasCanon: /ESTABLISHED CHARACTER CANON/.test(d) };
});
ok('a scene whose cast has no canon gets no canon block', NONE.hasCanon === false, JSON.stringify(NONE));

await buildFixture();
// ══ 6. BUILDING THE DIRECTIVE MUTATES NOTHING ══
const RO = await page.evaluate(() => {
  const s = window.state;
  const before = JSON.stringify(s._relationshipLedger);
  const realStage = window._sceneStageContract;
  window._sceneStageContract = function () { return s.__wiringStage; };
  for (let i = 0; i < 3; i++) window.buildSkeletonDirective();
  window._sceneStageContract = realStage;
  return { same: JSON.stringify(s._relationshipLedger) === before };
});
ok('the author directive builder stays read-only', RO.same === true, JSON.stringify(RO));
ok('zero requests escaped to a provider', escaped === 0, String(escaped));

console.log(`\n${'═'.repeat(78)}\nPREVENTION WIRING — DELIVERY\n${'═'.repeat(78)}`);
console.log(log.join('\n'));
console.log(`${'─'.repeat(78)}\n ${pass} passed · ${fail} failed\n`);
await ctx.close().catch(() => {}); await browser.close().catch(() => {});
process.exit(fail ? 1 : 0);
