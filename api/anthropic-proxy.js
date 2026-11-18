/**
 * ISOLATED ANTHROPIC ROUTE — calibration only. NOT part of Storybound orchestration.
 *
 * WHY THIS EXISTS AND WHY IT IS SEPARATE (Roman 2026-09-24):
 * Storybound's normal orchestration redirects Anthropic model names to Mistral, so a calibration
 * that went through the usual path would silently measure a different vendor's model and file the
 * result under "Claude Haiku". That is the exact class of silent substitution this session has
 * already been bitten by twice (the proxy's author-class reasoning default, and every grok-* alias
 * resolving to 4.3). This route is deliberately NOT reachable from any production caller: nothing
 * in public/app.js routes here except the canon-auditor calibration's explicit single-tier pin.
 *
 * It is narrow on purpose:
 *   - a hard model allowlist; anything else is refused, never silently swapped;
 *   - extended thinking is EXPLICIT — the caller asks for it and the response reports what was
 *     actually served, so "thinking was enabled" is evidence, not an assumption;
 *   - the API key is read from env and never logged, echoed, or returned.
 */

// Only models this calibration is allowed to measure. A name outside this list is refused rather
// than resolved to something else — the whole point of the route.
const ALLOWED_ANTHROPIC_MODELS = [
  'claude-haiku-4-5-20251001',   // Claude Haiku 4.5 — canon-auditor calibration candidate
  'claude-sonnet-5-5',           // Claude Sonnet 5.5 — literary author comparison arm.
  // Claude Haiku 5.5 — RE-ADMITTED 2026-10-26 for the ten-scene literary continuation test
  // (Sol opening, Haiku continuations). Re-admitted on the facts this file already recorded when
  // it was removed: it is the CURRENT Haiku, it SUPPORTS `effort` (4.5 does not), thinking counts
  // toward max_tokens so max_tokens bounds total billable output, and it is priced by prompt
  // length — $0.10/$0.50 per MTok up to 100,000 input tokens, $0.50/$2.50 above it. The test's
  // packets measure ~165k input tokens, so the ABOVE-100k tier applies. Send `effort`, leave
  // thinking_budget_tokens unset. REMOVE AGAIN once that test is reported, as before.
  'claude-haiku-5-5'
  // claude-haiku-5-5 was admitted here on 2026-10-22 for ONE authorized six-writer ABC
  // comparison and REMOVED once it was reported. Recorded for the next time it is asked for:
  // it is the CURRENT Haiku (4.5 above is legacy) and, unlike 4.5, it SUPPORTS the `effort`
  // parameter — Haiku 4.5 is not in that parameter's supported-model list at all. Adaptive
  // thinking, documented default effort 'medium', and thinking counts toward max_tokens, so
  // max_tokens bounds total billable output: send `effort` and leave thinking_budget_tokens
  // unset. It is the one current model priced by prompt length — $0.10/MTok in and $0.50/MTok
  // out up to 100,000 input tokens, $0.50/$2.50 above it.
  // Measured once at 33,837 input chars / cap 3,000 / effort medium: $0.0020647.
  // claude-opus-5-5 was admitted here on 2026-10-22 for ONE authorized ABC writing comparison
  // and REMOVED once it was reported. Recorded for the next time it is asked for: Opus 5.5 uses
  // ADAPTIVE thinking, so thinking.type 'enabled' + budget_tokens returns a 400 on Claude 4.7 and
  // later; this route must send `effort` (-> output_config.effort) and leave `thinking` off. Its
  // documented default effort is 'medium', and max_tokens bounds thinking + visible output.
  // Measured once at 30,745 input chars / cap 2,500: $0.0867240.
  // NOTE, and it differs from Haiku 4.5: Sonnet 5.5 has ADAPTIVE thinking (docs default effort
  // `high`), and the manual thinking.type 'enabled' + budget_tokens mode this route implements is
  // documented as NOT ACCEPTED on models after the 4.6 generation. So a caller must leave
  // thinking_budget_tokens unset for this model; the route already omits the field when it is,
  // which is the only configuration that reaches Sonnet 5.5 without an upstream rejection.
];

