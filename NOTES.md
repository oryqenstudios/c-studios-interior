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

## Open questions for the studio

1. **Services: three or four?** The "fill these in" table lists three services
   (Residential, Styling, Renovation management). The Services section asks for four
   cards, including Commercial. Needed before phase 6.

## Decisions made without input

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
