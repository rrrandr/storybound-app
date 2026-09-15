// ═══ PC FOUNDATION — REAL-PATH, OUTBOUND-STUBBED, END-TO-END INTEGRATION PROOF (Roman, 2026-09-15) ═══
//
// Roman's own words: "the 37 [now 43] validator checks use synthetic state, while the actual
// fixed-starter route, persistence, and later portfolio consumption still need one fully stubbed
// end-to-end test." This is that test. Every /api/** route is answered locally — including the
// pcBodyBible-classified one — so this script makes ZERO real network/provider contact and spends
// nothing. It is NOT _pc_foundation_live_sample.mjs (which is the only file authorized to ever make
// a real call, and only when Roman explicitly says so — this script never touches that file and
// never flips any stub to live).
//
// TWO SCENARIOS, ONE FILE, EACH ON ITS OWN FRESH BROWSER CONTEXT:
//   GREEN — a fully-cited, source-supported PC Body Bible (copied from
//     _pc_foundation_output_validator_control.mjs's own fullyCoveredGreenBible() fixture, verified
//     by direct grep against public/app.js's real STARTER_SEEDS.starter_first_sacrifice AND
//     public/starter-scenes.js's real baked openState/obligations text to confirm every citation is
//     a real, exact substring of REAL shipped content, not the offline control's synthetic
//     approximation of it) is returned at the stubbed provider boundary. Proves: real route ->
//     real validation pass -> real atomic commit to real window.state -> survives a real
//     Save & Exit -> reload -> Continue cycle -> and checks (with real captured payload evidence,
//     not inference) whether the committed portfolio reaches the real CG author payload for First
//     Sacrifice's Scene 2 (First Sacrifice is CG/gnReader-hosted; its "author" request IS the
//     cgScreenplay-classified completion call — there is no separate literary STORYBOUND
//     ARCHITECTURE LAWS request in this starter's real flow, confirmed directly against
//     _pc_cplus_cg_live_proof.mjs's own already-proven real-click chain, which this file reuses).
//   RED — the ACTUAL retained failed live sample
//     (_audit_out/pc_foundation_samples/2026-09-15_live_sample_01_FAILED.json's own parsedBible) is
//     replayed through the IDENTICAL real route. Proves: named rejection, zero portfolio mutation,
//     zero partial persistence across a real reload, and zero rejected-field leakage into the real
//     CG author payload.
//
// A KNOWN, PRE-CONFIRMED STRUCTURAL GAP THIS PROOF EXISTS PARTLY TO MAKE EMPIRICAL (Roman's item 4)
// — confirmed by direct source read before writing this file, restated here as a pre-registered
// expectation, not discovered after the fact: _facetIndex (public/app.js ~134385) merges exactly
// four providers — 'seed' -> _seedFacetIndex, 'generated_cast' -> _generatedCastFacetIndex,
// 'relationship' -> {} (dead), 'emergent' -> {} (dead). Grep-confirmed: NEITHER _seedFacetIndex NOR
// _generatedCastFacetIndex, nor anything else in public/app.js outside _ensurePcPortfolio /
// _commitValidatedPcFoundation themselves, ever reads state._pcPortfolio.facets. CG's own delivered-
// assignment path (_cgMintDeliveredAssignments -> _cpContinuationAssignment -> _facetIndex, same
// function, same four providers) shares this exact gap — so the SAME absence applies to both the
// literary and CG continuation paths, by construction, not by two separate defects. This script
// EXPECTS to observe zero delivery and reports that as a named blocker with real payload evidence,
// not as a proof failure.
//
// NEVER: git commit/push/stash/checkout/reset. NEVER touch .env.local. NO paid model calls — every
// /api/** answered locally, including pcBodyBible/bodyTellReroll. NEVER edit public/app.js or any
// existing proof/control file. No DOM forcing; direct calls are used ONLY for the same backend
// entry points this repo's own proven proofs already call directly (window._generatePCBodyBible,
// window._validatePcFoundationOutput, window._commitValidatedPcFoundation, window._pcFoundationSourceFacts,
// window._acceptStageProposal, window._facetIndex, window._resolveFacetIndexEntry) — every UI
// transition (Library, book, Read, Genesis unlock, OAS dialogue, interruption card, Save & Exit,
// reload, Continue, cgScreenplay Submit) is a real click.
//
// usage: node _pc_foundation_real_path_integration_proof.mjs   (dev server on :3000)

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import {
  installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody,
} from './_test_session_env.mjs';
const F = await import('./_seed_fixtures.generated.mjs');

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 600) : '')); };
const note = (s) => console.log('  [NOTE] ' + s);
const section = (t) => console.log('\n=== ' + t + ' ===');

// ── THE GREEN BIBLE — copied verbatim from _pc_foundation_output_validator_control.mjs's own
// fullyCoveredGreenBible(), then independently verified (2026-09-15, by direct grep of
// public/app.js STARTER_SEEDS.starter_first_sacrifice + public/starter-scenes.js's real baked
// openState/obligations text) to confirm every `cites` string below is a REAL, EXACT substring of
// what the REAL app will expose through window._pcFoundationSourceFacts(window.state) once the
// real click chain reaches baked Scene 1 — not re-derived from the offline control's synthetic
// baseState()/FIRST_SACRIFICE_SEED, which is intentionally a shorter approximation of the real
// seed for OFFLINE use only. This script asserts that live-parity directly (see the SOURCE-PARITY
// section below) before ever calling _generatePCBodyBible(), rather than assuming it. ──
function greenBible() {
  return {
    // ── NON-DURABLE FIELDS — required by _generatePCBodyBibleUncached's OWN internal sanity
    // gate (public/app.js ~255862: "at least signature_feature + one tell must be populated", or
    // the whole response is discarded and window.state.pcBodyBible is never set) — NOT part of
    // this task's 8 durable/provenance fields, so content here is uncontroversial physical/
    // behavioral description, shaped like the app's own PC_BIBLE fixture
    // (_seed_fixtures.generated.mjs), never touching wound/contradiction/crisis territory.
    height: 'five foot six', build: 'lean, quick on her feet from years of ritual footwork',
    hair: 'dark auburn, worn braided back for the rite', complexion: 'warm olive, windburned at the cheekbones',
    face: 'a face that reads steady even when she is not', signature_feature: 'a small, pale scar through one eyebrow from a childhood fall',
    visual_anchor: { focus: 'hands', detail: 'her hands stay precisely still around The Answer while everything else about her is tense' },
    second_celebrated_feature: 'the exact, economical way she moves through a ritual space',
    stress_tic: 'she counts her own pulse against her thumb without meaning to',
    desire_tell: 'she goes very quiet and watches hands instead of faces',
    impatience_tell: 'her jaw sets half a second before she speaks',
    confidence_tell: 'she stops qualifying her own sentences',
    vulnerability_tell: 'she holds an object slightly too tightly, knuckles pale',
    emotional_weather: 'watchful — she has spent years being the one who notices misalignment in everyone else, and now the room is reading her the same way',
    signature_habits: 'reviews the ritual sequence in her head even when it is already finished',
    li_keenly_aware_of: ['how still her hands stay under pressure', 'the exact moment her composure is costing her something'],
    wound: {
      core: 'Failing is survivable; failing where it can be witnessed and recounted is not, so she manages the audience as much as the task.',
      category: 'PUBLIC',
      surfacing_hint: 'a public misalignment forcing her competence into question',
    },
    core_contradiction: 'She knows the procedure better than she has ever performed it, and the gap between knowing and doing is where her fear lives now that everyone is watching.',
    private_hope: 'That the assembly sees her as capable, not merely lucky, once the truth of the misalignment comes out.',
    current_crisis: {
      event: 'The presiding Dohkar has charged her with shaping and interfering, and the matter has not yet been resolved before the gathered assembly.',
      immediate_fear: 'That the accusation outlives any answer she gives before the inquiry opens.',
      li_complication: 'Julian, who already knows something about her lineage, questioned her before the assembly as part of the same incident.',
      refusal: 'To let the Dohkar’s claim that she was shaping the wish and interfering go unanswered before he has ruled.',
    },
    _provenance: {
      'wound.core': { basis: 'approved_facet:pc_fears_public_failure', cites: 'Failing is survivable; failing where it can be witnessed and recounted is not' },
      'wound.surfacing_hint': { basis: 'inferred', cites: '' },
      'core_contradiction': { basis: 'approved_facet:pc_untested_brilliance', cites: 'She knows the procedure better than she has ever performed it' },
      'private_hope': { basis: 'inferred', cites: '' },
      'current_crisis.event': { basis: 'approved_scene1', cites: 'The presiding Dohkar has charged Lirael with shaping the wish and with interfering' },
      'current_crisis.immediate_fear': { basis: 'inferred', cites: '' },
      'current_crisis.li_complication': { basis: 'approved_relationship', cites: 'Already knows something about the PC’s lineage' },
      'current_crisis.refusal': { basis: 'approved_scene1', cites: 'The presiding Dohkar has charged Lirael with shaping the wish and with interfering; he has not yet ruled' },
    },
  };
}

// ── THE RED BIBLE — the ACTUAL retained failed live sample, replayed verbatim, not re-typed. ──
function redBible() {
  const raw = JSON.parse(fs.readFileSync('_audit_out/pc_foundation_samples/2026-09-15_live_sample_01_FAILED.json', 'utf8'));
  if (!raw.parsedBible) throw new Error('retained sample file has no parsedBible to replay');
  return raw.parsedBible;
}

// ── CLASSIFICATION — merges the two already-proven classifiers this file draws on:
// _pc_foundation_preflight_dry.mjs's pcBodyBible/bodyTellReroll anchors (the ONLY script that has
// actually fired a real pcBodyBible request against this exact prompt and confirmed the anchor
// text), and _pc_cplus_cg_live_proof.mjs's oasDialogue/fatePreviews/cgScreenplay/sceneSpine
// anchors (the ONLY script that has actually driven First Sacrifice's real CG continuation chain
// to a real cgScreenplay request). F.REQUEST_KINDS is the fallback for every other classified
// call this proof does not care about the content of (scaffold/author/aplot/antagonist/li bible/
// portfolio batch/etc.) — stubbed harmlessly so a real story doesn't crash if it also fires. ──
function classifyModelCall(sys, usr, role, model) {
  if (/generating a PROTAGONIST BODY BIBLE for a romance novel/.test(sys)) return 'pcBodyBible';
  if (/rewrite 5 body-tell fields for a romance heroine bible/.test(sys)) return 'bodyTellReroll';
  if (/generating a LOVE-INTEREST BODY BIBLE for a romance novel/.test(sys)) return 'liBodyBible';
  if (/generating an ANTAGONIST BODY BIBLE for a romance novel/.test(sys)) return 'antagonistBodyBible';
  if (/opening an intimate dialogue/.test(sys)) return 'oasDialogue';
  if (/uninhibited romance fiction author/.test(sys) && /TEMPTATION \|\|\|/.test(usr)) return 'fatePreviews';
  if (/screenplay-native cinematic-romance writer/.test(sys)) return 'cgScreenplay';
  if (/SCENE-SPINE planner/.test(sys) || /"hardBeats"/.test(sys)) return 'sceneSpine';
  if (/STORYBOUND ARCHITECTURE LAWS/.test(sys)) return 'author';
  const hits = F.REQUEST_KINDS.filter(([, t]) => t(sys + '\n' + usr, sys, usr)).map(([k]) => k);
  return hits.length === 1 ? hits[0] : 'unclassified(role=' + role + ',model=' + model + ')';
}

// The real fate-card pipeline clips a card's action text at 120 chars (measured directly by
// _pc_cplus_cg_live_proof.mjs) — this exact CONFESSION card/FIVE_OPTIONS text is copied verbatim
// from that already-proven file so the interruption -> card-click -> Submit chain behaves exactly
// as already demonstrated, rather than re-deriving a new, unproven card.
const CONFESSION_ACTION = 'I perform the rehearsed procedure at last, in front of the assembly, and look to Julian instead of the Dohkar.';
const CONFESSION_DIALOGUE = 'I did call to you for an explanation of what went wrong.';
const FIVE_OPTIONS = [
  'TEMPTATION ||| amplify ||| I step in until the Dohkar has to look up at me ||| Ask it here, then.',
  'SILENCE ||| redirect ||| I keep The Answer level and say nothing ||| (no words)',
  'REVERSAL ||| amplify ||| I turn the hooked end toward Julian ||| You confessed more than I did.',
  'BOUNDARY ||| amplify ||| I set my feet and do not move ||| The inquiry, then.',
  'CONFESSION ||| amplify ||| ' + CONFESSION_ACTION + ' ||| ' + CONFESSION_DIALOGUE,
].join('\n');

// ── ONE STUBBED PAGE. CALL_CAPS bound pcBodyBible/bodyTellReroll exactly as
// _pc_foundation_preflight_dry.mjs already proved (primary call, at most 2 legitimate reroll
// attempts, over-cap aborted and named, never silently allowed). Every OTHER classified kind is
// dispatched via _pc_cplus_cg_live_proof.mjs's own already-proven fixture table and envelope
// shape (the OpenAI-choices envelope) — pcBodyBible/bodyTellReroll instead use
// _pc_foundation_preflight_dry.mjs's own already-proven {content, usage} envelope shape, since
// that is the ONE shape a real prior run of this exact request/response pair has actually
// confirmed the app parses correctly. Mixing envelope shapes by kind, rather than picking one for
// the whole file, means every shape used here has already been proven against the real app at
// least once in this session, not merely assumed. ──
const CALL_CAPS = { pcBodyBible: 1, bodyTellReroll: 2 };

