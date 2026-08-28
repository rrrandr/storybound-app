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
  Julian: { behavior:`lets the assembly's noise arrive at him at the edge rather than moving into it`,
            character_revelation:`he does not need the clearing to register him, and the not-needing is the thing he has that everyone else here is still working for` },
  Seren:  { behavior:`checks the faces in the crowd twice before she kneels`,
            character_revelation:`she expected approving smiles and cannot begin until she has counted them; the empathy is real and it needs an audience` },
  'the presiding Dohkar':
          { behavior:`says the liturgy's final clause a half-beat faster than the rest`,
            // NOT a restatement of "cannot be bothered to pretend this ceremony deserves his
            // attention" — that sentence IS the source. This is what the half-beat shows of it.
            character_revelation:`the half-beat is a measurement: he has said these words often enough to know exactly which of them nobody checks, and he spends what he saves on nothing at all` },
};
const FACET = { Julian:'julian_status_without_display', Seren:'seren_goodness_needs_witness',
                'the presiding Dohkar':'presiding_dohkar_ritual_contempt' };
// The applicability condition each cited facet lists, verbatim — the planner's live judgement
// that THIS scene meets it. A condition the facet does not list is an invention, and is refused.
const REACT = { Julian:'I had decided what his stillness meant before I had earned the right to',
                Seren:'I wanted to be proud of her and could not find anywhere to put it',
                'the presiding Dohkar':'his boredom was in my chest before I finished disagreeing with it' };

