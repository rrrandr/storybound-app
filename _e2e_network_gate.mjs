// FAIL-CLOSED NETWORK GATE — for every real-browser control in this repo (Roman, 2026-09-19)
//
// Incident 1: building _first_sacrifice_fate_card_scene2_control.mjs, a CG scaffold generator hit
// a raw fetch('/api/mistral-proxy', ...) entirely outside the app's window.StoryboundOrchestration
// object — the function-level stubs that control relied on never saw it. See
// _first_sacrifice_fate_card_scene2_incident_2026_09_19.md for the full incident record.
//
// Incident 2 (2026-09-19, the one this revision fixes): the one authorized live Scene 2 Boundary
// sample dispatched a real, ledgered author request, then the harness gave up on a single 150s
// wall-clock wait and CLOSED THE BROWSER — killing an in-flight request whose result/cost became
// permanently unknown. See _first_sacrifice_live_scene2_boundary_sample_incident_2026_09_19.md.
// This revision adds: every tracked request (real-lane OR a stub served under an active phase) is
// persisted to disk THE INSTANT it's released — not only on script success; its settlement
// (response OR terminal network error) is appended the instant it's observed; a settlement-waiter
// that never gives up and never signals "close the browser," only reports a pending watchdog on a
// cadence; and awaitable (delayable) stub functions, so this whole contract is dry-provable
// against a stub that deliberately answers late — see _e2e_network_gate_delayed_capture_control.mjs.
//
// PERMANENT RULE for every real-browser control in this repo: install this gate FIRST — before
// page.goto, before anything else touches the page. It intercepts EVERY /api/** request the page
// makes. A request whose path matches an explicitly registered stub gets that stub's fixed
// response — no network egress either way. A request that matches NO registered stub, or an
// allowed-real path with no active phase / an exhausted ceiling, is ABORTED (route.abort(), before
// any bytes leave the browser) and recorded as a violation. Fail-closed by construction.
//
// PHASES are opt-in bookkeeping, orthogonal to real-vs-stub: calling gate.setPhase(roleTag,
// ceiling) makes EVERY matched request while it's active — real-lane pass-through OR a
// stub-fulfilled one — tracked under that roleTag, ceilinged, persisted, and watchable via
// hasUnsettled()/waitForSettlement(). A control that never calls setPhase() (every existing dry
// control in this repo) sees no behavior change at all — stubs just answer as before.
//
// usage (dry, no phase — unchanged from before):
//   const gate = await installFailClosedNetworkGate(page);
//   gate.stub('/api/mistral-proxy', () => ({ content: 'fixed text' }));
//
// usage (dry, WITH phase tracking — for proving the settlement contract against a delayed stub):
//   gate.stub('/api/proxy', async () => { await sleep(3000); return {...}; });
//   gate.setPhase('slow-author-call', 1);
//   const p = page.evaluate(() => fetch('/api/proxy', {...}));
//   await gate.waitForSettlement('slow-author-call', { onWatchdog: (ms) => console.log('pending ' + ms + 'ms') });
//
// usage (real, explicitly authorized only):
//   const gate = await installFailClosedNetworkGate(page, { logFile: '/path/to/run.jsonl' });
//   gate.allowRealPaths(['/api/proxy', '/api/mistral-proxy', '/api/chatgpt-proxy']);
//   gate.setPhase('scene2-cg-screenplay-author', 3);
//   await page.click('#gnSubmitBtn');
//   await gate.waitForSettlement('scene2-cg-screenplay-author', { onWatchdog: (ms) => console.log('still pending after ' + ms + 'ms') });
//   if (gate.hasUnsettled()) throw new Error('refusing to close — an approved request is still in flight');
//   await browser.close();  // only now
//
// gate.calls()          — every /api/** request seen, matched or not: {url, matched, at}
// gate.unstubbed()      — requests aborted as undeclared/over-ceiling: {url, method, at, reason}
// gate.stub(pathPrefix, fn) — FAKE-content stub (dry mode). fn(req) may return a value OR a
//                              Promise (awaited) — a delayed stub is a first-class case.
// gate.allowRealPaths(prefixes) — path prefixes that MAY be let through for real, ONLY while a
//   phase is active.
// gate.setPhase(roleTag, ceiling) — opens a named phase: up to `ceiling` matched requests (real OR
//   stub) are tracked under `roleTag`. Anything past the ceiling, or an allowed-real path with no
//   active phase, is undeclared and aborted.
// gate.closePhase() — closes the active phase.
// gate.realCalls() — tracked requests that went through the REAL pass-through lane specifically:
//   {roleTag, url, requestBody, status, responseBody, networkError, at, atMono, settledAt,
//   settledAtMono, elapsedMs}. at/settledAt are wall-clock Date.now() ms (for correlating against
//   other logs/timestamps); atMono/settledAtMono are performance.now() ms (monotonic, immune to
//   wall-clock/timezone conversion — never subtract at/settledAt by hand to get a duration).
//   elapsedMs = settledAtMono - atMono, computed once here at settlement time — the authoritative
//   duration; use it instead of re-deriving one.
// gate.trackedCalls(roleTag?) — every tracked request (real AND stub-served-under-a-phase),
//   optionally filtered to one role — the same shape as realCalls() plus a `real` boolean.
// gate.hasUnsettled(roleTag?) — true if any TRACKED call (optionally filtered to one role) has
//   neither a response nor a networkError yet — the caller's signal to NOT close the browser.
// gate.waitForSettlement(roleTag, opts) — async; resolves once every tracked call under `roleTag`
//   (at least one must exist) is settled. NEVER gives up and NEVER signals closing the browser —
//   opts.watchdogMs (default 15000) is purely a reporting cadence: opts.onWatchdog(elapsedMs) fires
//   on that cadence while still waiting, then the loop continues. No total deadline exists here by
//   design (see the incident this fixes).