function newStubbedPage(browser, ctx, bibleContent, opts) {
  opts = opts || {};
  return (async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    ctx.consoleEvents = []; ctx.requestCensus = []; ctx.cgRequests = []; ctx.authorPayloads = []; ctx.skeletonPosts = [];
    ctx.attemptCounts = {}; ctx.correlatedAttempts = []; ctx.blockedAttempts = []; ctx.contractViolation = null;
    // Reused verbatim from _cplus_eplus_fusion_live_proof.mjs's own default (skeleton MODEL reply
    // carries no C+/E+/fusion of its own — that is injected server-side AFTER this reply, by
    // _cpContinuationAssignment, which is the exact mechanism under test here).
    ctx.skeletonReply = opts.skeletonReply || { environment_anchor: 'a lantern on the sill', structural_pacing: 'measured escalation', narrative_density: 'moderate',
      dialogue_ratio: 'balanced', beat_style: 'observation then interaction', tension_rhythm: 'rising with pauses',
      staged_characters: [], interlocutor_placement: null, li_texture_beat: null, pc_body_callback: null, li_body_callback: null,
      antagonist_body_callback: null, environment_plus: null, fusion: null, stage_contract: null };
    page.on('console', m => ctx.consoleEvents.push({ type: m.type(), text: m.text() }));

    await installSession(page);
    await page.route('**/sb-test.localhost/**', route => {
      const accept = route.request().headers()['accept'] || '';
      const single = /vnd\.pgrst\.object\+json/.test(accept);
      return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
    });
    await installEntitledProfileStub(page, { log: (m) => ctx.consoleEvents.push({ type: 'harness', text: '[STUB] ' + m }) });

    await page.route('**/api/**', async route => {
      const req = route.request(); const url = req.url(); const p = new URL(url).pathname;
      if (/\/api\/config\b/.test(url)) { ctx.requestCensus.push({ kind: 'infra:config', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() }); }
      if (isAuthOrigin(url)) { ctx.requestCensus.push({ kind: 'infra:auth-origin', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
      if (/\/api\/verify-subscription\b/.test(url)) { ctx.requestCensus.push({ kind: 'infra:verify-subscription', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) }); }
      if (F.PASSTHROUGH.test(url)) { ctx.requestCensus.push({ kind: 'infra:passthrough', url: p }); return route.continue(); }
      if (F.LOCAL[p]) { ctx.requestCensus.push({ kind: 'infra:local:' + p, url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(F.LOCAL[p]) }); }
      if (req.method() !== 'POST') { ctx.requestCensus.push({ kind: 'infra:non-post', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
      if (!F.MODEL.test(url)) { ctx.requestCensus.push({ kind: 'infra:unmodeled-fallback', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }

      let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
      const flat = m => typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(x => x && x.text || '').join('\n') : '');
      const sys = (b.messages || []).filter(m => m.role === 'system').map(flat).join('\n');
      const usr = (b.messages || []).filter(m => m.role === 'user').map(flat).join('\n');
      // SKELETON GENERATION — role PROMPT_PREPROCESSOR (checked by role, exactly as
      // _cplus_eplus_fusion_live_proof.mjs's wire() does — this is the literary continuation's
      // free-text proposal call; the REAL C+ injection happens server-side afterward, from
      // _cpContinuationAssignment, which this proof is actually testing).
      if (b.role === 'PROMPT_PREPROCESSOR') {
        ctx.skeletonPosts.push({ sys, usr, body: b });
        const reply = (typeof ctx.skeletonReply === 'function') ? ctx.skeletonReply(b) : ctx.skeletonReply;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: JSON.stringify(reply) }) });
      }
      // NORMALIZATION — callNormalizationLayer (/api/chatgpt-proxy, role 'NORMALIZATION'). Only
      // ID3 (corridor begin-story) exercises this; a benign echo-back of the SAME user_text is a
      // realistic, non-corrupting normalization outcome and lets ID3 assert on an EXACT known
      // value rather than an unpredictable model-shaped one.
      if (b.role === 'NORMALIZATION') {
        let userText = '';
        try { const u = (b.messages || []).find(m => m.role === 'user'); userText = JSON.parse((u && u.content) || '{}').user_text || ''; } catch (_) {}
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, normalized_text: userText, confidence_level: 'high' }) });
      }
      const kind = classifyModelCall(sys, usr, b.role, b.model || b.preferredModel);
      const sysBytes = Buffer.byteLength(sys, 'utf8'), usrBytes = Buffer.byteLength(usr, 'utf8');
      ctx.requestCensus.push({ kind, url: p, role: b.role || null, model: b.model || b.preferredModel || null, sysBytes, usrBytes });
      if (kind === 'cgScreenplay') ctx.cgRequests.push({ sys, usr, at: Date.now() });
      if (kind === 'author') ctx.authorPayloads.push({ sys, usr, at: Date.now() });

      if (kind === 'pcBodyBible' || kind === 'bodyTellReroll') {
        ctx.attemptCounts[kind] = (ctx.attemptCounts[kind] || 0) + 1;
        const attemptNumber = ctx.attemptCounts[kind];
        const cap = CALL_CAPS[kind];
        const requestId = kind + '#' + attemptNumber;
        if (attemptNumber > cap) {
          ctx.blockedAttempts.push({ requestId, kind, attemptNumber, cap, role: b.role, model: b.model, outcome: 'blocked_over_cap' });
          ctx.contractViolation = { kind, attemptNumber, cap };
          note('*** CONTRACT VIOLATION: ' + requestId + ' exceeds the declared cap of ' + cap + ' for ' + kind + ' — ABORTED, never fulfilled ***');
          return route.abort('failed');
        }
        ctx.correlatedAttempts.push({ requestId, kind, attemptNumber, model: b.model, role: b.role, maxTokens: b.max_tokens, sysBytes, usrBytes });
        const body = kind === 'pcBodyBible' ? JSON.stringify(bibleContent)
          : JSON.stringify({ stress_tic: 'DRY-RUN', desire_tell: 'DRY-RUN', impatience_tell: 'DRY-RUN', confidence_tell: 'DRY-RUN', vulnerability_tell: 'DRY-RUN' });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: body, usage: { prompt_tokens: Math.round((sysBytes + usrBytes) / 4), completion_tokens: kind === 'pcBodyBible' ? 900 : 60 } }) });
      }

      let content = '{}';
      if (kind === 'fatePreviews') content = FIVE_OPTIONS;
      else if (kind === 'sceneSpine') content = JSON.stringify({ tactical_move: 'x', state_change_precondition: 'x', state_change: 'Julian puts a testing question to Lirael before the assembly', forces_choice: 'forces Lirael to choose between A and B', branch_a: 'A', branch_b: 'B', posture_read: 'She stays', local_objective: 'OBJ-PROBE: Julian puts a testing question to Lirael before the assembly', local_objective_actor: 'Julian', present: ['Lirael', 'Julian', 'Seren', 'the presiding Dohkar'], reserved: { price_identified: 'untouched', inquiry_opened: 'untouched', julian_counter_wish: 'untouched', julian_obscuring_wishes: 'untouched' }, aftermath: { twist_manifested: 'kept', interrogation_interrupted: 'kept', the_answer_institutional: 'kept', inquiry_authority_claimed: 'kept' } });
      else if (kind === 'planner') content = F.plannerReply(usr, null);
      else if (kind === 'author') content = F.PROSE;
      else if (kind === 'aplotGenerator' || kind === 'aplotCorrection') content = JSON.stringify(F.APLOT_VALID);
      else if (kind === 'liBodyBible') content = JSON.stringify(F.LI_BIBLE);
      else if (kind === 'antagonistBodyBible') content = JSON.stringify(F.ANTAGONIST_BIBLE);
      else if (kind === 'scaffold') { const ref = (sys + usr).match(/subject_ref:\s*(\S+)/); content = JSON.stringify(F.scaffoldReply(ref ? ref[1] : null, true)); }
      else if (kind === 'oasDialogue') content = JSON.stringify({ li_dialogue: 'You called to me. Say it plainly, here, where they can hear.', li_action: 'He does not step back.', face_state: 'intent', scene_state: 'building', release_state: 'none' });
      else if (kind === 'cgScreenplay') content = '{}'; // categorically ignored downstream — we assert on the OUTGOING prompt, not this reply
      else content = JSON.stringify(F.GENERIC);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'harness', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }] }) });
    });
    return page;
  })();
}

async function dismissPcLookModalIfOpen(page) {
  for (let i = 0; i < 10; i++) {
    const st = await page.evaluate(() => ({
      pcOpen: (() => { const m = document.getElementById('pcLookModal'); return !!(m && !m.classList.contains('hidden') && m.getClientRects().length > 0); })(),
      liOpen: (() => { const m = document.getElementById('liRenderModal'); return !!(m && !m.classList.contains('hidden') && m.getClientRects().length > 0); })(),
      warnOpen: !!document.getElementById('skipRenderWarnModal'),
    }));
    if (!st.pcOpen && !st.liOpen && !st.warnOpen) return;
    if (st.warnOpen) { try { await page.click('#skipRenderWarnModal [data-act="skip"]', { timeout: 5000 }); } catch (_) {} }
    else if (st.pcOpen) { try { await page.click('#pcLookSkipBtn', { timeout: 5000 }); } catch (_) {} }
    else if (st.liOpen) { try { await page.click('#liRenderSkipBtn', { timeout: 5000 }); } catch (_) {} }
    await page.waitForTimeout(600);
  }
}

// ── STEP A — real Library -> book -> Read, reaching baked Scene 1 WITHOUT Genesis unlock (same
// technique _pc_foundation_preflight_dry.mjs already proved isolates the pcBodyBible call from its
// three Genesis-gate siblings). ──
async function reachBakedScene1(label, page) {
  const t0 = Date.now(); let up = false;
  while (Date.now() - t0 < 120000 && !up) {
    try { await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 }); await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_STORIES && window._bakedScene1For, null, { timeout: 60000 }); up = true; }
    catch (_) { await page.waitForTimeout(3000); }
  }
  if (!up) { ok(label + ' server reachable', false, 'server never answered'); return false; }
  await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const burgerVisible = await page.evaluate(() => { const b = document.getElementById('burgerBtn'); return !!(b && b.getClientRects().length > 0); });
  if (burgerVisible) {
    await page.click('#burgerBtn'); await page.waitForTimeout(400);
    await page.click('.vault-tab[data-vault-section="Account"]'); await page.waitForTimeout(300);
    await page.click('#menuLibraryBtn'); await page.waitForTimeout(1500);
  }
  const screenNow = await page.evaluate(() => window._currentScreenId);
  ok(label + ' real Library entry reaches vaultLibraryScreen', screenNow === 'vaultLibraryScreen', screenNow);
  if (screenNow !== 'vaultLibraryScreen') return false;

  await page.click('.library-book[data-story-id="starter_first_sacrifice"]');
  await page.waitForTimeout(900);
  await page.click('#zoomReadBtn');
  await page.waitForTimeout(6000);
  const afterRead = await page.evaluate(() => ({ screen: window._currentScreenId, starterId: window.state._starterId,
    oasBtnVisible: !!document.getElementById('bakedOASEnterBtn') && document.getElementById('bakedOASEnterBtn').getClientRects().length > 0 }));
  ok(label + ' real click reaches baked Scene 1 (game screen, real starterId)', afterRead.screen === 'game' && afterRead.starterId === 'starter_first_sacrifice', JSON.stringify(afterRead));
  return afterRead.screen === 'game' && afterRead.starterId === 'starter_first_sacrifice';
}

// ── STEP D — real Save & Exit -> real reload -> real Library -> real Continue. Reused verbatim
// pattern from _pc_cplus_cg_live_proof.mjs's realClickSaveReloadContinue (GREEN-RELOAD), adapted
// to read back _pcPortfolio instead of _scenePosture. ──
async function realClickSaveReloadContinue(label, page) {
  const saveBtnId = await page.evaluate(() => {
    const lit = document.getElementById('storySaveExitBtn');
    if (lit && lit.getClientRects().length > 0) return 'storySaveExitBtn';
    const gn = document.getElementById('gnSaveExitBtn');
    if (gn && gn.getClientRects().length > 0) return 'gnSaveExitBtn';
    return null;
  });
  ok(label + ' a real Save & Exit affordance is visible', !!saveBtnId, saveBtnId);
  if (!saveBtnId) return null;
  await page.click('#' + saveBtnId);
  await page.waitForTimeout(2000);
  ok(label + ' close returns to the Library screen', (await page.evaluate(() => window._currentScreenId)) === 'vaultLibraryScreen');

  await page.reload({ waitUntil: 'commit' });
  const t0 = Date.now(); let up = false;
  while (Date.now() - t0 < 60000 && !up) {
    try { await page.waitForFunction(() => window.state && window._launchStarterStory, null, { timeout: 10000 }); up = true; }
    catch (_) { await page.waitForTimeout(1000); }
  }
  ok(label + ' page reload completes (runtime state genuinely cleared)', up);
  if (!up) return null;
  await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);

  await page.click('#burgerBtn'); await page.waitForTimeout(400);
  await page.click('.vault-tab[data-vault-section="Stories"]'); await page.waitForTimeout(300);
  await page.click('.vault-nav[data-vault-section="SavedStories"]'); await page.waitForTimeout(600);
  const rowLocator = page.locator('#vaultSavedStoriesList .vault-saved-story-row').first();
  const rowCount = await rowLocator.count();
  ok(label + ' a saved-story row exists in the real Library UI', rowCount > 0);
  if (!rowCount) return null;
  const continueBtn = rowLocator.getByRole('button', { name: 'Continue', exact: true });
  await continueBtn.click();
  await page.waitForTimeout(1500);
  for (let i = 0; i < 20; i++) {
    const scr = await page.evaluate(() => window._currentScreenId);
    if (scr === 'game' || scr === 'gnReader') break;
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({
    screen: window._currentScreenId,
    pcPortfolio: window.state._pcPortfolio,
    starterId: window.state._starterId,
  }));
  ok(label + ' the real Continue click (not a direct function call) restored the story', after.screen === 'game' || after.screen === 'gnReader', JSON.stringify({ screen: after.screen, starterId: after.starterId }));
  return after;
}

