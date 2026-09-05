// TIER 2 — RENDERER-SWAP DIAGNOSTIC (Roman 2026-07-24). ONE question: does Scene-1 ~450w
// compression come from GROK specifically, or from the prompt/pipeline? Method: let the app
// generate a NATURAL Scene 1 (fixed billionaire world, the app's OWN planner output) via the REAL
// production Grok author path — that render IS the Grok baseline. RECORD (don't stub) the exact
// Scene-1 author prompt, then REPLAY that identical prompt to GPT-4o and Mistral-Small. Same world,
// same planner, same prompt — swap only the author. Compare word count (DIAGNOSTIC) + blind 1-5
// scorecard (OVERALL = the target). NO golden-IR injection (it gets overwhelmed by the world bible).
//   node _renderer_probe.js         → 3 natural cases × {prod-Grok, GPT-4o, Mistral}
//   SMOKE=1 node _renderer_probe.js → 1 case × {prod-Grok, GPT-4o}
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/renderer_probe.json';
const SMOKE = process.env.SMOKE === '1';
const N = SMOKE ? 1 : 3;
const REPLAY = (SMOKE ? ['gpt-4o'] : ['gpt-4o', 'mistral']).map(k => ({
  'gpt-4o':{ key: 'gpt-4o',  url: '/api/chatgpt-proxy', mk: (m) => ({ messages: m, model: 'gpt-4o', temperature: 0.7, max_tokens: 2400 }) },
  mistral: { key: 'mistral', url: '/api/mistral-proxy', mk: (m) => ({ messages: m, model: 'mistral-small-latest', temperature: 0.7, max_tokens: 2400 }) }
}[k]));
const log = (...a) => console.error(...a);
const JUDGE_SYS = 'You are a story-structure analyst. Read this Scene 1 opening. (1) Did the SITUATION materially TRANSFORM between the first line and the last (a new observable fact became true, changing the protagonist\'s options) — or did nothing change (only atmosphere/interiority)? (2) Score 1-5 (5=best): hook, pacing (developed vs rushed), character (feels like a real person), emotional_progression (state genuinely changes), dialogue (natural vs exposition), continuity (flows without jumps), overall (the one you\'d most want to publish). Return ONLY JSON: {"transformation":"yes"|"no","hook":n,"pacing":n,"character":n,"emotional_progression":n,"dialogue":n,"continuity":n,"overall":n,"note":"one sentence"}';

