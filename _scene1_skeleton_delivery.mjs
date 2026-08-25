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
    // opening_setting must AGREE with the seed's immutable WHERE — the fixture previously said
    // "the hall", which the new relocation check correctly rejects.
    pc_career:'shrine witness', opening_setting:'a Veilwood ceremony clearing', li_texture_beat:'He crosses toward her',
    interlocutor_placement:'The Dohkar stands between', pc_wound_anchor:L,
    pc_self_presentation_beat:'decision', scene_want:SCENE_WANT, scene_mission:L,
    reader_state:{ knows:L, believes:L, wondering:L, must_not_confuse:L },
    pc_body_callback:'decision', li_body_callback:'opening', antagonist_body_callback:null,
    perceptual_signature_beat:L,
    staged_characters: cast.map(n => ({ name:n, presence_mode:'IN_PERSON', role_to_protagonist:'witness' })) };
  // Angles are DISTINCT per recipient so "the directive renders each returned angle" is a real
  // claim rather than one string matching by accident.
  // Angles must now be RENDERABLE BEATS, not diagnoses, and E+/fusion targets must be things the
  // resolved scene actually contains. "spiralgrass" is in the First Sacrifice seed's WHERE.
  let cp = cast.map(n => ({ character:n, first_mention:true, angle:`${n} checks the youth's hands before the words` }));
  let ep = { target:'the spiralgrass', axis:'ritual' };
  let fu = { character: cast[0], target:'the spiralgrass', beat:'she sets her palm flat on the spiralgrass to keep it still' };
  if (mutate === 'unknown')   cp = cp.concat([{ character:'Nobody Here', first_mention:true, angle:'sets the cloth straight twice' }]);
  if (mutate === 'missing')   cp = cp.slice(0, Math.max(0, cp.length - 1));
  if (mutate === 'duplicate') cp = cp.concat([cp[0]]);
  if (mutate === 'badaxis')   ep = { target:'the spiralgrass', axis:'vibes' };
  if (mutate === 'badfusion') fu = { character:'Nobody Here', target:'the spiralgrass', beat:'he sets his palm flat on the spiralgrass' };
  // ── scalar-invariant mutations ──
  if (mutate === 'withfusion')     fu = { character: cast[0], target:'the spiralgrass', beat:'she sets her palm flat on the spiralgrass to keep it still' };
  if (mutate === 'fmfalse')        cp = cp.map((c,i) => i === 0 ? { ...c, first_mention:false } : c);
  if (mutate === 'fmmissing')      cp = cp.map((c,i) => { if (i !== 0) return c; const { first_mention, ...r } = c; return r; });
  if (mutate === 'fmstring')       cp = cp.map((c,i) => i === 0 ? { ...c, first_mention:'false' } : c);
  if (mutate === 'emptyangle')     cp = cp.map((c,i) => i === 0 ? { ...c, angle:'   ' } : c);
  if (mutate === 'placeholderang') cp = cp.map((c,i) => i === 0 ? { ...c, angle:'N/A' } : c);
  if (mutate === 'thinangle')      cp = cp.map((c,i) => i === 0 ? { ...c, angle:'is sad' } : c);
  if (mutate === 'noep')           ep = undefined;
  if (mutate === 'emptyeptarget')  ep = { target:'   ', axis:'ritual' };
  if (mutate === 'fusionmismatch') fu = { character: cast[0], target:'the window casement', beat:'she sets her palm on the casement' };
  if (mutate === 'fusionempty')    fu = { character: cast[0], target:'   ', beat:'she sets her palm flat to keep it still' };
  // ── revised planning-contract mutations (2026-08-25) ──
  if (mutate === 'diagnosisangle') cp = cp.map((c,i) => i === 0 ? { ...c, angle:'a woman clinging to the illusion of worthiness' } : c);
  if (mutate === 'diagnosisangle2') cp = cp.map((c,i) => i === 0 ? { ...c, angle:'an authority whose judgment will decide her fate' } : c);
  if (mutate === 'offsceneEp')     ep = { target:'the gallery hallway', axis:'damage' };
  if (mutate === 'relocate')       spine.opening_setting = 'a gallery hallway';
  if (mutate === 'fusionnull')     fu = null;                                   // bare null, no reason
  if (mutate === 'fusionbadcode')  fu = { character:null, target:null, impossible_because:'DIDNT_FEEL_RIGHT' };
  if (mutate === 'fusionfalsecode') fu = { character:null, target:null, impossible_because:'NO_ONSTAGE_CHARACTER' };
  if (mutate === 'fusionnobeat')   fu = { character: cast[0], target:'the spiralgrass' };
  if (mutate === 'fusionthinbeat') fu = { character: cast[0], target:'the spiralgrass', beat:'they connect' };
  const skel = { character_plus:cp, fusion:fu };
  if (ep !== undefined) skel.environment_plus = ep;   // `noep` omits the KEY, not just the value
  // A planner reply that will not parse is the same failure class as an invalid one: the
  // author must not be called. This is the shape the LIVE run actually produced.
  if (mutate === 'unparseable') return 'I was unable to produce a plan for this scene.';
  return JSON.stringify({ opening_spine: spine, scene_skeleton: skel });
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
    // SHAPE-FAITHFUL ENVELOPES (2026-08-25 — added after the paid run). /api/mistral-proxy
    // returns the RAW Mistral envelope and never sets a top-level `content`; only
    // /api/chatgpt-proxy normalises to {content}. The old mock returned BOTH shapes at once,
    // which is precisely why this suite passed while production discarded every opening plan
    // as "no JSON object". A mock must never hand the client a shape the proxy cannot produce.
    const envelope = /mistral-proxy/.test(url)
      ? { id:'mock', object:'chat.completion', model:b.model, usage:{}, _orchestration:{},
          choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content: out } }] }
      : { ok:true, content: out, choices:[{ message:{ content: out } }] };
    return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(envelope) });
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
      // Eligibility now comes from the STAGE CONTRACT when the seed is authoritative; the old
      // heuristic is kept alongside so the harness can prove they differ where it matters.
      stage: (window._scene1StageContract ? window._scene1StageContract(s) : null),
      heuristicCast: (window._sceneEligibleCast ? window._sceneEligibleCast(s, 1) : null),
      eligible: (window._scene1StageContract
        ? (window._scene1StageContract(s).onStage || []).map(c => c.name)
        : (window._sceneEligibleCast ? window._sceneEligibleCast(s, 1) : null)),
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
  t(`${label} 2b: planner reply read from the RAW mistral envelope (no top-level content)`,
    !!(R.skeleton && R.skeleton.cp && R.skeleton.cp.length),
    'skeleton is empty — the client is reading a response shape mistral-proxy never returns');
  t(`${label} 3: every eligible recipient has a C+ assignment, none truncated`,
    R.eligible && R.skeleton && R.skeleton.cp && R.skeleton.cp.length === R.eligible.length,
    `eligible=${R.eligible && R.eligible.length} cp=${R.skeleton && R.skeleton.cp && R.skeleton.cp.length}`);
  t(`${label} 4: E+ and fusion survive normalization`,
    R.skeleton && R.skeleton.ep && R.skeleton.ep.target === 'the spiralgrass'
    && R.skeleton.ep.axis === 'ritual' && R.skeleton.fu && R.skeleton.fu.beat,
    JSON.stringify(R.skeleton && { ep: R.skeleton.ep, fu: R.skeleton.fu }));
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

