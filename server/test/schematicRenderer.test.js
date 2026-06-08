// Tests for the pure geometry of the SchemaPro schematic renderer
// (layoutSchematic). The DOM rendering itself is verified in the browser.

import { describe, it, expect } from 'vitest';
import { layoutSchematic, RENDER_DEFAULTS } from '../../public/src/games/schematicRenderer.js';

const { xL, xR, minSignalGap } = RENDER_DEFAULTS;

describe('layoutSchematic', () => {
  it('places signals on the x of their track', () => {
    const L = layoutSchematic({ elements: [
      { type: 'signal', label: 'A', track: 'L', pos: 10 },
      { type: 'signal', label: 'B', track: 'R', pos: 11 },
    ]});
    const a = L.signals.find((s) => s.label === 'A');
    const b = L.signals.find((s) => s.label === 'B');
    expect(a.x).toBe(xL);
    expect(b.x).toBe(xR);
  });

  it('draws a higher milepost higher on screen (smaller y)', () => {
    const L = layoutSchematic({ elements: [
      { type: 'signal', label: 'low', track: 'R', pos: 10 },
      { type: 'signal', label: 'high', track: 'R', pos: 15 },
    ]});
    const low = L.signals.find((s) => s.label === 'low');
    const high = L.signals.find((s) => s.label === 'high');
    expect(high.y).toBeLessThan(low.y);
    expect(L.H).toBeGreaterThan(0);
  });

  it('fans out signals that would overlap on the same track', () => {
    const L = layoutSchematic({ elements: [
      { type: 'signal', label: 'A', track: 'R', pos: 10.0 },
      { type: 'signal', label: 'B', track: 'R', pos: 10.001 }, // ~0.7px apart raw
    ]});
    const ys = L.signals.map((s) => s.y).sort((a, b) => a - b);
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(minSignalGap - 0.001);
  });

  it('does not fan out signals on different tracks at the same milepost', () => {
    const L = layoutSchematic({ elements: [
      { type: 'signal', label: 'L1', track: 'L', pos: 12 },
      { type: 'signal', label: 'R1', track: 'R', pos: 12 },
    ]});
    const l1 = L.signals.find((s) => s.label === 'L1');
    const r1 = L.signals.find((s) => s.label === 'R1');
    expect(l1.y).toBe(r1.y); // same milepost, different x — no nudge needed
  });

  it('nudges a station box off a signal sharing its milepost', () => {
    const L = layoutSchematic({ elements: [
      { type: 'signal', label: 'S', track: 'R', pos: 12 },
      { type: 'station', name: 'Depot', pos: 12 },
    ]});
    const sig = L.signals[0];
    const station = L.stations[0];
    expect(station.y).not.toBe(sig.y);
  });

  it('maps crossover endpoints to the track xs', () => {
    const L = layoutSchematic({ elements: [
      { type: 'crossover', fromTrack: 'L', toTrack: 'R', posStart: 11, posEnd: 11.2 },
    ]});
    const c = L.crossovers[0];
    expect(c.x1).toBe(xL);
    expect(c.x2).toBe(xR);
  });
});
