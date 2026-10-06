// REPLAY THE CAPTURED LIVE REPLIES — all of them scene_state:"continue" — and prove the authored
// Dohkar interruption is reachable WITHOUT any reply saying "resolve". Provider-free, $0.
//
// Codex 2026-10-06: "the interruption is unreachable live" was too strong. It was not reached
// within NINE turns. Production has three resolution triggers (app.js:205822/205830/205834):
//     hardCapHit          d.beatCount >= d.hardCap            <- a PRODUCTION path, no resolve needed
//     llmSaysResolve      scene_state === 'resolve' && beat>=6 <- the one the model never gave
//     disengagedThreshold d.userSignals.disengaged >= 2        <- reader-driven, model-classified
// None of the ten captured replies carries user_signal:"disengaged" (all neutral/positive), so the
// path provable with THESE EXACT REPLIES is the hard cap. This replay therefore plays the captured
// replies in order, round-robin, until the app's OWN cap fires.
//
// NOT DOING: no state writes, no direct call to the resolver, no restored afterglow ramp, and the
// turn budget increase is STATED, not silent — the app's cap is 20 beats, so a replay that stops at
// 9 can never reach it.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { findFSDef, launchFS, unlockFS, finalizePreview, enterOAS } from './_fs_story_setup.mjs';
import { canSubmit } from './_oas_submission_guard.mjs';
import { stageOf, isProviderEndpoint } from './_replay_fixtures.mjs';
import { setupStageOf, SETUP_RESPONSES } from './_reader_setup_fixtures.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

// ── THE CAPTURED REPLIES, loaded from the preserved live run ────────────────────────────────
const WIRE = '_fs_live_out/run_2026-10-06T01-17-51-250Z/wire/';
const captured = [];
for (const f of fs.readdirSync(WIRE).filter(x => x.endsWith('_res.json')).sort()) {
  let j; try { j = JSON.parse(fs.readFileSync(WIRE + f, 'utf8')); } catch (_) { continue; }
  let c; try { c = j.choices[0].message.content; } catch (_) { continue; }
  if (!c || c.indexOf('li_dialogue') === -1) continue;
  let p; try { p = JSON.parse(c); } catch (_) { continue; }
  captured.push({ file: f, body: c, state: p.scene_state, signal: p.user_signal });
}
console.log('=== THE PRESERVED LIVE REPLIES ===');
console.log('  loaded ' + captured.length + ' OAS replies from ' + WIRE);
console.log('  scene_state values: ' + JSON.stringify([...new Set(captured.map(c => c.state))]));
console.log('  user_signal values: ' + JSON.stringify([...new Set(captured.map(c => c.signal))]));
t('every captured reply says "continue" — none says "resolve"',
  captured.length >= 10 && captured.every(c => c.state === 'continue'));
t('and none says the reader disengaged, so that path is not available here',
  captured.every(c => c.signal !== 'disengaged'));

