// LIVE-PROSE de-prime check (Roman 2026-06-12). OPT-IN + PAID + NOT a gate.
//
// Unlike verify:scene1 (deterministic, free), this makes REAL Sonnet calls via
// the local vercel-dev anthropic-proxy and scans actual output for the
// de-primed literals + restless_hands + operator/admin occupations, across N
// fresh storyIds (so the rotation windows differ). It is a HAND-MIRROR of the
// Scene-1 prompt (the real de-primed pools + occupation guard, NOT the full
// 22-call pipeline) — directional evidence, not the browser ground truth.
//
// Requires: vercel dev running at PROXY_URL (default http://localhost:3000)
//           and ANTHROPIC_API_KEY in .env.local (vercel dev loads it).
// Usage:    node scripts/live-prose-check.mjs   (env: N=4 MODEL=claude-sonnet-4-5 PROXY_URL=...)
// Cost:     ~N Sonnet calls (a few cents). NEVER run from a hook.

import fs from 'node:fs';
const src = fs.readFileSync('new URL("../public/app.js", import.meta.url)', 'utf8');
const PROXY = process.env.PROXY_URL || 'http://localhost:3000';
const MODEL = process.env.MODEL || 'claude-sonnet-4-5';
const N = parseInt(process.env.N || '4', 10);

// ── load real pools + rotator + occupation guard from app.js ──
global.window = {};
const pool = (n) => eval(src.match(new RegExp('window\\.'+n+'\\s*=\\s*(\\[[\\s\\S]*?\\]);'))[1]);
window._PC_GESTALT_POOL=pool('_PC_GESTALT_POOL'); window._LI_GESTALT_POOL=pool('_LI_GESTALT_POOL');
window._LI_DESIRE_FEATURE_POOL=pool('_LI_DESIRE_FEATURE_POOL'); window._CONNECTOR_DESC_POOL=pool('_CONNECTOR_DESC_POOL');
window._HEROINE_CAREER_POOL=pool('_HEROINE_CAREER_POOL'); window._PC_BODY_TELL_POOL_FEMALE=pool('_PC_BODY_TELL_POOL_FEMALE');
const LS={}; let SID='';
window._rotatingExemplars=function(k,p,c){ c=Math.min(c||4,p.length); if(p.length<=c)return p.slice();
  const off=((parseInt(LS['c_'+k+'_'+SID]??LS['c_'+k]??'0',10))%p.length+p.length)%p.length;
  LS['c_'+k]=String((off+c)%p.length); LS['c_'+k+'_'+SID]=String(off);
  const w=[]; for(let i=0;i<c;i++)w.push(p[(off+i)%p.length]); return w; };
eval(src.match(/window\._heroineCareerExamples\s*=\s*function[\s\S]*?\n  \};/)[0]);
eval(src.match(/window\._heroineOccupationGuard\s*=\s*function[\s\S]*?\n  \};/)[0]);

// ── scanners (the real canonical regexes) ──
const BANNED=['amber eyes','pale amber','ringed iris','flat and unreadable','eyes went flat','hollywood actress','rooms recalibrate','renaissance statue','film star','pulled back into a bun','bun tighter than'];
const RH=/\b(hands?|fingers?|knuckles?|thumb|thumbnail|tongue|teeth|tooth|jaw|lips?|mouth)\b[^.?!\n]{0,45}\b(restless|fidget(?:ed|ing|y)?|tighten(?:ed|ing)?|gripp?(?:ed|ing)?|drumm(?:ed|ing)|tapp(?:ed|ing)|click(?:ed|ing)|press(?:ed|ing)|trembl(?:ed|ing)|curl(?:ed|ing)|clench(?:ed|ing)|twitch(?:ed|ing)|worried|ran (?:my|her|his) tongue|stilled|went still|found the edge|searching for (?:texture|grip))\b/i;
const OPER=eval(src.match(/var _CORP_OPERATOR_RE\s*=\s*(\/[\s\S]*?\/i);/)[1].replace(/\n/g,''));

