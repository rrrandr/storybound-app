// BODY TELL REPORT — a post-generation evaluator, not another prompt rule.
//
// serial10b settled the question: prompt rules reduce a symptom, they do not change the
// generative strategy producing it. Told not to reuse the ring, the model kept the strategy
// and moved to the mouth — "The Dohkar's band-muffled mouth moved" in scenes 6, 7 and 8. Every
// ledger reported success, because they tracked OBJECTS and the object is incidental. The
// actual pathology is a stable strategy: "I need to show hidden emotion, so I will attach it
// to an involuntary physical micro-action."
//
// So the unit of control is the PSYCHOLOGICAL FUNCTION, not the surface. Remove the ring and
// you get the mouth; remove the mouth and you get the jaw. What must not repeat is
// "blocked expression", however it is staged.
//
// This does NOT ban bodies. Bodies are evidence and humans do have tells. What it rejects is
// the body as an authorial subtitle — "I am nervous, here is my nervous hand". A tell survives
// if it is TRIGGERED NOW, rooted in CHARACTER HISTORY, or carries a DELAYED MEANING.
//
// usage: node _body_tell_report.mjs <scene.txt> [more...] [--json]
import fs from 'fs';

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

export const PERMISSION_SYS = `You classify physical-reaction sentences from a novel. You do not rewrite anything.

For each numbered sentence give a PERMISSION STATE. Fiction is allowed causal opacity — the
reader may not know yet — so this is NOT caused-vs-uncaused:
  "NOW"        the cause is present in the scene.
               "His hand tightened when his brother's name was spoken."
  "HISTORY"    the cause is not present, but the action carries established personal meaning.
               "She reached for the broken clasp before remembering she had given it away."
  "DELAYED"    a cause exists and is deliberately withheld — the text signals the withholding.
               "He kept touching the ring all evening. I understood why when the letter arrived."
  "ATMOSPHERE" the body is answering the environment, not psychology.
               "The cold made my fingers stiffen around the key."
  "BAD"        a generic emotional subtitle: the body is standing in for a feeling, and the
               only account offered is the feeling itself.
               "His fingers tightened." / "She smoothed the map nervously." / "His eyes darkened."

THE SAME ACTION CAN BE ANY OF THESE. Judge the sentence, never the body part.
  "Julian's fingers tightened around the letter as he read his father's name." -> NOW
  "Julian's fingers tightened as he thought about everything he had lost."     -> BAD
An adverb or an abstract noun ("nervously", "everything he had lost", "a silent protest") is
the narrator translating the body into an emotion. That is BAD however vivid the body is.
DELAYED requires a SIGNAL that the withholding is deliberate — a later reckoning promised, a
narrator who says they did not understand yet. Absent that signal it is BAD, not DELAYED.
A CONSEQUENCE OF THE ACTION IS NOT A CAUSE. "Julian turned the ring. The metal caught the
light." is BAD: the light is what the turning produced, not what produced the turning.
AN ENVIRONMENTAL NOUN DOES NOT MAKE IT ATMOSPHERE. Ask which way the force runs. ATMOSPHERE is
the environment acting ON the body ("the cold made my fingers stiffen"). A body moving against
scenery is not atmosphere — "My heel lifted once from the packed earth" is BAD.
  fn — the PSYCHOLOGICAL FUNCTION it performs, from this closed list ONLY:
    control            (managing the emotional geometry of an encounter)
    avoidance          (deflecting, changing the subject, busying the hands)
    concealment        (hiding a reaction from people present)
    blocked-expression (wanting to speak or act and being unable to)
    attachment         (reaching toward a person, memory or object that matters)
    anticipation       (bracing for something expected)
    submission         (yielding, deferring, shrinking)
    assertion          (taking up space, pressing a claim)

The function is what the body is DOING FOR THE CHARACTER, never the body part. A mouth moving
behind a gag and a hand stopped mid-reach are both blocked-expression.

Return ONLY JSON: {"items":[{"n":1,"permission":"BAD","fn":"blocked-expression","because":"<the words that license it, or empty>"}]}`;

