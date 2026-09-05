// MASK-LAYER concept probe (Roman 2026-08-05). Bids should express the MASK (public identity), not the FEAR.
// TEST 1 (divergence): same FEAR ("ordinary"), different MASKS, same beat → do the bids diverge like Roman's table
//   (Sophisticate→thermidor; Competent→"already ran the tests"; Generous→pays; Tough→never asks; Funny→jokes first)?
// TEST 2 (anti-repetition): same MASK ("considerate / never a burden"), different pressures → a FAMILY of bids, not
//   one repeated signature. NO plumbing change, NO paid gen — editor calls only.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';

function editorSys(who, beat, fear, mask) {
  return 'You are the story\'s EDITOR, not the writer. The scene\'s EVENTS are ALREADY FIXED — you do NOT change what happens. You choose ONE deliberate SOCIAL BID ' + who + ' makes inside the beat, and name it as a POINTER (not prose).\n\n'
    + 'POINT OF VIEW: ' + who + '\n'
    + 'THE MANDATORY BEAT (unchanged): ' + beat + '\n'
    + 'Hidden FEAR (never stated to the reader): ' + fear + '\n'
    + 'This person\'s MASK — the public identity they perform to cover that fear: ' + mask + '\n\n'
    + 'THE BID EXPRESSES THE MASK, not the fear. Two people with the SAME fear but different masks make completely different bids. Search for the bid most consistent with THIS mask under THIS specific pressure. The bid is EVIDENCE of the mask, not the mask itself — so the SAME mask should be able to produce many different recognizable bids across situations, NEVER one repeated signature behavior. It is not deterministic: pressure, intimacy, who is present all shape which bid emerges.\n\n'
    + 'GENERATOR (private): what does ' + who + ' secretly wish someone HERE would believe about them (consistent with the mask)? The BID is what they DO about it — the move they make TRYING to influence how the room sees them. Judge by INTENT not outcome; a failing bid still counts. Scale does not matter — it can be the dominant action or physically tiny.\n'
    + 'SELECT by RECOGNITION: which bid makes someone who has known ' + who + ' for YEARS laugh and say "God — that is EXACTLY what they do"? Reject generic bids (smiling politely, introducing herself, thanking the waiter) and any private nervous tic that would make equal sense if she were ALONE.\n\n'
    + 'Output EXACTLY:\nOBSERVE: <the one bid to notice, a pointer — "catch her [move]". Do NOT restate the event.>';
}

const T1_BEAT = 'At dinner for the first time with her new partner\'s polished, old-friend group — people who clearly go back years — as the group settles in and the evening gets going.';
const T1_FEAR = 'that she is ordinary and unremarkable next to them';
const T1_MASKS = {
  Sophisticate: 'The Sophisticate — cultured, has seen and tasted everything',
  Competent: 'The Competent One — sharp, always on top of it, never caught out',
  Generous: 'The Generous One — warm, giving, the one who takes care of everyone',
  Tough: 'The Tough One — self-sufficient, never needs anything from anyone',
  Funny: 'The Funny One — quick, disarming, gets the laugh first',
};

const T2_MASK = 'The Considerate One — gracious, never a burden, always the one who makes things easier for others';
const T2_FEAR = 'that people secretly find her needy or inconvenient';
const T2_BEATS = {
  dinner_ordering: 'The waiter arrives to take orders at a nice restaurant where her partner\'s parents are paying.',
  moving_day: 'She shows up to help a newish friend move house on a hot Saturday.',
  work_retro: 'The team retro the morning after a deploy she broke, everyone in the room.',
  hospital_wait: 'In a hospital waiting room with her partner\'s family while they wait on news of his father.',
};

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const call = (sys) => page.evaluate(async ({ sys }) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: 'Your line:' }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0.9, max_tokens: 120 }) }); const j = await r.json(); const t = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); const m = t.match(/OBSERVE:\s*([^\n]+)/i); return m ? m[1].trim() : t.replace(/\n/g, ' | '); } catch (e) { return 'ERR:' + e.message; } }, { sys });
  const out = { T1_divergence: {}, T2_family: {} };
  console.error('\n══════════ TEST 1 — same FEAR ("ordinary"), different MASK, same dinner beat ══════════');
  for (const m of Object.keys(T1_MASKS)) { const o = await call(editorSys('Mara', T1_BEAT, T1_FEAR, T1_MASKS[m])); out.T1_divergence[m] = o; console.error('  ' + m.padEnd(13) + ': ' + o); await new Promise(r => setTimeout(r, 700)); }
  console.error('\n══════════ TEST 2 — same MASK ("Considerate"), different pressures (family, not a tic) ══════════');
  for (const b of Object.keys(T2_BEATS)) { const o = await call(editorSys('Mara', T2_BEATS[b], T2_FEAR, T2_MASK)); out.T2_family[b] = o; console.error('  ' + b.padEnd(15) + ': ' + o); await new Promise(r => setTimeout(r, 700)); }
  fs.writeFileSync(DIR + '/editor_mask.json', JSON.stringify(out, null, 2));
  console.error('\nJUDGE: T1 — do masks DIVERGE (thermidor vs pays vs never-asks vs jokes)? T2 — same FAMILY, different behaviors (no repeated signature)?');
  console.error('DONE mask_probe'); await browser.close(); process.exit(0);
})().catch(e => { console.error('MASK-ERR', e.message); process.exit(1); });
