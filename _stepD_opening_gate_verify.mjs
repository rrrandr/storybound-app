// HYPOTHESIS FALSIFIED 2026-08-15 — kept as a debug artifact, NOT a passing gate.
// D assumed HOT/LITERARY/PARTICIPATORY OPENING + OPENING TEXTURE leaked onto continuations. The delivery
// audit proved the turn template at app.js:~241700 is SCENE-1-ONLY (OPENING RULE: 1x in the Scene-1
// payload, 0x in the continuation payload), so the gate removed nothing and its SCENE POSTURE branch
// never executed. D was reverted; the real leak was the Scene-1 architecture contract baked into
// state.sysPrompt. See project_author_payload_delivery_audit + _delivery_audit.mjs.
import fs from 'fs';
const s=fs.readFileSync('public/app.js','utf8');
const a=s.indexOf('MACRO SKELETON: ${selectedSkeleton.tag}');
const b=s.indexOf('SENTENCE-SHAPE VARIANCE (MANDATORY)', a);
const tpl=s.slice(a,b);
const fn=new Function('state','selectedSkeleton','selectedOpening','selectedEnvDominance',
  'storyWorld','_isLiterary','_hotOpen','triadDirective','arcCadenceDirective',
  'return `'+tpl+'`;');
const args=(tc)=>[{turnCount:tc},{tag:'SK',directive:'skeleton'},{mode:'MODE',directive:'opening-texture'},
  'Tactile','Fantasy',true,true,'',''];
for (const tc of [0,8]) {
  const out=fn(...args(tc));
  console.log('--- turnCount='+tc+(tc===0?'  (Scene 1)':'  (continuation)')+'   chars='+out.length);
  ['OPENING TEXTURE','opening-texture','HOT OPENING','LITERARY OPENING','PARTICIPATORY OPENING','SCENE POSTURE']
    .forEach(k=>console.log('    '+(out.includes(k)?'present ':'ABSENT  ')+k));
}
