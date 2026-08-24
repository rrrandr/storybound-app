// _serial10.mjs — PAID. One continuous issue, N scenes, real author path.
//
// Refactored out of _issue1.mjs, which hand-unrolled scenes 2 and 3 as separate blocks and so
// could never run long enough to test anything longitudinal. The mechanism cooldown is 5
// scenes, so a 3-scene run cannot reach the only question that matters here: when a spent
// mechanism becomes available again, does it DEEPEN or merely restate?
//
// Everything is persisted the moment it lands — a 30-minute paid run that dies at scene 8
// must not lose scenes 1-7.
//
// usage: node _serial10.mjs [N]          (default 10)
import { chromium } from 'playwright-core';
import fs from 'fs';

const N = Number(process.argv[2]) || 10;
const OUTDIR = process.env.OUTDIR || '_validate_out/serial10';
const log = (...a) => console.error(...a);
fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(OUTDIR + '/.writetest', 'ok'); fs.unlinkSync(OUTDIR + '/.writetest');
log(`[preflight] ${OUTDIR} writable · ${N} scenes`);

// What the PC does each turn. Varied on purpose: repeating one input would manufacture the
// repetition this test exists to detect.
const ACTIONS = [
  'I try to explain what happened.',
  'I look for Julian in the crowd.',
  'I ask the Dohkar what the ruling will be.',
  'I go to find Seren alone.',
  'I return to the clearing where it happened.',
  'I press for the truth about the wish.',
  'I refuse to answer until they hear me out.',
  'I look for what everyone else missed.',
  'I face the inquiry.',
];

const isAuthor = (sys, usr, model) => /STORYBOUND ARCHITECTURE LAWS/.test(sys) || /grok-4\.3/.test(String(model || ''));
let spend = 0, raws = [];
// CALL LEDGER. A duplicate whose output is DISCARDED is a different bug from one whose output
// WINS: the first is waste, the second means every prior comparison measured an output path we
// did not know about. Consumption is resolved after each scene settles, by checking which
// captured drafts actually reached the page.
let scene = 1;
const calls = [];
const hash = t => String(t).length + ':' + [...String(t).slice(0, 6000)]
  .reduce((a, c) => ((a * 31 + c.charCodeAt(0)) | 0), 7);

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
for (const p of ['**/api/image', '**/api/bfl-kontext', '**/api/get-parent-images', '**/api/replicate**', '**/api/fal**'])
  await page.route(p, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));

await page.route('**/api/**', async route => {
  const r = route.request(); if (r.method() !== 'POST') return route.continue();
  let b = null; try { b = JSON.parse(r.postData() || '{}'); } catch (_) { return route.continue(); }
  const msgs = b.messages || [];
  const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');
  if (!isAuthor(sys, usr, b.model || b.preferredModel)) return route.continue();
  try { fs.writeFileSync(`${OUTDIR}/payload_${raws.length + 1}.txt`, sys + '\n=====USER=====\n' + usr); } catch (_) {}
  const rec = { id: calls.length + 1, scene, t: Date.now(), inHash: hash(sys + usr),
    sysChars: sys.length,
    pass: /STRICT MODE \(retry\)/.test(sys) ? 'pass2-strict'
      : /STORYBOUND_CACHE_BOUNDARY/.test(sys) ? 'pass2' : 'pass1-or-legacy',
    outHash: null, outLen: 0, consumed: null };
  calls.push(rec);
  const resp = await route.fetch({ timeout: 0 });
  const bodyTxt = await resp.text();
  try {
    const j = JSON.parse(bodyTxt);
    const c = j.choices?.[0]?.message?.content ?? j.content;
    const txt = Array.isArray(c) ? c.filter(x => x && x.type === 'text').map(x => x.text).join('') : String(c || '');
    if (txt && txt.length > 200) {
      raws.push(txt);
      rec.outHash = hash(txt); rec.outLen = txt.length; rec.text = txt;
      fs.writeFileSync(`${OUTDIR}/raw_author_${raws.length}.txt`, txt);
      log(`  [author ${raws.length}] ${txt.length} chars · ${rec.pass} · scene ${scene}`);
    }
  } catch (_) {}
  return route.fulfill({ response: resp, body: bodyTxt });
});
page.on('console', m => {
  const t = m.text();
  const mm = t.match(/Finalized: \$([0-9.]+)/); if (mm) spend += parseFloat(mm[1]);
  // Branch tracing: which generation path actually runs, and why the skeleton is empty.
  if (/\[BRANCH\]|\[TIER-ROUTE\]|\[SKELETON\]|\[MULTI-PASS\]|\[SPECULATIVE\]|LIT-LITE PATH|legacy pipeline|Pass 1 failed|SCENE_VALIDATE/i.test(t)) {
    log('   [trace] ' + t.slice(0, 160));
  }
});

