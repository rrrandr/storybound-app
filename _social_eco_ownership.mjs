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

// ── INFRASTRUCTURE PREFLIGHT (2026-08-28) ──
// A hung `vercel dev` still LISTENS on :3000 while answering nothing, and every case in this
// suite then spends its full page timeout before failing. One run burned 180s and reported a
// timeout that looked like a code regression; it was an eleven-hour-old server process. Ask the
// server one question BEFORE launching Chromium, and abort with an infrastructure message rather
// than browsers against a dead port.
async function preflight(url = 'http://localhost:3000/') {
  const started = Date.now();
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(url, { signal: ctl.signal });
    clearTimeout(timer);
    const body = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!/<\s*script|<\s*html/i.test(body)) throw new Error('response is not the app shell');
    console.log(`  ⚙ preflight ok — ${url} responded ${res.status} in ${Date.now() - started}ms\n`);
  } catch (e) {
    console.error(`\n  ✗ INFRASTRUCTURE: ${url} is not serving the app (${e.message}).`);
    console.error('    Start it with:  npx vercel dev --listen 3000');
    console.error('    If it is already "running", it may be hung while still holding the port —');
    console.error('    check with:  lsof -nP -iTCP:3000   and kill that PID directly.\n');
    process.exit(2);
  }
}
await preflight();

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
    // Three legitimate states now: a social kind, a KINSHIP route (kind null, kinshipSlot set),
    // or explicitly unresolved. What must never happen is a known kind chosen as a fallback.
    out.slotKindsAreNotEdgeTypes = slots1.every(x =>
      x.slotKind ? window._relSocialSlotKinds().indexOf(x.slotKind) !== -1
                 : (!!x.kinshipSlot || x.slotKindUnresolved === true));
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

    // ══════════════════════════════════════════════════════════════════════════════
    // THE VOCABULARY MUST COVER THE ROLES THE PRODUCT ACTUALLY DECLARES
    // Accepting "unresolved" without a floor is how a 38%-coverage mapper passed green: fantasy
    // 1/7, historical 1/7, dystopia 1/6. Fail-closed is only a virtue when the closed cases are
    // rare and named — otherwise it is just a system that cannot identify its own cast.
    // ══════════════════════════════════════════════════════════════════════════════
    // ROUTING IS NOT MATERIALISING. "65/65 routed" was true and still hid a phrase that routed
    // to a kinship slot the ledger does not have, so it resolved cleanly and then produced
    // nobody. Every phrase is now driven ALL THE WAY to an entity id.
    out.poolCoverage = {};
    out.materialiseMatrix = {};
    Object.keys(window._SOCIAL_ROLE_POOLS).forEach(k => {
      const pool = window._SOCIAL_ROLE_POOLS[k];
      out.poolCoverage[k] = { total: pool.length,
        unrouted: pool.filter(x => !window._relRolePhraseRoute(x)) };
      const failed = [];
      pool.forEach((phrase, i) => {
        Object.assign(s, base, { storyId: 'mx-' + k + '-' + i, _socialEcosystem: null,
                                 _allyFunctionPick: null, _relationshipLedger: null });
        // one synthetic slot carrying exactly this phrase, through the real resolution path
        const route = window._relRolePhraseRoute(phrase);
        const slug = phrase.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        window._resolveSocialEcosystem(s);
        window._socialEcoRecord(s).slots.push({
          role: phrase, fnKey: 'LOYALIST', fn: { key:'LOYALIST', label:'', effect:'', moves:[] },
          rolePhrase: phrase, provenance: 'social_slot',
          kinshipSlot: route && route.route === 'kinship' ? route.slot : null,
          slotKind: route && route.route === 'social' ? route.kind : null,
          slotKindUnresolved: !route, slotOrd: 1, slotId: slug + '#1', entityId: null });
        const id = window._materializeSocialSlot(slug + '#1');
        const ent = id ? window._relLedger().entities[id] : null;
        if (!id || !ent || !ent.authorProfile || !Array.isArray(ent.authorProfile.cPlusFacets)) {
          failed.push(phrase + ' → ' + (id ? 'no authorProfile' : 'no entity'));
        }
      });
      out.materialiseMatrix[k] = failed;
    });
    // kinship goes down the kinship path, never a social kind
    out.kinshipRoute = window._relRolePhraseRoute('a sibling');
    out.socialRoute  = window._relRolePhraseRoute('a close friend');
    out.bondSisterIsNotSibling = window._relRolePhraseRoute('a bond-sister / bondmate');

    // ── A CACHED ENTITY ID THAT THE LEDGER NO LONGER CONTAINS ──
    // The ecosystem and the ledger have different lifetimes: a restore can bring one back and
    // reject the other. A cached id must be verified, not trusted.
    const danglingSlot = window._resolveSocialEcosystem(s).filter(x => x.slotKind)[0];
    const realId = window._materializeSocialSlot(danglingSlot.slotId);
    delete window._relLedger().entities[realId];          // ledger loses the person
    out.danglingRecreated = window._materializeSocialSlot(danglingSlot.slotId);
    out.danglingSameId = out.danglingRecreated === realId;
    out.danglingInLedger = !!(window._relLedger().entities[out.danglingRecreated]);
    // a cached id pointing at an entity belonging to a DIFFERENT slot fails closed
    danglingSlot.entityId = 'role:pc:social:some_other_slot_1';
    window._relLedger().entities['role:pc:social:some_other_slot_1'] =
      { id:'role:pc:social:some_other_slot_1', kind:'social_slot', slotId:'some_other_slot#1', label:'x', aliases:[] };
    out.mismatchRefused = window._materializeSocialSlot(danglingSlot.slotId);

    // ── A LIVE SUPERSESSION TARGET IS NOT AUTOMATICALLY THE RIGHT ONE ──
    // A corrupted supersededBy can point at any live person. Following it blindly hands this
    // slot somebody else's identity AND their portfolio, so the target must be able to show it
    // came from this source.
    Object.assign(s, base, { storyId: 'mt-1', _socialEcosystem: null, _allyFunctionPick: null,
                             _relationshipLedger: null });
    const mtSlot = window._resolveSocialEcosystem(s).filter(x => x.slotKind)[0];
    const mtReal = window._materializeSocialSlot(mtSlot.slotId);
    const ML = window._relLedger();
    ML.entities['ent:unrelated_person'] =
      { id: 'ent:unrelated_person', kind: 'named', label: 'Someone Else', aliases: ['someone else'] };
    ML.entities[mtReal].supersededBy = 'ent:unrelated_person';    // corrupted pointer
    out.mtCachedBefore = mtSlot.entityId;
    out.mtResult = window._materializeSocialSlot(mtSlot.slotId);
    out.mtCachedAfter = mtSlot.entityId;
    // …and a target that DOES claim the source is adopted
    ML.entities['ent:legit_named'] = { id: 'ent:legit_named', kind: 'named', label: 'Legit',
      aliases: ['legit'], wasRole: [{ roleId: mtReal }] };
    ML.entities[mtReal].supersededBy = 'ent:legit_named';
    out.mtLegit = window._materializeSocialSlot(mtSlot.slotId);

    // ── RENAMING IS FOR SLOTS ONLY, AND KINSHIP RECONCILES ──
    out.renameAnchorRefused = window._relNameSlot('pc', 'Impostor');
    Object.assign(s, base, { storyId: 'kin-1', _socialEcosystem: null, _allyFunctionPick: null,
                             _relationshipLedger: null });
    const kinId = window._relRoleEntity('pc', 'father', { label: 'your father' });
    out.kinBefore = kinId;
    out.kinNamed = window._relNameSlot(kinId, 'Lord Maren', { sceneUid: 'kin-scene' });
    const KL = window._relLedger();
    out.kinSuperseded = !!(KL.entities[kinId] && KL.entities[kinId].supersededBy);
    out.kinNamedIsDifferentEntity = out.kinNamed && out.kinNamed !== kinId;
    out.kinNamedLabel = out.kinNamed ? (KL.entities[out.kinNamed] || {}).label : null;

    // ══════════════════════════════════════════════════════════════════════════════
    // THE PORTFOLIO MUST SURVIVE THE IDENTITY LIFECYCLE
    // Creating the compartment is not preserving it. A kinship placeholder can hold facets
    // before anyone names them; reconciliation used to transfer aliases and edges and drop the
    // portfolio on the floor — at exactly the moment the person became worth naming.
    // ══════════════════════════════════════════════════════════════════════════════
    Object.assign(s, base, { storyId: 'pf-1', _socialEcosystem: null, _allyFunctionPick: null,
                             _relationshipLedger: null });
    const fatherId = window._relRoleEntity('pc', 'father', { label: 'your father' });
    window._relEnsureAuthorProfile(window._relLedger().entities[fatherId], 'kinship_slot', 'PROTECTOR');
    window._relLedger().entities[fatherId].authorProfile.cPlusFacets = [
      { facet_id: 'f_pride',   category: 'value',      canonical_truth: 'A' },
      { facet_id: 'f_absence', category: 'history',    canonical_truth: 'B' },
      { facet_id: 'f_debt',    category: 'insecurity', canonical_truth: 'C' }
    ];
    out.pfBefore = JSON.parse(JSON.stringify(window._relLedger().entities[fatherId].authorProfile));
    out.pfNamed = window._relNameSlot(fatherId, 'Lord Maren', { sceneUid: 'pf-scene' });
    const PL = window._relLedger();
    out.pfAfter = out.pfNamed ? JSON.parse(JSON.stringify((PL.entities[out.pfNamed] || {}).authorProfile || null)) : null;
    // …and across a save/restore of the ledger
    const savedLedger = JSON.parse(JSON.stringify(PL));
    s._relationshipLedger = savedLedger;
    out.pfAfterRestore = JSON.parse(JSON.stringify((window._relLedger().entities[out.pfNamed] || {}).authorProfile || null));

    // ── THE COLLISION POLICY, ON A TARGET THAT ACTUALLY OWNS THINGS ──
    // The first version of this test reconciled onto an EMPTY named entity, so it proved the
    // transfer and nothing about the stated conflict rules. Here the named person already has a
    // facet whose id collides but whose truth differs, a unique facet of their own, and their
    // own provenance and narrative function.
    Object.assign(s, base, { storyId: 'pf-2', _socialEcosystem: null, _relationshipLedger: null });
    const roleB = window._relRoleEntity('pc', 'mother', { label: 'your mother' });
    window._relEnsureAuthorProfile(window._relLedger().entities[roleB], 'kinship_slot', 'BRAKE');
    window._relLedger().entities[roleB].authorProfile.cPlusFacets = [
      { facet_id: 'shared_id', canonical_truth: 'ROLE VERSION' },
      { facet_id: 'role_only', canonical_truth: 'ROLE UNIQUE' }
    ];
    const namedB = window._relEntityForName('Isolde Vane', { kind: 'named', create: true });
    window._relEnsureAuthorProfile(window._relLedger().entities[namedB], 'generated_cast', 'TRUTH_TELLER');
    window._relLedger().entities[namedB].authorProfile.cPlusFacets = [
      { facet_id: 'shared_id', canonical_truth: 'NAMED VERSION' },
      { facet_id: 'named_only', canonical_truth: 'NAMED UNIQUE' }
    ];
    out.collideResult = window._relNameSlot(roleB, 'Isolde Vane', { sceneUid: 'pf2-scene' });
    const CB = window._relLedger();
    out.collideProfile = out.collideResult
      ? JSON.parse(JSON.stringify(CB.entities[out.collideResult].authorProfile)) : null;
    // the superseded role must keep its OWN copy — no shared mutable objects
    out.collideRoleFacets = JSON.parse(JSON.stringify((CB.entities[roleB].authorProfile || {}).cPlusFacets || []));
    if (out.collideResult) {
      const live = CB.entities[out.collideResult].authorProfile.cPlusFacets
        .filter(f => f.facet_id === 'role_only')[0];
      if (live) live.canonical_truth = 'MUTATED AFTER TRANSFER';
    }
    out.collideRoleAfterMutation = JSON.parse(JSON.stringify(
      (CB.entities[roleB].authorProfile || {}).cPlusFacets || []));

    // ══════════════════════════════════════════════════════════════════════════════
    // BARE-NAME RESOLUTION: ONE RULE, EVERY CALLER, CANON INCLUDED
    // Excluding canonical entities from name lookup protected against hijacking and created a
    // worse bug — an unnamed role later identified as a known canon character could not SEE
    // them, and minted a duplicate. Uniqueness is the protection, not invisibility.
    // ══════════════════════════════════════════════════════════════════════════════
    Object.assign(s, base, { storyId: 'nm-1', _relationshipLedger: null });
    const canonPhoebe = window._relEntityForName('Phoebe', { kind: 'named', create: true, canonicalId: 'ff:7' });
    window._relEnsureAuthorProfile(window._relLedger().entities[canonPhoebe], 'ff_cast', 'LOYALIST');
    window._relLedger().entities[canonPhoebe].authorProfile.cPlusFacets =
      [{ facet_id: 'ph_1', canonical_truth: 'PHOEBE TRUTH' }];
    out.uniqueCanonByName = window._relMatchByName('Phoebe', {});
    // a kinship placeholder reconciled to that unique canon character must REUSE her
    const sisterRole = window._relRoleEntity('pc', 'sister', { label: 'your sister' });
    out.reconToCanon = window._relNameSlot(sisterRole, 'Phoebe', { sceneUid: 'nm-scene' });
    out.reconReusedCanon = out.reconToCanon === canonPhoebe;
    out.reconKeptPortfolio = out.reconToCanon
      ? ((window._relLedger().entities[out.reconToCanon].authorProfile || {}).cPlusFacets || [])
          .some(f => f.facet_id === 'ph_1') : false;
    out.entityCountAfterRecon = Object.keys(window._relLedger().entities).length;

    // generic Robin + canonical Robin → bare name resolves to NOTHING
    Object.assign(s, base, { storyId: 'nm-2', _relationshipLedger: null });
    window._relEntityForName('Robin', { kind: 'named', create: true });                       // generic
    window._relEntityForName('Robin', { kind: 'named', create: true, canonicalId: 'ff:9' });  // canon
    out.twoRobins = window._relMatchByName('Robin', {});
    out.twoRobinsResolve = window._relEntityForName('Robin', { kind: 'named', create: false });
    // …and prose-driven relationship extraction must assert NOTHING under that ambiguity
    out.edgesBefore = Object.keys(window._relLedger().edges).length;
    out.ingest = (typeof window._relIngestRelations === 'function')
      ? window._relIngestRelations([{ from: 'Robin', to: 'Ava', relationship: 'ally_of',
                                      basis: 'asserted_on_page', quote: 'Robin is my ally, said Ava.' }],
                                   { sceneUid: 'nm2-scene', prose: 'Robin is my ally, said Ava.' })
      : 'NO INGEST FN';
    out.edgesAfter = Object.keys(window._relLedger().edges).length;

    // ── AMBIGUITY MUST FAIL CLOSED, NOT PICK THE FIRST MATCH ──
    Object.assign(s, base, { storyId: 'amb-1', _socialEcosystem: null, _relationshipLedger: null });
    const a1 = window._relEntityForName('Ash', { kind: 'named', create: true });
    window._relLedger().entities['ent:ash_two'] =
      { id: 'ent:ash_two', kind: 'named', label: 'Ash', aliases: ['ash'] };
    out.ambFirst = a1;
    out.ambNow = window._relEntityForName('Ash', { kind: 'named', create: true });  // two live matches
    out.ambNoCreate = window._relEntityForName('Nobody Here At All', { create: false });
    out.ambDefaultNoCreate = window._relEntityForName('Also Nobody At All', {});     // {} must NOT mint

    // ══════════════════════════════════════════════════════════════════════════════
    // FAMOUS FATE — a SEPARATE population from the 65 role-pool phrases
    // Its members are named canon characters, not role phrases; the matrix above says nothing
    // about them and must not be described as if it did.
    // ══════════════════════════════════════════════════════════════════════════════
    // PRODUCTION SHAPE: the real castShape has no id, castId or canonicalId. Fixtures that
    // supply one test a data shape production does not have, which is how "cast id owns
    // identity" was claimed while production was still keying on array position.
    const ffRun = (castRecs, storyId) => {
      const contract = { character: { canonicalName: 'Ava' },
                         loveInterest: { canonicalName: 'Ben' }, cast: castRecs };
      window._ffStampCastIds(contract);          // exactly what the contract boundary does
      Object.assign(s, base, { storyId, _socialEcosystem: null, _allyFunctionPick: null,
                               _relationshipLedger: null, fateMode: 'famous_fate',
                               ffContract: contract });
      const slots = window._resolveSocialEcosystem(s);
      const out2 = { slots: slots.map(x => ({ role: x.role, prov: x.provenance,
                        hasRec: !!x.castRecord, unresolved: x.slotKindUnresolved })) };
      out2.ids = slots.map(x => window._materializeSocialSlot(x.slotId));
      out2.entities = out2.ids.map(id => id ? window._relLedger().entities[id] : null);
      return out2;
    };
    out.ff = ffRun([{ name: 'Phoebe', canonicalName: 'Phoebe Buffay', aliases: ['Pheebs'] },
                    { name: 'Joey',   canonicalName: 'Joey Tribbiani', aliases: [] }], 'ff-1');
    // ── STAMPING, ON THE REAL SHAPE ──
    out.stamp = (() => {
      const contract = { cast: [{ name: 'Phoebe' }, { name: 'Joey' }, { name: 'Phoebe' }] };
      window._ffStampCastIds(contract);
      const ids = contract.cast.map(c => c._sbCastId);      // BACKEND-RESERVED field
      // idempotent: running again must renumber nobody
      window._ffStampCastIds(contract);
      const again = contract.cast.map(c => c._sbCastId);
      // save/restore, then REORDER the array — identity must ride the record, not the position
      const restored = JSON.parse(JSON.stringify(contract));
      restored.cast.reverse();
      window._ffStampCastIds(restored);
      const afterReorder = restored.cast.map(c => ({ name: c.name, castId: c._sbCastId }));
      return { ids, again, stable: JSON.stringify(ids) === JSON.stringify(again),
               unique: new Set(ids).size === ids.length,
               afterReorder,
               reorderKept: afterReorder.every(x =>
                 contract.cast.some(c => c._sbCastId === x.castId && c.name === x.name)) };
    })();
    // ── OPAQUE IDS MUST NOT COLLAPSE ──
    out.opaque = (() => {
      Object.assign(s, base, { storyId: 'op-1', _relationshipLedger: null });
      const ids = ['c-1', 'c_1', 'c 1'].map(cid =>
        window._relEntityForName('Same Name', { kind: 'named', create: true, canonicalId: cid }));
      return { ids, distinct: new Set(ids).size };
    })();
    // ── THE CAST ID OWNS IDENTITY: four cases ──
    // (a) same cast id, DIFFERENT display name → the same person
    out.ffRenamed = (() => {
      const r1 = ffRun([{ name: 'Phoebe', canonicalName: 'Phoebe', aliases: [] }], 'ff-rn-1');
      const first = r1.ids[0];
      const stampedId = s.ffContract.cast[0]._sbCastId;
      // same story, same ledger: the character is renamed in canon and asked for again
      const again = window._relEntityForName('Regina Phalange', { kind: 'named', create: true, canonicalId: stampedId });
      return { first, again, same: first === again,
               label: (window._relLedger().entities[again] || {}).label };
    })();
    // (b) two DIFFERENT cast ids sharing a display name → two people, both selected
    out.ffTwins = (() => {
      const r = ffRun([{ name: 'Robin', canonicalName: 'Robin', aliases: [] },
                       { name: 'Robin', canonicalName: 'Robin', aliases: [] }], 'ff-tw-1');
      const ents = r.ids.map(id => id ? window._relLedger().entities[id] : null);
      return { slots: r.slots.length, ids: r.ids, distinct: new Set(r.ids.filter(Boolean)).size,
               portfolios: ents.map(e => e && e.authorProfile ? e.authorProfile.cPlusFacets.length : null),
               shared: ents[0] && ents[1] ? ents[0].authorProfile === ents[1].authorProfile : null };
    })();
    // (c) a generic same-name entity already exists → the FF character must NOT hijack it
    out.ffNoHijack = (() => {
      Object.assign(s, base, { storyId: 'ff-hj-1', _socialEcosystem: null, _allyFunctionPick: null,
                               _relationshipLedger: null, fateMode: 'famous_fate',
                               ffContract: { character: { canonicalName: 'Ava' },
                                             loveInterest: { canonicalName: 'Ben' },
                                             cast: window._ffStampCastIds({ cast: [{ name: 'Robin', canonicalName: 'Robin', aliases: [] }] }).cast } });
      const slots = window._resolveSocialEcosystem(s);
      window._relSocialSlotEntity('pc', 'friend', { ord: 99, slotId: 'ledger_seed#99' });
      const L2 = window._relLedger();
      L2.entities['ent:robin'] = { id: 'ent:robin', kind: 'named', label: 'Robin', aliases: ['robin'] };
      const before = JSON.parse(JSON.stringify(L2.entities['ent:robin']));
      const id = slots.length ? window._materializeSocialSlot(slots[0].slotId) : null;
      const after = window._relLedger().entities['ent:robin'];
      return { id, hijacked: id === 'ent:robin',
               genericUntouched: JSON.stringify(before) === JSON.stringify(after) };
    })();

    // no storyId → materialise nothing
    Object.assign(s, base, { storyId: 'x', fateMode: null, ffContract: null });
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
    !!R.aMembers && (R.aRecord || {}).storyId === 'story-A' && (R.aRecord || {}).v === 2,
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
  t('8b: every slot is a known social kind, a kinship route, or explicitly UNRESOLVED — never a fallback',
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

  console.log('\n 12c · THE VOCABULARY COVERS THE DECLARED ROLES');
  {
    const bad = Object.entries(R.poolCoverage).filter(([, v]) => v.unrouted.length);
    t('12g: EVERY phrase in EVERY declared role pool routes somewhere',
      bad.length === 0,
      bad.map(([k, v]) => k + ': ' + v.unrouted.join(' · ')).join(' | '));
    t('12h: kinship routes to the KINSHIP path, not to an invented social kind',
      R.kinshipRoute && R.kinshipRoute.route === 'kinship' && R.kinshipRoute.slot === 'sibling',
      JSON.stringify(R.kinshipRoute));
    t('12i: …while a social phrase routes to a social kind',
      R.socialRoute && R.socialRoute.route === 'social' && R.socialRoute.kind === 'close_friend',
      JSON.stringify(R.socialRoute));
    t('12j: a "bond-sister" is a BONDMATE, not a sibling — specificity wins over the kinship word',
      R.bondSisterIsNotSibling && R.bondSisterIsNotSibling.route === 'social'
        && R.bondSisterIsNotSibling.kind === 'bondmate', JSON.stringify(R.bondSisterIsNotSibling));
  }

  {
    const bad = Object.entries(R.materialiseMatrix).filter(([, v]) => v.length);
    t('12g2: EVERY declared role phrase materialises into a real entity WITH a portfolio compartment',
      bad.length === 0, bad.map(([k, v]) => k + ': ' + v.join(' · ')).join(' | '));
  }

  console.log('\n 12d · A CACHED ID IS VERIFIED, NOT TRUSTED');
  t('12k: an id the ledger no longer contains is recreated deterministically — same id',
    R.danglingSameId && R.danglingInLedger, JSON.stringify([R.danglingRecreated, R.danglingInLedger]));
  t('12l: a cached id belonging to a DIFFERENT slot fails closed rather than being reused',
    R.mismatchRefused === null, String(R.mismatchRefused));
  t('12m: _relNameSlot refuses to rename an anchor', R.renameAnchorRefused === null,
    String(R.renameAnchorRefused));
  t('12n: a KINSHIP role is RECONCILED through supersession, not renamed in place',
    !!R.kinNamed && R.kinNamedIsDifferentEntity && R.kinSuperseded,
    JSON.stringify({ before: R.kinBefore, after: R.kinNamed, superseded: R.kinSuperseded }));
  t('12o: …and the named entity carries the name',
    R.kinNamedLabel === 'Lord Maren', String(R.kinNamedLabel));

  console.log('\n 12d2 · A LIVE TARGET MUST ALSO BE THE RIGHT TARGET');
  t('12k2: a supersession pointer at an UNRELATED live entity fails closed',
    R.mtResult === null, String(R.mtResult));
  t('12k3: …and the cached entityId is NOT rewritten to that stranger',
    R.mtCachedAfter === R.mtCachedBefore, JSON.stringify([R.mtCachedBefore, R.mtCachedAfter]));
  t('12k4: a target that CLAIMS the source through wasRole is adopted',
    R.mtLegit === 'ent:legit_named', String(R.mtLegit));

  console.log('\n 12e · THE PORTFOLIO SURVIVES THE IDENTITY LIFECYCLE');
  t('12p: reconciling a kinship placeholder to a name PRESERVES every facet, one for one',
    !!R.pfAfter && R.pfAfter.cPlusFacets.length === R.pfBefore.cPlusFacets.length
      && R.pfBefore.cPlusFacets.every(f => R.pfAfter.cPlusFacets.some(g => g.facet_id === f.facet_id)),
    JSON.stringify({ before: (R.pfBefore||{}).cPlusFacets, after: (R.pfAfter||{}).cPlusFacets }));
  t('12q: …along with narrative function and provenance',
    !!R.pfAfter && R.pfAfter.narrativeFunction === R.pfBefore.narrativeFunction
      && !!R.pfAfter.provenance, JSON.stringify(R.pfAfter));
  t('12r: …and it is still there after a save/restore of the ledger',
    !!R.pfAfterRestore && R.pfAfterRestore.cPlusFacets.length === R.pfBefore.cPlusFacets.length,
    JSON.stringify(R.pfAfterRestore));
  t('12s: the origin of an inherited portfolio stays inspectable',
    !!R.pfAfter && Array.isArray(R.pfAfter.inheritedFrom) && R.pfAfter.inheritedFrom.length === 1,
    JSON.stringify((R.pfAfter||{}).inheritedFrom));

  console.log('\n 12e2 · THE COLLISION POLICY, TESTED ON A POPULATED TARGET');
  {
    const P = R.collideProfile || { cPlusFacets: [] };
    const byId = id => P.cPlusFacets.filter(f => f.facet_id === id)[0];
    t('12p2: on a colliding facet_id the NAMED entity\'s own truth wins',
      !!byId('shared_id') && byId('shared_id').canonical_truth === 'NAMED VERSION',
      JSON.stringify(P.cPlusFacets));
    t('12p3: both UNIQUE facets survive — nothing is dropped by the merge',
      !!byId('role_only') && !!byId('named_only') && P.cPlusFacets.length === 3,
      JSON.stringify(P.cPlusFacets.map(f => f.facet_id)));
    t('12p4: the named entity KEEPS its own provenance and narrative function',
      P.provenance === 'generated_cast' && P.narrativeFunction === 'TRUTH_TELLER',
      JSON.stringify([P.provenance, P.narrativeFunction]));
    t('12p5: transferred facets are COPIES — mutating the live one leaves the role\'s history intact',
      JSON.stringify(R.collideRoleFacets) === JSON.stringify(R.collideRoleAfterMutation),
      JSON.stringify({ before: R.collideRoleFacets, after: R.collideRoleAfterMutation }));
  }

  console.log('\n 12f0 · ONE NAME RULE, CANON INCLUDED');
  t('12n1: a UNIQUE canonical character resolves by bare name',
    R.uniqueCanonByName.status === 'unique', JSON.stringify(R.uniqueCanonByName));
  t('12n2: a kinship placeholder reconciled to her REUSES the cast entity — no duplicate minted',
    R.reconReusedCanon && R.entityCountAfterRecon <= 4,
    JSON.stringify({ id: R.reconToCanon, n: R.entityCountAfterRecon }));
  t('12n3: …and her portfolio is still hers afterwards',
    R.reconKeptPortfolio, String(R.reconKeptPortfolio));
  t('12n4: generic Robin + canonical Robin → bare name resolves to NOTHING',
    R.twoRobins.status === 'ambiguous' && R.twoRobinsResolve === null,
    JSON.stringify([R.twoRobins, R.twoRobinsResolve]));
  t('12n5: …and relationship extraction asserts NO edge under that ambiguity',
    R.edgesBefore === R.edgesAfter,
    JSON.stringify({ before: R.edgesBefore, after: R.edgesAfter, ingest: R.ingest }));

  console.log('\n 12f · NAME RESOLUTION FAILS CLOSED');
  t('12t: one live match resolves', !!R.ambFirst, String(R.ambFirst));
  t('12u: TWO live matches resolve to NOTHING — never first-match',
    R.ambNow === null, String(R.ambNow));
  t('12v: zero matches with create:false mints nobody',
    R.ambNoCreate === null, String(R.ambNoCreate));
  t('12v2: …and an OMITTED create option mints nobody either — the contract is opt-IN',
    R.ambDefaultNoCreate === null, String(R.ambDefaultNoCreate));

  console.log('\n 12g · FAMOUS FATE (a SEPARATE population from the 65 role phrases)');
  t('12w: FF cast members are carried as structured records, not bare name strings',
    R.ff.slots.length > 0 && R.ff.slots.every(x => x.prov === 'ff_cast' && x.hasRec),
    JSON.stringify(R.ff.slots));
  t('12x: …and are never marked unresolved — a canon name is not an unclassified role phrase',
    R.ff.slots.every(x => x.unresolved !== true), JSON.stringify(R.ff.slots));
  t('12y: each materialises to a canonical entity WITH a portfolio compartment',
    R.ff.ids.every(Boolean) && R.ff.entities.every(e => e && e.authorProfile
      && Array.isArray(e.authorProfile.cPlusFacets) && e.authorProfile.provenance === 'ff_cast'),
    JSON.stringify(R.ff.entities && R.ff.entities.map(e => e && [e.id, e.authorProfile && e.authorProfile.provenance])));
  t('12y2: production-shaped cast records (NO incoming id) are stamped with unique ids',
    R.stamp.unique && R.stamp.ids.every(Boolean), JSON.stringify(R.stamp.ids));
  t('12y3: …stamping is idempotent — a second pass renumbers nobody',
    R.stamp.stable, JSON.stringify([R.stamp.ids, R.stamp.again]));
  t('12y4: …and identity rides the RECORD: after save/restore and a REORDER, each name keeps its id',
    R.stamp.reorderKept, JSON.stringify(R.stamp.afterReorder));
  t('12y5: opaque ids "c-1" / "c_1" / "c 1" stay THREE people — no lossy normalisation',
    R.opaque.distinct === 3, JSON.stringify(R.opaque.ids));
  t('12z: the SAME cast id with a CHANGED display name is the SAME person',
    R.ffRenamed.same && R.ffRenamed.label === 'Regina Phalange', JSON.stringify(R.ffRenamed));
  t('12z2: TWO cast ids sharing a display name are TWO people — both survive selection',
    R.ffTwins.slots === 2 && R.ffTwins.distinct === 2 && R.ffTwins.ids.every(Boolean),
    JSON.stringify(R.ffTwins));
  t('12z3: …each with its OWN portfolio compartment, not a shared object',
    R.ffTwins.portfolios.every(x => x === 0) && R.ffTwins.shared === false,
    JSON.stringify(R.ffTwins));
  t('12z4: an existing generic same-name entity is NOT hijacked by an FF cast id',
    !R.ffNoHijack.hijacked && R.ffNoHijack.genericUntouched && !!R.ffNoHijack.id,
    JSON.stringify(R.ffNoHijack));

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
