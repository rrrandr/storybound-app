// _planner_hop_test.mjs — Roman 2026-08-12. THE ONE-CENT DISCRIMINATOR, at the scene-spine planner hop ONLY.
// No author call. No prose. No code changes. Two gpt-4o-mini calls (~$0.002).
//
// QUESTION: the author never sees the spine goal — only `state_change` (app.js:140126). Does the goal's
// load-bearing payload survive that hop? Same prior-scene state for both arms; ONLY the objective format differs.
//   ARM A = the original generated EVENT-FORM milestone (staged: location + props + threat)
//   ARM B = a STATE-PHASE form of the same intended advancement, no staging details
// The system prompt is extracted VERBATIM from app.js so this is the real hop, not a paraphrase.
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy';
const APP=fs.readFileSync('public/app.js','utf8');

// ── extract the REAL _scSys (app.js ~93055-93070): a pure string-literal concatenation ──
const start=APP.indexOf("var _scSys = 'You are the SCENE-SPINE planner");
if (start<0) { console.error('could not locate _scSys'); process.exit(1); }
const tail=APP.indexOf('Return ONLY JSON:', start);
const end=APP.indexOf("';", tail);
const expr=APP.slice(start+'var _scSys = '.length, end+1);
const SC_SYS=eval(expr);   // literals + '+' only
console.log('[extracted] _scSys = '+SC_SYS.length+' chars, '+SC_SYS.split('\n').length+' lines');
if (!/SPECIFICITY \(HARD/.test(SC_SYS) || !/8-16 words/.test(SC_SYS)) { console.error('extraction looks wrong'); process.exit(1); }

// ── prior-scene state: IDENTICAL for both arms. Reconstructed from the actual failed run's scenes 1-9
//    (the harbor / councilwoman / sealed-letter tableau the story had locked onto).
const FACTS=[
 'Julian publicly accepted blame for the forbidden wish.',
 "The youth's First Sacrifice twisted and the cost was already paid.",
 'The council treats the named wish-maker as liable.',
 "A sealed letter bearing Julian's mark reached the counting-house.",
 'The councilwoman confronted Lirael on the harbor path and opened the letter.',
 'The letter reads: it is not about the artifact, it is about the vow.',
 'Lirael agreed to pay the price the councilwoman names.',
 'The true wish-maker is still unidentified.'
];
const PRESSURES='the ritual debt is unresolved; the council is tightening scrutiny on Julian; the true wish-maker is unidentified';
const CONTINUITY='The harbor path at dusk. The councilwoman holds the folded letter. Lirael steadies the failing youth. The path behind her is empty; no one else is coming.';
const PRIOR_TRANSITION='The councilwoman named her price and Lirael accepted it.';
const ACT='I pull back, suddenly afraid of how much I want this.';
const DIA="I shouldn't be here.";
const SCENE_INDEX=9;

// ── the two objectives ──
const ARM_A='Lirael, hidden behind a market stall, manages to slip a note into Julian’s pocket without being seen by the council patrol, indicating a safe meeting place.';
const ARM_B='Lirael and Julian pass into shared complicity: she gets word to him covertly while the council is actively watching, and neither can disown the secret afterward.';

// ── rebuild _scUsr exactly as the _fromPlan branch does (app.js:93076-93088) ──
function buildUsr(objective){
  return 'THIS SCENE\'S OBJECTIVE (authored story spine — the scene\'s central development to realize NOW as this scene\'s state_change, NOT a distant target): ' + JSON.stringify(objective).slice(0,300)
    + '\nIssue pressures: ' + JSON.stringify(PRESSURES).slice(0,250)
    + '\nCOMMITTED WORLD STATE — facts already TRUE (irreversible; do NOT re-establish or re-flip; your event MUST build FROM these): ' + JSON.stringify(FACTS.slice(-8)).slice(0,480)
    + '\nPrior proposed transition (context): ' + JSON.stringify(PRIOR_TRANSITION).slice(0,160)
    + '\nReachability (HARD): the event must be reachable in ONE scene FROM the committed world state above — a single irreversible step, not a leap past intermediate states the story has not reached.\n'
    + '\nContinuity (where the last scene ended — context only, NOT the event to repeat): ' + JSON.stringify(CONTINUITY).slice(0,300)
    + '\nPlayer action: ' + ACT + '\nPlayer dialogue: ' + DIA
    + '\nScene index: ' + SCENE_INDEX;
}

async function planner(objective){
  const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({messages:[{role:'system',content:SC_SYS},{role:'user',content:buildUsr(objective)}],
      role:'PRIMARY_AUTHOR',model:'gpt-4o-mini',temperature:0.3,max_tokens:700,jsonMode:true})});
  const d=await r.json(); const c=(d&&d.content)||(d.choices&&d.choices[0].message.content)||'';
  try { return JSON.parse(c.match(/\{[\s\S]*\}/)[0]); } catch(e){ return {_raw:c,_err:e.message}; }
}

