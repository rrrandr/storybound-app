// BRANCH CAUSALITY TEST — does the player's choice alter CAUSALITY, or only wording?
//
// PAID. Does not run without --confirm.
//
// Design note that matters more than the rest of the file: Scene 1 is generated ONCE and
// both branches resume from the same snapshot. If each branch generated its own Scene 1,
// every Scene 2 difference would be confounded by Scene 1 variance, and the test would
// answer "does Grok vary between runs?" — which we already know. The only permitted
// difference between the arms is the player's action.
//
//   Branch A: tear off the mouth covering and run to Seren   (intervene)
//   Branch B: stay silent and obey the rite                  (hold)
//
// The verdict is NOT "are the words different?" — that is too weak. It is:
//   • does the planner's state_change / forces_choice differ?   <- causality
//   • does the committed-state fact ledger differ?              <- world state
//   • does the prose differ?                                    <- necessary, not sufficient
//
// Arms run SEQUENTIALLY (see feedback_harness_ground_truth). Before either arm spends,
// the Scene 1 manifest must prove the Author actually received its directives — grading
// prose written without the rules tells you nothing about the rules.
//
// usage: node _branch_causality.mjs --confirm [OUTDIR]
import { chromium } from 'playwright-core';
import crypto from 'crypto';
import fs from 'fs';
import { renderManifest } from './_payload_manifest.mjs';
import { isAuthorSys } from './_directive_registry.mjs';
import { READ_VECTOR, compare } from './_causal_vector.mjs';
import { DIRECTIVES, carries } from './_directive_registry.mjs';

// DRY MODE — exercise the HARNESS at zero cost. The fail-closed scene capture, the
// comparability gate and the noise-correction were all written AFTER the run that exposed
// the bugs they guard against, so none of them has ever executed. Validating the
// measurement path before spending on it is the cheap half of the insurance.
const DRY = process.argv.includes('--dry');
const MODEL = (process.argv.find(a => a.startsWith('--model=')) || '').split('=')[1] || '';
const VOICE = (process.argv.find(a => a.startsWith('--voice=')) || '').split('=')[1] || '';
if (!DRY && !process.argv.includes('--confirm')) {
  console.error('PAID RUN — Scene 1 + three arms (A, A-repeat noise floor, B) (~$0.75).');
  console.error('Re-run with --confirm to spend.');
  process.exit(2);
}
const OUT = process.argv.find(a => a.startsWith('_validate_out/')) || '_validate_out/branch_causality';
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.error(...a);
const sha = t => crypto.createHash('sha256').update(String(t || '')).digest('hex').slice(0, 12);

const BRANCHES = [
  { id: 'A', label: 'intervene',
    action: 'I tear the gossamer band from my mouth and run to Seren.',
    dialogue: '"Stop — she does not know what she just offered."' },
  // A2 REPEATS A EXACTLY — the noise floor. The author runs at temperature 0.8, so two
  // arms differ even with identical input. Without this, "A differs from B" proves only
  // that the model is stochastic. The comparison that means something is
  // divergence(A,B) measured AGAINST divergence(A,A2).
  { id: 'A2', label: 'intervene (repeat — noise floor)',
    action: 'I tear the gossamer band from my mouth and run to Seren.',
    dialogue: '"Stop — she does not know what she just offered."' },
  { id: 'B', label: 'hold',
    action: 'I stay where I am and keep the band across my mouth, letting the rite run.',
    dialogue: '' },
];

let spend = 0;
const authorPayloads = [], plannerPayloads = [];
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

for (const p of ['**/api/image', '**/api/bfl-kontext', '**/api/get-parent-images', '**/api/replicate**', '**/api/fal**'])
  await page.route(p, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));
const STUB_PARA = 'The clearing held its breath. Seren named her sacrifice aloud and made the wish '
  + 'she had rehearsed, and Fate answered the words as spoken. The price was taken in the same '
  + 'breath. The assembly gathered in a loose ring and no one spoke. I kept my hands still.';
