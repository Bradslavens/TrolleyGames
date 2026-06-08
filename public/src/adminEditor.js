// adminEditor.js
//
// Admin-only tool to adjust the position of signals, stations and crossings on
// a schematic. Loads a schematic JSON, lets you drag or numerically edit the
// movable objects (vertical = milepost position; for signals, left/right =
// which track), previews live, and exports the updated JSON to download. The
// JSON stays the single source of truth — drop the exported file back into
// public/src/data/schematics/ and re-run `npm run gen:schematics`.

import { palette, injectNavButtons } from './shared.js';
import { schematicRegistry } from './data/schematicRegistry.js';
import { layoutSchematic, RENDER_DEFAULTS } from './games/schematicRenderer.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MOVABLE = new Set(['signal', 'station', 'crossing']);

// Distinct schematic files referenced by the registry.
function schematicFiles() {
  return [...new Set(Object.values(schematicRegistry).filter(Boolean).map((e) => e.file))];
}

function el(name, attrs = {}, parent) {
  const n = document.createElementNS(SVG_NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function startSchematicEditor(onExit) {
  const app = document.getElementById('app');
  app.innerHTML = '';
  injectNavButtons(() => window.location.reload());
  const pal = palette();

  const wrap = document.createElement('div');
  wrap.className = 'admin-editor';
  wrap.innerHTML = `
    <h2>Schematic editor <span class="admin-badge">admin</span></h2>
    <div class="admin-controls">
      <label>Schematic:
        <select id="ae-file"></select>
      </label>
      <button id="ae-export" class="tg-btn" disabled>⬇ Export JSON</button>
      <button id="ae-back" class="tg-btn">← Back</button>
    </div>
    <p class="admin-hint">Click a <b>signal</b>, <b>station</b> or <b>crossing</b> to select it, then drag it
      (up/down = milepost; signals snap to the nearer track) or use the fields below.</p>
    <div class="admin-stage">
      <div id="ae-svgwrap"></div>
      <div id="ae-panel" class="admin-panel"></div>
    </div>`;
  app.appendChild(wrap);

  const fileSel = wrap.querySelector('#ae-file');
  for (const f of schematicFiles()) {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    fileSel.appendChild(opt);
  }
  const exportBtn = wrap.querySelector('#ae-export');
  wrap.querySelector('#ae-back').onclick = () => (onExit ? onExit() : window.location.reload());
  const svgWrap = wrap.querySelector('#ae-svgwrap');
  const panel = wrap.querySelector('#ae-panel');

  let schematic = null;     // working copy (mutated in place)
  let currentFile = null;
  let selectedIndex = -1;
  let dragIndex = -1;
  let lastLayout = null;

  async function loadFile(file) {
    const res = await fetch(`/src/data/schematics/${file}.json`);
    schematic = await res.json();
    currentFile = file;
    selectedIndex = -1;
    exportBtn.disabled = false;
    redraw();
    renderPanel();
  }

  // Convert a pointer event to schematic (viewBox) coordinates.
  function toLocal(svg, evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  const yToPos = (y) => lastLayout.meta.maxPos - (y - lastLayout.meta.pad) / lastLayout.meta.pxPerMile;
  const trackFromX = (x) => (Math.abs(x - RENDER_DEFAULTS.xR) < Math.abs(x - RENDER_DEFAULTS.xL) ? 'R' : 'L');

  function redraw() {
    const L = layoutSchematic(schematic);
    lastLayout = L;
    svgWrap.innerHTML = '';
    const svg = el('svg', { viewBox: L.viewBox.join(' '), width: '420' }, svgWrap);
    svg.style.maxWidth = '90vw';
    svg.style.height = 'auto';
    svg.style.touchAction = 'none';

    const text = (x, y, s, anchor, size, fill, italic) => {
      const t = el('text', { x, y, 'text-anchor': anchor, 'dominant-baseline': 'central', 'font-family': pal.font, 'font-size': size, 'font-weight': 700, fill }, svg);
      if (italic) t.setAttribute('font-style', 'italic');
      t.textContent = s;
      return t;
    };

    // tracks
    [L.xL, L.xR].forEach((x) => el('line', { x1: x, y1: L.trackTop, x2: x, y2: L.trackBottom, stroke: pal.outline, 'stroke-width': 8, 'stroke-linecap': 'round' }, svg));
    // crossovers (context)
    L.crossovers.forEach((c) => el('line', { x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2, stroke: pal.outline, 'stroke-width': 5, 'stroke-linecap': 'round' }, svg));
    // reference streets (context)
    L.referenceStreets.forEach((c) => {
      el('line', { x1: 150, y1: c.y, x2: L.xL - 14, y2: c.y, stroke: pal.ref, 'stroke-width': 2.5, 'stroke-dasharray': '5 4' }, svg);
      el('line', { x1: L.xR + 14, y1: c.y, x2: 360, y2: c.y, stroke: pal.ref, 'stroke-width': 2.5, 'stroke-dasharray': '5 4' }, svg);
      text(146, c.y, c.name, 'end', 10, pal.ref, true);
    });
    // mileposts (context)
    L.mileposts.forEach((m) => {
      const mx = 392;
      el('polygon', { points: `${mx - 15},${m.y - 12} ${mx + 15},${m.y - 12} ${mx + 15},${m.y + 4} ${mx},${m.y + 15} ${mx - 15},${m.y + 4}`, fill: pal.gold, stroke: pal.outline, 'stroke-width': 2 }, svg);
      text(mx, m.y - 4, m.label, 'middle', 12, pal.ink);
    });
    // markers (context)
    L.markers.forEach((m) => {
      const mx = m.track === 'L' ? L.xL - 36 : L.xR + 36;
      el('rect', { x: mx - 12, y: m.y - 10, width: 24, height: 20, rx: 3, fill: pal.cream2, stroke: pal.outline, 'stroke-width': 2 }, svg);
      text(mx, m.y, m.label, 'middle', 11, pal.ink);
    });

    // --- movable elements, tagged with their index in schematic.elements ---
    // We re-derive index by matching label/name+type since layout drops it; to
    // be safe, walk elements and place each movable one using the layout result.
    const layoutByKey = new Map();
    L.crossings.forEach((c) => layoutByKey.set(`crossing|${c.name}`, c));
    L.stations.forEach((s) => layoutByKey.set(`station|${s.name}`, s));
    L.signals.forEach((s) => layoutByKey.set(`signal|${s.label}`, s));

    schematic.elements.forEach((e, index) => {
      if (!MOVABLE.has(e.type)) return;
      const selected = index === selectedIndex;
      if (e.type === 'crossing') {
        const c = layoutByKey.get(`crossing|${e.name}`);
        const g = el('g', {}, svg);
        el('line', { x1: 150, y1: c.y, x2: 360, y2: c.y, stroke: selected ? pal.gold : pal.outline, 'stroke-width': selected ? 5 : 3 }, g);
        text(146, c.y, c.name, 'end', 11, pal.ink);
        attach(g, index);
      } else if (e.type === 'station') {
        const s = layoutByKey.get(`station|${e.name}`);
        const w = 116, h = 26, cx = (L.xL + L.xR) / 2;
        const g = el('g', {}, svg);
        el('rect', { x: cx - w / 2, y: s.y - h / 2, width: w, height: h, rx: 6, fill: pal.cream2, stroke: selected ? pal.gold : pal.outline, 'stroke-width': selected ? 4 : 3 }, g);
        text(cx, s.y, e.name, 'middle', 11, pal.ink);
        attach(g, index);
      } else if (e.type === 'signal') {
        const s = layoutByKey.get(`signal|${e.label}`);
        const g = el('g', {}, svg);
        if (selected) el('circle', { cx: s.x, cy: s.y, r: 13, fill: 'none', stroke: pal.gold, 'stroke-width': 3 }, g);
        el('circle', { cx: s.x, cy: s.y, r: 7, fill: pal.blue, stroke: pal.outline, 'stroke-width': 2.5 }, g);
        text(s.track === 'L' ? s.x - 13 : s.x + 13, s.y, e.label, s.track === 'L' ? 'end' : 'start', 10, pal.ink);
        attach(g, index);
      }
    });

    function attach(g, index) {
      g.style.cursor = 'pointer';
      g.addEventListener('pointerdown', (evt) => {
        evt.preventDefault();
        selectedIndex = index;
        dragIndex = index;
        renderPanel();
        redraw();
      });
    }

    // drag handling at the svg level so it survives redraws
    svg.addEventListener('pointermove', (evt) => {
      if (dragIndex < 0) return;
      const loc = toLocal(svg, evt);
      const e = schematic.elements[dragIndex];
      e.pos = Math.round(yToPos(loc.y) * 100) / 100;
      if (e.type === 'signal') e.track = trackFromX(loc.x);
      renderPanel();
      redraw();
    });
    const endDrag = () => { dragIndex = -1; };
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointerleave', endDrag);
  }

  function renderPanel() {
    if (selectedIndex < 0) {
      panel.innerHTML = '<p class="admin-empty">No object selected.</p>';
      return;
    }
    const e = schematic.elements[selectedIndex];
    const name = e.label || e.name;
    panel.innerHTML = `
      <h3>${e.type}: <b>${name}</b></h3>
      <label>Milepost (pos)
        <input id="ae-pos" type="number" step="0.01" value="${e.pos}">
      </label>
      ${e.type === 'signal' ? `
      <label>Track
        <select id="ae-track">
          <option value="L"${e.track === 'L' ? ' selected' : ''}>L (West)</option>
          <option value="R"${e.track === 'R' ? ' selected' : ''}>R (East)</option>
        </select>
      </label>` : ''}
      <div class="admin-nudge">
        <button id="ae-up" class="tg-btn">▲ +0.05</button>
        <button id="ae-down" class="tg-btn">▼ −0.05</button>
      </div>`;
    panel.querySelector('#ae-pos').addEventListener('change', (ev) => {
      const v = parseFloat(ev.target.value);
      if (Number.isFinite(v)) { e.pos = v; redraw(); }
    });
    const trackSel = panel.querySelector('#ae-track');
    if (trackSel) trackSel.addEventListener('change', (ev) => { e.track = ev.target.value; redraw(); });
    panel.querySelector('#ae-up').onclick = () => { e.pos = Math.round((e.pos + 0.05) * 100) / 100; renderPanel(); redraw(); };
    panel.querySelector('#ae-down').onclick = () => { e.pos = Math.round((e.pos - 0.05) * 100) / 100; renderPanel(); redraw(); };
  }

  exportBtn.onclick = () => {
    if (schematic) download(`${currentFile}.json`, JSON.stringify(schematic, null, 2) + '\n');
  };
  fileSel.onchange = () => loadFile(fileSel.value);

  await loadFile(fileSel.value);
}
