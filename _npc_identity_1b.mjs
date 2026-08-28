// 1B — DISCLOSURE + SALIENCE REFERENCE CANONICAL IDENTITY. No paid calls; see COST below.
//
// Both stores collapsed identity at their KEYS: _characterDisclosureLedger[normalizedName] and
// _sceneEntityState[name]. Two same-named characters could not coexist, and adding an `entityId`
// FIELD would not have helped — the collision is in the key. v2 keys canonical records by
// canonical id, keeps a derived name multimap, and leaves v1 rows as untouched legacy until a
// LATER VERIFIED MENTION attaches them.
//
// The identity rules under test: disclosure and salience REFERENCE identity, never own it;
// ambiguity fails closed and preserves evidence unattached; legacy memory alone cannot mint an
// identity; renames and supersession lose neither history.
//
// COST: this suite deliberately makes FIVE locally intercepted mock extraction requests — the
// idempotency section is about exact request counts, so "zero model calls" would be the wrong
// assertion and a green one would mean it tested nothing. Escaped data requests: zero. Paid
// provider calls: zero. All three are asserted separately in section 11.
//
// usage: node _npc_identity_1b.mjs   (needs vercel dev on :3000)
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const ORC = fs.readFileSync('public/orchestration-client.js', 'utf8');
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

async function preflight(url = 'http://localhost:3000/') {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(url, { signal: ctl.signal });
    clearTimeout(timer);
    const body = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!/<\s*script|<\s*html/i.test(body)) throw new Error('response is not the app shell');
  } catch (e) {
    console.error(`\n  ✗ INFRASTRUCTURE: ${url} is not serving the app (${e.message}).`);
    console.error('    npx vercel dev --listen 3000   —   if "already running", it may be hung');
    console.error('    while still holding the port: lsof -nP -iTCP:3000, then kill that PID.\n');
    process.exit(2);
  }
}
await preflight();

console.log(`\n${'═'.repeat(88)}\n1B — DISCLOSURE + SALIENCE REFERENCE IDENTITY, NEVER OWN IT\n${'═'.repeat(88)}\n`);

