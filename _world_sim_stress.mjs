// _world_sim_stress.mjs — Roman 2026-08-10. WORLD SIMULATOR implementation (frozen interface) + recursive stress test.
// EXP 1: no prose, no author, no planner. Seed events → simulate → pick the MOST-NOVEL unresolved pressure → treat its
// resolution as the next irreversible event → re-simulate. Recurse to depth 6. Question: does the world contain ENOUGH
// FUTURE to sustain ~20 scenes, or does it collapse into a spine (A→explain→explain = the exp#1 disclosure disease)?
// Health signals (mechanical): branching factor / step · novelty vs ancestors · loops · exhaustion depth. Model=gpt-4o
// (capable enough that a collapse is the ARCHITECTURE's, not a weak model's — the model-swap discipline). ~cents.
import fs from 'fs';

const PROXY = 'http://localhost:3000/api/chatgpt-proxy';
const MODEL = 'gpt-4o';
const DEPTH = 6;
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';

// ── WORLD SIMULATOR — frozen interface. Physics only. Enumerate, never rank. States, never actions. No story. ──
const SIM_SYS = [
  'You are a WORLD SIMULATOR. You are NOT a storyteller, planner, or author. You never choose scenes, rank drama, interpret psychology, or realize goals. Given the CURRENT WORLD STATE and the LAST IRREVERSIBLE EVENT, you compute ONLY how the world has objectively changed — physics, not story.',
  'Output STRICT JSON with exactly these fields:',
  '{',
  '  "new_facts": [ state facts now true that were not before — objective, not interpretation ],',
  '  "affordance_changes": [ ONLY capabilities that changed, each "<capability> (gained|lost|costly|available)". TEST: an affordance must be true even if no one ever uses it. "she has authorized access to the house" = YES; "she can retrieve/hide/shelter" = NO (those are actions/scenes) ],',
  '  "automatic_processes": [ world movement that continues on its own with no one acting — fire spreads, reserves drain, a law auto-triggers, a clock counts down ],',
  '  "default_trajectory": "if every character vanished and no one acted, the eventual outcome",',
  '  "pressure_graph": [ a causal tree of UNRESOLVED tensions. Each node = {"pressure": "<an unresolved STATE of tension, phrased as a condition — NEVER an action someone takes>", "children": [ nested sub-pressures/terminal possibilities, same shape ]}. A pressure is "X is unresolved / X is exposed / X is closing" — NOT "someone does X." ]',
  '}',
  'HARD RULES: (1) PHYSICS ONLY — no psychology ("signals intimacy"), no dramatic value, no "the interesting part is". (2) ENUMERATE, never RANK — list all unresolved pressures; never order by importance/interest. (3) STATES, not ACTIONS — "suspicion is unresolved", not "the council arrests him". (4) Propagate SIDEWAYS — third parties already present, institutions, resources, geography, not only the principals. (5) No protagonist, no scene, no story, no author guidance.'
].join('\n');

async function simulate(stateFacts, event) {
  const usr = 'CURRENT WORLD STATE:\n' + (stateFacts.length ? stateFacts.map(f => '- ' + f).join('\n') : '(baseline)') + '\n\nLAST IRREVERSIBLE EVENT: ' + event + '\n\nReturn the JSON now.';
  try {
    const r = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: SIM_SYS }, { role: 'user', content: usr }], role: 'PRIMARY_AUTHOR', model: MODEL, temperature: 0.4, max_tokens: 1100, jsonMode: true }) });
    const d = await r.json(); const c = (d && d.content) || (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content);
    return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);
  } catch (e) { return null; }
}

function topPressures(graph) { return (graph || []).map(n => (typeof n === 'string' ? n : (n && n.pressure) || '')).filter(Boolean); }
function countNodes(graph) { let n = 0; (graph || []).forEach(x => { if (x && typeof x === 'object') { n += 1 + countNodes(x.children); } else if (typeof x === 'string') { n += 1; } }); return n; }
function toks(s) { return new Set(String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length >= 4)); }
function jac(a, b) { const A = toks(a), B = toks(b); let i = 0; A.forEach(w => { if (B.has(w)) i++; }); return i / (A.size + B.size - i || 1); }
function noveltyVs(p, ancestors) { let mx = 0; ancestors.forEach(a => { const j = jac(p, a); if (j > mx) mx = j; }); return 1 - mx; }

