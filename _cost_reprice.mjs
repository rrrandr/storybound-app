// REPRICE THE OBSERVED CALL SEQUENCE with per-model rates and FUNCTION classification.
// Provider-free, $0. Replaces two wrong claims in my earlier memo:
//   (a) "$2.27 is a floor because fixture completions are small" — the estimator never reads
//       completions. It uses REQUESTED max_tokens x REASONING_MULT(1.5) x SAFETY_MARGIN(1.2),
//       with ASSUME_NO_CACHE. So it is an uncached, worst-case RESERVATION figure, not a minimum.
//   (b) "author vs everything else" by role label — this project also routes prose through
//       STRUCTURE_GENERATOR, so role labels cannot establish which calls wrote scenes.
import fs from 'fs';

// Rates copied from public/app.js TEXT_PRICING (the authoritative table).
const RATES = {
  'gpt-4o-mini':                  { in: 0.00000015, out: 0.0000006 },
  'gpt-4o':                       { in: 0.0000025,  out: 0.00001   },
  'grok-4-1-fast-reasoning':      { in: 0.00000125, out: 0.0000025 },
  'grok-4-1-fast-non-reasoning':  { in: 0.00000125, out: 0.0000025 },
  'grok-4.20-0309-non-reasoning': { in: 0.00000125, out: 0.0000025 },
  'grok-4.3':                     { in: 0.00000125, out: 0.0000025 },
  'mistral-small-latest':         { in: 0.00000015, out: 0.0000006 },
  'ministral-8b-2512':            { in: 0.00000015, out: 0.00000015 }
};
const CHARS_PER_TOKEN = 4.0, REASONING_MULT = 1.5, SAFETY = 1.2, UNKNOWN_MAX = 8000;

const dir = process.argv[2];
const calls = JSON.parse(fs.readFileSync(dir + '/calls.json', 'utf8'));
const console_ = fs.existsSync(dir + '/console.log')
  ? fs.readFileSync(dir + '/console.log', 'utf8') : '';

// FUNCTION, not role label. Each call is classified by what it was actually for, read from its
// own requested model plus the stage markers the runner recorded. Anything unclassifiable is
// reported as UNCLASSIFIED rather than folded into a bucket.
function classify(c) {
  // The runner now stamps each call with the function its own PROMPT declares. Role labels are
  // not used: prose also routes through STRUCTURE_GENERATOR, so a label cannot say what wrote a
  // scene. A call with no stamp is reported as unstamped, not guessed at.
  if (c.fn) return c.fn;
  return 'UNSTAMPED (older run, role=' + (c.role || 'none') + ')';
}

let worstTotal = 0, pricedTotal = 0;
const byFn = {}, byModel = {};
for (const c of calls) {
  const model = c.requested || c.served || '(unspecified)';
  const chars = Number(c.chars) || 0;
  const promptTokens = Math.ceil(chars / CHARS_PER_TOKEN);
  const maxOut = Number(c.maxTokens) || UNKNOWN_MAX;
  const outTokens = Math.ceil(maxOut * REASONING_MULT);
  const rate = RATES[model];
  const worstRate = { in: 0.00001, out: 0.00003 };   // the table's most expensive entry
  const priced = rate
    ? (promptTokens * rate.in + outTokens * rate.out) * SAFETY
    : null;
  const asRun = Number(c.estimate) || 0;             // what the guard actually reserved
  worstTotal += asRun;
  if (priced != null) pricedTotal += priced;
  const fn = classify(c);
  byFn[fn] = byFn[fn] || { calls: 0, asRun: 0, priced: 0, unpriced: 0 };
  byFn[fn].calls++; byFn[fn].asRun += asRun;
  if (priced != null) byFn[fn].priced += priced; else byFn[fn].unpriced++;
  byModel[model] = byModel[model] || { calls: 0, chars: 0, asRun: 0, priced: 0, inTable: !!rate };
  byModel[model].calls++; byModel[model].chars += chars;
  byModel[model].asRun += asRun;
  if (priced != null) byModel[model].priced += priced;
}

console.log('=== OBSERVED CALL SEQUENCE: ' + calls.length + ' calls — ' + dir);
console.log('');
console.log('MODEL-SPECIFIC PRICING ASSUMPTIONS (public/app.js TEXT_PRICING, $/token):');
Object.entries(RATES).forEach(([m, r]) =>
  console.log('  %s in %s  out %s'.replace('%s', m.padEnd(30)).replace('%s', String(r.in)).replace('%s', String(r.out))));
console.log('  unknown model -> the guard uses WORST_RATE (the most expensive entry), NOT a default');
console.log('');
console.log('%-32s %5s %12s %12s %12s'.replace(/%(-?\d+)s/g, (m,w)=>'%s'),
  'model', 'calls', 'prompt chars', 'as reserved', 'model-priced');
Object.entries(byModel).sort((a,b)=>b[1].asRun-a[1].asRun).forEach(([m,v]) =>
  console.log('  ' + m.padEnd(32) + String(v.calls).padStart(4)
    + String(v.chars).padStart(13)
    + ('$' + v.asRun.toFixed(4)).padStart(13)
    + (v.inTable ? ('$' + v.priced.toFixed(4)).padStart(13) : '   NOT IN GUARD'.padStart(13))));
console.log('');
console.log('BY FUNCTION (classified by purpose, not by role label):');
Object.entries(byFn).sort((a,b)=>b[1].asRun-a[1].asRun).forEach(([f,v]) =>
  console.log('  ' + f.padEnd(34) + String(v.calls).padStart(4) + ' calls'
    + ('  reserved $' + v.asRun.toFixed(4)).padStart(22)
    + (v.unpriced ? ('  (' + v.unpriced + ' unpriced by the guard)') : '')));
console.log('');
console.log('TOTALS');
console.log('  AS RESERVED by the guard (uncached, max-output, x1.5 reasoning, x1.2 safety): $'
  + worstTotal.toFixed(4));
console.log('  REPRICED with per-model rates, same max-output assumptions:                  $'
  + pricedTotal.toFixed(4));
console.log('');
console.log('Neither figure is a measured bill. Both use REQUESTED max_tokens, so both scale with');
console.log('the completion budget asked for, not with what a model returns.');
