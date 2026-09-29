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
  const base = { issueArcs: [{ n: 1, title: 'the customs house', beats: [] }], characterIcebergs: {} };
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
  ['characterSheet',   t => /DISTINGUISHING FEATURE \(anti-calcification ROTATION/.test(t)],
  // These two appear ONLY once the A-plot validates: a PERSON antagonist with full wound
  // architecture is what makes production generate an antagonist body bible and run the
  // wound→LI swap test. The invalid fixture had been suppressing them.
  ['antagonistBodyBible', t => /generating an ANTAGONIST BODY BIBLE/.test(t)],
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

// ── THE BROWSER IS RECYCLED, NOT NURSED ──
// One browser served every context in this suite: roughly sixty of them, each loading a
// three-hundred-thousand-line application. It died of exhaustion partway through the mutation
// loop — twice at the same stage — and reported it as "Target page, context or browser has been
// closed", which reads like a harness bug and is really a resource ceiling. Recycling on a fixed
// count is deterministic; waiting for it to fall over is not.
let browser = await chromium.launch({ headless: true });
let _ctxIssued = 0, _browserGeneration = 1, _ctxLive = 0;
const CTX_PER_BROWSER = 10;
const utf8 = s => Buffer.byteLength(String(s == null ? '' : s), 'utf8');

export { REQUEST_KINDS, plannerReply, scaffoldReply, APLOT_VALID, ANTAGONIST_BIBLE, GENERIC, PROSE, utf8, PASSTHROUGH, LOCAL, MODEL };
