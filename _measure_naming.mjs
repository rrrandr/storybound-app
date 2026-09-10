// Raw-reply file naming for the live measurement harness. One place, tested: a later run must NEVER
// overwrite an earlier run's retained reply (the 18:55 planner reply was lost that way on 2026-09-07).
export function runStamp(d) { return (d || new Date()).toISOString().replace(/[:.]/g, '-'); }
export function rawReplyPath(stamp, role, n, dir) {
  const kind = role === 'OPENING_PLANNER' ? 'planner' : role === 'NARRATIVE_AUTHOR_GROK_ONLY' ? 'author' : String(role || 'unknown').toLowerCase();
  return (dir || '_validate_out') + '/scene1_measure_live.rawreply.' + stamp + '.' + kind + '.' + n + '.txt';
}
