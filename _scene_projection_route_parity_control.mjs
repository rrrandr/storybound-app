// TRACK A STEP 3 — every ordinary scene write routes through the projection API, and every consumer
// agrees for an unrevised scene. Zero provider requests; automatic extraction stays disabled.
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (m, c, d) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (d ? '  [' + d + ']' : '')); } };
const section = (t) => console.log('\n=== ' + t + ' ===');

(async () => {
  console.log('=== TRACK A: API-ROUTE + CONSUMER-PARITY (zero provider requests) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_route_parity_out.jsonl') });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && typeof window._sbPersistSceneProjection === 'function'
    && typeof window._sbReviseSceneProjection === 'function' && typeof window._sbRenderProjectedText === 'function'
    && typeof window._runCGScreenplayGen === 'function' && typeof window._cgTemptFateCommitAtPersistence === 'function',
    { timeout: 30000 }).catch(async (e) => { console.error('HARNESS BLOCKER: ' + (e && e.message)); await browser.close(); process.exit(2); });

  const src = await page.evaluate(async () => (await (await fetch('/app.js')).text()));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. THE ROUTE INVARIANT — no ordinary direct write to a scene record survives');
  {
    // Direct creations of a scene record.
    const pushes = (src.match(/state\.scenes\.push\(/g) || []).length;
    ok('ZERO direct state.scenes.push( calls remain outside the API', pushes === 0, 'found ' + pushes);
    // Direct assignments to a scene record's .text.
    const textAssign = src.match(/state\.scenes\[[^\]]*\]\s*\.\s*text\s*=/g) || [];
    ok('ZERO direct state.scenes[...].text = assignments remain — the :237444 class is gone', textAssign.length === 0, JSON.stringify(textAssign));
    // Indexed replacement of a whole scene record: only the declared OAS archive exception.
    const idxAssign = src.match(/state\.scenes\[[^\]]*\]\s*=\s*[^=]/g) || [];
    ok('the ONLY indexed scene-record assignment left is the declared archive exception', idxAssign.length === 1, JSON.stringify(idxAssign));
    const archiveDefIdx = src.indexOf('var _sbArchiveRecord = function ()');
    ok('...and it is an archive entry, declared as an exception immediately above its definition', archiveDefIdx !== -1
      // The phrase is wrapped across comment lines in source, so match a contiguous fragment.
      && /ARCHIVE entry, not a prose scene/.test(src.slice(Math.max(0, archiveDefIdx - 900), archiveDefIdx))
      && /declared exception to the/.test(src.slice(Math.max(0, archiveDefIdx - 900), archiveDefIdx)),
      'defIdx=' + archiveDefIdx);
    // The API's own writes are the route, not an exception to find.
    ok('the API itself is the only writer of rec.text', (src.match(/rec\.text\s*=\s*proj\.text/g) || []).length === 1);
    ok('the historical-migration entry point exists and does NOT assign .text — it FREEZES what is there',
      src.indexOf('function _sbMigrateHistoricalScenes') !== -1
      // `rec.text === 'string'` is a READ; only `=` NOT followed by `=` is an assignment. An earlier
      // version of this assertion matched the comparison and reported a defect that did not exist.
      && !/function _sbMigrateHistoricalScenes[\s\S]{0,2600}?rec\.text\s*=(?!=)/.test(src));
    ok('...and marks its records historical_unbuilt, so they can never pass as API-built', /provenance: 'historical_unbuilt'/.test(src));
    // The three named creation paths now call the API.
    ok('the CG path calls the API', /_sbPersistSceneProjection\(\{ uid: _sbSceneUid, kind: 'beats'/.test(src));
    ok('literary mount 1 calls the API', /_sbPersistSceneProjection\(\{ uid: _sbUidLit, kind: 'body'/.test(src));
    ok('literary Scene-1 completion calls the API', /_sbPersistSceneProjection\(\{ uid: _sbScene1Uid, kind: 'body'/.test(src));
    ok('the baked/seeded first page calls the API too — no known bypass left', /_sbPersistSceneProjection\(\{ kind: 'body', input: String\(pending\.text/.test(src));
    ok('the CG re-sync is now a REVISION, not an overwrite', /_sbReviseSceneProjection\(_sbSceneUid, \{ kind: 'beats'/.test(src));
    // The uid must be minted before the first await in the CG path.
    const fnStart = src.indexOf('async function _completeStagedSceneFromScreenplay');
    const mintAt = src.indexOf('_sbMintSceneUid', fnStart);
    const firstAwait = src.indexOf('await ', fnStart);
    ok('the CG scene uid is minted BEFORE the first await in that function', mintAt !== -1 && mintAt < firstAwait,
      'mint=' + mintAt + ' firstAwait=' + firstAwait);
    // formatStory must not be handed raw text by a migrated path.
    ok('every migrated DOM render goes through _sbRenderProjectedText', (src.match(/StoryPagination\.addPage\(_sbRenderProjectedText\(/g) || []).length === 2);
    ok('...which passes textAlreadyProjected so the transforms cannot run twice', /formatStory\(String\(p\.text == null \? '' : p\.text\), false, \{ textAlreadyProjected: true \}\)/.test(src));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. CG path end to end: one projection, DOM/record/consumer parity, revision on rewrite');
  let cgUid;
  {
    let planFields = {};
    gate.stub('/api/proxy', async () => ({ choices: [{ message: { content: JSON.stringify(Object.assign({
      beats: [
        { idx: 0, kind: 'narration', text: 'The air stills and the voices falter.', speaker: null },
        { idx: 1, kind: 'dialogue', text: '"What gathering is this?"', speaker: 'the presiding Dohkar' },
        { idx: 2, kind: 'dialogue', text: '"So do I."', speaker: 'li' }
      ], panels: [], visualState: {}, phases: [], sceneCharge: {}, microDecision: null
    }, planFields)) } }], usage: { prompt_tokens: 10, completion_tokens: 10 } }));
    gate.stub('/api/mistral-proxy', () => ({ content: null }));
    await page.evaluate(() => {
      const s = window.state;
      s.storyId = 'a3-story'; s.turnCount = 3; s.scenes = [];
      s.playerName = 'Lirael'; s.loveInterestName = 'Julian';
      s.picks = { world: 'Fantasy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
      s._temptOutcomePending = {}; s._temptFateInvocations = []; s._temptFateInvocationResolutions = [];
      s._temptFateDurableConsequences = []; s._temptFateLedger = null; s._cgDeliveredAssignments = null;
      s.contentMode = 'full'; s.mode = 'solo'; s._relationshipLedger = null;
      window._plotContractKill = true;
      s.pcBodyBible = { _stub: true }; s.liBodyBible = { _stub: true }; s.antagonistBodyBible = { _stub: true };
      s.aPlot = { goal: 'g', antagonistOrAntiForce: 'a' }; s.cgScaffold = { _stub: true, _sourceModel: 'stub' };
      window._tfoAutoExtractionEnabled = false;
    });
    const plan = await page.evaluate((si) => window._runCGScreenplayGen(si, 'she watches', ''), 1);
    // Persist through the REAL API, as the migrated path now does.
    const rec = await page.evaluate((p) => {
      const uid = window._sbMintSceneUid('cg');
      const r = window._sbPersistSceneProjection({ uid: uid, kind: 'beats', input: p.beats, title: '', synopsis: '', fateCard: null });
      p.__sceneUid = r.uid;
      window._cgTemptFateCommitAtPersistence(p);
      return r;
    }, plan);
    cgUid = rec.uid;
    ok('the record carries a uid, a hash, revision 0 and a sidecar', !!rec.uid && !!rec.projection.hash && rec.projection.revision === 0 && !!rec.attributionSidecar);
    ok('the speaker labels the reader sees are IN the record — the 867-vs-813 divergence is closed',
      /THE PRESIDING DOHKAR: "What gathering is this\?"/.test(rec.text) && /JULIAN: "So do I\."/.test(rec.text), rec.text.slice(0, 200));

    // CONSUMER PARITY for an UNREVISED scene: every text consumer reads the same string.
    const parity = await page.evaluate((u) => {
      const f = window._sbSceneByUid(u);
      const rec = f.record, idx = f.index, s = window.state;
      return {
        byUid: rec.text,
        byIndex: s.scenes[idx].text,
        last: s.scenes[s.scenes.length - 1].text,
        priorTailStyle: String((s.scenes[s.scenes.length - 1] || {}).text || ''),  // the :100318 / :143464 shape
        sliceByIdx: (Array.isArray(s.scenes) && s.scenes[idx]) ? String(s.scenes[idx].text || '') : null,  // the :258772 shape
        domInput: (function () { const p = { text: rec.text, refused: false }; return p.text; })(),
        rendered: window._sbRenderProjectedText({ text: rec.text, refused: false }),
        hashMatches: window._sbTextHash(rec.text) === rec.projection.hash
      };
    }, cgUid);
    const all = [parity.byUid, parity.byIndex, parity.last, parity.priorTailStyle, parity.sliceByIdx, parity.domInput];
    ok('persisted text, DOM render input and every migrated consumer shape agree', new Set(all).size === 1, 'distinct=' + new Set(all).size);
    ok('...and the stored hash matches that exact text', parity.hashMatches === true);
    ok('the rendered DOM HTML contains the projected text and adds only markup',
      /<p[ >]/.test(parity.rendered) && parity.rendered.indexOf('The air stills and the voices falter.') !== -1);
    ok('...and the label survives into the DOM', parity.rendered.indexOf('THE PRESIDING DOHKAR') !== -1);

    // THE RE-SYNC, as a revision.
    await page.evaluate((u) => {
      window.state._temptOutcomePending = { 'dep': { key: 'dep', ctx: { storyId: 'a3-story', proposalId: 'p1', sceneUid: u, sceneIdx: 0 } } };
    }, cgUid);
    const noop = await page.evaluate((a) => window._sbReviseSceneProjection(a.u, { kind: 'beats', input: a.beats, reason: 'resync' }), { u: cgUid, beats: plan.beats });
    ok('re-running the re-sync with UNCHANGED beats does not bump the revision', noop.projection.revision === 0, 'rev=' + noop.projection.revision);
    ok('...and does not invalidate the pending extraction', (await page.evaluate(() => window.state._temptOutcomePending['dep'].invalidated)) === undefined);
    const revised = await page.evaluate((u) => window._sbReviseSceneProjection(u, { kind: 'beats', reason: 'resync',
      input: [{ idx: 0, kind: 'narration', text: 'The air stills, scrubbed.', speaker: null },
              { idx: 1, kind: 'dialogue', text: '"What gathering is this?"', speaker: 'the presiding Dohkar' }] }), cgUid);
    ok('a real scrub bumps the revision to 1 and keeps the uid', revised.projection.revision === 1 && revised.uid === cgUid);
    ok('...hash and sidecar are replaced TOGETHER against the new text',
      revised.projection.hash === (await page.evaluate((t) => window._sbTextHash(t), revised.text))
      && revised.attributionSidecar.entries.length === 2
      && revised.text.slice(revised.attributionSidecar.entries[0].start, revised.attributionSidecar.entries[0].end) === 'The air stills, scrubbed.');
    ok('...and the hash-bound pending extraction is INVALIDATED', (await page.evaluate(() => window.state._temptOutcomePending['dep'].invalidated)) === 'scene_projection_revised');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. Literary body path: DOM and record come from ONE prepared projection');
  {
    const r = await page.evaluate(() => {
      const s = window.state; s.scenes = []; s._temptOutcomePending = {};
      const raw = '[LORE: veilweave~concept~the fold~known~at dusk]\n\nShe felt the weave shift.';
      const uid = window._sbMintSceneUid('lit');
      const prep = window._sbPrepareBodyText(raw);                   // ONE stateful preparation
      const html = window._sbRenderProjectedText(prep);              // DOM from the projection
      const rec = window._sbPersistSceneProjection({ uid: uid, kind: 'body', input: prep.text, title: 'T', synopsis: 'S',
        projectionOpts: { refused: prep.refused, refusalReason: prep.refusalReason } });
      // A second render must not transform again.
      const before = JSON.stringify({ t: rec.text, h: rec.projection.hash });
      const html2 = window._sbRenderProjectedText({ text: rec.text, refused: false });
      const after = JSON.stringify({ t: rec.text, h: rec.projection.hash });
      return { prep: prep, html: html, html2: html2, rec: rec, before: before, after: after };
    });
    ok('the record text is the prepared text — the [LORE:] tag is gone from the RECORD, not just the view',
      r.rec.text.indexOf('[LORE:') === -1 && r.rec.text.indexOf('She felt the weave shift') !== -1, JSON.stringify(r.rec.text));
    ok('the DOM HTML contains no marker either', r.html.indexOf('[LORE:') === -1 && /<p[ >]/.test(r.html));
    ok('record and DOM derive from the SAME string', r.rec.text === r.prep.text);
    ok('a second render is byte-identical and changes nothing', r.html2 === r.html && r.before === r.after);
    ok('the body sidecar is one whole-text narrator entry', r.rec.attributionSidecar.entries.length === 1
      && r.rec.attributionSidecar.entries[0].sourceType === 'narrator'
      && r.rec.attributionSidecar.entries[0].end === r.rec.text.length);
    ok('title and synopsis are preserved through the API', r.rec.title === 'T' && r.rec.synopsis === 'S');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. ARCHIVE MOVEMENT and RELOAD resolve by UID, never by position');
  {
    const r = await page.evaluate(() => {
      const s = window.state;
      s.scenes = [];
      const u1 = window._sbMintSceneUid('cg');
      const r1 = window._sbPersistSceneProjection({ uid: u1, kind: 'body', input: 'Scene one prose.' });
      const u2 = window._sbMintSceneUid('cg');
      const r2 = window._sbPersistSceneProjection({ uid: u2, kind: 'body', input: 'Scene two prose.' });
      const idxBefore = { one: window._sbSceneByUid(u1).index, two: window._sbSceneByUid(u2).index };
      // An OAS archive splices in FRONT of scene two — every later index shifts.
      s.scenes.splice(1, 0, { uid: window._sbMintSceneUid('oas'), title: 'Intimate', synopsis: '', text: '',
        fateCard: null, oasArchive: { any: true },
        projection: { v: 1, kind: 'archive', hash: window._sbTextHash(''), revision: 0, provenance: 'archive_entry' },
        attributionSidecar: null, attributionAvailable: false });
      const idxAfter = { one: window._sbSceneByUid(u1).index, two: window._sbSceneByUid(u2).index };
      // RELOAD: state round-trips through JSON, as the snapshot does.
      const serialised = JSON.stringify(s.scenes);
      s.scenes = JSON.parse(serialised);
      const afterReload = window._sbSceneByUid(u2);
      return { idxBefore, idxAfter, u1, u2,
        twoTextAfterSplice: window._sbSceneByUid(u2).record.text,
        reloadResolves: !!afterReload, reloadText: afterReload && afterReload.record.text,
        reloadIndex: afterReload && afterReload.index,
        archiveResolvable: !!window._sbSceneByUid(s.scenes[1].uid),
        positionalWouldBeWrong: JSON.parse(serialised)[1].text };
    });
    ok('the archive splice DID shift the later index (otherwise this section is vacuous)',
      r.idxBefore.two === 1 && r.idxAfter.two === 2, JSON.stringify({ before: r.idxBefore, after: r.idxAfter }));
    ok('resolving BY UID still finds the right scene after the shift', r.twoTextAfterSplice === 'Scene two prose.');
    ok('...whereas position 1 now holds the ARCHIVE, so an index-based read would have been wrong',
      r.positionalWouldBeWrong === '', JSON.stringify(r.positionalWouldBeWrong));
    ok('the archive entry is itself resolvable by uid', r.archiveResolvable === true);
    ok('after a JSON reload the uid still resolves, at its new index', r.reloadResolves === true && r.reloadText === 'Scene two prose.' && r.reloadIndex === 2);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. Track B unchanged, extraction still disabled');
  {
    const st = await page.evaluate(() => {
      window.state._temptFateInvocations = []; window.state._temptFateInvocationFailsafe = [];
      window._tfoRecordAcceptedInvocation({ storyId: window.state.storyId, proposalId: 'pB', sceneIdx: 0, wishText: 'everyone forgets' }, { kind: 'persisted_at_capture' });
      return { off: window._tfoAutoExtractionOn(), blocked: window._tfoContinuationBlocked(window.state),
        dir: window._buildTemptFateUnresolvedInvocationDirective(), recs: window._tfoUnresolvedInvocations(window.state).length };
    });
    ok('automatic extraction still disabled', st.off === false);
    ok('continuation still not gated', st.blocked === null);
    ok('the invocation record still created', st.recs === 1);
    ok('...and the uncertainty directive still fires', /INVOCATION ACCEPTED/.test(st.dir) && /DO NOT assume the requested effect landed/.test(st.dir));
  }

  section('6. CONTAINMENT');
  {
    const real = gate.realCalls ? gate.realCalls() : [];
    ok('ZERO real provider requests', real.length === 0, 'got ' + real.length);
    ok('no path reported failing to persist through the API', !consoleLines.some((l) => /could not persist through the API/.test(l)));
  }

  await browser.close();
  console.log('\n' + '='.repeat(100));
  console.log('ROUTE + PARITY CONTROL: ' + pass + '/' + (pass + fail) + ' passed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
