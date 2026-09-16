// ═══ TIERED PROVIDER POLICY CONTROL (Roman/Claude 2026-09-13) ═══
// Proves the 4-role conversion (pcBodyBible / liBodyBible / rplot / scaffold -> _callTieredProvider)
// actually holds under real conditions: Mistral primary -> Grok fallback -> Claude/OpenAI terminal,
// telemetry-first, RPS-paced, no silent Grok-primary. Reuses the proven launch chain from
// _cg_oas_library_reload_proof.mjs / _baked_screen_probe.mjs (boot -> real Library entry -> real
// shelf-book click -> zoom -> Read -> baked Scene 1 mount -> the reader's own #bakedOASEnterBtn ->
// the reader's own #buGoBtn, which drives the REAL deferred handleBeginStory() pipeline — this is
// where pcBodyBible/liBodyBible/rplot/scaffold actually fire, evidenced by the app's own
// "[BAKED:GATE] Genesis unlocked" console log, which is only reached AFTER handleBeginStory()
// resolves). NO DOM forcing, no calling internal generator functions to skip a screen, no post-boot
// state repair. NEVER git commit/push/stash/checkout/reset. NEVER touch .env.local. NO paid model
// calls anywhere — every /api/** answered locally in every scenario below.
import { chromium } from 'playwright-core';
import fs from 'fs';
import { installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody } from './_test_session_env.mjs';
const F = await import('./_seed_fixtures.generated.mjs');

const rows = [];
const ok = (n, p, d) => { rows.push([n, !!p]); console.log((p ? 'PASS ' : 'FAIL ') + n + (p ? '' : '  — ' + String(d).slice(0, 900))); };
const note = (s) => console.log('  [NOTE] ' + s);

// UPDATED 2026-09-13 during the "no unknown outbound calls" investigation: the healthy scenario's
// FAIL surfaced 4 real, previously-uninventoried calls in the same Genesis-gate lifecycle window.
// Traced each to full content, not left as "the classifier didn't recognize them":
//   - 2x mistral-small-latest "You rewrite 5 body-tell fields..." — a PRE-EXISTING, already-Mistral
//     -routed reroll utility INSIDE _generatePCBodyBibleUncached (app.js ~254084), gated on a
//     billionaire-modern world/archetype combination this control's own fixture happens to hit.
//     Not a policy violation (never touched OpenAI/Claude) — given its own explicit classification
//     below rather than left unclassified.
//   - 2x gpt-4o-mini generation calls — "architect of WHY THIS PAIR" (_generatePairBond, a SIXTH
//     same-lifecycle generator, single caller ~257231) and "editorial auditor reviewing an R-plot"
//     (_auditRPlotShape, single caller ~257263, previously routed through the SHARED _auditPost
//     helper — left untouched, since it has 16 OTHER unrelated callers across the app; only this
//     one call site's own dispatch changed). Both were DIRECT, SILENT OpenAI primaries in this
//     lifecycle and have now been converted to _callTieredProvider exactly like the other four.
const TIERED_ROLES = ['pcBodyBible', 'liBodyBible', 'rplot', 'scaffold', 'antagonistBodyBible', 'pairBond', 'rplotAudit'];

function classifyModelCall(sys, usr) {
  if (/opening an intimate dialogue/.test(sys)) return 'oasDialogue';
  if (/uninhibited romance fiction author/.test(sys) && /TEMPTATION \|\|\|/.test(usr)) return 'fatePreviews';
  if (/screenplay-native cinematic-romance writer/.test(sys)) return 'cgScreenplay';
  if (/SCENE-SPINE planner/.test(sys) || /"hardBeats"/.test(sys)) return 'sceneSpine';
  if (/rewrite 5 body-tell fields for a romance heroine bible/.test(sys)) return 'pcBible_tellReroll_nonViolating';
  if (/rewrite the CURRENT CRISIS of a billionaire-world romance heroine/.test(sys)) return 'pcBible_crisisReroll_nonViolating';
  if (/architect of WHY THIS PAIR/.test(sys)) return 'pairBond';
  if (/editorial auditor reviewing an R-plot/.test(sys)) return 'rplotAudit';
  const hits = F.REQUEST_KINDS.filter(([, t]) => t(sys + '\n' + usr, sys, usr)).map(([k]) => k);
  return hits.length === 1 ? hits[0] : 'unclassified';
}

