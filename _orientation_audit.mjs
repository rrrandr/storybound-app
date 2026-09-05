// NARRATIVE ORIENTATION + FORWARD-PULL AUDIT (Roman 2026-07-25) — a Story Quality Observatory
// instrument that DIAGNOSES scene mechanics and NEVER rewrites or scores prose quality.
//
// It answers, per beat, the questions a reader unconsciously asks — WHO acts / WHAT they want /
// WHAT changed / WHY the next beat happened — plus PREDICTION ("can I anticipate the trajectory?")
// and FORWARD PULL ("why would I click Next?"). Ambiguity is judged by the present-vs-future rule:
// obscuring PRESENT info the reader could already resolve = accidental (a defect); withholding FUTURE
// info (the envelope's contents) = intentional (fine). Failures are reported as beat->beat CHAINS so
// we can see whether orientation breaks INSIDE beats or at the TRANSITIONS between them — the empirical
// tell for whether the fix is prose-side or planner-side.
//
// Measurement only. Runs on ARCHIVED scenes. Reuses the app's /api/proxy (dev server on :3000).
//   node _orientation_audit.mjs [corpus.json] [maxScenes]

import fs from 'node:fs';

const BASE = 'http://localhost:3000';
const CORPUS = process.argv[2] || '_contwindow_out/600_r1.json';
const MAX = process.argv[3] ? parseInt(process.argv[3], 10) : 999;
const CONCURRENCY = 3;

async function grokJSON(sys, usr, { maxTokens = 2600 } = {}) {
  const res = await fetch(BASE + '/api/proxy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-reasoning', temperature: 0.15, max_tokens: maxTokens, convId: 'orientation-audit' })
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

const SYS =
  'You are a NARRATIVE ORIENTATION diagnostician for a fiction engine. You do NOT judge prose quality, '
  + 'beauty, voice, or style — IGNORE whether the sentences are well-written; assume they are. You ONLY '
  + 'diagnose whether a reader stays ORIENTED and PULLED FORWARD. Never rewrite prose. Judge as a first-time '
  + 'reader who has been following the story but sees ONLY the prose given (NOT the character list, which is a '
  + 'hint for you). Output STRICT JSON ONLY — no prose, no markdown fences.\n\n'
  + 'Segment the scene into ordered BEATS (a beat = one unit of action/perception/change, usually 1-3 short '
  + 'paragraphs). For EACH beat evaluate:\n'
  + '  who_acts (bool): is the acting/perceiving agent unambiguous?\n'
  + '  goal_clear ("yes"|"no"|"na"): is it clear what that character WANTS right now? Use "na" for a legitimately '
  + 'atmospheric/establishing beat with no actor-goal yet — do NOT penalize atmosphere as "no".\n'
  + '  change_clear (bool): is it clear what CHANGED in this beat (new info, a shift, an action\'s result)? If the '
  + 'beat advances nothing, set false (this is a MOMENTUM flag, not an orientation flag).\n'
  + '  present_info_clear (bool) + present_info_issue (str): does anything obscure PRESENT information the reader '
  + 'ALREADY has enough to resolve — an unclear pronoun referent ("whose silence?"), an unlocatable place, an '
  + 'action with no visible agent? That is ACCIDENTAL disorientation -> false, and name it in present_info_issue. '
  + 'CRUCIAL: withholding FUTURE information (what is in the envelope, who sent the letter, a coming reveal) is '
  + 'INTENTIONAL and FINE -> keep true. Only flag what the reader CANNOT resolve from what is already on the page.\n'
  + '  referent_ok (bool) + referent_note (str): does the beat make a DEFINITE reference — "her little games", "what '
  + 'she had done", "the arrangement", a loaded bare "it" ("I told myself it was only chance") — to a specific thing '
  + 'the reader was NEVER SHOWN or told? That referent-opacity is a defect -> false, and name it. If the antecedent '
  + 'is on the page (even a few lines back), it is fine -> true. This is stricter and more specific than '
  + 'present_info_clear: it targets DEFINITE references to an un-established antecedent.\n'
  + '  prediction_possible (bool): after this beat, can the reader form a concrete expectation of the trajectory '
  + '(what is likely next / what the scene is driving toward)? Not whether they are correct — only whether a '
  + 'prediction is possible. false = "I have no idea what this scene is doing."\n\n'
  + 'For EACH TRANSITION beat i -> beat i+1 evaluate:\n'
  + '  causal_clear (bool): can the reader see WHY beat i+1 follows from beat i?\n'
  + '  agency_continuous (bool): can the reader track who is acting across the seam (no silent POV/actor switch)?\n'
  + '  goal_continuous (bool): does the scene through-line carry across, or does it lurch without reason?\n'
  + '  reason (str): if ANY of the three is false, one sentence on what is missing (e.g. "not shown why she shifts '
  + 'from confronting to retreating").\n\n'
  + 'FORWARD PULL at the scene END:\n'
  + '  scene_end_pull (bool): would a reader click Next? TRUE only if a GOOD reason exists — an unresolved question, '
  + 'an imminent consequence, a pending decision, something about to happen. BAD (=> false): "the writing is nice", '
  + '"curious where this goes", "nice atmosphere".\n'
  + '  scene_end_answer (str): the actual reason (good or bad) in a few words.\n\n'
  + 'JSON schema (return EXACTLY this shape):\n'
  + '{"beats":[{"n":1,"label":"3-6 word label","who_acts":true,"goal_clear":"yes","change_clear":true,'
  + '"present_info_clear":true,"present_info_issue":"","referent_ok":true,"referent_note":"","prediction_possible":true}],'
  + '"transitions":[{"from":1,"to":2,"causal_clear":true,"agency_continuous":true,"goal_continuous":true,"reason":""}],'
  + '"scene_end_pull":true,"scene_end_answer":""}';

