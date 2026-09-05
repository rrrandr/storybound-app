import fs from 'fs';
const pack=JSON.parse(fs.readFileSync('_validate_out/ARMS4_PACK.json','utf8'));
let md=`# Four versions of the same scene

Four variants were generated from an **identical** scene assignment, seed, cast, world state and player
action. Only the authoring instructions differed. Which variant used which instruction set is withheld.

Assignment given to all four: *Lirael passes the folded note to her contact at the market stall.*
Player action: *"I go to the market stall to pass the note."*

**Score each variant independently. Do not compare until all four are read once.**

### A. Scene comprehension — 0/1 each
- Where are we?
- Who is physically present?
- What concrete event/crisis is happening?
- What does the POV want right now?
- What concretely blocks that want?
- What changed by the end of the scene?

### B. Visualization — 0/1 each
- Could you sketch the rough physical layout?
- Can you picture the other character as a person, beyond hair/eyes/scars?
- Does the POV have an opinionated visual impression of them?
- Can you describe what any rite/magic physically did without repeating invented terminology?

### C. Pathology counts — count, don't estimate
- unsupported breath/pulse/body-response beats
- environment-mirrors-emotion beats
- gaze/eyes/fingers microbeats that don't advance action
- invented lore or mechanics
- paragraphs containing only reaction/interpretation with no new external event

### D. Only after A–C: aesthetic preference, ranked 1–4, with strength.

---
`;
for(const v of pack) md+=`\n## ${v.variant}\n\n${v.text.trim()}\n\n---\n`;
fs.writeFileSync('_validate_out/ARMS4_SHAREABLE.md', md);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const paras=s=>esc(s).split(/\n{2,}|\n/).filter(t=>t.trim()).map(t=>`<p>${t.trim()}</p>`).join('');
fs.writeFileSync('/tmp/arms4.html',`<title>Four-arm prose discriminator</title>
<style>
:root{--bg:#faf8f5;--ink:#1c1a17;--mut:#6b645c;--line:#e0dad1;--card:#fff;--accent:#2d5a4a}
@media(prefers-color-scheme:dark){:root{--bg:#15171a;--ink:#e8e6e1;--mut:#98938c;--line:#2a2e33;--card:#1d2024;--accent:#6fae95}}
:root[data-theme=dark]{--bg:#15171a;--ink:#e8e6e1;--mut:#98938c;--line:#2a2e33;--card:#1d2024;--accent:#6fae95}
:root[data-theme=light]{--bg:#faf8f5;--ink:#1c1a17;--mut:#6b645c;--line:#e0dad1;--card:#fff;--accent:#2d5a4a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);
font:16px/1.65 Iowan Old Style,Palatino,Georgia,serif;padding:2.5rem 1.25rem 5rem}
.wrap{max-width:1400px;margin:0 auto}h1{font-size:1.45rem;margin:0 0 .3rem}
.sub{color:var(--mut);font-size:.9rem;max-width:64ch;margin:0 0 2rem}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
@media(max-width:1150px){.grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:680px){.grid{grid-template-columns:1fr}}
.v{background:var(--card);border:1px solid var(--line);border-radius:3px;overflow:hidden}
.v header{font:600 .74rem/1 ui-sans-serif,system-ui;letter-spacing:.15em;padding:.65rem .9rem;
border-bottom:1px solid var(--line);color:var(--accent)}
.v .prose{padding:1rem 1.1rem;font-size:15px}
.v .prose p{margin:0 0 .8rem;text-wrap:pretty}
</style><div class="wrap"><h1>Four versions of one scene assignment</h1>
<p class="sub">Identical seed, cast, world state, assignment and player action. Only the authoring
instructions differ; which is which is sealed. Score comprehension and visualization first, count
pathologies second, and only then rank aesthetically.</p><div class="grid">
${pack.map(v=>`<article class="v"><header>${v.variant}</header><div class="prose">${paras(v.text)}</div></article>`).join('')}
</div></div>`);
console.log('md: '+fs.statSync('_validate_out/ARMS4_SHAREABLE.md').size+' bytes');