let dryTurn = 0;
await page.route('**/api/**', async route => {
  const r = route.request();
  if (r.method() !== 'POST') return route.continue();
  let b = null; try { b = JSON.parse(r.postData() || '{}'); } catch (_) { return route.continue(); }
  const msgs = b.messages || [];
  let sys = '', usr = '';
  if (msgs.length) {
    sys = String(msgs.find(m => m.role === 'system')?.content || '');
    usr = String(msgs.find(m => m.role === 'user')?.content || '');
    (isAuthorSys(sys) ? authorPayloads : plannerPayloads).push({ sys, usr, at: 0 });
  }
  if (!DRY) return route.continue();          // REAL calls — body is never rewritten
  if (!msgs.length) return route.continue();
  // Vary the stub prose per author call so scene extraction has something to extract —
  // identical text would make "no new scene" indistinguishable from a real capture failure.
  const isSC = /"tactical_move"|state_change_precondition/.test(sys);
  const content = isAuthorSys(sys)
    ? Array(6).fill(STUB_PARA).join('\n\n') + '\n\nMarker ' + (++dryTurn) + '.'
    : isSC ? JSON.stringify({ tactical_move: 'Lirael steps between Seren and the Dohkar.',
        state_change_precondition: 'The assembly believes the rite can be closed cleanly.',
        state_change: 'The assembly now holds Lirael answerable.',
        forces_choice: 'forces Lirael to choose between naming the offering and taking the blame',
        branch_a: 'Names it.', branch_b: 'Takes the blame.' })
      : '{}';
  let parsed = null; try { parsed = JSON.parse(content); } catch (_) {}
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    ok: true, content, ...(parsed || {}), canonical_instruction: content,
    _orchestration: { role: 'stub', model: 'stub', tier_used: 'stub', timestamp: '1970-01-01T00:00:00.000Z' },
    usage: null }) });
});
const emitLog = [];
const cacheLog = [];
page.on('console', m => {
  const t = m.text();
  const mm = t.match(/Finalized: \$([0-9.]+)/);
  if (mm) spend += parseFloat(mm[1]);
  // Activation evidence comes from the emission log, not from state: a state-held trace
  // was silently lost when the state object was replaced, and that read as "never ran".
  if (/^\[EMIT\]/.test(t)) emitLog.push(t);
  if (/SB model override/.test(t)) log('  ' + t);
  if (/^\[CACHE\]/.test(t)) { cacheLog.push(t); log('  ' + t.slice(0, 130)); }
  if (/^\[MODEL-SERVED\]/.test(t)) log('  ' + t.slice(0, 130));
  if (/^\[OVERRIDE\]/.test(t)) log('  ' + t.slice(0, 90));
  const fin = t.match(/Finalized: \$([0-9.]+)/);
  if (fin) log(`  [SCENE-COST] scene finalized: $${fin[1]}`);
});

if (MODEL) {
  await page.addInitScript((m) => {
    const _f = window.fetch;
    window.fetch = function (url, init) {
      try {
        if (init && init.method === 'POST' && String(url).includes('/api/proxy') && typeof init.body === 'string') {
          const b = JSON.parse(init.body);
          const sys = (b.messages || []).find(x => x && x.role === 'system');
          if (sys && /STORYBOUND ARCHITECTURE LAWS/.test(String(sys.content || ''))) {
            b._sbModelOverride = m;
            init = { ...init, body: JSON.stringify(b) };
            console.log('[OVERRIDE] author call -> ' + m);
          }
        }
      } catch (_) {}
      return _f.call(this, url, init);
    };
  }, MODEL);
}
if (VOICE) await page.addInitScript((v) => { window.__SB_VOICE = v; window._authorVoice = v; }, VOICE);
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window.STARTER_STORIES, { timeout: 90000 });
await page.evaluate(() => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  s.picks = s.picks || {};
  ['world', 'worldSubtype', 'pressure', 'flavor', 'tone', 'pov', 'length', 'dynamic', 'pcSpecies', 'liSpecies']
    .forEach(k => s.picks[k] = def[k]);
  Object.assign(s, {
    world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor, dynamic: def.dynamic,
    _starterId: def.id, is_starter_story: true, immutableTitle: def.title,
    archetype: { primary: def.archetype, modifier: null },
    name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
    loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling',
    access: 'sub', subscribed: true, fortunes: 9999999, previewActive: false,
    _skipCorridorValidation: true, intensity: 'Steamy', pov: 'first_person',
    identity: { playerName: 'Lirael', partnerName: 'Julian' },
    _pcLookSkipped: true, pcLookLocked: true, renderMode: 'literary', currentEngine: 'literary',
  });
  s.picks.identity = s.identity;
  window._devBypass = true;
  if (window.__SB_VOICE) window._authorVoice = window.__SB_VOICE;
  if (typeof window.scheduleSpeculativePreload === 'function') window.scheduleSpeculativePreload = function () {};
  // DELIBERATELY NOT SET: _petitionEmergenceFired, _deckExamineFired
});

