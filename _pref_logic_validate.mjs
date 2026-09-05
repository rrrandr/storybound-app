// FREE logic validation for the Preference Memory Resolver + Demand/Hint Scene-1 skip.
// Loads the real page (so app.js functions are defined/window-exposed) and drives the
// resolver functions with mocked state. NO story generation, NO API calls.
import { chromium } from 'playwright';

const results = [];
function check(name, cond, detail) { results.push({ name, ok: !!cond, detail: detail || '' }); }

const browser = await chromium.launch({ headless: true });
const page = await browser.newContext().then(c => c.newPage());
const logs = [];
page.on('console', m => { const t = m.text(); if (/\[PREF-/.test(t)) logs.push(t); });

try {
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  // let app.js finish wiring window exposes
  await page.waitForFunction(() => typeof window._getReaderPreference === 'function' && typeof window._scene1DemandHintSilentApply === 'function', { timeout: 15000 });

  const out = await page.evaluate(() => {
    const R = {};
    const s = window.state = window.state || {};
    // helper to reset the pref layers between cases
    const resetAll = () => { s._prefMemory = {}; try { localStorage.removeItem('sb_reader_pref_v1'); } catch(_){} s._scene1MicroSuppressed = false; s.scene1DirectnessSignal = null; s.directnessScore = 0; };

    // T1 — record writes story/series + global layers
    resetAll();
    s.series_id = 'S1'; s.storyId = 'story1'; s.issueIndexInRun = 1; s.turnCount = 0;
    window._recordReaderPreference('demand_hint', 'direct', { source: 'probe' });
    R.t1_mem = s._prefMemory && s._prefMemory.demand_hint ? { value: s._prefMemory.demand_hint.value, conf: s._prefMemory.demand_hint.confidence } : null;
    let g1 = {}; try { g1 = JSON.parse(localStorage.getItem('sb_reader_pref_v1')||'{}'); } catch(_){}
    R.t1_global = g1.demand_hint ? g1.demand_hint.value : null;

    // T2 — first exposure (no memory) → full_probe
    resetAll();
    s.series_id = 'Sx'; s.storyId = 'sx'; s.issueIndexInRun = 1;
    R.t2 = window._getReaderPreference('demand_hint', {});

    // T3 — same series, new story, Issue 2 → silent_apply / series_memory
    resetAll();
    s.series_id = 'S1'; s.storyId = 'story1'; s.issueIndexInRun = 1;
    window._recordReaderPreference('demand_hint', 'direct', {});
    // simulate issue boundary: new storyId, SAME series, issue 2
    s.storyId = 'story2'; s.issueIndexInRun = 2;
    R.t3 = window._getReaderPreference('demand_hint', {});

    // T4 — the skip helper fires (Scene 1) → suppress + apply
    s.turnCount = 0;
    R.t4_ret = window._scene1DemandHintSilentApply();
    R.t4_suppressed = s._scene1MicroSuppressed;
    R.t4_signal = s.scene1DirectnessSignal;

    // T5 — helper is Scene-1 only (turnCount>0 → no suppression)
    s.turnCount = 1;
    R.t5_ret = window._scene1DemandHintSilentApply();
    R.t5_suppressed = s._scene1MicroSuppressed;
    s.turnCount = 0;

    // T6 — NEW series with a strong GLOBAL prior. The global layer requires a TRACK RECORD
    // (≥2 stories: conf 0.5→0.6) before it silent_applies — one data point must NOT. Build it
    // across two stories, then a third NEW story should see global_prior silent_apply, but the
    // Phase-1b helper must STILL NOT suppress (staging = same-couple only).
    resetAll();
    s.series_id = 'SA'; s.storyId = 'sA'; s.issueIndexInRun = 1; s.turnCount = 0;
    window._recordReaderPreference('demand_hint', 'direct', {});             // global conf 0.5
    s._prefMemory = {}; s.series_id = 'SB'; s.storyId = 'sB';
    window._recordReaderPreference('demand_hint', 'direct', {});             // global conf 0.6
    R.t6_globalConf = (JSON.parse(localStorage.getItem('sb_reader_pref_v1')||'{}').demand_hint||{}).confidence;
    s._prefMemory = {}; s.series_id = 'S9'; s.storyId = 'story9'; s.issueIndexInRun = 1; s.turnCount = 0; // new couple
    R.t6_resolve = window._getReaderPreference('demand_hint', {});
    R.t6_helper = window._scene1DemandHintSilentApply(); // expect false (Phase-1b same-couple guard)
    R.t6_single = (function(){ // sanity: a SINGLE cross-story record must NOT reach silent_apply
      resetAll(); s.series_id='SO'; s.storyId='sO'; window._recordReaderPreference('demand_hint','direct',{});
      s._prefMemory={}; s.series_id='SN'; s.storyId='sN'; return window._getReaderPreference('demand_hint',{}).askMode;
    })();

    // T7 — issue-open apply pre-tunes from same-series memory
    resetAll();
    s.series_id = 'S1'; s.storyId = 'story1'; s.issueIndexInRun = 1;
    window._recordReaderPreference('demand_hint', 'subtle', {});
    s.storyId = 'story2'; s.issueIndexInRun = 2; s.scene1DirectnessSignal = null;
    window._applyRememberedPreferences();
    R.t7_signal = s.scene1DirectnessSignal;

    // T8 — confidence rises on re-confirm, softens on flip
    resetAll();
    s.series_id = 'S1'; s.storyId = 'story1'; s.issueIndexInRun = 1;
    window._recordReaderPreference('demand_hint', 'direct', {});
    const c1 = s._prefMemory.demand_hint.confidence;
    window._recordReaderPreference('demand_hint', 'direct', {}); // re-confirm
    const c2 = s._prefMemory.demand_hint.confidence;
    window._recordReaderPreference('demand_hint', 'subtle', {}); // flip
    const c3 = s._prefMemory.demand_hint.confidence;
    R.t8 = { c1, c2, c3, flipVal: s._prefMemory.demand_hint.value };

    return R;
  });

  // Assertions
  check('T1 record → story-local memory set (direct, conf≥0.6)', out.t1_mem && out.t1_mem.value === 'direct' && out.t1_mem.conf >= 0.6, JSON.stringify(out.t1_mem));
  check('T1 record → global layer written (demand_hint transfers)', out.t1_global === 'direct', 'global=' + out.t1_global);
  check('T2 first exposure → full_probe / first_exposure', out.t2.askMode === 'full_probe' && out.t2.reason === 'first_exposure', JSON.stringify(out.t2));
  check('T3 same-series Issue 2 → silent_apply / series_memory*', out.t3.askMode === 'silent_apply' && /^series_memory/.test(out.t3.reason), JSON.stringify(out.t3));
  check('T4 skip helper → returns true + suppressed + signal applied', out.t4_ret === true && out.t4_suppressed === true && out.t4_signal === 'direct', `ret=${out.t4_ret} sup=${out.t4_suppressed} sig=${out.t4_signal}`);
  check('T5 helper is Scene-1 only (turnCount>0 → false + not suppressed)', out.t5_ret === false && out.t5_suppressed === false, `ret=${out.t5_ret} sup=${out.t5_suppressed}`);
  check('T6 global prior reaches conf≥0.6 after 2 stories', out.t6_globalConf >= 0.6, 'globalConf=' + out.t6_globalConf);
  check('T6 resolver silent_applies global prior (track record built)', out.t6_resolve.askMode === 'silent_apply' && out.t6_resolve.reason === 'global_prior', JSON.stringify(out.t6_resolve));
  check('T6 single cross-story record does NOT reach silent_apply (needs track record)', out.t6_single === 'full_probe', 'single=' + out.t6_single);
  check('T6 STAGING: helper does NOT suppress on global prior (Phase 1b same-couple only)', out.t6_helper === false, 'helper=' + out.t6_helper);
  check('T7 issue-open apply pre-tunes signal from memory (subtle)', out.t7_signal === 'subtle', 'signal=' + out.t7_signal);
  check('T8 confidence rises on re-confirm', out.t8.c2 > out.t8.c1, JSON.stringify(out.t8));
  check('T8 flip softens (not zeroes) + value updates', out.t8.c3 <= out.t8.c2 && out.t8.c3 >= 0.5 && out.t8.flipVal === 'subtle', JSON.stringify(out.t8));

  // log-presence checks
  check('[PREF-APPLY] Scene-1 SKIPPED log emitted', logs.some(l => /SKIPPED \(silent_apply/.test(l)), '');
  check('[PREF-APPLY] issue-open log emitted', logs.some(l => /issue-open silent_apply/.test(l)), '');

} catch (e) {
  check('HARNESS RAN', false, e.message);
} finally {
  await browser.close();
}

const pass = results.filter(r => r.ok).length, total = results.length;
console.log('\n=== PREF RESOLVER LOGIC VALIDATION ===');
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗ FAIL'}  ${r.name}${r.ok ? '' : '  →  ' + r.detail}`);
console.log(`\nRESULT: ${pass}/${total} ${pass === total ? '✓ ALL PASS' : '✗ FAILURES'}`);
console.log('PREF logs seen:', results.length ? '' : '');
process.exit(pass === total ? 0 : 1);
