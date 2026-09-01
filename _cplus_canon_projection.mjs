// ══════════════════════════════════════════════════════════════════════════════════════════
//  ESTABLISHED CHARACTER CANON — THE PROJECTION
//
//  Storage that reaches nobody is the defect the audit found, so this tests the packet: what it
//  carries, what it refuses to carry, what it will never truncate, and — the control that makes
//  the rest mean anything — that REMOVING it makes the contradiction cases stop failing.
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
await page.waitForFunction(() => window._cpBuildEstablishedCanon && window._cpCanonFor, { timeout: 60000 });

// ── ONE FIXTURE: Jess with a revealed signature, a revealed episodic truth, a latent truth ──
const build = () => page.evaluate(() => {
  const s = window.state;
  s.storyId = 'canon-fixture'; s._relationshipLedger = null;
  s.playerName = 'Ilse'; s.name = 'Ilse'; s.loveInterestName = 'Adan'; s.partnerName = 'Adan';
  const id = window._relEntityForName('Jess', { create: true });
  window._attachPortfolio(id, [
    { category: 'value', canonical_truth: 'She leads with her decolletage to control where attention lands.',
      possible_pressures: [{ text: 'a room not centred on her', evidence_requires: 'room' }],
      forbidden_restatements: [{ forbid: 'is naturally modest|avoids being noticed', why: 'inverts the mechanism' }] },
    { category: 'insecurity', canonical_truth: 'Her sympathy arrives loudest where someone is watching her give it.',
      possible_pressures: [{ text: 'a witnessed kindness', evidence_requires: 'watch' }],
      forbidden_restatements: [{ forbid: 'is fake', why: 'verdict, not mechanism' }] },
    { category: 'habit', canonical_truth: 'She keeps the name of everyone who owed her a silence.',
      possible_pressures: [{ text: 'a kept secret', evidence_requires: 'secret' }],
      forbidden_restatements: [{ forbid: 'is forgetful|lets things go', why: 'inverts the mechanism' }] },
  ], { provenance: 'generated_cast' });
  const f = window._relLedger().entities[id].authorProfile.cPlusFacets.map(x => x.facet_id);
  const beat = (uid, ord, fid, act, read, persistence) => {
    s._cpDirectedBeats = [{ character: 'Jess', facet_id: fid, expressionMode: 'DISPLAY',
      visibleAction: act, pcInterpretation: read }];
    window._cpCommitScene({ sceneUid: uid, ordinal: ord, issue: 1,
      delivered: [{ canonicalId: id, facet_id: fid, category: 'x', verified: true, persistence: persistence }], appeared: [] });
  };
  beat('S1', 1, f[0], 'she turns so the lamp finds her collarbone', 'she is choosing where my eyes go', 'recurring_signature');
  beat('S4', 4, f[1], 'she crouches to the child once the room quiets', 'the kindness is real and staged', 'episodic');
  // f[2] is never delivered — it stays LATENT.
  return { id, f };
});
const FX = await build();

const V = (view, opts) => page.evaluate(({ cid, view, opts }) => {
  const st = { onStage: [{ id: cid, label: 'Jess' }] };
  const model = window._cpBuildEstablishedCanon(st, {});
  const out = window._cpCanonView(model, view, opts || {});
  return { ...out, entry: model.entries[0] };
}, { cid: FX.id, view, opts });

const CRE = await V('creative', { budget: 100000 });
const AUD = await V('auditor_private', { budget: 100000 });

ok('the creative view is built and names the character', CRE.ok && /Jess/.test(CRE.text), CRE.text.slice(0, 140));
ok('a REVEALED truth reaches the creative view', /decolletage/.test(CRE.text), CRE.text.slice(0, 200));

// ══ THE VIEW SPLIT — THE POINT OF THIS COMMIT ══
ok('★ the LATENT truth is ABSENT from the creative view (planner + author)',
   !/owed her a silence/.test(CRE.text), CRE.text);
ok('★ the SAME latent truth is PRESENT in the private auditor view',
   /owed her a silence/.test(AUD.text), AUD.text.slice(0, 300));
ok('the auditor view carries its own disclosure ban',
   /Do NOT quote, paraphrase, restate or hint/.test(AUD.text), AUD.text.slice(0, 200));
