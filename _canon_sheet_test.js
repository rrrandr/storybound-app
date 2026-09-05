// ═══════════════════════════════════════════════════════════════════════════════════════════════
// CANON SHEET — the decisive product test. Everything at once, on one canvas.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// The ten reliability sheets proved the 2x2 GEOMETRY but every one ran references OFF, so none of
// them are canon anything — the "Kwisheen" in sheet 09 came out a generic grey alien. This asks the
// question that actually decides whether the primitive is usable for Storybound:
//
//   Can one 2x2 sheet carry TWO different non-human species, each conditioned by its own anatomy
//   reference, and produce four canonically correct, independently crop-ready panels?
//
// Two species is the harder case than the earlier matrix: there, one reference could bleed onto a
// human. Here two anatomy sheets share a canvas and can bleed into EACH OTHER. The per-reference
// assignment mapping exists for exactly this.
//
// Everything enabled together, deliberately (Roman: these are not independent variables — together
// they constitute "the species reference system exists"):
//   species anchors ON · per-reference assignment ON · coral-dreadlock canon · gendered attire
//   · presence-gated verifier · Fate-notation gate OFF (no wish in this scene)
//
// Plus: EMOTION. Every earlier sheet was blocking with blank faces. Four panels, four states —
// anger, fear, worry, joy — framed close enough for the face to carry them.
//
// PAID — 1 image at 4K (~$0.15). RUN=1 to spend.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');

const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/canon_sheet';
const RUN = process.env.RUN === '1';

const CAST = [
  { name: 'Vael', species: 'Kwisheen',      gender: 'male',   position: 'left' },
  { name: 'Kesh', species: 'First Favored', gender: 'female', position: 'right' }
];

// Emotion carried by FACE, so every beat is framed close enough to read one.
const BEATS = [
  // NB: the emotion word is NEVER a leading token. The first run began each beat with "ANGER —",
  // "WORRY —" etc, and the model lettered those words INTO the panels — a no-text violation caused by
  // the prompt's own formatting, not by the model ignoring the rule. Describe the face; never label it.
  'Kesh (First Favored, female) rounds on Vael in fury — jaw set, brows driven down, teeth bared, one hand ' +
    'thrown out in accusation. MEDIUM CLOSE, head and shoulders and the accusing hand. The rage must be ' +
    'unmistakable in the face itself, not implied by the pose.',
  'Vael (Kwisheen, male) recoils in terror from something off-frame — eyes stretched wide with the whites ' +
    'showing all round, mouth open, shoulders hunched, one arm flung up to shield his head. MEDIUM, upper ' +
    'body and the top of the tentacle mantle.',
  'The two of them close together and both anxious in different ways: Kesh stares off-frame, brow furrowed, ' +
    'lower lip caught between her teeth; Vael watches HER face, mouth tight, brows drawn together with ' +
    'concern for her. MEDIUM CLOSE two-shot, both faces clearly visible. Neither is angry — both are afraid ' +
    'FOR someone.',
  'Both laughing, genuinely and without guard: Kesh head tipped back, eyes crinkled shut, mouth wide open ' +
    'mid-laugh; Vael grinning broadly, eyes creased to slits. MEDIUM CLOSE two-shot. Real delight, not a ' +
    'polite smile.'
];

function prompt() {
  return 'A SINGLE IMAGE divided into a 2 x 2 GRID of exactly FOUR equal rectangular panels of identical size, ' +
    'separated by clean straight gutters — one vertical gutter down the exact centre and one horizontal gutter ' +
    'across the exact centre. Do NOT vary the panel sizes. Do NOT make a decorative comic page layout. Four ' +
    'equal quadrants only.\n' +
    'Each quadrant is a SEPARATE moment. Do NOT let any figure cross a gutter into another quadrant, and do NOT ' +
    'blend the quadrants into one continuous picture. Draw them in reading order — top-left, top-right, ' +
    'bottom-left, bottom-right:\n' +
    BEATS.map(function (b, i) { return 'QUADRANT ' + (i + 1) + ': ' + b; }).join('\n') +
    '\n\nEMOTION IS THE POINT OF THIS PAGE. Faces must carry real, legible feeling — brows, eyes, mouth, jaw. ' +
    'A blank or neutral face is a FAILURE in every quadrant. These are people feeling something, not mannequins ' +
    'demonstrating a pose.\n' +
    'The two characters recur and must stay recognisably the SAME person in every quadrant: Vael (male Kwisheen) ' +
    'and Kesh (female First Favored). Same build, same wardrobe, same features throughout.\n' +
    'Underwater in the drowned coral ruins of Gloamwater Bay, silt-lit. Do NOT draw panel numbers, captions, or ' +
    'any lettering.';
}

