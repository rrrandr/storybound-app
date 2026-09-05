import { chromium } from 'playwright-core';
const b = await chromium.launch({ headless: true, channel: 'chrome' });
const p = await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForFunction(() => window.state && typeof window.commitCanonicalLoveInterest === 'function', { timeout: 30000 });
const r = await p.evaluate(() => {
  const poolM = window._LI_NAME_POOL_M, poolF = window._LI_NAME_POOL_F;
  const rot = window._rotatingExemplars;
  let picked = null, threw = null;
  try { picked = (typeof rot === 'function') ? rot('li_name', poolM, 1) : 'no rot'; } catch(e){ threw = e.message; }
  const s = { liGender: 'Male', archetype: { primary: 'BEAUTIFUL_RUIN' } };
  const canon = window.commitCanonicalLoveInterest(s, { at: 'test' });
  return {
    poolM_isArray: Array.isArray(poolM), poolM_len: Array.isArray(poolM) ? poolM.length : String(poolM), poolM_sample: Array.isArray(poolM) ? poolM.slice(0,3) : null,
    rot_type: typeof rot, picked, threw, commitResult: canon
  };
});
console.log(JSON.stringify(r, null, 2));
await b.close(); process.exit(0);
