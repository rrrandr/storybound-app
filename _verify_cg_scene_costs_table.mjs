// Guard (cost visibility): window._cgSceneCosts() renders a per-scene Scene | Author | Text $ | Images $
// | Total table for the current story from state._sceneCostsThisStory + the per-scene CG author, so
// author-route and image-heavy cost patterns are legible at a glance. Depends on: the finalize push now
// stamping `author`, and the delayed image-charge keeping the entry's image/total current.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) The function exists and returns { rows, summary }.
A(src.includes('window._cgSceneCosts = function ()'), '_cgSceneCosts() not defined');
const fnStart = src.indexOf('window._cgSceneCosts = function ()');
const fn = fnStart >= 0 ? src.slice(fnStart, fnStart + 4200) : '';
A(fn.includes('return { rows: rows, summary: summary };'), '_cgSceneCosts does not return rows + summary');

// (2) Per-scene rows carry Author + overhead-multiplied text/image + total.
A(fn.includes('author:    e.author || e.type'), 'author column missing from rows');
A(fn.includes('text_usd:  +(((e.text || 0) * mult))') && fn.includes('image_usd: +(((e.image || 0) * mult))'), 'text/image not overhead-multiplied to match totals');

// (3) Summary computes by_author + image_share_pct (the patterns this table exists to reveal).
A(fn.includes('by_author: byAuthor'), 'by_author breakdown missing');
A(fn.includes('image_share_pct: sum.total ? +(100 * sum.image / sum.total).toFixed(1) : null'), 'image_share_pct missing');

// (3b) NO CONFLATION: Grok/Mistral/DeepSeek author only TEXT — images are BFL/Gemini, a separate
//      pipeline. by_author must sum TEXT cost only; image cost is attributed to its actual provider.
A(fn.includes('x.text_usd = +(x.text_usd + r.text_usd)'), 'by_author still folds image cost in (must sum text only)');
A(!fn.includes('x.total_usd = +(x.total_usd + r.total_usd)'), 'by_author still aggregates total (conflates BFL image cost under the text author)');
A(fn.includes('by_image_provider: byImgProv'), 'by_image_provider (BFL/Gemini) breakdown missing');
A(src.includes('imageByProvider: (function ()'), 'finalize push does not capture image cost by provider');
A(src.includes('_last.imageByProvider[provider] = (_last.imageByProvider[provider] || 0) + c;'), 'delayed image-charge does not attribute to the image provider');

// (4) The finalize push stamps the per-scene author (CG-only, so literary/GN scenes are not mislabeled).
A(src.includes("author: (typeof _isCGRenderMode === 'function' && _isCGRenderMode() && window.state._lastCGAuthor) ? window.state._lastCGAuthor : null,"), 'finalize push does not stamp per-scene author');

// (5) The delayed image-charge keeps the last scene entry current (else CG async images undercount).
A(src.includes('const _last = _arr[_arr.length - 1];') && src.includes('_last.image = (_last.image || 0) + c;') && src.includes('_last.total = (_last.total || 0) + delta;'), 'delayed image-charge does not update the per-scene entry');

// (6) Reads the per-STORY array (resets at 74264), so the table scopes to the current story.
A(src.includes('Array.isArray(s._sceneCostsThisStory) ? s._sceneCostsThisStory : []'), '_cgSceneCosts does not read _sceneCostsThisStory');

if (fail) process.exit(1);
console.log('PASS: window._cgSceneCosts() renders per-scene Scene|Author|Text|Images|Total for the current story (author-stamped at finalize, async images kept current via delayed-charge), with by_author + image_share_pct summaries.');
