// TRACK A STEP 1 — the projection-write API, and formatStory's text/presentation split.
// Zero provider requests. Automatic extraction stays disabled throughout.
//
// This is the FIRST increment of `state.scenes` canonicalization: the API and its tests, before any
// creation path is migrated. It proves the API's contract and, critically, that lifting formatStory's
// text half out changed nothing a reader sees — the parity discipline applied before the risky part.
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (m, c, d) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (d ? '  [' + d + ']' : '')); } };
const section = (t) => console.log('\n=== ' + t + ' ===');

(async () => {
  console.log('=== TRACK A: PROJECTION-WRITE API (zero provider requests) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_scene_projection_out.jsonl') });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state
    && typeof window._sbBuildSceneProjection === 'function'
    && typeof window._sbPersistSceneProjection === 'function'
    && typeof window._sbReviseSceneProjection === 'function'
    && typeof window._sbMigrateHistoricalScenes === 'function'
    && typeof window._sbSceneTextTransform === 'function'
    && typeof window._sbSceneByUid === 'function'
    && typeof window._sbTextHash === 'function'
    && typeof window._sbMintSceneUid === 'function', { timeout: 30000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: ' + (e && e.message)); await browser.close(); process.exit(2); });

  await page.evaluate(() => {
    const s = window.state;
    s.storyId = 'proj-story'; s.scenes = []; s.turnCount = 0;
    s.playerName = 'Lirael'; s.loveInterestName = 'Julian';
    s.picks = { world: 'Fantasy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s._temptOutcomePending = {}; s._temptFateInvocations = []; s._temptFateInvocationResolutions = [];
    s.contentMode = 'full'; s.mode = 'solo';
    window._tfoAutoExtractionEnabled = false;
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. formatStory PARITY — lifting the text half changed nothing a reader sees');
  {
    // Inputs chosen to exercise the transformations that were moved: a [LORE:] tag (stripped),
    // ordinary paragraphs, and quoted dialogue.
    const cases = await page.evaluate(() => {
      const inputs = [
        'A plain paragraph.\n\nAnother one.',
        '[LORE: veilweave~concept~the fold between~known~woven at dusk]\n\nShe felt the weave shift.',
        'She spoke.\n\n"What gathering is this?"\n\nNo one answered.',
        ''
      ];
      // formatStory's output, and the text half's output, for each input.
      return inputs.map((t) => ({
        input: t,
        html: (function () { try { return window.formatStory ? window.formatStory(t) : '<<no formatStory on window>>'; } catch (e) { return 'THREW: ' + e.message; } })(),
        transformed: (function () { try { const r = window._sbSceneTextTransform(t); return { text: r.text, refused: r.refused }; } catch (e) { return { err: e.message }; } })()
      }));
    });
    ok('formatStory is reachable and did not throw on any input', cases.every((c) => typeof c.html === 'string' && !/^THREW|no formatStory/.test(c.html)),
      JSON.stringify(cases.map((c) => String(c.html).slice(0, 40))));
    ok('the extracted text half runs and returns a string for every input', cases.every((c) => c.transformed && typeof c.transformed.text === 'string'));
    const lore = cases[1];
    ok('the [LORE:] tag is stripped by the TEXT half (the transformation that made record != reader)',
      lore.transformed.text.indexOf('[LORE:') === -1 && lore.transformed.text.indexOf('She felt the weave shift') !== -1,
      JSON.stringify(lore.transformed.text));
    ok('...and formatStory\'s own HTML output no longer contains it either — same behaviour as before, one implementation',
      lore.html.indexOf('[LORE:') === -1);
    ok('formatStory still emits paragraph markup — the presentation half stayed put',
      /<p[ >]/.test(cases[0].html), cases[0].html.slice(0, 80));
    // textAlreadyProjected must SKIP the text half, or the strips and state machines run twice.
    const skip = await page.evaluate(() => {
      const t = '[LORE: x~concept~y~known~z]\n\nBody.';
      const once = window._sbSceneTextTransform(t).text;
      const viaSkip = window.formatStory(once, false, { textAlreadyProjected: true });
      const viaNormal = window.formatStory(t);
      return { once, viaSkip, viaNormal };
    });
    ok('rendering already-projected text with textAlreadyProjected yields the same HTML as the one-pass route',
      skip.viaSkip === skip.viaNormal, 'skip=' + String(skip.viaSkip).slice(0, 60) + ' normal=' + String(skip.viaNormal).slice(0, 60));
    ok('...so the transformations cannot run twice on one scene', skip.once.indexOf('[LORE:') === -1);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. The BEATS projection — offsets, typing, labels');
  let beatsProj;
  {
    beatsProj = await page.evaluate(() => window._sbBuildSceneProjection('beats', [
      { idx: 0, kind: 'narration', text: 'The air stills and the voices falter.', speaker: null },
      { idx: 1, kind: 'dialogue', text: '"What gathering is this?"', speaker: 'the presiding Dohkar' },
      { idx: 2, kind: 'dialogue', text: '"We were to begin the rite."', speaker: 'Seren' },
      { idx: 3, kind: 'dialogue', text: '"I remember."', speaker: 'protagonist' },
      { idx: 4, kind: 'dialogue', text: '"So do I."', speaker: 'li' },
      { idx: 5, kind: 'dialogue', text: 'JULIAN: "already labelled."', speaker: 'li' },
      { idx: 6, kind: 'exposition', text: 'She had not meant to ask.', speaker: null }
    ]));
    ok('the projection succeeded', beatsProj.ok === true && beatsProj.kind === 'beats');
    ok('speaker labels are emitted for dialogue beats', /THE PRESIDING DOHKAR: "What gathering is this\?"/.test(beatsProj.text));
    ok('the PC label resolves through _resolvePcIdentity', /LIRAEL: "I remember\."/.test(beatsProj.text), beatsProj.text.slice(0, 250));
    ok('the LI label resolves through the relationship anchor, not the PC resolver', /JULIAN: "So do I\."/.test(beatsProj.text));
    const e = beatsProj.attributionSidecar.entries;
    ok('one sidecar entry per beat', e.length === 7, 'got ' + e.length);
    ok('EVERY offset pair slices back to its own rendered segment', e.every((x) => {
      return beatsProj.text.slice(x.start, x.end).length === (x.end - x.start);
    }));
    // The real check: slice equals label+text for each.
    const sliceCheck = await page.evaluate((p) => p.attributionSidecar.entries.map((x) => p.text.slice(x.start, x.end)), beatsProj);
    ok('...and the first slice is the narration beat verbatim', sliceCheck[0] === 'The air stills and the voices falter.', JSON.stringify(sliceCheck[0]));
    ok('...and the second is LABEL + line', sliceCheck[1] === 'THE PRESIDING DOHKAR: "What gathering is this?"', JSON.stringify(sliceCheck[1]));
    ok('narration beats are typed narrator', e[0].sourceType === 'narrator' && e[6].sourceType === 'narrator');
    ok('dialogue beats are typed speaker', e[1].sourceType === 'speaker' && e[3].sourceType === 'speaker');
    ok('each resolved speaker records WHICH authority resolved it', e[1].speakerAuthority === 'beatSpeakerName'
      && e[3].speakerAuthority === 'resolvePcIdentity' && e[4].speakerAuthority === 'relationshipAnchor:li',
      JSON.stringify(e.map((x) => x.speakerAuthority)));
    ok('labelSpan is recorded AS EMITTED and lies inside its entry',
      e[1].labelSpan && e[1].labelSpan.start === e[1].start && e[1].labelSpan.end <= e[1].end
      && beatsProj.text.slice(e[1].labelSpan.start, e[1].labelSpan.end) === 'THE PRESIDING DOHKAR: ');
    ok('the DOUBLE-LABEL GUARD holds: a beat already opening with the name gets NO label',
      e[5].labelSpan === null && sliceCheck[5] === 'JULIAN: "already labelled."', JSON.stringify(sliceCheck[5]));
    ok('narration entries carry no labelSpan and no speaker', e[0].labelSpan === null && e[0].speakerIdentity === null);
    ok('beats are separated by a blank line, as the pre-Track-A projection did', /falter\.\n\nTHE PRESIDING/.test(beatsProj.text));
  }

  section('2b. An UNRESOLVED dialogue speaker stays typed as speech');
  {
    const p = await page.evaluate(() => {
      const keep = window.state._relationshipLedger;
      window.state._relationshipLedger = null;               // no LI anchor to resolve
      window.state.loveInterestName = ''; window.state.partnerName = '';
      window.state.picks = { world: 'Fantasy', identity: {} };
      const r = window._sbBuildSceneProjection('beats', [{ idx: 0, kind: 'dialogue', text: '"Who said that?"', speaker: 'li' }]);
      window.state._relationshipLedger = keep;
      window.state.loveInterestName = 'Julian';
      window.state.picks = { world: 'Fantasy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
      return r;
    });
    const e0 = p.attributionSidecar.entries[0];
    ok('it is STILL sourceType "speaker", not silently reclassified as narration', e0.sourceType === 'speaker', e0.sourceType);
    // A LABEL IS NOT AN IDENTITY. With no LI name configured the anchor falls back to the literal
    // 'the love interest', which is right to SHOW the reader and must never count as a resolved
    // identity — otherwise a placeholder becomes citable as a person.
    ok('the placeholder label IS shown to the reader (parity with the pre-Track-A projection)',
      /THE LOVE INTEREST: "Who said that\?"/.test(p.text), JSON.stringify(p.text));
    ok('...but the IDENTITY is NOT resolved — a placeholder is not a person', e0.speakerResolved === false && e0.speakerIdentity === null,
      JSON.stringify({ resolved: e0.speakerResolved, id: e0.speakerIdentity }));
    ok('...and it is flagged as a placeholder explicitly, not left ambiguous', e0.speakerPlaceholder === true);
    ok('...with the labelSpan still recorded as emitted, so a cited span overlapping it can be refused',
      !!e0.labelSpan && p.text.slice(e0.labelSpan.start, e0.labelSpan.end) === 'THE LOVE INTEREST: ');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. The BODY projection — one whole-text narrator entry, transformations applied');
  {
    const p = await page.evaluate(() => window._sbBuildSceneProjection('body',
      '[LORE: fold~concept~the seam~known~at dusk]\n\nShe stepped through the seam.'));
    ok('the projection succeeded', p.ok === true && p.kind === 'body');
    ok('formatStory\'s TEXT transformations ran INSIDE the projection — the tag is gone from the record text',
      p.text.indexOf('[LORE:') === -1 && p.text.indexOf('She stepped through the seam.') !== -1, JSON.stringify(p.text));
    ok('exactly ONE narrator entry spanning the whole text', p.attributionSidecar.entries.length === 1
      && p.attributionSidecar.entries[0].sourceType === 'narrator'
      && p.attributionSidecar.entries[0].start === 0
      && p.attributionSidecar.entries[0].end === p.text.length);
    ok('...carrying no invented speaker structure', p.attributionSidecar.entries[0].speakerIdentity === null && p.attributionSidecar.entries[0].labelSpan === null);
    const empty = await page.evaluate(() => window._sbBuildSceneProjection('body', ''));
    ok('an empty body yields an empty sidecar rather than a zero-length entry', empty.attributionSidecar.entries.length === 0);
    const bad = await page.evaluate(() => window._sbBuildSceneProjection('nonsense', 'x'));
    ok('an unknown projection kind is REFUSED, not guessed', bad.ok === false && /unknown_projection_kind/.test(bad.reason));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. PERSIST — uid, hash, revision 0, sidecar on the record');
  let uid;
  {
    const rec = await page.evaluate(() => window._sbPersistSceneProjection({
      kind: 'beats', title: '', synopsis: '',
      input: [{ idx: 0, kind: 'narration', text: 'First.', speaker: null },
              { idx: 1, kind: 'dialogue', text: '"Second."', speaker: 'Seren' }]
    }));
    uid = rec.uid;
    ok('the record carries a uid', typeof rec.uid === 'string' && rec.uid.length > 0);
    ok('...and its text is the projection\'s text', /First\.\n\nSEREN: "Second\."/.test(rec.text), JSON.stringify(rec.text));
    ok('...a hash of that text', rec.projection.hash === (await page.evaluate((t) => window._sbTextHash(t), rec.text)));
    ok('...revision 0', rec.projection.revision === 0);
    ok('...provenance api_built', rec.projection.provenance === 'api_built');
    ok('...the sidecar, with attributionAvailable true', !!rec.attributionSidecar && rec.attributionAvailable === true);
    ok('it is resolvable BY UID, not by position', (await page.evaluate((u) => { const f = window._sbSceneByUid(u); return f && f.record.uid; }, uid)) === uid);
    const dup = await page.evaluate((u) => window._sbPersistSceneProjection({ uid: u, kind: 'body', input: 'different' }), uid);
    ok('persisting the SAME uid again is idempotent — no second record, no overwrite',
      dup.uid === uid && /First\./.test(dup.text) && (await page.evaluate(() => window.state.scenes.length)) === 1);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. REVISE — revision bumps, hash changes, UID IS STABLE, dependents invalidated');
  {
    // A pending extraction bound to this scene's uid, to prove invalidation is real.
    await page.evaluate((u) => {
      window.state._temptOutcomePending = {
        'dep': { key: 'dep', ctx: { storyId: 'proj-story', proposalId: 'p1', sceneUid: u, sceneIdx: 0 } },
        'other': { key: 'other', ctx: { storyId: 'proj-story', proposalId: 'p2', sceneUid: 'cg:unrelated', sceneIdx: 1 } }
      };
    }, uid);
    const before = await page.evaluate((u) => { const f = window._sbSceneByUid(u); return { hash: f.record.projection.hash, rev: f.record.projection.revision }; }, uid);
    const noop = await page.evaluate((u) => window._sbReviseSceneProjection(u, { kind: 'beats',
      input: [{ idx: 0, kind: 'narration', text: 'First.', speaker: null },
              { idx: 1, kind: 'dialogue', text: '"Second."', speaker: 'Seren' }] }), uid);
    ok('an identical rebuild is a NO-OP — no revision churn', noop.projection.revision === before.rev && noop.projection.hash === before.hash);
    ok('...and it does NOT invalidate anything', (await page.evaluate(() => window.state._temptOutcomePending['dep'].invalidated)) === undefined);

    const revised = await page.evaluate((u) => window._sbReviseSceneProjection(u, { kind: 'beats', reason: 'marker_strip',
      input: [{ idx: 0, kind: 'narration', text: 'First, scrubbed.', speaker: null },
              { idx: 1, kind: 'dialogue', text: '"Second."', speaker: 'Seren' }] }), uid);
    ok('a real change bumps revision to 1', revised.projection.revision === 1, JSON.stringify(revised.projection.revision));
    ok('...replaces the hash', revised.projection.hash !== before.hash);
    ok('...records the previous hash, so the chain is readable', revised.projection.previousHash === before.hash);
    ok('...names its reason', revised.projection.reason === 'marker_strip');
    ok('THE UID IS UNCHANGED — a rewrite is a new revision, not a new scene', revised.uid === uid);
    ok('...and there is still exactly ONE scene record', (await page.evaluate(() => window.state.scenes.length)) === 1);
    ok('...with the sidecar rebuilt against the new text', revised.attributionSidecar.entries[0].end === 'First, scrubbed.'.length);
    const dep = await page.evaluate(() => window.state._temptOutcomePending);
    ok('the dependent pending extraction is EXPLICITLY INVALIDATED', dep['dep'].invalidated === 'scene_projection_revised', JSON.stringify(dep['dep'].invalidated));
    ok('...naming the superseded hash in its reason', /cited text superseded/.test(String(dep['dep'].invalidatedReason)));
    ok('...and an UNRELATED pending record is untouched', dep['other'].invalidated === undefined);
    ok('revising an unknown uid is refused', (await page.evaluate(() => window._sbReviseSceneProjection('cg:nope', { kind: 'body', input: 'x' }))) === null);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. MIGRATION of historical records — frozen, marked, idempotent, never rebuilt');
  {
    await page.evaluate(() => {
      window.state.scenes = [
        { title: 'Old', synopsis: '', text: 'Historical prose with a [LORE: x~c~y~known~z] tag left in.', fateCard: null },
        { title: 'Arch', synopsis: '', text: '', fateCard: null, oasArchive: { any: true } }
      ];
    });
    const textsBefore = await page.evaluate(() => window.state.scenes.map((x) => x.text));
    const out = await page.evaluate(() => window._sbMigrateHistoricalScenes());
    ok('both historical records migrated', out.migrated.length === 2, JSON.stringify(out));
    const after = await page.evaluate(() => window.state.scenes.map((x) => ({ uid: x.uid, text: x.text, p: x.projection, avail: x.attributionAvailable, sc: x.attributionSidecar })));
    ok('THE TEXT IS BYTE-UNCHANGED — not re-rendered, not rebuilt', after[0].text === textsBefore[0] && after[1].text === textsBefore[1]);
    ok('...so the [LORE:] tag the reader\'s save contains is still there', after[0].text.indexOf('[LORE:') !== -1);
    ok('each got a uid', !!after[0].uid && !!after[1].uid && after[0].uid !== after[1].uid);
    ok('...marked uidProvenance "migrated"', after[0].p.uidProvenance === 'migrated');
    ok('...and projection provenance "historical_unbuilt", never mistakable for API-built', after[0].p.provenance === 'historical_unbuilt');
    ok('...frozen at revision 0 with a hash of the existing text', after[0].p.revision === 0 && after[0].p.hash === (await page.evaluate((t) => window._sbTextHash(t), textsBefore[0])));
    ok('an archive record is typed as such', after[1].p.kind === 'archive');
    ok('NO sidecar was manufactured', after[0].sc === null && after[1].sc === null);
    ok('...and absence is marked EXPLICITLY, so it cannot read as "no speakers present"', after[0].avail === false && after[1].avail === false);
    const out2 = await page.evaluate(() => window._sbMigrateHistoricalScenes());
    ok('a second migration pass migrates NOTHING', out2.migrated.length === 0 && out2.alreadyDone.length === 2, JSON.stringify(out2));
    ok('...and the uids are unchanged', (await page.evaluate(() => window.state.scenes.map((x) => x.uid))).join('|') === [after[0].uid, after[1].uid].join('|'));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('7. Track B behaviour is INTACT through the refactor');
  {
    const st = await page.evaluate(() => ({
      off: window._tfoAutoExtractionOn(),
      blocked: window._tfoContinuationBlocked(window.state),
      dirFn: typeof window._buildTemptFateUnresolvedInvocationDirective,
      recFn: typeof window._tfoRecordAcceptedInvocation,
      failsafeFn: typeof window._tfoRecordInvocationFailsafe
    }));
    ok('automatic extraction is still disabled', st.off === false);
    ok('continuation is still not gated', st.blocked === null);
    ok('the Track B directive builder is still present', st.dirFn === 'function');
    ok('the invocation recorder and its fail-safe are still present', st.recFn === 'function' && st.failsafeFn === 'function');
    const d = await page.evaluate(() => {
      window.state._temptFateInvocations = []; window.state._temptFateInvocationFailsafe = [];
      window._tfoRecordAcceptedInvocation({ storyId: 'proj-story', proposalId: 'pB', sceneIdx: 0, wishText: 'everyone forgets' }, { kind: 'persisted_at_capture' });
      return window._buildTemptFateUnresolvedInvocationDirective();
    });
    ok('...and it still emits the uncertainty rule', /INVOCATION ACCEPTED/.test(d) && /DO NOT assume the requested effect landed/.test(d));
  }

  section('8. CONTAINMENT');
  {
    const real = gate.realCalls ? gate.realCalls() : [];
    ok('ZERO real provider requests', real.length === 0, 'got ' + real.length);
  }

  await browser.close();
  console.log('\n' + '='.repeat(100));
  console.log('SCENE PROJECTION API CONTROL: ' + pass + '/' + (pass + fail) + ' passed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
