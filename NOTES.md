# C Studios Interior: build notes

Every placeholder and every decision made without input is listed here.

## Placeholders

| Placeholder | Where | Status |
| --- | --- | --- |
| `[PHONE]` | Footer, structured data | Not yet used (phase 6) |
| `[EMAIL]` | Footer, form failure fallback, form endpoint | Not yet used (phase 6) |
| `[ADDRESS]` | Footer, structured data | Not yet used (phase 6) |
| `[SOCIAL LINKS]` | Footer | Not yet used (phase 6) |
| `[DOMAIN]` | Canonical URL, Open Graph tags | Not yet used (phase 7) |
| `[ABOUT STATEMENT]` | About section, about 80 words | Not yet used (phase 6) |

## Answered by the studio

- **Services.** Four cards: Residential, Commercial, Styling, Renovation management
  (confirmed 21 Nov 2026).

## Decisions made without input

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
