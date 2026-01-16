// Local proxy endpoint for story generation
// Uses xAI Grok API with configurable API key

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const XAI_API_KEY = process.env.XAI_API_KEY;

  if (!XAI_API_KEY) {
    console.error('[PROXY] XAI_API_KEY not configured');
    // Return a structured error that the frontend can handle
    return res.status(500).json({
      error: 'API key not configured',
      details: 'XAI_API_KEY environment variable is not set. Please configure your xAI API key.'
    });
  }

  try {
    const { messages, model, temperature = 0.7, max_tokens = 1000 } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Normalize model name (support both hyphen and dot formats)
    // xAI API expects: grok-4.1-fast-reasoning (with dots)
    const normalizedModel = (model || 'grok-4.1-fast-reasoning')
      .replace(/grok-4-1/g, 'grok-4.1')
      .replace(/grok-3-5/g, 'grok-3.5');

    console.log(`[PROXY] Calling xAI API with model: ${normalizedModel}`);

    const xaiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: normalizedModel,
        messages: messages,
        temperature: temperature,
        max_tokens: max_tokens
      })
    });

    const responseText = await xaiResponse.text();

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[PROXY] Non-JSON response from xAI:', responseText.slice(0, 500));
      return res.status(502).json({
        error: 'Invalid response from xAI API',
        details: responseText.slice(0, 200)
      });
    }

    if (!xaiResponse.ok) {
      console.error('[PROXY] xAI API error:', data);
      return res.status(xaiResponse.status).json({
        error: data.error?.message || 'xAI API request failed',
        details: data
      });
    }

    // Validate response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[PROXY] Malformed xAI response:', data);
      return res.status(502).json({
        error: 'Malformed response from xAI API',
        details: 'Response missing choices[0].message'
      });
    }

    // Return the successful response
    return res.status(200).json(data);

  } catch (err) {
    console.error('[PROXY] Request failed:', err.message);
    return res.status(502).json({
      error: 'Failed to contact xAI API',
      details: err.message
    });
  }
}
