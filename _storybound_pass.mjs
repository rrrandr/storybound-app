// STORYBOUND+ PASS — finds the gaps locally, then asks Grok to fill only those.
//
// Two-stage on purpose. Stage 1 is free and deterministic: scan the finished scene for the
// specific defects worth repairing. Stage 2 sends ONLY those gaps, so the model is never
// asked "what could be better here?" — a question that invites decoration.
//
// GAPS IT LOOKS FOR
//   1. A named character who SPEAKS but is carried by one or two physical traits and no
//      chosen self-presentation. Hair colour and a scar are not a person.
//   2. No environmental grounding at all — a scene played on a blank stage.
//   3. Grounding present but never upgraded: surfaces and light with no relationship to
//      anyone, when someone in the scene plainly has one.
//
// INVENTION IS EXPECTED. To write C+ or E+ the pass must invent history that was not in the
// scene — a bent card corner, a chair nobody replaced. That is the job. The cost is that an
// invented fact becomes canon the next scene has to honour, so every invention is reported
// separately under NEW FACTS for carrying forward into continuity.
//
// usage: node _storybound_pass.mjs <scene.txt> [--lens=OPEN_VEIN] [--apply]
import fs from 'fs';
import { load, ingest, save, renderForAuthor, renderForExtractor, describe,
         recordSlot, slotStatus, SLOT_COOLDOWN, recordShells } from './_canon_state.mjs';
import { loadMechanisms, renderMechanismMenu, renderRotation, EPLUS_AXES, shapeEcho,
         shellKeys, shellEcho } from './_cplus_rules.mjs';

const MECHS = loadMechanisms().map(m => m.letter);
const AXES = EPLUS_AXES.map(a => a.key);

const file = process.argv.find(a => a.endsWith('.txt'));
const lens = (process.argv.find(a => a.startsWith('--lens=')) || '=').split('=')[1] || 'OPEN_VEIN';
const APPLY = process.argv.includes('--apply');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '=').split('=')[1] || '';
// EXEMPLAR SWAP. The Character+ examples below use "Dohkar Raes" — a name that is also live
// cast in these scenes. A demonstration built from the story's own entities is indistinguishable
// from canon at read time, so --exemplar=neutral renames it to test whether the observations
// the extractor produces about Dohkar are the story's or the prompt's.
const NEUTRAL = process.argv.includes('--exemplar=neutral');
if (!file) { console.error('usage: node _storybound_pass.mjs <scene.txt> [--lens=X] [--apply]'); process.exit(2); }
const scene = fs.readFileSync(file, 'utf8');

// Fixed template text the app splices in. Never offer it for repair.
const PROTECTED = [
  /I realize that old tarot deck is still in my hand[\s\S]{0,400}$/i,
  /Reassuringly solid\. Present\./i,
];
const body = PROTECTED.reduce((t, rx) => t.replace(rx, ''), scene);

