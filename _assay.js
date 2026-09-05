// CHARACTER ASSAY (Roman 2026-08-03). Freeze EVERYTHING but the protagonist. Neutral micro-situation
// (a bakery — no crisis/lore/romance/NPC-plot). Feed ONLY the mask-generated PC bible + the situation.
// Capture first thought / first line / first action. Blind test: can I ID the mask from 4 anon responses?
// Tests the ONE remaining question: does the (confirmed-differentiated) bible reach the PROSE protagonist?
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/assay';
fs.mkdirSync(DIR, { recursive: true });
const MASKS = ['OPEN_VEIN', 'ARMORED_FOX', 'HEART_WARDEN', 'DARK_VICE'];

const SITUATION = 'You step into the village bakery out of the morning cold to buy bread. The baker glances up from the counter and says, "Morning. What can I get you?"';
const TASK = 'Write, in first person present tense: your FIRST THOUGHT, your FIRST spoken line, and your FIRST action. 3-5 sentences total. No backstory, no crisis, no other people, no lore. Let the character bible govern what you NOTICE, ASSUME, WANT, RISK, and REFUSE — not just surface mannerisms.';

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
  const results = [];
  for (const mask of MASKS) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images', '**/api/grok-image', '**/api/visualize-flux'])
      await page.route(pat, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    let bible = null, prose = null;
    try {
      await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 40000 });
      await page.waitForTimeout(300); await setup(page, mask);
      await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) {} });
      { const t0 = Date.now(); while (Date.now() - t0 < 90000) { await page.waitForTimeout(3000); const has = await page.evaluate(() => !!window.state.pcBodyBible); if (has) break; } }
      bible = await page.evaluate(() => window.state.pcBodyBible || null);
      if (bible) {
        // strip physical-appearance keys so the model can't just re-describe looks — force BEHAVIOR
        const brief = {}; for (const k of Object.keys(bible)) if (!/height|build|hair|complexion|face|visual_anchor|feature|eyes/i.test(k)) brief[k] = bible[k];
        const sys = 'You ARE Rowan. Embody this character bible completely — let it govern what you notice, assume, want, risk, and refuse.\n\nCHARACTER BIBLE:\n' + JSON.stringify(brief, null, 1) + '\n\nWrite literary first-person present-tense prose.';
        prose = await page.evaluate(async ({ sys, situation, task }) => {
          try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: situation + '\n\n' + task }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.8, max_tokens: 400 }) }); const j = await r.json(); return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''); } catch (e) { return 'ERR ' + e.message; }
        }, { sys, situation: SITUATION, task: TASK });
      }
    } catch (e) {}
    if (bible) fs.writeFileSync(DIR + '/bible_' + mask + '.json', JSON.stringify(bible, null, 2));
    if (prose) fs.writeFileSync(DIR + '/assay_' + mask + '.txt', prose);
    results.push({ mask, wound: bible && bible.wound && (bible.wound.category || bible.wound.core || '').toString().slice(0, 50), ok: !!prose });
    console.error('[' + mask + '] ' + (prose ? 'assay ✓ (' + prose.length + 'c)' : 'FAIL'));
    await ctx.close(); await new Promise(r => setTimeout(r, 4000));
  }
  fs.writeFileSync(DIR + '/summary.json', JSON.stringify(results, null, 2));
  console.error('DONE assay'); await browser.close(); process.exit(0);
})();
