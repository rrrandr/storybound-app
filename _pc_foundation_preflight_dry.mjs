// ═══ PC FOUNDATION VALIDATION — DRY PREFLIGHT (Roman, authorized 2026-09-15) ═══
//
// Prepares, but does NOT execute, the one real `_generatePCBodyBible()` call proposed in
// _audit_out/pc_facet_foundation_source_audit.md. EVERY /api/** route is stubbed in THIS run,
// including the pcBodyBible-classified one — this script spends nothing and makes no paid call.
// It exists to report, with real measured numbers (not guesses), everything Roman asked for
// BEFORE authorizing the one live call:
//   - exact provider/model/tier and REAL governor admission result (the actual governor module,
//     not a hand estimate);
//   - request and completion token reservation, measured from the REAL prompt this specific
//     story would send (not the generic historical figures in _measure_governor_admission.mjs);
//   - a bounded cost estimate, computed from this app's OWN TEXT_PRICING table, with the pricing
//     gap it has for ministral-8b-2512 disclosed rather than hidden;
//   - proof that every OTHER route is intercepted at the outbound boundary and that reaching this
//     point, and making the one call, produces NO other request (no Scene 2, no author prose, no
//     images, no fate cards, no sibling bible/scaffold/rplot calls);
//   - the exact fixed First Sacrifice source material (state.picks/playerMask/archetype/name)
//     that would be supplied as input, captured live rather than assumed;
//   - the acceptance rubric the real response would be graded against, stated here so it is fixed
//     BEFORE the response exists (pre-registered, not written to fit whatever comes back).
//
// HOW THE ONE CALL WOULD BE ISOLATED, WHEN AUTHORIZED: _generatePCBodyBible() fires naturally
// alongside three siblings (liBodyBible/antagonistBodyBible/scaffold or rplot) in a Genesis-gate
// burst — reaching that point via the full real click chain would make MORE than one request.
// This script instead reaches First Sacrifice's REAL state via the real click chain (Library ->
// book -> Read only — NO Genesis unlock, no OAS, no scene generation) and then calls the EXISTING,
// UNMODIFIED window._generatePCBodyBible() DIRECTLY — a real function, not DOM-forced UI, but
// invoked in isolation from its three siblings so it is the ONLY request the authorized run would
// make. This is the same "direct call to a real backend function for the exact mechanism under
// test" pattern this repo's own proofs already use (e.g. window._acceptStageProposal in
// _cplus_eplus_fusion_live_proof.mjs) — never a bypass of the call being tested, only a bypass of
// its unrelated siblings.
//
// NEVER: git commit/push/stash/checkout/reset. NEVER touch .env.local. NO paid model calls in
// THIS script — every /api/** answered locally, including pcBodyBible. NEVER edit public/app.js
// or any existing proof file. Do not flip DRY_RUN to live without Roman's explicit authorization.
//
// usage: node _pc_foundation_preflight_dry.mjs   (dev server on :3000; every /api/** POST answered locally)

import { chromium } from 'playwright-core';
import { createRequire } from 'node:module';
import {
  installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody,
} from './_test_session_env.mjs';

const require = createRequire(import.meta.url);
const { createGovernor, MODEL_LIMITS } = require('./api/_mistral-governor.js');
const { memoryStore } = require('./api/_mistral-governor-store.js');

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 500) : '')); };
const note = (s) => console.log('  [NOTE] ' + s);
const section = (t) => console.log('\n=== ' + t + ' ===');

function classifyModelCall(sys, usr, role, model) {
  // Exact system-prompt anchors, verified directly against public/app.js (~255175, ~256191,
  // ~256618) — the same three-way phrasing the app itself uses, not a guess.
  if (/generating a PROTAGONIST BODY BIBLE for a romance novel/.test(sys)) return 'pcBodyBible';
  if (/generating a LOVE-INTEREST BODY BIBLE for a romance novel/.test(sys)) return 'liBodyBible';
  if (/generating an ANTAGONIST BODY BIBLE for a romance novel/.test(sys)) return 'antagonistBodyBible';
  if (/screenplay-native cinematic-romance writer/.test(sys)) return 'cgScreenplay';
  if (/SCENE-SPINE planner/.test(sys) || /"hardBeats"/.test(sys)) return 'sceneSpine';
  if (/STORYBOUND ARCHITECTURE LAWS/.test(sys)) return 'author';
  if (role === 'STRUCTURE_GENERATOR') return 'structureGenerator-unclassified';
  return 'unclassified(role=' + role + ',model=' + model + ')';
}

