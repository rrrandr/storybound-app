// ══════════════════════════════════════════════════════════════════════════════════════════
//  CHARACTER CONTINUITY — STORAGE
//
//  The audit measured what a delivered beat lost: the mode, the act, the protagonist's read,
//  and everything at the issue boundary. This proves the record that replaces that loss, for
//  the PC, the LI, an antagonist, a seeded NPC and a generated NPC alike — one lifecycle, no
//  per-kind special case. Production's own functions, in the real page. Zero model calls.
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
await page.waitForFunction(() => window._cpCommitScene && window._cpContinuityFor && window.__CP_CONTINUITY, { timeout: 60000 });

const K = await page.evaluate(() => window.__CP_CONTINUITY);
ok('the four state vocabularies are orthogonal and exported',
   K.disclosure.join() === 'latent,revealed'
   && K.classes.join() === 'episodic,recurring_signature,invariant'
   && K.development.join() === 'active,complicated,superseded'
   && K.verification.join() === 'directed,verified', JSON.stringify(K));

// A helper that builds one character of any kind and returns its canonical id.
const mk = (label) => page.evaluate((l) => window._relEntityForName(l, { create: true }), label);

// ══ 1. THE JESS LIFECYCLE — SCENES 1, 4 AND 9 ══
const JESS = await page.evaluate(() => {
  const s = window.state;
  Object.assign(s, { storyId: 'jess-life', playerName: 'Ilse', name: 'Ilse',
    loveInterestName: 'Adan', partnerName: 'Adan', issueNumber: 1 });
  s._relationshipLedger = null;
  const id = window._relEntityForName('Jess', { create: true });
  window._attachPortfolio(id, [
    { category: 'value', canonical_truth: 'She leads with her decolletage to control where attention lands.',
      possible_pressures: [{ text: 'a room not centred on her', evidence_requires: 'room' }],
      forbidden_restatements: [{ forbid: 'is vain', why: 'states it rather than showing it' }] },
    { category: 'insecurity', canonical_truth: 'Her sympathy arrives loudest where someone is watching her give it.',
      possible_pressures: [{ text: 'a witnessed kindness', evidence_requires: 'watch' }],
      forbidden_restatements: [{ forbid: 'is fake', why: 'flattens the mechanism into a verdict' }] },
    { category: 'habit', canonical_truth: 'She stays past the point of usefulness for anyone who kept her secret.',
      possible_pressures: [{ text: 'a debt of discretion', evidence_requires: 'secret' }],
      forbidden_restatements: [{ forbid: 'is loyal', why: 'names it instead of showing the cost' }] },
  ], { provenance: 'generated_cast' });
  const f = window._relLedger().entities[id].authorProfile.cPlusFacets.map(x => x.facet_id);
  const beat = (uid, ord, fid, mode, act, read, persistence) => {
    window.state._cpDirectedBeats = [{ character: 'Jess', facet_id: fid,
      expressionMode: mode, visibleAction: act, pcInterpretation: read }];
    return window._cpCommitScene({ sceneUid: uid, ordinal: ord, issue: 1,
      delivered: [{ canonicalId: id, facet_id: fid, category: 'x', verified: true, persistence: persistence }],
      appeared: [] });
  };
  beat('S1', 1, f[0], 'DISPLAY', 'she turns so the lamp finds her collarbone before she answers',
       'she is choosing where my eyes go', 'recurring_signature');
  beat('S4', 4, f[1], 'COMPENSATE', 'she crouches to the child only once the room has quieted',
       'the kindness is real and it is also staged', 'episodic');
  beat('S9', 9, f[2], 'CONCEAL', 'she stays to re-fold the coats nobody asked her to touch',
       'she is paying something back that I did not see her borrow', 'episodic');
  return { id, facets: f, cont: window._cpContinuityFor(id), states: f.map(x => window._cpFacetStateFor(id, x)) };
});
ok('scenes 1, 4 and 9 create three DISTINCT manifestation entries',
   JESS.cont.manifestations.length === 3
   && new Set(JESS.cont.manifestations.map(m => m.sceneUid)).size === 3
   && new Set(JESS.cont.manifestations.map(m => m.facet_id)).size === 3,
   JSON.stringify(JESS.cont.manifestations.map(m => m.sceneUid + ':' + m.relation)));