const SEEDS = [
  { tag: 'DRAMA:blame',    event: 'Julian publicly accepts blame for the forbidden wish.', state: ["A youth's forbidden wish misfired during the rite.", 'Lirael halted the rite before it completed.'] },
  { tag: 'DRAMA:bridge',   event: 'The bridge collapses while Lirael and Julian are mid-crossing.', state: ['They were fleeing pursuers across a gorge.'] },
  { tag: 'DRAMA:abdicate', event: 'The queen unexpectedly abdicates before the assembled houses.', state: ['The realm was stable under her rule.'] },
  { tag: 'DRAMA:alibi',    event: 'The detective discovers the victim lied about their alibi.', state: ['A murder is under investigation.'] },
  { tag: 'MUNDANE:power',   event: 'The power goes out across the area.', state: ['An ordinary evening at home.'] },
  { tag: 'MUNDANE:train',   event: 'She misses her train.', state: ['She was travelling to an appointment.'] },
  { tag: 'MUNDANE:wallet',  event: 'He loses his wallet.', state: ['An ordinary day out in the city.'] },
  { tag: 'MUNDANE:package', event: 'A package arrives at the door.', state: ['An ordinary afternoon at home.'] }
];

fs.mkdirSync(DIR, { recursive: true });
console.log('=== WORLD SIMULATOR — recursive stress test (depth ' + DEPTH + ', model ' + MODEL + ') ===');
console.log('Q: does the world contain ENOUGH FUTURE for ~20 scenes, or collapse to a spine?\n');

const report = {};
for (const seed of SEEDS) {
  let state = [...seed.state], event = seed.event; const ancestors = []; const steps = [];
  for (let d = 0; d < DEPTH; d++) {
    const sim = await simulate(state, event);
    if (!sim) { steps.push({ d, error: true }); break; }
    const tp = topPressures(sim.pressure_graph);
    const branching = tp.length;
    const nodes = countNodes(sim.pressure_graph);
    if (branching === 0) { steps.push({ d, branching: 0, nodes, exhausted: true }); break; }
    const scored = tp.map(p => ({ p, nov: noveltyVs(p, ancestors) })).sort((a, b) => b.nov - a.nov);
    const chosen = scored[0];
    steps.push({ d, branching, nodes, bestNov: +chosen.nov.toFixed(2), chosen: chosen.p, loop: chosen.nov < 0.35 });
    ancestors.push(...tp);
    state = [...state, ...((sim.new_facts) || [])].slice(-14);
    event = 'The following unresolved situation has now been forced to a head and resolved by an event: ' + chosen.p;
  }
  report[seed.tag] = steps;
  const reached = steps.filter(s => !s.error && !s.exhausted).length;
  const brs = steps.filter(s => s.branching > 0).map(s => s.branching);
  const avgBr = brs.length ? (brs.reduce((a, b) => a + b, 0) / brs.length).toFixed(1) : '0';
  const novs = steps.filter(s => s.bestNov != null).map(s => s.bestNov);
  const minNov = novs.length ? Math.min(...novs) : 0;
  const loops = steps.filter(s => s.loop).length;
  const collapsed = brs.some(b => b <= 1) || minNov < 0.2;
  const verdict = steps.some(s => s.exhausted) ? 'EXHAUSTED@' + reached : collapsed ? 'COLLAPSE' : (reached >= DEPTH && avgBr >= 3 ? 'HEALTHY' : 'WEAK');
  console.log('── ' + seed.tag.padEnd(16) + ' ' + verdict + '  (depth ' + reached + '/' + DEPTH + ' · avg-branching ' + avgBr + ' · min-novelty ' + minNov + ' · loops ' + loops + ')');
  steps.forEach(s => { if (s.chosen) console.log('     d' + s.d + ' br=' + s.branching + ' nodes=' + s.nodes + ' nov=' + s.bestNov + (s.loop ? ' LOOP' : '') + ' → walked: ' + s.chosen.slice(0, 78)); else if (s.exhausted) console.log('     d' + s.d + ' EXHAUSTED (0 pressures)'); else if (s.error) console.log('     d' + s.d + ' sim error'); });
  console.log('');
}
fs.writeFileSync(DIR + '/stress_report.json', JSON.stringify(report, null, 1));
console.log('HEALTHY = reached full depth, avg-branching ≥3, novelty never collapsed. COLLAPSE = branching→1 or novelty→0 (the disclosure-spine). Saved → ' + DIR + '/stress_report.json');
process.exit(0);
