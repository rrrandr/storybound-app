// COMPOSITION REFERENCES (Roman 2026-07-18) — the renderer has a hard learned prior ("comic = medium
// two-shot of two faces") that TEXT cannot override (proven across regens: shot-director text, establishing
// text, event-dominance text all lost to it). So give it the framing the same way species/burst are given:
// as REFERENCE IMAGES. These are abstract VALUE/NOTAN thumbnails — tonal masses only, no renderable content —
// so they steer FRAMING (where the mass sits, how big the subject is) without bleeding any scene. Deterministic.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/Users/romantsukerman/storybound-app/public/assets/Fatelands/';

(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent('<canvas id=c width=640 height=640></canvas>');
  const draws = await p.evaluate(() => {
    const C = document.getElementById('c'), g = C.getContext('2d'), W = 640, H = 640;
    const clear = () => { g.clearRect(0, 0, W, H); };
    const figure = (x, y, h, tone) => { // simple standing silhouette: head + tapering body
      g.fillStyle = tone; const hw = h * 0.16;
      g.beginPath(); g.arc(x, y - h * 0.86, h * 0.14, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(x - hw, y); g.lineTo(x - hw * 0.7, y - h * 0.7); g.lineTo(x + hw * 0.7, y - h * 0.7); g.lineTo(x + hw, y); g.closePath(); g.fill();
    };
    const out = {};

    // 1) ESTABLISHING / SOLO — one figure, SMALL and OFF-CENTER, dwarfed by empty environment. Kills the two-shot.
    clear();
    let grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#3a4048'); grd.addColorStop(1, '#20242a');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.fillStyle = '#171a1e'; g.fillRect(0, H * 0.78, W, H * 0.22);         // ground plane
    figure(W * 0.70, H * 0.80, H * 0.20, '#0c0e10');                        // lone small figure, lower-right
    out.establishing_solo = C.toDataURL('image/png');

    // 2) OBJECT-DOMINANT — a large central mass fills the frame; any person is TINY and peripheral. Kills "faces dominate".
    clear();
    g.fillStyle = '#191b1f'; g.fillRect(0, 0, W, H);
    // big glowing portal/arch, centered, filling most of the frame
    const px = W * 0.5, pw = W * 0.42, ptop = H * 0.14, pbot = H * 0.92;
    g.fillStyle = '#0a0b0d'; // dark heavy frame
    g.beginPath(); g.moveTo(px - pw / 2 - 26, pbot); g.lineTo(px - pw / 2 - 26, ptop + pw / 2);
    g.arc(px, ptop + pw / 2, pw / 2 + 26, Math.PI, 0); g.lineTo(px + pw / 2 + 26, pbot); g.closePath(); g.fill();
    let ig = g.createLinearGradient(0, ptop, 0, pbot); ig.addColorStop(0, '#e9e4d6'); ig.addColorStop(1, '#8f9aa2');
    g.fillStyle = ig;
    g.beginPath(); g.moveTo(px - pw / 2, pbot); g.lineTo(px - pw / 2, ptop + pw / 2);
    g.arc(px, ptop + pw / 2, pw / 2, Math.PI, 0); g.lineTo(px + pw / 2, pbot); g.closePath(); g.fill();
    figure(W * 0.84, H * 0.90, H * 0.12, '#0a0b0d');                        // tiny figure at edge for scale
    out.object_dominant = C.toDataURL('image/png');

    // 3) ENVIRONMENT-WIDE / POPULATED — the setting fills the frame with depth; SEVERAL small figures at different
    //    distances so the place reads inhabited, not an empty movie set.
    clear();
    grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#454b52'); grd.addColorStop(0.55, '#2b3036'); grd.addColorStop(1, '#171a1e');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    // receding architectural masses at varied depth/tone
    const masses = [[40, 0.42, 90, '#2f353b'], [180, 0.36, 70, '#272c31'], [430, 0.40, 110, '#2f353b'], [560, 0.34, 60, '#242a2f']];
    masses.forEach(function (m) { g.fillStyle = m[3]; g.fillRect(m[0], H * m[1], m[2], H * (0.72 - m[1])); });
    g.fillStyle = '#12151a'; g.fillRect(0, H * 0.72, W, H * 0.28);          // near ground
    // several small figures scattered at different depths (nearer = larger)
    figure(W * 0.22, H * 0.74, H * 0.13, '#0b0d10');
    figure(W * 0.55, H * 0.70, H * 0.09, '#0d0f12');
    figure(W * 0.78, H * 0.73, H * 0.11, '#0b0d10');
    figure(W * 0.40, H * 0.68, H * 0.06, '#101318');
    out.environment_wide = C.toDataURL('image/png');

    return out;
  });
  const map = { establishing_solo: 'Comp_Establishing_Solo_v1.png', object_dominant: 'Comp_Object_Dominant_v1.png', environment_wide: 'Comp_Environment_Wide_v1.png' };
  Object.keys(map).forEach(function (k) { fs.writeFileSync(DIR + map[k], Buffer.from(draws[k].split(',')[1], 'base64')); });
  console.log('authored 3 composition references: ' + Object.values(map).join(', '));
  await b.close();
})();
