// Guard: window._authorModelABTest() — the real cost+quality A/B harness. Fires Grok-HEAVY (cold+warm),
// Mistral-HEAVY, and Grok-LITE against the live proxies on the SAME captured prompts, and reports MEASURED
// token usage + $ + prose. Replaces the Sonnet-era cost estimates with real numbers on real keys.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) HEAVY prompt is captured during live gen (mirrors the LITE _lastContinuationAuditPrompt capture).
A(src.includes('window.state._lastHeavyAuditPrompt = { system: fullSys, act: act, dia: dia'), 'HEAVY prompt capture missing');
A(src.includes('if (_buildHeavy && typeof fullSys === \'string\' && fullSys.length > 1000)'), 'HEAVY capture not gated on a real heavy build');

// (2) The harness exists and reads both captured prompts.
const start = src.indexOf('window._authorModelABTest = async function');
A(start >= 0, '_authorModelABTest harness missing');
const fn = start >= 0 ? src.slice(start, start + 5000) : '';
A(fn.includes('s._lastHeavyAuditPrompt') && fn.includes('s._lastContinuationAuditPrompt'), 'harness does not read the captured HEAVY + LITE prompts');

// (3) It fires the four intended configs.
A(fn.includes("'Grok-HEAVY (cold)'") && fn.includes("'Grok-HEAVY (warm)'"), 'Grok-HEAVY cold+warm passes missing (warm measures cache benefit)');
A(fn.includes("'Mistral-HEAVY'") && fn.includes('/api/mistral-proxy'), 'Mistral-HEAVY config missing');
A(fn.includes("'Grok-LITE'"), 'Grok-LITE (current baseline) config missing');

// (4) It computes cost from MEASURED usage (not a hardcoded estimate) using the pricing table.
A(fn.includes('u.prompt_tokens || u.input_tokens') && fn.includes('u.completion_tokens || u.output_tokens'), 'does not read real token usage from the response');
A(fn.includes('cached = (u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens)'), 'does not read cached-token count (needed to price the warm pass)');
A(fn.includes("'grok-4.3':") && fn.includes("'mistral-small-latest':"), 'pricing table missing grok/mistral');
A(fn.includes('fresh * p.in + cached * (p.cr || p.in) + ct * p.out'), 'cost formula (fresh in + cached read + output) missing');

// (5) It surfaces the prose for a by-eye quality judgment (not just cost).
A(fn.includes('PROSE — cost is measured; QUALITY is yours to judge'), 'harness does not print prose for quality comparison');

if (fail) process.exit(1);
console.log('PASS: _authorModelABTest fires Grok-HEAVY cold+warm / Mistral-HEAVY / Grok-LITE on real captured prompts, prices from measured usage (incl. cached tokens), and prints prose for a quality read.');
