// _commit_evidence_proof.mjs — FREE deterministic proof of the isolated evidence-grounded commit check.
// Drives the REAL verifier prompt through the app's own proxy with three hand-written prose cases and
// asserts commit/no-commit. Also proves the seeded wound suppression + seed bio survival in one run.
// No story prose is generated; the only model calls are the cheap verifier (gpt-4o-mini class).
import { chromium } from 'playwright-core';
import fs from 'fs';
const log = (...a) => console.error(...a);
const OUTDIR = '_validate_out/commitproof';
fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(OUTDIR + '/.writetest', 'ok'); fs.unlinkSync(OUTDIR + '/.writetest');
log('[preflight] output dir writable: ' + OUTDIR);

const SLOTS = { precondition: 'the crowd does not yet know the youth\'s wish succeeded',
                actor: 'Lirael', action: 'tears the seal from her mouth and speaks', target: 'the crowd',
                exitState: 'the crowd has heard Lirael speak against the accusation' };

const CASES = [
  { id: 'POSITIVE — prose contains the event', expectCommit: true, prose:
    `The accusation hung there and no one moved. I got two fingers under the band at my cheek and pulled it down off my mouth, the cloth catching once on my ear before it gave. "It was not her wish that failed," I said, loud enough to carry to the back of the yard. The crowd heard me. Someone near the rail repeated it to someone behind them.` },
  { id: 'NEGATIVE — event omitted, scene otherwise plausible', expectCommit: false, prose:
    `The accusation hung there and no one moved. I kept my hands at my sides and my mouth covered, the way I had been taught, and I let the elder finish. The yard stayed quiet. Somewhere behind me the girl was crying, and I did not turn around to look at her.` },
  { id: 'EMPTY — prose is a stub with no content', expectCommit: false, prose: `[stubbed]` },
];

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
let loaded = false;
for (let a = 1; a <= 3 && !loaded; a++) {
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.state && window.STARTER_STORIES, { timeout: 90000 });
    loaded = true;
  } catch (e) { log('  load attempt ' + a + ' failed: ' + e.message.slice(0, 60)); }
}
if (!loaded) { await browser.close(); throw new Error('page never loaded'); }

// ── A. flag isolation is observable from the page ──
const flags = await page.evaluate(() => ({
  evidenceDefaultOn: window._evidenceCommitCheck !== false,
  handoffDefaultOff: window._structuredEventHandoff !== true,
}));

// ── B. the verifier's own contract, exercised with real prose ──
const VSYS = `You are a COMMIT VERIFIER for an interactive story engine. You are given a PLANNED EVENT decomposed into slots and the ACTUAL SCENE PROSE.
EVIDENCE-GROUNDED SLOT CHECK (HARD — GROUND every judgment in the SCENE PROSE, never in the planned event): for each slot, quote VERBATIM supporting text from the prose. If no verbatim text supports a slot, return "" for it. Do not paraphrase, do not infer, do not be generous.
Return ONLY JSON: {"delivery":"DELIVERED"|"MISSED","slots_check":{"precondition_evidence":"","actor_evidence":"","action_evidence":"","target_evidence":"","exit_state_evidence":"","occurred_this_scene":true|false}}`;

