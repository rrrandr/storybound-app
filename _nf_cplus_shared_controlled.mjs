// CONTROLLED BEFORE/AFTER for _buildCharacterPlusShared — fixed state, both voice arms.
// usage: node _nf_cplus_shared_controlled.mjs <label>
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { configBody, isAuthOrigin, installSession, makeSession, installEntitledProfileStub }
  from './_test_session_env.mjs';
const OUT = '/Users/romantsukerman/storybound-app/_nf_cplus_shared_out';
fs.mkdirSync(OUT, { recursive: true });
const LABEL = process.argv[2] || 'live';
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await installSession(page, makeSession()); await installEntitledProfileStub(page, {});
await page.route('**/api/**', async (route) => {
  const req = route.request(); const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(req.url())) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  return route.abort();
});
await page.route('**/sb-test.localhost/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 60000 });
await page.waitForFunction(() => window._buildCharacterPlusShared && window._WORLD_SENSORY, null, { timeout: 180000 });
const res = await page.evaluate(() => {
  const S = window.state;
  Object.assign(S, { world: 'Fatelands', worldSubtype: 'the_veilwood', flavor: 'Fatelands',
    name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
    loveInterest: 'Male', pov: 'first_person', turnCount: 3, renderMode: 'literary',
    currentEngine: 'literary', archetype: { primary: 'OPEN_VEIN', modifier: null },
    picks: { world: 'Fatelands', worldSubtype: 'the_veilwood', flavor: 'Fatelands' } });
  const probe = (t) => ({
    chars: t.length,
    sensoryListings: (t.match(/· veilwood — rain on silk bark/g) || []).length,
    recurrenceRule: /Full sensory beat on first appearance only/.test(t),
    factsNotOmensRule: /are FACTS, not omens/.test(t),
    meanNothingClause: /mean nothing by themselves/.test(t),
    anchorsDirection: (t.match(/sensory anchors listed (above|below)/) || [])[1] || null,
    ePlusRoute: /ONE E\+ ROUTE — CHAIN/.test(t),
    fusionTeaching: /ENVIRONMENT\+/.test(t),
  });
  const out = {};
  window._authorVoice = undefined;  out.voiceON  = probe(String(window._buildCharacterPlusShared({ stateful: false }) || ''));
  window._authorVoice = 'legacy';   out.voiceOFF = probe(String(window._buildCharacterPlusShared({ stateful: false }) || ''));
  window._authorVoice = undefined;
  return out;
});
await browser.close();
fs.writeFileSync(OUT + '/probe__' + LABEL + '.json', JSON.stringify(res, null, 2));
for (const arm of ['voiceON', 'voiceOFF']) {
  const r = res[arm];
  console.log(`[${LABEL}] ${arm}: ${r.chars.toLocaleString()} chars · sensory listings ${r.sensoryListings}`
    + ` · recurrenceRule ${r.recurrenceRule} · factsNotOmens ${r.factsNotOmensRule}`
    + ` · meanNothing ${r.meanNothingClause} · anchors "${r.anchorsDirection}" · E+route ${r.ePlusRoute} · ENVIRONMENT+ ${r.fusionTeaching}`);
}
