// Headless replica of window._ffCanonArcAudit — hits the live dev server's /api/proxy.
const SOURCE = process.argv[2] || 'Old Man Logan (2008)';
const EMBODY = process.argv[3] || 'Logan';
const CTX = 'READER EMBODIES: ' + EMBODY;
const BASE = 'http://localhost:3000';

async function grokJSON(sys, usr, { reasoning = false, maxTokens = 2000 } = {}) {
  const model = reasoning ? 'grok-4-1-fast-reasoning' : 'grok-4-1-fast-non-reasoning';
  const res = await fetch(BASE + '/api/proxy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'SPECIALIST_RENDERER', preferredModel: model, temperature: 0.2, max_tokens: maxTokens, convId: 'arc-audit' })
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const data = await res.json();
  let raw = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || (data && data.content) || '';
  raw = String(raw || '').replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try { return JSON.parse(raw); } catch (_) {
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    if (s !== -1 && e !== -1) { try { return JSON.parse(raw.slice(s, e + 1).replace(/,\s*([}\]])/g, '$1')); } catch (_) {} }
    throw new Error('unparseable: ' + raw.slice(0, 160));
  }
}

async function scope() {
  const sys = 'You are a canon SCOPE auditor. For the work "' + SOURCE + '", measure HOW MUCH STORY EXISTS — SIZE, kept SEPARATE from dramatic structure (a 3-act film, an 8-chapter comic, and a 900-page novel can share identical structure at wildly different sizes). Report the REAL published work; do NOT collapse a long serialized saga to fit "3 acts". Output ONLY {"medium":..., "serialization":{...}, "scopeSignals":{...}} — no prose, no fences.\n'
    + '• medium: "comic" | "graphic_novel" | "film" | "tv_series" | "novel" | "novella" | "short_story" | "game" | "other".\n'
    + '• serialization: { "isNative": true ONLY if the SOURCE was published in discrete installments readers experienced as UNITS (comic issues/chapters, TV episodes, novel volumes/parts) — false for a single film or a single unchaptered manuscript; "unit": "comic_issue"|"chapter"|"episode"|"volume"|"part"|"book"|"none"; "count": how many such installments in the WHOLE work (integer, e.g. Old Man Logan = 8 issues); "unitLabel": the reader-facing word ("Chapter"|"Issue"|"Episode"|"Part") }.\n'
    + '• scopeSignals: { "totalPages": comic/prose page count or null; "pagesPerUnit": pages per installment or null; "runtimeMinutes": film/TV total runtime or null; "wordCount": approx or null; "majorEvents": count of MAJOR narrative events across the WHOLE work; "sequences": distinct set-pieces or null; "povShifts": null unless multi-POV novel; "locationShifts": major location changes or null; "confidence": 0..1 }.\n'
    + '• For NOVELS page count is a WEAK predictor — put your real signal in majorEvents/sequences/povShifts.';
  const usr = CTX + '\nSOURCE WORK: ' + SOURCE + '\n\nOutput the canon scope object now.';
  return grokJSON(sys, usr, { reasoning: false, maxTokens: 900 });
}

async function canonDocument() {
  const sys = 'You have deep knowledge of the work "' + SOURCE + '". Write a THOROUGH, CONCRETE plot summary of the ENTIRE work, in order, installment by installment. Include the SPECIFIC load-bearing canon events — the key reveals, the personal/tragic beats, deaths, betrayals, the TRIGGER that sets up the climax, and the ACTUAL resolution — naming names and places. Do NOT give a vague overview or a generic "they travel and face dangers"; a faithful adaptation will be built from this, so the specific irreversible beats matter most. 400-700 words. PROSE, not JSON, no fences.';
  const usr = CTX + '\nSOURCE: ' + SOURCE + '\n\nWrite the canon plot document now.';
  const res = await fetch(BASE + '/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-reasoning', temperature: 0.2, max_tokens: 1400, convId: 'sb-ff-canondoc' }) });
  if (!res.ok) return null;
  const data = await res.json();
  const txt = ((data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || (data && data.content) || '').trim();
  return txt.length > 120 ? txt : null;
}

