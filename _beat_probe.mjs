// Beat SURVIVAL, not continuity. Five planted Character+ anchors; each must keep its
// observation AND its causal clause. Deletion leaves nothing "new" to detect, so a
// creation-only audit passes while the prose goes flat.
import fs from 'fs';
const BEATS = [
  { id:'julian_laugh',   obs:['he laughed','same short laugh'],        cause:['questions he did not intend to answer','four times in six years'] },
  { id:'youth_count',    obs:['checked them twice'],                    cause:['the way I had taught her','a miscount was the only failure'] },
  { id:'dohkar_order',   obs:['asked after my mother'],                 cause:['in that order','before she asked'] },
  { id:'lirael_misread', obs:['stayed out of respect'],                 cause:['waiting for the crowd to thin','without being seen'] },
  { id:'julian_sleeve',  obs:['hand went to his sleeve'],               cause:['never covers the script when he is calm'] },
];
const dir = process.argv[2];
const has=(t,ks)=>ks.some(k=>t.toLowerCase().includes(k.toLowerCase()));
const raw = fs.readFileSync('_capture_inputs/beat_scene.txt','utf8');
const dlv = fs.readFileSync(`_validate_out/${dir}/final.txt`,'utf8');
let snaps=[]; for (const f of fs.readdirSync(`_validate_out/${dir}`).filter(x=>/textsnap|rawsnap_full|prosesnap_full/.test(x)))
  { try{ snaps=snaps.concat(JSON.parse(fs.readFileSync(`_validate_out/${dir}/${f}`,'utf8'))); }catch(_){} }
let lost=0;
console.log('  beat              raw            delivered       verdict');
for (const b of BEATS) {
  const rO=has(raw,b.obs), rC=has(raw,b.cause), dO=has(dlv,b.obs), dC=has(dlv,b.cause);
  const alive = dO && dC;
  let owner='';
  if (!alive) { lost++;
    for (const s of snaps) { if(!s.before||s.before===s.after) continue;
      const bO=has(s.before,b.obs)&&has(s.before,b.cause), aO=has(s.after,b.obs)&&has(s.after,b.cause);
      if (bO && !aO) { owner = '  ← lost at ' + (s.label||s.site); break; } } }
  console.log(`  ${b.id.padEnd(16)} obs${rO?'✓':'·'} cause${rC?'✓':'·'}   obs${dO?'✓':'·'} cause${dC?'✓':'·'}   ${alive?'INTACT':'LOST'}${owner}`);
}
console.log(`\n  ${BEATS.length-lost}/${BEATS.length} beats survived to the reader.`);
