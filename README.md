# C Studios Interior

Single-page website with two scroll-driven films. Vite, vanilla JavaScript, GSAP and Lenis.
Decisions and open placeholders are listed in [NOTES.md](NOTES.md).

## Run

```bash
npm install
npm run dev      # local development
npm run build    # production build in dist/
npm run preview  # serve the production build locally
```

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

## Films

Each film is a folder of WebP frames under `public/film/<name>/` in three sets: `d`
(1280 x 720), `m` (720 x 405) and `p` (540 x 960, centre crop for portrait phones).
A section opts in with `data-film="/film/<name>"` and `data-frames="<count>"`; captions
inside it fade by their `data-from` and `data-to` (0 to 1 of the section's scroll).

To replace a film, export frames from the new video with ffmpeg, for example:

```bash
ffmpeg -i new.mp4 -vf "fps=8,scale=1280:720" -c:v libwebp -quality 74 -start_number 0 public/film/walk/d/f-%03d.webp
```

then update `data-frames` and the caption timings in `index.html`.
