// DIAGNOSTIC ONLY — provider-free, no network, no secrets. Added 2026-10-06 to locate where a
// long-running function's response is lost. The provider proxies declare no maxDuration and real
// Grok calls measured 8.5-62s; every one of them came back to the browser as
// NO_RESPONSE_FROM_FUNCTION while the function itself logged status=200. This endpoint reproduces
// the shape of that failure with NO upstream call, so the layer that drops the response can be
// identified rather than assumed.
//
// GET /api/_diag-slow?ms=2000   -> sleeps 2s then returns JSON
// Delete this file once the response-path question is settled.
export default async function handler(req, res) {
  const ms = Math.max(0, Math.min(120000, Number((req.query && req.query.ms) || 0)));
  const started = Date.now();
  await new Promise(r => setTimeout(r, ms));
  res.status(200).json({
    ok: true, sleptMs: ms, actualMs: Date.now() - started,
    note: 'if you can read this, the runtime returned a response after sleeping this long'
  });
}