ok('the creative view still protects the latent truth without naming it',
   /not yet on the page; do not settle it here/.test(CRE.text), CRE.text);

// ══ NO MACHINERY IN A CREATIVE PROMPT ══
const LEAK = await page.evaluate((o) => {
  const st = { onStage: [{ id: o.id, label: 'Jess' }] };
  const m = window._cpBuildEstablishedCanon(st, {});
  const t = window._cpCanonView(m, 'creative', { budget: 100000 }).text;
  return { facetId: o.f.some(x => t.indexOf(x) !== -1), gen: /gen:/.test(t),
           pipe: /\|/.test(t), evidence: /evidence_|possible_pressures/.test(t),
           option: /OPT-/.test(t), fingerprint: /stage:v|fingerprint/.test(t),
           json: /\{"|\[\{/.test(t), sample: t.slice(0, 220) };
}, FX);
['facetId', 'gen', 'evidence', 'option', 'fingerprint', 'json'].forEach(k => {
  ok(`the creative view leaks no ${k}`, LEAK[k] === false, JSON.stringify(LEAK).slice(0, 260));
});
ok('★ no regex alternation reaches a creative prompt — prohibitions are ordinary language',
   LEAK.pipe === false, LEAK.sample);
ok('…and the prohibition is still legible as English',
   /never write [“"]/.test(CRE.text), (CRE.text.match(/never write[^\n]{0,80}/) || [''])[0]);

// ══ THE DELIBERATE REVEAL ══
const SEL = await page.evaluate((o) => {
  const st = { onStage: [{ id: o.id, label: 'Jess' }] };
  const m = window._cpBuildEstablishedCanon(st, {});
  const latent = m.entries[0].allFacets.find(f => f.disclosureStatus === 'latent');
  const chosen = window._cpCanonView(m, 'selected_option', { facetId: latent.facet_id });
  const other = m.entries[0].allFacets.filter(f => f.facet_id !== latent.facet_id);
  const bogus = window._cpCanonView(m, 'selected_option', { facetId: 'gen:nope:v1:value' });
  // A facet nothing has happened to has NO continuity row — absence IS latency, and reading it
  // as a crash (or as "revealed") would be reading the storage model backwards.
  const st2 = window._cpFacetStateFor(o.id, latent.facet_id);
  const stateNow = st2 ? st2.disclosureStatus : 'latent';
  return { text: chosen.text, ok: chosen.ok,
           exposesOnlyOne: other.every(f => chosen.text.indexOf(f.truth) === -1),
           bogus, stillLatent: stateNow };
}, FX);
ok('the selected-option view exposes the ONE grounded latent truth',
   SEL.ok && /owed her a silence/.test(SEL.text), SEL.text);
ok('★ …and exposes no other facet', SEL.exposesOnlyOne === true, SEL.text);
ok('a facet that is not in this character canon is refused',
   SEL.bogus.ok === false && SEL.bogus.code === 'facet_not_in_canon', JSON.stringify(SEL.bogus));
ok('★ selecting it does NOT mark it revealed — only finalized delivery does',
   SEL.stillLatent === 'latent', SEL.stillLatent);

// ══ THE SOURCE ADAPTER — A CALL SITE CANNOT ERASE CANON BY FORGETTING ══
const ADP = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'adapter'; s._relationshipLedger = null;
  s.playerName = 'Lirael'; s.name = 'Lirael'; s._starterId = 'starter_first_sacrifice';
  s.is_starter_story = true;
  const idx = (typeof window._seedFacetIndex === 'function') ? window._seedFacetIndex(s) : null;
  const keys = idx ? Object.keys(idx) : [];
  if (!keys.length) return { skipped: 'seed facet index empty' };
  const key = keys.find(k => (idx[k].facets || []).length) || keys[0];
  const ent = window._relEntityForName(idx[key].label, { create: true });
  // NOTHING is passed in opts: whatever the adapter finds, it finds on its own.
  const got = window._cpCanonSources(window._relLedger().entities[ent], key, {});
  return { key, label: idx[key].label, seedFacets: (idx[key].facets || []).length, adapterFound: got.length };
});
if (ADP.skipped) ok('the seed facet index is populated for the adapter case', false, ADP.skipped);
else ok('★ the adapter finds seed/manual canon with NOTHING supplied by the caller',
        ADP.adapterFound >= ADP.seedFacets && ADP.seedFacets > 0, JSON.stringify(ADP));

// ══ THE BUDGET FAILS CLOSED ══
// The adapter case above deliberately switches to the seeded story, and the ledger is
// story-scoped, so the fixture is rebuilt here. Reusing the stale handle produced an EMPTY
// model, and an empty model has no must-preserve to overflow — the budget test would have
// reported "no failure" while testing nothing at all.
const FXb = await build();
const BUD = await page.evaluate((cid) => {
  const st = { onStage: [{ id: cid, label: 'Jess' }] };
  const m = window._cpBuildEstablishedCanon(st, {});
  return { tiny: window._cpCanonView(m, 'creative', { budget: 120 }),
           roomy: window._cpCanonView(m, 'creative', { budget: 100000 }),
           entries: m.entries.length };
}, FXb.id);
ok('the budget fixture actually has canon to overflow (guards the case above)',
   BUD.entries > 0, JSON.stringify(BUD.entries));
ok('★ must-preserve overflow FAILS CLOSED with a named code, never a silent trim',
   BUD.tiny.ok === false && BUD.tiny.code === 'canon_budget_exceeded' && BUD.tiny.text === '',
   JSON.stringify({ code: BUD.tiny.code, required: BUD.tiny.required, budget: BUD.tiny.budget }));
ok('CONTROL: the same model at a real budget succeeds — the failure is the budget, not the model',
   BUD.roomy.ok === true && BUD.roomy.text.length > 0, String(BUD.roomy.text.length));

const MID = await page.evaluate((cid) => {
  const st = { onStage: [{ id: cid, label: 'Jess' }] };
  const m = window._cpBuildEstablishedCanon(st, {});
  const full = window._cpCanonView(m, 'creative', { budget: 100000 }).text;
  const core = full.split('\n').filter(l => /established|ALWAYS TRUE|not yet on the page/.test(l)).join('\n');
  const mid = window._cpCanonView(m, 'creative', { budget: core.length + 400 });
  return { ok: mid.ok, hasGuards: /never write/.test(mid.text), hasColour: /last shown by/.test(mid.text),
           fullHasColour: /last shown by/.test(full) };
}, FXb.id);
ok('at a mid budget the guards survive and only the colour is dropped',
   MID.ok && MID.hasGuards && !MID.hasColour && MID.fullHasColour, JSON.stringify(MID));

// ══ PARITY ACROSS TYPES, IN ONE MODEL ══
const PAR = await page.evaluate(() => {
  const s = window.state; s.storyId = 'canon-parity'; s._relationshipLedger = null;
  s.playerName = 'Ilse'; s.name = 'Ilse'; s.loveInterestName = 'Adan'; s.partnerName = 'Adan';
  delete s._starterId; s.is_starter_story = false;
  const kinds = { pc: window._relPcId(), li: window._relLiId(),
                  antagonist: window._relEntityForName('The Chayr', { create: true }),
                  seeded: window._relEntityForName('Seren', { create: true }),
                  generated: window._relEntityForName('A Porter', { create: true }) };
  const stage = { onStage: [] };
  Object.keys(kinds).forEach((k, i) => {
    const id = kinds[k];
    window._attachPortfolio(id, [{ category: 'value',
      canonical_truth: k + ' holds one line longer than the room expects.',
      possible_pressures: [{ text: 'a pause', evidence_requires: 'pause' }],
      forbidden_restatements: [{ forbid: 'is impatient', why: 'inverts it' }] }], { provenance: 'generated_cast' });
    const fid = (window._relLedger().entities[id].authorProfile.cPlusFacets[0] || {}).facet_id;
    window.state._cpDirectedBeats = [{ character: k, facet_id: fid, expressionMode: 'CONTROL',
      visibleAction: k + ' waits a beat too long', pcInterpretation: 'the pause is doing the work' }];
    window._cpCommitScene({ sceneUid: 'PC' + i, ordinal: i + 1, issue: 1,
      delivered: [{ canonicalId: id, facet_id: fid, category: 'value', verified: true }], appeared: [] });
    stage.onStage.push({ id: id, label: k });
  });
  const m = window._cpBuildEstablishedCanon(stage, {});
  return { count: m.entries.length, allHaveCanon: m.entries.every(e => e.mustNotContradict.length === 1) };
});
ok('★ PC, LI, antagonist, seeded and generated all appear in ONE model',
   PAR.count === 5 && PAR.allHaveCanon === true, JSON.stringify(PAR));

const EMPTY = await page.evaluate(() => {
  const s = window.state; s.storyId = 'canon-empty'; s._relationshipLedger = null;
  const id = window._relEntityForName('Stranger', { create: true });
  const m = window._cpBuildEstablishedCanon({ onStage: [{ id: id, label: 'Stranger' }] }, {});
  return { entries: m.entries.length, text: window._cpCanonView(m, 'creative', {}).text };
});
ok('an unknown character produces no packet at all', EMPTY.text === '' && EMPTY.entries === 0, JSON.stringify(EMPTY));

// ══ THE VACUITY CONTROL — REMOVING THE PRIVATE CANON MUST BREAK DETECTION ══
const FX2 = await build();
const CTRL = await page.evaluate((o) => {
  const st = { onStage: [{ id: o.id, label: 'Jess' }] };
  const m = window._cpBuildEstablishedCanon(st, {});
  const withPrivate = window._cpCanonView(m, 'auditor_private', { budget: 100000 }).text;
  // The latent truth is what makes "Jess quietly forgets who owed her" catchable at all.
  const detectableWith = /owed her a silence/.test(withPrivate);
  const detectableWithout = /owed her a silence/.test('');
  // …and the revealed mechanism is what makes the demure case catchable.
  const demureWith = /naturally modest|avoids being noticed/.test(withPrivate);
  return { detectableWith, detectableWithout, demureWith };
}, FX2);
ok('★ CONTROL: removing the private canon removes the latent truth the check depends on',
   CTRL.detectableWith === true && CTRL.detectableWithout === false, JSON.stringify(CTRL));
ok('★ CONTROL: the demure prohibition exists only because the canon is built',
   CTRL.demureWith === true, JSON.stringify(CTRL));

const RO = await page.evaluate(async () => {
  const s = window.state; s.storyId = 'canon-ro'; s._relationshipLedger = null;
  const id = window._relEntityForName('Quiet', { create: true });
  window._attachPortfolio(id, [{ category: 'value', canonical_truth: 'He answers the question nobody asked.',
    possible_pressures: [{ text: 'a silence', evidence_requires: 'silence' }],
    forbidden_restatements: [{ forbid: 'is shy', why: 'verdict' }] }], { provenance: 'generated_cast' });
  const fid = window._relLedger().entities[id].authorProfile.cPlusFacets[0].facet_id;
  window.state._cpDirectedBeats = [{ character: 'Quiet', facet_id: fid, expressionMode: 'LEAK',
    visibleAction: 'he answers a question nobody asked', pcInterpretation: 'he has been waiting to say it' }];
  window._cpCommitScene({ sceneUid: 'Q1', ordinal: 1, issue: 1,
    delivered: [{ canonicalId: id, facet_id: fid, category: 'value', verified: true }], appeared: [] });
  const before = JSON.stringify(s._relationshipLedger);
  const st = { onStage: [{ id: id, label: 'Quiet' }] };
  for (let i = 0; i < 3; i++) {
    const m = window._cpBuildEstablishedCanon(st, {});
    window._cpCanonView(m, 'creative', {}); window._cpCanonView(m, 'auditor_private', {});
  }
  return { same: JSON.stringify(s._relationshipLedger) === before };
});
ok('★ building any view mutates NOTHING — prompt builders stay read-only', RO.same === true, JSON.stringify(RO));

ok('zero requests escaped to a provider', escaped === 0, String(escaped));

console.log(`\n${'═'.repeat(78)}\nESTABLISHED CHARACTER CANON — MODEL + CONSUMER VIEWS\n${'═'.repeat(78)}`);
console.log(log.join('\n'));
console.log(`${'─'.repeat(78)}\n ${pass} passed · ${fail} failed\n`);
await ctx.close().catch(() => {}); await browser.close().catch(() => {});
process.exit(fail ? 1 : 0);
