// SCENE-1 SURGICAL REPAIR RETIREMENT — network-fenced regression.
//
// The tier issued up to two paid mistral-small calls per hard-failing Scene 1 and
// discarded the result in every case (proven by _scene1_repair_cascade.mjs, 39/39).
// It is now telemetry-only. This proves, inside a single fenced execution, that a
// draft with a real hard failure:
//
//   • is still EVALUATED and LOGGED (hard + soft telemetry survives)
//   • keeps `decision` validate-only
//   • issues ZERO /api/mistral-proxy surgical requests
//   • runs NO retry loop
//   • hands the byte-identical author draft to the downstream boundary and the mount
//   • leaves downstream line-editor / mechanical / specialist behaviour untouched
//
// It also proves the diagnostic opt-in is OFF by default and cannot be switched on
// through persisted state or localStorage — only by setting the window flag directly.
//
// The fixture is the same mechanically-built one used by the cascade harness: exactly
// one hard failure, hook/no_object_token.
//
// usage: node _scene1_surgical_retirement.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import { instrument } from './_scene1_instrument.mjs';
import { buildScene1Prose, countObject, TOKEN_WORD, NONTOKEN_A, SCENE_WANT } from './_hook_fixture_prose.mjs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
function force(src, fn, v) {
  const needle = `function ${fn}() {`;
  if (src.split(needle).length - 1 !== 1) throw new Error(`${fn}: not exactly one definition`);
  return src.replace(needle, `${needle} return ${v};`);
}
const APP_SRC = instrument(force(force(SRC, '_litLiteActive', 'false'), '_hotFastActive', 'true'));

const ORIGINAL = buildScene1Prose(NONTOKEN_A);   // one hard fail: hook/no_object_token

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

async function run(optIn) {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  const surgical = [], author = [], downstream = [], planner = [], escaped = [], unknown = [];
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
    if (/ARCHITECTURE LAWS/.test(sys)) {
      author.push({ max_tokens: b.max_tokens, temperature: b.temperature });
      out = ORIGINAL;
    } else if (/scene-structure planner for the OPENING scene/.test(sys)) {
      planner.push({ url, model: b.model, temperature: b.temperature, max_tokens: b.max_tokens,
                     reasoning_effort: b.reasoning_effort, response_format: b.response_format });
      // Nested envelope (Commit B part 2). The skeleton is derived from the ELIGIBLE CAST the
      // request advertises, so this fixture cannot drift from the contract it is exercising.
      const _m = usr.match(/ELIGIBLE CAST \((\d+)\)[^\n]*\n([\s\S]*?)\nExactly one/);
      const _cast = _m ? _m[2].split('\n').map(x => x.replace(/^\s*•\s*/, '').trim()).filter(Boolean) : [];
      out = JSON.stringify({
        opening_spine: SCAFFOLD,
        scene_skeleton: {
          character_plus: _cast.map(n => ({ character: n, first_mention: true, angle: 'holds the room steady at cost' })),
          environment_plus: { target: 'the shrine table', axis: 'ritual' },
          fusion: null,
        },
      });
    } else if (b && b.role === 'SPECIALIST_RENDERER' && /mistral-proxy/.test(url) && /paragraph/i.test(usr)) {
      surgical.push({ url, userLen: usr.length });          // must never fire
      out = ORIGINAL;
    } else if (/ruthless line-editor|Fix ONLY mechanical/.test(sys)
               || (b && ['SPECIALIST_RENDERER','LINE_EDITOR','INTIMACY_SPECIALIST'].includes(b.role))) {
      downstream.push({ url, role: b && b.role });
      out = ORIGINAL;
    } else out = JSON.stringify(GENERIC);
    return route.fulfill({ status:200, contentType:'application/json',
      body: JSON.stringify({ content: out, choices:[{message:{content: out}}] }) });
  });
  page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
  const logs = [];
  page.on('console', m => { const x=m.text(); if (/SCENE1-GATE|SCENE-WANT/.test(x)) logs.push(x.slice(0,240)); });

  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout:40000 });
  const res = await page.evaluate(async ({ optIn }) => {
    const s = window.state;
    window.__textSnap = [];
    // Hostile setup: every legacy re-enable mechanism is primed. None may switch the
    // tier back on — only the window opt-in can, and only when set to boolean true.
    try { localStorage.setItem('_scene1SurgicalRepairEnabled', 'true'); } catch (_) {}
    try { localStorage.setItem('sb_scene1_regen', '2'); } catch (_) {}
    s._scene1SurgicalRepairEnabled = true;          // persisted user state — must be ignored
    window._scene1RegenAttempts = 2;                // legacy attempts knob — must not re-enable
    const defaultOff = window._scene1SurgicalRepairEnabled === undefined;
    if (optIn) window._scene1SurgicalRepairEnabled = true;
    const def = (window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
    s.picks = s.picks||{};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>{ s.picks[k]=def[k]; });
    Object.assign(s,{ world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
      _starterId:def.id, is_starter_story:true, immutableTitle:def.title, archetype:{primary:def.archetype,modifier:null},
      name:'Lirael', playerName:'Lirael', loveInterestName:'Julian', partnerName:'Julian', loveInterest:'Male',
      liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true,
      fortunes:9999999, intensity:'Steamy', pov:'first_person', identity:{playerName:'Lirael',partnerName:'Julian'},
      renderMode:'literary', currentEngine:'literary', storyId:'surgretire', myUid:'probe' });
    s.picks.identity = s.identity; s._skipCorridorValidation = true;
    s._openingTemperature = 'COLD'; s._scene1HookObjectRequired = true;
    try { await Promise.race([window.handleBeginStory(), new Promise(x=>setTimeout(x,120000))]); } catch(_){}
    s._skipCorridorValidation = false;
    const boundary = (window.__textSnap||[]).filter(e => e && (e.site === 252463 || e.site === 252466));
    return { defaultOff,
      loopExit: window.__x_loopExit == null ? null : String(window.__x_loopExit),
      regenCount: window.__x_regenCount == null ? null : window.__x_regenCount,
      boundaryText: boundary.length ? String(boundary[boundary.length-1].after || '') : null,
      mounted: (window.StoryPagination.getAllContent()||'').replace(/<[^>]*>/g,' ') };
  }, { optIn });
  await browser.close();
  return { surgical, author, downstream, planner, escaped, unknown, logs, ...res };
}

