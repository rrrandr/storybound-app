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
//
// opts.blockImagePreparation (Roman 2026-09-22, broadened same day) — real finding: Temptation
// attempt 4 dispatched a real, paid image-style-extraction call (a "visual art director" GPT-4o
// request, fed a reference image) despite being run under an explicit "no image generation or
// image-style extraction" authorization. An endpoint allowlist alone could not have caught this:
// /api/chatgpt-proxy is also the path for OTHER, legitimate real calls in the same pipeline, and the
// same style of call can route through /api/gemini-proxy too — so blocking by endpoint either
// over-blocks or under-blocks. Roman: "An endpoint allowlist alone is insufficient when prose and
// extraction share an endpoint." First shipped as `blockImageStyleExtraction` (reference-image
// extraction only); broadened the same day per Roman: "the prose harness still permits the
// text-only image-prompt rewrite on GPT-4o. It isn't reference extraction, but it's still image
// preparation... Finish the prose-only boundary: block both." Renamed to
// `blockImagePreparation` to reflect the wider scope. Set `blockImagePreparation: true` to inspect
// every REAL-lane request's own BODY CONTENT — provider-agnostic, endpoint-agnostic — for either
// image-preparation operation and ABORT it before dispatch even when the endpoint is otherwise
// allowlisted, never silently swapped to a stub or a different provider. Classification is now
// PRIMARILY an explicit `purpose` field both real callers carry on the wire
// ('image_style_extraction' / 'image_prompt_rewrite' — see public/app.js and
// orchestration-client.js), with the prior text-signature match RETAINED as a secondary/fallback
// signal in case that field is ever missing or stripped. Default false: every existing control that
// doesn't pass this option is byte-identical in behavior. See
// _prose_only_blocks_image_style_extraction_control.mjs.
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