// ── 11 · SCALAR ASSIGNMENT INVARIANTS + verbatim rendering into the Grok request ──
// Recipient identity was already proven. This proves the FIELDS of each assignment are
// substantive, and that buildSkeletonDirective actually carries them into the dispatched
// system prompt — an assignment that validates but never renders is not delivered.
const EP_AXES = ['history','use','damage','ownership','repair','ritual','absence'];
console.log(` 11 · SCALAR INVARIANTS + VERBATIM RENDER (fusion present)`);
for (const [label, hot] of [['HEAVY', false], ['HOTFAST', true]]) {
  const R = await run({ hot, mutate: 'withfusion' });
  const au = R.author[0];
  const sys = au ? au.system : '';
  const cp = (R.skeleton && R.skeleton.cp) || [];
  const ep = R.skeleton && R.skeleton.ep;
  const fu = R.skeleton && R.skeleton.fu;
  const tnorm = s => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/^(the|a|an)\s+/,'').replace(/\s+/g,' ').trim();

  t(`${label} 11a: delivered — every C+ entry has first_mention === true`,
    cp.length > 0 && cp.every(c => c.first_mention === true),
    JSON.stringify(cp.map(c => [c.character, c.first_mention])));
  t(`${label} 11b: delivered — every C+ angle is nonempty and substantive`,
    cp.length > 0 && cp.every(c => String(c.angle||'').trim().length >= 12
      && String(c.angle).trim().split(/\s+/).length >= 3),
    JSON.stringify(cp.map(c => c.angle)));
  t(`${label} 11c: delivered — E+ target nonempty, axis in the allowlist`,
    !!(ep && String(ep.target||'').trim() && EP_AXES.includes(String(ep.axis||''))),
    JSON.stringify(ep));
  t(`${label} 11d: delivered — fusion character eligible, target nonempty, target === E+ target`,
    !!(fu && R.eligible && R.eligible.map(tnorm).includes(tnorm(fu.character))
       && String(fu.target||'').trim() && tnorm(fu.target) === tnorm(ep && ep.target)),
    JSON.stringify({ fu, epTarget: ep && ep.target }));

  // ── the same values, verbatim, in the bytes handed to Grok ──
  t(`${label} 11e: EVERY returned angle renders verbatim in the outgoing system prompt`,
    cp.length > 0 && cp.every(c => sys.includes(c.angle)),
    JSON.stringify(cp.filter(c => !sys.includes(c.angle)).map(c => c.angle)));
  t(`${label} 11f: every C+ recipient renders on a first-mention-tagged line`,
    cp.length > 0 && cp.every(c => new RegExp(`•\\s*${c.character.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\(first mention`).test(sys)),
    'a recipient rendered without the first-mention tag');
  t(`${label} 11g: E+ target AND axis render verbatim on the ENVIRONMENT+ line`,
    (() => { const line = (sys.split('\n').find(l => l.includes('ENVIRONMENT+ ASSIGNED THIS SCENE')) || '');
             return !!ep && line.includes(ep.target) && line.includes(ep.axis); })(),
    JSON.stringify(sys.split('\n').find(l => l.includes('ENVIRONMENT+ ASSIGNED THIS SCENE')) || null));
  t(`${label} 11h: fusion PAIR renders verbatim on one FUSION line`,
    (() => { const line = (sys.split('\n').find(l => l.includes('FUSION —')) || '');
             return !!fu && line.includes(fu.character) && line.includes(fu.target); })(),
    JSON.stringify(sys.split('\n').find(l => l.includes('FUSION —')) || null));
  t(`${label} 11i: still exactly ONE skeleton block with fusion present`,
    au && count(au.system, 'Narrative skeleton for this scene:') === 1
      && count(au.system, 'FUSION —') === 1,
    `skel=${au && count(au.system,'Narrative skeleton for this scene:')} fusion=${au && count(au.system,'FUSION —')}`);
  t(`${label} 11j: observer snapshot === dispatched prompt, zero escaped`,
    R.auditSystem !== null && au && R.auditSystem === au.system && R.escaped.length === 0 && R.unknown.length === 0);
  console.log('');
}

