// _worldsim_pergraph.mjs — Roman 2026-08-10. PURE per-graph simulator test (no recursion, no fake planner).
// Q: can the simulator consistently produce graphs a skilled human recognizes as "everything that just became true",
// across 20 WILDLY different situations? Each graph is attacked by an ADVERSARIAL critic hunting Missing / Invalid /
// Dead (Roman's causal test: a pressure that changes NOTHING the world now permits is dead). Critic surfaces candidate
// gaps for Roman's human recognition — it is NOT the final judge (that would be the LLM-vs-LLM trap).
import fs from 'fs';
const PROXY = 'http://localhost:3000/api/chatgpt-proxy', MODEL = 'gpt-4o';
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';

const SIM_SYS = [
  'You are a WORLD SIMULATOR. NOT a storyteller/planner/author. You never choose scenes, rank drama, interpret psychology, or realize goals. Given CURRENT WORLD STATE and LAST IRREVERSIBLE EVENT, compute ONLY how the world objectively changed — physics, not story.',
  'Output STRICT JSON: { "new_facts":[...], "affordance_changes":["<cap> (gained|lost|costly|available)"], "automatic_processes":[...], "default_trajectory":"...", "pressure_graph":[ {"pressure":"<unresolved STATE, never an action>","children":[ same shape ]} ] }',
  'CONCRETENESS + CAUSAL STRUCTURE (HARD — this is what makes a world have FUTURE): every fact and pressure must name a SPECIFIC actor, object, place, or institution AND change what the world now PERMITS next. BAN abstract theme-labels with no downstream. BAD (delete): "community perception is unresolved" / "trust is affected" / "the future of X" / "social standing" / "the situation is unresolved". GOOD: "the true wish-maker is still unnamed and now unobserved" / "the council holds grounds to sentence Julian" / "a rival house can now press its claim". If a pressure changes nothing about what is now possible/impossible, DELETE it.',
  'SIDEWAYS: prefer pressures reaching THIRD PARTIES already present, INSTITUTIONS/rules, RESOURCES/objects, and the physical SETTING — not only the principals named in the event.',
  'HARD: physics only; ENUMERATE never RANK; STATES not ACTIONS; no protagonist/scene/story.'
].join('\n');

const CRITIC_SYS = 'You ADVERSARIALLY review a world-simulator output. Your ONLY job is to REFUTE its completeness and validity — be strict. Given the EVENT, prior STATE, and the simulator\'s PRESSURE LIST, return STRICT JSON: {"missing":[obvious unresolved pressures it OMITTED that clearly follow — especially SIDEWAYS: third parties already present, institutions/rules, resources/objects, geography, automatic processes], "invalid":[listed pressures that do NOT actually follow from the event, OR are duplicates/re-wordings of another], "dead":[listed pressures that change NOTHING about what the world now PERMITS — pure labels/commentary with no downstream consequence]}. Keep each item a short phrase. If a category is empty, return [].';

async function call(sys, usr, mt) {
  for (let a = 0; a < 2; a++) {
    try {
      const r = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'PRIMARY_AUTHOR', model: MODEL, temperature: 0.3, max_tokens: mt, jsonMode: true }) });
      const d = await r.json(); const c = (d && d.content) || (d.choices && d.choices[0].message.content); return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);
    } catch (e) { if (a) return null; await new Promise(x => setTimeout(x, 1500)); }
  }
}
function flat(g, out) { out = out || []; (g || []).forEach(n => { if (n && typeof n === 'object') { if (n.pressure) out.push(n.pressure); flat(n.children, out); } else if (typeof n === 'string') out.push(n); }); return out; }

