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
// Depth-1 keys of the dispatched opening_spine template. Mirrors the product's
// _openingSpineDeclaredFields; the product's own parser is asserted separately against the same
// dispatched text, so this local copy only has to agree with it, never to define the contract.
function declaredSpineKeys(usr) {
  const s = String(usr || '');
  const at = s.indexOf('"opening_spine"');
  if (at === -1) return [];
  const open = s.indexOf('{', at);
  const out = []; let depth = 0;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      let close = i + 1; while (close < s.length && s[close] !== '"') close++;
      let after = close + 1; while (after < s.length && /\s/.test(s[after])) after++;
      if (depth === 1 && s[after] === ':') {
        const key = s.slice(i + 1, close);
        if (/^[a-z_][a-z0-9_]*$/i.test(key) && !out.includes(key)) out.push(key);
      }
      i = close; continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) break; }
  }
  return out;
}

// The C+ CANDIDATE block as dispatched: canonical label -> permitted modes, authored facet ids,
// and each facet's applicability conditions. Read from the prompt so a reply can only cite what
// the request actually offered — the same discipline the validator enforces on the real planner.
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
    // facet_id: <id>  [category] … then one "pressure_id: <id>  →  <text>" line per condition.
    const fre = /^\s{6,}· facet_id: (\S+)\s+\[[a-z_]+\]([\s\S]*?)(?=^\s{6,}· facet_id: |^\s{6,}READS THIS|^\s{6,}⟂|$(?![\s\S]))/gm;
    let f; while ((f = fre.exec(chunk))) {
      facets.push(f[1]);
      const conds = [...f[2].matchAll(/pressure_id: (\S+)\s+→\s+([^\n]*)/g)]
        .map(m => ({ pressure_id: m[1], text: m[2].trim() }));
      pressures[f[1]] = conds[0] ? conds[0].pressure_id : '';
    }
    out[name.trim()] = { modes, facets, pressures };
  });
  return out;
}

