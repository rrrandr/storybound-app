// SCENE-1 REPAIR CASCADE — same-execution proof. No cross-run comparison.
//
// STATUS: the tier this harness characterises was RETIRED on 2026-08-25 on the strength
// of these very results (see _scene1_surgical_retirement.mjs for the live regression).
// It is no longer reachable in production. This harness now runs the implementation via
// the developer opt-in `window._scene1SurgicalRepairEnabled = true` so the four branch
// outcomes stay documented and re-verifiable if the tier is ever reconsidered.
//
// Established statically: Scene-1 full Grok regeneration is dead code
// (_buildStrengthenedUser has no caller). The only reachable repair tier is the Mistral
// surgical editor, bounded by _MAX_SCENE1_REGEN_ATTEMPTS (default 2).
//
// The fixture is built mechanically by _hook_fixture.mjs and shared via
// _hook_fixture_prose.mjs: the draft fails exactly ONE hard gate, `hook`
// (reason `no_object_token`), which is retained by the production filter and survives
// _hardInitialFails. The repair variants differ from it only in the object word.
//
// TWO PRODUCT FACTS THIS HARNESS EXISTS TO PROVE, both found while building it:
//
//   1. A drift rejection `break`s the loop (app.js:255745). So "two drift rejections"
//      is UNREACHABLE — the drift path can only ever produce ONE surgical request.
//      The sole route to a second attempt is drift-OK-but-still-failing (:255837),
//      the one branch that does not break.
//
//   2. `_currentText = _regenText` (:255806 and :255856) sits in the ELSE of
//      `if (typeof window === 'undefined' || window._scene1GateAcceptOff !== false)`.
//      In a browser with the flag unset, `undefined !== false` is TRUE, so the
//      ACCEPT-SUPPRESSED branch runs and the assignment never executes. Under
//      production defaults the surgical editor's output is NEVER adopted, even when
//      it is drift-clean and clears every gate. The pen is already removed.
//
// Each scenario asserts the text at THREE points: the loop exit (`_currentText`, via the
// instrumenter's probe), the downstream boundary (`text = _currentText`, via the
// pre-existing __textSnap sites 252463/252466), and the mounted page.
//
// usage: node _scene1_repair_cascade.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import { instrument } from './_scene1_instrument.mjs';
import { buildScene1Prose, countObject, TOKEN_WORD, NONTOKEN_A, NONTOKEN_B, SCENE_WANT } from './_hook_fixture_prose.mjs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
function force(src, fn, v) {
  const needle = `function ${fn}() {`;
  if (src.split(needle).length - 1 !== 1) throw new Error(`${fn}: not exactly one definition`);
  return src.replace(needle, `${needle} return ${v};`);
}
const APP_SRC = instrument(force(force(SRC, '_litLiteActive', 'false'), '_hotFastActive', 'true'));

// ── prose fixtures (mechanically derived; see _hook_fixture.mjs) ──────────────
const ORIGINAL       = buildScene1Prose(NONTOKEN_A);  // one hard fail: hook/no_object_token
const REPAIR_CLEAN   = buildScene1Prose(TOKEN_WORD);  // drift-safe AND clears every gate
const REPAIR_FAILING = buildScene1Prose(NONTOKEN_B);  // drift-safe but STILL hook-failing
const REPAIR_DRIFTY  = 'DRIFTYREPAIR.\n\nEverything about the hall had changed and nobody remembered it.';

const PASSTHROUGH = /\/api\/(config|geo|csp-report)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 } };
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/;
const L = 'she understands the wish has already begun to cost her something she cannot name';
const SCAFFOLD = { pressure_source_type:'institutional', pressure_source:L, hook_object:'the band',
  opening_beat:'She sets the relic down', rising_beats:['a','b'], decision_beat:'Does she name it',
  pc_career:'shrine witness', opening_setting:'the hall', li_texture_beat:'He crosses toward her',
  interlocutor_placement:'The Dohkar stands between', pc_wound_anchor:L,
  pc_self_presentation_beat:'decision', scene_want:SCENE_WANT, scene_mission:L, reader_state:{knows:L},
  mission_family:'extraction', mission_attempt:L, immediate_result:L, pc_body_callback:'decision',
  li_body_callback:'opening', antagonist_body_callback:null, perceptual_signature_beat:L,
  staged_characters:[{name:'Lirael', anchor_beat:L}] };
const GENERIC = { goal:L, antagonistOrAntiForce:'the assembly', milestones:[], scenes:[], timelineLength:20,
  characters:[], name:'Julian', distinguishing_feature:'a burn scar', private_hope:L,
  defining_anecdote:L, attraction_manifestation:L, desire_register_exemplars:[L] };

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

