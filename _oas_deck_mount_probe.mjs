// WHERE IS THE OAS DECK? Provider-free, $0. Evidence, not another guess.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { findFSDef, launchFS, unlockFS, finalizePreview, enterOAS } from './_fs_story_setup.mjs';
import { stageOf, isProviderEndpoint, oasTurn, OAS_TURNS } from './_replay_fixtures.mjs';
import { setupStageOf, SETUP_RESPONSES } from './_reader_setup_fixtures.mjs';

const browser = await chromium.launch();
const page = await browser.newPage();
let n = 0;
await page.route('**/api/**', async (route) => {
  const req = route.request(); const url = req.url();
  if (/\/api\/config/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ supabaseUrl: 'http://localhost:3000/_h', supabaseAnonKey: 'h' }) });
  if (!isProviderEndpoint(url)) return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, fortunesRemaining: 9999, entitled: true, storypassEligible: true }) });
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let sys = ''; try { sys = String((JSON.parse(raw || '{}').messages || [])[0]?.content || ''); } catch (_) {}
  if (stageOf(sys) === 'oas') { const b = oasTurn(Math.min(n++, OAS_TURNS.length - 1));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: b }) }); }
  const st = setupStageOf(sys);
  if (st && SETUP_RESPONSES[st]) return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: JSON.stringify(SETUP_RESPONSES[st]) }) });
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '{}' }) });
});

const snap = (label) => page.evaluate((l) => {
  const hidden = (el) => {
    const chain = [];
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || e.classList.contains('hidden')) {
        chain.push((e.id || e.className || e.tagName).toString().slice(0, 40)
          + ' {display:' + cs.display + ', visibility:' + cs.visibility + '}');
      }
    }
    return chain;
  };
  const look = (id) => {
    const el = document.getElementById(id);
    if (!el) return { exists: false };
    return { exists: true, cards: el.querySelectorAll('.fate-card').length,
      visible: el.offsetParent !== null, hiddenBy: hidden(el) };
  };
  const screens = [...document.querySelectorAll('[id$="Screen"], #game, #gnReader')]
    .map(e => ({ id: e.id, visible: e.offsetParent !== null }));
  return { label: l, currentScreen: window._currentScreen || null,
    screensVisible: screens.filter(s => s.visible).map(s => s.id),
    cardMount: look('cardMount'), gnCardMount: look('gnCardMount'),
    fateOptions: (window.state.fateOptions || []).length,
    dealFn: typeof window.dealFateCards,
    refreshFn: typeof window._refreshFateCardsForIntimacy,
    devPopulateFn: typeof window._populateDevFateCardsInGNMount };
}, label);

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._advanceStagedScene === 'function', { timeout: 30000 });
await page.evaluate(() => { window.state.profileId = 'p'; window.state.fortunes = 9999;
  window.state.storypassEligible = true; window.state.subscribed = true; });

const out = [];
const def = await findFSDef(page); await launchFS(page, def);
out.push(await snap('after launch'));
await unlockFS(page, 'deck-probe'); await finalizePreview(page);
out.push(await snap('after unlock + finalize'));
await enterOAS(page, { settleMs: 9000 });
out.push(await snap('INSIDE THE OAS'));

out.forEach(s => {
  console.log('\n── ' + s.label);
  console.log('   screen=' + s.currentScreen + '  visible screens=' + JSON.stringify(s.screensVisible));
  console.log('   #cardMount   : ' + JSON.stringify(s.cardMount));
  console.log('   #gnCardMount : ' + JSON.stringify(s.gnCardMount));
  console.log('   state.fateOptions=' + s.fateOptions
    + '  dealFateCards=' + s.dealFn + '  refresh=' + s.refreshFn + '  devPopulate=' + s.devPopulateFn);
});
fs.mkdirSync('_audit_out/deck', { recursive: true });
fs.writeFileSync('_audit_out/deck/probe.json', JSON.stringify(out, null, 2));
await browser.close();