// Parse the dispatched candidate packets: facet ids and each facet's pressure ids. A reply that
// guessed at ids would be testing my memory of the slug rule, not the product's contract.
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
    const facets = [], pressures = {};
    const fre = /^\s{6,}· facet_id: (\S+)\s+\[[a-z_]+\]([\s\S]*?)(?=^\s{6,}· facet_id: |^\s{6,}READS THIS|^\s{6,}⟂|$(?![\s\S]))/gm;
    let f; while ((f = fre.exec(chunk))) {
      facets.push(f[1]);
      pressures[f[1]] = [...f[2].matchAll(/pressure_id: (\S+)\s+→\s+([^\n]*)/g)]
        .map(m => ({ pressure_id: m[1], text: m[2].trim() }));
    }
    out[name.trim()] = { modes, facets, pressures };
  });
  return out;
}

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
  // A verbatim span of the scene material — the WHERE line is exactly stage.setting.
  const CO = corporaFromPrompt(usr);
  const E1 = (CO.facts[0] || {}).id;            // a real evidence id from the dispatched corpus
  const OP = CO.ops[0];                          // a real operation from THIS pc's lens
  const CAND = candidatesFromPrompt(usr);
  const pidOf = (n, fid, i) => (((CAND[n] || {}).pressures || {})[fid] || [])[i || 0];
  const full = n => { const fid = FACET[n]; const pr = pidOf(n, fid);
    return { character:n, mode:'IN_PERSON', first_mention:true,
      ...(fid ? { facet_id:fid } : {}),
      ...(pr ? { pressure_id:pr.pressure_id, pressure_evidence_ids:[E1] } : {}),
      behavior: READS[n].behavior, behavior_object_ids:[], behavior_person_ids:[],
      pc_lens_operation: OP, pc_effect: REACT[n] }; };
  let cp = cast.filter(n => n !== PCN).map(full);
  const WREN = { character:'Wren', mode:'ANTICIPATED', first_mention:true,
    behavior:'will have re-tied the canopy cords a third time before the assembly is called',
    behavior_object_ids:[], behavior_person_ids:[],
    pc_lens_operation: OP,
    // She has NO authored psychology, so the legacy field is the only source there is.
    character_revelation:'she would rather be found fussing than be found with nothing to do, because idleness is where the questions start',
    pc_effect:'I recognised the manoeuvre because it is mine' };
  // A candidate with NO authored psychology is still a candidate — and cites no facet.
  if (mutate === 'unsourcedAssign')     cp = cp.concat([WREN]);
  // …but may not borrow a real facet belonging to somebody else.
  if (mutate === 'unsourcedBorrows')    cp = cp.concat([{ ...WREN, facet_id:OTHER_FACET,
    pressure_id:(pidOf('Seren', OTHER_FACET)||{}).pressure_id, pressure_evidence_ids:[E1] }]);
  // A condition that facet does not list — the planner asserting an applicability nobody authored.
  if (mutate === 'inventedPressure')    cp = cp.map((c,i) => i === 0
    ? { ...c, pressure_id:'p_nobody_is_watching' } : c);
  if (mutate === 'noPressure')          cp = cp.map((c,i) => { if (i !== 0) return c; const { pressure_id, ...r } = c; return r; });
  // ── THE STRUCTURAL CITATIONS ──
  if (mutate === 'badEvidenceId')  cp = cp.map((c,i) => i === 0 ? { ...c, pressure_evidence_ids:['E999'] } : c);
  if (mutate === 'noEvidenceId')   cp = cp.map((c,i) => { if (i !== 0) return c; const { pressure_evidence_ids, ...r } = c; return r; });
  if (mutate === 'badObjectId')    cp = cp.map((c,i) => i === 0 ? { ...c, behavior_object_ids:['O99'] } : c);
  if (mutate === 'badPersonId')    cp = cp.map((c,i) => i === 0 ? { ...c, behavior_person_ids:['named:nobody'] } : c);
  if (mutate === 'noLensOp')       cp = cp.map((c,i) => { if (i !== 0) return c; const { pc_lens_operation, ...r } = c; return r; });
  if (mutate === 'foreignLensOp')  cp = cp.map((c,i) => i === 0 ? { ...c, pc_lens_operation:'KEEP_AN_EXIT_OPEN' } : c);  // Armored Fox's
  // A body that reacts, offered in place of a way of paying attention.
  if (mutate === 'somaticOnly')    cp = cp.map((c,i) => { if (i !== 0) return c;
    const { pc_lens_operation, ...r } = c; return { ...r, pc_effect:'my pulse hammers against the veil-band' }; });
  // ══════════════════════════════════════════════════════════════════════════════════════
  // THE FIRST PAID PROBE'S OWN OUTPUT, VERBATIM (2026-08-27)
  // Every string below was returned by mistral-small-latest against a2c3a0b with a MECHANICALLY
  // VALID citation. Citation was never the weak link; binding was. These are permanent.
  // ══════════════════════════════════════════════════════════════════════════════════════
  const put = (who, patch) => cp.map(c => c.character === who ? { ...c, ...patch } : c);
  // 1 · Julian cited his own facet and was given the DOHKAR's psychology.
  if (mutate === 'probeJulianContempt') cp = put('Julian', {
    behavior:'he stands apart, perfectly still, his silence a refusal to acknowledge the rite\u2019s importance',
    pc_effect:'she reads it as a challenge to her authority' });
  // …and the same theft with the adversarial half removed, so the contempt clause alone is tested.
  if (mutate === 'probeJulianContemptOnly') cp = put('Julian', {
    behavior:'he cannot be bothered to pretend the ceremony deserves his attention, and lets it show' });
  // …and the guardrail the seed already carried, before this probe existed.
  if (mutate === 'probeJulianSuspicion') cp = put('Julian', {
    behavior:'he holds still with the discipline of a man who knows something he has chosen not to say' });
  // 2 · Seren's revelation restated her facet and never reached the protagonist.
  // The paraphrase has nowhere left to live: there is no field for it. What IS still reachable
  // is putting it in the behaviour, so that is what this replays.
  if (mutate === 'probeSerenParaphrase') cp = put('Seren', {
    facet_id:'seren_trained_composure',
    pressure_id:(pidOf('Seren','seren_trained_composure')||{}).pressure_id,
    pressure_evidence_ids:[E1],
    behavior:'she treats the coming failure as a performance to master, not a wound to endure' });
  // …and the pressure she was given, with evidence that is not in this scene.
  if (mutate === 'probeSerenNoEvidence') cp = put('Seren', {
    facet_id:'seren_trained_composure',
    pressure_id:(pidOf('Seren','seren_trained_composure')||{}).pressure_id,
    pressure_evidence_ids:[] });                       // asserted with nothing behind it
  // 3 · the Dohkar's beat brought its own prop into a rite the seed says has no machinery.
  if (mutate === 'probeDohkarBlade') cp = put('the presiding Dohkar', {
    behavior:'he recites the rite in a flat monotone, his fingers tapping the ceremonial blade against his thigh' });
  // …and the second probe's own invention, in the other direction.
  // ── THE INTENDED TRANSFORMATION (Roman's fixtures, 2026-08-27) ──
  // Structural fixtures, NOT prose exemplars — nothing here is shown to the production prompt.
  // Each is an ACTION ONLY, with the interpretation carried separately by the operation.
  if (mutate === 'fixtureTransform') cp = cp.map(c => {
    if (c.character === 'Seren') return { ...c,
      facet_id:'seren_goodness_needs_witness',
      pressure_id:(pidOf('Seren','seren_goodness_needs_witness')||{}).pressure_id,
      pressure_evidence_ids:[E1],
      behavior:'she checks the faces of the crowd before she reaches for Lirael',
      pc_lens_operation:'INWARD_TRANSLATION_OF_ANOTHER_PERSONS_COST',
      pc_effect:'the hesitation arrives in me as kindness waiting for permission' };
    if (c.character === 'the presiding Dohkar') return { ...c,
      behavior:'he begins the next clause before the assembly has finished answering the first',
      pc_lens_operation:'EMOTIONAL_CONCLUSION_BEFORE_EVIDENCE',
      pc_effect:'I understand that their reverence is not worth waiting for' };
    return c;
  });
  if (mutate === 'probeSerenBowl') cp = put('Seren', {
    behavior:'her fingers hover over the offering bowl, nails biting into her palms' });
  // A model-supplied copy of the canonical truth must never survive into the assignment.
  if (mutate === 'modelSuppliesTruth')  cp = cp.map((c,i) => i === 0
    ? { ...c, facet_truth:'HE IS A LIAR AND THE TRUTH IS WHATEVER I SAY IT IS', facet_category:'forged' } : c);
  // A real id belonging to the right person, paired with a read that has nothing to do with it.
  // Unrelated to the cited truth, and carefully breaking no guardrail and no restatement guard —
  // which is exactly why nothing mechanical stops it. This is the recorded limit.
  if (mutate === 'unrelatedRead')       cp = put('Seren', {
    behavior:'she has been counting the exits since she arrived and has already chosen one' });

  // THE CLAIM: an absent candidate receives a C+ and is NOT added to staged_characters.
  if (mutate === 'absentAssign') cp = cp.concat([{ character:'Halvern', mode:'ANTICIPATED',
    facet_id:HALVERN_FACET, pressure_id:(pidOf('Halvern', HALVERN_FACET)||{}).pressure_id, pressure_evidence_ids:[E1], first_mention:true,
    behavior:'will already be standing at the edge of the clearing when the assembly is called, having come on his own',
    behavior_object_ids:[], behavior_person_ids:[], pc_lens_operation: OP,
    pc_effect:'I resented how easy he made it look' }]);
  // The same beat, plus the mistake the rule forbids: materialising him into the room.
  if (mutate === 'absentMaterialised') {
    cp = cp.concat([{ character:'Halvern', mode:'ANTICIPATED', facet_id:HALVERN_FACET, pressure_id:(pidOf('Halvern', HALVERN_FACET)||{}).pressure_id, pressure_evidence_ids:[E1], first_mention:true,
      behavior:'will already be standing at the edge of the clearing when the assembly is called, having come on his own',
      character_revelation:'he treats being summoned as a discourtesy he can spare everyone by never needing to be summoned',
    pc_archetype_reaction:'I resented how easy he made it look, and knew I resented it before I knew why',
    source_bridge:'arriving uncalled is the cited truth under a gathering that has not formally begun' }]);
    spine.staged_characters = spine.staged_characters.concat([{ name:'Halvern', presence:'IN_PERSON', anchor_beat:'FROM_CHARACTER_PLUS' }]);
  }
  // …and the person this scene never mentions stays ineligible however well-formed the entry is.
  if (mutate === 'unmentionedAssign') cp = cp.concat([{ character:'Klaus', mode:'REPORTED',
    facet_id:KLAUS_FACET, pressure_id:'p_record_someone_else', pressure_evidence_ids:[E1], first_mention:true,
    behavior:'is said to have copied the tally himself rather than let a clerk touch it',
    behavior_object_ids:[], behavior_person_ids:[], pc_lens_operation: OP }]);
  // An absent candidate given the one mode that would put him in the room.
  if (mutate === 'absentInPerson') cp = cp.concat([{ character:'Halvern', mode:'IN_PERSON',
    facet_id:HALVERN_FACET, pressure_id:(pidOf('Halvern', HALVERN_FACET)||{}).pressure_id, pressure_evidence_ids:[E1], first_mention:true,
    behavior:'stands at the edge of the clearing with his hands behind him',
    character_revelation:'he treats being summoned as a discourtesy he can spare everyone by never needing to be summoned',
    pc_archetype_reaction:'I resented how easy he made it look, and knew I resented it before I knew why',
    source_bridge:'arriving uncalled is the cited truth under a gathering that has not formally begun' }]);

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
        behavior:c.behavior, character_revelation:c.psychological_read })) : null };
    seed.cast = keptCast; seed.sceneOne.aboutToHappen = keptAbout;
    return out;
  }, { HALVERN_FACET, KLAUS_FACET, noWren: !!noWren, dropHalvern: !!dropHalvern });
  await browser.close();
  return { planner, author, logs, ...res };
}

