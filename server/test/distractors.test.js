// Tests for the realistic-distractor generator used by HoppyTrain / SignalSlayer.
// The wrong answers shown next to the correct signal must look like real MTS
// signal codes — look-alikes of the answer (same letters, perturbed number) or
// genuine codes borrowed from elsewhere — e.g. for "E1340", things like
// "E1430" / "E1240" / "E1236", never "abc" or an obvious fake.

import { describe, it, expect } from 'vitest';
import { generateDistractors } from '../../public/src/data/distractors.js';
import { correctSignals } from '../../public/src/data/correctSignals.js';

const LINE = 'Orange Line East';
const ANSWER = 'E1340'; // a real Orange Line East signal
const ALL = [...new Set(Object.values(correctSignals).flat().map(String))];

// A deterministic RNG so results are reproducible in tests.
const seededRng = (seed = 1) => () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

describe('generateDistractors', () => {
  it('returns the requested number of distractors', () => {
    expect(generateDistractors(ANSWER, 2, { line: LINE })).toHaveLength(2);
    expect(generateDistractors(ANSWER, 3, { line: LINE })).toHaveLength(3);
  });

  it('never includes the correct answer', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateDistractors(ANSWER, 2, { line: LINE })).not.toContain(ANSWER);
    }
  });

  it('never includes another real signal from the same line (no ambiguity)', () => {
    const lineSignals = correctSignals[LINE];
    for (let i = 0; i < 50; i++) {
      const d = generateDistractors(ANSWER, 2, { line: LINE });
      for (const sig of lineSignals) expect(d).not.toContain(sig);
    }
  });

  it('returns distinct distractors', () => {
    for (let i = 0; i < 50; i++) {
      const d = generateDistractors('E1416', 2, { line: LINE });
      expect(new Set(d).size).toBe(d.length);
    }
  });

  it('produces plausible codes: a real code, or the same shape as the answer', () => {
    for (let i = 0; i < 100; i++) {
      const d = generateDistractors(ANSWER, 2, { line: LINE });
      for (const cand of d) {
        const looksReal = ALL.includes(cand);
        const sameLength = cand.length === ANSWER.length;
        expect(looksReal || sameLength).toBe(true);
        expect(/\d/.test(cand)).toBe(true);   // a signal code always has digits
        expect(/^[A-Za-z0-9]+$/.test(cand)).toBe(true); // never punctuation/garbage
      }
    }
  });

  it("keeps the answer's letter prefix on look-alikes (or borrows a real code)", () => {
    for (let i = 0; i < 100; i++) {
      const d = generateDistractors(ANSWER, 2, { line: LINE });
      for (const cand of d) {
        const looksReal = ALL.includes(cand);
        expect(looksReal || cand.startsWith('E')).toBe(true);
      }
    }
  });

  it('handles a short code', () => {
    const d = generateDistractors('E7B', 2, { line: 'Blue Line North East' });
    expect(d).toHaveLength(2);
    for (const cand of d) {
      expect(cand).not.toBe('E7B');
      expect(/^[A-Za-z0-9]+$/.test(cand)).toBe(true);
    }
  });

  it('is reproducible when given a seeded rng', () => {
    const a = generateDistractors(ANSWER, 2, { line: LINE, rng: seededRng(42) });
    const b = generateDistractors(ANSWER, 2, { line: LINE, rng: seededRng(42) });
    expect(a).toEqual(b);
  });
});
