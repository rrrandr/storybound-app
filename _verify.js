// EDITORIAL-PASS VERIFICATION — one literary Scene 1 with window._editorialPass = true (Roman 2026-08-05).
// Capture: the [EDITORIAL-PASS] log (rejected/chosen/imply), the generated scene, the exact author system prompt
// (to confirm the plan was front-loaded). Judge ONLY: did the concrete plan materially improve the OPENING
// decision where applied? Same Fatelands FF seed as the earlier baseline capture (A_baseline opened on
// "crowd's eyes... panic surges as I realize everyone is witnessing my weakness"). One gen, then stop.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';
fs.mkdirSync(OUT, { recursive: true });
const SEED = { world: 'Fantasy', flavor: 'first_favored', archetype: 'SPELLBINDER', dynamic: 'forbidden', li: 'Kael', pc: 'Sera' };

async function setup(page, seed) {
  await page.evaluate((seed) => {
    window.__scenes = [];
    window._auditSceneEmotionalGravity = function (pr) { try { if (typeof pr === 'string' && pr.length > 120) window.__scenes.push(pr); } catch (_) {} return Promise.resolve(null); };
    ['_auditBannedPhraseLeakage', '_classifyArchetypeManifestation', '_auditArchetypeManifestation', '_classifyLITexture', '_auditLITextureSources', '_auditSceneAgainstRPlot', '_auditUnavailabilityManifestation'].forEach(function (fn) { try { window[fn] = function () { return Promise.resolve(null); }; } catch (_) {} });
    window._editorialPass = true;                    // ← THE FLAG UNDER TEST
    window.__authorSys = null; window.__authorUser = null;
    var _of = window.fetch;
    window.fetch = async function (url, opts) {
      var u = (typeof url === 'string' ? url : (url && url.url) || '');
      if (/\/api\/proxy/.test(u) && opts && opts.body && !window.__authorSys) {
        try { var b = JSON.parse(opts.body); if (b.role === 'NARRATIVE_AUTHOR') { var sysM = (b.messages || []).filter(function (m) { return m.role === 'system'; })[0]; var sc = sysM && typeof sysM.content === 'string' ? sysM.content : ''; if (sc.replace(/^\s+/, '').indexOf('═══ STORYBOUND ARCHITECTURE LAWS') === 0) { window.__authorSys = sc; var usrM = (b.messages || []).filter(function (m) { return m.role === 'user'; }).pop(); window.__authorUser = usrM && typeof usrM.content === 'string' ? usrM.content : ''; } } } catch (_) {}
      }
      return _of.apply(this, arguments);   // record only — never stub; let the real gen run
    };
    var s = window.state; window._devBypass = true; window._forceAudits = false; window._forceHotOpener = false; window._isBillionaireOnboarding = function () { return false; };
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = seed.world; s.world = seed.world; s.picks.flavor = seed.flavor; s.worldSubtype = seed.flavor; s.flavor = seed.flavor;
    s.picks.dynamic = seed.dynamic; s.dynamic = seed.dynamic;
    s.loveInterest = 'Male'; s.loveInterestName = seed.li; s.liGender = 'male';
    s.archetype = { primary: seed.archetype, modifier: null, bound: false };
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy';
    s.name = seed.pc; s.playerName = seed.pc; s.partnerName = seed.li;
    s.identity = { playerName: seed.pc, partnerName: seed.li, displayPlayerName: seed.pc, displayPartnerName: seed.li };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    try { localStorage.setItem('sb_witnessed_fatelands_wish_ritual', '1'); } catch (_) {}
  }, seed);
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const edLogs = [];
  page.on('console', m => { const t = m.text(); if (/EDITORIAL-PASS|HOTFAST:ENABLED|LITLITE|litLite|CONTRACT:COND/.test(t)) { edLogs.push(t); console.error('  » ' + t.replace(/\n/g, '\n    ')); } });
  for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images']) await page.route(pat, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked"}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100 && typeof window.handleBeginStory === 'function', { timeout: 40000 });
  await page.waitForTimeout(400);
  await setup(page, SEED);
  await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
  const t0 = Date.now(); let prose = '';
  while (Date.now() - t0 < 320000) {
    await page.waitForTimeout(3000);
    const st = await page.evaluate(() => { const a = window.__scenes || [], s = window.state; return { n: a.length, busy: !!(s._isAdvancingScene || s._stagedSubmitting || s._stagedAwaitingProse), last: (a[a.length - 1] || '').length }; });
    if (st.n >= 1 && st.last > 200 && (!st.busy || (Date.now() - t0) > 100000)) { prose = await page.evaluate(() => { const a = window.__scenes || []; return a[a.length - 1] || ''; }); break; }
  }
  const authorSys = await page.evaluate(() => window.__authorSys || '');
  const authorUser = await page.evaluate(() => window.__authorUser || '');
  fs.writeFileSync(OUT + '/scene.txt', prose || '(no prose)');
  fs.writeFileSync(OUT + '/author_sys.txt', authorSys || '(not captured)');
  fs.writeFileSync(OUT + '/author_user.txt', authorUser || '(not captured)');
  fs.writeFileSync(OUT + '/editorial_log.txt', edLogs.join('\n'));
  // the editorial block is prepended to the author USER message (app.js ~246454), NOT the system message
  const bi = authorUser.indexOf('THIS SCENE\'S OPENING');
  const block = bi >= 0 ? authorUser.slice(bi - 4, authorUser.indexOf('════════════════════', bi) + 20) : '(EDITORIAL BLOCK NOT FOUND IN AUTHOR USER MESSAGE)';
  console.error('\n════════ EDITORIAL BLOCK IN AUTHOR PROMPT ════════\n' + block);
  console.error('\n════════ GENERATED SCENE (first 1200c) ════════\n' + (prose || '(none)').replace(/\[CHARACTERS[^\]]*\]|\[TITLE[^\]]*\]|\[SYNOPSIS[^\]]*\]/g, '').trim().slice(0, 1200));
  console.error('\nDONE verify — prose=' + (prose || '').length + 'c, authorSys=' + authorSys.length + 'c, edLogs=' + edLogs.length);
  await browser.close(); process.exit(0);
})().catch(e => { console.error('VERIFY-ERR', e.message); process.exit(1); });
