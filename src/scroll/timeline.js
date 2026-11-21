import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { Matrix4, Quaternion, Vector3 } from 'three';

gsap.registerPlugin(ScrollTrigger);

// Stage ranges as a percentage of the 3D story's scroll length.
export const STAGES = {
  drawing: [0, 6],
  structure: [6, 18],
  surfaces: [18, 30],
  furnishing: [30, 44],
  light: [44, 54],
  overview: [54, 64],
  dive: [64, 70],
  living: [70, 77],
  kitchen: [77, 83],
  bedroom: [83, 91],
  bathroom: [91, 95],
  closing: [95, 100],
};

const ROOM_ORDER = ['living', 'kitchen', 'bedroom', 'bathroom'];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
// Progress of a staggered item: `index` of `count`, each taking `share` of the whole stage.
const stagger = (value, index, count, share) => clamp01((value - (index / count) * (1 - share)) / share);
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

const _m = new Matrix4();
const _p = new Vector3();
const _q = new Quaternion();
const _s = new Vector3();

/* Each function below sets its part of the scene from a 0 to 1 value and nothing else,
   so the scroll position alone decides the state and scrolling back un-builds the home. */

function applyPlan({ plan }, mats, draw, swings, fade) {
  const total = plan.totalLength;
  let run = 0;
  for (const line of plan.lines) {
    const length = line.userData.length;
    const t = clamp01((draw * total - run) / length);
    line.visible = t > 0 && fade < 1;
    line.scale.x = Math.max(length * t, 1e-4);
    run += length;
  }
  mats.planLine.opacity = 1 - fade;
  mats.planSwing.opacity = swings * (1 - fade);
  for (const swing of plan.swings) swing.visible = swings > 0 && fade < 1;
}

function applyWalls({ walls }, value) {
  const list = walls.walls;
  list.forEach((wall, i) => {
    const t = easeOutCubic(stagger(value, i, list.length, 0.3));
    wall.visible = t > 0;
    wall.scale.y = Math.max(wall.userData.height * t, 1e-4);
    wall.userData.top = wall.position.y + wall.scale.y;
  });
  // The wall above each doorway appears as its neighbouring wall passes door height.
  for (const lintel of walls.lintels) {
    const over = lintel.userData.neighbour.userData.top - lintel.position.y;
    lintel.visible = over > 0;
    lintel.scale.y = Math.max(Math.min(over, lintel.userData.height), 1e-4);
  }
}

