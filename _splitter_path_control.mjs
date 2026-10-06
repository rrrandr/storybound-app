// WHICH PATH OWNS THE SPLITTER, AND WHAT DOES IT DO TO A DEVELOPED BEAT? Provider-free, $0.
//
// _splitOversizedBeats lives inside _parseStagedAnalysis (app.js:177002/177060), reached only from
// _runStagedAnalysis — the STAGED prose-to-beats path, prompted by _buildStagedSystemPrompt against
// gpt-4o-mini. The CG screenplay path emits the renderable plan directly and NEVER passes through
// it, which is why the live First Sacrifice scenes logged no [STAGED:PARSE] line.
import { chromium } from 'playwright-core';
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
const b = await chromium.launch(); const page = await b.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window.state === 'object', { timeout: 30000 }).catch(() => {});
const SRC = await page.evaluate(async () => (await (await fetch('/app.js')).text()));

console.log('=== WHICH PROMPT GOVERNS THE PATH THAT OWNS THE SPLITTER ===');
t('the splitter is called only from the staged parser',
  (SRC.match(/_splitOversizedBeats\(/g) || []).length === 1);
t('the staged prompt asks for 1-2 sentences, absolute maximum 3',
  /1-2 sentences per beat\. ABSOLUTE MAXIMUM: 3 sentences/.test(SRC));
const cap = SRC.match(/var MAX_SENTENCES_PER_BEAT = (\d+);/);
const fin = SRC.match(/var MAX_SENTENCES_FINAL_BEAT = (\d+);/);
console.log('   served cap = ' + (cap && cap[1]) + ' · final-beat = ' + (fin && fin[1]));
t('the cap sits at or under its own prompt\'s maximum of 3', cap && Number(cap[1]) <= 3);
t('the CG screenplay path declares no prose-to-beats step downstream',
  /No prose-to-beats analysis step downstream/.test(SRC));

// Exercise the SHIPPED splitter on representative beats.
// Lift the SHIPPED function by brace-matching, so what runs is the committed splitter.
const sIdx = SRC.indexOf('var _splitOversizedBeats = function(beats)');
let depth = 0, end = -1;
for (let i = SRC.indexOf('{', sIdx); i < SRC.length; i++) {
  if (SRC[i] === '{') depth++;
  else if (SRC[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const body = SRC.slice(sIdx, end) + ';';
const split = new Function(body + '\n return _splitOversizedBeats;')();
const S3 = 'I press it into his palm before anyone can speak. It is still warm from my grip. '
  + 'He closes his fingers over it without hesitation.';
const S4 = S3 + ' He has decided something I have not been told.';
const run = (text, kind, last) => {
  const beats = [{ idx: 0, kind: kind, text: text, speaker: kind === 'dialogue' ? 'li' : null,
                   expression_target: 'lips_tighten', cut_to_closeup: true, closeup_target: 'li' }];
  if (!last) beats.push({ idx: 1, kind: 'narration', text: 'He does not move to follow me.', speaker: null });
  return split(beats);
};
console.log('\n=== A THREE-SENTENCE NARRATION BEAT, MID-SCENE ===');
{
  const out = run(S3, 'narration', false);
  console.log('   1 beat in -> ' + (out.length - 1) + ' narration beat(s) out');
  t('it is split, because the cap is 2', out.length - 1 > 1);
  t('PRESERVATION: no word of the original is lost',
    out.slice(0, out.length - 1).map(x => x.text).join(' ').replace(/\s+/g, ' ') === S3.replace(/\s+/g, ' '));
  t('ATTRIBUTION: every piece stays narration, none becomes dialogue',
    out.slice(0, out.length - 1).every(x => x.kind === 'narration' && !x.speaker));
  t('NAVIGATION: the beat count grows, so the reader taps more times',
    out.length > 2);
  t('only the FIRST piece keeps the closeup, so the camera does not re-fire',
    out[0].cut_to_closeup === true && out[1].cut_to_closeup === false);
}
console.log('\n=== A FOUR-SENTENCE NARRATION BEAT, MID-SCENE ===');
{
  const out = run(S4, 'narration', false);
  console.log('   1 beat in -> ' + (out.length - 1) + ' narration beat(s) out');
  t('it is split into two-sentence pieces', out.length - 1 === 2);
  t('PRESERVATION: nothing is dropped',
    out.slice(0, out.length - 1).map(x => x.text).join(' ').replace(/\s+/g, ' ') === S4.replace(/\s+/g, ' '));
}
console.log('\n=== A DELIBERATE ONE-LINE BEAT IS UNTOUCHED ===');
{
  const out = run('He does not move to follow me.', 'narration', true);
  t('a one-sentence beat passes through unchanged', out.length === 1
    && out[0].text === 'He does not move to follow me.');
}
console.log('\n=== DIALOGUE ATTRIBUTION SURVIVES A SPLIT ===');
{
  const out = run('"You are late." "I know what I am." "Say it plainly."', 'dialogue', false);
  const spoken = out.slice(0, out.length - 1);
  t('split dialogue keeps a speaker on every piece', spoken.every(x => x.kind !== 'dialogue' || x.speaker));
}
await b.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
