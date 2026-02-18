import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { generatePath, pathToSet } from './pathGenerator.js';
import { loadTowerAssets, createTower, weaponTypes } from './tower.js';
import { loadEnemyAssets, createEnemy, updateEnemy, waypointsToPixels } from './enemy.js';
import { createWaveSpawner } from './waves.js';
import { loadVfxAssets, initVfxPool, playVfx, updateVfx } from './vfx.js';
import { loadProjectileAssets, initProjectilePool, fireProjectile, updateProjectiles } from './projectile.js';
import { initDrag, setPathTiles, makeDraggable } from './towerDrag.js';
import { loadSfx, playSfx } from './sfx.js';

const TILE_SIZE = 64;

const app = new Application();

await app.init({
  background: '#2d5a1b',
  resizeTo: window,
});

document.body.appendChild(app.canvas);

const tileContainer = new Container();
const pathContainer = new Container();
const enemyContainer = new Container();
app.stage.addChild(tileContainer);
app.stage.addChild(pathContainer);

let currentSeed = 42;
let currentWaypoints = []; // pixel-coordinate waypoints for enemies
let currentWave = 0;
let waveSpawner = null;
let waveActive = false;
let lives = 20;

function draw() {
  tileContainer.removeChildren();
  pathContainer.removeChildren();

  const cols = Math.ceil(app.screen.width / TILE_SIZE);
  const rows = Math.ceil(app.screen.height / TILE_SIZE);

  const waypoints = generatePath(cols, rows, currentSeed);
  const pathTiles = pathToSet(waypoints);
  currentWaypoints = waypointsToPixels(waypoints, TILE_SIZE);

  // Draw grass everywhere (including behind path)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tile = new Graphics()
        .rect(0, 0, TILE_SIZE, TILE_SIZE)
        .fill(0x2a6e1a)
        .rect(0, 0, TILE_SIZE, TILE_SIZE)
        .stroke({ color: 0x245f16, width: 1, alpha: 0.3 });

      tile.x = col * TILE_SIZE;
      tile.y = row * TILE_SIZE;
      tileContainer.addChild(tile);
    }
  }

  setPathTiles(pathTiles);
  placeTowers(cols, rows, pathTiles);

  // Draw path (dirt tiles on top of grass)
  for (const key of pathTiles) {
    const [col, row] = key.split(',').map(Number);
    const tile = makeDirtTile(pathTiles, col, row);
    if (tile._needsCenter) {
      tile.x = col * TILE_SIZE + TILE_SIZE / 2;
      tile.y = row * TILE_SIZE + TILE_SIZE / 2;
    } else {
      tile.x = col * TILE_SIZE;
      tile.y = row * TILE_SIZE;
    }
    pathContainer.addChild(tile);
  }
}

await Promise.all([
  loadTowerAssets(), loadEnemyAssets(), loadVfxAssets(), loadProjectileAssets(),
  loadSfx(),
  Assets.load('assets/tiles/tiles-dirt.png'),
]);

const SHEET_TILE = 16;

// Dirt path tiles
const dirtBase = Texture.from('assets/tiles/tiles-dirt.png');
function dirtTex(col, row) {
  return new Texture({
    source: dirtBase.source,
    frame: new Rectangle(col * SHEET_TILE, row * SHEET_TILE, SHEET_TILE, SHEET_TILE),
  });
}
const dirtStraight = dirtTex(3, 1);  // vertical straight (x4 y2)
const dirtCorner   = dirtTex(4, 0);  // right+down turn (x4 y0)
const dirtDefault  = dirtTex(3, 3);  // fill fallback

function makeDirtTile(pathTiles, col, row) {
  const L = pathTiles.has(`${col - 1},${row}`);
  const R = pathTiles.has(`${col + 1},${row}`);
  const U = pathTiles.has(`${col},${row - 1}`);
  const D = pathTiles.has(`${col},${row + 1}`);

  const count = (L ? 1 : 0) + (R ? 1 : 0) + (U ? 1 : 0) + (D ? 1 : 0);

  let tex = dirtDefault;
  let rot = 0;

  if (count === 2) {
    // Corners
    if (R && D)      { tex = dirtCorner; rot = 0; }
    else if (L && D) { tex = dirtCorner; rot = Math.PI / 2; }
    else if (L && U) { tex = dirtCorner; rot = Math.PI; }
    else if (R && U) { tex = dirtCorner; rot = -Math.PI / 2; }
    // Straights
    else if (L && R) { tex = dirtStraight; rot = Math.PI / 2; }
    else if (U && D) { tex = dirtStraight; }
  } else if (count === 1) {
    // Dead ends — show straight in connected direction
    if (L || R) { tex = dirtStraight; rot = Math.PI / 2; }
    else        { tex = dirtStraight; }
  } else if (count === 3) {
    // T-junctions — straight for the through direction
    if (L && R) { tex = dirtStraight; rot = Math.PI / 2; }
    else        { tex = dirtStraight; }
  }
  // count === 4 or 0: dirtDefault

  const tile = new Sprite(tex);
  tile.anchor.set(0.5);
  tile.width = TILE_SIZE;
  tile.height = TILE_SIZE;
  tile.rotation = rot;
  tile._needsCenter = true;
  return tile;
}

