/**
 * =============================================================================
 * STORYBOUND GEMINI PROXY — FALLBACK AUTHOR ENDPOINT
 * =============================================================================
 *
 * AUTHORITATIVE DOCUMENT — DO NOT REINTERPRET
 *
 * This endpoint handles fallback calls to Google Gemini when ChatGPT
 * (the primary author) fails or refuses a request.
 *
 * Gemini is a FALLBACK AUTHOR and produces conservative output.
 * It follows the same orchestration rules as ChatGPT but with lower
 * temperature to reduce risk of refusal cascades.
 *
 * =============================================================================
 */

// Model allowlist — only these Gemini models may be used
const ALLOWED_GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

module.exports = async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    console.error('[GEMINI-PROXY] GEMINI_API_KEY not configured');
    return res.status(500).json({
      error: 'API key not configured',
      details: 'GEMINI_API_KEY environment variable is not set.'
    });
  }

  try {
    const {
      messages,
      model = 'gemini-2.0-flash',
      role = 'FALLBACK_AUTHOR',
      temperature = 0.5,
      max_tokens = 1500,
      response_format
    } = req.body;

    // ==========================================================================
    // VALIDATE REQUEST
    // ==========================================================================

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Messages array is required',
        code: 'MISSING_MESSAGES'
      });
    }

    if (!ALLOWED_GEMINI_MODELS.includes(model)) {
      console.error(`[GEMINI-PROXY] Model "${model}" not in allowlist.`);
      return res.status(400).json({
        error: 'Model not allowed',
        code: 'MODEL_VALIDATION_FAILED',
        requestedModel: model,
        allowedModels: ALLOWED_GEMINI_MODELS
      });
    }

    console.log(`[GEMINI-PROXY] Role: ${role}, Model: ${model}`);

    // ==========================================================================
    // CONVERT OPENAI MESSAGE FORMAT → GEMINI FORMAT
    // ==========================================================================

    let systemInstruction = null;
    const contents = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Gemini uses systemInstruction for system prompts
        systemInstruction = systemInstruction
          ? { parts: [{ text: systemInstruction.parts[0].text + '\n\n' + msg.content }] }
          : { parts: [{ text: msg.content }] };
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    // Gemini requires at least one content entry
    if (contents.length === 0) {
      return res.status(400).json({
        error: 'No user/assistant messages found after filtering system messages',
        code: 'NO_CONTENT'
      });
    }

    // ==========================================================================
    // CALL GEMINI API
    // ==========================================================================

    const geminiBody = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: max_tokens
      }
    };

    if (systemInstruction) {
      geminiBody.systemInstruction = systemInstruction;
    }

    if (response_format && response_format.type === 'json_object') {
      geminiBody.generationConfig.responseMimeType = 'application/json';
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody)
      }
    );

    const responseText = await geminiResponse.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[GEMINI-PROXY] Non-JSON response from Gemini:', responseText.slice(0, 500));
      return res.status(502).json({
        error: 'Invalid response from Gemini API',
        details: responseText.slice(0, 200)
      });
    }

    if (!geminiResponse.ok) {
      console.error('[GEMINI-PROXY] Gemini API error:', data);
      return res.status(geminiResponse.status).json({
        error: data.error?.message || 'Gemini API request failed',
        details: data
      });
    }

    // Validate response structure
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('[GEMINI-PROXY] Malformed Gemini response:', data);
      return res.status(502).json({
        error: 'Malformed response from Gemini API',
        details: 'Response missing candidates[0].content'
      });
    }

    // ==========================================================================
    // NORMALIZE RESPONSE → OPENAI-COMPATIBLE FORMAT
    // ==========================================================================
    // The client (callGemini in orchestration-client.js) expects:
    //   data.choices[0].message.content
    //   data.usage.total_tokens

    const geminiContent = data.candidates[0].content.parts
      .map(p => p.text)
      .join('');

    const usage = data.usageMetadata ? {
      prompt_tokens: data.usageMetadata.promptTokenCount || 0,
      completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
      total_tokens: data.usageMetadata.totalTokenCount || 0
    } : null;

    const normalizedResponse = {
      choices: [{
        message: {
          role: 'assistant',
          content: geminiContent
        },
        finish_reason: data.candidates[0].finishReason || 'stop'
      }],
      usage,
      _orchestration: {
        role,
        model,
        provider: 'gemini',
        timestamp: new Date().toISOString()
      }
    };

    return res.status(200).json(normalizedResponse);

  } catch (err) {
    console.error('[GEMINI-PROXY] Request failed:', err.message);
    return res.status(502).json({
      error: 'Failed to contact Gemini API',
      details: err.message
    });
  }
};
