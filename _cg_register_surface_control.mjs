// DO LONGER BEATS ACTUALLY FIT AND BEHAVE? Provider-free, $0.
//
// The contract now PERMITS a compact paragraph per beat. Beat count being unchanged does NOT
// mean nothing else is affected (Roman's correction), so this measures the things that could
// actually break: the staged reader surface, beat navigation, attribution spans and typing, and
// the per-beat image/expression mappings.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

// Representative beats at the lengths the contract now permits. The long ones are written to the
// TONE of the editorial example, deliberately NOT its wording.
const BEATS = [
  { idx: 0, kind: 'narration', speaker: null,
    text: 'The Dohkar\'s voice carries over the crimson grass, pitched for the assembly rather '
      + 'than for me. He does not look at me while he says it, and that is the part that lands — '
      + 'not the ruling itself, but how little of his attention it costs him.' },
  { idx: 1, kind: 'dialogue', speaker: 'The Presiding Dohkar',
    text: '"Lirael\'s conduct will now be subject to a preliminary review before the assembly."' },
  { idx: 2, kind: 'narration', speaker: null,
    text: 'The words settle like a net.' },                       // deliberate one-liner
  { idx: 3, kind: 'exposition', speaker: null,
    text: 'I keep my head down and let the torn band hang where everyone can see it. Covering it '
      + 'now would be its own kind of confession. The grass is wet through my shoes and I notice '
      + 'that instead, because it is the only thing in this clearing that asks nothing of me.' },
  { idx: 4, kind: 'narration', speaker: null,
    text: 'Julian has not moved from the edge.' },                // deliberate one-liner
  { idx: 5, kind: 'dialogue', speaker: 'The Presiding Dohkar',
    text: '"The rite and the ruling on the Sacrificiant\'s conduct are mine."' }
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });   // phone, the tightest real surface
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._sbPersistSceneProjection === 'function', { timeout: 30000 });

console.log('=== LONGER BEATS: SURFACE, NAVIGATION, ATTRIBUTION (provider-free, $0) ===\n');

console.log('1. THE CONTRACT ITSELF');
{
  const r = await page.evaluate(() => {
    const sys = window._buildCGScreenplaySystemPrompt ? window._buildCGScreenplaySystemPrompt() : '';
    return {
      capGone: !/1–2 sentences per beat — HARD/.test(sys),
      permission: /LENGTH FOLLOWS THE MOMENT/.test(sys),
      notAQuota: /PERMISSION, not a target and not a minimum/.test(sys),
      notEveryBeat: /NOT IN EVERY BEAT/.test(sys),
      bothFailures: /screenplay shorthand that only reports what moved/.test(sys)
        && /procession of explanatory observations/.test(sys),
      finalBeatRule: /FINAL beat of the scene is EXACTLY ONE SENTENCE/.test(sys),
      dialogueStillJustTheLine: /A dialogue beat's "text" is JUST the spoken line/.test(sys)
    };
  });
  t('the blanket 1–2 sentence cap is gone', r.capGone);
  t('length now follows the moment', r.permission);
  t('and it is PERMISSION, not a quota or a minimum', r.notAQuota);
  t('voice/perception is asked for ACROSS THE SCENE, not in every beat', r.notEveryBeat);
  t('both failure modes are named — shorthand AND over-explaining', r.bothFailures);
  t('the final-beat-one-sentence rule survives', r.finalBeatRule);
  t('dialogue beats still carry JUST the spoken line (see attribution below)',
    r.dialogueStillJustTheLine);
}

