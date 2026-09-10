// ═══ FIRST SACRIFICE SEED CONTRACT (Roman 2026-09-10, §42 C) ═══ read-only audit as a test. Launches the real starter through the
// production entry (window._launchStarterStory), with every model call answered locally. Asserts the fixed editorial Scene 1 mounts
// WITHOUT planner/author/charge, initialises ledger + pending-commit state, commits intact on unlock with turnCount 0 ("first
// continuation is Scene 2"), and captures the outbound Scene-2 CG packet to report which seed facts reach it. SEED=1 supplies a
// synthetic non-placeholder package through the same seam to prove hand-authored prose passes intact. No prose is authored here.
import { chromium } from 'playwright-core'; import fs from 'fs';
import { installSession, configBody, isAuthOrigin } from './_test_session_env.mjs';
const SEED = process.env.SEED === '1'; const OAS = process.env.OAS === '1';   // OAS=1: tap the CG Book's handoff (enters the one-on-one) instead of driving Scene 2 directly
const dry = fs.readFileSync('_scene1_stage_order_dry.mjs', 'utf8'); const sliceEnd = dry.indexOf('async function run(');
fs.writeFileSync('_seed_fixtures.generated.mjs', dry.slice(0, sliceEnd).replace(/^const results = \[\];[\s\S]*?\n(?=const)/m, '').replace(/^await preflight\(\);\s*$/m, '') + '\nexport { REQUEST_KINDS, plannerReply, scaffoldReply, APLOT_VALID, ANTAGONIST_BIBLE, PC_BIBLE, LI_BIBLE, GENERIC, PROSE, utf8, PASSTHROUGH, LOCAL, MODEL };\n');
const F = await import('./_seed_fixtures.generated.mjs');
const rows = []; const ok = (n, p, d) => { rows.push([n, !!p]); console.log((p ? 'PASS ' : 'FAIL ') + n + (p ? '' : '  — ' + d)); };
const browser = await chromium.launch({ headless: true }); const page = await (await browser.newContext()).newPage();
const logs = [], calls = [], charges = []; let cgRequest = null, oasRequest = null;
page.on('console', m => { const t = m.text(); if (/BAKED|SCENE1|CG:|SCREENPLAY|PLANNER|AUTHOR|LEDGER|GENESIS|PURCHASE|ISSUE|FORTUNE|charge/i.test(t)) logs.push(m.type() + ': ' + t.slice(0, 300)); });
page.on('dialog', async d => { logs.push('DIALOG: ' + d.message().slice(0, 200)); await d.dismiss(); });
await installSession(page);
await page.route('**/sb-test.localhost/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
await page.route('**/api/**', async route => {
  const url = route.request().url(); const p = new URL(url).pathname;
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (F.PASSTHROUGH.test(url)) return route.continue();
  if (/\/api\/consume-fortune\b/.test(url)) { let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {} charges.push(b); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, fortunesRemaining: 9999 }) }); }
  if (F.LOCAL[p]) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(F.LOCAL[p]) });
  if (!F.MODEL.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const flat = m => typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(x => x && x.text || '').join('\n') : '');
  const sys = (b.messages || []).filter(m => m.role === 'system').map(flat).join('\n'), usr = (b.messages || []).filter(m => m.role === 'user').map(flat).join('\n'); const txt = sys + '\n' + usr;
  const hits = F.REQUEST_KINDS.filter(([, t]) => t(txt, sys, usr)).map(([k]) => k); let kind = hits.length === 1 ? hits[0] : null;
  if (/screenplay-native cinematic-romance writer/.test(sys)) kind = 'cgScreenplay';
  if (/opening an intimate dialogue/.test(sys)) { kind = 'oasDialogue'; oasRequest = { sys, usr }; }
  calls.push(kind + '@' + (b.role || '-') + '@' + p);
  if (!kind) console.log('  [UNCLASSIFIED REQUEST] url=' + p + ' role=' + (b.role || '-') + ' model=' + (b.model || '-') + '\n     sys: ' + sys.replace(/\s+/g, ' ').slice(0, 260) + '\n     usr: ' + usr.replace(/\s+/g, ' ').slice(0, 260));
  if (kind === 'oasDialogue') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { role: 'assistant', content: '{}' } }] }) });
  if (kind === 'cgScreenplay') { cgRequest = { sys, usr, role: b.role, url: p }; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { role: 'assistant', content: '{}' } }] }) }); }
  let out;
  if (kind === 'planner') out = F.plannerReply(usr, null);
  else if (kind === 'author') out = F.PROSE;
  else if (kind === 'scaffold') { const ref = txt.match(/subject_ref:\s*(\S+)/); out = JSON.stringify(F.scaffoldReply(ref ? ref[1] : null, true)); }
  else if (kind === 'aplotGenerator' || kind === 'aplotCorrection') out = JSON.stringify(F.APLOT_VALID);
  else if (kind === 'antagonistBodyBible') out = JSON.stringify(F.ANTAGONIST_BIBLE);
  else if (kind === 'pcBodyBible') out = JSON.stringify(F.PC_BIBLE);
  else if (kind === 'liBodyBible') out = JSON.stringify(F.LI_BIBLE);
  else out = JSON.stringify(F.GENERIC);
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'seedtest', object: 'chat.completion', model: b.model, usage: { prompt_tokens: 0, completion_tokens: 0 }, _orchestration: { role: b.role || null, model: b.model }, choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: out } }] }) });
});
const t0 = Date.now(); let up = false; while (Date.now() - t0 < 240000 && !up) { try { await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 }); await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_STORIES && window.STARTER_SEEDS && window.STARTER_PLANS && window._bakedScene1For, { timeout: 60000 }); up = true; } catch (_) { await new Promise(r => setTimeout(r, 3000)); } }
if (!up) { console.log('server never answered'); await browser.close(); process.exit(2); }
const SYN = 'Lirael counted the seven lamps of the binding hall and found the eighth unlit, which was how she knew the Dohkar meant to finish before dark.';
const pre = await page.evaluate(({ synthetic, text }) => {
  const list = Array.isArray(window.STARTER_STORIES) ? window.STARTER_STORIES : Object.values(window.STARTER_STORIES || {});
  const def = list.find(d => d && d.id === 'starter_first_sacrifice');
  const pkg = window._bakedScene1For('starter_first_sacrifice');
  const seed = window.STARTER_SEEDS['starter_first_sacrifice'], plan = window.STARTER_PLANS['starter_first_sacrifice'];
  const cast = (seed && seed.cast || []).map(c => c && (c.name || c.role));
  if (synthetic) { const orig = window._bakedScene1For; window._bakedScene1For = function (id) { const p = orig(id); if (id !== 'starter_first_sacrifice' || !p) return p; const q = JSON.parse(JSON.stringify(p)); q.placeholder = false; q.version = '9.9.9-synthetic-test'; if (Array.isArray(q.panels)) q.panels = q.panels.map((pn, i) => Object.assign({}, pn, { prose: (i === 0 ? text : ('Panel ' + (i + 1) + ' synthetic prose, intact.')) })); q.prose = [text]; return q; }; }
  return { hasDef: !!def, defKeys: def ? Object.keys(def).slice(0, 12) : [], pkgPlaceholder: !!(pkg && pkg.placeholder), pkgFormat: pkg && pkg.format, pkgVersion: pkg && pkg.version, panelCount: pkg && Array.isArray(pkg.panels) ? pkg.panels.length : 0, firstPanel: pkg && pkg.panels && pkg.panels[0] ? String(pkg.panels[0].prose).slice(0, 140) : (pkg && pkg.prose ? String(pkg.prose).slice(0, 140) : ''), cast, planScenes: plan && Array.isArray(plan.scenes) ? plan.scenes.length : 0, worldTruths: seed && Array.isArray(seed.worldTruths) ? seed.worldTruths.length : (seed && seed.worldTruths ? Object.keys(seed.worldTruths).length : 0), emitted: pkg && pkg.emitted ? Object.keys(pkg.emitted) : [] };
}, { synthetic: SEED, text: SYN });
console.log('=== starter / package === ' + JSON.stringify(pre));
ok('S0 the starter definition, seed, plan and baked package all resolve for starter_first_sacrifice', pre.hasDef && pre.cast.length > 0 && pre.planScenes > 0, JSON.stringify(pre));
console.log((pre.pkgPlaceholder && !SEED) ? '  [REPORT] the mounted starter package is PLACEHOLDER prose (version ' + pre.pkgVersion + ', format ' + pre.pkgFormat + ', ' + pre.panelCount + ' panels): "' + pre.firstPanel + '"' : '  [REPORT] package version ' + pre.pkgVersion + ' placeholder=' + pre.pkgPlaceholder);
const callsBefore = calls.length, chargesBefore = charges.length;
await page.evaluate(() => { const list = Array.isArray(window.STARTER_STORIES) ? window.STARTER_STORIES : Object.values(window.STARTER_STORIES || {}); const def = list.find(d => d && d.id === 'starter_first_sacrifice'); return window._launchStarterStory(def); });
await page.waitForTimeout(5000);
const s1 = await page.evaluate(() => { const st = window.state; const led = (typeof window._sceneLedgerGet === 'function') ? window._sceneLedgerGet(st, false) : (st._sceneLedger || null);
  return { screen: document.body.className, storyId: st.storyId, starterId: st._starterId, pages: (window.StoryPagination && window.StoryPagination.getPageCount) ? window.StoryPagination.getPageCount() : null, pageText: Array.from(document.querySelectorAll('#storyText .story-page')).map(e => e.innerText || e.textContent || '').join('\n').slice(0, 600), turnCount: st.turnCount, scenes: Array.isArray(st.scenes) ? st.scenes.length : null, pending: !!st._bakedPendingCommit, pendingLen: st._bakedPendingCommit ? String(st._bakedPendingCommit.text || st._bakedPendingCommit.body || st._bakedPendingCommit.prose || '').length : 0, unlocked: !!st._bakedGenesisUnlocked, emitted: !!st._bakedEmitted, ledger: led ? JSON.stringify(led).slice(0, 300) : null, world: st.world, pcSpecies: st.pcSpecies || (st.picks && st.picks.pcSpecies), mode: st.render_mode || st.currentEngine }; });
