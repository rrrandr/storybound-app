// C+ PROMPT DOCTRINE — free, network-fenced. PROMPT BYTES, not intentions.
//
// The doctrine change these pin: PHYSICAL PRESENCE GOVERNS STAGING, NOT C+ ELIGIBILITY.
// The planner prompt said the opposite in as many words ("KNOWN BUT NOT PRESENT … INELIGIBLE
// for character_plus", one entry per IN_PERSON body). Two claims have to survive contact with
// the real builder, and neither can be proved by the First Sacrifice seed as authored — it
// stages everyone it names. So the seed is mutated IN THE PAGE to add the two shapes the
// doctrine turns on, and restored after:
//
//   HALVERN — a cast member the opening does NOT stage, whom sceneOne.aboutToHappen names.
//             The Waldorf concierge shape. He must be OFFERED a C+ and must NEVER be staged.
//   KLAUS   — a cast member nothing in the scene mentions. Membership is not an opportunity.
//             He must be offered nothing, and a beat assigned to him must be REJECTED.
//
// usage: node _cplus_prompt_doctrine.mjs
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
const APP = instrument(force(force(SRC, '_litLiteActive', 'false'), '_hotFastActive', 'false'));
const PROSE = buildScene1Prose(NONTOKEN_A);
const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 } };
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/;
const L = 'she understands the wish has already begun to cost her something she cannot name';
const GENERIC = { goal:L, antagonistOrAntiForce:'the assembly', milestones:[], scenes:[], timelineLength:20,
  characters:[], name:'Julian', distinguishing_feature:'a burn scar', private_hope:L,
  defining_anecdote:L, attraction_manifestation:L, desire_register_exemplars:[L] };

const HALVERN_FACET = 'halvern_arrives_before_he_is_called';
const KLAUS_FACET   = 'klaus_keeps_the_ledger_himself';

// ── the plan, built FROM the dispatched prompt so the harness never hard-codes a roster ──
const READS = {
  Julian: { behavior:`keeps his eyes on the exit line for the whole rite`,
            psychological_read:`he has already decided he will be blamed for this, and is choosing where he will be standing when it happens` },
  Seren:  { behavior:`checks the faces in the crowd twice before she kneels`,
            psychological_read:`she expected approving smiles and cannot begin until she has counted them; the empathy is real and it needs an audience` },
  'the presiding Dohkar':
          { behavior:`says the liturgy's final clause a half-beat faster than the rest`,
            psychological_read:`he cannot be bothered to pretend the ceremony deserves his attention, and has performed it often enough to know nobody checks` },
};
const FACET = { Julian:'julian_status_without_display', Seren:'seren_goodness_needs_witness',
                'the presiding Dohkar':'presiding_dohkar_ritual_contempt' };

