// WHAT DOES THE OAS ACTUALLY DO? Provider-free, $0. Every /api/ aborted; we watch what it tries.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { stageOf, isProviderEndpoint } from './_replay_fixtures.mjs';
import { findFSDef, launchFS, unlockFS, enterOAS } from './_fs_story_setup.mjs';
const b = await chromium.launch(); const page = await b.newPage();
const calls = []; const logs = [];
page.on('console', (m) => { const x = m.text();
  if (/\[BAKED|\[OAS|\[INTIMACY|\[INTIMATE|\[STAGED|\[CG|intimac/i.test(x)) logs.push(x); });
await page.route('**/api/**', async (route) => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let sys = ''; try { sys = String((JSON.parse(raw || '{}').messages || [])[0]?.content || ''); } catch (_) {}
  if (isProviderEndpoint(url)) calls.push({ url, stage: stageOf(sys), sysHead: sys.slice(0, 150) });
  try { await route.abort(); } catch (_) {}
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._launchStarterStory === 'function', { timeout: 30000 });
const def = await findFSDef(page); await launchFS(page, def);
const hasBtn = await page.evaluate(() => !!document.getElementById('bakedOASEnterBtn'));
console.log('OAS affordance mounted at launch: ' + hasBtn);
await unlockFS(page, 'oas-probe');
const r = await enterOAS(page);
console.log('enterOAS -> ' + JSON.stringify(r));
console.log('\nPROVIDER CALLS THE OAS ATTEMPTED (' + calls.length + '):');
calls.forEach(c => console.log('  ' + c.stage + '  ' + c.url + '\n      ' + c.sysHead.replace(/\s+/g, ' ')));
console.log('\nLOG LINES:');
logs.slice(-18).forEach(l => console.log('  · ' + l.slice(0, 190)));
fs.mkdirSync('_audit_out/oas', { recursive: true });
fs.writeFileSync('_audit_out/oas/probe.json', JSON.stringify({ hasBtn, r, calls, logs }, null, 2));
await b.close();
