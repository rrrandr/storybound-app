// IDENTITY-PERSISTENCE BENCHMARK (A/B) — measures the ONE thing #4 targets: does the authoritative
// identity card reduce identity drift on recurring characters? Runs the SAME recurring-character scene
// twice — card OFF then card ON — with the Structural Pass on, and reports identity-card opportunities
// vs usage, repair categories, repair-avoidance, cost, latency, and measured structural entropy.
// Saves every panel labelled by run for visual identity-drift comparison. LONG + paid (~2 scene runs).
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/80c638ef-dc45-46dc-ad83-43ad5d0e1a40/scratchpad/idbench';
const E2E = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5b50dbf4-5fe5-4c80-ae8b-5a341feb3c62/scratchpad/e2e';
// Simulate production's LI-face-reveal: a locked canonical Kwisheen face-master so the LI (Vael) has an
// authoritative identity card. Without this the headless harness never sets one (opportunities stay 0).
const LI_FACE_MASTER = 'data:image/png;base64,' + require('fs').readFileSync(require('path').join(E2E, 'scene1_img2.png')).toString('base64');

const CATEGORY = { species_anatomy: 'species', body_plan: 'body_plan', gender: 'identity', weapon: 'weapon', held_prop: 'weapon',
  wardrobe: 'wardrobe', kwisheen_face: 'face', eye_color: 'eyes', skin_pattern: 'palette', jewelry: 'identity',
  sacrifice_mark: 'effects', wish_burst_anchor: 'effects', extra_person: 'anatomy', extra_hand: 'anatomy', extra_limb: 'anatomy' };
