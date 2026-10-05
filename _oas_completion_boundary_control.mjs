// THE THREE BOUNDARIES, DEMONSTRATED. Provider-free, $0.
//
// Codex found the runner's gates were wrong in ways that could not fail safely:
//   · beatCount increments BEFORE the model is called (app.js:204238), so waiting on it waits
//     for a REQUEST, not a REPLY;
//   · the interruption gate read _intimateInterruptionSubmitted, a field production never sets
//     (it is state._intimateInterruption.submitted, app.js:208246);
//   · a bare route.fetch keeps its own 30s default no matter what it is raced against.
// These cases pin all three.
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!window.state, { timeout: 30000 });

console.log('=== OAS COMPLETION BOUNDARIES (provider-free, $0) ===\n');

console.log('1. THE PRODUCTION FACTS the gates must be written against');
{
  const r = await page.evaluate(async () => {
    const src = await (await fetch('/app.js?probe=1')).text();
    const i = src.indexOf('d.beatCount++');
    const before = src.slice(Math.max(0, i - 2600), i);
    return {
      beatCountExists: i > 0,
      // Is the model call AFTER the increment? Look for the dispatch below it.
      // Scope the search to the OAS handler that owns the increment, not an arbitrary window.
      dispatchAfter: /roleTag:\s*'oas-turn'/.test(src.slice(i, i + 60000)),
      dispatchBefore: /(_authorFullScenePolicy|callChatGPT)/.test(before.slice(-1200)),
      historyPushHasDialogue: /liTurnHistory\.push\(\{[\s\S]{0,400}liDialogue/.test(src),
      submittedField: /r\.submitted = true/.test(src),
      wrongField: /_intimateInterruptionSubmitted/.test(src)
    };
  });
  t('beatCount++ exists in production', r.beatCountExists);
  t('THE MODEL DISPATCH COMES AFTER IT — so the counter is a request, not a reply',
    r.dispatchAfter, 'the increment would then be a safe completion signal, and it is not');
  t('liTurnHistory.push carries liDialogue — the real completion signal',
    r.historyPushHasDialogue);
  t('production sets r.submitted (state._intimateInterruption.submitted)', r.submittedField);
  t('production has NO _intimateInterruptionSubmitted field — the old gate read nothing',
    r.wrongField === false,
    'that field exists after all; the old gate may have been readable');
}

console.log('\n2. A DELAYED REPLY — beatCount advances, no reply lands');
{
  const r = await page.evaluate(async () => {
    // Model the exact shape: the counter moves at request time; history does not.
    const d = { active: true, _resolving: false, beatCount: 3, liTurnHistory: [
      { userInput: 'a', liDialogue: 'one' }, { userInput: 'b', liDialogue: 'two' } ] };
    const read = () => ({ beats: d.beatCount, replies: d.liTurnHistory.length,
      lastHasDialogue: !!(d.liTurnHistory[d.liTurnHistory.length - 1] || {}).liDialogue });
    const pre = read();
    d.beatCount++;                       // the request goes out
    const midFlight = read();
    // A counter-based gate would call this complete. A reply-based gate must not.
    const counterSaysDone = midFlight.beats > pre.beats;
    const replySaysDone = midFlight.replies > pre.replies && midFlight.lastHasDialogue;
    d.liTurnHistory.push({ userInput: 'c', liDialogue: 'three' });   // the reply finally lands
    const after = read();
    const replySaysDoneNow = after.replies > pre.replies && after.lastHasDialogue;
    return { counterSaysDone, replySaysDone, replySaysDoneNow };
  });
  t('a counter-based gate WOULD have passed mid-flight', r.counterSaysDone === true);
  t('THE REPLY-BASED GATE DOES NOT PASS MID-FLIGHT', r.replySaysDone === false,
    'the runner would again call a request a completed turn');
  t('and it passes once the reply actually lands', r.replySaysDoneNow === true);
}

console.log('\n3. AN EMPTY REPLY does not count as a landed reply');
{
  const r = await page.evaluate(() => {
    const h = [{ liDialogue: 'one' }, { liDialogue: '' }];
    const last = h[h.length - 1];
    return { lastHasDialogue: !!(last && last.liDialogue) };
  });
  t('an entry with no dialogue is not a completed turn', r.lastHasDialogue === false);
}

console.log('\n4. THE RUNNER reads the fields production actually writes');
{
  const fsMod = await import('fs');
  const raw = fsMod.readFileSync('_fs_live_sequence.mjs', 'utf8');
  // SCAN CODE, NOT COMMENTS. The fix's own explanation names the dead field on purpose, and a
  // checker that cannot tell the two apart fails on its own documentation — the same trap that
  // caught me on the _smallAuthor control.
  const src = raw.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  t('it reads state._intimateInterruption.submitted',
    /_intimateInterruption/.test(src) && /\.submitted/.test(src));
  t('it no longer reads the non-existent _intimateInterruptionSubmitted',
    !/_intimateInterruptionSubmitted/.test(src));
  t('it waits on liTurnHistory replies, not beatCount',
    /now\.replies > pre\.replies/.test(src) && /lastHasDialogue/.test(src));
  t('it does NOT gate on the beat counter advancing',
    !/now\.beats > pre\.beats/.test(src));
  t('THE TIMEOUT IS PASSED TO route.fetch ITSELF',
    /route\.fetch\(\{\s*timeout:/.test(src),
    'a bare route.fetch keeps its 30s default whatever it is raced against');
  t('it drives the real submission controls (#gnSubmitBtn)',
    /gnSubmitBtn/.test(src) && /gnActionInput/.test(src));
  // SUPERSEDED: the runner no longer calls the internal OAS handler at all. Codex required
  // submission through the reader's own control, so the contract is now "clicks #gnSubmitBtn and
  // FAILS if that click fails" — a stronger property than inspecting a return value.
  t('it submits through the reader control, not the internal handler',
    /#gnSubmitBtn/.test(src) && !/_intimacyDialogueConsumeInput/.test(src));
  t('and a failed submit halts the run', /submit control failed/.test(src));
}

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
