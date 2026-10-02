// PER-PROPOSAL DELIVERY CONTROL. Provider-free, no network, no model calls, $0.
//
// WHAT IT GUARDS. The committer had one call site passing the STATE_CHANGE seal, so a continuation
// seal was author-facing only and never became canon (proven in
// _continuation_delivery_gap_control.mjs). Roman's rule: a continuation does NOT inherit the
// state-change verdict — it uses the same runtime delivery pass but gets its OWN delivery status
// and its OWN anchor check.
//
// Roman's seven required proofs, each here:
//   1 state-change DELIVERED + continuation MISSED  → only state-change commits
//   2 continuation DELIVERED + state-change MISSED  → only continuation commits
//   3 both DELIVERED                                → both exact sealed records commit once
//   4 neither DELIVERED                             → neither commits
//   5 repeated adjudication                         → no duplicate of either record
//   6 LEGACY single-proposal verifier output        → cannot commit a continuation
//   7 continuation pending entities                 → out of the active register until that
//                                                     continuation itself activates
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IS STUBBED, stated rather than glossed: _commitScene's VERIFIER CALL is a paid model call,
// so this control does not run _commitScene end to end. It DOES drive the real adjudication loop
// (_adjudicateSceneProposals, the function _commitScene calls), the real _pendingSealedForScene,
// the real _adjudicateSealedProposal and the real _commitTransition, with verifier payloads
// supplied as fixtures. So delivery JUDGEMENT is not exercised; everything downstream of a
// judgement is, behaviourally.
//
// The loop was INLINE in _commitScene first, and that was a coverage gap worth recording: a bite
// that unrestricted the legacy branch left every behavioural assertion GREEN, caught only by a
// static regex. Extracting the loop is what made the legacy restriction and the unknown-ref
// discard testable for real.
// ════════════════════════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const PROSE = 'She pressed the seal into the wax and the courier took it from her hand. '
  + 'The sealed demand reached the clerk before the bell rang. '
  + 'The Toll Road Commission received a formal demand to investigate the burning, '
  + 'and the clerk entered it in the book without looking up.';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._adjudicateSealedProposal === 'function', { timeout: 20000 });

