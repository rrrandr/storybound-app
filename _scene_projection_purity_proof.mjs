// TRACK A — PROJECTION PURITY. Bounded, zero provider requests, no path migration.
//
// WHY THIS EXISTS. _sbBuildSceneProjection will be called by persistence, DOM rendering, reload and
// downstream context builders. If it mutates story state, merely RENDERING a scene changes the story —
// and worse, a rebuild becomes non-deterministic, so a state machine that had already advanced would
// produce different text and a spurious new revision. Two real sources existed in step 1 and are now
// closed:
//   1. the LI branch called _relLedger(true), which CREATES relationship entities;
//   2. the body projection called _sbSceneTextTransform, which advances the lore ledger and the
//      scar / near-miss / grievance / micro-expression state machines.
//
// The check is a FULL-STATE DIFF, not a list of key names I guessed: every enumerable, serialisable
// path of window.state is compared before and after. That catches relationship entities and edges,
// phrase-ledger movement, rotation-pool movement, and anything else — including things this proof's
// author did not think of.
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (m, c, d) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (d ? '  [' + d + ']' : '')); } };
const section = (t) => console.log('\n=== ' + t + ' ===');

(async () => {
  console.log('=== TRACK A: PROJECTION PURITY (zero provider requests) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_purity_out.jsonl') });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && typeof window._sbBuildSceneProjection === 'function'
    && typeof window._sbPrepareBodyText === 'function'
    && typeof window._resolveLiIdentityLabel === 'function'
    && typeof window._sbSceneTextTransform === 'function', { timeout: 30000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: ' + (e && e.message)); await browser.close(); process.exit(2); });

  // A deep, path-reporting state differ installed in the page, so a failure NAMES what moved.
  await page.evaluate(() => {
    window.__snapState = function () {
      const seen = new WeakSet();
      const walk = (v) => {
        if (v === null || typeof v !== 'object') return (typeof v === 'function' || typeof v === 'undefined') ? '<fn/undef>' : v;
        if (seen.has(v)) return '<cycle>';
        seen.add(v);
        if (Array.isArray(v)) return v.map(walk);
        const out = {};
        Object.keys(v).sort().forEach((k) => { try { out[k] = walk(v[k]); } catch (_) { out[k] = '<throw>'; } });
        return out;
      };
      return walk(window.state);
    };
    window.__diffPaths = function (a, b, base, acc) {
      base = base || ''; acc = acc || [];
      if (acc.length > 40) return acc;
      const ta = (a === null) ? 'null' : typeof a, tb = (b === null) ? 'null' : typeof b;
      if (ta !== tb) { acc.push(base + ' (type ' + ta + ' -> ' + tb + ')'); return acc; }
      if (ta !== 'object') { if (a !== b) acc.push(base + ' (' + JSON.stringify(a) + ' -> ' + JSON.stringify(b) + ')'); return acc; }
      if (Array.isArray(a)) {
        if (a.length !== b.length) acc.push(base + '.length (' + a.length + ' -> ' + b.length + ')');
        for (let i = 0; i < Math.max(a.length, b.length); i++) window.__diffPaths(a[i], b[i], base + '[' + i + ']', acc);
        return acc;
      }
      const keys = Array.from(new Set(Object.keys(a).concat(Object.keys(b))));
      keys.forEach((k) => window.__diffPaths(a[k], b[k], base + '.' + k, acc));
      return acc;
    };
  });

  const BEATS = [
    { idx: 0, kind: 'narration', text: 'The air stills and the voices falter.', speaker: null },
    { idx: 1, kind: 'dialogue', text: '"What gathering is this?"', speaker: 'the presiding Dohkar' },
    { idx: 2, kind: 'dialogue', text: '"I remember."', speaker: 'protagonist' },
    { idx: 3, kind: 'dialogue', text: '"So do I."', speaker: 'li' },
    { idx: 4, kind: 'exposition', text: 'She had not meant to ask.', speaker: null }
  ];
  // Bodies chosen to exercise EVERY transform mode the moved text half contains.
  const BODIES = {
    plain: 'A plain paragraph.\n\nAnother one.',
    lore: '[LORE: veilweave~concept~the fold~known~woven at dusk]\n\nShe felt the weave shift.',
    scar: 'Before.\n\n<!--scar:{"kind":"betrayal"}-->\n\nAfter.',
    microExpr: 'She looked up.\n\n<<MICRO_EXPRESSION: guarded>>\n\nAnd away.',
    transitional: 'The night closed.\n\n<<TRANSITIONAL_EXPRESSION: silent>>',
    explicit: 'They kissed.\n\nHer naked shoulder caught the light and he thrust closer.\n\nAfter.'
  };

  async function setupState(opts) {
    await page.evaluate((o) => {
      const s = window.state;
      s.storyId = 'purity-story'; s.turnCount = 0;
      s.playerName = 'Lirael'; s.loveInterestName = o.li ? 'Julian' : '';
      s.partnerName = ''; s.picks = { world: 'Fantasy', identity: { playerName: 'Lirael', partnerName: o.li ? 'Julian' : '' } };
      s.scenes = [{ uid: 'cg:accepted-1', title: '', synopsis: '', text: 'An accepted scene.', fateCard: null,
        projection: { v: 1, kind: 'beats', hash: 'h0-18', revision: 0, provenance: 'api_built' },
        attributionSidecar: { v: 1, kind: 'beats', coverage: 'complete', entries: [] }, attributionAvailable: true }];
      s.contentMode = o.safe ? 'safe' : 'full'; s.mode = 'solo';
      s._temptOutcomePending = {}; s._temptFateInvocations = []; s._temptFateInvocationResolutions = [];
      // THE MISSING LEDGER — the exact condition that made step 1's LI branch create one.
      s._relationshipLedger = null;
      window._tfoAutoExtractionEnabled = false;
    }, opts);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. The LI branch no longer CREATES a relationship ledger');
  {
    await setupState({ li: true, safe: false });
    const r = await page.evaluate((b) => {
      const before = window.__snapState();
      const ledgerBefore = window.state._relationshipLedger;
      const proj = window._sbBuildSceneProjection('beats', b);
      const after = window.__snapState();
      return { diffs: window.__diffPaths(before, after, 'state'),
        ledgerBefore: ledgerBefore, ledgerAfter: window.state._relationshipLedger,
        text: proj.text, entries: proj.attributionSidecar.entries };
    }, BEATS);
    ok('the relationship ledger is still null — the build created NOTHING', r.ledgerAfter === null,
      JSON.stringify(r.ledgerAfter && Object.keys(r.ledgerAfter)));
    ok('no state path changed at all', r.diffs.length === 0, r.diffs.slice(0, 6).join(' | '));
    ok('...and the LI label STILL resolves, read-only, through the one shared chain',
      /JULIAN: "So do I\."/.test(r.text), r.text.slice(0, 200));
    const li = r.entries[3];
    ok('...recorded with the anchor authority and a resolved identity', li.speakerAuthority === 'relationshipAnchor:li' && li.speakerResolved === true && li.speakerIdentity === 'Julian');
    ok('the PC still resolves through _resolvePcIdentity', r.entries[2].speakerAuthority === 'resolvePcIdentity' && r.entries[2].speakerIdentity === 'Lirael');
  }

  section('1b. With a ledger PRESENT, the anchor is preferred and still not written');
  {
    await setupState({ li: true, safe: false });
    const r = await page.evaluate((b) => {
      // Seed a ledger deliberately, OUTSIDE the projection, as an acceptance/setup phase would.
      // v must be REL_V (1) or window._relLedger (create=false) rejects it and returns null.
      window.state._relationshipLedger = { v: 1, storyId: 'purity-story', processed: {}, edges: {}, seq: 0,
        entities: { 'pc:anchor': { id: 'pc:anchor', anchorRole: 'pc', label: 'Lirael', aliases: [] },
                    'li:anchor': { id: 'li:anchor', anchorRole: 'li', label: 'Julian Vance', aliases: [] } } };
      const before = window.__snapState();
      const proj = window._sbBuildSceneProjection('beats', b);
      const after = window.__snapState();
      return { diffs: window.__diffPaths(before, after, 'state'), text: proj.text,
        ledgerVisible: !!(window._relLedger && window._relLedger()) };
    }, BEATS);
    ok('the seeded ledger is actually visible to the read-only accessor (otherwise the next check is vacuous)', r.ledgerVisible === true);
    ok('the anchor label wins over the raw chain', /JULIAN VANCE: "So do I\."/.test(r.text), r.text.slice(0, 220));
    ok('...and still nothing mutated', r.diffs.length === 0, r.diffs.slice(0, 6).join(' | '));
  }

  section('1c. A placeholder LI is shown but not resolved, still without mutation');
  {
    await setupState({ li: false, safe: false });
    const r = await page.evaluate((b) => {
      const before = window.__snapState();
      const proj = window._sbBuildSceneProjection('beats', b);
      const after = window.__snapState();
      return { diffs: window.__diffPaths(before, after, 'state'), text: proj.text, e: proj.attributionSidecar.entries[3] };
    }, BEATS);
    ok('the placeholder label is shown', /THE LOVE INTEREST: "So do I\."/.test(r.text), r.text.slice(0, 220));
    ok('...but the identity is unresolved and flagged', r.e.speakerResolved === false && r.e.speakerPlaceholder === true && r.e.speakerIdentity === null);
    ok('...and no ledger was created', (await page.evaluate(() => window.state._relationshipLedger)) === null);
    ok('...and no state path changed', r.diffs.length === 0, r.diffs.slice(0, 6).join(' | '));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. The BODY projection is pure across EVERY transform mode');
  {
    for (const [name, body] of Object.entries(BODIES)) {
      await setupState({ li: true, safe: (name === 'explicit') });
      const r = await page.evaluate((b) => {
        // Prepare ONCE — the acceptance phase, where mutation is expected and allowed.
        const prep = window._sbPrepareBodyText(b);
        const before = window.__snapState();
        const p1 = window._sbBuildSceneProjection('body', prep.text, { refused: prep.refused });
        const mid = window.__snapState();
        const p2 = window._sbBuildSceneProjection('body', prep.text, { refused: prep.refused });
        const after = window.__snapState();
        return {
          prep: prep,
          diffs1: window.__diffPaths(before, mid, 'state'),
          diffs2: window.__diffPaths(mid, after, 'state'),
          same: p1.text === p2.text && p1.hash === p2.hash
            && JSON.stringify(p1.attributionSidecar) === JSON.stringify(p2.attributionSidecar),
          text: p1.text, hash: p1.hash
        };
      }, body);
      ok('[' + name + '] the build mutates NOTHING', r.diffs1.length === 0 && r.diffs2.length === 0,
        (r.diffs1.concat(r.diffs2)).slice(0, 5).join(' | '));
      ok('[' + name + '] two builds from the same prepared text are IDENTICAL (text, hash, sidecar)', r.same === true);
    }
    // THE ISOLATION IS NOT VACUOUS. The point is provable directly: the same raw text keeps its
    // markers when handed to the BUILD, and loses them when handed to PREPARE. So the transforms
    // really are outside the build — not merely inert for these inputs.
    await setupState({ li: true, safe: false });
    const moved = await page.evaluate((b) => {
      const beforeAll = window.__snapState();
      const rawBuild = window._sbBuildSceneProjection('body', b);      // RAW text, straight to build
      const afterBuild = window.__snapState();
      const prep = window._sbPrepareBodyText(b);
      const afterPrep = window.__snapState();
      return {
        buildKeptMarker: rawBuild.text.indexOf('[LORE:') !== -1,
        buildDiffs: window.__diffPaths(beforeAll, afterBuild, 'state'),
        prepStripped: prep.text.indexOf('[LORE:') === -1,
        prepDiffs: window.__diffPaths(afterBuild, afterPrep, 'state')
      };
    }, BODIES.lore);
    ok('the BUILD leaves a marker untouched — it does not transform text at all', moved.buildKeptMarker === true);
    ok('...and mutates nothing even when handed raw, untransformed text', moved.buildDiffs.length === 0, moved.buildDiffs.slice(0, 5).join(' | '));
    ok('the PREPARE step is the one that strips it — the transform lives outside the build', moved.prepStripped === true);
    // Reported rather than asserted: whether prepare's state machines visibly advance depends on
    // upstream parsing having registered terms, so a zero-diff here is information, not a failure.
    console.log('    NOTE: prepare-phase observable state diffs for this input: ' + moved.prepDiffs.length
      + (moved.prepDiffs.length ? ' (' + moved.prepDiffs.slice(0, 3).join(' | ') + ')' : ' — none observable; the transforms\'s state machines need upstream registration to move'));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. Twice from identical state: text, hash, revision decision and sidecar all identical');
  {
    await setupState({ li: true, safe: false });
    const r = await page.evaluate((b) => {
      const p1 = window._sbBuildSceneProjection('beats', b);
      const p2 = window._sbBuildSceneProjection('beats', b);
      // The revision DECISION: persisting then re-revising with the same input must be a no-op.
      const rec = window._sbPersistSceneProjection({ kind: 'beats', input: b });
      const rev0 = rec.projection.revision;
      const again = window._sbReviseSceneProjection(rec.uid, { kind: 'beats', input: b });
      return {
        textSame: p1.text === p2.text, hashSame: p1.hash === p2.hash,
        sidecarSame: JSON.stringify(p1.attributionSidecar) === JSON.stringify(p2.attributionSidecar),
        rev0: rev0, revAfter: again.projection.revision, uidSame: again.uid === rec.uid
      };
    }, BEATS);
    ok('identical text on both calls', r.textSame);
    ok('identical hash on both calls', r.hashSame);
    ok('identical sidecar on both calls', r.sidecarSame);
    ok('the REVISION DECISION is identical — a rebuild from the same input creates NO new revision',
      r.rev0 === 0 && r.revAfter === 0, 'rev0=' + r.rev0 + ' after=' + r.revAfter);
    ok('...and the uid is unchanged', r.uidSame);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. Rendering projected text through formatStory does not re-run transforms');
  {
    await setupState({ li: true, safe: false });
    const r = await page.evaluate((b) => {
      const prep = window._sbPrepareBodyText(b);               // transforms run here, once
      const proj = window._sbBuildSceneProjection('body', prep.text);
      const before = window.__snapState();
      const html = window.formatStory(proj.text, false, { textAlreadyProjected: true });
      const after = window.__snapState();
      const proj2 = window._sbBuildSceneProjection('body', proj.text);
      return {
        diffs: window.__diffPaths(before, after, 'state'),
        html: html, projText: proj.text,
        unchangedProjection: proj2.text === proj.text && proj2.hash === proj.hash
      };
    }, BODIES.lore);
    ok('rendering mutates NO state when the text is already projected', r.diffs.length === 0, r.diffs.slice(0, 6).join(' | '));
    ok('...the rendered HTML wraps the projected text', /<p[ >]/.test(r.html) && r.html.indexOf('She felt the weave shift') !== -1);
    ok('...and does not reintroduce or re-strip the marker', r.html.indexOf('[LORE:') === -1 && r.projText.indexOf('[LORE:') === -1);
    ok('re-projecting AFTER a render yields the identical projection — no spurious revision', r.unchangedProjection === true);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. Track B is still intact');
  {
    const st = await page.evaluate(() => ({ off: window._tfoAutoExtractionOn(), blocked: window._tfoContinuationBlocked(window.state) }));
    ok('automatic extraction still disabled', st.off === false);
    ok('continuation still not gated', st.blocked === null);
  }

  section('6. CONTAINMENT');
  {
    const real = gate.realCalls ? gate.realCalls() : [];
    ok('ZERO real provider requests', real.length === 0, 'got ' + real.length);
  }

  await browser.close();
  console.log('\n' + '='.repeat(100));
  console.log('PROJECTION PURITY PROOF: ' + pass + '/' + (pass + fail) + ' passed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('PROOF ERROR:', e && e.stack || e); process.exit(2); });
