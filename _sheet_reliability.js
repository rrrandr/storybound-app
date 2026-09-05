// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 2x2 SHEET RELIABILITY — is the quadrant sheet a production primitive or a lucky one-off?
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// One clean 2x2 proves possibility, not reliability. This runs N varied sheets — different genres,
// camera mixes, action vs dialogue vs landscape vs close-up — and scores the GEOMETRY.
//
// GUTTER SCORING IS DETERMINISTIC, FROM PIXELS — deliberately NOT a vision model. Every automated
// conclusion in this investigation that came from the verifier was wrong at least once (it failed a
// correct image, invented a species, demanded a mantle of a human). Grid obedience is a measurable
// geometric fact: line art is dark strokes on white, so a gutter is a band of columns/rows containing
// essentially no dark pixels. Measure it, don't ask about it.
//
// SCORED AUTOMATICALLY (objective):
//   gridClean    — exactly ONE interior vertical gutter AND ONE interior horizontal gutter
//   centered     — each gutter within tolerance of the 50% line (so quadrants are equal)
//   cropSuccess  — the four quadrants can be cut deterministically at the measured gutters
//   bleed        — dark pixels found INSIDE a gutter band = a figure crossing panels
//
// SCORED BY EYE (subjective — every quadrant is saved as its own PNG):
//   character continuity across quadrants, beat distinctness, per-cell sketch quality.
//   Continuity is the biggest risk of batching and is NOT auto-scored here: "looks similar" is not a
//   measurement, and the tool available for judging it is the one we just established is unreliable.
//
// NOT MEASURED, and it matters for the economics: RETRY COUPLING. If one bad quadrant forces
// regenerating all four, failures are correlated and the per-panel saving shrinks. That needs a
// quality judge, which needs a trustworthy verifier — so it is deliberately out of scope here.
//
// PAID. ~$0.15/sheet at 4K. Requires RUN=1.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');

const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/sheet_reliability';
const RUN = process.env.RUN === '1';
const SIZE = process.env.SIZE || '4K';
const LIMIT = Number(process.env.LIMIT || 10);

// Deliberately varied: if the primitive only works for underwater fantasy combat it is not a primitive.
const SHEETS = [
  { id: '01_fantasy_action', tag: 'fantasy · action · wide',
    beats: ['A knight braces behind a cracked shield as arrows strike it. WIDE, full body.',
            'The same knight breaks cover, running low. MEDIUM, full body, motion blur lines.',
            'An archer on a parapet draws and sights down the shaft. MEDIUM, three-quarter.',
            'The knight reaches the parapet stair, sword raised. WIDE, low angle.'] },
  { id: '02_modern_dialogue', tag: 'modern · dialogue · close',
    beats: ['A woman in a tailored coat sits across a cafe table, hands folded. MEDIUM two-shot with a man opposite.',
            'CLOSE on her face, eyes lowered, considering.',
            'CLOSE on his hand turning a coffee cup on the saucer.',
            'She stands to leave, chair pushed back; he stays seated. WIDE, full body.'] },
  { id: '03_scifi_landscape', tag: 'sci-fi · landscape · scale',
    beats: ['A vast terraced mining pit under a ringed planet. EXTREME WIDE, no figures.',
            'A lone surveyor in a pressure suit at the pit edge, dwarfed by it. WIDE, full body.',
            'CLOSE on the surveyor\'s glove clearing dust from a marker post.',
            'A hauler crawler grinds up the terrace road. WIDE, three-quarter.'] },
  { id: '04_domestic_quiet', tag: 'domestic · quiet · interior',
    beats: ['A kitchen at dawn, one chair pulled out, light across the floor. WIDE, no figures.',
            'A man in a dressing gown filling a kettle, back to camera. MEDIUM.',
            'CLOSE on two mugs, only one of them used.',
            'He stands at the window with the mug, looking out. MEDIUM, full body from behind.'] },
  { id: '05_horror_closeups', tag: 'horror · close-ups · tension',
    beats: ['CLOSE on a door handle turning slowly.',
            'CLOSE on a woman\'s eyes in the dark, wide, catching a sliver of light.',
            'MEDIUM: she presses flat against a wall beside the doorframe.',
            'WIDE: the empty hallway beyond the open door, a long runner rug receding.'] },
  { id: '06_crowd_scene', tag: 'crowd · many figures · depth',
    beats: ['A packed market street seen down its length. WIDE, many figures, deep space.',
            'A pickpocket slips a purse from a coat. CLOSE on hands only.',
            'A merchant shouts over her stall at someone off-frame. MEDIUM.',
            'The pickpocket vanishes into the crowd, back turned. WIDE, full body among others.'] },
  { id: '07_night_chase', tag: 'noir · night · motion',
    beats: ['Rain-slick alley, a figure sprinting away from camera. WIDE, full body, deep perspective.',
            'A pursuer vaults a low fence. MEDIUM, full body, mid-air.',
            'CLOSE on boots hitting a puddle, water thrown.',
            'The two figures collide against a brick wall. MEDIUM two-shot.'] },
  { id: '08_western_standoff', tag: 'western · symmetry · stillness',
    beats: ['Two gunfighters face each other down a dirt street. EXTREME WIDE, both full body, symmetrical.',
            'CLOSE on one man\'s hand hovering near his holster.',
            'CLOSE on the other\'s eyes narrowing under a hat brim.',
            'A watching crowd scatters for doorways. WIDE, many figures.'] },
  { id: '09_underwater_creature', tag: 'fantasy · non-human · full body',
    beats: ['A cephalopod-humanoid (humanoid torso, two arms, six-tentacle lower body, no legs) hangs in open water, lantern raised. WIDE, full body.',
            'A human diver in a leather jerkin braces against coral. MEDIUM, full body.',
            'The two reach toward each other across the gap. WIDE two-shot, full body.',
            'CLOSE on their hands nearly touching.'] },
  { id: '10_mixed_scale', tag: 'mixed scale · hardest case',
    beats: ['EXTREME WIDE: a mountain valley with a single road.',
            'EXTREME CLOSE: a beetle on a stone.',
            'MEDIUM: a traveller adjusting a pack strap.',
            'WIDE: the same traveller tiny against the valley wall.'] }
];