// The successful-content payload per kind, matching each generator's own parse expectations
// (markdown-fence-tolerant JSON.parse of a raw string). Identical fixtures to the proven harnesses.
function contentFor(kind, sys, usr) {
  if (kind === 'pcBodyBible') return JSON.stringify(F.PC_BIBLE);
  if (kind === 'liBodyBible') return JSON.stringify(F.LI_BIBLE);
  if (kind === 'rplot') return JSON.stringify({
    coreTension: 'she keeps seeing through him; he keeps dodging being seen',
    relationshipQuestion: 'Will she trust the wanting?', escalationAxis: 'visibility',
    issueRelationshipStates: ['she notices patterns in him', 'he redirects when she tries to name them'],
    issuePressures: ['her noticing becomes harder to dismiss', 'his deflections become more effortful'],
    relationshipMilestones: ['the first real look that she did not look away from'],
  });
  if (kind === 'scaffold') { const ref = (sys + usr).match(/subject_ref:\s*(\S+)/); return JSON.stringify(F.scaffoldReply(ref ? ref[1] : null, null)); }
  if (kind === 'aplotGenerator' || kind === 'aplotCorrection') return JSON.stringify(F.APLOT_VALID);
  if (kind === 'antagonistBodyBible') return JSON.stringify(F.ANTAGONIST_BIBLE);
  if (kind === 'pairBond') return JSON.stringify({ psychological_key_a: 'she is drawn to his stillness because it reads as safety she has never had', psychological_key_b: 'he is drawn to her volatility because it is the one honest thing in his world', erotic_register: 'control surrendered on purpose', why_this_pair: 'a peer with different psychology would not supply the specific safety/honesty exchange these two make' });
  if (kind === 'rplotAudit') return JSON.stringify({ fingerprint_strength: 'STRONG', fingerprint_reason: 'anchored on the specific archetype collision named in the R-plot', sequence_verdict: 'PASS', sequence_reason: 'escalation is visible issue over issue' });
  if (kind === 'planner') return F.plannerReply(usr, null);
  if (kind === 'author') return F.PROSE || '';
  if (kind === 'oasDialogue') return JSON.stringify({ li_dialogue: 'placeholder', li_action: 'placeholder', face_state: 'intent', scene_state: 'building', release_state: 'none' });
  if (kind === 'fatePreviews') return ['TEMPTATION ||| amplify ||| a ||| b', 'SILENCE ||| redirect ||| a ||| b', 'REVERSAL ||| amplify ||| a ||| b', 'BOUNDARY ||| amplify ||| a ||| b', 'CONFESSION ||| amplify ||| CONF-OPT-ACTION: a ||| CONF-OPT-LINE: b'].join('\n');
  return JSON.stringify(F.GENERIC);
}

// Shapes the STUB RESPONSE BODY the way each real endpoint actually answers — this is what
// _tieredProviderDispatch (public/app.js ~5866) parses:
//   mistral (/api/mistral-proxy) and grok (/api/proxy)  -> OpenAI-style choices[0].message.content
//   openai  (/api/chatgpt-proxy)                        -> a flat top-level `content` string
function shapeSuccess(pathname, text) {
  if (/\/api\/chatgpt-proxy\b/.test(pathname)) return { content: text, usage: { prompt_tokens: 100, completion_tokens: 100 }, _orchestration: { model: 'stub' } };
  return { id: 'ctrl', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: text } }], usage: { prompt_tokens: 100, completion_tokens: 100 } };
}

