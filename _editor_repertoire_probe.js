// IDENTITY-REPERTOIRE probe (Roman 2026-08-05). People don't have ONE mask — they have a small persistent
// REPERTOIRE of identities (wants-to-be-seen-as / never-wants-to-be-seen-as), and the AUDIENCE selects which one
// is performed. The editor READS the repertoire (persistent Character+) and reveals a BID; it never invents identity.
// TEST 1 (audience selects identity): one repertoire, 4 audiences -> 4 identities -> 4 bids, same person, NO avoided leak.
// TEST 2 (repertoire = the person): same check-arrives beat, 3 repertoires -> 3 different people. NO paid gen.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';

function editorSys(who, beat, audience, wants, avoids) {
  return 'You are the story\'s EDITOR, not the writer. The EVENTS are FIXED — you do not change what happens. You choose ONE deliberate SOCIAL BID ' + who + ' makes inside the beat, as a POINTER (not prose).\n\n'
    + 'BEAT (unchanged): ' + beat + '\n'
    + 'THE ROOM / AUDIENCE right now: ' + audience + '\n\n'
    + who + ' is a MAJOR recurring character with a STABLE identity REPERTOIRE (persistent across the whole story — you READ it, you never invent it):\n'
    + '  WANTS to be seen as: ' + wants + '\n'
    + '  NEVER wants to be seen as: ' + avoids + '\n\n'
    + 'STEP A — which ONE of their favored identities does THIS audience pull forward? People show different faces to different rooms (the same person is competent at work, witty with old friends, generous on a date). Pick the identity this specific room most calls out.\n'
    + 'STEP B — find the BID that expresses THAT identity under THIS pressure: the move ' + who + ' makes because they are TRYING to influence how this room sees them (judge by intent, not outcome; a failing bid still counts; scale does not matter). NEVER produce a bid that performs one of their AVOIDED identities, even if the scene invites it (someone who refuses to look needy does not ask for help here). SELECT by RECOGNITION: the bid that makes someone who has known ' + who + ' for years say "God — that is EXACTLY what they do." Reject generic bids and any private tic that would make equal sense if they were ALONE.\n\n'
    + 'Output EXACTLY:\nIDENTITY: <which favored identity this room pulled forward>\nOBSERVE: <the one bid to notice, a pointer — "catch them [move]". Do NOT restate the event.>';
}

// TEST 1 — one persistent repertoire, four audiences
const R1 = { who: 'Nadia',
  wants: 'the sharp competent one who is always on top of it; the unbothered one nothing rattles; the loyal friend who shows up',
  avoids: 'needy; clueless; sentimental or soft' };
const T1 = {
  work_incident: 'A production outage during morning standup; her manager and the skip-level director are on the call.',
  old_friends:   'Late at a dive bar with the college crew, everyone swapping the same old stories.',
  the_ex:        'She rounds a corner at a mutual friend\'s housewarming and is suddenly face to face with her ex.',
  kid_sister:    'Her younger sister shows up at her door in tears over a breakup.',
};

// TEST 2 — same beat, three different repertoires
const T2_BEAT = 'A group dinner at a nice restaurant; the check lands in the middle of the table and nobody has reached for it yet.';
const T2_AUD = 'her new partner\'s long-time friends, whom she is meeting for only the second time.';
const R2 = {
  Generous:      { wants: 'generous, abundant, the host who takes care of everyone', avoids: 'cheap; calculating; stingy' },
  SelfSufficient:{ wants: 'independent, scrupulously fair, beholden to no one', avoids: 'indebted; showy; needy' },
  Sophisticate:  { wants: 'cultured, effortless, worldly', avoids: 'provincial; eager; gauche' },
};

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const call = (sys) => page.evaluate(async ({ sys }) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: 'Your lines:' }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0.9, max_tokens: 150 }) }); const j = await r.json(); return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim().replace(/\n+/g, ' / '); } catch (e) { return 'ERR:' + e.message; } }, { sys });
  const out = { T1: {}, T2: {} };
  console.error('\n══════ TEST 1 — one repertoire (Nadia), four audiences: does the ROOM select the identity? ══════');
  for (const k of Object.keys(T1)) { const o = await call(editorSys(R1.who, T1[k], T1[k], R1.wants, R1.avoids)); out.T1[k] = o; console.error('  ' + k.padEnd(14) + ': ' + o); await new Promise(r => setTimeout(r, 700)); }
  console.error('\n══════ TEST 2 — same check-arrives beat, three repertoires: does the REPERTOIRE make the person? ══════');
  for (const k of Object.keys(R2)) { const o = await call(editorSys('Mara', T2_BEAT, T2_AUD, R2[k].wants, R2[k].avoids)); out.T2[k] = o; console.error('  ' + k.padEnd(14) + ': ' + o); await new Promise(r => setTimeout(r, 700)); }
  fs.writeFileSync(DIR + '/editor_repertoire.json', JSON.stringify(out, null, 2));
  console.error('\nJUDGE: T1 — does each room pull a DIFFERENT favored identity, same person, NO needy/soft/clueless leak? T2 — three different people from one beat?');
  console.error('DONE repertoire_probe'); await browser.close(); process.exit(0);
})().catch(e => { console.error('REP-ERR', e.message); process.exit(1); });
