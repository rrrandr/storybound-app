// SCENE-1 STAGE ORDER — DRY CONTROLS (no dispatch). The opening planner owns mission+stage for an UNSEEDED Scene 1.
// Fixtures sliced VERBATIM from _scene1_skeleton_delivery.mjs; the planner reply is the suite's own plannerReply(usr)
// plus a stage_contract when the request asked for one (planner-owned mode). Author is stubbed. Every /api/** answered locally.
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';
import { buildScene1Prose, NONTOKEN_A, SCENE_WANT } from './_hook_fixture_prose.mjs';
const PROSE = buildScene1Prose(NONTOKEN_A);

const SRC = fs.readFileSync('public/app.js', 'utf8');
// PRODUCTION'S SLOT → CATEGORY MAP, read rather than remembered. The model is given slot names
// only; `category` is derived in the backend, so a fixture that names categories is speaking a
// vocabulary the model no longer has.
const SLOT_CATEGORY = (() => {
  const blk = (SRC.match(/PORTFOLIO_CONTRAST_DIMENSIONS = \[([\s\S]*?)\n  \];/) || [])[1] || '';
  const m = {};
  for (const row of blk.match(/key: '([a-z_]+)',\s*category: '([a-z_]+)'/g) || []) {
    const [, k, c] = row.match(/key: '([a-z_]+)',\s*category: '([a-z_]+)'/); m[k] = c;
  }
  return m;
})();
const SLOTS = Object.keys(SLOT_CATEGORY);
const SLOT_FOR_CATEGORY = (c) => SLOTS.find(k => SLOT_CATEGORY[k] === c) || null;
let LAST_OFFERED = [];
const PASSTHROUGH = /\/api\/(geo|csp-report|beta-events)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 } };
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/;
const L = 'she understands the wish has already begun to cost her something she cannot name';
// ── THE PORTFOLIO THE SCAFFOLD RETURNS (2026-08-29) ──
// Written FOR THIS STORY, so every applicability condition is grounded in evidence the customs
// house scene actually offers. A rite-flavoured condition was correctly rejected here by the
// evidence gate — that gate is why these belong to the scene rather than to the seed.
const _pfF = (dimension, truth, w1, e1, w2, e2) => ({ dimension, canonical_truth: truth,
  applicability_conditions: [{ text:w1, evidence_words: e1.split('|') }, { text:w2, evidence_words: e2.split('|') }],
  forbidden_restatements: [{ forbid:'is ' + dimension, why:'the truth stated, not shown' }] });
const PORTFOLIO_FACETS = [
  _pfF('value','With people who hold no leverage over him he is unexpectedly generous.',
    'someone with nothing to trade','customs|house|Lirael','a person placed beneath him','beneath|edge|apart'),
  _pfF('insecurity','Deference paid to someone else makes him newly attentive to his own standing.',
    'a room holding more than one authority','customs|house|Lirael','someone junior given weight','younger|senior|standing'),
  _pfF('defense','Paperwork repeated daily rarely earns his full attention, and he barely hides it.',
    'a procedure the house performs every day','customs|house','a step nobody audits','signed|counts|already'),
  _pfF('relationship',"He turns another person's error into an instruction, wanted or not.",
    'a mistake that can still be corrected','counts|signed|already','a person doing the work badly','error|wrong|mistake'),
  _pfF('exception','On what a signature costs he assumes an authority nobody granted him.',
    'an obligation already entered into','signed|counts|already','a price judged small','cost|price|paid')];

