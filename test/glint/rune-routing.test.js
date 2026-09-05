// END-TO-END routing for the rune/static split. These exist because the previous integration was
// reported as working while the routing block had never been inserted — extractor fixtures passed
// and nothing was wired. Every assertion here drives the REAL production functions.
const src=require('fs').readFileSync(require('path').join(__dirname,'../../public/app.js'),'utf8');
const window={}; let bad=0;
const ok=(l,c,x)=>{ if(!c) bad++; console.log((c?'  ✅ ':'  ❌ ')+l+(x?'   '+x:'')); };
function g(re,l){const m=src.match(re); if(!m){console.error('MISSING '+l);process.exit(1);} return m[0];}

eval(g(/var _CG_SPARKLE_MODE_SET = \{[^}]*\};/,'sset'));
eval(g(/var _CG_GLINT_MODE_SET = \{[^}]*\};/,'gset'));
eval(g(/var _CG_GLINT_REGION_SET = \{[\s\S]*?\n  \};/,'rset'));
eval(g(/var _GLINT_REGIONS = \{[\s\S]*?\n  \};/,'boxes'));
eval(g(/function _cgNormalizeReflectionModes\(panels\) \{[\s\S]*?\n  \}/,'norm'));
eval(g(/var _GLINT_CLASS = \{[\s\S]*?\n  \};/,'class'));
eval(g(/var _GLINT_MODES = \{[^}]*\};/,'modes'));
eval(g(/var _RUNE_DIRECTIVE =[\s\S]*?;\n/,'directive'));

console.log('MODE VOCABULARY');
ok('rune_weapon is an accepted planner mode', !!_CG_GLINT_MODE_SET.rune_weapon);
ok('rune_weapon reaches the renderer whitelist', !!_GLINT_MODES.rune_weapon);
ok('rune_weapon is the ONLY travelling class',
   Object.keys(_GLINT_CLASS).filter(k=>_GLINT_CLASS[k]==='runes').join(',')==='rune_weapon',
   Object.keys(_GLINT_CLASS).filter(k=>_GLINT_CLASS[k]==='runes').join(','));
['focal_object','jewelry','glasses_portrait','reliquary_smile'].forEach(m=>
  ok('static class stays static: '+m, _GLINT_CLASS[m]==='static'));
ok('unknown mode has no class (fails closed)', _GLINT_CLASS['bogus']===undefined);

console.log('\nNORMALISATION + PRODUCER');
const P=o=>Object.assign({beat:'b',visual:'v',camera:'medium'},o);
const tagStart=src.indexOf("var _uwAttr = '';");
const TAG=src.slice(tagStart, src.indexOf('var _imgHtml =', tagStart));
const runTag=new Function('plan','result','_stagedKwisheenState','_cgSceneIsUnderwater','_cgSceneIsVeilwood',
 '_CG_GLINT_MODE_SET','_CG_SPARKLE_MODE_SET','_CG_GLINT_REGION_SET', TAG+'; return _uwAttr;');
function render(panel){ const ps=[panel]; _cgNormalizeReflectionModes(ps);
  return {attr:runTag({layoutType:'grid',panels:ps},{panel:ps[0]},()=>null,()=>false,()=>false,
    _CG_GLINT_MODE_SET,_CG_SPARKLE_MODE_SET,_CG_GLINT_REGION_SET), panel:ps[0]}; }
let r=render(P({glint:{mode:'rune_weapon',region:'top_right'}}));
ok('rune_weapon survives normalisation', r.panel._glintMode==='rune_weapon');
ok('rune_weapon reaches the HTML attribute', /data-glint="rune_weapon"/.test(r.attr), r.attr.trim());
ok('a bogus mode is dropped', !render(P({glint:{mode:'rune_sword'}})).panel._glintMode);

