// Batch validation (2026-07-14): N fresh Fatelands literary HOT Scene-1s to measure OUTPUT rates for
// (a) cold-open and (c) under-description after the phase-3 fixes. Each iteration reloads the app (fresh
// window.state) but localStorage persists, so the sb_*_desc_failrate batch trackers accumulate. Per story
// it records: [COLD-GATE] _hot (did the gate fire in the sent prompt?), [OPENING:TEMP:v2] rendered= (first-
// draft HOT vs COLD), and whether [HOT-RENDER:REPAIR] fired (band-aid needed = first draft still cold).
// At the end it reads the 3 desc-failrate trackers. Image endpoints mocked. N text-gen calls (real, paid).
const { chromium } = require('playwright-core');
const fs = require('fs');
const N = parseInt(process.env.N || '10', 10);
const log = (...a) => console.error('[BATCH]', ...a);
const strip = s => String(s).replace(/\x1b\[[0-9;]*m/g, '');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  for (const p of ['**/api/image', '**/api/bfl-kontext', '**/api/get-parent-images', '**/api/gemini-image'])
    await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));

  let buf = [];
  const RX = /\[COLD-GATE\]|\[OPENING:TEMP:v2\]|\[HOT-RENDER:REPAIR\]|\[SPECIES:PREGEN\]|\[GEN-FAIL:(LI|PC|SETTING)[^\]]*:FINAL\]|\[STORY:READY\]|BEGIN-ERR/i;
  page.on('console', m => { const t = strip(m.text()); if (RX.test(t)) buf.push(t.slice(0, 240)); });

  const rows = [];
  for (let i = 0; i < N; i++) {
    buf = [];
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 45000 });
    if (i === 0) await page.evaluate(() => { try { ['sb_li_desc_failrate','sb_pc_desc_failrate','sb_setting_desc_failrate'].forEach(k => localStorage.removeItem(k)); } catch (_) {} });

    await page.evaluate((sid) => {
      const s = window.state; window._devBypass = true; window._forceAudits = false; window._forceHotOpener = true;
      s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true; s._pcLookSkipped = true; s.pcLookLocked = true;
      s.storyId = sid;
      s.picks = s.picks || {}; Object.assign(s.picks, { world: 'Fantasy', tone: 'Earnest', genre: 'ChosenBurdened', pressure: 'ObligationBurden', flavor: 'ChosenBurdened', dynamic: 'Friends', pov: 'First', identity: { playerName: 'Sekka', partnerName: 'Ural' } });
      s.world = 'Fantasy'; s.flavor = 'ChosenBurdened'; s.genre = 'ChosenBurdened'; s.dynamic = 'Friends'; s.pov = 'first_person';
      s.loveInterest = 'Male'; s.loveInterestName = 'Ural'; s.liGender = 'male'; s.name = 'Sekka'; s.playerName = 'Sekka';
      s.resolvedWorldFlavors = [{ val: 'the_inhuman' }];
      s.archetype = { primary: 'OPEN_VEIN', modifier: null, bound: false, canonicalLIId: null, boundAtScene: null }; s.playerMask = 'BEAUTIFUL_RUIN';
      s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy'; s.turnCount = 0; s.mode = 'solo';
      s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    }, 'batch_' + Date.now() + '_' + i);

    await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + e.message); } });
    { const t0 = Date.now(); while (Date.now() - t0 < 340000) { await page.waitForTimeout(4000); if (buf.some(l => /\[STORY:READY\]/.test(l))) break; } }
    // let the FINALIZE pass (which writes the desc-failrate trackers) complete
    { const t0 = Date.now(); while (Date.now() - t0 < 60000) { await page.waitForTimeout(3000); if (buf.some(l => /\[GEN-FAIL:(PC|SETTING)[^\]]*:FINAL\]/.test(l))) break; } }
    await page.waitForTimeout(2000);

    const coldGate = buf.find(l => /\[COLD-GATE\]/.test(l)) || '';
    const tempV2 = buf.find(l => /\[OPENING:TEMP:v2\]/.test(l)) || '';
    const rendered = /rendered=HOT_CRISIS/.test(tempV2) ? 'HOT' : (/rendered=COLD_DISRUPTION/.test(tempV2) ? 'COLD' : '?');
    const repairFired = buf.some(l => /\[HOT-RENDER:REPAIR\]/.test(l));
    const hotGate = /_hot=true/.test(coldGate);
    const species = (buf.find(l => /\[SPECIES:PREGEN\]/.test(l)) || '').replace(/^.*LI species resolved pre-Scene-1: /, '').slice(0, 40);
    // Repair outcome: parse the applied/rejected/no-edit line for segment length delta + post-repair temp.
    const repairLine = buf.find(l => /\[HOT-RENDER:REPAIR\] (applied|rejected|no edit)/.test(l)) || '';
    const segM = repairLine.match(/segment (\d+)→(\d+) chars/);
    const segFrom = segM ? +segM[1] : null, segTo = segM ? +segM[2] : null;
    const ratio = (segFrom && segTo) ? +(segTo / segFrom).toFixed(2) : null;
    const postRepair = /→HOT_CRISIS ✓ HOT/.test(repairLine) ? 'HOT'
      : /still cold; accepted/.test(repairLine) ? 'still-COLD(accepted)'
      : /rejected/.test(repairLine) ? 'rejected→kept-orig(COLD)'
      : /no edit produced/.test(repairLine) ? 'no-edit→kept-orig(COLD)'
      : repairFired ? '?' : 'n/a';
    const finalTemp = (rendered === 'HOT') ? 'HOT' : (postRepair === 'HOT' ? 'HOT(repaired)' : (postRepair.startsWith('still') || postRepair.includes('COLD') ? 'COLD' : rendered));
    const row = { i: i + 1, hotGate, firstDraft: rendered, repairFired, segFrom, segTo, ratio, postRepair, finalTemp, species };
    rows.push(row);
    log(`story ${i + 1}/${N}: first-draft=${rendered} · repair=${repairFired ? `${segFrom}→${segTo}c (${ratio}x) → ${postRepair}` : 'none'} · FINAL=${finalTemp} · LI=${species}`);
  }

  const trackers = await page.evaluate(() => {
    const g = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (_) { return []; } };
    return { li: g('sb_li_desc_failrate'), pc: g('sb_pc_desc_failrate'), setting: g('sb_setting_desc_failrate') };
  });
  const rate = a => { const n = a.length, f = a.reduce((s, x) => s + (x && x.fail ? 1 : 0), 0); return n ? `${f}/${n} fail (${Math.round(100 * f / n)}%)` : 'n=0'; };
  const floorRate = a => { const n = a.length, fl = a.reduce((s, x) => s + (x && x.floor ? 1 : 0), 0); return n ? `${fl}/${n} floor-met (${Math.round(100 * fl / n)}%)` : 'n=0'; };

  const out = { rows, trackers };
  fs.writeFileSync('/tmp/validate_batch.json', JSON.stringify(out, null, 2));

  const hotDraft = rows.filter(r => r.firstDraft === 'HOT').length;
  const gateFired = rows.filter(r => r.hotGate).length;
  const repairNeeded = rows.filter(r => r.repairFired).length;
  const repaired = rows.filter(r => r.repairFired && r.ratio != null);
  const ratios = repaired.map(r => r.ratio);
  const avgRatio = ratios.length ? +(ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(2) : null;
  const shrank = repaired.filter(r => r.ratio < 0.98).length, grew = repaired.filter(r => r.ratio > 1.02).length;
  const coldCases = rows.filter(r => r.firstDraft === 'COLD');
  const coldFlipped = coldCases.filter(r => r.postRepair === 'HOT').length;
  const finalHot = rows.filter(r => r.finalTemp === 'HOT' || r.finalTemp === 'HOT(repaired)').length;
  console.log('\n===== BATCH VERDICT (N=' + N + ') =====');
  console.log('(a) [COLD-GATE] _hot fired      : ' + gateFired + '/' + N + ' (gate live in the sent prompt)');
  console.log('(a) first-draft rendered HOT    : ' + hotDraft + '/' + N + '  · FINAL hot (after repair): ' + finalHot + '/' + N);
  console.log('(a) per story (first→final)     : ' + rows.map(r => r.firstDraft + '→' + r.finalTemp).join(' | '));
  console.log('(a) REPAIR DELTAS (segFrom→segTo, ratio): ' + repaired.map(r => r.segFrom + '→' + r.segTo + '(' + r.ratio + 'x)').join(', '));
  console.log('(a) repair length: avg ratio ' + avgRatio + 'x · shrank ' + shrank + '/' + repaired.length + ' · grew ' + grew + '/' + repaired.length + ' (floor 0.6, reject <0.6 → keeps original; so no gutting)');
  console.log('(a) REPAIR SUCCESS on COLD first-drafts: ' + coldFlipped + '/' + coldCases.length + ' flipped COLD→HOT · outcomes: ' + coldCases.map(r => r.postRepair).join(', '));
  console.log('(c) LI-description   : ' + rate(trackers.li));
  console.log('(c) PC-description   : ' + rate(trackers.pc));
  console.log('(c) SETTING          : ' + rate(trackers.setting) + ' · ' + floorRate(trackers.setting));
  console.log('\nfull JSON → /tmp/validate_batch.json');
  await browser.close();
})().catch(e => { console.error('[BATCH] FATAL', e && e.message); process.exit(1); });
