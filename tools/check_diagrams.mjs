// Check that every Mermaid diagram on the site is readable.
//
// Usage: npm run build && npm run check:diagrams
//        node tools/check_diagrams.mjs [--url https://host/base/] [--chromium /path/to/chrome] [--json out.json]
//
// Renders each page with a diagram at 1440px and 390px wide, in the light and dark themes, and
// reads the rendered SVG. It reports, per diagram:
//   overlap   two text boxes intersect
//   overflow  a label is larger than its node, note or cluster
//   line      an edge or lifeline crosses a label that is not its own, or an edge label has a
//             translucent background with a line behind it
//   clip      text falls outside the SVG
//   break     a word split by a hyphen when a label wraps
//   size      text renders under 12px at 1440px, or contrast is under 4.5:1
// Exit status 1 when any failure is found. The check needs `dist/` from `npm run build` and a
// Chrome or Chromium browser: Google Chrome is used by default; set CHROMIUM or pass --chromium
// to use another binary.
import { createServer } from 'node:http';
import { readdirSync, readFileSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const DIST = resolve('dist');
const BASE_PATH = '/bof3-wiki/';
const MIN_FONT = 12;
const MIN_CONTRAST = 4.5;
const VIEWS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
];
const THEMES = ['light', 'dark'];

const pagesWithDiagrams = () => {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'index.html' && readFileSync(p, 'utf8').includes('class="mermaid"')) {
        out.push(p.slice(DIST.length + 1).replace(/index\.html$/, ''));
      }
    }
  };
  walk(DIST);
  return out.sort();
};

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const serve = () =>
  new Promise((ok) => {
    const server = createServer((req, res) => {
      let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (!path.startsWith(BASE_PATH)) path = '/404';
      let file = normalize(join(DIST, path.slice(BASE_PATH.length)));
      if (!file.startsWith(DIST)) file = DIST;
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
      if (!existsSync(file)) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => ok(server));
  });

// Runs in the page. Returns a list of { kind, detail } failures for one diagram frame.
function inspect({ index, minFont, minContrast, inline }) {
  const frame = document.querySelectorAll('pre.mermaid')[index];
  const svg = frame.querySelector('svg');
  const fails = [];
  const fail = (kind, detail) => fails.push({ kind, detail });
  const svgBox = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const scale = vb && vb.width ? svgBox.width / vb.width : 1;

  // ---- text boxes: one per <text> element or HTML label ----
  const ids = new Map();
  const gid = (e) => ids.get(e) ?? (ids.set(e, ids.size), ids.size - 1);
  const owners = new Map();
  const walker = document.createTreeWalker(svg, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement;
    // Autonumber badges sit on the arrow start by design (white text on a dark marker).
    if (el.closest('style, title, desc, defs, .sequenceNumber')) continue;
    // A wrapped SVG label is several <text> elements at one anchor: treat them as one box.
    const text = el.closest('text');
    const owner = text ? `${gid(text.parentElement)}|${text.getAttribute('class')}|${text.getAttribute('x')}|${text.getAttribute('y')}` : el.closest('foreignObject') || el;
    const r = document.createRange();
    r.selectNodeContents(n);
    for (const q of r.getClientRects()) {
      if (q.width < 0.5 || q.height < 0.5) continue;
      const o = owners.get(owner) || { el: text || owner, style: el, text: '', l: 1e9, t: 1e9, r: -1e9, b: -1e9 };
      o.text += n.nodeValue.trim() + ' ';
      o.l = Math.min(o.l, q.left);
      o.t = Math.min(o.t, q.top);
      o.r = Math.max(o.r, q.right);
      o.b = Math.max(o.b, q.bottom);
      owners.set(owner, o);
    }
  }
  const boxes = [...owners.values()].map((o) => {
    o.text = o.text.trim().replace(/\s+/g, ' ');
    o.broken = /[A-Za-z0-9_]- [A-Za-z0-9_(]/.test(o.text) && !!o.el.closest('text');
    o.text = o.text.slice(0, 40);
    o.edgeLabel = o.el.closest('.edgeLabel, .messageText') ? true : false;
    return o;
  });
  const short = (b) => `"${b.text}"`;

  // ---- break: a word split with a hyphen by label wrapping ----
  for (const b of boxes) if (b.broken) fail('break', short(b));

  // ---- overlap ----
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
      const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (w > 1 && h > 1) fail('overlap', `${short(a)} / ${short(b)}`);
    }
  }

  // ---- clip: text outside the SVG ----
  for (const b of boxes) {
    if (b.l < svgBox.left - 0.5 || b.r > svgBox.right + 0.5 || b.t < svgBox.top - 0.5 || b.b > svgBox.bottom + 0.5) {
      fail('clip', short(b));
    }
  }

  // ---- overflow: label larger than its shape ----
  const contains = (s, b, tol) => b.l >= s.left - tol && b.r <= s.right + tol && b.t >= s.top - tol && b.b <= s.bottom + tol;
  const shapeOf = (g) => g.querySelector(':scope > rect, :scope > polygon, :scope > path, :scope > circle, :scope > ellipse, :scope > g > rect, :scope > g > polygon, :scope > g > path, :scope > g > circle, :scope > g > ellipse');
  for (const b of boxes) {
    const g = b.el.closest('g.node, g.cluster, g.statediagram-state, g.statediagram-cluster');
    if (g) {
      const shape = shapeOf(g);
      if (shape && !contains(shape.getBoundingClientRect(), b, 1.5)) fail('overflow', short(b));
      continue;
    }
    const t = b.el.closest('text');
    if (t && /noteText|actor/.test(t.getAttribute('class') || '')) {
      // sequence note or actor: the closest rect that holds the text centre
      const cx = (b.l + b.r) / 2;
      const cy = (b.t + b.b) / 2;
      let best = null;
      for (const rc of svg.querySelectorAll('rect.note, rect.actor')) {
        const q = rc.getBoundingClientRect();
        if (cx >= q.left && cx <= q.right && cy >= q.top && cy <= q.bottom && (!best || q.width * q.height < best.width * best.height)) best = q;
      }
      if (best && !contains(best, b, 1.5)) fail('overflow', short(b));
    }
  }

  // ---- line over a label ----
  const pt = svg.createSVGPoint();
  const lines = [...svg.querySelectorAll('path.flowchart-link, path.transition, path.relation, path[class*="edge-pattern"], line.messageLine0, line.messageLine1, path.messageLine0, path.messageLine1, line[class*="actor-line"], line.loopLine')];
  const labelOwning = (path) => {
    const id = path.getAttribute('data-id') || path.id;
    if (!id) return null;
    const lab = svg.querySelector(`.edgeLabel [data-id="${CSS.escape(id)}"], .edgeLabel[data-id="${CSS.escape(id)}"]`);
    return lab ? lab.closest('.edgeLabel') : null;
  };
  const seen = new Set();
  for (const p of lines) {
    const isLife = /actor-line|loopLine/.test(p.getAttribute('class') || '');
    const own = labelOwning(p);
    const m = p.getScreenCTM();
    const len = p.getTotalLength();
    const step = 3;
    for (let d = 0; d <= len; d += step) {
      const q = p.getPointAtLength(d);
      pt.x = q.x;
      pt.y = q.y;
      const s = pt.matrixTransform(m);
      for (const b of boxes) {
        if (isLife && /actor-line/.test(p.getAttribute('class') || '') && !b.el.closest('.messageText')) continue;
        // A message with a wide halo stroke hides a lifeline behind it.
        if (isLife && b.el.tagName === 'text' && getComputedStyle(b.el).paintOrder.startsWith('stroke') && parseFloat(getComputedStyle(b.el).strokeWidth) >= 4) continue;
        if (s.x > b.l + 1 && s.x < b.r - 1 && s.y > b.t + 1 && s.y < b.b - 1) {
          const isOwn = own && own.contains(b.el);
          let key = (p.getAttribute('data-id') || p.id || p.getAttribute('class')) + '|' + b.text;
          if (isOwn) {
            // own label: the label background must hide the line
            const lab = own.querySelector('.labelBkg, rect, span, div') ;
            const bg = [own, own.querySelector('.labelBkg'), own.querySelector('span'), own.querySelector('div')]
              .filter(Boolean)
              .map((e) => getComputedStyle(e).backgroundColor)
              .find((c) => c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent');
            const alpha = bg ? (bg.match(/rgba\(.*,\s*([\d.]+)\)/) || [0, 1])[1] : 0;
            if (!bg || +alpha < 0.95) {
              if (!seen.has('bg' + key)) {
                seen.add('bg' + key);
                fail('line', `edge label ${short(b)} has a translucent background`);
              }
            }
            void lab;
          } else if (!seen.has(key)) {
            seen.add(key);
            fail('line', `${isLife ? ((p.getAttribute('class') || '').includes('loopLine') ? 'frame' : 'lifeline') : 'edge'} crosses ${short(b)}`);
          }
        }
      }
    }
  }

  // ---- size and contrast ----
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const v = m[1].split(/[ ,/]+/).map(Number);
    return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 };
  };
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const solidBg = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) return c.a >= 1 ? c : over(c, solidBg(e.parentElement) || { r: 255, g: 255, b: 255, a: 1 });
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const frameBg = solidBg(frame);
  for (const b of boxes) {
    const cs = getComputedStyle(b.style);
    const px = parseFloat(cs.fontSize) * scale;
    if (inline && px < minFont - 0.05) fail('size', `${short(b)} ${px.toFixed(1)}px`);
    // colour of the text and what is under its centre
    const isSvgText = !!b.style.closest('text');
    const fg0 = parse(isSvgText ? cs.fill : cs.color);
    if (!fg0) continue;
    const cx = (b.l + b.r) / 2;
    const cy = (b.t + b.b) / 2;
    let bg = frameBg;
    const stack = document.elementsFromPoint(cx, cy);
    for (const e of stack) {
      if (e === frame || !svg.contains(e)) break;
      if (e.closest('foreignObject')) {
        const hb = parse(getComputedStyle(e).backgroundColor);
        if (hb && hb.a > 0) {
          bg = over(hb, bg);
          break;
        }
        continue;
      }
      if (/^(rect|polygon|path|circle|ellipse)$/i.test(e.tagName)) {
        const f = getComputedStyle(e);
        const fc = parse(f.fill);
        if (fc && fc.a > 0 && f.fill !== 'none') {
          bg = over({ ...fc, a: fc.a * (+f.fillOpacity || 1) * (+f.opacity || 1) }, bg);
          break;
        }
      }
    }
    const fg = fg0.a < 1 ? over(fg0, bg) : fg0;
    const l1 = lum(fg);
    const l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    if (ratio < minContrast) fail('contrast', `${short(b)} ${ratio.toFixed(2)}:1`);
  }
  return fails;
}

