import fs from 'fs';
const IMG = 'test/fixtures/benchmark-A/A2_land_firstfavored.png';
const FF = 'a human woman and a FIRST FAVORED (luminous humanoid, pointed ears, TWO legs, NO tentacles) in a pale white weeping-willow forest, ON LAND — GRAVITY applies.';
// EXACT full classifier prompt (buildPrompt + PROMPT_TAIL from _sheet_defect_classifier.mjs)
const buildPrompt = (scene) => `You are the ACCEPTANCE-QA gate for a Storybound 2x2 comic sheet (4 panels; reading order TL=1, TR=2, BL=3, BR=4). This is NOT art critique — it is production acceptance. For ANY imperfection the ONLY question is:

  "Would this image be REGENERATED or REPAIRED in production?"

If no, it is NOT a defect — do not report it. Storybound is deliberately tolerant of artistic/stylistic variation.

SCENE (judge the render against THIS expected content): ${scene}

HARD INVARIANTS — report ONLY these (each would trigger a regen/repair):`;
const PROMPT_TAIL = `
- species: a character drawn as the WRONG species.
- continuity: the SAME character duplicated ("twins"); or face/hair/build/clothing/colour changing between panels; or a weapon changing shape or vanishing.
- sfx: a sound-effect word for an action NOT shown.
- text-leak: ANY word/label lettered into the art that is NOT a valid, action-matched SFX (titles, "PHASE", "FATE BURST", captions).
- burst: the wish/twist burst WRONG.
- expression: a blank/wooden face on a character in an emotional beat.
- buoyancy: a figure planted on the ground where the scene has no gravity.
- background: a dead, empty panel missing the life the world should have.

SOFT — NEVER report alone: tentacle count, minor variation, stylization, posing, composition.
For each HARD defect: {"panel":1-4,"class":"...","locality":"...","severity":"...","note":"brief"}.
Output ONLY JSON {"defects":[...]}. No prose.`;
const body={ model:'gemini-2.5-flash', temperature:0, max_tokens:1400, messages:[{role:'user',content:[
  {type:'text',text:buildPrompt(FF)+PROMPT_TAIL}, {type:'image',mime_type:'image/png',data:fs.readFileSync(IMG).toString('base64')} ]}]};
const r=await fetch('http://localhost:3000/api/gemini-proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const d=await r.json();
const t=(d.content||d.choices?.[0]?.message?.content||'');
console.log('FULL-PROMPT classifier on A2:\n', t);