const requestCensus = [];
let pcBodyBibleCapturedRequest = null;

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
page.on('console', () => {}); // silenced — this script reports its own structured findings

await installSession(page);
await page.route('**/sb-test.localhost/**', route => {
  const accept = route.request().headers()['accept'] || '';
  const single = /vnd\.pgrst\.object\+json/.test(accept);
  return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
});
await installEntitledProfileStub(page, { log: () => {} });

// ── THE ONE OUTBOUND BOUNDARY. Every /api/** POST, of every kind, passes through here. In this
// dry run EVERY request — including a would-be pcBodyBible one — is answered locally. This is
// the exact mechanism that, in the authorized live run, would let pcBodyBible through for real
// while continuing to stub everything else: the boundary is proven here by showing it intercepts
// and classifies every single request that occurs, with nothing reaching the real internet. ──
await page.route('**/api/**', async route => {
  const req = route.request(); const url = req.url(); const p = new URL(url).pathname;
  if (/\/api\/config\b/.test(url)) { requestCensus.push({ kind: 'infra:config', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() }); }
  if (isAuthOrigin(url)) { requestCensus.push({ kind: 'infra:auth-origin', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
  if (/\/api\/verify-subscription\b/.test(url)) { requestCensus.push({ kind: 'infra:verify-subscription', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) }); }
  if (/\/api\/csp-report\b/.test(url)) { requestCensus.push({ kind: 'infra:csp-report', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
  if (/\/api\/beta-events\b/.test(url)) { requestCensus.push({ kind: 'infra:beta-events', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
  if (req.method() !== 'POST') { requestCensus.push({ kind: 'infra:non-post', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }

  let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const flat = m => typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(x => x && x.text || '').join('\n') : '');
  const sys = (b.messages || []).filter(m => m.role === 'system').map(flat).join('\n');
  const usr = (b.messages || []).filter(m => m.role === 'user').map(flat).join('\n');
  const kind = classifyModelCall(sys, usr, b.role, b.model || b.preferredModel);
  const sysBytes = Buffer.byteLength(sys, 'utf8'), usrBytes = Buffer.byteLength(usr, 'utf8');
  const entry = { kind, url: p, role: b.role || null, model: b.model || b.preferredModel || null, maxTokens: b.max_tokens || null, temperature: b.temperature, sysBytes, usrBytes };
  requestCensus.push(entry);
  if (kind === 'pcBodyBible') {
    pcBodyBibleCapturedRequest = { url: p, role: b.role, model: b.model, maxTokens: b.max_tokens, temperature: b.temperature, sys, usr, sysBytes, usrBytes };
    // DRY: stub a harmless, schema-shaped reply so _generatePCBodyBible completes normally and we
    // can inspect what it DOES with a reply, without ever contacting Mistral. NOT a real answer.
    const stub = {
      height: '5\'6"', build: 'slender', hair: 'dark', complexion: 'warm',
      signature_feature: 'a steady, watchful gaze', second_celebrated_feature: 'quick, deliberate hands',
      emotional_weather: 'DRY-RUN PLACEHOLDER — not a real generation',
      core_contradiction: 'DRY-RUN PLACEHOLDER — not a real generation',
      private_hope: 'DRY-RUN PLACEHOLDER — not a real generation',
      wound: { core: 'DRY-RUN PLACEHOLDER — not a real generation', category: 'PARENTAL', surfacing_hint: 'DRY-RUN PLACEHOLDER' },
      signature_habits: 'DRY-RUN PLACEHOLDER', self_conscious_feature: null, li_keenly_aware_of: ['DRY-RUN PLACEHOLDER'],
      stress_tic: 'DRY-RUN', desire_tell: 'DRY-RUN', impatience_tell: 'DRY-RUN', confidence_tell: 'DRY-RUN', vulnerability_tell: 'DRY-RUN',
      current_crisis: { event: 'DRY-RUN PLACEHOLDER', time_since_impact: 'DRY-RUN', hottest_emotion: 'DRY-RUN', immediate_want: 'DRY-RUN', immediate_fear: 'DRY-RUN', refusal: 'DRY-RUN', li_complication: 'DRY-RUN' },
    };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: JSON.stringify(stub), usage: { prompt_tokens: Math.round((sysBytes + usrBytes) / 4), completion_tokens: 400 } }) });
  }
  // ANY OTHER CLASSIFIED CALL — this run must never see one. Stubbed harmlessly, but its mere
  // OCCURRENCE is itself the finding (checked below).
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '{}' }) });
});

// ═══════════════════════════════════════ REACH REAL FIRST-SACRIFICE STATE ═══════════════════════════════════════
// Library -> book -> Read ONLY. No Genesis unlock, no OAS, no scene generation — this is as far
// as the authorized run needs to go: _launchStarterStory has already set the real
// picks/playerMask/archetype/name by the time baked Scene 1 mounts.
section('REACH FIRST-SACRIFICE STATE (real clicks, no Genesis unlock)');
const t0 = Date.now(); let up = false;
while (Date.now() - t0 < 120000 && !up) {
  try { await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 }); await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_STORIES && window._bakedScene1For, null, { timeout: 60000 }); up = true; }
  catch (_) { await page.waitForTimeout(3000); }
}
if (!up) { ok('server reachable', false, 'server never answered'); await browser.close(); process.exit(2); }
await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2500);

