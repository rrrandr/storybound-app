// ══════════════════════════════════════════════════════════════════════════════════════════
// FIVE CHECKS FOR THE 2026-11-06 PRODUCT CORRECTIONS — NO PAID CALLS
// ══════════════════════════════════════════════════════════════════════════════════════════
// Every input is either a saved reply from a run already paid for, or a hand-built reply in the
// exact shape the saved ones have. Nothing dispatches. The module is loaded in a page with all
// of /api/** blocked, and the real production functions are called through window.
//
// WHAT EACH CHECK ESTABLISHES, and nothing more:
//   1. An earlier portrait cannot automatically settle a deficient current encounter.
//      → the SAVED all-KEEP reply from both providers, replayed against the corrected validator.
//   2. A sufficiently embodied encounter can still KEEP.
//      → the same reply shape with evidence quoted from INSIDE the editable span.
//   3. The protagonist's own Mask reaches the craft request.
//      → the real production viewpoint builder's output, rendered into the real request.
//   4. Grok's destructive P27 replacement cannot pass the enrichment-preservation boundary.
//      → the SAVED Grok edit, byte-for-byte, through the corrected validator.
//   5. An anchored addition preserves every original action.
//      → the same added clause delivered as insert_at_anchor, spliced by the real splice.
//
// NONE OF THEM establishes that the corrected instructions produce better WRITING. That needs
// prose, which needs a paid call, which is not authorized. A green result here means the
// structural boundaries hold and the Mask arrives — not that the craft improved.
const { chromium } = await import('playwright-core');
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/romantsukerman/storybound-app';
const LUNA = path.join(ROOT, '_ab_writing_out/continuation_pass_run_2026-11-06T04-15-56-626Z');
const GROK = path.join(ROOT, '_ab_writing_out/grok_matched_2026-11-06T04-51-51-944Z');
const OUT = path.join(ROOT, '_ab_writing_out/BOUNDARY_CHECKS.txt');

const rd = (p) => fs.readFileSync(p, 'utf8');
const rj = (p) => JSON.parse(rd(p));

// The supplied scene, exactly as both passes received it.
const SCENE = rd(path.join(ROOT, '_ab_writing_out/handoff_run_2026-11-06T02-30-42-964Z/03_DRAFT_combined.txt'));
// The frozen editable span.
const EDITABLE = rj(path.join(LUNA, 'pass1_user.json')).editableRefs;
// The saved raw replies.
const SAVED_PICTURE = rj(path.join(GROK, 'raw_pass1.json')).response.choices[0].message.content;
const SAVED_CRAFT = rj(path.join(GROK, 'raw_pass2.json')).response.choices[0].message.content;

