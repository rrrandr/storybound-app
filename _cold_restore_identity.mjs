// COLD RESTORE — the substrate must survive a reload, free, no model calls.
//
// _resolveSocialEcosystem, _socialEcoRecord, _materializeSocialSlot and _resolveAllyFunction all
// used to be defined ~6,600 lines INSIDE handleBeginStory(). continueStory() does not call
// handleBeginStory(), so on a cold reload of a saved story every one of them was undefined: the
// stamped ecosystem sat in restored state with nothing able to open it. This suite loads the page
// and NEVER starts a story — if the hoist regressed, nothing here can even be called.
//
// usage: node _cold_restore_identity.mjs   (needs vercel dev on :3000)
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

console.log(`\n${'═'.repeat(88)}\nCOLD RESTORE — a saved story reopens without regenerating anything\n${'═'.repeat(88)}\n`);

// ── INFRASTRUCTURE PREFLIGHT (2026-08-28) ──
// A hung `vercel dev` still LISTENS on :3000 while answering nothing, and every case in this
// suite then spends its full page timeout before failing. One run burned 180s and reported a
// timeout that looked like a code regression; it was an eleven-hour-old server process. Ask the
// server one question BEFORE launching Chromium, and abort with an infrastructure message rather
// than browsers against a dead port.
async function preflight(url = 'http://localhost:3000/') {
  const started = Date.now();
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(url, { signal: ctl.signal });
    clearTimeout(timer);
    const body = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!/<\s*script|<\s*html/i.test(body)) throw new Error('response is not the app shell');
    console.log(`  ⚙ preflight ok — ${url} responded ${res.status} in ${Date.now() - started}ms\n`);
  } catch (e) {
    console.error(`\n  ✗ INFRASTRUCTURE: ${url} is not serving the app (${e.message}).`);
    console.error('    Start it with:  npx vercel dev --listen 3000');
    console.error('    If it is already "running", it may be hung while still holding the port —');
    console.error('    check with:  lsof -nP -iTCP:3000   and kill that PID directly.\n');
    process.exit(2);
  }
}
await preflight();

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
  const modelCalls = [];
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
  await page.route('**/api/**', async route => {
    const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (PASSTHROUGH.test(url)) return /* FULFILLED, NOT FORWARDED: a forwarded static endpoint spawns a @vercel/node runtime that is never reaped — they accumulate into gigabytes and wedge the dev server mid-suite. */ route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    // ANY model call during a cold restore is a FAILURE OF THIS SUITE'S PREMISE, not a fixture
    // detail: reopening a saved story must not regenerate or re-roll anything.
    if (/proxy|chat|complet|grok|mistral|openai|anthropic/i.test(url)) modelCalls.push(url);
    return route.fulfill({ status:200, contentType:'application/json', body: '{"ok":true}' });
  });
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  // NOTE: handleBeginStory is never called anywhere in this file.
  await page.waitForFunction(() => typeof window.state === 'object' && window.state !== null, { timeout:60000 });
  await page.waitForTimeout(2500);

  const R = await page.evaluate(() => {
    const out = {};
    out.availableBeforeAnyStory = {
      resolve:     typeof window._resolveSocialEcosystem,
      record:      typeof window._socialEcoRecord,
      materialize: typeof window._materializeSocialSlot,
      allyFn:      typeof window._resolveAllyFunction,
      allyList:    Array.isArray(window._ALLY_FUNCTIONS) ? window._ALLY_FUNCTIONS.length : 0,
      rolePools:   typeof window._SOCIAL_ROLE_POOLS,
      slotEntity:  typeof window._relSocialSlotEntity,
      nameSlot:    typeof window._relNameSlot,
      project:     typeof window._relProjectEntity,
    };
    if (typeof window._resolveSocialEcosystem !== 'function') return out;

    // ── SIMULATE THE RESTORE ──
    // A saved story: a storyId, a stamped ecosystem and a ledger, all arriving as plain data
    // through the state spread — exactly what continueStory() rehydrates.
    const s = window.state;
    Object.assign(s, { world:'modern', worldSubtype:'city', flavor:'slow_burn',
      dynamic:'friends_to_lovers', name:'Ava', playerName:'Ava', loveInterestName:'Ben',
      partnerName:'Ben', storyLength:'epic', tier:'epic', playerMask:'OPEN_VEIN',
      storyId:'saved-story-1', _socialEcosystem:null, _allyFunctionPick:null, _relationshipLedger:null });

    // First run: the circle a previous session would have built and saved.
    const built = window._resolveSocialEcosystem(s);
    const savedRecord = JSON.parse(JSON.stringify(window._socialEcoRecord(s)));
    const firstSlot = built.filter(x => x.slotKind)[0];
    const firstId = firstSlot ? window._materializeSocialSlot(firstSlot.slotId) : null;
    const savedLedger = JSON.parse(JSON.stringify(window._relLedger()));

    // ── THE COLD RELOAD ── every derived value gone; only persisted data returns.
    s._socialEcosystem = savedRecord;
    s._relationshipLedger = savedLedger;
    s._allyFunctionPick = null;

    out.readsEcosystem = (window._resolveSocialEcosystem(s) || []).map(x => x.slotId);
    out.originalSlots  = built.map(x => x.slotId);
    out.resolvesSlot   = !!firstSlot && (window._resolveSocialEcosystem(s) || [])
      .some(x => x.slotId === firstSlot.slotId);
    // the person materialised before the reload is the SAME person after it
    out.rematerialised = firstSlot ? window._materializeSocialSlot(firstSlot.slotId) : null;
    out.firstId = firstId;
    // a NEWLY relevant slot can still be materialised after the reload
    const second = (window._resolveSocialEcosystem(s) || []).filter(x => x.slotKind && x.slotId !== (firstSlot||{}).slotId)[0];
    out.newSlotAfterRestore = second ? window._materializeSocialSlot(second.slotId) : null;
    // and a name can still be reconciled
    out.reconciledAfterRestore = out.rematerialised
      ? window._relNameSlot(out.rematerialised, 'Priya', { sceneUid: 'restored-scene-9' }) : null;
    out.reconciledKeptId = out.reconciledAfterRestore === out.rematerialised;
    out.projAfterRestore = out.rematerialised ? window._relProjectEntity(out.rematerialised, 'pc') : null;
    return out;
  });

  // ══════════════════════════════════════════════════════════════════════════════════════
  // THE TEST THAT WAS MISSING (2026-08-28)
  //
  // The first version of this suite asked only whether the low-level HELPERS existed, then
  // simulated a restore inside the same page. It went green while the three functions that
  // actually put the social cast INTO a prompt were still trapped inside handleBeginStory —
  // and because every call site guards them with `typeof === 'function'`, a restored story did
  // not error, it just silently produced prompts with no social cast in them.
  //
  // So this asks the only question that matters: on a page that has NEVER started a story, does
  // a directive builder return real content?
  // ══════════════════════════════════════════════════════════════════════════════════════
  const B = await page.evaluate(() => {
    const s = window.state;
    Object.assign(s, { world:'modern', worldSubtype:'city', flavor:'slow_burn',
      dynamic:'friends_to_lovers', name:'Ava', playerName:'Ava', loveInterestName:'Ben',
      storyLength:'epic', tier:'epic', playerMask:'OPEN_VEIN', storyId:'restored-2',
      _socialEcosystem:null, _allyFunctionPick:null, _relationshipLedger:null,
      _socialEvent:null, _socialEventResolved:false, _socialEventStoryId:null });
    const out = { defined: {}, produced: {} };
    [['sideChar','_buildSideCharCoreManifestations'],
     ['ecosystem','_buildSocialEcosystemDirective'],
     ['event','_buildSocialEventDirective'],
     ['allyFn','_buildAllyFunctionDirective']].forEach(([k, fn]) => {
      out.defined[k] = typeof window[fn];
    });
    try { out.produced.sideChar = String(window._buildSideCharCoreManifestations(3) || ''); } catch (e) { out.produced.sideChar = 'THREW: ' + e.message; }
    // A LENGTH CHECK IS NOT A CONTENT CHECK. With the world-overlay table left inside
    // handleBeginStory the builder still returned plenty of generic text — the Fatelands
    // translation was simply gone, and `length > 80` waved it through. So the world is set to
    // Fatelands and the overlay's own words are demanded.
    Object.assign(s, { worldSubtype:'fatelands', world:'fatelands' });
    if (s.picks) s.picks.world = 'fatelands';
    try { out.produced.fatelandsSideChar = String(window._buildSideCharCoreManifestations(3) || ''); }
    catch (e) { out.produced.fatelandsSideChar = 'THREW: ' + e.message; }
    out.overlayTableHasFatelands = !!(window._MICRO_WORLD_OVERLAY && window._MICRO_WORLD_OVERLAY.fatelands);
    out.overlayFn = typeof window._microWorldOverlay;
    // WORLD PARITY, on a page that never started a story. Each fixture is the shape the product
    // actually stores, and the expected key is the one the hook resolver would have produced.
    out.worldKeyParity = {};
    [['fatelands',   { world:'fantasy', worldSubtype:'veilwood' },        'fatelands'],
     ['glasshouse',  { world:'dystopia', worldSubtype:'glass house' },    'glasshouse'],
     ['erasure',     { world:'dystopia', worldSubtype:'endless edit' },   'erasure'],
     ['angryroom',   { world:'dystopia', worldSubtype:'angry room' },     'angryroom'],
     ['prehistoric', { world:'prehistoric', worldSubtype:'stone age' },   'prehistoric'],
     ['scifi',       { world:'sci-fi', worldSubtype:'colony' },           'scifi'],
     ['historical',  { world:'historical', worldSubtype:'regency' },      'historical'],
     ['postapoc',    { world:'post-apocalyptic', worldSubtype:'waste' },  'postapoc'],
     ['modern',      { world:'modern', worldSubtype:'city' },             'modern'],
     ['billionaire', { world:'modern', worldSubtype:'billionaire modern' }, 'billionaire'],
     ['dystopia',    { world:'dystopia', worldSubtype:'water scarcity' },  'dystopia']
    ].forEach(([label, fixture, expect]) => {
      const keep = { world: s.world, worldSubtype: s.worldSubtype, fantasyRegion: s.fantasyRegion };
      s.world = fixture.world; s.worldSubtype = fixture.worldSubtype; s.fantasyRegion = '';
      if (s.picks) s.picks.world = fixture.world;
      const key = window._resolveStoryWorldKey(s);
      const overlay = window._microWorldOverlay();
      out.worldKeyParity[label] = { key, expect,
        hasOverlayEntry: !!(window._MICRO_WORLD_OVERLAY || {})[expect],
        overlay: !!overlay };
      Object.assign(s, keep);
      if (s.picks) s.picks.world = keep.world;
    });
    try { out.produced.livingWorld = String(window._buildLivingWorldDirective(s) || ''); }
    catch (e) { out.produced.livingWorld = 'THREW: ' + e.message; }
    try { out.produced.ecosystem = String(window._buildSocialEcosystemDirective(s) || ''); } catch (e) { out.produced.ecosystem = 'THREW: ' + e.message; }
    try { out.produced.allyFn = String(window._buildAllyFunctionDirective(s) || ''); } catch (e) { out.produced.allyFn = 'THREW: ' + e.message; }
    try { out.produced.eventDir = String(window._buildSocialEventDirective(s) || ''); } catch (e) { out.produced.eventDir = 'THREW: ' + e.message; }
    // the social EVENT must be story-owned too: a foreign stamp is discarded, not inherited
    s._socialEvent = { eventKey:'GHOST_EVENT', event:{ key:'GHOST_EVENT', gist:'a ghost from story one' },
                       slotId:'ghost#1', memberIndex:0, timing:'x', shape:'y', arc:null };
    s._socialEventResolved = true; s._socialEventStoryId = 'some-other-story';
    out.foreignEvent = window._resolveSocialEvent(s);
    out.foreignEventLeaked = JSON.stringify(out.foreignEvent || {}).indexOf('GHOST_EVENT') !== -1;
    // and with no storyId it resolves nothing at all
    const keep = s.storyId; s.storyId = '';
    out.eventNoStory = window._resolveSocialEvent(s);
    s.storyId = keep;
    return out;
  });

  console.log('\n 4 · THE PROMPT BUILDERS SURVIVE A COLD RESTORE');
  t('4a: all four social directive builders are defined without a story ever starting',
    Object.values(B.defined).every(x => x === 'function'), JSON.stringify(B.defined));
  t('4b: the SIDE-CHARACTER directive produces real content, not a silent empty string',
    B.produced.sideChar.length > 80 && !/^THREW/.test(B.produced.sideChar),
    JSON.stringify(B.produced.sideChar.slice(0, 120)));
  t('4c: the SOCIAL ECOSYSTEM directive produces real content',
    B.produced.ecosystem.length > 80 && !/^THREW/.test(B.produced.ecosystem),
    JSON.stringify(B.produced.ecosystem.slice(0, 120)));
  t('4d: the ALLY FUNCTION directive produces real content',
    B.produced.allyFn.length > 80 && !/^THREW/.test(B.produced.allyFn),
    JSON.stringify(B.produced.allyFn.slice(0, 120)));
  t('4e: the social EVENT directive is reachable (empty is legitimate; a throw is not)',
    !/^THREW/.test(B.produced.eventDir), JSON.stringify(B.produced.eventDir.slice(0, 120)));
  t('4f: the WORLD OVERLAY table and function survive the restore',
    B.overlayTableHasFatelands && B.overlayFn === 'function',
    JSON.stringify([B.overlayTableHasFatelands, B.overlayFn]));
  t('4g: a restored FATELANDS story gets the Fatelands idiom, not generic side-character text',
    /WORLD IDIOM \(Fatelands\)/.test(B.produced.fatelandsSideChar),
    JSON.stringify(B.produced.fatelandsSideChar.slice(0, 200)));
  {
    const rows = Object.entries(B.worldKeyParity);
    const wrong = rows.filter(([, v]) => v.key !== v.expect);
    t('4g2: the world key resolves correctly for every world WITHOUT a story having started',
      wrong.length === 0, JSON.stringify(wrong));
    const noOverlay = rows.filter(([, v]) => v.hasOverlayEntry && !v.overlay);
    t('4g3: …and each world with an overlay entry actually receives its own idiom on cold restore',
      noOverlay.length === 0, JSON.stringify(noOverlay.map(([k]) => k)));
  }

  // A MECHANICAL SCAN, so the next nested dependency is found by the suite rather than by a
  // reviewer. It reports the whole class; the identity work owns only its own entries.
  console.log('\n 4i · NESTED-DEPENDENCY SCAN');
  {
    const src = SRC.split('\n');
    const hb = src.findIndex(l => l.startsWith('  async function handleBeginStory()'));
    let close = -1;
    for (let j = hb + 1; j < src.length; j++) if (src[j] === '  }') { close = j; break; }
    const DEF = /window\.(_[A-Za-z0-9_]+)\s*=(?!=)/g;
    const inside = new Set(), outside = new Set();
    const collect = (from, to, set) => { for (let i = from; i < to; i++) { let m; DEF.lastIndex = 0;
      while ((m = DEF.exec(src[i]))) set.add(m[1]); } };
    collect(hb, close, inside); collect(0, hb, outside); collect(close + 1, src.length, outside);
    const onlyInside = [...inside].filter(x => !outside.has(x));
    // SCOPE THE ASSERTION TO WHAT THIS WORK MOVED. Everything hoisted here sits contiguously
    // between handleBeginStory's close and the end of _resolveAllyFunction (the first block
    // moved, therefore last in file order). The rest of the file has the same latent class of
    // dependency and it predates this work — reported below, not asserted on.
    let regionEnd = src.length;
    for (let i = close + 1; i < src.length; i++) {
      if (src[i].indexOf('window._resolveAllyFunction = function') !== -1) {
        for (let j = i; j < src.length; j++) if (src[j].trim() === '};') { regionEnd = j; break; }
        break;
      }
    }
    const socialRegion = src.slice(close + 1, regionEnd + 1).join('\n');
    const leaked = onlyInside.filter(x => new RegExp('window\\.' + x + '\\b').test(socialRegion));
    t('4i: the code hoisted by THIS work depends on NOTHING still nested',
      leaked.length === 0,
      'still nested: ' + leaked.join(', '));
    const fileWide = onlyInside.filter(x =>
      new RegExp('window\\.' + x + '\\b').test(src.slice(regionEnd + 1).join('\n')));
    console.log('      ⚠ PRE-EXISTING, NOT THIS WORK: ' + fileWide.length + ' other module-scope');
    console.log('        references to handleBeginStory-nested symbols (' + fileWide.slice(0, 4).join(', ')
      + (fileWide.length > 4 ? ', …' : '') + '). Same failure mode, untouched here.');
  }

  console.log('\n 4j · A LEGACY FF CONTRACT IS MIGRATED, NOT IDENTIFIED BY POSITION');
  {
    const L = await page.evaluate(() => {
      const s = window.state;
      // EXACTLY what a pre-cast-id snapshot leaves behind: production-shaped records with no
      // id of any kind, placed on state the way Object.assign(state, snapshot) leaves them.
      // The stamper is NOT called by this fixture — if only a manual call made this work, the
      // restore path would still be broken and this test would still pass, which is how the
      // previous fixture missed it.
      const legacy = { character: { canonicalName: 'Ava' }, loveInterest: { canonicalName: 'Ben' },
                       cast: [{ name: 'Robin', role: 'friend' }, { name: 'Robin', role: 'rival' },
                              { name: 'Joey', role: 'mentor' }] };
      Object.assign(s, { world:'modern', worldSubtype:'city', flavor:'slow_burn',
        dynamic:'friends_to_lovers', name:'Ava', playerName:'Ava', loveInterestName:'Ben',
        storyLength:'epic', tier:'epic', playerMask:'OPEN_VEIN', storyId:'legacy-ff-1',
        fateMode:'famous_fate', ffContract: legacy,
        _socialEcosystem:null, _allyFunctionPick:null, _relationshipLedger:null });
      const out = {};
      out.beforeVersion = s.ffContract._castIdV || 0;
      out.beforeIds = s.ffContract.cast.map(c => c._sbCastId || null);
      // the PRODUCTION consumer — no manual stamping
      const slots = window._resolveSocialEcosystem(s);
      out.afterIds = s.ffContract.cast.map(c => c._sbCastId || null);
      out.afterVersion = s.ffContract._castIdV || 0;
      out.slotCastIds = slots.map(x => x.castRecord && x.castRecord.castId);
      out.ids = slots.map(x => window._materializeSocialSlot(x.slotId));
      // save/restore, then REVERSE the cast array — identity must ride the record
      // BOTH ROBINS HAVE THE SAME NAME, so comparing {name, castId} proves nothing about which
      // Robin kept which id. `role` differs between them and is immutable here, so the pairing
      // (role → castId) is what has to survive serialisation and reordering.
      out.beforePairs = s.ffContract.cast.map(c => ({ role: c.role, castId: c._sbCastId }));
      const restored = JSON.parse(JSON.stringify(s.ffContract));
      restored.cast.reverse();
      s.ffContract = restored; s._socialEcosystem = null; s._allyFunctionPick = null;
      const slots2 = window._resolveSocialEcosystem(s);
      out.afterPairs = s.ffContract.cast.map(c => ({ role: c.role, castId: c._sbCastId }));
      out.afterReorder = slots2.map(x => x.castRecord && ({ name: x.castRecord.name, castId: x.castRecord.castId }));
      out.ids2 = slots2.map(x => window._materializeSocialSlot(x.slotId));

      // ── DUPLICATES, THROUGH THE REAL CONSUMER ──
      // Two records carrying one id, plus a valid third. The stamper flags; what matters is what
      // the CONSUMER does with the flag.
      const dupContract = { _castIdV: 1, _castSeq: 9,
        cast: [{ name: 'Dee', role: 'a', _sbCastId: 'ff:1' },
               { name: 'Eff', role: 'b', _sbCastId: 'ff:1' },
               { name: 'Gee', role: 'c', _sbCastId: 'ff:2' }] };
      Object.assign(s, { storyId: 'dup-consumer-1', ffContract: dupContract,
                         _socialEcosystem: null, _allyFunctionPick: null, _relationshipLedger: null });
      const dupSlots = window._resolveSocialEcosystem(s);
      out.dupSlotNames = dupSlots.map(x => x.castRecord && x.castRecord.name).filter(Boolean);
      out.dupIds = dupSlots.map(x => window._materializeSocialSlot(x.slotId));
      const DL = window._relLedger();
      out.dupLedgerLabels = DL ? Object.values(DL.entities).map(e => e.label) : [];

      // ── A REPAIRED DUPLICATE BECOMES USABLE AGAIN ──
      dupContract.cast[1]._sbCastId = 'ff:3';          // the collision is fixed
      window._ffStampCastIds(dupContract);
      out.repairedFlags = dupContract.cast.map(c => !!c._sbCastIdDup);

      // ── AN UNVERSIONED CONTRACT CANNOT SUPPLY ITS OWN RESERVED ID ──
      const forged = { cast: [{ name: 'Forger', _sbCastId: 'ff:999', _sbCastIdDup: true }] };
      window._ffStampCastIds(forged);
      out.forged = { id: forged.cast[0]._sbCastId, dup: !!forged.cast[0]._sbCastIdDup,
                     v: forged._castIdV };
      // ── AND A RECORD APPENDED TO A VERSIONED CONTRACT CANNOT EITHER ──
      const versioned = { _castIdV: 1, _castSeq: 2,
                          cast: [{ name: 'Real', _sbCastId: 'ff:1' }] };
      const smuggler = { name: 'Smuggler', _sbCastId: 'ff:1', _sbCastIdDup: false };
      window._ffSanitizeCastRecord(smuggler);
      versioned.cast.push(smuggler);
      window._ffStampCastIds(versioned);
      out.smuggled = versioned.cast.map(c => ({ name: c.name, id: c._sbCastId }));
      // duplicate persisted id → both records excluded, nobody silently deleted
      // VERSIONED, deliberately: on an unversioned contract the reserved ids are discarded and
      // re-minted (4j13), so there would be no duplicate left to detect. Duplicate detection is
      // about corruption INSIDE our own data, which is exactly the versioned case.
      const dup = { _castIdV: 1, _castSeq: 2,
                    cast: [{ name: 'A', _sbCastId: 'ff:1' }, { name: 'B', _sbCastId: 'ff:1' },
                           { name: 'C', _sbCastId: 'ff:2' }] };
      window._ffStampCastIds(dup);
      out.dupFlags = dup.cast.map(c => !!c._sbCastIdDup);
      // a model-supplied id must NOT become identity
      const untrusted = { cast: [{ name: 'X', id: 'model-made-this', castId: 'also-fake',
                                   canonicalId: 'still-fake' }] };
      window._ffStampCastIds(untrusted);
      out.untrusted = untrusted.cast[0]._sbCastId;
      return out;
    });

    t('4j1: a restored legacy contract arrives with NO ids and no version',
      L.beforeVersion === 0 && L.beforeIds.every(x => x === null), JSON.stringify(L.beforeIds));
    t('4j2: the PRODUCTION consumer stamps it — no manual migration call in this fixture',
      L.afterVersion === 1 && L.afterIds.every(Boolean) && new Set(L.afterIds).size === 3,
      JSON.stringify(L.afterIds));
    t('4j3: no identity anywhere is derived from array position',
      L.slotCastIds.every(x => x && String(x).indexOf('idx:') !== 0), JSON.stringify(L.slotCastIds));
    t('4j4: both same-named characters remain DISTINCT people',
      L.ids.filter(Boolean).length === L.ids.length && new Set(L.ids).size === L.ids.length,
      JSON.stringify(L.ids));
    t('4j5: after save/restore AND a reversed array, each ROLE keeps its OWN id (the two Robins differ)',
      L.beforePairs.length === L.afterPairs.length
        && L.beforePairs.every(b => L.afterPairs.some(a => a.role === b.role && a.castId === b.castId))
        && new Set(L.afterPairs.map(a => a.castId)).size === L.afterPairs.length,
      JSON.stringify({ before: L.beforePairs, after: L.afterPairs }));
    t('4j6: …and materialises to the SAME people it did before the reorder',
      JSON.stringify(L.ids.slice().sort()) === JSON.stringify(L.ids2.slice().sort()),
      JSON.stringify([L.ids, L.ids2]));
    t('4j7: a DUPLICATE persisted id flags BOTH records rather than deleting a character',
      L.dupFlags[0] === true && L.dupFlags[1] === true && L.dupFlags[2] === false,
      JSON.stringify(L.dupFlags));
    t('4j8: model-supplied id / castId / canonicalId are NOT accepted as identity',
      /^ff:\d+$/.test(String(L.untrusted)), String(L.untrusted));
    t('4j10: the CONSUMER excludes both duplicates and keeps the valid record',
      L.dupSlotNames.length === 1 && L.dupSlotNames[0] === 'Gee',
      JSON.stringify(L.dupSlotNames));
    t('4j11: …no entity or portfolio is assigned to either duplicate',
      !L.dupLedgerLabels.includes('Dee') && !L.dupLedgerLabels.includes('Eff'),
      JSON.stringify(L.dupLedgerLabels));
    t('4j12: a REPAIRED duplicate clears its flag and becomes usable again',
      L.repairedFlags.every(x => x === false), JSON.stringify(L.repairedFlags));
    t('4j13: an UNVERSIONED contract cannot supply its own reserved id',
      L.forged.id !== 'ff:999' && L.forged.dup === false && L.forged.v === 1,
      JSON.stringify(L.forged));
    t('4j14: a record appended to a VERSIONED contract cannot smuggle one either',
      L.smuggled.length === 2 && L.smuggled[0].id === 'ff:1'
        && L.smuggled[1].id !== 'ff:1' && !!L.smuggled[1].id,
      JSON.stringify(L.smuggled));
    t('4j9: continueStory() migrates the contract on snapshot restore',
      /if\(data\.stateSnapshot\) Object\.assign\(state, data\.stateSnapshot\);[\s\S]{0,900}_ffStampCastIds/.test(SRC),
      'the restore path must migrate, not rely on the consumer alone');
  }

  console.log('\n 5 · THE SOCIAL EVENT IS STORY-OWNED');
  t('5a: an event stamped to ANOTHER story is not inherited',
    !B.foreignEventLeaked, JSON.stringify(B.foreignEvent));
  t('5b: with no storyId, no event resolves at all', B.eventNoStory === null, JSON.stringify(B.eventNoStory));

  const A = R.availableBeforeAnyStory;
  console.log(' 1 · THE HELPERS EXIST WITHOUT EVER STARTING A STORY');
  t('1a: _resolveSocialEcosystem is defined at module scope', A.resolve === 'function', JSON.stringify(A));
  t('1b: _socialEcoRecord is defined', A.record === 'function', A.record);
  t('1c: _materializeSocialSlot is defined', A.materialize === 'function', A.materialize);
  t('1d: _resolveAllyFunction is defined', A.allyFn === 'function', A.allyFn);
  t('1e: the constants moved with them (_ALLY_FUNCTIONS, _SOCIAL_ROLE_POOLS)',
    A.allyList > 0 && A.rolePools === 'object', JSON.stringify([A.allyList, A.rolePools]));
  t('1f: the ledger-side identity API is reachable too',
    A.slotEntity === 'function' && A.nameSlot === 'function' && A.project === 'function', JSON.stringify(A));

  console.log('\n 2 · A RESTORED STORY IS FULLY OPERATIONAL');
  t('2a: it reads its own stamped ecosystem back, unchanged',
    JSON.stringify(R.readsEcosystem) === JSON.stringify(R.originalSlots),
    JSON.stringify([R.originalSlots, R.readsEcosystem]));
  t('2b: it can resolve a slot', R.resolvesSlot, JSON.stringify(R.readsEcosystem));
  t('2c: a person materialised BEFORE the reload is the same person after it',
    !!R.firstId && R.firstId === R.rematerialised, JSON.stringify([R.firstId, R.rematerialised]));
  t('2d: a NEWLY relevant slot can still be materialised after the reload',
    !!R.newSlotAfterRestore && R.newSlotAfterRestore !== R.rematerialised,
    String(R.newSlotAfterRestore));
  t('2e: a name can still be reconciled, keeping the canonical id',
    R.reconciledKeptId && !!R.reconciledAfterRestore, JSON.stringify(R.reconciledAfterRestore));
  t('2f: …and the projection stays safe — no semantic id reaches the PC',
    !!R.projAfterRestore && !/role:pc|social_slot|close_friend/.test(JSON.stringify(R.projAfterRestore)),
    JSON.stringify(R.projAfterRestore));

  console.log('\n 3 · NOTHING WAS REGENERATED');
  t('3a: the cold restore made NO model call', modelCalls.length === 0, JSON.stringify(modelCalls.slice(0, 3)));
} finally { await ctx.close().catch(() => {}); }

console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
await closeBrowser();
process.exit(fail ? 1 : 0);