// Builds a Playwright route handler implementing ONE scenario's provider-tier failure policy.
//   failMistralFor: Set<kind>  — /api/mistral-proxy fails for these kinds
//   failMistralEmptyFor: Set<kind> — a SUBSET of failMistralFor that fails via EMPTY CONTENT
//                                    (200 OK, content:'') rather than HTTP 500 — the other failure
//                                    shape the spec requires at least one instance of.
//   failGrokFor: Set<kind>     — /api/proxy (Grok) fails for these kinds
function makeRouteHandler({ failMistralFor = new Set(), failMistralEmptyFor = new Set(), failGrokFor = new Set(), census }) {
  return async (route) => {
    const req = route.request();
    const url = req.url();
    const p = new URL(url).pathname;
    if (/\/api\/config\b/.test(url)) { census.push({ kind: 'config', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() }); }
    if (isAuthOrigin(url)) { census.push({ kind: 'auth-origin', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
    if (/\/api\/verify-subscription\b/.test(url)) { census.push({ kind: 'verify-subscription', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) }); }
    if (F.PASSTHROUGH.test(url)) { census.push({ kind: 'passthrough-continue', url: p }); return route.continue(); }
    if (F.LOCAL[p]) { census.push({ kind: 'local:' + p, url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(F.LOCAL[p]) }); }
    if (!F.MODEL.test(url)) { census.push({ kind: 'unmodeled-fallback', url: p, method: req.method() }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }

    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const flat = m => typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(x => x && x.text || '').join('\n') : '');
    const sys = (b.messages || []).filter(m => m.role === 'system').map(flat).join('\n');
    const usr = (b.messages || []).filter(m => m.role === 'user').map(flat).join('\n');
    const kind = classifyModelCall(sys, usr);
    const isMistral = /\/api\/mistral-proxy\b/.test(p);
    const isGrok = /\/api\/proxy\b/.test(p) && !/\/api\/(chatgpt|mistral|deepseek)-proxy\b/.test(p);
    const isOpenAI = /\/api\/chatgpt-proxy\b/.test(p);
    census.push({ kind, url: p, model: b.model || null, role: b.role || null, at: Date.now() });

    if (isMistral && failMistralFor.has(kind)) {
      if (failMistralEmptyFor.has(kind)) {
        // EMPTY-CONTENT failure shape: 200 OK, but no usable content — _callTieredProvider's own
        // post-dispatch check (`!result.content`) is what throws for this shape, not the dispatch.
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'ctrl', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: '' } }] }) });
      }
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'stub_induced_mistral_failure', kind }) });
    }
    if (isGrok && failGrokFor.has(kind)) {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'stub_induced_grok_failure', kind }) });
    }
    const text = contentFor(kind, sys, usr);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(shapeSuccess(p, text)) });
  };
}

async function dismissPcLookModalIfOpen(page) {
  for (let i = 0; i < 10; i++) {
    const st = await page.evaluate(() => ({
      pcOpen: (() => { const m = document.getElementById('pcLookModal'); return !!(m && !m.classList.contains('hidden') && m.getClientRects().length > 0); })(),
      liOpen: (() => { const m = document.getElementById('liRenderModal'); return !!(m && !m.classList.contains('hidden') && m.getClientRects().length > 0); })(),
      warnOpen: !!document.getElementById('skipRenderWarnModal'),
    }));
    if (!st.pcOpen && !st.liOpen && !st.warnOpen) break;
    if (st.warnOpen) { try { await page.click('#skipRenderWarnModal [data-act="skip"]', { timeout: 5000 }); } catch (_) {} }
    else if (st.pcOpen) { try { await page.click('#pcLookSkipBtn', { timeout: 5000 }); } catch (_) {} }
    else if (st.liOpen) { try { await page.click('#liRenderSkipBtn', { timeout: 5000 }); } catch (_) {} }
    await page.waitForTimeout(400);
  }
}

