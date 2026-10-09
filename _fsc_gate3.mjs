import fs from 'fs';
const F = 'public/app.js';
let s = fs.readFileSync(F, 'utf8');
const a = "    } catch (_fscGErr) { console.warn('[FSC-GATE] threw:', _fscGErr && _fscGErr.message); }\n";
if (!s.includes(a)) throw new Error('ANCHOR MISSING');
if (s.split(a).length > 2) throw new Error('NOT UNIQUE');
const b = a + `    // ── PAYLOAD INTEGRITY GATE — FAIL CLOSED ──────────────────────────────────────────
    // If a sealed Tempt or Petition consequence cannot be rendered into the author payload, NO
    // scene is generated. Emitting nothing and proceeding would produce a paid Fate intervention
    // authored with no consequence in front of the model — the exact failure this compiler exists
    // to prevent. The sealed record is preserved; the existing retry path applies.
    try {
      if (typeof _fscPayloadIntegrity === 'function') {
        var _fscInt = _fscPayloadIntegrity();
        if (!_fscInt.ok) {
          try { console.error('[FSC-GATE] generation REFUSED — sealed consequence could not be rendered. '
            + 'The invocation and its consequence are preserved; retry once the renderer is available.'); } catch (_) {}
          return null;
        }
      }
    } catch (_fscIErr) {
      // The integrity check itself failing is ALSO a fail-closed condition.
      try { console.error('[FSC-GATE] integrity check threw — refusing generation:', _fscIErr && _fscIErr.message); } catch (_) {}
      return null;
    }
`;
fs.writeFileSync(F, s.replace(a, b));
console.log('integrity gate wired into the generation funnel');
