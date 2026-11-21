import {
  BoxGeometry,
  CircleGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  Vector3,
} from 'three';
import { seededRandom } from './materials.js';

// All dimensions in metres. North is -z.
export const WIDTH = 8;
export const DEPTH = 12;
export const WALL_T = 0.15;
export const WALL_H = 2.6;
export const DOOR_H = 2.1;
export const FLOOR_T = 0.03; // finished floor sits at y = 0, the table at y = -FLOOR_T

const H = WALL_T / 2;

export const ROOMS = {
  bathroom: { label: 'Bathroom', x: [-4, 0], z: [-6, -2.5] },
  bedroom: { label: 'Bedroom', x: [0, 4], z: [-6, -2.5] },
  living: { label: 'Living and dining', x: [-4, 4], z: [-2.5, 2.5] },
  kitchen: { label: 'Kitchen', x: [-4, 4], z: [2.5, 6] },
};

// Wall boxes as plan extents [x0, x1, z0, z1], in the order they rise.
const WALLS = [
  ['north', -4 - H, 4 + H, -6 - H, -6 + H],
  ['east', 4 - H, 4 + H, -6 + H, 6 - H],
  ['south', -4 - H, 4 + H, 6 - H, 6 + H],
  ['west', -4 - H, -4 + H, -6 + H, 6 - H],
  ['cross-a', -4 + H, -2.6, -2.5 - H, -2.5 + H],
  ['cross-b', -1.7, 1.2, -2.5 - H, -2.5 + H],
  ['cross-c', 2.1, 4 - H, -2.5 - H, -2.5 + H],
  ['spine-a', -H, H, -6 + H, -3.9],
  ['spine-b', -H, H, -3.0, -2.5 - H],
  ['kitchen-return', 2.5, 4 - H, 2.5 - H, 2.5 + H],
];

// Pieces of wall above each doorway.
const LINTELS = [
  ['lintel-bathroom', -2.6, -1.7, -2.5 - H, -2.5 + H],
  ['lintel-bedroom', 1.2, 2.1, -2.5 - H, -2.5 + H],
  ['lintel-connecting', -H, H, -3.9, -3.0],
];

// Door swings: hinge point, end of the open leaf, end of the closed leaf (x, z).
const DOORS = [
  { hinge: [-2.6, -2.5], open: [-2.6, -3.4], closed: [-1.7, -2.5] },
  { hinge: [2.1, -2.5], open: [2.1, -3.4], closed: [1.2, -2.5] },
  { hinge: [0, -3.0], open: [0.9, -3.0], closed: [0, -3.9] },
];

// Plan drawing: a double line per wall, as [x1, z1, x2, z2], in drawing order.
const A = 4 + H; // outer face
const B = 4 - H; // inner face of outer walls
const PLAN_SEGMENTS = [
  // outer face
  [-A, -6 - H, A, -6 - H],
  [A, -6 - H, A, 6 + H],
  [A, 6 + H, -A, 6 + H],
  [-A, 6 + H, -A, -6 - H],
  // bathroom
  [-B, -6 + H, -H, -6 + H],
  [-H, -6 + H, -H, -3.9],
  [-H, -3.0, -H, -2.5 - H],
  [-H, -2.5 - H, -1.7, -2.5 - H],
  [-2.6, -2.5 - H, -B, -2.5 - H],
  [-B, -2.5 - H, -B, -6 + H],
  // bedroom
  [H, -6 + H, B, -6 + H],
  [B, -6 + H, B, -2.5 - H],
  [B, -2.5 - H, 2.1, -2.5 - H],
  [1.2, -2.5 - H, H, -2.5 - H],
  [H, -2.5 - H, H, -3.0],
  [H, -3.9, H, -6 + H],
  // living and kitchen
  [-B, -2.5 + H, -2.6, -2.5 + H],
  [-1.7, -2.5 + H, 1.2, -2.5 + H],
  [2.1, -2.5 + H, B, -2.5 + H],
  [B, -2.5 + H, B, 2.5 - H],
  [B, 2.5 - H, 2.5, 2.5 - H],
  [2.5, 2.5 - H, 2.5, 2.5 + H],
  [2.5, 2.5 + H, B, 2.5 + H],
  [B, 2.5 + H, B, 6 - H],
  [B, 6 - H, -B, 6 - H],
  [-B, 6 - H, -B, -2.5 + H],
  // door jambs
  [-2.6, -2.5 - H, -2.6, -2.5 + H],
  [-1.7, -2.5 - H, -1.7, -2.5 + H],
  [1.2, -2.5 - H, 1.2, -2.5 + H],
  [2.1, -2.5 - H, 2.1, -2.5 + H],
  [-H, -3.9, H, -3.9],
  [-H, -3.0, H, -3.0],
];

const LINE_W = 0.03;
const PLAN_Y = -FLOOR_T + 0.006;

