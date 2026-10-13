// WHAT DOES THE ROUTE ACTUALLY SEND UPSTREAM? Provider-free, $0, nothing leaves the machine.
// The REAL api/anthropic-proxy.js handler runs with globalThis.fetch replaced by a capture stub,
// so this proves what the upstream body would be WITHOUT paying to find out. The key is a dummy
// string that never reaches a network call; the real credential is never read or handled here.
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

process.env.ANTHROPIC_API_KEY = 'dummy-not-a-real-key-fetch-is-stubbed';
const handler = require('./api/anthropic-proxy.js');

let captured = null;
globalThis.fetch = async (url, opts) => {
  captured = { url, headers: Object.keys(opts.headers || {}), body: JSON.parse(opts.body) };
  return { ok: true, status: 200, headers: { get: () => null },
    text: async () => JSON.stringify({
      content: [{ type: 'text', text: 'STUB' }], stop_reason: 'end_turn',
      model: captured.body.model,
      usage: { input_tokens: 130457, output_tokens: 1200,
        output_tokens_details: { thinking_tokens: 0 } } }) };
};

const REQ = process.env.SB_AUTHOR_REQ;
const frozen = JSON.parse(fs.readFileSync(REQ, 'utf8')).body;
const sent = JSON.parse(fs.readFileSync(process.env.SB_ARM_REQ, 'utf8')).body;

let out = null;
const res = { setHeader(){}, status(c){ this._c = c; return this; }, json(o){ out = { code: this._c, o }; return this; } };
await handler({ method: 'POST', body: sent }, res);

let pass = 0, fail = 0;
const t = (label, ok, extra) => { console.log((ok ? '  ok   ' : '  FAIL ') + label + (extra ? '  — ' + extra : '')); ok ? pass++ : fail++; };
console.log('=== ASSEMBLED UPSTREAM BODY (provider-free, $0) ===\n');
console.log(JSON.stringify({ ...captured.body, messages: '<' + captured.body.messages.length + ' turn(s)>',
  system: '<' + String(captured.body.system || '').length + ' chars>' }, null, 2) + '\n');

t('endpoint is Anthropic\'s messages API', captured.url === 'https://api.anthropic.com/v1/messages');
t('thinking.type is the documented between_tools',
  captured.body.thinking && captured.body.thinking.type === 'between_tools',
  JSON.stringify(captured.body.thinking));
t('output_config.effort is high',
  captured.body.output_config && captured.body.output_config.effort === 'high',
  JSON.stringify(captured.body.output_config));
t('NO manual budget_tokens (not accepted past 4.6)',
  !captured.body.thinking || captured.body.thinking.budget_tokens === undefined);
t('NO temperature (rejected as deprecated by this model)', captured.body.temperature === undefined);
t('NO tools — which is what makes between_tools yield text',
  captured.body.tools === undefined);
t('max_tokens is the frozen 2400', captured.body.max_tokens === frozen.max_tokens,
  String(captured.body.max_tokens));
t('model is the pinned Sonnet id', captured.body.model === 'claude-sonnet-5-5');

// THE MESSAGES MUST BE THE FROZEN ONES, converted but not altered.
const fSys = frozen.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
const fTurn = frozen.messages.filter((m) => m.role !== 'system');
t('system field is byte-exact the frozen system message(s)', captured.body.system === fSys,
  captured.body.system.length + ' vs ' + fSys.length + ' chars');
t('turn count matches the frozen request', captured.body.messages.length === fTurn.length);
t('every turn is byte-exact and keeps its role',
  captured.body.messages.every((m, i) => m.content === fTurn[i].content && m.role === fTurn[i].role));
const totalChars = captured.body.system.length
  + captured.body.messages.reduce((n, m) => n + m.content.length, 0);
const frozenChars = frozen.messages.reduce((n, m) => n + String(m.content).length, 0);
t('no character of the prompt is added or lost in conversion',
  totalChars === frozenChars, totalChars + ' vs ' + frozenChars);

// AND THE METADATA MUST NOT CLAIM THINKING IS OFF.
const orch = out.o._orchestration;
t('metadata reports the REQUESTED thinking type, not a false "off"',
  orch.thinking_requested === 'between_tools', JSON.stringify(orch.thinking_requested));
t('metadata reports the effort asked for', orch.effort_requested === 'high');
t('metadata carries the provider-REPORTED thinking tokens separately',
  orch.thinking_tokens_reported === 0, String(orch.thinking_tokens_reported));
console.log('\n' + (fail ? 'FAIL ' : 'PASS ') + pass + '/' + (pass + fail) + ' assertions');
process.exit(fail ? 1 : 0);
