// CHARACTER ASSAY v2 (Roman 2026-08-03) — the RIGHT bar. Same HOT CRISIS, 4 masks. Pressure REVEALS
// character. Force VOICE + a CONSEQUENTIAL DECISION; FORBID narrated psychology (no "I refuse to need").
// Blind test: from first thought / first spoken line / first decision ALONE (names+desc stripped), can an
// experienced reader ID the archetype? If not, Character+ hasn't reached "being a personality" (only "having one").
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/assay2';
fs.mkdirSync(DIR, { recursive: true });
const MASKS = ['OPEN_VEIN', 'ARMORED_FOX', 'HEART_WARDEN', 'DARK_VICE'];

// A hot crisis that demands cognition + a decision, universal enough to reveal character (not Fatelands machinery).
const CRISIS = 'The rope-and-root bridge you are crossing lurches and splits. Ten feet ahead, a woman and her small child are thrown against the fraying planks and start to slide toward the gap. People scream. The planks under your own feet are going. You have one heartbeat.';
const TASK = 'Write, first person present tense, TERSE:\n1) FIRST THOUGHT — one line.\n2) FIRST SPOKEN LINE — actual dialogue in quotes.\n3) FIRST CONSEQUENTIAL DECISION — what she DOES.\nHARD RULES: Reveal character ONLY through what she thinks, says, and does. Do NOT narrate or name her feelings/psychology (forbidden: "I refuse to need", "the ache I carry", "meaning-hungry"). Her spoken line and her decision must be things ONLY this specific person would say/do — a different person in this exact crisis would react differently. No description of her body or looks.';

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
        const brief = {}; for (const k of Object.keys(bible)) if (!/height|build|hair|complexion|face|visual_anchor|feature|eyes|current_crisis/i.test(k)) brief[k] = bible[k];
        const sys = 'You ARE Rowan. This bible governs her COGNITION — what she assumes, prioritizes, finds funny, lies about, and decides by default — not just how she is described.\n\nCHARACTER BIBLE:\n' + JSON.stringify(brief, null, 1);
        prose = await page.evaluate(async ({ sys, crisis, task }) => {
          try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: crisis + '\n\n' + task }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 320 }) }); const j = await r.json(); return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''); } catch (e) { return 'ERR ' + e.message; }
        }, { sys, crisis: CRISIS, task: TASK });
      }
    } catch (e) {}
    if (prose) fs.writeFileSync(DIR + '/assay2_' + mask + '.txt', prose);
    results.push({ mask, ok: !!prose });
    console.error('[' + mask + '] ' + (prose ? 'assay2 ✓' : 'FAIL'));
    await ctx.close(); await new Promise(r => setTimeout(r, 4000));
  }
  console.error('DONE assay2'); await browser.close(); process.exit(0);
})();
