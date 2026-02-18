import { Assets, AnimatedSprite, Container, Graphics, Texture } from 'pixi.js';

const FRAME_COUNT = 17;
const ENEMY_SCALE = 0.24;
const HP_BAR_WIDTH = 30;
const HP_BAR_HEIGHT = 4;
const HP_BAR_Y = -20; // above the sprite

let zombieTextures = null;

export async function loadEnemyAssets() {
  const paths = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    paths.push(`assets/zombie/skeleton-move_${i}.png`);
  }
  await Assets.load(paths);
  zombieTextures = paths.map(p => Texture.from(p));
}

/**
 * Creates an enemy that follows a list of pixel-coordinate waypoints.
 * Returns a Container with an animated zombie sprite and health bar.
 */
export function createEnemy(pixelWaypoints, { speed = 80, hp = 3 } = {}) {
  const container = new Container();

  const anim = new AnimatedSprite(zombieTextures);
  anim.anchor.set(0.5);
  anim.scale.set(ENEMY_SCALE);
  anim.animationSpeed = 0.4;
  anim.play();
  container.addChild(anim);

  // Health bar (doesn't rotate with sprite)
  const hpBar = new Graphics();
  container.addChild(hpBar);

  // Start at first waypoint
  container.x = pixelWaypoints[0].x;
  container.y = pixelWaypoints[0].y;

  // Face toward second waypoint if available
  if (pixelWaypoints.length > 1) {
    const dx = pixelWaypoints[1].x - pixelWaypoints[0].x;
    const dy = pixelWaypoints[1].y - pixelWaypoints[0].y;
    anim.rotation = Math.atan2(dy, dx);
  }

  container.enemy = {
    waypoints: pixelWaypoints,
    waypointIndex: 0,
    speed,
    hp,
    maxHp: hp,
    alive: true,
    finished: false,
    anim,
    hpBar,
  };

  drawHpBar(container.enemy);

  return container;
}

function drawHpBar(data) {
  const bar = data.hpBar;
  const pct = Math.max(0, data.hp / data.maxHp);

  bar.clear();

  // Background (dark)
  bar.rect(-HP_BAR_WIDTH / 2, HP_BAR_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT)
    .fill({ color: 0x000000, alpha: 0.6 });

  // Fill — green > yellow > red
  const color = pct > 0.5 ? 0x44cc44 : pct > 0.25 ? 0xcccc22 : 0xcc2222;
  bar.rect(-HP_BAR_WIDTH / 2, HP_BAR_Y, HP_BAR_WIDTH * pct, HP_BAR_HEIGHT)
    .fill(color);
}

/**
 * Call after an enemy takes damage to refresh the bar.
 */
export function refreshHpBar(enemy) {
  drawHpBar(enemy.enemy);
}

/**
 * Advance an enemy along its waypoints.
 * Returns true if the enemy reached the end of the path.
 */
export function updateEnemy(enemy, dt) {
  const data = enemy.enemy;
  if (!data.alive || data.finished) return data.finished;

  const target = data.waypoints[data.waypointIndex + 1];
  if (!target) {
    data.finished = true;
    return true;
  }

  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const move = data.speed * dt;

  // Rotate sprite to face movement direction
  data.anim.rotation = Math.atan2(dy, dx);

  if (move >= dist) {
    enemy.x = target.x;
    enemy.y = target.y;
    data.waypointIndex++;
    if (move > dist && data.waypointIndex + 1 < data.waypoints.length) {
      return updateEnemy(enemy, (move - dist) / data.speed);
    }
    if (data.waypointIndex + 1 >= data.waypoints.length) {
      data.finished = true;
      return true;
    }
  } else {
    enemy.x += (dx / dist) * move;
    enemy.y += (dy / dist) * move;
  }

  return false;
}

/**
 * Convert tile-coordinate waypoints to pixel centers.
 */
export function waypointsToPixels(waypoints, tileSize) {
  return waypoints.map(wp => ({
    x: wp.col * tileSize + tileSize / 2,
    y: wp.row * tileSize + tileSize / 2,
  }));
}
