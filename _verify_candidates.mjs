import { classify } from './_two_channel_classifier.mjs';
import { judge } from './_verify_repair.mjs';
const N=3, sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tier=(k,n)=>(k/n>=0.75?'high':k/n>=0.4?'medium':'low');
const A4='two ORDINARY HUMANS (Nora, a woman; Daniel, a man) in a heated but non-violent conversation across a table in a contemporary café interior — both present every panel, other patrons behind. A still dialogue beat: no action, no weapons, no magic, no burst, no SFX.';
async function corroborate(img){ const runs=[]; for(let i=0;i<N;i++){ runs.push(await classify(img,A4)); await sleep(600);} 
  const per=runs.map(r=>new Set([...r.text,...r.visual].map(d=>`${d.class}:p${d.panel}`)));
  const keys=new Set(per.flatMap(s=>[...s])); const set=[];
  for(const k of keys){ const c=per.filter(s=>s.has(k)).length; const [cls,panel]=k.split(':'); set.push({key:k,class:cls,panel,confidence:tier(c,N)}); }
  return set; }
const pre=[{key:'anatomy:p2',class:'anatomy',panel:'p2',confidence:'high'},{key:'anatomy:p4',class:'anatomy',panel:'p4',confidence:'high'}];
const SC='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/564e636e-ec4e-4bd6-9260-4dce17cb1833/scratchpad';
(async()=>{
  console.log('IMPROVED-KLEIN candidates — oracle verdict (accept first that clears anatomy:p2)\n');
  let accepted=null;
  for(const s of [1,2,3]){
    const cand=await corroborate(`${SC}/A4_p2_klein_s${s}.png`);
    const v=judge(pre,cand,'anatomy:p2');
    const present=cand.filter(d=>['high','medium'].includes(d.confidence)).map(d=>`${d.key}(${d.confidence})`).join(', ')||'—';
    console.log(`  seed ${s}: {${present}}  →  §1 target-gone=${v.targetGone?'✓':'✗'} no-new=${v.noNew?'✓':'✗'} unrelated=${v.unrelatedPreserved?'✓':'✗'}  ⇒ ${v.accept?'ACCEPT ✓':'rollback'}`);
    if(v.accept && !accepted) accepted=s;
  }
  console.log(`\n=== ${accepted?`ACCEPTED seed ${accepted} — hand repair SUCCEEDED (baseline had 0/1; improved lands a pass)`:'all 3 rolled back — hand still hard; more shots / bigger levers needed'} ===`);
})().catch(e=>{console.error('ERR',e);process.exit(1);});