// ── STEP E — real Genesis unlock -> OAS dialogue exit -> interruption -> CONFESSION card ->
// Submit -> real cgScreenplay request. Reused pattern from _pc_cplus_cg_live_proof.mjs's
// driveToCgScreenplayRequest, starting from an ALREADY-REACHED baked-Scene-1 page (this proof does
// the pcBodyBible generation/commit/reload/continue cycle BEFORE this step, so Genesis unlock's own
// three sibling generator calls — liBodyBible/antagonistBodyBible/scaffold — never contaminate the
// isolated pcBodyBible measurement above). fixtureFn(page) runs right after OAS goes active, before
// the dialogue exchange — the one injection point, matching the reference file's own convention. ──
// ── SHARED — real Library/book/Read is assumed already reached; drives real Genesis unlock
// (#bakedOASEnterBtn -> #buGoBtn -> wait for the real console gate) through to OAS-active
// (gnReader, intimacyDialogue.active). Extracted so item-1's "seed facet resolves at OAS entry,
// no portfolio commit" control can reach the exact same real checkpoint driveToCgScreenplayRequest
// uses, without duplicating the click sequence. ──
async function unlockGenesisAndReachOas(label, page, ctx) {
  const afterRead = await page.evaluate(() => ({ screen: window._currentScreenId,
    oasBtnVisible: !!document.getElementById('bakedOASEnterBtn') && document.getElementById('bakedOASEnterBtn').getClientRects().length > 0 }));
  if (!afterRead.oasBtnVisible) { ok(label + ' bakedOASEnterBtn visible before Genesis unlock', false, JSON.stringify(afterRead)); return false; }

  await page.click('#bakedOASEnterBtn');
  await page.waitForTimeout(1300);
  const goBtnVisible = await page.evaluate(() => { const el = document.getElementById('buGoBtn'); return !!(el && el.getClientRects().length > 0); });
  ok(label + ' real Genesis unlock modal + #buGoBtn visible', goBtnVisible, '');
  if (!goBtnVisible) return false;
  note(label + ': clicking the REAL #buGoBtn — stubbed but real deferred handleBeginStory() pipeline; can take real minutes.');
  await page.click('#buGoBtn');
  let unlocked = false;
  for (let i = 0; i < 480 && !unlocked; i++) { await page.waitForTimeout(1000); unlocked = ctx.consoleEvents.some(e => /\[BAKED:GATE\] Genesis unlocked/.test(e.text)); }
  ok(label + ' real Genesis charge completes and unlocks', unlocked, unlocked ? '' : 'timed out after 8 min');
  if (!unlocked) return false;
  await page.waitForTimeout(1500);
  await dismissPcLookModalIfOpen(page);

  const s4 = await page.evaluate(() => ({ screen: window._currentScreenId, oasActive: !!(window.state.intimacyDialogue && window.state.intimacyDialogue.active) }));
  ok(label + ' one-on-one live (gnReader, OAS active)', s4.screen === 'gnReader' && s4.oasActive, JSON.stringify(s4));
  return !!s4.oasActive;
}

// ── SHARED — everything AFTER OAS-active: the dialogue exchange, exit, interruption mount,
// CONFESSION card, and real Submit. Extracted so a caller that has already reached OAS-active
// through its OWN route (e.g. Book2's own post-transition Genesis unlock, which is NOT reachable
// via unlockGenesisAndReachOas a second time — #bakedOASEnterBtn/#buGoBtn no longer exist once
// already unlocked) can drive the rest of the real chain without re-clicking a gate that is gone. ──
async function driveOasToInterruptionSubmit(label, page, ctx, fixtureFn) {
  const fixtureResult = await fixtureFn(page);
  note(label + ' fixture injected: ' + JSON.stringify(fixtureResult));

  await dismissPcLookModalIfOpen(page);
  await page.fill('#gnActionInput', 'I keep my hands still around The Answer and look at the assembly.');
  await page.click('#gnSubmitBtn');
  await page.waitForTimeout(3000);
  for (let i = 0; i < 30 && (await page.evaluate(() => !!(window.state.intimacyDialogue && window.state.intimacyDialogue.awaitingResponse))); i++) await page.waitForTimeout(1000);

  await dismissPcLookModalIfOpen(page);
  await page.fill('#gnActionInput', '');
  await page.fill('#gnDialogueInput', 'stop');
  await page.click('#gnSubmitBtn');
  await page.waitForTimeout(2000);
  try { await page.click('#intimacyExitFade', { timeout: 5000 }); } catch (_) { await page.evaluate(() => { const b = document.getElementById('intimacyExitFade'); if (b) b.click(); }); }
  await page.waitForTimeout(4000);
  const s5 = await page.evaluate(() => !!(document.getElementById('intimateInterruption') && document.getElementById('intimateInterruption').getClientRects().length > 0));
  ok(label + ' interruption mounts after the real exit click', s5, '');
  if (!s5) return false;

  for (let i = 0; i < 15 && !(await page.evaluate(() => { const r = window.state._intimateInterruption; return !!(r && r.cards && Object.keys(r.cards).length); })); i++) await page.waitForTimeout(1000);
  const HOST = await page.evaluate(() => { const r = window.state._intimateInterruption; return r && r.host === 'cg' ? { mount: 'gnCardMount', a: 'gnActionInput', d: 'gnDialogueInput', s: 'gnSubmitBtn' } : { mount: 'cardMount', a: 'actionInput', d: 'dialogueInput', s: 'submitBtn' }; });
  await dismissPcLookModalIfOpen(page);

  await page.click('#' + HOST.mount + ' [data-fate-card-slot="confession"]');
  await page.waitForTimeout(700);
  const filled = await page.evaluate((H) => ({ a: document.getElementById(H.a).value, d: document.getElementById(H.d).value }), HOST);
  ok(label + ' real CONFESSION card click fills real Say/Do inputs verbatim', filled.a === CONFESSION_ACTION && filled.d === CONFESSION_DIALOGUE, JSON.stringify(filled));

  const before = ctx.cgRequests.length;
  await dismissPcLookModalIfOpen(page);
  await page.click('#' + HOST.s);
  for (let i = 0; i < 60 && ctx.cgRequests.length <= before; i++) await page.waitForTimeout(2000);
  ok(label + ' real Submit fires a real cgScreenplay request', ctx.cgRequests.length > before, 'cgRequests=' + ctx.cgRequests.length);
  return ctx.cgRequests.length > before;
}

async function driveToCgScreenplayRequest(label, page, ctx, fixtureFn) {
  const oasOk = await unlockGenesisAndReachOas(label, page, ctx);
  if (!oasOk) return false;
  return driveOasToInterruptionSubmit(label, page, ctx, fixtureFn);
}

const browser = await chromium.launch({ headless: true });

// ══════════════════════════════════════════════════════════════════════════════════════════
// LITERARY CONTINUATION PATH (Roman, requirement 4, 2026-09-15 follow-up) — First Sacrifice's
// real scene 2 is CG/gnReader-hosted ONLY; there is no real #actionInput/#dialogueInput/
// #submitBtn literary continuation surface for THIS starter to real-click through. To test the
// LITERARY consumption path for real rather than skip it, this reuses this repo's own already-
// proven synthetic-seed technique — _cplus_eplus_fusion_live_proof.mjs's `__seedMidStory` (a REAL
// mid-story state reached via page.evaluate setup + a REAL #actionInput/#dialogueInput/#submitBtn
// submit, exercising the ACTUAL _generateSceneSkeleton -> _cpContinuationAssignment -> author-
// payload assembly chain — the identical mechanism CG's own delivered-assignments path shares,
// per app.js's own _cgMintDeliveredAssignments -> _cpContinuationAssignment call) — extended here
// with a PC cast entry that HAS cPlusFacets (the original only has {role:'PC',name:'Lirael'} with
// none, since that file's own scenarios deliberately test PC-C+ absence). Disclosed explicitly:
// this is a DIFFERENT real launch route than the CG scenario above (synthetic mid-story submit,
// not First Sacrifice's own book), chosen because no real click path exists to reach a literary
// continuation for this specific starter — never a shortcut around the mechanism itself.
// ══════════════════════════════════════════════════════════════════════════════════════════
function installLiteraryHelpersSource() {
  return `
    window.__seedLiteraryMidStory = function (storyId) {
      const s = window.state; window.__disableSpeculativePreload = true; window.__tierRouting = false;
      s.storyId = storyId; s.tier = 'fling'; s.access = 'sub'; s.subscribed = true; s.fortunes = 9999999;
      window.STARTER_SEEDS = window.STARTER_SEEDS || {};
      var _fakeSeedId = 'lit_proof_seeded_' + storyId;
      window.STARTER_SEEDS[_fakeSeedId] = { issue: 1, cast: [
        { role: 'PC', name: 'Lirael', species: 'apprentice ritualist',
          bio: 'A young apprentice ritualist. Today is her first time supervising a formal rite on her own. Brilliant but untested; terrified of failing publicly.',
          cPlusFacets: [
            { facet_id: 'lit_untested_brilliance', category: 'competence',
              canonical_truth: 'She knows the ritual sequence better than she has ever performed it alone, and the gap between knowing and doing is where her fear lives.' },
            { facet_id: 'lit_fears_public_failure', category: 'fear',
              canonical_truth: 'Failing is survivable; failing in front of the whole gathered court is not, so she manages the room as much as the rite.' },
          ] },
        { role: 'LI', name: 'Julian', species: 'apprentice ritualist',
          bio: 'An older apprentice: calm, quietly respected. Present at the rite only as an observer.' },
      ] };
      s._starterId = _fakeSeedId; s.is_starter_story = true;
      s.picks = Object.assign(s.picks || {}, { world: 'Fatelands', worldSubtype: 'veilwood', tone: 'Earnest', flavor: 'Fantasy', dynamic: 'Enemies', pov: 'first_person', length: 'fling', intensity: 'Steamy', archetype: { primary: 'BEAUTIFUL_RUIN' }, playerMask: 'OPEN_VEIN', loveInterest: 'Male', identity: { playerName: 'Lirael', partnerName: 'Julian' } });
      s.name = 'Lirael'; s.playerName = 'Lirael'; s.identity = { playerName: 'Lirael', partnerName: 'Julian' }; s.gender = 'Female'; s.loveInterest = 'Male'; s.archetype = { primary: 'BEAUTIFUL_RUIN' }; s.playerMask = 'OPEN_VEIN'; s.storyLength = 'fling'; s._skipCorridorValidation = true;
      s.canonicalLI = { name: 'Julian', committed: true, mask: 'BEAUTIFUL_RUIN' };
      s.sysPrompt = 'STORYBOUND ARCHITECTURE LAWS — harness system prompt (no doctrine).';
      const one = 'Lirael crossed the courtyard at dawn, the gathered court already assembling behind her. '
        + 'The stones were still cold from the night, and the mist over the yard exhaled slow over the crowd. '.repeat(14)
        + 'She did not look back at the gate.';
      window.StoryPagination.init(); window.StoryPagination.clear(); window.StoryPagination.addPage('<p>' + one + '</p>', true);
      s.scenes = [{ title: 'One', synopsis: '', text: one, fateCard: null }]; s.turnCount = 0;
      s._sceneTextRing = [{ text: one }]; s._priorSceneText = one; s.currentStoryContent = one;
      s._sceneLedger = null; s._authoringSceneKey = null; s._stageState = null; s._relationshipLedger = null;
      window._sceneLedgerCommit(s, { kind: 'scene', sceneNumber: 1, event: 'PLANNED ONE — the courtyard at dawn', act: 'cross the courtyard', pageUid: window.StoryPagination.getCurrentPageUid() });
      window._commitTransition('The gathered court had already begun to assemble.', 'scene1_transition', 1);
    };
  `;
}

// Citations point at THIS synthetic seed's own bio/facets ONLY (no baked Scene 1 exists here, so
// approved_scene1 is never used — current_crisis.event/refusal use 'inferred', structurally valid
// per the validator, and content-safe).
function literaryGreenBible() {
  return {
    // NON-DURABLE FIELDS — same reason as greenBible() above: _generatePCBodyBibleUncached's own
    // internal sanity gate (public/app.js ~255862) discards the whole response unless
    // signature_feature + at least one tell is populated, BEFORE this task's validator ever runs.
    height: 'five foot four', build: 'compact, quick on her feet from years of drilled footwork',
    hair: 'dark hair worn cropped for the rite', complexion: 'warm, windburned at the cheekbones',
    face: 'a face that reads steady even when she is not', signature_feature: 'a small pale scar through one eyebrow',
    visual_anchor: { focus: 'hands', detail: 'her hands stay precisely still while everything else about her is tense' },
    second_celebrated_feature: 'the exact, economical way she moves through a ritual space',
    stress_tic: 'she counts her own pulse against her thumb without meaning to',
    desire_tell: 'she goes very quiet and watches hands instead of faces',
    impatience_tell: 'her jaw sets half a second before she speaks',
    confidence_tell: 'she stops qualifying her own sentences',
    vulnerability_tell: 'she holds an object slightly too tightly, knuckles pale',
    emotional_weather: 'watchful',
    signature_habits: 'reviews the ritual sequence in her head even when it is already finished',
    li_keenly_aware_of: ['how still her hands stay under pressure'],
    wound: { core: 'Failing is survivable; failing in front of the whole gathered court is not, so she manages the room as much as the rite.', category: 'PUBLIC', surfacing_hint: 'a public rite forcing her competence into question' },
    core_contradiction: 'She knows the ritual sequence better than she has ever performed it alone, and the fear of getting it wrong in front of everyone eats at her now that the court is watching.',
    private_hope: 'That the court sees her as capable, not merely lucky, once the rite is done.',
    current_crisis: {
      event: 'The gathered court has fallen silent, waiting for her to begin the rite alone for the first time.',
      immediate_fear: 'That her hesitation in front of the court will be remembered longer than whatever she does next.',
      li_complication: 'Julian, who is present only as an observer, is watching her hesitate along with everyone else.',
      refusal: 'To let the court see how much this alone-for-the-first-time rite is costing her before she has even begun.',
    },
    _provenance: {
      'wound.core': { basis: 'approved_facet:lit_fears_public_failure', cites: 'Failing is survivable; failing in front of the whole gathered court is not' },
      'wound.surfacing_hint': { basis: 'inferred', cites: '' },
      'core_contradiction': { basis: 'approved_facet:lit_untested_brilliance', cites: 'She knows the ritual sequence better than she has ever performed it alone' },
      'private_hope': { basis: 'inferred', cites: '' },
      'current_crisis.event': { basis: 'inferred', cites: '' },
      'current_crisis.immediate_fear': { basis: 'inferred', cites: '' },
      'current_crisis.li_complication': { basis: 'approved_relationship', cites: 'Present at the rite only as an observer' },
      'current_crisis.refusal': { basis: 'inferred', cites: '' },
    },
  };
}

