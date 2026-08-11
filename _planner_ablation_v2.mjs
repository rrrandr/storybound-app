// _planner_ablation_v2.mjs — Roman 2026-08-10. CONFIRMATION of planner milestone-dominance across MILESTONE TYPES,
// with a richer 0-5 INFLUENCE PROFILE (not binary changed/unchanged). Four scenarios (emotional / physical / social /
// investigative), each with committed facts set DOWNSTREAM of the milestone + a player action pointing at the CURRENT
// (advanced) situation. Per scenario: FULL objective + its influence profile (how much it derives from each input 0-5)
// + NO_MILESTONE / NO_COMMITTED ablations. If milestone-influence is high and others low ACROSS ALL FOUR TYPES, the
// overweighting is a general planner property. Careful claim: this measures SENSITIVITY/DERIVATION, not literal attention.
import fs from 'fs';
const PROXY = 'http://localhost:3000/api/chatgpt-proxy';
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/ablation';

const SC_SYS = 'You are the SCENE-SPINE planner for an interactive romance engine. The scene has ONE organizing event: a STATE CHANGE — an irreversible, externally observable event that flips a specific fact from FALSE to TRUE. First name the TACTICAL MOVE (what this scene does to advance the current milestone — an input constraint, NOT the event), then express it as a state_change per the CONTRACT.\n'
  + 'STATE_CHANGE CONTRACT (HARD): • state_change_precondition: ONE sentence, the fact NOT YET TRUE at open. • state_change: the observable EVENT that flips it FALSE→TRUE, externally observable, changes the world, name ONLY the event, 8-16 words. • forces_choice: two ACTIVE responses. • SPECIFICITY (HARD): realize the milestone\'s SPECIFIC concrete content; SPECIFICITY TEST: a reader must be able to point to WHICH milestone your state_change came from. • DELETE TEST.\n'
  + 'DERIVE from: THE CURRENT MILESTONE (strategic anchor — realize ITS specific event) + the tactical move + the PRIOR scene\'s state. The new state MUST differ from the prior scene\'s.\n'
  + 'Return ONLY JSON: { "tactical_move":"", "state_change_precondition":"", "state_change":"", "forces_choice":"", "branch_a":"", "branch_b":"" }';

const SCEN = [
  { type: 'EMOTIONAL',
    MILESTONE: 'CURRENT MILESTONE (distant TARGET): "By the low fire she lets Julian see her fear for the first time, and does not look away."\nA-plot goal: "Move from guarded alliance toward genuine trust as danger closes in."',
    COMMITTED: 'COMMITTED WORLD STATE — facts already TRUE (your event MUST build FROM these): ["Julian already saw her fear and named it aloud last night.","She confessed she made the forbidden wish, and he did not recoil.","A messenger arrived proving Julian has been reporting to the council."]',
    CONTINUITY: 'Continuity (context only): {"setting":"the cold hearth-room at dawn","charactersPresent":["Lirael","Julian"],"protagonistStatus":"holding the messenger\'s letter, betrayed","activeInterlocutor":"Julian","protagonistAlone":false}',
    PLAYER: 'Player action: I confront him with the letter.\nPlayer dialogue: You\'ve been reporting on me.' },
  { type: 'PHYSICAL',
    MILESTONE: 'CURRENT MILESTONE (distant TARGET): "On the collapsing bridge he catches her wrist as the planks give, and they cross together."\nA-plot goal: "Escape the flooding gorge before the tidewall seals the pass."',
    COMMITTED: 'COMMITTED WORLD STATE — facts already TRUE (your event MUST build FROM these): ["They already crossed the bridge; it collapsed behind them.","The tidewall has sealed the pass; there is no way back.","Julian\'s leg was gashed open in the crossing and he is bleeding badly."]',
    CONTINUITY: 'Continuity (context only): {"setting":"a ledge above the flooded gorge","charactersPresent":["Lirael","Julian"],"protagonistStatus":"binding Julian\'s wound with her sleeve","activeInterlocutor":"Julian","protagonistAlone":false}',
    PLAYER: 'Player action: I tear my sleeve to bind his leg.\nPlayer dialogue: Hold still — you\'re losing too much blood.' },
  { type: 'SOCIAL',
    MILESTONE: 'CURRENT MILESTONE (distant TARGET): "At the council she is publicly named the youth\'s accuser, and the hall turns on her."\nA-plot goal: "Survive the council\'s judgment and turn the room before they exile her."',
    COMMITTED: 'COMMITTED WORLD STATE — facts already TRUE (your event MUST build FROM these): ["She was already named the accuser; the hall already turned on her.","An elder demanded her exile before the moons set.","Julian stood and claimed the accusation was his, not hers."]',
    CONTINUITY: 'Continuity (context only): {"setting":"the council hall under the split dome","charactersPresent":["Lirael","Julian","the elder"],"protagonistStatus":"on her feet as Julian takes the blame","activeInterlocutor":"the elder","protagonistAlone":false}',
    PLAYER: 'Player action: I refuse to let Julian take the blame for me.\nPlayer dialogue: The accusation was mine. I stand by it.' },
  { type: 'INVESTIGATIVE',
    MILESTONE: 'CURRENT MILESTONE (distant TARGET): "In the sealed archive she finds the ledger proving her father forged the pact."\nA-plot goal: "Uncover who really bound the wish before the trail is burned."',
    COMMITTED: 'COMMITTED WORLD STATE — facts already TRUE (your event MUST build FROM these): ["She already found the ledger; her father forged the pact.","The ledger names a second signatory whose seal she does not recognize.","Someone set fire to the archive\'s far wing to destroy the rest."]',
    CONTINUITY: 'Continuity (context only): {"setting":"the burning sealed archive","charactersPresent":["Lirael","Julian"],"protagonistStatus":"clutching the ledger as smoke fills the room","activeInterlocutor":"Julian","protagonistAlone":false}',
    PLAYER: 'Player action: I search the ledger for the second seal before it burns.\nPlayer dialogue: There\'s another name here — help me find it.' }
];
const ORDER = ['MILESTONE', 'COMMITTED', 'CONTINUITY', 'PLAYER'];
function buildUsr(sc, omit) { return ORDER.filter(k => k !== omit).map(k => sc[k]).join('\n') + '\nScene index: 4'; }