const r = await page.evaluate((PROSE) => {
  const out = {};
  let sc = 900;

  // Build one scene's state: a state_change seal plus a sealed continuation with a pending entity.
  const setup = (tag) => {
    const scene = sc++;
    window._continuationProposalSchema = true;
    window.state = window.state || {};
    delete window.state._starterId;
    window.state.storyId = 'story-ppd-' + tag;
    window.state.playerName = 'Wren';
    window.state.loveInterestName = 'Cassel';
    window.state._relationshipLedger = null;
    window.state._committedState = null;
    window.state._sealedProposals = null;
    window.state.turnCount = scene;
    window.state._scenePosture = {}; window.state._scenePosture[String(scene)] = { hash: 'ph-ppd-' + tag };
    const scSeal = window._sealProposal({ kind: 'state_change', scene: scene,
      fact: 'The sealed demand reached the clerk before the bell rang.' });
    const ct = window._processContinuationProposal({
      scene_purpose: 'Put the demand before a body that can act.',
      forward_pressure: 'The Toll Road Commission will convene over the demand.',
      pressure_scope: 'durable',
      derivation: 'The player sent sealed word to the commission.',
      introduces: [{ kind: 'institution', label: 'Toll Road Commission',
        aliases: ['the commission', 'the governing commission'],
        justification: 'The body the player addressed.',
        future_relevance: 'It will convene and summon her.' }],
      existingRefs: [],
      canon_change: { tier: 2, targets: ['Toll Road Commission'],
        content: 'The Toll Road Commission received a formal demand to investigate the burning.' }
    }, { scene: scene });
    return { scene, scRef: scSeal ? scSeal.id : null, ctRef: ct.sealedId || null,
      ctOutcome: ct.outcome };
  };
  const snapshot = () => {
    const cs = window._ensureCommittedState();
    const reg = window._protectedRegisterIds();
    return {
      facts: cs.facts.map(f => ({ fact: f.fact, ref: f.proposalRef, prov: f.provenanceLink })),
      labels: Object.keys(reg).map(k => String(reg[k].label || '')),
      activated: Object.keys(reg).filter(k => reg[k].provenance === 'continuation_activated')
        .map(k => ({ id: k, label: reg[k].label, aliases: reg[k].aliases || [] }))
    };
  };
  // The adjudication loop, exactly as _commitScene runs it: iterate the PENDING STORE, look up
  // each ref in the verifier's list, adjudicate, and commit only on a true verdict.
  // THE REAL LOOP, not a reimplementation. _adjudicateSceneProposals is the function _commitScene
  // calls; driving it here means the legacy restriction and the unknown-ref discard are tested
  // BEHAVIOURALLY. An earlier version of this control reimplemented the loop in node, and a bite
  // that unrestricted the legacy branch left every behavioural assertion green — only a static
  // regex caught it. That is exactly the kind of coverage gap worth closing.
  const adjudicate = (scene, perProposal, legacy, sharedSlots) => {
    const pend = window._pendingSealedForScene(scene);
    const res = window._adjudicateSceneProposals(pend, perProposal, PROSE, {
      scene: scene,
      sharedSlots: sharedSlots || null,
      legacyDelivery: legacy ? legacy.delivery : 'MISSED',
      legacyStateChangeRef: legacy ? legacy.ref : null
    });
    return { pend: pend.map(p => ({ id: p.id, kind: p.kind })),
      verdicts: res.verdicts, unknownRefs: res.unknownRefs,
      committed: res.committed, pendingOut: res.pending };
  };
  const EV_SC = 'The sealed demand reached the clerk before the bell rang.';
  const EV_CT = 'The Toll Road Commission received a formal demand to investigate the burning';

  // ── 1. state-change DELIVERED, continuation MISSED
  let s1 = setup('1');
  out.s1 = { ids: s1 };
  out.s1.adj = adjudicate(s1.scene, [
    { ref: s1.scRef, delivery: 'DELIVERED', evidence: EV_SC },
    { ref: s1.ctRef, delivery: 'MISSED', evidence: '' }]);
  out.s1.after = snapshot();

  // ── 2. continuation DELIVERED, state-change MISSED
  let s2 = setup('2');
  out.s2 = { ids: s2 };
  out.s2.adj = adjudicate(s2.scene, [
    { ref: s2.scRef, delivery: 'MISSED', evidence: '' },
    { ref: s2.ctRef, delivery: 'DELIVERED', evidence: EV_CT }]);
  out.s2.after = snapshot();

  // ── 3. both DELIVERED
  let s3 = setup('3');
  out.s3 = { ids: s3 };
  out.s3.adj = adjudicate(s3.scene, [
    { ref: s3.scRef, delivery: 'DELIVERED', evidence: EV_SC },
    { ref: s3.ctRef, delivery: 'DELIVERED', evidence: EV_CT }]);
  out.s3.after = snapshot();

  // ── 4. neither DELIVERED
  let s4 = setup('4');
  out.s4 = { ids: s4 };
  out.s4.adj = adjudicate(s4.scene, [
    { ref: s4.scRef, delivery: 'PARTIAL', evidence: EV_SC },
    { ref: s4.ctRef, delivery: 'MISSED', evidence: EV_CT }]);
  out.s4.after = snapshot();

  // ── 5. REPEATED adjudication of the same scene, both delivered, three times
  let s5 = setup('5');
  const per5 = [{ ref: s5.scRef, delivery: 'DELIVERED', evidence: EV_SC },
                { ref: s5.ctRef, delivery: 'DELIVERED', evidence: EV_CT }];
  out.s5 = { ids: s5 };
  out.s5.first = adjudicate(s5.scene, per5);
  out.s5.afterFirst = snapshot();
  out.s5.second = adjudicate(s5.scene, per5);
  out.s5.third = adjudicate(s5.scene, per5);
  out.s5.afterRepeat = snapshot();

  // ── 6. LEGACY single-proposal output: no per_proposal array at all
  let s6 = setup('6');
  out.s6 = { ids: s6 };
  // perProposal = null is the LEGACY contract. The real loop must apply that single DELIVERED
  // verdict to the state_change ref and to nothing else.
  out.s6.adj = adjudicate(s6.scene, null, { delivery: 'DELIVERED', ref: s6.scRef });
  out.s6.verdicts = out.s6.adj.verdicts;
  out.s6.after = snapshot();
  // 6b. the same legacy verdict when the state_change ref does NOT match: nothing may commit.
  let s6b = setup('6b');
  out.s6b = { ids: s6b };
  out.s6b.adj = adjudicate(s6b.scene, null, { delivery: 'DELIVERED', ref: 'prop:1:1' });
  out.s6b.after = snapshot();

  // ── 7. an UNKNOWN / invented ref, and verifier interpretation fields
  let s7 = setup('7');
  out.s7 = { ids: s7 };
  out.s7.adj = adjudicate(s7.scene, [
    { ref: 'prop:999:1', delivery: 'DELIVERED', evidence: EV_CT },
    { ref: s7.ctRef, delivery: 'DELIVERED',
      // the verifier's OWN text, offered as if it were the fact — must not become canon
      fact: 'The commission has dissolved the toll road entirely.',
      tableau: { decisiveChange: 'the commission dissolved the road' },
      dominant_replacement: 'different_event',
      evidence: EV_CT }]);
  out.s7.after = snapshot();

  // ── 9. THE PER-PROPOSAL PRECONDITION GUARD ───────────────────────────────
  // Run 17's safety inconsistency: slots_check.precondition_evidence was EMPTY, which the legacy
  // path treats as "impossible", yet a per-proposal DELIVERED committed anyway.
  const PRE_OK = 'The sealed demand reached the clerk before the bell rang.';
  // 9a. its OWN precondition_evidence is empty → DOWNGRADED, nothing commits
  let s9 = setup('9');
  out.s9 = { ids: s9 };
  out.s9.adj = adjudicate(s9.scene, [
    { ref: s9.ctRef, delivery: 'DELIVERED', evidence: EV_CT, precondition_evidence: '' }]);
  out.s9.after = snapshot();
  // 9b. the SAME entry with a usable, verbatim precondition → commits
  let s9b = setup('9b');
  out.s9b = { ids: s9b };
  out.s9b.adj = adjudicate(s9b.scene, [
    { ref: s9b.ctRef, delivery: 'DELIVERED', evidence: EV_CT, precondition_evidence: PRE_OK }]);
  out.s9b.after = snapshot();
  // 9c. precondition present but NOT in the prose → DOWNGRADED
  let s9c = setup('9c');
  out.s9c = { ids: s9c };
  out.s9c.adj = adjudicate(s9c.scene, [
    { ref: s9c.ctRef, delivery: 'DELIVERED', evidence: EV_CT,
      precondition_evidence: 'The commission had already convened before she wrote.' }]);
  out.s9c.after = snapshot();
  // 9d. the entry OMITS it → falls back to the scene's shared slots_check. Empty there → DOWNGRADED.
  let s9d = setup('9d');
  out.s9d = { ids: s9d };
  out.s9d.adj = adjudicate(s9d.scene,
    [{ ref: s9d.ctRef, delivery: 'DELIVERED', evidence: EV_CT }],
    null, { precondition_evidence: '', actor_evidence: PRE_OK, occurred_this_scene: true });
  out.s9d.after = snapshot();
  // 9e. same omission, but the shared slots_check precondition IS usable → commits
  let s9e = setup('9e');
  out.s9e = { ids: s9e };
  out.s9e.adj = adjudicate(s9e.scene,
    [{ ref: s9e.ctRef, delivery: 'DELIVERED', evidence: EV_CT }],
    null, { precondition_evidence: PRE_OK, occurred_this_scene: true });
  out.s9e.after = snapshot();
  // 9f. INDEPENDENCE: one proposal's precondition fails, the other's holds. Only the valid one commits.
  let s9f = setup('9f');
  out.s9f = { ids: s9f };
  out.s9f.adj = adjudicate(s9f.scene, [
    { ref: s9f.scRef, delivery: 'DELIVERED', evidence: EV_SC, precondition_evidence: PRE_OK },
    { ref: s9f.ctRef, delivery: 'DELIVERED', evidence: EV_CT, precondition_evidence: '' }]);
  out.s9f.after = snapshot();
  // 9g. the guard is DOWNGRADE-ONLY: a usable precondition cannot rescue a PARTIAL
  let s9g = setup('9g');
  out.s9g = { ids: s9g };
  out.s9g.adj = adjudicate(s9g.scene, [
    { ref: s9g.ctRef, delivery: 'PARTIAL', evidence: EV_CT, precondition_evidence: PRE_OK }]);
  out.s9g.after = snapshot();

  // ── 10. THE REASON FIELD, carried through
  let s10 = setup('10');
  out.s10 = { ids: s10 };
  out.s10.adj = adjudicate(s10.scene, [
    { ref: s10.ctRef, delivery: 'PARTIAL', evidence: EV_CT, reason: 'incomplete_rendering' }]);
  let s10b = setup('10b');
  out.s10b = { ids: s10b };
  out.s10b.adj = adjudicate(s10b.scene, [
    { ref: s10b.ctRef, delivery: 'DELIVERED', evidence: EV_CT,
      precondition_evidence: '', reason: 'precondition_absent' }]);

  // ── 8. DELIVERED but the citation is NOT in the prose
  let s8 = setup('8');
  out.s8 = { ids: s8 };
  out.s8.adj = adjudicate(s8.scene, [
    { ref: s8.ctRef, delivery: 'DELIVERED',
      evidence: 'The commission burned the toll road to the ground.' }]);
  out.s8.after = snapshot();
  return out;
}, PROSE);

