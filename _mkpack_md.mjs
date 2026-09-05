import fs from 'fs';
const pack=JSON.parse(fs.readFileSync('_validate_out/BLIND_PACK.json','utf8'));
let md=`# Blind read — four scenes, two versions each

In each scene, one column is version **X** and the other is version **Y**. One of them is a raw
first-draft passage; the other is the same passage after an automated editing pipeline. Which is
which is randomized per scene and withheld.

**Task:** for each scene, judge X vs Y independently and report:

- overall preference: X / Y / tie
- strength: decisive / clear / slight / coin-flip
- prose quality
- clarity and causal legibility (can you follow what physically happens?)
- character interiority
- voice consistency
- dialogue
- pacing
- specificity and imagery
- repetition or calcified phrasing
- does either feel over-edited or mechanically "improved"?

Do not infer from length; it is not a reliable signal here.

---
`;
for(const s of pack){
  md+=`\n## Scene ${s.scene}\n\n### ${s.scene} — Version X\n\n${s.X.trim()}\n\n### ${s.scene} — Version Y\n\n${s.Y.trim()}\n\n---\n`;
}
fs.writeFileSync('_validate_out/BLIND_PACK_SHAREABLE.md', md);
console.log('written: _validate_out/BLIND_PACK_SHAREABLE.md  ('+fs.statSync('_validate_out/BLIND_PACK_SHAREABLE.md').size+' bytes)');
console.log('scenes: '+pack.length+'   contains no labels, no key, no checkpoint data');