let loaded = false;
for (let a = 1; a <= 3 && !loaded; a++) {
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.state && window.StoryPagination && window.STARTER_STORIES, { timeout: 90000 });
    loaded = true;
  } catch (e) { log('  load attempt ' + a + ' failed: ' + e.message.slice(0, 60)); }
}
if (!loaded) { await browser.close(); throw new Error('page never loaded'); }
await page.waitForTimeout(600);

await page.evaluate((ARM) => {
  window.__ARM = ARM;
  const s = window.state;
  window.__rawSnap = []; window.__textSnap = []; window.__cheapEditTrace = [];
  window._devBypass = true; s.picks = s.picks || {};
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  ['world', 'worldSubtype', 'pressure', 'flavor', 'tone', 'pov', 'length', 'dynamic', 'pcSpecies', 'liSpecies'].forEach(k => s.picks[k] = def[k]);
  s.world = def.world; s.worldSubtype = def.worldSubtype; s.flavor = def.flavor; s.dynamic = def.dynamic;
  s._starterId = def.id; s.is_starter_story = true; s.immutableTitle = def.title;
  s.archetype = { primary: def.archetype, modifier: null };
  s.name = 'Lirael'; s.playerName = 'Lirael'; s.loveInterestName = 'Julian'; s.partnerName = 'Julian';
  s.loveInterest = 'Male'; s.liGender = 'male'; s.playerMask = 'OPEN_VEIN';
  s.storyLength = 'novella'; s.tier = 'novella'; s.access = 'sub'; s.subscribed = true; s.fortunes = 9999999;
  s.previewActive = false; s._skipCorridorValidation = true; s.intensity = 'Steamy'; s.pov = 'first_person';
  s.identity = { playerName: 'Lirael', partnerName: 'Julian' }; s.picks.identity = s.identity;
  s._pcLookSkipped = true; s.pcLookLocked = true; s.renderMode = 'literary'; s.currentEngine = 'literary';
  // Real switch — read inside the function. Assigning window.scheduleSpeculativePreload
  // disables nothing (bare internal callers resolve the declaration, not the alias).
  window.__disableSpeculativePreload = true;
  // A/50 is gated behind a flag no production path sets, so the previous serial was written
  // without the house prose mode entirely. Arm it so the test measures the real target style.
  window._armA50 = true;
  // ARM=1 runs without the Emotional Physics law so the prompt-time rule can be measured.
  if (window.__ARM === 1) window._armEmotionalPhysics = false;
  // Name the caller of every author call. The duplicate survives with the preload off, so the
  // stack is the only thing that will say who issues it.
  window.__authorStacks = [];
  window.__traceAuthorCalls = true;   // dev trace at the callChat choke point
  try {
    const _orig = window._authorChatCapture;
    if (typeof _orig === 'function') {
      window._authorChatCapture = function (m, t2, o) {
        try { window.__authorStacks.push(String(new Error('author-call').stack || '').split('\n').slice(1, 7).join(' | ')); } catch (_) {}
        return _orig.apply(this, arguments);
      };
    }
    const _oc = window.callChat;
    if (typeof _oc === 'function') {
      window.callChat = function () {
        try { window.__authorStacks.push('callChat:: ' + String(new Error('cc').stack || '').split('\n').slice(1, 7).join(' | ')); } catch (_) {}
        return _oc.apply(this, arguments);
      };
    }
  } catch (_) {}
}, Number(process.env.ARM || 0));