const server = opt('--url') ? null : await serve();
const root = opt('--url') || `http://127.0.0.1:${server.address().port}${BASE_PATH}`;
const exe = opt('--chromium') || process.env.CHROMIUM || undefined;
const browser = await chromium.launch(exe ? { executablePath: exe, args: ['--no-sandbox'] } : { channel: 'chrome', args: ['--no-sandbox'] });
const pages = pagesWithDiagrams();
const report = [];
const counts = {};
for (const view of VIEWS) {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height } });
    await ctx.addInitScript((t) => {
      try {
        localStorage.setItem('starlight-theme', t);
      } catch {}
    }, theme);
    const page = await ctx.newPage();
    for (const path of pages) {
      await page.goto(root + path, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const n = await page.locator('pre.mermaid').count();
      // Wait until the page script has sized every diagram; a diagram measured before that shows at column width.
      await page.waitForFunction(
        (n) => [...document.querySelectorAll('pre.mermaid[data-processed] svg')].filter((s) => s.dataset.sized).length >= n,
        n,
        { timeout: 30000 },
      );
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      for (let i = 0; i < n; i++) {
        const fails = await page.evaluate(inspect, { index: i, minFont: MIN_FONT, minContrast: MIN_CONTRAST, inline: view.width >= 1000 });
        for (const f of fails) {
          const k = f.kind;
          counts[k] = (counts[k] || 0) + 1;
          report.push({ page: path, diagram: i + 1, view: view.name, theme, ...f });
        }
      }
    }
    await ctx.close();
  }
}
await browser.close();
server?.close();

// Collapse identical failures across views and themes.
const merged = new Map();
for (const r of report) {
  const key = `${r.page} #${r.diagram} ${r.kind} ${r.detail.replace(/ [\d.]+(px|:1)$/, '')}`;
  const m = merged.get(key) || { ...r, where: [] };
  m.where.push(`${r.view}/${r.theme}`);
  merged.set(key, m);
}
for (const m of merged.values()) console.log(`${m.page} #${m.diagram} ${m.kind}: ${m.detail} [${m.where.join(' ')}]`);
const byKind = Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' ') || 'none';
console.log(`\n${pages.length} pages, ${merged.size} distinct failures, ${report.length} raw (${byKind})`);
if (opt('--json')) writeFileSync(opt('--json'), JSON.stringify({ counts, report }, null, 1));
process.exit(report.length ? 1 : 0);
