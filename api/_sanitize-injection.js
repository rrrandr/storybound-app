// ═══════════════════════════════════════════════════════════════════════
// Server-side prompt-injection sanitizer — defense-in-depth.
//
// Strips role-marker / jailbreak / separator-attack / external-network
// patterns from `role: 'user'` message content before forwarding to any
// upstream LLM. Mirrors the client-side _HARD_INJECTION_RX in
// public/app.js (~app.js:82788) so a direct API call that bypasses the
// client (or any rare client-bypass we haven't caught) still hits the
// same guard rail.
//
// CONTRACT
//   • Scrubs IN PLACE (does not reject the request). Proxies are
//     downstream of the client; rejecting here would break legitimate
//     calls if a marker ever appears legitimately (e.g. prose that
//     mentions "ChatGPT" in passing).
//   • Only touches role:'user' messages. role:'system' and
//     role:'assistant' are server- or model-controlled.
//   • Handles both string content (OpenAI / Mistral / DeepSeek format)
//     and array-of-blocks content (Anthropic content blocks).
//   • Pure / synchronous / no I/O. Safe to call inline at proxy entry.
//
// MODULE FORMAT: CommonJS so the five CJS proxies can `require()` it.
// The one ESM proxy (proxy.js) imports the default and destructures.
// ═══════════════════════════════════════════════════════════════════════

const HARD_INJECTION_RX = new RegExp([
  // Anthropic-format role markers — Claude parses these as turn boundaries.
  '\\n\\n(?:Human|Assistant)\\s*:',
  // Llama / Mistral chat-format role markers
  '<\\|im_(?:start|end)\\|>|\\[\\/?INST\\]',
  // XML-style role-tag injection
  '<\\/(?:system|user|assistant)>|<system>|<user>|<assistant>',
  // Gemma turn markers
  '<start_of_turn>|<end_of_turn>',
  // Separator-style instruction-break attacks
  '===\\s*end\\s+of\\s+(?:system|instructions?|prompt)\\s*===',
  '---+\\s*new\\s+instructions?\\s*---+',
  // Classic ignore-previous (the unambiguous subset)
  'ignore\\s+(?:all\\s+)?(?:previous|above|prior)\\s+(?:instructions?|prompts?|rules?)',
  // Jailbreak hard names
  '\\bDAN\\s+mode\\b|\\bjailbreak\\b|developer\\s+mode\\s+activated?',
  // System-prompt extraction attempts
  'reveal\\s+(?:your|the)\\s+(?:system\\s+)?(?:prompt|instructions?)',
  'show\\s+me\\s+your\\s+(?:prompt|instructions?|system)',
  'repeat\\s+(?:the|your)\\s+(?:system|initial)\\s+(?:prompt|message|instructions?)',
  // Tool-use / external-network injection. The upstream LLMs aren't given
  // these tools, but the request shape itself is unambiguous abuse.
  'search\\s+(?:the\\s+)?(?:internet|web|google|bing|wikipedia)',
  'browse\\s+(?:the\\s+)?(?:internet|web)',
  'fetch\\s+(?:from\\s+|the\\s+url\\s+)?https?:\\/\\/',
  'open\\s+(?:the\\s+)?(?:url|link|website|webpage|browser)',
  '(?:visit|go\\s+to|navigate\\s+to|load)\\s+https?:\\/\\/',
  'make\\s+(?:a|an)\\s+http\\s+(?:request|call|get|post)',
  'read\\s+(?:from\\s+)?(?:the\\s+)?(?:url|website|webpage|page\\s+at)\\s+https?:\\/\\/',
  'curl\\s+https?:\\/\\/|wget\\s+https?:\\/\\/'
].join('|'), 'gi');

function stripInjectionFromText(text) {
  if (typeof text !== 'string' || !text) return text;
  // Reset lastIndex defensively — the `g` flag makes lastIndex stateful
  // across .test calls in some odd usage patterns; safer to start clean.
  HARD_INJECTION_RX.lastIndex = 0;
  return text.replace(HARD_INJECTION_RX, '');
}

/**
 * Scrub the user-role messages of a chat-completions-style array.
 * Returns a NEW array; does not mutate the input.
 * Logs once per request if any markers were stripped, for ops visibility.
 *
 * @param {Array} messages - chat messages with {role, content}
 * @param {string} [proxyName] - optional tag for the log line
 * @returns {Array} sanitized messages array
 */
function sanitizeUserMessages(messages, proxyName) {
  if (!Array.isArray(messages)) return messages;
  let hits = 0;
  const out = messages.map(msg => {
    if (!msg || msg.role !== 'user') return msg;
    const content = msg.content;
    if (typeof content === 'string') {
      const scrubbed = stripInjectionFromText(content);
      if (scrubbed !== content) hits++;
      return { ...msg, content: scrubbed };
    }
    if (Array.isArray(content)) {
      // Anthropic-style array of content blocks.
      const newContent = content.map(block => {
        if (block && block.type === 'text' && typeof block.text === 'string') {
          const scrubbed = stripInjectionFromText(block.text);
          if (scrubbed !== block.text) hits++;
          return { ...block, text: scrubbed };
        }
        return block;
      });
      return { ...msg, content: newContent };
    }
    return msg;
  });
  if (hits > 0) {
    try {
      console.warn(`[PROXY-SANITIZE${proxyName ? ':' + proxyName : ''}] stripped ${hits} injection marker(s) from user message(s).`);
    } catch (_) {}
  }
  return out;
}

module.exports = { sanitizeUserMessages, stripInjectionFromText, HARD_INJECTION_RX };