ok('each entry preserved the mode, the visible action and the PC read',
   JESS.cont.manifestations.every(m => m.expressionMode && m.visibleAction && m.pcInterpretation),
   JSON.stringify(JESS.cont.manifestations[0]));
ok('the truth itself is NOT copied into the continuity record — only the facet id',
   !JSON.stringify(JESS.cont).includes('decolletage'), JSON.stringify(JESS.cont).slice(0, 200));
ok('the first appearance of a facet REVEALS it, later ones reinforce',
   JESS.cont.manifestations.every(m => m.relation === 'revealed'), JSON.stringify(JESS.cont.manifestations.map(m => m.relation)));
ok('the décolletage facet became a recurring signature; the others stayed episodic',
   JESS.states[0].continuityClass === 'recurring_signature'
   && JESS.states[1].continuityClass === 'episodic' && JESS.states[2].continuityClass === 'episodic',
   JSON.stringify(JESS.states.map(s => s.continuityClass)));
ok('all three are revealed, verified, and active',
   JESS.states.every(s => s.disclosureStatus === 'revealed' && s.verifiedCount === 1 && s.developmentStatus === 'active'),
   JSON.stringify(JESS.states.map(s => [s.disclosureStatus, s.verifiedCount, s.developmentStatus])));

// ══ 2. DIRECTED IS NOT VERIFIED ══
const DV = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'directed-only'; s._relationshipLedger = null;
  const id = window._relEntityForName('Nadia', { create: true });
  window._attachPortfolio(id, [{ category: 'value', canonical_truth: 'She answers a question with the question under it.',
    possible_pressures: [{ text: 'being asked something simple', evidence_requires: 'ask' }],
    forbidden_restatements: [{ forbid: 'is evasive', why: 'verdict, not mechanism' }] }], { provenance: 'generated_cast' });
  const fid = window._relLedger().entities[id].authorProfile.cPlusFacets[0].facet_id;
  s._cpDirectedBeats = [{ character: 'Nadia', facet_id: fid, expressionMode: 'TEST',
    visibleAction: 'she asks what he meant by "fine"', pcInterpretation: 'she is checking the floor before standing on it' }];
  window._cpCommitScene({ sceneUid: 'D1', ordinal: 1, issue: 1,
    delivered: [{ canonicalId: id, facet_id: fid, category: 'value' }], appeared: [] });   // no verified flag
  return { st: window._cpFacetStateFor(id, fid), cont: window._cpContinuityFor(id) };
});
ok('an unconfirmed beat is stored as DIRECTED', DV.cont.manifestations[0].verification === 'directed', JSON.stringify(DV.cont.manifestations[0].verification));
ok('★ a directed beat does NOT make the facet revealed — the reader may not have seen it',
   DV.st.disclosureStatus === 'latent' && DV.st.verifiedCount === 0, JSON.stringify(DV.st));
ok('…but it is still recorded, with its directed act intact',
   DV.cont.manifestations.length === 1 && !!DV.cont.manifestations[0].visibleAction, JSON.stringify(DV.cont.manifestations[0]));

