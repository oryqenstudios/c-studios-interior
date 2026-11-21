import gsap from 'gsap';

// Real-life photographs of the four rooms. Each one was generated from a frame of the 3D
// model at `capture` percent of the story, so it lines up with the 3D view at that point.
// Inside `window` the camera holds still at the capture point and the photograph fades in
// over the 3D view; outside it the walkthrough carries on in 3D.
export const PHOTOS = {
  living: { stage: [70, 77], capture: 74, window: [72.4, 75.8] },
  kitchen: { stage: [77, 83], capture: 80, window: [79.2, 82] },
  bedroom: { stage: [83, 91], capture: 90, window: [88.8, 90.6] },
  bathroom: { stage: [91, 95], capture: 94, window: [93.2, 94.7] },
};

const FADE = 0.45; // scroll percent taken by each fade (kept short: the photograph and the 3D view do not line up to the pixel)
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, t) => a + (b - a) * t;

// Hashed URLs of every size of every photograph.
const files = import.meta.glob('../assets/rooms/*.webp', { eager: true, query: '?url', import: 'default' });
const urlFor = (room, width) => files[`../assets/rooms/${room}-${width}.webp`];

// Scroll percentage the camera should use: it reaches the capture point as the photograph
// starts to appear and stays there until it has gone. `gates` says how far each room's
// photograph is switched on (0 = off, so the walkthrough is unchanged).
export function cameraPercent(p, gates) {
  for (const [room, { stage, capture, window }] of Object.entries(PHOTOS)) {
    if (p < stage[0] || p > stage[1]) continue;
    let held;
    if (p < window[0]) held = mix(stage[0], capture, (p - stage[0]) / (window[0] - stage[0]));
    else if (p > window[1]) held = mix(capture, stage[1], (p - window[1]) / (stage[1] - window[1]));
    else held = capture;
    return mix(p, held, gates[room]);
  }
  return p;
}

export function initPhotos({ ui, getMood, reducedMotion }) {
  const layer = document.querySelector('.photos');
  if (!layer) return null;
  const note = layer.querySelector('.photos__note');
  const images = Object.fromEntries([...layer.querySelectorAll('img[data-photo]')].map((img) => [img.dataset.photo, img]));
  const loaded = {};
  let requested = false;

  // The photographs show the default materials, so they step aside for the other moods.
  function refresh() {
    for (const room of Object.keys(PHOTOS)) {
      const on = loaded[room] && getMood() === 'olive' ? 1 : 0;
      gsap.to(ui.photo, { [room]: on, duration: reducedMotion ? 0 : 0.5, overwrite: 'auto' });
    }
  }

  // Loaded only once the visitor is well into the story, to keep the first load light.
  function request() {
    requested = true;
    const width = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 1100 ? 1920 : 960;
    for (const [room, img] of Object.entries(images)) {
      const url = urlFor(room, width);
      if (!url) continue;
      img.addEventListener('load', () => {
        loaded[room] = true;
        refresh();
      });
      img.src = url;
    }
  }

  return {
    refresh,
    // Called every frame with the scroll percentage.
    update(p) {
      if (!requested && p > 40) request();
      let strongest = 0;
      for (const [room, { window }] of Object.entries(PHOTOS)) {
        const img = images[room];
        if (!img) continue;
        const inside = Math.min(clamp01((p - window[0]) / FADE), clamp01((window[1] - p) / FADE));
        const opacity = inside * ui.photo[room];
        if (img.dataset.o !== String(opacity)) {
          img.dataset.o = String(opacity);
          img.style.opacity = opacity;
          img.style.visibility = opacity > 0 ? 'visible' : 'hidden';
        }
        if (opacity > 0) {
          // a very slow push-in while the photograph is on screen
          const travel = clamp01((p - window[0]) / (window[1] - window[0]));
          img.style.transform = `scale(${1 + 0.035 * travel})`;
        }
        strongest = Math.max(strongest, opacity);
      }
      if (note) note.style.opacity = strongest;
    },
  };
}
