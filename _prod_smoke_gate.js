// ═══════════════════════════════════════════════════════════════════════════════════════════════
// PRODUCTION-SCENE SMOKE GATE — the corrected species-reference system, on real pipeline inputs.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS EXISTS: the first smoke gate used a SYNTHETIC scene description written straight into the
// harness. That stripped out exactly the layers Storybound relies on — wardrobe direction, the region
// contract, cultural cues, recurring-character context — and the images showed it: naked Kwisheen and
// a human in modern scuba gear, neither of which the prompt asked for. Every downstream argument about
// whether the verifier was right or wrong was confounded by that. This run removes the confound.
//
// DESIGN — two phases, so the A/B is not confounded by screenplay variance:
//   PHASE 1  Run ONE real production scene with image generation STUBBED. Costs text authoring only.
//            Every call into the staged renderer is intercepted and its scene description captured —
//            these are the exact prompts Stage A receives in production, wardrobe and region contract
//            included.
//   PHASE 2  Replay the captured production prompts through Stage A TWICE (refs off / refs on).
//            Same prompt both arms, so the ONLY variable is the reference set.
//
// Generating the scene twice instead would confound the reference effect with a different screenplay,
// different blocking, and different cast — which is the mistake this design avoids.
//
// WHAT IT TESTS (the corrected system as ONE coherent intervention, per Roman: these are not
// independent variables — together they constitute "the species reference system actually exists"):
//   • coral-dreadlock canon language        • the two new anchor crops
//   • nine repaired asset paths             • presence-gated verifier spec
//
// n=1 per arm per panel. QUALITATIVE ONLY — no verdict, no statistics. Judge the images.
// PAID. Requires RUN=1.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');

const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/prod_smoke';
const RUN = process.env.RUN === '1';
const PANELS = Number(process.env.PANELS || 2);      // how many captured production panels to A/B
const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS || 3);
const SCENE_TIMEOUT = Number(process.env.SCENE_TIMEOUT || 540000);