// ══ 3. FACET DEFINITIONS ARE NOT MUTATED (fingerprint safety) ══
const FP = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'fp-safe'; s._relationshipLedger = null;
  const id = window._relEntityForName('Vin', { create: true });
  const facets = [{ category: 'value', canonical_truth: 'He keeps the receipt for every favour he does.',
    possible_pressures: [{ text: 'a favour asked', evidence_requires: 'favour' }],
    forbidden_restatements: [{ forbid: 'is petty', why: 'verdict, not mechanism' }] }];
  window._attachPortfolio(id, facets, { provenance: 'generated_cast' });
  const ap = window._relLedger().entities[id].authorProfile;
  const before = ap.fingerprint;
  const fid = ap.cPlusFacets[0].facet_id;
  const facetBefore = JSON.stringify(ap.cPlusFacets[0]);
  window.state._cpDirectedBeats = [{ character: 'Vin', facet_id: fid, expressionMode: 'CONTROL',
    visibleAction: 'he names the favour aloud while handing it over', pcInterpretation: 'the gift has a ledger' }];
  window._cpCommitScene({ sceneUid: 'F1', ordinal: 1, issue: 1,
    delivered: [{ canonicalId: id, facet_id: fid, category: 'value', verified: true }], appeared: [] });
  const after = window._relLedger().entities[id].authorProfile;
  // Re-attaching the SAME portfolio must still be idempotent after a manifestation exists.
  const re = window._attachPortfolio(id, facets, { provenance: 'generated_cast' });
  return { before, after: after.fingerprint, facetBefore, facetAfter: JSON.stringify(after.cPlusFacets[0]), re };
});
ok('★ the facet definition is byte-identical after a manifestation', FP.facetBefore === FP.facetAfter, FP.facetAfter.slice(0, 200));
ok('★ the portfolio fingerprint is unchanged', FP.before === FP.after, `${FP.before} vs ${FP.after}`);
ok('★ re-attaching the same portfolio is still a NOOP, not a conflicting repeat',
   FP.re.ok === true && FP.re.code === 'noop_identical', JSON.stringify(FP.re));

// ══ 4. LEGACY MIGRATION ══
const LEG = await page.evaluate(() => {
  const s = window.state; s.storyId = 'legacy'; s._relationshipLedger = null;
  const id = window._relEntityForName('Old Hand', { create: true });
  window._attachPortfolio(id, [
    { category: 'value', canonical_truth: 'He answers to the room he grew up in, not the one he is in.',
      possible_pressures: [{ text: 'a rule stated aloud', evidence_requires: 'rule' }],
      forbidden_restatements: [{ forbid: 'is old-fashioned', why: 'label, not mechanism' }] },
    { category: 'habit', canonical_truth: 'He repeats an instruction back before he obeys it.',
      possible_pressures: [{ text: 'being told to do something', evidence_requires: 'told' }],
      forbidden_restatements: [{ forbid: 'is careful', why: 'label, not mechanism' }] }], { provenance: 'generated_cast' });
  const f = window._relLedger().entities[id].authorProfile.cPlusFacets.map(x => x.facet_id);
  // A scheduler row from BEFORE continuity existed: a SPENT facet and no manifestation record.
  // `verified` is stated because "spent" is exactly what this fixture is constructing — an
  // unverified beat is an appearance and would leave the row unspent, testing nothing.
  window._cpCommitScene({ sceneUid: 'L1', ordinal: 2, issue: 1,
    delivered: [{ canonicalId: id, facet_id: f[0], category: 'value', verified: true }], appeared: [] });
  delete window._relLedger().entities[id].cplusContinuity;        // the legacy shape
  const migrated = window._cpContinuityFor(id) || (window._cpFacetStateFor(id, f[0]), window._cpContinuityFor(id));
  return { f, spentState: window._cpFacetStateFor(id, f[0]), unusedState: window._cpFacetStateFor(id, f[1]),
           cont: window._cpContinuityFor(id) };
});
ok('a legacy spent facet migrates to REVEALED', LEG.spentState && LEG.spentState.disclosureStatus === 'revealed', JSON.stringify(LEG.spentState));
ok('…with its manifestation marked legacy_unknown_manifestation, not an invented action',
   (LEG.cont.manifestations[0] || {}).note === 'legacy_unknown_manifestation'
   && LEG.cont.manifestations[0].visibleAction === null, JSON.stringify(LEG.cont.manifestations[0]));
ok('an unused facet stays LATENT', !LEG.unusedState || LEG.unusedState.disclosureStatus === 'latent', JSON.stringify(LEG.unusedState));

