// Renders a new photograph of a room with a visitor's choices from the material board.
//
//   GET  /api/render          -> { enabled }            is a key configured?
//   POST /api/render          -> { id }                 start a render
//   GET  /api/render?id=...   -> { status, url? }       has it finished?
//
// The visitor never sends text: only a room, a look, a stage and option numbers. The
// instruction to the image service is written here from the studio's own catalogue
// (tools/rooms/*.json), so this cannot be used to make arbitrary pictures.
//
// Needs HIGGSFIELD_API_KEY in the environment (and HIGGSFIELD_API_SECRET if the key came
// as two values). GET /api/render?check reports whether the image service accepts it. Without them
// the board simply does not offer rendering. Each render spends one image of credit.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const catalogue = require('../tools/rooms/options.json');
const { looks, rooms } = require('../tools/rooms/looks.json');

const API = 'https://api.higgsfield.ai';
const PER_HOUR = 6; // renders per visitor address per hour (best effort: memory only)
const recent = new Map();

const KEEP = 'Keep the camera position, the lens, the architecture, the ceiling, the glazing, the garden outside and the warm late-afternoon sunlight exactly identical to the reference photograph. ';
const END = ' Everything else in the room stays exactly as it is. Ultra-detailed photorealistic architectural interior photograph for a luxury design studio, crisp focus, no people, no text, no watermark.';
const COLOURS = ['warm white', 'greige', 'sand beige', 'soft sage green', 'deep olive green', 'terracotta', 'dusty blue', 'charcoal'];
const FINISHES = ['paint', 'limewash', 'venetian', 'slats', 'fluted', 'stone'];
const WALLS = {
  paint: (c) => `smooth plaster painted in ${c} matte paint`,
  limewash: (c) => `${c} limewash with soft cloudy variation`,
  venetian: (c) => `${c} Venetian plaster with a subtle polished sheen`,
  fluted: (c) => `fluted wall panelling with fine vertical grooves, painted ${c}`,
  slats: () => 'fine vertical walnut timber slats',
  stone: () => 'large honed beige travertine slabs with fine joints',
};

// The instruction for one set of choices, or null if the request makes no sense.
export function instruction({ room, look, stage, picks }) {
  const theLook = looks.find((l) => l.id === look);
  if (!rooms[room] || !theLook || ![2, 3].includes(stage) || !picks || typeof picks !== 'object') return null;
  const allowed = [1, 2, 3].filter((s) => s <= stage).flatMap((s) => catalogue.rooms[room][s]);
  const chosen = {};
  for (const [gid, n] of Object.entries(picks)) {
    if (!allowed.includes(gid) || !Number.isInteger(n) || !catalogue.groups[gid].options[n]) return null;
    chosen[gid] = n;
  }
  const changes = [];
  if ('flooring' in chosen) changes.push(`the whole floor becomes ${catalogue.groups.flooring.options[chosen.flooring].desc}`);
  if ('wallfinish' in chosen || 'wallcolour' in chosen) {
    const finish = FINISHES[chosen.wallfinish ?? FINISHES.indexOf(theLook.surface.finish)];
    changes.push(`every wall becomes ${WALLS[finish](COLOURS[chosen.wallcolour ?? theLook.surface.colour])}`);
  }
  for (const [gid, n] of Object.entries(chosen)) {
    const group = catalogue.groups[gid];
    const option = group.options[n];
    const name = option.label.toLowerCase();
    if (group.kind === 'item') changes.push(`replace the ${group.label.toLowerCase()} with: ${option.desc}`);
    else if (gid === 'joinery') changes.push(`all joinery, cabinetry and shelving become ${option.desc}`);
    else if (gid === 'stone') changes.push(`every stone top and worktop becomes ${name}`);
    else if (gid === 'glass') changes.push(`glass screens and panels become ${name} glass`);
    else if (gid === 'metal') changes.push(`every metal fitting (taps, handles, light fittings and frames) becomes ${name}`);
    else if (gid === 'fabric') changes.push(`the main upholstery becomes ${name}`);
  }
  if (!changes.length) return null;
  return `${KEEP}Change only these things: ${changes.join('; ')}.${END}`;
}

export async function handle({ method, query = {}, body = {}, ip = '' }, env = process.env, fetchImpl = fetch) {
  // Either one combined value in HIGGSFIELD_API_KEY ("key-id:secret", as the Higgsfield
  // console shows it), or the two halves in HIGGSFIELD_API_KEY and HIGGSFIELD_API_SECRET.
  const id = (env.HIGGSFIELD_API_KEY || '').trim();
  const secret = (env.HIGGSFIELD_API_SECRET || '').trim();
  const key = id ? `Key ${secret && !id.includes(':') ? `${id}:${secret}` : id}` : null;
  const headers = { Authorization: key, 'Content-Type': 'application/json' };
  if (method === 'GET' && !query.id) {
    if (!key || !('check' in query)) return { status: 200, json: { enabled: Boolean(key) } };
    // ?check asks the image service whether it accepts the key (an unknown render is
    // "not found" with a good key and "unauthorised" with a bad one). Costs nothing.
    const answer = await fetchImpl(`${API}/requests/00000000-0000-4000-8000-000000000000/status`, { headers });
    const code = answer.status;
    return { status: 200, json: { enabled: true, key: code === 401 || code === 403 ? 'rejected by the image service' : code === 404 || code === 200 ? 'accepted' : `unexpected answer ${code}`, form: id.includes(':') || secret ? 'key and secret' : 'single value' } };
  }
  if (!key) return { status: 503, json: { error: 'Rendering is not set up.' } };

  if (method === 'GET') {
    if (!/^[0-9a-f-]{36}$/.test(String(query.id))) return { status: 400, json: { error: 'Unknown render.' } };
    const data = await (await fetchImpl(`${API}/requests/${query.id}/status`, { headers })).json();
    const done = data.status === 'completed' && data.images?.[0]?.url;
    return { status: 200, json: { status: done ? 'completed' : ['failed', 'nsfw', 'canceled'].includes(data.status) ? 'failed' : 'working', url: done || undefined } };
  }

  if (method !== 'POST') return { status: 405, json: { error: 'Not allowed.' } };
  const prompt = instruction({ room: body.room, look: body.look, stage: Number(body.stage), picks: body.picks });
  if (!prompt) return { status: 400, json: { error: 'Choose at least one option first.' } };
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < 3600e3);
  if (times.length >= PER_HOUR) return { status: 429, json: { error: 'That is enough renders for now. Please try again in an hour.' } };
  recent.set(ip, [...times, now]);
  const site = env.RENDER_ASSET_BASE || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : env.VITE_SITE_URL);
  const reference = `${site}/cfg/${body.room}/${body.look}-${Number(body.stage)}.webp`;
  const response = await fetchImpl(`${API}/xai/grok-imagine-image-2.0`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, resolution: '2k', aspect_ratio: '16:9', quality: 'medium', image_urls: [reference] }),
  });
  const data = await response.json();
  if (response.status === 401 || response.status === 403) return { status: 502, json: { error: 'The studio\u2019s image service key was not accepted.' } };
  if (!data.request_id) return { status: 502, json: { error: 'The render could not be started. Please try again.' } };
  return { status: 200, json: { id: data.request_id } };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
    const { status, json } = await handle({ method: req.method, query: req.query, body, ip });
    res.status(status).json(json);
  } catch {
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
