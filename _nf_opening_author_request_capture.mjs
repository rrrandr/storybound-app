// ══════════════════════════════════════════════════════════════════════════════════════════
// THE COMPLETE OUTGOING LITERARY AUTHOR REQUEST, CAPTURED AT THE TRANSPORT.
//
// Drives the real `handleBeginStory` per case. The author request is intercepted at the route
// AS IT IS DISPATCHED — the whole system + user message, not the scaffold block the builder
// returns — written to disk, then ABORTED so nothing is sent and nothing is charged.
//
// FIXTURES, ALL LABELLED. The OPENING_PLANNER reply carries the case's crisis (refs, lens
// operations, contact verbs and affordances copied out of the dispatched prompt). The five
// upstream generators that still open a door — normalization, "why this pair", the R-plot, the
// wound→LI swap audit, the continuity architect — are answered with a MINIMAL generic object:
// they are not under test here, and the census in _nf_begin_door_census.mjs is what showed
// exactly which they are. The body bibles and the A-plot are pre-set on state so their
// generators short-circuit; the PC bible's current_crisis is the case's own crisis.
//
// Everything else under /api/ is aborted and recorded. No provider is contacted.
//
// usage: node _nf_opening_author_request_capture.mjs
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { configBody, isAuthOrigin, installSession, makeSession, installEntitledProfileStub }
  from './_test_session_env.mjs';

const ROOT = '/Users/romantsukerman/storybound-app';
const OUT = ROOT + '/_nf_author_request_out';
try { fs.rmSync(OUT, { recursive: true, force: true }); } catch (_) {}
fs.mkdirSync(OUT, { recursive: true });

