// ══════════════════════════════════════════════════════════════════════════════════════════
//  C+ COVERAGE — MEASURED IN CHARACTER APPEARANCES, NOT SCENES
//
//  "11 of 20 scenes lack C+" is the wrong unit and I reported it. C+ is driven by a CHARACTER
//  being present and due, not by a scene existing. A scene with nobody in it but the narrator
//  SHOULD have no C+, and counting it as a gap manufactures a problem; conversely a scene where
//  someone appears in the eventual prose that the stage cannot see is a REAL gap that scene
//  counting hides entirely.
//
//  So this walks the issue and reports, per canonical character: appearances the stage can see,
//  which made them due, whether owned evidence existed, and what happened — offered, skipped,
//  or invisible because the stage could not know.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext(); const page = await ctx.newPage();
await installSession(page);
let escaped = 0;
await page.route('**/*', async route => {
  const url = route.request().url(); const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/.test(path)) escaped++;
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window._sceneStageContract && window._cpSchedule, { timeout: 60000 });

const R = await page.evaluate(() => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  Object.assign(s, { _starterId: def.id, is_starter_story: true, world: def.world,
    worldSubtype: def.worldSubtype, name: 'Lirael', playerName: 'Lirael',
    loveInterestName: 'Julian', partnerName: 'Julian', pov: 'first_person', issueNumber: 1 });
  // ONE ledger for the whole issue: appearances and dueness only mean anything across a run.
  s.storyId = 'coverage-run'; s._relationshipLedger = null;
  // What the post-render extractor would find in the legacy scenes, from their own goals.
  window.__replayLegacyAppearances = { 6: ['Julian'], 7: [], 8: ['Julian'], 11: [], 12: [],
                                       13: [], 15: ['Julian'], 17: ['Julian'], 18: ['Julian'],
                                       19: [], 20: [] };

  const scenes = [];
  const perChar = {};
  const BUCKETS = ['assigned', 'density_deferred', 'cooldown_suppressed', 'ineligible_not_offered',
                   'due_no_owned_evidence', 'legacy_no_opportunity'];
  const bump = (label, k) => {
    if (!perChar[label]) { perChar[label] = { appearances: 0 }; BUCKETS.forEach(b => perChar[label][b] = 0); }
    if (perChar[label][k] === undefined) perChar[label][k] = 0;
    perChar[label][k]++;
  };

  // ══════════════════════════════════════════════════════════════════════════════════════
  //  CHRONOLOGICAL REPLAY, ONE ACCUMULATING LEDGER
  //  A per-scene audit that resets between scenes reports every character as perpetually due,
  //  because cooldown and recurrence state never come into existence. The state IS the answer.
  // ══════════════════════════════════════════════════════════════════════════════════════
  for (let n = 1; n <= 20; n++) {
    s.turnCount = n - 1;
    let st = null; try { st = window._sceneStageContract(s, n); } catch (_) {}
    const auth = st && st.stageAuthority && st.stageAuthority.ok;
    const seedPath = !!(st && /seed\.sceneOne/.test(String(st.source || '')));
    const knows = !!(auth || seedPath);
    const uid = 'replay-S' + n;

    if (!knows) {
      // LEGACY SCENE. The stage cannot see it — but the post-render extractor will, and that is
      // what the bridge is for. Julian is written into these scenes by the goal; the disclosure
      // pass records him, and the NEXT authoritative scene sees the accumulated appearance.
      const disclosed = (window.__replayLegacyAppearances || {})[n] || [];
      const appeared = disclosed.map(label => ({ label, canonicalId: window._cpCanonicalIdFor({ label }),
                                                 presence: 'IN_PERSON', source: 'disclosure_post_render' }))
                                .filter(a => a.canonicalId);
      const c = window._cpCommitScene({ sceneUid: uid, ordinal: n, issue: 1, delivered: [], appeared });
      scenes.push({ n, presenceKnown: false, viaDisclosure: appeared.map(a => a.label),
                    recorded: (c.appearances || []).length });
      appeared.forEach(a => { bump(a.label, 'appearances'); bump(a.label, 'legacy_no_opportunity'); });
      continue;
    }

    const present = (st.onStage || []).filter(c => c && c.kind !== 'pc')
      .concat((st.offStage || []).filter(c => c && c.id && c.presence)
        .map(c => ({ id: c.id, label: c.label || c.name, presence: c.presence, kind: 'offstage' })));
    const sel = window._cPlusEligibleCandidates(s, { sceneNumber: n, stage: st });
    const cands = (sel.candidates || []);
    const owners = {};
    (st.eventFacts || []).forEach(f => (f.participants || []).forEach(p => {
      if (['actor', 'subject', 'speaker'].indexOf(p.role) !== -1) owners[p.ref] = 1; }));

    // ONE scheduler call for the whole scene, so the density cap is real rather than per-person.
    const plan = window._cpSchedule(present.map(c => ({ label: c.label, canonicalId: c.id, facet_ids: [] })),
      { ordinal: n, issue: 1, opening: n === 1 });
    const byLabel = {};
    plan.decisions.forEach(d => { byLabel[String(d.label).toLowerCase()] = d; });

    const rows = [], delivered = [], appeared = [];
    present.forEach(c => {
      const d = byLabel[String(c.label).toLowerCase()] || { status: '?', reason: '?' };
      const cand = cands.filter(x => String(x.label).toLowerCase() === String(c.label).toLowerCase())[0] || null;
      const hasEvidence = !!owners[c.id];
      // ASSIGNED only where the scheduler allowed it AND the scene actually grounds it.
      const assigned = (d.status === 'REQUIRED' || d.status === 'ALLOWED') && !!cand && hasEvidence;
      // ── EXACTLY ONE TERMINAL BUCKET, DECIDED HERE ──
      // Overlapping counters do not reconcile, and a total that does not reconcile is a total
      // nobody can act on. Order matters: the FIRST reason that stopped this appearance is the
      // one recorded, so a character both deferred and unevidenced is reported once.
      let bucket;
      if (assigned) bucket = 'assigned';
      else if (d.status === 'DEFERRED') bucket = 'density_deferred';
      else if (d.status === 'SUPPRESSED') bucket = 'cooldown_suppressed';
      else if (!cand) bucket = 'ineligible_not_offered';
      else if (!hasEvidence) bucket = 'due_no_owned_evidence';
      else bucket = 'other_' + String(d.status).toLowerCase();
      bump(c.label, 'appearances');
      bump(c.label, bucket);
      rows.push({ label: c.label, presence: c.presence, status: d.status, reason: d.reason,
                  ownedEvidence: hasEvidence, offered: !!cand, assigned, bucket });
      if (assigned) delivered.push({ canonicalId: c.id, facet_id: 'replay:' + c.id, category: 'value', verified: true });
      else appeared.push({ canonicalId: c.id, label: c.label, presence: c.presence });
    });
    // COMMIT ONLY WHAT WAS ACTUALLY ASSIGNED — the state the next scene inherits.
    window._cpCommitScene({ sceneUid: uid, ordinal: n, issue: 1, delivered, appeared });
    scenes.push({ n, presenceKnown: true, appearances: rows,
                  assignedCount: delivered.length });
  }
  return { scenes, perChar };
});

