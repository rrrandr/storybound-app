const { chromium } = require('playwright-core');
const fs=require('fs');
const OUT='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';
const d=JSON.parse(fs.readFileSync(OUT+'/editor_selection_npc.json','utf8'));
const numbered=d.candidates.map((c,i)=>(i+1)+'. '+c).join('\n');
const EDIT2='Below are 20 true things a night concierge might do in this moment. You are the EDITOR: the story gets ONE sentence to describe this man. Pick the SINGLE observation that makes a reader instantly feel they have known exactly this man for years.\n\nDECISIVE CRITERION: prefer an observation where he makes a DECISION ABOUT ANOTHER PERSON — judgment deployed OUTWARD (remembering someone, anticipating a need, orienting a guest, choosing what information matters) — OVER one where he merely manages his own state (hiding fatigue, straightening his posture, polishing/aligning/rotating objects), EVEN IF the latter more tightly embodies his private feelings. Self-concealment and object-fussing are profession-first (swap concierge for butler and they still work); a decision about the guest is person-first. Reject anything that would survive that swap.\n\nOutput EXACTLY:\nPICK: <number>\nRUNNERS_UP: <two other numbers>';
(async()=>{
  const b=await chromium.launch({headless:true,channel:'chrome'});
  const p=await (await b.newContext()).newPage();
  await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForFunction(()=>window.state,{timeout:30000});
  const pick=await p.evaluate(async({sys,user})=>{const r=await fetch('/api/proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:sys},{role:'user',content:user}],role:'SPECIALIST_RENDERER',preferredModel:'grok-4-1-fast-non-reasoning',temperature:0.4,max_tokens:60})});const j=await r.json();return String((j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||j.content||'').trim();},{sys:EDIT2,user:numbered+'\n\nYour choice:'});
  console.error('EDITOR v2 (decision-axis):\n'+pick);
  await b.close();process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
