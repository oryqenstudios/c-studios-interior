// A 50-second landscape walkthrough (1920 x 1080). The hero plays in full and the
// material board is shown at real speed; the rest is brisk.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/home/user/.review/walk/frames3/';
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = `#wk{position:fixed;z-index:99999;left:50%;bottom:56px;transform:translateX(-50%);padding:14px 28px;background:rgba(20,19,18,.88);border:1px solid rgba(184,147,90,.75);color:#ede6da;font:400 30px/1.3 Jost,system-ui,sans-serif;letter-spacing:.04em;text-align:center;white-space:nowrap;opacity:0;transition:opacity .3s;pointer-events:none}#wk b{color:#b8935a;font-weight:500;font-size:19px;letter-spacing:.24em;text-transform:uppercase;margin-right:18px}#wk.on{opacity:1}
      #wkc{position:fixed;z-index:100000;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 0 0 2px rgba(20,19,18,.55),0 2px 10px rgba(0,0,0,.5);pointer-events:none}
      .wkt{position:fixed;z-index:99998;width:70px;height:70px;margin:-35px 0 0 -35px;border-radius:50%;border:2px solid #fff;background:rgba(255,255,255,.25);pointer-events:none;animation:wkt .55s ease-out forwards}@keyframes wkt{from{transform:scale(.35);opacity:1}to{transform:scale(1.2);opacity:0}}`;
      document.head.append(s);
      const c = document.createElement('div'); c.id = 'wk'; document.body.append(c);
      const cur = document.createElement('div'); cur.id = 'wkc'; cur.style.transform = 'translate(1700px,900px)'; document.body.append(cur);
      window.__cap = (a, t) => { c.innerHTML = `<b>${a}</b>${t}`; c.classList.add('on'); };
      addEventListener('mousemove', (e) => { cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, true);
      addEventListener('mousedown', (e) => { const d = document.createElement('div'); d.className = 'wkt'; d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; document.body.append(d); setTimeout(() => d.remove(), 600); }, true);
    });
  });
  const cdp = await ctx.newCDPSession(p); let n = 0; const times = [];
  cdp.on('Page.screencastFrame', (f) => { const i = n++; times.push(f.metadata.timestamp); fs.writeFile(OUT + String(i).padStart(6, '0') + '.jpg', Buffer.from(f.data, 'base64'), () => {}); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await p.mouse.move(1700, 900); await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
  const wait = (ms) => p.waitForTimeout(ms);
  const cap = (a, t) => p.evaluate(([a, t]) => window.__cap(a, t), [a, t]);
  const row = (t) => p.locator(`.lsc__row:has(.lsc__label:text-is("${t}"))`).first();
  let mx = 1700, my = 900;
  const click = async (loc, pause) => { const bx = await loc.boundingBox(); const x = bx.x + Math.min(bx.width / 2, 150), y = bx.y + bx.height / 2; await p.mouse.move(x, y, { steps: 7 }); mx = x; my = y; await wait(90); await p.mouse.down(); await p.mouse.up(); await wait(pause); };
  const back = () => click(p.locator('.lsc__back'), 450);
  const glide = (y, seconds) => p.evaluate(([y, s]) => new Promise((done) => { const from = scrollY, t0 = performance.now(); (function step(t) { const k = Math.min(1, (t - t0) / (s * 1000)); const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; window.scrollTo(0, from + (y - from) * e); k < 1 ? requestAnimationFrame(step) : done(); })(t0); }), [y, seconds]);
  const topOf = (sel, off = 0) => p.evaluate(([sel, off]) => document.querySelector(sel).getBoundingClientRect().top + scrollY + off, [sel, off]);
  const buildAt = (k) => p.evaluate((k) => { const s = document.getElementById('build'); return s.getBoundingClientRect().top + scrollY + (s.offsetHeight - innerHeight) * k; }, k);
  const mark = (name) => console.log(name, ((times[times.length - 1] ?? 0) - (times[0] ?? 0)).toFixed(1));

  // Hero, in full, at real speed
  await wait(1300); await cap('Hero', 'The room builds itself as the page opens'); await wait(10700); mark('hero end');
  // The scroll film, at an unhurried scroll, start to finish
  await cap('Scroll', 'From floor plan to finished home, driven by the scroll'); await glide(await buildAt(0.622), 15.0); mark('film end');
  // Material board: the kitchen, in the Warm walnut look
  await glide(await buildAt(0.76), 1.3); await wait(1500);
  await cap('Material board · Kitchen', 'Warm walnut · fittings and finishes change in the room'); await click(row('02  Fixtures and fittings'), 1000); mark('stage');
  const group = async (name, options) => { await click(row(name), 600); for (const o of options) await click(row(o), 950); await back(); mark(name); };
  await group('Cabinetry and oven', ['Framed shaker fronts', 'Fluted fronts with pulls']);
  await group('Island, sink and tap', ['Timber island, stone top', 'Rounded plinth island']);
  await group('Stone', ['Nero marquina', 'Travertine']);
  await group('Joinery', ['Black-stained ash', 'Matte white lacquer']);
  await group('Pendant lights', ['Glass globes', 'Ceramic domes']);
  await group('Worktop and splashback', ['Glazed tile']);
  await group('Metal', ['Matte black']);
  await wait(600);
  await cdp.send('Page.stopScreencast'); await wait(400);
  fs.writeFileSync('/home/user/.review/walk/times3.json', JSON.stringify(times));
  console.log('frames', n, 'errors', JSON.stringify(errs.slice(0, 3))); await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
