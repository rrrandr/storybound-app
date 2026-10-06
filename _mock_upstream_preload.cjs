// UPSTREAM MOCK, PRELOADED INTO EVERY NODE PROCESS vercel dev SPAWNS.
// Loaded via NODE_OPTIONS=--require, so it is installed in the FUNCTION WORKER itself — the proxy
// handler runs unmodified and Vercel's own request/response handling is preserved.
//
// api.x.ai  -> a representative provider response, delay configurable by MOCK_UPSTREAM_DELAY_MS
// every other host -> THROWS, so external provider access is blocked, not merely unused.
const DELAY = Number(process.env.MOCK_UPSTREAM_DELAY_MS || 0);
const BODY = {
  id: 'chatcmpl-vercel-mock', model: 'grok-4.3',
  choices: [{ message: { role: 'assistant', content: JSON.stringify({
    li_dialogue: 'Then say it where they can hear you.',
    li_action: 'He does not move.', scene_state: 'continue' }) }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 1200, completion_tokens: 80, total_tokens: 1280,
    prompt_tokens_details: { cached_tokens: 128 }, cost_in_usd_ticks: 15000000 }
};
globalThis.__MOCK_UPSTREAM_INSTALLED = true;
globalThis.__MOCK_UPSTREAM_CALLS = 0;
globalThis.__MOCK_UPSTREAM_DENIED = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url ? url.url : url);
  if (/^https:\/\/api\.x\.ai\//.test(u)) {
    globalThis.__MOCK_UPSTREAM_CALLS++;
    await new Promise((resolve, reject) => {
      const sig = opts && opts.signal;
      const timer = setTimeout(resolve, DELAY);
      if (sig) sig.addEventListener('abort', () => { clearTimeout(timer);
        const e = new Error('The operation was aborted.'); e.name = 'AbortError'; reject(e); });
    });
    return new Response(JSON.stringify(BODY),
      { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (/^https?:\/\//.test(u) && !/127\.0\.0\.1|localhost/.test(u)) {
    globalThis.__MOCK_UPSTREAM_DENIED.push(u);
    throw new Error('EXTERNAL NETWORK BLOCKED BY MOCK PRELOAD: ' + u);
  }
  return realFetch.apply(this, arguments);
};