function plannerReply(usr, mutate) {
  // The block is the PHYSICAL roster now ("ELIGIBLE CAST" conflated presence with C+
  // eligibility, which is the contradiction the candidate list resolves), and it no longer ends
  // on "Exactly one character_plus entry per name" — cardinality follows pressure.
  const m = usr.match(/STAGED ROSTER — PHYSICALLY ON STAGE \((\d+)\)[^\n]*\n([\s\S]*?)\nThese are the only people/);
  // BULLETS ONLY. A prose line that appeared between the header and the rule was parsed as a
  // cast member, which is exactly how a real consumer of this list would have failed too.
  const cast = m ? m[2].split('\n').filter(x => /^\s*•\s/.test(x)).map(x => x.replace(/^\s*•\s*/, '').trim()).filter(Boolean) : [];
  // SOLO is read from the DISPATCHED TEMPLATE, not passed in — so a reply that omits
  // interlocutor_placement is proof the template omitted it first.
  const SOLO = !/"interlocutor_placement"/.test(usr);
  const spine = { pressure_source_type:'institutional', pressure_source:L, hook_object:'the band',
    opening_beat:'She sets the relic down', rising_beats:['a','b'], decision_beat:'Does she name it',
    // opening_setting must AGREE with the seed's immutable WHERE — the fixture previously said
    // "the hall", which the new relocation check correctly rejects.
    pc_career:'shrine witness', opening_setting:'a Veilwood ceremony clearing', li_texture_beat:'He crosses toward her',
    pc_wound_anchor:L,
    pc_self_presentation_beat:'decision', scene_want:SCENE_WANT, scene_mission:L,
    reader_state:{ knows:L, believes:L, wondering:L, must_not_confuse:L },
    pc_body_callback:'decision', li_body_callback:'opening', antagonist_body_callback:null,
    perceptual_signature_beat:L,
    staged_characters: cast.map(n => ({ name:n, presence:'IN_PERSON', anchor_beat:'is already in place as the scene opens' })) };
  if (!SOLO) spine.interlocutor_placement = 'The Dohkar stands between';
  // A solo corridor has no seed, so the planner OWNS the setting — and a planner-owned setting
  // must declare its environmental inventory before E+ may reference it.
  const SOLO_ELS = ['the weighhouse ledger', 'a bolt of undyed cloth'];
  if (SOLO) { spine.opening_setting = 'customs house'; spine.environment_elements = SOLO_ELS.slice(); }
  // When the stage states a FIXED where, the plan must not relocate it. The seeded fixture's
  // Veilwood clearing is correct for the seed and wrong for an assignment-owned customs house.
  const FIXED_WHERE = (usr.match(/WHERE \(fixed\): ([^\n]+)/) || [])[1];
  if (!SOLO && FIXED_WHERE && !/Veilwood/.test(FIXED_WHERE)) spine.opening_setting = FIXED_WHERE.trim();
  // Angles are DISTINCT per recipient so "the directive renders each returned angle" is a real
  // claim rather than one string matching by accident.
  // Angles must now be RENDERABLE BEATS, not diagnoses, and E+/fusion targets must be things the
  // resolved scene actually contains. "spiralgrass" is in the First Sacrifice seed's WHERE.
  const ANCHOR = SOLO ? SOLO_ELS[0]
    : (FIXED_WHERE && !/Veilwood/.test(FIXED_WHERE)) ? FIXED_WHERE.trim()
    : 'the spiralgrass';
  // The PC's opening beat IS the fusion: one beat carries her C+, the E+ axis and the fusion, and
  // her staged anchor is that same beat. One source of truth for the opening.
  const PCN = cast[0];
  const POF_BEAT = `my thumb finds ${ANCHOR} where the rite has worn it smooth, and my rehearsed steadiness feels newly counterfeit`;
  // THE PROTAGONIST GETS NO C+ ENTRY (2026-08-26). Her first appearance is pc_opening_fusion,
  // and her accounting row is SYNTHESISED after validation — the planner never sends one.
  // ── DISCRIMINATING PSYCHOLOGY, NOT A GESTURE APIECE (2026-08-27) ──
  // The fixture is the contract's worked example, so it has to clear the bar the contract sets:
  // each read names a need, defense or expectation that would NOT survive being handed to the
  // person standing next to them. Reads are per-character, keyed off the First Sacrifice cast.
  const READS = {
    Julian: { behavior:`lets the assembly's noise arrive at him at the edge rather than moving into it`,
              character_revelation:`he does not need the clearing to register him, and the not-needing is the thing he has that everyone else here is still working for` },
    Seren:  { behavior:`checks the faces in the crowd twice before she kneels`,
              character_revelation:`she expected approving smiles and cannot begin until she has counted them; the empathy is real and it needs an audience` },
    'the presiding Dohkar':
            { behavior:`says the liturgy's final clause a half-beat faster than the rest`,
              // NOT a restatement of "routine ceremony rarely deserves his full attention" — that
            // attention" — that sentence IS the source. This is what the half-beat shows of it.
            character_revelation:`the half-beat is a measurement: he has said these words often enough to know exactly which of them nobody checks, and he spends what he saves on nothing at all` },
  };
  const READ_FALLBACK = n => ({ behavior:`${n} checks the youth's hands before the words`,
    character_revelation:`${n} learned to read hands before faces, and trusts what a body admits over what a mouth says` });
  // ── HER HALF (2026-08-27) ── the reception, which is a separate obligation from the
  // revelation and must reach the protagonist. First person, because this fixture is first person.
  const REACT = {
    Julian: `I had decided what his stillness meant before I had earned the right to decide it`,
    Seren:  `I wanted to be proud of her and could not find anywhere in myself to put it`,
    'the presiding Dohkar': `his boredom was in my chest before I had finished disagreeing with it`,
  };
  const REACT_FALLBACK = n => `I felt the room tilt toward ${n} before I understood why it had`;
  // The evidence span must be VERBATIM scene material. The WHERE line is exactly stage.setting,
  // so a slice of it is a real quotation rather than a composed one.
  const CO = corporaFromPrompt(usr);
  const E1 = (CO.facts[0] || {}).id;
  const OP = CO.ops[0];
  // ── THE TWO CITATIONS (2026-08-27) ──
  // A C+ assignment names WHICH opportunity carries it and WHICH authored facet it draws on.
  // These are the real ids from the First Sacrifice seed: a mock that invented them would prove
  // the validator accepts anything shaped like an id.
  // ── CITE WHAT THE REQUEST OFFERED, NOT WHAT WE REMEMBER (2026-08-27) ──
  // These were hard-coded per name, which is wrong twice: the same person has no authored
  // psychology in an UNSEEDED story (the duo fixture proved it — a citation for a facet that
  // does not exist there), and a hard-coded id cannot fail when the source stops supplying it.
  // Modes, facet ids and applicability conditions are read from the dispatched candidate block.
  const CAND = candidatesFromPrompt(usr);
  let cp = cast.filter(n => n !== PCN)
    .map(n => {
      const c = CAND[n] || {}; const fid = (c.facets || [])[0];
      const pr = fid ? ((c.pressures || {})[fid] || '') : '';
      const R = READS[n] || READ_FALLBACK(n);
      return { character:n, mode: ((c.modes || [])[0] || 'IN_PERSON'),
               ...(fid ? { facet_id: fid } : {}), ...(pr ? { pressure_id: pr } : {}),
               ...(pr && E1 ? { pressure_evidence_ids: [E1] } : {}),
               first_mention:true, behavior: R.behavior,
               // NO AUTHORED PSYCHOLOGY ON RECORD is the one case where the planner still writes
               // the read; where a facet EXISTS, sending one is the model rewriting canon, and the
               // request says so. The duo (unseeded) fixture is the whole no-facet population.
               ...(fid ? {} : { character_revelation: R.character_revelation }),
               behavior_object_ids: [], behavior_person_ids: [],
               ...(OP ? { pc_lens_operation: OP } : {}),
               pc_effect: REACT[n] || REACT_FALLBACK(n) };
    });
  // Anchors are the prefilled SENTINELS, copied back untouched, as the template asks.
  spine.staged_characters = spine.staged_characters.map(c =>
    ({ ...c, anchor_beat: c.name === PCN ? 'FROM_PC_OPENING_FUSION' : 'FROM_CHARACTER_PLUS' }));
  let pof = { character:PCN, placement:'PC_FIRST_EMBODIED_BEAT',
    character_angle:'rehearsed steadiness that does not survive contact',
    environment_target:ANCHOR, environment_axis:'ritual', beat:POF_BEAT };
  let ep = { target:ANCHOR, axis:'ritual',
             beat:`${ANCHOR} is worn smooth along one edge where the rite has been performed the same way for generations` };
  let fu = { character: cast[0], target:ANCHOR, beat:`she sets her palm flat on ${ANCHOR} to keep it still` };
  if (mutate === 'unknown')   cp = cp.concat([{ character:'Nobody Here', first_mention:true, behavior:'sets the cloth straight twice', character_revelation:'she needs the cloth to be the reason she is standing there, so no one asks why she came' }]);
  // CARDINALITY IS PRESSURE, NOT HEADCOUNT (2026-08-27): a candidate with no assignment used to
  // be a fault ("eligible recipient has NO character_plus assignment"). That rule was the
  // per-body quota, and it is retired — this mutation is now an ACCEPT case, tested as one.
  if (mutate === 'missing')   cp = cp.slice(0, Math.max(0, cp.length - 1));
  // ── THE CITATIONS THE ASSIGNMENT MUST MAKE ──
  if (mutate === 'cpNoMode')   cp = cp.map((c,i) => { if (i !== 0) return c; const { mode, ...r } = c; return r; });
  if (mutate === 'cpBadMode')  cp = cp.map((c,i) => i === 0 ? { ...c, mode:'RECALLED' } : c);   // she is in the room
  if (mutate === 'cpNoFacet')  cp = cp.map((c,i) => { if (i !== 0) return c; const { facet_id, ...r } = c; return r; });

  if (mutate === 'cpBadEvidence') cp = cp.map((c,i) => i === 0 ? { ...c, pressure_evidence_ids:['E999'] } : c);
  if (mutate === 'cpNoLensOp')  cp = cp.map((c,i) => { if (i !== 0) return c; const { pc_lens_operation, ...r } = c; return r; });
  if (mutate === 'cpBadObject') cp = cp.map((c,i) => i === 0 ? { ...c, behavior_object_ids:['O99'] } : c);
  if (mutate === 'cpBadPressureId') cp = cp.map((c,i) => i === 0 ? { ...c, pressure_id:'p_not_a_real_condition' } : c);
  if (mutate === 'cpProp')     cp = cp.map((c,i) => i === 0
    ? { ...c, behavior:'he taps the ceremonial blade against his thigh while the words run on' } : c);
  // ORDER-INDEPENDENT: cite a facet that is real but belongs to someone ELSE. Keyed off the
  // entry's own facet so a change in roster order cannot turn this into a valid citation — which
  // it silently did once, and the case passed by being correct.
  if (mutate === 'cpBadFacet') { const wrong = 'presiding_dohkar_ritual_contempt';
    const i0 = cp.findIndex(c => c.facet_id && c.facet_id !== wrong);
    if (i0 >= 0) cp = cp.map((c,i) => i === i0 ? { ...c, facet_id:wrong } : c); }
  if (mutate === 'duplicate') cp = cp.concat([cp[0]]);
  if (mutate === 'badaxis')   ep = { target:'the spiralgrass', axis:'vibes' };
  if (mutate === 'badfusion') fu = { character:'Nobody Here', target:'the spiralgrass', beat:'he sets his palm flat on the spiralgrass' };
  // ── scalar-invariant mutations ──
  if (mutate === 'withfusion')     fu = { character: cast[0], target:'the spiralgrass', beat:'she sets her palm flat on the spiralgrass to keep it still' };
  if (mutate === 'fmfalse')        cp = cp.map((c,i) => i === 0 ? { ...c, first_mention:false } : c);
  if (mutate === 'fmmissing')      cp = cp.map((c,i) => { if (i !== 0) return c; const { first_mention, ...r } = c; return r; });
  if (mutate === 'fmstring')       cp = cp.map((c,i) => i === 0 ? { ...c, first_mention:'false' } : c);
  if (mutate === 'emptyangle')     cp = cp.map((c,i) => i === 0 ? { ...c, behavior:'   ' } : c);
  if (mutate === 'placeholderang') cp = cp.map((c,i) => i === 0 ? { ...c, behavior:'N/A' } : c);
  if (mutate === 'thinangle')      cp = cp.map((c,i) => i === 0 ? { ...c, behavior:'is sad' } : c);
  if (mutate === 'noep')           ep = undefined;
  if (mutate === 'emptyeptarget')  ep = { target:'   ', axis:'ritual' };
  if (mutate === 'fusionmismatch') fu = { character: cast[0], target:'the window casement', beat:'she sets her palm on the casement' };
  if (mutate === 'fusionempty')    fu = { character: cast[0], target:'   ', beat:'she sets her palm flat to keep it still' };
  // ── revised planning-contract mutations (2026-08-25) ──
  if (mutate === 'diagnosisangle') cp = cp.map((c,i) => i === 0 ? { ...c, behavior:'a woman clinging to the illusion of worthiness' } : c);
  if (mutate === 'diagnosisangle2') cp = cp.map((c,i) => i === 0 ? { ...c, behavior:'an authority whose judgment will decide her fate' } : c);
  if (mutate === 'offsceneEp')     ep = { target:'the gallery hallway', axis:'damage' };
  if (mutate === 'relocate')       spine.opening_setting = 'a gallery hallway';
  // A bare null with no reason and NOTHING to supersede it: the obligation is simply dropped.
  if (mutate === 'fusionnull')     { fu = null; pof = null; }
  // …but a null standalone fusion beside a VALID pc_opening_fusion is the new contract, not a
  // fault: the opening beat discharges the obligation. This one must be ACCEPTED.
  if (mutate === 'fusionNullPof')  fu = null;
  if (mutate === 'fusionbadcode')  fu = { character:null, target:null, impossible_because:'DIDNT_FEEL_RIGHT' };
  if (mutate === 'fusionfalsecode') fu = { character:null, target:null, impossible_because:'NO_ONSTAGE_CHARACTER' };
  if (mutate === 'fusionnobeat')   fu = { character: cast[0], target:'the spiralgrass' };
  if (mutate === 'fusionthinbeat') fu = { character: cast[0], target:'the spiralgrass', beat:'they connect' };
  // ── identity / grounding / envelope mutations (2026-08-25) ──
  // Aliases the planner really used live: "the narrator" for the PC, "Dohkar" for the role figure.
  if (mutate === 'aliasNarrator')  cp = cp.map((c,i) => i === 0 ? { ...c, character:'the narrator' } : c);
  if (mutate === 'aliasProtag')    cp = cp.map((c,i) => i === 0 ? { ...c, character:'the protagonist' } : c);
  if (mutate === 'aliasDohkar')    cp = cp.map(c => /presiding/i.test(c.character) ? { ...c, character:'Dohkar' } : c);
  if (mutate === 'aliasOffstage')  cp = cp.concat([{ character:'the narrator’s absent mother', first_mention:true, behavior:'sets the cloth straight twice', character_revelation:'she needs a task that keeps her hands in the room and her eyes out of it' }]);
  // ── THE ROUND-12 GESTURES THEMSELVES (2026-08-27) ──
  // Every one of these passed the old contract. "Camera-recordable" was the acceptance ceiling
  // when it was only the floor: three interchangeable gestures, no revelation between them.
  // ── THE PORTFOLIO'S OWN FAILURE MODE (2026-08-27) ──
  // With five truths on one person, the cheapest wrong answer is to take the FIRST facet and
  // hang it on whatever evidence the scene happens to contain. Here the Dohkar's contempt is
  // cited over a fact about JULIAN — real evidence id, real pressure id, wrong truth. The
  // predicate is proven directly in _cplus_multifacet; this proves the VALIDATOR reaches it.
  // ── GUARDRAIL SCOPE, BOTH POLARITIES (2026-08-28) ──
  // His contempt facet forbids "cares deeply". His kindness facet REQUIRES something very like
  // it. A record-wide ban would reject the second, so the ban is scoped — and a scope is only
  // proven by showing it fires for its own facet and stays silent for the other.
  if (mutate === 'caringOnKindnessFacet' || mutate === 'caringOnContemptFacet') {
    const wantK = mutate === 'caringOnKindnessFacet';
    const barefoot = (CO.facts.filter(f => /barefoot|nothing|guest/i.test(f.text))[0] || {}).id;
    const rite     = (CO.facts.filter(f => /ceremon|rite|generations/i.test(f.text))[0] || {}).id;
    cp = cp.map(c => /Dohkar/i.test(c.character)
      ? { ...c,
          facet_id: wantK ? 'presiding_dohkar_kindness_to_the_poor' : 'presiding_dohkar_ritual_contempt',
          pressure_id: wantK ? 'p_someone_present_who_came' : 'p_rite_he_has_performed',
          pressure_evidence_ids: [wantK ? barefoot : rite].filter(Boolean),
          behavior: 'he steps aside for the guest at the edge like someone who cares deeply where they stand' }
      : c);
  }
  if (mutate === 'contemptOverJealousyEvidence') {
    const jul = (CO.facts.filter(f => /Julian|observer|edge/i.test(f.text))[0] || {}).id;
    cp = cp.map(c => /Dohkar/i.test(c.character) && jul
      ? { ...c, facet_id: 'presiding_dohkar_ritual_contempt',
          pressure_id: 'p_procedural_step_nobody_checks', pressure_evidence_ids: [jul] }
      : c);
  }
  if (mutate === 'readMissing')   cp = cp.map((c,i) => i === 0 ? (({ behavior, ...r }) => r)(c) : c);
  if (mutate === 'readVoiceDrops') cp = cp.map((c,i) => i === 0
    ? { ...c, behavior:'his voice drops to a murmur as he intones the final clause', character_revelation:'he speaks more quietly at the end' } : c);
  if (mutate === 'readBreathHitch') cp = cp.map((c,i) => i === 0
    ? { ...c, behavior:'her breath hitches when the Dohkar says the name', character_revelation:'she is nervous about what is coming' } : c);
  if (mutate === 'readFingersFlex') cp = cp.map((c,i) => i === 0
    ? { ...c, behavior:'his fingers flex once at his side', character_revelation:'a quiet tension runs through him' } : c);
  if (mutate === 'readIsAction')  cp = cp.map((c,i) => i === 0
    ? { ...c, character_revelation:'she presses her palm flat against the table to keep it still' } : c);
  if (mutate === 'readShared')    cp = cp.map(c =>
    ({ ...c, character_revelation:'they expect the rite to go badly and have already decided who to blame' }));

  // ── ROUND 12, THE REAL SAMPLE: TWO FALSE POSITIVES AND ONE MISSED DEFECT ──
  // A five-token target ("the white weeping-willow veil-canopy") is NAMED perfectly well by its
  // head noun, and scored 0.20 against a 0.34 floor — two valid fields rejected. And the sentinel
  // came back as "pc_opening_fusion" rather than "FROM_PC_OPENING_FUSION": the same pointer,
  // doing the same job. All three of these must now be ACCEPTED.
  if (mutate === 'longTargetHeadNoun') {
    const LONG = 'the long white weeping-willow veil-canopy';
    ep = { target:LONG, axis:'ritual',
           beat:`the canopy hangs lower on one side where hands have pulled it aside for generations` };
    pof = { ...pof, environment_target:LONG, environment_axis:'ritual',
            beat:`the canopy's leaves brush my shoulder and I hold still under them` };
    fu = undefined;
  }
  if (mutate === 'sentinelSpelling') spine.staged_characters = spine.staged_characters.map(c =>
    ({ ...c, anchor_beat: c.name === PCN ? 'pc_opening_fusion' : 'character_plus' }));
  // …while the defect NOTHING caught stays rejected: the angle staging a second action elsewhere.
  if (mutate === 'angleSecondAction') pof = { ...pof,
    character_angle:'her bare feet press into the ledger-slate, feeling the cold fibers coil around her arches' };
  // The first attempt at that check inverted the concreteness detector and rejected THIS — a
  // textbook reading. The accept-case is the guard against reaching for a blunt instrument again.
  if (mutate === 'angleIsAReading') pof = { ...pof,
    character_angle:'a composure she has practised since childhood, thinning at the edges' };

  // ── THE SINGLE-SOURCE CONTRACT (2026-08-26, round 12) ──
  // A PC character_plus entry is a SECOND opening beat, and the planner is no longer asked for
  // one. An anchor the planner wrote over the sentinel is the same defect a field lower down.
  if (mutate === 'pcInCp')        cp = cp.concat([{ character:PCN, first_mention:true, behavior:'presses her palm to the spiralgrass', character_revelation:'she needs the ground to hold still because nothing else will' }]);
  if (mutate === 'pcAnchorOwn')   spine.staged_characters = spine.staged_characters.map(c =>
    c.name === PCN ? { ...c, anchor_beat:'stands at the edge of the circle counting the petitioners' } : c);
  if (mutate === 'nonPcAnchorOwn') spine.staged_characters = spine.staged_characters.map(c =>
    c.name !== PCN ? { ...c, anchor_beat:'watches the horizon for the light to fail' } : c);
  // The remaining way to return nothing once every worked example is gone.
  if (mutate === 'epSchemaEcho')  ep = { target:ANCHOR, axis:'ritual',
    beat:'<TARGET + PHYSICAL CHANGE CAUSED BY THE AXIS + MATERIAL TRACE VISIBLE IN THIS SCENE>' };
  if (mutate === 'epCategoryEcho') ep = { target:ANCHOR, axis:'ritual',
    beat:'the target shows physical change from the axis, a material trace' };
  if (mutate === 'pofSchemaEcho') pof = { ...pof, beat:'<ONE concrete beat in which the environment REVEALS her>' };

  // ── THE GAPS THE FIRST REAL SAMPLE EXPOSED (2026-08-26, round 11) ──
  // Live Mistral returned NO standalone fusion. Every cross-field coherence check was nested
  // inside `if (_norm.fusion)`, so none of them ran, and a plan whose opening beat touched the
  // spiralgrass while declaring the veil-canopy was accepted. The mock had always sent a fusion,
  // which is exactly why the suite could not see it. These mutations omit it, as the real one did.
  if (mutate === 'pofOffTarget') {
    fu = undefined;                                    // as live: no standalone fusion at all
    pof = { ...pof, beat: `my thumb finds the ledger-slate where the rite has worn it smooth, and my rehearsed steadiness feels newly counterfeit` };
  }
  if (mutate === 'noFusionNoEpBeat') {
    fu = undefined;
    ep = { target:ANCHOR, axis:'ritual' };             // E+ with no evidence, and nothing to hide behind
  }
  // The live reply staged all four people with anchor_beat "opening_beat" — the FIELD NAME.
  if (mutate === 'anchorPlaceholder') {
    spine.staged_characters = spine.staged_characters.map(c => ({ ...c, anchor_beat:'opening_beat' }));
  }
  if (mutate === 'anchorEmpty') {
    spine.staged_characters = spine.staged_characters.map(c =>
      c.name === PCN ? { ...c, anchor_beat:'   ' } : c);
  }
  if (mutate === 'clothEp') {
    // Canonically in-scene, but described ONLY in seed.sceneOne.narrator. The whole assignment
    // moves together: E+ carries its evidence and the opening fusion points at the same thing.
    const CLOTH = 'the gossamer band';
    const CLOTH_BEAT = `my thumb finds ${CLOTH} where the rite has worn it smooth, and my rehearsed steadiness feels newly counterfeit`;
    ep = { target:CLOTH, axis:'ritual',
           beat:`${CLOTH} is worn thin along one edge where the rite has been performed the same way for generations` };
    fu = { character: cast[0], target:CLOTH, beat:'she tugs the band tighter until the knot bites' };
    pof = { ...pof, environment_target:CLOTH, environment_axis:'ritual', beat:CLOTH_BEAT };
  }
  const skel = { character_plus:cp, fusion:fu };
  if (pof) skel.pc_opening_fusion = pof;   // a null pof omits the KEY, as a planner omission would
  if (ep !== undefined) skel.environment_plus = ep;   // `noep` omits the KEY, not just the value

  // ENVELOPE SHAPES. `nested` is what the live planner produced in 1 of 3 samples;
  // `stagedTop` is what the live CORRIDOR sample produced.
  if (mutate === 'stagedTop') {
    const { staged_characters, ...rest } = spine;
    return JSON.stringify({ opening_spine: rest, staged_characters, scene_skeleton: skel });
  }
  if (mutate === 'stagedBoth')  return JSON.stringify({ opening_spine: spine, staged_characters: spine.staged_characters, scene_skeleton: skel });
  // DIFFERING counterparts (2026-08-26): identical duplicates collapse, any difference aborts.
  if (mutate === 'stagedBothDiff') return JSON.stringify({ opening_spine: spine,
    staged_characters: spine.staged_characters.map(c => ({ ...c, presence:'ON_PHONE' })), scene_skeleton: skel });
  // The round-4 live shape: the spine distributed across the envelope's top level. Only fields the
  // template ACTUALLY declares for this request are distributed — several spine fields are emitted
  // conditionally, and an undeclared field at top level is a schema fault by design, not drift.
  if (mutate === 'spread') {
    const declared = declaredSpineKeys(usr);
    const top = {}, nested = {};
    Object.keys(spine).forEach(k => { (declared.includes(k) ? top : nested)[k] = spine[k]; });
    return JSON.stringify(Object.assign({ opening_spine: nested }, top, { scene_skeleton: skel }));
  }
  // Same drift, but semantically invalid — reconciliation must not rescue it.
  if (mutate === 'spreadBadCast') {
    // Distribute only DECLARED fields, so the envelope reconciles cleanly and the plan reaches the
    // SEMANTIC validators — the point being that reconciliation must not rescue an off-roster cast.
    const declared = declaredSpineKeys(usr);
    const top = {}, nested = {};
    Object.keys(spine).forEach(k => { (declared.includes(k) ? top : nested)[k] = spine[k]; });
    const bad = { ...skel, character_plus: skel.character_plus.concat([{ character:'Nobody Here', first_mention:true, behavior:'sets the cloth straight twice', character_revelation:'she needs the cloth to be the reason she is standing there' }]) };
    return JSON.stringify(Object.assign({ opening_spine: nested }, top, { scene_skeleton: bad }));
  }
  // ── FIXED-CAST mutations (2026-08-26): staged_characters is a prefilled echo, not a choice ──
  if (mutate === 'stagedAdded')    spine.staged_characters = spine.staged_characters.concat([{ name:'Mateo', presence:'IN_PERSON', anchor_beat:'leans in the doorway' }]);
  if (mutate === 'stagedOmitted')  spine.staged_characters = spine.staged_characters.slice(0, -1);
  if (mutate === 'stagedRenamed')  spine.staged_characters = spine.staged_characters.map((c,i) => i === 1 ? { ...c, name:'Serena' } : c);
  if (mutate === 'stagedPresence') spine.staged_characters = spine.staged_characters.map((c,i) => i === 1 ? { ...c, presence:'OFFSTAGE_REFERENCED' } : c);
  if (mutate === 'stagedReordered') spine.staged_characters = spine.staged_characters.slice().reverse();
  if (mutate === 'stagedAliased')  spine.staged_characters = spine.staged_characters.map(c => /presiding/i.test(c.name) ? { ...c, name:'Dohkar' } : c);
  // ── INVENTED-IDENTITY mutations (2026-08-26): the exact round-6 corridor failure, field by
  //    field. None of these touches staged_characters / character_plus / fusion, so each one is
  //    invisible to the fixed-cast validator and must be caught by the plan-wide scanner.
  if (mutate === 'quinnWant')     spine.scene_want = 'wants Quinn to notice the dye on her sleeves so she hesitates before speaking';
  if (mutate === 'quinnMission')  spine.scene_mission = 'Convince Quinn to delay the verdict long enough to let her remember what she swore';
  if (mutate === 'quinnReader')   spine.reader_state = { ...spine.reader_state, must_not_confuse:'who is speaking the verdict (the magistrate, not Quinn), that the door is closed' };
  if (mutate === 'quinnWonder')   spine.reader_state = { ...spine.reader_state, wondering:'whether Quinn will keep the ledger closed' };
  if (mutate === 'quinnInterloc') spine.interlocutor_placement = "Quinn — the magistrate's clerk, a woman who has known her since the dye-shop days";
  if (mutate === 'quinnAnchor')   spine.staged_characters = spine.staged_characters.map((c,i) => i === 0 ? { ...c, anchor_beat:'waits while Quinn taps her pen against her teeth' } : c);
  if (mutate === 'quinnFusion')   skel.fusion = { ...skel.fusion, beat:`she presses her palm flat on ${ANCHOR} while Quinn watches from the doorway` };
  // ESTABLISHED OFFSTAGE reference — Julian is a known story person, NOT an invention. Allowed.
  if (mutate === 'julianRef')     spine.scene_want = 'wants to be gone before Julian arrives to collect what she owes';
  // ── SOLO-INTERACTION mutations (2026-08-26): a second person ACTING, with no name invented.
  //    Rounds 7 and 8 shipped exactly these and the proper-name scanner was rightly silent.
  if (mutate === 'rivalSpeaks')   spine.scene_mission = 'keep the ledger unopened until the rival finishes speaking';
  if (mutate === 'clerkCalls')    spine.reader_state = { ...spine.reader_state, knows:'she is alone in the customs house while a clerk calls from outside the door' };
  if (mutate === 'voiceOutside')  spine.opening_beat = 'a voice outside the door rises as she sets the ledger down';
  if (mutate === 'liveMessage')   spine.decision_beat = 'a message arrives and she has to decide whether to break the seal';
  if (mutate === 'waitMessenger') spine.scene_want = 'wants to wait for the messenger without letting her hands shake';
  if (mutate === 'guardConvince') spine.scene_mission = 'Convince the guard to let her past the weighhouse door';
  // ── ALLOWED: memory, thought, anticipation, documents, environment ──
  if (mutate === 'memoryJulian')  spine.scene_want = 'wants to stop remembering how Julian set the pen down with both hands';
  if (mutate === 'thinkJulian')   spine.reader_state = { ...spine.reader_state, wondering:"why Julian's name keeps surfacing in her thoughts under pressure" };
  if (mutate === 'prepareJulian') spine.scene_mission = 'Prepare what she will say to Julian when he comes to collect the debt';
  if (mutate === 'letterJulian')  spine.opening_beat = 'an old letter from Julian, folded twice, still tucked in the ledger';
  if (mutate === 'windSound')     spine.opening_beat = 'wind moves through the shutters and the tally-marks blur under her thumb';
  if (mutate === 'interlocOffstage') spine.interlocutor_placement = 'Julian — the man she owes, his jaw set the way it goes when he has already decided';
  if (mutate === 'julianStaged')  spine.staged_characters = spine.staged_characters.concat([{ name:'Julian', presence:'IN_PERSON', anchor_beat:'leans in the doorway' }]);
  if (mutate === 'unknownKey')  return JSON.stringify({ opening_spine: spine, scene_skeleton: skel, pc_body_bible: { invented: true } });
  if (mutate === 'stagedThin')  { const { staged_characters, ...rest } = spine;
                                  return JSON.stringify({ opening_spine: rest, staged_characters: [{ presence_mode:'IN_PERSON' }], scene_skeleton: skel }); }
  if (mutate === 'nested')       return JSON.stringify({ opening_spine: { ...spine, scene_skeleton: skel } });
  if (mutate === 'dupSkeleton')  return JSON.stringify({ opening_spine: { ...spine, scene_skeleton: skel }, scene_skeleton: skel });
  if (mutate === 'dupSkeletonBadCast') { const bad = { ...skel, character_plus: skel.character_plus.concat([{ character:'Nobody Here', first_mention:true, behavior:'sets the cloth straight twice', character_revelation:'she needs the cloth to be the reason she is standing there' }]) };
                                        return JSON.stringify({ opening_spine: { ...spine, scene_skeleton: bad }, scene_skeleton: bad }); }
  if (mutate === 'dupSkeletonDiff') return JSON.stringify({ opening_spine: { ...spine, scene_skeleton: { ...skel, fusion: null } }, scene_skeleton: skel });
  if (mutate === 'nestedThin')   return JSON.stringify({ opening_spine: { ...spine, scene_skeleton: { fusion: null } } });
  // A planner reply that will not parse is the same failure class as an invalid one: the
  // author must not be called. This is the shape the LIVE run actually produced.
  if (mutate === 'unparseable') return 'I was unable to produce a plan for this scene.';
  return JSON.stringify({ opening_spine: spine, scene_skeleton: skel });
}

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };
const count = (h, n) => (String(h).split(n).length - 1);