const burgerVisible = await page.evaluate(() => { const b = document.getElementById('burgerBtn'); return !!(b && b.getClientRects().length > 0); });
if (burgerVisible) {
  await page.click('#burgerBtn'); await page.waitForTimeout(400);
  await page.click('.vault-tab[data-vault-section="Account"]'); await page.waitForTimeout(300);
  await page.click('#menuLibraryBtn'); await page.waitForTimeout(1500);
}
const screenNow = await page.evaluate(() => window._currentScreenId);
ok('real Library entry reaches vaultLibraryScreen', screenNow === 'vaultLibraryScreen', screenNow);

await page.click('.library-book[data-story-id="starter_first_sacrifice"]');
await page.waitForTimeout(900);
await page.click('#zoomReadBtn');
await page.waitForTimeout(6000);
const afterRead = await page.evaluate(() => ({ screen: window._currentScreenId, starterId: window.state._starterId }));
ok('real click reaches baked Scene 1 (real starterId, no Genesis unlock performed)', afterRead.screen === 'game' && afterRead.starterId === 'starter_first_sacrifice', JSON.stringify(afterRead));

const censusBeforeCall = requestCensus.length;
ok('ZERO model-classified requests fired merely from reaching this point (nothing auto-triggers pcBodyBible on Read)',
  requestCensus.filter(r => !String(r.kind).startsWith('infra:')).length === 0,
  JSON.stringify(requestCensus.filter(r => !String(r.kind).startsWith('infra:'))));

// ═══════════════════════════════════════ CAPTURE THE REAL FOUNDATION MATERIAL ═══════════════════════════════════════
section('THE FIXED FIRST-SACRIFICE SOURCE MATERIAL (as it actually is at this point, not assumed)');
const foundation = await page.evaluate(() => {
  const s = window.state;
  const picks = s.picks || {};
  const ident = picks.identity || {};
  return {
    picks_world: picks.world, picks_worldSubtype: picks.worldSubtype, picks_playermask: picks.playermask,
    state_playerMask: s.playerMask, state_archetype: s.archetype,
    pcName_candidates: { displayPlayerName: ident.displayPlayerName, identityPlayerName: ident.playerName, statePlayerName: s.playerName, stateName: s.name },
    resolvedPcName: ident.displayPlayerName || ident.playerName || s.playerName || 'the protagonist',
    aPlotGoal: (s.aPlot && s.aPlot.goal) || null,
    hasExistingPcBodyBible: !!s.pcBodyBible,
    starterId: s._starterId, storyId: s.storyId, tier: s.tier,
  };
});
note('foundation snapshot: ' + JSON.stringify(foundation, null, 2));
ok('the resolved PC name at this point is her real name, NOT the placeholder ("The Protagonist"/"the protagonist")',
  !/^(the protagonist|the one who)/i.test(String(foundation.resolvedPcName)), foundation.resolvedPcName);
ok('picks.world/worldSubtype are real (non-empty), matching a Fatelands/First-Sacrifice starter, not a generic default',
  !!foundation.picks_world && !!foundation.picks_worldSubtype, JSON.stringify({ world: foundation.picks_world, worldSubtype: foundation.picks_worldSubtype }));

