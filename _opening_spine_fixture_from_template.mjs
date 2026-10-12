// ── BUILD AN opening_spine FIXTURE FROM THE TEMPLATE PRODUCTION ACTUALLY DISPATCHED ─────────
// Production derives its allowlist from the declared keys of the "opening_spine" object in the
// request it sent (_openingSpineDeclaredFields, app.js:137819) — never a hand-copy of the
// contract, and the schema has conditional branches (environment_element_ids on a seed-owned
// stage vs environment_elements otherwise). So the only reliable fixture is one derived from the
// captured request.
//
// THIS DOES NOT TOUCH THE PRODUCTION VALIDATOR. It writes a HARNESS fixture whose fields are
// exactly the declared ones, so the real validator passes on its own terms.
import fs from 'fs';

const REQ = process.env.SB_PLANNER_REQ;
const OUT = process.env.SB_FIXTURE_OUT || '_runner_fixtures/opening_spine_literary.json';
if (!REQ) { console.error('set SB_PLANNER_REQ to the captured opening-planner request'); process.exit(2); }

const cap = JSON.parse(fs.readFileSync(REQ, 'utf8'));
const tmplText = (cap.body.messages || []).map((m) => String(m.content || '')).join('\n');

// The same brace-walk production uses: take the declared keys of the opening_spine object.
function declaredFields(s, key) {
  const at = s.indexOf('"' + key + '"');
  if (at === -1) return null;
  const open = s.indexOf('{', at);
  if (open === -1) return null;
  let depth = 0, inStr = false, esc = false, body = '';
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    body += ch;
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) break; }
  }
  const keys = [];
  const re = /"([a-z_0-9]+)"\s*:/gi;
  let m;
  while ((m = re.exec(body)) !== null) keys.push(m[1]);
  return [...new Set(keys)];
}

const spineKeys = declaredFields(tmplText, 'opening_spine') || [];
const hasSkeleton = /"scene_skeleton"/.test(tmplText);
const hasStageContract = /"stage_contract"/.test(tmplText);
console.log('declared opening_spine fields (' + spineKeys.length + '): ' + spineKeys.join(', '));
console.log('scene_skeleton declared : ' + hasSkeleton);
console.log('stage_contract declared : ' + hasStageContract);

// ── VALUES. Deliberately plain and NOT prose: this fixture stands in for a PLAN, and the author
// writes the words. Where the schema wants ids, ids are taken from the request's own lists so the
// semantic validators (which run unchanged) see references they recognise.
function firstMatch(re, fallback) { const m = tmplText.match(re); return m ? m[1] : fallback; }

