// DURABLE-PROPOSAL GRADER. One definition of Roman's pass criteria for the third planner-only
// case, imported by BOTH the live runner and the provider-free grading control.
//
// WHY A SHARED MODULE. Run 4 was nearly paid for with a harness that did not score pressure_scope
// at all — the one measurement the run existed for. A grader that lives only inside the paid
// runner cannot be proven to bite before the money is spent. Putting it here means the criteria
// the control proves RED are byte-identically the criteria the paid run grades.
//
// Roman's criteria, verbatim:
//   · pressure_scope: durable
//   · at least one structured introduced institution/collective
//   · future relevance and aliases
//   · no planner-supplied IDs
//   · no existing canon silently redefined
//
// GRADES THE REPLY, NOT THE HANDLER. Every criterion reads the planner's own envelope. The handler
// is checked separately and afterwards, so a validator bug cannot launder a bad reply into a pass
// (or a good reply into a failure).

const s = (v) => (typeof v === 'string' ? v.trim() : '');
const arr = (v) => (Array.isArray(v) ? v : null);
const DURABLE_KINDS = ['institution', 'collective'];
// The system mints these. A planner-supplied one is a contract violation even if it looks right.
const MINTED_ID_RX = /^ent:stage:\d+$/;

// ── CONTINUING-REFERENT VOCABULARY ───────────────────────────────────────────────────────────
// Deliberately duplicated from public/app.js, because this module runs in node and app.js runs in
// the browser as a plain script — neither can import the other. Duplication is only safe if drift
// is impossible, so _continuation_durable_grading_control.mjs asserts these three lists are
// IDENTICAL to window._CONTINUING_REFERENT_VOCAB. Change one and that parity assertion fails.
export const INSTITUTION_BODY_NOUNS = ['commission', 'commissions', 'council', 'councils', 'assembly',
  'assemblies', 'court', 'courts', 'tribunal', 'tribunals', 'board', 'boards', 'bureau',
  'committee', 'committees', 'authority', 'authorities', 'directorate', 'panel', 'jury',
  'ministry', 'senate', 'synod', 'chancery', 'conclave', 'consortium', 'guild', 'guilds',
  'league', 'lodge', 'syndicate', 'cartel', 'magistracy', 'constabulary', 'garrison',
  'registry', 'inquisition', 'parliament', 'diet', 'curia', 'bench'];
export const INSTITUTION_ADJUNCT_NOUNS = ['chambers', 'chamber', 'clerk', 'clerks', 'warden', 'wardens',
  'provost', 'prefect', 'magistrate', 'magistrates', 'registrar', 'bailiff', 'steward',
  'inquisitor', 'adjudicator', 'arbiter', 'session', 'sessions', 'hearing', 'hearings',
  'inquiry', 'inquiries', 'inquest', 'docket', 'summons', 'writ', 'ruling', 'rulings',
  'jurisdiction', 'quorum', 'charter', 'members', 'membership', 'offices', 'officers'];
export const PERSISTENCE_FIELDS = ['forward_pressure', 'branch_a', 'branch_b', 'exit_state'];

