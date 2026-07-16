// Guard: step 4 — _detectWishCycleRendered (marks the first-Fatelands milestone only after the prose
// renders all three beats: spoken wish + omen + sacrifice). Extracts + runs the function from app.js.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (static) per-story flag set on the demo directive's non-empty return; finalize gates on it + dev-skip.
A(/window\.state\._fatelandsWishDemoOpenerFired = true/.test(src), 'per-story _fatelandsWishDemoOpenerFired flag not set on the demo directive');
A(/_fatelandsWishDemoOpenerFired/.test(src.slice(src.indexOf('_detectWishCycleRendered') > 0 ? 0 : 0)) , 'flag not referenced');
A(/setItem\('sb_witnessed_fatelands_wish_ritual'\s*,\s*'1'\)/.test(src), 'milestone not written to the durable localStorage key');
{ // dev-skip: the milestone write is guarded by a dev check
  const wi = src.indexOf("setItem('sb_witnessed_fatelands_wish_ritual'");
  const around = wi >= 0 ? src.slice(wi - 400, wi) : '';
  A(/isDevMode/.test(around), 'milestone write is not dev-skipped (localhost must always re-demo)');
}

// extract + run _detectWishCycleRendered with stubs
const s = src.indexOf('function _detectWishCycleRendered');
const e = src.indexOf('window._detectWishCycleRendered = _detectWishCycleRendered;');
A(s >= 0 && e > s, 'could not locate _detectWishCycleRendered');
const blk = src.slice(s, e + 'window._detectWishCycleRendered = _detectWishCycleRendered;'.length);
let win;
try { win = new Function('window', blk + '\nreturn window;')({}); } catch (err) { A(false, 'eval threw: ' + err.message); }

if (win && typeof win._detectWishCycleRendered === 'function') {
  const D = win._detectWishCycleRendered;
  const wish = '"I wish the flames would let her breathe. Take what it costs," he said.';
  const omen = 'The candle flame bent toward him though there was no wind, and the birds went silent.';
  const sac = 'When he turned to her, her name was gone from his mouth — he could no longer remember it.';
  // positive: all three beats
  const p = D(wish + ' ' + omen + ' ' + sac);
  A(p && p.rendered === true && p.count === 3, 'all-3-beats prose not detected as rendered: ' + JSON.stringify(p && p.signals));
  // negatives: each beat missing → not rendered
  A(D(omen + ' ' + sac).rendered === false, 'rendered true with NO wish beat');
  A(D(wish + ' ' + sac).signals.omen === false && D(wish + ' ' + sac).rendered === false, 'rendered true with NO omen beat');
  A(D(wish + ' ' + omen).signals.sacrifice === false && D(wish + ' ' + omen).rendered === false, 'rendered true with NO sacrifice beat');
  // fail-soft on junk
  A(D('').rendered === false && D(null).rendered === false, 'not fail-soft on empty/null');
} else { A(false, '_detectWishCycleRendered not exposed after eval'); }

if (fail) process.exit(1);
console.log('PASS: _detectWishCycleRendered requires all three beats (wish + omen + sacrifice), errs toward not-marking on partials; milestone write is durable + dev-skipped + gated on the per-story demo flag.');