// IMAGE-PREPARATION CONTENT CLASSIFIER (Roman 2026-09-22, broadened same day) — see the
// blockImagePreparation doc comment above for the full rationale. Two known real image-preparation
// operations, both of which belong to rewriteImagePromptWithStyle (Gemini branch and its GPT-4o
// no-ref branch) and _extractStyleViaGemini:
//   'image_style_extraction' — the reference-image-driven (vision) extraction.
//   'image_prompt_rewrite'   — the no-reference text-only rewrite (no image sent, but still image
//                              preparation — Roman: "It isn't reference extraction, but it's still
//                              image preparation... unnecessary spending during a prose-only test").
// PRIMARY signal: the request's own `purpose` field — an explicit, load-bearing operation-purpose
// identifier both real callers now carry on the wire (see public/app.js's two call sites and
// orchestration-client.js's payload.purpose passthrough) — checked directly, no text sniffing
// needed for the common case.
// SECONDARY signal (retained as additional protection, per Roman's explicit instruction, in case
// `purpose` is ever missing or stripped before reaching this check): the request's own
// system-message text. "STYLE-ONLY EXTRACTION (HARD)" is present verbatim ONLY in the
// reference-driven branch's system prompt (both providers mirror it exactly); "visual art director
// for a comic book / graphic novel" is the shared opening line of BOTH image-preparation branches
// (ref-driven AND no-ref rewrite) and is not used by any known real prose call in this pipeline —
// broadened here specifically because BOTH operations are now in scope, unlike the narrower
// first-pass version of this function which deliberately excluded that broader phrase to avoid
// over-blocking the no-ref branch back when only ref-driven extraction was being blocked.
// Deliberately body-content-based, never URL/endpoint-based, so it works identically whichever
// provider/endpoint carries the call. Exported at MODULE scope (not nested inside
// installFailClosedNetworkGate) so it can be unit-tested directly, without needing a live dispatch
// of anything — see _prose_only_blocks_image_style_extraction_control.mjs.
const IMAGE_PREP_PURPOSES = new Set(['image_style_extraction', 'image_prompt_rewrite']);
export function isImagePreparationRequest(requestBody) {
  try {
    if (requestBody && IMAGE_PREP_PURPOSES.has(requestBody.purpose)) return true;
    const msgs = (requestBody && requestBody.messages) || [];
    const sys = msgs[0] && msgs[0].content;
    const sysText = typeof sys === 'string' ? sys : '';
    return /STYLE-ONLY EXTRACTION \(HARD\)/.test(sysText) || /visual art director for a comic book \/ graphic novel/i.test(sysText);
  } catch (_) { return false; }
}

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

    if (real && opts.blockImagePreparation) {
      const bodyForClassify = parseBody(req);
      if (isImagePreparationRequest(bodyForClassify)) {
        persist({ kind: 'abort-image-preparation', url, method: req.method(), reason: 'blockImagePreparation: request body matches an image-preparation operation (purpose="' + (bodyForClassify && bodyForClassify.purpose) + '")', at: Date.now() });
        try { console.warn('[NETWORK-GATE] ABORT (image-preparation, blocked before dispatch): ' + url + ' purpose=' + (bodyForClassify && bodyForClassify.purpose)); } catch (_) {}
        unstubbed.push({ url, method: req.method(), at: Date.now(), reason: 'blocked: image-preparation request body, blockImagePreparation active' });
        route.abort('failed');
        return;
      }
    }

    if (real) {
      if (activePhase && activePhase.count < activePhase.ceiling) {
        activePhase.count++;
        // `request: req` (Roman 2026-09-21, fourth repair — see the correlation-fix comment on
        // page.on('response') below for the real incident this closes).
        const rec = { roleTag: activePhase.roleTag, real: true, url, request: req, requestBody: parseBody(req), status: null, responseBody: null, networkError: null, at: Date.now(), atMono: performance.now(), settledAt: null, settledAtMono: null, elapsedMs: null };
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

    let body, fulfillStatus = 200;
    try {
      const result = await stubFn(req);   // AWAITED — a stub may deliberately answer late.
      // OPTIONAL STATUS ENVELOPE (Roman 2026-09-19): a stub normally returns the body value
      // directly and always gets fulfilled with 200 — unchanged default. To simulate a real
      // non-2xx response (a provider 429/507, a governor refusal), a stub may instead return
      // { __gateStatus: <code>, ...bodyFields }; that code becomes the fulfilled HTTP status and
      // is stripped from the recorded body. Every pre-existing stub (plain object/string, no
      // __gateStatus key) is byte-identical to before this change.
      if (result && typeof result === 'object' && typeof result.__gateStatus === 'number') {
        fulfillStatus = result.__gateStatus;
        const { __gateStatus, ...rest } = result;
        body = JSON.stringify(rest);
        if (rec) rec.responseBody = rest;
      } else {
        body = (typeof result === 'string') ? result : JSON.stringify(result);
        if (rec) rec.responseBody = (typeof result === 'string') ? { raw: result } : result;
      }
      if (rec) {
        rec.status = fulfillStatus;
        rec.settledAt = Date.now(); rec.settledAtMono = performance.now(); rec.elapsedMs = rec.settledAtMono - rec.atMono;
        persist({ kind: 'response', roleTag: rec.roleTag, real: false, url, status: fulfillStatus, responseBody: rec.responseBody, at: rec.settledAt, settledAtMono: rec.settledAtMono, elapsedMs: rec.elapsedMs });
      }
    } catch (e) {
      fulfillStatus = 500;
      body = JSON.stringify({ error: 'stub threw: ' + String(e && e.message) });
      if (rec) {
        rec.status = 500; rec.responseBody = { error: String(e && e.message) };
        rec.settledAt = Date.now(); rec.settledAtMono = performance.now(); rec.elapsedMs = rec.settledAtMono - rec.atMono;
        persist({ kind: 'response', roleTag: rec.roleTag, real: false, url, status: 500, responseBody: rec.responseBody, at: rec.settledAt, settledAtMono: rec.settledAtMono, elapsedMs: rec.elapsedMs });
      }
    }
    route.fulfill({ status: fulfillStatus, contentType: 'application/json', body: body });
  });

  // CORRELATION FIX (Roman 2026-09-21, fourth repair). Real incident: Scene 2 retry #15 dispatched
  // a real author call (max_tokens: 8000) that the app's own console log AND the raw persisted log
  // both prove settled with a real 200 response and real content — yet this script's own report
  // recorded it as `status: null, "no usage block returned"` and exited via the "never settled"
  // path, undercounting real spend by ~$0.085. Root cause: this handler used to match a response
  // to its dispatch record by URL STRING alone (`r.url === url`), taking the "most recently
  // dispatched, still-unsettled" record for that URL — a LIFO heuristic that silently
  // misattributes when TWO OR MORE requests to the SAME URL (e.g. two /api/proxy calls — the
  // scene-spine planner and the Scene 2 author both use it) are in flight concurrently and their
  // responses arrive out of dispatch order: the wrong (also-unsettled) record gets marked settled
  // with someone else's response, and the TRUE originating dispatch is left permanently unsettled
  // even though its own real response genuinely arrived. Fix: match by Playwright's own REQUEST
  // OBJECT IDENTITY (`response.request()` is documented to return the exact same Request object
  // captured at dispatch time via `route.request()`) — unambiguous even under concurrent same-URL
  // traffic, no ordering assumption required. The URL check is kept as a defense-in-depth
  // secondary constraint, not the primary discriminator. Proven,
  // _e2e_network_gate_response_correlation_control.mjs.
  page.on('response', async (response) => {
    try {
      const url = response.url();
      let pathname; try { pathname = new URL(url).pathname; } catch (_) { pathname = url; }
      if (!matchesAllowedReal(pathname)) return; // stub settlement is handled inline in the route handler above
      const respReq = response.request();
      let rec = tracked.find((r) => r.real === true && r.request === respReq && !isSettled(r));
      // Fallback for the (expected-rare) case where Playwright's request object identity doesn't
      // carry through — e.g. a redirect chain creates a new Request. Falls back to the OLD
      // URL-based heuristic rather than silently dropping the response.
      if (!rec) rec = [...tracked].reverse().find((r) => r.real === true && r.url === url && !isSettled(r));
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
      // Same identity-based correlation fix as page.on('response') above — see that handler's
      // comment for the real incident this closes.
      let rec = tracked.find((r) => r.real === true && r.request === request && !isSettled(r));
      if (!rec) rec = [...tracked].reverse().find((r) => r.real === true && r.url === url && !isSettled(r));
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
      // QUIET PERIOD (Roman 2026-09-20 repair). Real bug found via two consecutive real retries
      // (Scene 2 retries 5 and 6) that each showed exactly ONE tracked call under this phase and no
      // sign of the app's own documented follow-up (a bounded gate retry; a tier fallback after a
      // 502) ever completing. Root cause: this function used to return the instant EVERY CURRENTLY
      // TRACKED call under roleTag was settled — but "currently tracked" can be just the first call,
      // checked in the gap between that call settling and the app's own async retry/fallback logic
      // issuing its NEXT fetch (which hasn't been dispatched yet, so isn't in `tracked` yet either).
      // A caller like _scene2_repair_replay_sample.mjs then sees "settlement resolved" with only one
      // call on record and concludes failure, even when the app was correctly about to make a second,
      // legitimate call it never got the chance to be observed making. Fix: once every currently-
      // tracked call is settled, wait a short quiet period (default 3s) watching for a NEW call to
      // appear under the same roleTag; if one does, treat it as not-yet-settled and keep waiting; only
      // return once the quiet period passes with no new call. quietMs:0 restores the old (buggy for
      // multi-attempt cases) immediate-return behavior, for callers that know only one call is ever
      // possible under a given roleTag.
      // 3000 -> 8000 (Roman 2026-09-21, second repair): a real retry (Scene 2 retry #7) showed the
      // app's OWN console log recording "[TIERED:scenePlanner] attempt 2 tier=fallback
      // provider=mistral..." (proof _callTieredProvider's fallback logic fired correctly) with NO
      // corresponding network-gate-tracked request ever appearing before the calling script closed
      // the browser -- the 3s quiet window from the first repair was not always enough margin between
      // the app logging an attempt and Playwright's own request interceptor registering the resulting
      // fetch. Widened for a larger safety margin; still overridable per call via quietMs.
      const quietMs = (waitOpts.quietMs != null) ? waitOpts.quietMs : 8000;
      const start = Date.now();
      let lastWatchdog = start;
      let quietSince = null;
      let lastCount = -1;
      // TIER-LOG CROSS-CHECK (Roman 2026-09-21, third repair). Real retry #7 proved the quiet-period
      // fix alone is not sufficient: the app's OWN console log showed _callTieredProvider correctly
      // logging a fallback attempt ("[TIERED:scenePlanner] attempt 2 tier=fallback
      // provider=mistral..."), synchronously, the instant the loop reaches that tier -- but the
      // resulting network request never appeared in `tracked` before the calling script closed the
      // browser. The quiet-period timer alone can't see an attempt that was DECLARED but never
      // NETWORK-TRACKED. Fix: when the caller supplies `expectedTierLogRole` (the internal roleTag
      // _callTieredProvider was given, e.g. 'scenePlanner' -- NOT this function's own `roleTag`
      // phase-tracking argument, a different tagging system), cross-check the app's OWN ground-truth
      // window._providerTierLog (written synchronously by _logProviderTierAttempt, before any network
      // delay) against the network-tracked count. If the app has logged MORE attempts than the network
      // layer has tracked, that is direct proof a request is missing from tracking -- treat it as
      // NOT settled and keep waiting (resetting the quiet timer), rather than trusting network
      // tracking alone. Optional and additive: omitting expectedTierLogRole preserves the exact
      // quiet-period-only behavior above.
      const expectedTierLogRole = waitOpts.expectedTierLogRole || null;
      for (;;) {
        const relevant = tracked.filter((r) => r.roleTag === roleTag);
        let tierLogAhead = false;
        if (expectedTierLogRole) {
          try {
            const tierLogCount = await page.evaluate((role) => {
              try { return (window._providerTierLog || []).filter((r) => r && r.role === role).length; }
              catch (_) { return 0; }
            }, expectedTierLogRole);
            if (tierLogCount > relevant.length) tierLogAhead = true;
          } catch (_) { /* page may be mid-navigation; do not fail the wait over a transient read error */ }
        }
        const allSettled = !tierLogAhead && relevant.length > 0 && relevant.every(isSettled);
        if (allSettled) {
          if (relevant.length !== lastCount) { quietSince = Date.now(); lastCount = relevant.length; }
          if (quietMs <= 0 || (Date.now() - quietSince) >= quietMs) return relevant.slice();
        } else {
          quietSince = null; lastCount = relevant.length;
        }
        const now = Date.now();
        if (now - lastWatchdog >= watchdogMs) {
          lastWatchdog = now;
          try { if (typeof waitOpts.onWatchdog === 'function') waitOpts.onWatchdog(now - start, { tierLogAhead: tierLogAhead }); } catch (_) {}
        }
        await new Promise((r) => setTimeout(r, pollMs));
      }
    },
  };
}
