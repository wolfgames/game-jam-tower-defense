import { Assets, Sprite, Texture } from 'pixi.js';
import { playVfx } from './vfx.js';
import { refreshHpBar } from './enemy.js';
import { playSfx } from './sfx.js';

const PROJECTILE_DEFS = {
  cannon:  { asset: 'assets/cannons/sprite-bullet-cannon.png', speed: 400, damage: 3 },
  mg:      { asset: 'assets/cannons/sprite-bullet-mg.png',     speed: 600, damage: 1 },
  missile: { asset: 'assets/cannons/sprite-missile.png',       speed: 250, damage: 5 },
};

const textureCache = {};

export async function loadProjectileAssets() {
  const assets = Object.values(PROJECTILE_DEFS).map((d) => d.asset);
  await Assets.load(assets);
  for (const [key, def] of Object.entries(PROJECTILE_DEFS)) {
    textureCache[key] = Texture.from(def.asset);
  }
}

const POOL_SIZE = 100;
const pool = [];
let enemies = null;

export function initProjectilePool(container, enemyContainer, splashRadius) {
  enemies = enemyContainer;
  for (let i = 0; i < POOL_SIZE; i++) {
    const sprite = new Sprite();
    sprite.anchor.set(0.5);
    sprite.visible = false;
    sprite.proj = {
      active: false,
      targetX: 0,
      targetY: 0,
      dirX: 0,
      dirY: 0,
      speed: 0,
      damage: 0,
      splashRadius: splashRadius,
    };
    container.addChild(sprite);
    pool.push(sprite);
  }
}

export function fireProjectile(category, x, y, rotation, targetX, targetY, weaponType) {
  const def = PROJECTILE_DEFS[category];
  if (!def) return;

  const sprite = pool.find((s) => !s.proj.active);
  if (!sprite) return;

  const dx = targetX - x;
  const dy = targetY - y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  sprite.texture = textureCache[category];
  sprite.scale.set(0.5);
  sprite.x = x;
  sprite.y = y;
  sprite.rotation = rotation;
  sprite.visible = true;
  sprite.proj.active = true;
  sprite.proj.targetX = targetX;
  sprite.proj.targetY = targetY;
  sprite.proj.dirX = dist > 0 ? dx / dist : 0;
  sprite.proj.dirY = dist > 0 ? dy / dist : 0;
  sprite.proj.speed = def.speed;
  sprite.proj.damage = def.damage;
  sprite.proj.weaponType = weaponType || category;
}

export function updateProjectiles(dt) {
  for (const sprite of pool) {
    if (!sprite.proj.active) continue;

    const p = sprite.proj;
    const move = p.speed * dt;

    const dx = p.targetX - sprite.x;
    const dy = p.targetY - sprite.y;
    const distToTarget = Math.sqrt(dx * dx + dy * dy);

    if (move >= distToTarget) {
      // Arrived — explode
      explode(p.targetX, p.targetY, p.damage, p.splashRadius, p.weaponType);
      sprite.proj.active = false;
      sprite.visible = false;
    } else {
      sprite.x += p.dirX * move;
      sprite.y += p.dirY * move;
    }
  }
}

function explode(x, y, damage, splashRadius, weaponType) {
  playVfx('explosion', x, y, 0, 0.5);
  playSfx(`${weaponType}_hit`);

  for (const enemy of enemies.children) {
    if (!enemy.enemy?.alive) continue;
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    if (Math.sqrt(dx * dx + dy * dy) <= splashRadius) {
      enemy.enemy.hp -= damage;
      refreshHpBar(enemy);
      if (enemy.enemy.hp <= 0) {
        enemy.enemy.alive = false;
        playSfx('zombie_death');
      } else {
        playSfx('zombie_hit', 0.5);
      }
    }
  }
}