// The two cases whose author blocks carried a countermanding instruction, plus the two controls.
const CASES = [
  { id: 'corporate-dispossession', label: 'active corporate dispossession',
    type: 'institutional', hook: 'the board vote',
    pressure: 'the board is voting her out of her own company while she is still speaking',
    beat: 'Nadia is still speaking when the count against her passes the line.',
    decision: 'Finish the sentence, or walk out before the count?' },
  { id: 'physical-crisis', label: 'physical crisis (literal bleeding)',
    type: 'physical', hook: null,
    pressure: 'the stitches are tearing open under her hands and she cannot stop the bleeding',
    beat: "The stitches tear open under Nadia's hands and the bleeding will not stop.",
    decision: 'Call for help she cannot afford, or finish it herself?' },
  { id: 'quiet-betrayal-optional-ring', label: 'quiet betrayal, WITH an optional prop',
    type: 'relational', hook: 'her ring',
    pressure: "her best friend is wearing her fiance's cologne and has not noticed that she noticed",
    beat: 'Nadia is still holding the scarf her best friend forgot, and it smells of Julian.',
    decision: 'Say the name of the cologne out loud, or swallow it?' },
  // A GENUINELY SOLO PHYSICAL CRISIS. Nobody else is in the room, nobody is meant to be, and
  // nothing in the request may demand one.
  { id: 'solo-physical', label: 'a genuinely SOLO physical crisis (no second person anywhere)',
    type: 'physical', hook: null, staging: 'solo',
    pressure: 'the stitches are tearing open under her hands and she cannot stop the bleeding',
    beat: "The stitches tear open under Nadia's hands and the bleeding will not stop.",
    decision: 'Call for help she cannot afford, or finish it herself?' },
  // A SUPPORTING CHARACTER PRESENT, THE LOVE INTEREST ABSENT. The supporting character is
  // admitted through the existing identity machinery (the relationship ledger, which is what
  // _cpIssuedRefs reads) and staged by the planner's own stage_contract — pending → confirmed,
  // not a preloaded confirmed cast.
  { id: 'supporting-present', label: 'a supporting character PRESENT, the LI absent (pending → confirmed)',
    type: 'relational', hook: 'her ring', staging: 'second', second: 'Mira', ledger: 'second',
    expectRoster: 'OPEN',
    pressure: "her best friend is wearing her fiance's cologne and has not noticed that she noticed",
    beat: "Mira crosses the room toward Nadia wearing Julian's cologne.",
    decision: 'Say the name of the cologne out loud, or swallow it?' },
  // ── ROSTER ELIGIBILITY: THREE NEGATIVES, ONE POSITIVE, ONE OPTIONALITY ──
  // ledger: who is in the relationship ledger. expectRoster: what the pending-roster decision
  // must be. An offstage love interest and an alias of the protagonist are NOT second bodies.
  { id: 'roster-li-only', label: 'ledger holds only the OFFSTAGE LI — roster must stay solo',
    type: 'physical', hook: null, staging: 'solo', ledger: 'li', expectRoster: 'ALREADY SOLO',
    pressure: 'the stitches are tearing open under her hands and she cannot stop the bleeding',
    beat: "The stitches tear open under Nadia's hands and the bleeding will not stop.",
    decision: 'Call for help she cannot afford, or finish it herself?' },
  { id: 'roster-pc-alias', label: 'ledger holds an ALIAS OF THE PROTAGONIST — roster must stay solo',
    type: 'physical', hook: null, staging: 'solo', ledger: 'pcalias', expectRoster: 'ALREADY SOLO',
    pressure: 'the stitches are tearing open under her hands and she cannot stop the bleeding',
    beat: "The stitches tear open under Nadia's hands and the bleeding will not stop.",
    decision: 'Call for help she cannot afford, or finish it herself?' },
  { id: 'roster-open-but-solo', label: 'a supporting character is ELIGIBLE and the planner still chooses solo',
    type: 'physical', hook: null, staging: 'solo', ledger: 'second', expectRoster: 'OPEN',
    pressure: 'the stitches are tearing open under her hands and she cannot stop the bleeding',
    beat: "The stitches tear open under Nadia's hands and the bleeding will not stop.",
    decision: 'Call for help she cannot afford, or finish it herself?' },
  // ── FRESH STORY, NOTHING HAND-POPULATED — the authoritative issuance observation ──
  // No relationship ledger, no seed cast, and a premise whose crisis REQUIRES a best friend.
  // What matters here is read out of the planner request production actually dispatches, not
  // from a private function: the ISSUED REFS block is the roster of identities it was given.
  { id: 'fresh-best-friend', label: 'FRESH story, premise person has an identity, planner DECLINES to stage her',
    type: 'relational', hook: null, staging: 'solo', expectRoster: 'OPEN',
    freshPremise: true, expectMintFor: 'A-plot PERSON antagonist', expectPresent: 'Nadia',
    pressure: 'her best friend is wearing her fiance\'s cologne and has not noticed that she noticed',
    beat: 'Nadia is still holding the scarf her best friend forgot, and it smells of Julian.',
    decision: 'Say the name of the cologne out loud, or swallow it?' },
  { id: 'fresh-best-friend-staged', label: 'FRESH story, planner STAGES the premise person, LI still absent',
    type: 'relational', hook: null, staging: 'second', expectRoster: 'OPEN',
    freshPremise: true, second: 'Mira',
    expectMintFor: 'A-plot PERSON antagonist', expectPresent: 'Nadia, Mira',
    pressure: 'her best friend is wearing her fiance\'s cologne and has not noticed that she noticed',
    beat: 'Mira crosses the room toward Nadia wearing Julian\'s cologne.',
    decision: 'Say the name of the cologne out loud, or swallow it?' },
  // ── THE ALLY CASE. A hot crisis whose opening REQUIRES a supporting friend who is neither
  // the antagonist nor the love interest, with no seeded and no pre-injected identity. The
  // antagonist is somebody else entirely, so nothing can be satisfied by substituting him.
  { id: 'fresh-ally-required', label: 'FRESH story: the opening REQUIRES an ally who is not the antagonist or the LI',
    type: 'social', hook: null, staging: 'second', expectRoster: null,
    freshPremise: true, allyPremise: true, second: 'Dalia',
    allyRequired: 'Dalia', expectMintFor: 'A-plot PERSON antagonist',
    supportDeclaration: 'Dalia, the friend who came with her',
    supportSubject: { kind: 'PERSON', canonical_ref: null, name: 'Dalia', role_label: null }, expectSupport: 'MINTED',
    pressure: 'her private photographs are going up on the venue screen while her closest friend tries to get her out of the room',
    beat: 'The photographs are on the venue screen and Dalia has Nadia by the wrist, pulling.',
    decision: 'Let Dalia pull her out, or stay and face the room?' },
  // ── CONTROL: NO DECLARATION. Absence must create nobody and change nothing. ──
  { id: 'ally-absent-control', label: 'CONTROL: no supporting-person declaration — nobody is created',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true,
    supportDeclaration: null, supportSubject: null, expectSupport: 'NOTHING',
    expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen and the room has started to look',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  // ── CONTROL: THE DECLARATION NAMES THE PROTAGONIST. ──
  { id: 'ally-pc-collision', label: 'CONTROL: the declaration names the PROTAGONIST — refused',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true,
    supportDeclaration: 'Nadia, who is already in the room',
    supportSubject: { kind: 'PERSON', canonical_ref: null, name: 'Nadia', role_label: null }, expectSupport: 'REFUSED',
    expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen and the room has started to look',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  // ── CONTROL: THE DECLARATION NAMES THE LOVE INTEREST. A second identity under a plot role
  // would walk past the presence exclusion, so it must be refused at the identity layer. ──
  { id: 'ally-li-collision', label: 'CONTROL: the declaration names the LOVE INTEREST — refused',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true,
    supportDeclaration: 'Julian, who is somewhere in the building',
    supportSubject: { kind: 'PERSON', canonical_ref: null, name: 'Julian', role_label: null }, expectSupport: 'REFUSED',
    expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen and the room has started to look',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  // ── CONTROL: THE DECLARATION NAMES THE ANTAGONIST, who already has an identity. ──
  { id: 'ally-antagonist-collision', label: 'CONTROL: the declaration names the ANTAGONIST — refused',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true,
    supportDeclaration: 'Rourke, the ex who kept the photographs',
    supportSubject: { kind: 'PERSON', canonical_ref: null, name: 'Rourke', role_label: null }, expectSupport: 'REFUSED',
    expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen and the room has started to look',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  // ── CONTROL: AN EXISTING PERSON IS REUSED, NOT MINTED AGAIN. The ledger is pre-populated FOR
  // THIS CONTROL ONLY, and is labelled as such: on a genuinely fresh story no non-PC/non-LI/
  // non-antagonist identity exists yet, so the reuse branch is unreachable without prior state.
  // This is component evidence for that branch, not fresh-story evidence. ──
  { id: 'ally-reuse-existing', label: 'CONTROL: the declared person ALREADY has an identity — reused, not minted',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true, ledger: 'second', second: 'Dalia',
    supportDeclaration: 'Dalia, the friend who came with her',
    supportSubject: { kind: 'PERSON', canonical_ref: null, name: 'Dalia', role_label: null }, expectSupport: 'REUSED',
    expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen while her closest friend tries to get her out of the room',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  // ── THE THREE SOURCE-LEVEL BYPASSES, AS CONTROLS. Each defeated the first guard, which
  // compared `proper_name || reference prose` as an exact name. ──
  { id: 'ally-li-unnamed-bypass', label: 'BYPASS 1: reference names the LI, proper_name null — must refuse',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true,
    supportDeclaration: 'Julian, who is somewhere in the building',
    supportSubject: { kind: 'PERSON', canonical_ref: null, name: 'Julian', role_label: null },
    expectSupport: 'REFUSED',
    forbidInRoster: 'Julian', expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen and the room has started to look',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  { id: 'ally-dup-unnamed-bypass', label: 'BYPASS 2: an EXISTING Dalia described, proper_name null — must reuse, not duplicate',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true, ledger: 'second', second: 'Dalia',
    supportDeclaration: 'Dalia, her closest friend',
    supportSubject: { kind: 'PERSON', canonical_ref: null, name: 'Dalia', role_label: null },
    expectSupport: 'REUSED',
    expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen while her closest friend tries to get her out of the room',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  // RELABELLED HONESTLY (2026-10-27): under the explicit-subject contract this case supplies
  // Julian in BOTH the description and the subject name, so it is a PROTECTED-PERSON refusal, not
  // a disagreement test. The disagreement case is `ally-ref-name-conflict` below, which supplies
  // two explicit identity fields that point at different people.
  { id: 'ally-contradiction-bypass', label: 'PROTECTED PERSON: the subject name is the LI (description names him too) — must refuse',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true,
    supportDeclaration: 'Julian, who came in with her',
    supportSubject: { kind: 'PERSON', canonical_ref: null, name: 'Julian', role_label: null },
    expectSupport: 'REFUSED',
    forbidInRoster: 'Julian', expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen and the room has started to look',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  // ── AND A LEGITIMATELY UNNAMED SUPPORTING PERSON MUST STILL BE CREATED. The fix must not be
  // "refuse everything without proper_name". ──
  { id: 'ally-unnamed-legitimate', label: 'a legitimately UNNAMED supporting person, proper_name null — must still be created',
    type: 'social', hook: null, staging: 'second', expectRoster: null,
    freshPremise: true, allyPremise: true, second: 'the friend who came with her',
    allyRequired: 'friend', expectSupport: 'MINTED', expectMintFor: 'A-plot PERSON antagonist',
    supportDeclaration: 'the friend who came with her and will not leave without her',
    supportSubject: { kind: 'PERSON', canonical_ref: null, name: null, role_label: 'the friend who came with her' },
    pressure: 'her private photographs are going up on the venue screen while the friend who came with her tries to get her out',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Go when she is pulled, or stay and face the room?' },
  // ── THE THREE ORDINARY-INPUT FAILURES OF THE CAPITALISED-TOKEN HEURISTIC ──
  // 1 · an existing person declared with her COMPLETE name must be reused, not refused.
  { id: 'ally-fullname-reuse', label: 'FULL NAME: existing "Dalia Stone" declared with her complete name — must reuse',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true, ledger: 'fullname', second: 'Dalia Stone',
    supportDeclaration: 'Dalia Stone, her closest friend',
    supportSubject: { kind: 'PERSON', canonical_ref: null, name: 'Dalia Stone', role_label: null },
    expectSupport: 'REUSED', expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen while her closest friend tries to get her out of the room',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  // 2 · the same description with NO subject at all must not mint a duplicate. A descriptive
  // sentence is not an identity, so this is refused rather than guessed from the prose.
  { id: 'ally-nosubject-refuse', label: 'NO SUBJECT: description names Dalia Stone but no name/ref/label — must refuse, not duplicate',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true, ledger: 'fullname', second: 'Dalia Stone',
    supportDeclaration: 'Dalia Stone, her closest friend',
    supportSubject: { kind: 'PERSON', canonical_ref: null, name: null, role_label: null },
    expectSupport: 'REFUSED', expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen while her closest friend tries to get her out of the room',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  // 3 · an unnamed person whose DESCRIPTION mentions the love interest is still the friend.
  // Nothing reads the description for identity, so Julian is not mistaken for the subject.
  { id: 'ally-role-mentions-li', label: 'DESCRIPTION mentions Julian; the subject is a role label — the FRIEND is created, not Julian',
    type: 'social', hook: null, staging: 'second', expectRoster: null,
    freshPremise: true, allyPremise: true, second: 'her closest friend',
    allyRequired: 'closest friend', expectSupport: 'MINTED',
    expectMintFor: 'A-plot PERSON antagonist',
    // THE DESCRIPTION MENTIONS JULIAN; THE SUBJECT DOES NOT. The label respects its own contract
    // (a role and nothing else), and the mention must have no effect on identity whatsoever.
    supportDeclaration: 'the friend who came with Julian and will not leave without her',
    supportSubject: { kind: 'PERSON', canonical_ref: null, name: null, role_label: 'her closest friend' },
    pressure: 'her private photographs are going up on the venue screen while the friend who came with her tries to get her out',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Go when she is pulled, or stay and face the room?' },
  // 4 · an abbreviation of a known full name is not a different person.
  { id: 'ally-abbrev-refuse', label: 'ABBREVIATION: "Dalia" when the story knows "Dalia Stone" — must refuse, not duplicate',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true, ledger: 'fullname', second: 'Dalia Stone',
    supportDeclaration: 'Dalia, her closest friend',
    supportSubject: { kind: 'PERSON', canonical_ref: null, name: 'Dalia', role_label: null },
    expectSupport: 'REFUSED', expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen while her closest friend tries to get her out of the room',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  // ── canonical_ref: THE BRANCH NO EARLIER CASE EXERCISED. All of them sent canonical_ref:null.
  { id: 'ref-not-offered', label: 'REF: a ledger-resident reference that this request never offered — must refuse',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true, ledger: 'fullname', second: 'Dalia Stone',
    supportDeclaration: 'Dalia Stone, her closest friend',
    supportSubject: { kind: 'PERSON', canonical_ref: 'named:dalia_stone', name: null, role_label: null },
    expectSupport: 'REFUSED', expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen while her closest friend tries to get her out of the room',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  // NOTE: this fixture puts a named LI entity in the ledger so that supersession has somewhere to
  // point, which means `_cpIssuedRefs` legitimately lists `named:julian` for this story. What must
  // hold is that he is never DELIVERED, so the issued-roster assertion is not applied here.
  { id: 'ref-superseded-li', label: 'REF: a RETIRED reference that now points at the LI — must refuse after following supersession',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true, ledger: 'supersededToLi', forbidDeliveredOnly: 'Julian',
    expectRefReason: 'love interest', expectRetiredFollowed: true,
    forbidEligible: 'role:old_ally',
    supportDeclaration: 'the one who came in with her',
    supportSubject: { kind: 'PERSON', canonical_ref: 'role:old_ally', name: null, role_label: null },
    expectSupport: 'REFUSED', expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen and the room has started to look',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  { id: 'ref-is-a-place', label: 'REF: a reference whose record is a PLACE — must refuse, not stage it as a body',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true, ledger: 'place', expectRefReason: 'not a person',
    supportDeclaration: 'the room she cannot get out of',
    supportSubject: { kind: 'PERSON', canonical_ref: 'named:the_blushery', name: null, role_label: null },
    expectSupport: 'REFUSED', expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen and the room has started to look',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  { id: 'ally-ref-name-conflict', label: 'CONFLICT: canonical_ref and name point at different people — neither is accepted',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true, ledger: 'twoPeople',
    supportDeclaration: 'whoever came in with her',
    supportSubject: { kind: 'PERSON', canonical_ref: 'named:dalia_stone', name: 'Rhona Keel', role_label: null },
    expectSupport: 'REFUSED', expectRefReason: 'identify different people',
    expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen and the room has started to look',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  // ── THE SAME RECORD, SUPPLIED BY NAME. The record-based ownership check lived only inside
  // canonical_ref handling, so this exact record was refused by reference and REUSED by name.
  { id: 'name-route-li-record', label: 'NAME ROUTE: name "Julian" resolving to a record marked anchorRole:li — must refuse',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true, ledger: 'liRecordOnly', forbidDeliveredOnly: 'Julian',
    supportDeclaration: 'Julian, who came in with her',
    supportSubject: { kind: 'PERSON', canonical_ref: null, name: 'Julian', role_label: null },
    expectSupport: 'REFUSED', expectRefReason: 'love interest', expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen and the room has started to look',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  // ── AND THE ROLE-LABEL ROUTE GETS THE SAME PROTECTION. ──
  { id: 'role-route-li-record', label: 'ROLE ROUTE: a role label resolving to the LI record — must refuse',
    type: 'social', hook: null, staging: 'solo', expectRoster: null,
    freshPremise: true, allyPremise: true, ledger: 'liRoleAlias', forbidDeliveredOnly: 'Julian',
    supportDeclaration: 'the one who came in with her',
    supportSubject: { kind: 'PERSON', canonical_ref: null, name: null, role_label: 'the one she came with' },
    expectSupport: 'REFUSED', expectRefReason: 'love interest', expectMintFor: 'A-plot PERSON antagonist',
    pressure: 'her private photographs are going up on the venue screen and the room has started to look',
    beat: 'The photographs are on the venue screen and Nadia cannot make her feet move.',
    decision: 'Walk out through the room, or stand where she is?' },
  // ── THE CASE THAT ACTUALLY ATTEMPTS IT. Every earlier retired-reference case scripted a solo
  // reply, so none of them ever asked the stage to accept the retired LI reference. This one
  // declares PC + Dalia + role:old_ally all IN_PERSON, with Dalia legitimately eligible, and
  // requires the stage to be refused BEFORE the author is reached.
  { id: 'stage-retired-li-inperson', label: 'STAGING: the planner declares the retired LI reference IN_PERSON — must be refused before the author',
    type: 'social', hook: null, staging: 'second', expectRoster: null,
    freshPremise: true, allyPremise: true, ledger: 'daliaAndSupersededLi',
    stageRetiredLi: true, second: 'Dalia',
    expectNoAuthor: true, expectStageRejection: 'li_is_offstage_and_may_not_be_staged_in_person',
    pressure: 'her private photographs are going up on the venue screen while her closest friend tries to get her out of the room',
    beat: 'The photographs are on the venue screen and Dalia has Nadia by the wrist.',
    decision: 'Let Dalia pull her out, or stay and face the room?' },
  // ── THE TWO THINGS THE PRESENCE GATE MUST NOT BREAK ──
  // 1 · an offstage person may still be RECALLED. The restriction is on IN_PERSON only; removing
  // the love interest from all context would be a different and worse bug.
  { id: 'stage-li-recalled-ok', label: 'PRESENCE: the LI declared RECALLED (not IN_PERSON) — must be accepted',
    type: 'social', hook: null, staging: 'second', expectRoster: null,
    freshPremise: true, allyPremise: true, ledger: 'daliaAndSupersededLi',
    stageRetiredLi: true, retiredPresence: 'RECALLED', second: 'Dalia',
    expectStageAccepted: true,
    pressure: 'her private photographs are going up on the venue screen while her closest friend tries to get her out of the room',
    beat: 'The photographs are on the venue screen and Dalia has Nadia by the wrist.',
    decision: 'Let Dalia pull her out, or stay and face the room?' },
  // 2 · an opening where the LI is legitimately on stage must still work.
  { id: 'stage-li-onstage-ok', label: 'PRESENCE: the LI is legitimately ON STAGE — IN_PERSON must be accepted',
    type: 'social', hook: null, staging: 'second', expectRoster: null,
    freshPremise: true, allyPremise: true, ledger: 'daliaAndSupersededLi',
    stageRetiredLi: true, liOnStage: true, second: 'Dalia',
    expectStageAccepted: true,
    pressure: 'her private photographs are going up on the venue screen and the man who owns the building is already walking toward her',
    // NADIA IS THE DECLARED OPENING ACTOR, so the beat must show HER acting — Julian is present
    // but is not the actor. The first version of this fixture staged him and named her, and the
    // skeleton validator correctly refused it ("opening_actor_id names Nadia but the opening beat
    // never stages them"), which had nothing to do with the presence gate under test.
    beat: 'Nadia steps back from the screen as Julian crosses the floor toward her.',
    decision: 'Let him reach her, or get out first?' },
  { id: 'object-pressure', label: 'the pressure IS an object (positive control)',
    type: 'object', hook: 'a sealed envelope with her own name on it in his handwriting',
    pressure: 'a sealed envelope with her name on it in his handwriting is in her hands and she has not opened it',
    beat: 'Nadia is holding a sealed envelope with her own name on it in his handwriting.',
    decision: 'Open it, or burn it unread?' },
];

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
const blocked = [], authorCaps = [], upstream = [], logs = [], stageDecl = [], allyResolved = [];
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 },
                '/api/refund-fortune':  { success: true, fortunesRemaining: 9999 } };
const STATIC = /\/api\/(geo|csp-report|beta-events|bug-report-awards|record-tempt-failure)\b/;
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini|anthropic-proxy|sol-scene-test)\b/;
await installSession(page, makeSession());
await installEntitledProfileStub(page, {});

const GENERIC = {
  // One shape each, not a union: a minimal object the consumer can read or safely discard.
  pair: { why_this_pair: 'each is the one person the other cannot manage',
          friction: 'she needs what he owns', pull: 'he is the only one who does not look away' },
  rplot: { state: 'strangers', wants: 'to be seen without being managed',
           obstacle: 'he owns the thing she needs', next: 'a collision she cannot avoid' },
  audit: { verdict: 'pass', reason: 'the wound and the love interest are not interchangeable' },
  continuity: { obligations: [], motifs: [], forbidden: [] },
  normalization: { canonical_instruction: null, player_action: null, player_dialogue: null },
};

await page.route('**/api/**', async (route) => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(req.url())) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (STATIC.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  const k = Object.keys(LOCAL).find((x) => url.startsWith(x));
  if (k) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL[k]) });
  let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
  if (!b || !MODEL.test(url)) { blocked.push(url); return route.abort(); }
  const msgs = b.messages || [];
  const sys = String((msgs.find((m) => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find((m) => m.role === 'user') || {}).content || '');
  const fx = await page.evaluate(() => window.__fixtureSpine || null).catch(() => null);
  const t0 = sys + '\n' + usr;

  // ── THE AUTHOR DOOR: CAPTURE THE WHOLE REQUEST, THEN ABORT ──
  // IDENTIFIED BY ITS CONTENT, NOT BY `author: true`. The opening prose call goes out as
  // role=STRUCTURE_GENERATOR and does NOT set that flag (only continuations do) — a census run
  // with `author === true` as the test captured nothing while four author requests went past it.
  // The scaffold block's own closing-boundary line is unique to the literary opening author
  // request, so that is the test.
  const isOpeningAuthor = /↳ THIS IS THE LAST PROSE IN THE SCENE/.test(usr)
    || /═══ STORYBOUND ARCHITECTURE LAWS — PHASE 1 ═══/.test(usr);
  if (b.author === true || isOpeningAuthor) {
    const name = 'author_request__' + String((fx && fx.__caseId) || 'unknown').replace(/[^a-z0-9_-]+/gi, '_')
      + '__' + (authorCaps.filter((a) => a.caseId === (fx && fx.__caseId)).length + 1) + '.txt';
    fs.writeFileSync(OUT + '/' + name,
      '=== ROLE: ' + String(b.role) + '  MODEL: ' + String(b.preferredModel || b.model)
      + '  author_flag=' + String(b.author === true) + '  url=' + url
      + '\n\n=== SYSTEM (' + sys.length + ' chars) ===\n' + sys
      + '\n\n=== USER (' + usr.length + ' chars) ===\n' + usr + '\n');
    authorCaps.push({ caseId: fx && fx.__caseId, file: name, url, role: String(b.role),
                      sysChars: sys.length, usrChars: usr.length, text: sys + '\n' + usr });
    return route.abort();      // captured, never sent
  }

  if (String(b.role) === 'OPENING_PLANNER') {
    if (!fx) { blocked.push(url + ' (no fixture)'); return route.abort(); }
    const isRepair = /Repair ONLY the named fields|NAMED FAILURES \(fix exactly these/i.test(usr);
    const refsBlock = (usr.match(/ISSUED REFS \(the complete set[^\n]*\n([\s\S]*?)(?:\n\s*\n|$)/) || [])[1] || '';
    const refs = refsBlock.split('\n').map((l) => (l.match(/^\s*·\s*(\S+)/) || [])[1]).filter(Boolean);
    const plannerOwnsStage = /"stage_contract"/.test(usr) || /stage_contract/.test(sys);
    const spine = fx.spine;
    const v3 = /"contact":\s*\{\s*"verb"/.test(usr);
    const ELS = spine.environment_elements || [];
    const AFF = { 'a drying rack of unfired cups': 'FIXTURE', 'a bucket of slip going skinned': 'GRASPABLE' };
    const affTable = {};
    (usr.match(/AFFORDANCE TABLE \(which verbs each affordance permits\): ([^\n]+)/) || ['', ''])[1]
      .split(';').forEach((row) => { const m = row.match(/\s*([A-Z_]+)\s*→\s*([A-Z_/]+)/); if (m) affTable[m[1]] = m[2].split('/'); });
    const target = ELS.find((nm) => AFF[nm] === 'GRASPABLE') || ELS[0];
    const verb = (affTable[AFF[target]] || ['GRIP'])[0];
    const lensBlock = (usr.match(/"pc_lens_operation" MUST be exactly one of these[^\n]*\n([\s\S]*?)\n(?=[A-Z])/) || [])[1] || '';
    const lensOps = lensBlock.split('\n').map((l) => (l.match(/^\s*·\s*([A-Z][A-Z_]+)\s+—/) || [])[1]).filter(Boolean);
    const skel = { character_plus: [], fusion: null };
    const idRows = [...usr.matchAll(/^\s*([a-z]+:[a-z0-9_]+):\s*(.+)$/gm)].map((m) => ({ id: m[1], name: m[2].trim() }));
    const actorRow = idRows.find((r) => r.name === 'Nadia');
    spine.opening_actor_id = actorRow ? actorRow.id : null;
    const pofBeat = 'my thumb finds the rim of ' + target
      + ' where the glaze has worn it pale, and my rehearsed steadiness feels newly counterfeit';
    if (v3) {
      skel.pc_opening_fusion = { character: 'Nadia', placement: 'PC_FIRST_EMBODIED_BEAT',
        contact: { verb: verb, object: target }, action: 'she steadies it without looking at it',
        pc_lens_operation: lensOps[0] || 'CONTRADICTION',
        character_revelation: 'Nadia would rather keep her hands busy than let anyone see her decide, and she has built a whole competence out of that evasion.',
        environment_pressure: { grounds: ['env:axis', 'stage:fact:1'],
          text: 'The work in front of me will not wait for me to finish being wrecked, and finishing it is the only thing keeping me in the room.' } };
      skel.environment_plus = { axis: 'use',
        beat: '{TARGET} has skinned over again from standing too long, and the rim is worn pale where her thumb always lands.' };
    } else {
      skel.pc_opening_fusion = { character: 'Nadia', placement: 'PC_FIRST_EMBODIED_BEAT',
        character_angle: 'she would rather keep her hands busy than let anyone see her decide', beat: pofBeat };
      skel.environment_plus = { target: target, axis: 'use',
        beat: target + ' has skinned over again from standing too long, and the rim is worn pale where her thumb always lands.' };
    }
    try { (spine.staged_characters || []).forEach((x) => { if (x && x.name === 'Nadia') x.anchor_beat = pofBeat; }); } catch (_) {}
    delete spine.pc_opening_fusion;
    let out = { opening_spine: spine, scene_skeleton: skel };
    if (plannerOwnsStage) {
      // THE REFS ARE WHAT PRODUCTION ISSUED. A second participant is declared only if a second
      // ref was issued — if none was, that is the limitation, recorded rather than worked around.
      // THE ALLY CASE DECLARES ONLY WHAT IT WAS ISSUED. Declaring the antagonist's ref while
      // naming the ally in staged_characters made the plan contradict itself, and production
      // refused it for that reason instead of for the one under test.
      // ── THE ALLY'S OWN REFERENCE, RESOLVED — NEVER THE ANTAGONIST'S ────────────────────
      // Asked of the ledger production built: which issued ref is the ally? Matched by label and
      // alias, so the declaration cannot be satisfied by any other identity. If none resolves the
      // case fails explicitly below; nothing is substituted.
      let allyRef = null, allyLabel = null;
      if (fx.allyPremise && fx.second) {
        const got = await page.evaluate((args) => {
          try {
            const L = (typeof window._relLedger === 'function') ? window._relLedger() : null;
            if (!L) return null;
            const want = String(args.name || '').trim().toLowerCase();
            for (const id of args.refs) {
              const e = L.entities && L.entities[id];
              if (!e) continue;
              const names = [e.label].concat(e.aliases || []).map((x) => String(x || '').toLowerCase());
              if (names.some((x) => x === want || x.indexOf(want) >= 0)) return { id, label: e.label };
            }
            return null;
          } catch (_) { return null; }
        }, { refs, name: fx.second }).catch(() => null);
        if (got) { allyRef = got.id; allyLabel = got.label; }
      }
      const wantSecond = (fx.staging === 'second' && !fx.allyPremise) || (fx.allyPremise && !!allyRef);
      const used = fx.stageRetiredLi
        ? [refs[0]].concat(refs.filter((x) => x === 'named:dalia' || x === 'role:old_ally'))
        : fx.allyPremise
        ? (allyRef ? [refs[0], allyRef] : refs.slice(0, 1))
        : ((wantSecond && refs.length > 1) ? refs.slice(0, 2) : refs.slice(0, 1));
      const actorRef = (wantSecond && used[1]) ? used[1] : used[0];
      stageDecl.push({ caseId: fx.__caseId, issuedRefs: refs.slice(), wantSecond,
                       declared: used.slice(), secondAvailable: refs.length > 1 });
      out.stage_contract = { v: 1,
        participants: used.map((r) => ({ ref: r,
          // the retired reference's presence is what each case is testing
          presence: (fx.stageRetiredLi && r === 'role:old_ally') ? (fx.retiredPresence || 'IN_PERSON') : 'IN_PERSON' })),
        event_facts: [{ text: fx.eventFact, participants: [{ ref: actorRef, role: 'actor' }] }],
        elements: ELS.map((nm) => ({ name: nm, affordance: AFF[nm] || 'GRASPABLE' })) };
      // staged_characters MIRRORS the declaration, which is what the template now asks for.
      if (wantSecond && used.length > 1 && !fx.allyPremise) {
        const nm2 = (idRows.find((r) => r.id === used[1]) || {}).name || fx.second || 'the second person';
        spine.staged_characters = (spine.staged_characters || []).concat([
          { name: nm2, presence: 'IN_PERSON', anchor_beat: 'FROM_CHARACTER_PLUS' }]);
      }
      // THE STAGED ROW MATCHES THE DECLARED REF, or there is no row. Staging a name whose ref was
      // never declared is a plan that contradicts itself, and production rightly refuses it — that
      // refusal would mask whether the identity exists.
      if (fx.stageRetiredLi) {
        spine.staged_characters = (spine.staged_characters || []).concat(
          used.slice(1).filter((rid) => !(rid === 'role:old_ally' && (fx.retiredPresence || 'IN_PERSON') !== 'IN_PERSON'))
            .map((rid) => ({
            name: (idRows.find((r) => r.id === rid) || {}).name
              || (rid === 'named:dalia' ? 'Dalia' : 'the one who came in with her'),
            presence: 'IN_PERSON', anchor_beat: 'FROM_CHARACTER_PLUS' })));
      } else if (fx.allyPremise && allyRef) {
        spine.staged_characters = (spine.staged_characters || []).concat([
          { name: allyLabel || fx.second, presence: 'IN_PERSON', anchor_beat: 'FROM_CHARACTER_PLUS' }]);
      }
      allyResolved.push({ caseId: fx.__caseId, allyRef, allyLabel });
    }
    if (isRepair) {
      const keys = ((usr.match(/exactly these top-level keys, corrected: ([^\n.]+)/) || ['', ''])[1] || '')
        .split(',').map((x) => x.trim()).filter(Boolean);
      const only = {}; keys.forEach((kk) => { if (kk in skel) only[kk] = skel[kk]; else if (kk in spine) only[kk] = spine[kk]; });
      out = only;
    }
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: 'fixture', object: 'chat.completion', model: b.model, usage: {},
        _orchestration: { role: b.role, model: b.model },
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(out) } }] }) });
  }

  // ── THE A-PLOT GENERATOR: A PRODUCTION-SHAPED REPLY, SO THE REAL SETUP RUNS ──
  // Only for the fresh case. The fields are the ones production reads and validates:
  // antagonistOrAntiForce carries the reference prose, antagonistSubject.kind classifies it, and
  // PERSON is what makes app.js:66003 mint `role:<aplot.id>:primary_antagonist`. The milestone
  // count is read out of the request, not guessed.
  if (/You are the A-PLOT GENERATOR/.test(t0) && fx && fx.freshPremise) {
    const nMile = Number(((t0.match(/Generate exactly (\d+) milestones/) || [])[1]) || 4);
    const miles = [];
    for (let i = 0; i < nMile; i++) {
      const pct = Math.round(((i + 1) / nMile) * 100);
      miles.push({ atScene: i + 2, atPercent: pct,
        kind: i === nMile - 2 ? 'crisis' : (i === 0 ? 'setup' : (i === nMile - 1 ? 'resolution' : 'first_complication')),
        event: 'Mira is seen somewhere she said she had not been, and Nadia has to decide what to do with it',
        emotional_conductivity: 'it converts a suspicion Nadia could still deny into something she has to act on' });
    }
    const aplot = fx.allyPremise ? {
      // THE ANTAGONIST IS NOT THE FRIEND. Dalia is the ally the opening needs; the opposition is
      // the ex who put the photographs on the screen. If the ally ever becomes available, it
      // cannot be by borrowing the antagonist's identity.
      goal: 'get the photographs off the venue screen before the room finishes looking, and keep her name',
      namedClock: 'the forty minutes until the auction closes the room',
      clockUnit: 'days', totalClockUnits: 1,
      antagonistOrAntiForce: 'Rourke, the ex who kept the photographs',
      antagonistSubject: { kind: 'PERSON', proper_name: 'Rourke' },
      antagonistShape: 'A',
      antagonistPersonalTie: 'the ex she left, who kept everything she sent him',
      // THE OPTIONAL DECLARATION UNDER TEST. Dalia is neither the antagonist nor the LI.
      // `undefined` means the case said nothing → the default declaration. An explicit `null`
      // means the ABSENT-DECLARATION control, and must stay null.
      requiredSupportPerson: fx.supportDeclaration === undefined
        ? 'Dalia, the friend who came with her' : fx.supportDeclaration,
      requiredSupportSubject: fx.supportSubject === undefined
        ? { kind: 'PERSON', canonical_ref: null, name: 'Dalia', role_label: null }
        : fx.supportSubject,
      personalStakePC: 'the version of her the room will remember after tonight',
      personalStakeLI: 'the discretion he sells, which cannot survive being in this room',
      pcWound: 'she was photographed once before and told it was her own fault, at twenty-two',
      liWound: 'he was taught by his father that being seen wanting a thing is how you lose it',
      pcWoundCategory: 'PUBLIC', liWoundCategory: 'PARENTAL',
      stakesIfFail: 'the photographs become the thing she is, to everyone in the city who matters',
      stakesIfWin: 'she keeps her name and owes Dalia something she cannot pay back',
      milestones: miles,
    } : {
      goal: 'find out whether Mira has been sleeping with her fiance, before the engagement dinner',
      namedClock: 'the engagement dinner on Saturday',
      clockUnit: 'days', totalClockUnits: 5,
      antagonistOrAntiForce: 'Mira, her closest friend since school',
      antagonistSubject: { kind: 'PERSON', proper_name: 'Mira' },
      antagonistShape: 'A',
      antagonistPersonalTie: 'her closest friend since school, and the one who introduced her to him',
      personalStakePC: 'the only friendship she never had to perform in',
      personalStakeLI: 'the version of himself he has let her believe in',
      pcWound: 'she was always the one who forgave first, since her sister stopped speaking to her at nineteen',
      liWound: 'he was taught by his father that keeping a thing is safer than wanting it out loud',
      pcWoundCategory: 'SIBLING_OR_FRIEND', liWoundCategory: 'PARENTAL',
      stakesIfFail: 'she marries him having chosen not to know, and spends the marriage not asking',
      stakesIfWin: 'she keeps her own account of her life, and loses the friend who was in it',
      milestones: miles,
    };
    upstream.push({ role: String(b.role), url, matched: true, head: 'A-PLOT GENERATOR (production-shaped fixture)' });
    const payload = JSON.stringify(aplot);
    const env = /mistral-proxy|\/api\/proxy\b|deepseek-proxy/.test(url)
      ? { id: 'fixture', object: 'chat.completion', model: b.model, usage: {},
          _orchestration: { role: b.role, model: b.model },
          choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: payload } }] }
      : { ok: true, content: payload, choices: [{ message: { content: payload } }] };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(env) });
  }

  // ── THE FIVE UPSTREAM GENERATORS: MINIMAL LABELLED FIXTURES, NOT UNDER TEST ──
  const t = t0;
  const pick = /canonicalization and normalization engine/.test(t) ? GENERIC.normalization
    : /architect of WHY THIS PAIR/.test(t) ? GENERIC.pair
    : /designing an R-PLOT/.test(t) ? GENERIC.rplot
    : /WOUND→LI SWAP TEST|WOUND.{0,3}LI SWAP TEST/.test(t) ? GENERIC.audit
    : /CONTINUITY ARCHITECT/.test(t) ? GENERIC.continuity
    : null;
  upstream.push({ role: String(b.role), url, matched: !!pick, head: t.slice(0, 70).replace(/\s+/g, ' ') });
  // AN UNRECOGNISED MODEL DOOR IS ABORTED, NOT ANSWERED. Answering it with a generic object
  // produced a downstream chain running on `{}` as prose — a fake success. The capture above is
  // the measurement; nothing after it needs to succeed.
  if (!pick) { blocked.push(url + ' role=' + String(b.role) + ' (unrecognised model door, aborted)'); return route.abort(); }
  const payload = JSON.stringify(pick);
  const envelope = /mistral-proxy|\/api\/proxy\b|deepseek-proxy/.test(url)
    ? { id: 'fixture', object: 'chat.completion', model: b.model, usage: {},
        _orchestration: { role: b.role, model: b.model },
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: payload } }] }
    : { ok: true, content: payload, choices: [{ message: { content: payload } }] };
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope) });
});
await page.route('**/sb-test.localhost/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
page.on('request', (r) => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) blocked.push('ESCAPED ' + r.url()); });
page.on('console', (m) => { const x = m.text();
  if (/SCENE1|SCAFFOLD|HOOK|PRESSURE|OPENING|STAGE|A-PLOT|RESOURCE-BLEED|INSTITUTIONAL|PC-CASTING|SETTING|REL|SOCIAL-ECO|CPLUS:REFS/.test(x)) logs.push(x.slice(0, 500)); });