// Pull the PREFILLED staged_characters array straight out of the template. Any JSON-ish array of
// {name, presence, anchor_beat} objects following the key is accepted verbatim.
function rosterFromTemplate() {
  const at = tmplText.indexOf('"staged_characters"');
  if (at === -1) return [];
  const open = tmplText.indexOf('[', at);
  if (open === -1) return [];
  let depth = 0, out = '';
  for (let i = open; i < tmplText.length; i++) {
    const ch = tmplText[i];
    out += ch;
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) break; }
  }
  const people = [];
  const re = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"presence"\s*:\s*"([^"]+)"\s*,\s*"anchor_beat"\s*:\s*"([^"]+)"\s*\}/g;
  let m;
  while ((m = re.exec(out)) !== null) {
    people.push({ name: m[1], presence: m[2], anchor_beat: m[3] });
  }
  return people;
}
const personId = firstMatch(/person_id["']?\s*[:=]\s*["']([a-z0-9:_]+)/i, null)
  || firstMatch(/\b(pc:self)\b/, 'pc:self');
// The issued object ids are lines like "  O1: the white weeping-willow veil-canopy". Scan the
// WHOLE template rather than a sliced block, so a heading that appears more than once cannot
// move the list out of range.
const objectIds = [...new Set((tmplText.match(/^\s*(O\d+):/gm) || [])
  .map((x) => x.replace(/[^O0-9]/g, '')))].slice(0, 3);
console.log('opening_actor_id -> ' + personId);
console.log('object ids available: ' + (objectIds.length ? objectIds.join(', ') : '(none found)'));

// PLAN-SHAPED, NOT PROSE. This fixture stands in for a PLAN; the author writes the words. The
// values reference First Sacrifice's own situation so the semantic validators (which run
// UNCHANGED) see a coherent opening rather than placeholder text.
const V = {
  pressure_source_type: 'relational',
  pressure_source: 'The presiding Dohkar is weighing how Lirael conducts the rite and will rule on it.',
  hook_object: null,
  opening_actor_id: 'Lirael',   // the STAGED ROSTER lists NAMES, not ids
  visible_action: 'FROM_OPENING_BEAT',
  opening_beat: 'Seren kneels for the rite and Lirael must open it while the assembly watches.',
  rising_beats: ['The wish is spoken in words that bend.', 'The assembly turns toward Lirael.'],
  decision_beat: 'Does she correct the wording aloud, or let the rite stand as spoken?',
  pc_career: 'Sacrificiant',
  opening_setting: 'dawn clearing',
  environment_element_ids: objectIds.slice(0, 2),
  environment_elements: ['the deep-crimson spiralgrass underfoot', 'the white veil-canopy overhead'],
  interlocutor_placement: 'Seren kneels an arm\'s length in front of Lirael, close enough to touch.',
  pc_self_presentation_beat: 'opening — she straightens the officiating sash before she speaks, and '
    + 'knows the assembly is reading her father in how she stands.',
  scene_want: 'She wants to carry Seren through this wish cleanly, in front of the people who '
    + 'measured her father.',
  scene_mission: 'To open and hold the rite in correct order before anyone can call her unfit for it.',
  reader_state: {
    knows: 'A child kneels in a dawn clearing to spend a wish, and Lirael is the one guiding it.',
    believes: 'The rite is routine and Lirael is competent to run it.',
    wondering: 'What the wish will cost, and who will be held responsible.',
    must_not_confuse: 'Lirael is the guide, not the one spending the wish.'
  },
  pc_body_callback: 'opening — signature_feature (the crooked front tooth) as she sets her jaw behind the band.',
  li_body_callback: 'decision — pc_keenly_notices: she catches the still man at the clearing edge not moving when everyone else does.',
  // THE ROSTER IS PREFILLED AND FIXED. The template says so in as many words — "PREFILLED AND
  // FIXED ... there is NOTHING here to fill in. Copy this array" — and ships sentinel anchors
  // (FROM_PC_OPENING_FUSION / FROM_CHARACTER_PLUS) that the engine resolves. My invented anchors
  // were rejected twice. It is now EXTRACTED from the dispatched template, so it is exact by
  // construction rather than by my transcription.
  staged_characters: rosterFromTemplate(),
  // The protagonist's opening act lives in pc_opening_fusion, not here: naming her in
  // opening_actor_id was rejected as "not a person physically present", which is the contract
  // saying this field is for someone OTHER than the PC (or null).
  opening_actor_id: null
};
// Inner keys of reader_state / staged_characters are declared by the brace-walk because it sees
// nested objects. They are supplied BY THEIR PARENT, not as top-level fields.
const NESTED_OWNED = ['knows', 'believes', 'wondering', 'must_not_confuse', 'name', 'presence', 'anchor_beat'];

const spine = {};
spineKeys.forEach((k) => {
  if (NESTED_OWNED.indexOf(k) !== -1) return;
  if (Object.prototype.hasOwnProperty.call(V, k)) spine[k] = V[k];
});
// environment_elements vs environment_element_ids is a CONDITIONAL branch: send only the declared
// one, or the unused sibling becomes an unrecognised field.
if (spineKeys.indexOf('environment_element_ids') !== -1) delete spine.environment_elements;
else delete spine.environment_element_ids;
if (Array.isArray(spine.environment_element_ids) && spine.environment_element_ids.length === 0) {
  console.log('WARNING — the template declares environment_element_ids but no obj: ids were found'
    + ' in the request; sending an empty array will likely fail a semantic check.');
}
const missing = spineKeys.filter((k) => NESTED_OWNED.indexOf(k) === -1
  && !Object.prototype.hasOwnProperty.call(V, k));
if (missing.length) console.log('NOTE — declared but not supplied by this fixture: ' + missing.join(', '));

// scene_skeleton IS A DECLARED SIBLING of opening_spine, and the scaffold builder reads
// environment_plus off it — omitting it threw 'Cannot read properties of null (reading
// "environment_plus")'. Its three declared fields are character_plus, environment_plus and
// pc_opening_fusion; environment_plus.target_object_id must be one of the issued object ids.
// Three further semantic validators spoke, and each is obeyed rather than worked around:
//   · environment_plus.beat must contain the literal {TARGET} EXACTLY ONCE — the record names the
//     thing, the planner does not;
//   · pc_opening_fusion may not be omitted when characters and a target exist;
//   · the roster is NAMES, not ids (STAGED ROSTER: Lirael, Julian, Seren, the presiding Dohkar),
//     so opening_actor_id is a name — 'pc:self' was rejected as not physically present.
const skeleton = hasSkeleton ? {
  character_plus: [],
  environment_plus: {
    target_object_id: objectIds[0] || null,
    beat: 'Lirael sets her bare foot against {TARGET} and feels the braid of it shift under her weight.',
    axis: 'ritual'
  },
  pc_opening_fusion: {
    character: 'Lirael',
    placement: 'PC_FIRST_EMBODIED_BEAT',
    character_angle: 'She steadies herself on the ground the rite is judged on, because her footing is the only part of this she controls.',
    beat: 'Lirael plants both bare feet in {TARGET} before she lifts her hands to open the rite.'
  }
} : null;

const content = skeleton ? { opening_spine: spine, scene_skeleton: skeleton }
  : { opening_spine: spine };
const reply = { model: 'fixture-opening-spine',
  choices: [{ message: { content: JSON.stringify(content) } }],
  usage: { prompt_tokens: 1, completion_tokens: 1 } };
fs.writeFileSync(OUT, JSON.stringify({ body: JSON.stringify(reply) }, null, 2));
console.log('\nwritten: ' + OUT);
console.log('fields supplied: ' + Object.keys(spine).join(', '));