const EVENTS = [
  { tag: 'fantasy/social',   ev: 'Julian publicly accepts blame for the forbidden wish.', st: ["A youth's forbidden wish misfired during the rite.", 'Lirael halted the rite.'] },
  { tag: 'physical/disaster',ev: 'The bridge collapses while Lirael and Julian are mid-crossing.', st: ['They were fleeing pursuers across a gorge.'] },
  { tag: 'political',        ev: 'The queen unexpectedly abdicates before the assembled houses.', st: ['The realm was stable under her rule.'] },
  { tag: 'crime',            ev: 'The detective discovers the victim lied about their alibi.', st: ['A murder is under investigation.'] },
  { tag: 'mundane/infra',    ev: 'The power goes out across the area.', st: ['An ordinary evening at home.'] },
  { tag: 'mundane',          ev: 'She misses her train.', st: ['She was travelling to an appointment.'] },
  { tag: 'war',              ev: 'A senior soldier defects to the enemy on the eve of battle.', st: ['Two armies are camped for a decisive battle at dawn.'] },
  { tag: 'business/tech',    ev: "A startup's lead engineer quits and takes the source code.", st: ['A funded startup is weeks from launch.'] },
  { tag: 'medical/inst',     ev: 'A vaccine trial is halted after an unexpected participant death.', st: ['A late-stage trial was near approval.'] },
  { tag: 'political/scandal',ev: 'A married senator is photographed with someone not their spouse.', st: ['The senator faces re-election in a month.'] },
  { tag: 'natural',          ev: 'A volcano begins erupting beside a coastal town.', st: ['A quiet fishing town of thousands.'] },
  { tag: 'crisis',           ev: 'A child goes missing from a crowded fair.', st: ['A busy afternoon at a county fair.'] },
  { tag: 'family/legal',     ev: 'A will is read: the entire fortune goes to a stranger.', st: ['A wealthy patriarch has just died, survived by three children.'] },
  { tag: 'sports',           ev: "The star player tears their ACL in the championship's first minute.", st: ['The title game just kicked off, scoreless.'] },
  { tag: 'corporate',        ev: 'A whistleblower leaks the company\'s internal documents to a journalist.', st: ['A large firm under quiet regulatory scrutiny.'] },
  { tag: 'geopolitical',     ev: 'A ceasefire is signed between two warring nations.', st: ['A grinding two-year war has just paused.'] },
  { tag: 'contained',        ev: 'Two strangers are trapped together in a stuck elevator.', st: ['A high-rise office at night.'] },
  { tag: 'rural/resource',   ev: "A farmer's only well runs dry during a drought.", st: ['A third month without rain on a small farm.'] },
  { tag: 'romance',          ev: 'He tells her he is marrying someone else, at her door.', st: ['They were involved until he vanished a year ago.'] },
  { tag: 'economic',         ev: 'The town\'s only factory announces it is closing next month.', st: ['A one-industry town of a few thousand.'] }
];

fs.mkdirSync(DIR, { recursive: true });
console.log('=== WORLD SIMULATOR — per-graph completeness across ' + EVENTS.length + ' wildly different events (' + MODEL + ') ===\n');
const out = {};
for (const e of EVENTS) {
  const g = await call(SIM_SYS, 'CURRENT WORLD STATE:\n' + e.st.map(f => '- ' + f).join('\n') + '\n\nLAST IRREVERSIBLE EVENT: ' + e.ev + '\n\nReturn the JSON now.', 1100);
  if (!g) { console.log('── ' + e.tag.padEnd(18) + ' SIM ERROR'); out[e.tag] = { error: 1 }; continue; }
  const ps = flat(g.pressure_graph);
  const crit = await call(CRITIC_SYS, 'EVENT: ' + e.ev + '\nPRIOR STATE: ' + e.st.join(' | ') + '\nSIMULATOR PRESSURE LIST:\n' + ps.map(p => '- ' + p).join('\n') + '\n\nReturn the JSON now.', 500) || { missing: [], invalid: [], dead: [] };
  out[e.tag] = { event: e.ev, pressures: ps, facts: g.new_facts, affordances: g.affordance_changes, automatic: g.automatic_processes, default_trajectory: g.default_trajectory, critic: crit };
  const mi = (crit.missing || []).length, iv = (crit.invalid || []).length, dd = (crit.dead || []).length;
  const verdict = (mi === 0 && iv === 0 && dd === 0) ? 'CLEAN' : (mi <= 1 && iv === 0 && dd === 0) ? 'GOOD' : 'GAPS';
  console.log('── ' + e.tag.padEnd(18) + verdict + '  pressures=' + ps.length + '  missing=' + mi + ' invalid=' + iv + ' dead=' + dd);
  if (mi) console.log('     MISSING: ' + (crit.missing || []).slice(0, 4).join(' · '));
  if (iv) console.log('     INVALID: ' + (crit.invalid || []).slice(0, 3).join(' · '));
  if (dd) console.log('     DEAD: ' + (crit.dead || []).slice(0, 3).join(' · '));
}
fs.writeFileSync(DIR + '/pergraph_report.json', JSON.stringify(out, null, 1));
const rows = Object.values(out).filter(x => !x.error);
const clean = rows.filter(x => !(x.critic.missing || []).length && !(x.critic.invalid || []).length && !(x.critic.dead || []).length).length;
const avgMiss = (rows.reduce((a, x) => a + (x.critic.missing || []).length, 0) / rows.length).toFixed(1);
const avgDead = (rows.reduce((a, x) => a + (x.critic.dead || []).length, 0) / rows.length).toFixed(1);
const avgInv = (rows.reduce((a, x) => a + (x.critic.invalid || []).length, 0) / rows.length).toFixed(1);
console.log('\nSUMMARY: ' + clean + '/' + rows.length + ' graphs CLEAN (0 missing/invalid/dead) · avg missing ' + avgMiss + ' · avg invalid ' + avgInv + ' · avg dead ' + avgDead);
console.log('Full graphs + critic flags → ' + DIR + '/pergraph_report.json  (for Roman\'s human recognition pass)');
process.exit(0);
