// ══════════════════════════════════════════════════════════════════════════════════════════
//  CHARACTER_CANON_REPAIR + THE SEQUENCE — DORMANT, UNDER INTERCEPTION
//
//  Repair is the narrowest pen in the system: named paragraphs only, no new anything, backend
//  splice. This proves each of those refusals, and proves the sequence stops at every stage it
//  is supposed to stop at. Nothing dispatches for real.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0; const log = [];
const ok = (n, c, d) => { if (c) { pass++; log.push(`  ✓ ${n}`); } else { fail++; log.push(`  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 420) : ''}`); } };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext(); const page = await ctx.newPage();
await installSession(page);
const census = []; const queue = [];
await page.route('**/*', async route => {
  const url = route.request().url(); const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  let body = null; try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/.test(path)) {
    census.push({ path, role: body && body.role, model: body && body.model, max_tokens: body && body.max_tokens, body });
    if (queue.length) return route.fulfill(queue.shift());
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window._cpCanonSequence && window.__CP_REPAIR, { timeout: 60000 });

const K = await page.evaluate(() => window.__CP_REPAIR);
ok('the repair contract is declared', K.role === 'CHARACTER_CANON_REPAIR' && K.model === 'mistral-small-latest' && K.maxTokens === 900, JSON.stringify(K));

// ── PARAGRAPH REFS ARE BACKEND-ISSUED ──
const P = await page.evaluate(() => {
  const prose = 'One.\n\nTwo is longer.\n\n\n   \n\nThree.';
  const ps = window._cpParagraphs(prose);
  return { refs: ps.map(p => p.ref), texts: ps.map(p => p.text.trim()),
           spliced: window._cpSpliceParagraphs(ps, { P2: 'TWO REPLACED' }) };
});
ok('paragraphs are numbered by the backend, blanks skipped',
   P.refs.join() === 'P1,P2,P3' && P.texts.join('|') === 'One.|Two is longer.|Three.', JSON.stringify(P));
ok('★ the BACKEND performs the splice — only the named paragraph changes',
   /TWO REPLACED/.test(P.spliced) && /One\./.test(P.spliced) && /Three\./.test(P.spliced)
   && !/Two is longer/.test(P.spliced), P.spliced);

// ── WHAT THE REPAIR VALIDATOR REFUSES ──
const V = await page.evaluate(() => {
  const ps = window._cpParagraphs('A.\n\nB.\n\nC.');
  const J = (o) => JSON.stringify(o);
  const want = ['P2'];
  return {
    unknown:   window._cpRepairValidate(J({ paragraphs: [{ ref: 'P9', text: 'x' }] }), want, ps),
    extra:     window._cpRepairValidate(J({ paragraphs: [{ ref: 'P2', text: 'x' }, { ref: 'P3', text: 'y' }] }), want, ps),
    duplicate: window._cpRepairValidate(J({ paragraphs: [{ ref: 'P2', text: 'x' }, { ref: 'P2', text: 'y' }] }), want, ps),
    missing:   window._cpRepairValidate(J({ paragraphs: [] }), want, ps),
    empty:     window._cpRepairValidate(J({ paragraphs: [{ ref: 'P2', text: '   ' }] }), want, ps),
    malformed: window._cpRepairValidate('not json', want, ps),
    good:      window._cpRepairValidate(J({ paragraphs: [{ ref: 'P2', text: 'repaired' }] }), want, ps),
  };
});
ok('★ an UNKNOWN paragraph ref rejects', !V.unknown.ok && V.unknown.code === 'unknown_paragraph_ref', JSON.stringify(V.unknown));
ok('★ an EXTRA paragraph rejects — repair may not touch what it was not asked to',
   !V.extra.ok && V.extra.code === 'extra_paragraph', JSON.stringify(V.extra));
ok('★ a DUPLICATE ref rejects', !V.duplicate.ok && V.duplicate.code === 'duplicate_paragraph', JSON.stringify(V.duplicate));
ok('★ a MISSING requested paragraph rejects', !V.missing.ok && V.missing.code === 'missing_paragraph', JSON.stringify(V.missing));
ok('an EMPTY replacement rejects', !V.empty.ok && V.empty.code === 'empty_replacement', JSON.stringify(V.empty));
ok('a malformed response rejects', !V.malformed.ok && V.malformed.code === 'malformed_response', JSON.stringify(V.malformed));
ok('CONTROL: exactly the requested paragraph validates', V.good.ok && V.good.replacements.P2 === 'repaired', JSON.stringify(V.good));

// ── THE FIXTURE ──
const build = () => page.evaluate(() => {
  const s = window.state;
  s.storyId = 'repair-fx'; s._relationshipLedger = null;
  s.playerName = 'Ilse'; s.name = 'Ilse'; s.loveInterestName = 'Adan'; s.partnerName = 'Adan';
  delete s._starterId; s.is_starter_story = false; s._cpAuditDispatched = {};
  const id = window._relEntityForName('Jess', { create: true });
  window._attachPortfolio(id, [
    { category: 'value', canonical_truth: 'She leads with her decolletage to control where attention lands.',
      possible_pressures: [{ text: 'a loud room', evidence_requires: 'room' }],
      forbidden_restatements: [{ forbid: 'naturally modest', why: 'inverts it' }] },
    { category: 'habit', canonical_truth: 'LATENTTRUTH she keeps the name of everyone who owed her a silence.',
      possible_pressures: [{ text: 'a secret', evidence_requires: 'secret' }],
      forbidden_restatements: [{ forbid: 'forgets a debt', why: 'inverts it' }] },
  ], { provenance: 'generated_cast' });
  const f = window._relLedger().entities[id].authorProfile.cPlusFacets.map(x => x.facet_id);
  s._cpDirectedBeats = [{ character: 'Jess', facet_id: f[0], expressionMode: 'DISPLAY', visibleAction: 'a', pcInterpretation: 'b' }];
  window._cpCommitScene({ sceneUid: 'R0', ordinal: 1, issue: 1,
    delivered: [{ canonicalId: id, facet_id: f[0], category: 'value', verified: true }], appeared: [] });
  s.__repairStage = { onStage: [{ id, label: 'Jess' }] };
  return { id, f };
});
const FX = await build();
const seq = (prose, uid) => page.evaluate(async ({ prose, uid }) => {
  const model = window._cpBuildEstablishedCanon(window.state.__repairStage, {});
  return await window._cpCanonSequence(prose, model, { sceneUid: uid });
}, { prose, uid });

const PROSE_BAD = 'The hall filled.\n\nJess is naturally modest, and she took the far chair.\n\nThe bell rang.';
const PROSE_OK  = 'The hall filled.\n\nJess turned so the lamp found her collarbone before she answered.\n\nThe bell rang.';

// ── DORMANT: no dispatch, publishes, records unresolved ──
await page.evaluate(() => { window.__cpCanonAuditorEnabled = false; });
const c0 = census.length;
const DORM = await seq(PROSE_BAD, 'S-dorm');
ok('★ DORMANT: the sequence dispatches nothing and does not block publication',
   DORM.dispatches === 0 && DORM.publish === true && census.length === c0, JSON.stringify(DORM.stages));
ok('★ DORMANT: the FREE gate still runs, and its finding is recorded as a real contradiction',
   DORM.semanticStatus === 'contradiction' && DORM.publishedWithConflict === true,
   JSON.stringify({ status: DORM.semanticStatus, conflict: DORM.publishedWithConflict, stages: DORM.stages }));
// And prose the free gate does NOT flag is recorded unresolved, not compatible.
const DORM2 = await seq(PROSE_OK, 'S-dorm2');
ok('★ DORMANT: unflagged prose is recorded unresolved — never compatible by omission',
   DORM2.dispatches === 0 && DORM2.semanticStatus === 'unresolved'
   && DORM2.publishedWithConflict !== true, JSON.stringify(DORM2.stages));

// ── DETERMINISTIC HIT: contradiction, and repair is attempted without buying an audit ──
await page.evaluate(() => { window.__cpCanonAuditorEnabled = true; });
await build();
queue.length = 0;
queue.push({ status: 200, contentType: 'application/json',
  body: JSON.stringify({ content: JSON.stringify({ paragraphs: [{ ref: 'P2', text: 'Jess had dressed plainly on purpose; in a room this loud the woman not asking to be looked at is the one they look at.' }] }) }) });
queue.push({ status: 200, contentType: 'application/json',
  body: JSON.stringify({ content: JSON.stringify({ verdicts: [{ subject_ref: FX.id, verdict: 'compatible', reason_code: 'no_conflict_found' }] }) }) });
const c1 = census.length;
const FIXED = await seq(PROSE_BAD, 'S-fix');
const roles1 = census.slice(c1).map(x => x.role);
ok('★ a deterministic contradiction skips the initial PAID audit entirely',
   roles1[0] === 'CHARACTER_CANON_REPAIR', JSON.stringify(roles1));
ok('★ the sequence runs repair → deterministic revalidation → verification',
   FIXED.stages.join('|').includes('repair:ok') && FIXED.stages.join('|').includes('deterministic:unresolved')
   && FIXED.stages.join('|').includes('verify:compatible'), JSON.stringify(FIXED.stages));
ok('★ only the offending paragraph changed; the others are byte-identical',
   /The hall filled\./.test(FIXED.finalText) && /The bell rang\./.test(FIXED.finalText)
   && !/naturally modest/.test(FIXED.finalText), FIXED.finalText);
ok('★ it publishes and commits only after the FINAL bytes passed',
   FIXED.publish === true && FIXED.commit === true && FIXED.semanticStatus === 'compatible', JSON.stringify(FIXED));
ok('exactly two dispatches: one repair, one verification', FIXED.dispatches === 2 && roles1.length === 2, JSON.stringify(roles1));

// ── VERIFICATION FAILS → PUBLICATION REFUSED ──
await build();
queue.length = 0;
queue.push({ status: 200, contentType: 'application/json',
  body: JSON.stringify({ content: JSON.stringify({ paragraphs: [{ ref: 'P2', text: 'Jess said nothing, which was its own kind of answer.' }] }) }) });
queue.push({ status: 200, contentType: 'application/json',
  body: JSON.stringify({ content: JSON.stringify({ verdicts: [{ subject_ref: FX.id, verdict: 'contradiction', reason_code: 'mechanism_inverted' }] }) }) });
const VF = await seq(PROSE_BAD, 'S-vfail');
ok('★ verification failure REFUSES publication and commits nothing',
   VF.publish === false && VF.commit === false && VF.retryableFailure === true, JSON.stringify(VF.stages));
ok('…and it is a retryable scene failure, not publishable prose', VF.semanticStatus === 'contradiction', JSON.stringify(VF.semanticStatus));

// ── NO LOOP ──
await build();
queue.length = 0;
queue.push({ status: 200, contentType: 'application/json',
  body: JSON.stringify({ content: JSON.stringify({ paragraphs: [{ ref: 'P2', text: 'Jess said nothing.' }] }) }) });
queue.push({ status: 200, contentType: 'application/json',
  body: JSON.stringify({ content: JSON.stringify({ verdicts: [{ subject_ref: FX.id, verdict: 'contradiction', reason_code: 'mechanism_inverted' }] }) }) });
const c2 = census.length;
await seq(PROSE_BAD, 'S-loop');
const after = census.slice(c2).map(x => x.role);
ok('★ ONE repair and ONE verification maximum — no loop',
   after.filter(r => r === 'CHARACTER_CANON_REPAIR').length === 1
   && after.filter(r => r === 'CHARACTER_CANON_AUDITOR').length === 1, JSON.stringify(after));

// ── UNKNOWN NEVER TRIGGERS REPAIR ──
await build();
queue.length = 0;
queue.push({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: 'garbage not json' }) });
const c3 = census.length;
const UNK = await seq(PROSE_OK, 'S-unk');
const rolesU = census.slice(c3).map(x => x.role);
ok('★ UNKNOWN never triggers repair — repairing an unidentified fault is guessing with money',
   !rolesU.includes('CHARACTER_CANON_REPAIR') && UNK.retryableFailure === true
   && UNK.semanticStatus === 'unresolved', JSON.stringify({ rolesU, stages: UNK.stages }));
