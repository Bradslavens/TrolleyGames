// Tests for the rich-schematic data layer: the signalsForDirection helper, the
// line→schematic registry, and a consistency check that the generated signal
// data actually matches what the schematics + registry produce.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { signalsForDirection } from '../../public/src/data/schematicLayout.js';
import {
  schematicRegistry,
  ALL_LINES,
  isCovered,
} from '../../public/src/data/schematicRegistry.js';
import { correctSignals } from '../../public/src/data/correctSignals.js';

const here = dirname(fileURLToPath(import.meta.url));
const schematicsDir = resolve(here, '../../public/src/data/schematics');
const loadSchematic = (file) =>
  JSON.parse(readFileSync(resolve(schematicsDir, `${file}.json`), 'utf8'));

// A tiny synthetic schematic to exercise the filtering/ordering rules directly.
const fixture = {
  elements: [
    { type: 'signal', label: 'R10', track: 'R', pos: 10.0, testable: true },
    { type: 'signal', label: 'R30', track: 'R', pos: 30.0, testable: true },
    { type: 'signal', label: 'R20', track: 'R', pos: 20.0, testable: true },
    { type: 'signal', label: 'L15', track: 'L', pos: 15.0, testable: true },
    { type: 'signal', label: 'L25', track: 'L', pos: 25.0, testable: true },
    { type: 'signal', label: 'RX', track: 'R', pos: 40.0, testable: false },
    { type: 'crossing', name: 'Main St', pos: 22.0, testable: true },
    { type: 'station', name: 'Depot', pos: 18.0 },
  ],
};

describe('signalsForDirection', () => {
  it('EAST: R track in ascending milepost order', () => {
    expect(signalsForDirection(fixture, { track: 'R', order: 'asc' }))
      .toEqual(['R10', 'R20', 'R30']);
  });

  it('WEST: L track in descending milepost order', () => {
    expect(signalsForDirection(fixture, { track: 'L', order: 'desc' }))
      .toEqual(['L25', 'L15']);
  });

  it('excludes non-signals (crossings/stations) and testable:false signals', () => {
    const all = signalsForDirection(fixture, { track: 'R', order: 'asc' });
    expect(all).not.toContain('RX');      // testable:false
    expect(all).not.toContain('Main St'); // crossing
    expect(all).not.toContain('Depot');   // station
  });

  it('keeps a stable order when two signals share a milepost', () => {
    const tied = { elements: [
      { type: 'signal', label: 'A', track: 'R', pos: 5, testable: true },
      { type: 'signal', label: 'B', track: 'R', pos: 5, testable: true },
    ]};
    expect(signalsForDirection(tied, { track: 'R', order: 'asc' })).toEqual(['A', 'B']);
    expect(signalsForDirection(tied, { track: 'R', order: 'desc' })).toEqual(['B', 'A']);
  });
});

describe('schematicRegistry', () => {
  it('lists all eight line-directions', () => {
    expect(ALL_LINES).toHaveLength(8);
  });

  it('maps East to the R track ascending and West to the L track descending', () => {
    for (const [line, entry] of Object.entries(schematicRegistry)) {
      if (!entry) continue;
      if (line.endsWith('East')) {
        expect(entry.track).toBe('R');
        expect(entry.order).toBe('asc');
      } else if (line.endsWith('West')) {
        expect(entry.track).toBe('L');
        expect(entry.order).toBe('desc');
      }
    }
  });

  it('points covered lines at a schematic file that exists and parses', () => {
    for (const [line, entry] of Object.entries(schematicRegistry)) {
      if (!entry) continue;
      const file = resolve(schematicsDir, `${entry.file}.json`);
      expect(existsSync(file), `missing schematic for ${line}`).toBe(true);
      expect(() => loadSchematic(entry.file)).not.toThrow();
    }
  });

  it('has at least the Orange and Blue North lines covered', () => {
    expect(isCovered('Orange Line East')).toBe(true);
    expect(isCovered('Orange Line West')).toBe(true);
    expect(isCovered('Blue Line North East')).toBe(true);
    expect(isCovered('Blue Line North West')).toBe(true);
  });
});

describe('generated correctSignals matches the schematics', () => {
  it('equals signalsForDirection for every covered line, and is empty otherwise', () => {
    for (const line of ALL_LINES) {
      const entry = schematicRegistry[line];
      if (entry) {
        const expected = signalsForDirection(loadSchematic(entry.file), entry);
        expect(correctSignals[line]).toEqual(expected);
        expect(correctSignals[line].length).toBeGreaterThan(0);
      } else {
        expect(correctSignals[line]).toEqual([]);
      }
    }
  });
});
