// schematicRenderer.js
//
// Renders a rich, transcribed schematic (see schematics/*.json) as a vertical
// SVG diagram for SchemaPro (and, later, the admin editor). Two parallel tracks
// (L = West on the left, R = East on the right), with signals drawn as ICONS
// WITH NO LABELS — the player has to recognise them by position. The reference
// points (grade crossings, reference streets, stations, mileposts, SS markers)
// keep their labels, since those are the cues a student uses to locate signals.
//
// layoutSchematic() is pure (no DOM) so the geometry can be unit-tested.
// renderSchematic() turns a layout into SVG, using the DOM for text measurement
// (halos + shrink-to-fit), so it must run in a browser/jsdom.

const SVG_NS = 'http://www.w3.org/2000/svg';

export const RENDER_DEFAULTS = {
  W: 480,          // viewBox width
  pxPerMile: 720,  // vertical scale
  pad: 50,         // top/bottom padding
  xL: 210,         // left track x  (West)
  xR: 300,         // right track x (East)
  minSignalGap: 18, // min vertical spacing between dots on the same track
};

/**
 * Pure geometry for a schematic. Higher milepost is drawn higher on screen.
 * Signals that collide on the same track are fanned out; station boxes are
 * nudged to a gap clear of signals.
 * @returns layout with absolute x/y for every drawable item.
 */
export function layoutSchematic(schematic, opts = {}) {
  const o = { ...RENDER_DEFAULTS, ...opts };
  const els = schematic.elements || [];

  const positions = els
    .flatMap((e) => (e.pos != null ? [e.pos] : [e.posStart, e.posEnd]))
    .filter((n) => typeof n === 'number');
  const maxPos = positions.length ? Math.max(...positions) : 1;
  const minPos = positions.length ? Math.min(...positions) : 0;
  const H = o.pad * 2 + (maxPos - minPos) * o.pxPerMile;
  const y = (pos) => o.pad + (maxPos - pos) * o.pxPerMile;
  const trackX = (t) => (t === 'R' ? o.xR : o.xL);

  const signals = els
    .filter((e) => e.type === 'signal')
    .map((e) => ({ label: String(e.label), track: e.track, pos: e.pos, x: trackX(e.track), y: y(e.pos) }));

  // Fan out signals that would overlap on the same track so each dot is a
  // distinct, clickable target (their milepost positions are approximate).
  for (const track of ['L', 'R']) {
    const arr = signals.filter((s) => s.track === track).sort((a, b) => a.y - b.y);
    for (let i = 1; i < arr.length; i++) {
      if (arr[i].y - arr[i - 1].y < o.minSignalGap) arr[i].y = arr[i - 1].y + o.minSignalGap;
    }
  }

  const signalYs = signals.map((s) => s.y);
  const clearY = (targetY, halfH, margin = 7) => {
    const hit = (yy) => signalYs.some((sy) => Math.abs(sy - yy) < halfH + margin);
    if (!hit(targetY)) return targetY;
    for (let d = 4; d <= 80; d += 3) {
      if (!hit(targetY + d)) return targetY + d;
      if (!hit(targetY - d)) return targetY - d;
    }
    return targetY;
  };

  const byType = (t) => els.filter((e) => e.type === t);
  return {
    W: o.W,
    H,
    viewBox: [0, 0, o.W, H],
    xL: o.xL,
    xR: o.xR,
    // Mapping params, so callers (the admin editor) can invert a screen y back
    // to a milepost: pos = maxPos - (y - pad) / pxPerMile.
    meta: { pad: o.pad, pxPerMile: o.pxPerMile, maxPos, minPos },
    trackTop: y(maxPos) - 24,
    trackBottom: y(minPos) + 24,
    signals,
    crossings: byType('crossing').map((e) => ({ name: e.name, y: y(e.pos) })),
    referenceStreets: byType('referenceStreet').map((e) => ({ name: e.name, y: y(e.pos) })),
    stations: byType('station').map((e) => ({ name: e.name, x: (o.xL + o.xR) / 2, y: clearY(y(e.pos), 15) })),
    mileposts: byType('milepost').map((e) => ({ label: String(e.label), y: y(e.pos) })),
    markers: byType('marker').map((e) => ({ label: e.label, track: e.track, x: trackX(e.track), y: y(e.pos) })),
    crossovers: byType('crossover').map((e) => ({
      x1: trackX(e.fromTrack), y1: y(e.posStart), x2: trackX(e.toTrack), y2: y(e.posEnd),
    })),
  };
}

