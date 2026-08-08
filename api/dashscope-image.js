// DashScope (Alibaba Model Studio) image generation — Qwen-Image / Wan — for A/B comparison vs BFL/Gemini.
// Vercel Serverless (Node.js runtime). These models are NOT OpenAI-compatible; this hits the NATIVE
// synchronous multimodal-generation endpoint (image URL returned directly — no task polling).
// Verified schema (2026-08-07): docs.alibabacloud.com qwen-image-api / wan-image-generation-and-editing-api-reference.
//
// ENV required:  DASHSCOPE_API_KEY
// ENV optional:  DASHSCOPE_IMAGE_URL  — full endpoint incl. your WorkspaceId host if your account needs it, e.g.
//                https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
export const config = { maxDuration: 120 };

// SECURITY: server-side prompt-injection scrub (mirrors the BFL/Gemini routes).
import _sanitizeInjectionMod from './_sanitize-injection.js';
const { stripInjectionFromText } = _sanitizeInjectionMod;

const DEFAULT_URL = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.DASHSCOPE_API_KEY;
  console.log('[dashscope-image] DASHSCOPE_API_KEY configured:', !!apiKey);
  if (!apiKey) return res.status(500).json({ error: 'DashScope not configured (set DASHSCOPE_API_KEY)' });
  const endpoint = process.env.DASHSCOPE_IMAGE_URL || DEFAULT_URL;

  try {
    const body = req.body || {};
    const model = String(body.model || 'qwen-image-2.0-pro');
    let prompt = String(body.prompt || '');
    try { const s = stripInjectionFromText(prompt); if (s) prompt = s; } catch (_) {}
    const negative = body.negative_prompt ? String(body.negative_prompt) : '';
    const size = String(body.size || (/wan/i.test(model) ? '2K' : '2048*2048'));
    const n = Math.max(1, Math.min(4, parseInt(body.n, 10) || 1));
    const images = Array.isArray(body.images) ? body.images.filter(Boolean).slice(0, 9) : [];

    // content = text prompt + positional reference images (Qwen/Wan read them IN ORDER; there are no
    // per-image label fields, so any labels must already be folded into the prompt text by the caller).
    const content = [{ text: prompt }];
    images.forEach((im) => content.push({ image: String(im) }));

    const payload = {
      model,
      input: { messages: [{ role: 'user', content }] },
      parameters: Object.assign({ size, n, watermark: false }, negative ? { negative_prompt: negative } : {})
    };

    const dsRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify(payload)
    });
    const text = await dsRes.text();
    if (!dsRes.ok) {
      console.error('[dashscope-image] HTTP', dsRes.status, text.slice(0, 400));
      return res.status(dsRes.status).json({ error: 'DashScope HTTP ' + dsRes.status, detail: text.slice(0, 400) });
    }
    let data; try { data = JSON.parse(text); } catch (_) { return res.status(502).json({ error: 'DashScope non-JSON response', detail: text.slice(0, 300) }); }

    // Sync multimodal-generation → output.choices[].message.content[].image ; async fallback → output.results[].url
    const urls = [];
    try {
      (data?.output?.choices || []).forEach((c) => (c?.message?.content || []).forEach((seg) => { if (seg && seg.image) urls.push(seg.image); }));
      if (!urls.length && Array.isArray(data?.output?.results)) data.output.results.forEach((r) => { if (r && r.url) urls.push(r.url); });
    } catch (_) {}
    if (!urls.length) return res.status(502).json({ error: 'DashScope returned no image', detail: JSON.stringify(data).slice(0, 300) });
    return res.status(200).json({ url: urls[0], urls, model, usage: data?.usage || null });
  } catch (e) {
    console.error('[dashscope-image] error', e && e.message);
    return res.status(500).json({ error: 'DashScope proxy error', detail: e && e.message });
  }
}
