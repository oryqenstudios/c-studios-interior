import { createStage } from './scene/renderer.js';

const canvas = document.getElementById('scene');
const stage = createStage(canvas);

if (stage) {
  document.documentElement.classList.add('has-webgl');
  if (!document.hidden) stage.start();
} else {
  // Full static fallback arrives in phase 7. For now the page stays readable without the canvas.
  document.documentElement.classList.add('no-webgl');
  canvas.hidden = true;
}