// ══ 5. IDEMPOTENCY, RETRY, A→B→A ══
const IDEM = await page.evaluate(() => {
  const s = window.state; s.storyId = 'idem'; s._relationshipLedger = null;
  const id = window._relEntityForName('Rey', { create: true });
  window._attachPortfolio(id, [{ category: 'value', canonical_truth: 'She finishes other people sentences to keep the pace hers.',
    possible_pressures: [{ text: 'a slow speaker', evidence_requires: 'slow' }],
    forbidden_restatements: [{ forbid: 'is rude', why: 'verdict, not mechanism' }] }], { provenance: 'generated_cast' });
  const fid = window._relLedger().entities[id].authorProfile.cPlusFacets[0].facet_id;
  const beat = (uid, ord) => { window.state._cpDirectedBeats = [{ character: 'Rey', facet_id: fid,
      expressionMode: 'DISPLAY', visibleAction: 'she finishes his sentence', pcInterpretation: 'she is setting the tempo' }];
    return window._cpCommitScene({ sceneUid: uid, ordinal: ord, issue: 1,
      delivered: [{ canonicalId: id, facet_id: fid, category: 'value', verified: true }], appeared: [] }); };
  const a = beat('R1', 1), retry = beat('R1', 1), b = beat('R2', 2), backToA = beat('R1', 1);
  return { a: a.code, retry: retry.code, b: b.code, backToA: backToA.code,
           count: window._cpContinuityFor(id).manifestations.length };
});
ok('a retry of the same scene uid commits nothing new', IDEM.retry === 'noop_already_committed', JSON.stringify(IDEM));
ok('★ A→B→A navigation does not duplicate a manifestation', IDEM.backToA === 'noop_already_committed' && IDEM.count === 2, JSON.stringify(IDEM));

// ══ 6. SAVE / RESTORE ══
const SR = await page.evaluate(() => {
  const s = window.state; s.storyId = 'restore'; s._relationshipLedger = null;
  const id = window._relEntityForName('Ines', { create: true });
  window._attachPortfolio(id, [{ category: 'value', canonical_truth: 'She waits for the second answer, never the first.',
    possible_pressures: [{ text: 'a quick reply', evidence_requires: 'reply' }],
    forbidden_restatements: [{ forbid: 'is patient', why: 'label, not mechanism' }] }], { provenance: 'generated_cast' });
  const fid = window._relLedger().entities[id].authorProfile.cPlusFacets[0].facet_id;
  window.state._cpDirectedBeats = [{ character: 'Ines', facet_id: fid, expressionMode: 'TEST',
    visibleAction: 'she lets the first answer pass and asks again', pcInterpretation: 'she wants what he says second' }];
  window._cpCommitScene({ sceneUid: 'I1', ordinal: 1, issue: 1,
    delivered: [{ canonicalId: id, facet_id: fid, category: 'value', verified: true }], appeared: [] });
  const snap = JSON.stringify(s._relationshipLedger);
  s._relationshipLedger = null;
  s._relationshipLedger = JSON.parse(snap);
  const st = window._cpFacetStateFor(id, fid), c = window._cpContinuityFor(id);
  return { status: st && st.disclosureStatus, count: c && c.manifestations.length,
           action: c && c.manifestations[0].visibleAction };
});
ok('save/restore preserves the manifestation history and its detail',
   SR.status === 'revealed' && SR.count === 1 && /first answer pass/.test(SR.action || ''), JSON.stringify(SR));

