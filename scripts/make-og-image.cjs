// Renders public/og-image.png (1200 x 630) from the model's night overview.
//
// Usage: start the dev server (npm run dev), then run
//   node scripts/make-og-image.cjs [http://localhost:5173]
// Needs Playwright with Chromium available (it is not a project dependency).
const { chromium } = require('playwright');
const path = require('node:path');

const base = process.argv[2] ?? 'http://localhost:5173';
const out = path.join(__dirname, '..', 'public', 'og-image.png');

(async () => {
const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`${base}/?quality=high`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Show only the canvas, at the overview stage, with the model centred.
await page.addStyleTag({ content: 'body > :not(canvas), main { visibility: hidden !important; }' });
await page.evaluate(() => {
  const story = document.getElementById('story');
  window.scrollTo(0, ((story.offsetHeight - innerHeight) * 59) / 100);
});
await page.waitForTimeout(4000);
await page.evaluate(() => {
    const camera = window.__debug.stage.camera;
    camera.clearViewOffset();
    camera.zoom = 1.3; // fill the frame
  });
await page.waitForTimeout(1500);

await page.locator('#scene').screenshot({ path: out });
await browser.close();
console.log(`Wrote ${out}`);
})();
