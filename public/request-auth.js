// Attach the current session only to Storybound's own protected endpoints.
(function () {
  function authenticatedFetch(fetchImpl, getSession, getStoryId, origin) {
    var paths = /^\/api\/(?:proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy|anthropic-proxy|purchase-issue|refund-fortune|billing-portal|consume-tempt-charge|record-tempt-failure|grant-welcome-milestone|record-legal-acceptance)$/;
    return async function (input, init) {
      var url = new URL(typeof input === 'string' ? input : (input.url || String(input)), origin);
      if (url.origin !== origin || !paths.test(url.pathname)) return fetchImpl(input, init);
      var headers = new Headers(typeof input === 'object' && input.headers ? input.headers : undefined);
      new Headers(init && init.headers).forEach(function (v, k) { headers.set(k, v); });
      if (!headers.has('Authorization')) {
        var session = null;
        try { session = await getSession(); } catch (_) {}
        if (!session || !session.access_token) return new Response(JSON.stringify({error:'authentication_required'}), {status:401, headers:{'Content-Type':'application/json'}});
        headers.set('Authorization', 'Bearer ' + session.access_token);
      }
      var next = Object.assign({}, init || {}, {headers:headers});
      if (/proxy$/.test(url.pathname) && typeof next.body === 'string') {
        try {
          var body = JSON.parse(next.body), storyId = getStoryId();
          if (body && typeof body === 'object' && !Array.isArray(body) && !body.storyId && storyId) {
            body.storyId = storyId; next.body = JSON.stringify(body);
          }
        } catch (_) {}
      }
      return fetchImpl(input, next);
    };
  }
  window.SB_REQUEST_AUTH = {authenticatedFetch:authenticatedFetch};
})();