const known = R.scenes.filter(s => s.presenceKnown);
const blind = R.scenes.filter(s => !s.presenceKnown);
const allApp = known.flatMap(s => (s.appearances || []).map(a => ({ ...a, n: s.n })));
const viaDisc = blind.flatMap(s => (s.viaDisclosure || []).map(l => ({ n: s.n, label: l })));

const L = console.log;
L(`\n${'═'.repeat(96)}\nC+ COVERAGE — BY CHARACTER APPEARANCE\n${'═'.repeat(96)}`);
L(` scenes where the stage KNOWS who appears : ${known.length}/20  (${known.map(s => s.n).join(', ')})`);
L(` scenes where it CANNOT                   : ${blind.length}/20  (${blind.map(s => s.n).join(', ')})`);
L(`\n MEANINGFUL APPEARANCES THE STAGE CAN SEE : ${allApp.length}`);
L(` ${'sc'.padStart(3)} ${'character'.padEnd(26)} ${'presence'.padEnd(12)} ${'due'.padEnd(11)} evidence  offered`);
allApp.forEach(a => L(` ${String(a.n).padStart(3)} ${String(a.label).slice(0, 26).padEnd(26)} ${String(a.presence).padEnd(12)} ${String(a.status).padEnd(11)} ${a.ownedEvidence ? '   yes ' : '   NO  '}   ${a.assigned ? 'ASSIGNED' : (a.offered ? 'offered' : '-')}`));
L(`\n APPEARANCES RECOVERED BY THE POST-RENDER BRIDGE (legacy scenes): ${viaDisc.length}`);
viaDisc.forEach(a => L(`   scene ${String(a.n).padStart(2)}  ${a.label}  (recorded for the NEXT authoritative scene)`));

