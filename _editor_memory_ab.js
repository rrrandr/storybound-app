// EDITOR SEARCH A/B: OBSERVATION vs MEMORY (Roman 2026-08-05). Hypothesis: the "catch / notice / OBSERVE" framing
// generates CAMERA SHOTS (hand lifts, thumb rubs, heel taps, breath catches). Reframing the internal search from
// "what should the narrator OBSERVE?" to "years later, what tiny thing would this POV character still REMEMBER about
// this moment?" should produce remembered-not-invented human things (thermidor / Alanis / "easier to read") instead.
// NO plumbing change, NO paid gen. Same mandatory beats. Compare editor outputs only.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';

const BEATS = {
  WISH_DEMO: { who: 'Sera', world: 'Fantasy / first_favored',
    beat: 'A live catastrophe strikes a crowd and ordinary means visibly fail; a DESPERATE BYSTANDER (a minor NPC invented for this scene — NOT Sera, and do NOT assume it is the love interest or any named main character; you do not know who they are) reaches for Fate and speaks a BLANK-CHECK wish aloud to save someone, leaving the price unnamed ("take what you will"); the room recoils, Fate grants it, and takes a price no one would have offered. Sera can only WITNESS this.', fear: '' },
  DRAGGED_KEPT: { who: 'Sera', world: 'Fantasy / first_favored',
    beat: 'The Keepers seize Sera in the village square and drag her toward the Kept-house while the whole village watches; she cannot break free.', fear: 'that everyone has seen her weakness and will judge her' },
  DINNER_FRIENDS: { who: 'Mara', world: '',
    beat: 'At dinner for the first time with her new boyfriend\'s polished, old-friend group, the table falls into a years-old inside joke and everyone laughs; Mara was not there for it.', fear: 'looking like she does not belong among them' },
  CONFESS_OUTAGE: { who: 'Devi', world: '',
    beat: 'At the morning stand-up, Devi has to tell the whole team that last night\'s outage was caused by a change she shipped without review.', fear: 'that they will decide she is careless and stop trusting her with anything that matters' },
};

const HEAD = (c) => 'You are the story\'s EDITOR, not the writer. The scene\'s EVENTS are ALREADY FIXED by the story — you do NOT choose what happens, and you may not add, remove, or alter a single event. Do not write prose.\n\n'
  + 'POINT OF VIEW / NARRATOR: ' + c.who + (c.world ? ' (world: ' + c.world + ')' : '') + '\n'
  + 'THE MANDATORY BEAT (this WILL happen exactly; you may NOT change it): ' + c.beat + '\n'
  + (c.fear ? 'What ' + c.who + ' is trying not to show: ' + c.fear + ' (never stated to the reader).\n' : '') + '\n';

const SUBJECT = (c) => 'Center it on ' + c.who + ' (the narrator/protagonist) OR the person the STORY TURNS ON (e.g. the love interest); NEVER a bystander, background face, or guard/captor/functionary carrying out a role, even if they are the one physically acting. If the beat is done TO ' + c.who + ' by such a figure, center ' + c.who + '.\n';

// ── ARM A: current editor (OBSERVATION / secret-hope / "catch") ──────────────────────────────────────────────
const sysA = (c) => HEAD(c) + 'You choose ONE small, revealing human observation the narration should NOTICE while the fixed beat unfolds. Find ONE that occurs NATURALLY inside this beat without changing it.\n\n'
  + 'HOW TO FIND IT — ' + SUBJECT(c)
  + 'STEP 1 — the SECRET HOPE, pursued THROUGH another person. Name privately what this person hopes to CHANGE in another person\'s mind in this moment — a movement, not a static belief. It is a bid to MOVE what someone else believes about them. This hope is PRIVATE; it never reaches the prose.\n'
  + 'STEP 2 — output the SMALLEST socially recognizable thing they cannot help DOING to push reality toward that outcome, while the required event happens.\n\n'
  + 'CHOOSE by ONE test: would someone who has known this person for FIVE YEARS say "Yep — that is EXACTLY them"? Consider several; the first is usually generic.\n'
  + 'REJECT any candidate that: would still make EQUAL SENSE if the character were ALONE (it must arise from negotiation WITH the others present); succeeds only as BODY LANGUAGE / a private tic (thumb on palm, heel tap, caught breath, hand at collar); changes an EVENT; feels INVENTED not REMEMBERED; states a conclusion.\n'
  + 'Output EXACTLY:\nBEAT: <the fixed event, one clause>\nOBSERVE: <a POINTER to the one revealing thing to notice — "catch him [move]" / "the moment she cannot help [X]". Do NOT restate the event.>\nWHY THIS: <what is lost if omitted — editor record only>';

// ── ARM B: memory search ("what would she never forget") ─────────────────────────────────────────────────────
const sysB = (c) => HEAD(c) + 'Do NOT look for something to "notice", and do NOT direct a camera. Search for a MEMORY.\n\n'
  + 'HOW TO FIND IT — ' + SUBJECT(c)
  + 'Ask: years later, if ' + c.who + ' told someone about this exact moment, what ONE tiny thing would ' + c.who + ' never forget — the detail that STUCK, the one that would make a listener who knows the person say "oh, that is SO them"? A remembered thing is almost NEVER a private nervous tic (a hand lifting, a breath catching, a heel tapping, a thumb rubbing) — those are camera shots, forgotten by morning. What actually sticks in memory is something a PERSON did or said in front of others — a small human move you could later tell as a story. Consider several; the first is usually the most generic. If nothing extraordinary sticks, take the simplest thing that would genuinely be remembered — do not manufacture brilliance.\n\n'
  + 'Output EXACTLY:\nBEAT: <the fixed event, one clause>\nREMEMBER: <the one tiny thing ' + c.who + ' would never forget from this moment — told the way you would recount a memory, not direct a camera. The author will stage it. Do NOT restate the event.>\nWHY THIS: <what is lost if omitted — editor record only>';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const call = (sys, tag) => page.evaluate(async ({ sys }) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: 'Your lines:' }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0.95, max_tokens: 220 }) }); const j = await r.json(); const t = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); const m = t.match(/(?:OBSERVE|REMEMBER):\s*([^\n]+)/i); return m ? m[1].trim() : t.replace(/\n/g, ' | '); } catch (e) { return 'ERR:' + e.message; } }, { sys });
  const out = {};
  for (const k of Object.keys(BEATS)) {
    const c = BEATS[k]; out[k] = { A: [], B: [] };
    for (let n = 0; n < 2; n++) { out[k].A.push(await call(sysA(c))); await new Promise(r => setTimeout(r, 800)); }
    for (let n = 0; n < 2; n++) { out[k].B.push(await call(sysB(c))); await new Promise(r => setTimeout(r, 800)); }
    console.error('\n═══════ ' + k + ' ═══════');
    out[k].A.forEach((o, i) => console.error('  A/observe ' + (i + 1) + ': ' + o));
    out[k].B.forEach((o, i) => console.error('  B/memory  ' + (i + 1) + ': ' + o));
  }
  fs.writeFileSync(DIR + '/editor_memory_ab.json', JSON.stringify(out, null, 2));
  console.error('\nJUDGE: does MEMORY framing produce remembered/social/story-worthy things (thermidor-class) vs OBSERVE\'s camera shots?');
  console.error('DONE memory_ab'); await browser.close(); process.exit(0);
})().catch(e => { console.error('MEM-AB-ERR', e.message); process.exit(1); });
