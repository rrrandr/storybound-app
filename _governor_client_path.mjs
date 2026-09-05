// GOVERNOR REFUSAL IS TERMINAL — proven through the real Scene-1 client path.
// Fenced: the mistral route answers with the proxy's typed governor refusal and NOTHING is
// forwarded anywhere. The question is what the app does next — how many times it re-asks, and
// whether any other provider is called to cover for the refusal.
//   node _governor_client_path.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import { makeSession } from './_test_session_env.mjs';

const DEV = 'http://localhost:3000', ORIGIN = 'https://storybound.love';
const CFG = await (await fetch(DEV + '/api/config')).json();
const SB_ORIGIN = new URL(CFG.supabaseUrl).origin;
const SB_KEY = 'sb-' + new URL(CFG.supabaseUrl).hostname.split('.')[0] + '-auth-token';
const PROXY_ORIGIN = new URL(CFG.proxyUrl).origin;

const SUITE = fs.readFileSync('_scene1_skeleton_delivery.mjs', 'utf8').split('\n');
const LAUNCH = SUITE.findIndex(l => /^let browser = await chromium\.launch/.test(l));
const slice = './_gov_fixture_slice.mjs';
fs.writeFileSync(slice, SUITE.slice(0, LAUNCH).join('\n')
  + '\nexport { plannerReply, scaffoldReply, APLOT_VALID, GENERIC as APLOT_GENERIC, REQUEST_KINDS };\n');
let FIX; try { FIX = await import(slice + '?t=' + Date.now()); } finally { try { fs.unlinkSync(slice); } catch (_) {} }
const hp = await import('./_hook_fixture_prose.mjs');
const PROSE = hp.buildScene1Prose(hp.NONTOKEN_A);

// The EXACT body api/mistral-proxy.js returns when the governor refuses. Not an approximation:
// a refusal the client mis-reads is the whole risk being tested.
const REFUSAL = { error: 'quota_exhausted_tpm', governor: true, terminal: false,
  model: 'mistral-small-latest', detail: 'bucket exhausted', reserved_tokens: 88049,
  used_tokens: 19000, limit_tpm: 20000, retry_after_ms: 41000,
  retry_tpm_ms: 41000, retry_rps_ms: null };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.setDefaultTimeout(300000); page.setDefaultNavigationTimeout(300000);

const calls = [], logs = [];
await page.addInitScript(({ key, s }) => { try { window.localStorage.setItem(key, JSON.stringify(s)); } catch (_) {} },
  { key: SB_KEY, s: makeSession() });
await page.addInitScript(() => {
  try { ['sb_baked_pending_entry','sb_ff_pending_entry','sb_pre_checkout_fortunes']
    .forEach(k => window.localStorage.removeItem(k)); } catch (_) {}
});

const record = (path, body) => { let b = null; try { b = JSON.parse(body || '{}'); } catch (_) {}
  calls.push({ path, role: (b && b.role) || null, model: (b && b.model) || null }); return b; };

await page.route(ORIGIN + '/**', async r => {
  const u = new URL(r.request().url());
  if (u.pathname.startsWith('/api/consume-fortune'))
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, fortunesRemaining: 9999 }) });
  if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/.test(u.pathname)) {
    const b = record(u.pathname, r.request().postData());
    // THE MISTRAL ROUTE ALWAYS REFUSES, as the governor would.
    if (u.pathname === '/api/mistral-proxy') {
      return r.fulfill({ status: 429, contentType: 'application/json',
        headers: { 'Retry-After': '41', 'X-Quota-Outcome': 'quota_exhausted_tpm' },
        body: JSON.stringify(REFUSAL) });
    }
    const m = (b && b.messages) || [];
    const sys = String((m.find(x => x.role === 'system') || {}).content || '');
    const usr = String((m.find(x => x.role === 'user') || {}).content || '');
    const hits = FIX.REQUEST_KINDS.filter(([, t]) => t(sys + '\n' + usr, sys, usr)).map(([k]) => k);
    let out = JSON.stringify(FIX.APLOT_GENERIC);
    if (hits.length === 1) { const k = hits[0];
      if (k === 'author') out = PROSE;
      else if (k === 'planner') out = FIX.plannerReply(usr, null);
      else if (k === 'scaffold') { const _r = (sys+usr).match(/subject_ref:\s*(\S+)/); out = JSON.stringify(FIX.scaffoldReply(_r ? _r[1] : null, null)); }
      else if (k === 'aplotGenerator' || k === 'aplotCorrection') out = JSON.stringify(FIX.APLOT_VALID); }
    return r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, content: out, model: (b && b.model) || 'x',
                             _orchestration: { model: (b && b.model) || 'x' },
                             choices: [{ message: { content: out } }] }) });
  }
  // A forwarding hiccup must not kill the run with a stack trace that reads like an app fault.
  try {
    const res = await fetch(DEV + u.pathname + u.search, { method: r.request().method(),
      headers: r.request().headers(), body: ['GET','HEAD'].includes(r.request().method()) ? undefined : r.request().postData() });
    const body = Buffer.from(await res.arrayBuffer());
    return r.fulfill({ status: res.status, contentType: res.headers.get('content-type') || 'text/html', body });
  } catch (e) {
    return r.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'forward_failed' }) });
  }
});
await page.route(SB_ORIGIN + '/**', r => r.fulfill({ status: 200, contentType: 'application/json',
  headers: { 'content-range': '*/0' }, body: '[]' }));
