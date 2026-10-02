// THE READING PACKET — SCENES IN STORY ORDER. Provider-free, $0.
//
// WHY NOT SHUFFLED. The blind packet shuffles slots, which protects prose-quality scoring but
// DESTROYS the context needed for the central question: does the story progress? Repetition,
// remembered events, consequence and character development can only be judged in order, against
// what the reader chose. Roman's correction, and it is right.
//
// WHAT IS WITHHELD, deliberately: every technical result. No verdicts, no facts, no activations, no
// lane routes, no spend, and no mention of the canon-ledger failure. A reader told the memory system
// failed would score the story looking for that failure.
import fs from 'fs';

const RUN = process.argv[2] || '_fs_issue_corpus_out/run_2026-10-02T22-42-28-298Z';
const m = JSON.parse(fs.readFileSync(RUN + '/manifest.json', 'utf8'));
const OUT = RUN + '/reading_packet';
fs.mkdirSync(OUT, { recursive: true });

const choiceFor = (ps) => {
  if (ps.scene === 1) return 'None — this is the fixed opening every reader receives.';
  if (ps.decision && ps.decision.choice) {
    return 'The reader chose: "' + (ps.decision.label || ps.decision.choice) + '"'
      + (ps.decision.axis ? '\n(The choice offered was: ' + ps.decision.axis + ')' : '');
  }
  if (ps.selectedCard) {
    const c = ps.selectedCard.card || {};
    const offered = (ps.cardSet || []).map(x => x.title).filter(Boolean);
    return 'The reader played the Fate card: "' + (c.title || '(untitled)') + '"'
      + (c.text ? '\n' + String(c.text).replace(/\s+/g, ' ').trim() : '')
      + (offered.length ? '\n(Cards offered this scene: ' + offered.join(', ') + ')' : '')
      + '\nNo additional words were typed.';
  }
  return 'Not recorded.';
};

let md = `# One issue of *The First Sacrifice* — reading copy

Ten scenes in story order. Before each scene is the choice the reader made that led into it.

Scene 1 is a fixed, hand-authored opening: every reader of this Book gets exactly this text. Scenes
2 to 10 were generated in response to the choices shown.

## How to read this

Read straight through, in order, as a reader would. Then answer the questions at the end. Judge the
story, not the machinery — no technical results are included here, deliberately, and you should not
try to infer them.
`;

(m.perScene || []).forEach((ps) => {
  const f = RUN + '/scenes/scene_' + String(ps.scene).padStart(2, '0') + '_prose.txt';
  const prose = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim() : '(missing)';
  md += '\n\n---\n\n## Scene ' + ps.scene + '\n\n**Leading into this scene**\n\n'
    + choiceFor(ps).split('\n').map(l => '> ' + l).join('\n') + '\n\n**The scene**\n\n' + prose + '\n';
});

md += `

---

## Questions

Answer from the reading alone.

1. **Progression.** Does the story move? Name, scene by scene, one thing that is true at the end of
   a scene that was not true at the end of the one before. Where you cannot name one, say so.
2. **Repetition.** Are any scenes doing the same work as an earlier scene? Which, and what repeats —
   the event, the emotional beat, the staging, the phrasing?
3. **Memory.** Are events from earlier scenes remembered later? Give examples of something
   established early that is carried, referred to, or built on afterwards — and of anything that is
   dropped as if it never happened.
4. **Consequence.** Do the reader's choices appear to matter? For each choice shown, can you see its
   effect in what follows?
5. **Character.** Do Lirael, Julian, Seren and the Dohkar behave consistently, and does anyone
   change over the ten scenes?
6. **First stall.** If the story stops advancing at some point, name the first scene where that
   happens. If it never does, say that.
7. **Overall.** Would you keep reading after scene 10? Why?

## What this cannot tell us

One trajectory, one set of choices. A different reader's choices would produce a different issue, and
nothing here measures how much of the result is the choices and how much is the engine.
`;

fs.writeFileSync(OUT + '/READING_COPY.md', md);
// A scoresheet that matches the questions, so answers land somewhere structured.
fs.writeFileSync(OUT + '/ANSWERS.md', `# Answers\n\n`
  + `## 1. Progression (per scene)\n\n| scene | what changed | or: nothing I can name |\n`
  + `|---|---|---|\n` + (m.perScene || []).map(p => '| ' + p.scene + ' |  |  |').join('\n')
  + `\n\n## 2. Repetition\n\n## 3. Memory\n\n## 4. Consequence\n\n## 5. Character\n\n`
  + `## 6. First stall scene\n\n## 7. Would you keep reading?\n`);

const words = (m.perScene || []).reduce((n, p) => {
  const f = RUN + '/scenes/scene_' + String(p.scene).padStart(2, '0') + '_prose.txt';
  return n + (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\s+/).length : 0);
}, 0);
console.log('reading packet: ' + OUT);
console.log('  READING_COPY.md — ' + (m.perScene || []).length + ' scenes in order, ~' + words + ' words');
console.log('  ANSWERS.md      — structured answer sheet');
// Prove the withholding rather than assert it.
const leak = ['delivery', 'incomplete_rendering', 'laneRoute', 'no_lane_menu', 'activated',
  'proposalRef', 'prop:', 'MEASURED', 'verifier', 'canon'].filter(k => md.includes(k));
console.log('  technical terms leaked into the reading copy: '
  + (leak.length ? leak.join(', ') + '  <-- FIX' : 'none'));
process.exit(leak.length ? 1 : 0);
