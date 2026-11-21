import { CatmullRomCurve3, MathUtils, Vector3 } from 'three';
import { DEPTH, WALL_T, WIDTH } from './apartment.js';

const { lerp, degToRad, smoothstep, clamp } = MathUtils;

const FOV_PLAN = 35;
const MODEL_W = WIDTH + WALL_T;
const MODEL_D = DEPTH + WALL_T;
const HEADER_PX = 72;
const EYE = 1.5;

// Where the scripted flight takes over from the orbiting views, in scroll percent.
const FLIGHT_START = 64;

/* Fixed waypoints of the flight: dive, four rooms, then the start of the pull back.
   `at` is the scroll percentage, `fov` runs from 0 (plan lens) to 1 (interior lens).
   There is a waypoint just before and just after each doorway so the smooth curve
   through them can never cut a corner through a wall. */
const WAYPOINTS = [
  // Dive: over the south wall, down through the open top beside the island
  { at: 66, pos: [6.5, 9.5, 10.5], look: [-0.5, 0.8, 1.0], fov: 0.2 },
  { at: 68, pos: [-0.8, 5.2, 6.6], look: [0.5, 1.0, 0.5], fov: 0.6 },
  { at: 69, pos: [-2.3, 2.9, 3.4], look: [2.5, 1.0, -0.2], fov: 0.85 },
  // Living: slow push toward the sofa and slat wall
  { at: 70, pos: [-1.8, EYE, 1.9], look: [3.6, 1.0, -0.4], fov: 1 },
  { at: 77, pos: [-0.5, EYE, 1.3], look: [3.7, 1.0, -0.2], fov: 1 },
  // Kitchen: along the island
  { at: 79, pos: [0.3, EYE, 2.35], look: [0.2, 0.9, 4.6], fov: 1 },
  { at: 83, pos: [1.75, EYE, 2.5], look: [-1.2, 0.9, 4.7], fov: 1 },
  // Bedroom: north between sofa and coffee table, through the doorway, toward the bed
  { at: 85, pos: [1.72, EYE, 0.6], look: [1.7, 1.2, -3.5], fov: 1 },
  { at: 87.5, pos: [1.66, EYE, -2.05], look: [1.9, 1.0, -5.0], fov: 1 }, // before the doorway
  { at: 89, pos: [1.62, EYE, -2.95], look: [2.1, 0.9, -5.4], fov: 1 }, // after the doorway
  { at: 91, pos: [0.95, EYE, -3.25], look: [2.3, 0.95, -5.6], fov: 1 },
  // Bathroom: through the connecting doorway, toward the bath
  { at: 92, pos: [0.55, EYE, -3.45], look: [-1.6, 0.9, -4.4], fov: 1 }, // before the doorway
  { at: 93.2, pos: [-0.5, EYE, -3.45], look: [-2.0, 0.7, -4.9], fov: 1 }, // after the doorway
  { at: 95, pos: [-1.05, EYE, -3.7], look: [-2.2, 0.6, -5.0], fov: 1 },
  // Pull back: straight up through the open top, then out to the south-west
  { at: 96.5, pos: [-1.3, 4.6, -3.0], look: [-0.8, 0.5, -2.0], fov: 0.8 },
  { at: 98.3, pos: [-7.5, 10, 6.5], look: [0, 0.6, 0], fov: 0.3 },
];

function orbitPosition(distance, polar, azimuth, targetY, out) {
  return out.set(
    distance * Math.sin(polar) * Math.sin(azimuth),
    distance * Math.cos(polar) + targetY,
    distance * Math.sin(polar) * Math.cos(azimuth),
  );
}

// Weight of the overview stage: 1 while it is on screen, easing to 0 at both ends.
export const overviewWeight = (p) => smoothstep(p, 54, 56) * (1 - smoothstep(p, 62, FLIGHT_START));

const _right = new Vector3();
const _up = new Vector3();

