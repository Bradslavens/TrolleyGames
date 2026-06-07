// Tests for the realistic-distractor generator used by HoppyTrain / SignalSlayer.
// The wrong answers shown next to the correct signal must look like real signal
// numbers (digit-shuffles, near-misses, or real signals from other lines) so the
// correct answer is not obvious — e.g. for 154, things like 514 / 156 / 265, not
// 555 / 666.

import { describe, it, expect } from 'vitest';
import { generateDistractors } from '../../public/src/data/distractors.js';
import { correctSignals } from '../../public/src/data/correctSignals.js';

const ALL = [...new Set(Object.values(correctSignals).flat())];
// A deterministic RNG so results are reproducible in tests.
const seededRng = (seed = 1) => () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

describe('generateDistractors', () => {
  it('returns the requested number of distractors', () => {
    const d = generateDistractors('154', 2, { line: 'Blue Line South East' });
    expect(d).toHaveLength(2);
  });

  it('never includes the correct answer', () => {
    for (let i = 0; i < 50; i++) {
      const d = generateDistractors('154', 2, { line: 'Blue Line South East' });
      expect(d).not.toContain('154');
    }
  });

  it('never includes another correct signal from the same line (no ambiguity)', () => {
    const lineSignals = correctSignals['Blue Line South East']; // 154,16,226,287,296
    for (let i = 0; i < 50; i++) {
      const d = generateDistractors('154', 2, { line: 'Blue Line South East' });
      for (const sig of lineSignals) expect(d).not.toContain(sig);
    }
  });

  it('returns distinct distractors', () => {
    for (let i = 0; i < 50; i++) {
      const d = generateDistractors('226', 2, { line: 'Blue Line South East' });
      expect(new Set(d).size).toBe(d.length);
    }
  });

  it('produces plausible values: same digit-length as the answer, or a real signal', () => {
    for (let i = 0; i < 100; i++) {
      const d = generateDistractors('154', 2, { line: 'Blue Line South East' });
      for (const cand of d) {
        const looksReal = ALL.includes(cand);
        const sameLength = cand.length === '154'.length;
        expect(looksReal || sameLength).toBe(true);
        expect(/^\d+$/.test(cand)).toBe(true); // numeric only — never 'abc'
      }
    }
  });

  it('does not emit obvious fake patterns like 555 / 666 (unless they are real signals)', () => {
    const obviousFakes = ['111', '222', '333', '444', '555', '666', '777', '888', '999'];
    for (let i = 0; i < 100; i++) {
      const d = generateDistractors('154', 2, { line: 'Blue Line South East' });
      for (const cand of d) {
        if (!ALL.includes(cand)) expect(obviousFakes).not.toContain(cand);
      }
    }
  });

  it('handles a single-digit correct answer', () => {
    const d = generateDistractors('2', 2, { line: 'Green Line East' });
    expect(d).toHaveLength(2);
    for (const cand of d) {
      expect(cand).not.toBe('2');
      expect(/^\d+$/.test(cand)).toBe(true);
    }
  });

  it('is reproducible when given a seeded rng', () => {
    const a = generateDistractors('287', 2, {
      line: 'Blue Line South East',
      rng: seededRng(42),
    });
    const b = generateDistractors('287', 2, {
      line: 'Blue Line South East',
      rng: seededRng(42),
    });
    expect(a).toEqual(b);
  });
});
