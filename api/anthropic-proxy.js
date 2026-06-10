/**
 * =============================================================================
 * STORYBOUND ANTHROPIC PROXY — TIER-A PROSE ENDPOINT
 * =============================================================================
 *
 * Mirrors the shape of chatgpt-proxy.js so the orchestration client can
 * route Claude (Opus / Sonnet) requests through the same callChatGPT
 * surface. Claude slugs are detected client-side and dispatched here.
 *
 * Used for:
 *   • Tier A major scenes (Scene 1, apex, betrayal, ST3-ST6) → Opus
 *   • Tier A in-between scenes → Sonnet
 *   • Tier B Scene 1-3 (opening window) → Sonnet
 *
 * Not used for:
 *   • Tier B key scenes (gpt-4o via chatgpt-proxy)
 *   • Connective scenes (gpt-4o-mini via chatgpt-proxy)
 *   • Mode 1 explicit content (Grok via /api/proxy)
 *
 * Anthropic API differences from OpenAI handled here:
 *   • system messages are top-level `system` param, not in messages array
 *   • response shape is content[].text array, not choices[0].message.content
 *   • max_tokens is REQUIRED
 *   • anthropic-version header is REQUIRED
 *   • No native JSON mode (prompt-driven JSON if needed)
 *
 * Prompt caching:
 *   • Clients may send a system message whose `content` is an ARRAY of
 *     {type:'text', text, cache_control?} blocks instead of a string.
 *     Blocks are forwarded as the top-level `system` array so Anthropic
 *     caches anything marked with cache_control. The legacy string form
 *     still works — when ALL system messages are strings, they are
 *     joined and sent as a plain string (no cache).
 *   • Same array form is honored on user/assistant `content` if the
 *     caller wants to mark a long user-side block as cacheable.
 *   • Extended (1-hour) cache TTL is requested via the
 *     extended-cache-ttl-2025-04-11 beta header so caches survive longer
 *     reader pauses between scenes. Standard ephemeral cache_control
 *     still produces 5-min entries — beta header just unlocks the
 *     `{type:'ephemeral', ttl:'1h'}` variant when callers ask for it.
 *   • Usage response surfaces `cache_creation_input_tokens` and
 *     `cache_read_input_tokens` so the client cost accumulator can
 *     price cached/written tokens correctly.
 * =============================================================================
 */

const ALLOWED_CLAUDE_MODELS = new Set([
  'claude-opus-4-7',
  'claude-opus-4-1',
  'claude-sonnet-4-5',
  'claude-haiku-4-5'
]);

const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_BETA_HEADERS = 'extended-cache-ttl-2025-04-11';

// Models that DEPRECATE the `temperature` sampling param — sending it returns
// HTTP 400 ("`temperature` is deprecated for this model."). Opus 4.7 is the
// first; newer reasoning-tuned models are expected to follow. For these we
// omit temperature entirely (the model self-manages sampling). Without this,
// EVERY call to such a model 400s and silently falls back to a lesser model —
// so the scaffolder/prose layer never actually runs on Opus.
const TEMPERATURE_DEPRECATED_MODELS = new Set([
  'claude-opus-4-7'
]);

// SECURITY: server-side prompt-injection scrub on user-role messages.
// Mirrors public/app.js _HARD_INJECTION_RX. See api/_sanitize-injection.js.
const { sanitizeUserMessages } = require('./_sanitize-injection.js');