console.log('\n2. ATTRIBUTION — spans and typing across mixed beat lengths');
{
  const r = await page.evaluate((beats) => {
    const rec = window._sbPersistSceneProjection({ kind: 'beats', input: beats,
      uid: 'cg:register-' + Date.now(), title: '', synopsis: '', fateCard: null });
    const sc = rec.attributionSidecar;
    // A DIALOGUE segment legitimately carries a speaker-label PREFIX, and labelSpan marks it.
    // My first version compared the whole span to beat.text and called the label a defect.
    const spans = sc.entries.map(e => {
      const seg = rec.text.slice(e.start, e.end);
      const lbl = e.labelSpan ? rec.text.slice(e.labelSpan.start, e.labelSpan.end) : '';
      return { i: e.beatIdx, exact: seg === beats[e.beatIdx].text,
        afterLabel: lbl && seg.slice(lbl.length) === beats[e.beatIdx].text,
        labelInsideSpan: !e.labelSpan || (e.labelSpan.start >= e.start && e.labelSpan.end <= e.end) };
    });
    const spansOk = spans.every(x => x.exact || x.afterLabel);
    const labelsOk = spans.every(x => x.labelInsideSpan);
    const typing = sc.entries.map(e => ({ i: e.beatIdx, t: e.sourceType }));
    return { text: rec.text, entries: sc.entries.length, spansOk, labelsOk, spans, typing,
      coverage: sc.coverage, hash: rec.projection.hash };
  }, BEATS);
  console.log('   typing: ' + JSON.stringify(r.typing));
  t('one sidecar entry per beat', r.entries === BEATS.length);
  t('EVERY span resolves to its own beat text — exactly, or after its speaker label',
    r.spansOk, JSON.stringify(r.spans));
  t('and every speaker label sits INSIDE its own beat span', r.labelsOk);
  t('narration and exposition are typed narrator', r.typing.filter(x => x.t === 'narrator').length === 4);
  t('dialogue beats are typed speaker', r.typing.filter(x => x.t === 'speaker').length === 2);
  t('coverage is still complete', r.coverage === 'complete');
}

console.log('\n3. THE STAGED READER SURFACE at 390x844 (one beat at a time)');
{
  const r = await page.evaluate(async (beats) => {
    // Measure in the production element, with the production class, at phone width.
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:390px;';
    document.body.appendChild(host);
    const out = [];
    for (const b of beats) {
      host.innerHTML = '<div class="staged-beat-text" data-kind="' + b.kind + '"></div>';
      const el = host.firstChild;
      el.textContent = b.text;
      const cs = getComputedStyle(el);
      out.push({ idx: b.idx, words: b.text.split(/\s+/).length,
        h: Math.round(el.getBoundingClientRect().height),
        overflowY: el.scrollHeight > el.clientHeight + 1,
        fontSize: cs.fontSize, maxH: cs.maxHeight });
    }
    host.remove();
    return out;
  }, BEATS);
  r.forEach(x => console.log('   beat ' + x.idx + '  ' + String(x.words).padStart(2)
    + 'w  height ' + String(x.h).padStart(4) + 'px  clipped=' + x.overflowY
    + '  (font ' + x.fontSize + ', max-height ' + x.maxH + ')'));
  const tallest = Math.max(...r.map(x => x.h));
  t('NO beat is clipped by its own box at phone width', r.every(x => !x.overflowY),
    'a permitted-length beat is cut off on screen');
  t('the tallest beat still fits a phone viewport with room for chrome',
    tallest < 844 * 0.6, tallest + 'px of 844 — too tall to sit under an image');
  console.log('   tallest: ' + tallest + 'px (' + Math.round(tallest / 844 * 100) + '% of viewport)');
}

console.log('\n4. PER-BEAT MAPPINGS — one sustained moment still carries one of each');
{
  const r = await page.evaluate(() => {
    const sys = window._buildCGScreenplaySystemPrompt ? window._buildCGScreenplaySystemPrompt() : '';
    return { expr: /"expression_target"/.test(sys), closeup: /"cut_to_closeup"/.test(sys),
      proxy: /"pc_proxy_action"/.test(sys), tension: /"tension_state"/.test(sys),
      perBeat: /"beats": \[ \{/.test(sys) };
  });
  t('expression_target is still per beat', r.expr && r.perBeat);
  t('cut_to_closeup is still per beat', r.closeup);
  t('pc_proxy_action is still per beat', r.proxy);
  t('tension_state is still per beat', r.tension);
  console.log('   These are per-beat fields and a beat is still ONE sustained moment, so one');
  console.log('   expression per beat remains coherent. What is NOT established here is reading');
  console.log('   TIME per beat, which rises with length — see the report.');
}

fs.mkdirSync('_audit_out/register', { recursive: true });
await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
