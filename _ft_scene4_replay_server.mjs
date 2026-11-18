// REPLAY SCENE 4'S OWN CALLS AND CAPTURE WHAT THE EDITORS SEND (Roman 2026-11-18)
//
// Provider-blocked: nothing is forwarded anywhere. Two jobs.
//
//   /api/*   model calls are answered from Scene 4's OWN saved responses, matched by role and by
//            the order that role was called in, so the prose and the planning are the ones
//            already paid for and nothing new is generated.
//
//   /v1/chat/completions   the C+ editor's own egress, redirected here by the runner's guard.
//            The POST body is CAPTURED — that body IS the craft / picturability request under
//            test — and answered with a stand-in reply.
//
// The stand-in is labelled as one. It keeps the social admiration obligation so the settlement
// path downstream is exercised, but it is NOT an editor verdict and nothing from it should be
// read as one.
import http from 'node:http';
import fs from 'node:fs';

const PORT = Number(process.env.PORT || 3988);
const RUN = process.env.SB_REPLAY_SRC || '/Users/romantsukerman/storybound-app/_ft_scene4_paid/LATEST/';
const OUT = process.env.SB_CAPTURE_OUT || '/Users/romantsukerman/storybound-app/_ft_scene4_replay_capture.json';
const DEST = process.env.SB_DEST_OUT || '/Users/romantsukerman/storybound-app/_ft_scene4_replay_destinations.json';

const byRole = {};
fs.readdirSync(RUN).forEach((f) => {
  const m = f.match(/^response_r(\d+)_([A-Za-z_]+)_(\d+)\.json$/);
  if (!m) return;
  (byRole[m[2]] = byRole[m[2]] || []).push({ n: Number(m[1]), file: f, status: Number(m[3]) });
});
Object.keys(byRole).forEach((r) => byRole[r].sort((a, b) => a.n - b.n));
console.log('[REPLAY] saved responses by role: '
  + Object.keys(byRole).map((r) => r + 'x' + byRole[r].length).join(', '));

const served = {};
const captures = [];
// EVERY REQUEST'S DESTINATION, RECORDED. Zero settled spend cannot establish that no provider
// was contacted: a replayed reply has its receipt stripped, so a call that DID leave would also
// settle $0. What settles the question is where each request went, and whether this process has
// any outbound path at all. It has none - there is no fetch() in this file.
const destinations = [];
const note = (url, role, dest, how) => {
  destinations.push({ at: new Date().toISOString(), url, role: role || null, dest, how });
  try { fs.writeFileSync(DEST, JSON.stringify(destinations, null, 2)); } catch (_) {}
};
const dump = () => { try { fs.writeFileSync(OUT, JSON.stringify(captures, null, 2)); } catch (_) {} };

const srv = http.createServer((req, res) => {
  let buf = '';
  req.on('data', (d) => { buf += d; });
  req.on('end', () => {
    const send = (code, body) => {
      const t = typeof body === 'string' ? body : JSON.stringify(body);
      res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(t) });
      res.end(t);
    };
    if (/\/v1\/chat\/completions/.test(req.url)) {
      let body = null; try { body = JSON.parse(buf); } catch (_) {}
      const text = JSON.stringify(body || buf);
      const isPicture = /PICTURAB|picturab/i.test(text);
      captures.push({ kind: isPicture ? 'picturability' : 'craft', chars: buf.length,
        model: body && body.model, body: body });
      dump();
      note(req.url, (isPicture ? 'PICTURABILITY' : 'CRAFT'), 'answered-in-process', 'captured-and-answered');
      console.log('[CAPTURE] ' + (isPicture ? 'PICTURABILITY' : 'CRAFT') + ' request - '
        + buf.length + ' chars, model=' + ((body && body.model) || '?')
        + ' -> answered in process, NOT forwarded');
      const decisions = [];
      if (!isPicture) {
        const m = text.match(/She has refused the photograph[^"\\]{0,200}/);
        if (/liadmire:social/.test(text) && m) {
          decisions.push({ id: 'liadmire:social', decision: 'keep',
            passage: String(m[0]).replace(/\\n/g, ' ').trim(),
            why: 'he states her refusal in front of the crew; she registers it in her body' });
        }
        if (/liadmire:capability/.test(text)) {
          decisions.push({ id: 'liadmire:capability', decision: 'none',
            why: 'this draft shows him conceding, not doing something well' });
        }
        const fm = text.match(/cplusbeat:[A-Za-z0-9:_#@.-]+/);
        if (fm) decisions.push({ id: fm[0], decision: 'none', why: 'stand-in reply' });
      }
      const content = JSON.stringify({ decisions: decisions });
      return send(200, { ok: true, content: content, usage: null, finish_reason: 'stop',
        _standIn: 'NOT an editor verdict - a replay stand-in',
        choices: [{ message: { content: content }, finish_reason: 'stop' }] });
    }
    if (/\/api\/config/.test(req.url)) { note(req.url, 'config', 'answered-in-process', 'static'); return send(200, { ok: true, replay: true }); }
    if (/\/api\/(beta-events|geo)/.test(req.url)) { note(req.url, 'telemetry', 'answered-in-process', 'static'); return send(200, { ok: true }); }

    let role = '';
    try { role = String((JSON.parse(buf) || {}).role || ''); } catch (_) {}
    const list = byRole[role] || [];
    const idx = (served[role] = (served[role] || 0));
    if (list[idx]) {
      served[role] = idx + 1;
      const rec = JSON.parse(fs.readFileSync(RUN + list[idx].file, 'utf8'));
      const raw = String(rec.bodyComplete || '{}');
      note(req.url, role, 'disk:' + list[idx].file, 'replayed-from-disk');
      console.log('[REPLAY] ' + role + ' #' + (idx + 1) + '/' + list.length + ' <- '
        + list[idx].file + ' (' + raw.length + ' bytes)');
      // Receipts stripped: a replayed body that still carries `usage` gets SETTLED as real
      // spend, which once reported $0.013944 of money that was never spent.
      let parsed = null; try { parsed = JSON.parse(raw); } catch (_) {}
      if (parsed && typeof parsed === 'object') {
        parsed.usage = null;
        return send(rec.status || 200, parsed);
      }
      return send(rec.status || 200, raw);
    }
    note(req.url, role, 'refused-503', 'no-saved-reply');
    console.log('[REPLAY] 503 ' + (role || '(no role)') + ' ' + buf.length + ' chars ' + req.url);
    return send(503, { error: 'replay_has_no_saved_reply', role: role || null });
  });
});
srv.on('error', (e) => { console.error('[REPLAY] CANNOT BIND ' + PORT + ': ' + e.code); process.exit(3); });
srv.listen(PORT, () => console.log('[REPLAY] listening on ' + PORT
  + ' - replays Scene 4 calls, captures the editors, forwards NOTHING'));
process.on('SIGTERM', () => {
  dump();
  const offMachine = destinations.filter((d) => !/^(disk:|answered-in-process|refused-503)/.test(d.dest));
  console.log('[REPLAY] captured ' + captures.length + ' editor request(s); served '
    + JSON.stringify(served));
  console.log('[REPLAY] destinations: ' + destinations.length + ' request(s), '
    + offMachine.length + ' off-machine. This process contains no fetch(), so it has no outbound path.');
  srv.close(() => process.exit(0));
});
