// ENTROPY TEST (Roman 2026-08-02) — SAME seed, 10 openings. Isolates WHERE convergence begins.
// If ~7/10 are structurally identical → generation (planner/author) is collapsing (low entropy).
// If all different → generation has entropy → cross-config convergence comes EARLIER (seed/plan). Black-box.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/coldroll';
fs.mkdirSync(DIR, { recursive: true });
const N = 8;
const ACTION = 'I look around and take stock of where I am.'; // constant across all 10 → not a confound for gen-entropy

function setup(page) {
  return page.evaluate(() => {
    const s = window.state; window._devBypass = true; window._forceAudits = false;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = 'Fantasy'; s.world = 'Fantasy'; s.picks.flavor = 'the_inhuman'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman';
    s._cachedAncestryPlayer = { normalized: 'darkwood', raw: 'darkwood' }; s._fantasyRegionOverrideApplied = false;
    s.picks.pcSpecies = 'Human'; s.picks.liSpecies = 'Wilder';
    s.picks.dynamic = 'enemies_to_lovers'; s.dynamic = 'enemies_to_lovers';
    s.loveInterest = 'Male'; s.loveInterestName = 'Kaelen'; s.liGender = 'male';
    s.archetype = { primary: 'DARK_VICE', modifier: null, bound: false };
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy';
    s.name = 'Rowan'; s.playerName = 'Rowan'; s.partnerName = 'Kaelen';
    s.identity = { playerName: 'Rowan', partnerName: 'Kaelen', displayPlayerName: 'Rowan', displayPartnerName: 'Kaelen' };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    try { localStorage.setItem('sb_witnessed_fatelands_wish_ritual','1'); } catch (_) {} try { window._forceHotOpener = false; } catch(_){}; s._openingTemperature = undefined;
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const results = [];
  for (let i = 1; i <= N; i++) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    let captured = null, kind = null;
    await page.route('**/api/proxy', async (route) => {
      const body = route.request().postData() || '';
      if (!captured && body.length > 90000 && (/Write the opening scene/.test(body) || /TURN INSTRUCTIONS/.test(body))) {
        kind = /Write the opening scene/.test(body) ? 'OPENING' : 'PERTURN';
        const resp = await route.fetch(); const text = await resp.text();
        let content = text; try { const j = JSON.parse(text); content = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || text; } catch (_) {}
        captured = String(content); await route.fulfill({ response: resp, body: text }); return;
      }
      await route.continue();
    });
    for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images', '**/api/grok-image', '**/api/visualize-flux'])
      await page.route(pat, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    try {
      await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 40000 });
      await page.waitForTimeout(300); await setup(page);
      await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) {} });
      { const t0 = Date.now(); while (Date.now() - t0 < 60000) { await page.waitForTimeout(3000); if (captured) break; const ready = await page.evaluate(() => !!(window.state.sysPrompt && window.state.sysPrompt.length > 5000) && !window.state._isAdvancingScene); if (ready && Date.now() - t0 > 18000) break; } }
      if (!captured) await page.evaluate((act) => { const setV=(id,v)=>{const el=document.getElementById(id); if(el){el.value=v; el.dispatchEvent(new Event('input',{bubbles:true}));}}; setV('actionInput',act); setV('gnActionInput',act); const b=document.getElementById('submitBtn'); if(b){b.disabled=false; b.click();} }, ACTION);
      { const t0 = Date.now(); while (Date.now() - t0 < 120000) { await page.waitForTimeout(3000); if (captured) break; } }
    } catch (e) {}
    if (captured) fs.writeFileSync(DIR + '/gen_' + String(i).padStart(2, '0') + '_' + (kind || '?') + '.txt', captured);
    const wc = captured ? captured.split(/\s+/).filter(Boolean).length : 0;
    results.push({ i, kind, words: wc, ok: !!captured });
    console.error('[gen ' + i + '] ' + (kind || '?') + ' → ' + (captured ? wc + 'w ✓' : 'FAIL ✗'));
    await ctx.close();
  }
  fs.writeFileSync(DIR + '/results.json', JSON.stringify(results, null, 2));
  console.error('\nDONE entropy: ' + results.filter(r => r.ok).length + '/' + N + ' → ' + DIR);
  await browser.close(); process.exit(0);
})();