/** Which fixture a piece of text is, by its object-word signature. */
const identify = txt => ({
  original: countObject(txt, NONTOKEN_A),
  failing:  countObject(txt, NONTOKEN_B),
  clean:    countObject(txt, TOKEN_WORD),
  drifty:   /DRIFTYREPAIR/.test(String(txt || '')) ? 1 : 0,
});

async function run(mode) {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  const surgical = [], author = [], escaped = [], unknown = [];
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: APP_SRC }));
  await page.route('**/api/**', async route => {
    const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (PASSTHROUGH.test(url)) return route.continue();
    const k = Object.keys(LOCAL).find(x => url.startsWith(x));
    if (k) return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(LOCAL[k]) });
    let b=null; try { b = JSON.parse(route.request().postData()||'{}'); } catch(_){}
    if (!MODEL.test(url)) { unknown.push(url); return route.abort(); }
    const m=(b&&b.messages)||[];
    const sys=String((m.find(x=>x.role==='system')||{}).content||'');
    const usr=String((m.find(x=>x.role==='user')||{}).content||'');
    let out;
    if (/ARCHITECTURE LAWS/.test(sys)) {                       // the Scene-1 author
      author.push({ system: sys, user: usr, max_tokens: b.max_tokens, temperature: b.temperature,
                    reasoning_effort: b.reasoning_effort, response_format: b.response_format, url });
      out = ORIGINAL;
    } else if (/scene-structure planner for the OPENING scene/.test(sys)) {
      // Nested envelope (Commit B part 2); skeleton derived from the advertised eligible cast.
      const _m = usr.match(/ELIGIBLE CAST \((\d+)\)[^\n]*\n([\s\S]*?)\nExactly one/);
      const _cast = _m ? _m[2].split('\n').map(x => x.replace(/^\s*•\s*/, '').trim()).filter(Boolean) : [];
      out = JSON.stringify({ opening_spine: SCAFFOLD, scene_skeleton: {
        character_plus: _cast.map(n => ({ character: n, first_mention: true, angle: 'holds the room steady at cost' })),
        environment_plus: { target: 'the shrine table', axis: 'ritual' }, fusion: null } });
    } else if (b && b.role === 'SPECIALIST_RENDERER' && /mistral-proxy/.test(url) && /paragraph/i.test(usr)) {
      // the surgical editor: its user prompt carries the paragraph-level FIX instructions
      surgical.push({ system: sys, user: usr, max_tokens: b.max_tokens, temperature: b.temperature,
                      reasoning_effort: b.reasoning_effort, response_format: b.response_format, url });
      out = mode === 'drift'         ? REPAIR_DRIFTY
          : mode === 'still-failing' ? REPAIR_FAILING
          :                            REPAIR_CLEAN;
    } else if (/ruthless line-editor|Fix ONLY mechanical/.test(sys)
               || (b && ['SPECIALIST_RENDERER','LINE_EDITOR','INTIMACY_SPECIALIST'].includes(b.role))) {
      out = ORIGINAL;                                          // downstream prose stages: echo
    } else out = JSON.stringify(GENERIC);
    return route.fulfill({ status:200, contentType:'application/json',
      body: JSON.stringify({ content: out, choices:[{message:{content: out}}] }) });
  });
  page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
  const logs = [];
  page.on('console', m => { const x=m.text(); if (/SCENE1-GATE|Validate/.test(x)) logs.push(x.slice(0,200)); });

  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout:40000 });
  const res = await page.evaluate(async ({ mode }) => {
    const s = window.state;
    window.__textSnap = [];                     // enable the pre-existing boundary snapshots
    window._scene1SurgicalRepairEnabled = true; // RETIRED in production — opt in to characterise it
    if (mode === 'accept-on') window._scene1GateAcceptOff = false;   // restore the pen
    const def = (window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
    s.picks = s.picks||{};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>{ s.picks[k]=def[k]; });
    Object.assign(s,{ world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
      _starterId:def.id, is_starter_story:true, immutableTitle:def.title, archetype:{primary:def.archetype,modifier:null},
      name:'Lirael', playerName:'Lirael', loveInterestName:'Julian', partnerName:'Julian', loveInterest:'Male',
      liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true,
      fortunes:9999999, intensity:'Steamy', pov:'first_person', identity:{playerName:'Lirael',partnerName:'Julian'},
      renderMode:'literary', currentEngine:'literary', storyId:'repaircascade', myUid:'probe' });
    s.picks.identity = s.identity; s._skipCorridorValidation = true;
    s._openingTemperature = 'COLD'; s._scene1HookObjectRequired = true;
    const maxAttempts = (window._scene1RegenAttempts != null) ? (Number(window._scene1RegenAttempts)||0) : 2;
    try { await Promise.race([window.handleBeginStory(), new Promise(x=>setTimeout(x,120000))]); } catch(_){}
    s._skipCorridorValidation = false;
    const boundary = (window.__textSnap||[]).filter(e => e && (e.site === 252463 || e.site === 252466));
    return { maxAttempts,
      loopExit: window.__x_loopExit == null ? null : String(window.__x_loopExit),
      regenCount: window.__x_regenCount == null ? null : window.__x_regenCount,
      boundarySites: boundary.map(e => e.site),
      boundaryText: boundary.length ? String(boundary[boundary.length-1].after || '') : null,
      mounted: (window.StoryPagination.getAllContent()||'').replace(/<[^>]*>/g,' '),
      fingerprint: window.__scene1RequestFingerprint || null };
  }, { mode });
  await browser.close();
  return { mode, surgical, author, escaped, unknown, logs, ...res };
}

