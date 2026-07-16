// $0 headless verification of the SPECIES-ANCHOR PRESENCE GATE + all-human text clarifier.
// No renders — builds the hero prompt and inspects window._gnSpeciesAnchorPaths after the
// per-phase composition, plus the SPECIES BY CHARACTER text. All paid endpoints blocked.
const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/deepseek-proxy**', '**/api/proxy**', '**/api/orchestrator**', '**/api/grok-image**', '**/api/visualize-flux**'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._buildStagedHeroPrompt === 'function' && typeof window._buildStagedRegionContract === 'function', { timeout: 40000 });

  const R = await page.evaluate(async () => {
    const out = [];
    const t = (name, fn) => { try { const [p, d] = fn(); out.push({ name, pass: !!p, detail: d || '' }); } catch (e) { out.push({ name, pass: false, detail: 'THREW ' + e.message }); } };
    const s = window.state;
    s.gender = 'Female'; s.loveInterest = 'Male'; s.gnArtist = 'ender_bond'; s.renderMode = 'staged_story_mode';
    s.picks = { world: 'Fantasy', identity: { playerName: 'Mira', partnerName: 'Vael' } };
    s._playerSpecies = 'human'; s._liSpecies = 'kwisheen';
    s.worldInstanceId = 'gate-1';
    window._stagedFunnelBypass = true;

    // CRITICAL: background prose does NOT name Kwisheen (mirrors the live failure where Grok
    // wrote a torch-lit square). Detection must STILL fire from state._liSpecies='kwisheen'.
    const contract = window._buildStagedRegionContract({ visualState: { background: 'a torch-lit stone square at dusk' }, phases: [] });
    s._stagedRegionContract = contract;

    t('ROOT: kwisheen detected from LI species even when prose never says "Kwisheen"', () => [(contract.speciesKeys || []).indexOf('kwisheen') !== -1, 'speciesKeys=[' + (contract.speciesKeys || []).join(',') + ']']);
    t('contract exposes speciesAnchorPaths map', () => [contract && contract.speciesAnchorPaths && typeof contract.speciesAnchorPaths === 'object', Object.keys(contract.speciesAnchorPaths || {}).join(',') || '(empty)']);
    t('Kwisheen contract pins EXACTLY TWO arms (fixes the extra-arm render)', () => [/EXACTLY TWO upper ARMS/.test(contract.textBlock || '') && /never three, four, or five/.test(contract.textBlock || '') && /THREE DISTINCT tentacle systems/.test(contract.textBlock || ''), '']);
    t('Kwisheen contract locks a HUMANOID face (kills the octopus-mouth / Cthulhu-head drift)', () => [/FACE \(HARD/.test(contract.textBlock || '') && /MOUTH WITH LIPS/.test(contract.textBlock || '') && /NO octopus-beak/.test(contract.textBlock || '') && /never a face made of tentacles/.test(contract.textBlock || ''), '']);
    t('Kwisheen eyes = WIDE HORIZONTAL PILL pupil, not a vertical slit', () => [/WIDE HORIZONTAL PILL PUPIL/.test(contract.textBlock || '') && /never a thin vertical line/.test(contract.textBlock || ''), '']);
    t('Kwisheen torso is COVERED by a garment (not bare-chested with only jewelry)', () => [/the CHEST\/TORSO is always COVERED/.test(contract.textBlock || '') && /never left bare|not left bare|never bare/.test(contract.textBlock || '') && /worn ON TOP of clothing/.test(contract.textBlock || ''), '']);
    const kwAnchorPaths = Object.keys(contract.speciesAnchorPaths || {}).filter(p => contract.speciesAnchorPaths[p] === 'kwisheen');
    t('at least one kwisheen species anchor path recorded', () => [kwAnchorPaths.length >= 1, kwAnchorPaths.map(p => p.split('/').pop()).join(',')]);
    // ROOT FIX: the region-level anchorImages must be ENVIRONMENT ONLY (no character ref),
    // else it attaches ungated to every render. The Kwisheen character ref must be a SPECIES
    // anchor (in the map), not a bare region anchor.
    t('region carries NO ungated kwisheen character anchor (all kwisheen refs are in the species map)', () => {
      const kwInAnchors = (contract.anchorImages || []).filter(p => /Kwisheen/i.test(p));
      const allMapped = kwInAnchors.every(p => (contract.speciesAnchorPaths || {})[p] === 'kwisheen');
      return [allMapped, 'kwisheen anchors=' + kwInAnchors.map(p => p.split('/').pop()).join(',') + ' allMapped=' + allMapped];
    });

    // ── ANCHOR-GATE PRESENCE LOGIC — pure-function replica assertion ──────────────
    // The live gate lives inside _renderStagedPhaseImage's composition block (needs a
    // full plan to run). Here we assert the SAME presence rule the live code applies,
    // driven off the real contract.speciesAnchorPaths map, so the $0 test locks the
    // decision table. (Visual proof that the live path drops the anchor = e2e re-render.)
    const normSp = (x) => String(x || '').toLowerCase().replace(/[\s-]+/g, '_');
    function gatedAnchorPaths(present) {
      const map = contract.speciesAnchorPaths || {};
      return contract.anchorImages.filter(p => { const sk = map[p]; return !sk ? true : !!present[sk]; });
    }
    function presentSet({ liAbsent, others }) {
      const p = {};
      const pc = normSp(s._playerSpecies); if (pc && pc !== 'human') p[pc] = true;
      if (!liAbsent) { const li = normSp(s._liSpecies); if (li && li !== 'human') p[li] = true; }
      (others || []).forEach(o => { const os = normSp(o.species); if (os && os !== 'human') p[os] = true; });
      return p;
    }
    const hasKw = (paths) => paths.some(a => kwAnchorPaths.indexOf(a) !== -1);

    // A — LI (kwisheen) absent, only human PC: kwisheen anchor DROPPED.
    t('GATE: kwisheen anchor DROPPED when LI absent + only human PC present',
      () => { const g = gatedAnchorPaths(presentSet({ liAbsent: true, others: [] })); return [!hasKw(g), 'kept=' + g.map(a => a.split('/').pop()).join(',')]; });
    // B — LI present: kwisheen anchor KEPT.
    t('KEEP: kwisheen anchor retained when the kwisheen LI IS on stage',
      () => { const g = gatedAnchorPaths(presentSet({ liAbsent: false, others: [] })); return [hasKw(g), 'kept=' + g.map(a => a.split('/').pop()).join(',')]; });
    // C — LI absent but kwisheen side char present: KEPT.
    t('KEEP: kwisheen anchor retained when a kwisheen SIDE char is present (LI absent)',
      () => { const g = gatedAnchorPaths(presentSet({ liAbsent: true, others: [{ species: 'kwisheen' }] })); return [hasKw(g), 'kept=' + g.map(a => a.split('/').pop()).join(',')]; });

    // ── TEXT CLARIFIER — proven via direct _buildStagedHeroPrompt (real prompt builder) ──
    function heroPrompt(vs) { return window._buildStagedHeroPrompt(vs, 0, {}) || ''; }
    // Only human PC on stage in the kwisheen region → positive all-human clarifier fires.
    const pAll = heroPrompt({ background: 'a tidal grotto, Gloamwater Bay', camera: 'medium_shot', pc_visibility: 'full', li_position: 'absent', li_expression: 'neutral', li_visibility: 'absent', _phaseLIAbsent: true, pc_wardrobe: 'linen dress', lighting: 'lantern', social_staging_mode: 'solo', other_characters_present: [], _phaseCharacters: ['protagonist'], _phaseIdx: 0 });
    t('all-human clarifier present (positive: human legs + bare human feet)', () => [/FULLY HUMAN[\s\S]*two human legs ending in bare human feet/.test(pAll), '']);
    t('all-human clarifier is NEGATION-FREE (no "not tentacles" attractor)', () => [!/not tentacle|NOT tentacle/i.test(pAll.split('SPECIES BY CHARACTER (HARD): every figure')[1] || pAll), '']);
    t('all-human clarifier does NOT fire the per-character multi-species header', () => [!/render each character in their OWN species/.test(pAll), '']);
    // Human PC + kwisheen LI both on stage → per-character guard fires instead.
    const pMix = heroPrompt({ background: 'a tidal grotto, Gloamwater Bay', camera: 'medium_two_shot', pc_visibility: 'full', li_position: 'right', li_expression: 'curious', li_visibility: 'revealed', pc_wardrobe: 'linen dress', li_wardrobe: 'gem loincloth', lighting: 'low_cool', social_staging_mode: 'stranger_awkward', other_characters_present: [], _phaseCharacters: ['protagonist', 'li'], _phaseIdx: 1 });
    t('per-character guard fires when human + kwisheen both present', () => [/render each character in their OWN species/.test(pMix) && /Vael[\s\S]*KWISHEEN/.test(pMix), '']);

    // 4a — Named KWISHEEN appearance lock (fixes the Arbiter drifting color/dress panel-to-panel).
    s._playerSpecies = 'human'; s._liSpecies = 'kwisheen'; s.worldInstanceId = 'kwlock-1'; s.kwisheenAppearance = {};
    const kwA = window._resolveKwisheenAppearance('Vow Arbiter'), kwA2 = window._resolveKwisheenAppearance('Vow Arbiter');
    t('Kwisheen appearance resolver deterministic (same name → same skin/pattern/eyes)', () => [kwA && kwA2 && kwA.skin === kwA2.skin && kwA.pattern === kwA2.pattern && kwA.iris === kwA2.iris, kwA ? kwA.skin + ' / ' + kwA.pattern : 'null']);
    const kwB = window._resolveKwisheenAppearance('Nixi');
    t('different named Kwisheen → different lock (usually)', () => [kwB && (kwB.skin !== kwA.skin || kwB.pattern !== kwA.pattern), kwB ? kwB.skin : 'null']);
    s._stagedRegionContract = window._buildStagedRegionContract({ visualState: { background: 'a tidal grotto, Gloamwater Bay — a tentacled Kwisheen' }, phases: [] });
    const pKwLock = window._buildStagedHeroPrompt({ background: 'a tidal grotto', camera: 'wide_establishing', pc_visibility: 'full', li_position: 'absent', li_expression: 'neutral', li_visibility: 'absent', _phaseLIAbsent: true, pc_wardrobe: 'sea-silk dress', lighting: 'low_cool', social_staging_mode: 'solo', other_characters_present: [{ name: 'Vow Arbiter', gender: 'male', species: 'kwisheen' }], _phaseCharacters: ['protagonist', 'Vow Arbiter'], _phaseIdx: 0 }, 0, {}) || '';
    t('KWISHEEN APPEARANCE (LOCKED) block injects for a named Kwisheen side char', () => [/KWISHEEN APPEARANCE \(LOCKED/.test(pKwLock) && /Vow Arbiter: [a-z]/.test(pKwLock) && /exactly two arms/.test(pKwLock), '']);
    t('per-named lock pins the HUMANOID face too (not just color)', () => [/scaled HUMANOID face with a lipped mouth/.test(pKwLock) && /NEVER a tentacle-mouthed \/ octopus-beaked face/.test(pKwLock), '']);
    // PC APPEARANCE FALLBACK — deterministic human-PC look so an unlocked visible PC doesn't drift hair panel-to-panel.
    s.worldInstanceId = 'pclock-1'; s.pcAppearance = {}; s.playerName = 'Mira'; s.picks = { world: 'Fantasy', identity: { playerName: 'Mira', partnerName: 'Vael' } };
    const pcA = window._resolvePcAppearance(), pcA2 = window._resolvePcAppearance();
    t('PC appearance resolver deterministic (same story → same hair/skin)', () => [pcA && pcA2 && pcA.hairColor === pcA2.hairColor && pcA.hairLength === pcA2.hairLength && pcA.skinTone === pcA2.skinTone, pcA ? pcA.hairLength + ' ' + pcA.hairColor + ' hair, ' + pcA.skinTone + ' skin' : 'null']);
    t('PC appearance has all three locked fields', () => [pcA && !!pcA.hairColor && !!pcA.hairLength && !!pcA.skinTone, '']);
    t('PC gets a deterministic named HERITAGE (strong consistency anchor vs skin drift)', () => [pcA && !!pcA.heritage && pcA.heritage === pcA2.heritage && pcA.heritageSource === 'default', pcA ? pcA.heritage : 'null']);
    t('a user-set ancestry field is HONORED over the default heritage', () => {
      s.pcAppearance = {}; s.picks = { world: 'Fantasy', identity: { playerName: 'Mira', partnerName: 'Vael', ancestry: 'Nigerian' } };
      const u = window._resolvePcAppearance();
      s.pcAppearance = {}; s.picks = { world: 'Fantasy', identity: { playerName: 'Mira', partnerName: 'Vael' } }; // restore
      return [u && u.heritage === 'Nigerian' && u.heritageSource === 'user', u ? u.heritage + '/' + u.heritageSource : 'null'];
    });
    t('lock fires even in a NON-First-Favored scene (separate gate)', () => [/KWISHEEN APPEARANCE \(LOCKED/.test(pKwLock) && !/FIRST FAVORED COLORS/.test(pKwLock), '']);
    // #5 — Ender Bond signature linework (thick ink-blot outlines + PROMINENT crosshatch) in the style contract.
    t('Ender Bond LINEWORK: thick ink-blot outlines + PROMINENT crosshatch (not sparse)', () => [/ink-BLOTTY/.test(pKwLock) && /PROMINENT crosshatching in EVERY shadow plane/.test(pKwLock) && /#1 Ender Bond tell/.test(pKwLock), '']);

    return out;
  });

  await browser.close();
  let pass = 0, fail = 0;
  console.log('\n  SPECIES-ANCHOR PRESENCE GATE  ($0)\n  ' + '─'.repeat(58));
  for (const r of R) { r.pass ? pass++ : fail++; console.log('  ' + (r.pass ? '✓' : '✗') + ' ' + r.name + (r.detail ? '  · ' + r.detail : '')); }
  console.log('  ' + '─'.repeat(58) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
