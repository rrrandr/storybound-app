// $0 headless verification of the First Favored color-lock + positive form guard.
// No renders — builds prompts and asserts on the strings. All paid endpoints blocked.
const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/deepseek-proxy**', '**/api/proxy**', '**/api/orchestrator**', '**/api/grok-image**', '**/api/visualize-flux**'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._buildStagedHeroPrompt === 'function' && typeof window._buildStagedRegionContract === 'function' && typeof window._resolveFFAppearance === 'function', { timeout: 40000 });

  const R = await page.evaluate(async () => {
    const out = [];
    const t = (name, fn) => { try { const [p, d] = fn(); out.push({ name, pass: !!p, detail: d || '' }); } catch (e) { out.push({ name, pass: false, detail: 'THREW ' + e.message }); } };
    const s = window.state;
    s.gender = 'Female'; s.loveInterest = 'Male'; s.gnArtist = 'ender_bond'; s.renderMode = 'staged_story_mode';
    s.picks = { world: 'Fantasy', identity: { partnerName: 'Kael' } };
    s._playerSpecies = 'first_favored'; s._liSpecies = 'first_favored';
    s.worldInstanceId = 'saga-1';
    window._stagedFunnelBypass = true;
    const contract = window._buildStagedRegionContract({ visualState: { background: 'a luminous Veilwood grove, First Favored figures' }, phases: [] });
    s._stagedRegionContract = contract;

    function heroPrompt(camera) {
      const vs = { background: 'a Veilwood grove', camera: camera || 'close_li', pc_visibility: 'back_only', li_position: 'standing_close', li_expression: 'tender', li_visibility: 'revealed', pc_wardrobe: 'cloak', li_wardrobe: 'gossamer', lighting: 'golden_hour', social_staging_mode: 'romance_eligible', other_characters_present: [{ name: 'Sarel', gender: 'female' }], _phaseCharacters: ['protagonist', 'li', 'Sarel'], _phaseIdx: 0 };
      return window._buildStagedHeroPrompt(vs, 0, {}) || '';
    }

    // 1. lock block present with named characters
    const p1 = heroPrompt('close_li');
    t('lock block present for LI (Kael) + side char (Sarel)', () => [/FIRST FAVORED COLORS \(LOCKED/.test(p1) && /Kael: skin /.test(p1) && /Sarel: skin /.test(p1), '']);

    // 2. resolver deterministic
    const a1 = window._resolveFFAppearance('Kael'), a2 = window._resolveFFAppearance('Kael');
    t('resolver deterministic (Kael same colors twice)', () => [a1.skin === a2.skin && a1.hair === a2.hair && a1.iris === a2.iris, a1.skin + '/' + a1.hair]);

    // 3. cross-scene consistency (different camera → same colors in prompt)
    const p2 = heroPrompt('wide_establishing');
    const grab = (p, nm) => (p.match(new RegExp(nm + ': (skin [^\\n]+)')) || [])[1];
    t('same colors across two scenes (Kael)', () => [grab(p1, 'Kael') === grab(p2, 'Kael') && !!grab(p1, 'Kael'), grab(p1, 'Kael')]);

    // 4. cross-issue persist (worldInstanceId same) vs new story (different)
    const kaelSaga1 = JSON.stringify(window._resolveFFAppearance('Kael'));
    s.ffAppearance = {}; s.worldInstanceId = 'saga-1'; // issue: same world seed, cache cleared
    const kaelIssue = JSON.stringify(window._resolveFFAppearance('Kael'));
    s.ffAppearance = {}; s.worldInstanceId = 'saga-2'; // new story: different world seed
    const kaelNew = JSON.stringify(window._resolveFFAppearance('Kael'));
    t('SAME colors across issues (worldInstanceId preserved)', () => [kaelSaga1 === kaelIssue, '']);
    t('DIFFERENT colors on a new story (worldInstanceId changed)', () => [kaelSaga1 !== kaelNew, '']);
    s.worldInstanceId = 'saga-1'; s.ffAppearance = {};

    // 5. positive form guard present, NO negative "no horns/scales" phrasing in FF contract
    const ffBlock = (contract.textBlock.match(/SPECIES: FIRST FAVORED[\s\S]*?SPECIES ANTI-DEFAULTS[^\n]*/) || [''])[0];
    t('FF form guard: positive silhouette/forehead/diamond-in-pupil present', () => [/ordinary human silhouette/i.test(ffBlock) && /pupil inside each eye/i.test(ffBlock) && /bare, smooth skin/i.test(ffBlock), '']);
    t('FF form guard: NO negative "no horns/scales/gem" phrasing', () => [!/no horns|no scales|no gem|without horns|not a gem/i.test(ffBlock), 'positive-only']);

    // 6. eye canon: pupil is a distinct color, not solid black
    const kael = window._resolveFFAppearance('Kael');
    t('pupil color pinned + distinct from iris', () => [!!kael.pupil && kael.pupil !== kael.iris, 'pupil ' + kael.pupil + ' / iris ' + kael.iris]);
    t('lock line includes diamond pupil color', () => [/diamond pupil /.test(p1), '']);
    t('FF eye contract no longer says "solid black"', () => [!/solid black/i.test(ffBlock) && /vivid luminous color/i.test(ffBlock), '']);

    // 7. favored shift caption ROTATION (per-race, no phrase repeats within 20 uses)
    s._shiftCaptionRecent = [];
    const seq = [];
    for (let i = 0; i < 25; i++) seq.push(window._pickShiftCaption('First Favored'));
    let viol = 0;
    for (let i = 0; i < seq.length; i++) for (let j = Math.max(0, i - 20); j < i; j++) if (seq[j] === seq[i]) viol++;
    t('FF captions: NO phrase repeats within 20 uses (25 picks)', () => [viol === 0, viol + ' violations, ' + new Set(seq).size + ' unique of 25']);
    const pools = window._FAVORED_SHIFT_CAPTIONS;
    const kw = window._pickShiftCaption('Kwisheen');
    t('Kwisheen pick comes from the Kwisheen pool', () => [pools.kwisheen.indexOf(kw) !== -1 && pools.first_favored.indexOf(kw) === -1, kw.slice(0, 40) + '…']);
    const ff = window._pickShiftCaption('First Favored');
    t('FF pick comes from the First Favored pool', () => [pools.first_favored.indexOf(ff) !== -1 && pools.kwisheen.indexOf(ff) === -1, ff.slice(0, 40) + '…']);

    // 8. species-by-character guard (human PC must not inherit the LI's species)
    function kwPrompt() {
      s._stagedRegionContract = window._buildStagedRegionContract({ visualState: { background: 'a bioluminescent tidal grotto, Gloamwater Bay — a tentacled Kwisheen' }, phases: [] });
      return window._buildStagedHeroPrompt({ background: 'a tidal grotto, Gloamwater Bay', camera: 'medium_two_shot', pc_visibility: 'back_only', li_position: 'standing_apart', li_expression: 'curious', li_visibility: 'revealed', pc_wardrobe: 'sea-silk dress', li_wardrobe: 'gem loincloth', lighting: 'low_cool', social_staging_mode: 'stranger_awkward', _phaseCharacters: ['protagonist', 'li'], _phaseIdx: 0 }, 0, {}) || '';
    }
    s._playerSpecies = 'human'; s._liSpecies = 'kwisheen';
    const pMix = kwPrompt();
    t('species-bleed: human PC marked FULLY HUMAN, LI marked KWISHEEN', () => [/SPECIES BY CHARACTER/.test(pMix) && /protagonist\): FULLY HUMAN/.test(pMix) && /love interest\): KWISHEEN/.test(pMix), '']);
    s._playerSpecies = 'kwisheen'; s._liSpecies = 'kwisheen';
    const pSame = kwPrompt();
    t('species-bleed: NO block when both are the same species', () => [!/SPECIES BY CHARACTER/.test(pSame), '']);

    // 9. B2 — species resolver no longer over-triggers on bare words
    s._playerSpecies = '';
    const spGuests = window._resolveStagedSpecies({ visualState: { background: 'a ballroom, her favored guests at the long table' } }, 'lytharyn');
    t('B2: bare "favored" does NOT trigger First Favored', () => [spGuests.indexOf('first_favored') === -1, spGuests.join(',') || '(none)']);
    const spFF = window._resolveStagedSpecies({ visualState: { background: 'a First Favored envoy waits at the door' } }, 'lytharyn');
    t('B2: "First Favored" still triggers', () => [spFF.indexOf('first_favored') !== -1, spFF.join(',')]);
    const spTent = window._resolveStagedSpecies({ visualState: { background: 'kelp and tentacle coral everywhere, no people' } }, 'gloamwater_bay');
    t('B2: bare "tentacle" does NOT trigger Kwisheen', () => [spTent.indexOf('kwisheen') === -1, spTent.join(',') || '(none)']);

    // 10. B4 — named side characters get their OWN species rows
    s._playerSpecies = 'human'; s._liSpecies = 'kwisheen';
    s._stagedRegionContract = window._buildStagedRegionContract({ visualState: { background: 'a tidal grotto, Gloamwater Bay — a tentacled Kwisheen' }, phases: [] });
    const pOther = window._buildStagedHeroPrompt({ background: 'a tidal grotto', camera: 'wide_establishing', pc_visibility: 'back_only', li_position: 'standing_apart', li_expression: 'curious', li_visibility: 'revealed', pc_wardrobe: 'dress', li_wardrobe: 'loincloth', lighting: 'low_cool', social_staging_mode: 'stranger_awkward', other_characters_present: [{ name: 'Bram', gender: 'male', species: 'human' }, { name: 'Nixi', gender: 'female', species: 'kwisheen' }], _phaseCharacters: ['protagonist', 'li', 'Bram', 'Nixi'], _phaseIdx: 0 }, 0, {}) || '';
    t('B4: named human side char → FULLY HUMAN row', () => [/Bram: FULLY HUMAN/.test(pOther), '']);
    t('B4: named Kwisheen side char → KWISHEEN row', () => [/Nixi: KWISHEEN/.test(pOther), '']);
    t('pools are disjoint + each ≥21 (guarantees no-repeat-in-20)', () => [pools.first_favored.length >= 21 && pools.kwisheen.length >= 21 && !pools.first_favored.some(l => pools.kwisheen.indexOf(l) !== -1), 'FF=' + pools.first_favored.length + ' KW=' + pools.kwisheen.length]);

    return out;
  });

  await browser.close();
  let pass = 0, fail = 0;
  console.log('\n  FIRST FAVORED COLOR-LOCK + FORM GUARD  ($0)\n  ' + '─'.repeat(58));
  for (const r of R) { r.pass ? pass++ : fail++; console.log('  ' + (r.pass ? '✓' : '✗') + ' ' + r.name + (r.detail ? '  · ' + r.detail : '')); }
  console.log('  ' + '─'.repeat(58) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
