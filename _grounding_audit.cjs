// World-Grounding / Invented-Proper-Noun scanner — DETERMINISTIC, zero API.
// The one gap the existing quality harnesses don't cover: a mapped canon world (FF / crossover /
// speculative) whose prose coins generic-fantasy proper nouns ("Ascendant Run", "Weave-Script",
// "First-Favored") instead of using the world's real lexicon. Repetition scanner finds REPEATS;
// _ffSpeculativeAudit judges the ARC PLAN. Neither reads the rendered prose for coinage leakage.
//
// Usage:
//   node _grounding_audit.cjs /tmp/story.json        (json: { scenes:[{idx,text}], grounding:{namedPlaces,factions,antagonistForces}, mode })
//   const { auditGrounding } = require('./_grounding_audit.cjs'); auditGrounding({ scenes, grounding, mode })
//
// It is a TRIAGE signal, not a verdict: high-confidence coinage SHAPES (hyphen-compounds, CamelCase,
// generic-fantasy tail nouns) are flagged FAIL; other unknown capitalized nouns are listed low-signal
// for optional human/judge review. Precision-first so it's usable without a full per-world canon list.

// Generic-fantasy "tail nouns" — a capitalized phrase ending in one of these, absent from the lexicon,
// is almost always an invented place/artifact/order (the real failure signature).
const FANTASY_TAILS = ['Run','Reach','Spire','Spires','Hollow','Vale','Wastes','Waste','Script','Weave','Sept','Warren','Warrens','Expanse','Deep','Deeps','Rift','Verge','Marches','March','Hold','Keep','Gate','Gates','Wend','Wold','Fell','Fells','Barrows','Barrow','Mire','Fen','Fens','Reaches','Ascendant','Sunder','Shard','Shards','Weald','Sprawl','Tangle','Loom','Thread','Threads','Favored','Chosen','Blessed','Sable','Ember','Ashen'];
const TAIL_RX = new RegExp('\\b([A-Z][a-z]+(?:\\s+(?:of|the|and)\\s+[A-Z][a-z]+|\\s+[A-Z][a-z]+){0,3}\\s+(?:' + FANTASY_TAILS.join('|') + '))\\b');
// Hyphenated capitalized compound: "Weave-Script", "First-Favored", "Blood-Sworn". Optionally captures a
// trailing Capitalized word so a canon TITLE ("Many-Faced God", "Three-Eyed Raven") isn't mistaken for an
// invented place/artifact coinage.
const HYPHEN_RX = /\b([A-Z][a-z]+-[A-Z][a-z]+(?:-[A-Z][a-z]+)?)(\s+[A-Z][a-z]+)?\b/g;
// Trailing tokens that mark the hyphen-compound as a real canon TITLE (deity/nobility/rank), not a coinage.
const TITLE_TAIL = new Set('God Gods Lord Lady King Queen Prince Princess Raven Father Mother Sister Brother Maester Septon Septa Ser Khal Khaleesi Emperor Empress Saint Order Watch'.split(/\s+/));
// Mid-word CamelCase coinage: "WeaveScript", "SunSpire" (rare in good prose).
const CAMEL_RX = /\b([A-Z][a-z]+[A-Z][a-z]+)\b/g;

// Sentence-start false positives + generic connectors we must not treat as coinages.
const COMMON = new Set('The A An And But Or So If Then Than He She They His Her Their I We You It Its This That These Those When Where While Because Although Yet Still Now Here There Not No Yes Her His My Your Our'.split(/\s+/));