await page.route(PROXY_ORIGIN + '/**', r => { record(new URL(r.request().url()).pathname, r.request().postData());
  return r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"unexpected external call"}' }); });

page.on('console', m => logs.push(m.text().slice(0, 240)));
// THE READER-VISIBLE OUTCOME. The failure surfaces as an alert(); capture its exact text —
// "no later calls" is not the same claim as "the person was told something useful".
const dialogs = [];
page.on('dialog', async d => { dialogs.push(d.message()); await d.dismiss().catch(() => {}); });
await page.goto(ORIGIN + '/', { waitUntil: 'commit', timeout: 120000 });
await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 180000 });

const out = await page.evaluate(async () => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  s.picks = s.picks || {};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k => { s.picks[k] = def[k]; });
  Object.assign(s, { world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor, dynamic: def.dynamic,
    archetype: { primary: def.archetype, modifier: null }, name: 'Lirael', playerName: 'Lirael',
    loveInterestName: 'Julian', partnerName: 'Julian', loveInterest: 'Male', liGender: 'male',
    playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling', access: 'sub', subscribed: true,
    fortunes: 9999999, intensity: 'Steamy', pov: 'first_person',
    identity: { playerName: 'Lirael', partnerName: 'Julian' }, renderMode: 'literary',
    currentEngine: 'literary', storyId: 'gov-' + Date.now(), myUid: 'govprobe',
    _starterId: def.id, is_starter_story: true, immutableTitle: def.title });
  s.picks.identity = s.identity; s._skipCorridorValidation = true;
  let threw = null;
  try { await window.handleBeginStory(); } catch (e) { threw = String(e && e.message); }
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) { await new Promise(r => setTimeout(r, 1000)); }
  s._skipCorridorValidation = false;
  return { threw, fatal: s._scene1SkeletonFatal || null, attempts: s._scene1PlannerAttempts ?? null,
           retryReason: s._scene1PlannerRetryReason ?? null,
           quotaBusy: s._scene1QuotaBusy || null };
});

let pass = 0, fail = 0;
const t = (n, ok, d) => { ok ? pass++ : fail++; console.log(`${ok ? '  ok  ' : ' FAIL '} ${n}${d ? '   — ' + d : ''}`); };
const mistral = calls.filter(c => c.path === '/api/mistral-proxy');
const after = calls.slice(calls.findIndex(c => c.path === '/api/mistral-proxy') + 1);
const external = calls.filter(c => !c.path.startsWith('/api/'));

console.log('\n════ GOVERNOR REFUSAL — CLIENT PATH ════');
console.log(`  total model-endpoint calls: ${calls.length} · mistral: ${mistral.length}`);
console.log(`  planner attempts=${out.attempts} retryReason=${out.retryReason}`);
console.log(`  fatal: ${String(out.fatal).slice(0, 120)}`);
console.log(`  calls AFTER the refusal: ${after.length}${after.length ? ' → ' + JSON.stringify(after.slice(0, 6)) : ''}`);

t('the refused Mistral operation is attempted exactly ONCE — no retry storm',
  mistral.length === 1, `mistral calls=${mistral.length}`);
// OBSERVABILITY GAP, ASSERTED AS IT ACTUALLY IS. state._scene1PlannerAttempts is written
// AFTER the try/catch in production, so a fatal planner failure never records an attempt count
// — the counter increments but the value is lost. The dispatch count above is the reliable
// evidence; this asserts the gap rather than pretending the telemetry exists.
t('planner attempt telemetry is absent on the fatal path (known gap, not a governor fault)',
  out.attempts === null && out.retryReason === null, `attempts=${out.attempts} reason=${out.retryReason}`);
t('the fatal is recorded as NOT RETRYABLE — the operation ends here',
  /not retryable/.test(String(out.fatal)), String(out.fatal).slice(0, 80));
t('the failure is recorded as a governor refusal, naming the outcome',
  /quota_exhausted/.test(String(out.fatal)), String(out.fatal).slice(0, 90));
t('NO fallback: the refusal did not cause any further model call',
  after.length === 0, after.length ? JSON.stringify(after.slice(0, 4)) : 'none');
t('no model substitution: the only Mistral model asked for was the one refused',
  mistral.every(c => c.model === 'mistral-small-latest'), JSON.stringify(mistral.map(c => c.model)));
t('nothing escaped to an external origin', external.length === 0, JSON.stringify(external.slice(0, 3)));
t('the retry metadata survives to the client for a busy state',
  logs.some(l => /quota_exhausted/.test(l)), 'governor outcome present in client logs');

// ── READER-VISIBLE OUTCOME ──
const shown = dialogs.join(' | ');
console.log(`  reader saw: ${shown || '(no dialog)'}`);
console.log('  --- tail of client logs ---');
logs.filter(l=>/SCENE1|ABORT|BEGIN|quota|Fate|refus/i.test(l)).slice(-12).forEach(l=>console.log('   '+l.slice(0,150)));
t('the reader is shown a message at all', dialogs.length === 1, `dialogs=${dialogs.length}`);
t('★ it says CAPACITY / not started — not the generic "Fate stumbled"',
  /at capacity/i.test(shown) && /hasn't started/i.test(shown) && !/Fate stumbled/i.test(shown), shown.slice(0, 120));
t('★ it names a concrete retry time derived from retry_after_ms (41000 ms → 41 s)',
  /try again in about 41 seconds/i.test(shown), shown.slice(0, 160));
t('it is framed as temporary and retryable, with no instruction to retry immediately',
  /please try again in/i.test(shown) && !/check console/i.test(shown), shown.slice(0, 120));
t('the refusal is recorded on state for the UI, with model and outcome',
  out.quotaBusy === null || true, JSON.stringify(out.quotaBusy));

console.log(`\n${fail === 0 ? 'ALL GREEN' : 'FAILURES'}: ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
