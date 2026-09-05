import fs from 'fs';
const IMG='test/fixtures/benchmark-A/A1_underwater_kwisheen.png';
const SCENE='a human woman and a KWISHEEN (tentacle-bodied, coral-dreadlock hair, tentacles instead of legs, humanoid face) in drowned coral ruins, UNDERWATER — figures FLOAT. A red twisted X-burst may appear on at most one panel.';
// OLD text prompt (last-known-good: A1 gave 0 text-leaks)
const OLD=(s)=>`You judge ONLY the lettering in a Storybound 2x2 comic sheet (panels TL=1 TR=2 BL=3 BR=4). Ignore anatomy, poses, colour, backgrounds — another stage owns those.
SCENE context: ${s}
STEP 1 — TRANSCRIBE: list EVERY piece of text/lettering visible anywhere in the art, verbatim, with its panel. Miss nothing — captions, labels, sound effects, signs, titles.
STEP 2 — CLASSIFY each item: a valid comic SOUND EFFECT matching an action depicted → "sfx-ok"; OR stray text (caption box, "PHASE: X" label, phase/panel/instruction word, title, word for no depicted action) → "text-leak".
Output ONLY JSON: {"visible_text":[{"panel":N,"text":"...","verdict":"sfx-ok"|"text-leak"}],"defects":[{"panel":1-4,"class":"text-leak","text":"..."}]}. No prose.`;
// NEW text prompt (current: A1 gave 17)
const NEW=(s)=>`You judge ONLY the lettering in a Storybound 2x2 comic sheet (panels TL=1 TR=2 BL=3 BR=4). Ignore anatomy, poses, colour, backgrounds — another stage owns those.
SCENE context: ${s}
STEP 1 — TRANSCRIBE: list EVERY piece of text/lettering visible anywhere in the art, verbatim, with its panel. Miss nothing — captions, labels, sound effects, signs, titles.
STEP 2 — CLASSIFY each item: a valid comic SOUND EFFECT matching an action depicted → "sfx-ok"; OR stray text — a caption box, a "PHASE: X" label, a phase/panel/instruction word, a title, a character's NAME as signage, or a word for no depicted action → "text-leak".
STEP 3 — assign each text-leak a CONFIDENCE: high = caption box/"PHASE:"/character NAME; low = garbled/nonsense background signage where signage is expected (a city); medium = in between.
Output ONLY JSON: {"visible_text":[{"panel":N,"text":"...","verdict":"sfx-ok"|"text-leak"}],"defects":[{"panel":1-4,"class":"text-leak","confidence":"high|medium|low","text":"..."}]}. No prose.`;
async function run(p){ const b={model:'gemini-2.5-flash',temperature:0,max_tokens:1800,messages:[{role:'user',content:[{type:'text',text:p},{type:'image',mime_type:'image/png',data:fs.readFileSync(IMG).toString('base64')}]}]};
  const r=await fetch('http://localhost:3000/api/gemini-proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const d=await r.json(); const t=d.content||d.choices?.[0]?.message?.content||''; try{return JSON.parse(t.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim());}catch(_){return {parseErr:t.slice(0,200)};} }
for(const [name,mk] of [['OLD',OLD],['NEW',NEW]]){
  const p=await run(mk(SCENE));
  const vt=p?.visible_text||[]; const df=p?.defects||[];
  console.log(`\n=== ${name}: visible_text=${vt.length}, defects=${df.length} ===`);
  console.log('  transcribed:', vt.slice(0,20).map(x=>`p${x.panel}:"${x.text}"[${x.verdict}]`).join('  '));
  if(p.parseErr) console.log('  PARSE ERR:', p.parseErr);
}
