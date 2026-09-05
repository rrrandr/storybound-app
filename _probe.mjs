import { chromium } from 'playwright';
const b = await chromium.launch({ headless:true });
const p = await b.newContext().then(c=>c.newPage());
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
await p.waitForTimeout(4000);
const probe = await p.evaluate(()=>({
  hasState: typeof window.state, hasUpdate: typeof window.updateFortuneDisplay,
  hasGrant: typeof window.grantTasteBookFortune, hasBegin: typeof window.handleBeginStory,
  hasWidget: !!document.getElementById('fortuneWidget'), hasLib: !!document.getElementById('vaultLibraryScreen')
}));
console.log('probe:', JSON.stringify(probe));
console.log('pageerrors:', JSON.stringify(errs.slice(0,3)));
await b.close();
