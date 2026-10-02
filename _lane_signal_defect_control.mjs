// IS THE LANE GATE JUDGING THE EVENT, OR THE WORDING? Provider-free, $0.
//
// THE MEASUREMENT THAT PROMPTED THIS. Four live FS planner draws ($0.036265), all proposing the
// SAME event — the presiding Dohkar puts Lirael's conduct in question before the assembly — and all
// declaring the SAME lane, dohkar_preliminary_review. Two passed the gate and two were rejected
// "before author dispatch" for not instantiating the lane they declared:
//     draw 1  "Asserting procedural authority to shift confrontation into formal review"      REJECTED
//     draw 2  "...publicly commit Lirael's conduct to formal review..."                        REJECTED
//     draw 3  "initiate Dohkar preliminary review of Lirael's conduct..."                      ACCEPTED
//     draw 4  "...moving from accusation to Dohkar's formal preliminary review declaration"    ACCEPTED
//
// The lane check is `laneMatch.signalRx.test(laneCombined)` (app.js ~9321) — a REGEX over the
// planner's own prose. So the hypothesis is that acceptance turned on the literal phrase
// "preliminary review" versus the synonym "formal review", not on what the event does.
//
// THE DECISIVE TEST is not my reading of four samples. It is whether the lane's own AUTHORED event
// frame — the text the product itself hands the planner as what to write — satisfies the regex the
// product then judges it by. If the authored frame fails its own signal, the gate cannot be
// measuring instantiation, and any planner that faithfully follows the frame in the frame's own
// words is rejected for doing so.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

console.log('=== LANE SIGNAL: EVENT OR WORDING? (provider-free, $0) ===\n');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!window.STARTER_PLANS, { timeout: 30000 });

// The lane menu and the authored frames, read out of the seed rather than retyped.
const lane = await page.evaluate(() => {
  const P = window.STARTER_PLANS && window.STARTER_PLANS.starter_first_sacrifice;
  if (!P) return { error: 'no plan' };
  for (const row of (P.scenes || [])) {
    if (!Array.isArray(row.aftermathLanes) || !row.aftermathLanes.length) continue;
    const l = row.aftermathLanes.filter(x => x && x.id === 'dohkar_preliminary_review')[0];
    if (!l) continue;
    const frames = row.eventFrames || row.eventFrameByCard || null;
    const out = { sceneN: row.n, id: l.id, label: String(l.label || ''),
      signalSource: l.signalRx ? String(l.signalRx) : null, frames: {} };
    // Every authored frame that resolves to THIS lane, by whatever key the row uses.
    const walk = (obj, path) => {
      if (!obj || typeof obj !== 'object') return;
      if (obj.laneId === 'dohkar_preliminary_review' && obj.eventFrame) {
        out.frames[path || 'frame'] = String(obj.eventFrame);
        return;
      }
      Object.keys(obj).forEach(k => walk(obj[k], path ? path + '.' + k : k));
    };
    walk(row, '');
    return out;
  }
  return { error: 'no aftermathLanes row found' };
});
if (lane.error) { console.error('REFUSED: ' + lane.error); await browser.close(); process.exit(4); }

console.log('1. the lane and its signal are readable from the seed');
t('the lane was found on a plan row', !!lane.id, JSON.stringify(lane).slice(0, 160));
t('it declares a signal regex', !!lane.signalSource, 'no signalRx');
t('at least one authored event frame resolves to this lane',
  Object.keys(lane.frames).length > 0, JSON.stringify(Object.keys(lane.frames)));
console.log('     lane  : ' + lane.id + '  (plan scene ' + lane.sceneN + ')');
console.log('     signal: ' + String(lane.signalSource).slice(0, 190));
console.log('     frames: ' + JSON.stringify(Object.keys(lane.frames)));

// Test the regex IN THE PAGE, against the real object — never a retyped copy of the pattern.
const testIn = (texts) => page.evaluate(({ ts }) => {
  const P = window.STARTER_PLANS.starter_first_sacrifice;
  let rx = null;
  for (const row of (P.scenes || [])) {
    const l = (row.aftermathLanes || []).filter(x => x && x.id === 'dohkar_preliminary_review')[0];
    if (l && l.signalRx) { rx = l.signalRx; break; }
  }
  if (!rx) return null;
  const out = {};
  Object.keys(ts).forEach(k => { rx.lastIndex = 0; out[k] = rx.test(String(ts[k] || '')); });
  return out;
}, { ts: texts });

