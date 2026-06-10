// ═══════════════════════════════════════════════════════════════════════
// CSP VIOLATION REPORT ENDPOINT
//
// Browsers POST violation reports here when the Content-Security-Policy
// (or Content-Security-Policy-Report-Only) header on the HTML response
// flags a load / inline-script / inline-style / connection that the policy
// disallows.
//
// Two body formats per the CSP spec:
//   • Legacy `report-uri` directive sends Content-Type:
//       application/csp-report
//     Body:
//       { "csp-report": { "document-uri": ..., "violated-directive": ...,
//                         "blocked-uri": ..., "source-file": ...,
//                         "line-number": ..., "column-number": ... } }
//
//   • Modern `report-to` directive sends Content-Type:
//       application/reports+json
//     Body: [ { "type": "csp-violation", "body": { ...same fields... } }, ... ]
//
// This endpoint accepts either, normalizes, logs ONCE per request, and
// returns 204. Logs land in Vercel's function logs — `vercel logs --follow`
// or the dashboard shows them in real time.
//
// We deliberately do NOT persist to Supabase here; if violation volume
// proves large enough to need querying, we can swap the console.log for a
// supabase insert. Starting cheap.
// ═══════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  // CORS — should normally only be called by the same origin from a CSP
  // header, but be permissive so reports from any path land cleanly.
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  // Browsers send these on CSP reports.
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Content-Type-Options');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const ct = String(req.headers['content-type'] || '').toLowerCase();
    let reports = [];

    if (ct.includes('application/reports+json')) {
      // Reporting API format — array of envelopes.
      const list = Array.isArray(req.body) ? req.body : [req.body];
      reports = list.map(env => env && env.body ? env.body : env).filter(Boolean);
    } else if (ct.includes('application/csp-report') || (req.body && req.body['csp-report'])) {
      // Legacy report-uri format — single envelope.
      const r = req.body && req.body['csp-report'];
      if (r) reports = [r];
    } else if (req.body && typeof req.body === 'object') {
      // Fallback: best-effort treat as a single report.
      reports = [req.body];
    }

    // Log one structured line per violation so they're greppable in Vercel logs.
    for (const r of reports) {
      const summary = {
        directive: r['violated-directive'] || r.violatedDirective || r.effectiveDirective || 'unknown',
        blocked:   r['blocked-uri']        || r.blockedURL       || r.blockedURI         || '(inline)',
        source:    r['source-file']        || r.sourceFile       || r.documentURL        || '',
        line:      r['line-number']        || r.lineNumber       || null,
        column:    r['column-number']      || r.columnNumber     || null,
        sample:    (r['script-sample'] || r.sample || '').slice(0, 120),
        doc:       r['document-uri']       || r.documentURL      || ''
      };
      try {
        console.warn('[CSP-REPORT]',
          summary.directive,
          '| blocked:', summary.blocked,
          '| at:', summary.source || summary.doc,
          summary.line != null ? `${summary.line}:${summary.column || 0}` : '',
          summary.sample ? `| sample: "${summary.sample}"` : ''
        );
      } catch (_) {}
    }
  } catch (e) {
    try { console.warn('[CSP-REPORT] parse error:', e && e.message); } catch (_) {}
  }

  // Always 204 — the browser doesn't read the response body, and a 4xx/5xx
  // would just spam its own console with retries.
  return res.status(204).end();
}