console.log(`\n${'═'.repeat(88)}\nC+ PROMPT DOCTRINE — presence governs staging, not eligibility\n${'═'.repeat(88)}\n`);

const B = await run(null);
const pu = (B.planner[0] || {}).user || '';
// If the prompt never went out, the reason is worth more than 30 failed assertions.
if (!pu) { console.log('  ⚠ no planner request — threw:', B.threw); (B.logs||[]).slice(0,8).forEach(l=>console.log('     ',l)); }

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
  /applicability conditions — cite ONE by its pressure_id \(these say WHEN this truth is available to reveal; they are NOT prose to copy and NOT actions to stage\)/.test(pu)
    && /a gathering where standing is being displayed/.test(pu),
  (pu.match(/applicability conditions[^\n]{0,160}/) || ['(missing)'])[0]);
t('2e: the model is told to return the ID ONLY, never a copy of the truth',
  /RETURN THE facet_id ONLY/.test(pu) && /a re-worded copy of it is how a truth quietly becomes a different truth/.test(pu));
t('2f: …and the behaviour must be an act the truth could be inferred from',
  /CITE, DO NOT RESTATE/.test(pu)
    && /an act a camera could record, from which that truth could be inferred/.test(pu));
t('2f2: the one case where the model DOES write psychology is named and bounded',
  /ONE EXCEPTION, AND ONLY ONE/.test(pu)
    && /Never add it for anyone whose packet lists facets/.test(pu));
