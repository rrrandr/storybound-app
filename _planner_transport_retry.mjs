// TRANSPORT-ONLY RETRY — free, network-fenced, zero real model calls.
//
// Proves the policy exactly: ONE retry, only for a request that never answered (connection
// failure / 429 / retryable 5xx), Retry-After honoured, and NEVER a retry after any successful
// HTTP response — malformed JSON and semantic rejection stay one-request hard faults.
//
// usage: node _planner_transport_retry.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import { buildScene1Prose, NONTOKEN_A, SCENE_WANT } from './_hook_fixture_prose.mjs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
function force(src, fn, v) {
  const needle = `function ${fn}() {`;
  if (src.split(needle).length - 1 !== 1) throw new Error(`${fn}: not exactly one definition`);
  return src.replace(needle, `${needle} return ${v};`);
}
const APP = force(force(SRC, '_litLiteActive', 'false'), '_hotFastActive', 'false');

const PROSE = buildScene1Prose(NONTOKEN_A);
const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/;
const L = 'she understands the wish has already begun to cost her something she cannot name';
const GENERIC = { goal:L, antagonistOrAntiForce:'the assembly', milestones:[], scenes:[], timelineLength:20,
  characters:[], name:'Julian', distinguishing_feature:'a burn scar', private_hope:L,
  defining_anecdote:L, attraction_manifestation:L, desire_register_exemplars:[L] };

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

function goodPlan(usr) {
  const m = usr.match(/ELIGIBLE CAST \((\d+)\)[^\n]*\n([\s\S]*?)\nExactly one/);
  const cast = m ? m[2].split('\n').map(x => x.replace(/^\s*•\s*/, '').trim()).filter(Boolean) : [];
  const wm = usr.match(/WHERE \(fixed\):\s*([^\n]+)/);
  const where = wm ? wm[1].trim() : '';
  const tok = (where.toLowerCase().match(/\b[a-z]{5,}\b/g) || ['room']);
  const target = tok[tok.length - 1];
  return JSON.stringify({
    opening_spine: { pressure_source_type:'institutional', pressure_source:L, hook_object:'the band',
      opening_beat:'The rite is underway', rising_beats:['a','b'], decision_beat:'Does she name it',
      pc_career:'shrine witness', opening_setting:where.slice(0, 60), li_texture_beat:'He crosses toward her',
      interlocutor_placement:'The Dohkar stands between', pc_wound_anchor:L,
      pc_self_presentation_beat:'decision', scene_want:SCENE_WANT, scene_mission:L,
      reader_state:{ knows:L, believes:L, wondering:L, must_not_confuse:L },
      pc_body_callback:'decision', li_body_callback:'opening', antagonist_body_callback:null,
      perceptual_signature_beat:L,
      staged_characters: cast.map(n => ({ name:n, presence_mode:'IN_PERSON', role_to_protagonist:'witness' })) },
    scene_skeleton: {
      character_plus: cast.map(n => ({ character:n, first_mention:true, angle:`${n} checks the youth's hands first` })),
      environment_plus: { target, axis:'ritual' },
      fusion: { character: cast[0], target, beat:`she sets her palm flat on the ${target} to keep it still` },
    },
  });
}
// A plan that PARSES but must fail semantic validation — an unknown recipient.
function semanticallyBadPlan(usr) {
  const p = JSON.parse(goodPlan(usr));
  p.scene_skeleton.character_plus.push({ character:'Nobody Here', first_mention:true, angle:'sets the cloth straight twice' });
  return JSON.stringify(p);
}

const browser = await chromium.launch({ headless: true });

