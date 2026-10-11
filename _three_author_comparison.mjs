// ── THREE AUTHORS, ONE FROZEN REQUEST ───────────────────────────────────────────────────────
// Takes the ACTUAL Scene 2 author request from the fresh run's wire capture and sends the identical
// system/user messages to each Ministral arm. The Grok arm is that run's own response - the opening
// is generated once, not per model.
//   · reasoning_effort is OMITTED: the verified routing matrix records that no Ministral model
//     accepts it, and the proxy would otherwise silently serve a non-reasoning call.
//   · no fallback, no retry, no polishing pass. An invalid or truncated response is REPORTED.
//   · upstreamAttempts is NOT required of Mistral - api/mistral-proxy.js never returns it. The
//     provider-returned model and the dispatch count are recorded instead.
import fs from 'fs';

const RUN = process.argv[2];
if (!RUN) { console.error('usage: node _three_author_comparison.mjs <run dir>'); process.exit(2); }
const W = RUN + '/wire';

// ── 1. LOCATE AND FREEZE THE SCENE 2 AUTHOR REQUEST ─────────────────────────────────────────
let frozen = null, grokRaw = null, grokMeta = null;
for (const f of fs.readdirSync(W).filter(x => /_req\.json$/.test(x)).sort()) {
  const n = f.slice(0, 3);
  const req = JSON.parse(fs.readFileSync(W + '/' + f, 'utf8'));
  const msgs = req.messages || [];
  const joined = msgs.map(m => String(m.content || '')).join('\n');
  if (joined.length < 100000) continue;                      // the author call is the large one
  if (!/STORYBOUND ARCHITECTURE LAWS|beats/i.test(String(msgs[0]?.content || ''))) continue;
  let res = null;
  try { res = JSON.parse(fs.readFileSync(W + '/' + n + '_res.json', 'utf8')); } catch (_) {}
  frozen = { n: n, messages: msgs, max_tokens: Number(req.max_tokens || 8000),
             temperature: Number(req.temperature != null ? req.temperature : 0.85) };
  grokRaw = String(res?.choices?.[0]?.message?.content || '');
  grokMeta = {
    requestedModel: String(req.preferredModel || req.model || '(unstated)'),
    returnedModel: String(res?.resolvedModel || res?.model || '(none)'),
    upstreamAttempts: (res && res.upstreamAttempts != null) ? res.upstreamAttempts : null,
    finish: String(res?.choices?.[0]?.finish_reason || '(none)'),
    usage: res?.usage || null
  };
  break;                                                      // first (= Scene 2) author call
}
if (!frozen) { console.error('no author request found in ' + W); process.exit(2); }

const bytes = frozen.messages.reduce(
  (b, m) => b + Buffer.byteLength(String(m.content || ''), 'utf8'), 0);
console.log('FROZEN REQUEST: wire/' + frozen.n + '_req.json');
console.log('  messages=' + frozen.messages.length + '  utf8 bytes=' + bytes
  + '  max_tokens=' + frozen.max_tokens + '  temperature=' + frozen.temperature);
console.log('  governor reservation would be ' + (bytes + frozen.max_tokens).toLocaleString()
  + ' (bytes + max_tokens)\n');

// ── 2. CONSISTENT READER-FACING PROSE EXTRACTION, identical for all three arms ───────────────
function extract(raw) {
  const out = { parsed: false, beats: 0, prose: '', words: 0, schema: null, note: null };
  let txt = String(raw || '').trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  let j = null;
  try { j = JSON.parse(txt); } catch (e) { out.note = 'JSON parse failed: ' + e.message; }
  if (!j) {
    const a = txt.indexOf('{'), b = txt.lastIndexOf('}');
    if (a >= 0 && b > a) { try { j = JSON.parse(txt.slice(a, b + 1)); out.note = (out.note || '') + ' | recovered the outermost object (reported, not repaired)'; } catch (_) {} }
  }
  if (!j) return out;
  out.parsed = true;
  const beats = Array.isArray(j.beats) ? j.beats
    : (Array.isArray(j.scene?.beats) ? j.scene.beats : null);
  if (!beats) { out.schema = 'no beats array'; return out; }
  out.beats = beats.length;
  out.schema = 'beats array of ' + beats.length;
  // Reader-facing text only: the beat's own text, with its speaker label as the renderer shows it.
  const parts = [];
  for (const b of beats) {
    const t = String((b && (b.text || b.line || b.content)) || '').trim();
    if (!t) continue;
    const sp = (b && b.speaker) ? String(b.speaker).trim() : '';
    parts.push(sp && String(b.kind || '').toLowerCase() === 'dialogue' ? (sp.toUpperCase() + ': ' + t) : t);
  }
  out.prose = parts.join('\n\n');
  out.words = out.prose.split(/\s+/).filter(Boolean).length;
  return out;
}

// ── 3. DISPATCH THE TWO MINISTRAL ARMS ON THE IDENTICAL MESSAGES ────────────────────────────
const arms = [
  { label: 'B', model: 'ministral-8b-2512' },
  { label: 'C', model: 'ministral-3b-2512' }
];
const results = [{ label: 'A', model: grokMeta.requestedModel, meta: grokMeta, raw: grokRaw,
                   ex: extract(grokRaw), ms: null, paid: 'from the fresh run (not billed again)' }];

