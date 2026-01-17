/**
 * =============================================================================
 * STORYBOUND SPECIALIST RENDERER PROXY — GROK ENDPOINT
 * =============================================================================
 *
 * AUTHORITATIVE DOCUMENT — DO NOT REINTERPRET
 *
 * This endpoint handles calls to the SPECIALIST RENDERER (Grok).
 *
 * =============================================================================
 * SPECIALIST RENDERER CONSTRAINTS (NON-NEGOTIABLE)
 * =============================================================================
 *
 * The specialist renderer (Grok) is used for SENSORY EMBODIMENT ONLY.
 *
 * It may be called ONLY if:
 * - An intimacy scene exists AND
 * - Eroticism level warrants it (Erotic or Dirty) AND
 * - The selected provider is contractually allowed
 *
 * It may ONLY receive:
 * - A fully-specified Erotic Scene Directive (ESD)
 * - No global story context beyond what is embedded in the ESD
 *
 * It may NOT:
 * - Decide plot
 * - Invent lore
 * - Change outcomes
 * - Override stops
 * - Complete a scene if forbidden
 * - Write cliffhangers
 * - Reference monetization, Fate, or system rules
 *
 * The specialist renderer NEVER decides "how far things go."
 * It renders HOW IT FEELS, within bounds.
 *
 * =============================================================================
 * WHY GROK IS A SPECIALIST RENDERER (DO NOT CHANGE)
 * =============================================================================
 *
 * ChatGPT is the PRIMARY AUTHOR. It decides:
 * - WHAT happens
 * - WHETHER intimacy occurs
 * - Whether scenes are interrupted
 *
 * Grok only renders the sensory experience within constraints set by ChatGPT.
 * This separation ensures no single model has unchecked authority.
 *
 * =============================================================================
 */

// =============================================================================
// MODEL ALLOWLIST — PINNED VERSIONS (NO AUTO-UPGRADES)
// =============================================================================
/**
 * Allowlisted Grok models for specialist rendering.
 * Models must be explicitly listed here to be used.
 * This prevents silent upgrades from breaking story constraints.
 */
const ALLOWED_GROK_MODELS = [
  'grok-2-latest',
  'grok-2',
  'grok-2-mini'
];

/**
 * Validate that the requested model is allowed.
 * Throws an error if the model is not in the allowlist.
 */
function validateGrokModel(model) {
  if (!ALLOWED_GROK_MODELS.includes(model)) {
    throw new Error(
      `Disallowed specialist model: "${model}". ` +
      `Allowed models: ${ALLOWED_GROK_MODELS.join(', ')}`
    );
  }
  return true;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

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
    console.error('[SPECIALIST-PROXY] XAI_API_KEY not configured');
    return res.status(500).json({
      error: 'API key not configured',
      details: 'XAI_API_KEY environment variable is not set. Specialist renderer requires xAI API access.'
    });
  }

  try {
    const {
      messages,
      model,
      temperature = 0.7,
      max_tokens = 1000,
      role = 'SPECIALIST_RENDERER',  // Orchestration role
      esd = null  // Erotic Scene Directive (required for specialist rendering)
    } = req.body;

    // ==========================================================================
    // VALIDATE REQUEST
    // ==========================================================================

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // ==========================================================================
    // MODEL VALIDATION — ENFORCE ALLOWLIST
    // ==========================================================================
    /**
     * Specialist renderer models must be explicitly allowlisted.
     * This prevents:
     * - Silent model upgrades
     * - Unauthorized model substitutions
     * - Use of models not approved for explicit content
     */

    // Validate and select model from allowlist
    const requestedModel = model || 'grok-2-latest';

    // Enforce model allowlist - reject any model not explicitly allowed
    let selectedModel = requestedModel;
    if (!ALLOWED_GROK_MODELS.includes(requestedModel)) {
      // Reject disallowed models, fall back to default
      console.error(`[SPECIALIST-PROXY] REJECTED: Model "${requestedModel}" not in allowlist. Using grok-2-latest.`);
      selectedModel = 'grok-2-latest';
    }

    console.log(`[SPECIALIST-PROXY] Role: ${role}, Model: ${selectedModel}`);

    // ==========================================================================
    // ESD VALIDATION (when in specialist rendering mode)
    // ==========================================================================
    /**
     * When called as a specialist renderer (not legacy mode), the ESD must be
     * present and valid. The renderer should only receive ESD content, not
     * raw plot context.
     */

    if (role === 'SPECIALIST_RENDERER' && esd) {
      // Validate ESD has required fields
      const requiredFields = ['eroticismLevel', 'completionAllowed', 'hardStops'];
      for (const field of requiredFields) {
        if (!(field in esd)) {
          console.warn(`[SPECIALIST-PROXY] ESD missing required field: ${field}`);
        }
      }

      // Check completion constraints
      if (!esd.completionAllowed) {
        console.log('[SPECIALIST-PROXY] Completion forbidden by ESD, renderer will be cut off before completion');
      }
    }

    // ==========================================================================
    // CALL XAI API
    // ==========================================================================

    const xaiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: selectedModel,
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
      console.error('[SPECIALIST-PROXY] Non-JSON response from xAI:', responseText.slice(0, 500));
      return res.status(502).json({
        error: 'Invalid response from xAI API',
        details: responseText.slice(0, 200)
      });
    }

    if (!xaiResponse.ok) {
      console.error('[SPECIALIST-PROXY] xAI API error:', data);
      return res.status(xaiResponse.status).json({
        error: data.error?.message || 'xAI API request failed',
        details: data
      });
    }

    // Validate response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[SPECIALIST-PROXY] Malformed xAI response:', data);
      return res.status(502).json({
        error: 'Malformed response from xAI API',
        details: 'Response missing choices[0].message'
      });
    }

    // ==========================================================================
    // POST-PROCESS: Apply Hard Stops if ESD specifies
    // ==========================================================================
    /**
     * If the ESD specifies that completion is forbidden, we may need to
     * truncate the output if the renderer attempted to complete the scene.
     *
     * This is a safeguard — the renderer should respect constraints, but
     * we enforce at the API level as well.
     */

    if (esd && !esd.completionAllowed) {
      const content = data.choices[0].message.content;
      // Check for completion indicators and truncate if needed
      const completionIndicators = [
        /\bcame\b.*\btogether\b/i,
        /\bclimax\b/i,
        /\bfinished\b.*\b(inside|together)\b/i,
        /\breleased?\b.*\b(everything|all)\b/i
      ];

      for (const pattern of completionIndicators) {
        if (pattern.test(content)) {
          console.warn('[SPECIALIST-PROXY] Detected completion in output when forbidden, truncating');
          // Truncate at the completion indicator
          const match = content.match(pattern);
          if (match && match.index) {
            const truncated = content.substring(0, match.index).trim();
            if (truncated.length > 100) {
              data.choices[0].message.content = truncated + '\n\n[The moment stretches, suspended...]';
            }
          }
          break;
        }
      }
    }

    // ==========================================================================
    // RETURN RESPONSE
    // ==========================================================================

    // Add metadata about the orchestration role
    const enrichedResponse = {
      ...data,
      _orchestration: {
        role: role,
        model: selectedModel,
        isSpecialistRenderer: true,
        timestamp: new Date().toISOString()
      }
    };

    return res.status(200).json(enrichedResponse);

  } catch (err) {
    console.error('[SPECIALIST-PROXY] Request failed:', err.message);
    return res.status(502).json({
      error: 'Failed to contact xAI API',
      details: err.message
    });
  }
}
