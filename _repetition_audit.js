// Mechanical intra-story repetition detector. Feeds the human close-read.
//   node _repetition_audit.js /tmp/issue_literary.json
// Reports: cross-scene repeated n-gram shingles (4-8 words, in >=2 scenes),
// bucketed by descriptive subject, + targeted "observation" phrase frequency.

const fs = require('fs');
const IN = process.argv[2] || '/tmp/issue_literary.json';
const data = JSON.parse(fs.readFileSync(IN, 'utf8'));
const scenes = data.scenes.map(s => ({ idx: s.idx, text: String(s.text || '') + ' ' + String(s.oasText || '') }));

const STOP = new Set('a an the of to and in on at for with from into over under as is are was were be been being it its this that these those he she they him her his hers their them i me my we us our you your of by but or so if then than too very just about out up down so'.split(/\s+/));
function norm(t){ return t.toLowerCase().replace(/[^a-z0-9'\s]/g,' ').replace(/\s+/g,' ').trim(); }
function words(t){ return norm(t).split(' ').filter(Boolean); }

// ---- cross-scene shingle repetition ----
function shingles(ws, n){ const out=[]; for(let i=0;i+n<=ws.length;i++) out.push(ws.slice(i,i+n).join(' ')); return out; }
const shingleScenes = {}; // shingle -> Set(sceneIdx)
for (const sc of scenes){
  const ws = words(sc.text);
  for (let n=4;n<=8;n++){
    for (const sh of new Set(shingles(ws,n))){
      const toks = sh.split(' ');
      const contentToks = toks.filter(w=>!STOP.has(w));
      if (contentToks.length < 2) continue;            // skip mostly-function-word shingles
      (shingleScenes[sh] = shingleScenes[sh] || new Set()).add(sc.idx);
    }
  }
}
let reps = Object.entries(shingleScenes)
  .filter(([,set]) => set.size >= 2)
  .map(([sh,set]) => ({ sh, scenes:[...set].sort((a,b)=>a-b), n: sh.split(' ').length }));
// suppress sub-shingles fully contained in a longer repeated shingle with same scene-set
reps.sort((a,b)=> b.n - a.n);
const kept = [];
for (const r of reps){
  const sset = r.scenes.join(',');
  const covered = kept.some(k => k.sh.includes(r.sh) && k.scenes.join(',')===sset);
  if (!covered) kept.push(r);
}
kept.sort((a,b)=> (b.scenes.length - a.scenes.length) || (b.n - a.n));

// bucket by descriptive subject
const BUCKETS = {
  eyes: /\b(eyes?|gaze|iris|pupils?|stare|stares|staring|look(ed|ing)?)\b/,
  hair: /\b(hair|curls?|strands?|locks?|tresses)\b/,
  scar_mark: /\b(scar|scars|mark|marks|bruise|tattoo|birthmark)\b/,
  mouth: /\b(mouth|lips?|smile|smirk|jaw|teeth|tongue)\b/,
  hands: /\b(hands?|fingers?|knuckles?|thumb|palm|wrist)\b/,
  voice: /\b(voice|whisper|murmur|growl|tone|breath|breathe)\b/,
  room_status: /\b(room|office|penthouse|gallery|marble|glass|money|wealth|expensive|empire|power)\b/,
  attraction: /\b(want|desire|heat|pulse|skin|ache|crave|hunger|warmth|shiver|tremble)\b/,
  seeing_me: /\b(see|sees|seen|seeing|read|reads|knows|understands|notices?)\b/,
};
function bucketOf(sh){ for (const [k,re] of Object.entries(BUCKETS)) if (re.test(sh)) return k; return 'other'; }

console.log('\n================= '+IN+' ('+scenes.length+' scenes) =================');
console.log('\n--- A. CROSS-SCENE REPEATED PHRASES (n-gram shingles in >=2 scenes) ---');
const byBucket = {};
for (const r of kept){ (byBucket[bucketOf(r.sh)] = byBucket[bucketOf(r.sh)]||[]).push(r); }
for (const [bk, arr] of Object.entries(byBucket).sort((a,b)=>b[1].length-a[1].length)){
  console.log(`\n[${bk}]  (${arr.length} repeated phrases)`);
  for (const r of arr.slice(0,18)) console.log(`   x${r.scenes.length} scenes ${JSON.stringify(r.scenes)}  "${r.sh}"`);
}

// ---- targeted observation phrases ----
console.log('\n--- B. OBSERVATION-RESTATEMENT PROBES (regex hits per scene) ---');
const OBS = {
  'he is dangerous': /\bdangerous\b/i,
  'sees too much / through me': /\b(sees? (right )?through me|sees too much|reads me|nothing escapes (him|those)|sees everything)\b/i,
  "I don't belong here": /\b(don't belong|out of place|doesn't belong|not made for this world|imposter)\b/i,
  'room changes around him': /\b(room (seemed to )?(shift|change|recalibrate|tilt|shrink)|air changed|everything (re)?arranged)\b/i,
  "I shouldn't want him": /\b(shouldn't want|should not want|can't want|knew better than to want|wanted him anyway)\b/i,
  'scandal could destroy me': /\b(scandal|ruin(ed)?|destroy|reputation|expose[ds]?|disgrace)\b/i,
  'he is trouble/wrong': /\b(trouble|wrong for me|bad idea|mistake)\b/i,
  'predator/wolf imagery': /\b(predator|wolf|prey|hunter|hunt(ed|ing)?|circling)\b/i,
};
for (const [label,re] of Object.entries(OBS)){
  const hits = scenes.filter(s=>re.test(s.text)).map(s=>s.idx);
  if (hits.length) console.log(`   "${label}"  -> scenes ${JSON.stringify(hits)}  (${hits.length}/${scenes.length})`);
}

// ---- per-scene length + lexical profile ----
console.log('\n--- C. PER-SCENE LENGTH ---');
for (const s of scenes) console.log(`   scene ${s.idx}: ${words(s.text).length} words`);
console.log('\n   total words:', scenes.reduce((a,s)=>a+words(s.text).length,0));
