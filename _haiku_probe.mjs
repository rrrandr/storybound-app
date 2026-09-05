import { chromium } from 'playwright-core';
import fs from 'fs';
const raw = fs.readFileSync('_validate_out/authority_audit_R/raw_author_1.txt','utf8')
  .replace(/^\[(CHARACTERS|TITLE|SYNOPSIS)[^\]]*\]\s*/gm,'').trim();
const b = await chromium.launch({headless:true});
const page = await (await b.newContext()).newPage();
await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForFunction(()=>window.state && window._targetedSceneEdit,{timeout:90000});
const out = await page.evaluate(async (raw) => {
  Object.assign(window.state,{playerName:'Lirael',loveInterestName:'Julian',pov:'first_person',turnCount:0});
  const instr = 'Strengthen the sense of physical environment in one or two places. Keep EVERYTHING else verbatim.';
  const after = await window._targetedSceneEdit(raw, instr);
  return { changed: after !== raw, before: raw.length, after: (after||'').length, text: after||'' };
}, raw);
fs.writeFileSync('_validate_out/haiku_probe.txt', out.text);
const canon = w => ({ Dohkar:(out.text.match(/Dohkar/g)||[]).length, Julian:(out.text.match(/Julian/g)||[]).length });
console.log('changed:', out.changed, out.before, '->', out.after);
console.log('  raw     Dohkar=%d Julian=%d', (raw.match(/Dohkar/g)||[]).length, (raw.match(/Julian/g)||[]).length);
console.log('  after   Dohkar=%d Julian=%d', (out.text.match(/Dohkar/g)||[]).length, (out.text.match(/Julian/g)||[]).length);
await b.close();
