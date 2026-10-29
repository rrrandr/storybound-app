// ══════════════════════════════════════════════════════════════════════════════════════════
// LATER-STORY LITERARY CONTINUATION, FROM THE PRESERVED PRODUCTION SAVE.
//
// NOT a Scene-2 test. The save is at turnCount 9, renderMode=literary, PC Lirael / LI Julian,
// so this exercises a LATE literary continuation (scene 10) through the REAL resume and submit
// path: window.continueStory(storyId) then a click on #submitBtn.
//
// THE ORIGINAL ARTIFACT IS NEVER WRITTEN. It is read once, in full, and a COPY of its storage
// export is injected into a throwaway browser context via addInitScript before any page script
// runs. Nothing is saved back, and the file is opened read-only.
//
// Every /api/** is intercepted. The scene-skeleton door is answered from a labelled fixture; the
// author/prose request is captured whole and ABORTED; every other door is aborted and RECORDED,
// so an incompatibility is reported as the specific door that was needed rather than guessed at.
//
// usage: node _nf_resume_continuation_capture.mjs
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { configBody, isAuthOrigin, installSession, makeSession, installEntitledProfileStub }
  from './_test_session_env.mjs';

const SRC = '/Users/romantsukerman/storybound-app/_nf_paid_run_PRESERVED/RESUMABLE_STATE.json';
const OUT = '/Users/romantsukerman/storybound-app/_nf_resume_continuation_out';
try { fs.rmSync(OUT, { recursive: true, force: true }); } catch (_) {}
fs.mkdirSync(OUT, { recursive: true });

// READ-ONLY. A copy is what reaches the browser; the artifact is never reopened for writing.
const preserved = JSON.parse(fs.readFileSync(SRC, { encoding: 'utf-8', flag: 'r' }));
const STORAGE = JSON.parse(JSON.stringify(preserved.storage));
const STORY_ID = String(preserved.storyId);
const snap = (() => { try { return JSON.parse(STORAGE.sb_saved_story).stateSnapshot || {}; } catch (_) { return {}; } })();
console.log(`restoring a COPY of ${Object.keys(STORAGE).length} storage keys · storyId ${STORY_ID}`);
console.log(`  save says: turnCount=${snap.turnCount} renderMode=${snap.renderMode} `
  + `engine=${snap.currentEngine} modality=${snap.storyModality} PC=${snap.playerName} LI=${snap.loveInterestName}`);

const SKEL = {
  environment_anchor: 'the gallery stair below the long window',
  structural_pacing: 'tightening', narrative_density: 'close', dialogue_ratio: 'balanced',
  beat_style: 'pressure then answer', tension_rhythm: 'rising',
  staged_characters: [{ name: String(snap.playerName || 'Lirael'), presence_mode: 'IN_PERSON', role: 'protagonist' }],
  interlocutor_placement: String(snap.loveInterestName || 'Julian') + ' — answers a question slower than it was asked',
  li_texture_beat: 'the rail he always leans on is still warm', li_body_callback: null,
  pc_body_callback: 'beat 2 — signature_feature', antagonist_body_callback: null,
  environment_plus: { target: 'the gallery stair below the long window', axis: 'use',
    beat: 'the stair is the one place in the building nobody has thought to claim' },
  fusion: null,
  stage_contract: { v: 1, participants: [{ ref: 'pc:self', presence: 'IN_PERSON' }], event_facts: [] },
  causal_outline: [{ beat: 'she asks him what he already knows' },
    { beat: 'the delay is the answer', link: 'therefore', from: 1 },
    { beat: 'she decides what to do with it', link: 'therefore', from: 2 }],
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();          // isolated: fresh profile, nothing shared
const page = await ctx.newPage();
const caps = [], doors = [], logs = [];
const STATIC = /\/api\/(geo|csp-report|beta-events|bug-report-awards)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 },
                '/api/refund-fortune':  { success: true, fortunesRemaining: 9999 } };

