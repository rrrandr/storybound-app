// Serve the LOCAL build's public/ directory, and record exactly which bytes the browser got.
//
// WHY THIS EXISTS (Roman 2026-11-16): the capture that carried THE ONE FIRE loaded the corrected
// local build; the loopback probe loaded the older preview deployment. "Which bundle did the
// browser load" was therefore the whole question, and it was unanswerable from a run that pointed
// at a remote origin. A server I control answers it from the serving side: every file it hands out
// is logged with its size and sha256, so the bundle under test is a recorded fact and not an
// assumption about what a deployment contains.
//
// It serves static files only. Every API route this app uses is intercepted by the runner
// (/api/config, the simulated-account routes, the blocked image routes and every model route), so
// nothing here needs to execute server code — which also means `vercel dev` and its 502-after-one-
// browser-run failure mode are out of the picture entirely.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 3999);
const ROOT = process.env.SERVE_ROOT || '/Users/romantsukerman/storybound-app/public';
const LOG = process.env.LOG || '_ft_static_server.log';
const MANIFEST = process.env.MANIFEST || '_ft_static_server_manifest.json';

const say = (m) => {
  const line = new Date().toISOString() + '  ' + m;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch (_) {}
};

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.map': 'application/json',
};

// EVERY DISTINCT FILE SERVED, with the hash of the bytes that actually went out. Hashed once per
// path and reused, so the 26MB bundle is not re-digested on every request.
const served = {};

const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (_) { p = '/'; }
  if (p === '/' || p === '') p = '/index.html';
  // Confined to ROOT. A resolved path that escapes it is refused rather than served.
  const file = path.resolve(ROOT, '.' + p);
  if (!file.startsWith(path.resolve(ROOT))) {
    res.writeHead(403); res.end('forbidden'); say('FORBIDDEN ' + p);
    return;
  }
  let st;
  try { st = fs.statSync(file); } catch (_) {
    // A 404 is recorded, not hidden: an asset the app silently does without is worth seeing.
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found');
    say('404 ' + p);
    return;
  }
  if (st.isDirectory()) { res.writeHead(404); res.end('not found'); say('404 (dir) ' + p); return; }
  const buf = fs.readFileSync(file);
  if (!served[p]) {
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    served[p] = { bytes: buf.length, sha256: sha, firstServedAt: new Date().toISOString(), hits: 0 };
    say('SERVED ' + p + '  ' + buf.length + ' bytes  sha256=' + sha.slice(0, 16) + '…');
  }
  served[p].hits += 1;
  res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'content-length': String(buf.length), 'cache-control': 'no-store' });
  res.end(buf);
});

const writeManifest = () => {
  try {
    fs.writeFileSync(MANIFEST, JSON.stringify({
      statedPlainly: 'Every distinct path this server handed to the browser, with the size and '
        + 'sha256 of the bytes that went out. This is the record of WHICH BUNDLE was under test.',
      root: ROOT, at: new Date().toISOString(), files: served }, null, 2));
  } catch (_) {}
};

server.listen(PORT, () => say('static server listening on ' + PORT + ', serving ' + ROOT));
const bye = (sig) => { say(sig + ' — writing manifest and exiting'); writeManifest();
  server.close(() => process.exit(0)); };
process.on('SIGTERM', () => bye('SIGTERM'));
process.on('SIGINT', () => bye('SIGINT'));