// ══════════════════════════════════════════════════════════════════════════════════════════
// ONE BROWSER, ONE CONTEXT PER CASE (2026-08-27)
//
// This suite used to LAUNCH A CHROMIUM PER CASE — around sixty per run — which is where its
// memory and most of its twelve minutes went. The fix is not to share a page: a page carries
// window state, storage, globals and the product's own module-level caches, and reusing one
// would trade a resource problem for silent cross-case contamination, which in a suite whose
// whole job is proving delivery would be much worse.
//
// A CONTEXT is the isolation boundary Playwright actually guarantees — separate storage,
// cookies, and a fresh page with fresh globals — at a fraction of a browser's cost. Each case
// gets its own and closes it in `finally`, including on a failure or a timeout, so nothing is
// left behind. Cases stay SERIAL: the product writes to one dev server and one console stream.
// ══════════════════════════════════════════════════════════════════════════════════════════
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
let _closing = false;
const closeBrowser = async () => { if (_closing) return; _closing = true; try { await browser.close(); } catch (_) {} };
// A throw anywhere must not strand Chromium children — the old suite left them behind on every
// timeout, and that is the other half of the memory story.
process.on('uncaughtException', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('unhandledRejection', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('exit', () => { try { browser.close(); } catch (_) {} });

async function run({ hot, mutate, solo, duo, pollute }) {
  const ctx = await browser.newContext();
  try {
  const page = await ctx.newPage();
  page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
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
  // 400, not 220: a fault list is truncated by this line, and a needle assertion that reads the
  // truncated text reports a check as broken when the check fired and the tail was cut.
  page.on('console', m => { const x=m.text(); if (/SCENE1:|SKELETON|PLANNER/.test(x)) logs.push(x.slice(0,400)); });
  page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0,200)));

  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout:120000 });
  const res = await page.evaluate(async ({ solo, duo, pollute }) => {
    const s = window.state;
    // ISOLATION SELF-CONTROL. Measured FIRST, before anything this case does: if a previous
    // case's pollution were visible here, context isolation is not doing its job and every
    // other result in this suite is suspect.
    let sentinelSeen = false;
    try { sentinelSeen = (typeof window.__ISOLATION_SENTINEL !== 'undefined')
                      || !!window.localStorage.getItem('__isolation_sentinel'); } catch (_) {}
    // observer: capture what the audit sees, to compare against the dispatched bytes
    const def = (window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
    s.picks = s.picks||{};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>{ s.picks[k]=def[k]; });
    Object.assign(s,{ world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
      archetype:{primary:def.archetype,modifier:null},
      name:'Lirael', playerName:'Lirael', loveInterestName:'Julian', partnerName:'Julian', loveInterest:'Male',
      liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true,
      fortunes:9999999, intensity:'Steamy', pov:'first_person', identity:{playerName:'Lirael',partnerName:'Julian'},
      renderMode:'literary', currentEngine:'literary', storyId:'skeldeliv', myUid:'probe' });
    // SOLO: no seed. Nothing states presence, so the stage contract fixes it to the narrator
    // alone. Julian stays the story's love interest, i.e. an ESTABLISHED OFFSTAGE person — which
    // is exactly what lets us prove "may be referenced, may not be staged".
    if (duo) {
      // An ASSIGNMENT-owned two-person stage: Lirael and Seren are stated participants, so
      // presence is 'assignment'. Julian stays the love interest and therefore OFFSTAGE — which
      // is what lets us prove an offstage person may not be promoted to interlocutor.
      window.STARTER_PLANS['test_duo'] = { scenes: [{ n:1,
        goal:'She counts what she has already signed for', setting:'the customs house',
        participants:['Lirael', 'Seren'] }] };
      s._starterId = 'test_duo';
    } else if (solo) {
      s._scene1Mission = 'She waits alone in the customs house before the tide turns, counting what she has already signed for';
    } else {
      Object.assign(s, { _starterId: def.id, is_starter_story: true, immutableTitle: def.title });
    }
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
        ? (window._scene1StageContract(s).onStage || []).map(c => c.label)
        : (window._sceneEligibleCast ? window._sceneEligibleCast(s, 1) : null)),
      assignments: s._scene1SceneAssignments || null,
      staged: s._scene1StagedCharacters || null,
      skeleton: s.sceneSkeleton ? { cp: s.sceneSkeleton.character_plus, ep: s.sceneSkeleton.environment_plus, fu: s.sceneSkeleton.fusion, pof: s.sceneSkeleton.pc_opening_fusion } : null,
      auditSystem: (s._lastScene1AuditPrompt && s._lastScene1AuditPrompt.system) || null,
      fingerprint: window.__scene1RequestFingerprint || null,
      sentinelSeen: sentinelSeen,
      polluted: (function () {
        if (!pollute) return false;
        try { window.__ISOLATION_SENTINEL = 1; window.localStorage.setItem('__isolation_sentinel', '1');
              window.state.__isolationJunk = 'this must not survive'; return true; } catch (_) { return false; }
      })() };
  }, { solo: !!solo, duo: !!duo, pollute: !!pollute });
  return { planner, author, escaped, unknown, logs, ...res };
  } finally { await ctx.close().catch(() => {}); }
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
  // Not an obligation any more — cardinality follows pressure. This fixture assigns one per
  // candidate, so it still proves NOTHING IS TRUNCATED between planner and normaliser.
  t(`${label} 3: the fixture's full C+ set survives delivery, none truncated`,
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
  // The PC's entry is ACCOUNTING, not an assignment: no angle, by contract. Everyone else owes one.
  t(`${label} 11b: delivered — every non-PC C+ carries BOTH a behavior and a read`,
    cp.filter(c => c.fulfilled_by !== 'pc_opening_fusion').length > 0
      && cp.filter(c => c.fulfilled_by !== 'pc_opening_fusion').every(c =>
        String(c.behavior||'').trim().split(/\s+/).length >= 3
        && String(c.psychological_read||'').trim().split(/\s+/).length >= 4),
    JSON.stringify(cp.map(c => [c.character, c.behavior, c.psychological_read])));
  t(`${label} 11b3: no two characters were handed the same reading`,
    (() => { const rs = cp.filter(c => c.psychological_read).map(c => c.psychological_read);
             return rs.length === new Set(rs).size; })(),
    JSON.stringify(cp.map(c => c.psychological_read)));
  t(`${label} 11b2: the PC's entry is an ACCOUNTING row — present, first_mention, no angle`,
    (() => { const p = cp.filter(c => c.fulfilled_by === 'pc_opening_fusion')[0];
             return !!p && p.first_mention === true && !String(p.angle || '').trim(); })(),
    JSON.stringify(cp.filter(c => c.fulfilled_by === 'pc_opening_fusion')));
  t(`${label} 11c: delivered — E+ target nonempty, axis in the allowlist`,
    !!(ep && String(ep.target||'').trim() && EP_AXES.includes(String(ep.axis||''))),
    JSON.stringify(ep));
  t(`${label} 11d: delivered — fusion character eligible, target nonempty, target === E+ target`,
    !!(fu && R.eligible && R.eligible.map(tnorm).includes(tnorm(fu.character))
       && String(fu.target||'').trim() && tnorm(fu.target) === tnorm(ep && ep.target)),
    JSON.stringify({ fu, epTarget: ep && ep.target }));

  // ── the same values, verbatim, in the bytes handed to Grok ──
  t(`${label} 11e: EVERY behavior AND read renders verbatim in the outgoing system prompt`,
    cp.length > 0 && cp.filter(c => c.psychological_read).every(c =>
      sys.includes(c.behavior) && sys.includes(c.psychological_read)),
    JSON.stringify(cp.filter(c => c.psychological_read && !(sys.includes(c.behavior) && sys.includes(c.psychological_read)))
      .map(c => c.character)));
  // ── THE THREE COMPONENTS, RENDERED APART (2026-08-27) ──
  // They used to share one line, which is a single overloaded "write a C+ beat" instruction and
  // produces "They did X. I realised this meant Y." Each now has its own standing.
  t(`${label} 11e2: SOURCE TRUTH / VISIBLE ACTION / PC INTERPRETATION are separate, once each`,
    cp.filter(c => c.psychological_read).length > 0
      && cp.filter(c => c.psychological_read).every(c =>
           count(sys, `SOURCE TRUTH — DO NOT STATE: ${c.psychological_read}`) === 1
           && count(sys, `VISIBLE ACTION — MUST OCCUR: ${c.behavior}`) === 1)
      && count(sys, 'PC INTERPRETATION — MUST GOVERN THE NARRATION:')
           === cp.filter(c => c.psychological_read).length,
    JSON.stringify(sys.split('\n').filter(l => /SOURCE TRUTH|VISIBLE ACTION|PC INTERPRETATION/.test(l)).slice(0, 4)));
  t(`${label} 11e3: the SOURCE TRUTH is the backend record, and is marked never-to-state`,
    cp.filter(c => c.facet_source === 'trusted-record').length > 0
      && cp.filter(c => c.facet_source === 'trusted-record').every(c =>
           sys.includes(`SOURCE TRUTH — DO NOT STATE: ${c.facet_truth}`)),
    JSON.stringify(cp.map(c => [c.character, c.facet_source])));
  t(`${label} 11e4: the RECONSTRUCTION instruction reaches this author path`,
    /RECONSTRUCT each of these into ONE OR TWO natural sentences of finished prose/.test(sys)
      && /The SOURCE TRUTH governs accuracy and must remain UNSTATED/.test(sys)
      && /DO NOT write the action and then append an explanatory diagnosis of it/.test(sys)
      && /They did X\. I realised this meant Y\./.test(sys),
    (sys.match(/RECONSTRUCT each of these[^\n]{0,90}/) || ['(missing)'])[0]);
  t(`${label} 11e5: …offering several realisation shapes, not one template`,
    count(sys, 'the action, then one brief focalised inference') === 1
      && count(sys, 'the interpretation folded into how the action is described') === 1
      && count(sys, 'a consequence that makes her reading legible without naming it') === 1);
  t(`${label} 11e6: the facet PORTFOLIO and condition list never reach the author`,
    !/AUTHORED PSYCHOLOGY/.test(sys) && !/applicability conditions/.test(sys)
      && !/pressure_id:/.test(sys) && !/facet_id:/.test(sys),
    (sys.match(/.{0,60}(AUTHORED PSYCHOLOGY|applicability conditions|pressure_id:).{0,60}/) || ['(none, correct)'])[0]);
  t(`${label} 11f: every C+ recipient renders on a first-mention-tagged line`,
    cp.length > 0 && cp.every(c => new RegExp(`•\\s*${c.character.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\(first mention`).test(sys)),
    'a recipient rendered without the first-mention tag');
  t(`${label} 11g: E+ target AND axis render verbatim on the ENVIRONMENT+ line`,
    (() => { const line = (sys.split('\n').find(l => l.includes('ENVIRONMENT+ ASSIGNED THIS SCENE')) || '');
             return !!ep && line.includes(ep.target) && line.includes(ep.axis); })(),
    JSON.stringify(sys.split('\n').find(l => l.includes('ENVIRONMENT+ ASSIGNED THIS SCENE')) || null));
  // ── THE OPENING BEAT IS THE DELIVERED FUSION (2026-08-26) ──
  // Validating pc_opening_fusion proves nothing on its own: the Scene-1 handoff copies the
  // skeleton field by field, so an assignment can pass every check and never reach the author.
  // These assert the BYTES.
  const pof = R.skeleton && R.skeleton.pof;
  t(`${label} 11h: the PC opening beat renders verbatim in the outgoing system prompt`,
    !!(pof && pof.beat) && sys.includes(pof.beat)
      && /PROTAGONIST OPENING BEAT \(HARD/.test(sys),
    JSON.stringify({ beat: pof && pof.beat, present: !!(pof && sys.includes(pof.beat)),
                     block: /PROTAGONIST OPENING BEAT/.test(sys) }));
  t(`${label} 11h2: it carries its placement, its angle and the E+ axis`,
    /PC_FIRST_EMBODIED_BEAT|FIRST embodied action or sensory response/.test(sys)
      && !!(pof && pof.character_angle) && sys.includes(pof.character_angle)
      && !!(pof && pof.environment_target) && sys.includes(pof.environment_target)
      && new RegExp('axis of ' + String(pof && pof.environment_axis)).test(sys),
    JSON.stringify(sys.split('\n').filter(l => /↳/.test(l)).slice(0, 4)));
  t(`${label} 11h3: the SUPERSEDED standalone FUSION line is not also sent`,
    count(au ? au.system : '', 'FUSION — one sentence') === 0,
    `the author received BOTH an opening beat and a competing fusion line`);
  t(`${label} 11h4: the E+ evidence beat renders, not just target + axis`,
    !!(ep && ep.beat) && sys.includes(ep.beat) && /THE EVIDENCE TO RENDER/.test(sys),
    JSON.stringify({ beat: ep && ep.beat }));
  // The block header, not the phrase: the C+ roster and the E+ block both POINT at the opening
  // beat by name, and a cross-reference is what stops a second obligation, not one more copy.
  t(`${label} 11i: still exactly ONE skeleton block, with ONE opening-beat BLOCK in it`,
    au && count(au.system, 'Narrative skeleton for this scene:') === 1
      && count(au.system, 'PROTAGONIST OPENING BEAT (HARD') === 1
      && !!(pof && pof.beat) && count(au.system, pof.beat) === 1,
    `skel=${au && count(au.system,'Narrative skeleton for this scene:')} block=${au && count(au.system,'PROTAGONIST OPENING BEAT (HARD')} beat=${au && pof && count(au.system, pof.beat)}`);
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
    !(st.onStage || []).some(c => !new RegExp(String(c.label).replace(/^the presiding /, ''), 'i')
      .test(st.presentText + ' ' + (st.pcName || ''))),
    JSON.stringify({ present: (st.presentText || '').slice(0, 90), onStage: (st.onStage || []).map(c => c.label) }));

  // The planner must RECEIVE the authority it was missing — this is the whole root cause.
  t(`12d: the planner request carries the immutable WHERE`,
    /THE SCENE'S STAGE — WHO OWNS WHAT/.test(pu) && /WHERE \(fixed\):/.test(pu) && /Veilwood/i.test(pu),
    `WHERE=${/WHERE \(fixed\):/.test(pu)} Veilwood=${/Veilwood/i.test(pu)}`);
  t(`12e: the planner request carries WHO IS PHYSICALLY PRESENT`,
    /WHO IS PHYSICALLY PRESENT \(fixed\)/.test(pu) && /Julian/i.test(pu) && /Seren/i.test(pu));
  t(`12f: the planner request forbids relocation and materialising the absent`,
    /Do NOT relocate the scene/.test(pu) && /Do NOT materialise anyone/.test(pu)
      && /does NOT make a character physically present/.test(pu));
  t(`12g: the planner request demands a RENDERABLE behavior and bans diagnoses`,
    /"behavior" is the FLOOR/.test(pu)
      && /clinging to the illusion of worthiness/.test(pu)
      && /could a camera record it/i.test(pu));
  t(`12h: the planner request requires ONE opening beat carrying C+, E+ and the fusion`,
    /"pc_opening_fusion"/.test(pu)
      && /PC_FIRST_EMBODIED_BEAT/.test(pu)
      && /IS the protagonist's entire first appearance/.test(pu)
      && /The PROTAGONIST gets NO character_plus entry/.test(pu),
    'the planner was not given the single-opening-beat contract');
  t(`12h2: the planner request requires environment_plus to carry physical evidence`,
    /"beat" is REQUIRED and is the whole point of the axis/.test(pu)
      && /PERSISTENT PHYSICAL ALTERATION or USE-PATTERN/.test(pu)
      && /PERCEPTIBLE IN THIS SCENE/.test(pu),
    'E+ was assigned as a bare target + axis, with no evidence owed');
  // ── NO WORKED EXAMPLES ANYWHERE IN THE DISPATCHED REQUEST ──
  // Twice measured: an example comes back paraphrased. The seed's own WHERE legitimately contains
  // "veil-canopy", so this asserts the EXEMPLAR PHRASING is gone, not the noun.
  t(`12h3: the retired E+ worked example appears NOWHERE in the planner request`,
    !/hangs lower on the left/i.test(pu)
      && !/petitioners have pulled it aside/i.test(pu)
      && !/through the axis of ritual" is an assignment with nothing in it/i.test(pu),
    JSON.stringify((pu.match(/.{0,60}(hangs lower on the left|pulled it aside).{0,60}/i) || [])[0] || null));
  t(`12h4: the retired opening-fusion worked example appears NOWHERE either`,
    !/worn hollow/i.test(pu) && !/newly counterfeit/i.test(pu)
      && !/generations of petitioners had polished it smooth/i.test(pu),
    JSON.stringify((pu.match(/.{0,60}(worn hollow|newly counterfeit).{0,60}/i) || [])[0] || null));
  t(`12h5: E+ is stated as a SHAPE, with placeholders to replace rather than prose to copy`,
    /"beat": "<TARGET \+ PHYSICAL CHANGE CAUSED BY THE AXIS \+ MATERIAL TRACE VISIBLE IN THIS SCENE>"/.test(pu)
      && /Replace EVERY angle-bracket placeholder with your own words/.test(pu)
      && /CATEGORY NAMES, not content/.test(pu));
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
  t(`12l: the opening BEAT reaches the author, not just the pair`,
    /PROTAGONIST OPENING BEAT \(HARD/.test(sys)
      && /my thumb finds the spiralgrass where the rite has worn it smooth/.test(sys)
      && !/FUSION — one sentence in which/.test(sys),
    JSON.stringify(sys.split('\n').filter(l => /PROTAGONIST OPENING BEAT|FUSION —/.test(l)).slice(0, 2)));
  t(`12m: zero escaped / unknown requests`, R.escaped.length === 0 && R.unknown.length === 0);
  console.log('');
}

// ── 13 · IDENTITY / GROUNDING / ENVELOPE — these must be ACCEPTED, not rejected ──
// Every case here is output the live planner actually produced and the validator wrongly refused.
console.log(` 13 · ACCEPTED AFTER RESOLUTION (alias · grounding · envelope)`);
for (const [mutate, label, expect] of [
  ['aliasDohkar',   'C+ recipient "Dohkar" resolves to the role figure',     { alias:true }],
  ['clothEp',       'E+ grounded through seed.sceneOne.narrator',           { alias:false }],
  ['nested',        'nested scene_skeleton lifted intact',                   { alias:false, lifted:true }],
  ['stagedTop',     'lone top-level staged_characters moved into the spine', { alias:false, staged:true }],
  ['spread',        'WHOLE spine distributed at top level is reconciled',    { alias:false, lifted:true }],
  ['stagedReordered','a REORDERED fixed cast is canonicalised, not rejected', { alias:false }],
  ['stagedAliased', 'an ALIASED staged name resolves to the canonical person',{ alias:false }],
  ['fusionNullPof', 'a null standalone fusion is SUPERSEDED by the opening fusion',{ alias:false }],
  ['longTargetHeadNoun', 'a long noun-phrase target NAMED by its head noun',   { alias:false }],
  ['sentinelSpelling',   'the pointer sentinel returned without its FROM_ prefix', { alias:false }],
  ['angleIsAReading',    'an interpretive PC angle that stages no body is untouched', { alias:false }],
  // CARDINALITY BY PRESSURE: a candidate the planner declined to assign is a legitimate plan.
  ['missing',            'a candidate left WITHOUT a C+ assignment is accepted, not faulted', { alias:false }],
]) {
  const R = await run({ hot: false, mutate });
  const cp = ((R.skeleton && R.skeleton.cp) || []).map(c => c.character);
  const ok = !R.logs.some(l => /SCENE1:ABORT/.test(l)) && R.author.length === 1;
  t(`   "${mutate}" — ${label}`, ok, `authorCalls=${R.author.length} cp=${JSON.stringify(cp)} ` +
    R.logs.filter(l => /INVALID|ABORT/.test(l)).slice(0,1).join(''));
  if (expect.alias) {
    t(`   "${mutate}" — canonical label stored, alias logged`,
      ok && cp.length === (R.eligible || []).length
        && cp.every(n => (R.eligible || []).includes(n))
        && R.logs.some(l => /SCENE1:ALIAS/.test(l)),
      `cp=${JSON.stringify(cp)} eligible=${JSON.stringify(R.eligible)}`);
  }
  if (expect.lifted || expect.staged) {
    t(`   "${mutate}" — normalization telemetry emitted`,
      R.logs.some(l => /ENVELOPE:NORMALISED/.test(l)),
      R.logs.filter(l => /ENVELOPE/.test(l)).slice(0,1).join(''));
  }
  if (expect.staged) {
    t(`   "${mutate}" — moved intact, into its declared position`,
      R.logs.some(l => /ENVELOPE:NORMALISED/.test(l)
                       && /staged_characters \(top level -> opening_spine\)/.test(l)
                       && /values moved intact/.test(l)),
      R.logs.filter(l => /ENVELOPE:NORMALISED/.test(l)).slice(0,1).join(''));
  }
}
console.log('');

// The dispatched TEMPLATE — not the surrounding prose — must carry the field. This is the exact
// check that would have caught the corridor sample's real cause before spending on it.
{
  const R = await run({ hot: false, mutate: null });
  const pu = String((R.planner[0] || {}).user || '');
  const tmpl = pu.slice(pu.indexOf('Return ONLY this JSON'), pu.indexOf('"scene_skeleton"'));
  t(`   dispatched JSON TEMPLATE declares opening_spine.environment_elements`,
    /"environment_elements"\s*:/.test(tmpl) && tmpl.indexOf('"opening_setting"') !== -1
      && tmpl.indexOf('"environment_elements"') > tmpl.indexOf('"opening_setting"'),
    `inTemplate=${/"environment_elements"\s*:/.test(tmpl)} templateLen=${tmpl.length}`);
  t(`   the template states the two-element requirement, not just the prose`,
    /at least TWO concrete, distinct physical things/.test(tmpl));

  // ── the three staging corrections, asserted on the DISPATCHED template ──
  const full = pu.slice(pu.indexOf('Return ONLY this JSON'));
  const labels = R.eligible || [];
  t(`   template ENUMERATES the exact permitted labels`,
    labels.length > 0 && labels.every(n => full.includes(`EXACTLY one of: ${labels.join(' | ')}`)
                                           || full.includes(n)),
    `labels=${JSON.stringify(labels)}`);
  // The name field is no longer an enumeration to choose from — it is PREFILLED, one literal
  // entry per required person, so there is nothing left to select and no free-text slot at all.
  t(`   template's staged_characters is PREFILLED with each required name, with no free-text slot`,
    labels.length > 0
      && labels.every(n => full.includes(`{ "name": "${n}", "presence": "IN_PERSON"`))
      && !/"name": "<[^>]*>"/.test(full),
    `labels=${JSON.stringify(labels)} freeTextSlot=${(full.match(/"name": "<[^>]{0,120}>"/) || ['(none)'])[0]}`);
  t(`   template contains NO "appears or is named" wording`,
    !/appears or is named/i.test(full),
    (full.match(/.{0,60}appears or is named.{0,60}/i) || [''])[0]);
  t(`   template says the fixed cast is the whole room and excludes the merely referenced`,
    /PREFILLED AND FIXED/.test(full)
      && /this is the complete physical cast of the opening/i.test(full)
      && /Do NOT add a person/i.test(full)
      && /Anyone not listed here is NOT in the room/i.test(full)
      && /they may be named, remembered or spoken about in the prose, but they are not present/i.test(full),
    (full.match(/PREFILLED AND FIXED.{0,240}/) || ['(none)'])[0]);
  t(`   template no longer points at an ELIGIBLE CAST block from inside the JSON`,
    !/from ELIGIBLE CAST/i.test(full) && !/name from ELIGIBLE CAST/i.test(full),
    (full.match(/.{0,50}ELIGIBLE CAST.{0,50}/i) || [''])[0]);
  // ── THE DOCTRINE CHANGE, ASSERTED ON THE DISPATCHED BYTES (2026-08-27) ──
  // Presence governs staging; it does not govern who may be revealed. The retired rules are
  // checked by ABSENCE so they cannot quietly return, and the new ones by presence.
  t(`   template no longer derives C+ from staging, or taxes one entry per body`,
    !/DERIVED FROM STAGING/.test(full)
      && !/exactly ONE entry for EVERY staged_characters entry whose presence_mode is IN_PERSON/.test(full)
      && !/Exactly one character_plus entry per name above/.test(pu),
    (full.match(/.{0,80}DERIVED FROM STAGING.{0,80}/) || full.match(/.{0,60}exactly ONE entry for EVERY.{0,80}/) || [''])[0]);
  t(`   template states cardinality by PRESSURE, with the five qualifying moves`,
    /character_plus is OPTIONAL PER PERSON and is NOT derived from staging/.test(full)
      && /pressures the protagonist/.test(full) && /turns the scene/.test(full)
      && /reveals a consequential choice/.test(full) && /forces a decision/.test(full)
      && /establishes themselves as a continuing force/.test(full)
      && /AT MOST ONE entry per character per scene/.test(full),
    (full.match(/.{0,100}OPTIONAL PER PERSON.{0,120}/) || ['(missing)'])[0]);
  t(`   a scene where nobody earns one is stated to be a correct plan`,
    /merely present, merely named, or merely furniture gets NO entry/.test(full)
      && /is a correct plan, not an omission/.test(full));
  t(`   the assignment must cite an opportunity and an authored facet`,
    /"mode": "<one of THAT person's permitted modes/.test(full)
      && /"facet_id": "<one of THAT person's authored facet ids>/.test(full));
  t(`   the ROSTER block is the physical roster, and says what it governs`,
    /STAGED ROSTER — PHYSICALLY ON STAGE/.test(pu)
      && /it governs staged_characters, every embodied beat, and the opening fusion/.test(pu)
      && /It is not the Character\+ candidate list/.test(pu)
      && !/ELIGIBLE CAST \(/.test(pu),
    (pu.match(/.{0,60}ELIGIBLE CAST.{0,60}/) || ['(renamed)'])[0]);
  t(`   the C+ CANDIDATE block is a separate list carrying modes, evidence and facet ids`,
    /CHARACTER\+ CANDIDATES \(\d+\)/.test(pu)
      && /PHYSICAL PRESENCE IS NOT THE QUALIFICATION/.test(pu)
      && /modes permitted:/.test(pu) && /AUTHORED PSYCHOLOGY —/.test(pu)
      && /facet_id: seren_goodness_needs_witness/.test(pu)
      // the TRUTH, not only the slug — the break this whole pass exists to close
      && /canonical truth: Her compassion is genuine but requires an audience/.test(pu)
      && /applicability conditions — cite ONE by its pressure_id/.test(pu)
      && /pressure_id: p_\w+\s+→\s+observed by people whose approval she wants/.test(pu),
    (pu.match(/CHARACTER\+ CANDIDATES.{0,200}/) || ['(missing)'])[0]);
  t(`   the four delivery modes are spelled out, ANTICIPATED marked as expectation`,
    /· IN_PERSON — a behaviour they CHOOSE/.test(pu)
      && /· RECALLED — one clearly framed remembered behaviour/.test(pu)
      && /· REPORTED — a behaviour attributed to them through dialogue/.test(pu)
      && /marked as expectation and not as present fact/.test(pu));
  t(`   "absent" no longer means "ineligible for character_plus"`,
    !/INELIGIBLE for character_plus/.test(pu)
      && /ABSENT CANDIDATES STAY ABSENT/.test(pu)
      && /does NOT put them in the room/.test(pu),
    (pu.match(/.{0,80}INELIGIBLE for character_plus.{0,80}/) || ['(retired)'])[0]);
  t(`   template binds the opening fusion to the PROTAGONIST and to environment_plus`,
    /"pc_opening_fusion": \{/.test(full)
      && /"placement": "PC_FIRST_EMBODIED_BEAT"/.test(full)
      && /the SAME string as environment_plus\.target, verbatim/.test(full)
      && /the SAME value as environment_plus\.axis/.test(full),
    (full.match(/.{0,60}pc_opening_fusion.{0,80}/) || ['(none)'])[0]);
  // ── the reconciler's allowlist IS the template's contract ──
  // Parsed from the SAME dispatched text the planner received, so a field added to the schema
  // later cannot silently become unreconciled.
  const declared = await (async () => {
    const c2 = await browser.newContext();
    try {
      const p2 = await c2.newPage();
      p2.setDefaultTimeout(180000); p2.setDefaultNavigationTimeout(180000);
      await p2.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: mk(false) }));
      await p2.route('**/api/**', r => /\/api\/(config|geo)\b/.test(r.request().url()) ? r.continue() : r.abort());
      await p2.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
      await p2.waitForFunction(() => window._openingSpineDeclaredFields, { timeout:180000 });
      return await p2.evaluate(t2 => window._openingSpineDeclaredFields(t2), pu);
    } finally { await c2.close().catch(() => {}); }
  })();
  const MUST_RECONCILE = ['opening_setting', 'environment_elements', 'staged_characters',
                          'reader_state', 'hook_object', 'scene_want', 'scene_mission'];
  t(`   reconciler allowlist is PARSED from the dispatched template`,
    Array.isArray(declared) && declared.length >= 10, `parsed ${declared && declared.length} field(s)`);
  t(`   every field the template declares is reconcilable`,
    MUST_RECONCILE.every(f => declared.includes(f)),
    `missing from parsed list: ${MUST_RECONCILE.filter(f => !declared.includes(f))}`);
  t(`   the allowlist does NOT leak nested or sibling keys`,
    !declared.includes('character_plus') && !declared.includes('scene_skeleton')
      && !declared.includes('knows') && !declared.includes('name'),
    JSON.stringify(declared.filter(f => ['character_plus','scene_skeleton','knows','name'].includes(f))));

  t(`   template shows NO invented example identity`,
    !/\b(Mateo|Soraya|Quinn|Jane Doe|John Doe)\b/.test(full),
    (full.match(/\b(Mateo|Soraya|Quinn)\b/) || [''])[0]);
}
console.log('');

// ── 8x · HARNESS SELF-CONTROL: isolation, not just economy ──
// The refactor to one browser is only safe if a context is a real boundary. This pollutes one
// case on purpose and proves the next one cannot see it — otherwise every green in this suite
// could be a leak from the case before.
{
  const P1 = await run({ hot: false, mutate: null, pollute: true });
  const P2 = await run({ hot: false, mutate: null });
  t('8x: the polluting case actually polluted (the control is not vacuous)', P1.polluted === true,
    JSON.stringify({ polluted: P1.polluted }));
  t('8x: …and the NEXT case sees none of it — globals, storage or state',
    P1.sentinelSeen === false && P2.sentinelSeen === false,
    JSON.stringify({ first: P1.sentinelSeen, next: P2.sentinelSeen }));
}
console.log('');

// ── 9 · planner faults must surface, never continue silently to Grok ──
console.log(` 9 · PLANNER FAULTS SURFACE (no silent skeleton-less continuation)`);
for (const mutate of ['unknown', 'duplicate', 'badaxis', 'badfusion',
                      // an assignment must cite an opportunity it was given and a facet that is theirs
                      'cpNoMode', 'cpBadMode', 'cpNoFacet', 'cpBadFacet',
                      // the causal chain: a pressure that is real, evidenced, and a beat that
                      // brings no prop of its own
                      'cpBadEvidence', 'cpBadPressureId', 'cpProp', 'cpNoLensOp', 'cpBadObject',
                      'fmfalse', 'fmmissing', 'fmstring', 'emptyangle', 'placeholderang', 'thinangle',
                      'noep', 'emptyeptarget', 'fusionmismatch', 'fusionempty', 'unparseable',
                      // revised planning contract
                      'diagnosisangle', 'diagnosisangle2', 'offsceneEp', 'relocate',
                      'fusionnull', 'fusionbadcode', 'fusionfalsecode', 'fusionnobeat', 'fusionthinbeat',
                      // identity / envelope faults that must STILL abort
                      'aliasOffstage', 'nestedThin', 'stagedThin',
                      // cross-field coherence must run when the standalone fusion is ABSENT —
                      // which is what the live planner actually returns
                      'pofOffTarget', 'noFusionNoEpBeat', 'anchorPlaceholder', 'anchorEmpty',
                      // single-source: one asking per first appearance, and no schema echoed back
                      'pcInCp', 'pcAnchorOwn', 'nonPcAnchorOwn',
                      // …and she is still recognised under an alias, then still rejected
                      'aliasNarrator', 'aliasProtag',
                      'epSchemaEcho', 'epCategoryEcho', 'pofSchemaEcho', 'angleSecondAction',
                      // C+ must REVEAL, not merely be recordable
                      'readMissing', 'contemptOverJealousyEvidence', 'caringOnContemptFacet',
                      // identical duplicates now COLLAPSE (tested below); a DIFFERENCE still aborts
                      'dupSkeletonDiff', 'stagedBothDiff',
                      // reconciler must not rescue semantics, and must not swallow invented fields
                      'spreadBadCast', 'unknownKey',
                      // the fixed cast may not be edited
                      'stagedAdded', 'stagedOmitted', 'stagedRenamed', 'stagedPresence']) {
  const R = await run({ hot: false, mutate });
  // Both failure classes must exit visibly: semantic (SKELETON:INVALID) and unparseable
  // planner output (PLANNER:UNRECOVERABLE). Either way the ABORT must follow.
  const flagged = R.logs.some(l => /SCENE1:SKELETON:INVALID|SCENE1:PLANNER:UNRECOVERABLE|SCENE1:ENVELOPE:FAULT|SCENE1:STAGE:UNRESOLVED|SCENE1:STAGED:INVALID/.test(l))
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

// ══════════════════════════════════════════════════════════════════════════════════════════
// PART S — SOLO STAGE: THE SCHEMA MUST NOT DEMAND A PERSON THE STAGE FORBIDS
// Round 6 accepted a corridor plan whose staged cast was correct and which nonetheless invented
// "Quinn" in scene_want, scene_mission, reader_state and interlocutor_placement — because those
// fields each REQUIRED a second person while the cast permitted one. These tests pin the
// contradiction closed at the template, at the directive, and at the validator.
// ══════════════════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(90)}\nPART S — SOLO STAGE CONTRACT\n${'═'.repeat(90)}\n`);
{
  const S = await run({ hot: false, solo: true, mutate: null });
  const pu = (S.planner[0] || {}).user || '';
  const au = (S.author[0] || {}).user || '';
  const aus = (S.author[0] || {}).system || '';
  const authorAll = au + '\n' + aus;

  console.log(`   eligible cast     : ${JSON.stringify(S.eligible)}`);
  console.log(`   planner reqs      : ${S.planner.length} · author reqs: ${S.author.length}`);
  console.log(`   C+ delivered      : ${JSON.stringify((S.skeleton && S.skeleton.cp || []).map(c=>c.character))}`);

  t('S1 the solo stage really is narrator-only',
    Array.isArray(S.eligible) && S.eligible.length === 1 && S.eligible[0] === 'Lirael',
    JSON.stringify(S.eligible));
  t('S1 a narrator-only plan is ACCEPTED and reaches the author',
    S.author.length === 1 && (S.skeleton && S.skeleton.cp || []).length === 1,
    `author=${S.author.length} cp=${JSON.stringify((S.skeleton && S.skeleton.cp || []).map(c=>c.character))}`);

  // 1 — the field is GONE, not nulled
  t('S2 narrator-only template contains NO interlocutor_placement field',
    !/"interlocutor_placement"/.test(pu),
    (pu.match(/.{0,60}interlocutor_placement.{0,60}/) || [''])[0]);
  t('S2 nor any request for a name / relationship / tell / caller / remembered face',
    !/NAME \+ RELATIONSHIP/i.test(pu) && !/ON_PHONE interlocutor/i.test(pu)
      && !/REMEMBERED, PROJECTED, or HEARD-THROUGH-LINE/i.test(pu),
    'planner template still asks for interlocutor texture');

  // 2 — want is solo-satisfiable
  t('S3 narrator-only scene_want drops the human-interaction requirement',
    !/achievable through human interaction in this room or this call/i.test(pu)
      && /SATISFIABLE BY HER\s+ALONE|satisfiable by her alone/i.test(pu),
    (pu.match(/.{0,90}human interaction.{0,60}/i) || ['(clause gone, solo wording missing)'])[0]);
  t('S3 the solo want names solo affordances and forbids a second body',
    /RITUAL or PROCEDURE|PREPARATION, a CONCEALMENT/.test(pu)
      && /may NOT require another person to be present/i.test(pu));

  // 3 — mission is solo-satisfiable
  t('S4 narrator-only scene_mission offers only no-second-person shapes',
    /COMPLETE something, DISCOVER something, DECIDE something/.test(pu)
      && /CROSS A THRESHOLD/.test(pu));
  t('S4 narrator-only scene_mission forbids the interlocutor shapes',
    /Do NOT use CONVINCE someone/.test(pu)
      && /EARN a person's trust, PROTECT another\s+person, negotiate, or confess to someone/.test(pu.replace(/\s+/g,' ').replace(/EARN a person's trust, PROTECT another person, negotiate, or confess to someone/, "EARN a person's trust, PROTECT another person, negotiate, or confess to someone")) || /Do NOT use CONVINCE someone/.test(pu),
    'mission still offers an interlocutor shape');

  // 4 — reader_state may not cast
  t('S5 narrator-only reader_state is barred from introducing a person',
    /may NOT introduce a new named or embodied person/i.test(pu));

  // 5 — the directive reaches BOTH models
  t('S6 the planner receives the authoritative solo-stage directive',
    /Only the narrator \(Lirael\) is physically present/.test(pu)
      && /Do not create or materialize another person, voice, caller, messenger, clerk, witness, companion, remembered apparition, or speaking role/.test(pu));
  t('S6 the GROK request carries the same solo-stage directive',
    /Only the narrator \(Lirael\) is physically present/.test(authorAll)
      && /Dramatic pressure must operate through the narrator's action, environment, objects, anticipation, procedure, or established offstage context/.test(authorAll),
    (authorAll.match(/.{0,80}SOLO STAGE.{0,80}/) || ['(no solo directive in the author payload)'])[0]);
  t('S6 NO hard interlocutor directive reaches Grok on a solo stage',
    !/INTERLOCUTOR ON FIRST MENTION/.test(authorAll),
    (authorAll.match(/.{0,90}INTERLOCUTOR ON FIRST MENTION.{0,90}/) || [''])[0]);
  t('S6 the directive still PERMITS referring to established offstage people',
    /may still be referred to, remembered, dreaded or discussed/i.test(authorAll));

  // 6 — an established offstage person may be REFERENCED
  const J = await run({ hot: false, solo: true, mutate: 'julianRef' });
  t('S7 established offstage Julian may be REFERENCED without rejection',
    J.author.length === 1 && !J.logs.some(l => /IDENTITY:INVENTED/.test(l)),
    `author=${J.author.length} fatal=${(J.logs.find(l=>/IDENTITY:INVENTED/.test(l))||'').slice(0,140)}`);
  const JS = await run({ hot: false, solo: true, mutate: 'julianStaged' });
  t('S7 …but Julian may NOT be staged into the room',
    JS.author.length === 0
      && JS.logs.some(l => /SCENE1:STAGED:INVALID/.test(l)) && JS.logs.some(l => /SCENE1:ABORT/.test(l)),
    `author=${JS.author.length}`);
}

