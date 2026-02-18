import { Assets, Rectangle, Sprite, Texture } from 'pixi.js';

const VFX_DEFS = {
  cannonFire: 'assets/vfx/vfx-cartoon_smoke_07',
  cannonHit:  'assets/vfx/vfx-cell_shading_smoke_04',
  missileHit: 'assets/vfx/vfx-cell_shading_smoke_04',
  mgHit:      'assets/vfx/vfx-energy_09',
  explosion:  'assets/vfx/vfx-explosion_01',
};

const frameCache = {};

export async function loadVfxAssets() {
  const uniquePaths = [...new Set(Object.values(VFX_DEFS))];

  await Promise.all(uniquePaths.map(async (basePath) => {
    const [meta, atlas] = await Promise.all([
      fetch(`${import.meta.env.BASE_URL}${basePath}.json`).then((r) => r.json()),
      Assets.load(`${basePath}.png`),
    ]);

    const frames = [];
    for (let i = 0; i < meta.frames; i++) {
      const col = i % meta.cols;
      const row = Math.floor(i / meta.cols);
      frames.push(new Texture({
        source: atlas.source,
        frame: new Rectangle(
          col * meta.frameWidth,
          row * meta.frameHeight,
          meta.frameWidth,
          meta.frameHeight,
        ),
      }));
    }
    frameCache[basePath] = frames;
  }));
}

const POOL_SIZE = 30;
const pool = [];

export function initVfxPool(container) {
  for (let i = 0; i < POOL_SIZE; i++) {
    const sprite = new Sprite();
    sprite.anchor.set(0.5);
    sprite.visible = false;
    sprite.vfx = { active: false, frames: null, index: 0, timer: 0 };
    container.addChild(sprite);
    pool.push(sprite);
  }
}

const VFX_FPS = 30;

export function playVfx(type, x, y, rotation = 0, scale = 0.4) {
  const basePath = VFX_DEFS[type];
  const frames = frameCache[basePath];
  if (!frames) return;

  const sprite = pool.find((s) => !s.vfx.active);
  if (!sprite) return;

  sprite.vfx.active = true;
  sprite.vfx.frames = frames;
  sprite.vfx.index = 0;
  sprite.vfx.timer = 0;
  sprite.texture = frames[0];
  sprite.x = x;
  sprite.y = y;
  sprite.rotation = rotation;
  sprite.scale.set(scale);
  sprite.visible = true;
}

export function updateVfx(dt) {
  const frameDuration = 1 / VFX_FPS;

  for (const sprite of pool) {
    if (!sprite.vfx.active) continue;

    sprite.vfx.timer += dt;
    while (sprite.vfx.timer >= frameDuration) {
      sprite.vfx.timer -= frameDuration;
      sprite.vfx.index++;

      if (sprite.vfx.index >= sprite.vfx.frames.length) {
        sprite.vfx.active = false;
        sprite.visible = false;
        break;
      }
      sprite.texture = sprite.vfx.frames[sprite.vfx.index];
    }
  }
}