async function arcSynopsis(nUnits, label, doc) {
  const L = label;
  const d = doc ? ('\n\nCANON PLOT DOCUMENT (extract the synopsis FROM this — it holds the specific beats; do not contradict it):\n"""\n' + doc.slice(0, 6000) + '\n"""') : '';
  const sys = 'You are a canon cartographer for the work "' + SOURCE + '". Give a ONE-LINE synopsis of EACH of its ' + nUnits + ' ' + L.toLowerCase() + 's, IN ORDER — what canonically happens in THAT installment SPECIFICALLY. This is the arc skeleton. HARD: every line must be DISTINCT and name the SPECIFIC territory / event / turn of that installment — do NOT write a generic "they travel and fight" that could fit any installment, and do NOT repeat the same beat across lines. The lines must carry the IRREVERSIBLE personal beats where they occur (deaths, betrayals, the reveal, the trigger). The FINAL ' + L.toLowerCase() + ' must be the ACTUAL canon climax/resolution, not a vague sunset. If you genuinely do not know a specific installment, give the best-known content for that arc position and set its "known":false. Output ONLY {"units":[{"unit":1,"gist":"...","known":true}, …]} with EXACTLY ' + nUnits + ' entries.';
  const usr = CTX + '\nSOURCE: ' + SOURCE + '\n' + L + ' count: ' + nUnits + d + '\n\nOutput the per-' + L.toLowerCase() + ' synopsis now.';
  const out = await grokJSON(sys, usr, { reasoning: true, maxTokens: 2200 });
  return (out && Array.isArray(out.units)) ? out.units.filter(u => u && u.gist) : null;
}

async function unitBeats(idx, label, synopsis, doc) {
  const L = label;
  let syn = '';
  if (synopsis && synopsis.length) {
    syn = '\n\nTHE WHOLE ARC (one line per ' + L.toLowerCase() + ', for placement + anti-repetition). Extract ONLY ' + L + ' ' + idx + '\'s beats (marked ▸); do NOT pull in content that belongs to the other installments:\n'
      + synopsis.map(u => (u.unit === idx ? '▸ ' : '  ') + L + ' ' + u.unit + ': ' + u.gist).join('\n');
  }
  if (doc) syn += '\n\nCANON PLOT DOCUMENT (the source of truth — pull ' + L + ' ' + idx + '\'s beats from here, including any irreversible personal beat that canonically lands in it):\n"""\n' + doc.slice(0, 6000) + '\n"""';
  const sys = 'You are a canon-fidelity cartographer for an interactive adaptation. For the work "' + SOURCE + '", list the ORDERED canonical events of ' + L + ' ' + idx + ' SPECIFICALLY — the load-bearing beats a reader of THAT installment would recognize, in the order they occur within it. Output ONLY {"events":[...]} — no prose, no fences.\n'
    + '• 3-8 events. Each is ONE clear clause naming what canonically happens in this installment.\n'
    + '• Stay STRICTLY inside THIS installment — do NOT include events from earlier or later chapters. If you do not know this specific installment\'s content, return the best-known beats for roughly this position and set "known":false.\n'
    + '• Do NOT converge on a generic road-trip template ("drive → stop at a diner → recognized → refuse to fight → companion questions the pacifism → continue") — that filler is the failure mode. Each installment has DISTINCT canonical content; if this reads like a neighbouring installment you have defaulted to filler. The final installment must be the REAL climax/resolution.\n'
    + '• Each event: {"event":"one clause","weight":"major|minor"}. The LAST event should be the installment\'s turn/cliff.';
  const usr = CTX + '\nSOURCE: ' + SOURCE + '\n' + L + ': ' + idx + syn + '\n\nOutput EXACTLY: {"events":[{"event":"","weight":"major|minor"}],"known":true}';
  const out = await grokJSON(sys, usr, { reasoning: true, maxTokens: 1600 });
  return (out && Array.isArray(out.events)) ? out.events.filter(e => e && e.event) : [];
}

async function movementBeats(m, idx, doc) {
  const rng = (m.fromUnit && m.toUnit) ? (' (spanning units ' + m.fromUnit + '–' + m.toUnit + ')') : '';
  const sys = 'You are a canon-fidelity cartographer for an interactive adaptation of "' + SOURCE + '". List the ORDERED canonical events of ONE ARC-MOVEMENT — "' + m.label + '"' + rng + ': ' + m.gist + '. The load-bearing beats of THIS stretch of the spine, in order. Output ONLY {"events":[...]}.\n'
    + '• 4-8 events, each ONE clause; cover the movement\'s own setup→build→turn; do NOT pull earlier/later movements.\n'
    + '• If you lack fine detail, give the best-known load-bearing beats for this stretch and set "known":false.\n'
    + '• Each event: {"event":"one clause","weight":"major|minor"}. LAST = the movement\'s turn/cliff.';
  const usr = CTX + '\nSOURCE: ' + SOURCE + '\nARC-MOVEMENT ' + idx + ': "' + m.label + '" — ' + m.gist + (doc ? '\n\nCANON PLOT DOCUMENT:\n"""\n' + doc.slice(0, 6000) + '\n"""' : '') + '\n\nOutput EXACTLY: {"events":[{"event":"","weight":"major|minor"}],"known":true}';
  const out = await grokJSON(sys, usr, { reasoning: true, maxTokens: 1600 });
  return (out && Array.isArray(out.events)) ? out.events.filter(e => e && e.event) : [];
}

