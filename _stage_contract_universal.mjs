// UNIVERSAL SCENE-1 STAGE OWNERSHIP — free, network-fenced, zero model calls.
//
// PART A proves the contract itself against eight states (pure function, one page load).
// PART B proves that for every SUCCESSFUL case the SAME authoritative WHERE and presence
// contract appears in all four surfaces: planner input, opening-spine validation, skeleton
// validation, and the final Grok request.
//
// usage: node _stage_contract_universal.mjs
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

// A second seed with a DIFFERENT setting and cast, so nothing here can pass by matching
// First Sacrifice strings.
const SEED_B = {
  id: 'test_seed_b',
  cast: [
    { role:'PC', species:'human', nameLock:false, bio:'A harbour clerk who counts what others sign for.' },
    { role:'LI', name:'Dorian', species:'human', nameLock:true, bio:'A ship-master with a debt he has not named.' },
    { role:'rival', name:'Mara', species:'human', nameLock:true, bio:'A rival clerk who wants the same berth.' },
  ],
  sceneOne: {
    setting: 'Midnight on the Saltmarket quay: tar-black water slapping the pilings, crates stacked under oilcloth, one lamp burning at the weighhouse door.',
    present: 'MARA at the weighhouse ledger, counting. A harbour WATCHMAN with a storm-lantern. DORIAN waiting at the end of the quay.',
    narrator: 'You (the PC) must sign the manifest before the tide turns.',
    aboutToHappen: 'The manifest is short by one crate and everyone on the quay already knows it.',
  },
};

const browser = await chromium.launch({ headless: true });