// Every person-bearing field, one at a time. None of these touches the guarded cast fields.
console.log(`\n${'─'.repeat(90)}\n  invented identity, field by field (the round-6 failure)\n${'─'.repeat(90)}`);
for (const [mutate, where] of [
  ['quinnWant',     'scene_want'],
  ['quinnMission',  'scene_mission'],
  ['quinnReader',   'reader_state.must_not_confuse'],
  ['quinnWonder',   'reader_state.wondering'],
  ['quinnInterloc', 'interlocutor_placement (undeclared on a solo stage)'],
  ['quinnAnchor',   'staged_characters[].anchor_beat'],
  ['quinnFusion',   'scene_skeleton.fusion.beat'],
]) {
  const R = await run({ hot: false, solo: true, mutate });
  const caught = R.logs.some(l => /SCENE1:IDENTITY:INVENTED|SCENE1:ENVELOPE:FAULT|SCENE1:IDENTITY:INTERLOCUTOR/.test(l))
              && R.logs.some(l => /SCENE1:ABORT/.test(l));
  t(`   "Quinn" in ${where} is rejected before Grok`,
    caught && R.author.length === 0,
    `caught=${caught} authorCalls=${R.author.length} | ${(R.logs.find(l=>/IDENTITY|ENVELOPE:FAULT/.test(l))||'(no identity log)').slice(0,150)}`);
}

