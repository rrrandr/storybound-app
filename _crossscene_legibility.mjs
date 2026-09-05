// CROSS-SCENE LEGIBILITY AUDIT (Roman 2026-07-25) — the whole-STORY companion to the per-scene
// orientation audit. It reads an entire generated story in order and measures whether a first-time
// reader can TRACK THE PLOT across scenes: is there a central question, does the story materially
// ADVANCE (vs spin — the "every scene is interesting but the story moved 3%" failure), can the reader
// summarize where things stand at each scene boundary, are there cross-scene CONTINUITY errors
// (a fact contradicted later, a silent name/role/location reset — the cross-scene analog of the
// "whose silence?" defect), are threads dropped, and is there cumulative pull to the next issue.
// Diagnosis only — never rewrites or scores prose quality. Runs on an ARCHIVED story json.
//   node _crossscene_legibility.mjs [story.json]

import fs from 'node:fs';

const BASE = 'http://localhost:3000';
const STORY = process.argv[2] || '/tmp/issue_literary.json';

async function grokJSON(sys, usr, { maxTokens = 3200 } = {}) {
  const res = await fetch(BASE + '/api/proxy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-reasoning', temperature: 0.15, max_tokens: maxTokens, convId: 'crossscene-legibility' })
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const data = await res.json();
  let raw = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || (data && data.content) || '';
  raw = String(raw || '').replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try { return JSON.parse(raw); } catch (_) {
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    if (s !== -1 && e !== -1) { try { return JSON.parse(raw.slice(s, e + 1).replace(/,\s*([}\]])/g, '$1')); } catch (_) {} }
    throw new Error('unparseable: ' + raw.slice(0, 200));
  }
}

const stripMeta = (t) => String(t || '')
  .replace(/\[CHARACTERS:[^\]]*\]/gi, '').replace(/\[TITLE:[^\]]*\]/gi, '').replace(/\[SYNOPSIS:[^\]]*\]/gi, '')
  .replace(/\[[A-Z][^\]]*\]/g, '').trim();

const SYS =
  'You are a WHOLE-STORY LEGIBILITY diagnostician for a fiction engine. You do NOT judge prose quality, '
  + 'beauty, or style — assume the sentences are good. You ONLY diagnose whether a FIRST-TIME reader, reading '
  + 'the scenes IN ORDER, can TRACK THE STORY: what it is about, where it stands, and where it is going. Never '
  + 'rewrite prose. Output STRICT JSON ONLY, no fences.\n\n'
  + 'Read all scenes in order, then evaluate:\n'
  + '  central_question (str): the story\'s driving question as a reader would phrase it after scenes 1-2 '
  + '(e.g. "will she free him before the Field takes him?"). central_question_clear (bool): is there ONE?\n'
  + '  per_scene_state[]: for each scene N, {"scene":N, "can_summarize_so_far":bool (could the reader accurately '
  + 'say what has happened up to here?), "trajectory_predictable":bool (can they anticipate where it is heading?), '
  + '"note": one phrase if either is false}.\n'
  + '  progression ("advances"|"spins"|"mixed") + progression_note: does the story MATERIALLY move across the '
  + 'scenes, or do scenes re-tread the same emotional/plot ground without new consequence? Judge SIZE of movement, '
  + 'not prose interest.\n'
  + '  scene_repetition[]: for EACH adjacent pair, {"from":N,"to":N+1,"dramatic_state_changed":bool,"verdict":'
  + '"advances"|"partial_repeat"|"heavy_repeat","note":"what repeats, if any"}. The test (NOT chronology — a scene '
  + 'can deepen a conflict, reverse an expectation, complicate the plan, or reveal new information WITHOUT moving '
  + 'location or jumping ahead): does scene N+1 leave the characters in a MEANINGFULLY DIFFERENT DRAMATIC STATE than '
  + 'scene N? "advances" = clearly different state; "partial_repeat" = some new material but largely re-renders the '
  + 'same movement/setting/confrontation; "heavy_repeat" = essentially re-tells the prior scene (same beat, same '
  + 'ending register). Judge the DRAMATIC MOVEMENT, not whether sentences differ.\n'
  + '  continuity_errors[]: {"where":"scene X or X->Y","issue":"..."} — a fact/name/role/location/relationship '
  + 'state established earlier that is later CONTRADICTED or silently reset. Only real contradictions the reader '
  + 'would notice; do NOT list intentional mystery or not-yet-revealed info.\n'
  + '  dropped_threads[]: a concrete thread/question raised and then neither paid off nor deliberately held.\n'
  + '  relationship_arc_legible (bool) + relationship_arc_note: can the reader track the central relationship '
  + 'state and how it changes across scenes (no unexplained lurches)?\n'
  + '  cumulative_pull (bool) + cumulative_pull_reason: after the last scene, is there a GOOD reason to continue '
  + 'to the next issue (an unresolved question, an imminent consequence, a pending decision)? "nice atmosphere" / '
  + '"curious where it goes" are NOT good reasons.\n'
  + '  goal_matches_intent ("yes"|"no"|"na") + goal_match_note: if an INTENDED A-PLOT GOAL is provided below, does '
  + 'the story a reader actually experiences convey THAT goal? "na" if no goal provided.\n\n'
  + 'JSON schema:\n'
  + '{"central_question":"","central_question_clear":true,"per_scene_state":[{"scene":1,"can_summarize_so_far":true,'
  + '"trajectory_predictable":true,"note":""}],"scene_repetition":[{"from":1,"to":2,"dramatic_state_changed":true,'
  + '"verdict":"advances","note":""}],"continuity_errors":[{"where":"","issue":""}],"dropped_threads":[],'
  + '"progression":"advances","progression_note":"","relationship_arc_legible":true,"relationship_arc_note":"",'
  + '"cumulative_pull":true,"cumulative_pull_reason":"","goal_matches_intent":"na","goal_match_note":""}';