// Runs the real, click-driven journey up through the Genesis charge (which drives the REAL
// deferred handleBeginStory() pipeline — pcBodyBible/liBodyBible/rplot/scaffold all fire inside
// it) under ONE scenario's route-stub policy. Returns {ok, unlocked, census, tierLog, consoleLines}.
async function runScenario(label, routeConfig) {
  console.log('\n═══ SCENARIO: ' + label + ' ═══');
  const census = [];
  const consoleLines = [];
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  page.on('console', m => consoleLines.push(m.text()));
  await page.addInitScript(() => { window._bibleDupeTrace = true; });
  await installSession(page);
  await page.route('**/sb-test.localhost/**', route => {
    const req = route.request();
    const accept = req.headers()['accept'] || '';
    const single = /vnd\.pgrst\.object\+json/.test(accept);
    return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
  });
  await installEntitledProfileStub(page);
  await page.route('**/api/**', makeRouteHandler({ ...routeConfig, census }));

  // ── BOOT ──
  const t0 = Date.now(); let up = false;
  while (Date.now() - t0 < 120000 && !up) {
    try {
      await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
      await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_STORIES && window._bakedScene1For, null, { timeout: 60000 });
      up = true;
    } catch (_) { await page.waitForTimeout(3000); }
  }
  if (!up) { ok(label + ': server never became ready', false, ''); await browser.close(); return { ok: false, unlocked: false, census, tierLog: [], consoleLines }; }
  await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);
  // TIER 0 (Roman 2026-09-16, third pass): PAIR_BOND, R_PLOT, and (transitively, since it only
  // fires after a successful R-plot) rplotAudit are now ALL suppressed pre-page for a Tier-0-
  // eligible First Sacrifice launch — on top of the PC/LI bibles already neutralized here before.
  // This mechanism (the real, unmodified _generatePairBond/_ensureRPlot/_auditWoundLIIntegration/
  // etc.) is exactly what THIS file exists to exercise via the generic tiered-provider dispatch —
  // not Tier 0 itself (dedicated Tier 0 coverage lives in _tier0_seeded_first_page_control.mjs /
  // _tier0_li_cg_editor_defer_control.mjs and their live-wiring-proof siblings). Neutralized here,
  // UNIVERSALLY for every scenario (not just coalescing), by clearing the seed's own PC AND LI
  // cPlusFacets — the real, unmodified gate every Tier-0 adapter/suppression checks
  // (_pcFoundationSourceFacts/_liFoundationSourceFacts return null with no facets) — so this
  // story is no longer Tier-0-eligible and every role under test reaches the real tiered-provider
  // dispatch exactly as it did before Tier 0 existed. window.STARTER_SEEDS IS the same object the
  // app's closured STARTER_SEEDS variable points to (app.js ~126971), so this mutation genuinely
  // reaches the real functions; app.js itself is untouched.
  await page.evaluate(() => {
    try {
      var seed = window.STARTER_SEEDS && window.STARTER_SEEDS.starter_first_sacrifice;
      var pcCast = seed && Array.isArray(seed.cast) && seed.cast.filter(function (c) { return c && c.role === 'PC'; })[0];
      if (pcCast) pcCast.cPlusFacets = [];
      var liCast = seed && Array.isArray(seed.cast) && seed.cast.filter(function (c) { return c && c.role === 'LI'; })[0];
      if (liCast) liCast.cPlusFacets = [];
    } catch (_) {}
  });

  // ── REAL LIBRARY ENTRY (mirrors _cg_oas_library_reload_proof.mjs STEP2) ──
  const burgerVisible = await page.evaluate(() => { const b = document.getElementById('burgerBtn'); return !!(b && b.getClientRects().length > 0); });
  if (burgerVisible) {
    await page.click('#burgerBtn'); await page.waitForTimeout(400);
    await page.click('.vault-tab[data-vault-section="Account"]'); await page.waitForTimeout(300);
    await page.click('#menuLibraryBtn'); await page.waitForTimeout(1200);
  }
  const bookInfo = await page.evaluate(() => {
    const el = document.querySelector('.library-book[data-story-id="starter_first_sacrifice"]');
    return el ? { found: true, rectN: el.getClientRects().length } : { found: false };
  });
  if (!(bookInfo.found && bookInfo.rectN > 0)) { ok(label + ': shelf book visible', false, JSON.stringify(bookInfo)); await browser.close(); return { ok: false, unlocked: false, census, tierLog: [], consoleLines }; }

  // ── SHELF CLICK -> ZOOM -> READ -> BAKED SCENE 1 MOUNT ──
  await page.click('.library-book[data-story-id="starter_first_sacrifice"]');
  await page.waitForTimeout(800);
  await page.click('#zoomReadBtn');
  await page.waitForTimeout(4000);
  const oasBtnVisible = await page.evaluate(() => !!document.getElementById('bakedOASEnterBtn') && document.getElementById('bakedOASEnterBtn').getClientRects().length > 0);
  if (!oasBtnVisible) { ok(label + ': one-on-one entry button visible after baked mount', false, ''); await browser.close(); return { ok: false, unlocked: false, census, tierLog: [], consoleLines }; }

  // ── THE READER'S OWN GENESIS GATE: click bakedOASEnterBtn -> #buGoBtn. THIS click drives the
  // real deferred handleBeginStory() setup-only pipeline that fires pcBodyBible/liBodyBible/
  // rplot/scaffold — no forcing, no direct function calls. ──
  await page.click('#bakedOASEnterBtn');
  await page.waitForTimeout(1000);
  const goBtnVisible = await page.evaluate(() => { const el = document.getElementById('buGoBtn'); return !!(el && el.getClientRects().length > 0); });
  if (!goBtnVisible) { ok(label + ': Genesis gate #buGoBtn visible', false, ''); await browser.close(); return { ok: false, unlocked: false, census, tierLog: [], consoleLines }; }
  await page.click('#buGoBtn');
  let unlocked = false;
  for (let i = 0; i < 240 && !unlocked; i++) { await page.waitForTimeout(1000); unlocked = consoleLines.some(l => /\[BAKED:GATE\] Genesis unlocked/.test(l)); }
  await dismissPcLookModalIfOpen(page);

  const tierLog = await page.evaluate(() => window._providerTierLog || []);
  await browser.close();
  ok(label + ': Genesis charge completes (handleBeginStory pipeline ran to completion) — "[BAKED:GATE] Genesis unlocked"', unlocked,
    unlocked ? '' : 'timed out after 4 min; last 30 console lines: ' + JSON.stringify(consoleLines.slice(-30)));
  return { ok: unlocked, unlocked, census, tierLog, consoleLines };
}

