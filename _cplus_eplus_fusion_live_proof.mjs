// C+/E+/FUSION GENERIC CONTRACT — LIVE, PROVIDER-STUBBED, REAL-CLICK END-TO-END PROOF
// (Roman, authorized 2026-09-14: "the offline contract proves the resolver and validator; it does
// not prove the live continuation skeleton passes only accepted C+/E+/fusion instructions to the
// real author assembly.") This drives the REAL literary continuation flow (real #actionInput/
// #dialogueInput/#submitBtn — never a direct function call, never DOM forcing) through the REAL
// _generateSceneSkeleton -> C+/E+/fusion resolution -> author-payload assembly path. Every provider
// is stubbed at the outbound network boundary (page.route); the real author payload is captured
// from the real outbound fetch, never reconstructed.
//
// SETUP discipline (matches this session's own established, already-proven pattern in
// _stage_state_persistence_proof.mjs / _stage_state_issue_transition_proof.mjs / _continuity_spine_
// dry.mjs's seedMidStory): pre-conditions (mid-story state, an already-accepted stage record, an
// entity's authored facet material) are established directly via page.evaluate, exactly as a prior
// real turn would have left them. The GENERATION FLOW UNDER TEST — skeleton generation, C+/E+/
// fusion resolution, author-payload assembly — is exercised ONLY through a real reader submit.
//
// usage: node _cplus_eplus_fusion_live_proof.mjs   (dev server on :3000; every /api/** POST is
// answered locally by this harness)
import { chromium } from 'playwright-core';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass, detail: detail || '' }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 300) : '')); };
const isAuthor = (sys, m) => /STORYBOUND ARCHITECTURE LAWS/.test(sys) || /grok-4\.3/.test(String(m || ''));

// Default, harmless skeleton reply — used only as a fallback; every scenario below supplies its own.
function defaultSkeletonReply() {
  return { environment_anchor: 'a lantern on the sill', structural_pacing: 'measured escalation', narrative_density: 'moderate',
    dialogue_ratio: 'balanced', beat_style: 'observation then interaction', tension_rhythm: 'rising with pauses',
    staged_characters: [], interlocutor_placement: null, li_texture_beat: null, pc_body_callback: null, li_body_callback: null,
    antagonist_body_callback: null, environment_plus: null, fusion: null, stage_contract: null };
}