function plannerReply(usr, mutate) {
  const m = usr.match(/STAGED ROSTER — PHYSICALLY ON STAGE \((\d+)\)[^\n]*\n([\s\S]*?)\nThese are the only people/);
  const cast = m ? m[2].split('\n').filter(x => /^\s*•\s/.test(x)).map(x => x.replace(/^\s*•\s*/, '').trim()).filter(Boolean) : [];
  const PCN = cast[0];
  const ANCHOR = 'the spiralgrass';
  const POF_BEAT = `my thumb finds ${ANCHOR} where the rite has worn it smooth, and my rehearsed steadiness feels newly counterfeit`;
  const spine = { pressure_source_type:'institutional', pressure_source:L, hook_object:'the band',
    opening_beat:'She sets the relic down', rising_beats:['a','b'], decision_beat:'Does she name it',
    pc_career:'shrine witness', opening_setting:'a Veilwood ceremony clearing',
    li_texture_beat:'He crosses toward her', pc_wound_anchor:L,
    pc_self_presentation_beat:'decision', scene_want:SCENE_WANT, scene_mission:L,
    reader_state:{ knows:L, believes:L, wondering:L, must_not_confuse:L },
    pc_body_callback:'decision', li_body_callback:'opening', antagonist_body_callback:null,
    perceptual_signature_beat:L,
    interlocutor_placement:'The Dohkar stands between',
    staged_characters: cast.map(n => ({ name:n, presence:'IN_PERSON',
      anchor_beat: n === PCN ? 'FROM_PC_OPENING_FUSION' : 'FROM_CHARACTER_PLUS' })) };
  let cp = cast.filter(n => n !== PCN).map(n => ({ character:n, mode:'IN_PERSON', first_mention:true,
    ...(FACET[n] ? { facet_id:FACET[n] } : {}), ...READS[n] }));

  // THE CLAIM: an absent candidate receives a C+ and is NOT added to staged_characters.
  if (mutate === 'absentAssign') cp = cp.concat([{ character:'Halvern', mode:'ANTICIPATED',
    facet_id:HALVERN_FACET, first_mention:true,
    behavior:'will already be standing at the edge of the clearing when the assembly is called, having come on his own',
    psychological_read:'he treats being summoned as a discourtesy he can spare everyone by never needing to be summoned' }]);
  // The same beat, plus the mistake the rule forbids: materialising him into the room.
  if (mutate === 'absentMaterialised') {
    cp = cp.concat([{ character:'Halvern', mode:'ANTICIPATED', facet_id:HALVERN_FACET, first_mention:true,
      behavior:'will already be standing at the edge of the clearing when the assembly is called, having come on his own',
      psychological_read:'he treats being summoned as a discourtesy he can spare everyone by never needing to be summoned' }]);
    spine.staged_characters = spine.staged_characters.concat([{ name:'Halvern', presence:'IN_PERSON', anchor_beat:'FROM_CHARACTER_PLUS' }]);
  }
  // …and the person this scene never mentions stays ineligible however well-formed the entry is.
  if (mutate === 'unmentionedAssign') cp = cp.concat([{ character:'Klaus', mode:'REPORTED',
    facet_id:KLAUS_FACET, first_mention:true,
    behavior:'is said to have copied the tally himself rather than let a clerk touch it',
    psychological_read:'he trusts no record he did not make with his own hand, and would rather be thought petty than be surprised' }]);
  // An absent candidate given the one mode that would put him in the room.
  if (mutate === 'absentInPerson') cp = cp.concat([{ character:'Halvern', mode:'IN_PERSON',
    facet_id:HALVERN_FACET, first_mention:true,
    behavior:'stands at the edge of the clearing with his hands behind him',
    psychological_read:'he treats being summoned as a discourtesy he can spare everyone by never needing to be summoned' }]);

  const skel = { character_plus:cp,
    environment_plus:{ target:ANCHOR, axis:'ritual',
      beat:`${ANCHOR} is worn smooth along one edge where the rite has been performed the same way for generations` },
    fusion:{ character:PCN, target:ANCHOR, beat:`she sets her palm flat on ${ANCHOR} to keep it still` },
    pc_opening_fusion:{ character:PCN, placement:'PC_FIRST_EMBODIED_BEAT',
      character_angle:'rehearsed steadiness that does not survive contact',
      environment_target:ANCHOR, environment_axis:'ritual', beat:POF_BEAT } };
  return JSON.stringify({ opening_spine: spine, scene_skeleton: skel });
}

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

