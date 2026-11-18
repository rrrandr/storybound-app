// ANSWER THE SETUP CALLS SO THE TURN REACHES THE AUTHOR, AND NOTHING ELSE (Roman 2026-11-18)
//
// The offline handoff needs the turn to run all the way to Luna's request. That means the small
// setup calls have to be answered, and it must be impossible for this process to answer the
// prose author — the exact mistake that wrote no prose on the first Scene 2 attempt, when a
// role-keyed stub handed the author a 14,611-byte scaffold reply in 5ms.
//
// So the allowlist here is explicit and narrow:
//
//   NORMALIZATION         answered, per AXIS, echoing THIS run's reader input
//   BACK_COVER_SYNOPSIS   answered from the preserved Scene 2 reply
//   STRATEGY_PASS         answered from the preserved Scene 2 reply
//   PRIMARY_AUTHOR        NEVER answered, at any size, for any reason
//   everything else       503, recorded
//
// NORMALIZATION is not replayed from Scene 2. That reply carries Scene 2's own
// `canonical_instruction` ("Escalate it — say the worst true thing in the room..."), and serving
// it would hand the author the PREVIOUS scene's action and make the delivery test report a
// failure that is purely the fixture's. Instead the reply keeps the preserved reply's exact
// SHAPE and carries this run's actual reader input, with changed:false — the honest outcome for
// an action that needs no substitution, which is also what Scene 2's real reply returned.
import http from 'node:http';
import fs from 'node:fs';

const PORT = Number(process.env.PORT || 3992);
const RUN = process.env.SB_SETUP_SRC
  || '/Users/romantsukerman/storybound-app/_ft_scene2_prose/run_2026-11-18T09-59-30-240Z_65804/';
const DO = process.env.SB_SETUP_DO || '';
const SAY = process.env.SB_SETUP_SAY || '';

const ALLOWED = new Set(['NORMALIZATION', 'BACK_COVER_SYNOPSIS', 'STRATEGY_PASS']);
const NEVER = new Set(['PRIMARY_AUTHOR', 'LINE_EDITOR', 'SPECIALIST_RENDERER', 'INTIMACY_SPECIALIST']);

const preserved = {};
for (const f of fs.readdirSync(RUN)) {
  const m = f.match(/^response_r\d+_([A-Z_]+)_200\.json$/);
  if (!m) continue;
  const role = m[1];
  if (!ALLOWED.has(role) || preserved[role]) continue;
  try {
    const rec = JSON.parse(fs.readFileSync(RUN + f, 'utf8'));
    // Receipts are stripped: a replayed body that still carries `usage` gets SETTLED as real
    // usage (it reported $0.013944 of phantom spend once already).
    const body = JSON.parse(String(rec.bodyComplete || '{}'));
    delete body.usage;
    preserved[role] = JSON.stringify(body);
  } catch (_) {}
}
console.log('[SETUP] preserved replies loaded for: ' + Object.keys(preserved).join(', '));

const normFor = (axis) => {
  const text = /dialogue|said|say/i.test(String(axis || '')) ? SAY : DO;
  const inner = JSON.stringify({ canonical_instruction: text, changed: false,
    substitutions: [], rejection_reason: 'null' }, null, 2);
  return JSON.stringify({ ok: true, content: inner, canonical_instruction: text,
    changed: false, substitutions: [], rejection_reason: 'null',
    _orchestration: { role: 'NORMALIZATION', model: 'gpt-4o-mini', tier_used: null,
      timestamp: new Date().toISOString() },
    usage: null });
};

const seen = { answered: 0, refused: 0, byRole: {} };
const srv = http.createServer((req, res) => {
  let buf = '';
  req.on('data', (d) => { buf += d; });
  req.on('end', () => {
    let j = null; try { j = JSON.parse(buf); } catch (_) {}
    const role = String((j && j.role) || '');
    const axis = String((j && j.axis) || '');
    seen.byRole[role || '(none)'] = (seen.byRole[role || '(none)'] || 0) + 1;
    const send = (code, body) => {
      const t = typeof body === 'string' ? body : JSON.stringify(body);
      res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(t) });
      res.end(t);
    };
    if (/\/api\/config/.test(req.url)) return send(200, { ok: true, stub: true });
    if (/\/api\/(beta-events|geo)/.test(req.url)) return send(200, { ok: true });

    if (NEVER.has(role)) {
      seen.refused += 1;
      console.log('[SETUP] REFUSED ' + role + ' (' + buf.length + ' chars) — this process never '
        + 'answers the author or an editor');
      return send(503, { error: 'setup_server_never_answers_this_role', role });
    }
    if (role === 'NORMALIZATION') {
      seen.answered += 1;
      console.log('[SETUP] NORMALIZATION axis=' + (axis || '(none)') + ' ← this run’s own reader input');
      return send(200, normFor(axis));
    }
    if (ALLOWED.has(role) && preserved[role]) {
      seen.answered += 1;
      console.log('[SETUP] ' + role + ' ← preserved Scene 2 reply (' + preserved[role].length + ' bytes)');
      return send(200, preserved[role]);
    }
    seen.refused += 1;
    console.log('[SETUP] 503 ' + (role || '(no role)') + ' ' + buf.length + ' chars  ' + req.url);
    return send(503, { error: 'offline_setup_server: captured, never sent', role: role || null });
  });
});
srv.on('error', (e) => {
  console.error('[SETUP] CANNOT BIND ' + PORT + ': ' + e.code);
  process.exit(3);
});
srv.listen(PORT, () => console.log('[SETUP] listening on ' + PORT
  + ' — answers NORMALIZATION / BACK_COVER_SYNOPSIS / STRATEGY_PASS, never the author'));
process.on('SIGTERM', () => {
  console.log('[SETUP] answered ' + seen.answered + ', refused ' + seen.refused
    + ' · by role: ' + JSON.stringify(seen.byRole));
  srv.close(() => process.exit(0));
});