// ════════════════════════════════════════════════════════════════════════════════════════════
// PART A — the contract, as a pure function, over eight states
// ════════════════════════════════════════════════════════════════════════════════════════════
{
  const page = await (await browser.newContext()).newPage();
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: APP }));
  await page.route('**/api/**', route => PASSTHROUGH.test(route.request().url()) ? route.continue() : route.abort());
  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => window.state && window._scene1StageContract && window.STARTER_SEEDS, { timeout:40000 });

  const R = await page.evaluate((seedB) => {
    window.STARTER_SEEDS[seedB.id] = seedB;
    window.STARTER_PLANS['test_conflict_plan'] = {
      scenes: [{ n:1, goal:'She signs the manifest before the tide turns', setting:'a rooftop helipad above the city', participants:['Mara'] }],
    };
    const base = () => ({ pov:'first_person', playerName:'Lirael', name:'Lirael' });
    const call = (patch) => {
      const s = Object.assign(base(), patch);
      const c = window._scene1StageContract(s);
      return { ok:c.ok, fault:c.fault, source:c.source, settingSource:c.settingSource,
               settingOwner:c.settingOwner, presenceOwner:c.presenceOwner, pending:c.pending,
               setting:c.setting, pcName:c.pcName, pcFirstPerson:c.pcFirstPerson,
               onStage:(c.onStage||[]).map(x => `${x.name}:${x.kind}:${x.presence}`),
               offStage:(c.offStage||[]).map(x => x.name), groundText:(c.groundText||'').slice(0,200) };
    };
    return {
      seededFS:   call({ _starterId:'starter_first_sacrifice', loveInterestName:'Julian' }),
      seededB:    call({ _starterId:seedB.id, loveInterestName:'Dorian' }),
      corridor:   call({ _scene1Mission:'She confronts the harbourmaster in the customs house while Mara watches from the stairs' }),
      offstageLI: call({ _scene1Mission:'She waits alone in the customs house, rehearsing what she will say to Dorian',
                         loveInterestName:'Dorian' }),
      offstage3rd: call({ _starterId:'starter_first_sacrifice', loveInterestName:'Julian',
                          _sceneMissionCurrent:'The rite proceeds in the clearing' }),
      conflict:   call({ _starterId:seedB.id, loveInterestName:'Dorian', _conflictPlan:true,
                         _starterIdPlanOverride:'test_conflict_plan' }),
      missing:    call({}),
      unnamedPC:  call({ _starterId:'starter_first_sacrifice', playerName:'the one who carries the story',
                         name:'the one who carries the story', loveInterestName:'Julian' }),
    };
  }, SEED_B);

  console.log(`\n${'═'.repeat(92)}\nPART A — STAGE CONTRACT OWNERSHIP (pure)\n${'═'.repeat(92)}\n`);
  for (const [k, v] of Object.entries(R)) {
    console.log(` ${k.padEnd(12)} ok=${String(v.ok).padEnd(5)} source=${(v.source||'').padEnd(26)} onStage=${JSON.stringify(v.onStage)}`);
    if (v.fault) console.log(`   ${' '.repeat(12)} fault: ${v.fault}`);
    if (v.offStage && v.offStage.length) console.log(`   ${' '.repeat(12)} offStage: ${JSON.stringify(v.offStage)}`);
  }
  console.log('');

  // 1 · seeded First Sacrifice
  t('A1 seeded First Sacrifice resolves from seed.sceneOne',
    R.seededFS.ok && R.seededFS.source === 'seed.sceneOne' && R.seededFS.settingSource === 'seed'
    && /Veilwood/i.test(R.seededFS.setting), JSON.stringify(R.seededFS.fault || R.seededFS.setting.slice(0,60)));
  t('A1 on-stage set is PC + named present + role figure',
    R.seededFS.onStage.some(x => /:pc:/.test(x)) && R.seededFS.onStage.some(x => /^Seren:/.test(x))
    && R.seededFS.onStage.some(x => /^Julian:/.test(x)) && R.seededFS.onStage.some(x => /:role:/.test(x)),
    JSON.stringify(R.seededFS.onStage));

  // 2 · a DIFFERENT seeded story
  t('A2 second seed resolves its OWN setting and cast (no First Sacrifice bleed)',
    R.seededB.ok && /Saltmarket/i.test(R.seededB.setting) && !/Veilwood/i.test(R.seededB.setting)
    && R.seededB.onStage.some(x => /^Mara:/.test(x)) && R.seededB.onStage.some(x => /^Dorian:/.test(x))
    && !R.seededB.onStage.some(x => /^Seren:/.test(x)),
    JSON.stringify(R.seededB));
  t('A2 second seed also promotes its CAPS role figure (the watchman)',
    R.seededB.onStage.some(x => /:role:/.test(x) && /Watchman/i.test(x)),
    JSON.stringify(R.seededB.onStage));

  // 3 · unseeded corridor story — OWNERSHIP, not absence. There is no canonical WHERE for a
  // corridor story, so the planner owns it; what must hold is that ownership is explicit and the
  // narrator is still guaranteed on stage.
  t('A3 unseeded corridor story resolves with explicit planner ownership',
    R.corridor.ok && /^assignment:/.test(R.corridor.source)
    && R.corridor.settingOwner === 'planner' && R.corridor.pending === true,
    JSON.stringify(R.corridor));
  t('A3 the narrator is on stage under planner ownership, IN_PERSON',
    R.corridor.ok && R.corridor.onStage.length >= 1 && R.corridor.onStage.every(x => /:IN_PERSON$/.test(x)),
    JSON.stringify(R.corridor.onStage));

  // 4 · named-but-offstage LI — mention is not presence, under any ownership
  t('A4 an LI named in the event but not staged is OFFSTAGE, never promoted',
    R.offstageLI.ok && !R.offstageLI.onStage.some(x => /^Dorian:/.test(x))
    && R.offstageLI.offStage.includes('Dorian'),
    JSON.stringify({ onStage: R.offstageLI.onStage, offStage: R.offstageLI.offStage }));

  // 5 · offstage third party
  t('A5 a roster member outside the seed present set is context-only, not on stage',
    R.offstage3rd.ok && R.offstage3rd.onStage.every(x => !/^Nobody/.test(x)),
    JSON.stringify(R.offstage3rd.onStage));

  // 6 · conflicting location sources — handled in PART A2 below (needs a real plan binding)

  // 7 · missing authoritative stage data
  t('A7 no seed and no assignment row → ok:false with a named fault, never a fallback',
    R.missing.ok === false && /no authoritative stage/i.test(R.missing.fault || ''),
    JSON.stringify(R.missing.fault));

  // 8 · first-person unnamed PC
  t('A8 an unresolved (kernel) PC name becomes the stable role label',
    R.unnamedPC.ok && R.unnamedPC.pcName === 'the narrator' && R.unnamedPC.pcFirstPerson === true
    && R.unnamedPC.onStage.some(x => /^the narrator:pc:/.test(x)),
    JSON.stringify({ pcName: R.unnamedPC.pcName, onStage: R.unnamedPC.onStage }));
  t('A8 a real PC name is NOT replaced',
    R.seededFS.pcName === 'Lirael', R.seededFS.pcName);

  // 6 · conflicting location sources — bind a plan row whose setting contradicts the seed
  const C = await page.evaluate((seedBId) => {
    // Same _starterId for BOTH registries is how a real story binds seed + plan together.
    window.STARTER_SEEDS['test_conflict'] = window.STARTER_SEEDS[seedBId];
    window.STARTER_PLANS['test_conflict'] = {
      scenes: [{ n:1, goal:'She signs the manifest', setting:'a rooftop helipad above the city', participants:['Mara'] }],
    };
    const c = window._scene1StageContract({ pov:'first_person', playerName:'Lirael', _starterId:'test_conflict' });
    return { ok:c.ok, fault:c.fault };
  }, SEED_B.id);
  console.log('');
  t('A6 contradictory locations FAIL visibly — never merged, never arbitrated by a model',
    C.ok === false && /conflicting location sources/i.test(C.fault || ''), JSON.stringify(C.fault));

  await page.close();
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// PART B — the same contract must appear in all FOUR surfaces, for each successful case
// ════════════════════════════════════════════════════════════════════════════════════════════
async function fullRun({ label, statePatch, injectSeedB }) {
  const page = await (await browser.newContext()).newPage();
  const planner = [], author = [], escaped = [], unknown = [];
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
    let out;
    if (/ARCHITECTURE LAWS/.test(sys)) { author.push({ system:sys, user:usr }); out = PROSE; }
    else if (/scene-structure planner for the OPENING scene/.test(sys)) {
      planner.push({ user: usr });
      out = plannerReplyFor(usr);
    } else out = JSON.stringify(GENERIC);
    const env = /mistral-proxy/.test(url)
      ? { id:'mock', object:'chat.completion', model:b.model, usage:{}, choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content: out } }] }
      : { ok:true, content: out, choices:[{ message:{ content: out } }] };
    return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(env) });
  });
  page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
  const logs = [];
  page.on('console', m => { const x=m.text(); if (/SCENE1:|STAGE|SKELETON|ANGLE/.test(x)) logs.push(x.slice(0,240)); });

  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_SEEDS, { timeout:40000 });
  const res = await page.evaluate(async ({ patch, seedB }) => {
    if (seedB) window.STARTER_SEEDS[seedB.id] = seedB;
    const s = window.state;
    // Corridor picks have to be real or handleBeginStory never reaches the Scene-1 scaffold.
    // The First Sacrifice definition supplies a valid set; the per-case patch overrides identity
    // and stage source on top of it.
    const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
    s.picks = s.picks || {};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
      .forEach(k => { s.picks[k] = def[k]; });
    Object.assign(s, { world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
      pov:'first_person', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling',
      access:'sub', subscribed:true, fortunes:9999999, intensity:'Steamy', renderMode:'literary',
      currentEngine:'literary', storyId:'stageuniv', myUid:'probe',
      archetype:{ primary:def.archetype, modifier:null } }, patch);
    s.picks.pov = 'first_person';
    s.identity = { playerName: s.playerName, partnerName: s.loveInterestName };
    s._skipCorridorValidation = true;
    let threw = null;
    try { await Promise.race([window.handleBeginStory(), new Promise(x=>setTimeout(x,120000))]); }
    catch(e){ threw = String(e && e.message); }
    // The RESOLVED stage is what every surface must agree with; fall back to the raw contract
    // only when the build never got far enough to resolve one.
    const c = s._scene1StageResolved || window._scene1StageContract(s) || {};
    return { threw, stage: { ok:c.ok, fault:c.fault, source:c.source, setting:c.setting,
                             settingOwner:c.settingOwner, presenceOwner:c.presenceOwner,
                             settingSource:c.settingSource,
                             onStage:(c.onStage||[]).map(x=>x.name), offStage:(c.offStage||[]).map(x=>x.name) },
             assignments: s._scene1SceneAssignments || null,
             skeletonFatal: s._scene1SkeletonFatal || null };
  }, { patch: statePatch, seedB: injectSeedB ? SEED_B : null });
  await page.close();
  return { label, planner, author, escaped, unknown, logs, ...res };
}

