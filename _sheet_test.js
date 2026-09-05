// CONTACT-SHEET TEST — the original question, finally asked directly:
// can Gemini render N DISTINCT panels in ONE canvas, cleanly enough to split back out?
//
// Two sheets bracket the difficulty, so we learn WHERE the limit is rather than just pass/fail:
//   A  2x2 = 4 panels   (easiest useful case)
//   B  3x2 = 6 panels   (if 6 works, 5 works; and 6 crops on a clean grid, which 5 does not)
//
// Both requested at 4K, which ALSO exercises the imageSize/imageConfig plumbing that has never
// been fired at a live endpoint. The returned pixel dimensions tell us whether it took effect.
//
// What to judge, in order:
//   1. Are there N cells, with clean straight gutters?
//   2. Is each cell a DIFFERENT beat, or did it repeat/blend them?
//   3. Did characters stay consistent cell to cell?
//   4. Is the per-cell resolution usable as a sketch?
//
// PAID — 2 image generations. Requires RUN=1.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');

const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/sheet';
const RUN = process.env.RUN === '1';
const SIZE = process.env.SIZE || '4K';

const BEATS = [
  'Vael (Kwisheen: humanoid torso, two arms, six-tentacle lower body, bare chest with a scaled shoulder-pauldron) hangs still in open water, lantern raised, looking off-frame left. WIDE, full body.',
  'Mira (human, laced leather jerkin and breeches, sword drawn) braces against a coral spur, looking up. MEDIUM, full body.',
  'The Kwisheen raider surges in from frame right, spear-tentacle high and cutlass low. WIDE, full body, strong diagonal.',
  'Vael and the raider lock weapons, tentacles tangled between them. MEDIUM two-shot.',
  'Mira drives her blade up under the raider\'s guard. CLOSE on the two of them, upper bodies only.',
  'The raider recoils into the silt, lantern light falling away. WIDE, low angle from below.'
];

function sheetPrompt(rows, cols, n) {
  return 'A SINGLE IMAGE laid out as a ' + cols + ' x ' + rows + ' GRID of ' + n +
    ' equal rectangular panels, separated by clean straight white gutters, like a comic page. ' +
    'Each panel is a SEPARATE moment with its own camera and staging — do NOT repeat a panel, do NOT let one ' +
    'panel\'s figures cross into another, and do NOT blend them into one continuous picture. ' +
    'Draw the panels in READING ORDER, left to right, then top to bottom:\n' +
    BEATS.slice(0, n).map(function (b, i) { return 'PANEL ' + (i + 1) + ': ' + b; }).join('\n') +
    '\n\nThe same characters recur across panels and must stay recognisably the SAME person in each: ' +
    'Vael the Kwisheen (humanoid above the waist, six-tentacle mantle below, no human legs), ' +
    'Mira the human (two human legs, no tentacles anywhere), and the Kwisheen raider. ' +
    'Do NOT draw panel numbers, captions, borders with writing, or any lettering.';
}

const SHEETS = [
  { id: 'A_2x2_4panels', rows: 2, cols: 2, n: 4 },
  { id: 'B_3x2_6panels', rows: 2, cols: 3, n: 6 }
];

(async () => {
  console.log('─'.repeat(72));
  console.log('CONTACT-SHEET TEST — can one canvas hold N distinct panels?');
  console.log('─'.repeat(72));
  SHEETS.forEach(s => console.log(`  ${s.id.padEnd(18)} ${s.cols}x${s.rows} = ${s.n} panels, requested ${SIZE}`));
  console.log(`  ESTIMATED: ~$${(SHEETS.length * (SIZE === '4K' ? 0.151 : 0.067)).toFixed(2)}`);
  console.log(`  output   : ${OUT}`);
  console.log('─'.repeat(72));
  if (!RUN) { console.log('DRY RUN — no API calls. Re-run with RUN=1 to spend.\n'); process.exit(0); }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  page.on('console', m => { const t = m.text(); if (/imageConfig|STRUCTURAL-PASS|IMAGE\]/i.test(t)) console.error('   >', t.slice(0, 165)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._genStructuralLineArt === 'function', { timeout: 40000 });

  for (const s of SHEETS) {
    process.stdout.write(`\n  ${s.id} … `);
    const t0 = Date.now();
    const url = await page.evaluate(async ({ prompt, SIZE }) => {
      window._stageARefs = false;                       // no refs — isolate the LAYOUT question
      return await window._genStructuralLineArt(prompt, null, { imageSize: SIZE, aspectRatio: '1:1' });
    }, { prompt: sheetPrompt(s.rows, s.cols, s.n), SIZE });

    if (!url) { console.log(`FAILED (no image) after ${((Date.now()-t0)/1000).toFixed(0)}s`); continue; }
    const buf = Buffer.from(url.split(',')[1], 'base64');
    const f = path.join(OUT, s.id + '.png');
    fs.writeFileSync(f, buf);
    // PNG header: width/height are big-endian uint32 at byte offsets 16 and 20.
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    console.log(`${w}x${h}px, ${(buf.length/1024).toFixed(0)}KB, ${((Date.now()-t0)/1000).toFixed(0)}s`);
    console.log(`      per-cell if the grid is clean: ~${Math.round(w/s.cols)}x${Math.round(h/s.rows)}px`);
    console.log(`      requested ${SIZE} → ${w >= 3500 ? '4K CONFIRMED' : w >= 1800 ? '2K' : w > 1100 ? String(w) : '1K (imageConfig did NOT take effect)'}`);
  }
  console.log(`\nSaved → ${OUT}\n`);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
