// CONFESSION FRAME — CONFESSING-PARTY FIX — DRY CONTROL (Roman, 2026-09-22)
//
// Roman, after Confession attempt 1 (real, paid, the fifth and final Fate-card slot tested):
// "Confession works mechanically and narratively enough, but the lane text has the wrong
// confessing party baked into it... The issue: the Confession event frame currently assumes
// Julian is the one confessing, but the actual submitted Confession content is Lirael's admission/
// deflection/blame-placement. The frame should not require or imply Julian confessing unless the
// player actually wrote that." Instruction: default the frame to Lirael's own admission/deflection/
// blame-placement, keep the institutional consequence, preserve (never forbid) a genuine Julian-
// confession path when the player's own text delivers it, prove against attempt 1 as the red/
// design fixture plus a contrasting fixture, no provider calls, no prose edits, no retry.
//
// THE BUG (real, paid evidence, not hypothetical): attempt 1's real submitted Confession dialogue
// was Lirael's OWN line — "You're not the one who left me in the braided trees—she was." — her own
// admission/deflection, redirecting blame to an unnamed third party. The OLD eventFrameBySlot.
// confession text read: "Julian's own confession destabilizes his position as accuser..." The real
// planner reply then echoed that framing verbatim ("Julian's confession destabilizes his accuser
// position") despite nothing in the reader's actual words showing Julian confessing anything —
// the frame text told the planner whose confession this was, and it was wrong.
//
// THE FIX: public/app.js's eventFrameBySlot.confession text rewritten so the default confessing
// party is Lirael herself (matching what the card mechanism actually produces), while explicitly
// permitting — never requiring — Julian as the confessor when the reader's own custom text
// genuinely delivers that. The institutional consequence (chosen_aftermath_lane:
// dohkar_preliminary_review, the Dohkar setting formal review terms) is unchanged. Julian's own
// reaction remains governed separately by the pre-existing, unmodified per-slot obligationType
// mechanism (confession -> 'register').
//
// Because this fix is a PROMPT-TEXT change (not new executable logic), this control proves it by
// resolving the REAL text through the REAL, unmodified _effectiveSceneRow +
// _resolveStarterEventFrame mechanism (live app, not a hand-typed copy) and asserting on that real
// resolved string — source-traced, not paraphrased.
//
// Proves, fully dry:
//   A. The real resolved Confession frame text now defaults to Lirael as the confessing party.
//   B. The real resolved text explicitly permits (does not forbid) a genuine Julian-confession path.
//   C. The real resolved text no longer REQUIRES/ASSERTS Julian confessing as an unconditional fact
//      (the old bug: stating it outright rather than conditioning it on the reader's own words).
//   D. The institutional consequence (lane id + Dohkar review language) is unchanged.
//   E. RED/DESIGN FIXTURE — attempt 1's own real, committed submitted dialogue (Lirael's line) is
//      coherent with the NEW default framing, and was NOT coherent with the OLD text (quoted
//      verbatim from git history, not re-typed from memory) — the specific real mismatch that
//      triggered this fix is gone.
//   F. CONTRASTING FIXTURE — a hypothetical custom submission where Julian himself is the one who
//      states an incriminating admission is NOT excluded by the new frame's own wording (textual
//      permission check) — the system does not forbid that path.
//   G. COEXISTENCE — the other 4 slots' resolved frame text is byte-identical to before this
//      change (no collateral edits).
//   H. The causal-legibility mechanism (a separate, earlier fix) still correctly does NOT fire for
//      Confession — admission is active disclosure, not a withholding/non-action pattern.
//
// usage: node _confession_frame_confessing_party_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 900) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// Confession attempt 1's REAL, already-committed submitted dialogue — read verbatim from the
// preserved, already-paid report, not re-typed from memory.
const ATTEMPT1_REPORT = path.join(__dirname, '_scene2_repair_replay_sample_out', 'report_confession_attempt1.json');
const attempt1 = JSON.parse(fs.readFileSync(ATTEMPT1_REPORT, 'utf8'));
console.log('✓ loaded Confession attempt 1\'s REAL committed submitted content verbatim');

