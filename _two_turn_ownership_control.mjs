// TWO-TURN OWNERSHIP INTEGRATION — provider-free, $0.
// The remaining bookkeeping proof: mount -> ledger -> next-turn commit -> planner, driven through
// the REAL literary submit path with CONSTRUCTED provider replies. Nothing is seeded into the
// scene ledger by hand; every entry below is written by production as the page mounts.
import { chromium } from 'playwright-core';
import fs from 'fs';

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '\n         — ' + detail : '')); }
};
const section = (s) => console.log('\n' + s);

const SCENE_TEXT = {
  2: 'The presiding Dohkar served her notice in the gap between the trunks. "Your conduct at the rite is '
     + 'under investigation," he said, and named the restrictions aloud while the clearing emptied behind him. '
     + 'Lirael signed the acknowledgement because refusing it would have been its own offence.',
  3: 'Julian found her on the spiralgrass afterwards and said the inquiry was his to convene, and that he '
     + 'would convene it. Nobody contradicted him. Lirael heard every word of it where she stood, and did '
     + 'not answer him before he walked away toward the seam.'
};

const calls = [];
const seenUrls = [];
const authorCalls = [];
const evidenceDrift = [];
let turnScene = 2;      // which scene the author is writing this turn
const out = { planner: [], commit: [], refs: [] };

console.log('=== TWO-TURN OWNERSHIP (real mount + submit paths, constructed replies, $0) ===');

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', m => calls.push({ log: m.text() }));
page.on('pageerror', e => calls.push({ log: 'PAGEERROR: ' + String(e && e.message) }));

await page.route('**/api/**', async (route) => {
  const req = route.request();
  const url = req.url();
  let body = {};
  try { body = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const joined = JSON.stringify(body);
  seenUrls.push(url + '  ::  ' + joined.slice(0, 220));
  const reply = (content) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: content, usage: { prompt_tokens: 10, completion_tokens: 10 },
                           _orchestration: { model: 'constructed' } }) });

  const role = String(body.role || '');
  // ROUTED BY THE EXPLICIT ROLE, not by matching words in the payload: a broad text match hijacked
  // the NORMALIZATION setup call and handed it prose, which killed the turn before it mounted.
  if (role === 'NORMALIZATION') {
    return reply(JSON.stringify({ axis: 'none', normalized: null, world_subtype: null, notes: '' }));
  }
  // THE PROSE AUTHOR.
  // THE AUTHOR AND EVERY EDITOR return the SAME canonical text for the turn, so the prose that
  // reaches the page is byte-identical to what the verifier's evidence is quoted from. (A first
  // cut had the editor re-extract the prose with a regex, which truncated it at the first quote
  // mark and made every evidence quote non-verbatim.)
  if (role === 'PRIMARY_AUTHOR' || role === 'NARRATIVE_AUTHOR' || role === 'SPECIALIST_RENDERER'
      || role === 'LINE_EDITOR' || role === 'STRUCTURAL_CORRECTION' || role === 'CINE_BEAT_REWRITE') {
    authorCalls.push({ role: role, scene: turnScene });
    return reply(SCENE_TEXT[turnScene]);
  }
  // THE RUNTIME COMMIT VERIFIER. Every evidence quote below is copied VERBATIM out of scene 2's
  // text, which is the prose the gate narrows the request to.
  if (/RUNTIME COMMIT verifier/i.test(joined)) {
    out.commit.push(joined);
    // THE REF the request is actually asking about, recorded so a mismatch is visible rather than
    // silently leaving the proposal "unreported".
    const refs = joined.match(/prop:\d+:\d+/g) || [];
    const ref = refs[0] || null;
    out.refs.push(refs);
    const q = {
      pre: 'The presiding Dohkar served her notice in the gap between the trunks',
      actor: 'The presiding Dohkar',
      action: 'named the restrictions aloud while the clearing emptied behind him',
      target: 'Lirael signed the acknowledgement',
      exit: 'Lirael signed the acknowledgement because refusing it would have been its own offence'
    };
    Object.keys(q).forEach(k => { if (SCENE_TEXT[2].indexOf(q[k]) < 0) evidenceDrift.push(k + ': ' + q[k]); });
    return reply(JSON.stringify({
      delivery: 'DELIVERED',
      actual_exit_state: 'Lirael is formally under investigation and restricted',
      slots_check: { precondition_evidence: q.pre, actor_evidence: q.actor, action_evidence: q.action,
        target_evidence: q.target, exit_state_evidence: q.exit, occurred_this_scene: true },
      // THE FIELD IS `delivery` (what _adjudicateSealedProposal reads), not `status`.
      per_proposal: ref ? [{ ref: ref, delivery: 'DELIVERED', evidence: q.pre,
        precondition_evidence: q.pre, actor_evidence: q.actor, action_evidence: q.action,
        target_evidence: q.target, exit_state_evidence: q.exit }] : [],
      milestone_watch: [], prereq_watch: []
    }));
  }
  // THE PLOT CONTRACT / SCENE PLANNER.
  if (/plot contract|PLOT CONTRACT|state_change/i.test(joined) && /scene/i.test(joined)) {
    out.planner.push(joined);
    return reply(JSON.stringify({
      event: 'Julian claims the inquiry is his to convene, in front of the dispersing assembly',
      state_change: 'Julian has publicly claimed authority to convene the inquiry',
      milestone: 'row 5', before: 'Julian has not claimed the inquiry',
      after: 'Julian has publicly claimed the inquiry', unresolved_pressure: 'whether she answers him',
      slots: { precondition: 'Julian is present', actor: 'Julian',
               action: 'claims the inquiry is his to convene', target: 'the assembly',
               exit_state: 'Julian has publicly claimed authority to convene the inquiry' },
      setting: 'the spiralgrass outside the clearing', participants: ['Lirael', 'Julian']
    }));
  }
  return reply('{}');
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._commitScene === 'function'
  && typeof window._sceneLedgerGet === 'function', { timeout: 30000 });

