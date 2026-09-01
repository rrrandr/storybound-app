// ══════════════════════════════════════════════════════════════════════════════════════════
//  THE DEVELOPMENT AUTHORIZER
//
//  `possible_development` is the auditor's strongest verdict about change, and it is a REFERRAL:
//  a model deciding a character has changed is a character rewriting themselves whenever a model
//  finds it plausible. Authorisation lives in the authored stage, written by a person.
//
//  Proven against a TEST-ONLY authored development. The seed's canon is not rewritten to
//  exercise this — a test that edits the story to make itself pass is testing the edit.
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
await page.waitForFunction(() => window._cpNormalizeStage && window._cpDevelopmentAuthorized, { timeout: 60000 });

// ── WHAT THE CONTRACT ACCEPTS AND REFUSES ──
const V = await page.evaluate(() => {
  const base = (devs) => ({ v: 1, provenance: 'test_only',
    participants: [{ ref: 'named:jess', label: 'Jess', presence: 'IN_PERSON' }],
    canonDevelopments: devs });
  const N = (d) => window._cpNormalizeStage(base(d), 'story-x', 7);
  const good = { subject_ref: 'named:jess', facet_ref: 'gen:x:v1:value',
                 operation: 'supersession', effectiveScene: 7, provenance: 'authored_test_fixture' };
  return {
    good:        N([good]),
    offStage:    N([{ ...good, subject_ref: 'named:someone_else' }]),
    notIssued:   N([{ ...good, subject_ref: 'jess' }]),
    noFacet:     N([{ ...good, facet_ref: '' }]),
    badOp:       N([{ ...good, operation: 'improvement' }]),
    noProv:      N([{ ...good, provenance: '' }]),
    none:        N([]),
  };
});
ok('an authored development validates and is carried on the stage',
   V.good.ok && V.good.canonDevelopments.length === 1
   && V.good.canonDevelopments[0].operation === 'supersession', JSON.stringify(V.good.canonDevelopments));
ok('★ a development for someone NOT on this stage is refused',
   V.offStage.canonDevelopments.length === 0
   && V.offStage.rejected.some(r => r.why === 'development_subject_not_on_this_stage'), JSON.stringify(V.offStage.rejected));
ok('★ a subject ref that is not an ISSUED ref is refused',
   V.notIssued.rejected.some(r => r.why === 'development_ref_not_issued'), JSON.stringify(V.notIssued.rejected));
ok('a development naming no facet is refused',
   V.noFacet.rejected.some(r => r.why === 'development_names_no_facet'), JSON.stringify(V.noFacet.rejected));
ok('an unknown operation is refused — exception|complication|supersession only',
   V.badOp.rejected.some(r => r.why === 'development_unknown_operation'), JSON.stringify(V.badOp.rejected));
ok('★ a development with no PROVENANCE is refused — someone must have written it',
   V.noProv.rejected.some(r => r.why === 'development_without_provenance'), JSON.stringify(V.noProv.rejected));
ok('a stage with no developments carries none', V.none.ok && V.none.canonDevelopments.length === 0, JSON.stringify(V.none.canonDevelopments));

// ── IT CHANGES THE STAGE'S IDENTITY ──
const FP = await page.evaluate(() => {
  const mk = (devs) => window._cpNormalizeStage({ v: 1, provenance: 'test_only',
    participants: [{ ref: 'named:jess', label: 'Jess', presence: 'IN_PERSON' }],
    canonDevelopments: devs }, 'story-x', 7).fingerprint;
  const d = { subject_ref: 'named:jess', facet_ref: 'gen:x:v1:value', operation: 'supersession',
              effectiveScene: 7, provenance: 'authored_test_fixture' };
  return { none: mk([]), one: mk([d]), other: mk([{ ...d, operation: 'complication' }]), again: mk([d]) };
});
ok('★ authorising a development CHANGES the stage fingerprint — it changes what the scene permits',
   FP.none !== FP.one && FP.one !== FP.other, JSON.stringify(FP));
ok('…and the same development reproduces the same fingerprint', FP.one === FP.again, JSON.stringify(FP));

