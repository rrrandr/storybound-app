// SCENE-1 LENGTH RE-MEASURE (Roman 2026-07-24) — Phase 1: after relaxing the micro-fork paragraph-3
// deadline into a story-state WINDOW. N fresh Scene-1 gens (natural classifier), report word count
// + where the "Is this…?" micro-fork LANDS (%). Baseline was ~206w with the fork crammed early.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/s1len.json';
const N = parseInt(process.env.N || '3', 10);
const log = (...a) => console.error(...a);

async function setup(page) {
  await page.evaluate(() => {
    window.__scenes = [];
    window._auditSceneEmotionalGravity = function (pr) { try { if (typeof pr === 'string' && pr.length > 120) window.__scenes.push(pr); } catch (_) {} return Promise.resolve(null); };
    ['_auditBannedPhraseLeakage', '_classifyArchetypeManifestation', '_auditArchetypeManifestation', '_classifyLITexture', '_auditLITextureSources', '_auditSceneAgainstRPlot', '_auditUnavailabilityManifestation'].forEach(fn => { try { window[fn] = function () { return Promise.resolve(null); }; } catch (_) {} });
    // REAL COST TELEMETRY — capture token usage from every model-proxy response and price it with
    // the app's own TEXT_PRICING (app.js:4771). No more guessing $/scene.
    window.__cost = { calls: 0, usd: 0, tokIn: 0, tokOut: 0, byModel: {} };
    var PRICE = {
      'grok-4-1-fast-non-reasoning': { in: 0.0000002, out: 0.0000005, cr: 0.000000032 },
      'grok-4-1-fast-reasoning': { in: 0.0000005, out: 0.0000015, cr: 0.00000008 },
      'grok-4.3': { in: 0.00000125, out: 0.0000025, cr: 0.0000002 },
      'mistral-small-latest': { in: 1e-7, out: 3e-7, cr: 1e-7 },
      'gpt-4o': { in: 0.0000025, out: 0.00001, cr: 0.00000125 }
    };
    function _priceFor(m) { m = String(m || '').toLowerCase(); if (m.indexOf('mistral') >= 0) return PRICE['mistral-small-latest']; if (m.indexOf('gpt-4o') >= 0) return PRICE['gpt-4o']; if (m.indexOf('fast-reasoning') >= 0) return PRICE['grok-4-1-fast-reasoning']; if (m.indexOf('fast') >= 0 && m.indexOf('non') >= 0) return PRICE['grok-4-1-fast-non-reasoning']; return PRICE['grok-4.3']; }
    var _of = window.fetch;
    window.fetch = async function (url, opts) {
      var res = await _of.apply(this, arguments);
      try {
        var u = (typeof url === 'string' ? url : (url && url.url) || '');
        if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy|anthropic-proxy|chatgpt)/.test(u)) {
          res.clone().json().then(function (j) {
            try {
              var usage = (j && j.usage) || {};
              var model = (j && j.model) || (j && j._orchestration && j._orchestration.model) || '';
              var pt = usage.prompt_tokens || usage.input_tokens || 0, ct = usage.completion_tokens || usage.output_tokens || 0;
              var cached = (usage.prompt_tokens_details && usage.prompt_tokens_details.cached_tokens) || usage.cache_read_input_tokens || usage.cached_tokens || 0;
              if (pt || ct) {
                var p = _priceFor(model), fresh = Math.max(0, pt - cached);
                var cost = fresh * p.in + cached * (p.cr || p.in) + ct * p.out;
                window.__cost.calls++; window.__cost.usd += cost; window.__cost.tokIn += pt; window.__cost.tokOut += ct;
                var mk = model || 'unknown'; window.__cost.byModel[mk] = (window.__cost.byModel[mk] || 0) + cost;
              }
            } catch (_) {}
          }).catch(function () {});
        }
      } catch (_) {}
      return res;
    };
    const s = window.state; window._devBypass = true; window._forceAudits = true;
    window._forceHotOpener = false; window._isBillionaireOnboarding = function () { return false; };
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = 'billionaire'; s.world = 'billionaire'; s.picks.flavor = 'billionaire_modern'; s.worldSubtype = 'billionaire_modern'; s.flavor = 'billionaire_modern';
    s.picks.dynamic = 'enemies_to_lovers'; s.dynamic = 'enemies_to_lovers';
    s.loveInterest = 'Male'; s.loveInterestName = 'Dorian'; s.liGender = 'male';
    s.archetype = { primary: 'DARK_VICE', modifier: null, bound: false };
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy';
    s.name = 'Mara'; s.playerName = 'Mara'; s.partnerName = 'Dorian';
    s.identity = { playerName: 'Mara', partnerName: 'Dorian', displayPlayerName: 'Mara', displayPartnerName: 'Dorian' };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    try { var fk = window._flavorVarietyKey ? window._flavorVarietyKey(s) : null; var h = {}; if (fk) h[fk] = ['a', 'b', 'c']; h['billionairemodern'] = ['a', 'b', 'c']; localStorage.setItem('sb_flavor_history', JSON.stringify(h)); } catch (_) {}
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (let i = 0; i < N; i++) {
    const page = await (await browser.newContext()).newPage();
    for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images'])
      await page.route(pat, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked"}' }));
    let temp = '';
    page.on('console', c => { const t = c.text(); if (/OPENING:TEMP\]/i.test(t) && !temp) temp = t.slice(0, 90).replace(/\s+/g, ' '); });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100 && typeof window.handleBeginStory === 'function', { timeout: 40000 });
    await page.waitForTimeout(400);
    await setup(page);
    await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
    const t0 = Date.now(); let text = '';
    while (Date.now() - t0 < 300000) {
      await page.waitForTimeout(3000);
      const st = await page.evaluate(() => { const a = window.__scenes || [], s = window.state; return { n: a.length, busy: !!(s._isAdvancingScene || s._stagedSubmitting || s._stagedAwaitingProse), last: (a[a.length - 1] || '').length }; });
      if (st.n >= 1 && st.last > 200 && (!st.busy || (Date.now() - t0) > 70000)) { text = await page.evaluate(() => { const a = window.__scenes || []; return a[a.length - 1] || ''; }); break; }
    }
    const wcOf = (t) => (String(t || '').replace(/\[[A-Z_]+:[^\]]*\]/g, ' ').replace(/<<[^>]*>>/g, ' ').match(/\b[\w']+\b/g) || []).length;
    const wc = wcOf(text);
    // micro-fork question: "Is this X or Y?" OR the demand/hint style "Say it plainly — or let it show?"
    const mm = text.match(/Is this[^?]*\?/i) || text.match(/[A-Z][^.?!\n]{3,}(?:—|–|--)\s*or\s+[^?\n]*\?/) || text.match(/[A-Z][^.?!\n]{4,}\bor\b[^?\n]{4,}\?/);
    const forkPos = mm ? wcOf(text.slice(0, mm.index)) : -1;
    const forkPct = (forkPos >= 0 && wc) ? Math.round(100 * forkPos / wc) : -1;
    const cost = await page.evaluate(() => window.__cost || null);
    results.push({ sample: i + 1, words: wc, forkPos, forkPct, temp, cost });
    log('Sample ' + (i + 1) + ': words=' + wc + ' · forkAt=' + (forkPos >= 0 ? forkPos + 'w (' + forkPct + '%)' : 'none') + ' · $' + (cost ? cost.usd.toFixed(4) : '?') + ' (' + (cost ? cost.calls : 0) + ' calls) · ' + temp);
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  const ws = results.filter(r => r.words > 0).map(r => r.words);
  log('\n═══ Scene 1 length after micro-fork WINDOW change (baseline ~206w, fork crammed early) ═══');
  log('  words: ' + ws.join(' / ') + '  · avg=' + (ws.length ? Math.round(ws.reduce((a, b) => a + b, 0) / ws.length) : 0));
  log('  fork position: ' + results.map(r => r.forkPct >= 0 ? r.forkPct + '%' : '—').join(' / ') + '  (was crammed into the first ~30%)');
  // REAL COST
  const totalCost = results.reduce((a, r) => a + ((r.cost && r.cost.usd) || 0), 0);
  const totalCalls = results.reduce((a, r) => a + ((r.cost && r.cost.calls) || 0), 0);
  const byModel = {}; results.forEach(r => { if (r.cost && r.cost.byModel) Object.keys(r.cost.byModel).forEach(m => byModel[m] = (byModel[m] || 0) + r.cost.byModel[m]); });
  log('\n═══ REAL COST (from token usage × app TEXT_PRICING) ═══');
  log('  $' + totalCost.toFixed(4) + ' total · $' + (results.length ? (totalCost / results.length).toFixed(4) : '0') + '/scene · ' + totalCalls + ' model calls across ' + results.length + ' scenes');
  Object.keys(byModel).sort((a, b) => byModel[b] - byModel[a]).forEach(m => log('    ' + m + ': $' + byModel[m].toFixed(4)));
})().catch(e => { console.error('S1LEN-ERR', e.message); process.exit(1); });
