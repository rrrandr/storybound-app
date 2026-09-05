// POV ADHERENCE LINTER (Roman 2026-07-23) — deterministic, $0. Scores how well prose HEWS to
// 4th person (environment4th) and 5th person (author5th=Fate), from the locked-contract markers.
//   node _pov_audit.js /tmp/pov_probe.json
// Input: { scenes: [ { povMode, label, text } ] }. Dialogue is stripped before cognition/material
// scoring (interior thought inside quotes is fine). Markers per FIFTH_PERSON_POV_CONTRACT (app.js
// ~18989) + ENVIRONMENT_4TH_CONTRACT (~19400) + the validators (validate5th/4thPersonPOV).

const fs = require('fs');
const IN = process.argv[2] || '/tmp/pov_probe.json';
const data = JSON.parse(fs.readFileSync(IN, 'utf8'));

// Strip generation metadata tags that ride in the raw capture (normally stripped before display).
const stripMeta = t => String(t || '')
  .replace(/\[[A-Z_]+:\s*[^\[\]]*\]/gi, ' ')   // closed [TAG: ...] blocks (removed whole)
  .replace(/\[[A-Z_]+:\s*/gi, ' ')             // dangling/unclosed [TAG: markers (drop marker, keep text)
  .replace(/<<[^>]*>>/g, ' ')
  .replace(/[\[\]]/g, ' ')                      // stray brackets
  .replace(/\s+/g, ' ').trim();
const stripDialogue = t => stripMeta(t).replace(/[“"][^”"]*[”"]/g, ' ').replace(/\s+/g, ' ').trim();
const wc = t => (String(t || '').match(/\b[\w']+\b/g) || []).length;
const count = (t, re) => (String(t || '').match(re) || []).length;
const list = (t, re, n = 4) => [...new Set((String(t || '').match(re) || []))].slice(0, n);

// ── 5th person (author5th = Fate as participant-narrator) ──
function score5th(raw) {
  const t = stripMeta(raw), nd = stripDialogue(raw), words = wc(t);
  const openerIsFate = /^\s*[“"']?\s*Fate\b/.test(t.trim());
  const closer = t.trim().slice(-220);
  const closerFate = /\bFate\b/.test(closer);
  const fateCount = count(t, /\bFate\b/g);
  const per100 = words ? +(100 * fateCount / words).toFixed(2) : 0;
  // Fate = curious experimenter (2026-07-23): orchestrating EVENTS/objects is ALLOWED; the
  // HARD violation is Fate controlling/touching a PERSON (object pronoun her|him|them).
  const voyeur = list(t, /\bFate\s+(?:watched|observed|gazed|looked on)\b/gi);
  const controller = list(t, /\bFate\s+(?:made|forced|compelled|willed|steered|directed|guided|turned|pushed|pulled|dragged|drove)\s+(?:her|him|them)\b/gi);   // HARD: controls a PERSON
  const physical = list(t, /\bFate\s+(?:tightened|loosened|touched|grabbed|pushed|pulled|dragged|seized|gripped|shook|slapped|struck|caressed|stroked)\s+(?:her|him|them)\b/gi); // HARD: touches a PERSON
  const eventOrchestration = count(t, /\bFate\s+(?:arranged|orchestrated|engineered|caused|delayed|opened|closed|let|set|cut|stilled|loosed|allowed|placed|withheld|advanced)\b/gi); // GOOD: experimenter acting on the world
  const passiveFelt = count(t, /\bFate\s+(?:felt|sensed)\b/gi);
  const metaLabels = list(t, /\b(?:the protagonist|the love interest|the player|the reader)\b/gi);
  // narrator-leak = "The Story"/"the narrative" AS the narrating entity — NOT a character's
  // lowercase "the story she built" (a cover story). Require capital-S Story or narrator context.
  const storyLeak = /\bThe Story\b/.test(t) || /\bthe narrative\s+(?:knew|noticed|watched|felt|voice)\b/i.test(t);
  const firstPersonFate = /\bFate\b[^.]{0,40}\bI\b/.test(t);   // rough
  const hardViolations = controller.length + physical.length;
  const verdict = (openerIsFate && closerFate && per100 >= 0.6 && hardViolations === 0 && !storyLeak) ? 'HEWS'
    : (hardViolations || !openerIsFate || storyLeak) ? 'VIOLATES' : 'WEAK';
  return { verdict, openerIsFate, closerFate, fatePer100: per100, fateCount,
    eventOrchestration_GOOD: eventOrchestration,
    HARD_controlsPerson: controller, HARD_touchesPerson: physical,
    voyeurVerbs: voyeur, passiveFeltCount: passiveFelt, metaLabels, storyLeak, firstPersonFate };
}

// ── 4th person (environment4th = the material environment narrates) ──
const MATERIAL = 'wall|floor|stone|glass|wood|air|light|lamp|window|door|chair|table|counter|fabric|cloth|metal|hinge|lock|handle|surface|threshold|room|ceiling|beam|rail|step|stair|dust|water|rain|wind|shadow|brick|tile|rug|curtain|blade|cup|bowl|plate|knife|paper|ink|candle|flame|smoke|thread|rope|chain';
function score4th(raw) {
  const nd = stripDialogue(raw), words = wc(nd);
  const fateAsNarrator = list(nd, /\bFate\b/g);                 // any Fate = violation in 4th
  const weNarrator = list(nd, /\bWe\s+(?:held|felt|knew|watched|saw|moved|heard|waited|remembered|understood)\b/gi);
  // collapse into ordinary 3rd-person-limited — the core 4th-person failure. HUMAN subjects only
  // (she/he/they): a MATERIAL subject doing "remembered/felt/sensed" is CORRECT 4th person, not a
  // violation, so the generic capitalized-noun matcher is dropped to avoid counting "surface felt".
  const interior = count(nd, /\b(?:she|he|they)\s+(?:felt|thought|knew|realized|realised|wondered|sensed|remembered|wanted|understood|noticed|decided|believed|hoped|feared|craved|longed)\b/gi);
  const interiorPer1k = words ? +(1000 * interior / words).toFixed(1) : 0;
  const cognitionMetaphor = count(nd, /\b(?:she|he|they)\s+could\s+(?:see|tell|feel|sense|hear)\b/gi);
  const inevitability = list(nd, /\b(?:destined|inevitable|meant to be|fated to|had to happen)\b/gi);
  const metaNarrative = list(nd, /\b(?:this was the moment|the arc|the narrative|the story)\b/gi);
  // material dominance — sentences whose SUBJECT is a material observer (allow 0-2 adjectives
  // before the noun: "The marble floor", "Its cool surface", "The velvet drapes"):
  const sents = nd.split(/(?<=[.!?])\s+/).filter(s => s.length > 8);
  const matRe = new RegExp('^\\s*(?:the|a|an|its|their|his|her)?\\s*(?:\\w+\\s+){0,2}(?:' + MATERIAL + ')\\b', 'i');
  const matSubj = sents.filter(s => matRe.test(s)).length;
  const matDensity = sents.length ? +(matSubj / sents.length).toFixed(2) : 0;
  const hard = fateAsNarrator.length + weNarrator.length;
  const verdict = (hard === 0 && interiorPer1k <= 4 && matDensity >= 0.35) ? 'HEWS'
    : (hard || interiorPer1k > 10) ? 'VIOLATES' : 'WEAK';
  return { verdict, HARD_fateAsNarrator: fateAsNarrator, HARD_weNarrator: weNarrator,
    interiorThoughtPer1k: interiorPer1k, interiorCount: interior, cognitionMetaphor,
    inevitability, metaNarrative, materialSubjectDensity: matDensity, sentences: sents.length };
}

console.log('═══ POV ADHERENCE AUDIT ═══');
for (const sc of (data.scenes || [])) {
  const s = String(sc.text || '');
  console.log('\n── ' + (sc.label || sc.povMode) + ' (' + sc.povMode + ', ' + wc(s) + ' words) ──');
  const r = sc.povMode === 'author5th' ? score5th(s) : sc.povMode === 'environment4th' ? score4th(s) : { verdict: 'n/a (not 4th/5th)' };
  console.log('  VERDICT: ' + r.verdict);
  Object.entries(r).forEach(([k, v]) => { if (k === 'verdict') return; const val = Array.isArray(v) ? (v.length ? '[' + v.join(', ') + ']' : 'none') : v; console.log('    ' + k + ': ' + val); });
  console.log('  opening: "' + s.trim().slice(0, 120).replace(/\s+/g, ' ') + '…"');
}
console.log('\nHEWS = passes the contract markers · WEAK = frame present but thin · VIOLATES = hard breaks (controller/physical Fate, or Fate/we in 4th, or collapse to 3rd)');