// Extended thinking has a documented floor of 1024 budget tokens, and max_tokens must exceed the
// budget or the answer has no room left after thinking.
const MIN_THINKING_BUDGET = 1024;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'missing_api_key', detail: 'ANTHROPIC_API_KEY is not configured' });
  }

  try {
    const {
      model, messages, max_tokens, temperature,
      thinking_budget_tokens,        // manual budget mode; 4.6 and earlier ONLY
      thinking_type,                 // Claude 5: 'between_tools' etc. — forwarded verbatim
      effort,                        // Claude 5: output_config.effort
      role
    } = req.body || {};

    if (!ALLOWED_ANTHROPIC_MODELS.includes(String(model))) {
      return res.status(400).json({
        error: 'disallowed_model',
        detail: 'this isolated calibration route serves only: ' + ALLOWED_ANTHROPIC_MODELS.join(', '),
        received: String(model)
      });
    }
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: 'missing_messages' });
    }

    // Anthropic takes the system prompt as a TOP-LEVEL field, not as a messages[] entry. Leaving a
    // system message in the array would be rejected — or worse, silently treated as a user turn,
    // changing what the model was actually asked.
    const systemMsgs = messages.filter((m) => m && m.role === 'system');
    const turnMsgs = messages.filter((m) => m && m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }));
    const system = systemMsgs.map((m) => String(m.content || '')).join('\n\n');

    const maxTokens = Number(max_tokens) || 2000;
    let budget = (thinking_budget_tokens != null) ? Number(thinking_budget_tokens) : 0;
    const wantThinking = budget > 0;
    if (wantThinking) {
      if (budget < MIN_THINKING_BUDGET) budget = MIN_THINKING_BUDGET;
      if (budget >= maxTokens) {
        return res.status(400).json({
          error: 'invalid_thinking_budget',
          detail: 'max_tokens (' + maxTokens + ') must exceed thinking_budget_tokens (' + budget + ')'
        });
      }
    }

    const body = { model: String(model), max_tokens: maxTokens, messages: turnMsgs };
    // ── EXPLICIT ONE-HOUR PROMPT CACHING (2026-10-14) ─────────────────────────────────────────
    // This route previously sent `system` as a plain string with no cache configuration at all —
    // no breakpoint, no TTL — so nothing on it could ever be cached. Caching is a PREFIX match
    // (render order tools -> system -> messages), so a breakpoint only pays where the leading
    // bytes are byte-identical across requests.
    //
    // `cache_prefix_chars` is the caller's measured stable prefix length. The system string is
    // split there into TWO blocks and `cache_control` is placed on the FIRST, so everything after
    // it stays volatile and invalidates nothing. Nothing is reordered or removed: the
    // concatenation of the two blocks is byte-identical to the single string it replaces.
    //
    // Haiku 4.5's minimum cacheable prefix is 4096 TOKENS — the highest of any model — so a split
    // below that is refused rather than sent: a breakpoint that cannot bind is either a silent
    // no-op or, once it is large enough to write but badly placed, a pure write surcharge.
    // ttl '1h' doubles the write premium (2x vs 1.25x for 5m), which is why the caller must have
    // decided the reuse count is worth it.
    const _cachePrefixChars = Number(req.body && req.body.cache_prefix_chars) || 0;
    const _CACHE_MIN_TOKENS = 4096;
    const _cacheApproxTokens = Math.floor(_cachePrefixChars / 3.97);
    let _cacheApplied = null;
    if (system) {
      if (_cachePrefixChars > 0 && _cachePrefixChars < system.length
          && _cacheApproxTokens >= _CACHE_MIN_TOKENS) {
        body.system = [
          { type: 'text', text: system.slice(0, _cachePrefixChars),
            cache_control: { type: 'ephemeral', ttl: '1h' } },
          { type: 'text', text: system.slice(_cachePrefixChars) },
        ];
        _cacheApplied = { prefixChars: _cachePrefixChars, approxPrefixTokens: _cacheApproxTokens,
          ttl: '1h', blocks: 2 };
      } else {
        body.system = system;
        if (_cachePrefixChars > 0) {
          _cacheApplied = { skipped: true,
            why: _cacheApproxTokens < _CACHE_MIN_TOKENS
              ? ('prefix ~' + _cacheApproxTokens + ' tok is below the ' + _CACHE_MIN_TOKENS + '-token minimum')
              : 'prefix is not shorter than the system string',
            prefixChars: _cachePrefixChars };
        }
      }
    }
    if (_cacheApplied) {
      console.log('[ANTHROPIC-PROXY] cache_control: ' + JSON.stringify(_cacheApplied));
    }

    // PROVIDER-FREE VERIFICATION OF THE FINAL UPSTREAM BODY. Returns exactly what WOULD be sent,
    // without sending it, so the cache configuration can be inspected as it will actually leave
    // rather than as an intermediate prompt. No API key is read and no request is made.
    if (req.body && req.body.dry_run_body === true) {
      return res.status(200).json({
        dry_run: true,
        upstream_body_shape: {
          model: body.model,
          max_tokens: body.max_tokens,
          system_type: Array.isArray(body.system) ? 'blocks' : (body.system ? 'string' : 'absent'),
          system_blocks: Array.isArray(body.system)
            ? body.system.map((b) => ({ type: b.type, chars: String(b.text || '').length,
                cache_control: b.cache_control || null }))
            : null,
          system_chars_total: Array.isArray(body.system)
            ? body.system.reduce((n, b) => n + String(b.text || '').length, 0)
            : String(body.system || '').length,
          messages: (body.messages || []).map((m) => ({ role: m.role, chars: String(m.content || '').length })),
          thinking: body.thinking || null,
          output_config: body.output_config || null,
          temperature: (body.temperature != null) ? body.temperature : null,
        },
        cache: _cacheApplied,
      });
    }
    // THREE DISTINCT THINKING CONFIGURATIONS, and the model generation decides which is legal.
    //   · manual budget (thinking.type 'enabled' + budget_tokens) — 4.6 and earlier only;
    //   · a Claude 5 thinking.type such as 'between_tools', paired with output_config.effort.
    //     With NO tools supplied this yields text without up-front thinking, which is the only
    //     documented way to stop Sonnet 5.5 spending its whole max_tokens on thinking.
    //     thinking.type 'disabled' is rejected by this model, so it is NOT offered here;
    //   · neither, which on a Claude 5 model means ADAPTIVE thinking at the model's default
    //     effort — emphatically NOT "thinking off". Omission is not a setting.
    if (wantThinking) {
      body.thinking = { type: 'enabled', budget_tokens: budget };
      // Extended thinking requires temperature 1; sending anything else is rejected upstream. The
      // caller's temperature is deliberately IGNORED here rather than passed through to fail.
    } else {
      if (thinking_type) body.thinking = { type: String(thinking_type) };
      if (effort) body.output_config = { effort: String(effort) };
      // Temperature is rejected outright by Sonnet 5.5 ("deprecated for this model"), so it is
      // forwarded only when the caller actually supplies one.
      if (temperature != null) body.temperature = Number(temperature);
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); }
    catch (_) {
      return res.status(502).json({ error: 'invalid_response_from_anthropic', details: text.slice(0, 300) });
    }

    if (!upstream.ok) {
      console.error('[ANTHROPIC-PROXY] provider error ' + upstream.status);
      for (const h of ['retry-after', 'anthropic-ratelimit-requests-remaining',
                       'anthropic-ratelimit-tokens-remaining', 'anthropic-ratelimit-tokens-reset']) {
        const v = upstream.headers.get(h);
        if (v != null) res.setHeader(h, v);
      }
      return res.status(upstream.status).json({
        error: (data && data.error && data.error.message) || 'Anthropic API request failed',
        provider_status: upstream.status,
        details: data
      });
    }

    // Anthropic returns content as an ARRAY OF BLOCKS. Flatten text blocks for the caller and keep
    // the thinking separate — pasting a reasoning trace into the answer would corrupt the reply,
    // and discarding it would lose the only direct evidence that thinking actually ran.
    const blocks = Array.isArray(data.content) ? data.content : [];
    const contentText = blocks.filter((b) => b && b.type === 'text').map((b) => String(b.text || '')).join('');
    const thinkingText = blocks.filter((b) => b && b.type === 'thinking')
      .map((b) => String(b.thinking || b.text || '')).join('\n');

    console.log('[ANTHROPIC-PROXY] ' + String(model) + ' in=' + ((data.usage && data.usage.input_tokens) || 0)
      + ' out=' + ((data.usage && data.usage.output_tokens) || 0)
      + ' thinkingReq=' + (wantThinking ? ('manual(' + budget + ')')
          : (thinking_type ? String(thinking_type) : 'unset/default'))
      + ' thinkingTokens=' + ((data.usage && data.usage.output_tokens_details
          && data.usage.output_tokens_details.thinking_tokens) ?? 'n/a')
      + ' thinkingChars=' + thinkingText.length);

    return res.status(200).json({
      // THE UNTRANSFORMED UPSTREAM REPLY, kept alongside the flattened convenience fields. The
      // flattening below drops the block structure and, on a reply with no text blocks, leaves
      // nothing at all to inspect — which is exactly the case that needed diagnosing. The request
      // id comes from the response headers and is what Anthropic support can trace.
      _upstreamRaw: data,
      _upstreamRequestId: upstream.headers.get('request-id')
        || upstream.headers.get('anthropic-request-id') || null,
      content: contentText,
      thinking: thinkingText || null,
      usage: data.usage || null,
      stop_reason: data.stop_reason || null,
      _orchestration: {
        role: role || null,
        provider: 'anthropic',
        // The model the PROVIDER says it served, not the one we asked for.
        model: data.model || String(model),
        // WHAT WAS ASKED FOR. Reporting `thinking_enabled: false` merely because no manual
        // budget was supplied was MISLEADING on a Claude 5 model, where the default is adaptive
        // thinking that bills as output: one such call spent all 2,400 of its max_tokens on
        // thinking and returned no prose while this field said thinking was off.
        thinking_requested: wantThinking ? 'manual_budget'
          : (thinking_type ? String(thinking_type) : 'unset (model default — adaptive on Claude 5)'),
        thinking_budget_tokens: wantThinking ? budget : 0,
        effort_requested: effort ? String(effort) : null,
        // WHAT THE PROVIDER SAYS IT DID — the authority, independent of what was requested.
        thinking_tokens_reported: (data.usage && data.usage.output_tokens_details
          && data.usage.output_tokens_details.thinking_tokens) ?? null,
        thinking_chars: thinkingText.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[ANTHROPIC-PROXY] failure:', err && err.message);
    return res.status(500).json({ error: 'anthropic_proxy_failure', detail: (err && err.message) || String(err) });
  }
};