const S = body.split(/(?<=[.!?"”])(?=[A-Z"“‘'])|(?<=[.!?"”])\s+/).map(x => x.trim()).filter(Boolean);
const QUOTED = /[“”"]/;
const TRAIT = /\b(hair|eyes?|skin|scar|braid|jaw|mouth|shoulders?|tall|slender|freckl\w+|beard|hands?)\b/i;
const CHOSEN = /\b(corrected|insisted|refused to|volunteered|arranged|announced|never once (?:let|allowed)|always (?:took|chose|sat|waited|answered|wore|brought)|the way (?:he|she|they) always did|as usual|made a point of|answered before)\b/i;
const MATERIAL = /\b(stone|wood|moss|grass|spiralgrass|bark|cloth|silk|gossamer|leather|metal|tile|glass|earth|dirt|water|floor|wall|table|chair|door)\w*\b/i;
const LIGHT = /\b(sun\w*|dappled|shadow\w*|dark\w*|dim\w*|dusk|dawn|lamp\w*|torch\w*|candle\w*|moon\w*|firelight|glare|grey|overcast|daylight|lamplight)\b/i;
const INTERPRETIVE = /\b(as (?:though|if)|had (?:learned|spent|always|never|once)|nobody (?:had|remembered|alive)|no one had ever|used to|had been (?:built|carved|replaced|repaired)|older than|remembered why)\b/i;

const NOT_A_PERSON = new Set(['The', 'She', 'His', 'Her', 'Him', 'They', 'Them', 'That', 'This',
  'Every', 'When', 'Then', 'Stop', 'Close', 'Present', 'Protocol', 'Run', 'Eyes', 'Let', 'You', 'Your',
  'Fate', 'Tempt', 'Petition', 'Weave', 'Script', 'Weave-Script', 'Veilweave', 'Veilwood', 'Favored',
  'First', 'Sacrifice', 'Ascendant', 'Fold', 'Nothing', 'Someone', 'Everyone', 'Because', 'What', 'Why']);

// Named speakers = a capitalised name in or beside a quoted line.
const names = new Map();
S.forEach((s, i) => {
  const near = [S[i - 1], s, S[i + 1]].filter(Boolean).join(' ');
  if (!QUOTED.test(near)) return;
  for (const m of s.matchAll(/\b([A-Z][a-z]{2,})\b/g)) {
    const n = m[1];
    // NOT PEOPLE. Capitalised recurring tokens near a quote also catch the PC pronoun, world
    // mechanics and compound proper nouns, and the pass would then dutifully invent "chosen
    // self-presentation" for Fate — which canon says is never seen and is not a character.
    if (NOT_A_PERSON.has(n)) continue;
    if ((body.match(new RegExp(`\\b${n}\\b`, 'g')) || []).length < 2) continue;  // a real name recurs
    names.set(n, (names.get(n) || 0) + 1);
  }
});

const state = load();
const now = (state.scenes || []).includes(file) ? (state.scenes || []).indexOf(file) + 1 : (state.scenes || []).length + 1;

// THE QUESTION CHANGED. It used to be "does this character have a Character+ beat in this
// scene?", which fires every scene forever and is how a character acquires one mechanism as a
// personality. It is now "does this character have an UNSPENT mechanism?" — a character whose
// slots are all on cooldown is left alone.
const gaps = [];
for (const [n] of names) {
  const rx = new RegExp(`\\b${n}\\b`);
  const mine = S.filter(x => rx.test(x));
  const traits = mine.filter(x => TRAIT.test(x)).length;
  const chosen = mine.some(x => CHOSEN.test(x));
  if (chosen || traits > 2) continue;
  const st = slotStatus(state, n, MECHS, now);
  if (!st.available.length) {
    console.log(`   (skipping ${n} — every mechanism spent within ${SLOT_COOLDOWN} scenes: ${st.spent.join(', ')})`);
    continue;
  }
  gaps.push({ kind: 'C+', subject: n, slots: st,
    note: `speaks; carried by ${traits} physical trait(s) and no chosen self-presentation`
      + (st.spent.length ? `; has spent ${st.spent.join(', ')}` : '') });
}
const hasMaterial = S.some(x => MATERIAL.test(x));
const hasLight = S.some(x => LIGHT.test(x));
const groundedSentences = S.filter(x => MATERIAL.test(x) || LIGHT.test(x));
const hasEplus = groundedSentences.some(x => INTERPRETIVE.test(x));
if (!hasMaterial || !hasLight) {
  gaps.push({ kind: 'E', subject: 'the scene',
    note: `no place established (${hasMaterial ? '' : 'no surface/material'}${!hasMaterial && !hasLight ? ', ' : ''}${hasLight ? '' : 'no quality of light'})` });
} else if (!hasEplus) {
  const st = slotStatus(state, 'the scene', AXES, now);
  gaps.push({ kind: 'E+', subject: 'the scene', slots: st,
    note: `${groundedSentences.length} grounding sentence(s), none carrying a relationship to anyone`
      + (st.spent.length ? `; axes already used here: ${st.spent.join(', ')}` : '') });
}

console.log(`\n${'═'.repeat(78)}\nSTORYBOUND+ PASS   ${file}   lens ${lens}\n${'═'.repeat(78)}`);
const wanted = ONLY ? gaps.filter(g => g.kind === ONLY) : gaps;
console.log(`\nGAPS FOUND (local scan, free):`);
if (!gaps.length) console.log('   none — scene already carries its people and its place');
for (const g of gaps) console.log(`   [${g.kind}] ${g.subject} — ${g.note}`
  + (ONLY && g.kind !== ONLY ? '   (skipped, --only=' + ONLY + ')' : ''));
if (ONLY && !wanted.length) { console.log(`\n  no [${ONLY}] gap in this scene — nothing to test here.`); process.exit(0); }
if (!gaps.length || process.argv.includes('--scan')) process.exit(0);  // --scan = local only, free

// Only mechanisms that are actually free are shown. An exhausted slot is not "discouraged" —
// it is absent from the menu, because a model offered a mechanism will reach for it.
const freeC = [...new Set(gaps.filter(g => g.kind === 'C+').flatMap(g => (g.slots ? g.slots.available : MECHS)))]
  .sort();
const freeE = [...new Set(gaps.filter(g => g.kind === 'E+').flatMap(g => (g.slots ? g.slots.available : AXES)))];
const C_MENU = renderMechanismMenu(freeC.length ? freeC : MECHS);
const E_MENU = EPLUS_AXES.filter(a => !freeE.length || freeE.includes(a.key))
  .map(a => `  ${a.key} · ${a.axis}: ${a.example}`).join('\n');

const WRITER_SYS = `You are an editor for Storybound, writing in the voice of S. Tory Bound.
You are given a finished scene and a list of specific gaps. Fix ONLY those gaps.

CHARACTER+ — the person DOES something to control how they are read, it costs them
something, and the narrator reads that choice. Not a feeling. Not an involuntary tell (a
tremor, a caught breath, a blush is texture, never the insight).

ROTATE MECHANISMS, NEVER SURFACES. A person is revealed through a DIFFERENT lens each time
they appear. Writing the same mechanism again in fresh words is the failure this rule exists
to prevent: leading with a neckline, then choosing a dress by its neckline, then angling the
body — three sentences, one mechanism, a person flattened into a single trait.
These are the mechanisms STILL AVAILABLE. Use one of them and no other. They demonstrate the
PHYSICS, never the choreography — do not reuse their syntax or connective tissue:
${C_MENU}

ENVIRONMENT+ — what a PLACE **or an OBJECT** has become because of what happened to it. Objects
count fully: a blade, a card, a coat, a door, a cup. Not symbolism, not atmosphere, not lore.
It rotates the same way. Axes still available here:
${E_MENU}
ENVIRONMENT+ DECISION TEST — apply this before writing anything environmental:
  "Would this place or object be ANY DIFFERENT if this story had never happened here?"
  If the answer is no, what you have written is scenery, and scenery is not Environment+.
  Add ONE concrete fact showing history, use, damage, ownership, repair, ritual, or memory.
  ✗ "The interrogation room had white walls and a metal table."   ← scenery; fails the test
  ✓ "The table had been replaced recently. The old scratches where people had waited for
    verdicts were gone, but everyone still looked at the same corner."
  Not symbolism. Not atmosphere. Never "the room remembered" or "the walls had seen" — a
  place does not have a memory; the people who used it do, and the marks they left are the
  only evidence you may use.

FUSION is best: one sentence where a person and a thing reveal each other.
  ✓ "She recognised the scratch in the metal table. She had made it three years ago, when
    she was the one asking the questions."
  ✓ "She hated the flat's kitchen because the previous owner had put in a second sink."
  ✓ "He never sat on the balcony. She noticed because the balcony was the one place in the
    house where the city disappeared."
  ✓ "Mara sat at the kitchen table. The burn mark beside her plate was the one thing her
    father had left exactly as it was after he ruined her birthday cake."

YOU MAY AND SHOULD INVENT HISTORY — a habit, an old argument, who bent the corner of a card.
That is how these beats are made. Report every invented fact so the story can carry it.

DO NOT ADD A REACTION. THIS IS THE MOST COMMON WAY THIS TASK FAILS, AND IT FAILS HERE MORE THAN
IT FAILS FOR THE AUTHOR. The author is writing a scene and can feel whether a body belongs. You
are handed "this character needs depth" and the nearest thing to hand is a physical reaction —
which is how a repair pass becomes the main producer of tics in a story.
  BEFORE reaching for a body: look for something ALREADY IN THE SCENE that can carry the
  information — an action the character is already performing, an object already in their hands,
  a choice they are already making, a thing they are already doing to the room. Use that.
  Add a physical reaction ONLY if the scene ALREADY SUPPLIES ITS CAUSE — something just said,
  just done, just arrived. If you have to invent the cause too, you are writing a new beat, not
  repairing one.

NO BODY TICS. THIS IS THE MOST COMMON WAY THIS TASK FAILS. A hand pressed to a thigh, fingers
at a collar, a thumb dragged along a lip, a jaw tightening, a heel scraping — these are
movements in the moment. They reveal nothing chosen and nobody would notice most of them.
BANNED: any fresh gesture invented for a body in the present moment.
What you add must be a HABIT or a CHOICE with a history: something the person does REPEATEDLY,
or refuses to do, or does differently from everyone else, or does knowing it will be seen.
  ✗ "his fingers rested against the seam of his collar"  ✓ "he asked for silence the way other
    men ask for a chair, and got it"
  ✗ "she pressed the torn band to her thigh"  ✓ "she gave the apology first, the way she always
    did when she had already decided not to change anything"

LIMITS: no new named characters, no new lore or magic, no plot events, no change to who does
what. Never explain psychology ("because he feared…"). Clear on first read — no compressed
abstractions, no false precision ("half a degree", "half a beat"). Keep each replacement close
in length to what it replaces.

Protagonist's lens: ${lens}. The reading should be one only this protagonist would make.

A REPAIR IS AN UPGRADE, NOT A REWRITE. This is the rule that matters most, and the one this
task fails hardest. Every sentence is already doing a job — introducing someone, carrying an
action, anchoring the POV. You are adding a layer to that job. You are never replacing it.

  YOU MAY ADD: history, relationship, use, damage, ownership, sensory specificity, a
  consequence someone observed.
  YOU MAY NOT REMOVE: the character performing the action, the action itself, who is
  observing, any named entity, any object the sentence introduced, or a physical descriptor
  that establishes what someone IS.

  If the sentence carries a character's entrance, THE CHARACTER MUST STILL BE THERE after
  your upgrade. A scene about a person must not become a paragraph about the floor.
  ✗ was: "The youth knelt on the crimson spiralgrass, her aqua skin luminous under the dawn
    veil-canopy."
    now: "The crimson spiralgrass showed flattened spirals where knees had pressed during
    every prior rite." ← good history, but it deleted the youth, the kneeling, and her skin.
  ✓ now: "The youth knelt on the crimson spiralgrass beneath the dawn veil-canopy, her aqua
    skin catching the light where generations of kneelers had worn three shallow places into
    the ground."
  Add the environment AROUND the existing action, never INSTEAD OF it. When both land in one
  sentence you have fusion, which is the best outcome available.

THE SCENE IS NUMBERED BY SENTENCE. You upgrade WHOLE SENTENCES, identified by number — never
a fragment. Keep any dialogue word for word. One or two sentences out for one in; no more.

Before writing each upgrade, state the sentence's JOB and what MUST SURVIVE it. Both are
checked. Each must_preserve entry must be WORDS COPIED FROM THE ORIGINAL SENTENCE — "The
Dohkar's mouth opened", "muffled" — never a description of them ("the dialogue that follows",
"the tension"). Copy the words; do not summarise what they do. Listing something that is not
in the original sentence, or dropping something you listed, is a failed patch.

Return ONLY JSON:
{"patches":[{"kind":"C+|E|E+|fusion","sentence":<number>,
"slot":"<the mechanism letter (C+) or axis key (E+) you used — must be one offered above>",
"job":"<what this sentence is for, e.g. 'introduces the youth kneeling in ritual space'>",
"must_preserve":["<thing from the original that has to survive>", "..."],
"replacement":"<the complete upgraded sentence(s)>"}]}`;

// TWO CALLS, AND THE SPLIT IS THE POINT. The first writes prose and is shown only what the
// state layer has cleared for an author. The second writes no prose at all and is shown
// everything, including single observations, so it can recognise a repeat.
//
// They were one call until a live test caught the leak: the extractor list reached the model
// that holds the pen, and it dutifully wrote scene 1's once-seen gesture into scene 2 —
// manufacturing the pattern the tiers exist to make the story earn. Withholding observations
// from "the author" means nothing if the repair model sees them and also writes.
const cast = [...names.keys()];
const safe = renderForAuthor(state, cast);
const known = renderForExtractor(state, cast);

const ask = async (sys, user, max) => {
  const r = await fetch('http://localhost:3000/api/proxy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'grok-4.3', temperature: 0.6, max_tokens: max,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }),
  });
  const d = await r.json();
  const u = d.usage || {};
  let json = {};
  try { json = JSON.parse(String(d.content || d.choices?.[0]?.message?.content || '')
    .replace(/^```json\s*|\s*```$/g, '')); } catch (_) { console.log('  (unparseable reply)'); }
  return { json, model: d.model, cost: ((u.prompt_tokens || 0) * 1.25e-6) + ((u.completion_tokens || 0) * 2.5e-6),
    tok: `${u.prompt_tokens || '?'}/${u.completion_tokens || '?'}` };
};

const w = await ask(NEUTRAL ? WRITER_SYS.replace(/Dohkar Raes/g, 'Ellery Kane') : WRITER_SYS,
  `${safe ? safe + '\n\n' : ''}GAPS:\n${wanted.map(g => `- [${g.kind}] ${g.subject}: ${g.note}`
    + (g.slots && g.slots.spent.length ? `\n` + renderRotation(g.slots.spent, g.slots.available) : '')).join('\n')}`
  + `\n\nSCENE (numbered by sentence):\n${S.map((x, i) => `${i + 1}. ${x}`).join('\n')}`, 1100);
const patches = w.json.patches || [];
console.log(`\nWRITER    served ${w.model || '?'} · ${w.tok} tok ≈ $${w.cost.toFixed(4)}`
  + `${safe ? '  (author-safe canon supplied)' : '  (no canon cleared for the author yet)'}`);

let out = scene, applied = 0;
const landed = [];
// CROSS-PATCH ECHO. Each patch is written blind to its siblings, so they converge on the same
// specificity: one E+ run produced "three shallow depressions" and "three stones that had
// anchored every rite", taking the scene from two "three"s to four. A distinctive word one
// patch invents is not available to the next.
const CW = t => (String(t).toLowerCase().match(/[a-z’']{4,}/g) || [])
  .map(w => w.replace(/(?:ings?|ed|es|s)$/, '')).filter(w => !/^(?:that|this|with|from|were|been|have|they|their|there|then|than|when|what|which|would|could|about|into|over|only|some|such|will|your)$/.test(w));
const NUMBER = /^(?:one|two|three|four|five|six|seven|eight|nine|ten|dozen|twice|thrice)$/;
const introduced = new Map();
// Dialogue is plot. Anything quoted in the sentence must survive verbatim in the replacement.
const quotesIn = t => (String(t).match(/[“"][^”"]{4,}[”"]/g) || []).map(x => x.slice(1, -1).trim());
const FRAGMENT = /[.!?][”"’']?\s+[a-z]/g;   // a sentence starting lowercase = orphaned clause
const fragments = t => (String(t).match(FRAGMENT) || []).length;
const before = fragments(scene);

for (const p of patches) {
  const i = Number(p.sentence) - 1;
  const orig = S[i];
  const repl = String(p.replacement || '').trim();
  const bad = [[/\bheels?\b|\bboot toe\b/i, 'unobservable gesture'],
               [/\b(?:fingers?|thumb|hand|palm|jaw|lip)\b[^.]{0,30}\b(?:rest\w*|press\w*|drag\w*|brush\w*|tighten\w*|curl\w*|flex\w*|twitch\w*)\b/i, 'body tic'],
               [/half a (degree|beat|inch)|fraction of an inch/i, 'false precision'],
               [/because (he|she|they) (feared|was afraid|felt)/i, 'psychology stated'],
               [/\bglow\w*\b|light (flared|rose|spread)/i, 'visible magic'],
               [/\b(?:the (?:room|walls?|house|place)) (?:remembered|had seen|knew|watched)\b/i, 'place given a memory']]
    .filter(([rx]) => rx.test(repl)).map(([, l]) => l);

  // STRUCTURAL GUARDS. The previous version anchored on an 8-15 word fragment and let the
  // model end the sentence early, orphaning the tail: "…catching that narrow shaft. beneath
  // the mated-pair trees." Whole sentences in, whole sentences out.
  if (!orig) bad.push(`sentence ${p.sentence} out of range (scene has ${S.length})`);
  else {
    if (scene.split(orig).length - 1 !== 1) bad.push('sentence text is not uniquely locatable');
    if (PROTECTED.some(rx => rx.test(orig))) bad.push('touches template text');
    if (!/^[A-Z"“‘'(]/.test(repl)) bad.push('replacement does not begin a sentence');
    if (!/[.!?][”"’']?$/.test(repl)) bad.push('replacement does not end a sentence');
    const outN = (repl.match(/[.!?][”"’']?(?=\s|$)/g) || []).length;
    if (outN > 2) bad.push(`one sentence expanded into ${outN}`);
    const lost = quotesIn(orig).filter(q => !repl.includes(q));
    if (lost.length) bad.push(`drops dialogue: "${lost[0].slice(0, 40)}"`);
    if (fragments(repl)) bad.push('replacement contains a lowercase sentence start');
    // The exemplars teach the axis; reusing their skeleton is imitation, not learning.
    const echo = shapeEcho(repl);
    if (echo) bad.push(`copies mechanism ${echo.letter}'s sentence shape ("${echo.shared}") — take the axis, not the form`);
    // Vertical imitation (copying an exemplar) was guarded; horizontal self-repetition — the
    // story reusing its OWN delivery form — was not, and that is what actually happened.
    const shell = shellEcho(repl, state.shells);
    if (shell) bad.push(`reuses a delivery form already spent in ${String(shell.scene).replace(/^.*\//, '')}`
      + ` ("${shell.sample}") — rotate the FORM as well as the mechanism`);
    // ADD, DO NOT REPLACE. The structural guards stop broken grammar but not a patch that
    // deletes what the sentence was for: an E+ pass overwrote "The youth knelt on the crimson
    // spiralgrass, her aqua skin luminous" with grass history alone, and the scene lost the
    // character's entrance. An upgrade keeps the original's content and adds to it.
    const origCW = [...new Set(CW(orig))], replLower = repl.toLowerCase();
    const kept = origCW.filter(w => replLower.includes(w)).length;
    const keepRatio = origCW.length ? kept / origCW.length : 1;
    if (keepRatio < 0.5) bad.push(`deletes the sentence's content (keeps ${Math.round(keepRatio * 100)}% — an upgrade adds, it does not overwrite)`);

    // THE DECLARED CONTRACT. The model states what must survive; both ends are checked, so a
    // fabricated item ("must preserve: the tension") fails against the original and a dropped
    // one fails against the replacement.
    const mp = Array.isArray(p.must_preserve) ? p.must_preserve.filter(Boolean) : [];
    if (!mp.length) bad.push('no must_preserve declared');
    const survives = (item, text) => {
      const w = CW(item);
      return !w.length || w.filter(x => text.toLowerCase().includes(x)).length / w.length >= 0.5;
    };
    for (const item of mp) {
      if (!survives(item, orig)) bad.push(`must_preserve "${String(item).slice(0, 32)}" is not in the original`);
      else if (!survives(item, repl)) bad.push(`DROPS "${String(item).slice(0, 32)}" — declared as required`);
    }

    // INDEPENDENT ACTOR CHECK. A self-declared contract can be satisfied by declaring
    // something trivial, so who-is-in-the-sentence is verified without asking the model.
    // A sentence that had a person in it must still have one.
    const PERSON = /\b(?:youth|woman|man|girl|boy|child|guest|crowd|narrator|petitioner|stranger|elder|guard|servant|queen|king)\b/i;
    const actors = t => {
      const found = new Set();
      const body = String(t).replace(/^[^a-zA-Z]*/, '');
      for (const m of body.matchAll(/(?<![.!?”"’]\s)(?<!^)\b([A-Z][a-z]{2,})\b/g)) found.add(m[1].toLowerCase());
      const per = String(t).match(new RegExp(PERSON, 'gi')) || [];
      for (const x of per) found.add(x.toLowerCase());
      if (/\b(?:I|my|me)\b/.test(t)) found.add('«pov»');
      return found;
    };
    const had = actors(orig), still = actors(repl);
    const gone = [...had].filter(a => !still.has(a));
    if (had.size && gone.length === had.size) {
      bad.push(`removes everyone the sentence was about (${gone.join(', ')}) — a scene about a person cannot become one about the floor`);
    } else if (gone.length) bad.push(`drops ${gone.join(', ')} from the sentence`);
    // NOT GUARDED: the comma splice ("…since the first gathering, Julian's gaze locked on
    // her…"). A regex for it failed to fire on the real instance, and a guard that catches
    // nothing reads as coverage. Left to the editorial pass until it can be detected properly.
  }

  // Distinctive = a number word (always a tic when repeated), or a word the scene did not
  // already contain. Shared scene vocabulary is not an echo.
  let echoes = [];
  if (orig) {
    const inOrig = new Set(CW(orig));
    const sceneWords = new Set(CW(scene));
    for (const w of new Set(CW(repl))) {
      if (inOrig.has(w)) continue;
      if (!NUMBER.test(w) && sceneWords.has(w)) continue;
      if (introduced.has(w)) echoes.push(`"${w}" (also sentence ${introduced.get(w)})`);
    }
    if (echoes.length) bad.push(`echoes another patch in this batch: ${echoes.join(', ')}`);
  }

  console.log(`\n  [${p.kind}]  sentence ${p.sentence}`);
  console.log(`     was: ${String(orig || '(none)').slice(0, 130)}`);
  console.log(`     now: ${repl.slice(0, 220)}`);
  if (bad.length) console.log(`     ⚠ REJECT: ${bad.join(', ')}`);
  else {
    out = out.replace(orig, repl); applied++; landed.push(repl);
    // Attribute to the character the patch is ACTUALLY about, not the first gap of its kind.
    // Scene 7's beat was about the Chayr and got filed under Dohkar, which silently corrupts
    // the ledger the whole rotation system reads from.
    const candidates = wanted.filter(g => g.kind === p.kind);
    const named = candidates.filter(g => new RegExp(`\\b${String(g.subject).replace(/[^\w]/g, '')}\\b`, 'i').test(repl));
    const subject = named.length === 1 ? named[0].subject
      : candidates.length === 1 ? candidates[0].subject : null;
    if (!subject && candidates.length) {
      console.log(`     ⚠ slot NOT recorded — cannot tell which of ${candidates.map(g => g.subject).join('/')} this is about`);
    }
    recordShells(state, shellKeys(repl), file, repl);
    if (p.slot && subject) {
      recordSlot(state, subject, p.slot, file);
      console.log(`     ⟳ slot ${p.slot} spent for ${subject} (cooldown ${SLOT_COOLDOWN} scenes)`);
    }
    const inOrig = new Set(CW(orig)), sceneWords = new Set(CW(scene));
    for (const w of new Set(CW(repl))) {
      if (inOrig.has(w) || (!NUMBER.test(w) && sceneWords.has(w))) continue;
      if (!introduced.has(w)) introduced.set(w, p.sentence);
    }
  }
}
// Regression guard: whole-sentence replacement cannot orphan a clause, so any increase here
// means an assumption above is wrong. Cheap to check, and it is the exact bug that shipped.
const after = fragments(out);
if (after > before) console.log(`\n  ⚠ FRAGMENTS: ${before} → ${after} — a patch broke a sentence. NOT SAFE TO APPLY.`);

// EXTRACTION — a separate call over the repaired scene. It cannot patch anything; its only
// output is candidates. This is the same law the validators follow: whoever judges does not
// hold the pen.
const EXTRACT_SYS = `You read a finished scene and record what it established about the people
and things in it. YOU DO NOT WRITE OR SUGGEST PROSE. Your only output is canon candidates.

Record a BEHAVIOUR PATTERN, not a one-off and not a mind-read.
  ✓ {"entity":"Dohkar","type":"behaviour","fact":"When asserting authority he stays still and
    makes others come to him"}
  ✗ "Dohkar always sits when speaking" — overcommits from one instance.
  ✗ "Dohkar was secretly afraid" — interpretation. Never record these.
OBJECTS AND PLACES COUNT, and may be recorded before anyone knows why they are that way.
"significance":"unknown" is a correct answer, not a missing one — it leaves a hook for later.
  ✓ {"entity":"the family table","type":"object","fact":"One corner is burned",
    "significance":"unknown"}
Never record what a thing MEANS or represents — only what happened to it.
DO NOT SPEND MEMORY ON PROPS. Record an object ONLY if it recurs, if someone shows attachment
or history toward it, or if this scene gave it a history. A cup that is simply present in one
scene is not canon; skip it.
Record only what THIS scene shows. If it shows nothing new, return an empty list.

Return ONLY JSON:
{"canon":[{"entity":"<who or what>","type":"behaviour|object|place|relationship",
"fact":"<one plain sentence a later scene can honour>","significance":"<objects only, may be unknown>",
"reinforces":"<existing id, when this scene repeats it>",
"contradicts":"<existing id, when this scene breaks it>"}]}`;

const x = await ask(EXTRACT_SYS, `${known ? known + '\n\n' : ''}SCENE:\n${out}`, 700);
const canon = x.json.canon || [];
console.log(`\nEXTRACTOR served ${x.model || '?'} · ${x.tok} tok ≈ $${x.cost.toFixed(4)}`
  + `   ·   pass total $${(w.cost + x.cost).toFixed(4)}`);

// CANON PROPOSALS — queued, never injected. Two reasons. The state layer, not an editor,
// decides what becomes canon. And prompt caching is PREFIX-based: appending discovered facts
// into the middle of the author prompt would invalidate the cached prefix on every scene, so
// deltas belong in the final uncached segment, consolidated periodically rather than growing
// without bound. This file is that queue.
const INTERP = /\b(secretly|really feels?|deep down|is afraid|wants to be loved|hides? (?:his|her|their) (?:fear|pain))\b/i;
if (canon.length) {
  console.log('\nCANON CANDIDATES (proposals — the state layer decides, nothing is auto-applied):');
  const keep = [];
  for (const c of canon) {
    const rejected = INTERP.test(c.fact || '') ? 'interpretation, not canon' : null;
    if (rejected) console.log(`   ✗ [${c.entity}] ${c.fact}   REJECTED: ${rejected}`);
    else keep.push(c);
  }
  // Local backstop for the same rule: the extractor is asked to skip props, and props that
  // slip through are dropped here. An object earns a record by recurring, by being owned, or
  // by having been given a history — not by having been in the room once.
  const OWNED = /\b(?:her|his|their|my|inherited|grandmother|mother|father|family|left (?:to|her|him))\b/i;
  const ephemeral = c => {
    if (c.type !== 'object' && c.type !== 'place') return false;
    if (c.origin === 'repaired' || c.reinforces) return false;
    const head = String(c.entity).replace(/^(?:the|a|an)\s+/i, '').split(/\s+/).pop();
    const mentions = (scene.match(new RegExp(`\\b${head.replace(/[^\w]/g, '')}\\b`, 'gi')) || []).length;
    return mentions < 2 && !OWNED.test(c.entity) && !OWNED.test(c.fact || '');
  };

  const fromRepair = f => landed.some(r => {
    const w = String(f).toLowerCase().match(/[a-z]{5,}/g) || [];
    const hit = w.filter(x => r.toLowerCase().includes(x)).length;
    return w.length && hit / w.length > 0.5;
  });
  for (const c of keep) c.origin = fromRepair(c.fact) ? 'repaired' : 'observed';
  for (const c of keep.filter(ephemeral)) console.log(`   ⌁ prop, not canon: [${c.entity}] ${c.fact}`);
  const durable = keep.filter(c => !ephemeral(c));
  for (const e of ingest(state, durable, file)) console.log(describe(e));
  if (!APPLY) console.log('   (dry run — state not written; add --apply to commit proposals)');
  else save(state);
}
if (APPLY) {
  const dst = file.replace(/\.txt$/, '.patched.txt');
  fs.writeFileSync(dst, out);
  console.log(`\napplied ${applied}/${patches.length} → ${dst}  (original untouched)`);
}
console.log('\nJudge by hand: would another protagonist have made this observation? If yes, reject.\n');