// `mode` shapes ONLY the first planner response; later ones always succeed, so a second
// request can only be a genuine retry.
async function run(mode) {
  const page = await (await browser.newContext()).newPage();
  const plannerCalls = [], author = [], escaped = [], unknown = [];
  const logs = [];
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: APP }));
  await page.route('**/api/**', async route => {
    const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (PASSTHROUGH.test(url)) return route.continue();
    if (url.startsWith('/api/consume-fortune')) {
      return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ success:true, fortunesRemaining:9999 }) });
    }
    let b=null; try { b = JSON.parse(route.request().postData()||'{}'); } catch(_){}
    if (!MODEL.test(url)) { unknown.push(url); return route.abort(); }
    const m=(b&&b.messages)||[];
    const sys=String((m.find(x=>x.role==='system')||{}).content||'');
    const usr=String((m.find(x=>x.role==='user')||{}).content||'');

    if (/scene-structure planner for the OPENING scene/.test(sys)) {
      const n = ++plannerCalls.length;
      plannerCalls[n-1] = { at: Date.now() };
      if (n === 1) {
        if (mode === 'connection')  return route.abort('connectionrefused');
        if (mode === '429')         return route.fulfill({ status:429, headers:{ 'Retry-After':'1' }, contentType:'application/json', body: JSON.stringify({ error:'Rate limit exceeded' }) });
        if (mode === '503')         return route.fulfill({ status:503, contentType:'application/json', body: JSON.stringify({ error:'upstream unavailable' }) });
        if (mode === '400')         return route.fulfill({ status:400, contentType:'application/json', body: JSON.stringify({ error:'bad request' }) });
        if (mode === 'malformed')   return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ choices:[{ message:{ content:'I could not produce a plan.' } }] }) });
        if (mode === 'semantic')    return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ choices:[{ message:{ content: semanticallyBadPlan(usr) } }] }) });
      }
      return route.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify({ id:'m', object:'chat.completion', choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content: goodPlan(usr) } }] }) });
    }
    let out;
    if (/ARCHITECTURE LAWS/.test(sys)) { author.push({ system: sys }); out = PROSE; }
    else out = JSON.stringify(GENERIC);
    const env = /mistral-proxy/.test(url)
      ? { id:'m', object:'chat.completion', choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content: out } }] }
      : { ok:true, content: out, choices:[{ message:{ content: out } }] };
    return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(env) });
  });
  page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
  page.on('console', m => { const x=m.text(); if (/SCENE1:|PLANNER|SKELETON|STAGE/.test(x)) logs.push(x.slice(0,240)); });

  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout:40000 });
  const res = await page.evaluate(async () => {
    const s = window.state;
    const def = (window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
    s.picks = s.picks||{};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
      .forEach(k=>{ s.picks[k]=def[k]; });
    Object.assign(s,{ world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
      _starterId:def.id, is_starter_story:true, immutableTitle:def.title, archetype:{primary:def.archetype,modifier:null},
      name:'Lirael', playerName:'Lirael', loveInterestName:'Julian', partnerName:'Julian',
      liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true,
      fortunes:9999999, intensity:'Steamy', pov:'first_person', identity:{playerName:'Lirael',partnerName:'Julian'},
      renderMode:'literary', currentEngine:'literary', storyId:'retry', myUid:'probe' });
    s.picks.identity = s.identity; s._skipCorridorValidation = true;
    let threw = null;
    try { await Promise.race([window.handleBeginStory(), new Promise(x=>setTimeout(x,120000))]); }
    catch(e){ threw = String(e && e.message); }
    return { threw, attempts: s._scene1PlannerAttempts, retryReason: s._scene1PlannerRetryReason,
             fatal: s._scene1SkeletonFatal || null };
  });
  await page.close();
  const gap = plannerCalls.length > 1 ? plannerCalls[1].at - plannerCalls[0].at : null;
  return { mode, plannerRequests: plannerCalls.length, gap, author, escaped, unknown, logs, ...res };
}

console.log(`\n${'═'.repeat(92)}\nPLANNER TRANSPORT-ONLY RETRY\n${'═'.repeat(92)}\n`);

// ── requests that NEVER answered → exactly one retry ──
for (const [mode, label] of [['ok','success (no failure)'], ['connection','connection failure'],
                             ['429','HTTP 429 + Retry-After: 1'], ['503','retryable 5xx']]) {
  const R = await run(mode);
  const expected = mode === 'ok' ? 1 : 2;
  console.log(` ${label.padEnd(28)} requests=${R.plannerRequests} attempts=${R.attempts} reason=${R.retryReason || '—'} authored=${R.author.length}${R.gap != null ? ` gap=${R.gap}ms` : ''}`);
  t(`${label}: exactly ${expected} planner request(s)`, R.plannerRequests === expected,
    `got ${R.plannerRequests}`);
  t(`${label}: story is authored`, R.author.length === 1 && !R.fatal, `fatal=${R.fatal} author=${R.author.length}`);
  t(`${label}: attempt count exposed in telemetry`, R.attempts === expected, `attempts=${R.attempts}`);
  if (mode === 'ok') {
    t(`${label}: happy path records NO retry reason`, !R.retryReason, String(R.retryReason));
  } else {
    t(`${label}: retry reason exposed`, !!R.retryReason, String(R.retryReason));
    t(`${label}: [SCENE1:PLANNER:RETRY] logged once`,
      R.logs.filter(l => /SCENE1:PLANNER:RETRY/.test(l)).length === 1);
  }
  if (mode === '429') {
    t(`${label}: Retry-After honoured (waited ~1s, not the 2s default)`,
      R.gap != null && R.gap >= 900 && R.gap < 1900, `gap=${R.gap}ms`);
    t(`${label}: log names Retry-After`, R.logs.some(l => /Retry-After honoured/.test(l)));
  }
  t(`${label}: zero escaped / unknown`, R.escaped.length === 0 && R.unknown.length === 0);
  console.log('');
}

// ── a response that ARRIVED is never retried ──
console.log(` NO RETRY AFTER ANY SUCCESSFUL HTTP RESPONSE`);
for (const [mode, label, expectLog] of [
  ['400',       'non-retryable 4xx',        /TRANSPORT/],
  ['malformed', 'HTTP 200, malformed JSON', /PLANNER:UNRECOVERABLE/],
  ['semantic',  'HTTP 200, semantic reject', /SKELETON:INVALID/],
]) {
  const R = await run(mode);
  console.log(`   ${label.padEnd(28)} requests=${R.plannerRequests} authored=${R.author.length} fatal=${String(R.fatal).slice(0,60)}`);
  t(`   ${label}: exactly ONE planner request — no retry`, R.plannerRequests === 1, `got ${R.plannerRequests}`);
  t(`   ${label}: no retry reason recorded`, !R.retryReason, String(R.retryReason));
  t(`   ${label}: aborts with zero author calls`, R.author.length === 0 && !!R.fatal,
    `author=${R.author.length} fatal=${R.fatal}`);
  t(`   ${label}: correct fault surfaced`, R.logs.some(l => expectLog.test(l)),
    R.logs.filter(l => /SCENE1/.test(l)).slice(0,2).join(' | '));
  t(`   ${label}: [SCENE1:ABORT] logged`, R.logs.some(l => /SCENE1:ABORT/.test(l)));
}

await browser.close();
console.log(`\n${'─'.repeat(92)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