const pageText = () => page.evaluate(() => (window.StoryPagination.getPages() || []).join('\n').replace(/<[^>]+>/g, '').trim());
const turn = () => page.evaluate(() => (window.state && window.state.turnCount) || 0);

// ── SCENE 1 — generated once, shared by both arms ─────────────────────────────
log('[branch] SCENE 1 (shared by both arms)…');
await page.evaluate(() => window.handleBeginStory());
for (let w = 0; w < 600000; w += 4000) { await page.waitForTimeout(4000); if ((await pageText()).length > 1200) break; }
await page.waitForTimeout(10000);
const scene1 = await pageText();
fs.writeFileSync(`${OUT}/scene1.txt`, scene1);
log(`  scene 1: ${scene1.length} chars`);

// COST GATE. If the Author did not receive its directives, the branches would test the
// absence of the rules, not the rules — and there is no reason to pay for that.
const s1Author = authorPayloads[authorPayloads.length - 1];
const manifestOk = renderManifest(s1Author ? s1Author.sys + '\n' + s1Author.usr : '',
  { label: 'SCENE 1', scene: 'scene1' });
if (!manifestOk) {
  log('\n  ABORTING BEFORE THE BRANCHES — the Author was missing directives.');
  log('  Fix delivery first; branch results would be uninterpretable.');
  fs.writeFileSync(`${OUT}/aborted_manifest.txt`,
    s1Author ? s1Author.sys + '\n=====USER=====\n' + s1Author.usr : '(no author payload)');
  await browser.close(); process.exit(1);
}

// ── SNAPSHOT — the shared causal origin for both arms ─────────────────────────
const snapshot = await page.evaluate(() => ({
  state: JSON.stringify(window.state),
  pages: JSON.stringify(window.StoryPagination.getPages() || []),
}));
const originHash = sha(snapshot.state);
log(`\n  snapshot taken — origin state ${originHash}`);

