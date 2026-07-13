// Guard for the speculation SIMILARITY METER (telemetry-only, behavior-neutral): when a speculation
// is discarded because the player TYPED, we measure how close their FINAL entry was to the pre-built
// intent — free token-set Jaccard, NO LLM / no network. This is a measurement signal for a possible
// future compare-and-cheaply-repair path; it must NOT change generation behavior.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (cond, msg) => { if (!cond) { console.error('FAIL: ' + msg); fail = true; } };

// (1) Pure, cheap helpers exist.
A(src.includes('function _specTextSim(a, b)'), 'token-set similarity helper _specTextSim missing');
A(src.includes('function _recordSpeculationTypedSimilarity(sim)'), 'ledger accumulator _recordSpeculationTypedSimilarity missing');

// (2) The similarity path is FREE — no LLM / no network inside the helper (efficient, per requirement).
const simStart = src.indexOf('function _specTextSim(a, b)');
const simEnd = src.indexOf('function _recordSpeculationTypedSimilarity');
const simRegion = simStart >= 0 && simEnd > simStart ? src.slice(simStart, simEnd) : '';
A(!!simRegion, 'could not isolate _specTextSim region');
for (const bad of ['fetch', 'await', 'callChatGPT', 'callGrok', 'XMLHttpRequest']) {
  A(!simRegion.includes(bad), `_specTextSim must be LLM/network-free but contains "${bad}"`);
}

// (3) TYPED discard stashes the pre-built intent (the keystroke listener nulls the spec, so this is
//     the only capture of what the discarded scene was built for). Only on reason === 'user_input'.
A(src.includes("if (reason === 'user_input') {"), 'typed-discard stash guard (reason===user_input) missing');
A(src.includes('state._lastDiscardedSpecIntent = { action:'), 'pre-built intent stash missing');

// (4) At the commit path, the stash is compared to the FINAL act/dia, recorded, and cleared (consumed
//     once, turn-scoped so a stale stash cannot mismatch a later turn).
A(src.includes('_recordSpeculationTypedSimilarity(_specTextSim('), 'commit-path compare+record missing');
A(src.includes('Math.abs((state.turnCount || 0) - (_ds.turn || 0)) <= 1)'), 'turn-scoped freshness guard on the stash missing');
A(src.includes('state._lastDiscardedSpecIntent = null;'), 'stash is never cleared (would leak across turns)');

// (5) The meter surfaces the opportunity signal in window._specLedger() derived output.
A(src.includes('avg_typed_similarity:'), 'derived.avg_typed_similarity missing from _specLedger()');
A(src.includes('recoverable_pct:') && src.includes('repairable_pct:'), 'recoverable/repairable opportunity buckets missing');
A(src.includes('typed_sim_buckets:'), 'typed_sim_buckets breakdown missing');

// (6) Behavior-neutral: the commit DECISION still keys ONLY on exact normalized match — the meter must
//     NOT gate whether a speculative scene is used. (No new branch mutates useSpeculative.)
A(src.includes('if (speculativeScene.normalizedAction === act &&') && src.includes('speculativeScene.normalizedDialogue === dia) {'), 'commit decision no longer exact-match (meter must not alter behavior)');

if (fail) process.exit(1);
console.log('PASS: speculation similarity meter — free token-set Jaccard (no LLM/network), typed-discard intent stashed, compared to final entry at commit (turn-scoped, consumed once), surfaced in _specLedger() derived; commit decision unchanged (behavior-neutral).');
