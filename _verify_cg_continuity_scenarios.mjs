// Guard (Fable CG audit — A2-F2 second-order coverage): the CG-native continuation directive replaced a
// no-op and deliberately dropped the literary LIVE-PICKUP rule. This guard locks in that the three
// interactive-continuity scenarios remain covered and that the change has no second-order regression:
//   1. interruption → continuation   (an interrupted / mid-thread prior scene's state carries forward)
//   2. scene transition → continuation (causal consequence/complication, not "and then")
//   3. deferred arrival stays causally coherent (crisis persists + intertwines, never erased)
// plus: the reconciliation with the user-prompt anti-redux rule (coexist, no contradiction), and the
// _sceneLiveContinuation side-effect invariant (literary-only; CG never reads it; literary self-resets).
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

const dStart = src.indexOf('function _buildCGSceneContinuationDirective()');
A(dStart >= 0, 'CG continuation directive not found');
const dir = dStart >= 0 ? src.slice(dStart, dStart + 3000) : '';

// (1) INTERRUPTION → CONTINUATION: an interrupted / mid-thread prior scene is handled by carrying its
//     established state + unresolved pressure forward (NOT by literally resuming the frozen beat).
A(/never contradict or silently undo what the prior scene established/.test(dir), 'carry-forward (no-contradiction) rule missing — interrupted-scene state could be dropped');
A(/emotional state all persist/.test(dir), 'emotional-state persistence missing — interruption charge would not carry');
A(/carry its pressure INTO the new moment/i.test(dir), 'pressure-carryover (interruption handled as pressure, not replay) missing');

// (2) SCENE TRANSITION → CONTINUATION: explicit causal consequence/complication, not sequential drift.
A(/CONSEQUENCE .*FORCED this.*or a COMPLICATION/s.test(dir), 'causal consequence/complication rule missing');
A(/never "and then"/.test(dir), 'anti-"and then" sequential-drift ban missing');

// (3) DEFERRED ARRIVAL — CAUSALLY COHERENT: only when _liArrival==='DEFERRED'; crisis stays active,
//     intertwines, and escalates WITH romance (never quietly erased).
A(/_liArrival\(s\) === 'DEFERRED'/.test(dir), 'deferred-arrival gate missing');
A(/STILL ACTIVE and unresolved/.test(dir), 'deferred crisis "still active" clause missing');
A(/INTERTWINE with it/.test(dir) && /never erase or replace it/.test(dir), 'deferred crisis intertwine/never-erase clause missing');
A(/escalate TOGETHER/.test(dir), 'crisis+romance "escalate together" (causal coherence) clause missing');

// (4) RECONCILED with anti-redux (coexistence, no contradiction). Both blocks ship; continuation defers.
A(src.includes('SCENE PROGRESSION (HARD — anti-redux directive)'), 'user-prompt anti-redux block missing (reconciliation target gone)');
A(src.includes('The prior scene is OVER. Time has passed'), 'anti-redux "prior scene is OVER" clause missing');
A(/complements SCENE PROGRESSION anti-redux, does not override it/.test(dir), 'continuation does not defer to anti-redux');
A(!/still in it|OPENS in that live moment|continue the live exchange|LIVE PICKUP/i.test(dir), 'a live-pickup phrase leaked into CG continuation — would contradict anti-redux');

// (5) _sceneLiveContinuation NON-REGRESSION: it is literary-only. CG must not read it, and the literary
//     builder must still reset it at its top so dropping the CG no-op call cannot strand a stale value.
const cgSysStart = src.indexOf('function _buildCGScreenplaySystemPrompt()');
const cgSysEnd = src.indexOf('window._buildCGScreenplaySystemPrompt =', cgSysStart);
const cgSys = cgSysStart >= 0 ? src.slice(cgSysStart, cgSysEnd > cgSysStart ? cgSysEnd : cgSysStart + 80000) : '';
A(!cgSys.includes('buildSkeletonDirective'), 'buildSkeletonDirective (the only _sceneLiveContinuation reader) leaked into the CG prompt');
const litBuilder = src.slice(src.indexOf('function buildSceneContinuationDirective()'), src.indexOf('function buildSceneContinuationDirective()') + 400);
A(litBuilder.includes('state._sceneLiveContinuation = false;'), 'literary builder no longer resets _sceneLiveContinuation at its top (stale-value risk)');

if (fail) process.exit(1);
console.log('PASS: CG continuity covers interruption→continuation (state+pressure carryover), scene-transition→continuation (causal), and deferred-arrival causal coherence; reconciled with anti-redux (coexist, no live-pickup); _sceneLiveContinuation stays literary-only with a self-reset (no CG second-order regression).');
