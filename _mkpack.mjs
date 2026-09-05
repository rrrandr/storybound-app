import fs from 'fs';
const pack=JSON.parse(fs.readFileSync('_validate_out/BLIND_PACK.json','utf8'));
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const paras=s=>esc(s).split(/\n{2,}|\n/).filter(t=>t.trim()).map(t=>`<p>${t.trim()}</p>`).join('\n');
const axes=['prose quality','clarity / causal legibility','character interiority','voice','dialogue',
  'pacing','specificity / imagery','repetition / calcification','feels over-edited?'];
const scenes=pack.map(s=>`
<section class="scene">
  <h2>${s.scene}</h2>
  <div class="cols">
    <article class="col"><header>X</header><div class="prose">${paras(s.X)}</div></article>
    <article class="col"><header>Y</header><div class="prose">${paras(s.Y)}</div></article>
  </div>
  <div class="score">
    <div class="verdict"><strong>Preference:</strong> X &nbsp;/&nbsp; Y &nbsp;/&nbsp; tie
      &nbsp;&nbsp;<strong>Strength:</strong> decisive &nbsp;/&nbsp; clear &nbsp;/&nbsp; slight &nbsp;/&nbsp; coin-flip</div>
    <ul>${axes.map(a=>`<li>${a}</li>`).join('')}</ul>
  </div>
</section>`).join('\n');
fs.writeFileSync('/tmp/blind_pack.html',`<title>Blind read — post-Grok stack</title>
<style>
:root{--bg:#faf8f5;--ink:#1c1a17;--mut:#6b645c;--line:#e0dad1;--card:#fff;--accent:#7c4a2d}
@media(prefers-color-scheme:dark){:root{--bg:#16151a;--ink:#eae6e0;--mut:#9a938a;--line:#2d2a31;--card:#1e1d23;--accent:#c98a63}}
:root[data-theme=dark]{--bg:#16151a;--ink:#eae6e0;--mut:#9a938a;--line:#2d2a31;--card:#1e1d23;--accent:#c98a63}
:root[data-theme=light]{--bg:#faf8f5;--ink:#1c1a17;--mut:#6b645c;--line:#e0dad1;--card:#fff;--accent:#7c4a2d}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);
font:16px/1.65 Iowan Old Style,Palatino,Georgia,serif;padding:2.5rem 1.25rem 5rem}
.wrap{max-width:1180px;margin:0 auto}
h1{font-size:1.5rem;letter-spacing:-.01em;margin:0 0 .35rem}
.sub{color:var(--mut);font-size:.9rem;margin:0 0 2.5rem;max-width:62ch}
.scene{margin:0 0 3.5rem;border-top:2px solid var(--accent);padding-top:1rem}
h2{font:600 .8rem/1 ui-sans-serif,system-ui;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin:0 0 1rem}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem}
@media(max-width:820px){.cols{grid-template-columns:1fr}}
.col{background:var(--card);border:1px solid var(--line);border-radius:3px;overflow:hidden}
.col header{font:600 .72rem/1 ui-sans-serif,system-ui;letter-spacing:.16em;padding:.6rem .9rem;
border-bottom:1px solid var(--line);color:var(--mut)}
.prose{padding:1.1rem 1.25rem;max-height:none}
.prose p{margin:0 0 .85rem;text-wrap:pretty}
.prose p:last-child{margin-bottom:0}
.score{margin-top:1rem;padding:.9rem 1.1rem;border:1px dashed var(--line);border-radius:3px;
font:13px/1.7 ui-sans-serif,system-ui;color:var(--mut)}
.verdict{color:var(--ink);margin-bottom:.5rem}
.score ul{margin:0;padding-left:1.1rem;columns:3;column-gap:1.5rem}
@media(max-width:820px){.score ul{columns:1}}
</style>
<div class="wrap">
<h1>Blind read — does the post-Grok stack improve the prose?</h1>
<p class="sub">Four scenes. In each, one column is the literal Grok author output and the other is the delivered
prose after the full downstream mutation chain. Orientation is randomized per scene; the key is sealed.
Length is the one signal randomization cannot hide — judge the prose, treat length as noise.</p>
${scenes}
</div>`);
console.log('written: /tmp/blind_pack.html  ('+fs.statSync('/tmp/blind_pack.html').size+' bytes)');