// ── 12 · REVISED PLANNING CONTRACT (2026-08-25) — the fixes the paid run demanded ──
console.log(` 12 · PLANNING CONTRACT: stage authority, on-stage eligibility, first-person landing`);
{
  const R = await run({ hot: false, mutate: null });
  const st = R.stage || {};
  const pl = R.planner[0] || {};
  const pu = String(pl.user || '');
  const au = R.author[0];
  const sys = au ? au.system : '';

  t(`12a: the stage contract resolves from the SEED, not the heuristic`,
    st.authoritative === true && st.source === 'seed.sceneOne' && !!st.setting && !!st.presentText,
    JSON.stringify({ authoritative: st.authoritative, source: st.source }));
  t(`12b: eligibility is the ON-STAGE roster (PC + named present + role figures)`,
    Array.isArray(st.onStage) && st.onStage.length >= 3
      && st.onStage.some(c => c.kind === 'pc') && st.onStage.some(c => c.kind === 'role'),
    JSON.stringify((st.onStage || []).map(c => `${c.name}:${c.kind}`)));
  t(`12c: a character absent from the PRESENT text is NOT eligible`,
    !(st.onStage || []).some(c => !new RegExp(c.name.replace(/^the presiding /, ''), 'i')
      .test(st.presentText + ' ' + (st.pcName || ''))),
    JSON.stringify({ present: (st.presentText || '').slice(0, 90), onStage: (st.onStage || []).map(c => c.name) }));

  // The planner must RECEIVE the authority it was missing — this is the whole root cause.
  t(`12d: the planner request carries the immutable WHERE`,
    /THE SCENE AS IT ALREADY EXISTS/.test(pu) && /WHERE:/.test(pu) && /Veilwood/i.test(pu),
    `WHERE=${/WHERE:/.test(pu)} Veilwood=${/Veilwood/i.test(pu)}`);
  t(`12e: the planner request carries WHO IS PHYSICALLY PRESENT`,
    /WHO IS PHYSICALLY PRESENT/.test(pu) && /Julian/i.test(pu) && /Seren/i.test(pu));
  t(`12f: the planner request forbids relocation and materialising the absent`,
    /Do NOT relocate the scene/.test(pu) && /Do NOT materialise anyone/.test(pu)
      && /does NOT make a character physically present/.test(pu));
  t(`12g: the planner request demands RENDERABLE angles and bans diagnoses`,
    /ANGLES MUST BE RENDERABLE, NOT DIAGNOSES/.test(pu)
      && /clinging to the illusion of worthiness/.test(pu)
      && /could a camera record it/i.test(pu));
  t(`12h: the planner request requires fusion + a coded impossibility`,
    /fusion is REQUIRED whenever an on-stage character/.test(pu)
      && /impossible_because/.test(pu) && /NO_ONSTAGE_CHARACTER/.test(pu));
  t(`12i: FIRST-PERSON landing point is defined for the PC`,
    /FIRST-PERSON NARRATOR/.test(pu) && /FIRST EMBODIED SELF-REFERENCE OR ACTION/.test(pu),
    'planner was not told where the narrator beat lands');

  // …and the author must receive the same contract, in the assignment region.
  t(`12j: the author directive carries the negative constraints`,
    /Do NOT relocate the scene to reach a target/.test(sys)
      && /Do NOT materialise anyone not physically present/.test(sys)
      && /the SCENE wins/.test(sys));
  t(`12k: the author directive states the first-person landing point`,
    /narrates as "I" and is not named in the prose/.test(sys)
      && /first embodied action or self-reference/.test(sys));
  t(`12l: the fusion BEAT reaches the author, not just the pair`,
    /FUSION — one sentence in which/.test(sys) && /sets her palm flat on the spiralgrass/.test(sys),
    JSON.stringify(sys.split('\n').find(l => l.includes('FUSION —')) || null));
  t(`12m: zero escaped / unknown requests`, R.escaped.length === 0 && R.unknown.length === 0);
  console.log('');
}

// ── 9 · planner faults must surface, never continue silently to Grok ──
console.log(` 9 · PLANNER FAULTS SURFACE (no silent skeleton-less continuation)`);
for (const mutate of ['unknown', 'missing', 'duplicate', 'badaxis', 'badfusion',
                      'fmfalse', 'fmmissing', 'fmstring', 'emptyangle', 'placeholderang', 'thinangle',
                      'noep', 'emptyeptarget', 'fusionmismatch', 'fusionempty', 'unparseable',
                      // revised planning contract
                      'diagnosisangle', 'diagnosisangle2', 'offsceneEp', 'relocate',
                      'fusionnull', 'fusionbadcode', 'fusionfalsecode', 'fusionnobeat', 'fusionthinbeat']) {
  const R = await run({ hot: false, mutate });
  // Both failure classes must exit visibly: semantic (SKELETON:INVALID) and unparseable
  // planner output (PLANNER:UNRECOVERABLE). Either way the ABORT must follow.
  const flagged = R.logs.some(l => /SCENE1:SKELETON:INVALID|SCENE1:PLANNER:UNRECOVERABLE/.test(l))
               && R.logs.some(l => /SCENE1:ABORT/.test(l));
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
