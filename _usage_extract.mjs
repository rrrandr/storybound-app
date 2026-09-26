import fs from 'node:fs';
for (const f of process.argv.slice(2)) {
  console.log('=== ' + f.split('/').slice(-2)[0] + ' ===');
  for (const l of fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)) {
    let e; try { e = JSON.parse(l); } catch (_) { continue; }
    if (!e.real) continue;
    const rb = e.responseBody || {};
    const u = rb.usage || (rb._orchestration && rb._orchestration.usage) || null;
    if (!u) continue;
    let p; try { p = new URL(e.url).pathname; } catch (_) { p = e.url; }
    console.log('  ' + p + '  model=' + ((rb._orchestration && rb._orchestration.model) || '?')
      + '  prompt=' + (u.prompt_tokens ?? '?') + '  completion=' + (u.completion_tokens ?? '?')
      + '  reasoning=' + ((u.completion_tokens_details && u.completion_tokens_details.reasoning_tokens) ?? '?')
      + '  cached=' + ((u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens) ?? '?')
      + '  ticks=' + (u.cost_in_usd_ticks ?? 'NONE'));
  }
}