const esc = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CAP_RX = /\b(?:[Tt]he|[Aa]n?)\s+((?:[A-Z][a-z]+(?:['’]s)?\s+)*[A-Z][a-z]+)\b/g;
const BODY_RX = new RegExp('\\b(?:the|a|an|its|their|his|her|our|this|that|those|these)\\s+'
  + '((?:[a-z][a-z\\-\']*\\s+){0,2}(?:' + INSTITUTION_BODY_NOUNS.map(esc).join('|') + '))\\b', 'gi');
const ADJUNCT_RX = new RegExp('\\b(?:the|its|their|his|her|our|this|that)\\s+'
  + '((?:[a-z][a-z\\-\']*\\s+){0,2}(?:' + INSTITUTION_ADJUNCT_NOUNS.map(esc).join('|') + '))\\b', 'gi');

const hitsIn = (text, known) => {
  const out = [], seen = {};
  const str = String(text || '');
  const isKnown = (p) => {
    const low = p.toLowerCase().replace(/^(?:the|a|an|its|their|his|her|our|this|that|those|these)\s+/, '');
    return !low || known.some(k => k === low || low.indexOf(k) >= 0 || (k.length > 3 && k.indexOf(low) >= 0));
  };
  const push = (phrase, tier) => {
    const p = String(phrase).trim(), low = p.toLowerCase();
    if (!p || seen[low] || isKnown(p)) return;
    seen[low] = 1; out.push({ phrase: p, head: low.split(/\s+/).pop(), tier });
  };
  let m;
  CAP_RX.lastIndex = 0; while ((m = CAP_RX.exec(str)) !== null) if (s(m[1])) push(m[1], 'A');
  BODY_RX.lastIndex = 0; while ((m = BODY_RX.exec(str)) !== null) if (s(m[1])) push(m[1], 'B');
  ADJUNCT_RX.lastIndex = 0; while ((m = ADJUNCT_RX.exec(str)) !== null) if (s(m[1])) push(m[1], 'C');
  return out;
};

// Which continuing bodies does this proposal NAME, and which does it RELY ON? "Rely on" means the
// same head noun surfaces in two or more fields that reach beyond this scene — the proposal's own
// later branch or exit state assumes that body is still there.
export function detectContinuingReferents(reply, knownNames) {
  const r = (reply && typeof reply === 'object') ? reply : {};
  const known = (arr(knownNames) || []).map(x => String(x).toLowerCase()).filter(Boolean);
  const inPressure = hitsIn(r.forward_pressure, known);
  const byHead = {};
  const note = (field, hit) => {
    byHead[hit.head] = byHead[hit.head] || { head: hit.head, fields: [], phrases: [] };
    if (byHead[hit.head].fields.indexOf(field) === -1) byHead[hit.head].fields.push(field);
    if (byHead[hit.head].phrases.indexOf(hit.phrase) === -1) byHead[hit.head].phrases.push(hit.phrase);
  };
  PERSISTENCE_FIELDS.forEach(f => hitsIn(r[f], known).forEach(h => note(f, h)));
  if (r.event_slots && r.event_slots.exit_state) {
    hitsIn(r.event_slots.exit_state, known).forEach(h => note('event_slots.exit_state', h));
  }
  const relied = Object.keys(byHead).map(k => byHead[k]).filter(g => g.fields.length >= 2);
  return { inPressure, relied };
}

// SCOPE COHERENCE, graded for EVERY case, not just case C. A scene_local declaration that names or
// relies on a continuing institution is the defect live case C exhibited and the old guard missed.
export function gradeScopeCoherence(E, knownNames) {
  const out = [];
  // `whenFailed` is the phrasing used when this check FAILS. Check NAMES are written as the
  // passing condition ("forward_pressure names NO continuing referent"), which reads as the
  // OPPOSITE of what happened when it is listed as a reason — run 10 reported exactly that
  // inversion. Reasons now come from whenFailed, and anything lacking one is prefixed so the
  // polarity can never be ambiguous.
  const t = (name, ok, detail, whenFailed) => out.push({ name, ok: !!ok,
    detail: detail == null ? '' : String(detail), whenFailed: whenFailed || null });
  const scope = E && E.pressure_scope;
  if (scope !== 'scene_local') {
    t('scope coherence: not a scene_local declaration, nothing to check', true, 'scope=' + JSON.stringify(scope));
    return out;
  }
  const d = detectContinuingReferents(E, knownNames);
  t('scene_local: forward_pressure names NO continuing referent', d.inPressure.length === 0,
    JSON.stringify(d.inPressure.map(x => x.phrase)),
    'declared scene_local, but forward_pressure NAMES a continuing referent: '
      + JSON.stringify(d.inPressure.map(x => x.phrase)));
  t('scene_local: the proposal does not RELY on a continuing body persisting', d.relied.length === 0,
    JSON.stringify(d.relied.map(g => ({ phrases: g.phrases, fields: g.fields }))),
    'declared scene_local, but the proposal RELIES on a continuing body persisting: '
      + JSON.stringify(d.relied.map(g => g.phrases.join('/') + ' in ' + g.fields.join('+'))));
  return out;
}

// ── SAMPLE CLASSIFIER ────────────────────────────────────────────────────────────────────────
// Roman's four buckets for the reliability measurement. Lives here, with the rest of the shared
// grading, so the classifier the paid sampling run uses is the one a provider-free control can
// prove RED first — the same reason gradeDurable lives here.
//
//   envelope_violation  one of the five required keys is missing or malformed. Checked FIRST: a
//                       reply that is not a valid envelope cannot be classified as either path.
//   valid_durable       pressure_scope "durable", every one of Roman's five pass criteria met,
//                       derivation present, AND the handler sealed it. Nothing less counts.
//   valid_scene_local   pressure_scope "scene_local", coherent (names no continuing referent and
//                       relies on none), AND the handler accepted it as a no-change continuation.
//   incoherent          a well-formed envelope the validator refused — run 7's scene_local-while-
//                       relying, and run 6's durable-missing-derivation both land here.
//
// `pathChosen` is reported ALONGSIDE the buckets because it answers the actual question — whether
// the planner reliably CHOOSES the durable path — which the four buckets alone blur: run 6 chose
// durable and still landed in `incoherent`.
//   void                a TRANSPORT failure, not a model fault: the planner never replied, so
//                       there was no envelope to violate. Run 9 returned
//                       "NO_RESPONSE_FROM_FUNCTION" from the local proxy on all three samples and
//                       my classifier filed them as envelope violations — which would have read
//                       as planner non-compliance for a model that was never reached. A void
//                       sample is NOT a data point and is excluded from every rate.
//
// `transport` is how void is told apart from a real contract failure. The discriminator is whether
// a non-empty CONTENT string came back: content present means the model spoke, so a missing or
// malformed envelope is ITS fault; no content means nothing reached us and the sample is void.
// A FAILED check's reason. Prefers the explicit failure phrasing; falls back to the check name with
// an unmistakable prefix, so a reason can never read as the condition that was satisfied.
function reasonOf(c) {
  if (c && c.whenFailed) return String(c.whenFailed);
  return 'FAILED CHECK: ' + String((c && c.name) || '').trim();
}

export function classifySample(E, after, ledgerBefore, transport) {
  const tr = transport || null;
  if (tr) {
    if (tr.dispatched === false) {
      return { bucket: 'void', pathChosen: null, why: ['no planner call was dispatched'] };
    }
    if (tr.error) {
      return { bucket: 'void', pathChosen: null, why: ['transport error: ' + String(tr.error)] };
    }
    if (!s(tr.content)) {
      return { bucket: 'void', pathChosen: null,
        why: ['the planner returned no content' + (tr.bodySnippet ? ': ' + String(tr.bodySnippet).slice(0, 120) : '')] };
    }
  }
  const r = (E && typeof E === 'object') ? E : null;
  // Content came back but no envelope could be parsed out of it — the model DID reply, and what it
  // replied with is not a valid envelope. Without transport info we cannot tell this from void, so
  // we say so rather than guessing a bucket.
  if (!r) return { bucket: tr ? 'envelope_violation' : 'void', pathChosen: null,
    why: [tr ? 'content returned but no envelope could be parsed from it'
             : 'no parseable reply and no transport information — cannot attribute'] };
  const why = [];
  const has = (k) => Object.prototype.hasOwnProperty.call(r, k);
  if (!s(r.scene_purpose)) why.push('scene_purpose missing or empty');
  if (!s(r.forward_pressure)) why.push('forward_pressure missing or empty');
  const literal = (r.pressure_scope === 'scene_local' || r.pressure_scope === 'durable');
  if (!literal) why.push('pressure_scope not a contract literal: ' + JSON.stringify(r.pressure_scope));
  if (!has('canon_change')) why.push('canon_change key absent');
  if (!has('introduces') || !arr(r.introduces)) why.push('introduces missing or not an array');
  // pathChosen is ONLY ever a contract literal or null. Echoing an invalid value here ("permanent")
  // would quietly drop that sample from the durable/scene_local/none tally, so the raw value is
  // preserved in `why` instead and the path reads as "none chosen".
  if (why.length) return { bucket: 'envelope_violation', pathChosen: literal ? r.pressure_scope : null, why };

  const pathChosen = r.pressure_scope;
  const sealed = !!(after && after.ctResult && after.ctResult.outcome === 'sealed');
  const accepted = !!(after && after.ctResult && after.ctResult.outcome === 'none');
  const rejectWhy = (after && after.ctResult && after.ctResult.why) || [];

  if (pathChosen === 'durable') {
    const reds = gradeDurable(r, after, ledgerBefore).filter(c => !c.ok).map(reasonOf);
    if (reds.length === 0 && sealed) return { bucket: 'valid_durable', pathChosen, why: [] };
    return { bucket: 'incoherent', pathChosen,
      why: reds.length ? reds : (rejectWhy.length ? rejectWhy : ['durable but not sealed']) };
  }
  const coh = gradeScopeCoherence(r, (arr(ledgerBefore) || []).flatMap(e =>
    [s(e.label).toLowerCase()].concat((arr(e.aliases) || []).map(a => s(a).toLowerCase()))).filter(Boolean));
  const cohReds = coh.filter(c => !c.ok).map(reasonOf);
  if (cohReds.length === 0 && accepted) return { bucket: 'valid_scene_local', pathChosen, why: [] };
  return { bucket: 'incoherent', pathChosen,
    why: cohReds.length ? cohReds : (rejectWhy.length ? rejectWhy : ['scene_local but not accepted']) };
}

// ledgerBefore: [{ id, kind, label, aliases }] — the established register BEFORE the reply.
// after:        { ctResult, facts, sealed, ledger, localPressures }
export function gradeDurable(E, after, ledgerBefore) {
  const out = [];
  // `whenFailed` is the phrasing used when this check FAILS. Check NAMES are written as the
  // passing condition ("forward_pressure names NO continuing referent"), which reads as the
  // OPPOSITE of what happened when it is listed as a reason — run 10 reported exactly that
  // inversion. Reasons now come from whenFailed, and anything lacking one is prefixed so the
  // polarity can never be ambiguous.
  const t = (name, ok, detail, whenFailed) => out.push({ name, ok: !!ok,
    detail: detail == null ? '' : String(detail), whenFailed: whenFailed || null });
  const before = arr(ledgerBefore) || [];
  const beforeIds = before.map(e => e.id);
  // Established NAMES the planner must not quietly repurpose: labels and aliases alike.
  const beforeNames = [];
  before.forEach(e => { if (s(e.label)) beforeNames.push(s(e.label).toLowerCase());
    (arr(e.aliases) || []).forEach(a => { if (s(a)) beforeNames.push(s(a).toLowerCase()); }); });

  // ── 1. the scope itself
  t('pressure_scope is exactly "durable"', E.pressure_scope === 'durable', JSON.stringify(E.pressure_scope),
    'pressure_scope is ' + JSON.stringify(E.pressure_scope) + ', not "durable"');
  // And when it is NOT durable, say WHY that is incoherent rather than only that it is wrong: a
  // scene_local declaration that names or relies on a continuing institution is the exact defect
  // live case C exhibited. Established names are exempt — referencing canon is not creation.
  gradeScopeCoherence(E, beforeNames).forEach(c => out.push(c));

  // ── 2. at least one STRUCTURED introduced institution/collective
  const intro = arr(E.introduces) || [];
  const structured = intro.filter(x => x && typeof x === 'object' && !Array.isArray(x));
  t('introduces is an array', !!arr(E.introduces), JSON.stringify(E.introduces));
  t('  it is not empty', structured.length > 0, 'structured entries=' + structured.length,
    'introduces[] contains no structured entity');
  const bodies = structured.filter(x => DURABLE_KINDS.indexOf(s(x.kind)) >= 0);
  t('  at least one entry is an institution or collective', bodies.length > 0,
    'kinds=' + JSON.stringify(structured.map(x => s(x.kind))),
    'no introduced entity is an institution or collective; kinds were '
      + JSON.stringify(structured.map(x => s(x.kind))));

  // ── 3. future relevance and aliases, on every introduced entity
  //     Checked on ALL entries, not just the institution: a half-declared companion entity is the
  //     same defect. An institution with no alias at all is a reportable miss, not a soft pass —
  //     Roman named aliases as a pass requirement.
  structured.forEach((x, i) => {
    const tag = '  entry ' + i + ' (' + (s(x.label) || '?') + ')';
    t(tag + ': label is non-empty', !!s(x.label));
    t(tag + ': kind is declared', !!s(x.kind), JSON.stringify(x.kind));
    t(tag + ': future_relevance is non-empty', !!s(x.future_relevance), JSON.stringify(x.future_relevance),
      tag + ' has no future_relevance');
    t(tag + ': justification is non-empty', !!s(x.justification), JSON.stringify(x.justification));
    const al = arr(x.aliases);
    t(tag + ': aliases is a non-empty array of strings',
      !!al && al.length > 0 && al.every(a => !!s(a)), JSON.stringify(x.aliases),
      tag + ' declares no usable aliases (got ' + JSON.stringify(x.aliases) + ')');
  });

  // ── 3b. DERIVATION, required IF AND ONLY IF canon_change is non-null.
  //     Added after the live case C rerun, where the planner met all five of Roman's criteria and
  //     was still refused for a missing derivation. Graded as a BICONDITIONAL, not a requirement:
  //     demanding it on a null-change scene would be the mirror defect, since the field is owed
  //     for the CHANGE and not for the scene.
  //     The condition is "proposes something durable" — a non-null canon_change OR a non-empty
  //     introduces — because that is what the validator actually enforces. Grading the narrower
  //     "iff canon_change" version would pass a reply the validator then refuses.
  const hasChangeObj = !!(E.canon_change && typeof E.canon_change === 'object');
  const proposesDurable = hasChangeObj || (arr(E.introduces) || []).length > 0;
  if (proposesDurable) {
    t('derivation is present (this envelope proposes something durable, so it is owed)',
      !!s(E.derivation), JSON.stringify(E.derivation),
      'something durable is proposed but "derivation" is missing or empty');
  } else {
    t('derivation is not required (nothing durable proposed)', true,
      E.derivation == null ? 'absent, as expected' : 'supplied anyway, which is harmless');
  }

  // ── 4. NO planner-supplied ids, by any route
  const introIds = structured.filter(x => x.id || x.recordId).map(x => x.id || x.recordId);
  t('no id on any introduced entity', introIds.length === 0, JSON.stringify(introIds),
    'the planner supplied its own entity id(s): ' + JSON.stringify(introIds));
  const ch = (E.canon_change && typeof E.canon_change === 'object') ? E.canon_change : null;
  t('no id on canon_change', !ch || (!ch.id && !ch.recordId), JSON.stringify(ch && (ch.id || ch.recordId)));
  // existingRefs is the subtle route: an INVENTED "ent:stage:7" is a planner-supplied id wearing
  // the system's own format. Every ref must resolve to something that existed before the reply.
  const refs = arr(E.existingRefs) || [];
  const bogus = refs.filter(r => beforeIds.indexOf(s(r)) === -1);
  t('every existingRefs entry resolves to a pre-existing entity', bogus.length === 0, JSON.stringify(bogus));
  const invented = refs.filter(r => MINTED_ID_RX.test(s(r)) && beforeIds.indexOf(s(r)) === -1);
  t('  none is a fabricated system-format id', invented.length === 0, JSON.stringify(invented));

  // ── 5. no EXISTING canon silently redefined
  //     "Silently" is the operative word. Altering established canon is legal at Tier 3 WITH a
  //     resolvable basis; what is forbidden is doing it as an additive change, or without one.
  const targets = (arr(ch && ch.targets) || []).map(x => s(x));
  const declaredLabels = structured.map(x => s(x.label).toLowerCase());
  const hitsEstablished = targets.filter(x => beforeIds.indexOf(x) >= 0
    || (beforeNames.indexOf(x.toLowerCase()) >= 0 && declaredLabels.indexOf(x.toLowerCase()) === -1));
  const tier = ch ? ch.tier : null;
  const basis = (ch && ch.basis && typeof ch.basis === 'object') ? ch.basis : null;
  if (hitsEstablished.length === 0) {
    t('no established entity is targeted at all (purely additive)', true,
      'targets=' + JSON.stringify(targets));
  } else {
    t('an established entity is targeted — so it is Tier 3', tier === 3,
      'targets=' + JSON.stringify(hitsEstablished) + ' tier=' + JSON.stringify(tier));
    t('  and it carries a complete basis', !!basis && !!s(basis.kind) && !!s(basis.ref)
      && !!s(basis.causal_chain), JSON.stringify(basis));
  }
  // And the record-level check: whatever the reply claimed, the established entities themselves
  // must come out the far side unchanged. Identity, not count.
  const afterLedger = arr(after && after.ledger) || [];
  const key = (e) => [e.id, s(e.kind), s(e.label), JSON.stringify(arr(e.aliases) || [])].join('|');
  const beforeMap = {}; before.forEach(e => { beforeMap[e.id] = key(e); });
  const mutated = afterLedger.filter(e => beforeMap[e.id] && beforeMap[e.id] !== key(e))
    .map(e => ({ id: e.id, was: beforeMap[e.id], now: key(e) }));
  t('every pre-existing entity record is unchanged', mutated.length === 0, JSON.stringify(mutated));
  const vanished = beforeIds.filter(id => !afterLedger.some(e => e.id === id));
  t('  and none was removed', vanished.length === 0, JSON.stringify(vanished));

  return out;
}

// THE HANDLER'S SIDE, graded separately and only after the reply has been graded on its own.
export function gradeHandler(E, after, ledgerBefore) {
  const out = [];
  // `whenFailed` is the phrasing used when this check FAILS. Check NAMES are written as the
  // passing condition ("forward_pressure names NO continuing referent"), which reads as the
  // OPPOSITE of what happened when it is listed as a reason — run 10 reported exactly that
  // inversion. Reasons now come from whenFailed, and anything lacking one is prefixed so the
  // polarity can never be ambiguous.
  const t = (name, ok, detail, whenFailed) => out.push({ name, ok: !!ok,
    detail: detail == null ? '' : String(detail), whenFailed: whenFailed || null });
  const beforeIds = (arr(ledgerBefore) || []).map(e => e.id);
  const R = after || {};
  const res = R.ctResult || null;

  t('the handler SEALED the proposal', !!res && res.outcome === 'sealed',
    JSON.stringify(res && (res.why || res.outcome)));
  t('  it was not rejected as a persistence violation', !(res && res.persistenceViolation === true),
    JSON.stringify(res && res.why));
  const ctSeals = (arr(R.sealed) || []).filter(x => x && x.kind === 'continuation');
  t('  exactly one CONTINUATION-kind seal exists', ctSeals.length === 1,
    'kinds=' + JSON.stringify((arr(R.sealed) || []).map(x => x && x.kind)));
  const rec = ctSeals[0] || null;
  t('  the seal carries the untruncated fact', !!rec && !!s(rec.fact), JSON.stringify(rec && rec.fact));

  // PENDING, NOT ACTIVE. Sealing writes no fact and admits nothing to the register; the boundary
  // the pending/active split exists to hold.
  const pending = rec ? (arr(rec.pendingEntities) || []) : [];
  t('  its pending entities carry BACKEND-MINTED ids', pending.length > 0
    && pending.every(e => MINTED_ID_RX.test(s(e.id))), JSON.stringify(pending.map(e => e && e.id)));
  t('  none of those ids existed before the reply',
    pending.every(e => beforeIds.indexOf(s(e.id)) === -1), JSON.stringify(pending.map(e => e && e.id)));
  t('ZERO facts activated — sealing is not committing', (arr(R.facts) || []).length === 0,
    'facts=' + ((arr(R.facts) || []).length));
  const unplanned = (arr(R.ledger) || []).filter(e => beforeIds.indexOf(e.id) === -1
    && !pending.some(p => s(p.id) === e.id));
  t('no unplanned entity entered the ledger', unplanned.length === 0,
    JSON.stringify(unplanned.map(e => ({ id: e.id, label: e.label }))));
  return out;
}
