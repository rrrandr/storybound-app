// THE PAYLOAD MANIFEST — printed by every acceptance test BEFORE any prose is judged.
//
// The rule: prove the Author had the tools before grading the writing. Almost every
// "Grok keeps doing X" defect turned out to be an argument dropped at the call boundary,
// not a model that ignored instructions. Judging prose written without the rules tells
// you nothing about the rules.
//
// usage (in a harness):   import { renderManifest } from './_payload_manifest.mjs';
//                         const ok = renderManifest(authorPayloadText, { label: 'scene 2' });
// usage (standalone):     node _payload_manifest.mjs _validate_out/RUNDIR
import fs from 'fs';
import { DIRECTIVES, carries } from './_directive_registry.mjs';

export function manifest(authorText, scene = 'continuation') {
  const received = [], missing = [], notApplicable = [];
  for (const d of DIRECTIVES) {
    if (!d.expect.includes('author')) continue;
    // A Scene 1 payload has no spine block, so continuation-scoped directives are not
    // absent — they are not due yet. Reporting them as gaps aborts a paid run for free.
    if (d.scope === 'continuation' && scene === 'scene1') { notApplicable.push(d.name); continue; }
    (carries(authorText, d.probe) ? received : missing).push(d.name);
  }
  return { received, missing, notApplicable, ok: missing.length === 0 };
}

export function renderManifest(authorText, opts = {}) {
  const { label = 'author payload', chars = String(authorText || '').length, stubbed = false,
          scene = 'continuation' } = opts;
  const m = manifest(authorText, scene);
  console.log(`\n${'─'.repeat(62)}`);
  console.log(`AUTHOR RECEIVED — ${label}  (${chars} chars)`);
  console.log('─'.repeat(62));
  for (const n of m.received) console.log(`  ✓ ${n}`);
  for (const n of m.notApplicable) console.log(`  – ${n}  (not due until a continuation)`);
  console.log('\nMISSING:');
  if (!m.missing.length) console.log('  (none)');
  else for (const n of m.missing) console.log(`  ✗ ${n}`);
  // ACTIVATED is not the same question as DELIVERED. A rule can be defined, built and
  // absent from the payload because a GATE held it back — and from outside those look
  // identical. The gate trace makes the difference legible.
  if (opts.gateTrace) {
    const g = opts.gateTrace;
    console.log('\nACTIVATION (canon gate):');
    console.log(`  wish depicted   ${g.wishDepicted ? '✓' : '✗'}    wish resolves  ${g.wishResolves ? '✓' : '✗'}`);
    console.log(`  spine in gate   ${g.spineInGate ? '✓' : '✗'}    gate input     ${g.ltSceneChars} chars`);
    console.log(`  FATE_TWIST_PHYSICS  DEFINED ✓  BUILT ✓  DELIVERED ${carries(authorText, 'wish-twist sequence') ? '✓' : '✗'}  ACTIVATED ${g.twistPhysicsActivated ? '✓' : '✗'}`);
    if (!g.twistPhysicsActivated)
      console.log(`  Reason: ${!g.wishDepicted ? 'no wish depicted this scene' : 'wish-resolution gate false'}`
        + ` — gate saw: "${String(g.ltSceneSample || '').slice(0, 90)}"`);
  } else if (opts.gateTraceExpected) {
    console.log('\nACTIVATION (canon gate):  TRACE ABSENT — the gate site never ran on this path.');
  }
  console.log('─'.repeat(62));
  if (!m.ok && stubbed) {
    // Content-gated canon cannot load behind a stubbed planner, so MISSING here is the
    // harness's own shadow. Only a real run's manifest can gate a verdict on the prose.
    console.log('  STUB CAPTURE — content-gated layers are absent BY CONSTRUCTION.');
    console.log('  This manifest proves DELIVERY of the ✓ rows only. It cannot show a gap.');
  } else if (!m.ok) {
    console.log('  The Author did NOT have the tools. Do not grade this prose as a');
    console.log('  test of the rules above — it is a test of their absence.');
  }
  return m.ok;
}

// Standalone: manifest the largest author payload in a run directory.
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] || '_validate_out/payload_free';
  const files = fs.readdirSync(dir).filter(f => /^payload_\d+\.txt$/.test(f))
    .sort((a, b) => fs.statSync(`${dir}/${a}`).size - fs.statSync(`${dir}/${b}`).size);
  if (!files.length) { console.log(`no author payloads in ${dir}`); process.exit(1); }
  const f = files[files.length - 1];
  let stubbed = false;
  try { stubbed = !!JSON.parse(fs.readFileSync(`${dir}/capture_meta.json`, 'utf8')).stubbed; } catch (_) {}
  const ok = renderManifest(fs.readFileSync(`${dir}/${f}`, 'utf8'), { label: `${dir}/${f}`, stubbed });
  process.exit(ok || stubbed ? 0 : 1);   // a stub capture must never fail a build
}