function sheetPrompt(beats) {
  return 'A SINGLE IMAGE divided into a 2 x 2 GRID of exactly FOUR equal rectangular panels of identical ' +
    'size, separated by clean straight white gutters — one vertical gutter down the exact centre and one ' +
    'horizontal gutter across the exact centre. Do NOT vary the panel sizes. Do NOT make a decorative comic ' +
    'page layout. Four equal quadrants only.\n' +
    'Each quadrant is a SEPARATE moment with its own camera. Do NOT repeat a moment, do NOT let any figure ' +
    'or object cross a gutter into another quadrant, and do NOT blend the quadrants into one continuous ' +
    'picture. Draw them in reading order — top-left, top-right, bottom-left, bottom-right:\n' +
    beats.map(function (b, i) { return 'QUADRANT ' + (i + 1) + ': ' + b; }).join('\n') +
    '\n\nRecurring characters must stay recognisably the SAME person in every quadrant they appear in — ' +
    'same build, same clothing, same hair. Do NOT draw panel numbers, captions, or any lettering.';
}

// ── DETERMINISTIC GUTTER ANALYSIS (runs in the page, on a canvas) ────────────────────────────────
const ANALYSE = function (dataUrl) {
  return new Promise(function (resolve) {
    var im = new Image();
    im.onload = function () {
      var W = 900, H = Math.round(W * im.height / im.width);
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var g = c.getContext('2d'); g.drawImage(im, 0, 0, W, H);
      var d = g.getImageData(0, 0, W, H).data;
      var DARK = 190;            // line art is near-black on near-white
      var CLEAR = 0.004;         // <0.4% dark pixels in a line ⇒ it is a gutter, not content

      function darkFrac(isCol, idx, from, to) {
        var n = 0, tot = 0;
        for (var k = from; k < to; k++) {
          var x = isCol ? idx : k, y = isCol ? k : idx;
          var p = (y * W + x) * 4;
          var lum = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
          if (lum < DARK) n++;
          tot++;
        }
        return tot ? n / tot : 0;
      }
      // Ignore a 4% border: sheets often sit on a light margin, which would read as an edge gutter.
      var mX = Math.round(W * 0.04), mY = Math.round(H * 0.04);
      function runs(isCol, len, from, to) {
        var out = [], cur = null;
        for (var i = 0; i < len; i++) {
          var clear = darkFrac(isCol, i, from, to) < CLEAR;
          if (clear) { if (!cur) cur = { start: i, end: i }; else cur.end = i; }
          else if (cur) { out.push(cur); cur = null; }
        }
        if (cur) out.push(cur);
        return out;
      }
      var vAll = runs(true, W, mY, H - mY);
      var hAll = runs(false, H, mX, W - mX);
      // interior = not touching the frame edge
      var vIn = vAll.filter(function (r) { return r.start > W * 0.08 && r.end < W * 0.92; });
      var hIn = hAll.filter(function (r) { return r.start > H * 0.08 && r.end < H * 0.92; });
      // widest interior run in each axis = the gutter, if any
      var v = vIn.sort(function (a, b) { return (b.end - b.start) - (a.end - a.start); })[0] || null;
      var h = hIn.sort(function (a, b) { return (b.end - b.start) - (a.end - a.start); })[0] || null;
      var vPct = v ? ((v.start + v.end) / 2) / W : null;
      var hPct = h ? ((h.start + h.end) / 2) / H : null;
      resolve({
        width: im.width, height: im.height,
        vGutters: vIn.length, hGutters: hIn.length,
        vCenterPct: vPct == null ? null : +(vPct * 100).toFixed(1),
        hCenterPct: hPct == null ? null : +(hPct * 100).toFixed(1),
        vWidthPct: v ? +(((v.end - v.start) / W) * 100).toFixed(2) : null,
        hWidthPct: h ? +(((h.end - h.start) / H) * 100).toFixed(2) : null
      });
    };
    im.onerror = function () { resolve(null); };
    im.src = dataUrl;
  });
};

