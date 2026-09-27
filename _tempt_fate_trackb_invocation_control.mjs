// TRACK B CONTROL — accepted-invocation records, through the real acceptance-to-continuation path.
// Zero provider requests. Automatic extraction and commitment stay DISABLED throughout.
//
// What this proves, and why each matters:
//   1. EVERY accepted active invocation creates exactly ONE unresolved record — including when the
//      invoker resolves cleanly. The earlier plan made the record a consequence of an invoker
//      defect; that would have recorded nothing on the normal path, which is the case that matters.
//   2. CONTINUATION PROCEEDS. A second real generation runs with a record outstanding.
//   3. DOWNSTREAM GETS NO EFFECT ASSUMPTIONS — the real directive refuses both readings, scopes its
//      prohibition to the wish, and never claims the wish text is current canon.
//   4. An UNRESOLVED INVOKER is reviewable and does not stop the story.
//   5. Human resolution / dismissal APPEND without altering the original record or the scene.
//   6. MIGRATION converts only on proof of acceptance; stale / pre-acceptance / missing-scene /
//      cross-story records are invalidated with their reason and fabricate NO invocation. Idempotent.
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (m, c, d) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (d ? '  [' + d + ']' : '')); } };
const section = (t) => console.log('\n=== ' + t + ' ===');

