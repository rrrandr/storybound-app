// _planner_ablation.mjs — Roman 2026-08-10. PLANNER SENSITIVITY (prompt-ablation) test.
// Question: which _scUsr section actually carries the planner's reasoning? Mask ONE section at a time, ask the SAME
// planner (production spine _scSys, gpt-4o-mini, temp 0.3) for the objective, compare to the FULL baseline. High
// distance-from-FULL = the planner USES that section; ~0 = it IGNORES it. No author, no verifier, no browser.
// The committed facts are set DOWNSTREAM of the milestone (story has moved past "she notices Julian" to "Julian is
// the named price") so: planner USING facts → objective advances; planner RESTATING milestone → objective stays stale.
import fs from 'fs';

const PROXY = 'http://localhost:3000/api/chatgpt-proxy';
const SAMPLES = 3;
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/ablation';

// ── production spine planner system prompt (app.js ~93002-93011, base; slots appendix omitted — we only read state_change) ──
const SC_SYS = 'You are the SCENE-SPINE planner for an interactive romance engine. The scene has ONE organizing event: a STATE CHANGE — an irreversible, externally observable event that flips a specific fact from FALSE to TRUE. Everything else in the scene serves it. First name the TACTICAL MOVE (what this scene does to advance the current milestone — an input constraint, NOT the event), then express it as a state_change per the CONTRACT.\n'
  + 'STATE_CHANGE CONTRACT (HARD — reused from the proven Scene-1 primitive, do NOT soften):\n'
  + '  • state_change_precondition: ONE sentence naming the single fact NOT YET TRUE when the scene opens — the "before", the negation of the state_change, phrased so the scene must OPEN with it still false. 8-16 words.\n'
  + '  • state_change: the observable EVENT, landing partway through, that flips the precondition FALSE→TRUE, witnessed on-page. HARD REQUIREMENTS: (a) it makes the precondition true — do NOT restate anything already true at the opening; (b) EXTERNALLY OBSERVABLE; (c) it CHANGES SOMETHING IN THE WORLD — answer "what changed in the world?", never "how does she feel?"; (d) NAME ONLY THE EVENT — STOP AT THE CONCRETE MOMENT. 8-16 words, phrased as the event.\n'
  + '  • forces_choice: the decision the event UNLOCKS — two ACTIVE responses, no escape hatch.\n'
  + '  • SPECIFICITY (HARD — the state_change must UNIQUELY identify THIS milestone): realize the milestone\'s SPECIFIC concrete content — its named objects, places, and actions — NOT a generic version of the theme. SPECIFICITY TEST: hide the milestone text and show ONLY your state_change — a reader must be able to point to WHICH milestone it came from.\n'
  + '  • DELETE TEST: delete the event, and BOTH branches become impossible or materially different.\n'
  + 'DERIVE from: THE CURRENT MILESTONE (strategic anchor — realize ITS specific event, do NOT collapse it to the theme) + the tactical move + the PRIOR scene\'s state (below). The new state MUST differ from the prior scene\'s — never re-flip an already-true fact, and never re-emit the prior event merely reworded.\n'
  + 'Return ONLY JSON: { "tactical_move":"", "state_change_precondition":"", "state_change":"", "forces_choice":"", "branch_a":"", "branch_b":"" }';

// ── user-prompt sections (mirror the real _scUsr; committed facts intentionally DOWNSTREAM of the milestone) ──
const SECTIONS = {
  MILESTONE: 'CURRENT MILESTONE (distant TARGET — constrains what the next event may be; NOT a per-scene mandate): "During the festival exposure of the family secret she notices Julian for the first time as the magical backlash begins stranding the town square."\nA-plot goal: "Survive the magical backlash from the wrong wish while resolving the consequence revelation before it strands them permanently."',
  PRESSURES: 'Issue pressures: ["her need for connection becomes harder to ignore","his amusement starts to feel like a mask for pain"]',
  COMMITTED: 'COMMITTED WORLD STATE — facts already TRUE (irreversible; do NOT re-establish or re-flip; your event MUST build FROM these): ["Lirael halted the rite before the youth\'s wish could complete.","The bond-thread rerouted and named Julian as the price of the wish.","The elder publicly declared the debt is Julian\'s to pay."]',
  CONTINUITY: 'Continuity (where the last scene ended — context only, NOT the event to repeat): {"setting":"the ritual clearing at the altar","charactersPresent":["Lirael","Julian","the elder"],"protagonistStatus":"standing between the youth and the elders, refusing to let the rite finish","activeInterlocutor":"the elder","protagonistAlone":false}',
  PLAYER: 'Player action: I offer to bear the cost myself instead of Julian.\nPlayer dialogue: Take it from me instead.',
  SCENEIDX: 'Scene index: 4'
};
const ORDER = ['MILESTONE', 'PRESSURES', 'COMMITTED', 'CONTINUITY', 'PLAYER', 'SCENEIDX'];
function buildUsr(omit) { return ORDER.filter(k => k !== omit).map(k => SECTIONS[k]).join('\n'); }

