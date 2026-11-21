import { createStage } from './scene/renderer.js';
import { createMaterials } from './scene/materials.js';
import { buildApartment } from './scene/apartment.js';
import { buildFurniture } from './scene/furniture.js';
import { createLights } from './scene/lights.js';
import { createInspector } from './dev/inspect.js'; // TEMPORARY: removed in phase 3

const canvas = document.getElementById('scene');
const stage = createStage(canvas);

if (stage) {
  document.documentElement.classList.add('has-webgl');

  const mats = createMaterials();
  const apartment = buildApartment(mats);
  const furniture = buildFurniture(mats);
  stage.scene.add(apartment.group, furniture.group);
  const lights = createLights(stage.scene, mats);

  // TEMPORARY: orbit control and preset views for inspection.
  const inspector = createInspector({
    camera: stage.camera,
    renderer: stage.renderer,
    lights,
    apartment,
    furniture,
  });
  stage.setFrameCallback(() => inspector.update());

  if (!document.hidden) stage.start();
} else {
  // Full static fallback arrives in phase 7. For now the page stays readable without the canvas.
  document.documentElement.classList.add('no-webgl');
  canvas.hidden = true;
}
