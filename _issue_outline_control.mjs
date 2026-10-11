// ── CONNECTED, PLAYER-RESPONSIVE PLANNING — PROVIDER-FREE ($0) ──────────────────────────────
// Drives the SHIPPED builders with every provider route intercepted. Every model response here is
// CONSTRUCTED by this file and labelled as such; no provider is called and nothing is billed.
// These checks prove WIRING and ADAPTATION. They say nothing about writing quality.
//
// BITE VERIFIED 2026-10-11. Three regressions injected into public/app.js (suppress the author's
// issue-purpose block; suppress the scaffold's issue directive; suppress the causal outline in the
// plot-contract path) took this suite from 48/48 to 43/48, and the milestone check correctly caught
// the obsolete "NOT staging authority, NOT the event to render" paragraph returning.
import { chromium } from 'playwright-core';
import fs from 'fs';

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '\n         — ' + String(detail).slice(0, 700) : '')); }
};
const section = (n) => console.log('\n' + n);

// ── CONSTRUCTED MODEL RESPONSE #1: the Scene Scaffold (mistral-small planning call) ──────────
// Shaped to the real contract: every field the production normaliser reads, plus a causal_outline
// whose developments deliver First Sacrifice scene 4's own authored purpose (procedural notice and
// restriction served on Lirael, Julian named but absent). Hand-written for this test.
//
// CANON CORRECTED 2026-10-11: the first version of this fixture staged the Dohkar "in the doorway"
// and anchored on "the rite-hall doors". There are NO doors or doorways in the Veilwood — the
// ceremony is in an OPEN CLEARING and an opening in the ring of trunks is a GAP BETWEEN TREES. The
// error was in the SCAFFOLD, i.e. the geography was decided before the author wrote a word, which
// is exactly the class of defect this layer exists to prevent. Blocking her departure now uses the
// real geography (seed grounded object O8).
const CONSTRUCTED_SKELETON = {
  environment_anchor: 'the gap between two trunks where the assembly came in',
  structural_pacing: 'measured escalation', narrative_density: 'moderate',
  dialogue_ratio: 'dialogue-led', beat_style: 'procedure then reaction',
  tension_rhythm: 'rising with pauses',
  staged_characters: [
    { name: 'Lirael', presence_mode: 'IN_PERSON', role: 'the subject of the notice' },
    { name: 'the presiding Dohkar', presence_mode: 'IN_PERSON', role: 'serves the notice' },
    { name: 'Julian', presence_mode: 'OFFSTAGE_REFERENCED', role: 'named as demanding the review' },
  ],
  interlocutor_placement: 'the presiding Dohkar — the authority who ruled on the rite, who reads from a page he does not look up from',
  li_texture_beat: 'beat 6: she catches herself remembering Julian setting The Answer down with both hands, and not letting go of it',
  pc_body_callback: 'beat 3 — stress_tic (the gossamer band she has nothing to do with now)',
  li_body_callback: null, antagonist_body_callback: null,
  environment_plus: { target: 'the gap between two trunks', axis: 'use' },
  fusion: null,
  causal_outline: [
    { beat: 'The presiding Dohkar steps into the gap between the trunks and will not let Lirael pass' },
    { beat: 'He reads her the formal notice: her conduct at the rite is under investigation', link: 'therefore', from: 1 },
    { beat: 'Lirael asks who will hear it; he declines to say, and the refusal is the answer', link: 'but', from: 2 },
    { beat: 'He names the restrictions: she may supervise no rite, and she may not leave the Veilwood', link: 'therefore', from: 3 },
    { beat: 'Lirael begins to explain what she saw the wish do; he tells her to stop', link: 'but', from: 4 },
    { beat: 'He tells her Julian demanded the review, and did not come to say it himself', link: 'therefore', from: 5 },
    { beat: 'Lirael looks for Julian among the dispersing assembly and does not find him', link: 'therefore', from: 6 },
    { beat: 'She signs the acknowledgement because refusing it would be its own offence', link: 'but', from: 7 },
    { beat: 'The Dohkar takes the page and leaves her standing supervised in the middle of her own clearing', link: 'therefore', from: 8 },
  ],
  stage_contract: { present: ['Lirael', 'the presiding Dohkar'] },
};

