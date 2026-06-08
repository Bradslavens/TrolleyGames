// Tests for SignalSlayer's pure track-movement helper. These guard the rule
// that drives both the keyboard arrows and the new on-screen mobile controls:
// the train moves one lane at a time and never runs off either end.

import { describe, it, expect } from 'vitest';
import { nextTrack } from '../../public/src/games/signalSlayerLogic.js';

const TRACKS = 3;

describe('nextTrack', () => {
  it('moves right one lane', () => {
    expect(nextTrack(0, 1, TRACKS)).toBe(1);
    expect(nextTrack(1, 1, TRACKS)).toBe(2);
  });

  it('moves left one lane', () => {
    expect(nextTrack(2, -1, TRACKS)).toBe(1);
    expect(nextTrack(1, -1, TRACKS)).toBe(0);
  });

  it('clamps at the left edge (no wrap)', () => {
    expect(nextTrack(0, -1, TRACKS)).toBe(0);
  });

  it('clamps at the right edge (no wrap)', () => {
    expect(nextTrack(TRACKS - 1, 1, TRACKS)).toBe(TRACKS - 1);
  });

  it('works for an arbitrary track count', () => {
    expect(nextTrack(3, 1, 5)).toBe(4);
    expect(nextTrack(4, 1, 5)).toBe(4);
  });
});