(async () => {
  const set = SHEETS.slice(0, LIMIT);
  console.log('─'.repeat(76));
  console.log('2x2 SHEET RELIABILITY — is the quadrant sheet a production primitive?');
  console.log('─'.repeat(76));
  console.log(`  sheets    : ${set.length}, requested ${SIZE}`);
  console.log(`  ESTIMATED : ~$${(set.length * (SIZE === '4K' ? 0.151 : 0.067)).toFixed(2)}`);
  console.log(`  output    : ${OUT}`);
  console.log('─'.repeat(76));
  if (!RUN) { console.log('DRY RUN — no API calls. Re-run with RUN=1 to spend.\n'); process.exit(0); }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._genStructuralLineArt === 'function', { timeout: 40000 });
  await page.exposeFunction('__noop', () => {});

  const rows = [];
  for (const s of set) {
    process.stdout.write(`  ${s.id.padEnd(24)} `);
    const t0 = Date.now();
    const res = await page.evaluate(async ({ prompt, SIZE, fnBody }) => {
      window._stageARefs = false;                 // isolate GEOMETRY — no references in this test
      const url = await window._genStructuralLineArt(prompt, null, { imageSize: SIZE, aspectRatio: '1:1' });
      if (!url) return null;
      const analyse = new Function('return ' + fnBody)();
      const geo = await analyse(url);
      return { url, geo };
    }, { prompt: sheetPrompt(s.beats), SIZE, fnBody: ANALYSE.toString() });

    if (!res || !res.url) { console.log('FAILED (no image)'); rows.push({ id: s.id, tag: s.tag, ok: false }); continue; }
    const buf = Buffer.from(res.url.split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT, s.id + '.png'), buf);

    const g = res.geo || {};
    // Grid is clean when there is exactly ONE interior gutter per axis, each near the midline.
    const centred = g.vCenterPct != null && g.hCenterPct != null &&
      Math.abs(g.vCenterPct - 50) <= 6 && Math.abs(g.hCenterPct - 50) <= 6;
    const clean = g.vGutters === 1 && g.hGutters === 1 && centred;
    rows.push({ id: s.id, tag: s.tag, ok: true, clean, centred, ...g, secs: +((Date.now() - t0) / 1000).toFixed(0) });
    console.log(`${g.width}x${g.height}  vGut=${g.vGutters} @${g.vCenterPct ?? '—'}%  hGut=${g.hGutters} @${g.hCenterPct ?? '—'}%  ${clean ? 'CLEAN 2x2' : 'irregular'}  (${((Date.now()-t0)/1000).toFixed(0)}s)`);

    // Crop the four quadrants at the MEASURED gutters — this is the crop-success test.
    if (clean) {
      const qs = await page.evaluate(async ({ url, vPct, hPct }) => {
        const im = new Image(); await new Promise(r => { im.onload = r; im.src = url; });
        const cut = (sx, sy, sw, sh) => { const c = document.createElement('canvas'); c.width = sw; c.height = sh;
          c.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh); return c.toDataURL('image/png'); };
        const vx = Math.round(im.width * vPct / 100), hy = Math.round(im.height * hPct / 100);
        return [cut(0,0,vx,hy), cut(vx,0,im.width-vx,hy), cut(0,hy,vx,im.height-hy), cut(vx,hy,im.width-vx,im.height-hy)];
      }, { url: res.url, vPct: g.vCenterPct, hPct: g.hCenterPct });
      qs.forEach((q, i) => fs.writeFileSync(path.join(OUT, `${s.id}__q${i + 1}.png`), Buffer.from(q.split(',')[1], 'base64')));
    }
  }

  const done = rows.filter(r => r.ok);
  const cleanN = done.filter(r => r.clean).length;
  console.log('\n' + '═'.repeat(76));
  console.log('GEOMETRY (deterministic — measured from pixels, not judged by a model)');
  console.log('═'.repeat(76));
  rows.forEach(r => console.log(`  ${r.clean ? 'CLEAN    ' : r.ok ? 'IRREGULAR' : 'NO IMAGE '} ${r.id.padEnd(24)} ${r.tag}`));
  console.log('─'.repeat(76));
  console.log(`  quadrant obedience: ${cleanN}/${done.length} sheets produced a clean, centred 2x2`);
  console.log(`  crop success      : ${cleanN}/${done.length} split deterministically into 4 quadrant PNGs`);
  console.log(`\n  NOT scored here — judge by eye from the saved quadrants:`);
  console.log(`    • character continuity across quadrants (the biggest batching risk)`);
  console.log(`    • beat distinctness  • per-cell sketch quality  • margin for bubbles/UI`);
  console.log(`  NOT measured — retry coupling (does one bad quadrant force regenerating all four?).`);
  fs.writeFileSync(path.join(OUT, 'geometry.json'), JSON.stringify(rows, null, 2));
  console.log(`\nSaved → ${OUT}\n`);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