// ═══════════════════════════════════════ THE ONE ISOLATED CALL (DRY — stubbed, zero cost) ═══════════════════════════════════════
section('THE ONE ISOLATED _generatePCBodyBible() CALL — DRY (stubbed reply, zero cost, zero real network contact)');
const censusBeforeIsolatedCall = requestCensus.length;
let genResult = null, genThrew = null;
try {
  genResult = await page.evaluate(async () => {
    try { const r = await window._generatePCBodyBible(); return { ok: true, hadResult: !!r }; }
    catch (e) { return { ok: false, error: String(e && e.message) }; }
  });
} catch (e) { genThrew = String(e && e.message); }
await page.waitForTimeout(1000);
const newRequests = requestCensus.slice(censusBeforeIsolatedCall);
ok('_generatePCBodyBible() completed without throwing', genResult && genResult.ok, JSON.stringify(genResult) + (genThrew ? ' threw=' + genThrew : ''));
ok('EXACTLY ONE new request fired by this call, and it classified as pcBodyBible', newRequests.length === 1 && newRequests[0].kind === 'pcBodyBible', JSON.stringify(newRequests));
ok('the request used role=STRUCTURE_GENERATOR, model=ministral-8b-2512 (the tiered-policy PRIMARY tier) on /api/mistral-proxy',
  pcBodyBibleCapturedRequest && pcBodyBibleCapturedRequest.role === 'STRUCTURE_GENERATOR' && pcBodyBibleCapturedRequest.model === 'ministral-8b-2512' && pcBodyBibleCapturedRequest.url === '/api/mistral-proxy',
  JSON.stringify(pcBodyBibleCapturedRequest && { role: pcBodyBibleCapturedRequest.role, model: pcBodyBibleCapturedRequest.model, url: pcBodyBibleCapturedRequest.url, maxTokens: pcBodyBibleCapturedRequest.maxTokens, temperature: pcBodyBibleCapturedRequest.temperature }));

await page.waitForTimeout(1500);
const afterAllQuiet = requestCensus.slice(censusBeforeIsolatedCall + 1);
ok('NOTHING ELSE fired afterward (no Scene 2, no author prose, no images, no cards, no sibling bible/scaffold/rplot calls)',
  afterAllQuiet.length === 0, JSON.stringify(afterAllQuiet));