t('2g: the planner is asked which condition THIS scene meets, with the facts that establish it',
  /"pressure_id" IS THE JUDGEMENT ONLY YOU CAN MAKE, AND "pressure_evidence_ids" IS WHAT MAKES IT CHECKABLE/.test(pu)
    && /If no fact establishes the condition, it does not apply here/.test(pu));

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
t('3c: it states her archetype decides HOW her attention moves onto the beat',
  /does not receive this beat neutrally; her archetype decides HOW her attention moves onto it/.test(pu));
t('3d: …and gives the archetype\'s attention movement, so the bias is nameable',
  /HOW HER ATTENTION MOVES: /.test(pu) && /INWARD TRANSLATION/.test(pu),
  (pu.match(/HOW HER ATTENTION MOVES: .{0,90}/) || ['(missing)'])[0]);
t('3e: the operation set offered is exactly this archetype\'s, and each carries its gloss',
  (pu.match(/^    · [A-Z_]{6,}  —  /gm) || []).length >= 4,
  JSON.stringify((pu.match(/^    · [A-Z_]{6,}/gm) || []).slice(0, 6)));

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
  /•\s*Halvern[^\n]*— ANTICIPATED/.test(asys),
  (aall.match(/•\s*Halvern[\s\S]{0,300}/) || ['(missing)'])[0]);
