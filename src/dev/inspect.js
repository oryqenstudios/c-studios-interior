// TEMPORARY (phase 2 only): orbit control and preset views for inspecting the model.
// Remove this file, its import in main.js and the .inspect styles before phase 3 is done.
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const VIEWS = {
  top: { label: 'Top', position: [0, 27, 0.01], target: [0, 0, 0], fov: 35 },
  overview: { label: 'Overview', position: [13, 12, 15], target: [0, 0.6, 0], fov: 35 },
  living: { label: 'Living', position: [-1.4, 1.5, -1.3], target: [3.4, 1.0, 0.3], fov: 60 },
  dining: { label: 'Dining', position: [0.2, 1.5, 1.9], target: [-2.6, 0.8, -0.3], fov: 60 },
  kitchen: { label: 'Kitchen', position: [-3.3, 1.5, 2.9], target: [1.5, 0.9, 4.8], fov: 60 },
  bedroom: { label: 'Bedroom', position: [1.5, 1.5, -2.65], target: [2.1, 1.0, -5.6], fov: 60 },
  bathroom: { label: 'Bathroom', position: [-0.45, 1.5, -3.0], target: [-2.6, 0.8, -4.9], fov: 60 },
};

export function createInspector({ camera, renderer, lights, apartment, furniture }) {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxDistance = 60;

  function setView(key) {
    const view = VIEWS[key] ?? VIEWS.top;
    camera.position.set(...view.position);
    camera.fov = view.fov;
    camera.updateProjectionMatrix();
    controls.target.set(...view.target);
    controls.update();
  }

  const panel = document.createElement('div');
  panel.className = 'inspect';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Temporary model inspection views');
  for (const [key, view] of Object.entries(VIEWS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = view.label;
    button.addEventListener('click', () => setView(key));
    panel.append(button);
  }
  let night = false;
  const nightButton = document.createElement('button');
  nightButton.type = 'button';
  nightButton.textContent = 'Night preview';
  nightButton.addEventListener('click', () => {
    night = !night;
    lights.setNight(night ? 1 : 0);
    nightButton.setAttribute('aria-pressed', String(night));
  });
  panel.append(nightButton);
  // The plan lines are hidden once the home is built, so this shows them on their own.
  let planOnly = false;
  const planButton = document.createElement('button');
  planButton.type = 'button';
  planButton.textContent = 'Plan only';
  function setPlanOnly(value) {
    planOnly = value;
    apartment.plan.group.visible = planOnly;
    for (const part of [apartment.walls.group, apartment.floors.group, apartment.ceiling, furniture.group]) {
      part.visible = !planOnly;
    }
    planButton.setAttribute('aria-pressed', String(planOnly));
  }
  planButton.addEventListener('click', () => setPlanOnly(!planOnly));
  panel.append(planButton);
  document.body.append(panel);

  const params = new URLSearchParams(location.search);
  setView(params.get('view') ?? 'overview');
  if (params.has('night')) lights.setNight(1);
  setPlanOnly(params.has('plan'));

  return { update: () => controls.update(), setView };
}
