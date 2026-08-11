// quick inspection: dump full simulator output for a concrete event vs the vague pseudo-event my recursion fed back.
import fs from 'fs';
const PROXY = 'http://localhost:3000/api/chatgpt-proxy', MODEL = 'gpt-4o';
const SYS = [
  'You are a WORLD SIMULATOR. You are NOT a storyteller, planner, or author. You never choose scenes, rank drama, interpret psychology, or realize goals. Given the CURRENT WORLD STATE and the LAST IRREVERSIBLE EVENT, you compute ONLY how the world has objectively changed — physics, not story.',
  'Output STRICT JSON: { "new_facts":[...], "affordance_changes":["<cap> (gained|lost|costly|available)"], "automatic_processes":[...], "default_trajectory":"...", "pressure_graph":[ {"pressure":"<unresolved STATE, never an action>","children":[ same shape ]} ] }',
  'HARD: physics only; enumerate never rank; STATES not actions; propagate SIDEWAYS (third parties, institutions, resources, geography); no protagonist/scene/story.'
].join('\n');
async function sim(state, event) {
  const usr = 'CURRENT WORLD STATE:\n' + state.map(f => '- ' + f).join('\n') + '\n\nLAST IRREVERSIBLE EVENT: ' + event + '\n\nReturn the JSON now.';
  const r = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: SYS }, { role: 'user', content: usr }], role: 'PRIMARY_AUTHOR', model: MODEL, temperature: 0.4, max_tokens: 1100, jsonMode: true }) });
  const d = await r.json(); const c = (d && d.content) || (d.choices && d.choices[0].message.content); return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);
}
console.log('===== CONCRETE EVENT: "Julian publicly accepts blame" =====');
console.log(JSON.stringify(await sim(["A youth's forbidden wish misfired during the rite.", 'Lirael halted the rite.'], 'Julian publicly accepts blame for the forbidden wish.'), null, 1));
console.log('\n===== VAGUE PSEUDO-EVENT (what my recursion fed at d1) =====');
console.log(JSON.stringify(await sim(["A youth's forbidden wish misfired during the rite."], 'The following unresolved situation has now been resolved by an event: The effects of the misfired wish are unresolved'), null, 1));
process.exit(0);