await browser.close();

const refsOf = (snap) => snap.facts.map(f => f.ref);
const kindCommit = (adj, ref) => adj.verdicts[ref] && adj.verdicts[ref].commit;

console.log('1. state-change DELIVERED + continuation MISSED → only the state-change commits');
t('both proposals were pending', r.s1.adj.pend.length === 2, JSON.stringify(r.s1.adj.pend));
t('the state_change committed', kindCommit(r.s1.adj, r.s1.ids.scRef) === true);
t('  the continuation did NOT', kindCommit(r.s1.adj, r.s1.ids.ctRef) === false,
  JSON.stringify(r.s1.adj.verdicts[r.s1.ids.ctRef]));
t('exactly one fact in canon, the state_change one',
  r.s1.after.facts.length === 1 && refsOf(r.s1.after)[0] === r.s1.ids.scRef,
  JSON.stringify(r.s1.after.facts));
t('A DELIVERED STATE-CHANGE DID NOT ACTIVATE THE CONTINUATION',
  r.s1.after.activated.length === 0, JSON.stringify(r.s1.after.activated));
t('  the institution is absent from the register',
  r.s1.after.labels.indexOf('Toll Road Commission') === -1, JSON.stringify(r.s1.after.labels));

console.log('\n2. continuation DELIVERED + state-change MISSED → only the continuation commits');
t('the continuation committed', kindCommit(r.s2.adj, r.s2.ids.ctRef) === true,
  JSON.stringify(r.s2.adj.verdicts[r.s2.ids.ctRef]));