// The responder can only echo the subject_ref THE REQUEST CARRIED — exactly what a model can do.
// A run that is not a portfolio run gets an ordinary scaffold, so the marker cannot leak sideways.
function scaffoldReply(refFromRequest, genPortfolio) {
  const base = { issueArcs: [{ n: 1, title: 'the customs house', issueLabel: 'Issue 1', thesis: 'the customs house asks what she will surrender to keep standing in it', beats: [] }], characterIcebergs: {} };
  if (!genPortfolio || !refFromRequest) return base;
  const pf = { subject_ref: refFromRequest, facets: PORTFOLIO_FACETS };
  // Guardrails are scoped by SLOT in the response — ids and categories are both backend-owned, so
  // a model can name neither. Attachment resolves slot → category → facet ids.
  if (genPortfolio.guards) pf.misreading_guardrails = genPortfolio.guards;
  base.characterPortfolios = [pf];
  return base;
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// EVERY MODEL REQUEST HAS A NAME (2026-08-29)
//
// A catch-all that answers GENERIC to anything makes an unanticipated dispatch indistinguishable
// from one the harness designed for — so "unknown=0" only ever meant "no unknown API URL". These
// are the SANCTIONED request kinds, each identified by its own prompt signature. In the portfolio
// arms anything that matches none of them is ABORTED and counted as unknownModel, so a new or
// duplicated call changes the accounting instead of hiding inside a generic reply.
// ══════════════════════════════════════════════════════════════════════════════════════════
// ── THE A-PLOT FIXTURE MUST BE VALID (2026-08-29) ──
// GENERIC has no namedClock, no stakesIfFail and no stakesIfWin, so production REJECTED it and
// ran its self-correction pass. That is where "the A-plot generator fires twice" came from: the
// harness's own invalid fixture, described as production behaviour. _antagonist_identity.mjs had
// already established the true baseline — one generator, zero corrections, one compression — and
// this mirrors the shape it proved. Marcus Vale is the PERSON antagonist, so identity minting,
// the scaffold roster and the whole portfolio chain follow from a plot that VALIDATES.
const APLOT_VALID = {
  goal: 'She must clear the manifest before the tide turns and the ship leaves without her sister',
  namedClock: 'the tide at dawn', clockUnit: 'turns', totalClockUnits: 12,
  antagonistOrAntiForce: 'Marcus Vale', antagonistShape: 'A',
  antagonistPersonalTie: 'he sealed the passage her mother once bought',
  // ONLY what the schema offers the model: kind and proper_name. reference_label is derived by
  // the backend from antagonistOrAntiForce, and a fixture that supplies it hands the model back
  // authority the schema deliberately took away — even where the value is then ignored.
  antagonistSubject: { kind: 'PERSON', proper_name: 'Marcus Vale' },
  stakesIfFail: 'she loses the only passage out and her sister sails alone',
  stakesIfWin: 'she reaches her sister before the ship clears the headland',
  pcWound: 'she was left behind once and has never said so out loud to anyone',
  liWound: 'he promised passage to someone once and could not deliver it in time',
  woundLoadBearingProof: 'her fear of being left drives every choice; his failed promise is why he will not promise again',
  milestones: [{ atScene: 1, event: 'she reaches the harbour office and is refused' },
               { atScene: 2, event: "she finds the sealed manifest with her mother's name" },
               { atScene: 3, event: 'the crisis: the tide turns and she must choose', crisis: true }],
};

// AN ANTAGONIST BODY BIBLE THE AUTHOR CAN ACTUALLY USE. Production requires signature_feature,
// softness_seam and at least one of control_tell / pleasure_tell, and DISCARDS anything else — so
// answering this request with GENERIC left state.antagonistBodyBible empty, every later call site
// tried again, and the resulting count measured the fixture rather than production. The archetype
// must be one of the declared keys or it is stripped.
// Clearing the validator is not the same as reproducing a normal author context: visual_anchor is
// what the author is told to OPEN a character's first description on, so a fixture without one
// hands Grok a payload no successful production run would produce. The two SPURNED_EX-only fields
// are deliberately absent — production nulls them for every other archetype.
const ANTAGONIST_BIBLE = {
  archetype: 'BUREAUCRATIC_COLD',
  archetype_signature: 'he makes the rule do the cruelty so his own hands stay clean',
  height: 'tall', build: 'spare', hair: 'iron-grey, cut close', complexion: 'winter-pale',
  eye_color: 'pale grey',
  signature_feature: 'an inkstain worn permanently into the side of his right middle finger',
  voice_quality: 'quiet and unhurried, pitched to make the room lean in',
  hands_quality: 'dry, precise, always squaring what is already square',
  eyes_register: 'they arrive at a person last, after the paperwork',
  proximity_default: 'one step further away than the conversation warrants',
  pc_keeps_noticing: 'that he never raises his voice and never has to',
  targeting_tell: 'he says her full name where a first name would do',
  control_tell: 'he sets a document down and does not let go of it',
  pleasure_tell: 'the pause before he grants something, held a beat too long',
  escalation_tell: 'he begins to quote the clause number instead of the clause',
  softness_seam: 'he cannot throw away a letter someone hand-delivered, and keeps them in order',
  visual_anchor: { focus: 'the hands', detail: 'an inkstain worn into the side of one finger' },
};

// ── EVERY MODEL REQUEST HAS EXACTLY ONE NAME ──
// One bucket per kind, no residual "everything else" bucket, and matching is EXCLUSIVE: the
// signatures are collected and exactly one must match. `find()` would silently assign the first
// of several overlapping classifiers, which is the same fail-open shape as a generic catch-all.
// A correction is distinguished from an initial generation by the retry note production actually
// sends — the validation errors, handed back — not by a substring both requests happen to carry.
const REQUEST_KINDS = [
  // The bounded portfolio batch. It fires whenever a scene stages an ordinary, uncovered,
  // name-only candidate — which every UNSEEDED fixture here does — and production refuses to plan
  // a scene whose due subject has no psychology. A harness that left it unanswered would be
  // testing its own silence.
  ['portfolioBatch',   (t, sys) => /You author CHARACTER PORTFOLIOS/.test(sys)],
  ['scaffold',         (t, sys) => /CONTINUITY ARCHITECT for a serialized/.test(sys)],
  ['author',           (t, sys) => /ARCHITECTURE LAWS/.test(sys)],
  ['planner',          (t, sys) => /scene-structure planner for the OPENING scene/.test(sys)],
  // The retry note is appended to the SYSTEM message (callOneProvider's extraSystemNote), not to
  // the user message — checked in the source rather than assumed, after a first version of this
  // split matched nothing and quietly left every correction filed as a generation.
  ['aplotCorrection',  (t, sys) => /A-PLOT GENERATOR/i.test(sys)
                          && /previous attempt failed validation/i.test(sys)],
  ['aplotGenerator',   (t, sys) => /A-PLOT GENERATOR/i.test(sys)
                          && !/previous attempt failed validation/i.test(sys)],
  ['aplotCompression', t => /compressing the procedural A-plot/.test(t)],
  ['canonicalizer',    t => /canonicalization and normalization engine/.test(t)],
  ['rplot',            t => /designing an R-PLOT/.test(t)],
  ['subplots',         t => /SUBPLOT GENERATOR/.test(t)],
  ['characterSheet',   (t, sys) => /DISTINGUISHING FEATURE \(anti-calcification ROTATION/.test(t) && !/BODY BIBLE for a romance novel/.test(String(sys || '') + ' ' + String(t || ''))],   // the PC/LI bible prompts also carry the rotation line; they are their own kinds (dispatch needs exactly ONE hit)
  // These two appear ONLY once the A-plot validates: a PERSON antagonist with full wound
  // architecture is what makes production generate an antagonist body bible and run the
  // wound→LI swap test. The invalid fixture had been suppressing them.
  ['antagonistBodyBible', t => /generating an ANTAGONIST BODY BIBLE/.test(t)],
  // PC / LI body bibles (2026-09-10): production generates these on the Scene-1 path once the scope defect (§41) is fixed. These are
  // GENERATOR-RESPONSE fixtures — planning-call data shaped to the generators' core-field checks — never author prose. Distinctive
  // strings let the packet test prove that PRODUCTION code carried them into the outbound author request.
  ['pcBodyBible',         (t, sys) => /generating a PROTAGONIST BODY BIBLE/.test(String(sys || '') + ' ' + String(t || ''))],
  ['liBodyBible',         (t, sys) => /generating a LOVE-INTEREST BODY BIBLE/.test(String(sys || '') + ' ' + String(t || ''))],
  ['woundSwapTest',       t => /WOUND→LI SWAP TEST/.test(t)],
  ['pa_lineEditor',    t => /ruthless line-editor for romance prose/.test(t)],
  ['pa_mechanicalFix', t => /Fix ONLY mechanical defects in this scene/.test(t)],
  ['pa_continuation',  t => /same narrator continuing THIS exact scene/.test(t)],
  ['pa_gravity',       t => /editorial auditor measuring EMOTIONAL GRAVITY/.test(t)],
  ['pa_bannedPhrase',  t => /audit prose for BANNED-phrase reuse/.test(t)],
  ['pa_archetype',     t => /craft auditor measuring ARCHETYPE MANIFESTATION COLLAPSE/.test(t)],
  ['pa_liBibleField',  t => /audit WHICH love-interest Bible field/.test(t)],
  ['pa_reparagraph',   t => /copy editor\. Re-paragraph the SCENE/.test(t)],
  ['pa_perception',    t => /PERCEPTION EDITOR/.test(t)],
  ['pa_calcification', t => /calcification detector for a serial-fiction engine/.test(t)],
  ['pa_voiceAnchor',   t => /generate a VOICE ANCHOR/.test(t)],
  ['pa_preciseEditor', t => /precise line-editor, not a writer/.test(t)],
  ['pa_soundscape',    t => /classify the ambient soundscape/.test(t)],
  ['pa_memory',        t => /CHARACTER MEMORY EXTRACTOR/.test(t)],
];

const PC_BIBLE = { height: 'five foot six', build: 'wiry from the wheel, forearms stronger than they look', hair: 'dark hair cropped blunt at the jaw, always flour or slip in it', complexion: 'olive, wind-chapped at the cheekbones', face: 'a square chin she leads with when cornered', signature_feature: 'a healed burn scar across the left knuckles that whitens when she grips',
  visual_anchor: { focus: 'hands', detail: 'the healed burn scar across her left knuckles goes white when she grips' }, second_celebrated_feature: 'a low, unhurried voice', stress_tic: 'presses her thumb into the old burn scar', desire_tell: 'stops talking mid-sentence and watches his hands', impatience_tell: 'wipes already-clean hands on her apron', confidence_tell: 'sets a piece down without looking at it', vulnerability_tell: 'tucks her scarred hand behind her back',
  core_contradiction: 'she wants to be seen and hides the one mark that would let anyone know her', private_hope: 'that someone will notice the scar and not look away', wound: { core: 'she was blamed, in front of a room, for a fire that was not hers' },
  current_crisis: { event: 'the commission kiln is cooling mid-firing with the buyer due at noon', category: 'PUBLIC_EXPOSURE', visible_now: 'the gauge needle sliding left while the glaze is still wet', stakes: 'the largest piece of the commission cracks and the buyer sees it happen' } };
const LI_BIBLE = { height: 'six foot one', build: 'lean, a swimmer gone to boardrooms', hair: 'black hair cut short at the sides, the top left long enough to fall when he bends over a page', complexion: 'pale, a scar-nick at the left eyebrow', face: 'a face that gives nothing until the mouth moves', eye_color: 'grey', voice_quality: 'a voice that drops half a register when he is amused', hands_quality: 'long hands that stay still on a table', mouth_quality: 'a mouth that starts to smile and stops', holding_style: 'holds a pen like a decision',
  signature_feature: 'the scar-nick through his left eyebrow that pulls when he frowns', visual_anchor: { focus: 'hands', detail: 'his long hands stay perfectly still on the table while everyone else moves' }, second_celebrated_feature: 'the half-smile he stops',
  focus_tell: 'goes still', restraint_tell: 'sets the pen down parallel to the page', interest_tell: 'asks a second question', frustration_tell: 'looks at the clock and then at nothing', desire_tell: 'stops timing the meeting', signature_habits: 'reads the last page first', self_conscious_feature: 'the eyebrow scar', signature_behavior: 'he tests people by giving them a way out and watching whether they take it',
  deflection_pattern: 'answers a feeling with a schedule', attraction_manifestation: 'he stops timing the meeting and lets it run', desire_register_exemplars: ['he let the silence run three seconds past comfortable, then asked what she wanted instead of what she needed'] };
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
    // ── THE OFFER IS GROUNDED OPTIONS, NOT A FACET LIST ──
    // Facet, pressure and evidence arrive welded under one option_id, so the fixture reads the
    // options the packet actually carries and picks one. It can no longer compose a pairing,
    // which is the entire point of the change.
    const options = [];
    const ore = /· option_id: (OPT-\d+)\n\s+truth \(fixed, not yours to rewrite\): ([^\n]+)\n\s+applies here because: ([^\n]+)/g;
    let o; while ((o = ore.exec(chunk))) options.push({ option_id: o[1], truth: o[2].trim(), pressure: o[3].trim() });
    out[name.trim()] = { modes, options };
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
  // ── CONTRACT v2 (2026-09-05) ── the reply SELECTS. Objects are read off the dispatched packet
  // ("THE OBJECTS THIS SCENE CONTAINS"), never remembered; on a seed-owned stage the elements and
  // the E+ target are ids, the fusion has no target of its own, every C+ act names the fact it
  // enacts, and the opening actor is declared (null here: "She sets the relic down" stages nobody).
  const OBJ = [...usr.matchAll(/^ {2}(O\d+): (.+)$/gm)].map(m => ({ id: m[1], name: m[2] }));
  const idFor = (needle) => (OBJ.find(o => o.name.toLowerCase().includes(needle)) || {}).id;
  const SEEDED = !SOLO && OBJ.length > 0 && /Veilwood/.test((usr.match(/WHERE \(fixed\): ([^\n]+)/) || ['', ''])[1] || '');
  const EVID = (oid) => { const m = usr.match(new RegExp('option_id: ' + oid + '\\b[\\s\\S]*?established by: ([^\\n]+)')); return m ? m[1].split(/,\s*/).map(s => s.trim()).filter(Boolean) : []; };
  const FACT_TEXT = (id) => ((usr.match(new RegExp('^ {2}' + id + ': (.+)$', 'm')) || [])[1] || '').trim();
  spine.opening_actor_id = null;
  if (SEEDED) spine.environment_element_ids = [idFor('spiralgrass'), idFor('veil-canopy')].filter(Boolean);
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
  // Seeded: the E+ thing is the carpet by id, so beats name its HEAD ("carpet"), which is what the
  // head-noun rule asks of a beat about "the deep-crimson carpet of braided … spiralgrass".
  const ANCHOR = SOLO ? SOLO_ELS[0]
    : (FIXED_WHERE && !/Veilwood/.test(FIXED_WHERE)) ? FIXED_WHERE.trim()
    : 'the carpet';
  // The PC's opening beat IS the fusion: one beat carries her C+, the E+ axis and the fusion, and
  // her staged anchor is that same beat. One source of truth for the opening.
  const PCN = cast[0];
  // Tightening (2026-09-06): on a seeded stage the beat names its object through the literal
  // {TARGET}, which production replaces with the record's name after the identity scan.
  const TGT = SEEDED ? '{TARGET}' : ANCHOR;
  const POF_BEAT = `my thumb finds ${TGT} where the rite has worn it smooth, and my rehearsed steadiness feels newly counterfeit`;
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
  // ── AN ACT MUST ENGAGE THIS SCENE ──
  // A visible_action that touches no object, no person and nothing from the scene's own material
  // is ambience, and production refuses it. These fixture behaviours were written for a ceremony
  // clearing and are reused in a customs house, so they engaged nothing there and aborted the
  // run. The scene's facts are in the packet; the act is anchored to one of them rather than
  // rewritten, so what each behaviour SHOWS is unchanged.
  const FACTS = [...usr.matchAll(/^ {2}(E\d+): (.+)$/gm)].map(m => m[2].trim());
  const FACT_WORDS = new Set(FACTS.flatMap(f => (f.toLowerCase().match(/[a-z]{5,}/g) || [])));
  const groundAct = (act) => {
    const w = (String(act).toLowerCase().match(/[a-z]{5,}/g) || []);
    if (w.some(x => FACT_WORDS.has(x))) return act;
    return FACTS.length ? String(act).replace(/\.$/, '') + ' at ' + FACTS[0] : act;
  };
  // ── ONLY WHO WAS OFFERED ──
  // A starved candidate is WITHDRAWN from the packet now, so assigning them would be inventing a
  // recipient the request never listed — which production rightly refuses, taking the whole
  // skeleton with it. The reply assigns exactly who was offered, which is what a planner can do.
  // ── THE OFFERED SET, CAPTURED ONCE ──
  // Every delivery assertion derives from this rather than from the staged cast: "the full cast
  // receives C+" stopped being a truthful contract the moment psychology required scene evidence.
  // A candidate with no owned, matching evidence is WITHDRAWN by production, and forcing a beat
  // onto them is precisely what the ownership model exists to prevent.
  LAST_OFFERED = cast.filter(n => n !== PCN)
    .filter(n => (CAND[n] && (CAND[n].options || []).length > 0));
  let cp = cast.filter(n => n !== PCN)
    .filter(n => (CAND[n] && (CAND[n].options || []).length > 0))
    .map(n => {
      const c = CAND[n] || {}; const opt = (c.options || [])[0];
      const R = READS[n] || READ_FALLBACK(n);
      const kw = (x) => (String(x).toLowerCase().match(/[a-z]{5,}/g) || []).slice(0, 6).join(' ');
      // contract v2: the act names the fact it enacts, and engages that fact's condition — the
      // fixture appends the seed's own evidence sentence, so the act gate is met with seed words.
      const evIds = opt ? EVID(opt.option_id) : [];
      const evTxt = evIds.length ? FACT_TEXT(evIds[0]) : '';
      const ACT = groundAct(R.behavior) + (evTxt ? ' as ' + evTxt : '');
      return { character:n, mode: ((c.modes || [])[0] || 'IN_PERSON'),
               ...(opt ? { option_id: opt.option_id } : {}),
               ...(opt ? { expression_mode: 'CONTROL' } : {}),
               ...(evIds.length ? { enacts_evidence_id: evIds[0] } : {}),
               first_mention:true, behavior: ACT, visible_action: ACT,
               // NO AUTHORED PSYCHOLOGY ON RECORD is the one case where the planner still writes
               // the read; where an option EXISTS, sending one is the model rewriting canon.
               ...(opt ? {} : { character_revelation: R.character_revelation }),
               behavior_object_ids: [], behavior_person_ids: [],
               // Built from the option's own truth and condition, so the bridge genuinely connects
               // the two things it claims to — the gate checks shape, not sentiment.
               ...(opt ? { revelation_bridge: 'this act is how ' + kw(opt.truth)
                    + ' surfaces, and this scene is the case where ' + kw(opt.pressure) } : {}),
               ...(OP ? { pc_lens_operation: OP } : {}),
               ...(opt ? { pc_interpretation: String(n).split(' ')[0] + ' is not doing this idly — she is '
                    + 'making the other person state what they actually want' } : {}),
               pc_effect: REACT[n] || REACT_FALLBACK(n) };
    });
  // Anchors are the prefilled SENTINELS, copied back untouched, as the template asks.
  spine.staged_characters = spine.staged_characters.map(c =>
    // A planner may only cite FROM_CHARACTER_PLUS for someone it was actually OFFERED a C+ for.
    // A withdrawn candidate is still staged and still needs an anchor — they simply have no C+ to
    // derive it from, so the reply writes one. Leaving the sentinel there would strand it in
    // state with nothing to resolve it, which is what U8c exists to catch.
    ({ ...c, anchor_beat: c.name === PCN ? 'FROM_PC_OPENING_FUSION'
        : (LAST_OFFERED.includes(c.name) ? 'FROM_CHARACTER_PLUS'
           : 'stands where the assembly can see ' + c.name + ' without moving') }));
  // contract v2: on a seeded stage the fusion carries no target/axis (they are E+'s) and E+ is by id.
  let pof = SEEDED
    ? { character:PCN, placement:'PC_FIRST_EMBODIED_BEAT',
        character_angle:'rehearsed steadiness that does not survive contact', beat:POF_BEAT }
    : { character:PCN, placement:'PC_FIRST_EMBODIED_BEAT',
        character_angle:'rehearsed steadiness that does not survive contact',
        environment_target:ANCHOR, environment_axis:'ritual', beat:POF_BEAT };
  let ep = SEEDED
    ? { target_object_id: idFor('spiralgrass'), axis:'ritual',
        beat:`{TARGET} is worn smooth along one edge where the rite has been performed the same way for generations` }
    : { target:ANCHOR, axis:'ritual',
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
  // The model no longer sends facet_id; the equivalent omission is now the option itself.
  if (mutate === 'cpNoFacet')  cp = cp.map((c,i) => { if (i !== 0) return c; const { option_id, ...r } = c; return r; });

  // Evidence is inside the option, so a bad evidence id is unreachable. The equivalent defect is
  // an option this scene never offered.
  if (mutate === 'cpBadEvidence') cp = cp.map((c,i) => i === 0 ? { ...c, option_id:'OPT-9999' } : c);
  if (mutate === 'cpNoLensOp')  cp = cp.map((c,i) => { if (i !== 0) return c; const { pc_lens_operation, ...r } = c; return r; });
  if (mutate === 'cpBadObject') cp = cp.map((c,i) => i === 0 ? { ...c, behavior_object_ids:['O99'] } : c);
  // A pressure can no longer be named independently; the equivalent is a missing bridge.
  if (mutate === 'cpBadPressureId') cp = cp.map((c,i) => i === 0 ? (() => { const { revelation_bridge, ...r } = c; return r; })() : c);
  if (mutate === 'cpProp')     cp = cp.map((c,i) => i === 0
    ? { ...c, behavior:'he taps the ceremonial blade against his thigh while the words run on' } : c);
  // ORDER-INDEPENDENT: cite a facet that is real but belongs to someone ELSE. Keyed off the
  // entry's own facet so a change in roster order cannot turn this into a valid citation — which
  // it silently did once, and the case passed by being correct.
  // Borrowing another character's OPTION is the new form of this defect: a real id that belongs
  // to somebody else. Keyed off the entry's own id so roster order cannot make it accidentally valid.
  if (mutate === 'cpBadFacet') { const wrong = (cp.find(c => c.option_id && c.option_id !== (cp[0] || {}).option_id) || {}).option_id
      || 'OPT-1';
    const i0 = cp.findIndex(c => c.option_id && c.option_id !== wrong);
    if (i0 >= 0) cp = cp.map((c,i) => i === i0 ? { ...c, option_id:wrong } : c); }
  if (mutate === 'duplicate') cp = cp.concat([cp[0]]);
  if (mutate === 'badaxis')   ep = { target:'the spiralgrass', axis:'vibes' };
  if (mutate === 'badfusion') fu = { character:'Nobody Here', target:'the spiralgrass', beat:'he sets his palm flat on the spiralgrass' };
  // ── scalar-invariant mutations ──
  if (mutate === 'withfusion')     fu = { character: cast[0], target:'the spiralgrass', beat:'she sets her palm flat on the spiralgrass to keep it still' };
  if (mutate === 'fmfalse')        cp = cp.map((c,i) => i === 0 ? { ...c, first_mention:false } : c);
  if (mutate === 'fmmissing')      cp = cp.map((c,i) => { if (i !== 0) return c; const { first_mention, ...r } = c; return r; });
  if (mutate === 'fmstring')       cp = cp.map((c,i) => i === 0 ? { ...c, first_mention:'false' } : c);
  // `visible_action` is the field the model fills; `behavior` is the legacy alias fed from it.
  // Blanking only the alias no longer blanks the act, so both go.
  if (mutate === 'emptyangle')     cp = cp.map((c,i) => i === 0 ? { ...c, behavior:'   ', visible_action:'   ' } : c);
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
    // The facet is chosen by choosing an OPTION now — facet_id and pressure_id written here are
    // discarded on resolution. The option whose truth is the kindness/contempt one is selected by
    // matching the option's own truth text, read from the packet.
    void barefoot; void rite;
    cp = cp.map(c => {
      if (!/Dohkar/i.test(c.character)) return c;
      const cd = CAND[c.character] || {};
      const want = (cd.options || []).find(o => wantK
        ? /kind|generous|poor|nothing/i.test(o.truth)
        : /ceremon|rite|attention|contempt|routine/i.test(o.truth)) || (cd.options || [])[0];
      const act = 'he steps aside for the guest at the edge like someone who cares deeply where they stand';
      const kw = (x) => (String(x).toLowerCase().match(/[a-z]{5,}/g) || []).slice(0, 6).join(' ');
      return want ? { ...c, option_id: want.option_id, behavior: act, visible_action: act,
        // contract v2: the act binds to one of THIS option's facts
        ...(EVID(want.option_id).length ? { enacts_evidence_id: EVID(want.option_id)[0] } : {}),
        // Rebuilt for the option this mutation selects: a bridge left describing a different
        // option fails the bridge gate, and the case would be red for a reason it does not test.
        revelation_bridge: 'this act is how ' + kw(want.truth) + ' surfaces, and this scene is the '
          + 'case where ' + kw(want.pressure) } : c;
    });
  }
  // ── THE SAME DEFECT, IN THE FORM THAT IS STILL REACHABLE ──
  // This used to hang a facet on evidence that does not establish it, by writing facet_id,
  // pressure_id and evidence directly. Under the option contract those three are resolved from
  // the backend and anything the model writes there is discarded, so the old mutation is inert —
  // which is the point of the contract. The surviving form of "asserted a binding the material
  // does not support" is to cite one option while the bridge explains a different one.
  // contract v2 (2026-09-05): the bridge no longer gates, so "bridge describes a different option" is
  // no longer a defect the product can see. The surviving form is the BINDING: the act cites the
  // fact it enacts (enacts_evidence_id), and an option whose evidence does not include that fact
  // is a pairing the material does not support. The alternative option is chosen so its evidence
  // set does NOT contain the cited fact; if every alternative shares it, the case is inert.
  // The DISCRIMINATING form (2026-09-05, review control 1): for the first candidate whose offered
  // options do not all share the same evidence, cite an option whose evidence EXCLUDES a fact that
  // another of their options is established by, and name that excluded fact as the one the act
  // enacts. In First Sacrifice that is Seren: OPT-1 is established by E4 alone while E3 establishes
  // OPT-2/3/4 — so "option OPT-1, enacts E3" is a pairing the material does not support. The
  // Dohkar's four options all cite E5, which is why the old Dohkar-only form went inert; a packet
  // with NO such pair anywhere makes the fixture THROW rather than let the case pass by accident.
  // Tightening (2026-09-06) changed what is expressible: an option resting on ONE fact derives its
  // enacted fact, so "wrong evidence" can only be typed against a MULTI-fact option. The case now
  // keeps the candidate's real multi-fact option (so the act gate is satisfied by the act's own
  // words) and cites a fact from the packet that this option is NOT established by — a fact about
  // somebody else when one exists. The ONLY fault is then the binding, which is the point.
  if (mutate === 'contemptOverJealousyEvidence') {
    let placed = false;
    const ALL_IDS = [...usr.matchAll(/^ {2}(E\d+): /gm)].map(m => m[1]);
    cp = cp.map(c => {
      if (placed) return c;
      const cd = CAND[c.character] || {};
      const opts = (cd.options || []).map(o => ({ id: o.option_id, ev: EVID(o.option_id) })).filter(o => o.ev.length >= 2);
      for (const o of opts) {
        const foreign = ALL_IDS.filter(e => !o.ev.includes(e));
        const wrong = foreign.find(e => /Dohkar|Julian/i.test(FACT_TEXT(e))) || foreign[0];
        if (!wrong) continue;
        placed = true;
        return { ...c, option_id: o.id, enacts_evidence_id: wrong };
      }
      return c;
    });
    if (!placed) throw new Error('fixture: no candidate in this packet offers a multi-fact option with a foreign fact available — the discriminating cross-option case cannot be built here and must not pass silently');
  }
  if (mutate === 'readMissing')   cp = cp.map((c,i) => i === 0 ? (({ behavior, visible_action, ...r }) => r)(c) : c);
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
    if (SEEDED) {
      // contract v2: the long name is the SEED's (O1), selected by id; the beat names its head noun
      spine.environment_element_ids = [idFor('spiralgrass'), idFor('veil-canopy')].filter(Boolean);
      ep = { target_object_id: idFor('veil-canopy'), axis:'ritual',
             beat:`{TARGET} hangs lower on one side where hands have pulled it aside for generations` };
      pof = { ...pof, beat:`the leaves of {TARGET} brush my shoulder and I hold still under them` };
    } else {
      ep = { target:LONG, axis:'ritual',
             beat:`the canopy hangs lower on one side where hands have pulled it aside for generations` };
      pof = { ...pof, environment_target:LONG, environment_axis:'ritual',
              beat:`the canopy's leaves brush my shoulder and I hold still under them` };
    }
    fu = undefined;
  }
  // ── CONTRACT v2 REVIEW CONTROLS (2026-09-05) ──
  // v2OpeningActor: a fully valid ID-based plan that exercises every v2 field at once — a declared
  // opening actor whose C+ act is FROM_OPENING_BEAT, ids for elements and E+ target, a realization,
  // an enacted fact, and a fusion with no target of its own. The opening beat is the seed's own E3
  // event, which names Seren, contains "aloud" (OPT-4's condition pattern) and IS E3.
  if (mutate === 'v2OpeningActor' && SEEDED) {
    const serenId = ((usr.match(/^ {2}([a-z]+:[^:\n]+): Seren$/m) || [])[1]) || null;
    const serenOpt = ((CAND['Seren'] || {}).options || []).find(o => EVID(o.option_id).includes('E3') && /nameable in public/.test(o.pressure))
                  || ((CAND['Seren'] || {}).options || []).find(o => EVID(o.option_id).includes('E3'));
    if (!serenId || !serenOpt) throw new Error('fixture: v2OpeningActor needs Seren on stage with an E3-established option');
    spine.opening_beat = 'Seren names her offering aloud before the wish — her earliest memory — and begins the invocation exactly as rehearsed';
    spine.opening_actor_id = serenId;
    spine.environment_element_ids = [idFor('spiralgrass'), idFor('veil-canopy')].filter(Boolean);
    cp = cp.map(c => c.character === 'Seren'
      ? { ...c, option_id: serenOpt.option_id, enacts_evidence_id: 'E3', visible_action: 'FROM_OPENING_BEAT', behavior: 'FROM_OPENING_BEAT' }
      : c);
    if (!cp.some(c => c.character === 'Seren')) throw new Error('fixture: v2OpeningActor needs a Seren C+ entry');
  }
  // v2OldShape: the pre-v2 free-text shape on a seeded stage — what the twelve frozen real plans
  // sent. Rejected by name; with the valve ON it must drop assignments and still author the scene.
  if (mutate === 'v2OldShape' && SEEDED) {
    delete spine.environment_element_ids; delete spine.environment_realizations;
    spine.environment_elements = ['the deep-crimson carpet of braided spiralgrass underfoot, still and untrampled', 'the white weeping-willow veil-canopy swaying in the dawn breeze'];
    ep = { target: 'the deep-crimson carpet of braided spiralgrass', axis: 'damage', beat: 'the carpet shows faint indentations where Seren knelt' };
    pof = { ...pof, environment_target: 'the deep-crimson carpet of braided spiralgrass', environment_axis: 'damage' };
    cp = cp.map(c => { const { enacts_evidence_id, ...r } = c; return r; });
  }
  // ── CORRECTIONS 1–3 CONTROLS (Roman 2026-09-06) — built on the valid v2OpeningActor plan ──
  const V2ACTOR = (m) => ['v2ActorFreeAct', 'v2WrongActorLiteral', 'v2ActorSentinelRoster', 'v2SentinelWrongRow'].includes(m);
  if (V2ACTOR(mutate) && SEEDED) {
    const serenId = ((usr.match(/^ {2}([a-z]+:[^:\n]+): Seren$/m) || [])[1]) || null;
    const serenOpt = ((CAND['Seren'] || {}).options || []).find(o => EVID(o.option_id).includes('E3') && /nameable in public/.test(o.pressure))
                  || ((CAND['Seren'] || {}).options || []).find(o => EVID(o.option_id).includes('E3'));
    if (!serenId || !serenOpt) throw new Error('fixture: the correction controls need Seren on stage with an E3-established option');
    spine.opening_beat = 'Seren names her offering aloud before the wish — her earliest memory — and begins the invocation exactly as rehearsed';
    spine.opening_actor_id = serenId;
    spine.environment_element_ids = [idFor('spiralgrass'), idFor('veil-canopy')].filter(Boolean);
    cp = cp.map(c => c.character === 'Seren'
      ? { ...c, option_id: serenOpt.option_id, enacts_evidence_id: 'E3', visible_action: 'FROM_OPENING_BEAT', behavior: 'FROM_OPENING_BEAT' } : c);
    // 1 · the declared actor types a FREE act anyway (what 14B did 5/6) → derived, logged, ACCEPTED
    if (mutate === 'v2ActorFreeAct') cp = cp.map(c => c.character === 'Seren'
      ? { ...c, visible_action: 'Seren’s fingers tremble on the sash as her voice softens', behavior: 'Seren’s fingers tremble on the sash as her voice softens' } : c);
    // 1 · hostile: a NON-actor claims the derivation → REJECTED
    if (mutate === 'v2WrongActorLiteral') cp = cp.map(c => /Dohkar/.test(c.character)
      ? { ...c, visible_action: 'FROM_OPENING_BEAT', behavior: 'FROM_OPENING_BEAT' } : c);
    // 2 · the actor's roster row echoes the sentinel (what 14B did 5/6) → ACCEPTED, anchor derived
    if (mutate === 'v2ActorSentinelRoster') spine.staged_characters = spine.staged_characters.map(c =>
      c.name === 'Seren' ? { ...c, anchor_beat: 'FROM_OPENING_BEAT' } : c);
    // 2 · hostile: the sentinel on somebody else's row → REJECTED
    if (mutate === 'v2SentinelWrongRow') spine.staged_characters = spine.staged_characters.map(c =>
      /Dohkar/.test(c.name) ? { ...c, anchor_beat: 'FROM_OPENING_BEAT' } : c);
  }
  // 3 · a seed object whose NAME is absent from the scene text (the sash, O5), chosen by id → ACCEPTED
  if (mutate === 'v2SashById' && SEEDED) {
    const sash = idFor('sash');
    if (!sash) throw new Error('fixture: v2SashById needs the sash object in the packet');
    spine.environment_element_ids = [idFor('spiralgrass'), sash].filter(Boolean);
    ep = { target_object_id: sash, axis: 'ritual', beat: '{TARGET} is worn pale along one edge where the rite has been handled the same way for generations' };
    pof = { ...pof, beat: 'my thumb finds {TARGET} where the rite has worn it smooth, and my rehearsed steadiness feels newly counterfeit' };
    fu = { character: cast[0], target: 'the sash', beat: 'she sets her palm flat on the sash to keep it still' };
  }
  // ── TIGHTENING CONTROLS (2026-09-06) ──
  // derived evidence: the Dohkar's option rests on ONE fact; a typed E6 is replaced by it, logged → ACCEPTED
  if (mutate === 'v2EvidenceDerived' && SEEDED) cp = cp.map(c => /Dohkar/.test(c.character) ? { ...c, enacts_evidence_id: 'E6' } : c);
  // hostile: the E+ beat names ANOTHER object → REJECTED
  if (mutate === 'v2BeatOtherObject' && SEEDED) ep = { ...ep, beat: '{TARGET} is worn smooth where the sash has dragged across it for generations' };
  // hostile: no {TARGET} — the planner named the thing itself → REJECTED
  if (mutate === 'v2NoPlaceholder' && SEEDED) ep = { ...ep, beat: 'the carpet is worn smooth along one edge where the rite has been performed the same way for generations' };
  // hostile: the retired free-text realization channel → REJECTED
  if (mutate === 'v2RealizationsSent' && SEEDED) spine.environment_realizations = { [idFor('spiralgrass')]: 'pressed flat where Seren kneels' };
  // 3 · hostile: an id this scene does not contain → REJECTED
  if (mutate === 'v2UnknownObjectId' && SEEDED) spine.environment_element_ids = ['O42', idFor('spiralgrass')].filter(Boolean);
  // 3 · hostile: E+ cites a valid id that was NOT chosen as an element → REJECTED
  if (mutate === 'v2TargetNotChosen' && SEEDED) {
    spine.environment_element_ids = [idFor('spiralgrass'), idFor('gossamer band')].filter(Boolean);
    ep = { target_object_id: idFor('veil-canopy'), axis: 'ritual', beat: '{TARGET} hangs lower on one side where hands have pulled it aside for generations' };
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
    // contract v2: by id on a seeded stage, and the chosen element ids must include it
    if (SEEDED) {
      spine.environment_element_ids = [idFor('spiralgrass'), idFor('gossamer band')].filter(Boolean);
      ep = { target_object_id: idFor('gossamer band'), axis:'ritual',
             beat:`{TARGET} is worn thin along one edge where the rite has been performed the same way for generations` };
      fu = { character: cast[0], target:CLOTH, beat:'she tugs the band tighter until the knot bites' };
      pof = { ...pof, beat:CLOTH_BEAT.replace(CLOTH, '{TARGET}') };
    } else {
      ep = { target:CLOTH, axis:'ritual',
             beat:`${CLOTH} is worn thin along one edge where the rite has been performed the same way for generations` };
      fu = { character: cast[0], target:CLOTH, beat:'she tugs the band tighter until the knot bites' };
      pof = { ...pof, environment_target:CLOTH, environment_axis:'ritual', beat:CLOTH_BEAT };
    }
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

// ── THE BROWSER IS RECYCLED, NOT NURSED ──
// One browser served every context in this suite: roughly sixty of them, each loading a
// three-hundred-thousand-line application. It died of exhaustion partway through the mutation
// loop — twice at the same stage — and reported it as "Target page, context or browser has been
// closed", which reads like a harness bug and is really a resource ceiling. Recycling on a fixed
// count is deterministic; waiting for it to fall over is not.
let browser = await chromium.launch({ headless: true });
let _ctxIssued = 0, _browserGeneration = 1, _ctxLive = 0;
const CTX_PER_BROWSER = 10;
const results = []; const ok = (n, p, d) => { results.push({ n, p: !!p, d: d || '' }); console.log((p ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + String(d).slice(0, 260) : '')); };
const utf8 = s => Buffer.byteLength(String(s == null ? '' : s), 'utf8');
async function run(label, seedFn, stageMode) {
  // stageMode: 'valid' | 'noContract' | 'unissuedRef' | 'emptyMission' | 'generic'
  const browser = await chromium.launch({ headless: true }); const page = await (await browser.newContext()).newPage();
  const planner = [], author = [], refunds = [], logs = [], dialogs = []; const rows = []; const bodies = [];   // bodies: exact client request bodies for planner/author kinds (proxy-boundary replay)
  page.on('console', m => { const t = m.text(); if (/SCENE1:SOFT|SCENE1:SKELETON|SCENE1:STAGE|SCENE1:ENVELOPE|SCENE1:PLANNER|SCENE1:FUSION|SCENE-LEDGER|BeginStory\]|ISSUE-PURCHASE|charge declined|subscribed=false|Corridor\]|PAYWALL|CHECKOUT_RETURN|GROK-LIT|AUTHOR-FALLBACK|ISSUE-REFUND|SKELETON:STAGE|Fate stumbled|BEGIN:REFUND/.test(t)) logs.push(t.replace(/\s+/g, ' ').slice(0, 220)); });
  page.on('dialog', async d => { dialogs.push(d.message().slice(0, 200)); await d.dismiss(); });
  // PAGE-LEVEL FAILURE CAPTURE (2026-09-07: silent arms produced NO console output; nothing recorded why).
  const pageEvents = [];
  page.on('pageerror', e => pageEvents.push('pageerror: ' + String(e && e.message).slice(0, 200)));
  page.on('crash', () => pageEvents.push('CRASH: page crashed'));
  page.on('requestfailed', r => { const u = r.url(); if (!/sb-test\.localhost/.test(u)) pageEvents.push('requestfailed: ' + u.replace(/^https?:\/\/[^/]+/, '').slice(0, 120) + ' ' + ((r.failure() || {}).errorText || '')); });
  page.on('console', m => { if (m.type() === 'error') pageEvents.push('console.error: ' + m.text().slice(0, 200)); });
  await installSession(page);
  await page.route('**/sb-test.localhost/**', r => r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
  await page.route('**/api/**', async route => {
    const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (/\/api\/config\b/.test(url)) return route.fulfill({ status:200, contentType:'application/json', body: configBody() });
    if (isAuthOrigin(route.request().url())) return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    if (/\/api\/refund-fortune\b/.test(url)) { let b={}; try { b = JSON.parse(route.request().postData()||'{}'); } catch(_){} refunds.push({ context: b.context || null, amount: b.amount || null }); return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ success:true, refunded: b.amount || 0, fortunesRemaining: 9999 }) }); }
    if (PASSTHROUGH.test(url)) return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    const k = Object.keys(LOCAL).find(x => url.startsWith(x)); if (k) return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(LOCAL[k]) });
    let b=null; try { b = JSON.parse(route.request().postData()||'{}'); } catch(_){ b = {}; }
    if (!MODEL.test(url)) return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    const m=(b&&b.messages)||[]; const sys=String((m.find(x=>x.role==='system')||{}).content||''); const usr=String((m.find(x=>x.role==='user')||{}).content||'');
    const _txt = sys + '\n' + usr; const _hits = REQUEST_KINDS.filter(([, test]) => test(_txt, sys, usr)).map(([k]) => k); const kind = _hits.length === 1 ? _hits[0] : null;
    rows.push({ kind: kind || 'unclassified', url, role: b.role || null, model: b.model || null, preferredModel: b.preferredModel || null, effort: b.reasoningEffort || b.reasoning_effort || null, bytes: utf8(sys) + utf8(usr) });
    if (kind === 'planner' || kind === 'author') bodies.push({ kind, url, body: b });
    let out;
    if (kind === 'portfolioBatch') {
        const refs = [...sys.matchAll(/subject_ref: (\S+)/g)].map(m => m[1]);
        // The five NAMED SLOTS the contract now requires, plus the per-facet contrast fields and
        // the per-subject signature. A harness that kept the old shape would be testing a schema
        // production no longer accepts.
        const DIMS = ['value','insecurity','defense','relationship','exception'];
        let _fi = 0;
        // Third person, mechanisms rather than maxims, a named pressure in every prediction, and
        // an exception that says which slot it complicates and when. Placeholder predictions no
        // longer validate — the gates they would fail are the ones the live sample failed.
        const F = (canonical_truth, unique_prediction, w1, e1, w2, e2) => ({
          dimension: DIMS[(_fi++) % DIMS.length], canonical_truth, unique_prediction,
          not_explained_by: 'not the neighbouring facet, which is about something else entirely',
          applicability_conditions: [{ text:w1, evidence_words: e1.split('|') }, { text:w2, evidence_words: e2.split('|') }],
          forbidden_restatements: [{ forbid:'is predictable', why:'the truth stated, not shown' }] });
        out = JSON.stringify({ characterPortfolios: refs.map(r => ({ subject_ref: r,
          identity_signature: 'the only one here who reads a rule as a shelter rather than a weapon',
          facets: (_fi = 0, [
          F('With people who hold no leverage over her she is unexpectedly generous.',
            'Offered a favour by someone powerful, she declines it and helps the clerk instead.',
            'a procedure the house performs every day','customs|house','a step nobody audits','signed|counts|already'),
          F('Deference paid to someone else makes her newly attentive to her own standing.',
            'When a junior is thanked before her, she recites her own seniority to a stranger.',
            'a room holding more than one authority','customs|house|Lirael','someone junior given weight','younger|senior|standing'),
          F('Paperwork repeated daily rarely earns her full attention, and she barely hides it.',
            'Asked to witness a routine signing, she signs without reading and dares anyone to object.',
            'a mistake that can still be corrected','counts|signed|already','a person doing the work badly','error|wrong|mistake'),
          F("She turns another person's error into an instruction, wanted or not.",
            'Once a colleague admits confusion, she explains at length past the point of welcome.',
            'an obligation already entered into','signed|counts|already','a price judged small','cost|price|paid'),
          F('Her relationship habit of correcting others stops with anyone already humiliated once.',
            'When a clerk she once corrected is mocked by someone else, she covers the error herself.',
            'someone with nothing to trade','customs|house|Lirael','a person placed beneath her','beneath|edge|apart')]) })) });
      } else if (kind === 'scaffold') {
        // The roster line the request carries is the ONLY source of the ref the responder echoes
    } else if (kind === 'scaffold') { const _ref = _txt.match(/subject_ref:\s*(\S+)/); out = JSON.stringify(scaffoldReply(_ref ? _ref[1] : null, true)); }
    else if (kind === 'author') {
      author.push({ bytes: utf8(sys) + utf8(usr), url, role: b.role || null, preferredModel: b.preferredModel || null, model: b.model || null });
      if (stageMode === 'authorRealPage') { /* PINNED to the retained REAL Grok page (00:32 run), never 'latest' */ const _rp = fs.readdirSync('_validate_out').filter(f => /^scene1_measure_live\.rawreply\.2026-09-09T00-32.*author\.1\.txt$/.test(f)).sort().pop(); out = fs.readFileSync('_validate_out/' + _rp, 'utf8'); }
      // ── GROK-ONLY AUTHOR TRANSPORT CONTROLS ── the proxy's failure shape (JSON error + upstream status).
      const aAttempt = author.length;
      if ((stageMode === 'grokOnlyAuthor503once' && aAttempt === 1) || stageMode === 'grokOnlyAuthor503twice')
        return route.fulfill({ status:503, contentType:'application/json', body: JSON.stringify({ error: 'xAI API request failed', details: { error: { message: 'unit 503 (author)' } } }) });
      // real provider error class 2: a 200 whose content is EMPTY (the proxy passes it through)
      if (stageMode === 'grokOnlyAuthorEmpty') return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ id:'mock', object:'chat.completion', model:'grok-4.3', usage:{}, _orchestration:{ role: b.role, model:'grok-4.3' }, choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content: '' } }] }) });
      // real provider error class 3: the connection fails (fetch rejects — no status at all)
      if (stageMode === 'grokOnlyAuthorAbort') return route.abort('connectionfailed');
      if (stageMode !== 'authorRealPage') out = PROSE;
    }
    else if (kind === 'planner') {
      const asked = /\"stage_contract\": \\{|STAGE_CONTRACT RULES|STAGE_CONTRACT \\(REQUIRED\\)/.test(usr); const issued = [...usr.matchAll(/^\s+·\s+(\S+)\s*$/gm)].map(x => x[1]);
      planner.push({ asked, issued, bytes: utf8(sys) + utf8(usr), max_tokens: b.max_tokens, hasMissionRule: /SCENE MISSION \(REQUIRED in this mode\)/.test(usr),
                     url, role: b.role || null, model: b.model || null, preferredModel: b.preferredModel || null, effort: b.reasoningEffort || null, rf: (b.response_format && b.response_format.type) || null });
      // ── TRANSPORT CONTROLS (route decision 2026-09-07) ── the proxy's shape on failure: a JSON error body
      // with the upstream status. 'fail503once' answers the FIRST attempt 503 and the second validly;
      // 'fail503twice' answers every attempt 503; 'fail400' answers 400 (chain exhausted, not retryable).
      const attempt = planner.length;
      if ((stageMode === 'fail503once' && attempt === 1) || stageMode === 'fail503twice')
        return route.fulfill({ status:503, contentType:'application/json', body: JSON.stringify({ error: 'xAI API request failed', details: { error: { message: 'unit 503' } } }) });
      if (stageMode === 'fail400')
        return route.fulfill({ status:400, contentType:'application/json', body: JSON.stringify({ error: 'All Grok models in fallback chain failed', details: null, chainTried: ['grok-4.3'] }) });
      if (stageMode === 'generic') out = JSON.stringify(GENERIC);
      else {
        let env = JSON.parse(plannerReply(usr, null));
        if (stageMode === 'emptyMission' && env.opening_spine) env.opening_spine.scene_mission = '';
        // ── SOLO-SCENE controls (validator repair pass, 2026-09-09) ── comparison vs an actual second body
        if (stageMode === 'soloSimile' && env.opening_spine) env.opening_spine.pc_self_presentation_beat = 'opening: I shove my sleeves higher with one forearm, the motion too quick, like someone who already knows she will lose this round';
        if (stageMode === 'soloAsIf' && env.opening_spine)   env.opening_spine.pc_self_presentation_beat = 'opening: I keep my back to the wall as if somebody were standing behind me';
        if (stageMode === 'soloReal' && env.opening_spine)   env.opening_spine.pc_self_presentation_beat = 'opening: Someone steps into the doorway behind me before I can turn';
        if (stageMode === 'soloAsGuard' && env.opening_spine) env.opening_spine.pc_self_presentation_beat = 'opening: I square my shoulders as the guard steps closer';
        if (stageMode === 'soloCapReal' && env.opening_spine) env.opening_spine.pc_self_presentation_beat = 'A clerk stands at the far counter, watching me count what is left';
        if (stageMode === 'soloCapGreen' && env.opening_spine) env.opening_spine.pc_self_presentation_beat = 'The kettle stands cold on the ring. Another morning waits for nobody in this kitchen';
        if (asked && stageMode !== 'noContract') {
          const self = 'pc:self'; const other = issued.find(r => r !== self) || null;
          const bad = stageMode === 'unissuedRef';
          // Self-consistent with the fixture's staged_characters (the PC): pc:self IN_PERSON; the issued antagonist
          // ANTICIPATED (declared, not in the room). 'mismatch' stages the antagonist IN_PERSON while staged_characters
          // omits him — the product's own roster rule must reject that.
          const inRoom = stageMode === 'mismatch';
          env.stage_contract = { v: 1,
            participants: [{ ref: bad ? 'named:invented_person' : self, presence: 'IN_PERSON' }].concat(other && !bad ? [{ ref: other, presence: inRoom ? 'IN_PERSON' : 'ANTICIPATED' }] : []),
            event_facts: [{ text: 'She counts what the invitation has already cost her before the stranger arrives', participants: [{ ref: bad ? 'named:invented_person' : self, role: 'actor' }] }],
            elements: (() => { const els = (env.opening_spine && env.opening_spine.environment_elements) || []; const tgt = env.scene_skeleton && env.scene_skeleton.environment_plus && env.scene_skeleton.environment_plus.target; const all = [...new Set([...(tgt ? [tgt] : []), ...els])]; return all.map(n => ({ name: n, affordance: 'GRASPABLE' })); })() };
          // staged_characters must mirror the room (planner-owned rule): keep the fixture's staged list as is; the
          // suite's plannerReply stages from the request's eligible cast (the PC), which matches pc:self.
          // ── LOCATION CONTROLS (live run 2026-09-07 nested envelope members) ── the same valid contract, placed
          // where a real model put things: inside opening_spine, inside scene_skeleton, or in two places that disagree.
          if (stageMode === 'nestedSpine') { env.opening_spine.stage_contract = env.stage_contract; delete env.stage_contract; }
          if (stageMode === 'nestedSkeleton') { env.scene_skeleton = env.scene_skeleton || {}; env.scene_skeleton.stage_contract = env.stage_contract; delete env.stage_contract; }
          if (stageMode === 'nestedConflict') { env.opening_spine.stage_contract = JSON.parse(JSON.stringify(env.stage_contract)); env.opening_spine.stage_contract.participants[0].presence = 'ANTICIPATED'; }
          // ── ADVERSARIAL LOCATION CONTROLS (Roman 2026-09-07) ── a key match must never be enough.
          // A1 the valid contract sits DEEPER than any recognised container (inside a spine member) → not consulted → "absent".
          if (stageMode === 'deepDecoy') { env.opening_spine.pc_opening_fusion = Object.assign({}, env.opening_spine.pc_opening_fusion || {}, { stage_contract: env.stage_contract }); delete env.stage_contract; }
          // A2 a recognised container holds a stage_contract of the WRONG SHAPE → the schema validator rejects it, never "accepted by key".
          if (stageMode === 'malformedNested') { env.opening_spine.stage_contract = { v: 1, participants: 'pc:self IN_PERSON', event_facts: 'she waits' }; delete env.stage_contract; }
          // A3 a recognised container holds a NON-OBJECT under the key → treated as absent, no crash.
          if (stageMode === 'stringNested') { env.scene_skeleton = env.scene_skeleton || {}; env.scene_skeleton.stage_contract = 'pc:self IN_PERSON'; delete env.stage_contract; }
          // A4 the same valid contract in the top level AND the spine, IDENTICAL → accepted once (no false conflict).
          if (stageMode === 'nestedTopIdentical') { env.opening_spine.stage_contract = JSON.parse(JSON.stringify(env.stage_contract)); }
          // ── SHARED FUSION RULE CONTROLS (Roman 2026-09-07) ── the fixture's skeleton is at env.scene_skeleton.
          const sk = env.scene_skeleton || {}; const pof = sk.pc_opening_fusion || {}; const ep = sk.environment_plus || {};
          if (stageMode === 'fusionAbsentEnv')      { delete pof.environment_target; delete pof.environment_axis; }
          if (stageMode === 'fusionTargetMismatch') { pof.environment_target = 'a brass lamp nobody mentioned'; }
          if (stageMode === 'fusionAxisMismatch')   { pof.environment_axis = (ep.axis === 'damage' ? 'ritual' : 'damage'); }
          if (stageMode === 'epTargetMissing')      { delete pof.environment_target; delete pof.environment_axis; ep.target = ''; }
          if (stageMode === 'epAxisInvalid')        { delete pof.environment_target; delete pof.environment_axis; ep.axis = 'vibes'; }
          if (stageMode === 'fusionBeatOtherObject') { delete pof.environment_target; delete pof.environment_axis; pof.beat = 'I set my palm flat on the brass lamp and felt the ring of it under my skin.'; }
          // ── FUSION v3 (Roman 2026-09-07): the planner-owned request now declares the v3 member. The fixture answers in that shape,
          // anchored to the FIRST lens operation the request itself issued; modes mutate one thing each.
          const v3Offered = /"contact": \{ "verb": "<EXACTLY one of the CONTACT TYPES below, verbatim>"/.test(usr);
          const issuedOps = [...usr.matchAll(/^\s+·\s+([A-Z_]+)\s+—\s+(.+)$/gm)].map(m => ({ op: m[1], gloss: m[2].trim() }));
          if (v3Offered) {
            const op = issuedOps[0] || { op: 'NONE_ISSUED', gloss: '' };
            const PCN3 = (env.opening_spine && env.opening_spine.staged_characters && env.opening_spine.staged_characters[0] && env.opening_spine.staged_characters[0].name) || (pof && pof.character) || 'Testa';
            const canon = String(ep.target || ''); const otherEl = ((env.opening_spine && env.opening_spine.environment_elements) || []).find(e => e !== canon) || 'the customs bench';
            const v3 = { character: PCN3, placement: 'PC_FIRST_EMBODIED_BEAT',
              contact: { verb: 'PRESS', object: String(ep.target || '') },   // contact chooses the issued element; E+ target derives from it
              action: 'I set my palm flat on {ENV_TARGET} and let the cold of it climb my wrist.',
              pc_lens_operation: op.op,
              character_revelation: PCN3 + ' takes hold of it as if it were already ' + PCN3 + '\'s to answer for.',   // by NAME: valid under first- or third-person POV
              environment_pressure: { grounds: ['env:axis', 'pick:flavor'], text: 'Whatever this room has already lost, ' + PCN3 + ' is the one standing in it now.' } };
            if (stageMode === 'v3ContactOnly')      { v3.character_revelation = ''; delete v3.environment_pressure; }
            if (stageMode === 'v3RevelationOnly')   { delete v3.contact; v3.action = 'I set my palm flat on the counter and let the cold of it climb my wrist.'; }
            if (stageMode === 'v3EnvOnly')          { v3.character_revelation = String(ep.beat || ''); }
            if (stageMode === 'v3DupPlaceholder')   { v3.action = 'I set my palm on {ENV_TARGET} and then my cheek to {ENV_TARGET}.'; }
            // ── affordance / dependency-direction controls (Roman 2026-09-08) ──
            const sc = env.stage_contract || {};
            if (stageMode === 'affDerive')          { delete ep.target; }
            if (stageMode === 'affBadVerb')         { v3.contact = { verb: 'CLIMB', object: canon }; }
            if (stageMode === 'affAmbient')         { (sc.elements || []).forEach(e => { if (e.name === otherEl) e.affordance = 'AMBIENT'; }); v3.contact = { verb: 'PRESS', object: otherEl }; ep.target = otherEl; ep.beat = otherEl + ' lies pressed flat against the wall where damp has crept into its weave'; v3.action = 'I set my palm flat on {ENV_TARGET} and let the cold of it climb my wrist.'; }
            if (stageMode === 'affTargetConflict')  { v3.contact = { verb: 'PRESS', object: canon }; ep.target = otherEl; }
            if (stageMode === 'affDrag')            { v3.contact = { verb: 'DRAG', object: canon }; v3.action = 'I drag {ENV_TARGET} toward me and hold it against my chest.'; }
            if (stageMode === 'affWordingBench')    { v3.contact = { verb: 'PRESS', object: canon }; v3.action = 'I lean into the bench to shove it under the leak.'; }
            if (stageMode === 'affNoElements')      { delete sc.elements; }
            if (stageMode === 'affTokenObject')     { v3.contact = { verb: 'PRESS', object: '{ENV_TARGET}' }; }
            if (stageMode === 'v3OwnedTarget')      { v3.environment_target = String(ep.target || ''); v3.environment_axis = String(ep.axis || ''); }
            if (stageMode === 'v3BadGround')        { v3.environment_pressure.grounds = ['env:axis', 'spine:pc_career']; }
            if (stageMode === 'v3StageFactGround')  { v3.environment_pressure.grounds = ['env:axis', 'stage:fact:1']; }
            if (stageMode === 'v3NoPcRef')          { v3.character_revelation = 'The ledger keeps what the house forgets.'; }
            if (stageMode === 'v3NameOnly')         { v3.character_revelation = PCN3 + ' takes hold of what nobody asked ' + PCN3 + ' to carry.'; }
            if (stageMode === 'v3WrongPronoun')     { v3.character_revelation = 'He takes hold of what nobody asked him to carry.'; }
            if (stageMode === 'v3NoContact')        { v3.contact = { verb: 'NOTICE', object: canon }; v3.action = 'I noticed {ENV_TARGET} from across the room and thought about it.'; }
            if (stageMode === 'v3LegacyShape')      { delete v3.action; delete v3.pc_lens_operation; delete v3.character_revelation; delete v3.environment_pressure; v3.beat = 'I set my palm flat on the ledger.'; v3.character_angle = 'she reaches first'; }
            // ── identity mechanism (Roman 2026-09-08): token OR exact canonical string, once ── (canon/otherEl declared at the top of this block)
            if (stageMode === 'v3CanonicalTarget')  { v3.contact = { verb: 'PRESS', object: canon }; v3.action = 'I set my palm flat on ' + canon + ' and let the cold of it climb my wrist.'; }
            if (stageMode === 'v3ContactApron')     { v3.contact = { verb: 'WIPE', object: 'the apron' }; v3.action = 'I wipe my hands on the apron while standing at ' + canon + '.'; }
            if (stageMode === 'v3ContactDrag')      { v3.contact = { verb: 'DRAG', object: canon }; v3.action = 'I drag {ENV_TARGET} clear of the smoke with both hands.'; }
            if (stageMode === 'v3Paraphrase')       { v3.contact = { verb: 'PRESS', object: 'the old weighing book' }; v3.action = 'I set my palm flat on the old weighing book and let the cold of it climb my wrist.'; }
            if (stageMode === 'v3DupCanonical')     { v3.action = 'I set my palm flat on {ENV_TARGET} and then my cheek to ' + canon + '.'; }
            if (stageMode === 'v3OtherTarget')      { v3.contact = { verb: 'PRESS', object: otherEl }; v3.action = 'I pressed both hands to ' + otherEl + ' beside {ENV_TARGET}.'; }
            if (stageMode === 'v3PressureEnvOnly')  { v3.environment_pressure.text = 'The room has grown smaller and is already lost.'; }
            if (stageMode === 'v3PressureNamesTarget') { v3.environment_pressure.text = 'the cold of ' + canon + ' climbs my wrist and will not let me pretend the room is warm'; }   /* the 17:39 live case */
            if (stageMode === 'v3PressureToken')       { v3.environment_pressure.text = 'the cold of {ENV_TARGET} climbs my wrist and will not let me pretend'; }
            if (stageMode === 'v3PressureRestatesBeat'){ v3.environment_pressure.text = String(ep.beat || '') + ' and I feel it'; }
            if (stageMode === 'v3PressureRelation') { v3.environment_pressure.text = 'What has happened to it decides how much of tonight is still mine.'; }
            // ── ground aliases (Roman 2026-09-08) ──
            const axisVal = String(ep.axis || 'ritual');
            if (stageMode === 'v3AliasAxis')        { v3.environment_pressure.grounds = ['env:' + axisVal, 'pick:flavor']; }
            if (stageMode === 'v3AliasRef')         { v3.environment_pressure.grounds = ['env:axis', 'pc:self']; }
            if (stageMode === 'v3AliasWrongAxis')   { v3.environment_pressure.grounds = ['env:' + (axisVal === 'damage' ? 'ritual' : 'damage'), 'pick:flavor']; }
            if (stageMode === 'v3AliasUnknownRef')  { v3.environment_pressure.grounds = ['env:axis', 'pc:nobody']; }
            if (stageMode === 'v3RevelationNearGloss') { const g = (issuedOps[0] || {}).gloss || ''; v3.character_revelation = PCN3 + ' ' + g.replace(/^she /, ''); }
            // ── coherence (Roman 2026-09-08) ──
            if (stageMode === 'v3NoWording')        { delete v3.action; }
            if (stageMode === 'v3WordingOther')     { v3.action = 'I pressed both hands to ' + otherEl + ' and held on.'; }
            if (stageMode === 'v3WordingNoTarget')  { v3.action = 'I wiped the flour from my knuckles and waited.'; }
            if (stageMode === 'v3WordingPart')      { v3.action = 'thumb jamming the button'; }   /* the 06:56 live case: a PART of the target */
            // ── VALIDATOR REPAIR PASS (Roman 2026-09-09): capability sets + head-noun co-reference ──
            const _tgtEl = (sc.elements || []).find(e => e.name === canon);
            const _head = canon.trim().split(/\s+/).pop().replace(/[^\w'-]/g, '');
            const _addEl = (name) => { env.opening_spine.environment_elements = (env.opening_spine.environment_elements || []).concat([name]); (sc.elements || []).push({ name, affordance: 'GRASPABLE' }); };
            if (stageMode === 'capSet')           { if (_tgtEl) { delete _tgtEl.affordance; _tgtEl.affordances = ['PORTAL', 'FIXTURE']; } v3.contact = { verb: 'PUSH', object: canon }; v3.action = 'I shove {ENV_TARGET} wider with my elbow.'; }
            if (stageMode === 'capStringSet')     { if (_tgtEl) _tgtEl.affordance = 'PORTAL|FIXTURE'; v3.contact = { verb: 'PUSH', object: canon }; v3.action = 'I shove {ENV_TARGET} wider with my elbow.'; }
            if (stageMode === 'capFixturePush')   { if (_tgtEl) _tgtEl.affordance = 'FIXTURE'; v3.contact = { verb: 'PUSH', object: canon }; v3.action = 'I shove {ENV_TARGET} wider with my elbow.'; }
            if (stageMode === 'capFixtureLift')   { if (_tgtEl) _tgtEl.affordance = 'FIXTURE'; v3.contact = { verb: 'LIFT', object: canon }; v3.action = 'I lift {ENV_TARGET} clear.'; }
            if (stageMode === 'capSetLift')       { if (_tgtEl) { delete _tgtEl.affordance; _tgtEl.affordances = ['PORTAL', 'FIXTURE']; } v3.contact = { verb: 'LIFT', object: canon }; v3.action = 'I lift {ENV_TARGET} clear.'; }
            if (stageMode === 'capAmbientMix')    { if (_tgtEl) _tgtEl.affordance = 'AMBIENT|SURFACE'; }
            if (stageMode === 'capFreeText')      { if (_tgtEl) _tgtEl.affordance = 'hinged, pushable'; }
            if (stageMode === 'crHead')           { v3.action = 'I set my palm flat on the ' + _head + ' and let the cold of it climb my wrist.'; }
            if (stageMode === 'crPossessive')     { v3.action = 'I set my palm flat on its ' + _head + ' and wait.'; }
            if (stageMode === 'crAmbiguous')      { _addEl('the second ' + _head); v3.action = 'I set my palm flat on the ' + _head + ' and let the cold of it climb my wrist.'; }
            if (stageMode === 'crDisambigOther')  { _addEl('the second ' + _head); v3.action = 'I set my palm flat on the second ' + _head + ' and let the cold of it climb my wrist.'; }
            if (stageMode === 'crDisambigTarget') { _addEl('the second ' + _head); v3.action = 'I set my palm flat on {ENV_TARGET} and let the cold of it climb my wrist.'; }
            if (stageMode === 'crHeadTwice')      { v3.action = 'I set my palm on the ' + _head + ' and then my cheek to the ' + _head + '.'; }
            sk.pc_opening_fusion = v3;
          } else if (/NO pc_opening_fusion THIS SCENE/.test(usr)) {
            delete sk.pc_opening_fusion;   // no fusion offered → the fixture returns none
          }
        }
        // ── REPLAY OF THE RETAINED LIVE PLANNER REPLY (2026-09-07 18:55) ── the real Grok reply, verbatim; only the
        // planner-owned mode's issued refs are those of THIS run (its contract names only pc:self, which every run issues).
        const _replayFile = (stamp) => fs.readdirSync('_validate_out').filter(f => f.startsWith('scene1_measure_live.rawreply.' + stamp) && /planner\.1\.txt$/.test(f)).sort().pop();
        const _injectElements = (txt) => { const o = JSON.parse(txt.replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '')); const els = (o.opening_spine && o.opening_spine.environment_elements) || []; const aff = n => /table|counter|bench|floor|sill|step/i.test(n) ? 'SURFACE' : /door|gate|hatch|window/i.test(n) ? 'PORTAL' : /vent|skylight|rail|pipe|hook|frame/i.test(n) ? 'FIXTURE' : /air|light|sound|smell|wind|horn|echo/i.test(n) ? 'AMBIENT' : 'GRASPABLE'; if (o.stage_contract) o.stage_contract.elements = els.map(n => ({ name: n, affordance: aff(n) })); return JSON.stringify(o); };
        const RETAINED = { replay0035: '2026-09-08T04-35', replay2032: '2026-09-09T00-32', replay2212: '2026-09-09T02-12', replay0420: '2026-09-09T04-20',
          replay2210: '2026-09-08T02-10', replay1716: '2026-09-08T21-15', replay0656: '2026-09-09T06-56', replay1131: '2026-09-09T11-3', replay1739: '2026-09-09T17-38', replay0114: '2026-09-10T01-14' };
        const _stripEpTarget = (txt) => { const o = JSON.parse(txt.replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '')); if (o.scene_skeleton && o.scene_skeleton.environment_plus) delete o.scene_skeleton.environment_plus.target; return JSON.stringify(o); };
        // the 04:20 reply (first live call under the affordance contract) with ONLY its solo-scene false-positive simile removed:
        // shows the NEXT real fault the new contract would name (a harness mutation of one clause, nothing else)
        const _noSimile = (txt) => txt.replace(/, like someone who already knows she will lose this round/, '');
        if (stageMode === 'replay2101') { out = fs.readFileSync('_validate_out/scene1_measure_live.rawreply.planner.1.txt', 'utf8'); }   /* the un-stamped 21:01 file */
        else if (RETAINED[stageMode]) { out = fs.readFileSync('_validate_out/' + _replayFile(RETAINED[stageMode]), 'utf8'); }
        else if (stageMode === 'replay1131NoTarget') { out = _stripEpTarget(fs.readFileSync('_validate_out/' + _replayFile(RETAINED.replay1131), 'utf8')); }
        else if (stageMode === 'replay0420NoSimile') { out = _noSimile(fs.readFileSync('_validate_out/' + _replayFile(RETAINED.replay0420), 'utf8')); }
        else if (RETAINED[String(stageMode).replace(/Els$/, '')]) { out = _injectElements(fs.readFileSync('_validate_out/' + _replayFile(RETAINED[String(stageMode).replace(/Els$/, '')]), 'utf8')); }
        else if (stageMode === 'replayLive') { /* TIMESTAMPED names only, latest */ const _lf = fs.readdirSync('_validate_out').filter(f => /^scene1_measure_live\.rawreply\.\d{4}-\d{2}-\d{2}T.*planner\.1\.txt$/.test(f)).sort().pop(); out = fs.readFileSync('_validate_out/' + _lf, 'utf8'); }
        else
        out = JSON.stringify(env);
      }
    }
    else if (kind === 'aplotGenerator' || kind === 'aplotCorrection') out = JSON.stringify(APLOT_VALID);
    else if (kind === 'antagonistBodyBible') out = JSON.stringify(ANTAGONIST_BIBLE);
    else if (kind === 'pcBodyBible') out = JSON.stringify(PC_BIBLE);
    else if (kind === 'liBodyBible') out = JSON.stringify(LI_BIBLE);
    else out = JSON.stringify(GENERIC);
    const envelope = /mistral-proxy|\/api\/proxy\b/.test(url) ? { id:'mock', object:'chat.completion', model:b.model, usage:{ prompt_tokens: 0, completion_tokens: 0, completion_tokens_details: { reasoning_tokens: 0 } }, _orchestration:{ role: b.role || null, model: b.model }, choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content: out } }] } : { ok:true, content: out, choices:[{ message:{ content: out } }] };
    return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(envelope) });
  });
  const t0 = Date.now(); let up = false; while (Date.now() - t0 < 240000 && !up) { try { await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:20000 }); await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout:60000 }); up = true; } catch (_) { await new Promise(r => setTimeout(r, 3000)); } }
  if (!up) throw new Error('server never answered');
  // LET THE PAGE'S OWN AUTO-BEGIN FIRE FIRST (2026-09-07). The checkout-return branch schedules
  // window.handleBeginStory() 500 ms after load. Seeding the fixture before that timer fires turns
  // the auto call into the real flow and makes the harness's own call a silently ignored duplicate
  // — the state read then races a flow the harness never awaited (the run-7 A3 signature). Waiting
  // past the timer with UNSEEDED state lets the auto call return early, so the harness's call is
  // the only flow. Z-flow-* asserts exactly one flow per scenario.
  await page.waitForTimeout(2000);
  await page.evaluate(seedFn); await page.waitForTimeout(6000); await page.evaluate(seedFn);
  // RACE OUTCOME IS EVIDENCE (A3 flake, 2026-09-07): "no fatal, no throw" must be distinguishable from
  // "the product hung and the 180 s window expired" and from "handleBeginStory resolved silently".
  let threw = null, raceOutcome = null; const tRun = Date.now();
  try { raceOutcome = await page.evaluate(() => Promise.race([
      window.handleBeginStory().then(() => 'resolved', e => 'rejected:' + String(e && e.message).slice(0, 160)),
      new Promise(x => setTimeout(() => x('timeout180s'), 180000)) ])); }
  catch (e) { threw = String(e && e.message).slice(0, 160); }
  const durationMs = Date.now() - tRun;
  await page.waitForTimeout(4000);
  const st = await page.evaluate(() => ({ fatal: window.state._scene1SkeletonFatal || null, pages: window.StoryPagination.getPageCount(), pageText: Array.from(document.querySelectorAll('#storyText .story-page')).map(e => e.innerText || e.textContent || '').join('\n'), closer: window.state._sceneOneMandatedCloser || null, turn: window.state.turnCount, genStage: !!(window.state._cpGeneratedStage && window.state._cpGeneratedStage['1']), mission: window.state._scene1Mission || null, ledger: ((window.state._sceneLedger||{}).entries||[]).length, contract: (function(){ try { const c = window._sceneStageContract ? window._sceneStageContract(window.state, 1) : null; return c ? { ok: c.ok, source: c.source, onStage: (c.onStage||[]).map(x=>x.label) } : null; } catch (e) { return String(e); } })() }));
  await browser.close();
  const flowStarted = logs.some(l => /Past _beginStoryInProgress guard/.test(l));
  if (!flowStarted) { try { console.log('   ⚠ SCENARIO INVALID (no begin-story flow started): ' + label + ' · race=' + raceOutcome + ' · ' + durationMs + 'ms · last logs: ' + JSON.stringify(logs.slice(-4).map(l => l.slice(0, 120))) + ' · page events: ' + JSON.stringify(pageEvents.slice(0, 6))); } catch (_) {} }
  return { label, planner: planner[0] || null, plannerCount: planner.length, authorCount: author.length, authors: author, refunds, dialogs, logs, st, threw, raceOutcome, durationMs, rows, bodies, flowStarted, pageEvents };
}
const modern = () => { const s = window.state; window.__disableSpeculativePreload = true;
  s.picks = Object.assign(s.picks||{}, { world:'Modern', worldSubtype:'small_town', tone:'Earnest', flavor:'Billionaire', dynamic:'Enemies', pov:'first_person', length:'fling', intensity:'low', archetype:{ primary:'BEAUTIFUL_RUIN' }, playerMask:'OPEN_VEIN', loveInterest:'Male', identity:{ playerName:'Testa', partnerName:'Rook' } });
  Object.assign(s, { world:'Modern', worldSubtype:'small_town', flavor:'Billionaire', dynamic:'Enemies', archetype:{ primary:'BEAUTIFUL_RUIN', modifier:null }, name:'Testa', playerName:'Testa', loveInterestName:'Rook', partnerName:'Rook', loveInterest:'Male', liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true, fortunes:9999999, intensity:'low', pov:'first_person', identity:{ playerName:'Testa', partnerName:'Rook' }, renderMode:'literary', currentEngine:'literary', storyId:'stageorder-' + Math.random().toString(36).slice(2,8), myUid:'probe', _skipCorridorValidation:true });
  s.picks.identity = s.identity; };
