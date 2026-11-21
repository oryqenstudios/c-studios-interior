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
- **Temporary inspection tool.** `src/dev/inspect.js` and the `.inspect` styles add orbit
  control and view buttons. They are removed in phase 3.

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