const results = [];
for (const br of BRANCHES) {
  log(`\n[branch ${br.id}] ${br.label} …`);

  if (results.length) {                        // arm 2+ resumes from the SAME origin
    // Compare CONTENT, not the serialized string. A free stub probe showed the restore is
    // byte-perfect, so a paid-run hash mismatch comes from values that do not survive a
    // JSON round-trip (not from a broken restore) — and aborting on that would throw away
    // a valid comparison. Still fails closed on any real difference, and now says WHICH.
    const d = await page.evaluate((snap) => {
      const parsed = JSON.parse(snap.state);
      Object.keys(window.state).forEach(k => { delete window.state[k]; });
      Object.assign(window.state, parsed);
      try { window.StoryPagination.setPages(JSON.parse(snap.pages)); } catch (_) {}
      const after = window.state;
      const j2 = v => { try { return JSON.stringify(v); } catch (_) { return '[unserializable]'; } };
      const kb = Object.keys(parsed), ka = Object.keys(after);
      return {
        restored: JSON.stringify(after),
        added: ka.filter(k => !kb.includes(k)),
        removed: kb.filter(k => !ka.includes(k)),
        changed: kb.filter(k => ka.includes(k) && j2(parsed[k]) !== j2(after[k])).slice(0, 20),
      };
    }, snapshot);
    const realDiff = d.added.length + d.removed.length + d.changed.length;
    if (realDiff) {
      log(`  RESTORE MISMATCH — ${realDiff} genuine difference(s). Aborting rather than`);
      log('  reporting a confounded comparison.');
      if (d.added.length) log(`    added:   ${d.added.join(', ')}`);
      if (d.removed.length) log(`    removed: ${d.removed.join(', ')}`);
      if (d.changed.length) log(`    changed: ${d.changed.join(', ')}`);
      await browser.close(); process.exit(1);
    }
    log(sha(d.restored) === originHash
      ? `  restored to origin ${originHash}`
      : `  restored to origin — content identical; serialization differs (${sha(d.restored)}), not causal`);
  }

  const beforeAuthor = authorPayloads.length, beforePlanner = plannerPayloads.length;
  const emitAtArmStart = emitLog.length;
  await page.evaluate(async () => {
    if (typeof window._fireLiteraryDeckExamine === 'function') { try { await window._fireLiteraryDeckExamine(); } catch (_) {} }
  });
  await page.waitForTimeout(3000);
  await page.evaluate(({ action, dialogue }) => {
    const a = document.getElementById('actionInput'), d = document.getElementById('dialogueInput'),
          b = document.getElementById('submitBtn');
    if (a) a.value = action;
    if (d) d.value = dialogue;
    if (b) { b.disabled = false; b.click(); }
  }, br);
  {
    const target = scene1.length + 200;
    let grewAt = 0;
    for (let w = 0; w < 900000; w += 5000) {
      await page.waitForTimeout(5000);
      const len = (await pageText()).length;
      if (len > target) { grewAt = w; break; }
    }
    if (!grewAt) log(`  [warn] page text never grew past ${target}c within 15min`);
    // Settle: let any post-pass finish rewriting before the text is captured.
    let prev = -1, stable = 0;
    for (let w = 0; w < 120000 && stable < 3; w += 4000) {
      await page.waitForTimeout(4000);
      const len = (await pageText()).length;
      if (len === prev) stable++; else { stable = 0; prev = len; }
    }
  }

  const full = await pageText();
  const grew = full.length > scene1.length + 200 && full.startsWith(scene1.slice(0, 200));
  const scene2 = grew ? full.slice(scene1.length).trim() : '';
  if (!scene2) {
    log(`  ARM ${br.id} PRODUCED NO NEW SCENE — page text ${full.length}c vs scene 1 ${scene1.length}c.`);
    log('  Refusing to substitute scene 1 for a continuation. Aborting rather than grading the wrong text.');
    fs.writeFileSync(`${OUT}/arm_${br.id}_pagetext.txt`, full);
    await browser.close(); process.exit(1);
  }
  const newAuthor = authorPayloads.slice(beforeAuthor);
  const newPlanner = plannerPayloads.slice(beforePlanner);
  // The planner's state_change IS the causal claim: what BECOMES TRUE because the scene
  // happened. If it is identical across arms, the choice changed nothing causal.
  const sc = newPlanner.map(p => {
    const m = /"state_change"\s*:\s*"([^"]{0,300})/.exec(p.usr) || /state_change[^\n]{0,300}/.exec(p.usr);
    return m ? m[0] : '';
  }).filter(Boolean).join(' | ');
  // Emergent state only — every field verified populated and moving by
  // _causal_state_survey.mjs. The old probe read two empty fields and the authored spine
  // goal, which is identical in every arm, so it could only ever report "no divergence".
  const vector = await page.evaluate(`(${READ_VECTOR})`);
  const gateTrace = await page.evaluate(() => (window.state && window.state._canonGateTrace) || null);
  const causalState = JSON.stringify(vector);

  const r = { id: br.id, label: br.label, scene2, scene2Hash: sha(scene2),
              authorPayload: newAuthor.map(p => p.sys + '\n=====USER=====\n' + p.usr).join('\n@@@@@\n'),
              stateChange: sc, causalState, causalHash: sha(causalState) };
  results.push(r);
  fs.writeFileSync(`${OUT}/branch_${br.id}_scene2.txt`, scene2);
  fs.writeFileSync(`${OUT}/branch_${br.id}_payload.txt`, r.authorPayload);
  fs.writeFileSync(`${OUT}/branch_${br.id}_state.json`, causalState);
  r.vector = vector; r.gateTrace = gateTrace;
  // The last run compared an arm that had 7/7 directives against one missing four of
  // them, and reported the difference as player causality. Record each arm's set.
  r.directives = DIRECTIVES.filter(d => d.expect.includes('author') && carries(r.authorPayload, d.probe))
    .map(d => d.key).sort().join(',');
  if (br.id === 'A') {
    const armEmits = emitLog.slice(emitAtArmStart);
    const adj = armEmits.filter(l => l.includes('WISH_ADJUDICATION'));
    const core = armEmits.filter(l => l.includes('WISH_AUTHORING_CORE'));
    const openAdj = adj.find(l => l.includes('gate=OPEN'));
    const delivered = /THE WISH-TWIST SEQUENCE/.test(r.authorPayload);
    const activated = !!openAdj;
    const fromSpine = !!(openAdj && /spineLoadBearing=YES/.test(openAdj));
    const wouldOpenAnyway = !!(openAdj && /openWithoutSpine=true/.test(openAdj));
    console.log(`\n${'─'.repeat(62)}\nFATE_TWIST_PHYSICS\n${'─'.repeat(62)}`);
    console.log('  DEFINED   ✓');
    console.log('  BUILT     ✓');
    console.log(`  DELIVERED ${delivered ? '✓' : '✗'}`);
    console.log(`  ACTIVATED ${activated ? '✓' : '✗'}`);
    console.log(`  SOURCE:   ${fromSpine ? 'spine declaration (load-bearing)'
      : wouldOpenAnyway ? 'gate would open without the spine this scene — legacy text still sufficient'
      : 'no emission recorded'}`);
    for (const l of armEmits.slice(0, 4)) console.log('    ' + l.slice(0, 150));
    fs.writeFileSync(`${OUT}/emit_arm_${br.id}.txt`, armEmits.join('\n'));
  fs.writeFileSync(`${OUT}/cache_log.txt`, cacheLog.join('\n'));
    if (!(delivered && activated)) {
      console.log('\n  GATE TEST FAILED — stopping. Prose is not judged when the rules were inert.');
      console.log(`  spend: $${spend.toFixed(3)}`);
      await browser.close(); process.exit(1);
    }
    if (process.argv.includes('--diagnose')) {
      console.log(`\n  DIAGNOSTIC RUN — gate passed. Stopping after arm A. spend: $${spend.toFixed(3)}`);
      await browser.close(); process.exit(0);
    }
  }
  renderManifest(r.authorPayload, { label: `SCENE 2 — branch ${br.id} (${br.label})`,
    gateTrace, gateTraceExpected: true });
  log(`  scene 2: ${scene2.length} chars  prose ${r.scene2Hash}  causal ${r.causalHash}`);
  log(`  running spend: $${spend.toFixed(3)}`);
}