module.exports = async function handler(req, res) {
  // CORS — same allowlist as chatgpt-proxy
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love'
    || origin === 'https://www.storybound.love'
    || origin.startsWith('http://localhost')
    ? origin
    : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    console.error('[ANTHROPIC-PROXY] ANTHROPIC_API_KEY not configured');
    return res.status(500).json({
      error: 'API key not configured',
      details: 'ANTHROPIC_API_KEY environment variable is not set.'
    });
  }

  try {
    const {
      messages: _rawMessages,
      model,
      temperature = 0.7,
      max_tokens = 2000,
      response_format,  // No native support; logged for diagnostics
      user_id
    } = req.body || {};
    // SECURITY: scrub user-role messages before any downstream code touches them.
    const messages = sanitizeUserMessages(_rawMessages, 'anthropic');

    // ── Validate ──
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required', code: 'MISSING_MESSAGES' });
    }
    if (!model || !ALLOWED_CLAUDE_MODELS.has(model)) {
      return res.status(400).json({
        error: 'Model not allowed',
        code: 'MODEL_NOT_ALLOWED',
        requestedModel: model,
        allowedModels: Array.from(ALLOWED_CLAUDE_MODELS)
      });
    }

    // ── Reshape messages for Anthropic ──
    // Anthropic requires:
    //   • system as a top-level string OR array of text blocks (not in messages)
    //   • messages array contains only role:'user' and role:'assistant'
    //   • messages must alternate user/assistant (we'll trust the caller; if
    //     consecutive same-role messages arrive we concatenate their content)
    //
    // Each message.content may be a string (legacy) or an array of
    // {type:'text', text, cache_control?} blocks (caching path). Both shapes
    // are accepted on system + user + assistant.
    const systemBlocks = [];
    let systemHasCache = false;
    const turnMessages = [];

    const _normalizeBlocks = (content) => {
      if (typeof content === 'string') return [{ type: 'text', text: content }];
      if (!Array.isArray(content)) return null;
      const out = [];
      for (const b of content) {
        if (!b || typeof b !== 'object') continue;
        if (b.type !== 'text' || typeof b.text !== 'string') continue;
        const block = { type: 'text', text: b.text };
        if (b.cache_control && typeof b.cache_control === 'object') {
          block.cache_control = b.cache_control;
        }
        out.push(block);
      }
      return out.length > 0 ? out : null;
    };

    for (const m of messages) {
      if (!m) continue;
      const blocks = _normalizeBlocks(m.content);
      if (!blocks) continue;
      if (m.role === 'system') {
        for (const b of blocks) {
          if (b.cache_control) systemHasCache = true;
          systemBlocks.push(b);
        }
      } else if (m.role === 'user' || m.role === 'assistant') {
        const last = turnMessages[turnMessages.length - 1];
        // Only merge if BOTH neighbors are plain-string single blocks
        // with no cache_control — preserving cache breakpoints matters.
        const isPlainSingle = (msg) =>
          Array.isArray(msg.content)
          && msg.content.length === 1
          && msg.content[0].type === 'text'
          && !msg.content[0].cache_control;
        const incomingIsPlainSingle = blocks.length === 1 && !blocks[0].cache_control;
        if (last && last.role === m.role && isPlainSingle(last) && incomingIsPlainSingle) {
          last.content[0].text += '\n\n' + blocks[0].text;
        } else {
          turnMessages.push({ role: m.role, content: blocks });
        }
      }
    }
    if (turnMessages.length === 0) {
      return res.status(400).json({ error: 'No user/assistant messages after reshape', code: 'EMPTY_TURNS' });
    }
    // Anthropic requires first turn to be 'user' — if it's 'assistant',
    // prepend a placeholder user turn carrying any system content tail.
    if (turnMessages[0].role !== 'user') {
      turnMessages.unshift({ role: 'user', content: [{ type: 'text', text: '(continue)' }] });
    }

    // If no system message was sent, leave system undefined.
    // If system has cache_control anywhere, send as array (preserves cache breakpoints).
    // Otherwise collapse to string for log-friendliness and to match legacy proxy shape.
    let system;
    if (systemBlocks.length === 0) {
      system = undefined;
    } else if (systemHasCache) {
      system = systemBlocks;
    } else {
      system = systemBlocks.map(b => b.text).join('\n\n');
    }

    const systemChars = typeof system === 'string'
      ? system.length
      : Array.isArray(system) ? system.reduce((n, b) => n + (b.text ? b.text.length : 0), 0) : 0;
    const cacheBreakpoints = Array.isArray(system) ? system.filter(b => b.cache_control).length : 0;
    console.log(`[ANTHROPIC-PROXY] Model: ${model}, turns: ${turnMessages.length}, system: ${systemChars ? systemChars + ' chars' : 'none'}${cacheBreakpoints ? `, cache_breakpoints: ${cacheBreakpoints}` : ''}, max_tokens: ${max_tokens}`);
    if (response_format) {
      console.log(`[ANTHROPIC-PROXY] response_format requested (${JSON.stringify(response_format).slice(0, 60)}) — Anthropic has no native JSON mode; relying on prompt-driven JSON.`);
    }

    // ── Call Anthropic ──
    const anthropicBody = {
      model: model,
      messages: turnMessages,
      max_tokens: max_tokens
    };
    // Omit temperature for models that deprecate it (Opus 4.7+) — including
    // it returns HTTP 400. All other models keep the caller's temperature.
    if (!TEMPERATURE_DEPRECATED_MODELS.has(model)) {
      anthropicBody.temperature = temperature;
    }
    if (system) anthropicBody.system = system;

    const requestHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION
    };
    // Only request the extended-cache-ttl beta when the request actually
    // uses cache_control — keeps non-caching calls on plain stable API.
    if (cacheBreakpoints > 0) {
      requestHeaders['anthropic-beta'] = ANTHROPIC_BETA_HEADERS;
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(anthropicBody)
    });

    const responseText = await anthropicResponse.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[ANTHROPIC-PROXY] Non-JSON response from Anthropic:', responseText.slice(0, 500));
      return res.status(502).json({ error: 'Invalid response from Anthropic API', details: responseText.slice(0, 200) });
    }

    if (!anthropicResponse.ok) {
      console.error('[ANTHROPIC-PROXY] Anthropic API error:', data);
      return res.status(anthropicResponse.status).json({
        error: (data.error && data.error.message) || 'Anthropic API request failed',
        details: data
      });
    }

    // ── Normalize response to chatgpt-proxy shape ──
    // Anthropic returns { content: [{ type: 'text', text: '...' }, ...], usage: {...} }
    // Concatenate any text blocks; ignore tool_use / other types here.
    let textOut = '';
    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block && block.type === 'text' && typeof block.text === 'string') {
          textOut += block.text;
        }
      }
    }
    if (!textOut) {
      console.error('[ANTHROPIC-PROXY] Empty text content in response:', JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ error: 'Empty response from Anthropic API' });
    }

    // Match chatgpt-proxy normalized shape so clients are interchangeable.
    let parsedContent = null;
    try { parsedContent = JSON.parse(textOut); } catch (_) { /* not JSON, fine */ }

    const normalizedResponse = {
      ok: true,
      content: textOut,
      ...(parsedContent || {}),
      canonical_instruction: (parsedContent && parsedContent.canonical_instruction) || textOut,
      _orchestration: {
        provider: 'anthropic',
        model: model,
        timestamp: new Date().toISOString(),
        // Surface stop_reason so client diagnostics can distinguish
        // max_tokens truncation from refusals from clean end_turn.
        // Anthropic values: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | 'refusal'
        stop_reason: data.stop_reason || null,
        stop_sequence: data.stop_sequence || null
      },
      // Anthropic usage shape: { input_tokens, output_tokens,
      //                          cache_creation_input_tokens?,
      //                          cache_read_input_tokens? }
      // Normalize to OpenAI-ish shape so accumulators don't break, and
      // surface the cache fields so the client cost tracker can price
      // them correctly (5-min writes 1.25x input, 1-hour writes 2x, reads 0.1x).
      usage: data.usage ? {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
        // Preserve original for cost calc
        input_tokens: data.usage.input_tokens,
        output_tokens: data.usage.output_tokens,
        // Cache telemetry — only present when cache_control was used.
        // cache_creation_input_tokens is the FLAT write total; data.usage.cache_creation
        // breaks it down by TTL (ephemeral_1h = 2x input, ephemeral_5m = 1.25x) when
        // extended-cache-ttl is in play. Surface both so the client prices each
        // TTL correctly instead of assuming the 5-min rate (Roman 2026-06-06).
        cache_creation_input_tokens: data.usage.cache_creation_input_tokens || 0,
        cache_creation_1h_input_tokens: (data.usage.cache_creation && data.usage.cache_creation.ephemeral_1h_input_tokens) || 0,
        cache_creation_5m_input_tokens: (data.usage.cache_creation && data.usage.cache_creation.ephemeral_5m_input_tokens) || 0,
        cache_read_input_tokens: data.usage.cache_read_input_tokens || 0
      } : null
    };

    return res.status(200).json(normalizedResponse);

  } catch (err) {
    console.error('[ANTHROPIC-PROXY] Request failed:', err.message);
    return res.status(502).json({ error: 'Failed to contact Anthropic API', details: err.message });
  }
};