// Pages are HTML (innerHTML = pages[i]), so the paragraph boundary lives ONLY in the block
// tags. Stripping tags first deleted every break: the author wrote 6 paragraphs and the
// capture stored one run-on line. That also glued sentences together across the boundary
// ("…waiting to be spoken.I realize that old tarot deck…"), so every sentence-level measure
// taken from these files was operating on damaged input.
const pageText = () => page.evaluate(() => (window.StoryPagination.getPages() || []).join('\n')
  .replace(/<\s*br\s*\/?>/gi, '\n')
  .replace(/<\/\s*(?:p|div|h[1-6]|li|blockquote)\s*>/gi, '\n\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, '\u2019')
  .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim());

// Settle on the REAL condition — text must GROW past the previous scene and then hold steady
// for two consecutive reads. An earlier harness slept a fixed 15s, read too early, and wrote
// scene 1 to disk as scene 2.
async function settle(beforeLen) {
  let all = '', prev = -1, stable = 0, ok = false;
  for (let w = 0; w < 420000; w += 5000) {
    await page.waitForTimeout(5000);
    all = await pageText();
    if (all.length > beforeLen && all.length === prev) { if (++stable >= 2) { ok = true; break; } }
    else stable = 0;
    prev = all.length;
  }
  return { all, ok };
}

log('[serial] SCENE 1 — real generation…');
await page.evaluate(() => window.handleBeginStory());
for (let w = 0; w < 900000; w += 4000) { await page.waitForTimeout(4000); if ((await pageText()).length > 1200) break; }
await page.waitForTimeout(12000);
let all = await pageText();
// A draft counts as consumed if a distinctive run of it survives into the rendered page.
const norm = x => String(x).replace(/\s+/g, ' ').replace(/[“”"’']/g, '').toLowerCase();
const resolve = (sceneNo, finalText) => {
  const F = norm(finalText);
  for (const c of calls.filter(x => x.scene === sceneNo && x.text)) {
    const n = norm(c.text);
    let hit = false;
    for (let i = 60; i + 60 <= n.length && !hit; i += 120) if (F.includes(n.slice(i, i + 60))) hit = true;
    c.consumed = hit; delete c.text;
  }
};
resolve(1, all);
fs.writeFileSync(`${OUTDIR}/scene1_final.txt`, all);
log(`  scene 1: ${all.length} chars   spend=$${spend.toFixed(3)}`);
let prevLen = all.length;

for (let n = 2; n <= N; n++) {
  const rawsBefore = raws.length;
  // Arm the turn gates every scene — deck one-shots are the Submit gate and without them the
  // turn silently cannot run.
  await page.evaluate(() => { const s = window.state;
    s._cliffhangerContinueAuthorized = true; s._isAdvancingScene = false;
    s._petitionEmergenceFired = true; s._deckExamineFired = true; });
  scene = n;
  const action = ACTIONS[(n - 2) % ACTIONS.length];
  log(`[serial] SCENE ${n} — "${action}"`);
  await page.evaluate((a) => {
    document.getElementById('actionInput').value = a;
    document.getElementById('dialogueInput').value = '';
    const b = document.getElementById('submitBtn'); b.disabled = false; b.click();
  }, action);

  let sawAuthor = false;
  for (let w = 0; w < 900000; w += 4000) { await page.waitForTimeout(4000); if (raws.length > rawsBefore) { sawAuthor = true; break; } }
  if (!sawAuthor) { log(`  ⚠ scene ${n}: no author call — stopping rather than writing a duplicate`); break; }

  const { all: now, ok } = await settle(prevLen);
  if (!ok) { log(`  ⚠ scene ${n} UNSETTLED (${now.length} vs ${prevLen}) — stopping, partial output kept`); break; }
  const body = now.slice(prevLen).trim();
  resolve(n, body);
  fs.writeFileSync(`${OUTDIR}/scene${n}_final.txt`, body);
  fs.writeFileSync(`${OUTDIR}/all_final.txt`, now);
  log(`  scene ${n}: ${body.length} chars   spend=$${spend.toFixed(3)}`);
  all = now; prevLen = now.length;
}

// The duplicate only completes when nothing follows it — after the last scene. Idle here so it
// fires and is captured, instead of needing a longer (more expensive) run to expose it.
const IDLE = Number(process.env.IDLE_MS || 0);
if (IDLE) { log(`[serial] idling ${IDLE / 1000}s to catch any trailing generation…`); await page.waitForTimeout(IDLE); }

try {
  const rt = await page.evaluate(() => ({
    violations: (window.state && window.state._authorityViolations) || [],
    preflight: (window.state && window.state._payloadPreflight) || [],
    reports: (window.state && window.state._validatorReports) || [] }));
  fs.writeFileSync(OUTDIR + '/runtime.json', JSON.stringify(rt, null, 1));
  const stacks = await page.evaluate(() => window.__authorStacks || []);
  fs.writeFileSync(OUTDIR + '/author_stacks.txt', stacks.map((x, i) => `#${i + 1}  ${x}`).join('\n'));
  log(`  author call stacks captured: ${stacks.length} → author_stacks.txt`);
  fs.writeFileSync(OUTDIR + '/author_calls.jsonl', calls.map(c => JSON.stringify(c)).join('\n'));
  const dupes = {};
  for (const c of calls) (dupes[c.inHash] = dupes[c.inHash] || []).push(c);
  log('\n  ── CALL LEDGER ──');
  for (const c of calls) log(`   #${c.id} scene ${c.scene} · ${c.pass.padEnd(16)} · out ${String(c.outLen).padStart(5)} · consumed=${c.consumed}`);
  for (const [h, g] of Object.entries(dupes)) if (g.length > 1) {
    log(`   ⚠ DUPLICATE INPUT ×${g.length}: calls ${g.map(x => '#' + x.id).join(',')} · ${g[0].pass}`
      + ` · Δt ${g[1].t - g[0].t}ms · consumed ${g.map(x => x.consumed).join('/')}`);
  }
  log(`  runtime — violations ${rt.violations.length} · preflight ${rt.preflight.length} · reports ${rt.reports.length}`);
} catch (e) { log('  runtime dump failed: ' + e.message); }

await browser.close();
const written = fs.readdirSync(OUTDIR).filter(f => /^scene\d+_final\.txt$/.test(f)).length;
console.log(`\n════ SERIAL CAPTURE ════`);
console.log(`  scenes written: ${written}/${N}   author responses: ${raws.length}`);
console.log(`  app-reported spend: $${spend.toFixed(3)}`);
console.log(`  → ${OUTDIR}/`);
