// schematicLayout.js
//
// Pure helpers over the rich, transcribed schematics (schematics/*.json).
// The rendering geometry now lives in games/schematicRenderer.js; this module
// just turns a schematic into the ordered signal list for one travel direction,
// which is the single source the games and the SchemaPro quiz draw from.

/**
 * Ordered list of testable signal labels for one travel direction of a rich
 * schematic. EAST reads the R track in ascending milepost order (away from
 * home); WEST reads the L track in descending order (toward home).
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
