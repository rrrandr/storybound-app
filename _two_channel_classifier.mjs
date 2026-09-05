// TWO-CHANNEL CG DEFECT INSTRUMENT — the bake-off proved text-leak detection and visual-invariant judgment
// are DIFFERENT measurement problems (exhaustive enumeration vs. gestalt judgment) that interfere in one
// prompt. So: two specialized instruments, results labeled by provenance {text, visual} — never a blind
// union — so a future regression is localizable to a channel, not "the classifier". (Roman's design.)
//
//   Image ──┬─► TEXT channel:  enumerate all visible text → classify each token → text defects
//           └─► VISUAL channel: gestalt IQS visual invariants (NO OCR reasoning) → non-text defects
//
// This file is BOTH the instrument (classify) and its validation harness (re-run A1/A2 across the ladder).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(ROOT, 'test/fixtures/benchmark-A');
const PROXY = 'http://localhost:3000/api/gemini-proxy';
const N = 4;

// ---- TEXT channel: enumerate-first, text ONLY (proven 4/4 recall in the bake-off) ----
const TEXT_CHANNEL = (scene) => `You judge ONLY the lettering in a Storybound 2x2 comic sheet (panels TL=1 TR=2 BL=3 BR=4). Ignore anatomy, poses, colour, backgrounds — another stage owns those.
GRAPHIC MARKS ARE NOT TEXT: the jagged X-strokes of a wish/twist BURST, hatching, motion/speed lines, sparkles, impact stars, or scratch marks are ART, not lettering — do NOT transcribe them. Only real LETTERING that forms a word, label, or piece of signage counts as text.
SCENE context: ${scene}
STEP 1 — TRANSCRIBE: list every piece of real LETTERING visible (words, labels, signage, sound-effect words), verbatim, with its panel. If a mark is a graphic effect (burst stroke, hatching, motion line) rather than a letter forming a word, SKIP it.
STEP 2 — CLASSIFY each item: a valid comic SOUND EFFECT (onomatopoeia) matching an action actually depicted in that panel → "sfx-ok"; OR stray text — a caption box, a "PHASE: X" label, a phase/panel/instruction word, a title, or a word for no depicted action → "text-leak" (Storybound art must contain NO caption boxes and NO labels).
Output ONLY JSON: {"visible_text":[{"panel":N,"text":"...","verdict":"sfx-ok"|"text-leak"}],"defects":[{"panel":1-4,"class":"text-leak","text":"..."}]}. Every text-leak in visible_text MUST also appear in defects. No prose.`;

// ---- VISUAL channel: gestalt invariants, NO OCR. ROSTER-FIRST continuity — enumerate the cast before
// judging duplication (recurrence across panels is expected), which fixed the twins ontology bug the same
// way enumerate-first fixed captions (A2 continuity [0,1,1,0]→[0,0,0,0], deterministic). ----
const VISUAL_CHANNEL = (scene) => `You are the ACCEPTANCE-QA gate for the VISUALS of a Storybound 2x2 comic sheet (panels TL=1 TR=2 BL=3 BR=4). Production acceptance, not art critique. Do NOT read, transcribe, or judge any lettering/text/SFX — a separate stage owns text; pretend the words aren't there.
SCENE (judge the render against THIS): ${scene}
For ANY imperfection the ONLY question: "Would this image be REGENERATED or REPAIRED in production?" If no, NOT a defect.
STEP 1 — CAST ROSTER: list each DISTINCT character visible across the whole sheet, by appearance (e.g. "woman, brown hair, tan vest"). A comic shows the SAME characters repeatedly across panels — a character recurring in multiple panels is EXPECTED and is NEVER duplication.
STEP 2 — evaluate the HARD VISUAL INVARIANTS; report ONLY these:
- species: a character drawn as the WRONG species / its defining anatomy absent.
- anatomy: a MALFORMED body part on a character — a hand/fingers tangled, with extra or missing digits, a claw, or a disembodied/floating hand; a warped limb or facial feature. LOCALIZED. A malformed hand or a missing/extra limb is ANATOMY, NOT continuity.
- continuity: a SINGLE character drawn TWICE WITHIN ONE panel (true twins in one frame), OR a character's face/hair/build/clothing/colour/weapon changing between panels. (Recurrence across panels is NOT a defect; two DIFFERENT characters present is correct casting. A malformed body part is ANATOMY, not continuity.)
- burst: a wish/twist burst wrong — wrong colour/place, dominating a panel, or a standalone emblem.
- expression: a blank/wooden face on a character in an emotional beat.
- buoyancy: a figure planted on the ground where the scene has no gravity (or floating where gravity applies).
- background: a dead, empty panel missing the life the world should have.
SOFT — NEVER report alone: tentacle count, minor variation, stylization, dramatic posing, composition.
Output ONLY JSON {"roster":["..."],"defects":[{"panel":1-4,"class":"...","note":"brief"}]}. No prose.`;

function parse(t){ if(!t) return null; let s=String(t).trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim(); const a=s.indexOf('{'),z=s.lastIndexOf('}'); if(a>=0&&z>a)s=s.slice(a,z+1); try{return JSON.parse(s);}catch(_){return null;} }
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function call(promptText, imgPath){
  const t0=Date.now();
  const body={ model:'gemini-2.5-flash', temperature:0, max_tokens:1800, messages:[{role:'user',content:[
    {type:'text',text:promptText}, {type:'image',mime_type:'image/png',data:fs.readFileSync(imgPath).toString('base64')} ]}]};
  let r; for(let a=0;a<4;a++){ r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); if(r.status!==429)break; await sleep(6000*(a+1)); }
  const ms=Date.now()-t0; if(!r.ok) return {err:r.status,ms};
  const d=await r.json(); const text=d.content||d.choices?.[0]?.message?.content||'';
  return { parsed:parse(text), tokens:d.usage?.total_tokens||0, ms };
}

