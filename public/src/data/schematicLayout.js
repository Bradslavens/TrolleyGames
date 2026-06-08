// schematicLayout.js
//
// Pure helper that turns a line's ordered signal list into a simple schematic
// layout: a single vertical track with each signal placed along it, top to
// bottom, in real sequence order. SchemaPro renders this as an SVG, and the
// generator script writes one JSON file per line from it. No images required.

export const VIEW_W = 360;
export const VIEW_H = 600;

const TOP_MARGIN = 80;
const BOTTOM_MARGIN = 80;
const TRACK_X = VIEW_W / 2;

// Filename/URL-safe slug for a line name: "Blue Line North East" -> "blue-line-north-east".
export function lineSlug(line) {
  return String(line)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build a schematic layout object for a line.
 * @param {string} line       Line name (stored on the result).
 * @param {Array<string|number>} signals  Ordered signal labels.
 * @returns {{line:string, viewBox:number[], track:number[][], signals:{label:string,x:number,y:number,order:number}[]}}
 */
export function buildSchematic(line, signals) {
  const n = signals.length;
  const usable = VIEW_H - TOP_MARGIN - BOTTOM_MARGIN;

  const points = signals.map((label, i) => {
    const y = n <= 1 ? VIEW_H / 2 : TOP_MARGIN + (usable * i) / (n - 1);
    return { label: String(label), x: TRACK_X, y: Math.round(y), order: i };
  });

  return {
    line,
    viewBox: [0, 0, VIEW_W, VIEW_H],
    track: [
      [TRACK_X, TOP_MARGIN - 40],
      [TRACK_X, VIEW_H - BOTTOM_MARGIN + 40],
    ],
    signals: points,
  };
}

/**
 * Ordered list of testable signal labels for one travel direction of a rich
 * schematic. EAST reads the R track in ascending milepost order (away from
 * home); WEST reads the L track in descending order (toward home). This is the
 * single source the games (HoppyTrain / RememberBee / SignalSlayer) and the
 * SchemaPro quiz draw their signal sequence from.
 *
 * @param {{elements: Array}} schematic  Parsed rich schematic JSON.
 * @param {{track: 'L'|'R', order: 'asc'|'desc'}} opts
 * @returns {string[]} signal labels in travel order.
 */
export function signalsForDirection(schematic, { track, order }) {
  const picked = (schematic.elements || [])
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.type === 'signal' && e.testable !== false && e.track === track)
    .sort((a, b) => a.e.pos - b.e.pos || a.i - b.i); // ascending, stable on ties

  if (order === 'desc') picked.reverse();
  return picked.map(({ e }) => String(e.label));
}