const submitLit = async (page, act, dia) => page.evaluate(([a, d]) => { document.getElementById('actionInput').value = a; document.getElementById('dialogueInput').value = d || ''; const b = document.getElementById('submitBtn'); b.disabled = false; b.click(); }, [act, dia || '']);
const settleLit = async (page, ctx, ms) => { const n0 = ctx.authorPayloads.length; for (let w = 0; w < ms; w += 2000) { await page.waitForTimeout(2000); if (ctx.authorPayloads.length > n0) { await page.waitForTimeout(4000); return true; } } return ctx.authorPayloads.length > n0; };

async function runLiteraryScenario(label, bibleForStub, opts) {
  const ctx = {};
  const page = await newStubbedPage(browser, ctx, bibleForStub);
  await page.addInitScript({ content: installLiteraryHelpersSource() });
  const t0 = Date.now(); let up = false;
  while (Date.now() - t0 < 120000 && !up) {
    try { await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 }); await page.waitForFunction(() => window.state && window._buildContinuitySpineBlock && window.StoryPagination && window.__seedLiteraryMidStory, { timeout: 60000 }); up = true; }
    catch (_) { await page.waitForTimeout(3000); }
  }
  if (!up) { ok(label + ' LIT server reachable with helpers installed', false); await page.context().close(); return null; }

  const storyId = 'lit-proof-' + label.toLowerCase() + '-' + Date.now();
  await page.evaluate((sid) => { window.__seedLiteraryMidStory(sid); }, storyId);
  const seeded = await page.evaluate(() => ({ starterId: window.state._starterId, storyId: window.state.storyId, turnCount: window.state.turnCount }));
  ok(label + ' LIT synthetic fixed-starter mid-story reached (real _activeSeed resolution, not First Sacrifice)', !!seeded.starterId && seeded.turnCount === 0, JSON.stringify(seeded));

  section(label + ' LIT THE ISOLATED _generatePCBodyBible() CALL (real function, synthetic fixed-starter seed)');
  const source = await page.evaluate(() => window._pcFoundationSourceFacts(window.state));
  ok(label + ' LIT _pcFoundationSourceFacts resolves against the synthetic seed', !!source && source.facets.length === 2, JSON.stringify(source && { pcName: source.pcName, facetCount: source.facets.length }));
  let genResult = null;
  try { genResult = await page.evaluate(async () => { try { const r = await window._generatePCBodyBible(); return { ok: true, hadResult: !!r }; } catch (e) { return { ok: false, error: String(e && e.message) }; } }); }
  catch (e) { genResult = { ok: false, error: String(e && e.message) }; }
  await page.waitForTimeout(1000);
  ok(label + ' LIT _generatePCBodyBible() completed without throwing', genResult && genResult.ok, JSON.stringify(genResult));
  const realBible = await page.evaluate(() => window.state.pcBodyBible);

  const validation = await page.evaluate((bible) => window._validatePcFoundationOutput(bible, window._pcFoundationSourceFacts(window.state)), realBible);
  const commit = await page.evaluate((bible) => window._commitValidatedPcFoundation(window.state, bible), realBible);
  note(label + ' LIT VALIDATION: ok=' + validation.ok + ' rejections=' + JSON.stringify(validation.rejections));
  note(label + ' LIT COMMIT: ' + JSON.stringify(commit));
  if (opts.expectAccept) {
    ok(label + ' LIT validation ACCEPTS', validation.ok === true, JSON.stringify(validation.rejections));
    ok(label + ' LIT commit REPORTS committed:true', commit.committed === true, JSON.stringify(commit));
  } else {
    ok(label + ' LIT validation REJECTS', validation.ok === false, JSON.stringify(validation.rejections));
    ok(label + ' LIT commit REFUSES', commit.committed === false, JSON.stringify(commit));
  }

  section(label + ' LIT REAL LITERARY CONTINUATION (real #actionInput/#dialogueInput/#submitBtn submit) — does the committed (or refused) portfolio reach the real author payload?');
  const setup = await page.evaluate(() => {
    window._ensureStoryEntityAnchors();
    const accepted = window._acceptStageProposal('2', {
      present: ['pc'], location: { label: 'the courtyard before the gathered court' },
      issued_facts: [{ text: 'The gathered court has fallen silent, waiting for her to begin.', participants: [{ ref: 'pc', role: 'subject' }] }],
      issued_objects: [], exclusions: { locations: [], objects: [] }, affordances: [],
      source: 'pc-foundation-literary-proof',
    });
    return { acceptedOk: accepted.ok, acceptedWhy: accepted.why };
  });
  note(label + ' LIT accepted stage: ' + JSON.stringify(setup));
  ok(label + ' LIT accepted stage naming pc present succeeded', setup.acceptedOk === true, JSON.stringify(setup));

  await submitLit(page, 'I keep my hands steady and look out at the court.', 'I am ready to begin.');
  const settled = await settleLit(page, ctx, 60000);
  ok(label + ' LIT real Submit fires a real author payload', settled && ctx.authorPayloads.length >= 1, 'authorPayloads=' + ctx.authorPayloads.length);

  let payloadCheck = null;
  if (settled) {
    // buildSkeletonDirective()'s CHARACTER+ block is not guaranteed to land in the user message —
    // _cplus_eplus_fusion_live_proof.mjs's own already-proven assertions search sys+usr together
    // for exactly this reason. Searching usr alone under-counted a real delivery in this file's
    // own first run of this check.
    const lastAuthor = ctx.authorPayloads[ctx.authorPayloads.length - 1];
    const usr = lastAuthor.sys + '\n' + lastAuthor.usr;
    const post = await page.evaluate(() => ({
      cp: window.state.sceneSkeleton && window.state.sceneSkeleton.character_plus,
      cont: window.state._cpContinuationContract,
      facetIndex: (() => { try { const idx = window._facetIndex(window.state, { sceneNumber: 2 }); return Object.keys(idx); } catch (e) { return ['ERR:' + e.message]; } })(),
    }));
    note(label + ' LIT real sceneSkeleton.character_plus: ' + JSON.stringify(post.cp));
    note(label + ' LIT real _facetIndex keys at scene 2: ' + JSON.stringify(post.facetIndex));
    const mergedIds = commit.mergedFacetIds || [];
    const cp = post.cp || [];
    const pcDelivered = cp.find(c => mergedIds.indexOf(c.facet_id) !== -1);
    if (opts.expectAccept) {
      if (pcDelivered) {
        const truthLine = 'SOURCE TRUTH — DO NOT STATE: ' + pcDelivered.facet_truth;
        const truthCount = usr.split(truthLine).length - 1;
        ok(label + ' LIT [REQUIREMENT 4 — LITERARY] the delivered merged-facet truth appears EXACTLY ONCE in the real author payload', truthCount === 1, 'count=' + truthCount);
      } else {
        ok(label + ' LIT [REQUIREMENT 4 — LITERARY] the merged PC facet was the one delivered this scene', false,
          'no character_plus entry matched mergedIds ' + JSON.stringify(mergedIds) + ' — cp=' + JSON.stringify(cp) + ' cont=' + JSON.stringify(post.cont));
      }
      const leakPatterns = ['"basis"', '"cites"', 'approved_facet:', 'approved_bio', 'approved_relationship', 'approved_scene1', 'approved_posture', '_provenance'];
      const leakHits = leakPatterns.filter(p => usr.indexOf(p) !== -1);
      ok(label + ' LIT [REQUIREMENT 4 — LITERARY] ZERO raw provenance/citation internals leak into the author payload', leakHits.length === 0, 'leaked=' + JSON.stringify(leakHits));
      payloadCheck = { pcDelivered, leakHits, cp };
    } else {
      const rejectedSnippets = ['the First Favored who raised her, vanished during a Sacrifice', "pulled into the Veilwood\u2019s hunger and never came back", "Julian is the only one who\u2019s ever made her feel like she didn\u2019t have to be the strong one", "he\u2019s the one who\u2019s going to have to decide whether she\u2019s guilty"];
      let hits = 0; rejectedSnippets.forEach(sn => { if (usr.indexOf(sn) !== -1) hits++; });
      ok(label + ' LIT ZERO rejected-field content reaches the real author payload', hits === 0, 'hits=' + hits);
      ok(label + ' LIT no pc_body_bible_validated facet was delivered', !pcDelivered, JSON.stringify(cp));
      payloadCheck = { hits, cp };
    }
  }

  await page.context().close();
  return { validation, commit, settled, payloadCheck };
}

// ══════════════════════════════════════════════════════════════════════════
// SHARED — reach baked Scene 1, run the isolated real _generatePCBodyBible() call, validate +
// commit against REAL window.state. Shared by both the persistence phase and the payload phase so
// neither silently drifts from the other's own generation/commit behavior.
// ══════════════════════════════════════════════════════════════════════════
async function generateValidateCommit(label, page, ctx, bibleForStub, opts) {
  const reached = await reachBakedScene1(label, page);
  if (!reached) return null;

  const censusBeforeCall = ctx.requestCensus.filter(r => !String(r.kind).startsWith('infra:')).length;
  ok(label + ' ZERO model-classified requests fired merely from reaching baked Scene 1', censusBeforeCall === 0, 'count=' + censusBeforeCall);

  // ── SOURCE-PARITY CHECK — confirms, against the REAL live state (not assumed), that every
  // citation in the fixture bible we are about to stub is a real substring of what
  // window._pcFoundationSourceFacts(window.state) actually returns RIGHT NOW. ──
  section(label + ' SOURCE-PARITY (real live window.state vs the fixture\'s own citations)');
  const source = await page.evaluate(() => window._pcFoundationSourceFacts(window.state));
  ok(label + ' _pcFoundationSourceFacts resolves against real live state', !!source, JSON.stringify(source && { pcName: source.pcName, facetCount: source.facets.length, hasScene1: !!source.scene1 }));
  if (bibleForStub._provenance) {
    Object.keys(bibleForStub._provenance).forEach((k) => {
      const pr = bibleForStub._provenance[k];
      if (!pr || pr.basis === 'inferred' || !pr.cites) return;
      let srcText = '';
      if (pr.basis === 'approved_bio') srcText = source.pcBio || '';
      else if (pr.basis === 'approved_relationship') srcText = [source.liBio].concat(source.relationshipConstraints || []).filter(Boolean).join(' • ');
      else if (pr.basis === 'approved_scene1') srcText = source.scene1 ? [source.scene1.ledgerLine, source.scene1.pcCondition].concat(source.scene1.obligations || []).filter(Boolean).join(' • ') : '';
      else if (/^approved_facet:/.test(pr.basis)) { const fid = pr.basis.slice('approved_facet:'.length); const f = (source.facets || []).find(x => x.facet_id === fid); srcText = f ? f.canonical_truth : ''; }
      ok(label + ' fixture citation for "' + k + '" (' + pr.basis + ') is a REAL substring of the LIVE source', srcText.indexOf(pr.cites) !== -1, 'cites="' + pr.cites + '"');
    });
  }

  // ── THE ISOLATED, REAL _generatePCBodyBible() CALL — primary + up to 2 reroll attempts ──
  section(label + ' THE ISOLATED _generatePCBodyBible() CALL (real function, real route, stubbed provider)');
  let genResult = null;
  try { genResult = await page.evaluate(async () => { try { const r = await window._generatePCBodyBible(); return { ok: true, hadResult: !!r }; } catch (e) { return { ok: false, error: String(e && e.message) }; } }); }
  catch (e) { genResult = { ok: false, error: String(e && e.message) }; }
  await page.waitForTimeout(1500);
  ok(label + ' _generatePCBodyBible() completed without throwing', genResult && genResult.ok, JSON.stringify(genResult));
  ok(label + ' the primary pcBodyBible call fired exactly once', (ctx.attemptCounts.pcBodyBible || 0) === 1, 'attempts=' + (ctx.attemptCounts.pcBodyBible || 0));
  ok(label + ' bodyTellReroll attempts stayed within the declared cap of ' + CALL_CAPS.bodyTellReroll, (ctx.attemptCounts.bodyTellReroll || 0) <= CALL_CAPS.bodyTellReroll, 'attempts=' + (ctx.attemptCounts.bodyTellReroll || 0));
  ok(label + ' NO CONTRACT VIOLATION (no attempt exceeded its declared cap)', !ctx.contractViolation, JSON.stringify(ctx.contractViolation));
  note(label + ' CORRELATED ATTEMPT LOG (request id, kind, role, model — the exact max-request-count evidence): ' + JSON.stringify(ctx.correlatedAttempts));
  note(label + ' BLOCKED ATTEMPTS (over-cap, named, never silently dropped): ' + JSON.stringify(ctx.blockedAttempts));
  const afterAllQuiet = ctx.requestCensus.slice(1).filter(r => !String(r.kind).startsWith('infra:') && r.kind !== 'pcBodyBible' && r.kind !== 'bodyTellReroll');
  ok(label + ' NOTHING OUTSIDE THE DECLARED CONTRACT fired (no sibling bible/scaffold/CG calls yet)', afterAllQuiet.length === 0, JSON.stringify(afterAllQuiet));

  const realBible = await page.evaluate(() => window.state.pcBodyBible);
  ok(label + ' window.state.pcBodyBible is set to the real generated (stubbed-provider) response', !!realBible);

  // ── REAL IN-PAGE VALIDATION + COMMIT — against REAL window.state, not a sandbox. ──
  section(label + ' REAL IN-PAGE VALIDATE + COMMIT (window._validatePcFoundationOutput / window._commitValidatedPcFoundation against REAL window.state)');
  const portfolioBefore = await page.evaluate(() => window.state._pcPortfolio || null);
  const validation = await page.evaluate((bible) => window._validatePcFoundationOutput(bible, window._pcFoundationSourceFacts(window.state)), realBible);
  note(label + ' VALIDATION RESULT: ok=' + validation.ok + ' accepted=' + JSON.stringify(validation.accepted.map(a => a.field)) + ' rejections=' + JSON.stringify(validation.rejections));
  const commit = await page.evaluate((bible) => window._commitValidatedPcFoundation(window.state, bible), realBible);
  note(label + ' COMMIT RESULT: ' + JSON.stringify(commit));
  const portfolioAfter = await page.evaluate(() => window.state._pcPortfolio || null);

  if (opts.expectAccept) {
    ok(label + ' validation ACCEPTS the fully-cited response', validation.ok === true, JSON.stringify(validation.rejections));
    ok(label + ' commit REPORTS committed:true', commit.committed === true, JSON.stringify(commit));
    ok(label + ' the real portfolio now carries the merged, provenance-stamped facets', !!portfolioAfter && Array.isArray(portfolioAfter.facets) && portfolioAfter.facets.some(f => f.origin === 'pc_body_bible_validated'), JSON.stringify(portfolioAfter && portfolioAfter.facets && portfolioAfter.facets.map(f => f.facet_id + ':' + f.origin)));
    ok(label + ' the seed\'s own two authored facets remain present, untouched', !!portfolioAfter && ['pc_untested_brilliance', 'pc_fears_public_failure'].every(id => (portfolioAfter.facets || []).some(f => f.facet_id === id)), '');
  } else {
    ok(label + ' validation REJECTS the response', validation.ok === false, JSON.stringify(validation.rejections));
    ok(label + ' commit REFUSES with committed:false, reason validation_failed', commit.committed === false && commit.reason === 'validation_failed', JSON.stringify(commit));
    ok(label + ' ZERO real-state portfolio mutation on rejection (before === after, byte-identical)', JSON.stringify(portfolioBefore) === JSON.stringify(portfolioAfter), 'before=' + JSON.stringify(portfolioBefore) + ' after=' + JSON.stringify(portfolioAfter));
  }

  return { validation, commit, portfolioAfter, realBible };
}

