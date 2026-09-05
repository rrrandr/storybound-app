// H3a — DELIVERY of playerMask/Character+ to the author. Capture the FULL author prompt for two most
// incompatible masks (OPEN_VEIN vs ARMORED_FOX). Then: (1) is mask-specific character content present?
// (2) does it DIFFER between masks? (3) WHERE does it sit relative to the writing task? (presence≠influence)
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/h3a';
fs.mkdirSync(DIR, { recursive: true });
const MASKS = ['OPEN_VEIN', 'ARMORED_FOX'];
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
    s.archetype = { primary: 'DARK_VICE', modifier: null, bound: false };
    s.playerMask = mask; s.playermask = mask;
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
  for (const mask of MASKS) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    let body = null;
    await page.route('**/api/proxy', async (route) => {
      try {
        const b = route.request().postData() || '';
        if (!body && b.length > 90000 && (/Write the opening scene/.test(b) || /TURN INSTRUCTIONS/.test(b))) {
          body = b; // capture the FULL request (system + user) — we STUB the response ($0, don't need prose)
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }], content: '{"ok":true}' }) }); return;
        }
        await route.continue();
      } catch (e) { try { await route.continue(); } catch (_) {} }
    });
    for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images', '**/api/grok-image', '**/api/visualize-flux', '**/api/mistral-proxy', '**/api/orchestrator', '**/api/anthropic-proxy', '**/api/chatgpt-proxy', '**/api/deepseek-proxy'])
      await page.route(pat, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }], content: '{"ok":true}' }) }));
    try {
      await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 40000 });
      await page.waitForTimeout(300); await setup(page, mask);
      await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) {} });
      { const t0 = Date.now(); while (Date.now() - t0 < 60000) { await page.waitForTimeout(3000); if (body) break; const ready = await page.evaluate(() => !!(window.state.sysPrompt && window.state.sysPrompt.length > 5000) && !window.state._isAdvancingScene); if (ready && Date.now() - t0 > 15000) break; } }
      if (!body) await page.evaluate((act) => { const setV=(id,v)=>{const el=document.getElementById(id); if(el){el.value=v; el.dispatchEvent(new Event('input',{bubbles:true}));}}; setV('actionInput',act); setV('gnActionInput',act); const b=document.getElementById('submitBtn'); if(b){b.disabled=false; b.click();} }, ACTION);
      { const t0 = Date.now(); while (Date.now() - t0 < 60000) { await page.waitForTimeout(3000); if (body) break; } }
    } catch (e) {}
    if (body) { fs.writeFileSync(DIR + '/prompt_' + mask + '.json', body); console.error('[' + mask + '] captured prompt ' + body.length + 'c'); }
    else console.error('[' + mask + '] FAILED to capture');
    await ctx.close();
    await new Promise(r => setTimeout(r, 3000));
  }
  console.error('DONE h3a'); await browser.close(); process.exit(0);
})();