const seeded = () => { const s = window.state; window.__disableSpeculativePreload = true;
  const def = (window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice'); s.picks = s.picks||{};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>{ s.picks[k]=def[k]; });
  Object.assign(s,{ world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic, archetype:{primary:def.archetype,modifier:null}, name:'Lirael', playerName:'Lirael', loveInterestName:'Julian', partnerName:'Julian', loveInterest:'Male', liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true, fortunes:9999999, intensity:'Steamy', pov:'first_person', identity:{playerName:'Lirael',partnerName:'Julian'}, renderMode:'literary', currentEngine:'literary', storyId:'stageorder-seeded', myUid:'probe', _starterId: def.id, is_starter_story: true, immutableTitle: def.title, _skipCorridorValidation:true });
  s.picks.identity = s.identity; };

const G = await run('unseeded Modern · valid planner (mission + stage_contract)', modern, 'valid');
ok('G1 the opening planner request was BUILT and dispatched for an unseeded story (no pre-planner abort)', G.plannerCount >= 1, 'planner requests=' + G.plannerCount + ' threw=' + G.threw);
ok('G2 the request carries the STAGE_CONTRACT block, ISSUED REFS (pc:self first) and the mission requirement', G.planner && G.planner.asked && G.planner.issued[0] === 'pc:self' && G.planner.hasMissionRule, JSON.stringify(G.planner && { issued: G.planner.issued, max: G.planner.max_tokens }));
ok('G3 with a valid reply the stage re-resolved from the planner stage and the author was dispatched', G.st.genStage && G.authorCount >= 1 && G.st.contract && G.st.contract.ok && /^generated:/.test(G.st.contract.source), JSON.stringify({ contract: G.st.contract, author: G.authorCount, fatal: G.st.fatal }));
ok('G4 Scene 1 mounted: one page, ledger p1, no fatal, no refund, no dialog', G.st.pages === 1 && G.st.ledger === 1 && !G.st.fatal && G.refunds.length === 0 && G.dialogs.length === 0, JSON.stringify({ pages: G.st.pages, ledger: G.st.ledger, refunds: G.refunds, dialogs: G.dialogs }));
ok('G5 the mission the planner returned became the corridor mission', !!G.st.mission, String(G.st.mission).slice(0, 80));
fs.writeFileSync('_validate_out/stage_order_valid.json', JSON.stringify(G, null, 2));

const N = await run('unseeded Modern · planner omits stage_contract', modern, 'noContract');
ok('R1 no stage_contract → fail-closed: fatal names the rejected stage, NO author dispatch, NO page', /stage_contract rejected|still unresolved/.test(String(N.st.fatal)) && N.authorCount === 0 && N.st.pages === 0, JSON.stringify({ fatal: N.st.fatal, author: N.authorCount }));
ok('R1b …and the reader path: issue refund requested + honest "Fate stumbled" dialog', N.refunds.length >= 1 && N.dialogs.some(d => /Fate stumbled|refunded|Fortunes/.test(d)), JSON.stringify({ refunds: N.refunds, dialogs: N.dialogs }));
const U = await run('unseeded Modern · stage_contract names an UNISSUED ref', modern, 'unissuedRef');
ok('R2 unissued ref → rejected, fail-closed, refund', /stage_contract rejected/.test(String(U.st.fatal)) && U.authorCount === 0 && U.st.pages === 0 && U.refunds.length >= 1, JSON.stringify({ fatal: U.st.fatal, refunds: U.refunds.length }));
const E = await run('unseeded Modern · empty scene_mission', modern, 'emptyMission');
ok('R3 empty scene_mission → fail-closed before the author, refund', /no scene_mission/.test(String(E.st.fatal)) && E.authorCount === 0 && E.refunds.length >= 1, JSON.stringify({ fatal: E.st.fatal }));
const M = await run('unseeded Modern · stage_contract stages the antagonist IN_PERSON but staged_characters omits him', modern, 'mismatch');
ok('R4 roster mismatch → rejected by the existing staged_characters rule, fail-closed', /missing from staged_characters|not part of this scene|staged/.test(String(M.st.fatal)) && M.authorCount === 0 && M.st.pages === 0, String(M.st.fatal).slice(0, 200));
const S = await run('seeded First Sacrifice · generic planner reply (unchanged path)', seeded, 'generic');
ok('S1 seeded: planner-owned mode NOT entered (no STAGE_CONTRACT block, no mission rule)', S.planner && !S.planner.asked && !S.planner.hasMissionRule, JSON.stringify(S.planner && { asked: S.planner.asked, bytes: S.planner.bytes }));
ok('S2 seeded: the generic reply still fails at the envelope (behavior identical to before the repair)', /no opening_spine/.test(String(S.st.fatal)), String(S.st.fatal));
const app = fs.readFileSync('public/app.js', 'utf8');
ok('S3 static: baked starter path untouched (no new writes in _renderBakedScene1/_commitBakedScene); contract keeps plan-scene precedence', !/plannerOwned/.test(app.slice(app.indexOf('function _renderBakedScene1('), app.indexOf('function _renderBakedScene1(') + 4000)) && /String\(_asg\.source \|\| ''\) === 'scene-mission'\)\)/.test(app), '');
// ═══ ROUTE CONTROLS (Roman 2026-09-07: opening planner → direct Grok, one bounded retry, no OpenAI fallback) ═══
const plannerRows = r => r.rows.filter(x => x.kind === 'planner');
const onGrok = r => plannerRows(r).length > 0 && plannerRows(r).every(x => /\/api\/proxy\b/.test(x.url));
const noOpenAIPlanner = r => plannerRows(r).every(x => !/chatgpt-proxy/.test(x.url));
ok('T0 the planner request goes to /api/proxy as OPENING_PLANNER · grok-4.3 (pinned via preferredModel) · effort none · JSON mode — never to the governed Mistral route',
  G.planner && /\/api\/proxy\b/.test(G.planner.url) && G.planner.role === 'OPENING_PLANNER' && G.planner.model === 'grok-4.3' && G.planner.preferredModel === 'grok-4.3' && G.planner.effort === 'none' && G.planner.rf === 'json_object' && onGrok(G) && onGrok(S),
  JSON.stringify(G.planner && { url: G.planner.url, role: G.planner.role, model: G.planner.model, effort: G.planner.effort, rf: G.planner.rf, seededUrl: S.planner && S.planner.url }));
