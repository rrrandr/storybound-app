// COMMIT REFERENTIAL-INTEGRITY CONTROL. Provider-free, no network, $0.
//
// Proves the narrow repair: the planner proposes canon BEFORE prose (a sealed, frozen,
// system-identified record); the commit gate can activate only that exact content, BY REFERENCE; and
// a post-prose verifier can never supply, alter or broaden it.
//
// Assertions are labelled BEHAVIOURAL (driven against the real served functions) or STATIC (a property
// of the source, where driving it would require a provider call). The distinction is deliberate — a
// static assertion proves the code shape, not a runtime outcome, and is named as such.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._sealProposal === 'function'
  && typeof window._commitTransition === 'function'
  && typeof window._ensureCommittedState === 'function', { timeout: 20000 });

console.log('=== COMMIT REFERENTIAL INTEGRITY (no network, $0) ===\n');

// A long, exact fact — deliberately past the old 200-char truncation point, so a byte-identical
// comparison actually proves the truncation-divergence is gone rather than passing by accident.
const LONG_FACT = 'Lirael destroys the village of Aeryn’s Reach outright, and the wider First Favored '
  + 'governance convenes an investigation into the destruction that same evening, naming her as the sole '
  + 'subject of it before any local college can rule on her conduct, which forecloses the hearing entirely.';

const r = await page.evaluate(({ LONG_FACT }) => {
  const out = {};
  window.state = window.state || {};
  window.state.turnCount = 7;
  window.state._committedState = null;
  window.state._sealedProposals = null;
  window.state._scenePosture = { '7': { hash: 'ph-abc123', choice: 'remain' } };

  // ── seal one proposal pre-author
  const sealed = window._sealProposal({ fact: LONG_FACT, milestone: 'the reckoning', scene: 7 });
  out.sealedId = sealed && sealed.id;
  out.sealedFact = sealed && sealed.fact;
  out.sealedFrozen = !!sealed && Object.isFrozen(sealed);
  out.sealedPosture = sealed && sealed.provenance && sealed.provenance.postureHash;
  out.sealedHasInvocation = !!(sealed && sealed.provenance && sealed.provenance.invocationId);

  // immutability: attempt to mutate the frozen record
  try { sealed.fact = 'TAMPERED'; } catch (_) {}
  out.factAfterTamper = sealed && sealed.fact;

  // ── idempotency: a retried plan for the same scene+posture must reuse the SAME record
  const again = window._sealProposal({ fact: LONG_FACT, milestone: 'the reckoning', scene: 7 });
  out.retrySameId = !!again && again.id === out.sealedId;
  out.storeCount = Object.keys((window.state._sealedProposals || {}).byId || {}).length;

  // ── commit by reference
  const committed = window._commitTransition(out.sealedId, 'scene7_transition', 7);
  const cs = window._ensureCommittedState();
  out.committedFact = committed && committed.fact;
  out.committedRef = committed && committed.proposalRef;
  out.committedLink = committed && committed.provenanceLink;
  out.factsAfterCommit = cs.facts.length;
  // byte-identical, not merely equal-looking
  out.byteIdentical = !!committed && committed.fact === sealed.fact && committed.fact.length === LONG_FACT.length;

  // ── double commit of the same reference must not duplicate
  window._commitTransition(out.sealedId, 'scene7_transition', 7);
  out.factsAfterDoubleCommit = window._ensureCommittedState().facts.length;

  // ── a verifier-style reply carrying arbitrary fact-like text cannot alter the committed fact.
  // This is the shape a compromised/hallucinating verifier would return.
  const hostileVerifierReply = {
    delivery: 'DELIVERED',
    fact: 'Julian is no longer Provast',
    decisiveChange: 'Julian died in the fire',
    dominant_replacement: 'different_event',
    tableau: { setting: 'the ruins', charactersPresent: ['Julian', 'a Reach magistrate'],
               decisiveChange: 'the college is dissolved', protagonistStatus: 'condemned' }
  };
  // every plausible way a caller might try to push that content through the gate
  const attempts = [
    () => window._commitTransition(hostileVerifierReply.fact, 'x', 7),
    () => window._commitTransition(hostileVerifierReply.decisiveChange, 'x', 7),
    () => window._commitTransition({ id: hostileVerifierReply.fact }, 'x', 7),
    () => window._commitTransition(hostileVerifierReply, 'x', 7),
    () => window._commitTransition(null, 'x', 7),
    () => window._commitTransition(undefined, 'x', 7),
    () => window._commitTransition('prop:7:999', 'x', 7)
  ];
  out.hostileResults = attempts.map(fn => { try { return fn() === null ? 'rejected' : 'ACCEPTED'; } catch (e) { return 'threw'; } });
  const csAfter = window._ensureCommittedState();
  out.factsAfterHostile = csAfter.facts.length;
  out.factTextsAfterHostile = csAfter.facts.map(f => f.fact);

  // ── legacy facts: active canon, marked, never impersonating a sealed record
  csAfter.facts.unshift({ fact: 'an older fact from before sealing existed',
    sourceEvent: 'scene3_transition', committedAtScene: 3, provenance: 'delivered' });
  const csRe = window._ensureCommittedState();
  const legacy = csRe.facts.find(f => f.committedAtScene === 3);
  out.legacyLink = legacy && legacy.provenanceLink;
  out.legacyHasRef = !!(legacy && legacy.proposalRef);
  out.legacyTextIntact = legacy && legacy.fact === 'an older fact from before sealing existed';
  out.legacyStillPresent = csRe.facts.length;

  return out;
}, { LONG_FACT });

