# C Studio Interior: build notes

Every placeholder and every decision made without input is listed here.

## The page as it stands now (read this first)

The studio supplied a 14-section flow written around the original 3D model, then chose
to keep the films and adapt the flow to them ("option A"), and asked for the flow's
order to be followed. Sections older than this one in this file are history.

| # | Flow section | What was built |
| --- | --- | --- |
| 0 | Loader | The C mark wipes in on ink, then the page fades up. 1.2 s normally, 1.8 s at most. The flow asked for the mark to draw itself; the logo is a photograph-filled image, not line art, so it is revealed with a wipe instead. |
| 1 | Header | Logo and four anchor links (Services, Process, About, Contact). Hides on the way down, returns on the way up. **No booking button**: the studio asked for those to be removed before choosing this flow, and that instruction was kept. |
| 2 | Hero | The arrival: entrance wall with the name and motto, then through the walnut door (first 5 seconds of the house walk). |
| 3 | Build story | The model-to-door film with four short stage headings: "It starts as a model.", "Then you step inside it.", "Walls, floors, joinery, light.", "And the door opens." The flow describes walls rising and floors being laid; this film does not show that, and the third heading only names it. |
| 4 | Walkthrough | The rest of the house walk with four room cards (living space, kitchen, primary suite, bath). The dining room and the closing sea view pass without a card. |
| 5 | Statement | "A home should feel like the people who live in it. / We take the journey there with you." revealed line by line. Draft copy. |
| 6 | Services | Four cards that rise in turn; on desktop they tilt toward the cursor and their edge lights up. |
| 7 | Material moods | Three palettes of the living room, each by day and night (six generated images that cross-fade), with material names. Replaces the live 3D restyling the flow describes. |
| 8 | Process | Five steps. On screens at least 900 px wide the section pins and scrolls sideways while a brass line fills; on phones and with reduced motion it is a vertical list. Durations are placeholders. |
| 9 | Selected work | A sideways drag gallery of four **concept studies**, labelled as studio concepts and not client projects, each opening a detail panel. No location or size is given, since they are not real projects. |
| 10 | About | Text and portrait slide in from opposite sides. Story, founder name, role and portrait are placeholders. |
| 11 | Questions | Six questions in an accordion with a smooth height change. Only "Which areas do you serve?" has an answer ("We work across Singapore", from the plan). The rest are placeholders. |
| 12 | Consultation | Two-step form (project, then contact details) over the house at dusk. Success shows a tick that draws itself. Still in demo mode. |
| 13 | Footer | Unchanged. |

### Decisions and conflicts in this change

- **Booking buttons.** The flow asks for four; the studio had just asked for all of them to
  be removed. The removal was kept. The header's Contact link is the route to the form.
- **Testimonials** are left out, as the flow itself says.
- **"Your space next?"** section removed; the statement takes its place.
- **Footage reuse.** No new video was generated: the hero and the walkthrough are two
  parts of the same 30-second house walk. Five new stills were generated for the moods.
- **Durations, founder, story, answers, portrait** must come from the studio. None were
  invented.
- **Magnetic buttons** now only affect the form's buttons, since the others were removed.
- **Not tested:** real devices, Safari and Firefox, and the live site.

### Draft content written on request ("generate me everything")

The studio asked for the missing content to be generated. Everything below is a **draft
written without facts from the studio** and must be confirmed or corrected before it is
relied on. None of it was verified.

- **Process durations.** Brief about 1 to 2 weeks, Plan 3 to 6, Build 8 to 12, Style 1 to
  2, Handover about 1 week. These are typical ranges for a home renovation, not the
  studio's own figures.
- **Studio story.** Two paragraphs built only from what is known: an interior design
  studio in Singapore offering residential, commercial, styling and renovation
  management. It claims "one team looks after design, styling and the renovation itself";
  confirm that is how the studio works. No founding year, team size or history is stated.
- **Answers to the questions.** Cost (no figures; says an itemised quotation follows the
  brief), timeline ("about three to five months" for most homes, consistent with the
  durations above), what the fee includes, renovation management, and how to start.
- **Budget ranges** in the form: Under S$50,000; S$50,000 to S$100,000; S$100,000 to
  S$200,000; Above S$200,000.

### Deliberately not generated

Inventing these would put false facts about a real business and real people on a live
site, so they were left out of the page until the studio supplies them:

- **Phone, email, address, social links.** The footer now shows "Singapore" and a link to
  the enquiry form. A comment in `index.html` marks where the details go.
- **Founder name and role.** The line was removed from the About section.
- **Founder portrait.** The slot shows a detail of the house (a concept visual) in its
  place.
- **Enquiry email.** `VITE_ENQUIRY_EMAIL` is empty, so the form's failure message no
  longer offers an email address.
- **Form endpoint.** Still not connected; the form remains in demo mode.

### New placeholders (now resolved or removed as described above)

`[DURATION 1]` to `[DURATION 5]` (process), `[STUDIO STORY]`, `[FOUNDER NAME]`,
`[FOUNDER ROLE]`, `[PORTRAIT]` (about), `[ANSWER 1]`, `[ANSWER 2]`, `[ANSWER 4]`,
`[ANSWER 5]`, `[ANSWER 6]` (questions). All are in `index.html`.

