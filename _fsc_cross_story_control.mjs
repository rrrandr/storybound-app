// CROSS-STORY SCOPE CONTROL. Provider-free, no network, $0.
//
// QUESTION: the Stage 3 Tempt consequence compiler was built for First Sacrifice's opening. Its
// atoms, outcomes and briefs are Fatelands canon (Lirael, Seren, the Dohkar, The Answer). But is
// it SCOPED to that story? If not, a reader playing a Tempt Fate card in The First Taste (a
// billionaire literary starter) would have a Fatelands consequence compiled and delivered into
// their scene.
//
// This control is written to BITE: if the compiler is correctly story-scoped, the leak assertions
// pass trivially. If it is not, they go RED and name the exact leak. See
// feedback_controls_must_bite + feedback_wiring_proof_standard (wired = the VALUE reaches the
// payload).
import { chromium } from 'playwright-core';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._fscCompile === 'function'
  && typeof window._fscAuthorBrief === 'function', { timeout: 20000 });

// One wish per ask class in FSC_ASK_GRAMMAR, in ordinary English a reader of ANY story might type.
const WISHES = [
  { ask: 'undo',      text: 'I wish this had never happened.' },
  { ask: 'escape',    text: 'Get me out of this.' },
  { ask: 'unseen',    text: 'I want to disappear.' },
  { ask: 'silence',   text: "Don't bring it up." },
  { ask: 'authority', text: 'What right does he have to question me?' },
  { ask: 'solitude',  text: 'Just leave me alone.' },
  { ask: 'stop',      text: 'Make it stop.' },
];

// Every starter Book in the app, not just the one the compiler was authored for.
const STORIES = [
  'starter_the_first_taste',
  'starter_first_sacrifice',
  'starter_glass_house',
  'starter_famous_fate',
];

// Fatelands proper nouns and world terms. If any of these reach a NON-Fatelands story's author
// payload, that is a canon leak by definition.
const FATELANDS = ['Lirael', 'Seren', 'Dohkar', 'Julian', 'The Answer', 'Provast',
  'Veilwood', 'Weave-Script', 'Sacrificiant', 'First Favored', 'the assembly', 'the rite'];

const rows = await page.evaluate(({ WISHES, STORIES }) => {
  const out = [];
  window.state = window.state || {};
  for (const storyId of STORIES) {
    for (const w of WISHES) {
      // Present the app with a reader of THIS story sealing THIS wish.
      window.state._starterId = storyId;
      let rec = null, err = null;
      try { rec = window._fscCompile(w.text, { source: 'tempt_seal' }); }
      catch (e) { err = String(e && e.message || e); }

      // The real emission path: the block reads state._fscActiveCompiled and renders the brief
      // that is the ONLY Fate material the writer sees.
      let brief = '', spec = '';
      if (rec && !rec.error) {
        window.state._fscActiveCompiled = rec;
        try { brief = window._fscAuthorBriefBlock() || ''; } catch (e) { brief = 'THREW: ' + e.message; }
        try { spec = (window._fscPromptBlock && window._fscPromptBlock()) || ''; } catch (_) {}
      }
      window.state._fscActiveCompiled = null;

      out.push({ storyId, ask: w.ask, wish: w.text, err,
        outcomeId: rec && rec.outcomeId, recError: rec && rec.error,
        mode: rec && rec.mode, briefChars: brief.length, brief, specChars: spec.length });
    }
  }
  return out;
}, { WISHES, STORIES });

await browser.close();

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
const leaks = s => FATELANDS.filter(k => s.toLowerCase().indexOf(k.toLowerCase()) >= 0);

console.log('=== CROSS-STORY SCOPE OF THE TEMPT CONSEQUENCE COMPILER (no network, $0) ===\n');
console.log('  story                       ask        outcome                     brief  leaked canon');
for (const r of rows) {
  const lk = r.brief ? leaks(r.brief) : [];
  console.log('  ' + r.storyId.padEnd(27) + r.ask.padEnd(11)
    + String(r.outcomeId || ('(' + (r.recError || 'none') + ')')).padEnd(28)
    + String(r.briefChars).padStart(5) + '  ' + (lk.length ? lk.join(',') : '—'));
}

const nonFS = rows.filter(r => r.storyId !== 'starter_first_sacrifice');
const fs = rows.filter(r => r.storyId === 'starter_first_sacrifice');

console.log('\nA. the compiler must REFUSE to compile for a story it has no authored canon for');
t('no non-Fatelands story compiles a Fatelands outcome',
  nonFS.every(r => !r.outcomeId),
  nonFS.filter(r => r.outcomeId).length + '/' + nonFS.length + ' compiled: '
    + [...new Set(nonFS.filter(r => r.outcomeId).map(r => r.storyId + '/' + r.outcomeId))].join(' '));

console.log('\nB. no non-Fatelands story receives ANY Fate material in its author payload');
t('no author brief is emitted for a non-Fatelands story',
  nonFS.every(r => r.briefChars === 0),
  nonFS.filter(r => r.briefChars).length + ' briefs emitted');
t('no machine spec is emitted for a non-Fatelands story',
  nonFS.every(r => r.specChars === 0),
  nonFS.filter(r => r.specChars).length + ' specs emitted');

console.log('\nC. no Fatelands proper noun reaches a non-Fatelands writer');
const leaked = nonFS.filter(r => r.brief && leaks(r.brief).length);
t('zero canon leaks into other starter Books', leaked.length === 0,
  leaked.length + ' leaking (story, ask, terms): '
    + leaked.slice(0, 4).map(r => r.storyId + '/' + r.ask + ':[' + leaks(r.brief).join(',') + ']').join(' '));

console.log('\nD. First Sacrifice itself still works — the scoping must not break the authored path');
t('First Sacrifice compiles an outcome for every ask class',
  fs.every(r => !!r.outcomeId),
  fs.filter(r => !r.outcomeId).map(r => r.ask + ':' + (r.recError || 'none')).join(' '));
t('First Sacrifice still emits a substantive author brief',
  fs.every(r => r.briefChars > 100),
  fs.filter(r => !(r.briefChars > 100)).map(r => r.ask + ':' + r.briefChars).join(' '));

if (leaked.length) {
  console.log('\n--- SAMPLE LEAK: what a First Taste reader\'s writer would be told ---');
  const s = leaked.find(r => r.storyId === 'starter_the_first_taste') || leaked[0];
  console.log('  story : ' + s.storyId + '\n  wish  : "' + s.wish + '"\n  outcome: ' + s.outcomeId);
  console.log('  brief :\n' + s.brief.split('\n').map(l => '    | ' + l).join('\n'));
}

console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