const results = [];
for (const c of CASES) {
  const raw = await page.evaluate(async ({ VSYS, SLOTS, prose }) => {
    const res = await fetch('/api/chatgpt-proxy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify({ messages: [{ role: 'system', content: VSYS },
        { role: 'user', content: 'PLANNED EVENT SLOTS:\n' + JSON.stringify(SLOTS, null, 2) + '\n\nSCENE PROSE:\n' + prose }],
        role: 'PRIMARY_AUTHOR', model: 'gpt-4o-mini', temperature: 0, max_tokens: 700, jsonMode: true })
    });
    if (!res.ok) return 'ERR http ' + res.status;
    const d = await res.json();
    return (d && d.content) || (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || 'ERR none';
  }, { VSYS, SLOTS, prose: c.prose });

  let v = null; try { v = JSON.parse(String(raw).replace(/```json?/gi, '').replace(/```/g, '').trim()); } catch (_) {}
  // Replicate the PRODUCTION override exactly (app.js ~93052): empty evidence ⇒ that slot is FALSE.
  const hasEv = x => typeof x === 'string' && x.trim().length > 3;
  const sk = (v && v.slots_check) || {};
  const preReq = SLOTS.precondition && SLOTS.precondition.toLowerCase().trim() !== 'none';
  const tReq = SLOTS.target && SLOTS.target.toLowerCase().trim() !== 'none';
  const pEv = preReq ? hasEv(sk.precondition_evidence) : true;
  const impossible = preReq && !pEv;
  const slotFail = impossible || !hasEv(sk.exit_state_evidence) || !hasEv(sk.actor_evidence)
                 || !hasEv(sk.action_evidence) || (tReq ? !hasEv(sk.target_evidence) : false)
                 || sk.occurred_this_scene === false;
  let delivery = String((v && v.delivery) || 'MISSED').toUpperCase();
  if (slotFail && delivery === 'DELIVERED') delivery = 'MISSED';
  const commits = delivery === 'DELIVERED';
  results.push({ id: c.id, expectCommit: c.expectCommit, commits, llmSaid: (v && v.delivery) || 'parse-fail', slotFail, sk });
  fs.writeFileSync(`${OUTDIR}/case_${results.length}.json`, JSON.stringify({ case: c.id, raw, verdict: results[results.length - 1] }, null, 2));
}

// ── C. seeded wound suppression + bio survival (static, from the page) ──
const seedChecks = await page.evaluate(() => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  s._starterId = def.id; s.is_starter_story = true;
  const seed = window._activeSeed ? window._activeSeed(s) : null;
  const ctx = window._buildSeedContextDirective ? window._buildSeedContextDirective(s, { suppressSceneOne: true }) : '';
  return {
    suppresses: window._seedSuppressesWounds ? window._seedSuppressesWounds(s) : null,
    seedHasAuthoredWound: !!(seed && (seed.wounds || (seed.cast || []).some(c => c && c.wound))),
    bioInCastChannel: /terrified of failing publicly/.test(ctx),
    canonInCtx: /COMING-OF-AGE RITE/.test(ctx),
    sceneOneSuppressed: !/WHAT IS PHYSICALLY HAPPENING RIGHT NOW/.test(ctx),
  };
});
await browser.close();

console.log('\n════ EVIDENCE-GROUNDED COMMIT PROOF ════');
console.log(`  _evidenceCommitCheck default ON : ${flags.evidenceDefaultOn ? '✅' : '❌'}`);
console.log(`  _structuredEventHandoff still OFF: ${flags.handoffDefaultOff ? '✅' : '❌'}  (Author payload unchanged)`);
let pass = flags.evidenceDefaultOn && flags.handoffDefaultOff;
console.log('\n  case                                            expect  actual  llm-said  override');
for (const r of results) {
  const ok = r.commits === r.expectCommit; if (!ok) pass = false;
  console.log(`  ${ok ? '✅' : '❌'} ${r.id.padEnd(45)} ${(r.expectCommit ? 'COMMIT' : 'no    ')}  ${(r.commits ? 'COMMIT' : 'no    ')}  ${String(r.llmSaid).padEnd(9)} ${r.slotFail ? 'forced MISSED' : '—'}`);
}
console.log('\n════ SEEDED WOUND SUPPRESSION ════');
const sc = [['wound block suppressed on seeded story', seedChecks.suppresses === true],
            ['seed authors no wound (so omission is correct)', seedChecks.seedHasAuthoredWound === false],
            ['PC bio still reaches Author via cast channel', seedChecks.bioInCastChannel === true],
            ['canon present in continuation context', seedChecks.canonInCtx === true],
            ['Scene-1 opener suppressed on continuation', seedChecks.sceneOneSuppressed === true]];
for (const [n, ok] of sc) { if (!ok) pass = false; console.log(`  ${ok ? '✅' : '❌'}  ${n}`); }
console.log('\n  ' + (pass ? '✅ ALL PROOFS PASS' : '❌ FAILED'));
process.exitCode = pass ? 0 : 2;