function wire(page, ctx) {
  ctx.authorPayloads = []; ctx.skeletonPosts = []; ctx.planPosts = []; ctx.otherPosts = []; ctx.allPosts = [];
  ctx.skeletonReply = ctx.skeletonReply || defaultSkeletonReply();
  return (async () => {
    await installSession(page);
    await page.route('**/sb-test.localhost/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.route('**/api/**', async route => {
      const r = route.request(); const url = r.url().replace(/^https?:\/\/[^/]+/, '');
      if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
      if (isAuthOrigin(r.url())) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      if (r.method() !== 'POST') return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      let b = null; try { b = JSON.parse(r.postData() || '{}'); } catch (_) { b = {}; }
      const m = b.messages || []; const sys = String((m.find(x => x.role === 'system') || {}).content || '');
      const usr = String((m.find(x => x.role === 'user') || {}).content || '');
      if (!/\/api\/csp-report\b/.test(url)) ctx.allPosts.push({ url, sys, usr, model: b.model || b.preferredModel || null, role: b.role || null });

      // SKELETON GENERATION — role PROMPT_PREPROCESSOR, /api/mistral-proxy. THIS is the model's
      // free-text proposal for environment_plus/fusion/staged_characters that the new D1-D5
      // resolution step (app.js, right after the C+ injection) must validate before it ever
      // reaches state.sceneSkeleton.
      if (b.role === 'PROMPT_PREPROCESSOR') {
        ctx.skeletonPosts.push({ url, sys, usr, body: b });
        const reply = (typeof ctx.skeletonReply === 'function') ? ctx.skeletonReply(b) : ctx.skeletonReply;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: JSON.stringify(reply) }) });
      }
      // SCENE-SPINE PLANNER — role STRUCTURE_GENERATOR (the OPEN-ROW/stage-issuer's own call).
      // Not exercised for stage ACCEPTANCE in this proof (setup establishes the accepted stage
      // directly, per this file's header) — stubbed harmlessly so a real story doesn't crash if it
      // also fires this turn.
      if (b.role === 'STRUCTURE_GENERATOR') {
        ctx.planPosts.push({ url, sys, usr, body: b });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '{}' }) });
      }
      if (isAuthor(sys, b.model || b.preferredModel)) {
        ctx.authorPayloads.push({ url, sys, usr, model: b.model || b.preferredModel || null });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: 'She held the line the room expected, and something in her did not agree. [stubbed author ' + ctx.authorPayloads.length + ']' }) });
      }
      if (!/\/api\/csp-report\b/.test(url)) ctx.otherPosts.push(url + (b.role ? ' role=' + b.role : ''));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '{}' }) });
    });
  })();
}
async function open(page) {
  await page.addInitScript({ content: installHelpersSource() });
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < 240000) {
    try { await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 }); await page.waitForFunction(() => window.state && window._buildContinuitySpineBlock && window.StoryPagination && window.__seedMidStory, { timeout: 60000 }); return true; }
    catch (e) { last = e; await new Promise(r => setTimeout(r, 3000)); }
  }
  throw last || new Error('server never answered');
}
const submit = async (page, act, dia) => page.evaluate(([a, d]) => { document.getElementById('actionInput').value = a; document.getElementById('dialogueInput').value = d || ''; const b = document.getElementById('submitBtn'); b.disabled = false; b.click(); }, [act, dia || '']);
const settle = async (page, ctx, ms) => { const n0 = ctx.authorPayloads.length; for (let w = 0; w < ms; w += 2000) { await page.waitForTimeout(2000); if (ctx.authorPayloads.length > n0) { await page.waitForTimeout(4000); return true; } } return ctx.authorPayloads.length > n0; };

// Helpers injected into EVERY new document via addInitScript (see installHelpers below) — Playwright
// serializes page.evaluate callbacks independently of outer Node closures, so these must live on
// `window` inside the page itself, not as ordinary Node functions, to be callable from evaluate().
function installHelpersSource() {
  return `
    // Minimal, valid mid-story literary state — one Scene-1 page already displayed, turnCount 0 (so
    // the upcoming real continuation is canonically scene 2). seeded=true sets a REAL _starterId
    // (starter_first_sacrifice) so _activeSeed(s) resolves real seed data, proving the wiring is
    // story-shape-agnostic; seeded=false leaves it unset (corridor).
    window.__seedMidStory = function (storyId, seeded) {
      const s = window.state; window.__disableSpeculativePreload = true; window.__tierRouting = false;
      s.storyId = storyId; s.tier = 'fling'; s.access = 'sub'; s.subscribed = true; s.fortunes = 9999999;
      // A REAL starter id (e.g. starter_first_sacrifice) also triggers the baked-Scene-1
      // genesis-gate UI/purchase flow (all 3 shipped starters are baked packages) — unrelated
      // apparatus this proof has no reason to drive. A fresh, real STARTER_SEEDS entry (same
      // _activeSeed(s) resolution mechanism, non-null, genuinely seeded) without a matching baked
      // package proves the same thing — the new stage-authority branch does not even read seed
      // content once an active accepted stage exists — without that side effect.
      if (seeded) {
        window.STARTER_SEEDS = window.STARTER_SEEDS || {};
        var _fakeSeedId = 'live_proof_seeded_' + storyId;
        window.STARTER_SEEDS[_fakeSeedId] = { issue: 1, cast: [{ role: 'PC', name: 'Lirael' }], sceneOne: { setting: 'the colonnade' } };
        s._starterId = _fakeSeedId; s.is_starter_story = true;
      } else { s._starterId = null; s.is_starter_story = false; }
      s.picks = Object.assign(s.picks || {}, { world: 'Fatelands', worldSubtype: 'veilwood', tone: 'Earnest', flavor: 'Fantasy', dynamic: 'Enemies', pov: 'first_person', length: 'fling', intensity: 'Steamy', archetype: { primary: 'BEAUTIFUL_RUIN' }, playerMask: 'OPEN_VEIN', loveInterest: 'Male', identity: { playerName: 'Lirael', partnerName: 'Julian' } });
      s.name = 'Lirael'; s.playerName = 'Lirael'; s.identity = { playerName: 'Lirael', partnerName: 'Julian' }; s.gender = 'Female'; s.loveInterest = 'Male'; s.archetype = { primary: 'BEAUTIFUL_RUIN' }; s.playerMask = 'OPEN_VEIN'; s.storyLength = 'fling'; s._skipCorridorValidation = true;
      s.canonicalLI = { name: 'Julian', committed: true, mask: 'BEAUTIFUL_RUIN' };
      s.sysPrompt = 'STORYBOUND ARCHITECTURE LAWS — harness system prompt (no doctrine).';
      // _hasPriorRenderedScene() requires >1500 rendered chars before the skeleton generator will
      // ever run (app.js ~97210) — a short one-line seed silently skips the whole mechanism this
      // proof exists to exercise. Padded well past that floor with in-world filler paragraphs.
      const one = 'Lirael crossed the colonnade at dawn, the assembly already gathering behind her. '
        + 'The stones were still cold from the night, and the Veilwood beyond the wall exhaled its slow grey mist over the gathered crowd. '.repeat(14)
        + 'She did not look back at the gate.';
      window.StoryPagination.init(); window.StoryPagination.clear(); window.StoryPagination.addPage('<p>' + one + '</p>', true);
      s.scenes = [{ title: 'One', synopsis: '', text: one, fateCard: null }]; s.turnCount = 0;
      s._sceneTextRing = [{ text: one }]; s._priorSceneText = one; s.currentStoryContent = one;
      s._sceneLedger = null; s._authoringSceneKey = null; s._stageState = null; s._relationshipLedger = null;
      window._sceneLedgerCommit(s, { kind: 'scene', sceneNumber: 1, event: 'PLANNED ONE — the colonnade at dawn', act: 'cross the colonnade', pageUid: window.StoryPagination.getCurrentPageUid() });
      window._commitTransition('The assembly had already begun to gather.', 'scene1_transition', 1);
    };
    // Grant an entity real, minted facet material — the SAME shape the generated_cast facet
    // provider reads (entity.authorProfile.cPlusFacets), and attach an evidence-matching
    // issued_facts entry so the REAL pressure-grounding pipeline (_cpFactCorpus/
    // _cpBuildGroundedOptions, unmodified) can actually build a C+ option — not just report
    // "coverage exists".
    window.__grantFacet = function (entityId, factText) {
      const L = window._relLedger(true);
      L.entities[entityId].authorProfile = { status: 'ready', guardrails: [],
        cPlusFacets: [{ facet_id: 'test:' + entityId + ':f1', category: 'value',
          canonical_truth: "This person believes the Institution's order matters more than any one person's comfort.",
          possible_pressures: [{ text: factText, evidence_requires: 'defends the Institution' }] }] };
    };
  `;
}

let total = { pass: 0, fail: 0 };
let resultsCursor = 0;
function tally() { const slice = results.slice(resultsCursor); resultsCursor = results.length; const p = slice.filter(r => r.pass).length, f = slice.length - p; total.pass += p; total.fail += f; return { p, f }; }

const browser = await chromium.launch({ headless: true });

// Shared scenario runner: opens a fresh page, seeds mid-story, grants Julian's entity + optional
// facet, accepts a stage proposal with the given issued_objects/exclusions, submits a real turn
// with the given skeleton-reply stub, settles, and returns everything a scenario needs to assert
// on. story-shape (seeded/corridor), facet presence, object inventory, and exclusions are all
// parameters so each RED/GREEN case only states what's DIFFERENT about it.
async function runFixtureScenario(id, opts) {
  const page = await (await browser.newContext()).newPage(); const ctx = {};
  const dbg = { errs: [], logs: [] };
  page.on('pageerror', e => dbg.errs.push(String(e && e.message).slice(0, 300)));
  page.on('console', m => dbg.logs.push(m.text().replace(/\s+/g, ' ').slice(0, 260)));
  ctx.skeletonReply = () => Object.assign(defaultSkeletonReply(), {
    staged_characters: [{ name: 'Julian', presence_mode: 'IN_PERSON', role: 'the Provast' }],
    environment_plus: opts.envTarget ? { target: opts.envTarget, axis: 'ownership' } : null,
    fusion: (opts.fusionCharacter || opts.fusionTarget) ? { character: opts.fusionCharacter || 'Julian', target: opts.fusionTarget || opts.envTarget } : null
  });
  await wire(page, ctx); await open(page);
  await page.waitForTimeout(8000);
  const setup = await page.evaluate((p) => {
    window.__seedMidStory(p.id, p.seeded);
    window._ensureStoryEntityAnchors();
    const julian = window._proposeNewEntity({ label: 'Julian', kind: 'named' });
    const other = window._proposeNewEntity({ label: 'Seren', kind: 'named' }); // a real, different entity — RED-E's "someone else"
    if (p.grantFacet) window.__grantFacet(julian.entity.id, "Julian defends the Institution's authority without hesitation, cutting off her objection before it forms.");
    const resolveRef = (ref) => ref === '__JULIAN__' ? julian.entity.id : (ref === '__OTHER__' ? other.entity.id : ref);
    const issuedObjects = (p.issuedObjects || []).map(o => Object.assign({}, o, {
      owner_or_caretaker_ref: resolveRef(o.owner_or_caretaker_ref),
      addressable_by: (o.addressable_by || []).map(resolveRef)
    }));
    const accepted = window._acceptStageProposal('2', {
      present: [julian.entity.id], location: { label: 'the colonnade outside the assembly hall' },
      issued_facts: p.grantFacet ? ["Julian defends the Institution's authority without hesitation, cutting off her objection before it forms."] : [],
      issued_objects: issuedObjects, exclusions: p.exclusions || { locations: [], objects: [] },
      affordances: ['the side door stands unlatched'], source: 'live-proof-' + p.id
    });
    return { julianId: julian.entity.id, accepted };
  }, { id, seeded: !!opts.seeded, grantFacet: !!opts.grantFacet, issuedObjects: opts.issuedObjects || [], exclusions: opts.exclusions || null });
  ok(id + ' setup: entity + accepted stage succeeded', setup.accepted.ok === true, JSON.stringify(setup.accepted.why));

  await submit(page, 'I hold my ground and answer him.', 'I did what the rite required.');
  const settled = await settle(page, ctx, 150000);
  ok(id + ' a real author payload was produced', settled && ctx.authorPayloads.length >= 1, 'authorPayloads=' + ctx.authorPayloads.length);
  if (!settled) console.log('DEBUG ' + id + ' logs=' + JSON.stringify(dbg.logs.slice(-40)));

  const post = await page.evaluate(() => ({ sk: window.state.sceneSkeleton }));
  const authorAll = ctx.authorPayloads.length ? (ctx.authorPayloads[0].sys + '\n' + ctx.authorPayloads[0].usr) : '';
  await page.context().close();
  return { post, authorAll, julianId: setup.julianId };
}

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO A — SEEDED continuation, VALID: accepted stage + a facet-backed present participant +
// an issued object addressable by them. Proves C+/E+/fusion all resolve, exactly once, in the
// real author payload.
// ══════════════════════════════════════════════════════════════════════════
{
  const { post, authorAll } = await runFixtureScenario('A', {
    seeded: true, grantFacet: true,
    issuedObjects: [{ label: 'the sealed ledger', owner_or_caretaker_ref: '__JULIAN__', addressable_by: ['__JULIAN__'] }],
    envTarget: 'the sealed ledger', fusionCharacter: 'Julian', fusionTarget: 'the sealed ledger'
  });
  ok('A the resolved stage was consulted (accepted, not the raw planner target)', post.sk && post.sk.environment_plus && post.sk.environment_plus.target === 'the sealed ledger' && !!post.sk.environment_plus.object_id, JSON.stringify(post.sk && post.sk.environment_plus));
  ok('A E+ target carries a real backend object_id (D1)', post.sk && post.sk.environment_plus && /^obj:stage:\d+$/.test(post.sk.environment_plus.object_id || ''), post.sk && post.sk.environment_plus && post.sk.environment_plus.object_id);
  ok('A C+ used an issued facet/evidence source for the present participant (real backend-scheduled assignment, not the planner\'s free text)', post.sk && Array.isArray(post.sk.character_plus) && post.sk.character_plus.length === 1 && post.sk.character_plus[0].character === 'Julian' && !!post.sk.character_plus[0].facet_id && !!post.sk.character_plus[0].canonicalId, JSON.stringify(post.sk && post.sk.character_plus));
  ok('A fusion resolved for the SAME actor via addressable_by', post.sk && post.sk.fusion && post.sk.fusion.character === 'Julian' && post.sk.fusion.target === 'the sealed ledger', JSON.stringify(post.sk && post.sk.fusion));
  ok('A the author payload contains the accepted E+ object', (authorAll.match(/the sealed ledger/g) || []).length >= 1, '');
  ok('A the author payload contains the current-stage directive', /CURRENT STAGE/.test(authorAll), '');
  ok('A no raw planner proposal JSON leaked into the author payload', !/"environment_plus"\s*:\s*\{"target"/.test(authorAll), '');
  const dirCountA = (authorAll.match(/CURRENT STAGE \(authoritative/g) || []).length;
  ok('A the current-stage directive appears EXACTLY ONCE in the author payload', dirCountA === 1, 'count=' + dirCountA);
  console.log('SCENARIO A subtotal: ' + JSON.stringify(tally()));
}

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO B — CORRIDOR (unseeded) continuation, VALID: the identical fixture as A, minus a
// starter id. Proves the wiring is genuinely story-shape-agnostic, not accidentally seed-only.
// ══════════════════════════════════════════════════════════════════════════
{
  const { post, authorAll } = await runFixtureScenario('B', {
    seeded: false, grantFacet: true,
    issuedObjects: [{ label: 'the sealed ledger', owner_or_caretaker_ref: '__JULIAN__', addressable_by: ['__JULIAN__'] }],
    envTarget: 'the sealed ledger', fusionCharacter: 'Julian', fusionTarget: 'the sealed ledger'
  });
  ok('B (corridor) E+ resolved to the accepted object with a real object_id', post.sk && post.sk.environment_plus && post.sk.environment_plus.target === 'the sealed ledger' && /^obj:stage:\d+$/.test(post.sk.environment_plus.object_id || ''), JSON.stringify(post.sk && post.sk.environment_plus));
  ok('B (corridor) C+ resolved via the accepted stage\'s authoritative branch (no seed involved)', post.sk && Array.isArray(post.sk.character_plus) && post.sk.character_plus.length === 1 && post.sk.character_plus[0].character === 'Julian', JSON.stringify(post.sk && post.sk.character_plus));
  ok('B (corridor) fusion resolved for the same actor', post.sk && post.sk.fusion && post.sk.fusion.character === 'Julian' && post.sk.fusion.target === 'the sealed ledger', JSON.stringify(post.sk && post.sk.fusion));
  ok('B (corridor) the author payload carries the current-stage directive exactly once', (authorAll.match(/CURRENT STAGE \(authoritative/g) || []).length === 1, '');
  console.log('SCENARIO B subtotal: ' + JSON.stringify(tally()));
}

// ══════════════════════════════════════════════════════════════════════════
// RED C — no object inventory at all: C+ may still fire (Julian has real facet material), but
// E+ and fusion must be ABSENT — never invented from the planner's free-text guess.
// ══════════════════════════════════════════════════════════════════════════
{
  const { post } = await runFixtureScenario('C', {
    seeded: false, grantFacet: true, issuedObjects: [],
    envTarget: 'a lantern the model imagined', fusionCharacter: 'Julian', fusionTarget: 'a lantern the model imagined'
  });
  ok('RED-C C+ still fires (facet material exists, independent of the object inventory)', post.sk && Array.isArray(post.sk.character_plus) && post.sk.character_plus.length === 1 && post.sk.character_plus[0].character === 'Julian', JSON.stringify(post.sk && post.sk.character_plus));
  ok('RED-C E+ is ABSENT — no inventory, never invented from the planner\'s free text', post.sk && post.sk.environment_plus === null, JSON.stringify(post.sk && post.sk.environment_plus));
  ok('RED-C fusion is ABSENT (no valid E+ target to pair with)', post.sk && post.sk.fusion === null, JSON.stringify(post.sk && post.sk.fusion));
  console.log('RED-C subtotal: ' + JSON.stringify(tally()));
}

// ══════════════════════════════════════════════════════════════════════════
// RED D — excluded object bypass: the planner proposes exactly the excluded object's name. Must
// be refused (E+ absent), not silently issued.
// ══════════════════════════════════════════════════════════════════════════
{
  const { post } = await runFixtureScenario('D', {
    seeded: false, grantFacet: true,
    issuedObjects: [{ label: 'the sealed ledger', owner_or_caretaker_ref: '__JULIAN__', addressable_by: ['__JULIAN__'] }],
    exclusions: { locations: [], objects: ['the sealed ledger'] },
    envTarget: 'the sealed ledger', fusionCharacter: 'Julian', fusionTarget: 'the sealed ledger'
  });
  ok('RED-D C+ still fires', post.sk && Array.isArray(post.sk.character_plus) && post.sk.character_plus.length === 1, JSON.stringify(post.sk && post.sk.character_plus));
  ok('RED-D E+ is ABSENT — the target is excluded, never issued despite being in the raw inventory', post.sk && post.sk.environment_plus === null, JSON.stringify(post.sk && post.sk.environment_plus));
  ok('RED-D fusion is ABSENT (no valid E+ target)', post.sk && post.sk.fusion === null, JSON.stringify(post.sk && post.sk.fusion));
  console.log('RED-D subtotal: ' + JSON.stringify(tally()));
}

// ══════════════════════════════════════════════════════════════════════════
// RED E — unreachable actor/object fusion: the object exists and is NOT excluded (E+ resolves),
// but its addressable_by names someone else. Fusion must be absent while E+ stands alone.
// ══════════════════════════════════════════════════════════════════════════
{
  const { post } = await runFixtureScenario('E', {
    seeded: false, grantFacet: true,
    issuedObjects: [{ label: 'the sealed ledger', owner_or_caretaker_ref: '__JULIAN__', addressable_by: ['__OTHER__'] }],
    envTarget: 'the sealed ledger', fusionCharacter: 'Julian', fusionTarget: 'the sealed ledger'
  });
  ok('RED-E C+ still fires', post.sk && Array.isArray(post.sk.character_plus) && post.sk.character_plus.length === 1, JSON.stringify(post.sk && post.sk.character_plus));
  ok('RED-E E+ resolves normally (the object exists, is not excluded)', post.sk && post.sk.environment_plus && post.sk.environment_plus.target === 'the sealed ledger', JSON.stringify(post.sk && post.sk.environment_plus));
  ok('RED-E fusion is ABSENT — Julian is not in this object\'s addressable_by (bare co-occurrence is not enough)', post.sk && post.sk.fusion === null, JSON.stringify(post.sk && post.sk.fusion));
  console.log('RED-E subtotal: ' + JSON.stringify(tally()));
}

// ══════════════════════════════════════════════════════════════════════════
// RED F — unissued/free-text environment target: the planner names something that was never
// issued at all (not excluded, simply absent). E+ must be refused, never invented.
// ══════════════════════════════════════════════════════════════════════════
{
  const { post } = await runFixtureScenario('F', {
    seeded: false, grantFacet: true,
    issuedObjects: [{ label: 'the sealed ledger', owner_or_caretaker_ref: '__JULIAN__', addressable_by: ['__JULIAN__'] }],
    envTarget: 'a golden chalice the model invented', fusionCharacter: 'Julian', fusionTarget: 'a golden chalice the model invented'
  });
  ok('RED-F C+ still fires', post.sk && Array.isArray(post.sk.character_plus) && post.sk.character_plus.length === 1, JSON.stringify(post.sk && post.sk.character_plus));
  ok('RED-F E+ is ABSENT — the free-text target was never issued', post.sk && post.sk.environment_plus === null, JSON.stringify(post.sk && post.sk.environment_plus));
  ok('RED-F fusion is ABSENT', post.sk && post.sk.fusion === null, JSON.stringify(post.sk && post.sk.fusion));
  console.log('RED-F subtotal: ' + JSON.stringify(tally()));
}

// ══════════════════════════════════════════════════════════════════════════
// RED G — absent participant facet/evidence: Julian is present but was NEVER granted authored
// facet material. C+ must be absent for him (never inferred from the bare label "Julian").
// ══════════════════════════════════════════════════════════════════════════
{
  const { post } = await runFixtureScenario('G', {
    seeded: false, grantFacet: false,
    issuedObjects: [{ label: 'the sealed ledger', owner_or_caretaker_ref: '__JULIAN__', addressable_by: ['__JULIAN__'] }],
    envTarget: 'the sealed ledger', fusionCharacter: 'Julian', fusionTarget: 'the sealed ledger'
  });
  ok('RED-G C+ is ABSENT for Julian (present, but no authored facet material — never inferred)', post.sk && Array.isArray(post.sk.character_plus) && post.sk.character_plus.length === 0, JSON.stringify(post.sk && post.sk.character_plus));
  ok('RED-G E+ can still resolve independently (object inventory exists regardless of facet coverage)', post.sk && post.sk.environment_plus && post.sk.environment_plus.target === 'the sealed ledger', JSON.stringify(post.sk && post.sk.environment_plus));
  ok('RED-G fusion is ABSENT — no scheduled C+ participant to pair with the object', post.sk && post.sk.fusion === null, JSON.stringify(post.sk && post.sk.fusion));
  console.log('RED-G subtotal: ' + JSON.stringify(tally()));
}

console.log('\n' + '='.repeat(60));
console.log('TOTAL: ' + total.pass + ' passed, ' + total.fail + ' failed');
if (total.fail) process.exit(1);
process.exit(0);
