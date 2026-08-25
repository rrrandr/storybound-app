// CHEAP PLANNER-ONLY PROBE — does the real model honour the explicit first_mention clause?
//
// Replays the EXACT planner request captured from the paid run, with the new clause spliced in
// at the same place app.js now emits it, and validates the reply the way the client does.
// One mistral-small call per sample: pennies, versus a full pipeline run per sample.
//
// usage: node _planner_first_mention_probe.mjs [N]
import fs from 'fs';

const N = Number(process.argv[2] || 3);
const cap = JSON.parse(fs.readFileSync('_paid_scene1_compliance/01_mistral_raw.json', 'utf8'));

const ANCHOR = 'Do NOT invent people and do NOT omit anyone.)\n';
const CLAUSE = '  ("first_mention" MUST be true on EVERY entry — it is a constant, not a judgement call. '
  + 'It does NOT assert that the character is on stage or that this is their earliest possible appearance; '
  + 'it means the beat lands the FIRST time this scene brings the reader to them. A character who is only '
  + 'NAMED, remembered or spoken about still gets their beat at that first naming. Never emit false.)\n';

if (!cap.user.includes(ANCHOR)) throw new Error('anchor not found in captured planner user prompt');
const user = cap.user.replace(ANCHOR, ANCHOR + CLAUSE);
if (user === cap.user) throw new Error('clause splice was a no-op');

const EP_AXES = ['history','use','damage','ownership','repair','ritual','absence'];
const castMatch = cap.user.match(/ELIGIBLE CAST \((\d+)\)[^\n]*\n([\s\S]*?)\nExactly one/);
const cast = castMatch ? castMatch[2].split('\n').map(x => x.replace(/^\s*•\s*/, '').trim()).filter(Boolean) : [];
const lc = x => String(x || '').trim().toLowerCase();

console.log(`\n${'═'.repeat(88)}\nPLANNER first_mention COMPLIANCE PROBE — ${N} samples, real mistral-small-latest\n${'═'.repeat(88)}`);
console.log(` eligible cast: ${JSON.stringify(cast)}`);
console.log(` clause spliced: +${CLAUSE.length} chars\n`);

let clean = 0;
for (let i = 1; i <= N; i++) {
  // Mistral rate-limits a burst (observed 429). Space the samples out.
  if (i > 1) await new Promise(r => setTimeout(r, 20000));
  const r = await fetch('http://localhost:3000/api/mistral-proxy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'PROMPT_PREPROCESSOR', model: 'mistral-small-latest',
      temperature: 0.4, max_tokens: cap.request.max_tokens, reasoning_effort: 'none',
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: cap.system }, { role: 'user', content: user }] }),
  });
  if (!r.ok) { console.log(` ${i}. ⚠ transport HTTP ${r.status} — ${(await r.text()).slice(0, 120)}`); continue; }
  const d = await r.json();
  const raw = (d && typeof d.content === 'string' && d.content)
    ? d.content
    : String((d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '');

  let plan = null;
  try { plan = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch (_) {}
  const sk = plan && plan.scene_skeleton;
  if (!sk) {
    const fr = (d.choices && d.choices[0] && d.choices[0].finish_reason) || '?';
    console.log(` ${i}. ✗ unparseable — finish_reason=${fr} completion_tokens=${(d.usage && d.usage.completion_tokens) || '?'}`
      + ` rawLen=${raw.length} parsedTop=${plan ? JSON.stringify(Object.keys(plan)).slice(0, 160) : 'null'}`);
    console.log(`      tail: ${JSON.stringify(raw.slice(-160))}`);
    continue;
  }

  const cp = Array.isArray(sk.character_plus) ? sk.character_plus : [];
  const faults = [];
  const seen = {};
  cp.forEach(c => {
    const k = lc(c.character);
    if (!cast.map(lc).includes(k)) faults.push(`unknown recipient "${c.character}"`);
    if (seen[k]) faults.push(`duplicate "${c.character}"`);
    seen[k] = true;
    if (c.first_mention !== true) faults.push(`first_mention ${JSON.stringify(c.first_mention)} on "${c.character}"`);
    const a = String(c.angle || '').trim();
    if (!a || a.split(/\s+/).length < 3 || a.length < 12) faults.push(`thin angle on "${c.character}"`);
  });
  cast.forEach(n => { if (!seen[lc(n)]) faults.push(`missing recipient "${n}"`); });
  if (!sk.environment_plus) faults.push('environment_plus missing');
  else {
    if (!String(sk.environment_plus.target || '').trim()) faults.push('E+ target empty');
    if (!EP_AXES.includes(lc(sk.environment_plus.axis))) faults.push(`E+ axis "${sk.environment_plus.axis}"`);
  }
  if (sk.fusion) {
    if (!cast.map(lc).includes(lc(sk.fusion.character))) faults.push(`fusion char "${sk.fusion.character}"`);
    if (!String(sk.fusion.target || '').trim()) faults.push('fusion target empty');
  }

  const fm = cp.map(c => `${c.character}=${c.first_mention}`).join(' · ');
  if (!faults.length) clean++;
  console.log(` ${i}. ${faults.length ? '✗' : '✓'} tokens=${(d.usage && d.usage.completion_tokens) || '?'} fusion=${sk.fusion ? 'yes' : 'null'}`);
  console.log(`      ${fm}`);
  if (faults.length) faults.forEach(f => console.log(`      ✗ ${f}`));
}

console.log(`\n${'─'.repeat(88)}\n  ${clean}/${N} fully compliant\n`);
process.exit(clean === N ? 0 : 1);
