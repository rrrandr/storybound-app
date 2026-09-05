// DELTA DEBUG (Roman 2026-08-02) — find the FIRST artifact where the opening geometry is already fixed.
// Same seed × N. Per run capture the PLAN artifacts (crisis, aPlot scene-1 compressed, scene mission,
// reader-state) BEFORE the prose, then the prose. Compare across runs: at which layer has "hostile
// authority confronts protagonist" already converged? That layer is the attractor's origin.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/delta';
fs.mkdirSync(DIR, { recursive: true });
const N = 5;
const ACTION = 'I look around and take stock of where I am.';

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
    try { localStorage.removeItem('sb_witnessed_fatelands_wish_ritual'); } catch (_) {}
  });
}

const grabPlan = (page) => page.evaluate(() => {
  const s = window.state || {}; const a = s.aPlot || {};
  const c = a.scene1Compressed || {};
  return {
    currentCrisis: s.currentCrisis || null,
    aPlot_title: a.title || a.workingTitle || null,
    aPlot_antagonist: a.antagonist || a.villain || a.antagonistName || null,
    aPlot_pressure: a.pressure || a.centralPressure || null,
    aPlot_crisis: a.crisis || a.namedCrisis || null,
    scene1_state_change: c.state_change || null,
    scene1_precondition: c.state_change_precondition || null,
    scene1_forces_choice: c.forces_choice || null,
    scene1_setting: c.setting || (a.sceneOne && a.sceneOne.setting) || null,
    scene1_present: (a.sceneOne && a.sceneOne.present) || null,
    scene1Mission: s._scene1Mission || null,
    scene1ReaderState: s._scene1ReaderState || null,
    openingShape: s._scene1HookShapePick || (s._openingAxesSelector && s._openingAxesSelector.shape) || null,
    openingTemp: s._openingTemperature || null,
    pressureAxis: s._bespokeScene1Axis || s._scene1PressureAxis || null,
  };
});

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const runs = [];
  for (let i = 1; i <= N; i++) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    let prose = null;
    await page.route('**/api/proxy', async (route) => {
      const body = route.request().postData() || '';
      if (!prose && body.length > 90000 && (/Write the opening scene/.test(body) || /TURN INSTRUCTIONS/.test(body))) {
        const resp = await route.fetch(); const text = await resp.text();
        let content = text; try { const j = JSON.parse(text); content = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || text; } catch (_) {}
        prose = String(content); await route.fulfill({ response: resp, body: text }); return;
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
      // wait for the aPlot / plan to be built (world setup + opening planner), before the prose
      { const t0 = Date.now(); while (Date.now() - t0 < 70000) { await page.waitForTimeout(3000); const ready = await page.evaluate(() => !!(window.state.aPlot || window.state._scene1Mission || (window.state.sysPrompt && window.state.sysPrompt.length > 5000))); if (ready && Date.now() - t0 > 20000) break; if (prose) break; } }
      const plan = await grabPlan(page);
      if (!prose) await page.evaluate((act) => { const setV=(id,v)=>{const el=document.getElementById(id); if(el){el.value=v; el.dispatchEvent(new Event('input',{bubbles:true}));}}; setV('actionInput',act); setV('gnActionInput',act); const b=document.getElementById('submitBtn'); if(b){b.disabled=false; b.click();} }, ACTION);
      { const t0 = Date.now(); while (Date.now() - t0 < 120000) { await page.waitForTimeout(3000); if (prose) break; } }
      const planAfter = await grabPlan(page);
      runs.push({ i, plan, planAfter, prose: prose ? prose.slice(0, 500) : null });
      console.error('[run ' + i + '] crisis=' + JSON.stringify(plan.currentCrisis || plan.aPlot_crisis || '?').slice(0, 60) + ' | mission=' + JSON.stringify((planAfter.scene1Mission || plan.scene1Mission || '?')).slice(0, 70));
    } catch (e) { console.error('[run ' + i + '] ERR ' + e.message); runs.push({ i, err: e.message }); }
    await ctx.close();
  }
  fs.writeFileSync(DIR + '/delta.json', JSON.stringify(runs, null, 2));
  console.error('\nDONE delta → ' + DIR + '/delta.json');
  await browser.close(); process.exit(0);
})();
