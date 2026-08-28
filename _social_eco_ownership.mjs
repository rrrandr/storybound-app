// SOCIAL ECOSYSTEM OWNERSHIP — free, no model calls.
//
// The defect: `_socialEcosystem` was memoized on state and cleared NOWHERE — two references in
// the whole file, neither a reset — so a second story in the same session inherited the FIRST
// story's recurring circle. Harmless-looking while a "member" is a role noun crossed with a
// function; not harmless at all once these slots mint canonical character identities, because
// the relationship ledger re-validates storyId on every read and would discard its own entities
// while this cache kept handing out the stale slots that minted them.
//
// usage: node _social_eco_ownership.mjs   (needs vercel dev on :3000)
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

console.log(`\n${'═'.repeat(88)}\nSOCIAL ECOSYSTEM — one story's circle may never become another's\n${'═'.repeat(88)}\n`);

const browser = await chromium.launch({ headless: true });
let _closing = false;
const closeBrowser = async () => { if (_closing) return; _closing = true; try { await browser.close(); } catch (_) {} };
process.on('uncaughtException', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('unhandledRejection', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('exit', () => { try { browser.close(); } catch (_) {} });

const ctx = await browser.newContext();
try {
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000); page.setDefaultNavigationTimeout(120000);
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
  // Every call is ANSWERED rather than aborted: an aborted request stalls handleBeginStory long
  // before it reaches the definitions we need. The content is irrelevant here — this suite makes
  // no claim about story output, only about who owns the social circle — but the ENVELOPE shape
  // must be one the real proxy can produce, or the client discards it and stalls anyway.
  await page.route('**/api/**', async route => {
    const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (PASSTHROUGH.test(url)) return route.continue();
    let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
    const out = JSON.stringify({ ok: true });
    const envelope = /mistral-proxy/.test(url)
      ? { id:'mock', object:'chat.completion', model: b && b.model, usage:{}, _orchestration:{},
          choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content: out } }] }
      : { ok:true, content: out, choices:[{ message:{ content: out } }] };
    return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(envelope) });
  });
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  // ── WHY A STORY MUST BE STARTED FIRST (2026-08-28) ──
  // _resolveSocialEcosystem, _ALLY_FUNCTIONS and _socialEcoRecord are all defined INSIDE
  // handleBeginStory() — no scope closes between its declaration and theirs — so on a bare page
  // load none of them exist. We do not need the story to SUCCEED, only for execution to reach
  // their definitions, so the run is raced against a timeout and every API call is refused.
  // (This is also why the ownership stamp is safe by construction: the module cannot be defined,
  // let alone resolve a circle, before _resetStoryState has minted a storyId.)
  await page.waitForFunction(() => typeof window.handleBeginStory === 'function', { timeout:60000 });
  await page.evaluate(() => {
    const s = window.state;
    Object.assign(s, { world:'modern', worldSubtype:'city', flavor:'slow_burn', dynamic:'friends_to_lovers',
      name:'Ava', playerName:'Ava', loveInterestName:'Ben', partnerName:'Ben', loveInterest:'Male',
      liGender:'male', playerMask:'OPEN_VEIN', storyLength:'epic', tier:'epic', access:'sub',
      subscribed:true, fortunes:9999999, intensity:'Steamy', pov:'first_person',
      identity:{ playerName:'Ava', partnerName:'Ben' }, renderMode:'literary', myUid:'probe' });
    s.picks = s.picks || {}; s.picks.identity = s.identity; s._skipCorridorValidation = true;
    try { window.handleBeginStory(); } catch (_) {}
  });
  await page.waitForFunction(() => typeof window._resolveSocialEcosystem === 'function'
    && typeof window._socialEcoRecord === 'function', { timeout:120000 });

  const R = await page.evaluate(() => {
    const s = window.state;
    const base = { storyLength: 'epic', tier: 'epic', archetype: { primary: 'OPEN_VEIN' } };
    const sig = m => (m || []).map(x => x.role + '→' + x.fnKey).join(' | ');
    const out = {};

    // ── A: a story resolves its circle and it is stamped with that story's id ──
    Object.assign(s, base, { storyId: 'story-A', _socialEcosystem: null, _allyFunctionPick: null });
    out.aMembers = sig(window._resolveSocialEcosystem(s));
    out.aRecord  = window._socialEcoRecord(s);
    // stable WITHIN one story — the memo must still memoize
    out.aAgain   = sig(window._resolveSocialEcosystem(s));

    // ── B: a different story must NOT inherit it ──
    s.storyId = 'story-B';
    out.bMembers = sig(window._resolveSocialEcosystem(s));
    out.bRecordStory = (window._socialEcoRecord(s) || {}).storyId;

    // ── save/restore, MATCHING stamp: the circle survives ──
    const savedB = JSON.parse(JSON.stringify(window._socialEcoRecord(s)));
    s._socialEcosystem = savedB; s._allyFunctionPick = null;
    out.bRestored = sig(window._resolveSocialEcosystem(s));

    // ── save/restore, MISMATCHED stamp: discarded ──
    s._socialEcosystem = JSON.parse(JSON.stringify(savedB));
    s._socialEcosystem.storyId = 'story-Z';
    out.mismatched = sig(window._resolveSocialEcosystem(s));
    out.mismatchedStory = (window._socialEcoRecord(s) || {}).storyId;

    // ── legacy UNSTAMPED value (a bare array, as it used to be stored) ──
    s._socialEcosystem = [{ role: 'a ghost from the last story', fnKey: 'BRAKE', fn: { key:'BRAKE', label:'', effect:'', moves:[] } }];
    out.legacy = sig(window._resolveSocialEcosystem(s));
    out.legacyRecordIsStamped = !!(window._socialEcoRecord(s) || {}).v;

    // ── NO storyId: mutate nothing, mint nothing ──
    s.storyId = ''; s._socialEcosystem = null; s._allyFunctionPick = null;
    out.noStory = window._resolveSocialEcosystem(s);
    out.noStoryRecord = window._socialEcoRecord(s);
    out.noStoryPick = s._allyFunctionPick;

    // ── A → B → A: returning to A legitimately rebuilds, and B never kept A's slots ──
    s.storyId = 'story-A'; s._socialEcosystem = null; s._allyFunctionPick = null;
    out.aReturn = sig(window._resolveSocialEcosystem(s));
    out.aReturnStory = (window._socialEcoRecord(s) || {}).storyId;
    out.aReturnCount = (window._socialEcoRecord(s) || {}).slots.length;

    // ── the derived pick never outlives its circle ──
    s.storyId = 'story-A'; s._socialEcosystem = null; s._allyFunctionPick = null;
    window._resolveAllyFunction(s);
    const pickA = s._allyFunctionPick;
    s.storyId = 'story-C';
    window._resolveSocialEcosystem(s);          // discards A's circle
    out.pickClearedOnDiscard = s._allyFunctionPick === null || s._allyFunctionPick === undefined;
    out.pickA = pickA;

    // ══════════════════════════════════════════════════════════════════════════════
    // CANONICAL IDENTITY (step 1)
    // ══════════════════════════════════════════════════════════════════════════════
    Object.assign(s, base, { storyId: 'story-ID1', _socialEcosystem: null, _allyFunctionPick: null,
                             _relationshipLedger: null });
    const slots1 = window._resolveSocialEcosystem(s);
    out.slotIds = slots1.map(x => x.slotId);
    // A slot kind is either a KNOWN vocabulary entry or NULL. Null is not a failure — it is the
    // fail-closed state for a phrase nobody has mapped, and it must never be a known kind chosen
    // as a fallback. Real circles contain both: "a colleague" maps, "a member of his staff the
    // PC befriends" does not.
    out.slotKinds = slots1.map(x => x.slotKind);
    out.slotKindsAreNotEdgeTypes = slots1.every(x =>
      x.slotKind === null ? x.slotKindUnresolved === true
                          : window._relSocialSlotKinds().indexOf(x.slotKind) !== -1);
    out.unresolvedKeepPhrase = slots1.filter(x => x.slotKind === null)
      .every(x => typeof x.rolePhrase === 'string' && x.rolePhrase.length > 0);
    out.notMaterialisedOnResolve = slots1.every(x => x.entityId === null);
    // stable across a save/restore of the stamped record
    const savedSlots = JSON.parse(JSON.stringify(window._socialEcoRecord(s)));
    s._socialEcosystem = savedSlots;
    out.slotIdsAfterRestore = (window._resolveSocialEcosystem(s) || []).map(x => x.slotId);

    // materialisation is lazy, idempotent, backend-owned
    const first = slots1[0].slotId;
    out.entA = window._materializeSocialSlot(first);
    out.entB = window._materializeSocialSlot(first);         // retry → same person
    const L1 = window._relLedger();
    out.entRec = L1 && JSON.parse(JSON.stringify(L1.entities[out.entA] || null));
    out.entityCount = L1 ? Object.keys(L1.entities).length : 0;

    // two slots of the SAME kind are two people
    Object.assign(s, base, { storyId: 'story-ID2', _socialEcosystem: null, _allyFunctionPick: null,
                             _relationshipLedger: null });
    const e1 = window._relSocialSlotEntity('pc', 'close_friend', { ord: 1 });
    const e2 = window._relSocialSlotEntity('pc', 'close_friend', { ord: 2 });
    const e1again = window._relSocialSlotEntity('pc', 'close_friend', { ord: 1 });
    out.twoFriends = [e1, e2, e1again];

    // an edge-free node is legitimate: identity does not imply a relationship
    const L2 = window._relLedger();
    out.edgeCountAfterSlots = L2 ? Object.keys(L2.edges).length : -1;

    // reconciliation: naming it later keeps the SAME identity
    out.named = window._relNameSlot(e1, 'Nadia', { sceneUid: 'scene-3' });
    out.nameKeptIdentity = out.named === e1;
    out.namedLabel = (window._relLedger().entities[e1] || {}).label;
    // a SECOND person with that same name must not merge into the first
    out.ambiguous = window._relNameSlot(e2, 'Nadia');

    // projections: the person may be known; the planning profile may not
    window._relLedger().entities[e1].authorProfile.cPlusFacets =
      [{ facet_id: 'x_secret_truth', canonical_truth: 'SECRET PLANNING TRUTH' }];
    out.projAuthor = window._relProjectEntity(e1, 'author');
    out.projPc     = window._relProjectEntity(e1, 'pc');
    out.projLi     = window._relProjectEntity(e1, 'li');
    out.projEdges  = { pc: window._relProject('pc'), li: window._relProject('li') };

    // ── UNKNOWN ROLE PHRASE FAILS CLOSED ──
    out.canonKnown   = window._relSocialSlotCanonFor('a close friend');
    out.canonUnknown = window._relSocialSlotCanonFor('a spectral notary of the seventh house');
    out.mintedUnknown = window._relSocialSlotEntity('pc', 'a spectral notary of the seventh house', { ord: 1 });
    // a slot whose phrase maps to nothing keeps its id and mints nobody
    window._resolveSocialEcosystem(s);          // story-ID2 has no circle yet
    const eco = window._socialEcoRecord(s);
    eco.slots.push({ role: 'a spectral notary of the seventh house', fnKey: 'BRAKE',
                     fn: { key:'BRAKE', label:'', effect:'', moves:[] },
                     rolePhrase: 'a spectral notary of the seventh house',
                     slotKind: null, slotKindUnresolved: true,
                     slotOrd: 1, slotId: 'a_spectral_notary_of_the_seventh_house#1', entityId: null });
    out.matUnresolved = window._materializeSocialSlot('a_spectral_notary_of_the_seventh_house#1');
    out.unresolvedKeptPhrase = eco.slots[eco.slots.length - 1].rolePhrase;
    out.entityCountAfterUnresolved = Object.keys(window._relLedger().entities).length;

    // ── ALIASES ARE AUDIENCE-SCOPED ──
    // e1 is 'Nadia' publicly. Give her a COVER identity nobody has learned, and one alias the
    // PC has actually heard. Only the latter may appear in her view.
    window._relLedger().entities[e1].aliases =
      (window._relLedger().entities[e1].aliases || []).concat(['the auditor', 'nadia vail']);
    window._relDiscloseAlias(e1, 'Nads', 'pc');
    window._relDiscloseAlias(e1, 'Nadia', 'pc');   // the PC has now been told her actual name
    out.aliasProjPc     = window._relProjectEntity(e1, 'pc');
    out.aliasProjLi     = window._relProjectEntity(e1, 'li');
    out.aliasProjAuthor = window._relProjectEntity(e1, 'author');

    // ══════════════════════════════════════════════════════════════════════════════
    // IDENTITY MUST NOT DEPEND ON MATERIALISATION ORDER
    // Two slots materialised in opposite orders in two otherwise identical stories. If the id
    // were numbered at materialisation time the two people would SWAP, and every fact recorded
    // about one would silently transfer to the other.
    // ══════════════════════════════════════════════════════════════════════════════
    const orderRun = (storyId, reverse) => {
      Object.assign(s, base, { storyId, _socialEcosystem: null, _allyFunctionPick: null,
                               _relationshipLedger: null });
      const sl = window._resolveSocialEcosystem(s).filter(x => x.slotKind).map(x => x.slotId);
      const order = reverse ? sl.slice().reverse() : sl.slice();
      const map = {};
      order.forEach(id => { map[id] = window._materializeSocialSlot(id); });
      return map;
    };
    out.orderFwd = orderRun('story-ORD-A', false);
    out.orderRev = orderRun('story-ORD-B', true);

    // no storyId → materialise nothing
    s.storyId = '';
    out.matNoStory = window._materializeSocialSlot(first);

    // ── the reset layer reaches it ──
    Object.assign(s, base, { storyId: 'story-D' });
    window._resolveSocialEcosystem(s);
    const beforeReset = !!window._socialEcoRecord(s);
    let reachable = null;
    try { reachable = /state\._socialEcosystem = null/.test(String(window.__resetSrcProbe || '')); } catch (_) {}
    out.beforeReset = beforeReset;
    return out;
  });

  console.log(' 1 · OWNERSHIP');
  t('1a: a story resolves a circle and it is stamped with that story id',
    !!R.aMembers && (R.aRecord || {}).storyId === 'story-A' && (R.aRecord || {}).v === 1,
    JSON.stringify({ members: R.aMembers, rec: R.aRecord && { v: R.aRecord.v, storyId: R.aRecord.storyId } }));
  t('1b: …and it still MEMOIZES within that story — role/function selection is unchanged',
    R.aAgain === R.aMembers, JSON.stringify([R.aMembers, R.aAgain]));

  console.log('\n 2 · THE DEFECT ITSELF');
  t('2a: STORY A\'S CIRCLE DOES NOT ENTER STORY B', R.bMembers !== R.aMembers,
    JSON.stringify({ A: R.aMembers, B: R.bMembers }));
  t('2b: …and B\'s record is stamped to B, not carried from A',
    R.bRecordStory === 'story-B', String(R.bRecordStory));

  console.log('\n 3 · SAVE / RESTORE');
  t('3a: a restored circle whose stamp MATCHES survives intact',
    R.bRestored === R.bMembers, JSON.stringify([R.bMembers, R.bRestored]));
  t('3b: a restored circle stamped to ANOTHER story is discarded and rebuilt',
    R.mismatchedStory === 'story-B' && R.mismatched !== '', JSON.stringify(R.mismatchedStory));
  t('3c: an UNSTAMPED legacy value is discarded once and replaced by a stamped record',
    !/ghost from the last story/.test(R.legacy) && R.legacyRecordIsStamped, JSON.stringify(R.legacy));

  console.log('\n 4 · FAIL CLOSED');
  t('4a: with NO storyId the resolver returns nothing',
    Array.isArray(R.noStory) && R.noStory.length === 0, JSON.stringify(R.noStory));
  t('4b: …and mutates nothing — no record minted, no pick minted',
    !R.noStoryRecord && !R.noStoryPick,
    JSON.stringify({ rec: R.noStoryRecord, pick: R.noStoryPick }));

  console.log('\n 5 · A → B → A');
  t('5a: returning to story A rebuilds under A\'s own ownership',
    R.aReturnStory === 'story-A', String(R.aReturnStory));
  t('5b: …with no duplicate slots — one circle, not two concatenated',
    R.aReturnCount >= 2 && R.aReturnCount <= 4, String(R.aReturnCount));

  console.log('\n 6 · THE DERIVED PICK NEVER OUTLIVES ITS CIRCLE');
  t('6a: _allyFunctionPick is cleared when the circle it came from is discarded',
    R.pickClearedOnDiscard, JSON.stringify({ pickA: R.pickA }));

  console.log('\n 7 · THE RESET LAYER REACHES IT');
  t('7a: the per-story reset clears the ecosystem AND its derived pick',
    /state\._socialEcosystem = null/.test(SRC) && /state\._allyFunctionPick = null/.test(SRC),
    'both must be reset in _resetStoryState, beside _sceneEntityState');
  t('7b: …in the SAME layer as the roster that carries the identical defect',
    (() => {
      const i = SRC.indexOf('state._sceneEntityState = {}');
      const j = SRC.indexOf('state._socialEcosystem = null');
      return i > 0 && j > i && (j - i) < 1200;
    })(), 'the ecosystem reset must sit with the per-story narrative memory it belongs to');
  console.log('\n 8 · CANONICAL IDENTITY — SLOTS');
  t('8a: every slot carries a stable backend-owned id (kind#ordinal)',
    R.slotIds.length >= 2 && R.slotIds.every(x => /^[a-z_]+#\d+$/.test(x)), JSON.stringify(R.slotIds));
  t('8b: every slot kind is a KNOWN vocabulary entry or explicitly UNRESOLVED — never a fallback',
    R.slotKindsAreNotEdgeTypes, JSON.stringify([R.slotIds, R.slotKinds]));
  t('8b2: …and an unresolved slot still carries its authored phrase',
    R.unresolvedKeepPhrase, JSON.stringify(R.slotKinds));
  t('8c: resolving the circle materialises NOBODY — instantiation is lazy',
    R.notMaterialisedOnResolve, JSON.stringify(R.slotIds));
  t('8d: slot ids are identical across save/restore',
    JSON.stringify(R.slotIds) === JSON.stringify(R.slotIdsAfterRestore),
    JSON.stringify([R.slotIds, R.slotIdsAfterRestore]));

  console.log('\n 9 · MATERIALISATION');
  t('9a: a slot materialises into a canonical entity id', !!R.entA && /^role:pc:/.test(R.entA), String(R.entA));
  t('9b: materialising twice returns the SAME person — a retry creates nobody new',
    R.entA === R.entB && R.entityCount <= 3, JSON.stringify({ a: R.entA, b: R.entB, n: R.entityCount }));
  t('9c: the record carries slot provenance and a PRIVATE authorProfile compartment',
    !!R.entRec && R.entRec.kind === 'social_slot' && !!R.entRec.slotId
      && !!R.entRec.authorProfile && R.entRec.authorProfile.provenance === 'social_slot',
    JSON.stringify(R.entRec));
  t('9d: two slots of the same KIND are two different people, and asking again returns the first',
    R.twoFriends[0] !== R.twoFriends[1] && R.twoFriends[0] === R.twoFriends[2],
    JSON.stringify(R.twoFriends));
  t('9e: identity does NOT imply a relationship — the nodes are edge-free',
    R.edgeCountAfterSlots === 0, String(R.edgeCountAfterSlots));
  t('9f: with no storyId, materialisation creates nothing', R.matNoStory === null, String(R.matNoStory));

  console.log('\n 10 · RECONCILIATION');
  t('10a: naming a slot later keeps the SAME canonical id',
    R.nameKeptIdentity && R.namedLabel === 'Nadia', JSON.stringify([R.named, R.namedLabel]));
  t('10b: a SECOND person with the same name FAILS CLOSED rather than merging',
    R.ambiguous === null, String(R.ambiguous));

  console.log('\n 11 · UNKNOWN ROLES FAIL CLOSED');
  t('11a: a mapped phrase still resolves', R.canonKnown === 'close_friend', String(R.canonKnown));
  t('11b: an UNMAPPED phrase resolves to NOTHING — not to acquaintance, not to any known kind',
    R.canonUnknown === null, String(R.canonUnknown));
  t('11c: …and mints no entity through the slot API', R.mintedUnknown === null, String(R.mintedUnknown));
  t('11d: …nor through materialisation, which refuses an unclassified slot',
    R.matUnresolved === null, String(R.matUnresolved));
  t('11e: the authored phrase is PRESERVED for diagnosis rather than discarded',
    R.unresolvedKeptPhrase === 'a spectral notary of the seventh house', String(R.unresolvedKeptPhrase));

  console.log('\n 12 · ALIASES ARE NOT UNIVERSALLY PUBLIC');
  t('12a: a name the PC HAS been told is what she sees',
    R.aliasProjPc && R.aliasProjPc.display === 'Nadia', JSON.stringify(R.aliasProjPc));
  t('12b: a COVER identity stored for matching never reaches the PC or LI',
    !/the auditor|nadia vail/i.test(JSON.stringify([R.aliasProjPc, R.aliasProjLi])),
    JSON.stringify([R.aliasProjPc, R.aliasProjLi]));
  t('12c: only an alias this audience has been told appears in that audience\'s view',
    (R.aliasProjPc.aliases || []).indexOf('Nads') !== -1
      && (R.aliasProjLi.aliases || []).indexOf('Nads') === -1,
    JSON.stringify({ pc: R.aliasProjPc.aliases, li: R.aliasProjLi.aliases }));
  t('12d: the AUTHOR still sees the full matching index',
    /the auditor/.test(JSON.stringify(R.aliasProjAuthor)), JSON.stringify(R.aliasProjAuthor && R.aliasProjAuthor.aliases));

  console.log('\n 12b · IDENTITY IS ORDER-INDEPENDENT');
  t('12e: the same slot yields the same canonical id whichever order it materialises in',
    Object.keys(R.orderFwd).length >= 2
      && Object.keys(R.orderFwd).every(k => R.orderFwd[k] && R.orderFwd[k] === R.orderRev[k]),
    JSON.stringify([R.orderFwd, R.orderRev]));
  t('12f: …and the id derives from the stable SLOT id, not from an arrival ordinal',
    Object.values(R.orderFwd).every(v => /^role:pc:social:/.test(String(v))),
    JSON.stringify(Object.values(R.orderFwd)));

  console.log('\n 13 · EPISTEMIC SEPARATION');
  const priv = JSON.stringify([R.projPc, R.projLi, R.projEdges]);
  t('13a: an UNDISCLOSED true name is withheld from the PC entirely',
    !!R.projPc && R.projPc.display === null && R.projPc.authorProfile === undefined, JSON.stringify(R.projPc));
  t('13a2: …and no semantic id, kind, slot kind or role-instance metadata is serialised',
    !/role:pc|social_slot|close_friend|slotId|slotKind|roleInstanceId/.test(JSON.stringify([R.projPc, R.projLi])),
    JSON.stringify([R.projPc, R.projLi]));
  t('13b: no C+ facet, provenance, narrative function or slot metadata reaches PC/LI views',
    !/SECRET PLANNING TRUTH|x_secret_truth|cPlusFacets|authorProfile|narrativeFunction|provenance|slotId|slotKind|namedAtSceneUid/.test(priv),
    priv.slice(0, 240));
  t('13c: …while the AUTHOR view still has everything it needs to plan',
    !!R.projAuthor && !!R.projAuthor.authorProfile
      && R.projAuthor.authorProfile.cPlusFacets[0].facet_id === 'x_secret_truth',
    JSON.stringify(R.projAuthor && R.projAuthor.authorProfile));
} finally { await ctx.close().catch(() => {}); }

console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
await closeBrowser();
process.exit(fail ? 1 : 0);
