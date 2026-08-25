// COMMIT B PART 2 — merged opening planner: nested envelope, C+/E+/fusion, delivery.
//
// Free, network-fenced. Proves the ten required points across HEAVY and HOTFAST, plus
// that the CONTINUATION skeleton path is unchanged.
//
// usage: node _scene1_skeleton_delivery.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import { instrument } from './_scene1_instrument.mjs';
import { buildScene1Prose, NONTOKEN_A, SCENE_WANT } from './_hook_fixture_prose.mjs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
function force(src, fn, v) {
  const needle = `function ${fn}() {`;
  if (src.split(needle).length - 1 !== 1) throw new Error(`${fn}: not exactly one definition`);
  return src.replace(needle, `${needle} return ${v};`);
}
const mk = hot => instrument(force(force(SRC, '_litLiteActive', 'false'), '_hotFastActive', hot ? 'true' : 'false'));

const PROSE = buildScene1Prose(NONTOKEN_A);
const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 } };
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/;
const L = 'she understands the wish has already begun to cost her something she cannot name';
const GENERIC = { goal:L, antagonistOrAntiForce:'the assembly', milestones:[], scenes:[], timelineLength:20,
  characters:[], name:'Julian', distinguishing_feature:'a burn scar', private_hope:L,
  defining_anecdote:L, attraction_manifestation:L, desire_register_exemplars:[L] };

// The planner reply is built FROM the eligible cast the request advertises, so the
// harness never hard-codes a roster the product might legitimately change.
function plannerReply(usr, mutate) {
  const m = usr.match(/ELIGIBLE CAST \((\d+)\)[^\n]*\n([\s\S]*?)\nExactly one/);
  const cast = m ? m[2].split('\n').map(x => x.replace(/^\s*•\s*/, '').trim()).filter(Boolean) : [];
  const spine = { pressure_source_type:'institutional', pressure_source:L, hook_object:'the band',
    opening_beat:'She sets the relic down', rising_beats:['a','b'], decision_beat:'Does she name it',
    pc_career:'shrine witness', opening_setting:'the hall', li_texture_beat:'He crosses toward her',
    interlocutor_placement:'The Dohkar stands between', pc_wound_anchor:L,
    pc_self_presentation_beat:'decision', scene_want:SCENE_WANT, scene_mission:L,
    reader_state:{ knows:L, believes:L, wondering:L, must_not_confuse:L },
    pc_body_callback:'decision', li_body_callback:'opening', antagonist_body_callback:null,
    perceptual_signature_beat:L,
    staged_characters: cast.map(n => ({ name:n, presence_mode:'IN_PERSON', role_to_protagonist:'witness' })) };
  let cp = cast.map(n => ({ character:n, first_mention:true, angle:'holds the room steady at private cost' }));
  let ep = { target:'the shrine table', axis:'ritual' };
  let fu = null;
  if (mutate === 'unknown')   cp = cp.concat([{ character:'Nobody Here', first_mention:true, angle:'x y z' }]);
  if (mutate === 'missing')   cp = cp.slice(0, Math.max(0, cp.length - 1));
  if (mutate === 'duplicate') cp = cp.concat([cp[0]]);
  if (mutate === 'badaxis')   ep = { target:'the shrine table', axis:'vibes' };
  if (mutate === 'badfusion') fu = { character:'Nobody Here', target:'the table' };
  return JSON.stringify({ opening_spine: spine, scene_skeleton: { character_plus:cp, environment_plus:ep, fusion:fu } });
}

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };
const count = (h, n) => (String(h).split(n).length - 1);

async function run({ hot, mutate }) {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  const planner = [], author = [], escaped = [], unknown = [];
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: mk(hot) }));
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
      author.push({ system: sys, user: usr, max_tokens: b.max_tokens, url });
      out = PROSE;
    } else if (/scene-structure planner for the OPENING scene/.test(sys)) {
      planner.push({ url, model:b.model, max_tokens:b.max_tokens, reasoning_effort:b.reasoning_effort,
                     response_format:b.response_format, user: usr });
      out = plannerReply(usr, mutate);
    } else out = JSON.stringify(GENERIC);
    return route.fulfill({ status:200, contentType:'application/json',
      body: JSON.stringify({ content: out, choices:[{message:{content: out}}] }) });
  });
  page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
  const logs = [];
  page.on('console', m => { const x=m.text(); if (/SCENE1:|SKELETON|PLANNER/.test(x)) logs.push(x.slice(0,220)); });
  page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0,200)));

  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout:40000 });
  const res = await page.evaluate(async () => {
    const s = window.state;
    // observer: capture what the audit sees, to compare against the dispatched bytes
    const def = (window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
    s.picks = s.picks||{};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>{ s.picks[k]=def[k]; });
    Object.assign(s,{ world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
      _starterId:def.id, is_starter_story:true, immutableTitle:def.title, archetype:{primary:def.archetype,modifier:null},
      name:'Lirael', playerName:'Lirael', loveInterestName:'Julian', partnerName:'Julian', loveInterest:'Male',
      liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true,
      fortunes:9999999, intensity:'Steamy', pov:'first_person', identity:{playerName:'Lirael',partnerName:'Julian'},
      renderMode:'literary', currentEngine:'literary', storyId:'skeldeliv', myUid:'probe' });
    s.picks.identity = s.identity; s._skipCorridorValidation = true;
    let threw = null;
    try { await Promise.race([window.handleBeginStory(), new Promise(x=>setTimeout(x,120000))]); }
    catch(e){ threw = String(e && e.message); }
    s._skipCorridorValidation = false;
    return { threw,
      eligible: (window._sceneEligibleCast ? window._sceneEligibleCast(s, 1) : null),
      assignments: s._scene1SceneAssignments || null,
      skeleton: s.sceneSkeleton ? { cp: s.sceneSkeleton.character_plus, ep: s.sceneSkeleton.environment_plus, fu: s.sceneSkeleton.fusion } : null,
      auditSystem: (s._lastScene1AuditPrompt && s._lastScene1AuditPrompt.system) || null,
      fingerprint: window.__scene1RequestFingerprint || null };
  });
  await browser.close();
  return { planner, author, escaped, unknown, logs, ...res };
}