// ══════════════════════════════════════════════════════════════════════════
// PHASE 1 — PERSISTENCE. Reach baked Scene 1, generate/validate/commit, then real
// Save & Exit -> reload -> Continue -> verify state._pcPortfolio directly (this read does NOT
// depend on the resumed reader UI finishing its own render — see the DISCLOSED, SEPARATE gap
// noted below, discovered while building this proof: "Continue" for a first-sacrifice story that
// was never Genesis-unlocked resumes into the #gnReader page-turner rather than the #zoomReadBtn
// preview screen, and that resumed page-turner gets stuck on its own "Composing Scene 1..."
// loader in this stubbed harness — a real, observed, PRE-EXISTING behavior of the resume path
// itself, unrelated to PC-foundation validation/commit, and out of this task's scope to fix. It
// does not block this phase's own check, since window.state._pcPortfolio is read directly and
// does not require that loader to resolve.
// ══════════════════════════════════════════════════════════════════════════
async function runPersistencePhase(label, bibleForStub, opts) {
  const ctx = {};
  const page = await newStubbedPage(browser, ctx, bibleForStub);
  const gvc = await generateValidateCommit(label, page, ctx, bibleForStub, opts);
  if (!gvc) { await page.context().close(); return null; }
  const { validation, commit, portfolioAfter } = gvc;

  section(label + ' REAL SAVE & EXIT -> RELOAD -> CONTINUE (item 2/3: does the commit, or the absence of one, survive the app\'s own real save/reload mechanism?)');
  const reloadResult = await realClickSaveReloadContinue(label, page);
  note(label + ' [DISCLOSED, SEPARATE, PRE-EXISTING] after a real reload, "Continue" resumes First Sacrifice into #gnReader (a page-turner), not back into the #zoomReadBtn preview screen it was saved from — and that page-turner is observed to get stuck on its own "Composing Scene 1..." loader in this harness. This is unrelated to PC-foundation validate/commit and is reported here as a separate limitation, not investigated further.');
  if (opts.expectAccept) {
    const mergedIds = commit.mergedFacetIds || [];
    const survived = !!(reloadResult && reloadResult.pcPortfolio && (reloadResult.pcPortfolio.facets || []).filter(f => mergedIds.indexOf(f.facet_id) !== -1).length === mergedIds.length);
    ok(label + ' every merged facet survives a REAL reload + Continue, with identical content', survived, JSON.stringify(reloadResult && reloadResult.pcPortfolio && reloadResult.pcPortfolio.facets));
    if (survived) {
      const before = portfolioAfter.facets.filter(f => mergedIds.indexOf(f.facet_id) !== -1);
      const after = reloadResult.pcPortfolio.facets.filter(f => mergedIds.indexOf(f.facet_id) !== -1);
      ok(label + ' the surviving facets\' content is byte-identical pre/post reload (not merely present)', JSON.stringify(before) === JSON.stringify(after));
    }
  } else {
    const stillNoTrace = !reloadResult || !reloadResult.pcPortfolio || !(reloadResult.pcPortfolio.facets || []).some(f => f.origin === 'pc_body_bible_validated');
    ok(label + ' NO trace of the rejected bible survives a real reload (no pc_body_bible_validated facet exists)', stillNoTrace, JSON.stringify(reloadResult && reloadResult.pcPortfolio));
  }

  await page.context().close();
  return { validation, commit, reloadResult };
}

// ══════════════════════════════════════════════════════════════════════════
// PHASE 2 — PAYLOAD DELIVERY. A FRESH context/page (never reloaded — sidesteps the resume-path
// gap noted above entirely, since it never clicks Continue): reach baked Scene 1 again, generate/
// validate/commit again (same deterministic bible, same real functions), THEN real Genesis unlock
// -> OAS -> interruption -> CONFESSION card -> Submit -> real cgScreenplay request, and check
// whether the SAME-SESSION committed (or refused) portfolio reaches that real payload.
// ══════════════════════════════════════════════════════════════════════════
async function runPayloadPhase(label, bibleForStub, opts) {
  const ctx = {};
  const page = await newStubbedPage(browser, ctx, bibleForStub);
  const gvc = await generateValidateCommit(label, page, ctx, bibleForStub, opts);
  if (!gvc) { await page.context().close(); return null; }
  const { commit } = gvc;

  section(label + ' REAL CG CONTINUATION (same session, no reload) — does the committed (or refused) portfolio reach the real cgScreenplay author payload?');
  const gotRequest = await driveToCgScreenplayRequest(label, page, ctx, async (p) => {
    return p.evaluate(() => {
      const s = window.state;
      window._ensureStoryEntityAnchors();
      const accepted = window._acceptStageProposal('2', {
        present: ['pc'],
        location: { label: 'the assembly hall, before the gathered First Favored' },
        issued_facts: [
          { text: 'The presiding Dohkar has not yet ruled on the charge against her.', participants: [{ ref: 'pc', role: 'subject' }] },
        ],
        issued_objects: [], exclusions: { locations: [], objects: [] }, affordances: [],
        source: 'pc-foundation-real-path-integration-proof',
      });
      // DIAGNOSTIC, not a fixture amendment: real _resolvePcIdentity(state)/playerName at exactly
      // the point _facetIndex is about to be checked — pins down WHETHER a real, separately
      // pre-existing identity-resolution gap for First Sacrifice's real Genesis-unlock/OAS
      // bootstrap (disclosed by this session's own earlier work) is what's blocking the new
      // provider here, vs. the new provider's own logic being at fault.
      const identityDiag = (() => { try {
        const id = window._resolvePcIdentity(s);
        return { resolvedLabel: id && id.v, playerName: s.playerName, name: s.name, identityPlayerName: s.identity && s.identity.playerName };
      } catch (e) { return { err: String(e && e.message) }; } })();
      return { acceptedOk: accepted.ok, acceptedWhy: accepted.why, pcPortfolioFacetIds: (s._pcPortfolio && s._pcPortfolio.facets || []).map(f => f.facet_id), identityDiag };
    });
  });

  let payloadCheck = null;
  if (gotRequest) {
    const usr = ctx.cgRequests[ctx.cgRequests.length - 1].usr;
    const finalPortfolio = await page.evaluate(() => window.state._pcPortfolio);
    const facetIndexDiag = await page.evaluate(() => {
      try {
        const idx = window._facetIndex(window.state, { sceneNumber: 2 });
        const facets = window._resolveFacetIndexEntry({ id: 'pc', label: 'Lirael', aliases: ['Lirael'] }, idx, 2);
        const id = window._resolvePcIdentity(window.state);
        return { idxKeys: Object.keys(idx), pcFacetsResolved: facets.map(f => f.facet_id), resolvePcIdentityNow: id && id.v, playerNameNow: window.state.playerName };
      } catch (e) { return { err: String(e && e.message) }; }
    });
    if (opts.expectAccept) {
      const mergedIds = commit.mergedFacetIds || [];
      note(label + ' _facetIndex/_resolveFacetIndexEntry for "pc" at scene 2 (real, in-page): ' + JSON.stringify(facetIndexDiag));
      ok(label + ' [NEW WIRING] _facetIndex now resolves the merged facet_id(s) for "pc" at scene 2 (via the new pc_validated_portfolio provider)',
        facetIndexDiag.pcFacetsResolved && mergedIds.some(id => facetIndexDiag.pcFacetsResolved.indexOf(id) !== -1),
        'resolvedFacets=' + JSON.stringify(facetIndexDiag.pcFacetsResolved) + ' mergedIds=' + JSON.stringify(mergedIds));
      // ── READ THE REAL DELIVERED RECORD, DON'T GUESS WHICH FACET WON THE SCENE'S DENSITY CAP ──
      const delivered = await page.evaluate(() => {
        const snap = window.state._cgDeliveredAssignments;
        const cp = (snap && Array.isArray(snap.character_plus)) ? snap.character_plus : [];
        return cp.map(c => ({ character: c.character, canonicalId: c.canonicalId, facet_id: c.facet_id, isPC: c.isPC, facet_truth: c.facet_truth, facet_pressure: c.facet_pressure }));
      });
      note(label + ' real _cgDeliveredAssignments.character_plus: ' + JSON.stringify(delivered));
      const pcDelivered = delivered.find(c => mergedIds.indexOf(c.facet_id) !== -1);
      if (pcDelivered) {
        const truthLine = 'SOURCE TRUTH — DO NOT STATE: ' + pcDelivered.facet_truth;
        const truthCount = usr.split(truthLine).length - 1;
        ok(label + ' [REQUIREMENT 4 — CG] the delivered merged-facet truth ("' + pcDelivered.facet_id + '") appears EXACTLY ONCE in the real cgScreenplay payload',
          truthCount === 1, 'count=' + truthCount + ' line="' + truthLine.slice(0, 90) + '"');
        const pressureLine = pcDelivered.facet_pressure ? '(it applies here because: ' + pcDelivered.facet_pressure + ')' : null;
        if (pressureLine) {
          const pressureCount = usr.split(pressureLine).length - 1;
          ok(label + ' [REQUIREMENT 4 — CG] the delivered pressure text appears EXACTLY ONCE', pressureCount === 1, 'count=' + pressureCount);
        }
      } else {
        ok(label + ' [REQUIREMENT 4 — CG] the merged PC facet was the one delivered this scene (not merely reachable)', false,
          'no character_plus entry matched mergedIds ' + JSON.stringify(mergedIds) + ' — delivered=' + JSON.stringify(delivered)
          + '. This may mean a competing candidate (Julian/Seren/Dohkar) won the 2-slot density cap, or the seed\'s OWN pre-existing facet (not the validated one) was picked from the same merged pool — see the delivered record above for which, if any, fired.');
      }
      const leakPatterns = ['"basis"', '"cites"', 'approved_facet:', 'approved_bio', 'approved_relationship', 'approved_scene1', 'approved_posture', '_provenance'];
      const leakHits = leakPatterns.filter(p => usr.indexOf(p) !== -1);
      ok(label + ' [REQUIREMENT 4 — CG] ZERO raw provenance/citation internals leak into the author payload', leakHits.length === 0, 'leaked=' + JSON.stringify(leakHits));
      payloadCheck = { facetIndexDiag, delivered, pcDelivered, leakHits };
    } else {
      const rejectedSnippets = ['the First Favored who raised her, vanished during a Sacrifice', "pulled into the Veilwood\u2019s hunger and never came back", "Julian is the only one who\u2019s ever made her feel like she didn\u2019t have to be the strong one", "he\u2019s the one who\u2019s going to have to decide whether she\u2019s guilty"];
      let hits = 0; rejectedSnippets.forEach(s => { if (usr.indexOf(s) !== -1) hits++; });
      note(label + ' searched the REAL captured cgScreenplay usr payload for ' + rejectedSnippets.length + ' rejected-sample distinctive phrases — found: ' + hits);
      ok(label + ' ZERO rejected-field content reaches the real CG author payload', hits === 0, 'hits=' + hits);
      ok(label + ' [REQUIREMENT 5] pc_validated_portfolio contributed NOTHING (no facet_id in resolved index carries origin from the rejected bible; index only ever holds seed-owned ids)',
        !facetIndexDiag.pcFacetsResolved || facetIndexDiag.pcFacetsResolved.every(id => id === 'pc_untested_brilliance' || id === 'pc_fears_public_failure'),
        'resolvedFacets=' + JSON.stringify(facetIndexDiag.pcFacetsResolved));
      payloadCheck = { hits, rejectedSnippets, facetIndexDiag };
    }
  } else {
    ok(label + ' a real cgScreenplay request was reached to check payload delivery', false, 'blocked earlier in the real click chain — see FAIL lines above; payload-delivery could not be checked empirically this run');
  }

  await page.context().close();
  return { gotRequest, payloadCheck, correlatedAttempts: ctx.correlatedAttempts, blockedAttempts: ctx.blockedAttempts };
}

