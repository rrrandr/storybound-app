// _length_owner_trace.mjs — OWNERSHIP TRACE (Roman 2026-07-31): who terminates the prose author?
// Do NOT theorize. Instrument the REAL First Sacrifice Scene-1 generation: wrap fetch so every
// POST to a model proxy records (a) the request max_tokens / role / model actually sent, and
// (b) the response finish_reason + usage.completion_tokens + content word-count. Then a naive
// reader can see: did the author STOP voluntarily (finish_reason=stop, well under max_tokens) or
// was it CUT (finish_reason=length, completion≈max_tokens)? Grok forced primary. N small.
import fs from 'fs';
import { chromium } from 'playwright-core';
const URL = 'http://localhost:3000/';
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/author_ab';
const N = parseInt(process.argv[2] || '3', 10);
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
page.on('pageerror', e => log('  PAGEERR ' + (e && e.message)));

async function genOnce() {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._launchStarterStory === 'function', { timeout: 30000 });
  await page.evaluate(() => {
    const s = window.state; s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
    window.__forceHeavyBuild = true; window.__disableSpeculativePreload = true; window._forceDeckMandate = false; window.__disableSeedGrounding = false;
    window._smallAuthorEnabled = false; window._smallAuthorForceAll = false; // force Grok primary
    try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
    // ── fetch instrument: record every model-proxy call's request cap + response finish_reason ──
    window.__authorCalls = [];
    if (!window.__fetchWrapped) {
      const _f = window.fetch.bind(window);
      window.fetch = async function (url, opts) {
        const u = String(url || '');
        const isProxy = /\/api\/(proxy|chatgpt-proxy|mistral-proxy)\b/.test(u);
        let reqMax = null, reqRole = null, reqModel = null, sysLen = null;
        if (isProxy && opts && opts.body) {
          try { const b = JSON.parse(opts.body); reqMax = b.max_tokens != null ? b.max_tokens : null; reqRole = b.role || null; reqModel = b.preferredModel || b.model || null;
            const sys = (b.messages || []).find(m => m && m.role === 'system'); sysLen = sys ? String(sys.content || '').length : null; } catch (_) {}
        }
        const res = await _f(url, opts);
        if (isProxy) {
          try {
            const clone = res.clone(); const d = await clone.json();
            const ch = d && d.choices && d.choices[0];
            const fin = (ch && (ch.finish_reason || ch.finishReason)) || (d && (d.stop_reason || (d._orchestration && d._orchestration.stop_reason))) || null;
            const content = (ch && ch.message && ch.message.content) || (d && d.content) || '';
            const usage = (d && d.usage) || {};
            const words = String(content || '').split(/\s+/).filter(Boolean).length;
            window.__authorCalls.push({ role: reqRole, model: reqModel, served: (d && d.model) || (d && d._orchestration && d._orchestration.model) || null,
              reqMaxTokens: reqMax, finish: fin, completionTok: usage.completion_tokens || usage.output_tokens || null,
              promptTok: usage.prompt_tokens || usage.input_tokens || null, contentWords: words, contentChars: String(content || '').length, sysLen });
          } catch (_) {}
        }
        return res;
      };
      window.__fetchWrapped = true;
    }
    window.__capturedPages = []; window.__lastPageAt = 0;
    const SP = window.StoryPagination; if (SP && SP.addPage && !SP.__wrapped) { const r = SP.addPage.bind(SP); SP.addPage = function (h, n) { try { window.__capturedPages.push(String(h || '')); window.__lastPageAt = Date.now(); } catch (_) {} return r(h, n); }; SP.__wrapped = true; }
  });
  try { await page.evaluate(async () => { const def = (window.STARTER_STORIES || []).find(d => d.id === 'starter_first_sacrifice'); await Promise.race([window._launchStarterStory(def), new Promise((_, r) => setTimeout(() => r(new Error('to')), 300000))]); }); } catch (_) {}
  try { await page.waitForFunction(() => (window.__capturedPages || []).length >= 1 && (Date.now() - (window.__lastPageAt || 0)) > 9000 && !window.state._isAdvancingScene && !window.state.isPreloadingNextScene, { timeout: 150000, polling: 2000 }); } catch (_) {}
  return await page.evaluate(() => ({ calls: window.__authorCalls || [], proseWords: (window.__capturedPages || []).map(p => String(p).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length).reduce((a, b) => a + b, 0) }));
}

const all = [];
for (let i = 0; i < N; i++) {
  const r = await genOnce();
  // the prose-author call = the proxy call that returned the most words (the scene itself)
  const author = (r.calls || []).slice().sort((a, b) => (b.contentWords || 0) - (a.contentWords || 0))[0] || null;
  all.push({ i, proseWords: r.proseWords, author, nCalls: (r.calls || []).length, calls: r.calls });
  log(`[${i + 1}/${N}] scene=${r.proseWords}w | AUTHOR call: role=${author && author.role} model=${author && author.model} served=${author && author.served} max_tokens=${author && author.reqMaxTokens} finish=${author && author.finish} completion_tok=${author && author.completionTok} words=${author && author.contentWords}`);
}

log('\n════ OWNERSHIP TRACE (Grok primary, N=' + N + ') ════');
all.forEach(r => {
  const a = r.author || {};
  const cut = a.finish === 'length' || (a.reqMaxTokens && a.completionTok && a.completionTok >= a.reqMaxTokens - 20);
  log(`  run ${r.i}: max_tokens=${a.reqMaxTokens} completion=${a.completionTok} finish="${a.finish}" → ${cut ? 'CUT BY CAP (API/renderer owns length)' : 'VOLUNTARY STOP (prompt owns length)'}`);
});
fs.writeFileSync(`${OUT}/length_owner_trace.json`, JSON.stringify(all, null, 2));
log('\nsaved → ' + OUT + '/length_owner_trace.json');
await browser.close();
process.exit(0);
