// Guard: Phase-2 step B — classifyWishDisposition (compound Eight-Orders) + normalizeGoverningDesire
// (stable anti-spam desire key). Extracts the two functions + their tables from app.js and RUNS them
// (legacy classifyPetition/_classifyTemptScale stubbed) to verify behavior, not just presence.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// --- extract the added block (first WISH_ORDER_META definition → normalizeGoverningDesire export) ---
const start = src.indexOf('WISH_ORDER_META');
const endMark = 'window.normalizeGoverningDesire = normalizeGoverningDesire;';
const end = src.indexOf(endMark);
A(start >= 0 && end > start, 'could not locate the step-B block (WISH_ORDER_META … normalizeGoverningDesire export)');
// back up to the start of the statement that defines WISH_ORDER_META (const/var/let on that line)
let s = start; while (s > 0 && src[s] !== '\n') s--;
const block = src.slice(s + 1, end + endMark.length);

// determinism: no Math.random / Date in the actual code (comment mentions are fine — strip // lines)
const codeOnly = block.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
A(!/Math\.random|Date\.now|new Date/.test(codeOnly), 'step-B code is non-deterministic (Math.random/Date present in code)');

// run it in a sandbox with the two legacy classifiers stubbed (reinforcement-only, so stubs are safe)
let win;
try {
  const run = new Function('window', 'classifyPetition', '_classifyTemptScale',
    block + '\nreturn window;');
  win = run({}, () => 'general', () => ({ scale: 'social' }));
} catch (e) { A(false, 'eval of step-B block threw: ' + e.message); }

if (win && typeof win.classifyWishDisposition === 'function' && typeof win.normalizeGoverningDesire === 'function') {
  const C = win.classifyWishDisposition, N = win.normalizeGoverningDesire;
  const ORDERS = ['RESTORATION','TEMPORARY_AID','REVELATION','TRANSFORMATION','FORTUNE','AGENCY','IDENTITY','HISTORY'];
  const DISP = { RESTORATION:'welcomes', TEMPORARY_AID:'welcomes', REVELATION:'usually-welcomes', TRANSFORMATION:'cautious', FORTUNE:'risky', AGENCY:'resists', IDENTITY:'strongly-resists', HISTORY:'nearly-impossible' };

  // (1) return shape + invariants on a compound wish
  const cw = C('restore my dead wife with her memories and make her forgive me');
  A(cw && ORDERS.includes(cw.dominantOrder) && Array.isArray(cw.secondaryOrders), 'classify: bad return shape');
  A(cw.disposition === DISP[cw.dominantOrder], 'classify: disposition != dominantOrder disposition');
  A(!cw.secondaryOrders.includes(cw.dominantOrder) && new Set(cw.secondaryOrders).size === cw.secondaryOrders.length, 'classify: secondaryOrders dup/contains dominant');
  A(cw.resistedOperation === null || ['AGENCY','IDENTITY','HISTORY'].includes(cw.resistedOperation), 'classify: bad resistedOperation');
  // (2) COMPOUND: dead-wife wish → HISTORY dominant, IDENTITY + AGENCY among secondaries
  A(cw.dominantOrder === 'HISTORY' && cw.secondaryOrders.includes('IDENTITY') && cw.secondaryOrders.includes('AGENCY'),
    'compound wish not resolved (want HISTORY dom + IDENTITY & AGENCY secondary) got ' + JSON.stringify(cw));
  // (3) faint-incidental regression: "close her wound" must NOT become AGENCY
  A(C('Fate, close her wound—take what it costs').dominantOrder === 'RESTORATION',
    '"close her wound" mis-ranked (want RESTORATION, false-friend AGENCY regression)');
  // (4) single-Order sanity
  A(C('make her love me').dominantOrder === 'AGENCY' && C('make her love me').resistedOperation === 'AGENCY', 'agency wish misclassified');
  // WISH-CONSTRUCTION phrasings (what players type now that "I wish …" is a valid invocation) — the live
  // run caught these defaulting to RESTORATION/empty-desire. Guard them so they classify like the imperative.
  A(C('I wish he would love me').dominantOrder === 'AGENCY' && C('I wish he would love me').governingDesire, 'wish-construction "I wish he would love me" not AGENCY / empty desire');
  A(C('I wish he would forgive me').dominantOrder === 'AGENCY', 'wish-construction "I wish he would forgive me" not AGENCY');
  A(C('Take my hair and let me breathe underwater').dominantOrder === 'TEMPORARY_AID' && C('Take my hair and let me breathe underwater').governingDesire, '"breathe underwater" not TEMPORARY_AID / empty desire');
  A(C('I wish I could bring my dead husband back exactly as he was and make him forgive me').dominantOrder === 'HISTORY', 'compound wish-construction missed HISTORY as dominant');
  A(C('show me who killed my father').dominantOrder === 'REVELATION', 'revelation wish misclassified');
  A(C('make me rich beyond measure').dominantOrder === 'FORTUNE', 'fortune wish misclassified');
  // (5) safe default on junk / casual non-wish
  for (const junk of ['', null, 123]) { const d = C(junk); A(d && d.dominantOrder === 'RESTORATION' && d.disposition === 'welcomes' && d.governingDesire === '', 'safe default wrong for ' + JSON.stringify(junk)); }
  // (6) determinism: same input → deep-equal twice
  A(JSON.stringify(C('bring her back from the dead')) === JSON.stringify(C('bring her back from the dead')), 'classify not deterministic');

  // (7) normalize: rephrasings of one desire collapse; a different desire does not
  const k1 = N('make her love me'), k2 = N('I want her to love me'), k3 = N('Fate, let her love me');
  A(k1 && k1 === k2 && k2 === k3, 'normalize: "love me" rephrasings did not collapse (' + [k1,k2,k3].join(' | ') + ')');
  const r1 = N('bring her back from the dead'), r2 = N('resurrect her, I beg you');
  A(r1 && r1 === r2, 'normalize: resurrection rephrasings did not collapse');
  A(N('make me rich') !== k1 && N('make me rich') !== r1, 'normalize: distinct desires collided');
  // (8) normalize: sacrifice clause dropped; sorted/lowercase; safe on junk
  A(N('make her love me — take my voice') === k1, 'normalize: offered-sacrifice clause not dropped');
  A(k1 === k1.split('|').sort().join('|') && k1 === k1.toLowerCase(), 'normalize: key not sorted/lowercased');
  A(N('') === '' && N(null) === '', 'normalize: junk not handled');
} else {
  A(false, 'step-B functions not exposed after eval');
}

if (fail) process.exit(1);
console.log('PASS: classifyWishDisposition is compound (HISTORY+IDENTITY+AGENCY), false-friend-safe, deterministic, safe-defaulting; normalizeGoverningDesire collapses rephrasings, drops the offer, stays stable.');