await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 60000 });
await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, null, { timeout: 180000 });

const results = [];
for (const c of CASES) {
  logs.length = 0;
  const before = authorCaps.length;
  await page.evaluate(async ({ c }) => {
    const S = window.state;
    Object.keys(S).forEach((k) => { try { delete S[k]; } catch (_) {} });
    const def = (window.STARTER_STORIES || []).find((d) => d && d.id === 'starter_the_first_taste');
    Object.assign(S, { world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor, dynamic: def.dynamic,
      archetype: { primary: def.archetype, modifier: null }, name: 'Nadia', playerName: 'Nadia',
      loveInterestName: 'Julian', partnerName: 'Julian', loveInterest: 'Male', liGender: 'male',
      playerMask: 'OPEN_VEIN', storyLength: 'taste', tier: 'taste', access: 'sub', subscribed: true,
      fortunes: 9999999, intensity: 'Steamy', pov: 'first_person', turnCount: 0,
      identity: { playerName: 'Nadia', partnerName: 'Julian' }, renderMode: 'literary',
      currentEngine: 'literary', storyModality: 'literary', storyId: 'ar-' + c.id, myUid: 'probe',
      _starterId: def.id, is_starter_story: true, immutableTitle: def.title,
      _openingTemperature: 'HOT_CRISIS', _skipCorridorValidation: true,
      // PRODUCTION'S OWN SWITCH for a legitimately on-stage LI (app.js:65750): it sets the flag,
      // turns the deck mandate off and sets scene1Presence=ONSTAGE on both plans. Hand-setting
      // the flag alone was not enough — it is reset to undefined at one point to force a re-pick.
      _scene1LIOnStage: c.liOnStage === true,
      // SHARED_HISTORY: the arm on which the institutional-gravity gate and the shape gate both
      // apply, which is where the countermanding instructions were observed.
      romanceEnginePlan: { engine: 'SHARED_HISTORY', scene1Presence: 'ABSENT', acquaintance: 'STRANGER' },
      pcBodyBible: { signature_feature: 'a crooked eyetooth', second_celebrated_feature: 'a low laugh',
        stress_tic: null, desire_tell: 'the breath before she admits anything',
        current_crisis: { event: c.pressure, li_complication: 'Julian is the one who can end it and will not' } },
      liBodyBible: { signature_feature: 'a scar through one eyebrow', voice_quality: 'low, unhurried',
        hands_quality: 'broad, scarred at the right knuckles', mouth_quality: 'a slow mouth',
        holding_style: 'still, as if waiting', pc_keenly_notices: ['his hands on a glass'],
        desire_register_exemplars: ['his hand flattening slowly on the table'] },
      antagonistBodyBible: null,
      // THE FRESH CASE PRE-SETS NO A-PLOT. Pre-setting state.aPlot short-circuits production's
      // own setup — including the block at app.js:65995 that mints a canonical identity for a
      // PERSON antagonist — so the path under investigation would never run. Production builds it
      // from the A-PLOT GENERATOR reply instead, and the reply is a labelled fixture in the
      // PRODUCTION RESPONSE SHAPE (antagonistOrAntiForce + antagonistSubject.kind), not the
      // invented field names an earlier version of this harness used.
      aPlot: c.freshPremise ? undefined
        : { goal: c.pressure, antagonist: 'the person doing it to her', antagonistShape: 'PERSON',
               namedClock: 'the count finishing', pcWound: 'she was left to carry her mother\'s debts alone',
               liWound: 'he was taught that keeping is safer than wanting' },
      _scene1Mission: c.staging ? undefined : c.pressure });
    if (c.staging) { delete S._scene1Mission; delete S._starterId; S.is_starter_story = false; }
    if (c.freshPremise) { delete S.aPlot; }
    // THE EXISTING IDENTITY MACHINERY: a relationship-ledger entity is what _cpIssuedRefs reads
    // to issue a `named:` ref. Nothing else is pre-staged — no seed, no confirmed cast.
    if (c.ledger) {
      const ents = {};
      const add = (id, label, anchorRole) => { ents[id] = { id, kind: 'named', label,
        aliases: [label], provenance: 'harness-fixture', anchorRole: anchorRole || null }; };
      if (c.ledger === 'li') add('named:julian', 'Julian', 'li');
      if (c.ledger === 'pcalias') add('named:nadia', 'Nadia', 'pc');
      if (c.ledger === 'second') add('named:' + String(c.second || 'Mira').toLowerCase(), c.second || 'Mira', null);
      if (c.ledger === 'fullname') add('named:dalia_stone', 'Dalia Stone', null);
      if (c.ledger === 'twoPeople') { add('named:dalia_stone', 'Dalia Stone', null); add('named:rhona_keel', 'Rhona Keel', null); }
      if (c.ledger === 'place') {
        ents['named:the_blushery'] = { id: 'named:the_blushery', kind: 'place', label: 'the Blushery',
          aliases: ['the blushery'], provenance: 'harness-fixture' };
      }
      if (c.ledger === 'liRecordOnly') {
        ents['named:julian'] = { id: 'named:julian', kind: 'named', label: 'Julian',
          aliases: ['julian'], provenance: 'harness-fixture', anchorRole: 'li' };
      }
      if (c.ledger === 'liRoleAlias') {
        // The LI record carries the role phrase as an alias, so the role-label route resolves to
        // him. Without the shared guard this route would have reused him as a supporting person.
        ents['named:julian'] = { id: 'named:julian', kind: 'named', label: 'Julian',
          aliases: ['julian', 'the one she came with'], provenance: 'harness-fixture', anchorRole: 'li' };
      }
      if (c.ledger === 'daliaAndSupersededLi') {
        add('named:dalia', 'Dalia', null);
        ents['role:old_ally'] = { id: 'role:old_ally', kind: 'plot_role', label: 'the one who came in with her',
          aliases: [], provenance: 'harness-fixture', supersededBy: 'named:julian' };
        ents['named:julian'] = { id: 'named:julian', kind: 'named', label: 'Julian', aliases: ['julian'],
          provenance: 'harness-fixture', anchorRole: 'li' };
      }
      if (c.ledger === 'supersededToLi') {
        // A RETIRED ROLE THAT NOW POINTS AT THE LOVE INTEREST. Following supersession is what
        // turns this from "some old role" into "the love interest", which is the whole point.
        const liId = 'named:julian';
        ents['role:old_ally'] = { id: 'role:old_ally', kind: 'plot_role', label: 'the one who came in with her',
          aliases: [], provenance: 'harness-fixture', supersededBy: liId };
        ents[liId] = { id: liId, kind: 'named', label: 'Julian', aliases: ['julian'],
                       provenance: 'harness-fixture', anchorRole: 'li' };
      }
      S._relationshipLedger = { v: 1, storyId: S.storyId, processed: {}, edges: {}, seq: 0,
        entities: ents };
    }
    S.picks = { world: S.world, worldSubtype: S.worldSubtype, flavor: S.flavor, dynamic: S.dynamic,
                tone: 'Earnest', pov: 'First', length: 'taste', identity: S.identity };
    window.__fixtureSpine = { __caseId: c.id, eventFact: c.beat, staging: c.staging || null,
      second: c.second || null, expectRoster: c.expectRoster || null,
      freshPremise: !!c.freshPremise, allyPremise: !!c.allyPremise,
      stageRetiredLi: !!c.stageRetiredLi, retiredPresence: c.retiredPresence || 'IN_PERSON',
      supportDeclaration: c.supportDeclaration === undefined ? undefined : c.supportDeclaration,
      supportSubject: c.supportSubject === undefined ? undefined : c.supportSubject, spine: {
      pressure_source_type: c.type, pressure_source: c.pressure, hook_object: c.hook,
      opening_actor_id: null, opening_beat: c.beat, rising_beats: ['she does not move', 'the room waits'],
      decision_beat: c.decision, pc_career: 'ceramicist', opening_setting: 'a studio back room',
      li_texture_beat: 'his voice on the stairwell below, low and unhurried, and my pulse going uneven',
      pc_wound_anchor: c.pressure,
      pc_self_presentation_beat: 'I wipe clay off my knuckles on my own skirt like it is nothing',
      scene_want: 'for Julian to see her like this, and not to', scene_mission: c.pressure,
      reader_state: { knows: c.pressure, believes: 'she can still hold it', wondering: 'what she does next',
                      must_not_confuse: 'this is not about the object' },
      pc_body_callback: 'decision', li_body_callback: null, antagonist_body_callback: null,
      perceptual_signature_beat: c.pressure,
      environment_elements: ['a drying rack of unfired cups', 'a bucket of slip going skinned'],
      pc_opening_fusion: null,
      staged_characters: [{ name: 'Nadia', presence: 'IN_PERSON', anchor_beat: 'is already in place as the scene opens' }],
    } };
    if (c.liOnStage === true) { window._TEST_liOnstage = true; } else { try { delete window._TEST_liOnstage; } catch (_) {} }
    try { await Promise.race([window.handleBeginStory(), new Promise((r) => setTimeout(r, 240000))]); } catch (_) {}
  }, { c });
  const modeSeen = await page.evaluate(() => ({
    storyMode: (window.state || {}).storyMode || null,
    renderMode: (window.state || {}).renderMode || null,
    storyModality: (window.state || {}).storyModality || null,
    currentEngine: (window.state || {}).currentEngine || null,
    openingSoloStage: (window.state || {})._openingSoloStage,
    turnCount: (window.state || {}).turnCount,
    helper: typeof window._openingIsKnownSolo,
    helperSays: (typeof window._openingIsKnownSolo === 'function')
      ? window._openingIsKnownSolo(window.state) : 'n/a' })).catch(() => ({}));
  results.push({ ...c, freshPremise: !!c.freshPremise, caps: authorCaps.slice(before),
                 logs: logs.slice(), modeSeen });
  process.stdout.write('.');
}
await browser.close();
process.stdout.write('\n');
fs.writeFileSync(OUT + '/RESULT.json', JSON.stringify({ results: results.map((r) => ({ ...r, caps: r.caps.map((x) => ({ ...x, text: undefined })) })), upstream, blocked }, null, 2));

