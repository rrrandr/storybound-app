// SHOW-DON'T-TELL IN THE MODEL (Roman 2026-08-03). Reinterpreting _select/_select2: the convergence wasn't
// "selection is insufficient" — it was that the SHEET was DIAGNOSES ("uses attention as reassurance" = a neon
// sign with the psychology pre-computed), so every POV echoed the same summary. FIX: the sheet must be
// OBSERVABLE truths only (camera-capturable behaviors), never diagnoses. Then the POV SELECTS a behavior and
// INFERS the psychology (how humans actually read people). SAME 5 POVs as _select2; ONLY change = observable
// sheet. PREDICT (Roman): selection now DIVERGES (Fox->mirrors, HW->touching, DV->chose who mattered, OV->
// smiled first) AND prose sharpens (concrete behavior + inferred conclusion = the concierge quality).
// If it diverges -> the "two-lever" finding was a sheet artifact; the mechanism is: observable facets -> POV
// selects+infers. If it STILL converges -> observable-vs-diagnosis wasn't the cause.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/select';
fs.mkdirSync(DIR, { recursive: true });

// OBSERVABLE behaviors only (Roman's list). A camera could capture each. NO diagnosis, NO psychology stated.
const JESS_OBS = [
  'She walks half a beat slower when she enters a room.',
  'She laughs before anyone else does.',
  'She touches people\'s forearms while she talks.',
  'She checks her reflection in windows and mirrors without appearing to.',
  'She never sits with her back to the room.',
  'She dresses one notch bolder than everyone else present.',
  'She remembers everyone\'s name.',
  'She is always the last to leave.',
];

const POVS = {
  FOX:          'Your attention is seized by PERFORMANCE — anything staged for an audience, any bid for status. Example thought: "He only apologizes when there are witnesses."',
  HEART_WARDEN: 'Your attention is seized by who is quietly UNPROTECTED or carrying a cost no one sees. Example thought: "She is the one everyone leans on and the one no one asks about."',
  OPEN_VEIN:    'Your attention is seized by hidden HURT and loneliness. Example thought: "He tips big because the waiter is the only one who talks to him."',
  DARK_VICE:    'Your attention is seized by LEVERAGE and what people can be made to want. Example thought: "Every kindness has an owner collecting interest later."',
  WARM_PLAIN:   'Your attention is seized by small human HABITS — the ordinary tell that makes someone real. Example thought: "He carried every pen like someone expected it to disappear."',
};

const ENGINE = 'HERE IS WHAT JESS ACTUALLY DOES — concrete, observable, all TRUE (a camera could capture each one):\n%%JESS%%\n\nYou are the first-person narrator. %%POV%%\n\nYou see Jess across a crowded room. ONE of these behaviors catches YOUR eye FIRST — the one your kind of attention snags on. Write a SINGLE effortless sentence that names or implies that behavior AND the snap conclusion you draw from it — observable + inferred at once, the way "The concierge was the kind of man who looked down on you as he mispronounced concierge" is both.\nHARD RULES:\n- SELECT one of the real behaviors above. Do NOT invent a new behavior.\n- You INFER the psychology; do not have it handed to you. Narrate the conclusion, plain words, NO metaphor.\n- One sentence. Nothing else.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const pov of Object.keys(POVS)) {
    const sys = ENGINE.replace('%%JESS%%', JESS_OBS.map(f => '- ' + f).join('\n')).replace('%%POV%%', POVS[pov]);
    let o = null;
    for (let a = 0; a < 2 && !o; a++) {
      o = await page.evaluate(async ({ sys }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: 'Jess, across the room. Your first conclusion:' }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 70 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 8 ? c : null; } catch (e) { return null; }
      }, { sys });
      if (!o) await new Promise(r => setTimeout(r, 3000));
    }
    out[pov] = o;
    console.error('[' + pov.padEnd(12) + '] ' + (o ? o.replace(/\n/g, ' ') : 'FAIL'));
    await new Promise(r => setTimeout(r, 2200));
  }
  fs.writeFileSync(DIR + '/select3.json', JSON.stringify(out, null, 2));
  console.error('DONE select3'); await browser.close(); process.exit(0);
})();
