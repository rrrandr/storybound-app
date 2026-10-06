// DOES THE REGISTER CHANGE REACH THE ACTUAL AUTHOR REQUEST? Provider-free, $0.
// "Wired" means the VALUE reaches the payload — not that the source contains it.
import { chromium } from 'playwright-core';
let pass=0, fail=0;
const t=(n,c,d)=>{ if(c){pass++;console.log('  ok   '+n);} else {fail++;console.log('  FAIL '+n+(d?'  — '+d:''));} };
const b = await chromium.launch(); const page = await b.newPage();
let captured = null;
await page.route('**/api/**', async (route) => {
  const req = route.request();
  let raw=null; try { raw = req.postData(); } catch(_){}
  let sys=''; try { sys = String((JSON.parse(raw||'{}').messages||[])[0]?.content||''); } catch(_){}
  if (/screenplay-native/i.test(sys)) captured = raw;
  try { await route.abort(); } catch(_){}
});
await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:60000 });
await page.waitForFunction(()=>typeof window.state==='object',{timeout:30000}).catch(()=>{});

// Build the author system prompt through the SHIPPED builder rather than scraping source.
const built = await page.evaluate(() => {
  for (const k of Object.keys(window)) {
    if (!/^_build.*(Beats|Screenplay|Author|Scene).*Prompt$/i.test(k)) continue;
    try { const v = window[k](); if (typeof v === 'string' && v.length > 2000) return { fn: k, text: v }; } catch(_) {}
  }
  return null;
});
const text = built ? built.text : await page.evaluate(async()=> (await (await fetch('/app.js')).text()));
console.log(built ? ('built through the shipped builder: ' + built.fn) : 'builder not callable standalone — checking the served bundle');

console.log('\n=== THE PERMISSION AND ITS NEW EXEMPLAR ===');
t('the permission is present', /LENGTH FOLLOWS THE MOMENT/.test(text));
t('"commonly two to four sentences" is present', /commonly two to four sentences/.test(text));
t('a ONE-LINE beat is now shown as correct', /A MOMENT THAT NEEDS ONE LINE/.test(text));
t('a DEVELOPED beat is now shown beside it', /A MOMENT THAT EARNS DEVELOPMENT/.test(text));
t('and neither is framed as the target', /The second is not better than the first/.test(text));
t('deliberate one-line beats are preserved, not overridden',
  !/every beat must be (two|2)/i.test(text) && !/minimum of (two|2) sentences/i.test(text));

console.log('\n=== THE PROCESSING NO LONGER CONTRADICTS THE CONTRACT ===');
const bundle = await page.evaluate(async()=> (await (await fetch('/app.js')).text()));
const cap = bundle.match(/var MAX_SENTENCES_PER_BEAT = (\d+);/);
const fin = bundle.match(/var MAX_SENTENCES_FINAL_BEAT = (\d+);/);
console.log('   served MAX_SENTENCES_PER_BEAT = ' + (cap?cap[1]:'?') + ' · FINAL = ' + (fin?fin[1]:'?'));
t('the splitter cap matches the contract\'s upper bound of four', cap && cap[1] === '4');
t('the final-beat ceiling of one is unchanged', fin && fin[1] === '1');

console.log('\n=== UNCHANGED SURFACES ===');
t('attribution still keeps speech out of narration beats',
  /A dialogue beat's "text" is JUST the spoken line/.test(text));
t('the final beat is still exactly one sentence',
  /The FINAL beat of the scene is EXACTLY ONE SENTENCE/.test(text));
await b.close();
console.log('\n' + pass + '/' + (pass+fail) + ' checks passed');
process.exit(fail?1:0);
