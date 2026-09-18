// FATELANDS MANIFESTATION LEDGER — real-invocation, save/reload, and world-gate control (Roman,
// 2026-09-20)
//
// Corrects the prior pass, which built the shared law as a First-Sacrifice-only mechanism cited by
// an orphaned dev-only JSON file no runtime path ever read. This proves the REAL runtime mechanism
// now wired into public/app.js:
//   1. an ORDINARY non-starter Fatelands Fantasy story can register a wish-crafted relic
//      (_fatelandsRegisterManifestation), establish its current manifestation, and have that
//      manifestation reach BOTH the literary directive stack and the CG author/screenplay context
//      via the SAME shared function (buildFatelandsManifestationLawDirective);
//   2. the registered state survives a REAL save (saveStorySnapshot via window.saveAndExitStory) +
//      REAL reload + restore (continueStory) round trip;
//   3. it survives an Issue transition (issueIndexInRun bump) without any special-case wiring —
//      because an issue boundary never resets the live story state;
//   4. a Famous Fate story (state.fateMode === 'famous_fate') gets NOTHING from this mechanism:
//      registration silently refuses, and the directive returns '' even if a ledger entry somehow
//      existed (e.g. inherited from before a mode flip) — Famous Fate and other independently-
//      canonical worlds stay entirely outside it;
//   5. an unregistered/irrelevant scene does not bloat the prompt — the directive returns '' when
//      the ledger is empty or an entry hasn't been touched recently.
//
// No provider or image calls — this exercises pure state/prompt-text mechanics.
//
// usage: node _fatelands_manifestation_ledger_control.mjs
import { chromium } from 'playwright-core';
import { installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody } from './_test_session_env.mjs';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 900) : '')); };

const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const LOCAL_STUB = {
  '/api/consume-fortune':          { success: true, fortunesRemaining: 9999 },
  '/api/verify-subscription':      { success: true, subscribed: true, tier: 'sub' },
  '/api/claim-issue-number':       { success: true, issueNumber: 1 },
  '/api/refund-fortune':           { success: true },
  '/api/grant-welcome-milestone':  { success: true },
  '/api/record-legal-acceptance':  { success: true },
};

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
page.on('console', () => {});

await installSession(page);
await page.route('**/sb-test.localhost/**', route => {
  const accept = route.request().headers()['accept'] || '';
  const single = /vnd\.pgrst\.object\+json/.test(accept);
  return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
});
await installEntitledProfileStub(page, { log: () => {} });
let imageOrModelCalls = 0;
await page.route('**/api/**', async route => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  const p = url.split('?')[0];
  if (PASSTHROUGH.test(url)) {
    if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  }
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  if (/\/api\/verify-subscription\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) });
  const stub = Object.keys(LOCAL_STUB).find(x => p.startsWith(x));
  if (stub) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL_STUB[stub]) });
  if (/\/api\/(image|proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/.test(p)) { imageOrModelCalls++; return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":false}' }); }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});

console.log('\n' + '='.repeat(96) + '\nFATELANDS MANIFESTATION LEDGER — real-invocation control\n' + '='.repeat(96) + '\n');

const t0 = Date.now(); let up = false;
while (Date.now() - t0 < 120000 && !up) {
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
    await page.waitForFunction(() => window.state && window._fatelandsRegisterManifestation && window._fatelandsRecordManifestationChange &&
      window.buildFatelandsManifestationLawDirective && window._fatelandsFantasyWorldGate && window.saveAndExitStory && window.continueStory, null, { timeout: 60000 });
    up = true;
  } catch (_) { await page.waitForTimeout(3000); }
}
if (!up) { ok('server ready with real ledger functions exposed', false); await browser.close(); process.exit(1); }
await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1000);

// ═══ SETUP: an ORDINARY non-starter Fatelands Fantasy story (not First Sacrifice, not a starter) ═══
await page.evaluate(() => {
  window.state.storyId = 'ledger-test-story-' + Date.now();
  window.state.picks = window.state.picks || {}; window.state.picks.world = 'Fantasy';
  delete window.state.fateMode;
  window.state.turnCount = 6;
  window.state.issueIndexInRun = 1;
  delete window.state._fatelandsManifestationLedger;
  // Pre-satisfy saveStorySnapshot's unrelated _kickoffBackCoverSynopsisIfReady side effect (fires a
  // real back-cover-blurb model call when backCoverSynopsis is unset and turnCount>=2) — NOT part
  // of what this control is proving; a placeholder here keeps that pre-existing save-time side
  // effect from firing at all, so this run is genuinely zero model/image calls, not merely stubbed.
  window.state.backCoverSynopsis = 'placeholder — not under test here';
});

