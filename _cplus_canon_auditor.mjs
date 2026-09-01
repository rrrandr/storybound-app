// ══════════════════════════════════════════════════════════════════════════════════════════
//  CHARACTER_CANON_AUDITOR — THE CONTRACT, UNDER INTERCEPTION
//
//  The role is written and NOT enabled. Every dispatch here is intercepted; the suite asserts
//  that with the flag off nothing is even attempted, and that with it forced on (in the harness
//  only) the request and the response contract behave as specified.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0; const log = [];
const ok = (n, c, d) => { if (c) { pass++; log.push(`  ✓ ${n}`); } else { fail++; log.push(`  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 420) : ''}`); } };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext(); const page = await ctx.newPage();
await installSession(page);

// Every model request is counted by role; NOTHING reaches a provider.
const census = [];
let nextReply = null;
await page.route('**/*', async route => {
  const url = route.request().url(); const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  let body = null; try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/.test(path)) {
    census.push({ path, role: body && body.role, model: body && body.model,
                  max_tokens: body && body.max_tokens,
                  sysChars: String(((body && body.messages) || []).map(m => m.content).join('')).length,
                  body });
    if (nextReply) { const r = nextReply; nextReply = null; return route.fulfill(r); }
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window._cpCanonAudit && window.__CP_AUDIT, { timeout: 60000 });

const K = await page.evaluate(() => window.__CP_AUDIT);
ok('the contract is declared: role, model, verdicts, hard ceiling',
   K.role === 'CHARACTER_CANON_AUDITOR' && K.model === 'mistral-small-latest'
   && K.verdicts.join() === 'compatible,contradiction,possible_development,unknown'
   && K.maxTokens === 400, JSON.stringify(K));

// ── FIXTURE: Jess with a revealed signature + a latent truth, and one auditor-only subject ──
const build = () => page.evaluate(() => {
  const s = window.state;
  s.storyId = 'audit-fx'; s._relationshipLedger = null;
  s.playerName = 'Ilse'; s.name = 'Ilse'; s.loveInterestName = 'Adan'; s.partnerName = 'Adan';
  delete s._starterId; s.is_starter_story = false;
  s._cpAuditDispatched = {};
  const jess = window._relEntityForName('Jess', { create: true });
  window._attachPortfolio(jess, [
    { category: 'value', canonical_truth: 'She leads with her decolletage to control where attention lands.',
      possible_pressures: [{ text: 'a room not centred on her', evidence_requires: 'room' }],
      forbidden_restatements: [{ forbid: 'naturally modest|avoids being noticed', why: 'inverts the mechanism' }] },
    { category: 'habit', canonical_truth: 'LATENT: she keeps the name of everyone who owed her a silence.',
      possible_pressures: [{ text: 'a kept secret', evidence_requires: 'secret' }],
      forbidden_restatements: [{ forbid: 'forgets a debt', why: 'inverts it' }] },
  ], { provenance: 'generated_cast' });
  const f = window._relLedger().entities[jess].authorProfile.cPlusFacets.map(x => x.facet_id);
  s._cpDirectedBeats = [{ character: 'Jess', facet_id: f[0], expressionMode: 'DISPLAY',
    visibleAction: 'she turns so the lamp finds her collarbone', pcInterpretation: 'she chooses where my eyes go' }];
  window._cpCommitScene({ sceneUid: 'A1', ordinal: 1, issue: 1,
    delivered: [{ canonicalId: jess, facet_id: f[0], category: 'value', verified: true, persistence: 'recurring_signature' }], appeared: [] });
  s.__auditStage = { onStage: [{ id: jess, label: 'Jess' }] };
  return { jess, f };
});
const FX = await build();

const audit = (text, opts) => page.evaluate(async ({ text, opts }) => {
  const s = window.state;
  const model = window._cpBuildEstablishedCanon(s.__auditStage, {});
  return await window._cpCanonAudit(text, model, opts || {});
}, { text, opts });

// ══ 1. FLAG OFF — NOTHING IS ATTEMPTED, AND IT IS NOT "COMPATIBLE" ══
await page.evaluate(() => { window.__cpCanonAuditorEnabled = false; });
const before = census.length;
const OFF = await audit('Jess crossed the room and said nothing at all.', { sceneUid: 'S-off' });
ok('★ with the flag OFF the verdict is auditor_not_enabled, never compatible',
   OFF.verdict === 'auditor_not_enabled' && OFF.dispatched === false, JSON.stringify(OFF));
ok('★ …and NO request was even attempted', census.length === before, `census grew by ${census.length - before}`);

// ══ 2. THE FREE LAYER SHORT-CIRCUITS — NO CALL IS BOUGHT FOR KNOWN-BAD PROSE ══
await page.evaluate(() => { window.__cpCanonAuditorEnabled = true; });
const before2 = census.length;
const DET = await audit('Jess is naturally modest, and she took the far chair.', { sceneUid: 'S-det' });
ok('★ a deterministic hit returns contradiction WITHOUT dispatching',
   DET.verdict === 'contradiction' && DET.dispatched === false && DET.source === 'deterministic',
   JSON.stringify(DET));
ok('★ …and no auditor call was bought for prose already known to fail',
   census.length === before2, `census grew by ${census.length - before2}`);

// ══ 3. THE REQUEST, WHEN IT IS MADE ══
nextReply = { status: 200, contentType: 'application/json',
  body: JSON.stringify({ content: JSON.stringify({ verdicts: [{ subject_ref: FX.jess, verdict: 'compatible', reason_code: 'no_conflict_found' }] }) }) };
const before3 = census.length;
const OKV = await audit('Jess had dressed plainly on purpose; in a room this loud the one woman not asking to be looked at is the one they look at.', { sceneUid: 'S-ok' });
const req = census[census.length - 1];
ok('exactly ONE dispatch was made', census.length === before3 + 1, `+${census.length - before3}`);
ok('it carries the auditor role, the pinned model and the hard ceiling',
   req.role === 'CHARACTER_CANON_AUDITOR' && req.model === 'mistral-small-latest' && req.max_tokens === 400,
   JSON.stringify({ role: req.role, model: req.model, mt: req.max_tokens }));
ok('it went to the MISTRAL proxy, not an OpenAI route', /mistral-proxy/.test(req.path), req.path);
ok('★ the request carries the latent truth (that is what the private view is for)',
   /LATENT: she keeps the name/.test(JSON.stringify(req.body)), 'latent truth missing from the auditor request');
ok('★ …and instructs it never to echo that material',
   /NO prose, NO explanation, NO quotation/.test(JSON.stringify(req.body)), 'no disclosure ban in the prompt');
ok('a valid compatible verdict comes back as such',
   OKV.verdict === 'ok' && OKV.outcome === 'compatible', JSON.stringify(OKV));
ok('★ strategic demureness is compatible — mechanism, not surface',
   OKV.verdicts[0].verdict === 'compatible', JSON.stringify(OKV.verdicts));

// ══ 4. ONE DISPATCH PER SCENE, NO RETRY ══
const before4 = census.length;
const AGAIN = await audit('Jess said nothing.', { sceneUid: 'S-ok' });     // same sceneUid
ok('★ a second audit of the same finalized scene does NOT dispatch',
   AGAIN.dispatched === false && AGAIN.code === 'already_audited_this_scene', JSON.stringify(AGAIN));
ok('…and buys nothing', census.length === before4, `+${census.length - before4}`);

// ══ 5. THE RESPONSE CONTRACT ══
const V = await page.evaluate(({ jess }) => {
  const subs = [{ subject_ref: jess, label: 'Jess' }];
  const J = (o) => JSON.stringify(o);
  return {
    malformed:  window._cpAuditValidate('not json', subs),
    invented:   window._cpAuditValidate(J({ verdicts: [{ subject_ref: 'ent:nobody', verdict: 'compatible' }] }), subs),
    duplicate:  window._cpAuditValidate(J({ verdicts: [{ subject_ref: jess, verdict: 'compatible' }, { subject_ref: jess, verdict: 'contradiction' }] }), subs),
    badVerdict: window._cpAuditValidate(J({ verdicts: [{ subject_ref: jess, verdict: 'fine' }] }), subs),
    badReason:  window._cpAuditValidate(J({ verdicts: [{ subject_ref: jess, verdict: 'compatible', reason_code: 'because' }] }), subs),
    missing:    window._cpAuditValidate(J({ verdicts: [] }), subs),
    good:       window._cpAuditValidate(J({ verdicts: [{ subject_ref: jess, verdict: 'compatible', reason_code: 'no_conflict_found' }] }), subs),
  };
}, { jess: FX.jess });
ok('a malformed response is rejected', !V.malformed.ok && V.malformed.code === 'malformed_response', JSON.stringify(V.malformed));
ok('★ an INVENTED subject ref invalidates the whole response',
   !V.invented.ok && V.invented.code === 'unknown_subject_ref' && V.invented.verdicts.length === 0, JSON.stringify(V.invented));
ok('★ a DUPLICATE subject ref invalidates the whole response',
   !V.duplicate.ok && V.duplicate.code === 'duplicate_subject_ref', JSON.stringify(V.duplicate));
ok('an invented verdict is rejected', !V.badVerdict.ok && V.badVerdict.code === 'invalid_verdict', JSON.stringify(V.badVerdict));
ok('★ a free-text reason code is rejected — codes are enumerated',
   !V.badReason.ok && V.badReason.code === 'invalid_reason_code', JSON.stringify(V.badReason));
ok('★ a subject the auditor ignored becomes explicitly UNKNOWN, not compatible',
   V.missing.ok && V.missing.verdicts.length === 1 && V.missing.verdicts[0].verdict === 'unknown'
   && V.missing.verdicts[0].missing === true, JSON.stringify(V.missing));
ok('CONTROL: a well-formed response validates — the rejections are about the defect',
   V.good.ok && V.good.verdicts[0].verdict === 'compatible', JSON.stringify(V.good));

// ══ 6. THE MODEL MAY NOT AUTHORIZE ITS OWN DEVELOPMENT ══
await build();
nextReply = { status: 200, contentType: 'application/json',
  body: JSON.stringify({ content: JSON.stringify({ verdicts: [{ subject_ref: FX.jess, verdict: 'possible_development', reason_code: 'development_claimed' }] }) }) };
const DEV = await audit('Jess had stopped needing the room to look at her, and it was not a performance.', { sceneUid: 'S-dev' });
ok('★ possible_development WITHOUT backend authorization is treated as a contradiction',
   DEV.verdict === 'ok' && DEV.outcome === 'contradiction'
   && DEV.verdicts[0].verdict === 'possible_development' && DEV.verdicts[0].authorized === false,
   JSON.stringify(DEV));
ok('★ …and it commits nothing', await page.evaluate((r) => window._cpAuditAllowsCommit(r) === false, DEV), 'commit was allowed');

// ══ 7. WHAT MAY AND MAY NOT COMMIT ══
const COMMIT = await page.evaluate(({ jess }) => {
  const mk = (verdict, authorized) => ({ verdict: 'ok', verdicts: [{ subject_ref: jess, verdict, authorized }] });
  return {
    compatible: window._cpAuditAllowsCommit(mk('compatible')),
    contradiction: window._cpAuditAllowsCommit(mk('contradiction')),
    unknown: window._cpAuditAllowsCommit(mk('unknown')),
    devNo: window._cpAuditAllowsCommit(mk('possible_development', false)),
    devYes: window._cpAuditAllowsCommit(mk('possible_development', true)),
    notEnabled: window._cpAuditAllowsCommit({ verdict: 'auditor_not_enabled', verdicts: [] }),
  };
}, { jess: FX.jess });
ok('★ ONLY compatible (or backend-authorized development) may commit a manifestation',
   COMMIT.compatible === true && COMMIT.devYes === true
   && COMMIT.contradiction === false && COMMIT.unknown === false
   && COMMIT.devNo === false && COMMIT.notEnabled === false, JSON.stringify(COMMIT));

// ══ 8. FAILURE MODES ARE UNKNOWN, NEVER COMPATIBLE ══
await build();
nextReply = { status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'upstream' }) };
const FAIL = await audit('Jess crossed the room.', { sceneUid: 'S-500' });
ok('★ an HTTP failure is UNKNOWN, never compatible, and is not retried',
   FAIL.verdict === 'unknown' && /http_500/.test(FAIL.code || ''), JSON.stringify(FAIL));
