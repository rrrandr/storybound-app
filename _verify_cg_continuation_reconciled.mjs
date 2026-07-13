// Guard (Fable CG audit — A2-F2): the literary buildSceneContinuationDirective() is a permanent no-op in
// CG (gates on StoryPagination, unpopulated in staged mode), so causal linkage + deferred-arrival +
// story-spine vanished from every CG scene >=2. Fix: a compact CG-native _buildCGSceneContinuationDirective()
// that RECONCILES with the user-prompt anti-redux rule — it carries the causal + emotional THREAD but
// does NOT resume the prior frozen beat, and deliberately OMITS the conflicting live-pickup rule.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) The CG system prompt no longer injects the no-op literary builder via concatenation (the literary
//     path legitimately still references it — assignment form at ~265413 — so target the CG `+` pattern);
//     it now injects the CG-native directive instead.
A(!src.includes("? buildSceneContinuationDirective() : '') +"), 'CG prompt still injects the no-op literary buildSceneContinuationDirective via concatenation');
A(src.includes('_buildCGSceneContinuationDirective() +'), 'CG prompt does not inject the CG-native continuation directive');

// (2) The CG-native builder exists and is scene->=2 gated.
const start = src.indexOf('function _buildCGSceneContinuationDirective()');
A(start >= 0, '_buildCGSceneContinuationDirective not defined');
const fn = start >= 0 ? src.slice(start, start + 3000) : '';
A(fn.includes('if (!(((s.turnCount) || 0) > 0)) return \'\';'), 'continuation directive not gated to scene >=2');

// (3) Restores the three lost pieces: causal link, charge carryover, deferred-arrival, story-spine.
A(/CAUSAL LINK \(THEREFORE \/ BUT/.test(fn), 'causal-link rule missing');
A(fn.includes('CARRY THE CHARGE'), 'emotional charge carryover missing');
A(fn.includes("_liArrival(s) === 'DEFERRED'") && fn.includes('DEFERRED-ARRIVAL CONTINUITY'), 'deferred-arrival continuity missing');
A(fn.includes('_buildIssueRelationshipStageDirective(s)'), 'story-spine stage directive missing');

// (4) RECONCILED with anti-redux: keeps THREAD-not-replay, and OMITS the conflicting live-pickup rule.
A(fn.includes('THREAD, NOT REPLAY') && fn.includes('does not override it'), 'reconciliation framing (thread-not-replay / complements anti-redux) missing');
A(!/still in it|continue that exact moment|LIVE PICKUP|OPENS in that live moment/i.test(fn), 'the conflicting live-pickup rule leaked into the CG directive (contradicts anti-redux)');

if (fail) process.exit(1);
console.log('PASS: CG uses a native scene-continuation directive (causal link + charge carryover + deferred-arrival + story-spine), scene>=2 gated, reconciled with anti-redux (thread not replay), with the conflicting live-pickup rule omitted.');