const T1 = await run('unseeded Modern · first planner attempt 503, second valid', modern, 'fail503once');
ok('T1 one 503 → retried ONCE (transport-only), Scene 1 mounts, no refund, no dialog', T1.plannerCount === 2 && T1.st.pages === 1 && !T1.st.fatal && T1.refunds.length === 0 && T1.dialogs.length === 0 && T1.logs.some(l => /SCENE1:PLANNER:RETRY/.test(l)), JSON.stringify({ planner: T1.plannerCount, pages: T1.st.pages, fatal: T1.st.fatal, refunds: T1.refunds.length }));
const T2 = await run('unseeded Modern · every planner attempt 503', modern, 'fail503twice');
ok('T2 two 503s → EXACTLY two planner requests (bounded), terminal fatal, NO author, NO OpenAI planner request, issue refund + honest dialog', T2.plannerCount === 2 && /transport failed twice/.test(String(T2.st.fatal)) && T2.authorCount === 0 && T2.st.pages === 0 && noOpenAIPlanner(T2) && T2.refunds.length >= 1 && T2.dialogs.some(d => /Fate stumbled|refunded/.test(d)), JSON.stringify({ planner: T2.plannerCount, fatal: T2.st.fatal, refunds: T2.refunds, dialogs: T2.dialogs, rows: plannerRows(T2).map(x => x.url) }));
const T3 = await run('unseeded Modern · planner 400 (chain exhausted)', modern, 'fail400');
ok('T3 a 400 is NOT retried → one request, terminal fatal, refund, no author', T3.plannerCount === 1 && /not retryable/.test(String(T3.st.fatal)) && T3.authorCount === 0 && T3.refunds.length >= 1 && noOpenAIPlanner(T3), JSON.stringify({ planner: T3.plannerCount, fatal: T3.st.fatal, refunds: T3.refunds.length }));
const proxySrc = fs.readFileSync('api/proxy.js', 'utf8');
const plannerBlock = app.slice(app.indexOf('var _SCENE1_PLANNER_ROUTE'), app.indexOf('var _tryParseScaffold'));
ok('T4 static: proxy role OPENING_PLANNER is a SINGLE-model chain (no hidden proxy attempts); response_format forwarded only as json_object; the planner block names no Mistral or OpenAI route',
  /OPENING_PLANNER:\s*\[\s*'grok-4\.3'\s*\]/.test(proxySrc) && /_xaiBody\.response_format = \{ type: 'json_object' \}/.test(proxySrc) && plannerBlock.length > 0 && !/mistral-proxy|chatgpt-proxy/.test(plannerBlock.replace(/\/\/[^\n]*/g, '')),
  JSON.stringify({ singleChain: /OPENING_PLANNER:\s*\[\s*'grok-4\.3'\s*\]/.test(proxySrc), blockLen: plannerBlock.length }));
