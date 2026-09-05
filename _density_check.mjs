// _density_check.mjs — Roman 2026-08-11. RE-MEASURE of the Alliance→Trust gap from _density.mjs (measured 1/40 usable).
// HYPOTHESIS: that 1/40 is a CLASSIFIER ARTIFACT — "advances" was defined as "deepens the relationship", which reads as
// TENDERNESS and rejects TRUST-THROUGH-SHARED-ACTION (he lies to protect her / they almost get caught / she realizes he
// risked himself) = how early romance actually bonds when there is no shared history yet.
// DESIGN: enumerate the bridge space ONCE, then classify the SAME events under BOTH criteria (old vs corrected).
// Paired + function-matched → the delta is the artifact, not a re-roll. Control gap (Dependence→Almost-confession, already
// 39/40) included to check the corrected criterion is not simply laxer across the board.
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const DIR='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f2a30fbd-80de-4073-a19c-95387649d8cc/scratchpad';
const SIM_SYS=eval('['+fs.readFileSync('_worldsim_symmetric.mjs','utf8').match(/const SIM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/)[1]+'].join("\\n")');
const ENUM_SYS='You are a scene PLANNER. Given a WORLD-STATE IR and a BRIDGE GOAL, enumerate DISTINCT CONCRETE scene-events — specific moments a reader WATCHES HAPPEN (e.g. "she quietly gives him half her bread", "he lies to the guard to cover for her") — that each deepen the relationship a step toward the goal WITHOUT fully achieving it yet. NOT relationship-summaries ("they grow closer"). Return STRICT JSON {"events":["<concrete scene-event>",...]} ~10.';

// OLD criterion — verbatim from _density.mjs (the suspected artifact).
const CLS_OLD='For each event classify: "concrete" = a specific action/moment a reader watches happen (NOT a summary like "they grow closer"/"trust deepens"); "advances" = it deepens the Lirael–Julian relationship; "achieves" = it already fully constitutes the TARGET milestone. Return STRICT JSON {"tags":[{"i":<index>,"concrete":bool,"advances":bool,"achieves":bool,"why":"<6 words>"}]}.';

// CORRECTED criterion — "advances" counts TRUST-THROUGH-SHARED-ACTION, not only tenderness.
const CLS_NEW=[
 'For each event classify three booleans.',
 '"concrete" = a specific action/moment a reader WATCHES HAPPEN (NOT a summary like "they grow closer"/"trust deepens").',
 '"advances" = the event CHANGES WHAT ONE OF THEM KNOWS OR BELIEVES ABOUT THE OTHER, or raises what they have staked on each other. This includes BOTH:',
 '  (a) INTIMACY — tenderness, confiding, vulnerability, physical closeness, attention noticed; AND',
 '  (b) TRUST THROUGH SHARED ACTION — one takes a risk or cost for the other; one covers, lies for, or protects the other; they become complicit in something; a shared near-miss or danger survived together; one reveals competence, nerve, or restraint under pressure that the other witnesses; one is given a real chance to betray the other and does not.',
 'Early bonds form through (b) as much as (a) — two people with no shared history earn trust by ACTING, not by confessing. Do NOT mark advances=false merely because an event looks like plot, danger, or investigation rather than romance.',
 'BUT advances=false if: only one of them is present/implicated and the other never learns of it; or nothing about their standing with each other changes (pure world-plot, e.g. "the council issues a decree"); or it only repeats a belief they already hold.',
 '"achieves" = it already fully constitutes the TARGET milestone (not merely a step toward it).',
 'Return STRICT JSON {"tags":[{"i":<index>,"concrete":bool,"advances":bool,"achieves":bool,"why":"<6 words>"}]} with one entry per event, in order.'
].join('\n');

async function call(sys,usr,mt,t){for(let a=0;a<3;a++){try{const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:usr}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:t,max_tokens:mt,jsonMode:true})});const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content);return JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}catch(e){if(a===2){console.log('  ! call failed: '+e.message);return null;}await new Promise(x=>setTimeout(x,1500));}}}
function irText(g){const e=(g.entities||[]).map(x=>{const p=[];['easier','harder','newly_possible','newly_impossible'].forEach(k=>(x[k]||[]).forEach(v=>p.push(k+':'+v)));return x.entity+' ['+p.join('; ')+']';});return 'NEW FACTS: '+(g.new_facts||[]).join(' · ')+'\nENTITIES:\n  '+e.join('\n  ');}
function toks(s){return new Set(String(s||'').toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(w=>w.length>=4));}
function jac(a,b){const A=toks(a),B=toks(b);let i=0;A.forEach(w=>{if(B.has(w))i++;});return i/(A.size+B.size-i||1);}
function dedup(list){const out=[];list.forEach(e=>{let dup=false;out.forEach(o=>{if(jac(e,o)>0.5)dup=true;});if(!dup)out.push(e);});return out;}
function byIndex(res,n){const out=new Array(n).fill(null);const t=(res&&res.tags)||[];t.forEach((x,k)=>{const i=(typeof x.i==='number'&&x.i>=0&&x.i<n)?x.i:k;if(out[i]===null)out[i]=x;});return out;}
const usableOf=(tags,i)=>!!(tags[i]&&tags[i].concrete&&tags[i].advances&&!tags[i].achieves);