await browser.close();

console.log('A. the sealed pre-author record  [BEHAVIOURAL]');
t('a system-minted id is assigned', /^prop:7:\d+$/.test(r.sealedId || ''), r.sealedId);
t('the proposed fact is stored EXACTLY, untruncated', r.sealedFact === LONG_FACT,
  'len=' + (r.sealedFact || '').length + ' expected=' + LONG_FACT.length);
t('the record is frozen', r.sealedFrozen === true);
t('  and a mutation attempt does not change it', r.factAfterTamper === LONG_FACT);
t('provenance carries the posture hash', r.sealedPosture === 'ph-abc123', String(r.sealedPosture));
t('provenance carries an invocation id', r.sealedHasInvocation === true);

console.log('\nB. retry reuses the same sealed proposal  [BEHAVIOURAL]');
t('a retried plan for the same scene+posture returns the SAME id', r.retrySameId === true);
t('  and no second record was minted', r.storeCount === 1, 'store=' + r.storeCount);

console.log('\nC. a delivered record is byte-identical to its sealed proposal  [BEHAVIOURAL]');
t('the committed fact is byte-identical to the sealed fact', r.byteIdentical === true,
  'committed len=' + (r.committedFact || '').length);
t('  which is past the old 200-char truncation point', LONG_FACT.length > 200, LONG_FACT.length + ' chars');
t('the committed entry carries its proposal reference', r.committedRef === r.sealedId);
t('the committed entry is marked provenanceLink=sealed', r.committedLink === 'sealed', String(r.committedLink));
t('exactly one fact was committed', r.factsAfterCommit === 1, 'facts=' + r.factsAfterCommit);
t('committing the same reference twice does NOT duplicate', r.factsAfterDoubleCommit === 1,
  'facts=' + r.factsAfterDoubleCommit);

console.log('\nD. verifier-supplied content can never become a fact  [BEHAVIOURAL]');
console.log('   attempts: ' + JSON.stringify(r.hostileResults));
t('every unsealed/hostile commit attempt is rejected',
  r.hostileResults.every(x => x === 'rejected'),
  r.hostileResults.filter(x => x !== 'rejected').length + ' not rejected');
t('the fact count is unchanged after all of them', r.factsAfterHostile === 1, 'facts=' + r.factsAfterHostile);
t('no verifier text appears in any committed fact',
  !r.factTextsAfterHostile.some(x => /Provast|died|dissolved|condemned/i.test(x)),
  JSON.stringify(r.factTextsAfterHostile).slice(0, 160));

console.log('\nE. legacy facts stay canon without impersonating sealed ones  [BEHAVIOURAL]');
t('a legacy fact is marked provenanceLink=absent_legacy', r.legacyLink === 'absent_legacy', String(r.legacyLink));
t('  it has NO proposal reference', r.legacyHasRef === false);
t('  its text is not rewritten', r.legacyTextIntact === true);
t('  and it remains present as active canon', r.legacyStillPresent === 2, 'facts=' + r.legacyStillPresent);

// ── STATIC: properties of _commitScene that need a provider call to drive behaviourally.
const SRC = fs.readFileSync('public/app.js', 'utf8');
const cs0 = SRC.indexOf('async function _commitScene(');
const cs1 = SRC.indexOf('cs._committedThroughScene = prevSceneNum;', cs0);
const body = (cs0 >= 0 && cs1 > cs0) ? SRC.slice(cs0, cs1) : '';

console.log('\nF. the verifier\'s output surface is narrowed  [STATIC — source properties]');
t('_commitScene body was located', body.length > 0);
t('the commit call passes a REFERENCE, not proposal text',
  /_commitTransition\(prevProposal\.proposalRef/.test(body) && !/_commitTransition\(prevProposal\.event/.test(body));
// SUPERSEDED, not relaxed: the first repair pass gated the verifier's tableau on DELIVERED, and
// this asserted that gate. The second pass removed the verifier tableau from the sink ENTIRELY at
// every delivery status — strictly stronger, so gating no longer exists to assert. Full
// source-to-sink coverage now lives in _scene_card_purity_control.mjs.
t('the card is built DETERMINISTICALLY, not from the verifier tableau',
  /_tc = _deterministicSceneCard\(/.test(body) && !/_tc = \{\s*forScene/.test(body));
t('the built card carries NO decisiveChange key',
  !/_tc = \{[^}]*decisiveChange/.test(body));
t('dominant_replacement is never persisted (log-only)',
  !/(cs|_tc|state)\.[A-Za-z_]*\s*=\s*_replacement\b/.test(body));
t('_commitTransition has exactly one call site in the file',
  (SRC.match(/_commitTransition\(/g) || []).length === 2,  // 1 definition + 1 call
  'occurrences=' + (SRC.match(/_commitTransition\(/g) || []).length);

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