ok('…and unknown does not publish', UNK.publish === false, JSON.stringify(UNK.publish));

// ── CLEAN PROSE COSTS ONE CALL ──
await build();
queue.length = 0;
queue.push({ status: 200, contentType: 'application/json',
  body: JSON.stringify({ content: JSON.stringify({ verdicts: [{ subject_ref: FX.id, verdict: 'compatible', reason_code: 'no_conflict_found' }] }) }) });
const c4 = census.length;
const CLEAN = await seq(PROSE_OK, 'S-clean');
ok('★ compatible prose costs ONE audit and no repair',
   CLEAN.dispatches === 1 && CLEAN.publish === true && CLEAN.semanticStatus === 'compatible'
   && census.slice(c4).every(x => x.role === 'CHARACTER_CANON_AUDITOR'), JSON.stringify(CLEAN.stages));

// ── THE REPAIR PROMPT'S OWN CONSTRAINTS ──
const rp = census.filter(c => c.role === 'CHARACTER_CANON_REPAIR').slice(-1)[0];
const rpBody = JSON.stringify(rp && rp.body || {});
ok('★ the repair prompt forbids adding events, objects, people, facts or psychology',
   /may not[\s\S]*add an event, an object, a person, a fact/i.test(rpBody), 'constraint missing');
