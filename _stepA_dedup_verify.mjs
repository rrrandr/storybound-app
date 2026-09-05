import fs from 'fs';
// Port of the PATCHED logic (stripper → fuzzy dedup → append), applied to the real corpus text.
function applyFrame(text, closer, patched){
  let out = text;
  // ── stripper ──
  const frags=[]; (closer.match(/"[^"]+"/g)||[]).forEach(q=>{if(q.length>=5)frags.push(q);});
  closer.split(/(?<=[.!?…])\s+/).forEach(s=>{s=s.trim(); if(s.length>=10)frags.push(s);});
  const F=[...new Set(frags)].sort((a,b)=>b.length-a.length);
  if(patched){
    const cw=closer.toLowerCase().replace(/[^a-z'\s]/g,' ').split(/\s+/).filter(w=>w.length>=4);
    const cs={}; cw.forEach(w=>cs[w]=1);
    const sentF=F.filter(f=>f[0]!=='"'), quoteF=F.filter(f=>f[0]==='"');
    out = out.split(/(?<=[.!?…])\s+|\n+/).filter(sn=>{
      if(!sn||!sn.trim())return true;
      const hs=sentF.some(f=>sn.includes(f)), hq=quoteF.some(f=>sn.includes(f));
      if(!hs&&!hq)return true;
      if(hs)return false;
      const sw=sn.toLowerCase().replace(/[^a-z'\s]/g,' ').split(/\s+/).filter(w=>w.length>=4);
      if(sw.length<4)return true;
      let h=0; sw.forEach(w=>{if(cs[w])h++;});
      return !(h/sw.length>=0.6);
    }).join(' ');
  } else {
    F.forEach(fr=>{ out = out.split(fr).join(''); });
  }
  out = out.replace(/[ \t]+([.,!?;:…])/g,'$1').replace(/[ \t]{2,}/g,' ').trim();
  // ── fuzzy dedup ──
  const clW=closer.toLowerCase().replace(/[^a-z'\s]/g,' ').split(/\s+/).filter(w=>w.length>=4);
  const clS={}; clW.forEach(w=>clS[w]=1);
  out.split(/(?<=[.!?])\s+|\n+/).forEach(sn=>{
    if(!sn||sn.length<12||sn.includes(closer))return;
    const sw=sn.toLowerCase().replace(/[^a-z'\s]/g,' ').split(/\s+/).filter(w=>w.length>=4);
    if(sw.length<3)return;
    let hits=0; sw.forEach(w=>{if(clS[w])hits++;});
    const ov = patched ? (sw.length>=4 ? hits/sw.length : 0) : hits/Math.max(clW.length,sw.length);
    if(ov>=0.6) out = out.replace(sn,'');
  });
  out = out.replace(/[ \t]{2,}/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  return out + '\n\n' + closer;   // canonical append
}
const CLOSER = 'I realize that old tarot deck is still in my hand. Reassuringly solid. Present. One of the heavy gold cards slips out — "Petition Fate" is inscribed in it. If only it were that easy. I would wish myself a way out. No — a way in. If only…';
// the REAL model body, reconstructed from the corpus (echo present, closer not yet appended)
// REAL echo from the corpus: a PARAPHRASE ("inscribed ON it"), so only the quoted card name matches verbatim.
const BODY = `The token passed from hand to hand. The murmurs grew. The youth's breath came shallow beside me, the warmth still gone from her fingers.

Present. One of the heavy gold cards slips out — "Petition Fate" is inscribed on it. If only…`;
const CONTROL = `She thought of the Petition Fate card her grandmother kept, and of the heavy rain outside.`;

for (const [label,patched] of [['BEFORE (shipped logic)',false],['AFTER  (patched)',true]]){
  const r=applyFrame(BODY,CLOSER,patched);
  const n=(r.match(/is inscribed in it/g)||[]).length;
  const orphan=/—\s*is inscribed on it|slips out\s*—\s*is inscribed/.test(r);
  console.log('\n──── '+label+' ────');
  console.log('  canonical closer occurrences : '+n+(n===1?'  ✅':'  ❌'));
  console.log('  mangled orphan fragment      : '+(orphan?'PRESENT ❌':'none ✅'));
  console.log('  result tail: …'+r.slice(-150).replace(/\n/g,' '));
}
console.log('\n──── false-positive guard ────');
const c=applyFrame(CONTROL,CLOSER,true);
console.log('  incidental "Petition Fate" mention preserved: '+(c.includes('grandmother')?'YES ✅':'NO ❌'));