// ═══════════════════════════════════════════════════════ 1. HEALTHY CASE ═══════════════════════════════════════════════════════
const healthy = await runScenario('1-healthy', { failMistralFor: new Set(), failGrokFor: new Set() });
console.log('  [BIBLE-DUPE-TRACE evidence, healthy scenario, REAL fixture content]\n' + healthy.consoleLines.filter(l => l.indexOf('[BIBLE-DUPE-TRACE]') === 0).join('\n'));
{
  const tl = healthy.tierLog.filter(r => TIERED_ROLES.includes(r.role));
  const byRole = {};
  for (const r of TIERED_ROLES) byRole[r] = tl.filter(x => x.role === r);
  // Some roles (antagonistBodyBible, and potentially others) are SELF-GATED on story-specific
  // conditions (a named Shape-A/B antagonist, etc.) and legitimately do not fire for every story —
  // that is correct, pre-existing behavior, not a policy question. The policy question is: for
  // whichever roles DID fire, did they fire via Mistral, exactly once, never twice. A role with
  // zero attempts is reported separately (not silently assumed fine) so a role that SHOULD fire
  // but doesn't (a real regression) is still visible.
  const firedRoles = TIERED_ROLES.filter(r => byRole[r].length > 0);
  const notFiredRoles = TIERED_ROLES.filter(r => byRole[r].length === 0);
  const oneEachMistral = firedRoles.every(r => byRole[r].length === 1 && byRole[r][0].tier === 'primary' && byRole[r][0].provider === 'mistral' && byRole[r][0].attempt === 1 && byRole[r][0].fallbackReason === null);
  const zeroGrok = tl.every(x => x.provider !== 'grok');
  const zeroOpenAI = tl.every(x => x.provider !== 'openai');
  ok('HEALTHY: every role that fired did so via exactly ONE Mistral attempt (' + firedRoles.length + '/' + TIERED_ROLES.length + ' fired: ' + firedRoles.join(',') + '; self-gated/not-fired this run: ' + (notFiredRoles.join(',') || 'none') + '), ZERO Grok, ZERO Claude/OpenAI — per window._providerTierLog', oneEachMistral && zeroGrok && zeroOpenAI,
    JSON.stringify({ byRole: Object.fromEntries(Object.entries(byRole).map(([k, v]) => [k, v.map(x => ({ tier: x.tier, provider: x.provider, attempt: x.attempt, fallbackReason: x.fallbackReason }))])) }));
  console.log('  [HEALTHY _providerTierLog] ' + JSON.stringify(tl.map(x => ({ role: x.role, tier: x.tier, provider: x.provider, model: x.model, attempt: x.attempt }))));
  // Cross-check against the independent request census (route-handler arrival order) — not just the
  // page's own log, per the spec's "don't infer it from request counts alone" + independent proof.
  const censusByRole = {};
  for (const r of TIERED_ROLES) censusByRole[r] = healthy.census.filter(x => x.kind === r);
  const censusAllMistral = firedRoles.every(r => censusByRole[r].length === 1 && /\/api\/mistral-proxy\b/.test(censusByRole[r][0].url));
  ok('HEALTHY: independent request census agrees — every role that fired hit /api/mistral-proxy exactly once', censusAllMistral,
    JSON.stringify(Object.fromEntries(Object.entries(censusByRole).map(([k, v]) => [k, v.map(x => x.url)]))));
}