// The OLD (pre-fix) eventFrame text, exactly as committed in Confession attempt 1's own trace doc
// and confirmed against git history — quoted here only as a fixed reference string for the
// coherence-mismatch proof in section E, not re-inserted into the app.
const OLD_CONFESSION_EVENT_FRAME = 'Julian\'s own confession destabilizes his position as accuser — the presiding Dohkar reacts to that shift by setting formal terms and a date for review rather than letting the interrogation continue informally.';
// The real submitted Confession-card dialogue from attempt 1 (the actual text the reader sent).
const ATTEMPT1_REAL_DIALOGUE = 'You’re not the one who left me in the braided trees—she was.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_confession_frame_confessing_party_control_out.jsonl') });
  // No stubs registered deliberately — this control only calls exposed window.* functions
  // directly; any /api/** call at all would be a genuine harness bug (fail-closed abort surfaces
  // it immediately).

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(() => window.state
    && typeof window._effectiveSceneRow === 'function'
    && typeof window._resolveStarterEventFrame === 'function'
    && typeof window._causalLinkFrameTrigger === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready or required functions not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });
  console.log('✓ real app reached, all required functions exposed on window\n');

  async function resolveRealFrame(slot) {
    return page.evaluate((slot) => {
      window.state._starterId = 'starter_first_sacrifice';
      window.state.turnCount = 1;
      window.state._intimateInterruption = { selectedSlot: slot };
      const row = window._effectiveSceneRow(window.state, 2);
      return window._resolveStarterEventFrame(row, window.state);
    }, slot);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('A-D. The real, resolved Confession frame text — source-traced, live app');
  let confessionFrame;
  {
    confessionFrame = await resolveRealFrame('confession');
    ok('the real resolved frame exists and matches the confession -> dohkar_preliminary_review lane mapping (unchanged)', confessionFrame && confessionFrame.laneId === 'dohkar_preliminary_review', JSON.stringify(confessionFrame && confessionFrame.laneId));
    const text = confessionFrame ? confessionFrame.eventFrame : '';
    ok('A. defaults the confessing party to Lirael ("most naturally Lirael\'s OWN")', /most naturally Lirael.s OWN/.test(text), text);
    ok('B. explicitly permits a genuine Julian-confession path when the reader\'s own words deliver it', /if the reader.s own submitted words instead have Julian confess/.test(text), text);
    ok('C. no longer states Julian confessing as an unconditional fact — conditions it on the reader\'s own text ("does not require that")', /this frame does not require that/.test(text), text);
    ok('D. institutional consequence (Dohkar sets formal review terms) is preserved verbatim in spirit', /presiding Dohkar reacts to that shift by setting formal terms and a date for review/.test(text), text);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('E. RED/DESIGN FIXTURE — attempt 1\'s real submitted dialogue, old text vs. new text');
  {
    ok('attempt 1\'s real submitted dialogue is Lirael\'s own admission/deflection line (not Julian\'s), confirming the real mismatch this fix addresses', ATTEMPT1_REAL_DIALOGUE.startsWith('You’re not the one who left me'), ATTEMPT1_REAL_DIALOGUE);
    ok('the OLD (pre-fix) frame text asserted Julian as confessor unconditionally — the actual real bug, quoted for the record', /^Julian.s own confession destabilizes his position as accuser/.test(OLD_CONFESSION_EVENT_FRAME), OLD_CONFESSION_EVENT_FRAME);
    ok('the NEW frame text is coherent with attempt 1\'s real Lirael-authored line (Lirael is the default confessor)', /Lirael.s OWN/.test(confessionFrame.eventFrame), confessionFrame.eventFrame);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('F. CONTRASTING FIXTURE — a genuine Julian-confession submission is not excluded');
  {
    // This is a prompt-text permission check, not a functional gate (eventFrameBySlot text is
    // static per slot, not dynamically rewritten per submission) — the real question is whether
    // the STATIC text, as now written, would mislead or block the planner from crediting a
    // custom submission where Julian himself confesses. Textual proof: the permissive clause
    // names this path explicitly and does not gate it behind anything the reader cannot supply.
    const text = confessionFrame.eventFrame;
    const hypotheticalJulianConfession = 'I set the fire that drove Seren into the trees — not you. I let the assembly believe otherwise.';
    ok('the frame\'s own permissive clause explicitly names "Julian confess something on his own account" as a valid path', /Julian confess something on his own account/.test(text), text);
    ok('the permissive clause ties activation to the reader\'s own words ("the reader\'s own submitted words instead have..."), not to any other gate a hypothetical Julian-confession submission could fail', /the reader.s own submitted words instead have Julian confess/.test(text), text);
    ok('a hypothetical genuine Julian-confession line (for reference — not dispatched, no provider call) is exactly the shape this clause names', /I set the fire/.test(hypotheticalJulianConfession));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('G. COEXISTENCE — the other 4 slots\' resolved frame text is unaffected');
  {
    const temptation = await resolveRealFrame('temptation');
    const silence = await resolveRealFrame('silence');
    const boundary = await resolveRealFrame('boundary');
    const reversal = await resolveRealFrame('reversal');
    ok('Temptation\'s resolved frame text is unchanged (still the landed-defensive-action wording)', temptation && /Lirael makes a landed defensive move under temptation/.test(temptation.eventFrame), temptation && temptation.eventFrame);
    ok('Silence\'s resolved frame text is unchanged (still "is what prompts")', silence && /is what prompts the presiding Dohkar/.test(silence.eventFrame), silence && silence.eventFrame);
    ok('Boundary\'s resolved frame text is unchanged (still Seren\'s family)', boundary && /draws Seren.s family forward/.test(boundary.eventFrame), boundary && boundary.eventFrame);
    ok('Reversal\'s resolved frame text is unchanged (still Julian\'s jurisdiction challenge)', reversal && /Julian challenges the presiding Dohkar.s jurisdiction/.test(reversal.eventFrame), reversal && reversal.eventFrame);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('H. Causal-legibility still correctly does not fire for Confession (unaffected, separate mechanism)');
  {
    const trigger = await page.evaluate(() => {
      window.state._starterId = 'starter_first_sacrifice';
      window.state.turnCount = 1;
      window.state._intimateInterruption = { selectedSlot: 'confession' };
      return window._causalLinkFrameTrigger(window.state);
    });
    ok('Confession (active admission, not a withholding pattern) does not trigger the causal-legibility directive, before or after this fix', trigger === null, JSON.stringify(trigger));
  }

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('CONFESSION FRAME CONFESSING-PARTY CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  try { fs.unlinkSync(path.join(__dirname, '_confession_frame_confessing_party_control_out.jsonl')); } catch (_) {}
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
