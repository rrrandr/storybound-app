// _enum_plumbing_check.mjs — Roman 2026-08-11. PLUMBING VERIFICATION ONLY (not a quality metric).
// Two false-green metrics today ⇒ prove the concreteness constraint (a) is in the ENUM_SYS the harness builds,
// (b) is on the wire in the actual outgoing request, and (c) measurably changed the output. Nothing else.
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const SRC=fs.readFileSync('_serial20_windowed.mjs','utf8');

// (a) rebuild ENUM_SYS exactly as the harness builds it, from the harness source
const m=SRC.match(/const ENUM_SYS=\[([\s\S]*?)\]\.join\('\\n'\);/);
if(!m){console.log('FAIL(a): ENUM_SYS is not the array form — the edit did not land.');process.exit(1);}
const ENUM_SYS=eval('['+m[1]+"].join('\\n')");
const CLAUSES=['CONCRETENESS','SPECIFIC MOMENT A READER WATCHES HAPPEN','BANNED','relationship-summaries','WHO THE STORY IS ABOUT','two LEADS on stage'];
const missing=CLAUSES.filter(c=>!ENUM_SYS.includes(c));
console.log('(a) ENUM_SYS built by the harness: '+ENUM_SYS.length+' chars, '+ENUM_SYS.split('\n').length+' lines');
console.log('    required clauses present: '+(CLAUSES.length-missing.length)+'/'+CLAUSES.length+(missing.length?'  MISSING: '+missing.join(', '):'  ✅'));
console.log('    ── exact string that will be sent as the system message ──');
ENUM_SYS.split('\n').forEach(l=>console.log('    │ '+l));

// (b) prove it is ON THE WIRE — wrap fetch, dump the system message actually serialized into the request body
let wire=null;
const realFetch=globalThis.fetch;
// NOTE: must call the WRAPPED globalThis.fetch below — calling realFetch directly bypasses the tap
// and reports a false ❌ (did exactly that on the first pass).
globalThis.fetch=async(u,o)=>{try{wire=JSON.parse(o.body).messages.find(x=>x.role==='system').content;}catch(_){}return realFetch(u,o);};
const IR='NEW FACTS: Lirael and Julian are covertly investigating the true wish-maker · The council has begun questioning Julian\nENTITIES:\n  Julian [harder:move openly; newly_possible:confide in Lirael]\n  Lirael [easier:access the archive; harder:be seen with Julian]\n  The council [easier:justify surveillance]';
const r=await globalThis.fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:ENUM_SYS},{role:'user',content:IR+'\n\nSTORY GOAL: Lirael and Julian come to genuinely trust each other\n\nReturn the JSON now.'}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:0.7,max_tokens:900,jsonMode:true})});
globalThis.fetch=realFetch;
const d=await r.json();const c=(d&&d.content)||(d.choices&&d.choices[0].message.content)||'';
let evs=[];try{evs=JSON.parse(c.match(/\{[\s\S]*\}/)[0]).events||[];}catch(e){}
console.log('\n(b) system message ON THE WIRE matches the built ENUM_SYS: '+(wire===ENUM_SYS?'✅ byte-identical':'❌ DIFFERS')+'   (wire='+((wire||'').length)+' chars)');
console.log('    live enumerate returned '+evs.length+' events:');
evs.slice(0,10).forEach(e=>console.log('      · '+String(e).slice(0,94)));

// (c) DELIBERATELY OMITTED. The first version regex-counted lead MENTIONS and summary phrasing across the two
// saved chains — it scored BEFORE 19/20 leads vs AFTER 20/20, i.e. it read nearly-green on the council procedural.
// It could not see the actual defect: "a council member sympathetic to Julian's plight" MENTIONS a lead while the
// lead is neither actor nor target. Actor-vs-subject is what broke, and a mention-regex cannot measure it.
// Per Roman (2026-08-11): no new proxy metric before the blind read. Plumbing is (a)+(b); the output-side evidence
// is the two chains read directly, which is what the blind A/B is for.
console.log('\nPASS = (a) clauses present AND (b) byte-identical on the wire. Output quality is NOT scored here — that is the blind read.');
process.exit(0);
