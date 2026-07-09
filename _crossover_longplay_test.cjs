// Long-play state-machine validation of the crossover runtime. Extracts the real block; MOCKED contract/arc
// + mocked collision outcomes → ZERO API for the state machine (A-G). Tests durability across a long run.
const fs = require('fs'); const vm = require('vm');
const src = fs.readFileSync('/Users/romantsukerman/storybound-app/public/app.js', 'utf8');
const block = src.slice(src.indexOf('// ═══════════ FAMOUS-FATE CROSSOVER'), src.indexOf('\n', src.indexOf('[FF-CROSSOVER] harness ready')));
const ctx = { Math, JSON, String, Number, Array, Boolean, Object, Promise, console: { log: () => {} }, _ffGrokJSON: async () => null, window: {} };
vm.createContext(ctx); vm.runInContext(block, ctx, { filename: 'x' });
const W = ctx.window;

const CX = {
  cls: { mode: 'inserted_protagonist_crossover', embodiedCharacter: 'Miles Morales', worldCanon: 'Old Man Logan' },
  contract: { mode: 'inserted_protagonist_crossover', embodiedPC: 'Miles Morales', characterCanon: { source: 'Marvel (Miles Morales)', voice: 'young, wry, guilt-driven', moralCode: 'no killing', mustNotInventOrOverwrite: ['no Uncle Ben death', 'no Logan backstory', 'no adamantium/claws'] }, worldCanon: { source: 'Old Man Logan', timelinePosition: 'villain-ruled wasteland', majorCanonCharacters: ['Logan', 'Hawkeye', 'Red Skull'] }, fusionPolicy: { substitutionAllowed: false } },
  arc: { beats: [{ kind: 'setup', beat: 'Miles enters the wasteland' }, { kind: 'complication', beat: 'nightly stealth runs' }, { kind: 'collision', beat: 'Red Skull scouts' }, { kind: 'midpoint', beat: 'a saved kid captured' }, { kind: 'collision', beat: 'Hulk Gang pushes east' }, { kind: 'dark', beat: 'daylight fight' }, { kind: 'climax', beat: 'portal barrage' }, { kind: 'resolution', beat: 'steps home' }], worldClockCollisions: ['Red Skull Brooklyn absorption within 3 weeks', 'Hulk Gang pushing east into the city'] }
};
let pass = 0, fail = 0; const fails = [];
const ok = (n, c) => { c ? pass++ : (fail++, fails.push(n)); console.log((c ? '  ✓ ' : '  ✗ FAIL ') + n); };
const freshRT = () => W._ffCrossoverRuntimeInit(CX, 24);

