// RE-SCORE the already-generated sheets with a CORRECTED gutter detector. $0 — no generation.
//
// Detector v1 was wrong in its premise: it looked for a band of near-WHITE columns, assuming gutters
// are empty space. The model draws bordered comic panels, so the gutter is a solid BLACK RULE. v1
// scored a continuous dark line as "not a gutter" and returned 0/10 — a false negative on sheets that
// are, by eye, perfect 2x2 grids. Same lesson as the verifier: check the instrument against the
// picture before believing its verdict.
//
// v2 finds continuous DARK RULES: a column (or row) where most pixels are dark across the full span.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');

const DIR = process.env.DIR || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/sheet_reliability';

const ANALYSE = function (dataUrl) {
  return new Promise(function (resolve) {
    var im = new Image();
    im.onload = function () {
      var W = 900, H = Math.round(W * im.height / im.width);
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var g = c.getContext('2d'); g.drawImage(im, 0, 0, W, H);
      var d = g.getImageData(0, 0, W, H).data;
      var DARK = 170, RULE = 0.60;      // a gutter rule: >60% of the span is dark
      var mX = Math.round(W * 0.03), mY = Math.round(H * 0.03);

      function darkFrac(isCol, idx, from, to) {
        var n = 0, tot = 0;
        for (var k = from; k < to; k++) {
          var x = isCol ? idx : k, y = isCol ? k : idx;
          var p = (y * W + x) * 4;
          if (0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2] < DARK) n++;
          tot++;
        }
        return tot ? n / tot : 0;
      }
      function rules(isCol, len, from, to) {
        var out = [], cur = null;
        for (var i = 0; i < len; i++) {
          if (darkFrac(isCol, i, from, to) >= RULE) { if (!cur) cur = { start: i, end: i }; else cur.end = i; }
          else if (cur) { out.push(cur); cur = null; }
        }
        if (cur) out.push(cur);
        return out;
      }
      // Merge rules separated by a thin white gap (a gutter is often TWO borders with white between).
      function merge(rs, span) {
        var out = [];
        rs.forEach(function (r) {
          var last = out[out.length - 1];
          if (last && (r.start - last.end) <= span * 0.03) last.end = r.end; else out.push({ start: r.start, end: r.end });
        });
        return out;
      }
      var vAll = merge(rules(true, W, mY, H - mY), W);
      var hAll = merge(rules(false, H, mX, W - mX), H);
      var vIn = vAll.filter(function (r) { return r.start > W * 0.10 && r.end < W * 0.90; });
      var hIn = hAll.filter(function (r) { return r.start > H * 0.10 && r.end < H * 0.90; });
      var v = vIn.sort(function (a, b) { return (b.end - b.start) - (a.end - a.start); })[0] || null;
      var h = hIn.sort(function (a, b) { return (b.end - b.start) - (a.end - a.start); })[0] || null;
      resolve({
        width: im.width, height: im.height,
        vRules: vIn.length, hRules: hIn.length,
        vCenterPct: v ? +((((v.start + v.end) / 2) / W) * 100).toFixed(1) : null,
        hCenterPct: h ? +((((h.start + h.end) / 2) / H) * 100).toFixed(1) : null
      });
    };
    im.onerror = function () { resolve(null); };
    im.src = dataUrl;
  });
};

(async () => {
  const files = fs.readdirSync(DIR).filter(f => /^\d\d_.*\.png$/.test(f) && !/__q\d/.test(f)).sort();
  if (!files.length) { console.error('no sheets found in ' + DIR); process.exit(1); }
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('RE-SCORED with corrected detector (dark rules, not white bands) — $0\n' + '─'.repeat(76));
  const rows = [];
  for (const f of files) {
    const url = 'data:image/png;base64,' + fs.readFileSync(path.join(DIR, f)).toString('base64');
    const geo = await page.evaluate(async ({ url, fnBody }) => {
      const analyse = new Function('return ' + fnBody)();
      return await analyse(url);
    }, { url, fnBody: ANALYSE.toString() });
    const centred = geo && geo.vCenterPct != null && geo.hCenterPct != null &&
      Math.abs(geo.vCenterPct - 50) <= 7 && Math.abs(geo.hCenterPct - 50) <= 7;
    const clean = geo && geo.vRules === 1 && geo.hRules === 1 && centred;
    rows.push({ file: f, clean, ...geo });
    console.log(`  ${clean ? 'CLEAN 2x2' : 'irregular'}  ${f.padEnd(26)} vRules=${geo.vRules} @${geo.vCenterPct ?? '—'}%  hRules=${geo.hRules} @${geo.hCenterPct ?? '—'}%`);

    if (clean) {
      const qs = await page.evaluate(async ({ url, vPct, hPct }) => {
        const im = new Image(); await new Promise(r => { im.onload = r; im.src = url; });
        const cut = (sx, sy, sw, sh) => { const c = document.createElement('canvas'); c.width = sw; c.height = sh;
          c.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh); return c.toDataURL('image/png'); };
        const vx = Math.round(im.width * vPct / 100), hy = Math.round(im.height * hPct / 100);
        return [cut(0,0,vx,hy), cut(vx,0,im.width-vx,hy), cut(0,hy,vx,im.height-hy), cut(vx,hy,im.width-vx,im.height-hy)];
      }, { url, vPct: geo.vCenterPct, hPct: geo.hCenterPct });
      qs.forEach((q, i) => fs.writeFileSync(path.join(DIR, f.replace('.png', `__q${i+1}.png`)), Buffer.from(q.split(',')[1], 'base64')));
    }
  }
  const cleanN = rows.filter(r => r.clean).length;
  console.log('─'.repeat(76));
  console.log(`  quadrant obedience: ${cleanN}/${rows.length}`);
  console.log(`  crop success      : ${cleanN}/${rows.length} split into 4 quadrant PNGs at the measured gutters`);
  fs.writeFileSync(path.join(DIR, 'geometry_v2.json'), JSON.stringify(rows, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
