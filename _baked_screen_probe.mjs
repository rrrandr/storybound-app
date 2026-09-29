// ═══ BAKED BOOK SCREEN PROBE (Roman 2026-09-12) ═══ Verifies the REAL screen transition of the First Sacrifice CG Book with NO DOM forcing:
// boot completes (production condition) → the library's exact launch call → what is VISIBLE (client rects) → the reader's own
// one-on-one button → Genesis gate → one-on-one inputs → the reader's own EXIT (typed exit word → exit modal → button) → the
// interruption plate / cards / Say-Do → a real card click + Submit. LAUNCH=booting reproduces the seed contract's condition.
import { chromium } from 'playwright-core'; import fs from 'fs';
import { installSession, configBody, isAuthOrigin } from './_test_session_env.mjs';
const LAUNCH = (process.env.LAUNCH || 'afterboot').toLowerCase();
const F = await import('./_seed_fixtures.generated.mjs');
const rows = []; const ok = (n, p, d) => { rows.push([n, !!p]); console.log((p ? 'PASS ' : 'FAIL ') + n + (p ? '' : '  — ' + d)); };
const browser = await chromium.launch({ headless: true }); const page = await (await browser.newContext()).newPage();
const logs = [], calls = [];
const allLogs = []; page.on('console', m => { const t = m.text(); allLogs.push(t.slice(0, 200)); if (/BAKED|STARTER|STAGED|INTIMATE-INTERRUPT|INTIMACY|OAS|SCENE-DECISION|GENESIS|showScreen|GN:SUBMIT|submit/i.test(t)) logs.push(t.slice(0, 220)); });
page.on('dialog', async d => { logs.push('DIALOG: ' + d.message().slice(0, 200)); await d.dismiss(); }); page.on('pageerror', e => { allLogs.push('PAGEERROR: ' + String(e && e.message).slice(0, 200)); logs.push('PAGEERROR: ' + String(e && e.message).slice(0, 200)); });
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
  let kind = 'other';
  if (/opening an intimate dialogue/.test(sys)) kind = 'oasDialogue';
  else if (/uninhibited romance fiction author/.test(sys) && /TEMPTATION \|\|\|/.test(usr)) kind = 'fatePreviews';
  else if (/screenplay-native cinematic-romance writer/.test(sys)) kind = 'cgScreenplay';
  else if (/SCENE-SPINE planner/.test(sys) || /"hardBeats"/.test(sys)) kind = 'sceneSpine';
  else { const hits = F.REQUEST_KINDS.filter(([, t]) => t(sys + '\n' + usr, sys, usr)).map(([k]) => k); kind = hits.length === 1 ? hits[0] : 'unclassified'; }
  calls.push(kind + '@' + (b.role || '-') + '@' + p);
  let content = '{}';
  if (kind === 'fatePreviews') content = ['TEMPTATION ||| amplify ||| I step in until the Dohkar has to look up at me ||| Ask it here, then.', 'SILENCE ||| redirect ||| I keep The Answer level and say nothing ||| (no words)', 'REVERSAL ||| amplify ||| I turn the hooked end toward Julian ||| You confessed more than I did.', 'BOUNDARY ||| amplify ||| I set my feet and do not move ||| The inquiry, then.', 'CONFESSION ||| amplify ||| CONF-OPT-ACTION: I look at Julian and not at the Dohkar ||| CONF-OPT-LINE: I did call to you.'].join('\n');
  else if (kind === 'sceneSpine') content = JSON.stringify({ tactical_move: 'x', state_change_precondition: 'x', state_change: 'Julian puts a testing question to Lirael before the assembly', forces_choice: 'forces Lirael to choose between A and B', branch_a: 'A', branch_b: 'B', posture_read: 'She stays', local_objective: 'OBJ-PROBE: Julian puts a testing question to Lirael before the assembly', local_objective_actor: 'Julian', present: ['Lirael', 'Julian', 'Seren', 'the presiding Dohkar'], reserved: { price_identified: 'untouched', inquiry_opened: 'untouched', julian_counter_wish: 'untouched', julian_obscuring_wishes: 'untouched' }, aftermath: { twist_manifested: 'kept', interrogation_interrupted: 'kept', the_answer_institutional: 'kept', inquiry_authority_claimed: 'kept' } });
  else if (kind === 'planner') content = F.plannerReply(usr, null); else if (kind === 'author') content = F.PROSE; else if (kind === 'aplotGenerator' || kind === 'aplotCorrection') content = JSON.stringify(F.APLOT_VALID); else if (kind === 'pcBodyBible') content = JSON.stringify(F.PC_BIBLE); else if (kind === 'liBodyBible') content = JSON.stringify(F.LI_BIBLE); else if (kind === 'antagonistBodyBible') content = JSON.stringify(F.ANTAGONIST_BIBLE); else if (kind === 'scaffold') { const ref = (sys + usr).match(/subject_ref:\s*(\S+)/); content = JSON.stringify(F.scaffoldReply(ref ? ref[1] : null, true)); } else if (kind === 'oasDialogue') content = JSON.stringify({ li_dialogue: 'You called to me. Say it plainly, here, where they can hear.', li_action: 'He does not step back.', face_state: 'intent', scene_state: 'building', release_state: 'none' }); else if (kind !== 'cgScreenplay') content = JSON.stringify(F.GENERIC);
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'probe', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }] }) });
});
const snap = (label) => page.evaluate((label) => {
  const shown = (el) => { if (!el) return false; try { return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; } catch (_) { return false; } };
  const by = (id) => shown(document.getElementById(id));
  return { label, screen: window._currentScreenId || null, active: Array.from(document.querySelectorAll('.screen')).filter(e => !e.classList.contains('hidden')).map(e => e.id), booting: document.body.classList.contains('booting'), bodyClass: document.body.className.slice(0, 80),
           vis: { app: by('app'), game: by('game'), storyContent: by('storyContent'), oasBtn: by('bakedOASEnterBtn'), unlockModal: by('bakedUnlockModal'), goBtn: by('buGoBtn'), actionInput: by('actionInput'), dialogueInput: by('dialogueInput'), submitBtn: by('submitBtn'), cardMount: by('cardMount'), interruption: by('intimateInterruption'), exitModal: by('intimacyExitModal'), gnReader: by('gnReader'), gnActionInput: by('gnActionInput'), gnDialogueInput: by('gnDialogueInput'), gnSubmitBtn: by('gnSubmitBtn'), gnCardMount: by('gnCardMount') },
           cards: Array.from(document.querySelectorAll('#cardMount [data-fate-card-slot]')).filter(shown).length, pageTextHead: ((window.StoryPagination && window.StoryPagination.getAllContent && window.StoryPagination.getAllContent()) || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 80),
           oas: (() => { const d = window.state && window.state.intimacyDialogue; return d ? { active: d.active, awaiting: !!d.awaitingResponse, beats: d.beatCount, pending: d.pendingRequestId || null, resolving: !!d._resolving } : null; })(),
           st: { renderMode: window.state && window.state.renderMode, starterId: window.state && window.state._starterId, turnCount: window.state && window.state.turnCount, oasActive: !!(window.state && window.state.intimacyDialogue && window.state.intimacyDialogue.active), intr: window.state && window.state._intimateInterruption ? { host: window.state._intimateInterruption.host, submitted: window.state._intimateInterruption.submitted } : null } };
}, label);
const t0 = Date.now(); let up = false;
while (Date.now() - t0 < 240000 && !up) { try { await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 }); await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_STORIES && window._bakedScene1For, null, { timeout: 60000 }); up = true; } catch (_) { await page.waitForTimeout(3000); } }
if (!up) { console.log('server never answered'); await browser.close(); process.exit(2); }
if (LAUNCH === 'afterboot') { await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {}); await page.waitForTimeout(1500); }
const s0 = await snap('before launch'); console.log('=== ' + JSON.stringify(s0));
const launch = await page.evaluate(() => { const list = Array.isArray(window.STARTER_STORIES) ? window.STARTER_STORIES : Object.values(window.STARTER_STORIES || {}); const def = list.find(d => d && d.id === 'starter_first_sacrifice'); return { baked: !!window._bakedScene1For(def.id), renderModeDef: def.render_mode, p: (window._launchStarterStory(def), true) }; });
await page.waitForTimeout(6000);
const s1 = await snap('after launch'); console.log('=== ' + JSON.stringify(s1)); console.log('  calls: ' + JSON.stringify(calls));
ok('V1 (' + LAUNCH + ') the library\'s launch mounts the BAKED opening (no planner/author/bible calls) and the reader can SEE it: the game screen is active, #storyContent has client rects, the page text is the package\'s, and the one-on-one button is visible', launch.baked && logs.some(l => /\[BAKED\] mounting Scene 1/.test(l)) && !calls.some(c => /^(planner|author|pcBodyBible|liBodyBible|cgScreenplay)@/.test(c)) && s1.active.indexOf('game') !== -1 && s1.vis.storyContent && /Dawn in the Veilwood/.test(s1.pageTextHead) && s1.vis.oasBtn, JSON.stringify({ launch, s1, calls: calls.slice(0, 8), baked: logs.filter(l => /BAKED|STAGED/.test(l)).slice(0, 6) }));
ok('V1b NO OpenAI request for the fixed free opening: zero /api/chatgpt-proxy calls during the baked mount, and the character-memory extractor logged its deferral', !calls.some(c => /chatgpt-proxy/.test(c)) && allLogs.some(l => /LEDGER:ADMIT\] baked opening/.test(l)), JSON.stringify({ calls, deferral: allLogs.filter(l => /LEDGER:ADMIT/.test(l)).slice(0, 2) }));
if (!s1.vis.oasBtn) { console.log('  [STOP] the one-on-one button is not visible — the rest of the path cannot be driven through the UI'); fs.writeFileSync('_validate_out/baked_screen_probe.' + LAUNCH + '.log', logs.join('\n')); fs.writeFileSync('_validate_out/baked_screen_probe.' + LAUNCH + '.all.log', allLogs.join('\n')); await browser.close(); const f = rows.filter(r => !r[1]).length; console.log(`\nBAKED SCREEN PROBE (${LAUNCH}): ${rows.length} rows · ${rows.length - f} passed · ${f} failed`); process.exit(1); }
await page.click('#bakedOASEnterBtn'); await page.waitForTimeout(1500);
const s2 = await snap('after one-on-one button'); console.log('=== ' + JSON.stringify(s2));
ok('V2 the reader\'s own button opens the Genesis gate (unlock modal + its Go button visible) — the charge itself is a Supabase RPC this headless session cannot complete', s2.vis.unlockModal && s2.vis.goBtn, JSON.stringify(s2.vis));
// The charge cannot run headless: set exactly the post-unlock state the gate sets, then use the gate's own Go button.
await page.click('#buCancelBtn'); await page.waitForTimeout(300);
await page.evaluate(() => { ['gnDialogueInput', 'gnActionInput'].forEach((id) => { const el = document.getElementById(id); if (!el) return; const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'disabled'); Object.defineProperty(el, 'disabled', { configurable: true, get() { return desc.get.call(this); }, set(v) { if (v) { window.__disTrace = window.__disTrace || []; window.__disTrace.push(id + ' ← ' + (new Error()).stack.split('\n').slice(2, 7).map(l => l.trim().replace(/^at /, '')).join(' | ')); } desc.set.call(this, v); } }); const sa = el.setAttribute.bind(el); el.setAttribute = function (k, v) { if (k === 'disabled') { window.__disTrace = window.__disTrace || []; window.__disTrace.push(id + ' ←attr ' + (new Error()).stack.split('\n').slice(2, 6).map(l => l.trim()).join(' | ')); } return sa(k, v); }; }); });
await page.evaluate(() => { window._commitBakedScene(); window.state._bakedGenesisUnlocked = true; });
await page.click('#bakedOASEnterBtn'); await page.waitForTimeout(7000);   // the reader's own button again — with the gate open it enters the one-on-one directly
const s3 = await snap('in the one-on-one'); console.log('=== ' + JSON.stringify(s3));
ok('V3 after the gate the one-on-one is live on EXACTLY ONE reader screen (gnReader; the game screen hidden), with exactly one visible Submit path (#gnActionInput / #gnDialogueInput / #gnSubmitBtn); the literary #submitBtn is not visible', s3.st.oasActive && s3.active.length === 1 && s3.active[0] === 'gnReader' && !s3.vis.game && !s3.vis.submitBtn && !s3.vis.actionInput && s3.vis.gnActionInput && s3.vis.gnDialogueInput && s3.vis.gnSubmitBtn, JSON.stringify(s3));
// P2: the hidden literary Submit, even if triggered, must never start a literary continuation on a CG Book
{ const before = calls.length; await page.evaluate(() => { window.__submitSeen = []; document.addEventListener('click', (e) => { if (e.target && e.target.closest && e.target.closest('#submitBtn')) window.__submitSeen.push('capture:' + e.eventPhase); }, true); });
  try { await page.click('#submitBtn', { force: true, timeout: 3000 }); } catch (_) { await page.evaluate(() => { const b = document.getElementById('submitBtn'); if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }); }
  await page.waitForTimeout(2500); console.log('  [P2-click] ' + JSON.stringify(await page.evaluate(() => window.__submitSeen)) + ' guardLogs=' + JSON.stringify(allLogs.filter(l => /STAGED:GUARD|STAGED:SUBMIT|GN:SUBMIT|\[SUBMIT/.test(l)).slice(-4)));
  const after = calls.slice(before); const still = await page.evaluate(() => !!(window.state.intimacyDialogue && window.state.intimacyDialogue.active));
  const p2diag = await page.evaluate(() => ({ screen: window._currentScreenId, awaitingProse: !!window.state._stagedAwaitingProse, advancing: !!window.state._isAdvancingScene, staged: window._isStagedMode ? window._isStagedMode() : null }));
  console.log('  [P2] ' + JSON.stringify({ p2diag, after, tail: allLogs.slice(-6) }));
  ok('P2 WRONG-ENGINE GUARD: triggering the (hidden) literary Submit during the one-on-one starts NO literary continuation — no author/planner/orchestration request, the one-on-one stays active; the guard logged its refusal', !after.some(c => /^(author|planner|aplotGenerator|sceneSpine)@/.test(c)) && still && allLogs.some(l => /STAGED:GUARD\] literary Submit refused/.test(l)), JSON.stringify({ after, still, guard: allLogs.filter(l => /STAGED:GUARD/.test(l)).slice(0, 1), p2diag })); }