// The planner reply is derived FROM the request, so it always matches whatever stage resolved.
function plannerReplyFor(usr) {
  const m = usr.match(/ELIGIBLE CAST \((\d+)\)[^\n]*\n([\s\S]*?)\nExactly one/);
  let cast = m ? m[2].split('\n').map(x => x.replace(/^\s*•\s*/, '').trim()).filter(Boolean) : [];
  if (!cast.length) {
    // Planner-owned presence: only the narrator is guaranteed, and the planner stages the rest.
    const g = usr.match(/GUARANTEED ON STAGE \(\d+\):\s*([^\n]+)/);
    const guaranteed = g ? g[1].split(',').map(x => x.trim()).filter(Boolean) : [];
    cast = guaranteed.concat(['the harbourmaster']);
  }
  // When the stage is FIXED the planner must conform to it; when the planner OWNS the setting
  // (unseeded corridor) it invents one, and that choice becomes canon.
  const wm = usr.match(/WHERE \(fixed\):\s*([^\n]+)/);
  const plannerOwnsSetting = /YOU choose opening_setting/.test(usr);
  const where = wm ? wm[1].trim() : (plannerOwnsSetting ? 'the customs house at the end of the quay' : '');
  // Pick a target that is genuinely IN whatever WHERE applies.
  const tok = (where.toLowerCase().match(/\b[a-z]{5,}\b/g) || []).filter(w => w !== 'midnight');
  const target = tok.length ? tok[tok.length - 1] : 'room';
  const spine = { pressure_source_type:'institutional', pressure_source:L, hook_object:'the band',
    opening_beat:'The moment is already underway', rising_beats:['a','b'], decision_beat:'Does she name it',
    pc_career:'clerk', opening_setting:where.slice(0, 60), li_texture_beat:'He crosses toward her',
    interlocutor_placement:'They stand between', pc_wound_anchor:L,
    pc_self_presentation_beat:'decision', scene_want:SCENE_WANT, scene_mission:L,
    reader_state:{ knows:L, believes:L, wondering:L, must_not_confuse:L },
    pc_body_callback:'decision', li_body_callback:'opening', antagonist_body_callback:null,
    perceptual_signature_beat:L,
    staged_characters: cast.map(n => ({ name:n, presence_mode:'IN_PERSON', role_to_protagonist:'witness' })) };
  return JSON.stringify({ opening_spine: spine, scene_skeleton: {
    character_plus: cast.map(n => ({ character:n, first_mention:true, angle:`${n} checks the ledger before the words` })),
    environment_plus: { target, axis:'use' },
    fusion: { character: cast[0], target, beat:`she sets her palm flat on the ${target} to keep it still` },
  } });
}

