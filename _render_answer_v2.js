// Regenerate the canonical Answer weapon anchor so the two hooks point in OPPOSITE directions
// (left hook curls UP, right hook curls DOWN — 180° point-symmetric S-shape), keeping the rest of the
// design identical to v1 (attached as a reference). One orthographic weapon concept-sheet render.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad';
const v1b64 = fs.readFileSync('/Users/romantsukerman/storybound-app/public/assets/Fatelands/The_Answer_Anchor_v1.jpg').toString('base64');

const PROMPT = [
'A clean ORTHOGRAPHIC WEAPON CONCEPT SHEET — the weapon ALONE, centred, horizontal, on a plain off-white background. No character, no hands, no text, no watermark. Confident clean line-art with light silver-steel shading, matching the reference image\'s rendering style.',
'THE ANSWER — a double-ended POLEARM on a long weighted metal shaft (banded grip at centre). At EACH end a DEEP QUESTION-MARK HOOK: the outer edge a smooth curved BLADE, the inner curve SERRATED with fine saw-teeth. Match the reference weapon EXACTLY — same shaft, same blade profile, same serration, same hook size.',
'THE ONE CHANGE from the reference: the two hooks now point in OPPOSITE directions (180° point-symmetric, an overall S-shape) — the LEFT hook curls UPWARD (opening up) and the RIGHT hook curls DOWNWARD (opening down). They must NOT both curl the same way; each hook is the other rotated 180°.',
'It stays unmistakably ONE weapon — a double question-mark-hook polearm; NEVER a trident, spear, axe, scythe or plain sword.'
].join('\n\n');

(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  p.on('pageerror', e => console.error('  PAGEERR ' + String(e).slice(0, 160)));
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => true, { timeout: 20000 });
  const out = await p.evaluate(async (args) => {
    const { prompt, ref } = args;
    let err = '', url = '';
    try {
      const r = await fetch('/api/image', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider: 'gemini', model: 'gemini-3.1-flash-image-preview',
          imageSize: '2K', aspect_ratio: '1:1', imageIntent: 'scene', textFirst: true, n: 1,
          reference_images_b64: [{ b64: ref, label: 'THE ANSWER v1 — match this weapon\'s shaft, blade and serration EXACTLY; change ONLY the hook directions (make them oppose)' }] }) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json(); const u = d.image || d.url;
      if (!u) throw new Error('no image');
      url = u.indexOf('data:') === 0 ? u : 'data:image/png;base64,' + u;
    } catch (e) { err = e.message; }
    return { url, err };
  }, { prompt: PROMPT, ref: v1b64 });
  console.error('=== err=' + (out.err || 'none') + ' ===');
  if (out.url && out.url.indexOf('data:') === 0) { fs.writeFileSync(OUT + '/answer_v2.png', Buffer.from(out.url.split(',')[1], 'base64')); console.error('SAVED answer_v2.png'); }
  else console.error('NO IMAGE');
  await b.close();
})().catch(e => { console.error('HARNESS ERROR: ' + e.message); process.exit(2); });
