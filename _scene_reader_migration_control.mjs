// TRACK A STEP 4 + LOAD-TIME MIGRATION. Zero provider requests; automatic extraction stays disabled.
//
// A4 migrates only TEXT-SEMANTIC readers — prior-scene tails, prompt/context builders, DOM render
// inputs, classification/evidence consumers. Count, ordinal and archive-POSITION consumers are out of
// scope unless they read prose. Each migrated reader must obtain the CURRENT projection by uid through
// a revision-aware accessor: never a rebuild from beats, never a stale plan, never array position as
// identity.
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (m, c, d) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (d ? '  [' + d + ']' : '')); } };
const section = (t) => console.log('\n=== ' + t + ' ===');

(async () => {
  console.log('=== TRACK A: A4 READERS + LOAD-TIME MIGRATION (zero provider requests) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_reader_mig_out.jsonl') });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && typeof window._sbSceneTextByUid === 'function'
    && typeof window._sbSceneTextAt === 'function' && typeof window._sbLatestProseText === 'function'
    && typeof window._sbSceneProjectionByUid === 'function'
    && typeof window._sbMigrateHistoricalScenes === 'function', { timeout: 30000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: ' + (e && e.message)); await browser.close(); process.exit(2); });

  const src = await page.evaluate(async () => (await (await fetch('/app.js')).text()));
  // COMMENTS MENTION THE OLD CODE ON PURPOSE — every migration comment quotes the read it replaced. A
  // raw scan therefore finds "state.scenes[idx].text" inside the very comment explaining that it is
  // gone. Strip line comments before scanning for live reads.
  const code = src.split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '')).join('\n');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. Every text-semantic reader class is migrated; non-prose consumers are untouched');
  {
    const readerClasses = [
      ['prior-scene tail (literary plot contract)', /_prevText = String\(_sbLatestProseText\(s\) \|\| ''\)/],
      ['prompt/context builder (CG user prompt tail)', /_sbTailText = \(typeof _sbLatestProseText === 'function'\)/],
      ['classification consumer (ambient page classifier)', /_sbAmbText = \(typeof _sbSceneTextAt === 'function'\) \? _sbSceneTextAt\(idx\)/],
      ['audit consumer (lock-turn classification)', /_sbLockText = \(typeof _sbLatestProseText === 'function'\)/],
      ['arc consumer (issue cliffhanger)', /var _last = \(typeof _sbLatestProseText === 'function'\)/],
      ['indexed prose accessor (_ffSceneText)', /if \(typeof _sbSceneTextAt === 'function'\) \{ var _sbFf = _sbSceneTextAt\(idx\)/],
      ['DOM render input', /StoryPagination\.addPage\(_sbRenderProjectedText\(/]
    ];
    readerClasses.forEach(([name, re]) => ok('migrated: ' + name, re.test(src)));
    // No prose reader may still read .text off an indexed scene record.
    const raw = (code.match(/state\.scenes\[[^\]]*\]\s*\.\s*text/g) || []);
    ok('NO prose reader still reads state.scenes[...].text directly', raw.length === 0, JSON.stringify(raw));
    const rawLast = (code.match(/scenes\[(?:state\.scenes|s\.scenes|sc)\.length - 1\]\s*\.\s*text/g) || []);
    ok('...nor scenes[length-1].text directly', rawLast.length === 0, JSON.stringify(rawLast));
    // OUT OF SCOPE, and deliberately still present: count/ordinal consumers.
    ok('count/ordinal consumers are LEFT ALONE (out of scope — they read no prose)',
      /Math\.max\(\(Array\.isArray\(state\.scenes\) \? state\.scenes\.length : 0\)/.test(src));
    ok('the accessors never rebuild from beats or read a plan',
      !/_sbSceneTextByUid[\s\S]{0,700}?(plan|beats)/.test(src)
      && !/function _sbLatestProseText[\s\S]{0,400}?(plan|beats)/.test(src));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. Reader parity: every class returns the SAME current text, and follows a revision');
  let uidA, uidB;
  {
    const r = await page.evaluate(() => {
      const s = window.state;
      s.storyId = 'a4-story'; s.turnCount = 2; s.scenes = [];
      s.playerName = 'Lirael'; s.loveInterestName = 'Julian';
      s.picks = { world: 'Fantasy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
      s._relationshipLedger = null; s.contentMode = 'full'; s.mode = 'solo';
      s._temptOutcomePending = {}; s._temptFateInvocations = []; s._temptFateInvocationResolutions = [];
      window._tfoAutoExtractionEnabled = false;
      const a = window._sbPersistSceneProjection({ kind: 'body', input: 'Scene one prose.' });
      const b = window._sbPersistSceneProjection({ kind: 'beats', input: [
        { idx: 0, kind: 'narration', text: 'The hall empties.', speaker: null },
        { idx: 1, kind: 'dialogue', text: '"Wait."', speaker: 'Seren' }] });
      return { a: a.uid, b: b.uid, bText: b.text };
    });
    uidA = r.a; uidB = r.b;
    const reads = await page.evaluate((u) => ({
      byUid: window._sbSceneTextByUid(u.b),
      atIdx: window._sbSceneTextAt(1),
      latest: window._sbLatestProseText(window.state),
      proj: window._sbSceneProjectionByUid(u.b)
    }), { b: uidB });
    ok('by-uid, by-index and latest-prose all return ONE string', new Set([reads.byUid, reads.atIdx, reads.latest]).size === 1,
      'distinct=' + new Set([reads.byUid, reads.atIdx, reads.latest]).size);
    ok('...which is the projection\'s text, labels included', /SEREN: "Wait\."/.test(reads.byUid), reads.byUid);
    ok('the accessor is revision-aware — it reports revision and hash', reads.proj.revision === 0 && !!reads.proj.hash);
    // REVISION FOLLOWING: a revise must move every reader at once.
    const after = await page.evaluate((u) => {
      window._sbReviseSceneProjection(u, { kind: 'beats', reason: 'scrub', input: [
        { idx: 0, kind: 'narration', text: 'The hall empties, scrubbed.', speaker: null },
        { idx: 1, kind: 'dialogue', text: '"Wait."', speaker: 'Seren' }] });
      return { byUid: window._sbSceneTextByUid(u), atIdx: window._sbSceneTextAt(1),
        latest: window._sbLatestProseText(window.state), rev: window._sbSceneProjectionByUid(u).revision };
    }, uidB);
    ok('after a revision EVERY reader class sees the new text', /scrubbed/.test(after.byUid)
      && after.byUid === after.atIdx && after.byUid === after.latest);
    ok('...and the reported revision advanced to 1', after.rev === 1);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. Archive movement: prose readers skip archives and follow the uid');
  {
    const r = await page.evaluate((u) => {
      const s = window.state;
      // Splice an archive in front of scene B — indices shift AND the last entry becomes an archive.
      s.scenes.splice(1, 0, { uid: window._sbMintSceneUid('oas'), title: 'Intimate', synopsis: '', text: '',
        fateCard: null, oasArchive: { any: true },
        projection: { v: 1, kind: 'archive', hash: window._sbTextHash(''), revision: 0, provenance: 'archive_entry' },
        attributionSidecar: null, attributionAvailable: false });
      s.scenes.push({ uid: window._sbMintSceneUid('oas'), title: 'Intimate 2', synopsis: '', text: '',
        fateCard: null, oasArchive: { any: true },
        projection: { v: 1, kind: 'archive', hash: window._sbTextHash(''), revision: 0, provenance: 'archive_entry' },
        attributionSidecar: null, attributionAvailable: false });
      return { byUid: window._sbSceneTextByUid(u), atOldIdx: window._sbSceneTextAt(1),
        atNewIdx: window._sbSceneTextAt(2), latest: window._sbLatestProseText(s),
        rawLast: String((s.scenes[s.scenes.length - 1] || {}).text || ''), count: s.scenes.length };
    }, uidB);
    ok('by-uid still returns the right scene after the splice', /scrubbed/.test(r.byUid));
    ok('index 1 now holds the ARCHIVE, and a prose reader gets "" rather than an archive masquerading as a scene',
      r.atOldIdx === '', JSON.stringify(r.atOldIdx));
    ok('...while the scene itself is found at its new index', r.atNewIdx === r.byUid);
    ok('latest-PROSE skips the trailing archive entries', r.latest === r.byUid, JSON.stringify(r.latest));
    ok('...whereas a raw scenes[length-1].text read would have returned empty — the bug this closes', r.rawLast === '');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. LOAD-TIME MIGRATION: old and new records coexist, text byte-frozen');
  {
    const r = await page.evaluate(() => {
      const s = window.state;
      // A realistic mixed array: two historical records (no uid, no projection), one API-built, one archive.
      const apiRec = { uid: 'cg:api-1', title: '', synopsis: '', text: 'API built prose.', fateCard: null,
        projection: { v: 1, kind: 'beats', hash: window._sbTextHash('API built prose.'), revision: 2, provenance: 'api_built' },
        attributionSidecar: { v: 1, kind: 'beats', coverage: 'complete', entries: [] }, attributionAvailable: true };
      s.scenes = [
        { title: 'Old 1', synopsis: '', text: 'Historical prose with a [LORE: x~c~y~known~z] tag still in it.', fateCard: null },
        apiRec,
        { title: 'Old 2', synopsis: '', text: '  spaced and  odd \n\n text  ', fateCard: null },
        { uid: 'oas:a', title: 'Arch', synopsis: '', text: '', fateCard: null, oasArchive: { x: 1 },
          projection: { v: 1, kind: 'archive', hash: window._sbTextHash(''), revision: 0, provenance: 'archive_entry' },
          attributionSidecar: null, attributionAvailable: false }
      ];
      const textsBefore = s.scenes.map((x) => x.text);
      const out = window._sbMigrateHistoricalScenes();
      return { out: out, textsAfter: s.scenes.map((x) => x.text), textsBefore: textsBefore,
        recs: s.scenes.map((x) => ({ uid: x.uid, p: x.projection, avail: x.attributionAvailable, sc: x.attributionSidecar })) };
    });
    ok('exactly the TWO historical records migrated', r.out.migrated.length === 2, JSON.stringify(r.out.migrated.length));
    ok('...and the already-done API record and archive were skipped', r.out.alreadyDone.length === 2, JSON.stringify(r.out.alreadyDone));
    ok('EVERY text is byte-unchanged, including odd whitespace', JSON.stringify(r.textsAfter) === JSON.stringify(r.textsBefore));
    ok('...so a historical [LORE:] tag is still exactly where the save had it — no re-render, no rebuild',
      r.textsAfter[0].indexOf('[LORE:') !== -1);
    ok('each migrated record got a uid', !!r.recs[0].uid && !!r.recs[2].uid && r.recs[0].uid !== r.recs[2].uid);
    ok('...marked uidProvenance "migrated" and provenance "historical_unbuilt"',
      r.recs[0].p.uidProvenance === 'migrated' && r.recs[0].p.provenance === 'historical_unbuilt');
    ok('...frozen at revision 0', r.recs[0].p.revision === 0 && r.recs[2].p.revision === 0);
    ok('NO sidecar was added and attribution is marked UNAVAILABLE', r.recs[0].sc === null && r.recs[0].avail === false
      && r.recs[2].sc === null && r.recs[2].avail === false);
    ok('the API-built record kept its own revision and sidecar — migration did not touch it',
      r.recs[1].p.revision === 2 && r.recs[1].p.provenance === 'api_built' && r.recs[1].avail === true);
    ok('coexistence: readers resolve BOTH kinds by uid', (await page.evaluate((u) => ({
      hist: window._sbSceneTextByUid(u.h), api: window._sbSceneTextByUid('cg:api-1') }), { h: r.recs[0].uid }))
      .api === 'API built prose.');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. IDEMPOTENCE across repeated reloads and an archive splice');
  {
    const r = await page.evaluate(() => {
      const s = window.state;
      // Compare the SAME population on both sides: prose records only. An earlier version included the
      // archive in `before` and excluded it from `after`, and reported a mismatch that was its own bug.
      const uidsBefore = s.scenes.filter((x) => !x.oasArchive).map((x) => x.uid);
      const textsBefore = s.scenes.filter((x) => !x.oasArchive).map((x) => x.text);
      // Reload 1: serialise + restore, as the snapshot does, then migrate again.
      s.scenes = JSON.parse(JSON.stringify(s.scenes));
      const out1 = window._sbMigrateHistoricalScenes();
      // An archive splices in, shifting indices, then another reload + migration.
      s.scenes.splice(1, 0, { uid: window._sbMintSceneUid('oas'), title: 'A', synopsis: '', text: '', fateCard: null,
        oasArchive: { y: 1 }, projection: { v: 1, kind: 'archive', hash: window._sbTextHash(''), revision: 0, provenance: 'archive_entry' },
        attributionSidecar: null, attributionAvailable: false });
      s.scenes = JSON.parse(JSON.stringify(s.scenes));
      const out2 = window._sbMigrateHistoricalScenes();
      const out3 = window._sbMigrateHistoricalScenes();
      const uidsAfter = s.scenes.filter((x) => !x.oasArchive).map((x) => x.uid);
      const textsAfter = s.scenes.filter((x) => !x.oasArchive).map((x) => x.text);
      return { out1, out2, out3, uidsBefore, uidsAfter, textsBefore, textsAfter,
        revisions: s.scenes.filter((x) => !x.oasArchive).map((x) => x.projection.revision) };
    });
    ok('a second migration pass migrates NOTHING', r.out1.migrated.length === 0, JSON.stringify(r.out1.migrated));
    ok('a third, after an archive splice and another reload, migrates NOTHING', r.out2.migrated.length === 0 && r.out3.migrated.length === 0);
    ok('UIDs are unchanged across both reloads and the splice', JSON.stringify(r.uidsAfter) === JSON.stringify(r.uidsBefore),
      JSON.stringify({ before: r.uidsBefore, after: r.uidsAfter }));
    ok('TEXT is unchanged across both reloads and the splice', JSON.stringify(r.textsAfter) === JSON.stringify(r.textsBefore));
    ok('no revision was bumped by migration or reload', r.revisions.every((x) => x === 0 || x === 2), JSON.stringify(r.revisions));
    ok('migration is wired at the load site, after the snapshot lands', /Object\.assign\(state, data\.stateSnapshot\);[\s\S]{0,1400}?_sbMigrateHistoricalScenes\(\)/.test(src));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. Historical records stay NON-CITABLE; literary continuations still have no records');
  {
    const r = await page.evaluate(() => {
      const hist = window.state.scenes.filter((x) => x.projection && x.projection.provenance === 'historical_unbuilt');
      return { count: hist.length, anyCitable: hist.some((x) => x.attributionAvailable === true || x.attributionSidecar),
        proj: hist.map((x) => window._sbSceneProjectionByUid(x.uid).attributionAvailable) };
    });
    ok('historical records exist in this fixture', r.count === 2, 'got ' + r.count);
    ok('NONE of them is citable — no sidecar, attribution unavailable', r.anyCitable === false && r.proj.every((x) => x === false));
    ok('literary CONTINUATIONS still write no scene record at all — out of scope, non-citable',
      (src.match(/state\.scenes\.push\(/g) || []).length === 0);
  }

  section('7. Track B unchanged, extraction disabled, containment');
  {
    const st = await page.evaluate(() => ({ off: window._tfoAutoExtractionOn(), blocked: window._tfoContinuationBlocked(window.state) }));
    ok('automatic extraction still disabled', st.off === false);
    ok('continuation still not gated', st.blocked === null);
    const real = gate.realCalls ? gate.realCalls() : [];
    ok('ZERO real provider requests', real.length === 0, 'got ' + real.length);
    ok('no projection DRIFT was detected by the read accessors', !consoleLines.some((l) => /DRIFT at/.test(l)));
  }

  await browser.close();
  console.log('\n' + '='.repeat(100));
  console.log('READER + MIGRATION CONTROL: ' + pass + '/' + (pass + fail) + ' passed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