// ── SOLO INTERACTION: a second person ACTING, end to end ──────────────────────────────────
console.log(`\n${'─'.repeat(90)}\n  solo stage — a second BODY or VOICE (no name invented)\n${'─'.repeat(90)}`);
{
  const S = await run({ hot: false, solo: true, mutate: null });
  const pu = (S.planner[0] || {}).user || '';
  const authorAll = ((S.author[0] || {}).user || '') + '\n' + ((S.author[0] || {}).system || '');
  t('S10 the template forbids a contemporaneous second voice in the WANT',
    /any want that waits on another party to speak, finish speaking, call, send word or show up/.test(pu)
      && /not a rival, not a clerk, not a voice through the door/.test(pu));
  t('S10 the template forbids a person-shaped deadline in the MISSION',
    /A deadline must be a fact of the world \(a tide, a bell, a fire, a closing door\), never a person finishing a sentence/.test(pu));
  t('S10 the template forbids reader_state depicting anyone else acting',
    /It may NOT describe anyone else speaking, calling, arriving or acting during the scene/.test(pu));
  t('S10 the solo directive enumerates the forbidden acts',
    /NOBODY ELSE ACTS IN THIS SCENE/.test(pu)
      && /An UNNAMED role .{0,80}is still a second person: not naming them does not make them absent/.test(pu));
  t('S10 the solo directive makes the alternative pressure sources explicit',
    /WHERE THE PRESSURE COMES FROM INSTEAD/.test(pu)
      && /PROCEDURE\s+or RITUAL/.test(pu) && /CONCEALMENT of something/.test(pu)
      && /A scene with one person in it is not an empty scene/.test(pu));
  t('S10 solo pressure_source may not be another person',
    /SOLO SCENE — THE PRESSURE MAY NOT BE ANOTHER PERSON/.test(pu)
      && /a PROCEDURE or RITE she can get wrong/.test(pu));
  t('S10 the rival worked-example is GONE from the solo template',
    !/a rival is denouncing her to the room/.test(pu)
      && !/the accuser is in the doorway/.test(pu)
      && !/the summons is being read aloud/.test(pu),
    (pu.match(/.{0,70}(?:rival is denouncing|accuser is in the doorway|summons is being read).{0,70}/) || [''])[0]);
  t('S10 solo opening_beat drops the two-person shapes',
    !/a hand is already on her/.test(pu) && !/the room has already turned on her/.test(pu)
      && !/open on the PRESSURE SOURCE in motion — a person present/.test(pu),
    (pu.match(/.{0,70}(?:hand is already on her|room has already turned|a person present).{0,70}/) || [''])[0]);
  t('S10 GROK receives the enumerated forbidden acts too',
    /NOBODY ELSE ACTS IN THIS SCENE/.test(authorAll)
      && /WHERE THE PRESSURE COMES FROM INSTEAD/.test(authorAll));
}

