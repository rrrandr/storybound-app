// COMPOSITION REFERENCE — underwater buoyancy (Roman 2026-07-19). The strengthened text directive still lost
// to the ground-plane prior in ~half the panels; this is the show-don't-tell lever (same pattern as the other
// composition refs). An abstract VALUE/NOTAN thumbnail: figures SUSPENDED in mid-water at DIFFERENT heights,
// tilted OFF-VERTICAL, with open water on ALL sides — NO seabed floor, NO horizon. Deterministic.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/Users/romantsukerman/storybound-app/public/assets/Fatelands/';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent('<canvas id=c width=640 height=640></canvas>');
  const out = await p.evaluate(() => {
    const c = document.getElementById('c'), g = c.getContext('2d'), W = 640, H = 640;
    // deep-water gradient: lighter near the surface (top), darker with depth (bottom) — NO floor line
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#2e5a66'); grd.addColorStop(0.5, '#1c3d47'); grd.addColorStop(1, '#0e242b');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    // refracted light shafts from the surface (diagonal, translucent)
    g.save(); g.globalAlpha = 0.10; g.fillStyle = '#bfe6ee';
    [[120, -60], [300, -40], [470, -70]].forEach(function (s) { g.beginPath(); g.moveTo(s[0], 0); g.lineTo(s[0] + 70, 0); g.lineTo(s[1] + 260, H); g.lineTo(s[1] + 180, H); g.closePath(); g.fill(); });
    g.restore();
    // rising bubble columns
    g.fillStyle = 'rgba(200,230,238,0.5)';
    [[180, 20], [360, 12], [500, 16]].forEach(function (col) { for (let y = H - 20; y > 40; y -= 46) { const r = 2 + ((y + col[0]) % 5); g.beginPath(); g.arc(col[0] + Math.sin(y / 40) * col[1], y, r, 0, Math.PI * 2); g.fill(); } });
    // a SUSPENDED figure: head + tapering torso, TILTED off-vertical, limbs/tentacles trailing loosely
    const floatFigure = function (cx, cy, h, tiltDeg, tone) {
      g.save(); g.translate(cx, cy); g.rotate(tiltDeg * Math.PI / 180); g.fillStyle = tone;
      g.beginPath(); g.arc(0, -h * 0.42, h * 0.15, 0, Math.PI * 2); g.fill();                 // head
      g.beginPath(); g.moveTo(-h * 0.16, -h * 0.28); g.lineTo(h * 0.16, -h * 0.28); g.lineTo(h * 0.10, h * 0.15); g.lineTo(-h * 0.10, h * 0.15); g.closePath(); g.fill(); // torso
      // trailing limbs/tentacles curling downward (drifting, not planted)
      g.strokeStyle = tone; g.lineWidth = h * 0.05; g.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * h * 0.05, h * 0.13); g.quadraticCurveTo(i * h * 0.12, h * 0.34, i * h * 0.05 + Math.sin(i) * h * 0.1, h * 0.5); g.stroke(); }
      // arms out (weightless)
      g.lineWidth = h * 0.045; g.beginPath(); g.moveTo(-h * 0.14, -h * 0.2); g.lineTo(-h * 0.34, -h * 0.05); g.moveTo(h * 0.14, -h * 0.2); g.lineTo(h * 0.32, -h * 0.12); g.stroke();
      g.restore();
    };
    // TWO figures at DIFFERENT heights, DIFFERENT tilts — both clearly OFF the bottom (open water below)
    floatFigure(W * 0.34, H * 0.34, H * 0.30, -18, '#0c1c22');   // upper-left, tilted back
    floatFigure(W * 0.66, H * 0.56, H * 0.26, 14, '#0a181d');    // lower-right, tilted forward, lower in frame
    return c.toDataURL('image/png');
  });
  fs.writeFileSync(DIR + 'Comp_Underwater_Float_v1.png', Buffer.from(out.split(',')[1], 'base64'));
  console.log('authored Comp_Underwater_Float_v1.png (suspended figures, no floor)');
  await b.close();
})();
