// LOCALIZATION — execution component 1. Objective (from the Repair Contract): the MINIMAL region a Klein edit
// can satisfy §1 within, without violating §3 collateral bounds. Input: a defect {class,panel,note}. Output:
// a tight Klein mask box. Panel index → quadrant is DETERMINISTIC; the prose `note` needs a vision call to
// return a tight box around JUST the defective element. Consumes RepairDecision; feeds Execution.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(ROOT, 'test/fixtures/benchmark-A');
const PROXY = 'http://localhost:3000/api/gemini-proxy';

// POLICY (placeholder): feather margin added around the tight box (Klein blends the edit at its edge).
const POLICY = { featherFrac: 0.04 };  // 4% of panel side, added each edge — tunable, not architecture

const SHEET = 1400, PANEL = SHEET/2;   // 2x2 → 700px quadrants
// panel(1-4) → quadrant pixel bounds [x0,y0,x1,y1]  (1=TL 2=TR 3=BL 4=BR)
function quadrant(p){ const c=(p===2||p===4)?1:0, r=(p===3||p===4)?1:0; return [c*PANEL, r*PANEL, (c+1)*PANEL, (r+1)*PANEL]; }
const QNAME = {1:'top-left',2:'top-right',3:'bottom-left',4:'bottom-right'};

const LOC_PROMPT = (panel, defect) => `This is a ${SHEET}x${SHEET} Storybound 2x2 comic sheet: panel 1=top-left, 2=top-right, 3=bottom-left, 4=bottom-right (each a ${PANEL}x${PANEL} quadrant).
Return the TIGHTEST possible bounding box around ONLY this one element, nothing else:
  ${defect.class} in panel ${panel} (${QNAME[panel]}): ${defect.note}
The box MUST lie inside panel ${panel}'s ${QNAME[panel]} quadrant, and be as SMALL as possible — just the element itself (e.g. just the hand, just the lettered sign), NOT the whole figure and NOT the whole panel.
Output ONLY JSON {"box_2d":[ymin,xmin,ymax,xmax]} in 0-1000 coordinates normalized over the WHOLE sheet. No prose.`;

const sleep = ms => new Promise(r=>setTimeout(r,ms));
async function visionBox(imgPath, panel, defect){
  const body={ model:'gemini-2.5-flash', temperature:0, max_tokens:300, messages:[{role:'user',content:[
    {type:'text',text:LOC_PROMPT(panel,defect)}, {type:'image',mime_type:'image/png',data:fs.readFileSync(imgPath).toString('base64')} ]}]};
  for(let a=0;a<3;a++){ // retry transient failures / rate limits
    const r=await fetch(PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(r.status===429){ await sleep(5000*(a+1)); continue; }
    if(r.ok){ const d=await r.json(); const t=d.content||d.choices?.[0]?.message?.content||'';
      try{ const j=JSON.parse(String(t).replace(/^```(?:json)?/i,'').replace(/```$/,'').trim()); if(Array.isArray(j.box_2d)&&j.box_2d.length===4) return j.box_2d; }catch(_){}
    }
    await sleep(1200);
  }
  return null;
}

export async function localize(imgPath, defect){
  const panel = parseInt(String(defect.panel).replace('p',''),10);
  const [qx0,qy0,qx1,qy1] = quadrant(panel);
  const box = await visionBox(imgPath, panel, defect);
  if(!Array.isArray(box) || box.length!==4) return { panel, error:'no box' };
  // box_2d = [ymin,xmin,ymax,xmax] in 0-1000 over the whole sheet → pixels
  let [ymin,xmin,ymax,xmax] = box.map(v=>v/1000*SHEET);
  // feather margin
  const f = POLICY.featherFrac*PANEL;
  let X0=xmin-f, Y0=ymin-f, X1=xmax+f, Y1=ymax+f;
  // clamp to the panel quadrant (contract §3: Klein must stay in-region, and the region in-panel)
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const cX0=clamp(X0,qx0,qx1), cY0=clamp(Y0,qy0,qy1), cX1=clamp(X1,qx0,qx1), cY1=clamp(Y1,qy0,qy1);
  const rawCenterIn = (xmin+xmax)/2>=qx0 && (xmin+xmax)/2<qx1 && (ymin+ymax)/2>=qy0 && (ymin+ymax)/2<qy1;
  const areaFrac = ((cX1-cX0)*(cY1-cY0))/(PANEL*PANEL);
  return { panel, quadrant:QNAME[panel], withinPanel:rawCenterIn,
    box_px:[Math.round(cX0),Math.round(cY0),Math.round(cX1),Math.round(cY1)],
    box_norm: box.map(v=>Math.round(v)),
    // TELEMETRY — log on EVERY repair (Roman): mask size is a leading indicator. Expected relationships to
    // learn over time: smaller mask → higher Klein success + fewer retries; each defect class has a
    // characteristic mask size. Start collecting now even before it's used for anything.
    mask_area_percent: +(areaFrac*100).toFixed(1),
    note: defect.note };
}

if(import.meta.url===`file://${process.argv[1]}`){
  // Benchmark A auto-repair defects (from the planner) — localize each.
  const DEFECTS=[
    { img:'A2_land_firstfavored.png', class:'text-leak', panel:1, note:'the caption box reading "PHASE: Orientation"' },
    { img:'A2_land_firstfavored.png', class:'text-leak', panel:4, note:'the caption box reading "PHASE: Threat"' },
    { img:'A3_urban_humans.png',      class:'text-leak', panel:1, note:'the neon sign reading "DANIEL"' },
    { img:'A4_interior_dialogue.png', class:'anatomy',   panel:2, note:"the man's malformed right hand with tangled fingers" },
    { img:'A4_interior_dialogue.png', class:'anatomy',   panel:4, note:"the man's malformed right hand with tangled fingers" },
  ];
  (async()=>{
    console.log(`LOCALIZATION — tight Klein-mask boxes | sheet ${SHEET}px, panels ${PANEL}px`);
    console.log(`objective (contract): MINIMAL in-panel region; tight = small areaFracOfPanel\n`);
    for(const d of DEFECTS){
      const loc=await localize(path.join(FIX,d.img), d);
      const ok = loc.withinPanel && loc.mask_area_percent!=null && loc.mask_area_percent<50;
      console.log(`  ${d.img.slice(0,2)} p${d.panel} ${d.class.padEnd(9)} → box_px=[${(loc.box_px||[]).join(',')}] mask=${loc.mask_area_percent}% in-panel=${loc.withinPanel?'✓':'✗'} ${ok?'':'  ← CHECK'}  "${d.note.slice(0,34)}"`);
    }
    console.log(`\n=== validate: each box in-panel + tight (small area); then view fixtures to confirm it lands on the element ===`);
  })().catch(e=>{console.error('ERR',e);process.exit(1);});
}
