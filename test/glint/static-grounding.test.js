// EVERY glint is placed inside a grounded box. These exist because the static flare used to take the
// strongest highlight in the whole panel, which is repeatedly NOT the planner's object — measured, it
// picked hair, a white tree limb, a sunset and a balustrade. A missing flash is invisible; one on a
// forehead is not, so every failure here must draw nothing.
const fs=require('fs'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../../public/app.js'),'utf8');
function g(re,l){const m=src.match(re); if(!m){console.error('MISSING '+l);process.exit(1);} return m[0];}
const window={}; let bad=0;
const ok=(l,c,x)=>{ if(!c) bad++; console.log((c?'  ✅ ':'  ❌ ')+l+(x?'   '+x:'')); };
eval(g(/var _GLINT_PRESET = \{[\s\S]*?\n  \};/,'preset'));
eval(g(/  function _detectSpecularPoints\(imgEl, P, diag\) \{[\s\S]*?\n  \}\n/,'detector'));
eval(g(/var _GLINT_REGIONS = \{[\s\S]*?\n  \};/,'regions'));

// synthetic panel + canvas shim
function panel(w,h,paint){
  const px=new Uint8ClampedArray(w*h*4);
  for(let i=0;i<w*h;i++){px[i*4]=70;px[i*4+1]=70;px[i*4+2]=75;px[i*4+3]=255;}
  paint((x,y,rgb)=>{ if(x<0||y<0||x>=w||y>=h) return; const i=(y*w+x)*4; px[i]=rgb[0];px[i+1]=rgb[1];px[i+2]=rgb[2]; });
  return {naturalWidth:w,naturalHeight:h,_px:px,_w:w,_h:h};
}
global.document={createElement(){ let sx0,sy0,sw0,sh0,dw0,dh0,img0;
  return {width:0,height:0,getContext(){return{
    drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh){ if(dw===undefined){dw=sw;dh=sh;sw=img._w;sh=img._h;sx=0;sy=0;}
      img0=img;sx0=sx;sy0=sy;sw0=sw;sh0=sh;dw0=dw;dh0=dh; },
    getImageData(_x,_y,w,h){ const out=new Uint8ClampedArray(w*h*4);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const sX=Math.min(img0._w-1,Math.floor(sx0+x*(sw0/dw0))), sY=Math.min(img0._h-1,Math.floor(sy0+y*(sh0/dh0)));
        const si=(sY*img0._w+sX)*4, di=(y*w+x)*4;
        out[di]=img0._px[si];out[di+1]=img0._px[si+1];out[di+2]=img0._px[si+2];out[di+3]=255; }
      return {data:out}; } };} };} };

const WHITE=[252,252,250];
// A bright COMPACT highlight. Size matters: the detector's ring radius scales with sample width
// (w/80), so inside a small grounded crop the ring is only ~3px — a blob larger than that has the
// ring falling INSIDE it, contrast reads zero, and nothing is found. Real speculars are small.
const blob=(put,cx,cy,r)=>{ for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++)
  if(dx*dx+dy*dy<=r*r) put(cx+dx,cy+dy,WHITE); };

function detectIn(img,box){
  const P={}; for(const k in _GLINT_PRESET) P[k]=_GLINT_PRESET[k];
  P.regionBox=box||null;
  const diag={}; const pts=_detectSpecularPoints(img,P,diag);
  return {pts,diag};
}

