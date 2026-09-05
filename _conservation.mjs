// SINGLE authoritative conservation implementation. Both the standalone checker and the capture
// harness MUST import this — duplicate invariants drift (see: duplicate price tables, 2026-08-16).
export function checkConservation(events, grokRaw){
  const isAuthorAttempt = e => /_authorChatCapture|generateOrchestatedTurn/.test(String(e.label||''));
  const arEvents = events.filter(e => e.sid === 'AUTHOR_RETURN' || /_authorChatCapture|generateOrchestatedTurn/.test(String(e.label||'')));
  const fp       = events.filter(e => e.site === 'FINAL_PROSE').pop();
  // AUTHORITY BY CONTINUITY (2026-08-17). Order does NOT identify the winning author call: B/t2 had two
  // genuine AUTHOR_RETURNs where the LAST (1802) was not the one feeding the chain (4811). Select the
  // candidate whose output byte-matches the first authoritative downstream event's `before`. Never select
  // by last/first, model, timing, length, or presumed retry semantics.
  if (arEvents.length === 0) return {ok:false, reason:'no author-class boundary event fired'};
  if (!fp)                   return {ok:false, reason:'FINAL_PROSE never reached'};
  const isChainEvent = e => (e.sid || typeof e.site === 'number') && !isAuthorAttempt(e)
                            && e.sid !== 'AUTHOR_RETURN' && e.site !== 'FINAL_PROSE' && e.site !== 'DELIVERED';
  // AUTHOR_RETURN is NOT a universal boundary — it is one output of one author architecture. The universal
  // boundary is: whichever author-class generation actually feeds the continuation chain. Candidates include
  // AUTHOR_RETURN *and* the continuation's own _authorChatCapture / generateOrchestatedTurn sites.
  const candidates = events.filter(e => e.sid === 'AUTHOR_RETURN' || isAuthorAttempt(e));
  const firstCand = events.indexOf(candidates[0]);
  const entrance = events.slice(firstCand+1).find(isChainEvent);
  if (!entrance) return {ok:false, reason:'no authoritative downstream event after author boundary'};
  // NESTING COLLAPSE: an inner author boundary (AUTHOR_RETURN) and the outer assignment that captures
  // its return are the SAME generation observed twice — identical `after`, adjacent events. Collapse to
  // the OUTERMOST observation (the assignment that actually populates `raw`). This is duplicate-observation
  // recognition, not a tiebreak between rival authors; genuinely different outputs still fail as ambiguous.
  const rawMatches = candidates.filter(a => a.after === entrance.before);
  const matches = rawMatches.filter((a,i) => {
    const other = rawMatches.find((b,j) => j!==i && b.after===a.after
      && Math.abs(events.indexOf(b)-events.indexOf(a))<=1);
    return !other || events.indexOf(a) > events.indexOf(other);   // keep the outer/later observation
  });
  if (matches.length === 0) return {ok:false, reason:'HARNESS FAILURE: no author output feeds observed chain',
    entranceBeforeLen:String(entrance.before||'').length, candidates:arEvents.map(a=>String(a.after||'').length)};
  if (matches.length > 1)  return {ok:false, reason:'HARNESS FAILURE: ambiguous author source'};
  const authorReturn = matches[0];
  const idx   = events.indexOf(entrance);
  const chain = events.slice(idx).filter(isChainEvent);
  let prev = authorReturn.after;
  for (let i=0;i<chain.length;i++){
    const c = chain[i];
    if (c.before !== undefined && c.before !== prev)
      return {ok:false, reason:`discontinuity before "${c.label||c.sid}"`,
              expectedLen:String(prev||'').length, actualLen:String(c.before||'').length, index:i};
    prev = c.after !== undefined ? c.after : prev;
  }
  if (prev !== fp.after)
    return {ok:false, reason:'terminal state != FINAL_PROSE',
            terminalLen:String(prev||'').length, finalLen:String(fp.after||'').length};
  return {ok:true, authorBoundary:(authorReturn.label||authorReturn.sid), authorAttempts:arEvents.length, links:chain.length, changed:chain.filter(c=>c.changed).length,
          grokRaw:String(grokRaw||'').length, authorReturn:String(authorReturn.after||'').length,
          final:String(fp.after||'').length};
}
