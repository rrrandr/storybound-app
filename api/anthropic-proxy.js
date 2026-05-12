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
 * =============================================================================
 */

const ALLOWED_CLAUDE_MODELS = new Set([
  'claude-opus-4-1',
  'claude-sonnet-4-5',
  'claude-haiku-4-5'
]);

const ANTHROPIC_VERSION = '2023-06-01';

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
      messages,
      model,
      temperature = 0.7,
      max_tokens = 2000,
      response_format,  // No native support; logged for diagnostics
      user_id
    } = req.body || {};

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
    //   • system as a top-level string (concatenation of any role:'system' messages)
    //   • messages array contains only role:'user' and role:'assistant'
    //   • messages must alternate user/assistant (we'll trust the caller; if
    //     consecutive same-role messages arrive we concatenate their content)
    const systemParts = [];
    const turnMessages = [];
    for (const m of messages) {
      if (!m || typeof m.content !== 'string') continue;
      if (m.role === 'system') {
        systemParts.push(m.content);
      } else if (m.role === 'user' || m.role === 'assistant') {
        const last = turnMessages[turnMessages.length - 1];
        if (last && last.role === m.role) {
          // Merge same-role consecutive messages (Anthropic rejects them)
          last.content += '\n\n' + m.content;
        } else {
          turnMessages.push({ role: m.role, content: m.content });
        }
      }
    }
    if (turnMessages.length === 0) {
      return res.status(400).json({ error: 'No user/assistant messages after reshape', code: 'EMPTY_TURNS' });
    }
    // Anthropic requires first turn to be 'user' — if it's 'assistant',
    // prepend a placeholder user turn carrying any system content tail.
    if (turnMessages[0].role !== 'user') {
      turnMessages.unshift({ role: 'user', content: '(continue)' });
    }

    const system = systemParts.length > 0 ? systemParts.join('\n\n') : undefined;

    console.log(`[ANTHROPIC-PROXY] Model: ${model}, turns: ${turnMessages.length}, system: ${system ? system.length + ' chars' : 'none'}, max_tokens: ${max_tokens}`);
    if (response_format) {
      console.log(`[ANTHROPIC-PROXY] response_format requested (${JSON.stringify(response_format).slice(0, 60)}) — Anthropic has no native JSON mode; relying on prompt-driven JSON.`);
    }

    // ── Call Anthropic ──
    const anthropicBody = {
      model: model,
      messages: turnMessages,
      max_tokens: max_tokens,
      temperature: temperature
    };
    if (system) anthropicBody.system = system;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION
      },
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
        timestamp: new Date().toISOString()
      },
      // Anthropic usage shape: { input_tokens, output_tokens }
      // Normalize to OpenAI-ish shape so accumulators don't break.
      usage: data.usage ? {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
        // Preserve original for cost calc
        input_tokens: data.usage.input_tokens,
        output_tokens: data.usage.output_tokens
      } : null
    };

    return res.status(200).json(normalizedResponse);

  } catch (err) {
    console.error('[ANTHROPIC-PROXY] Request failed:', err.message);
    return res.status(502).json({ error: 'Failed to contact Anthropic API', details: err.message });
  }
};
