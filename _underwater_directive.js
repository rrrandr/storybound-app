// $0 headless check of the UNDERWATER SURVIVAL directive in the CG author user-prompt.
// Builds the prompt via window._buildCGScreenplayUserPrompt and asserts on the string.
// All paid endpoints blocked — no generation.
const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/deepseek-proxy**', '**/api/proxy**', '**/api/orchestrator**', '**/api/grok-image**', '**/api/visualize-flux**'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._buildCGScreenplayUserPrompt === 'function', { timeout: 40000 });

  const R = await page.evaluate(async () => {
    const out = [];
    const t = (name, fn) => { try { const [p, d] = fn(); out.push({ name, pass: !!p, detail: d || '' }); } catch (e) { out.push({ name, pass: false, detail: 'THREW ' + e.message }); } };
    const s = window.state;
    function baseSetup() {
      s.picks = { world: 'Fantasy', worldSubtype: 'the_inhuman', identity: { playerName: 'Mira', partnerName: 'Vael' }, tone: 'Charged', intensity: 'Steamy' };
      s.world = 'Fantasy'; s.gender = 'Female'; s.loveInterest = 'Male';
      s.tone = 'Charged'; s.storyLength = 'affair'; s.contentMode = 'explicit';
      s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
      s.pcName = 'Mira'; s.loveInterestName = 'Vael';
    }
    function build(sceneIndex) {
      let p = '';
      try { p = window._buildCGScreenplayUserPrompt(sceneIndex, '', '') || ''; }
      catch (e) { p = '__THREW__ ' + e.message; }
      return p;
    }

    // 1. Gloamwater + human PC + Kwisheen LI → directive fires, scene-1 wording + both exemplars.
    baseSetup(); s.fantasyRegion = 'gloamwater_bay'; s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen';
    const p1 = build(0);
    t('build did not throw (scene 1, gloamwater, human PC)', () => [p1.indexOf('__THREW__') === -1, p1.slice(0, 60)]);
    t('UNDERWATER SURVIVAL directive present', () => [/UNDERWATER SURVIVAL \(HARD/.test(p1), '']);
    t('scene-1 wording: "FIRST FEW SENTENCES"', () => [/FIRST FEW SENTENCES/.test(p1), '']);
    t('exemplar A present (sacrificed a year to breathe water)', () => [/sacrificed a YEAR of your life to breathe water/.test(p1), '']);
    t('exemplar B present (tear that talisman off)', () => [/tear that water-breathing talisman off your neck/.test(p1), '']);
    t('mentions BOTH mechanisms (wish-sacrifice + artifact)', () => [/WISH paid in sacrifice/.test(p1) && /MAGIC ARTIFACT/.test(p1), '']);

    // 2. Scene 2+ → softer wording (not "first few sentences").
    const p2 = build(2);
    t('scene 2+ uses continuation wording (not "FIRST FEW SENTENCES")', () => [/UNDERWATER SURVIVAL/.test(p2) && !/FIRST FEW SENTENCES/.test(p2) && /already established earlier in this story/.test(p2), '']);

    // 3. Gloamwater but BOTH characters Kwisheen → NO directive (no human underwater).
    baseSetup(); s.fantasyRegion = 'gloamwater_bay'; s._playerSpecies = 'Kwisheen'; s._liSpecies = 'Kwisheen';
    const p3 = build(0);
    t('NO directive when both PC and LI are Kwisheen', () => [p3.indexOf('__THREW__') === -1 && !/UNDERWATER SURVIVAL/.test(p3), '']);

    // 4. Human present but NON-underwater region (Veilwood) → NO directive.
    baseSetup(); s.fantasyRegion = 'the_veilwood'; s._playerSpecies = 'Human'; s._liSpecies = 'first_favored';
    const p4 = build(0);
    t('NO directive in a non-underwater region (Veilwood)', () => [p4.indexOf('__THREW__') === -1 && !/UNDERWATER SURVIVAL/.test(p4), '']);

    // 5. Gloamwater + human LI (PC Kwisheen) → still fires (a human is present).
    baseSetup(); s.fantasyRegion = 'gloamwater_bay'; s._playerSpecies = 'Kwisheen'; s._liSpecies = 'Human';
    const p5 = build(0);
    t('directive fires when the HUMAN is the LI (PC is Kwisheen)', () => [/UNDERWATER SURVIVAL/.test(p5), '']);

    return out;
  });

  await browser.close();
  let pass = 0, fail = 0;
  console.log('\n  UNDERWATER SURVIVAL DIRECTIVE  ($0)\n  ' + '─'.repeat(58));
  for (const r of R) { r.pass ? pass++ : fail++; console.log('  ' + (r.pass ? '✓' : '✗') + ' ' + r.name + (r.detail ? '  · ' + r.detail : '')); }
  console.log('  ' + '─'.repeat(58) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
