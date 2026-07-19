// Crop the two burst emblems from Roman's STANDALONE chart (wish-burst-yes-no-only.png) — each panel is the
// PURE canonical element (no hand, no scene), only a title + bullets to exclude. This follows the reusable rule:
// a reference image must contain ONLY the canonical element, never incidental composition. Replaces the
// canvas-synthesized emblems with these richer, on-model marks.
const { chromium } = require('playwright-core');
const fs = require('fs');
const SRC = 'data:image/png;base64,' + fs.readFileSync('/Users/romantsukerman/Desktop/Downloads/Storybound WebApp/Fatelands-Art/wish-burst-yes-no-only.png').toString('base64');
const DIR = '/Users/romantsukerman/storybound-app/public/assets/Fatelands/';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent('<img id=i src="' + SRC + '">');
  await p.waitForFunction(() => { const i = document.getElementById('i'); return i && i.complete && i.naturalWidth > 0; });
  const dims = await p.evaluate(() => ({ W: document.getElementById('i').naturalWidth, H: document.getElementById('i').naturalHeight }));
  const out = await p.evaluate(() => {
    const img = document.getElementById('i'), W = img.naturalWidth, H = img.naturalHeight;
    const crop = (x0, y0, x1, y1) => { const c = document.createElement('canvas'), cw = (x1 - x0) * W, ch = (y1 - y0) * H; c.width = cw; c.height = ch; c.getContext('2d').drawImage(img, x0 * W, y0 * H, cw, ch, 0, 0, cw, ch); return c.toDataURL('image/png'); };
    // exclude the top title (~y<0.10) and the divider + bullet list (~y>0.73). Left panel = clean, right = twisted.
    return { clean: crop(0.03, 0.10, 0.47, 0.73), twisted: crop(0.53, 0.10, 0.97, 0.73) };
  });
  fs.writeFileSync(DIR + 'Wish_Burst_Clean_v1.png', Buffer.from(out.clean.split(',')[1], 'base64'));
  fs.writeFileSync(DIR + 'Wish_Burst_Twisted_v1.png', Buffer.from(out.twisted.split(',')[1], 'base64'));
  console.log('source ' + dims.W + 'x' + dims.H + ' → cropped clean + twisted emblems (title/bullets excluded)');
  await b.close();
})();
