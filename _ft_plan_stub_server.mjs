// A PURE FORWARDER (Roman 2026-11-18)
//
// This process used to answer calls, and that is what broke the prose run twice over:
//
//   · it indexed the paid replies BY ROLE, and PRIMARY_AUTHOR is the role of both planning legs
//     AND of the prose author — so the author was handed the 14,611-byte scaffold reply in 5ms
//     and no prose was written.
//   · it answered AFTER the budget reservation, serving the paid bodies verbatim with their own
//     `usage` receipts still attached, so the runner settled $0.013944 for calls that never left
//     the machine.
//   · and its forwarding branch was never actually in the file — an earlier patch of mine
//     silently failed to apply, so "forwarded 0" meant there was no forwarding code at all,
//     not that nothing needed forwarding. Rewritten whole rather than patched again.
//
// The two planning legs are now replayed inside the runner, keyed on their operation and
// answered before any reservation (SB_REUSE_SCENE_PLANNER / SB_REUSE_SCAFFOLD). So this process
// has exactly one job: pass everything through to the real API and report what it passed. It
// cannot answer a call, which means it cannot publish a planning reply as prose.
import http from 'node:http';

const PORT = Number(process.env.PORT || 3997);
const FORWARD = String(process.env.SB_STUB_FORWARD || 'http://localhost:3010').replace(/\/$/, '');

const seen = { forwarded: 0, failed: 0 };
const srv = http.createServer((req, res) => {
  let buf = '';
  req.on('data', (d) => { buf += d; });
  req.on('end', async () => {
    let role = '(none)';
    try { role = String((JSON.parse(buf) || {}).role || '(none)'); } catch (_) {}
    const target = FORWARD + req.url;
    const t0 = Date.now();
    try {
      const r = await fetch(target, {
        method: req.method,
        headers: { 'content-type': 'application/json' },
        body: (req.method === 'GET' || req.method === 'HEAD') ? undefined : (buf || undefined),
      });
      const text = await r.text();
      seen.forwarded += 1;
      console.log('[FWD] #' + seen.forwarded + ' ' + role.padEnd(22)
        + String(buf.length).padStart(7) + ' chars → ' + r.status
        + ' in ' + (Date.now() - t0) + 'ms  ' + req.url);
      res.writeHead(r.status, {
        'content-type': r.headers.get('content-type') || 'application/json',
        'content-length': Buffer.byteLength(text),
      });
      return res.end(text);
    } catch (e) {
      seen.failed += 1;
      console.log('[FWD] FAILED ' + role + ' → ' + target + ': ' + (e && e.message));
      const body = JSON.stringify({ error: 'forward_failed', detail: String(e && e.message) });
      res.writeHead(502, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
      return res.end(body);
    }
  });
});
// A BIND FAILURE IS LOUD. Running against whatever else holds the port is how an arm reports a
// verdict about the wrong server.
srv.on('error', (e) => {
  console.error('[FWD] CANNOT BIND ' + PORT + ': ' + e.code
    + ' — refusing to run rather than let the run use another listener');
  process.exit(3);
});
srv.listen(PORT, () => {
  console.log('[FWD] listening on ' + PORT + ' — forwarding every call to ' + FORWARD);
  console.log('[FWD] this process answers NOTHING; the planning legs are replayed in the runner');
});
process.on('SIGTERM', () => {
  console.log('[FWD] forwarded ' + seen.forwarded + ', failed ' + seen.failed);
  srv.close(() => process.exit(0));
});
