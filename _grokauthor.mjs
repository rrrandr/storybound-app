const OUT='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/1ebda837-47b2-4c5e-961f-c4b07441bb58/scratchpad';
import { writeFileSync } from 'fs';
const V_SHARED=`WORLD: Fantasy — The Fatelands. Magic requires transformation, paid in sacrifice of self (never energy, never coin). No spell is free.

Region: Vaelryn Reach (Seat: The High Court). Governance: Human monarchy claiming Favor-legitimacy. Magic Expression: ceremonial. The ruling elite come from the five great houses (Aurelion, Thornmere, Velar, Dathros, Merrowyn).
Sacrifice Culture: "What is inherited must not be ruled by appetite." Sacred: lineage, inheritance, noble identity, blood legitimacy. Currency spent: pleasure, appetite. Taboo: Lineage Compromise.
Tension axis: lineage purity vs appetite — sacrifice strips pleasure to preserve dynastic clarity.

Mythic Pressure: Arcane Binding
WORLD ANCHOR: Magical obligation constrains love. Spells, geas, and contracts have concrete cost. Romance choices incur magical consequence.`;
const V_EXPR=`\n\nREGIONAL EXPRESSION (EXPRESSES the obstacle; does NOT change the mechanic):
- The obstacle takes the form of: a court fealty-geas or binding-vow sworn before the High Court
- Enforced by: ceremonial oath-taking witnessed and legitimized by the Five Great Houses and Favor-authority; a sworn duty carries the force of law
- Social consequence of defiance: breaking a sworn oath destroys political legitimacy — a public forsworn is politically dead, their House shamed
- BACKDROP (setting only, NOT the mechanic): lineage and bloodline here are POLITICAL SCENERY, not the obstacle; the mechanic is the CONTRACT — its terms, its cost, its loophole — never who your blood is
- Imagery: heraldry, sealed writs and oath-sigils, ritual vow-halls, court galleries`;
const B_SHARED=`WORLD: Fantasy — The Fatelands. Magic requires transformation, paid in sacrifice of self. No spell is free.

Region: The Ashen Verge — a militarized vassal frontier under House Dathros; seat the War Marshal's Hold. True mandate: containment of THE FOLD, a reality-collapse zone. Magic Expression: battle. Tone: severe, disciplined, high-stakes.
The Fold: reality collapses there; entered/survived only through PAIRED OBSERVATION — a bonded pair mutually witnessing to hold reality into a livable shape. Solo Entry is contagion. Fold survivors carry reality-marks.
Sacrifice Culture: "Identity is what remains when everything else is burned away." Currency: pain, fear, bodily integrity, years, certainty of self.

Mythic Pressure: The Beyond
WORLD ANCHOR: Love strained across a boundary — death, planes, immortality, or time. Love persists across the divide; the boundary is not simply removed; reunion returns altered.`;
const B_EXPR=`\n\nREGIONAL EXPRESSION (EXPRESSES the obstacle; does NOT change the mechanic):
- The obstacle takes the form of: separation by the Fold — a lover lost into, or held apart by, the reality-collapse where the living cannot simply follow
- Enforced by: the War Marshal's Hold and the Fold's law of paired observation; the boundary is guarded, Entry demands a bonded pair and a price
- Social consequence of defiance: to reach across the Fold alone is Solo Entry — contagion, containment, a name struck from the rolls
- BACKDROP (setting only, NOT the mechanic): the war and discipline of the Verge are the FORTRESS around the boundary, not the obstacle; the mechanic is the SEPARATION — love persisting across the Fold, never simply removed — never the army
- Imagery: the horizon-shimmer of the Fold, paired-observation rites, reality-marked survivors`;
const USER=`Write the opening ~300 words of Scene 1 of this romance. The protagonist and love interest are kept apart by the world's central obstacle. Establish that obstacle in-scene through concrete action, dialogue, and imagery — NOT exposition, no meta-labels. Just the prose.`;
async function grok(system){try{const r=await fetch('http://localhost:3000/api/proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:system},{role:'user',content:USER}],role:'NARRATIVE_AUTHOR',preferredModel:'grok-4.3',max_tokens:600,temperature:0.8})});const j=await r.json();return(j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||('[ERR]'+JSON.stringify(j).slice(0,200));}catch(e){return '[FETCH-ERR] '+e.message;}}
const jobs=[];
for(let i=1;i<=2;i++){jobs.push({k:`VAELRYN×ARCANE PAIR ${i} OLD`,s:V_SHARED});jobs.push({k:`VAELRYN×ARCANE PAIR ${i} NEW`,s:V_SHARED+V_EXPR});}
for(let i=1;i<=2;i++){jobs.push({k:`BEYOND×VERGE PAIR ${i} OLD`,s:B_SHARED});jobs.push({k:`BEYOND×VERGE PAIR ${i} NEW`,s:B_SHARED+B_EXPR});}
const results=await Promise.all(jobs.map(j=>grok(j.s)));
let dump='';results.forEach((r,i)=>{dump+=`\n\n######## ${jobs[i].k} (grok-4.3) ########\n${r}\n`;});
writeFileSync(OUT+'/grokauthor_output.txt', dump);
console.log('DONE — '+results.filter(r=>!r.startsWith('[')).length+'/'+results.length+' ok → grokauthor_output.txt');