async function planOnce(usr) {
  try {
    const r = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: SC_SYS }, { role: 'user', content: usr }], role: 'PRIMARY_AUTHOR', model: 'gpt-4o-mini', temperature: 0.3, max_tokens: 300, jsonMode: true }) });
    const d = await r.json(); const c = (d && d.content) || (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content);
    return String(JSON.parse(c.match(/\{[\s\S]*\}/)[0]).state_change || '').trim();
  } catch (e) { return '[ERR]'; }
}
async function sample(usr, n) { const o = []; for (let i = 0; i < n; i++) o.push(await planOnce(usr)); return o; }

const PROFILE_SYS = 'You analyze what a scene-planner OBJECTIVE was derived from. Given the OBJECTIVE and the four inputs the planner had, rate 0-5 how much the objective is derived from / realizes EACH input (0=no relation, 5=directly restates or realizes it). Rate each independently. Return ONLY JSON {"milestone":N,"committed_facts":N,"player_action":N,"continuity":N}.';
async function profile(obj, sc) {
  try {
    const usr = 'OBJECTIVE: ' + obj + '\n\n' + sc.MILESTONE + '\n' + sc.COMMITTED + '\n' + sc.PLAYER + '\n' + sc.CONTINUITY;
    const r = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: PROFILE_SYS }, { role: 'user', content: usr }], role: 'PRIMARY_AUTHOR', model: 'gpt-4o-mini', temperature: 0, max_tokens: 60, jsonMode: true }) });
    const d = await r.json(); const c = (d && d.content) || (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content);
    return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);
  } catch (_) { return { milestone: '?', committed_facts: '?', player_action: '?', continuity: '?' }; }
}

fs.mkdirSync(DIR, { recursive: true });
console.log('=== PLANNER MILESTONE-DOMINANCE — CROSS-TYPE CONFIRMATION + INFLUENCE PROFILE ===\n');
const all = {};
for (const sc of SCEN) {
  const full = await sample(buildUsr(sc, null), 2);
  const noMile = await sample(buildUsr(sc, 'MILESTONE'), 2);
  const noFacts = await sample(buildUsr(sc, 'COMMITTED'), 2);
  const prof = await profile(full[0], sc);
  all[sc.type] = { full, noMile, noFacts, prof };
  console.log(`── ${sc.type} ──`);
  console.log(`  FULL objective:        ${full[0]}`);
  console.log(`  influence 0-5:         milestone=${prof.milestone}  facts=${prof.committed_facts}  player=${prof.player_action}  continuity=${prof.continuity}`);
  console.log(`  NO_MILESTONE →         ${noMile[0]}`);
  console.log(`  NO_COMMITTED_FACTS →   ${noFacts[0]}`);
  console.log('');
}
fs.writeFileSync(DIR + '/ablation_v2_results.json', JSON.stringify(all, null, 1));
console.log('READ: if milestone-influence is HIGH and facts/player LOW across ALL FOUR types, milestone-overweighting is');
console.log('a general planner property (not scenario-specific). NO_MILESTONE objectives show what the planner does when');
console.log('the anchor is removed — whether it advances from the current state. Saved → ' + DIR + '/ablation_v2_results.json');
process.exit(0);
