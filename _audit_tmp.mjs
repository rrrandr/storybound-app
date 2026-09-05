// SHEET DEFECT AUTO-CLASSIFIER (downstream milestone, step 1 — MEASUREMENT).
// Classifies already-rendered batch sheets via a vision model (gemini-2.0-flash through the extended
// gemini-proxy), aggregates the defect dashboard, and compares to the eyeball labels. Its FIRST job is
// measurement (make the regression dashboard objective/cheap), not gating. Runs on saved images — cheap.
import fs from 'fs';
import path from 'path';

const BASE = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad';
const BATCHES = [{ name:'R3', dir:'sheet_defect_batch3', eyeball:'structural~3 : localized~4' }];
const PROXY = 'http://localhost:3000/api/gemini-proxy';

const PROMPT = `You are a strict QA classifier for a 2x2 comic sheet (4 panels; reading order top-left=1, top-right=2, bottom-left=3, bottom-right=4) from a Fatelands UNDERWATER fantasy scene.

EXPECTED CONTENT:
- A human woman (brown hair, sometimes a grey manta-cloak cape).
- A KWISHEEN: a tentacle-bodied being — humanoid torso, coral-dreadlock hair, SIX lower tentacles instead of legs, a HUMANOID face (NO monster fangs, NO blank white eyes).
- Setting: drowned coral ruins, underwater. Figures should FLOAT/drift (feet NOT planted on the ground).
- A red twisted "X-burst" graphic may appear on AT MOST ONE panel (a wish beat), small, off to one side.
- The ONLY text allowed anywhere is a single integrated sound-effect word per panel (e.g. KLANG). NO other words/labels.

List EVERY real defect. For each: {"panel":1-4,"class":one of ["species","face","text-leak","burst","buoyancy","continuity","composition","anatomy","other"],"locality":"localized"|"structural","repairable":true|false,"severity":"high"|"med"|"low","note":"brief"}.
Guidance: species=a human drawn where a Kwisheen belongs / tentacles missing. face=fangs/blank-eyes/monstrous. text-leak=any non-SFX word/label lettered in. burst=red burst in a wrong(non-wish) panel OR dominating a panel OR a standalone emblem. buoyancy=a figure standing/planted on ground. continuity=a character duplicated/twinned OR hair/wardrobe/setting changing between panels. composition=a wasted/empty panel. anatomy=localized limb/hand glitch.
locality: localized = a bounded region a small in-place edit could fix; structural = compositional/generation-time (needs regen or prompt change). repairable = could a localized in-place edit fix it without regenerating the whole panel.
Report ONLY real defects; clean panels get nothing. Output ONLY JSON: {"defects":[...]}. No prose.`;

function b64(p) { return fs.readFileSync(p).toString('base64'); }
function parseJSON(t) {
  if (!t) return null;
  let s = String(t).trim().replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
  const a = s.indexOf('{'), z = s.lastIndexOf('}');
  if (a >= 0 && z > a) s = s.slice(a, z + 1);
  try { return JSON.parse(s); } catch (_) { return null; }
}

async function classify(imgPath) {
  const body = {
    model: 'gemini-2.5-flash', role: 'FALLBACK_AUTHOR', temperature: 0, max_tokens: 1400,
    messages: [{ role: 'user', content: [
      { type: 'text', text: PROMPT },
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
      const res = await classify(path.join(dir, f));
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
