import { Assets, Container, Graphics, Sprite } from 'pixi.js';

const WEAPONS = [
  { type: 'cannon',   category: 'cannon',  asset: 'assets/cannons/sprite-cannon.png',            anchorY: 2 / 3, range: 5, fireRate: 1.5 },
  { type: 'cannon2',  category: 'cannon',  asset: 'assets/cannons/sprite-cannon2.png',           anchorY: 2 / 3, range: 5, fireRate: 1.5 },
  { type: 'cannon3',  category: 'cannon',  asset: 'assets/cannons/sprite-cannon3.png',           anchorY: 2 / 3, range: 5, fireRate: 1.5 },
  { type: 'mg',       category: 'mg',      asset: 'assets/cannons/sprite-mg.png',                anchorY: 3 / 4, range: 3, fireRate: 0.15 },
  { type: 'mg2',      category: 'mg',      asset: 'assets/cannons/sprite-mg2.png',               anchorY: 3 / 4, range: 3, fireRate: 0.15 },
  { type: 'mg3',      category: 'mg',      asset: 'assets/cannons/sprite-mg3.png',               anchorY: 3 / 4, range: 3, fireRate: 0.15 },
  { type: 'missile',  category: 'missile', asset: 'assets/cannons/sprite-missile-launcher.png',  anchorY: 0.5, range: 6, fireRate: 2.0 },
  { type: 'missile2', category: 'missile', asset: 'assets/cannons/sprite-missile-launcher2.png', anchorY: 0.5, range: 6, fireRate: 2.0 },
  { type: 'missile3', category: 'missile', asset: 'assets/cannons/sprite-missile-launcher3.png', anchorY: 0.5, range: 6, fireRate: 2.0 },
];

const WEAPON_MAP = Object.fromEntries(WEAPONS.map((w) => [w.type, w]));

export const weaponTypes = WEAPONS.map((w) => w.type);

export async function loadTowerAssets() {
  await Assets.load([
    'assets/cannons/sprite-tower.png',
    ...WEAPONS.map((w) => w.asset),
  ]);
}

export function createTower(weaponType = 'cannon', tileSize = 64) {
  const { asset, anchorY, range, category, fireRate } = WEAPON_MAP[weaponType];

  const tower = new Container();

  const base = Sprite.from('assets/cannons/sprite-tower.png');
  base.anchor.set(0.5);
  const scale = tileSize / base.texture.width;

  // Draw range circle in local space, compensating for container scale
  const worldRange = range * tileSize;
  const localRadius = worldRange / scale;
  const rangeCircle = new Graphics()
    .circle(0, 0, localRadius)
    .stroke({ color: 0xffffff, width: 1, alpha: 0.2 });
  tower.addChild(rangeCircle);

  tower.addChild(base);

  const weapon = Sprite.from(asset);
  weapon.anchor.set(0.5, anchorY);
  tower.addChild(weapon);

  tower.scale.set(scale);

  tower.weapon = weapon;
  tower.range = range * tileSize;
  tower.target = null;
  tower.category = category;
  tower.weaponType = weaponType;
  tower.fireRate = fireRate;
  tower.fireCooldown = 0;
  tower.muzzleOffset = weapon.texture.height * anchorY * scale;

  return tower;
}
