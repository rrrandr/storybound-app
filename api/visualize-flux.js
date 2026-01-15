export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { prompt, input } = req.body || {};
    const finalPrompt = (prompt || input?.prompt || "").trim();
    if (!finalPrompt) return res.status(400).json({ error: "Missing prompt" });

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return res.status(500).json({ error: "REPLICATE_API_TOKEN not set" });

    const modelInput = {
      prompt: finalPrompt,
      go_fast: true,
      num_outputs: 1,
      aspect_ratio: "1:1",
      output_format: "webp",
      output_quality: 80,
      ...(input || {})
    };

    const r = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait"
        },
        body: JSON.stringify({ input: modelInput })
      }
    );

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: "Replicate error", status: r.status, details: data });
    }

    const output = data?.output;
    const first = Array.isArray(output) ? output[0] : null;

    return res.status(200).json({
      id: data?.id,
      status: data?.status,
      output,
      image: first,
      logs: data?.logs
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error", message: err?.message || String(err) });
  }
}
