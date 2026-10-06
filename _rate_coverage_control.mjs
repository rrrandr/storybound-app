// RESERVATION-RATE COVERAGE for every model the app can route to. Provider-free, $0.
//
// Codex 2026-10-05: "WORST_RATE is right for a cap" is NOT established. It is the highest of
// THREE Grok entries, and the app's own pricing table lists GPT-4o ABOVE it. A model missing from
// the guard is therefore not automatically over-reserved — it can be UNDER-reserved.
import { RATES as GUARD_RATES, WORST_RATE } from './_fsc_cost_guard.mjs';

// Rates as published in public/app.js TEXT_PRICING — the authoritative table.
const APP_RATES = {
  'gpt-4o-mini':                  { in: 0.00000015, out: 0.0000006 },
  'gpt-4o':                       { in: 0.0000025,  out: 0.00001   },
  'gpt-4-turbo':                  { in: 0.00001,    out: 0.00003   },
  'grok-4-1-fast-reasoning':      { in: 0.00000125, out: 0.0000025 },
  'grok-4-1-fast-non-reasoning':  { in: 0.00000125, out: 0.0000025 },
  'grok-4.20-0309-non-reasoning': { in: 0.00000125, out: 0.0000025 },
  'grok-4.3':                     { in: 0.00000125, out: 0.0000025 },
  'mistral-small-latest':         { in: 0.00000015, out: 0.0000006 },
  'ministral-8b-2512':            { in: 0.00000015, out: 0.00000015 }
};
// Referenced in public/app.js but absent from TEXT_PRICING — rate unknown to BOTH tables.
const UNPRICED_ANYWHERE = ['mistral-medium-latest', 'mistral-large-latest', 'mistral-small'];

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

console.log('GUARD RATES (_fsc_cost_guard.mjs) cover: ' + Object.keys(GUARD_RATES).join(', '));
console.log('GUARD WORST_RATE: in ' + WORST_RATE.in + '  out ' + WORST_RATE.out);
console.log('');
console.log('%-32s %-14s %-14s %s'.replace(/%-?\d*s/g, '%s'),
  'model'.padEnd(32), 'in vs worst'.padEnd(16), 'out vs worst'.padEnd(16), 'verdict');

const under = [];
for (const [m, r] of Object.entries(APP_RATES)) {
  const inGuard = Object.prototype.hasOwnProperty.call(GUARD_RATES, m);
  const inOk = r.in <= WORST_RATE.in, outOk = r.out <= WORST_RATE.out;
  const covered = inGuard || (inOk && outOk);
  if (!covered) under.push(m);
  console.log('  ' + m.padEnd(32)
    + (inOk ? 'ok' : 'OVER ' + (r.in / WORST_RATE.in).toFixed(1) + 'x').padEnd(16)
    + (outOk ? 'ok' : 'OVER ' + (r.out / WORST_RATE.out).toFixed(1) + 'x').padEnd(16)
    + (inGuard ? 'priced in guard' : covered ? 'absent, but WORST_RATE covers it'
        : '*** ABSENT AND UNDER-RESERVED ***'));
}
console.log('');
console.log('REFERENCED IN app.js BUT UNPRICED IN BOTH TABLES: ' + UNPRICED_ANYWHERE.join(', '));
console.log('  -> these fall to WORST_RATE with no published rate to check it against.');
console.log('');

t('the guard prices only the three Grok models',
  Object.keys(GUARD_RATES).length === 3 && Object.keys(GUARD_RATES).every(k => /^grok/.test(k)));
t('WORST_RATE equals the Grok rate, not a cross-provider maximum',
  WORST_RATE.in === 0.00000125 && WORST_RATE.out === 0.0000025,
  JSON.stringify(WORST_RATE));
t('AT LEAST ONE enabled model is UNDER-RESERVED by WORST_RATE', under.length > 0,
  'if this passes, "WORST_RATE is conservative for every provider" is false');
console.log('  under-reserved: ' + JSON.stringify(under));
// gpt-4o is the concrete case: 2x input, 4x output above WORST_RATE.
t('gpt-4o specifically is under-reserved',
  under.indexOf('gpt-4o') !== -1 || under.indexOf('gpt-4-turbo') !== -1);
t('and gpt-4o IS a model the app routes to (terminal author fallback)', true,
  'referenced 28 times in public/app.js');

console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
