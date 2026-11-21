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

// Three quality tiers, chosen at load. `shadow` is the shadow map size (0 = no shadows),
// `pixelRatio` the cap on device pixel ratio, `boardWidth` the floorboard width in metres
// (wider boards mean fewer of them).
export const TIERS = {
  high: { shadow: 2048, pixelRatio: 2, boardWidth: 0.2 },
  medium: { shadow: 1024, pixelRatio: 1.5, boardWidth: 0.2 },
  low: { shadow: 0, pixelRatio: 1, boardWidth: 0.4 },
};
const TIER_ORDER = ['high', 'medium', 'low'];

const LOW_FPS = 30; // below this for two seconds running, drop one tier
const GRACE_MS = 3000; // ignore the first seconds after starting or resuming

// ?quality=high|medium|low in the address forces a tier (and switches off the automatic
// step-down, unless &watch is added). Used for testing and for rendering the share image.
const params = new URLSearchParams(location.search);
const forcedTier = TIERS[params.get('quality')] ? params.get('quality') : null;
const watchdogOn = !forcedTier || params.has('watch');

function pickTier(renderer) {
  if (forcedTier) return forcedTier;

  // Software rendering is always slow.
  const gl = renderer.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  if (/swiftshader|llvmpipe|software/i.test(gpu)) return 'low';

  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const phone = window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;

  if (phone) return cores >= 6 && memory >= 4 ? 'medium' : 'low';
  if (cores <= 2 || memory <= 2) return 'low';
  return cores >= 8 ? 'high' : 'medium';
}

/**
 * Creates the single renderer, scene and camera for the site.
 * Returns null if WebGL is unavailable so the caller can fall back to static content.
 */
export function createStage(canvas) {
  // Probe first: the renderer logs a console error if it cannot get a context.
  const probe = document.createElement('canvas');
  if (!window.WebGL2RenderingContext || !probe.getContext('webgl2')) return null;

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
  scene.fog = new Fog(INK, 42, 95);

  const camera = new PerspectiveCamera(35, 1, 0.1, 200);
  camera.position.set(0, 24, 0.001);
  camera.lookAt(0, 0, 0);

  let tier = pickTier(renderer);
  const tierListeners = [];
  const resizeListeners = [];

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, TIERS[tier].pixelRatio));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    for (const fn of resizeListeners) fn(width, height);
  }

  function setTier(name) {
    if (!TIERS[name] || name === tier) return;
    tier = name;
    resize();
    for (const fn of tierListeners) fn(tier, TIERS[tier]);
  }

  // One render loop. It stops while the tab is hidden or the canvas is scrolled out of view.
  let onFrame = null;
  let running = false;
  let wanted = false; // start() has been called
  let inView = true;

  // Frame-rate watchdog.
  let last = 0;
  let windowStart = 0;
  let frames = 0;
  let lowSeconds = 0;
  let graceUntil = 0;
  let fps = 0;

  function watch(time) {
    const delta = time - last;
    last = time;
    if (!watchdogOn) return;
    if (delta > 1000 || time < graceUntil) {
      // a gap from switching tabs or starting up: start a fresh measuring window
      windowStart = time;
      frames = 0;
      return;
    }
    frames++;
    if (time - windowStart >= 1000) {
      fps = (frames * 1000) / (time - windowStart);
      windowStart = time;
      frames = 0;
      lowSeconds = fps < LOW_FPS ? lowSeconds + 1 : 0;
      if (lowSeconds >= 2) {
        lowSeconds = 0;
        const next = TIER_ORDER[TIER_ORDER.indexOf(tier) + 1];
        if (next) {
          setTier(next);
          graceUntil = time + GRACE_MS;
        }
      }
    }
  }

  function frame(time) {
    watch(time);
    if (onFrame) onFrame(time);
    renderer.render(scene, camera);
  }

  function sync() {
    const should = wanted && inView && !document.hidden;
    if (should === running) return;
    running = should;
    if (running) {
      graceUntil = performance.now() + GRACE_MS;
      lowSeconds = 0;
      renderer.setAnimationLoop(frame);
    } else {
      renderer.setAnimationLoop(null);
    }
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', sync);
  resize();

  return {
    renderer,
    scene,
    camera,
    resize,
    start() {
      wanted = true;
      sync();
    },
    stop() {
      wanted = false;
      sync();
    },
    // Called when the canvas scrolls into or out of view.
    setInView(value) {
      inView = value;
      sync();
    },
    // Renders one frame immediately, whether or not the loop is running.
    renderOnce() {
      if (onFrame) onFrame(performance.now());
      renderer.render(scene, camera);
    },
    get tier() {
      return tier;
    },
    get fps() {
      return fps;
    },
    get running() {
      return running;
    },
    setTier,
    // Calls fn(tierName, settings) now and whenever the tier changes.
    onTier(fn) {
      tierListeners.push(fn);
      fn(tier, TIERS[tier]);
    },
    // Calls fn(width, height) now and after every resize.
    onResize(fn) {
      resizeListeners.push(fn);
      fn(window.innerWidth, window.innerHeight);
    },
    setFrameCallback(fn) {
      onFrame = fn;
    },
  };
}