// ── WHAT COUNTERMANDS THE CHOSEN CRISIS? ─────────────────────────────────────────────────
const COUNTERMAND = [
  ['institutional material barred from being the engine', /INSTITUTIONAL → EMBODIED REFRAME/],
  ['"must NOT be the ENGINE of Scene 1"', /must NOT be the ENGINE of Scene 1/],
  ['object introduction mandated', /HOOK OBJECT \(introduce it concretely/],
  ['invent-an-object fallback', /\(choose a concrete object that fits\)/],
  ['decision mandated onto an object', /The decision MUST turn on the hook object/],
  ['prop forbidden as the opening subject', /It is NOT the subject of the opening/],
  ['"do NOT steer around the prop"', /do NOT steer around the prop/],
  ['object-dependent closing example', /NO "I looked at the/],
  ['a crisis required to be ALREADY IRREVERSIBLE', /ALREADY IRREVERSIBLE/],
  ['solo asserted before the roster is established', /no one else is here/],
  // ROUND 3: the two conflicts the ten-pattern scan missed, now included.
  ['a PERSON required to act on her by sentence 1–2', /a PERSON acting on the protagonist by sentence 1/],
  ['first-sentence subject required to be a person', /FIRST SENTENCE'S SUBJECT is a PERSON doing something/],
  ['interaction required regardless of who is present', /must not delay interaction or tension/],
  ['cast declared PREFILLED AND FIXED while pending', /PREFILLED AND FIXED/],
  ['"never by introducing someone"', /never by introducing someone/],
  ['"Do NOT add a person"', /Do NOT add a person/],
];
const P = (x) => console.log(x);
P('\nTHE COMPLETE OUTGOING LITERARY AUTHOR REQUEST — captured at the transport\n');
P('  NOTE ON THE SCAN BELOW: it is a REGRESSION CHECK FOR KNOWN WORDING — the specific strings');
P('  that were found to countermand a chosen crisis. A clean scan means none of THOSE returned.');
P('  It is not proof that a 225,000-character request contains no contradiction anywhere.\n');
P('  author requests captured : ' + authorCaps.length + '  (each ABORTED after capture — nothing sent)');
P('  upstream generator doors answered with a generic fixture : ' + upstream.length
  + '  (' + upstream.filter((u) => !u.matched).length + ' unmatched)');
P('  /api/** aborted : ' + blocked.length
  + (blocked.some((b) => /^ESCAPED/.test(b)) ? '  ⚠ ESCAPED' : '  (none escaped)'));
let fails = 0;
results.forEach((r) => {
  P('\n' + '═'.repeat(94));
  P(r.label + '   type=' + r.type + '  hook=' + JSON.stringify(r.hook));
  P('═'.repeat(94));
  if (!r.caps.length) {
    // A REFUSAL IS A RESULT WHEN THE CASE IS ABOUT ADMISSION. The ally assertions below read the
    // issued roster and the refusal message, so they still run; only the request-text checks are
    // skipped, and the refusal itself is reported rather than summarised.
    P('  ' + (r.expectNoAuthor ? '·' : '✗') + ' no author request was dispatched for this case'
      + (r.expectNoAuthor ? '  (expected — the stage must be refused first)' : ''));
    (r.logs || []).filter((l) => /FAULT|fatal|INVALID|ABORT|abort/i.test(l)).slice(0, 4).forEach((l) => P('    log  ' + l.slice(0, 320)));
    // A refusal is the RESULT for an admission or staging case, so those keep running; only the
    // request-text checks are skipped.
    if (!r.allyRequired && !r.expectNoAuthor && !r.expectStageRejection) { fails++; return; }
  }
  // ── TARGETED CHECK A: no instruction demands another person on a solo stage ──
  // Not from the pattern scan. These three are read out of the complete request directly, and the
  // mode that selected them is reported with them.
  const m = r.modeSeen || {};
  P('  mode as PRODUCTION set it: storyMode=' + m.storyMode + ' renderMode=' + m.renderMode
    + ' storyModality=' + m.storyModality + ' currentEngine=' + m.currentEngine);
  P('  solo predicate at end of run: _openingSoloStage=' + m.openingSoloStage
    + ' turnCount=' + m.turnCount + ' helper=' + m.helper + ' helperSays=' + m.helperSays);
  // ── TARGETED CHECK B: the pending-roster decision ──
  const rosterLog = (r.logs || []).filter((l) => /\[SCENE1:STAGE:PENDING\]/.test(l))[0] || '';
  const rosterSeen = /roster OPEN/.test(rosterLog) ? 'OPEN'
    : /roster ALREADY SOLO/.test(rosterLog) ? 'ALREADY SOLO' : null;
  if (r.expectRoster) {
    const ok = rosterSeen === r.expectRoster;
    if (!ok) fails++;
    P('  ' + (ok ? '✓' : '✗') + ' pending-roster decision is ' + r.expectRoster
      + '   — got ' + (rosterSeen || 'no decision logged')
      + (rosterLog ? '\n      ' + rosterLog.slice(0, 190) : ''));
  }
  // ── THE IDENTITY CHAIN, AS ASSERTIONS ─────────────────────────────────────────────────
  // mint → issued ref → delivered presence. These FAIL rather than print, so a regression in
  // any link is caught instead of being read past in a log.
  if (r.freshPremise || r.allyRequired) {
    const ap = (r.logs || []).filter((l) => /\[A-PLOT\]/.test(l));
    const mint = (ap.join(' ').match(/canonical identity (\S+)/) || [])[1] || null;
    const soft = ap.some((l) => /SOFT-PASS \(repair failed/.test(l));
    const sd0 = stageDecl.filter((x) => x.caseId === r.id)[0];
    const issued = (sd0 && sd0.issuedRefs) || [];
    const cap0 = (r.caps || [])[0];
    const presentLine = cap0 ? ((cap0.text.match(/• PHYSICALLY PRESENT: ([^\n|]{0,60})/) || [])[1] || '').trim() : '';
    P('  identity chain:' + (soft ? '   [the A-plot repair FAILED and was SOFT-PASSED by the existing fallback]' : ''));
    const asserts = [];
    if (r.expectMintFor) {
      asserts.push(['a canonical identity is minted for the ' + r.expectMintFor, !!mint,
        mint || 'none logged']);
      asserts.push(['that identity reaches the ISSUED REFS of the dispatched planner request',
        !!mint && issued.indexOf(mint) >= 0, JSON.stringify(issued)]);
    }
    if (r.expectPresent) {
      const want = r.expectPresent;
      asserts.push(['the delivered roster is "' + want + '"', presentLine === want,
        'got "' + presentLine + '"']);
    }
    if (r.allyRequired) {
      // THE IDENTITY MUST BELONG TO HER. "some non-PC, non-antagonist ref exists" would pass on
      // any stray identity; this binds the issued ref to her label in the ledger production built.
      const ar = allyResolved.filter((x) => x.caseId === r.id)[0] || {};
      const bound = !!ar.allyRef && issued.indexOf(ar.allyRef) >= 0
        && new RegExp(r.allyRequired, 'i').test(String(ar.allyLabel || ''));
      asserts.push(['the issued identity BELONGS TO ' + r.allyRequired + ' (matched by label in the ledger)',
        bound, ar.allyRef ? (ar.allyRef + ' labelled "' + ar.allyLabel + '"') : 'no ref resolved to her — nothing substituted']);
      asserts.push(['she is NOT the antagonist identity', !ar.allyRef || ar.allyRef !== mint,
        ar.allyRef === mint ? 'the antagonist ref was used for her' : '']);
      asserts.push(['the required ' + r.allyRequired + ' reaches the delivered roster',
        new RegExp(r.allyRequired, 'i').test(presentLine), 'got "' + presentLine + '"']);
    }
    // ── THE REFUSAL / REUSE CONTROLS ──
    if (r.expectSupport) {
      const sl = (r.logs || []).filter((l) => /required supporting person/.test(l));
      const got = sl.some((l) => /REFUSED/.test(l)) ? 'REFUSED'
        : sl.some((l) => /REUSED/.test(l)) ? 'REUSED'
        : sl.some((l) => /canonical identity/.test(l)) ? 'MINTED'
        : sl.some((l) => /no identity minted, by design/.test(l)) ? 'NOT_A_PERSON' : 'NOTHING';
      asserts.push(['the declaration outcome is ' + r.expectSupport, got === r.expectSupport,
        'got ' + got + (sl[0] ? '   · ' + sl[0].slice(0, 150) : '')]);
      if (r.expectSupport === 'REFUSED' || r.expectSupport === 'NOTHING') {
        asserts.push(['no required_support identity was issued',
          !issued.some((x) => /:required_support$/.test(x)), JSON.stringify(issued)]);
      }
      if (r.expectSupport === 'REUSED') {
        asserts.push(['no SECOND identity was minted for them',
          !issued.some((x) => /:required_support$/.test(x)), JSON.stringify(issued)]);
      }
      // CLOSED THROUGH ISSUANCE AND STAGING, NOT THROUGH A REFUSAL LOG.
      if (r.forbidDeliveredOnly) {
        asserts.push([r.forbidDeliveredOnly + ' is absent from the DELIVERED roster',
          !new RegExp(r.forbidDeliveredOnly, 'i').test(presentLine), 'got "' + presentLine + '"']);
      }
      if (r.forbidEligible) {
        const rl = (r.logs || []).filter((l) => /\[SCENE1:STAGE:PENDING\]/.test(l))[0] || '';
        const elig = (rl.match(/eligible to appear \[([^\]]*)\]/) || ['', ''])[1];
        asserts.push([r.forbidEligible + ' is NOT eligible to appear',
          elig.indexOf(r.forbidEligible) < 0, 'eligible: [' + elig + ']']);
      }
      if (r.expectRetiredFollowed) {
        const fw = (r.logs || []).filter((l) => /is retired — followed to/.test(l))[0] || '';
        asserts.push(['supersession was FOLLOWED before ownership was judged', !!fw, fw.slice(0, 170)]);
      }
      if (r.expectRefReason) {
        const why = (r.logs || []).filter((l) => /required supporting person REFUSED/.test(l)).join(' ');
        asserts.push(['the refusal names the ' + r.expectRefReason + ' reason, not only availability',
          new RegExp(r.expectRefReason, 'i').test(why), why.slice(0, 190)]);
      }
      if (r.forbidInRoster) {
        asserts.push([r.forbidInRoster + ' is absent from the ISSUED roster',
          !issued.some((x) => new RegExp(r.forbidInRoster, 'i').test(x)), JSON.stringify(issued)]);
        asserts.push([r.forbidInRoster + ' is absent from the DELIVERED roster',
          !new RegExp(r.forbidInRoster, 'i').test(presentLine), 'got "' + presentLine + '"']);
      }
    }
    // THE LI MUST NOT BE A ROSTER ENTRY. Substring matching on the whole line was wrong: a
    // supporting character whose LABEL contains his name ("the friend who came with Julian") made
    // this fail while Julian was nowhere on the stage. The roster is a comma-separated list of
    // entries, so the test is per entry.
    if (cap0) {
      const entries = presentLine.split(',').map((x) => x.trim()).filter(Boolean);
      const liEntry = entries.some((e) => /^julian\b/i.test(e));
      asserts.push(['the love interest is not a roster entry',
        /Julian is offstage/.test(cap0.text) && !liEntry, 'roster entries: ' + JSON.stringify(entries)]);
      // REPORTED, NOT ASSERTED: a staged label that carries the love interest's name is legal
      // here and still reads to the author as if he were in the room. The schema already says a
      // role_label must not contain another person's name; enforcing that would refuse a
      // declaration the review wants accepted, so this is surfaced for a decision rather than
      // silently passed or silently fixed.
      if (!liEntry && entries.some((e) => /julian/i.test(e))) {
        P('    ⚠ a staged label carries the love interest\'s name: '
          + JSON.stringify(entries.filter((e) => /julian/i.test(e)))
          + ' — he is NOT a roster entry, but the line reads as though he were present');
      }
    }
    if (r.expectStageAccepted) {
      const rj = (r.logs || []).filter((l) => /barred from physical presence|whole_contract_rejected/.test(l)).join(' | ');
      asserts.push(['the stage was ACCEPTED (nothing barred)', !rj, rj.slice(0, 200)]);
      asserts.push(['the author was reached', (r.caps || []).length > 0,
        (r.caps || []).length + ' author request(s)']);
    }
    if (r.expectNoAuthor) {
      asserts.push(['the author was NOT reached', !(r.caps || []).length,
        (r.caps || []).length + ' author request(s) captured']);
    }
    if (r.expectStageRejection) {
      const rj = (r.logs || []).filter((l) => /CPLUS:STAGE|STAGE:PLANNER-OWNED:FAULT|whole_contract_rejected|barred from physical presence/.test(l)).join(' | ');
      asserts.push(['the stage refused it, naming the presence restriction',
        new RegExp(r.expectStageRejection.replace(/_/g, '[_ ]')).test(rj) || /barred from physical presence/.test(rj),
        rj.slice(0, 230) || 'no stage rejection logged']);
    }
    asserts.forEach(([n7, ok, detail]) => { if (!ok) fails++;
      P('    ' + (ok ? '✓' : '✗') + ' ' + n7 + (detail ? '   — ' + detail : '')); });
  }
  const sd = stageDecl.filter((x) => x.caseId === r.id)[0];
  if (sd) P('  staging: issued refs ' + JSON.stringify(sd.issuedRefs)
    + ' · wanted a second person: ' + sd.wantSecond
    + ' · declared IN_PERSON ' + JSON.stringify(sd.declared)
    + (sd.wantSecond && !sd.secondAvailable ? '   ← NO SECOND REF WAS ISSUED (see the limitation note)' : ''));
  const cap = r.caps[0];
  if (cap) P('  captured: ' + cap.file + '   system ' + cap.sysChars.toLocaleString()
    + ' + user ' + cap.usrChars.toLocaleString() + ' chars  (' + r.caps.length + ' dispatch attempt(s))');
  if (!cap) { P('  (no request text to inspect — see the refusal above)'); return; }
  const T = cap.text;
  const kept = (String(r.pressure).toLowerCase().match(/[a-z']{5,}/g) || []).filter((w) => T.toLowerCase().includes(w));
  const total = (String(r.pressure).toLowerCase().match(/[a-z']{5,}/g) || []).length;
  const objRequired = r.type === 'object';
  [['the chosen crisis is in the request', kept.length >= Math.ceil(total * 0.6), kept.length + '/' + total + ' words'],
   ['the chosen opening beat is in the request verbatim', T.includes(r.beat), ''],
   ['the chosen decision is in the request verbatim', T.includes(r.decision), ''],
  ].forEach(([n2, ok, d]) => { if (!ok) fails++; P('  ' + (ok ? '✓' : '✗') + ' ' + n2 + (d ? '   — ' + d : '')); });
  // Solo wording is CORRECT once the roster is confirmed solo; it is only a fault when asserted
  // while pending. The confirmed-solo case is expected to carry it.
  const soloConfirmed = r.staging === 'solo';
  // THESE MUST DETECT THE *UNCONDITIONAL* DEMAND, NOT THE MERE PRESENCE OF THE WORDS. A rule
  // that states the requirement and then explicitly exempts a protagonist-alone roster is not a
  // demand for another person; a rule that states it flatly is. The solitary-activity line keeps
  // its phrase in the conditional form, so it is matched only when the exemption does NOT follow
  // it — restore the flat form and this check fails again.
  const unconditionalSolitary = (txt) => {
    const re = /The protagonist alone performing a private task[^\n]{0,400}/g;
    let m;
    while ((m = re.exec(txt))) {
      if (!/WHEN THE STAGED ROSTER PUTS SOMEONE ELSE ON THE PAGE|is not a fault/.test(m[0])) return true;
    }
    return false;
  };
  const SOLO_DEMANDS = [
    ['another character must ADDRESS her (unconditional)', (txt) => /Another character must address the protagonist directly/.test(txt)],
    ['another character must REACT within 120 words (unconditional)', (txt) => /another character must react to or address the player/.test(txt)],
    ['solitary activity FORBIDDEN (unconditional)', unconditionalSolitary],
    // ADDED AFTER READING THE FRESH CAPTURE, not from the scan: two more items in the same block
    // presumed a second person.
    ['atmospheric setting barred only "before interaction"', (txt) => /Atmospheric scene-setting before interaction/.test(txt)],
    ['the FIRST LINE MUST list offers no solo-valid option',
      (txt) => /FIRST LINE MUST:\n/.test(txt) && !/own body or her own act under live pressure/.test(txt)],
    // ROUND 6: the rest of the same block. Each of these was an unconditional assumption that the
    // pressure arrives through someone talking to her.
    ['world texture required to ride "the ongoing exchange"', (txt) => /woven into the ongoing exchange/.test(txt)],
    ['"the addressing character\'s line has forced a visible shift"', (txt) => /The addressing character's line has forced a visible shift/.test(txt)],
    ['pressure source assumes a character exists', (txt) => /The character applying pressure MUST come from a non-authority source/.test(txt)],
    ['"the FIRST EXCHANGE must reveal"', (txt) => /The first exchange MUST reveal/.test(txt)],
    ['world flavour carried only by "the addressing character"', (txt) => /The addressing character carries this world specific power dynamic/.test(txt)],
    ['the TEST demands another character in sentence one',
      (txt) => /Is another character addressing or acting on the protagonist by the end of the first sentence/.test(txt)],
    ['solitude itself banned ("lone woman in solitude")', (txt) => /Lone woman in solitude/.test(txt)],
  ];
  if (r.staging === 'solo') {
    const sdem = SOLO_DEMANDS.filter(([, test]) => test(T)).map(([n6]) => n6);
    if (sdem.length) { fails += sdem.length;
      P('  ✗ ON A SOLO STAGE, the complete request STILL DEMANDS ANOTHER PERSON:');
      sdem.forEach((h) => P('      • ' + h)); }
    else P('  ✓ no instruction in the complete request demands another person on this solo stage');
  }
  const hits = COUNTERMAND.filter(([, re]) => re.test(T)).map(([n3]) => n3)
    .filter((h) => !(soloConfirmed && h === 'solo asserted before the roster is established'));
  if (soloConfirmed) P('  (this case IS confirmed solo, so "only Nadia is present" wording is correct here)');
  const allowed = objRequired ? ['object introduction mandated', 'decision mandated onto an object'] : [];
  const bad = hits.filter((h) => allowed.indexOf(h) < 0);
  if (bad.length) { fails += bad.length;
    P('  ✗ INSTRUCTIONS THAT COUNTERMAND THE CHOSEN CRISIS, in the complete request:');
    bad.forEach((h) => P('      • ' + h)); }
  else P('  ✓ no instruction in the complete request countermands the chosen crisis'
    + (allowed.length && hits.length ? '   (object mandate present, correctly — the pressure IS an object)' : ''));
});
P('\nartifacts: _nf_author_request_out/   ' + (fails ? fails + ' CHECK(S) FAILED' : 'all checks passed'));
P('NOTHING WAS DISPATCHED TO A PROVIDER.');
