// THE REAL PROXY CONTRACT — validated against the live endpoint, spending nothing.
//
// Interception answers a request the proxy never sees. That hid a real defect: the batch sent no
// `role`, and /api/chatgpt-proxy throws "Unknown role: undefined" before it calls anything. Every
// intercepted suite was green while the first live call would have failed.
//
// This talks to the REAL endpoint. It is free because the proxy validates role and model BEFORE
// dispatching to OpenAI: a rejected request costs nothing and proves the contract. Only the
// negative cases are sent — a request that would PASS validation is exactly the one that spends,
// and that is the A/B's job, not this file's.
//
// SUPERSEDED IN PART (2026-08-29): the batch no longer routes through /api/chatgpt-proxy at all.
// CHARACTER_PORTFOLIO remains registered there so the role cannot be silently reused, and these
// cases still hold the roleless-default hazard on record. The live route is /api/mistral-proxy,
// covered below.
//
// usage: node _portfolio_proxy_contract.mjs   (needs vercel dev on :3000)
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };
const post = async body => {
  const res = await fetch('http://localhost:3000/api/chatgpt-proxy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let j = null; try { j = await res.json(); } catch (_) {}
  return { status: res.status, body: j };
};
const MSG = [{ role: 'system', content: 'x' }, { role: 'user', content: 'y' }];

console.log(`\n${'═'.repeat(84)}\nPORTFOLIO PROXY CONTRACT — the real endpoint, no spend\n${'═'.repeat(84)}\n`);

// A ROLELESS REQUEST DOES NOT FAIL — IT SILENTLY BECOMES PRIMARY_AUTHOR. The proxy destructures
// `role = 'PRIMARY_AUTHOR'`, so omitting it does not throw; it MIS-ATTRIBUTES. That is the real
// hazard, and it is worse than a hard error because nothing complains: portfolio spend files as
// prose authoring and picks up pass-tier computation meant for scene writing.
//
// Proven WITHOUT SPENDING by pairing the missing role with a model PRIMARY_AUTHOR disallows: the
// rejection names the role the request was silently given.
const noRole = await post({ messages: MSG, model: 'grok-4-1-fast-reasoning' });
t('1: a request with NO role silently becomes PRIMARY_AUTHOR — mis-attribution, not an error',
  noRole.status >= 400 && /PRIMARY_AUTHOR/.test(JSON.stringify(noRole.body || {})),
  `status=${noRole.status} ${JSON.stringify(noRole.body).slice(0, 160)}`);

// AN ALLOWLISTED ROLE IS A PRESERVED ROUTE. Registering CHARACTER_PORTFOLIO here — even with a
// tight model list — kept alive the exact path this work closed. It is DENIED on this provider now,
// explicitly and with a reason, before model resolution.
const denied = await post({ messages: MSG, role: 'CHARACTER_PORTFOLIO', model: 'gpt-4o-mini' });
t('2: /api/chatgpt-proxy REFUSES CHARACTER_PORTFOLIO outright — even with a model it would ' +
  'otherwise allow, and before any dispatch',
  denied.status === 400 && /not permitted on this provider/i.test(JSON.stringify(denied.body || {})),
  `status=${denied.status} ${JSON.stringify(denied.body).slice(0, 200)}`);
t('3: …and the refusal says WHY and where the role belongs',
  /mistral/i.test(JSON.stringify(denied.body || {})), JSON.stringify(denied.body).slice(0, 200));

const grok = await post({ messages: MSG, role: 'PRIMARY_AUTHOR', model: 'grok-4-1-fast-reasoning' });
t('4: a model from ANOTHER role\'s allowlist is still refused for the role that asked',
  grok.status >= 400, `status=${grok.status}`);

const unknownRole = await post({ messages: MSG, role: 'PORTFOLIO_TYPO', model: 'gpt-4o-mini' });
t('5: an unknown role is refused rather than defaulted',
  unknownRole.status >= 400, `status=${unknownRole.status}`);

// ── THE LIVE ROUTE ──
const mBad = await (async () => {
  const res = await fetch('http://localhost:3000/api/mistral-proxy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: MSG, role: 'CHARACTER_PORTFOLIO', model: 'gpt-4o-mini' }) });
  let j = null; try { j = await res.json(); } catch (_) {}
  return { status: res.status, body: j };
})();
t('6: the LIVE route refuses an OpenAI model — no silent fallback back to where this came from',
  mBad.status >= 400, `status=${mBad.status} ${JSON.stringify(mBad.body).slice(0, 140)}`);
const mAllowed = (mBad.body && mBad.body.allowedModels) || [];
t('7: …and mistral-small-latest, the Scene-1 planner\'s own model, is on that allowlist',
  mAllowed.indexOf('mistral-small-latest') !== -1, JSON.stringify(mAllowed));

// The production request always names its role, so the roleless default can never apply to it.
// Asserted on the REAL dispatched bytes elsewhere (_portfolio_batch 6b2); here we prove the
// Mistral route's own default is not PRIMARY_AUTHOR, so even a slip could not become prose work.
const mNoRole = await (async () => {
  const res = await fetch('http://localhost:3000/api/mistral-proxy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: MSG, model: 'gpt-4o-mini' }) });
  let j = null; try { j = await res.json(); } catch (_) {}
  return { status: res.status, body: j };
})();
t('8: a roleless call on the Mistral route cannot become PRIMARY_AUTHOR — that default does not ' +
  'exist on this provider',
  mNoRole.status >= 400 && !/PRIMARY_AUTHOR/.test(JSON.stringify(mNoRole.body || {})),
  `status=${mNoRole.status} ${JSON.stringify(mNoRole.body).slice(0, 140)}`);

console.log(`\n  Every request above was REJECTED before the proxy called any model — zero spend.`);
console.log(`\n${'─'.repeat(84)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
