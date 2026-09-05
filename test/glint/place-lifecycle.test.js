// EXECUTES the real _placeGlint()/_placeRuneGlint() against mocked grounding, image loading, detection
// and renderers. Source-text assertions proved insufficient twice: a box was passed to a function that
// did not accept it, and a routing branch was never inserted at all — both read fine in the source.
// These call the orchestrator and count what it actually does.
//
// The contract changed deliberately: rune weapons no longer ask the grounder at all. They take the
// planner's region, extract the cyan inscription inside it, and either travel or draw NOTHING. There
// is no anchored fallback for runes, because there is no grounded box to justify one.
const fs=require('fs'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../../public/app.js'),'utf8');
function grab(re,l){const m=src.match(re); if(!m){console.error('MISSING '+l);process.exit(1);} return m[0];}
let bad=0; const ok=(l,c,x)=>{ if(!c) bad++; console.log((c?'  ✅ ':'  ❌ ')+l+(x?'   '+x:'')); };

const PRESET_SRC = grab(/var _GLINT_PRESET = \{[\s\S]*?\n  \};/,'preset');
const CLASS_SRC  = grab(/var _GLINT_CLASS = \{[\s\S]*?\n  \};/,'class');
const MODES_SRC  = grab(/var _GLINT_MODES = \{[^}]*\};/,'modes');
const REGIONS_SRC= grab(/var _GLINT_REGIONS = \{[\s\S]*?\n  \};/,'regions');
const RGVALID_SRC= grab(/  function _glintRegionValid\(rg\) \{[\s\S]*?\n  \}/,'regionValid');
const DECODE_SRC = grab(/  async function _glintAwaitDecode\(imgEl\) \{[\s\S]*?\n  \}/,'decode');
const RUNE_SRC   = grab(/  async function _placeRuneGlint\(imgEl, done\) \{[\s\S]*?\n  \}\n/,'placeRune');
const PLACE_SRC  = grab(/  async function _placeGlint\(imgEl\) \{[\s\S]*?\n  \}\n/,'place');

// A fake <img> with controllable decode timing.
function makeImg(mode, subject, opts){
  opts=opts||{};
  const listeners={};
  const img={ naturalWidth: opts.ready===false?0:600, naturalHeight: opts.ready===false?0:400,
    complete: opts.ready!==false, attrs:{'data-glint':mode,'data-glint-subject':subject},
    getAttribute(k){ return k in this.attrs ? this.attrs[k] : null; },
    setAttribute(k,v){ this.attrs[k]=v; },
    addEventListener(t,fn){ (listeners[t]=listeners[t]||[]).push(fn); },
    removeEventListener(t,fn){ listeners[t]=(listeners[t]||[]).filter(f=>f!==fn); },
    _fire(t){ (listeners[t]||[]).slice().forEach(f=>f()); } };
  if (opts.region) img.attrs['data-glint-region']=opts.region;
  if (opts.ready===false) {
    setTimeout(()=>{ if(opts.failLoad){ img._fire('error'); }
                     else { img.naturalWidth=600; img.naturalHeight=400; img.complete=true; img._fire('load'); } },5);
  }
  return img;
}

// Build one sandboxed copy of the real orchestrator with injectable collaborators.
function harness(cfg){
  const calls={ground:0,detect:0,anchor:0,travel:0,rune:0,runeBoxes:[]};
  const code = PRESET_SRC+'\n'+CLASS_SRC+'\n'+MODES_SRC+'\n'+REGIONS_SRC+'\n'+RGVALID_SRC+'\n'
             + DECODE_SRC+'\n'+RUNE_SRC+'\n'+PLACE_SRC+'\nreturn _placeGlint;';
  const make = new Function('window','_groundGlintPath','_detectSpecularPoints','_applyFocalGlint',
                            '_glintRunePath','calls', code);
  // 'unset' means the property is absent — the real default state of a fresh page.
  const win={};
  if (cfg.travel !== 'unset') win._travellingGlints = cfg.travel === true;
  const place = make(win,
    async function(imgEl,subject,mode){ calls.ground++;
      return cfg.box===null ? {ok:false} : {ok:true, grounding:{boxes:[cfg.box]}}; },
    function(imgEl,P,diag){ calls.detect++; calls.lastBox=P.regionBox;
      return cfg.highlight===false ? [] : [{x:0.5,y:0.5,strength:1}]; },
    function(imgEl,opts){
      if(opts&&opts.paths){ calls.travel++; calls.travelPaths=opts.paths;
        if(cfg.travelOk===false) return null;
        const h={kind:'travel',stop(){}}; imgEl._glint=h; return h; }
      calls.anchor++; calls.anchorBox=opts&&opts.regionBox;
      const h={kind:'anchor',stopped:false,stop(){this.stopped=true;}}; imgEl._glint=h; return h; },
    function(imgEl,P,why,box){ calls.rune++; calls.runeBoxes.push(box);
      // cfg.lanes maps a call index → a lane or null, so two regions can disagree.
      const lane = cfg.lanes ? cfg.lanes[calls.rune-1] : (cfg.laneOk===false?null:[1,2,3,4,5,6,7]);
      if(!lane){ why.reason=cfg.laneWhy||'no_runes'; return null; }
      return lane; },
    calls);
  return {place,calls};
}
const BOX={x:.2,y:.3,w:.2,h:.15};
const LANE=[1,2,3,4,5,6,7];

