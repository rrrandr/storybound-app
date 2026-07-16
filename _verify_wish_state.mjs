// Guard: Phase-2 step C — the 3-layer wish state (active bargains / durable consequences / ledger)
// + per-desire anti-spam continuation. Extracts the C helpers from app.js and RUNS them with a stubbed
// window.state + stubbed B/obligation deps, to verify behavior (continuation-not-reroll, monotonic
// escalation, durable directive, open-debt reuse), not just presence.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (static) three SEPARATE state fields, reset in L3 _resetStoryState
A(/state\._openFateBargains = \[\];/.test(src) && /state\._durableFateConsequences = \[\];/.test(src), 'active/durable state not reset in _resetStoryState');
A(src.includes('function _findOrCreateFateBargain') && src.includes('function _recordDurableConsequence') && src.includes('function _recordFateBargainToLedger'), 'C helpers missing');
A(src.includes('_recordObligationDebt'), 'open_debt does not reuse _obligationLedger');

// extract the C region (the _DURABLE_CONSEQUENCE_TYPES table → last C window export)
const s0 = src.indexOf('var _DURABLE_CONSEQUENCE_TYPES');
const eMark = 'window._recordFateBargainToLedger = _recordFateBargainToLedger;';
const e0 = src.indexOf(eMark);
A(s0 >= 0 && e0 > s0, 'could not locate the C helper region');
let ls = s0; while (ls > 0 && src[ls] !== '\n') ls--;
const block = src.slice(ls + 1, e0 + eMark.length);
// NOTE: C IDs/receipts may use Date.now (a browser timestamp is fine); only the desireKey must be
// deterministic, and that comes from B's normalizeGoverningDesire (guarded separately). No determinism
// assertion here.

// run with stubbed deps
let win;
try {
  const obl = [];
  const stubNorm = (t) => String(t || '').toLowerCase().replace(/[^a-z]+/g, '');           // deterministic desireKey (B is tested separately)
  const stubClassify = () => ({ governingDesire: '', dominantOrder: 'RESTORATION', secondaryOrders: [], resistedOperation: null, disposition: 'welcomes' });
  const stubRecordObl = (d) => { obl.push(d); };
  const clip = (x) => x;
  const run = new Function('window', 'normalizeGoverningDesire', 'classifyWishDisposition', '_recordObligationDebt', '_recordObligationDebtLedger', '_FATE_TOLL_CLIP', '_fateTollClip',
    block + '\nreturn window;');
  win = { state: { _openFateBargains: [], _durableFateConsequences: [], _obligationLedger: obl, turnCount: 2 } };
  run(win, stubNorm, stubClassify, stubRecordObl, stubRecordObl, clip, clip);
  win._obl = obl;
} catch (err) { A(false, 'eval of C block threw: ' + err.message); }

if (win && typeof win._findOrCreateFateBargain === 'function') {
  const st = win.state;
  const cls = (gd) => ({ governingDesire: gd, dominantOrder: 'HISTORY', secondaryOrders: ['IDENTITY'], resistedOperation: 'HISTORY', disposition: 'nearly-impossible' });

  // (1) CONTINUATION not reroll: same desire twice → ONE bargain, attemptCount 2, escalation 1, same identity
  const b1 = win._findOrCreateFateBargain(cls('reunion with the dead'), { rail: 'ordinary', sceneIdx: 2 });
  const b2 = win._findOrCreateFateBargain(cls('reunion with the dead'), { rail: 'ordinary', sceneIdx: 4 });
  A(st._openFateBargains.length === 1, 'same desire created a second bargain (want continuation)');
  A(b1 === b2, 'continuation returned a different object');
  A(b2.attemptCount === 2 && b2.escalation === 1 && b2.lastInvokedScene === 4, 'continuation did not deepen (attempt/escalation/scene)');
  A(b2.status === 'open', 'continuation should stay open');
  // (2) monotonic escalation never resets
  const b3 = win._findOrCreateFateBargain(cls('reunion with the dead'), { rail: 'ordinary', sceneIdx: 6 });
  A(b3.attemptCount === 3 && b3.escalation === 2 && b3.escalation === b3.attemptCount - 1, 'escalation not monotonic (escalation === attemptCount-1)');
  // (3) different desire → separate bargain
  win._findOrCreateFateBargain(cls('wealth'), { rail: 'ordinary', sceneIdx: 7 });
  A(st._openFateBargains.length === 2, 'different desire did not create a second bargain');
  // (4) escalation note shape
  A(typeof win._fateBargainEscalationNote(b3) === 'string' && win._fateBargainEscalationNote(b3).length > 0, 'escalation note empty');

  // (5) durable directive: empty → '' ; after a record → names the loss + scene
  A(win._buildDurableFateConsequenceDirective() === '', 'durable directive not empty when no consequences');
  win._recordDurableConsequence({ type: 'voice_lost', detail: 'her singing voice', sceneIdx: 2 });
  const dir = win._buildDurableFateConsequenceDirective();
  A(/PERMANENT WISH-COST/i.test(dir) && /singing voice/.test(dir), 'durable directive missing the recorded consequence');
  // (6) unknown type → 'other'
  win._recordDurableConsequence({ type: 'bogus_type', detail: 'x', sceneIdx: 3 });
  A(st._durableFateConsequences.some(c => c.type === 'other'), 'unknown consequence type not normalized to other');
  // (7) open_debt reuses _obligationLedger
  win._recordDurableConsequence({ type: 'open_debt', detail: 'a debt Fate names later', sceneIdx: 3 });
  A(win._obl.length >= 1 && String(win._obl[win._obl.length - 1].id).startsWith('fatedebt_') && win._obl[win._obl.length - 1].importance === 'hard', 'open_debt did not record a hard obligation via _obligationLedger');

  // (8) fail-soft: junk args don't throw
  let threw = false;
  try { win._findOrCreateFateBargain(null, null); win._recordDurableConsequence(null); win._buildDurableFateConsequenceDirective(); } catch (_) { threw = true; }
  A(!threw, 'C helpers threw on junk args (should be fail-soft)');
} else {
  A(false, 'C helpers not exposed after eval');
}

if (fail) process.exit(1);
console.log('PASS: active bargains continue-not-reroll (monotonic per-desire escalation), durable consequences render + reuse _obligationLedger for debts, ledger separate — 3 layers, fail-soft.');
