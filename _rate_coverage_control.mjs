// RESERVATION-RATE COVERAGE AND FAIL-CLOSED BOUNDING. Provider-free, $0.
//
// The earlier version only AUDITED the defect (and one check passed a literal `true` instead of
// inspecting routing). The guard is now repaired, so this verifies the repair: every model the app
// can route to is either priced from the verified table or REFUSED with a reason, and the
// expensive fallback is refused before dispatch when too little budget remains.
import fs from 'fs';
import { RATES, UNPRICED_MODELS, WORST_RATE, estimateUsd, resolveModel } from './_fsc_cost_guard.mjs';

const APP = fs.readFileSync('public/app.js', 'utf8');
const ORCH = fs.readFileSync('api/orchestrator.js', 'utf8');
const MPROXY = fs.readFileSync('api/mistral-proxy.js', 'utf8');
const GPROXY = fs.readFileSync('api/proxy.js', 'utf8');

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

// ── ROUTING EVIDENCE, read from the source rather than asserted ────────────────────────────
console.log('=== WHICH MODELS CAN ACTUALLY BE REACHED (evidence, not assertion) ===');
const gpt4oRefs = (APP.match(/'gpt-4o'/g) || []).length;
// Only MODEL SLUGS — the first regex captured comment prose as a value
// ("CHARACTER_PORTFOLIO: 'portfolio authoring routes through Mistral...'") and reported it as an
// unpriceable model. A model slug is lowercase with digits, dots and hyphens and no spaces.
const roleDefaults = [...ORCH.matchAll(/^\s{2}([A-Z_]+):\s*'([a-z0-9][a-z0-9.\-]{3,40})'/gm)]
  .map(m => [m[1], m[2]]);
const mistralDefault = (MPROXY.match(/model\s*=\s*'([a-z0-9.\-]+)'/) || [])[1] || null;
const grokCollapse = /return \{ model: 'grok-4\.3', effort \}/.test(GPROXY);
console.log('  public/app.js references \'gpt-4o\': ' + gpt4oRefs + ' time(s)');
console.log('  api/mistral-proxy.js default model: ' + mistralDefault);
console.log('  api/proxy.js collapses every grok-* to grok-4.3: ' + grokCollapse);
console.log('  api/orchestrator.js DEFAULT_MODELS (first 6): '
  + JSON.stringify(roleDefaults.slice(0, 6)));

t('gpt-4o is reachable — it is referenced in public/app.js', gpt4oRefs > 0,
  'replaces the old literal-true assertion with a source count');
t('the mistral proxy has an UNPRICED default (mistral-medium-latest)',
  mistralDefault === 'mistral-medium-latest'
  && UNPRICED_MODELS.indexOf(mistralDefault) !== -1, String(mistralDefault));
t('the grok proxy collapses every grok-* name to grok-4.3', grokCollapse);
t('every orchestrator role default is a model the guard can price',
  roleDefaults.length > 0 && roleDefaults.every(([, m]) =>
    Object.prototype.hasOwnProperty.call(RATES, resolveModel(m, '').model)),
  JSON.stringify(roleDefaults.filter(([, m]) =>
    !Object.prototype.hasOwnProperty.call(RATES, resolveModel(m, '').model))));

// ── THE EXPENSIVE FALLBACK IS NOW PRICED, NOT UNDER-RESERVED ───────────────────────────────
console.log('');
console.log('=== PRICING (40k-char prompt, max_tokens 4000) ===');
const body = { messages: [{ role: 'system', content: 'x'.repeat(40000) }], max_tokens: 4000 };
const q = (m, url) => estimateUsd(body, m, url);
for (const [m, url] of [['grok-4-1-fast-reasoning', ''], ['gpt-4o-mini', ''], ['gpt-4o', ''],
    ['gpt-4-turbo', ''], ['ministral-8b-2512', ''], ['(unspecified)', '/api/mistral-proxy'],
    ['(unspecified)', '/api/chatgpt-proxy'], ['(unspecified)', '']]) {
  const r = q(m, url);
  console.log('  ' + (m + (url ? ' @' + url : '')).padEnd(40)
    + (r.bounded ? ('$' + r.estimate.toFixed(6) + '   ' + r.resolvedBy)
                 : ('REFUSED — ' + r.refuseReason.slice(0, 72))));
}
const grok = q('grok-4-1-fast-reasoning', ''), g4o = q('gpt-4o', '');
t('gpt-4o is now priced ABOVE Grok, not at the Grok rate',
  g4o.bounded && g4o.estimate > grok.estimate * 2,
  'grok $' + grok.estimate.toFixed(6) + ' vs gpt-4o $' + g4o.estimate.toFixed(6));
t('gpt-4-turbo is priced above gpt-4o', q('gpt-4-turbo', '').estimate > g4o.estimate);
t('the mistral proxy default is REFUSED, not silently priced at the Grok rate',
  q('(unspecified)', '/api/mistral-proxy').bounded === false);
t('an unresolvable model is REFUSED', q('(unspecified)', '').bounded === false);
t('the chatgpt proxy default resolves and prices', q('(unspecified)', '/api/chatgpt-proxy').bounded === true);
t('GPT and Mistral remain AVAILABLE as fallbacks (priced, not excluded)',
  q('gpt-4o', '').bounded && q('gpt-4o-mini', '').bounded
  && q('ministral-8b-2512', '').bounded && q('mistral-small-latest', '').bounded);

// ── REFUSED BEFORE DISPATCH WHEN TOO LITTLE BUDGET REMAINS ─────────────────────────────────
console.log('');
console.log('=== THE EXPENSIVE FALLBACK AGAINST A THIN REMAINING BUDGET ===');
// The runner's own rule: refuse when exposure + estimate > ceiling.
const CEILING = 0.9232852;          // the real remaining authorization
const wouldRefuse = (exposure, m, url) => {
  const r = q(m, url);
  if (!r.bounded) return { refused: true, why: r.refuseReason };
  return { refused: exposure + r.estimate > CEILING,
    why: 'exposure $' + exposure.toFixed(4) + ' + $' + r.estimate.toFixed(4)
      + ' vs ceiling $' + CEILING.toFixed(4) };
};
const thin = wouldRefuse(0.85, 'gpt-4o', '');
const roomy = wouldRefuse(0.00, 'gpt-4o-mini', '');
console.log('  gpt-4o with $0.85 already exposed: ' + (thin.refused ? 'REFUSED' : 'allowed')
  + ' — ' + thin.why);
console.log('  gpt-4o-mini from zero:             ' + (roomy.refused ? 'REFUSED' : 'allowed')
  + ' — ' + roomy.why);
t('the EXPENSIVE fallback is refused before dispatch when little budget remains', thin.refused);
t('a cheap call with the budget free is still allowed', !roomy.refused);
t('WORST_RATE is now a genuine cross-provider maximum',
  WORST_RATE.in >= Math.max(...Object.values(RATES).map(r => r.in))
  && WORST_RATE.out >= Math.max(...Object.values(RATES).map(r => r.out)),
  JSON.stringify(WORST_RATE));

console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
