import fs from 'fs';
const NEW = (scene) => `You are the ACCEPTANCE-QA gate for a Storybound 2x2 comic sheet (4 panels; TL=1 TR=2 BL=3 BR=4). Production acceptance, not art critique.
SCENE (judge against THIS): ${scene}
STEP 1 — TRANSCRIBE every piece of text/lettering visible, verbatim, with panel.
STEP 2 — CLASSIFY each: valid action-matched SFX, or STRAY TEXT (caption/label/"PHASE:"/title) = "text-leak".
STEP 3 — OTHER INVARIANTS: species, continuity(twins/attributes changing), burst(wrong colour/place/dominating/standalone), expression(blank in emotional beat), buoyancy(planted where no gravity), background(dead empty). SOFT never alone: tentacle count, stylization, posing, composition.
Output ONLY JSON: {"visible_text":[...],"defects":[{"panel":1-4,"class":"...","note":"brief"}]}. No prose.`;
const cases=[
 {id:'A1',path:'test/fixtures/benchmark-A/A1_underwater_kwisheen.png',scene:'human woman + KWISHEEN (tentacles, coral hair), UNDERWATER, floating; red twisted X-burst allowed on <=1 panel.'},
 {id:'A2',path:'test/fixtures/benchmark-A/A2_land_firstfavored.png',scene:'human woman + FIRST FAVORED (bipedal, no tentacles), white willow forest, ON LAND, gravity.'}
];
for(const c of cases){
  const body={model:'gemini-2.5-flash',temperature:0,max_tokens:1800,messages:[{role:'user',content:[{type:'text',text:NEW(c.scene)},{type:'image',mime_type:'image/png',data:fs.readFileSync(c.path).toString('base64')}]}]};
  const r=await fetch('http://localhost:3000/api/gemini-proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json(); const t=d.content||d.choices?.[0]?.message?.content||''; let p; try{p=JSON.parse(t.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim());}catch(_){p=null;}
  console.log(`\n### ${c.id} NEW non-text defects ###`);
  (p?.defects||[]).filter(x=>x.class!=='text-leak').forEach(x=>console.log(`  [${x.class}] p${x.panel}: ${x.note}`));
}
