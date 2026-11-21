# C Studios Interior

Single-page, scroll-driven 3D website. Vite, vanilla JavaScript, Three.js, GSAP and Lenis.
Decisions and open placeholders are listed in [NOTES.md](NOTES.md).

## Run

```bash
npm install
npm run dev      # local development
npm run build    # production build in dist/
npm run preview  # serve the production build locally
```

Useful address options: `?stats` shows the quality tier and frame rate,
`?quality=high|medium|low` forces a tier.

## Before launch

1. Fill in `.env`: `VITE_SITE_URL`, `VITE_FORM_ENDPOINT`, `VITE_ENQUIRY_EMAIL`.
   The same names can be set in the host's environment settings instead.
2. Replace the remaining placeholders in `index.html` (search for `[`): phone, email,
   address, social links, the About statement and the four budget ranges.
3. Confirm the draft copy listed in NOTES.md.

## Form

The form posts its fields to `VITE_FORM_ENDPOINT` and expects a JSON reply, which is how
Formspree and similar services work. Create a form there that delivers to the studio's
enquiry inbox and paste its URL into `.env`. While the value is empty the form runs in
demo mode: it validates, shows the success state with a "[DEMO]" note and sends nothing.

## Deploy

`netlify.toml` and `vercel.json` are both included. Either host builds with
`npm run build`, publishes `dist/` and serves `/assets/*` (hashed fonts, script and
styles) with a one-year cache. Connect the repository, set the environment values, then
attach the domain.

## Share image

`public/og-image.png` is rendered from the model:

```bash
npm run dev
node scripts/make-og-image.cjs
```

This needs Playwright with Chromium, which is not a project dependency.
