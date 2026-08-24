// CONSTRAINED TELL REPAIR — the evaluator names the problem; the model picks from a menu.
//
// A repair model is another author. Given "this needs depth" it invents depth, which is how
// the last repair pass produced "the way he always did" four times and how a Character+ pass
// became a tic factory. So this one is not asked to improve anything. It is handed one flagged
// sentence, told exactly what is wrong with it, and offered three moves.
//
// The forbidden list matters as much as the options. Turning "His fingers tightened." into
// "His fingers tightened around the letter bearing his brother's seal." is a good repair.
// Turning it into "His fingers tightened because he had spent years fearing abandonment." is
// the original defect rewritten in prose — psychology asserted, now at greater length.
//
// usage: node _tell_repair.mjs <scene.txt> [more...] [--apply]
import fs from 'fs';
import { classify } from './_body_tell_report.mjs';

const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
const APPLY = process.argv.includes('--apply');

const BODY = '(?:heels?|foot|feet|fingers?|thumb|hands?|palm|jaw|mouth|lips?|shoulders?|throat|chest|ribs?|breath|pulse|stomach|eyes?|knuckles?|spine|neck|body)';
// STRUCTURAL, NOT ENUMERATED. The old extractor listed reaction verbs and the model simply
// used one that was not on the list — "his thumb TRACED the rim of his sandal strap" walked
// straight through, which is the heel->sole, ring->mouth failure reproduced inside the
// instrument built to catch it. A verb list can always be stepped around.
//
// So: a body part belonging to someone, doing anything at all. The extractor is deliberately
// over-inclusive and the classifier decides what matters — the same division that makes the
// wish rules hold (define the physics, do not enumerate the outcomes).
const VERBISH = '(?:\\w+(?:ed|ing|s)|rose|fell|went|held|kept|caught|shook|felt|lay|sat|stood|hung|drew|came|left|grew|met|found|gave|took)';
const SKIP = /\b(?:was|were|is|are|had|has|have|been|being)\s+$/i;
// A possessive proper name is a determiner too — "Julian's fingers tightened" was missed.
const OWNER = "(?:my|his|her|its|their|the|[A-Z][a-z]+['\u2019]s)";
const TELL = new RegExp(`\\b${OWNER}\\b[^.!?]{0,30}?\\b${BODY}\\b[^.!?]{0,20}?\\b${VERBISH}\\b`);

const SYS = `You repair ONE flagged sentence in a finished scene. You are not improving the prose
and you are not adding depth. A physical action is carrying emotional information that the text
has not earned, and you will resolve that in the least invasive way available.

CHOOSE EXACTLY ONE:
  A) REMOVE the physical tell. Often the best answer — the reader was going to infer the
     feeling anyway. Return a COMPLETE sentence with the tell taken out, or return an empty
     replacement ("") to delete the sentence entirely. Do NOT simply stop the sentence early:
     "The Dohkar's mouth moved in a soundless protest." must not become "The Dohkar's mouth."
     — that is a fragment, not a removal.
  B) ATTACH it to pressure ALREADY VISIBLE IN THIS SCENE — something just said, done, shown or
     arrived. You may only use what is already on the page.
  C) ATTACH it to history ALREADY ESTABLISHED for this character in the text you are given.

If neither B nor C is available from what is already present, choose A. Inventing the cause is
the failure this task exists to prevent.

FORBIDDEN, all of them:
  · new psychology or motive ("because he had spent years fearing abandonment")
  · naming the emotion ("in silent protest", "nervously", "with grief")
  · new characters, objects, places, relationships or history not already in the scene
  · "the way he always…", "as usual", "he always did", or any habitual-pattern construction
  · making the sentence longer than it needs to be

  ✓ "His fingers tightened." → "His fingers tightened around the letter bearing his brother's
    seal."   (B — the letter is already in the scene)
  ✗ "His fingers tightened." → "His fingers tightened because he had spent years fearing
    abandonment."   (invented psychology)
  ✓ "The Dohkar's mouth moved in silent protest." → "The Dohkar's mouth moved behind the band.
    He stopped when he saw the assembly watching."   (B)
  ✓ "My heel lifted once from the packed earth." → deleted, sentence rewritten without it. (A)

Return ONLY JSON: {"choice":"A|B|C","replacement":"<the full replacement sentence>","evidence":"<the words already in the scene you attached to, or empty for A>"}`;

