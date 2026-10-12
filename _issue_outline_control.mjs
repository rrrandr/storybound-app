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
await page.goto((process.env.SB_ORIGIN || (process.env.SB_ORIGIN || 'http://localhost:3000')) + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
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

// ═══ 1. STRUCTURAL SHAPE OF THE OUTLINE IN THE ACTIVE ISSUE WINDOW ══════════════════════════
section('1. THE OUTLINE SPANS THE ACTIVE ISSUE WINDOW, CAUSALLY LINKED END TO END');
await setup(4);
const o1 = await page.evaluate(() => JSON.parse(JSON.stringify(window._resolveIssueOutline(window.state, { force: true }))));
t('the outline spans the CG purchase window — rows 1-10, 10 scenes per issue',
  o1.scenes.length === 10 && o1.bounds.first === 1 && o1.bounds.last === 10 && o1.bounds.per === 10,
  JSON.stringify(o1.bounds));
t('the 20 authored rows are reported as a MAPPING onto two CG issues, not as a disagreement',
  !!o1.bounds.mapping && o1.bounds.mapping.rowSupply === 20 && o1.bounds.mapping.issuesSpanned === 2
  && o1.bounds.mapping.nativeMode === 'literary', JSON.stringify(o1.bounds.mapping));
const withGoal = o1.scenes.filter(r => r.accomplishes);
t('every scene with a goal states a DISTINCT accomplishment',
  new Set(withGoal.map(r => r.accomplishes)).size === withGoal.length,
  withGoal.length + ' goals, ' + new Set(withGoal.map(r => r.accomplishes)).size + ' distinct');
t('every scene after the first says WHY it follows, with a but/therefore link',
  o1.scenes.filter(r => r.n > 1 && r.follows_from.text && (r.follows_from.link === 'but' || r.follows_from.link === 'therefore')).length === 9,
  o1.scenes.filter(r => r.n > 1 && !(r.follows_from && r.follows_from.link)).map(r => r.n).join(','));
t('every scene states what CHANGES and what it SETS UP',
  o1.scenes.every(r => r.changes) && o1.scenes.every(r => r.sets_up),
  o1.scenes.filter(r => !r.changes || !r.sets_up).map(r => r.n).join(','));
t('every scene declares WHAT KIND of development it is',
  o1.scenes.every(r => ['independent', 'convergence', 'conditional', 'overturned'].indexOf(r.kind) !== -1),
  JSON.stringify(o1.scenes.map(r => [r.n, r.kind])));
t('the issue is a MIX of independent events, convergence points and real choices — not a branching tree',
  new Set(o1.scenes.map(r => r.kind)).size >= 3,
  JSON.stringify(o1.scenes.map(r => r.kind)));
t('the window ends on a specific cliffhanger with the next issue\'s predicament',
  !!o1.cliffhanger && o1.cliffhanger.scene === 10 && !!o1.cliffhanger.event
  && (o1.cliffhanger.issue2Predicament || '').length > 60,
  JSON.stringify(o1.cliffhanger && { scene: o1.cliffhanger.scene, ev: (o1.cliffhanger.event || '').slice(0, 60) }));
t('and that cliffhanger is marked an AUTHORED PROPOSAL pending review, not settled canon',
  o1.cliffhanger.provenance === 'authored_proposal_pending_review', o1.cliffhanger.provenance);

// ═══ 2. THE SCENE SCAFFOLD RECEIVES ITS ISSUE DIRECTIVE AND RETURNS A CAUSAL OUTLINE ════════
section('2. THE SCENE SCAFFOLD REQUEST');
calls.length = 0;
const skel = await page.evaluate(async () => {
  const r = await window.__generateSceneSkeleton('wait for the Dohkar', '', { sceneNumber: 4 });
  return JSON.parse(JSON.stringify({ causal_outline: r && r.causal_outline, note: r && r.causal_outline_note,
    builtFor: r && r._builtForScene, anchor: r && r.environment_anchor,
    staged: (r && r.staged_characters) || [], pacing: r && r.structural_pacing, env: r && r.environment_plus }));
});
const skelCall = calls.filter(c => /mistral-proxy/.test(c.url) && /narrative skeletons/i.test(c.joined))[0];
t('the scaffold request carries THIS SCENE\'S PURPOSE WITHIN THE ISSUE',
  !!skelCall && /THIS SCENE'S PURPOSE WITHIN THE ISSUE/.test(skelCall.joined), !!skelCall);
t('...including what it accomplishes, why it follows, what changes and what it sets up',
  !!skelCall && /WHAT IT ACCOMPLISHES:/.test(skelCall.joined) && /WHY IT FOLLOWS WHAT CAME BEFORE/.test(skelCall.joined)
  && /WHAT MUST BE TRUE BY THE END:/.test(skelCall.joined) && /WHAT IT SETS UP FOR THE NEXT SCENE:/.test(skelCall.joined),
  skelCall && (skelCall.joined.match(/THIS SCENE'S PURPOSE[\s\S]{0,900}/) || [''])[0]);
t('the scaffold is asked for a But/Therefore sequence at the CG beat granularity (20-24)',
  !!skelCall && /CAUSAL_OUTLINE/.test(skelCall.joined) && /An ARRAY of 20-24 objects/.test(skelCall.joined)
  && /THE BUT\/THEREFORE RULE/.test(skelCall.joined), !!skelCall);
t('and told a beat is not a sentence, with NO unrequested literary count or action quota',
  !!skelCall && /A BEAT IS NOT A SENTENCE and not a caption/.test(skelCall.joined)
  && /700-1000-word budget/.test(skelCall.joined)
  && !/At least HALF the entries/.test(skelCall.joined) && !/10-14/.test(skelCall.joined), !!skelCall);
t('the returned causal outline lands on the scaffold, stamped with its scene',
  Array.isArray(skel.causal_outline) && skel.causal_outline.length === 9 && skel.builtFor === 4,
  JSON.stringify({ n: (skel.causal_outline || []).length, builtFor: skel.builtFor, note: skel.note }));
t('its links are preserved as structure (therefore/but), first entry unlinked',
  skel.causal_outline && skel.causal_outline[0].link === null
  && skel.causal_outline.slice(1).every(b => b.link === 'but' || b.link === 'therefore'),
  JSON.stringify((skel.causal_outline || []).map(b => b.link)));
// environment_plus is deliberately NOT asserted: production overwrites whatever the model returns
// via _resolveStageBeatInventory and nulls it when that resolver finds nothing, so it is a
// BACKEND-owned field, not one the scaffold retains.
t('the scaffold KEEPS its staging, cast and tonal responsibilities',
  !!skel.anchor && skel.staged.length === 3 && !!skel.pacing,
  JSON.stringify({ anchor: skel.anchor, staged: skel.staged.length, pacing: skel.pacing, env_backend_owned: skel.env }));

// ═══ 3. THE AUTHOR BLOCK ON THE CG PATH ═════════════════════════════════════════════════════
// NOTE: these read the prompt FRAGMENT from the shared builder. The INTERCEPTED OUTGOING author
// request is checked in _outline_delivery_control.mjs section 7, which is the real proof.
section('3. THE SHARED AUTHOR BUILDER (fragment-level; the real outgoing request is checked in _outline_delivery_control)');
const auth = await page.evaluate(() => {
  const s = window.state;
  s._scenePlotContract = { sceneIndex: 3,
    stateChange: { event: 'The presiding Dohkar serves Lirael formal notice in the gap between the trunks',
      precondition: 'Lirael has not yet been told her conduct is under investigation',
      forces_choice: 'whether to sign the acknowledgement or refuse it',
      slots: { precondition: 'the presiding Dohkar is present in the scene',
               actor: 'the presiding Dohkar', action: 'serves formal notice of investigation',
               target: 'Lirael', exitState: 'Lirael is formally under investigation and restricted' } },
    hardBeats: [{ description: 'the notice is served' }], aftermathTruths: [], reservedConstraints: [] };
  window._structuredEventHandoff = true;
  return window._buildPlotContractDirective() || '';
});
fs.mkdirSync('_audit_out/issue_outline', { recursive: true });
fs.writeFileSync('_audit_out/issue_outline/author_request_block.txt', auth);
t('the author receives the scene\'s PURPOSE WITHIN THE ISSUE and its KIND',
  /THIS SCENE'S PURPOSE WITHIN ISSUE 1/.test(auth) && /WHAT THIS SCENE ACCOMPLISHES:/.test(auth)
  && /WHAT KIND OF DEVELOPMENT THIS IS:/.test(auth), auth.slice(0, 400));
t('...and the causal sequence that develops it',
  /CAUSAL OUTLINE — THE DRAMATIC SEQUENCE OF THIS SCENE/.test(auth)
  && /THEREFORE — this happens BECAUSE/.test(auth) && /BUT — this is OBSTRUCTED/.test(auth), auth.length);
t('the issue directive is NOT demoted to optional inspiration',
  !/NOT staging authority, NOT the event to render/.test(auth)
  && !/Do NOT restate this milestone as the scene's action/.test(auth)
  && !/do NOT try to accomplish the whole milestone in one scene/.test(auth),
  (auth.match(/.{0,120}milestone.{0,200}/i) || [''])[0]);
t('the but/therefore labels are explicitly NOT wording for the prose',
  /THE LINKS ARE STRUCTURE, NOT WORDING/.test(auth)
  && /Never write the words "but", "therefore" or "and then" as connectives/.test(auth), auth.length);
t('the purpose and the event are stated as NESTED, not as rival assignments',
  /THE EVENT BELOW IS HOW THAT PURPOSE LANDS, not a competing assignment/.test(auth), auth.length);
t('the 700-1000-word target is preserved in the outline block',
  /700-1000-word budget exists to write these through/.test(auth), auth.length);

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
// The literary path renders the causal outline through buildSkeletonDirective (after its skeleton
// is generated), NOT through the plot-contract block — see _outline_delivery_control section 8,
// which drives both orderings. Verified here: the shared root exists on both paths.
t('the shared builder emits the purpose block on the CG path',
  await page.evaluate(() => {
    const s = window.state;
    s._starterId = 'starter_first_sacrifice'; s.cgScaffold = null;   // section 2b cleared both
    s.currentEngine = 'graphic'; s.renderMode = 'cg'; s._stagedAuthoringSceneIndex = 3;
    s._issueOutline = null;
    return /THIS SCENE'S PURPOSE WITHIN ISSUE 1/.test(window._buildPlotContractDirective() || '');
  }), 'cg purpose absent');
t('and on the literary path',
  await page.evaluate(() => {
    const s = window.state;
    s._starterId = 'starter_first_sacrifice'; s.cgScaffold = null;
    s.currentEngine = 'literary'; s.renderMode = 'literary';
    delete s._stagedAuthoringSceneIndex; s.turnCount = 2;
    s._issueOutline = null;
    return /THIS SCENE'S PURPOSE WITHIN ISSUE 1/.test(window._buildPlotContractDirective() || '');
  }), 'literary purpose absent');

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
