// VERIFICATION — the closing keystone. Re-run the FROZEN verifier (via corroboration) on the candidate and
// apply Repair Contract §1: (a) target defect GONE, (b) NO new defect, (c) unrelated defects PRESERVED
// (§1.3 minimal intervention). §1 passes → ACCEPT (commit candidate); else → §2 ROLLBACK (keep original) and
// hand back to the planner to retry/escalate. The SAME frozen oracle that found the defect judges the fix —
// closing detect → decide → repair → verify.
import { classify } from './_two_channel_classifier.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(ROOT, 'test/fixtures/benchmark-A');
const N = 4;
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const tier = (k,n) => (k/n>=0.75?'high':k/n>=0.4?'medium':'low');
const PRESENT = new Set(['high','medium']); // "counts as present" — low is borderline noise

// corroborate: run the frozen verifier N times → defect set keyed by class:panel, with agreement/confidence.
async function corroborate(imgPath, scene, n=N){
  const runs=[]; for(let i=0;i<n;i++){ runs.push(await classify(imgPath, scene)); await sleep(700); }
  const perRun = runs.map(r => new Set([...r.text, ...r.visual].map(d=>`${d.class}:p${d.panel}`)));
  const keys = new Set(perRun.flatMap(s=>[...s]));
  const set=[];
  for(const key of keys){ const k=perRun.filter(s=>s.has(key)).length; const [cls,panel]=key.split(':');
    set.push({ key, class:cls, panel, agreement:`${k}/${n}`, confidence:tier(k,n) }); }
  return set;
}
const isPresent = (set, key) => set.some(d => d.key===key && PRESENT.has(d.confidence));

// Repair Contract §1: judge a candidate against the pre-repair set + the target that was repaired.
export function judge(preSet, candSet, targetKey){
  const targetGone = !isPresent(candSet, targetKey);                                  // (a)
  const newDefects = candSet.filter(d => PRESENT.has(d.confidence) && !preSet.some(p=>p.key===d.key)); // (b)
  const unrelated  = preSet.filter(p => p.key!==targetKey && PRESENT.has(p.confidence));
  const unrelatedMissing = unrelated.filter(u => !isPresent(candSet, u.key));          // (c)
  const accept = targetGone && newDefects.length===0 && unrelatedMissing.length===0;
  return { accept, targetGone, noNew:newDefects.length===0, unrelatedPreserved:unrelatedMissing.length===0,
    newDefects:newDefects.map(d=>d.key), unrelatedMissing:unrelatedMissing.map(d=>d.key),
    action: accept ? 'ACCEPT — commit candidate' : 'ROLLBACK (§2) — keep original; planner retries/escalates' };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const A4='two ORDINARY HUMANS (Nora, a woman; Daniel, a man) in a heated but non-violent conversation across a table in a contemporary café interior — both present every panel, other patrons behind. A still dialogue beat: no action, no weapons, no magic, no burst, no SFX.';
  const original = path.join(FIX,'A4_interior_dialogue.png');
  const candidate = process.argv[2] || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/564e636e-ec4e-4bd6-9260-4dce17cb1833/scratchpad/A4_p2_candidate.png';
  const targetKey = 'anatomy:p2';   // we repaired the panel-2 hand only
  (async()=>{
    console.log(`VERIFICATION — frozen verifier re-run on candidate | N=${N} | Repair Contract §1`);
    console.log(`repaired: ${targetKey} (panel-2 hand). Expect: target GONE, unrelated (anatomy:p4) PRESERVED, no new.\n`);
    const pre  = await corroborate(original, A4);
    const cand = await corroborate(candidate, A4);
    const fmt = s => s.filter(d=>PRESENT.has(d.confidence)).map(d=>`${d.key}(${d.confidence})`).join(', ')||'—';
    console.log(`  PRE  (original) : ${fmt(pre)}`);
    console.log(`  CAND (repaired) : ${fmt(cand)}`);
    const v = judge(pre, cand, targetKey);
    console.log(`\n  §1(a) target gone .......... ${v.targetGone?'✓':'✗'}`);
    console.log(`  §1(b) no new defect ........ ${v.noNew?'✓':'✗'}${v.newDefects.length?'  new: '+v.newDefects.join(','):''}`);
    console.log(`  §1(c) unrelated preserved .. ${v.unrelatedPreserved?'✓':'✗'}${v.unrelatedMissing.length?'  vanished: '+v.unrelatedMissing.join(','):''}`);
    console.log(`\n=== ${v.action} ===`);
  })().catch(e=>{console.error('ERR',e);process.exit(1);});
}
