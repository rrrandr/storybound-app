// ═══════════════════════════════════════════════════════════════════════════════════════════════
// DEFECT-RATE MEASUREMENT — the number the economics rest on. Everything so far is n=1.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// Generates the SAME one-shot colour sheet config N times (the validated Kwisheen+FirstFavored sheet:
// solo anchors, assignment clause, style, emotion cues, underwater). Measures GEOMETRY deterministically
// (grid clean? gutter centred?) and SAVES every sheet + quadrant for eye-judging of QUALITY defects —
// because the verifier has been wrong four times this session and cannot be trusted for the quality call.
//
// The decision this feeds: retry budget tolerates ~2 of 4 quadrants regenerated (7.4c) before breaking
// the 7-8c ceiling. So the question is: across N sheets, what fraction of quadrants carry a HARD defect
// (wrong species, cross-contamination, extra limbs, cloning, text, fused fish-tail)? If <25%, one-shot
// sits comfortably in budget; if >50%, it doesn't.
//
// PAID — N images @ 4K. Default N=6 (~$0.90). RUN=1.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');

const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/defect_rate';
const N = Number(process.env.N || 6);
const SIZE = process.env.SIZE || '4K';
const RUN = process.env.RUN === '1';

const CAST = [
  { name: 'Vael', species: 'Kwisheen',      gender: 'male',   position: 'left' },
  { name: 'Kesh', species: 'First Favored', gender: 'female', position: 'right' }
];
const BEATS = [
  'Kesh rounds on Vael in fury — jaw set, brows down, teeth bared, one hand thrown out. MEDIUM CLOSE.',
  'Vael recoils in terror — eyes wide with whites showing, mouth open, one arm flung up to shield his head. MEDIUM.',
  'The two close together, both worried: inner brows raised and drawn together, foreheads pinched, lips thin. MEDIUM CLOSE two-shot.',
  'Both laughing, unguarded: Kesh head back, eyes crinkled shut; Vael grinning, eyes creased. MEDIUM CLOSE two-shot.'
];