function splitScene(text) {
  const chars = (text.match(/\[CHARACTERS:[^\]]*\]/i) || [''])[0];
  const body = String(text)
    .replace(/\[CHARACTERS:[^\]]*\]/gi, '')
    .replace(/\[TITLE:[^\]]*\]/gi, '')
    .replace(/\[SYNOPSIS:[^\]]*\]/gi, '')
    .replace(/\[[A-Z][^\]]*\]/g, '')   // strip any other bracket meta-tags
    .trim();
  return { chars, body };
}

async function judgeScene(scene) {
  const { chars, body } = splitScene(scene.text || '');
  if (body.length < 120) return { skip: true, reason: 'too short (' + body.length + ' chars)' };
  const usr = 'CHARACTER HINT (for you only — the reader does NOT see this): ' + (chars || '(none)') + '\n\n'
    + 'SCENE PROSE (judge orientation from THIS alone):\n"""\n' + body + '\n"""\n\nReturn the JSON now.';
  let last;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return await grokJSON(SYS, usr); }
    catch (e) { last = e; }
  }
  return { error: String(last && last.message || last) };
}

// ---- run with limited concurrency ----
const raw = JSON.parse(fs.readFileSync(CORPUS, 'utf8'));
const scenes = (raw.scenes || raw || []).slice(0, MAX);
console.log('ORIENTATION AUDIT — corpus=' + CORPUS + ' scenes=' + scenes.length + ' (model=grok-4-1-fast-reasoning)\n');

const results = new Array(scenes.length);
let cursor = 0;
async function worker() {
  while (cursor < scenes.length) {
    const i = cursor++;
    const s = scenes[i];
    process.stdout.write('  judging scene ' + (i + 1) + '/' + scenes.length + ' (turn ' + (s.turnCount ?? '?') + ')...');
    const v = await judgeScene(s);
    results[i] = { i, turnCount: s.turnCount, sceneInIssue: s.sceneInIssue, v };
    process.stdout.write(v.error ? ' ERR\n' : (v.skip ? ' skip\n' : ' ok (' + (v.beats ? v.beats.length : 0) + ' beats)\n'));
  }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, scenes.length) }, worker));

// ---- aggregate ----
const agg = {
  scenesJudged: 0,
  beats: 0, transitions: 0,
  beatFail: { who_acts: 0, goal_no: 0, change_clear: 0, present_info: 0, referent: 0, prediction: 0 },
  transFail: { causal_clear: 0, agency_continuous: 0, goal_continuous: 0 },
  beatFailTotal: 0, transFailTotal: 0,
  pullPass: 0, pullTotal: 0, badPulls: [],
  presentInfoIssues: [], referentIssues: [], transReasons: []
};
for (const r of results) {
  const v = r && r.v; if (!v || v.error || v.skip || !Array.isArray(v.beats)) continue;
  agg.scenesJudged++;
  for (const b of v.beats) {
    agg.beats++;
    if (b.who_acts === false) { agg.beatFail.who_acts++; agg.beatFailTotal++; }
    if (b.goal_clear === 'no') { agg.beatFail.goal_no++; agg.beatFailTotal++; }
    if (b.change_clear === false) { agg.beatFail.change_clear++; agg.beatFailTotal++; }
    if (b.present_info_clear === false) { agg.beatFail.present_info++; agg.beatFailTotal++; if (b.present_info_issue) agg.presentInfoIssues.push('S' + (r.i + 1) + ' b' + b.n + ': ' + b.present_info_issue); }
    if (b.referent_ok === false) { agg.beatFail.referent++; agg.beatFailTotal++; if (b.referent_note) agg.referentIssues.push('S' + (r.i + 1) + ' b' + b.n + ': ' + b.referent_note); }
    if (b.prediction_possible === false) { agg.beatFail.prediction++; agg.beatFailTotal++; }
  }
  for (const t of (v.transitions || [])) {
    agg.transitions++;
    let f = false;
    if (t.causal_clear === false) { agg.transFail.causal_clear++; f = true; }
    if (t.agency_continuous === false) { agg.transFail.agency_continuous++; f = true; }
    if (t.goal_continuous === false) { agg.transFail.goal_continuous++; f = true; }
    if (f) { agg.transFailTotal++; if (t.reason) agg.transReasons.push('S' + (r.i + 1) + ' b' + t.from + '->b' + t.to + ': ' + t.reason); }
  }
  agg.pullTotal++;
  if (v.scene_end_pull === true) agg.pullPass++;
  else agg.badPulls.push('S' + (r.i + 1) + ' (turn ' + r.turnCount + '): ' + (v.scene_end_answer || '?'));
}

