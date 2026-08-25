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
               onStage:(c.onStage||[]).map(x => `${x.label}:${x.kind}:${x.presence}`),
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

  // ── PART A2 · CANONICAL IDENTITY + GROUNDING (2026-08-25) ──
  // Every case here is output the LIVE planner produced and the validator wrongly refused.
  const ID = await page.evaluate(() => {
    const S = window._scene1StageContract, R = window._resolveEligiblePerson, G = window._targetInScene;
    const fs1 = (patch) => S(Object.assign({ pov:'first_person', _starterId:'starter_first_sacrifice',
                                             loveInterestName:'Julian' }, patch));
    // Measured live at the scaffold boundary: playerName holds the KERNEL while the real name
    // survives on state.name / identity.playerName.
    const placeholderPC = fs1({ playerName:'the one who carries the story', name:'Lirael',
                                identity:{ playerName:'Lirael' } });
    const protagPC      = fs1({ playerName:'The Protagonist', name:'Lirael', identity:{ playerName:'Lirael' } });
    const trulyUnnamed  = fs1({ playerName:'', name:'', identity:{} });
    const st = placeholderPC;
    const res = (n) => { const r = R(n, st); return r ? { id:r.id, label:r.label } : null; };

    // Ambiguity: two entities sharing an alias must abort rather than be guessed at.
    const amb = (() => {
      const c = fs1({ playerName:'Seren', name:'Seren', identity:{ playerName:'Seren' } });
      return { ok:c.ok, fault:c.fault };
    })();

    return {
      pcLabel: st.pcName, pcSource: st.pcNameSource,
      pcAliases: st.pcAliases,
      protagLabel: protagPC.pcName, unnamedLabel: trulyUnnamed.pcName,
      onStage: (st.onStage||[]).map(r => ({ id:r.id, label:r.label, aliases:r.aliases, source:r.source })),
      resolveLirael: res('Lirael'), resolveNarrator: res('the narrator'),
      resolveProtagonist: res('the protagonist'), resolveDohkar: res('Dohkar'),
      resolveTheDohkar: res('the Dohkar'), resolvePresiding: res('the presiding Dohkar'),
      resolveJulian: res('Julian'), resolveUnknown: res('Nobody Here'),
      resolveSubstring: res('Lir'),                       // must NOT resolve — no fuzzy matching
      ambiguous: amb,
      groundCloth: G('the gossamer band', st.groundText),  // canon, described only in narrator
      groundSpiral: G('spiralgrass', st.groundText),
      groundInvented: G('the gallery hallway', st.groundText),
      groundText: (st.groundText||'').length,
    };
  });

  console.log(`\n${'═'.repeat(92)}\nPART A2 — CANONICAL IDENTITY + GROUNDING\n${'═'.repeat(92)}\n`);
  console.log(` PC label "${ID.pcLabel}" (source ${ID.pcSource})   aliases=${JSON.stringify(ID.pcAliases)}`);
  ID.onStage.forEach(r => console.log(`   ${r.id.padEnd(24)} label="${r.label}"  aliases=${JSON.stringify(r.aliases)}`));
  console.log('');

  t('C1 placeholder PC resolves to the real established name',
    ID.pcLabel === 'Lirael' && /state\.name|identity/.test(ID.pcSource), JSON.stringify(ID));
  t('C1 "The Protagonist" placeholder also resolves to the real name',
    ID.protagLabel === 'Lirael', ID.protagLabel);
  t('C1 a genuinely unnamed PC still falls back to the stable role label',
    ID.unnamedLabel === 'the narrator', ID.unnamedLabel);
  t('C2 Lirael / the narrator / the protagonist all resolve to ONE PC entity',
    ID.resolveLirael && ID.resolveNarrator && ID.resolveProtagonist
    && ID.resolveLirael.id === ID.resolveNarrator.id
    && ID.resolveLirael.id === ID.resolveProtagonist.id
    && ID.resolveLirael.label === 'Lirael',
    JSON.stringify([ID.resolveLirael, ID.resolveNarrator, ID.resolveProtagonist]));
  t('C3 Dohkar / the Dohkar / the presiding Dohkar resolve to ONE role entity',
    ID.resolveDohkar && ID.resolveTheDohkar && ID.resolvePresiding
    && ID.resolveDohkar.id === ID.resolveTheDohkar.id
    && ID.resolveDohkar.id === ID.resolvePresiding.id
    && ID.resolveDohkar.label === 'the presiding Dohkar',
    JSON.stringify([ID.resolveDohkar, ID.resolveTheDohkar, ID.resolvePresiding]));
  t('C3 resolution is EXACT — a substring does not resolve',
    ID.resolveSubstring === null && ID.resolveUnknown === null,
    JSON.stringify({ substring: ID.resolveSubstring, unknown: ID.resolveUnknown }));
  t('C4 an alias claimed by two entities is a visible ambiguity fault',
    ID.ambiguous.ok === false && /ambiguous alias/i.test(ID.ambiguous.fault || ''),
    JSON.stringify(ID.ambiguous));
  t('C6 the ceremonial band is grounded through seed.sceneOne.narrator',
    ID.groundCloth === true, `groundTextLen=${ID.groundText}`);
  t('C6 an object from the WHERE is still grounded',
    ID.groundSpiral === true);
  t('C7 an INVENTED object is still rejected',
    ID.groundInvented === false);

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
                             onStage:(c.onStage||[]).map(x=>x.label), offStage:(c.offStage||[]).map(x=>x.name) },
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
    // Planner-owned presence: stage ONLY from the allowed roster — inventing a person is now a
    // fault, which is exactly what the live corridor sample did.
    const roster = [...usr.matchAll(/^ {2}• (.+?)\s{2}\(/gm)].map(m => m[1].trim());
    cast = roster.length ? roster : ['the narrator'];
  }
  // When the stage is FIXED the planner must conform to it; when the planner OWNS the setting
  // (unseeded corridor) it invents one, and that choice becomes canon.
  const wm = usr.match(/WHERE \(fixed\):\s*([^\n]+)/);
  const plannerOwnsSetting = /YOU choose opening_setting/.test(usr);
  const plannerOwnsPresence = /"staged_characters" is REQUIRED/.test(usr);
  const where = wm ? wm[1].trim() : (plannerOwnsSetting ? 'the customs house at the end of the quay' : '');
  // Planner-owned stages must DECLARE their inventory; E+ then points at a declared item.
  const elements = plannerOwnsSetting
    ? ['the weighhouse ledger', 'a bolt of undyed cloth', 'the shutters propped open'] : null;
  // Pick a target that is genuinely IN whatever WHERE applies.
  const tok = (where.toLowerCase().match(/\b[a-z]{5,}\b/g) || []).filter(w => w !== 'midnight');
  const target = plannerOwnsSetting ? elements[0] : (tok.length ? tok[tok.length - 1] : 'room');
  const spine = { pressure_source_type:'institutional', pressure_source:L, hook_object:'the band',
    opening_beat:'The moment is already underway', rising_beats:['a','b'], decision_beat:'Does she name it',
    pc_career:'clerk', opening_setting:where.slice(0, 60), li_texture_beat:'He crosses toward her',
    interlocutor_placement:'They stand between', pc_wound_anchor:L,
    pc_self_presentation_beat:'decision', scene_want:SCENE_WANT, scene_mission:L,
    reader_state:{ knows:L, believes:L, wondering:L, must_not_confuse:L },
    pc_body_callback:'decision', li_body_callback:'opening', antagonist_body_callback:null,
    perceptual_signature_beat:L,
    staged_characters: cast.map(n => ({ name:n, presence_mode:'IN_PERSON', presence:'IN_PERSON',
                                        anchor_beat:'is already at work as the scene opens',
                                        role_to_protagonist:'witness' })) };
  if (elements) spine.environment_elements = elements;
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

