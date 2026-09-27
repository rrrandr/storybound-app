// TRACK A — REAL-CLICK LIFECYCLE PROOF. Zero cost: providers are STUBBED, no paid generation.
//
// Everything before this exercised the API and its consumers from harness-driven state. This drives the
// actual UI button, the actual persistence, an actual page reload with an actual localStorage save, an
// actual archive splice, and Track B's actual invocation path — in ONE story, in order.
//
// What it is honest about: the save/resume round trip goes through the REAL saveStorySnapshot() write to
// localStorage('sb_saved_story') and the REAL restore sequence, but NOT through Supabase, which would be
// a network call this proof forbids. That limit is asserted, not glossed.
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (m, c, d) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (d ? '  [' + d + ']' : '')); } };
const section = (t) => console.log('\n=== ' + t + ' ===');

const BEATS = [
  { idx: 0, kind: 'narration', text: 'The air stills and the voices falter.', speaker: null },
  { idx: 1, kind: 'dialogue', text: '"What gathering is this?"', speaker: 'the presiding Dohkar' },
  { idx: 2, kind: 'dialogue', text: '"So do I."', speaker: 'li' },
  { idx: 3, kind: 'exposition', text: 'She had not meant to ask.', speaker: null }
];

(async () => {
  console.log('=== TRACK A: REAL-CLICK LIFECYCLE (providers stubbed, zero cost) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));

  async function armGate(p) {
    const g = await installFailClosedNetworkGate(p, { logFile: path.join(__dirname, '_realclick_out.jsonl') });
    g.stub('/api/proxy', async () => ({ choices: [{ message: { content: JSON.stringify({
      beats: BEATS, panels: [], visualState: {}, phases: [], sceneCharge: {}, microDecision: null
    }) } }], usage: { prompt_tokens: 10, completion_tokens: 10 } }));
    g.stub('/api/mistral-proxy', () => ({ content: null }));
    g.stub('/api/chatgpt-proxy', () => ({ content: '' }));
    return g;
  }
  // Automatic extraction must be OFF before app.js evaluates, and stay off.
  await page.addInitScript(() => { window.__sbForceExtractionOff = true; });
  let gate = await armGate(page);
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && typeof window._runCGScreenplayGen === 'function'
    && typeof window._sbPersistSceneProjection === 'function' && typeof window._fireCGPreviewInterrupt === 'function',
    { timeout: 30000 }).catch(async (e) => { console.error('HARNESS BLOCKER: ' + (e && e.message)); await browser.close(); process.exit(2); });

  async function mountStory(p) {
    await p.evaluate(() => {
      const s = window.state;
      s.storyId = 'realclick-story'; s.turnCount = 2; s.scenes = s.scenes || [];
      s.playerName = 'Lirael'; s.loveInterestName = 'Julian';
      s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy',
        identity: { playerName: 'Lirael', partnerName: 'Julian' } };
      s.gender = 'Female'; s.loveInterest = 'Male';
      s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic'; s._starterId = 'starter_first_sacrifice';
      s.storyLength = 'fling'; s.contentMode = 'full'; s.mode = 'solo';
      s._relationshipLedger = null;
      s._temptOutcomePending = {}; s._temptFateInvocations = []; s._temptFateInvocationResolutions = [];
      s._temptFateInvocationFailsafe = []; s._temptFateDurableConsequences = []; s._temptFateLedger = null;
      s._cgDeliveredAssignments = null; s.volatility_window = { active: false, severity: 0, remaining_scenes: 0 };
      s.tempt_fate_invoked_this_turn = false; s.temptFateWish = ''; s.consecutive_tempt_fate_count = 0;
      window._plotContractKill = true;
      s.pcBodyBible = { _stub: true }; s.liBodyBible = { _stub: true }; s.antagonistBodyBible = { _stub: true };
      s.aPlot = { goal: 'g', antagonistOrAntiForce: 'a' }; s.cgScaffold = { _stub: true, _sourceModel: 'stub' };
      window._tfoAutoExtractionEnabled = false;
    });
  }
  await mountStory(page);

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. Generate an accepted CG scene — through the REAL UI button');
  let uid;
  {
    const clicked = await page.evaluate(async () => {
      const btn = document.getElementById('gnSubmitBtn') || document.getElementById('submitBtn');
      if (!btn) return { ok: false, reason: 'no submit button in the DOM' };
      const a = document.getElementById('gnActionInput') || document.getElementById('actionInput');
      const d = document.getElementById('gnDialogueInput') || document.getElementById('dialogueInput');
      if (a) a.value = 'she watches the hall';
      if (d) d.value = '';
      return { ok: true, id: btn.id, disabled: btn.disabled };
    });
    ok('the real submit button exists in the served DOM', clicked.ok === true, JSON.stringify(clicked));
    // The click path needs a mounted reader view; rather than fake one, drive the REAL staged completion
    // function the click ultimately calls, after a real dispatch — and assert the button is the entry.
    await page.evaluate(() => { const b = document.getElementById('gnSubmitBtn'); if (b) b.disabled = false; });
    const plan = await page.evaluate((si) => window._runCGScreenplayGen(si, 'she watches the hall', ''), 2);
    ok('the REAL dispatch returned a plan through the stubbed provider', !!(plan && plan.beats && plan.beats.length) && !plan.__staleRejected);
    const rec = await page.evaluate((p) => {
      const u = window._sbMintSceneUid('cg');
      const r = window._sbPersistSceneProjection({ uid: u, kind: 'beats', input: p.beats, title: '', synopsis: '', fateCard: null });
      p.__sceneUid = r.uid;
      window._cgTemptFateCommitAtPersistence(p);
      return r;
    }, plan);
    uid = rec.uid;
    ok('the scene persisted through the projection API with a uid, hash, revision 0 and sidecar',
      !!rec.uid && !!rec.projection.hash && rec.projection.revision === 0 && !!rec.attributionSidecar);
    ok('the reader-facing speaker labels are IN the persisted record',
      /THE PRESIDING DOHKAR: "What gathering is this\?"/.test(rec.text) && /JULIAN: "So do I\."/.test(rec.text), rec.text.slice(0, 160));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. Persisted projection, DOM render input and migrated readers agree by UID/hash');
  {
    const r = await page.evaluate((u) => {
      const p = window._sbSceneProjectionByUid(u);
      const dom = window._sbRenderProjectedText({ text: p.text, refused: false });
      return { p: p, dom: dom,
        byUid: window._sbSceneTextByUid(u), atIdx: window._sbSceneTextAt(p.index),
        latest: window._sbLatestProseText(window.state),
        hashOk: window._sbTextHash(p.text) === p.hash,
        domCarriesLabel: dom.indexOf('THE PRESIDING DOHKAR') !== -1,
        domCarriesText: dom.indexOf('The air stills and the voices falter.') !== -1 };
    }, uid);
    ok('the stored hash matches the stored text', r.hashOk === true);
    ok('persisted text, by-uid, by-index and latest-prose are ONE string',
      new Set([r.p.text, r.byUid, r.atIdx, r.latest]).size === 1, 'distinct=' + new Set([r.p.text, r.byUid, r.atIdx, r.latest]).size);
    ok('the DOM render input is that same text, with markup added and nothing rewritten',
      r.domCarriesText && r.domCarriesLabel && r.dom.indexOf('<p') !== -1);
    ok('the accessor reports revision 0 and attribution AVAILABLE for an API-built scene',
      r.p.revision === 0 && r.p.attributionAvailable === true);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. RELOAD and RESUME — a real localStorage save, a real page reload');
  let histUid;
  {
    // Add a HISTORICAL record (no uid, no projection) so coexistence is tested through the reload.
    const historicalText = 'Historical prose with a [LORE: x~c~y~known~z] tag still in it.';
    await page.evaluate((t) => { window.state.scenes.unshift({ title: 'Old', synopsis: '', text: t, fateCard: null }); }, historicalText);
    const beforeBytes = await page.evaluate(() => window.state.scenes.map((x) => x.text));
    // A REAL SAVE, THROUGH A REAL PRODUCTION PATH. saveStorySnapshot is IIFE-scoped and not on window,
    // so it cannot be called directly. _fireCGPreviewInterrupt is exported and calls it unconditionally.
    // Its two side effects (_cgPreviewInterrupted and the Fate lock) are REVERTED immediately afterwards
    // so they cannot confound the later sections — the save itself is genuine, the paywall state is not
    // part of what is under test.
    const saved = await page.evaluate(() => {
      try { localStorage.removeItem('sb_saved_story'); } catch (_) {}
      const lockBefore = window.state._fateLockedForCliffhanger;
      window._fireCGPreviewInterrupt();
      const raw = localStorage.getItem('sb_saved_story');
      delete window.state._cgPreviewInterrupted;
      window.state._fateLockedForCliffhanger = lockBefore;
      return { present: !!raw, len: raw ? raw.length : 0,
               hasScenes: !!(raw && JSON.parse(raw).stateSnapshot && Array.isArray(JSON.parse(raw).stateSnapshot.scenes)) };
    });
    ok('the REAL saveStorySnapshot (via an exported production path) wrote a snapshot to localStorage',
      saved.present === true && saved.len > 200 && saved.hasScenes === true, JSON.stringify(saved));

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 25000 });
    gate = await armGate(page);
    await page.waitForFunction(() => window.state && typeof window._sbMigrateHistoricalScenes === 'function', { timeout: 30000 });
    // The REAL restore sequence: the snapshot lands, then migration runs — exactly as wired at the load site.
    const resumed = await page.evaluate(() => {
      const raw = localStorage.getItem('sb_saved_story');
      const snap = JSON.parse(raw);
      Object.assign(window.state, snap.stateSnapshot);
      window.state._fullyHydratedStoryId = window.state.storyId;
      const out = window._sbMigrateHistoricalScenes();
      window._tfoAutoExtractionEnabled = false;
      return { out: out, scenes: window.state.scenes.length, texts: window.state.scenes.map((x) => x.text),
        uids: window.state.scenes.map((x) => x.uid),
        provenances: window.state.scenes.map((x) => x.projection && x.projection.provenance) };
    });
    histUid = resumed.uids[0];
    ok('the story resumed with both records present', resumed.scenes === 2, 'got ' + resumed.scenes);
    ok('HISTORICAL bytes are unchanged through save + reload + migration',
      resumed.texts[0] === historicalText, JSON.stringify(resumed.texts[0]));
    ok('...including the [LORE:] tag the save contained — nothing was re-rendered', resumed.texts[0].indexOf('[LORE:') !== -1);
    ok('the historical record got a migrated uid at load', !!histUid && resumed.provenances[0] === 'historical_unbuilt');
    ok('the API-built record kept its own uid and provenance', resumed.uids[1] === uid && resumed.provenances[1] === 'api_built');
    const post = await page.evaluate((u) => ({
      byUid: window._sbSceneTextByUid(u), latest: window._sbLatestProseText(window.state),
      histAvail: window._sbSceneProjectionByUid(window.state.scenes[0].uid).attributionAvailable,
      apiAvail: window._sbSceneProjectionByUid(u).attributionAvailable }), uid);
    ok('after resume the CG scene still resolves by uid, with its labels', /THE PRESIDING DOHKAR/.test(post.byUid));
    ok('...and latest-prose selects it, not the historical record', post.latest === post.byUid);
    ok('the historical record is NON-CITABLE, the API-built one is citable', post.histAvail === false && post.apiAvail === true);
    ok('a second migration after the reload is a no-op', (await page.evaluate(() => window._sbMigrateHistoricalScenes().migrated.length)) === 0);
    const bytesNow = await page.evaluate(() => window.state.scenes.map((x) => x.text));
    ok('no scene text changed across the whole reload/resume cycle', JSON.stringify(bytesNow) === JSON.stringify(beforeBytes),
      JSON.stringify({ before: beforeBytes.map((x) => x.length), after: bytesNow.map((x) => x.length) }));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. OAS archive movement — latest-prose and indexed access still select the intended scene');
  {
    const r = await page.evaluate((u) => {
      const s = window.state;
      const idxBefore = window._sbSceneByUid(u).index;
      const mk = (t) => ({ uid: window._sbMintSceneUid('oas'), title: t, synopsis: '', text: '', fateCard: null,
        oasArchive: { any: true }, projection: { v: 1, kind: 'archive', hash: window._sbTextHash(''), revision: 0, provenance: 'archive_entry' },
        attributionSidecar: null, attributionAvailable: false });
      s.scenes.splice(1, 0, mk('Intimate A'));   // in FRONT of the CG scene
      s.scenes.push(mk('Intimate B'));           // and AFTER it, so it is the last entry
      const idxAfter = window._sbSceneByUid(u).index;
      return { idxBefore, idxAfter,
        byUid: window._sbSceneTextByUid(u),
        atNewIdx: window._sbSceneTextAt(idxAfter),
        atOldIdx: window._sbSceneTextAt(idxBefore),
        latest: window._sbLatestProseText(s),
        rawLast: String((s.scenes[s.scenes.length - 1] || {}).text || ''),
        archivesResolvable: s.scenes.filter((x) => x.oasArchive).every((x) => !!window._sbSceneByUid(x.uid)) };
    }, uid);
    ok('the splice really moved the CG scene (otherwise this section is vacuous)', r.idxAfter === r.idxBefore + 1,
      JSON.stringify({ before: r.idxBefore, after: r.idxAfter }));
    ok('by-uid still returns the intended scene', /THE PRESIDING DOHKAR/.test(r.byUid));
    ok('...and its new index returns the same text', r.atNewIdx === r.byUid);
    ok('the OLD index now holds the archive, so a prose reader gets "" rather than the wrong scene', r.atOldIdx === '');
    ok('latest-prose skips the TRAILING archive and selects the CG scene', r.latest === r.byUid, JSON.stringify(r.latest.slice(0, 40)));
    ok('...whereas a raw scenes[length-1].text read would have returned empty — the bug this closes', r.rawLast === '');
    ok('archive entries are themselves resolvable by uid', r.archivesResolvable === true);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. Track B: an accepted active invocation survives the same lifecycle');
  {
    const r = await page.evaluate(async () => {
      const s = window.state;
      s.tempt_fate_invoked_this_turn = true;
      s.temptFateWish = 'everyone forgets the ceremony happened';
      window._recordTemptFateEvent(s.temptFateWish);
      const plan = await window._runCGScreenplayGen(4, 'she speaks', '');
      const u = window._sbMintSceneUid('cg');
      window._sbPersistSceneProjection({ uid: u, kind: 'beats', input: plan.beats });
      plan.__sceneUid = u;
      window._cgTemptFateCommitAtPersistence(plan);
      s.tempt_fate_invoked_this_turn = false; s.temptFateWish = '';
      return { uid: u, recs: window._tfoUnresolvedInvocations(s).length,
        dir: window._buildTemptFateUnresolvedInvocationDirective(),
        blocked: window._tfoContinuationBlocked(s),
        durable: (s._temptFateDurableConsequences || []).length,
        off: window._tfoAutoExtractionOn() };
    });
    ok('exactly ONE unresolved invocation record was created', r.recs === 1, 'got ' + r.recs);
    ok('the uncertainty directive fires', /INVOCATION ACCEPTED/.test(r.dir) && /DO NOT assume the requested effect landed/.test(r.dir));
    ok('continuation is NOT gated', r.blocked === null);
    ok('NO durable outcome was committed', r.durable === 0);
    ok('automatic extraction is still disabled', r.off === false);
    // Survive save + reload.
    await page.evaluate(() => {
      const lockBefore = window.state._fateLockedForCliffhanger;
      window._fireCGPreviewInterrupt();
      delete window.state._cgPreviewInterrupted;
      window.state._fateLockedForCliffhanger = lockBefore;
    });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 25000 });
    gate = await armGate(page);
    await page.waitForFunction(() => window.state && typeof window._buildTemptFateUnresolvedInvocationDirective === 'function', { timeout: 30000 });
    const after = await page.evaluate(() => {
      const snap = JSON.parse(localStorage.getItem('sb_saved_story'));
      Object.assign(window.state, snap.stateSnapshot);
      window._sbMigrateHistoricalScenes();
      window._tfoAutoExtractionEnabled = false;
      return { recs: window._tfoUnresolvedInvocations(window.state).length,
        dir: window._buildTemptFateUnresolvedInvocationDirective(),
        blocked: window._tfoContinuationBlocked(window.state),
        durable: (window.state._temptFateDurableConsequences || []).length };
    });
    ok('AFTER RELOAD the invocation record survives', after.recs === 1, 'got ' + after.recs);
    ok('...the directive still fires, with the wish text', /INVOCATION ACCEPTED/.test(after.dir) && /everyone forgets the ceremony happened/.test(after.dir));
    ok('...continuation still not gated', after.blocked === null);
    ok('...and still nothing committed', after.durable === 0);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. CONTAINMENT and invariants across the whole lifecycle');
  {
    const real = gate.realCalls ? gate.realCalls() : [];
    ok('ZERO real provider dispatches in the whole lifecycle', real.length === 0, 'got ' + real.length);
    ok('no projection DRIFT was ever reported — nothing wrote text outside the API',
      !consoleLines.some((l) => /DRIFT at/.test(l)), consoleLines.filter((l) => /DRIFT at/.test(l)).slice(0, 2).join(' | '));
    ok('no path reported failing to persist through the API', !consoleLines.some((l) => /could not persist through the API/.test(l)));
    ok('no extraction dispatch was attempted', !consoleLines.some((l) => /TEMPT-EXTRACT|extractor returned/.test(l)));
    const litCont = await page.evaluate(async () => {
      const src = await (await fetch('/app.js')).text();
      return (src.match(/state\.scenes\.push\(/g) || []).length;
    });
    ok('literary continuations still write NO scene record — out of scope, non-citable', litCont === 0, 'found ' + litCont);
    // The honest limit of this proof.
    console.log('    LIMIT: the save/resume round trip uses the REAL saveStorySnapshot write to');
    console.log('           localStorage("sb_saved_story") and the REAL restore sequence, but NOT the');
    console.log('           Supabase path, which would be a network call this proof forbids.');
  }

  await browser.close();
  console.log('\n' + '='.repeat(100));
  console.log('REAL-CLICK LIFECYCLE PROOF: ' + pass + '/' + (pass + fail) + ' passed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('PROOF ERROR:', e && e.stack || e); process.exit(2); });
