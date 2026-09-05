// _grok_nonreasoning_prose_check.mjs — QUALITY gate for the fallback author.
// The hang-guard fix makes grok-4-1-fast-non-reasoning the immediate fallback for NARRATIVE_AUTHOR prose.
// Roman flagged that this model has produced GARBLED text before. This asks it to author a full ~800-word
// literary scene continuation (substantial context, real author instruction) and prints the output + basic
// garbage heuristics so a human can judge coherence. If it garbles, the fallback destination must change.
const SYS = [
  'You are the NARRATIVE AUTHOR for an interactive literary romance-fantasy engine. Write immersive third-limited prose.',
  'RULES: show, do not tell; concrete sensory detail; no purple overwriting; vary sentence rhythm; stay in the established voice;',
  'advance the scene with a real beat (something changes); no meta, no headers, no lists — prose only. British-inflected register.',
  'Continue seamlessly from the passage; do not summarize or restate it; do not end the story.'
].join('\n');

const CONTEXT = `The tide-halls of Aumry kept their own weather. Sereth had learned that on her first night beneath them —
how the salt fog rolled in along the black basalt corridors when the moon crested, how the wardlamps guttered green when a
promise was broken somewhere in the city above. She stood now at the lip of the drowned amphitheatre, her boots at the waterline,
and watched Kestral descend the far stair like a man walking to his own sentencing. He had not looked at her since the council.
She had told herself she did not care. The lie had lasted the length of one held breath.
"You came," he said, when the water between them was narrow enough to carry his voice. "I wasn't certain you would."
"You made it difficult not to." She kept her hands still at her sides, the way her mother had taught her, the way that hid
everything. "You put my name in the binding-book, Kestral. In ink. Where the Keepers could read it."
He stopped at the water's edge, three paces off, close enough that she could see the exhaustion set into him like silt.
"I put your name where it would be protected," he said. "There's a difference."
"Not to me."`;

const USER = CONTEXT + '\n\n---\nContinue the scene for roughly 800 words. Bring the confrontation to a real turning point — '
  + 'let something irreversible happen between them (an admission, an act, a line crossed). Keep Sereth guarded and Kestral tired; '
  + 'do not resolve it neatly. Prose only.';

const body = {
  messages: [{ role: 'system', content: SYS }, { role: 'user', content: USER }],
  role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0.7, max_tokens: 1600
};

const t0 = Date.now();
const res = await fetch('http://localhost:3000/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const data = await res.json();
const content = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '(no content)';
const servedModel = (data && data._orchestration && data._orchestration.model) || (data && data.model) || '?';

// crude garbage heuristics
const words = content.trim().split(/\s+/);
const wordCount = words.length;
const uniqueRatio = new Set(words.map(w => w.toLowerCase())).size / Math.max(1, wordCount);
const nonAsciiRatio = (content.match(/[^\x00-\x7F]/g) || []).length / Math.max(1, content.length);
const longestRepeat = (() => { let max = 0; const seen = {}; for (let i = 0; i < words.length - 2; i++) { const tri = (words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]).toLowerCase(); seen[tri] = (seen[tri] || 0) + 1; if (seen[tri] > max) max = seen[tri]; } return max; })();
const gibberishTokens = words.filter(w => /[a-z]{20,}|(.)\1\1\1/i.test(w)).length; // very long tokens or 4+ repeated chars

console.log(`\n=== grok-4-1-fast-non-reasoning PROSE QUALITY CHECK (served=${servedModel}, ${((Date.now() - t0) / 1000).toFixed(1)}s) ===`);
console.log(`words=${wordCount} · uniqueWordRatio=${uniqueRatio.toFixed(2)} (low <0.35 = repetitive) · nonAsciiRatio=${nonAsciiRatio.toFixed(3)} · maxTrigramRepeat=${longestRepeat} · gibberishTokens=${gibberishTokens}`);
console.log(`\n----- FULL OUTPUT -----\n`);
console.log(content);
console.log(`\n----- END -----`);
