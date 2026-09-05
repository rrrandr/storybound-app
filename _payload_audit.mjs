// _payload_audit.mjs — PHASE 1: NARRATIVE PAYLOAD audit, PROSECUTOR recalibration (Roman 2026-07-31).
// Payload = RECOVERABLE INFORMATION (readers AGREE), not "a possible invisible fact". Four hurdles,
// must pass ALL: CAMERA · AGREEMENT (kills semantic camouflage) · QUESTION · DELETION (dead-code elim).
// Offline, no prompt changes — the judge over the saved before/after scenes. Judges via chatgpt-proxy.
import fs from 'fs';
import { chromium } from 'playwright-core';
const URL = 'http://localhost:3000/';
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/author_ab';
const log = (...a) => console.log(...a);

const JUDGE = `You are a NARRATIVE PAYLOAD PROSECUTOR for prose fiction. Your job is to REJECT decorative sentences: a beat is DECORATIVE (guilty) until proven innocent. You do NOT judge beauty, style, adjectives, or how "literary" it sounds. You judge one thing: does the beat deliver RECOVERABLE INFORMATION — a fact independent readers would MOSTLY AGREE they learned, that a camera could not show?

Break the SCENE into DESCRIPTIVE BEATS (each sentence or independent clause describing a person, object, place, appearance, or physical action; SKIP quoted dialogue). For EACH beat run FOUR HURDLES in order. It CARRIES only if it passes ALL FOUR; else DECORATIVE, and record which hurdle it failed.

1. CAMERA — Could a still photograph or silent film of this exact moment already convey it? Re-labeling a visible action as an abstraction is NOT payload and FAILS here: "hands rose → initiates action", "the blight surged → a powerful force", "heel struck hard → a deliberate action". The payload must be more than the verb restated.
2. AGREEMENT (decisive) — List THREE distinct things different competent readers might independently conclude from this beat. If they CONVERGE on ONE concrete fact → recoverable. If they DIVERGE (pain? magic? fear? symbolism?) the beat is SEMANTIC CAMOUFLAGE (looks specific, but the specificity does not reduce ambiguity) → FAILS.
3. QUESTION — What narrative question does the beat ANSWER ("who is responsible?", "what is she afraid of?", "what do they know?")? If it answers none and only raises questions → FAILS.
4. DELETION — Delete the beat. What SPECIFICALLY would the reader no longer understand about the narrator, subject, relationship, or situation? If the honest answer is "nothing" → FAILS.

CALIBRATION EXEMPLARS:
- "She polished the pendant so often the engraving had almost vanished." → readings [values it, sentimental, worn from love] → CONVERGENT → recoverableFact "she treasures it" → answers "what does she care about?" → deleting loses her attachment → CARRIES (subject).
- "Every witness tracked the tremor that answered in her collarbone." → readings [pain, magic, fear, heartbeat, seizure, symbolism] → DIVERGENT → SEMANTIC CAMOUFLAGE → DECORATIVE (agreement).

For EACH beat return: { "text", "cameraPass": bool, "readings": [3 strings], "agreement": "convergent"|"divergent", "recoverableFact": string|null, "questionAnswered": string|null, "deletionLoss": string|null, "category": "narrator"|"subject"|"situation"|"relationship"|"none", "verdict": "CARRIES"|"DECORATIVE", "failedHurdle": "camera"|"agreement"|"question"|"deletion"|null }.

Then "summary": { "total", "carries", "decorative", "payloadDensity": carries/total, "byCategory": {"narrator","subject","situation","relationship"} (CARRIES counts), "byFailedHurdle": {"camera","agreement","question","deletion"} }.

Return ONLY valid JSON: { "beats": [...], "summary": {...} }. No commentary, no code fences.`;

const runs = JSON.parse(fs.readFileSync(`${OUT}/seed_opening_eval.json`, 'utf8'));

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext()).newPage();
page.on('console', m => { const t = m.text(); if (/PAYLOAD|error|proxy/i.test(t)) log('  · ' + t.slice(0, 150)); });
page.on('pageerror', e => log('  PAGEERR ' + (e && e.message)));
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => document.readyState === 'complete' || !!window.state, { timeout: 30000 }).catch(() => {});
log('[boot] page loaded — judging via /api/chatgpt-proxy (prosecutor, 4 hurdles) …');

async function judge(prose) {
  return await page.evaluate(async ({ prose, JUDGE }) => {
    try {
      const res = await fetch('/api/chatgpt-proxy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ messages: [{ role: 'system', content: JUDGE }, { role: 'user', content: 'SCENE:\n\n' + prose }], role: 'PRIMARY_AUTHOR', model: 'gpt-4o', temperature: 0, max_tokens: 4096, jsonMode: true })
      });
      if (!res.ok) return 'ERROR: http ' + res.status;
      const data = await res.json();
      return (data && data.content) || (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || 'ERROR: no content';
    } catch (e) { return 'ERROR: ' + (e && e.message); }
  }, { prose, JUDGE });
}

const results = [];
for (const r of runs) {
  const label = r.flag ? 'BEFORE (grounding off)' : 'AFTER (grounding on)';
  const raw = await judge(r.prose);
  let parsed = null;
  try { parsed = JSON.parse(String(raw).replace(/```json?/gi, '').replace(/```/g, '').trim()); } catch (_) {}
  results.push({ label, flag: r.flag, parsed, rawHead: String(raw).slice(0, 200) });
  if (parsed && parsed.summary) {
    const s = parsed.summary;
    log(`[${label}] beats=${s.total} carries=${s.carries} density=${Math.round((s.payloadDensity || 0) * 100)}% · cat ${JSON.stringify(s.byCategory || {})} · killed-by ${JSON.stringify(s.byFailedHurdle || {})}`);
  } else {
    log(`[${label}] PARSE FAILED → ${String(raw).slice(0, 160)}`);
  }
}

fs.writeFileSync(`${OUT}/payload_audit.json`, JSON.stringify(results, null, 2));

let rep = 'NARRATIVE PAYLOAD AUDIT (prosecutor · 4 hurdles: camera / agreement / question / deletion)\n\n';
for (const r of results) {
  rep += '════════════════════ ' + r.label + ' ════════════════════\n';
  if (!r.parsed || !r.parsed.summary) { rep += '(parse failed) ' + r.rawHead + '\n\n'; continue; }
  const s = r.parsed.summary;
  rep += `payload density: ${Math.round((s.payloadDensity || 0) * 100)}%  (${s.carries}/${s.total}) · carries-by-category ${JSON.stringify(s.byCategory || {})} · killed-by ${JSON.stringify(s.byFailedHurdle || {})}\n\n`;
  (r.parsed.beats || []).forEach(b => {
    if (b.verdict === 'CARRIES') {
      rep += `  [✓ ${b.category}] "${b.text}"\n      → ${b.recoverableFact || ''}${b.questionAnswered ? '  (answers: ' + b.questionAnswered + ')' : ''}\n`;
    } else {
      rep += `  [✕ fails ${b.failedHurdle}] "${b.text}"\n      readings: ${(b.readings || []).join(' | ')}\n`;
    }
  });
  rep += '\n';
}
fs.writeFileSync(`${OUT}/payload_audit.txt`, rep);
log('\nsaved → ' + OUT + '/payload_audit.txt');
await browser.close();
process.exit(0);
