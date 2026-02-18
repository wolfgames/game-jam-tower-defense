import { Howl } from 'howler';

let howl = null;

export async function loadSfx() {
  const data = await fetch('assets/sfx/audiosprite.json').then((r) => r.json());
  howl = new Howl({
    src: data.src.map((s) => `assets/sfx/${s}`),
    sprite: data.sprite,
  });
}

export function playSfx(name, volume = 1) {
  if (!howl) return;
  const id = howl.play(name);
  if (volume !== 1) howl.volume(volume, id);
  return id;
}
