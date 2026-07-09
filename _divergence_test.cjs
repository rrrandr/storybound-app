// Minimum-API test of the original-story divergence system.
// Extracts the REAL divergence block from app.js and runs it in a vm sandbox with a MOCKED classifier for
// unit/state tests, and the REAL classifier (localhost proxy) only for the single E2E. Zero scene generations.
const fs = require('fs');
const vm = require('vm');
const path = '/Users/romantsukerman/storybound-app/public/app.js';
const src = fs.readFileSync(path, 'utf8');

// ── extract the divergence block verbatim ──
const start = src.indexOf('// ═══════════ ORIGINAL-STORY BOUNDED DIVERGENCE');
const rdy = src.indexOf('[ORIG-DIVERGE] harness ready', start);
const end = src.indexOf('\n', rdy);
if (start < 0 || rdy < 0) { console.error('could not locate divergence block'); process.exit(1); }
const block = src.slice(start, end);

// ── sandbox ──
let VERBOSE = false;
let currentGrok = async () => null;
const A_PLOT_TIER_CONFIG = {
  taste: { timelineLength: 20, milestoneCount: 4, climaxAtPercent: 90, resolutionAtPercent: 100 },
  fling: { timelineLength: 40, milestoneCount: 6, climaxAtPercent: 88, resolutionAtPercent: 100 },
  affair: { timelineLength: 60, milestoneCount: 8, climaxAtPercent: 90, resolutionAtPercent: 100 },
  soulmates: { timelineLength: 90, milestoneCount: 10, climaxAtPercent: 90, resolutionAtPercent: 100 }
};
const ctx = {
  Math, JSON, String, Number, Array, Boolean,
  console: { log: (...a) => { if (VERBOSE) console.log(...a); }, warn: () => {} },
  _ffGrokJSON: (...a) => currentGrok(...a),
  window: { __origDivergence: undefined, A_PLOT_TIER_CONFIG }
};
vm.createContext(ctx);
vm.runInContext(block, ctx, { filename: 'divergence-block' });
const W = ctx.window;

// ── helpers ──
function freshState(tier) {
  ctx.window.state = {
    fateMode: 'original', storyLength: tier || 'affair', turnCount: 1,
    aPlot: {
      goal: 'Prove the stolen research is hers before the patent lands', antagonistOrAntiForce: 'Vance',
      milestones: [
        { atScene: 3, kind: 'setup', event: 'finds the patent filing', triggered: false },
        { atScene: 30, kind: 'midpoint_reversal', event: 'mentor promised Vance the work', triggered: false },
        { atScene: 52, kind: 'crisis', event: 'the hearing forces the choice', triggered: false },
        { atScene: 60, kind: 'resolution', event: 'joint release', triggered: false }
      ]
    },
    subplots: [{ title: 'the masked woman in the tunnels', status: 'dormant' }]
  };
  return ctx.window.state;
}
const HV = (conf, size) => ({ classification: 'hard_veer', confidence: conf, reason: 'x', veerTarget: 'the masked woman', veerTargetType: 'person', authoredHookMatch: true, hookSource: 'the masked woman in the tunnels', suggestedDetourSize: size || 'glance' });
const ON = () => ({ classification: 'on_track', confidence: 0.9, reason: 'x', veerTarget: null, veerTargetType: 'none', authoredHookMatch: false, suggestedDetourSize: 'none' });
const SOFT = () => ({ classification: 'soft_drift', confidence: 0.6, reason: 'x', veerTarget: null, veerTargetType: 'none', authoredHookMatch: false, suggestedDetourSize: 'none' });
let mockQueue = [];
const capturedPrompts = [];
function useMock() { currentGrok = async (sys, usr) => { capturedPrompts.push({ sys, usr }); return mockQueue.shift() || ON(); }; }
const D = () => ctx.window.state._origDivergence || {};

let pass = 0, fail = 0; const fails = [];
function ok(name, cond) { if (cond) { pass++; } else { fail++; fails.push(name); } console.log((cond ? '  ✓ ' : '  ✗ FAIL ') + name); }