const raw = JSON.parse(fs.readFileSync(STORY, 'utf8'));
const scenes = (raw.scenes || []).filter(s => (s.text || '').length > 80);
const meta = raw.meta || {};
const intendedGoal = (meta.aPlot && (meta.aPlot.goal || meta.aPlot.namedClock)) ? String(meta.aPlot.goal || '') : '';

console.log('CROSS-SCENE LEGIBILITY — story=' + STORY + '  scenes=' + scenes.length
  + '  world=' + (meta.world || '?') + '/' + (meta.worldSubtype || '?') + '  region=' + (raw.meta?.fantasyRegion || 'n/a'));
if (intendedGoal) console.log('  intended A-plot goal: ' + intendedGoal.slice(0, 160));

const body = scenes.map((s, i) => '━━━━━━ SCENE ' + (i + 1) + ' (turn ' + (s.turnCount ?? '?') + ') ━━━━━━\n' + stripMeta(s.text)).join('\n\n');
const usr = (intendedGoal ? ('INTENDED A-PLOT GOAL (engine ground truth — check whether the prose actually conveys it): ' + intendedGoal + '\n\n') : '')
  + 'THE STORY (scenes in order):\n' + body + '\n\nReturn the JSON now.';

let v;
try { v = await grokJSON(SYS, usr); }
catch (e) { console.error('JUDGE ERROR:', e.message); process.exit(1); }

const yn = (b) => b === true ? '✓' : (b === false ? '✗' : String(b));
console.log('\n════════════════ CROSS-SCENE LEGIBILITY REPORT ════════════════');
console.log('central question : ' + yn(v.central_question_clear) + '  "' + (v.central_question || '') + '"');
console.log('progression      : ' + (v.progression || '?').toUpperCase() + '  — ' + (v.progression_note || ''));
console.log('relationship arc : ' + yn(v.relationship_arc_legible) + (v.relationship_arc_note ? '  — ' + v.relationship_arc_note : ''));
console.log('cumulative pull  : ' + yn(v.cumulative_pull) + '  — ' + (v.cumulative_pull_reason || ''));
if (v.goal_matches_intent && v.goal_matches_intent !== 'na') console.log('conveys intent   : ' + v.goal_matches_intent.toUpperCase() + (v.goal_match_note ? '  — ' + v.goal_match_note : ''));

const _rep = v.scene_repetition || [];
const _repHits = _rep.filter(p => p.verdict === 'partial_repeat' || p.verdict === 'heavy_repeat');
const _advanced = _rep.filter(p => p.dramatic_state_changed === true || p.verdict === 'advances');
const _rpct = (n, d) => d ? (100 * n / d).toFixed(0) + '%' : 'n/a';
console.log('\n── SCENE-TO-SCENE REPETITION (the before/after metric — does each scene reach a NEW dramatic state?) ──');
console.log('  pairs that ADVANCE (new dramatic state): ' + _advanced.length + '/' + _rep.length + '  (' + _rpct(_advanced.length, _rep.length) + ')');
console.log('  pairs that REPEAT (partial/heavy)       : ' + _repHits.length + '/' + _rep.length + '  (' + _rpct(_repHits.length, _rep.length) + ')');
for (const p of _rep) {
  console.log('    b' + p.from + '->b' + p.to + ': ' + String(p.verdict || '?').toUpperCase() + (p.note ? '  — ' + p.note : ''));
}

console.log('\n── PER-SCENE STORY-STATE TRACKING (can the reader hold the plot at each boundary?) ──');
for (const p of (v.per_scene_state || [])) {
  console.log('  scene ' + p.scene + ': summarize-so-far ' + yn(p.can_summarize_so_far) + '  · trajectory ' + yn(p.trajectory_predictable) + (p.note ? '  — ' + p.note : ''));
}
if ((v.continuity_errors || []).length) { console.log('\n── CROSS-SCENE CONTINUITY ERRORS ──'); v.continuity_errors.forEach(e => console.log('  ✗ [' + (e.where || '?') + '] ' + (e.issue || ''))); }
else console.log('\n── CROSS-SCENE CONTINUITY ERRORS ──\n  (none found)');
if ((v.dropped_threads || []).length) { console.log('\n── DROPPED THREADS ──'); v.dropped_threads.forEach(t => console.log('  - ' + t)); }

fs.writeFileSync('_crossscene_legibility_out.json', JSON.stringify({ story: STORY, intendedGoal, verdict: v }, null, 2));
console.log('\nfull verdict -> _crossscene_legibility_out.json');
