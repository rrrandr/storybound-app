// SLICE 1b — validate the CAST-SPLASH architecture: ONE 4K 2x2 where each quadrant is a cover-quality
// character-intro splash CARD of a DIFFERENT main player, then auto-split into four anchor crops.
// Tests: (1) reader-facing splash quality, (2) four CLEAN identities (no cross-pollination), (3) each
// quadrant good enough to be that character's casting anchor. Kael/Threxa/Orun carry refs; Julian is
// description-only (2 First Favored men = the hardest bleed test). One 4K render (~$0.15).
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad';
const b64 = p => fs.readFileSync(p).toString('base64');

const refs = [
  { b64: b64(OUT + '/dashscope_compare/refs2/style_hi.jpg'), label: 'STYLE — Ryo Toro linework/rendering (style only, NOT a character)' },
  { b64: b64(OUT + '/kael_solo.jpg'), label: 'KAEL REFERENCE (top-left quadrant) — male First Favored, SILVER-white hair, translucent mesh Veilweave' },
  { b64: b64(OUT + '/threxa_solo.jpg'), label: 'THREXA REFERENCE (bottom-left quadrant) — female Kwisheen, TEAL-VIOLET coral dreads, tide-trident' },
  { b64: b64(OUT + '/orun_solo.jpg'), label: 'ORUN REFERENCE (bottom-right quadrant) — male Kwisheen, ICE-CYAN coral dreads' },
  { b64: b64('/Users/romantsukerman/storybound-app/public/assets/Fatelands/The_Answer_Anchor_v1.jpg'), label: 'THE ANSWER — weapon shape (double question-mark hooks) for Kael' }
];

const PROMPT = [
'STYLE: Ryo Toro — a richly detailed, high-detail colour comic illustration; confident ink linework, layered shading, dramatic lighting. Match the STYLE reference. NOT a photo, NOT 3D.',
'COMPOSITION: ONE SQUARE image = a 2x2 grid of four equal quadrants with thin gutters (top-left, top-right, bottom-left, bottom-right). Each quadrant is a SEPARATE full-body CHARACTER-INTRODUCTION SPLASH CARD of a DIFFERENT individual — like a fighting-game character-select screen or a comic cast page. NO lettering, nameplates, captions, speech balloons or text anywhere.',
'COVER-QUALITY, NOT PORTRAITS: every character is mid-ACTION, emotionally charged, ASYMMETRICAL and immediately memorable — NEVER centered, static, or standing to attention looking at camera. Each shows a SIGNATURE pose, SIGNATURE weapon, canonical costume and a SIGNATURE expression (7+/10 intensity). Background is a plain or minimal evocative wash, kept fully subordinate — no clutter.',
'FOUR DISTINCT INDIVIDUALS — do NOT blend faces, hair, skin, colours or weapons across quadrants. Each character keeps ONLY their own palette and weapon. In particular: Kael and Julian are BOTH First Favored but DIFFERENT men (Kael SILVER-haired, armed, fierce; Julian DARK-AUBURN-haired, unarmed, haunted). Threxa and Orun are BOTH Kwisheen but DIFFERENT (Threxa female, TEAL-VIOLET dreads; Orun male, ICE-CYAN dreads). Never swap their hair colours, faces or weapons between quadrants.',
'TOP-LEFT — KAEL (protagonist): a MALE First Favored, SILVER-white hair, athletic; wears the glowing white open MESH VEILWEAVE (a visible net weave, NUDE beneath, opaque across the hips fading to sheer), refracted into ~6 overlapping semi-transparent afterimages; WIELDS THE ANSWER (polearm with a DEEP question-mark HOOK at each end — match the weapon reference; never a trident/spear/sword). A driving, fierce attacking lunge. Match the KAEL reference.',
'TOP-RIGHT — JULIAN: a MALE First Favored, the one who made the forbidden wish — DARK AUBURN hair (NOT silver), a haunted, guilt-worn bearing; the Veilweave hangs loose and dim about him; UNARMED, empty hands half-raised as if in apology or warding. Grief and dread on his face. A DIFFERENT man from Kael.',
'BOTTOM-LEFT — THREXA (antagonist): a FEMALE Kwisheen — smooth burnt-orange papillae skin (never scales), coral-dreadlocks in deep TEAL-VIOLET, a coral-and-shell harness, ~6 boneless waist tentacles LONGER than her legs and coiling; wields a tide-TRIDENT. Snarling, mid-strike. Match the THREXA reference.',
'BOTTOM-RIGHT — ORUN: a MALE Kwisheen — smooth burnt-orange/red papillae skin, coral-dreadlocks in ICE-CYAN, a coral-and-shell harness, ~6 boneless waist tentacles LONGER than his legs and lashing; a hooked polearm. Aggressive, coiled to spring. Match the ORUN reference.',
'EMOTION: every face high-intensity, fitting the character — never blank or calm. AVOID: any text/lettering/nameplates; a photo look; blending any two characters; Kael or Julian losing the Veilweave; the two First Favored looking like the same man; the two Kwisheen sharing a dread colour; The Answer rendered as a plain trident/spear.'
].join('\n\n');

(async () => {
  const br = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await br.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
  p.on('pageerror', e => console.error('  PAGEERR ' + String(e).slice(0, 160)));
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => typeof window._splitSheetQuadrants === 'function', { timeout: 40000 });
  console.error('payload refs=' + refs.length + ' promptChars=' + PROMPT.length);

  const out = await p.evaluate(async (args) => {
    const { prompt, refs } = args;
    let err = '', sheetUrl = '', quads = null;
    try {
      const r = await fetch('/api/image', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider: 'gemini', model: 'gemini-3.1-flash-image-preview',
          imageSize: '4K', aspect_ratio: '1:1', imageIntent: 'scene', textFirst: true, n: 1, reference_images_b64: refs }) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json(); const u = d.image || d.url;
      if (!u) throw new Error('no image');
      sheetUrl = u.indexOf('data:') === 0 ? u : 'data:image/png;base64,' + u;
      quads = await window._splitSheetQuadrants(sheetUrl);
    } catch (e) { err = e.message; }
    return { sheetUrl, quads, err };
  }, { prompt: PROMPT, refs });

  console.error('=== err=' + (out.err || 'none') + ' quads=' + (out.quads ? out.quads.length : 0) + ' ===');
  if (out.sheetUrl && out.sheetUrl.indexOf('data:') === 0)
    fs.writeFileSync(OUT + '/cast_splash.png', Buffer.from(out.sheetUrl.split(',')[1], 'base64'));
  if (out.quads) out.quads.forEach((q, i) => { if (q && q.indexOf('data:') === 0) fs.writeFileSync(OUT + '/cast_q' + (i + 1) + '.png', Buffer.from(q.split(',')[1], 'base64')); });
  console.error(out.sheetUrl ? 'SAVED cast_splash.png + ' + (out.quads ? out.quads.length : 0) + ' quads' : 'NO SHEET');
  await br.close();
})().catch(e => { console.error('HARNESS ERROR: ' + e.message); process.exit(2); });
