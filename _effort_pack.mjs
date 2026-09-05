// _effort_pack.mjs — blind pack for the reasoning-effort A/B. Per-pair independent randomization so no
// global "A is always X" pattern can leak. Key sealed separately.
//   node _effort_pack.mjs            → _blind_out/effort_pack.md + effort_KEY.sealed.json
//   node _effort_pack.mjs --reveal   → prints the key
import fs from 'fs';
const OUT='_blind_out', KEY=OUT+'/effort_KEY.sealed.json';

if (process.argv.includes('--reveal')) {
  const k=JSON.parse(fs.readFileSync(KEY,'utf8'));
  console.log('\n═══ REVEAL — reasoning effort ═══');
  k.map.forEach(r=>console.log(`  ${r.pair.padEnd(22)} A = ${r.A.padEnd(5)}   B = ${r.B}`));
  console.log(`\n  sealed at: ${k.sealedAt}\n`);
  process.exit(0);
}

const d=JSON.parse(fs.readFileSync(process.env.IN||'/tmp/effort_ab.json','utf8'));
const complete=d.pairs.filter(p=>p.high&&p.none);
if (complete.length<d.pairs.length) console.error(`WARN ${d.pairs.length-complete.length} incomplete pair(s) excluded`);

const map=[]; let md='';
md += `# Reasoning-effort blind read — 5 matched pairs\n\n`;
md += `Each pair was generated from **byte-identical seeded state**: same frozen build, same story, same prior\n`;
md += `prose, same spine event, same player input. **The only difference is the author's reasoning effort.**\n`;
md += `Order within each pair is randomized independently, so A is not consistently one condition.\n\n`;
md += `## How to score\n\nFor each pair: **which would you rather ship — A / B / tie?** Then one word on why:\n`;
md += `*prose · subtext · continuity · lore · causality · mistake*.\n\n`;
md += `Then: \`node _effort_pack.mjs --reveal\`\n\n---\n`;

const STRESS={
 'dialogue-subtext':'characters saying one thing while wanting another',
 'emotional-inference':'must infer reaction rather than execute action',
 'lore-fidelity':'the spine says the artifact "pulses with energy"; Fatelands canon says a wish produces NO visible magical effect — a real constraint collision',
 'action-staging':'relocation + active pursuit + spatial continuity',
 'hard-continuity':'prior facts must be remembered and correctly integrated'};

complete.forEach((p,i)=>{
  const flip=Math.random()<0.5;
  const A=flip?'high':'none', B=flip?'none':'high';
  map.push({pair:p.key, A, B});
  md += `\n## Pair ${i+1} — ${p.key}\n\n`;
  md += `**What this stresses:** ${STRESS[p.key]||''}\n\n`;
  md += `> *spine event:* ${p.goal}\n>\n> *player:* ${p.act}${p.dia?` — "${p.dia}"`:''}\n\n`;
  md += `### ${i+1}A\n\n${p[A].trim()}\n\n### ${i+1}B\n\n${p[B].trim()}\n\n`;
  md += `\`rather ship: A / B / tie\`  ·  \`why: prose / subtext / continuity / lore / causality / mistake\`\n\n---\n`;
});
md += `\n\n## Verdict\n\n`;
complete.forEach((p,i)=>{ md += `- Pair ${i+1} (${p.key}): ___\n`; });
md += `\n**Tally — high: __ / none: __ / tie: __**\n\nThen: \`node _effort_pack.mjs --reveal\`\n`;

fs.mkdirSync(OUT,{recursive:true});
fs.writeFileSync(OUT+'/effort_pack.md', md);
fs.writeFileSync(KEY, JSON.stringify({map, sealedAt:new Date().toISOString()},null,2));
console.log(`\nEFFORT PACK → ${OUT}/effort_pack.md   (${complete.length} pairs)`);
// NEVER print per-condition lengths here. Doing so leaks provenance: the reader can measure each labelled
// section in the doc and match it back to the condition. (Done twice now — word counts on the spine A/B,
// char counts here.) Pair names only.
complete.forEach((p,i)=>console.log(`  pair ${i+1} ${p.key}`));
console.log(`  key sealed → ${KEY}\n`);