async function runScenario(label, bibleForStub, opts) {
  opts = opts || {};
  const persistence = await runPersistencePhase(label, bibleForStub, opts);
  const payload = await runPayloadPhase(label, bibleForStub, opts);
  return { persistence, payload };
}

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO GREEN
// ══════════════════════════════════════════════════════════════════════════
section('SCENARIO GREEN — fully-cited valid bible');
const greenOut = await runScenario('GREEN', greenBible(), { expectAccept: true });

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO RED — the actual retained failed sample, replayed
// ══════════════════════════════════════════════════════════════════════════
section('SCENARIO RED — the retained failed live sample, replayed through the identical real route');
const redOut = await runScenario('RED', redBible(), { expectAccept: false });

// ══════════════════════════════════════════════════════════════════════════
// LITERARY SCENARIOS (requirement 4/5 — literary path)
// ══════════════════════════════════════════════════════════════════════════
section('SCENARIO GREEN-LIT — literary continuation path, synthetic fixed-starter seed');
const greenLitOut = await runLiteraryScenario('GREEN-LIT', literaryGreenBible(), { expectAccept: true });
section('SCENARIO RED-LIT — retained failed sample through the literary path');
const redLitOut = await runLiteraryScenario('RED-LIT', redBible(), { expectAccept: false });

