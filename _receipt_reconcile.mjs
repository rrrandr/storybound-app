// Reconcile per-call costs from a gate log. Dry, $0.
import fs from 'node:fs';
const f = process.argv[2];
const lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
let n = 0;
for (const l of lines) {
  let e; try { e = JSON.parse(l); } catch (_) { continue; }
  if (!e.real) continue;
  n++;
  const rb = e.responseBody || {};
  const usage = rb.usage || (rb._orchestration && rb._orchestration.usage) || null;
  const ticks = usage && typeof usage.cost_in_usd_ticks === 'number' ? usage.cost_in_usd_ticks : null;
  let path; try { path = new URL(e.url).pathname; } catch (_) { path = e.url; }
  const sys = ((rb.messages || []).find?.(m => m.role === 'system') || {}).content || '';
  console.log(`call ${n}: ${path}  ticks=${ticks === null ? 'NONE' : ticks}  usd=${ticks === null ? 'UNKNOWN' : (ticks*1e-10).toFixed(6)}  model=${(rb._orchestration && rb._orchestration.model) || 'n/a'}`);
}
console.log(`real calls in log: ${n}`);
