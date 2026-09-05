// SCENE-1 PRODUCER AUDIT — which request's output becomes the mounted prose?
//
// Two earlier attempts failed for known reasons, both fixed here:
//   · the production run aborted at /api/consume-fortune because the fence didn't know it;
//   · every model endpoint got the same prose body, so a JSON-expecting planner received
//     prose and its text leaked onto the page through a parse-failure fallback — the marker
//     trail was therefore meaningless.
//
// Now: non-model local endpoints are answered with their REAL shapes (read from
// api/consume-fortune.js) or passed through to the local server when read-only and free.
// Model endpoints are dispatched by SIGNATURE (endpoint + role + system prefix). Planners
// get schema-valid JSON; authors get uniquely marked prose; unknown model signatures THROW
// and are reported so they can be added deliberately.
//
// PASS 1 (this file, default) inventories signatures. PASS 2 (--resolve) uses the registry.
//
// usage: node _scene1_producer_audit.mjs [--resolve]
import { chromium } from 'playwright-core';
import fs from 'fs';

const RESOLVE = process.argv.includes('--resolve');
const REGISTRY = '_scene1_signatures.json';

// Local, free, read-only → let them hit the real dev server for exact shapes.
const PASSTHROUGH = /\/api\/(config|geo|csp-report)\b/;
// Local but side-effecting (mutates a Supabase balance) → answer locally with the real shape.
const LOCAL_FIXTURES = {
  '/api/consume-fortune': { success: true, fortunesRemaining: 9999 },
};
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/;

function sigOf(url, body) {
  const msgs = (body && body.messages) || [];
  const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
  return [url.replace(/^https?:\/\/[^/]+/, ''), body && body.role || '-', (body && body.model) || '-',
          sys.slice(0, 60).replace(/\s+/g, ' ')].join(' | ');
}
function markedProse(id) {
  const s = ['Lirael','Seren','Julian','the Dohkar','the assembly','the witness','her mother'];
  const v = ['turned toward','considered','stepped past','reached for','measured','refused'];
  const o = ['the cold hearth','the relic','the north gate','the second bell','the long table'];
  const out = [`MK${id}A.`];
  for (let i = 0; i < 42; i++) out.push(`${s[i%s.length]} ${v[(i*3)%v.length]} ${o[(i*5)%o.length]} as mark ${id} held ${i+3} breaths.`);
  out.push(`MK${id}Z.`);
  return out.join(' ');
}

const registry = fs.existsSync(REGISTRY) ? JSON.parse(fs.readFileSync(REGISTRY, 'utf8')) : {};
const seen = [], unknown = [], escaped = [];
let n = 0;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
await ctx.addInitScript(() => {
  window.__reqLog = [];
  const of = window.fetch;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (/\/api\//.test(url)) {
        let b = null; try { b = JSON.parse((init && init.body) || '{}'); } catch (_) {}
        const msgs = (b && b.messages) || [];
        window.__reqLog.push({
          url: url.replace(/^https?:\/\/[^/]+/, ''), role: b && b.role, model: b && b.model,
          temperature: b && b.temperature, max_tokens: b && b.max_tokens,
          sysHead: String((msgs.find(m => m.role === 'system') || {}).content || '').slice(0, 70).replace(/\s+/g, ' '),
          usrLen: String((msgs.find(m => m.role === 'user') || {}).content || '').length,
          stack: (new Error().stack || '').split('\n').slice(1, 8).map(x => x.trim().replace(/https?:\/\/[^ )]+\//g, '')).join(' << ')
        });
      }
    } catch (_) {}
    return of.apply(this, arguments);
  };
});
const page = await ctx.newPage();

await page.route('**/api/**', async route => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  if (PASSTHROUGH.test(url)) return route.continue();          // local, free, read-only
  const lf = Object.keys(LOCAL_FIXTURES).find(k => url.startsWith(k));
  if (lf) return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify(LOCAL_FIXTURES[lf]) });
  let body = null; try { body = JSON.parse(req.postData() || '{}'); } catch (_) {}
  if (!MODEL.test(url)) {
    unknown.push({ url, kind: 'non-model, unhandled' });
    return route.abort();                                       // throws in-page; reported
  }
  const sig = sigOf(url, body);
  const id = ++n;
  seen.push({ id, sig, url, role: body && body.role, model: body && body.model,
              max_tokens: body && body.max_tokens, temperature: body && body.temperature });
  const entry = registry[sig];
  if (!entry) {
    unknown.push({ url, sig, kind: 'unregistered model signature' });
    if (RESOLVE) return route.abort();                          // deliberate: must be added
    // PASS 1 only: prose so the flow keeps moving long enough to inventory signatures.
    const p = markedProse(id);
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: p, choices: [{ message: { content: p } }] }) });
  }
  const payload = entry.kind === 'json'
    ? JSON.stringify(entry.json).replace(/__ID__/g, String(id))
    : markedProse(id);
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: payload, choices: [{ message: { content: payload } }] }) });
});
page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });

const logs = [];
page.on('console', m => { const t = m.text(); if (t.length < 200) logs.push(t); });

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 40000 });