// Exported so the calibration set exercises the REAL prompt rather than a copy of it.
export async function classify(list) {
  const r = await fetch('http://localhost:3000/api/mistral-proxy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'mistral-small-latest', temperature: 0.1, max_tokens: 1800,
      messages: [{ role: 'system', content: PERMISSION_SYS }, { role: 'user', content: list }] }),
  });
  const d = await r.json();
  try {
    return JSON.parse(String(d.content || d.choices?.[0]?.message?.content || '')
      .replace(/^```json\s*|\s*```$/g, '')).items || [];
  } catch (_) { return []; }
}


// ── CLI ──────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const asJson = process.argv.includes('--json');

  // Candidate extraction is local and free; only classification costs anything.
  const candidates = [];
  for (const f of files) {
    let t = ''; try { t = fs.readFileSync(f, 'utf8'); } catch (_) { continue; }
    t = t.replace(/I reali[sz]e that old tarot deck is still in my hand[\s\S]*$/i, '');
    const scene = Number((f.match(/scene(\d+)/) || [])[1] || 0);
    const sents = t.split(/(?<=[.!?"”])(?=[A-Z"“‘'])|(?<=[.!?"”])\s+/).map(x => x.trim()).filter(Boolean);
    sents.forEach((s, i) => {
      if (!TELL.test(s)) return;
      if (/\b(?:tarot|deck|cards?)\b/i.test(s)) return;
      candidates.push({ scene, file: f, sentence: s.slice(0, 260), before: (sents[i - 1] || '').slice(-160) });
    });
  }

  if (!candidates.length) { console.log('\n  no physical-reaction sentences found.\n'); process.exit(0); }

  // Classification needs judgement, not a regex: "the same psychological function" is exactly
  // what a pattern-matcher cannot see, and is the thing that went undetected for ten scenes.
  // A closed vocabulary keeps it from inventing a character thesis.
  const items = await classify(candidates.map((c, i) =>
    `${i + 1}. [scene ${c.scene}] …${c.before} >>> ${c.sentence}`).join('\n'));

  for (const it of items) if (candidates[it.n - 1]) Object.assign(candidates[it.n - 1], it);

  // A function repeating across scenes is the defect the object-ledger could not see.
  const byFn = {};
  for (const c of candidates) if (c.fn) (byFn[c.fn] = byFn[c.fn] || []).push(c);

  if (asJson) { console.log(JSON.stringify({ candidates, byFn }, null, 1)); process.exit(0); }

  console.log(`\n${'═'.repeat(78)}\nBODY TELL REPORT   ${files.length} scene(s) · ${candidates.length} physical reaction(s)\n${'═'.repeat(78)}`);
  for (const c of candidates) {
    const prior = (byFn[c.fn] || []).filter(x => x.scene < c.scene).map(x => x.scene);
    // Never "REJECT — uncaused": that phrasing invites the repair model to bolt on a reason,
    // which produces "his hand tightened because he was afraid" — the same defect in prose form.
    const bad = c.permission === 'BAD';
    const verdict = !bad ? 'keep'
      : prior.length >= 2
        ? 'REWRITE — psychological information asserted through a physical tell without narrative evidence, and this function is over-used'
        : 'REWRITE — psychological information asserted through a physical tell without narrative evidence';
    console.log(`\n  [scene ${c.scene}] ${c.sentence.slice(0, 104)}`);
    console.log(`     permission: ${String(c.permission || '?').padEnd(11)} function: ${String(c.fn || '?').padEnd(19)}`
      + (prior.length ? `same function in scene(s) ${prior.join(',')}` : 'first of its function'));
    console.log(`     → ${verdict}`);
  }
  console.log(`\n${'─'.repeat(78)}\n  FUNCTION SPREAD — repetition here is the defect, whatever body staged it:`);
  for (const [fn, xs] of Object.entries(byFn).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`   ${xs.length >= 3 ? '✗' : xs.length === 2 ? '·' : ' '} ${fn.padEnd(20)} ${xs.length}×  scenes ${xs.map(x => x.scene).join(',')}`);
  }
  const spread = {};
  for (const c of candidates) spread[c.permission || '?'] = (spread[c.permission || '?'] || 0) + 1;
  console.log('\n  PERMISSION SPREAD: ' + Object.entries(spread).map(([k, v]) => `${k} ${v}`).join(' · '));
  console.log(`  ${spread.BAD || 0}/${candidates.length} flagged. A body should betray the character against a specific`);
  console.log('  pressure. Removing every tell is the opposite failure — see the false-removal rate.\n');

}