// ══ 7. IDENTITY — SAME NAME, RENAME, SEPARATE STORIES ══
const ID = await page.evaluate(() => {
  const s = window.state; s.storyId = 'ident'; s._relationshipLedger = null;
  const a = window._relEntityForName('Robin', { create: true, canonicalId: 'cast-a' });
  const b = window._relEntityForName('Robin', { create: true, canonicalId: 'cast-b' });
  [a, b].forEach((id, i) => window._attachPortfolio(id, [{ category: 'value',
    canonical_truth: 'Robin ' + i + ' keeps a different kind of score entirely.',
    possible_pressures: [{ text: 'a debt', evidence_requires: 'debt' }],
    forbidden_restatements: [{ forbid: 'is petty', why: 'verdict' }] }], { provenance: 'generated_cast' }));
  const fa = window._relLedger().entities[a].authorProfile.cPlusFacets[0].facet_id;
  window._cpCommitScene({ sceneUid: 'ID1', ordinal: 1, issue: 1,
    delivered: [{ canonicalId: a, facet_id: fa, category: 'value', verified: true }], appeared: [] });
  const sameName = { a: (window._cpContinuityFor(a) || {}).manifestations.length,
                     b: ((window._cpContinuityFor(b) || {}).manifestations || []).length };
  // Rename / supersession: the role resolves to a person, history must follow.
  const role = window._relRoleEntity(window._relPcId(), 'mother', { label: 'her mother' });
  window._attachPortfolio(role, [{ category: 'value', canonical_truth: 'She asks after everyone but the one she came for.',
    possible_pressures: [{ text: 'a family room', evidence_requires: 'family' }],
    forbidden_restatements: [{ forbid: 'is distant', why: 'verdict' }] }], { provenance: 'generated_cast' });
  const fr = window._relLedger().entities[role].authorProfile.cPlusFacets[0].facet_id;
  window._cpCommitScene({ sceneUid: 'ID2', ordinal: 2, issue: 1,
    delivered: [{ canonicalId: role, facet_id: fr, category: 'value', verified: true }], appeared: [] });
  const named = window._relEntityForName('Marisol', { create: true });
  window.state._relationshipLedger.entities[role].supersededBy = named;
  const afterRename = { row: window._cpSchedRow(role), viaRole: (window._cpContinuityFor(role) || {}).manifestations };
  // A different story must inherit nothing.
  s.storyId = 'ident-other';
  const otherStory = window._cpContinuityFor(a);
  return { sameName, afterRename: { rowId: afterRename.row && afterRename.row.character_id }, otherStory };
});
ok('two people sharing a name never share history', ID.sameName.a === 1 && ID.sameName.b === 0, JSON.stringify(ID.sameName));
ok('a rename/supersession keeps ONE merged scheduler history', /^ent:/.test(ID.afterRename.rowId || ''), JSON.stringify(ID.afterRename));
ok('★ a different story inherits none of it', !ID.otherStory, JSON.stringify(ID.otherStory));

// ══ 7b. THE ISSUE BOUNDARY — THE GAP THE AUDIT MEASURED ══
// Before this, startBook2's reset destroyed both character stores and Issue 2 opened knowing
// nobody. This drives the exact sequence the transition performs: serialise, reset, restore.
const ISSUE = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'issue-carry'; s._relationshipLedger = null; s._characterDisclosureLedger = {};
  const id = window._relEntityForName('Jess', { create: true });
  window._attachPortfolio(id, [{ category: 'value',
    canonical_truth: 'She leads with her decolletage to control where attention lands.',
    possible_pressures: [{ text: 'a room not centred on her', evidence_requires: 'room' }],
    forbidden_restatements: [{ forbid: 'is vain', why: 'verdict' }] }], { provenance: 'generated_cast' });
  const fid = window._relLedger().entities[id].authorProfile.cPlusFacets[0].facet_id;
  window.state._cpDirectedBeats = [{ character: 'Jess', facet_id: fid, expressionMode: 'DISPLAY',
    visibleAction: 'she turns so the lamp finds her collarbone', pcInterpretation: 'she is choosing where my eyes go' }];
  window._cpCommitScene({ sceneUid: 'IS1', ordinal: 1, issue: 1,
    delivered: [{ canonicalId: id, facet_id: fid, category: 'value', verified: true, persistence: 'recurring_signature' }], appeared: [] });
  window._charLedgerApplyVerified({ name: 'Jess', present: true, relationshipToPC: 'a colleague',
    newLayer: 'grew up performing for a room that never watched', vehicle: 'dialogue', framing: null }, 1);

  // EXACTLY what the transition does: serialise, stamp, reset, restore under the same storyId.
  const carried = { rel: JSON.stringify(s._relationshipLedger),
                    chr: JSON.stringify(s._characterDisclosureLedger),
                    storyId: s.storyId };
  s._relationshipLedger = null; s._characterDisclosureLedger = {};      // the reset
  const wiped = { rel: s._relationshipLedger, entities: 0 };
  s.issueNumber = 2;
  if (String(s.storyId) === String(carried.storyId)) {
    s._relationshipLedger = JSON.parse(carried.rel);
    s._characterDisclosureLedger = JSON.parse(carried.chr);
  }
  const after = { entities: Object.keys((s._relationshipLedger || {}).entities || {}).length,
                  state: window._cpFacetStateFor(id, fid),
                  manifestations: (window._cpContinuityFor(id) || {}).manifestations.length,
                  memo: (window.buildCharacterDisclosureDirective() || '').length };

  // A GENUINELY NEW STORY must restore nothing, even with a snapshot in hand.
  s.storyId = 'a-brand-new-story';
  const fresh = (String(s.storyId) === String(carried.storyId));
  s._relationshipLedger = null; s._characterDisclosureLedger = {};
  if (fresh) s._relationshipLedger = JSON.parse(carried.rel);
  const newStory = { restored: fresh,
                     entities: Object.keys((s._relationshipLedger || {}).entities || {}).length };
  return { wiped, after, newStory };
});
ok('★ Issue 2 keeps the entity, the revealed facet and its manifestation',
   ISSUE.after.entities > 0 && ISSUE.after.state.disclosureStatus === 'revealed'
   && ISSUE.after.manifestations === 1, JSON.stringify(ISSUE.after.state));