function measure(raw) {
  let clean = String(raw || '').replace(/\[[A-Z_]+:[^\]]*\]/g, ' ').replace(/<<[^>]*>>/g, ' ').replace(/\s+/g, ' ').trim();
  return { prose: clean, words: (clean.match(/\b[\w']+\b/g) || []).length };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const out = [];
  for (let i = 0; i < N; i++) {
    const page = await (await browser.newContext()).newPage();
    for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images'])
      await page.route(pat, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked"}' }));
    const scLogs = [];
    page.on('console', c => { const t = c.text(); if (/STATE_CHANGE:MARKER|SCENE1:PROMPT-SIZES|OPENING:TEMP\]/i.test(t)) scLogs.push(t.slice(0, 200)); });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100 && typeof window.handleBeginStory === 'function', { timeout: 40000 });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      window.__scenes = []; window.__capturedPrompt = null;
      window._auditSceneEmotionalGravity = function (pr) { try { if (typeof pr === 'string' && pr.length > 120) window.__scenes.push(pr); } catch (_) {} return Promise.resolve(null); };
      ['_auditBannedPhraseLeakage', '_classifyArchetypeManifestation', '_auditArchetypeManifestation', '_classifyLITexture', '_auditLITextureSources', '_auditSceneAgainstRPlot', '_auditUnavailabilityManifestation'].forEach(fn => { try { window[fn] = function () { return Promise.resolve(null); }; } catch (_) {} });
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
      // Defeat onboarding at its data source so the classifier rolls naturally.
      try { var fk = window._flavorVarietyKey ? window._flavorVarietyKey(s) : null; var h = {}; if (fk) h[fk] = ['a', 'b', 'c']; h['billionairemodern'] = ['a', 'b', 'c']; localStorage.setItem('sb_flavor_history', JSON.stringify(h)); } catch (_) {}
      // RECORD (do not stub) the Scene-1 author prompt so we can replay it to other models.
      const _f = window.fetch;
      window.fetch = async function (url, opts) {
        try {
          if (opts && typeof opts.body === 'string' && opts.body.indexOf('Write Scene 1 of this story') !== -1 && !window.__capturedPrompt) {
            const b = JSON.parse(opts.body);
            if (Array.isArray(b.messages)) window.__capturedPrompt = { system: String((b.messages.find(m => m.role === 'system') || {}).content || ''), user: String((b.messages.find(m => m.role === 'user') || {}).content || '') };
          }
        } catch (_) {}
        return _f.apply(this, arguments);      // pass through → production Grok renders for real
      };
    });
    await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
    // wait for the production Grok scene + captured prompt
    const t0 = Date.now(); let st = null;
    while (Date.now() - t0 < 300000) {
      await page.waitForTimeout(3000);
      st = await page.evaluate(() => { const a = window.__scenes || [], s = window.state; return { n: a.length, busy: !!(s._isAdvancingScene || s._stagedSubmitting || s._stagedAwaitingProse), last: (a[a.length - 1] || '').length, cap: !!window.__capturedPrompt }; });
      if (st.n >= 1 && st.last > 200 && st.cap && (!st.busy || (Date.now() - t0) > 60000)) break;
    }
    const data = await page.evaluate(() => ({ scene: (window.__scenes || []).slice(-1)[0] || '', cap: window.__capturedPrompt, goal: (window.state.aPlot && window.state.aPlot.goal) || '', temp: window.state._openingTemperature || '' }));
    if (!data.cap || !data.scene) { log('[case ' + (i + 1) + '] ✗ ' + (!data.cap ? 'no prompt captured' : 'no scene') + ' — skipping'); out.push({ case: i + 1, error: !data.cap ? 'no-capture' : 'no-scene', scLogs }); await page.close(); continue; }
    const promptChars = data.cap.system.length + data.cap.user.length;
    log('[case ' + (i + 1) + '] temp=' + data.temp + ' promptChars=' + promptChars + ' · goal="' + data.goal.slice(0, 50) + '"');

    const renders = [{ model: 'grok(prod)', ...measure(data.scene) }];
    for (const m of REPLAY) {
      const raw = await page.evaluate(async (args) => {
        try { const r = await fetch(args.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args.body) }); const j = await r.json(); return (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || (typeof j.content === 'string' ? j.content : (Array.isArray(j.content) && j.content[0] && j.content[0].text) || '') || ('[HTTP ' + r.status + ']'); } catch (e) { return '[ERR ' + String((e && e.message) || e) + ']'; }
      }, { url: m.url, body: m.mk([{ role: 'system', content: data.cap.system }, { role: 'user', content: data.cap.user }]) });
      renders.push({ model: m.key, ...measure(raw) });
    }
    // blind judge each render
    for (const r of renders) {
      if (r.words > 150) {
        r.judge = await page.evaluate(async (payload) => { try { const rr = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const j = await rr.json(); const c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''; let o = null; try { o = JSON.parse(String(c).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()); } catch (_) {} return o || { raw: String(c).slice(0, 150) }; } catch (e) { return { error: String(e.message) }; } }, { messages: [{ role: 'system', content: JUDGE_SYS }, { role: 'user', content: r.prose.slice(0, 6000) }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0, max_tokens: 300 });
      }
      const j = r.judge || {};
      log('    ' + r.model.padEnd(11) + ' words=' + String(r.words).padEnd(5) + ' T=' + (j.transformation === 'yes' ? 'Y' : 'N') + ' hook=' + (j.hook || '?') + ' pace=' + (j.pacing || '?') + ' char=' + (j.character || '?') + ' emo=' + (j.emotional_progression || '?') + ' dlg=' + (j.dialogue || '?') + ' cont=' + (j.continuity || '?') + ' OVERALL=' + (j.overall || '?'));
    }
    out.push({ case: i + 1, temp: data.temp, goal: data.goal, promptChars, renders, scLogs });
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

  // ── per-model aggregate (the compression answer) ──
  const agg = {};
  for (const row of out) { if (!row.renders) continue; for (const r of row.renders) { const j = r.judge || {}; if (!agg[r.model]) agg[r.model] = { words: [], overall: [], transformed: 0, n: 0 }; agg[r.model].words.push(r.words); if (j.overall) agg[r.model].overall.push(j.overall); if (j.transformation === 'yes') agg[r.model].transformed++; agg[r.model].n++; } }
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  log('\n═══════════════ RENDERER-SWAP RESULT (' + out.filter(o => o.renders).length + ' cases, identical prompt per case) ═══════════════');
  Object.keys(agg).forEach(m => log('  ' + m.padEnd(11) + ' avgWords=' + Math.round(avg(agg[m].words)) + ' (' + agg[m].words.join('/') + ')  avgOverall=' + avg(agg[m].overall).toFixed(1) + '  transformed=' + agg[m].transformed + '/' + agg[m].n));
  log('\nREAD: if GPT-4o/Mistral write SUBSTANTIALLY more from the IDENTICAL prompt → compression is Grok-specific. If all ~similar → prompt/pipeline allocation issue. Word count is diagnostic; OVERALL is the quality target.  → ' + OUT);
})().catch(e => { console.error('RENDERER-PROBE-ERR', e.message); process.exit(1); });
