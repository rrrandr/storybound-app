// CHARACTER+ ISOLATION (Roman 2026-08-02). Hold EVERYTHING constant; vary ONLY playerMask.
// Blind test afterward: with names removed, can I tell which protagonist this is after 300 words?
// If not → Character+ isn't reaching the author. Robust route handling (guard route.fetch timeout).
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/charplus';
fs.mkdirSync(DIR, { recursive: true });
const MASKS = ['DARK_VICE', 'OPEN_VEIN', 'HEART_WARDEN', 'ARMORED_FOX', 'SPELLBINDER', 'BEAUTIFUL_RUIN', 'ETERNAL_FLAME'];
const ACTION = 'I look around and take stock of where I am.';

function setup(page, mask) {
  return page.evaluate((mask) => {
    const s = window.state; window._devBypass = true; window._forceAudits = false;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = 'Fantasy'; s.world = 'Fantasy'; s.picks.flavor = 'the_inhuman'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman';
    s._cachedAncestryPlayer = { normalized: 'darkwood', raw: 'darkwood' }; s._fantasyRegionOverrideApplied = false;
    s.picks.pcSpecies = 'Human'; s.picks.liSpecies = 'Wilder';
    s.picks.dynamic = 'enemies_to_lovers'; s.dynamic = 'enemies_to_lovers';
    s.loveInterest = 'Male'; s.loveInterestName = 'Kaelen'; s.liGender = 'male';
    s.archetype = { primary: 'DARK_VICE', modifier: null, bound: false }; // LI archetype constant
    s.playerMask = mask; s.playermask = mask;                              // ← the ONLY variable: PC Character+
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy';
    s.name = 'Rowan'; s.playerName = 'Rowan'; s.partnerName = 'Kaelen';
    s.identity = { playerName: 'Rowan', partnerName: 'Kaelen', displayPlayerName: 'Rowan', displayPartnerName: 'Kaelen' };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    try { localStorage.setItem('sb_witnessed_fatelands_wish_ritual', '1'); } catch (_) {}
  }, mask);
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const summary = [];
  for (const mask of MASKS) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    let captured = null;
    await page.route('**/api/proxy', async (route) => {
      try {
        const body = route.request().postData() || '';
        if (!captured && body.length > 90000 && (/Write the opening scene/.test(body) || /TURN INSTRUCTIONS/.test(body))) {
          let resp; try { resp = await route.fetch({ timeout: 180000 }); } catch (e) { try { await route.continue(); } catch (_) {} return; }
          const text = await resp.text();
          let content = text; try { const j = JSON.parse(text); content = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || text; } catch (_) {}
          captured = String(content); try { await route.fulfill({ response: resp, body: text }); } catch (_) {} return;
        }
        await route.continue();
      } catch (e) { try { await route.continue(); } catch (_) {} }
    });
    for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images', '**/api/grok-image', '**/api/visualize-flux'])
      await page.route(pat, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    try {
      await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 40000 });
      await page.waitForTimeout(300); await setup(page, mask);
      await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) {} });
      { const t0 = Date.now(); while (Date.now() - t0 < 70000) { await page.waitForTimeout(3000); if (captured) break; const ready = await page.evaluate(() => !!(window.state.sysPrompt && window.state.sysPrompt.length > 5000) && !window.state._isAdvancingScene); if (ready && Date.now() - t0 > 18000) break; } }
      if (!captured) await page.evaluate((act) => { const setV=(id,v)=>{const el=document.getElementById(id); if(el){el.value=v; el.dispatchEvent(new Event('input',{bubbles:true}));}}; setV('actionInput',act); setV('gnActionInput',act); const b=document.getElementById('submitBtn'); if(b){b.disabled=false; b.click();} }, ACTION);
      { const t0 = Date.now(); while (Date.now() - t0 < 150000) { await page.waitForTimeout(3000); if (captured) break; } }
    } catch (e) {}
    if (captured) fs.writeFileSync(DIR + '/mask_' + mask + '.txt', captured);
    summary.push({ mask, words: captured ? captured.split(/\s+/).filter(Boolean).length : 0, ok: !!captured });
    console.error('[' + mask + '] ' + (captured ? captured.split(/\s+/).filter(Boolean).length + 'w ✓' : 'FAIL ✗'));
    await ctx.close();
    await new Promise(r => setTimeout(r, 4000)); // spacing — ease server load
  }
  fs.writeFileSync(DIR + '/summary.json', JSON.stringify(summary, null, 2));
  console.error('\nDONE charplus: ' + summary.filter(s => s.ok).length + '/' + MASKS.length);
  await browser.close(); process.exit(0);
})();
