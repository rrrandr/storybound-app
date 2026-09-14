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

// ══════════════════════════════════════════════════════════════════════════════════════════
//  HONEST ENTITLEMENT STUB (2026-09-13, §72 correction)
//
//  Root cause of the "entitlement drift" a prior harness patched around at runtime: hydrateState()
//  (app.js ~7481, called from hydrateProfile() ~7464) reads profile.is_subscriber from a Supabase
//  PostgREST `profiles` row. The generic sb-test.localhost catch-all (below, and in every harness)
//  answers EVERY Supabase REST call — including this one — with `{}`, so profile.is_subscriber is
//  undefined, state.subscribed becomes false, and the app CORRECTLY behaves as an unentitled
//  reader. That is not a production bug; patching state.subscribed/access/fortunes or hiding
//  #payModal after the fact hides the app's own correct behavior instead of fixing the stub that
//  misrepresents the backend. The honest fix is to answer the ONE request that actually needs a
//  real shape: a `profiles` GET, with a fully entitled reader's row.
// ══════════════════════════════════════════════════════════════════════════════════════════

// The exact field set PROFILE_COLUMNS selects (app.js ~7446), shaped as a fully entitled,
// already-onboarded, already-legal-accepted reader. Non-secret, synthetic values only.
//
// tos_version/privacy_version/adult_ack_version are the INTEGER gate versions resolveLegalGate()
// (app.js ~11463) compares via Number(profile.x) against LEGAL.TOS_VERSION/PRIVACY_VERSION/
// ADULT_ACK_VERSION (app.js ~116-118, currently 3/2/2) — NOT the display semver strings
// (CURRENT_TOS_VERSION etc., e.g. '2.2.0') shown in the legal-doc modal. A semver string here
// makes Number(...) → NaN → 0, which always fails the gate and routes to legalGate regardless of
// age_confirmed/onboarding_complete — discovered 2026-09-13 driving the real Library click-path,
// where (unlike a harness that calls internal functions directly) a wrongly-gated profile
// actually blocks every subsequent click. Keep these three in sync with LEGAL.* in app.js.
export function entitledProfileBody() {
  return {
    tier: 'chosen', fortunes: 9999999, is_subscriber: true, subscription_tier: 'chosen',
    age_confirmed: true, tos_version: 3, privacy_version: 2, adult_ack_version: 2,
    romance_preferences: null, avoidances: null, first_tempt_fate_vision_triggered: true,
    attraction_profile: null, billing_status: 'active', billing_grace_until: null,
    signup_date: new Date(Date.now() - 30 * 86400000).toISOString(), last_seen_date: new Date().toISOString(),
    welcome_first_arc_granted: true, welcome_day2_granted: true, bonus_tempt_charges: 0,
    tempt_grant_month: null, onboarding_complete: true, onboarding_gift_granted: true
  };
}

// The shape api/verify-subscription.js returns (userId, fortunes_before/after, tier_before/after,
// repairs) — a "nothing to reconcile" reply, for the rare harness run where window.verifySubscription()
// or the HYDRATE auto-trigger actually fires.
export function verifySubscriptionBody(userId) {
  return { userId: userId || null, fortunes_before: 9999999, fortunes_after: 9999999, tier_before: 'chosen', tier_after: 'chosen', repairs: [] };
}

// True for a PostgREST GET against the `profiles` table — hydrateProfile()'s
// .select(PROFILE_COLUMNS).eq('id', userId).maybeSingle()/.single() (app.js ~7465-7478).
export function isProfilesGet(url, method) {
  return method === 'GET' && /\/rest\/v1\/profiles(\?|$)/.test(String(url));
}

// Registers the targeted `profiles` stub AFTER the caller's generic sb-test.localhost catch-all
// (Playwright runs the MOST RECENTLY REGISTERED route first, so registering this one second gives
// it priority) — answers a profiles GET with a fully entitled reader's row and falls back to the
// generic handler (route.fallback()) for every other Supabase call. Call once, right after
// registering the generic sb-test.localhost catch-all, as part of the shared test-session setup —
// never as a recurring runtime correction.
export async function installEntitledProfileStub(page, { log } = {}) {
  await page.route('**/sb-test.localhost/**', async route => {
    const req = route.request();
    const url = req.url();
    if (isProfilesGet(url, req.method())) {
      if (log) log('profiles GET answered by the targeted entitled-reader stub: ' + url);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(entitledProfileBody()) });
    }
    return route.fallback();
  });
}
