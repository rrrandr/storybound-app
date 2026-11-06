#!/usr/bin/env node
// PROVIDER-FREE CONTROL for the author→Grok handoff. This is a CONTROL, not the requested
// handoff test: nothing is dispatched and no prose is produced. It establishes only that on a
// GENUINELY explicit state both repair passes route to Grok with Grok's own allowances, read
// separately from the author's.
import fs from 'node:fs'; import vm from 'node:vm';
const ROOT='/Users/romantsukerman/storybound-app';
let pass=0; const fails=[];
const ok=(c,l,x)=>{ if(c){pass++;console.log('  ok    '+l);} else {fails.push(l);console.log('  FAIL  '+l+(x?'\n        '+x:''));} };

// ── THE GATE, AS PRODUCTION DEFINES IT ────────────────────────────────────────────────────
const SRC=fs.readFileSync(ROOT+'/public/app.js','utf8');
const gi=SRC.indexOf('window._proseModerationHot = function (st) {');
const gate=SRC.slice(gi, SRC.indexOf('\n  };', gi)+5);
const win={}; vm.runInThisContext('(function(window){'+gate+'})')(win);
const hot=win._proseModerationHot;

console.log('\n[1] THE GENUINE EXPLICIT CONDITION');
ok(hot({ eroticMode: 'CARNAL' })===true, '1a: CARNAL state is explicit');
ok(hot({ intimacyDialogue: { active: true } })===true, '1b: live intimacy dialogue is explicit');
ok(hot({ eroticMode: 'ROMANTIC' })===false,
  '1c: ROMANTIC is NOT — which is every saved checkpoint in this workspace');

console.log('\n[2] BOTH REPAIRS INHERIT THE CLASS FROM ONE DEFINITION');
const disp=SRC.slice(SRC.indexOf("resp = await fetch('/api/cplus-editor'"), SRC.indexOf("resp = await fetch('/api/cplus-editor'")+1400);
ok(/_proseModerationHot\(s\)\) \? 'explicit' : 'general'/.test(disp),
  '2a: the shared dispatcher computes contentClass from the same gate');
ok(/catch \(_\) \{ return 'explicit'; \}/.test(disp),
  '2b: unreadable state falls to the SAFE side, not to Luna');
// Both passes call the same dispatcher, so neither can carry a different class.
const site=SRC.slice(SRC.indexOf('TWO INDEPENDENTLY SCHEDULED PASSES, IN ORDINARY GENERATION'),
  SRC.indexOf('TWO INDEPENDENTLY SCHEDULED PASSES, IN ORDINARY GENERATION')+5200);
const dispatchers=(site.match(/_ebEditorDispatch/g)||[]).length;
ok(dispatchers>=2, '2c: picturability and the craft pass use that one dispatcher',
  'references: '+dispatchers);
ok(!/contentClass/.test(site),
  '2d: neither pass sets its own class — it cannot drift per pass');

console.log('\n[3] THE REPAIRS\' EFFECTIVE SETTINGS, READ SEPARATELY FROM THE AUTHOR\'S');
// THE REAL FUNCTION, not a regex over its source. Matching source text is how the previous
// version of this control reported six false failures.
const { editorConfigFor } = await import(ROOT + '/api/cplus-editor.js');
const ex = editorConfigFor('explicit');
const ge = editorConfigFor('general');
ok(ex.model === 'grok-4.3', '3a: explicit \u2192 grok-4.3', ex.model);
ok(ex.capField === 'max_tokens',
  '3b: with max_tokens, NOT max_completion_tokens (the provider field differs)', ex.capField);
ok(ex.floorOutputTokens === 600 && ex.maxOutputTokens === 2400,
  "3c: and Grok's own 600\u20132,400 allowance, not Luna's fixed 6,000",
  ex.floorOutputTokens + '\u2013' + ex.maxOutputTokens);
ok(ge.model === 'gpt-6-luna' && ge.floorOutputTokens === 6000,
  "3d: general stays Luna at 6,000 \u2014 unchanged by the explicit path",
  ge.model + ' @ ' + ge.floorOutputTokens);
ok(ex.effort === null || ex.effort === undefined,
  '3e: no reasoning_effort is sent to Grok on this path', String(ex.effort));
ok(ex.rateIn === 1.25e-6 && ex.rateOut === 2.5e-6,
  "3f: explicit repair rates are Grok's $1.25/$2.50 per MTok, not Luna's $0.10/$0.50",
  ex.rateIn + '/' + ex.rateOut);
ok(ex.capField !== ge.capField && ex.model !== ge.model,
  '3g: the two configurations differ in BOTH model and provider field');

console.log('\n[4] WHAT THIS CONTROL DOES NOT ESTABLISH');
console.log('   It dispatches nothing, produces no prose, and exercises no author handoff.');
console.log('   It cannot substitute for the requested test, which needs adults-only material.');

console.log('\n' + (fails.length?'FAIL':'PASS') + '  ' + pass + ' checks, ' + fails.length + ' failed');
for(const f of fails) console.log('  FAILED: '+f);
process.exit(fails.length?1:0);