// ═══ CONTRACT LOCATION (the live run's reject class) ═══
const N1 = await run('unseeded Modern · stage_contract nested inside opening_spine', modern, 'nestedSpine');
ok('N1 contract nested in opening_spine → lifted intact, stage resolves, Scene 1 mounts', N1.st.pages === 1 && N1.st.genStage && !N1.st.fatal && N1.logs.some(l => /stage_contract \(opening_spine -> top level\)/.test(l)), JSON.stringify({ pages: N1.st.pages, fatal: N1.st.fatal, lifted: N1.logs.filter(l => /NORMALISED/.test(l)).map(l => l.slice(0, 120)) }));
const N2 = await run('unseeded Modern · stage_contract nested inside scene_skeleton', modern, 'nestedSkeleton');
ok('N2 contract nested in scene_skeleton → lifted intact, Scene 1 mounts', N2.st.pages === 1 && N2.st.genStage && !N2.st.fatal && N2.logs.some(l => /stage_contract \(scene_skeleton -> top level\)/.test(l)), JSON.stringify({ pages: N2.st.pages, fatal: N2.st.fatal }));
const N3 = await run('unseeded Modern · stage_contract in two places with DIFFERENT values', modern, 'nestedConflict');
ok('N3 two DIFFERENT copies → fault (never a choice), no author, refund', /more than one place with DIFFERENT values/.test(String(N3.st.fatal)) && N3.authorCount === 0 && N3.st.pages === 0 && N3.refunds.length >= 1, JSON.stringify({ fatal: N3.st.fatal, refunds: N3.refunds.length }));
// ═══ NEVER SILENCE — every failure scenario must show a NAMED fault in state OR in the captured handler log,
// AND a dialog, AND a refund; "no page, no fatal, no dialog" is a FAILURE of the control, not an observation. ═══
const namedFault = r => /rejected \([a-z_:]+\)|no scene_mission|not retryable|failed twice|DIFFERENT values|no opening_spine|missing from staged_characters|not part of this scene|scene author unavailable|untagged/.test(String(r.st.fatal)) || r.logs.some(l => /PLANNER-OWNED:FAULT\]|SCENE1:PLANNER:TRANSPORT\]|UNTAGGED error/.test(l));
const silent = r => r.st.pages === 0 && !r.st.fatal && r.dialogs.length === 0;
const failureRuns = { R1: N, R2: U, R3: E, R4: M, T2, T3, N3 };
// ONE FLOW PER SCENARIO: the page's checkout-return branch auto-begins a story 500 ms after load; if that call
// ever becomes the real flow, the harness's own call is a silently ignored duplicate and every count below is
// skewed. Exactly one "Past guard" and zero "Already in progress" per scenario, or the scenario is invalid.
const flows = r => ({ past: r.logs.filter(l => /Past _beginStoryInProgress guard/.test(l)).length, dup: r.logs.filter(l => /Already in progress/.test(l)).length, auto: r.logs.filter(l => /auto-beginning/.test(l)).length });
Object.entries({ G, N, U, E, M, S, T1, T2, T3 }).forEach(([k, r]) => { const f = flows(r); ok(`Z-flow-${k} exactly ONE begin-story flow (past-guard=1, duplicates=0)`, f.past === 1 && f.dup === 0, JSON.stringify(f)); });
Object.entries(failureRuns).forEach(([k, r]) => ok(`Z-${k} not silent: named fault (state or handler log) + dialog + refund; race=${r.raceOutcome}`, namedFault(r) && !silent(r) && r.dialogs.length >= 1 && r.refunds.length >= 1 && r.raceOutcome !== 'timeout180s', JSON.stringify({ fatal: r.st.fatal, dialogs: r.dialogs.length, refunds: r.refunds.length, race: r.raceOutcome, ms: r.durationMs, lastLogs: r.logs.slice(-3).map(l => l.slice(0, 120)) })));
// ═══ ADVERSARIAL LOCATION (a key match is never enough) ═══
const A1 = await run('unseeded Modern · valid contract buried inside a spine member (deeper than any recognised container)', modern, 'deepDecoy');
ok('A1 a contract deeper than the three recognised containers is NOT consulted → rejected as absent, no author, no page, refund', /stage_contract rejected \(absent\)/.test(String(A1.st.fatal)) && A1.authorCount === 0 && A1.st.pages === 0 && A1.refunds.length >= 1 && !A1.logs.some(l => /stage_contract \(.* -> top level\)/.test(l)), JSON.stringify({ fatal: A1.st.fatal, lifted: A1.logs.filter(l => /NORMALISED\] stage_contract/.test(l)).length }));
const A2 = await run('unseeded Modern · recognised container holds a WRONG-SHAPE stage_contract', modern, 'malformedNested');
ok('A2 a wrong-shape contract in a recognised container is lifted then REJECTED by the same schema validator (named code, not "absent"), no author, no page', /stage_contract rejected \((?!absent)/.test(String(A2.st.fatal)) && A2.authorCount === 0 && A2.st.pages === 0 && A2.refunds.length >= 1, JSON.stringify({ fatal: A2.st.fatal }));
const A3 = await run('unseeded Modern · recognised container holds a NON-OBJECT under the key', modern, 'stringNested');
ok('A3 a non-object under the key is treated as absent (no crash, no acceptance), no author, no page', /stage_contract rejected \(absent\)/.test(String(A3.st.fatal)) && A3.authorCount === 0 && A3.st.pages === 0, JSON.stringify({ fatal: A3.st.fatal, threw: A3.threw, pages: A3.st.pages, genStage: A3.st.genStage, planner: A3.plannerCount, author: A3.authorCount, refunds: A3.refunds.length, lastLogs: A3.logs.slice(-4).map(l => l.slice(0, 140)) }));
const A4 = await run('unseeded Modern · identical valid contract at top level AND in the spine', modern, 'nestedTopIdentical');
ok('A4 identical copies → accepted once (no false conflict), Scene 1 mounts', A4.st.pages === 1 && A4.st.genStage && !A4.st.fatal, JSON.stringify({ pages: A4.st.pages, fatal: A4.st.fatal }));
// ═══ GROK-ONLY SCENE-1 ROUTE — DRY WIRE PROOF (Roman 2026-09-07: Grok primary planner + literary author; no Mistral Small
// author/planner attempt; no OpenAI scene-author fallback; valid stage → exactly one Grok author shape → one page → no refund).
// The policy is behind window._grokOnlySceneAuthor (default OFF — not activated); the proof arm turns it on in its seed.
const modernGrokOnly = () => { const s = window.state; window.__disableSpeculativePreload = true; window._grokOnlySceneAuthor = true;
  s.picks = Object.assign(s.picks||{}, { world:'Modern', worldSubtype:'small_town', tone:'Earnest', flavor:'Billionaire', dynamic:'Enemies', pov:'first_person', length:'fling', intensity:'low', archetype:{ primary:'BEAUTIFUL_RUIN' }, playerMask:'OPEN_VEIN', loveInterest:'Male', identity:{ playerName:'Testa', partnerName:'Rook' } });
  Object.assign(s, { world:'Modern', worldSubtype:'small_town', flavor:'Billionaire', dynamic:'Enemies', archetype:{ primary:'BEAUTIFUL_RUIN', modifier:null }, name:'Testa', playerName:'Testa', loveInterestName:'Rook', partnerName:'Rook', loveInterest:'Male', liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true, fortunes:9999999, intensity:'low', pov:'first_person', identity:{ playerName:'Testa', partnerName:'Rook' }, renderMode:'literary', currentEngine:'literary', storyId:'grokonly-' + Math.random().toString(36).slice(2,8), myUid:'probe', _skipCorridorValidation:true });
  s.picks.identity = s.identity; };
const modernNoLens = () => { const s = window.state; window.__disableSpeculativePreload = true;
  s.picks = Object.assign(s.picks||{}, { world:'Modern', worldSubtype:'small_town', tone:'Earnest', flavor:'Billionaire', dynamic:'Enemies', pov:'first_person', length:'fling', intensity:'low', archetype:{ primary:'BEAUTIFUL_RUIN' }, playerMask:'IDENTITY', loveInterest:'Male', identity:{ playerName:'Testa', partnerName:'Rook' } });
  Object.assign(s, { world:'Modern', worldSubtype:'small_town', flavor:'Billionaire', dynamic:'Enemies', archetype:{ primary:'BEAUTIFUL_RUIN', modifier:null }, name:'Testa', playerName:'Testa', loveInterestName:'Rook', partnerName:'Rook', loveInterest:'Male', liGender:'male', playerMask:'IDENTITY', storyLength:'fling', tier:'fling', access:'sub', subscribed:true, fortunes:9999999, intensity:'low', pov:'first_person', identity:{ playerName:'Testa', partnerName:'Rook' }, renderMode:'literary', currentEngine:'literary', storyId:'nolens-' + Math.random().toString(36).slice(2,8), myUid:'probe', _skipCorridorValidation:true });
  s.picks.identity = s.identity; };
const modernThird = () => { const s = window.state; window.__disableSpeculativePreload = true; window._grokOnlySceneAuthor = false;
  s.picks = Object.assign(s.picks||{}, { world:'Modern', worldSubtype:'small_town', tone:'Earnest', flavor:'Billionaire', dynamic:'Enemies', pov:'third_person', length:'fling', intensity:'low', archetype:{ primary:'BEAUTIFUL_RUIN' }, playerMask:'OPEN_VEIN', loveInterest:'Male', identity:{ playerName:'Testa', partnerName:'Rook' } });
  Object.assign(s, { world:'Modern', worldSubtype:'small_town', flavor:'Billionaire', dynamic:'Enemies', archetype:{ primary:'BEAUTIFUL_RUIN', modifier:null }, name:'Testa', playerName:'the one who carries the story', loveInterestName:'Rook', partnerName:'Rook', loveInterest:'Male', liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true, fortunes:9999999, intensity:'low', pov:'third_person', identity:{ playerName:'Testa', partnerName:'Rook' }, renderMode:'literary', currentEngine:'literary', storyId:'third-' + Math.random().toString(36).slice(2,8), myUid:'probe', _skipCorridorValidation:true });
  s.picks.identity = s.identity; };
const authorRows = r => r.rows.filter(x => x.kind === 'author');
const authorOnlyGrok = r => authorRows(r).length > 0 && authorRows(r).every(x => /\/api\/proxy\b/.test(x.url)) && !r.rows.some(x => x.kind === 'author' && /mistral-proxy|chatgpt-proxy|deepseek-proxy/.test(x.url));
const W = await run('unseeded Modern · GROK-ONLY policy on · valid planner + author', modernGrokOnly, 'valid');
ok('W1 planner on /api/proxy (no Mistral planner attempt) AND stage valid from the planner stage', W.planner && /\/api\/proxy\b/.test(W.planner.url) && plannerRows(W).every(x => /\/api\/proxy\b/.test(x.url)) && W.st.genStage && W.st.contract && W.st.contract.ok && /^generated:/.test(W.st.contract.source), JSON.stringify({ plannerUrl: W.planner && W.planner.url, contract: W.st.contract }));
ok('W2 EXACTLY ONE author request, on /api/proxy as NARRATIVE_AUTHOR_GROK_ONLY with preferredModel grok-4.3 — no Mistral/OpenAI/DeepSeek author request', W.authorCount === 1 && authorOnlyGrok(W) && W.authors[0].role === 'NARRATIVE_AUTHOR_GROK_ONLY' && W.authors[0].preferredModel === 'grok-4.3', JSON.stringify({ authors: W.authors.map(a => ({ url: a.url, role: a.role, pm: a.preferredModel })), rows: authorRows(W).map(x => x.url) }));
ok('W3 one page committed (ledger p1), no refund, no dialog, one flow', W.st.pages === 1 && W.st.ledger === 1 && !W.st.fatal && W.refunds.length === 0 && W.dialogs.length === 0 && flows(W).past === 1 && flows(W).dup === 0, JSON.stringify({ pages: W.st.pages, ledger: W.st.ledger, fatal: W.st.fatal, refunds: W.refunds.length, dialogs: W.dialogs.length, flows: flows(W) }));
ok('W3b no request of ANY kind went to /api/chatgpt-proxy or /api/mistral-proxy for an author-class payload (kind author) in the whole Scene-1 chain', !W.rows.some(x => x.kind === 'author' && !/\/api\/proxy\b/.test(x.url)), JSON.stringify(W.rows.filter(x => !/\/api\/proxy\b/.test(x.url)).map(x => x.kind + '@' + x.url).slice(0, 12)));
const W503a = await run('unseeded Modern · GROK-ONLY · first author attempt 503, second valid', modernGrokOnly, 'grokOnlyAuthor503once');
ok('W4 author 503 once → ONE bounded Grok retry, page mounts, no Mistral/OpenAI author, no refund', W503a.authorCount === 2 && authorOnlyGrok(W503a) && W503a.st.pages === 1 && W503a.refunds.length === 0 && W503a.logs.some(l => /grok-only/.test(l)), JSON.stringify({ authors: W503a.authors.map(a => a.url), pages: W503a.st.pages, fatal: W503a.st.fatal, logs: W503a.logs.filter(l => /GROK-LIT|AUTHOR-FALLBACK/.test(l)).slice(0, 4).map(l => l.slice(0, 140)) }));
const W503b = await run('unseeded Modern · GROK-ONLY · every author attempt 503', modernGrokOnly, 'grokOnlyAuthor503twice');
ok('W5 author 503 twice → EXACTLY two Grok attempts, NAMED terminal failure, no page, no Mistral/OpenAI author, issue refund + honest dialog', W503b.authorCount === 2 && authorOnlyGrok(W503b) && W503b.st.pages === 0 && W503b.refunds.length >= 1 && W503b.dialogs.some(d => /Fate stumbled|refunded/.test(d)) && W503b.logs.some(l => /grok-only policy|scene author unavailable/.test(l)), JSON.stringify({ authors: W503b.authors.map(a => a.url), pages: W503b.st.pages, refunds: W503b.refunds, dialogs: W503b.dialogs, logs: W503b.logs.filter(l => /GROK-LIT|BeginStory\] Error|unavailable/.test(l)).slice(0, 4).map(l => l.slice(0, 160)) }));
// ═══ WIRE CENSUS (Roman 2026-09-07): counts taken at the route interception boundary, keyed by kind | route | body role |
// body model | body preferredModel. Console labels and static slices are supporting evidence only. ═══
const wire = r => { const c = {}; r.rows.filter(x => x.kind === 'planner' || x.kind === 'author').forEach(x => { const k = `${x.kind} | ${x.url} | role=${x.role} | model=${x.model} | preferredModel=${x.preferredModel}${x.effort ? ' | effort=' + x.effort : ''}`; c[k] = (c[k] || 0) + 1; }); return c; };
const wireMistralPlannerOrAuthor = r => r.rows.filter(x => /mistral-proxy/.test(x.url) && (x.kind === 'planner' || x.kind === 'author')).length;
const wireOpenAIAuthor = r => r.rows.filter(x => /chatgpt-proxy/.test(x.url) && x.kind === 'author').length;
const wireDeepSeekAuthor = r => r.rows.filter(x => /deepseek-proxy/.test(x.url) && x.kind === 'author').length;
const PLANNER_KEY = 'planner | /api/proxy | role=OPENING_PLANNER | model=grok-4.3 | preferredModel=grok-4.3 | effort=none';
const AUTHOR_KEY  = 'author | /api/proxy | role=NARRATIVE_AUTHOR_GROK_ONLY | model=null | preferredModel=grok-4.3';   // flag-on role: single-entry proxy chain (no hidden chain advance)
const wW = wire(W);
ok('W0 WIRE CENSUS (happy path): exactly ONE Grok planner request + exactly ONE Grok literary author request, and NOTHING ELSE of those kinds; zero Mistral planner/author; zero OpenAI/DeepSeek scene-author; one page commit',
  Object.keys(wW).length === 2 && wW[PLANNER_KEY] === 1 && wW[AUTHOR_KEY] === 1 && wireMistralPlannerOrAuthor(W) === 0 && wireOpenAIAuthor(W) === 0 && wireDeepSeekAuthor(W) === 0 && W.st.pages === 1 && W.st.ledger === 1,
  JSON.stringify({ census: wW, mistralPlannerOrAuthor: wireMistralPlannerOrAuthor(W), openaiAuthor: wireOpenAIAuthor(W), deepseekAuthor: wireDeepSeekAuthor(W), pages: W.st.pages, ledger: W.st.ledger }, null, 0));
