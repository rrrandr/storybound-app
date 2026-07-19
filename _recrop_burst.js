// Re-crop the burst emblems TIGHTER — the pure symbol (upper burst region), excluding the character/pose,
// so it conditions as a STYLE reference (draw THIS mark) not a SCENE reference (recreate this picture).
const { chromium } = require('playwright-core');
const fs = require('fs');
const SRC = 'data:image/png;base64,' + fs.readFileSync('/Users/romantsukerman/storybound-app/public/assets/Fatelands/Wish_Burst_Ref_v1.png').toString('base64');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent('<img id=i src="' + SRC + '">');
  await p.waitForFunction(() => { const i = document.getElementById('i'); return i && i.complete && i.naturalWidth > 0; });
  const out = await p.evaluate(() => {
    const img = document.getElementById('i'), W = img.naturalWidth, H = img.naturalHeight;
    const crop = (x0, y0, x1, y1) => { const c = document.createElement('canvas'), cw = (x1 - x0) * W, ch = (y1 - y0) * H; c.width = cw; c.height = ch; c.getContext('2d').drawImage(img, x0 * W, y0 * H, cw, ch, 0, 0, cw, ch); return c.toDataURL('image/png'); };
    // top-left panel: burst radiates upper-center-right from the raised hand; character body is lower-left.
    // Crop the UPPER-RIGHT of that panel = the burst mark, minimal character.
    return { clean: crop(0.14, 0.055, 0.345, 0.30), twisted: crop(0.14, 0.505, 0.345, 0.75) };
  });
  fs.writeFileSync('/Users/romantsukerman/storybound-app/public/assets/Fatelands/Wish_Burst_Clean_v1.png', Buffer.from(out.clean.split(',')[1], 'base64'));
  fs.writeFileSync('/Users/romantsukerman/storybound-app/public/assets/Fatelands/Wish_Burst_Twisted_v1.png', Buffer.from(out.twisted.split(',')[1], 'base64'));
  console.log('re-cropped clean + twisted (tighter, emblem-focused)');
  await b.close();
})();
