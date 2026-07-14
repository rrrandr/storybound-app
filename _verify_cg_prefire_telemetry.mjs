// Guard (Fable CG audit — A3-F1): the CG Scene-1 cover pre-fire runs the FULL Scene-1 pipeline (text +
// all images) at cover view, BEFORE the user commits — abandonment there was invisible spend. Fix:
// instrument it in sb_spec_ledger — a COMMIT when the user enters the reader, an ABANDON when a story
// reset fires while a pre-fire is still pending, surfaced under _specLedger().derived.cg_prefire.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) Pre-fire START: pending marker set + started event at the cover pre-fire; failure clears pending.
A(src.includes("state._cgScene1PrefirePending = true; if (typeof _recordSpeculationEvent === 'function') _recordSpeculationEvent('cg_scene1_prefire_started'"), 'pre-fire start not instrumented (pending + started event)');
A(src.includes('state._cgScene1PrefirePending = false; } catch (_) {} // failed pre-fire'), 'failed pre-fire does not clear the pending marker');

// (2) COMMIT at gnReader entry: records committed with the sealed cost, self-gated by the pending flag.
A(src.includes("_recordSpeculationEvent('cg_scene1_prefire_committed', { estCostUsd: (state._lastSceneAPICost || 0), mode: 'cg_cover' })"), 'reader-entry commit event missing');

// (3) ABANDON in _resetStoryState: records abandoned with the sealed cost, and runs BEFORE the reset
//     touches state (so _lastSceneAPICost is still the pre-fire's).
const rs = src.indexOf('function _resetStoryState()');
const rsBody = rs >= 0 ? src.slice(rs, rs + 1200) : '';
A(rsBody.includes("_recordSpeculationEvent('cg_scene1_prefire_abandoned', { estCostUsd: (state._lastSceneAPICost || 0), mode: 'cg_cover' })"), 'abandon event missing from _resetStoryState');
A(rsBody.indexOf('cg_scene1_prefire_abandoned') < rsBody.indexOf('state._apprEstablished = {}'), 'abandon hook does not run first in _resetStoryState');

// (4) Recorder buckets the pre-fire spend SEPARATELY (not mixed into the literary speculation cost).
A(src.includes("else if (type === 'cg_scene1_prefire_committed') { L.cgPrefire = L.cgPrefire || { committed_usd: 0, wasted_usd: 0 }; L.cgPrefire.committed_usd += c; }"), 'cg_prefire committed cost bucket missing');
A(src.includes("else if (type === 'cg_scene1_prefire_abandoned') { L.cgPrefire = L.cgPrefire || { committed_usd: 0, wasted_usd: 0 }; L.cgPrefire.wasted_usd += c; }"), 'cg_prefire wasted cost bucket missing');

// (5) _specLedger() surfaces the cg_prefire summary (abandon_rate + wasted_usd = the newly-visible waste).
A(src.includes('cg_prefire: {') && src.includes('abandon_rate: cgpStarted ? +(cgpAbandoned / cgpStarted).toFixed(3) : null'), 'cg_prefire summary not exposed in _specLedger derived');

// (6) The commit/abandon are mutually exclusive via the single pending flag (no double-count): the flag
//     is set once (start) and cleared on the first of commit/abandon/failure.
const clears = (src.match(/_cgScene1PrefirePending = false/g) || []).length;
A(clears === 3, `expected exactly 3 pending-clears (commit, abandon, failure), found ${clears}`);

if (fail) process.exit(1);
console.log('PASS: CG Scene-1 cover pre-fire instrumented — started at cover, committed on reader entry, abandoned on reset-while-pending (single flag, no double-count); spend bucketed separately and surfaced as _specLedger().derived.cg_prefire (abandon_rate + wasted_usd).');