t('  the state_change did NOT', kindCommit(r.s2.adj, r.s2.ids.scRef) === false);
t('exactly one fact in canon, the continuation one',
  r.s2.after.facts.length === 1 && refsOf(r.s2.after)[0] === r.s2.ids.ctRef,
  JSON.stringify(r.s2.after.facts));
t('  and it is the sealed content, byte-identical',
  r.s2.after.facts[0].fact === 'The Toll Road Commission received a formal demand to investigate the burning.',
  JSON.stringify(r.s2.after.facts[0].fact));
t('  with sealed provenance', r.s2.after.facts[0].prov === 'sealed');
t('NOW the institution IS in the register — the continuation activated itself',
  r.s2.after.labels.indexOf('Toll Road Commission') >= 0, JSON.stringify(r.s2.after.labels));
t('  with its sealed aliases intact',
  r.s2.after.activated.length === 1
  && (r.s2.after.activated[0].aliases || []).length === 2,
  JSON.stringify(r.s2.after.activated));

console.log('\n3. both DELIVERED → both exact sealed records commit, once each');
t('two facts in canon', r.s3.after.facts.length === 2, JSON.stringify(r.s3.after.facts));
t('  one per sealed ref', refsOf(r.s3.after).indexOf(r.s3.ids.scRef) >= 0
  && refsOf(r.s3.after).indexOf(r.s3.ids.ctRef) >= 0, JSON.stringify(refsOf(r.s3.after)));
t('  every fact sealed-provenance', r.s3.after.facts.every(f => f.prov === 'sealed'));
t('  and the institution activated', r.s3.after.activated.length === 1,
  JSON.stringify(r.s3.after.activated));

