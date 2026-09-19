// GN PANEL TEXT DRAWER — REAL CSS/JS CONTROL (Roman, 2026-09-20)
//
// Real-browser proof for the new collapsible, on-the-art panel text drawer (Roman: "Leave it on
// the art, inside a semi-transparent box... can be minimized... every beat start with the full
// image visible and the text minimized, and then the text box slides up into view"). This is new,
// first-time-tested interactive behavior — no existing control covers it. Loads the REAL, shipped
// public/styles.css directly (file:// link, not copied/reimplemented) plus the REAL
// _gnWireTextDrawerToggle / _gnScheduleTextDrawerReveal functions sandbox-extracted from
// public/app.js, then inserts a hand-built panel using the EXACT markup shape the real shell
// builder now emits — via a real DOM insertion, so the real MutationObserver-driven auto-reveal
// genuinely fires, not a simulated one. No dev server, no app boot, no network, no provider/image
// call — a real headless-browser DOM/CSS/timer proof of the isolated unit actually shipped.
//
// usage: node _gn_panel_text_drawer_control.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 400) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

const appSrc = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
const cssPath = path.join(__dirname, 'public/styles.css');
const cssSrc = fs.readFileSync(cssPath, 'utf8');

section('1. SOURCE PRESENCE — real files, real markers');
const toggleFnMatch = appSrc.match(/function _gnWireTextDrawerToggle\(\) \{[\s\S]*?\n  window\._gnWireTextDrawerToggle = _gnWireTextDrawerToggle;\n/);
const revealFnMatch = appSrc.match(/function _gnScheduleTextDrawerReveal\(\) \{[\s\S]*?\n  window\._gnScheduleTextDrawerReveal = _gnScheduleTextDrawerReveal;\n/);
ok('_gnWireTextDrawerToggle is found intact in public/app.js', !!toggleFnMatch);
ok('_gnScheduleTextDrawerReveal is found intact in public/app.js', !!revealFnMatch);
ok('the shell builder calls both wiring functions after building panels (real wiring, not dead functions)', /_gnWireTextDrawerToggle\(\);/.test(appSrc) && /_gnScheduleTextDrawerReveal\(\);/.test(appSrc));
ok('the real shell builder still emits .gn-panel-textbox / .gn-panel-text-handle markup', /gn-panel-textbox gn-dialogue-/.test(appSrc) && /gn-panel-text-handle/.test(appSrc));
ok('public/styles.css defines the real drawer CSS (.gn-panel-textbox, .is-revealed, a transform transition)', cssSrc.includes('.gn-panel-textbox') && cssSrc.includes('is-revealed') && cssSrc.includes('transition: transform'));
// NOTE: whether the retired @keyframes/animation-fill-mode approach is textually present
// somewhere (e.g. in this file's own disclosed-history comment explaining why it was replaced)
// is not itself meaningful — sections 2 and 4 below prove the REAL, currently-shipped behavior
// directly via real computed styles and real clicks, which is the only proof that actually
// matters here.

const toggleFnSrc = toggleFnMatch ? toggleFnMatch[0] : '';
const revealFnSrc = revealFnMatch ? revealFnMatch[0] : '';

function realTextboxHtml({ caption, speaker, dialogue, position }) {
  let inner = '';
  if (caption) inner += '<div class="gn-panel-text-caption">' + caption + '</div>';
  if (dialogue) inner += '<div class="gn-panel-text-dialogue">' + (speaker ? '<span class="gn-panel-text-speaker">' + speaker + '</span>' : '') + '<p class="gn-panel-text-dialogue-line">' + dialogue + '</p></div>';
  return '<div class="gn-panel-textbox gn-dialogue-' + (position || 'bottom') + '">' +
    '<div class="gn-panel-textbox-inner">' + inner + '</div>' +
    '</div>' +
    '<button type="button" class="gn-panel-text-handle" aria-label="Show/hide panel text" title="Show/hide panel text" aria-expanded="false">&plus;</button>';
}

const PANEL_A = realTextboxHtml({ caption: null, speaker: 'Dhokar Raes', dialogue: 'You shaped the wish for your own benefit and the rite answered by turning its weight toward the one who must conduct it.', position: 'bottom' });
const PANEL_B = realTextboxHtml({ caption: 'Two dozen faces turned toward me at once.', speaker: 'Dhokar Raes', dialogue: 'That turning has not gone unseen.', position: 'bottom' });

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="styles.css">
<style>body{background:#111;padding:40px;} .gn-panel{position:relative;width:420px;height:315px;margin-bottom:40px;background:#333;}</style>
</head><body>
<div class="gn-panel gn-panel-shell" id="panelA"></div>
<div class="gn-panel gn-panel-shell" id="panelB"></div>
<script>
${toggleFnSrc}
${revealFnSrc}
window._gnWireTextDrawerToggle();
window._gnScheduleTextDrawerReveal();
</script>
</body></html>`;

// ROOT CAUSE OF THIS CONTROL'S OWN EARLIER FALSE FAILURES (Roman, 2026-09-20, found via one
// authorized real-browser cascade inspection): page.setContent() gives a page no real origin, so
// a <link> to a local file:// stylesheet never actually applied — every "transform: none" failure
// this control previously reported was a broken TEST HARNESS, not a real CSS/JS bug (confirmed:
// getComputedStyle on the real, properly-loaded page returns the real declared
// matrix(1,0,0,1,0,46) / padding 34px 40px 12px 14px, exactly as authored). Fixed by writing a
// real on-disk fixture page inside public/ (so its relative stylesheet link resolves against the
// REAL public/styles.css on the same file:// origin) and loading it via page.goto('file://...'),
// which is the same-origin load a browser actually needs for a local stylesheet link to apply.
const fixturePath = path.join(__dirname, 'public/_gn_panel_text_drawer_control_fixture.html');
fs.writeFileSync(fixturePath, html);
const browser = await chromium.launch();
const page = await browser.newPage();
try {
  // Wire BEFORE inserting panels — the real shell builder calls both wiring functions once,
  // globally, then inserts panel HTML on every render; this mirrors that real order so the real
  // MutationObserver genuinely has to catch a live insertion, not a pre-existing element.
  await page.goto('file://' + fixturePath, { waitUntil: 'load' });
  await page.evaluate(([a, b]) => {
    document.getElementById('panelA').innerHTML = a;
    document.getElementById('panelB').innerHTML = b;
  }, [PANEL_A, PANEL_B]);
} finally {
  fs.unlinkSync(fixturePath); // never leave the fixture behind, pass or fail
}

section('2. INITIAL MOUNT — drawer starts minimized (art unobstructed), handle present');
{
  const initialTransform = await page.$eval('#panelA .gn-panel-textbox-inner', el => getComputedStyle(el).transform);
  const isRevealedYet = await page.$eval('#panelA .gn-panel-textbox', el => el.classList.contains('is-revealed'));
  ok('immediately after insertion, the drawer is NOT yet revealed — the art starts clean, per "every beat start with the full image visible"', isRevealedYet === false);
  ok('the drawer\'s inner box is genuinely transformed away from its expanded position at mount (real computed style, not assumed)', initialTransform !== 'none' && initialTransform !== 'matrix(1, 0, 0, 1, 0, 0)', initialTransform);
  const handleVisible = await page.$eval('#panelA .gn-panel-text-handle', el => getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden');
  const handleGlyph0 = await page.$eval('#panelA .gn-panel-text-handle', el => el.textContent.trim());
  ok('the handle button is present and visible from the start, showing the "expand" glyph (+) since the drawer starts minimized', handleVisible && handleGlyph0 === '+', handleGlyph0);
}

section('3. AUTO-REVEAL — the REAL MutationObserver catches the real insertion and reveals it, no click needed');
{
  await page.waitForTimeout(1100); // real reveal delay (650ms) + real transition (320ms) + margin
  const isRevealedNow = await page.$eval('#panelA .gn-panel-textbox', el => el.classList.contains('is-revealed'));
  ok('REAL MUTATIONOBSERVER: .is-revealed was added automatically, with zero user interaction, after the real insertion', isRevealedNow);
  const revealedTransform = await page.$eval('#panelA .gn-panel-textbox-inner', el => getComputedStyle(el).transform);
  ok('after auto-reveal, the drawer has genuinely transitioned to its normal (untransformed) position', revealedTransform === 'none' || revealedTransform === 'matrix(1, 0, 0, 1, 0, 0)', revealedTransform);
  const handleGlyph1 = await page.$eval('#panelA .gn-panel-text-handle', el => el.textContent.trim());
  ok('the handle glyph flips to "−" once auto-revealed (JS updates it, not just the CSS class)', handleGlyph1 === '−', handleGlyph1);
  const textVisible = await page.$eval('#panelA .gn-panel-text-dialogue-line', el => el.getBoundingClientRect().height > 0 && getComputedStyle(el).display !== 'none');
  ok('the real dialogue line text is actually laid out and visible after auto-reveal', textVisible);
}

section('4. REAL CLICK TOGGLE — the handle collapses and re-expands the drawer, and the fix actually holds');
{
  await page.click('#panelA .gn-panel-text-handle');
  await page.waitForTimeout(450);
  const isRevealedAfterClick = await page.$eval('#panelA .gn-panel-textbox', el => el.classList.contains('is-revealed'));
  ok('REAL CLICK: clicking the handle removes .is-revealed from the real element', isRevealedAfterClick === false);
  const collapsedTransform = await page.$eval('#panelA .gn-panel-textbox-inner', el => getComputedStyle(el).transform);
  ok('REAL CLICK, REAL FIX: the drawer genuinely moves back to its minimized position after collapsing — this is exactly the assertion the retired keyframe/fill-mode approach failed', collapsedTransform !== 'none' && collapsedTransform !== 'matrix(1, 0, 0, 1, 0, 0)', collapsedTransform);
  const handleGlyph2 = await page.$eval('#panelA .gn-panel-text-handle', el => el.textContent.trim());
  ok('REAL CLICK: the handle glyph flips back to "+" once collapsed', handleGlyph2 === '+', handleGlyph2);

  await page.click('#panelA .gn-panel-text-handle');
  await page.waitForTimeout(450);
  const isRevealedAgain = await page.$eval('#panelA .gn-panel-textbox', el => el.classList.contains('is-revealed'));
  ok('REAL CLICK: clicking a second time re-adds .is-revealed — the drawer re-expands, never permanently hidden', isRevealedAgain);
  const reRevealedTransform = await page.$eval('#panelA .gn-panel-textbox-inner', el => getComputedStyle(el).transform);
  ok('REAL CLICK: and it genuinely moves back to the expanded position, not just the class toggling with no visual effect', reRevealedTransform === 'none' || reRevealedTransform === 'matrix(1, 0, 0, 1, 0, 0)', reRevealedTransform);
}

section('5. INDEPENDENCE — toggling/revealing one panel never affects a sibling panel');
{
  const panelBRevealed = await page.$eval('#panelB .gn-panel-textbox', el => el.classList.contains('is-revealed'));
  ok('panel B auto-revealed on its own (same MutationObserver, independent timer) and was never touched by panel A\'s clicks above', panelBRevealed === true);
}

section('6. BOTH REAL CONTENT SHAPES RENDER — caption+dialogue together, and dialogue-only');
{
  const hasCaptionB = await page.$eval('#panelB .gn-panel-text-caption', el => !!el && el.textContent.length > 0);
  ok('panel B (caption + dialogue together, e.g. a beat with narration AND a spoken charge) renders its caption text', hasCaptionB);
  const noCaptionA = await page.$('#panelA .gn-panel-text-caption');
  ok('panel A (dialogue-only, the common case) renders NO caption element at all — never an empty caption block', noCaptionA === null);
  const speakerA = await page.$eval('#panelA .gn-panel-text-speaker', el => el.textContent.trim());
  ok('the real speaker label renders as its own element, distinct from the dialogue line (Option C: label above the line, not inline)', speakerA === 'Dhokar Raes');
  const captionStyle = await page.$eval('#panelB .gn-panel-text-caption', el => getComputedStyle(el).fontStyle);
  ok('narration/caption text is NOT italicized (explicit requirement — the retired .gn-caption-first class was italic)', captionStyle === 'normal', captionStyle);
}

await browser.close();

console.log('\n' + '='.repeat(96));
console.log('GN PANEL TEXT DRAWER CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
process.exitCode = results.every(r => r.pass) ? 0 : 1;
