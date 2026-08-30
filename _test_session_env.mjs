// ══════════════════════════════════════════════════════════════════════════════════════════
//  THE SHARED AUTHENTICATED TEST ENVIRONMENT
//
//  Scene 1 is behind a purchase. The purchase is behind an authenticated Supabase session.
//  Harnesses used to reach that session by forwarding /api/config to the dev server; forwarding
//  static endpoints spawns @vercel/node runtimes that are never reaped (they reached 1.1 GB and
//  wedged the server mid-suite), so forwarding was replaced with route.fulfill({}). That fixed
//  the leak and silently removed the session: with supabaseUrl empty the app never constructs an
//  auth client at all, the charge finds no token, and production CORRECTLY refuses to sell the
//  issue. Every suite downstream then asserted against a scene that never ran.
//
//  Production is not the thing to change — it is right to refuse. The harness has to present the
//  environment a real deployment presents: a config with the real SHAPE, and a session already in
//  storage before the first page script runs. Dummy, non-secret values only; no real credential
//  appears in this repository.
//
//  It lives in one file because two harnesses needed it and a hand-copied second copy is how
//  these two drift apart, one of them going quietly green on a chain that never executed.
// ══════════════════════════════════════════════════════════════════════════════════════════

// An http scheme is mandatory: the app constructs its client only when the URL starts with http
// and a key is present. A .localhost host resolves nowhere, and every request to it is
// intercepted below, so the client can never reach a network.
export const SB_URL = 'http://sb-test.localhost';
export const SB_STORAGE_KEY = 'sb-' + new URL(SB_URL).hostname.split('.')[0] + '-auth-token';

export function makeSession() {
  return { access_token: 'test-session-token-not-a-secret', token_type: 'bearer',
    expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'test-refresh-not-a-secret',
    user: { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated',
            role: 'authenticated', email: 'harness@example.invalid' } };
}

// The exact field set api/config.js returns, with non-secret stand-ins.
export function configBody() {
  return JSON.stringify({
    supabaseUrl: SB_URL, supabaseAnonKey: 'test-anon-key-not-a-secret',
    proxyUrl: '', imageProxyUrl: '',
    has_SUPABASE_URL: true, has_SUPABASE_ANON_KEY: true,
    has_PROXY_URL: false, has_IMAGE_PROXY_URL: false, has_XAI_API_KEY: false });
}

// Seed the session BEFORE any page script runs — supabase-js resolves getSession() from storage,
// and an evaluate() after load is already too late.
export async function installSession(page, session) {
  await page.addInitScript(({ key, s }) => {
    try { window.localStorage.setItem(key, JSON.stringify(s)); } catch (_) {}
  }, { key: SB_STORAGE_KEY, s: session || makeSession() });
}

// True for any request the auth client makes to its own (unreachable) origin.
export const isAuthOrigin = (u) => String(u).indexOf(SB_URL) === 0;