import fs from 'node:fs';
import { performance } from 'node:perf_hooks';

// Incident 3 (2026-09-19): a chat-turn report hand-converted this module's wall-clock Date.now()
// epoch ms into a local clock-time string and got the conversion backwards, making a real
// dispatch->settle pair (settled ~14.8s AFTER dispatch) READ as if settlement preceded dispatch.
// The underlying persisted data was correct — Date.now() is monotonic within one Node process over
// timescales this short — but nothing in the record forced a reader (human or script) to use a
// correlated, hand-off-proof duration instead of subtracting two wall-clock strings themselves.
// Fix: every tracked record now also carries atMono/settledAtMono (performance.now(), a monotonic
// clock immune to wall-clock/timezone conversion mistakes) and elapsedMs — computed ONCE, here, at
// settlement time, from the monotonic pair — so no downstream report ever hand-computes a duration
// again. See _e2e_network_gate_monotonic_elapsed_control.mjs for the dry proof.

export async function installFailClosedNetworkGate(page, opts) {
  opts = opts || {};
  const stubs = [];        // [{ prefix, fn }], checked in registration order — first match wins
  const calls = [];
  const unstubbed = [];
  const allowedRealPrefixes = [];
  const tracked = [];      // every phase-tracked request, real or stub: {roleTag, real, url, requestBody, status, responseBody, networkError, at, settledAt}
  let activePhase = null;  // { roleTag, ceiling, count }

  const logFile = opts.logFile || null;
  function persist(event) {
    if (!logFile) return;
    try { fs.appendFileSync(logFile, JSON.stringify({ ...event, loggedAt: Date.now() }) + '\n'); } catch (_) {}
  }

  function findStub(pathname) {
    for (let i = 0; i < stubs.length; i++) {
      if (pathname === stubs[i].prefix || pathname.startsWith(stubs[i].prefix)) return stubs[i].fn;
    }
    return null;
  }
  function matchesAllowedReal(pathname) {
    return allowedRealPrefixes.some((p) => pathname === p || pathname.startsWith(p));
  }
  function parseBody(req) {
    try { return JSON.parse(req.postData() || '{}'); } catch (_) { return null; }
  }
  function isSettled(rec) { return rec.status != null || rec.networkError != null; }

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();
    let pathname;
    try { pathname = new URL(url).pathname; } catch (_) { pathname = url; }
    const real = matchesAllowedReal(pathname);

    if (real) {
      if (activePhase && activePhase.count < activePhase.ceiling) {
        activePhase.count++;
        const rec = { roleTag: activePhase.roleTag, real: true, url, requestBody: parseBody(req), status: null, responseBody: null, networkError: null, at: Date.now(), atMono: performance.now(), settledAt: null, settledAtMono: null, elapsedMs: null };
        tracked.push(rec);
        calls.push({ url, matched: true, real: true, roleTag: activePhase.roleTag, at: Date.now() });
        // PERSIST IMMEDIATELY — before route.continue() releases the request. This is the record
        // that survives even if the browser is killed a millisecond later. (Incident 2: this line
        // did not exist, so a killed-in-flight request left nothing on disk at all.)
        persist({ kind: 'dispatch', roleTag: rec.roleTag, real: true, url, requestBody: rec.requestBody, at: rec.at, atMono: rec.atMono });
        await route.continue();
        return;
      }
      const reason = activePhase ? ('ceiling ' + activePhase.ceiling + ' exceeded for phase "' + activePhase.roleTag + '"') : 'no active phase — request arrived outside any declared operation';
      unstubbed.push({ url, method: req.method(), at: Date.now(), reason });
      persist({ kind: 'abort-undeclared', url, method: req.method(), reason, at: Date.now() });
      try { console.warn('[NETWORK-GATE] ABORT (undeclared): ' + url + ' — ' + reason); } catch (_) {}
      route.abort('failed');
      return;
    }

    const stubFn = findStub(pathname);
    calls.push({ url, matched: !!stubFn, at: Date.now() });
    if (!stubFn) {
      unstubbed.push({ url, method: req.method(), at: Date.now(), reason: 'no registered stub or real-lane for this path' });
      persist({ kind: 'abort-undeclared', url, method: req.method(), reason: 'no registered stub or real-lane for this path', at: Date.now() });
      try { console.warn('[NETWORK-GATE] ABORT (undeclared): ' + url); } catch (_) {}
      route.abort('failed');
      return;
    }

    let rec = null;
    if (activePhase) {
      if (activePhase.count >= activePhase.ceiling) {
        unstubbed.push({ url, method: req.method(), at: Date.now(), reason: 'ceiling ' + activePhase.ceiling + ' exceeded for phase "' + activePhase.roleTag + '" (stub lane)' });
        persist({ kind: 'abort-undeclared', url, method: req.method(), reason: 'stub-lane ceiling exceeded for phase "' + activePhase.roleTag + '"', at: Date.now() });
        try { console.warn('[NETWORK-GATE] ABORT (stub-lane ceiling exceeded): ' + url); } catch (_) {}
        route.abort('failed');
        return;
      }
      activePhase.count++;
      rec = { roleTag: activePhase.roleTag, real: false, url, requestBody: parseBody(req), status: null, responseBody: null, networkError: null, at: Date.now(), atMono: performance.now(), settledAt: null, settledAtMono: null, elapsedMs: null };
      tracked.push(rec);
      persist({ kind: 'dispatch', roleTag: rec.roleTag, real: false, url, requestBody: rec.requestBody, at: rec.at, atMono: rec.atMono });
    }

    let body;
    try {
      const result = await stubFn(req);   // AWAITED — a stub may deliberately answer late.
      body = (typeof result === 'string') ? result : JSON.stringify(result);
      if (rec) {
        rec.status = 200; rec.responseBody = (typeof result === 'string') ? { raw: result } : result;
        rec.settledAt = Date.now(); rec.settledAtMono = performance.now(); rec.elapsedMs = rec.settledAtMono - rec.atMono;
        persist({ kind: 'response', roleTag: rec.roleTag, real: false, url, status: 200, responseBody: rec.responseBody, at: rec.settledAt, settledAtMono: rec.settledAtMono, elapsedMs: rec.elapsedMs });
      }
    } catch (e) {
      body = JSON.stringify({ error: 'stub threw: ' + String(e && e.message) });
      if (rec) {
        rec.status = 500; rec.responseBody = { error: String(e && e.message) };
        rec.settledAt = Date.now(); rec.settledAtMono = performance.now(); rec.elapsedMs = rec.settledAtMono - rec.atMono;
        persist({ kind: 'response', roleTag: rec.roleTag, real: false, url, status: 500, responseBody: rec.responseBody, at: rec.settledAt, settledAtMono: rec.settledAtMono, elapsedMs: rec.elapsedMs });
      }
    }
    route.fulfill({ status: 200, contentType: 'application/json', body: body });
  });

  page.on('response', async (response) => {
    try {
      const url = response.url();
      let pathname; try { pathname = new URL(url).pathname; } catch (_) { pathname = url; }
      if (!matchesAllowedReal(pathname)) return; // stub settlement is handled inline in the route handler above
      const rec = [...tracked].reverse().find((r) => r.real === true && r.url === url && !isSettled(r));
      if (!rec) return;
      rec.status = response.status();
      try { rec.responseBody = await response.json(); } catch (_) { rec.responseBody = null; }
      rec.settledAt = Date.now(); rec.settledAtMono = performance.now(); rec.elapsedMs = rec.settledAtMono - rec.atMono;
      persist({ kind: 'response', roleTag: rec.roleTag, real: true, url, status: rec.status, responseBody: rec.responseBody, at: rec.settledAt, settledAtMono: rec.settledAtMono, elapsedMs: rec.elapsedMs });
    } catch (_) {}
  });

  page.on('requestfailed', (request) => {
    try {
      const url = request.url();
      let pathname; try { pathname = new URL(url).pathname; } catch (_) { pathname = url; }
      if (!matchesAllowedReal(pathname)) return;
      const rec = [...tracked].reverse().find((r) => r.real === true && r.url === url && !isSettled(r));
      if (!rec) return;
      const failure = request.failure();
      rec.networkError = (failure && failure.errorText) || 'requestfailed (no errorText available)';
      rec.settledAt = Date.now(); rec.settledAtMono = performance.now(); rec.elapsedMs = rec.settledAtMono - rec.atMono;
      // A TERMINAL NETWORK ERROR IS A SETTLEMENT, not a hang.
      persist({ kind: 'network-error', roleTag: rec.roleTag, real: true, url, networkError: rec.networkError, at: rec.settledAt, settledAtMono: rec.settledAtMono, elapsedMs: rec.elapsedMs });
      try { console.warn('[NETWORK-GATE] terminal network error for ' + rec.roleTag + ' (' + url + '): ' + rec.networkError); } catch (_) {}
    } catch (_) {}
  });

  return {
    stub(pathPrefix, fn) { stubs.push({ prefix: pathPrefix, fn: fn }); },
    allowRealPaths(prefixes) { (Array.isArray(prefixes) ? prefixes : [prefixes]).forEach((p) => allowedRealPrefixes.push(p)); },
    setPhase(roleTag, ceiling) { activePhase = { roleTag, ceiling: (ceiling > 0 ? ceiling : 1), count: 0 }; persist({ kind: 'phase-open', roleTag, ceiling, at: Date.now() }); },
    closePhase() { if (activePhase) persist({ kind: 'phase-close', roleTag: activePhase.roleTag, at: Date.now() }); activePhase = null; },
    calls() { return calls.slice(); },
    unstubbed() { return unstubbed.slice(); },
    realCalls() { return tracked.filter((r) => r.real === true); },
    trackedCalls(roleTag) { return tracked.filter((r) => !roleTag || r.roleTag === roleTag); },
    hasUnsettled(roleTag) {
      return tracked.some((r) => (!roleTag || r.roleTag === roleTag) && !isSettled(r));
    },
    // Resolves ONLY once every tracked call under roleTag is settled. Never gives up on its own;
    // never closes or aborts anything; the ONLY effect of time passing is periodic onWatchdog
    // reporting (default every 15s) — the caller decides what "taking a long time" should mean,
    // this function never decides it FOR them by timing out.
    async waitForSettlement(roleTag, waitOpts) {
      waitOpts = waitOpts || {};
      const watchdogMs = waitOpts.watchdogMs > 0 ? waitOpts.watchdogMs : 15000;
      const pollMs = waitOpts.pollMs > 0 ? waitOpts.pollMs : 500;
      const start = Date.now();
      let lastWatchdog = start;
      for (;;) {
        const relevant = tracked.filter((r) => r.roleTag === roleTag);
        if (relevant.length > 0 && relevant.every(isSettled)) return relevant.slice();
        const now = Date.now();
        if (now - lastWatchdog >= watchdogMs) {
          lastWatchdog = now;
          try { if (typeof waitOpts.onWatchdog === 'function') waitOpts.onWatchdog(now - start); } catch (_) {}
        }
        await new Promise((r) => setTimeout(r, pollMs));
      }
    },
  };
}
