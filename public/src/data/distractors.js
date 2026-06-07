// distractors.js
//
// Generates realistic "wrong answer" signal numbers for the games. The goal is
// that a wrong choice looks just like a real signal number, so the correct
// answer is not obvious. For a correct answer of "154" we want things like
// "514" (digit shuffle), "156" (near-miss), or "265" (a real signal from
// another line) — NOT "555" / "666".

import { correctSignals } from './correctSignals.js';

// Every real signal across all lines, de-duplicated. These are the most
// convincing distractors because they are genuine signal numbers.
const ALL_SIGNALS = [...new Set(Object.values(correctSignals).flat().map(String))];

// Fisher–Yates shuffle using an injectable RNG (so tests can be deterministic).
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Distinct re-orderings of a string's characters (excluding the original).
function permutations(str) {
  if (str.length < 2) return [];
  const out = new Set();
  const recur = (prefix, rest) => {
    if (!rest.length) {
      if (prefix !== str) out.add(prefix);
      return;
    }
    for (let i = 0; i < rest.length; i++) {
      recur(prefix + rest[i], rest.slice(0, i) + rest.slice(i + 1));
    }
  };
  // Cap the work for long strings (signal numbers are short, but be safe).
  if (str.length <= 5) recur('', str);
  return [...out];
}

// Near-misses: change exactly one digit to a different digit, same length.
function digitSubstitutions(str) {
  const out = new Set();
  for (let i = 0; i < str.length; i++) {
    for (let d = 0; d <= 9; d++) {
      const ch = String(d);
      if (ch === str[i]) continue;
      out.add(str.slice(0, i) + ch + str.slice(i + 1));
    }
  }
  return [...out];
}

/**
 * Generate `count` realistic distractor signal numbers for `correct`.
 *
 * @param {string|number} correct  The correct signal.
 * @param {number} count           How many distractors to return (default 2).
 * @param {object} [options]
 * @param {string} [options.line]  If given, none of that line's real signals
 *                                 are used as distractors (avoids ambiguity).
 * @param {string[]} [options.pool] Pool of realistic signals (default: all).
 * @param {() => number} [options.rng] RNG returning [0,1) (default Math.random).
 * @returns {string[]} distinct distractor strings, never equal to `correct`.
 */
export function generateDistractors(correct, count = 2, options = {}) {
  const { line = null, pool = ALL_SIGNALS, rng = Math.random } = options;
  const correctStr = String(correct);
  const len = correctStr.length;

  // Values we must never emit: the correct answer itself, and (if a line is
  // given) every other real signal on that line.
  const exclude = new Set([correctStr]);
  if (line && correctSignals[line]) {
    for (const s of correctSignals[line]) exclude.add(String(s));
  }

  const usable = (c) => /^\d+$/.test(c) && !exclude.has(c);

  // Tier 1 (most similar): near-misses of the correct number — digit shuffles
  // and single-digit substitutions, all the same length.
  const nearMisses = [...permutations(correctStr), ...digitSubstitutions(correctStr)]
    .filter(usable);

  // Tier 2: real signals from other lines that have the same number of digits.
  const realSameLen = pool.map(String).filter((s) => s.length === len && usable(s));

  // Tier 3 (fallback): any other real signal.
  const realAny = pool.map(String).filter(usable);

  // Mix the two most plausible sources so results aren't all anagrams of one
  // number, then fall back to any real signal if a tiny line runs short.
  const candidates = [
    ...shuffle([...nearMisses, ...realSameLen], rng),
    ...shuffle(realAny, rng),
  ];

  const result = [];
  const seen = new Set(exclude);
  for (const cand of candidates) {
    if (seen.has(cand)) continue;
    seen.add(cand);
    result.push(cand);
    if (result.length >= count) return result;
  }

  // Last resort (only for pathologically small data): numeric near-misses.
  let delta = 1;
  while (result.length < count && delta < 1000) {
    for (const n of [Number(correctStr) + delta, Number(correctStr) - delta]) {
      const cand = String(n);
      if (n >= 0 && cand.length === len && !seen.has(cand) && /^\d+$/.test(cand)) {
        seen.add(cand);
        result.push(cand);
        if (result.length >= count) break;
      }
    }
    delta++;
  }
  return result.slice(0, count);
}
