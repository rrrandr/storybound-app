// ── A COMPARISON ARM CANNOT SILENTLY BECOME A DIFFERENT PROVIDER ($0, provider-free) ────────
// _authorFullScenePolicy carries its own Grok -> ministral-8b-2512 -> gpt-4o chain. For an A/B arm
// that is fatal: a failed Grok arm would be answered by Ministral and measured as Grok. This drives
// the SHIPPED function with every provider route intercepted, and checks both directions.
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '  — ' + detail : '')); }
};

console.log('=== NO-FALLBACK COMPARISON ARM (provider-free, $0) ===\n');
const browser = await chromium.launch();
const page = await browser.newPage();

let grokOk = true;
const hits = [];
await page.route('**/api/**', async (route) => {
  const url = route.request().url();
  let body = {};
  try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  if (/\/api\/proxy/.test(url)) {
    hits.push({ route: 'grok', noFallbackSent: body._noFallback, hasKey: '_noFallback' in body });
    if (!grokOk) return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ model: 'grok-4-1-fast-reasoning', resolvedModel: 'grok-4-1-fast-reasoning',
        upstreamAttempts: 1, choices: [{ message: { content: 'GROK TEXT' } }],
        usage: { prompt_tokens: 10, completion_tokens: 2, cost_in_usd_ticks: 0 } }) });
  }
  if (/mistral-proxy/.test(url)) {
    hits.push({ route: 'mistral' });
    // NOTE: the real Mistral proxy returns NO upstreamAttempts — mirrored here.
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ model: 'ministral-8b-2512', resolvedModel: 'ministral-8b-2512',
        choices: [{ message: { content: 'MINISTRAL TEXT' } }],
        usage: { prompt_tokens: 10, completion_tokens: 2, cost_in_usd_ticks: 0 } }) });
  }
  if (/chatgpt-proxy/.test(url)) { hits.push({ route: 'openai' }); }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._authorFullScenePolicy === 'function',
  { timeout: 30000 });
t('the shipped window._authorFullScenePolicy is present', true);

const call = (opts) => page.evaluate(async (o) => {
  try {
    const r = await window._authorFullScenePolicy(
      [{ role: 'system', content: 'S' }, { role: 'user', content: 'U' }], o);
    return { ok: true, provider: r.provider, model: r.model,
             attempts: (r.attempts || []).map(a => ({ tier: a.tier, provider: a.provider,
               ok: a.ok, skipped: !!a.skipped, reason: a.reason || null })) };
  } catch (e) {
    return { ok: false, message: String(e && e.message),
             noFallbackArm: !!(e && e._noFallbackArm),
             attempts: ((e && e._attempts) || []).map(a => ({ tier: a.tier, provider: a.provider,
               ok: a.ok, skipped: !!a.skipped, reason: a.reason || null })) };
  }
}, opts);

// ── 1. DEFAULT: byte-identical to before — no _noFallback key at all ────────────────────────
hits.length = 0; grokOk = true;
const def = await call({ maxTokens: 500 });
console.log('      default      -> provider=' + def.provider + '  grok body: '
  + JSON.stringify(hits.filter(h => h.route === 'grok')));
t('DEFAULT sends NO _noFallback key — existing callers are unchanged',
  hits.some(h => h.route === 'grok' && h.hasKey === false)
  || hits.every(h => h.route !== 'grok' || h.noFallbackSent === undefined),
  JSON.stringify(hits));
t('DEFAULT still succeeds on the Grok tier', def.ok && def.provider === 'grok',
  JSON.stringify(def).slice(0, 150));

// ── 2. DEFAULT with Grok down: the chain still falls back, production untouched ──────────────
hits.length = 0; grokOk = false;
const defDown = await call({ maxTokens: 500 });
console.log('      default/down -> ' + (defDown.ok ? ('provider=' + defDown.provider) : 'threw')
  + '  routes hit: ' + hits.map(h => h.route).join(','));
t('DEFAULT with Grok failing still reaches another provider — ordinary behaviour preserved',
  hits.some(h => h.route === 'mistral' || h.route === 'openai'), JSON.stringify(hits));

// ── 3. noFallback: the flag reaches the Grok proxy ──────────────────────────────────────────
hits.length = 0; grokOk = true;
const nf = await call({ maxTokens: 500, noFallback: true });
console.log('      noFallback   -> provider=' + nf.provider + '  grok body: '
  + JSON.stringify(hits.filter(h => h.route === 'grok')));
t('noFallback sends _noFallback:true to the Grok proxy',
  hits.some(h => h.route === 'grok' && h.noFallbackSent === true), JSON.stringify(hits));
t('and the Grok arm still returns its own text',
  nf.ok && nf.provider === 'grok', JSON.stringify(nf).slice(0, 150));

// ── 4. noFallback with Grok down: a FAILED ARM, never a substitution ────────────────────────
hits.length = 0; grokOk = false;
const nfDown = await call({ maxTokens: 500, noFallback: true });
console.log('      noFb/down    -> ' + (nfDown.ok ? ('provider=' + nfDown.provider) : 'threw')
  + '  routes hit: ' + (hits.map(h => h.route).join(',') || 'grok only'));
t('a failed Grok arm with noFallback does NOT call Mistral or OpenAI',
  !hits.some(h => h.route === 'mistral' || h.route === 'openai'), JSON.stringify(hits));
t('it is reported as a failed arm, not substituted',
  !nfDown.ok && nfDown.noFallbackArm, JSON.stringify(nfDown).slice(0, 200));
t('and the skipped tiers say why',
  (nfDown.attempts || []).filter(a => a.skipped && /comparison arm/.test(String(a.reason))).length === 2,
  JSON.stringify(nfDown.attempts));

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
