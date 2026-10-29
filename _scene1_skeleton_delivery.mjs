// COMMIT B PART 2 — merged opening planner: nested envelope, C+/E+/fusion, delivery.
//
// Free, network-fenced. Proves the ten required points across HEAVY and HOTFAST, plus
// that the CONTINUATION skeleton path is unchanged.
//
// usage: node _scene1_skeleton_delivery.mjs
import { chromium } from 'playwright-core';
import vm from 'node:vm';
import fs from 'fs';
import { instrument } from './_scene1_instrument.mjs';
import { buildScene1Prose, NONTOKEN_A, SCENE_WANT } from './_hook_fixture_prose.mjs';

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
function force(src, fn, v) {
  const needle = `function ${fn}() {`;
  if (src.split(needle).length - 1 !== 1) throw new Error(`${fn}: not exactly one definition`);
  return src.replace(needle, `${needle} return ${v};`);
}
const mk = hot => instrument(force(force(SRC, '_litLiteActive', 'false'), '_hotFastActive', hot ? 'true' : 'false'));

const PROSE = buildScene1Prose(NONTOKEN_A);
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

// Names production actually OFFERED a Character+ option to on the most recent planner request.
// Module scope, because plannerReply assigns it and every delivery assertion reads it: an
// undeclared assignment throws inside the route handler, the request never fulfils, and the
// page dies with "Target page has been closed" — which reads like an environment fault.
let LAST_OFFERED = [];
// ── WHAT THE V13 FIXTURE ACTUALLY CHOSE (2026-10-25) ──────────────────────────────────────
// The arm used to hard-code "typed E6, expect E5" from a packet in which the Dohkar's option
// rested on E5 alone. It now rests on E6, so typing E6 was typing the CORRECT id: production
// derived nothing because there was nothing to derive, and the arm failed on its own fixture
// (`{"author":1,"e":"E6","logged":false}`). The expected id is now READ from the offered option
// and a DIFFERENT id is supplied deliberately, so the mismatch exists by construction and the
// assertion reads the pair from here instead of from a constant that can go stale again.
let V13_PAIR = null;
// config is handled separately now — see _test_session_env.mjs: fulfilling it with {} stopped the
// runtime leak and also silently unauthenticated every run, so Scene 1 was refused at the purchase
// gate and all 344 assertions below were measuring a chain that never executed.
const PASSTHROUGH = /\/api\/(geo|csp-report|beta-events)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 },
                // 2026-09-07: a Scene-1 planner fatal now FAILS AND REFUNDS (outer begin-story catch). The refund is
                // a sanctioned local route, counted per arm so the guard arm can ASSERT it fired exactly once.
                '/api/refund-fortune':  { success: true, fortunesRemaining: 9999 } };
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/;
// Non-model /api/ endpoints this chain legitimately touches: no messages, no provider, no spend.
const NON_MODEL_API = /\/api\/(bug-report-awards|record-tempt-failure)\b/;
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
  // TWO DISTINCT PERCEPTION PASSES EXIST IN PRODUCTION (app.js:25749 and :25830). One signature
  // matched both, so when both ran the census read pa_perception=2 against a want of 1 and the
  // arm failed. Split rather than relaxed to 2: each pass is now pinned on its own, so one of
  // them disappearing or running twice still fails here.
  ['pa_perceptionSimile', t => /PERCEPTION EDITOR\. The scene below is SIMILE-DRUNK/.test(t)],
  ['pa_perception',    t => /PERCEPTION EDITOR\. The scene below is already written and already works/.test(t)],
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
  // ── THE VALID BASELINE FOR THE CROSS-OPTION CASE (2026-10-25) ────────────────────────────
  // Same declared fixture, same candidate, same widened option — and an enacts_evidence_id that
  // the option IS established by. This must be ACCEPTED and reach the author. Without it the
  // hostile arm below cannot be read: a rejection would be evidence about the fixture (or about
  // the widened option being unusable at all) rather than about the binding it is testing.
  if (mutate === 'contemptEvidenceBaseline' || mutate === 'contemptOverJealousyEvidence') {
    const _hostile = (mutate === 'contemptOverJealousyEvidence');
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
        // BASELINE cites one of the option's OWN facts; HOSTILE cites the foreign one. Everything
        // else about the two replies is byte-identical, so the only difference the product can
        // react to is the binding.
        return { ...c, option_id: o.id, enacts_evidence_id: _hostile ? wrong : o.ev[0] };
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
  if (mutate === 'v2EvidenceDerived' && SEEDED) {
    V13_PAIR = null;
    cp = cp.map(c => {
      if (!/Dohkar/.test(c.character) || V13_PAIR) return c;
      const own = EVID(c.option_id);
      // The derivation production is being asked about only exists for a SINGLE-fact option.
      if (own.length !== 1) return c;
      const all = [...usr.matchAll(/^ {2}(E\d+): /gm)].map(m => m[1]);
      const wrong = all.find(e => e !== own[0]);
      if (!wrong) return c;
      V13_PAIR = { character: c.character, option_id: c.option_id, expected: own[0], typed: wrong };
      return { ...c, enacts_evidence_id: wrong };
    });
    if (!V13_PAIR) throw new Error('fixture: no Dohkar single-fact option with another fact id available — the derivation case cannot be built here and must not pass silently');
  }
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

// ── THE REPAIR RESPONDER (2026-10-25) ─────────────────────────────────────────────────────
// WHY THIS EXISTS. Production's skeleton repair (app.js:293918) is a SECOND call to the SAME
// planner route with no distinguishing convId, so `kind === 'planner'` answered it with
// plannerReply() — the WHOLE plan. The strict merge (app.js:140156) then rejected every key the
// repair had not asked for as REPAIR_SCOPE_VIOLATION, and the single fault each arm was built to
// observe was overwritten by that violation. 19 arms failed on harness noise, not on production.
//
// WHAT IT DOES NOT DO. It does not repair anything. Each arm's injected fault is returned
// VERBATIM, so the revalidation pass fails on the ORIGINAL fault and the arm measures what it
// was written to measure. A stub that fixed the fault would make every hostile arm pass by
// never being invalid twice.
const REPAIR_FIRST_LINE = 'Your previous response had one or more fields that failed validation.';
function isRepairRequest(usr) { return typeof usr === 'string' && usr.indexOf(REPAIR_FIRST_LINE) === 0; }
// askFor is read off the request's own closing line, so the stub cannot ask for more than
// production authorized — the same string the strict merge checks against.
function repairAskFor(usr) {
  const m = usr.match(/Return ONLY a JSON object containing exactly these top-level keys, corrected: ([^\n.]+)\./);
  return m ? m[1].split(',').map(x => x.trim()).filter(Boolean) : [];
}
function repairReply(usr, mutate, priorUser) {
  const askFor = repairAskFor(usr);
  // The prior planner request is what plannerReply() needs to rebuild the SAME mutated plan
  // (it reads the staged roster out of that request). Without it the reply would be built from
  // the compact repair text, whose roster block does not exist, and every member would be empty.
  let plan = null;
  try { plan = JSON.parse(plannerReply(priorUser, mutate)); } catch (_) { plan = null; }
  if (!plan) return JSON.stringify({});
  const skel = plan.scene_skeleton || (plan.opening_spine && plan.opening_spine.scene_skeleton) || {};
  const spine = plan.opening_spine || {};
  const out = {};
  askFor.forEach(k => {
    // decision_beat is an opening_spine FIELD returned as a TOP-LEVEL key — the request says so
    // (app.js:140021) and the merge carries it across by that name (app.js:293928).
    if (k === 'decision_beat') { if ('decision_beat' in spine) out.decision_beat = spine.decision_beat; return; }
    if (k in skel) out[k] = skel[k];
  });
  return JSON.stringify(out);
}

let pass = 0, fail = 0;
// MODULE SCOPE: referenced by the mutate loop, so it cannot live inside plannerReply.
// ── DEDICATED FIXTURE FOR THE CROSS-OPTION CASE (2026-10-25) ──────────────────────────────
// MEASURED: every option in the First Sacrifice packet is established by EXACTLY ONE fact
// (8 facts, 10 options, all single). Since the 2026-09-06 tightening a single-fact option
// DERIVES its enacted fact, so "wrong evidence" is not expressible against one — which is why
// the fixture guard threw rather than let the arm pass by going inert. The guard is NOT weakened.
// THIS IS A DECLARED SYNTHETIC FIXTURE, NOT PRODUCTION DATA. It unions one real foreign fact id
// into one real single-fact option AT THE DATA LEVEL (read by both the prompt render,
// app.js:290926, and the validator, app.js:292594/292635), so the option is genuinely multi-fact
// for this ONE arm. Mutating only the rendered string would leave the validator deriving the
// fact and the arm inert.
//
// IT MUTATES THE **FINAL OFFERED LIST** (2026-10-25, second attempt). The first version patched
// _cpBuildGroundedOptions's `out`, which is upstream of _cpApplySchedule (app.js:146378-146400):
// that scheduler drops SUPPRESSED/DEFERRED recipients, filters by avoidFacetIds and RENUMBERS
// every option_id. So the option the fixture widened need not survive into the offer the planner
// actually reads — and it did not: the arm's precondition guard threw and the case reported
// BLOCKED. Patching the scheduler's return instead means the widened option is, by construction,
// an option OFFERED to a candidate, and it is offered to `kept[0].recipient` — the tested one.
const FIXTURE_MULTIFACT = { from: String.raw`    return kept.map(function (o, i) { return Object.assign({}, o, { option_id: 'OPT-' + (i + 1), source_option_id: o.option_id }); });`, to: String.raw`    var _fxOut = kept.map(function (o, i) { return Object.assign({}, o, { option_id: 'OPT-' + (i + 1), source_option_id: o.option_id }); });
    (function () {
      if (!_fxOut.length) return;
      var _all = [];
      _fxOut.forEach(function (o) { (o.evidence_ids || []).forEach(function (e) {
        if (_all.indexOf(e) < 0) _all.push(e); }); });
      var _who = String(_fxOut[0].recipient || '');
      for (var _i = 0; _i < _fxOut.length; _i++) {
        var _o = _fxOut[_i];
        if (String(_o.recipient || '') !== _who) continue;
        if ((_o.evidence_ids || []).length !== 1) continue;
        var _foreign = null;
        for (var _k = 0; _k < _all.length; _k++) {
          if (_o.evidence_ids.indexOf(_all[_k]) < 0) { _foreign = _all[_k]; break; }
        }
        if (!_foreign) continue;
        _o.evidence_ids = _o.evidence_ids.concat([_foreign]);
        try { console.log('[FIXTURE:MULTIFACT] recipient=' + _who + ' option=' + _o.option_id
          + ' evidence_ids -> ' + _o.evidence_ids.join(',')); } catch (_) {}
        break;
      }
    })();
    return _fxOut;` };

// ── OUTCOME LEDGER (2026-10-25) ────────────────────────────────────────────────────────────
// A suite that dies mid-run used to report nothing at all. Every test now lands in one of four
// buckets and the run ALWAYS prints them, so "not executed" can never be mistaken for "passed".
const outcomes = [];
let blockedN = 0, skippedN = 0;
const tBlocked = (n, why) => { blockedN++; outcomes.push({ n, status: 'blocked' });
  console.log(`  \u2298 ${n}\n      BLOCKED \u2014 NOT EXECUTED: ${String(why).slice(0, 220)}`); };
const tSkipped = (n, why) => { skippedN++; outcomes.push({ n, status: 'skipped' });
  console.log(`  \u2014 ${n}\n      SKIPPED: ${String(why).slice(0, 220)}`); };
const t = (n, c, d) => { outcomes.push({ n, status: c ? 'pass' : 'fail' }); if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };
const count = (h, n) => (String(h).split(n).length - 1);

// ── REAL CHARACTER-BLOCK BOUNDARIES (2026-10-25) ──────────────────────────────────────────
// WHY THIS REPLACED FIXED LINE WINDOWS. The CHARACTER+ section of the author system message is
// a list of `  • <name>` bullets whose fields are indented SIX spaces, followed by a generic
// `  RECONSTRUCT …` paragraph at TWO spaces. Two different window sizes were being used — 7
// lines in the ACT/LENS arms, 5 in U9 — and both were wrong in opposite directions, measured
// against the real delivered packet (_nf_capture/HEAVY_OPENING_AUTHOR_system.txt:1042):
//   · Julian's block is SIXTEEN lines, because SOCIAL PROOF FIRST only applies to a first
//     depiction and pushes his VISIBLE ACTION to +13 and PC INTERPRETATION to +14. Both are
//     PRESENT. The windows cut them off and the suite reported a missing assignment.
//   · The presiding Dohkar is the LAST bullet, so a window that overruns his block swallows the
//     RECONSTRUCT paragraph, which repeats the words VISIBLE ACTION, PC INTERPRETATION and
//     SOURCE TRUTH as explanation. That is what the "duplicated pair" was.
// A block therefore runs from its bullet to the next line indented TWO SPACES OR LESS — the
// next bullet, the RECONSTRUCT paragraph, or the end of the section. No window, no guessing.
// AND SCOPED TO THE CHARACTER+ SECTION. The same `  • <name>` shape is used by other lists in
// the same system message — ESTABLISHED CHARACTER CANON carries three `• the presiding Dohkar`
// bullets of its own. Counting bullets document-wide made U9 read Dohkar=5, Seren=3, Julian=2;
// the old 5-line window had been hiding that by accident, not by design. The section runs from
// its own header to the next line with NO leading space.
const cpSection = (sys) => {
  const L = String(sys).split('\n');
  const a = L.findIndex(l => /^CHARACTER\+ ASSIGNED THIS SCENE/.test(l));
  if (a < 0) return [];
  let b = a + 1;
  while (b < L.length && !/^\S/.test(L[b])) b++;
  return L.slice(a, b);
};
const cpBlockLines = (sys, name) => {
  const L = cpSection(sys);
  const i = L.findIndex(l => /^\s*•\s/.test(l) && l.includes(name));
  if (i < 0) return [];
  let j = i + 1;
  while (j < L.length && (/^ {3,}\S/.test(L[j]) || L[j].trim() === '')) j++;
  return L.slice(i, j);
};
const cpBlock = (sys, name) => cpBlockLines(sys, name).join('\n');
// ONE BULLET PER PERSON, COUNTED INSIDE THAT SECTION ONLY.
const cpBulletCount = (sys, name) => cpSection(sys)
  .filter(l => /^\s*•\s/.test(l) && l.includes(name)).length;

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
async function newCtx() {
  // RECYCLE ONLY WHEN NOTHING IS OPEN. One probe builds a second context while another is still
  // in use; closing the browser underneath it produced the very "Target page has been closed"
  // this recycling exists to prevent — the fix reproducing the fault it was fixing.
  if (_ctxIssued >= CTX_PER_BROWSER && _ctxLive === 0) {
    await browser.close().catch(() => {});
    browser = await chromium.launch({ headless: true });
    _ctxIssued = 0; _browserGeneration++;
  }
  // THE BROWSER CAN DIE UNDER US (observed 2026-10-24). The mutate loop lost Chromium part-way
  // and every remaining arm threw "Target page, context or browser has been closed", so roughly
  // ten validator arms SILENTLY NEVER RAN — worse than a failing arm, because a skipped arm
  // reports nothing at all. Two changes, both harness-only:
  //   1. counters advance only AFTER a context is really created. Previously a failed create had
  //      already incremented _ctxLive, which could never be decremented (no context exists to
  //      close), latching it above zero and disabling recycling for the whole remaining run.
  //   2. a dead browser is relaunched ONCE and the create retried, so the suite finishes its arms
  //      instead of abandoning them.
  let c;
  try {
    c = await browser.newContext();
  } catch (_eNew) {
    await browser.close().catch(() => {});
    browser = await chromium.launch({ headless: true });
    _ctxIssued = 0; _browserGeneration++;
    console.log('  [harness] browser was dead; relaunched (generation ' + _browserGeneration + ')');
    c = await browser.newContext();
  }
  _ctxIssued++; _ctxLive++;
  const _close = c.close.bind(c);
  c.close = async function () { _ctxLive = Math.max(0, _ctxLive - 1); return _close(); };
  return c;
}
let _closing = false;
const closeBrowser = async () => { if (_closing) return; _closing = true; try { await browser.close(); } catch (_) {} };
// A throw anywhere must not strand Chromium children — the old suite left them behind on every
// timeout, and that is the other half of the memory story.
process.on('uncaughtException', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('unhandledRejection', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('exit', () => { try { browser.close(); } catch (_) {} });

// A DEAD BROWSER MUST NOT END THE SUITE (harness fix 2026-10-24).
// The newCtx relaunch covers a browser that is already dead when a context is requested. It does
// NOT cover Chromium dying DURING an arm: that throw propagated out of the mutate loop, the
// uncaughtException handler exited, and the suite never printed its own pass/fail summary — the
// remaining arms reported nothing at all. This wrapper relaunches and retries the arm ONCE.
// It retries ONLY on the browser-lifecycle error; every other failure propagates untouched, so
// a real product fault still fails here.
async function run(opts) {
  try { return await _runOnce(opts); }
  catch (e) {
    const msg = String((e && e.message) || e);
    if (!/Target page, context or browser has been closed|Target closed|browser has been closed/.test(msg)) throw e;
    try { await browser.close().catch(() => {}); } catch (_) {}
    browser = await chromium.launch({ headless: true });
    _ctxIssued = 0; _ctxLive = 0; _browserGeneration++;
    console.log('  [harness] browser died mid-arm; relaunched (generation '
      + _browserGeneration + ') and retrying this arm once');
    return await _runOnce(opts);
  }
}
async function _runOnce({ hot, mutate, solo, duo, pollute, genPortfolio, mutateSrc, kindnessScene, injectScaffoldFailure }) {
  const ctx = await newCtx();
  try {
  const page = await ctx.newPage();
  page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
  await installSession(page);
  const pageEvents = [];
  const planner = [], author = [], escaped = [], unknown = [], scaffold = [],
        unknownModel = [], ambiguous = [], cplusEditor = [], fixtureErrors = [],
        nonModelApi = [];
  const kinds = {}; let bibleReq = 0; const local = {};
  // MUTATION CONTROL. The served source is the ONE lever; a case that passes with the production
  // invocation deleted is evidence about a helper, not about the call site.
  let _srcMutated = null, _mutationTargets = null, _mutationCounts = null;
  let _srcParseError = null;
  await page.route('**/app.js*', r => {
    let body = mk(hot);
    if (mutateSrc) {
      // The target must be UNIQUE. A marker that appears twice deletes one call site and leaves
      // the other standing, and the control then proves nothing — this is the same non-unique
      // marker mistake that once cost a six-figure line count.
      // '@@AND@@' joins independent replacements into one served copy, so an arm can change
      // both the injected failure AND the commit placement at once.
      // ONE COUNT PER REPLACEMENT: a single aggregate once hid an inverse arm whose second
      // mutation matched nothing — it ran identical code to the control and passed anyway.
      const _froms = String(mutateSrc.from).split('@@AND@@');
      const _tos = String(mutateSrc.to).split('@@AND@@');
      _mutationCounts = _froms.map(f => body.split(f).length - 1);
      _mutationTargets = _mutationCounts[0];
      let next = body;
      _froms.forEach((f, i) => { next = next.replace(f, _tos[i]); });
      _srcMutated = next !== body;
      // PARSE THE MUTATED BYTES BEFORE SERVING THEM. A trace inserted between `try {...}` and
      // `catch` is a syntax error: the page never initializes and the arm dies as an opaque
      // 180s waitForFunction timeout, which reads like an app defect rather than a bad seam.
      try { new vm.Script(next, { filename: 'mutated-app.js' }); }
      catch (_pe) { _srcParseError = String((_pe && _pe.message) || _pe); }
      body = next;
    }
    return r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body });
  });
  await page.route('**/sb-test.localhost/**', r => r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
  // ── FIXTURE ERRORS ARE HANDLED AT THE ROUTE BOUNDARY (2026-10-25) ────────────────────
  // A fixture precondition that cannot be met THROWS inside this handler. A throw here never
  // reaches the awaiting page.evaluate: the route simply never settles, so the page hung and
  // the process died via unhandledRejection — killing the whole suite and taking the report of
  // every passing test with it. Now the failure is RECORDED, the intercepted request is
  // ABORTED (so nothing is forwarded to any provider), and independent arms continue.
  await page.route('**/api/**', async route => {
    try {

    const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (/\/api\/config\b/.test(url)) return route.fulfill({ status:200, contentType:'application/json', body: configBody() });
    if (isAuthOrigin(route.request().url())) return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    if (PASSTHROUGH.test(url)) return /* FULFILLED, NOT FORWARDED: a forwarded static endpoint spawns a @vercel/node runtime that is never reaped — they accumulate into gigabytes and wedge the dev server mid-suite. */ route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    const k = Object.keys(LOCAL).find(x => url.startsWith(x));
    if (k) { local[k] = (local[k] || 0) + 1; return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(LOCAL[k]) }); }
    let b=null; try { b = JSON.parse(route.request().postData()||'{}'); } catch(_){}
    // ── /api/cplus-editor: A PROVIDER DOOR THIS SUITE PREDATES (harness fix 2026-10-24) ──
    // The C+ editor route was activated 2026-10-16, after this interceptor was written. It
    // matched neither LOCAL nor MODEL, so it fell through to `unknown` and was ABORTED — blocked,
    // which is why `escaped` stayed empty, but UNACCOUNTED, which failed every
    // "zero escaped / unknown" assertion for a harness reason and not a product one.
    //
    // IT MUST NOT GO IN `LOCAL`. LOCAL is for free local endpoints answered 200; bucketing a
    // PAID provider door there would hide a model call from this suite's own call accounting,
    // which is the one thing the suite exists to measure.
    //
    // IT IS ANSWERED WITH ONE REAL PRODUCTION SHAPE: 403 { error: 'feature_disabled' }.
    // app.js classifies that code as noSpend — "nothing was sent upstream and nothing was
    // charged" — and publishes the scene untouched, which is the correct baseline for a
    // delivery suite. Nothing upstream is contacted and NO production code changes.
    if (/\/api\/cplus-editor\b/.test(url)) {
      cplusEditor.push(url);
      return route.fulfill({ status: 403, contentType: 'application/json',
        body: JSON.stringify({ error: 'feature_disabled' }) });
    }
    // ── NAMED NON-MODEL ENDPOINTS ───────────────────────────────────────────────────────────
    // `unknownApi=1` meant "a request this harness cannot name", which is the right default and
    // the wrong place to leave it. The request is /api/bug-report-awards — an awards lookup for
    // the signed-in user that posts no messages, reaches no provider and cannot spend. It is
    // recorded under its own name so the census can pin it, and the UNKNOWN bucket stays strict:
    // anything not on this short list still lands there and still fails the census.
    if (NON_MODEL_API.test(url)) { nonModelApi.push(url); return route.abort(); }
    if (!MODEL.test(url)) { unknown.push(url); return route.abort(); }
    const m=(b&&b.messages)||[];
    const sys=String((m.find(x=>x.role==='system')||{}).content||'');
    const usr=String((m.find(x=>x.role==='user')||{}).content||'');
    // EXCLUSIVE CLASSIFICATION. Every signature is evaluated; exactly one must match. Zero
    // matches is an unnamed request, more than one is an overlapping classifier — both are
    // accounted for and, in the portfolio arms, ABORTED rather than answered.
    const _txt = sys + '\n' + usr;
    const _hits = REQUEST_KINDS.filter(([, test]) => test(_txt, sys, usr)).map(([k]) => k);
    let out;
    if (_hits.length !== 1) {
      const rec = { url, matched: _hits, head: (sys || usr).slice(0, 110).replace(/\s+/g, ' ') };
      (_hits.length === 0 ? unknownModel : ambiguous).push(rec);
      if (genPortfolio) return route.abort();
      out = JSON.stringify(GENERIC);
    } else {
      const kind = _hits[0];
      kinds[kind] = (kinds[kind] || 0) + 1;
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
        // back — exactly what a model can do and no more.
        const _ref = _txt.match(/subject_ref:\s*(\S+)/);
        scaffold.push({ url, system: sys, user: usr, max_tokens: b.max_tokens,
                        subject_ref: _ref ? _ref[1] : null });
        out = JSON.stringify(scaffoldReply(_ref ? _ref[1] : null, genPortfolio));
      } else if (kind === 'author') {
        author.push({ system: sys, user: usr, max_tokens: b.max_tokens, url });
        out = PROSE;
      } else if (kind === 'planner') {
        planner.push({ url, model:b.model, role:b.role, max_tokens:b.max_tokens, reasoning_effort:b.reasoning_effort,
                       reasoningEffort:b.reasoningEffort, preferredModel:b.preferredModel, response_format:b.response_format, user: usr });
        // A REPAIR CALL IS STILL A PLANNER CALL — it is pushed to `planner` above either way,
        // because production really does issue a second paid request on this route.
        out = isRepairRequest(usr)
          ? repairReply(usr, mutate, (planner[planner.length - 2] || {}).user || '')
          : plannerReply(usr, mutate);
      } else if (kind === 'aplotGenerator' && genPortfolio) {
        // A VALID plot, so production accepts it first time and never enters correction. It
        // declares a PERSON; normalisation, the canonical mint and the roster line are all
        // production's work from here. `invalidAplot` deliberately withholds it, so the
        // correction bucket is EXERCISED rather than asserted at zero and never tested.
        out = JSON.stringify(genPortfolio.invalidAplot ? GENERIC : APLOT_VALID);
      } else if (kind === 'aplotCorrection' && genPortfolio) {
        out = JSON.stringify(APLOT_VALID);      // the correction succeeds, as it does in production
      } else if (kind === 'antagonistBodyBible' && genPortfolio) {
        // ONE REQUEST IS NOT PROOF OF DEDUPLICATION. With an instant answer, callers that would
        // have raced are simply serialised by the response — the first one finishes before the
        // second is reached. Holding the response open is the only way to ask whether a second
        // caller enters WHILE the first is in flight, which is the shape a duplicate PAID call
        // would take in production.
        bibleReq++;
        if (genPortfolio.holdBibleMs) await new Promise(r => setTimeout(r, genPortfolio.holdBibleMs));
        // A nominated request returns a bible production must DISCARD (no signature_feature, no
        // softness_seam, no tell), so the failure-and-retry path is exercised for real.
        out = JSON.stringify((genPortfolio.failBibleOn || []).indexOf(bibleReq) !== -1
          ? { archetype: 'BUREAUCRATIC_COLD', height: 'tall' } : ANTAGONIST_BIBLE);
      } else out = JSON.stringify(GENERIC);
    }
    // SHAPE-FAITHFUL ENVELOPES (2026-08-25 — added after the paid run). /api/mistral-proxy
    // returns the RAW Mistral envelope and never sets a top-level `content`; only
    // /api/chatgpt-proxy normalises to {content}. The old mock returned BOTH shapes at once,
    // which is precisely why this suite passed while production discarded every opening plan
    // as "no JSON object". A mock must never hand the client a shape the proxy cannot produce.
    const envelope = /mistral-proxy|\/api\/proxy\b/.test(url)   // both return the RAW provider envelope (+ _orchestration)
      ? { id:'mock', object:'chat.completion', model:b.model, usage:{}, _orchestration:{ role: b.role || null, model: b.model },
          choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content: out } }] }
      : { ok:true, content: out, choices:[{ message:{ content: out } }] };
    return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(envelope) });
      } catch (_fx) {
      fixtureErrors.push(String((_fx && _fx.message) || _fx).slice(0, 400));
      try { return await route.abort(); } catch (_) { return; }
    }
  });
  page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
  const logs = [];
  // 400, not 220: a fault list is truncated by this line, and a needle assertion that reads the
  // truncated text reports a check as broken when the check fired and the tail was cut.
  // TEST-ONLY INVOCATION TRACE. Production emits nothing unless a sink is installed, so this
  // costs the app nothing and keeps the event stream out of state and telemetry. It exists to
  // answer "was the subplot scheduled, cancelled, or never started" without guessing.
  await page.addInitScript((inject) => {
    window.__injectScaffoldFailure = !!inject;
    // Snapshot the gate AT the moment the injected failure fires, so "had it committed yet?"
    // is answered by observation rather than by reasoning about ordering afterwards.
    window.__gateAtFailure = null;
    window.__invEvents = [];
    window.__invTrace = (e) => { try { window.__invEvents.push(e.event + ':' + JSON.stringify(e.detail)); } catch (_) {} };
    // THE ARGUMENT MUST BE PASSED. For three attempts it was not: `inject` arrived undefined, the
    // flag was permanently false, and every injected throw was dead code. The seam was never the
    // fault — the switch was. `injectArmed` is exported so a test can assert the switch is ON.
  }, !!injectScaffoldFailure);
  // ── CONTRACT v2 AVAILABILITY VALVE (2026-09-05) ──
  // Production ships the valve ON: an invalid ASSIGNMENT plan drops C+/E+/fusion and authors Scene 1
  // from the seed stage. This suite tests DETECTION, and its mutation cases assert "named fault, no
  // author call" — so it runs with the valve OFF, which restores the abort those assertions expect.
  // The valve's own behaviour (dropped → author reached, nothing thrown) is proven separately by
  // replaying the frozen stage-0 plans through _planner_probe3.mjs (REPLAY_DIR, valve ON).
  //   SB_VALVE=off → window._scene1AssignmentValve = false for every page in this run.
  // The valve is OPT-IN in production pending approval (window._scene1AssignmentValve === true), so
  // the default page already aborts on an invalid plan. SB_VALVE=on switches it on for the pages of
  // the valve-behaviour part (PART W); SB_VALVE=off is kept as an explicit no-op for symmetry.
  if (process.env.SB_VALVE === 'on') await page.addInitScript(() => { window._scene1AssignmentValve = true; });
  if (process.env.SB_VALVE === 'off') await page.addInitScript(() => { window._scene1AssignmentValve = false; });
  page.on('console', m => { const x=m.text(); // PORTFOLIO is included because the grounding gate reports there: without it a run that aborts
  // before the planner shows an empty cast and no reason, which is how two cases looked like
  // fixture bugs when they were a refusal working as designed.
  if (/SCENE1:|SKELETON|PLANNER|PORTFOLIO/.test(x)) logs.push(x.slice(0,400)); if (m.type() === 'error') pageEvents.push('console.error: ' + x.slice(0, 200)); });
  // PAGE-LEVEL FAILURE CAPTURE (2026-09-07: silent arms produced NO console output; nothing recorded why).
  page.on('pageerror', e => pageEvents.push('pageerror: ' + String(e && e.message).slice(0, 200)));
  page.on('crash', () => pageEvents.push('CRASH: page crashed'));
  page.on('requestfailed', r => { const u = r.url(); if (!/sb-test\.localhost/.test(u)) pageEvents.push('requestfailed: ' + u.replace(/^https?:\/\/[^/]+/, '').slice(0, 120) + ' ' + ((r.failure() || {}).errorText || '')); });
  page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0,200)));

  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout:120000 });
  const res = await page.evaluate(async ({ solo, duo, pollute, genPortfolio, kindnessScene }) => {
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
    if (genPortfolio) {
      // ── A GENERATED ANTAGONIST, STAGED (2026-08-29) ──
      // Marcus Vale has no seed facets, so the generated_cast provider is his ONLY psychological
      // source. Staging him through the plan's participants is what makes him a C+ candidate, so
      // this proves the whole chain in one run: attached portfolio → provider → planner choices →
      // one selected truth in the author request.
      // The antagonist ACTS in this scene, and the plan says so structurally — without an owned
      // fact he is offered no option and the whole generated-portfolio arm has nothing to test.
      window.STARTER_PLANS['test_genpf'] = { scenes: [{ n:1,
        goal:'Marcus Vale reads the clause aloud and refuses to sign what she has already counted',
        setting:'the customs house',
        participants:['Lirael', 'Marcus Vale'],
        eventFacts:[{ text:'Marcus Vale reads the clause aloud, in order, and refuses to sign the manifest she has already counted',
                      participants:[{ ref:'named:marcus_vale', role:'actor', label:'Marcus Vale' }] }] }] };
      s._starterId = 'test_genpf';
      // NOTHING IS STAGED BY HAND HERE — not the A-plot, not the canonical entity, not the
      // portfolio. The A-plot response declares a PERSON antagonist; production normalises it,
      // mints the canonical identity, puts the subject_ref on the scaffold request, and attaches
      // what comes back. The canonical id is READ AFTERWARDS, from wherever production put it.
    } else if (duo) {
      // An ASSIGNMENT-owned two-person stage: Lirael and Seren are stated participants, so
      // presence is 'assignment'. Julian stays the love interest and therefore OFFSTAGE — which
      // is what lets us prove an offstage person may not be promoted to interlocutor.
      window.STARTER_PLANS['test_duo'] = { scenes: [{ n:1,
        goal:'Seren checks the faces at the counter before she signs what has already been counted',
        setting:'the customs house',
        participants:['Lirael', 'Seren'],
        eventFacts:[{ text:'Seren checks the faces around the counter twice, in front of everyone, before she will sign what has already been counted',
                      participants:[{ ref:'named:seren', role:'actor', label:'Seren' }] }] }] };
      s._starterId = 'test_duo';
    } else if (solo) {
      s._scene1Mission = 'She waits alone in the customs house before the tide turns, counting what she has already signed for';
    } else {
      Object.assign(s, { _starterId: def.id, is_starter_story: true, immutableTitle: def.title });
    }
    s.picks.identity = s.identity; s._skipCorridorValidation = true;
    // ── A TEST-ONLY SCENE FOR GUARDRAIL SCOPING ──
    // The guardrail cases need the Dohkar's KINDNESS facet to have a grounded option, and the
    // canonical seed scene gives him no beat that activates it — correctly, because he does no
    // such thing in the First Sacrifice. Inventing one into the seed would put content in the
    // canon to satisfy a test. This adds the owned fact HERE, in the fixture, for the arms that
    // are about guardrail SCOPING rather than about the seed's story.
    if (kindnessScene) {
      try {
        const seed = window._activeSeed ? window._activeSeed(s) : null;
        if (seed && seed.sceneOne) {
          seed.sceneOne.eventFacts = (seed.sceneOne.eventFacts || []).concat([{
            text: 'The presiding Dohkar steps aside for a barefoot guest who arrived with nothing and gives them his own place at the edge',
            participants: [{ ref: 'role:first_sacrifice_presiding_dohkar', role: 'actor',
                             label: 'the presiding Dohkar' }] }]);
        }
      } catch (_) {}
    }
    let threw = null;
    try { await Promise.race([window.handleBeginStory(), new Promise(x=>setTimeout(x,120000))]); }
    catch(e){ threw = String(e && e.message); }
    s._skipCorridorValidation = false;
    // ── TWO CALLERS, DELIBERATELY AT ONCE ──
    // The natural Scene-1 path reaches its call sites sequentially, so a held response proves
    // nothing about the FUNCTION's own deduplication. This asks the question directly: with no
    // completed bible on state and the response held open, does a second concurrent caller issue
    // a second PAID request? Production has five call sites and only a completed-state check.
    let bibleProbe = null;
    if (genPortfolio && genPortfolio.probeConcurrentBible) {
      // A · DEDUPLICATION. Two callers, nothing on state, the response held open.
      s.antagonistBodyBible = null;
      const both = await Promise.all([window._generateAntagonistBodyBible(),
                                      window._generateAntagonistBodyBible()]);
      const dedupe = { resolved: both.filter(Boolean).length, same: both[0] === both[1],
                       stored: !!s.antagonistBodyBible };
      // B · FAILURE IS RETRYABLE. An in-flight entry that is never cleared on failure poisons the
      // generator for the rest of the story — the second attempt would join a promise that
      // already resolved to null and no request would ever be made again.
      s.antagonistBodyBible = null;
      const failed = await window._generateAntagonistBodyBible();      // responder returns junk
      s.antagonistBodyBible = null;
      const retried = await window._generateAntagonistBodyBible();     // must issue a NEW request
      const retry = { failedReturned: failed, retriedOk: !!retried, stored: !!s.antagonistBodyBible };
      // C · OWNERSHIP. The story changes while the request is in flight; the answer belongs to a
      // story nobody is playing, and must not be written onto the new one.
      s.antagonistBodyBible = null;
      const priorStory = s.storyId;
      const inflight = window._generateAntagonistBodyBible();
      s.storyId = 'story-B-' + Math.random().toString(36).slice(2, 7);
      const late = await inflight;
      const ownership = { returned: late, stored: !!s.antagonistBodyBible };
      s.storyId = priorStory;
      bibleProbe = { dedupe, retry, ownership };
    }
    return { threw, bibleProbe, invEvents: (window.__invEvents || []).slice(0, 40),
             cplusCoverage: (window.state && window.state._scene1CPlusCoverage) || null,
      // Eligibility now comes from the STAGE CONTRACT when the seed is authoritative; the old
      // heuristic is kept alongside so the harness can prove they differ where it matters.
      stage: (window._scene1StageContract ? window._scene1StageContract(s) : null),
      heuristicCast: (window._sceneEligibleCast ? window._sceneEligibleCast(s, 1) : null),
      eligible: (window._scene1StageContract
        ? (window._scene1StageContract(s).onStage || []).map(c => c.label)
        : (window._sceneEligibleCast ? window._sceneEligibleCast(s, 1) : null)),
      // Read from production's own A-plot, never from a value the harness supplied.
      genPfCid: (function () { try {
        return (s.aPlot && s.aPlot.antagonistSubject && s.aPlot.antagonistSubject.canonicalId) || null;
      } catch (_) { return null; } })(),
      // Production's OWN encoder, applied to the id production minted — never a copy of the rule.
      genPfEncodedCid: (function () {
        try { const id = ((window.state.aPlot||{}).antagonistSubject||{}).canonicalId;
              return (id && window._relEncodeId) ? window._relEncodeId(id) : null;
        } catch (_) { return null; } })(),
      // WHAT PERSISTED. The scaffold must keep its own fields and NOT the raw portfolio payload:
      // characterPortfolios is consumed and scrubbed, never left on state for a later reader.
      genPfScaffold: (function () {
        try { const sc = s.cgScaffold; if (!sc) return null;
              return { keys: Object.keys(sc), raw: JSON.stringify(sc).indexOf('characterPortfolios') !== -1,
                       hasArcs: Array.isArray(sc.issueArcs) && sc.issueArcs.length > 0 };
        } catch (_) { return null; } })(),
      // The attached compartment, read off the canonical entity the scaffold request named.
      genPfProfile: (function () {
        try { const L = window._relLedger(false); const e = L && L.entities[((window.state.aPlot||{}).antagonistSubject||{}).canonicalId];
              const ap = e && e.authorProfile; if (!ap) return null;
              return { status: ap.status, failureCode: ap.failureCode, n: (ap.cPlusFacets || []).length,
                       label: e.label, origins: [...new Set((ap.cPlusFacets || []).map(f => f.origin))] };
        } catch (_) { return null; } })(),
      // The PUBLISHED guardrails, with the facet ids attachment resolved their category scope to.
      // Without this, "the unselected guardrail did not fire" could mean it was never attached.
      genPfGuards: (function () {
        try { const L = window._relLedger(false); const e = L && L.entities[((window.state.aPlot||{}).antagonistSubject||{}).canonicalId];
              return ((e && e.authorProfile && e.authorProfile.guardrails) || [])
                .map(function (g) { return { why: g.why, facets: (g.facets || []).slice() }; });
        } catch (_) { return null; } })(),
      genPfFacets: ((window.state.aPlot||{}).antagonistSubject||{}).canonicalId
        ? (window._facetsForCharacter({ id: ((window.state.aPlot||{}).antagonistSubject||{}).canonicalId, label: 'Marcus Vale',
             aliases: ['Marcus Vale'] }, s, { sceneNumber: 1 }) || []).map(function (f) {
             return { id: f.facet_id, cat: f.category, truth: f.canonical_truth }; })
        : null,
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
  }, { solo: !!solo, duo: !!duo, pollute: !!pollute, genPortfolio: genPortfolio || null,
       kindnessScene: !!kindnessScene });
  const gateAtFailure = await page.evaluate(() => window.__gateAtFailure).catch(() => null);
  const injectArmed = await page.evaluate(() => window.__injectScaffoldFailure === true).catch(() => null);
  const sbTrace = await page.evaluate(() => window.__sbTrace || null).catch(() => null);
  return { offered: LAST_OFFERED.slice(), planner, author, scaffold, kinds, unknownModel, ambiguous, escaped, unknown, nonModelApi, cplusEditor, fixtureErrors, logs, local, pageEvents,
           srcMutated: _srcMutated, srcParseError: _srcParseError, mutationTargets: _mutationTargets, mutationCounts: _mutationCounts, gateAtFailure, injectArmed, sbTrace, ...res };
  } finally { await ctx.close().catch(() => {}); }
}

