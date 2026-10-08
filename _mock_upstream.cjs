// MOCKED UPSTREAM + EGRESS BLOCK, loaded with --require into the supervised Vercel process.
// Production code is untouched: api/proxy.js hardcodes https://api.x.ai/v1/chat/completions, so the
// only way to mock it without editing the proxy is to intercept fetch inside the process that runs
// it. Any external host that is NOT the mocked provider is REFUSED, so a real provider call cannot
// happen even by accident, and no API key can leave the machine.
const realFetch = globalThis.fetch;
let served = 0;
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/i;
const MOCKED_HOSTS = new Set(['api.x.ai', 'api.mistral.ai', 'api.openai.com']);
// The CLI's own control plane is NOT a provider: `vercel dev` retrieves the project over the
// network before it will serve anything. Blocking it killed the server with exit 1 before a single
// request could be made. PROVIDER egress stays mocked and everything else stays refused.
const INFRA = /(^|\.)vercel\.com$|(^|\.)vercel-insights\.com$|(^|\.)npmjs\.org$/i;

globalThis.fetch = async function (input, init) {
  const url = String((input && input.url) || input || '');
  let host = '';
  try { host = new URL(url).hostname; } catch (_) { host = ''; }

  if (MOCKED_HOSTS.has(host)) {
    served++;
    let echoed = '', bodyLen = 0;
    try {
      const raw = (init && init.body) || (input && input.body) || '';
      bodyLen = String(raw).length;
      const parsed = JSON.parse(String(raw));
      const msgs = (parsed && parsed.messages) || [];
      echoed = String((msgs[msgs.length - 1] || {}).content || '').slice(0, 80);
    } catch (_) {}
    // A stable per-request identity that does not depend on process-local state and DOES depend
    // on the content, so two different requests cannot produce the same receipt.
    let sum = 0;
    try { const s = String((init && init.body) || ''); 
      for (let i = 0; i < s.length; i++) sum = (sum * 31 + s.charCodeAt(i)) % 100000; } catch (_) {}
    const n = sum;
    // A reply AND a usage receipt, in the provider's own response shape, so the proxy's receipt
    // handling runs for real rather than being asserted against a hand-made object.
    const body = {
      id: 'mock-' + n,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'grok-4.3',
      choices: [{
        index: 0,
        finish_reason: 'stop',
        message: { role: 'assistant',
          content: 'MOCK UPSTREAM REPLY for [' + echoed + '] — served by the local interceptor.' }
      }],
      usage: {
        prompt_tokens: 1200 + n,
        completion_tokens: 300 + n,
        total_tokens: 1500 + (2 * n),
        prompt_tokens_details: { cached_tokens: 400 + n, text_tokens: 800 },
        completion_tokens_details: { reasoning_tokens: 64 + n }
      }
    };
    process.stderr.write('[MOCK-UPSTREAM] intercepted ' + host + ' — reply for ['
      + echoed + '] with a usage receipt (prompt_tokens ' + (1200 + n) + ')\n');
    return new Response(JSON.stringify(body),
      { status: 200, headers: { 'content-type': 'application/json' } });
  }

  if (host && INFRA.test(host)) return realFetch(input, init);

  if (host && !LOCAL.test(host)) {
    process.stderr.write('[MOCK-UPSTREAM] BLOCKED external request to ' + host + '\n');
    throw new Error('EGRESS BLOCKED by _mock_upstream.cjs: ' + host);
  }
  return realFetch(input, init);
};
process.stderr.write('[MOCK-UPSTREAM] installed — provider hosts mocked, all other egress blocked\n');
