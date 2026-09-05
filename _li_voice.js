// LI VOICE ENGINE — does it CREATE a personality or just apply flavor? (Roman 2026-08-03)
// Same charged scene; vary ONLY the LI archetype's ACTUAL production voice directives
// (DIALOGUE_SPEECH_STYLES + SIGNATURES). Output = LI DIALOGUE ONLY. Blind test: can I ID the 4 archetypes
// from dialogue alone? If yes → LI engine works (worth mirroring for the PC). If no → speech-style subsystem
// is decorative flavor, not character, and the real need is COMPULSION-level, not speech-style.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/livoice';
fs.mkdirSync(DIR, { recursive: true });

// Same charged moment for all — forces the LI to REACT (where character shows), heavy on his dialogue.
const SCENE = 'Kaelen, this is the moment: Rowan has just admitted, to your face, that she befriended you only to get close to the thing you guard — she used you. She is standing right there, waiting for your reaction. The room is quiet.';
const TASK = 'Write ONLY Kaelen\'s spoken dialogue in response — 4 to 6 lines, each on its own line, in quotes. No narration, no stage directions, no names inside the lines, no description of him. Just what he SAYS. Let his archetype voice govern every line.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  // pull the ACTUAL production directives from the page (window-exposed or via a probe), else use text we read
  const dirs = await page.evaluate(() => {
    try {
      const styles = (typeof DIALOGUE_SPEECH_STYLES !== 'undefined') ? DIALOGUE_SPEECH_STYLES : (window.DIALOGUE_SPEECH_STYLES || null);
      const sigs = (typeof DIALOGUE_SPEECH_SIGNATURES !== 'undefined') ? DIALOGUE_SPEECH_SIGNATURES : (window.DIALOGUE_SPEECH_SIGNATURES || null);
      return { styles, sigs };
    } catch (e) { return { styles: null, sigs: null }; }
  });
  // fallback directives (read from source) if not exposed
  const FALLBACK = {
    OPEN_VEIN: 'emotionally transparent, impulsive; self-deprecating humor; burst sentences; frequent interruptions; metaphors from wounds, weather, falling',
    ARMORED_FOX: 'deflective wit, clipped delivery; evasive humor; short sentences; frequent interruptions; metaphors from armor, locks, doors, exits',
    DARK_VICE: 'playful menace, ironic humor; varied sentence length; power-aware phrasing; metaphors from violence, games, appetite',
    HEART_WARDEN: 'protective, direct, restrained emotion; dry warmth; sentences short-medium; low interruptions; metaphors from duty, protection, weather',
  };
  const styleFor = (a) => (dirs.styles && dirs.styles[a]) ? (dirs.styles[a] + (dirs.sigs && dirs.sigs[a] ? ' | signature: ' + JSON.stringify(dirs.sigs[a]) : '')) : FALLBACK[a];
  console.error('directives source: ' + (dirs.styles ? 'LIVE (window)' : 'fallback(read-from-source)'));

  for (const arch of ['OPEN_VEIN', 'ARMORED_FOX', 'DARK_VICE', 'HEART_WARDEN']) {
    const sys = 'You are writing the LOVE INTEREST, Kaelen, in a literary Fatelands romance. His archetype VOICE (obey it in every line): ' + styleFor(arch) + '\nWrite dialogue that only THIS man would say.';
    let out = null;
    for (let attempt = 0; attempt < 2 && !out; attempt++) {
      out = await page.evaluate(async ({ sys, scene, task }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: scene + '\n\n' + task }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 300 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''); return c.length > 20 ? c : null; } catch (e) { return null; }
      }, { sys, scene: SCENE, task: TASK });
      if (!out) await new Promise(r => setTimeout(r, 3000));
    }
    if (out) fs.writeFileSync(DIR + '/li_' + arch + '.txt', out);
    console.error('[' + arch + '] ' + (out ? '✓' : 'FAIL'));
    await new Promise(r => setTimeout(r, 3000));
  }
  console.error('DONE livoice'); await browser.close(); process.exit(0);
})();