console.log(`\n${'═'.repeat(88)}\nSCENE-1 SURGICAL REPAIR — RETIREMENT REGRESSION\n${'═'.repeat(88)}\n`);

const R = await run(false);
console.log(`  surgical requests : ${R.surgical.length}   (_regenCount=${R.regenCount})`);
console.log(`  downstream stages : ${R.downstream.length}`);
R.logs.filter(l=>/RETIRED|Initial HARD|DECISION|Shipping/.test(l)).slice(0,5).forEach(l=>console.log(`    · ${l.slice(0,180)}`));
console.log('');

// ── the tier is gone ──
t('ZERO surgical model requests issued', R.surgical.length === 0, JSON.stringify(R.surgical));
t('no retry loop executed (_regenCount === 0)', R.regenCount === 0, `got ${R.regenCount}`);
t('the retirement is logged', R.logs.some(l=>/Surgical repair RETIRED/.test(l)));
t('the diagnostic opt-in defaults OFF', R.defaultOff === true);
t('persisted state / localStorage cannot re-enable it',
  R.surgical.length === 0 && R.logs.some(l=>/Surgical repair RETIRED/.test(l)),
  'state._scene1SurgicalRepairEnabled, two localStorage keys and window._scene1RegenAttempts=2 were all set');

// ── telemetry survives ──
t('hard failures are still evaluated and logged', R.logs.some(l=>/Initial HARD failures/.test(l)),
  R.logs.filter(l=>/HARD/.test(l)).join(' | ').slice(0,200));
t('the hook failure is named in telemetry', R.logs.some(l=>/hook\(no_object_token\)/.test(l)),
  R.logs.filter(l=>/Initial HARD/.test(l)).join(' | ').slice(0,200));
t('`decision` remains validate-only', R.logs.some(l=>/SCENE1-GATE:DECISION\] validate-only/.test(l))
  || !R.logs.some(l=>/decision.*regen/i.test(l)));
t('soft-fail telemetry path intact (scene_want observed)', R.logs.some(l=>/SCENE-WANT/.test(l)));

// ── the draft is untouched at every point ──
t('loop exit is the author draft, byte-identical', R.loopExit === ORIGINAL);
t('downstream boundary is the author draft, byte-identical', R.boundaryText === ORIGINAL);
t('boundary === loop exit', R.boundaryText === R.loopExit);
t('the author draft is what mounts', countObject(R.mounted, NONTOKEN_A) >= 1
  && countObject(R.mounted, TOKEN_WORD) <= 1, JSON.stringify({
    original: countObject(R.mounted, NONTOKEN_A), clean: countObject(R.mounted, TOKEN_WORD) }));

// ── downstream behaviour unchanged ──
t('downstream line-editor/specialist stages still ran', R.downstream.length > 0, `got ${R.downstream.length}`);
t('exactly one author dispatch', R.author.length === 1, `got ${R.author.length}`);

// ── fence ──
console.log('\n  OPENING PLANNER REQUEST (migrated):');
R.planner.forEach(q=>console.log(`    ${q.url}  model=${q.model} temp=${q.temperature} max_tokens=${q.max_tokens}`
  + ` reasoning_effort=${q.reasoning_effort===undefined?'(ABSENT)':q.reasoning_effort}`
  + ` response_format=${q.response_format?JSON.stringify(q.response_format):'(ABSENT)'}`));
R.logs.filter(l=>/PLANNER/.test(l)).slice(0,2).forEach(l=>console.log(`    · ${l.slice(0,170)}`));
t('exactly ONE opening-planner request', R.planner.length === 1, `got ${R.planner.length}`);
t('planner routes to mistral-proxy', R.planner[0] && /mistral-proxy/.test(R.planner[0].url));
t('planner model is mistral-small-latest', R.planner[0] && R.planner[0].model === 'mistral-small-latest');
t('planner reasoning_effort is EXPLICIT none', R.planner[0] && R.planner[0].reasoning_effort === 'none');
t('planner uses JSON mode', R.planner[0] && R.planner[0].response_format
  && R.planner[0].response_format.type === 'json_object');
t('planner budget is the calculated value, not the old flat 1200',
  R.planner[0] && R.planner[0].max_tokens >= 1800, `got ${R.planner[0] && R.planner[0].max_tokens}`);
t('zero escaped requests', R.escaped.length === 0, JSON.stringify(R.escaped.slice(0,3)));
t('zero unknown model signatures', R.unknown.length === 0, JSON.stringify(R.unknown.slice(0,3)));

console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
