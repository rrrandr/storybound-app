import fs from 'fs';
const pack=JSON.parse(fs.readFileSync('_validate_out/ARMS3_PACK.json','utf8'));
const RUBRIC=`Three variants were generated from an **identical** scene assignment, seed, cast, world state and
player action. Only the author's instruction stack differed. Which variant is which is withheld.

Assignment: *Lirael passes the folded note to her contact at the market stall.*
Player action: *"I go to the market stall to pass the note."*

**Read all three once before scoring anything.**

### A. COLD-READER CAUSAL RECONSTRUCTION — the primary test
In **2–3 ordinary-English sentences, using NO world-specific terminology** (no geas, vow-thread, Fate, crest,
wardens, First Favored, alignment, binding, sigil, or any invented noun), explain:
1. what just happened,
2. why it is a problem for the protagonist,
3. what concrete consequence follows if she does nothing.

**If you have to parrot an invented noun to make it make sense — FAIL.** Score PASS / PARTIAL / FAIL.

### B. ASSUMED PRIOR KNOWLEDGE
What information from before this scene did the prose require you to already know for the crisis to land?
Fewer assumed facts is better. List them.

### C. ILLUSTRATOR TEST
Could an illustrator block the characters and environment from this text alone? What is missing?

### D. RECOGNITION TEST
Describe the other character well enough that another reader could recognize them later **without their name**.
If all you have is hand / eyes / fingers / voice — that is a fail.

### E. PATHOLOGY COUNTS — count, don't estimate
- unsupported breath/pulse/body-response beats
- environment-mirrors-emotion beats
- gaze/eye/finger microbeats that don't advance action
- invented lore or mechanics
- paragraphs containing only reaction/interpretation with no new external event

### F. Only after A–E: aesthetic preference, ranked 1–3, with strength.
`;
let md=`# Three versions of the same scene\n\n${RUBRIC}\n---\n`;
for(const v of pack) md+=`\n## ${v.variant}\n\n${v.text.trim()}\n\n---\n`;
fs.writeFileSync('_validate_out/ARMS3_SHAREABLE.md', md);

const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const paras=s=>esc(s).split(/\n{2,}|\n/).filter(t=>t.trim()).map(t=>`<p>${t.trim()}</p>`).join('');
const mdlite=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
const rubricHtml=RUBRIC.split(/\n{2,}/).map(b=>{
  if(b.startsWith('### ')) return `<h3>${mdlite(b.slice(4))}</h3>`;
  if(/^\d\./m.test(b)&&b.split('\n').every(l=>/^\d\.|^\s*$/.test(l))) return `<ol>${b.split('\n').filter(Boolean).map(l=>`<li>${mdlite(l.replace(/^\d\.\s*/,''))}</li>`).join('')}</ol>`;
  if(b.trimStart().startsWith('- ')) return `<ul>${b.split('\n').filter(l=>l.trim()).map(l=>`<li>${mdlite(l.replace(/^\s*-\s*/,''))}</li>`).join('')}</ul>`;
  return `<p>${mdlite(b).replace(/\n/g,'<br>')}</p>`;
}).join('');

fs.writeFileSync('/tmp/arms3.html',`<title>Three-arm subtraction discriminator</title>
<style>
:root{--bg:#f7f5f2;--ink:#1b1917;--mut:#6d665e;--line:#e2dcd3;--card:#fff;--accent:#8a4b2a;--ok:#2f6b4f}
@media(prefers-color-scheme:dark){:root{--bg:#141618;--ink:#e9e6e1;--mut:#979289;--line:#282c30;--card:#1c1f22;--accent:#d08a5e;--ok:#7fbd9b}}
:root[data-theme=dark]{--bg:#141618;--ink:#e9e6e1;--mut:#979289;--line:#282c30;--card:#1c1f22;--accent:#d08a5e;--ok:#7fbd9b}
:root[data-theme=light]{--bg:#f7f5f2;--ink:#1b1917;--mut:#6d665e;--line:#e2dcd3;--card:#fff;--accent:#8a4b2a;--ok:#2f6b4f}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);
font:16px/1.65 Iowan Old Style,Palatino,Georgia,serif;padding:2.5rem 1.25rem 5rem}
.wrap{max-width:1500px;margin:0 auto}
h1{font-size:1.5rem;margin:0 0 1.5rem;letter-spacing:-.01em}
.rub{background:var(--card);border:1px solid var(--line);border-radius:3px;padding:1.4rem 1.6rem;margin-bottom:2rem}
.rub h3{font:600 .8rem/1.3 ui-sans-serif,system-ui;letter-spacing:.1em;text-transform:uppercase;
color:var(--accent);margin:1.5rem 0 .5rem}.rub h3:first-child{margin-top:0}
.rub p,.rub li{font-size:.92rem;color:var(--ink)}.rub ul,.rub ol{margin:.4rem 0 .4rem 1.2rem}
.rub li{margin:.15rem 0}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.1rem}
@media(max-width:1000px){.grid{grid-template-columns:1fr}}
.v{background:var(--card);border:1px solid var(--line);border-radius:3px;overflow:hidden}
.v header{font:600 .74rem/1 ui-sans-serif,system-ui;letter-spacing:.15em;padding:.7rem .95rem;
border-bottom:1px solid var(--line);color:var(--accent)}
.v .prose{padding:1.1rem 1.2rem;font-size:15px}
.v .prose p{margin:0 0 .8rem;text-wrap:pretty}
</style><div class="wrap"><h1>Three versions of one scene assignment</h1>
<div class="rub">${rubricHtml}</div><div class="grid">
${pack.map(v=>`<article class="v"><header>${v.variant}</header><div class="prose">${paras(v.text)}</div></article>`).join('')}
</div></div>`);
console.log('variants: '+pack.length+'  md: '+fs.statSync('_validate_out/ARMS3_SHAREABLE.md').size+' bytes');