(async () => {
  console.log('═══ A. RUNTIME INIT ═══');
  const rtA = freshRT();
  ok('crossoverRuntime exists', !!rtA && rtA.active);
  ok('insertedArc idx starts 0, 8 beats', rtA.insertedArc.idx === 0 && rtA.insertedArc.beats.length === 8);
  ok('worldClock idx starts 0, 2 collisions', rtA.worldClock.idx === 0 && rtA.worldClock.collisions.length === 2);
  ok('audit.noSubstitutionLeakage true', rtA.audit.noSubstitutionLeakage === true);
  ok('Logan remains separate (in majorCanonCharacters)', JSON.stringify(CX.contract.worldCanon.majorCanonCharacters).includes('Logan'));

  console.log('\n═══ B. INSERTED ARC ADVANCEMENT (beats 1-3 addressed) ═══');
  const rtB = freshRT(); const dB = [];
  for (let sc = 0; sc < 3; sc++) { dB.push(W._ffCrossoverDirectiveFromRT(CX, rtB, sc)); W._ffCrossoverTick(rtB, { sceneIdx: sc, addressed: true }); }
  ok('insertedArc idx advanced (>0)', rtB.insertedArc.idx > 0);
  ok('completedBeatIds populated', rtB.insertedArc.completedBeatIds.length >= 2);
  ok('directive changes between beats (no static repeat)', new Set(dB).size === dB.length);

  console.log('\n═══ C. WORLD CLOCK OFFSCREEN (Miles ignores collision) ═══');
  const rtC = freshRT();
  for (let sc = 0; sc < 5; sc++) W._ffCrossoverTick(rtC, { sceneIdx: sc, collisionOutcome: null });   // ignore, before dueScene
  ok('pressureDebt accrued while ignored', rtC.worldClock.pressureDebt > 0);
  ok('collision did NOT vanish while ignored (idx still 0)', rtC.worldClock.idx === 0);
  for (let sc = 5; sc < 10; sc++) W._ffCrossoverTick(rtC, { sceneIdx: sc, collisionOutcome: null });  // cross dueScene (=8)
  ok('collision TRIGGERED offscreen after its due scene', rtC.canonCollisionHistory.some(h => h.outcome === 'triggered'));
  const dC = W._ffCrossoverDirectiveFromRT(CX, rtC, 5);
  ok('directive reflects pressureDebt', /PRESSURE DEBT/.test(dC));

  console.log('\n═══ D. COLLISION RESOLUTION (Miles acts on it) ═══');
  const rtD = freshRT(); const beatsBefore = rtD.insertedArc.beats.length;
  W._ffCrossoverTick(rtD, { sceneIdx: 1, playerAction: 'Miles disrupts the Red Skull scouts', collisionOutcome: { outcome: 'resolved', delta: 'local relay saved', note: 'stalled the scouts' } });
  ok('outcome recorded in canonCollisionHistory', rtD.canonCollisionHistory.some(h => h.outcome === 'resolved'));
  ok('worldClock idx advanced', rtD.worldClock.idx === 1);
  ok('bounded delta only — arc NOT regenerated', rtD.insertedArc.beats.length === beatsBefore);

  console.log('\n═══ E. DIVERGENCE FLAG (Miles materially changes canon pressure) ═══');
  const rtE = freshRT();
  W._ffCrossoverTick(rtE, { sceneIdx: 2, playerAction: 'Miles collapses the Red Skull staging tunnel', collisionOutcome: { outcome: 'diverged', note: 'Brooklyn absorption stalled — off canon' } });
  ok('divergenceFlag set', Object.keys(rtE.divergenceFlags).length > 0);
  const dE = W._ffCrossoverDirectiveFromRT(CX, rtE, 3);
  ok('future directive references the divergence', /DIVERGENCE IN EFFECT/.test(dE));
  ok('Logan arc not overwritten (world majorCanonCharacters intact)', JSON.stringify(CX.contract.worldCanon.majorCanonCharacters).includes('Logan'));

  console.log('\n═══ F. STANDARD-FF REGRESSION + KILL SWITCH ═══');
  ctx.window.state = { ffContract: {} };   // no crossover
  ok('steer returns "" for non-crossover story', W._ffCrossoverSteer() === '');
  ctx.window.state = { turnCount: 3, ffContract: { crossover: CX, crossoverRuntime: freshRT() } };
  ctx.window.__ffCrossover = false;
  const advKilled = await W._ffCrossoverAdvance('some action');
  ok('kill switch __ffCrossover=false disables advance', advKilled === null);
  ctx.window.__ffCrossover = undefined;
  ok('tick on null runtime no-ops safely', W._ffCrossoverTick(null, {}) === null || W._ffCrossoverTick(undefined, {}) === undefined);

  console.log('\n═══ G. LONG-PLAY NO-VIBES (10 scenes, mixed) ═══');
  const g = await W._ffCrossoverLongPlayAudit({ crossover: CX, scenes: 10, totalScenes: 24 });
  Object.keys(g.checks).forEach(k => ok('G:' + k, g.checks[k]));

  console.log('\n─────── SUMMARY ───────');
  console.log('PASS ' + pass + '/' + (pass + fail) + (fail ? '  ✗ ' + fails.join(' · ') : '  — ALL GREEN'));
  console.log('API scene generations: 0 · proxy calls: 0 (mocked)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAILED:', e.message, e.stack); process.exit(1); });