const GAPS=[
 {tag:'Alliance→Trust',slots:3,from:'a reluctant alliance',to:'genuine mutual trust',
  facts:['Lirael and Julian formed a reluctant alliance to find the true wish-maker.','They barely know each other and each has reasons to distrust the other.','The ritual debt still hangs over Julian.','The council watches Julian closely.','A hidden journal hinting at the true wish-maker just surfaced.'],event:'Lirael and Julian formed a reluctant alliance.'},
 {tag:'Dependence→Almost-confession (CONTROL)',slots:7,from:'emotional dependence',to:'nearly confessing their feelings',
  facts:['Lirael and Julian have grown emotionally dependent on each other after several close calls.','They are being surveilled by the council.','The true wish-maker is strongly suspected to run a hidden network.','The ritual debt is still unresolved and the deadline nears.','Neither has admitted their feelings; both feel the pull.','They are increasingly isolated, with only each other to rely on.'],event:'Lirael came to depend on Julian emotionally during a crisis.'}
];

fs.mkdirSync(DIR,{recursive:true});
console.log('=== BETWEEN-DENSITY RE-MEASURE — same events, OLD vs CORRECTED "advances" criterion ===\n');
const rep={};
for(const G of GAPS){
 const g=await call(SIM_SYS,'CURRENT WORLD STATE:\n'+G.facts.map(f=>'- '+f).join('\n')+'\n\nLAST IRREVERSIBLE EVENT: '+G.event+'\n\nReturn the JSON now.',1400,0.4);
 const ir=irText(g);
 let raw=[];
 for(let b=0;b<4;b++){const r=await call(ENUM_SYS,ir+'\n\nBRIDGE GOAL: move from "'+G.from+'" toward "'+G.to+'" — concrete scene-events, do NOT fully achieve the goal.\n\nReturn the JSON now.',900,0.85);(r&&r.events||[]).forEach(e=>raw.push(String(e)));}
 const distinct=dedup(raw);
 const body='TARGET milestone: '+G.to+'\n\nEVENTS:\n'+distinct.map((e,i)=>i+'. '+e).join('\n')+'\n\nReturn the JSON now.';
 const oldT=byIndex(await call(CLS_OLD,body,2600,0),distinct.length);
 const newT=byIndex(await call(CLS_NEW,body,2600,0),distinct.length);
 // per-flag breakdown: a future "sparse" reading must localize to WHICH flag collapsed (the 2026-08-11 1/40 could not).
 const brk=T=>{const n=distinct.length;const miss=k=>T.filter(t=>t&&!t[k]).length;return 'concrete-fail='+miss('concrete')+' advances-fail='+miss('advances')+' achieves-FIRED='+T.filter(t=>t&&t.achieves).length+' null-tags='+T.filter(t=>!t).length+' /'+n;};
 const oldU=distinct.filter((e,i)=>usableOf(oldT,i));
 const newU=distinct.filter((e,i)=>usableOf(newT,i));
 const flipped=distinct.filter((e,i)=>!usableOf(oldT,i)&&usableOf(newT,i));
 const lost=distinct.filter((e,i)=>usableOf(oldT,i)&&!usableOf(newT,i));
 rep[G.tag]={slots:G.slots,raw:raw.length,distinct:distinct.length,old_usable:oldU.length,new_usable:newU.length,flipped,lost,new_usable_events:newU};
 console.log('── '+G.tag+'   slots='+G.slots+'   raw='+raw.length+'   distinct='+distinct.length);
 console.log('     OLD criterion  usable = '+oldU.length+'/'+distinct.length+(oldU.length>=G.slots?'  ✅':'  ⚠ SPARSE'));
 console.log('     NEW criterion  usable = '+newU.length+'/'+distinct.length+(newU.length>=G.slots?'  ✅ dense enough':'  ⚠ STILL SPARSE'));
 console.log('     flipped reject→usable = '+flipped.length+'   |   usable→reject = '+lost.length);
 console.log('     FLAGS old: '+brk(oldT));
 console.log('     FLAGS new: '+brk(newT));
 if(flipped.length){console.log('     FLIPPED (old rejected, corrected accepts) — eyeball these:');flipped.slice(0,10).forEach(e=>console.log('       · '+e.slice(0,96)));}
 if(newU.length){console.log('     ALL usable under corrected criterion:');newU.slice(0,14).forEach(e=>console.log('       + '+e.slice(0,96)));}
 console.log('');
}
fs.writeFileSync(DIR+'/density_recheck.json',JSON.stringify(rep,null,2));
console.log('READ: Alliance→Trust NEW usable ≥ 3 AND flipped events are real early-trust bridges → artifact confirmed, the between is rich end-to-end → paid prose run earned.');
console.log('      NEW still < 3 → early gap genuinely lacks material → fix structure (shorter early windows / seeded forced-proximity) before prose.');
console.log('      CONTROL should stay high but NOT jump to ~100% of distinct — if the corrected criterion accepts nearly everything, it is too lax.');
console.log('Report: '+DIR+'/density_recheck.json');
process.exit(0);