await build();
nextReply = { status: 403, contentType: 'application/json', body: JSON.stringify({ code: 'AUDITOR_NOT_ENABLED' }) };
const SRV = await audit('Jess crossed the room.', { sceneUid: 'S-403' });
ok('★ the SERVER refusal is reported as auditor_not_enabled, not as a pass',
   SRV.verdict === 'auditor_not_enabled', JSON.stringify(SRV));

// ══ 8b. DORMANT SAFETY — DISABLED AUDITING MUST NOT ERASE THE MEMORY WORK ══
// The whole phase before this added manifestation history. If turning the auditor OFF meant
// beats stopped being recorded, the dormant state would have quietly undone it.
await build();
const DORMANT = await page.evaluate(async ({ jess, f }) => {
  const s = window.state;
  window.__cpCanonAuditorEnabled = false;
  window.__cpCanonEnforcement = undefined;                 // default
  const model = window._cpBuildEstablishedCanon(s.__auditStage, {});
  const audit = await window._cpCanonAudit('Jess crossed the room and said nothing at all.', model, { sceneUid: 'S-dormant' });
  const decision = window._cpPublicationDecision(audit);
  s._cpDirectedBeats = [{ character: 'Jess', facet_id: f[1], expressionMode: 'CONCEAL',
    visibleAction: 'she writes a name down and covers it', pcInterpretation: 'she is keeping a count' }];
  const commit = window._cpCommitScene({ sceneUid: 'S-dormant', ordinal: 5, issue: 1,
    delivered: [{ canonicalId: jess, facet_id: f[1], category: 'habit', verified: true,
                  semanticStatus: decision.semanticStatus, published: decision.publish }], appeared: [] });
  const cont = window._cpContinuityFor(jess);
  const last = cont.manifestations[cont.manifestations.length - 1];
  return { audit, decision, commit, last, total: cont.manifestations.length,
           enforcement: window._cpCanonEnforcement() };
}, { jess: FX.jess, f: FX.f });
ok('★ DORMANT: the auditor does not run and does not dispatch',
   DORMANT.audit.verdict === 'auditor_not_enabled' && DORMANT.audit.dispatched === false, JSON.stringify(DORMANT.audit));