// ═══════════════════════════════════════════════════════ 2. MISTRAL FAILURE ═══════════════════════════════════════════════════════
// pairBond fails via EMPTY CONTENT (200 OK, content:''); the other roles via HTTP 500 — covers
// both failure shapes the spec calls out ("HTTP 500, or empty content — test at least one").
// EMPTY-CONTENT EXAMPLE ROLE CHANGED FROM pcBodyBible TO liBodyBible (2026-09-16) TO pairBond
// (2026-09-16, second pass): pcBodyBible AND liBodyBible are no longer valid examples for First
// Sacrifice — TIER 0 — SEEDED FIRST PAGE now derives BOTH locally (zero live calls) for this
// sufficiently-seeded fixed starter, so neither reaches Mistral to demonstrate ANY failure shape
// here. The mechanism under test (_callTieredProvider's own post-dispatch `!result.content`
// empty-content check) is generic across every TIERED_ROLES entry, not bible-specific, so
// pairBond (unaffected — explicitly OUT of Tier 0's pre-page scope; still a live call after both
// bibles commit) demonstrates the identical shape without weakening this scenario's intent.
const mistralFail = await runScenario('2-mistral-fail', {
  failMistralFor: new Set(TIERED_ROLES),
  failMistralEmptyFor: new Set(['pairBond']),
  failGrokFor: new Set(),
});
{
  const tl = mistralFail.tierLog.filter(r => TIERED_ROLES.includes(r.role));
  const byRole = {};
  for (const r of TIERED_ROLES) byRole[r] = tl.filter(x => x.role === r).sort((a, b) => a.attempt - b.attempt);
  const shapeOk = TIERED_ROLES.every(r => {
    const v = byRole[r];
    if (v.length === 0) return true;   // self-gated this run — not a policy failure, see HEALTHY note above
    if (v.length !== 2) return false;
    const [a1, a2] = v;
    return a1.tier === 'primary' && a1.provider === 'mistral' && a1.attempt === 1 && a1.fallbackReason === null
      && a2.tier === 'fallback' && a2.provider === 'grok' && a2.attempt === 2
      && !!a2.fallbackReason && a2.fallbackReason !== 'null' && !/^unknown$/i.test(a2.fallbackReason);
  });
  const zeroOpenAI = tl.every(x => x.provider !== 'openai');
  ok('MISTRAL-FAIL: exactly ONE Grok attempt per role fires next (attempt=2), fallbackReason names the Mistral failure (not null/generic), Claude/OpenAI NEVER reached', shapeOk && zeroOpenAI,
    JSON.stringify(Object.fromEntries(Object.entries(byRole).map(([k, v]) => [k, v.map(x => ({ tier: x.tier, provider: x.provider, attempt: x.attempt, fallbackReason: x.fallbackReason }))]))));
  console.log('  [MISTRAL-FAIL _providerTierLog] ' + JSON.stringify(tl.map(x => ({ role: x.role, tier: x.tier, provider: x.provider, attempt: x.attempt, fallbackReason: x.fallbackReason }))));
  // Confirm the empty-content role's fallbackReason specifically names "empty content", and the
  // HTTP-500 roles' fallbackReason specifically names the HTTP status — two distinct failure shapes.
  const pairBondReason = (byRole.pairBond[1] || {}).fallbackReason || '';
  const scaffoldReason = (byRole.scaffold[1] || {}).fallbackReason || '';
  ok('MISTRAL-FAIL: the two induced failure SHAPES are both evidenced in fallbackReason text — empty content (pairBond) vs HTTP 500 (scaffold)',
    /empty content/i.test(pairBondReason) && /HTTP 500/.test(scaffoldReason),
    JSON.stringify({ pairBondReason, scaffoldReason }));
}

// ═══════════════════════════════════════════════════════ 3. MISTRAL + GROK FAILURE ═══════════════════════════════════════════════════════
const bothFail = await runScenario('3-mistral-and-grok-fail', {
  failMistralFor: new Set(TIERED_ROLES),
  failGrokFor: new Set(TIERED_ROLES),
});
{
  const tl = bothFail.tierLog.filter(r => TIERED_ROLES.includes(r.role));
  const byRole = {};
  for (const r of TIERED_ROLES) byRole[r] = tl.filter(x => x.role === r).sort((a, b) => a.attempt - b.attempt);
  const shapeOk = TIERED_ROLES.every(r => {
    const v = byRole[r];
    if (v.length === 0) return true;   // self-gated this run — not a policy failure
    if (v.length !== 3) return false;
    const [a1, a2, a3] = v;
    const attemptsInOrder = a1.attempt === 1 && a2.attempt === 2 && a3.attempt === 3;
    const timesMonotonic = a1.at <= a2.at && a2.at <= a3.at;
    return a1.tier === 'primary' && a1.provider === 'mistral' && a1.fallbackReason === null
      && a2.tier === 'fallback' && a2.provider === 'grok' && !!a2.fallbackReason
      && a3.tier === 'terminal' && a3.provider === 'openai' && !!a3.fallbackReason
      && attemptsInOrder && timesMonotonic;
  });
  ok('MISTRAL+GROK-FAIL: the terminal Claude/OpenAI tier is reached, with its own fallbackReason, ONLY after both prior tiers were genuinely attempted — attempts 1,2,3 in order, timestamps monotonic (not raced, not skipped)', shapeOk,
    JSON.stringify(Object.fromEntries(Object.entries(byRole).map(([k, v]) => [k, v.map(x => ({ tier: x.tier, provider: x.provider, attempt: x.attempt, fallbackReason: x.fallbackReason, at: x.at }))]))));
  console.log('  [BOTH-FAIL _providerTierLog] ' + JSON.stringify(tl.map(x => ({ role: x.role, tier: x.tier, provider: x.provider, attempt: x.attempt, fallbackReason: (x.fallbackReason || '').slice(0, 80) }))));
  // Independent census cross-check: for each role, the THIRD request (arrival order) hit chatgpt-proxy.
  const censusByRole = {};
  for (const r of TIERED_ROLES) censusByRole[r] = bothFail.census.filter(x => x.kind === r);
  const censusOk = TIERED_ROLES.every(r => {
    const v = censusByRole[r];
    if (v.length === 0) return true;   // self-gated this run
    return v.length === 3 && /mistral-proxy/.test(v[0].url) && /\/api\/proxy\b/.test(v[1].url) && /chatgpt-proxy/.test(v[2].url);
  });
  ok('MISTRAL+GROK-FAIL: independent request census agrees — arrival order per role is mistral-proxy, then /api/proxy (grok), then chatgpt-proxy', censusOk,
    JSON.stringify(Object.fromEntries(Object.entries(censusByRole).map(([k, v]) => [k, v.map(x => x.url)]))));
}