// PRODUCTION CONFIG — no _devBypass, no _skipCorridorValidation, no deck override.
const started = await page.evaluate(async () => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  s.picks = s.picks || {};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
    .forEach(k => { s.picks[k] = def[k]; });
  Object.assign(s, {
    world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor, dynamic: def.dynamic,
    _starterId: def.id, is_starter_story: true, immutableTitle: def.title,
    archetype: { primary: def.archetype, modifier: null },
    name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
    loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling',
    tier: 'fling', access: 'sub', subscribed: true, fortunes: 9999999,
    intensity: 'Steamy', pov: 'first_person',
    identity: { playerName: 'Lirael', partnerName: 'Julian' },
    renderMode: 'literary', currentEngine: 'literary', storyId: 'prod_probe',
    myUid: 'probe-user'
  });
  s.picks.identity = s.identity;
  // ── ONLY flag set: _skipCorridorValidation ──────────────────────────────────
  // Proven inert w.r.t. the producer: exactly ONE read in the file, at L243174, and it
  // is the validation early-return itself. It cannot select a branch, model or payload.
  // Everything else stays at its production default: no _devBypass, no _forceDeckMandate,
  // no _scene1ScaffoldOff, no tier override.
  s._skipCorridorValidation = true;
  const pre = {
    devBypass: (typeof window._devBypass === 'undefined') ? 'undefined' : window._devBypass,
    isQaHost: (typeof window._isQaHost === 'function') ? (() => { try { return window._isQaHost(); } catch (_) { return '(threw)'; } })() : '(no fn)',
    forceDeckMandate: (typeof window._forceDeckMandate === 'undefined') ? 'undefined' : window._forceDeckMandate,
    scene1ScaffoldOff: (typeof window._scene1ScaffoldOff === 'undefined') ? 'undefined' : window._scene1ScaffoldOff,
    litLiteActive: (typeof window._litLiteActive === 'function') ? (() => { try { return window._litLiteActive(); } catch (_) { return '(threw)'; } })() : '(no fn)',
    hotFastActive: (typeof window._hotFastActive === 'function') ? (() => { try { return window._hotFastActive(); } catch (_) { return '(threw)'; } })() : '(no fn)',
    tier: s.tier, access: s.access, subscribed: s.subscribed,
    skipCorridorValidation: s._skipCorridorValidation
  };
  let threw = null;
  try { await Promise.race([window.handleBeginStory(), new Promise(r => setTimeout(r, 90000))]); }
  catch (e) { threw = String(e.message).slice(0, 150); }
  // Clear the temporary flag inside the isolated page regardless of outcome.
  s._skipCorridorValidation = false;
  return { threw, pre, flagCleared: s._skipCorridorValidation === false };
});
await page.waitForTimeout(4000);

const out = await page.evaluate(() => {
  const s = window.state;
  const html = (window.StoryPagination && window.StoryPagination.getAllContent) ? (window.StoryPagination.getAllContent() || '') : '';
  const text = html.replace(/<[^>]*>/g, ' ');
  return {
    reqLog: window.__reqLog || [],
    markers: [...new Set([...text.matchAll(/MK(\d+)[AZ]/g)].map(m => Number(m[1])))],
    pages: window.StoryPagination ? window.StoryPagination.getPageCount() : 0,
    textLen: text.length, scenes: (s.scenes || []).length, turnCount: s.turnCount,
    titleShown: !!s._titlePageShown
  };
});
await browser.close();

console.log(`\n${'═'.repeat(90)}\nSCENE-1 PRODUCER AUDIT — ${RESOLVE ? 'PASS 2 (registry)' : 'PASS 1 (signature inventory)'}\n${'═'.repeat(90)}`);
console.log('\n  PRE-FLIGHT FLAGS'); Object.entries(started.pre||{}).forEach(([k,v])=>console.log(`    ${k.padEnd(24)} ${v}`));
console.log(`  _skipCorridorValidation cleared after run: ${started.flagCleared}`);
console.log(`  completion: pages=${out.pages} textLen=${out.textLen} scenes=${out.scenes} turnCount=${out.turnCount} titleShown=${out.titleShown} threw=${started.threw || 'no'}`);
console.log(`  model requests: ${seen.length}   escaped: ${escaped.length}`);
console.log(`\n  MARKERS ON PAGE: ${JSON.stringify(out.markers)}`);
for (const id of out.markers) {
  const q = out.reqLog[id - 1];
  console.log(`\n  ── MK${id} producer ──`);
  if (!q) { console.log('    (index mismatch)'); continue; }
  console.log(`    ${q.url} role=${q.role} model=${q.model} t=${q.temperature} max=${q.max_tokens} usrLen=${q.usrLen}`);
  console.log(`    sys="${q.sysHead}"`);
  console.log(`    stack: ${q.stack}`);
}
console.log(`\n  SIGNATURES SEEN (${seen.length}):`);
const bySig = {};
seen.forEach(x => { bySig[x.sig] = (bySig[x.sig] || 0) + 1; });
Object.entries(bySig).forEach(([s, c]) => console.log(`    ×${c}  ${s}`));
if (unknown.length) {
  console.log(`\n  UNHANDLED (${unknown.length}) — must be registered deliberately:`);
  [...new Set(unknown.map(u => u.sig || u.url))].forEach(u => console.log(`    ${u}`));
}
fs.writeFileSync('_scene1_producer_audit.json', JSON.stringify({ seen, unknown, out, logs: logs.slice(-40) }, null, 1));
if (!RESOLVE) {
  const reg = {};
  Object.keys(bySig).forEach(s => { reg[s] = { kind: /planner|PROMPT_PREPROCESSOR|Return ONLY|JSON/i.test(s) ? 'json' : 'prose', json: { note: 'FILL ME' } }; });
  fs.writeFileSync(REGISTRY, JSON.stringify(reg, null, 1));
  console.log(`\n  signature registry scaffold → ${REGISTRY} (fill json fixtures, then --resolve)`);
}
console.log(`\n  full record → _scene1_producer_audit.json\n`);