// ── CONSTRUCTED MODEL RESPONSE #2: a generated Issue Spine for a story with NO authored plan ──
// Proves the SPINE can own the outline on its own, for stories STARTER_PLANS does not cover.
const CONSTRUCTED_SPINE_ARC = {
  issueLabel: 'Issue 1 — the audit', thesis: 'Whether she will sign what she knows is false',
  ambiguityTargets: ['who ordered the audit'], pressureVectors: ['institutional attention'],
  endingShape: 'quiet rupture', regimePhase: 'instability',
  sceneOutline: [
    { n: 1, accomplishes: 'The auditor arrives unannounced and asks for the ledger she keeps privately', link: null, follows_from: '', changes: 'the private ledger is now known to exist', sets_up: 'she has to decide what to hand over' },
    { n: 2, accomplishes: 'She hands over a copy she has edited', follows_from: 'the ledger is now known to exist', link: 'therefore', changes: 'she has committed a falsification', sets_up: 'the original still exists somewhere' },
    { n: 3, accomplishes: 'The auditor asks for the original', follows_from: 'she handed over an edited copy', link: 'but', changes: 'the falsification is now at risk of discovery', sets_up: 'she needs someone to destroy the original' },
  ],
  cliffhanger: { scene: 3, event: 'She asks him to burn the original, in the room where the auditor is still working',
    why_unresolved: 'whether he does it', issue2Predicament: 'She has made a second person into an accomplice, and he has not said yes. Issue 2 opens with her owing him something she cannot name and the auditor one room away.' },
};

console.log('=== CONNECTED PLAYER-RESPONSIVE PLANNING (provider-free, $0) ===');
console.log('Every model response in this file is CONSTRUCTED here and labelled as such.\n');

const browser = await chromium.launch();
const page = await browser.newPage();
const calls = [];
await page.route('**/api/**', async (route) => {
  const url = route.request().url();
  let body = {};
  try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const joined = (body.messages || []).map(m => String(m.content || '')).join('\n');
  calls.push({ url, role: body.role, model: body.model || body.preferredModel, joined });
  if (/mistral-proxy/.test(url) && /narrative skeletons/i.test(joined)) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ model: 'mistral-small-latest', resolvedModel: 'mistral-small-latest',
        choices: [{ message: { content: JSON.stringify(CONSTRUCTED_SKELETON) } }],
        usage: { prompt_tokens: 10, completion_tokens: 10, cost_in_usd_ticks: 0 } }) });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._resolveIssueOutline === 'function', { timeout: 30000 });

const setup = (sceneNum) => page.evaluate((n) => {
  const s = window.state;
  s.storyId = 'ctl-outline';
  s._starterId = 'starter_first_sacrifice';
  s.playerName = 'Lirael'; s.loveInterestName = 'Julian';
  s.currentEngine = 'graphic'; s.renderMode = 'cg'; s.storyLength = 'fling';
  s._stagedAuthoringSceneIndex = n - 1;
  s.issueIndexInRun = 1;
  s._issueOutline = null; s._sceneDecisions = null; s.sceneSkeleton = null; s._skeletonMeta = null;
  s._scenePlotContract = null; s._sceneAssignment = null; s._spineEventVerbatim = '';
  s.cgScaffold = null;
  return true;
}, sceneNum);

// ═══ 1. THE ISSUE OUTLINE CARRIES DISTINCT ACCOMPLISHMENTS THROUGH ITS CLIFFHANGER ══════════
section('1. ONE COMPLETE ISSUE OUTLINE, cliffhanger into the next issue');
await setup(4);
const o1 = await page.evaluate(() => {
  const o = window._resolveIssueOutline(window.state, { force: true });
  return JSON.parse(JSON.stringify(o));
});
t('the outline resolves for the whole issue', !!o1 && Array.isArray(o1.scenes) && o1.scenes.length === 20,
  o1 && o1.scenes && o1.scenes.length);
t('the issue span is reconciled from the plan, and the pricing span is reported alongside it',
  o1.bounds.source === 'plan.issueScenes' && o1.bounds.per === 20 && o1.bounds.pricingPer === 10,
  JSON.stringify(o1.bounds));
const withGoal = o1.scenes.filter(r => r.accomplishes);
t('every scene with a goal states a DISTINCT accomplishment (no row repeats another)',
  new Set(withGoal.map(r => r.accomplishes)).size === withGoal.length,
  withGoal.length + ' goals, ' + new Set(withGoal.map(r => r.accomplishes)).size + ' distinct');
const linked = o1.scenes.filter(r => r.n > 1 && r.follows_from && r.follows_from.text && (r.follows_from.link === 'but' || r.follows_from.link === 'therefore'));
t('every scene after the first says WHY it follows, with a but/therefore link',
  linked.length === 19, linked.length + '/19 — unlinked: ' + o1.scenes.filter(r => r.n > 1 && !(r.follows_from && r.follows_from.link)).map(r => r.n).join(','));
t('every scene states what it SETS UP for the next one',
  o1.scenes.filter(r => r.sets_up).length === 20,
  o1.scenes.filter(r => !r.sets_up).map(r => r.n).join(','));
t('the issue builds to a SPECIFIC cliffhanger, not an ending shape',
  !!o1.cliffhanger && o1.cliffhanger.scene === 20 && Array.isArray(o1.cliffhanger.branches) && o1.cliffhanger.branches.length === 2,
  JSON.stringify(o1.cliffhanger && { scene: o1.cliffhanger.scene, branches: (o1.cliffhanger.branches || []).length }));
