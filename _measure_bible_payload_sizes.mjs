// Throwaway measurement script (main-session use, not a proof harness): real UTF-8 byte sizes +
// declared max_tokens for the pcBodyBible, liBodyBible, rplot, and scaffold requests, at the real
// Genesis-gate setup point. Reuses _baked_screen_probe.mjs's proven launch chain verbatim.
import { chromium } from 'playwright-core'; import fs from 'fs';
import { installSession, configBody, isAuthOrigin } from './_test_session_env.mjs';
const F = await import('./_seed_fixtures.generated.mjs');
const browser = await chromium.launch({ headless: true }); const page = await (await browser.newContext()).newPage();
const rows = [];
await installSession(page);
await page.route('**/sb-test.localhost/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
await page.route('**/api/**', async route => {
  const url = route.request().url(); const p = new URL(url).pathname;
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (F.PASSTHROUGH.test(url)) return route.continue();
  if (/\/api\/consume-fortune\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, fortunesRemaining: 9999 }) });
  if (F.LOCAL[p]) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(F.LOCAL[p]) });
  if (!F.MODEL.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const flat = m => typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(x => x && x.text || '').join('\n') : '');
  const sys = (b.messages || []).filter(m => m.role === 'system').map(flat).join('\n'), usr = (b.messages || []).filter(m => m.role === 'user').map(flat).join('\n');
  const sysBytes = Buffer.byteLength(sys, 'utf8'), usrBytes = Buffer.byteLength(usr, 'utf8');
  rows.push({ url: p, role: b.role || null, model: b.model || b.preferredModel || null, max_tokens: b.max_tokens || null, sysBytes, usrBytes, totalBytes: sysBytes + usrBytes, sysHead: sys.slice(0, 100).replace(/\n/g,' '), usrHead: usr.slice(0, 100).replace(/\n/g,' ') });
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'measure', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: '{"ok":true}' } }] }) });
});

let up = false; const t0 = Date.now();
while (Date.now() - t0 < 240000 && !up) { try { await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 }); await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_STORIES && window._bakedScene1For, null, { timeout: 60000 }); up = true; } catch (_) { await page.waitForTimeout(3000); } }
if (!up) { console.log('server never answered'); process.exit(2); }
await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1500);

await page.evaluate(() => { const list = Array.isArray(window.STARTER_STORIES) ? window.STARTER_STORIES : Object.values(window.STARTER_STORIES || {}); const def = list.find(d => d && d.id === 'starter_first_sacrifice'); window._launchStarterStory(def); });
await page.waitForTimeout(6000);
await page.click('#bakedOASEnterBtn').catch(e => console.log('click1 failed: ' + e.message));
await page.waitForTimeout(1500);
await page.click('#buCancelBtn').catch(e => console.log('cancel failed: ' + e.message));
await page.waitForTimeout(300);
await page.evaluate(() => { window._commitBakedScene(); window.state._bakedGenesisUnlocked = true; });
await page.click('#bakedOASEnterBtn').catch(e => console.log('click2 failed: ' + e.message));
// Entering the one-on-one is what actually kicks off the deferred bible/scaffold/rplot setup —
// give it real time to run its course.
await page.waitForTimeout(60000);

console.log('=== ' + rows.length + ' outbound model-shaped requests captured ===');
rows.forEach((r, i) => console.log((i+1) + '. ' + r.url + ' role=' + r.role + ' model=' + r.model + ' max_tokens=' + r.max_tokens + ' sysBytes=' + r.sysBytes + ' usrBytes=' + r.usrBytes + ' totalBytes=' + r.totalBytes + ' reservation=' + (r.totalBytes + (r.max_tokens||0)) + '\n   sysHead="' + r.sysHead + '"\n   usrHead="' + r.usrHead + '"'));
fs.writeFileSync('/private/tmp/claude-501/-Users-romantsukerman-storybound-app/79822a26-4953-4e0a-b337-9520e623604d/scratchpad/bible_payload_measurements.json', JSON.stringify(rows, null, 2));
await browser.close();
process.exit(0);
