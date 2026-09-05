// End-to-end validation of the SAME-SCENE Favored-shift narration box.
// $0 — reuses an existing Kwisheen render as the scene image, mounts a real #stagedHero
// (with the real .staged-hero / .staged-hero-img classes so the CSS applies), then fires
// the detection→record path (_recordFavoredShift, exactly what the render hook calls) and
// screenshots the result. Confirms the caption overlays the CURRENT scene's image.
const { chromium } = require('playwright-core');
const fs = require('fs');
const IMG = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5b50dbf4-5fe5-4c80-ae8b-5a341feb3c62/scratchpad/phase1/kwisheen_v3.png';
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5b50dbf4-5fe5-4c80-ae8b-5a341feb3c62/scratchpad/phase1/shift_caption_e2e.png';

(async () => {
  const dataUri = 'data:image/png;base64,' + fs.readFileSync(IMG).toString('base64');
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 620 } })).newPage();
  const logs = [];
  page.on('console', m => { const t = m.text(); if (/FAVORED-SHIFT/.test(t)) logs.push(t); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._recordFavoredShift === 'function' && typeof window._showFavoredShiftCaption === 'function', { timeout: 40000 });

  // Mount a real staged-hero container with the Kwisheen scene image (mirrors the live DOM).
  await page.evaluate((uri) => {
    document.body.innerHTML = '<div id="stagedReader" style="position:relative;width:880px;height:600px;margin:0 auto;background:#000;">'
      + '<div id="stagedHero" class="staged-hero" style="position:absolute;inset:0;">'
      + '<img class="staged-hero-img loaded" style="width:100%;height:100%;object-fit:cover;" src="' + uri + '">'
      + '<div class="staged-hero-vignette" style="position:absolute;inset:0;pointer-events:none;"></div>'
      + '</div></div>';
    window.state = window.state || {};
    window.state.favoredShiftCount = 0;
    // This is exactly what the staged-render detection hook calls when the anatomy
    // verifier flags a drift (here: a Kwisheen sprouting crab pincers on its tentacle-ends).
    window._recordFavoredShift('crab pincers on the tentacle-ends', 'Kwisheen');
  }, dataUri);

  await page.waitForSelector('.staged-shift-caption', { timeout: 5000 });
  const captionText = await page.$eval('.staged-shift-caption', el => el.textContent);
  const box = await page.$('#stagedReader');
  await box.screenshot({ path: OUT });
  await browser.close();

  console.log('\n  SAME-SCENE SHIFT CAPTION — E2E');
  console.log('  ' + '─'.repeat(58));
  console.log('  detection→record logs: ' + (logs.join(' | ') || '(none)'));
  console.log('  caption element present: ' + (captionText ? 'YES' : 'NO'));
  console.log('  caption text: "' + captionText + '"');
  console.log('  screenshot: ' + OUT);
  console.log('  ' + '─'.repeat(58) + '\n');
})().catch(e => { console.error('E2E ERROR:', e); process.exit(2); });
