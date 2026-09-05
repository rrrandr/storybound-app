import fs from 'fs';
const d=JSON.parse(fs.readFileSync('_validate_out/assign_sessionA.json','utf8'));
const sents=t=>String(t||'').replace(/\s+/g,' ').split(/(?<=[.!?"”])\s+/).map(s=>s.trim()).filter(s=>s.length>12);
const norm=s=>s.toLowerCase().replace(/[^a-z ]/g,'').replace(/\s+/g,' ').trim();
for(const id of ['V2','V3','V5']){
  const r=d.results.find(x=>x.id===id); if(!r||!r.authorRaw) {console.log(id+': no raw'); continue;}
  const R=sents(r.authorRaw), F=sents(r.finalProse);
  const Rn=new Set(R.map(norm)), Fn=new Set(F.map(norm));
  const added=F.filter(s=>!Rn.has(norm(s)));
  const removed=R.filter(s=>!Fn.has(norm(s)));
  console.log('\n════ '+id+'  raw '+R.length+' sents → final '+F.length+' sents ════');
  console.log('  ADDED downstream ('+added.length+'):');
  added.slice(0,6).forEach(s=>console.log('    + '+s.slice(0,150)));
  console.log('  REMOVED downstream ('+removed.length+'):');
  removed.slice(0,4).forEach(s=>console.log('    - '+s.slice(0,150)));
}
