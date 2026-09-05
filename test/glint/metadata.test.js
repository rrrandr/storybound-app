// The rune tag must stay TRUTHFUL through the real production sequence. An earlier version of this
// file asserted a late "downgrade" that could never fire: normalisation runs BEFORE the shell HTML is
// built, and nothing renormalises after a failed render — the test only passed because it set a flag
// by hand and normalised in an order production never uses. The honest fix is to PRESERVE the rune
// instruction through every render tier, and this file follows the real order to prove it.
const fs=require('fs'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../../public/app.js'),'utf8');
function grab(re,l){const m=src.match(re); if(!m){console.error('MISSING '+l);process.exit(1);} return m[0];}
let bad=0; const ok=(l,c,x)=>{ if(!c) bad++; console.log((c?'  ✅ ':'  ❌ ')+l+(x?'   '+x:'')); };
const window={};
eval(grab(/var _CG_SPARKLE_MODE_SET = \{[^}]*\};/,'sset'));
eval(grab(/var _CG_GLINT_MODE_SET = \{[^}]*\};/,'gset'));
eval(grab(/var _CG_GLINT_REGION_SET = \{[\s\S]*?\n  \};/,'rset'));
eval(grab(/function _cgNormalizeReflectionModes\(panels\) \{[\s\S]*?\n  \}/,'norm'));
eval(grab(/var _RUNE_DIRECTIVE =[\s\S]*?;\n/,'directive'));
eval(grab(/  var _IMAGE_SAFE_TRANSLATIONS = \[[\s\S]*?\n  \];/,'trans'));
eval(grab(/  var _FIRST_FAVORED_TRANSLATIONS = \[[\s\S]*?\n  \];/,'ff'));
eval(grab(/  var _IMAGE_HARD_REMOVE = [^\n]*\n/,'hard'));
eval(grab(/  function sanitizeImagePrompt\(prompt\) \{[\s\S]*?\n  \}/,'san'));
eval(grab(/  function sanitizeImagePromptAggressive\(prompt\) \{[\s\S]*?\n  \}/,'agg'));

const BLOCK=grab(/      \/\/ RUNE DIRECTIVE[\s\S]*?\} catch \(_\) \{\}/,'block');
function buildPrompt(panels){ const plan={panels}; let _runeBlock='';
  eval(BLOCK.replace('var _runeBlock','_runeBlock'));
  return 'Create a square (1:1) comic page divided into '+panels.length+' panels.'+_runeBlock+
         '\nA warrior raises a sword on a hilltop at dusk.'; }
const tagStart=src.indexOf("var _uwAttr = '';");
const TAG=src.slice(tagStart, src.indexOf('var _imgHtml =', tagStart));
const runTag=new Function('plan','result','_stagedKwisheenState','_cgSceneIsUnderwater','_cgSceneIsVeilwood',
 '_CG_GLINT_MODE_SET','_CG_SPARKLE_MODE_SET','_CG_GLINT_REGION_SET', TAG+'; return _uwAttr;');
const KEY=['CYAN RUNES','DO NOT GLOW','pinhead','FAR APART'];
const carries=p=>KEY.every(k=>p.includes(k));

console.log('PRODUCTION ORDER — normalise, shell, prompt, fail, fall back');
// 1. normalise (this is what actually runs, before any HTML exists)
const panels=[{glint:{mode:'focal_object',subject:'the lantern'},beat:'b',visual:'v'},
              {glint:{mode:'rune_weapon',subject:'the runed sword'},beat:'b',visual:'v'}];
_cgNormalizeReflectionModes(panels);
ok('rune panel normalises to rune_weapon', panels[1]._glintMode==='rune_weapon');
// 2. shell HTML is built from the normalised mode
const attr=runTag({layoutType:'grid',panels},{panel:panels[1]},()=>null,()=>false,()=>false,
  _CG_GLINT_MODE_SET,_CG_SPARKLE_MODE_SET,_CG_GLINT_REGION_SET);
