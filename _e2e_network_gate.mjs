// FAIL-CLOSED NETWORK GATE — for every real-browser control in this repo (Roman, 2026-09-19)
//
// Incident: building _first_sacrifice_fate_card_scene2_control.mjs, a CG scaffold generator hit a
// raw fetch('/api/mistral-proxy', ...) entirely outside the app's window.StoryboundOrchestration
// object — the function-level stubs that control relied on never saw it. See
// _first_sacrifice_fate_card_scene2_incident_2026_09_19.md for the full incident record.
//
// PERMANENT RULE for every real-browser control in this repo: install this gate FIRST — before
// page.goto, before anything else touches the page. It intercepts EVERY /api/** request the page
// makes. A request whose path matches an explicitly registered stub gets that stub's fixed
// response — no network egress either way. A request that matches NO registered stub is ABORTED
// (route.abort(), which happens before any bytes leave the browser, regardless of whether the
// test itself ever checks anything) AND recorded as a violation. This is fail-closed by
// construction: an unanticipated call path is a hard local failure, never a silent pass-through
// and never a real provider/network call — the exact gap this incident found.
//
// Stubs are matched by URL PATHNAME PREFIX (e.g. '/api/mistral-proxy' matches
// '/api/mistral-proxy' and '/api/mistral-proxy/anything'), checked against window.location-style
// absolute URLs. Register them however the test finds convenient (up front, or incrementally as
// each phase of a scenario needs a new one) — matching is looked up per-request, not compiled
// once, so registering AFTER installFailClosedNetworkGate() and before the traffic that needs it
// works correctly (Roman: "explicitly registered stubs added only afterward").
//
// usage:
//   import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
//   const gate = await installFailClosedNetworkGate(page);        // install FIRST, before goto
//   gate.stub('/api/mistral-proxy', () => ({ content: 'fixed text' }));
//   await page.goto('http://localhost:3000/');
//   ... drive the real page ...
//   const leaks = gate.unstubbed();
//   if (leaks.length) throw new Error('FAIL-CLOSED: unstubbed /api/** request(s): ' + JSON.stringify(leaks));
//
// gate.calls()      — every /api/** request seen, matched or not, in order: {url, matched, at}
// gate.unstubbed()  — only the ones that had no registered stub and were aborted: {url, method, at}
// gate.stub(pathPrefix, fn) — register a stub; fn receives the Playwright Request and returns a
//                              plain JSON-serializable object (or a string, used as-is).

export async function installFailClosedNetworkGate(page) {
  const stubs = [];        // [{ prefix, fn }], checked in registration order — first match wins
  const calls = [];
  const unstubbed = [];

  function findStub(pathname) {
    for (let i = 0; i < stubs.length; i++) {
      if (pathname === stubs[i].prefix || pathname.startsWith(stubs[i].prefix)) return stubs[i].fn;
    }
    return null;
  }

  await page.route('**/api/**', (route) => {
    const req = route.request();
    const url = req.url();
    let pathname;
    try { pathname = new URL(url).pathname; } catch (_) { pathname = url; }
    const fn = findStub(pathname);
    calls.push({ url, matched: !!fn, at: Date.now() });
    if (!fn) {
      // FAIL-CLOSED: no registered stub for this path. Abort before any byte leaves the browser —
      // this is the hard guarantee (route.abort() runs regardless of what the caller checks
      // afterward), independent of the caller remembering to assert on unstubbed().
      unstubbed.push({ url, method: req.method(), at: Date.now() });
      route.abort('failed');
      return;
    }
    let body;
    try {
      const result = fn(req);
      body = (typeof result === 'string') ? result : JSON.stringify(result);
    } catch (e) {
      body = JSON.stringify({ error: 'stub threw: ' + String(e && e.message) });
    }
    route.fulfill({ status: 200, contentType: 'application/json', body: body });
  });

  return {
    stub(pathPrefix, fn) { stubs.push({ prefix: pathPrefix, fn: fn }); },
    calls() { return calls.slice(); },
    unstubbed() { return unstubbed.slice(); },
  };
}
