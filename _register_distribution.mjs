// NARRATION vs DIALOGUE REGISTER, Scenes 2-6, from the RAW author responses. $0, no provider.
import fs from 'fs'; import path from 'path';
const D = '_fs_live_out/run_2026-10-06T16-50-01-923Z/wire';
const SENT = /(?<=[.?!"'”’])\s+(?=["'“‘]?[A-Z])/;
const scenes = [];
for (const f of fs.readdirSync(D).filter(x => x.endsWith('_res.json')).sort()) {
  let p; try {
    const j = JSON.parse(fs.readFileSync(path.join(D,f),'utf8'));
    const c = (j.choices||[{}])[0]?.message?.content || j.content;
    p = JSON.parse(typeof c === 'string' ? c : JSON.stringify(c));
  } catch(_) { continue; }
  if (!Array.isArray(p?.beats) || p.beats.length < 3) continue;
  scenes.push({ f, beats: p.beats });
}
console.log('scenes recovered from raw author responses: ' + scenes.length + '\n');
const buckets = { narration: [], dialogue: [], exposition: [] };
let total = 0;
for (const s of scenes) for (const b of s.beats) {
  const kind = (b.kind||'narration').toLowerCase();
  if (!buckets[kind]) buckets[kind] = [];
  const txt = String(b.text||'').trim(); if (!txt) continue;
  const sents = txt.split(SENT).filter(Boolean).length;
  const words = txt.split(/\s+/).filter(Boolean).length;
  buckets[kind].push({ sents, words, txt }); total++;
}
console.log('total beats: ' + total + '\n');
for (const k of ['narration','exposition','dialogue']) {
  const arr = buckets[k]||[]; if (!arr.length) continue;
  const dist = {}; arr.forEach(x => { dist[x.sents] = (dist[x.sents]||0)+1; });
  const w = arr.map(x=>x.words).sort((a,b)=>a-b);
  const mean = (w.reduce((a,b)=>a+b,0)/w.length).toFixed(1);
  console.log('=== ' + k.toUpperCase() + ' — ' + arr.length + ' beats');
  console.log('   sentences per beat: ' + Object.keys(dist).sort().map(n => n+' sent: '+dist[n]+' ('+Math.round(100*dist[n]/arr.length)+'%)').join(' · '));
  console.log('   words per beat: mean ' + mean + ' · median ' + w[Math.floor(w.length/2)] + ' · min ' + w[0] + ' · max ' + w[w.length-1]);
  const over2 = arr.filter(x=>x.sents>2).length;
  console.log('   beats the MAX_SENTENCES_PER_BEAT=2 cap would split: ' + over2 + ' of ' + arr.length + '\n');
}
// repeated atmospheric lines in narration
const nar = (buckets.narration||[]).map(x=>x.txt);
const heads = {};
nar.forEach(t => { const h = t.split(/\s+/).slice(0,3).join(' ').toLowerCase(); heads[h]=(heads[h]||0)+1; });
const rep = Object.entries(heads).filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]).slice(0,6);
console.log('=== REPEATED NARRATION OPENINGS (first three words)');
rep.forEach(([h,n]) => console.log('   x'+n+'  "'+h+'..."'));
