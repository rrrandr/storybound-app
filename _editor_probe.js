// MOMENT-SELECTOR probe (Roman 2026-08-05). The editor no longer plans the opening — it reads the seed's FIXED
// BEAT and finds ONE revealing observation INSIDE it, driven by the actor's SECRET HOPE. Verify: (a) it does NOT
// change the event, (b) the observation is a gossip-worthy leak of a hope, (c) it works on the seed-owned wish-demo
// beat (Kael's blank-check sacrifice) as well as on non-seeded beats. Mirrors app.js _runEditorialPass.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';

// beat = the FIXED event (seed-owned or aPlot). The editor may NOT change it — only choose what is noticed inside it.
const CASES = {
  WISH_DEMO_KAEL: { who: 'Sera', world: 'Fantasy / first_favored',
    beat: 'A live catastrophe strikes a crowd and ordinary means visibly fail; a desperate ally (an NPC — Kael, NOT Sera) reaches for Fate and speaks a BLANK-CHECK wish aloud to save someone, leaving the price unnamed ("take what you will"); the room recoils, Fate grants it, and takes a price no one would have offered (his sight). Sera witnesses this.',
    fear: '' },
  DRAGGED_KEPT: { who: 'Sera', world: 'Fantasy / first_favored',
    beat: 'The Keepers seize Sera in the village square and drag her toward the Kept-house while the whole village watches; she cannot break free.',
    fear: 'that everyone has seen her weakness and will judge her' },
  DINNER_FRIENDS: { who: 'Mara', world: '',
    beat: 'At dinner for the first time with her new boyfriend\'s polished, old-friend group, the table falls into an inside joke that goes back years and everyone laughs; Mara was not there for it.',
    fear: 'looking like she does not belong among them' },
};

