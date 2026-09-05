import fs from 'fs';
const A1='human woman + KWISHEEN (tentacles, coral hair), UNDERWATER, floating; red twisted X-burst allowed on <=1 panel.';
const A2='human woman + FIRST FAVORED (luminous, bipedal, no tentacles), white willow forest, ON LAND, gravity; red twisted X-burst allowed on <=1 panel.';
// CURRENT visual prompt (single-pass, with inline anti-twins guard that FAILED)
const CUR=(s)=>`ACCEPTANCE-QA for the VISUALS of a 2x2 comic sheet (TL=1 TR=2 BL=3 BR=4). Ignore all text.
SCENE: ${s}
Report ONLY: species, continuity (SAME character duplicated "twins", or attributes changing between panels; two DIFFERENT characters present = correct casting, not a defect), burst, expression, buoyancy, background. SOFT never alone: tentacle count, stylization, posing.
Output ONLY JSON {"defects":[{"panel":1-4,"class":"...","note":"..."}]}. No prose.`;
// ROSTER-FIRST: establish cast, recurrence across panels is expected, duplication only WITHIN one panel
const ROS=(s)=>`ACCEPTANCE-QA for the VISUALS of a 2x2 comic sheet (TL=1 TR=2 BL=3 BR=4). Ignore all text.
SCENE: ${s}
STEP 1 — CAST ROSTER: list each DISTINCT character visible across the whole sheet by appearance (e.g. "woman, brown hair, tan vest"). A comic shows the SAME characters repeatedly across panels — a character recurring in multiple panels is EXPECTED and is NOT duplication.
STEP 2 — DUPLICATION: only a continuity defect if a SINGLE character is drawn TWICE WITHIN ONE panel (true twins in one frame), or a character's hair/build/clothing/colour changes between panels. Recurrence across panels is never a defect.
STEP 3 — OTHER: species, burst, expression, buoyancy, background. SOFT never alone: tentacle count, stylization, posing.
Output ONLY JSON {"roster":["..."],"defects":[{"panel":1-4,"class":"...","note":"..."}]}. No prose.`;
async function call(p,img){ const b={model:'gemini-2.5-flash',temperature:0,max_tokens:1600,messages:[{role:'user',content:[{type:'text',text:p},{type:'image',mime_type:'image/png',data:fs.readFileSync(img).toString('base64')}]}]};
  const r=await fetch('http://localhost:3000/api/gemini-proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const d=await r.json(); const t=d.content||d.choices?.[0]?.message?.content||''; try{return JSON.parse(t.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim());}catch(_){return null;} }
const cont=(p)=>(p?.defects||[]).filter(x=>x.class==='continuity').length;
const all=(p)=>(p?.defects||[]).length;
for(const [id,img,scene] of [['A2','test/fixtures/benchmark-A/A2_land_firstfavored.png',A2],['A1','test/fixtures/benchmark-A/A1_underwater_kwisheen.png',A1]]){
  const N=id==='A2'?4:2; const cu=[],ro=[],cuA=[],roA=[];
  for(let i=0;i<N;i++){ const c=await call(CUR(scene),img); cu.push(cont(c)); cuA.push(all(c)); }
  for(let i=0;i<N;i++){ const r=await call(ROS(scene),img); ro.push(cont(r)); roA.push(all(r)); }
  console.log(`${id} (GT: 0 visual defects)  CURRENT continuity=[${cu.join(',')}] all=[${cuA.join(',')}]   ROSTER-FIRST continuity=[${ro.join(',')}] all=[${roA.join(',')}]`);
}
