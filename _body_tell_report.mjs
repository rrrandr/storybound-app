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
const REACT = '(?:lift\\w*|press\\w*|bounc\\w*|scrap\\w*|tighten\\w*|clench\\w*|curl\\w*|flex\\w*|twitch\\w*|shift\\w*|mov\\w*|catch|caught|hitch\\w*|quicken\\w*|race[ds]?|racing|tremb\\w*|still\\w*|settle[ds]?|stiffen\\w*|loosen\\w*|drop\\w*|rose|risen|burn\\w*|knot\\w*|turn\\w*|brush\\w*|rub\\w*|work\\w*|part\\w*)';
const TELL = new RegExp(`\\b(?:my|his|her|its|their|the)\\b[^.!?]{0,26}?\\b${BODY}\\b[^.!?]{0,45}?\\b${REACT}\\b`, 'i');

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
const SYS = `You classify physical-reaction sentences from a novel. You do not rewrite anything.

For each numbered sentence, decide:
  cause  — is there a reason IN THE TEXT for this body to do this, right now? One of:
    "triggered"  something just said/done/arrived caused it
    "history"    it draws on this character's established past or habit
    "delayed"    it is deliberately unexplained now, clearly set up to pay off later
    "none"       it exists only as a translation of an emotion. THIS IS THE DEFAULT.
  To claim anything other than "none" you must be able to point at the specific words that
  supply the cause. If you cannot quote them, the answer is "none". Emotional atmosphere,
  general tension, and the scene being dramatic are NOT causes.
    "My breath caught." -> none. "My fingers trembled." -> none. "His shoulders tensed." -> none.
    "His hand tightened when she said his brother's name." -> triggered (the naming).
    "She reached for the clasp before remembering she had given it away." -> history.
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

Return ONLY JSON: {"items":[{"n":1,"cause":"none","fn":"blocked-expression","because":"<the words supplying the cause, or empty>"}]}`;

const list = candidates.map((c, i) => `${i + 1}. [scene ${c.scene}] …${c.before} >>> ${c.sentence}`).join('\n');
const r = await fetch('http://localhost:3000/api/mistral-proxy', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'mistral-small-latest', temperature: 0.1, max_tokens: 1400,
    messages: [{ role: 'system', content: SYS }, { role: 'user', content: list }] }),
});
const d = await r.json();
let items = [];
try { items = JSON.parse(String(d.content || d.choices?.[0]?.message?.content || '')
  .replace(/^```json\s*|\s*```$/g, '')).items || []; } catch (_) { console.log('  (unparseable classifier reply)'); }

for (const it of items) if (candidates[it.n - 1]) Object.assign(candidates[it.n - 1], it);

// A function repeating across scenes is the defect the object-ledger could not see.
const byFn = {};
for (const c of candidates) if (c.fn) (byFn[c.fn] = byFn[c.fn] || []).push(c);

if (asJson) { console.log(JSON.stringify({ candidates, byFn }, null, 1)); process.exit(0); }

console.log(`\n${'═'.repeat(78)}\nBODY TELL REPORT   ${files.length} scene(s) · ${candidates.length} physical reaction(s)\n${'═'.repeat(78)}`);
for (const c of candidates) {
  const prior = (byFn[c.fn] || []).filter(x => x.scene < c.scene).map(x => x.scene);
  const verdict = c.cause && c.cause !== 'none' ? 'keep'
    : prior.length ? 'REJECT — uncaused, and this function is already spent' : 'REWRITE — uncaused';
  console.log(`\n  [scene ${c.scene}] ${c.sentence.slice(0, 104)}`);
  console.log(`     cause: ${String(c.cause || '?').padEnd(10)} function: ${String(c.fn || '?').padEnd(19)}`
    + (prior.length ? `same function in scene(s) ${prior.join(',')}` : 'first of its function'));
  console.log(`     → ${verdict}`);
}
console.log(`\n${'─'.repeat(78)}\n  FUNCTION SPREAD — repetition here is the defect, whatever body staged it:`);
for (const [fn, xs] of Object.entries(byFn).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`   ${xs.length >= 3 ? '✗' : xs.length === 2 ? '·' : ' '} ${fn.padEnd(20)} ${xs.length}×  scenes ${xs.map(x => x.scene).join(',')}`);
}
const uncaused = candidates.filter(c => !c.cause || c.cause === 'none').length;
console.log(`\n  ${uncaused}/${candidates.length} uncaused. The body should betray the character against a specific`);
console.log('  pressure — not narrate the emotion the reader was going to infer anyway.\n');