for (const [mutate, what] of [
  ['rivalSpeaks',   '"the rival finishes speaking" (round 8\'s leak)'],
  ['clerkCalls',    '"a clerk calls from outside"'],
  ['voiceOutside',  'an unnamed voice outside the door (round 7\'s leak)'],
  ['liveMessage',   'a live message arriving mid-scene'],
  ['waitMessenger', '"wait for the messenger"'],
  ['guardConvince', '"convince the guard"'],
]) {
  const R = await run({ hot: false, solo: true, mutate });
  const caught = R.logs.some(l => /SCENE1:SOLO:INTERACTION/.test(l)) && R.logs.some(l => /SCENE1:ABORT/.test(l));
  t(`   solo: ${what} is rejected before Grok`,
    caught && R.author.length === 0,
    `caught=${caught} author=${R.author.length} | ${(R.logs.find(l=>/SOLO:INTERACTION/.test(l))||'(no solo log)').slice(0,150)}`);
}

for (const [mutate, what] of [
  ['memoryJulian',  'a MEMORY of Julian'],
  ['thinkJulian',   'THINKING about Julian'],
  ['prepareJulian', 'PREPARING to meet Julian later'],
  ['letterJulian',  'an OLD LETTER from Julian'],
  ['windSound',     'wind and environmental sound'],
]) {
  const R = await run({ hot: false, solo: true, mutate });
  t(`   solo: ${what} is ALLOWED`,
    R.author.length === 1 && !R.logs.some(l => /SOLO:INTERACTION|IDENTITY:INVENTED/.test(l)),
    `author=${R.author.length} | ${(R.logs.find(l=>/SOLO:INTERACTION|IDENTITY/.test(l))||'').slice(0,150)}`);
}