// ── THE AUTHORIZER ITSELF ──
const AUTH = await page.evaluate(() => {
  const stage = { stageAuthority: window._cpNormalizeStage({ v: 1, provenance: 'test_only',
    participants: [{ ref: 'named:jess', label: 'Jess', presence: 'IN_PERSON' }],
    canonDevelopments: [{ subject_ref: 'named:jess', facet_ref: 'gen:x:v1:value',
      operation: 'supersession', effectiveScene: 7, provenance: 'authored_test_fixture' }] }, 'story-x', 7) };
  const bare = { stageAuthority: window._cpNormalizeStage({ v: 1, provenance: 'test_only',
    participants: [{ ref: 'named:jess', label: 'Jess', presence: 'IN_PERSON' }] }, 'story-x', 7) };
  const V = (subject, facet) => ({ subject_ref: subject, verdict: 'possible_development', development_ref: facet });
  return {
    authorized:    window._cpDevelopmentAuthorized(V('named:jess', 'gen:x:v1:value'), { stage }),
    wrongFacet:    window._cpDevelopmentAuthorized(V('named:jess', 'gen:OTHER:v1:habit'), { stage }),
    wrongSubject:  window._cpDevelopmentAuthorized(V('named:other', 'gen:x:v1:value'), { stage }),
    noDevelopment: window._cpDevelopmentAuthorized(V('named:jess', 'gen:x:v1:value'), { stage: bare }),
    noStage:       window._cpDevelopmentAuthorized(V('named:jess', 'gen:x:v1:value'), {}),
  };
});
ok('★ an authored development authorises exactly its own subject+facet', AUTH.authorized === true, JSON.stringify(AUTH));
ok('★ it does NOT authorise a different facet of the same character', AUTH.wrongFacet === false, JSON.stringify(AUTH));
ok('★ …nor the same facet on a different character', AUTH.wrongSubject === false, JSON.stringify(AUTH));
ok('★ with NO authored development, possible_development is unauthorised', AUTH.noDevelopment === false, JSON.stringify(AUTH));
ok('★ …and with no stage at all it is unauthorised — never authorised by absence', AUTH.noStage === false, JSON.stringify(AUTH));

// ── END TO END THROUGH THE COMMIT DECISION ──
const E2E = await page.evaluate(() => {
  const mk = (authorized) => ({ verdict: 'ok', verdicts: [
    { subject_ref: 'named:jess', verdict: 'possible_development', authorized }] });
  return { unauthorized: window._cpAuditAllowsCommit(mk(false)),
           authorized: window._cpAuditAllowsCommit(mk(true)) };
});
ok('★ an UNAUTHORISED possible_development commits nothing', E2E.unauthorized === false, JSON.stringify(E2E));
ok('★ an AUTHORISED one may commit — the backend, not the model, made that call', E2E.authorized === true, JSON.stringify(E2E));

// ── THE SHIPPED SEED AUTHORISES NOTHING ──
const SEED = await page.evaluate(() => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  Object.assign(s, { _starterId: def.id, is_starter_story: true, playerName: 'Lirael', name: 'Lirael',
    loveInterestName: 'Julian', partnerName: 'Julian', storyId: 'dev-seed' });
  let total = 0;
  for (let n = 1; n <= 20; n++) {
    s.storyId = 'dev-seed-' + n; s._relationshipLedger = null; s.turnCount = n - 1;
    const st = window._sceneStageContract(s, n);
    total += ((st.stageAuthority && st.stageAuthority.canonDevelopments) || []).length;
  }
  return { total };
});
ok('★ the SHIPPED seed authorises zero developments — the fixture above is test-only',
   SEED.total === 0, JSON.stringify(SEED));
ok('zero requests escaped', escaped === 0, String(escaped));

console.log(`\n${'═'.repeat(78)}\nDEVELOPMENT AUTHORIZER\n${'═'.repeat(78)}`);
console.log(log.join('\n'));
console.log(`${'─'.repeat(78)}\n ${pass} passed · ${fail} failed\n`);
await ctx.close().catch(() => {}); await browser.close().catch(() => {});
process.exit(fail ? 1 : 0);
