// ═══ C+/E+/FUSION DELIVERY MATRIX (Roman 2026-09-11) ═══ free, network-fenced, unseeded corridor (the supported literary path).
// PHASE 1 — OFFER PARTITION on the Scene-1 planner bytes: the population is the selector's ORDINARY set for THIS invocation
// (people this scene gives an opportunity to and who are available for ordinary C+). The PC is outside it — her beat is
// pc_opening_fusion. Declined people (no opportunity) are outside it too. Assertions compare normalized labels against the
// local contract mirror (window.__lastCPlusContract), which carries canonical ids where they exist. Cast membership never
// becomes a requirement to OFFER anyone: the rows check that whoever IS in the population is listed exactly once, offered or
// starved with the reason, and that the permitted-labels enum equals the offered set.
// PHASE 2 — CONTINUATION DELIVERY: a real Scene-2 request is assembled through the product's own submit path with fixture
// responses (continuation skeleton planner, scene-spine planner, author). Rows prove what the BACKEND supplies (truth, mode,
// option, presence source) reaches the author once, distinguish it from what the AUTHOR must compose, and record the E+/fusion
// ownership honestly (the skeleton planner's FREE TEXT, not backend-issued ids). Rows expected to fail today are labelled DEFECT.
// knobs: RED=enumstale|starvedsilent|absentlaw · STARVE=<label> forces one label into the starved set via the harness seam.
import { chromium } from 'playwright-core'; import fs from 'fs';
import { installSession, configBody, isAuthOrigin } from './_test_session_env.mjs';
const RED = String(process.env.RED || '').toLowerCase(); const STARVE = process.env.STARVE || '';
const dry = fs.readFileSync('_scene1_stage_order_dry.mjs', 'utf8'); const sliceEnd = dry.indexOf('async function run(');
fs.writeFileSync('_delivery_fixtures.generated.mjs', dry.slice(0, sliceEnd).replace(/^const results = \[\];[\s\S]*?\n(?=const)/m, '').replace(/^await preflight\(\);\s*$/m, '') + '\nexport { REQUEST_KINDS, plannerReply, scaffoldReply, APLOT_VALID, ANTAGONIST_BIBLE, PC_BIBLE, LI_BIBLE, GENERIC, PROSE, PASSTHROUGH, LOCAL, MODEL };\n');
const F = await import('./_delivery_fixtures.generated.mjs');
const rows = []; const ok = (n, p, d) => { rows.push([n, !!p]); console.log((p ? 'PASS ' : 'FAIL ') + n + (p ? '' : '  — ' + String(d).slice(0, 400))); };
const skip = (n, why) => console.log('SKIP ' + n + '  — ' + why);
const norm = x => String(x || '').trim().toLowerCase();
const browser = await chromium.launch({ headless: true }); const page = await (await browser.newContext()).newPage();
await page.addInitScript(() => { window.__E2E_FLAG = true; });   // same as the packet harness: the flag-on author route (Grok-only) is the supported path under test
const logs = [], authorReqs = [], skeletonReqs = [], spineReqs = [], census = {}; let plannerUsr = '', plannerSys = '';
page.on('console', m => { const t = m.text(); if (/SCENE1:CPLUS|CPLUS:|SKELETON|SCENE1:ABORT|CONTINUATION|STAGE|GENERATED|PORTFOLIO|ADMISSION|SCAFFOLD|SUBMIT:RETURN|SUBMIT:ENTER|BEGIN:DONE|SCENE1:COMMIT|BeginStory\] (Phase|All validation|Story mode)|SCENE1:REFUND|REFUND/.test(t)) logs.push(m.type() + ': ' + t.slice(0, 260)); });
await installSession(page);
await page.route('**/sb-test.localhost/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
// DIAGNOSTIC (harness-only, like _scene1_instrument.mjs): serve an instrumented app.js that names which `return` the
// submit handler took and whether the Scene-1 commit ran. Product bytes on disk are untouched.
if (process.env.INSTRUMENT === '1') {
  const SRC = fs.readFileSync('public/app.js', 'utf8'); const lines = SRC.split('\n');
  const h0 = lines.findIndex(l => /\$\('submitBtn'\)\?\.addEventListener\('click', async \(\) => \{/.test(l));
  let tagged = 0;
  if (h0 >= 0) { lines[h0] = lines[h0] + ' console.log("[SUBMIT:ENTER] handler at app.js line ' + (h0 + 1) + '");';
    for (let i = h0 + 1; i < h0 + 420 && i < lines.length; i++) { if (/^\s*return( false| null)?;\s*(\/\/.*)?$/.test(lines[i])) { lines[i] = lines[i].replace(/return( false| null)?;/, '{ console.log("[SUBMIT:RETURN] app.js line ' + (i + 1) + '"); return$1; }'); tagged++; } } }
  const b0 = lines.findIndex((l, i) => i > 254000 && /^\s*_beginStoryInProgress = false;/.test(l));
  if (b0 >= 0) lines[b0] = lines[b0] + ' console.log("[BEGIN:DONE] _beginStoryInProgress=false at app.js line ' + (b0 + 1) + '");';
  const c0 = lines.findIndex(l => /state\.scenes\.push\(\{ title, synopsis, text: _sanitizedBody, fateCard: null \}\);/.test(l));
  if (c0 >= 0) lines[c0] = lines[c0] + ' console.log("[SCENE1:COMMIT] scenes.push at app.js line ' + (c0 + 1) + '");';
  const APP = lines.join('\n'); console.log('[INSTRUMENT] submit returns tagged=' + tagged + ' handler@' + (h0 + 1) + ' commit@' + (c0 + 1));
  await page.route('**/app.js*', r => r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: APP }));
}
await page.route('**/api/**', async route => {
  const url = route.request().url(); const p = new URL(url).pathname;
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (F.PASSTHROUGH.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (F.LOCAL[p]) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(F.LOCAL[p]) });
  if (!F.MODEL.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const flat = m => typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(x => x && x.text || '').join('\n') : '');
  const sys = (b.messages || []).filter(m => m.role === 'system').map(flat).join('\n'), usr = (b.messages || []).filter(m => m.role === 'user').map(flat).join('\n'); const txt = sys + '\n' + usr;
  const hits = F.REQUEST_KINDS.filter(([, t]) => { try { return t(txt, sys, usr); } catch (_) { return false; } }).map(([k]) => k); let kind = hits.length === 1 ? hits[0] : null;
  if (/You define narrative skeletons for fiction scenes/.test(sys)) kind = 'skeleton';
  if (/SCENE-SPINE planner/.test(sys)) kind = 'spine';
  census[kind || ('UNCLASSIFIED:' + sys.replace(/\s+/g, ' ').slice(0, 50))] = (census[kind || ('UNCLASSIFIED:' + sys.replace(/\s+/g, ' ').slice(0, 50))] || 0) + 1;
  let out;
  if (kind === 'planner') {
    plannerUsr = usr; plannerSys = sys;
    const issued = [...usr.matchAll(/^\s+·\s+(\S+)\s*$/gm)].map(x => x[1]); const env = JSON.parse(F.plannerReply(usr, null));
    if (/"stage_contract": \{/.test(usr)) { const self = 'pc:self'; const other = issued.find(r => r !== self) || null;
      const sk = env.scene_skeleton || (env.scene_skeleton = {}); const ep = sk.environment_plus || {};
      const els = (env.opening_spine && env.opening_spine.environment_elements) || []; const all = [...new Set([...(ep.target ? [ep.target] : []), ...els])];
      env.stage_contract = { v: 1, participants: [{ ref: self, presence: 'IN_PERSON' }].concat(other ? [{ ref: other, presence: 'ANTICIPATED' }] : []),
        event_facts: [{ text: 'She counts what the invitation has already cost her before the stranger arrives', participants: [{ ref: self, role: 'actor' }] }],
        elements: all.map(nm => ({ name: nm, affordance: 'GRASPABLE' })) };
      const v3Offered = /"contact": \{ "verb": "<EXACTLY one of the CONTACT TYPES below, verbatim>"/.test(usr);
      const issuedOps = [...usr.matchAll(/^\s+·\s+([A-Z_]+)\s+—\s+(.+)$/gm)].map(m => ({ op: m[1], gloss: m[2].trim() }));
      if (v3Offered) { const op = issuedOps[0] || { op: 'NONE_ISSUED', gloss: '' }; const _contactObj = String(ep.target || ''); delete ep.target;
        const PCN3 = (env.opening_spine && env.opening_spine.staged_characters && env.opening_spine.staged_characters[0] && env.opening_spine.staged_characters[0].name) || 'Testa';
        sk.pc_opening_fusion = { character: PCN3, placement: 'PC_FIRST_EMBODIED_BEAT', contact: { verb: 'PRESS', object: _contactObj }, action: 'I set my palm flat on {ENV_TARGET} and let the cold of it climb my wrist.', pc_lens_operation: op.op, character_revelation: PCN3 + ' takes hold of it as if it were already ' + PCN3 + '\'s to answer for.', environment_pressure: { grounds: ['env:axis', 'pick:flavor'], text: 'Whatever this room has already lost, ' + PCN3 + ' is the one standing in it now.' } };
      } else if (/NO pc_opening_fusion THIS SCENE/.test(usr)) delete sk.pc_opening_fusion; }
    out = JSON.stringify(env);
  }
  else if (kind === 'skeleton') {
    // CONTINUATION SKELETON PLANNER (scene 2). Stage contract from the ISSUED refs in this very request; a planner-supplied
    // character_plus that the backend must discard; FREE-TEXT E+ and fusion (that is the product's current continuation shape).
    const issued = [...usr.matchAll(/^\s+·\s+(\S+)\s*$/gm)].map(x => x[1]).concat([...sys.matchAll(/^\s+·\s+(\S+)\s*$/gm)].map(x => x[1]));
    const self = issued.find(r => r === 'pc:self') || 'pc:self'; const ant = issued.find(r => /marcus/i.test(r)) || issued.find(r => r !== self && /^(named|ent):/.test(r) && !/rook|draws_them|draws them/i.test(r)) || null;
    skeletonReqs.push({ issued, antRef: ant, sysLen: sys.length, usrLen: usr.length });
    const rep = { environment_anchor: 'the cracked steel counter of the customs desk', structural_pacing: 'steady', narrative_density: 'medium', dialogue_ratio: 'balanced', beat_style: 'grounded', tension_rhythm: 'rising',
      staged_characters: [{ name: 'Testa', presence_mode: 'ON_STAGE' }].concat(ant ? [{ name: 'Marcus Vale', presence_mode: 'ON_STAGE' }] : []),
      interlocutor_placement: 'across the counter from her', li_texture_beat: null, pc_body_callback: '', li_body_callback: '', antagonist_body_callback: '',
      environment_plus: { target: 'the cracked steel counter', axis: 'damage' }, fusion: ant ? { character: 'Marcus Vale', target: 'the cracked steel counter' } : null,
      character_plus: ant ? [{ character: 'Marcus Vale', angle: 'MODEL-ANGLE-SENTINEL: he taps the ledger twice before he speaks' }] : [],
      stage_contract: { v: 1, participants: [{ ref: self, presence: 'IN_PERSON' }].concat(ant ? [{ ref: ant, presence: 'IN_PERSON' }] : []),
        event_facts: [{ text: 'Marcus Vale reads the clause aloud, in order, before he will sign', participants: ant ? [{ ref: ant, role: 'actor' }] : [{ ref: self, role: 'actor' }] }],
        elements: [{ name: 'the cracked steel counter', affordance: 'GRASPABLE' }] } };
    out = JSON.stringify(rep);
  }
  else if (kind === 'spine') { spineReqs.push({ url: p, model: b.model }); out = '{}'; }
  else if (kind === 'portfolioBatch') {
    // Verbatim shape of the dry suite's portfolio fixture (five named slots, contrast fields, per-subject signature).
    const refs = [...sys.matchAll(/subject_ref: (\S+)/g)].map(m => m[1]);
    const DIMS = ['value', 'insecurity', 'defense', 'relationship', 'exception']; let _fi = 0;
    const FF = (canonical_truth, unique_prediction, w1, e1, w2, e2) => ({ dimension: DIMS[(_fi++) % DIMS.length], canonical_truth, unique_prediction, not_explained_by: 'not the neighbouring facet, which is about something else entirely', applicability_conditions: [{ text: w1, evidence_words: e1.split('|') }, { text: w2, evidence_words: e2.split('|') }], forbidden_restatements: [{ forbid: 'is predictable', why: 'the truth stated, not shown' }] });
    out = JSON.stringify({ characterPortfolios: refs.map(r => ({ subject_ref: r, identity_signature: 'the only one here who reads a rule as a shelter rather than a weapon', facets: (_fi = 0, [
      FF('With people who hold no leverage over her she is unexpectedly generous.', 'Offered a favour by someone powerful, she declines it and helps the clerk instead.', 'a procedure the house performs every day', 'customs|house', 'a step nobody audits', 'signed|counts|already'),
      FF('Deference paid to someone else makes her newly attentive to her own standing.', 'When a junior is thanked before her, she recites her own seniority to a stranger.', 'a room holding more than one authority', 'customs|house|Lirael', 'someone junior given weight', 'younger|senior|standing'),
      FF('Paperwork repeated daily rarely earns her full attention, and she barely hides it.', 'Asked to witness a routine signing, she signs without reading and dares anyone to object.', 'a mistake that can still be corrected', 'counts|signed|already', 'a person doing the work badly', 'error|wrong|mistake'),
      FF("She turns another person's error into an instruction, wanted or not.", 'Once a colleague admits confusion, she explains at length past the point of welcome.', 'an obligation already entered into', 'signed|counts|already', 'a price judged small', 'cost|price|paid'),
      FF('Her relationship habit of correcting others stops with anyone already humiliated once.', 'When a clerk she once corrected is mocked by someone else, she covers the error herself.', 'someone with nothing to trade', 'customs|house|Lirael', 'a person placed beneath her', 'beneath|edge|apart')]) })) });
  }
  else if (kind === 'scaffold') { const ref = txt.match(/subject_ref:\s*(\S+)/); out = JSON.stringify(F.scaffoldReply(ref ? ref[1] : null, true)); }
  else if (kind === 'author') { authorReqs.push({ sys, usr, url: p, role: b.role || null }); out = F.PROSE; }
  else if (kind === 'aplotGenerator' || kind === 'aplotCorrection') out = JSON.stringify(F.APLOT_VALID);
  else if (kind === 'antagonistBodyBible') out = JSON.stringify(F.ANTAGONIST_BIBLE);
  else if (kind === 'pcBodyBible') out = JSON.stringify(F.PC_BIBLE);
  else if (kind === 'liBodyBible') out = JSON.stringify(F.LI_BIBLE);
  else out = JSON.stringify(F.GENERIC);
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'dm', object: 'chat.completion', model: b.model, usage: { prompt_tokens: 0, completion_tokens: 0 }, _orchestration: { role: b.role || null, model: b.model }, content: out, choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: out } }] }) });
});
await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 60000 });
await page.waitForFunction(() => window.state && window.handleBeginStory && window.STORY_SHAPE_LIBRARY, { timeout: 120000 });
const modern = () => { const s = window.state; s.picks = s.picks || {}; window.__disableSpeculativePreload = true; window._grokOnlySceneAuthor = true; s.hasSeenFortuneTurnDisclosure = true; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true;   // set BEFORE begin as the delivery A/B harnesses do: a free-preview opening defers its commit and the submit handler returns at the preview/cliffhanger gates   // as the packet harness: no speculative second author, flag-on route
  if (window.__PIN_LI) { try { Object.defineProperty(s, 'liArrival', { get() { return window.__PIN_LI; }, set() {}, configurable: false, enumerable: true }); Object.defineProperty(s, '_liDeferIntent', { get() { return window.__PIN_LI === 'DEFERRED'; }, set() {}, configurable: false, enumerable: true }); } catch (_) {} s._liArrivalRecorded = true; }
  if (window.__PIN_SHAPE) { try { const lib = window.STORY_SHAPE_LIBRARY || {}; const shp = lib[window.__PIN_SHAPE]; if (shp) Object.defineProperty(s, '_invertedShape', { get() { return { shape: shp, _pinned: true }; }, set() {}, configurable: false, enumerable: true }); } catch (_) {} }
  s.picks = Object.assign(s.picks || {}, { world: 'Modern', worldSubtype: 'small_town', tone: 'Earnest', flavor: 'Billionaire', dynamic: 'Enemies', pov: 'First', length: 'fling', intensity: 'low', archetype: { primary: 'BEAUTIFUL_RUIN' }, playerMask: 'OPEN_VEIN', loveInterest: 'Male', identity: { playerName: 'Testa', partnerName: 'Rook' } });
  Object.assign(s, { world: 'Modern', worldSubtype: 'small_town', flavor: 'Billionaire', dynamic: 'Enemies', archetype: { primary: 'BEAUTIFUL_RUIN', modifier: null }, name: 'Testa', playerName: 'Testa', loveInterestName: 'Rook', partnerName: 'Rook', loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling', access: 'sub', subscribed: true, fortunes: 9999999, intensity: 'low', pov: 'First', identity: { playerName: 'Testa', partnerName: 'Rook' }, renderMode: 'literary', currentEngine: 'literary', storyId: 'dm-' + Math.random().toString(36).slice(2, 8), myUid: 'probe', _skipCorridorValidation: true });   // identical to the packet harness's state (the corridor-validation skip is what lets a bare unseeded state begin)
  s.picks.identity = s.identity; };
await page.waitForTimeout(2000);
await page.evaluate(([red, starve]) => { window.__PIN_LI = 'FROM_START'; window.__PIN_SHAPE = 'CARETAKING'; if (red === 'enumstale') window._cpEnumStale = true; if (red === 'starvedsilent') window._cpStarvedSilent = true; if (starve) window._cpStarveLabel = starve; }, [RED, STARVE]);
await page.evaluate(modern); await page.waitForTimeout(6000); await page.evaluate(modern);
let threw = null; try { await page.evaluate(() => Promise.race([window.handleBeginStory(), new Promise(x => setTimeout(x, 300000))])); } catch (e) { threw = String(e && e.message).slice(0, 200); }
for (let i = 0; i < 60 && authorReqs.length < 1; i++) await page.waitForTimeout(2000);
const mirror = await page.evaluate(() => { const c = window.__lastCPlusContract || {}; return { ordinary: c.ordinaryLabels || null, offered: c.offeredLabels || null, starved: c.starvedLabels || null, declined: c.declinedLabels || null, pcLabel: c.pcLabel || '', byLabelKeys: Object.keys(c.byLabel || {}), populations: c.populations || null }; });
console.log('\n=== PHASE 1 · OFFER PARTITION (unseeded corridor Scene 1) ===');
console.log('mirror: ' + JSON.stringify(mirror));
const candBlock = (plannerUsr.match(/CHARACTER\+ CANDIDATES \((\d+)\)[\s\S]*?(?=\nNOT CANDIDATES|\nEVERY character_plus|\nWHERE A PERSON HAS|\nRETURN THE facet_id|\nTHE SCENE, AS NUMBERED FACTS|$)/) || [''])[0];
const candN = parseInt((candBlock.match(/CANDIDATES \((\d+)\)/) || [, '0'])[1], 10);
const offeredBullets = [...candBlock.matchAll(/^\s*•\s*(.+?)\s*$/gm)].map(m => m[1]).filter(l => !/^—/.test(l));
const notBlock = (plannerUsr.match(/NOT CANDIDATES[\s\S]*?(?=\nWHERE A PERSON HAS|\nEVERY character_plus|\nRETURN THE facet_id|\nTHE SCENE, AS NUMBERED FACTS|$)/) || [''])[0];
const notBullets = [...notBlock.matchAll(/^\s*•\s*(.+?)\s*—\s*(.+?)\s*$/gm)].map(m => ({ label: m[1], reason: m[2] }));
const enumM = plannerUsr.match(/EXACTLY one of: ([^>]*?) — from the CHARACTER\+ CANDIDATES list/); const enumLabels = enumM ? enumM[1].split('|').map(x => x.trim()).filter(x => x && !/^\(nobody/.test(x)) : [];   // an empty offer renders "(nobody — …)" — that is the empty set, not a label
console.log('offered=' + JSON.stringify(offeredBullets) + ' enum=' + JSON.stringify(enumLabels) + ' not=' + JSON.stringify(notBullets));
const setEq = (a, b) => a.length === b.length && a.every(x => b.map(norm).includes(norm(x)));
ok('P0 the Scene-1 planner request was dispatched and an author request followed (delivery path alive)', !!plannerUsr && authorReqs.length >= 1, 'planner=' + !!plannerUsr + ' author=' + authorReqs.length + ' threw=' + threw);
ok('P1 [D1] the permitted-labels enum equals the OFFERED candidate bullets (set equality, normalized; an empty offer ⇒ the "(nobody)" placeholder and no labels)', setEq(enumLabels, offeredBullets) && (offeredBullets.length > 0 || /EXACTLY one of: \(nobody/.test(plannerUsr)), JSON.stringify({ enumLabels, offeredBullets }));
if (!offeredBullets.length) skip('P1 note', 'this invocation offered NOBODY — D1 is proven only in the degenerate case here; the STARVE mode (a candidate exists, then is starved) is the non-degenerate proof');
ok('P2 the offered bullets equal the mirror\'s offered set and the block count matches', !!mirror.offered && setEq(offeredBullets, mirror.offered) && candN === offeredBullets.length, JSON.stringify({ offeredBullets, mirrorOffered: mirror.offered, candN }));
ok('P3 POPULATION PARTITION: every ORDINARY label is offered XOR starved (once); declined ∩ ordinary = ∅ — cast membership is NOT an offer requirement', !!mirror.ordinary && mirror.ordinary.every(l => (mirror.offered.map(norm).includes(norm(l)) ? 1 : 0) + (mirror.starved.map(norm).includes(norm(l)) ? 1 : 0) === 1) && mirror.declined.every(l => !mirror.ordinary.map(norm).includes(norm(l))), JSON.stringify(mirror));
ok('P4 the PC is outside the ordinary population and appears in no list; her Scene-1 beat is pc_opening_fusion (requested of the planner)', !!mirror.pcLabel && ![...(mirror.ordinary || []), ...offeredBullets, ...notBullets.map(x => x.label)].map(norm).includes(norm(mirror.pcLabel)) && /pc_opening_fusion/.test(plannerUsr), JSON.stringify({ pc: mirror.pcLabel }));
if (mirror.starved && mirror.starved.length) {
  ok('P5 [D2] every STARVED label is listed under NOT CANDIDATES with the owned-evidence reason, exactly once, and is absent from the offer', mirror.starved.every(l => notBullets.filter(x => norm(x.label) === norm(l) && /no owned pressure evidence/.test(x.reason)).length === 1 && !offeredBullets.map(norm).includes(norm(l)) && !enumLabels.map(norm).includes(norm(l))), JSON.stringify({ starved: mirror.starved, notBullets, enumLabels }));
} else skip('P5 [D2] starved rendering', 'no starved person in this invocation (set STARVE=<label> to force one through the harness seam)');
ok('P6 every DECLINED label is listed under NOT CANDIDATES with the no-opportunity reason, exactly once (or there are none)', (mirror.declined || []).every(l => notBullets.filter(x => norm(x.label) === norm(l) && /no opportunity/.test(x.reason)).length === 1), JSON.stringify({ declined: mirror.declined, notBullets }));
ok('P7 nobody appears twice across offered ∪ NOT CANDIDATES', new Set([...offeredBullets, ...notBullets.map(x => x.label)].map(norm)).size === offeredBullets.length + notBullets.length, JSON.stringify({ offeredBullets, notBullets }));

console.log('\n=== PHASE 2 · CONTINUATION DELIVERY (real Scene-2 request through the submit path) ===');
const s1 = await page.evaluate(() => ({ turnCount: window.state.turnCount, scenes: (window.state.scenes || []).length, pages: window.StoryPagination.getPageCount() }));
console.log('after Scene 1: ' + JSON.stringify(s1));
const authorBefore = authorReqs.length;
// Scene 1 commits asynchronously after the author reply (post-author passes); the submit handler silently returns while
// state._isAdvancingScene is held. Wait for the commit, then for the lock to clear, before touching the inputs.
for (let i = 0; i < 60; i++) { const w = await page.evaluate(() => ({ scenes: (window.state.scenes || []).length, adv: !!window.state._isAdvancingScene })); if (w.scenes >= 1 && !w.adv) break; await page.waitForTimeout(2000); }
await page.evaluate(() => { const s = window.state; s.hasSeenFortuneTurnDisclosure = true; s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true; s._isAdvancingScene = false; s._advanceStartedAt = 0; });   // the submit handler returns silently on the first-use Fortune disclosure modal and on preview/cliffhanger gates — the delivery A/B harnesses pre-set these
const pre2 = await page.evaluate(() => ({ turnCount: window.state.turnCount, scenes: (window.state.scenes || []).length, adv: !!window.state._isAdvancingScene, submitDisabled: !!(document.getElementById('submitBtn') || {}).disabled, storyStage: window.state.storyStage || null, cliff: (typeof window._isAtIssueCliffhanger === 'function') ? !!window._isAtIssueCliffhanger() : null }));
console.log('before submit: ' + JSON.stringify(pre2));
await page.evaluate(() => { const ai = document.getElementById('actionInput'); if (ai) { ai.value = 'I put both hands flat on the counter and wait for him to finish the clause.'; ai.dispatchEvent(new Event('input', { bubbles: true })); } const di = document.getElementById('dialogueInput'); if (di) { di.value = 'Read it again. Slower.'; di.dispatchEvent(new Event('input', { bubbles: true })); } });
let clicked = false; for (let i = 0; i < 24 && !clicked; i++) { clicked = await page.evaluate(() => { const sb = document.getElementById('submitBtn'); if (sb && !sb.disabled) { sb.click(); return true; } return false; }); if (!clicked) await page.waitForTimeout(2500); }
for (let i = 0; i < 90 && authorReqs.length < authorBefore + 1; i++) await page.waitForTimeout(2000);
console.log('after submit: ' + JSON.stringify(await page.evaluate(() => { const g = id => { const e = document.getElementById(id); return e ? !e.classList.contains('hidden') : null; }; return { turnCount: window.state.turnCount, scenes: (window.state.scenes || []).length, adv: !!window.state._isAdvancingScene, previewActive: window.state.previewActive, disclosureModal: g('fortuneDisclosureModal'), cliffModal: g('issueCliffhangerModal'), isCliff: (typeof window.isCliffhangerMoment === 'function') ? !!window.isCliffhangerMoment() : null, cost: (typeof window.getTurnCost === 'function') ? window.getTurnCost() : null, billingLock: window.state.billingLock || window.billingLock || null }; })) + ' skeletonReqs=' + skeletonReqs.length + ' spineReqs=' + spineReqs.length + ' authorReqs=' + authorReqs.length);
const a2 = authorReqs[authorBefore] || null; const a2all = a2 ? a2.sys + '\n' + a2.usr : '';
const post = await page.evaluate(() => { const sk = window.state.sceneSkeleton || {}; const gs = (window.state._cpGeneratedStage || {})['2'] || null; const cp = Array.isArray(sk.character_plus) ? sk.character_plus.map(c => ({ character: c.character, mode: c.mode, facet_id: c.facet_id, option_id: c.option_id, facet_truth: c.facet_truth, pc_interpretation: c.pc_interpretation, pc_lens_operation: c.pc_lens_operation || null, not_physically_present: !!c.not_physically_present })) : []; return { turnCount: window.state.turnCount, plannerSupplied: sk._cpPlannerSupplied, cp, ep: sk.environment_plus || null, fu: sk.fusion || null, genStage2: gs ? { provenance: gs.provenance, participants: (gs.participants || []).map(p => p.ref + ':' + p.presence) } : null }; });
console.log('scene-2 state: ' + JSON.stringify(post).slice(0, 900));
if (a2) fs.writeFileSync('_validate_out/cplus_delivery_matrix.scene2_author_request.txt', a2all);
const mv = post.cp.find(c => /marcus/i.test(c.character || ''));
const cpBlock = (a2all.match(/^  • Marcus Vale[\s\S]*?(?=\n  • |\n  RECONSTRUCT)/m) || [''])[0];
const once = (h, nd) => !!nd && (h.split(nd).length - 1) === 1;
ok('C0 the submit path assembled a Scene-2 author request; the continuation skeleton planner was called ONCE and the scene-spine planner ran', clicked && !!a2 && skeletonReqs.length === 1 && spineReqs.length >= 1, JSON.stringify({ clicked, author2: !!a2, skeleton: skeletonReqs.length, spine: spineReqs.length, turnCount: post.turnCount }));
ok('C1 PRESENCE SOURCE: the generated stage for scene 2 was ingested from the skeleton reply (provenance planner_stage) with Marcus Vale IN_PERSON', !!post.genStage2 && /planner_stage/.test(String(post.genStage2.provenance)) && post.genStage2.participants.some(p => /marcus.*IN_PERSON/.test(p)), JSON.stringify(post.genStage2));
ok('C2 BACKEND-MINTED C+: exactly one entry for Marcus Vale with facet_id + option_id from his portfolio (the planner\'s own character_plus was discarded)', !!mv && !!mv.facet_id && !!mv.option_id && post.cp.filter(c => /marcus/i.test(c.character || '')).length === 1 && post.plannerSupplied === 1, JSON.stringify({ mv, plannerSupplied: post.plannerSupplied }));
ok('C3 the author receives Marcus Vale\'s block with MODE IN_PERSON and no absence marker', /^  • Marcus Vale[^\n]*— IN_PERSON\n/m.test(a2all) && !/• Marcus Vale[^\n]*NOT PHYSICALLY PRESENT/.test(a2all), (a2all.match(/^  • Marcus Vale[^\n]*/m) || ['(no block)'])[0]);
ok('C4 SOURCE TRUTH (backend-supplied, from the record) reaches the author exactly once and is the minted entry\'s truth', !!mv && !!mv.facet_truth && once(a2all, 'SOURCE TRUTH — DO NOT STATE: ' + mv.facet_truth), JSON.stringify({ truth: mv && mv.facet_truth, n: mv ? a2all.split('SOURCE TRUTH — DO NOT STATE: ' + mv.facet_truth).length - 1 : 0 }));
ok('C5 PC INTERPRETATION line is present once in his block (what the author must GOVERN the narration by)', once(cpBlock, 'PC INTERPRETATION — MUST GOVERN THE NARRATION:'), cpBlock.slice(0, 300));
ok('C6 [DEFECT EXPECTED] the interpretation is a specific reading, NOT the source truth restated (the author is told never to state the truth)', !!mv && !!mv.pc_interpretation && mv.pc_interpretation.indexOf(mv.facet_truth || '§') === -1, JSON.stringify({ interp: mv && mv.pc_interpretation, truth: mv && mv.facet_truth }));
ok('C7 [DEFECT EXPECTED] a lens operation (from the PC\'s archetype) is supplied and rendered for the continuation beat', !!mv && !!mv.pc_lens_operation && once(cpBlock, 'HOW HER ATTENTION MOVES ONTO IT (lens operation): ' + mv.pc_lens_operation), JSON.stringify({ op: mv && mv.pc_lens_operation }));
ok('C8 the planner\'s model-authored angle reaches nobody', a2all.indexOf('MODEL-ANGLE-SENTINEL') === -1, 'sentinel present');
ok('C9 E+ DELIVERY (ownership: skeleton planner FREE TEXT, not backend-issued ids): the assigned target and axis reach the author once', !!post.ep && once(a2all, 'ENVIRONMENT+ ASSIGNED THIS SCENE (required): ' + post.ep.target) && /the cracked steel counter/.test(a2all) && /damage/.test((a2all.match(/ENVIRONMENT\+ ASSIGNED THIS SCENE[^\n]*/) || [''])[0]), JSON.stringify({ ep: post.ep, line: (a2all.match(/ENVIRONMENT\+ ASSIGNED THIS SCENE[^\n]*/) || [''])[0].slice(0, 200) }));
ok('C10 FUSION DELIVERY (ownership: skeleton planner free text): the person and target reach the author once', !!post.fu && once(a2all, 'FUSION — one sentence in which Marcus Vale and the cracked steel counter'), (a2all.match(/FUSION — [^\n]*/) || ['(no fusion line)'])[0].slice(0, 200));
ok('C11 the E+ target is NOT validated against issued ids on this path (recorded, not celebrated): no environment_element_ids / target_object_id on the continuation skeleton', !!post.ep && !('target_object_id' in (post.ep || {})), JSON.stringify(post.ep));
console.log('\nrequest census: ' + JSON.stringify(census));
console.log('logs: ' + logs.filter(l => /CONTINUATION|CPLUS:OPTIONS|NO-OWNED|GENERATED|SUBMIT:|BEGIN:DONE|SCENE1:COMMIT|REFUND|BeginStory/.test(l)).slice(0, 16).join('\n      '));
await browser.close();
const fails = rows.filter(r => !r[1]).map(r => r[0].split(' ')[0]); console.log(`\nDELIVERY MATRIX${RED ? ' (RED=' + RED + ')' : ''}${STARVE ? ' (STARVE=' + STARVE + ')' : ''}: ${rows.length} rows · ${rows.length - fails.length} passed · ${fails.length} failed` + (fails.length ? ' → ' + fails.join(' ') : '')); process.exit(fails.length ? 1 : 0);