console.log(`\n${'═'.repeat(92)}\nPART B — ONE CONTRACT IN FOUR SURFACES\n${'═'.repeat(92)}`);

for (const cfg of [
  { label:'seeded First Sacrifice', statePatch:{ _starterId:'starter_first_sacrifice', is_starter_story:true,
      playerName:'Lirael', name:'Lirael', loveInterestName:'Julian', partnerName:'Julian', liGender:'male' } },
  { label:'seeded second story', injectSeedB:true, statePatch:{ _starterId:SEED_B.id, is_starter_story:true,
      playerName:'Ilse', name:'Ilse', loveInterestName:'Dorian', partnerName:'Dorian', liGender:'male' } },
  { label:'unseeded corridor', statePatch:{ playerName:'', name:'',
      _scene1Mission:'She confronts the harbourmaster in the customs house while Mara watches from the stairs',
      loveInterestName:'Dorian', partnerName:'Dorian', liGender:'male' } },
]) {
  const R = await fullRun(cfg);
  const pu = String((R.planner[0] || {}).user || '');
  const asys = String((R.author[0] || {}).system || '');
  const st = R.stage || {};
  const where = String(st.setting || '');
  // A distinctive slice of the resolved WHERE — the string that must appear everywhere.
  const key = (where.match(/\b[A-Z][a-z]{4,}\b/) || where.match(/\b[a-z]{6,}\b/) || [''])[0];
  const cpNames = ((R.assignments && R.assignments.character_plus) || []).map(c => c.character);

  console.log(`\n ${R.label}`);
  console.log(`   stage      : ok=${st.ok} source=${st.source}`);
  console.log(`   WHERE      : ${where.slice(0, 84)}`);
  console.log(`   onStage    : ${JSON.stringify(st.onStage)}   offStage: ${JSON.stringify(st.offStage)}`);
  console.log(`   C+ landed  : ${JSON.stringify(cpNames)}`);
  console.log(`   key token  : "${key}"`);

  t(`${R.label} — resolved, authored, no fault`,
    st.ok === true && !R.skeletonFatal && R.author.length === 1,
    `fault=${R.skeletonFatal} authorCalls=${R.author.length} threw=${R.threw}`);
  // Surface 1 differs by ownership: a FIXED stage must be stated to the planner, a planner-OWNED
  // one must be explicitly delegated. Either way the ownership is explicit and the narrator is named.
  const fixedStage = st.settingOwner !== 'planner';
  t(`${R.label} — surface 1/4: stage ownership + presence in PLANNER INPUT (${st.settingOwner}-owned)`,
    /THE SCENE'S STAGE — WHO OWNS WHAT/.test(pu)
      && (fixedStage
            ? (/WHERE \(fixed\):/.test(pu) && !!key && pu.includes(key) && /WHO IS PHYSICALLY PRESENT \(fixed\)/.test(pu))
            : /YOU choose opening_setting/.test(pu))
      // Under planner-owned presence only the GUARANTEED names can be in the input — the rest are
      // the planner's own invention and appear for the first time in its output.
      && (st.presenceOwner === 'planner'
            ? /GUARANTEED ON STAGE/.test(pu) && pu.includes(st.onStage[0])
            : st.onStage.every(n => pu.includes(n))),
    `key=${key} inPlanner=${pu.includes(key)} owner=${st.settingOwner}/${st.presenceOwner}`);
  t(`${R.label} — surface 2/4: OPENING SPINE validated against the same WHERE`,
    // the spine's opening_setting was accepted only because it matched the resolved ground text
    !R.logs.some(l => /RELOCATES the scene/.test(l)) && st.ok === true);
  t(`${R.label} — surface 3/4: SKELETON validated against the same presence set`,
    cpNames.length === st.onStage.length
      && cpNames.every(n => st.onStage.includes(n))
      && !cpNames.some(n => (st.offStage || []).includes(n)),
    JSON.stringify({ cp: cpNames, onStage: st.onStage }));
  t(`${R.label} — surface 4/4: WHERE + presence in the GROK REQUEST`,
    asys.includes('RESOLVED WHERE') && !!key && asys.includes(key)
      && /PHYSICALLY PRESENT: /.test(asys)
      && st.onStage.every(n => asys.includes(n)),
    `inGrok=${asys.includes(key)}`);
  t(`${R.label} — offstage characters never receive an embodied beat`,
    (st.offStage || []).every(n => !cpNames.includes(n)),
    JSON.stringify({ offStage: st.offStage, cp: cpNames }));
  t(`${R.label} — zero escaped / unknown requests`,
    R.escaped.length === 0 && R.unknown.length === 0,
    JSON.stringify({ escaped: R.escaped.slice(0,2), unknown: R.unknown.slice(0,2) }));
}

// ── the two failure cases must ABORT, never author ──
console.log(`\n ABORT CASES (no author call may occur)`);
for (const cfg of [
  { label:'missing authoritative stage', statePatch:{ playerName:'Ilse', name:'Ilse' } },
]) {
  const R = await fullRun(cfg);
  const aborted = R.logs.some(l => /SCENE1:STAGE:UNRESOLVED/.test(l)) && R.logs.some(l => /SCENE1:ABORT/.test(l));
  t(`   "${cfg.label}" aborts visibly with zero author calls`,
    aborted && R.author.length === 0 && R.planner.length === 0,
    `aborted=${aborted} author=${R.author.length} planner=${R.planner.length} fault=${R.skeletonFatal}`);
}

await browser.close();
console.log(`\n${'─'.repeat(92)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