const W7 = await run('unseeded Modern · GROK-ONLY · author returns 200 with EMPTY content, twice', modernGrokOnly, 'grokOnlyAuthorEmpty');
const W8 = await run('unseeded Modern · GROK-ONLY · author connection fails, twice', modernGrokOnly, 'grokOnlyAuthorAbort');
[['W5w', W503b, '503 twice'], ['W7', W7, 'empty content twice'], ['W8', W8, 'connection failure twice']].forEach(([id, r, what]) => {
  const c = wire(r);
  ok(`${id} WIRE CENSUS under real provider error class "${what}": exactly TWO Grok author attempts, ONE Grok planner, zero Mistral/OpenAI/DeepSeek requests of those kinds, NO page, refund + honest dialog, named terminal reason`,
    c[AUTHOR_KEY] === 2 && c[PLANNER_KEY] === 1 && Object.keys(c).length === 2 && wireMistralPlannerOrAuthor(r) === 0 && wireOpenAIAuthor(r) === 0 && wireDeepSeekAuthor(r) === 0 && r.st.pages === 0 && r.refunds.length >= 1 && r.dialogs.some(d => /Fate stumbled|refunded/.test(d)) && r.logs.some(l => /scene author unavailable \(grok-only policy/.test(l)),
    JSON.stringify({ census: c, pages: r.st.pages, refunds: r.refunds.length, dialogs: r.dialogs.length, terminal: r.logs.filter(l => /scene author unavailable/.test(l)).slice(0, 1).map(l => l.slice(0, 200)) }, null, 0));
});
// ═══ FUSION v3 (Roman 2026-09-07, approved): C+ (validated PC mask/lens anchor) × E+ (backend-owned target/axis); pressure cites
// issued grounds; the author writes the beat. The inherit rule (F1–F7) now applies only to non-planner-owned free-text paths and
// is exercised by the skeleton suite's assignment-owned arms, not here. ═══
const flatContent = c => (typeof c === 'string') ? c : (Array.isArray(c) ? c.map(b => (b && (b.text || b.content)) || '').join('') : String(c || ''));   // author content may be an array of text blocks
const authorUsrOf = r => { const b = (r.bodies || []).find(x => x.kind === 'author'); const m = b && (b.body.messages || []); return { sys: flatContent((((m || []).find(x => x.role === 'system') || {}).content)), usr: flatContent((((m || []).find(x => x.role === 'user') || {}).content)) }; };
// the v3 block itself (its header), not the C+ section's cross-reference to it; the E+ line elsewhere legitimately names the target
const pofBlockOf = txt => { const i = txt.indexOf('PROTAGONIST OPENING BEAT (HARD — Character+ × Environment+'); if (i < 0) return ''; const j = txt.indexOf('Write ONE beat that fuses all three', i); return txt.slice(i, j > 0 ? j + 40 : i + 900); };
const targetOfG = (G.bodies.find(x => x.kind === 'planner') && G.planner) ? null : null;
ok('V3-d GENUINE fusion (the valid arm G): accepted, one stubbed author, one page, no refund', G.st.pages === 1 && G.st.ledger === 1 && !G.st.fatal && G.authorCount === 1 && G.refunds.length === 0 && G.logs.some(l => /FUSION:V3\] accepted/.test(l)), JSON.stringify({ pages: G.st.pages, author: G.authorCount, v3: G.logs.filter(l => /FUSION:V3/.test(l)).map(l => l.slice(0, 160)) }));
const gAuthor = authorUsrOf(G); const gBlock = pofBlockOf(gAuthor.sys + '\n' + gAuthor.usr);
try { fs.writeFileSync('_validate_out/g_author_prompt.txt', '=== SYSTEM ===\n' + gAuthor.sys + '\n=== USER ===\n' + gAuthor.usr); } catch (_) {}   // evidence for the render check
const gTarget = (() => { const m = gBlock.match(/CONTACT: [A-Z_]+ — (.+?)\n/); return m ? m[1].trim() : null; })();
const gWordingNames = gTarget ? (gBlock.indexOf('ACTION WORDING') !== -1 && gBlock.slice(gBlock.indexOf('ACTION WORDING')).split('\n')[0].indexOf(gTarget) !== -1) : false;
ok('V3-render within the v3 PROTAGONIST OPENING BEAT block the CONTACT line renders the canonical target once, the optional wording adds at most one more, lens + axis labels present, and no literal {ENV_TARGET} anywhere in the author request (the separate ENVIRONMENT+ line keeps its own occurrence)', !!gBlock && !!gTarget && (gBlock.split(gTarget).length - 1) === (1 + (gWordingNames ? 1 : 0)) && /CONTACT: PRESS — /.test(gBlock) && /lens: [A-Z_]+/.test(gBlock) && /axis: [a-z]+/.test(gBlock) && !/\{ENV_TARGET\}/.test(gAuthor.sys + gAuthor.usr), JSON.stringify({ target: gTarget, occurrences: gTarget ? gBlock.split(gTarget).length - 1 : null, wordingNames: gWordingNames, block: gBlock.slice(0, 480) }));
const _authorPrompt = r => JSON.stringify((r.bodies || []).filter(x => x.kind === 'author').map(x => x.body));
// ═══ SOFT-POLICY HELPERS (Roman 2026-09-09 gate classification) ═══
const _softCodes = r => (r.logs || []).filter(l => /\[SCENE1:SOFT\]/.test(l)).map(l => (l.match(/\[SCENE1:SOFT\] ([a-z_]+)/) || [])[1]).filter(Boolean);
const _ap = r => { try { return _authorPrompt(r); } catch (_) { return JSON.stringify((r.bodies || []).filter(x => x.kind === 'author').map(x => x.body)); } };
const _mountsSoft = (r, code) => r.st.pages === 1 && !r.st.fatal && r.authorCount === 1 && _softCodes(r).includes(code);
const _omitWording = r => !/ACTION WORDING/.test(_ap(r)) && /CONTACT: /.test(_ap(r));
const _omitRevelation = r => /read the act through this lens \(the planner's sentence was withheld\)/.test(_ap(r));
const _omitPressure = r => /condition, bear on [^(]+\(the planner's sentence was withheld\)/.test(_ap(r));
const _omitBeat = r => !/THE EVIDENCE TO RENDER/.test(_ap(r)) && /ENVIRONMENT\+ ASSIGNED THIS SCENE/.test(_ap(r));
const _targetIsContact = r => { const a = _ap(r); const t = (a.match(/ENVIRONMENT\+ ASSIGNED THIS SCENE \(required\): (.+?) — through the axis/) || [])[1]; const c = (a.match(/CONTACT: [A-Z_]+ — ([^\\\n]+)/) || [])[1]; return !!t && !!c && t.trim().toLowerCase() === c.trim().toLowerCase(); };
const _detail = (r, code) => JSON.stringify({ pages: r.st.pages, fatal: String(r.st.fatal).slice(0, 100), author: r.authorCount, soft: _softCodes(r), want: code });
const V3a = await run('unseeded Modern · v3 (a) target contact ONLY', modern, 'v3ContactOnly');
ok('V3-a contact only → named reject (missing character_revelation / environment_pressure), no author, refund', /missing v3 fields \((character_revelation, environment_pressure|environment_pressure, character_revelation)\)/.test(String(V3a.st.fatal)) && V3a.authorCount === 0 && V3a.refunds.length >= 1, JSON.stringify({ fatal: String(V3a.st.fatal).slice(0, 200) }));
const V3b = await run('unseeded Modern · v3 (b) character revelation ONLY (action without the placeholder)', modern, 'v3RevelationOnly');
ok('V3-b revelation only (no structured contact) → named reject (contact_object missing), no author, refund', /contact_object missing/.test(String(V3b.st.fatal)) && V3b.authorCount === 0 && V3b.refunds.length >= 1, JSON.stringify({ fatal: String(V3b.st.fatal).slice(0, 200) }));
const V3c = await run('unseeded Modern · v3 (c) environment description ONLY (revelation = the E+ beat)', modern, 'v3EnvOnly');
ok('V3-c SOFT a revelation that describes the environment thing → mounts; revelation withheld (revelation_describes_thing)', _mountsSoft(V3c, 'revelation_describes_thing') && _omitRevelation(V3c), _detail(V3c, 'revelation_describes_thing'));
const V3dup = await run('unseeded Modern · v3 duplicate placeholder', modern, 'v3DupPlaceholder');
ok('V3-dup SOFT wording carries the identity twice → mounts; wording withheld (wording_identity_twice)', _mountsSoft(V3dup, 'wording_identity_twice') && _omitWording(V3dup), _detail(V3dup, 'wording_identity_twice'));
const V3own = await run('unseeded Modern · v3 planner supplies environment_target/axis', modern, 'v3OwnedTarget');
ok('V3-owned SOFT planner-supplied fusion target/axis → mounts; canonical values win (fusion_env_fields_ignored)', _mountsSoft(V3own, 'fusion_env_fields_ignored'), _detail(V3own, 'fusion_env_fields_ignored'));
const V3bg = await run('unseeded Modern · v3 HOSTILE provenance: grounds cite free spine prose (spine:pc_career)', modern, 'v3BadGround');
ok('V3-prov-reject a free spine assertion cited as a ground → named reject (unissued id; free spine prose is not a fact)', /cites unissued ids \(spine:pc_career\)/.test(String(V3bg.st.fatal)) && V3bg.authorCount === 0, String(V3bg.st.fatal).slice(0, 200));
const V3sf = await run('unseeded Modern · v3 provenance: grounds cite the ACCEPTED stage fact (stage:fact:1)', modern, 'v3StageFactGround');
ok('V3-prov-allow an accepted stage-contract fact (planner_stage provenance) is an admissible ground → accepted, mounts', V3sf.st.pages === 1 && !V3sf.st.fatal && V3sf.logs.some(l => /FUSION:V3\] accepted.*stage:fact:1/.test(l)), JSON.stringify({ pages: V3sf.st.pages, fatal: V3sf.st.fatal }));
const V3np = await run('unseeded Modern · v3 identity: revelation names nobody (no name, no pronoun)', modern, 'v3NoPcRef');
ok('V3-id-reject SOFT a revelation that concerns nobody → mounts; revelation withheld (revelation_not_about_pc)', _mountsSoft(V3np, 'revelation_not_about_pc') && _omitRevelation(V3np), _detail(V3np, 'revelation_not_about_pc'));
const V3nm = await run('unseeded Modern · v3 identity: revelation uses the resolved NAME only, no pronoun', modern, 'v3NameOnly');
ok('V3-id-name a revelation by resolved name with no pronoun → accepted, mounts (no pronoun is assumed)', V3nm.st.pages === 1 && !V3nm.st.fatal, JSON.stringify({ pages: V3nm.st.pages, fatal: V3nm.st.fatal }));
const V3wp = await run('unseeded Modern · v3 identity: revelation uses pronouns that are not the protagonist\'s resolved set', modern, 'v3WrongPronoun');
ok('V3-id-wrong SOFT pronouns outside the resolved set → mounts; revelation withheld (revelation_not_about_pc)', _mountsSoft(V3wp, 'revelation_not_about_pc') && _omitRevelation(V3wp), _detail(V3wp, 'revelation_not_about_pc'));
const V3nc = await run('unseeded Modern · v3 action with the placeholder but no contact', modern, 'v3NoContact');
ok('V3-contact an invalid contact verb (NOTICE) → named reject (not one of the issued contact types)', /not one of the issued contact types/.test(String(V3nc.st.fatal)) && V3nc.authorCount === 0, String(V3nc.st.fatal).slice(0, 200));
const V3ls = await run('unseeded Modern · v3 retired legacy shape (beat + character_angle, no v3 fields)', modern, 'v3LegacyShape');
ok('V3-legacy the retired shape → named "missing v3 fields … retired shape"', /missing v3 fields.*retired shape/.test(String(V3ls.st.fatal)) && V3ls.authorCount === 0, String(V3ls.st.fatal).slice(0, 220));
// ── identity mechanism + pressure relation (Roman 2026-09-08) ──
const V3ct = await run('unseeded Modern · v3 action uses the EXACT canonical target string instead of the token', modern, 'v3CanonicalTarget');
ok('V3-canon contact_object = exact canonical target string → accepted (normalised to the backend value), mounts', V3ct.st.pages === 1 && !V3ct.st.fatal && V3ct.logs.some(l => /FUSION:V3\] accepted — contact PRESS/.test(l)), JSON.stringify({ pages: V3ct.st.pages, fatal: V3ct.st.fatal }));
const V3ap = await run('unseeded Modern · v3 structured contact with the APRON (valid verb, other object) — the retained reply\'s shape', modern, 'v3ContactApron');
ok('V3-apron a valid contact verb aimed at the apron → named contact_object reject (not an issued stage element)', /contact_object "the apron" is not an issued stage element/.test(String(V3ap.st.fatal)) && V3ap.authorCount === 0, String(V3ap.st.fatal).slice(0, 220));
const V3dr = await run('unseeded Modern · v3 DRAG {ENV_TARGET}', modern, 'v3ContactDrag');
ok('V3-drag contact DRAG on {ENV_TARGET} with wording → accepted, mounts, contact line rendered', V3dr.st.pages === 1 && !V3dr.st.fatal && (() => { const a = authorUsrOf(V3dr); const b = pofBlockOf(a.sys + '\n' + a.usr); return /CONTACT: DRAG — /.test(b); })(), JSON.stringify({ pages: V3dr.st.pages, fatal: V3dr.st.fatal }));
const V3pp = await run('unseeded Modern · v3 action PARAPHRASES the target', modern, 'v3Paraphrase');
ok('V3-paraphrase a paraphrased contact_object → named reject (not an issued stage element)', /is not an issued stage element/.test(String(V3pp.st.fatal)) && V3pp.authorCount === 0, String(V3pp.st.fatal).slice(0, 200));
const V3dc = await run('unseeded Modern · v3 token AND canonical string both present', modern, 'v3DupCanonical');
ok('V3-dup-canon SOFT token AND canonical string → mounts; wording withheld (wording_identity_twice)', _mountsSoft(V3dc, 'wording_identity_twice') && _omitWording(V3dc), _detail(V3dc, 'wording_identity_twice'));
const V3ot = await run('unseeded Modern · v3 action also acts on ANOTHER environment element', modern, 'v3OtherTarget');
ok('V3-other SOFT contact on another issued element while the planner wrote a different E+ target → mounts; the contact-derived target is canonical in the directive (ep_target_overridden)', _mountsSoft(V3ot, 'ep_target_overridden') && _targetIsContact(V3ot), _detail(V3ot, 'ep_target_overridden') + ' ' + JSON.stringify((_ap(V3ot).match(/ENVIRONMENT\+ ASSIGNED[^\\]{0,80}|CONTACT: [^\\]{0,60}/g) || [])));
const V3pe = await run('unseeded Modern · v3 pressure describes the setting only', modern, 'v3PressureEnvOnly');
ok('V3-press-env SOFT environment-only pressure → mounts; pressure sentence withheld (pressure_not_about_pc)', _mountsSoft(V3pe, 'pressure_not_about_pc') && _omitPressure(V3pe), _detail(V3pe, 'pressure_not_about_pc'));
const V3pr = await run('unseeded Modern · v3 pressure states the relation to the protagonist (POV pronoun)', modern, 'v3PressureRelation');
ok('V3-press-rel pressure with the PC relation (first-person pronoun) → accepted, mounts', V3pr.st.pages === 1 && !V3pr.st.fatal, JSON.stringify({ pages: V3pr.st.pages, fatal: V3pr.st.fatal }));
// ── ground aliases + strict anti-paraphrase (Roman 2026-09-08) ──
const V3aa = await run('unseeded Modern · v3 grounds use env:<axis value> (exact validated axis)', modern, 'v3AliasAxis');
ok('V3-alias-axis env:<validated axis value> → normalised to env:axis, accepted, mounts (log names the alias)', V3aa.st.pages === 1 && !V3aa.st.fatal && V3aa.logs.some(l => /grounds normalised.*→env:axis/.test(l)), JSON.stringify({ pages: V3aa.st.pages, fatal: V3aa.st.fatal, log: V3aa.logs.filter(l => /grounds normalised/.test(l)).map(l => l.slice(0, 160)) }));
const V3ar = await run('unseeded Modern · v3 grounds use the bare participant ref pc:self', modern, 'v3AliasRef');
ok('V3-alias-ref bare issued participant ref → normalised to stage:participant:pc:self (unique in the accepted stage), accepted, mounts', V3ar.st.pages === 1 && !V3ar.st.fatal && V3ar.logs.some(l => /pc:self→stage:participant:pc:self/.test(l)), JSON.stringify({ pages: V3ar.st.pages, fatal: V3ar.st.fatal }));
const V3aw = await run('unseeded Modern · v3 grounds use env:<a DIFFERENT axis>', modern, 'v3AliasWrongAxis');
ok('V3-alias-wrong env:<different axis> → NOT aliased → named reject (unissued id)', /cites unissued ids \(env:(damage|ritual)\)/.test(String(V3aw.st.fatal)) && V3aw.authorCount === 0, String(V3aw.st.fatal).slice(0, 200));
const V3au = await run('unseeded Modern · v3 grounds use an unknown bare ref', modern, 'v3AliasUnknownRef');
ok('V3-alias-unknown unknown bare ref → NOT aliased → named reject (unissued id)', /cites unissued ids \(pc:nobody\)/.test(String(V3au.st.fatal)) && V3au.authorCount === 0, String(V3au.st.fatal).slice(0, 200));
const V3ng = await run('unseeded Modern · v3 revelation = the lens gloss with the protagonist\'s name', modern, 'v3RevelationNearGloss');
ok('V3-near-gloss SOFT a revelation that restates the gloss → mounts; revelation withheld (revelation_restates_gloss)', _mountsSoft(V3ng, 'revelation_restates_gloss') && _omitRevelation(V3ng), _detail(V3ng, 'revelation_restates_gloss'));
// ── three hard defects from the first real page (Roman 2026-09-08) ──
const KERNEL = /the one who carries the story/i;
ok('FR1 first-person tarot frame on the MOUNTED page: "My hand tightened around my great-grandmother\'s old tarot deck" + "I toyed with the idea of letting the cards decide." — no kernel placeholder, no third-person "\'s hand"', /My hand tightened around my great-grandmother's old tarot deck/.test(G.st.pageText || '') && /I toyed with the idea of letting the cards decide\./.test(G.st.pageText || '') && !KERNEL.test(G.st.pageText || '') && !/'s hand tightened/.test(G.st.pageText || ''), JSON.stringify({ closer: G.st.closer, tail: String(G.st.pageText || '').slice(-220) }));
const TP = await run('unseeded Modern · THIRD person · playerName holds the kernel placeholder', modernThird, 'valid');
ok('FR2 third-person frame uses the RESOLVED name (Testa) and her pronoun; the kernel placeholder in playerName never reaches the page', TP.st.pages === 1 && /Testa's hand tightened around her great-grandmother's old tarot deck/.test(TP.st.pageText || '') && /She toyed with the idea of letting the cards decide\./.test(TP.st.pageText || '') && !KERNEL.test(TP.st.pageText || ''), JSON.stringify({ pages: TP.st.pages, fatal: TP.st.fatal, closer: TP.st.closer, tail: String(TP.st.pageText || '').slice(-200) }));
const HS = await run('unseeded Modern · author stub returns the RETAINED REAL Grok page (with [TITLE]/[SYNOPSIS]/[CHARACTERS])', modern, 'authorRealPage');
ok('HS1 the mounted page carries no header artefacts and keeps the story prose ("The oven vent rattled")', HS.st.pages === 1 && !/\[TITLE:|\[SYNOPSIS:|\[CHARACTERS:/.test(HS.st.pageText || '') && /The oven vent rattled/.test(HS.st.pageText || ''), JSON.stringify({ pages: HS.st.pages, head: String(HS.st.pageText || '').slice(0, 120) }));
const CO1 = await run('unseeded Modern · v3 coherence: wording ABSENT', modern, 'v3NoWording');
ok('CO1 wording absent → accepted (contact alone carries the identity), mounts', CO1.st.pages === 1 && !CO1.st.fatal, JSON.stringify({ pages: CO1.st.pages, fatal: CO1.st.fatal }));
const CO2 = await run('unseeded Modern · v3 coherence: wording names ANOTHER element (contact on the target)', modern, 'v3WordingOther');
ok('CO2 SOFT wording that names another element → mounts; wording withheld (wording_other_element)', _mountsSoft(CO2, 'wording_other_element') && _omitWording(CO2), _detail(CO2, 'wording_other_element'));
const CO3 = await run('unseeded Modern · v3 coherence: wording names NO target', modern, 'v3WordingNoTarget');
ok('CO3 (repaired) wording that names nothing resolvable is WITHHELD, not fatal: scene mounts on the structured contact; log names the withholding; the author prompt carries no ACTION WORDING line', CO3.st.pages === 1 && !CO3.st.fatal && CO3.authorCount === 1 && CO3.logs.some(l => /action wording withheld/.test(l)) && !/ACTION WORDING/.test(_authorPrompt(CO3)) && /CONTACT: PRESS/.test(_authorPrompt(CO3)), JSON.stringify({ fatal: String(CO3.st.fatal).slice(0, 120), pages: CO3.st.pages, withheld: CO3.logs.filter(l => /withheld/.test(l)).map(l => l.slice(0, 140)), hasWording: /ACTION WORDING/.test(_authorPrompt(CO3)) }));
const WD1 = await run('unseeded Modern · wording names a PART of the target ("thumb jamming the button", the 06:56 case)', modern, 'v3WordingPart');
ok('WD1 GREEN a part-of-target wording is withheld and the scene mounts; contact line delivered, no wording line', WD1.st.pages === 1 && !WD1.st.fatal && WD1.logs.some(l => /action wording withheld/.test(l)) && !/ACTION WORDING/.test(_authorPrompt(WD1)) && /CONTACT: PRESS/.test(_authorPrompt(WD1)), JSON.stringify({ fatal: String(WD1.st.fatal).slice(0, 120), pages: WD1.st.pages }));
// ── AFFORDANCES + DEPENDENCY DIRECTION (Roman 2026-09-08) ──
const AF1 = await run('unseeded Modern · contact chooses the ledger; E+ target OMITTED', modern, 'affDerive');
ok('AF1 the E+ target DERIVES from contact.object (log names it) → accepted, mounts', AF1.st.pages === 1 && !AF1.st.fatal && AF1.logs.some(l => /environment_plus\.target derived from contact\.object/.test(l)), JSON.stringify({ pages: AF1.st.pages, fatal: AF1.st.fatal, log: AF1.logs.filter(l => /derived from contact/.test(l)).map(l => l.slice(0, 160)) }));
const AF2 = await run('unseeded Modern · CLIMB on a GRASPABLE element', modern, 'affBadVerb');
ok('AF2 incompatible verb/object (CLIMB × GRASPABLE) → named reject (not permitted by the affordance)', /not permitted by the affordance GRASPABLE/.test(String(AF2.st.fatal)) && AF2.authorCount === 0, String(AF2.st.fatal).slice(0, 220));
const AF3 = await run('unseeded Modern · contact on an AMBIENT element', modern, 'affAmbient');
ok('AF3 AMBIENT element as contact object → named reject (perceived, never contacted)', /is AMBIENT/.test(String(AF3.st.fatal)) && AF3.authorCount === 0, String(AF3.st.fatal).slice(0, 220));
const AF4 = await run('unseeded Modern · planner writes an E+ target DIFFERENT from contact.object', modern, 'affTargetConflict');
ok('AF4 SOFT independent E+ target that differs from the contact → mounts; the contact element is the target in the directive (ep_target_overridden)', _mountsSoft(AF4, 'ep_target_overridden') && _targetIsContact(AF4), _detail(AF4, 'ep_target_overridden'));
const AF5 = await run('unseeded Modern · DRAG the ledger with co-referring wording + revelation + pressure', modern, 'affDrag');
ok('AF5 valid drag/issued-object fusion with C+ revelation and pressure → accepted, mounts, one stubbed author', AF5.st.pages === 1 && !AF5.st.fatal && AF5.authorCount === 1, JSON.stringify({ pages: AF5.st.pages, fatal: AF5.st.fatal }));
const AF6 = await run('unseeded Modern · wording about the bench while the structured target is the ledger', modern, 'affWordingBench');
ok('AF6 (repaired) wording about an OFF-STAGE object (the bench is not an issued element) is withheld — not delivered, not fatal; a wording about an ISSUED other element still rejects (CO2)', AF6.st.pages === 1 && !AF6.st.fatal && AF6.logs.some(l => /action wording withheld/.test(l)) && !/bench/.test(_authorPrompt(AF6).replace(/customs bench/g, '')), JSON.stringify({ fatal: String(AF6.st.fatal).slice(0, 120), pages: AF6.st.pages, benchDelivered: /ACTION WORDING[^\n]*bench/.test(_authorPrompt(AF6)) }));
const AF7 = await run('unseeded Modern · stage_contract without elements', modern, 'affNoElements');
ok('AF7 no affordance list → named reject (stage_contract.elements missing)', /stage_contract\.elements missing/.test(String(AF7.st.fatal)) && AF7.authorCount === 0, String(AF7.st.fatal).slice(0, 220));
const AF8 = await run('unseeded Modern · contact.object = the placeholder token', modern, 'affTokenObject');
ok('AF8 the placeholder as contact object → named reject (must be an issued element name)', /contact_object is the placeholder/.test(String(AF8.st.fatal)) && AF8.authorCount === 0, String(AF8.st.fatal).slice(0, 220));
// the three retained live mismatch replies: as-is (first real fault under the new contract) and with a harness-injected element list (their contact-level reason)
const REPS = [['replay0035', '00:35 apron / locked door'], ['replay2032', '20:32 prep table / oven vent'], ['replay2212', '22:12 bench / cracked skylight']];
for (const [mode, label] of REPS) {
  const R0 = await run('retained ' + label + ' — as retained', modern, mode);
  ok(`RR-${mode} as retained → rejected before the author by its real first fault under the new contract (elements missing)`, /stage_contract\.elements missing/.test(String(R0.st.fatal)) && R0.authorCount === 0 && R0.st.pages === 0, String(R0.st.fatal).slice(0, 200));
  const R1 = await run('retained ' + label + ' — with a harness-injected element list', modern, mode + 'Els');
  ok(`RR-${mode}-els with elements injected → rejected by its contact-level reason (missing structured contact / placeholder object / bench wording), never accepted`, /contact_object missing|contact_object is the placeholder|does not co-refer|not an issued stage element/.test(String(R1.st.fatal)) && R1.authorCount === 0 && R1.st.pages === 0, String(R1.st.fatal).slice(0, 260));
}
const V3nl = await run('unseeded Modern · v3 NO LENS (mask without a profile) → no fusion offered', modernNoLens, 'valid');
const nlUsr = (() => { const b = (V3nl.bodies || []).find(x => x.kind === 'planner'); const m = b && (b.body.messages || []).find(x => x.role === 'user'); return String((m && m.content) || ''); })();
ok('V3-nolens the request offers NO fusion member and says why; the reply without one is accepted and Scene 1 mounts with one stubbed author', /NO pc_opening_fusion THIS SCENE — no validated lens operation/.test(nlUsr) && !/"contact": \{ "verb": "<EXACTLY one of the CONTACT TYPES/.test(nlUsr) && V3nl.st.pages === 1 && !V3nl.st.fatal && V3nl.authorCount === 1 && V3nl.logs.some(l => /no fusion offered and none returned/.test(l)), JSON.stringify({ offered: /"contact": \{ "verb": "<EXACTLY one of the CONTACT TYPES/.test(nlUsr), whyLine: (nlUsr.match(/NO pc_opening_fusion THIS SCENE[^\n]{0,80}/) || [''])[0], pages: V3nl.st.pages, fatal: V3nl.st.fatal, author: V3nl.authorCount }));
// ═══ TEMPLATE INSPECTION (Roman 2026-09-07): stage_contract is a REQUIRED NAMED TEMPLATE MEMBER, exactly once, no longer appended ═══
const plannerUsr = r => { const b = (r.bodies || []).find(x => x.kind === 'planner'); const m = b && (b.body.messages || []).find(x => x.role === 'user'); return String((m && m.content) || ''); };
const gU = plannerUsr(G), sU = plannerUsr(S);
const keyCount = (u) => (u.match(/"stage_contract": \{/g) || []).length;   // the JSON member form; the rules header may NAME the member
const iJson = gU.indexOf('Return ONLY this JSON'), iKey = gU.indexOf('"stage_contract": {'), iRules = gU.indexOf('STAGE_CONTRACT RULES'), iRefs = gU.indexOf('ISSUED REFS (the complete set');
ok('TPL1 planner-owned request: the JSON member "stage_contract": { appears EXACTLY once, INSIDE the response template (after "Return ONLY this JSON", before the rules), declared REQUIRED top-level; the old appended "Return a stage_contract object" demand is GONE; rules + ISSUED REFS present once',
  keyCount(gU) === 1 && iJson !== -1 && iKey > iJson && iRules !== -1 && iKey < iRules && /is a REQUIRED top-level member of this JSON/.test(gU) && !/Return a "stage_contract" object/.test(gU) && (gU.match(/STAGE_CONTRACT RULES/g) || []).length === 1 && (gU.match(/ISSUED REFS \(the complete set/g) || []).length === 1 && iRefs > iRules,
  JSON.stringify({ keyCount: keyCount(gU), iJson, iKey, iRules, iRefs, appendedDemand: /Return a "stage_contract" object/.test(gU) }));
ok('TPL1b the stage_contract member carries the three subfields the validator reads; and the v3 fusion member declares contact{verb, object = an issued element} + optional wording + pc_lens_operation + character_revelation + environment_pressure.grounds, with no environment_target/axis/beat', /"stage_contract": \{\s*"v": 1,\s*"participants": \[ \{ "ref": "<COPIED VERBATIM from ISSUED REFS below>", "presence": "IN_PERSON\|ANTICIPATED\|RECALLED\|REPORTED" \} \],\s*"event_facts": \[ \{ "text": "<one clause: what OCCURS in this scene>", "participants": \[ \{ "ref": "<issued ref>", "role": "actor\|subject\|speaker\|target" \} \] \} \]/.test(gU) && (gU.match(/"contact": \{ "verb": "<EXACTLY one of the CONTACT TYPES/g) || []).length === 1 && (gU.match(/"action": "<OPTIONAL one clause of wording/g) || []).length === 1 && /"pc_lens_operation": "<EXACTLY one operation/.test(gU) && /"environment_pressure": \{ "grounds": \["env:axis"/.test(gU) && /FACT BASE — the ONLY ids/.test(gU) && /"contact": \{ "verb": "<EXACTLY one of the CONTACT TYPES below, verbatim>", "object": "<the EXACT name of ONE of your environment_elements whose affordance PERMITS that verb/.test(gU) && /"elements": \[ \{ "name": "<EXACT string of one of your environment_elements>", "affordance": "GRASPABLE\|SURFACE\|PORTAL\|FIXTURE\|AMBIENT" \} \]/.test(gU) && /AFFORDANCE TABLE/.test(gU) && /environment_plus \(BELOW\) has NO "target" field on this path/.test(gU) && /CONTACT TYPES \(contact\.verb must be exactly one of these\): GRIP, PRESS/.test(gU) && /A sentence that only describes the setting or the thing is INVALID/.test(gU) && /It MUST name /.test(gU) && !/"environment_target": "<|"environment_axis": "<|"character_angle": "<what the BEAT/.test(gU.slice(gU.indexOf('"pc_opening_fusion"'), gU.indexOf('"pc_opening_fusion"') + 2500)), gU.slice(iKey, iKey + 420));

// ═══ MEMBER ORDER FOLLOWS THE DEPENDENCY (Roman 2026-09-09) ═══
const _usrOf = r => { const b = (r.bodies || []).find(x => x.kind === 'planner'); const m = b && (b.body.messages || []).find(x => x.role === 'user'); return String((m && m.content) || ''); };
const _v3Usr = _usrOf(V3ct), _nlUsr2 = _usrOf(V3nl);
const _epIdx = _v3Usr.indexOf('"environment_plus": {'), _fuIdx = _v3Usr.indexOf('"pc_opening_fusion": {');
const _epMemberTxt = _epIdx >= 0 ? _v3Usr.slice(_epIdx, _v3Usr.indexOf('}', _epIdx) + 1) : '';
ok('OR1 planner-owned v3 request: pc_opening_fusion (with contact) is asked for BEFORE environment_plus', _fuIdx >= 0 && _epIdx > _fuIdx, JSON.stringify({ fusionAt: _fuIdx, epAt: _epIdx }));
ok('OR2 planner-owned v3 request: environment_plus exposes NO independent target field (no "target", no <DECLARED ENVIRONMENT TARGET>, no target_object_id); axis + beat only', _epMemberTxt.length > 0 && !/"target"|DECLARED ENVIRONMENT TARGET|target_object_id/.test(_epMemberTxt) && /"axis"/.test(_epMemberTxt) && /"beat"/.test(_epMemberTxt) && !/<DECLARED ENVIRONMENT TARGET>/.test(_v3Usr), _epMemberTxt.slice(0, 200));
ok('OR3 planner-owned request WITHOUT a fusion offer (no lens): legacy order and the declared-target placeholder are unchanged', /"environment_plus": \{ "target": "<DECLARED ENVIRONMENT TARGET>"/.test(_nlUsr2) && _nlUsr2.indexOf('"environment_plus": {') < _nlUsr2.indexOf('NO pc_opening_fusion THIS SCENE'), _nlUsr2.slice(_nlUsr2.indexOf('"environment_plus"'), _nlUsr2.indexOf('"environment_plus"') + 120));
ok('OR4 the JSON stays well-formed after the swap: the fusion member closes with "}," and environment_plus is the last skeleton member before "}"', /"pc_opening_fusion": \{[\s\S]*?\n    \},\n/.test(_v3Usr) && /"environment_plus": \{[^\n]*\}\n/.test(_v3Usr), _v3Usr.slice(_fuIdx, _fuIdx + 80));
ok('OR5 the FACT BASE and DEPENDENCY lines describe the derived target (contact.object), not a planner-written one', /env:target, env:axis = the Environment\+ target \(= your contact\.object on this path\)/.test(_v3Usr) && /environment_plus \(BELOW\) has NO "target" field on this path/.test(_v3Usr), '');ok('TPL2 seeded (authored-stage) request: NO stage_contract member, no rules — the template member is planner-owned mode only', keyCount(sU) === 0 && !/STAGE_CONTRACT RULES/.test(sU), JSON.stringify({ keyCount: keyCount(sU) }));
// ═══ REPLAY OF THE RETAINED 21:01 LIVE GROK PLANNER REPLY (no stage_contract anywhere) ═══
const RL = await run('unseeded Modern · REPLAY of the retained 21:01 live planner reply (no stage_contract)', modern, 'replayLive');
const RL0420 = await run('unseeded Modern · REPLAY of the retained 04:20 live planner reply (affordance contract) — as retained', modern, 'replay0420');
ok('RL3 (repaired) the 04:20 reply as retained is no longer rejected on its simile: it mounts with one stubbed author', RL0420.st.pages === 1 && !RL0420.st.fatal && RL0420.authorCount === 1, JSON.stringify({ fatal: String(RL0420.st.fatal).slice(0, 320), author: RL0420.authorCount, pages: RL0420.st.pages }));
const RL0420b = await run('unseeded Modern · the 04:20 reply with ONLY the simile clause removed — what does the new contract say next?', modern, 'replay0420NoSimile');
console.log('  [OBSERVED] 04:20 minus simile → fatal=' + String(RL0420b.st.fatal).slice(0, 400) + ' · author=' + RL0420b.authorCount + ' · pages=' + RL0420b.st.pages);
ok('RL4 (repaired) the 04:20 reply minus the simile: PUSH on FIXTURE permitted, "the door" resolves to "oven door" → mounts', RL0420b.st.pages === 1 && !RL0420b.st.fatal && RL0420b.authorCount === 1, JSON.stringify({ fatal: String(RL0420b.st.fatal).slice(0, 320), author: RL0420b.authorCount, pages: RL0420b.st.pages }));
// ═══ VALIDATOR REPAIR PASS (Roman 2026-09-09) — controls ═══
const SB1 = await run('solo · simile "like someone who already knows…" in the self-presentation beat', modern, 'soloSimile');
ok('SB1 GREEN a simile is not a second person → no SOLO_BODY; Scene 1 mounts with one stubbed author', SB1.st.pages === 1 && !SB1.st.fatal && SB1.authorCount === 1, JSON.stringify({ fatal: String(SB1.st.fatal).slice(0, 200), pages: SB1.st.pages }));
const SB2 = await run('solo · "as if somebody were standing behind me"', modern, 'soloAsIf');
ok('SB2 GREEN "as if somebody were…" is comparison → mounts', SB2.st.pages === 1 && !SB2.st.fatal, JSON.stringify({ fatal: String(SB2.st.fatal).slice(0, 200) }));
const SB3 = await run('solo · "Someone steps into the doorway behind me"', modern, 'soloReal');
ok('SB3 SOFT "Someone steps into the doorway" → mounts; solo heuristic is telemetry (solo_second_person)', _mountsSoft(SB3, 'solo_second_person'), _detail(SB3, 'solo_second_person'));
const SB4 = await run('solo · "as the guard steps closer" (bare "as" = real action)', modern, 'soloAsGuard');
ok('SB4 SOFT "as the guard steps closer" → mounts; telemetry (solo_second_person)', _mountsSoft(SB4, 'solo_second_person'), _detail(SB4, 'solo_second_person'));
const SB5 = await run('solo · sentence-initial "A clerk stands at the far counter…"', modern, 'soloCapReal');
ok('SB5 SOFT sentence-initial "A clerk stands…" → mounts; telemetry (solo_second_person) — the heuristic still DETECTS it (unit U-SB9)', _mountsSoft(SB5, 'solo_second_person'), _detail(SB5, 'solo_second_person'));
const SB6 = await run('solo · innocuous capitalized sentences ("The kettle stands cold…", "Another morning waits…")', modern, 'soloCapGreen');
ok('SB6 GREEN innocuous capitalized sentences do not trigger the solo rule → mounts', SB6.st.pages === 1 && !SB6.st.fatal, String(SB6.st.fatal).slice(0, 200));
const CS1 = await run('capability · element affordances [PORTAL, FIXTURE], PUSH', modern, 'capSet');
ok('CS1 GREEN a capability SET (array) permits PUSH when any member permits it → mounts', CS1.st.pages === 1 && !CS1.st.fatal, String(CS1.st.fatal).slice(0, 200));
const CS2 = await run('capability · element affordance "PORTAL|FIXTURE" (string set), PUSH', modern, 'capStringSet');
ok('CS2 GREEN a string set "PORTAL|FIXTURE" is accepted and permits PUSH → mounts', CS2.st.pages === 1 && !CS2.st.fatal, String(CS2.st.fatal).slice(0, 200));
const CS3 = await run('capability · FIXTURE alone, PUSH (the 04:20 case)', modern, 'capFixturePush');
ok('CS3 GREEN FIXTURE now permits PUSH/PULL (bear against, push or pull on — not carry) → mounts', CS3.st.pages === 1 && !CS3.st.fatal, String(CS3.st.fatal).slice(0, 200));
const CS4 = await run('capability · FIXTURE alone, LIFT', modern, 'capFixtureLift');
ok('CS4 RED LIFT on a FIXTURE still rejects by name (carrying is what FIXTURE excludes)', /contact\.verb LIFT is not permitted by the affordance FIXTURE/.test(String(CS4.st.fatal)) && CS4.authorCount === 0, String(CS4.st.fatal).slice(0, 200));
const CS5 = await run('capability · [PORTAL, FIXTURE], LIFT', modern, 'capSetLift');
ok('CS5 RED LIFT rejects by name when NO member of the set permits it (PORTAL+FIXTURE)', /contact\.verb LIFT is not permitted by the affordance PORTAL\+FIXTURE/.test(String(CS5.st.fatal)) && CS5.authorCount === 0, String(CS5.st.fatal).slice(0, 200));
const CS6 = await run('capability · "AMBIENT|SURFACE" on one element', modern, 'capAmbientMix');
ok('CS6 RED AMBIENT is exclusive: "AMBIENT|SURFACE" rejects by name (element_affordance_ambient_exclusive)', /element_affordance_ambient_exclusive/.test(String(CS6.st.fatal)) && CS6.authorCount === 0, String(CS6.st.fatal).slice(0, 200));
const CS7 = await run('capability · free-text affordance "hinged, pushable"', modern, 'capFreeText');
ok('CS7 RED a free-text capability claim is never accepted (element_affordance_unknown)', /element_affordance_unknown/.test(String(CS7.st.fatal)) && CS7.authorCount === 0, String(CS7.st.fatal).slice(0, 200));
const CR1 = await run('co-reference · wording names the target by its head noun only ("the ledger")', modern, 'crHead');
ok('CR1 GREEN a unique head noun resolves to the accepted element → wording co-refers → mounts', CR1.st.pages === 1 && !CR1.st.fatal, String(CR1.st.fatal).slice(0, 200));
const CR2 = await run('co-reference · possessive determiner ("its ledger")', modern, 'crPossessive');
ok('CR2 GREEN a possessive determiner + unique head noun resolves → mounts', CR2.st.pages === 1 && !CR2.st.fatal, String(CR2.st.fatal).slice(0, 200));
const CR3 = await run('co-reference · two issued elements share the head noun; wording says "the <head>"', modern, 'crAmbiguous');
ok('CR3 SOFT ambiguous head noun → mounts; wording withheld (wording_ambiguous)', _mountsSoft(CR3, 'wording_ambiguous') && _omitWording(CR3), _detail(CR3, 'wording_ambiguous'));
const CR4 = await run('co-reference · two share the head; wording says "the second <head>" (the OTHER element)', modern, 'crDisambigOther');
ok('CR4 SOFT wording resolves to the OTHER element → mounts; wording withheld (wording_other_element)', _mountsSoft(CR4, 'wording_other_element') && _omitWording(CR4), _detail(CR4, 'wording_other_element'));
const CR5 = await run('co-reference · two share the head; wording uses the token for the target', modern, 'crDisambigTarget');
ok('CR5 GREEN with two same-head elements, the token/exact name still resolves unambiguously → mounts', CR5.st.pages === 1 && !CR5.st.fatal, String(CR5.st.fatal).slice(0, 200));
const CR6 = await run('co-reference · "the <head>" twice in the wording', modern, 'crHeadTwice');
ok('CR6 SOFT head noun twice → mounts; wording withheld (wording_identity_twice)', _mountsSoft(CR6, 'wording_identity_twice') && _omitWording(CR6), _detail(CR6, 'wording_identity_twice'));
ok('CR7 RED (retained) a paraphrase as the CONTACT OBJECT ("the old weighing book") still rejects: not an issued stage element', /not an issued stage element/.test(String(V3pp.st.fatal)) && V3pp.authorCount === 0, String(V3pp.st.fatal).slice(0, 200));
ok('WD2 GREEN wording that DOES resolve (CR1, "the ledger") is delivered to the author as the ACTION WORDING line', /ACTION WORDING \(support for that contact\): I set my palm flat on the ledger/.test(_authorPrompt(CR1)), _authorPrompt(CR1).slice(0, 0) + JSON.stringify((_authorPrompt(CR1).match(/ACTION WORDING[^"]{0,120}/) || [])[0]));
// ═══ REPLAY MATRIX — every retained live planner reply, as retained, through the repaired validators ═══
const MATRIX = [['replay2101', '21:01 (un-stamped)'], ['replay2210', '22:10'], ['replay0035', '00:35'], ['replay1716', '17:16'], ['replay2032', '20:32'], ['replay2212', '22:12'], ['replay0420', '04:20'], ['replay0656', '06:56'], ['replay1131', '11:31'], ['replay1739', '17:39'], ['replay0114', '01:14 (the mounted-page run)']];
const matrix = [];
for (const [mode, label] of MATRIX) {
  const R = await run('REPLAY as retained · ' + label, modern, mode);
  matrix.push({ label, fatal: String(R.st.fatal || ''), author: R.authorCount, pages: R.st.pages });
  console.log('  [MATRIX] ' + label + ' → ' + (R.st.pages === 1 && !R.st.fatal ? 'MOUNTED (author ' + R.authorCount + ')' : 'REJECT: ' + String(R.st.fatal).slice(0, 220)));
}
const m0420 = matrix.find(x => x.label === '04:20');
ok('GATE the 04:20 reply — structurally valid and coherent under the current template — now REACHES the stubbed author and mounts one page', m0420 && m0420.pages === 1 && !m0420.fatal && m0420.author === 1, JSON.stringify(m0420));
const m1739 = matrix.find(x => x.label === '17:39');
ok('GATE-4 the 17:39 reply (first reply to the CONTACT-FIRST template: fusion→environment_plus, no target, pressure names the oven door) REACHES the stubbed author and mounts', m1739 && m1739.pages === 1 && !m1739.fatal && m1739.author === 1, JSON.stringify(m1739));
const PN1 = await run('pressure · text NAMES the contacted element (the 17:39 case)', modern, 'v3PressureNamesTarget');
ok('PN1 GREEN a pressure sentence that names the thing bearing on the protagonist is accepted → mounts', PN1.st.pages === 1 && !PN1.st.fatal, String(PN1.st.fatal).slice(0, 200));
const PN2 = await run('pressure · text carries the {ENV_TARGET} token', modern, 'v3PressureToken');
ok('PN2 SOFT placeholder token in the pressure text → mounts; pressure sentence withheld (pressure_placeholder)', _mountsSoft(PN2, 'pressure_placeholder') && _omitPressure(PN2), _detail(PN2, 'pressure_placeholder'));
const PN3 = await run('pressure · text RESTATES the environment_plus beat', modern, 'v3PressureRestatesBeat');
ok('PN3 SOFT pressure restates the E+ beat → mounts; pressure sentence withheld (pressure_restates_beat)', _mountsSoft(PN3, 'pressure_restates_beat') && _omitPressure(PN3), _detail(PN3, 'pressure_restates_beat'));
const m1131 = matrix.find(x => x.label === '11:31');
ok('GATE-3 the 11:31 reply as retained MOUNTS: planner target overridden by the contact (ep_target_overridden), its counter beat withheld (ep_beat_other_target); one stubbed author', !!m1131 && m1131.pages === 1 && !m1131.fatal && m1131.author === 1, JSON.stringify(m1131));
const R1131s = await run('REPLAY 11:31 with its independent target field stripped (what the revised template asks for)', modern, 'replay1131NoTarget');
console.log('  [MATRIX] 11:31 minus target → ' + (R1131s.st.pages === 1 && !R1131s.st.fatal ? 'MOUNTED (author ' + R1131s.authorCount + ')' : 'REJECT: ' + String(R1131s.st.fatal).slice(0, 220)));
ok('GATE-3b the 11:31 reply minus its target MOUNTS: target derives to the skylight; the counter beat is withheld (ep_beat_other_target); directive carries no EVIDENCE line', R1131s.st.pages === 1 && !R1131s.st.fatal && R1131s.authorCount === 1 && _softCodes(R1131s).includes('ep_beat_other_target') && _omitBeat(R1131s) && R1131s.logs.some(l => /derived from contact\.object: "leaking skylight"/.test(l)), _detail(R1131s, 'ep_beat_other_target'));
const m0656 = matrix.find(x => x.label === '06:56');
const _structured = ['04:20', '06:56', '11:31', '17:39', '01:14 (the mounted-page run)'].map(l => matrix.find(x => x.label === l));
ok('ACCEPTANCE every parseable retained reply with a valid stage contract + valid issued structured contact (04:20, 06:56, 11:31, 17:39) gets EXACTLY one stubbed author and one page', _structured.every(m => m && m.pages === 1 && m.author === 1 && !m.fatal), JSON.stringify(_structured));
ok('GATE-2 the 06:56 reply ("thumb jamming the button") — the second template-compliant live reply — now REACHES the stubbed author and mounts', m0656 && m0656.pages === 1 && !m0656.fatal && m0656.author === 1, JSON.stringify(m0656));
ok('MATRIX every pre-elements retained reply (they answered older templates) still rejects BY NAME with 0 author (missing-data: elements/stage_contract) — none mounts silently', matrix.filter(x => !/^(04:20|06:56|11:31|17:39|01:14)/.test(x.label)).every(x => x.author === 0 && x.pages === 0 && /stage_contract|elements missing|SOLO_|contact_object|does not co-refer/.test(x.fatal)), JSON.stringify(matrix.map(x => [x.label, x.fatal.slice(0, 80)])));
const _latestStamp = (fs.readdirSync('_validate_out').filter(f => /^scene1_measure_live\.rawreply\.\d{4}-\d{2}-\d{2}T.*planner\.1\.txt$/.test(f)).sort().pop() || '').replace(/^scene1_measure_live\.rawreply\./, '').slice(0, 16);
const _latestRow = matrix.find(x => { const st = ({ '21:01 (un-stamped)': null, '22:10': '2026-09-08T02-10', '00:35': '2026-09-08T04-35', '17:16': '2026-09-08T21-15', '20:32': '2026-09-09T00-32', '22:12': '2026-09-09T02-12', '04:20': '2026-09-09T04-20', '06:56': '2026-09-09T06-56', '11:31': '2026-09-09T11-3', '17:39': '2026-09-09T17-38', '01:14 (the mounted-page run)': '2026-09-10T01-14' })[x.label]; return st && _latestStamp.startsWith(st); });
ok('RL1 replayLive (the LATEST timestamped retained reply, whichever it is: ' + _latestStamp + ') is judged exactly as its MATRIX row — same mount/reject outcome and the same named reason; never a crash, never a silent page', !!_latestRow && RL.st.pages === _latestRow.pages && RL.authorCount === _latestRow.author && String(RL.st.fatal || '').slice(0, 60) === String(_latestRow.fatal || '').slice(0, 60), JSON.stringify({ latest: _latestStamp, live: { pages: RL.st.pages, author: RL.authorCount, fatal: String(RL.st.fatal).slice(0, 80) }, matrix: _latestRow }));
ok('RL2 (record) the 18:55 reply — the one that inherited and mounted (§16) — cannot be replayed verbatim: its raw text was overwritten before timestamped naming; its fields stand in §14/§16', true, '');
const oc = fs.readFileSync('public/orchestration-client.js', 'utf8');
const goStart = oc.indexOf('GROK-ONLY POLICY'); const goBlock = oc.slice(goStart, oc.indexOf('} else {', goStart));   // the grok-only branch only, up to the legacy else
ok('W6 static (SUPPORTING evidence only, not the proof): the grok-only branch names no Mistral or OpenAI author call; the flag defaults OFF (no assignment to true in served code); CG chain has a Grok-only variant selected under the flag', goBlock.length > 100 && !/_mistralAuthor\(|callChatGPT\(/.test(goBlock.replace(/\/\/[^\n]*/g, '')) && !/_grokOnlySceneAuthor\s*=\s*true/.test(oc) && !/_grokOnlySceneAuthor\s*=\s*true/.test(app) && /_SCREENPLAY_GROK_ONLY/.test(app), JSON.stringify({ blockLen: goBlock.length }));
ok('FR3 NO mounted page in this run carries the kernel placeholder or an omniscient "story\'s hand" line', [G, W, T1, N1, N2, A4, V3ct, V3dr, V3sf, V3nm, V3pr, V3aa, V3ar, V3nl, TP, HS, CO1].every(r => !KERNEL.test(String((r.st && r.st.pageText) || '')) && !/story's hand/i.test(String((r.st && r.st.pageText) || ''))), JSON.stringify([G, TP, HS].map(r => String((r.st && r.st.pageText) || '').match(/the one who carries the story|story's hand/i)).filter(Boolean)));
const fails = results.filter(r => !r.p).length; console.log('\n' + results.length + ' checks · ' + (results.length - fails) + ' passed · ' + fails + ' failed');
const _stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.writeFileSync('_validate_out/stage_order_controls.json', JSON.stringify({ results, valid: G.logs, noContract: N.logs, unissued: U.logs, empty: E.logs, seeded: S.logs, t1: T1.logs, t2: T2.logs, t3: T3.logs, n1: N1.logs, n3: N3.logs, a1: A1.logs, a2: A2.logs, a3: A3.logs, a4: A4.logs }, null, 2));
try { fs.copyFileSync('_validate_out/stage_order_controls.json', '_validate_out/stage_order_controls.' + _stamp + '.json'); } catch (_) {}
process.exit(fails ? 1 : 0);