ok('★ DORMANT: the manifestation still commits, with its full detail intact',
   DORMANT.commit.ok && DORMANT.last && DORMANT.last.visibleAction === 'she writes a name down and covers it'
   && DORMANT.last.pcInterpretation === 'she is keeping a count', JSON.stringify(DORMANT.last));
ok('★ DORMANT: it is recorded semanticStatus=unresolved — never "compatible" by omission',
   DORMANT.last.semanticStatus === 'unresolved', JSON.stringify(DORMANT.last.semanticStatus));
ok('DORMANT: publication is unchanged and enforcement defaults to off',
   DORMANT.decision.publish === true && DORMANT.enforcement === 'off', JSON.stringify(DORMANT.decision));

// ══ 8c. ENABLING THE AUDITOR MUST NOT CHANGE PUBLICATION BY ITSELF ══
// Turning it on to LEARN something must not silently turn it on to BLOCK things.
await build();
nextReply = { status: 200, contentType: 'application/json',
  body: JSON.stringify({ content: JSON.stringify({ verdicts: [{ subject_ref: FX.jess, verdict: 'contradiction', reason_code: 'mechanism_inverted' }] }) }) };
const ENABLED_OFF = await page.evaluate(async ({ jess, f }) => {
  const s = window.state;
  window.__cpCanonAuditorEnabled = true;
  window.__cpCanonEnforcement = undefined;                 // enforcement NOT selected
  const model = window._cpBuildEstablishedCanon(s.__auditStage, {});
  const audit = await window._cpCanonAudit('Jess had become someone the room never turned toward.', model, { sceneUid: 'S-enf-off' });
  const decision = window._cpPublicationDecision(audit);
  s._cpDirectedBeats = [{ character: 'Jess', facet_id: f[1], expressionMode: 'CONCEAL',
    visibleAction: 'she writes a name down', pcInterpretation: 'a count is being kept' }];
  window._cpCommitScene({ sceneUid: 'S-enf-off', ordinal: 6, issue: 1,
    delivered: [{ canonicalId: jess, facet_id: f[1], category: 'habit', verified: true,
                  semanticStatus: decision.semanticStatus, published: decision.publish }], appeared: [] });
  const cont = window._cpContinuityFor(jess);
  return { audit: { verdict: audit.verdict, outcome: audit.outcome }, decision,
           last: cont.manifestations[cont.manifestations.length - 1] };
}, { jess: FX.jess, f: FX.f });
ok('★ ENABLED + enforcement off: a contradiction is found…',
   ENABLED_OFF.audit.outcome === 'contradiction', JSON.stringify(ENABLED_OFF.audit));
