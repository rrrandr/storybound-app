// FREE analyzer. Per snap site: did each authored beat survive with its CAUSAL CHAIN,
// or was it INVERTED into exposition (a character stating what the POV used to infer)?
import fs from 'fs';
const dir = process.argv[2];
if (!dir) { console.error('usage: node _beat_watch.mjs <_validate_out/RUNDIR>'); process.exit(1); }

const CHARACTER_PLUS = [
  { name: 'clay_memory',      observation:['wet clay','fingers once moved'], cause:['I remembered','once moved across'], inference:['heat up my throat','before I could stop it'] },
  { name: 'private_language', observation:['harmonic loops','Weave-Script on his forearms'], cause:['I had no right','no right to read'], inference:['private language'] },
  { name: 'unchosen_test',    observation:['what he saw when he looked at me'], cause:['rumor','rumour'], inference:['test I had not chosen'] },
];
const ENVIRONMENT = [
  { name:'assembly',   detail:['barefoot','gossamer','Two dozen First Favored'], active:['shifting','calm across their skin'] },
  { name:'clearing',   detail:['spiralgrass','veil-canopy','mated-pair'],        active:['filtered','caught the light','rose clear through'] },
];
const FATE = { causal:['spoke without meaning to','crossed the Ascendant Run','no other way','already been offered'],
               symbolic:['stepped from the trees','wearing a face','apparition','manifest','vision of','took the shape'] };

const low = t => String(t||'').toLowerCase();
const has = (t,toks) => toks.some(k => low(t).includes(low(k)));
// INVERSION: the observation now sits inside dialogue, or the possessive flipped to first person.
const quotedSpans = t => (String(t||'').match(/[“"][^”"]{10,400}[”"]/g) || []).join(' ');
const invertedInto = (t,toks) => { const q = quotedSpans(t); return toks.some(k => low(q).includes(low(k))) || /\bmy forearms\b|\byou have no right\b/i.test(t); };
const m = b => b ? '✓' : '·';

const load = f => { try { return JSON.parse(fs.readFileSync(`${dir}/${f}`,'utf8')); } catch(_) { return []; } };
const snaps = [...load('textsnap.json'), ...load('rawsnap.json')].filter(r => r && String(r.after||'').length > 40);

console.log(`\n########  ${dir}  ########`);
for (const b of CHARACTER_PLUS) {
  console.log(`\n═══ CHARACTER+ · ${b.name} ═══`);
  console.log('  site                           OBS CAUSE INFER  verdict');
  let wasAlive=false, died=null, invAt=null;
  for (const r of snaps) {
    const t=String(r.after||'');
    const o=has(t,b.observation), c=has(t,b.cause), i=has(t,b.inference);
    const inv=o && !c && invertedInto(t,b.observation);
    const alive=o&&c&&i;
    const v = alive ? 'intact'
            : inv ? '⚠ INVERTED → spoken as exposition'
            : (o&&!c) ? '⚠ observation kept, CAUSE LOST'
            : (!o&&!c&&!i) ? 'absent' : 'partial';
    console.log(`  ${String(r.label||r.site||'?').slice(0,29).padEnd(30)} ${m(o)}   ${m(c)}     ${m(i)}      ${v}`);
    if (wasAlive && !alive && !died) { died = r.label||r.site; if (inv) invAt = died; }
    if (alive) wasAlive = true;
  }
  console.log(died ? `  ⟹ LOST AT: ${died}${invAt?'  (by INVERSION, not deletion)':''}` : '  ⟹ survived to delivery');
}
const last = snaps[snaps.length-1] ? String(snaps[snaps.length-1].after||'') : '';
const first = snaps.find(r=>/callChat|grokLiteraryAuthor|authorChatCapture/i.test(String(r.label||'')));
const raw = first ? String(first.after||'') : '';
console.log('\n═══ ENVIRONMENT+ ═══');
for (const e of ENVIRONMENT)
  console.log(`  ${e.name.padEnd(12)} raw: detail ${m(has(raw,e.detail))} active ${m(has(raw,e.active))}   delivered: detail ${m(has(last,e.detail))} active ${m(has(last,e.active))}`);
console.log('\n═══ FATE+ ═══');
console.log(`  raw:       causal-path ${m(has(raw,FATE.causal))}   symbolic-manifestation ${m(has(raw,FATE.symbolic))}`);
console.log(`  delivered: causal-path ${m(has(last,FATE.causal))}   symbolic-manifestation ${m(has(last,FATE.symbolic))}`);