(async()=>{
console.log('CALL DISCIPLINE — static modes still require the grounder');
let h=harness({box:BOX}); let img=makeImg('jewelry','');
await h.place(img);
ok('missing subject: zero grounding, zero renders', h.calls.ground===0&&h.calls.anchor===0&&h.calls.detect===0,
   JSON.stringify(h.calls)+' '+img.getAttribute('data-glint-place'));

h=harness({box:BOX}); img=makeImg('bogus_mode','a ring');
await h.place(img);
ok('unknown mode: zero grounding calls', h.calls.ground===0, img.getAttribute('data-glint-place'));

h=harness({box:BOX}); img=makeImg('jewelry','the signet ring');
await h.place(img);
ok('static success: 1 ground, 1 boxed anchor, 0 travel',
   h.calls.ground===1&&h.calls.anchor===1&&h.calls.travel===0, JSON.stringify(h.calls));
ok('detection was confined to the grounded box', h.calls.lastBox===BOX);
ok('the anchor was created with that box', h.calls.anchorBox===BOX);

h=harness({box:null}); img=makeImg('jewelry','the signet ring');
await h.place(img);
ok('grounding abstains: 1 ground, 0 renders', h.calls.ground===1&&h.calls.anchor===0, img.getAttribute('data-glint-place'));

h=harness({box:BOX,highlight:false}); img=makeImg('jewelry','the signet ring');
await h.place(img);
ok('no highlight in box: 0 renders', h.calls.anchor===0, img.getAttribute('data-glint-place'));

h=harness({box:{x:0,y:0,w:1,h:1}}); img=makeImg('jewelry','the ring');
await h.place(img);
ok('loose box: 0 renders', h.calls.anchor===0, img.getAttribute('data-glint-place'));

// THE CONCESSION IS RUNE-ONLY. A static mode carrying a region must still be grounded, and must never
// reach the rune extractor — inside a region an ordinary highlight is exactly the ambiguity the box
// exists to resolve.
h=harness({box:null}); img=makeImg('jewelry','the ring',{region:'centre'});
await h.place(img);
ok('a static mode with a region does NOT take the rune route',
   h.calls.rune===0 && h.calls.travel===0 && h.calls.anchor===0 && h.calls.ground===1,
   img.getAttribute('data-glint-place'));

console.log('\nIMAGE READINESS');
h=harness({box:BOX}); img=makeImg('jewelry','the ring',{ready:false});
await h.place(img);
ok('delayed decode still places the glint', h.calls.anchor===1, JSON.stringify(h.calls));
h=harness({box:BOX}); img=makeImg('jewelry','the ring',{ready:false,failLoad:true});
await h.place(img);
ok('a failed load draws nothing', h.calls.anchor===0&&h.calls.detect===0, img.getAttribute('data-glint-place'));

// An image that is ALREADY complete with zero width has already errored — no further event is coming.
h=harness({box:BOX});
img=makeImg('jewelry','the ring'); img.complete=true; img.naturalWidth=0; img.naturalHeight=0;
const t0=Date.now(); await h.place(img); const took=Date.now()-t0;
ok('already-failed image resolves promptly, draws nothing',
   img.getAttribute('data-glint-place')==='image_failed' && h.calls.ground===0 &&
   h.calls.detect===0 && h.calls.anchor===0 && took<200, took+'ms '+JSON.stringify(h.calls));

h=harness({travel:true}); img=makeImg('rune_weapon','the sword',{region:'left',ready:false,failLoad:true});
await h.place(img);
ok('rune route also refuses a failed image', h.calls.rune===0&&h.calls.travel===0,
   img.getAttribute('data-glint-place'));

console.log('\nRUNE WEAPONS — planner region, no grounder, no anchored fallback');
h=harness({travel:true}); img=makeImg('rune_weapon','the runed sword',{region:'left'});
const handle=await h.place(img);
ok('travels without ever calling the grounder',
   h.calls.ground===0 && h.calls.rune===1 && h.calls.travel===1, JSON.stringify(h.calls));
ok('no anchored flare was created on the way', h.calls.anchor===0);
ok('the extractor searched the planner region', !!h.calls.runeBoxes[0] &&
   Math.abs(h.calls.runeBoxes[0].x-0)<1e-9 && Math.abs(h.calls.runeBoxes[0].w-0.34)<1e-9,
   JSON.stringify(h.calls.runeBoxes[0]));
ok('the validated path is what the renderer was given', h.calls.travelPaths.length===1);
ok('and a handle came back', !!handle && handle.kind==='travel');
ok('marked ok', img.getAttribute('data-glint-place')==='ok');

h=harness({travel:true}); img=makeImg('rune_weapon','the sword');
await h.place(img);
ok('no region: draws nothing, no grounder, no extractor',
   h.calls.rune===0&&h.calls.travel===0&&h.calls.anchor===0&&h.calls.ground===0,
   img.getAttribute('data-glint-place'));

h=harness({travel:true}); img=makeImg('rune_weapon','the sword',{region:'anywhere'});
await h.place(img);
ok('"anywhere" is refused as too broad', h.calls.rune===0&&h.calls.travel===0,
   img.getAttribute('data-glint-place'));

h=harness({travel:true}); img=makeImg('rune_weapon','the sword',{region:'not_a_region'});
await h.place(img);
ok('an unknown region name is refused', h.calls.rune===0&&h.calls.travel===0,
   img.getAttribute('data-glint-place'));

h=harness({travel:true,laneOk:false,laneWhy:'marker_solid_stripe'});
img=makeImg('rune_weapon','the sword',{region:'left'});
await h.place(img);
ok('no valid path: NOTHING is drawn — no anchored consolation prize',
   h.calls.travel===0 && h.calls.anchor===0 && !img._glint,
   img.getAttribute('data-glint-place'));
ok('and the refusal names the extractor\'s reason',
   img.getAttribute('data-glint-place')==='no_rune_path:marker_solid_stripe');

// Two named ends, both marked: there is no reason to prefer either, so neither is drawn.
h=harness({travel:true,lanes:[LANE,LANE]}); img=makeImg('rune_weapon','the sword',{region:'far_left+far_right'});
await h.place(img);
ok('two regions both yielding paths: ambiguous, draws nothing',
   h.calls.rune===2 && h.calls.travel===0 && !img._glint, img.getAttribute('data-glint-place'));

h=harness({travel:true,lanes:[LANE,null]}); img=makeImg('rune_weapon','the sword',{region:'far_left+far_right'});
await h.place(img);
ok('two regions, one path: that one travels',
   h.calls.rune===2 && h.calls.travel===1, img.getAttribute('data-glint-place'));

// The flag is now a KILL SWITCH, not an opt-in: unset must RUN, and only an explicit false may stop it.
// Asserting only the `false` case would have passed under either polarity and proved nothing.
h=harness({travel:'unset'}); img=makeImg('rune_weapon','the sword',{region:'left'});
await h.place(img);
ok('flag UNSET ⇒ travel runs (on by default)',
   h.calls.rune===1&&h.calls.travel===1, img.getAttribute('data-glint-place'));
h=harness({travel:false}); img=makeImg('rune_weapon','the sword',{region:'left'});
await h.place(img);
ok('explicit false ⇒ kill switch still stops everything',
   h.calls.rune===0&&h.calls.travel===0&&h.calls.ground===0, img.getAttribute('data-glint-place'));

h=harness({travel:true,travelOk:false}); img=makeImg('rune_weapon','the sword',{region:'left'});
await h.place(img);
ok('renderer refuses: nothing is left behind', !img._glint, img.getAttribute('data-glint-place'));

console.log(bad? `\n${bad} FAILED` : '\n🎯 the orchestrator does exactly what it claims');
process.exit(bad?1:0);
})();