const browser = await chromium.launch({ headless: true });
let _closing = false;
const closeBrowser = async () => { if (_closing) return; _closing = true; try { await browser.close(); } catch (_) {} };
process.on('uncaughtException', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('unhandledRejection', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('exit', () => { try { browser.close(); } catch (_) {} });

const ctx = await browser.newContext();
try {
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000); page.setDefaultNavigationTimeout(120000);
  const clog = [];
  page.on('console', m => { const x = m.text();
    if (/CHAR-ADMIT|CHAR-LEDGER|DISCLOSURE|LEDGER/i.test(x)) clog.push(x.slice(0, 180)); });
  // THREE DIFFERENT NUMBERS, NEVER CONFLATED (2026-08-28):
  //   intercepted — mock extraction requests this suite MEANS to make; an exact count is the
  //                 whole point of the idempotency section, so "zero model calls" would be the
  //                 wrong assertion and a green one would mean the test did nothing.
  //   escaped     — anything that reached the real network. Must be zero.
  //   paid        — anything that reached a real model provider. Must be zero.
  let modelCalls = 0, escaped = 0, paid = 0; const escapedUrls = [];
  const PAID_HOST = /api\.openai|api\.anthropic|api\.x\.ai|api\.mistral|generativelanguage|api\.groq/i;
  const STATIC_ASSET = /fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com|use\.typekit\.net|p\.typekit\.net/i;
  await page.route('**/*', async route => {
    const url = route.request().url();
    if (/^http:\/\/localhost:3000\//.test(url)) return route.fallback();
    if (PAID_HOST.test(url)) { paid++; return route.abort(); }
    // Page chrome, not data: the font stylesheets and the CDN script tag the shell loads. They
    // carry no story content and reach no backend, so counting them as "escaped" would make the
    // assertion permanently red for a reason unrelated to what it is guarding.
    if (STATIC_ASSET.test(url)) return route.abort();
    escaped++;
    escapedUrls.push(url.slice(0, 120));
    return route.abort();
  });
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
  await page.route('**/orchestration-client.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: ORC }));
  await page.route('**/api/**', async route => {
    const url = route.request().url();
    if (/\/api\/(config|geo|csp-report|beta-events)\b/.test(url)) return route.continue();
    if (/proxy|chat|complet|grok|mistral/i.test(url)) modelCalls++;
    return route.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' });
  });
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window._charLedgerApplyVerified && window._charLedgerResolve
    && window._salienceRehome && window._salienceRecordFor, { timeout:60000 });

  const R = await page.evaluate(() => {
    const s = window.state;
    const out = {};
    const reset = (id) => {
      Object.assign(s, { storyId: id, name: 'Lirael', playerName: 'Lirael',
        loveInterestName: 'Julian', partnerName: 'Julian',
        _characterDisclosureLedger: {}, _relationshipLedger: null,
        _sceneEntityState: {}, _sceneEntityStoryId: id, _ledgerProcessedUids: {} });
    };
    const apply = (name, scene, extra) => window._charLedgerApplyVerified(
      Object.assign({ name, present: true }, extra || {}), scene);

    // ── 1 · A VERIFIED ORDINARY NPC GETS AN EDGE-FREE IDENTITY ──
    reset('t1');
    const r1 = apply('Marta', 1, { newLayer: 'counts the stalls twice' });
    out.plainNpc = { status: r1.status, cid: r1.canonicalId,
      layers: r1.record.revealedLayers.slice(),
      edges: Object.keys(window._relLedger().edges).length,
      entityKind: (window._relLedger().entities[r1.canonicalId] || {}).kind };

    // ── 2 · SAME-NAME TWINS COEXIST ──
    reset('t2');
    const a = window._relEntityForName('Robin', { kind: 'named', create: true, canonicalId: 'cast:A' });
    const b = window._relEntityForName('Robin', { kind: 'named', create: true, canonicalId: 'cast:B' });
    const C = window._charLedgerContainer({ persist: true });
    C.byEntity[a] = { name: 'Robin', canonicalId: a, appearances: 2, revealedLayers: ['A layer'], firstScene: 1, lastSeenScene: 2 };
    C.byEntity[b] = { name: 'Robin', canonicalId: b, appearances: 5, revealedLayers: ['B layer'], firstScene: 1, lastSeenScene: 3 };
    out.twins = { distinct: a !== b,
      resolve: window._charLedgerResolve('Robin').status,
      bothKept: !!C.byEntity[a] && !!C.byEntity[b],
      aLayers: C.byEntity[a].revealedLayers.slice(), bLayers: C.byEntity[b].revealedLayers.slice() };
    // a verified mention under that name attaches to NEITHER
    const amb = apply('Robin', 4, { newLayer: 'ambiguous evidence' });
    out.twinsAmbiguous = { status: amb.status,
      aUnchanged: C.byEntity[a].revealedLayers.length === 1,
      bUnchanged: C.byEntity[b].revealedLayers.length === 1,
      preserved: !!(C.legacy['robin'] && C.legacy['robin'].ambiguous),
      preservedLayer: !!(C.legacy['robin'] && C.legacy['robin'].revealedLayers.includes('ambiguous evidence')) };

    // ── 3 · LEGACY ALONE CANNOT MINT AN IDENTITY ──
    reset('t3');
    const C3 = window._charLedgerContainer({ persist: true });
    C3.legacy['ghost'] = { name: 'Ghost', appearances: 4, revealedLayers: ['old layer'], firstScene: 1, lastSeenScene: 2 };
    // DRIVEN THROUGH THE PRODUCTION RESOLVER, not a direct helper call: _relIngestRelations is
    // what a scene's extracted relations actually go through, and it is the path where a legacy
    // row could once mint an identity.
    window._relSeedFromState();
    const relBefore = Object.keys(window._relLedger().entities).length;
    const edgeBefore = Object.keys(window._relLedger().edges).length;
    const ing = window._relIngestRelations([{
      quote: 'Ghost is my father', from: 'Ghost', to: 'my father', type: 'parent_of',
      basis: 'asserted_on_page', assertedBy: 'Lirael', addressedTo: null
    }], { prose: '"Ghost is my father," Lirael said, and the hall went quiet around them.',
          sceneUid: 'legacy:1', pcViewpoint: true });
    out.legacyNoMint = {
      resolve: window._charLedgerResolve('Ghost').status,
      accepted: ing.accepted, dropped: ing.dropped,
      entitiesAfter: Object.keys(window._relLedger().entities).length - relBefore,
      edgesAfter: Object.keys(window._relLedger().edges).length - edgeBefore,
      noGhostEntity: !Object.keys(window._relLedger().entities).some(k => /ghost/i.test(k))
    };
    // …until a VERIFIED mention arrives, which attaches and drains it exactly once
    const g = apply('Ghost', 5, { newLayer: 'new layer' });
    out.legacyAttach = { status: g.status, cid: g.canonicalId,
      appearances: g.record.appearances, layers: g.record.revealedLayers.slice(),
      firstScene: g.record.firstScene, legacyGone: !C3.legacy['ghost'],
      mergedOnce: (g.record.mergedLegacy || []).length };
    const g2 = apply('Ghost', 6, {});
    out.legacyMergeOnce = { appearances: g2.record.appearances,
      mergedEntries: (g2.record.mergedLegacy || []).length };

    // ── 4 · SUPERSESSION LOSES NEITHER HISTORY ──
    reset('t4');
    const roleId = window._relRoleEntity('pc', 'father', { label: 'your father' });
    const namedId = window._relEntityForName('Lord Maren', { kind: 'named', create: true });
    const C4 = window._charLedgerContainer({ persist: true });
    C4.byEntity[roleId] = { name: 'your father', canonicalId: roleId, appearances: 3,
      revealedLayers: ['role layer'], firstScene: 1, lastSeenScene: 3 };
    C4.byEntity[namedId] = { name: 'Lord Maren', canonicalId: namedId, appearances: 2,
      revealedLayers: ['named layer'], firstScene: 4, lastSeenScene: 5 };
    window._relReconcileRole(roleId, 'Lord Maren', { sceneUid: 'sup' });
    const afterSup = window._charLedgerResolve('Lord Maren');
    out.supersedeRead = { status: afterSup.status, found: !!afterSup.record };
    const m = apply('Lord Maren', 6, { newLayer: 'post-merge layer' });
    out.supersede = { cid: m.canonicalId,
      layers: (m.record.revealedLayers || []).slice().sort(),
      appearances: m.record.appearances,
      firstScene: m.record.firstScene, lastSeenScene: m.record.lastSeenScene,
      sourceGone: !C4.byEntity[roleId] || C4.byEntity[roleId] === m.record };

    // ── 5 · SALIENCE: RE-HOME MERGES CHRONOLOGICALLY, BOTH DIRECTIONS ──
    const salienceCase = (srcOrd, tgtOrd) => {
      reset('t5-' + srcOrd + '-' + tgtOrd);
      const cid = window._relEntityForName('Tam', { kind: 'named', create: true });
      s._sceneEntityState = {
        'Tam': { name: 'Tam', lastSeenOrdinal: srcOrd, salience: 0.4, role: 'observer', emotionalCharge: 'wary' },
        [cid]: { name: 'Tam', canonicalId: cid, lastSeenOrdinal: tgtOrd, salience: 0.9, role: 'rival', emotionalCharge: '' }
      };
      window._salienceRehome('Tam', cid);
      const rec = s._sceneEntityState[cid];
      return { keptOrdinal: rec.lastSeenOrdinal, salience: rec.salience,
        charge: rec.emotionalCharge, nameRowGone: !s._sceneEntityState['Tam'],
        rowCount: Object.keys(s._sceneEntityState).length };
    };
    out.salienceSrcNewer = salienceCase(9, 2);
    out.salienceTgtNewer = salienceCase(2, 9);

    // ── 6 · THE LEXICAL WRITER DOES NOT MIGRATE HISTORY ──
    reset('t6');
    const cid6 = window._relEntityForName('Perrin', { kind: 'named', create: true });
    s._sceneEntityState = { 'Perrin': { name: 'Perrin', lastSeenOrdinal: 1, salience: 0.7, role: 'observer', emotionalCharge: 'old' } };
    s.secondaryCharacters = { observers: ['Perrin'] };
    window.StoryboundOrchestration.ingestSceneEntityEvidence(s, 'Perrin waited by the door. Perrin said nothing.', 7);
    out.lexicalNoMigrate = {
      historicalKept: !!s._sceneEntityState['Perrin'],
      historicalOrdinal: (s._sceneEntityState['Perrin'] || {}).lastSeenOrdinal,
      canonicalWritten: !!s._sceneEntityState[cid6],
      canonicalOrdinal: (s._sceneEntityState[cid6] || {}).lastSeenOrdinal
    };
    // …and verified admission is what authorises the move
    apply('Perrin', 7, {});
    out.afterAdmission = { nameRowGone: !s._sceneEntityState['Perrin'],
      canonical: !!s._sceneEntityState[cid6],
      rowCount: Object.keys(s._sceneEntityState).length };

    // ── 7 · SALIENCE FAILS CLOSED ON AMBIGUITY ──
    reset('t7');
    window._relEntityForName('Ash', { kind: 'named', create: true, canonicalId: 'cast:1' });
    window._relEntityForName('Ash', { kind: 'named', create: true, canonicalId: 'cast:2' });
    s._sceneEntityState = { 'Ash': { name: 'Ash', lastSeenOrdinal: 1, salience: 0.5 } };
    out.salienceAmbiguous = { lookup: window._salienceRecordFor('Ash', s),
      rehome: window._salienceRehome('Ash', 'cast_x3a_1') };

    // ── 8 · CROSS-STORY ISOLATION + SAVE/RESTORE ──
    reset('t8a');
    const cid8 = apply('Nell', 1, { newLayer: 'story A layer' }).canonicalId;
    const snapshot = JSON.parse(JSON.stringify({ dis: s._characterDisclosureLedger, rel: s._relationshipLedger }));
    // Salience is snapshotted with it — the two stores are restored together in production and
    // isolation has to hold for BOTH, not just the one the test happened to look at.
    s._sceneEntityState[cid8] = { name: 'Nell', canonicalId: cid8, lastSeenOrdinal: 4, salience: 0.8, role: 'observer' };
    const snapSal = JSON.parse(JSON.stringify(s._sceneEntityState));
    reset('t8b');
    out.crossStory = { resolvesInB: window._charLedgerResolve('Nell').status };
    // story B must not read story A's evidence even if the roster object were handed to it
    s._sceneEntityState = JSON.parse(JSON.stringify(snapSal));   // ownership stamp is still t8b
    s._sceneEntityStoryId = 't8a';                               // …belonging to A
    out.crossStorySalience = window._salienceRecordFor('Nell', s);
    Object.assign(s, { storyId: 't8a', _characterDisclosureLedger: snapshot.dis,
      _relationshipLedger: snapshot.rel, _sceneEntityState: JSON.parse(JSON.stringify(snapSal)),
      _sceneEntityStoryId: 't8a' });
    const restored = window._charLedgerResolve('Nell');
    out.restore = { status: restored.status, cid: restored.canonicalId === cid8,
      layers: (restored.record || {}).revealedLayers };
    const salRec = window._salienceRecordFor('Nell', s);
    out.restoreSalience = { found: !!salRec, ordinal: salRec && salRec.lastSeenOrdinal,
      canonical: salRec && salRec.canonicalId === cid8 };

    // ── 9 · REDACTION SEES SURFACE FORMS, NOT IDENTITIES ──
    reset('t9');
    apply('Sable', 1, {});
    out.names = window._charLedgerAllNames();

    // ── 9b · THE DISCLOSURE DIRECTIVE ITSELF ──
    // A direct helper assertion would not have caught this: the directive read the raw envelope,
    // so its "characters" became { v, byEntity, nameIndex, legacy } and the author lost every
    // disclosure memory silently. Only building the real directive proves what ships.
    reset('t9b');
    apply('Corwin', 1, { newLayer: 'keeps the west ledger' });
    apply('Marta', 2, { newLayer: 'counts the stalls twice' });
    out.directive = (typeof window.buildCharacterDisclosureDirective === 'function')
      ? String(window.buildCharacterDisclosureDirective() || '') : 'NO BUILDER';

    // ── 9c · AMBIGUITY HONOURED BY REAL CONSUMERS, NOT JUST THE HELPER ──
    // The regression that returned twice was `|| sceneEntities[name]` restoring the record the
    // helper had refused. Asserting _salienceRecordFor alone would miss it entirely, so a real
    // collector and the orchestration projection are both driven with an ambiguous name.
    reset('t9c');
    window._relEntityForName('Wren', { kind: 'named', create: true, canonicalId: 'cast:w1' });
    window._relEntityForName('Wren', { kind: 'named', create: true, canonicalId: 'cast:w2' });
    s.npcSpecies = { Wren: { origin: 'the_shackle_isles' } };
    s.secondaryCharacters = { observers: ['Wren'] };
    // Low-salience evidence under the bare name: if a consumer falls back to raw storage it will
    // read this row; if it honours the refusal it will not.
    s._sceneEntityState = { 'Wren': { name: 'Wren', lastSeenOrdinal: 1, salience: 0.02, role: 'observer' } };
    out.helperRefuses = window._salienceRecordFor('Wren', s) === null;
    out.collector = (typeof window._collectShackleIslesInScene === 'function')
      ? window._collectShackleIslesInScene(s, 'Julian') : 'NO COLLECTOR';
    out.projection = (window.StoryboundOrchestration
      && typeof window.StoryboundOrchestration._buildActiveSceneEntitiesForTest === 'function')
      ? window.StoryboundOrchestration._buildActiveSceneEntitiesForTest(s, 'Wren waited.', 'Wren waited.')
      : 'NO PROJECTION';

    // ── 10 · PRUNING REDUCES THE OWNING MAPS ──
    reset('t10');
    for (let i = 0; i < 20; i++) apply('Extra' + i, i + 1, {});
    // Pruning is its own exported step (the extractor calls it after applying the scene), so the
    // bound can be proven without driving a model call.
    out.pruneRemoved = window._charLedgerPrune(20);
    const C10 = window._charLedgerContainer({ persist: true });
    out.prune = { byEntity: Object.keys(C10.byEntity).length, legacy: Object.keys(C10.legacy).length };
    return out;
  });

  // ══════════════════════════════════════════════════════════════════════════════════════
  // 0 · IDEMPOTENCY, THROUGH THE GUARDED ENTRY POINT — NON-VACUOUSLY
  //
  // The first version of this section proved nothing: the prose was under the 40-character
  // admission floor so every call returned before reaching the guards, the "stub" it referred to
  // was never wired, and the assertion accepted `appearances === null`. It passed while testing
  // none of rerender, A→B→A, concurrency, failure, retry or success marking.
  //
  // Now the real proxy is intercepted with valid disclosure JSON, the prose clears the floor,
  // request counts are exact, and we WAIT for the in-flight set to drain rather than sleeping a
  // fixed number of milliseconds and hoping.
  // ══════════════════════════════════════════════════════════════════════════════════════
  // The prose must clear BOTH production gates: over the 40-character admission floor, and
  // carrying real person-context — a name that only ever appears sentence-initially is refused
  // as `no-person-context`, which is the validator working. Marta gets a non-initial speech tag.
  const PROSE = 'The stalls were counted twice that morning. Later, Marta said nothing at all about the third one.';
  let extractCalls = 0, failNext = false;
  await page.route('**/api/**', async route => {
    const url = route.request().url();
    if (/\/api\/(config|geo|csp-report|beta-events)\b/.test(url)) return route.continue();
    if (/proxy|chat|complet|grok|mistral/i.test(url)) {
      modelCalls++; extractCalls++;
      if (failNext) { failNext = false; return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }); }
      const payload = JSON.stringify({
        characters: [{ name: 'Marta', present: true, newLayer: 'counts the stalls twice' }],
        relations: []
      });
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, content: payload, choices: [{ message: { content: payload } }] }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });

  const settle = () => page.waitForFunction(
    () => !window.__ledgerInFlightUids || window.__ledgerInFlightUids.size === 0, { timeout: 20000 });
  const drive = async (uid) => {
    await page.evaluate(({ p, u }) => window._updateCharacterDisclosureLedgerForCurrent(p, u),
      { p: PROSE, u: uid });
    await settle();
  };

  await page.evaluate((prose) => {
    const s = window.state;
    Object.assign(s, { storyId: 'idem', name: 'Lirael', playerName: 'Lirael',
      loveInterestName: 'Julian', partnerName: 'Julian', pov: 'first_person',
      _characterDisclosureLedger: {}, _relationshipLedger: null,
      _sceneEntityState: {}, _sceneEntityStoryId: 'idem', _ledgerProcessedUids: {},
      scenes: [{ text: prose }], turnCount: 1 });
  }, PROSE);

  const before = extractCalls;
  await drive('pg:1');                      const afterFirst = extractCalls;
  await drive('pg:1');                      const afterRerender = extractCalls;   // rerender
  await drive('pg:2');                      const afterB = extractCalls;          // navigate away
  await drive('pg:1');                      const afterBackToA = extractCalls;    // A→B→A
  // concurrent invocation of ONE uid — both calls issued before either resolves
  await page.evaluate((prose) => {
    window._updateCharacterDisclosureLedgerForCurrent(prose, 'pg:3');
    window._updateCharacterDisclosureLedgerForCurrent(prose, 'pg:3');
  }, PROSE);
  await settle();
  const afterConcurrent = extractCalls;
  // a FAILED extraction must not mark processed, and must be retryable
  failNext = true;
  await drive('pg:4');                      const afterFail = extractCalls;
  // SNAPSHOT BEFORE THE RETRY. Processed uids are keyed `storyId::sceneUid`, so checking for a
  // bare 'pg:4' passed even once the successful retry had marked 'idem::pg:4' — the assertion
  // was true for the wrong reason and would never have caught a failure being marked.
  const processedAfterFail = await page.evaluate(() =>
    Object.keys(window.state._ledgerProcessedUids || {}).sort());
  await drive('pg:4');                      const afterRetry = extractCalls;
  const processedAfterRetry = await page.evaluate(() =>
    Object.keys(window.state._ledgerProcessedUids || {}).sort());

  const I = await page.evaluate(() => {
    const s = window.state;
    const r = window._charLedgerResolve('Marta');
    return { processed: Object.keys(s._ledgerProcessedUids || {}).sort(),
             inFlight: (window.__ledgerInFlightUids && window.__ledgerInFlightUids.size) || 0,
             status: r.status, appearances: r.record ? r.record.appearances : null,
             layers: r.record ? r.record.revealedLayers.slice() : null };
  });

  if (process.env.SB_DEBUG) console.log('  [debug]', JSON.stringify(clog.slice(0, 8), null, 1));
  console.log(' 0 · IDEMPOTENCY, THROUGH THE GUARDED PATH');
  t('0a: the first call actually REACHES extraction (the floor and the guards were passed)',
    afterFirst === before + 1, `${before} → ${afterFirst}`);
  t('0a2: …and a real record exists with the disclosed layer — the test is not vacuous',
    I.status === 'unique' && (I.layers || []).includes('counts the stalls twice'),
    JSON.stringify(I));
  t('0b: a RERENDER of the same uid issues no second request',
    afterRerender === afterFirst, `${afterFirst} → ${afterRerender}`);
  t('0c: a different page extracts once', afterB === afterRerender + 1, `${afterRerender} → ${afterB}`);
  t('0d: A→B→A does NOT re-extract (the defect the processed-set replaced)',
    afterBackToA === afterB, `${afterB} → ${afterBackToA}`);
  t('0e: two CONCURRENT calls on one uid issue exactly one request',
    afterConcurrent === afterBackToA + 1, `${afterBackToA} → ${afterConcurrent}`);
  t('0f: a FAILED extraction is not marked processed (checked BEFORE the retry, real key)',
    processedAfterFail.indexOf('idem::pg:4') === -1, JSON.stringify(processedAfterFail));
  t('0g: …and is retried on the next visit', afterRetry === afterFail + 1, `${afterFail} → ${afterRetry}`);
  t('0g2: …and the successful retry IS marked',
    processedAfterRetry.indexOf('idem::pg:4') !== -1, JSON.stringify(processedAfterRetry));
  t('0h: appearances counted ONCE per distinct successful scene, not once per call',
    I.appearances === I.processed.length, JSON.stringify({ appearances: I.appearances, processed: I.processed }));
  t('0i: the in-flight set drains — no uid left permanently unextractable',
    I.inFlight === 0, String(I.inFlight));

  console.log('\n 1 · A VERIFIED ORDINARY NPC');
  t('1a: gets a canonical identity through the explicit create path',
    R.plainNpc.status === 'created' && /^ent:/.test(String(R.plainNpc.cid)), JSON.stringify(R.plainNpc));
  t('1b: …with NO relationship edge — being known is not a relationship',
    R.plainNpc.edges === 0, String(R.plainNpc.edges));
  t('1c: …and the scene\'s disclosure lands on that record',
    R.plainNpc.layers.includes('counts the stalls twice'), JSON.stringify(R.plainNpc.layers));

  console.log('\n 2 · SAME-NAME TWINS');
  t('2a: two canonical Robins coexist — v1 could hold only one',
    R.twins.distinct && R.twins.bothKept, JSON.stringify(R.twins));
  t('2b: each keeps its OWN layers', 
    JSON.stringify(R.twins.aLayers) === '["A layer"]' && JSON.stringify(R.twins.bLayers) === '["B layer"]',
    JSON.stringify([R.twins.aLayers, R.twins.bLayers]));
  t('2c: the bare name resolves to NEITHER', R.twins.resolve === 'ambiguous', R.twins.resolve);
  t('2d: a verified mention under that name touches neither twin',
    R.twinsAmbiguous.aUnchanged && R.twinsAmbiguous.bUnchanged, JSON.stringify(R.twinsAmbiguous));
  t('2e: …and the evidence is PRESERVED, unattached and flagged',
    R.twinsAmbiguous.preserved && R.twinsAmbiguous.preservedLayer, JSON.stringify(R.twinsAmbiguous));

  console.log('\n 3 · LEGACY MEMORY IS NOT AUTHORISATION');
  t('3a: a legacy row alone mints no identity — through the real relation resolver',
    R.legacyNoMint.resolve === 'legacy' && R.legacyNoMint.accepted === 0
      && R.legacyNoMint.entitiesAfter === 0 && R.legacyNoMint.edgesAfter === 0
      && R.legacyNoMint.noGhostEntity, JSON.stringify(R.legacyNoMint));
  t('3b: a LATER VERIFIED mention attaches it and drains the history',
    R.legacyAttach.appearances === 5 && R.legacyAttach.firstScene === 1
      && R.legacyAttach.layers.includes('old layer') && R.legacyAttach.layers.includes('new layer')
      && R.legacyAttach.legacyGone, JSON.stringify(R.legacyAttach));
  t('3c: …exactly once — a second mention does not re-merge',
    R.legacyMergeOnce.appearances === 6 && R.legacyMergeOnce.mergedEntries === 1,
    JSON.stringify(R.legacyMergeOnce));

  console.log('\n 4 · SUPERSESSION LOSES NEITHER HISTORY');
  t('4a: a superseded record stays READABLE', R.supersedeRead.status === 'unique' && R.supersedeRead.found,
    JSON.stringify(R.supersedeRead));
  t('4b: both halves survive the merge — neither person is overwritten',
    R.supersede.layers.includes('role layer') && R.supersede.layers.includes('named layer'),
    JSON.stringify(R.supersede.layers));
  t('4c: appearances combine and the span widens to cover both',
    R.supersede.appearances === 6 && R.supersede.firstScene === 1 && R.supersede.lastSeenScene === 6,
    JSON.stringify(R.supersede));

  console.log('\n 5 · SALIENCE RE-HOME MERGES CHRONOLOGICALLY');
  t('5a: source newer → the source reading is current',
    R.salienceSrcNewer.keptOrdinal === 9 && R.salienceSrcNewer.salience === 0.4,
    JSON.stringify(R.salienceSrcNewer));
  t('5b: target newer → the target reading survives, not overwritten',
    R.salienceTgtNewer.keptOrdinal === 9 && R.salienceTgtNewer.salience === 0.9,
    JSON.stringify(R.salienceTgtNewer));
  t('5c: the loser still contributes what the winner lacks (emotional charge)',
    R.salienceTgtNewer.charge === 'wary', JSON.stringify(R.salienceTgtNewer));
  t('5d: exactly ONE row remains, on the canonical key',
    R.salienceSrcNewer.nameRowGone && R.salienceSrcNewer.rowCount === 1
      && R.salienceTgtNewer.nameRowGone && R.salienceTgtNewer.rowCount === 1,
    JSON.stringify([R.salienceSrcNewer, R.salienceTgtNewer]));

  console.log('\n 6 · THE LEXICAL WRITER DOES NOT MIGRATE HISTORY');
  t('6a: new evidence goes to the canonical key',
    R.lexicalNoMigrate.canonicalWritten && R.lexicalNoMigrate.canonicalOrdinal === 7,
    JSON.stringify(R.lexicalNoMigrate));
  t('6b: …while HISTORICAL name-keyed evidence is left untouched by the lexical writer',
    R.lexicalNoMigrate.historicalKept && R.lexicalNoMigrate.historicalOrdinal === 1,
    JSON.stringify(R.lexicalNoMigrate));
  t('6c: verified admission is what authorises the move, leaving one row',
    R.afterAdmission.nameRowGone && R.afterAdmission.canonical && R.afterAdmission.rowCount === 1,
    JSON.stringify(R.afterAdmission));

  console.log('\n 7 · SALIENCE FAILS CLOSED ON AMBIGUITY');
  t('7a: an ambiguous name yields no salience record', R.salienceAmbiguous.lookup === null,
    JSON.stringify(R.salienceAmbiguous));
  t('7b: …and re-homing it is refused', R.salienceAmbiguous.rehome === false,
    String(R.salienceAmbiguous.rehome));

  console.log('\n 8 · OWNERSHIP AND RESTORE');
  t('8a: story A\'s disclosure does not resolve in story B',
    R.crossStory.resolvesInB === 'none', JSON.stringify(R.crossStory));
  t('8a2: …and story B cannot read story A\'s SALIENCE evidence either',
    R.crossStorySalience === null, JSON.stringify(R.crossStorySalience));
  t('8b: a restored snapshot keeps the identity and its history',
    R.restore.status === 'unique' && R.restore.cid, JSON.stringify(R.restore));
  t('8b2: …and the canonical SALIENCE evidence survives the restore',
    R.restoreSalience.found && R.restoreSalience.ordinal === 4 && R.restoreSalience.canonical,
    JSON.stringify(R.restoreSalience));

  console.log('\n 9 · CONSUMERS BY PURPOSE');
  t('9a: redaction sees SURFACE FORMS, never canonical ids',
    R.names.includes('Sable') && R.names.every(n => !/^ent:|^cast:|^role:/.test(n)),
    JSON.stringify(R.names));

  {
    const d = R.directive;
    t('9b: the disclosure directive carries real character rows',
      d !== 'NO BUILDER' && /Corwin/.test(d) && /keeps the west ledger/.test(d)
        && /Marta/.test(d) && /counts the stalls twice/.test(d), JSON.stringify(d.slice(0, 200)));
    t('9b2: …and leaks no envelope key, canonical id or undefined',
      d !== 'NO BUILDER' && !/byEntity|nameIndex|\blegacy\b|ent:|cast:|role:pc|undefined/.test(d),
      JSON.stringify((d.match(/byEntity|nameIndex|\blegacy\b|ent:|cast:|role:pc|undefined/g) || []).slice(0, 5)));
  }
  console.log('\n 9c · AMBIGUITY HONOURED BY REAL CONSUMERS');
  t('9c: the helper itself refuses an ambiguous name', R.helperRefuses, String(R.helperRefuses));
  // THE DIRECTION HERE IS COUNTERINTUITIVE, so it is stated: the raw row carries salience 0.02,
  // well under the 0.15 floor. If the `|| sceneEntities[name]` fallback were back, the collector
  // would read that row and EXCLUDE Wren. Honouring the refusal means `ent` is null, the floor
  // check cannot fire, and Wren is INCLUDED — which is also the correct product behaviour: an
  // ambiguous name has no usable evidence, and no evidence has never meant "filter this out".
  t('9c2: a REAL collector honours the refusal — it does not read the raw low-salience row',
    R.collector !== 'NO COLLECTOR' && R.collector.includes('Wren'), JSON.stringify(R.collector));
  t('9c3: the orchestration PROJECTION honours it too — end to end, not just the helper',
    R.projection !== 'NO PROJECTION'
      && !(R.projection || []).some(e => e && e.name === 'Wren' && e.salience === 0.02),
    JSON.stringify(R.projection));

  console.log('\n 10 · PRUNING REDUCES THE OWNING MAPS');
  t('10a: 20 verified characters prune to the 14-character bound',
    (R.prune.byEntity + R.prune.legacy) === 14 && R.pruneRemoved === 6,
    JSON.stringify([R.prune, R.pruneRemoved]));

  console.log('\n 11 · COST ACCOUNTING');
  t('11a: the intercepted extraction count is EXACT — 5 mock requests, all answered locally',
    modelCalls === 5, String(modelCalls));
  t('11b: no DATA request escaped to the real network (page chrome excluded)', escaped === 0,
    escaped + ': ' + JSON.stringify(escapedUrls.slice(0, 4)));
  t('11c: no paid provider was contacted', paid === 0, String(paid));
} finally { await ctx.close().catch(() => {}); }

console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
await closeBrowser();
process.exit(fail ? 1 : 0);