// Payload probe. Roman's spec: the literal word "marketplace" need NOT survive — what matters is whether the
// causal payload survives strongly enough that an author could not plausibly restage it as harbor+councilwoman+letter.
const PAYLOAD=[
 ['covert exchange', /slip|pass(es|ed)?|hand(s|ed)?|tuck|press(es|ed)? into|deliver|plant/i],
 ['Julian named',    /julian/i],
 ['the note/message',/note|message|word|paper|scrap/i],
 ['threat of discovery', /unseen|without being seen|watch|patrol|guard|hidden|conceal|cover|secret|covert|risk|caught/i],
 ['shared complicity',/both|together|complicit|neither|shared|each other/i],
 ['a place that is NOT the harbor tableau', /market|stall|street|crowd|alley|square|dock(?!.*councilwoman)/i],
];
const TABLEAU=[['harbor',/harbor/i],['councilwoman',/councilwoman/i],['letter',/letter|parchment|seal/i]];

console.log('\n════ PRIOR-SCENE STATE (IDENTICAL FOR BOTH ARMS) ════');
console.log('committed facts : '+FACTS.length+' (ending "'+FACTS[FACTS.length-1]+'")');
console.log('continuity      : '+CONTINUITY);
console.log('player act/dia  : "'+ACT+'" / "'+DIA+'"');

for (const [label,objective] of [['ARM A — EVENT FORM (original generated milestone)',ARM_A],
                                 ['ARM B — STATE-PHASE FORM (same intent, no staging)',ARM_B]]){
  console.log('\n\n════════ '+label+' ════════');
  console.log('INPUT MILESTONE:\n  '+objective);
  const out=await planner(objective);
  if (out._err){ console.log('  PARSE FAIL: '+out._err+'\n  raw: '+String(out._raw).slice(0,300)); continue; }
  console.log('\nEMITTED state_change:\n  → "'+(out.state_change||'(none)')+'"');
  console.log('\n  tactical_move : '+(out.tactical_move||'—'));
  console.log('  precondition  : '+(out.state_change_precondition||'—'));
  console.log('  forces_choice : '+(out.forces_choice||'—'));
  const sc=String(out.state_change||'');
  console.log('\n  LOAD-BEARING PAYLOAD SURVIVING IN state_change:');
  PAYLOAD.forEach(([n,re])=>console.log('    '+(re.test(sc)?'✓ ':'✗ ')+n));
  const back=TABLEAU.filter(([n,re])=>re.test(sc)).map(([n])=>n);
  console.log('  fell back to the old tableau: '+(back.length?'YES ['+back.join(', ')+']':'no'));
}
console.log('\n\nREAD (pre-registered): event-form loses staging but state-phase keeps the causal movement ⇒ goal FORMAT is the problem.');
console.log('  BOTH lose it ⇒ the re-expression itself is the problem; the spine goal should bypass state_change and reach the author directly.');
console.log('  BOTH keep it ⇒ inspect the NEXT handoff; do not assume success from planner output alone.');
process.exit(0);