// ── 2. THE AUTHORED FRAMES AGAINST THEIR OWN SIGNAL ─────────────────────────
console.log('\n2. THE DECISIVE TEST — does the lane\'s own authored frame satisfy its own signal?');
const frameRes = await testIn(lane.frames);
Object.keys(lane.frames).forEach(k => {
  console.log('     ' + (frameRes[k] ? 'MATCHES  ' : 'NO MATCH ') + k);
});
const anyFrameFails = Object.keys(frameRes).some(k => frameRes[k] === false);
t('this is the finding: at least one AUTHORED frame FAILS the lane\'s own signal regex',
  anyFrameFails === true,
  'every authored frame matched — then the gate is not obviously lexical and this control is wrong');
if (anyFrameFails) {
  const failing = Object.keys(frameRes).filter(k => !frameRes[k]);
  console.log('     FAILING FRAMES: ' + JSON.stringify(failing));
  failing.slice(0, 2).forEach(k => console.log('       · ' + lane.frames[k].slice(0, 220)));
}

// ── 3. SYNONYM VS LITERAL PHRASE ────────────────────────────────────────────
// Two sentences describing the same event. Only the noun phrase differs.
console.log('\n3. the same event, two words: "formal review" vs "preliminary review"');
const pair = await testIn({
  formal: 'Asserting procedural authority to shift confrontation into formal review. '
    + 'The presiding Dohkar declares Lirael\'s conduct will be reviewed and she will answer for it.',
  preliminary: 'initiate Dohkar preliminary review of Lirael\'s conduct. '
    + 'The presiding Dohkar declares Lirael\'s conduct will be reviewed and she will answer for it.'
});
t('"formal review" does NOT satisfy the signal', pair.formal === false);
t('"preliminary review" DOES satisfy it', pair.preliminary === true);
t('so acceptance turns on the noun phrase, not on the event',
  pair.formal === false && pair.preliminary === true);

// ── 4. THE FOUR REAL DRAWS, REPLAYED THROUGH THE SAME REGEX ─────────────────
// Not my summary of them — the recorded replies, scored by the product's own pattern.
console.log('\n4. the four live draws, scored by the product\'s own regex');
const sampleDirs = fs.existsSync('_fs_lane_sample_out')
  ? fs.readdirSync('_fs_lane_sample_out').filter(d => /^run_/.test(d)).sort() : [];
let scored = 0, agree = 0;
for (let i = sampleDirs.length - 1; i >= 0 && scored === 0; i--) {
  const dir = '_fs_lane_sample_out/' + sampleDirs[i];
  if (!fs.existsSync(dir + '/summary.json')) continue;
  const sum = JSON.parse(fs.readFileSync(dir + '/summary.json', 'utf8'));
  if (!sum.results || sum.results.length < 2 || sum.mode !== 'live') continue;
  const texts = {};
  sum.results.forEach(r => {
    texts['draw' + r.draw] = [r.tacticalMove, r.stateChange].filter(Boolean).join(' \n ');
  });
  const res = await testIn(texts);
  sum.results.forEach(r => {
    const rxSays = res['draw' + r.draw];
    const gateSaid = r.verdict === 'accepted';
    scored++;
    if (rxSays === gateSaid) agree++;
    console.log('     draw ' + r.draw + ': regex=' + (rxSays ? 'match' : 'no match')
      + '   gate=' + r.verdict);
  });
  t('every live draw was scored', scored >= 2, 'scored=' + scored);
  // THE REGEX PREDICTS THE GATE. If it does, the gate's decision is the regex's decision.
  t('the regex\'s verdict matches the gate\'s on every draw', agree === scored,
    agree + '/' + scored + ' agreed');
  break;
}
if (!scored) {
  console.log('     (no live lane-sample summary found — run _fs_lane_consistency_sample.mjs first)');
  t('a live sample was available to score', false, 'none found');
}

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
console.log('\nWHAT THIS MEANS, if the checks above are green: the lane gate is a LEXICAL check.');
console.log('It rejects a semantically correct proposal that uses a synonym for the lane\'s own');
console.log('noun phrase, and the lane\'s AUTHORED frame does not satisfy the pattern the product');
console.log('judges it by. That is a contract defect, not planner inconsistency.');
process.exit(fail ? 1 : 0);
