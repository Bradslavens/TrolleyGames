// schematicRegistry.js
//
// Maps each of the eight game line-directions to the schematic that backs it.
// One physical schematic file covers BOTH directions of a segment: the RIGHT
// track is EAST, the LEFT track is WEST (East = away from home / increasing
// milepost; West = toward home / decreasing milepost). So a "...East" entry
// reads the R track in ascending order, and "...West" reads the L track in
// descending order.
//
// `file` is the base name of the JSON in public/src/data/schematics/.
// A null entry means we don't have a transcribed schematic for that line yet
// ("coming soon" in the menu). Add the JSON + an entry here to light it up.

export const schematicRegistry = {
  'Blue Line North East': { file: 'blue-line-north', track: 'R', order: 'asc' },
  'Blue Line North West': { file: 'blue-line-north', track: 'L', order: 'desc' },
  'Blue Line South East': null,
  'Blue Line South West': null,
  'Orange Line East': { file: 'orange-line', track: 'R', order: 'asc' },
  'Orange Line West': { file: 'orange-line', track: 'L', order: 'desc' },
  'Green Line East': null,
  'Green Line West': null,
};

// All eight line-direction names, in menu order.
export const ALL_LINES = Object.keys(schematicRegistry);

// True when we have a transcribed schematic for this line-direction.
export function isCovered(line) {
  return Boolean(schematicRegistry[line]);
}

// URL/path (relative to the web root) of a line-direction's schematic JSON,
// or null if uncovered.
export function schematicPath(line) {
  const entry = schematicRegistry[line];
  return entry ? `/src/data/schematics/${entry.file}.json` : null;
}
