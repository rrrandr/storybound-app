import fs from 'fs';
const A1={p:'test/fixtures/benchmark-A/A1_underwater_kwisheen.png', s:'a human woman and a KWISHEEN (tentacles, coral hair), UNDERWATER, floating; a red twisted X-burst may appear on <=1 panel.', want:'0 (burst X-marks are NOT text)'};
const A2={p:'test/fixtures/benchmark-A/A2_land_firstfavored.png', s:'a human woman and a FIRST FAVORED (bipedal, ordinary ears), white willow forest, ON LAND; a red twisted X-burst may appear on <=1 panel.', want:'4 (PHASE labels) — NOT the burst X-marks'};
const BASE=(s)=>`You judge ONLY the lettering in a Storybound 2x2 comic sheet (panels TL=1 TR=2 BL=3 BR=4). Ignore anatomy, poses, colour, backgrounds — another stage owns those.
SCENE context: ${s}
STEP 1 — TRANSCRIBE: list EVERY piece of text/lettering visible anywhere in the art, verbatim, with its panel. Miss nothing — captions, labels, sound effects, signs, titles.
STEP 2 — CLASSIFY each: valid comic SOUND EFFECT matching a depicted action → "sfx-ok"; OR stray text (caption box, "PHASE: X" label, phase/panel/instruction word, title, word for no depicted action) → "text-leak".
Output ONLY JSON: {"visible_text":[{"panel":N,"text":"...","verdict":"..."}],"defects":[{"panel":1-4,"class":"text-leak","text":"..."}]}. No prose.`;
const FX=(s)=>`You judge ONLY the lettering in a Storybound 2x2 comic sheet (panels TL=1 TR=2 BL=3 BR=4). Ignore anatomy, poses, colour, backgrounds — another stage owns those.
GRAPHIC MARKS ARE NOT TEXT: the jagged X-strokes of a wish/twist BURST, hatching, motion/speed lines, sparkles, impact stars, or scratch marks are ART, not lettering — do NOT transcribe them. Only real LETTERING that forms a word, label, or piece of signage counts as text.
SCENE context: ${s}
STEP 1 — TRANSCRIBE: list every piece of real LETTERING visible (words, labels, signage, sound-effect words), verbatim, with its panel. If a mark is a graphic effect (burst stroke, hatching, motion line) rather than a letter forming a word, SKIP it.
STEP 2 — CLASSIFY each: valid comic SOUND EFFECT matching a depicted action → "sfx-ok"; OR stray text (caption box, "PHASE: X" label, phase/panel/instruction word, title, word for no depicted action) → "text-leak".
Output ONLY JSON: {"visible_text":[{"panel":N,"text":"...","verdict":"..."}],"defects":[{"panel":1-4,"class":"text-leak","text":"..."}]}. No prose.`;
async function run(p,img){ const b={model:'gemini-2.5-flash',temperature:0,max_tokens:1800,messages:[{role:'user',content:[{type:'text',text:p},{type:'image',mime_type:'image/png',data:fs.readFileSync(img).toString('base64')}]}]};
  const r=await fetch('http://localhost:3000/api/gemini-proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}); const d=await r.json(); const t=d.content||d.choices?.[0]?.message?.content||''; try{const j=JSON.parse(t.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim()); return (j.defects||[]).length;}catch(_){return 'PARSE_ERR';} }
for(const [name,mk] of [['BASELINE',BASE],['+FX-EXCLUDE',FX]]){
  for(const f of [{n:'A1',...A1},{n:'A2',...A2}]){
    const out=[]; for(let i=0;i<3;i++) out.push(await run(mk(f.s),f.p));
    console.log(`${name.padEnd(12)} ${f.n}: text-leaks=[${out.join(',')}]   want ${f.want}`);
  }
}
