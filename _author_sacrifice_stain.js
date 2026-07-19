// Re-author the sacrifice reference as a soft palm-shaped shadow STAIN (Roman 2026-07-18) — an occlusion /
// absence, NOT a hand/arm reaching in. Technique: render a raised-palm glyph, fill it dark, BLUR it heavily
// into a stain, and place it high so the wrist is cropped off-frame (no arm). Reads as a palm pressed there
// and lifting away, draining the spot to grey. Deterministic.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/Users/romantsukerman/storybound-app/public/assets/Fatelands/';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent('<canvas id=c width=512 height=512></canvas><canvas id=g width=512 height=512></canvas>');
  const out = await p.evaluate(() => {
    const W = 512;
    // 1) glyph silhouette on the scratch canvas: a raised palm, filled dark
    const gc = document.getElementById('g'), gg = gc.getContext('2d');
    gg.clearRect(0, 0, W, W);
    gg.font = '340px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    gg.textAlign = 'center'; gg.textBaseline = 'middle';
    gg.fillText('🖐', W / 2, W / 2 + 30);           // pushed down so the wrist runs off the bottom edge
    gg.globalCompositeOperation = 'source-atop';    // recolor the glyph to a flat dark shadow
    gg.fillStyle = '#141418'; gg.fillRect(0, 0, W, W);

    // 2) main canvas: neutral grey ground; composite the palm BLURRED + semi-transparent = a stain
    const c = document.getElementById('c'), g = c.getContext('2d');
    g.fillStyle = '#8f8f92'; g.fillRect(0, 0, W, W);
    g.save();
    g.filter = 'blur(15px)';
    g.globalAlpha = 0.6;
    g.drawImage(gc, 0, -40);                         // lift so only palm+fingers show, wrist cropped
    g.filter = 'blur(7px)'; g.globalAlpha = 0.4;
    g.drawImage(gc, 0, -40);                         // a second, tighter pass deepens the core
    g.restore();
    // 3) faint pale drain-bloom at the palm centre (colour lifting to grey)
    const pg = g.createRadialGradient(W / 2, 250, 2, W / 2, 250, 46);
    pg.addColorStop(0, 'rgba(205,205,210,0.28)'); pg.addColorStop(1, 'rgba(205,205,210,0)');
    g.fillStyle = pg; g.beginPath(); g.arc(W / 2, 250, 46, 0, Math.PI * 2); g.fill();
    return c.toDataURL('image/png');
  });
  fs.writeFileSync(DIR + 'Sacrifice_Hand_Ref_v1.png', Buffer.from(out.split(',')[1], 'base64'));
  console.log('re-authored Sacrifice_Hand_Ref_v1.png (blurred palm stain, wrist cropped)');
  await b.close();
})();
