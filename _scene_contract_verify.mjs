// _scene_contract_verify.mjs — FINAL first-class Scene-Contract spec (Roman 2026-07-31).
// The contract is a RUNTIME OBJECT derived by the Reader Model and consumed across the scene
// lifecycle; after verification it ADVANCES the Reader Model (the serialization engine).
// Adds: (a) two obligation TYPES — knowledge (persists once learned) vs scene (fresh each scene);
// (b) evidence recording — satisfiedBy {dialogue|reaction|observation|narration} + the sentence;
// (c) ReaderModel advancement → Scene 2 derives a DIFFERENT contract (drops learned knowledge).
// Validated on the 12 existing First Sacrifice samples — zero gen spend.
import fs from 'fs';
const J = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/author_ab/consistency_test.json', 'utf8'));
const grab = (t, rx) => { const m = t.match(rx); return m ? m[0].replace(/\s+/g, ' ').trim() : null; };
const near = (a, b, gap = 140) => new RegExp(a + '[\\s\\S]{0,' + gap + '}?' + b, 'i');

// classify HOW the evidence was delivered (change: record satisfiedBy)
function classifyEvidence(span) {
  if (!span) return null;
  if (/[""].*[""]|["].*["]/.test(span) || /\btold|said|asked|whispered\b/i.test(span)) return 'dialogue';
  if (/\b(relaxed|drew back|gasp\w*|stumbl\w*|flinch\w*|eased|tensed|recoil\w*|ripple)\b/i.test(span)) return 'reaction';
  if (/\bI (saw|watched|noticed|felt|caught|let me see)\b/i.test(span)) return 'observation';
  return 'narration';
}

