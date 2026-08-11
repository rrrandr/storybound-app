// _worldsim_symmetric.mjs — Roman 2026-08-11. SYMMETRIC propagation: for EVERY affected entity compute
// easier/harder/newly-possible/newly-impossible (not just the threatened protagonist). Re-run the same 6 rich states.
// Score HIGH-LEVERAGE recovery (tree-openers), not raw recall. The missing half of the state transition = who GAINED options.
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy', MODEL='gpt-4o';
const DIR='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';
const SIM_SYS=[
 'You are a WORLD SIMULATOR. NOT a storyteller/planner/author. You never choose scenes, rank drama, interpret psychology, or realize goals. Given CURRENT WORLD STATE and LAST IRREVERSIBLE EVENT, compute ONLY how the world objectively changed.',
 'THE CORE COMPUTATION IS SYMMETRIC. An event never only endangers — the SAME event that takes options from one party GIVES options to another. Propagate in BOTH directions: who LOST options AND who GAINED options. NEVER stop at "who is threatened." (If the accused takes the blame, the true culprit is now unwatched and can destroy evidence, flee, or frame another — that counter-direction is usually the most important output.)',
 'Output STRICT JSON:',
 '{ "new_facts":[...],',
 '  "entities":[ for EVERY entity whose situation changed — each person present or implicated INCLUDING whoever the event helps/frees/benefits, each institution/rule, each key object, each deadline/clock, each ongoing process, the setting — {"entity":"...","easier":[...],"harder":[...],"newly_possible":[what it can now do, or what can now happen to it, that could not before],"newly_impossible":[...]} ],',
 '  "automatic_processes":[...],',
 '  "default_trajectory":"if every character vanished, the eventual outcome",',
 '  "pressure_graph":[ unresolved STATE tensions drawn from the entities above — ESPECIALLY the newly_possible of BENEFITED entities, threats to key OBJECTS, and racing CLOCKS. {"pressure":"<unresolved STATE, never an action/decision>","children":[...]} ] }',
 'CONCRETENESS: name a specific actor/object/institution; a pressure must stay true even if no one acts (NOT "she must decide"/"they need to find a way").',
 'HARD: physics only; ENUMERATE never RANK; STATES not ACTIONS; compute for EVERY entity symmetrically.'
].join('\n');
// load-bearing sets w/ leverage weight: H=opens a causal tree (counter-prop/threat-to-object/prevents-easy-out), S=supporting
const CASES=[
 {tag:'first_sacrifice',state:['Julian is not the true wish-maker.','Lirael knows this.','Julian publicly accepted blame.','The council treats the named wish-maker as liable.','The actual wish-maker is still unidentified.','The ritual cost is still active.','The collection window is closing.'],event:'Julian publicly accepted blame for the forbidden wish.',
  lb:[['Julian is now exposed to punishment.','S'],['The actual wish-maker is comparatively unwatched.','H'],['Evidence identifying the actual wish-maker can now disappear.','H'],["Lirael's silence now protects the lie but endangers Julian.",'H'],['The cost is progressing toward Julian unless redirected.','S'],['The council can act on a false record.','S']]},
 {tag:'noir_crime',state:['The detective proved the victim lied about their alibi.',"The victim was secretly meeting the detective's own partner.",'The partner controls the case files and evidence room.','A second body was found this morning, linked to the first.','The mayor wants the case closed before the election in three days.','The detective is on probation.'],event:"The detective discovered the victim's true meeting was with their own partner.",
  lb:[['The partner is now a suspect who controls the evidence against them.','H'],["The evidence in the partner's custody can now be altered or destroyed.",'H'],["The detective's probation makes accusing the partner self-endangering.",'H'],['The election deadline is forcing a closure that would bury the truth.','S'],['The chain of custody can no longer be trusted.','S'],['The second body widens what the partner may be concealing.','S']]},
 {tag:'romance_betrayal',state:['She and Daniel were lovers until he vanished a year ago.','Daniel has returned engaged to her sister.','Her sister does not know their history.','Daniel left because her father paid him to.','Her father is now dying and wants reconciliation.','The wedding is in two weeks.'],event:'Daniel arrived at her door and told her he is marrying her sister.',
  lb:[["Her silence now protects her sister's marriage while concealing a betrayal.",'H'],["The father's payment is a secret whose exposure would detonate the wedding.",'H'],['Daniel becomes unavailable to her unless the wedding is stopped.','S'],["The father's dying wish for reconciliation now collides with the buried truth.",'S'],['The two-week deadline is closing the window to act before the marriage is binding.','S'],['Any disclosure now harms the innocent sister.','H']]},
 {tag:'political_heir',state:['The queen abdicated and named no heir.','The protagonist is her secret illegitimate child, known only to the chancellor.','The army is loyal to a rival duke.','The treasury is empty.','A foreign fleet is three days from the coast.',"The chancellor holds the sole proof of the protagonist's parentage."],event:"The chancellor privately told the protagonist they are the queen's rightful heir.",
  lb:[["The protagonist's claim exists only as long as the chancellor's proof survives.",'H'],["The duke's army makes any claim unenforceable without allies.",'H'],['The empty treasury forecloses buying loyalty or defense.','S'],['The approaching fleet imposes a three-day deadline on securing the throne.','S'],["The chancellor's sole custody of the proof is a single point of failure.",'H'],['Revealing the parentage now exposes the protagonist to the duke before they are protected.','H']]},
 {tag:'survival_escape',state:['Lirael and Julian crossed the bridge; it collapsed behind them.',"Julian's leg is broken.",'They have one day of water.','The pursuers are stopped on the far side.','A storm is coming.',"The only shelter is a cave holding the pursuers' ally.",'Lirael carries the stolen ledger they were sent for.'],event:'The bridge collapsed, cutting off the pursuers but leaving Julian injured.',
  lb:[["Julian's broken leg forecloses fast movement and makes him dependent on Lirael.",'H'],['The one-day water limit imposes a hard survival deadline.','S'],['The only reachable shelter is also occupied by an enemy.','H'],['The cut-off pursuers buy time but trap the pair on this side.','S'],['The coming storm will erase their trail but also threatens exposure.','S'],['The ledger remains the reason they cannot simply hide and wait.','H']]},
 {tag:'corporate_leak',state:['The whistleblower gave documents to a journalist.','The documents prove the CEO ordered the cover-up.',"The whistleblower's identity is encoded in the file metadata.","The journalist's editor sits on the company board.",'The story publishes in 48 hours.',"The whistleblower's spouse works at the same company."],event:'The whistleblower handed the incriminating documents to the journalist.',
  lb:[['The metadata makes the whistleblower identifiable the moment the file is examined.','H'],["The editor's board seat means the journalist's own channel can betray the source.",'H'],["The 48-hour deadline races the company's hunt for the leak.",'H'],["The spouse's employment makes exposure a threat to two livelihoods.",'S'],['The documents are worth destroying or discrediting to whoever they implicate.','H'],['The whistleblower can no longer control who sees the source-identifying file.','S']]}
];
const DRIFT=/\b(must|needs?|has|have|ought)\s+to\b|\bmust decide\b|\bshould\b|\bfind(?:s|ing)?\s+a\s+way\b|\bfigure(?:s|d)?\s+out\b|\bdecide(?:s)?\s+(?:how|whether|what|to)\b|\bconfront\b/i;
function flat(g,o){o=o||[];(g||[]).forEach(n=>{if(n&&typeof n==='object'){if(n.pressure)o.push(n.pressure);flat(n.children,o);}else if(typeof n==='string')o.push(n);});return o;}
async function call(sys,usr,mt){for(let a=0;a<2;a++){try{const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:0.3,max_tokens:1400,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}catch(e){if(a)return null;await new Promise(x=>setTimeout(x,1500));}}}
const MATCH_SYS='For each TARGET pressure, decide whether ANY pressure in the CANDIDATE list expresses the SAME underlying unresolved tension (semantic match, ignore wording). Return STRICT JSON {"results":[{"target":"...","covered":true|false}]}.';
fs.mkdirSync(DIR,{recursive:true});
console.log('=== WORLD SIMULATOR — SYMMETRIC propagation, HIGH-LEVERAGE recovery ('+MODEL+') ===\n');
const out={};let H=0,Hrec=0,tot=0,rec=0,drift=0;
for(const c of CASES){
 const g=await call(SIM_SYS,'CURRENT WORLD STATE:\n'+c.state.map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+c.event+'\n\nReturn the JSON now.',1400);
 if(!g){console.log('── '+c.tag+' SIM ERROR');continue;}
 const ps=flat(g.pressure_graph);const dr=ps.filter(p=>DRIFT.test(p));
 const m=await call(MATCH_SYS,'CANDIDATE pressures:\n'+ps.map(p=>'- '+p).join('\n')+'\n\nTARGET pressures:\n'+c.lb.map(x=>'- '+x[0]).join('\n')+'\n\nReturn the JSON now.',700)||{results:[]};
 const res=m.results||[];
 const cov=t=>{const rr=res.find(r=>r.target&&t.startsWith(r.target.slice(0,25)));return rr?rr.covered:res.some(r=>r.covered&&r.target&&r.target.slice(0,20)===t.slice(0,20));};
 let hh=0,hr=0,tt=0,rr2=0;const misH=[];
 c.lb.forEach((x,i)=>{const covered=res[i]?res[i].covered:false;tt++;if(covered)rr2++;if(x[1]==='H'){hh++;if(covered)hr++;else misH.push(x[0]);}});
 out[c.tag]={pressures:ps,entities:(g.entities||[]).map(e=>e.entity),drift:dr};
 H+=hh;Hrec+=hr;tot+=tt;rec+=rr2;drift+=dr.length;
 console.log('── '+c.tag.padEnd(18)+'HIGH-leverage '+hr+'/'+hh+'   (overall '+rr2+'/'+tt+')   entities='+((g.entities||[]).length)+'   drift='+dr.length);
 if(misH.length)console.log('     MISSED HIGH-LEVERAGE: '+misH.join(' · '));
 if(dr.length)console.log('     DRIFT: '+dr.slice(0,3).join(' · '));
}
fs.writeFileSync(DIR+'/symmetric_report.json',JSON.stringify(out,null,1));
console.log('\nSUMMARY: HIGH-LEVERAGE recovery '+Hrec+'/'+H+' ('+Math.round(100*Hrec/H)+'%)   overall '+rec+'/'+tot+'   action-drift '+drift);
console.log('(vs asymmetric baseline: overall was 28/36=78%, high-leverage misses were the counter-propagation pressures.)');
process.exit(0);
