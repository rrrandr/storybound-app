// SCENE-LENGTH PROBE (Roman 2026-07-24) — the measurement I skipped: does Grok write LONGER on
// Scene 2+ than Scene 1? If Scene 2+ ≈ 700-900w while Scene 1 ≈ 300w, Grok is NOT an inherently
// short writer — Scene 1 is OVERLOADED (HOT opener + deck + payload cram). If Scene 2+ ≈ 300 too,
// Grok compresses everywhere. Drives the real UI: begin → capture Scene 1 → fill action + click
// submit → capture Scene 2 → repeat. Same Grok production pipeline throughout.
//   node _scenelen_probe.js   → /tmp/scenelen.json
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/scenelen.json';
const SCENES = parseInt(process.env.SCENES || '3', 10);
const log = (...a) => console.error(...a);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images'])
    await page.route(pat, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked"}' }));
  const lenLogs = [];
  page.on('console', c => { const t = c.text(); if (/SCENE1:PROMPT-SIZES|SCENE LENGTH GUIDANCE|_targetSceneLengthRange|PACING AUDIT|scene_too_short/i.test(t)) lenLogs.push(t.slice(0, 160)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100 && typeof window.handleBeginStory === 'function', { timeout: 40000 });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    window.__scenes = [];
    window._auditSceneEmotionalGravity = function (pr) { try { if (typeof pr === 'string' && pr.length > 120) window.__scenes.push(pr); } catch (_) {} return Promise.resolve(null); };
    ['_auditBannedPhraseLeakage', '_classifyArchetypeManifestation', '_auditArchetypeManifestation', '_classifyLITexture', '_auditLITextureSources', '_auditSceneAgainstRPlot', '_auditUnavailabilityManifestation'].forEach(fn => { try { window[fn] = function () { return Promise.resolve(null); }; } catch (_) {} });
    const s = window.state; window._devBypass = true; window._forceAudits = true;
    window._forceHotOpener = false; window._isBillionaireOnboarding = function () { return false; };
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = 'billionaire'; s.world = 'billionaire'; s.picks.flavor = 'billionaire_modern'; s.worldSubtype = 'billionaire_modern'; s.flavor = 'billionaire_modern';
    s.picks.dynamic = 'enemies_to_lovers'; s.dynamic = 'enemies_to_lovers';
    s.loveInterest = 'Male'; s.loveInterestName = 'Dorian'; s.liGender = 'male';
    s.archetype = { primary: 'DARK_VICE', modifier: null, bound: false };
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy';
    s.name = 'Mara'; s.playerName = 'Mara'; s.partnerName = 'Dorian';
    s.identity = { playerName: 'Mara', partnerName: 'Dorian', displayPlayerName: 'Mara', displayPartnerName: 'Dorian' };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    try { var fk = window._flavorVarietyKey ? window._flavorVarietyKey(s) : null; var h = {}; if (fk) h[fk] = ['a', 'b', 'c']; h['billionairemodern'] = ['a', 'b', 'c']; localStorage.setItem('sb_flavor_history', JSON.stringify(h)); } catch (_) {}
  });
  await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });

  const wcOf = (t) => (String(t || '').replace(/\[[A-Z_]+:[^\]]*\]/g, ' ').replace(/<<[^>]*>>/g, ' ').match(/\b[\w']+\b/g) || []).length;
  const lengths = [];
  for (let sc = 0; sc < SCENES; sc++) {
    // wait for scene index `sc` to be captured + idle
    const t0 = Date.now(); let got = false;
    while (Date.now() - t0 < 300000) {
      await page.waitForTimeout(3000);
      const st = await page.evaluate((n) => { const a = window.__scenes || [], s = window.state; return { n: a.length, busy: !!(s._isAdvancingScene || s._stagedSubmitting || s._stagedAwaitingProse), last: (a[a.length - 1] || '').length, tc: s.turnCount }; }, sc);
      if (st.n >= sc + 1 && st.last > 200 && (!st.busy || (Date.now() - t0) > 70000)) { got = true; break; }
    }
    if (!got) { log('Scene ' + (sc + 1) + ': ✗ NOT captured (turn=' + sc + ')'); break; }
    const info = await page.evaluate((n) => { const a = window.__scenes || []; return { text: a[n] || '', turnCount: window.state.turnCount }; }, sc);
    const wc = wcOf(info.text);
    lengths.push({ scene: sc + 1, words: wc, turnCount: info.turnCount });
    log('Scene ' + (sc + 1) + ': ' + wc + ' words  (turnCount=' + info.turnCount + ')');

    if (sc < SCENES - 1) {
      // advance the turn via the real UI submit path
      const advanced = await page.evaluate(() => {
        try {
          var ai = document.getElementById('actionInput'); if (ai) { ai.value = 'I hold my ground and press the confrontation, refusing to let it slide.'; ai.dispatchEvent(new Event('input', { bubbles: true })); }
          var di = document.getElementById('dialogueInput'); if (di) { di.value = ''; di.dispatchEvent(new Event('input', { bubbles: true })); }
          // resolve any pending micro-expression choice so submit isn't blocked
          try { if (typeof window.state.fateSelectedIndex !== 'number') window.state.fateSelectedIndex = null; } catch (_) {}
          var b = document.getElementById('submitBtn');
          if (b) { b.disabled = false; b.click(); return 'clicked'; }
          return 'no-submitBtn';
        } catch (e) { return 'ERR ' + (e && e.message); }
      });
      log('  → advance: ' + advanced);
      await page.waitForTimeout(2500);
    }
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify({ lengths, lenLogs }, null, 1));
  log('\n═══ SCENE LENGTHS (same Grok production pipeline) ═══');
  lengths.forEach(x => log('  Scene ' + x.scene + ': ' + x.words + ' words'));
  if (lengths.length >= 2) {
    const s1 = lengths[0].words, rest = lengths.slice(1).map(x => x.words);
    log('\n  Scene 1 = ' + s1 + 'w · Scene 2+ = ' + rest.join('/') + 'w  → ' + (rest.every(w => w > s1 * 1.4) ? 'SCENE 2+ SUBSTANTIALLY LONGER → Scene 1 is overloaded, not Grok' : rest.every(w => Math.abs(w - s1) < s1 * 0.4) ? 'ALL SIMILAR → Grok compresses everywhere' : 'MIXED'));
  }
})().catch(e => { console.error('SCENELEN-ERR', e.message); process.exit(1); });
