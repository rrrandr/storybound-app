// PILOT PREFLIGHT — CAPTURE ONLY. Drives the exact intended pilot path with EVERY /api/** POST answered locally
// ({content:'{}'} — one real proxy shape) and records each ATTEMPTED dispatch: endpoint, role, model, bytes,
// max_tokens, conservative governor reservation (utf8 bytes + max_tokens) and admissibility vs the governor's
// per-model TPM. Nothing reaches a provider. Under stubs some downstream passes may not run (their inputs are
// empty) — the record therefore lists what the path ATTEMPTS, and each row is checked against the code separately.
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';
const TPM = { 'mistral-small-latest': 20000, 'mistral-small-2603': 20000, 'ministral-3b-2512': 1300000, 'ministral-8b-2512': 625000, 'ministral-14b-2512': 937500 };
const utf8 = s => Buffer.byteLength(String(s == null ? '' : s), 'utf8');
const rows = []; let phase = 'boot';
const browser = await chromium.launch({ headless: true }); const page = await (await browser.newContext()).newPage();
await installSession(page);
await page.route('**/sb-test.localhost/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
await page.route('**/api/**', async route => {
  const r = route.request(); const url = r.url().replace(/^https?:\/\/[^/]+/, '');
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(r.url())) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (r.method() !== 'POST') return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  let b = {}; try { b = JSON.parse(r.postData() || '{}'); } catch (_) {}
  if (!/csp-report|beta-events/.test(url)) {
    const msgs = Array.isArray(b.messages) ? b.messages : []; let bytes = 0; for (const m of msgs) bytes += utf8(m && m.content);
    if (!msgs.length && b.prompt) bytes = utf8(b.prompt);
    const model = b.model || b.preferredModel || b.mistralModel || null; const maxTok = Number(b.max_tokens || b.maxTokens || 0) || 0;
    const reserve = bytes + maxTok; const tpm = model && TPM[model] != null ? TPM[model] : null;
    rows.push({ phase, url, role: b.role || null, model, bytes, max_tokens: maxTok, reserve, governed: /mistral-proxy/.test(url), tpm, admitted: tpm == null ? null : reserve <= tpm, sysHead: String(((msgs.find(m => m.role === 'system') || {}).content) || '').slice(0, 70), usrHead: String(((msgs.find(m => m.role === 'user') || {}).content) || '').slice(0, 40), reasoning: b.reasoningEffort || b.reasoning_effort || null });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '{}' }) });
});
const t0 = Date.now(); let ok = false;
while (Date.now() - t0 < 240000 && !ok) { try { await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 }); await page.waitForFunction(() => window.state && window.handleBeginStory && window.StoryPagination, { timeout: 60000 }); ok = true; } catch (_) { await new Promise(r => setTimeout(r, 3000)); } }
if (!ok) throw new Error('server never answered');
// ── exact pilot configuration: corridor literary, Modern / small town / Billionaire / Enemies / Earnest / first person,
//    SWEET intensity (keeps the run out of OAS), preload OFF, tier routing default (production).
await page.evaluate(() => {
  const s = window.state; window.__disableSpeculativePreload = true;
  s.picks = Object.assign(s.picks || {}, { world: 'Modern', worldSubtype: 'small_town', tone: 'Earnest', flavor: 'Billionaire', dynamic: 'Enemies', pov: 'first_person', length: 'fling', intensity: 'low', archetype: { primary: 'BEAUTIFUL_RUIN' }, playerMask: 'OPEN_VEIN', loveInterest: 'Male', identity: { playerName: 'Testa', partnerName: 'Rook' } });
  Object.assign(s, { name: 'Testa', playerName: 'Testa', loveInterestName: 'Rook', partnerName: 'Rook', loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling', access: 'sub', subscribed: true, fortunes: 9999999, intensity: 'low', pov: 'first_person', identity: { playerName: 'Testa', partnerName: 'Rook' }, gender: 'Female', archetype: { primary: 'BEAUTIFUL_RUIN' } });
  s._skipCorridorValidation = true;
});
phase = 'scene1:handleBeginStory';
if (process.env.SEED_ONLY !== '1') { try { await page.evaluate(() => Promise.race([window.handleBeginStory(), new Promise(x => setTimeout(x, 150000))])); } catch (e) { rows.push({ phase, error: String(e && e.message).slice(0, 160) }); } }
await page.waitForTimeout(4000);
const s1 = await page.evaluate(() => ({ pages: window.StoryPagination.getPageCount(), turn: window.state.turnCount, quotaBusy: window.state._scene1QuotaBusy || null, fatal: window.state._scene1SkeletonFatal || null, hasSys: !!window.state.sysPrompt }));
// continuation turns 2 and 3 through the real handler (if Scene 1 did not mount, seed a page so the handler runs)
await page.evaluate(() => { const s = window.state; if (window.StoryPagination.getPageCount() === 0) { const one = 'Seeded page for the continuation capture. '.repeat(60); window.StoryPagination.init(); window.StoryPagination.clear(); window.StoryPagination.addPage('<p>' + one + '</p>', true); s.scenes = [{ title: '', synopsis: '', text: one, fateCard: null }]; s.turnCount = 0; s._sceneTextRing = [{ text: one }]; s._priorSceneText = one; if (!s.sysPrompt) s.sysPrompt = 'STORYBOUND ARCHITECTURE LAWS — (seeded because Scene 1 did not mount under stubs)'; s.storyId = s.storyId || 'preflight-1'; } });
for (const [i, act] of [['scene2', 'I follow him out to the parking lot and ask what he wants.'], ['scene3', 'I refuse the offer and walk back inside.']]) {
  phase = i + ':submit'; const before = rows.length;
  await page.evaluate((a) => { document.getElementById('actionInput').value = a; document.getElementById('dialogueInput').value = ''; const b = document.getElementById('submitBtn'); b.disabled = false; b.click(); }, act);
  for (let w = 0; w < 150000; w += 2500) { await page.waitForTimeout(2500); if (rows.slice(before).some(r => /NARRATIVE_AUTHOR/.test(r.role || '') || /grok-4\.3/.test(r.model || ''))) { await page.waitForTimeout(12000); break; } }
}
const s3 = await page.evaluate(() => ({ pages: window.StoryPagination.getPageCount(), turn: window.state.turnCount }));
fs.writeFileSync(process.env.SEED_ONLY === '1' ? '_validate_out/pilot_preflight_capture_continuation.json' : '_validate_out/pilot_preflight_capture.json', JSON.stringify({ scene1State: s1, endState: s3, rows }, null, 2));
console.log(JSON.stringify({ scene1State: s1, endState: s3, dispatches: rows.length }));
await browser.close();