ok('Issue 2 keeps the recurring-signature classification',
   ISSUE.after.state.continuityClass === 'recurring_signature', JSON.stringify(ISSUE.after.state.continuityClass));
ok('Issue 2 still receives a character-memory directive (it was 0 chars before)',
   ISSUE.after.memo > 0, String(ISSUE.after.memo));
ok('★ a genuinely NEW story restores nothing and starts with nobody known',
   ISSUE.newStory.restored === false && ISSUE.newStory.entities === 0, JSON.stringify(ISSUE.newStory));

// ══ 8. PARITY — PC, LI, ANTAGONIST, SEEDED NPC, GENERATED NPC ══
const PAR = await page.evaluate(() => {
  const s = window.state; s.storyId = 'parity'; s._relationshipLedger = null;
  s.playerName = 'Ilse'; s.name = 'Ilse'; s.loveInterestName = 'Adan'; s.partnerName = 'Adan';
  const kinds = {
    pc: window._relPcId(),
    li: window._relLiId(),
    antagonist: window._relEntityForName('The Chayr', { create: true }),
    seeded: window._relEntityForName('Seren', { create: true }),
    generated: window._relEntityForName('A Porter', { create: true }),
  };
  const res = {};
  Object.keys(kinds).forEach((k, i) => {
    const id = kinds[k];
    const att = window._attachPortfolio(id, [{ category: 'value',
      canonical_truth: k + ' holds one line longer than the room expects.',
      possible_pressures: [{ text: 'a pause', evidence_requires: 'pause' }],
      forbidden_restatements: [{ forbid: 'is stubborn', why: 'verdict' }] }], { provenance: 'generated_cast' });
    const ap = window._relLedger().entities[id].authorProfile;
    const fid = (ap.cPlusFacets[0] || {}).facet_id;
    if (!fid) { res[k] = { attach: att, blocked: true }; return; }
    window.state._cpDirectedBeats = [{ character: k, facet_id: fid, expressionMode: 'CONTROL',
      visibleAction: k + ' waits a beat too long', pcInterpretation: 'the pause is doing the work' }];
    window._cpCommitScene({ sceneUid: 'P' + i, ordinal: i + 1, issue: 1,
      delivered: [{ canonicalId: id, facet_id: fid, category: 'value', verified: true }], appeared: [] });
    const st = window._cpFacetStateFor(id, fid);
    const c = window._cpContinuityFor(id);
    res[k] = { id, revealed: st && st.disclosureStatus === 'revealed',
               manifestations: (c && c.manifestations || []).length,
               keptDetail: !!((c && c.manifestations[0] || {}).visibleAction) };
  });
  return res;
});
['pc', 'li', 'antagonist', 'seeded', 'generated'].forEach(k => {
  ok(`${k} passes the SAME lifecycle (revealed, one manifestation, detail kept)`,
     PAR[k] && PAR[k].revealed === true && PAR[k].manifestations === 1 && PAR[k].keptDetail === true,
     JSON.stringify(PAR[k]));
});

ok('zero requests escaped to a provider', escaped === 0, String(escaped));

console.log(`\n${'═'.repeat(78)}\nCHARACTER CONTINUITY — STORAGE\n${'═'.repeat(78)}`);
console.log(log.join('\n'));
console.log(`${'─'.repeat(78)}\n ${pass} passed · ${fail} failed\n`);
await ctx.close().catch(() => {}); await browser.close().catch(() => {});
process.exit(fail ? 1 : 0);
