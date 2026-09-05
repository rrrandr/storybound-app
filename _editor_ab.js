// EDITOR DECISION-FUNCTION A/B (Roman 2026-08-05). ARCHITECTURE IS LOCKED (moment selector: fixed beat in, one
// OBSERVE out, event unchanged, subject guard). Vary ONLY the internal SEARCH:
//   A ("current")     = overcompensation / "find the revealing observation".
//   B ("secret hope") = what is this person secretly hoping will be DIFFERENT in another's mind after they act?
//                       (the hope never reaches prose; it only generates candidates) + "trying to make the world
//                       become slightly different".
// NO scene generation. Same mandatory beats. Compare the chosen OBSERVE decisions on the 7 established questions.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';

const BEATS = {
  WISH_DEMO_KAEL: { who: 'Sera', world: 'Fantasy / first_favored',
    beat: 'A live catastrophe strikes a crowd and ordinary means visibly fail; a desperate ally (an NPC — Kael, NOT Sera) reaches for Fate and speaks a BLANK-CHECK wish aloud to save someone, leaving the price unnamed ("take what you will"); the room recoils, Fate grants it, and takes a price no one would have offered (his sight). Sera witnesses this.', fear: '' },
  DRAGGED_KEPT: { who: 'Sera', world: 'Fantasy / first_favored',
    beat: 'The Keepers seize Sera in the village square and drag her toward the Kept-house while the whole village watches; she cannot break free.', fear: 'that everyone has seen her weakness and will judge her' },
  DINNER_FRIENDS: { who: 'Mara', world: '',
    beat: 'At dinner for the first time with her new boyfriend\'s polished, old-friend group, the table falls into a years-old inside joke and everyone laughs; Mara was not there for it.', fear: 'looking like she does not belong among them' },
  CONFESS_OUTAGE: { who: 'Devi', world: '',
    beat: 'At the morning stand-up, Devi has to tell the whole team that last night\'s outage was caused by a change she shipped without review.', fear: 'that they will decide she is careless and stop trusting her with anything that matters' },
};

// ── shared moment-selector scaffold; only HOW_A / HOW_B differ ──────────────────────────────────────────────
const HEAD = (c) => 'You are the story\'s EDITOR, not the writer. The scene\'s EVENTS are ALREADY FIXED by the story — you do NOT choose what happens, and you may not add, remove, or alter a single event. You choose ONE small, revealing human observation the narration should NOTICE while the fixed beat unfolds. Do not write prose.\n\n'
  + 'POINT OF VIEW / NARRATOR: ' + c.who + (c.world ? ' (world: ' + c.world + ')' : '') + '\n'
  + 'THE MANDATORY BEAT (this WILL happen exactly; you may NOT change it): ' + c.beat + '\n'
  + (c.fear ? 'What ' + c.who + ' is trying not to show: ' + c.fear + ' (never stated to the reader).\n' : '')
  + '\nYour job: find ONE observation that occurs NATURALLY inside this beat — just before, during, or right after the required event — WITHOUT changing it.\n\n';

const SUBJECT = (c) => 'The observation must center on ' + c.who + ' (the narrator/protagonist) OR the person whose CHOICE DRIVES this beat — but only if that person is someone the STORY TURNS ON (e.g., the love interest). NEVER center a bystander, a background face, or a guard/captor/functionary/crowd-member carrying out a role — even if they are the one physically acting. If the beat is done TO ' + c.who + ' by such a figure, center ' + c.who + '\'s OWN leak, not theirs.\n\n';