// `ui` carries live interaction values: orbit offsets and the smoothed pointer position.
export function createCameraRig(camera, ui = { orbitAz: 0, orbitPolar: 0, parX: 0, parY: 0 }) {
  let width = 1;
  let height = 1;
  let wide = true;
  let distance = 26;
  let shiftX = 0;
  let shiftY = 0;
  let appliedShift = -1;
  let fovInside = 60;

  let keys = [];
  let positions = null;
  let targets = null;

  const pose = { position: new Vector3(), target: new Vector3(), fov: FOV_PLAN };

  // Orbiting views: overhead (stages 01 to 03), the tilt (04 and 05) and the overview.
  function orbitPose(p, tilt, out) {
    const o = clamp((p - 54) / (FLIGHT_START - 54), 0, 1); // progress through the overview
    const w = overviewWeight(p); // dragging only has an effect during the overview
    const polar = clamp(lerp(0.0006, degToRad(38), tilt) + degToRad(16) * o + ui.orbitPolar * w, 0.0006, degToRad(80));
    // Swings toward the south-east, then keeps turning slowly through the overview.
    const azimuth = degToRad(30) * tilt + degToRad(18) * o + ui.orbitAz * w;
    const d = distance * (1 + (wide ? 0.06 : 0.3) * tilt + (wide ? 0 : 0.12) * o);
    const targetY = 0.5 * tilt + 0.3 * o;
    orbitPosition(d, polar, azimuth, targetY, out.position);
    out.target.set(0, targetY, 0);
    out.fov = FOV_PLAN;
    return out;
  }

  function buildFlight() {
    const first = orbitPose(FLIGHT_START, 1, { position: new Vector3(), target: new Vector3() });
    // Final view: three-quarter from the south-west.
    const last = orbitPosition(distance * (wide ? 1.16 : 1.42), degToRad(54), degToRad(-42), 0.6, new Vector3());

    keys = [
      { at: FLIGHT_START, pos: first.position.toArray(), look: first.target.toArray(), fov: 0 },
      ...WAYPOINTS,
      { at: 100, pos: last.toArray(), look: [0, 0.6, 0], fov: 0 },
    ];
    positions = new CatmullRomCurve3(keys.map((k) => new Vector3(...k.pos)), false, 'catmullrom', 0.5);
    targets = new CatmullRomCurve3(keys.map((k) => new Vector3(...k.look)), false, 'catmullrom', 0.5);
  }

  function flightPose(p, out) {
    let i = keys.length - 2;
    for (let k = 0; k < keys.length - 1; k++) {
      if (p <= keys[k + 1].at) {
        i = k;
        break;
      }
    }
    const a = keys[i];
    const b = keys[i + 1];
    const t = clamp((p - a.at) / (b.at - a.at), 0, 1);
    const u = (i + t) / (keys.length - 1);
    positions.getPoint(u, out.position);
    targets.getPoint(u, out.target);
    out.fov = lerp(FOV_PLAN, fovInside, lerp(a.fov, b.fov, t));
    return out;
  }

  // Camera pose for a scroll percentage. `tilt` is the stage 04 to 05 tilt amount.
  function poseAt(p, tilt, out = pose) {
    return p <= FLIGHT_START ? orbitPose(p, tilt, out) : flightPose(p, out);
  }

  // Lays out the views for the current screen.
  // Wide screens: the model sits right of centre so text can sit on the left.
  // Narrow screens: the camera pulls back until the full width fits, and the model sits
  // toward the top so text can sit at the bottom.
  function layout(w, h) {
    width = w;
    height = h;
    const aspect = w / h;
    wide = aspect > 1.15 && w >= 900;
    // The lens is specified vertically, so portrait screens need a wider one indoors.
    fovInside = wide ? 60 : aspect < 0.75 ? 78 : 68;

    const span = 2 * Math.tan(degToRad(FOV_PLAN / 2)); // visible height per metre of distance
    const fitDepth = MODEL_D / (wide ? 0.76 : 0.47) / span;
    const fitWidth = MODEL_W / (wide ? 0.46 : 0.88) / (span * aspect);
    distance = Math.max(fitDepth, fitWidth);

    const modelPx = (MODEL_D / (span * distance)) * h;
    const header = document.querySelector('.site-header')?.offsetHeight ?? HEADER_PX;
    shiftX = wide ? w * 0.2 : 0;
    shiftY = wide ? -header * 0.25 : Math.max(0, h / 2 - (header + 12 + modelPx / 2));
    appliedShift = -1;

    buildFlight();
  }

  // How far the model is held off-centre: fully during the build and overview, centred
  // from the dive through the rooms, and off-centre again for the closing view.
  function shiftAmount(p) {
    return 1 - smoothstep(p, FLIGHT_START, 68) + smoothstep(p, 96, 100);
  }

  function update({ p, tilt }) {
    poseAt(p, tilt, pose);
    camera.position.copy(pose.position);
    camera.fov = pose.fov;
    camera.lookAt(pose.target);

    // Cursor parallax: a small sideways and vertical drift, scaled to the viewing distance.
    if (ui.parX !== 0 || ui.parY !== 0) {
      const reach = pose.position.distanceTo(pose.target) * 0.012;
      camera.updateMatrix();
      _right.setFromMatrixColumn(camera.matrix, 0);
      _up.setFromMatrixColumn(camera.matrix, 1);
      camera.position.addScaledVector(_right, ui.parX * reach).addScaledVector(_up, -ui.parY * reach);
      camera.lookAt(pose.target);
    }

    // Shifting the view (not the model) keeps the perspective identical to a centred shot.
    const shift = shiftAmount(p);
    if (shift !== appliedShift) {
      appliedShift = shift;
      camera.setViewOffset(width, height, -shiftX * shift, shiftY * shift, width, height);
    } else {
      camera.updateProjectionMatrix();
    }
  }

  return { layout, update, poseAt, isWide: () => wide };
}
