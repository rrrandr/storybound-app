// CONTINUATION DELIVERY REGRESSION — the gate on removing the duplicated opener copy.
//
// The twist physics is currently delivered TWICE in Scene 1: once by the wish-demo opener
// and once by the resolve-time adjudication layer. That is deliberate. The failure mode
// being fought is SILENT LOSS of creative constraints, and reliability beats elegance
// until the delivery graph is proven.
//
//     DO NOT REMOVE THE OPENER COPY UNTIL PART 2 BELOW PASSES AGAINST A REAL PAYLOAD.
//
//   part 1 (free, always runs): the physics is defined ONCE and the resolve-time layer
//           carries all of it, while the content gate still holds when no wish resolves.
//   part 2 (needs a real, non-stub run dir): the physics is actually PRESENT in a
//           continuation author payload. A stub capture cannot answer this — the canon is
//           content-gated on _ltScene, which a stubbed planner leaves empty.
//
// usage: node _verify_twist_layer.mjs [_validate_out/REAL_RUN_DIR]
import { chromium } from 'playwright-core';
import fs from 'fs';

const PROBES = ['EXACTING, NOT MALICIOUS', 'TAKES ONLY WHAT WAS OFFERED', 'THREE CHANNELS, NEVER MIXED',
                'THE WISH-TWIST SEQUENCE', 'NEVER RECITE THE RULES', 'NAMED OFFICES TAKE PRIORITY',
                'THE TWIST IS AN EVENT', 'CAUSALLY VISIBLE'];
const n = PROBES.length;
let failed = 0;

// ── PART 1 — structure ────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window._buildFatelandsWishAdjudicationDirective, { timeout: 90000 });
const r = await page.evaluate((PROBES) => {
  const adjOn  = window._buildFatelandsWishAdjudicationDirective('Fate granted the wish and the price was paid.', false);
  const adjOff = window._buildFatelandsWishAdjudicationDirective('They walked along the road and said nothing.', false);
  const phys   = window._FATE_TWIST_PHYSICS || '';
  const count  = hay => PROBES.filter(p => String(hay).includes(p)).length;
  return { physChars: phys.length, physProbes: count(phys),
           adjOnProbes: count(adjOn), adjOnChars: adjOn.length, adjOffChars: adjOff.length };
}, PROBES);
await browser.close();

console.log('\nPART 1 — structure (free)');
console.log(`  _FATE_TWIST_PHYSICS defined      ${r.physChars} chars, ${r.physProbes}/${n} clauses`);
console.log(`  adjudication ON  (wish resolves) ${r.adjOnChars} chars, ${r.adjOnProbes}/${n} carried`);
console.log(`  adjudication OFF (no wish)       ${r.adjOffChars} chars  ${r.adjOffChars === 0 ? '— gate holds' : '— GATE LEAKS'}`);
const p1 = r.physProbes === n && r.adjOnProbes === n && r.adjOffChars === 0;
console.log(p1 ? '  PASS' : '  FAIL');
if (!p1) failed++;

// ── PART 2 — real continuation delivery ───────────────────────────────────────
const dir = process.argv[2];
console.log('\nPART 2 — delivery into a real continuation payload');
if (!dir) {
  console.log('  NOT RUN — pass a real (non-stub) run directory.');
  console.log('  UNTIL THIS PASSES, THE DUPLICATED OPENER COPY MUST STAY.');
} else {
  let stubbed = false;
  try { stubbed = !!JSON.parse(fs.readFileSync(`${dir}/capture_meta.json`, 'utf8')).stubbed; } catch (_) {}
  if (stubbed) {
    console.log(`  INCONCLUSIVE — ${dir} is a stub capture. Content-gated canon cannot load`);
    console.log('  behind a stubbed planner, so absence here proves nothing. Use a paid run.');
    failed++;                       // fail closed: never report a stub as a pass
  } else {
    const files = fs.readdirSync(dir)
      .filter(f => /^payload_\d+\.txt$/.test(f) || /^branch_.+_payload\.txt$/.test(f)).sort();
    // A continuation is any author payload carrying the spine block; Scene 1 has none.
    const conts = files.map(f => [f, fs.readFileSync(`${dir}/${f}`, 'utf8')])
      .filter(([, t]) => /ISSUE MILESTONE|SCENE SPINE/.test(t));
    if (!conts.length) { console.log('  INCONCLUSIVE — no continuation payload in ' + dir); failed++; }
    for (const [f, t] of conts) {
      const hit = PROBES.filter(p => t.includes(p)).length;
      const ok = hit === n;
      if (!ok) failed++;
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${f}  ${hit}/${n} clauses present`);
    }
    if (!failed) console.log('\n  The opener copy may now be removed — continuation delivery is proven.');
  }
}
console.log(failed ? `\n${failed} FAILURE(S)\n` : '\nOK\n');
process.exit(failed ? 1 : 0);