// ═══════════════════════════════════════════════════════ 4. NO UNKNOWN GENERATIVE-PROVIDER CALLS ═══════════════════════════════════════════════════════
// Scope, precisely (Roman 2026-09-13): "no unknown GENERATIVE-PROVIDER calls" — the LLM proxy
// endpoints (mistral/grok/openai/deepseek/gemini/anthropic). Background, non-generative traffic
// (image rendering, bug-report telemetry, etc.) that this control doesn't stub in detail is
// EXPECTED noise from the real app running end-to-end — it is not a provider-policy question and
// is explicitly NOT flagged here (that would be excluding-by-endpoint's exact opposite mistake:
// over-flagging unrelated traffic instead of under-flagging generative calls). Every LLM-shaped
// request, whichever endpoint it hit, MUST resolve to a real, named classification — "unclassified"
// or "unmodeled-fallback" on an LLM endpoint is the actual failure mode being guarded against here.
const LLM_ENDPOINT_RX = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini|anthropic-proxy)\b/;
{
  const allRuns = [['healthy', healthy], ['mistral-fail', mistralFail], ['both-fail', bothFail]];
  let allAccounted = true; const offenders = [];
  for (const [label, run] of allRuns) {
    for (const rec of run.census) {
      if (!LLM_ENDPOINT_RX.test(rec.url)) continue;   // non-generative traffic (image/telemetry/etc.) — out of this assertion's scope, not silently "passed" either, just not what this checks
      if (!rec.kind || rec.kind === 'unclassified' || rec.kind === 'other' || rec.kind === 'unmodeled-fallback') { allAccounted = false; offenders.push({ label, ...rec }); }
    }
  }
  ok('NO-UNKNOWN-GENERATIVE-PROVIDER-CALLS: every LLM-endpoint request across all three scenarios resolves to a named, real classification — none unclassified on a generative-provider endpoint', allAccounted, JSON.stringify(offenders.slice(0, 20)));
}

