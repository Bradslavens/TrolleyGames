// Pure movement helpers for SignalSlayer, kept separate from the DOM/canvas
// code so they can be unit-tested. The train sits on one of `tracks` lanes
// (0-indexed). Moving never wraps around or runs off the ends.

/**
 * Compute the track the train should be on after a move.
 * @param {number} current  current track index (0..tracks-1)
 * @param {-1|1} direction   -1 = left, 1 = right
 * @param {number} tracks    total number of tracks
 * @returns {number} the clamped new track index
 */
export function nextTrack(current, direction, tracks) {
  const target = current + direction;
  if (target < 0) return 0;
  if (target > tracks - 1) return tracks - 1;
  return target;
}
