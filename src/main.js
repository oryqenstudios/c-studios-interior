import { createStage, TIERS } from './scene/renderer.js';
import { createMaterials } from './scene/materials.js';
import { buildApartment } from './scene/apartment.js';
import { buildFurniture } from './scene/furniture.js';
import { createLights } from './scene/lights.js';
import { createCameraRig } from './scene/camera.js';
import { createStory, ROOM_JUMPS } from './scroll/timeline.js';
import { initMoods } from './ui/moods.js';
import { initDayNight } from './ui/daynight.js';
import { initPointer } from './ui/pointer.js';
import { initPlanNav } from './ui/plannav.js';
import { initMagnetic } from './ui/magnetic.js';
import { initForm } from './ui/form.js';

const canvas = document.getElementById('scene');
const stage = createStage(canvas);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// These work with or without the 3D view.
initForm();
for (const el of document.querySelectorAll('[data-year]')) el.textContent = new Date().getFullYear();

if (stage) {
  document.documentElement.classList.add('has-webgl');

  // Live interaction values shared by the camera, the lighting and the controls.
  const ui = {
    p: 0, // scroll percentage through the story
    parX: 0, // smoothed pointer position, -1 to 1
    parY: 0,
    orbitAz: 0, // drag offsets during the overview, in radians
    orbitPolar: 0,
    night: 1, // the visitor's day or night choice, 0 to 1
    override: 0, // 0 = lighting follows the scroll, 1 = the visitor's choice applies
    scriptedNight: 0,
    boost: { living: 0, kitchen: 0, bedroom: 0, bathroom: 0 }, // highlighted room
    unlocked: false,
    onUnlock: null,
  };

  const mats = createMaterials();
  // The floorboard count is fixed at load; shadows and resolution can still drop later.
  const apartment = buildApartment(mats, { boardWidth: TIERS[stage.tier].boardWidth });
  const furniture = buildFurniture(mats);
  stage.scene.add(apartment.group, furniture.group);
  const lights = createLights(stage.scene, mats);
  stage.onTier((name, tier) => lights.setShadowSize(tier.shadow));

  const rig = createCameraRig(stage.camera, ui);
  stage.onResize(rig.layout);

  const story = createStory({ apartment, furniture, lights, mats, rig, ui, reducedMotion });
  const jumpToRoom = (room) => story.scrollToPercent(ROOM_JUMPS[room]);

  initMoods({ mats, reducedMotion });
  const dayNight = initDayNight({ ui, reducedMotion });
  const pointer = initPointer({ ui, camera: stage.camera, jumpToRoom, reducedMotion });
  const planNav = initPlanNav({ ui, jumpToRoom });
  initMagnetic({ reducedMotion });

  // Everything that can change the picture. If none of it moved since the last frame,
  // the frame is not redrawn.
  const moodMats = [mats.wall, mats.floorTimber, mats.timber, mats.fabric, mats.fabricDeep];
  const snapshot = () => [
    ...Object.values(story.state),
    ui.parX,
    ui.parY,
    ui.orbitAz,
    ui.orbitPolar,
    ui.night,
    ui.override,
    ...Object.values(ui.boost),
    ...moodMats.map((m) => m.color.r + m.color.g * 2 + m.color.b * 4),
  ];
  let previous = [];

  stage.setFrameCallback(() => {
    pointer.update();
    story.update();
    dayNight?.update();
    planNav?.update();

    const current = snapshot();
    const changed = current.length !== previous.length || current.some((v, i) => Math.abs(v - previous[i]) > 1e-4);
    if (changed) previous = current;
    return changed;
  });

  // Stop rendering while the story (and so the canvas) is scrolled out of view.
  // (The top margin ignores the strip that sits under the solid header.)
  new IntersectionObserver(([entry]) => stage.setInView(entry.isIntersecting), { rootMargin: '-96px 0px 0px 0px' }).observe(
    document.getElementById('story'),
  );

  // Add ?stats to the address to see the quality tier and frame rate on any device.
  if (new URLSearchParams(location.search).has('stats')) {
    const stats = document.createElement('div');
    stats.className = 'stats';
    document.body.append(stats);
    setInterval(() => {
      stats.textContent = `${stage.tier} · ${stage.running ? Math.round(stage.fps) + ' fps' : 'paused'}`;
    }, 500);
  }

  // Development only: lets automated checks sample the camera path against the model.
  if (import.meta.env.DEV) window.__debug = { rig, apartment, furniture, story, stage, ui, mats, lights };

  // Loading screen: wait for the fonts and a first rendered frame, then reveal and start
  // the plan drawing. A timer makes sure the page can never stay covered.
  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    stage.renderOnce();
    document.documentElement.classList.remove('is-loading');
    stage.start();
    story.startIntro();
  };
  document.fonts.ready.then(reveal);
  setTimeout(reveal, 3000);
} else {
  // No WebGL: the stylesheet lays the story out as plain stacked text above the content sections.
  document.documentElement.classList.remove('has-webgl', 'is-loading');
  document.documentElement.classList.add('no-webgl');
  canvas.hidden = true;
}
