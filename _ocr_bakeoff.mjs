// HEAD-TO-HEAD: single-pass classifier (OLD) vs enumerate-first (NEW) on labeled Benchmark A fixtures.
// The NEW arm exposes its intermediate reasoning (a transcription of ALL visible text) BEFORE classifying —
// removing the "those captions look intentional" escape hatch. That makes OCR RECALL a separate measurable
// stage from IQS RECALL: OCR misses a caption -> OCR bug; OCR finds it but IQS calls it fine -> IQS bug.
// Keep BOTH prompts; upgrade the instrument with evidence, not intuition. (Roman's design, 2026-07-21.)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(ROOT, 'test/fixtures/benchmark-A');
const PROXY = 'http://localhost:3000/api/gemini-proxy';
const N = 3;

// ---- LABELED GROUND TRUTH (from docs/benchmark-A.md) ----
const A1 = 'a human woman and a KWISHEEN (tentacle-bodied, coral-dreadlock hair, tentacles instead of legs, humanoid face) in drowned coral ruins, UNDERWATER — figures FLOAT. A red twisted X-burst may appear on at most one panel.';
const A2 = 'a human woman and a FIRST FAVORED (luminous humanoid, pointed ears, TWO legs, NO tentacles) in a pale white weeping-willow forest, ON LAND — GRAVITY applies.';
const GT = [
  { id:'A1', path:path.join(FIX,'A1_underwater_kwisheen.png'), scene:A1, textLeaks:[], clean:true },
  { id:'A2', path:path.join(FIX,'A2_land_firstfavored.png'),  scene:A2, textLeaks:['PHASE: Orientation','PHASE: Transformation','PHASE: Decision','PHASE: Threat'], clean:false }
];

// ---- OLD: single-pass full classifier (exact buildPrompt + PROMPT_TAIL) ----
const OLD = (scene) => `You are the ACCEPTANCE-QA gate for a Storybound 2x2 comic sheet (4 panels; TL=1 TR=2 BL=3 BR=4). NOT art critique — production acceptance. For ANY imperfection the ONLY question: "Would this image be REGENERATED or REPAIRED in production?" If no, NOT a defect.
SCENE (judge the render against THIS): ${scene}
HARD INVARIANTS — report ONLY these:
- species: a character drawn as the WRONG species / defining anatomy absent.
- continuity: same character duplicated (twins); or face/hair/build/clothing/colour/weapon changing between panels.
- sfx: a sound-effect word for an action NOT shown.
- text-leak: ANY word/label lettered into the art that is NOT a valid, action-matched SFX (titles, "PHASE", captions).
- burst: the wish/twist burst wrong (colour/place/dominating/standalone emblem).
- expression: a blank/wooden face in an emotional beat.
- buoyancy: a figure planted on the ground where the scene has no gravity.
- background: a dead, empty panel missing the life the world should have.
SOFT — NEVER report alone: tentacle count, minor variation, stylization, posing, composition.
For each: {"panel":1-4,"class":"...","note":"brief"}. Output ONLY JSON {"defects":[...]}. No prose.`;

// ---- NEW: enumerate-first. Transcribe ALL text, classify each token, THEN the other invariants. ----
const NEW = (scene) => `You are the ACCEPTANCE-QA gate for a Storybound 2x2 comic sheet (4 panels; TL=1 TR=2 BL=3 BR=4). Production acceptance, not art critique.
SCENE (judge against THIS): ${scene}
Work in ORDER and show the intermediate step:
STEP 1 — TRANSCRIBE: list EVERY piece of text/lettering visible anywhere in the art, verbatim, with its panel. Miss nothing — captions, labels, sound effects, signs.
STEP 2 — CLASSIFY each transcribed item: is it a valid comic SOUND EFFECT (onomatopoeia) matching an action actually depicted in that panel? Or is it STRAY TEXT — a caption box, a "PHASE: X" label, a phase/panel/instruction word, a title, or a word for no depicted action? Storybound art must contain NO caption boxes and NO labels; ANY such text is a "text-leak" defect.
STEP 3 — OTHER INVARIANTS: also check species (wrong species/anatomy absent), continuity (twins / face-hair-build-clothing-colour-weapon changing between panels), burst (wish/twist burst wrong colour/place/dominating/standalone), expression (blank face in an emotional beat), buoyancy (planted where no gravity), background (dead empty panel). SOFT (never alone): tentacle count, stylization, posing, composition.
Output ONLY JSON: {"visible_text":[{"panel":N,"text":"...","verdict":"sfx-ok"|"text-leak"}],"defects":[{"panel":1-4,"class":"...","note":"brief"}]}. Every text-leak in visible_text MUST also appear in defects as class "text-leak". No prose.`;

