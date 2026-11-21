import { MathUtils } from 'three';
import { DEPTH, WALL_T, WIDTH } from './apartment.js';

const FOV_PLAN = 35;
const MODEL_W = WIDTH + WALL_T;
const MODEL_D = DEPTH + WALL_T;
const HEADER_PX = 72;

// Scripted camera. Phase 3 covers the overhead view and the tilt of stages 04 and 05;
// the overview, dive and walkthrough are added in phase 4.
export function createCameraRig(camera) {
  let width = 1;
  let height = 1;
  let wide = true;
  let distance = 26;

  // Lays out the overhead view for the current screen.
  // Wide screens: the model sits right of centre so text can sit on the left.
  // Narrow screens: the camera pulls back until the full width fits, and the model sits
  // toward the top so text can sit at the bottom.
  function layout(w, h) {
    width = w;
    height = h;
    const aspect = w / h;
    wide = aspect > 1.15 && w >= 900;

    const span = 2 * Math.tan(MathUtils.degToRad(FOV_PLAN / 2)); // visible height per metre of distance
    const fitDepth = MODEL_D / (wide ? 0.76 : 0.47) / span;
    const fitWidth = MODEL_W / (wide ? 0.46 : 0.88) / (span * aspect);
    distance = Math.max(fitDepth, fitWidth);

    const modelPx = (MODEL_D / (span * distance)) * h;
    const shiftX = wide ? w * 0.2 : 0;
    const shiftY = wide ? -HEADER_PX * 0.25 : Math.max(0, h / 2 - (HEADER_PX + 12 + modelPx / 2));

    // Shifting the view (not the model) keeps the perspective identical to a centred shot.
    camera.setViewOffset(w, h, -shiftX, shiftY, w, h);
  }

  // tilt: 0 = directly overhead with north at the top, 1 = end of stage 05.
  function update({ tilt }) {
    const polar = MathUtils.lerp(0.0006, MathUtils.degToRad(38), tilt);
    const azimuth = MathUtils.degToRad(30) * tilt; // swings round toward the south-east
    const d = distance * (1 + (wide ? 0.06 : 0.3) * tilt);
    const targetY = 0.5 * tilt;

    camera.fov = FOV_PLAN;
    camera.position.set(
      d * Math.sin(polar) * Math.sin(azimuth),
      d * Math.cos(polar) + targetY,
      d * Math.sin(polar) * Math.cos(azimuth),
    );
    camera.lookAt(0, targetY, 0);
  }

  return { layout, update, isWide: () => wide };
}
