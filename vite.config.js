import { defineConfig } from 'vite';

// While developing, /api/render is served by the same code Vercel runs in production.
// RENDER_DEV_CURL=1 sends its requests through curl (for machines behind a proxy).
function renderApi() {
  return {
    name: 'render-api',
    configureServer(server) {
      server.middlewares.use('/api/render', async (req, res) => {
        const { handle } = await import('./api/render.js');
        let fetchImpl = fetch;
        if (process.env.RENDER_DEV_CURL) {
          const { execFileSync } = await import('node:child_process');
          fetchImpl = async (url, { method = 'GET', headers = {}, body } = {}) => {
            const args = ['-sS', '--max-time', '60', '-X', method, url, ...Object.entries(headers).flatMap(([k, v]) => ['-H', `${k}: ${v}`]), ...(body ? ['-d', body] : [])];
            const out = execFileSync('curl', [...args, '-w', '\n%{http_code}'], { encoding: 'utf8' });
            const cut = out.lastIndexOf('\n');
            return { status: Number(out.slice(cut + 1)), json: async () => JSON.parse(out.slice(0, cut)) };
          };
        }
        let raw = '';
        for await (const chunk of req) raw += chunk;
        const query = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
        try {
          const { status, json } = await handle({ method: req.method, query, body: raw ? JSON.parse(raw) : {}, ip: 'dev' }, process.env, fetchImpl);
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(json));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(error.message) }));
        }
      });
    },
  };
}

// A fresh identifier on every build. Film frames and room files keep the same names when
// they are replaced, so the scripts that request them add this to the address, which
// makes browsers fetch the new versions instead of reusing saved copies.
export default defineConfig({
  plugins: [renderApi()],
  define: {
    __ASSET_VERSION__: JSON.stringify(Date.now().toString(36)),
  },
});