function parse(t){ if(!t) return null; let s=String(t).trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim(); const a=s.indexOf('{'),z=s.lastIndexOf('}'); if(a>=0&&z>a)s=s.slice(a,z+1); try{return JSON.parse(s);}catch(_){return null;} }
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function call(promptText, imgPath){
  const t0=Date.now();
  const body={ model:'gemini-2.5-flash', temperature:0, max_tokens:1800, messages:[{role:'user',content:[
    {type:'text',text:promptText}, {type:'image',mime_type:'image/png',data:fs.readFileSync(imgPath).toString('base64')} ]}]};
  let r; for(let a=0;a<4;a++){ r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); if(r.status!==429)break; await sleep(6000*(a+1)); }
  const ms=Date.now()-t0;
  if(!r.ok) return {err:r.status, ms};
  const d=await r.json();
  const text=d.content||d.choices?.[0]?.message?.content||'';
  return { parsed:parse(text), tokens:d.usage?.total_tokens||0, ms };
}
const hasPhase=(s)=>/phase\s*:/i.test(String(s||''));
const countPhaseLeaks=(defects)=>(defects||[]).filter(x=>x&&x.class==='text-leak'&&(hasPhase(x.note)||hasPhase(x.text))).length;

(async()=>{
  console.log(`OCR/IQS BAKE-OFF — old single-pass vs new enumerate-first | N=${N}/arm/fixture | model gemini-2.5-flash temp0\n`);
  for(const g of GT){
    console.log(`### ${g.id} (${g.clean?'CLEAN — GT 0 text-leaks':`GT ${g.textLeaks.length} text-leaks: ${g.textLeaks.map(t=>t.replace('PHASE: ','')).join('/')}`}) ###`);
    // OLD arm
    const oldR=[]; for(let i=0;i<N;i++){ oldR.push(await call(OLD(g.scene), g.path)); await sleep(1500); }
    const oldLeak=oldR.map(r=>r.parsed?countPhaseLeaks(r.parsed.defects):null);
    const oldOther=oldR.map(r=>r.parsed?(r.parsed.defects||[]).filter(x=>x.class!=='text-leak').length:null);
    // NEW arm
    const newR=[]; for(let i=0;i<N;i++){ newR.push(await call(NEW(g.scene), g.path)); await sleep(1500); }
    const newOCR=newR.map(r=>{ const vt=r.parsed?.visible_text||[]; return vt.filter(x=>hasPhase(x.text)).length; }); // OCR recall: PHASE labels transcribed
    const newIQS=newR.map(r=>{ const vt=r.parsed?.visible_text||[]; return vt.filter(x=>hasPhase(x.text)&&x.verdict==='text-leak').length; }); // IQS recall on transcribed
    const newLeak=newR.map(r=>r.parsed?countPhaseLeaks(r.parsed.defects):null);
    const newOther=newR.map(r=>r.parsed?(r.parsed.defects||[]).filter(x=>x.class!=='text-leak').length:null);
    const avg=(a)=>{ const n=a.filter(x=>x!=null); return n.length?+(n.reduce((x,y)=>x+y,0)/n.length).toFixed(1):'ERR'; };
    const denom=g.clean?'(want 0)':`/${g.textLeaks.length}`;
    console.log(`  OLD single-pass:  text-leak(PHASE)=[${oldLeak.join(',')}]${denom}  non-text=[${oldOther.join(',')}]  tok≈${avg(oldR.map(r=>r.tokens))}  ms≈${avg(oldR.map(r=>r.ms))}`);
    console.log(`  NEW enum-first:   OCR-recall(PHASE)=[${newOCR.join(',')}]  ->  IQS-recall=[${newIQS.join(',')}]  ->  text-leak(PHASE)=[${newLeak.join(',')}]${denom}  non-text=[${newOther.join(',')}]  tok≈${avg(newR.map(r=>r.tokens))}  ms≈${avg(newR.map(r=>r.ms))}`);
    // verdict per fixture
    if(g.clean){
      const oldFP=avg(oldLeak)+avg(oldOther), newFP=avg(newLeak)+avg(newOther);
      console.log(`  → precision(clean): OLD false-defects≈${oldFP}, NEW false-defects≈${newFP} (want ~0)\n`);
    } else {
      console.log(`  → text-leak RECALL: OLD ${avg(oldLeak)}/${g.textLeaks.length}  vs  NEW ${avg(newLeak)}/${g.textLeaks.length}   | OCR stage: ${avg(newOCR)}/${g.textLeaks.length} transcribed, ${avg(newIQS)}/${g.textLeaks.length} flagged\n`);
    }
  }
  console.log(`Legend: OCR-recall = PHASE captions the NEW arm TRANSCRIBED (step 1); IQS-recall = of those, how many it CLASSIFIED as text-leak (step 2). A gap between them isolates OCR bugs from IQS bugs.`);
})().catch(e=>{console.error('ERR',e);process.exit(1);});
