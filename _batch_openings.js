// BATCH OF DIVERSE OPENINGS (product-validation, Roman 2026-08-02). Confidence not anecdote.
// 10 configs spanning region × PC/LI species × Character+ archetype. Each: real setup + Scene 1.
// Captures the opening author prose per config. Score blind afterward against the product objectives.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/batch';
fs.mkdirSync(DIR, { recursive: true });

// region via ancestry alias (identityLock:false → species stays controlled by picks.pcSpecies)
const C = [
  { id: '01_thornwild_humanPC_wilderLI_darkvice',   region: 'darkwood',      pc: 'Human',         li: 'Wilder',        arch: 'DARK_VICE',      dyn: 'enemies_to_lovers' },
  { id: '02_thornwild_wilderPC_favoredLI_heartward', region: 'darkwood',      pc: 'Wilder',        li: 'First Favored', arch: 'HEART_WARDEN',   dyn: 'forbidden_love' },
  { id: '03_veilwood_favoredPC_favoredLI_spellbind',  region: 'fae forest',    pc: 'First Favored', li: 'First Favored', arch: 'SPELLBINDER',    dyn: 'slow_burn' },
  { id: '04_veilwood_humanPC_favoredLI_eternalflame', region: 'fae forest',    pc: 'Human',         li: 'First Favored', arch: 'ETERNAL_FLAME',  dyn: 'enemies_to_lovers' },
  { id: '05_fatesfavor_humanPC_humanLI_armoredfox',   region: 'desert world',  pc: 'Human',         li: 'Human',         arch: 'ARMORED_FOX',    dyn: 'enemies_to_lovers' },
  { id: '06_fatesfavor_favoredPC_wilderLI_beautruin', region: 'desert world',  pc: 'First Favored', li: 'Wilder',        arch: 'BEAUTIFUL_RUIN', dyn: 'forbidden_love' },
  { id: '07_gloamwater_kwisheenPC_humanLI_openvein',  region: 'sea kingdom',   pc: 'Kwisheen',      li: 'Human',         arch: 'OPEN_VEIN',      dyn: 'slow_burn' },
  { id: '08_gloamwater_humanPC_kwisheenLI_darkvice',  region: 'sea kingdom',   pc: 'Human',         li: 'Kwisheen',      arch: 'DARK_VICE',      dyn: 'enemies_to_lovers' },
  { id: '09_lytharyn_humanPC_favoredLI_spellbind',    region: 'magic academy', pc: 'Human',         li: 'First Favored', arch: 'SPELLBINDER',    dyn: 'rivals_to_lovers' },
  { id: '10_vaelryn_humanPC_humanLI_armoredfox',      region: 'royal court',   pc: 'Human',         li: 'Human',         arch: 'ARMORED_FOX',    dyn: 'forbidden_love' },
];

function setup(page, cfg) {
  return page.evaluate((cfg) => {
    const s = window.state; window._devBypass = true; window._forceAudits = false;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = 'Fantasy'; s.world = 'Fantasy'; s.picks.flavor = 'the_inhuman'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman';
    s._cachedAncestryPlayer = { normalized: cfg.region, raw: cfg.region }; s._fantasyRegionOverrideApplied = false;
    s.picks.pcSpecies = cfg.pc; s.picks.liSpecies = cfg.li;
    s.picks.dynamic = cfg.dyn; s.dynamic = cfg.dyn;
    s.loveInterest = 'Male'; s.loveInterestName = 'Kaelen'; s.liGender = 'male';
    s.archetype = { primary: cfg.arch, modifier: null, bound: false };
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy';
    s.name = 'Rowan'; s.playerName = 'Rowan'; s.partnerName = 'Kaelen';
    s.identity = { playerName: 'Rowan', partnerName: 'Kaelen', displayPlayerName: 'Rowan', displayPartnerName: 'Kaelen' };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    try { localStorage.removeItem('sb_witnessed_fatelands_wish_ritual'); } catch (_) {}
  }, cfg);
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const summary = [];
  for (const cfg of C) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    let captured = null;
    await page.route('**/api/proxy', async (route) => {
      const body = route.request().postData() || '';
      if (!captured && body.length > 90000 && (/Write the opening scene/.test(body) || /TURN INSTRUCTIONS/.test(body))) {
        const resp = await route.fetch(); const text = await resp.text();
        let content = text; try { const j = JSON.parse(text); content = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || text; } catch (_) {}
        captured = String(content);
        await route.fulfill({ response: resp, body: text }); return;
      }
      await route.continue();
    });
    for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images', '**/api/grok-image', '**/api/visualize-flux'])
      await page.route(pat, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    try {
      await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 40000 });
      await page.waitForTimeout(300); await setup(page, cfg);
      await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) {} });
      // wait for setup to settle, then submit to force scene 1
      { const t0 = Date.now(); while (Date.now() - t0 < 70000) { await page.waitForTimeout(3000); if (captured) break; const ready = await page.evaluate(() => !!(window.state.sysPrompt && window.state.sysPrompt.length > 5000) && !(window.state._isAdvancingScene)); if (ready && Date.now() - t0 > 20000) break; } }
      if (!captured) { await page.evaluate(() => { const setV=(id,v)=>{const el=document.getElementById(id); if(el){el.value=v; el.dispatchEvent(new Event('input',{bubbles:true}));}}; setV('actionInput','I take in where I am.'); setV('gnActionInput','I take in where I am.'); const b=document.getElementById('submitBtn'); if(b){b.disabled=false; b.click();} }); }
      { const t0 = Date.now(); while (Date.now() - t0 < 120000) { await page.waitForTimeout(3000); if (captured) break; } }
    } catch (e) { console.error('  [' + cfg.id + '] ERR ' + e.message); }
    const region = await page.evaluate(() => window.state.fantasyRegion || '?').catch(() => '?');
    const pc = await page.evaluate(() => window.state._playerSpecies || '?').catch(() => '?');
    if (captured) fs.writeFileSync(DIR + '/' + cfg.id + '.txt', captured);
    const wc = captured ? captured.split(/\s+/).filter(Boolean).length : 0;
    summary.push({ id: cfg.id, region, pcResolved: pc, words: wc, ok: !!captured });
    console.error('[' + cfg.id + '] region=' + region + ' pc=' + pc + ' → ' + (captured ? wc + 'w ✓' : 'FAILED ✗'));
    await ctx.close();
  }
  fs.writeFileSync(DIR + '/summary.json', JSON.stringify(summary, null, 2));
  console.error('\nDONE. ' + summary.filter(s => s.ok).length + '/' + summary.length + ' captured → ' + DIR);
  await browser.close(); process.exit(0);
})();