console.log('=== after launch === ' + JSON.stringify(s1).slice(0, 1200));
const s1Calls = calls.slice(callsBefore);
ok('S1 mounting the fixed Scene 1 made NO planner, author or screenplay model request and NO charge', !s1Calls.some(c => /^(planner|author|cgScreenplay)@/.test(c)) && charges.length === chargesBefore, 'calls=' + JSON.stringify(s1Calls) + ' charges=' + (charges.length - chargesBefore));
ok('S2 the page mounted the package prose (one page) and the story is identified as the starter', s1.pages >= 1 && s1.starterId === 'starter_first_sacrifice' && s1.pageText.length > 40, JSON.stringify({ pages: s1.pages, starterId: s1.starterId, head: s1.pageText.slice(0, 120) }));
ok('S3 ledger committed for Scene 1 (kind baked) and the scene held as a pending commit; turnCount 0; nothing unlocked yet', s1.pending && s1.turnCount === 0 && !s1.unlocked && !!s1.ledger && /baked/.test(String(s1.ledger)), JSON.stringify({ pending: s1.pending, turnCount: s1.turnCount, unlocked: s1.unlocked, ledger: s1.ledger }));
if (SEED) ok('S2b SYNTHETIC hand-authored prose passes to the page intact', s1.pageText.indexOf(SYN) !== -1, s1.pageText.slice(0, 200));
// commit as the unlock would, then assert continuation state
const s2 = await page.evaluate(() => { window._commitBakedScene(); window.state._bakedGenesisUnlocked = true; const st = window.state; return { turnCount: st.turnCount, scenes: Array.isArray(st.scenes) ? st.scenes.length : null, scene0: st.scenes && st.scenes[0] ? JSON.stringify(st.scenes[0]).slice(0, 400) : null, pending: !!st._bakedPendingCommit }; });
console.log('=== after _commitBakedScene === ' + JSON.stringify(s2).slice(0, 800));
ok('S4 after commit (the gate\'s success continuation): scenes[0] carries the mounted Scene 1, pending cleared, turnCount still 0 (the first continuation is Scene 2)', s2.scenes === 1 && !s2.pending && s2.turnCount === 0, JSON.stringify(s2));
console.log('  [NOTE] the Genesis charge itself (Supabase RPC via _chargeFortunesAtomic) is not exercised here — the headless session cannot complete it; the test sets the exact post-unlock state the gate sets (commit + _bakedGenesisUnlocked) and drives the real submit path from there.');
if (SEED) ok('S4b SYNTHETIC prose is carried intact into committed story state', !!s2.scene0 && s2.scene0.indexOf(SYN.slice(0, 60)) !== -1, String(s2.scene0).slice(0, 200));
// ask for Scene 2 through the real submit path (gate → confirm → unlock → staged completion → CG screenplay request)
// The CG Book's gate is the OAS handoff affordance (#bakedOASEnterBtn — app.js 135202), not the literary submit button.
const entry = await page.evaluate((useOas) => { const oas = document.getElementById('bakedOASEnterBtn'); if (useOas && oas) { oas.click(); return 'oas'; } if (!useOas) return 'direct (_advanceStagedScene after the gate\'s success state — the OAS handoff enters the one-on-one first, by design)'; const ta = document.getElementById('playerInput') || document.querySelector('textarea'); if (ta) { ta.value = 'I hold still and let the circle take.'; ta.dispatchEvent(new Event('input', { bubbles: true })); } const b = document.getElementById('submitBtn'); if (b) b.click(); return b ? 'submit' : 'none'; }, OAS);
console.log('  [ENTRY] first continuation driven through: ' + entry);
await page.waitForTimeout(6000);
console.log('  [FINDING] the CG Book\'s OAS handoff enters the ONE-ON-ONE first; its LI opening line request ' + (oasRequest ? 'was made and its context begins: ' + JSON.stringify((oasRequest.usr.match(/Recent story prose:[\s\S]{0,160}/) || [''])[0].replace(/\s+/g, ' ')) : 'was NOT observed'));
// Scene 2 proper: the production entry the staged path uses after the one-on-one (app.js 214766 _advanceStagedScene → _completeStagedSceneFromScreenplay(nextSceneIdx…))
await page.evaluate(() => { try { window._advanceStagedScene('I hold still and let the circle take.', ''); } catch (e) { console.log('[TEST] _advanceStagedScene threw: ' + (e && e.message)); } });
for (let i = 0; i < 30 && !cgRequest; i++) await page.waitForTimeout(2000);
const gateSeen = await page.evaluate(() => { const go = document.getElementById('buGoBtn'); const vis = !!(go && go.offsetParent !== null); if (go) go.click(); return { modal: !!document.getElementById('bakedUnlockModal'), goVisible: vis }; });
await page.waitForTimeout(12000);
const s3 = await page.evaluate(() => { const st = window.state; return { unlocked: !!st._bakedGenesisUnlocked, turnCount: st.turnCount, scenes: Array.isArray(st.scenes) ? st.scenes.length : null, renderMode: st.render_mode || st.renderMode || null, engine: st.currentEngine || null, stagedSubmitting: !!st._stagedSubmitting, aPlot: !!st.aPlot, plan: !!(window._activePlan && window._activePlan(st)) }; });
console.log('=== Scene 2 request === gate=' + JSON.stringify(gateSeen) + ' state=' + JSON.stringify(s3) + ' calls=' + JSON.stringify(calls.slice(callsBefore)) + ' charges=' + JSON.stringify(charges.map(c => c.context || c.kind || c.amount)));
ok('S5 with the unlock in place, the production Scene-2 entry (_advanceStagedScene) reaches the outbound CG screenplay request and Scene 1 was not regenerated (no planner/author call, no charge)', !!cgRequest && s3.unlocked && !calls.slice(callsBefore).some(c => /^(planner|author)@/.test(c)) && charges.length === chargesBefore, 'cgRequest=' + !!cgRequest + ' unlocked=' + s3.unlocked + ' gate=' + JSON.stringify(gateSeen) + ' calls=' + JSON.stringify(calls.slice(callsBefore).slice(0, 12)));
if (cgRequest) {
  const all = cgRequest.sys + '\n' + cgRequest.usr; const castHits = pre.cast.filter(n => n && all.indexOf(String(n)) !== -1);
  const plan = await page.evaluate(() => JSON.stringify(window.STARTER_PLANS['starter_first_sacrifice'].scenes[1] || {}).slice(0, 600));
  const planFacts = await page.evaluate(() => { const sc = window.STARTER_PLANS['starter_first_sacrifice'].scenes[1] || {}; const f = []; ['goal', 'requiredTruth', 'exitState', 'decision_axis'].forEach(k => { if (typeof sc[k] === 'string') f.push(sc[k]); }); (sc.eventFacts || []).forEach(e => { if (typeof e === 'string') f.push(e); else if (e && e.text) f.push(e.text); }); return f; });
  const planHits = planFacts.filter(f => f && all.indexOf(String(f).slice(0, 40)) !== -1);
  const emittedObl = await page.evaluate(() => (window.state._bakedEmitted && window.state._bakedEmitted.obligations) || []);
  const oblHits = emittedObl.filter(o => all.indexOf(String(o).slice(0, 40)) !== -1);
  console.log('=== CG Scene-2 packet === role=' + cgRequest.role + ' url=' + cgRequest.url + ' sys=' + cgRequest.sys.length + ' usr=' + cgRequest.usr.length + ' | seed cast names present: ' + JSON.stringify(castHits) + ' of ' + JSON.stringify(pre.cast) + ' | plan scene-2 facts present: ' + planHits.length + '/' + planFacts.length + ' | baked obligations present: ' + oblHits.length + '/' + emittedObl.length + ' | STORY LEDGER: ' + /STORY LEDGER/.test(all) + ' | ledger names Scene 1: ' + /Scene 1|scene 1|baked/.test((all.match(/STORY LEDGER[\s\S]{0,800}/) || [''])[0]));
  fs.writeFileSync('_validate_out/first_sacrifice_scene2_packet.' + (SEED ? 'synthetic' : 'placeholder') + '.txt', all);
  ok('S6 the Scene-2 CG packet carries the seed cast (every cast name)', castHits.length === pre.cast.length, 'present=' + JSON.stringify(castHits) + ' expected=' + JSON.stringify(pre.cast));
  ok('S7 the Scene-2 CG packet carries the plan\'s Scene-2 facts (stage consequences)', planFacts.length > 0 && planHits.length === planFacts.length, 'present ' + planHits.length + '/' + planFacts.length + ' → ' + JSON.stringify(planFacts.map(f => String(f).slice(0, 60))));
  const ledgerP1 = (all.match(/STORY LEDGER[\s\S]{0,1200}?\n\s+p1: ([^\n]+)/) || [])[1] || '';
  ok('S8 the Scene-2 CG packet carries the baked emitted obligations and a STORY LEDGER whose page-1 line records what the opening established (not "no recorded facts")', (emittedObl.length === 0 || oblHits.length === emittedObl.length) && /STORY LEDGER/.test(all) && ledgerP1 && !/no recorded facts/.test(ledgerP1), 'obligations ' + oblHits.length + '/' + emittedObl.length + ' p1=' + JSON.stringify(ledgerP1.slice(0, 120)));
}
fs.writeFileSync('_validate_out/first_sacrifice_seed_contract.' + (SEED ? 'synthetic' : 'placeholder') + '.log', logs.join('\n'));
await browser.close();
const fails = rows.filter(r => !r[1]).map(r => r[0]); console.log(`\nSEED CONTRACT (${SEED ? 'SYNTHETIC' : 'PLACEHOLDER'}): ${rows.length} rows · ${rows.length - fails.length} passed · ${fails.length} failed` + (fails.length ? ' → ' + fails.join(' | ') : ''));
process.exit(fails.length ? 1 : 0);
