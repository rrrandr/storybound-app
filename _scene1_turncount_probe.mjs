// SCENE-1 TURNCOUNT PROBE — production path, network fenced.
//
// Static evidence contradicts itself:
//   · _currentSceneNumber comment (L124132): "Scene 1 leaves it at 0"
//   · turn-fn comment (L283802): "Scene 1 normally runs in handleBeginStory (no increment
//     → the Scene-2 turn builds at turnCount===0)"
//   · but handleBeginStory L243600 sets state.turnCount = 1 unconditionally in its
//     scene-completion block, as does _mountAndTransition L96705.
// If turnCount is 1 when the first continuation plans, _currentSceneNumber returns 3 and
// the planner selects plan row 3 while authoring scene 2.
//
// This drives the REAL handleBeginStory with every model endpoint mocked, then reads the
// counter. No manual assignment of turnCount.
//
// usage: node _scene1_turncount_probe.mjs
import { chromium } from 'playwright-core';

const attempts = [];
const PROSE = 'The hall smelled of cold ash and the assembly had already gathered by the time she arrived. '
  + 'Lirael set the relic down on the shrine table and did not look at Julian once. '
  + 'Seren spoke the wish aloud, and the gossamer band on her wrist went taut. '.repeat(6);

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.route('**/api/**', async route => {
  const u = route.request().url().replace(/^https?:\/\/[^/]+/, '');
  attempts.push(u);
  // Mock generously: prose for author-ish calls, empty JSON otherwise.
  const body = { content: PROSE, choices: [{ message: { content: PROSE } }] };
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
page.on('pageerror', e => console.log('  [pageerror] ' + String(e.message).slice(0, 110)));

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES,
  { timeout: 40000 });

// Instrument every write to turnCount so the ORDER of writes is visible, then seed the
// story exactly as the dev bypass does and run the real entry point.
const result = await page.evaluate(async ({ PROSE }) => {
  const s = window.state;
  window.__tcLog = [];
  let _tc = s.turnCount || 0;
  Object.defineProperty(s, 'turnCount', {
    configurable: true,
    get() { return _tc; },
    set(v) {
      const stack = (new Error().stack || '').split('\n').slice(2, 4).join(' | ');
      window.__tcLog.push({ from: _tc, to: v, at: stack.slice(0, 150) });
      _tc = v;
    }
  });

  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  if (!def) return { error: 'starter_first_sacrifice not found in STARTER_STORIES' };
  window._devBypass = true;
  s.picks = s.picks || {};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
    .forEach(k => { s.picks[k] = def[k]; });
  s.world = def.world; s.worldSubtype = def.worldSubtype; s.flavor = def.flavor; s.dynamic = def.dynamic;
  s._starterId = def.id; s.is_starter_story = true; s.immutableTitle = def.title;
  s.archetype = { primary: def.archetype, modifier: null };
  s.name = 'Lirael'; s.playerName = 'Lirael';
  s.loveInterestName = 'Julian'; s.partnerName = 'Julian'; s.loveInterest = 'Male'; s.liGender = 'male';
  s.playerMask = 'OPEN_VEIN'; s.storyLength = 'fling'; s.tier = 'fling';
  s.access = 'sub'; s.subscribed = true; s.fortunes = 9999999; s.previewActive = false;
  s._skipCorridorValidation = true; s.intensity = 'Steamy'; s.pov = 'first_person';
  s.identity = { playerName: 'Lirael', partnerName: 'Julian' }; s.picks.identity = s.identity;
  s._pcLookSkipped = true; s.pcLookLocked = true;
  s.renderMode = 'literary'; s.currentEngine = 'literary';
  s.storyId = 'tc_probe';

  const started = _tc;
  let threw = null;
  try {
    await Promise.race([
      window.handleBeginStory(),
      new Promise(r => setTimeout(r, 45000))
    ]);
  } catch (e) { threw = String(e && e.message).slice(0, 160); }

  return {
    started,
    finalTurnCount: s.turnCount,
    writes: window.__tcLog,
    pages: (window.StoryPagination && window.StoryPagination.getPageCount) ? window.StoryPagination.getPageCount() : null,
    scenes: (s.scenes || []).length,
    currentSceneNumber: (typeof window._currentSceneNumber === 'function') ? window._currentSceneNumber(s) : null,
    threw
  };
}, { PROSE });

await browser.close();

console.log(`\n${'═'.repeat(84)}\nSCENE-1 TURNCOUNT PROBE (production path)\n${'═'.repeat(84)}`);
if (result.error) { console.log('  ' + result.error); process.exit(1); }
console.log(`\n  handleBeginStory threw : ${result.threw || 'no'}`);
console.log(`  pages mounted          : ${result.pages}`);
console.log(`  state.scenes length    : ${result.scenes}`);
console.log(`  turnCount at start     : ${result.started}`);
console.log(`  turnCount after Scene 1: ${result.finalTurnCount}`);
console.log(`  _currentSceneNumber()  : ${result.currentSceneNumber}   ← what the FIRST CONTINUATION would request`);
console.log(`\n  writes to turnCount (in order):`);
if (!result.writes.length) console.log('    (none)');
result.writes.forEach((w, i) => console.log(`    ${i}: ${w.from} → ${w.to}\n       ${w.at}`));

const verdict = result.pages >= 1
  ? (result.finalTurnCount === 0
      ? 'CONSISTENT with the comments — Scene 1 leaves turnCount at 0, first continuation requests 2'
      : `CONTRADICTS the comments — Scene 1 left turnCount at ${result.finalTurnCount}, `
        + `so the first continuation would request ${result.currentSceneNumber} while authoring scene 2`)
  : 'INCONCLUSIVE — Scene 1 did not mount under mocks; counter never reached its production value';
console.log(`\n  VERDICT: ${verdict}`);
console.log(`\n  network: ${attempts.length} request(s) intercepted, 0 issued.\n`);