section('1. A LITERARY STORY IN PROGRESS, WITH NO LEDGER SEEDED BY HAND');
const setup = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'twoturn-' + Date.now();
  // NOT a starter: the baked-opening genesis gate fires for a logged-out reader on a starter and
  // stops the submit before any generation. This control is about bookkeeping, not the wallet.
  delete s._starterId; delete s._bakedStarterId;
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  delete s._stagedAuthoringSceneIndex; delete s._bakedScene1MountedAt;
  s.issueIndexInRun = 1; s.storyLength = 'soulmates';
  // AN ENTITLED READER. The wallet gate is not what this control is about, and left unresolved it
  // fails closed and stops the mount ("[PAYWALL] storypassEligible unresolved — fail-closed").
  s.subscribed = true; s.storypassEligible = true; s.fortunes = 500;
  s.turnCount = 0;
  s.scenes = []; s._sealedProposals = null;
  s._milestoneDeliveries = []; s._prereqInvalidations = [];
  s._committedState = { facts: [], tableau: null, pendingIntent: null };
  delete s._sceneLedger;                       // NOTHING is seeded; production writes every entry
  delete s._priorSceneStateChange;
  StoryPagination.clear();
  // SCENE 1 IS ALREADY ON THE PAGE, mounted the way the opening is.
  StoryPagination.addPage('<p>The wish was spoken aloud in the clearing, and the omen came.</p>', true);
  s.turnCount = 1;
  return { storyId: s.storyId, ledger: s._sceneLedger || null, pages: StoryPagination.getPageCount() };
});
t('the ledger starts EMPTY — no entry was seeded', setup.ledger === null, JSON.stringify(setup.ledger));

section('2. TURN ONE THROUGH THE REAL SUBMIT PATH');
await page.evaluate(() => {
  document.getElementById('actionInput').value = 'she waits for the Dohkar to finish';
  document.getElementById('dialogueInput').value = '';
});
await page.evaluate(() => {
  const b = document.getElementById('submitBtn');
  b.dataset.paywallActive = 'false';          // stands in for an entitled reader
  b.click();
});
await page.waitForFunction(() => {
  const L = window.state._sceneLedger;
  return !!(L && L.entries && L.entries.some(e => e.kind === 'scene' && e.pageUid));
}, { timeout: 45000 }).catch(() => {});
const turn1 = await page.evaluate(() => {
  const s = window.state;
  const L = s._sceneLedger || { entries: [] };
  return JSON.parse(JSON.stringify({
    entries: L.entries.map(e => ({ sceneNumber: e.sceneNumber, kind: e.kind, pageUid: e.pageUid, issue: e.issue })),
    pageUids: StoryPagination.getPageUids(), pageCount: StoryPagination.getPageCount(),
    currentPage: StoryPagination.getCurrentPageUid(), turnCount: s.turnCount,
    prior: s._priorSceneStateChange || null,
    facts: (s._committedState && s._committedState.facts) || [] }));
});
const sceneEntries = turn1.entries.filter(e => e.kind === 'scene' && e.pageUid);
t('PRODUCTION recorded a scene entry in the ledger, with a page uid',
  sceneEntries.length >= 1, JSON.stringify(turn1.entries));
t('...and that page uid is one pagination actually holds',
  sceneEntries.length >= 1 && turn1.pageUids.indexOf(sceneEntries[sceneEntries.length - 1].pageUid) >= 0,
  JSON.stringify({ entry: sceneEntries[sceneEntries.length - 1], uids: turn1.pageUids }));