async function run(mutate) {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
  const planner = [], author = [], logs = [];
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: APP }));
  await page.route('**/api/**', async route => {
    const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (PASSTHROUGH.test(url)) return route.continue();
    const k = Object.keys(LOCAL).find(x => url.startsWith(x));
    if (k) return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(LOCAL[k]) });
    let b=null; try { b = JSON.parse(route.request().postData()||'{}'); } catch(_){}
    if (!MODEL.test(url)) return route.abort();
    const msgs=(b&&b.messages)||[];
    const sys=String((msgs.find(x=>x.role==='system')||{}).content||'');
    const usr=String((msgs.find(x=>x.role==='user')||{}).content||'');
    let out;
    if (/ARCHITECTURE LAWS/.test(sys)) { author.push({ system:sys, user:usr }); out = PROSE; }
    else if (/scene-structure planner for the OPENING scene/.test(sys)) {
      planner.push({ user: usr }); out = plannerReply(usr, mutate);
    } else out = JSON.stringify(GENERIC);
    const envelope = /mistral-proxy/.test(url)
      ? { id:'mock', object:'chat.completion', model:b.model, usage:{}, _orchestration:{},
          choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content: out } }] }
      : { ok:true, content: out, choices:[{ message:{ content: out } }] };
    return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(envelope) });
  });
  page.on('console', m => { const x=m.text(); if (/SCENE1:|SKELETON|PLANNER|CPLUS/.test(x)) logs.push(x.slice(0,240)); });
  page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0,200)));

  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_SEEDS, { timeout:120000 });
  const res = await page.evaluate(async ({ HALVERN_FACET, KLAUS_FACET }) => {
    const s = window.state;
    // ── THE TWO SHAPES THE AUTHORED SEED DOES NOT CONTAIN ──
    const seed = window.STARTER_SEEDS.starter_first_sacrifice;
    const keptCast = seed.cast.slice();
    const keptAbout = seed.sceneOne.aboutToHappen;
    seed.cast = seed.cast.concat([
      { role:'witness', name:'Halvern', nameLock:true, species:'First Favored', castingTier:2,
        bio:'A senior witness the clearing expects but has not yet seen.',
        cPlusFacets:[{ facet_id:HALVERN_FACET, category:'habit',
          canonical_truth:'He arrives before he is sent for, because being sent for would mean someone had to decide he was needed.',
          possible_pressures:['a gathering that has not formally begun'] }] },
      { role:'witness', name:'Klaus', nameLock:true, species:'First Favored', castingTier:2,
        bio:'A record-keeper elsewhere in the Veilwood.',
        cPlusFacets:[{ facet_id:KLAUS_FACET, category:'habit',
          canonical_truth:'He copies every tally himself rather than let a clerk touch it, and would rather be thought petty than be surprised.',
          possible_pressures:['a record someone else has handled'] }] },
    ]);
    // Halvern is NAMED by what is about to happen, and staged by nothing. Klaus is named nowhere.
    seed.sceneOne.aboutToHappen = keptAbout + ' Halvern will be sent for if the rite is disputed.';

    const def = (window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
    s.picks = s.picks||{};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>{ s.picks[k]=def[k]; });
    Object.assign(s,{ world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
      archetype:{primary:def.archetype,modifier:null},
      name:'Lirael', playerName:'Lirael', loveInterestName:'Julian', partnerName:'Julian', loveInterest:'Male',
      liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true,
      fortunes:9999999, intensity:'Steamy', pov:'first_person', identity:{playerName:'Lirael',partnerName:'Julian'},
      renderMode:'literary', currentEngine:'literary', storyId:'cplusdoc', myUid:'probe',
      _starterId: def.id, is_starter_story: true, immutableTitle: def.title });
    s.picks.identity = s.identity; s._skipCorridorValidation = true;
    let threw = null;
    try { await Promise.race([window.handleBeginStory(), new Promise(x=>setTimeout(x,120000))]); }
    catch(e){ threw = String(e && e.message); }
    s._skipCorridorValidation = false;
    const out = { threw,
      candidates: s._scene1CPlusCandidates || null,
      staged: (s._scene1StagedCharacters || []).map(c => c && c.name),
      cp: s.sceneSkeleton ? (s.sceneSkeleton.character_plus || []).map(c => ({ character:c.character, mode:c.mode, facet_id:c.facet_id })) : null };
    seed.cast = keptCast; seed.sceneOne.aboutToHappen = keptAbout;
    return out;
  }, { HALVERN_FACET, KLAUS_FACET });
  await browser.close();
  return { planner, author, logs, ...res };
}

console.log(`\n${'═'.repeat(88)}\nC+ PROMPT DOCTRINE — presence governs staging, not eligibility\n${'═'.repeat(88)}\n`);

const B = await run(null);
const pu = (B.planner[0] || {}).user || '';

console.log(' 1 · THE DISPATCHED BYTES');
t('1a: the planner request carries a CHARACTER+ CANDIDATES block',
  /CHARACTER\+ CANDIDATES \(\d+\)/.test(pu), (pu.match(/CHARACTER\+ CANDIDATES.{0,80}/) || ['(missing)'])[0]);
t('1b: an ABSENT person is offered as a candidate — presence is not the qualification',
  /•\s*Halvern/.test(pu) && /CHARACTER\+ CANDIDATES[\s\S]*?•\s*Halvern/.test(pu),
  (pu.match(/CHARACTER\+ CANDIDATES[\s\S]{0,600}/) || ['(missing)'])[0].slice(0, 400));
t('1c: …offered in ANTICIPATED mode, the opportunity the scene actually gives him',
  /•\s*Halvern\n\s+modes permitted: ANTICIPATED/.test(pu),
  (pu.match(/•\s*Halvern[\s\S]{0,200}/) || ['(missing)'])[0]);