console.log('\n4. neither DELIVERED (PARTIAL + MISSED) → neither commits');
t('no facts', r.s4.after.facts.length === 0, JSON.stringify(r.s4.after.facts));
t('  nothing activated', r.s4.after.activated.length === 0, JSON.stringify(r.s4.after.activated));
t('  a PARTIAL state_change stays pending',
  r.s4.adj.verdicts[r.s4.ids.scRef] && r.s4.adj.verdicts[r.s4.ids.scRef].status === 'PARTIAL',
  JSON.stringify(r.s4.adj.verdicts[r.s4.ids.scRef]));

console.log('\n5. REPEATED adjudication does not duplicate either record');
t('the first pass committed both', r.s5.afterFirst.facts.length === 2,
  JSON.stringify(r.s5.afterFirst.facts));
t('two further passes add NOTHING', r.s5.afterRepeat.facts.length === 2,
  JSON.stringify(r.s5.afterRepeat.facts));
t('  and the second pass saw NO pending proposals — first-write-wins',
  r.s5.second.pend.length === 0 && r.s5.third.pend.length === 0,
  JSON.stringify([r.s5.second.pend, r.s5.third.pend]));
t('  the entity was not duplicated', r.s5.afterRepeat.activated.length === 1,
  JSON.stringify(r.s5.afterRepeat.activated));
t('  and the record identity is unchanged',
  JSON.stringify(r.s5.afterRepeat.facts) === JSON.stringify(r.s5.afterFirst.facts),
  JSON.stringify([r.s5.afterFirst.facts, r.s5.afterRepeat.facts]));

console.log('\n6. LEGACY single-proposal output cannot commit a continuation');
t('the state_change took the legacy verdict',
  r.s6.verdicts[r.s6.ids.scRef] && r.s6.verdicts[r.s6.ids.scRef].commit === true);
t('  the continuation got NO verdict from it',
  r.s6.verdicts[r.s6.ids.ctRef] && r.s6.verdicts[r.s6.ids.ctRef].status === 'no-legacy-verdict',
  JSON.stringify(r.s6.verdicts[r.s6.ids.ctRef]));
t('  exactly one fact, the state_change one',
  r.s6.after.facts.length === 1 && refsOf(r.s6.after)[0] === r.s6.ids.scRef,
  JSON.stringify(r.s6.after.facts));
t('  THE CONTINUATION WAS NOT ACCIDENTALLY ACTIVATED', r.s6.after.activated.length === 0,
  JSON.stringify(r.s6.after.activated));
t('  and the reason names the kind mismatch',
  JSON.stringify(r.s6.verdicts[r.s6.ids.ctRef].why).indexOf('does not apply to a continuation') >= 0,
  JSON.stringify(r.s6.verdicts[r.s6.ids.ctRef]));
console.log('   6b. a legacy verdict whose ref matches NOTHING commits nothing');
t('no fact was written', r.s6b.after.facts.length === 0, JSON.stringify(r.s6b.after.facts));
t('  both proposals stay pending',
  Object.keys(r.s6b.adj.verdicts).every(k => r.s6b.adj.verdicts[k].commit === false),
  JSON.stringify(r.s6b.adj.verdicts));

console.log('\n7. unknown refs and verifier interpretation cannot commit anything');
t('an invented ref prop:999:1 was never adjudicated',
  !Object.prototype.hasOwnProperty.call(r.s7.adj.verdicts, 'prop:999:1'),
  JSON.stringify(Object.keys(r.s7.adj.verdicts)));
t('  and the real loop REPORTED it as discarded',
  (r.s7.adj.unknownRefs || []).indexOf('prop:999:1') >= 0,
  JSON.stringify(r.s7.adj.unknownRefs));
t('  only this scene\'s real pending refs were considered',
  Object.keys(r.s7.adj.verdicts).every(k => k === r.s7.ids.scRef || k === r.s7.ids.ctRef),
  JSON.stringify(Object.keys(r.s7.adj.verdicts)));
t('the continuation committed its SEALED content, not the verifier\'s "fact"',
  r.s7.after.facts.some(f => f.ref === r.s7.ids.ctRef
    && f.fact === 'The Toll Road Commission received a formal demand to investigate the burning.'),
  JSON.stringify(r.s7.after.facts));
const s7text = JSON.stringify(r.s7.after.facts);
t('  the verifier\'s own fact text is NOT in canon',
  s7text.indexOf('dissolved the toll road') === -1, s7text);
t('  nor its tableau decisiveChange', s7text.indexOf('decisiveChange') === -1
  && s7text.indexOf('dissolved the road') === -1, s7text);