const pct = (n, d) => d ? (100 * n / d).toFixed(0) + '%' : 'n/a';
console.log('\n════════════════════ ORIENTATION AUDIT REPORT ════════════════════');
console.log('scenes judged: ' + agg.scenesJudged + '/' + scenes.length + '   beats: ' + agg.beats + '   transitions: ' + agg.transitions);
console.log('\n── FAILURE LOCUS (the key question: inside beats, or at the seams?) ──');
console.log('  beat-internal failures : ' + agg.beatFailTotal + '  (' + pct(agg.beatFailTotal, agg.beats) + ' of beats carry >=1)');
console.log('  transition failures    : ' + agg.transFailTotal + '  (' + pct(agg.transFailTotal, agg.transitions) + ' of seams fail)');
console.log('\n── BEAT-INTERNAL ORIENTATION (fail counts / rate) ──');
console.log('  WHO acts unclear        : ' + agg.beatFail.who_acts + '  (' + pct(agg.beatFail.who_acts, agg.beats) + ')');
console.log('  WHAT they want unclear  : ' + agg.beatFail.goal_no + '  (' + pct(agg.beatFail.goal_no, agg.beats) + ')');
console.log('  WHAT changed unclear    : ' + agg.beatFail.change_clear + '  (' + pct(agg.beatFail.change_clear, agg.beats) + ')  [momentum]');
console.log('  PRESENT-info obscured   : ' + agg.beatFail.present_info + '  (' + pct(agg.beatFail.present_info, agg.beats) + ')  [accidental disorientation]');
console.log('  REFERENT-opacity        : ' + agg.beatFail.referent + '  (' + pct(agg.beatFail.referent, agg.beats) + ')  [definite ref to un-established thing — "her little games"]');
console.log('  PREDICTION impossible   : ' + agg.beatFail.prediction + '  (' + pct(agg.beatFail.prediction, agg.beats) + ')');
console.log('\n── TRANSITION (beat->beat) CAUSALITY ──');
console.log('  WHY-next unclear (causal): ' + agg.transFail.causal_clear + '  (' + pct(agg.transFail.causal_clear, agg.transitions) + ')');
console.log('  agency discontinuous    : ' + agg.transFail.agency_continuous + '  (' + pct(agg.transFail.agency_continuous, agg.transitions) + ')');
console.log('  goal discontinuous      : ' + agg.transFail.goal_continuous + '  (' + pct(agg.transFail.goal_continuous, agg.transitions) + ')');
console.log('\n── FORWARD PULL (scene ends) ──');
console.log('  scene-end pull PRESENT   : ' + agg.pullPass + '/' + agg.pullTotal + '  (' + pct(agg.pullPass, agg.pullTotal) + ')');
if (agg.badPulls.length) { console.log('  weak/absent pull:'); agg.badPulls.forEach(x => console.log('    - ' + x)); }
if (agg.presentInfoIssues.length) { console.log('\n── ACCIDENTAL PRESENT-INFO OBSCURITY (the "whose silence?" defect) ──'); agg.presentInfoIssues.slice(0, 25).forEach(x => console.log('  - ' + x)); }
if (agg.referentIssues.length) { console.log('\n── REFERENT-OPACITY ("her little games" / "it was only chance") ──'); agg.referentIssues.slice(0, 25).forEach(x => console.log('  - ' + x)); }
if (agg.transReasons.length) { console.log('\n── TRANSITION FAILURE CHAINS (the causal seams) ──'); agg.transReasons.slice(0, 30).forEach(x => console.log('  - ' + x)); }

const errs = results.filter(r => r && r.v && r.v.error);
if (errs.length) { console.log('\n(' + errs.length + ' scene(s) errored: ' + errs.map(e => 'S' + (e.i + 1) + ' ' + e.v.error).join(' | ').slice(0, 300) + ')'); }

fs.writeFileSync('_orientation_audit_out.json', JSON.stringify({ corpus: CORPUS, agg, results }, null, 2));
console.log('\nfull per-scene verdicts -> _orientation_audit_out.json');