t('1d: …with his authored facet id, and the evidence that makes the opportunity honest',
  new RegExp(HALVERN_FACET).test(pu) && /Halvern will be sent for if the rite is/.test(pu)
    && !/\brite is dispute\b/.test(pu),                     // …and the quotation is not cut mid-word
  (pu.match(/•\s*Halvern[\s\S]{0,320}/) || ['(missing)'])[0]);
t('1e: he is NOT in the prefilled staged_characters array',
  !/\{ "name": "Halvern"/.test(pu), (pu.match(/.{0,60}"name": "Halvern".{0,60}/) || ['(absent, correct)'])[0]);
t('1f: the unmentioned roster member is listed as NOT a candidate',
  /NOT CANDIDATES[\s\S]{0,200}•\s*Klaus/.test(pu),
  (pu.match(/NOT CANDIDATES[\s\S]{0,200}/) || ['(missing)'])[0]);
t('1g: …and he is not among the permitted labels',
  !new RegExp('EXACTLY one of:[^\\n]*Klaus').test(pu),
  (pu.match(/EXACTLY one of:[^\n]{0,200}/) || ['(missing)'])[0]);
t('1h: Klaus carries a facet and is STILL not a candidate — the mention is what he lacks',
  !new RegExp(KLAUS_FACET).test(pu),
  'a facet must never by itself make someone eligible; the scene has to give them an opportunity');

console.log('\n 2 · THE SELECTOR THE PROMPT WAS BUILT FROM');
t('2a: the candidate list the validator reads is the one the prompt rendered',
  !!B.candidates && !!B.candidates.byLabel && !!B.candidates.byLabel['halvern'],
  JSON.stringify(B.candidates && Object.keys(B.candidates.byLabel || {})));
t('2b: Halvern is marked as NOT physically present',
  B.candidates.byLabel['halvern'].presenceStated === false
    && B.candidates.byLabel['halvern'].modes.join('|') === 'ANTICIPATED',
  JSON.stringify(B.candidates.byLabel['halvern']));
t('2c: Klaus was declined for want of an opportunity, not for want of a facet',
  (B.candidates.declined || []).some(d => d.label === 'Klaus' && /membership is not an opportunity/.test(d.reason)),
  JSON.stringify(B.candidates.declined));
t('2d: the story is in the facet-gated regime, so citations are enforced',
  B.candidates.facetRegime === 'facet-gated', JSON.stringify(B.candidates.facetRegime));
t('2e: baseline plan is accepted and reaches the author',
  B.author.length === 1 && !B.logs.some(l => /SCENE1:ABORT/.test(l)),
  `author=${B.author.length} ` + B.logs.filter(l=>/INVALID|ABORT/.test(l)).slice(0,1).join(''));

console.log('\n 3 · AN ABSENT CANDIDATE MAY RECEIVE C+ AND STAY ABSENT');
const A = await run('absentAssign');
t('3a: the plan is ACCEPTED with a C+ assigned to someone who is not in the room',
  A.author.length === 1 && !A.logs.some(l => /SCENE1:ABORT/.test(l)),
  `author=${A.author.length} ` + A.logs.filter(l=>/INVALID|ABORT/.test(l)).slice(0,2).join(' | '));
t('3b: …the assignment survives delivery with its mode and facet citations intact',
  (A.cp || []).some(c => c.character === 'Halvern' && c.mode === 'ANTICIPATED' && c.facet_id === HALVERN_FACET),
  JSON.stringify(A.cp));
t('3c: …and he is STILL not staged — a C+ is a reading, never an entrance',
  !(A.staged || []).includes('Halvern'), JSON.stringify(A.staged));

console.log('\n 4 · THE THINGS THAT MUST STILL BE REFUSED');
for (const [mutate, label] of [
  ['unmentionedAssign', 'a roster member this scene never mentions is ineligible however well-formed the beat'],
  ['absentInPerson',    'an absent candidate given IN_PERSON mode would materialise them'],
  ['absentMaterialised','an absent recipient added to staged_characters is a fixed-cast edit'],
]) {
  const R = await run(mutate);
  const flagged = R.logs.some(l => /SCENE1:SKELETON:INVALID|SCENE1:STAGED:INVALID|SCENE1:PLANNER:UNRECOVERABLE/.test(l))
               && R.logs.some(l => /SCENE1:ABORT/.test(l));
  t(`4 "${mutate}" — ${label}`, flagged && R.author.length === 0,
    `flagged=${flagged} author=${R.author.length} ` + R.logs.filter(l=>/INVALID|ABORT/.test(l)).slice(0,2).join(' | '));
}

console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