t('  nor its dominant_replacement', s7text.indexOf('different_event') === -1, s7text);

console.log('\n8. DELIVERED with a citation that is not in the prose does NOT commit');
t('no fact was written', r.s8.after.facts.length === 0, JSON.stringify(r.s8.after.facts));
t('  the verdict says why',
  r.s8.adj.verdicts[r.s8.ids.ctRef]
  && JSON.stringify(r.s8.adj.verdicts[r.s8.ids.ctRef].why).indexOf('not a verbatim quote') >= 0,
  JSON.stringify(r.s8.adj.verdicts[r.s8.ids.ctRef]));
t('  and nothing activated', r.s8.after.activated.length === 0);

console.log('\n9. THE PER-PROPOSAL PRECONDITION GUARD (run 17\'s safety inconsistency)');
const v9 = (x, ref) => x.adj.verdicts[ref] || {};
t('empty OWN precondition_evidence → NOT committed',
  v9(r.s9, r.s9.ids.ctRef).commit === false, JSON.stringify(v9(r.s9, r.s9.ids.ctRef)));
t('  recorded as a DOWNGRADE of a DELIVERED verdict',
  v9(r.s9, r.s9.ids.ctRef).status === 'DELIVERED' && v9(r.s9, r.s9.ids.ctRef).downgraded === true,
  JSON.stringify(v9(r.s9, r.s9.ids.ctRef)));
t('  the reason says the event could not have happened',
  JSON.stringify(v9(r.s9, r.s9.ids.ctRef).why).indexOf('could not have happened') >= 0,
  JSON.stringify(v9(r.s9, r.s9.ids.ctRef).why));
t('  nothing in canon, nothing activated',
  r.s9.after.facts.length === 0 && r.s9.after.activated.length === 0,
  JSON.stringify(r.s9.after));
t('the SAME entry with a usable verbatim precondition DOES commit',
  v9(r.s9b, r.s9b.ids.ctRef).commit === true, JSON.stringify(v9(r.s9b, r.s9b.ids.ctRef)));
t('  and activates', r.s9b.after.activated.length === 1, JSON.stringify(r.s9b.after.activated));
t('a precondition NOT found in the prose → NOT committed',
  v9(r.s9c, r.s9c.ids.ctRef).commit === false
  && JSON.stringify(v9(r.s9c, r.s9c.ids.ctRef).why).indexOf('not a verbatim quote') >= 0,
  JSON.stringify(v9(r.s9c, r.s9c.ids.ctRef)));

console.log('\n   the SHARED slots_check is the fallback, so the legacy rule reaches this path');
t('omitting it falls back to shared slots_check — empty there → NOT committed',
  v9(r.s9d, r.s9d.ids.ctRef).commit === false
  && v9(r.s9d, r.s9d.ids.ctRef).preconditionSource === 'shared_slots_check',
  JSON.stringify(v9(r.s9d, r.s9d.ids.ctRef)));
t('  and a USABLE shared precondition lets it commit',
  v9(r.s9e, r.s9e.ids.ctRef).commit === true
  && v9(r.s9e, r.s9e.ids.ctRef).preconditionSource === 'shared_slots_check',
  JSON.stringify(v9(r.s9e, r.s9e.ids.ctRef)));
t('  run 17\'s exact shape (empty shared precondition + per-proposal DELIVERED) now REFUSES',
  v9(r.s9d, r.s9d.ids.ctRef).commit === false, 'this is the inconsistency Roman identified');

console.log('\n   INDEPENDENCE is preserved — one failing precondition does not block the other');
t('the proposal with a valid precondition STILL commits',
  v9(r.s9f, r.s9f.ids.scRef).commit === true, JSON.stringify(v9(r.s9f, r.s9f.ids.scRef)));
t('  while the one with an empty precondition does not',
  v9(r.s9f, r.s9f.ids.ctRef).commit === false, JSON.stringify(v9(r.s9f, r.s9f.ids.ctRef)));
t('  exactly one fact, the valid one',
  r.s9f.after.facts.length === 1 && r.s9f.after.facts[0].ref === r.s9f.ids.scRef,
  JSON.stringify(r.s9f.after.facts));
t('  and nothing activated, since the continuation was the one refused',
  r.s9f.after.activated.length === 0, JSON.stringify(r.s9f.after.activated));

