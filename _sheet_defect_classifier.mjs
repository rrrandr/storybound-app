// SHEET DEFECT AUTO-CLASSIFIER (downstream milestone, step 1 — MEASUREMENT).
// Classifies already-rendered batch sheets via a vision model (gemini-2.0-flash through the extended
// gemini-proxy), aggregates the defect dashboard, and compares to the eyeball labels. Its FIRST job is
// measurement (make the regression dashboard objective/cheap), not gating. Runs on saved images — cheap.
import fs from 'fs';
import path from 'path';

const BASE = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad';
const UW_SCENE = 'a human woman (brown hair, sometimes a grey manta-cloak cape) and a KWISHEEN (tentacle-bodied — humanoid torso, coral-dreadlock hair, tentacles instead of legs, a humanoid face) in drowned coral ruins, UNDERWATER — figures FLOAT/drift (no gravity). A red twisted "X-burst" may appear on AT MOST ONE panel (a twisted-wish beat).';
// DISTRIBUTION-SHIFT scene: different creature (First Favored = humanoid, NO tentacles, two legs), different
// setting (white weeping-willow forest, ON LAND — gravity applies, figures stand/walk, NOT floating).
const FF_SCENE = 'a human woman and a FIRST FAVORED (a luminous humanoid with pointed ears and Weave-Script skin-glow, TWO ORDINARY LEGS — NO tentacles, fully bipedal) in a pale white weeping-willow forest (the Veilwood), ON LAND above water. GRAVITY APPLIES: figures stand, walk, lunge on the ground — they do NOT float. A red twisted "X-burst" may appear on AT MOST ONE panel (a twisted-wish beat).';

const BATCHES = [
  { name: 'R1', dir: 'sheet_defect_batch',  scene: UW_SCENE, eyeball: 'structural~22 : localized~3' },
  { name: 'R2', dir: 'sheet_defect_batch2', scene: UW_SCENE, eyeball: 'structural~6 : localized~5' },
  { name: 'R3', dir: 'sheet_defect_batch3', scene: UW_SCENE, eyeball: 'structural~3 : localized~4' },
  { name: 'FF (dist-shift)', dir: 'sheet_defect_ff', scene: FF_SCENE, eyeball: 'cross-domain probe' }
];
const PROXY = 'http://localhost:3000/api/gemini-proxy';

const buildPrompt = (scene) => `You are the ACCEPTANCE-QA gate for a Storybound 2x2 comic sheet (4 panels; reading order TL=1, TR=2, BL=3, BR=4). This is NOT art critique — it is production acceptance. For ANY imperfection the ONLY question is:

  "Would this image be REGENERATED or REPAIRED in production?"

If no, it is NOT a defect — do not report it. Storybound is deliberately tolerant of artistic/stylistic variation.

SCENE (judge the render against THIS expected content): ${scene}

HARD INVARIANTS — report ONLY these (each would trigger a regen/repair):`;
const PROMPT_TAIL = `
- species: a character drawn as the WRONG species — a human where the Kwisheen belongs, or a Kwisheen with NO tentacles at all while NOT disguised.
- continuity: the SAME character duplicated ("twins"); or a character's FACE / HAIR STYLE / BUILD / CLOTHING / COLOUR changing between panels; or a weapon changing shape or vanishing between panels.
- sfx: a sound-effect word for an action NOT shown ("THUD" with no impact, "KLANG" with no blades meeting).
- text-leak: ANY word/label lettered into the art that is NOT a valid, action-matched SFX (titles, "PHASE", "FATE BURST", captions).
- burst: the wish/twist burst WRONG — wrong colour (a twisted wish must be RED, jagged, with X's), OR in a non-wish panel, OR filling/dominating a panel, OR drawn as a standalone emblem.
- expression: a blank / wooden / mannequin face on a character in an emotional beat (emotion unreadable).
- buoyancy: a figure standing or planted on the seabed instead of floating.
- background: a dead, empty underwater panel — missing the life the world should have (no bystanders, fish/schools, coral, kelp, ruins/structures, moons/light where they belong).

SOFT — NEVER report these on their own (canon-tolerant, would NOT be regenerated):
- tentacle COUNT (canon: "about six" — the EXACT number does NOT matter; never flag 5/7/8 tentacles).
- minor hair variation, clothing folds, small anatomy asymmetry, stylization, dramatic posing, composition preference, line-art quirks.

For each HARD defect: {"panel":1-4,"class":"species"|"continuity"|"sfx"|"text-leak"|"burst"|"expression"|"buoyancy"|"background"|"other","locality":"localized"|"structural","repairable":true|false,"severity":"high"|"med"|"low","note":"brief"}.
locality — localized: a BOUNDED region an in-place edit fixes (one face, one weapon, one SFX word, one added background element). structural: affects the WHOLE panel or the generation (twins, a planted figure, a dominating burst, a barren composition) — needs a regen.
repairable: could an in-place edit fix it WITHOUT regenerating the whole panel?

Report ONLY hard, production-worthy defects; clean panels get nothing. Output ONLY JSON: {"defects":[...]}. No prose.`;

