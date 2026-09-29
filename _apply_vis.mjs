import fs from 'fs';
const sub = (f,a,b) => { let s = fs.readFileSync(f,'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0,55));
  fs.writeFileSync(f, s.split(a).join(b)); };

sub('_answer_lore_and_silence_reopened.md',
`**And it makes the scene far more dangerous than the custody framing ever did.** While Lirael holds it, **the
relic in her hands is showing the whole assembly whether she is clear, uncertain, or evasive** — continuously,
visibly, in front of the body weighing her conduct. **She is not holding evidence. She is holding a mirror
pointed at herself, and everyone can see it.**`,
`> ### ⛔ The paragraph that stood here is WITHDRAWN — 2026-09-29
> It read that the relic *"is showing the whole assembly whether she is clear, uncertain, or evasive —
> continuously"*, and called it *"a mirror pointed at herself, and everyone can see it."* **"Showing the
> assembly", "continuously" and "everyone can see" all smuggle in a public verdict.**

**The correct statement:** while Lirael holds it, **the Answer visibly changes shape in her hands according to
her inner alignment.** People present **may see its physical form and draw their own conclusions.** It does
not address the room, declare anything, or bind anyone's judgement — and it **cannot** tell observers whether
she is factually right, guilty, lying about the past, or responsible for Seren's wish.

**Any social consequence is authored through what witnesses make of the visible shape**, never smuggled in as
an objective verdict from the relic. **The word "testimony" is not to be used of it.** See
\`_answer_visibility_contact_and_risk.md\`.`);

sub('_answer_lore_and_silence_reopened.md',
`> ⚠ **One question, flagged not assumed.** The canon says the entrustment runs with the office of **Chayr**;
> the seed calls Julian **the Provast** (\`131286\`, \`131288\`), which \`16722\` places *above* Chayr — *"administrative
> authority over several Chayrs, enclaves, or an important institution."* **I have not reconciled these and am
> not guessing.** It matters, because an office-bound entrustment needs to name which office it is bound to.`,
`> ### Resolved as canon, 2026-09-29 — not an open conflict
> **Julian is the Chayr entrusted with this Answer**, and the entrustment is bound to that office. Where
> **"Provast"** appears in source (\`131286\`, \`131288\`, \`130927\`) that is **terminology needing editorial
> alignment**, flagged for a later pass. **It is not to be used to weaken, redefine, or cast doubt on the
> office-bound entrustment.** My framing of it as an unreconciled conflict is **withdrawn**.`);

sub('_answer_lore_and_silence_reopened.md',
'| open question | which office the entrustment is bound to — **Chayr per canon, Provast per seed** |',
`| Julian's office | **Chayr**, canon. "Provast" in source is **terminology for editorial alignment.** |
| new layer | **active contact/control** — apparent possession is not control; see \`_answer_visibility_contact_and_risk.md\` |`);
console.log('overstatement withdrawn; office resolved as canon');
