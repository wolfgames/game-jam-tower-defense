/**
 * Wave definitions and spawner.
 *
 * Each wave is an array of groups:
 *   { count, delay, speed, hp }
 *   - count: number of enemies in this group
 *   - delay: seconds between spawns within the group
 *   - speed: pixels/sec
 *   - hp: base hit-points (scaled by wave number)
 */
const WAVES = [
  // Wave 1 — slow trickle
  [{ count: 5, delay: 1.0, speed: 60, hp: 3 }],
  // Wave 2 — a bit faster, more enemies
  [{ count: 8, delay: 0.8, speed: 75, hp: 4 }],
  // Wave 3 — two groups: fast scouts then tanky ones
  [
    { count: 4, delay: 0.5, speed: 120, hp: 2 },
    { count: 4, delay: 1.2, speed: 50, hp: 8 },
  ],
  // Wave 4 — swarm
  [{ count: 15, delay: 0.4, speed: 90, hp: 4 }],
  // Wave 5 — big boys
  [{ count: 6, delay: 1.5, speed: 40, hp: 15 }],
];

// HP scales by 30% each full cycle through all waves
const HP_SCALE_PER_CYCLE = 1.3;

export function getWaveCount() {
  return WAVES.length;
}

/**
 * Creates a wave spawner.
 * waveIndex is the global wave counter (0, 1, 2, ... infinitely).
 * HP scales up each time we loop back through the wave list.
 */
export function createWaveSpawner(waveIndex, onSpawn, onWaveComplete) {
  const wave = WAVES[waveIndex % WAVES.length];
  const cycle = Math.floor(waveIndex / WAVES.length);
  const hpMultiplier = Math.pow(HP_SCALE_PER_CYCLE, cycle) + waveIndex * 0.15;

  // Flatten wave groups into a spawn schedule
  const schedule = [];
  for (const group of wave) {
    for (let i = 0; i < group.count; i++) {
      schedule.push({
        delay: group.delay,
        opts: { speed: group.speed, hp: Math.ceil(group.hp * hpMultiplier) },
      });
    }
  }

  let index = 0;
  let timer = 0.4; // short initial delay before first spawn

  return {
    done: false,
    update(dt) {
      if (this.done) return;

      timer -= dt;
      if (timer <= 0 && index < schedule.length) {
        onSpawn(schedule[index].opts);
        index++;
        if (index < schedule.length) {
          timer = schedule[index].delay;
        } else {
          this.done = true;
          onWaveComplete();
        }
      }
    },
  };
}
