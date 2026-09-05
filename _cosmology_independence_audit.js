// COSMOLOGY INDEPENDENCE AUDIT ($0) — catches conceptual DRIFT in the Fatelands mystery lattice.
// Each region OWNS exactly one cosmology dimension and may NEVER answer another region's question.
// This reads the ACTUAL _FATELANDS_COSMOLOGY registry from app.js and checks, per region:
//   (a) it ASSERTS its own owned concept (sanity), and
//   (b) it TRESPASSES on no other region's owned concept (independence — the drift guard).
// If Ashen starts saying "prune futures" (Shackle), or Pulse "memory leaks" (Gloamwater), this FAILS.
const fs = require('fs');
const src = fs.readFileSync('public/app.js', 'utf8');
const m = src.match(/var _FATELANDS_COSMOLOGY = (\{[\s\S]*?\n  \});/);
if (!m) { console.error('registry not found'); process.exit(2); }
const COSMO = eval('(' + m[1] + ')');

// The orthogonal basis (Roman's table) — one dimension per region.
const GOVERNS = { thornwild:'Identity', veilwood:'Access', ashen:'Stability', gloamwater:'Memory', shackle:'Commitment', pulse:'Creation', vaelryn:'Trajectory', lytharyn:'Meaning' };

// OWNED SIGNATURES — the DISTINCTIVE claim of each region (NOT shared vocab like "branches/possibilities/Fate").
// A region must match its OWN, and must match NO OTHER.
const SIG = {
  thornwild:  [/\bcompulsion\b/i, /\bthe Becoming\b/i, /a self is (?:chosen|a stance)|chosen self|stance you (?:hold|hold or lose)/i, /turn(?:ing)? (?:into )?monster|turn(?:ing)? monstrous|becoming monstrous/i],
  veilwood:   [/First Favored/i, /pay(?:s)? Fate (?:so )?little|pay Fate least/i, /through the Wound/i, /feeling erodes|lose their feeling|emotion erod/i],
  ashen:      [/agreement (?:anchors|steadies)|anchors adjacent possibilit|two minds .{0,25}(?:pin|hold one truth)|Fold (?:steadies|calms)|(?:shared )?(?:vow|truth|agreement) .{0,18}(?:stabilis|anchor|pin)|pin the world/i],
  gloamwater: [/memor(?:y|ies) (?:drift|contradict|lives? in the weave|part of the weave|shared across|move between|between neighbouring)/i, /memory is part of the WEAVE/i, /what one forgets/i],
  shackle:    [/promise (?:alters|prunes|removes|closes)/i, /prunes? (?:the )?futures?/i, /closes? off (?:the )?branches/i, /unbreakable (?:oath|promise|vow)/i, /\bobligation\b/i],
  pulse:      [/invention feels/i, /creativity leaks/i, /\binspiration\b/i, /ideas? .{0,20}(?:leak|too early)/i, /genius is porous/i, /overhear.{0,15}adjacent/i, /remembered, not made/i],
  vaelryn:    [/\bconvergence\b/i, /similar branches pull/i, /pull toward the same/i, /a current, not a script/i, /attraction, not/i, /dynast(?:y|ies).{0,25}repeat/i],
  lytharyn:   [/\bnarrative\b/i, /stor(?:y|ies) change what is (?:real|true)/i, /\brename\b/i, /retell.{0,15}re-?aim/i, /names?.{0,25}(?:reshape|become the name)/i, /self we declare/i, /to name.{0,20}re-?aim/i],
};

function ownText(k) { const c = COSMO[k]; return [c.surface, c.deep, c.gives, c.ladder].filter(Boolean).join('  ||  '); }
function hits(sigs, text) { return sigs.filter(rx => rx.test(text)); }

const keys = Object.keys(COSMO);
let fails = 0, sanityWarn = 0;
console.log('COSMOLOGY INDEPENDENCE AUDIT — ' + keys.length + ' regions\n');
for (const X of keys) {
  const text = ownText(X);
  // (a) sanity: asserts its own concept
  const own = hits(SIG[X] || [], text);
  const ownOK = own.length > 0;
  if (!ownOK) sanityWarn++;
  // (b) independence: trespasses on no other region's owned concept
  const trespass = [];
  for (const Y of keys) {
    if (Y === X) continue;
    const t = hits(SIG[Y] || [], text);
    if (t.length) trespass.push({ Y, on: t.map(r => String(r)) });
  }
  const ok = ownOK && trespass.length === 0;
  if (!ok) fails++;
  const dim = (GOVERNS[X] || '?').padEnd(11);
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + X.padEnd(11) + ' governs ' + dim + (ownOK ? '(asserts own ✓)' : '(⚠ does NOT assert its own concept)'));
  if (trespass.length) trespass.forEach(t => console.log('        ✗ TRESPASSES on ' + t.Y + ' (' + GOVERNS[t.Y] + '): matched ' + t.on.join(', ')));
}
console.log('\n════════════════════════════════════════');
console.log('INDEPENDENCE: ' + (keys.length - fails) + '/' + keys.length + ' regions clean' + (sanityWarn ? ' | ' + sanityWarn + ' sanity warning(s)' : ''));
process.exit(fails === 0 ? 0 : 1);
