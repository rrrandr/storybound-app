// SCENE-1 CAPTURE (product-validation sprint). Real opening if it fires; else one submit → scene 1.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/sprint';
fs.mkdirSync(DIR, { recursive: true });

function setup(page) {
  return page.evaluate(() => {
    const s = window.state; window._devBypass = true; window._forceAudits = false;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = 'Fantasy'; s.world = 'Fantasy'; s.picks.flavor = 'the_inhuman'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman';
    s.fantasyRegion = 'the_thornwild'; s.picks.fantasyRegion = 'the_thornwild';
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
    try { localStorage.removeItem('sb_witnessed_fatelands_wish_ritual'); } catch (_) {}
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const calls = [];
  await page.route('**/api/proxy', async (route) => {
    const body = route.request().postData() || '';
    if (body.length > 90000) {
      const resp = await route.fetch(); const text = await resp.text();
      let content = text; try { const j = JSON.parse(text); content = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || text; } catch (_) {}
      const kind = /Write the opening scene/.test(body) ? 'OPENING(introPrompt)' : (/TURN INSTRUCTIONS/.test(body) ? 'PER-TURN(fullSys)' : 'OTHER');
      calls.push({ reqLen: body.length, kind, resp: String(content) });
      console.error('  >> captured ' + kind + ' (req ' + body.length + 'c → resp ' + String(content).length + 'c)');
      // write immediately so nothing is lost
      fs.writeFileSync(DIR + '/scene1_' + calls.length + '_' + kind.replace(/[^A-Z]/g, '') + '.txt', String(content));
      await route.fulfill({ response: resp, body: text }); return;
    }
    await route.continue();
  });
  for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images', '**/api/grok-image', '**/api/visualize-flux'])
    await page.route(pat, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  page.on('console', m => { const t = m.text(); if (/BEGIN-ERR|TIER-ROUTE|opening scene/i.test(t)) console.error('  log>', t.slice(0, 110)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 40000 });
  await page.waitForTimeout(400); await setup(page);
  console.error('[opening] handleBeginStory…');
  await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
  { const t0 = Date.now(); while (Date.now() - t0 < 120000) { await page.waitForTimeout(3000); if (calls.length) break; const tc = await page.evaluate(() => window.state.turnCount || 0); if (tc >= 1) break; } }
  if (!calls.length) {
    console.error('[fallback] opening produced nothing — one submit to force scene 1…');
    await page.evaluate(() => { const setV=(id,v)=>{const el=document.getElementById(id); if(el){el.value=v; el.dispatchEvent(new Event('input',{bubbles:true}));}}; setV('actionInput','I take in where I am.'); setV('gnActionInput','I take in where I am.'); const b=document.getElementById('submitBtn'); if(b){b.disabled=false; b.click();} });
    { const t0 = Date.now(); while (Date.now() - t0 < 120000) { await page.waitForTimeout(3000); if (calls.length) break; } }
  }
  console.error('\nTOTAL captured: ' + calls.length + ' (' + calls.map(c=>c.kind+' '+c.resp.length+'c').join(' | ') + ')');
  await browser.close(); process.exit(0);
})();
