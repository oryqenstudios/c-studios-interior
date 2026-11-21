import {
  ACESFilmicToneMapping,
  Color,
  Fog,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

export const INK = 0x141312;
const MAX_PIXEL_RATIO = 2;

/**
 * Creates the single renderer, scene and camera for the site.
 * Returns null if WebGL is unavailable so the caller can fall back to static content.
 */
export function createStage(canvas) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  // PCFSoftShadowMap is deprecated since three r186; PCFShadowMap is now the soft-filtered type.
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setClearColor(INK, 1);

  const scene = new Scene();
  scene.background = new Color(INK);
  scene.fog = new Fog(INK, 30, 70);

  const camera = new PerspectiveCamera(35, 1, 0.1, 200);
  camera.position.set(0, 24, 0.001);
  camera.lookAt(0, 0, 0);

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  // One render loop. It stops while the tab is hidden.
  let onFrame = null;
  let running = false;

  function frame(time) {
    if (onFrame) onFrame(time);
    renderer.render(scene, camera);
  }

  function start() {
    if (running) return;
    running = true;
    renderer.setAnimationLoop(frame);
  }

  function stop() {
    running = false;
    renderer.setAnimationLoop(null);
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  resize();

  return {
    renderer,
    scene,
    camera,
    resize,
    start,
    stop,
    setFrameCallback(fn) {
      onFrame = fn;
    },
  };
}