// THE COPY IS INJECTED BEFORE ANY PAGE SCRIPT RUNS.
await page.addInitScript((kv) => {
  try { Object.keys(kv).forEach((k) => localStorage.setItem(k, kv[k])); } catch (e) {
    try { console.log('RESTORE-FAILED ' + (e && e.message)); } catch (_) {}
  }
}, STORAGE);
await installSession(page, makeSession());
await installEntitledProfileStub(page, {});
await page.route('**/api/**', async (route) => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(req.url())) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (STATIC.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  const k = Object.keys(LOCAL).find((x) => url.startsWith(x));
  if (k) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL[k]) });
  let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const msgs = (b && b.messages) || [];
  const sys = String((msgs.find((m) => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find((m) => m.role === 'user') || {}).content || '');
  const role = String((b && b.role) || '?');
  const both = sys + usr;

  // ── THE NORMALIZATION LAYER ──
  // callNormalizationLayer (app.js:326235) canonicalises the reader's own action/dialogue before
  // planning. This arm passes the reader's turn through UNCHANGED, which is the shape its prompt
  // specifies for a player turn that needed no IP or legibility edit.
  if (/canonicalization and normalization engine for Storybound/.test(both)) {
    const payload = JSON.stringify({
      canonical_instruction: 'she asks him what he already knows',
      changed: false, rejection_reason: null });
    const env = /mistral-proxy|\/api\/proxy\b|deepseek-proxy/.test(url)
      ? { id: 'fx', object: 'chat.completion', model: b.model, usage: {},
          _orchestration: { role: b.role, model: b.model },
          choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: payload } }] }
      : { ok: true, content: payload, choices: [{ message: { content: payload } }] };
    doors.push({ door: 'NORMALIZATION', role, answered: true, chars: both.length });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(env) });
  }

  // ── THE CHARACTER MEMORY EXTRACTOR ──
  // The submit path runs this on the PREVIOUS scene before planning the new one, so aborting it
  // stopped the chain. The reply is the exact shape its own prompt specifies (read from the
  // captured request, not invented), filled with the resumed story's real people.
  if (/CHARACTER MEMORY EXTRACTOR/.test(both)) {
    const payload = JSON.stringify({
      characters: [{ name: String(snap.loveInterestName || 'Julian'), present: true,
        relationshipToPC: 'the man whose answer she is waiting for', newLayer: null,
        vehicle: 'none', framing: 'suspect' }],
      scene: { chargeTier: 'high', interpretiveDensity: 'measured', loadedSentenceRatio: 0.3 },
      sceneState: { setting: 'the gallery stair below the long window',
        charactersPresent: [String(snap.playerName || 'Lirael'), String(snap.loveInterestName || 'Julian')],
        protagonistStatus: 'holding a question she has already asked once',
        decisiveChange: 'he answered slower than she asked',
        activeInterlocutor: String(snap.loveInterestName || 'Julian'), protagonistAlone: false },
      relations: [],
    });
    const env = /mistral-proxy|\/api\/proxy\b|deepseek-proxy/.test(url)
      ? { id: 'fx', object: 'chat.completion', model: b.model, usage: {},
          _orchestration: { role: b.role, model: b.model },
          choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: payload } }] }
      : { ok: true, content: payload, choices: [{ message: { content: payload } }] };
    doors.push({ door: 'MEMORY_EXTRACTOR', role, answered: true, chars: both.length });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(env) });
  }

  if (/narrative skeletons for fiction scenes|CAUSAL_OUTLINE/.test(both)) {
    const payload = JSON.stringify(SKEL);
    const env = /mistral-proxy|\/api\/proxy\b|deepseek-proxy/.test(url)
      ? { id: 'fx', object: 'chat.completion', model: b.model, usage: {},
          _orchestration: { role: b.role, model: b.model },
          choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: payload } }] }
      : { ok: true, content: payload, choices: [{ message: { content: payload } }] };
    doors.push({ door: 'SKELETON', role, answered: true, chars: both.length });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(env) });
  }

  const isAuthor = (b && b.author === true)
    || /THIS IS THE LAST PROSE IN THE SCENE|YOU ARE WRITING AS S\. TORY BOUND|STORYBOUND ARCHITECTURE LAWS/i.test(both);
  if (isAuthor && both.length > 40000) {
    const n = caps.length + 1;
    const name = `resume_author__${role}__${n}.txt`;
    fs.writeFileSync(OUT + '/' + name,
      `=== RESUMED STORY ${STORY_ID}  turnCount(save)=${snap.turnCount}  ROLE: ${role}  MODEL: ${b && b.model}  url=${url}\n\n`
      + `=== SYSTEM (${sys.length} chars) ===\n${sys}\n\n=== USER (${usr.length} chars) ===\n${usr}\n`);
    caps.push({ role, model: (b && b.model) || null, sys: sys.length, usr: usr.length, file: name });
    doors.push({ door: 'AUTHOR', role, answered: false, chars: both.length });
    return route.abort();
  }
  // DUMP EVERY UNRECOGNISED DOOR so an incompatibility is reported from its actual content,
  // never guessed. A mock must answer ONE real shape, which means reading the request first.
  doors.push({ door: 'OTHER', role, url, answered: false, chars: both.length });
  try {
    fs.writeFileSync(OUT + '/door__' + role.replace(/[^\w]/g, '_') + '__' + (doors.length) + '.txt',
      `=== ROLE ${role}  url=${url}  model=${b && b.model}\n\n=== SYSTEM (${sys.length}) ===\n${sys}\n\n=== USER (${usr.length}) ===\n${usr}\n`);
  } catch (_) {}
  return route.abort();
});
await page.route('**/sb-test.localhost/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
page.on('console', (m) => { if (logs.length < 900) logs.push(m.text().slice(0, 260)); });
page.on('pageerror', (e) => logs.push('PAGEERROR ' + String(e && e.message).slice(0, 260)));

await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 60000 });
await page.waitForFunction(() => window.state && window.continueStory, null, { timeout: 180000 });