// Anything the repair introduces that was not in the scene is invention. Measured, not trusted.
const CONTENT = t => new Set((String(t).toLowerCase().match(/[a-z']{4,}/g) || []));
const INVENTION = [
  [/\bbecause\b[^.]{0,40}\b(?:fear\w*|afraid|grief|shame|lonel\w+|abandon\w+|love[ds]?|hated?|anger|guilt)\b/i, 'psychology stated'],
  [/\b(?:the way (?:he|she|they) always|as usual|always did|had always)\b/i, 'habitual construction'],
  [/\b(?:in|with) (?:silent |quiet |unspoken )?(?:protest|grief|fear|shame|longing|defiance)\b/i, 'emotion named'],
];

let flaggedN = 0, repairedN = 0, inventedN = 0;
for (const f of files) {
  let t = ''; try { t = fs.readFileSync(f, 'utf8'); } catch (_) { continue; }
  const clean = t.replace(/I reali[sz]e that old tarot deck is still in my hand[\s\S]*$/i, '');
  const sents = clean.split(/(?<=[.!?"”])(?=[A-Z"“‘'])|(?<=[.!?"”])\s+/).map(x => x.trim()).filter(Boolean);
  const cands = [];
  sents.forEach((s, i) => {
    if (!TELL.test(s) || /\b(?:tarot|deck|cards?)\b/i.test(s)) return;
    cands.push({ s, before: (sents[i - 1] || '').slice(-200), after: (sents[i + 1] || '').slice(0, 160) });
  });
  if (!cands.length) { console.log(`\n${f.replace(/^.*\//, '')} — no physical reactions`); continue; }

  const verdicts = await classify(cands.map((c, i) => `${i + 1}. …${c.before} >>> ${c.s}`).join('\n'));
  const bad = cands.map((c, i) => ({ ...c, ...(verdicts.find(v => v.n === i + 1) || {}) }))
    .filter(c => c.permission === 'BAD');
  console.log(`\n${f.replace(/^.*\//, '')} — ${cands.length} reaction(s), ${bad.length} flagged`);
  flaggedN += bad.length;

  let out = t;
  for (const b of bad) {
    const r = await fetch('http://localhost:3000/api/proxy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'grok-4.3', temperature: 0.4, max_tokens: 500,
        messages: [{ role: 'system', content: SYS },
          { role: 'user', content: `SCENE CONTEXT BEFORE:\n${b.before}\n\nFLAGGED SENTENCE:\n${b.s}\n\nCONTEXT AFTER:\n${b.after}\n\nFunction it performs: ${b.fn}` }] }),
    });
    const d = await r.json();
    let j = {};
    try { j = JSON.parse(String(d.content || d.choices?.[0]?.message?.content || '').replace(/^```json\s*|\s*```$/g, '')); } catch (_) {}
    const rep = String(j.replacement || '').trim();
    const del = j.choice === 'A' && Object.prototype.hasOwnProperty.call(j, 'replacement') && rep === '';
    if (!rep && !del) { console.log(`   [${b.fn}] no repair returned`); continue; }
    // TRUNCATION GUARD. Option A produced "The Dohkar's band-muffled mouth." — the original
    // sentence stopped before its verb. A removal must leave a sentence, or leave nothing.
    if (rep && b.s.toLowerCase().startsWith(rep.replace(/[.!?…]+$/, '').toLowerCase())
        && rep.length < b.s.length * 0.9) {
      console.log(`   [${b.fn}] ⚠ REFUSED — truncation, not removal: "${rep.slice(0, 60)}"`);
      continue;
    }

    // INVENTION RATE. The danger is not deletion — it is manufactured depth.
    const fresh = [...CONTENT(rep)].filter(w => !CONTENT(clean).has(w));
    const flags = INVENTION.filter(([rx]) => rx.test(rep)).map(([, l]) => l);
    if (flags.length) inventedN++;
    console.log(`   [${b.fn}] ${j.choice}: ${del ? '(sentence deleted)' : rep.slice(0, 120)}`);
    console.log(`      evidence: ${String(j.evidence || '(none — removal)').slice(0, 80)}`);
    console.log(`      new words: ${fresh.length ? fresh.slice(0, 8).join(', ') : 'none'}`
      + (flags.length ? `   ⚠ INVENTION: ${flags.join(', ')}` : ''));
    if (!flags.length) {
      out = del ? out.replace(b.s, '').replace(/\s{2,}/g, ' ') : out.replace(b.s, rep);
      repairedN++;
    }
  }
  if (APPLY && out !== t) fs.writeFileSync(f.replace(/\.txt$/, '.repaired.txt'), out);
}
console.log(`\n${'─'.repeat(70)}`);
console.log(`  flagged ${flaggedN} · repaired ${repairedN} · invention-rejected ${inventedN}`);
console.log('  A repair that adds a reason the scene never had is the original defect, longer.\n');
