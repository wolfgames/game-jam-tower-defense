/**
 * Generates a winding path from the right edge to the left edge of the grid.
 * Every tile in the path is a waypoint, ordered right-to-left.
 * Returns an ordered array of {col, row} waypoints.
 */
export function generatePath(cols, rows, seed) {
  const rng = mulberry32(seed ?? Date.now());
  const waypoints = [];

  let row = Math.floor(rows / 2);
  let col = cols - 1;

  const add = (c, r) => {
    waypoints.push({ col: c, row: r });
  };

  while (col >= 0) {
    add(col, row);

    // Decide whether to jog vertically
    const shouldJog = rng() < 0.5 && col > 0;

    if (shouldJog) {
      const centerRow = Math.floor(rows / 2);
      let dir;
      if (row <= 1) dir = 1;
      else if (row >= rows - 2) dir = -1;
      else dir = row > centerRow ? (rng() < 0.6 ? -1 : 1) : (rng() < 0.6 ? 1 : -1);

      const jogLength = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < jogLength; i++) {
        const nextRow = row + dir;
        if (nextRow < 0 || nextRow >= rows) break;
        row = nextRow;
        add(col, row);
      }
    }

    col--;
  }

  return waypoints;
}

/**
 * Converts waypoints array to a Set of "col,row" keys for quick tile lookup.
 */
export function pathToSet(waypoints) {
  return new Set(waypoints.map((wp) => `${wp.col},${wp.row}`));
}

// Simple seedable PRNG (Mulberry32)
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