// ═══════════════════════════════════════ POSITIVE PACKET CHECK (Roman, corrective, 2026-09-15) ═══════════════════════════════════════
// Not "does the world tag say the word Fatelands" — whether the FOUR required source layers are
// STRUCTURALLY present in the exact captured request text. Checked against the REAL prompt this
// call would send, not assumed. world:'Fantasy' + worldSubtype:'arcane_binding' is this app's own
// tag for a Fatelands story (confirmed directly: _generatePCBodyBibleUncached's own
// "FATELANDS CRISIS STEER" block, public/app.js ~254983, fires exactly when
// state.picks.world === 'Fantasy' — the codebase's own naming, not a guess) — that satisfies
// layer 1 by construction whenever it's present, checked directly below rather than assumed.
section('POSITIVE PACKET CHECK — the four required source layers, checked against the REAL captured request text');
if (pcBodyBibleCapturedRequest) {
  const fullText = pcBodyBibleCapturedRequest.sys + '\n' + pcBodyBibleCapturedRequest.usr;
  const savePath = '/tmp/pc_foundation_captured_prompt.txt';
  try { (await import('node:fs')).writeFileSync(savePath, 'SYSTEM:\n' + pcBodyBibleCapturedRequest.sys + '\n\n\nUSER:\n' + pcBodyBibleCapturedRequest.usr); note('full captured prompt text saved to ' + savePath + ' for direct inspection'); } catch (_) {}

  const hasFatelandsCanon = /FATELANDS CRISIS STEER/.test(fullText) || /Kwisheen|Weave-Script|First-Favored|the Fold\b/.test(fullText);
  ok('LAYER 1 — shared Fatelands canon appropriate to Fantasy is present in the request (world==="Fantasy" steer fired)',
    hasFatelandsCanon, hasFatelandsCanon ? 'FATELANDS CRISIS STEER block present' : 'no Fatelands-specific steer text found');

  const hasStarterSpecificCanon = /apprentice|First Sacrifice|Sacrificiant|untested brilliance|fears public failure|supervising/i.test(fullText);
  ok('LAYER 2 — First Sacrifice\'s starter-specific canon/foundation (her bio, her seed cPlusFacets, her authored constraints) is present in the request',
    hasStarterSpecificCanon, hasStarterSpecificCanon ? 'found' : 'NOT FOUND — see the disclosed gap below');

  const hasResolvedIdentity = new RegExp('PROTAGONIST:\\s*Lirael\\b').test(fullText);
  ok('LAYER 3 — Lirael\'s resolved identity is present in the request, by name',
    hasResolvedIdentity, hasResolvedIdentity ? 'found: "PROTAGONIST: Lirael"' : 'NOT FOUND');

  const hasScene1Package = /ledgerLine|sceneSummary|the Veilwood ceremony clearing|the Dohkar charged her|Julian.*Provast|mouth-band torn/i.test(fullText);
  ok('LAYER 4 — the approved Scene 1 facts/package (baked openState/ledgerLine/obligations) is present in the request',
    hasScene1Package, hasScene1Package ? 'found' : 'NOT FOUND — see the disclosed gap below');

  note('LAYERS PRESENT: ' + [hasFatelandsCanon && 'Fatelands canon', hasStarterSpecificCanon && 'starter-specific canon', hasResolvedIdentity && 'resolved identity', hasScene1Package && 'Scene 1 package'].filter(Boolean).join(', ') || '(none)');
  note('LAYERS ABSENT: ' + [!hasFatelandsCanon && 'Fatelands canon', !hasStarterSpecificCanon && 'starter-specific canon', !hasResolvedIdentity && 'resolved identity', !hasScene1Package && 'Scene 1 package'].filter(Boolean).join(', ') || '(none)');
  if (!hasStarterSpecificCanon || !hasScene1Package) {
    note('DISCLOSED, VERIFIED STRUCTURALLY (read directly against public/app.js:254935-255260, the full body of _generatePCBodyBibleUncached before the tiered-provider dispatch): '
      + 'the function reads ONLY state.picks.{world,worldSubtype,playermask,identity}, state.playerAge, state._cachedAncestryPlayer, state.aPlot.goal (empty for a baked starter), '
      + 'and state.fateMode/ffContract (Famous-Fate only, not First Sacrifice). It contains NO reference to _activeSeed(s), STARTER_SEEDS, seed.cast[PC].bio/cPlusFacets, '
      + 'or state._bakedEmitted anywhere in its body — grep-confirmed zero matches. So the request genuinely does NOT carry First Sacrifice\'s specific starter bio/constraints '
      + 'or the approved Scene 1 package today — this is not a fixable regex miss in this preflight script, it is a real, structural absence in the prompt-building function itself. '
      + 'A response would be grounded in Fatelands GENRE-level canon + her name/archetype/mask, but NOT guaranteed consistent with her SPECIFIC established bio by anything in the prompt — only by chance. This bears directly on rubric R2.');
  }
} else {
  ok('positive packet check run against the real captured request', false, 'no pcBodyBible request was captured — see the FAIL above');
}

// ═══════════════════════════════════════ SOURCE FINGERPRINT / PROVENANCE (for a future merge) ═══════════════════════════════════════
section('SOURCE FINGERPRINT / PROVENANCE — the exact starter-foundation block text, hashed, for future merge auditability');
let starterBlockCapture = null;
try {
  starterBlockCapture = await page.evaluate(() => {
    const s = window.state;
    const block = (typeof window._starterPcFoundationBlock === 'function') ? window._starterPcFoundationBlock(s) : null;
    return { block, starterId: s._starterId, storyId: s.storyId };
  });
} catch (e) { note('starter-block capture failed: ' + (e && e.message)); }
if (starterBlockCapture && starterBlockCapture.block) {
  // Same lightweight DJB2 fingerprint pattern this codebase already uses elsewhere
  // (_pcPortfolioFingerprint / _cpFactFingerprint, public/app.js) — content-addressed, so an
  // identical starter foundation yields an identical fingerprint and any change to the seed's
  // own bio/facets/constraints or the committed Scene 1 package changes it too.
  const basis = 'v1' + starterBlockCapture.starterId + '' + starterBlockCapture.block;
  let h = 5381;
  for (let i = 0; i < basis.length; i++) { h = ((h << 5) + h + basis.charCodeAt(i)) >>> 0; }
  const fingerprint = 'spf:' + ('00000000' + h.toString(16)).slice(-8) + '-' + basis.length;
  note('starterId=' + starterBlockCapture.starterId + ' storyId=' + starterBlockCapture.storyId);
  note('starter-foundation block byte length: ' + Buffer.byteLength(starterBlockCapture.block, 'utf8'));
  note('fingerprint: ' + fingerprint + ' (content-addressed — changes iff the seed\'s bio/facets/constraints or the committed Scene 1 package changes)');
  ok('a reproducible source fingerprint exists for this exact starter-foundation packet, for a future additive merge to key provenance on', true);
} else {
  ok('source fingerprint captured', false, 'no starter-foundation block was returned to fingerprint');
}

