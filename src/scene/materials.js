import {
  CanvasTexture,
  Color,
  DoubleSide,
  FrontSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';

export const PALETTE = {
  ink: 0x141312,
  plaster: 0xede6da,
  muted: 0xa59c90,
  brass: 0xb8935a,
};

export const MOODS = {
  olive: { label: 'Olive and walnut', walls: 0x46503f, timber: 0x7a5638, fabric: 0xe6dccb },
  sand: { label: 'Sand and oak', walls: 0xb7a68c, timber: 0xb08d62, fabric: 0xf1ebe0 },
  charcoal: { label: 'Charcoal and stone', walls: 0x2f2f31, timber: 0x54453a, fabric: 0xc9c2b6 },
};

export const DEFAULT_MOOD = 'olive';

// Small deterministic random generator so textures and tone variation are the same on every load.
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(size, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

// Near-white grain that multiplies the material colour, so one texture serves every mood.
function timberTexture() {
  const rand = seededRandom(11);
  return canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 90; i++) {
      const y = rand() * size;
      const shade = 150 + Math.floor(rand() * 70);
      ctx.strokeStyle = `rgba(${shade}, ${shade - 12}, ${shade - 26}, ${0.1 + rand() * 0.16})`;
      ctx.lineWidth = 0.6 + rand() * 1.8;
      ctx.beginPath();
      const wobble = 1 + rand() * 2.5;
      const phase = rand() * Math.PI * 2;
      for (let x = 0; x <= size; x += 8) {
        const yy = y + Math.sin((x / size) * Math.PI * 2 + phase) * wobble;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  });
}

function marbleTexture() {
  const rand = seededRandom(29);
  return canvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#f3f0ea';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 14; i++) {
      let x = rand() * size;
      let y = rand() * size;
      let angle = rand() * Math.PI * 2;
      ctx.strokeStyle = `rgba(120, 116, 110, ${0.08 + rand() * 0.16})`;
      ctx.lineWidth = 0.5 + rand() * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const steps = 30 + Math.floor(rand() * 40);
      for (let s = 0; s < steps; s++) {
        angle += (rand() - 0.5) * 0.7;
        x += Math.cos(angle) * 9;
        y += Math.sin(angle) * 9;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
}

const matte = (color, extra = {}) =>
  new MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...extra });

const glow = () =>
  new MeshStandardMaterial({
    color: 0xf1e6d2,
    roughness: 0.6,
    emissive: 0xffc98a,
    emissiveIntensity: 0,
  });

export function createMaterials() {
  const grain = timberTexture();
  const veins = marbleTexture();

  const mats = {
    // Mood-driven
    wall: matte(0xffffff, { roughness: 0.95 }),
    floorTimber: matte(0xffffff, { map: grain, roughness: 0.7 }),
    timber: matte(0xffffff, { map: grain, roughness: 0.65 }),
    fabric: matte(0xffffff, { roughness: 1 }),
    fabricDeep: matte(0xffffff, { roughness: 1 }),

    // Fixed
    // A faint glow of its own keeps the table from ever falling below the page background.
    ground: matte(0x1c1a18, { roughness: 1, emissive: PALETTE.ink, emissiveIntensity: 1.7 }),
    ceiling: matte(PALETTE.plaster, { side: FrontSide }),
    tile: matte(0xb5aea2, { roughness: 0.75 }),
    stone: matte(0x8f897e, { roughness: 0.8 }),
    marble: matte(0xffffff, { map: veins, roughness: 0.35 }),
    linen: matte(0xf3eee5, { roughness: 1 }),
    ceramic: matte(0xf4f1ec, { roughness: 0.25 }),
    dark: matte(0x1d1c1b, { roughness: 0.55 }),
    brass: matte(PALETTE.brass, { roughness: 0.4, metalness: 0.6 }),
    mirror: matte(0xb9c2c0, { roughness: 0.15, metalness: 0.35 }),
    glass: new MeshStandardMaterial({
      color: 0xcfe0dc,
      roughness: 0.08,
      transparent: true,
      opacity: 0.22,
      side: DoubleSide,
      depthWrite: false,
    }),
    plant: matte(0x5d6b49, { roughness: 0.9 }),
    pot: matte(0xcfc6b6, { roughness: 0.85 }),

    // Plan drawing
    planLine: new MeshBasicMaterial({ color: PALETTE.plaster, transparent: true, fog: false }),
    planSwing: new MeshBasicMaterial({ color: PALETTE.brass, transparent: true, fog: false, side: DoubleSide }),

    // Glowing parts, one material per room so rooms can light up in turn
    glow: { living: glow(), kitchen: glow(), bedroom: glow(), bathroom: glow() },
  };

  setMood(mats, DEFAULT_MOOD);
  return mats;
}

const scratch = new Color();

export function setMood(mats, key) {
  const mood = MOODS[key] ?? MOODS[DEFAULT_MOOD];
  mats.wall.color.setHex(mood.walls);
  mats.floorTimber.color.setHex(mood.timber);
  // Furniture timber sits a little deeper than the floor so pieces read against the boards.
  mats.timber.color.copy(scratch.setHex(mood.timber)).multiplyScalar(0.72);
  mats.fabric.color.setHex(mood.fabric);
  mats.fabricDeep.color.copy(scratch.setHex(mood.fabric)).multiplyScalar(0.62);
}