for (const arm of arms) {
  const body = {
    role: 'PRIMARY_AUTHOR', model: arm.model, messages: frozen.messages,
    max_tokens: frozen.max_tokens, temperature: frozen.temperature
    // reasoning_effort deliberately ABSENT - no Ministral model accepts it
  };
  const t0 = Date.now();
  let res = null, txt = '', status = 0;
  try {
    const r = await fetch('http://localhost:3000/api/mistral-proxy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    status = r.status;
    txt = await r.text();
    try { res = JSON.parse(txt); } catch (_) {}
  } catch (e) { txt = 'FETCH FAILED: ' + e.message; }
  const ms = Date.now() - t0;
  const raw = String(res?.choices?.[0]?.message?.content || '');
  results.push({
    label: arm.label, model: arm.model, ms: ms, status: status,
    meta: {
      requestedModel: arm.model,
      returnedModel: String(res?.resolvedModel || res?.model || '(none)'),
      upstreamAttempts: (res && res.upstreamAttempts != null) ? res.upstreamAttempts
        : 'not supplied by this proxy',
      finish: String(res?.choices?.[0]?.finish_reason || '(none)'),
      usage: res?.usage || null,
      reasoningSent: 'omitted (no Ministral model accepts reasoning_effort)',
      maxTokens: frozen.max_tokens
    },
    raw: raw, ex: extract(raw),
    error: (status !== 200 || !raw) ? (txt.slice(0, 400) || 'empty') : null
  });
}

// ── 4. PRESERVE EVERYTHING, THEN REPORT ─────────────────────────────────────────────────────
fs.mkdirSync('_audit_out/three_author', { recursive: true });
fs.writeFileSync('_audit_out/three_author/frozen_request.json',
  JSON.stringify({ source: 'wire/' + frozen.n + '_req.json', max_tokens: frozen.max_tokens,
    temperature: frozen.temperature, utf8Bytes: bytes, messages: frozen.messages }, null, 1));
for (const r of results) {
  fs.writeFileSync('_audit_out/three_author/arm_' + r.label + '_raw.txt', r.raw || '');
  fs.writeFileSync('_audit_out/three_author/arm_' + r.label + '_meta.json',
    JSON.stringify({ model: r.model, ms: r.ms, status: r.status || null, meta: r.meta,
      extraction: { parsed: r.ex.parsed, beats: r.ex.beats, words: r.ex.words,
        schema: r.ex.schema, note: r.ex.note }, error: r.error || null }, null, 1));
}
const md = [];
md.push('# Three-author comparison — one frozen Scene 2 request\n');
md.push('Frozen from `wire/' + frozen.n + '_req.json`: ' + frozen.messages.length + ' messages, '
  + bytes.toLocaleString() + ' UTF-8 bytes, max_tokens=' + frozen.max_tokens
  + ', temperature=' + frozen.temperature + '. Identical messages to all three arms.\n');
md.push('| arm | requested | returned | finish | prose words | beats | schema | latency |');
md.push('|---|---|---|---|---|---|---|---|');
for (const r of results) {
  md.push('| ' + r.label + ' | `' + r.model + '` | `' + r.meta.returnedModel + '` | '
    + r.meta.finish + ' | ' + r.ex.words + ' | ' + r.ex.beats + ' | '
    + (r.ex.schema || 'INVALID') + ' | ' + (r.ms == null ? '—' : r.ms + ' ms') + ' |');
}
md.push('');
for (const r of results) {
  md.push('\n## ARM ' + r.label + '\n');
  md.push('```\nrequested      : ' + r.meta.requestedModel);
  md.push('returned       : ' + r.meta.returnedModel);
  md.push('upstreamAttempts: ' + r.meta.upstreamAttempts);
  md.push('finish_reason  : ' + r.meta.finish);
  md.push('usage          : ' + JSON.stringify(r.meta.usage));
  if (r.meta.reasoningSent) md.push('reasoning      : ' + r.meta.reasoningSent);
  if (r.meta.maxTokens) md.push('max_tokens     : ' + r.meta.maxTokens);
  md.push('latency        : ' + (r.ms == null ? 'n/a (from the fresh run)' : r.ms + ' ms'));
  if (r.error) md.push('ERROR          : ' + r.error);
  md.push('extraction     : parsed=' + r.ex.parsed + ' beats=' + r.ex.beats
    + ' words=' + r.ex.words + (r.ex.note ? ' note=' + r.ex.note : ''));
  md.push('```\n');
  md.push(r.ex.prose || '*(no reader-facing prose extracted)*');
}
fs.writeFileSync('_audit_out/three_author/COMPARISON.md', md.join('\n'));

console.log('── RESULTS ──');
for (const r of results) {
  console.log('  ARM ' + r.label + '  ' + String(r.model).padEnd(26)
    + 'returned=' + String(r.meta.returnedModel).padEnd(24)
    + 'words=' + String(r.ex.words).padStart(4)
    + '  beats=' + String(r.ex.beats).padStart(3)
    + '  finish=' + r.meta.finish
    + '  ' + (r.ms == null ? '' : r.ms + 'ms')
    + (r.error ? '  ERROR: ' + String(r.error).slice(0, 80) : ''));
  if (r.meta.usage) console.log('           usage ' + JSON.stringify(r.meta.usage));
}
console.log('\nwritten: _audit_out/three_author/COMPARISON.md (+ raw and meta per arm)');