const browser = await chromium.launch();
const page = await browser.newPage();
let oasServed = 0;
const consoleLog = [];
page.on('console', m => consoleLog.push(m.text()));
await page.route('**/api/**', async (route) => {
  const req = route.request(); const url = req.url();
  if (/\/api\/config/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ supabaseUrl: 'http://localhost:3000/_h', supabaseAnonKey: 'h' }) });
  if (!isProviderEndpoint(url)) return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, fortunesRemaining: 9999, entitled: true, storypassEligible: true }) });
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let sys = ''; try { sys = String((JSON.parse(raw || '{}').messages || [])[0]?.content || ''); } catch (_) {}
  if (stageOf(sys) === 'oas') {
    // THE CAPTURED REPLIES, IN ORDER, ROUND-ROBIN. Nothing is edited; scene_state stays "continue".
    const pick = captured[oasServed % captured.length]; oasServed++;
    let out = pick.body;
    // CONTROL ARM ONLY (SB_REPLAY_ARM=resolve): the captured reply, with scene_state flipped to
    // "resolve" after beat 6. This is DIAGNOSIS — isolating whether the resolution REASON is what
    // decides the interruption — not the demonstration, which runs on the captured replies as-is.
    if (process.env.SB_REPLAY_ARM === 'resolve' && oasServed > 6) {
      try { const p2 = JSON.parse(pick.body); p2.scene_state = 'resolve'; out = JSON.stringify(p2); }
      catch (_) {}
    }
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: out }) });
  }
  if (/amplify\|ruin\|redirect/.test(sys)) {
    // NEGATIVE ARM (SB_REPLAY_ARM=no-preview): the preview batch returns nothing usable, so the
    // deck's own placeholder is all that ever reaches the inputs. This is the delayed/missing
    // preview case, and the run must BLOCK rather than submit.
    if (process.env.SB_REPLAY_ARM === 'no-preview') {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ content: '' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [
      'TEMPTATION ||| amplify ||| I close the gap until the stone warms ||| Ask me again, slower.',
      'BOUNDARY ||| redirect ||| I set the ledger flat and keep my hand on it ||| Not here.',
      'CONFESSION ||| amplify ||| I turn The Answer so its cut edge faces him ||| I felt it choose.',
      'REVERSAL ||| redirect ||| I put The Answer down and do not let go ||| Ask me whose hands shaped it.',
      'SILENCE ||| ruin ||| I go still and let the clearing finish ||| mm'].join('\n') }) });
  }
  // THE PER-CARD PREVIEW, which the batch branch above does not cover. Without it this reply fell
  // to the default '{}' and the DO field received the literal "{}" — which the OLD lenient gate
  // passed and the strict gate correctly blocks. A fixture gap of mine, not a product defect.
  if (/contextual Say\/Do previews/i.test(sys)) {
    // The negative arm suppresses EVERY preview route, not just the batch.
    if (process.env.SB_REPLAY_ARM === 'no-preview') {
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ content: '' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      content: 'REVERSAL ||| I set The Answer down between us and do not let go '
        + '||| Ask me whose hands shaped it.' }) });
  }
  const st = setupStageOf(sys);
  if (st && SETUP_RESPONSES[st]) return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: JSON.stringify(SETUP_RESPONSES[st]) }) });
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '{}' }) });
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._advanceStagedScene === 'function', { timeout: 30000 });
await page.evaluate(() => { window.state.profileId = 'p'; window.state.fortunes = 9999;
  window.state.storypassEligible = true; window.state.subscribed = true;
  window.state._pcLookSkipped = true; window.state._liRenderSkipped = true; });
const def = await findFSDef(page); await launchFS(page, def);
await page.evaluate(() => { window.state._pcLookSkipped = true; window.state._liRenderSkipped = true; });
await unlockFS(page, 'captured-replay'); await finalizePreview(page);
await page.evaluate(() => { window.state._pcLookSkipped = true; window.state._liRenderSkipped = true; });
await enterOAS(page, { settleMs: 9000 });

const caps = await page.evaluate(() => {
  const d = window.state.intimacyDialogue || {};
  return { softCap: d.softCap, hardCap: d.hardCap, beat: d.beatCount };
});
console.log('');
console.log('=== THE APP\'S OWN CAPS ===');
console.log('  softCap ' + caps.softCap + ' · hardCap ' + caps.hardCap + ' · starting beat ' + caps.beat);
console.log('  THE TURN BUDGET IS RAISED TO ' + (caps.hardCap + 3) + ' — stated, not silent: a replay');
console.log('  that stops at 9 can never reach a cap of ' + caps.hardCap + '.');
const BUDGET = (caps.hardCap || 20) + 3;

