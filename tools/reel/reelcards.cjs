// Caption overlays (transparent) and the end card for the reel, set in the site's own fonts.
const { chromium } = require('playwright');
const A = '/home/user/src/assets';
const fs = require('fs');
const b64 = (f) => fs.readFileSync(A + '/' + f).toString('base64');
const CSS = `@font-face{font-family:B;src:url(data:font/woff2;base64,${b64('fonts/bodoni-moda-latin-wght-normal.woff2')})}@font-face{font-family:J;src:url(data:font/woff2;base64,${b64('fonts/jost-latin-wght-normal.woff2')})}
*{margin:0;box-sizing:border-box}html,body{width:1080px;height:1920px;background:transparent}
.cap{position:absolute;left:0;right:0;top:250px;height:520px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 90px;background:radial-gradient(closest-side,rgba(20,19,18,.62),rgba(20,19,18,0))}
.l{font:500 27px J;letter-spacing:.34em;text-transform:uppercase;color:#b8935a;margin-bottom:30px}
.t{font:400 84px/1.1 B;color:#ede6da;text-wrap:balance}
.top{position:absolute;top:150px;left:0;right:0;text-align:center;font:400 30px J;letter-spacing:.3em;text-transform:uppercase;color:#ede6da;opacity:.92}
.end{position:absolute;inset:0;background:#141312;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.end img{width:300px;margin-bottom:60px}.end .n{font:400 76px J;letter-spacing:.2em;text-transform:uppercase;color:#ede6da}
.end .m{font:italic 400 44px B;color:#b8935a;margin-top:34px}.end .r{width:120px;height:1px;background:#b8935a;margin:70px 0}.end .u{font:400 30px J;letter-spacing:.2em;color:#a59c90}`;
const caps = { a: ['C Studio Interior', 'It begins as an empty room.'], b: ['From the first line', 'Every home starts as a drawing.'], c: ['Build it up', 'Surfaces. Fittings. Furniture.'], d: ['Eight looks', 'One home, many moods.'], e: ['Make it yours', 'Choose every piece.'] };
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 });
  for (const [k, [l, t]] of Object.entries(caps)) { await p.setContent(`<style>${CSS}</style><div class="cap"><div class="l">${l}</div><div class="t">${t}</div></div>`); await p.evaluate(async () => { await document.fonts.load('400 84px B'); await document.fonts.load('500 27px J'); await document.fonts.ready; }); await p.waitForTimeout(300); await p.screenshot({ path: `/home/user/.review/reel/cap-${k}.png`, omitBackground: true }); }
  await p.setContent(`<style>${CSS}</style><div class="end"><img src="data:image/png;base64,${b64('logo-c.png')}"><div class="n">C Studio Interior</div><div class="m">An interior journey with you.</div><div class="r"></div><div class="u">cstudiosinterior.vercel.app</div></div>`); await p.evaluate(async () => { await document.fonts.load('400 76px J'); await document.fonts.load('italic 400 44px B'); await document.fonts.ready; }); await p.waitForTimeout(600); await p.screenshot({ path: '/home/user/.review/reel/end.png' });
  await b.close(); })();
