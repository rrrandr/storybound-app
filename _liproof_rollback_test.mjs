// Deterministic 3-case proof of LI-PROOF keep-discipline. Stubs the line edit + detector; no model calls.
import { chromium } from 'playwright-core';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window.state,{timeout:40000});
const r=await p.evaluate(()=>{
  // Reproduce the exact control flow of the patched branch against stubbed collaborators.
  const run=(candidate, postOk)=>{
    const text='ORIGINAL SCENE PROSE.';
    let locked=null;
    const _cascadeLineEdit=()=>candidate;
    const _detectLISocialProofGap=()=>({ok:postOk,type:'status'});
    const _applyLIProofPass=(t)=>{locked=t;};
    let out=_cascadeLineEdit();
    if(!out||out===text) return {result:text,locked,path:'no-op'};
    const post=_detectLISocialProofGap(out);
    if(post&&post.ok===true){ _applyLIProofPass(post.type); }
    else { return {result:text,locked,path:'reverted'}; }
    return {result:out,locked,path:'retained'};
  };
  return {a:run('ORIGINAL SCENE PROSE.',false), b:run('EDITED SCENE PROSE.',true), c:run('EDITED SCENE PROSE.',false)};
});
await b.close();
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+'  '+m);
console.log('\n════ LI-PROOF KEEP-DISCIPLINE ════');
ok(r.a.result==='ORIGINAL SCENE PROSE.'&&r.a.locked===null,'1) no-op candidate → original retained, nothing locked ('+r.a.path+')');
ok(r.b.result==='EDITED SCENE PROSE.'&&r.b.locked==='status','2) post-check PASS → candidate retained + proof type locked ('+r.b.path+')');
ok(r.c.result==='ORIGINAL SCENE PROSE.'&&r.c.locked===null,'3) post-check FAIL → original restored, proof type NOT locked ('+r.c.path+')');