console.log('\n   DOWNGRADE-ONLY — a good precondition cannot rescue a non-delivery');
t('PARTIAL + usable precondition stays PARTIAL and uncommitted',
  v9(r.s9g, r.s9g.ids.ctRef).commit === false
  && v9(r.s9g, r.s9g.ids.ctRef).status === 'PARTIAL',
  JSON.stringify(v9(r.s9g, r.s9g.ids.ctRef)));
t('  and is NOT marked as a downgrade — it was never DELIVERED to begin with',
  v9(r.s9g, r.s9g.ids.ctRef).downgraded !== true, JSON.stringify(v9(r.s9g, r.s9g.ids.ctRef)));

console.log('\n10. THE REASON FIELD distinguishes the three non-delivery causes');
t('a PARTIAL carries the verifier\'s reason through',
  v9(r.s10, r.s10.ids.ctRef).reason === 'incomplete_rendering',
  JSON.stringify(v9(r.s10, r.s10.ids.ctRef)));
t('  and the why text names it', JSON.stringify(v9(r.s10, r.s10.ids.ctRef).why).indexOf('incomplete_rendering') >= 0);
t('a precondition downgrade reports reason precondition_absent',
  v9(r.s10b, r.s10b.ids.ctRef).reason === 'precondition_absent',
  JSON.stringify(v9(r.s10b, r.s10b.ids.ctRef)));
t('a committed proposal reports reason "delivered"',
  v9(r.s9b, r.s9b.ids.ctRef).reason === 'delivered', JSON.stringify(v9(r.s9b, r.s9b.ids.ctRef).reason));
t('an unverifiable citation reports reason "inconsistent"',
  (r.s8.adj.verdicts[r.s8.ids.ctRef] || {}).reason === 'inconsistent',
  JSON.stringify(r.s8.adj.verdicts[r.s8.ids.ctRef]));

console.log('\n11. STATIC — the one-writer rule and the loop wiring in _commitScene');
const src = fs.readFileSync('public/app.js', 'utf8');
const lines = src.split('\n');
const callSites = [];
lines.forEach((ln, i) => {
  const code = ln.replace(/^\s*\/\/.*$/, '');
  if (!/_commitTransition\s*\(/.test(code)) return;
  if (/function\s+_commitTransition/.test(code)) return;
  if (/window\._commitTransition\s*=/.test(code)) return;
  callSites.push({ line: i + 1, text: ln.trim() });
});
console.log('   _commitTransition call sites: ' + JSON.stringify(callSites.map(c => c.line)));
t('_commitTransition is still called from ONE place in _commitScene\'s adjudication',
  callSites.length === 1, JSON.stringify(callSites.map(c => c.text.slice(0, 90))));
t('  and it receives a sealed REFERENCE (pp.id), never text',
  callSites.length === 1 && /_commitTransition\(pp\.id,/.test(callSites[0].text),
  callSites.length ? callSites[0].text : 'none');
t('the loop iterates the PENDING STORE, not the verifier list',
  /pend\.forEach\(function \(pp\)/.test(src) && /_adjudicateSceneProposals/.test(src));
t('  unknown verifier refs are explicitly discarded and logged',
  /DISCARDED unknown ref/.test(src));
t('the legacy fallback is restricted to the state_change ref',
  /pp\.kind === 'state_change' && pp\.id === o\.legacyStateChangeRef/.test(src));
t('  and _commitScene supplies that ref from prevProposal',
  /legacyStateChangeRef: \(prevProposal && prevProposal\.proposalRef\)/.test(src));
t('the verifier prompt asks for per_proposal with verbatim evidence',
  /PER-PROPOSAL DELIVERY \(judge EACH listed proposal INDEPENDENTLY/.test(src)
  && /"per_proposal"/.test(src));

console.log('\n10. WHAT IS STUBBED');
console.log('   · _commitScene was NOT run end to end: its verifier call is a paid model call.');
console.log('     This control drives the REAL adjudication loop (_adjudicateSceneProposals) plus');
console.log('     _pendingSealedForScene, _adjudicateSealedProposal and _commitTransition, with');
console.log('     verifier payloads as fixtures. Delivery JUDGEMENT is therefore not exercised —');
console.log('     everything downstream of a judgement is, behaviourally.');
console.log('   · _commitScene\'s own call into the loop, and its state_change bookkeeping, remain');
console.log('     STATIC assertions here and will be measured by the two-scene live test.');

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
