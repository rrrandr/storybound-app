// Phase-0 headless validation of the image-pipeline fixes.
// COST: $0. Every generative/paid endpoint is BLOCKED (fulfilled with 500) before
// the page loads, so NO image or LLM call can fire. We drive the real window-exposed
// prompt BUILDERS with synthetic inputs and assert on the assembled strings — this
// validates LOGIC (strip/bypass, charge gate, MM camera guard, expression acting,
// camera enum), not pixels. The 4o-summary half of the funnel needs a live render.
// Requires the dev server running on :3000.
const { chromium } = require('playwright-core');

const BLOCK = [
  '**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/grok-image**',
  '**/api/visualize-flux**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**',
  '**/api/mistral-proxy**', '**/api/deepseek-proxy**', '**/api/proxy**', '**/api/orchestrator**',
  '**/api/famous-fate**', '**/api/verify-anatomy**'
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  let blockedHits = 0;
  for (const pat of BLOCK) {
    await page.route(pat, r => { blockedHits++; r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked-by-harness"}' }); });
  }
  const p03 = { mm: false, bypassSkip: false };
  page.on('console', m => {
    const t = m.text();
    if (/\[STAGED:MM\]/.test(t) && /coerc/i.test(t)) p03.mm = true;
    if (/\[4O\] Skipped/.test(t) && /pre-assembled/i.test(t)) p03.bypassSkip = true;
    if (/\[STAGED:MM\]|\[4O\]/.test(t)) console.error('   log>', t.slice(0, 140));
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state
    && typeof window._buildStagedHeroPrompt === 'function'
    && typeof window._resolvePhaseVisualState === 'function'
    && typeof window.generateImageWithFallback === 'function'
    && typeof window._buildCGScreenplaySystemPrompt === 'function', { timeout: 40000 });

  const R = await page.evaluate(async () => {
    const out = [];
    const test = (name, fn) => { try { const [pass, detail] = fn(); out.push({ name, pass: !!pass, detail: detail || '' }); } catch (e) { out.push({ name, pass: false, detail: 'THREW: ' + (e && e.message) }); } };
    const testAsync = async (name, fn) => { try { const [pass, detail] = await fn(); out.push({ name, pass: !!pass, detail: detail || '' }); } catch (e) { out.push({ name, pass: false, detail: 'THREW: ' + (e && e.message) }); } };

    const s = window.state;
    s.gender = 'Female'; s.loveInterest = 'Male';
    s.picks = s.picks || {}; s.picks.dynamic = 'forbidden'; s.intensity = 'Steamy';
    s.gnArtist = s.gnArtist || 'ender_bond';
    s.renderMode = 'staged_story_mode';
    s.currentPrimaryLiId = s.currentPrimaryLiId || 'li1';

    // ---------- Fix #4: CHEMISTRY/CHARGE gate ----------
    function chargeFor(ssm, ap) {
      const vs = { li_expression: 'tender', li_visibility: 'revealed', camera: 'medium_two_shot', social_staging_mode: ssm, attractionPresence: ap, _phaseCharacters: ['protagonist', 'li'] };
      const phase = { phaseIdx: 0, startBeat: 0, li_visibility_phase: 'revealed', characters_present: ['protagonist', 'li'], props_present: [], label: 'two-shot' };
      const eff = window._resolvePhaseVisualState(vs, phase, [phase], []);
      return eff._phaseChargeDirective || '';
    }
    test('#4 charge SUPPRESSED (professional / none)', () => [chargeFor('professional', 'none') === '', 'len=' + chargeFor('professional', 'none').length]);
    test('#4 charge SUPPRESSED (adversarial / none)', () => [chargeFor('adversarial', 'none') === '', '']);
    test('#4 charge FIRES (romance_eligible)', () => { const d = chargeFor('romance_eligible', 'none'); return [/CHEMISTRY/.test(d), 'len=' + d.length]; });
    test('#4 charge FIRES (adversarial + attraction leaking)', () => { const d = chargeFor('adversarial', 'leaking'); return [/CHEMISTRY/.test(d), 'enemies-to-lovers preserved']; });

    // ---------- Fix #6 + MM camera guard: _buildStagedHeroPrompt ----------
    function hero(over) {
      const vs = Object.assign({
        background: 'a late-shift newsroom, rain on the glass', camera: 'medium_two_shot',
        pc_visibility: 'back_only', li_position: 'desk', li_expression: 'cold_withdrawn', li_visibility: 'revealed',
        pc_wardrobe: 'grey blazer', li_wardrobe: 'charcoal suit', lighting: 'low_warm',
        social_staging_mode: 'romance_eligible', _phaseCharacters: ['protagonist', 'li'], _phaseIdx: 0
      }, over || {});
      return window._buildStagedHeroPrompt(vs, 0, {}) || '';
    }
    test('#6 li_expression token TRANSLATED to acting', () => { const p = hero({ li_expression: 'cold_withdrawn' }); return [/present but shut|warmth pulled back|shoulders turned/i.test(p), 'cold_withdrawn → physical acting']; });
    test('#6 intense_furious translated', () => { const p = hero({ li_expression: 'intense_furious' }); return [/muscle standing at the temple|nostrils flared/i.test(p), '']; });

    // MM: Female PC + male LI is MM-eligible. Concealed LI (shadowed) + close_li must coerce.
    test('MM guard: eligible for Female-PC + Male-LI', () => [window._isMysteryManEligibleLI(s.currentPrimaryLiId) === true, '']);
    test('MM guard: close_li on CONCEALED LI is NOT a face-fill close shot', () => { const p = hero({ camera: 'close_li', li_visibility: 'shadowed' }); return [!/CLOSE SHOT on the love interest/i.test(p), 'coerced off close_li']; });
    test('MM guard: concealment framing present when shadowed', () => { const p = hero({ camera: 'close_li', li_visibility: 'shadowed' }); return [/over-shoulder|reverse over-the-shoulder|back of the protagonist|OTS/i.test(p), '']; });
    test('MM guard: close_li ALLOWED once revealed', () => { const p = hero({ camera: 'close_li', li_visibility: 'revealed' }); return [/CLOSE SHOT on the love interest/i.test(p), 'reveal unlocks close_li']; });
    test('MM guard: concealed LI + default shot_style → forces reverse-OTS (face hidden)', () => { const p = hero({ camera: 'close_li', li_visibility: 'shadowed' }); return [/REVERSE OVER-THE-SHOULDER/i.test(p) && /NEVER show his face/i.test(p), 'reverse-OTS forced']; });

    // ---------- SSM fallback: unlabeled LI-present frame ----------
    test('SSM fallback: unlabeled LI-present @ ST1 → PROFESSIONAL (not romance)', () => { s.storyturn = 'ST1'; const p = hero({ social_staging_mode: '' }); return [/SOCIAL STAGING \(HARD\): PROFESSIONAL/i.test(p) && !/SOCIAL STAGING \(HARD\): ROMANCE-ELIGIBLE/i.test(p), 'pre-ST3 restrained']; });
    test('SSM fallback: unlabeled LI-present @ ST3 → ROMANCE-ELIGIBLE', () => { s.storyturn = 'ST3'; const p = hero({ social_staging_mode: '' }); return [/SOCIAL STAGING \(HARD\): ROMANCE-ELIGIBLE/i.test(p), 'romance earns default at ST3+']; });

    // ---------- Fix #3: camera enum + variety in the LIVE generator ----------
    let sys = '';
    try { sys = window._buildCGScreenplaySystemPrompt({}) || ''; } catch (e) { sys = 'ERR:' + e.message; }
    test('#3 dramatic cameras in live schema', () => [/low_angle_pc/.test(sys) && /dutch_tilt/.test(sys) && /silhouette_pc/.test(sys), '']);
    test('#3 CAMERA VARIETY mandate present', () => [/CAMERA VARIETY/.test(sys) && /No two consecutive/i.test(sys), '']);
    test('#3 live staging fields (pc_posture/proximity) present', () => [/pc_posture/.test(sys) && /proximity/.test(sys) && /pc_emotional_state/.test(sys), '']);
    test('#3 MM caveat present in variety block', () => [/MYSTERY MAN|CONCEALED LI/.test(sys), '']);

    // ---------- Fix #1: funnel strip vs bypass (via the real assembler) ----------
    const MARK = 'a woman alone at a desk in a newsroom.\n\nCHARACTER IDENTITY LOCK: she is unambiguously female, auburn hair.\n\nINTIMACY CONSTRAINT: none this scene.\n\nWARDROBE HARD MATCH: grey wool blazer.\n';
    async function sent(bypass) {
      window._lastGNPrompts = {};
      window._stagedFunnelBypass = bypass;
      try {
        await window.generateImageWithFallback({ prompt: MARK, preAssembled: true, context: 'visualize', intent: 'scene', tier: 'Clean', costTier: 'cheap', shape: 'square' });
      } catch (e) { /* provider chain fails (blocked) — _lastGNPrompts is still set pre-call */ }
      const g = window._lastGNPrompts || {};
      return g.gemini || g.openai || '';
    }
    await testAsync('P0.1 · funnel STRIP removes IDENTITY LOCK (bypass OFF)', async () => { const p = await sent(false); return [p.length > 0 && !/CHARACTER IDENTITY LOCK/.test(p), 'captured ' + p.length + ' ch']; });
    await testAsync('P0.1 · BYPASS preserves IDENTITY LOCK (bypass ON)', async () => { const p = await sent(true); return [/CHARACTER IDENTITY LOCK/.test(p), 'captured ' + p.length + ' ch']; });
    await testAsync('P0.1 · BYPASS preserves WARDROBE HARD MATCH', async () => { const p = await sent(true); return [/WARDROBE HARD MATCH/.test(p), '']; });

    return out;
  });

  // ---------- P0.2: trigger the panelMeta ReferenceError on the species→Gemini path ----------
  // Reached via generateImageWithFallback (callGeminiImageGen isn't window-exposed). Setting
  // window._gnSpeciesAnchorPaths non-empty forces _sceneCase='special_species', whose first
  // line (252067) references undefined `panelMeta` → ReferenceError, caught+logged at 252392,
  // BEFORE any fetch (still $0). We capture the console to confirm the bug reproduces.
  const gemLog = [];
  page.on('console', m => { const t = m.text(); if (/\[Gemini\] Error|GEMINI:SCENE-CASE|panelMeta/i.test(t)) gemLog.push(t); });
  await page.evaluate(async () => {
    const s = window.state;
    s.picks = s.picks || {}; s.picks.world = 'Fantasy';
    s.renderMode = 'staged_story_mode';
    window._gnSpeciesAnchorPaths = [{ path: '/assets/GN-Artists/EnderSBond/first_favored_anchor_face_female_v1.jpg', species: 'first_favored', label: 'first_favored anchor' }];
    const gen = window.generateImageWithFallback({ prompt: 'a First Favored figure at a window, night', preAssembled: true, context: 'visualize', intent: 'scene', tier: 'Clean', costTier: 'cheap', shape: 'square' });
    await Promise.race([gen.catch(() => {}), new Promise(r => setTimeout(r, 6000))]);
  });
  await page.waitForTimeout(1500);
  const hitSpeciesCase = gemLog.some(t => /SCENE-CASE.*SPECIAL_SPECIES/i.test(t));
  const hitPanelMeta = gemLog.some(t => /panelMeta is not defined/i.test(t));
  R.push({ name: 'P0.2 species scene reaches Gemini SPECIAL_SPECIES case', pass: hitSpeciesCase, detail: '' });
  // Regression guard: after the 252067 fix, the species→Gemini path must NOT throw
  // "panelMeta is not defined". (Other [Gemini] Error lines from the blocked fetch are fine.)
  R.push({ name: 'P0.2 no panelMeta ReferenceError on species→Gemini (fix holds)', pass: hitSpeciesCase && !hitPanelMeta, detail: hitPanelMeta ? 'REGRESSED — panelMeta error is back at 252067' : 'clean past 252067' });

  // ---------- P0.3: guard-log sanity (the new gates emit their console markers) ----------
  R.push({ name: 'P0.3 [STAGED:MM] concealment coercion log fires', pass: p03.mm, detail: p03.mm ? 'close_li→over_shoulder logged' : 'not seen' });
  R.push({ name: 'P0.3 [4O] bypass-skip log fires', pass: p03.bypassSkip, detail: p03.bypassSkip ? 'pre-assembled pass-through logged' : 'not seen' });

  await browser.close();

  // ---- report ----
  let pass = 0, fail = 0;
  console.log('\n  PHASE-0 HEADLESS VALIDATION  (blocked endpoint hits: ' + blockedHits + ' — $0)\n' + '  ' + '─'.repeat(64));
  for (const r of R) {
    (r.pass ? pass++ : fail++);
    console.log('  ' + (r.pass ? '✓' : '✗') + ' ' + r.name + (r.detail ? '  · ' + r.detail : ''));
  }
  console.log('  ' + '─'.repeat(64) + '\n  ' + pass + ' passed, ' + fail + ' failed, ' + R.length + ' total\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
