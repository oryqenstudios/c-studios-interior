import { defineConfig } from 'vite';

// A fresh identifier on every build. Film frames and room files keep the same names when
// they are replaced, so the scripts that request them add this to the address, which
// makes browsers fetch the new versions instead of reusing saved copies.
export default defineConfig({
  define: {
    __ASSET_VERSION__: JSON.stringify(Date.now().toString(36)),
  },
});