(async () => {
  console.log('─'.repeat(78));
  console.log('PRODUCTION-SCENE SMOKE GATE — real screenplay, real wardrobe, real region contract');
  console.log('─'.repeat(78));
  console.log(`  phase 1 : one production scene, images STUBBED (text authoring cost only)`);
  console.log(`  phase 2 : ${PANELS} captured panel prompt(s) x 2 arms, ceiling ${MAX_ATTEMPTS}`);
  console.log(`  ESTIMATED: text ~$0.10-0.40 + images ~$${(PANELS * 2 * 1.67 * 0.067).toFixed(2)}  (worst case ~$${(PANELS * 2 * MAX_ATTEMPTS * 0.067).toFixed(2)} images)`);
  console.log(`  output   : ${OUT}`);
  console.log('─'.repeat(78));
  if (!RUN) { console.log('DRY RUN — no API calls. Re-run with RUN=1 to spend.\n'); process.exit(0); }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  page.on('console', m => {
    const t = m.text();
    if (/\[STAGE-A-REFS|\[ASSET-INTEGRITY|\[REGEN-LOOP|\[STAGED:STYLE|\[SPECIES/i.test(t)) console.error('   >', t.slice(0, 175));
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state
    && typeof window._completeStagedSceneFromScreenplay === 'function'
    && typeof window._structuralPassRender === 'function'
    && typeof window._stageACanonRefs === 'function'
    && typeof window._verifyReferenceAssets === 'function', { timeout: 40000 });

  // ── ASSET INTEGRITY FIRST ($0) — never run a reference experiment on a broken reference set ──
  const assets = await page.evaluate(async () => await window._verifyReferenceAssets(null));
  console.log(`\nASSET INTEGRITY: ${assets.ok ? 'OK' : 'FAILED'} — ${assets.checked} required anchor(s) checked, ${assets.missing.length} missing`);
  if (!assets.ok) {
    assets.missing.forEach(m => console.error(`  MISSING ${m.species} slot ${m.slot}: ${m.path}`));
    console.error('ABORTED before spending — the treatment arm would be silently incomplete.');
    await browser.close(); process.exit(1);
  }

  // ── PHASE 1 — real production scene, image generation stubbed ────────────────────────────────
  console.log('\nPHASE 1 — generating one real production scene (images stubbed)…');
  const t1 = Date.now();
  const captured = await page.evaluate(async ({ SCENE_TIMEOUT }) => {
    const s = window.state;
    // A Gloamwater Kwisheen scene: the hard case, with the production layers my synthetic prompt lacked.
    s.storyId = 'prodsmoke-' + (s.turnCount || 0);
    s.picks = { world: 'Fantasy', worldSubtype: 'the_inhuman', flavor: 'the_inhuman', genre: 'fantasy',
      dynamic: 'forbidden', tone: 'Charged', intensity: 'Steamy',
      identity: { playerName: 'Mira', partnerName: 'Vael', displayPlayerName: 'Mira', displayPartnerName: 'Vael' }, pov: '1st' };
    s.povMode = 'normal'; s.world = 'Fantasy'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman';
    s.fantasyRegion = 'gloamwater_bay';
    s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her';
    s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen';
    s.storyLength = 'affair'; s.tier = 'affair'; s.contentMode = 'explicit';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 0; s.scenes = []; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s.gnArtist = s.gnArtist || 'ender_bond'; s._pcLookSkipped = true;
    s._sceneWant = "survive the Kwisheen raider's Many-Tide assault and keep Vael alive";
    s.currentCrisis = 'a hostile KWISHEEN raider ambushes Mira and Vael in the drowned coral ruins, fighting the Many-Tide way — a spear-tentacle high, a cutlass-tentacle low, a hidden dagger for the killing thrust; Vael, herself Kwisheen, answers tentacle against tentacle.';
    s.aPlot = { goal: "survive the Kwisheen raider's Many-Tide ambush", antagonistOrAntiForce: 'a hostile Kwisheen raider fighting the Many-Tide way', namedClock: "before the raider's hidden dagger finds Mira" };
    window._devBypass = true; window._stagedFunnelBypass = true; window.__cgAuthorTimeoutMs = 180000;
    window._structuralPass = true;           // ensure the staged path is the one exercised
    s._stagedActive = null; s._stagedHeroCache = {}; s._stagedRegionContract = null; s._castingLibrary = {};

    // ── STUB IMAGE GENERATION, CAPTURE PROMPTS ────────────────────────────────────────────────
    // A 1x1 PNG stands in for every render. Returning null instead would make callers treat the
    // panel as FAILED and retry or abort, which changes the very control flow we want to observe.
    const STUB = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const grabbed = [];
    const realSPR = window._structuralPassRender;
    window._structuralPassRender = async function (sceneDesc, opts) {
      grabbed.push({
        sceneDesc: String(sceneDesc || ''),
        camera: (opts && opts.verifyOpts && opts.verifyOpts.camera) || '',
        expectedPeople: (opts && opts.verifyOpts && opts.verifyOpts.expectedPeople) || null,
        canon: (opts && opts.verifyOpts && opts.verifyOpts.canon) || [],
        phaseIdx: (opts && opts.verifyOpts && opts.verifyOpts.phaseIdx) != null ? opts.verifyOpts.phaseIdx : grabbed.length
      });
      return null;   // null → caller falls back to the one-shot path, which is also stubbed below
    };
    const realGIF = window.generateImageWithFallback;
    window.generateImageWithFallback = async function () { return STUB; };

    let err = null;
    try {
      await Promise.race([
        window._completeStagedSceneFromScreenplay(0, '', ''),
        new Promise((_, r) => setTimeout(() => r(new Error('scene timeout')), SCENE_TIMEOUT))
      ]);
    } catch (e) { err = e && e.message; }

    window._structuralPassRender = realSPR;
    window.generateImageWithFallback = realGIF;
    return {
      err, grabbed,
      regionContract: s._stagedRegionContract ? {
        anchors: s._stagedRegionContract.anchorImages || [],
        speciesAnchorPaths: s._stagedRegionContract.speciesAnchorPaths || {}
      } : null
    };
  }, { SCENE_TIMEOUT });

  console.log(`  scene built in ${((Date.now() - t1) / 1000).toFixed(0)}s${captured.err ? ' (with error: ' + captured.err + ')' : ''}`);
  console.log(`  captured ${captured.grabbed.length} production panel prompt(s)`);
  if (captured.regionContract) {
    console.log(`  region contract anchors (${captured.regionContract.anchors.length}):`);
    captured.regionContract.anchors.forEach(a => console.log(`    • ${a}${captured.regionContract.speciesAnchorPaths[a] ? '   [species: ' + captured.regionContract.speciesAnchorPaths[a] + ']' : ''}`));
  } else {
    console.log('  ⚠ no region contract was built — wardrobe/region layers may be absent after all');
  }
  fs.writeFileSync(path.join(OUT, 'captured_prompts.json'), JSON.stringify(captured, null, 2));

  if (!captured.grabbed.length) {
    console.error('\nNo production prompts captured — cannot run phase 2. See captured_prompts.json.');
    await browser.close(); process.exit(1);
  }

  // Show how the production prompt differs from the synthetic one — the whole point of this run.
  const first = captured.grabbed[0];
  console.log(`\n  production prompt #1: ${first.sceneDesc.length} chars, camera=${first.camera || '?'}, cast=${(first.canon || []).map(c => (c.name || '?') + ':' + (c.species || '?')).join(', ') || 'none'}`);
  const wardrobeHits = (first.sceneDesc.match(/wardrobe|garment|bodice|wrap|cloak|attire|clothed|jewel/gi) || []).length;
  console.log(`  wardrobe/attire mentions in prompt: ${wardrobeHits}  (the synthetic prompt had 0 — this is the confound being removed)`);

  // ── PHASE 2 — A/B the SAME production prompt through Stage A ─────────────────────────────────
  console.log('\nPHASE 2 — Stage A on captured production prompts (refs off vs refs on)…');
  const results = [];
  for (let i = 0; i < Math.min(PANELS, captured.grabbed.length); i++) {
    const panel = captured.grabbed[i];
    for (const arm of [{ key: 'refs_off', on: false }, { key: 'refs_on', on: true }]) {
      const t0 = Date.now();
      process.stdout.write(`  panel ${i + 1} / ${arm.key} … `);
      const r = await page.evaluate(async ({ panel, on, MAX_ATTEMPTS }) => {
        window._stageARefs = on;
        window._structuralLineArtLog = [];
        const refs = on ? await window._stageACanonRefs(panel.canon, panel.sceneDesc) : [];
        let gens = 0; const defects = [];
        const loop = await window._structuralRegenLoop({
          maxAttempts: MAX_ATTEMPTS,
          generate: (fb) => { gens++; return window._genStructuralLineArt(panel.sceneDesc, fb, { refs }); },
          verify: async (url) => {
            const v = await window._verifyPanelAnatomy(url, panel.camera || 'wide', false, {
              mode: 'structural', expectedPeople: panel.expectedPeople, canon: panel.canon, authorized: null, wishAnchor: null
            });
            if (v && v.pass === false) defects.push({ attempt: gens, type: v.defect_type || 'unclassified', who: v.defect_character || null, reason: String(v.reason || '').slice(0, 150) });
            return v;
          }
        });
        return { gens, resolved: !!loop.resolved, url: loop.url || null, defects,
                 refs: refs.map(x => ({ label: x.label, src: x.src || null, kind: /SPECIES ANATOMY/.test(x.label) ? 'species' : 'identity' })),
                 requests: (window._structuralLineArtLog || []).slice() };
      }, { panel, on: arm.on, MAX_ATTEMPTS });

      const stem = `panel${i + 1}__${arm.key}`;
      if (r.url && r.url.startsWith('data:')) fs.writeFileSync(path.join(OUT, stem + '.png'), Buffer.from(r.url.split(',')[1], 'base64'));
      fs.writeFileSync(path.join(OUT, stem + '.request.json'), JSON.stringify({ panel, arm: arm.key, ...r, url: undefined }, null, 2));
      results.push({ panel: i + 1, arm: arm.key, gens: r.gens, resolved: r.resolved, refs: r.refs, defects: r.defects });
      console.log(`gens=${r.gens} resolved=${r.resolved} refs=${r.refs.length}[${r.refs.map(x => x.kind).join(',')}] defects=[${r.defects.map(d => d.type).join(',') || 'none'}] (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
  }

  console.log('\n' + '═'.repeat(78));
  console.log('RESULT — qualitative. Judge the images; the numbers are n=1 and mean nothing yet.');
  console.log('═'.repeat(78));
  results.forEach(r => console.log(`  panel ${r.panel} ${r.arm.padEnd(9)} gens=${r.gens} resolved=${String(r.resolved).padEnd(5)} refs=${r.refs.length}  defects: ${r.defects.map(d => d.type + (d.who ? '(' + d.who + ')' : '')).join(', ') || 'none'}`));
  console.log(`\n  Look at: wardrobe present? species topology? coral hair vs octopus arms? pose copied from the anchor?`);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`\nSaved → ${OUT}`);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
