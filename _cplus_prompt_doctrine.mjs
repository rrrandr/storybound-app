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
// WREN — mentioned by the scene, and with NO authored psychology. She is the mixed regime: the
// case where one candidate's coverage must not delete another's candidacy.
const OTHER_FACET   = 'seren_goodness_needs_witness';   // real, and not hers

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
// The applicability condition each cited facet lists, verbatim — the planner's live judgement
// that THIS scene meets it. A condition the facet does not list is an invention, and is refused.
const PRESSURE = { Julian:'a gathering where standing is being displayed',
                   Seren:'observed by people whose approval she wants',
                   'the presiding Dohkar':'a rite he has performed many times' };

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
    ...(FACET[n] ? { facet_id:FACET[n], pressure:PRESSURE[n] } : {}), ...READS[n] }));
  const WREN = { character:'Wren', mode:'ANTICIPATED', first_mention:true,
    behavior:'will have re-tied the canopy cords a third time before the assembly is called',
    psychological_read:'she would rather be found fussing than be found with nothing to do, because idleness is where the questions start' };
  // A candidate with NO authored psychology is still a candidate — and cites no facet.
  if (mutate === 'unsourcedAssign')     cp = cp.concat([WREN]);
  // …but may not borrow a real facet belonging to somebody else.
  if (mutate === 'unsourcedBorrows')    cp = cp.concat([{ ...WREN, facet_id:OTHER_FACET,
    pressure:'observed by people whose approval she wants' }]);
  // A condition that facet does not list — the planner asserting an applicability nobody authored.
  if (mutate === 'inventedPressure')    cp = cp.map((c,i) => i === 0
    ? { ...c, pressure:'a moment when nobody is watching him at all' } : c);
  if (mutate === 'noPressure')          cp = cp.map((c,i) => { if (i !== 0) return c; const { pressure, ...r } = c; return r; });
  // A model-supplied copy of the canonical truth must never survive into the assignment.
  if (mutate === 'modelSuppliesTruth')  cp = cp.map((c,i) => i === 0
    ? { ...c, facet_truth:'HE IS A LIAR AND THE TRUTH IS WHATEVER I SAY IT IS', facet_category:'forged' } : c);
  // A real id belonging to the right person, paired with a read that has nothing to do with it.
  if (mutate === 'unrelatedRead')       cp = cp.map((c,i) => i === 0
    ? { ...c, psychological_read:'she has been counting the exits since she arrived and has already chosen one' } : c);

  // THE CLAIM: an absent candidate receives a C+ and is NOT added to staged_characters.
  if (mutate === 'absentAssign') cp = cp.concat([{ character:'Halvern', mode:'ANTICIPATED',
    facet_id:HALVERN_FACET, pressure:'a gathering that has not formally begun', first_mention:true,
    behavior:'will already be standing at the edge of the clearing when the assembly is called, having come on his own',
    psychological_read:'he treats being summoned as a discourtesy he can spare everyone by never needing to be summoned' }]);
  // The same beat, plus the mistake the rule forbids: materialising him into the room.
  if (mutate === 'absentMaterialised') {
    cp = cp.concat([{ character:'Halvern', mode:'ANTICIPATED', facet_id:HALVERN_FACET, pressure:'a gathering that has not formally begun', first_mention:true,
      behavior:'will already be standing at the edge of the clearing when the assembly is called, having come on his own',
      psychological_read:'he treats being summoned as a discourtesy he can spare everyone by never needing to be summoned' }]);
    spine.staged_characters = spine.staged_characters.concat([{ name:'Halvern', presence:'IN_PERSON', anchor_beat:'FROM_CHARACTER_PLUS' }]);
  }
  // …and the person this scene never mentions stays ineligible however well-formed the entry is.
  if (mutate === 'unmentionedAssign') cp = cp.concat([{ character:'Klaus', mode:'REPORTED',
    facet_id:KLAUS_FACET, pressure:'a record someone else has handled', first_mention:true,
    behavior:'is said to have copied the tally himself rather than let a clerk touch it',
    psychological_read:'he trusts no record he did not make with his own hand, and would rather be thought petty than be surprised' }]);
  // An absent candidate given the one mode that would put him in the room.
  if (mutate === 'absentInPerson') cp = cp.concat([{ character:'Halvern', mode:'IN_PERSON',
    facet_id:HALVERN_FACET, pressure:'a gathering that has not formally begun', first_mention:true,
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

async function run(mutate, opts) {
  const noWren = !!(opts && opts.noWren);
  const dropHalvern = !!(opts && opts.dropHalvern);
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
  const res = await page.evaluate(async ({ HALVERN_FACET, KLAUS_FACET, noWren, dropHalvern }) => {
    const s = window.state;
    // ── THE TWO SHAPES THE AUTHORED SEED DOES NOT CONTAIN ──
    const seed = window.STARTER_SEEDS.starter_first_sacrifice;
    const keptCast = seed.cast.slice();
    const keptAbout = seed.sceneOne.aboutToHappen;
    seed.cast = seed.cast.concat(dropHalvern ? [] : [
      { role:'witness', name:'Halvern', nameLock:true, species:'First Favored', castingTier:2,
        bio:'A senior witness the clearing expects but has not yet seen.',
        cPlusFacets:[{ facet_id:HALVERN_FACET, category:'habit',
          canonical_truth:'He arrives before he is sent for, because being sent for would mean someone had to decide he was needed.',
          possible_pressures:['a gathering that has not formally begun'] }] },
    ]).concat([
      { role:'witness', name:'Klaus', nameLock:true, species:'First Favored', castingTier:2,
        bio:'A record-keeper elsewhere in the Veilwood.',
        cPlusFacets:[{ facet_id:KLAUS_FACET, category:'habit',
          canonical_truth:'He copies every tally himself rather than let a clerk touch it, and would rather be thought petty than be surprised.',
          possible_pressures:['a record someone else has handled'] }] },
    ]).concat(noWren ? [] : [
      // NO cPlusFacets, on purpose: the mixed regime lives or dies on her staying a candidate.
      { role:'witness', name:'Wren', nameLock:true, species:'First Favored', castingTier:2,
        bio:'A canopy-tender who keeps to the edge of the clearing.' },
    ]);
    // Halvern is NAMED by what is about to happen, and staged by nothing. Klaus is named nowhere.
    seed.sceneOne.aboutToHappen = keptAbout + ' Halvern will be sent for if the rite is disputed.'
      + (noWren ? '' : ' Wren has already re-tied the canopy cords twice this morning.');

    const def = (window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
    s.picks = s.picks||{};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>{ s.picks[k]=def[k]; });
    Object.assign(s,{ world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
      // DELIBERATELY MISMATCHED. state.archetype.primary is the LOVE INTEREST's archetype; the
      // PC's lens is her MASK. If the C+ lens ever reads the wrong one, this fixture says so.
      archetype:{primary:'BEAUTIFUL_RUIN',modifier:null},
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
      // The PERSISTENT field must be gone; the mirror is observability only.
      persistedContract: (typeof s._scene1CPlusCandidates === 'undefined') ? 'absent' : 'PRESENT',
      candidates: window.__lastCPlusContract || null,
      staged: (s._scene1StagedCharacters || []).map(c => c && c.name),
      cp: s.sceneSkeleton ? (s.sceneSkeleton.character_plus || []).map(c => ({
        character:c.character, mode:c.mode, facet_id:c.facet_id, facet_truth:c.facet_truth,
        pressure:c.pressure, facet_pressure:c.facet_pressure,
        facet_category:c.facet_category, facet_source:c.facet_source,
        not_physically_present:c.not_physically_present,
        behavior:c.behavior, psychological_read:c.psychological_read })) : null };
    seed.cast = keptCast; seed.sceneOne.aboutToHappen = keptAbout;
    return out;
  }, { HALVERN_FACET, KLAUS_FACET, noWren: !!noWren, dropHalvern: !!dropHalvern });
  await browser.close();
  return { planner, author, logs, ...res };
}

console.log(`\n${'═'.repeat(88)}\nC+ PROMPT DOCTRINE — presence governs staging, not eligibility\n${'═'.repeat(88)}\n`);

const B = await run(null);
const pu = (B.planner[0] || {}).user || '';

console.log(' 1 · THE DISPATCHED PLANNER BYTES — WHO IS OFFERED');
t('1a: the planner request carries a CHARACTER+ CANDIDATES block',
  /CHARACTER\+ CANDIDATES \(\d+\)/.test(pu), (pu.match(/CHARACTER\+ CANDIDATES.{0,80}/) || ['(missing)'])[0]);
t('1b: an ABSENT person is offered as a candidate — presence is not the qualification',
  /•\s*Halvern/.test(pu) && /CHARACTER\+ CANDIDATES[\s\S]*?•\s*Halvern/.test(pu),
  (pu.match(/CHARACTER\+ CANDIDATES[\s\S]{0,400}/) || ['(missing)'])[0]);
t('1c: …offered in ANTICIPATED mode, the opportunity the scene actually gives him',
  /•\s*Halvern\n\s+modes permitted: ANTICIPATED/.test(pu),
  (pu.match(/•\s*Halvern[\s\S]{0,200}/) || ['(missing)'])[0]);
t('1d: …with the evidence that makes the opportunity honest, quoted whole',
  /Halvern will be sent for if the rite is/.test(pu) && !/\brite is dispute\b/.test(pu),
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

// ══════════════════════════════════════════════════════════════════════════════════════
// 2 · THE MICRO-BIBLE ITSELF, NOT A SLUG
// The break this section exists for: the planner received facet IDs only. Asked for specific
// psychology and handed "julian_status_without_display", it is in exactly the position that
// produced "her breath hitches" — inventing, with a label to hang the invention on.
// ══════════════════════════════════════════════════════════════════════════════════════
console.log('\n 2 · THE AUTHORED PSYCHOLOGY REACHES THE PLANNER');
t('2a: the CANONICAL TRUTH is in the dispatched request, not just the id',
  /He is accustomed to being respected without asserting rank/.test(pu)
    && /Her compassion is genuine but requires an audience/.test(pu),
  (pu.match(/canonical truth: .{0,120}/) || ['(no canonical truth in the request)'])[0]);
t('2b: …for the ABSENT candidate too — his psychology travels with his opportunity',
  /He arrives before he is sent for, because being sent for would mean/.test(pu),
  (pu.match(/•\s*Halvern[\s\S]{0,500}/) || ['(missing)'])[0]);
t('2c: each facet carries its CATEGORY',
  /julian_status_without_display\s+\[habit\]/.test(pu) && /seren_goodness_needs_witness\s+\[value\]/.test(pu),
  (pu.match(/julian_status_without_display[^\n]{0,40}/) || ['(missing)'])[0]);
t('2d: possible_pressures are labelled APPLICABILITY CONDITIONS, never prose',
  /applicability conditions \(WHEN this truth is available to reveal — NOT prose to copy, NOT actions to stage\)/.test(pu)
    && /a gathering where standing is being displayed/.test(pu),
  (pu.match(/applicability conditions[^\n]{0,160}/) || ['(missing)'])[0]);
t('2e: the model is told to return the ID ONLY, never a copy of the truth',
  /RETURN THE facet_id ONLY/.test(pu) && /a re-worded copy of it is how a truth quietly becomes a different truth/.test(pu));
t('2f: …and that the read must be a reading OF the cited truth',
  /CITE, DO NOT RESTATE/.test(pu)
    && /A read that would stand just as well with the facet deleted is not sourced/.test(pu));
t('2g: the planner is asked which applicability condition THIS scene meets',
  /"pressure" IS THE JUDGEMENT ONLY YOU CAN MAKE/.test(pu)
    && /copied verbatim from that facet's list/.test(pu)
    && /A facet whose conditions this scene does not meet is the wrong facet/.test(pu));

// ══════════════════════════════════════════════════════════════════════════════════════
// 3 · THE PC'S READING LENS — the mask, never state.archetype.primary
// The fixture sets playerMask=OPEN_VEIN and archetype.primary=BEAUTIFUL_RUIN, which is the
// exact mismatch that shipped once as "PC NARRATOR VOICE: BEAUTIFUL RUIN".
// ══════════════════════════════════════════════════════════════════════════════════════
console.log('\n 3 · THE PC READING LENS');
t('3a: the planner is given a C+ reading lens',
  /CHARACTER\+ READING LENS —/.test(pu), (pu.match(/CHARACTER\+ READING LENS[^\n]{0,120}/) || ['(missing)'])[0]);
t('3b: it names the PC MASK (Open Vein), not the LI archetype (Beautiful Ruin)',
  /CHARACTER\+ READING LENS — OPEN VEIN/.test(pu) && !/CHARACTER\+ READING LENS — BEAUTIFUL RUIN/.test(pu),
  (pu.match(/CHARACTER\+ READING LENS[^\n]{0,120}/) || ['(missing)'])[0]);
t('3b2: …and the test is not vacuous — the LI archetype really is the other one',
  B.candidates && B.candidates.pcMask === 'OPEN_VEIN', JSON.stringify(B.candidates && B.candidates.pcMask));
t('3c: it states the read is HER reading, not a neutral diagnosis',
  /is NOT a neutral character diagnosis/.test(pu)
    && /can sharpen it, soften it, or bend it toward what she needs to believe/.test(pu));
t('3d: …and gives the archetype\'s attention movement, so the bias is nameable',
  /HOW HER ATTENTION MOVES: /.test(pu) && /INWARD TRANSLATION/.test(pu),
  (pu.match(/HOW HER ATTENTION MOVES: .{0,90}/) || ['(missing)'])[0]);
t('3e: two protagonists must not produce the same sentence — stated as the test',
  /Two protagonists of different archetypes reading the same facet must not produce the same sentence/.test(pu));

// ══════════════════════════════════════════════════════════════════════════════════════
// 4 · THE CONTRACT IS INVOCATION-LOCAL, AND HAS THREE REGIMES
// ══════════════════════════════════════════════════════════════════════════════════════
console.log('\n 4 · THE CANDIDATE CONTRACT');
t('4a: NOTHING persists on state — the contract is local to the invocation that built it',
  B.persistedContract === 'absent',
  'state._scene1CPlusCandidates survived; a failed or overlapping build could validate against it');
t('4b: the mirror reports three populations, not a single flag',
  !!B.candidates.populations && typeof B.candidates.populations.sourced === 'number'
    && typeof B.candidates.populations.unsourced === 'number'
    && typeof B.candidates.populations.ordinary === 'number',
  JSON.stringify(B.candidates.populations));
t('4c: this fixture is MIXED — one candidate has no authored psychology',
  B.candidates.regime === 'mixed' && B.candidates.populations.unsourced === 1,
  JSON.stringify({ regime: B.candidates.regime, pops: B.candidates.populations }));
t('4d: the unsourced candidate was NOT deleted for someone else\'s coverage',
  !!B.candidates.byLabel['wren'] && B.candidates.byLabel['wren'].facet_ids.length === 0,
  JSON.stringify(Object.keys(B.candidates.byLabel)));
t('4e: …and the prompt says so, per person, instead of story-wide',
  /•\s*Wren[\s\S]{0,300}AUTHORED PSYCHOLOGY: none on record for this person/.test(pu)
    && /WHERE A PERSON HAS AUTHORED PSYCHOLOGY, an entry for them MUST cite one of THEIR facet_ids/.test(pu),
  (pu.match(/•\s*Wren[\s\S]{0,300}/) || ['(missing)'])[0]);
t('4f: the contract carries the FULL records, not id lists',
  (B.candidates.byLabel['seren'].facets || []).every(f => f.facet_id && f.category && f.canonical_truth),
  JSON.stringify((B.candidates.byLabel['seren'].facets || []).map(f => Object.keys(f))));
t('4g: baseline plan is accepted and reaches the author',
  B.author.length === 1 && !B.logs.some(l => /SCENE1:ABORT/.test(l)),
  `author=${B.author.length} ` + B.logs.filter(l=>/INVALID|ABORT/.test(l)).slice(0,1).join(''));

// ── the fully-covered regime, for contrast ──
const FC = await run(null, { noWren: true });
t('4h: with every candidate sourced the regime is FULLY-COVERED and citations are universal',
  FC.candidates.regime === 'fully-covered' && FC.candidates.populations.unsourced === 0
    && /EVERY character_plus entry MUST cite one "facet_id"/.test((FC.planner[0]||{}).user || ''),
  JSON.stringify({ regime: FC.candidates.regime, pops: FC.candidates.populations }));

console.log('\n 5 · AN ABSENT CANDIDATE MAY RECEIVE C+ AND STAY ABSENT');
const A = await run('absentAssign');
t('5a: the plan is ACCEPTED with a C+ assigned to someone who is not in the room',
  A.author.length === 1 && !A.logs.some(l => /SCENE1:ABORT/.test(l)),
  `author=${A.author.length} ` + A.logs.filter(l=>/INVALID|ABORT/.test(l)).slice(0,2).join(' | '));
t('5b: …the assignment survives delivery with its mode and facet citations intact',
  (A.cp || []).some(c => c.character === 'Halvern' && c.mode === 'ANTICIPATED' && c.facet_id === HALVERN_FACET),
  JSON.stringify((A.cp||[]).map(c => [c.character, c.mode, c.facet_id])));
t('5c: …and he is STILL not staged — a C+ is a reading, never an entrance',
  !(A.staged || []).includes('Halvern'), JSON.stringify(A.staged));
t('5d: THE TRUSTED TRUTH IS REATTACHED after normalisation, from the local record',
  (() => { const h = (A.cp||[]).find(c => c.character === 'Halvern');
           return !!h && /He arrives before he is sent for/.test(h.facet_truth || '')
                  && h.facet_category === 'habit' && h.facet_source === 'trusted-record'; })(),
  JSON.stringify((A.cp||[]).find(c => c.character === 'Halvern')));
t('5d2: …and the TRUSTED PRESSURE is reattached from the record, not the reply',
  (() => { const h = (A.cp||[]).find(c => c.character === 'Halvern');
           return !!h && h.facet_pressure === 'a gathering that has not formally begun'; })(),
  JSON.stringify((A.cp||[]).map(c => [c.character, c.facet_pressure])));
t('5e: …and absence is recorded on the assignment, not only in the contract',
  (() => { const h = (A.cp||[]).find(c => c.character === 'Halvern');
           const s2 = (A.cp||[]).find(c => c.character === 'Seren');
           return !!h && h.not_physically_present === true && !!s2 && s2.not_physically_present === false; })(),
  JSON.stringify((A.cp||[]).map(c => [c.character, c.not_physically_present])));

const MT = await run('modelSuppliesTruth');
t('5f: a MODEL-SUPPLIED canonical truth is discarded and replaced by the trusted record',
  (() => { const all = MT.cp || [];
           const forged = all.some(c => /WHATEVER I SAY IT IS/.test(c.facet_truth || '') || c.facet_category === 'forged');
           const j = all.find(c => c.character === 'Julian');
           return !forged && !!j && j.facet_source === 'trusted-record'
                  && /accustomed to being respected without asserting rank/.test(j.facet_truth || ''); })(),
  JSON.stringify((MT.cp||[]).map(c => [c.character, c.facet_category, (c.facet_truth||'').slice(0,50)])));

// ══════════════════════════════════════════════════════════════════════════════════════
// 6 · THE AUTHOR'S OWN BYTES — mode died here before this commit
// ══════════════════════════════════════════════════════════════════════════════════════
console.log('\n 6 · WHAT REACHES GROK');
const asys = (A.author[0] || {}).system || '';
const aall = asys + '\n' + ((A.author[0] || {}).user || '');
// The first-mention tag sits between the name and the mode and is load-bearing on its own — it
// is what tells the author WHERE the beat lands. Matched as optional so these assertions test
// the mode/absence/citation chain rather than the tag's presence, which 6h owns.
const FM = '(?: \\(first mention[^)]*\\))?';
const line = n => new RegExp('•\\s*' + n + FM + ' — ');
t('6a: the author is told the MODE of the assignment',
  new RegExp(line('Halvern').source + 'ANTICIPATED').test(asys),
  (aall.match(/•\s*Halvern[^\n]{0,240}/) || ['(missing)'])[0]);
t('6b: …that the person is NOT PHYSICALLY PRESENT',
  new RegExp(line('Halvern').source + 'ANTICIPATED; NOT PHYSICALLY PRESENT').test(asys),
  (aall.match(/•\s*Halvern[^\n]{0,240}/) || ['(missing)'])[0]);
t('6c: …the TRUSTED FACET TRUTH, the PRESSURE, the behavior and the PC reading, in one line',
  new RegExp(line('Halvern').source
    + 'ANTICIPATED; NOT PHYSICALLY PRESENT — trusted facet: He arrives before he is sent for[^\n]*?'
    + '; pressure: a gathering that has not formally begun; behavior: [^\n]*; PC reading: [^\n]+').test(asys),
  (aall.match(/•\s*Halvern[^\n]{0,400}/) || ['(missing)'])[0]);
t('6c3: …and the first-mention tag survives beside the new fields',
  /•\s*Halvern \(first mention/.test(asys),
  (aall.match(/•\s*Halvern[^\n]{0,80}/) || ['(missing)'])[0]);
t('6c2: …and the author gets ONE facet, not the person\'s whole micro-bible',
  (asys.split('trusted facet:').length - 1) === (A.cp||[]).filter(c => c.facet_truth).length
    && !/applicability conditions/.test(asys) && !/AUTHORED PSYCHOLOGY/.test(asys),
  'the full facet list belongs to the planner; the author receives the one that was selected');
t('6d: a PRESENT recipient carries a mode and NO absence marker',
  new RegExp(line('Seren').source + 'IN_PERSON — trusted facet: ').test(asys)
    && !/NOT PHYSICALLY PRESENT — trusted facet: Her compassion/.test(asys),
  (aall.match(/•\s*Seren[^\n]{0,240}/) || ['(missing)'])[0]);
t('6e: the NON-MATERIALISATION LAW reaches the component that would otherwise break it',
  /ABSENT PEOPLE STAY ABSENT \(HARD\)/.test(asys)
    && /do NOT enter, arrive, appear, act in the present moment, speak a line of dialogue/.test(asys)
    && /ANTICIPATED = what the protagonist EXPECTS of them, written as expectation and never as present fact/.test(asys),
  (asys.match(/ABSENT PEOPLE STAY ABSENT[\s\S]{0,200}/) || ['(missing)'])[0]);
t('6f: the trusted facet is marked SOURCE, never a line to reproduce',
  /"trusted facet" is the established, canonical truth about that person/.test(asys)
    && /do not state it, do not paraphrase it into narration, and do not let a character say it aloud/.test(asys));
t('6g: each arrives EXACTLY ONCE — no double-delivery through a second builder',
  ((asys.match(new RegExp(line('Halvern').source + 'ANTICIPATED', 'g')) || []).length) === 1
    && (asys.split('ABSENT PEOPLE STAY ABSENT (HARD)').length - 1) === 1
    && (asys.split('He arrives before he is sent for').length - 1) === 1,
  JSON.stringify({ mode: (asys.match(new RegExp(line('Halvern').source + 'ANTICIPATED', 'g')) || []).length,
                   law: asys.split('ABSENT PEOPLE STAY ABSENT (HARD)').length - 1,
                   truth: asys.split('He arrives before he is sent for').length - 1 }));

console.log('\n 7 · THE MIXED REGIME, END TO END');
const U = await run('unsourcedAssign');
t('7a: a candidate with NO authored psychology may still receive a C+, citing no facet',
  U.author.length === 1 && (U.cp||[]).some(c => c.character === 'Wren' && !c.facet_id),
  `author=${U.author.length} ` + JSON.stringify((U.cp||[]).map(c => [c.character, c.facet_id])));
t('7b: …and carries no trusted truth, because there is none to attach',
  (() => { const w = (U.cp||[]).find(c => c.character === 'Wren'); return !!w && !w.facet_truth; })(),
  JSON.stringify((U.cp||[]).find(c => c.character === 'Wren')));

console.log('\n 8 · THE THINGS THAT MUST STILL BE REFUSED');
for (const [mutate, label] of [
  ['unmentionedAssign', 'a roster member this scene never mentions is ineligible however well-formed the beat'],
  ['absentInPerson',    'an absent candidate given IN_PERSON mode would materialise them'],
  ['absentMaterialised','an absent recipient added to staged_characters is a fixed-cast edit'],
  ['unsourcedBorrows',  'an unsourced candidate may not borrow a real facet belonging to someone else'],
  ['inventedPressure',  'a condition the cited facet does not list is an invented applicability'],
  ['noPressure',        'a cited facet with conditions must name the one this scene meets'],
]) {
  const R = await run(mutate);
  const flagged = R.logs.some(l => /SCENE1:SKELETON:INVALID|SCENE1:STAGED:INVALID|SCENE1:PLANNER:UNRECOVERABLE/.test(l))
               && R.logs.some(l => /SCENE1:ABORT/.test(l));
  t(`8 "${mutate}" — ${label}`, flagged && R.author.length === 0,
    `flagged=${flagged} author=${R.author.length} ` + R.logs.filter(l=>/INVALID|ABORT/.test(l)).slice(0,2).join(' | '));
}

// ── STALENESS: a contract is rebuilt from THIS invocation's sources, never recovered ──
const STALE = await run('absentAssign', { noWren: true, dropHalvern: true });
t('8e: with Halvern gone from the seed, a Halvern assignment is refused',
  STALE.author.length === 0 && STALE.logs.some(l => /SCENE1:ABORT/.test(l))
    && !(STALE.candidates && STALE.candidates.byLabel && STALE.candidates.byLabel['halvern']),
  `author=${STALE.author.length} offered=${JSON.stringify(Object.keys((STALE.candidates||{}).byLabel||{}))}`);

// ══════════════════════════════════════════════════════════════════════════════════════
// 9 · THE HONEST LIMIT — recorded, not papered over
// ══════════════════════════════════════════════════════════════════════════════════════
console.log('\n 9 · WHAT THIS CANNOT PROVE');
const UR = await run('unrelatedRead');
t('9a: a VALID facet id paired with an unrelated read is NOT caught mechanically',
  UR.author.length === 1,
  'if this ever fails, a semantic check was added and this test should become the assertion that it works');
console.log('      ⚠ RECORDED LIMIT: "cites a facet that is hers" is a MECHANICAL check. That the');
console.log('        psychological_read actually reads THAT truth is not mechanically verified — the');
console.log('        prompt asks for it and nothing enforces it. Whether the model complies is a');
console.log('        question for the paid planner probe, not for this suite.');

console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
