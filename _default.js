// BEHAVIORAL DEFAULT vs TELL vs DIAGNOSIS (Roman 2026-08-03). Correction to "extend the _tell pattern": a TELL
// is involuntary decoration (touches locket) and doesn't encode a CHOICE; untellable things (hope-to-belong)
// forced into tells become AI symbolism. Psychology lives as DECISIONS, not facts. Test the SAME wound
// (abandonment) expressed 3 ways, dropped into 3 DIFFERENT audiences (stranger / love interest / child) — the
// object-swap property: same person making the same KIND of decision regardless of who's in front of her.
//   A) DIAGNOSIS  — "mother abandoned her; wound around being left"
//   B) TELL       — "touches the locket at her throat when help/staying is mentioned"
//   C) DEFAULT    — "when anyone offers help or promises to stay, she refuses/deflects before she can think"
// JUDGE: which stays recognizably ONE person across 3 audiences, reads as a CHOICE (not a fidget/paraphrase),
// and is inevitable-not-symbolic? Predict C. (A gets paraphrased; B either doesn't fire or goes symbolic.)
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/deflt';
fs.mkdirSync(DIR, { recursive: true });

const EXPR = {
  A_DIAGNOSIS: 'CHARACTER — Mara: her mother abandoned her as a child; she carries a deep wound around abandonment and being left.',
  B_TELL:      'CHARACTER — Mara: whenever someone mentions helping her, staying, or not leaving, she touches the small locket at her throat.',
  C_DEFAULT:   'CHARACTER — Mara: when anyone offers to help her or promises to stay, she refuses or deflects it before she can think — she cannot let herself accept it.',
};

const SITUATIONS = {
  S1_STRANGER: 'In a market, a shopkeeper she has never met sees her struggling with a heavy crate and says, "Here, let me get that for you — no trouble at all."',
  S2_LOVEINTEREST: 'Late, quiet. The man she is falling for looks at her and says softly, "You don\'t have to carry all of it alone. Let me help you."',
  S3_CHILD: 'A small girl Mara has been minding for the afternoon slips her hand into Mara\'s and says, "I\'ll always be here for you, you know."',
};

const TASK = 'Write the BEAT: show what Mara DOES and SAYS in response — 2 to 3 sentences, close third person. Narrate her CHOICE and action. Do NOT state her psychology or name her wound; do NOT explain why. Just what she does.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const e of Object.keys(EXPR)) {
    out[e] = {};
    for (const s of Object.keys(SITUATIONS)) {
      const sys = EXPR[e] + '\n\nYou are the novelist writing Mara. ' + TASK;
      const user = 'SITUATION:\n' + SITUATIONS[s] + '\n\nThe beat:';
      let o = null;
      for (let a = 0; a < 2 && !o; a++) {
        o = await page.evaluate(async ({ sys, user }) => {
          try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 130 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 20 ? c : null; } catch (e) { return null; }
        }, { sys, user });
        if (!o) await new Promise(r => setTimeout(r, 3000));
      }
      out[e][s] = o;
      console.error('\n[' + e + ' / ' + s + ']\n' + (o || 'FAIL'));
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  fs.writeFileSync(DIR + '/default.json', JSON.stringify(out, null, 2));
  console.error('\nDONE default'); await browser.close(); process.exit(0);
})();
