import { Container, Graphics, Sprite } from 'pixi.js';
import gsap from 'gsap';
import { playSfx } from './sfx.js';

let pathTilesRef = new Set();
let tileSize = 64;
let towerContainerRef = null;

export function initDrag(towerContainer, tSize) {
  towerContainerRef = towerContainer;
  tileSize = tSize;
}

export function setPathTiles(pathTiles) {
  pathTilesRef = pathTiles;
}

function tileKey(px, py) {
  const col = Math.floor(px / tileSize);
  const row = Math.floor(py / tileSize);
  return `${col},${row}`;
}

function snapToTile(px, py) {
  const col = Math.floor(px / tileSize);
  const row = Math.floor(py / tileSize);
  return {
    x: col * tileSize + tileSize / 2,
    y: row * tileSize + tileSize / 2,
  };
}

function isTileOccupied(x, y, ignoreTower) {
  for (const tower of towerContainerRef.children) {
    if (tower === ignoreTower || tower === ignoreTower._ghost) continue;
    if (Math.abs(tower.x - x) < 1 && Math.abs(tower.y - y) < 1) return true;
  }
  return false;
}

function isValidDrop(px, py, tower) {
  const snapped = snapToTile(px, py);
  const key = tileKey(px, py);
  return !pathTilesRef.has(key) && !isTileOccupied(snapped.x, snapped.y, tower);
}

function createGhost(tower) {
  const ghost = new Container();
  ghost.x = tower.x;
  ghost.y = tower.y;
  ghost.scale.set(tower.scale.x, tower.scale.y);
  ghost.alpha = 0.3;

  // Clone the base and weapon sprites
  for (const child of tower.children) {
    if (child instanceof Sprite) {
      const clone = Sprite.from(child.texture);
      clone.anchor.set(child.anchor.x, child.anchor.y);
      clone.rotation = child.rotation;
      clone.tint = 0x88aaff;
      ghost.addChild(clone);
    }
  }

  return ghost;
}

export function makeDraggable(tower) {
  tower.eventMode = 'static';
  tower.cursor = 'grab';

  let dragging = false;
  let originX, originY;
  let ghost = null;

  tower.on('pointerdown', (e) => {
    if (tower._animating) return;
    dragging = true;
    playSfx('tower_pickup');
    originX = tower.x;
    originY = tower.y;

    // Create ghost at original position
    ghost = createGhost(tower);
    tower._ghost = ghost;
    towerContainerRef.addChild(ghost);

    // Bring tower to front
    towerContainerRef.setChildIndex(tower, towerContainerRef.children.length - 1);

    tower.cursor = 'grabbing';
    tower.alpha = 0.9;

    e.stopPropagation();
  });

  tower.on('globalpointermove', (e) => {
    if (!dragging) return;

    const pos = e.getLocalPosition(tower.parent);
    const snapped = snapToTile(pos.x, pos.y);
    tower.x = snapped.x;
    tower.y = snapped.y;

    // Tint red if invalid, normal if valid
    const valid = isValidDrop(pos.x, pos.y, tower);
    for (const child of tower.children) {
      if (child instanceof Sprite) {
        child.tint = valid ? 0xffffff : 0xff4444;
      }
    }
  });

  tower.on('pointerup', onDrop);
  tower.on('pointerupoutside', onDrop);

  function onDrop(e) {
    if (!dragging) return;
    dragging = false;
    tower.cursor = 'grab';

    const pos = e.getLocalPosition(tower.parent);
    const valid = isValidDrop(pos.x, pos.y, tower);

    // Reset tint
    for (const child of tower.children) {
      if (child instanceof Sprite) {
        child.tint = 0xffffff;
      }
    }

    if (valid) {
      // Valid drop — snap into place, remove ghost
      const snapped = snapToTile(pos.x, pos.y);
      tower.x = snapped.x;
      tower.y = snapped.y;
      tower.alpha = 1;
      playSfx('tower_place');
      if (ghost) {
        ghost.destroy();
        ghost = null;
        tower._ghost = null;
      }
    } else {
      // Invalid drop — animate back to origin
      playSfx('tower_invalid');
      tower._animating = true;
      tower.eventMode = 'none';
      gsap.to(tower, {
        x: originX,
        y: originY,
        duration: 0.35,
        ease: 'back.out(1.7)',
        onComplete: () => {
          tower.alpha = 1;
          tower._animating = false;
          tower.eventMode = 'static';
          if (ghost) {
            ghost.destroy();
            ghost = null;
            tower._ghost = null;
          }
        },
      });
    }
  }
}