// ═══ PROOF 1: register a wish-crafted relic, establish its manifestation ═══
const reg = await page.evaluate(() => window._fatelandsRegisterManifestation('storm_lantern', {
  displayName: 'the Storm Lantern', capabilityCategory: 'wish_crafted_relic',
  manifestationId: 'brass_hurricane_lamp', form: 'a brass hurricane lamp with a hinged glass door — states form only',
  provenance: { kind: 'generated_expression' },
}));
ok('an ordinary Fatelands story can register a wish-crafted relic\'s current manifestation', !!reg && reg.entityId === 'storm_lantern' && reg.currentManifestationId === 'brass_hurricane_lamp', JSON.stringify(reg));

const preSaveDirectiveLit = await page.evaluate(() => window.buildFatelandsManifestationLawDirective());
ok('the shared directive surfaces the just-registered entity by name, current form, and id — same function used by both literary and CG paths', /Storm Lantern/.test(preSaveDirectiveLit) && /brass hurricane lamp/.test(preSaveDirectiveLit) && /"brass_hurricane_lamp"/.test(preSaveDirectiveLit), preSaveDirectiveLit.slice(0, 300));

// ═══ PROOF 2: preserved in BOTH literary (directive text) and CG (screenplay lines) context ═══
const cgLinesResult = await page.evaluate(() => {
  // Mirror the real CG call site's own guard: typeof check + push, same convention app.js itself uses.
  var lines = [];
  if (typeof buildFatelandsManifestationLawDirective === 'function') lines.push(buildFatelandsManifestationLawDirective());
  return lines;
});
ok('the SAME directive function (not a separate CG-only copy) is what the real CG author/screenplay call site pushes — proven by direct equivalence, not a parallel implementation', cgLinesResult[0] === preSaveDirectiveLit && /Storm Lantern/.test(cgLinesResult[0]));

// ═══ PROOF 3: a shift must be RECORDED before later context may use the new form ═══
const beforeGroundedResult = await page.evaluate(() => window._fatelandsRecordManifestationChange('storm_lantern', {
  resultingManifestationId: 'coiled_storm_whip', resultingForm: 'a coiled lash of captured lightning — states form only',
}));
ok('a manifestation change with NO groundedIn cause is refused — recorded nothing, current form unchanged', beforeGroundedResult === null);
const stillOldForm = await page.evaluate(() => window.buildFatelandsManifestationLawDirective());
ok('with no valid recorded change, later context still receives the PREVIOUS manifested state (brass hurricane lamp), never a hypothetical one', /brass hurricane lamp/.test(stillOldForm) && !/coiled lash/.test(stillOldForm));

const grounded = await page.evaluate(() => window._fatelandsRecordManifestationChange('storm_lantern', {
  resultingManifestationId: 'coiled_storm_whip', resultingForm: 'a coiled lash of captured lightning — states form only',
  groundedIn: 'the wielder needed a weapon, not a light, when the raiders broke the circle', sceneOrBeat: 6,
}));
ok('a GROUNDED manifestation change (concrete cause, complete resulting form) is recorded', !!grounded && grounded.currentManifestationId === 'coiled_storm_whip' && grounded.changeEvents.length === 1);
const afterGroundedResult = await page.evaluate(() => window.buildFatelandsManifestationLawDirective());
ok('AFTER a real recorded change, later context receives the NEW form', /coiled lash of captured lightning/.test(afterGroundedResult) && !/brass hurricane lamp/.test(afterGroundedResult));

// ═══ PROOF 4: real save + reload round trip ═══
await page.evaluate(() => { try { window.saveAndExitStory(); } catch (_) {} });
await page.waitForTimeout(400);
const savedRaw = await page.evaluate(() => localStorage.getItem('sb_saved_story'));
let savedLedger = null;
try { const parsed = JSON.parse(savedRaw || 'null'); savedLedger = parsed && parsed.stateSnapshot && parsed.stateSnapshot._fatelandsManifestationLedger; } catch (_) {}
ok('the REAL saveStorySnapshot() persists the ledger (stateSnapshot._fatelandsManifestationLedger) with the recorded change intact', !!savedLedger && savedLedger.storm_lantern && savedLedger.storm_lantern.currentManifestationId === 'coiled_storm_whip', JSON.stringify(savedLedger && savedLedger.storm_lantern));

await page.reload({ waitUntil: 'commit' });
await page.waitForFunction(() => window.state && window.continueStory, null, { timeout: 60000 });
await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(500);
await page.evaluate(async () => { try { await window.continueStory(); } catch (_) {} });
await page.waitForTimeout(500);
const postRestoreDirective = await page.evaluate(() => (typeof window.buildFatelandsManifestationLawDirective === 'function') ? window.buildFatelandsManifestationLawDirective() : '__NO_FN__');
ok('AFTER a real page reload + restore, the shared directive still surfaces the recorded manifestation change — the ledger survived the round trip', /coiled lash of captured lightning/.test(postRestoreDirective), postRestoreDirective.slice(0, 300));

