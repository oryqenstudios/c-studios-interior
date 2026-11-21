import { createStage } from './scene/renderer.js';
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

const canvas = document.getElementById('scene');
const stage = createStage(canvas);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  const apartment = buildApartment(mats);
  const furniture = buildFurniture(mats);
  stage.scene.add(apartment.group, furniture.group);
  const lights = createLights(stage.scene, mats);

  const rig = createCameraRig(stage.camera, ui);
  stage.onResize(rig.layout);

  const story = createStory({ apartment, furniture, lights, mats, rig, ui, reducedMotion });
  const jumpToRoom = (room) => story.scrollToPercent(ROOM_JUMPS[room]);

  initMoods({ mats, reducedMotion });
  const dayNight = initDayNight({ ui, reducedMotion });
  const pointer = initPointer({ ui, camera: stage.camera, jumpToRoom, reducedMotion });
  const planNav = initPlanNav({ ui, jumpToRoom });
  initMagnetic({ reducedMotion });

  stage.setFrameCallback(() => {
    pointer.update();
    story.update();
    dayNight?.update();
    planNav?.update();
  });

  // Development only: lets automated checks sample the camera path against the model.
  if (import.meta.env.DEV) window.__debug = { rig, apartment, furniture, story, stage, ui, mats };

  if (!document.hidden) stage.start();
} else {
  // Full static fallback arrives in phase 7. For now the page stays readable without the canvas.
  document.documentElement.classList.add('no-webgl');
  canvas.hidden = true;
}