(async () => {
  console.log('[ARC-AUDIT] source="' + SOURCE + '" embody="' + EMBODY + '" — plan-only, no scene prose\n');
  const sc = await scope();
  const ser = (sc && sc.serialization) || {};
  let label = ser.unitLabel || 'Chapter';
  let n = Number(ser.count) || 0;
  let synthetic = false;
  if (!ser.isNative || !n) {
    // Non-serialized work (film / single manuscript): synthesize units from runtime/events. This mirrors
    // _ffEstimateSceneBudget's artificial path (runtime → scenes → /20 → issues).
    const rt = sc.scopeSignals && sc.scopeSignals.runtimeMinutes;
    const ev = sc.scopeSignals && sc.scopeSignals.majorEvents;
    n = rt ? Math.max(3, Math.round(rt / 45)) : (ev ? Math.max(3, Math.round(ev / 8)) : 3);
    label = 'Part';
    synthetic = true;
  }
  console.log('SCOPE: medium=' + (sc && sc.medium) + ' · serialization=' + (ser.isNative ? 'native' : 'artificial' + (synthetic ? ' → ' + n + ' synthetic ' + label + 's' : '')) + ' (' + (ser.count || n) + '× ' + label + ') · runtime=' + (sc.scopeSignals && sc.scopeSignals.runtimeMinutes) + 'm · conf=' + (sc && sc.scopeSignals && sc.scopeSignals.confidence) + '\n');
  if (!n) { console.log('no units — abort'); return; }
  const MAXUNITS = Number(process.argv[4]) || 6;   // cap per-unit beat extraction for cost/output
  const doc = await canonDocument();
  if (doc) console.log('CANON DOCUMENT (' + doc.length + ' chars):\n' + doc + '\n');
  const synopsis = await arcSynopsis(n, label, doc);
  if (synopsis) console.log('ARC SYNOPSIS (all ' + n + ' ' + label.toLowerCase() + 's):\n' + synopsis.map(u => '  ' + label + ' ' + u.unit + ': ' + u.gist).join('\n') + '\n');

  // FIX #1 — ARC-MOVEMENT GROUPING: high native count + sparse per-unit recall → group into arc-movements.
  const sparsity = !synopsis ? 1 : synopsis.filter(u => { const g = String(u.gist || '').toLowerCase().trim(); return !g || g.length < 25 || /\bunknown\b|unspecified|arc position|not (known|specified)|no specific|generic|placeholder|unclear|best[- ]known/.test(g); }).length / synopsis.length;
  const FORCE_GROUP = process.env.FORCE_GROUP === '1';
  if (ser.isNative && n > 10) {
    console.log('[GROUPING] native ' + label.toLowerCase() + 's=' + n + ' · recall-sparsity=' + sparsity.toFixed(2) + (sparsity > 0.35 || FORCE_GROUP ? ' → grouping into arc-movements' + (FORCE_GROUP && sparsity <= 0.35 ? ' (FORCED for validation)' : '') : ' → dense, keeping native 1:1'));
    if (sparsity > 0.35 || FORCE_GROUP) {
      const target = Math.max(3, Math.min(12, Math.round(n / 5)));
      const msys = 'You are a canon cartographer for "' + SOURCE + '". Its ' + n + ' native ' + label.toLowerCase() + 's are too many / too sparsely recalled to adapt one-to-one. Group them into about ' + target + ' ARC-MOVEMENTS — each a COHERENT stretch of the spine with its own mini-shape (setup→build→turn), covering a CONTIGUOUS range, IN ORDER, spanning ALL ' + n + '. Name each by its emotional/plot through-line. Output ONLY {"movements":[{"index":1,"label":"short name","gist":"one line","fromUnit":1,"toUnit":5}, …]}.';
      const musr = CTX + '\nSOURCE: ' + SOURCE + '\nNATIVE ' + label.toLowerCase() + 's: ' + n + (doc ? '\n\nCANON PLOT DOCUMENT:\n"""\n' + doc.slice(0, 6000) + '\n"""' : '') + '\n\nOutput the arc-movement map now (~' + target + ' movements).';
      const mvOut = await grokJSON(msys, musr, { reasoning: true, maxTokens: 2000 });
      const mv = (mvOut && Array.isArray(mvOut.movements)) ? mvOut.movements.filter(m => m && m.gist) : [];
      console.log('[GROUPING] → ' + mv.length + ' ARC-MOVEMENTS (generation grain):');
      mv.forEach((m, i) => console.log('  Movement ' + (i + 1) + ' "' + m.label + '" (units ' + m.fromUnit + '–' + m.toUnit + '): ' + m.gist));
      console.log('');
      // extract beats PER MOVEMENT
      const mLists = await Promise.all(mv.map((m, i) => movementBeats(m, i + 1, doc)));
      const mUnits = mv.map((m, i) => ({ index: i + 1, label: m.label, beats: mLists[i] || [] }));
      mUnits.forEach(u => console.log('Movement ' + u.index + ' "' + u.label + '": ' + u.beats.map(e => e.event).join('  |  ')));
      // judge the MOVEMENTS
      const jsys = 'You are a strict canon-fidelity judge for "' + SOURCE + '". Below is an interactive adaptation\'s ARC-MOVEMENT beat map (native ' + label.toLowerCase() + 's grouped into movements). For EACH movement, judge how faithfully its beats match the ACTUAL events of that stretch of the source. Flag MISSING major beats + INVENTED non-canon ones. Output ONLY JSON {"units":[{"index":N,"score":0,"missing":[],"invented":[],"note":""}],"overall":0,"biggestGap":"","verdict":""} (integers 0-10).';
      const jusr = 'SOURCE: ' + SOURCE + '\n\nARC-MOVEMENT BEAT MAP:\n' + mUnits.map(u => 'Movement ' + u.index + ' "' + u.label + '": ' + (u.beats.length ? u.beats.map(e => e.event).join(' | ') : '(none)')).join('\n');
      const v = await grokJSON(jsys, jusr, { reasoning: true, maxTokens: 2500 });
      console.log('\n=== JUDGE (arc-movements): overall ' + v.overall + '/10 — ' + v.verdict + ' ===');
      (v.units || []).forEach(u => console.log('  Movement ' + u.index + ': ' + u.score + '/10' + (u.missing && u.missing.length ? ' · MISSING: ' + u.missing.join('; ') : '') + (u.invented && u.invented.length ? ' · INVENTED: ' + u.invented.join('; ') : '') + (u.note ? ' — ' + u.note : '')));
      if (v.biggestGap) console.log('  BIGGEST GAP: ' + v.biggestGap);
      return;
    }
  }

  const auditN = Math.min(n, MAXUNITS);
  if (auditN < n) console.log('(sampling per-unit beat maps for the first ' + auditN + ' of ' + n + ' ' + label.toLowerCase() + 's)\n');
  const idxs = Array.from({ length: auditN }, (_, i) => i + 1);
  const lists = await Promise.all(idxs.map(i => unitBeats(i, label, synopsis, doc)));
  const units = idxs.map((i, k) => ({ index: i, beats: lists[k] || [] }));
  units.forEach(u => console.log(label + ' ' + u.index + '/' + n + ': ' + u.beats.map(e => e.event).join('  |  ')));
  console.log('');
  const jsys = 'You are a strict canon-fidelity judge for the work "' + SOURCE + '". Below is an interactive adaptation\'s per-' + label.toLowerCase() + ' BEAT MAP (the plan it will render the arc from). For EACH ' + label.toLowerCase() + ', judge how faithfully its listed beats match the ACTUAL events of that ' + label.toLowerCase() + ' in the source. Flag MISSING major canon beats, INVENTED non-canon ones, and MISPLACED beats (pulled early/late). Output ONLY JSON: {"units":[{"index":N,"score":0,"missing":[],"invented":[],"misplaced":[],"note":""}],"overall":0,"biggestGap":"","verdict":""}.';
  const jusr = 'SOURCE: ' + SOURCE + '\n\nBEAT MAP (' + n + ' ' + label.toLowerCase() + 's):\n' + units.map(u => label + ' ' + u.index + ': ' + (u.beats.length ? u.beats.map(e => e.event).join(' | ') : '(none)')).join('\n');
  const v = await grokJSON(jsys, jusr, { reasoning: true, maxTokens: 3500 });
  console.log('=== JUDGE: overall ' + v.overall + '/10 — ' + v.verdict + ' ===');
  (v.units || []).forEach(u => console.log('  ' + label + ' ' + u.index + ': ' + u.score + '/10'
    + (u.missing && u.missing.length ? ' · MISSING: ' + u.missing.join('; ') : '')
    + (u.invented && u.invented.length ? ' · INVENTED: ' + u.invented.join('; ') : '')
    + (u.misplaced && u.misplaced.length ? ' · MISPLACED: ' + u.misplaced.join('; ') : '')
    + (u.note ? ' — ' + u.note : '')));
  if (v.biggestGap) console.log('  BIGGEST GAP: ' + v.biggestGap);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
