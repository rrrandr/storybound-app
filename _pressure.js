// THE FINAL ALGORITHM (Roman 2026-08-04). 1) Put the character under PRESSURE (not "generate overcompensation" —
// that makes everyone perform). 2) Search the tiny thing they can't help doing that reality didn't require — ANY
// leak (overcompensate / avoid / imitate / ritual / easiest-thing-to-look-at). 3) REJECT anything that feels
// DESIGNED to characterize; keep only what feels ACCIDENTALLY WITNESSED (a sibling's catch, not a writer's
// invention) — the anti-AI keystone. 4) Favor one strangely specific detail nobody would invent unless they'd
// lived with this person for YEARS (INTIMACY, not history). 5) Narrator says the most interesting thing they
// genuinely think — never explain the person, never explain where the detail came from. Test: caught-not-authored + varied leaks?
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';

const SITUATIONS = {
  MEETING_FRIENDS: 'A woman meeting her new boyfriend\'s polished, old-friend group for the first time, at a dinner.',
  WEDDING_TOAST:   'A man about to give a toast at a wedding, among people far more articulate than he is.',
  REUNION:         'A woman back at her small-town high-school reunion after "making it" in the city.',
  INTERVIEW:       'A man in a job interview for a role a level above what he\'s ever done.',
};

const NOTICE_SYS = 'Watch this person in the situation below; they are under quiet pressure. NOTICE six tiny things they do that reality did NOT require — not because they are quirky, but because they cannot quite help it. Include a RANGE of KINDS: some overcompensating, some avoiding, some imitating someone, some an automatic ritual, some just looking at the easiest thing in the room.\nCRUCIAL: reject anything that feels DESIGNED to characterize them (a sitcom moment, a "personality gimmick", an "always…"). Keep ONLY what feels ACCIDENTALLY WITNESSED — the way a sibling who has watched them for years would catch it, not the way a writer would invent it. Behavior only, no psychology. Number 1-6.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const call = (sys, user, tok) => page.evaluate(async ({ sys, user, tok }) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 1.0, max_tokens: tok }) }); const j = await r.json(); return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); } catch (e) { return 'ERR:' + e.message; } }, { sys, user, tok });

  const SELECT_SYS = 'Here are six things noticed about a person:\n%SLATE%\n\nPick the ONE that feels most ACCIDENTALLY WITNESSED (caught, not authored) AND that carries — or can carry — one strangely specific, WORLD-APPROPRIATE detail nobody would invent unless they had lived with this person for YEARS (a sibling\'s detail, like "the lobster thermidor she\'d only ever heard of" — not a psychologist\'s). Then let the narrator add the single most interesting thing they GENUINELY think after seeing it — any form (deadpan / wry / reframe / a few extra words), never a formula, never explaining the person, never explaining where the detail came from (the reader supplies that). Output ONLY the final 1-2 sentence introduction.';

  const out = {};
  for (const s of Object.keys(SITUATIONS)) {
    const slate = await call(NOTICE_SYS, 'Situation: ' + SITUATIONS[s] + '\n\nSix things:', 260);
    await new Promise(r => setTimeout(r, 1200));
    const final = await call(SELECT_SYS.replace('%SLATE%', slate), 'The introduction:', 90);
    out[s] = { slate, final };
    console.error('\n═══════ ' + s + ' ═══════\nSLATE:\n' + slate + '\n\n  → ' + final);
    await new Promise(r => setTimeout(r, 1500));
  }
  fs.writeFileSync(DIR + '/pressure.json', JSON.stringify(out, null, 2));
  console.error('\nDONE pressure'); await browser.close(); process.exit(0);
})().catch(e => { console.error('PRESSURE-ERR', e.message); process.exit(1); });
