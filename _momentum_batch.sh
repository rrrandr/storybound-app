#!/bin/zsh
# _momentum_batch.sh — smallest Baseline vs SCENE-SPINE comparison.
# Fresh story per run (turn 0→1, clean of petition/tempt gates), First Sacrifice (Fantasy — coherent
# atmospheric transitions), fixed coherent say/do, N per arm, concurrency-limited. Appends JSONL to a
# shared corpus, then runs _momentumEval over it.
set -u
cd /Users/romantsukerman/storybound-app
OUT=/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/momentum_out
CORPUS=${CORPUS:-$OUT/corpus.jsonl}
PER_ARM=${PER_ARM:-6}
CONC=${CONC:-3}
STARTER=starter_first_sacrifice
# CONTEXT-AGNOSTIC say/do: a fixed context-specific action fought the actual generated Scene-1 (the author
# ignored it → noise). Generic forward pressure lets the milestone/planned-event drive without contradiction.
export SAYDO_ACT="cross the room to stand in front of her"
export SAYDO_DIA="I need to know what you decided."
[ "${APPEND:-0}" = "1" ] || : > $CORPUS   # truncate unless APPEND=1 (accumulate across arm-runs)

run_one() {
  local arm=$1 idx=$2
  MODE=real ARM=$arm N=1 STARTER=$STARTER LOGFILE=$CORPUS \
    node ./_momentum_harness.mjs > $OUT/batch_${arm}_${idx}.log 2>&1 || true
  echo "  done: $arm #$idx (verdict: $(grep -o 'verdict=[A-Z]*' $OUT/batch_${arm}_${idx}.log | head -1))"
}

echo "=== MOMENTUM BATCH — $PER_ARM per arm, concurrency $CONC, arms='${ARMS:-spine baseline}', starter=$STARTER ==="
for arm in ${ARMS:-spine baseline}; do
  echo "--- arm: $arm ---"
  for i in $(seq 1 $PER_ARM); do
    run_one $arm $i &
    # throttle to CONC concurrent jobs
    while (( $(jobs -r | wc -l) >= CONC )); do wait -n; done
  done
  wait
done
echo "=== all runs done — corpus: $(wc -l < $CORPUS) records ==="

# analyze via _momentumEval (loaded from the app's analyzer module)
node --input-type=module -e "
import fs from 'fs';
await import('./public/momentum-eval.js');
const recs = fs.readFileSync('$CORPUS','utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));
console.log('\n=== CORPUS (n='+recs.length+') ===');
recs.forEach(r=>console.log('  '+String(r.architecture).padEnd(11)+' '+String(r.first_verdict).padEnd(9)+' pos='+String(r.transition_position).padStart(4)+' by='+String(r.dominant_replacement).padEnd(20)+' evt=\"'+String(r._event||'').slice(0,52)+'\"'));
const out = globalThis._momentumEval(recs);
fs.writeFileSync('$OUT/momentum_eval.json', JSON.stringify({corpus:recs, eval:out}, null, 2));
console.log('\nwrote $OUT/momentum_eval.json');
"