t('each cliffhanger branch states the PREDICAMENT Issue 2 opens inside',
  (o1.cliffhanger.branches || []).every(b => b.event && b.issue2Predicament && b.issue2Predicament.length > 40),
  JSON.stringify((o1.cliffhanger.branches || []).map(b => [b.choice, !!b.event, (b.issue2Predicament || '').length])));
t('the cliffhanger is NOT selected while the scene-19 decision is unmade',
  o1.cliffhanger.decided === false && o1.cliffhanger.selected == null && o1.cliffhanger.decidedBy.scene === 19,
  JSON.stringify({ decided: o1.cliffhanger.decided, by: o1.cliffhanger.decidedBy }));
console.log('      horizon=' + o1.horizon + '  conditional rows=' + o1.scenes.filter(r => r.conditional).map(r => r.n).join(','));

// ═══ 2. A SCENE SCAFFOLD DEVELOPS ITS OWN ISSUE DIRECTIVE THROUGH CAUSAL BEATS ══════════════
section('2. THE SCENE SCAFFOLD RECEIVES ITS ISSUE DIRECTIVE AND RETURNS A CAUSAL OUTLINE');
calls.length = 0;
const skel = await page.evaluate(async () => {
  const r = await window.__generateSceneSkeleton('wait for the Dohkar', '', { sceneNumber: 4 });
  return JSON.parse(JSON.stringify({ causal_outline: r && r.causal_outline, note: r && r.causal_outline_note,
    anchor: r && r.environment_anchor, staged: (r && r.staged_characters) || [],
    pacing: r && r.structural_pacing, env: r && r.environment_plus }));
});
const skelCall = calls.filter(c => /mistral-proxy/.test(c.url) && /narrative skeletons/i.test(c.joined))[0];
t('the scaffold request carries THIS SCENE\'S PURPOSE WITHIN THE ISSUE',
  !!skelCall && /THIS SCENE'S PURPOSE WITHIN THE ISSUE/.test(skelCall.joined), !!skelCall);
t('...including what it accomplishes, why it follows, what changes and what it sets up',
  !!skelCall && /WHAT IT ACCOMPLISHES:/.test(skelCall.joined) && /WHY IT FOLLOWS WHAT CAME BEFORE/.test(skelCall.joined)
  && /WHAT MUST BE TRUE BY THE END:/.test(skelCall.joined) && /WHAT IT SETS UP FOR THE NEXT SCENE:/.test(skelCall.joined),
  skelCall && (skelCall.joined.match(/THIS SCENE'S PURPOSE[\s\S]{0,900}/) || [''])[0]);
t('the scaffold is asked for a But/Therefore sequence at the CG beat granularity',
  !!skelCall && /CAUSAL_OUTLINE/.test(skelCall.joined) && /20-24 objects/.test(skelCall.joined)
  && /THE BUT\/THEREFORE RULE/.test(skelCall.joined), !!skelCall);
t('and told a beat is not a sentence, so the outline cannot restore captions',
  !!skelCall && /A BEAT IS NOT A SENTENCE and not a caption/.test(skelCall.joined)
  && /700-1000-word budget/.test(skelCall.joined), !!skelCall);
t('the returned causal outline lands on the scaffold',
  Array.isArray(skel.causal_outline) && skel.causal_outline.length === 9, JSON.stringify(skel.note));
t('its links are preserved as structure (therefore/but), first entry unlinked',
  skel.causal_outline && skel.causal_outline[0].link === null
  && skel.causal_outline.slice(1).every(b => b.link === 'but' || b.link === 'therefore'),
  JSON.stringify((skel.causal_outline || []).map(b => b.link)));
// environment_plus is deliberately NOT asserted here: production overwrites whatever the model
// returns via _resolveStageBeatInventory (app.js ~99054) and nulls it when that resolver finds
// nothing, so it is a BACKEND-owned field, not one the scaffold retains. First run of this control
// failed on it and the assertion was wrong, not the code.
t('the scaffold KEEPS its staging, cast and tonal responsibilities',
  !!skel.anchor && skel.staged.length === 3 && !!skel.pacing,
  JSON.stringify({ anchor: skel.anchor, staged: skel.staged.length, pacing: skel.pacing, env_backend_owned: skel.env }));

// ═══ 3. THE ACTUAL AUTHOR REQUEST, WITH NO COMPETING OBSOLETE ASSIGNMENT ════════════════════
section('3. THE AUTHOR REQUEST CARRIES THE DIRECTIVE AND THE OUTLINE, AND NOTHING THAT CONTRADICTS THEM');
const auth = await page.evaluate(() => {
  const d = window._buildPlotContractDirective() || '';
  return { d: d, len: d.length };
});
fs.mkdirSync('_audit_out/issue_outline', { recursive: true });
fs.writeFileSync('_audit_out/issue_outline/author_request_block.txt', auth.d);
t('[no-contract path] the author receives the scene\'s PURPOSE WITHIN THE ISSUE',
  /THIS SCENE'S PURPOSE WITHIN ISSUE 1/.test(auth.d) && /WHAT THIS SCENE ACCOMPLISHES:/.test(auth.d),
  auth.d.slice(0, 400));
t('[no-contract path] ...and the causal sequence that develops it',
  /CAUSAL OUTLINE — THE DRAMATIC SEQUENCE OF THIS SCENE/.test(auth.d)
  && /THEREFORE — this happens BECAUSE/.test(auth.d) && /BUT — this is OBSTRUCTED/.test(auth.d),
  auth.len);
t('[no-contract path] the issue directive is NOT demoted to optional inspiration',
  !/NOT staging authority, NOT the event to render/.test(auth.d)
  && !/Do NOT restate this milestone as the scene's action/.test(auth.d)
  && !/do NOT try to accomplish the whole milestone in one scene/.test(auth.d),
  (auth.d.match(/.{0,120}milestone.{0,200}/i) || [''])[0]);
t('[no-contract path] the causal outline is NOT replaced by one tiny event — all 9 developments are delivered',
  (CONSTRUCTED_SKELETON.causal_outline || []).every(b => auth.d.includes(b.beat)),
  (CONSTRUCTED_SKELETON.causal_outline || []).filter(b => !auth.d.includes(b.beat)).map(b => b.beat).join(' | '));
t('the but/therefore labels are explicitly NOT wording for the prose',
  /THE LINKS ARE STRUCTURE, NOT WORDING/.test(auth.d)
  && /Never write the words "but", "therefore" or "and then" as connectives/.test(auth.d), auth.len);
// The nesting sentence is only meaningful where there IS an event below it. The block above was
// built with no planner contract (the fallback path), which correctly emits purpose + outline and
// no event. So the nesting claim is checked on the path that carries one.
const authWithEvent = await page.evaluate(() => {
  const s = window.state;
  // A CONSTRUCTED planner contract, in the shape production writes at app.js ~103434.
  s._scenePlotContract = { sceneIndex: 3,
    stateChange: { event: 'The presiding Dohkar serves Lirael formal notice in the gap between the trunks, with the clearing still emptying behind him',
      precondition: 'Lirael has not yet been told her conduct is under investigation',
      forces_choice: 'whether to sign the acknowledgement or refuse it',
      slots: { actor: 'the presiding Dohkar', action: 'serves formal notice of investigation',
               target: 'Lirael', exitState: 'Lirael is formally under investigation and restricted',
               precondition: 'the presiding Dohkar is present in the scene' } },
    hardBeats: [{ description: 'the notice is served and acknowledged in writing' }],
    aftermathTruths: [], reservedConstraints: [] };
  window._structuredEventHandoff = true;
  return window._buildPlotContractDirective() || '';
});
fs.writeFileSync('_audit_out/issue_outline/author_request_with_event.txt', authWithEvent);
t('with a planner event present, purpose and event are stated as NESTED, not rival assignments',
  /THE EVENT BELOW IS HOW THAT PURPOSE LANDS, not a competing assignment/.test(authWithEvent),
  authWithEvent.length);
t('and that path carries the purpose, the event and the causal outline together',
  /THIS SCENE'S PURPOSE WITHIN ISSUE 1/.test(authWithEvent)
  && /SCENE SPINE — THE EVENT/.test(authWithEvent)
  && /CAUSAL OUTLINE — THE DRAMATIC SEQUENCE/.test(authWithEvent),
  JSON.stringify({ purpose: /PURPOSE WITHIN ISSUE 1/.test(authWithEvent),
    event: /SCENE SPINE — THE EVENT/.test(authWithEvent), outline: /CAUSAL OUTLINE/.test(authWithEvent) }));
t('the obsolete milestone paragraph is gone from that path too',
  !/NOT staging authority, NOT the event to render/.test(authWithEvent)
  && !/do NOT try to accomplish the whole milestone in one scene/.test(authWithEvent),
  (authWithEvent.match(/.{0,100}milestone.{0,200}/i) || [''])[0]);
t('a scene with no planner contract still receives purpose and outline (not dropped on the early return)',
  /THIS SCENE'S PURPOSE WITHIN ISSUE 1/.test(auth.d) && /CAUSAL OUTLINE/.test(auth.d)
  && !/SCENE SPINE — THE EVENT/.test(auth.d), auth.len);
t('the 700-1000-word target is preserved in the outline block',
  /700-1000-word budget exists to write these through/.test(auth.d), auth.len);

// ═══ 5. AN ALREADY-DELIVERED DEVELOPMENT IS NOT ASSIGNED AGAIN ══════════════════════════════
section('5. DELIVERED HISTORY IS STATED AS DELIVERED, AND RESERVED SCENES STAY RESERVED');
t('the scenes already played are named as established, not re-assignable',
  /ALREADY DELIVERED EARLIER IN THIS ISSUE/.test(auth.d)
  && /do NOT stage any of these again as a new event or a new revelation/.test(auth.d),
  (auth.d.match(/ALREADY DELIVERED[\s\S]{0,500}/) || [''])[0]);
const deliveredRows = o1.scenes.filter(r => r.status === 'delivered');
t('scenes 1-3 are classified delivered at scene 4, and scene 4 is current',
  deliveredRows.map(r => r.n).join(',') === '1,2,3' && o1.scenes.filter(r => r.status === 'current').map(r => r.n).join(',') === '4',
  o1.scenes.map(r => r.n + ':' + r.status).join(' '));
t('a delivered development appears under ALREADY DELIVERED and never as this scene\'s assignment',
  (() => {
    const s3 = o1.scenes.filter(r => r.n === 3)[0];
    const head = auth.d.slice(0, auth.d.indexOf('ALREADY DELIVERED'));
    return !!s3 && s3.accomplishes && auth.d.includes(String(s3.accomplishes).slice(0, 180))
      && !head.includes(String(s3.accomplishes).slice(0, 120));
  })(), 'scene-3 goal must not appear before the ALREADY DELIVERED header');
t('the next scenes are RESERVED for their own scene, not deliverable here',
  /COMING NEXT, RESERVED FOR ITS OWN SCENE/.test(auth.d)
  && /do not deliver, name or pre-empt any of it here/.test(auth.d), auth.len);
t('an unconditional look-ahead is NOT labelled conditional (scenes 5-6 sit before the horizon)',
  /COMING NEXT, RESERVED/.test(auth.d) && !/scene 5 \[CONDITIONAL/.test(auth.d),
  (auth.d.match(/COMING NEXT[\s\S]{0,260}/) || [''])[0]);
// At scene 19 the look-ahead row (20) sits PAST the unresolved decision, so it must be delivered
// as Fate's intention rather than as what happens.
const atHorizon = await page.evaluate(() => {
  const s = window.state;
  s._stagedAuthoringSceneIndex = 18;        // scene 19
  s._issueOutline = null; s._sceneDecisions = null; s._scenePlotContract = null;
  return { block: window._renderIssueOutlineDirective(s, 19) || '',
           outline: JSON.parse(JSON.stringify(window._resolveIssueOutline(s, { force: true }))) };
});
fs.writeFileSync('_audit_out/issue_outline/author_block_at_horizon.txt', atHorizon.block);
t('at the decision scene, scene 20 is classified conditional',
  atHorizon.outline.horizon === 19 && atHorizon.outline.scenes.filter(r => r.n === 20)[0].conditional === true,
  JSON.stringify({ horizon: atHorizon.outline.horizon }));
t('and it is delivered as Fate\'s intention, explicitly NOT as what happens',
  /scene 20 \[CONDITIONAL — Fate's intention, revisable; it is NOT yet what happens\]/.test(atHorizon.block),
  (atHorizon.block.match(/COMING NEXT[\s\S]{0,300}/) || [''])[0]);
t('the decision scene states the axis and forbids deciding it for the player',
  /THE PLAYER DECIDES AT THE END OF THIS SCENE: expose what Julian did/.test(atHorizon.block)
  && /Do NOT decide it for them/.test(atHorizon.block),
  (atHorizon.block.match(/THE PLAYER DECIDES[\s\S]{0,400}/) || [''])[0]);
t('and both cliffhanger possibilities are offered without either being chosen',
  /WHICH cliffhanger it is depends on a player decision/.test(atHorizon.block) === false
  || /do not pick for them, and do not blend the two/.test(atHorizon.block),
  (atHorizon.block.match(/CLIFFHANGER[\s\S]{0,300}/) || [''])[0]);

// ═══ 4. A CONSEQUENTIAL PLAYER MOVE CHANGES THE REMAINING SPINE, NOT THE COMPLETED HISTORY ══
section('4. A PLAYER DECISION REVISES THE REMAINING TRAJECTORY AND PRESERVES COMPLETED HISTORY');
const beforeMove = o1;
const afterMove = await page.evaluate(() => {
  // The SHIPPED recorder, not a seeded field: _recordSceneDecision is what the UI calls.
  window._recordSceneDecision(4, 'intervene', 'tear the band and go to Seren', 'control');
  const o = window._resolveIssueOutline(window.state, { force: true });
  return JSON.parse(JSON.stringify(o));
});
t('the recorded decision is visible to the outline as the active branch',
  afterMove.branch === null || typeof afterMove.branch === 'string',
  JSON.stringify(afterMove.branch));
t('COMPLETED HISTORY IS PRESERVED — every delivered row is byte-identical after the move',
  beforeMove.scenes.filter(r => r.status === 'delivered').every(b => {
    const a = afterMove.scenes.filter(x => x.n === b.n)[0];
    return a && a.accomplishes === b.accomplishes && a.changes === b.changes;
  }), 'a delivered row changed');
const horizonMoved = await page.evaluate(() => {
  // Resolve the decision the horizon was waiting on, then rebuild.
  window._recordSceneDecision(19, 'expose', 'expose what Julian did', 'control');
  const o = window._resolveIssueOutline(window.state, { force: true });
  return JSON.parse(JSON.stringify({ horizon: o.horizon, cliffDecided: o.cliffhanger && o.cliffhanger.decided,
    conditional: o.scenes.filter(r => r.conditional).map(r => r.n),
    delivered: o.scenes.filter(r => r.status === 'delivered').map(r => r.n) }));
});
t('resolving the scene-19 decision moves the horizon past it and settles the cliffhanger',
  horizonMoved.cliffDecided === true && (horizonMoved.horizon === null || horizonMoved.horizon > 19),
  JSON.stringify(horizonMoved));
const revise = await page.evaluate(() => {
  const logs = [];
  const orig = console.log;
  console.log = function () { logs.push(Array.prototype.join.call(arguments, ' ')); orig.apply(console, arguments); };
  window._reviseIssueOutlineForMove(window.state, 'control probe');
  console.log = orig;
  return logs.filter(l => /ISSUE-OUTLINE/.test(l));
});
t('the revision is reported, and reports no change to any delivered row',
  revise.some(l => /\[ISSUE-OUTLINE:REVISE\]/.test(l))
  && !revise.some(l => /DELIVERED ROW .* CHANGED/.test(l)), JSON.stringify(revise));

// ═══ 2b / 6. THE SPINE CAN OWN THE OUTLINE WITH NO AUTHORED PLAN, AND BOTH PATHS CONSUME IT ═
section('2b. A STORY WITH NO AUTHORED PLAN GETS ITS OUTLINE FROM THE GENERATED ISSUE SPINE');
const spineOnly = await page.evaluate((arc) => {
  const s = window.state;
  s._starterId = null;                      // no STARTER_PLANS row exists for this story
  s._issueOutline = null; s._sceneDecisions = null;
  s._stagedAuthoringSceneIndex = 1;         // scene 2
  s.cgScaffold = { storyId: s.storyId, issueArcs: [arc] };
  const o = window._resolveIssueOutline(s, { force: true });
  return JSON.parse(JSON.stringify(o));
}, CONSTRUCTED_SPINE_ARC);
t('with no authored plan the outline comes from the issue spine',
  spineOnly.planPresent === false && spineOnly.spineOutlinePresent === true && spineOnly.scenes.length === 3,
  JSON.stringify({ plan: spineOnly.planPresent, spine: spineOnly.spineOutlinePresent, n: spineOnly.scenes.length }));
t('the spine-owned rows carry accomplishments and but/therefore links',
  spineOnly.scenes.every(r => r.accomplishes)
  && spineOnly.scenes.slice(1).every(r => r.follows_from.link === 'but' || r.follows_from.link === 'therefore'),
  JSON.stringify(spineOnly.scenes.map(r => [r.n, r.follows_from.link, r.accomplishes.slice(0, 40)])));
t('the spine-owned cliffhanger names the predicament the next issue opens inside',
  !!spineOnly.cliffhanger && spineOnly.cliffhanger.source === 'issue spine'
  && /accomplice/.test(spineOnly.cliffhanger.issue2Predicament || ''),
  JSON.stringify(spineOnly.cliffhanger));
t('the issue span falls back to the shipped ISSUE_PRICING contract when no plan declares one',
  spineOnly.bounds.source === 'ISSUE_PRICING' && spineOnly.bounds.per === 10,
  JSON.stringify(spineOnly.bounds));

section('6. BOTH THE CG AND THE LITERARY AUTHOR PATHS CONSUME THESE PLANNING OUTPUTS');
const src = fs.readFileSync('public/app.js', 'utf8');
const cgRoot = /sysPrompt \+= _buildPlotContractDirective\(\)/.test(src);
const litRoot = /_literarySceneMandate \+= window\._buildPlotContractDirective\(\)/.test(src);
const liteRoot = /system \+= '\\n\\n────────\\n\\n' \+ _pcLite/.test(src);
t('the CG author root calls the shared builder', cgRoot);
t('the literary author root calls the same shared builder', litRoot);
t('the lite root calls it too (one owner, three roots)', liteRoot);
const live = await page.evaluate(() => {
  const s = window.state;
  s._starterId = 'starter_first_sacrifice'; s._issueOutline = null;
  const out = {};
  // CG path: staged index.
  s.currentEngine = 'graphic'; s.renderMode = 'cg'; s._stagedAuthoringSceneIndex = 3;
  out.cg = (window._buildPlotContractDirective() || '');
  // LITERARY path: no staged index, turnCount-derived scene number, and the literary skeleton
  // renderer is a DIFFERENT function — check it carries the outline too.
  s.currentEngine = 'literary'; s.renderMode = 'literary';
  delete s._stagedAuthoringSceneIndex; s.turnCount = 2;   // -> scene 4
  s._issueOutline = null;
  out.lit = (window._buildPlotContractDirective() || '');
  out.litSkel = (typeof window.buildSkeletonDirective === 'function') ? (window.buildSkeletonDirective() || '') : '(absent)';
  return out;
});
fs.writeFileSync('_audit_out/issue_outline/cg_author_block.txt', live.cg);
fs.writeFileSync('_audit_out/issue_outline/literary_author_block.txt', live.lit);
t('the CG author block contains the purpose AND the causal outline',
  /THIS SCENE'S PURPOSE WITHIN ISSUE 1/.test(live.cg) && /CAUSAL OUTLINE/.test(live.cg), live.cg.length);
t('the LITERARY author block contains the purpose AND the causal outline',
  /THIS SCENE'S PURPOSE WITHIN ISSUE 1/.test(live.lit) && /CAUSAL OUTLINE/.test(live.lit), live.lit.length);
t('each path resolves its OWN scene number (CG scene 4 via staged index, literary scene 4 via turnCount)',
  /scene 4 of 20/.test(live.cg) && /scene 4 of 20/.test(live.lit),
  JSON.stringify({ cg: (live.cg.match(/scene \d+ of \d+/) || [])[0], lit: (live.lit.match(/scene \d+ of \d+/) || [])[0] }));

// ═══ 7. VEILWOOD GEOGRAPHY REACHES PLANNING AND AUTHOR REQUESTS, AND IS LOCATION-SCOPED ════
section('7. VEILWOOD GEOGRAPHY CANON (location-scoped) REACHES THE SPINE, THE SCAFFOLD AND THE AUTHOR');
const VW_RE = /VEILWOOD GEOGRAPHY \(canon/;
const DOOR_RE = /\b(doorway|doorways|doorframe|rite-hall)\b|\bdoors?\b/i;

// 7a. THE ISSUE SPINE. Captured from the REAL builder (window.__buildCGScaffold, a free-harness
// handle) with the provider intercepted — not from a copy of the prompt.
calls.length = 0;
const spineReq = await page.evaluate(async () => {
  const s = window.state;
  s._starterId = 'starter_first_sacrifice';
  s.fantasyRegion = 'the_veilwood';
  s.currentEngine = 'graphic'; s.renderMode = 'cg';
  try { await window.__buildCGScaffold(s, {}); } catch (e) { return 'threw: ' + (e && e.message); }
  return 'ok';
});
const spineCall = calls.filter(c => /ARCHITECT|GRAVITATIONAL|CORE DOCTRINE/i.test(c.joined))[0];
t('the ISSUE SPINE request is captured from the real builder',
  !!spineCall, spineReq + ' | roles seen: ' + calls.map(c => c.role).join(','));
t('the spine request carries the Veilwood geography canon',
  !!spineCall && VW_RE.test(spineCall.joined), !!spineCall);
t('...naming the gap between trees, the tree-home canopies, and how a departure is blocked',
  !!spineCall && /GAP, or a PASSAGE BETWEEN TREES/.test(spineCall.joined)
  && /A ceremony clearing has none/.test(spineCall.joined)
  && /step into the gap between the trunks/.test(spineCall.joined),
  spineCall && (spineCall.joined.match(/VEILWOOD GEOGRAPHY[\s\S]{0,1400}/) || [''])[0]);

// 7b. THE SCENE SCAFFOLD — the layer where the defect was actually found.
calls.length = 0;
await page.evaluate(() => {
  const s = window.state;
  s.sceneSkeleton = null; s._skeletonMeta = null; s._stagedAuthoringSceneIndex = 3;
  s._issueOutline = null; s._sceneDecisions = null;
});
await page.evaluate(() => window.__generateSceneSkeleton('wait for the Dohkar', '', { sceneNumber: 4 }));
const skelCall2 = calls.filter(c => /mistral-proxy/.test(c.url) && /narrative skeletons/i.test(c.joined))[0];
t('the SCENE SCAFFOLD request carries the canon, before it chooses any staging',
  !!skelCall2 && VW_RE.test(skelCall2.joined), !!skelCall2);
t('and it arrives BEFORE the scene purpose in the request, where staging is decided',
  !!skelCall2 && skelCall2.joined.indexOf('VEILWOOD GEOGRAPHY') < skelCall2.joined.indexOf("THIS SCENE'S PURPOSE"),
  skelCall2 && [skelCall2.joined.indexOf('VEILWOOD GEOGRAPHY'), skelCall2.joined.indexOf("THIS SCENE'S PURPOSE")].join(' < '));

// 7c. THE AUTHOR — at both exits of the shared builder.
const vwAuthor = await page.evaluate(() => {
  const s = window.state;
  const out = {};
  s._scenePlotContract = null;
  out.noContract = window._buildPlotContractDirective() || '';
  s._scenePlotContract = { sceneIndex: 3,
    stateChange: { event: 'The presiding Dohkar serves Lirael formal notice in the gap between the trunks',
      slots: { actor: 'the presiding Dohkar', action: 'serves formal notice', target: 'Lirael',
               exitState: 'Lirael is formally under investigation' } },
    hardBeats: [{ description: 'the notice is served' }], aftermathTruths: [], reservedConstraints: [] };
  out.withContract = window._buildPlotContractDirective() || '';
  return out;
});
fs.writeFileSync('_audit_out/issue_outline/veilwood_author_block.txt', vwAuthor.withContract);
t('the AUTHOR request carries the canon on the contract path', VW_RE.test(vwAuthor.withContract),
  vwAuthor.withContract.length);
t('...and on the no-contract path, which returns early and would otherwise drop it',
  VW_RE.test(vwAuthor.noContract), vwAuthor.noContract.length);
t('the canon also rules out figurative architecture in Veilwood prose',
  /no door closing on anyone, no doorway she fills, no room with one exit/.test(vwAuthor.withContract)
  && /is not architecture and is fine/.test(vwAuthor.withContract), 'figurative clause missing');

// 7d. LOCATION-SCOPED: a scene somewhere else is told nothing about doors.
const scoped = await page.evaluate(() => {
  const s = window.state;
  const saved = { st: s._starterId, reg: s.fantasyRegion, sk: s.sceneSkeleton, asg: s._sceneAssignment,
                  ph: s.physicalState, picks: s.picks };
  s._starterId = null; s.fantasyRegion = 'vaelryn_reach';
  s.sceneSkeleton = { environment_anchor: 'the rain on the counting-house shutters' };
  s._sceneAssignment = { event: 'she signs the ledger', setting: 'the counting house at Pulse Point' };
  s.physicalState = { location: 'the counting house' }; s.picks = { world: 'fatelands' };
  const away = window._veilwoodLocationCanon(s);
  s._starterId = saved.st; s.fantasyRegion = saved.reg; s.sceneSkeleton = saved.sk;
  s._sceneAssignment = saved.asg; s.physicalState = saved.ph; s.picks = saved.picks;
  const home = window._veilwoodLocationCanon(s);
  return { away: away, home: home };
});
t('a NON-Veilwood scene receives NOTHING — this is not a global ban on doors',
  scoped.away === '', JSON.stringify(scoped.away).slice(0, 300));
t('the same renderer still fires for the Veilwood scene', VW_RE.test(scoped.home), scoped.home.length);

// 7e. THE FIXTURE ITSELF RESPECTS THE CANON.
const fixtureText = JSON.stringify(CONSTRUCTED_SKELETON) + JSON.stringify(CONSTRUCTED_SPINE_ARC);
t('the constructed scaffold fixture contains no door, doorway or rite-hall',
  !DOOR_RE.test(fixtureText), (fixtureText.match(DOOR_RE) || [''])[0]);
t('and it blocks her departure with the clearing\'s own geography instead',
  /steps into the gap between the trunks and will not let Lirael pass/.test(fixtureText)
  && /environment_anchor":"the gap between two trunks/.test(fixtureText),
  fixtureText.slice(0, 200));
t('the seed names the ring and the gap, and makes the gap addressable',
  (() => {
    const src2 = fs.readFileSync('public/app.js', 'utf8');
    return /OPEN GROUND inside a ring of pale living trunks/.test(src2)
      && /object_id: 'O8', name: 'the gap between two trunks/.test(src2);
  })(), 'seed geography missing');
t('the seed\'s reject-only planner check now rules out declared enclosures (not a prose filter)',
  (() => {
    const src2 = fs.readFileSync('public/app.js', 'utf8');
    const m = src2.match(/forbiddenEnvironmentFacts: '([^']+)'/);
    return !!m && /doorway/.test(m[1]) && /rite-hall/.test(m[1]) && !/threshold/.test(m[1]);
  })(), 'forbiddenEnvironmentFacts not updated, or wrongly includes threshold');

// ── PRESERVE THE EVIDENCE ───────────────────────────────────────────────────────────────────
fs.writeFileSync('_audit_out/issue_outline/issue_outline.json', JSON.stringify(o1, null, 1));
fs.writeFileSync('_audit_out/issue_outline/scene_scaffold.json', JSON.stringify(skel, null, 1));
fs.writeFileSync('_audit_out/issue_outline/scaffold_request.txt', (skelCall && skelCall.joined) || '(no scaffold call captured)');
fs.writeFileSync('_audit_out/issue_outline/spine_only_outline.json', JSON.stringify(spineOnly, null, 1));

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
console.log('evidence: _audit_out/issue_outline/');
process.exit(fail ? 1 : 0);