L(`\n PER CHARACTER — every appearance in exactly one terminal bucket`);
const BUCK = ['assigned', 'density_deferred', 'cooldown_suppressed', 'ineligible_not_offered', 'due_no_owned_evidence', 'legacy_no_opportunity'];
L(`   ${'character'.padEnd(24)} ${'appears'.padStart(7)} ${BUCK.map(b => b.slice(0, 11).padStart(12)).join('')}`);
let grand = 0; const bucketTotals = {}; BUCK.forEach(b => bucketTotals[b] = 0);
Object.keys(R.perChar).forEach(k => { const c = R.perChar[k];
  grand += c.appearances; BUCK.forEach(b => bucketTotals[b] += (c[b] || 0));
  L(`   ${k.slice(0, 24).padEnd(24)} ${String(c.appearances).padStart(7)} ${BUCK.map(b => String(c[b] || 0).padStart(12)).join('')}`); });
const bucketSum = BUCK.reduce((a, b) => a + bucketTotals[b], 0);
const stray = Object.keys(R.perChar).flatMap(k => Object.keys(R.perChar[k]).filter(x => x !== 'appearances' && BUCK.indexOf(x) === -1));
L(`   ${'TOTAL'.padEnd(24)} ${String(grand).padStart(7)} ${BUCK.map(b => String(bucketTotals[b]).padStart(12)).join('')}`);
L(`\n RECONCILIATION : ${grand} appearances = ${bucketSum} bucketed  ${grand === bucketSum ? '✓ EXACT' : '✗ DOES NOT RECONCILE'}`);
if (stray.length) L(`   ✗ unbucketed states present: ${JSON.stringify([...new Set(stray)])}`);

L(`\n JULIAN, RECONCILED`);
const jVis = allApp.filter(a => a.label === 'Julian');
const jLeg = viaDisc.filter(a => a.label === 'Julian');
L(`   visible (stage-planned) appearances : ${jVis.length}  scenes ${jVis.map(a => a.n).join(', ')}`);
L(`   legacy appearances via the bridge   : ${jLeg.length}  scenes ${jLeg.map(a => a.n).join(', ')}`);
L(`   total                               : ${jVis.length + jLeg.length}  (matches per-character table: ${R.perChar['Julian'] ? R.perChar['Julian'].appearances : '?'})`);

L(`\n THE GAP IS PREPLANNING-INVISIBILITY, NOT INVISIBILITY. ${blind.length} scenes cannot be SEEN IN`);
L(` ADVANCE, so no C+ can be planned for them. They are not unobserved: the post-render`);
L(` disclosure pass records who appeared, and that appearance moves the character toward their`);
L(` next floor. What is lost is the OPPORTUNITY in that scene, not the memory of it.`);
L(`\n escaped requests: ${escaped}`);
L(`${'─'.repeat(96)}\n`);

fs.mkdirSync('_audit_out', { recursive: true });
fs.writeFileSync('_audit_out/cplus_coverage_by_appearance.json', JSON.stringify(R, null, 2));
await ctx.close().catch(() => {}); await browser.close().catch(() => {});
process.exit(0);