const lines = [];
const say = (s) => { lines.push(s); console.log(s); };
let pass = 0, fail = 0;
const assert = (name, ok, detail) => {
  if (ok) { pass++; say('  PASS  ' + name); }
  else { fail++; say('  FAIL  ' + name + (detail ? '\n          ' + detail : '')); }
};

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', (r) => r.abort());
await page.route('**://api.**', (r) => r.abort());
page.on('console', (m) => { if (/ERROR|Uncaught/.test(m.text())) console.log('[page]', m.text()); });
await page.goto('http://localhost:3000/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!(window.EssentialBeatCheck && window._PC_NARRATOR_ARCHETYPE_PROFILES), null, { timeout: 60000 });

const result = await page.evaluate(({ SCENE, EDITABLE, SAVED_PICTURE, SAVED_CRAFT }) => {
  const E = window.EssentialBeatCheck;
  const R = { notes: [] };
  const paras = E.paragraphsOf(SCENE);

  // ── Shared scopes: the restricted (experiment) one and the unrestricted (production) one ──
  const scopeRestricted = E.cpEditorScope(paras, [], EDITABLE);
  const scopeWhole = E.cpEditorScope(paras, [], null);
  R.scope = {
    restricted: scopeRestricted.restricted, refs: scopeRestricted.refs.length,
    encounterChars: scopeRestricted.encounterText.length,
    wholeRestricted: scopeWhole.restricted, wholeRefs: scopeWhole.refs.length,
    wholeEncounterChars: scopeWhole.encounterText.length, sceneChars: SCENE.length
  };

  // ════════════════════════════════════════════════════════════════════════════════════════
  // CHECK 1 — the saved all-KEEP picturability reply, replayed.
  // ════════════════════════════════════════════════════════════════════════════════════════
  const pictureIds = ['picture:mara', 'picture:roman_tusk'];
  const v1 = E.validateSceneEditorReply(SAVED_PICTURE, {
    scope: scopeRestricted, ids: pictureIds, reader: SCENE,
    groundingIds: pictureIds, claimIds: pictureIds,
    groundingCorpus: {}, enrichment: false, historyComplete: false
  });
  R.check1 = {
    keeps: v1.keeps.length, items: v1.items.length,
    rejected: v1.rejected.map((x) => ({ id: x.id, code: x.code })),
    unanswered: v1.unanswered.map((x) => x.id),
    groundingCodes: (v1.grounding || []).map((g) => ({ id: g.id, accepted: g.accepted, code: g.code }))
  };

  // The SAME reply against the UNRESTRICTED scope — production, where nothing is read-only.
  const v1prod = E.validateSceneEditorReply(SAVED_PICTURE, {
    scope: scopeWhole, ids: pictureIds, reader: SCENE,
    groundingIds: pictureIds, claimIds: pictureIds,
    groundingCorpus: {}, enrichment: false, historyComplete: false
  });
  R.check1production = { keeps: v1prod.keeps.length, rejected: v1prod.rejected.length };

  // ════════════════════════════════════════════════════════════════════════════════════════
  // CHECK 2 — a sufficiently embodied encounter still KEEPs.
  // The evidence is real prose from INSIDE the editable span, quoted verbatim. Same shape as
  // the saved reply; only the passage moves from the lead-in into the encounter.
  // ════════════════════════════════════════════════════════════════════════════════════════
  const enc = scopeRestricted.encounterText;
  const grab = (needle, len) => {
    const i = enc.indexOf(needle);
    return i === -1 ? null : enc.slice(i, i + len);
  };
  const insideMara = grab('I reached', 60) || enc.slice(0, 80);
  const insideRoman = grab('He let me', 90) || enc.slice(0, 80);
  const embodied = {
    decisions: [
      { id: 'picture:mara', decision: 'keep', keptPassage: insideMara,
        grounding: { recognizable: true, basis: 'scene', evidence: insideMara, why: 'her hands and bearing in this encounter' } },
      { id: 'picture:roman_tusk', decision: 'keep', keptPassage: insideRoman,
        grounding: { recognizable: true, basis: 'scene', evidence: insideRoman, why: 'his stillness, held, in this encounter' } }
    ],
    edits: []
  };
  const v2 = E.validateSceneEditorReply(JSON.stringify(embodied), {
    scope: scopeRestricted, ids: pictureIds, reader: SCENE,
    groundingIds: pictureIds, claimIds: pictureIds,
    groundingCorpus: {}, enrichment: false, historyComplete: false
  });
  R.check2 = {
    quotedFromEncounter: [insideMara, insideRoman],
    keeps: v2.keeps.length, rejected: v2.rejected.map((x) => ({ id: x.id, code: x.code })),
    accepted: (v2.grounding || []).map((g) => ({ id: g.id, accepted: g.accepted, basis: g.basis }))
  };

  // ════════════════════════════════════════════════════════════════════════════════════════
  // CHECK 3 — the protagonist's own Mask reaches the craft request.
  // The PRODUCTION builder is at the C+ call site and reads window.state, so state is set to
  // a reader's pick and the builder's own output is rendered through the real request builder.
  // The LI's archetype is set to a DIFFERENT mask, so borrowing it would be visible.
  // ════════════════════════════════════════════════════════════════════════════════════════
  const prior = { playerName: window.state && window.state.playerName,
    playerMask: window.state && window.state.playerMask,
    archetype: window.state && window.state.archetype };
  window.state = window.state || {};
  window.state.playerName = 'Mara';
  window.state.playerMask = 'armored_fox';                 // lowercase on purpose
  window.state.archetype = { primary: 'BEAUTIFUL_RUIN' };  // the LI's, which must NOT be used
  // The production builder, lifted verbatim from the C+ call site so the test exercises the
  // shipped resolution rather than a copy of it.
  const buildViewpoint = () => {
    const _st = window.state || {};
    const _name = String((_st.playerName || _st.name) || '').trim();
    const _mask = String((_st.picks && (_st.picks.playermask || _st.picks.playerMask))
      || _st.playerMask || _st.playermask || '').toUpperCase().replace(/[^A-Z_]/g, '');
    let _prof = null;
    const _tbl = window._PC_NARRATOR_ARCHETYPE_PROFILES || {};
    const _p = _mask ? _tbl[_mask] : null;
    if (_p) _prof = { label: _p.label || null, movement: _p.movement || null,
      voice: _p.voice || null, sentenceShape: _p.sentenceShape || null };
    if (!_name && !_mask) return undefined;
    return { stable: { character: _name || null, mask: _mask || null, maskProfile: _prof || undefined,
        note: 'The PC\'s own mask, from the reader\'s pick. Not the love interest\'s archetype.' },
      thisScene: { lensOperation: null },
      bounded: 'Only what the protagonist can perceive or infer.',
      doNotPrescribe: 'Do NOT write toward a predetermined feeling.' };
  };
  const vp = buildViewpoint();
  const craftReq = E.buildSceneEditorRequest({
    draft: SCENE, due: [
      { id: 'cplus:roman_tusk', label: 'Roman Tusk', kind: 'recurring', isLI: true,
        mode: 'echo_reinterpret', depictionMode: 'on_stage' }
    ],
    editableRefs: EDITABLE, viewpoint: vp
  });
  const blob = craftReq.sys + '\n' + craftReq.user;
  R.check3 = {
    resolvedMask: vp && vp.stable.mask,
    profileLabel: vp && vp.stable.maskProfile && vp.stable.maskProfile.label,
    maskInRequest: blob.indexOf('ARMORED_FOX') !== -1,
    profileVoiceInRequest: blob.indexOf('IRONIC DISTANCE') !== -1,
    liArchetypeLeaked: blob.indexOf('BEAUTIFUL_RUIN') !== -1 || blob.indexOf('Beautiful Ruin') !== -1,
    sampleSentenceLeaked: blob.indexOf('three seconds late') !== -1,
    enrichmentFlag: craftReq.enrichment,
    // The absent-mask case: no mask must yield no mask, never a borrowed or invented one.
    absent: (function () {
      window.state.playerMask = ''; window.state.picks = {};
      const v = buildViewpoint();
      return { mask: v ? v.stable.mask : null, profile: v ? !!v.stable.maskProfile : null };
    })()
  };
  window.state.playerName = prior.playerName; window.state.playerMask = prior.playerMask;
  window.state.archetype = prior.archetype;

  // ── WIRING: the corrected wording must reach the actual payloads, not just the source ──
  const pictReq = E.buildSceneEditorRequest({
    draft: SCENE, mode: 'picturability', editableRefs: EDITABLE,
    due: [{ id: 'picture:roman_tusk', label: 'Roman Tusk', isLI: true }]
  });
  const pblob = pictReq.sys + '\n' + pictReq.user;
  R.wiring = {
    picture: {
      encounterFrame: pblob.indexOf('JUDGE THE ENCOUNTER YOU CAN EDIT') !== -1,
      notDischarged: pblob.indexOf('THEY DO NOT AUTOMATICALLY DISCHARGE THIS') !== -1,
      genericAnatomy: pblob.indexOf('GENERIC ANATOMICAL ACTIVITY IS NOT AUTOMATICALLY') !== -1,
      noChecklist: pblob.indexOf('NO NEW TRAIT') !== -1,
      keepAvailable: pblob.indexOf('ALREADY SUFFICIENTLY EMBODIED IS A KEEP') !== -1,
      noPortrait: pblob.indexOf('DO NOT FORCE ANOTHER INTRODUCTORY PORTRAIT') !== -1,
      narrowCorrection: pblob.indexOf('A CORRECTION STAYS NARROW') !== -1,
      anchoredOpOffered: pblob.indexOf('insert_at_anchor') !== -1,
      staleSceneWideWording: pblob.indexOf('GROUNDING IS NOT A PER-SCENE QUOTA, AND A SCENE') !== -1,
      // The shirt/cuff case is a local regression case, NOT a permanent prompt example.
      cuffsInPrompt: /cuff/i.test(pictReq.sys)
    },
    craft: {
      startFromPage: blob.indexOf('START FROM SOMETHING ALREADY ON THE PAGE') !== -1,
      maskShaped: blob.indexOf('the reading her mask gives her') !== -1,
      noCompulsoryGloss: blob.indexOf('AN OPINION AFTER EVERY OBSERVATION IS NOT OWED') !== -1,
      permissionPreserved: blob.indexOf('NO BEAT OWES EVERY FUNCTION') !== -1,
      motiveStaysHers: blob.indexOf('HIS MOTIVES REMAIN HER READING OF HIM') !== -1,
      replaceWithheld: blob.indexOf('"replace" IS NOT AVAILABLE IN THIS PASS') !== -1,
      replaceNotOffered: blob.indexOf('"op":"replace"') === -1,
      standardUnchanged: blob.indexOf('WRITE AS YOU WOULD ANYWAY') !== -1,
      anchoredOpOffered: blob.indexOf('insert_at_anchor') !== -1,
      insertAfterOffered: blob.indexOf('insert_after') !== -1,
      romanSentenceCopied: /years of not watching|bear being seen/i.test(blob),
      // No threshold wording may survive anywhere in the prompt: the rule is the op, and the
      // model is never asked to count anything.
      thresholdWording: /content word|every sentence the paragraph|allowance/i.test(blob)
    }
  };

  // ════════════════════════════════════════════════════════════════════════════════════════
  // CHECK 4 — the saved destructive P27 replacement, byte-for-byte, against the boundary.
  // ════════════════════════════════════════════════════════════════════════════════════════
  const craftIds = ['cplus:roman_tusk', 'cplus:mara'];
  const ctxCraft = { scope: scopeRestricted, ids: craftIds, reader: SCENE,
    groundingIds: [], claimIds: craftIds, groundingCorpus: {}, historyComplete: false };
  const v4 = E.validateSceneEditorReply(SAVED_CRAFT, Object.assign({}, ctxCraft, { enrichment: true }));
  const v4off = E.validateSceneEditorReply(SAVED_CRAFT, Object.assign({}, ctxCraft, { enrichment: false }));
  const p27 = paras.find((p) => p.ref === 'P27');
  R.check4 = {
    boundaryOn: { applied: v4.items.length,
      rejected: v4.rejected.map((x) => ({ tag: x.tag, code: x.code, ops: x.availableOps })) },
    boundaryOff: { applied: v4off.items.length, rejected: v4off.rejected.length }
  };

  // ════════════════════════════════════════════════════════════════════════════════════════
  // CHECK 4b — THE CASE THE WITHDRAWN THRESHOLD LET THROUGH.
  // A short replacement that changes an ACTION while dropping almost nothing: "He let me,
  // standing still" becomes "He stepped back", one sentence for one sentence. Under the
  // calibrated content-word allowance this passed — too few words went to trip any threshold.
  // It must now be refused for the same reason the paid edit is: it is a `replace`.
  // ════════════════════════════════════════════════════════════════════════════════════════
  const SRC27 = p27 ? p27.text : '';
  const ACTION_SWAP = SRC27.replace(
    'He let me, standing still the way he always had, only now the stillness vibrated with held want.',
    'He stepped back, and the years of not watching had taught me how long he could bear being seen.');
  const swapReply = {
    decisions: [{ id: 'cplus:roman_tusk', decision: 'edit', ref: 'P27', why: 'reads his stillness',
      perception: { passage: 'He stepped back', why: 'her history read onto him' } }],
    edits: [{ ref: 'P27', op: 'replace', text: ACTION_SWAP, forObligations: ['cplus:roman_tusk'] }]
  };
  const v4b = E.validateSceneEditorReply(JSON.stringify(swapReply),
    Object.assign({}, ctxCraft, { enrichment: true }));
  R.check4b = {
    swapIsSmall: ACTION_SWAP.length - SRC27.length,
    stayedRemoved: ACTION_SWAP.indexOf('He let me, standing still') === -1,
    applied: v4b.items.length,
    rejected: v4b.rejected.map((x) => ({ tag: x.tag, code: x.code })),
    // Proof that this specific reply is NOT caught by text measurement: it is accepted the
    // moment the mode flag is off, so only the op rule refuses it.
    acceptedWithoutTheRule: E.validateSceneEditorReply(JSON.stringify(swapReply),
      Object.assign({}, ctxCraft, { enrichment: false })).items.length
  };

  // ════════════════════════════════════════════════════════════════════════════════════════
  // CHECK 5 — the same addition, anchored. Every original action must survive.
  // The added clause is the one the saved Grok edit produced; the anchor is the existing
  // sentence it follows. Nothing is rewritten.
  // ════════════════════════════════════════════════════════════════════════════════════════
  const ANCHOR = 'I wrapped my hand around him, stroking once, twice, learning the weight and heat.';
  const ADD = 'The years of not watching had taught me exactly how long he could bear being seen.';
  const anchored = {
    decisions: [{ id: 'cplus:roman_tusk', decision: 'edit', ref: 'P27', why: 'develops what she already sees',
      perception: { passage: ADD, why: 'her history, read onto his stillness' } }],
    edits: [{ ref: 'P27', op: 'insert_at_anchor', anchor: ANCHOR, text: ADD,
      forObligations: ['cplus:roman_tusk'] }]
  };
  const v5 = E.validateSceneEditorReply(JSON.stringify(anchored), Object.assign({}, ctxCraft, { enrichment: true }));
  const spl5 = v5.items.length ? E.spliceAuthorized(SCENE, paras, v5.items) : null;
  const final5 = spl5 ? spl5.text : '';
  const ACTIONS = [
    'I reached for his belt.',
    'Trousers and shorts dropped.',
    'His cock stood heavy, flushed, a bead already at the tip.',
    'I wrapped my hand around him, stroking once, twice, learning the weight and heat.',
    'A muscle jumped in his jaw.',
    'He let me, standing still the way he always had, only now the stillness vibrated with held want.'
  ];
  R.check5 = {
    applied: v5.items.length, rejected: v5.rejected.map((x) => ({ tag: x.tag, code: x.code })),
    bytes: spl5 ? E.unaffectedBytesPreserved(SCENE, final5, spl5.applied).ok : null,
    delta: final5.length - SCENE.length,
    addedPresent: final5.indexOf(ADD) !== -1,
    paragraphCount: final5.split(/\n\n+/).length,
    sceneParagraphCount: SCENE.split(/\n\n+/).length,
    actionsSurviving: ACTIONS.map((a) => ({ a: a.slice(0, 34), kept: final5.indexOf(a) !== -1 })),
    // The three ANCHOR failure modes a model can produce.
    anchorAbsent: E.validateSceneEditorReply(JSON.stringify({
      decisions: anchored.decisions,
      edits: [{ ref: 'P27', op: 'insert_at_anchor', anchor: 'a sentence this paragraph does not contain.',
        text: ADD, forObligations: ['cplus:roman_tusk'] }]
    }), Object.assign({}, ctxCraft, { enrichment: true })).rejected.map((x) => x.code),
    anchorMissing: E.validateSceneEditorReply(JSON.stringify({
      decisions: anchored.decisions,
      edits: [{ ref: 'P27', op: 'insert_at_anchor', text: ADD, forObligations: ['cplus:roman_tusk'] }]
    }), Object.assign({}, ctxCraft, { enrichment: true })).rejected.map((x) => x.code),
    anchorAmbiguous: (function () {
      // 'the' occurs many times in P27, so it names no single place.
      return E.validateSceneEditorReply(JSON.stringify({
        decisions: anchored.decisions,
        edits: [{ ref: 'P27', op: 'insert_at_anchor', anchor: 'the', text: ADD,
          forObligations: ['cplus:roman_tusk'] }]
      }), Object.assign({}, ctxCraft, { enrichment: true })).rejected.map((x) => ({ code: x.code, n: x.occurrences }));
    })(),
    excerpt: (function () {
      const i = final5.indexOf(ANCHOR);
      return i === -1 ? null : final5.slice(Math.max(0, i - 60), i + ANCHOR.length + ADD.length + 40);
    })()
  };
  return R;
}, { SCENE, EDITABLE, SAVED_PICTURE, SAVED_CRAFT });

await browser.close();

const r = result;
say('════ SCOPE ════');
say(JSON.stringify(r.scope));
assert('the restricted scope is recognized as restricted', r.scope.restricted === true);
assert('the encounter is a strict subset of the supplied scene',
  r.scope.encounterChars > 0 && r.scope.encounterChars < r.scope.sceneChars,
  `encounter ${r.scope.encounterChars} of scene ${r.scope.sceneChars}`);
// At the ordinary production call site no editableRefs is supplied, so the WHOLE SCENE is the
// current encounter. That is the correct definition for a normal scene, not a missing feature:
// a range is what a caller supplies when it is editing only part of one.
assert('PRODUCTION (no editableRefs): the whole scene IS the encounter',
  r.scope.wholeRestricted === false
  && r.scope.wholeEncounterChars === r.scope.sceneChars
  && r.scope.wholeRefs === 30,
  JSON.stringify(r.scope));

say('');
say('════ CHECK 1 — an earlier portrait cannot settle a deficient current encounter ════');
say(JSON.stringify(r.check1, null, 1));
assert('the saved all-KEEP reply no longer passes', r.check1.keeps === 0,
  `keeps=${r.check1.keeps}`);
assert('both keeps are rejected as grounding_outside_the_encounter',
  r.check1.rejected.length === 2
  && r.check1.rejected.every((x) => x.code === 'grounding_outside_the_encounter'),
  JSON.stringify(r.check1.rejected));
assert('no edit was forced — nothing is applied, the prose publishes unchanged',
  r.check1.items === 0);
assert('both obligations are recorded unanswered rather than credited',
  r.check1.unanswered.length === 2);
assert('the SAME reply still passes against an unrestricted production scope',
  r.check1production.keeps === 2 && r.check1production.rejected === 0,
  JSON.stringify(r.check1production));

say('');
say('════ CHECK 2 — a sufficiently embodied encounter can still KEEP ════');
say(JSON.stringify(r.check2, null, 1));
assert('a keep evidenced from inside the encounter is accepted', r.check2.keeps === 2,
  JSON.stringify(r.check2.rejected));
assert('both grounding findings are accepted on basis "scene"',
  r.check2.accepted.length === 2 && r.check2.accepted.every((g) => g.accepted && g.basis === 'scene'));

say('');
say('════ CHECK 3 — the protagonist\'s own Mask reaches the craft request ════');
say(JSON.stringify(r.check3, null, 1));
assert('a lowercase pick normalizes to the author\'s own key', r.check3.resolvedMask === 'ARMORED_FOX');
assert('the existing author-facing profile is resolved', r.check3.profileLabel === 'Armored Fox');
assert('the mask reaches the actual craft request', r.check3.maskInRequest === true);
assert('the profile\'s voice reaches it too', r.check3.profileVoiceInRequest === true);
assert('the LOVE INTEREST\'s archetype does NOT reach it', r.check3.liArchetypeLeaked === false);
assert('no concrete sample sentence is forwarded', r.check3.sampleSentenceLeaked === false);
assert('the craft pass is flagged as an enrichment pass', r.check3.enrichmentFlag === true);
assert('an absent mask yields no mask and no profile — none is invented',
  !r.check3.absent.mask && !r.check3.absent.profile, JSON.stringify(r.check3.absent));

say('');
say('════ WIRING — the corrected wording reaches the real payloads ════');
say(JSON.stringify(r.wiring, null, 1));
const w = r.wiring.picture, c = r.wiring.craft;
assert('picturability: the encounter frame is in the request', w.encounterFrame);
assert('picturability: earlier description does not discharge it', w.notDischarged);
assert('picturability: generic anatomical activity is not enough', w.genericAnatomy);
assert('picturability: no new trait and no checklist is required', w.noChecklist);
assert('picturability: an embodied encounter may still KEEP', w.keepAvailable);
assert('picturability: no forced introductory portrait', w.noPortrait);
assert('picturability: a correction stays narrow and changes no event', w.narrowCorrection);
assert('picturability: the anchored op is offered', w.anchoredOpOffered);
assert('picturability: the replaced scene-wide wording is GONE', w.staleSceneWideWording === false);
assert('picturability: the shirt/cuff case did NOT become a prompt example', w.cuffsInPrompt === false);
assert('craft: the default operation starts from existing prose', c.startFromPage);
assert('craft: the reading is mask-shaped', c.maskShaped);
assert('craft: no opinion is owed after every observation', c.noCompulsoryGloss);
assert('craft: observed-only / observer-only / both is PRESERVED', c.permissionPreserved);
assert('craft: his motive stays her interpretation', c.motiveStaysHers);
assert('craft: replace is withheld, and the reason is stated', c.replaceWithheld);
assert('craft: no replace shape is offered anywhere in the request', c.replaceNotOffered);
assert('craft: the literary bar is explicitly unchanged', c.standardUnchanged);
assert('craft: both additive ops are offered', c.anchoredOpOffered && c.insertAfterOffered);
assert('craft: NO threshold or word-counting wording survives in the prompt',
  c.thresholdWording === false);
assert('craft: the Roman sentence was NOT copied into the prompt', c.romanSentenceCopied === false);

say('');
say('════ CHECK 4 — the destructive P27 replacement cannot pass the boundary ════');
say(JSON.stringify(r.check4, null, 1));
assert('the saved destructive replacement is rejected', r.check4.boundaryOn.applied === 0,
  `applied=${r.check4.boundaryOn.applied}`);
assert('the rejection names the operation, not a measurement of the text',
  r.check4.boundaryOn.rejected.some((x) => x.code === 'replace_unavailable_in_enrichment'),
  JSON.stringify(r.check4.boundaryOn.rejected));
assert('and it names the two ops that can do the work',
  r.check4.boundaryOn.rejected.some((x) => Array.isArray(x.ops)
    && x.ops.includes('insert_at_anchor') && x.ops.includes('insert_after')),
  JSON.stringify(r.check4.boundaryOn.rejected));

say('');
say('════ CHECK 4b — an action-changing SHORT replacement cannot bypass the boundary ════');
say(JSON.stringify(r.check4b, null, 1));
assert('the swap really does remove the action', r.check4b.stayedRemoved === true);
assert('and it is small — the withdrawn threshold would not have seen it',
  Math.abs(r.check4b.swapIsSmall) < 30, `lengthDelta=${r.check4b.swapIsSmall}`);
assert('it is refused anyway', r.check4b.applied === 0, JSON.stringify(r.check4b.rejected));
assert('refused for the operation, not for how much it dropped',
  r.check4b.rejected.some((x) => x.code === 'replace_unavailable_in_enrichment'));
assert('and the op rule is the ONLY thing refusing it — nothing measures the text',
  r.check4b.acceptedWithoutTheRule === 1, `applied without the rule=${r.check4b.acceptedWithoutTheRule}`);
assert('the SAME edit is accepted with the boundary off — the boundary is what bites',
  r.check4.boundaryOff.applied === 1, JSON.stringify(r.check4.boundaryOff));

say('');
say('════ CHECK 5 — an anchored addition preserves every original action ════');
say(JSON.stringify(r.check5, null, 1));
assert('the anchored addition is accepted', r.check5.applied === 1,
  JSON.stringify(r.check5.rejected));
assert('the byte check passes', r.check5.bytes === true);
assert('the addition is in the finished scene', r.check5.addedPresent === true);
assert('EVERY original action survives', r.check5.actionsSurviving.every((x) => x.kept),
  JSON.stringify(r.check5.actionsSurviving.filter((x) => !x.kept)));
assert('the scene grows by exactly the addition',
  r.check5.delta === 'The years of not watching had taught me exactly how long he could bear being seen.'.length + 1,
  `delta=${r.check5.delta}`);
assert('no paragraph is added or lost',
  r.check5.paragraphCount === r.check5.sceneParagraphCount,
  `${r.check5.paragraphCount} vs ${r.check5.sceneParagraphCount}`);
assert('an anchor the paragraph does not contain is rejected',
  r.check5.anchorAbsent.includes('anchor_not_unique_in_paragraph'));
assert('a missing anchor is rejected',
  r.check5.anchorMissing.includes('anchor_not_unique_in_paragraph'));
assert('an ambiguous anchor is rejected, with the count',
  r.check5.anchorAmbiguous.some((x) => x.code === 'anchor_not_unique_in_paragraph' && x.n > 1),
  JSON.stringify(r.check5.anchorAmbiguous));

say('');
say(`PASS ${pass} / FAIL ${fail}`);
fs.writeFileSync(OUT, lines.join('\n') + '\n');
say('written: ' + OUT);
process.exit(fail ? 1 : 0);