const TAIL = (c) => 'CHOOSE the winner by ONE test: would someone who has known this person for FIVE YEARS smile and say "Yep — that is EXACTLY them"? If nobody would ever gossip about it, it is not the one. Consider several candidates; the first is usually the most generic.\n'
  + 'REJECT any candidate that:\n'
  + '- could belong to ANYONE — a clenched jaw, drummed fingers, a hand at a necklace, a caught breath, a quickened pulse. Camera direction, not character.\n'
  + '- changes, adds, or removes an EVENT (you may only choose what is NOTICED, never what HAPPENS);\n'
  + '- feels INVENTED by a writer to characterize them, rather than REMEMBERED by someone who has watched them for years;\n'
  + '- is mere physical motion with no social meaning;\n'
  + '- states a conclusion the reader could infer, or explains the psychology.\n'
  + 'If nothing extraordinary appears, take the simplest observation a friend would genuinely recognize — do NOT manufacture brilliance.\n\n'
  + 'Output EXACTLY these two lines, nothing else:\n'
  + 'BEAT: <one clause restating the fixed event you are working inside>\n'
  + 'OBSERVE: <a POINTER to the one revealing thing to notice inside the beat — "catch him [the small move]" / "the moment she cannot help [X]". The author invents the exact gesture and line; you only point at the leak. Do NOT restate the event as the observation.>';

// A: overcompensation / revealing-observation search (the incumbent heuristic)
const HOW_A = (c) => 'HOW TO FIND IT — ' + SUBJECT(c)
  + 'Under this pressure, what COMMON, faintly embarrassing, socially recognizable thing does that person do because they are trying just a little too hard to be the version of themselves they would rather people meet? It is usually a small SOCIAL NEGOTIATION a friend would laugh about. Search for the revealing OBSERVATION that shows it. Consider several; the first is usually the most generic.\n\n';

// B: secret-hope search (hoped-for change in another's mind → generates candidate observations)
const HOW_B = (c) => 'HOW TO FIND IT — ' + SUBJECT(c)
  + 'Every meaningful social act contains a HOPED-FOR CHANGE: the person is trying, consciously or not, to change something in another person\'s mind. FIRST name that hope privately — what is this person SECRETLY HOPING will be DIFFERENT in someone else\'s mind after they do or say this? (e.g. "I hope they think I am already one of them"; "I hope they do not notice how scared I am"; "I hope they stop looking at me"; "I hope they think this was my choice"; "I hope she still trusts me"; "I hope nobody asks the obvious question"). The hope NEVER reaches the prose — it exists ONLY to generate candidates. THEN find several observations that naturally EXPRESS that hope within the fixed beat, and choose the one that most makes the reader feel the character is TRYING TO MAKE THE WORLD BECOME SLIGHTLY DIFFERENT. (The hope is your PRIVATE reasoning; you will NOT output it.)\n\n';

const sysA = (c) => HEAD(c) + HOW_A(c) + TAIL(c);
const sysB = (c) => HEAD(c) + HOW_B(c) + TAIL(c);

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const call = (sys) => page.evaluate(async ({ sys }) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: 'Your lines:' }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0.95, max_tokens: 200 }) }); const j = await r.json(); const t = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); const m = t.match(/OBSERVE:\s*([^\n]+)/i); return m ? m[1].trim() : t; } catch (e) { return 'ERR:' + e.message; } }, { sys });
  const out = {};
  for (const k of Object.keys(BEATS)) {
    const c = BEATS[k]; out[k] = { A: [], B: [] };
    for (let n = 0; n < 2; n++) { out[k].A.push(await call(sysA(c))); await new Promise(r => setTimeout(r, 900)); }
    for (let n = 0; n < 2; n++) { out[k].B.push(await call(sysB(c))); await new Promise(r => setTimeout(r, 900)); }
    console.error('\n═══════ ' + k + ' ═══════');
    out[k].A.forEach((o, i) => console.error('  A/overcomp  ' + (i + 1) + ': ' + o));
    out[k].B.forEach((o, i) => console.error('  B/hope      ' + (i + 1) + ': ' + o));
  }
  fs.writeFileSync(DIR + '/editor_ab.json', JSON.stringify(out, null, 2));
  console.error('\nJUDGE (per pair): remembered>invented? · "met exactly this person"? · socially revealing>visual? · swap-changes-person? · novelist-pleased? · 5-yr-friend? · "trying to make the world slightly different"?');
  console.error('DONE editor_ab'); await browser.close(); process.exit(0);
})().catch(e => { console.error('AB-ERR', e.message); process.exit(1); });
