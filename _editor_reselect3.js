const { chromium } = require('playwright-core');
const fs=require('fs');
const OUT='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';
const d=JSON.parse(fs.readFileSync(OUT+'/editor_selection_npc.json','utf8'));
const numbered=d.candidates.map((c,i)=>(i+1)+'. '+c).join('\n');
const EDIT3='Below are 20 true things a night concierge might do in this moment. The story gets ONE sentence to describe this man. Pick the sentence that TEACHES THE READER THE MOST ABOUT THIS SPECIFIC PERSON.\n\nTHE ONLY TEST — information, nothing else: before the sentence, a reader could imagine a huge range of people this concierge might be. Pick the sentence that COLLAPSES that range the MOST — after which the fewest other people could be the man being described. A sentence that would equally fit a maitre d\', a flight attendant, a politician, or a CEO teaches almost nothing about THIS individual (it reveals a general emotional state, not a person) — reject it. Favor the sentence that compresses the MOST distinct things about him at once (his history, tenure, pride, competence, how he reads people, his bond to this particular place). Do NOT reward internal elegance or how neatly it embodies one feeling; reward sheer amount of person conveyed.\n\nOutput EXACTLY:\nPICK: <number>\nRUNNERS_UP: <two other numbers>';
(async()=>{
  const b=await chromium.launch({headless:true,channel:'chrome'});
  const p=await (await b.newContext()).newPage();
  await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForFunction(()=>window.state,{timeout:30000});
  const pick=await p.evaluate(async({sys,user})=>{const r=await fetch('/api/proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:user}],role:'SPECIALIST_RENDERER',preferredModel:'grok-4-1-fast-non-reasoning',temperature:0.4,max_tokens:60})});const j=await r.json();return String((j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||j.content||'').trim();},{sys:EDIT3,user:numbered+'\n\nYour choice:'});
  console.error('EDITOR v3 (information / compression objective):\n'+pick);
  await b.close();process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