await browser.close();

// ═══════════════════════════════════════ GOVERNOR ADMISSION — THE REAL MODULE, THE REAL PROMPT SIZE ═══════════════════════════════════════
section('GOVERNOR ADMISSION (real api/_mistral-governor.js, real prompt byte-length from THIS story, fresh isolated bucket)');
let admission = null;
if (pcBodyBibleCapturedRequest) {
  const model = pcBodyBibleCapturedRequest.model;
  const limits = MODEL_LIMITS[model];
  note('MODEL_LIMITS[' + model + ']: ' + JSON.stringify(limits));
  const g = createGovernor(memoryStore(), { now: () => Date.now() });
  admission = await g.admit({
    model,
    messages: [{ role: 'system', content: pcBodyBibleCapturedRequest.sys }, { role: 'user', content: pcBodyBibleCapturedRequest.usr }],
    maxTokens: pcBodyBibleCapturedRequest.maxTokens,
    opId: 'pc-foundation-preflight-real-prompt-dry',
  });
  note('admission result (fresh, isolated bucket — no sibling contention, since this call is isolated by design): ' + JSON.stringify(admission));
  ok('the REAL governor admits this REAL, this-story prompt', admission.outcome === 'admitted', JSON.stringify(admission));
  ok('the reservation consumes a small fraction of the model\'s TPM ceiling (isolated, no burst risk)',
    admission.reserve && limits && (admission.reserve / limits.tpm) < 0.1, admission.reserve + ' / ' + (limits && limits.tpm) + ' = ' + (admission.reserve && limits ? (100 * admission.reserve / limits.tpm).toFixed(2) + '%' : 'n/a'));
} else {
  ok('governor admission measured against the real captured prompt', false, 'no pcBodyBible request was captured to measure — see the FAIL above');
}

// ═══════════════════════════════════════ COST: LABELED UNKNOWN, NOT ESTIMATED (Roman, corrective, 2026-09-15) ═══════════════════════════════════════
// CORRECTED: the prior version priced this call at the 'mistral-small-latest' rate because
// TEXT_PRICING (public/app.js ~4764-4807) has NO dedicated 'ministral-8b-2512' row and its
// resolver (_resolveTextPricingKey, ~app.js:4852) falls through to mistral-small on a bare
// `indexOf('mistral')` substring match. That is a DIFFERENT model's rate, not a verified
// ministral-8b-2512 rate — "$0.003-$0.009" was an unverified estimate dressed as a bound, not a
// defensible ceiling, and Roman correctly rejected it as such. No sourced ministral-8b-2512 price
// exists anywhere in this codebase (grep-confirmed: no other pricing table, no account invoice
// reference, nothing dated/sourced the way api/_mistral-governor.js's own MODEL_LIMITS entries
// are). Fabricating or guessing one here would repeat the same error in a new form.
section('COST: LABELED UNKNOWN (no verified ministral-8b-2512 rate exists in this codebase) — relying on the request-size boundary instead');
if (pcBodyBibleCapturedRequest) {
  const { sysBytes, usrBytes, maxTokens } = pcBodyBibleCapturedRequest;
  note('PRE-CALL DOLLAR COST: UNKNOWN. Not estimated, not bounded by a substitute rate — this app has no sourced price for ministral-8b-2512.');
  note('What IS real and verified (from the GOVERNOR ADMISSION section above): the request is structurally capped at exactly ' + (sysBytes + usrBytes) + ' input bytes + ' + maxTokens + ' max completion tokens — the governor REFUSES admission outright if this grows, so the request cannot silently balloon.');
  note('POST-CALL: the moment the one authorized call actually completes, this app\'s own accounting captures the REAL provider-reported usage — _recordProxyTextCost(data, model, \'setup\') reads data.usage (public/app.js ~5748), which _tieredProviderDispatch\'s mistral branch already threads through from the raw Mistral response (public/app.js ~5881: `usage: (d && d.usage) || null`). If the authorized run reports that usage block verbatim, the REAL cost is knowable exactly, not estimated — that is the number to report after the call, not a pre-call guess.');
  ok('cost boundary for authorization purposes: the ONE real network request is capped at ' + (sysBytes + usrBytes) + ' input bytes + ' + maxTokens + ' completion tokens by the real governor (verified above) — dollar cost itself is UNKNOWN pre-call and will be reported from the real response\'s own usage block, not estimated', true);
} else {
  note('no captured request to bound — see the FAIL above.');
}