ok('★ …publication is NOT altered — enabling to learn is not enabling to block',
   ENABLED_OFF.decision.publish === true && ENABLED_OFF.decision.mode === 'off', JSON.stringify(ENABLED_OFF.decision));
ok('★ …and the conflict is RECORDED as published, because the reader has now seen it',
   ENABLED_OFF.last.semanticStatus === 'contradiction' && ENABLED_OFF.last.publishedWithConflict === true,
   JSON.stringify(ENABLED_OFF.last));

// ══ 8d. THE UNSELECTED 'block' MODE — PUBLICATION AND MEMORY AGREE ══
const BLOCK = await page.evaluate(() => {
  window.__cpCanonEnforcement = 'block';
  const d = {
    contradiction: window._cpPublicationDecision({ verdict: 'ok', outcome: 'contradiction' }),
    unknown: window._cpPublicationDecision({ verdict: 'unknown' }),
    compatible: window._cpPublicationDecision({ verdict: 'ok', outcome: 'compatible' }),
    notEnabled: window._cpPublicationDecision({ verdict: 'auditor_not_enabled' }),
  };
  window.__cpCanonEnforcement = undefined;                 // put it back; it is not selected
  return d;
});
ok('★ block mode: a contradiction neither publishes NOR commits — they cannot disagree',
   BLOCK.contradiction.publish === false && BLOCK.contradiction.commit === false, JSON.stringify(BLOCK.contradiction));