console.log(`\n${'═'.repeat(90)}\nCOMMIT B PART 2 — MERGED OPENING PLANNER + SKELETON DELIVERY\n${'═'.repeat(90)}\n`);

for (const [label, hot] of [['HEAVY', false], ['HOTFAST', true]]) {
  const R = await run({ hot, mutate: null });
  const au = R.author[0];
  // ── DELIVERY EVIDENCE, WRITTEN WITH PROVIDER TRANSPORT BLOCKED ────────────────────────
  // Every /api/** call in this suite is intercepted (page.route '**/api/**'), which is why
  // `escaped` is empty. These are the bytes that WOULD have left, saved so the delivered
  // instructions can be read rather than asserted about.
  try {
    const _ev = '/Users/romantsukerman/storybound-app/_nf_capture';
    fs.mkdirSync(_ev, { recursive: true });
    if (au) {
      fs.writeFileSync(_ev + '/' + label + '_OPENING_AUTHOR_system.txt', au.system || '');
      fs.writeFileSync(_ev + '/' + label + '_OPENING_AUTHOR_user.txt', au.user || '');
    }
    if (R.planner && R.planner[0]) {
      fs.writeFileSync(_ev + '/' + label + '_OPENING_PLANNER_user.txt', R.planner[0].user || '');
    }
    fs.writeFileSync(_ev + '/' + label + '_TRANSPORT.json', JSON.stringify({
      escaped: R.escaped, unknown: R.unknown, cplusEditor: R.cplusEditor || [],
      plannerCalls: (R.planner || []).length, authorCalls: (R.author || []).length,
      note: 'all /api/** intercepted; escaped must be empty' }, null, 2));
  } catch (_eDump) {}

  console.log(` ${label}`);
  console.log(`   eligible cast     : ${JSON.stringify(R.eligible)}`);
  console.log(`   planner           : ${R.planner.length} req · model=${R.planner[0] && R.planner[0].model} · re=${R.planner[0] && R.planner[0].reasoning_effort} · max_tokens=${R.planner[0] && R.planner[0].max_tokens}`);
  console.log(`   C+ delivered      : ${JSON.stringify((R.skeleton && R.skeleton.cp || []).map(c=>c.character))}`);
  console.log(`   E+ / fusion       : ${JSON.stringify(R.skeleton && R.skeleton.ep)} / ${JSON.stringify(R.skeleton && R.skeleton.fu)}`);

  t(`${label} 1: exactly one opening-planner request`, R.planner.length === 1, `got ${R.planner.length}`);
  // ROUTE (Roman 2026-09-07): direct Grok — /api/proxy, role OPENING_PLANNER (single-model chain), grok-4.3
  // pinned via preferredModel, effort 'none' (function-matched to the shipped non-reasoning planner), JSON mode.
  t(`${label} 2: direct Grok — /api/proxy, OPENING_PLANNER, grok-4.3, effort none, JSON mode, calculated budget`,
    R.planner[0] && /\/api\/proxy\b/.test(R.planner[0].url) && R.planner[0].role === 'OPENING_PLANNER'
    && R.planner[0].model === 'grok-4.3' && R.planner[0].preferredModel === 'grok-4.3'
    && R.planner[0].reasoningEffort === 'none' && R.planner[0].response_format
    && R.planner[0].response_format.type === 'json_object' && R.planner[0].max_tokens >= 1800,
    JSON.stringify(R.planner[0] && { u:R.planner[0].url, r:R.planner[0].role, m:R.planner[0].model, re:R.planner[0].reasoningEffort, mt:R.planner[0].max_tokens }));
  t(`${label} 2b: planner reply read from the RAW provider envelope (no top-level content)`,
    !!(R.skeleton && R.skeleton.cp && R.skeleton.cp.length),
    'skeleton is empty — the client is reading a response shape mistral-proxy never returns');
  // Not an obligation any more — cardinality follows pressure. This fixture assigns one per
  // candidate, so it still proves NOTHING IS TRUNCATED between planner and normaliser.
  // ── EVERY OFFERED CANDIDATE SURVIVES — NOT THE FULL CAST ──
  // "The whole cast receives C+" stopped being a truthful contract when psychology started
  // requiring scene evidence: a candidate this scene owns nothing about is WITHDRAWN, and
  // asserting they still get a beat would demand psychology be forced onto them.
  // The PC's entry is SYNTHESISED by production for accounting — her beat is pc_opening_fusion's,
  // not a Character+ — so the comparison is over the non-PC entries the planner actually filled.
  t(`${label} 3: every OFFERED candidate survives delivery, none truncated`,
    R.offered && R.offered.length > 0 && R.skeleton && R.skeleton.cp
      && (R.skeleton.cp || []).filter(c => c.character !== 'Lirael').length === R.offered.length
      && R.offered.every(n => (R.skeleton.cp || []).some(c => c.character === n)),
    `offered=${JSON.stringify(R.offered)} cp=${JSON.stringify((R.skeleton && R.skeleton.cp || []).map(c => c.character))}`);
  t(`${label} 4: E+ and fusion survive normalization`,
    // contract v2: on a seeded stage the delivered E+ target is the SEED's name for the object
    // the plan selected by id ("the deep-crimson carpet of braided … spiralgrass underfoot").
    R.skeleton && R.skeleton.ep && /spiralgrass/i.test(String(R.skeleton.ep.target || ''))
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
       // contract v2: the E+ target is the seed's full name; the standalone fusion may name it by a
       // whole-token sub-phrase ("the spiralgrass"), which is exactly the product's own _targetsMatch rule.
       && String(fu.target||'').trim()
       && ((' ' + tnorm(ep && ep.target) + ' ').includes(' ' + tnorm(fu.target) + ' ')
           || (' ' + tnorm(fu.target) + ' ').includes(' ' + tnorm(ep && ep.target) + ' '))),
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
  // UPDATED 2026-10-25 TO THE ACCEPTED E+ DEFINITION. The old assertion demanded the literal
  // "PERSISTENT PHYSICAL ALTERATION or USE-PATTERN", i.e. that a physical alteration be REQUIRED.
  // That requirement was deliberately retired: alteration is now ONE route among several and the
  // planner text says so outright. The physical-alteration requirement is NOT restored here.
  // What this still guarantees is the part that matters and never changed: the beat is REQUIRED,
  // it must show what makes the thing SIGNIFICANT, and it must be PERCEPTIBLE IN THIS SCENE —
  // so E+ can still never be assigned as a bare target + axis with no evidence owed.
  t(`12h2: the planner request requires environment_plus to carry evidence of significance`,
    /"beat" is REQUIRED and is the whole point of the axis/.test(pu)
      && /show WHAT MAKES THE THING SIGNIFICANT on that axis/.test(pu)
      && /A VISIBLE ALTERATION IS NOT REQUIRED/.test(pu)
      && /PERCEPTIBLE IN THIS SCENE/.test(pu),
    'E+ was assigned without owed evidence of significance, or the retired '
      + 'physical-alteration requirement has come back');
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
  // UPDATED 2026-10-25: the shape itself was rewritten when the alteration requirement was
  // retired. It is now "WHAT MAKES IT SIGNIFICANT ON THAT AXIS + HOW THAT IS LEGIBLE IN THIS
  // SCENE". Still a SHAPE with placeholders to replace, which is what this test is for.
  t(`12h5: E+ is stated as a SHAPE, with placeholders to replace rather than prose to copy`,
    /WHAT MAKES IT SIGNIFICANT ON THAT AXIS \+ HOW THAT IS LEGIBLE IN THIS SCENE/.test(pu)
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
      && /my thumb finds the [^\n]{0,80}spiralgrass[^\n]{0,20} where the rite has worn it smooth/.test(sys)   // {TARGET} → the seed's name
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
  ['v2OpeningActor',     'a fully valid ID-based plan with a declared opening actor is ACCEPTED (delivery asserted in PART V)', { alias:false }],
  // corrections 1–3 (2026-09-06), positive arms — the hostile twins are in the rejection table
  ['v2ActorFreeAct',     'correction 1: the declared actor typed a free act — derived from the opening beat, logged, ACCEPTED', { alias:false }],
  ['v2ActorSentinelRoster', 'correction 2: the opening sentinel on the ACTOR\'s roster row is accepted and derived', { alias:false }],
  ['v2SashById',         'correction 3: a seed object absent from the scene text (the sash) is grounded BY ID', { alias:false }],
  ['v2EvidenceDerived',  'tightening: a typed enacts_evidence_id for a single-fact option is derived, not faulted', { alias:false }],
]) {
  const R = await run({ hot: false, mutate });
  const cp = ((R.skeleton && R.skeleton.cp) || []).map(c => c.character);
  const ok = !R.logs.some(l => /SCENE1:ABORT/.test(l)) && R.author.length === 1;
  t(`   "${mutate}" — ${label}`, ok, `authorCalls=${R.author.length} cp=${JSON.stringify(cp)} ` +
    R.logs.filter(l => /INVALID|ABORT/.test(l)).slice(0,1).join(''));
  if (expect.alias) {
    t(`   "${mutate}" — canonical label stored, alias logged`,
      // Against the OFFERED set plus the PC's synthesised entry — the staged cast is no longer the
      // right comparison, because a candidate with no owned evidence is withdrawn and never had a
      // label to canonicalise.
      ok && cp.filter(n => n !== 'Lirael').length === (R.offered || []).length
        && (R.offered || []).every(n => cp.includes(n))
        && R.logs.some(l => /SCENE1:ALIAS/.test(l)),
      `cp=${JSON.stringify(cp)} offered=${JSON.stringify(R.offered)}`);
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
  // contract v2: a seed-owned stage declares environment_element_ids (selection by object_id);
  // a planner-owned stage still declares free-text environment_elements.
  const ENV_KEY = /"environment_element_ids"\s*:/.test(tmpl) ? '"environment_element_ids"' : '"environment_elements"';
  t(`   dispatched JSON TEMPLATE declares opening_spine.environment_elements (or _ids on a seeded stage)`,
    tmpl.indexOf(ENV_KEY) !== -1 && tmpl.indexOf('"opening_setting"') !== -1
      && tmpl.indexOf(ENV_KEY) > tmpl.indexOf('"opening_setting"'),
    `key=${ENV_KEY} inTemplate=${tmpl.indexOf(ENV_KEY) !== -1} templateLen=${tmpl.length}`);
  t(`   the template states the two-element requirement, not just the prose`,
    /at least TWO concrete, distinct physical things|2 or 3 DISTINCT object_ids/.test(tmpl));

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
  t(`   the assignment must cite an opportunity and ONE grounded option — not a facet, a pressure `
    + `and an evidence id it could recombine`,
    /"mode": "<one of THAT person's permitted modes/.test(full)
      && /"option_id": "<EXACTLY one option_id/.test(full)
      && !/"facet_id":/.test(full) && !/"pressure_evidence_ids":/.test(full));
  t(`   the ROSTER block is the physical roster, and says what it governs`,
    /STAGED ROSTER — PHYSICALLY ON STAGE/.test(pu)
      && /it governs staged_characters, every embodied beat, and the opening fusion/.test(pu)
      && /It is not the Character\+ candidate list/.test(pu)
      && !/ELIGIBLE CAST \(/.test(pu),
    (pu.match(/.{0,60}ELIGIBLE CAST.{0,60}/) || ['(renamed)'])[0]);
  // SPLIT 2026-10-25 INTO MULTI-PERSON AND ONE-PERSON. Previously one assertion covered both,
  // and it failed on a STALE applicability string, not on a format problem: Seren's authored
  // condition is now "a chance to be visibly good at someone else's cost" (it used to read
  // "observed by people whose approval she wants"). Updated to the authored text.
  t(`   MULTI-PERSON: the C+ CANDIDATE block is a separate list carrying modes and grounded options`,
    /CHARACTER\+ CANDIDATES \(\d+\)/.test(pu)
      && /PHYSICAL PRESENCE IS NOT THE QUALIFICATION/.test(pu)
      && /modes permitted:/.test(pu) && /GROUNDED OPTIONS —/.test(pu)
      && /option_id: OPT-\d+/.test(pu)
      // The TRUTH still reaches the planner — that break stays closed. What changed is that the
      // condition and its evidence now arrive welded to it inside the option, so they are no
      // longer separately citable fields.
      && /truth \(fixed, not yours to rewrite\): Her compassion is genuine but requires an audience/.test(pu)
      && /applies here because: [^\n]*a chance to be visibly good at someone else's cost/.test(pu)
      && /established by: E\d+/.test(pu)
      && !/cite ONE by its pressure_id/.test(pu),
    (pu.match(/CHARACTER\+ CANDIDATES.{0,200}/) || ['(missing)'])[0]);

  // ── ONE-PERSON C+ OUTPUT, TESTED SEPARATELY (2026-10-25) ───────────────────────────────
  // A one-person opening is a DIFFERENT output shape, not a degraded multi-person one, and it
  // was never asserted on its own. Two properties, both format-agnostic so this cannot pass
  // vacuously if the rendering changes:
  //   1. the declared count in the header equals the number of candidate entries rendered —
  //      a header that says (3) over one entry is the bug this catches;
  //   2. when exactly one candidate is listed, the one-person guidance is present, so the
  //      planner is told to carry the scene by action/place/pressure rather than invent people.
  {
    const _solo = await run({ hot: false, mutate: null, solo: true });
    const _spu = String((_solo.planner[0] || {}).user || '');
    if (!_spu) {
      tSkipped('   ONE-PERSON: candidate header count matches the entries rendered',
        'the solo arm produced no planner request to inspect');
    } else {
      const _declared = Number((/CHARACTER\+ CANDIDATES \((\d+)\)/.exec(_spu) || [, NaN])[1]);
      const _entries = (_spu.match(/truth \(fixed, not yours to rewrite\):/g) || []).length;
      t(`   ONE-PERSON: candidate header count matches the entries rendered`,
        Number.isFinite(_declared) && _declared === _entries,
        `header says ${_declared}, ${_entries} candidate entr${_entries === 1 ? 'y' : 'ies'} rendered`);
      t(`   ONE-PERSON: a single-candidate opening carries the one-person guidance`,
        _entries !== 1 || /If only the narrator is listed, this is a one-person opening/.test(_spu),
        `entries=${_entries}; one-person guidance present=`
          + /If only the narrator is listed, this is a one-person opening/.test(_spu));
    }
  }
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
      && /ENVIRONMENT\+ THING (?:ABOVE )?reveals her/.test(full)   // contract v2: bound to E+ by construction, not by repetition
      && /The fusion has no target or axis of its own: it is E\+'s/.test(full),   // contract v2: derived, not repeated
    (full.match(/.{0,60}pc_opening_fusion.{0,80}/) || ['(none)'])[0]);
  // ── the reconciler's allowlist IS the template's contract ──
  // Parsed from the SAME dispatched text the planner received, so a field added to the schema
  // later cannot silently become unreconciled.
  const declared = await (async () => {
    const c2 = await newCtx();
    try {
      const p2 = await c2.newPage();
      p2.setDefaultTimeout(180000); p2.setDefaultNavigationTimeout(180000);
      await p2.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: mk(false) }));
      await p2.route('**/api/**', r => /\/api\/config\b/.test(r.request().url())
        ? r.fulfill({ status:200, contentType:'application/json', body: configBody() })
        : (/\/api\/geo\b/.test(r.request().url())
            ? r.fulfill({ status:200, contentType:'application/json', body:'{}' })
            : r.abort()));
      await p2.route('**/sb-test.localhost/**', r => r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
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
    MUST_RECONCILE.every(f => f === 'environment_elements'
      ? declared.some(d => /^environment_element/.test(d))   // contract v2: _ids on a seeded stage
      : declared.includes(f)),
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
                      // contemptOverJealousyEvidence (contract v2, 2026-09-05): now the DISCRIMINATING form —
                      // an option whose evidence excludes the fact the act enacts. The fixture throws if the
                      // packet offers no such pair, so the case can never pass by going inert.
                      'readMissing', 'contemptOverJealousyEvidence', 'caringOnContemptFacet',
                      // identical duplicates now COLLAPSE (tested below); a DIFFERENCE still aborts
                      'dupSkeletonDiff', 'stagedBothDiff',
                      // reconciler must not rescue semantics, and must not swallow invented fields
                      'spreadBadCast', 'unknownKey',
                      // the fixed cast may not be edited
                      'stagedAdded', 'stagedOmitted', 'stagedRenamed', 'stagedPresence']) {
  // The cross-option arm needs a multi-fact option, which this packet does not contain. It runs
  // against the DECLARED SYNTHETIC FIXTURE above; every other arm runs against the real packet.
  const _needsMultiFact = (mutate === 'contemptOverJealousyEvidence');
  // THE BASELINE RUNS FIRST, AND ITS RESULT IS REPORTED. An arm that only ever shows a rejection
  // cannot distinguish "the product caught the bad binding" from "the fixture produced something
  // this scene would reject for any reason".
  if (_needsMultiFact) {
    const B = await run({ hot: false, mutate: 'contemptEvidenceBaseline', mutateSrc: FIXTURE_MULTIFACT });
    const _fxLog = (B.logs || []).find(l => /\[FIXTURE:MULTIFACT\]/.test(l)) || '(fixture never fired)';
    if ((B.fixtureErrors || []).length) {
      tBlocked('   cross-option BASELINE: the widened option is cited with a fact it IS established by, and the plan is ACCEPTED', B.fixtureErrors[0]);
    } else {
      t('   cross-option BASELINE: the widened option is cited with a fact it IS established by, and the plan is ACCEPTED',
        B.author.length === 1 && !(B.logs || []).some(l => /SKELETON:INVALID/.test(l)),
        `authorCalls=${B.author.length} invalid=${JSON.stringify((B.logs || []).filter(l => /SKELETON:INVALID/.test(l)).map(l => l.slice(0, 160)))} · ${_fxLog.slice(0, 160)}`);
    }
  }
  const R = await run(_needsMultiFact
    ? { hot: false, mutate, mutateSrc: FIXTURE_MULTIFACT }
    : { hot: false, mutate });
  // A FIXTURE PRECONDITION THAT COULD NOT BE MET IS NOT A PASS. The arm never executed, so it
  // is recorded as BLOCKED and the loop continues to the independent arms after it.
  if ((R.fixtureErrors || []).length) {
    tBlocked(`   "${mutate}" is rejected visibly and no author call is made`, R.fixtureErrors[0]);
    continue;
  }
  // Both failure classes must exit visibly: semantic (SKELETON:INVALID) and unparseable
  // planner output (PLANNER:UNRECOVERABLE). Either way the ABORT must follow.
  const flagged = R.logs.some(l => /SCENE1:SKELETON:INVALID|SCENE1:PLANNER:UNRECOVERABLE|SCENE1:ENVELOPE:FAULT|SCENE1:STAGE:UNRESOLVED|SCENE1:STAGED:INVALID/.test(l))
               && R.logs.some(l => /SCENE1:ABORT/.test(l));
  if (mutate === 'unknown') {
    console.log('   --- diagnostic (mutate=unknown) ---');
    console.log('   threw: ' + R.threw);
    R.logs.filter(l=>/ABORT|INVALID|SKELETON|PAGEERROR/.test(l)).slice(0,6).forEach(l=>console.log('     ' + l.slice(0,170)));
  }
  // ONE PLAN, OR ONE PLAN PLUS THE SANCTIONED REPAIR (harness fix 2026-10-24).
  // `planner.length === 1` predates the gated skeleton-repair pass added 2026-10-19
  // (_skeletonRepairEligible -> "attempting ONE holistic repair", app.js:293917), which issues a
  // SECOND planner call for repair-eligible faults. Production is correct; this expectation was
  // stale. It is NOT loosened to "<= 2": a second call is accepted ONLY when the repair marker
  // is in the log, so an accidental double-plan still fails here.
  const _repairLogged = (R.logs || []).some(l => /SCENE1:SKELETON:REPAIR\] attempting ONE holistic repair/.test(l));
  const _plannerOk = R.planner.length === 1 || (R.planner.length === 2 && _repairLogged);
  t(`   "${mutate}" is rejected visibly and no author call is made`,
    flagged && R.author.length === 0 && _plannerOk,
    `flagged=${flagged} authorCalls=${R.author.length} planner=${R.planner.length} repairLogged=${_repairLogged}` + (R.planner.length === 0 ? ` · NO PLANNER REQUEST — page events: ${JSON.stringify((R.pageEvents || []).slice(0, 6))} · last logs: ${JSON.stringify((R.logs || []).slice(-3).map(l => l.slice(0, 100)))}` : ''));
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
    `author=${J.author.length} planner=${J.planner.length} fatal=${(J.logs.find(l=>/IDENTITY:INVENTED/.test(l))||'').slice(0,140)}\n      LOGS: ${J.logs.slice(-6).join(' || ').slice(0,700)}`);
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
  t('S8 multi-person plan is still ACCEPTED end to end, every OFFERED candidate delivered',
    // Non-PC entries only: the PC's is synthesised for accounting, not planned as a Character+.
    M.author.length === 1 && (M.offered || []).length > 0
      && (M.skeleton && M.skeleton.cp || []).filter(c => c.character !== 'Lirael').length
         === (M.offered || []).length,
    `author=${M.author.length} cp=${(M.skeleton && M.skeleton.cp || []).length} offered=${JSON.stringify(M.offered)}`);

  // A TWO-PERSON ASSIGNMENT stage, with the love interest left off it.
  const D = await run({ hot: false, duo: true, mutate: null });
  const dpu = (D.planner[0] || {}).user || '';
  t('S9 a two-person ASSIGNMENT stage keeps interlocutor_placement',
    /"interlocutor_placement"/.test(dpu) && (D.eligible || []).length === 2
      && D.author.length === 1,
    // ORDERED TRACE ON FAILURE. "author=0 and no fault" is not a diagnosable state: it may be a
    // correct abort with a silent path, or a fatal that bypasses diagnostics entirely. The trace
    // says which, in the order the chain executes.
    `cast=${JSON.stringify(D.eligible)} author=${D.author.length} planner=${D.planner.length}\n`
      + '      trace:\n        ' + (D.logs || [])
          .filter(l => /STAGE|CPLUS|PORTFOLIO|SKELETON|ABORT|PLANNER|FACT-MANIFEST/.test(l))
          .map(l => l.slice(0, 210)).join('\n        '));
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
  // THE FAULT WORDING MOVED ON. 'the angle is empty' predates the per-field faults; the mutation
  // strips behavior + visible_action and production now names exactly that. It rejected
  // correctly in every run (authorCalls=0, three named faults); only the needle was stale.
  ['readMissing',      'a behavior removed entirely',                        'gives no "visible_action"'],
  ['caringOnContemptFacet',
                       'a "cares deeply" read attached to the CONTEMPT facet it inverts',
                                                                             'breaks a guardrail on this character'],
  // The old fault — "none of the evidence it cites establishes it" — is unreachable now: the model
  // cites no evidence, so it cannot cite the wrong evidence. The surviving form of the same defect
  // is a binding the material does not support, and the bridge is where that shows.
  // contract v2 (2026-09-05): the bridge no longer gates; the binding does. The case cites an
  // option whose evidence EXCLUDES the fact the act enacts (Seren: OPT-1/E4 vs enacted E3).
  ['contemptOverJealousyEvidence',
                       'an option cited for a condition the enacted fact does not establish',
                                                                             'which does not establish this option'],
  // corrections 1–3 (2026-09-06), hostile arms
  ['v2WrongActorLiteral', 'correction 1 hostile: a NON-actor claims FROM_OPENING_BEAT',       'claims FROM_OPENING_BEAT but is not the declared opening_actor'],
  ['v2SentinelWrongRow',  'correction 2 hostile: the opening sentinel on somebody else\'s row', 'that sentinel belongs to the opening actor alone'],
  ['v2UnknownObjectId',   'correction 3 hostile: an object id this scene does not contain',    'which this scene does not contain'],
  ['v2TargetNotChosen',   'correction 3 hostile: E+ cites a valid id that was not chosen',    'is not one of the chosen environment_element_ids'],
  // tightening (2026-09-06), hostile arms
  // v2BeatOtherObject IS NOT IN THIS LIST ANY MORE. It asserted a rejection production
  // DELIBERATELY RETIRED on 2026-10-19 (app.js:292232-292264): three versions of the
  // other-head-noun check were wrong in three ways, the third RECORDS the signals and blocks on
  // nothing, and the only structural gate left on the beat is {TARGET}-exactly-once. Its
  // authorCalls=1 was production behaving as designed, not a missed fault. It is tested below
  // against the accepted definition instead, and the retired requirement is NOT restored.
  ['v2NoPlaceholder',     'tightening hostile: the planner named the thing itself, no {TARGET}', 'must contain the literal {TARGET} exactly once'],
  ['v2RealizationsSent',  'tightening hostile: the retired realization channel',             'environment_realizations is no longer part of the contract'],
]) {
  // SAME DECLARED FIXTURE AS THE EARLIER ARM. This loop ran the cross-option case against the
  // real packet, where every option is single-fact, so the mutation was inert: the arm reported
  // a failure whose cause was a missing fixture, not a missing detector.
  const R = await run(mutate === 'contemptOverJealousyEvidence'
    ? { hot: false, mutate, mutateSrc: FIXTURE_MULTIFACT }
    : { hot: false, mutate });
  if ((R.fixtureErrors || []).length) { tBlocked(`   "${mutate}" — ${label}`, R.fixtureErrors[0]); continue; }
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
  const K = await run({ hot: false, mutate: 'caringOnKindnessFacet', kindnessScene: true });
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
  // Real boundaries, not a 7-line window — see cpBlock above.
  const blockOf = n => cpBlock(sys, n);
  const once = (hay, needle) => !!needle && (hay.split(needle).length - 1) === 1;
  t(`   "${mutate}" — …and the ACT and the LENS still reach Grok, once each, beside that truth`,
    recips.length > 0 && recips.every(c => {
      const b = blockOf(c.character);
      const act = 'VISIBLE ACTION — MUST OCCUR: ' + String(c.behavior || c.angle || '');
      return once(b, 'SOURCE TRUTH — DO NOT STATE: ' + String(c.facet_truth || c.psychological_read || ''))
          && once(b, act) && once(sys, act)
          // 2026-09-10 (Codex finding): the lens OPERATION no longer replaces the planner's interpretation. The
          // PC INTERPRETATION line carries pc_interpretation (or the fallback phrase) and the operation has its own line.
          && once(b, 'PC INTERPRETATION — MUST GOVERN THE NARRATION: ' + String(c.pc_interpretation || 'as her attention moves onto it (below)'))
          && once(b, 'HOW HER ATTENTION MOVES ONTO IT (lens operation): ' + String(c.pc_lens_operation || ''));
    }),
    JSON.stringify(recips.map(c => [c.character, (blockOf(c.character).match(/(SOURCE TRUTH|VISIBLE ACTION|PC INTERPRETATION)/g) || [])])));
}
// THE GUARD IS NOT GONE — BUT ITS POPULATION HAS MOVED (2026-08-29).
// This asserted that an UNSEEDED ordinary candidate has no authored psychology, so a restating
// model-written read is all there is and must be judged. With the generated-cast provider live
// that premise is retired for name-only candidates: the batch buys Seren a portfolio before the
// planner runs, so she IS sourced and the model's sentence is DISCARDED rather than judged — which
// is the stronger outcome this whole line of work exists to produce.
//
// The guard's live population is now a candidate the batch will never buy: a ROLE PHRASE. Nobody
// authors psychology for "the harbour watchman", and a relationship label must never manufacture
// any, so the model's sentence is again all there is — and is judged.
{
  const R = await run({ hot: false, duo: true, mutate: 'readVoiceDrops' });
  const invalid = R.logs.filter(l => /SKELETON:INVALID/.test(l)).join(' | ');
  t('   UNSEEDED: the candidate is now SOURCED by the batch, so the model\'s restating read is ' +
    'DISCARDED rather than judged — the record\'s truth is what travels',
    (() => {
      // The scene SHIPS (the read is not a fault any more), and what reaches Grok is the RECORD's
      // truth — the batch's canonical_truth — not the model's restatement.
      if (R.author.length !== 1) return false;
      const sys = R.author[0].system || '';
      const cp = (R.skeleton && R.skeleton.cp) || [];
      const seren = cp.filter(c => /Seren/i.test(String(c.character || '')))[0];
      if (!seren || !seren.facet_id) return false;                 // she must be SOURCED
      const truths = (sys.match(/SOURCE TRUTH — DO NOT STATE: ([^\n]+)/g) || []);
      // her block carries a truth, and it is the record's — the model's read never reaches Grok
      return truths.length >= 1
        && !/character_revelation/.test(sys)
        && (!seren.character_revelation || sys.indexOf(seren.character_revelation) === -1);
    })(),
    `authorCalls=${R.author.length} planner=${R.planner.length} sourced=${JSON.stringify(((R.skeleton && R.skeleton.cp) || [])
      .filter(c => /Seren/i.test(String(c.character || ''))).map(c => ({ ch: c.character, f: !!c.facet_id })))}\n`
      + '      trace:\n        ' + (R.logs || [])
          .filter(l => /STAGE|CPLUS|PORTFOLIO|SKELETON|ABORT|PLANNER|FACT-MANIFEST/.test(l))
          .map(l => l.slice(0, 210)).join('\n        '));
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
    // Only an OFFERED person has a C+ angle to derive an anchor from; a withdrawn one is staged
    // and simply carries no C+-derived beat, which is the whole point of failing C+ closed.
    (R.staged || []).filter(c => c.name !== pcLabel && (R.offered || []).includes(c.name)).length > 0
      && (R.staged || []).filter(c => c.name !== pcLabel && (R.offered || []).includes(c.name)).every(c => {
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
  // Counted over the bullet's REAL block (see cpBlock above), not a 5-line window: Julian's
  // VISIBLE ACTION sits at +13 because SOCIAL PROOF FIRST precedes it on a first depiction.
  // Exactly one bullet IN THE CHARACTER+ SECTION that OWNS a VISIBLE ACTION, over that
  // bullet's real block (see cpBlock above). Julian's action sits at +13 because SOCIAL PROOF
  // FIRST precedes it on a first depiction; a 5-line window reported it as missing.
  const cpBlocks = n => {
    const bullets = cpBulletCount(sys, n);
    if (bullets !== 1) return bullets;          // 0 = withdrawn · >1 = a real duplicate
    return /VISIBLE ACTION — MUST OCCUR: \S/.test(cpBlockLines(sys, n).slice(1).join('\n')) ? 1 : 0;
  };
  t(`${label} U9: every OFFERED non-PC character gets exactly one independent C+ line, and a ` +
    `withdrawn one gets none`,
    (R.offered || []).length > 0
      && (R.offered || []).every(n => cpBlocks(n) === 1)
      && nonPc.filter(n => !(R.offered || []).includes(n)).every(n => cpBlocks(n) === 0),
    JSON.stringify({ offered: R.offered, counts: nonPc.map(n => [n, cpBlocks(n)]) }));
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

// ══════════════════════════════════════════════════════════════════════════════════════════
// PART X — ONE UNINTERRUPTED CHAIN: GENERATED PORTFOLIO → PLANNER CHOICES → ONE TRUTH TO GROK
//
// Marcus Vale is not in the seed, so the generated_cast provider is his ONLY psychological
// source. Nothing here is asserted against a helper: the facets are read back through
// _facetsForCharacter, the choices are read out of the dispatched planner request, and the
// selected material is read out of the bytes handed to the author.
// ══════════════════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(90)}\nPART X — THE GENERATED PORTFOLIO, END TO END\n${'═'.repeat(90)}\n`);
{
  const G = await run({ hot: false, mutate: null, genPortfolio: true });
  const pu = (G.planner[0] || {}).user || '';
  const asys = (G.author[0] || {}).system || '';
  const aall = asys + '\n' + ((G.author[0] || {}).user || '');
  const facets = G.genPfFacets || [];
  console.log(`   provider facets   : ${JSON.stringify(facets.map(f => f.cat))}`);
  console.log(`   C+ delivered      : ${JSON.stringify((G.skeleton && G.skeleton.cp || []).map(c => c.character))}`);

  // ── THE SEAM THIS PART EXISTS FOR ──
  // Nothing was staged by hand: no aPlot, no canonical entity, no attachment. The A-plot response
  // declared a PERSON; production normalised it, minted the identity, put the ref on the scaffold
  // request, and attached what the scaffold RESPONSE carried.
  const sc = G.scaffold[0] || null;
  const prof = G.genPfProfile || null;
  t('X0a: exactly one scaffold, one Scene-1 planner and one author request',
    G.scaffold.length === 1 && G.planner.length === 1 && G.author.length === 1,
    `scaffold=${G.scaffold.length} planner=${G.planner.length} author=${G.author.length}`);
  t('X0b: the dispatched scaffold request carried a backend-owned subject_ref for a person ' +
    'production minted itself',
    !!sc && !!sc.subject_ref && /:primary_antagonist$/.test(sc.subject_ref)
      && /PORTFOLIO SUBJECTS/.test(sc.system + '\n' + sc.user),
    JSON.stringify(sc && sc.subject_ref));
  t('X0c: the portfolio was parsed, validated and ATTACHED from that response — status ready, ' +
    'five facets, origin generated_cast',
    !!prof && prof.status === 'ready' && prof.n === 5 && prof.label === 'Marcus Vale'
      && JSON.stringify(prof.origins) === '["generated_cast"]',
    JSON.stringify(prof));
  // One ref, three places: the request that asked, the entity that holds the portfolio, and the
  // stem every derived facet id is built on. All five ids share ONE stem, so no facet can have
  // been minted against a different subject.
  // Not "they share A stem" — the stem must BE the requested identity, encoded by production's
  // own encoder. Five ids derived from the same WRONG person share a stem too.
  const _expectPrefix = G.genPfEncodedCid ? `gen:${G.genPfEncodedCid}:v1:` : null;
  t('X0d: the SAME canonical ref travels request → attached entity → every derived facet id',
    !!sc && sc.subject_ref === G.genPfCid && !!_expectPrefix
      && (G.genPfFacets || []).length === 5
      && (G.genPfFacets || []).every(f => f.id === _expectPrefix + f.cat),
    JSON.stringify({ req: sc && sc.subject_ref, entity: G.genPfCid, expect: _expectPrefix,
                     ids: (G.genPfFacets || []).map(f => f.id).slice(0, 1) }));
  t('X0e: the PERSISTED scaffold keeps its own fields and NO raw characterPortfolios — the ' +
    'payload is consumed and scrubbed, never left on state for a later reader',
    !!G.genPfScaffold && G.genPfScaffold.raw === false && G.genPfScaffold.hasArcs === true
      && G.genPfScaffold.keys.indexOf('characterPortfolios') === -1,
    JSON.stringify(G.genPfScaffold));

  t('X1: the generated portfolio is SELECTABLE — five facets on the canonical entity, five categories',
    facets.length === 5 && new Set(facets.map(f => f.cat)).size === 5,
    JSON.stringify(facets.map(f => f.cat)));
  // The offer is GROUNDED OPTIONS now. Only conditions this scene proves are offered, so "all
  // five facets appear" is deliberately no longer the contract — an ungrounded facet is exactly
  // what must not be offered. What must hold is that every OPTION is backend-composed and that no
  // separable evidence field survives for the model to fill.
  t('X2: the PLANNER request offers backend-composed OPTIONS, and no separable evidence field',
    /option_id: OPT-\d+/.test(pu) && !/pressure_evidence_ids/.test(pu),
    JSON.stringify({ options: (pu.match(/option_id: OPT-\d+/g) || []).length,
                     separableEvidence: /pressure_evidence_ids/.test(pu) }));
  // Five STORED facets is a provider-level invariant; five CURRENTLY APPLICABLE ones is not, and
  // delivery must not pretend otherwise. What must be legible is every truth actually offered.
  t('X3: …and every OFFERED canonical truth is legible as a choice',
    facets.length === 5
      && facets.filter(f => pu.includes(f.truth)).length > 0
      && (pu.match(/truth \(fixed, not yours to rewrite\):/g) || []).length
         === facets.filter(f => pu.includes(f.truth)).length,
    JSON.stringify({ stored: facets.length,
                     offered: facets.filter(f => pu.includes(f.truth)).map(f => f.cat),
                     optionBlocks: (pu.match(/truth \(fixed, not yours to rewrite\):/g) || []).length }));

  const cp = (G.skeleton && G.skeleton.cp) || [];
  const chosen = cp.filter(c => /Marcus Vale/i.test(String(c.character || '')))[0] || null;
  t('X4: the planner selects exactly ONE of his facets, by id',
    !!chosen && !!chosen.facet_id && facets.some(f => f.id === chosen.facet_id),
    JSON.stringify(chosen && { character: chosen.character, facet_id: chosen.facet_id }));

  const selected = chosen ? facets.filter(f => f.id === chosen.facet_id)[0] : null;
  const others   = chosen ? facets.filter(f => f.id !== chosen.facet_id) : [];
  // His block only — so "present" cannot be satisfied by another character's rendering.
  const blk = (asys.match(/^  • Marcus Vale[\s\S]*?(?=\n  • |\n  RECONSTRUCT)/m) || [''])[0];
  console.log(`   author block      : ${JSON.stringify(blk.slice(0, 200))}`);

  t('X5: the AUTHOR receives the backend-resolved SOURCE TRUTH — the selected one, exactly once',
    !!selected && (asys.split(selected.truth).length - 1) === 1
      && blk.includes('SOURCE TRUTH — DO NOT STATE: ' + selected.truth),
    JSON.stringify(selected && selected.truth.slice(0, 70)));
  // THE VALUES, NOT THE HEADERS. Counting a label proves the template rendered; it does not
  // prove the selected material travelled. Every one of these must be non-empty and appear
  // verbatim, exactly once, inside HIS block.
  const once = (hay, needle) => !!needle && String(needle).trim().length > 0
    && (hay.split(String(needle)).length - 1) === 1;
  const _act = chosen && String(chosen.behavior || '').trim();
  const _op  = chosen && String(chosen.pc_lens_operation || '').trim();
  const _eff = chosen && String(chosen.pc_effect || '').trim();
  t('X6: …and beside it the selected VISIBLE ACTION and PC INTERPRETATION — the VALUES, ' +
    'non-empty and once each',
    !!chosen && once(blk, 'VISIBLE ACTION — MUST OCCUR: ' + _act)
      && once(blk, 'HOW HER ATTENTION MOVES ONTO IT (lens operation): ' + _op)   // 2026-09-10: the operation has its own line; the interpretation line is the planner's sentence
      && once(blk, 'PC INTERPRETATION — MUST GOVERN THE NARRATION: ' + (chosen && String(chosen.pc_interpretation || 'as her attention moves onto it (below)').trim()))
      && once(blk, '; here: ' + _eff),
    JSON.stringify({ act: _act, op: _op, eff: _eff && _eff.slice(0, 50) }));
  const _pr = chosen && String(chosen.facet_pressure || '').trim();
  t('X7: the applicability condition is PRESENT and travels as OUR wording, once, as the reason ' +
    'the truth applies here',
    !!chosen && !!_pr && once(blk, '(it applies here because: ' + _pr + ')'),
    JSON.stringify({ pressure: _pr, inBlock: !!_pr && blk.includes(_pr) }));
  t('X8: the OTHER FOUR canonical truths reach Grok nowhere',
    others.length === 4 && others.every(f => !aall.includes(f.truth)),
    JSON.stringify(others.filter(f => aall.includes(f.truth)).map(f => f.cat)));
  t('X9: no facet id reaches Grok',
    facets.length === 5 && facets.every(f => !aall.includes(f.id)),
    JSON.stringify(facets.filter(f => aall.includes(f.id)).map(f => f.id)));
  t('X10: no evidence machinery, guardrail bookkeeping or raw portfolio JSON reaches Grok',
    !/evidence_requires|evidence_words|applicability_conditions|characterPortfolios|forbidden_restatements|misreading_guardrails|pressure_id|subject_ref|unique_prediction|not_explained_by|identity_signature|"dimension"/.test(aall),
    (aall.match(/evidence_requires|evidence_words|applicability_conditions|characterPortfolios|forbidden_restatements|misreading_guardrails|pressure_id|subject_ref|unique_prediction|not_explained_by|identity_signature|"dimension"/g) || []).slice(0, 3).join(','));

  // ── THE SCOPED GUARDRAIL, ON A GENERATED PORTFOLIO ──
  // Both patterns match the same behavior string, so scope is the ONLY difference between them.
  // The selected facet's guardrail must fire; one scoped to a facet nobody chose must not.
  const selCat = selected ? selected.cat : null;
  const othCat = others.length ? others[0].cat : null;
  // ── A MISSING GUARD ARM IS A NAMED RESULT, NEVER A NULL ──
  // When the targeted option does not exist the arm cannot run, and returning null let a later
  // assertion dereference it and take the whole suite down at the last case. It says so instead,
  // and the assertions below report "not dispatched" rather than pretending to have measured.
  const NOT_DISPATCHED = { notDispatched: true, reason: 'targeted option not offered in this scene',
    author: [], planner: [], logs: [], unknownModel: [], ambiguous: [], escaped: [], kinds: {},
    skeleton: null, genPfGuards: [] };
  const GG = selCat && othCat ? await run({ hot: false, mutate: null, genPortfolio: { guards: [
      // Scoped by SLOT — the only facet vocabulary the model is given. The backend resolves the
      // slot to its derived category and then to facet ids.
      { forbid: "checks the youth's hands", facets: [SLOT_FOR_CATEGORY(selCat)], why: 'GUARD-ON-SELECTED-FACET' },
      { forbid: 'before the words',         facets: [SLOT_FOR_CATEGORY(othCat)], why: 'GUARD-ON-UNSELECTED-FACET' },
    ] } }) : NOT_DISPATCHED;
  const invalid = GG ? GG.logs.filter(l => /SKELETON:INVALID/.test(l)).join(' | ') : '';
  t('X11a: the guardrail arm targets an option this scene actually offers — otherwise the two ' +
    'assertions below would pass by never running',
    !GG.notDispatched, GG.reason || 'dispatched');
  t('X11: a guardrail scoped to the SELECTED facet reaches validation and fires',
    !GG.notDispatched && GG.author.length === 0 && invalid.includes('GUARD-ON-SELECTED-FACET'),
    `scoped to [${selCat}] · authorCalls=${GG && GG.author.length} | ${invalid.slice(0, 200) || '(no INVALID log)'}`);
  const gg = (GG && GG.genPfGuards) || [];
  t('X12: …while a guardrail scoped to a facet nobody selected does not fire',
    !GG.notDispatched && !invalid.includes('GUARD-ON-UNSELECTED-FACET')
      // …and it was PRESENT to fire: both guardrails attached, each scoped to exactly one facet id.
      && gg.length === 2 && gg.every(g => g.facets.length === 1)
      && gg.some(g => g.why === 'GUARD-ON-UNSELECTED-FACET'),
    `scoped to [${othCat}] — published guardrails: ${JSON.stringify(gg)}`);

  // ── EXACT ACCOUNTING, BY NAME ──
  // Every model request an arm issues is either one of the three chain kinds or a named sanctioned
  // kind; anything else was ABORTED and counted as unknownModel. The A-plot generator that starts
  // this chain is counted like everything else — and it fires TWICE (initial generation and the
  // classification pass), which is exactly the kind of fact a generic catch-all used to hide.
  const _n = x => (Array.isArray(x) ? x.length : 0);   // an arm that never reached a stage has no array there
  const acct = a => a && ({ scaffold: _n(a.scaffold), planner: _n(a.planner),
                           author: _n(a.author), ...(a.kinds || {}),
                           unknownApi: _n(a.unknown), nonModelApi: _n(a.nonModelApi),
                           unknownModel: _n(a.unknownModel),
                           ambiguous: _n(a.ambiguous), escaped: _n(a.escaped) });
  // ── THE CENSUS ──
  // Every count below was OBSERVED across repeated runs, not assumed. All but two are identical
  // every time and are PINNED exactly. `pa_liBibleField` and `pa_soundscape` are conditionally
  // gated and genuinely appear in some runs and not others, so they are bounded at 0..1 — a
  // narrow range, not permission for arbitrary multiplicity: a regression firing an auditor a
  // hundred times fails here. No bucket may appear that neither table names.
  //
  // aplotGenerator is 1 and aplotCorrection is 0 BECAUSE THE FIXTURE IS VALID. The earlier
  // "the generator fires twice" was the harness answering with a GENERIC object that has no
  // namedClock and no stakes, forcing production's self-correction pass — a fixture defect
  // reported as a production fact. antagonistBodyBible and woundSwapTest only exist at all
  // once the plot validates with a PERSON antagonist and real wound architecture.
  const PINNED_FULL = {
    scaffold:1, planner:1, author:1,
    aplotGenerator:1, aplotCorrection:0, aplotCompression:1,
    canonicalizer:2, rplot:1, subplots:1, characterSheet:6,
    // ONE, now that the fixture returns a bible production keeps. The earlier 3 was the harness
    // answering with an object missing signature_feature / softness_seam / any tell: production
    // discarded each one, state stayed empty, and every later call site tried again.
    antagonistBodyBible:1, woundSwapTest:1,
    pa_lineEditor:1, pa_mechanicalFix:2, pa_continuation:2, pa_gravity:1, pa_bannedPhrase:2,
    pa_archetype:1, pa_reparagraph:2, pa_perception:1, pa_perceptionSimile:1,
    pa_calcification:1, pa_voiceAnchor:1,
    pa_preciseEditor:1,
    // pa_memory IS 0 ON THIS ARM, AND THAT IS PRODUCTION BEHAVING CORRECTLY.
    // _extractCharacterDisclosure returns at `var ledger = _charLedger(); if (!ledger) return;`
    // (app.js:32388) before building any request, and a fresh Scene-1 story has no ledger. The
    // want of 1 was stale. Pinned at 0 so an UNEXPECTED extractor call still fails here.
    pa_memory:0,
    // ONE awards lookup, named and pinned (see NON_MODEL_API). Not a model call, cannot spend.
    nonModelApi:1,
    unknownApi:0, unknownModel:0, ambiguous:0, escaped:0 };
  const BOUNDED_FULL = { pa_liBibleField: [0, 1], pa_soundscape: [0, 1] };
  // The guard arm aborts on the guardrail fault BEFORE the author, so no author call, no
  // post-author lane and no subplot pass. Everything upstream of the author is unchanged.
  const EXPECT_GUARD = Object.fromEntries(Object.entries(PINNED_FULL)
    .map(([k, v]) => [k, k.indexOf('pa_') === 0 ? 0 : v]));
  EXPECT_GUARD.author = 0; EXPECT_GUARD.subplots = 0;
  // THE SECOND PLANNER CALL IS THE SANCTIONED SKELETON REPAIR, not an accidental double-plan.
  // The guard arm aborts on a repair-eligible fault, so _skeletonRepairEligible lets production
  // issue ONE more planner request (app.js:293917). EXPECT_GUARD inherited planner:1 from the
  // main arm, which never repairs. It is NOT loosened to "1 or 2": 2 is accepted only when the
  // repair marker is in that arm's own log, so an unexplained second plan still fails.
  const _guardRepairLogged = (a) => ((a && a.logs) || [])
    .some(l => /SCENE1:SKELETON:REPAIR\] attempting ONE holistic repair/.test(l));
  const BOUNDED_GUARD = { pa_liBibleField: [0, 0], pa_soundscape: [0, 0] };
  const census = (a, pinned, bounded) => {
    if (!a) return ['(no arm)'];
    const got = acct(a), bad = [];
    Object.keys(pinned).forEach(k => {
      if ((got[k] || 0) !== pinned[k]) bad.push(`${k}=${got[k] || 0} want ${pinned[k]}`); });
    Object.keys(bounded).forEach(k => { const v = got[k] || 0;
      if (v < bounded[k][0] || v > bounded[k][1]) bad.push(`${k}=${v} outside ${JSON.stringify(bounded[k])}`); });
    // A bucket neither table names is a new kind of traffic, and it fails the census.
    Object.keys(a.kinds).forEach(k => {
      if (!(k in pinned) && !(k in bounded)) bad.push('undeclared:' + k); });
    // NAME THE UNKNOWN REQUEST. "unknownApi=1" said a request existed and nothing about which
    // one, so it could not be classified without another run. The URLs travel with the failure.
    if (bad.some(x => /^unknownApi=/.test(x)) && (a.unknown || []).length) {
      bad.push('unknownApi URLs: ' + JSON.stringify((a.unknown || []).slice(0, 5)));
    }
    return bad;
  };
  console.log(`   accounting main    : ${JSON.stringify(acct(G))}`);
  console.log(`   accounting guard   : ${JSON.stringify(acct(GG))}`);
  t('X13: the main arm matches its exact request census — one A-plot generator, ZERO corrections, ' +
    'one compression, and every other kind pinned',
    census(G, PINNED_FULL, BOUNDED_FULL).length === 0,
    JSON.stringify(census(G, PINNED_FULL, BOUNDED_FULL))
      + '\n      invocation trace: ' + JSON.stringify((G.invEvents || []).filter(x => /subplot|fatal|begin/.test(x)).slice(0, 10)));
  t('X13b: the guard arm matches its own exact census — same chain and setup, no author call, ' +
    'no post-author lane, no subplot pass',
    !GG.notDispatched && census(GG, Object.assign({}, EXPECT_GUARD,
      { planner: _guardRepairLogged(GG) ? 2 : 1 }), BOUNDED_GUARD).length === 0,
    GG.notDispatched ? 'not dispatched: ' + GG.reason
      : JSON.stringify(census(GG, Object.assign({}, EXPECT_GUARD,
          { planner: _guardRepairLogged(GG) ? 2 : 1 }), BOUNDED_GUARD))
        + ` repairLogged=${_guardRepairLogged(GG)}`);
  // ── FAIL AND REFUND (2026-09-07) ──
  // The guard arm aborts Scene 1 on the guardrail fault before the author. That abort is a Scene-1
  // planner fatal, which the begin-story handler now settles by refunding the issue purchase once.
  // The main arm mounts its scene and must never refund.
  t('X13b-refund: the guard arm\'s Scene-1 abort refunds the issue purchase EXACTLY once; the main arm never does',
    !GG.notDispatched && ((GG.local || {})['/api/refund-fortune'] || 0) === 1 && ((G.local || {})['/api/refund-fortune'] || 0) === 0,
    JSON.stringify({ guard: (GG.local || {}), main: (G.local || {}) }));
  // ══════════════════════════════════════════════════════════════════════════════════════
  //  X13d/e — THE GATE'S PLACEMENT, NOT MERELY ITS EXISTENCE
  //
  //  X13b's race was: a fire-and-forget paid pass launched during A-plot generation, released
  //  before the run was decided. The gate fixes that only if it commits LATE ENOUGH. It used to
  //  commit immediately after skeleton validation — and a scaffold-builder failure AFTER that
  //  point still killed the scene with the subplot already released.
  //
  //  These two arms differ by exactly where the commit sits in the served source, with the SAME
  //  injected post-validation failure. If placement did not matter they would agree.
  // ══════════════════════════════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════════════════════
  //  X13d — FIRST, AN EXECUTION WITNESS. NO THROW.
  //
  //  Two injection seams in a row were chosen by reading the source, both were provably in the
  //  served bytes, and neither ever RAN: gateAtFailure stayed null and the scene completed. An
  //  exact source-match count says the line exists, not that it executes. So before injecting
  //  anything that throws, the builder is instrumented to report which path it actually takes.
  // ══════════════════════════════════════════════════════════════════════════════════════
  // SEVEN trace points, SEVEN replacements, each required to match exactly once. The payload
  // carries the invocation sequence and whether _scene1ScaffoldBlock was ALREADY populated when
  // the caller ran — which is what separates a genuine bypass from a cached block being reused.
  const TRACE = (tag) => "try { (window.__sbTrace = window.__sbTrace || []).push({ at: '" + tag +
    "', seq: (window.state && window.state._invocationSeq) || null, " +
    "blockAlreadySet: !!(typeof _scene1ScaffoldBlock !== 'undefined' && _scene1ScaffoldBlock) }); } catch (_) {}";
  const TRACE_NOBLOCK = (tag) => "try { (window.__sbTrace = window.__sbTrace || []).push({ at: '" + tag +
    "', seq: (window.state && window.state._invocationSeq) || null }); } catch (_) {}";

  const POINTS = [
    ['caller:before',
     '    try { _scene1ScaffoldBlock = await _buildScene1Scaffold(_cpScene1Attempt); }',
     '    ' + TRACE('caller:before') + '\n    try { _scene1ScaffoldBlock = await _buildScene1Scaffold(_cpScene1Attempt); }'],
    // NOTE: the trace CANNOT sit between `try {...}` and `catch` — that is a syntax error, and on
    // the first attempt it killed the parse of the whole served file: the page never initialized
    // and the arm timed out. It goes AFTER the catch block closes.
    ['caller:after',
     "      _scene1ScaffoldBlock = '';\n    }\n    if (state && state._scene1SkeletonFatal) {",
     "      _scene1ScaffoldBlock = '';\n    }\n    " + TRACE('caller:after') + "\n    if (state && state._scene1SkeletonFatal) {"],
    ['entry',
     '    async function _buildScene1Scaffold(_cpScaffoldAttempt) {',
     '    async function _buildScene1Scaffold(_cpScaffoldAttempt) {\n      ' + TRACE_NOBLOCK('entry')],
    ['early:scaffoldOff',
     "        if (typeof window !== 'undefined' && window._scene1ScaffoldOff === true) return '';",
     "        if (typeof window !== 'undefined' && window._scene1ScaffoldOff === true) { " + TRACE_NOBLOCK('early:scaffoldOff') + " return ''; }"],
    ['early:cg',
     "        if (_cg) return '';",
     "        if (_cg) { " + TRACE_NOBLOCK('early:cg') + " return ''; }"],
    ['final-return',
     '        return block;\n      } catch (e) {',
     '        ' + TRACE_NOBLOCK('final-return') + '\n        return block;\n      } catch (e) {'],
    ['catch',
     '        // ── AN UNPLANNED ERROR IS NOT A GRACEFUL DEGRADATION',
     '        ' + TRACE_NOBLOCK('catch') + '\n        // ── AN UNPLANNED ERROR IS NOT A GRACEFUL DEGRADATION'],
  ];

  // PRE-FLIGHT: apply the seven replacements to a local copy and PARSE it before spending three
  // minutes on a browser arm. The first attempt spliced a statement between `try {...}` and
  // `catch`; app.js never parsed, the page never initialized, and the only symptom was a 180s
  // timeout that looked like an application defect. A one-second parse names the real cause.
  {
    let _pf = fs.readFileSync('public/app.js', 'utf8');
    const _pfCounts = POINTS.map(([, from]) => _pf.split(from).length - 1);
    POINTS.forEach(([, from, to]) => { _pf = _pf.replace(from, to); });
    let _pfErr = null;
    try { new vm.Script(_pf, { filename: 'preflight-app.js' }); }
    catch (e) { _pfErr = String((e && e.message) || e); }
    t('X13w-0: the seven replacements each match once AND the mutated source still PARSES',
      _pfCounts.every(c => c === 1) && _pfErr === null,
      `counts=${JSON.stringify(_pfCounts)} parseError=${_pfErr}`);
    if (_pfErr || !_pfCounts.every(c => c === 1)) {
      console.log(`   PRE-FLIGHT ABORT — not spending a browser arm on source that cannot run.`);
      console.log(`   counts=${JSON.stringify(_pfCounts)} parseError=${_pfErr}`);
    }
  }

  const XW = await run({ hot: false, mutate: null, mutateSrc: {
    from: POINTS.map(p => p[1]).join('@@AND@@'),
    to:   POINTS.map(p => p[2]).join('@@AND@@') } });
  const badCounts = (XW.mutationCounts || []).map((c, i) => c === 1 ? null : `${POINTS[i][0]}=${c}`).filter(Boolean);
  t('X13w-1: all SEVEN trace points matched exactly once each in the served source',
    (XW.mutationCounts || []).length === 7 && badCounts.length === 0,
    `counts=${JSON.stringify(XW.mutationCounts)} bad=${JSON.stringify(badCounts)}`);
  const tags = (XW.sbTrace || []).map(x => x.at);
  const terminal = tags.filter(x => /^early:|^final-return$|^catch$/.test(x));
  t('X13w-2: ★ the builder took EXACTLY ONE terminal path, and the trace names it',
    terminal.length === 1, `terminal=${JSON.stringify(terminal)} full=${JSON.stringify(XW.sbTrace)}`);
  t('X13w-3: the caller reached the builder, and the block was not already populated',
    tags.indexOf('caller:before') !== -1
      && (XW.sbTrace || []).some(x => x.at === 'caller:before' && x.blockAlreadySet === false),
    `trace=${JSON.stringify(XW.sbTrace)}`);
  console.log(`   scaffold execution witness : ${JSON.stringify(XW.sbTrace)}`);
  console.log(`   terminal path              : ${JSON.stringify(terminal)}`);

  //  X13d/e — THE THROW, RESTORED AT THE SEAM THE WITNESS NAMED.
  //  The trace ships WITH the throw rather than before it. Two earlier attempts injected a
  //  failure, saw the scene complete, and could not tell whether the seam had been skipped or
  //  the throw swallowed. Carrying both in one arm makes the fixture answer that itself.
  const THROW_POINT = ['final-return+throw',
    '        return block;\n      } catch (e) {',
    '        ' + TRACE_NOBLOCK('final-return') +
    "\n        if (window.__injectScaffoldFailure) {" +
    // Snapshot the gate AT the throw. Without this the arm reports gateAtFailure=null and the
    // question "had it committed yet?" gets answered by reasoning about ordering instead of by
    // observation — which is the whole reason this proof exists.
    "\n          try { var _g = _gateFor(window.state._invocationSeq);" +
    "\n               window.__gateAtFailure = _g ? { settled: _g.settled, ok: _g.ok, waiters: _g.waiters.length } : 'no-gate'; }" +
    "\n          catch (_ge) { window.__gateAtFailure = 'unreadable:' + (_ge && _ge.message); }" +
    "\n          " + TRACE_NOBLOCK('inject:throw') +
    "\n          throw new Error('INJECTED post-validation scaffold failure'); }" +
    '\n        return block;\n      } catch (e) {'];
  const D_POINTS = POINTS.map(pt => pt[0] === 'final-return' ? THROW_POINT : pt);

  const EARLY_COMMIT = ['inverse:early-commit',
    '            // Validation passed — but the chain is NOT yet committed. A scaffold builder\n' +
    '            // failure downstream can still kill this scene, and releasing paid passes here\n' +
    '            // meant they spent on a run that then died. The commit is at the author boundary.',
    '            try { if (typeof _settleChainCommit === "function") _settleChainCommit(true, null, window.state); } catch (_) {}'];

  const armOf = async (pts, inject) => {
    let _pf = fs.readFileSync('public/app.js', 'utf8');
    const counts = pts.map(([, from]) => _pf.split(from).length - 1);
    pts.forEach(([, from, to]) => { _pf = _pf.replace(from, to); });
    let err = null;
    try { new vm.Script(_pf, { filename: 'preflight.js' }); } catch (e) { err = String((e && e.message) || e); }
    if (err || !counts.every(c => c === 1)) return { preflight: { counts, err }, aborted: true };
    const res = await run({ hot: false, mutate: null, injectScaffoldFailure: inject, mutateSrc: {
      from: pts.map(x => x[1]).join('@@AND@@'), to: pts.map(x => x[2]).join('@@AND@@') } });
    return { preflight: { counts, err }, aborted: false, ...res };
  };

  const D = await armOf(D_POINTS, true);
  t('X13d-1: the throwing arm pre-flights clean — every replacement once, source still parses',
    !D.aborted, `counts=${JSON.stringify(D.preflight.counts)} parseError=${D.preflight.err}`);
  t('X13d-1b: the injection switch is ARMED inside the page — the check that would have caught three dead attempts',
    D.injectArmed === true, `injectArmed=${JSON.stringify(D.injectArmed)}`);
  const dTags = (D.sbTrace || []).map(x => x.at);
  t('X13d-2: ★ the injected failure ACTUALLY FIRED — an execution witness, not a source match',
    dTags.indexOf('inject:throw') !== -1, `trace=${JSON.stringify(dTags)}`);
  t('X13d-3: ★ the gate had NOT yet committed when that post-validation failure fired',
    // ASSERT THE CLAIMED STATE, NOT THE ABSENCE OF ONE STRING. The previous form was
    // `!== null && !== 'committed'` — left over from when the snapshot was a string. Once the
    // snapshot became an object it could never equal 'committed', so the second clause was dead
    // and the assertion had decayed into a null check wearing a stronger label.
    D.gateAtFailure?.settled === false && D.gateAtFailure?.ok === null,
    `gateAtFailure=${JSON.stringify(D.gateAtFailure)}`);
  const dA = acct(D) || {};
  // An ABSENT key means zero: the census lists only kinds actually observed, which the guard arm
  // above demonstrates. scaffold/planner are asserted too, so a run that died before the chain
  // started cannot pass this by dispatching nothing.
  // THE ASSERTION NOW MATCHES ITS OWN TITLE. It also required scaffold===1, which this arm
  // cannot produce: the injected failure fires inside the scaffold builder, so the scaffold
  // request never completes and the bucket is 0 (`scaffold=0 planner=1 subplots=0 author=0`).
  // The claim under test — no subplot pass, no author, no paid spend on the dead run — held in
  // every run. The scaffold count is reported beside it rather than gating it.
  t('X13d-4: ★ the real subplot pass never dispatched — zero paid spend on the dead run',
    (dA.subplots || 0) === 0 && (dA.author || 0) === 0,
    `subplots=${dA.subplots || 0} author=${dA.author || 0} · scaffold=${dA.scaffold} planner=${dA.planner} (scaffold 0 is expected: the injected failure fires inside the builder)`);
  console.log(`   D trace   : ${JSON.stringify(D.sbTrace)}`);
  console.log(`   D gate    : ${JSON.stringify(D.gateAtFailure)}  subplots=${dA.subplots || 0}`);

  const E = await armOf(D_POINTS.concat([EARLY_COMMIT]), true);
  const eA0 = acct(E) || {};
  t('X13e-1: the inverse arm pre-flights clean — all EIGHT replacements once, source still parses',
    !E.aborted, `counts=${JSON.stringify(E.preflight.counts)} parseError=${E.preflight.err}`);
  t('X13e-1b: the inverse arm is armed too, and its injected failure fired',
    E.injectArmed === true && (E.sbTrace || []).some(x => x.at === 'inject:throw'),
    `armed=${E.injectArmed} trace=${JSON.stringify((E.sbTrace || []).map(x => x.at))}`);

  t('X13e-2: ★ at the IDENTICAL instant the inverse arm has already committed — the proof reads the gate PLACEMENT, not merely its existence',
    D.gateAtFailure?.settled === false && D.gateAtFailure?.ok === null
      && E.gateAtFailure?.settled === true && E.gateAtFailure?.ok === true,
    `D=${JSON.stringify(D.gateAtFailure)} E=${JSON.stringify(E.gateAtFailure)}`);
  // THIS ARM IS RACY, AND THAT IS THE FINDING — NOT NOISE TO AVERAGE AWAY.
  // Two runs from a byte-identical app.js gave E.subplots = 1 and then 0. The subplot pass is
  // fire-and-forget, so once the commit is moved back to validation the dispatch RACES the abort:
  // sometimes it reaches the wire, sometimes the ownership gate marks the invocation fatal first.
  // An `=== 1` assertion here would be flaky, and an `>= 0` one would be vacuous. The sound claim
  // is over TRIALS: with the commit at the author boundary the spend is impossible (0 every time);
  // moved back, it becomes merely likely-to-be-caught, which is not a guarantee.
  const TRIALS = 3;
  const dRuns = [dA.subplots || 0], eRuns = [eA0.subplots || 0];
  for (let k = 1; k < TRIALS; k++) {
    const d2 = await armOf(D_POINTS, true);
    const e2 = await armOf(D_POINTS.concat([EARLY_COMMIT]), true);
    dRuns.push((acct(d2) || {}).subplots || 0);
    eRuns.push((acct(e2) || {}).subplots || 0);
  }
  t(`X13e-3: ★ across ${TRIALS} trials the commit at the AUTHOR BOUNDARY never released a subplot dispatch`,
    dRuns.every(n => n === 0) && dRuns.length === TRIALS, `D subplots per trial = ${JSON.stringify(dRuns)}`);
  // NOT AN ASSERTION, ON PURPOSE. Across five E arms the early commit released a real subplot
  // dispatch exactly ONCE. That one observation is what proves the placement is load-bearing —
  // but the outcome is a race, so asserting it would make the suite flaky and asserting its
  // negation would be false. It is recorded and reported, not gated on.
  const eReleased = eRuns.filter(n => n >= 1).length;
  console.log(`   E released a dispatch in ${eReleased}/${TRIALS} trials this run (racy; observed 1× across earlier arms)`);
  console.log(`   D subplots/trial : ${JSON.stringify(dRuns)}`);
  console.log(`   E subplots/trial : ${JSON.stringify(eRuns)}`);

  // ══════════════════════════════════════════════════════════════════════════════════════
  //  X14 — A RUNTIME WITNESS FOR THE CANON SEQUENCE
  //  Source-match is not execution. The sequence's call site and the snapshot scoping were both
  //  proven only by reading bytes, which is exactly the standard that failed three times on the
  //  scaffold seam. These arms drive handleBeginStory — the real Scene 1 — and require the
  //  ORDER, the DORMANCY, the byte-identity of the prose, and the verdict's arrival at the real
  //  disclosure commit to be OBSERVED.
  // ══════════════════════════════════════════════════════════════════════════════════════
  const T = (tag, extra) => "try { (window.__sbTrace = window.__sbTrace || []).push({ at: '" + tag +
    "'" + (extra || '') + " }); } catch (_) {}";
  const H = "(function(t){ var h=0,i=0; t=String(t||''); for(;i<t.length;i++){ h=(h*31+t.charCodeAt(i))>>>0; } return t.length+':'+h; })(text)";

  const SEQ_POINTS = [
    // OUTSIDE the __textSnap guard. Placed inside it, this trace only fired when the harness had
    // installed that global — so the FINAL_PROSE point simply never appeared and the ordering
    // assertion failed against a production path that was in fact correct.
    ['final-prose',
     "          try { if (window.__textSnap) { var _dlv = formatStory(text);",
     "          " + T('final-prose', ", hash: " + H) +
     "\n          try { if (window.__textSnap) { var _dlv = formatStory(text);"],
    ['seq:before',
     "                var _seq = await _cpCanonSequence(text, _seqModel,",
     "                " + T('seq:before', ", hash: " + H) +
     "\n                var _seq = await _cpCanonSequence(text, _seqModel,"],
    ['seq:after',
     "          var _pInvLit = null;",
     "          " + T('seq:after', ", hash: " + H +
       ", result: (window.state && window.state._cpCanonSequenceResult) || null") +
     "\n          var _pInvLit = null;"],
    ['mount',
     "          StoryPagination.addPage(formatStory(text), true, undefined,",
     "          " + T('mount', ", hash: " + H) +
     "\n          StoryPagination.addPage(formatStory(text), true, undefined,"],
    // The real disclosure commit — what it was actually handed, and for whom.
    // OBSERVE THE ARGUMENT, NOT A VARIABLE BESIDE IT. Reading _seqRes directly meant deleting the
    // handoff line changed nothing the witness could see: the control stayed green while the
    // verdict no longer travelled. The trace now reports the object production actually passes.
    ['commit',
     "          window._cpCommitScene({ sceneUid: sceneUid, ordinal: sceneNum,",
     "          var _commitArg = { sceneUid: sceneUid, ordinal: sceneNum,"],
    ['commit-call',
     "            delivered: _delivered, appeared: _appeared });",
     "            delivered: _delivered, appeared: _appeared };\n"
     + "          try { (window.__sbTrace = window.__sbTrace || []).push({ at: 'commit',"
     + " handed: _commitArg.semanticStatus === undefined ? '(absent)' : _commitArg.semanticStatus,"
     + " published: _commitArg.published,"
     + " delivered: (_commitArg.delivered || []).map(function (d) { return { cid: d.canonicalId, fid: d.facet_id, v: d.verified }; }) }); } catch (_) {}\n"
     + "          window._cpCommitScene(_commitArg);"],
  ];

  const seqArm = async (extra) => {
    const pts = SEQ_POINTS.concat(extra || []);
    let pf = fs.readFileSync('public/app.js', 'utf8');
    const counts = pts.map(([, from]) => pf.split(from).length - 1);
    pts.forEach(([, from, to]) => { pf = pf.replace(from, to); });
    let err = null;
    try { new vm.Script(pf, { filename: 'seq-preflight.js' }); } catch (e) { err = String((e && e.message) || e); }
    if (err || !counts.every(c => c === 1)) return { preflight: { counts, err }, aborted: true };
    const r = await run({ hot: false, mutate: null, mutateSrc: {
      from: pts.map(x => x[1]).join('@@AND@@'), to: pts.map(x => x[2]).join('@@AND@@') } });
    return { preflight: { counts, err }, aborted: false, ...r };
  };

  const X14 = await seqArm();
  const xt = (X14.sbTrace || []).filter(x => /final-prose|seq:|mount|commit/.test(x.at));
  const idx = tag => xt.findIndex(x => x.at === tag);
  t('X14-1: the witness pre-flights clean — six points, each matching once, source still parses',
    !X14.aborted, `counts=${JSON.stringify(X14.preflight.counts)} err=${X14.preflight.err}`);
  t('X14-2: ★ the sequence EXECUTED in a real Scene 1 — an observation, not a source scan',
    idx('seq:before') !== -1 && idx('seq:after') !== -1,
    `trace=${JSON.stringify(xt.map(x => x.at))}`);
  t('X14-3: ★ …in the required ORDER: FINAL_PROSE → sequence → addPage',
    idx('final-prose') !== -1 && idx('final-prose') < idx('seq:before')
    && idx('seq:before') < idx('seq:after') && idx('seq:after') < idx('mount'),
    JSON.stringify(xt.map(x => x.at)));
  t('X14-4: ★ it ran EXACTLY ONCE',
    xt.filter(x => x.at === 'seq:before').length === 1,
    `count=${xt.filter(x => x.at === 'seq:before').length}`);
  t('X14-5: ★ the prose that mounts is BYTE-IDENTICAL to the prose the sequence received — the pen never moved',
    (() => { const b = xt.find(x => x.at === 'seq:before'), m = xt.find(x => x.at === 'mount');
             return !!b && !!m && b.hash === m.hash; })(),
    `before=${(xt.find(x => x.at === 'seq:before') || {}).hash} mount=${(xt.find(x => x.at === 'mount') || {}).hash}`);
  const seqAcct = acct(X14) || {};
  t('X14-6: ★ dormant mode made ZERO auditor and ZERO repair calls, and nothing escaped',
    (seqAcct.canonAuditor || 0) === 0 && (seqAcct.canonRepair || 0) === 0
    && (seqAcct.unknownApi || 0) === 0 && (seqAcct.escaped || 0) === 0,
    `auditor=${seqAcct.canonAuditor || 0} repair=${seqAcct.canonRepair || 0} unknownApi=${seqAcct.unknownApi} escaped=${seqAcct.escaped} author=${seqAcct.author}`);
  t('X14-7: ★ and the scene still MOUNTED — enforcement off never blocks the reader',
    idx('mount') !== -1, JSON.stringify(xt.map(x => x.at)));
  const commitEv = xt.find(x => x.at === 'commit');
  t('X14-8: ★ the real disclosure commit ran and was HANDED the sequence verdict',
    !!commitEv && commitEv.handed !== undefined,
    `commit=${JSON.stringify(commitEv)}`);
  console.log(`   X14 trace  : ${JSON.stringify(xt.map(x => x.at))}`);
  console.log(`   X14 result : ${JSON.stringify((xt.find(x => x.at === 'seq:after') || {}).result)}`);
  console.log(`   X14 commit : ${JSON.stringify(commitEv)}`);

  // ── NEGATIVE CONTROL A: remove the SERVED call site. The witness must disappear. ──
  // Disable the whole block. Stubbing only the call left the injected trace standing in front of
  // it, so the witness kept firing for code that no longer ran — the control proved nothing.
  // The anchor must include the NEXT line: the continuation seam introduced an identical
  // condition, and a marker matching twice replaces the wrong one. `_seqScene` (Scene 1) vs
  // `_seqSceneC` (continuation) is what separates them.
  const X14A = await seqArm([['kill-call',
    "            if (typeof _cpCanonSequence === 'function' && typeof _cpBuildEstablishedCanon === 'function') {\n              var _seqScene = (state.sceneSkeleton && state.sceneSkeleton._cpSceneNumber != null)",
    "            if (false) {\n              var _seqScene = (state.sceneSkeleton && state.sceneSkeleton._cpSceneNumber != null)"]]);
  const at = (X14A.sbTrace || []).map(x => x.at);
  const aAfter = (X14A.sbTrace || []).find(x => x.at === 'seq:after');
  t('X14-9: ★ removing the served call site kills the EXECUTION witness — the trace stops, and no result is produced',
    !X14A.aborted && at.indexOf('seq:before') === -1 && at.indexOf('mount') !== -1
    && !!aAfter && !aAfter.result,
    `counts=${JSON.stringify(X14A.preflight.counts)} trace=${JSON.stringify(at)} result=${JSON.stringify(aAfter && aAfter.result)}`);

  // ── A TEST-ONLY CONTRADICTION, RAISED INSIDE THE SEQUENCE ITSELF ──
  // The verdict is NOT handed to _cpCommitScene by this test. It is produced where production
  // produces one, and has to travel the whole way on its own.
  const VERDICT = ['verdict',
    "      out.publish = true; out.commit = true; out.semanticStatus = 'unresolved';\n      return out;",
    "      out.publish = true; out.commit = true; out.semanticStatus = 'contradiction';\n"
    + "      out.publishedWithConflict = true;\n      return out;"];
  const X14B = await seqArm([VERDICT]);
  const bCommit = (X14B.sbTrace || []).find(x => x.at === 'commit');
  const bResult = ((X14B.sbTrace || []).find(x => x.at === 'seq:after') || {}).result;
  t('X14-10: ★ a verdict raised INSIDE the sequence reaches the real disclosure commit',
    !X14B.aborted && !!bCommit && bCommit.handed === 'contradiction',
    `counts=${JSON.stringify(X14B.preflight.counts)} commit=${JSON.stringify(bCommit)} result=${JSON.stringify(bResult)}`);

  // ── NEGATIVE CONTROL B: remove the handoff. The same verdict must stop arriving. ──
  const X14C = await seqArm([VERDICT, ['kill-handoff',
    "            semanticStatus: (_seqFits && _seqRes.semanticStatus) || 'unresolved',",
    "            "]]);
  const cCommit = (X14C.sbTrace || []).find(x => x.at === 'commit');
  t('X14-11: ★ removing the verdict handoff makes that SAME contradiction stop arriving at the commit',
    !X14C.aborted && !!cCommit && cCommit.handed !== 'contradiction',
    `counts=${JSON.stringify(X14C.preflight.counts)} commit=${JSON.stringify(cCommit)}`);
  console.log(`   X14 killcall : ${JSON.stringify(at)}`);
  console.log(`   X14 verdict  : ${JSON.stringify(bCommit)}`);
  console.log(`   X14 nohandoff: ${JSON.stringify(cCommit)}`);


  console.log(`   E trace   : ${JSON.stringify(E.sbTrace)}`);
  console.log(`   E gate    : ${JSON.stringify(E.gateAtFailure)}  subplots=${eA0.subplots || 0}`);


  t('X13c: every model request matched EXACTLY ONE signature — none unnamed, none ambiguous, ' +
    'and nothing answered generically',
    G.unknownModel.length === 0 && G.ambiguous.length === 0
      && !GG.notDispatched && GG.unknownModel.length === 0 && GG.ambiguous.length === 0,
    JSON.stringify({ unnamed: [...G.unknownModel, ...GG.unknownModel].slice(0, 3),
                     ambiguous: [...G.ambiguous, ...GG.ambiguous].map(x => x.matched).slice(0, 3) }));
  // ── MUTATION CONTROL ── the production invocation deleted from the SERVED source. Everything
  // else is identical, including the scaffold response. If the chain still delivers a truth, this
  // whole part is evidence about a helper rather than about the call site.
  const MX = await run({ hot: false, mutate: null, genPortfolio: true, mutateSrc: {
    from: '_handleScaffoldPortfolios(parsed, _pfRoster);',
    to:   '/* MUTATION CONTROL: the production invocation is removed */' } });
  const mxSys = (MX.author[0] || {}).system || '';
  t('X14: the mutation target occurs EXACTLY ONCE in the served source and was replaced',
    MX.mutationTargets === 1 && MX.srcMutated === true,
    `targets=${MX.mutationTargets} mutated=${MX.srcMutated}`);
  t('X15: with the production handler invocation REMOVED, the scaffold still runs but NOTHING ' +
    'attaches, no truth reaches Grok, and the planner has nothing to select',
    MX.scaffold.length === 1 && (MX.genPfFacets || []).length === 0
      && (MX.genPfProfile || {}).status !== 'ready'
      && facets.every(f => !mxSys.includes(f.truth)),
    JSON.stringify({ scaffold: MX.scaffold.length, facets: (MX.genPfFacets || []).length,
                     profile: MX.genPfProfile,
                     leaked: facets.filter(f => mxSys.includes(f.truth)).map(f => f.cat) }));
  const mxPu = (MX.planner[0] || {}).user || '';
  const mxCp = ((MX.skeleton && MX.skeleton.cp) || [])
    .filter(c => /Marcus Vale/i.test(String(c.character || '')))[0] || null;
  // With nothing attached he has no facets, therefore no grounded option, therefore no offer —
  // so he is WITHDRAWN rather than handed an assignment with an empty facet_id. That is stronger
  // than the old expectation: previously a candidate with no psychology still received a beat the
  // planner had to invent psychology for, which is the failure this whole provider exists to stop.
  t('X15b: …and the PLANNER was offered nothing — no facet id reaches the request, and he receives ' +
    'NO assignment at all rather than an empty one',
    facets.every(f => !mxPu.includes(f.id)) && !mxCp,
    JSON.stringify({ leakedIds: facets.filter(f => mxPu.includes(f.id)).map(f => f.id),
                     cp: mxCp && { character: mxCp.character, facet_id: mxCp.facet_id || null } }));
  // ── THE CORRECTION BUCKET, EXERCISED ──
  // "aplotCorrection = 0" is only evidence if a correction can be seen when one really happens.
  // This arm withholds the valid plot exactly once: production rejects it, sends the retry with
  // its validation errors, and the classifier must file that as a CORRECTION, not as a second
  // generation. This is the same shape that produced the false "the generator fires twice".
  const CX = await run({ hot: false, mutate: null, genPortfolio: { invalidAplot: true } });
  console.log(`   accounting invalid : ${JSON.stringify(acct(CX))}`);
  t('X17: given an INVALID A-plot, production runs its self-correction pass — and it is counted ' +
    'as a correction, not as a second generator call',
    (CX.kinds.aplotGenerator || 0) === 1 && (CX.kinds.aplotCorrection || 0) === 1
      && (CX.kinds.aplotCompression || 0) === 1
      && CX.unknownModel.length === 0 && CX.ambiguous.length === 0,
    JSON.stringify({ gen: CX.kinds.aplotGenerator, corr: CX.kinds.aplotCorrection,
                     comp: CX.kinds.aplotCompression, unnamed: CX.unknownModel.length }));
  // ── THE CONCURRENCY PROBE ──
  // The body-bible response is held open long enough that any caller entering while the first is
  // still in flight must issue its own request. Production checks only for a COMPLETED bible, so
  // if more than one call site can be reached during that window, this is where it shows.
  // Request #1 is the natural one; #2 serves BOTH concurrent probe callers; #3 is nominated to
  // come back unusable; #4 is the retry; #5 is answered after the story has changed underneath it.
  const HB = await run({ hot: false, mutate: null, genPortfolio: {
    holdBibleMs: 3000, probeConcurrentBible: true, failBibleOn: [3] } });
  const bp = HB.bibleProbe || {};
  console.log(`   body-bible requests : ${HB.kinds.antagonistBodyBible}`);
  console.log(`   body-bible probe    : ${JSON.stringify(bp)}`);
  t('X18: on the Scene-1 path the body bible is requested ONCE even with the response held in ' +
    'flight — the call sites are reached sequentially, and the earlier count of three was the ' +
    'harness answering with an object production discards',
    (HB.kinds.antagonistBodyBible || 0) === 5,
    `total=${HB.kinds.antagonistBodyBible} (want 5: 1 natural + 1 shared by two concurrent ` +
    `callers + 1 discarded + 1 retry + 1 answered after the story changed)`);
  t('X18b: TWO CONCURRENT CALLERS with nothing on state and the response held open issue ONE ' +
    'paid request between them, and both receive the SAME bible',
    !!bp.dedupe && bp.dedupe.resolved === 2 && bp.dedupe.same === true && bp.dedupe.stored === true,
    JSON.stringify(bp.dedupe));
  t('X18c: a FAILED attempt is retryable — the in-flight entry clears when it settles, so the ' +
    'next caller issues a real request instead of joining a promise that already resolved to null',
    !!bp.retry && bp.retry.failedReturned === null && bp.retry.retriedOk === true
      && bp.retry.stored === true, JSON.stringify(bp.retry));
  t('X18d: a bible that arrives AFTER the story changed is discarded, not written onto the new ' +
    'story — ownership is verified before storage',
    !!bp.ownership && bp.ownership.returned === null && bp.ownership.stored === false,
    JSON.stringify(bp.ownership));

  // ── AND BOTH NEW GUARDS ARE MUTATION-CONTROLLED ──
  // A guard asserted but never shown to bite is the exact shape this review has been catching.
  // Each is deleted from the SERVED source in its own arm; the corresponding claim must go red.
  const bibleProbeArm = { holdBibleMs: 3000, probeConcurrentBible: true, failBibleOn: [3] };
  // The targets live in the ONE shared body-bible helper all three generators route through, so
  // deleting either exercises the guard the antagonist path actually depends on. (These markers
  // moved when the antagonist's bespoke copy was folded into that helper — and the uniqueness
  // assertion below is what caught the stale ones rather than letting them pass silently.)
  const MB1 = await run({ hot: false, mutate: null, genPortfolio: bibleProbeArm, mutateSrc: {
    from: 'if (cur && cur.key === key) {', to: 'if (false) {' } });
  t('X18e: with the in-flight JOIN removed, the two concurrent callers issue a SECOND paid ' +
    'request — so X18b is evidence about that guard, not about the response being fast',
    MB1.mutationTargets === 1 && (MB1.kinds.antagonistBodyBible || 0) > 5,
    `targets=${MB1.mutationTargets} requests=${MB1.kinds.antagonistBodyBible} (unmutated is 5)`);
  const MB2 = await run({ hot: false, mutate: null, genPortfolio: bibleProbeArm, mutateSrc: {
    from: 'if (!keyAtRequest || keyAtRequest === currentKey) return true;', to: 'if (true) return true;' } });
  t('X18f: with the OWNERSHIP check removed, the late bible IS written onto the story that ' +
    'replaced it — so X18d is evidence about that guard',
    MB2.mutationTargets === 1 && !!MB2.bibleProbe && MB2.bibleProbe.ownership.stored === true,
    `targets=${MB2.mutationTargets} ownership=${JSON.stringify(MB2.bibleProbe && MB2.bibleProbe.ownership && { stored: MB2.bibleProbe.ownership.stored })}`);
  console.log(`   accounting mutant  : ${JSON.stringify(acct(MX))}`);
  t('X16: the mutant arm matches the SAME exact census — the difference is the deleted call ' +
    'site, not the traffic that reaches it',
    census(MX, PINNED_FULL, BOUNDED_FULL).length === 0,
    JSON.stringify(census(MX, PINNED_FULL, BOUNDED_FULL)));
  console.log('');
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// PART V — CONTRACT v2, POSITIVE: A VALID ID-BASED PLAN DELIVERS OPENING C+, E+ AND FUSION
// (review control 2, 2026-09-05). Not "invalid plans are dropped" — the other direction: every
// v2 field exercised at once, and the result read from the COMMIT and the AUTHOR DIRECTIVE.
// ══════════════════════════════════════════════════════════════════════════════════════════
// ── THE RETIRED OTHER-OBJECT BAN, TESTED AT THE ACCEPTED DEFINITION (2026-10-25) ──────────
// What BLOCKS: a reference that resolves, and {TARGET} exactly once. What does NOT block: the
// beat naming a second object. The arm below used to assert a rejection; it now asserts the
// shipped behaviour, so a RE-INTRODUCED ban would fail here. The {TARGET} gate is still proven
// red by "v2NoPlaceholder" above, so dropping this one does not drop the gate with it.
{
  const OB = await run({ hot: false, mutate: 'v2BeatOtherObject' });
  const _obLogs = (OB.logs || []).join(' ');
  t('   "v2BeatOtherObject" — an E+ beat naming a SECOND object is ACCEPTED, not rejected (ban retired 2026-10-19)',
    OB.author.length === 1 && !/SKELETON:INVALID/.test(_obLogs) && !/names another object/i.test(_obLogs),
    `authorCalls=${OB.author.length} invalid=${JSON.stringify((OB.logs || []).filter(l => /SKELETON:INVALID/.test(l)).map(l => l.slice(0, 180)))}`);
  t('   …and a second object named first or more often is a DIAGNOSTIC, never a fault',
    !/FUSION:FOCUS/.test(_obLogs) || /NOT rejected/.test(_obLogs),
    JSON.stringify((OB.logs || []).filter(l => /FUSION:FOCUS/.test(l)).map(l => l.slice(0, 180))));
}

console.log(`\n${'═'.repeat(90)}\nPART V — CONTRACT v2 POSITIVE DELIVERY (valid ID-based plan, declared opening actor)\n${'═'.repeat(90)}\n`);
{
  const R = await run({ hot: false, mutate: 'v2OpeningActor' });
  const au = R.author[0]; const sys = au ? au.system : '';
  const sk = R.skeleton || {}; const ep = sk.ep || null; const pof = sk.pof || null; const cp = sk.cp || [];
  const OB = 'Seren names her offering aloud before the wish — her earliest memory — and begins the invocation exactly as rehearsed';
  const seren = cp.find(c => c.character === 'Seren') || null;
  const dropped = R.logs.some(l => /ASSIGNMENTS:DROPPED|CPLUS:DROPPED/.test(l));
  t('V1: the plan is ACCEPTED — author called once, nothing dropped, no abort',
    R.author.length === 1 && !dropped && !R.logs.some(l => /SCENE1:ABORT|SKELETON:INVALID/.test(l)),
    `author=${R.author.length} dropped=${dropped} ` + R.logs.filter(l => /INVALID|ABORT|DROPPED/.test(l)).slice(0, 1).join('').slice(0, 200));
  t('V2: Seren\'s COMMITTED C+ act IS the opening beat, marked as derived (one source)',
    !!seren && seren.behavior === OB && seren._derived_from_opening === true,
    JSON.stringify(seren && { behavior: String(seren.behavior || '').slice(0, 80), derived: seren._derived_from_opening }));
  t('V3: the AUTHOR DIRECTIVE renders that derived act as her VISIBLE ACTION, exactly once',
    count(sys, 'VISIBLE ACTION — MUST OCCUR: ' + OB) === 1,
    `count=${count(sys, 'VISIBLE ACTION — MUST OCCUR: ' + OB)}`);
  t('V4: her staged anchor is the same beat',
    (R.staged || []).some(c => c && c.name === 'Seren' && String(c.anchor_beat || '').trim() === OB),
    JSON.stringify((R.staged || []).map(c => [c.name, String(c.anchor_beat || '').slice(0, 50)])));
  t('V5: E+ is COMMITTED as the SEED\'s name for the selected object, with its axis, and the beat carries that name (placeholder substituted)',
    !!ep && /spiralgrass/i.test(String(ep.target)) && ep.axis === 'ritual'
      && String(ep.beat || '').includes(ep.target) && !/\{TARGET\}/.test(String(ep.beat || '')),
    JSON.stringify(ep));
  t('V6: the AUTHOR DIRECTIVE renders E+ under the seed name exactly once, and the substituted beat with it',
    !!ep && count(sys, 'ENVIRONMENT+ ASSIGNED THIS SCENE (required): ' + ep.target) === 1 && count(sys, ep.beat) === 1,
    (sys.match(/ENVIRONMENT\+ ASSIGNED THIS SCENE[^\n]{0,160}/) || ['(none)'])[0]);
  t('V5b: the fusion beat carries the seed name too, and no literal placeholder survives anywhere in the author payload',
    !!pof && String(pof.beat || '').includes(ep.target) && !/\{TARGET\}/.test(sys) && !/\{TARGET\}/.test(au ? au.user : ''),
    JSON.stringify(pof && String(pof.beat || '').slice(0, 100)));
  t('V7: the fusion carries E+\'s target and axis BY DERIVATION and reaches the author through them',
    !!pof && !!ep && pof.environment_target === ep.target && pof.environment_axis === ep.axis
      && new RegExp('↳ THROUGH: ' + String(ep.target).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' — the axis of ' + ep.axis).test(sys),
    JSON.stringify(pof && { t: pof.environment_target, a: pof.environment_axis }));
  // The commit strips the planner's selection internals (option_id, bridge, expression_mode, the
  // option's evidence list — app.js ~265217) and keeps the RESOLVED record. What must survive is the
  // fact the act enacts and the facet the record resolved; that E3 establishes the option was proven
  // by validation passing (the binding check would otherwise have rejected the plan — the
  // discriminating case above shows it does).
  t('V8: the committed assignment carries the enacted fact and the RESOLVED facet, with the planner internals stripped',
    !!seren && seren.enacts_evidence_id === 'E3' && !!seren.facet_id
      && !('option_id' in seren) && !('revelation_bridge' in seren),
    JSON.stringify(seren && { e: seren.enacts_evidence_id, facet: seren.facet_id, keys: Object.keys(seren) }));
  t('V9: the planner\'s bridge is logged as diagnostic evidence, not gated',
    R.logs.some(l => /\[SCENE1:CPLUS:BRIDGE\]/.test(l)) || !cp.some(c => c.revelation_bridge),
    R.logs.filter(l => /CPLUS:BRIDGE/.test(l)).slice(0, 1).join('').slice(0, 120));
  // ── corrections 1–3 (2026-09-06): what the positive arms must DELIVER, not merely pass ──
  const OB2 = OB;
  const Ra = await run({ hot: false, mutate: 'v2ActorFreeAct' });
  const serenA = ((Ra.skeleton && Ra.skeleton.cp) || []).find(c => c.character === 'Seren') || null;
  t('V10: correction 1 — the planner\'s free act for the declared actor is DISCARDED and logged; the committed act is the opening beat',
    Ra.author.length === 1 && !!serenA && serenA.behavior === OB2 && serenA._derived_from_opening === true
      && Ra.logs.some(l => /\[SCENE1:CPLUS:OPENING-DERIVED\] "Seren"/.test(l))
      && !(Ra.author[0] && Ra.author[0].system.includes('fingers tremble on the sash as her voice softens')),
    JSON.stringify({ author: Ra.author.length, act: serenA && String(serenA.behavior || '').slice(0, 60), logged: Ra.logs.some(l => /OPENING-DERIVED/.test(l)) }));
  const Rs = await run({ hot: false, mutate: 'v2ActorSentinelRoster' });
  t('V11: correction 2 — the sentinel on the actor\'s row is replaced by the DERIVED anchor (= opening beat), and no sentinel survives',
    Rs.author.length === 1 && (Rs.staged || []).some(c => c && c.name === 'Seren' && String(c.anchor_beat || '').trim() === OB2)
      && (Rs.staged || []).every(c => !/^FROM_/.test(String((c && c.anchor_beat) || ''))),
    JSON.stringify((Rs.staged || []).map(c => [c.name, String(c.anchor_beat || '').slice(0, 40)])));
  const Rd = await run({ hot: false, mutate: 'v2EvidenceDerived' });
  const dohkarD = ((Rd.skeleton && Rd.skeleton.cp) || []).find(c => /Dohkar/.test(c.character)) || null;
  if ((Rd.fixtureErrors || []).length) {
    tBlocked('V13: tightening — a single-fact option DERIVES its enacted fact; a different typed id is replaced and logged', Rd.fixtureErrors[0]);
  } else {
    const _p = V13_PAIR || {};
    t(`V13: tightening — a single-fact option DERIVES its enacted fact; the typed ${_p.typed} is replaced by ${_p.expected} and logged`,
      Rd.author.length === 1 && !!dohkarD && !!_p.expected && dohkarD.enacts_evidence_id === _p.expected
        && Rd.logs.some(l => new RegExp('\\[SCENE1:CPLUS:EVIDENCE-DERIVED\\].*typed enacts_evidence_id ' + _p.typed).test(l)),
      JSON.stringify({ author: Rd.author.length, fixture: _p, committed: dohkarD && dohkarD.enacts_evidence_id,
        logged: (Rd.logs || []).filter(l => /EVIDENCE-DERIVED/.test(l)).map(l => l.slice(0, 160)) }));
  }
  const Rx = await run({ hot: false, mutate: 'v2SashById' });
  const epx = Rx.skeleton && Rx.skeleton.ep;
  t('V12: correction 3 — the sash, absent from the scene text, is committed by id with its SEED name and rendered to the author',
    Rx.author.length === 1 && !!epx && /sash/i.test(String(epx.target)) && Rx.author[0].system.includes('ENVIRONMENT+ ASSIGNED THIS SCENE (required): ' + epx.target),
    JSON.stringify({ author: Rx.author.length, target: epx && epx.target, faults: Rx.logs.filter(l => /INVALID|ABORT/.test(l)).slice(0, 1).join('').slice(0, 160) }));
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// PART W — THE AVAILABILITY VALVE, OPT-IN (review control 4, 2026-09-05)
// With the valve ON, an invalid ASSIGNMENT plan must (a) not abort the scene, (b) log the drop by
// name, (c) leak nothing into the author directive or the commit, (d) blank every anchor sentinel;
// while a ROSTER fault still aborts. With the valve at its shipped default (OFF) the same plan
// aborts as before. Governor refusal is a transport fault and is proven by the probe, not here.
// ══════════════════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(90)}\nPART W — AVAILABILITY VALVE (opt-in): invalid plan continues from the seed stage, nothing leaks\n${'═'.repeat(90)}\n`);
{
  process.env.SB_VALVE = 'on';
  let R, R2;
  try { R = await run({ hot: false, mutate: 'v2OldShape' }); R2 = await run({ hot: false, mutate: 'stagedBothDiff' }); }
  finally { delete process.env.SB_VALVE; }
  const au = R.author[0]; const sys = au ? au.system : '';
  const sk = R.skeleton || {}; const A = R.assignments || null;
  t('W1: valve ON — an old-shape plan is NOT fatal: the author is called once, no abort',
    R.author.length === 1 && !R.logs.some(l => /SCENE1:ABORT/.test(l)), `author=${R.author.length}`);
  t('W2: the drop is LOGGED with the faults, by name',
    R.logs.some(l => /\[SCENE1:ASSIGNMENTS:DROPPED\].*old shape is not accepted/.test(l)),
    R.logs.filter(l => /DROPPED/.test(l)).slice(0, 1).join('').slice(0, 160));
  t('W3: nothing leaks into the AUTHOR DIRECTIVE — no C+, E+, opening-fusion or standalone fusion block',
    count(sys, 'CHARACTER+ ASSIGNED THIS SCENE') === 0 && count(sys, 'ENVIRONMENT+ ASSIGNED THIS SCENE') === 0
      && count(sys, 'PROTAGONIST OPENING BEAT (HARD') === 0 && count(sys, 'FUSION — one sentence') === 0,
    `cp=${count(sys, 'CHARACTER+ ASSIGNED THIS SCENE')} ep=${count(sys, 'ENVIRONMENT+ ASSIGNED THIS SCENE')} pof=${count(sys, 'PROTAGONIST OPENING BEAT (HARD')}`);
  t('W4: nothing leaks into the COMMIT — empty C+, null E+/fusion/pof, dropped flag carrying the reasons',
    !!A && A.dropped === true && Array.isArray(A.character_plus) && A.character_plus.length === 0
      && !A.environment_plus && !A.fusion && !A.pc_opening_fusion && (sk.cp || []).length === 0 && !sk.ep && !sk.pof
      && Array.isArray(A.faults) && A.faults.length > 0,
    JSON.stringify(A && { d: A.dropped, cp: (A.character_plus || []).length, ep: !!A.environment_plus, faults: (A.faults || []).length }));
  t('W5: no staged-anchor sentinel reaches the author',
    (R.staged || []).every(c => !/^FROM_/.test(String((c && c.anchor_beat) || ''))) && !/FROM_CHARACTER_PLUS|FROM_PC_OPENING_FUSION/.test(sys),
    JSON.stringify((R.staged || []).map(c => c.anchor_beat)));
  t('W6: the planner\'s invented environment text does not reach the author either',
    !/dawn breeze|untrampled/.test(sys) && !/dawn breeze|untrampled/.test(au ? au.user : ''),
    ((sys + (au ? au.user : '')).match(/.{0,50}(dawn breeze|untrampled).{0,30}/) || ['(none)'])[0]);
  t('W7: a ROSTER fault still ABORTS with the valve ON — the valve covers assignments only',
    R2.author.length === 0 && R2.logs.some(l => /SCENE1:ABORT/.test(l)),
    `author=${R2.author.length} ` + R2.logs.filter(l => /ABORT|STAGED:INVALID/.test(l)).slice(0, 1).join('').slice(0, 140));
  const R3 = await run({ hot: false, mutate: 'v2OldShape' });
  t('W8: at the SHIPPED default (valve OFF) the same plan ABORTS before the author, named',
    R3.author.length === 0 && R3.logs.some(l => /SCENE1:ABORT/.test(l)) && R3.logs.some(l => /SKELETON:INVALID/.test(l)),
    `author=${R3.author.length}`);
}


console.log(`\n${'─'.repeat(90)}`);
console.log(`  ${pass} passed · ${fail} failed · ${skippedN} skipped · ${blockedN} blocked (not executed)`);
if (blockedN) {
  console.log('\n  BLOCKED TESTS DID NOT RUN. They are not failures of the product and they are');
  console.log('  NOT passes. Each needs a fixture that satisfies its precondition:');
  outcomes.filter((o) => o.status === 'blocked').forEach((o) => console.log('    \u2298 ' + o.n.trim()));
}
if (skippedN) outcomes.filter((o) => o.status === 'skipped')
  .forEach((o) => console.log('    \u2014 skipped: ' + o.n.trim()));
// A BLOCKED REQUIRED TEST FAILS THE RUN. Exiting 0 with unexecuted tests would report a green
// suite that never checked what it claims to check.
const exitCode = (fail || blockedN) ? 1 : 0;
console.log('\n  exit ' + exitCode + (exitCode ? '  (failed or blocked tests present)' : '  (all declared tests executed and passed)') + '\n');
process.exit(exitCode);