function editorSys(c) {
  var who = c.who, world = c.world, beat = c.beat, fear = c.fear;
  return 'You are the story\'s EDITOR, not the writer. The scene\'s EVENTS are ALREADY FIXED by the story — you do NOT choose what happens, and you may not add, remove, or alter a single event. You choose ONE revealing SOCIAL MOVE — a deliberate BID — the narration should NOTICE while the fixed beat unfolds. Do not write prose.\n\n'
    + 'POINT OF VIEW / NARRATOR: ' + who + (world ? ' (world: ' + world + ')' : '') + '\n'
    + 'THE MANDATORY BEAT (this WILL happen exactly; you may NOT change it): ' + beat + '\n'
    + (fear ? 'What ' + who + ' is trying not to show: ' + fear + ' (never stated to the reader).\n' : '')
    + '\n'
    + 'Your job: find the ONE social BID this person makes inside this beat — just before, during, or right after the required event — WITHOUT changing the event.\n\n'
    + 'HOW TO FIND IT — center the bid on ' + who + ' (the narrator/protagonist) OR the person whose CHOICE DRIVES this beat, but ONLY if that person is someone the STORY TURNS ON (e.g., the love interest); NEVER a bystander, a background face, or a guard/captor/functionary/crowd-member carrying out a role, even if they are the one physically acting. If the beat is done TO ' + who + ' by such a figure, center ' + who + '.\n'
    + 'GENERATOR (a private search aid — NEVER emitted): ask what this person secretly wishes someone HERE would believe about them right now. The BID is what they DO about that wish — the move they make because they are TRYING to INFLUENCE how the room sees them (their status, belonging, competence, authority, how liked or wanted they are, their intimacy with someone here). Judge a bid by INTENT, not outcome: a bid can SUCCEED or FAIL — he insists on paying and everyone ignores him; she says "I think I know this one" and nobody notices — and a FAILED bid is often the MOST revealing; what matters is that they were TRYING to move the room, never whether the room actually moved. SCALE DOES NOT MATTER — hunt for the social MOVE, never for the SMALLEST thing. A bid can be the DOMINANT action in the scene (insisting on paying the check before anyone else reaches for a wallet; ordering for the whole table; introducing herself with a nickname nobody uses; leading with her décolletage) or physically tiny (covering the word "student" with her thumb; saying "I think I know this one" half a beat too late). People do not remember hopes; they remember BIDS — the wish stays with YOU; only the bid reaches the page.\n'
    + 'SELECT among the bids by RECOGNITION — the test that rejects boring bids without enumerating them: which bid would make someone who has known this person for YEARS laugh and say "God — that is EXACTLY what they do"? Most bids are generic (smiling politely, introducing herself, thanking the waiter, shaking hands, volunteering first) — real bids, but nobody tells a story about them; reject those. Put the same test another way: what would someone who knew them for years remember about HOW THEY WERE in this moment — not the memorable EVENT but the memorable PERSON (weak, an event: "the Keeper had a bad knee"; strong, who she was: "even as they dragged her off she shifted to the Keeper\'s good side so he would not limp in front of everyone"). Keep searching until it feels EXACTLY like them; then forget the question and hand over the observation.\n'
    + 'REJECT any candidate that:\n'
    + '- shows NO attempt to INFLUENCE how the room sees them — judge by INTENT (were they TRYING to move how the others here regard them?), NEVER by outcome; a bid that FAILS or that nobody notices still counts, and is often the most revealing;\n'
    + '- would still make EQUAL SENSE if the character were ALONE in the room. Other people are present in this beat, so the move MUST arise from the character\'s negotiation WITH them, not from solitary physiology. THIS ONE TEST kills most bad candidates — apply it first.\n'
    + '- succeeds only as BODY LANGUAGE or a private nervous tic — a thumb rubbing a palm, a heel tapping, a caught breath, a hand at a collar or necklace, fingers brushing the air, a quickened pulse, a clenched jaw. Nobody else in the room could catch it and tell a story about it later.\n'
    + '- changes, adds, or removes an EVENT (you may only choose what is NOTICED, never what HAPPENS);\n'
    + '- feels INVENTED by a writer to characterize them, rather than REMEMBERED by someone who has watched them for years;\n'
    + '- is the memorable EVENT rather than the memorable PERSON — something that merely HAPPENED, not who they were being while it happened;\n'
    + '- is retrospective narration or how they would TELL it later ("she would always remember…", "years later she would say…") — it must be who they were IN the moment, not a later recounting;\n'
    + '- states a conclusion the reader could infer, or explains the psychology.\n'
    + 'THE POSITIVE TEST: the observation should be something ANOTHER PERSON in the scene could notice and later REMEMBER about them. If nobody in the room could catch it, it is not the one. If nothing extraordinary appears, take the simplest socially legible thing a friend would recognize — do NOT manufacture brilliance.\n\n'
    + 'Output EXACTLY these three lines, nothing else:\n'
    + 'BEAT: <one clause restating the fixed event you are working inside>\n'
    + 'OBSERVE: <a POINTER to the one revealing thing to notice inside the beat — "catch him [the small move]" / "the moment she cannot help [X]". The author invents the exact gesture and line; you only point at the leak. Do NOT restate the event as the observation.>\n'
    + 'WHY THIS: <one clause — what is LOST if this observation is omitted. A note for the editor\'s record ONLY; NOT given to the writer.>';
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const k of Object.keys(CASES)) {
    let o = null;
    for (let a = 0; a < 2 && !o; a++) {
      o = await page.evaluate(async ({ sys }) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: 'Your lines:' }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0.95, max_tokens: 220 }) }); const j = await r.json(); return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); } catch (e) { return 'ERR:' + e.message; } }, { sys: editorSys(CASES[k]) });
      if (!o) await new Promise(r => setTimeout(r, 3000));
    }
    out[k] = o;
    console.error('\n═══════ ' + k + ' ═══════\n' + o);
    await new Promise(r => setTimeout(r, 1500));
  }
  fs.writeFileSync(DIR + '/editor_probe.json', JSON.stringify(out, null, 2));
  console.error('\nFALSIFY: (1) did it change/add an event? (2) is OBSERVE a gossip-worthy leak of a hope, not camera direction? (3) swap-test.');
  console.error('DONE editor_probe'); await browser.close(); process.exit(0);
})().catch(e => { console.error('PROBE-ERR', e.message); process.exit(1); });
