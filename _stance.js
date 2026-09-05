// STANCE IS THE AXIS, NOT "the narrator accuses" (Roman 2026-08-04). Accusation is a property of STANCE, not of
// narration. Separate two knobs: CHARACTER GENERATOR (fear→overcompensation→behavior) vs NARRATOR LENS
// (warm/cool/cynical/envious/amused/contemptuous). Test: ONE fixed behavior, 6 stances → does the SAME action
// become 6 different social verdicts (vanity / charm / charisma / resentment / no-verdict / wry)? If yes, the
// interpretation is STANCE-FILTERED, and the same character reads differently through different observers
// (reputation-not-personality; POV superpower). Reconnects to Character+ = the observer LENS.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';

const BEHAVIOR = 'Jess took the long way across the crowded room, and every head turned to follow her.';
const STANCES = {
  HOSTILE:     'You dislike Jess. You read her as vain, always performing.',
  WARM:        'You like Jess. You find her genuinely charming, at ease with herself.',
  INFATUATED:  'You are a little in love with Jess. Everything she does looks like grace.',
  JEALOUS:     'You envy Jess. You resent how easily attention finds her.',
  COOL:        'You are a detached, Chekhovian narrator. You report; you pass no verdict.',
  AMUSED:      'You find Jess funny and endearing, a bit of a show, and you enjoy it.',
};

const SYS = 'You are the first-person narrator of a novel. Your STANCE toward Jess (do NOT state it, let the VERDICT reveal it):\n%S\n\nJess just did this (the fact is fixed; you may restate or imply it, but the ACTION does not change):\n"' + BEHAVIOR + '"\n\nWrite ONE sentence — your interpretation of that behavior, colored ENTIRELY by your stance, so the SAME action reads the way YOU see it. Behavior-first is fine; interpret the BEHAVIOR, not her psychology (do NOT name her feelings or yours). Plain, one sentence, the kind that could appear in a commercial novel.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const s of Object.keys(STANCES)) {
    let o = null;
    for (let a = 0; a < 2 && !o; a++) {
      o = await page.evaluate(async ({ sys }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: 'Your one sentence:' }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 70 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 10 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys: SYS.replace('%S', STANCES[s]) });
      if (!o) await new Promise(r => setTimeout(r, 3000));
    }
    out[s] = o;
    console.error('\n[' + s + ']\n  ' + (o || 'FAIL'));
    await new Promise(r => setTimeout(r, 1500));
  }
  fs.writeFileSync(DIR + '/stance.json', JSON.stringify(out, null, 2));
  console.error('\nDONE stance'); await browser.close(); process.exit(0);
})().catch(e => { console.error('STANCE-ERR', e.message); process.exit(1); });
