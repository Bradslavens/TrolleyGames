// distractors.js
//
// Generates realistic "wrong answer" signal codes for the games. The goal is
// that a wrong choice looks just like a real signal code, so the correct
// answer is not obvious. Real MTS signal codes are alphanumeric — e.g. "E1340",
// "E356A", "E20RB" — so for a correct answer of "E1340" we want things like
// "E1240" / "E1430" (perturb the number, keep the letters), or a genuine code
// borrowed from another part of the system — NOT "E5555" or "abc".

import { correctSignals } from './correctSignals.js';

// Every real signal across all lines, de-duplicated. These are the most
// convincing distractors because they are genuine signal codes.
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

// Split a code into a letter prefix, a run of digits, and a letter suffix:
// "E356A" -> { prefix:"E", digits:"356", suffix:"A" }. Returns null if there is
// no digit run to perturb (then we lean entirely on the real-signal pool).
function splitCode(code) {
  const m = /^([A-Za-z]*)(\d+)([A-Za-z]*)$/.exec(code);
  if (!m) return null;
  return { prefix: m[1], digits: m[2], suffix: m[3] };
}

// Distinct re-orderings of a digit string (excluding the original).
function digitPermutations(digits) {
  if (digits.length < 2 || digits.length > 5) return [];
  const out = new Set();
  const recur = (prefix, rest) => {
    if (!rest.length) {
      if (prefix !== digits) out.add(prefix);
      return;
    }
    for (let i = 0; i < rest.length; i++) {
      recur(prefix + rest[i], rest.slice(0, i) + rest.slice(i + 1));
    }
  };
  recur('', digits);
  return [...out];
}

// Near-misses: change exactly one digit to a different digit, same length.
function digitSubstitutions(digits) {
  const out = new Set();
  for (let i = 0; i < digits.length; i++) {
    for (let d = 0; d <= 9; d++) {
      const ch = String(d);
      if (ch === digits[i]) continue;
      out.add(digits.slice(0, i) + ch + digits.slice(i + 1));
    }
  }
  return [...out];
}

// Build look-alike codes by perturbing the digit run while keeping the same
// letter prefix/suffix, so "E1340" yields "E1240", "E1430", etc.
function nearMisses(code) {
  const parts = splitCode(code);
  if (!parts) return [];
  const { prefix, digits, suffix } = parts;
  return [...digitPermutations(digits), ...digitSubstitutions(digits)]
    .map((d) => prefix + d + suffix);
}

/**
 * Generate `count` realistic distractor signal codes for `correct`.
 *
 * @param {string|number} correct  The correct signal code.
 * @param {number} count           How many distractors to return (default 2).
 * @param {object} [options]
 * @param {string} [options.line]  If given, none of that line's real signals
 *                                 are used as distractors (avoids ambiguity).
 * @param {string[]} [options.pool] Pool of real signals (default: all lines).
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
  const usable = (c) => c && !exclude.has(c);

  // Tier 1 (most similar): look-alikes of the correct code.
  const near = nearMisses(correctStr).filter(usable);

  // Tier 2: real codes from elsewhere with the same overall length.
  const realSameLen = pool.map(String).filter((s) => s.length === len && usable(s));

  // Tier 3 (fallback): any other real code.
  const realAny = pool.map(String).filter(usable);

  // Mix the two most plausible sources so results aren't all anagrams of one
  // number, then fall back to any real signal if a tiny line runs short.
  const candidates = [
    ...shuffle([...near, ...realSameLen], rng),
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

  // Last resort (only for pathologically small data): nudge the digit run up
  // and down to manufacture more same-shape look-alikes.
  const parts = splitCode(correctStr);
  if (parts) {
    const { prefix, digits, suffix } = parts;
    const width = digits.length;
    const base = Number(digits);
    let delta = 1;
    while (result.length < count && delta < 1000) {
      for (const n of [base + delta, base - delta]) {
        if (n < 0) continue;
        const d = String(n);
        if (d.length !== width) continue; // keep the same digit count
        const cand = prefix + d + suffix;
        if (!seen.has(cand)) {
          seen.add(cand);
          result.push(cand);
          if (result.length >= count) break;
        }
      }
      delta++;
    }
  }
  return result.slice(0, count);
}