// ── VERDICT ───────────────────────────────────────────────────────────────────
const [A, A2, B] = results;
const noise = compare(A.vector, A2.vector);   // same input, different sample
const proseDiffers = A.scene2Hash !== B.scene2Hash;
const scDiffers = A.stateChange !== B.stateChange;
const payloadDiffers = sha(A.authorPayload) !== sha(B.authorPayload);

console.log(`\n${'═'.repeat(66)}`);
console.log('BRANCH CAUSALITY VERDICT');
console.log('═'.repeat(66));
// Ordered weakest-last on purpose. A model can write two beautifully different scenes
// that are secretly the same state machine, so prose difference is never the headline.
const reached = A.authorPayload.includes('run to Seren') && B.authorPayload.includes('keep the band');
const cmp = compare(A.vector, B.vector);
// COMPARABILITY GATE. Divergence is attributable to the player's choice only if every arm
// received the SAME instructions. Otherwise the test measures "different prompt → different
// story", which is not in question.
const sets = [A, A2, B].map(x => x.directives);
const comparable = sets[0] === sets[1] && sets[1] === sets[2];
if (!comparable) {
  console.log('  ARMS NOT COMPARABLE — directive sets differ between arms:');
  for (const x of [A, A2, B]) {
    const missing = DIRECTIVES.filter(d => d.expect.includes('author') && !x.directives.split(',').includes(d.key));
    console.log(`     ${x.id.padEnd(3)} ${x.directives.split(',').length} directives`
      + (missing.length ? `  MISSING: ${missing.map(d => d.key).join(', ')}` : '  (full set)'));
  }
  console.log('  The causal comparison below is INVALID; reported for diagnosis only.');
}
// NOISE-CORRECTED SIGNAL: a field that also moves between two identical-input arms cannot
// carry the choice. Subtract those field-wise rather than comparing bulk percentages.
const noiseFields = new Set(noise.fields.map(f => f.cat + '.' + f.field));
const signalFields = cmp.fields.filter(f => !noiseFields.has(f.cat + '.' + f.field));
console.log(`  shared origin state          ${originHash}  (all arms resumed from this)`);
console.log(`  choice REACHED the Author    ${reached ? 'yes' : 'NO'}`);
console.log(`  scene 2 prose differs        ${proseDiffers ? 'yes' : 'NO'}   ${A.scene2Hash} / ${B.scene2Hash}`);
console.log(`  author payload differs       ${payloadDiffers ? 'yes' : 'NO'}`);
console.log(`  planner state_change differs ${scDiffers ? 'yes' : 'NO'}`);
console.log(`\n${'─'.repeat(66)}`);
console.log('CAUSALITY RESULT');
console.log('─'.repeat(66));
console.log(`  A/B divergence:  ${cmp.pct}%   (${cmp.fields.length} of ${cmp.populated} populated fields)`);
console.log(`  A/A2 noise:      ${noise.pct}%   (${noise.fields.length} of ${noise.populated})`);
console.log(`  NOISE-CORRECTED: ${signalFields.length} field(s) moved by the CHOICE and not by resampling`);
for (const f of signalFields.slice(0, 10)) console.log(`     + ${f.cat}.${f.field}`);
for (const [cat, n] of Object.entries(cmp.byCategory)) console.log(`     ${cat.padEnd(13)} ${n} moved`);
for (const f of cmp.fields.slice(0, 8)) console.log(`     ~ ${f.cat}.${f.field}`);
console.log('\n  VERDICT:');
if (!reached) console.log('  THE CHOICE NEVER REACHED THE AUTHOR — nothing above is interpretable.');
else if (cmp.populated < 5) console.log('  INCONCLUSIVE — causal vector nearly empty; it cannot show sameness.');
else if (!comparable) console.log('  INVALID — arms received different instruction sets. Not a causality result.');
else if (signalFields.length === 0) console.log('  INDISTINGUISHABLE FROM MODEL VARIANCE — the choice is decorative.');
else console.log(`  CAUSAL EFFECT LIKELY — ${signalFields.length} field(s) moved by the choice alone.`);
console.log(`\n  total spend: $${spend.toFixed(3)}`);
fs.writeFileSync(`${OUT}/verdict.json`, JSON.stringify(
  { originHash, reached, proseDiffers, payloadDiffers, scDiffers, spend,
    noiseFields: noise.fields.length, abFields: cmp.fields.length, populated: cmp.populated,
    comparable, directiveSets: sets, signalFields: signalFields.map(f => f.cat + '.' + f.field),
    byCategory: cmp.byCategory, gateTrace: A.gateTrace,
    A: { hash: A.scene2Hash, causal: A.causalHash }, B: { hash: B.scene2Hash, causal: B.causalHash } }, null, 1));
await browser.close();