console.log(`\n${'═'.repeat(90)}\nSCENE-1 REPAIR CASCADE — same-execution proof\n${'═'.repeat(90)}`);
console.log(`\n  fixture: ORIGINAL fails exactly one HARD gate — hook/no_object_token`);
console.log(`  variants differ ONLY in the opening object word: `
  + `${NONTOKEN_A}=original · ${NONTOKEN_B}=still-failing · ${TOKEN_WORD}=clean`);

function report(r, title) {
  console.log(`\n ${title}`);
  console.log(`   surgical requests     : ${r.surgical.length}   (_regenCount=${r.regenCount}, max=${r.maxAttempts})`);
  console.log(`   loop-exit text is     : ${JSON.stringify(identify(r.loopExit))}`);
  console.log(`   boundary sites hit    : ${JSON.stringify(r.boundarySites)}`);
  console.log(`   boundary text is      : ${JSON.stringify(identify(r.boundaryText))}`);
  console.log(`   mounted text is       : ${JSON.stringify(identify(r.mounted))}`);
  const key = r.logs.filter(l=>/REJECTED|accepted|ACCEPT SUPPRESSED|still failing|Shipping/.test(l));
  key.slice(0,4).forEach(l=>console.log(`     · ${l.slice(0,140)}`));
}

// ── A · drift rejection ──────────────────────────────────────────────────────
const A = await run('drift');
report(A, 'A · SURGICAL OUTPUT DRIFTS');
t('A: production default is 2 attempts', A.maxAttempts === 2, `got ${A.maxAttempts}`);
t('A: a drift rejection breaks the loop — exactly ONE surgical request', A.surgical.length === 1,
  `got ${A.surgical.length}; "two drift rejections" is unreachable`);
t('A: the drift rejection was logged', A.logs.some(l=>/REJECTED — drift/.test(l)),
  A.logs.filter(l=>/Surgical/.test(l)).join(' | ').slice(0,200));
t('A: loop exit holds the ORIGINAL draft, byte-identical to the author output',
  A.loopExit === ORIGINAL, JSON.stringify(identify(A.loopExit)));
t('A: boundary text === loop-exit text (byte-identical)', A.boundaryText === A.loopExit);
t('A: drifted output never mounts', identify(A.mounted).drifty === 0);
t('A: the ORIGINAL draft is what mounts', identify(A.mounted).original > 0);
t('A: zero escaped requests', A.escaped.length === 0);
t('A: zero unknown model signatures', A.unknown.length === 0, JSON.stringify(A.unknown.slice(0,3)));

