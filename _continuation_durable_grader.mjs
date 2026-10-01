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

// ledgerBefore: [{ id, kind, label, aliases }] — the established register BEFORE the reply.
// after:        { ctResult, facts, sealed, ledger, localPressures }
export function gradeDurable(E, after, ledgerBefore) {
  const out = [];
  const t = (name, ok, detail) => out.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) });
  const before = arr(ledgerBefore) || [];
  const beforeIds = before.map(e => e.id);
  // Established NAMES the planner must not quietly repurpose: labels and aliases alike.
  const beforeNames = [];
  before.forEach(e => { if (s(e.label)) beforeNames.push(s(e.label).toLowerCase());
    (arr(e.aliases) || []).forEach(a => { if (s(a)) beforeNames.push(s(a).toLowerCase()); }); });

  // ── 1. the scope itself
  t('pressure_scope is exactly "durable"', E.pressure_scope === 'durable', JSON.stringify(E.pressure_scope));

  // ── 2. at least one STRUCTURED introduced institution/collective
  const intro = arr(E.introduces) || [];
  const structured = intro.filter(x => x && typeof x === 'object' && !Array.isArray(x));
  t('introduces is an array', !!arr(E.introduces), JSON.stringify(E.introduces));
  t('  it is not empty', structured.length > 0, 'structured entries=' + structured.length);
  const bodies = structured.filter(x => DURABLE_KINDS.indexOf(s(x.kind)) >= 0);
  t('  at least one entry is an institution or collective', bodies.length > 0,
    'kinds=' + JSON.stringify(structured.map(x => s(x.kind))));

  // ── 3. future relevance and aliases, on every introduced entity
  //     Checked on ALL entries, not just the institution: a half-declared companion entity is the
  //     same defect. An institution with no alias at all is a reportable miss, not a soft pass —
  //     Roman named aliases as a pass requirement.
  structured.forEach((x, i) => {
    const tag = '  entry ' + i + ' (' + (s(x.label) || '?') + ')';
    t(tag + ': label is non-empty', !!s(x.label));
    t(tag + ': kind is declared', !!s(x.kind), JSON.stringify(x.kind));
    t(tag + ': future_relevance is non-empty', !!s(x.future_relevance), JSON.stringify(x.future_relevance));
    t(tag + ': justification is non-empty', !!s(x.justification), JSON.stringify(x.justification));
    const al = arr(x.aliases);
    t(tag + ': aliases is a non-empty array of strings',
      !!al && al.length > 0 && al.every(a => !!s(a)), JSON.stringify(x.aliases));
  });

  // ── 4. NO planner-supplied ids, by any route
  const introIds = structured.filter(x => x.id || x.recordId).map(x => x.id || x.recordId);
  t('no id on any introduced entity', introIds.length === 0, JSON.stringify(introIds));
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
  const t = (name, ok, detail) => out.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) });
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
