// Direct, targeted diagnostic (main-session, not delegated): classifies EVERY outbound model-shaped
// request during real Genesis-gate setup + one resubmit, by matching FULL system-prompt content
// against known markers — not guessing from a 100-char head. No paid call: every /api/** answered
// locally. Reuses the proven launch chain (installEntitledProfileStub, real clicks through
// #bakedOASEnterBtn -> #buGoBtn -> real Genesis charge -> one-on-one -> real turn -> exit ->
// interruption -> card -> Submit -> one resubmit), matching what _cg_oas_library_reload_proof.mjs
// already proves reaches this point honestly.
import { chromium } from 'playwright-core'; import fs from 'fs';
import { installSession, configBody, isAuthOrigin, installEntitledProfileStub } from './_test_session_env.mjs';
const F = await import('./_seed_fixtures.generated.mjs');

const MARKERS = [
  ['pcBodyBible',          s => /DISTINGUISHING FEATURE \(anti-calcification ROTATION — HARD\): this character/.test(s)],
  ['liBodyBible',          s => /DISTINGUISHING FEATURE \(anti-calcification ROTATION — HARD\): this love interest/.test(s)],
  ['antagonistBodyBible',  s => /You are generating an ANTAGONIST BODY BIBLE/.test(s)],
  ['rplot',                s => /designing an R-PLOT/.test(s)],
  ['scaffold',             s => /CONTINUITY ARCHITECT/.test(s)],
  ['pcBible_crisisReroll', s => /rewrite the CURRENT CRISIS of a billionaire-world romance heroine/.test(s)],
  ['pcBible_tellReroll',   s => /rewrite 5 body-tell fields for a romance heroine bible/.test(s)],
  ['oasDialogue',          s => /opening an intimate dialogue/.test(s)],
  ['fatePreviews',         s => /uninhibited romance fiction author/.test(s)],
  ['sceneSpine',           s => /SCENE-SPINE planner/.test(s) || /"hardBeats"/.test(s)],
  ['runtimeCommitVerifier',s => /RUNTIME COMMIT verifier/.test(s)]
];
function classify(sys, usr) {
  const hay = sys + '\n' + usr;
  const hits = MARKERS.filter(([, t]) => t(hay)).map(([k]) => k);
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) return 'MULTI:' + hits.join('+');
  const genericHits = F.REQUEST_KINDS ? F.REQUEST_KINDS.filter(([, t]) => t(hay, sys, usr)).map(([k]) => k) : [];
  return genericHits.length === 1 ? 'generic:' + genericHits[0] : 'TRULY_UNKNOWN';
}

const rows = [];
const browser = await chromium.launch({ headless: true }); const page = await (await browser.newContext()).newPage();
await installSession(page);
await page.route('**/sb-test.localhost/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
await installEntitledProfileStub(page);
await page.route('**/api/**', async route => {
  const url = route.request().url(); const p = new URL(url).pathname;
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (F.PASSTHROUGH.test(url)) return route.continue();
  if (/\/api\/consume-fortune\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, fortunesRemaining: 9999 }) });
  if (/\/api\/(geo|csp-report|beta-events|verify-subscription|bug-report-awards|image|bfl-kontext)\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (F.LOCAL[p]) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(F.LOCAL[p]) });
  if (!/\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini|anthropic-proxy)\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const flat = m => typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(x => x && x.text || '').join('\n') : '');
  const sys = (b.messages || []).filter(m => m.role === 'system').map(flat).join('\n');
  const usr = (b.messages || []).filter(m => m.role === 'user').map(flat).join('\n');
  const kind = classify(sys, usr);
  rows.push({ n: rows.length + 1, endpoint: p, declaredRole: b.role || null, model: b.model || b.preferredModel || null, classified: kind, sysBytes: Buffer.byteLength(sys,'utf8'), usrBytes: Buffer.byteLength(usr,'utf8'), sysHead: sys.slice(0,120).replace(/\n/g,' ') });
  let content = '{}';
  if (kind === 'fatePreviews') content = ['TEMPTATION ||| amplify ||| x ||| y','SILENCE ||| redirect ||| x ||| (no words)','REVERSAL ||| flip ||| x ||| y','BOUNDARY ||| hold ||| x ||| y','CONFESSION ||| reveal ||| x ||| y'].map((l,i)=>l).join('\n');
  else if (kind === 'sceneSpine') content = JSON.stringify({ tactical_move:'x', state_change_precondition:'x', state_change:'x', forces_choice:'x', branch_a:'x', branch_b:'x' });
  else if (kind === 'planner') content = F.plannerReply ? F.plannerReply(usr, null) : '{}';
  else if (kind === 'author') content = F.PROSE || 'prose';
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id:'classify', choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content}}] }) });
});

