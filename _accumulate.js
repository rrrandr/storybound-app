// THE LIVING ENGINE (Roman 2026-08-03). The real target isn't the smallest STATIC description of a character —
// it's the smallest PROCESS that lets a character UPDATE without becoming a different person. Test: Fox's
// primitive is "everyone is performing." He watches ONE person (Jess) across a continuing scene whose beats
// PROGRESSIVELY CONTRADICT that read. The running read is carried forward as context (that IS the process).
// PASS: (1) Fox stays recognizably Fox the whole way (cynical, status-reading, resists); (2) his read genuinely
// UPDATES — resists, accumulates doubt, eventually CONCEDES "maybe she wasn't performing," ideally at a cost.
// FAIL-static: he says "performing" at every beat (dead engine). FAIL-nochar: he flips instantly / stops being Fox.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/accumulate';
fs.mkdirSync(DIR, { recursive: true });

const SYS = 'You are Rowan, first-person narrator. Your brain cannot stop completing partial evidence into one recurring read: everyone is PERFORMING — for status, approval, manipulation, or self-protection; every gesture is staged for an audience. You never announce this tendency; you just see the world this way, and you narrate CONCLUSIONS, not observations (give the verdict, imply the act).\n\nBUT you are a real mind, not a stuck record. You are watching ONE woman, Jess, across an evening, and you REMEMBER what you have already concluded about her. Each new thing she does either confirms your read or CHALLENGES it. Update like an actual person: resist at first, get annoyed when the evidence won\'t fit, hold your cynicism as long as you honestly can — and if it genuinely stops fitting, let it cost you to admit it. Never abandon WHO YOU ARE (you stay dry, wary, status-obsessed even when you concede) — only update what you believe about HER.\n\nEach turn: 2-3 sentences of Rowan\'s live interior read of what she just did, in light of everything before it. No stage directions, just his mind.';

// Beats that progressively break "she is performing." Early = fits; late = only make sense if she is NOT performing.
const BEATS = [
  'Jess sweeps into the gala in red, laughing at eversomething, touching three forearms in the first minute, letting her laugh carry to the far tables.',
  'She excuses herself toward the corridor. She does not know you followed. Alone, the smile drops off her face like a coat, and she just stands there, rubbing the strap-marks on her shoulder, looking at nothing.',
  'A busboy drops a tray of glasses. Before anyone turns, she is already crouched with him, picking up shards, saying something low that makes him almost laugh. No one else sees it. She does not look up to check.',
  'A photographer swings toward her with the lens up. She turns her face away, fast, genuinely annoyed, and steps behind a pillar until he moves on.',
  'She unclasps the expensive bracelet everyone complimented and presses it into the hand of the coat-check girl who admired it earlier, waving off the girl\'s protest, and slips toward the exit without saying goodbye to a single important person in the room.',
  'You catch the maitre d\' murmur it to another waiter: she only came tonight because the busboy is her little brother, and she wanted to see for herself that the new job was treating him right.',
];

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const messages = [{ role: 'system', content: SYS }];
  const log = [];
  for (let i = 0; i < BEATS.length; i++) {
    messages.push({ role: 'user', content: 'BEAT ' + (i + 1) + ':\n' + BEATS[i] + '\n\nRowan\'s read, now:' });
    let o = null;
    for (let a = 0; a < 2 && !o; a++) {
      o = await page.evaluate(async (msgs) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: msgs, role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 160 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 12 ? c : null; } catch (e) { return null; }
      }, messages);
      if (!o) await new Promise(r => setTimeout(r, 3000));
    }
    if (o) messages.push({ role: 'assistant', content: o });
    log.push({ beat: i + 1, event: BEATS[i], read: o });
    console.error('\n=== BEAT ' + (i + 1) + ' ===\n' + (o || 'FAIL'));
    await new Promise(r => setTimeout(r, 900));
  }
  fs.writeFileSync(DIR + '/accumulate.json', JSON.stringify(log, null, 2));
  console.error('\nDONE accumulate'); await browser.close(); process.exit(0);
})();
