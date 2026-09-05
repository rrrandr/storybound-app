// SCENE-1 PRODUCER IDENTIFICATION — which request's text actually reaches the page?
//
// Three independent signals say the lite/hotfast/heavy chain at ~254832 does NOT run:
// state.scenes stays 0, turnCount is never written, and no request carries its signature —
// yet Scene 1 mounts with prose. So some other call produces it. This finds which.
//
// Method: every model response carries a UNIQUE, long, non-deduplicating marker. After the
// run we read the rendered page and see which marker survived. Each request also records its
// JS stack, so the winning marker names its producer's call chain.
//
// The fetch wrapper is installed with addInitScript — BEFORE any app code runs.
//
// Two labelled cases: production config (no dev-diversion flags) and the previous harness
// config, to establish whether those flags changed the producer.
//
// usage: node _scene1_producer_probe.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';

const KNOWN = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini|image|bfl-kontext|replicate|fal|get-parent-images|save|load|vault|library|log|track|beta)/;

// Long, unique, non-repeating prose so [PROSE:DEDUP] cannot collapse it and the marker survives.
function proseFor(id) {
  const s = ['Lirael','Seren','Julian','the Dohkar','the assembly','the witness','her mother','the ash'];
  const v = ['turned toward','considered','stepped past','reached for','measured','refused','counted'];
  const o = ['the cold hearth','the relic','the north gate','the second bell','the long table','the open door'];
  const out = [`MARKER${id}BEGIN.`];
  for (let i = 0; i < 40; i++) {
    out.push(`${s[i % s.length]} ${v[(i * 3) % v.length]} ${o[(i * 5) % o.length]} while marker ${id} held at ${i + 3} breaths.`);
  }
  out.push(`MARKER${id}END.`);
  return out.join(' ');
}

async function run(label, applyDevFlags) {
  const reqs = [];
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  // Wrapper installed BEFORE app initialization: captures the stack of every model call.
  await ctx.addInitScript(() => {
    window.__reqLog = [];
    const of = window.fetch;
    window.fetch = function (input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (/\/api\//.test(url)) {
          let body = null;
          try { body = JSON.parse((init && init.body) || (input && input.body) || '{}'); } catch (_) {}
          const msgs = (body && body.messages) || [];
          const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
          const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');
          window.__reqLog.push({
            url: url.replace(/^https?:\/\/[^/]+/, ''),
            role: body && body.role, model: body && body.model,
            temperature: body && body.temperature, max_tokens: body && body.max_tokens,
            sysLen: sys.length, usrLen: usr.length,
            sysHead: sys.slice(0, 80), usrHead: usr.slice(0, 80),
            stack: (new Error().stack || '').split('\n').slice(1, 7).map(x => x.trim()).join(' << ')
          });
        }
      } catch (_) {}
      return of.apply(this, arguments);
    };
  });
  const page = await ctx.newPage();

  let n = 0;
  const served = [];
  await page.route('**/api/**', async route => {
    const u = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (!KNOWN.test(u)) { served.push({ u, id: null, unrecognised: true }); return route.abort(); }
    const id = ++n;
    served.push({ u, id });
    const body = proseFor(id);
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: body, choices: [{ message: { content: body } }] }) });
  });

  const logs = [];
  page.on('console', m => { const t = m.text(); if (t.length < 220) logs.push(t); });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 40000 });

  const flags = await page.evaluate(({ applyDevFlags }) => {
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
      tier: 'fling', access: 'sub', subscribed: true, fortunes: 9999999, previewActive: false,
      intensity: 'Steamy', pov: 'first_person',
      identity: { playerName: 'Lirael', partnerName: 'Julian' },
      renderMode: 'literary', currentEngine: 'literary', storyId: 'producer'
    });
    s.picks.identity = s.identity;
    if (applyDevFlags) {
      window._devBypass = true; s._skipCorridorValidation = true;
      s._pcLookSkipped = true; s.pcLookLocked = true; window._forceDeckMandate = false;
    }
    // Record the runtime value of every flag that can steer the producer.
    const f = k => { try { return typeof window[k] !== 'undefined' ? window[k] : '(unset)'; } catch (_) { return '(err)'; } };
    return {
      _devBypass: f('_devBypass'),
      _skipCorridorValidation: s._skipCorridorValidation === undefined ? '(unset)' : s._skipCorridorValidation,
      _forceDeckMandate: f('_forceDeckMandate'),
      litLiteActive: (typeof window._litLiteActive === 'function') ? (() => { try { return window._litLiteActive(); } catch (_) { return '(threw)'; } })() : '(no fn)',
      hotFastActive: (typeof window._hotFastActive === 'function') ? (() => { try { return window._hotFastActive(); } catch (_) { return '(threw)'; } })() : '(no fn)',
      renderMode: s.renderMode, currentEngine: s.currentEngine,
      is_starter_story: s.is_starter_story, starterId: s._starterId,
      cgScreenplayMode: f('_cgScreenplayMode'),
      parallelFast: f('_parallelScene1'), turnCount: s.turnCount
    };
  }, { applyDevFlags });

  let threw = null;
  try {
    await page.evaluate(async () => {
      await Promise.race([window.handleBeginStory(), new Promise(r => setTimeout(r, 70000))]);
    });
  } catch (e) { threw = String(e.message).slice(0, 160); }
  await page.waitForTimeout(3000);

  const out = await page.evaluate(() => {
    const s = window.state;
    const html = (window.StoryPagination && window.StoryPagination.getAllContent) ? (window.StoryPagination.getAllContent() || '') : '';
    const text = html.replace(/<[^>]*>/g, ' ');
    const found = [...text.matchAll(/MARKER(\d+)(BEGIN|END)/g)].map(m => Number(m[1]));
    return {
      reqLog: window.__reqLog || [],
      markersOnPage: [...new Set(found)],
      pages: window.StoryPagination ? window.StoryPagination.getPageCount() : 0,
      textLen: text.length,
      scenes: (s.scenes || []).length,
      turnCount: s.turnCount,
      fateReady: !!(document.querySelectorAll('.fate-card, [class*="fate"]').length),
      titleShown: !!s._titlePageShown
    };
  });
  await browser.close();
  return { label, flags, threw, served, ...out, logs };
}

