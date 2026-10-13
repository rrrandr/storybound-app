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
  'claude-sonnet-5-5'            // Claude Sonnet 5.5 — literary author comparison arm.
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
    if (system) body.system = system;
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