t('6b: …that the person is NOT PHYSICALLY PRESENT',
  /•\s*Halvern[^\n]*— ANTICIPATED; NOT PHYSICALLY PRESENT/.test(asys),
  (aall.match(/•\s*Halvern[\s\S]{0,300}/) || ['(missing)'])[0]);
t('6b2: …and an ABSENT recipient gets the SAME three-component construction',
  /•\s*Halvern[^\n]*\n\s+SOURCE TRUTH — DO NOT STATE: He arrives before he is sent for[\s\S]{0,400}?VISIBLE ACTION — MUST OCCUR: [^\n]+\n\s+PC INTERPRETATION — MUST GOVERN THE NARRATION: [A-Z_]{6,}/.test(asys),
  (aall.match(/•\s*Halvern[\s\S]{0,500}/) || ['(missing)'])[0]);
t('6c: …the applicable pressure travels as OUR wording, marked as why it applies',
  /\(it applies here because: a gathering that has not formally begun\)/.test(asys),
  (asys.match(/it applies here because: [^\n]{0,90}/) || ['(missing)'])[0]);
t('6c3: …and the first-mention tag survives beside the new fields',
  /•\s*Halvern \(first mention/.test(asys),
  (aall.match(/•\s*Halvern[^\n]{0,80}/) || ['(missing)'])[0]);
// ── THE PORTFOLIO STOPS AT THE PLANNER (Roman 2026-08-27) ──
// Five truths are a selection problem for the planner and a distraction for the writer. That
// asymmetry is the whole point of authoring more than one, so it is asserted on both sides.
t('6c4: the PLANNER receives the Dohkar\'s WHOLE portfolio — five facets to choose between',
  (() => {
    const pu = (A.planner[0] || {}).user || '';
    return ['ritual_contempt', 'peer_jealousy', 'compulsive_pedagogy',
            'sacrificial_arrogance', 'kindness_to_the_poor']
      .every(x => pu.includes('facet_id: presiding_dohkar_' + x));
  })(),
  'the planner cannot choose between truths it was never shown');
t('6c5: …and the AUTHOR receives no facet ID at all, and exactly one truth per recipient',
  (() => {
    const leaked = ['ritual_contempt', 'peer_jealousy', 'compulsive_pedagogy',
                    'sacrificial_arrogance', 'kindness_to_the_poor']
      .filter(x => asys.includes('presiding_dohkar_' + x));
    return leaked.length === 0
      && (asys.split('SOURCE TRUTH — DO NOT STATE:').length - 1) === (A.cp || []).filter(c => c.facet_truth).length;
  })(),
  'a facet id leaked to the author, or a recipient carried more than one truth');
t('6c6: …and no UNSELECTED truth of his reaches the author as prose either',
  (() => {
    const all = ['cannot be bothered to pretend',
                 'measures himself against every First Favored',
                 'cannot watch a child do a thing badly',
                 'gave more at his own First Sacrifice',
                 'gentle with anyone who arrived here with nothing'];
    const present = all.filter(o => asys.includes(o));
    return present.length <= 1;
  })(),
  'more than one of his five truths reached the writer — the micro-bible leaking a facet at a time');
t('6c2: …and the author gets ONE facet, not the person\'s whole micro-bible',
  (asys.split('SOURCE TRUTH — DO NOT STATE:').length - 1) === (A.cp||[]).filter(c => c.facet_truth).length
    && !/applicability conditions/.test(asys) && !/AUTHORED PSYCHOLOGY/.test(asys),
  'the full facet list belongs to the planner; the author receives the one that was selected');
t('6d: a PRESENT recipient carries a mode and NO absence marker',
  /•\s*Seren[^\n]*— IN_PERSON\n/.test(asys) && !/•\s*Seren[^\n]*NOT PHYSICALLY PRESENT/.test(asys),
  (aall.match(/•\s*Seren[\s\S]{0,240}/) || ['(missing)'])[0]);
t('6e: the NON-MATERIALISATION LAW reaches the component that would otherwise break it',
  /ABSENT PEOPLE STAY ABSENT \(HARD\)/.test(asys)
    && /do NOT enter, arrive, appear, act in the present moment, speak a line of dialogue/.test(asys)
    && /ANTICIPATED = what the protagonist EXPECTS of them, written as expectation and never as present fact/.test(asys),
  (asys.match(/ABSENT PEOPLE STAY ABSENT[\s\S]{0,200}/) || ['(missing)'])[0]);
t('6f0: the author gets ONE pressure, not the facet\'s whole condition list or portfolio',
  !/pressure_id:/.test(asys) && !/applicability conditions/.test(asys)
    && !/AUTHORED PSYCHOLOGY/.test(asys) && !/facet_id:/.test(asys),
  (asys.match(/.{0,60}(applicability conditions|AUTHORED PSYCHOLOGY).{0,60}/i) || ['(absent, correct)'])[0]);
t('6f1: the SOURCE TRUTH is the record\'s wording, never a model paraphrase',
  /SOURCE TRUTH — DO NOT STATE: Her compassion is genuine but requires an audience/.test(asys)
    && /PC INTERPRETATION — MUST GOVERN THE NARRATION: [A-Z_]{6,} — /.test(asys),
  (aall.match(/•\s*Seren[\s\S]{0,400}/) || ['(missing)'])[0]);
t('6f2: NO model-authored psychology reaches the author at all',
  !/reveals:/.test(asys) && !/source_bridge/i.test(asys) && !/character_revelation/i.test(asys),
  (asys.match(/.{0,60}(reveals:|source_bridge|character_revelation).{0,60}/i) || ['(none, correct)'])[0]);
t('6f: the trusted facet is marked SOURCE, never a line to reproduce',
  /"trusted facet" is the established, canonical truth about that person/.test(asys)
    && /do not state it, do not paraphrase it into narration, and do not let a character say it aloud/.test(asys));
t('6g: each arrives EXACTLY ONCE — no double-delivery through a second builder',
  ((asys.match(/•\s*Halvern[^\n]*— ANTICIPATED/g) || []).length) === 1
    && (asys.split('ABSENT PEOPLE STAY ABSENT (HARD)').length - 1) === 1
    && (asys.split('He arrives before he is sent for').length - 1) === 1,
  JSON.stringify({ mode: (asys.match(/•\s*Halvern[^\n]*— ANTICIPATED/g) || []).length,
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
  ['badEvidenceId',     'an evidence id this scene does not contain'],
  ['noEvidenceId',      'a condition asserted with no evidence cited at all'],
  ['badObjectId',       'an object id this scene does not contain'],
  ['badPersonId',       'a person id who is not in this scene'],
  ['noLensOp',          'no pc_lens_operation — how her attention moves is a choice she must make'],
  ['foreignLensOp',     'another archetype\'s operation, offered for this protagonist'],
  ['somaticOnly',       'a hammering pulse offered in place of a way of paying attention'],
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

console.log('\n 8b · THE CAUSAL CHAIN IN THE DISPATCHED BYTES');
t('8b1: pressures are cited by STABLE ID, not by reproducing their text',
  /pressure_id: p_\w+\s+→\s+a gathering where standing is being displayed/.test(pu)
    && /"pressure_id": "<the ONE pressure_id listed under THAT facet/.test(pu),
  (pu.match(/pressure_id: [^\n]{0,90}/) || ['(missing)'])[0]);
t('8b1b: the scene is a NUMBERED FACT CORPUS — evidence is cited, never quoted',
  /THE SCENE, AS NUMBERED FACTS/.test(pu) && /^  E1: /m.test(pu) && /^  E2: /m.test(pu)
    && /CITE IDS — never quote, never paraphrase, never compose a sentence that sounds like the scene/.test(pu),
  (pu.match(/THE SCENE, AS NUMBERED FACTS[\s\S]{0,160}/) || ['(missing)'])[0]);
t('8b1c: objects and people are addressable too',
  /THE OBJECTS THIS SCENE CONTAINS/.test(pu) && /^  O1: /m.test(pu)
    && /THE PEOPLE PHYSICALLY PRESENT, by id/.test(pu) && /^  named:seren: /m.test(pu),
  (pu.match(/THE OBJECTS THIS SCENE CONTAINS[\s\S]{0,140}/) || ['(missing)'])[0]);
t('8b2: the entry cites evidence, objects and people by id',
  /"pressure_evidence_ids": \["<evidence_ids of the facts that establish it/.test(pu)
    && /"behavior_object_ids"/.test(pu) && /"behavior_person_ids"/.test(pu));
t('8b3: the model is told it does NOT write the psychology',
  /YOU DO NOT WRITE THE PSYCHOLOGY/.test(pu)
    && /delivered to the writer from the record, word for word, by us/.test(pu)
    && /there is no field for that, on purpose/.test(pu));
t('8b3b: …and the retired paraphrase fields are gone from the schema entirely',
  !/"source_bridge"/.test(pu) && !/"pc_archetype_reaction"/.test(pu)
    // character_revelation survives ONLY inside the bounded no-facet exception, never in the entry
    && !/"character_revelation": "</.test(pu),
  (pu.match(/.{0,50}(source_bridge|pc_archetype_reaction).{0,50}/) || ['(retired)'])[0]);
t('8b4: the PC lens is an ENUMERATED OPERATION, and a pulse is explicitly not one',
  /"pc_lens_operation" MUST be exactly one of these, verbatim/.test(pu)
    && /EMOTIONAL_CONCLUSION_BEFORE_EVIDENCE/.test(pu)
    && /INWARD_TRANSLATION_OF_ANOTHER_PERSONS_COST/.test(pu)
    && /A racing pulse, a tight chest, prickling skin or a held breath is a somatic event, not an operation/.test(pu),
  (pu.match(/pc_lens_operation" MUST be[\s\S]{0,200}/) || ['(missing)'])[0]);
t('8b4b: the operations offered are the PC MASK\'s, not another archetype\'s',
  /EMOTIONAL_CONCLUSION_BEFORE_EVIDENCE/.test(pu) && !/KEEP_AN_EXIT_OPEN/.test(pu),
  'Armored Fox operations must never appear in an Open Vein packet');
t('8b5: each candidate is a CONTIGUOUS packet that closes on itself',
  /⟂ Everything in this packet belongs to Julian ALONE/.test(pu)
    && /⟂ Everything in this packet belongs to Seren ALONE/.test(pu),
  (pu.match(/⟂ Everything in this packet[^\n]{0,60}/) || ['(missing)'])[0]);
t('8b6: guardrails travel INSIDE the packet they guard',
  /•\s*Julian[\s\S]{0,2000}READS THIS CHARACTER'S CANON FORBIDS[\s\S]{0,900}⟂ Everything in this packet belongs to Julian/.test(pu),
  (pu.match(/READS THIS CHARACTER'S CANON FORBIDS[\s\S]{0,220}/) || ['(missing)'])[0]);
t('8b7: the behaviour may not bring its own prop',
  /THE BEHAVIOUR USES ONLY WHAT IS ALREADY HERE/.test(pu)
    && /a blade, a knife, a bowl, a candle, a bell, a staff, a chalice/.test(pu));

// ══════════════════════════════════════════════════════════════════════════════════════
// 8c · THE FIRST PAID PROBE'S FAILURES ARE NOW PERMANENT REGRESSIONS
// Each string is what mistral-small-latest actually returned against a2c3a0b, with a
// mechanically valid facet_id. If any of these is ever accepted again, the binding has rotted.
// ══════════════════════════════════════════════════════════════════════════════════════
console.log('\n 8c · PROBE REGRESSIONS — the exact strings that got through before');
for (const [mutate, label] of [
  ['probeJulianContempt',     'Julian cited, Dohkar\'s psychology written: contempt + challenge to her authority'],
  ['probeJulianContemptOnly', '…the contempt clause alone, with the adversarial half removed'],
  ['probeJulianSuspicion',    '…and secret-knowledge, which his pre-Scene-8 guardrail already forbade'],
  ['probeSerenParaphrase',    'Seren\'s revelation restates "to perfect, not to survive" with the nouns swapped'],
  ['probeSerenNoEvidence',    '…and asserts "public correction" with a span this scene does not contain'],
  ['probeDohkarBlade',        'the Dohkar\'s beat brings a ceremonial blade into a rite with no machinery'],
  ['probeSerenBowl',          'the second probe\'s offering bowl, in a rite whose only offering is a memory'],
]) {
  const R = await run(mutate);
  const flagged = R.logs.some(l => /SCENE1:SKELETON:INVALID/.test(l)) && R.logs.some(l => /SCENE1:ABORT/.test(l));
  t(`8c "${mutate}" — ${label}`, flagged && R.author.length === 0,
    `flagged=${flagged} author=${R.author.length} ` + R.logs.filter(l=>/INVALID/.test(l)).slice(0,1).join('').slice(0,300));
}

console.log('\n 8d · THE INTENDED TRANSFORMATION');
{
  const F = await run('fixtureTransform');
  const fs2 = (F.author[0] || {}).system || '';
  t('8d1: Seren — truth backstage, action grounded, interpretation carried by the operation',
    /SOURCE TRUTH — DO NOT STATE: Her compassion is genuine but requires an audience/.test(fs2)
      && /VISIBLE ACTION — MUST OCCUR: she checks the faces of the crowd before she reaches for Lirael/.test(fs2)
      && /PC INTERPRETATION — MUST GOVERN THE NARRATION: INWARD_TRANSLATION_OF_ANOTHER_PERSONS_COST[^\n]*kindness waiting for permission/.test(fs2),
    (fs2.match(/•\s*Seren[\s\S]{0,420}/) || ['(missing)'])[0]);
  t('8d2: the Dohkar — the same construction, a different truth',
    /SOURCE TRUTH — DO NOT STATE: He cannot be bothered to pretend this ceremony deserves his attention/.test(fs2)
      && /VISIBLE ACTION — MUST OCCUR: he begins the next clause before the assembly has finished answering the first/.test(fs2)
      && /PC INTERPRETATION — MUST GOVERN THE NARRATION: EMOTIONAL_CONCLUSION_BEFORE_EVIDENCE[^\n]*reverence is not worth waiting for/.test(fs2),
    (fs2.match(/•\s*the presiding Dohkar[\s\S]{0,420}/) || ['(missing)'])[0]);
  t('8d3: the ACTION carries no psychological explanation of itself',
    !/VISIBLE ACTION — MUST OCCUR: [^\n]*\b(?:because|which (?:reveals|shows|means)|revealing that|as if to prove)\b/.test(fs2),
    (fs2.match(/VISIBLE ACTION[^\n]{0,140}/) || ['(none)'])[0]);
  t('8d4: no planner-authored finished C+ line is anywhere in the payload',
    !/reveals:/.test(fs2) && !/character revelation/i.test(fs2),
    (fs2.match(/.{0,60}reveals:.{0,60}/) || ['(none, correct)'])[0]);
}

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