(async () => {
  console.log('─'.repeat(74));
  console.log('CANON SHEET — 2x2, two non-human species, references ON, emotion required');
  console.log('─'.repeat(74));
  console.log('  cast      : ' + CAST.map(c => c.name + ' (' + c.species + ', ' + c.gender + ')').join(' · '));
  console.log('  emotions  : anger · fear · worry · joy');
  console.log('  ESTIMATED : ~$0.15 (1 image @ 4K)');
  console.log('  output    : ' + OUT);
  console.log('─'.repeat(74));
  if (!RUN) { console.log('DRY RUN — no API calls. Re-run with RUN=1 to spend.\n'); process.exit(0); }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  page.on('console', m => { const t = m.text(); if (/STAGE-A-REFS|ASSET-INTEGRITY|imageConfig/i.test(t)) console.error('   >', t.slice(0, 170)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._genStructuralLineArt === 'function'
    && typeof window._stageACanonRefs === 'function' && typeof window._verifyReferenceAssets === 'function', { timeout: 40000 });

  const assets = await page.evaluate(async () => await window._verifyReferenceAssets(['kwisheen', 'first_favored']));
  console.log(`\nASSET INTEGRITY: ${assets.ok ? 'OK' : 'FAILED'} — ${assets.checked} checked, ${assets.missing.length} missing`);
  if (!assets.ok) { assets.missing.forEach(m => console.error(`  MISSING ${m.species} slot ${m.slot}: ${m.path}`));
    console.error('ABORTED before spending.'); await browser.close(); process.exit(1); }

  console.log('\nGenerating…');
  const t0 = Date.now();
  const out = await page.evaluate(async ({ p, CAST }) => {
    const s = window.state;
    s._playerSpecies = 'First Favored'; s._liSpecies = 'Kwisheen';
    window._stageARefs = true;
    window._structuralLineArtLog = [];
    const refs = await window._stageACanonRefs(CAST, p);
    const url = await window._genStructuralLineArt(p, null, {
      refs: refs, cast: CAST, assignment: true, fateNotation: false,
      imageSize: '4K', aspectRatio: '1:1'
    });
    const req = (window._structuralLineArtLog || [])[0] || {};
    return { url, refs: refs.map(r => ({ label: r.label, src: r.src, governs: r.governs })),
             hasAssignment: /REFERENCE ASSIGNMENT/.test(req.prompt || ''),
             assignmentText: (req.prompt || '').split('REFERENCE ASSIGNMENT')[1] || '',
             fateInvited: /may appear|approved visual notation/.test(req.prompt || ''),
             promptChars: (req.prompt || '').length };
  }, { p: prompt(), CAST });

  if (!out.url) { console.error('FAILED — no image returned.'); await browser.close(); process.exit(1); }
  const buf = Buffer.from(out.url.split(',')[1], 'base64');
  fs.writeFileSync(path.join(OUT, 'canon_sheet.png'), buf);
  fs.writeFileSync(path.join(OUT, 'request.json'), JSON.stringify(out, { url: undefined }, 2));

  console.log(`  done in ${((Date.now()-t0)/1000).toFixed(0)}s`);
  console.log(`\n  references attached : ${out.refs.length}`);
  out.refs.forEach(r => console.log(`    • ${r.governs || '?'} → ${r.src}`));
  console.log(`  assignment clause   : ${out.hasAssignment ? 'PRESENT' : 'ABSENT (bug — two species should map)'}`);
  if (out.hasAssignment) console.log(`      ${out.assignmentText.slice(0, 260).replace(/\s+/g,' ').trim()}…`);
  console.log(`  fate notation invited: ${out.fateInvited ? 'YES (gate leaked)' : 'no (gated off)'}`);
  console.log(`  prompt size         : ${out.promptChars} chars`);

  // Deterministic gutter check + quadrant split.
  const geo = await page.evaluate(async ({ url }) => {
    const im = new Image(); await new Promise(r => { im.onload = r; im.src = url; });
    const W = 900, H = Math.round(W * im.height / im.width);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').drawImage(im, 0, 0, W, H);
    const d = c.getContext('2d').getImageData(0, 0, W, H).data;
    const dark = (isCol, i, from, to) => { let n = 0, t = 0;
      for (let k = from; k < to; k++) { const x = isCol ? i : k, y = isCol ? k : i, p = (y*W+x)*4;
        if (0.299*d[p]+0.587*d[p+1]+0.114*d[p+2] < 170) n++; t++; } return t ? n/t : 0; };
    const rules = (isCol, len, from, to) => { const o = []; let cur = null;
      for (let i = 0; i < len; i++) { if (dark(isCol, i, from, to) >= 0.60) { cur ? cur.end = i : cur = {start:i,end:i}; }
        else if (cur) { o.push(cur); cur = null; } } if (cur) o.push(cur); return o; };
    const pick = (rs, span) => rs.filter(r => r.start > span*0.10 && r.end < span*0.90)
      .sort((a,b) => (b.end-b.start)-(a.end-a.start))[0] || null;
    const v = pick(rules(true, W, 0, H), W), h = pick(rules(false, H, 0, W), H);
    return { width: im.width, height: im.height,
      vPct: v ? +((((v.start+v.end)/2)/W)*100).toFixed(1) : null,
      hPct: h ? +((((h.start+h.end)/2)/H)*100).toFixed(1) : null };
  }, { url: out.url });
  console.log(`\n  image     : ${geo.width}x${geo.height}`);
  console.log(`  gutters   : v@${geo.vPct ?? '—'}%  h@${geo.hPct ?? '—'}%`);

  if (geo.vPct && geo.hPct) {
    const qs = await page.evaluate(async ({ url, vPct, hPct }) => {
      const im = new Image(); await new Promise(r => { im.onload = r; im.src = url; });
      const cut = (sx,sy,sw,sh) => { const c = document.createElement('canvas'); c.width=sw; c.height=sh;
        c.getContext('2d').drawImage(im,sx,sy,sw,sh,0,0,sw,sh); return c.toDataURL('image/png'); };
      const vx = Math.round(im.width*vPct/100), hy = Math.round(im.height*hPct/100);
      return [cut(0,0,vx,hy), cut(vx,0,im.width-vx,hy), cut(0,hy,vx,im.height-hy), cut(vx,hy,im.width-vx,im.height-hy)];
    }, { url: out.url, vPct: geo.vPct, hPct: geo.hPct });
    const names = ['q1_anger','q2_fear','q3_worry','q4_joy'];
    qs.forEach((q,i) => fs.writeFileSync(path.join(OUT, names[i]+'.png'), Buffer.from(q.split(',')[1],'base64')));
    console.log(`  quadrants : split into ${names.join(', ')}`);
  }
  console.log(`\nSaved → ${OUT}\n`);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