// ── MULTI-PERSON MUST BE UNCHANGED ────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(90)}\n  multi-person scenes keep the interlocutor contract\n${'─'.repeat(90)}`);
{
  const M = await run({ hot: false, mutate: null });
  const pu = (M.planner[0] || {}).user || '';
  const authorAll = ((M.author[0] || {}).user || '') + '\n' + ((M.author[0] || {}).system || '');
  t('S8 a multi-person stage STILL declares interlocutor_placement',
    /"interlocutor_placement"/.test(pu) && (M.eligible || []).length > 1,
    `cast=${JSON.stringify(M.eligible)}`);
  t('S8 a multi-person stage keeps the human-interaction want and the full mission shapes',
    /achievable through human interaction in this room or this call/i.test(pu)
      && /CONVINCE someone, CONCEAL something/.test(pu));
  t('S8 a multi-person HOT template KEEPS the original person-in-motion phrasing',
    !/HOT OPENING \(REQUIRED PHRASING\)/.test(pu) || /a rival is denouncing her to the room/.test(pu),
    'multi-person lost its hot-opening phrasing');
  t('S8 a multi-person stage gets NO solo directive',
    !/SOLO STAGE/.test(pu) && !/SOLO STAGE/.test(authorAll));
  t('S8 the multi-person interlocutor directive still reaches Grok',
    /INTERLOCUTOR ON FIRST MENTION/.test(authorAll));
  t('S8 the solo-interaction validator does NOT run on a multi-person stage',
    !M.logs.some(l => /SCENE1:SOLO:INTERACTION/.test(l)) && M.author.length === 1);
  t('S8 multi-person plan is still ACCEPTED end to end',
    M.author.length === 1 && (M.skeleton && M.skeleton.cp || []).length === (M.eligible || []).length,
    `author=${M.author.length} cp=${(M.skeleton && M.skeleton.cp || []).length} cast=${(M.eligible||[]).length}`);

  // A TWO-PERSON ASSIGNMENT stage, with the love interest left off it.
  const D = await run({ hot: false, duo: true, mutate: null });
  const dpu = (D.planner[0] || {}).user || '';
  t('S9 a two-person ASSIGNMENT stage keeps interlocutor_placement',
    /"interlocutor_placement"/.test(dpu) && (D.eligible || []).length === 2
      && D.author.length === 1,
    `cast=${JSON.stringify(D.eligible)} author=${D.author.length}`);
  t('S9 the offstage love interest is not staged by the assignment',
    !(D.eligible || []).includes('Julian'), JSON.stringify(D.eligible));
  // NOT TESTED, deliberately: "an OFFSTAGE person may not be promoted to interlocutor". The guard
  // exists in _resolveStageFromPlan's caller, but no constructible state reaches it today — the
  // offstage roster is only populated on the narrator-only path, and that path omits
  // interlocutor_placement from the template entirely. Reaching it would need presence-owner
  // 'assignment' to also push unstaged roster members offstage, which is a behaviour change to
  // multi-person scenes and out of scope here. Left as defence, recorded as uncovered.
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// PART T — IDENTICAL DUPLICATE COLLAPSE, END TO END (2026-08-26, from round-10 evidence)
// Two structurally identical copies contain no competing decision. Round 10 produced a plan that
// was clean on every semantic axis and was thrown away for emitting its skeleton twice, with the
// two copies byte-identical. The collapse must recover it — and every semantic validator must
// still run afterwards, on the canonical copy.
// ══════════════════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(90)}\nPART T — IDENTICAL DUPLICATE COLLAPSE\n${'═'.repeat(90)}\n`);
for (const [mutate, what, tag] of [
  ['dupSkeleton', 'an IDENTICAL duplicate scene_skeleton (the round-10 shape)', 'scene_skeleton'],
  ['stagedBoth',  'an IDENTICAL duplicate staged_characters',                   'staged_characters'],
]) {
  const R = await run({ hot: false, mutate });
  t(`   ${what} COLLAPSES and the plan proceeds`,
    R.author.length === 1
      && R.logs.some(l => /IDENTICAL DUPLICATE COLLAPSED/.test(l))
      && !R.logs.some(l => /SCENE1:ABORT/.test(l)),
    `author=${R.author.length} | ${(R.logs.find(l=>/ENVELOPE|ABORT/.test(l))||'(no envelope log)').slice(0,160)}`);
  t(`   …and the collapse log names ${tag}`,
    R.logs.some(l => /IDENTICAL DUPLICATE COLLAPSED/.test(l) && l.includes(tag)),
    (R.logs.find(l=>/IDENTICAL DUPLICATE COLLAPSED/.test(l))||'(none)').slice(0,180));
}
{
  // EVERY semantic validator must still run after a collapse — the collapse recovers PLACEMENT,
  // never semantics. An invented C+ recipient inside an identical-duplicate skeleton still aborts.
  const R = await run({ hot: false, mutate: 'dupSkeletonBadCast' });
  t('   a collapse does NOT rescue semantics — invented cast inside the duplicate still aborts',
    R.author.length === 0
      && R.logs.some(l => /IDENTICAL DUPLICATE COLLAPSED/.test(l))
      && R.logs.some(l => /SKELETON:INVALID/.test(l)) && R.logs.some(l => /SCENE1:ABORT/.test(l)),
    `author=${R.author.length} | ${(R.logs.find(l=>/SKELETON:INVALID/.test(l))||'(no invalid log)').slice(0,160)}`);
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// PART V — THE ROUND-11 GAPS, EACH REJECTED FOR ITS OWN REASON
// A must-abort list proves only that something failed. These name WHICH fault fired, so a
// coherence check cannot quietly stop running while an unrelated one keeps the case green.
// ══════════════════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(90)}\nPART V — COHERENCE WITHOUT A STANDALONE FUSION\n${'═'.repeat(90)}\n`);
for (const [mutate, label, needle] of [
  ['pofOffTarget',     'the opening beat never reaches its declared target', 'never reaches the assigned environment target'],
  ['noFusionNoEpBeat', 'E+ with no evidence beat',                           'environment_plus has no "beat"'],
  ['anchorPlaceholder','a staged anchor that echoes the field name',         'there was nothing to fill in'],
  ['anchorEmpty',      'a staged anchor left blank',                         'there was nothing to fill in'],
  ['pcInCp',           'a character_plus entry for the protagonist',         'character_plus contains the protagonist'],
  ['aliasNarrator',    '…and under the alias "the narrator" too',            'character_plus contains the protagonist'],
  ['pcAnchorOwn',      'a PC anchor the planner wrote itself',               'a different moment from her'],
  ['nonPcAnchorOwn',   'a non-PC anchor that is a second first appearance',  'TWO different first appearances'],
  ['epSchemaEcho',     'E+ beat returned as the bracket text',               'returns the schema instead of content'],
  ['epCategoryEcho',   'E+ beat built out of the category words',            'returns the schema instead of content'],
  ['pofSchemaEcho',    'the opening beat returned as the bracket text',      'returns the schema instead of content'],
  ['angleSecondAction','the angle staging a second action elsewhere',        'stages a SECOND action'],
  ['readMissing',      'a behavior removed entirely',                        'the angle is empty'],
  ['caringOnContemptFacet',
                       'a "cares deeply" read attached to the CONTEMPT facet it inverts',
                                                                             'breaks a guardrail on this character'],
  ['contemptOverJealousyEvidence',
                       'his FIRST facet hung on evidence that does not establish it',
                                                                             'none of the evidence it cites establishes it'],
]) {
  const R = await run({ hot: false, mutate });
  const invalid = R.logs.filter(l => /SKELETON:INVALID/.test(l)).join(' | ');
  t(`   "${mutate}" — ${label}`,
    R.author.length === 0 && /SCENE1:ABORT/.test(R.logs.join(' ')) && invalid.includes(needle),
    `authorCalls=${R.author.length} | ${invalid.slice(0, 240) || '(no INVALID log)'}`);
}
console.log('');

// ══════════════════════════════════════════════════════════════════════════════════════════
// A MODEL-WRITTEN READ IS NO LONGER REJECTED — IT IS DISCARDED (2026-08-27)
//
// These five gestures used to abort the scene: a revelation that merely restated its own
// behaviour was a fault. It cannot be one any more, because for a person with an authored facet
// the planner is not asked for psychology at all, and anything it sends is overwritten by the
// record before delivery. The property that MUST hold is therefore no longer "the plan is
// refused" but "those words never reach the writer" — and that is what is asserted here.
// The guard itself is not retired: it still runs on the one population that has no record to
// overwrite with, which the unseeded case below proves.
// ══════════════════════════════════════════════════════════════════════════════════════════
{
  const K = await run({ hot: false, mutate: 'caringOnKindnessFacet' });
  t('   a scoped guardrail stays SILENT on the facet it does not police (same words, kindness facet)',
    K.author.length === 1 && !/SCENE1:ABORT/.test(K.logs.join(' ')),
    `authorCalls=${K.author.length} | ${K.logs.filter(l=>/INVALID/.test(l)).slice(0,1).join('').slice(0,200)}`);
}
console.log('');

console.log(' READS THE MODEL WRITES ANYWAY — DISCARDED, NOT OBEYED');
for (const [mutate, label, junk] of [
  ['readVoiceDrops',   '"his voice drops" read as "he speaks more quietly"', 'he speaks more quietly at the end'],
  ['readBreathHitch',  '"her breath hitches" read as "she is nervous"',      'she is nervous about what is coming'],
  ['readFingersFlex',  '"his fingers flex" read as "a quiet tension"',       'a quiet tension runs through him'],
  ['readIsAction',     'a read that stages another action',                  'she presses her palm flat against the table'],
  ['readShared',       'one reading handed to every character',              'have already decided who to blame'],
]) {
  const R = await run({ hot: false, mutate });
  const sys = (R.author[0] || {}).system || '';
  const usr = (R.author[0] || {}).user || '';
  const cp = ((R.skeleton || {}).cp) || [];
  t(`   "${mutate}" — ${label}: the plan still ships`,
    R.author.length === 1 && !/SCENE1:ABORT/.test(R.logs.join(' ')),
    `authorCalls=${R.author.length} | ${R.logs.filter(l=>/INVALID/.test(l)).slice(0,1).join('')}`);
  t(`   "${mutate}" — …and the model's words reach NOBODY`,
    !(sys + '\n' + usr).includes(junk) && !cp.some(c => String(c.psychological_read || '').includes(junk)
      || String(c.character_revelation || '').includes(junk)),
    `inPrompt=${(sys + usr).includes(junk)} inSkeleton=${JSON.stringify(cp.map(c => (c.psychological_read||'').slice(0,40)))}`);
  // The PC's own entry is owned by pc_opening_fusion and cites no facet — she is not a recipient
  // of her own reading. Only the ORDINARY recipients draw on the record.
  const recips = cp.filter(c => c.fulfilled_by !== 'pc_opening_fusion');
  t(`   "${mutate}" — …because the RECORD's truth is what travels`,
    recips.length > 0 && recips.every(c => c.facet_source === 'trusted-record'
      && String(c.psychological_read || '').trim().length > 0),
    JSON.stringify(cp.map(c => [c.character, c.fulfilled_by || null, c.facet_source])));
  // ONLY THE PSYCHOLOGY IS DISCARDED. The grounded act and the chosen lens ARE the planner's real
  // output — a discard that swallowed them would be a silent amputation, not a correction. Each
  // recipient's block must carry its own three components, once each, beside the record's truth.
  const blockOf = n => {
    const L = sys.split('\n');
    const i = L.findIndex(l => /^\s*•\s/.test(l) && l.includes(n));
    return i < 0 ? '' : L.slice(i, i + 6).join('\n');
  };
  const once = (hay, needle) => !!needle && (hay.split(needle).length - 1) === 1;
  t(`   "${mutate}" — …and the ACT and the LENS still reach Grok, once each, beside that truth`,
    recips.length > 0 && recips.every(c => {
      const b = blockOf(c.character);
      const act = 'VISIBLE ACTION — MUST OCCUR: ' + String(c.behavior || c.angle || '');
      return once(b, 'SOURCE TRUTH — DO NOT STATE: ' + String(c.facet_truth || c.psychological_read || ''))
          && once(b, act) && once(sys, act)
          && once(b, 'PC INTERPRETATION — MUST GOVERN THE NARRATION: ' + String(c.pc_lens_operation || ''));
    }),
    JSON.stringify(recips.map(c => [c.character, (blockOf(c.character).match(/(SOURCE TRUTH|VISIBLE ACTION|PC INTERPRETATION)/g) || [])])));
}
// THE GUARD IS NOT GONE. It has one live population: a candidate with no authored psychology,
// where the model's sentence is all there is and therefore has to be judged.
{
  const R = await run({ hot: false, duo: true, mutate: 'readVoiceDrops' });
  const invalid = R.logs.filter(l => /SKELETON:INVALID/.test(l)).join(' | ');
  t('   UNSEEDED: with no record to overwrite it, a restating read is STILL rejected',
    R.author.length === 0 && /SCENE1:ABORT/.test(R.logs.join(' ')),
    `authorCalls=${R.author.length} | ${invalid.slice(0, 200) || '(no INVALID log)'}`);
}
console.log('');

// ══════════════════════════════════════════════════════════════════════════════════════════
// PART U — EXACT-COUNT AUDIT: ONE OBLIGATION, NOT THREE SYNCHRONISED COPIES
//
// Delivery alone is not correctness. The first delivered build shipped the protagonist's beat
// TWICE — once as her CHARACTER+ line, once as the PROTAGONIST OPENING BEAT — which is the very
// competition pc_opening_fusion exists to end, reintroduced one block higher. These are exact
// COUNTS against the bytes that leave for Grok, plus a seam-by-seam trace of the field.
// ══════════════════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(90)}\nPART U — EXACT-COUNT AUDIT OF THE DISPATCHED SCENE-1 PROMPT\n${'═'.repeat(90)}\n`);
for (const [label, hot] of [['HEAVY', false], ['HOTFAST', true]]) {
  const R = await run({ hot, mutate: null });
  const au = R.author[0];
  const sys = au ? au.system : '';
  const usr = au ? au.user : '';
  const sk = R.skeleton || {};
  const pof = sk.pof || null;
  const ep = sk.ep || null;
  const stage = R.stage || {};
  const pcRec = (stage.onStage || []).find(c => c.kind === 'pc') || null;
  const pcLabel = pcRec ? pcRec.label : '';
  const nonPc = (stage.onStage || []).filter(c => c.kind !== 'pc').map(c => c.label);
  const beat = pof ? pof.beat : '';
  console.log(` ${label} — PC=${JSON.stringify(pcLabel)} others=${JSON.stringify(nonPc)}`);

  // ── exactly one of everything ──
  t(`${label} U1: exactly ONE "PROTAGONIST OPENING BEAT" block`,
    count(sys, 'PROTAGONIST OPENING BEAT (HARD') === 1,
    `got ${count(sys, 'PROTAGONIST OPENING BEAT (HARD')}`);
  t(`${label} U2: pc_opening_fusion.beat appears EXACTLY ONCE in the whole request`,
    !!beat && count(sys, beat) === 1 && count(usr, beat) === 0,
    `system=${beat && count(sys, beat)} user=${beat && count(usr, beat)}`);
  t(`${label} U3: the PC angle appears exactly once, as an actionable assignment`,
    !!(pof && pof.character_angle) && count(sys, pof.character_angle) === 1
      && new RegExp('WHAT IT REVEALS ABOUT HER: ' + pof.character_angle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).test(sys),
    `count=${pof && pof.character_angle && count(sys, pof.character_angle)}`);
  t(`${label} U4: the PC gets NO independent CHARACTER+ assignment line`,
    (() => {
      const line = sys.split('\n').find(l => /^\s*•\s/.test(l) && l.includes(pcLabel));
      return !!line && !/ — read: /.test(line) && /PROTAGONIST OPENING BEAT/.test(line);
    })(),
    JSON.stringify(sys.split('\n').find(l => /^\s*•\s/.test(l) && l.includes(pcLabel)) || null));
  t(`${label} U4b: …but she is NOT silently dropped from the roster or the data`,
    ((sk.cp || []).some(c => c.character === pcLabel))
      && sys.split('\n').some(l => /^\s*•\s/.test(l) && l.includes(pcLabel))
      && (R.eligible || []).includes(pcLabel)
      && (stage.onStage || []).some(c => c.label === pcLabel),
    JSON.stringify({ inCp: (sk.cp||[]).map(c=>c.character), eligible: R.eligible }));
  t(`${label} U5: the superseded standalone fusion line appears ZERO times`,
    count(sys, 'FUSION — one sentence') === 0 && count(sys, 'FUSION OPPORTUNITY') === 0,
    `fusionLine=${count(sys, 'FUSION — one sentence')} opportunity=${count(sys, 'FUSION OPPORTUNITY')}`);
  t(`${label} U6: the E+ evidence beat appears exactly once`,
    !!(ep && ep.beat) && count(sys, ep.beat) === 1 && count(usr, ep.beat) === 0,
    `system=${ep && ep.beat && count(sys, ep.beat)} user=${ep && ep.beat && count(usr, ep.beat)}`);
  t(`${label} U7: E+ may keep developing the object but may not schedule a rival realisation`,
    /THIS IS THE SAME THING THE PROTAGONIST OPENING BEAT BELOW TOUCHES/.test(sys)
      && /do NOT stage a second, separate moment of realising/.test(sys)
      && count(sys, 'ENVIRONMENT+ ASSIGNED THIS SCENE') === 1,
    `epBlocks=${count(sys, 'ENVIRONMENT+ ASSIGNED THIS SCENE')}`);

  // ── one canonical assignment, four accountings of it ──
  t(`${label} U8: staged anchor_beat, C+ angle, E+ target and the opening fusion all resolve to ONE assignment`,
    (() => {
      if (!pof || !ep) return false;
      const stagedPc = (R.staged || []).find(c => c && c.name === pcLabel);
      const cpPc = (sk.cp || []).find(c => c.character === pcLabel);
      // Her C+ row is ACCOUNTING (no angle); the single source it points at is the fusion beat.
      const sameAngle = !!cpPc && cpPc.fulfilled_by === 'pc_opening_fusion' && !String(cpPc.angle || '').trim();
      const sameAnchor = !!stagedPc && String(stagedPc.anchor_beat || '').trim() === String(beat).trim();
      const sameTarget = String(pof.environment_target).toLowerCase() === String(ep.target).toLowerCase();
      const sameAxis = String(pof.environment_axis).toLowerCase() === String(ep.axis).toLowerCase();
      const sameWho = String(pof.character) === pcLabel;
      return !!(sameAngle && sameAnchor && sameTarget && sameAxis && sameWho);
    })(),
    JSON.stringify({ pofWho: pof && pof.character, pcLabel,
                     pcRow: (sk.cp||[]).filter(c=>c.character===pcLabel)[0],
                     pcAnchor: (R.staged||[]).filter(c=>c.name===pcLabel).map(c=>c.anchor_beat)[0],
                     beat, epTarget: ep && ep.target, pofTarget: pof && pof.environment_target }));
  t(`${label} U8b: every NON-PC staged anchor is DERIVED from that person's C+ angle`,
    (R.staged || []).filter(c => c.name !== pcLabel && c.presence_mode === 'IN_PERSON').length > 0
      && (R.staged || []).filter(c => c.name !== pcLabel && c.presence_mode === 'IN_PERSON').every(c => {
        const m = (sk.cp || []).find(x => x.character === c.name);
        return !!m && String(c.anchor_beat || '').trim() === String(m.angle || '').trim();
      }),
    JSON.stringify((R.staged||[]).map(c => [c.name, c.anchor_beat])));
  t(`${label} U8d: the persisted manifest marks the on-stage cast IN_PERSON`,
    (R.staged || []).length > 0
      && (R.staged || []).every(c => c.presence_mode === 'IN_PERSON'),
    JSON.stringify((R.staged||[]).map(c => [c.name, c.presence_mode])));
  t(`${label} U8c: no prefilled SENTINEL survives into state`,
    (R.staged || []).every(c => !/^FROM_(PC_OPENING_FUSION|CHARACTER_PLUS)$/.test(String(c.anchor_beat || '').trim())),
    JSON.stringify((R.staged||[]).map(c => c.anchor_beat)));
  // ONE ASSIGNMENT IS NO LONGER ONE LINE (2026-08-27). It is a bullet naming the person followed
  // by SOURCE TRUTH / VISIBLE ACTION / PC INTERPRETATION on their own lines, so "exactly one
  // independent C+ line" is counted as exactly one bullet that OWNS an action block.
  const cpBlocks = n => {
    const L = sys.split('\n'); let seen = 0;
    L.forEach((l, i) => {
      if (!/^\s*•\s/.test(l) || !l.includes(n)) return;
      if (/VISIBLE ACTION — MUST OCCUR: \S/.test(L.slice(i + 1, i + 6).join('\n'))) seen++;
    });
    return seen;
  };
  t(`${label} U9: every NON-PC staged character still gets exactly one independent C+ line`,
    nonPc.length > 0 && nonPc.every(n => cpBlocks(n) === 1),
    JSON.stringify(nonPc.map(n => [n, cpBlocks(n)])));
  t(`${label} U9b: …and no non-PC angle is a duplicate of the opening beat`,
    !!beat && (sk.cp || []).filter(c => c.character !== pcLabel)
      .every(c => String(c.angle).trim() !== String(beat).trim()));

  // ── THE SEAMS: raw → envelope → normalised → state → directive → descriptor → callChat → Grok ──
  const rawHasPof = /"pc_opening_fusion"/.test(String((R.planner[0] || {}).user || '')) ;
  t(`${label} U10 seam 1-2 · the planner was ASKED for the field and the reply survived reconciliation`,
    rawHasPof && !!(R.assignments && R.assignments.pc_opening_fusion),
    `askedFor=${rawHasPof} reconciled=${!!(R.assignments && R.assignments.pc_opening_fusion)}`);
  t(`${label} U11 seam 3 · normalised assignment carries every subfield`,
    (() => { const a = R.assignments && R.assignments.pc_opening_fusion; return !!a && !!a.beat && !!a.character
      && a.placement === 'PC_FIRST_EMBODIED_BEAT' && !!a.environment_target && !!a.environment_axis && !!a.character_angle; })(),
    JSON.stringify(R.assignments && R.assignments.pc_opening_fusion));
  t(`${label} U12 seam 4 · state.sceneSkeleton (the hand-copied field list) carries it`,
    !!(pof && pof.beat) && pof.beat === (R.assignments && R.assignments.pc_opening_fusion.beat),
    JSON.stringify(pof));
  t(`${label} U13 seam 5 · buildSkeletonDirective rendered it into the skeleton block`,
    (() => { const i = sys.indexOf('Narrative skeleton for this scene:'); const j = sys.indexOf(beat);
             return i !== -1 && j > i; })());
  t(`${label} U14 seam 6-7 · the frozen descriptor === the bytes handed to callChat`,
    R.auditSystem !== null && R.auditSystem === sys && R.auditSystem.includes(beat));
  t(`${label} U15 seam 8 · it is in the UPSTREAM system message, and nothing escaped`,
    sys.includes(beat) && /ARCHITECTURE LAWS/.test(sys) && R.escaped.length === 0 && R.unknown.length === 0,
    JSON.stringify({ escaped: R.escaped.slice(0,2), unknown: R.unknown.slice(0,2) }));
  console.log('');
}

console.log(`\n${'─'.repeat(90)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
