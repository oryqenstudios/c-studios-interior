import {
  Box3,
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Path,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { WALL_H } from './apartment.js';

/* ---------- helpers ---------- */

const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

function add(parent, geometry, material, x, y, z, shadow = true) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  parent.add(mesh);
  return mesh;
}

// Box with softly rounded edges. Position is the centre in x and z and the underside in y.
function box(parent, material, [w, h, d], [x, y, z], radius = 0.015) {
  const r = Math.min(radius, Math.min(w, h, d) / 2 - 0.001);
  const geometry =
    r > 0.003
      ? cached(`rb:${w}:${h}:${d}:${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r))
      : cached(`b:${w}:${h}:${d}`, () => new BoxGeometry(w, h, d));
  return add(parent, geometry, material, x, y + h / 2, z);
}

// Upright cylinder or cone. Position is the centre in x and z and the underside in y.
function cyl(parent, material, rTop, rBottom, h, [x, y, z], segments = 32) {
  const geometry = cached(`c:${rTop}:${rBottom}:${h}:${segments}`, () => new CylinderGeometry(rTop, rBottom, h, segments));
  return add(parent, geometry, material, x, y + h / 2, z);
}

function sphere(parent, material, r, [x, y, z]) {
  return add(parent, cached(`s:${r}`, () => new SphereGeometry(r, 32, 20)), material, x, y, z);
}

// Rounded-end ("stadium") outline in the XY plane, used for extruded forms.
function stadium(target, length, width) {
  const r = width / 2;
  const half = length / 2 - r;
  target.moveTo(-half, -r);
  target.lineTo(half, -r);
  target.absarc(half, 0, r, -Math.PI / 2, Math.PI / 2, false);
  target.lineTo(-half, r);
  target.absarc(-half, 0, r, Math.PI / 2, (Math.PI * 3) / 2, false);
  return target;
}

// A row of identical thin dark reveals (cabinet door joints), drawn as one instanced mesh.
function reveals(parent, material, [w, h, d], count, place) {
  const mesh = new InstancedMesh(cached(`b:${w}:${h}:${d}`, () => new BoxGeometry(w, h, d)), material, count);
  const matrix = new Matrix4();
  for (let i = 0; i < count; i++) {
    const [x, y, z] = place(i);
    matrix.makeTranslation(x, y + h / 2, z);
    mesh.setMatrixAt(i, matrix);
  }
  parent.add(mesh);
  return mesh;
}

function piece(name, room, x = 0, z = 0, rotationY = 0) {
  const group = new Group();
  group.name = name;
  group.userData.room = room;
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  return group;
}

function pendant(group, m, glow, dropTo, radius) {
  const cord = WALL_H - dropTo - radius;
  cyl(group, m.dark, 0.006, 0.006, cord, [0, dropTo + radius, 0], 8).castShadow = false;
  cyl(group, m.brass, 0.03, 0.03, 0.03, [0, dropTo + radius * 2 - 0.012, 0], 16);
  const globe = sphere(group, glow, radius, [0, dropTo + radius, 0]);
  globe.castShadow = false;
  return group;
}

/* ---------- living and dining ---------- */

function livingRug(m) {
  const g = piece('Living rug', 'living', 2.15, 0);
  box(g, m.fabricDeep, [2.7, 0.016, 3.3], [0, 0, 0], 0);
  box(g, m.fabric, [2.46, 0.018, 3.06], [0, 0, 0], 0);
  return g;
}

function sofa(m) {
  // Faces east (+x), toward the slat wall.
  const g = piece('Sofa', 'living', 1.0, 0);
  for (const sx of [-0.38, 0.38]) for (const sz of [-1.05, 1.05]) cyl(g, m.dark, 0.02, 0.02, 0.1, [sx, 0, sz], 12);
  box(g, m.fabric, [0.95, 0.24, 2.3], [0, 0.1, 0], 0.05);
  box(g, m.fabric, [0.24, 0.52, 2.3], [-0.355, 0.32, 0], 0.07); // back
  for (const sz of [-1, 1]) {
    box(g, m.fabric, [0.95, 0.34, 0.22], [0, 0.3, sz * 1.04], 0.07); // arms
    box(g, m.fabric, [0.68, 0.16, 0.9], [0.12, 0.33, sz * 0.46], 0.06); // seat cushions
    const cushion = box(g, m.fabricDeep, [0.14, 0.4, 0.42], [-0.16, 0.5, sz * 0.62], 0.06);
    cushion.rotation.z = 0.22;
  }
  return g;
}

function coffeeTable(m) {
  const g = piece('Coffee table', 'living', 2.3, 0);
  box(g, m.stone, [0.7, 0.3, 1.2], [0, 0, 0], 0.06);
  return g;
}

function slatWall(m) {
  // Slatted timber wall on the east side, with the cove light strip above it.
  const g = piece('Slat wall', 'living', 0, 0);
  const z0 = -2.4;
  const z1 = 2.4;
  const height = 2.42;
  box(g, m.dark, [0.02, height, z1 - z0], [3.913, 0, 0], 0).castShadow = false;

  const pitch = 0.08;
  const count = Math.floor((z1 - z0) / pitch);
  const slats = new InstancedMesh(new BoxGeometry(0.032, height, 0.042), m.timber, count);
  const matrix = new Matrix4();
  for (let i = 0; i < count; i++) {
    matrix.makeTranslation(3.888, height / 2, z0 + pitch / 2 + i * pitch);
    slats.setMatrixAt(i, matrix);
  }
  slats.castShadow = true;
  slats.receiveShadow = true;
  g.add(slats);

  // Cove strip: glows at night.
  box(g, m.glow.living, [0.05, 0.03, z1 - z0], [3.895, height + 0.03, 0], 0).castShadow = false;
  return g;
}

function mediaConsole(m) {
  // Low wall-hung console with a dark screen above it.
  const g = piece('Console and screen', 'living', 0, 0);
  box(g, m.timber, [0.42, 0.34, 2.3], [3.655, 0.16, 0], 0.02);
  box(g, m.stone, [0.44, 0.02, 2.32], [3.65, 0.5, 0], 0);
  box(g, m.dark, [0.03, 0.82, 1.45], [3.85, 0.95, 0], 0.01);
  return g;
}

function floorLamp(m) {
  const g = piece('Floor lamp', 'living', 0.8, -1.75);
  cyl(g, m.dark, 0.15, 0.16, 0.02, [0, 0, 0]);
  cyl(g, m.brass, 0.012, 0.012, 1.42, [0, 0.02, 0], 12);
  cyl(g, m.glow.living, 0.15, 0.2, 0.26, [0, 1.38, 0]).castShadow = false;
  return g;
}

function diningTable(m) {
  const g = piece('Dining table', 'living', -2.2, 0.2);
  cyl(g, m.timber, 0.3, 0.32, 0.03, [0, 0, 0], 48);
  cyl(g, m.timber, 0.05, 0.08, 0.68, [0, 0.03, 0], 24);
  cyl(g, m.timber, 0.6, 0.58, 0.04, [0, 0.71, 0], 64);
  return g;
}

function diningChair(m, index) {
  // Four chairs on the diagonals, each facing the table centre.
  const angle = Math.PI / 4 + (index * Math.PI) / 2;
  const reach = 0.78;
  const g = piece(`Dining chair ${index + 1}`, 'living', -2.2 + Math.cos(angle) * reach, 0.2 + Math.sin(angle) * reach);
  // Local +x points away from the table, so the back sits on the outside.
  g.rotation.y = -angle;
  for (const sx of [-0.15, 0.15]) for (const sz of [-0.15, 0.15]) cyl(g, m.dark, 0.012, 0.012, 0.42, [sx, 0, sz], 8);
  cyl(g, m.fabric, 0.21, 0.2, 0.06, [0, 0.42, 0], 32);
  const back = add(
    g,
    cached('chair-back', () => new CylinderGeometry(0.21, 0.21, 0.3, 24, 1, true, Math.PI / 2 - 0.9, 1.8)),
    m.timberBack,
    0,
    0.63,
    0,
  );
  back.rotation.y = 0;
  return g;
}

function diningPendant(m) {
  const g = piece('Dining pendant', 'living', -2.2, 0.2);
  return pendant(g, m, m.glow.living, 1.45, 0.16);
}

function plant(m) {
  const g = piece('Potted plant', 'living', -3.42, -1.95);
  cyl(g, m.pot, 0.2, 0.15, 0.36, [0, 0, 0]);
  cyl(g, m.dark, 0.185, 0.185, 0.01, [0, 0.352, 0]).castShadow = false;
  const leaf = cached('leaf', () => new SphereGeometry(1, 16, 12));
  const leaves = 9;
  for (let i = 0; i < leaves; i++) {
    const angle = (i / leaves) * Math.PI * 2 + (i % 2) * 0.3;
    const tilt = 0.35 + (i % 3) * 0.22;
    const length = 0.34 + (i % 4) * 0.05;
    const holder = new Group();
    holder.position.set(0, 0.36, 0);
    holder.rotation.set(0, angle, 0);
    const blade = add(holder, leaf, m.plant, Math.sin(tilt) * length, Math.cos(tilt) * length + 0.1, 0);
    blade.scale.set(0.085, length, 0.03);
    blade.rotation.z = -tilt;
    g.add(holder);
  }
  return g;
}

/* ---------- kitchen ---------- */

function kitchenCounter(m) {
  // Counter run along the south wall with marble top, splashback and upper cabinets.
  const g = piece('Kitchen counter', 'kitchen', -0.3, 0);
  const length = 7.25;
  box(g, m.dark, [length - 0.1, 0.1, 0.5], [0, 0, 5.655], 0);
  box(g, m.timber, [length, 0.78, 0.58], [0, 0.1, 5.635], 0.008);
  box(g, m.marble, [length, 0.04, 0.62], [0, 0.88, 5.615], 0.008);
  box(g, m.marble, [length, 0.58, 0.016], [0, 0.92, 5.917], 0);
  // Door joints, cut as thin dark reveals.
  reveals(g, m.dark, [0.006, 0.76, 0.004], 11, (i) => [-length / 2 + ((i + 1) * length) / 12, 0.11, 5.345]);
  return g;
}

function upperCabinets(m) {
  const g = piece('Upper cabinets', 'kitchen', -0.3, 0);
  const length = 7.25;
  box(g, m.timber, [length, 0.72, 0.35], [0, 1.5, 5.75], 0.008);
  reveals(g, m.dark, [0.006, 0.7, 0.004], 11, (i) => [-length / 2 + ((i + 1) * length) / 12, 1.51, 5.574]);
  // Under-cabinet strip: glows at night.
  box(g, m.glow.kitchen, [length - 0.2, 0.012, 0.03], [0, 1.487, 5.8], 0).castShadow = false;
  return g;
}

function tallUnit(m) {
  const g = piece('Tall unit', 'kitchen', 3.625, 5.15);
  box(g, m.dark, [0.5, 0.1, 1.5], [-0.03, 0, 0], 0);
  box(g, m.timber, [0.6, 2.2, 1.55], [0, 0.1, 0], 0.008);
  for (const z of [-0.26, 0.26]) box(g, m.dark, [0.004, 2.18, 0.006], [-0.3, 0.11, z], 0).castShadow = false;
  return g;
}

function island(m) {
  const g = piece('Island', 'kitchen', -0.3, 3.9);
  box(g, m.dark, [2.2, 0.1, 0.7], [0, 0, 0.03], 0);
  box(g, m.timber, [2.3, 0.78, 0.8], [0, 0.1, 0.05], 0.008);
  box(g, m.marble, [2.5, 0.04, 1.0], [0, 0.88, 0], 0.01);
  return g;
}

function stool(m, index) {
  const g = piece(`Stool ${index + 1}`, 'kitchen', -1.1 + index * 0.8, 3.22);
  cyl(g, m.dark, 0.17, 0.18, 0.015, [0, 0, 0]);
  cyl(g, m.dark, 0.016, 0.016, 0.62, [0, 0.015, 0], 12);
  const ring = add(g, cached('stool-ring', () => new TorusGeometry(0.13, 0.008, 8, 32)), m.brass, 0, 0.26, 0);
  ring.rotation.x = Math.PI / 2;
  cyl(g, m.fabric, 0.17, 0.16, 0.06, [0, 0.635, 0]);
  return g;
}

function islandPendant(m, index) {
  const g = piece(`Island pendant ${index + 1}`, 'kitchen', -1.1 + index * 0.8, 3.9);
  return pendant(g, m, m.glow.kitchen, 1.7, 0.09);
}

/* ---------- bedroom ---------- */

function bedroomRug(m) {
  const g = piece('Bedroom rug', 'bedroom', 2.0, -3.95);
  box(g, m.fabricDeep, [3.0, 0.016, 2.1], [0, 0, 0], 0);
  box(g, m.fabric, [2.78, 0.018, 1.88], [0, 0, 0], 0);
  return g;
}

function bed(m) {
  // Headboard on the north wall.
  const g = piece('Bed', 'bedroom', 2.0, -4.85);
  box(g, m.fabricDeep, [1.9, 1.1, 0.1], [0, 0, -1.02], 0.04); // upholstered headboard
  box(g, m.timber, [1.72, 0.22, 2.08], [0, 0.06, 0.04], 0.02);
  box(g, m.linen, [1.6, 0.2, 2.0], [0, 0.28, 0.04], 0.06); // mattress
  box(g, m.fabric, [1.68, 0.12, 1.4], [0, 0.42, 0.36], 0.05); // duvet
  box(g, m.fabricDeep, [1.7, 0.125, 0.34], [0, 0.42, 0.9], 0.05); // throw
  for (const sx of [-0.4, 0.4]) {
    const pillow = box(g, m.linen, [0.68, 0.14, 0.4], [sx, 0.5, -0.72], 0.065);
    pillow.rotation.x = -0.18;
  }
  return g;
}

function bedsideTable(m, side) {
  const g = piece(`Bedside table ${side < 0 ? 'west' : 'east'}`, 'bedroom', 2.0 + side * 1.28, -5.66);
  box(g, m.timber, [0.46, 0.34, 0.4], [0, 0.14, 0], 0.02);
  box(g, m.dark, [0.4, 0.004, 0.006], [0, 0.31, 0.2], 0).castShadow = false;
  for (const sx of [-0.18, 0.18]) for (const sz of [-0.15, 0.15]) cyl(g, m.dark, 0.012, 0.012, 0.14, [sx, 0, sz], 8);
  return g;
}

function bedsideLamp(m, side) {
  const g = piece(`Bedside lamp ${side < 0 ? 'west' : 'east'}`, 'bedroom', 2.0 + side * 1.28, -5.7);
  cyl(g, m.brass, 0.06, 0.07, 0.015, [0, 0.48, 0], 24);
  cyl(g, m.brass, 0.008, 0.008, 0.2, [0, 0.495, 0], 8);
  cyl(g, m.glow.bedroom, 0.08, 0.11, 0.15, [0, 0.66, 0]).castShadow = false;
  return g;
}

/* ---------- bathroom ---------- */

function bath(m) {
  const g = piece('Bath', 'bathroom', -1.85, -5.1);
  const height = 0.56;
  const shell = cached('bath-shell', () => {
    const shape = stadium(new Shape(), 1.7, 0.8);
    shape.holes.push(stadium(new Path(), 1.56, 0.66));
    const geometry = new ExtrudeGeometry(shape, {
      depth: height - 0.04,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
      curveSegments: 24,
    });
    return geometry.rotateX(-Math.PI / 2).translate(0, 0.02, 0);
  });
  add(g, shell, m.ceramic, 0, 0, 0);
  const base = cached('bath-base', () =>
    new ExtrudeGeometry(stadium(new Shape(), 1.6, 0.7), { depth: 0.1, bevelEnabled: false, curveSegments: 24 }).rotateX(-Math.PI / 2),
  );
  add(g, base, m.ceramic, 0, 0.02, 0);
  return g;
}

function bathTap(m) {
  // Floor-standing tap on the south side of the bath.
  const g = piece('Bath tap', 'bathroom', -1.85, -4.6);
  cyl(g, m.brass, 0.04, 0.045, 0.012, [0, 0, 0], 24);
  cyl(g, m.brass, 0.014, 0.014, 0.82, [0, 0.012, 0], 12);
  box(g, m.brass, [0.028, 0.028, 0.22], [0, 0.81, -0.1], 0.01);
  cyl(g, m.brass, 0.012, 0.012, 0.05, [0, 0.765, -0.2], 12);
  return g;
}

function vanity(m) {
  // Floating vanity with basin on the west wall.
  const g = piece('Vanity', 'bathroom', -3.685, -3.8);
  box(g, m.timber, [0.48, 0.3, 1.2], [0, 0.52, 0], 0.012);
  box(g, m.marble, [0.5, 0.025, 1.22], [0.005, 0.82, 0], 0);
  cyl(g, m.ceramic, 0.2, 0.15, 0.11, [0.03, 0.845, 0], 40);
  cyl(g, m.stone, 0.175, 0.175, 0.004, [0.03, 0.953, 0], 40).castShadow = false;
  cyl(g, m.brass, 0.01, 0.01, 0.2, [-0.19, 0.845, 0], 10);
  box(g, m.brass, [0.12, 0.016, 0.016], [-0.14, 1.03, 0], 0.006);
  return g;
}

function mirror(m) {
  // Round mirror on the west wall with a backlit ring.
  const g = piece('Mirror', 'bathroom', -3.925, -3.8);
  const ring = cyl(g, m.glow.bathroom, 0.46, 0.46, 0.02, [0, 0, 0], 64);
  ring.rotation.z = Math.PI / 2;
  ring.position.set(0.012, 1.6, 0);
  ring.castShadow = false;
  const glass = cyl(g, m.mirror, 0.41, 0.41, 0.02, [0, 0, 0], 64);
  glass.rotation.z = Math.PI / 2;
  glass.position.set(0.034, 1.6, 0);
  return g;
}

function toilet(m) {
  // Against the east wall, facing west.
  const g = piece('Toilet', 'bathroom', -0.075, -5.2);
  box(g, m.ceramic, [0.18, 0.38, 0.38], [-0.095, 0.4, 0], 0.03);
  const bowl = cyl(g, m.ceramic, 0.19, 0.14, 0.4, [-0.38, 0, 0], 32);
  bowl.scale.set(1.35, 1, 1);
  const seat = cyl(g, m.ceramic, 0.195, 0.195, 0.025, [-0.38, 0.4, 0], 32);
  seat.scale.set(1.35, 1, 1);
  box(g, m.ceramic, [0.2, 0.36, 0.3], [-0.2, 0, 0], 0.02);
  return g;
}

function showerScreen(m) {
  // Glass screen and stone tray in the north-west corner.
  const g = piece('Shower screen', 'bathroom', -3.45, -5.4);
  box(g, m.stone, [0.92, 0.012, 1.05], [0, 0, 0], 0);
  const glass = box(g, m.glass, [0.012, 2.0, 1.05], [0.46, 0.012, 0], 0);
  glass.castShadow = false;
  glass.receiveShadow = false;
  box(g, m.brass, [0.02, 0.02, 1.05], [0.46, 2.012, 0], 0);
  // Shower head on the west wall.
  cyl(g, m.brass, 0.01, 0.01, 1.1, [-0.44, 1.0, 0], 10);
  box(g, m.brass, [0.3, 0.012, 0.012], [-0.3, 2.08, 0], 0);
  cyl(g, m.brass, 0.1, 0.1, 0.012, [-0.16, 2.06, 0], 32);
  return g;
}

/* ---------- assembly ---------- */

// Returns every piece in the order it lands during the furnishing stage.
export function buildFurniture(mats) {
  // Chair backs are open curved shells, so they need a double-sided copy of the timber.
  if (!mats.timberBack) {
    mats.timberBack = mats.timber.clone();
    mats.timberBack.side = DoubleSide;
    mats.timberBack.color = mats.timber.color; // share the colour so moods apply to both
  }
  const m = mats;

  const pieces = [
    livingRug(m),
    sofa(m),
    coffeeTable(m),
    slatWall(m),
    mediaConsole(m),
    floorLamp(m),
    diningTable(m),
    ...[0, 1, 2, 3].map((i) => diningChair(m, i)),
    diningPendant(m),
    plant(m),

    kitchenCounter(m),
    upperCabinets(m),
    tallUnit(m),
    island(m),
    ...[0, 1, 2].map((i) => stool(m, i)),
    ...[0, 1, 2].map((i) => islandPendant(m, i)),

    bedroomRug(m),
    bed(m),
    bedsideTable(m, -1),
    bedsideTable(m, 1),
    bedsideLamp(m, -1),
    bedsideLamp(m, 1),

    bath(m),
    bathTap(m),
    vanity(m),
    mirror(m),
    toilet(m),
    showerScreen(m),
  ];

  // Move each piece's origin to the middle of its footprint so it can settle and scale in place.
  const bounds = new Box3();
  const centre = new Vector3();
  for (const item of pieces) {
    if (item.rotation.y !== 0) continue; // rotated pieces are already built around their own centre
    bounds.setFromObject(item).getCenter(centre);
    const dx = centre.x - item.position.x;
    const dz = centre.z - item.position.z;
    for (const child of item.children) {
      child.position.x -= dx;
      child.position.z -= dz;
    }
    item.position.x = centre.x;
    item.position.z = centre.z;
  }

  const group = new Group();
  group.name = 'furniture';
  group.add(...pieces);
  return { group, pieces };
}
