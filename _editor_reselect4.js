const { chromium } = require('playwright-core');
const fs=require('fs');
const OUT='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';
const d=JSON.parse(fs.readFileSync(OUT+'/editor_selection_npc.json','utf8'));
const numbered=d.candidates.map((c,i)=>(i+1)+'. '+c).join('\n');
const EDIT4='Below are 20 true things a night concierge might do in this moment. The story gets ONE sentence to describe this man. Pick the one that best DEMONSTRATES HIS CHARACTERISTIC COMPETENCE — the particular skill he instinctively reaches for to navigate his world.\n\nTHE TEST (competence, not observation): pick the sentence showing a mastery that is unmistakably HIS. Reject any competence that almost everyone has (suppressing fatigue, staying composed, being tidy, testing equipment) — those are universal, not characteristic. Reject sentences that merely convey facts he is not DOING anything with (trivia about the building). Favor the one where he silently SOLVES A PROBLEM in his domain that only this man — this good at this exact thing — could solve: a random desk clerk could not do it, a maitre d\' could not, a politician could not. That unswappable mastery is the point, even if the mastery is small or misplaced.\n\nOutput EXACTLY:\nPICK: <number>\nRUNNERS_UP: <two other numbers>';
(async()=>{
  const b=await chromium.launch({headless:true,channel:'chrome'});
  const p=await (await b.newContext()).newPage();
  await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForFunction(()=>window.state,{timeout:30000});
  const pick=await p.evaluate(async({sys,user})=>{const r=await fetch('/api/proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:user}],role:'SPECIALIST_RENDERER',preferredModel:'grok-4-1-fast-non-reasoning',temperature:0.4,max_tokens:60})});const j=await r.json();return String((j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||j.content||'').trim();},{sys:EDIT4,user:numbered+'\n\nYour choice:'});
  console.error('EDITOR v4 (characteristic-competence objective):\n'+pick);
  await b.close();process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
