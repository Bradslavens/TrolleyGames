// Tests for the schematic layout generator used by SchemaPro, and a consistency
// check that the generated per-line JSON files stay in sync with the signal data.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  buildSchematic,
  lineSlug,
  VIEW_W,
  VIEW_H,
} from '../../public/src/data/schematicLayout.js';
import { correctSignals } from '../../public/src/data/correctSignals.js';

const here = dirname(fileURLToPath(import.meta.url));
const schematicsDir = resolve(here, '../../public/src/data/schematics');

describe('lineSlug', () => {
  it('turns a line name into a filename-safe slug', () => {
    expect(lineSlug('Blue Line North East')).toBe('blue-line-north-east');
    expect(lineSlug('Orange Line West')).toBe('orange-line-west');
  });
});

describe('buildSchematic', () => {
  const line = 'Orange Line East';
  const signals = correctSignals[line]; // real, schematic-derived signal codes

  it('produces one point per signal, in order, with matching labels', () => {
    const s = buildSchematic(line, signals);
    expect(s.signals.map((p) => p.label)).toEqual(signals.map(String));
  });

  it('keeps every point inside the viewBox', () => {
    const s = buildSchematic(line, signals);
    for (const p of s.signals) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(VIEW_W);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(VIEW_H);
    }
  });

  it('lays signals out top-to-bottom in increasing y (real sequence order)', () => {
    const s = buildSchematic(line, signals);
    for (let i = 1; i < s.signals.length; i++) {
      expect(s.signals[i].y).toBeGreaterThan(s.signals[i - 1].y);
    }
  });

  it('records the viewBox and a track polyline', () => {
    const s = buildSchematic(line, signals);
    expect(s.viewBox).toEqual([0, 0, VIEW_W, VIEW_H]);
    expect(Array.isArray(s.track)).toBe(true);
    expect(s.track.length).toBeGreaterThanOrEqual(2);
  });

  it('handles a single-signal line without dividing by zero', () => {
    const s = buildSchematic('Test', ['7']);
    expect(s.signals).toHaveLength(1);
    expect(Number.isFinite(s.signals[0].y)).toBe(true);
  });
});

describe('generated schematic JSON files', () => {
  it('exist for every line and match the signal data exactly', () => {
    for (const line of Object.keys(correctSignals)) {
      const file = resolve(schematicsDir, `${lineSlug(line)}.json`);
      expect(existsSync(file), `missing schematic for ${line}`).toBe(true);
      const data = JSON.parse(readFileSync(file, 'utf8'));
      expect(data.line).toBe(line);
      expect(data.signals.map((p) => p.label)).toEqual(
        correctSignals[line].map(String)
      );
      expect(data.viewBox).toEqual([0, 0, VIEW_W, VIEW_H]);
    }
  });
});