// ════════════════════════════════════════════════════════════════════════════════════════════
// PART D — CORRIDOR OWNERSHIP CONTRACT (structured cast + environment)
// Every case is exercised through the REAL resolution path, with a planner reply crafted per case.
// ════════════════════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(92)}\nPART D — CORRIDOR OWNERSHIP (roster-bound staging, declared inventory)\n${'═'.repeat(92)}\n`);
{
  const page = await (await browser.newContext()).newPage();
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: APP }));
  await page.route('**/api/**', route => PASSTHROUGH.test(route.request().url()) ? route.continue() : route.abort());
  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => window.state && window._resolveStageFromPlan, { timeout:40000 });

  const D = await page.evaluate(() => {
    const S = window._scene1StageContract, RS = window._resolveStageFromPlan;
    // LI is MENTIONED in the mission → mention-only → off the allowed roster.
    const mentionedLI = { pov:'first_person', name:'Ilse', playerName:'Ilse', identity:{playerName:'Ilse'},
      loveInterestName:'Dorian', partnerName:'Dorian',
      _scene1Mission:'She waits alone in the customs house, rehearsing what she will say to Dorian' };
    // LI is NOT mentioned → a legitimate allowed candidate the planner may choose to stage.
    const availableLI = { pov:'first_person', name:'Ilse', playerName:'Ilse', identity:{playerName:'Ilse'},
      loveInterestName:'Dorian', partnerName:'Dorian',
      _scene1Mission:'She counts crates in the customs house before the tide turns' };
    const ELS = ['the weighhouse ledger', 'a bolt of undyed cloth'];
    const spine = (extra) => Object.assign({ opening_setting:'customs house', environment_elements:ELS }, extra);
    const run = (st, planExtra) => {
      const c = S(st);
      const r = RS(c, spine(planExtra), null);
      return { ok:r.ok, fault:r.fault, setting:r.setting,
               elements:r.environmentElements, envOwner:r.environmentOwner,
               roster:(c.allowedRoster||[]).map(x=>x.label),
               onStage:(r.onStage||[]).map(x=>x.label), offStage:(r.offStage||[]).map(x=>x.name) };
    };
    const IP = (n) => ({ name:n, presence:'IN_PERSON', presence_mode:'IN_PERSON', anchor_beat:'is at the ledger' });
    return {
      narratorOnly: run(mentionedLI, { staged_characters:[IP('Ilse')] }),
      allowedNPC:   run(availableLI, { staged_characters:[IP('Ilse'), IP('Dorian')] }),
      stageMentioned: run(mentionedLI, { staged_characters:[IP('Ilse'), IP('Dorian')] }),
      inventedCast: run(mentionedLI, { staged_characters:[IP('Ilse'), IP('Quinn')] }),
      noStaged:     run(mentionedLI, { staged_characters: undefined }),
      pcNotStaged:  run(availableLI, { staged_characters:[IP('Dorian')] }),
      noElements:   run(mentionedLI, { staged_characters:[IP('Ilse')], environment_elements: undefined }),
      oneElement:   run(mentionedLI, { staged_characters:[IP('Ilse')], environment_elements:['the weighhouse ledger'] }),
      abstractEl:   run(mentionedLI, { staged_characters:[IP('Ilse')], environment_elements:['the weighhouse ledger','a sense of unease'] }),
      dupEl:        run(mentionedLI, { staged_characters:[IP('Ilse')], environment_elements:['the weighhouse ledger','The Weighhouse Ledger.'] }),
      // E+ matching, via the shipped inventory matcher
      epDeclared:   window._targetInInventory('the weighhouse ledger', ELS, 'customs house'),
      epSetting:    window._targetInInventory('customs house', ELS, 'customs house'),
      epUndeclared: window._targetInInventory('a brass lamp', ELS, 'customs house'),
    };
  });

  Object.entries(D).forEach(([k, v]) => {
    if (v && typeof v === 'object') {
      console.log(` ${k.padEnd(15)} ok=${String(v.ok).padEnd(5)} roster=${JSON.stringify(v.roster)} onStage=${JSON.stringify(v.onStage)}`);
      if (v.fault) console.log(`   ${' '.repeat(15)} fault: ${String(v.fault).slice(0, 150)}`);
    }
  });
  console.log('');

  t('D1 corridor narrator-only staging is VALID',
    D.narratorOnly.ok === true && D.narratorOnly.onStage.length === 1
    && D.narratorOnly.envOwner === 'planner' && (D.narratorOnly.elements || []).length === 2,
    JSON.stringify(D.narratorOnly));
  t('D2 corridor may stage a known allowed NPC',
    D.allowedNPC.ok === true && D.allowedNPC.onStage.includes('Dorian')
    && D.allowedNPC.roster.includes('Dorian'),
    JSON.stringify(D.allowedNPC));
  t('D3 a MENTIONED-only LI is off the roster and cannot be staged',
    D.stageMentioned.ok === false && /not on the allowed roster/i.test(D.stageMentioned.fault || '')
    && !D.narratorOnly.roster.includes('Dorian'),
    JSON.stringify({ roster: D.narratorOnly.roster, fault: D.stageMentioned.fault }));
  t('D4 an INVENTED staged character is rejected',
    D.inventedCast.ok === false && /"Quinn" is not on the allowed roster/i.test(D.inventedCast.fault || ''),
    JSON.stringify(D.inventedCast.fault));
  t('D5 missing staged_characters is rejected — C+ may never define presence',
    D.noStaged.ok === false && /returned no staged_characters/i.test(D.noStaged.fault || '')
    && /character_plus may never define/i.test(D.noStaged.fault || ''),
    JSON.stringify(D.noStaged.fault));
  t('D6 the narrator must be staged IN_PERSON',
    D.pcNotStaged.ok === false && /narrator is not staged IN_PERSON/i.test(D.pcNotStaged.fault || ''),
    JSON.stringify(D.pcNotStaged.fault));
  t('D7 missing environmental inventory is rejected',
    D.noElements.ok === false && /no environment_elements/i.test(D.noElements.fault || ''),
    JSON.stringify(D.noElements.fault));
  t('D7 a single element is rejected (at least two required)',
    D.oneElement.ok === false && /at least 2 concrete elements/i.test(D.oneElement.fault || ''),
    JSON.stringify(D.oneElement.fault));
  t('D8 an ABSTRACT element is rejected visibly',
    D.abstractEl.ok === false && /abstract, not a physical thing/i.test(D.abstractEl.fault || ''),
    JSON.stringify(D.abstractEl.fault));
  t('D8 a DUPLICATE element is rejected visibly',
    D.dupEl.ok === false && /duplicate environment element/i.test(D.dupEl.fault || ''),
    JSON.stringify(D.dupEl.fault));
  t('D9 E+ matching a DECLARED element is accepted; the setting itself also counts',
    D.epDeclared === true && D.epSetting === true);
  t('D10 E+ inventing an UNDECLARED element is rejected',
    D.epUndeclared === false);

  await page.close();
}

await browser.close();
console.log(`\n${'─'.repeat(92)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
