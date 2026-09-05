// FALLIBLE LENS — the next frontier (Roman 2026-08-04). Not just DIFFERENT lenses but WRONG ones. Fix a GROUND
// TRUTH (Jess is genuinely kind), show the SAME behavior to a hostile observer (Clara) and a warm one (Julian).
// Test: does the hostile lens produce a MISREAD (attributes calculation to genuine care) that reveals the
// OBSERVER, not Jess — while the warm lens reads it accurately? If the gap is revealing → unreliable narration
// / dramatic irony / growth-through-revised-judgment become possible. NOTE: producer-side evidence only
// ("strongly supported"), NOT proof readers re-attribute to the observer (that's the consumer/latency test).
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';

// Ground truth + fixed behavior. Observers DO NOT get the truth — only the behavior, read through their stance.
const BEHAVIOR = 'At dinner Jess leaned toward the waiter, asked how his son was doing, and remembered the boy\'s name from her last visit.';
const OBSERVERS = {
  CLARA_hostile:  'You are Clara. You dislike Jess — she exhausts you, and you are quietly certain everything she does is for effect. You are a little insecure around her. You did NOT see any private proof of her motives; you only saw the moment below and you read it through your dislike.',
  JULIAN_warm:    'You are Julian. You like Jess and think well of her. You only saw the moment below and you read it through your fondness.',
  DEV_neutral:    'You are a detached observer with no feelings about Jess either way. You only saw the moment below.',
};

const SYS = 'You are a first-person narrator. %O\n\nThe moment (the ACTION is fixed; interpret it, do not change it):\n"' + BEHAVIOR + '"\n\nWrite ONE or TWO sentences: narrate this moment in YOUR voice — behavior first, then YOUR read of it. Do NOT state your feelings about Jess or name her psychology; let your VERDICT reveal how you see her. Plain, commercial-novel prose.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const o of Object.keys(OBSERVERS)) {
    let r = null;
    for (let a = 0; a < 2 && !r; a++) {
      r = await page.evaluate(async ({ sys }) => {
        try { const res = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: 'Your narration:' }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 90 }) }); const j = await res.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 10 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys: SYS.replace('%O', OBSERVERS[o]) });
      if (!r) await new Promise(x => setTimeout(x, 3000));
    }
    out[o] = r;
    console.error('\n[' + o + ']\n  ' + (r || 'FAIL'));
    await new Promise(x => setTimeout(x, 1500));
  }
  fs.writeFileSync(DIR + '/fallible.json', JSON.stringify({ groundTruth: 'Jess is genuinely kind; she asked because she cares', behavior: BEHAVIOR, reads: out }, null, 2));
  console.error('\nGROUND TRUTH: Jess is genuinely kind. Does CLARA misread it as performance? Does the gap reveal CLARA?');
  console.error('DONE fallible'); await browser.close(); process.exit(0);
})().catch(e => { console.error('FALLIBLE-ERR', e.message); process.exit(1); });