function buildPlan(mats) {
  const group = new Group();
  group.name = 'plan';

  // Unit strip running from x = 0 to x = 1, so each line can draw from its start point.
  const strip = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0);

  const lines = PLAN_SEGMENTS.map(([x1, z1, x2, z2]) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    const mesh = new Mesh(strip, mats.planLine);
    mesh.position.set(x1, PLAN_Y, z1);
    mesh.rotation.y = -Math.atan2(dz, dx);
    mesh.scale.set(length, 1, LINE_W);
    mesh.userData.length = length;
    group.add(mesh);
    return mesh;
  });

  const swings = DOORS.map(({ hinge, open, closed }) => {
    const swing = new Group();
    swing.position.set(hinge[0], PLAN_Y, hinge[1]);
    const radius = Math.hypot(open[0] - hinge[0], open[1] - hinge[1]);

    // Angles in the ring's own plane; after laying it flat, world z = -y.
    const a0 = Math.atan2(-(open[1] - hinge[1]), open[0] - hinge[0]);
    const a1 = Math.atan2(-(closed[1] - hinge[1]), closed[0] - hinge[0]);
    let delta = a1 - a0;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const start = delta >= 0 ? a0 : a1;

    const arc = new Mesh(
      new RingGeometry(radius - LINE_W / 2, radius + LINE_W / 2, 48, 1, start, Math.abs(delta)).rotateX(-Math.PI / 2),
      mats.planSwing,
    );
    const leaf = new Mesh(strip, mats.planSwing);
    leaf.rotation.y = a0;
    leaf.scale.set(radius, 1, LINE_W);
    swing.add(arc, leaf);
    group.add(swing);
    return swing;
  });

  return { group, lines, swings };
}

function buildWalls(mats) {
  const group = new Group();
  group.name = 'walls';
  // Unit box with its base at y = 0 so a wall rises by scaling y.
  const unit = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

  const make = ([name, x0, x1, z0, z1], y0, y1) => {
    const mesh = new Mesh(unit, mats.wall);
    mesh.name = name;
    mesh.position.set((x0 + x1) / 2, y0, (z0 + z1) / 2);
    mesh.scale.set(x1 - x0, y1 - y0, z1 - z0);
    mesh.userData.height = y1 - y0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  const walls = WALLS.map((def) => make(def, -FLOOR_T, WALL_H));
  const lintels = LINTELS.map((def) => make(def, DOOR_H, WALL_H));
  return { group, walls, lintels };
}

const _m = new Matrix4();
const _p = new Vector3();
const _q = new Quaternion();
const _s = new Vector3();
const _c = new Color();

// Lays boards (running east-west) or tiles over a rectangle and returns one instanced mesh.
// Pieces are sorted north to south so the floor can be laid in that order.
function buildFloor(pieces, material, name, rand) {
  pieces.sort((a, b) => a.z - b.z || a.x - b.x);
  // Unit box with its top at y = 0.
  const unit = new BoxGeometry(1, 1, 1).translate(0, -0.5, 0);
  const mesh = new InstancedMesh(unit, material, pieces.length);
  mesh.name = name;
  pieces.forEach((piece, i) => {
    _m.compose(_p.set(piece.x, 0, piece.z), _q, _s.set(piece.w, FLOOR_T, piece.d));
    mesh.setMatrixAt(i, _m);
    const tone = 0.86 + rand() * 0.24;
    mesh.setColorAt(i, _c.setScalar(tone));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  mesh.receiveShadow = true;
  mesh.userData.pieces = pieces;
  return mesh;
}

function boardsFor([x0, x1], [z0, z1], boardWidth, rand, out) {
  const gap = 0.006;
  for (let z = z0; z < z1 - 1e-6; z += boardWidth) {
    const zEnd = Math.min(z + boardWidth, z1);
    let x = x0 - rand() * 1.6;
    while (x < x1) {
      const length = 1.3 + rand() * 0.9;
      const a = Math.max(x, x0);
      const b = Math.min(x + length, x1);
      if (b - a > 0.05) {
        out.push({ x: (a + b) / 2, z: (z + zEnd) / 2, w: b - a - gap, d: zEnd - z - gap });
      }
      x += length;
    }
  }
}

function buildFloors(mats, { boardWidth = 0.2 } = {}) {
  const group = new Group();
  group.name = 'floors';
  const rand = seededRandom(7);

  const boards = [];
  boardsFor(ROOMS.bedroom.x, ROOMS.bedroom.z, boardWidth, rand, boards);
  boardsFor([-4, 4], [-2.5, 6], boardWidth, rand, boards);
  const boardMesh = buildFloor(boards, mats.floorTimber, 'floorboards', rand);

  const tiles = [];
  const size = 0.5;
  const [tx0, tx1] = ROOMS.bathroom.x;
  const [tz0, tz1] = ROOMS.bathroom.z;
  for (let z = tz0; z < tz1 - 1e-6; z += size) {
    for (let x = tx0; x < tx1 - 1e-6; x += size) {
      tiles.push({ x: x + size / 2, z: z + size / 2, w: size - 0.01, d: size - 0.01 });
    }
  }
  const tileMesh = buildFloor(tiles, mats.tile, 'tiles', rand);

  group.add(boardMesh, tileMesh);
  return { group, boards: boardMesh, tiles: tileMesh };
}

function buildCeiling(mats) {
  // Faces downward only: invisible from above, visible from inside the rooms.
  const mesh = new Mesh(new PlaneGeometry(WIDTH + WALL_T, DEPTH + WALL_T).rotateX(Math.PI / 2), mats.ceiling);
  mesh.name = 'ceiling';
  mesh.position.y = WALL_H;
  return mesh;
}

function buildGround(mats) {
  // The dark studio table the model sits on. Fog blends its far edge into the background.
  const mesh = new Mesh(new CircleGeometry(90, 64).rotateX(-Math.PI / 2), mats.ground);
  mesh.name = 'ground';
  mesh.position.y = -FLOOR_T;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildApartment(mats, options = {}) {
  const group = new Group();
  group.name = 'apartment';

  const ground = buildGround(mats);
  const plan = buildPlan(mats);
  const walls = buildWalls(mats);
  const floors = buildFloors(mats, options);
  const ceiling = buildCeiling(mats);

  group.add(ground, plan.group, walls.group, floors.group, ceiling);
  return { group, ground, plan, walls, floors, ceiling };
}
