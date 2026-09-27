// TRACK B — RECORD-WRITE FAILURE PATH. Bounded, zero provider requests.
//
// THE CLAIM UNDER TEST. "Every accepted invocation creates a record" and "a record failure can never
// break scene persistence" are in tension. If the write throws and the error is merely caught and
// logged, the accepted scene survives and downstream LOSES the invocation — the exact failure Track B
// exists to prevent, and worse than a stall, because the next planner then invents an outcome.
//
// THE FAULT IS INJECTED AT A DEPENDENCY, NOT THROUGH A TEST HOOK. state._temptFateInvocations is
// frozen before the scene is accepted, so the real _tfoRecordAcceptedInvocation throws for real at
// its own store.push — no production code knows it is being tested, and no injection seam exists in
// shipped code to be abused later.
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (m, c, d) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (d ? '  [' + d + ']' : '')); } };
const section = (t) => console.log('\n=== ' + t + ' ===');

(async () => {
  console.log('=== TRACK B: RECORD-WRITE FAILURE PATH (fault injected at a dependency) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_trackb_failsafe_out.jsonl') });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && typeof window._runCGScreenplayGen === 'function'
    && typeof window._cgTemptFateCommitAtPersistence === 'function'
    && typeof window._recordTemptFateEvent === 'function'
    && typeof window._tfoRecordInvocationFailsafe === 'function'
    && typeof window._tfoUnresolvedFailsafeMarkers === 'function'
    && typeof window._tfoRecoverInvocationFromFailsafe === 'function', { timeout: 30000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: ' + (e && e.message)); await browser.close(); process.exit(2); });

  gate.stub('/api/proxy', async () => ({
    choices: [{ message: { content: JSON.stringify({
      beats: [
        { idx: 0, kind: 'narration', text: 'The air stills and the voices falter.', speaker: null },
        { idx: 1, kind: 'dialogue', text: '"What gathering is this?"', speaker: 'the presiding Dohkar' }
      ], panels: [], visualState: {}, phases: [], sceneCharge: {}, microDecision: null
    }) } }], usage: { prompt_tokens: 10, completion_tokens: 10 }
  }));
  gate.stub('/api/mistral-proxy', () => ({ content: null }));

  await page.evaluate(() => {
    const s = window.state;
    s.picks = { world: 'Fantasy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.storyId = 'failsafe-story'; s.storyLength = 'fling'; s.turnCount = 3;
    s.playerName = 'Lirael'; s.loveInterestName = 'Julian'; s.currentPrimaryLiId = 'julian';
    s.scenes = []; s._temptFateDurableConsequences = []; s._temptOutcomeCommittedProposals = {};
    s._temptOutcomePending = {}; s._temptFateInvocationResolutions = [];
    s._temptFateInvocationFailsafe = []; s._temptFateLedger = null; s._cgDeliveredAssignments = null;
    s.tempt_fate_invoked_this_turn = false; s.temptFateWish = ''; s.consecutive_tempt_fate_count = 0;
    s.volatility_window = { active: false, severity: 0, remaining_scenes: 0 };
    window._plotContractKill = true;
    s.pcBodyBible = { _stub: true }; s.liBodyBible = { _stub: true }; s.antagonistBodyBible = { _stub: true };
    s.aPlot = { goal: 'stub goal', antagonistOrAntiForce: 'stub antagonist' };
    s.cgScaffold = { _stub: true, _sourceModel: 'stub' };
    window._tfoAutoExtractionEnabled = false;
    // THE FAULT: a frozen store. Array.prototype.push on a frozen array throws, so the REAL record
    // function fails at its own real line. Nothing about the code under test is stubbed.
    s._temptFateInvocations = Object.freeze([]);
  });

  section('0. The fault is genuine — the real record function really throws');
  {
    const probe = await page.evaluate(() => {
      try {
        window._tfoRecordAcceptedInvocation({ storyId: 'failsafe-story', proposalId: 'probe', sceneIdx: 0, wishText: 'x' },
          { kind: 'persisted_at_capture' });
        return { threw: false };
      } catch (e) { return { threw: true, msg: String(e && e.message) }; }
    });
    ok('the REAL _tfoRecordAcceptedInvocation throws on the frozen store (not a simulated failure)', probe.threw === true, JSON.stringify(probe));
    ok('...and the store is genuinely frozen', (await page.evaluate(() => Object.isFrozen(window.state._temptFateInvocations))) === true);
  }

  section('1. The accepted scene persists and continuation does not stall');
  let planA;
  {
    await page.evaluate(() => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = 'everyone forgets the ceremony happened';
      window._recordTemptFateEvent(window.state.temptFateWish);
    });
    planA = await page.evaluate((si) => window._runCGScreenplayGen(si, 'she watches the hall', ''), 1);
    await page.evaluate((p) => {
      window.state.scenes.push({ title: '', synopsis: '',
        text: (p.beats || []).map((b) => (b && b.text) || '').join('\n\n'), fateCard: null });
      window._cgTemptFateCommitAtPersistence(p);       // the real capture point, with the fault live
    }, planA);
    await page.evaluate(() => { window.state.tempt_fate_invoked_this_turn = false; window.state.temptFateWish = ''; });

    const st = await page.evaluate(() => ({
      scenes: window.state.scenes.length,
      text: (window.state.scenes[0] || {}).text || '',
      records: (window.state._temptFateInvocations || []).length,
      blocked: window._tfoContinuationBlocked(window.state)
    }));
    ok('the accepted scene PERSISTS', st.scenes === 1 && st.text.indexOf('The air stills') !== -1, JSON.stringify({ scenes: st.scenes }));
    ok('the record write really did fail — ZERO invocation records exist', st.records === 0, 'got ' + st.records);
    ok('continuation is NOT stalled', st.blocked === null, JSON.stringify(st.blocked));
    const plan2 = await page.evaluate((si) => window._runCGScreenplayGen(si, 'the next morning', ''), 2);
    ok('a SECOND real generation completes after the failure', !!(plan2 && plan2.beats && plan2.beats.length) && !plan2.__staleRejected);
  }

  section('2. A durable fail-safe marker survives on guaranteed carriers');
  {
    const m = await page.evaluate(() => ({
      onState: (window.state._temptFateInvocationFailsafe || []),
      onScene: (window.state.scenes[0] || {}).temptInvocationFailsafe || null
    }));
    ok('a marker exists on state (part of the snapshot, so it survives reload)', m.onState.length === 1, 'got ' + m.onState.length);
    ok('...and on the accepted scene record itself', !!m.onScene);
    const k = m.onState[0] || {};
    ok('the marker carries the wish text', k.wishText === 'everyone forgets the ceremony happened', JSON.stringify(k.wishText));
    ok('...the proposal identity, so a human can resolve it later', typeof k.proposalId === 'string' && k.proposalId.length > 0, JSON.stringify(k.proposalId));
    ok('...the scene it belongs to', k.sceneIdx === 1, JSON.stringify(k.sceneIdx));
    ok('...its reason and the real error', k.reason === 'invocation_record_write_failed' && /not extensible|read only|frozen|Cannot add/i.test(String(k.error)), JSON.stringify(k.error));
    ok('...and that nothing was committed', k.autoCommitDisabled === true && k.outcome === 'unresolved');
    ok('the failure was logged loudly, not swallowed', consoleLines.some((l) => /RECORD WRITE FAILED — durable fail-safe marker written to/.test(l)));
    ok('...naming BOTH carriers, so a single-carrier failure would be visible', consoleLines.some((l) => /_temptFateInvocationFailsafe \+ accepted scene record/.test(l)));
    // The marker must survive a reload of state, i.e. be plain JSON.
    const roundTrip = await page.evaluate(() => {
      try { const j = JSON.parse(JSON.stringify(window.state._temptFateInvocationFailsafe)); return j.length === 1 && j[0].wishText; }
      catch (e) { return 'THREW: ' + e.message; }
    });
    ok('the marker is plain JSON — it survives the state snapshot round trip', roundTrip === 'everyone forgets the ceremony happened', JSON.stringify(roundTrip));
    // Idempotence: a repeated failure for the same scene must not pile up markers.
    await page.evaluate(() => window._tfoRecordInvocationFailsafe(
      { storyId: 'failsafe-story', proposalId: (window.state._temptFateInvocationFailsafe[0] || {}).proposalId, sceneIdx: 1, wishText: 'everyone forgets the ceremony happened' }, new Error('again')));
    ok('a repeated failure for the same (story, proposal, scene) adds NO second marker',
      (await page.evaluate(() => window.state._temptFateInvocationFailsafe.length)) === 1);
  }

  section('3. Downstream receives the SAME unresolved-outcome rule from the marker alone');
  {
    const d = await page.evaluate(() => window._buildTemptFateUnresolvedInvocationDirective());
    ok('the directive fires with NO invocation records at all — driven by the marker', d.length > 0 && /INVOCATION ACCEPTED/.test(d));
    ok('it names the invocation as fail-safe marked and under review', /FAIL-SAFE MARKER/.test(d) && /under review/.test(d));
    ok('it carries the wish text', /everyone forgets the ceremony happened/.test(d));
    ok('it states NO durable outcome was committed', /NO durable outcome has been committed/.test(d));
    ok('it refuses BOTH readings', /DO NOT assume the requested effect landed/.test(d) && /DO NOT assume it failed/.test(d));
    ok('the prohibition is wish-scoped', /FROM THIS WISH/.test(d) && /memory, possession, history, relationship, exemption or scope/.test(d));
    ok('it does not freeze the story', /does NOT freeze the story/.test(d));
    const combined = await page.evaluate(() => window._buildTemptFateDurableConsequenceDirective());
    ok('and it reaches consumers through the single emitter', /FAIL-SAFE MARKER/.test(combined));
    const spine = await page.evaluate(() => window._buildContinuitySpineBlock ? window._buildContinuitySpineBlock(window.state, {}) : null);
    ok('a REAL prompt builder carries it into the request', typeof spine === 'string' && /INVOCATION ACCEPTED/.test(spine));
  }

  section('4. No automatic outcome is committed');
  {
    ok('zero durable consequences', (await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length)) === 0);
    ok('zero committed proposals', (await page.evaluate(() => Object.keys(window.state._temptOutcomeCommittedProposals || {}).length)) === 0);
    ok('no extraction was attempted', !consoleLines.some((l) => /TEMPT-EXTRACT|extractor returned/.test(l)));
  }

  section('5. Human review promotes the marker into the normal record, without rewriting the scene');
  {
    const sceneBefore = await page.evaluate(() => JSON.stringify(window.state.scenes[0]));
    // The reviewer's environment is not broken — unfreeze to model a later, working session.
    await page.evaluate(() => { window.state._temptFateInvocations = []; });
    const marker = await page.evaluate(() => window.state._temptFateInvocationFailsafe[0]);
    const rec = await page.evaluate((m) => window._tfoRecoverInvocationFromFailsafe(m), marker);
    ok('recovery creates an ORDINARY invocation record', !!rec && !!rec.invocationId && rec.outcome === 'unresolved');
    ok('...with its acceptance evidence naming the recovery, not pretending it was a normal capture', rec.acceptance && rec.acceptance.kind === 'failsafe_recovery', JSON.stringify(rec.acceptance));
    ok('...preserving the wish text and proposal identity', rec.evidence.wishText === marker.wishText && rec.proposalId === marker.proposalId);
    ok('...and still labelled observedAtCapture, not currentCanon', rec.evidence.observedAtCapture === true && rec.evidence.currentCanon === false);
    const sceneAfter = await page.evaluate(() => JSON.stringify(window.state.scenes[0]));
    ok('THE ACCEPTED SCENE IS BYTE-IDENTICAL after recovery', sceneBefore === sceneAfter);
    ok('...and the marker itself is not edited — it stays as the record of what happened', (await page.evaluate(() => window.state._temptFateInvocationFailsafe[0].reason)) === 'invocation_record_write_failed');
    ok('the marker STOPS firing, derived from the real record existing — not written back',
      (await page.evaluate(() => window._tfoUnresolvedFailsafeMarkers(window.state).length)) === 0);
    const d = await page.evaluate(() => window._buildTemptFateUnresolvedInvocationDirective());
    ok('the directive now reports the ordinary record, with no duplicate for the marker', /INVOCATION ACCEPTED, OUTCOME UNRESOLVED \(1\)/.test(d) && !/FAIL-SAFE MARKER/.test(d), d.split('\n')[0]);
    // And the recovered record behaves like any other.
    const res = await page.evaluate((i) => window._tfoResolveInvocationByHuman(i, { basis: 'reviewed after recovery' }), rec.invocationId);
    ok('the recovered record is resolvable by the ordinary append-only path', !!res && res.kind === 'resolution');
    ok('...and the scene is STILL byte-identical', (await page.evaluate(() => JSON.stringify(window.state.scenes[0]))) === sceneBefore);
  }

  section('6. CONTAINMENT');
  {
    const real = gate.realCalls ? gate.realCalls() : [];
    ok('ZERO real provider requests', real.length === 0, 'got ' + real.length);
    ok('no "BOTH the record and the fail-safe failed" case occurred', !consoleLines.some((l) => /BOTH the record and the fail-safe failed/.test(l)));
  }

  await browser.close();
  console.log('\n' + '='.repeat(100));
  console.log('TRACK B FAIL-SAFE PROOF: ' + pass + '/' + (pass + fail) + ' passed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('PROOF ERROR:', e && e.stack || e); process.exit(2); });
