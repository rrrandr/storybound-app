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

// ── INFRASTRUCTURE PREFLIGHT (2026-08-28) ──
// A hung `vercel dev` still LISTENS on :3000 while answering nothing, and every case in this
// suite then spends its full page timeout before failing. One run burned 180s and reported a
// timeout that looked like a code regression; it was an eleven-hour-old server process. Ask the
// server one question BEFORE launching Chromium, and abort with an infrastructure message rather
// than browsers against a dead port.
async function preflight(url = 'http://localhost:3000/') {
  const started = Date.now();
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(url, { signal: ctl.signal });
    clearTimeout(timer);
    const body = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!/<\s*script|<\s*html/i.test(body)) throw new Error('response is not the app shell');
    console.log(`  ⚙ preflight ok — ${url} responded ${res.status} in ${Date.now() - started}ms\n`);
  } catch (e) {
    console.error(`\n  ✗ INFRASTRUCTURE: ${url} is not serving the app (${e.message}).`);
    console.error('    Start it with:  npx vercel dev --listen 3000');
    console.error('    If it is already "running", it may be hung while still holding the port —');
    console.error('    check with:  lsof -nP -iTCP:3000   and kill that PID directly.\n');
    process.exit(2);
  }
}
await preflight();

const browser = await chromium.launch({ headless: true });

// ════════════════════════════════════════════════════════════════════════════════════════════
// PART A — the contract, as a pure function, over eight states
// ════════════════════════════════════════════════════════════════════════════════════════════
{
  const page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: APP }));
  await page.route('**/api/**', route => PASSTHROUGH.test(route.request().url()) ? route.continue() : route.abort());
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window.state && window._scene1StageContract && window.STARTER_SEEDS, { timeout:120000 });

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
async function fullRun({ label, statePatch, injectSeedB, reply }) {
  const page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
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
      out = reply ? reply(usr) : plannerReplyFor(usr);
    } else out = JSON.stringify(GENERIC);
    const env = /mistral-proxy/.test(url)
      ? { id:'mock', object:'chat.completion', model:b.model, usage:{}, choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content: out } }] }
      : { ok:true, content: out, choices:[{ message:{ content: out } }] };
    return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(env) });
  });
  page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
  const logs = [];
  page.on('console', m => { const x=m.text(); if (/SCENE1:|STAGE|SKELETON|ANGLE/.test(x)) logs.push(x.slice(0,240)); });

  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_SEEDS, { timeout:120000 });
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
// Reads keyed by slot, not by name: the fixture serves two different seeds and must still hand
// each character a reading that would NOT survive being given to the person beside them. The
// first version name-swapped one template and the uniqueness check rejected it, correctly.
// DISTINCT PER SLOT (the same-reading validator), and deliberately sharing no vocabulary with
// any seeded canonical_truth — the restatement check measures overlap against the truth a plan
// cites, and a fixture read built from the truth's own words trips it. Slot 3 used to be the
// Dohkar's truth almost verbatim and scored 83%.
const SLOT_READS = [
  'has already decided who will be blamed and is choosing where to be standing when it lands',
  'expected to be thanked by now and cannot settle until somebody says the words out loud',
  'has learned exactly which parts nobody checks, and treats that knowledge as a form of seniority',
  'trusts what a body admits over what a mouth says, and has been right often enough to stop apologising for it',
];
// The C+ CANDIDATE block as dispatched: canonical label -> permitted modes + authored facet
// ids. Read from the prompt rather than hard-coded, so a reply can only cite what the request
// actually offered — which is the same discipline the validator enforces on the real planner.
// The dispatched corpora: numbered facts, objects, people, and the PC's own lens operations.
function corporaFromPrompt(usr) {
  const u = String(usr || '');
  const facts = [...u.matchAll(/^  (E\d+): (.+)$/gm)].map(m => ({ id: m[1], text: m[2] }));
  const objects = [...u.matchAll(/^  (O\d+): (.+)$/gm)].map(m => ({ id: m[1], text: m[2] }));
  const people = [...u.matchAll(/^  ((?:pc|named|role):[a-z0-9_]+): (.+)$/gm)].map(m => ({ id: m[1], text: m[2] }));
  const ops = [...u.matchAll(/^    · ([A-Z_]{6,})  —  /gm)].map(m => m[1]);
  return { facts, objects, people, ops };
}

function candidatesFromPrompt(usr) {
  const out = {};
  const block = (String(usr || '').match(/CHARACTER\+ CANDIDATES \(\d+\)[\s\S]*?(?=\nNOT CANDIDATES|\nEVERY character_plus|\nWHERE A PERSON HAS|\nThis story has no authored)/) || [''])[0];
  block.split(/\n(?=  • )/).forEach(chunk => {
    const name = (chunk.match(/^\s*•\s*(.+)$/m) || [])[1];
    if (!name) return;
    const modes = ((chunk.match(/modes permitted: ([^\n]*)/) || [])[1] || '').trim().split(' | ').filter(Boolean);
    // Facet ids are the bullets under AUTHORED PSYCHOLOGY, each followed by its [category], and
    // each carries its applicability conditions. The reply cites the FIRST verbatim — the point
    // is that a condition the record does not list is refused, so the mock must not paraphrase.
    const facets = [], pressures = {};
    const fre = /^\s{6,}· facet_id: (\S+)\s+\[[a-z_]+\]([\s\S]*?)(?=^\s{6,}· facet_id: |^\s{6,}READS THIS|^\s{6,}⟂|$(?![\s\S]))/gm;
    let f; while ((f = fre.exec(chunk))) {
      facets.push(f[1]);
      const cs = [...f[2].matchAll(/pressure_id: (\S+)\s+→/g)].map(m => m[1]);
      pressures[f[1]] = cs[0] || '';
    }
    out[name.trim()] = { modes, facets, pressures };
  });
  return out;
}
const cpEntry = (C, n, extra, co) => {
  const c = C[n] || {}; const fid = (c.facets || [])[0];
  const pr = fid ? ((c.pressures || {})[fid] || '') : '';
  const { psychological_read, ...rest } = extra || {};
  const E1 = ((co || {}).facts || [])[0], OP = ((co || {}).ops || [])[0];
  return { character:n, mode: ((c.modes || [])[0] || 'IN_PERSON'),
           ...(fid ? { facet_id: fid } : {}), ...(pr ? { pressure_id: pr } : {}),
           ...(pr && E1 ? { pressure_evidence_ids: [E1.id] } : {}),
           first_mention:true, ...rest,
           behavior_object_ids: [], behavior_person_ids: [],
           ...(OP ? { pc_lens_operation: OP } : {}),
           // Where a facet exists the read comes from the record. Where none does — the corridor
           // and the synthetic second seed — the legacy field is the only source there is.
           ...(fid ? {} : { character_revelation: psychological_read }),
           pc_effect: `I had read ${n} before I had grounds to` };
};

