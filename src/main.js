import { createStage } from './scene/renderer.js';
import { createMaterials } from './scene/materials.js';
import { buildApartment } from './scene/apartment.js';
import { buildFurniture } from './scene/furniture.js';
import { createLights } from './scene/lights.js';
import { createCameraRig } from './scene/camera.js';
import { createStory } from './scroll/timeline.js';

const canvas = document.getElementById('scene');
const stage = createStage(canvas);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (stage) {
  document.documentElement.classList.add('has-webgl');

  const mats = createMaterials();
  const apartment = buildApartment(mats);
  const furniture = buildFurniture(mats);
  stage.scene.add(apartment.group, furniture.group);
  const lights = createLights(stage.scene, mats);

  const rig = createCameraRig(stage.camera);
  stage.onResize(rig.layout);

  const story = createStory({ apartment, furniture, lights, mats, rig, reducedMotion });
  stage.setFrameCallback(story.update);

  if (!document.hidden) stage.start();
} else {
  // Full static fallback arrives in phase 7. For now the page stays readable without the canvas.
  document.documentElement.classList.add('no-webgl');
  canvas.hidden = true;
}
