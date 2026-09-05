// _density_diag.mjs — why did _density.mjs report Alliance→Trust = 1/40 when the SAME old criterion re-scores 35/38?
// Reproduce the ORIGINAL classify call verbatim (max_tokens=900, no index field, no why) and inspect the raw response:
// finish_reason / length / parse success / tags length. Instrument-validation before believing either number.
import fs from 'fs';
const PROXY='http://localhost:3000/api/chatgpt-proxy',MODEL='gpt-4o';
const REP='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f2a30fbd-80de-4073-a19c-95387649d8cc/scratchpad/density_recheck.json';
const CLS_OLD='For each event classify: "concrete" = a specific action/moment a reader watches happen (NOT a summary like "they grow closer"/"trust deepens"); "advances" = it deepens the Lirael–Julian relationship; "achieves" = it already fully constitutes the TARGET milestone. Return STRICT JSON {"tags":[{"concrete":bool,"advances":bool,"achieves":bool}]}.';
const rep=JSON.parse(fs.readFileSync(REP,'utf8'));
const G=rep['Alliance→Trust'];
// rebuild the exact distinct list scored in the recheck
const distinct=[...new Set([...(G.new_usable_events||[]),...(G.flipped||[]),...(G.lost||[])])];
console.log('scoring '+distinct.length+' events (subset of the '+G.distinct+' distinct) with the ORIGINAL call shape\n');
const body='TARGET milestone: genuine mutual trust\n\nEVENTS:\n'+distinct.map((e,i)=>i+'. '+e).join('\n')+'\n\nReturn the JSON now.';
for(const mt of [900,2600]){
  const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:CLS_OLD},{role:'user',content:body}],role:'PRIMARY_AUTHOR',model:MODEL,temperature:0,max_tokens:mt,jsonMode:true})});
  const d=await r.json();
  const c=(d&&d.content)||(d.choices&&d.choices[0].message.content)||'';
  const fin=(d.choices&&d.choices[0].finish_reason)||d.finish_reason||'(not exposed)';
  let parsed=null,err='';
  try{parsed=JSON.parse(c.match(/\{[\s\S]*\}/)[0]);}catch(e){err=e.message;}
  const tags=(parsed&&parsed.tags)||[];
  const usable=tags.filter(t=>t&&t.concrete&&t.advances&&!t.achieves).length;
  console.log('max_tokens='+mt+'  finish_reason='+fin+'  chars='+c.length+'  parse='+(parsed?'OK':'FAIL('+err+')')+'  tags='+tags.length+'/'+distinct.length+'  usable='+usable);
  if(!parsed)console.log('  tail: ...'+c.slice(-120).replace(/\n/g,' '));
}
console.log('\nIf max_tokens=900 truncates (finish_reason=length / parse FAIL / short tags array), the original 1/40 was an');
console.log('INSTRUMENT TRUNCATION BUG, not a criterion artifact — the early gap was never sparse.');
process.exit(0);
