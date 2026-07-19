// Author the wish-burst emblems as PURE SYMBOLS (style references, not scene references).
// The chart's bursts all emanate from a raised hand, so a crop always carries staging the model copies.
// Synthesize the notation only — flat inked linework on a flat ground, zero character/pose.
// CLEAN = orderly golden rays + 4-point sparkle stars.  TWISTED = jagged red rays + scattered X's + broken stars.
// Deterministic (fixed angle/length tables; no Math.random).
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/Users/romantsukerman/storybound-app/public/assets/Fatelands/';

(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent('<canvas id=c width=640 height=640></canvas>');
  const out = await p.evaluate(() => {
    const draw = (twisted) => {
      const c = document.getElementById('c'), g = c.getContext('2d'), W = 640, cx = 320, cy = 320;
      // flat ground — near-black so the mark reads as inked notation
      g.clearRect(0, 0, W, W); g.fillStyle = '#0b0b10'; g.fillRect(0, 0, W, W);
      const ray = twisted ? '#ec3b2b' : '#f4b93a', core = twisted ? '#ff5a3c' : '#ffe08a';
      // radiating rays
      const N = twisted ? 15 : 16;
      for (let i = 0; i < N; i++) {
        const base = (i / N) * Math.PI * 2;
        // twisted: jitter the angle + length + skip/shorten some rays (broken); clean: even, full
        const jit = twisted ? ((i * 47) % 13 - 6) / 40 : 0;            // deterministic angle wobble
        const a = base + jit;
        const lenMul = twisted ? (0.55 + ((i * 31) % 9) / 12) : (0.78 + ((i % 2) ? 0.14 : 0)); // clean = near-uniform
        const len = 250 * lenMul, inner = 34;
        g.lineWidth = twisted ? (5 + ((i * 17) % 4)) : (6 + ((i % 2) ? 3 : 0));
        g.strokeStyle = ray; g.lineCap = 'round';
        if (twisted) {
          // jagged: 3-segment wavy ray
          g.beginPath();
          let x = cx + Math.cos(a) * inner, y = cy + Math.sin(a) * inner; g.moveTo(x, y);
          for (let s = 1; s <= 3; s++) {
            const t = inner + (len - inner) * (s / 3);
            const perp = a + Math.PI / 2, off = ((i + s) % 2 ? 1 : -1) * (10 + (s * 4));
            g.lineTo(cx + Math.cos(a) * t + Math.cos(perp) * off, cy + Math.sin(a) * t + Math.sin(perp) * off);
          }
          g.stroke();
        } else {
          // clean: straight tapering ray
          g.beginPath();
          g.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
          g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
          g.stroke();
        }
      }
      // bright core
      const rad = g.createRadialGradient(cx, cy, 2, cx, cy, twisted ? 46 : 54);
      rad.addColorStop(0, '#ffffff'); rad.addColorStop(0.45, core); rad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rad; g.beginPath(); g.arc(cx, cy, twisted ? 52 : 60, 0, Math.PI * 2); g.fill();
      // scattered marks
      if (twisted) {
        // X-marks (crossed strokes) — deterministic scatter
        const xs = [[130, 150], [500, 170], [150, 470], [520, 470], [430, 90], [90, 350], [560, 320]];
        g.strokeStyle = '#ec3b2b'; g.lineWidth = 7; g.lineCap = 'round';
        for (const [x, y] of xs) { const s = 17; g.beginPath(); g.moveTo(x - s, y - s); g.lineTo(x + s, y + s); g.moveTo(x + s, y - s); g.lineTo(x - s, y + s); g.stroke(); }
        // broken stars: 3 of 4 arms
        const bs = [[240, 110], [420, 520], [110, 250]];
        for (const [x, y] of bs) { g.beginPath(); g.moveTo(x, y - 20); g.lineTo(x, y + 20); g.moveTo(x - 20, y); g.lineTo(x + 6, y); g.stroke(); }
      } else {
        // 4-point sparkle stars — clean
        const st = [[150, 150], [500, 160], [160, 500], [500, 500], [320, 80], [80, 320], [560, 320], [320, 560]];
        g.strokeStyle = '#ffe08a'; g.lineWidth = 5; g.lineCap = 'round';
        for (const [x, y] of st) { const s = ((x + y) % 3) ? 16 : 22; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x, y + s); g.moveTo(x - s, y); g.lineTo(x + s, y); g.stroke(); }
      }
      return c.toDataURL('image/png');
    };
    return { clean: draw(false), twisted: draw(true) };
  });
  fs.writeFileSync(DIR + 'Wish_Burst_Clean_v1.png', Buffer.from(out.clean.split(',')[1], 'base64'));
  fs.writeFileSync(DIR + 'Wish_Burst_Twisted_v1.png', Buffer.from(out.twisted.split(',')[1], 'base64'));
  console.log('authored pure-symbol burst emblems (clean gold / twisted red-X)');
  await b.close();
})();
