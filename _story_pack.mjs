// _story_pack.mjs — WHOLE-STORY blind pack (Roman 2026-08-15). The unit of judgment is the 20-scene ISSUE,
// not the scene. Per-scene marks are annotation only; the verdict is about accumulation and causal descent.
//   node _story_pack.mjs            → _blind_out/story_pack.md + story_KEY.sealed.json
//   node _story_pack.mjs --reveal
import fs from 'fs';
const OUT='_blind_out', KEY=OUT+'/story_KEY.sealed.json';

if (process.argv.includes('--reveal')) {
  const k=JSON.parse(fs.readFileSync(KEY,'utf8'));
  console.log('\n═══ REVEAL — spine provenance ═══');
  Object.entries(k.map).forEach(([label,arm])=>console.log(`  Issue ${label} = ${arm==='gen'
    ? 'MACHINE-GENERATED spine (world simulator → entity IR → concrete enumerator → windowed schedule)'
    : 'HAND-AUTHORED spine (STARTER_PLANS, app.js)'}`));
  console.log(`\n  sealed at: ${k.sealedAt}\n`); process.exit(0);
}

const arms=['gen','hand'].map(a=>{
  const p=`/tmp/arm_${a}.json`;
  if(!fs.existsSync(p)){ console.error(`MISSING ${p}`); process.exit(1); }
  const d=JSON.parse(fs.readFileSync(p,'utf8'));
  if(!d.complete) console.error(`WARN arm ${a} incomplete (${d.capturedScenes}/${d.target})`);
  return {arm:a, scenes:d.scenes};
});
const flip=Math.random()<0.5;
const labelOf={[flip?'A':'B']:'gen', [flip?'B':'A']:'hand'};
const byArm=Object.fromEntries(arms.map(a=>[a.arm,a]));
fs.mkdirSync(OUT,{recursive:true});
fs.writeFileSync(KEY, JSON.stringify({map:labelOf, sealedAt:new Date().toISOString()},null,2));

const strip=t=>String(t||'')
  .replace(/^\s*\[(?:TITLE|SYNOPSIS|CHARACTERS|BEAT|SCENE)\s*:[^\]]*\]\s*$/gim,'')
  .replace(/\n{3,}/g,'\n\n').trim();

let md=`# Two issues of *The First Sacrifice* — whole-story blind read\n\n`;
md+=`Same frozen build, same seed and canon, same cast (Lirael / Julian), same author and editorial stack,\n`;
md+=`same reasoning effort (**high**, verified), same 20 scenes, same player inputs.\n`;
md+=`**One variable differs: where each scene's goal came from.** Which is which is sealed.\n\n`;
md+=`Scene 1 is produced by the opening-template path in both issues and does not read the spine, so the\n`;
md+=`comparison really begins at scene 2.\n\n`;
md+=`## How to read this\n\n`;
md+=`Read each issue **straight through, as a story**. Per-scene notes are optional annotation — the verdict\n`;
md+=`is about the whole. After each issue, answer:\n\n`;
md+=`1. Does each scene **materially change the situation**?\n`;
md+=`2. Do **consequences accumulate**?\n`;
md+=`3. Do **resolved beats stay resolved**?\n`;
md+=`4. Does it **avoid circling** the same conflict?\n`;
md+=`5. Do **character decisions cause later events**?\n`;
md+=`6. Does tension/escalation have an **intelligible shape**?\n`;
md+=`7. Does scene 20 feel **causally descended** from 1–19?\n`;
md+=`8. **Did you read a story, or twenty generated scenes?**\n\n---\n`;

for (const label of ['A','B']) {
  const a=byArm[labelOf[label]];
  md+=`\n\n# ISSUE ${label}\n`;
  a.scenes.forEach(s=>{
    md+=`\n## ${label}·${s.n}\n\n`;
    if(s.n>1 && s.action) md+=`> *player:* ${s.action}${s.dialogue?` — "${s.dialogue}"`:''}\n\n`;
    md+=strip(s.text)+`\n\n`;
    md+=`\`note (optional): ______\`\n\n---\n`;
  });
  md+=`\n### Issue ${label} — whole-story answers\n\n`;
  ['materially changes situation','consequences accumulate','resolved beats stay resolved','avoids circling',
   'decisions cause later events','escalation has a shape','scene 20 descends causally','story vs 20 scenes']
   .forEach((q,i)=>{ md+=`${i+1}. ${q}: ______\n`; });
  md+=`\n`;
}
md+=`\n\n## Final verdict\n\n- Which issue is the better **story**: A / B / tie\n- Which would you **keep reading into issue two**: A / B / tie\n- One sentence on why: ______\n\nThen: \`node _story_pack.mjs --reveal\`\n`;

fs.writeFileSync(OUT+'/story_pack.md', md);
fs.writeFileSync(OUT+'/story_scenes.json', JSON.stringify(
  {A:byArm[labelOf.A].scenes.map(s=>({...s,text:strip(s.text)})),
   B:byArm[labelOf.B].scenes.map(s=>({...s,text:strip(s.text)}))},null,2));
// No per-arm word/char counts printed — that leaked provenance twice before.
console.log(`\nSTORY PACK → ${OUT}/story_pack.md`);
console.log(`  Issue A: ${byArm[labelOf.A].scenes.length} scenes`);
console.log(`  Issue B: ${byArm[labelOf.B].scenes.length} scenes`);
console.log(`  key sealed → ${KEY}\n`);
