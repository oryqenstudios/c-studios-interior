// Records a guided walkthrough of the site on a phone-sized screen (1080 x 1920 output):
// every frame the browser paints is saved with its time, taps are marked, and a caption
// names what is being shown.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/home/user/.review/walk/frames/';
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = `#wk{position:fixed;z-index:99999;left:50%;top:64px;transform:translateX(-50%);max-width:88vw;padding:9px 16px;background:rgba(20,19,18,.86);border:1px solid rgba(184,147,90,.7);color:#ede6da;font:500 13px/1.35 Jost,system-ui,sans-serif;letter-spacing:.06em;text-align:center;border-radius:2px;opacity:0;transition:opacity .35s;pointer-events:none}#wk b{display:block;color:#b8935a;font-weight:500;font-size:10px;letter-spacing:.24em;text-transform:uppercase;margin-bottom:3px}#wk.on{opacity:1}
      .wkt{position:fixed;z-index:99998;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;border:2px solid #fff;background:rgba(255,255,255,.28);pointer-events:none;animation:wkt .6s ease-out forwards}@keyframes wkt{from{transform:scale(.4);opacity:1}to{transform:scale(1.25);opacity:0}}`;
      document.head.append(s);
      const c = document.createElement('div'); c.id = 'wk'; document.body.append(c);
      window.__cap = (a, t) => { c.innerHTML = `<b>${a}</b>${t}`; c.classList.add('on'); };
      const mark = (x, y) => { const d = document.createElement('div'); d.className = 'wkt'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.append(d); setTimeout(() => d.remove(), 650); };
      addEventListener('pointerdown', (e) => mark(e.clientX, e.clientY), true);
      window.__mark = mark;
    });
  });
  const cdp = await ctx.newCDPSession(p); let n = 0; const times = [];
  cdp.on('Page.screencastFrame', async (f) => { const i = n++; times.push(f.metadata.timestamp); fs.writeFile(OUT + String(i).padStart(6, '0') + '.jpg', Buffer.from(f.data, 'base64'), () => {}); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 });
  const wait = (ms) => p.waitForTimeout(ms);
  const cap = (a, t) => p.evaluate(([a, t]) => window.__cap(a, t), [a, t]);
  const row = (t) => p.locator(`.lsc__row:has(.lsc__label:text-is("${t}"))`).first();
  const tap = async (loc, pause = 1500) => { await loc.scrollIntoViewIfNeeded().catch(() => {}); await wait(250); await loc.tap(); await wait(pause); };
  const back = async (pause = 1100) => { await p.locator('.lsc__back').tap(); await wait(pause); };
  const glide = (y, seconds) => p.evaluate(([y, s]) => new Promise((done) => { const from = scrollY, t0 = performance.now(); (function step(t) { const k = Math.min(1, (t - t0) / (s * 1000)); const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; window.scrollTo(0, from + (y - from) * e); k < 1 ? requestAnimationFrame(step) : done(); })(t0); }), [y, seconds]);
  const topOf = (sel, off = 0) => p.evaluate(([sel, off]) => document.querySelector(sel).getBoundingClientRect().top + scrollY + off, [sel, off]);
  const buildAt = (k) => p.evaluate((k) => { const s = document.getElementById('build'); return s.getBoundingClientRect().top + scrollY + (s.offsetHeight - innerHeight) * k; }, k);

  // 1. Hero
  await wait(1600); await cap('01 · Hero', 'A room that builds itself as the page opens'); await wait(10500);
  // 2. Scroll film
  await cap('02 · From plan to home', 'Scrolling drives the film: plan, walls, materials, furniture, light');
  await glide(await buildAt(0.6), 15); await wait(600);
  // 3. Material board
  await glide(await buildAt(0.66), 1.6); await wait(3200);
  await cap('03 · Material board', 'Each room starts as an empty shell'); await wait(2200);
  await cap('03 · Material board', 'Stage 01: surfaces change in the room'); await tap(row('01  Surface selections'), 1800);
  await tap(row('Flooring'), 1300); for (const f of ['White marble', 'Smoked oak', 'Natural walnut']) await tap(row(f), 1500); await back();
  await tap(row('Wall colour'), 1300); for (const f of ['Sage', 'Terracotta', 'Warm white']) await tap(row(f), 1500); await back();
  await cap('03 · Material board', 'Stage 02: fixtures and fittings, each option shown in the room'); await tap(row('02  Fixtures and fittings'), 2200);
  await tap(row('Linear pendant'), 1500); for (const f of ['Tube on wires', 'Alabaster bar', 'Slim bar']) await tap(row(f), 1700); await back();
  await tap(row('Curtains'), 1500); for (const f of ['Lined velvet', 'Timber venetian blinds', 'Sheer linen']) await tap(row(f), 1700); await back();
  await cap('03 · Material board', 'Stage 03: furniture and styling'); await tap(row('03  Furniture and styling'), 2200);
  await tap(row('Sofas'), 1500); for (const f of ['Curved sofa', 'Tailored three-seater', 'Low modular sectional']) await tap(row(f), 1700); await back();
  await tap(row('Rug'), 1500); for (const f of ['Round jute', 'Silk-blend cut pile']) await tap(row(f), 1700); await back(); await back();
  await cap('03 · Material board', 'Choices are saved and sent with the enquiry'); await tap(row('Your choices'), 2600); await back();
  await cap('03 · Material board', 'Scrolling moves to the next room'); await glide(await buildAt(0.76), 2.2); await wait(2600);
  await tap(row('03  Furniture and styling'), 2200); await tap(row('Bar stools'), 1500); for (const f of ['Solid timber saddle', 'Woven cord seat']) await tap(row(f), 1700);
  // 4. Statement
  await cap('04 · Statement', 'The line fills in as a finger moves across it'); await glide(await topOf('#statement'), 3); await wait(3800);
  for (let i = 0; i <= 24; i++) { const x = 60 + i * 17, y = 470; await p.evaluate(([x, y, first]) => { const el = document.getElementById('statement'); el.dispatchEvent(new PointerEvent(first ? 'pointerdown' : 'pointermove', { clientX: x, clientY: y, bubbles: true, pointerType: 'touch' })); window.__mark(x, y); }, [x, y, i === 0]); await wait(70); }
  await wait(700); for (let i = 24; i >= 6; i--) { await p.evaluate(([x, y]) => document.getElementById('statement').dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true, pointerType: 'touch' })), [60 + i * 17, 470]); await wait(55); }
  await p.evaluate(() => document.getElementById('statement').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }))); await wait(1400);
  // 5. Services
  await cap('05 · Services', 'Tap a card to open its three points'); await glide(await topOf('#services', -70), 2.2); await wait(1800);
  for (const i of [1, 2]) { await tap(p.locator('.card').nth(i), 1700); }
  // 6. Process dial
  await cap('06 · Process', 'Turn the dial through the five steps'); await glide(await topOf('#process'), 2.4); await wait(1500);
  const dial = p.locator('.proc__dial'); await dial.scrollIntoViewIfNeeded(); await wait(500); await dial.focus();
  for (let i = 0; i < 4; i++) { const bx = await dial.boundingBox(); await p.evaluate(([x, y]) => window.__mark(x, y), [bx.x + bx.width / 2, bx.y + bx.height / 2]); await p.keyboard.press('ArrowRight'); await wait(1500); }
  await wait(1200);
  // 7. Work
  await cap('07 · Selected work', 'Tap a study to open its details'); await glide(await topOf('#work', -60), 2.2); await wait(1500);
  await tap(p.locator('.work__item').first(), 2600); await p.locator('.work__close').tap().catch(() => {}); await wait(900);
  // 8. Questions
  await cap('08 · Questions', 'Answers open in place'); await glide(await topOf('#questions', -60), 2.4); await wait(1200);
  await tap(p.locator('.faq__q').nth(0), 2000); await tap(p.locator('.faq__q').nth(1), 2000);
  // 9. Consultation
  await cap('09 · Consultation', 'A two-step enquiry that carries the visitor’s choices'); await glide(await topOf('#consultation', -60), 2.4); await wait(1500);
  const sel = p.locator('#f-type'); await sel.scrollIntoViewIfNeeded(); const opts = await sel.locator('option').allTextContents(); await sel.selectOption({ index: Math.min(1, opts.length - 1) }); await wait(1200);
  const next = p.locator('.form__step[data-step="1"] button').first(); if (await next.count()) await tap(next, 2200);
  await wait(1500);
  await cdp.send('Page.stopScreencast'); await wait(500);
  fs.writeFileSync('/home/user/.review/walk/times.json', JSON.stringify(times));
  console.log('frames', n, 'seconds', (times[times.length - 1] - times[0]).toFixed(1), 'errors', JSON.stringify(errs.slice(0, 3))); await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
