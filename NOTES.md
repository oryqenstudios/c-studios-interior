# C Studios Interior: build notes

Every placeholder and every decision made without input is listed here.

## Current state (read this first)

The site was first built to the original plan as a scroll-driven 3D model (phases 1 to 8
below). On 21 Nov 2026 the studio changed direction: real-looking imagery instead of the
3D model. The 3D story, its controls and the Three.js code were removed. The sections
further down that describe the 3D build are kept as a record; that code now exists only
in the Git history (last commit with it: "Add real-life room photographs to the
walkthrough").

The page is now:

1. **Hero film.** A full-screen walk through a finished home (living and dining, kitchen,
   bedroom, bathroom), played frame by frame as the visitor scrolls, with the headline,
   a small room caption and the booking button over it.
2. **Build film.** The section below the hero: a bare concrete shell becomes the finished
   living area as the visitor scrolls, with three of the agreed stage lines as captions.
3. Closing call to action, Services, Process, About, Consultation form, footer (unchanged).

### Decisions in this change

- **Footage source.** All footage was generated with the studio's Higgsfield account:
  still frames with Grok Image 2.0 (guided by frames of the old 3D model, so every room
  shares one layout and palette), and motion with Kling 3.0 Pro image-to-video (five
  5-second moves for the walk, one 10-second first-to-last-frame clip for the build).
  The two reference videos the studio sent were used as direction only and are not in
  the site.
- **These are concept visuals.** They show a model home, not completed client projects.
  Each film carries a small "Concept visual" label, added without being asked. It can be
  removed in `index.html` (`.film__note`).
- **Scrubbing by frames.** Each film is a set of WebP frames drawn to a canvas, with
  neighbouring frames blended, because seeking inside a video file is jerky in several
  browsers. Three sets per film: 1280 x 720, 720 x 405 and a 540 x 960 centre crop for
  portrait phones. The hero is 168 frames and the build film 121. Frames live in
  `public/film/` and are cached for a week rather than a year, as they are not hashed.
- **Weight.** A visitor downloads one set per film: about 4.4 MB plus 3.1 MB on desktop,
  2.4 MB plus 1.7 MB on a portrait phone. Frames load progressively (a coarse pass first)
  and the build film waits until the visitor is near it.
- **Large screens.** Frames are 1280 px wide, so the films are slightly soft above about
  1600 px. A 1920 px set would roughly double the download.
- **Portrait phones** see the centre of each shot, not the full width.
- **Hero copy.** The headline is unchanged. The agreed hero line ("Scroll to build a
  home...") no longer fits a walk-through, so the hero says "Interior design in Singapore.
  Scroll to walk through a home." Draft, for the studio to confirm.
- **Build film copy.** "Floors go down board by board", "Every piece has a place" and
  "Then the lights come on" are used as agreed. "Walls rise from the plan" does not match
  footage of walls being painted, so the opening caption is "It starts as an empty
  shell." Draft, for the studio to confirm.
- **Removed with the 3D model:** material moods, day and night switch, plan navigation,
  orbit, room hover, cursor parallax, quality tiers, the loading screen and the WebGL
  fallback page. The process heading changed from "in the order you just scrolled" to
  "from brief to handover".
- **Kept:** smooth scroll (off with reduced motion), magnetic buttons, the progress line,
  the form and its validation, and all placeholders.
- **Without JavaScript** each film shows its first frame as a still, one screen tall.
- **Share image** is now a crop of the finished living-area frame.
- **Script size** fell from about 209 KB to about 52 KB compressed.
- **Not tested:** real devices, Safari and Firefox, and download behaviour on a slow
  connection.

## Placeholders

| Placeholder | Where | Status |
| --- | --- | --- |
| `[PHONE]` | Footer (`index.html`); later structured data | In the page, awaiting content |
| `[EMAIL]` | Footer (`index.html`) and `VITE_ENQUIRY_EMAIL` in `.env` (form failure message) | In the page, awaiting content |
| `[ADDRESS]` | Footer (`index.html`); later structured data | In the page, awaiting content |
| `[SOCIAL LINKS]` | Footer (`index.html`) | In the page, awaiting content |
| `[ABOUT STATEMENT]` | About section (`index.html`), about 80 words | In the page, awaiting content |
| `[BUDGET RANGE 1]` to `[BUDGET RANGE 4]` | Budget select in the form (`index.html`) | In the page, awaiting content |
| Form endpoint | `VITE_FORM_ENDPOINT` in `.env` (empty = demo mode) | Awaiting a form service URL |
| Site address | `VITE_SITE_URL` in `.env` (feeds the canonical link and share tags) | Set to `https://cstudiosinterior.vercel.app`; change if a custom domain is attached |

Draft copy written without input, for the studio to confirm or replace: the four service
descriptions and their bullets, the five process steps, the section headings, the room
card lines, and the footer line "Interior design in Singapore."

## Answered by the studio

- **Services.** Four cards: Residential, Commercial, Styling, Renovation management
  (confirmed 21 Nov 2026).

## Decisions made without input

### Real-life room photographs (added after phase 7, at the studio's request)

- **Change to the plan.** The plan said everything visual is made in code, with no image
  files. The studio asked for real-life images, so the four rooms now each have a
  photograph. The build sequence, overview and camera moves remain 3D.
- **How they were made.** A daylight frame of each room was captured from the 3D model and
  turned into a photograph with the studio's Higgsfield account (model: Grok Image 2.0,
  reference-guided, 2K, 16:9). They are generated concept images of this model
  apartment, not photographs of completed projects.
- **How they appear.** In each room's part of the walkthrough the camera stops at the
  point the photograph was taken from, the photograph fades in over the 3D view with a
  very slow push-in, then fades out and the walkthrough continues. Jump targets now land
  inside each photograph's window.
- **"Concept visual" label.** A small label shows at the bottom right while a photograph
  is on screen, so visitors are not led to think these are finished client projects.
  It can be removed in `index.html` (`.photos__note`) if the studio prefers.
- **Moods.** The photographs show the default olive and walnut materials. With the sand or
  charcoal mood selected they step aside and the walkthrough stays in 3D. Photographs for
  the other two moods would need eight more images.
- **Day and night switch.** It has no effect on the photographs.
- **Alignment.** A generated photograph does not match the 3D frame to the pixel, so the
  fade is kept short. On portrait phones the photograph is cropped to its centre.
- **Loading.** Photographs load only after the visitor passes 40% of the story, in a
  1920 px or 960 px WebP depending on the screen. They are not shown without WebGL.
- **Not changed.** The overview stays as the 3D model, and the share image is still the
  rendered model.

### Phase 8 (in progress: waiting on the form endpoint and content)

- **Site settings in one place.** The site address, form endpoint and fallback email are
  read from `.env` at build time, so launch needs no code edits for them. `.env` is
  committed because it holds no secrets.
- **Hashed fonts.** Fonts moved from `public/fonts` to `src/assets/fonts` so the build
  gives them hashed filenames, as the plan asks.
- **Host configuration.** Both `netlify.toml` and `vercel.json` are included, each with a
  one-year immutable cache for `/assets/*`. Delete the one not used.
- **Form service.** The form is built for a Formspree-style endpoint. Netlify Forms would
  need a small change to the form markup and submit code.
- **Frame rate changes** (asked for during this phase): frames are only redrawn when
  something changes; multisampling is skipped on screens with a pixel ratio of 2 or more;
  laptops and tablets now step down a tier below 45 fps (phones below 30).
- **Hosting.** Deployed on Vercel from the GitHub repository `oryqenstudios/c-studios-interior`
  at https://cstudiosinterior.vercel.app. Every push to `main` redeploys. `netlify.toml`
  is unused and can be deleted.
- **Not done.** Connecting the form endpoint, a test enquiry, replacing placeholders, and
  checks on real devices and in Safari and Firefox.

### Phase 7

- **Quality tiers.** Chosen at load from processor cores, memory, whether the device is a
  phone, and whether the graphics are software-rendered: high (2048 shadow map, pixel
  ratio up to 2), medium (1024, up to 1.5), low (no shadows, pixel ratio 1, floorboards
  twice as wide, so about half as many). These rules are a starting guess and have not
  been tuned on real devices.
- **Automatic step-down.** If the frame rate stays low for two seconds in a row, the
  site drops one tier (after a three second grace period at start-up). Resolution and
  shadows change straight away; the floorboard count is fixed at load and does not.
- **Checking on a device.** Adding `?stats` to the address shows the current tier and
  frame rate. `?quality=high`, `medium` or `low` forces a tier.
- **Shadow map.** Redrawn only while walls rise or furniture lands, since the sun does not
  move. This is the main saving during the walkthrough.
- **Render pausing.** The loop stops when the tab is hidden and when the story has
  scrolled out of view behind the content sections.
- **Loading screen.** The logo mark on ink, shown only when the 3D view is about to
  start. It clears when fonts are ready and one frame has rendered, or after three seconds
  at most, and then the plan starts drawing. With reduced motion it clears without a fade.
- **Share image.** `public/og-image.png` is rendered from the model by
  `scripts/make-og-image.cjs` (needs Playwright, which is not a project dependency). It
  shows the night overview only, with no logo or text.
- **Metadata.** Title, description, Open Graph and Twitter tags and a canonical link are
  in place, with `[DOMAIN]` to fill in. LocalBusiness structured data is not added yet;
  the plan asks for it only once real contact details exist.
- **Cabinet door joints** are now one instanced mesh per run, to keep the rule that
  anything repeated more than ten times is instanced.
- **Without WebGL.** The hero line reads "How a home comes together..." there, since
  "Scroll to build a home" makes no sense without the 3D view.
- **Not measured.** Real frame rates on a laptop and a mid-range phone. This build
  environment renders in software only.

### Phase 6

- **Service and process copy.** Written in the agreed voice as drafts. They describe
  common studio practice and make no claims about numbers, timings or past work. Please
  confirm each line matches what the studio actually offers.
- **Section headings.** "What we do", "Five steps, in the order you just scrolled",
  "A studio in Singapore" and "Tell us about your space" were chosen without input.
- **Budget ranges.** Left as placeholders rather than invented figures.
- **Project type options.** The four services plus "Not sure yet".
- **Reply promise.** The form says "We reply by email" and gives no reply time, since none
  was supplied.
- **Validation.** Name, email, project type and message are required. Errors appear under
  each field on submit, the first invalid field takes focus, and each error clears as the
  field is corrected.
- **Form states until phase 8.** With no endpoint connected, a valid submission shows the
  success state with a visible "[DEMO: nothing was sent]" note. The failure state can be
  seen in development by adding `?form=fail` to the address.
- **Spam trap.** A hidden "website" field; if it is filled the form shows success and
  sends nothing.
- **Privacy note.** A short paragraph in the footer, linked from under the submit button.
- **Without WebGL or JavaScript.** The story's text panels are laid out as plain stacked
  text above the content sections, the 3D controls are hidden, and the form still works.
- **Header.** Gets a solid background and a hairline once the story has scrolled away.
- **Footer year.** Set from the visitor's clock, with 2026 as the static fallback.

### Phase 5

- **Mood swatches.** Each swatch shows the mood's wall and timber colours as two flat
  halves. The choice is kept in session storage, so it lasts for the visit and resets in a
  new tab.
- **Day and night switch.** Locked until the lights stage has played once. Until the
  visitor uses it, lighting follows the scroll and the switch moves in step with it. Once
  used, the visitor's choice applies at every stage, including on scrolling back up. This
  is the one place where scroll no longer decides the lighting, and it is deliberate.
- **Parallax.** The camera drifts by about 1.2% of its viewing distance. Mouse only, and
  off with reduced motion.
- **Orbit.** Dragging in the overview turns the model up to 34 degrees either way; with a
  mouse it also tilts up to 11 degrees. On touch only sideways drags orbit, so vertical
  swipes always scroll. Release eases back over one second.
- **Room hover and click.** Hovering a room in the overview brightens it and shows its
  name beside the cursor. Clicking or tapping it scrolls to that room. Because a hover on
  the 3D view is not a button, the overview panel also has four real room buttons that do
  the same by keyboard and touch.
- **Jump targets.** Rooms are entered at 72.5% (living), 80% (kitchen), 89.5% (bedroom)
  and 94% (bathroom) of the story.
- **Plan navigation.** The floor-plan button opens a mini plan with four room buttons.
  Escape, clicking outside or choosing a room closes it. The current room is marked.
- **Plan icon.** Drawn in code as a small outline of this apartment's plan.
- **Magnetic buttons.** Primary buttons move up to 8 px toward the cursor. Mouse only, off
  with reduced motion.
- **Header on small screens.** Under 768 px the swatches, switch and plan button sit in a
  second row beneath the logo and the Book a consultation button.
- **Hidden buttons.** Buttons inside a faded-out text panel are made inert so they cannot
  be clicked or focused while invisible.
- **File layout.** Text panel logic lives in `scroll/timeline.js` rather than a separate
  `ui/panels.js`, and `ui/pointer.js`, `ui/plannav.js` and `ui/magnetic.js` were added.

### Phase 4

- **Camera path.** The orbiting views (overhead, tilt, overview) are computed from angles.
  From 64% the camera follows a smooth curve through fixed waypoints, with one waypoint
  just before and one just after each doorway. An automated check samples the path every
  0.02% against every wall and furniture bounding box: no contact, and at least 0.42 m
  to the nearest wall inside the rooms.
- **Route.** The dive comes over the south wall and lands in the south-west of the living
  room looking at the sofa and slat wall. The kitchen pass runs along the north side of
  the island. The walk to the bedroom goes north between the sofa and coffee table. The
  pull back rises straight up out of the bathroom, then moves out to the south-west.
- **Entering and leaving through the top.** The dive and the pull back both pass through
  the ceiling plane. From above the ceiling is invisible; for the pull back it fades out
  between 95% and 96% so the camera never visibly cuts through it.
- **"Slowly turning" overview.** The turn (18 degrees) is driven by scroll, not time, to
  keep the rule that scroll alone decides the state.
- **Lens.** 35 degrees for model views and 60 degrees indoors on wide screens. Portrait
  phones use 78 degrees indoors (68 on tablets), because a 60 degree vertical lens is too
  narrow sideways on a tall screen.
- **Centring.** The model moves to the centre between 64% and 68%, and back to the right
  (or top, on phones) between 96% and 100% so the closing text has room.
- **Room cards.** Each card is shown for its room's scroll range. The bedroom card appears
  at 83%, while the camera is still walking toward the bedroom doorway with the bed in
  view through it. Card copy (one line per room) was written without input.
- **Overview and closing labels.** "The finished home" and "Your turn" were added as small
  labels above the agreed headings. The closing panel also carries a Book a consultation
  button.
- **Interior lighting.** Room lights hang at about 1.5 m and the ceiling is a mid warm
  grey, so ceilings do not burn out. A soft dark band sits behind the header so the logo
  stays readable over bright interiors.

### Phase 3

- **Story length.** The story section is the full twelve screen heights. Stages
  01 to 05 use the first 54% as planned; phase 4 fills the rest.
- **Master timeline.** One GSAP timeline of length 100 (so positions read as scroll
  percentages) is scrubbed by the scroll position. It drives one 0 to 1 value per stage,
  and the scene is rebuilt from those values every frame, which is what makes the build
  exactly reversible. Per-item staggering (each wall, board and piece) is computed from
  the stage value rather than as hundreds of separate tweens.
- **Plan lines fade** between 10% and 18%, once the first walls are up.
- **Wall above doorways.** Each piece appears as its neighbouring wall passes door height,
  so it never floats.
- **Furniture landing.** Each piece drops about 0.9 m and scales with a 4% overshoot.
- **Lights.** Rooms come on in turn across 44% to 54%; the sun dims and cools across 44%
  to 52%.
- **Tilt.** The camera stays overhead until 30%, then tilts to 38 degrees and swings 30
  degrees toward the south-east by 54%.
- **Model placement.** On wide screens the model is shifted right by offsetting the camera
  view rather than moving the model, so its perspective is the same as a centred shot. On
  narrow screens the model takes the top half and text sits in the bottom half over a
  soft dark gradient. "Wide" means at least 900 px wide and wider than tall.
- **Text panels.** Stages 02 to 05 show the label and heading only, as listed in the plan.
  Faded-out panels stay in the page for screen readers.
- **Progress line** shows progress through the whole page, not only the 3D story. Today
  those are the same; they differ once the content sections exist.
- **Scroll cue.** A small "Scroll" label with a moving brass tick (idle motion, switched
  off with reduced motion).
- **Table colour.** The dark table under the model has a faint glow of its own so it never
  drops below the page background at night.
- **Smooth scroll.** Lenis is on by default and off when reduced motion is requested.
- **Removed.** The temporary inspection tool from phase 2.

### Phase 2

- **Layout.** The plan fixes the rooms and openings but not where furniture sits. Positions
  were chosen to keep clear walking lines from each doorway: sofa in the east half of the
  living room facing the slat wall, dining table in the west half, island centred in the
  kitchen with stools on its north side, bath along the bathroom's north wall, toilet on
  its east wall, shower in the north-west corner.
- **Doorways.** Openings are 2.1 m high with a piece of wall above. There are no door
  leaves in 3D. Doors appear only as brass swings in the plan drawing.
- **No windows.** The plan lists none, so none are modelled. Daylight enters from above
  because the ceiling does not cast shadows.
- **Plan lines.** Drawn as thin flat strips (3 cm wide) rather than 1-pixel GL lines, so
  they stay visible on high-density phone screens and each line can draw from its start.
- **Floors.** Boards are 20 cm wide and run east-west with random lengths of 1.3 to 2.2 m.
  Every board and tile has its own tone. All boards share one grain texture.
- **Kitchen.** No sink, hob or appliances are modelled, since the plan does not list them.
  Thin dark reveals suggest cabinet doors.
- **Extras not in the plan.** A stone shower tray and a brass shower head beside the glass
  screen, a throw on the bed, a stone top on the console, and a dark ground plane (the
  "studio table") that catches the model's shadow.
- **Timber tones.** Furniture timber is the mood's timber colour darkened by about a
  quarter so pieces stand out from the floor. Rugs, scatter cushions and the headboard use
  a deeper tone of the mood's fabric colour.
- **Daylight.** The sun sits high in the east-south-east so the walls seen in the
  three-quarter view are lit and shadows are short. The "low ambient fill" is a hemisphere
  light, so ceilings pick up a little warm bounce.
- **Night lighting.** Room lights and glow materials already exist and can be previewed
  with the temporary Night preview button. Their levels will be tuned in phases 3 and 5.
  Because room lights cast no shadows (as the plan requires), a little of their light
  reaches the table outside the walls.

## Open questions for the studio

None at the moment.

## Decisions made without input (earlier phases)

### Phase 1

- **Project root.** The project lives directly in the working folder rather than in a
  nested `c-studios/` folder, since the plan says to start in an empty project folder.
- **Versions.** three 0.187, gsap 3.15, lenis 1.3, vite 8. GSAP and Lenis are installed
  but not imported until phase 3.
- **Soft shadows.** The plan asks for soft shadow maps. In the current Three.js,
  `PCFSoftShadowMap` is deprecated (since r186) and `PCFShadowMap` is the soft-filtered
  type, so the renderer uses `PCFShadowMap`.
- **Fonts.** Variable woff2 files (one per family, Latin subset only) taken from the
  Fontsource npm packages, both under the SIL Open Font License. No italics and no
  extended Latin are shipped. Add them if copy needs them.
- **Logo.** Built as live HTML text in the header (Cormorant "C" in a brass ring, then
  the spaced wordmark) so it uses the self-hosted font. On screens under 480 px only the
  ring mark shows, to leave room for the button.
- **Favicon.** `favicon.svg` uses a system serif fallback (Georgia) for the "C", because
  an SVG favicon cannot load the self-hosted font. It can be converted to an outlined
  path later if exact matching matters.
- **Header contents.** Phase 1 has the logo and the Book a consultation button. Mood
  swatches and the day and night toggle arrive in phase 5. The button links to
  `#consultation`, which does not exist until phase 6.
- **Page title and description.** Working title "C Studios Interior · Spaces, built
  around you." and a one-sentence description using the agreed hero line. Review in
  phase 7.
- **Structure.** `src/scroll/` and `src/ui/` exist as folders but their modules are
  created in the phases that need them, rather than as empty stubs now.