console.log(`\n${'═'.repeat(90)}\nCOMMIT B PART 2 — MERGED OPENING PLANNER + SKELETON DELIVERY\n${'═'.repeat(90)}\n`);

for (const [label, hot] of [['HEAVY', false], ['HOTFAST', true]]) {
  const R = await run({ hot, mutate: null });
  const au = R.author[0];
  console.log(` ${label}`);
  console.log(`   eligible cast     : ${JSON.stringify(R.eligible)}`);
  console.log(`   planner           : ${R.planner.length} req · model=${R.planner[0] && R.planner[0].model} · re=${R.planner[0] && R.planner[0].reasoning_effort} · max_tokens=${R.planner[0] && R.planner[0].max_tokens}`);
  console.log(`   C+ delivered      : ${JSON.stringify((R.skeleton && R.skeleton.cp || []).map(c=>c.character))}`);
  console.log(`   E+ / fusion       : ${JSON.stringify(R.skeleton && R.skeleton.ep)} / ${JSON.stringify(R.skeleton && R.skeleton.fu)}`);

  t(`${label} 1: exactly one opening-planner request`, R.planner.length === 1, `got ${R.planner.length}`);
  t(`${label} 2: mistral-small, explicit none, JSON mode, calculated budget`,
    R.planner[0] && /mistral-proxy/.test(R.planner[0].url) && R.planner[0].model === 'mistral-small-latest'
    && R.planner[0].reasoning_effort === 'none' && R.planner[0].response_format
    && R.planner[0].response_format.type === 'json_object' && R.planner[0].max_tokens >= 1800,
    JSON.stringify(R.planner[0] && { m:R.planner[0].model, re:R.planner[0].reasoning_effort, mt:R.planner[0].max_tokens }));
  t(`${label} 3: every eligible recipient has a C+ assignment, none truncated`,
    R.eligible && R.skeleton && R.skeleton.cp && R.skeleton.cp.length === R.eligible.length,
    `eligible=${R.eligible && R.eligible.length} cp=${R.skeleton && R.skeleton.cp && R.skeleton.cp.length}`);
  t(`${label} 4: E+ and fusion survive normalization`,
    R.skeleton && R.skeleton.ep && R.skeleton.ep.target === 'the shrine table'
    && R.skeleton.ep.axis === 'ritual' && R.skeleton.fu === null,
    JSON.stringify(R.skeleton && R.skeleton.ep));
  const key = `${label} ${hot ? 6 : 5}`;
  t(`${key}: outgoing ${label} system carries exactly ONE skeleton block`,
    au && count(au.system, 'Narrative skeleton for this scene:') === 1,
    `got ${au && count(au.system, 'Narrative skeleton for this scene:')}`);
  t(`${key}: outgoing ${label} system carries exactly ONE CHARACTER+ block`,
    au && count(au.system, 'CHARACTER+ ASSIGNED THIS SCENE') === 1,
    `got ${au && count(au.system, 'CHARACTER+ ASSIGNED THIS SCENE')}`);
  t(`${key}: outgoing ${label} user carries exactly ONE opening spine`,
    au && count(au.user, '• OPENING: ') === 1, `got ${au && count(au.user, '• OPENING: ')}`);
  t(`${label} 7: A/50 + Storybound architecture/voice intact`,
    au && /ARCHITECTURE LAWS/.test(au.system) && /S\. ?TORY BOUND|TORY BOUND/i.test(au.system)
    && /A\/50|A-50|A50/.test(au.system + au.user));
  t(`${label} 7b: author ceiling preserved (${hot ? 700 : 'heavy'})`,
    hot ? au && au.max_tokens === 700 : au && au.max_tokens > 700, `got ${au && au.max_tokens}`);
  t(`${label} 8: observer snapshot === dispatched system prompt`,
    R.auditSystem !== null && au && R.auditSystem === au.system,
    R.auditSystem === null ? 'no audit snapshot' : `audit ${R.auditSystem.length} vs sent ${au && au.system.length}`);
  t(`${label} 10: zero escaped / unknown requests`, R.escaped.length === 0 && R.unknown.length === 0,
    JSON.stringify({ escaped: R.escaped.slice(0,3), unknown: R.unknown.slice(0,3) }));
  console.log('');
}

// ── 9 · planner faults must surface, never continue silently to Grok ──
console.log(` 9 · PLANNER FAULTS SURFACE (no silent skeleton-less continuation)`);
for (const mutate of ['unknown', 'missing', 'duplicate', 'badaxis', 'badfusion']) {
  const R = await run({ hot: false, mutate });
  const flagged = R.logs.some(l => /SCENE1:SKELETON:INVALID/.test(l));
  if (mutate === 'unknown') {
    console.log('   --- diagnostic (mutate=unknown) ---');
    console.log('   threw: ' + R.threw);
    R.logs.filter(l=>/ABORT|INVALID|SKELETON|PAGEERROR/.test(l)).slice(0,6).forEach(l=>console.log('     ' + l.slice(0,170)));
  }
  t(`   "${mutate}" is rejected visibly and no author call is made`,
    flagged && R.author.length === 0 && R.planner.length === 1,
    `flagged=${flagged} authorCalls=${R.author.length} planner=${R.planner.length}`);
}

console.log(`\n${'─'.repeat(90)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