ok('★ …forbids granting development', /development is not yours to grant/i.test(rpBody), 'constraint missing');
ok('★ …and forbids fixing the contradiction by REVEALING the hidden truth',
   /Making prose compatible by REVEALING/i.test(rpBody), 'constraint missing');
ok('the repair is given the affected paragraph and the rest only as context',
   /PARAGRAPHS TO REPAIR/.test(rpBody) && /SURROUNDING CONTEXT/.test(rpBody), 'context framing missing');

// ── CENSUS ──
const roles = census.reduce((a, c) => { a[c.role || 'none'] = (a[c.role || 'none'] || 0) + 1; return a; }, {});
ok('★ every dispatch was a canon role on the Mistral route; no OpenAI at any point',
   census.every(c => (c.role === 'CHARACTER_CANON_AUDITOR' || c.role === 'CHARACTER_CANON_REPAIR') && /mistral-proxy/.test(c.path)),
   JSON.stringify(roles));

console.log(`\n${'═'.repeat(80)}\nCHARACTER_CANON_REPAIR + SEQUENCE (DORMANT)\n${'═'.repeat(80)}`);
console.log(log.join('\n'));
console.log(`${'─'.repeat(80)}\n intercepted: ${JSON.stringify(roles)}\n ${pass} passed · ${fail} failed\n`);
await ctx.close().catch(() => {}); await browser.close().catch(() => {});
process.exit(fail ? 1 : 0);