const towerContainer = new Container();
const projectileContainer = new Container();
const vfxContainer = new Container();
app.stage.addChild(towerContainer);
app.stage.addChild(enemyContainer);
app.stage.addChild(projectileContainer);
app.stage.addChild(vfxContainer);

initProjectilePool(projectileContainer, enemyContainer, TILE_SIZE);
initVfxPool(vfxContainer);
initDrag(towerContainer, TILE_SIZE);

draw();

window.addEventListener('resize', draw);

// Regenerate button — top right
const regenBtn = new Container();
regenBtn.eventMode = 'static';
regenBtn.cursor = 'pointer';

const btnBg = new Graphics()
  .roundRect(0, 0, 120, 40, 8)
  .fill({ color: 0x222222, alpha: 0.8 })
  .roundRect(0, 0, 120, 40, 8)
  .stroke({ color: 0xffffff, width: 1, alpha: 0.4 });
regenBtn.addChild(btnBg);

const btnLabel = new Text({
  text: '↻ Regen',
  style: { fontFamily: 'monospace', fontSize: 18, fill: 0xffffff },
});
btnLabel.anchor.set(0.5);
btnLabel.x = 60;
btnLabel.y = 20;
regenBtn.addChild(btnLabel);

function positionRegenBtn() {
  regenBtn.x = app.screen.width - 132;
  regenBtn.y = 12;
}

positionRegenBtn();
window.addEventListener('resize', positionRegenBtn);
app.stage.addChild(regenBtn);

regenBtn.on('pointerdown', () => {
  currentSeed = Math.floor(Math.random() * 0xffffffff);
  draw();
});

// Start Wave button — top left
const waveBtn = new Container();
waveBtn.eventMode = 'static';
waveBtn.cursor = 'pointer';

const waveBtnBg = new Graphics()
  .roundRect(0, 0, 160, 40, 8)
  .fill({ color: 0x884422, alpha: 0.9 })
  .roundRect(0, 0, 160, 40, 8)
  .stroke({ color: 0xffcc88, width: 1, alpha: 0.6 });
waveBtn.addChild(waveBtnBg);

const waveBtnLabel = new Text({
  text: 'Start Wave 1',
  style: { fontFamily: 'monospace', fontSize: 18, fill: 0xffffff },
});
waveBtnLabel.anchor.set(0.5);
waveBtnLabel.x = 80;
waveBtnLabel.y = 20;
waveBtn.addChild(waveBtnLabel);

waveBtn.x = 12;
waveBtn.y = 12;
app.stage.addChild(waveBtn);

// HUD — lives display
const hudText = new Text({
  text: `Lives: ${lives}`,
  style: { fontFamily: 'monospace', fontSize: 16, fill: 0xffffff },
});
hudText.x = 12;
hudText.y = 60;
app.stage.addChild(hudText);

function updateHud() {
  hudText.text = `Lives: ${lives}`;
  if (waveActive) {
    waveBtnLabel.text = `Wave ${currentWave + 1}...`;
    waveBtn.alpha = 0.5;
    waveBtn.eventMode = 'none';
  } else {
    const next = currentWave + 1;
    waveBtnLabel.text = `Start Wave ${next}`;
    waveBtn.alpha = 1;
    waveBtn.eventMode = 'static';
  }
}

function startWave() {
  if (waveActive) return;
  waveActive = true;
  updateHud();
  playSfx('wave_start');
  playSfx('zombie_spawn', 0.4);

  waveSpawner = createWaveSpawner(currentWave, (opts) => {
    const enemy = createEnemy(currentWaypoints, opts);
    enemyContainer.addChild(enemy);
  }, () => {
    // All enemies spawned — wave completion handled in ticker when last enemy exits
  });
}

waveBtn.on('pointerdown', startWave);

