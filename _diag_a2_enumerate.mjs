import fs from 'fs';
const IMG = 'test/fixtures/benchmark-A/A2_land_firstfavored.png';
const prompt = `Look at this 2x2 comic sheet (panels TL=1 TR=2 BL=3 BR=4).
STEP 1 — TRANSCRIBE: list EVERY piece of text/lettering visible anywhere in the image, verbatim, with its panel.
STEP 2 — CLASSIFY each transcribed item:
  - Is it a valid comic SOUND EFFECT (onomatopoeia) that matches an action actually depicted in that panel? (e.g. SLICE with a blade cut)
  - Or is it STRAY TEXT — a caption box, a label like "PHASE: X", a phase/panel/instruction word, a title, or a word for no depicted action? Storybound comics must contain NO caption boxes and NO labels; ANY such text is a defect ("text-leak").
Output ONLY JSON: {"visible_text":[{"panel":N,"text":"...","verdict":"sfx-ok"|"text-leak","why":"..."}]}`;
const body={ model:'gemini-2.5-flash', temperature:0, max_tokens:1600, messages:[{role:'user',content:[
  {type:'text',text:prompt}, {type:'image',mime_type:'image/png',data:fs.readFileSync(IMG).toString('base64')} ]}]};
const r=await fetch('http://localhost:3000/api/gemini-proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const d=await r.json();
console.log('ENUMERATE-FIRST on A2:\n', (d.content||d.choices?.[0]?.message?.content||''));