function b64(p) { return fs.readFileSync(p).toString('base64'); }
function parseJSON(t) {
  if (!t) return null;
  let s = String(t).trim().replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
  const a = s.indexOf('{'), z = s.lastIndexOf('}');
  if (a >= 0 && z > a) s = s.slice(a, z + 1);
  try { return JSON.parse(s); } catch (_) { return null; }
}

async function classify(imgPath, scene) {
  const body = {
    model: 'gemini-2.5-flash', role: 'FALLBACK_AUTHOR', temperature: 0, max_tokens: 1400,
    messages: [{ role: 'user', content: [
      { type: 'text', text: buildPrompt(scene) + PROMPT_TAIL },
      { type: 'image', mime_type: 'image/png', data: b64(imgPath) }
    ] }]
  };
  const r = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) return { err: 'HTTP ' + r.status + ' ' + (await r.text()).slice(0, 120) };
  const d = await r.json();
  const text = (d && (d.content || (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content))) || (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts && d.candidates[0].content.parts.map(p=>p.text).join('')) || '';
  const parsed = parseJSON(text);
  return parsed && Array.isArray(parsed.defects) ? { defects: parsed.defects } : { err: 'unparsed', raw: String(text).slice(0, 160) };
}

(async () => {
  for (const B of BATCHES) {
    const dir = path.join(BASE, B.dir);
    const sheets = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^sheet\d+\.png$/.test(f)).sort() : [];
    let structural = 0, localized = 0, species = 0, high = 0, repairable = 0, total = 0, errs = 0;
    const byClass = {};
    for (const f of sheets) {
      const res = await classify(path.join(dir, f), B.scene);
      if (res.err) { errs++; console.error(`  ${B.name}/${f}: ${res.err}${res.raw ? ' | ' + res.raw : ''}`); continue; }
      for (const dfx of res.defects) {
        total++;
        if (dfx.locality === 'structural') structural++; else localized++;
        if (dfx.class === 'species') species++;
        if (dfx.severity === 'high') high++;
        if (dfx.repairable === true) repairable++;
        byClass[dfx.class] = (byClass[dfx.class] || 0) + 1;
        // DISAGREEMENT AUDIT — dump each defect of the AUDIT class with the model's own reason, so we can
        // find the systematic false-positive PATTERN rather than tweak wording blindly. (Roman's method.)
        if (process.env.AUDIT && dfx.class === process.env.AUDIT) {
          console.log(`   [audit] ${f} p${dfx.panel} [${dfx.severity}/${dfx.locality}] ${String(dfx.note || '').slice(0, 130)}`);
        }
      }
    }
    const q = sheets.length * 4;
    console.log(`\n== ${B.name} (${sheets.length} sheets / ${q} quadrants, ${errs} errs) ==`);
    console.log(`   eyeball: ${B.eyeball}`);
    console.log(`   auto:    structural ${structural} : localized ${localized}  | species-fail ${species} | high-sev ${high} | repairable ${repairable}/${total}`);
    console.log(`   by class: ${Object.entries(byClass).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+':'+v).join(', ')}`);
  }
})().catch(e => { console.error('CLASSIFIER ERROR', e); process.exit(1); });