(async () => {
  console.log('─'.repeat(72));
  console.log('DEFECT-RATE MEASUREMENT — ' + N + ' generations of the validated one-shot config');
  console.log('  ESTIMATED : ~$' + (N * (SIZE === '4K' ? 0.151 : 0.067)).toFixed(2));
  console.log('  output    : ' + OUT);
  console.log('─'.repeat(72));
  if (!RUN) { console.log('DRY RUN — RUN=1 to spend.\n'); process.exit(0); }
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._stageACanonRefs === 'function'
    && typeof window._loadStyleRefBase64 === 'function' && typeof window._emotionAnatomy === 'function', { timeout: 40000 });

  const rows = [];
  for (let n = 0; n < N; n++) {
    process.stdout.write(`  sheet ${n + 1}/${N} … `);
    const t0 = Date.now();
    const res = await page.evaluate(async ({ CAST, BEATS, SIZE }) => {
      const s = window.state; s._playerSpecies = 'First Favored'; s._liSpecies = 'Kwisheen';
      window._stageARefs = true;
      const refs = await window._stageACanonRefs(CAST, BEATS.join(' '));
      let style = null; try { const st = window.RENDER_STYLE_SYSTEM.ender_bond;
        const gm = st.structured_anchors.anchors.find(a => a.role === 'golden_master');
        if (gm) { const b = await window._loadStyleRefBase64(gm.file); if (b) style = String(b).replace(/^data:image\/[^;]+;base64,/, ''); } } catch (_) {}
      const R = refs.map(r => ({ b64: r.b64, label: r.label }));
      if (style) R.push({ b64: style, label: 'STYLE AUTHORITY — Ender Bond rendering ONLY.' });
      const prompt =
        'A SINGLE FINISHED COLOUR ILLUSTRATION in a 2x2 GRID of four equal panels, clean straight gutters, one vertical + one horizontal at the exact centre. Four equal quadrants; no figure crosses a gutter. Reading order TL, TR, BL, BR:\n' +
        BEATS.map((b, i) => 'QUADRANT ' + (i + 1) + ': ' + b).join('\n') +
        '\nONE Kesh and ONE Vael across all panels, identical colouring. Vael is a male Kwisheen (six-tentacle lower body, bare chest + pauldron); Kesh is a female First Favored (human legs, luminous Weave-Script skin, gossamer drape). Underwater, silt-lit. Ender Bond ink. No lettering.';
      const r = await fetch(window._IMAGE_PROXY_URL || '/api/image', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider: 'gemini', model: 'gemini-3.1-flash-image-preview', imageSize: SIZE, aspect_ratio: '1:1', imageIntent: 'scene', textFirst: true, n: 1, reference_images_b64: R }) });
      if (!r.ok) return { err: 'HTTP ' + r.status };
      const d = await r.json(); const u = d.image || d.url;
      if (!u) return { err: 'no image' };
      const url = u.startsWith('data:') ? u : 'data:image/png;base64,' + u;
      // deterministic geometry
      const im = new Image(); await new Promise(rr => { im.onload = rr; im.src = url; });
      const W = 900, H = Math.round(W * im.height / im.width);
      const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(im, 0, 0, W, H);
      const dd = c.getContext('2d').getImageData(0, 0, W, H).data;
      const lum = (x, y) => { const p = (y * W + x) * 4; return 0.299 * dd[p] + 0.587 * dd[p + 1] + 0.114 * dd[p + 2]; };
      const uni = (isCol, i, len) => { let e = 0; for (let k = 0; k < len; k++) { const l = isCol ? lum(i, k) : lum(k, i); if (l > 232 || l < 28) e++; } return e / len; };
      const scan = (isCol, nn, len) => { const o = []; let cur = null; for (let i = 0; i < nn; i++) { if (uni(isCol, i, len) >= 0.82) { cur ? cur.end = i : cur = { start: i, end: i }; } else if (cur) { o.push(cur); cur = null; } } if (cur) o.push(cur); return o.filter(r => r.start > nn * 0.10 && r.end < nn * 0.90); };
      const v = scan(true, W, H).sort((a, b) => (b.end - b.start) - (a.end - a.start))[0] || null;
      const h = scan(false, H, W).sort((a, b) => (b.end - b.start) - (a.end - a.start))[0] || null;
      const vP = v ? ((v.start + v.end) / 2) / W * 100 : null, hP = h ? ((h.start + h.end) / 2) / H * 100 : null;
      const centred = vP != null && hP != null && Math.abs(vP - 50) <= 7 && Math.abs(hP - 50) <= 7;
      return { url, width: im.width, height: im.height, vP: vP && +vP.toFixed(1), hP: hP && +hP.toFixed(1), gridClean: !!centred };
    }, { CAST, BEATS, SIZE });

    if (res.err) { console.log('FAILED — ' + res.err); rows.push({ n: n + 1, err: res.err }); continue; }
    fs.writeFileSync(path.join(OUT, `sheet${n + 1}.png`), Buffer.from(res.url.split(',')[1], 'base64'));
    rows.push({ n: n + 1, gridClean: res.gridClean, vP: res.vP, hP: res.hP, secs: +((Date.now() - t0) / 1000).toFixed(0) });
    console.log(`${res.width}x${res.height} grid=${res.gridClean ? 'CLEAN' : 'irregular'} v@${res.vP}% h@${res.hP}% (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }

  const ok = rows.filter(r => !r.err);
  const clean = ok.filter(r => r.gridClean).length;
  console.log('\n' + '═'.repeat(72));
  console.log('GEOMETRY (deterministic):');
  console.log(`  grid clean+centred: ${clean}/${ok.length}`);
  console.log(`  gutter positions  : ${ok.map(r => 'v' + r.vP + '/h' + r.hP).join('  ')}`);
  console.log('\nQUALITY defects — judge by EYE from the saved sheets (verifier not trusted).');
  console.log('  Per sheet, count quadrants with a HARD defect: wrong-species, cross-contamination,');
  console.log('  extra/missing limbs, cloning, lettering, fused fish-tail, wrong gender.');
  console.log(`  Saved ${ok.length} sheets → ${OUT}`);
  fs.writeFileSync(path.join(OUT, 'geometry.json'), JSON.stringify(rows, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
