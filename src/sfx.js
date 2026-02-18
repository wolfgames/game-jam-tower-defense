import { Howl } from 'howler';

let howl = null;

export async function loadSfx() {
  const base = import.meta.env.BASE_URL;
  const data = await fetch(`${base}assets/sfx/audiosprite.json`).then((r) => r.json());
  howl = new Howl({
    src: data.src.map((s) => `${base}assets/sfx/${s}`),
    sprite: data.sprite,
  });
}

export function playSfx(name, volume = 1) {
  if (!howl) return;
  const id = howl.play(name);
  if (volume !== 1) howl.volume(volume, id);
  return id;
}