function report(r) {
  console.log(`\n${'═'.repeat(88)}\nCASE: ${r.label}\n${'═'.repeat(88)}`);
  console.log('\n  FLAGS AT START');
  Object.entries(r.flags).forEach(([k, v]) => console.log(`    ${k.padEnd(26)} ${v}`));
  console.log('\n  COMPLETION');
  console.log(`    pages=${r.pages} textLen=${r.textLen} scenes=${r.scenes} turnCount=${r.turnCount}`
    + ` fateReady=${r.fateReady} titleShown=${r.titleShown} threw=${r.threw || 'no'}`);
  const unrec = r.served.filter(x => x.unrecognised);
  console.log(`    requests served=${r.served.length - unrec.length}  unrecognised(aborted)=${unrec.length}`
    + (unrec.length ? ' → ' + [...new Set(unrec.map(x => x.u))].join(', ') : ''));
  console.log(`\n  MARKERS ON THE RENDERED PAGE: ${JSON.stringify(r.markersOnPage)}`);
  if (!r.markersOnPage.length) { console.log('    ✗ no marker survived — the mounted prose came from no mocked response'); }
  for (const id of r.markersOnPage) {
    const req = r.reqLog[id - 1];
    console.log(`\n  ── PRODUCER of MARKER${id} ──`);
    if (!req) { console.log('    (no request record — index mismatch)'); continue; }
    console.log(`    ${req.url}  role=${req.role || '-'} model=${req.model || '-'} temp=${req.temperature} max_tokens=${req.max_tokens}`);
    console.log(`    sysLen=${req.sysLen} usrLen=${req.usrLen}`);
    console.log(`    sysHead="${req.sysHead}"`);
    console.log(`    usrHead="${req.usrHead}"`);
    console.log(`    stack: ${req.stack}`);
  }
  console.log(`\n  ALL MODEL REQUESTS (${r.reqLog.length}) — id: endpoint role model temp/max`);
  r.reqLog.forEach((q, i) => console.log(`    ${String(i + 1).padStart(2)}: ${q.url} ${q.role || '-'} ${q.model || '-'} t=${q.temperature} m=${q.max_tokens} sys=${q.sysLen} usr=${q.usrLen}`));
}

const prod = await run('PRODUCTION CONFIG — no dev-diversion flags', false);
report(prod);
const dev = await run('PREVIOUS HARNESS CONFIG — dev flags applied', true);
report(dev);

console.log(`\n${'═'.repeat(88)}\nCOMPARISON\n${'═'.repeat(88)}`);
console.log(`  production markers : ${JSON.stringify(prod.markersOnPage)}  requests=${prod.reqLog.length} pages=${prod.pages}`);
console.log(`  dev-flag  markers  : ${JSON.stringify(dev.markersOnPage)}  requests=${dev.reqLog.length} pages=${dev.pages}`);
const pStack = prod.markersOnPage.length ? (prod.reqLog[prod.markersOnPage[0] - 1] || {}).stack : null;
const dStack = dev.markersOnPage.length ? (dev.reqLog[dev.markersOnPage[0] - 1] || {}).stack : null;
console.log(`  same producer?     : ${pStack && dStack ? (pStack === dStack ? 'YES' : 'NO — dev flags changed the producer') : 'indeterminate'}`);
fs.writeFileSync('_scene1_producer_probe.json', JSON.stringify({ prod, dev }, null, 1));
console.log('\n  full record → _scene1_producer_probe.json\n');