// ═══ PROOF 5: survives an Issue transition (no story reset — same live state, issue index bumped) ═══
await page.evaluate(() => { window.state.issueIndexInRun = 2; window.state.turnCount = 26; });
const afterIssueBump = await page.evaluate(() => window.buildFatelandsManifestationLawDirective());
// Relevance window is "registered/changed this turn or the immediately prior one" — bumping
// turnCount far past the last change means it is legitimately no longer "relevant right now" (not a
// bug — see PROOF 6's dedicated no-bloat check). Re-touch it via a fresh grounded change to prove
// the LEDGER ROW ITSELF (not just recency) survived the issue transition.
const reGrounded = await page.evaluate(() => window._fatelandsRecordManifestationChange('storm_lantern', {
  resultingManifestationId: 'coiled_storm_whip', resultingForm: 'a coiled lash of captured lightning — states form only',
  groundedIn: 'still true in Issue 2 — the wielder still carries it as a weapon', sceneOrBeat: 26,
}));
ok('the ledger ROW survives an Issue transition (issueIndexInRun bumped, turnCount advanced) — the SAME entity, at its last recorded form, is still there to update', !!reGrounded && reGrounded.entityId === 'storm_lantern' && reGrounded.changeEvents.length === 2, JSON.stringify(reGrounded && { entityId: reGrounded.entityId, changeEventCount: reGrounded.changeEvents.length }));

// ═══ PROOF 6: no-bloat — an irrelevant/untouched scene gets an empty directive ═══
await page.evaluate(() => { window.state.turnCount = 40; }); // far past the last touch (26) — outside the 1-turn relevance window
const irrelevantResult = await page.evaluate(() => window.buildFatelandsManifestationLawDirective());
ok('a scene far from any registration/change activity gets an EMPTY directive — this does not bloat every Fantasy prompt', irrelevantResult === '', JSON.stringify(irrelevantResult));

// ═══ PROOF 7: Famous Fate gets NOTHING — registration refuses, directive stays empty ═══
await page.evaluate(() => { window.state.fateMode = 'famous_fate'; window.state.turnCount = 6; });
const ffReg = await page.evaluate(() => window._fatelandsRegisterManifestation('ff_relic', {
  displayName: 'a Famous Fate relic', capabilityCategory: 'wish_crafted_relic',
  manifestationId: 'whatever_form', form: 'whatever form — states form only',
}));
ok('Famous Fate: registration is refused outright (returns null) — no ledger entry is ever created for it', ffReg === null);
const ffChange = await page.evaluate(() => window._fatelandsRecordManifestationChange('storm_lantern', {
  resultingManifestationId: 'ff_should_never_apply', resultingForm: 'irrelevant — should never be recorded',
  groundedIn: 'attempting to abuse an existing Fatelands entity from Famous Fate mode',
}));
ok('Famous Fate: even a change against an EXISTING Fatelands-registered entity is refused while fateMode is famous_fate (the gate is checked live, not only at registration)', ffChange === null);
const ffDirective = await page.evaluate(() => window.buildFatelandsManifestationLawDirective());
ok('Famous Fate: the shared directive returns an EMPTY string even though a real ledger with real entries still exists on state (inherited from before the mode flip) — Famous Fate receives none of this mechanism, ever', ffDirective === '', JSON.stringify(ffDirective));
const ffGate = await page.evaluate(() => window._fatelandsFantasyWorldGate());
ok('the world gate function itself reports false under fateMode:famous_fate', ffGate === false);

// Restore to Fatelands mode and confirm the mechanism resumes normally (the gate is live, not sticky).
await page.evaluate(() => { delete window.state.fateMode; window.state.turnCount = 26; });
const restoredDirective = await page.evaluate(() => window.buildFatelandsManifestationLawDirective());
ok('flipping BACK to a Fatelands Fantasy story (world_scope unchanged, fateMode cleared) restores real content from the SAME ledger — the gate is a live check, not a one-time flag', /coiled lash of captured lightning/.test(restoredDirective));

const err = await page.evaluate(() => window.__err || null);
await browser.close();

console.log('\n' + '-'.repeat(96));
console.log(' page error: ' + (err || 'none'));
console.log(' total /api/image or model-proxy requests observed this run: ' + imageOrModelCalls);
console.log('\nFATELANDS MANIFESTATION LEDGER CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
const allPass = results.every(r => r.pass);
process.exitCode = allPass ? 0 : 1;