console.log('\nPROMPT INJECTION — only for rune_weapon panels');
const promptFn=g(/      \/\/ RUNE DIRECTIVE[\s\S]*?_runeBlock = ''[\s\S]*?\} catch \(_\) \{\}/,'inject');
function injected(panels){
  const plan={panels}; let _runeBlock='';
  const body=promptFn.replace('var _runeBlock','_runeBlock');
  eval(body);
  return _runeBlock;
}
ok('no rune panel ⇒ no directive at all', injected([{_glintMode:'focal_object'},{}])==='');
const one=injected([{},{_glintMode:'rune_weapon'},{}]);
ok('one rune panel ⇒ directive naming that panel', one.includes('PANEL 2 ONLY') && one.includes('CYAN RUNES'));
const two=injected([{_glintMode:'rune_weapon'},{_glintMode:'rune_weapon'}]);
ok('two rune panels ⇒ both named', two.includes('PANELS 1 and 2'));
ok('directive forbids glow (the word that lit whole blades)',
   /DO NOT GLOW/.test(_RUNE_DIRECTIVE));
ok('directive does NOT ban blue from the whole composition',
   !/Nothing else in the picture is cyan or blue/.test(_RUNE_DIRECTIVE) &&
   /rest of the scene may\s*\n?\s*use blue freely|rest of the scene may use blue freely/.test(_RUNE_DIRECTIVE.replace(/\s+/g,' ')));

// The travel upgrader is GONE. Travel used to be an anchored flare that a second pass swapped out
// after asking the grounder for a weapon box; runes now establish their own ownership, so that whole
// path — and the reflective sweep and marker-pairing experiments it carried — has been removed rather
// than left unreachable. These assert the removal, so the dead path cannot quietly return.
console.log('\nTHE OBSOLETE UPGRADE PATH IS GONE');
for (const gone of ['_maybeUpgradeGlintToTravel','_glintSweepInBox','_gBuildPath01','_glintPixelContext',
                    '_gSnap','_gValidateCurve','_gChaikin','_gResample','_gLen'])
  ok(('  removed from production: '+gone).padEnd(52), !src.includes(gone));
ok('no travel-reason attribute survives it', !src.includes('data-glint-travel-reason'));
// The suite that exercised it is deleted rather than adapted: it tested a hand-off between an anchored
// flare and a travelling one, and no such hand-off exists now. Naming the file is the honest check —
// a substring search would match this very line.
ok('the suite that exercised it is gone',
   !require('fs').existsSync(require('path').join(__dirname,'upgrade-swap.test.js')));

console.log('\nAUTOHOOK — one entry point, and runes leave it before the grounder');
const HOOK=g(/      if \(window\._focalGlints !== false\) \{[\s\S]*?\n      \}/,'hook');
ok('the autohook delegates to placement', /_placeGlint/.test(HOOK));
const PLACE2=g(/  async function _placeGlint\(imgEl\) \{[\s\S]*?\n  \}\n/,'place');
const RUNE2=g(/  async function _placeRuneGlint\(imgEl, done\) \{[\s\S]*?\n  \}\n/,'placeRune');
// The rune branch must come BEFORE the subject/grounding requirement, or runes would still be gated
// on a grounder that cannot see them.
ok('runes are routed out before grounding is reached',
   PLACE2.indexOf("_GLINT_CLASS[mode] === 'runes'") > -1 &&
   PLACE2.indexOf("_GLINT_CLASS[mode] === 'runes'") < PLACE2.indexOf('_groundGlintPath'));
ok('and the static path no longer upgrades anything', !/_maybeUpgradeGlintToTravel/.test(PLACE2));
// Polarity is the whole safety property here, so assert the exact form: `=== false` is a kill switch
// (unset runs), `!== true` would be opt-in (unset does nothing). The two read almost identically.
ok('travel is ON by default behind a kill switch', /window\._travellingGlints === false/.test(RUNE2));
ok('and is NOT opt-in polarity', !/window\._travellingGlints !== true/.test(RUNE2));
ok('the rune route never calls the grounder', !/_groundGlintPath/.test(RUNE2));
ok('it searches the planner region', /_glintRegionValid|_GLINT_REGIONS/.test(RUNE2));
ok('a broad region is refused', /region_too_broad/.test(RUNE2));
ok('two valid runs are refused rather than picked between', /ambiguous_regions/.test(RUNE2));
ok('no anchored fallback exists in the rune route',
   !/regionBox:\s*box/.test(RUNE2) && !/_detectSpecularPoints/.test(RUNE2));

console.log(bad?'\n'+bad+' FAILED':'\n🎯 runes route around the grounder; static modes stay grounded and anchored');
process.exit(bad?1:0);