// ══════════════════════════════════════════════════════════════════════════════════════════
// CG/OAS CONTROL 1 (Roman, corrective follow-up #8, 2026-09-15) — the SEED's own two facets
// resolve at real OAS entry, with NO portfolio commit at all (no _generatePCBodyBible call, no
// _commitValidatedPcFoundation call — this isolates the identity-resolution fix itself from the
// new pc_validated_portfolio provider entirely). BEFORE the fix (this session's own real
// instrumented trace, cited in app.js's own corrective-follow-up-#8 comment): _resolvePcIdentity
// returned null at this exact checkpoint because state.playerName had already become
// "The Protagonist" by real OAS entry — which starved _seedFacetIndex's PC branch too, not only
// the new provider. Re-breaking the real fix to re-demonstrate that failure would be destructive;
// the durable proof is that this exact real-click checkpoint is green now and stays green.
// ══════════════════════════════════════════════════════════════════════════════════════════
// THE NORMAL READER ROUTE, NOT A SHORTCUT (Roman) — Library -> book -> #zoomReadBtn -> Read ->
// #bakedOASEnterBtn -> real Genesis unlock (#buGoBtn, real charge/gate) -> OAS entry. Genesis
// unlock IS the real, required step this starter's own reader takes to reach OAS/CG play — it is
// never bypassed or substituted here; reachBakedScene1 + unlockGenesisAndReachOas together ARE
// that real route, not an alternate path around it.
section('CG/OAS CONTROL 1 — the normal First Sacrifice reader route (Library -> Read -> real Genesis unlock -> OAS): seed facets resolve, zero portfolio commit');
{
  const ctx = {};
  const page = await newStubbedPage(browser, ctx, greenBible());
  const reached = await reachBakedScene1('CG1', page);
  if (reached) {
    const oasOk = await unlockGenesisAndReachOas('CG1', page, ctx);
    if (oasOk) {
      const diag = await page.evaluate(() => {
        const id = window._resolvePcIdentity(window.state);
        const idx = window._facetIndex(window.state, { sceneNumber: 2 });
        const facets = window._resolveFacetIndexEntry({ id: 'pc', label: 'Lirael', aliases: ['Lirael'] }, idx, 2);
        return { resolvedLabel: id && id.v, playerName: window.state.playerName, idxKeys: Object.keys(idx), pcFacetsResolved: facets.map(f => f.facet_id), pcPortfolioExists: !!window.state._pcPortfolio };
      });
      note('CG1 diagnostic: ' + JSON.stringify(diag));
      ok('CG1 [ROOT-CAUSE FIX] _resolvePcIdentity resolves "Lirael" at real OAS entry (was null before the fix)', diag.resolvedLabel === 'Lirael' && diag.playerName === 'Lirael', JSON.stringify(diag));
      ok('CG1 the seed\'s own two facets (pc_untested_brilliance, pc_fears_public_failure) resolve via _facetIndex/_resolveFacetIndexEntry, with ZERO portfolio commit', ['pc_untested_brilliance', 'pc_fears_public_failure'].every(id => diag.pcFacetsResolved.indexOf(id) !== -1), JSON.stringify(diag.pcFacetsResolved));
      const validatedMergeDiag = await page.evaluate(() => !!(window.state._pcPortfolio && window.state._pcPortfolio.provenance && window.state._pcPortfolio.provenance.validatedMerge));
      ok('CG1 no validated-merge commit happened in this scenario (isolates identity fix from the new provider)', validatedMergeDiag === false, 'pcPortfolioExists=' + diag.pcPortfolioExists + ' validatedMerge=' + validatedMergeDiag);
    } else {
      ok('CG1 reached real OAS-active state', false);
    }
  } else {
    ok('CG1 reached baked Scene 1', false);
  }
  await page.context().close();
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// CG/OAS CONTROL 2 (Roman, corrective follow-up #9, 2026-09-15) — SELF-HEALING on a pre-fix-style
// corrupted saved state, with NO new Genesis/begin flow re-run. Reaches real OAS-active through
// the SAME one real, required Genesis unlock CG1 uses (there is no other route to a genuinely
// unlocked mid-story state for this starter), THEN corrupts state.playerName in place to the
// REAL placeholder string handleBeginStory's pre-#8 bug actually produced ("The Protagonist") —
// simulating exactly what a story SAVED BEFORE corrective follow-up #8 would have persisted in
// state.playerName. This is direct state assignment used to construct a precondition (a
// documented simulation of a historical corruption, not a re-enactment of the bug), never to
// force the mechanism under test — the RESOLVER and the downstream real CG click chain
// (driveOasToInterruptionSubmit) run completely unmodified, unaware the field was hand-set, and
// no Genesis/begin call fires a second time anywhere in this scenario.
// ══════════════════════════════════════════════════════════════════════════════════════════
section('CG/OAS CONTROL 2 — pre-fix-style corrupted saved state (state.playerName="The Protagonist") self-heals, no new begin flow');
{
  const ctx = {};
  const page = await newStubbedPage(browser, ctx, greenBible());
  const reached = await reachBakedScene1('CG2', page);
  let commit = null;
  if (reached) {
    // A validated, committed portfolio BEFORE unlock (same as CG3) — the seed's OWN two facets
    // are structurally ungroundable as shipped (plain-string possible_pressures, no
    // evidence_requires — a real, separate, already-disclosed content gap from earlier in this
    // session, unrelated to identity resolution), so a merged facet is what makes a REAL delivery
    // check through this corrupted-then-self-healed state meaningful, not just resolution.
    await page.evaluate(async () => { await window._generatePCBodyBible(); });
    commit = await page.evaluate(() => window._commitValidatedPcFoundation(window.state, window.state.pcBodyBible));
    note('CG2 pre-unlock commit: ' + JSON.stringify(commit));
    ok('CG2 real commit succeeds before Genesis unlock', commit && commit.committed === true, JSON.stringify(commit));
    const oasOk = await unlockGenesisAndReachOas('CG2', page, ctx);
    if (oasOk) {
      const preCorrupt = await page.evaluate(() => window.state.playerName);
      ok('CG2 real state.playerName is genuinely "Lirael" before the simulated corruption (proves the corruption below is real interference, not a no-op)', preCorrupt === 'Lirael', preCorrupt);

      await page.evaluate(() => {
        // SIMULATED PRE-FIX SAVE STATE — the real placeholder string corrective follow-up #8's
        // bug actually produced (confirmed via this session's own real instrumented trace),
        // written directly to simulate what a pre-fix save's persisted state.playerName held.
        window.state.playerName = 'The Protagonist';
      });
      const diag = await page.evaluate(() => {
        const id = window._resolvePcIdentity(window.state);
        const idx = window._facetIndex(window.state, { sceneNumber: 2 });
        const facets = window._resolveFacetIndexEntry({ id: 'pc', label: 'Lirael', aliases: ['Lirael'] }, idx, 2);
        return { resolvedLabel: id && id.v, resolvedSrc: id && id.src, corruptedPlayerName: window.state.playerName, pcFacetsResolved: facets.map(f => f.facet_id) };
      });
      note('CG2 diagnostic after simulated corruption: ' + JSON.stringify(diag));
      ok('CG2 [SELF-HEAL] _resolvePcIdentity resolves "Lirael" from the SEED, actively overriding the corrupted state.playerName', diag.resolvedLabel === 'Lirael' && diag.corruptedPlayerName === 'The Protagonist', JSON.stringify(diag));
      ok('CG2 [SELF-HEAL] the resolution source is starterSeed.cast.PC.name, NOT state.playerName (the corrupted field)', diag.resolvedSrc === 'starterSeed.cast.PC.name', diag.resolvedSrc);
      const mergedIds = (commit && commit.mergedFacetIds) || [];
      ok('CG2 [SELF-HEAL] _facetIndex still resolves the seed\'s own facets despite the corrupted playerName', ['pc_untested_brilliance', 'pc_fears_public_failure'].every(id => diag.pcFacetsResolved.indexOf(id) !== -1), JSON.stringify(diag.pcFacetsResolved));
      ok('CG2 [SELF-HEAL] _facetIndex also still resolves the merged validated facets despite the corrupted playerName', mergedIds.every(id => diag.pcFacetsResolved.indexOf(id) !== -1), JSON.stringify({ mergedIds, resolved: diag.pcFacetsResolved }));

      // Real CG payload check FROM this corrupted-then-self-healed state — no second Genesis/begin call.
      const beforeCg = ctx.cgRequests.length;
      const gotRequest = await driveOasToInterruptionSubmit('CG2', page, ctx, async (p) => {
        return p.evaluate(() => {
          window._ensureStoryEntityAnchors();
          const accepted = window._acceptStageProposal('2', {
            present: ['pc'], location: { label: 'the assembly hall, before the gathered First Favored' },
            issued_facts: [{ text: 'The presiding Dohkar has not yet ruled on the charge against her.', participants: [{ ref: 'pc', role: 'subject' }] }],
            issued_objects: [], exclusions: { locations: [], objects: [] }, affordances: [],
            source: 'pc-foundation-cg2-selfheal-proof',
          });
          return { acceptedOk: accepted.ok, acceptedWhy: accepted.why, playerNameStillCorrupted: window.state.playerName === 'The Protagonist' };
        });
      });
      const fired = gotRequest && ctx.cgRequests.length > beforeCg;
      ok('CG2 real Submit (from the corrupted-then-self-healed state, no new begin flow) fires a real cgScreenplay request', fired, 'cgRequests=' + ctx.cgRequests.length);
      if (fired) {
        const usr = ctx.cgRequests[ctx.cgRequests.length - 1].usr;
        // Read the REAL delivered record rather than assuming which of her two seed facets the
        // scheduler picked this turn (only one facet per candidate is delivered per scene, and
        // which one is not pinned by this fixture — same non-determinism already observed and
        // handled the same way in the GREEN CG scenario above).
        const delivered = await page.evaluate(() => ((window.state._cgDeliveredAssignments && window.state._cgDeliveredAssignments.character_plus) || []).map(c => ({ facet_id: c.facet_id, facet_truth: c.facet_truth })));
        note('CG2 real delivered record: ' + JSON.stringify(delivered));
        // Only the MERGED (validated-bible) facets are groundable — the seed's own two facets
        // ship with plain-string possible_pressures (no evidence_requires), a real, separate,
        // already-disclosed content gap unrelated to identity resolution; they structurally
        // cannot ground via _cpBuildGroundedOptions regardless of this fix.
        const pcDelivered = delivered.find(c => mergedIds.indexOf(c.facet_id) !== -1);
        const truthCount = pcDelivered ? usr.split('SOURCE TRUTH — DO NOT STATE: ' + pcDelivered.facet_truth).length - 1 : 0;
        ok('CG2 [SELF-HEAL] the merged validated facet was delivered this scene, from the self-healed identity', !!pcDelivered, JSON.stringify(delivered));
        ok('CG2 [SELF-HEAL] the delivered facet\'s truth reaches the real CG payload EXACTLY ONCE (delivery, not just resolution)', truthCount === 1, 'truthCount=' + truthCount);
      }
    } else {
      ok('CG2 reached real OAS-active state', false);
    }
  } else {
    ok('CG2 reached baked Scene 1', false);
  }
  await page.context().close();
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// CG/OAS CONTROL 3 (item 3) — Save & Exit -> reload -> Continue FROM an already-unlocked CG/OAS
// session (not the pre-unlock preview persistence phase above) — confirms BOTH identity
// resolution AND facet resolution survive a real reload while genuinely mid-story, not only
// portfolio persistence. Reuses realClickSaveReloadContinue (proven to work for #storySaveExitBtn
// and #gnSaveExitBtn both) after real Genesis unlock + a real commit.
// ══════════════════════════════════════════════════════════════════════════════════════════
section('CG/OAS CONTROL 3 — identity + facet resolution survive real Save & Exit -> reload -> Continue, from an unlocked CG/OAS session');
{
  const ctx = {};
  const page = await newStubbedPage(browser, ctx, greenBible());
  const reached = await reachBakedScene1('CG3', page);
  let commit = null;
  if (reached) {
    await page.evaluate(async () => { await window._generatePCBodyBible(); });
    commit = await page.evaluate(() => window._commitValidatedPcFoundation(window.state, window.state.pcBodyBible));
    note('CG3 pre-unlock commit: ' + JSON.stringify(commit));
    ok('CG3 real commit succeeds before Genesis unlock', commit && commit.committed === true, JSON.stringify(commit));
    const oasOk = await unlockGenesisAndReachOas('CG3', page, ctx);
    if (oasOk) {
      const before = await page.evaluate(() => {
        const id = window._resolvePcIdentity(window.state);
        const idx = window._facetIndex(window.state, { sceneNumber: 2 });
        const facets = window._resolveFacetIndexEntry({ id: 'pc', label: 'Lirael', aliases: ['Lirael'] }, idx, 2);
        return { resolvedLabel: id && id.v, pcFacetsResolved: facets.map(f => f.facet_id) };
      });
      note('CG3 pre-reload diagnostic: ' + JSON.stringify(before));
      const mergedIds = (commit && commit.mergedFacetIds) || [];
      ok('CG3 pre-reload: merged facets already resolve via _facetIndex', mergedIds.every(id => before.pcFacetsResolved.indexOf(id) !== -1), JSON.stringify(before));

      const reloadResult = await realClickSaveReloadContinue('CG3', page);
      const after = await page.evaluate(() => {
        const id = window._resolvePcIdentity(window.state);
        const idx = window._facetIndex(window.state, { sceneNumber: 2 });
        const facets = window._resolveFacetIndexEntry({ id: 'pc', label: 'Lirael', aliases: ['Lirael'] }, idx, 2);
        return { resolvedLabel: id && id.v, playerName: window.state.playerName, pcFacetsResolved: facets.map(f => f.facet_id), pcPortfolioFacetIds: (window.state._pcPortfolio && window.state._pcPortfolio.facets || []).map(f => f.facet_id) };
      });
      note('CG3 post-reload diagnostic: ' + JSON.stringify(after));
      ok('CG3 [REQUIREMENT 3] identity resolves to "Lirael" (not a placeholder) after a real reload + Continue from an unlocked CG session', after.resolvedLabel === 'Lirael', JSON.stringify(after));
      ok('CG3 [REQUIREMENT 3] the merged facet_ids still resolve via _facetIndex after the real reload', mergedIds.every(id => after.pcFacetsResolved.indexOf(id) !== -1), JSON.stringify(after));
      ok('CG3 [REQUIREMENT 3] the portfolio record itself still carries the merged facet_ids after reload', mergedIds.every(id => after.pcPortfolioFacetIds.indexOf(id) !== -1), JSON.stringify(after.pcPortfolioFacetIds));
    } else {
      ok('CG3 reached real OAS-active state before testing reload', false);
    }
  } else {
    ok('CG3 reached baked Scene 1', false);
  }
  await page.context().close();
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// IDENTITY CONTROL 4 (Roman, corrective follow-up #9, 2026-09-15) — an unrelated/unseeded story
// (no _starterId, or a _starterId with no STARTER_SEEDS entry) never acquires Lirael's identity
// or any other default. _pcIdentityCandidates' new first candidate is structurally null here (the
// STARTER_SEEDS[s._starterId] lookup itself returns nothing) — not a runtime check that could be
// wrong, the lookup has nothing to find. No Genesis unlock needed; this is a pure identity-
// resolution check against a real, freshly-booted app instance with a genuinely blank/unseeded
// story, reached the SAME way this file's own other proofs boot (server up, window.state real).
// ══════════════════════════════════════════════════════════════════════════════════════════
section('IDENTITY CONTROL 4 — an unrelated/unseeded story never acquires Lirael or any default identity');
{
  const ctx = {};
  const page = await newStubbedPage(browser, ctx, greenBible());
  const t0 = Date.now(); let up = false;
  while (Date.now() - t0 < 60000 && !up) {
    try { await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 }); await page.waitForFunction(() => window.state && window._resolvePcIdentity && window._facetIndex, null, { timeout: 30000 }); up = true; }
    catch (_) { await page.waitForTimeout(2000); }
  }
  ok('ID4 server reachable, real window.state present', up);
  if (up) {
    const diag = await page.evaluate(() => {
      // A genuinely blank/unseeded precondition — no _starterId at all, no identity fields set.
      // Direct state assignment here constructs the precondition (an unrelated story that was
      // never a fixed starter); it does not force the resolver or facet-index functions under
      // test, both of which run completely unmodified against it.
      window.state._starterId = null;
      window.state.playerName = '';
      window.state.name = '';
      window.state.identity = {};
      window.state.picks = window.state.picks || {};
      window.state.picks.identity = {};
      const id = window._resolvePcIdentity(window.state);
      const idx = window._facetIndex(window.state, { sceneNumber: 2 });
      const pcKeys = Object.keys(idx).filter(k => k.indexOf('pc:') === 0 || k === 'pc');
      return { resolved: id, idxKeys: Object.keys(idx), pcKeys };
    });
    note('ID4 diagnostic (unseeded, blank identity): ' + JSON.stringify(diag));
    ok('ID4 _resolvePcIdentity returns null for an unrelated/unseeded story (never "Lirael", never a placeholder treated as real)', diag.resolved === null, JSON.stringify(diag.resolved));
    ok('ID4 _facetIndex produces NO pc:* entry and no Lirael-sourced facet for this unrelated story', diag.pcKeys.length === 0, JSON.stringify(diag.pcKeys));

    // Also confirm a bogus _starterId (a starter key with no STARTER_SEEDS entry) behaves identically.
    const diag2 = await page.evaluate(() => {
      window.state._starterId = 'starter_does_not_exist_' + Date.now();
      const id = window._resolvePcIdentity(window.state);
      return { resolved: id };
    });
    note('ID4 diagnostic (bogus _starterId, no STARTER_SEEDS entry): ' + JSON.stringify(diag2));
    ok('ID4 a _starterId with no STARTER_SEEDS entry also resolves null (the seed lookup itself finds nothing, structurally)', diag2.resolved === null, JSON.stringify(diag2.resolved));
  }
  await page.context().close();
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// IDENTITY CONTROL 3 (Roman, corrective follow-up #9, 2026-09-15) — a real corridor "begin story"
// flow with a reader-typed name: confirm state.playerName ends up as that typed name (never
// overwritten by anything starter-related — corridor has no _starterId, so _pcIdentityCandidates'
// new first candidate is structurally absent), _resolvePcIdentity resolves it with
// src:'state.playerName' (never 'starterSeed.cast.PC.name'), and the identity survives
// handleBeginStory's REAL normalization pipeline (callNormalizationLayer + _syncRomanticTargetState,
// both exercised for real, stubbed only at the outbound provider boundary) unchanged. Calls the
// real, unmodified handleBeginStory() directly — the same "direct call to the real backend
// function under test" pattern already used throughout this file for _generatePCBodyBible/
// window.startBook2 — since no real click chain in this repo reaches corridor's own multi-step
// card-selection UI quickly, and driving that UI is not what corrective follow-up #9 touches.
// ══════════════════════════════════════════════════════════════════════════════════════════
section('IDENTITY CONTROL 3 — real corridor begin-story flow, reader-chosen name survives the real normalization pipeline unchanged');
{
  const ctx = {};
  const READER_NAME = 'Aria Thorne';
  const page = await newStubbedPage(browser, ctx, greenBible()); // greenBible() never fires here — no pcBodyBible call in this scenario
  const t0 = Date.now(); let up = false;
  while (Date.now() - t0 < 60000 && !up) {
    try { await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 }); await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', null, { timeout: 30000 }); up = true; }
    catch (_) { await page.waitForTimeout(2000); }
  }
  ok('ID3 server reachable, real handleBeginStory present', up);
  if (up) {
    const setup = await page.evaluate((name) => {
      const s = window.state;
      s._starterId = null; s.is_starter_story = false;
      s.storyId = 'corridor-id3-' + Date.now();
      s.picks = Object.assign(s.picks || {}, {
        world: 'Modern', worldSubtype: '', tone: 'Earnest', flavor: 'Contemporary', dynamic: 'Enemies',
        pov: 'first_person', length: 'fling', intensity: 'Steamy', playermask: 'OPEN_VEIN',
        archetype: { primary: 'BEAUTIFUL_RUIN' }, loveInterest: 'Male',
        identity: { playerName: name, partnerName: 'Marcus' },
      });
      s.archetype = { primary: 'BEAUTIFUL_RUIN' }; s.gender = 'Female'; s.loveInterest = 'Male';
      s.storyLength = 'fling'; s.tier = 'fling'; s.access = 'sub'; s.subscribed = true; s.fortunes = 9999999;
      s._skipCorridorValidation = true; s.aPlot = s.aPlot || { goal: '' };
      return { playerNameBefore: s.playerName, identityPlayerName: s.picks.identity.playerName };
    }, READER_NAME);
    note('ID3 corridor setup: ' + JSON.stringify(setup));

    let threw = null;
    try { await page.evaluate(() => window.handleBeginStory()); } catch (e) { threw = String(e && e.message); }
    await page.waitForTimeout(2000);
    const diag = await page.evaluate(() => {
      const id = window._resolvePcIdentity(window.state);
      return { playerName: window.state.playerName, resolvedLabel: id && id.v, resolvedSrc: id && id.src, normalizedKernel: window.state.normalizedPlayerKernel };
    });
    note('ID3 post-handleBeginStory diagnostic: ' + JSON.stringify(diag) + (threw ? ' (threw: ' + threw + ')' : ''));
    ok('ID3 handleBeginStory() completed (threw=' + threw + ')', !threw, threw || '');
    ok('ID3 [REQUIREMENT] state.playerName ends up as exactly the reader-typed name after the real normalization pipeline', diag.playerName === READER_NAME, JSON.stringify(diag));
    ok('ID3 [REQUIREMENT] _resolvePcIdentity resolves it with src="state.playerName", never starterSeed.cast.PC.name', diag.resolvedLabel === READER_NAME && diag.resolvedSrc === 'state.playerName', JSON.stringify(diag));
  }
  await page.context().close();
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// REQUIREMENT 6 — ISSUE TRANSITION CARRY (window.startBook2(), real First Sacrifice, real merge)
// window._book2TestBypass is a PRODUCTION-SHIPPED headless-test flag (app.js ~79994, its own
// comment: "startBook2's real Book-1->Book-2 continuity path can't be driven headless because
// [_archiveAndShowInterstitial] reads StoryPagination, renders a cover image, opens a modal, and
// builds interstitial DOM... When window._book2TestBypass is set, lock the essential state...and
// return no-op DOM stubs so startBook2 proceeds through the REAL title/blurb/Scene-1 gen + carry."
// This is not a harness shortcut around the mechanism under test — it is production's own
// sanctioned way to drive it without a live archive/cover UI, authorized here exactly because
// window.startBook2() IS the mechanism under test itself.
// ══════════════════════════════════════════════════════════════════════════════════════════
section('REQUIREMENT 6 — ISSUE TRANSITION: window.startBook2() carries the validated PC foundation (real First Sacrifice, real merge, real transition)');
{
  const ctx = {};
  const page = await newStubbedPage(browser, ctx, greenBible());
  const reached = await reachBakedScene1('BOOK2', page);
  if (reached) {
    const genRes = await page.evaluate(async () => { try { await window._generatePCBodyBible(); return true; } catch (e) { return false; } });
    ok('BOOK2 _generatePCBodyBible() completed', genRes);
    const before = await page.evaluate(() => {
      const bible = window.state.pcBodyBible;
      const commit = window._commitValidatedPcFoundation(window.state, bible);
      return { commit, storyIdBefore: window.state.storyId, seedIdBefore: window.state._pcPortfolio && window.state._pcPortfolio.provenance && window.state._pcPortfolio.provenance.seedId };
    });
    note('BOOK2 pre-transition commit: ' + JSON.stringify(before.commit));
    ok('BOOK2 real commit succeeds before the transition', before.commit.committed === true, JSON.stringify(before.commit));
    note('BOOK2 seedIdBefore (from rec.provenance.seedId, stamped at commit time from seed.id||seed.seedId): ' + JSON.stringify(before.seedIdBefore)
      + ' — DIAGNOSTIC: real STARTER_SEEDS.starter_first_sacrifice (public/app.js ~126875) defines no top-level id/seedId field at all (grep-confirmed), so this is expected to be empty for EVERY real fixed-starter portfolio, not just this run.');

    const consoleBefore = ctx.consoleEvents.length;
    const transition = await page.evaluate(async () => {
      // ── PRECONDITION, NOT A SHORTCUT (Roman, requirement 6) — startBook2() snapshots
      // state.main_characters_locked into a local BEFORE _archiveAndShowInterstitial()'s own
      // window._book2TestBypass branch would otherwise populate it, so calling the bypass alone
      // crashes with "Cannot read properties of null (reading 'playerName')" at the very first
      // callChat use of that snapshot — a real, disclosed ordering quirk in production's own
      // bypass code (app.js ~79994), confirmed by a standalone diagnostic before this fix. This
      // populates the SAME shape the bypass itself would set, one step earlier, so the snapshot
      // it captures is non-null — never a substitute for or bypass of the real carry logic below.
      window.state.main_characters_locked = window.state.main_characters_locked || {
        playerName: window.state.picks?.identity?.playerName || window.state.playerName || 'Lirael',
        partnerName: window.state.picks?.identity?.partnerName || 'Julian',
        displayPlayerName: window.state.picks?.identity?.displayPlayerName || window.state.playerName || 'Lirael',
        displayPartnerName: window.state.picks?.identity?.displayPartnerName || 'Julian',
        playerGender: window.state.gender || 'Female', partnerGender: window.state.loveInterest || 'Male',
        playerPronouns: window.state.authorPronouns || 'She/Her', partnerPronouns: 'He/Him',
      };
      window._book2TestBypass = true;
      window._book2TestContinuity = 'Book 1 ended on a cliffhanger: the inquiry into her conduct looms.';
      try { await window.startBook2(); return { ok: true }; } catch (e) { return { ok: false, error: String(e && e.message) }; }
    });
    await page.waitForTimeout(2000);
    ok('BOOK2 window.startBook2() (test-bypass) completed without throwing', transition.ok, JSON.stringify(transition));
    const carryLogs = ctx.consoleEvents.slice(consoleBefore).filter(e => /ISSUE-CONTINUITY.*PC foundation/.test(e.text)).map(e => e.text);
    note('BOOK2 carry-related console lines: ' + JSON.stringify(carryLogs));
    ok('REQUIREMENT 6 — the real "[ISSUE-CONTINUITY] carried the validated PC foundation across the issue boundary" log fired',
      carryLogs.some(t => /carried the validated PC foundation across the issue boundary/.test(t)), JSON.stringify(carryLogs));

    const after = await page.evaluate((mergedIds) => {
      const rec = window.state._pcPortfolio;
      return {
        storyIdAfter: window.state.storyId,
        pcPortfolio: rec,
        hasAllMergedIds: !!rec && Array.isArray(rec.facets) && mergedIds.every(id => rec.facets.some(f => f.facet_id === id)),
      };
    }, before.commit.mergedFacetIds || []);
    ok('REQUIREMENT 6 — storyId actually changed across the transition', after.storyIdAfter && after.storyIdAfter !== before.storyIdBefore, before.storyIdBefore + ' -> ' + after.storyIdAfter);
    ok('REQUIREMENT 6 — the SAME merged facet_ids are present under the NEW storyId', after.hasAllMergedIds, JSON.stringify(after.pcPortfolio && after.pcPortfolio.facets && after.pcPortfolio.facets.map(f => f.facet_id)));
    ok('REQUIREMENT 6 — the carried record is re-stamped to the NEW storyId, not left on the old one',
      !!after.pcPortfolio && after.pcPortfolio.storyId === after.storyIdAfter, JSON.stringify(after.pcPortfolio && after.pcPortfolio.storyId));

    // ── ITEM 4 — CG-PATH FACET RESOLUTION POST-TRANSITION, VIA A REAL CLICK-DRIVEN SUBMIT ──
    // state._starterId survives the transition (required for the seedId-carry fix) — Book2 mounts
    // back into the SAME baked-preview template as a result, with #bakedOASEnterBtn present again,
    // rather than a directly-submittable reader. Discovered empirically (this run's own probe);
    // driven through with the SAME real Genesis-unlock chain used everywhere else in this file.
    let probe = await page.evaluate(() => {
      const btnIds = Array.from(document.querySelectorAll('button[id]')).filter(b => b.getClientRects().length > 0 && !b.disabled).map(b => b.id);
      return { screen: window._currentScreenId, starterId: window.state._starterId, turnCount: window.state.turnCount, cgMode: (typeof window._shouldUseCGScreenplayPath === 'function') ? window._shouldUseCGScreenplayPath() : 'n/a', btnIds };
    });
    note('BOOK2 post-transition screen probe: ' + JSON.stringify(probe));
    if (probe.btnIds.indexOf('bakedOASEnterBtn') !== -1) {
      note('BOOK2 [REQUIREMENT 4] #bakedOASEnterBtn present post-transition — Book2 needs its own real Genesis-unlock pass before a submit affordance exists.');
      const oasOk = await unlockGenesisAndReachOas('BOOK2', page, ctx);
      ok('BOOK2 [REQUIREMENT 4] real Genesis unlock for Book2 itself succeeds, reaching OAS-active', oasOk);
      probe = await page.evaluate(() => {
        const btnIds = Array.from(document.querySelectorAll('button[id]')).filter(b => b.getClientRects().length > 0 && !b.disabled).map(b => b.id);
        return { screen: window._currentScreenId, btnIds };
      });
      note('BOOK2 post-unlock screen probe: ' + JSON.stringify(probe));
    }
    ok('BOOK2 [REQUIREMENT 4] real Genesis unlock landed in gnReader (OAS active)', probe.screen === 'gnReader', JSON.stringify(probe));
    if (probe.screen === 'gnReader') {
      const beforeCg = ctx.cgRequests.length, beforeAuthor = ctx.authorPayloads.length;
      const gotRequest = await driveOasToInterruptionSubmit('BOOK2', page, ctx, async (p) => {
        return p.evaluate(() => {
          window._ensureStoryEntityAnchors();
          const n = Math.max((Array.isArray(window.state.scenes) ? window.state.scenes.length : 0), (window.state.turnCount || 0)) + 1;
          const accepted = window._acceptStageProposal(String(n), {
            present: ['pc'], location: { label: 'the new hall' },
            issued_facts: [{ text: 'The presiding Dohkar has not yet ruled on the charge against her.', participants: [{ ref: 'pc', role: 'subject' }] }],
            issued_objects: [], exclusions: { locations: [], objects: [] }, affordances: [],
            source: 'pc-foundation-book2-cg-proof',
          });
          return { sceneNum: n, acceptedOk: accepted.ok, acceptedWhy: accepted.why };
        });
      });
      const fired = gotRequest && (ctx.cgRequests.length > beforeCg || ctx.authorPayloads.length > beforeAuthor);
      ok('BOOK2 [REQUIREMENT 4] real Submit fires a real request (cgScreenplay or author)', fired, 'cgRequests=' + ctx.cgRequests.length + ' authorPayloads=' + ctx.authorPayloads.length);
      if (fired) {
        const usedCg = ctx.cgRequests.length > beforeCg;
        const last = usedCg ? ctx.cgRequests[ctx.cgRequests.length - 1] : ctx.authorPayloads[ctx.authorPayloads.length - 1];
        const payloadText = last.sys + '\n' + last.usr;
        const mergedIds = before.commit.mergedFacetIds || [];
        const delivered = await page.evaluate((usedCg) => {
          const cp = usedCg ? ((window.state._cgDeliveredAssignments && window.state._cgDeliveredAssignments.character_plus) || [])
            : ((window.state.sceneSkeleton && window.state.sceneSkeleton.character_plus) || []);
          return cp.map(c => ({ facet_id: c.facet_id, facet_truth: c.facet_truth }));
        }, usedCg);
        note('BOOK2 post-transition delivered (via ' + (usedCg ? 'cgScreenplay' : 'author') + '): ' + JSON.stringify(delivered));
        const pcDelivered = delivered.find(c => mergedIds.indexOf(c.facet_id) !== -1);
        if (pcDelivered) {
          const truthCount = payloadText.split('SOURCE TRUTH — DO NOT STATE: ' + pcDelivered.facet_truth).length - 1;
          ok('BOOK2 [REQUIREMENT 4] the merged facet_truth appears EXACTLY ONCE in the real post-transition payload', truthCount === 1, 'count=' + truthCount + ' via=' + (usedCg ? 'cgScreenplay' : 'author'));
        } else {
          ok('BOOK2 [REQUIREMENT 4] the merged PC facet was delivered post-transition', false, 'delivered=' + JSON.stringify(delivered) + ' mergedIds=' + JSON.stringify(mergedIds));
        }
        const leakPatterns = ['"basis"', '"cites"', 'approved_facet:', 'approved_bio', 'approved_relationship', 'approved_scene1', 'approved_posture', '_provenance'];
        const leakHits = leakPatterns.filter(p => payloadText.indexOf(p) !== -1);
        ok('BOOK2 [REQUIREMENT 4] ZERO raw provenance internals leak into the post-transition payload', leakHits.length === 0, 'leaked=' + JSON.stringify(leakHits));
      }
    }
  } else {
    ok('BOOK2 reached baked Scene 1 to set up the transition', false);
  }
  await page.context().close();
}

section('REQUIREMENT 6 — NEGATIVE CONTROL: a story that NEVER had a validated merge does not fabricate a carry across its own transition');
{
  const ctx = {};
  const page = await newStubbedPage(browser, ctx, greenBible());
  const reached = await reachBakedScene1('BOOK2-NEG', page);
  if (reached) {
    // Deliberately NO _generatePCBodyBible() / NO _commitValidatedPcFoundation() call here — this
    // story's state._pcPortfolio either does not exist yet or, if something else built it, carries
    // no provenance.validatedMerge stamp. This is the DISTINCT negative case the requirement asks
    // for: a real session with real state that legitimately has nothing to carry.
    const portfolioBefore = await page.evaluate(() => window.state._pcPortfolio || null);
    ok('BOOK2-NEG no validated-merge portfolio exists before the transition', !portfolioBefore || !portfolioBefore.provenance || !portfolioBefore.provenance.validatedMerge, JSON.stringify(portfolioBefore));

    const consoleBefore = ctx.consoleEvents.length;
    const transition = await page.evaluate(async () => {
      window.state.main_characters_locked = window.state.main_characters_locked || {
        playerName: window.state.picks?.identity?.playerName || window.state.playerName || 'Lirael',
        partnerName: window.state.picks?.identity?.partnerName || 'Julian',
        displayPlayerName: window.state.picks?.identity?.displayPlayerName || window.state.playerName || 'Lirael',
        displayPartnerName: window.state.picks?.identity?.displayPartnerName || 'Julian',
        playerGender: window.state.gender || 'Female', partnerGender: window.state.loveInterest || 'Male',
        playerPronouns: window.state.authorPronouns || 'She/Her', partnerPronouns: 'He/Him',
      };
      window._book2TestBypass = true;
      window._book2TestContinuity = 'Book 1 ended on a cliffhanger.';
      try { await window.startBook2(); return { ok: true }; } catch (e) { return { ok: false, error: String(e && e.message) }; }
    });
    await page.waitForTimeout(2000);
    ok('BOOK2-NEG window.startBook2() (test-bypass) completed without throwing', transition.ok, JSON.stringify(transition));
    const carryLogs = ctx.consoleEvents.slice(consoleBefore).filter(e => /ISSUE-CONTINUITY.*PC foundation/.test(e.text)).map(e => e.text);
    note('BOOK2-NEG carry-related console lines: ' + JSON.stringify(carryLogs));
    ok('REQUIREMENT 6 — NEGATIVE CONTROL: no "carried the validated PC foundation" log fired (nothing existed to carry)',
      !carryLogs.some(t => /carried the validated PC foundation across the issue boundary/.test(t)), JSON.stringify(carryLogs));
    const after = await page.evaluate(() => window.state._pcPortfolio || null);
    ok('REQUIREMENT 6 — NEGATIVE CONTROL: post-transition portfolio (if any) carries no validatedMerge stamp — nothing fabricated',
      !after || !after.provenance || !after.provenance.validatedMerge, JSON.stringify(after));
  } else {
    ok('BOOK2-NEG reached baked Scene 1 to set up the negative control', false);
  }
  await page.context().close();
}

await browser.close();

// ══════════════════════════════════════════════════════════════════════════
// STRUCTURAL EVIDENCE (source-grep, not live-clicked) — historical context for what the gap USED
// TO BE (Run 2, before the pc_validated_portfolio provider existed), now paired with the
// empirical delivery checks above that test whether the new wiring actually closes it.
// ══════════════════════════════════════════════════════════════════════════
section('STRUCTURAL EVIDENCE — the gap Run 2 found, and the new provider that targets it (public/app.js, read directly)');
console.log(`
  PRIOR TO THIS PASS (Run 2, 2026-09-15): _facetIndex merged exactly two live providers —
  'seed' -> _seedFacetIndex and 'generated_cast' -> _generatedCastFacetIndex — and grep-confirmed
  nothing else read state._pcPortfolio.facets. _cgMintDeliveredAssignments (~226888) and the
  literary continuation path (~96685) both resolve facets through the SAME _cpContinuationAssignment
  -> _facetsForCharacter -> _facetIndex chain, so both shared one absence, not two independent ones.
  THIS PASS: a new provider, 'pc_validated_portfolio' -> _pcValidatedFacetIndex (~134346,
  registered in _FACET_PROVIDERS ~134388, directly after 'seed'), additively merges facets tagged
  origin:'pc_body_bible_validated' under the SAME 'pc:<slug>' canonical id _seedFacetIndex already
  uses — scoped to fixed-starter-only, story-matched, validatedMerge-stamped, fingerprint-checked
  material. The scenarios above are the empirical test of whether this closes the gap through both
  real consumption paths, not an assumption that it does.
`);

const allResults = results;
const p = allResults.filter(r => r.pass).length, f = allResults.length - p;
console.log('\n' + '='.repeat(70));
console.log('PC FOUNDATION REAL-PATH INTEGRATION PROOF: ' + p + ' passed, ' + f + ' failed (out of ' + allResults.length + ')');
console.log('MAXIMUM REQUEST COUNT PER pcBodyBible GENERATION (primary + up to ' + CALL_CAPS.bodyTellReroll + ' bodyTellReroll rerolls): 3 total.');
console.log('GREEN (CG) payload-phase observed: ' + JSON.stringify(greenOut && greenOut.payload && greenOut.payload.correlatedAttempts && greenOut.payload.correlatedAttempts.map(a => a.requestId)));
console.log('RED (CG) payload-phase observed: ' + JSON.stringify(redOut && redOut.payload && redOut.payload.correlatedAttempts && redOut.payload.correlatedAttempts.map(a => a.requestId)));
console.log('GREEN-LIT delivered: ' + JSON.stringify(greenLitOut && greenLitOut.payloadCheck && greenLitOut.payloadCheck.pcDelivered));
console.log('RED-LIT hits: ' + JSON.stringify(redLitOut && redLitOut.payloadCheck && redLitOut.payloadCheck.hits));
console.log('ZERO real network/provider calls were made — every /api/** answered locally in every scenario.');
if (f) process.exit(1);
process.exit(0);
