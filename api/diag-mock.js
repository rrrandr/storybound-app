// DIAGNOSTIC ONLY — reports whether the upstream mock preload is installed IN THIS WORKER.
// Used to prove the mock is in place BEFORE any valid provider request is sent. No network, no
// secrets. Delete alongside api/diag-slow.js once the response-path question is settled.
export default async function handler(req, res) {
  res.status(200).json({
    mockInstalled: globalThis.__MOCK_UPSTREAM_INSTALLED === true,
    upstreamCalls: globalThis.__MOCK_UPSTREAM_CALLS ?? null,
    denied: globalThis.__MOCK_UPSTREAM_DENIED ?? null,
    pid: process.pid,
    delayMs: Number(process.env.MOCK_UPSTREAM_DELAY_MS || 0)
  });
}
