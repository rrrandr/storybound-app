// Rune extraction must be WEAPON-SCOPED. These exist because the grounded box was once passed as a
// fourth argument to a three-parameter function and silently discarded — the code looked wired, the
// claim was made, and cyan anywhere on the panel could define the travel path.
// Runs headless: a tiny Canvas/Image shim feeds _glintRunePath synthetic pixels.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../../public/app.js'), 'utf8');

function g(re, label) { const m = src.match(re); if (!m) { console.error('MISSING ' + label); process.exit(1); } return m[0]; }
const window = {};
eval(g(/var _GLINT_PRESET = \{[\s\S]*?\n  \};/, 'preset'));
eval(g(/  function _glintRunePath\(imgEl, P, why, box\) \{[\s\S]*?\n  \}\n/, 'runePath'));

// ── synthetic panel: RGBA canvas the function can sample ──
function panel(w, h, paint) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { px[i*4] = 160; px[i*4+1] = 160; px[i*4+2] = 160; px[i*4+3] = 255; } // grey steel
  paint((x, y, rgb) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4; px[i] = rgb[0]; px[i+1] = rgb[1]; px[i+2] = rgb[2];
  });
  return { naturalWidth: w, naturalHeight: h, _px: px, _w: w, _h: h };
}
const CYAN = [40, 200, 245];
global.document = { createElement() {
  let sx0, sy0, sw0, sh0, dw0, dh0, img0;
  return { width: 0, height: 0,
    getContext() { return {
      drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) { img0 = img; sx0 = sx; sy0 = sy; sw0 = sw; sh0 = sh; dw0 = dw; dh0 = dh; },
      getImageData(_x, _y, w, h) {
        const out = new Uint8ClampedArray(w * h * 4);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const srcX = Math.min(img0._w - 1, Math.floor(sx0 + x * (sw0 / dw0)));
          const srcY = Math.min(img0._h - 1, Math.floor(sy0 + y * (sh0 / dh0)));
          const si = (srcY * img0._w + srcX) * 4, di = (y * w + x) * 4;
          out[di] = img0._px[si]; out[di+1] = img0._px[si+1]; out[di+2] = img0._px[si+2]; out[di+3] = 255;
        }
        return { data: out };
      } }; } };
} };

let bad = 0;
const ok = (l, c, x) => { if (!c) bad++; console.log((c ? '  ✅ ' : '  ❌ ') + l + (x ? '   ' + x : '')); };
const P = _GLINT_PRESET;
const runes = (put, x0, y0) => { for (let k = 0; k < 5; k++) { const cx = x0 + k * 26;
  for (let dx = 0; dx < 5; dx++) for (let dy = 0; dy < 5; dy++) put(cx + dx, y0 + dy, CYAN); } };

console.log('WEAPON-SCOPED EXTRACTION');
// Runes inside the box; a far LARGER cyan mass outside it (a sky, a cloak, a spell).
const img = panel(600, 400, (put) => {
  runes(put, 120, 200);
  for (let x = 0; x < 600; x++) for (let y = 0; y < 90; y++) put(x, y, CYAN);   // huge cyan sky
});
const BOX = { x: 100/600, y: 170/400, w: 200/600, h: 70/400 };
let why = {};
let p = _glintRunePath(img, P, why, BOX);
ok('path recovered from runes inside the box', !!p && p.length > 5, why.reason);
if (p) {
  const inside = p.every(q => q.x >= BOX.x - 0.02 && q.x <= BOX.x + BOX.w + 0.02 &&
                              q.y >= BOX.y - 0.02 && q.y <= BOX.y + BOX.h + 0.02);
  ok('every point lies inside the weapon box', inside,
     'x ' + Math.min(...p.map(q=>q.x)).toFixed(3) + '-' + Math.max(...p.map(q=>q.x)).toFixed(3));
  ok('the huge cyan sky outside the box is ignored', p.every(q => q.y > 0.3),
     'min y ' + Math.min(...p.map(q=>q.y)).toFixed(3));
  ok('coordinates are whole-panel normalised, not crop-relative',
     p.every(q => q.x > 0.15 && q.x < 0.55));
}

console.log('\nINVERSE — cyan only OUTSIDE the box');
const img2 = panel(600, 400, (put) => {
  for (let x = 0; x < 600; x++) for (let y = 0; y < 90; y++) put(x, y, CYAN);
});
why = {};
ok('refuses when the box holds no runes', !_glintRunePath(img2, P, why, BOX), 'reason: ' + why.reason);

console.log('\nBOX HYGIENE');
why = {}; ok('refuses a missing box', !_glintRunePath(img, P, why), 'reason: ' + why.reason);
why = {}; ok('refuses a malformed box', !_glintRunePath(img, P, why, { x: 0.1, y: 0.1 }), 'reason: ' + why.reason);
why = {}; ok('refuses a zero-area box', !_glintRunePath(img, P, why, { x: .1, y: .1, w: 0, h: .2 }), 'reason: ' + why.reason);
why = {}; ok('refuses a box covering the frame',
   !_glintRunePath(img, P, why, { x: 0, y: 0, w: 1, h: 1 }), 'reason: ' + why.reason);
why = {}; ok('refuses when the marker floods its own box',
   !_glintRunePath(panel(600,400,(put)=>{ for(let x=100;x<300;x++) for(let y=170;y<240;y++) put(x,y,CYAN); }),
                   P, why, BOX), 'reason: ' + why.reason);

console.log(bad ? '\n' + bad + ' FAILED' : '\n🎯 rune extraction is weapon-scoped and fails closed');
process.exit(bad ? 1 : 0);