t('...on the page production just mounted, not the opening page',
  sceneEntries.length >= 1
  && turn1.pageUids.indexOf(sceneEntries[sceneEntries.length - 1].pageUid) > 0,
  JSON.stringify({ index: turn1.pageUids.indexOf((sceneEntries[sceneEntries.length - 1] || {}).pageUid) }));
t('a proposal was handed off for the NEXT turn to commit',
  !!turn1.prior && !!turn1.prior.proposalRef, JSON.stringify(turn1.prior));

section('3. THE READER NAVIGATES BACK, THEN TURN TWO COMMITS TURN ONE');
const ownedScene = sceneEntries.length ? sceneEntries[sceneEntries.length - 1] : null;
out.commit.length = 0;
out.planner.length = 0;
turnScene = 3;        // turn two writes DIFFERENT prose, so the committed scene cannot be confused with it
await page.evaluate(() => {
  StoryPagination.goToPage(0);                 // back to the opening page
  document.getElementById('actionInput').value = 'she turns to look for Julian';
  document.getElementById('dialogueInput').value = '';
});
const viewedBefore = await page.evaluate(() => StoryPagination.getCurrentPageUid());
await page.evaluate(() => {
  const b = document.getElementById('submitBtn');
  b.dataset.paywallActive = 'false';
  b.click();
});
await page.waitForFunction(() => {
  const cs = window.state._committedState;
  return !!(cs && Array.isArray(cs.facts) && cs.facts.length > 0);
}, { timeout: 45000 }).catch(() => {});
const turn2 = await page.evaluate(() => {
  const s = window.state;
  const cs = s._committedState || {};
  return JSON.parse(JSON.stringify({
    facts: cs.facts || [], through: cs._committedThroughScene,
    refusal: s._lastCommitRefusal || null,
    lastSrc: s._lastCommitScenePrvSource || null,
    ledger: (s._sceneLedger || { entries: [] }).entries.map(e => ({ sceneNumber: e.sceneNumber, kind: e.kind, pageUid: e.pageUid })) }));
});
fs.mkdirSync('_audit_out/two_turn', { recursive: true });
fs.writeFileSync('_audit_out/two_turn/commit_request.txt', out.commit[0] || '(none)');
fs.writeFileSync('_audit_out/two_turn/planner_request.txt', out.planner[out.planner.length - 1] || '(none)');
fs.writeFileSync('_audit_out/two_turn/logs.txt', calls.map(c => c.log).join('\n'));
fs.writeFileSync('_audit_out/two_turn/all_api_calls.txt', seenUrls.join('\n'));
fs.writeFileSync('_audit_out/two_turn/author_calls.txt', JSON.stringify(authorCalls, null, 1));
fs.writeFileSync('_audit_out/two_turn/refs.txt', JSON.stringify(out.refs, null, 1));

t('the reader was parked on the OPENING page for the whole of turn two',
  viewedBefore === turn1.pageUids[0], JSON.stringify({ viewed: viewedBefore, opening: turn1.pageUids[0] }));
t('a COMMIT VERIFIER request went out', out.commit.length >= 1, String(out.commit.length));
t('the commit request carries TURN ONE\'s prose — the owned scene, not the displayed page',
  out.commit.length >= 1 && /served her notice in the gap between the trunks/.test(out.commit[0])
  && !/The wish was spoken aloud in the clearing/.test(out.commit[0]),
  'commit request prose mismatch');
t('nothing was refused — ownership resolved through production\'s own ledger entry',
  turn2.refusal === null, JSON.stringify(turn2.refusal));
t('the fact COMMITTED', (turn2.facts || []).length >= 1,
  JSON.stringify({ facts: turn2.facts, through: turn2.through }));

section('4. THE COMMITTED FACT REACHES THE NEXT PLANNER REQUEST');
const cwLine = (out.planner[out.planner.length - 1] || '')
  .split(/\\n|\n/).filter(l => /COMMITTED WORLD STATE/.test(l))[0] || '';
fs.writeFileSync('_audit_out/two_turn/committed_world_state_line.txt', cwLine || '(no line)');
const factText = ((turn2.facts || [])[0] || {});
const factStr = String(factText.event || factText.text || factText.fact || factText || '');
t('every verifier evidence quote is verbatim in the prose (no harness drift)',
  evidenceDrift.length === 0, JSON.stringify(evidenceDrift));
t('the next planner request contains a COMMITTED WORLD STATE section',
  !!cwLine, 'no COMMITTED WORLD STATE line in the captured planner request');
t('...and the committed fact appears in it, not an empty list',
  !!cwLine && !/\[\]/.test(cwLine) && factStr.length > 0
  && cwLine.indexOf(factStr.slice(0, 40)) >= 0,
  JSON.stringify({ fact: factStr.slice(0, 70), line: cwLine.slice(0, 200) }));

console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
console.log('evidence: _audit_out/two_turn/');
await browser.close();
process.exit(fail ? 1 : 0);