console.log('ADVERSARIAL — the decoy is BRIGHTER and BIGGER than the target');
let wholeMisses=0;
const CASES=[
  ['weapon beside pale hair',           {x:.10,y:.40,w:.25,h:.15}, [430,180]],
  ['glasses beside a bright forehead',  {x:.42,y:.30,w:.16,h:.10}, [300,120]],
  ['jewellery beside chandelier lights',{x:.30,y:.55,w:.12,h:.10}, [480, 90]],
  ['gold teeth beside facial highlights',{x:.45,y:.50,w:.10,h:.08},[180,120]],
  ['car panel against a sunset',        {x:.15,y:.55,w:.30,h:.20}, [520,110]],
  ['metal beside a white tree limb',    {x:.55,y:.25,w:.20,h:.20}, [ 90,300]],
];
for (const [label,box,outside] of CASES){
  // Put the target at the CENTRE of its own box — hand-picked coordinates drifted outside the boxes
  // they were meant to sit in, and the test then measured my arithmetic rather than the detector.
  const inside=[Math.round((box.x+box.w/2)*600), Math.round((box.y+box.h/2)*500)];
  const img=panel(600,500,(put)=>{ blob(put,inside[0],inside[1],2); blob(put,outside[0],outside[1],4); });
  const boxed=detectIn(img,box), whole=detectIn(img,null);
  const inBox=p=>p.x>=box.x-0.02&&p.x<=box.x+box.w+0.02&&p.y>=box.y-0.02&&p.y<=box.y+box.h+0.02;
  const allIn=boxed.pts.length&&boxed.pts.every(inBox);
  const wholeWrong=whole.pts.length&&!inBox(whole.pts[0]);
  ok(('boxed: '+label).padEnd(46)+(boxed.pts.length+' pt(s), all on target'), !!allIn);
  // Informational, NOT a pass/fail: an un-grounded search is unreliable, not wrong every single time.
  // Asserting it always picks the decoy would be asserting my fixture, and it would hide the honest
  // number — which is what actually justifies grounding.
  if (wholeWrong) wholeMisses++;
  console.log('       un-grounded search: ' + (wholeWrong ? 'lands on the decoy' : 'happens to be right here'));
}

ok('un-grounded search is wrong on most of these panels', wholeMisses >= 4,
   wholeMisses + '/' + CASES.length + ' land on the decoy');

console.log('\nFAIL CLOSED');
const plain=panel(600,500,()=>{});
ok('correct box but no compact highlight ⇒ nothing', detectIn(plain,{x:.2,y:.2,w:.2,h:.2}).pts.length===0);
const far=panel(600,500,(put)=>blob(put,520,110,4));
ok('highlight exists only OUTSIDE the box ⇒ nothing', detectIn(far,{x:.05,y:.05,w:.15,h:.15}).pts.length===0);

console.log('\nPLACEMENT CONTRACT (source-level)');
const PLACE=g(/  async function _placeGlint\(imgEl\) \{[\s\S]*?\n  \}\n/,'place');
ok('a named subject is required before grounding',
   PLACE.indexOf("if (!subject)") < PLACE.indexOf('_groundGlintPath'));
ok('no box ⇒ no glint', /return done\('no_box'\)/.test(PLACE));
ok('loose box ⇒ no glint', /box_too_loose/.test(PLACE));
ok('no highlight in box ⇒ no glint', /no_highlight/.test(PLACE));
ok('detection is confined to the box', /P\.regionBox = box/.test(PLACE));
ok('the flare is only applied after the box and highlight exist',
   PLACE.indexOf('_detectSpecularPoints') < PLACE.indexOf('_applyFocalGlint'));
ok('only rune_weapon leaves this path early', /_GLINT_CLASS\[mode\] === 'runes'/.test(PLACE));
// Travel used to be an upgrade bolted onto the anchored flare. Runes now leave before grounding, so
// anything still reaching this code is a STATIC mode and must end as an anchored flash — a travel
// call here would mean a static object had been handed a path nobody grounded.
ok('nothing on the static path can travel',
   !/_maybeUpgradeGlintToTravel/.test(PLACE) && !/paths:/.test(PLACE));
const HOOK=g(/      if \(window\._focalGlints !== false\) \{[\s\S]*?\n        \}/,'hook');
ok('the autohook no longer places un-grounded glints',
   !/_applyFocalGlint/.test(HOOK) && /_placeGlint/.test(HOOK));
ok('regionBox survives the preset copy', /regionBox: null/.test(src));

console.log(bad?'\n'+bad+' FAILED':'\n🎯 every glint is grounded, boxed, and fails closed');
process.exit(bad?1:0);