// ═══════════════════════════════════════════════════════ 5. CONCURRENT COALESCING ═══════════════════════════════════════════════════════
// Lighter-weight: boot, launch the starter for FREE (no Genesis charge needed — _generatePCBodyBible/
// _generateLIBodyBible are called directly, exactly as production's own P2 awaiter does, just twice
// concurrently), and prove _bodyBibleOnce's existing in-flight dedup still coalesces the two callers
// into ONE real network attempt now that the dispatch underneath it is tiered.
async function runCoalescingScenario() {
  console.log('\n═══ SCENARIO: 5-coalescing ═══');
  const census = [];
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  await installSession(page);
  await page.route('**/sb-test.localhost/**', route => {
    const req = route.request();
    const accept = req.headers()['accept'] || '';
    return route.fulfill({ status: 200, contentType: 'application/json', body: /vnd\.pgrst\.object\+json/.test(accept) ? 'null' : '[]' });
  });
  await installEntitledProfileStub(page);
  await page.route('**/api/**', makeRouteHandler({ failMistralFor: new Set(), failGrokFor: new Set(), census }));
  const t0 = Date.now(); let up = false;
  while (Date.now() - t0 < 120000 && !up) {
    try {
      await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
      await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_STORIES, null, { timeout: 60000 });
      up = true;
    } catch (_) { await page.waitForTimeout(3000); }
  }
  if (!up) { ok('COALESCING: server ready', false, ''); await browser.close(); return; }
  await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // Launch the starter for FREE (mounts the baked scene, populates state.picks/playerName/etc — the
  // same population step the real Genesis flow relies on) — NOT a paid action.
  await page.evaluate(() => {
    const list = Array.isArray(window.STARTER_STORIES) ? window.STARTER_STORIES : Object.values(window.STARTER_STORIES || {});
    const def = list.find(d => d && d.id === 'starter_first_sacrifice');
    window._launchStarterStory(def);
    // TIER 0 — SEEDED FIRST PAGE (Roman, 2026-09-16) intentionally short-circuits
    // _generatePCBodyBible() BEFORE any live call for a sufficiently-seeded fixed starter like
    // First Sacrifice — which this file's pcBodyBible coalescing scenario needs to NOT happen,
    // since it tests the live-path coalescing machinery itself, not Tier 0 (dedicated coverage:
    // _tier0_seeded_first_page_control.mjs / _tier0_seeded_first_page_live_wiring_proof.mjs).
    // Neutralized by clearing the SEED's own PC AND LI cPlusFacets (the real, unmodified gates
    // _tier0PcBibleFromSeed / _tier0LiBibleFromSeed check) — window.STARTER_SEEDS IS the same
    // object the app's closured STARTER_SEEDS variable points to (app.js ~127293), so this
    // mutation genuinely reaches the real functions; app.js itself is untouched. UPDATED
    // 2026-09-16 (Tier 0 second pass): a partial LI adapter now exists too (Roman required it —
    // pcBodyBible-only was rejected as "not yet Tier 0"), so liBodyBible coalescing needs the
    // same neutralization PC already had, not the "no LI adapter exists" assumption this comment
    // used to state.
    try {
      var seed = window.STARTER_SEEDS && window.STARTER_SEEDS.starter_first_sacrifice;
      var pcCast = seed && Array.isArray(seed.cast) && seed.cast.filter(function (c) { return c && c.role === 'PC'; })[0];
      if (pcCast) pcCast.cPlusFacets = [];
      var liCast = seed && Array.isArray(seed.cast) && seed.cast.filter(function (c) { return c && c.role === 'LI'; })[0];
      if (liCast) liCast.cPlusFacets = [];
    } catch (_) {}
  });
  await page.waitForTimeout(2000);

  const pcResult = await page.evaluate(async () => {
    const before = (window._providerTierLog || []).length;
    const [a, b] = await Promise.all([window._generatePCBodyBible(), window._generatePCBodyBible()]);
    const after = (window._providerTierLog || []).filter(r => r.role === 'pcBodyBible');
    return { sameObject: a === b, bothTruthy: !!a && !!b, attempts: after.length, log: after.map(x => ({ tier: x.tier, provider: x.provider, attempt: x.attempt })) };
  });
  ok('COALESCING (pcBodyBible): two concurrent callers of window._generatePCBodyBible() produce exactly ONE real network attempt at the outbound boundary (per window._providerTierLog), and both callers resolve to the same object', pcResult.attempts === 1 && pcResult.sameObject && pcResult.bothTruthy, JSON.stringify(pcResult));

  const liResult = await page.evaluate(async () => {
    const [a, b] = await Promise.all([window._generateLIBodyBible(), window._generateLIBodyBible()]);
    const after = (window._providerTierLog || []).filter(r => r.role === 'liBodyBible');
    return { sameObject: a === b, bothTruthy: !!a && !!b, attempts: after.length, log: after.map(x => ({ tier: x.tier, provider: x.provider, attempt: x.attempt })) };
  });
  ok('COALESCING (liBodyBible): two concurrent callers of window._generateLIBodyBible() produce exactly ONE real network attempt at the outbound boundary, and both callers resolve to the same object', liResult.attempts === 1 && liResult.sameObject && liResult.bothTruthy, JSON.stringify(liResult));

  const censusCounts = { pcBodyBible: census.filter(r => r.kind === 'pcBodyBible').length, liBodyBible: census.filter(r => r.kind === 'liBodyBible').length };
  ok('COALESCING: independent request census agrees — exactly one /api/mistral-proxy request per bible reached the route handler', censusCounts.pcBodyBible === 1 && censusCounts.liBodyBible === 1, JSON.stringify(censusCounts));

  await browser.close();
}
await runCoalescingScenario();

// ═══════════════════════════════════════════════════════ SUMMARY ═══════════════════════════════════════════════════════
fs.mkdirSync('_validate_out', { recursive: true });
fs.writeFileSync('_validate_out/tiered_provider_policy_control.rows.json', JSON.stringify(rows, null, 1));
const f = rows.filter(r => !r[1]).length;
console.log(`\nTIERED PROVIDER POLICY CONTROL: ${rows.length} rows · ${rows.length - f} passed · ${f} failed`);
process.exit(f ? 1 : 0);