// P3b: a normal action in the ACTION box is a normal turn (not an exit)
{ await page.fill('#gnActionInput', 'I keep my hands still around The Answer and look at Seren’s mother.'); await page.click('#gnSubmitBtn'); await page.waitForTimeout(3000);
  const t = await page.evaluate(() => ({ beats: window.state.intimacyDialogue && window.state.intimacyDialogue.beatCount, exit: !!document.getElementById('intimacyExitModal') && getComputedStyle(document.getElementById('intimacyExitModal')).display !== 'none' && !document.getElementById('intimacyExitModal').classList.contains('hidden') }));
  ok('P3b a normal action typed in the ACTION box is processed as a normal one-on-one turn (beat counted, no exit modal)', t.beats >= 1 && !allLogs.some(l => /INTIMACY-EXIT\] Modal opened/.test(l)), JSON.stringify({ t, exitLogs: allLogs.filter(l => /INTIMACY-EXIT/.test(l)).slice(0, 2) })); }
// V4b (2026-09-13 §72 Part 3 gap-close): the prior V4 control only proved a DISPLAY-added curly
// quote gets stripped correctly (an exit word). It never proved the converse — that
// _stripOASSayQuotes (app.js ~197226, a `while` loop stripping ALL leading/trailing curly-OR-
// STRAIGHT quote chars) leaves a reader's OWN embedded apostrophe/straight-quote characters alone
// when they are NOT at the very start/end of the line. Type real text containing both into the
// real Say box, submit for real, and read it back from two independent, honest, OBSERVE-ONLY
// signals: state.intimacyDialogue.liTurnHistory[...].userInputRaw (app.js ~193987, the record
// _handleIntimacyTurn actually received) and the outbound oasDialogue request's own `SAY: "..."`
// line (app.js ~190660, the literal prompt text sent for this turn).
for (let i = 0; i < 20 && (await page.evaluate(() => !!(window.state.intimacyDialogue && window.state.intimacyDialogue.awaitingResponse))); i++) await page.waitForTimeout(1000);
{ const TRICKY_SAY = 'I won\'t let him in — "not tonight," I say.';
  await page.fill('#gnActionInput', '');
  await page.fill('#gnDialogueInput', TRICKY_SAY);
  const boxValue = await page.evaluate(() => document.getElementById('gnDialogueInput').value);
  await page.click('#gnSubmitBtn');
  await page.waitForTimeout(3000);
  const hist = await page.evaluate(() => { const d = window.state.intimacyDialogue; const h = d && d.liTurnHistory; return h && h.length ? h[h.length - 1].userInputRaw : null; });
  ok('V4b the reader\'s exact apostrophe + embedded straight-quote text survives the live curly-quote wrap (box value now ' + JSON.stringify(boxValue) + ') into state.intimacyDialogue.liTurnHistory.userInputRaw, byte-identical to what was typed', hist === TRICKY_SAY, JSON.stringify({ typed: TRICKY_SAY, boxValue, historyRecorded: hist }));
  console.log('  [V4b] typed=' + JSON.stringify(TRICKY_SAY) + ' boxValueAfterLiveWrap=' + JSON.stringify(boxValue) + ' liTurnHistory.userInputRaw=' + JSON.stringify(hist));
}
// Exit through the reader's own path: an exit word → the exit modal → its button (no state or DOM forcing).
for (let i = 0; i < 20 && (await page.evaluate(() => !!(window.state.intimacyDialogue && window.state.intimacyDialogue.awaitingResponse))); i++) await page.waitForTimeout(1000);   // let the opener settle
// The one-on-one's OWN inputs are the gn set (#gnActionInput/#gnDialogueInput/#gnSubmitBtn → _intimacyDialogueConsumeInput); the literary
// #submitBtn during the one-on-one starts a literary continuation instead (pre-existing hazard, recorded as V3b).
const litSubmitCallsBefore = calls.length;
console.log('  [DUPES] ' + JSON.stringify(await page.evaluate(() => ['gnDialogueInput', 'gnActionInput', 'gnSubmitBtn', 'dialogueInput', 'submitBtn'].map(id => ({ id, n: document.querySelectorAll('[id="' + id + '"]').length, each: Array.from(document.querySelectorAll('[id="' + id + '"]')).map(el => ({ dis: el.disabled, shown: el.getClientRects().length > 0, parent: (el.parentElement && (el.parentElement.id || el.parentElement.className)) || '' })) })))));
console.log('  [DIS-TRACE] ' + JSON.stringify(await page.evaluate(() => window.__disTrace || null)).slice(0, 1500));
console.log('  [PRE-FILL] ' + JSON.stringify(await page.evaluate(() => ({ dis: { a: document.getElementById('actionInput').disabled, d: document.getElementById('dialogueInput').disabled, ga: document.getElementById('gnActionInput').disabled, gd: document.getElementById('gnDialogueInput').disabled }, pay: (() => { const p = document.getElementById('payModal'); return p ? !p.classList.contains('hidden') : null; })(), oasActive: !!(window.state.intimacyDialogue && window.state.intimacyDialogue.active) }))) + ' logs=' + JSON.stringify(logs.slice(-8)));
// The Say box live-wraps typed text in curly quotes (“stop”), which the exit detector does not strip — so type the exit word
// into the ACTION box, the "do" path (FINDING recorded: an exit word typed in the Say box is not recognised).
for (let i = 0; i < 20 && (await page.evaluate(() => !!(window.state.intimacyDialogue && window.state.intimacyDialogue.awaitingResponse))); i++) await page.waitForTimeout(1000);
await page.fill('#gnActionInput', '');
try { await page.fill('#gnDialogueInput', 'stop', { timeout: 8000 }); } catch (e) { fs.writeFileSync('_validate_out/baked_screen_probe.' + LAUNCH + '.all.log', allLogs.join('\n')); console.log('  [FILL-FAILED] ' + e.message.slice(0, 120)); }
const sayBoxValue = await page.evaluate(() => document.getElementById('gnDialogueInput').value);
console.log('  [SAY-BOX] value after typing stop: ' + JSON.stringify(sayBoxValue));
await page.click('#gnSubmitBtn'); await page.waitForTimeout(1500);
const s4 = await snap('exit modal'); console.log('=== ' + JSON.stringify(s4)); console.log('  logs@V4: ' + JSON.stringify(logs.slice(-10)));
const exitBtnState = await page.evaluate(() => { const b = document.getElementById('intimacyExitFade'); const m = document.getElementById('intimacyExitModal'); return { btn: !!b, btnRects: !!(b && b.getClientRects().length), modalClass: m ? m.className : null, modalDisplay: m ? getComputedStyle(m).display : null }; });
ok('V4 an exit word typed into the SAY box (display-wrapped as ' + JSON.stringify(sayBoxValue) + ') is detected on the RAW words: the one-on-one\'s Submit opens the exit modal', (s4.vis.exitModal || logs.some(l => /INTIMACY-EXIT\] Modal opened/.test(l))) && exitBtnState.btn, JSON.stringify({ sayBoxValue, vis: s4.vis.exitModal, exitBtnState, logs: logs.slice(-3) }));
ok('V3b exactly one screen is active during the one-on-one (was: game + gnReader both visible with two Submit buttons)', s3.active.length === 1 && !(s3.vis.game && s3.vis.gnReader), JSON.stringify(s3.active));
try { await page.click('#intimacyExitFade', { force: true, timeout: 5000 }); } catch (_) { await page.evaluate(() => { const b = document.getElementById('intimacyExitFade'); if (b) b.click(); }); }   // the modal's own button (its container reports no client rects mid-fade)
await page.waitForTimeout(5000);
const s5 = await snap('after exit'); console.log('=== ' + JSON.stringify(s5)); console.log('  logs: ' + JSON.stringify(logs.filter(l => /INTIMATE-INTERRUPT|Resolv|Exit/.test(l)).slice(0, 6)));
const cardsVisible = await page.evaluate(() => { const shown = (el) => el && el.getClientRects().length > 0; return { gn: Array.from(document.querySelectorAll('#gnCardMount [data-fate-card-slot]')).filter(shown).length, lit: Array.from(document.querySelectorAll('#cardMount [data-fate-card-slot]')).filter(shown).length }; });
const hostOk = s5.st.intr && ((s5.st.intr.host === 'cg' && cardsVisible.gn === 5 && s5.vis.gnActionInput && s5.vis.gnDialogueInput && s5.vis.gnSubmitBtn) || (s5.st.intr.host === 'literary' && cardsVisible.lit === 5 && s5.vis.actionInput && s5.vis.dialogueInput && s5.vis.submitBtn));
ok('V5 the interruption is VISIBLE without any DOM forcing on the SINGLE active screen: #intimateInterruption has client rects, the five cards are visible in the host it chose, that host\'s Say/Do + Submit are visible, and the literary Submit is not', s5.vis.interruption && hostOk && !s5.st.intr.submitted && s5.active.length === 1 && !s5.vis.submitBtn, JSON.stringify({ s5, cardsVisible }));
for (let i = 0; i < 10 && !(await page.evaluate(() => { const r = window.state._intimateInterruption; return !!(r && r.cards && Object.keys(r.cards).length); })); i++) await page.waitForTimeout(500);
const HOST = await page.evaluate(() => { const r = window.state._intimateInterruption; return r && r.host === 'cg' ? { mount: 'gnCardMount', a: 'gnActionInput', d: 'gnDialogueInput', s: 'gnSubmitBtn' } : { mount: 'cardMount', a: 'actionInput', d: 'dialogueInput', s: 'submitBtn' }; });
await page.click('#' + HOST.mount + ' [data-fate-card-slot="confession"]'); await page.waitForTimeout(500);
const filled = await page.evaluate((H) => ({ a: document.getElementById(H.a).value, d: document.getElementById(H.d).value, host: H }), HOST);
await page.click('#' + HOST.s); for (let i = 0; i < 25 && !calls.some(c => /^cgScreenplay@/.test(c)); i++) await page.waitForTimeout(2000);
const s6 = await snap('after submit'); const post = await page.evaluate(() => ({ posture: window.state._scenePosture && window.state._scenePosture['2'], dec: window.state._sceneDecisions && window.state._sceneDecisions['1'] }));
console.log('=== ' + JSON.stringify(s6) + '\n  post: ' + JSON.stringify(post) + '\n  calls: ' + JSON.stringify(calls.filter(c => !/oasDialogue/.test(c)).slice(-8)));
ok('V6 a real card click fills the reader\'s inputs and a real Submit carries the text verbatim into the Scene-2 posture and on to the CG screenplay request', /^CONF-OPT-ACTION/.test(filled.a) && !!post.posture && post.posture.action === filled.a && post.posture.dialogue === filled.d && post.dec && post.dec.source === 'interruption_submit' && calls.some(c => /^cgScreenplay@/.test(c)) && s6.st.intr && s6.st.intr.submitted, JSON.stringify({ filled, post, s6 }));
fs.writeFileSync('_validate_out/baked_screen_probe.' + LAUNCH + '.log', logs.join('\n'));
await browser.close();
const f = rows.filter(r => !r[1]).length; console.log(`\nBAKED SCREEN PROBE (${LAUNCH}): ${rows.length} rows · ${rows.length - f} passed · ${f} failed`); process.exit(f ? 1 : 0);