const TURRET_ROTATE_SPEED = 3; // radians per second
const AIM_THRESHOLD = 0.05; // radians — close enough to fire

function findTarget(tower) {
  let closest = null;
  let closestDist = Infinity;

  for (const enemy of enemyContainer.children) {
    if (!enemy.enemy.alive) continue;
    const dx = enemy.x - tower.x;
    const dy = enemy.y - tower.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= tower.range && dist < closestDist) {
      closest = enemy;
      closestDist = dist;
    }
  }

  return closest;
}

function angleTo(tower, enemy) {
  return Math.atan2(enemy.x - tower.x, -(enemy.y - tower.y));
}

function shortestAngleDist(from, to) {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

app.ticker.add((ticker) => {
  const dt = ticker.deltaTime / 60;

  // Aim turrets at enemies
  for (const tower of towerContainer.children) {
    // Acquire or drop target
    if (!tower.target || !tower.target.enemy.alive || !tower.target.parent) {
      tower.target = null;
    }

    // Check if current target is still in range
    if (tower.target) {
      const dx = tower.target.x - tower.x;
      const dy = tower.target.y - tower.y;
      if (Math.sqrt(dx * dx + dy * dy) > tower.range) {
        tower.target = null;
      }
    }

    if (!tower.target) {
      tower.target = findTarget(tower);
    }

    tower.fireCooldown = Math.max(0, tower.fireCooldown - dt);

    if (tower.target) {
      const desired = angleTo(tower, tower.target);
      const diff = shortestAngleDist(tower.weapon.rotation, desired);

      if (Math.abs(diff) < AIM_THRESHOLD) {
        tower.weapon.rotation = desired;

        // Fire when cooldown ready
        if (tower.fireCooldown <= 0) {
          tower.fireCooldown = tower.fireRate;

          const muzzleX = tower.x + Math.sin(tower.weapon.rotation) * tower.muzzleOffset;
          const muzzleY = tower.y - Math.cos(tower.weapon.rotation) * tower.muzzleOffset;

          fireProjectile(tower.category, muzzleX, muzzleY, tower.weapon.rotation, tower.target.x, tower.target.y, tower.weaponType);
          playSfx(`${tower.weaponType}_fire`, tower.category === 'mg' ? 0.3 : 1);

          // Muzzle flash VFX for cannons and missiles — offset beyond the barrel tip
          if (tower.category === 'cannon' || tower.category === 'missile') {
            const vfxOffset = tower.muzzleOffset * 0.5;
            const vfxX = muzzleX + Math.sin(tower.weapon.rotation) * vfxOffset;
            const vfxY = muzzleY - Math.cos(tower.weapon.rotation) * vfxOffset;
            playVfx('cannonFire', vfxX, vfxY, tower.weapon.rotation + Math.PI / 2, 0.6);
          }
        }
      } else {
        tower.weapon.rotation += Math.sign(diff) * Math.min(TURRET_ROTATE_SPEED * dt, Math.abs(diff));
      }
    }
  }

  // Update projectiles and VFX
  updateProjectiles(dt);
  updateVfx(dt);

  // Tick wave spawner
  if (waveSpawner && !waveSpawner.done) {
    waveSpawner.update(dt);
  }

  // Update enemies
  for (let i = enemyContainer.children.length - 1; i >= 0; i--) {
    const enemy = enemyContainer.children[i];
    const reached = updateEnemy(enemy, dt);
    if (reached) {
      lives--;
      playSfx('life_lost');
      enemyContainer.removeChildAt(i);
      enemy.destroy();
      updateHud();
    } else if (!enemy.enemy.alive) {
      enemyContainer.removeChildAt(i);
      enemy.destroy();
    }
  }

  // Wave complete: all spawned and no enemies left
  if (waveActive && waveSpawner?.done && enemyContainer.children.length === 0) {
    waveActive = false;
    currentWave++;
    playSfx('wave_complete');
    updateHud();
  }
});

function placeTowers(cols, rows, pathTiles) {
  towerContainer.removeChildren();

  const grassTiles = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!pathTiles.has(`${col},${row}`)) {
        grassTiles.push({ col, row });
      }
    }
  }

  for (const type of weaponTypes) {
    const idx = Math.floor(Math.random() * grassTiles.length);
    const { col, row } = grassTiles.splice(idx, 1)[0];

    const tower = createTower(type, TILE_SIZE);
    tower.x = col * TILE_SIZE + TILE_SIZE / 2;
    tower.y = row * TILE_SIZE + TILE_SIZE / 2;
    makeDraggable(tower);
    towerContainer.addChild(tower);
  }
}