function el(name, attrs = {}, parent) {
  const n = document.createElementNS(SVG_NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

/**
 * Render a schematic into `parent` (which must be in the document so text can
 * be measured). Signals on `interactiveTrack` are clickable and call
 * onSignalClick(label, circleEl); signals on the other track are dimmed context.
 * @returns {{ svg, signalNodes: Map<string, SVGCircleElement> }}
 */
export function renderSchematic(schematic, parent, { pal, interactiveTrack = null, onSignalClick = null, opts = {} } = {}) {
  const ref = pal.ref || '#8a7f66';
  const cream2 = pal.cream2 || '#e9dcbd';
  const L = layoutSchematic(schematic, opts);

  const svg = el('svg', { viewBox: L.viewBox.join(' '), width: String(L.W) });
  svg.style.maxWidth = '92vw';
  svg.style.height = 'auto';
  svg.style.touchAction = 'manipulation';
  parent.appendChild(svg); // in DOM before measuring text

  // A text label with a cream halo so lines/boxes never line it out, and
  // shrink-to-fit (then wrap to 2 lines) so long names never overflow.
  function addLabel(x, yy, s, { anchor = 'middle', size = 13, fill = pal.ink, style = '', maxW = null, halo = true } = {}) {
    let fontSize = size;
    const mk = (str, fs, dy) => {
      const t = el('text', {
        x, y: yy + (dy || 0), 'text-anchor': anchor, 'dominant-baseline': 'central',
        'font-family': pal.font, 'font-size': fs, 'font-weight': 700, fill,
      });
      if (style) t.setAttribute('font-style', style);
      t.textContent = str;
      return t;
    };
    const measure = (t) => { svg.appendChild(t); return t.getComputedTextLength(); };
    let lines = [s];
    let t = mk(s, fontSize);
    let w = measure(t);
    if (maxW && w > maxW) {
      while (w > maxW && fontSize > 9) { svg.removeChild(t); fontSize--; t = mk(s, fontSize); w = measure(t); }
      if (w > maxW && s.includes(' ')) {
        svg.removeChild(t);
        const words = s.split(' ');
        let a = '', b = '';
        for (const word of words) {
          if ((a + ' ' + word).trim().length <= Math.ceil(s.length / 2)) a = (a + ' ' + word).trim();
          else b = (b + ' ' + word).trim();
        }
        lines = [a, b];
      } else { svg.removeChild(t); }
    } else { svg.removeChild(t); }

    const nodes = lines.map((ln, i) => mk(ln, fontSize, lines.length === 2 ? (i === 0 ? -7 : 7) : 0));
    nodes.forEach((n) => svg.appendChild(n));
    if (halo) {
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
      nodes.forEach((n) => { const b = n.getBBox(); minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height); });
      const p = 2;
      const rect = el('rect', { x: minX - p, y: minY - p, width: (maxX - minX) + p * 2, height: (maxY - minY) + p * 2, fill: pal.cream, rx: 3 });
      nodes.forEach((n) => svg.insertBefore(rect, n));
    }
    return nodes;
  }

  // tracks
  [L.xL, L.xR].forEach((x) => el('line', { x1: x, y1: L.trackTop, x2: x, y2: L.trackBottom, stroke: pal.outline, 'stroke-width': 9, 'stroke-linecap': 'round' }, svg));
  // crossovers
  L.crossovers.forEach((c) => el('line', { x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2, stroke: pal.outline, 'stroke-width': 6, 'stroke-linecap': 'round' }, svg));
  // grade crossings (full line + name)
  L.crossings.forEach((c) => {
    el('line', { x1: 140, y1: c.y, x2: 372, y2: c.y, stroke: pal.outline, 'stroke-width': 3 }, svg);
    addLabel(134, c.y, c.name, { anchor: 'end', size: 12, maxW: 128 });
  });
  // reference streets (broken line + name)
  L.referenceStreets.forEach((c) => {
    el('line', { x1: 140, y1: c.y, x2: L.xL - 16, y2: c.y, stroke: ref, 'stroke-width': 3, 'stroke-dasharray': '5 4' }, svg);
    el('line', { x1: L.xR + 16, y1: c.y, x2: 372, y2: c.y, stroke: ref, 'stroke-width': 3, 'stroke-dasharray': '5 4' }, svg);
    addLabel(134, c.y, c.name, { anchor: 'end', size: 11, fill: ref, style: 'italic', maxW: 128 });
  });
  // stations
  L.stations.forEach((s) => {
    const w = 120, h = 28;
    el('rect', { x: s.x - w / 2, y: s.y - h / 2, width: w, height: h, rx: 6, fill: cream2, stroke: pal.outline, 'stroke-width': 3 }, svg);
    addLabel(s.x, s.y, s.name, { size: 12, maxW: w - 12, halo: false });
  });
  // mileposts
  L.mileposts.forEach((m) => {
    const mx = 410;
    el('polygon', { points: `${mx - 16},${m.y - 13} ${mx + 16},${m.y - 13} ${mx + 16},${m.y + 4} ${mx},${m.y + 16} ${mx - 16},${m.y + 4}`, fill: pal.gold, stroke: pal.outline, 'stroke-width': 2 }, svg);
    addLabel(mx, m.y - 4, m.label, { size: 14, halo: false });
  });
  // SS markers
  L.markers.forEach((m) => {
    const mx = m.track === 'L' ? L.xL - 40 : L.xR + 40;
    el('rect', { x: mx - 13, y: m.y - 11, width: 26, height: 22, rx: 3, fill: cream2, stroke: pal.outline, 'stroke-width': 2.5 }, svg);
    addLabel(mx, m.y, m.label, { size: 12, halo: false });
  });

  // signals LAST so the dots sit on top of every line/box. NO labels.
  const signalNodes = new Map();
  L.signals.forEach((s) => {
    const interactive = s.track === interactiveTrack;
    const g = el('g', {}, svg);
    const circle = el('circle', {
      cx: s.x, cy: s.y, r: 8,
      fill: interactive ? pal.blue : cream2,
      stroke: pal.outline, 'stroke-width': 2.5,
    }, g);
    if (!interactive) circle.setAttribute('opacity', '0.5');
    circle.style.transition = 'fill 0.15s ease';
    if (interactive) {
      g.style.cursor = 'pointer';
      signalNodes.set(s.label, circle);
      if (onSignalClick) g.addEventListener('click', () => onSignalClick(s.label, circle));
    }
  });

  return { svg, signalNodes };
}