function buildSys(){
  const pcG=window._rotatingExemplars('pic_pc_gestalt',window._PC_GESTALT_POOL,3).map(e=>`"${e}"`).join(' / ');
  const liG=window._rotatingExemplars('pic_li_gestalt',window._LI_GESTALT_POOL,3).map(e=>`"${e}"`).join(' / ');
  const liD=window._rotatingExemplars('pic_li_desire',window._LI_DESIRE_FEATURE_POOL,1)[0];
  const tells=window._rotatingExemplars('pc_body_tell_f',window._PC_BODY_TELL_POOL_FEMALE,4).map(e=>`"${e}"`).join(' / ');
  const conn=window._rotatingExemplars('connector_desc',window._CONNECTOR_DESC_POOL,1)[0];
  return `You are S. Tory Bound, writing Scene 1 of a literary contemporary romance. World: billionaire/modern. POV: first person ("I"), the heroine narrating. The love interest (Roman) is OFFSTAGE this scene (a looming presence/reputation, not present). ~550 words.

CHARACTER VISIBILITY: render the heroine and (in memory) Roman so the reader can SEE them.
- HER OVERALL-LOOK GESTALT — these are SHAPES, not a phrase bank; build your own in her terms: ${pcG}
- HIS OVERALL-LOOK GESTALT (in her memory) — SHAPES, build your own: ${liG}
- ONE desire-coded feature of him (✓ example, write your own): "${liD}"
- HER body-tell under stress — draw from these SHAPES, do not default to fidgeting hands: ${tells}
- If a new side character appears, name + one introductory stroke, e.g. "${conn}"

${window._heroineOccupationGuard({mode:'literary'})}
Establish her OCCUPATION concretely in the scene (obey the rule above).

Write only the scene prose. No title, no headers.`;
}

const hits=t=>{const lc=t.toLowerCase();return BANNED.filter(b=>lc.includes(b));};
async function gen(sid){
  SID=sid;
  const res=await fetch(`${PROXY}/api/anthropic-proxy`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model:MODEL,temperature:0.7,max_tokens:1100,messages:[{role:'system',content:buildSys()},{role:'user',content:'Write Scene 1 now.'}]})});
  if(!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0,300)}`);
  const d=await res.json();
  return (Array.isArray(d?.content)?d.content.map(c=>c?.text||'').join(''):d?.content)||d?.choices?.[0]?.message?.content||'';
}

const stories=['live_a91f','live_b73c','live_c20e','live_d54a'].slice(0,N);
const results=[];
for(const sid of stories){
  process.stderr.write(`generating ${sid}... `);
  try{ const prose=await gen(sid); results.push({sid,prose}); process.stderr.write('ok\n'); }
  catch(e){ process.stderr.write('FAIL '+e.message+'\n'); results.push({sid,prose:'',err:e.message}); }
}

console.log('\n========== LIVE-PROSE VERIFICATION ('+MODEL+', '+stories.length+' fresh storyIds) ==========\n');
const freq={};
for(const r of results){
  if(r.err){ console.log(`── ${r.sid} ── ERROR: ${r.err}\n`); continue; }
  const b=hits(r.prose); b.forEach(x=>freq[x]=(freq[x]||0)+1);
  const rh=(r.prose.match(new RegExp(RH,'gi'))||[]);
  const occM=r.prose.match(OPER);
  console.log(`── ${r.sid} ──`);
  console.log(`  banned literals: ${b.length?'✗ '+b.join(', '):'✓ none'}`);
  console.log(`  restless_hands:  ${rh.length?'⚠ '+rh.length+' ("'+rh[0].trim().slice(0,60)+'")':'✓ none'}`);
  console.log(`  occupation operator/admin: ${occM?'✗ '+occM[0]:'✓ none'}`);
  const desc=(r.prose.match(/[^.?!]*\b(face|eyes|mouth|hair|looked like|kind of)\b[^.?!]*[.?!]/i)||[])[0];
  console.log(`  LI/PC descriptor excerpt: ${desc?desc.trim().slice(0,160):'(none matched)'}`);
  console.log('');
}
console.log('========== PASS CRITERIA ==========');
const any3=Object.entries(freq).filter(([,c])=>c>=3);
console.log(`  • no banned literal in any run: ${Object.keys(freq).length?'✗ '+JSON.stringify(freq):'✓ PASS'}`);
console.log(`  • no replacement/banned phrase in ≥3/4 runs: ${any3.length?'✗ '+JSON.stringify(any3):'✓ PASS'}`);

// dump prose + occupation context for adjudication
console.log('\n========== OCCUPATION CONTEXT (adjudicate operator/admin flags) ==========');
for(const r of results){
  if(r.err) continue;
  fs.writeFileSync(`/tmp/prose_${r.sid}.txt`, r.prose);
  const m=r.prose.match(OPER);
  if(m){
    const i=r.prose.toLowerCase().indexOf(m[0].toLowerCase());
    const ctx=r.prose.slice(Math.max(0,i-90),i+90).replace(/\s+/g,' ');
    console.log(`  ${r.sid}: matched "${m[0]}" → …${ctx}…`);
  } else {
    // print the sentence that states her job (heuristic: first-person + job noun)
    const job=(r.prose.match(/\bI(?:'m| am|'d been| was| run| owned| make| design| bake)[^.?!]{0,80}[.?!]/i)||[])[0];
    console.log(`  ${r.sid}: ✓ no operator/admin · job-ish line: ${job?job.trim().slice(0,110):'(implicit)'}`);
  }
}