(async () => {
  console.log('=== TRACK B: ACCEPTED-INVOCATION RECORDS (real path, zero provider requests) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_trackb_control_out.jsonl') });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && typeof window._runCGScreenplayGen === 'function'
    && typeof window._cgTemptFateCommitAtPersistence === 'function'
    && typeof window._recordTemptFateEvent === 'function'
    && typeof window._tfoRecordAcceptedInvocation === 'function'
    && typeof window._tfoUnresolvedInvocations === 'function'
    && typeof window._tfoInvocationStatus === 'function'
    && typeof window._tfoResolveInvocationByHuman === 'function'
    && typeof window._tfoDismissInvocation === 'function'
    && typeof window._tfoMigratePendingToInvocations === 'function'
    && typeof window._buildTemptFateUnresolvedInvocationDirective === 'function'
    && typeof window._buildTemptFateDurableConsequenceDirective === 'function'
    && typeof window._tfoContinuationBlocked === 'function', { timeout: 30000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: ' + (e && e.message)); await browser.close(); process.exit(2); });

  let _planFields = {};
  gate.stub('/api/proxy', async () => ({
    choices: [{ message: { content: JSON.stringify(Object.assign({
      beats: [
        { idx: 0, kind: 'narration', text: 'The air stills and the voices falter.', speaker: null },
        { idx: 1, kind: 'dialogue', text: '"What gathering is this?"', speaker: 'the presiding Dohkar' }
      ],
      panels: [], visualState: {}, phases: [], sceneCharge: {}, microDecision: null
    }, _planFields)) } }],
    usage: { prompt_tokens: 10, completion_tokens: 10 }
  }));
  gate.stub('/api/mistral-proxy', () => ({ content: null }));

  async function baseline(storyId) {
    await page.evaluate((sid) => {
      const s = window.state;
      s.picks = { world: 'Fantasy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
      s.storyId = sid; s.storyLength = 'fling'; s.turnCount = 3;
      s.playerName = 'Lirael'; s.loveInterestName = 'Julian'; s.currentPrimaryLiId = 'julian';
      s.scenes = [];
      s._temptFateDurableConsequences = [];
      s._temptOutcomeCommittedProposals = {};
      s._temptOutcomePending = {};
      s._temptFateInvocations = [];
      s._temptFateInvocationResolutions = [];
      s._temptFateInvocationMigrationLog = [];
      s._temptFateLedger = null;
      s._cgDeliveredAssignments = null;
      s.tempt_fate_invoked_this_turn = false; s.temptFateWish = '';
      s.consecutive_tempt_fate_count = 0;
      s.volatility_window = { active: false, severity: 0, remaining_scenes: 0 };
      window._plotContractKill = true;
      s.pcBodyBible = { _stub: true }; s.liBodyBible = { _stub: true }; s.antagonistBodyBible = { _stub: true };
      s.aPlot = { goal: 'stub goal', antagonistOrAntiForce: 'stub antagonist' };
      s.cgScaffold = { _stub: true, _sourceModel: 'stub' };
      window._tfoAutoExtractionEnabled = false;      // the production default, asserted below
    }, storyId);
  }
  // The real generation + the real commit-at-persistence, in that order — the acceptance path.
  async function acceptSceneWithWish(sceneIdx, wish) {
    await page.evaluate((a) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = a.wish;
      window._recordTemptFateEvent(a.wish);       // the REAL seal point
    }, { wish });
    const plan = await page.evaluate((si) => window._runCGScreenplayGen(si, 'she watches the hall', ''), sceneIdx);
    // Real persistence, then the real commit-at-persistence function the pipeline calls next.
    await page.evaluate((p) => {
      window.state.scenes.push({ title: '', synopsis: '',
        text: (p.beats || []).map((b) => (b && b.text) || '').join('\n\n'), fateCard: null });
      window._cgTemptFateCommitAtPersistence(p);
    }, plan);
    await page.evaluate(() => { window.state.tempt_fate_invoked_this_turn = false; window.state.temptFateWish = ''; });
    return plan;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('0. Automation is OFF by default, and that is enforced, not conventional');
  await baseline('trackb-story-1');
  {
    const off = await page.evaluate(() => window._tfoAutoExtractionOn());
    ok('automatic extraction is DISABLED by default', off === false);
    const resumed = await page.evaluate(async () => await window._tfoResumePending());
    ok('_tfoResumePending refuses to dispatch while disabled, and says why', resumed && resumed.skipped === 'auto_extraction_disabled', JSON.stringify(resumed));
    const src = await page.evaluate(async () => (await (await fetch('/app.js')).text()));
    ok('_sbSpeakerLabel is UNTOUCHED — it still runs its own chain and Track B did not edit it (Track A owns visible label normalization)',
      src.indexOf("if (sp === 'protagonist') name = (state.picks && state.picks.identity && state.picks.identity.playerName) || state.playerName || 'I';") !== -1);
    ok('...and _resolvePcIdentity is used for the RECORD field only — _tfoInvokerIdentity calls it, _sbSpeakerLabel does not',
      src.indexOf('function _tfoInvokerIdentity') !== -1
      && /_tfoInvokerIdentity[\s\S]{0,400}_resolvePcIdentity/.test(src));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. EVERY accepted invocation creates ONE unresolved record — invoker fully resolved');
  await baseline('trackb-story-1');
  {
    await acceptSceneWithWish(1, 'everyone forgets the ceremony happened');
    const recs = await page.evaluate(() => window._tfoInvocationsForStory(window.state));
    ok('exactly ONE invocation record exists', recs.length === 1, 'got ' + recs.length);
    const r = recs[0] || {};
    ok('the invoker RESOLVED (so this is the normal path, not a defect path)', r.invoker && r.invoker.resolved === true, JSON.stringify(r.invoker));
    ok('...resolved by _resolvePcIdentity, not a private chain', r.invoker && r.invoker.authority === 'resolvePcIdentity');
    ok('...to the real PC name', r.invoker && r.invoker.name === 'Lirael', JSON.stringify(r.invoker && r.invoker.name));
    ok('the record is created ANYWAY — a clean invoker is not a reason to skip it', r.invocationId && r.outcome === 'unresolved');
    ok('it carries an invocationId, not just a sceneUid', typeof r.invocationId === 'string' && r.invocationId.length > 0);
    ok('it records the wish text as OBSERVED AT CAPTURE', r.evidence && r.evidence.wishText === 'everyone forgets the ceremony happened' && r.evidence.observedAtCapture === true);
    ok('...and explicitly NOT as current canon — Track B cannot establish that', r.evidence && r.evidence.currentCanon === false && /not a claim/i.test(String(r.evidence.note)));
    ok('it names its acceptance evidence', r.acceptance && r.acceptance.kind === 'persisted_at_capture', JSON.stringify(r.acceptance));
    ok('it declares automatic commitment disabled', r.autoCommitDisabled === true);
    ok('NO durable consequence was committed', (await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length)) === 0);
    ok('derived status is "unresolved"', (await page.evaluate((id) => window._tfoInvocationStatus(window.state, id).status, r.invocationId)) === 'unresolved');
    // IDEMPOTENCE: a repeated persistence callback must not double-record.
    const again = await page.evaluate(() => {
      const s = window.state;
      const before = s._temptFateInvocations.length;
      const ctxLike = { storyId: s.storyId, proposalId: s._temptFateInvocations[0].proposalId,
        sceneUid: s._temptFateInvocations[0].sceneUid, sceneIdx: s._temptFateInvocations[0].sceneIdx,
        wishText: 'everyone forgets the ceremony happened' };
      window._tfoRecordAcceptedInvocation(ctxLike, { kind: 'persisted_at_capture' });
      return { before, after: s._temptFateInvocations.length };
    });
    ok('a repeated record call for the same (story, proposal, scene) adds NOTHING', again.before === again.after, JSON.stringify(again));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. CONTINUATION PROCEEDS with a record outstanding');
  {
    const blocked = await page.evaluate(() => window._tfoContinuationBlocked(window.state));
    ok('_tfoContinuationBlocked returns null — the story is NOT gated', blocked === null, JSON.stringify(blocked));
    const pendCount = await page.evaluate(() => window._tfoUnresolvedPending(window.state).length);
    ok('...even though an unresolved PENDING record still exists (' + pendCount + ') — the gate is skipped because nothing will resolve it automatically', pendCount >= 1);
    // The real proof: a SECOND real generation runs to completion.
    const plan2 = await page.evaluate((si) => window._runCGScreenplayGen(si, 'the next morning', ''), 2);
    ok('a SECOND real generation completed while the record stood', !!(plan2 && plan2.beats && plan2.beats.length) && !plan2.__staleRejected, JSON.stringify(plan2 && { stale: plan2.__staleRejected, beats: !!plan2.beats }));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. DOWNSTREAM receives the uncertainty rule and NO effect assumptions');
  {
    const d = await page.evaluate(() => window._buildTemptFateUnresolvedInvocationDirective());
    ok('the directive fires while the invocation is unresolved', typeof d === 'string' && d.length > 0);
    ok('it states an invocation was ACCEPTED', /INVOCATION ACCEPTED/.test(d));
    ok('it carries the wish text', /everyone forgets the ceremony happened/.test(d));
    ok('it states NO durable outcome was committed', /NO durable outcome has been committed/.test(d));
    ok('it refuses BOTH readings — landed and failed', /DO NOT assume the requested effect landed/.test(d) && /DO NOT assume it failed/.test(d));
    ok('the prohibition is WISH-SCOPED, naming the six derivations', /FROM THIS WISH/.test(d) && /memory, possession, history, relationship, exemption or scope/.test(d));
    ok('it says the wish text is NOT a citation and NOT proof of current scene text', /NOT a citation/.test(d) && /NOT proof of what the current scene text contains/.test(d));
    ok('it explicitly does NOT freeze the story — independent action and new observation stay allowed', /does NOT freeze the story/.test(d) && /newly observed evidence/.test(d));
    ok('...and says a later explicit establishment stands as its OWN observation, not as the wish working', /its own new observation, not as this wish having worked/.test(d));
    // It must reach consumers through the SINGLE emitter, with no durable consequences present.
    const combined = await page.evaluate(() => window._buildTemptFateDurableConsequenceDirective());
    ok('the single emitter carries it even with ZERO committed consequences — the "block that never renders" trap', /INVOCATION ACCEPTED/.test(combined), 'len=' + (combined || '').length);
    // And through a REAL prompt builder that consumes that emitter.
    const spine = await page.evaluate(() => window._buildContinuitySpineBlock ? window._buildContinuitySpineBlock(window.state, {}) : null);
    if (typeof spine === 'string') {
      ok('a REAL prompt builder (_buildContinuitySpineBlock) carries it into the request', /INVOCATION ACCEPTED/.test(spine), 'len=' + spine.length);
    } else {
      ok('_buildContinuitySpineBlock is exposed for this check', false, 'not on window — directive reach through a real builder unverified here');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. An UNRESOLVED invoker is reviewable and does not stop the story');
  await baseline('trackb-story-2');
  {
    // Remove every PC-name candidate so _resolvePcIdentity genuinely cannot resolve.
    await page.evaluate(() => {
      const s = window.state;
      s.playerName = ''; s.name = ''; s.picks = { world: 'Fantasy', identity: {} };
      s.identity = {}; s.starterSeed = null;
    });
    await acceptSceneWithWish(1, 'let the world know what we are');
    const recs = await page.evaluate(() => window._tfoInvocationsForStory(window.state));
    ok('the record was still created', recs.length === 1, 'got ' + recs.length);
    const r = recs[0] || {};
    ok('invokerUnresolved is TRUE', r.invokerUnresolved === true, JSON.stringify(r.invoker));
    ok('...flagged for review by name', Array.isArray(r.reviewFlags) && r.reviewFlags.indexOf('invoker_unresolved') !== -1);
    ok('...and the record is otherwise complete — the flag suppresses nothing', !!r.invocationId && !!r.evidence.wishText && !!r.acceptance.kind);
    ok('the accepted scene is still persisted', (await page.evaluate(() => window.state.scenes.length)) === 1);
    ok('the story is NOT gated', (await page.evaluate(() => window._tfoContinuationBlocked(window.state))) === null);
    const d = await page.evaluate(() => window._buildTemptFateUnresolvedInvocationDirective());
    ok('the directive marks the invoker as under review', /invoker identity unresolved — under review/.test(d));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. Human resolution and dismissal APPEND without altering the record or the scene');
  await baseline('trackb-story-3');
  {
    await acceptSceneWithWish(1, 'everyone forgets the ceremony happened');
    const snapBefore = await page.evaluate(() => JSON.stringify({
      rec: window.state._temptFateInvocations[0], scene: window.state.scenes[0] }));
    const id = await page.evaluate(() => window.state._temptFateInvocations[0].invocationId);

    const refused = await page.evaluate((i) => window._tfoResolveInvocationByHuman(i, {}), id);
    ok('a resolution with NO stated basis is REFUSED', refused === null);

    const res = await page.evaluate((i) => window._tfoResolveInvocationByHuman(i, {
      basis: 'read the scene; the Dohkar states he does not know what gathering this is',
      reviewer: 'roman',
      claims: { requestedRupture: 'everyone forgets the ceremony happened', ruptureClass: 'memory_perception',
        changed: [{ subject: 'the presiding Dohkar', whatChanged: 'does not know what gathering this is' }],
        scopeMatch: 'undetermined', scopeNote: 'only the Dohkar is established' }
    }), id);
    ok('a resolution WITH a basis appends', !!res && res.kind === 'resolution' && res.provenance === 'human_review');
    const snapAfter = await page.evaluate(() => JSON.stringify({
      rec: window.state._temptFateInvocations[0], scene: window.state.scenes[0] }));
    ok('the ORIGINAL invocation record is byte-identical after resolution', snapBefore === snapAfter);
    ok('...and so is the accepted scene', JSON.parse(snapBefore).scene.text === JSON.parse(snapAfter).scene.text);
    ok('derived status is now "resolved" — read off the append log, never written back', (await page.evaluate((i) => window._tfoInvocationStatus(window.state, i).status, id)) === 'resolved');
    ok('the record itself still carries outcome:"unresolved" — status is DERIVED, not stored', (await page.evaluate(() => window.state._temptFateInvocations[0].outcome)) === 'unresolved');
    const dc = await page.evaluate(() => window.state._temptFateDurableConsequences);
    ok('a SEPARATE durable consequence was created, tagged human_review', dc.length === 1 && dc[0].provenance === 'human_review');
    ok('...referencing the invocationId, not just the scene', dc[0].resolves && dc[0].resolves.invocationId === id);
    ok('the directive STOPS firing for a resolved invocation', !/INVOCATION ACCEPTED/.test(await page.evaluate(() => window._buildTemptFateUnresolvedInvocationDirective())));

    // Dismissal, on a second invocation, is also an append and stays distinguishable.
    await acceptSceneWithWish(2, 'let no one speak of it again');
    const id2 = await page.evaluate(() => window.state._temptFateInvocations[1].invocationId);
    ok('two invocations in one story get DISTINCT ids', id2 !== id);
    const dism = await page.evaluate((i) => window._tfoDismissInvocation(i, { basis: 'reviewed; the scene establishes nothing' }), id2);
    ok('dismissal appends', !!dism && dism.kind === 'dismissal');
    ok('...and is distinguishable from a resolution forever', (await page.evaluate((i) => window._tfoInvocationStatus(window.state, i).status, id2)) === 'dismissed');
    ok('...creating NO durable consequence', (await page.evaluate(() => window.state._temptFateDurableConsequences.length)) === 1);
    ok('both append entries coexist in the log', (await page.evaluate(() => window.state._temptFateInvocationResolutions.length)) === 2);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. MIGRATION converts only on proof of acceptance');
  await baseline('trackb-story-4');
  {
    await page.evaluate(() => {
      const s = window.state;
      // One genuinely accepted scene at index 0.
      s.scenes = [{ title: '', synopsis: '', text: 'The hall is arranged for a rite no one recalls.', fateCard: null }];
      s._temptOutcomePending = {
        // (a) CONVERTIBLE: accepted scene at the recorded index, with prose.
        'k_ok':        { key: 'k_ok',        ctx: { storyId: s.storyId, proposalId: 'p_ok',    sceneIdx: 0, wishText: 'everyone forgets' } },
        // (b) MISSING SCENE at the recorded index.
        'k_missing':   { key: 'k_missing',   ctx: { storyId: s.storyId, proposalId: 'p_miss',  sceneIdx: 7, wishText: 'a' } },
        // (c) PRE-ACCEPTANCE: no scene reference at all.
        'k_preaccept': { key: 'k_preaccept', ctx: { storyId: s.storyId, proposalId: 'p_pre',   wishText: 'b' } },
        // (d) CROSS-STORY.
        'k_cross':     { key: 'k_cross',     ctx: { storyId: 'some-other-story', proposalId: 'p_x', sceneIdx: 0, wishText: 'c' } },
        // (e) SCENE EXISTS BUT HAS NO PROSE — persisted shell, not an accepted scene.
        'k_empty':     { key: 'k_empty',     ctx: { storyId: s.storyId, proposalId: 'p_empty', sceneIdx: 1, wishText: 'd' } },
        // (f) NO PROPOSAL IDENTITY — could never be resolved by anyone.
        'k_noprop':    { key: 'k_noprop',    ctx: { storyId: s.storyId, sceneIdx: 0, wishText: 'e' } },
        // (g) MALFORMED.
        'k_malformed': { key: 'k_malformed' }
      };
      s.scenes.push({ title: '', synopsis: '', text: '   ', fateCard: null });   // the empty shell for (e)
    });
    const out = await page.evaluate(() => window._tfoMigratePendingToInvocations());
    ok('exactly ONE record converted', out.converted.length === 1, JSON.stringify(out.converted));
    ok('...the one with an accepted scene carrying prose', out.converted[0] && out.converted[0].key === 'k_ok'
      && out.converted[0].evidence === 'accepted_scene_at_index_with_prose', JSON.stringify(out.converted[0]));
    ok('SIX invalidated', out.invalidated.length === 6, JSON.stringify(out.invalidated.map((x) => x.key)));
    const byKey = {}; out.invalidated.forEach((x) => { byKey[x.key] = x.reason; });
    ok('...missing scene named by reason', byKey['k_missing'] === 'missing_scene_at_recorded_index', byKey['k_missing']);
    ok('...pre-acceptance named by reason', byKey['k_preaccept'] === 'pre_acceptance_no_scene_reference', byKey['k_preaccept']);
    ok('...cross-story named by reason', byKey['k_cross'] === 'cross_story', byKey['k_cross']);
    ok('...prose-less scene named by reason', byKey['k_empty'] === 'scene_at_index_has_no_prose', byKey['k_empty']);
    ok('...no proposal identity named by reason', byKey['k_noprop'] === 'no_proposal_identity', byKey['k_noprop']);
    ok('...malformed named by reason', byKey['k_malformed'] === 'malformed_pending_no_ctx', byKey['k_malformed']);
    const invs = await page.evaluate(() => window._tfoInvocationsForStory(window.state));
    ok('EXACTLY ONE invocation record exists — nothing was fabricated for the six', invs.length === 1, 'got ' + invs.length);
    ok('...and it names its migration evidence', invs[0] && /^migrated:accepted_scene_at_index_with_prose$/.test(invs[0].acceptance.kind), JSON.stringify(invs[0] && invs[0].acceptance));
    ok('every invalidated pending record carries its reason durably', (await page.evaluate(() => {
      const m = window.state._temptOutcomePending;
      return Object.keys(m).filter((k) => k !== 'k_ok').every((k) => m[k].invalidated === 'pre_canonicalization_provenance' && !!m[k].invalidatedReason);
    })) === true);
    ok('the converted record is ALSO invalidated for extraction — its prose provenance is dead either way',
      (await page.evaluate(() => window.state._temptOutcomePending['k_ok'].invalidated === 'pre_canonicalization_provenance'
        && window.state._temptOutcomePending['k_ok'].invalidatedReason === 'converted_to_invocation_record')) === true);

    // IDEMPOTENCE — the reload case.
    const out2 = await page.evaluate(() => window._tfoMigratePendingToInvocations());
    ok('a second migration pass converts NOTHING', out2.converted.length === 0, JSON.stringify(out2.converted));
    ok('...and invalidates nothing again', out2.invalidated.length === 0);
    ok('...skipping all seven as already done', out2.skippedAlreadyDone.length === 7, 'got ' + out2.skippedAlreadyDone.length);
    ok('still exactly ONE invocation record after re-running migration — no duplicate on reload',
      (await page.evaluate(() => window._tfoInvocationsForStory(window.state).length)) === 1);
    ok('the migration log records each action once', (await page.evaluate(() => window.state._temptFateInvocationMigrationLog.length)) === 7);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('7. CONTAINMENT');
  {
    const real = gate.realCalls ? gate.realCalls() : [];
    ok('ZERO real provider requests across the whole control', real.length === 0, 'got ' + real.length);
    ok('no extraction dispatch was attempted', !consoleLines.some((l) => /TEMPT-EXTRACT|extractor returned/.test(l)));
    ok('the resume skip was logged, not silent', consoleLines.some((l) => /resume skipped — automatic extraction is DISABLED/.test(l)));
    ok('every invocation record was logged as unresolved with nothing committed', consoleLines.some((l) => /TEMPT-INVOCATION\] recorded .* outcome UNRESOLVED, nothing committed/.test(l)));
  }

  await browser.close();
  console.log('\n' + '='.repeat(100));
  console.log('TRACK B INVOCATION CONTROL: ' + pass + '/' + (pass + fail) + ' passed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
