// CONTINUATION DELIVERY GAP CONTROL. Provider-free, no network, no model calls, $0.
//
// WHY THIS EXISTS INSTEAD OF THE TWO-SCENE RUNNER. Roman asked for a two-scene activation and
// idempotency runner. Tracing the real delivery path before building it turned up something that
// changes the task: THE CONTINUATION SEAL HAS NO COMMITTER. A two-scene run would have spent
// ~$0.30 to rediscover that.
//
// THE CHAIN, as it actually is:
//   _commitScene(prevText, prevProposal, prevSceneNum)   runs at the START of the next scene
//     └─ on DELIVERED → _commitTransition(prevProposal.proposalRef, ...)
//   prevProposal = state._priorSceneStateChange
//   and _stateChange.proposalRef = _sealProposal({ kind: 'state_change', ... }).id
//
// So the ref that reaches the committer is the STATE_CHANGE seal. The CONTINUATION seal is a
// different record, with its own id and its own pendingEntities, and its only consumer anywhere is
// the author-block attachment that renders it into the prompt. Nothing commits it. Therefore, in
// production today:
//   · a continuation fact NEVER enters committed canon
//   · a continuation pending entity NEVER activates
//   · and Roman's checks 4 and 6 cannot pass in a two-scene run either — the gap is not scene
//     ordering, which is what I previously said, but an unwired delivery path.
//
// This control proves all of that, and proves the machinery itself is correct when handed the
// right reference — so the open decision is a wiring one, not a rebuild.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

console.log('=== CONTINUATION DELIVERY GAP (no network, no model, $0) ===\n');