## Earlier state: the first film version (history)

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
2. **Step-inside film.** The section below the hero: a scale model, a corridor, a door
   that opens onto the finished room (see "Step-inside section" below).
3. Closing call to action, Services, Process, About, Consultation form, footer (unchanged).

### Booking buttons removed (studio request)

The Book a consultation buttons were removed from the header, the end of the hero, the
step-inside section and the "Your space next?" section. The only one left is the submit
button of the enquiry form itself, which the form needs in order to send. There is now
no shortcut to the form: visitors reach it by scrolling to the Consultation section.
The header holds only the logo.

### Step-inside section (replaces the shell-to-home film)

The studio sent a fourth reference and asked for the same style and format: a dark page
with text on the left and a scale model on the right; scrolling dives into the model,
down a corridor, and through a door into the finished room.

- **Footage.** Three stills (the model on a dark ground, the plaster corridor with a walnut
  door, the door open onto the hero's living room) and two camera moves (5 and 8 seconds),
  generated with the studio's Higgsfield account in the hero house's palette. 130 frames:
  about 2.7 MB on desktop, 2.1 MB on portrait phones.
- **Copy (draft).** "Step inside before it is built." and "Every project starts as a model
  you can walk through. Scroll, and open the door." The second line is a claim about how
  the studio works; confirm it is true or change it.
- **The model and the house are not the same floor plan.** The model is an apartment; the
  hero is a house. Only the living room furniture and palette carry across.
- **Removed.** The earlier shell-to-home film and its captions.
- **Booking button** added in this section's opening text.
- **Phones.** The text sits over the model on portrait screens, with a dark fade behind it.

### Stale files in visitors' browsers, 22 Nov 2026

The studio reported that updates were not showing. Cause: `/film/*` and `/cfg/*` were
served with a one-week cache, but those files keep the same names when replaced, so
browsers kept showing old hero frames and old room data (and the customiser's old data
no longer matched the new code). Fixed by adding a per-build version to every address the
scripts request (`__ASSET_VERSION__`, set in `vite.config.js`), versioning the poster
addresses in `index.html`, and cutting the cache on those folders to ten minutes with
revalidation. Hashed files under `/assets/` are unaffected and still cached for a year.
When replacing a poster image, bump its `?v=` in `index.html`.

### Deployment failure, 21 Nov 2026

From the commit that removed the 3D view until the fix, Vercel rejected every deployment,
so the live site kept showing the old 3D version. Cause: a caching rule had been inserted
into `vercel.json` twice, once nested inside another rule. The file was valid JSON but
did not match Vercel's schema. Fixed in "Fix vercel.json so deployments succeed again".
Lesson recorded: a local build does not validate `vercel.json`; check the live site or
the Vercel deployment list after each push.

### Name, logo and motto (supplied by the studio)

- **Name.** "C Studio Interior" (singular). The build plan said "C Studios Interior"; every
  mention on the site is corrected. The repository and Vercel address still say
  "studios".
- **Motto.** "An interior journey with you." It replaces the working line "Spaces, built
  around you." as the hero headline, page title, share text and footer line.
- **Logo.** The studio's C mark (a serif C filled with an interior photograph) was cut out
  of the supplied 1080 px JPEG with a transparent background, because the site is dark and
  the file has a white one. The wordmark "Studio Interior" is set as live text in light
  Manrope, which is close to but not the same typeface as the logo. A vector or
  transparent original from the studio would be sharper and exact.
- **Favicon.** Now the C mark on ink (`favicon.png`, `apple-touch-icon.png`). The old
  `favicon.svg` was removed.
- **Colours unchanged.** The logo is terracotta and dark brown on white; the site remains
  ink, plaster and brass.

### New hero (latest change)

The studio sent a third reference and asked for the same concept: one continuous walk
through a house with large room titles. The hero was rebuilt to match.

- **A new house.** Seven stills of one contemporary tropical house (entrance, living
  space, dining room, kitchen, primary suite, bath, grand view) in warm plaster, walnut,
  olive and brass, then six 5-second first-to-last-frame camera moves joining each room to
  the next, all generated with the studio's Higgsfield account. Joined end to end they
  make one 30-second walk with no cuts. The reference video itself is not used.
- **Titles.** The studio name and headline sit on the entrance wall at the start. Each
  room then gets a large title in thin capitals (Manrope 200) with a number and one line
  of copy, alternating left and right and drifting slightly as it passes. The last title,
  "The grand view", carries a booking button. Room names follow the reference; the
  one-line descriptions are drafts for the studio to confirm.
- **Readability.** A dark wash fades in behind each title and out again, so the footage
  is seen clean between titles.
- **Length and weight.** The hero is nine screen heights of scroll and 180 frames:
  about 6.9 MB on desktop, 3.4 MB on small landscape screens and 3.2 MB on portrait
  phones. This is heavy for a first screen; frames load progressively.
- **Mismatch to resolve.** The build film below the hero still shows the earlier apartment
  (olive walls, dark walnut), not this house.
- **Step 1 of the list above is superseded** by this hero; the earlier apartment walk
  footage was removed.

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
- **Page title and description.** Working title "C Studio Interior · Spaces, built
  around you." and a one-sentence description using the agreed hero line. Review in
  phase 7.
- **Structure.** `src/scroll/` and `src/ui/` exist as folders but their modules are
  created in the phases that need them, rather than as empty stubs now.

## All four rooms built up from empty, and the studio's materials catalogue

- **Living room, kitchen and bedroom** now work like the bathroom: each starts empty and is
  built up in three stages (surface selections, fixtures and fittings, furniture and
  styling). Their options are described in `tools/rooms/<room>.json`.
- **Catalogue, sections 1 and 2 (as supplied by the studio)** are in `src/ui/catalogue.js`:
  nine floors with their colours, finishes and permitted layouts; six wall finish types
  and eight wall colours. In the board these are four rows: Flooring, Floor layout (only
  the layouts that floor allows), Wall finish, Wall colour. The choice is shared by all
  four rooms. "Themes" is gone from these rooms.
- **How layouts are drawn.** Each room description gives the four corners of its floor
  (`floor.quad`) and its rough size in metres; the packer turns that into a matrix
  (`floorH` in `meta.json`) so boards and tiles are drawn in true perspective. Straight,
  herringbone, chevron, 60 cm tile, large slab and seamless are drawn; marble gets veins,
  terrazzo speckles, microcement a soft mottle. Polished finishes show light more
  strongly than matte ones. These are drawn approximations over a photograph, not
  samples of real products.
- **Wall finish types.** Limewash clouds the colour, Venetian plaster adds sheen, fluted
  panel and timber slats draw vertical ribs, stone cladding draws travertine slabs.
  Timber slats and stone cladding use their own material colour (walnut, travertine)
  instead of the wall colour. DECISION OF MINE: the studio's table says slats come "in
  the chosen wood" and cladding in "marble or travertine"; a second choice for those is
  not built yet.
- **Ceilings** are cut out of the wall area (`ceiling` polygon in the room description)
  so a wall finish never paints the ceiling.
- **Catalogue sections 3 to 7** (cabinetry, countertops, glass, metal accents, fabrics)
  are NOT built yet. They need each placed piece split into parts (fronts, worktop,
  handles, upholstery), which means more generated outline pictures. To be agreed first.

## Quality pass on the built-up rooms

- Each piece is now three pictures: the piece alone, the **shadow** it throws (drawn by
  multiplying, so it falls on whatever is under it: floor, rug or another piece) and the
  **light** it adds (lamps, backlit mirror). Before, a patch of the picture around the
  piece was pasted in, which smeared over neighbours and left furniture floating on rugs.
- Outlines are mended where the image model left bites in them; stray specks are dropped.
- "See-through" handling is now only for clear glass (`open: true`) or, in the bathroom,
  gaps seen in shadow (`open: "loose"`). It had been eating into paper shades and slats.
- The empty living room, kitchen and bedroom were regenerated **without curtains**
  (`empty2.png`), and their blinds redone on that, so nothing shows under the blinds.

## Defect pass on the built-up rooms

Every option in every room was photographed close up against a dark floor and a coloured
wall, and the defects found were fixed in `tools/pack-build-room.py`, the room
descriptions and `src/ui/customise.js`:

- **Outlines**: lower threshold so dark things (olive sofa) keep their base; ragged edges
  of curtains and wall panels ironed straight (`smooth`, `straight`); the stone panel
  borrows the slat panel's clean outline (`shape_from`); parts the outline picture missed
  are added back (`include`: the towels and candle on the bathroom stool).
- **See-through pieces**: clear glass shades are now softly transparent (`glass`), not
  punched with holes; open areas of the heated rail, oak ladder, four-poster bed and
  black island are marked by hand (`through`) so the wall shows between the rails.
- **Mirrors** (`reflect`): the reflected wall follows the chosen wall colour.
- **Backlit mirror**: outline pulled in (`shrink`) so its halo is carried by the glow
  layer and has a soft edge.
- **Shadows** are measured everywhere near a piece (the "unstable" garden test no longer
  blanks them) and smoothed, so pieces sit on the floor and on rugs.
- **Floors**: a joint-free copy of the floor (`floor.webp`) is used under any catalogue
  flooring, so the old stone joints no longer show through boards; hairline gaps in the
  wall and floor areas are closed. Marble veins are finer and calmer.
- **Walls in perspective**: each room description lists its main walls (`walls`), so
  slats, fluting and stone joints run along the wall as it recedes. Stone cladding is
  now quiet banded travertine. The bathroom ceiling is cut out of the wall area.
- **Highlight**: when looking at one piece, pieces in front of it are no longer lit up.
- **Phones**: with the board along the bottom, the whole height of the room is fitted
  into the free part of the screen (before, the floor was hidden behind the board).

Known small leftovers: a speck of unrecoloured wall beside the towel on the heated rail,
and a slightly uneven right edge on the backlit mirror's halo. Both would need those two
pictures regenerated.