const IDENTITY_CATS = ['face', 'eyes', 'palette', 'identity', 'wardrobe', 'weapon']; // the drift the card should curb

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  page.on('console', m => { const t = m.text(); if (/\[CANON-REPAIR|id-card|CONDITIONING/i.test(t)) console.error('  >', t.slice(0, 160)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._completeStagedSceneFromScreenplay === 'function' && typeof window._structuralPassRender === 'function', { timeout: 40000 });

  async function runOnce(cardOn, tag) {
    const out = await page.evaluate(async ({ cardOn, LI_FACE_MASTER }) => {
      const s = window.state;
      // Fresh recurring-character combat scene (weapons + wardrobe continuity; Mira human + Kwisheen raider).
      s.storyId = 'idbench-' + (cardOn ? 'on' : 'off');
      s.picks = { world: 'Fantasy', worldSubtype: 'the_inhuman', flavor: 'the_inhuman', genre: 'fantasy', dynamic: 'forbidden', tone: 'Charged', intensity: 'Steamy',
        identity: { playerName: 'Mira', partnerName: 'Vael', displayPlayerName: 'Mira', displayPartnerName: 'Vael' }, pov: '1st' };
      s.povMode = 'normal'; s.world = 'Fantasy'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman'; s.fantasyRegion = 'gloamwater_bay';
      s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her'; s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen';
      s.storyLength = 'affair'; s.tier = 'affair'; s.contentMode = 'explicit'; s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
      s.turnCount = 0; s.scenes = []; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s.gnArtist = s.gnArtist || 'ender_bond'; s._pcLookSkipped = true;
      s._sceneWant = "survive the Kwisheen raider's Many-Tide assault and keep Vael alive";
      s.currentCrisis = 'a hostile KWISHEEN raider ambushes Mira and Vael in the drowned coral ruins, fighting the Many-Tide way — a spear-tentacle high, a cutlass-tentacle low, a hidden dagger for the killing thrust; Vael, herself Kwisheen, answers tentacle against tentacle.';
      s.aPlot = { goal: "survive the Kwisheen raider's Many-Tide ambush", antagonistOrAntiForce: 'a hostile Kwisheen raider fighting the Many-Tide way', namedClock: "before the raider's hidden dagger finds Mira" };
      window._devBypass = true; window._stagedFunnelBypass = true; window.__cgAuthorTimeoutMs = 180000;
      window._structuralPass = true; window._kleinCanonRef = !!cardOn;
      // reset per-run accumulators + render state so scene 0 regenerates fresh
      window._pipelineTrace = []; window._canonRepairLog = []; s._castingLibrary = {}; s._stagedActive = null; s._stagedHeroCache = {}; s._stagedRegionContract = null;
      // inject the LI (Vael) locked face-master so the identity card can resolve (simulates production LI-reveal)
      s.liFaceMasterUrl = { bench: LI_FACE_MASTER }; s.canonicalLIId = 'bench';
      let err = null;
      try { await Promise.race([window._completeStagedSceneFromScreenplay(0, '', ''), new Promise((_, r) => setTimeout(() => r(new Error('timeout 540s')), 540000))]); }
      catch (e) { err = e && e.message; }
      // gen resolves at FIRST-READY; the remaining phases render in the background. POLL until the
      // pipeline trace stops growing (all phases rendered), stable for ~18s, cap 480s.
      let last = -1, stable = 0, t0 = Date.now();
      while (Date.now() - t0 < 600000) {
        const len = (window._pipelineTrace || []).length;
        if (len > 0 && len === last) { stable += 3; if (stable >= 130) break; } else { stable = 0; } // 130s no-growth > ~89s/phase, so we don't break between phases
        last = len;
        await new Promise(r => setTimeout(r, 3000));
      }
      // collect hero panels (cache + phase URLs)
      const imgs = []; const seen = {};
      const push = u => { if (u && String(u).startsWith('data:') && !seen[u]) { seen[u] = 1; imgs.push(u); } };
      try { Object.keys(s._stagedHeroCache || {}).forEach(k => push(s._stagedHeroCache[k] && s._stagedHeroCache[k].imageUrl)); } catch (_) {}
      try { const pu = s._stagedActive && s._stagedActive.phaseImageUrls; if (pu) Object.keys(pu).forEach(k => push(pu[k])); } catch (_) {}
      return { err, trace: window._pipelineTrace || [], repairs: window._canonRepairLog || [], imgs, phases: (window._pipelineTrace || []).length };
    }, { cardOn, LI_FACE_MASTER });
    (out.imgs || []).forEach((u, i) => { try { fs.writeFileSync(path.join(OUT, tag + '_panel' + i + '.png'), Buffer.from(String(u).split(',')[1], 'base64')); } catch (_) {} });
    return out;
  }

  function summarize(label, out) {
    const T = out.trace || [], R = out.repairs || [], n = T.length || 1;
    const sum = (a, f) => a.reduce((x, e) => x + (f(e) ? 1 : 0), 0);
    const opportunities = sum(R, e => e.refAvailable);           // reference existed
    const usage = sum(R, e => e.usedIdCard);                      // card actually fed to Klein
    const repaired = R.filter(e => e.outcome === 'repaired');
    const cats = {}; R.forEach(e => { const c = CATEGORY[e.type] || 'other'; cats[c] = (cats[c] || 0) + 1; });
    const identityDefects = sum(R, e => IDENTITY_CATS.indexOf(CATEGORY[e.type] || '') !== -1);
    const cleanThrough = sum(T, t => t.structural.attempts === 1 && t.colorize.recolorize === 0 && (t.cosmetic.kleinRepairs || []).length === 0);
    const entropyMeasured0 = sum(T, t => t.entropyStatus === 'measured' && t.structuralEntropy === 0);
    const entropyUnknown = sum(T, t => t.entropyStatus !== 'measured');
    const avg = f => (T.reduce((a, t) => a + (f(t) || 0), 0) / n).toFixed(2);
    console.log('\n  ══ ' + label + ' ══ (panels=' + T.length + (out.err ? ', err=' + out.err : '') + ')');
    console.log('    IDENTITY-CARD AVAILABILITY:    ' + opportunities + '/' + R.length + ' repair sites = ' + (R.length ? (100 * opportunities / R.length).toFixed(0) : '—') + '%  ← subsystem health metric');
    console.log('    repairs USING identity card:   ' + usage + (opportunities ? ' (' + (100 * usage / opportunities).toFixed(0) + '% of available used)' : ''));
    console.log('    identity-related defects seen: ' + identityDefects + '  (face/eyes/palette/identity/wardrobe/weapon)');
    console.log('    repair categories:             ' + (Object.keys(cats).length ? Object.keys(cats).map(k => k + ':' + cats[k]).join(', ') : 'none'));
    console.log('    Klein repairs (total):         ' + repaired.length);
    console.log('    clean-through (no repair):     ' + cleanThrough + '/' + T.length);
    console.log('    structural entropy:            measured-0 ' + entropyMeasured0 + ' | unknown ' + entropyUnknown + '/' + T.length);
    console.log('    avg image-calls/panel:         ' + avg(t => (t.calls.lineart + t.calls.colorize)) + ' render + ' + avg(t => t.calls.structVerify) + ' verify');
    console.log('    avg total ms/panel:            ' + avg(t => t.ms.total));
    return { opportunities, usage, identityDefects, repaired: repaired.length, cleanThrough, panels: T.length,
      cats, avoidancePct: T.length ? (100 * cleanThrough / T.length) : 0,
      avgMs: +avg(t => t.ms.total), avgRenderCalls: +avg(t => (t.calls.lineart + t.calls.colorize)) };
  }
  // Delta helper: percent change OFF→ON (guards divide-by-zero).
  function delta(off, on) { if (off === 0) return on === 0 ? '0%' : '+' + on + ' (new)'; return ((on - off) / off >= 0 ? '+' : '') + Math.round(100 * (on - off) / off) + '%'; }

  console.log('\n  IDENTITY-PERSISTENCE BENCHMARK (A/B) — recurring Mira + Kwisheen raider');
  console.log('  ' + '─'.repeat(70));
  const off = await runOnce(false, 'A_off');
  const on = await runOnce(true, 'B_on');
  const sOff = summarize('RUN A — identity card OFF', off);
  const sOn = summarize('RUN B — identity card ON', on);
  console.log('\n  ══ IDENTITY CARD IMPACT (OFF → ON, Δ) ══');
  const allCats = Array.from(new Set(Object.keys(sOff.cats).concat(Object.keys(sOn.cats))));
  console.log('    card usage (repairs):     OFF ' + sOff.usage + '  → ON ' + sOn.usage + '   ' + delta(sOff.usage, sOn.usage) + '   (must be 0→N or the card is not firing)');
  console.log('    identity defects seen:    OFF ' + sOff.identityDefects + '  → ON ' + sOn.identityDefects + '   ' + delta(sOff.identityDefects, sOn.identityDefects));
  allCats.forEach(c => { const o = sOff.cats[c] || 0, n = sOn.cats[c] || 0; console.log('    ' + (c + ' repairs:').padEnd(24) + ' OFF ' + o + '  → ON ' + n + '   ' + delta(o, n)); });
  console.log('    repair avoidance:         OFF ' + sOff.avoidancePct.toFixed(0) + '%  → ON ' + sOn.avoidancePct.toFixed(0) + '%   ' + (sOn.avoidancePct - sOff.avoidancePct >= 0 ? '+' : '') + (sOn.avoidancePct - sOff.avoidancePct).toFixed(0) + ' pts');
  console.log('    latency (ms/panel):       OFF ' + sOff.avgMs + '  → ON ' + sOn.avgMs + '   ' + delta(sOff.avgMs, sOn.avgMs));
  console.log('    render calls/panel:       OFF ' + sOff.avgRenderCalls + '  → ON ' + sOn.avgRenderCalls + '   ' + delta(sOff.avgRenderCalls, sOn.avgRenderCalls));
  console.log('    NOTE: OFF/ON are DIFFERENT generations (non-deterministic) — treat count deltas as DIRECTIONAL; the real verdict is VISUAL (below).');
  console.log('\n  ══ OVER-CONSTRAIN CHECK (the downside of stronger conditioning — inspect visually) ══');
  console.log('    In the B_on_* panels, did the card-conditioned repairs COPY the reference\'s pose / expression / framing / lighting?');
  console.log('    The prompt says "preserve identity, not pose" — verify it held. [ pose reused? expression reused? camera reused? ]  → PASS/FAIL by eye.');
  console.log('\n  ── VISUAL VERDICT (lead with this, not the numbers) ──');
  console.log('    Panel by panel: "would a reader recognize this as the SAME Mira / same Kwisheen?"  A_off_*.png  vs  B_on_*.png  in ' + OUT);
  console.log('  ' + '─'.repeat(70) + '\n');
  await browser.close();
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