function plannerReplyFor(usr) {
  // The roster block is the PHYSICAL roster now, and no longer ends on a per-body C+ rule.
  const m = usr.match(/STAGED ROSTER — PHYSICALLY ON STAGE \((\d+)\)[^\n]*\n([\s\S]*?)\nThese are the only people/);
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
  // 2026-08-26 schema: E+ carries physical evidence of its axis, and the PC's opening beat IS the
  // fusion — so her C+ angle and her staged anchor must be that same beat.
  const pcName = cast[0];
  const pofBeat = `my thumb finds the ${target} where it has been worn smooth by hands that came before mine, and my rehearsed steadiness feels newly counterfeit`;
  // 2026-08-27 single-source contract: the PROTAGONIST gets no character_plus entry and no
  // anchor of her own. Anchors ship as the prefilled sentinels and are derived after validation.
  spine.staged_characters = spine.staged_characters.map(c =>
    ({ ...c, anchor_beat: c.name === pcName ? 'FROM_PC_OPENING_FUSION' : 'FROM_CHARACTER_PLUS' }));
  return JSON.stringify({ opening_spine: spine, scene_skeleton: {
    character_plus: (cands => cast.filter(n => n !== pcName)
      .map((n, i) => cpEntry(cands, n, { behavior:`${n} lets the pause run a beat longer than the words need`,
                                         psychological_read: SLOT_READS[i % SLOT_READS.length] },
                             corporaFromPrompt(usr))))(candidatesFromPrompt(usr)),
    environment_plus: { target, axis:'use',
      beat:`the ${target} is worn smooth along one edge where it has been handled the same way for years` },
    pc_opening_fusion: { character: pcName, placement:'PC_FIRST_EMBODIED_BEAT',
      character_angle:'rehearsed steadiness that does not survive contact',
      environment_target: target, environment_axis:'use', beat: pofBeat },
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
      && st.onStage.every(n => pu.includes(n)),
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
  page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: APP }));
  await page.route('**/api/**', route => PASSTHROUGH.test(route.request().url()) ? route.continue() : route.abort());
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window.state && window._resolveStageFromPlan, { timeout:120000 });

  const D = await page.evaluate(() => {
    const S = window._scene1StageContract;
    const call = (patch) => {
      const c = S(Object.assign({ pov:'first_person', name:'Ilse', playerName:'Ilse',
        identity:{playerName:'Ilse'} }, patch));
      return { ok:c.ok, fault:c.fault, settingOwner:c.settingOwner, presenceOwner:c.presenceOwner,
               pending:c.pending, onStage:(c.onStage||[]).map(x=>x.label),
               offStage:(c.offStage||[]).map(x=>x.name) };
    };
    window.STARTER_PLANS['test_explicit_two'] = { scenes: [{ n:1,
      goal:'She counts crates in the customs house', setting:'the customs house',
      participants:['Ilse', 'Dorian'] }] };
    // ── RESTORED 2026-08-26: environment-inventory coverage ──
    // These five assertions were dropped when Part D was rewritten for deterministic presence,
    // but the guards they cover are still live and enforcing in _resolveStageFromPlan. Presence
    // is no longer read from the plan, so the corridor state is fixed and only the plan's
    // environment_elements vary.
    const RS = window._resolveStageFromPlan;
    const ELS = ['the weighhouse ledger', 'a bolt of undyed cloth'];
    const envRun = (planExtra) => {
      const c = S({ pov:'first_person', name:'Ilse', playerName:'Ilse', identity:{playerName:'Ilse'},
        loveInterestName:'Dorian', partnerName:'Dorian',
        _scene1Mission:'She counts crates in the customs house before the tide turns' });
      const r = RS(c, Object.assign({ opening_setting:'customs house', environment_elements:ELS }, planExtra), null);
      return { ok:r.ok, fault:r.fault, elements:r.environmentElements, envOwner:r.environmentOwner,
               onStage:(r.onStage||[]).map(x=>x.label) };
    };
    return {
      // 1 corridor, nothing explicit -> narrator only, and the LI stays offstage
      narratorOnly: call({ _scene1Mission:'She counts crates in the customs house before the tide turns',
                           loveInterestName:'Dorian', partnerName:'Dorian' }),
      // 2 explicit two-person assignment row
      explicitTwo:  call({ _starterId:'test_explicit_two', loveInterestName:'Dorian', partnerName:'Dorian' }),
      // 3 LI mentioned in the mission -> still offstage, never promoted
      mentionedLI:  call({ _scene1Mission:'She waits alone, rehearsing what she will say to Dorian',
                           loveInterestName:'Dorian', partnerName:'Dorian' }),
      // 4 a global-roster NPC that the scene never stages
      rosterNPC:    call({ _scene1Mission:'She counts crates before the tide turns',
                           loveInterestName:'Dorian', partnerName:'Mara' }),
      // environment inventory, through the REAL plan-resolution path
      envGood:      envRun({}),
      noElements:   envRun({ environment_elements: undefined }),
      oneElement:   envRun({ environment_elements: ['the weighhouse ledger'] }),
      abstractEl:   envRun({ environment_elements: ['the weighhouse ledger', 'a sense of unease'] }),
      dupEl:        envRun({ environment_elements: ['the weighhouse ledger', 'The Weighhouse Ledger.'] }),
      // E+ target matching, via the shipped inventory matcher
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

  t('D1 a corridor with no explicit presence stages the NARRATOR ONLY',
    D.narratorOnly.ok && D.narratorOnly.presenceOwner === 'narrator-only'
    && D.narratorOnly.onStage.length === 1 && D.narratorOnly.onStage[0] === 'Ilse',
    JSON.stringify(D.narratorOnly));
  t('D1 presence is NEVER planner-owned, under any corridor shape',
    ['narratorOnly','explicitTwo','mentionedLI','rosterNPC']
      .every(k => D[k].presenceOwner !== 'planner'),
    JSON.stringify(Object.keys(D).map(k => `${k}:${D[k].presenceOwner}`)));
  t('D1 the planner still owns the corridor WHERE (setting stays pending)',
    D.narratorOnly.settingOwner === 'planner' && D.narratorOnly.pending === true,
    JSON.stringify(D.narratorOnly));
  t('D2 an EXPLICIT assignment row stages exactly its stated participants',
    D.explicitTwo.ok && D.explicitTwo.presenceOwner === 'assignment'
    && D.explicitTwo.onStage.includes('Ilse') && D.explicitTwo.onStage.includes('Dorian')
    && D.explicitTwo.onStage.length === 2,
    JSON.stringify(D.explicitTwo));
  t('D3 a mention-only LI stays offstage and never becomes presence',
    D.mentionedLI.ok && !D.mentionedLI.onStage.includes('Dorian')
    && D.mentionedLI.offStage.includes('Dorian'),
    JSON.stringify(D.mentionedLI));
  t('D4 a global-roster NPC the scene never staged stays offstage',
    D.rosterNPC.ok && D.rosterNPC.onStage.length === 1
    && D.rosterNPC.offStage.includes('Mara') && D.rosterNPC.offStage.includes('Dorian'),
    JSON.stringify(D.rosterNPC));
  t('D5 no side-cast is manufactured to give the scene another body',
    D.narratorOnly.onStage.length === 1 && D.rosterNPC.onStage.length === 1);

  // ── RESTORED environment-inventory cases (were D7-D10 before the presence rewrite) ──
  t('D6 a valid two-element inventory is accepted and becomes the contract',
    D.envGood.ok === true && D.envGood.envOwner === 'planner'
    && (D.envGood.elements || []).length === 2,
    JSON.stringify(D.envGood));
  t('D6 missing environmental inventory is rejected',
    D.noElements.ok === false && /no environment_elements/i.test(D.noElements.fault || ''),
    JSON.stringify(D.noElements.fault));
  t('D7 a single element is rejected (at least two required)',
    D.oneElement.ok === false && /at least 2 concrete elements/i.test(D.oneElement.fault || ''),
    JSON.stringify(D.oneElement.fault));
  t('D7 an ABSTRACT element is rejected visibly',
    D.abstractEl.ok === false && /abstract, not a physical thing/i.test(D.abstractEl.fault || ''),
    JSON.stringify(D.abstractEl.fault));
  t('D8 a DUPLICATE element is rejected visibly',
    D.dupEl.ok === false && /duplicate environment element/i.test(D.dupEl.fault || ''),
    JSON.stringify(D.dupEl.fault));
  t('D9 E+ matching a DECLARED element is accepted; the setting itself also counts',
    D.epDeclared === true && D.epSetting === true,
    JSON.stringify({ declared: D.epDeclared, setting: D.epSetting }));
  t('D9 E+ inventing an UNDECLARED element is rejected by the matcher',
    D.epUndeclared === false, JSON.stringify(D.epUndeclared));

  await page.close();
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// PART E — STRUCTURAL RECOVERY MUST NOT BECOME IDENTITY RECOVERY
// The exact shape the live corridor sample produced: staged_characters at the envelope's top
// level, containing an invented person. The array must be MOVED intact and then REJECTED.
// ════════════════════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(92)}\nPART E — LIFTED, THEN STILL JUDGED\n${'═'.repeat(92)}`);
{
  const CORRIDOR = { playerName:'', name:'',
    _scene1Mission:'She counts crates in the customs house before the tide turns',
    loveInterestName:'Dorian', partnerName:'Dorian', liGender:'male' };

  // Build a corridor reply whose staged_characters sits at the TOP level.
  const corridorReply = (usr, { stagedNames, epTarget, elements }) => {
    // The fixed cast is PREFILLED in the template now; echo it back unless the case is
    // deliberately editing it.
    const roster = [...usr.matchAll(/\{ "name": "([^"]+)", "presence": "IN_PERSON"/g)].map(m => m[1]);
    const els = elements || ['the weighhouse ledger', 'a bolt of undyed cloth'];
    const names = stagedNames || roster;
    const spine = { pressure_source_type:'institutional', pressure_source:L, hook_object:'the ledger',
      opening_beat:'The count is already short', rising_beats:['a','b'], decision_beat:'Does she sign',
      pc_career:'clerk', opening_setting:'customs house', environment_elements: els,
      li_texture_beat:'He is not here', interlocutor_placement:'They stand apart', pc_wound_anchor:L,
      pc_self_presentation_beat:'decision', scene_want:SCENE_WANT, scene_mission:L,
      reader_state:{ knows:L, believes:L, wondering:L, must_not_confuse:L },
      pc_body_callback:'decision', li_body_callback:'opening', antagonist_body_callback:null,
      perceptual_signature_beat:L };
    const target = epTarget || els[0];
    const pcN = names[0];
    const pofBeat = `my thumb finds the ${target} where it has been worn smooth by hands that came before mine, and my rehearsed steadiness feels newly counterfeit`;
    return JSON.stringify({
      opening_spine: spine,                                  // NOTE: no staged_characters here
      staged_characters: names.map(n => ({ name:n, presence:'IN_PERSON',
        anchor_beat: n === pcN ? 'FROM_PC_OPENING_FUSION' : 'FROM_CHARACTER_PLUS' })),
      scene_skeleton: {
        character_plus: (cands => names.filter(n => n !== pcN).map((n, i) =>
          cpEntry(cands, n, { behavior: `${n} checks the ledger before the words`,
                              psychological_read: SLOT_READS[i % SLOT_READS.length] },
                  corporaFromPrompt(usr))))(candidatesFromPrompt(usr)),
        environment_plus: { target, axis:'use',
          beat:`the ${target} is worn smooth along one edge where it has been handled the same way for years` },
        pc_opening_fusion: { character: pcN, placement:'PC_FIRST_EMBODIED_BEAT',
          character_angle:'rehearsed steadiness that does not survive contact',
          environment_target: target, environment_axis:'use', beat: pofBeat },
      },
    });
  };

  // E1 — lone top-level array, all names on the roster: lifted AND accepted.
  {
    const R = await fullRun({ label:'corridor stagedTop (valid)', statePatch: CORRIDOR,
      reply: (u) => corridorReply(u, {}) });
    const lifted = R.logs.some(l => /ENVELOPE:NORMALISED/.test(l) && /staged_characters \(top level -> opening_spine\)/.test(l));
    t('E1 lone top-level staged_characters is lifted and the plan validates',
      lifted && R.author.length === 1 && !R.skeletonFatal,
      `lifted=${lifted} author=${R.author.length} fault=${R.skeletonFatal}`);
  }
  // E2 — same shape, but the array contains an INVENTED person.
  {
    const R = await fullRun({ label:'corridor stagedTop + Mateo', statePatch: CORRIDOR,
      reply: (u) => {
        const roster = [...u.matchAll(/\{ "name": "([^"]+)", "presence": "IN_PERSON"/g)].map(m => m[1]);
        return corridorReply(u, { stagedNames: roster.concat(['Mateo']) });
      } });
    const lifted = R.logs.some(l => /ENVELOPE:NORMALISED/.test(l) && /staged_characters \(top level -> opening_spine\)/.test(l));
    const rejected = /not part of this scene's fixed cast/i.test(String(R.skeletonFatal || ''));
    t('E2 an invented person is MOVED intact and then rejected by the fixed-cast validator',
      lifted && rejected && R.author.length === 0,
      `lifted=${lifted} rejected=${rejected} author=${R.author.length} fault=${R.skeletonFatal}`);
    t('E2 structural recovery did not become identity recovery',
      R.logs.some(l => /values moved intact/.test(l)) && rejected);
  }
  // E3 — corridor E+ pointing at an element that was never declared.
  {
    const R = await fullRun({ label:'corridor undeclared E+', statePatch: CORRIDOR,
      reply: (u) => corridorReply(u, { epTarget: 'a brass lamp' }) });
    t('E3 corridor E+ cannot target an UNDECLARED element',
      R.author.length === 0 && /not one of the declared environment_elements/i.test(String(R.skeletonFatal || '')),
      `author=${R.author.length} fault=${R.skeletonFatal}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// PART F — GENERALISED ENVELOPE RECONCILER (pure)
// Tolerate container placement drift; stay uncompromising about content.
// ════════════════════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(92)}\nPART F — ENVELOPE RECONCILER\n${'═'.repeat(92)}\n`);
{
  const page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: APP }));
  await page.route('**/api/**', route => PASSTHROUGH.test(route.request().url()) ? route.continue() : route.abort());
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window._reconcileOpeningEnvelope && window._openingSpineDeclaredFields, { timeout:180000 });

  const F = await page.evaluate(() => {
    const R = window._reconcileOpeningEnvelope;
    const FIELDS = ['opening_setting', 'environment_elements', 'staged_characters', 'reader_state', 'hook_object'];
    const SK = { character_plus: [{ character: 'Lirael' }] };
    const spineVals = {
      opening_setting: 'customs house',
      environment_elements: ['the ledger', 'a bolt of cloth'],
      staged_characters: [{ name: 'Lirael', presence_mode: 'IN_PERSON' }],
      reader_state: { knows: 'k' },
      hook_object: 'the summons',
    };
    const canonical = () => ({ opening_spine: JSON.parse(JSON.stringify(spineVals)), scene_skeleton: JSON.parse(JSON.stringify(SK)) });
    const run = (env) => { const r = R(env, FIELDS); return {
      fault: r.fault, moves: r.moves, createdSpine: r.createdSpine,
      env: r.fault ? null : r.envelope }; };

    // 1 canonical, fully nested
    const t1 = run(canonical());
    // 2 whole spine distributed at top level
    const t2 = run(Object.assign({ opening_spine: {} }, JSON.parse(JSON.stringify(spineVals)), { scene_skeleton: SK }));
    // 3 container absent entirely
    const t3 = run(Object.assign({}, JSON.parse(JSON.stringify(spineVals)), { scene_skeleton: SK }));
    // 4 mixed: some nested, some at top, each exactly once
    const t4 = run({ opening_spine: { opening_setting: 'customs house', reader_state: { knows: 'k' } },
                     environment_elements: ['the ledger', 'a bolt of cloth'],
                     staged_characters: [{ name: 'Lirael', presence_mode: 'IN_PERSON' }],
                     hook_object: 'the summons', scene_skeleton: SK });
    // 5/6/7 duplicates — scalar, array, object — byte-equivalent on purpose
    const dup = (k) => { const e = canonical(); e[k] = JSON.parse(JSON.stringify(spineVals[k])); e.scene_skeleton = SK; return run(e); };
    const t5 = dup('opening_setting'), t6 = dup('environment_elements'), t7 = dup('reader_state');
    // 8 unknown top-level key
    const e8 = canonical(); e8.pc_body_bible = { x: 1 };
    const t8 = run(e8);
    // 9 skeleton nested only
    const e9 = canonical(); e9.opening_spine.scene_skeleton = e9.scene_skeleton; delete e9.scene_skeleton;
    const t9 = run(e9);
    // 10 skeleton in both places
    const e10 = canonical(); e10.opening_spine.scene_skeleton = JSON.parse(JSON.stringify(SK));
    const t10 = run(e10);
    // ── 2026-08-26 duplicate policy: IDENTICAL collapses, DIFFERENT still aborts ──
    // 11a object-key ORDER must not count as a difference
    const e11 = canonical();
    e11.reader_state = { knows: 'k' };                    // same data, built separately
    const t11 = run(e11);
    const eKeyOrder = canonical();
    eKeyOrder.opening_spine.reader_state = { a: 1, b: 2, c: { x: 9, y: 8 } };
    eKeyOrder.reader_state = { c: { y: 8, x: 9 }, b: 2, a: 1 };   // same keys, reversed order
    const tKeyOrder = run(eKeyOrder);
    // 11b DIFFERING copies must still abort — one per type
    const diff = (k, v) => { const e = canonical(); e[k] = v; return run(e); };
    const dScalar = diff('opening_setting', 'weighhouse');
    const dArray  = diff('environment_elements', ['a bolt of cloth', 'the ledger']);   // ORDER differs
    const dArrLen = diff('environment_elements', ['the ledger']);
    const dObject = diff('reader_state', { knows: 'k', believes: 'b' });               // extra key
    const dNested = diff('staged_characters', [{ name: 'Lirael', presence_mode: 'ON_PHONE' }]);
    // 11c skeleton: identical collapses, differing aborts
    const eSkSame = canonical(); eSkSame.opening_spine.scene_skeleton = JSON.parse(JSON.stringify(SK));
    const tSkSame = run(eSkSame);
    const eSkDiff = canonical();
    eSkDiff.opening_spine.scene_skeleton = { character_plus: [{ character: 'Julian' }] };
    const tSkDiff = run(eSkDiff);
    // 11d NO coercion / normalisation may make unequal things equal
    const nCoerce = diff('hook_object', ' the summons ');        // whitespace
    const nCase   = diff('opening_setting', 'Customs House');    // case
    const nType   = diff('hook_object', ['the summons']);        // string vs array
    // 11e idempotence AFTER a collapse, and the canonical output is stable
    const cOnce = R((function(){ const e = canonical(); e.reader_state = { knows:'k' };
                                 e.opening_spine.scene_skeleton = JSON.parse(JSON.stringify(SK)); return e; })(), FIELDS);
    const cTwice = R(cOnce.envelope, FIELDS);
    // 12 idempotence — reconcile the reconciled output again
    const once = R(Object.assign({ opening_spine: {} }, JSON.parse(JSON.stringify(spineVals)), { scene_skeleton: SK }), FIELDS);
    const twice = R(once.envelope, FIELDS);

    return { t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, tKeyOrder,
             dScalar, dArray, dArrLen, dObject, dNested, tSkSame, tSkDiff,
             nCoerce, nCase, nType,
             collapseIdem: { firstMoves: cOnce.moves, secondMoves: cTwice.moves.length,
                             secondFault: cTwice.fault,
                             identical: JSON.stringify(cOnce.envelope) === JSON.stringify(cTwice.envelope),
                             canonical: cOnce.envelope },
             idem: { firstMoves: once.moves.length, secondMoves: twice.moves.length, secondFault: twice.fault,
                     identical: JSON.stringify(once.envelope) === JSON.stringify(twice.envelope) },
             // values must survive byte-identical through a move
             valuesIntact: JSON.stringify(t2.env && t2.env.opening_spine) === JSON.stringify(spineVals) };
  });

  const okShape = (t) => !t.fault && t.env && t.env.opening_spine && t.env.scene_skeleton
    && Object.keys(t.env).length === 2;
  t('F1 canonical fully-nested envelope passes unchanged (no moves)',
    okShape(F.t1) && F.t1.moves.length === 0 && !F.t1.createdSpine, JSON.stringify(F.t1.fault || F.t1.moves));
  t('F2 a whole spine distributed at top level is reconciled',
    okShape(F.t2) && F.t2.moves.length === 5, JSON.stringify(F.t2.fault || F.t2.moves));
  t('F2 moved values are byte-identical — no merge, no coercion', F.valuesIntact);
  t('F3 an absent opening_spine is reconstructed from recognised fields',
    okShape(F.t3) && F.t3.createdSpine === true && F.t3.moves.length === 5,
    JSON.stringify(F.t3.fault || F.t3));
  t('F4 mixed unique placement is reconciled',
    okShape(F.t4) && F.t4.moves.length === 3, JSON.stringify(F.t4.fault || F.t4.moves));
  // ── SUPERSEDED 2026-08-26 (round-10 evidence): identical duplicates carry no competing
  //    decision, so they collapse. Rejecting them protected nothing and lost a valid opening.
  //    A DIFFERENCE of any kind still hard-fails — that is asserted immediately below.
  const collapsed = (t, k) => !t.fault && t.env && t.env.opening_spine
    && !Object.prototype.hasOwnProperty.call(t.env, k)                       // top-level copy gone
    && Object.prototype.hasOwnProperty.call(t.env.opening_spine, k)          // nested copy kept
    && t.moves.some(m => m === k + '\u2261');
  t('F5 identical duplicate SCALAR collapses onto the nested copy',
    collapsed(F.t5, 'opening_setting')
      && F.t5.env.opening_spine.opening_setting === 'customs house',
    JSON.stringify({ fault: F.t5.fault, moves: F.t5.moves }));
  t('F6 identical duplicate ARRAY collapses (order-sensitive match)',
    collapsed(F.t6, 'environment_elements')
      && JSON.stringify(F.t6.env.opening_spine.environment_elements) === JSON.stringify(['the ledger', 'a bolt of cloth']),
    JSON.stringify({ fault: F.t6.fault, moves: F.t6.moves }));
  t('F7 identical duplicate OBJECT collapses',
    collapsed(F.t7, 'reader_state'), JSON.stringify({ fault: F.t7.fault, moves: F.t7.moves }));
  t('F7 identical duplicate OBJECT collapses despite KEY ORDER differing',
    collapsed(F.tKeyOrder, 'reader_state')
      && JSON.stringify(F.tKeyOrder.env.opening_spine.reader_state) === JSON.stringify({ a:1, b:2, c:{ x:9, y:8 } }),
    JSON.stringify({ fault: F.tKeyOrder.fault, moves: F.tKeyOrder.moves }));
  t('F7 a separately-built but equal object still collapses',
    collapsed(F.t11, 'reader_state'), JSON.stringify(F.t11.fault));

  // ── DIFFERENCES STILL ABORT ──
  const aborts = (t, k) => /is present BOTH/.test(t.fault || '') && /DIFFERENT values/.test(t.fault || '')
    && new RegExp(k).test(t.fault || '');
  t('F5b a DIFFERING scalar duplicate still aborts',      aborts(F.dScalar, 'opening_setting'), JSON.stringify(F.dScalar.fault));
  t('F6b an array differing only in ORDER still aborts',  aborts(F.dArray, 'environment_elements'), JSON.stringify(F.dArray.fault));
  t('F6b an array differing in LENGTH still aborts',      aborts(F.dArrLen, 'environment_elements'), JSON.stringify(F.dArrLen.fault));
  t('F7b an object with an EXTRA key still aborts',       aborts(F.dObject, 'reader_state'), JSON.stringify(F.dObject.fault));
  t('F7b a difference NESTED inside an array of objects still aborts',
    aborts(F.dNested, 'staged_characters'), JSON.stringify(F.dNested.fault));
  t('F7c NO whitespace normalisation — " the summons " differs',  aborts(F.nCoerce, 'hook_object'), JSON.stringify(F.nCoerce.fault));
  t('F7c NO case folding — "Customs House" differs',              aborts(F.nCase, 'opening_setting'), JSON.stringify(F.nCase.fault));
  t('F7c NO type coercion — a string is not a one-element array', aborts(F.nType, 'hook_object'), JSON.stringify(F.nType.fault));
  t('F8 an unknown top-level key is a visible schema fault, never discarded',
    /unrecognised top-level field\(s\).*pc_body_bible/.test(F.t8.fault || ''), JSON.stringify(F.t8.fault));
  t('F9 a nested-only scene_skeleton is lifted to the top level',
    okShape(F.t9) && F.t9.moves.some(m => /scene_skeleton/.test(m)), JSON.stringify(F.t9.fault || F.t9.moves));
  t('F10 an IDENTICAL scene_skeleton duplicate collapses onto the TOP-LEVEL copy',
    !F.tSkSame.fault && F.tSkSame.env
      && !Object.prototype.hasOwnProperty.call(F.tSkSame.env.opening_spine, 'scene_skeleton')
      && JSON.stringify(F.tSkSame.env.scene_skeleton) === JSON.stringify({ character_plus: [{ character: 'Lirael' }] })
      && F.tSkSame.moves.some(m => m === 'scene_skeleton\u2261'),
    JSON.stringify({ fault: F.tSkSame.fault, moves: F.tSkSame.moves }));
  t('F10b a DIFFERING scene_skeleton duplicate still aborts',
    /scene_skeleton is present BOTH/.test(F.tSkDiff.fault || '')
      && /DIFFERENT values/.test(F.tSkDiff.fault || ''),
    JSON.stringify(F.tSkDiff.fault));
  t('F11 after a collapse the reconciler is still IDEMPOTENT and the output is canonical',
    F.collapseIdem.secondMoves === 0 && !F.collapseIdem.secondFault && F.collapseIdem.identical
      && Object.keys(F.collapseIdem.canonical).length === 2
      && !!F.collapseIdem.canonical.scene_skeleton
      && !Object.prototype.hasOwnProperty.call(F.collapseIdem.canonical.opening_spine, 'scene_skeleton'),
    JSON.stringify(F.collapseIdem));
  t('F12 the reconciler is idempotent',
    F.idem.firstMoves === 5 && F.idem.secondMoves === 0 && !F.idem.secondFault && F.idem.identical,
    JSON.stringify(F.idem));

  await page.close();
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// PART G — THE IDENTITY SCANNER, AS A PURE FUNCTION
// The scanner's whole value depends on it NOT being a capitalization sweep. A loose one would
// reject "Veilwood", "Guildhall", "The Answer" and every sentence-initial word, and the first
// false positive would get it switched off. The negative controls matter more than the positives.
// ════════════════════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(92)}\nPART G — INVENTED-IDENTITY SCANNER (pure)\n${'═'.repeat(92)}\n`);
{
  const page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: APP }));
  await page.route('**/api/**', route => PASSTHROUGH.test(route.request().url()) ? route.continue() : route.abort());
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window.state && window._planInventedPersons, { timeout:120000 });

  const G = await page.evaluate(() => {
    const stage = {
      onStage:  [{ id:'pc:lirael', label:'Lirael', kind:'pc', aliases:['Lirael'] }],
      offStage: [{ name:'Julian', reason:'mentioned in the scene mission, never staged' }],
      setting: 'the Veilwood guildhall corridor',
      environmentElements: ['a carved oak door', 'the Ashen Ledger', 'waxed stone floor'],
    };
    const st = { playerName:'Lirael', loveInterestName:'Julian', partnerName:'Julian' };
    const known = window._planKnownNameSet(stage, st);
    const scan = (o) => window._planInventedPersons(o, known, '', [], 0).map(v => v.name);
    return {
      known: Object.keys(known).sort(),
      // ── POSITIVES: the exact round-6 failure, field by field ──
      pWant:     scan({ scene_want:'wants Quinn to notice the dye on her sleeves' }),
      pMission:  scan({ scene_mission:'Convince Quinn to delay the verdict' }),
      pReader:   scan({ reader_state:{ must_not_confuse:'who is speaking (the magistrate, not Quinn)' } }),
      pWonder:   scan({ reader_state:{ wondering:'whether Quinn will keep the ledger closed' } }),
      pApposit:  scan({ interlocutor_placement:"Quinn — the magistrate's clerk, silver-streaked braid" }),
      pPossess:  scan({ beat:"she waited for Quinn's voice to steady" }),
      pSubject:  scan({ beat:'Mateo hesitated in the doorway' }),
      pNested:   scan({ opening_spine:{ reader_state:{ knows:'Soraya waits at the gate' } } }),
      // ── NEGATIVES: none of these may be reported ──
      nPlace:    scan({ opening_setting:'the Veilwood guildhall corridor', beat:'Veilwood will keep its own counsel' }),
      nElements: scan({ environment_elements:['a carved oak door','the Ashen Ledger','waxed stone floor'] }),
      nSentInit: scan({ a:'The door held.', b:'She waited.', c:'Then the light moved.', d:'Nobody came.',
                        e:'There was no answer.', f:'It stopped.' }),
      nOnStage:  scan({ scene_want:'wants Lirael to stop counting', beat:"Lirael's hand flattened on the ledger" }),
      nOffStage: scan({ scene_want:'wants to be gone before Julian arrives', m:'Convince Julian to wait' }),
      nMonths:   scan({ beat:'March will come before the tide turns' }),
      nRoleNoun: scan({ beat:'the clerk hesitated; the magistrate said nothing' }),
      nEmpty:    scan({ a:null, b:'', c:0, d:[], e:{} }),
    };
  });

  console.log(` known-name set: ${JSON.stringify(G.known)}\n`);
  const only = (arr, n) => Array.isArray(arr) && arr.length === 1 && arr[0] === n;

  t('G1 "wants Quinn to notice" — the want frame catches it',            only(G.pWant, 'Quinn'), JSON.stringify(G.pWant));
  t('G1 "Convince Quinn ..." sentence-initial verb still catches it',    only(G.pMission, 'Quinn'), JSON.stringify(G.pMission));
  t('G1 "the magistrate, not Quinn" — the contrast frame catches it',    only(G.pReader, 'Quinn'), JSON.stringify(G.pReader));
  t('G1 "whether Quinn will keep ..." — the modal frame catches it',     only(G.pWonder, 'Quinn'), JSON.stringify(G.pWonder));
  t('G1 "Quinn — the clerk" — the appositive frame catches it',          only(G.pApposit, 'Quinn'), JSON.stringify(G.pApposit));
  t("G1 \"Quinn's voice\" — the possessive frame catches it",            only(G.pPossess, 'Quinn'), JSON.stringify(G.pPossess));
  t('G1 "Mateo hesitated" — the subject frame catches it',               only(G.pSubject, 'Mateo'), JSON.stringify(G.pSubject));
  t('G1 the walk reaches ARBITRARILY NESTED fields',                     only(G.pNested, 'Soraya'), JSON.stringify(G.pNested));

  t('G2 a PLACE in a person frame is not a person',                      G.nPlace.length === 0, JSON.stringify(G.nPlace));
  t('G2 capitalised environment elements are not people',                G.nElements.length === 0, JSON.stringify(G.nElements));
  t('G2 sentence-initial words are never reported',                      G.nSentInit.length === 0, JSON.stringify(G.nSentInit));
  t('G2 the narrator herself is not an invention',                       G.nOnStage.length === 0, JSON.stringify(G.nOnStage));
  t('G2 an ESTABLISHED OFFSTAGE person may be referenced freely',        G.nOffStage.length === 0, JSON.stringify(G.nOffStage));
  t('G2 month and weekday names are not people',                         G.nMonths.length === 0, JSON.stringify(G.nMonths));
  t('G2 unnamed role-nouns are not people (the sanctioned escape hatch)',G.nRoleNoun.length === 0, JSON.stringify(G.nRoleNoun));
  t('G2 null / empty / non-string values never throw',                   Array.isArray(G.nEmpty) && G.nEmpty.length === 0, JSON.stringify(G.nEmpty));

  await page.close();
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// PART H — SOLO-STAGE INTERACTION VALIDATOR (pure)
// IDENTITY and PRESENCE are different checks. Rounds 7 and 8 invented no name and still put a
// second person in a one-person scene. The discriminator is CONTEMPORANEITY: a second person may
// be remembered, anticipated, written to and feared; they may not speak, act or arrive HERE.
// The ALLOW cases carry the weight — a validator that rejects memory is worse than no validator.
// ════════════════════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(92)}\nPART H — SOLO-STAGE INTERACTION (pure)\n${'═'.repeat(92)}\n`);
{
  const page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: APP }));
  await page.route('**/api/**', route => PASSTHROUGH.test(route.request().url()) ? route.continue() : route.abort());
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window.state && window._validateSoloStageInteraction, { timeout:120000 });

  const H = await page.evaluate(() => {
    const V = window._validateSoloStageInteraction;
    const chk = (text, field) => {
      const r = V({ [field || 'scene_mission']: text }, { narrator:'Lirael' });
      return { ok:r.ok, codes:r.violations.map(v => v.code), texts:r.violations.map(v => v.text) };
    };
    return {
      // ── MUST REJECT — the two live leaks, then the rest of the class ──
      r_rival:    chk('keep the ledger unopened until the rival finishes speaking'),
      r_rival2:   chk('Preserve the ledger before the rival finishes speaking'),
      r_clerk:    chk('a clerk calls from outside the door'),
      r_voice:    chk('a voice outside the door rises as she works', 'reader_state'),
      r_voice2:   chk("a rival's voice cuts through the hall"),
      r_denounce: chk('Lirael is alone in the loft while a rival denounces her lineage', 'reader_state'),
      r_message:  chk('a message arrives as she reaches the vault'),
      r_call:     chk('she answers the call before the tide turns'),
      r_guard:    chk('convince the guard to let her pass'),
      r_wait:     chk('wait for the messenger to bring the seal'),
      r_body:     chk('the witness stands in the doorway and watches her'),
      r_someone:  chk('someone moves in the corridor behind her'),

      // ── round 9: the three the validator missed on live output ──
      r_readerVoice: chk("the reader's voice stumbles on the same syllable my pulse stutters on"),
      r_passive:     chk('the accusation is being read aloud as she walks in'),
      r_unseen:      chk('the accusation is being read aloud by an unseen voice, no one else is in the room', 'reader_state'),

      // ── MUST ALLOW — memory, anticipation, documents, environment ──
      a_memory:   chk('she remembers Julian setting the pen down with both hands'),
      a_thinks:   chk("why Julian's name keeps surfacing in her thoughts under pressure", 'reader_state'),
      a_prepare:  chk('prepare what she will say to Julian when he comes to collect the debt'),
      a_future:   chk('get the ledger to the vault before Julian arrives'),
      a_letter:   chk('an old letter from Julian, folded twice, still in the ledger'),
      a_wind:     chk('wind moves through the leaded glass and the candle stubs gutter'),
      a_sound:    chk('the building settles and something rattles in the flue'),
      a_narrator: chk('Lirael speaks the oath aloud to steady her hands'),
      a_selfvoice:chk('she hears her own voice crack on the second line'),
      a_stakes:   chk('the guild will strip her name if the ledger is opened'),
      a_object:   chk('the wax-sealed ledger, the ceremonial table, the melted candle stubs', 'environment_elements'),
      a_solowant: chk('wants the ledger to stay intact until she can get it to the vault', 'scene_want'),
      a_liBeat:   chk('beat 2: she catches herself remembering how Julian answered the wrong question', 'li_texture_beat'),
      // negative controls for the two frames added after round 9
      a_ledgerRead: chk('the ledger is read only by the guild, and only once a year'),
      a_ownVoicePos:chk("her own voice is the only sound in the loft"),
      a_wasWritten: chk('the charge was written in a hand she does not recognise'),
      a_isSealed:   chk('the parchment is sealed and was never opened'),

      // shape of a finding
      shape: V({ scene_mission:'keep it shut until the rival finishes speaking' }, { narrator:'Lirael' }).violations[0] || null,
      // purity: identical input, identical output, and the input is not mutated
      pure: (function () {
        const inp = { scene_mission:'a clerk calls from outside' };
        const a = JSON.stringify(V(inp, { narrator:'Lirael' }));
        const b = JSON.stringify(V(inp, { narrator:'Lirael' }));
        return { same:a === b, untouched: inp.scene_mission === 'a clerk calls from outside' };
      })(),
    };
  });

  const REJECT = [
    ['H1 "the rival finishes speaking" is rejected',            'r_rival'],
    ['H1 …and again inside a mission sentence',                 'r_rival2'],
    ['H1 "a clerk calls from outside" is rejected',             'r_clerk'],
    ['H1 an unnamed voice outside the door is rejected',        'r_voice'],
    ['H1 "a rival\'s voice cuts through the hall" is rejected', 'r_voice2'],
    ['H1 a rival denouncing her mid-scene is rejected',         'r_denounce'],
    ['H1 a live message arriving is rejected',                  'r_message'],
    ['H1 answering a live call is rejected',                    'r_call'],
    ['H1 "convince the guard" is rejected',                     'r_guard'],
    ['H1 "wait for the messenger" is rejected',                 'r_wait'],
    ['H1 a second body acting in the room is rejected',         'r_body'],
    ['H1 "someone moves in the corridor" is rejected',          'r_someone'],
    ["H1 round 9: \"the reader's voice stumbles\" is rejected",   'r_readerVoice'],
    ['H1 round 9: PASSIVE "is being read aloud" is rejected',   'r_passive'],
    ['H1 round 9: "read aloud by an unseen voice" is rejected',  'r_unseen'],
  ];
  for (const [label, key] of REJECT) {
    t(label, H[key] && H[key].ok === false, JSON.stringify(H[key]));
  }
  const ALLOW = [
    ['H2 a MEMORY of Julian is allowed',                        'a_memory'],
    ['H2 THINKING about Julian is allowed',                     'a_thinks'],
    ['H2 PREPARING to meet Julian later is allowed',            'a_prepare'],
    ['H2 anticipating Julian arriving later is allowed',        'a_future'],
    ['H2 an OLD LETTER from Julian is allowed',                 'a_letter'],
    ['H2 wind and environmental sound are allowed',             'a_wind'],
    ['H2 the building settling is allowed',                     'a_sound'],
    ['H2 the NARRATOR speaking is allowed',                     'a_narrator'],
    ['H2 the narrator hearing her OWN voice is allowed',        'a_selfvoice'],
    ['H2 established offstage STAKES are allowed',              'a_stakes'],
    ['H2 an environment inventory is allowed',                  'a_object'],
    ['H2 the round-8 solo want is allowed',                     'a_solowant'],
    ['H2 li_texture_beat is contractually a memory, allowed',   'a_liBeat'],
    ['H2 "the ledger is read only by the guild" is allowed',    'a_ledgerRead'],
    ['H2 the narrator\'s OWN voice as the only sound is allowed','a_ownVoicePos'],
    ['H2 "was written in a hand she does not recognise" allowed','a_wasWritten'],
    ['H2 "is sealed and was never opened" is allowed',          'a_isSealed'],
  ];
  for (const [label, key] of ALLOW) {
    t(label, H[key] && H[key].ok === true, JSON.stringify(H[key]));
  }
  t('H3 a finding carries code + frame + verbatim text + path',
    H.shape && H.shape.code === 'SOLO_VOICE' && typeof H.shape.frame === 'string' && H.shape.frame.length > 8
      && typeof H.shape.text === 'string' && H.shape.text.length > 0 && H.shape.path === 'scene_mission',
    JSON.stringify(H.shape));
  t('H3 the validator is PURE — repeatable, and it never rewrites its input',
    H.pure && H.pure.same && H.pure.untouched, JSON.stringify(H.pure));

  await page.close();
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// PART I — THE THREE VALIDATOR DEFECTS THE PAID RUN EXPOSED (pure)
// A real planner draw produced correct cast, correct setting and scenery quoted from the seed,
// and was thrown away by three over-strict checks. These pin the corrections AND the limits:
// the negative controls matter more than the positives, because a loosened validator that stops
// rejecting real faults is worse than the brittleness it replaced.
// ════════════════════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(92)}\nPART I — GROUNDING · ANGLE · FUSION (pure)\n${'═'.repeat(92)}\n`);
{
  const page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: APP }));
  await page.route('**/api/**', route => PASSTHROUGH.test(route.request().url()) ? route.continue() : route.abort());
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window._targetInSceneDetail && window._validateFusionConcreteness && window._tokEquivalent, { timeout:120000 });

  const I = await page.evaluate(() => {
    const G = window._targetInSceneDetail, A = window._validateAngleConcreteness,
          F = window._validateFusionConcreteness, EQ = window._tokEquivalent;
    // the seed's own scenery, verbatim from the paid run
    const WHERE = 'Dawn in a Veilwood ceremony clearing: the long white weeping-willow veil-canopy drapes down '
      + 'from the pale mated-pair trees, the floor a deep-crimson carpet of braided mated-pair spiralgrass; '
      + 'roughly two dozen First Favored assembled, barefoot in gossamer Veilweave.';
    const REAL_TARGET = 'the long white weeping-willow veil-canopy draping down from the pale mated-pair trees';
    return {
      // ── 1 GROUNDING ──
      gReal:      G(REAL_TARGET, WHERE),
      gPlural:    G('the mated-pair trees', WHERE),
      gExact:     G('the deep-crimson carpet of braided mated-pair spiralgrass', WHERE),
      gHyphen:    G('THE  Weeping   Willow, veil-canopy!', WHERE),
      gUnrelated: G('a brass lamp on an oak lectern', WHERE),
      gPartial:   G('the gallery hallway', WHERE),
      gShortTok:  G('the ash urn', WHERE),
      gTwoMiss:   G('the long white weeping-willow veil-canopy draping sideways from pale glass trees', WHERE),
      gShortAll:  G('brass lantern', WHERE),
      // morphology unit checks
      eqDrape:    EQ('drapes', 'draping'),
      eqCanopy:   EQ('canopies', 'canopy'),
      eqDropped:  EQ('dropping', 'drops'),
      eqShort:    EQ('ash', 'ashes'),
      eqUnrel1:   EQ('trees', 'treat'),
      eqUnrel2:   EQ('drape', 'drapery'),
      eqUnrel3:   EQ('veil', 'vein'),
      // ── 2 C+ ANGLE ──
      aReal:      A('kneels with Veilweave gown catching the light, her throat bare and vulnerable', 'Seren'),
      aAbstract:  A('clinging to the illusion of worthiness', 'Seren'),
      aBareTrait: A('a proud woman who is afraid', 'Seren'),
      aActAdj:    A('sets the ledger down twice, hands unsteady and ashamed', 'Lirael'),
      aRescue:    A('the weight of her longing for what she cannot name', 'Lirael'),
      aClean:     A('adjusts the ceremonial cloth with deliberate slowness', 'Lirael'),
      aThin:      A('is sad', 'Lirael'),
      // ── 3 FUSION ──
      fReal:      F("lets her fingers trail along the veil's edge, feeling the weight of the ritual she is supposed to uphold", 'Lirael', 'the long white weeping-willow veil-canopy'),
      fFeelOnly:  F('feels the weight of the ritual she is supposed to uphold', 'Lirael', 'the long white weeping-willow veil-canopy'),
      fNotice:    F('notices the veil-canopy shifting in the dawn light above her', 'Lirael', 'the long white weeping-willow veil-canopy'),
      fThink:     F('thinks about the veil-canopy and what it cost to grow it', 'Lirael', 'the long white weeping-willow veil-canopy'),
      fWrongObj:  F('presses her palm flat against the ceremonial table to steady herself', 'Lirael', 'the long white weeping-willow veil-canopy'),
      fNoWho:     F('grips the veil-canopy hem until the leaf-curtain gives way', '', 'the long white weeping-willow veil-canopy'),
      fNamed:     F('Lirael grips the veil-canopy hem until the leaf-curtain gives', 'Lirael', 'the long white weeping-willow veil-canopy'),
    };
  });

  // ── 1 GROUNDING ──
  t('I1 the REAL paid-run target now grounds (drapes ↔ draping)',
    I.gReal.ok === true, JSON.stringify(I.gReal));
  t('I1 …and it matched cleanly, NOT via the tolerance path',
    I.gReal.ok === true && I.gReal.tolerance === false && I.gReal.missing.length === 0, JSON.stringify(I.gReal));
  t('I1 simple plural behaviour still works',            I.gPlural.ok === true, JSON.stringify(I.gPlural));
  t('I1 an exact multi-token target still works',        I.gExact.ok === true, JSON.stringify(I.gExact));
  t('I1 case / punctuation / hyphen normalisation kept', I.gHyphen.ok === true, JSON.stringify(I.gHyphen));
  t('I1 an UNRELATED target still fails',                I.gUnrelated.ok === false, JSON.stringify(I.gUnrelated));
  t('I1 a partial-word target ("gallery hallway") still fails', I.gPartial.ok === false, JSON.stringify(I.gPartial));
  t('I1 a short unrelated token cannot sneak in',        I.gShortTok.ok === false, JSON.stringify(I.gShortTok));
  t('I1 TWO unmatched tokens still fail (tolerance is one)', I.gTwoMiss.ok === false, JSON.stringify(I.gTwoMiss));
  t('I1 a SHORT target must match completely (no tolerance)', I.gShortAll.ok === false, JSON.stringify(I.gShortAll));
  t('I1 morphology: drapes↔draping, canopies↔canopy, dropping↔drops',
    I.eqDrape && I.eqCanopy && I.eqDropped, JSON.stringify([I.eqDrape, I.eqCanopy, I.eqDropped]));
  t('I1 morphology: short tokens exact-only (ash ≠ ashes)', I.eqShort === false, String(I.eqShort));
  t('I1 morphology: unrelated roots do NOT match',
    !I.eqUnrel1 && !I.eqUnrel2 && !I.eqUnrel3, JSON.stringify([I.eqUnrel1, I.eqUnrel2, I.eqUnrel3]));

  // ── 2 C+ ANGLE ──
  t('I2 the REAL rejected angle now passes',
    I.aReal.ok === true && I.aReal.code === 'OK_CONCRETE', JSON.stringify(I.aReal));
  t('I2 …and it logs WHICH concrete frame carried it',
    !!I.aReal.frame && !!I.aReal.frameMatch && I.aReal.diagnosisTerm === 'vulnerable',
    JSON.stringify({ frame: I.aReal.frame, match: I.aReal.frameMatch, term: I.aReal.diagnosisTerm }));
  t('I2 "clinging to the illusion of worthiness" still FAILS',
    I.aAbstract.ok === false && I.aAbstract.code === 'DIAGNOSIS', JSON.stringify(I.aAbstract));
  t('I2 a bare trait/diagnosis still FAILS',
    I.aBareTrait.ok === false, JSON.stringify(I.aBareTrait));
  t('I2 concrete action + short interpretive adjective PASSES',
    I.aActAdj.ok === true && I.aActAdj.code === 'OK_CONCRETE', JSON.stringify(I.aActAdj));
  t('I2 a diagnosis word CANNOT rescue an otherwise abstract angle',
    I.aRescue.ok === false, JSON.stringify(I.aRescue));
  t('I2 a clean angle is unaffected (still plain OK)',
    I.aClean.ok === true && I.aClean.code === 'OK', JSON.stringify(I.aClean));
  t('I2 a thin angle still FAILS', I.aThin.ok === false, JSON.stringify(I.aThin));

  // ── 3 FUSION ──
  t('I3 the REAL rejected fusion now passes (interaction + interpretive tail)',
    I.fReal.ok === true && !!I.fReal.contact, JSON.stringify(I.fReal));
  t('I3 "feels the weight of the ritual" alone FAILS',
    I.fFeelOnly.ok === false && I.fFeelOnly.code === 'PERCEPTION_ONLY', JSON.stringify(I.fFeelOnly));
  t('I3 merely NOTICING the target FAILS',
    I.fNotice.ok === false, JSON.stringify(I.fNotice));
  t('I3 merely THINKING about the target FAILS',
    I.fThink.ok === false, JSON.stringify(I.fThink));
  t('I3 physical interaction with an UNRELATED object FAILS',
    I.fWrongObj.ok === false && I.fWrongObj.code === 'TARGET_ABSENT', JSON.stringify(I.fWrongObj));
  t('I3 a beat with no identifiable actor FAILS',
    I.fNoWho.ok === false && I.fNoWho.code === 'CHARACTER_ABSENT', JSON.stringify(I.fNoWho));
  t('I3 the assigned character named explicitly also passes',
    I.fNamed.ok === true, JSON.stringify(I.fNamed));

  await page.close();
}

await browser.close();
console.log(`\n${'─'.repeat(92)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