ok('★ block mode: unknown also stops publication — silence is not a pass',
   BLOCK.unknown.publish === false && BLOCK.unknown.commit === false, JSON.stringify(BLOCK.unknown));
ok('block mode: compatible publishes and commits', BLOCK.compatible.publish === true && BLOCK.compatible.commit === true, JSON.stringify(BLOCK.compatible));
ok('★ block mode with the auditor dormant would stop every scene — which is why it is NOT selected',
   BLOCK.notEnabled.publish === false, JSON.stringify(BLOCK.notEnabled));
const MODE = await page.evaluate(() => window._cpCanonEnforcement());
ok('★ enforcement is OFF at rest', MODE === 'off', MODE);

// ══ 9. CENSUS ══
const roles = census.reduce((a, c) => { a[c.role || 'none'] = (a[c.role || 'none'] || 0) + 1; return a; }, {});
ok('★ every dispatch in this suite was the auditor role, on the Mistral route, and none escaped',
   census.every(c => c.role === 'CHARACTER_CANON_AUDITOR' && /mistral-proxy/.test(c.path)),
   JSON.stringify(roles));
ok('no OpenAI route was used at any point', !census.some(c => /chatgpt-proxy/.test(c.path)), JSON.stringify(roles));

fs.mkdirSync('_audit_out', { recursive: true });
fs.writeFileSync('_audit_out/auditor_census.json', JSON.stringify(
  census.map(c => ({ path: c.path, role: c.role, model: c.model, max_tokens: c.max_tokens, sysChars: c.sysChars })), null, 2));

console.log(`\n${'═'.repeat(80)}\nCHARACTER_CANON_AUDITOR — CONTRACT (DISABLED)\n${'═'.repeat(80)}`);
console.log(log.join('\n'));
console.log(`${'─'.repeat(80)}`);
console.log(` intercepted dispatches: ${census.length} — ${JSON.stringify(roles)}`);
console.log(` largest request: ${Math.max(...census.map(c => c.sysChars), 0)} chars`);
console.log(`${'─'.repeat(80)}\n ${pass} passed · ${fail} failed\n`);
await ctx.close().catch(() => {}); await browser.close().catch(() => {});
process.exit(fail ? 1 : 0);