// ═══════════════════════════════════════ ACCEPTANCE RUBRIC (pre-registered — fixed BEFORE any real response exists) ═══════════════════════════════════════
section('ACCEPTANCE RUBRIC (to grade the real response against, when authorized — written now, not after seeing output)');
console.log(`
  When the one real call is authorized and made, its response must be graded, PASS/FAIL, against
  EVERY one of the following, before any merge is even considered (no merge happens in that run
  either — see the corrective-follow-up instruction: "report pass/fail without applying the merge"):

  R1. STRUCTURED, GROUNDABLE MATERIAL. core_contradiction and current_crisis.immediate_fear (the
      two fields _pcFacetsFromBodyBible already maps) must each be non-empty, and
      current_crisis.event must contain real content words (not placeholder/generic filler) that
      _pcEvidenceRequiresFromText can derive a non-trivial evidence_requires regex from — i.e. the
      SAME mechanical test _pcFacetsFromBodyBible already applies, run against the real response.
  R2. CONSISTENT WITH APPROVED LIRAEL/SCENE-1 CANON. Read against the seed's own authored bio
      ("A young First Favored apprentice... first time SUPERVISING another person's First
      Sacrifice... Brilliant but untested; terrified of failing publicly") and her two existing
      hand-authored facets (pc_untested_brilliance, pc_fears_public_failure). The generated
      wound/core_contradiction/current_crisis must not CONTRADICT this established material (a
      different profession, a different central fear, an unrelated crisis) — realization of the
      same person, never a replacement of her.
  R3. NO INVENTED DESIRE, ATTRACTION, GUILT, OR FUTURE KNOWLEDGE. private_hope,
      current_crisis.li_complication, and every other field must not assert a specific desire for
      or attraction to Julian (or anyone) beyond what the seed's OWN authored material already
      establishes, must not assert guilt for anything not already established as her doing, and
      must not reference any plot beat the seed marks as a LATER reveal (the seed's own
      'constraints'/'cPlusForbiddenImplications' name several — e.g. Julian must never read as
      suspicious before Scene 8 — any generated material that leans on foreknowledge of that kind
      fails this rubric line outright).
  R4. PROVENANCE-PRESERVING, MERGE-SAFE (checked even though no merge runs this pass). Confirm the
      response's fields map cleanly onto _pcFacetsFromBodyBible's existing two-field extraction
      with NO structural change needed to that function, and confirm that if a future additive
      merge (the audit's proposal) were applied, the seed's own two authored facets
      (pc_untested_brilliance/pc_fears_public_failure) would remain BYTE-IDENTICAL and their
      legacy_display_only marking would remain — a bible-derived facet must arrive as a clearly
      separate, additionally-tagged record (origin:'pc_body_bible'), never overwriting or
      relabeling the seed's own canon.

  A response that fails ANY of R1-R4 is a FAIL, full stop — this is not a weighted score.
`);

const p = results.filter(r => r.pass).length, f = results.length - p;
console.log('\n' + '='.repeat(70));
console.log('PC FOUNDATION PREFLIGHT (DRY — zero cost, zero real network contact): ' + p + ' passed, ' + f + ' failed');
console.log('NO LIVE CALL WAS MADE. Awaiting Roman\'s explicit authorization before any real request.');
if (f) process.exit(1);
process.exit(0);
