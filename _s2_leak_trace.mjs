// WHERE SHOULD THE RESERVATION BE ENFORCED AGAINST THE PROSE THE READER RECEIVES? $0, no provider.
// The detector today runs ONCE, inside _canonDeterministicCheck, on the PLANNER'S PROPOSAL.
// The authored prose is never passed through it. This asks whether that same detector, reused
// unchanged on the prose, would have caught the Scene 2 leak.
import { chromium } from 'playwright-core';
import fs from 'fs';
const j = JSON.parse(fs.readFileSync('_fs_live_out/run_2026-10-06T16-50-01-923Z/final.json','utf8'));
const t = (j.texts||[])[0]; const prose = typeof t === 'string' ? t : (t.text||'');
const b = await chromium.launch(); const page = await b.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:60000 });
await page.waitForFunction(()=>typeof window.state==='object',{timeout:30000}).catch(()=>{});
const SRC = await page.evaluate(async()=> (await (await fetch('/app.js')).text()));
const m = SRC.match(/var _RESERVED_ACT_RX = (\/.+?\/[gimsuy]*);/);
const actRx = m ? new Function('return ' + m[1])() : null;
const line = (prose.split('\n').find(l => /Chayr/.test(l)) || '').trim();
console.log('SCENE 2, ACCEPTED AND SHOWN TO THE READER:\n  ' + line + '\n');
console.log('(1) does the ACT gate open on this prose? ' + (actRx ? actRx.test(prose) : '?'));
if (actRx) { const hit = prose.match(actRx); console.log('    matched act phrase: ' + JSON.stringify(hit && hit[0])); }
const seg = SRC.slice(SRC.indexOf('var _LOC_PREP ='), SRC.indexOf('for (var i = 0; i < groups.length; i++)'));
const build = new Function('text', seg + '\n return _makeMarkerHit;');
const ti = SRC.indexOf('LIRAEL’S FORMAL INQUIRY');
const TRUTH = SRC.slice(ti, ti + 700);
const hits = ['dohkar','chayr','open','sacrificiant'].filter(build(prose)(TRUTH));
console.log('(2) markers the PROSE hits: ' + JSON.stringify(hits));
console.log('(3) >= 2 markers, so the same detector WOULD fire on the prose: ' + (hits.length >= 2));
console.log('\nAnd the lane the planner chose carries its own prohibition:');
const li = SRC.indexOf("do NOT name who convenes it");
console.log('  ' + SRC.slice(li, li + 150).replace(/\\"/g,'"'));
await b.close();