async function planOnce(usr) {
  try {
    const r = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: SC_SYS }, { role: 'user', content: usr }], role: 'PRIMARY_AUTHOR', model: 'gpt-4o-mini', temperature: 0.3, max_tokens: 320, jsonMode: true }) });
    const d = await r.json(); const c = (d && d.content) || (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content);
    const p = JSON.parse(c.match(/\{[\s\S]*\}/)[0]);
    return String(p.state_change || '').trim();
  } catch (e) { return '[ERR:' + (e && e.message || '?') + ']'; }
}
async function sample(usr, n) { const out = []; for (let i = 0; i < n; i++) out.push(await planOnce(usr)); return out; }

// judge: same or different dramatic problem vs a reference objective
const J_SYS = 'You judge two scene objectives. Reply ONLY JSON {"verdict":"same"|"different"}. SAME = a reader would describe the same core dramatic event/problem (only wording changed). DIFFERENT = a different event/problem.';
async function judge(ref, cur) {
  try {
    const r = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: J_SYS }, { role: 'user', content: 'REFERENCE: ' + ref + '\nOTHER: ' + cur }], role: 'PRIMARY_AUTHOR', model: 'gpt-4o-mini', temperature: 0, max_tokens: 30, jsonMode: true }) });
    const d = await r.json(); const c = (d && d.content) || (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content);
    return JSON.parse(c).verdict || '?';
  } catch (_) { return '?'; }
}
async function diffRate(ref, arr) { let diff = 0, j = 0; for (const o of arr) { const v = await judge(ref, o); if (v !== '?') j++; if (v === 'different') diff++; } return { diff, judged: j }; }

fs.mkdirSync(DIR, { recursive: true });
console.log('=== PLANNER SENSITIVITY (prompt ablation) — production spine planner, gpt-4o-mini temp 0.3 ===\n');

const full = await sample(buildUsr(null), SAMPLES);
const fullCtrl = await sample(buildUsr(null), SAMPLES); // noise floor
const ref = full[0];
console.log('FULL baseline objectives:');
full.forEach((o, i) => console.log('  ' + i + ': ' + o));
console.log('');

const conditions = [
  ['NO_MILESTONE', 'MILESTONE'], ['NO_COMMITTED_FACTS', 'COMMITTED'],
  ['NO_CONTINUITY', 'CONTINUITY'], ['NO_PLAYER_ACTION', 'PLAYER']
];
const results = {};
results['FULL_vs_FULL(noise)'] = { arr: fullCtrl, ...(await diffRate(ref, fullCtrl)) };
for (const [name, omit] of conditions) {
  const arr = await sample(buildUsr(omit), SAMPLES);
  results[name] = { arr, ...(await diffRate(ref, arr)) };
}

console.log('SENSITIVITY (how OFTEN the objective becomes a DIFFERENT dramatic problem when a section is removed,\nvs the FULL baseline — higher = the planner RELIES on that section; ~noise floor = it IGNORES it):\n');
console.log('  FULL_vs_FULL (noise floor): ' + results['FULL_vs_FULL(noise)'].diff + '/' + results['FULL_vs_FULL(noise)'].judged);
for (const [name] of conditions) console.log('  ' + name.padEnd(20) + ': ' + results[name].diff + '/' + results[name].judged + '  →  ' + results[name].arr.map(o => o.slice(0, 62)).join(' | '));

fs.writeFileSync(DIR + '/ablation_results.json', JSON.stringify({ ref, full, fullCtrl, results }, null, 1));
console.log('\nRead: the section whose removal most raises the DIFFERENT-rate above the noise floor is what the planner');
console.log('actually reasons from. If NO_MILESTONE >> NO_COMMITTED_FACTS, the planner is a milestone-restater.');
console.log('Saved → ' + DIR + '/ablation_results.json');
process.exit(0);
