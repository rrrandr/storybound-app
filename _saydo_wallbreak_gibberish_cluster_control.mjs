// SAY/DO WALL-BREAKING + GIBBERISH-CLUSTER — DRY CONTROL (Roman, 2026-09-22)
//
// Roman, after the first Say/Do safety-gate pass: "The next pass should be the two gaps this
// surfaced: wall-breaking/meta input is not currently caught well enough; gibberish detection needs
// a more careful 'nonsense cluster' approach, not per-word matching." No paid calls, no prose
// generation, no image work. Tempt/Petition Fate untouched (deferred, per instruction).
//
// WIRED, all in public/app.js, both generic (Storybound's shared Submit path):
//
//   1. _detectWallBreakSignal(text) — new, six categories (ai-identity, model-name-complaint,
//      plot-memory-complaint, game-mechanics, interface, meta-narrative), reusing vocabulary from
//      the literary path's own _llClassifyPlayerInput meta/ooc classifier (which does NOT reach
//      CG — confirmed earlier this session) plus new patterns for the specific gaps Roman named
//      (game-mechanic language, interface references, model-name complaints). Wired into the CG
//      Submit handler as a graceful, non-blocking fallback (same four-bucket design as the prior
//      pass) — NOT a hard block, matches "do not hard-insert these phrases into story canon...
//      route to a graceful fallback."
//
//   2. _detectNonsenseCluster(text) + _keyboardRowAdjacencyRatio/_wordLooksLikeKeyboardMash — new,
//      wired as check (d) INSIDE the shared _detectGibberish itself (not a Say/Do-local bolt-on),
//      so every one of _detectGibberish's existing 4 consumers (literary, diary x2, regular-OAS-
//      turn) benefits too, not just the new Say/Do wiring. Cluster-level, not per-word: a per-word
//      keyboard-ROW-adjacency ratio (not vowel ratio — proven empirically below to be the actual
//      distinguishing signal, not vowel scarcity) combined with a cluster-majority requirement, so
//      one stray short real word can never sink a real sentence around it.
//
// WHY NOT VOWEL RATIO, WHY NOT PER-WORD "DOES THIS WORD LOOK REAL" (both tried and rejected, proven
// below, not asserted): a first attempt scored each word's individual vowel ratio and rejected a
// phrase if any/most words looked "unlikely" — this immediately false-positived on real short
// interjections ("Shh", "Tsk", "Ngh", "Mm-hmm", "Hmph" all have zero vowels and ARE real English
// dialogue) and on real consonant-heavy words ("strengths", "rhythms"). The signal that actually
// separates "asdf qwer blorple zxcvb" from "Shh. Don't move." is not vowel scarcity (both can be
// vowel-sparse) — it's that "asdf"/"qwer"/"zxcvb" are literal QWERTY-keyboard-ROW sequences (a
// PHYSICAL typing-pattern signal), which real interjections and real words are not, even when they
// happen to be short or consonant-heavy.
//
// usage: node _saydo_wallbreak_gibberish_cluster_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 900) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// Real, already-successful Say/Do dialogue from this session's own proven Fate-card attempts —
// reused again here to re-confirm the NEW checks don't disturb what the PRIOR pass already proved
// safe.
const REAL_TEMPTATION_DIALOGUE = 'Let the wind of your breath unravel me, as I’ve unraveled yours by oath.';
const REAL_CONFESSION_DIALOGUE = 'You’re not the one who left me in the braided trees—she was.';
const REAL_SILENCE_DIALOGUE = 'No words—only the rasp of teeth on iron-hard lace, the taste of woodsmoke and iron.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_saydo_wallbreak_gibberish_cluster_control_out.jsonl') });
  // No stubs registered deliberately — direct window.* function calls only; any /api/** call would
  // be a genuine harness bug, and would mean this "no paid calls" pass accidentally spent money.

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state
    && typeof window._detectWallBreakSignal === 'function'
    && typeof window._sayDoWallBreakFallback === 'function'
    && typeof window._detectNonsenseCluster === 'function'
    && typeof window._detectGibberish === 'function'
    && typeof window._sayDoGibberishFallback === 'function'
    && typeof window._detectSayDoSafetySignal === 'function', { timeout: 25000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready or required functions not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });
  console.log('✓ real app reached, all required functions exposed on window\n');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. WALL-BREAKING — all five of Roman\'s named examples now caught and routed gracefully');
  {
    const examples = [
      { text: 'Julian this is an AI game', expectCategory: 'ai-identity' },
      { text: 'open the settings menu', expectCategory: 'interface' },
      { text: 'I roll persuasion', expectCategory: 'game-mechanics' },
      { text: 'Claude messed this up', expectCategory: 'model-name-complaint' },
      { text: 'this app is buggy', expectCategory: 'interface' },
    ];
    for (const ex of examples) {
      const r = await page.evaluate((text) => window._detectWallBreakSignal(text), ex.text);
      ok('"' + ex.text + '" is caught (category: ' + ex.expectCategory + ')', r && r.category === ex.expectCategory, JSON.stringify(r));
      const fb = await page.evaluate((text) => window._sayDoWallBreakFallback(text, 'dialogue'), ex.text);
      ok('"' + ex.text + '" is replaced with the graceful fallback, not blocked and not committed literally', fb === 'a half-formed thought that trails off, unfinished', JSON.stringify(fb));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. WALL-BREAKING — false-positive resistance (real words that could collide)');
  {
    const clean = [
      'the horse pulled the buggy down the lane',   // "buggy" as a real period-fiction noun
      'he rolled over in the grass',                 // "rolled" without a skill-check word
      'Julian rolled his eyes',                       // same
      'I keep my hands folded at my waist',          // ordinary Say/Do
      'the settings of the ancient rite unsettled her', // "settings" without "menu"/"open the"
    ];
    for (const text of clean) {
      const r = await page.evaluate((t) => window._detectWallBreakSignal(t), text);
      ok('"' + text + '" is NOT falsely flagged as wall-breaking', r === null, JSON.stringify(r));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. GIBBERISH CLUSTER — the user\'s own literal example is now routed safely');
  {
    const target = 'asdf qwer blorple zxcvb';
    const raw = await page.evaluate((t) => window._detectGibberish(t), target);
    ok('_detectGibberish now flags "asdf qwer blorple zxcvb" (was a known, documented gap in the prior pass)', raw.gibberish === true, JSON.stringify(raw));
    const fb = await page.evaluate((t) => window._sayDoGibberishFallback(t, 'action'), target);
    ok('the field is replaced with the graceful fallback, not committed as literal nonsense', fb === 'a beat of dazed, wordless hesitation', JSON.stringify(fb));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. GIBBERISH CLUSTER — short valid dialogue does not false-positive (Roman\'s own named case)');
  {
    const legit = [
      "Shh. Don't move.", 'Shh', 'Tsk tsk tsk', 'Ngh', 'Mm-hmm', 'Hmph', 'Ssshhh',
      'Psst come here', 'Brr its cold', 'Grr fine', 'Pfft whatever',
      'strengths and rhythms', 'Wow just wow', 'No. Stop. Now.',
      'Were you here', 'Where were you', 'poor power tower',
      'Get off of me right now', 'Whos there', 'Whats wrong with you',
    ];
    let anyFalsePositive = false;
    for (const text of legit) {
      const r = await page.evaluate((t) => window._detectGibberish(t), text);
      if (r.gibberish) { anyFalsePositive = true; ok('FALSE POSITIVE on legitimate text: "' + text + '"', false, JSON.stringify(r)); }
    }
    ok('zero false positives across ' + legit.length + ' legitimate short-dialogue fixtures (including "Shh. Don\'t move." by name)', !anyFalsePositive);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. GENERICITY — the new gibberish check benefits ALL of _detectGibberish\'s existing consumers, not just Say/Do');
  {
    // _detectGibberish itself is unmodified in its call signature and is the SAME function every
    // existing consumer (literary continuation, Narrative-Marketplace diary x2, regular OAS turn)
    // already calls — proving the fix reaches Say/Do is sufficient to prove it reaches all of them,
    // since there is exactly one function, not a copy.
    const r = await page.evaluate((t) => window._detectGibberish(t), 'qwerty asdfgh zxcvbn');
    ok('a second, independent multi-word mash phrase (not the user\'s own example) is also caught — confirms this is a genuine cluster detector, not overfit to one fixture', r.gibberish === true, JSON.stringify(r));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. WEAK RESPONSES — still behave as weak responses, not gibberish (Roman\'s explicit check)');
  {
    const weak = ["I don't know", 'whatever', '...', 'sure'];
    for (const w of weak) {
      const r = await page.evaluate((t) => ({
        gibberish: window._detectGibberish(t),
        wallBreak: window._detectWallBreakSignal(t),
        safety: window._detectSayDoSafetySignal(t),
      }), w);
      ok('"' + w + '" is not gibberish, not wall-breaking, not hard-blocked — passes through exactly as weak-but-valid', r.gibberish.gibberish === false && r.wallBreak === null && r.safety === null, JSON.stringify(r));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('7. SAFE IN-WORLD STRANGE PHRASING remains allowed (not gibberish, not wall-breaking)');
  {
    const strange = [
      'The Weave-Script hums beneath her skin, alien and old',
      'Fate drag you to the Hole, Julian',
      'the spiralgrass shivers though no wind moves',
    ];
    for (const text of strange) {
      const r = await page.evaluate((t) => ({
        gibberish: window._detectGibberish(t),
        wallBreak: window._detectWallBreakSignal(t),
      }), text);
      ok('in-world strange/invented phrasing "' + text + '" is not falsely flagged by either new check', r.gibberish.gibberish === false && r.wallBreak === null, JSON.stringify(r));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('8. PRESERVED — minor/self-harm/hate still hard-block, exactly as the prior pass proved');
  {
    const minor = await page.evaluate(() => window._detectSayDoSafetySignal('she is a 15 year old schoolgirl'));
    ok('minor sexual content still hard-blocks', minor && minor.category === 'minor', JSON.stringify(minor));
    const selfHarm = await page.evaluate(() => window._detectSayDoSafetySignal('I want to kill myself'));
    ok('self-harm still hard-blocks', selfHarm && selfHarm.category === 'self-harm', JSON.stringify(selfHarm));
    const hate = await page.evaluate(() => window._detectSayDoSafetySignal('you filthy kike'));
    ok('hate speech still hard-blocks', hate && hate.category === 'hate-speech', JSON.stringify(hate));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('9. PRESERVED — safe charged adult content still reaches the relational-obligation path, untouched by either new check');
  {
    const fixtures = [
      { slot: 'temptation (real, attempt 11)', text: REAL_TEMPTATION_DIALOGUE },
      { slot: 'confession (real, attempt 1)', text: REAL_CONFESSION_DIALOGUE },
      { slot: 'silence (real, attempt 3)', text: REAL_SILENCE_DIALOGUE },
    ];
    for (const f of fixtures) {
      const r = await page.evaluate((text) => ({
        gibberish: window._detectGibberish(text),
        wallBreak: window._detectWallBreakSignal(text),
        safety: window._detectSayDoSafetySignal(text),
      }), f.text);
      ok(f.slot + '’s real, already-successful dialogue is untouched by all three checks (gibberish, wall-break, safety)', r.gibberish.gibberish === false && r.wallBreak === null && r.safety === null, JSON.stringify(r));
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('SAY/DO WALL-BREAK + GIBBERISH-CLUSTER CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  try { fs.unlinkSync(path.join(__dirname, '_saydo_wallbreak_gibberish_cluster_control_out.jsonl')); } catch (_) {}
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