// THE INSTRUMENT: labeled-by-provenance result.
export async function classify(imgPath, scene){
  const [t,v]=await Promise.all([ call(TEXT_CHANNEL(scene), imgPath), call(VISUAL_CHANNEL(scene), imgPath) ]);
  return {
    text:  (t.parsed?.defects||[]).map(d=>({...d, channel:'text'})),
    visual:(v.parsed?.defects||[]).map(d=>({...d, channel:'visual'})),
    _diag: { visible_text:t.parsed?.visible_text||[], tok:(t.tokens||0)+(v.tokens||0), ms:Math.max(t.ms||0,v.ms||0) }
  };
}

// ---- validation harness (only when run directly) — all FOUR Benchmark A domains ----
// CANON: First Favored & Kwisheen do NOT have pointed ears — ordinary/round ears are correct. Never assert
// pointed ears in scene text (it injects a false species criterion).
const A1='a human woman and a KWISHEEN (tentacle-bodied, coral-dreadlock hair, tentacles instead of legs, humanoid face) in drowned coral ruins, UNDERWATER — figures FLOAT. A red twisted X-burst may appear on at most one panel.';
const A2='a human woman and a FIRST FAVORED (a near-human luminous humanoid, TWO legs, NO tentacles, ORDINARY ears — pointed ears would be WRONG) in a pale white weeping-willow forest, ON LAND — GRAVITY applies. A red twisted X-burst may appear on at most one panel.';
const A3='two ORDINARY HUMANS (a woman in a leather jacket, a man in a suit) confront each other on a rain-slicked modern city street at dusk — neon signage, glass towers, a crowd of pedestrians. No fantasy, no creatures; gravity applies.';
const A4='two ORDINARY HUMANS (Nora, a woman; Daniel, a man) in a heated but non-violent conversation across a table in a contemporary café interior — both present every panel, other patrons behind. A still dialogue beat: no action, no weapons, no magic, no burst, no SFX.';
const GT=[
  {id:'A1', label:'underwater/kwisheen', path:path.join(FIX,'A1_underwater_kwisheen.png'), scene:A1, textReq:null,      named:'—'},
  {id:'A2', label:'land/first-favored',  path:path.join(FIX,'A2_land_firstfavored.png'),  scene:A2, textReq:/phase/i,  named:'PHASE'},
  {id:'A3', label:'urban/humans',        path:path.join(FIX,'A3_urban_humans.png'),        scene:A3, textReq:/daniel/i, named:'DANIEL'},
  {id:'A4', label:'interior/dialogue',   path:path.join(FIX,'A4_interior_dialogue.png'),   scene:A4, textReq:null,      named:'—'}
];
// ISOLATION STEP — preregister the expected benchmark delta BEFORE running. Anything outside it = coupling.
const STEP='STEP FINAL — CONTRACT SHAPE (defects emit {class,panel,location,rationale}; no behavioral change). Freeze prep.';
const HYP ='SHAPE-ONLY: same defects as Step 3-confirm — A1 clean; A2 4 PHASE; A3 anatomy×2-3 + DANIEL; A4 anatomy×2, no expression. Only the output FIELDS change (note→rationale, +location). Any change in WHICH defects appear = coupling.';
const matches=(d,re)=>[d.text,d.note,d.rationale,d.location].some(x=>re.test(String(x||'')));
const byClass=(defs)=>{ const m={}; for(const d of defs) m[d.class]=(m[d.class]||0)+1; return Object.entries(m).sort().map(([k,v])=>`${k}×${v}`).join(' ')||'—'; };

if(import.meta.url===`file://${process.argv[1]}`){
  (async()=>{
    console.log(`TWO-CHANNEL INSTRUMENT — reporter | N=${N} | Benchmark A v1 | gemini-2.5-flash temp0`);
    console.log(`${STEP}\nPREREGISTERED HYPOTHESIS: ${HYP}\n`);
    for(const g of GT){
      const runs=[]; for(let i=0;i<N;i++){ runs.push(await classify(g.path, g.scene)); await sleep(1200); }
      const textCnt = runs.map(r=>r.text.length);
      const namedHit= g.textReq ? runs.map(r=>r.text.filter(d=>matches(d,g.textReq)).length) : null;
      console.log(`### ${g.id} ${g.label} ###`);
      console.log(`  TEXT  : count=[${textCnt.join(',')}]${namedHit?`  named "${g.named}"=[${namedHit.join(',')}]`:''}   by-class: ${runs.map(r=>`{${byClass(r.text)}}`).join(' ')}`);
      console.log(`  VISUAL: ${runs.map(r=>`{${byClass(r.visual)}}`).join(' ')}`);
      const anyVis=runs.find(r=>r.visual.length)?.visual||[];
      if(anyVis.length) console.log(`     visual sample: ${anyVis.slice(0,2).map(d=>`[${d.class}] loc="${String(d.location||'?').slice(0,32)}" — ${String(d.rationale||d.note||'').slice(0,52)}`).join(' | ')}`);
      console.log('');
    }
    console.log(`=== compare the above against the PREREGISTERED HYPOTHESIS; any deviation = unintended coupling ===`);
  })().catch(e=>{console.error('ERR',e);process.exit(1);});
}
