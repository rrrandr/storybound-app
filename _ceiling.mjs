import fs from 'fs';
const F = '_live_run_pass_criteria.md';
let s = fs.readFileSync(F, 'utf8');
const a = '**No run is authorized here.** A paid run requires an explicit per-run authorization with a ceiling, and this\ndocument does not constitute one.';
if (!s.includes(a)) throw new Error('ANCHOR MISSING');
s = s.replace(a, `## Spend ceiling — SET

> **$0.25 per run** (Roman, 2026-09-29). Reserved before dispatch; the run stops at the ceiling.
> **Reasoning charges may exceed a token-derived estimate** — \`cost_in_usd_ticks\` from the provider is
> authoritative over any arithmetic, and the measured figure is what gets logged.

**Run accounting, fixed here:** one upstream attempt per outcome, no fallback chain, the raw response and
receipt persisted off the wire **before** any page evaluation, and the paid run logged to a file with real
process status preserved.

**The ceiling is set; the run is still not authorized.** A paid call needs an explicit per-run go from Roman,
consumed on execution rather than on spend. **This document does not constitute one.**`);
fs.writeFileSync(F, s);
console.log('ceiling recorded: $0.25 per run');
