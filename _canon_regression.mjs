// CUMULATIVE CANON REGRESSION — every rule ever added, checked every run.
// A test that only asserts the newest rules reports green while older ones rot.
// usage: node _canon_regression.mjs <_validate_out/RUNDIR>
import fs from 'fs';
const dir = process.argv[2];
if (!dir) { console.error('usage: node _canon_regression.mjs <_validate_out/RUNDIR>'); process.exit(1); }

const read = (...names) => { for (const n of names) { try { return fs.readFileSync(`${dir}/${n}`,'utf8'); } catch(_) {} } return ''; };
let prose = read('all_prose.txt','all_final.txt');
if (!prose) prose = ['scene1_final.txt','scene2_final.txt','scene3_final.txt','final.txt']
  .map(f => read(f)).filter(Boolean).join('\n\n');
if (!prose) { console.error('no prose found in ' + dir); process.exit(1); }
const S1 = prose.slice(0, Math.max(2200, Math.floor(prose.length * 0.45)));

const has = (rx, t = prose) => rx.test(t);
const count = (rx, t = prose) => (t.match(rx) || []).length;

// id · rule · check(): true = PASS · detail
const RULES = [
  ['⑤f', 'rite order: cost spoken before the desire',
    () => { const o = S1.search(/\b(?:I offer|I give)\b/i);
            const d = S1.search(/\bso that\b|\bso she may\b|\bthat she may\b/i);
            return o >= 0 && d >= 0 && o < d; }],
  ['⑤g', 'offering is a MEMORY, not an abstraction',
    () => has(/\b(?:offer(?:s|ed|ing)?|give|gave|gives)\b[^.!?]{0,70}\bmemor(?:y|ies)\b|\bmemor(?:y|ies)\b[^.!?]{0,70}\b(?:offer(?:s|ed|ing)?|give|gave|gives)\b/i, S1)],
  ['⑤g', 'offering is SPOKEN as dialogue',
    () => has(/[\u201C"][^\u201D"]{0,180}(?:I offer|I give)[^\u201D"]{0,200}[\u201D"]/i, S1)],
  ['⑤h', 'twist is immediate — no deferred irony',
    () => !has(/(years later|would later|in time she would|one day she would|it would be years)/i, S1)],
  ['⑤h', 'twist uses someone/something ALREADY PRESENT',
    () => has(/(already present|among those|stepped forward|rose from|turned toward|in the clearing|spoke the name)/i, S1)],
  ['⑤i', 'price stays INSIDE the offering (no unoffered faculty)',
    () => { // any faculty NEAR a loss verb, in either order — not a fixed phrasing
            const LOSS = '(?:took|takes|taken|stripped|stole|failed|gone|lost|died|withered|emptied|silenced)';
            // strip idioms first: "in the same breath", "in one breath" mean IMMEDIATELY,
            // not a faculty being taken. A false positive here trains people to ignore reds.
            const T = S1.replace(/in (?:the same|one|a single) breath/gi, ' ');
            for (const w of ['voice','sight','eyes','hands','years','breath','name']) {
              const rx = new RegExp(`\\b${w}\\b[^.!?]{0,50}\\b${LOSS}\\b|\\b${LOSS}\\b[^.!?]{0,50}\\b${w}\\b`,'i');
              const m = T.match(rx);
              if (m) return F(m[0].trim(), 'the price confined to what was named in the offering', 'canon_⑤i');
            }
            return true; }],
  ['⑤j', 'Tempt Fate never CHOSEN by a character',
    () => !has(/\b(?:I|she|he)\s+(?:chose|choose|played|drew|took)\s+[""]?Tempt Fate/i)],
  ['⑤k', 'no rule-recitation / enumerated violations',
    () => !has(/(beneficiary was not|counted the fractures|the target had no name|an open price)/i)],
  ['⑤l', "named office used, not a generic substitute",
    () => { const m = prose.match(/\b(?:an?|the)\s+elder\b(?!\s*(?:Dohkar|Profer|Chayr))/i);
            if (!m) return true;
            return F(m[0], 'the office (Dohkar/Profer/Chayr), or "eldest Dohkar" if age is the point',
                     'canon_⑤l_examples'); }],
  ['⑤m', 'blank-page proverb requires an OPEN offering nearby',
    () => { const i = prose.search(/blank page/i); if (i < 0) return true;
            const near = prose.slice(Math.max(0,i-900), i+400);
            const open = /(take what(?:ever)? you (?:will|demand)|whatever the (?:cost|price)|whatever it costs|name your own price|I surrender anything|unspecified)/i.test(near);
            if (open) return true;
            const named = (near.match(/\b(?:I offer|I give)[^.!?]{0,80}/i) || [''])[0];
            return F('proverb fired after a NAMED price: ' + named.trim(),
                     'an open/unbounded offering within ~900 chars before the proverb',
                     'canon_⑤m'); }],
  ['FATE', 'Fate manifests nothing — no apparition',
    () => !has(/(stepped from the trees|apparition|summoned figure|wearing (?:a|his|her) face|took the shape of)/i)],
  ['RITE', 'no invented seal/binding/circle machinery',
    () => { const m = prose.match(/\b(?:the\s+)?(?:seal|binding|circle)\b[^.!?]{0,50}\b(?:broke|broken|breaking|failed|shattered|snapped)\b|\b(?:broke|broken|shattered)\b[^.!?]{0,40}\b(?:the\s+)?(?:seal|circle|binding)\b|\bunsealed\b[^.!?]{0,30}(?:wish|rite)/i);
            return m ? F(m[0].trim(), 'no seal/binding/circle mechanics — the rite has no machinery', 'canon_rite') : true; }],
  ['⑤i', 'Fate cost expressed in the OFFERED domain',
    () => { const offered = /\b(?:offer|give)[^.!?]{0,60}\bmemor(?:y|ies)\b/i.test(S1) ? 'memory' : null;
            if (!offered) return true;
            const bodyCost = S1.match(/(?:iris|eyes?|hair|skin|voice|hands?)[^.!?]{0,50}(?:went|lost|drained|faded|failed|white)/i)
                          || S1.match(/(?:colou?r|green|light)[^.!?]{0,30}(?:drained|left|fled|faded)/i);
            if (!bodyCost) return true;
            return F(bodyCost[0].trim(),
                     'loss expressed in the memory domain — what she can no longer reach, or what remains without its meaning',
                     'canon_⑤i_examples'); }],
  ['CALC', 'no heel tic monoculture',
    () => count(/\bheel(?:s)?\b[^.!?]{0,40}(?:lifted|scraped|dug|grinding|pressed|tapped)/gi) <= 1],
  ['LI',   'attraction not asserted via eyes/gaze cliché',
    () => !has(/(his gaze held mine|eyes held mine|held (?:my|her) gaze)/i)],
  ['SPINE','no characters outside the declared cast',
    () => !has(/\b(?:Mira|Thorne|Hunched Eye)\b/)],
  ['SPINE','Seren is named, not "the youth"',
    () => count(/\bSeren\b/) > 0 && count(/the youth/i) === 0],
  // ── PRESENCE CHECKS. Every rule above verifies a bad pattern is ABSENT. A scene can
  // satisfy all of them and still contain no twist and no Character+ — which is exactly
  // what testB did while scoring 20/20. These assert the good thing EXISTS.
  ['TWIST', 'the wish is FULFILLED — Fate answers the words, not just consequences',
    () => { const w = prose.search(/\bfind the one (?:she|I) lost/i);
            if (w < 0) return F('no wish located', 'a spoken wish for Fate to answer', 'canon_⑤h');
            const after = prose.slice(w, w + 2500);
            // Fulfilment = the wished-for thing OCCURS. For "find the one she lost":
            // someone is found, named, revealed, arrives, or claims the description.
            const FULFIL = /\b(?:found (?:him|her|them|me)|had been found|spoke (?:the|a) name|said (?:my|her) name|named (?:him|her|the man)|stepped out of|rose from the (?:crowd|assembly)|came forward and|claimed the (?:name|words)|answered to (?:it|that name)|turned out to be|was standing (?:there|among))\b/i;
            const m = after.match(FULFIL);
            if (m) return true;
            // Social fallout is NOT fulfilment — name it so the failure is legible.
            const fallout = /\b(?:explain|deviation|conclusions|accus|blame|judgment|inquiry)\b/i.test(after);
            return F(fallout ? 'only social fallout after the wish (accusation/explanation), no fulfilment'
                             : 'nothing fulfils the wish\'s literal wording',
                     'the words come true by an ordinary route — someone found, named, or revealed in the room',
                     'canon_⑤h'); }],
  ['CHAR+', 'at least one Character+ beat — observation bound to accumulated knowledge',
    () => { // A beat spans sentences: the observation in one, the knowledge in the next.
            // Slide a 3-sentence window; the person may be named OR a pronoun whose
            // referent was named inside the window.
            const CAUSAL = /(because (?:he|she|they) (?:had|never|always)|the way (?:he|she) (?:had|used to|always|once)|(?:he|she) (?:always|never) (?:does|did|moves|answers|says|looks)|I had (?:learned|watched|seen|heard) (?:him|her|it)|the same (?:\w+ ){0,4}(?:he|she) (?:had|used|uses)|as usual|(?:he|she) had taught me|I had heard it \w+ times|had taught me never|mistaken it for)/i;
            const PERSON = /\b(?:Julian|Seren|Dohkar|he|she|his|her)\b/i;
            const sents = prose.split(/(?<=[.!?\u201D"])\s+/);
            for (let k = 0; k < sents.length; k++) {
              const win = sents.slice(k, k + 3).join(' ');
              if (CAUSAL.test(win) && PERSON.test(win)) return true;
            }
            return F('no beat ties an observation to what the narrator has accumulated about a person',
                     'e.g. "He never moves when people expect him to defend himself; I had watched him do it four times."',
                     'feedback_character_plus_mechanisms'); }],
  ['FMT',  'no truncated sentences',
    () => { const m = prose.match(/\b(?:as|like|than|of|the|a|an|and|with|into)\s*\.(?:\s|$)/);
            return m ? F(prose.slice(Math.max(0,prose.indexOf(m[0])-60), prose.indexOf(m[0])+12).trim(),
                         'complete sentences', 'harness_fmt') : true; }],
  ['FMT',  'no markdown leaking into prose',
    () => !has(/\*\*/)],
  ['FMT',  'no unresolved template tokens',
    () => !has(/\{[A-Z][A-Z0-9_]{2,23}\}/)],
  ['POV',  'first person holds — no third-person PC verbs',
    () => count(/\bLirael\s+(?:stepped|crossed|felt|watched|tore|raised|knew)\b/g) === 0],
];

let pass = 0, fail = [];
const F = (found, expected, source) => ({ ok:false, found, expected, source });
console.log(`\nCANON REGRESSION — ${dir}  (${prose.length} chars of prose)\n`);
for (const [id, rule, fn] of RULES) {
  let r; try { r = fn(); } catch (e) { r = { ok:false, found:'check threw: '+e.message, expected:'check to run', source:'harness' }; }
  const ok = (r === true) || (r && r.ok === true);
  if (ok) pass++; else fail.push({ id, rule, ...(typeof r === 'object' ? r : {}) });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(6)} ${rule}`);
}
console.log(`\n  ${pass}/${RULES.length} canon rules hold.`);
if (fail.length) {
  console.log('\n  REGRESSIONS');
  for (const f of fail) {
    console.log(`\n    RULE      ${f.id} ${f.rule}`);
    if (f.found)    console.log(`    FOUND     ${String(f.found).slice(0,150)}`);
    if (f.expected) console.log(`    EXPECTED  ${f.expected}`);
    console.log(`    SOURCE    ${f.source || 'canon_' + f.id}`);
  }
}
process.exitCode = fail.length ? 1 : 0;