(async () => {
  useMock();
  console.log('=== 1. UNIT / STATE-MACHINE TESTS (mocked classifier, ZERO API) ===\n');

  // K=2 normal
  freshState('affair'); mockQueue = [HV(0.7)];
  await W._origDivergenceTick('follow her', {});
  ok('K=2: 1st hard_veer does NOT grant (streak 1)', D().detour == null && D().veerStreak === 1);
  mockQueue = [HV(0.7)];
  await W._origDivergenceTick('keep following', {});
  ok('K=2: 2nd hard_veer grants', D().detour && !D().detour.done && D().grantedThisStory === 1 && D().veerStreak === 0);

  // K=1 tempt pursuit
  freshState('affair'); mockQueue = [HV(0.4)];
  await W._origDivergenceTick('follow the assassin', { temptWish: 'follow the assassin into the lower city', temptPursuit: true });
  ok('K=1: Tempt-pursuit grants on 1st hard_veer', D().detour && !D().detour.done && D().grantedThisStory === 1);

  // K=3 ambiguous (low confidence)
  freshState('affair'); mockQueue = [HV(0.5)]; await W._origDivergenceTick('m1', {});
  ok('K=3: ambiguous 1st no grant', D().detour == null && D().veerStreak === 1);
  mockQueue = [HV(0.5)]; await W._origDivergenceTick('m2', {});
  ok('K=3: ambiguous 2nd no grant', D().detour == null && D().veerStreak === 2);
  mockQueue = [HV(0.5)]; await W._origDivergenceTick('m3', {});
  ok('K=3: ambiguous 3rd grants', D().detour && D().grantedThisStory === 1);

  // soft_drift never grants
  freshState('affair'); let granted = false;
  for (let i = 0; i < 5; i++) { mockQueue = [SOFT()]; await W._origDivergenceTick('wander', {}); if (D().detour) granted = true; }
  ok('soft_drift NEVER grants + streak stays 0', !granted && D().veerStreak === 0 && D().grantedThisStory === 0);

  // on_track bias: an on_track in the middle RESETS the streak
  freshState('affair'); mockQueue = [HV(0.7)]; await W._origDivergenceTick('a', {});
  mockQueue = [ON()]; await W._origDivergenceTick('b', {});
  ok('on_track resets veerStreak to 0', D().veerStreak === 0);
  mockQueue = [HV(0.7)]; await W._origDivergenceTick('c', {});
  ok('on_track bias: no grant after interruption (streak only 1)', D().detour == null && D().veerStreak === 1);

  // tier cap: taste downgrades side_thread → glance, span 1
  freshState('taste'); mockQueue = [HV(0.7, 'side_thread'), HV(0.7, 'side_thread')];
  await W._origDivergenceTick('x', {}); await W._origDivergenceTick('y', {});
  ok('tier cap (taste): side_thread downgraded to glance span=1', D().detour && D().detour.size === 'glance' && D().detour.span === 1);

  // pressureDebt accrual + return-delta + milestone plan NOT mutated (full side_thread cycle, affair)
  freshState('affair');
  const milestonesBefore = JSON.stringify(ctx.window.state.aPlot.milestones);
  mockQueue = [HV(0.7, 'side_thread'), HV(0.7, 'side_thread')];
  await W._origDivergenceTick('v1', {}); await W._origDivergenceTick('v2', {}); // grant on 2nd
  ok('side_thread granted span=3', D().detour && D().detour.span === 3 && D().detour.generated === 1);
  const debtAtGrant = D().pressureDebt;
  await W._origDivergenceTick('n/a', {}); // active → ord2 turn
  await W._origDivergenceTick('n/a', {}); // active → ord3 return
  ok('pressureDebt accrues per detour scene (=3 before close)', D().pressureDebt === 3, );
  mockQueue = [ON()]; await W._origDivergenceTick('back to case', {}); // closes → applyReturnDelta, then classifies
  ok('return-delta applied (urgencyBump=3, detour done)', ctx.window.state._origUrgencyBump === 3 && D().detour.done === true && D().returnDeltas.length === 1);
  ok('pressureDebt reset to 0 after return', D().pressureDebt === 0);
  ok('MILESTONE PLAN NOT MUTATED by divergence code', JSON.stringify(ctx.window.state.aPlot.milestones) === milestonesBefore);

  // budget cap: affair max 2 side-thread/glance grants
  freshState('affair');
  async function grantAndClose() { mockQueue = [HV(0.7), HV(0.7)]; await W._origDivergenceTick('g1', {}); await W._origDivergenceTick('g2', {}); mockQueue = [ON()]; await W._origDivergenceTick('close', {}); }
  await grantAndClose(); await grantAndClose();
  ok('budget: 2 grants recorded', D().grantedThisStory === 2);
  mockQueue = [HV(0.7), HV(0.7)]; await W._origDivergenceTick('h1', {}); await W._origDivergenceTick('h2', {});
  ok('budget cap: 3rd veer does NOT grant (budget spent)', D().grantedThisStory === 2 && (D().detour == null || D().detour.done));

  // FF gating: never fires in famous_fate
  freshState('affair'); ctx.window.state.fateMode = 'famous_fate'; mockQueue = [HV(0.7), HV(0.7)];
  await W._origDivergenceTick('z1', {}); await W._origDivergenceTick('z2', {});
  ok('FF-gated: no divergence in famous_fate mode', !ctx.window.state._origDivergence || !ctx.window.state._origDivergence.detour);

  // kill switch
  freshState('affair'); ctx.window.__origDivergence = false; mockQueue = [HV(0.7), HV(0.7)];
  await W._origDivergenceTick('k1', {}); await W._origDivergenceTick('k2', {});
  ok('kill switch __origDivergence=false disables', !ctx.window.state._origDivergence || !ctx.window.state._origDivergence.detour);
  ctx.window.__origDivergence = undefined;

  console.log('\n=== 2. PROMPT-INJECTION INSPECTION (no prose gen) ===\n');
  // directive content per phase
  freshState('affair');
  ctx.window.state._origDivergence = { veerStreak: 0, detour: { size: 'side_thread', target: 'the masked woman', targetType: 'person', hookSource: 'x', phase: 'hook', span: 3, generated: 1, done: false }, grantedThisStory: 1, pressureDebt: 1, returnDeltas: [], history: [] };
  const dirHook = W._buildOrigDivergenceDirective();
  ok('directive present during active detour', !!dirHook && dirHook.includes('PLAYER-DRIVEN DETOUR'));
  ok('directive backgrounds main plot offscreen', /OFFSCREEN/i.test(dirHook) && /do NOT resolve the main plot/i.test(dirHook));
  ctx.window.state._origDivergence.detour.phase = 'return';
  const dirRet = W._buildOrigDivergenceDirective();
  ok('return phase = diegetic steer-back + concrete change', /STEER BACK/i.test(dirRet) && /DIEGETICALLY/i.test(dirRet) && /CHANGED/i.test(dirRet));
  const allDir = dirHook + ' ' + dirRet;
  ok('NO directive asks for arc re-plan/regeneration', !/regenerat|re-?plan|rewrite the arc|new milestones|new finale|new goal/i.test(allDir));
  // classifier prompt bias (capture from a mock call)
  freshState('affair'); capturedPrompts.length = 0; mockQueue = [ON()]; await W._origDivergenceTick('probe', {});
  const clsSys = (capturedPrompts[0] || {}).sys || '';
  ok('classifier prompt BIASES to on_track', /BIAS HARD TOWARD on_track/i.test(clsSys) && /false veer .* worse/i.test(clsSys));
  ok('classifier asks for veerTarget + suggestedDetourSize', /veerTarget/.test(clsSys) && /suggestedDetourSize/.test(clsSys));

  // wiring inspection (grep the real app.js, not the sandbox)
  const heavyInj = /_buildOrigDivergenceDirective\(\);[^\n]*sceneDirectives \+= _odH/.test(src);
  const liteInj = /_buildOrigDivergenceDirective\(\);[^\n]*_ll\.system \+= _odLL/.test(src);
  ok('HEAVY continuation injects the detour directive', heavyInj);
  ok('LITE continuation injects the detour directive', liteInj);
  const deferGuard = /_origDetourActive[\s\S]{0,400}?if \(_origDetourActive\) return;/.test(src);
  ok('_tickAPlot DEFERS milestone firing during a detour', deferGuard);
  const bgIdx = src.indexOf('A-PLOT BACKGROUNDED (the player is on a bounded DETOUR');
  const gravIdx = src.indexOf("RELATIONAL A-PLOT GRAVITY (HARD — UNCONDITIONAL");
  ok('buildAPlotPressureDirective BACKGROUNDS main goal during detour', bgIdx > 0);
  ok('backgrounding branch precedes the hard RELATIONAL-GRAVITY push', bgIdx > 0 && gravIdx > 0 && bgIdx < gravIdx);

  console.log('\n──────────── SUMMARY ────────────');
  console.log('PASS ' + pass + ' / ' + (pass + fail) + (fail ? ('  ✗ FAILURES: ' + fails.join(', ')) : '  — ALL GREEN'));
  console.log('API scene generations used: 0');
  process.exit(fail ? 1 : 0);
})();
