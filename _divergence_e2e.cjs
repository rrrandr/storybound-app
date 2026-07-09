// ONE live E2E: real classifier (localhost proxy), scripted veer sequence, NO prose scene generation.
const fs = require('fs'); const vm = require('vm');
const src = fs.readFileSync('/Users/romantsukerman/storybound-app/public/app.js', 'utf8');
const start = src.indexOf('// ═══════════ ORIGINAL-STORY BOUNDED DIVERGENCE');
const end = src.indexOf('\n', src.indexOf('[ORIG-DIVERGE] harness ready', start));
const block = src.slice(start, end);
const BASE = 'http://localhost:3000';
let apiCalls = 0;

async function realGrok(sys, usr, opts) {
  apiCalls++;
  const res = await fetch(BASE + '/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'SPECIALIST_RENDERER', preferredModel: (opts && opts.reasoning) ? 'grok-4-1-fast-reasoning' : 'grok-4-1-fast-non-reasoning', temperature: 0.2, max_tokens: (opts && opts.maxTokens) || 500, convId: 'e2e-classify' }) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  let raw = ((data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try { return JSON.parse(raw); } catch (_) { const a = raw.indexOf('{'), b = raw.lastIndexOf('}'); return JSON.parse(raw.slice(a, b + 1).replace(/,\s*([}\]])/g, '$1')); }
}
const ctx = { Math, JSON, String, Number, Array, Boolean, console: { log: (...a) => console.log(...a), warn: () => {} }, _ffGrokJSON: (...a) => realGrok(...a), fetch, window: { __origDivergence: undefined, A_PLOT_TIER_CONFIG: { affair: { timelineLength: 60, milestoneCount: 8, climaxAtPercent: 90, resolutionAtPercent: 100 } } } };
vm.createContext(ctx); vm.runInContext(block, ctx, { filename: 'div-block' });
const W = ctx.window;

ctx.window.state = {
  fateMode: 'original', storyLength: 'affair', turnCount: 1,
  aPlot: { goal: 'Prove the stolen research is hers before Vance patents it', antagonistOrAntiForce: 'Vance', milestones: [
    { atScene: 3, kind: 'setup', event: 'finds the patent filing', triggered: false },
    { atScene: 30, kind: 'midpoint_reversal', event: 'mentor promised Vance the work', triggered: false },
    { atScene: 52, kind: 'crisis', event: 'the hearing forces the choice', triggered: false },
    { atScene: 60, kind: 'resolution', event: 'joint release', triggered: false } ] },
  subplots: [{ title: 'a masked woman who keeps watching the lab from the tunnels', status: 'dormant' }]
};
const milestonesBefore = JSON.stringify(ctx.window.state.aPlot.milestones);

// scripted player moves: one on-track, then a sustained veer toward the seeded hook
const moves = [
  { t: 'on-track', text: 'I confront Vance directly and demand he withdraw the patent filing', opts: {} },
  { t: 'veer #1', text: "I ignore the hearing prep and slip down into the tunnels after the masked woman", opts: {} },
  { t: 'veer #2', text: "the case can wait — I go deeper after her, I have to know who she is", opts: {} }
];

(async () => {
  console.log('=== LIVE E2E (real classifier, NO prose generation) ===\n');
  for (const m of moves) {
    ctx.window.state.turnCount++;
    console.log('── ' + m.t + ': "' + m.text + '"');
    await W._origDivergenceTick(m.text, m.opts);
    const d = ctx.window.state._origDivergence;
    if (d && d.detour && !d.detour.done) console.log('   → DETOUR ACTIVE: ' + d.detour.size + ' span=' + d.detour.span + ' target="' + d.detour.target + '"');
    console.log('');
  }
  // if a detour was granted, run the lifecycle to resolution (active detour → no classify calls)
  let d = ctx.window.state._origDivergence;
  if (d && d.detour && !d.detour.done) {
    console.log('── running detour lifecycle to resolution (no classify calls) ──');
    let guard = 0;
    while (d.detour && !d.detour.done && guard++ < 8) {
      const dir = W._buildOrigDivergenceDirective();
      console.log('   phase=' + d.detour.phase + ' scene ' + d.detour.generated + '/' + d.detour.span);
      console.log('   directive: ' + (dir ? dir.trim().slice(0, 200).replace(/\s+/g, ' ') + '…' : '(none)'));
      ctx.window.state.turnCount++;
      await W._origDivergenceTick('[detour continues]', {});
      d = ctx.window.state._origDivergence;
    }
    // one more tick with an on-track move to CLOSE + apply return-delta
    ctx.window.state.turnCount++;
    await W._origDivergenceTick('I get back to the case before the hearing', {});
    console.log('');
  }
  console.log('── FINAL AUDIT ──');
  W._origDivergenceAudit();
  console.log('\n── INVARIANT CHECK ──');
  console.log('  milestone plan mutated? ' + (JSON.stringify(ctx.window.state.aPlot.milestones) !== milestonesBefore ? 'YES ✗' : 'NO ✓ (intact)'));
  console.log('\nAPI classify calls used: ' + apiCalls + '  ·  scene generations used: 0');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