// ── THE REAL RESUME PATH ──
const resumed = await page.evaluate(async (id) => {
  try { await Promise.race([window.continueStory(id), new Promise((r) => setTimeout(r, 90000))]); }
  catch (e) { return { ok: false, threw: String((e && e.message) || e) }; }
  const S = window.state || {};
  return { ok: true, storyId: S.storyId || null, turnCount: S.turnCount,
    renderMode: S.renderMode, engine: S.currentEngine, modality: S.storyModality,
    pc: S.playerName, li: S.loveInterestName,
    pages: (S.storyPages || []).length, scenes: (S.scenes || []).length,
    hasStoryText: !!document.getElementById('storyText'),
    hasSubmit: !!document.getElementById('submitBtn'),
    hasActionInput: !!document.getElementById('actionInput') };
}, STORY_ID);
console.log('\nRESUME RESULT: ' + JSON.stringify(resumed));

// ── THE REAL SUBMIT PATH ──
let submitted = 'not attempted';
if (resumed.ok && resumed.hasSubmit) {
  submitted = await page.evaluate(async () => {
    // ENTITLEMENT, IN THE TEST ONLY. Resume restores the save, then profile hydration against the
    // stubbed backend sets tier=free / fortunes=0, and the turn is refused at the paywall before
    // any planning runs. The real reader of this save is a subscriber; nothing in production
    // changes here, the test just stops the stub from un-entitling a resumed subscriber.
    const S = window.state;
    S.subscribed = true; S.tier = 'novella'; S.access = 'sub'; S.fortunes = 9999999;
    S.storypassEligible = true;
    const a = document.getElementById('actionInput'); if (a) a.value = 'she asks him what he already knows';
    const d = document.getElementById('dialogueInput'); if (d) d.value = '';
    const btn = document.getElementById('submitBtn');
    btn.disabled = false; btn.click();
    await new Promise((r) => setTimeout(r, 150000));
    return 'clicked';
  });
}
await browser.close();
fs.writeFileSync(OUT + '/RESULT.json', JSON.stringify({ storyId: STORY_ID, saveSnapshot: {
  turnCount: snap.turnCount, renderMode: snap.renderMode, modality: snap.storyModality },
  resumed, submitted, caps, doors, logs }, null, 2));

const P = console.log;
P('SUBMIT: ' + submitted);
P('\nAUTHOR REQUESTS CAPTURED (aborted after capture — nothing sent): ' + caps.length);
caps.forEach((c) => P(`  ${(c.sys + c.usr).toLocaleString().padStart(9)} chars = sys ${c.sys.toLocaleString()} + usr ${c.usr.toLocaleString()}  role=${c.role} model=${c.model}`));
const byDoor = {};
doors.forEach((d) => { const key = d.door + (d.door === 'OTHER' ? ' ' + d.role : ''); byDoor[key] = (byDoor[key] || 0) + 1; });
P('\nDOORS SEEN: ' + JSON.stringify(byDoor));
if (!caps.length) {
  P('\nNO AUTHOR REQUEST — the specific doors the resume/submit path needed, in order:');
  doors.filter((d) => d.door === 'OTHER').slice(0, 18)
    .forEach((d) => P(`    role=${d.role}  ${String(d.url).slice(0, 70)}  (${d.chars} chars)`));
  P('\n  last relevant log lines:');
  logs.filter((l) => /FAIL|ABORT|GUARD|refus|error|Error|SCENE-GEN|paywall|PAYWALL|fortune|Fortune|toast|SKELET|lock/i.test(l))
    .slice(-22).forEach((l) => P('    ' + l.slice(0, 160)));
}
P('\n  written: ' + OUT);
P('  THE PRESERVED ARTIFACT WAS NOT MODIFIED.');