let up = false; const t0 = Date.now();
while (Date.now() - t0 < 120000 && !up) { try { await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout: 20000 }); await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_STORIES && window._bakedScene1For, null, { timeout: 60000 }); up = true; } catch (_) { await page.waitForTimeout(3000); } }
if (!up) { console.log('server never answered'); process.exit(2); }
await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(()=>{});
await page.waitForTimeout(1000);
await page.evaluate(() => { window._bibleDupeTrace = true; });
page.on('console', m => { const t = m.text(); if (t.indexOf('[BIBLE-DUPE-TRACE]') === 0) console.log(t); });
await page.evaluate(() => { const def = window.STARTER_STORIES.find(d => d.id === 'starter_first_sacrifice'); window._launchStarterStory(def); });
await page.waitForTimeout(6000);
const oasVisible = await page.evaluate(() => { const el = document.getElementById('bakedOASEnterBtn'); return !!(el && el.getClientRects().length > 0); });
console.log('[DEBUG] oasVisible after launch: ' + oasVisible + ' currentScreen=' + await page.evaluate(() => window._currentScreenId));
if (!oasVisible) { console.log('[STOP] one-on-one button never appeared — cannot proceed'); await browser.close(); process.exit(2); }
// A background auto-boot "resume/begin story" attempt against empty corridor picks (a side effect
// of the honest entitled-profile stub looking fully onboarded) can pop an unrelated debris modal —
// dismiss it through its own real Close button, exactly as the prior honest reload-proof work did.
const debrisModal = await page.evaluate(() => !!document.querySelector('.missing-selections-modal.visible'));
if (debrisModal) { console.log('[DEBUG] dismissing unrelated missing-selections-modal debris via its own real Close button'); await page.click('.missing-selections-close-btn').catch(()=>{}); await page.waitForTimeout(300); }
await page.click('#bakedOASEnterBtn');
await page.waitForSelector('#buGoBtn', { state: 'visible', timeout: 15000 });
console.log('[DEBUG] Genesis modal reached, rows so far: ' + rows.length);
const genesisMarker = rows.length;
await page.click('#buGoBtn');
await page.waitForFunction(() => window._currentScreenId === 'gnReader', null, { timeout: 60000 });
console.log('[DEBUG] entered gnReader, rows so far: ' + rows.length);
await page.waitForTimeout(25000); // let deferred setup (bibles/scaffold/rplot/antagonist) finish firing
const afterGenesis = rows.length;
console.log('[DEBUG] after 25s settle, rows: ' + afterGenesis);

console.log('\n=== ' + rows.length + ' total classified requests (rows 1-' + genesisMarker + ' = boot/launch, ' + (genesisMarker+1) + '-' + afterGenesis + ' = Genesis-gate setup) ===');
rows.forEach(r => console.log(r.n + '. [' + r.classified + '] ' + r.endpoint + ' role=' + r.declaredRole + ' model=' + r.model + ' sysBytes=' + r.sysBytes + ' usrBytes=' + r.usrBytes + '\n   sysHead="' + r.sysHead + '"'));
fs.writeFileSync('/private/tmp/claude-501/-Users-romantsukerman-storybound-app/79822a26-4953-4e0a-b337-9520e623604d/scratchpad/genesis_setup_classification.json', JSON.stringify(rows, null, 2));
await browser.close();
process.exit(0);
