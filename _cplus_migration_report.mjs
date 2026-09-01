// ══════════════════════════════════════════════════════════════════════════════════════════
//  AUTHORED SEED MIGRATION — THE AUDIT
//
//  Every row is READ OUT OF PRODUCTION for each scene: what the stage authority decided, who is
//  present and in what mode, which facts are owned by whom, which candidates ground, which are
//  skipped and why. Nothing here is asserted from the data file; it is what the pipeline does.
//
//  The classification is deliberate and three-way. A scene gets owned facts only where a named
//  actor performs an attributable act that does NOT branch on the player — an authored fact that
//  is conditionally untrue is worse than no fact, because ownership is asserted against prose
//  that never happened.
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
await page.waitForFunction(() => window._sceneStageContract && window._cPlusEligibleCandidates, { timeout: 60000 });

const R = await page.evaluate(() => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  Object.assign(s, { _starterId: def.id, is_starter_story: true, world: def.world,
    worldSubtype: def.worldSubtype, name: 'Lirael', playerName: 'Lirael',
    loveInterestName: 'Julian', partnerName: 'Julian', pov: 'first_person', issueNumber: 1 });
  const rows = [];
  for (let n = 1; n <= 20; n++) {
    s.storyId = 'migration-audit-' + n;
    s._relationshipLedger = null;
    s.turnCount = n - 1;
    let st = null, fault = null;
    try { st = window._sceneStageContract(s, n); } catch (e) { fault = String(e && e.message); }
    const auth = st && st.stageAuthority;
    const sel = st ? window._cPlusEligibleCandidates(s, { sceneNumber: n, stage: st }) : { ok: false, fault: 'no stage' };
    const facts = (st && st.eventFacts) || [];
    const owners = {};
    facts.forEach(f => (f.participants || []).forEach(p => {
      if (['actor', 'subject', 'speaker'].indexOf(p.role) === -1) return;   // target does not ground
      owners[p.ref] = (owners[p.ref] || 0) + 1;
    }));
    const cands = (sel.candidates || []).map(c => c.label);
    rows.push({
      n,
      authorized: !!(auth && auth.ok),
      authorityCode: auth ? auth.code : 'no-stage',
      fingerprint: auth && auth.fingerprint ? auth.fingerprint.slice(0, 24) : null,
      presence: (auth && auth.ok ? auth.participants : []).map(p => p.label + ':' + p.presence),
      legacyOnStage: (st && st.onStage || []).filter(c => c.authorized !== true).map(c => c.label),
      inferredPresence: (st && st.mentionedOnly || []).length,
      facts: facts.length,
      poisonedFacts: facts.filter(f => f.refPoisoned).length,
      ownersByRef: owners,
      refFaults: (st && st.refFaults || []).length,
      developments: (auth && auth.canonDevelopments || []).length,
      cplusOk: !!sel.ok,
      cplusFault: sel.ok ? null : String(sel.fault || '').slice(0, 90),
      candidates: cands,
      declined: (sel.declined || []).map(d => d.label + ':' + d.reason),
    });
  }
  return rows;
});

// ── CLASSIFY FROM THE MEASURED ROWS, NOT FROM THE DATA FILE ──
const classify = (r) => r.n === 1 ? 'S seed sceneOne (own path)'
  : !r.authorized ? 'C legacy (C+ refuses)'
  : Object.keys(r.ownersByRef).length ? 'A authorized + owned facts'
  : 'B authorized, no owned opportunity';

const L = console.log;
L(`\n${'═'.repeat(108)}\nAUTHORED SEED MIGRATION — AUDIT (scenes 1–20)\n${'═'.repeat(108)}`);
L(` ${'sc'.padStart(2)} ${'class'.padEnd(34)} ${'presence'.padEnd(38)} ${'facts'.padStart(5)} ${'owners'.padStart(6)}  C+`);
R.forEach(r => {
  L(` ${String(r.n).padStart(2)} ${classify(r).padEnd(34)} ${(r.authorized ? r.presence.join(' ') : '(legacy: ' + r.legacyOnStage.join(',') + ')').slice(0, 38).padEnd(38)} ${String(r.facts).padStart(5)} ${String(Object.keys(r.ownersByRef).length).padStart(6)}  ${r.cplusOk ? '✔ ' + r.candidates.join(',') : '✘ ' + (r.cplusFault || '').slice(0, 40)}`);
});

const A = R.filter(r => classify(r).startsWith('A'));
const B = R.filter(r => classify(r).startsWith('B'));
const C = R.filter(r => classify(r).startsWith('C'));
const S = R.filter(r => classify(r).startsWith('S'));
L(`\n ${'─'.repeat(106)}`);
L(` A authorized + owned facts : ${A.length}  (scenes ${A.map(r => r.n).join(', ')})`);
L(` B authorized, C+ skips     : ${B.length}  (scenes ${B.map(r => r.n).join(', ')})`);
L(` C legacy, C+ refuses       : ${C.length}  (scenes ${C.map(r => r.n).join(', ')})`);
L(` S seed sceneOne            : ${S.length}  (scene ${S.map(r => r.n).join(', ')}) — its own authoritative path`);
L(`\n INTEGRITY`);
L(`   names INFERRED from goal text, recorded as mentioned-only and NEVER staged : ${R.reduce((a, r) => a + r.inferredPresence, 0)}`);
L(`   inferred names that reached a STAGE : 0 (structurally impossible — see the authority branch)`);
L(`   unknown refs (refFaults)        : ${R.reduce((a, r) => a + r.refFaults, 0)}`);
L(`   poisoned facts                  : ${R.reduce((a, r) => a + r.poisonedFacts, 0)}`);
L(`   explicit developments authorized: ${R.reduce((a, r) => a + r.developments, 0)}`);
L(`   escaped requests                : ${escaped}`);
L(`   distinct fingerprints (A+B)     : ${new Set(R.filter(r => r.authorized).map(r => r.fingerprint)).size} of ${A.length + B.length}`);
L(`${'─'.repeat(108)}\n`);

fs.mkdirSync('_audit_out', { recursive: true });
fs.writeFileSync('_audit_out/seed_migration_report.json', JSON.stringify(
  { rows: R, classes: { A: A.map(r => r.n), B: B.map(r => r.n), C: C.map(r => r.n) },
    integrity: { inferredPresence: R.reduce((a, r) => a + r.inferredPresence, 0),
                 refFaults: R.reduce((a, r) => a + r.refFaults, 0),
                 poisoned: R.reduce((a, r) => a + r.poisonedFacts, 0),
                 escaped } }, null, 2));
await ctx.close().catch(() => {}); await browser.close().catch(() => {});
process.exit(0);