// ── PLAY TURNS THROUGH THE PRODUCTION FLOW UNTIL THE APP RESOLVES ITSELF ────────────────────
let turns = 0, resolvedAt = null, blockedAt = null, lastVals = null, wrapUpAt = null;
for (let i = 0; i < BUDGET; i++) {
  const st = await page.evaluate(() => {
    const d = window.state.intimacyDialogue;
    return d ? { active: !!d.active, resolving: !!d._resolving, beat: d.beatCount } : null;
  });
  if (!st || !st.active || st.resolving) { resolvedAt = st ? st.beat : null; break; }
  const deck = await page.evaluate(() => {
    const m = window._activeCardMount ? window._activeCardMount() : null;
    return m ? [...m.querySelectorAll('.fate-card')].filter(e => e.offsetParent !== null
      && !e.classList.contains('locked')).length : 0;
  });
  if (!deck) { await page.waitForTimeout(1500); continue; }
  await page.evaluate(() => { const i2 = window._getActiveTurnInputs();
    if (i2.actInput) i2.actInput.value = ''; if (i2.diaInput) i2.diaInput.value = ''; });
  await page.locator('#gnCardMount .fate-card:not(.locked)').nth(i % deck).click({ timeout: 15000 })
    .catch(() => {});
  // THE SAME GATE THE LIVE RUNNER USES — imported, not re-implemented — and the replay now STOPS
  // ON TIMEOUT instead of clicking Submit regardless. "No placeholder happened in this replay" was
  // not a test that a delayed or missing preview gets blocked (Codex 2026-10-06).
  let gate = { ok: false, reason: 'the preview wait never ran' };
  const dl = Date.now() + 15000;
  while (Date.now() < dl) {
    const vals = await page.evaluate(() => {
      const i2 = window._getActiveTurnInputs();
      return { action: i2.actInput ? i2.actInput.value : '',
        dialogue: i2.diaInput ? i2.diaInput.value : '',
        optionIds: (window.state.fateOptions || []).map(o => String(o.id || '')) };
    });
    gate = canSubmit(vals.action, vals.dialogue, vals.optionIds);
    if (i === 0 && process.env.SB_REPLAY_ARM === 'no-preview') {
      lastVals = vals;   // what actually reached the inputs when no preview was served
    }
    if (gate.ok) break;
    await page.waitForTimeout(400);
  }
  if (!gate.ok) {
    blockedAt = { turn: i + 1, reason: gate.reason };
    console.log('  *** BLOCKED at turn ' + (i + 1) + ' — ' + gate.reason
      + ' — NOT submitting ***');
    break;
  }
  await page.locator('#gnSubmitBtn').click({ timeout: 15000 }).catch(() => {});
  turns++;
  // READER-CONTROLLED ROUTE (SB_REPLAY_ARM=wrap-up): production offers a "Wrap up" pivot from
  // beat 7 (app.js:205870) whose handler calls _resolveIntimacyScene('user_pivot_end'). That is a
  // reader interaction, not a forced resolution — the reader decides the exchange is finished.
  if (process.env.SB_REPLAY_ARM === 'wrap-up') {
    await page.waitForTimeout(2000);
    const wrap = page.locator('.intimacy-pivot-btn[data-pivot="end"]');
    if (await wrap.count() && await wrap.first().isVisible().catch(() => false)) {
      wrapUpAt = turns;
      console.log('  reader clicks "Wrap up" after ' + turns + ' turns');
      await wrap.first().click({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2500);
      break;
    }
  }
  await page.waitForTimeout(2200);
}

// WAIT FOR THE RESOLUTION TO FINISH. _resolveIntimacyScene defers through setTimeout(1800) and
// then mounts the interruption inside a FURTHER setTimeout that first sets
// state.intimacyDialogue = null (app.js:208023-208043). My first measurement ran before that
// timer fired — the probe still saw the dialogue object — so "the interruption did not mount" was
// a measurement error of mine, not a product finding. Wait for the dialogue to be torn down, then
// give the mount its own window.
{
  const dl = Date.now() + 60000;
  while (Date.now() < dl) {
    const st = await page.evaluate(() => ({
      gone: !window.state.intimacyDialogue,
      intr: !!window.state._intimateInterruption
    }));
    if (st.intr) break;
    if (st.gone) { await page.waitForTimeout(3000); break; }
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(2000);
}

const after = await page.evaluate(() => {
  const d = window.state.intimacyDialogue;
  const intr = window.state._intimateInterruption;
  return {
    dialogueGone: !d || !d.active,
    beat: d ? d.beatCount : null,
    interruptionPresent: !!intr,
    interruptionSubmitted: !!(intr && intr.submitted),
    archive: Object.keys(window.state._oasSceneSnapshots || {}).length,
    exchangeMounted: !!document.querySelector('#intimateInterruptionHost, .intimate-interruption'),
    decisionNeeded: (typeof window._sceneDecisionNeeded === 'function')
      ? !!window._sceneDecisionNeeded() : null
  };
});
console.log('');
console.log('=== AFTER ' + turns + ' REPLAYED TURNS (every reply said "continue") ===');
console.log('  ' + JSON.stringify(after));
const resolveLine = consoleLog.filter(l => /INTIMACY.*resolv|reason.*cap|_resolveIntimacy/i.test(l)).slice(-2);
resolveLine.forEach(l => console.log('  | ' + l.slice(0, 150)));
// WHY DID THE INTERRUPTION NOT MOUNT? Read the gate's own diagnostic rather than guessing.
const twoPath = consoleLog.filter(l => /OAS:TWO-PATH/.test(l));
console.log('  [OAS:TWO-PATH] lines: ' + twoPath.length);
twoPath.slice(-3).forEach(l => console.log('  | ' + l.slice(0, 180)));
const frame = await page.evaluate(() => {
  const d = window.state.intimacyDialogue;
  const snaps = window.state._oasSceneSnapshots || {};
  const k = Object.keys(snaps)[0];
  const arch = k ? snaps[k] : null;
  return {
    dialogueStillThere: !!d,
    authoredFrameOnDialogue: d ? !!(d._authoredFrame) : null,
    interruptionOnFrame: d && d._authoredFrame ? !!d._authoredFrame.interruption : null,
    phase: d ? d.phase : null,
    oasInterruptionOff: window._oasInterruptionOff === true,
    archivedFrameHadInterruption: arch ? !!(arch.authoredFrame && arch.authoredFrame.interruption) : null
  };
});
console.log('  frame state: ' + JSON.stringify(frame));
// THE RESOLUTION TAIL, verbatim. Which branch actually ran — the authored interruption, or the
// afterglow carry-forward that only runs when _intr came back null?
const tail = consoleLog.filter(l => /INTIMACY|OAS:|afterglow|interrupt|Afterglow/i.test(l)).slice(-14);
console.log('  --- resolution tail ---');
tail.forEach(l => console.log('  | ' + l.slice(0, 165)));

if (process.env.SB_REPLAY_ARM === 'no-preview') {
  console.log('');
  console.log('=== NEGATIVE ARM: THE PREVIEW NEVER ARRIVES ===');
  console.log('  blockedAt: ' + JSON.stringify(blockedAt));
  console.log('  what reached the inputs with NO preview served:');
  console.log('    DO : ' + JSON.stringify(String((lastVals||{}).action || '').slice(0,90)));
  console.log('    SAY: ' + JSON.stringify(String((lastVals||{}).dialogue || '').slice(0,90)));
  console.log('  OAS author calls served: ' + oasServed);
  t('the run BLOCKED instead of submitting', !!blockedAt, 'blockedAt=' + JSON.stringify(blockedAt));
  t('and the block names a placeholder or missing suggestion',
    !!(blockedAt && /placeholder|usable|empty/.test(blockedAt.reason)),
    blockedAt ? blockedAt.reason : '');
  t('NO OAS AUTHOR CALL was spent on a placeholder', oasServed <= 1,
    'author replies served: ' + oasServed + ' (1 is the opener)');
  fs.mkdirSync('_audit_out/replay', { recursive: true });
  fs.writeFileSync('_audit_out/replay/no_preview_arm.json',
    JSON.stringify({ blockedAt, oasServed, turns }, null, 2));
  await browser.close();
  console.log('');
  console.log(pass + '/' + (pass + fail) + ' checks passed');
  process.exit(fail ? 1 : 0);
}

if (process.env.SB_REPLAY_ARM === 'wrap-up') {
  console.log('');
  console.log('=== READER-CONTROLLED ROUTE: THE "Wrap up" PIVOT ===');
  console.log('  clicked after ' + wrapUpAt + ' turns · ' + JSON.stringify(after));
  const arch = consoleLog.find(l => /OAS:ARCHIVE. Snapshot saved/.test(l)) || '';
  console.log('  ' + arch.slice(0, 120));
  t('the reader could end the exchange without waiting for the cap', !!wrapUpAt && wrapUpAt < 20,
    'wrapUpAt=' + wrapUpAt);
  t('it resolved via user_pivot_end, not the cap', /reason=user_pivot_end/.test(arch),
    arch.slice(0, 120));
  t('THE AUTHORED DOHKAR INTERRUPTION MOUNTED on the reader\'s own exit',
    after.interruptionPresent === true);
  fs.mkdirSync('_audit_out/replay', { recursive: true });
  fs.writeFileSync('_audit_out/replay/wrap_up_arm.json',
    JSON.stringify({ wrapUpAt, after, archive: arch }, null, 2));
  await browser.close();
  console.log('');
  console.log(pass + '/' + (pass + fail) + ' checks passed');
  process.exit(fail ? 1 : 0);
}

t('the OAS RESOLVED without any reply saying "resolve"', after.dialogueGone === true,
  'beat ' + after.beat + ' of hardCap ' + caps.hardCap);
// The dialogue is torn down by the time this runs, so after.beat is null — read the reason from
// the ARCHIVE line the app itself wrote, which records the beat count and the reason.
const archLine = consoleLog.find(l => /OAS:ARCHIVE. Snapshot saved/.test(l)) || '';
const archBeats = Number((archLine.match(/(\d+) beats/) || [])[1] || 0);
const archReason = (archLine.match(/reason=(\w+)/) || [])[1] || null;
t('it resolved via the app\'s OWN hard cap',
  archReason === 'cap' && archBeats >= (caps.hardCap || 20),
  'archive line: ' + archLine.slice(0, 110));
t('THE AUTHORED DOHKAR INTERRUPTION MOUNTED', after.interruptionPresent === true);
t('and the OAS was archived', after.archive >= 1, 'archive=' + after.archive);

// ── INTERRUPTION -> SUBMISSION -> AUTHORED DECISION -> SCENE 2 REQUEST ──────────────────────
// The handoff, driven through the reader's own controls, on captured continue-only replies.
if (after.interruptionPresent) {
  console.log('');
  console.log('=== THE HANDOFF, ON CAPTURED continue-ONLY REPLIES ===');
  // the reader's words at the interruption, through its own inputs
  await page.evaluate(() => {
    const i2 = window._getActiveTurnInputs();
    if (i2.actInput) { i2.actInput.disabled = false; i2.actInput.value = 'I keep my hand on The Answer.';
      i2.actInput.dispatchEvent(new Event('input', { bubbles: true })); }
    if (i2.diaInput) { i2.diaInput.disabled = false; i2.diaInput.value = 'Ask me whose hands shaped it.';
      i2.diaInput.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await page.locator('#gnSubmitBtn').click({ timeout: 15000 }).catch(e =>
    console.log('  submit error: ' + String(e.message).split('\n')[0]));
  let intrState = null;
  { const dl = Date.now() + 45000;
    while (Date.now() < dl) {
      intrState = await page.evaluate(() => {
        const r = window.state._intimateInterruption;
        return { submitted: !!(r && r.submitted),
          decisionNeeded: (typeof window._sceneDecisionNeeded === 'function')
            ? !!window._sceneDecisionNeeded() : null,
          promptMounted: !!document.getElementById('sceneDecisionPrompt'),
          recorded: ((window.state._sceneDecisions || {})['1'] || null) };
      });
      if (intrState.submitted) break;
      await page.waitForTimeout(1000);
    } }
  console.log('  after submission: ' + JSON.stringify(intrState));
  t('THE INTERRUPTION WAS SUBMITTED through the reader\'s own control',
    intrState && intrState.submitted === true);
  t('and the authored decision is recorded or its prompt is mounted',
    !!(intrState && (intrState.recorded || intrState.promptMounted)),
    JSON.stringify(intrState));

  // service the decision if a prompt is up, then watch for a SCENE 2 request on the wire
  if (intrState && intrState.promptMounted) {
    await page.locator('#sceneDecisionA').click({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }
  const dec = await page.evaluate(() => ({
    needed: (typeof window._sceneDecisionNeeded === 'function') ? !!window._sceneDecisionNeeded() : null,
    recorded: ((window.state._sceneDecisions || {})['1'] || null)
  }));
  console.log('  decision: ' + JSON.stringify(dec));
  t('the authored decision is recorded and the gate closed',
    !!(dec.recorded && dec.recorded.choice) && dec.needed === false, JSON.stringify(dec));

  // A SCENE 2 REQUEST — the planner/author stage asking for the next scene.
  let sceneReq = false;
  { const dl = Date.now() + 90000;
    while (Date.now() < dl) {
      sceneReq = consoleLog.some(l => /SCENE-ASSIGNMENT. scene=2|TIERED:scenePlanner|CG:SCREENPLAY/i.test(l));
      if (sceneReq) break;
      await page.waitForTimeout(2000);
    } }
  const which = consoleLog.filter(l => /SCENE-ASSIGNMENT. scene=2|TIERED:scenePlanner|CG:SCREENPLAY/i.test(l)).slice(0, 2);
  which.forEach(l => console.log('  | ' + l.slice(0, 150)));
  t('A SCENE 2 REQUEST WAS ISSUED after the decision', sceneReq,
    'no planner or author dispatch for scene 2 was observed');
}

fs.mkdirSync('_audit_out/replay', { recursive: true });
fs.writeFileSync('_audit_out/replay/captured_replay.json',
  JSON.stringify({ caps, turns, after, oasServed, blockedAt, captured: captured.map(c => ({
    file: c.file, state: c.state, signal: c.signal })) }, null, 2));
await browser.close();
console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
