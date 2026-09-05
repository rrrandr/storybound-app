// PER-PASS COST PROBE (Roman 2026-07-24) — the "measure before you migrate" table for the
// Mistral-rerouting decision. Wraps every model-proxy call, captures {role, model, sys-head,
// prompt/completion tokens, cost, latency}, groups by PASS, prints a table sorted by cost, and
// reports how many passes make up 80% of spend. Runs ONE production Fatelands Scene 1 with
// _forceAudits OFF (real production pass-set, not the inflated forced-audit path).
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/passcost.json';
const log = (...a) => console.error(...a);

async function setup(page) {
  await page.evaluate(() => {
    window.__scenes = [];
    window._auditSceneEmotionalGravity = function (pr) { try { if (typeof pr === 'string' && pr.length > 120) window.__scenes.push(pr); } catch (_) {} return Promise.resolve(null); };
    window.__passes = {};
    var PRICE = {
      'grok-4-1-fast-non-reasoning': { in: 2e-7, out: 5e-7, cr: 3.2e-8 },
      'grok-4-1-fast-reasoning':     { in: 5e-7, out: 1.5e-6, cr: 8e-8 },
      'grok-4.3':                    { in: 1.25e-6, out: 2.5e-6, cr: 2e-7 },
      'mistral-small-latest':        { in: 1e-7, out: 3e-7, cr: 1e-7 },
      'gpt-4o':                      { in: 2.5e-6, out: 1e-5, cr: 1.25e-6 },
      'gpt-4o-mini':                 { in: 1.5e-7, out: 6e-7, cr: 7.5e-8 }
    };
    function priceFor(m) { m = String(m || '').toLowerCase(); if (m.indexOf('mini') >= 0) return PRICE['gpt-4o-mini']; if (m.indexOf('mistral') >= 0) return PRICE['mistral-small-latest']; if (m.indexOf('gpt-4o') >= 0) return PRICE['gpt-4o']; if (m.indexOf('fast-reasoning') >= 0) return PRICE['grok-4-1-fast-reasoning']; if (m.indexOf('fast') >= 0) return PRICE['grok-4-1-fast-non-reasoning']; return PRICE['grok-4.3']; }
    var _of = window.fetch;
    window.fetch = async function (url, opts) {
      var u = (typeof url === 'string' ? url : (url && url.url) || '');
      var isProxy = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|anthropic-proxy|chatgpt)/.test(u);
      var role = '', sysHead = '';
      if (isProxy && opts && opts.body) {
        try {
          var b = JSON.parse(opts.body); role = b.role || (b.model || '');
          var msgs = b.messages || []; var sysM = msgs.filter(function (m) { return m.role === 'system'; })[0] || msgs[0] || {};
          var c = sysM.content; if (Array.isArray(c)) c = c.map(function (x) { return x.text || ''; }).join(' ');
          sysHead = String(c || '').replace(/\s+/g, ' ').trim().slice(0, 70);
        } catch (_) {}
      }
      var t0 = Date.now();
      var res = await _of.apply(this, arguments);
      var lat = Date.now() - t0;
      if (isProxy) {
        res.clone().json().then(function (j) {
          try {
            var usage = (j && j.usage) || {};
            var model = (j && j.model) || (j && j._orchestration && j._orchestration.model) || '';
            var pt = usage.prompt_tokens || usage.input_tokens || 0, ct = usage.completion_tokens || usage.output_tokens || 0;
            var cached = (usage.prompt_tokens_details && usage.prompt_tokens_details.cached_tokens) || usage.cache_read_input_tokens || usage.cached_tokens || 0;
            var p = priceFor(model), fresh = Math.max(0, pt - cached);
            var cost = fresh * p.in + cached * (p.cr || p.in) + ct * p.out;
            var key = (role || '?') + ' | ' + (sysHead || '(no-sys)');
            var e = window.__passes[key] || (window.__passes[key] = { role: role, sysHead: sysHead, model: model, count: 0, promptTok: 0, complTok: 0, cost: 0, latMs: 0 });
            e.count++; e.promptTok += pt; e.complTok += ct; e.cost += cost; e.latMs += lat; e.model = model;
          } catch (_) {}
        }).catch(function () {});
      }
      return res;
    };
    var s = window.state; window._devBypass = true; window._forceAudits = false;  // PRODUCTION pass-set
    window._forceHotOpener = false; window._isBillionaireOnboarding = function () { return false; };
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = 'Fantasy'; s.world = 'Fantasy'; s.picks.flavor = 'the_inhuman'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman';
    s.picks.dynamic = 'enemies_to_lovers'; s.dynamic = 'enemies_to_lovers';
    s.loveInterest = 'Male'; s.loveInterestName = 'Dorian'; s.liGender = 'male';
    s.archetype = { primary: 'DARK_VICE', modifier: null, bound: false };
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy';
    s.name = 'Mara'; s.playerName = 'Mara'; s.partnerName = 'Dorian';
    s.identity = { playerName: 'Mara', partnerName: 'Dorian', displayPlayerName: 'Mara', displayPartnerName: 'Dorian' };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    try { var fk = window._flavorVarietyKey ? window._flavorVarietyKey(s) : null; var h = {}; if (fk) h[fk] = ['a', 'b', 'c']; localStorage.setItem('sb_flavor_history', JSON.stringify(h)); } catch (_) {}
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images'])
    await page.route(pat, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked"}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100 && typeof window.handleBeginStory === 'function', { timeout: 40000 });
  await page.waitForTimeout(400);
  await setup(page);
  await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
  const t0 = Date.now();
  while (Date.now() - t0 < 300000) {
    await page.waitForTimeout(3000);
    const st = await page.evaluate(() => { const a = window.__scenes || [], s = window.state; return { n: a.length, busy: !!(s._isAdvancingScene || s._stagedSubmitting || s._stagedAwaitingProse), last: (a[a.length - 1] || '').length }; });
    if (st.n >= 1 && st.last > 200 && (!st.busy || (Date.now() - t0) > 80000)) break;
  }
  await page.waitForTimeout(2500);  // let trailing audits settle into the ledger
  const passes = await page.evaluate(() => window.__passes || {});
  const rows = Object.keys(passes).map(k => Object.assign({ key: k }, passes[k]));
  rows.sort((a, b) => b.cost - a.cost);
  const total = rows.reduce((a, r) => a + r.cost, 0) || 1e-9;
  const totalCalls = rows.reduce((a, r) => a + r.count, 0);
  log('\n═══ PER-PASS COST — production audits OFF, Fatelands Scene 1 ═══');
  log('  total: $' + total.toFixed(4) + ' · ' + totalCalls + ' model calls · ' + rows.length + ' distinct passes\n');
  log('   COST    %   CALLS  MODEL         in/out tok    avg-ms  PASS (role | sys-head)');
  rows.forEach(r => log('  $' + r.cost.toFixed(4) + ' ' + String(Math.round(100 * r.cost / total)).padStart(3) + '% ' + String(r.count).padStart(4) + '   ' + String(r.model || '?').slice(0, 12).padEnd(12) + '  ' + String(r.promptTok + '/' + r.complTok).padEnd(12) + '  ' + String(Math.round(r.latMs / r.count)).padStart(6) + '  ' + r.role + ' | ' + r.sysHead));
  let cum = 0, n80 = 0; for (const r of rows) { cum += r.cost; n80++; if (cum >= 0.8 * total) break; }
  // by model
  const byModel = {}; rows.forEach(r => { const m = r.model || '?'; byModel[m] = (byModel[m] || 0) + r.cost; });
  log('\n  by model: ' + Object.keys(byModel).sort((a, b) => byModel[b] - byModel[a]).map(m => m + ' $' + byModel[m].toFixed(4)).join(' · '));
  log('  → ' + n80 + ' of ' + rows.length + ' passes make up 80% of spend');
  log('  → prose words: ' + (await page.evaluate(() => { const a = window.__scenes || []; const t = a[a.length - 1] || ''; return (t.replace(/\[[A-Z_]+:[^\]]*\]/g, ' ').match(/\b[\w']+\b/g) || []).length; })));
  fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
  await browser.close();
})().catch(e => { console.error('PASSCOST-ERR', e.message); process.exit(1); });