const DET = {
  narrator_role:   t => grab(t, /\bI\b[^.]{0,80}\b(my training|supervis\w*|the reading|read them|assigned|responsible|halt it|my (task|job|duty|charge)|let me see|only my)\b/i),
  ff_function:     t => grab(t, /\b(first )?favored\b[^.]{0,150}\b(are the ones|guide|keep|steady|ensure|called to|trained to|exist to|whose (task|duty|role|work|job)|so that|prevent|hold the|shepherd|preside|watch over|make sure)\b/i) || grab(t, /\b(guide|steady|keep|prevent|shepherd|oversee)\b[^.]{0,80}\b(first )?favored\b/i),
  first_sacrifice: t => grab(t, /\b(first (wish|sacrifice|offering)|coming of age|becomes? an adult|their first|makes? their first|every youth('s)? (first|rite|is taught|was taught)|never to speak lightly)\b/i),
  why_public:      t => grab(t, near('\\b(public|gather\\w*|assembl\\w*|crowd|two dozen|guests|witness\\w*|everyone)\\b', '\\b(because|so that|so the|to witness|must (see|be seen)|all can|so no one|in case|to keep)\\b', 150)),
  julian_matters:  t => grab(t, /\bjulian\b[^.]{0,150}\b(my (former|old|partner|mentor)|used to|once (was|my|had)|the one who|had (loved|left|taught|trained|betrayed|promised)|we (were|had)|his (betrayal|promise)|since he)\b/i) || grab(t, /\b(former|old|my)\b[^.]{0,50}\bjulian\b/i),
  narrator_trait:  t => grab(t, /\bI\b[^.]{0,70}\b(refused to|forced (it|myself)|kept (going|my)|would not|made myself|only because I|could not (stop|let)|did not (reach|look))\b/),
  julian_trait:    t => grab(t, /\bjulian\b[^.]{0,90}\b(watch\w*|observ\w*|stood (still|at)|remain\w*|only to observe|grinding|kept (still|to)|stillness|motionless)\b/i),
  world_rule:      t => grab(t, near('\\b(fate|wish|thread|weave)\\b', '\\b(answer\\w*|grant\\w*|listen\\w*|fill in|take what|price|twist\\w*|literal)\\b', 120)),
  regional_custom: t => grab(t, /"[^"]{0,60}(fate|thread|tide|reef|numbers)[^"]{0,60}"|proverb|the old saying/i),
  ceremony:        t => grab(t, near('\\b(rite|ceremony|sacrifice|clearing|veil)\\b', '\\b(kneel|youth|elder|wish|favored|moss|thread)\\b', 200)),
  incident:        t => grab(t, /\b(twist|wrong|misalign\w*|no longer pointed|drain\w*|emptied|did not return|went (numb|white)|took hold|seized)\b/),
  julian_onpage:   t => grab(t, /\bjulian\b[^.]{0,90}\b(stood|remain\w*|watch\w*|came|observ\w*|grinding|gaze|turn\w*|drag\w*|held|kept)\b/i),
};

// ── Reader Model derives the contract from SEED TRUTHS + current BELIEF state ──
// KNOWLEDGE obligations are skipped once belief says the concept is understood (serialization).
// SCENE obligations are always fresh (they are true only for this scene).
function deriveReaderContract(seed, belief, sceneCtx) {
  const s1 = (sceneCtx.sceneIndex || 0) === 0;
  const K = (concept, id, knowledge, priority, det) => ({ id, type: 'knowledge', concept, knowledge, owner: 'ReaderModel', acceptableEvidence: ['dialogue', 'narration', 'reaction', 'observation'], minimumStrength: 'explicit', priority, detect: DET[det] });
  const S = (id, knowledge, priority, det) => ({ id, type: 'scene', knowledge, owner: 'ReaderModel', acceptableEvidence: ['dialogue', 'narration', 'reaction', 'observation'], minimumStrength: 'implicit', priority, detect: DET[det] });
  const all = [];
  // knowledge obligations — gated on belief (drop when already understood)
  if (seed.narratorIsGuide) all.push(K('NarratorRole', 'narrator_role', 'Reader understands the narrator is the guide responsible for this rite.', 'CRITICAL', 'narrator_role'));
  if (seed.guideSpecies)    all.push(K('FirstFavored', 'ff_function', `Reader understands what ${seed.guideSpecies} do.`, 'CRITICAL', 'ff_function'));
  if (seed.sceneIsRite)     all.push(K('FirstSacrifice', 'first_sacrifice', 'Reader understands the youth is undergoing their First Sacrifice.', 'CRITICAL', 'first_sacrifice'));
  if (seed.riteIsPublic)    all.push(K('PublicRite', 'why_public', 'Reader understands why the ceremony is public.', 'CRITICAL', 'why_public'));
  if (seed.cast && seed.cast.li) all.push(K('WhyLIMatters', 'julian_matters', `Reader understands why ${seed.cast.li} matters.`, 'IMPORTANT', 'julian_matters'));
  // scene obligations — always present, never gated
  const sc = [];
  sc.push(S('narrator_trait', 'Narrator reveals one predictive behavioral trait.', 'IMPORTANT', 'narrator_trait'));
  if (seed.cast && seed.cast.li) sc.push(S('julian_trait', `${seed.cast.li} reveals one predictive behavioral trait.`, 'IMPORTANT', 'julian_trait'));
  if (seed.cast && seed.cast.li) sc.push(S('julian_onpage', `${seed.cast.li} appears on-page.`, 'OPTIONAL', 'julian_onpage'));
  sc.push(S('ceremony', 'The ceremony is staged.', 'OPTIONAL', 'ceremony'));
  sc.push(S('incident', 'The incident lands.', 'OPTIONAL', 'incident'));
  sc.push(S('world_rule', 'One world rule is refreshed.', 'OPTIONAL', 'world_rule'));
  sc.push(S('regional_custom', 'A regional custom surfaces.', 'OPTIONAL', 'regional_custom'));
  // gate knowledge on belief
  const kept = all.filter(o => !(belief[o.concept] && belief[o.concept] === 'understood'));
  return { obligations: [...kept, ...sc], droppedKnowledge: all.filter(o => belief[o.concept] === 'understood').map(o => o.concept) };
}

function verify(prose, contract) {
  return contract.obligations.map(o => {
    const span = o.detect(prose);
    return { id: o.id, type: o.type, concept: o.concept, priority: o.priority, knowledge: o.knowledge, pass: !!span, satisfiedBy: classifyEvidence(span), sentence: span ? span.slice(0, 100) : null };
  });
}
// advance the Reader Model: a PASSED knowledge obligation marks its concept understood
function advanceReaderModel(belief, verdicts) {
  const next = { ...belief };
  verdicts.filter(v => v.type === 'knowledge' && v.pass).forEach(v => { next[v.concept] = 'understood'; });
  return next;
}

// ── RUN on the 12 samples ──
const SEED = { guideSpecies: 'First Favored', narratorIsGuide: true, sceneIsRite: true, riteIsPublic: true, cast: { li: 'Julian', pc: 'Liora' } };
const belief0 = {};
const contract1 = deriveReaderContract(SEED, belief0, { sceneIndex: 0 });
console.log('SCENE-1 CONTRACT (first-class object) — ' + contract1.obligations.length + ' obligations\n');
contract1.obligations.forEach(o => console.log('  [' + o.priority.padEnd(9) + '][' + o.type.padEnd(9) + '] ' + o.knowledge));

const rows = J.map(r => ({ i: r.i, v: verify(String(r.prose || ''), contract1) }));
const critFail = rows.map(r => r.v.filter(v => !v.pass && v.priority === 'CRITICAL').length);
console.log('\nmean CRITICAL failed at stop: ' + (critFail.reduce((a, b) => a + b) / rows.length).toFixed(1) + '/4 · scenes needing regen: ' + critFail.filter(x => x > 0).length + '/12');

// evidence recording — how were the PASSED obligations satisfied? (the priceless dataset)
console.log('\n── evidence recording: HOW passed obligations were satisfied (change #4) ──');
const byType = {};
rows.forEach(r => r.v.filter(v => v.pass).forEach(v => { const k = v.id + ' via ' + v.satisfiedBy; byType[k] = (byType[k] || 0) + 1; }));
Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, n]) => console.log('  ' + String(n).padStart(2) + '×  ' + k));
const ex = rows.find(r => r.i === 8).v.find(v => v.pass && v.satisfiedBy === 'dialogue') || rows.find(r => r.i === 8).v.find(v => v.pass);
console.log('\n  example — obligation "' + ex.id + '" satisfiedBy=' + ex.satisfiedBy + '\n    sentence: "' + ex.sentence + '"');

// ── serialization: simulate a scene 1 that SATISFIED its knowledge, then derive scene 2 ──
console.log('\n── SERIALIZATION ENGINE: Reader Model advances → Scene 2 derives a DIFFERENT contract ──');
const idealS1Verdicts = contract1.obligations.map(o => ({ id: o.id, type: o.type, concept: o.concept, pass: o.type === 'knowledge', priority: o.priority }));
const belief1 = advanceReaderModel(belief0, idealS1Verdicts);
console.log('  Reader belief after a fully-satisfied Scene 1: ' + JSON.stringify(belief1));
const contract2 = deriveReaderContract(SEED, belief1, { sceneIndex: 1 });
console.log('  Scene-2 dropped (already understood): [' + contract2.droppedKnowledge.join(', ') + ']');
console.log('  Scene-2 contract now = ' + contract2.obligations.length + ' obligations (all scene-type + any un-learned knowledge):');
contract2.obligations.forEach(o => console.log('    [' + o.type + '] ' + o.knowledge));