// ── HOTFAST author dispatch, asserted on the OUTGOING request ────────────────
console.log(`\n HOTFAST AUTHOR DISPATCH (captured, not inferred)`);
const au = A.author[0];
t('exactly one author dispatch', A.author.length === 1, `got ${A.author.length}`);
if (au) {
  t('descriptor variant is hotfast', A.fingerprint && A.fingerprint.variant === 'hotfast', JSON.stringify(A.fingerprint));
  t('HOTFAST ceiling is 700', au.max_tokens === 700, `got ${au.max_tokens}`);
  t('outgoing request carries architecture/voice laws', /ARCHITECTURE LAWS/.test(au.system));
  t('outgoing request carries S. TORY BOUND voice', /S\. ?TORY BOUND|TORY BOUND/i.test(au.system));
  t('outgoing request carries A/50', /A\/50|A-50|A50/.test(au.user + au.system));
  t('outgoing request carries the opening spine (scaffold)',
    /SCAFFOLD|pressure_source|opening_beat|decision_beat/i.test(au.user));
  t('no skeleton directive present yet (Commit B inserts it)',
    !/SCENE SKELETON|ASSIGNED EVENT \(this scene MUST/.test(au.system));
  console.log(`     system ${au.system.length} chars · user ${au.user.length} chars · temp ${au.temperature}`);
  console.log(`\n   SURGICAL REQUEST PARAMETERS`);
  A.surgical.forEach((q,i)=>console.log(`     [${i+1}] ${q.url}  max_tokens=${q.max_tokens} temp=${q.temperature}`
    + ` reasoning_effort=${q.reasoning_effort===undefined?'(absent)':q.reasoning_effort}`
    + ` response_format=${q.response_format?JSON.stringify(q.response_format):'(absent)'}`
    + `\n         sysLen=${q.system.length} userLen=${q.user.length}`));
  t('surgical request targets the hook failure', /hook|opening|object/i.test(A.surgical[0].user));
}

// ── B · drift-OK but still failing: the ONLY path to a second attempt ────────
const B = await run('still-failing');
report(B, 'B · SURGICAL OUTPUT IS DRIFT-OK BUT STILL FAILS THE GATE');
t('B: the loop runs to its bound — exactly TWO surgical requests', B.surgical.length === 2,
  `got ${B.surgical.length}`);
t('B: both attempts logged as still failing', B.logs.filter(l=>/still failing/.test(l)).length === 2,
  B.logs.filter(l=>/still failing/.test(l)).length + ' logged');
t('B: loop exit STILL holds the ORIGINAL draft (accept suppressed)', B.loopExit === ORIGINAL,
  JSON.stringify(identify(B.loopExit)));
t('B: boundary text === loop-exit text (byte-identical)', B.boundaryText === B.loopExit);
t('B: the ORIGINAL draft is what mounts', identify(B.mounted).original > 0);
t('B: zero escaped requests', B.escaped.length === 0);

// ── C · drift-clean repair that clears every gate, PRODUCTION DEFAULTS ───────
const C = await run('accept-default');
report(C, 'C · REPAIR IS DRIFT-CLEAN AND CLEARS EVERY GATE — production defaults');
t('C: exactly ONE surgical request (loop breaks on accept)', C.surgical.length === 1, `got ${C.surgical.length}`);
t('C: the gate logs the repair as ACCEPTED', C.logs.some(l=>/Regen attempt 1 accepted/.test(l)),
  C.logs.filter(l=>/Regen attempt/.test(l)).join(' | ').slice(0,220));
t('C: …but the assignment is SUPPRESSED', C.logs.some(l=>/ACCEPT SUPPRESSED/.test(l)),
  'app.js:255798 — `window._scene1GateAcceptOff !== false` is true when the flag is unset');
t('C: loop exit holds the ORIGINAL, NOT the accepted repair',
  identify(C.loopExit).original > 0 && identify(C.loopExit).clean <= 1,
  JSON.stringify(identify(C.loopExit)));
t('C: the ORIGINAL is unmodified at loop exit (byte-identical to the author output)',
  C.loopExit === ORIGINAL);
t('C: boundary text === loop-exit text (byte-identical)', C.boundaryText === C.loopExit);
t('C: the accepted repair never mounts — ORIGINAL ships', identify(C.mounted).original > 0);
t('C: zero escaped requests', C.escaped.length === 0);

// ── D · the same repair with the pen restored ───────────────────────────────
const D = await run('accept-on');
report(D, 'D · SAME REPAIR, window._scene1GateAcceptOff = false (pen restored)');
t('D: exactly ONE surgical request', D.surgical.length === 1, `got ${D.surgical.length}`);
t('D: the gate logs the repair as ACCEPTED', D.logs.some(l=>/Regen attempt 1 accepted/.test(l)),
  D.logs.filter(l=>/Regen attempt/.test(l)).join(' | ').slice(0,220));
t('D: no ACCEPT SUPPRESSED log', !D.logs.some(l=>/ACCEPT SUPPRESSED/.test(l)));
t('D: loop exit now holds the ACCEPTED repair', D.loopExit === REPAIR_CLEAN,
  JSON.stringify(identify(D.loopExit)));
t('D: boundary text === loop-exit text (byte-identical)', D.boundaryText === D.loopExit);
// The mount is dedup-collapsed ([PROSE:DEDUP]), so identify by PRESENCE, not count.
t('D: the repaired text is what mounts', identify(D.mounted).original === 0 && identify(D.mounted).clean >= 1,
  JSON.stringify(identify(D.mounted)));
t('D: zero escaped requests', D.escaped.length === 0);

console.log(`\n${'─'.repeat(90)}\n  ${pass} passed · ${fail} failed\n`);
const slim = r => ({ ...r, author: r.author.map(x=>({...x, system:x.system.slice(0,300), user:x.user.slice(0,300)})),
  surgical: r.surgical.map(x=>({...x, system:x.system.slice(0,300), user:x.user.slice(0,600)})),
  loopExit: undefined, boundaryText: undefined, mounted: undefined });
fs.writeFileSync('_scene1_repair_cascade.json', JSON.stringify({ A:slim(A), B:slim(B), C:slim(C), D:slim(D) }, null, 1));
process.exit(fail ? 1 : 0);