function norm(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9'\s-]/g,' ').replace(/\s+/g,' ').trim(); }

function auditGrounding(opts){
  opts = opts || {};
  const scenes = (opts.scenes || []).map((s,i)=>({ idx: (s.idx!=null?s.idx:i+1), text: String(s.text || '') + ' ' + String(s.oasText || '') }));
  const g = opts.grounding || {};
  const lexTerms = []
    .concat(g.namedPlaces||[], g.factions||[], g.antagonistForces||[], opts.canonAllowlist||[])
    .map(norm).filter(Boolean);
  const lexSet = new Set(lexTerms);
  const inLex = (term)=>{ const n = norm(term); if (lexSet.has(n)) return true; for (const t of lexSet){ if (t.length>3 && (n.includes(t)||t.includes(n))) return true; } return false; };

  // scene -> Set of flagged coinages
  const coin = {}; // term -> { scenes:Set, shape }
  // Strip leading determiners/prepositions the phrase regex greedily swept in, so "The Ascendant Run",
  // "Beyond the Ascendant Run", and "Ascendant Run" all normalize to one term (correct cross-scene merge).
  const LEAD_RX = /^(?:the|a|an|of|and|beyond|near|behind|over|under|into|onto|from|to|at|by|past|toward|towards|across|along|through)\s+/i;
  const stripLead = (t)=>{ let prev; do { prev = t; t = t.replace(LEAD_RX,''); } while (t !== prev); return t.trim(); };
  const addCoin = (term, idx, shape)=>{
    if (shape !== 'hyphen-compound' && shape !== 'camel') term = stripLead(term);
    term = term.trim(); if (!term) return;
    if (COMMON.has(term.split(/\s+/)[0]) && shape==='camel') return;
    if (inLex(term)) return;                    // it's a real lexicon term → allowed
    const k = term.toLowerCase();
    (coin[k] = coin[k] || { term, scenes:new Set(), shape }).scenes.add(idx);
  };

  for (const sc of scenes){
    const t = sc.text;
    let m;
    const tail = new RegExp(TAIL_RX.source,'g');
    while ((m = tail.exec(t))) addCoin(m[1], sc.idx, 'fantasy-tail');
    HYPHEN_RX.lastIndex = 0; while ((m = HYPHEN_RX.exec(t))){ const tail = (m[2]||'').trim(); if (tail && TITLE_TAIL.has(tail)) continue; addCoin(m[1], sc.idx, 'hyphen-compound'); }
    CAMEL_RX.lastIndex = 0;  while ((m = CAMEL_RX.exec(t))) addCoin(m[1], sc.idx, 'camelcase');
  }

  const invented = Object.values(coin).map(c=>({
    term: c.term, shape: c.shape, scenes:[...c.scenes].sort((a,b)=>a-b),
    // cross-scene recurrence = calcified lore noise → worse
    severity: (c.scenes.size >= 2 ? 'fail' : 'warn')
  })).sort((a,b)=> (b.scenes.length - a.scenes.length) || a.term.localeCompare(b.term));

  // grounding coverage: how many lexicon terms actually appear in the prose (are we grounding at all?)
  const allText = norm(scenes.map(s=>s.text).join(' '));
  const lexHits = lexTerms.filter(t=> allText.includes(t));
  const coverage = lexTerms.length ? +(lexHits.length / lexTerms.length).toFixed(2) : null;

  const failCount = invented.filter(i=>i.severity==='fail').length;
  const severity = failCount>0 ? 'fail' : (invented.length>0 ? 'warn' : 'pass');
  return {
    severity, sceneCount: scenes.length,
    invented,
    groundingCoverage: coverage,
    groundingLexiconSize: lexTerms.length,
    groundingHits: lexHits.length,
    note: lexTerms.length===0 ? 'No grounding lexicon supplied — coinage-shape detection only (no lexicon cross-check).' : ''
  };
}

module.exports = { auditGrounding };

if (require.main === module){
  const IN = process.argv[2];
  if (!IN){ console.error('usage: node _grounding_audit.cjs <story.json>'); process.exit(1); }
  const data = JSON.parse(require('fs').readFileSync(IN,'utf8'));
  const rep = auditGrounding(data);
  console.log(JSON.stringify(rep, null, 2));
}
