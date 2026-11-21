import { Color, DirectionalLight, HemisphereLight, PointLight } from 'three';

const DAY = { sun: 2.6, sunColor: new Color(0xfff0dc), fill: 2.1 };
// Night: the sun drops to about a third and turns cool.
const NIGHT = { sun: DAY.sun / 3, sunColor: new Color(0x9db2d6), fill: 0.3 };

// Hung well below the ceiling so it is washed evenly instead of burning out above each light.
const ROOM_LIGHTS = {
  living: { position: [0.6, 1.55, 0], intensity: 11 },
  kitchen: { position: [-0.3, 1.5, 4.1], intensity: 9 },
  bedroom: { position: [2.0, 1.55, -4.3], intensity: 7 },
  bathroom: { position: [-2.0, 1.55, -4.2], intensity: 7 },
};

const GLOW_INTENSITY = 2.4;

export function createLights(scene, mats, { shadowMapSize = 2048 } = {}) {
  // Day: one soft directional light with shadows and a low fill.
  const sun = new DirectionalLight(DAY.sunColor, DAY.sun);
  // High and from the east-south-east: the wall faces seen in the three-quarter views are lit
  // and shadows stay short.
  sun.position.set(7, 17, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 45;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;

  const fill = new HemisphereLight(0xf5ecdc, 0x8f7f6a, DAY.fill);
  scene.add(sun, sun.target, fill);

  // Warm room lights for night. They never cast shadows.
  const rooms = {};
  for (const [name, def] of Object.entries(ROOM_LIGHTS)) {
    const light = new PointLight(0xffc68a, 0, 9, 2);
    light.position.set(...def.position);
    light.userData.full = def.intensity;
    rooms[name] = light;
    scene.add(light);
  }

  // amount: 0 = off, 1 = fully on.
  function setRoomLight(name, amount) {
    rooms[name].intensity = rooms[name].userData.full * amount;
    mats.glow[name].emissiveIntensity = GLOW_INTENSITY * amount;
  }

  // amount: 0 = day, 1 = night. Affects the sun and fill only.
  function setDayNight(amount) {
    sun.intensity = DAY.sun + (NIGHT.sun - DAY.sun) * amount;
    sun.color.copy(DAY.sunColor).lerp(NIGHT.sunColor, amount);
    fill.intensity = DAY.fill + (NIGHT.fill - DAY.fill) * amount;
  }

  function setNight(amount) {
    setDayNight(amount);
    for (const name of Object.keys(rooms)) setRoomLight(name, amount);
  }

  return { sun, fill, rooms, setRoomLight, setDayNight, setNight };
}