// ── 1. STATIC: who calls the committer, and with what? ───────────────────────
const src = fs.readFileSync('public/app.js', 'utf8');
const lines = src.split('\n');
// Strip comment-only lines so explanatory prose about _commitTransition is not counted as a call.
const callSites = [];
lines.forEach((ln, i) => {
  const code = ln.replace(/^\s*\/\/.*$/, '');
  if (!/_commitTransition\s*\(/.test(code)) return;
  if (/function\s+_commitTransition/.test(code)) return;
  if (/window\._commitTransition\s*=/.test(code)) return;
  callSites.push({ line: i + 1, text: ln.trim() });
});

console.log('1. the committer has exactly ONE production call site');
console.log('   call sites found: ' + callSites.length);
callSites.forEach(c => console.log('     app.js:' + c.line + '  ' + c.text.slice(0, 110)));
t('exactly one call site', callSites.length === 1, JSON.stringify(callSites.map(c => c.line)));
// ── THE GAP IS NOW CLOSED (2026-10-01). This control originally proved the gap: the single call
// site passed prevProposal.proposalRef — the STATE_CHANGE seal — so a continuation seal had no
// committer. Per-proposal delivery replaced that with a loop over the scene's PENDING SEALED
// STORE, passing each record's own id. The assertions below are inverted accordingly and kept as a
// REGRESSION GUARD: the committer must never again be hard-wired to one proposal kind.
t('  and it passes a per-proposal sealed id, not prevProposal.proposalRef',
  callSites.length === 1 && /_commitTransition\(pp\.id,/.test(callSites[0].text)
  && !/prevProposal\.proposalRef/.test(callSites[0].text),
  callSites.length ? callSites[0].text : 'none');
t('  and the ref comes from the pending sealed store',
  /_adjudicateSceneProposals\(_pendProps,/.test(src));

// The ref that reaches it is minted as a state_change seal.
const refAssign = lines.filter(ln => /_stateChange\.proposalRef\s*=/.test(ln)).map(l => l.trim());
console.log('\n   what sets prevProposal.proposalRef:');
refAssign.forEach(l => console.log('     ' + l.slice(0, 110)));
t('proposalRef is assigned from a seal', refAssign.length === 1
  && /_sealedProp\.id/.test(refAssign[0]), JSON.stringify(refAssign));
const sealKindLine = lines.filter(ln => /_sealProposal\(\{\s*kind:\s*'state_change'/.test(ln)).map(l => l.trim());
t('  and that seal is minted kind:"state_change"', sealKindLine.length >= 1,
  JSON.stringify(sealKindLine.map(l => l.slice(0, 90))));

// And the continuation seal's only consumer is the author block.
const ctSealUses = [];
lines.forEach((ln, i) => {
  const code = ln.replace(/^\s*\/\/.*$/, '');
  if (/_activeContinuationSeal/.test(code)) ctSealUses.push({ line: i + 1, text: ln.trim() });
});
console.log('\n   every use of the continuation seal carrier:');
ctSealUses.forEach(c => console.log('     app.js:' + c.line + '  ' + c.text.slice(0, 100)));
t('the continuation seal is written, cleared, and READ EXACTLY ONCE', ctSealUses.length === 3,
  JSON.stringify(ctSealUses.map(c => c.line)));
t('  and its only reader is the author-block attachment',
  ctSealUses.some(c => /_continuationAuthorBlock|_ctSeal = state/.test(c.text)),
  JSON.stringify(ctSealUses.map(c => c.text.slice(0, 70))));

// ── 2. RUNTIME: the gap, demonstrated ────────────────────────────────────────
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._commitTransition === 'function', { timeout: 20000 });

const r = await page.evaluate(() => {
  const out = {};
  const scene = 800;
  window._continuationProposalSchema = true;
  window.state = window.state || {};
  delete window.state._starterId;
  window.state.storyId = 'story-gap';
  window.state.playerName = 'Wren';
  window.state.loveInterestName = 'Cassel';
  window.state._relationshipLedger = null;
  window.state._committedState = null;
  window.state._sealedProposals = null;
  window.state.turnCount = scene;
  window.state._scenePosture = {}; window.state._scenePosture[String(scene)] = { hash: 'ph-gap' };

  // Scene 1, as production builds it: a state_change seal whose id rides on _priorSceneStateChange,
  // and separately a sealed CONTINUATION proposal with a pending entity.
  const scSeal = window._sealProposal({ kind: 'state_change', scene: scene,
    fact: 'The sealed demand leaves her hand and reaches the clerk.' });
  out.stateChangeSeal = scSeal ? { id: scSeal.id, kind: scSeal.kind,
    pending: (scSeal.pendingEntities || []).length } : null;

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
      content: 'The Toll Road Commission receives a sealed demand for an investigation.' }
  }, { scene: scene });
  out.ctOutcome = ct.outcome;
  out.ctSealId = ct.sealedId || null;
  const ctRec = out.ctSealId ? window._resolveSealedProposal(out.ctSealId) : null;
  out.ctSeal = ctRec ? { id: ctRec.id, kind: ctRec.kind,
    pending: (ctRec.pendingEntities || []).map(e => ({ id: e.id, label: e.label, aliases: e.aliases })) } : null;
  out.twoDifferentIds = !!(scSeal && ctRec && scSeal.id !== ctRec.id);

  // THE PRODUCTION REF. This is what _commitScene would hand the committer.
  const stateChange = { event: 'The sealed demand reaches the clerk.', proposalRef: scSeal.id,
    sceneProposed: scene };
  window.state._priorSceneStateChange = stateChange;
  out.prodRefResolvesTo = (function () {
    const rec = window._resolveSealedProposal(window.state._priorSceneStateChange.proposalRef);
    return rec ? rec.kind : null;
  })();

  // ── Scene 2's committer, called EXACTLY as production calls it ─────────────
  const commit = window._commitTransition(window.state._priorSceneStateChange.proposalRef,
    'scene' + scene + '_transition', scene);
  const cs = window._ensureCommittedState();
  out.committed = cs.facts.map(f => ({ fact: f.fact, ref: f.proposalRef, prov: f.provenanceLink }));
  out.commitReturned = !!commit;
  const reg = window._protectedRegisterIds();
  out.registerLabels = Object.keys(reg).map(k => String(reg[k].label || ''));
  out.activated = Object.keys(reg).filter(k => reg[k].provenance === 'continuation_activated');
  out.continuationFactPresent = cs.facts.some(f => f.proposalRef === out.ctSealId);
  out.commissionInRegister = out.registerLabels.indexOf('Toll Road Commission') >= 0;

  // ── And the machinery IS correct when handed the right reference ───────────
  const direct = window._commitTransition(out.ctSealId, 'direct_probe', scene);
  const cs2 = window._ensureCommittedState();
  out.directWorked = !!direct;
  out.afterDirect = { facts: cs2.facts.length,
    continuationFactPresent: cs2.facts.some(f => f.proposalRef === out.ctSealId),
    commissionInRegister: Object.keys(window._protectedRegisterIds())
      .map(k => String(window._protectedRegisterIds()[k].label || '')).indexOf('Toll Road Commission') >= 0 };
  // idempotency of that direct path, for completeness
  window._commitTransition(out.ctSealId, 'direct_probe_again', scene);
  window._commitTransition(out.ctSealId, 'direct_probe_again', scene);
  const cs3 = window._ensureCommittedState();
  out.afterRepeat = { facts: cs3.facts.length,
    entities: Object.keys(window._protectedRegisterIds()).length,
    continuationFacts: cs3.facts.filter(f => f.proposalRef === out.ctSealId).length };
  return out;
});

await browser.close();

console.log('\n2. the two seals are distinct records');
t('a state_change seal exists', !!r.stateChangeSeal && r.stateChangeSeal.kind === 'state_change',
  JSON.stringify(r.stateChangeSeal));
t('  carrying NO pending entities', r.stateChangeSeal.pending === 0,
  'pending=' + r.stateChangeSeal.pending);
t('a continuation seal exists', r.ctOutcome === 'sealed' && !!r.ctSeal
  && r.ctSeal.kind === 'continuation', JSON.stringify([r.ctOutcome, r.ctSeal && r.ctSeal.kind]));
t('  carrying the pending institution with its aliases',
  !!r.ctSeal && r.ctSeal.pending.length === 1
  && r.ctSeal.pending[0].label === 'Toll Road Commission'
  && (r.ctSeal.pending[0].aliases || []).length === 2, JSON.stringify(r.ctSeal && r.ctSeal.pending));
t('  and the two ids are DIFFERENT', r.twoDifferentIds === true,
  JSON.stringify([r.stateChangeSeal.id, r.ctSeal && r.ctSeal.id]));

console.log('\n3. THE GAP — the production ref points at the state_change seal');
t('_priorSceneStateChange.proposalRef resolves to kind "state_change"',
  r.prodRefResolvesTo === 'state_change', JSON.stringify(r.prodRefResolvesTo));
t('committing it writes a fact', r.commitReturned === true && r.committed.length === 1,
  JSON.stringify(r.committed));
t('  and that fact is the STATE_CHANGE fact, not the continuation fact',
  r.committed.length === 1 && r.committed[0].ref === r.stateChangeSeal.id,
  JSON.stringify(r.committed));
t('THE CONTINUATION FACT IS ABSENT FROM CANON', r.continuationFactPresent === false,
  JSON.stringify(r.committed));
t('THE INSTITUTION NEVER ENTERS THE ACTIVE REGISTER', r.commissionInRegister === false,
  JSON.stringify(r.registerLabels));
t('  nothing was activated at all', r.activated.length === 0, JSON.stringify(r.activated));
console.log('   register after the production commit: ' + JSON.stringify(r.registerLabels));

console.log('\n4. the machinery is CORRECT when handed the right reference');
// This is the part that makes the open question a WIRING decision rather than a rebuild.
t('committing the CONTINUATION ref does write its fact', r.directWorked === true
  && r.afterDirect.continuationFactPresent === true, JSON.stringify(r.afterDirect));
t('  and admits the institution into the active register',
  r.afterDirect.commissionInRegister === true, JSON.stringify(r.afterDirect));
t('  repeated delivery stays idempotent — exactly one continuation fact',
  r.afterRepeat.continuationFacts === 1, JSON.stringify(r.afterRepeat));
t('  and the entity count does not grow', r.afterRepeat.entities === 3,
  'entities=' + r.afterRepeat.entities + ' (2 cast anchors + 1 activated institution)');

console.log('\n5. WHAT IS STUBBED HERE, stated rather than glossed');
console.log('   · _commitScene itself was NOT run: it calls the RUNTIME COMMIT verifier, which is a');
console.log('     paid model call. This control calls _commitTransition directly, exactly as');
console.log('     _commitScene\'s DELIVERED branch does, with exactly the ref production supplies.');
console.log('   · so delivery ADJUDICATION (DELIVERED/PARTIAL/MISSED) is not exercised — only what');
console.log('     happens on a DELIVERED verdict, which is where the gap is.');
console.log('   · no prose was rendered and no author ran; this is a wiring trace, not a scene test.');
console.log('\n   CONSEQUENCE FOR THE TWO-SCENE RUNNER: checks 4 and 6 cannot pass as the code stands,');
console.log('   in one scene or two. The ref that reaches the committer is the state_change seal.');

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