function applyFloor(mesh, value) {
  if (mesh.userData.applied === value) return;
  mesh.userData.applied = value;
  mesh.visible = value > 0;
  if (!mesh.visible) return;
  const pieces = mesh.userData.pieces;
  const thickness = mesh.userData.thickness;
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    // piece.order runs 0 to 1 from north to south, so the floor sweeps in that direction.
    const t = clamp01((value - piece.order * 0.82) / 0.18);
    const grow = t <= 0 ? 0 : Math.min(1, t * 3);
    const drop = (1 - easeOutCubic(t)) * 0.7;
    _m.compose(_p.set(piece.x, drop, piece.z), _q, _s.set(piece.w * grow, thickness * grow, piece.d * grow));
    mesh.setMatrixAt(i, _m);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

function applyFurniture({ pieces }, value) {
  pieces.forEach((piece, i) => {
    const t = stagger(value, i, pieces.length, 0.16);
    piece.visible = t > 0;
    if (!piece.visible) return;
    // Lands from just above, with a soft settle and a slight overshoot in size.
    piece.position.y = (1 - easeOutCubic(t)) * 0.9;
    piece.scale.setScalar(Math.max(easeOutBack(t), 1e-3));
  });
}

function applyLight(lights, light, night) {
  lights.setDayNight(night);
  ROOM_ORDER.forEach((room, i) => lights.setRoomLight(room, stagger(light, i, ROOM_ORDER.length, 0.4)));
}

export function createStory({ apartment, furniture, lights, mats, rig, reducedMotion }) {
  const story = document.getElementById('story');
  const progressBar = document.querySelector('.progress__bar');

  // Precompute what the stage functions need.
  apartment.plan.totalLength = apartment.plan.lines.reduce((sum, line) => sum + line.userData.length, 0);
  const wallByName = Object.fromEntries(apartment.walls.walls.map((wall) => [wall.name, wall]));
  const neighbours = { 'lintel-bathroom': 'cross-b', 'lintel-bedroom': 'cross-b', 'lintel-connecting': 'spine-a' };
  for (const lintel of apartment.walls.lintels) lintel.userData.neighbour = wallByName[neighbours[lintel.name]];

  // Smooth scrolling, unless reduced motion is requested.
  let lenis = null;
  if (!reducedMotion) {
    lenis = new Lenis();
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  ScrollTrigger.config({ ignoreMobileResize: true });

  const state = {
    // time-driven on load (the only non-scroll animation besides idle motion)
    draw: reducedMotion ? 1 : 0,
    swings: reducedMotion ? 1 : 0,
    // scroll-driven
    planFade: 0,
    walls: 0,
    floors: 0,
    furnish: 0,
    light: 0,
    night: 0,
    tilt: 0,
    ceilingFade: 0,
    p: 0, // scroll percentage through the story, for the camera
  };

  // Stage 01: the plan draws itself on load, then the door swings appear.
  if (!reducedMotion) {
    gsap
      .timeline({ delay: 0.3 })
      .to(state, { draw: 1, duration: 2.5, ease: 'power1.inOut' })
      .to(state, { swings: 1, duration: 0.6, ease: 'power1.out' });
  }

  // The master timeline. Its length is 100, so positions read as scroll percentages.
  const master = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: story, start: 'top top', end: 'bottom bottom', scrub: true },
  });
  const span = ([from, to]) => [{ duration: to - from }, from];
  const tween = (key, range, extra = {}) => {
    const [vars, at] = span(range);
    master.to(state, { [key]: 1, ...vars, ...extra }, at);
  };

  tween('walls', STAGES.structure);
  tween('planFade', [10, 18]);
  tween('floors', STAGES.surfaces);
  tween('furnish', STAGES.furnishing);
  tween('tilt', [STAGES.furnishing[0], STAGES.light[1]], { ease: 'sine.inOut' });
  tween('light', STAGES.light);
  tween('night', [44, 52]);
  // The ceiling fades just before the camera rises through it in the pull back.
  tween('ceilingFade', [95, 96]);
  master.to(state, { p: 100, duration: 100 }, 0);

  // Text panels fade in and out with their stage. The first is visible on load.
  const FADE = 1.5;
  for (const panel of story.querySelectorAll('[data-panel]')) {
    const [from, to] = STAGES[panel.dataset.panel];
    if (from > 0) master.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: FADE }, from + (panel.dataset.delay ? +panel.dataset.delay : 0));
    // The closing panel stays until the story scrolls away.
    if (to < 100) master.to(panel, { opacity: 0, duration: FADE }, to - FADE);
  }

  // Thin brass line along the bottom edge: progress through the whole page.
  if (progressBar) {
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        progressBar.style.transform = `scaleX(${self.progress})`;
      },
    });
  }

  function update() {
    applyPlan(apartment, mats, state.draw, state.swings, state.planFade);
    applyWalls(apartment, state.walls);
    applyFloor(apartment.floors.boards, state.floors);
    applyFloor(apartment.floors.tiles, state.floors);
    applyFurniture(furniture, state.furnish);
    applyLight(lights, state.light, state.night);
    mats.ceiling.opacity = 1 - state.ceilingFade;
    apartment.ceiling.visible = state.ceilingFade < 1;
    rig.update(state);
  }

  return { update, state, master, lenis };
}
