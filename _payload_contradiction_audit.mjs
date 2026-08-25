// FREE CONTRADICTION AUDIT — searches the COMPLETE captured Grok payload (system + user) for
// every instruction that could have caused each observed contradiction, and ranks them by
// authority proxies: channel (system/user), absolute position, % depth, and imperative marking.
//
// usage: node _payload_contradiction_audit.mjs <queryKey>
import fs from 'fs';

const A = JSON.parse(fs.readFileSync('_paid_scene1_compliance/03_grok_request.json', 'utf8'));
const SYS = A.system || '', USR = A.user || '';

const QUERIES = {
  setting: [/gallery hallway/gi, /Veilwood/gi, /clearing/gi, /spiralgrass/gi,
            /opening[_ ]setting/gi, /SCENE ENVIRONMENT ANCHOR/gi, /\bsetting\b[^\n]{0,80}/gi,
            /where the scene (takes place|happens|opens)/gi, /relocat/gi],
  julian:  [/OFFSTAGE_REFERENCED/g, /OFFSTAGE/g, /ON_PHONE/g, /IN_PERSON/g,
            /STAGED CHARACTERS/g, /Julian/g],
  seren:   [/Seren/g, /mentor/gi, /ward\b/gi, /First Sacrifice/gi, /sacrificiant/gi],
  firstmention: [/FIRST mention/gi, /first_mention/gi, /MAX-ONE-NAME/gi, /max one name/gi,
                 /first[- ]person/gi, /\bLirael\b/g, /name the (protagonist|POV|narrator)/gi,
                 /never name/gi, /unnamed/gi],
  eplus:   [/ENVIRONMENT\+/g, /environment_plus/g, /axis of damage/gi],
  cplus:   [/CHARACTER\+/g, /character_plus/g],
};

const key = process.argv[2];
if (!QUERIES[key]) { console.log('keys: ' + Object.keys(QUERIES).join(', ')); process.exit(1); }

const IMPERATIVE = /\b(HARD|MUST|NEVER|ALWAYS|REQUIRED|MANDATORY|DO NOT|FORBIDDEN|RULE|LAW)\b/;

function scan(hay, label) {
  const out = [];
  for (const re of QUERIES[key]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(hay)) !== null) {
      const s = Math.max(0, m.index - 160), e = Math.min(hay.length, m.index + m[0].length + 160);
      const ctx = hay.slice(s, e).replace(/\s+/g, ' ');
      out.push({ label, pat: re.source.slice(0, 28), idx: m.index,
                 pct: ((m.index / hay.length) * 100).toFixed(1), match: m[0].slice(0, 40),
                 imp: IMPERATIVE.test(ctx), ctx });
      if (!re.global) break;
    }
  }
  return out;
}

const hits = [...scan(SYS, 'SYS'), ...scan(USR, 'USR')];
// Dedupe overlapping context windows so one instruction is not reported many times.
const seen = new Set();
const uniq = hits.filter(h => { const k = h.label + '|' + Math.floor(h.idx / 220); if (seen.has(k)) return false; seen.add(k); return true; });
uniq.sort((a, b) => (a.label === b.label ? a.idx - b.idx : a.label < b.label ? -1 : 1));

console.log(`\n══ ${key.toUpperCase()} — ${uniq.length} distinct sites (SYS ${SYS.length}c · USR ${USR.length}c)\n`);
for (const h of uniq) {
  console.log(`[${h.label} @${h.idx} ${h.pct}%]${h.imp ? ' ⚑IMPERATIVE' : ''} "${h.match}"`);
  console.log(`   …${h.ctx}…\n`);
}