ok('shell carries data-glint="rune_weapon"', /data-glint="rune_weapon"/.test(attr), attr.trim());
// 3. main prompt
const main=buildPrompt(panels);
ok('main prompt carries the rune directive', carries(main));
ok('it names only the rune panel', main.includes('PANEL 2 ONLY'));
// 4/5. main render fails; the tiers TRANSFORM the page prompt rather than rebuilding it.
for (const [name,out] of Object.entries({
      'tier 1 — safe sanitiser': sanitizeImagePrompt(main),
      'tier 3 — emergency aggressive': sanitizeImagePromptAggressive(main) }))
  ok(('  '+name+' still carries the runes').padEnd(52), carries(out));

// 6. THE STEP THAT ACTUALLY MATTERS. generateImageWithFallback DISCARDS the page prompt whenever a
// panel supplies sceneVisual — which every normal GN panel does — and rebuilds from the panel's own
// description. The page-level block never reaches the provider, so the per-panel injection is the
// load-bearing one. An earlier version of this file stopped before this branch and therefore proved
// only that the sanitisers were harmless.
const EXTRACT=grab(/      var _rawScene = _sanitized;[\s\S]*?console\.log\('\[SCENE EXTRACT\][^\n]*\n      \}\n/,'extract');
const CLEAN=grab(/      var _cleanSceneVisual = _rawScene[\s\S]*?\.trim\(\);\n/,'clean');
function providerPrompt(panelMeta, pagePrompt){
  const _sanitized=sanitizeImagePrompt(pagePrompt);
  let _rawScene, _cleanSceneVisual;
  const getTarotDeckVisualHint=undefined;
  const expandLoreToVisual=(t)=>t;                 // real function is identity for this text
  eval(EXTRACT.replace('var _rawScene','_rawScene'));
  eval(CLEAN.replace('var _cleanSceneVisual','_cleanSceneVisual'));
  return _cleanSceneVisual;
}
const runeMeta={ sceneVisual:'A warrior raises a steel sword against the dusk sky.',
                 sceneEmotion:'resolute', sceneCamera:'wide', glintMode:'rune_weapon' };
const plainMeta={ sceneVisual:'A lantern hangs in a doorway.',
                  sceneEmotion:'quiet', sceneCamera:'medium', glintMode:'focal_object' };
const runeScene=providerPrompt(runeMeta, main);
ok('scene extraction did discard the page prompt', !runeScene.includes('comic page divided into'));
ok('the provider prompt STILL carries the rune instruction', carries(runeScene),
   runeScene.slice(-90).replace(/\s+/g,' '));
for (const k of ['CYAN RUNES','DO NOT GLOW','pinhead','FAR APART'])
  ok(('  final provider prompt contains: '+k).padEnd(52), runeScene.includes(k));
ok('and it is not the page-level PANEL N wording', !/PANEL \d+ ONLY/.test(runeScene));
// the provider-side sanitisers run on that extracted scene too
ok('survives the safe sanitiser at the provider boundary', carries(sanitizeImagePrompt(runeScene)));
ok('survives the aggressive retry at the provider boundary', carries(sanitizeImagePromptAggressive(runeScene)));
const plainScene=providerPrompt(plainMeta, buildPrompt([{_glintMode:'focal_object'}]));
ok('a non-rune panel gets NO rune wording at the provider', !/CYAN RUNES|pinhead/.test(plainScene),
   plainScene.slice(0,70));

// 7. THE LAST LINK: the three provider builders are all _buildLabeledPrompt → purgeBannedTokens →
// _smartClamp. The clamp is the live hazard — the rune text is appended to the END of the scene, and
// a clamp cuts from the end. Run the REAL functions on an over-length prompt in BOTH layouts the
// builders emit, rather than reasoning about which zone is protected.
eval(grab(/  var _BANNED_TOKENS = \[[\s\S]*?\n  \];/,'banned'));
eval(grab(/  var _BANNED_PURGE_RE = new RegExp\([\s\S]*?\);\n/,'purgere'));
eval(grab(/  function purgeBannedTokens\(prompt\) \{[\s\S]*?\n  \}/,'purge'));
eval(grab(/  var _MAX_RENDER_PROMPT = [^\n]*\n/,'max'));
eval(grab(/  var _STYLE_OVERRIDE_SENTINEL = [^\n]*\n/,'sent'));
eval(grab(/  var _DETAILS_SENTINEL = [^\n]*\n/,'dsent'));
eval(grab(/  var _CONSTRAINTS_SENTINEL = [^\n]*\n/,'csent'));
eval(grab(/  function _smartClamp\(prompt\) \{[\s\S]*?\n  \}/,'clamp'));
const FILLER=(tag,n)=>('\n'+tag+'\n'+'ornate detail, layered fabric, weathered stone, drifting ash. '.repeat(n));
// the labeled layout the GN path actually builds: [SCENE] first, sentinel after
const labeled=['[SCENE]\n'+runeScene+'. camera: wide', FILLER('[RENDER STATE]',40),
  _STYLE_OVERRIDE_SENTINEL+FILLER('[WORLD]',60)+'\n'+_DETAILS_SENTINEL+FILLER('[ANCHOR]',60),
  '--- STYLE ---'+FILLER('',30)].join('\n');
// golden-master layout: sentinel BEFORE the scene, so the scene is in the trimmable zone
const gm='GOLDEN MASTER REFERENCE. '+ _STYLE_OVERRIDE_SENTINEL+' '+runeScene+FILLER('',80)+'--- STYLE ---'+FILLER('',30);
ok('the test prompts really do exceed the clamp limit',
   labeled.length>_MAX_RENDER_PROMPT && gm.length>_MAX_RENDER_PROMPT, labeled.length+'/'+gm.length+' vs '+_MAX_RENDER_PROMPT);
for (const [name,p] of Object.entries({'labeled (GN panels)':labeled,'golden-master':gm})) {
  const purged=purgeBannedTokens(p);
  ok(('  '+name+': survives purgeBannedTokens').padEnd(52), carries(purged));
  const clamped=_smartClamp(purged);
  ok(('  '+name+': survives _smartClamp at full length').padEnd(52), carries(clamped),
     carries(clamped)?'':'LOST: '+KEY.filter(k=>!clamped.includes(k)).join(', '));
}

console.log('\nNON-RUNE PANELS GET NO RUNE WORDING');
const plain=[{glint:{mode:'focal_object',subject:'the lantern'},beat:'b',visual:'v'}];
_cgNormalizeReflectionModes(plain);
const plainPrompt=buildPrompt(plain);
ok('no rune panel ⇒ no directive in the main prompt', !/CYAN RUNES/.test(plainPrompt));
ok('nor after the safe sanitiser', !/CYAN RUNES/.test(sanitizeImagePrompt(plainPrompt)));
ok('nor after the aggressive sanitiser', !/CYAN RUNES/.test(sanitizeImagePromptAggressive(plainPrompt)));
const plainAttr=runTag({layoutType:'grid',panels:plain},{panel:plain[0]},()=>null,()=>false,()=>false,
  _CG_GLINT_MODE_SET,_CG_SPARKLE_MODE_SET,_CG_GLINT_REGION_SET);
ok('and its shell is not tagged rune_weapon', !/rune_weapon/.test(plainAttr), plainAttr.trim());

console.log('\nTHE DEAD FLAG IS GONE');
ok('_runeDirectiveOmitted no longer exists anywhere', !/_runeDirectiveOmitted/.test(src));
ok('no late downgrade remains', !/downgraded to focal_object/.test(src));

console.log('\nPLANNER PRECEDENCE');
const pol=src.slice(src.indexOf('If several rules could apply'), src.indexOf('If several rules could apply')+420);
ok('rune_weapon sits immediately before focal_object', /rune_weapon → focal_object/.test(pol));
ok('policy forbids emitting a rune weapon as generic focal_object',
   /must be emitted as rune_weapon, NOT as a\s*\n?generic focal_object/.test(pol));
ok('schema offers rune_weapon', /"none \| focal_object \| rune_weapon/.test(src));

console.log(bad?'\n'+bad+' FAILED':'\n🎯 the rune instruction survives every tier, so the tag stays true');
process.exit(bad?1:0);
