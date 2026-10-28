# BE BEAUTY website: design

First approved in chat on 2026-10-27 ("Quiet luxe", placeholder content). Revised and approved the same
day as **version 2**: real content from Bella's own site, mobile-first, "Rose luxe". **Version 3**, approved the same day,
turns the page into one continuous 3D world ("Rose Quartz Ritual") with a first-visit sound and language
portal; see the section below.

## Client

Bella Bayar, face sculptor, educator and licensed esthetician, originally from Mongolia and based in
Stockholm. Business: **BE BEAUTY Salon & Academy**, tagline "Beauty. Balance. Glow." Two studios
(Västmannagatan 12 in Vasastan, Jaktgatan 29 in Norra Djurgården) and a team of three therapists. Her own
method is **Femina Bella Est®**. Everything her current site and Bokadirekt page say is in
[`docs/current-site-audit.md`](../../current-site-audit.md).

## Goal

Present the brand and send visitors to book. Booking happens on **Bokadirekt** (her existing booking page,
4.9/5 from 478 ratings). Other contact: email and Instagram. No WhatsApp or phone number is published, so
the site shows none.

## Design principles

- **Phone first.** The 375px layout is the base design; larger screens are an extension. The phone is where
  the motion should impress: scroll and touch moments, not hover effects.
- **Fast on mobile data.** The hero photo is preloaded; three.js loads after the page is up; MapLibre loads
  only near the studios section.
- **Reduced motion respected.** With `prefers-reduced-motion`, no Lenis, pins, counters, shader or map fly-in.

## Tech

- Vite, with GSAP (ScrollTrigger) and Lenis for motion, **three.js** for the hero shader, MapLibre GL with
  free OpenFreeMap tiles for the map.
- A build-time plugin (`vite.config.js`) fills `data-i18n` / `data-i18n-attr` / `data-contact` /
  `data-link` hooks with the Swedish copy; `src/i18n.js` swaps them at runtime.
- GitHub Actions publishes to GitHub Pages at `https://evoryder8-collab.github.io/bella-website/`.
  `base: './'` keeps paths relative. `noindex` stays until the user says the site is launching.

## Visual style: "Rose luxe"

| Token | Value | Use |
| --- | --- | --- |
| blush | `#F6E9E4` | page background |
| blush-deep | `#EFD6CF` | panels |
| rose | `#E7A3A0` | Bella's brand rose: accents, tags |
| rose-deep | `#8E4651` | accent text on blush |
| wine | `#3A1F26` | text, buttons |
| night | `#24141A` | dark sections |
| cream | `#FFF4EE` | light text, cards |

Bodoni Moda (display, italic accents) and Jost (body). Arch-topped photo frames echo a gua sha stone.

## Page, top to bottom

1. **Hero.** Full-screen portrait on phones (an arch on desktop) under a huge "BE / BEAUTY". The portrait
   is a WebGL surface (`src/hero-sculpt.js`): a finger or mouse pushes the image along the stroke with a
   faint colour split and rose glow; one demo stroke plays on load; the `<img>` stays as fallback.
2. **Beauty. Balance. Glow.** One pinned screen; three photo panels wipe up in turn as you scroll, each with
   its word and line. Without motion, three stacked full-height panels.
3. **Femina Bella Est®.** The method story, gua sha "lift lines" drawn over the photo on scroll, Tokyo 2026
   note, booking button, and a band of techniques.
4. **Treatments.** Twelve cards in three groups (Face, Signature TCM, Body) on a native scroll-snap track;
   chips jump between groups; upcoming cards fan slightly; every card links to Bokadirekt.
5. **Proof.** 4.9 counts up and the stars fill; 10+ years, 3 salons, 3 jury roles in 2026, silver at the
   2025 European Championships; championship photo and the Hudterapeuten cover tilting in.
6. **About Bella.** Story, her quote lighting up word by word, awards timeline that draws as you scroll,
   education, the team.
7. **Reviews.** Six reviews from her site as a card deck: drag the top card away to see the next.
8. **Academy and Corporate Wellness.** Two cards; both enquire by email with a prefilled subject.
9. **Studios.** Rose-tinted map with both studios; chips fly the camera to one; addresses, directions,
   hours, email, Instagram.
10. **Footer** with the wordmark. On phones a booking bar sits in the thumb zone after the hero.

## Out of scope

Online booking on the site itself (Bokadirekt handles it), shop, CMS, analytics, contact form, separate
URLs per language, dark mode, the Bella video in `~/Downloads` (kept for later video editing).

## Testing

Preview at 375px first, then desktop, in both languages: the hero shader responds to drags, the pinned scene,
carousel chips, deck throws, map chips, all links (Bokadirekt, mailto, Instagram, directions, anchors), no
horizontal scroll on phones, no console errors in the production build. Then push to `main` and check the
live URL.

## Version 3: "Rose Quartz Ritual"

Asked for because version 2 still read as blocks: hard colour cuts between sections, boxed photos and
decorative lines that looked like placeholders.

- **One world, no hard cuts.** A fixed WebGL scene sits behind the whole page (`src/world`). Sections no
  longer paint their own backgrounds: `data-tone` on each section feeds one blended gradient
  (`src/tones.js`) that both the CSS fallback and the WebGL backdrop use, and every blend finishes inside the
  space between chapters so light text never sits on a light background.
- **The rose-quartz stone** (procedural gua sha shape, physical transmission material) refracts whatever is
  behind it. It rests by Bella's cheek and follows a finger over the portrait, which flows where it passes;
  it stays with the hero and scrolls away with it (after review, following the reader down the page felt
  intrusive).
- **The satin ribbon** sweeps in front of the hero, then rides one screen edge per chapter and crosses only
  between chapters. It parts around a finger.
- **Photos are liquid.** Every photo is redrawn in WebGL over its DOM box: an organic dissolve instead of a
  wipe, a flow under the finger, a slight bend with scroll speed and the stone's light pooled on it.
- **Living frames** (`data-gl-alive`: the method, championship, Bella and jury photos): the edge breathes instead of
  being a fixed rectangle, a pearl rim of light travels round it, a rose aura glows outside it, a glint sweeps
  across as it scrolls, and the frame tilts in 3D towards the finger.
- **Glass surfaces** for cards, reviews, offers and the booking bar; the map melts into the page.
- **The studio map** (MapLibre GL JS 6.12, the same version as the AusMC site) opens on a NASA Blue Marble globe in
  a painted starfield (`src/starfield.js`), flies down from orbit to the Vasastan studio when the section comes into
  view, hands over to the rose street map with 3D buildings, then orbits slowly.
- **Scrolling on phones** is driven by Lenis (`syncTouch`) so the WebGL layer and the text move in the same frame,
  and phones use near-opaque glass instead of a per-frame blur.
- **Treatment figures** (`src/world/figures.js`, 2026-10-28, replacing line drawings the user rejected): real 3D
  sculptures from Blender's CC0 Human Base Meshes (the realistic female body, baked in Blender 5.2 into a bust
  and a full figure, `src/models/`). Face: a polished rose-gold bust that turns under a travelling light and
  fades out at the chest in a fine halftone. Signature TCM: the same bust deepening to satin rose bronze, with
  pearl acupoints on the real face, gold light flowing along the gua sha lift lines and a rose-quartz stone
  gliding up the cheek. Body: the full figure in rose bronze after the Chinese acupuncture statues, with gold
  meridians (front, arms and down the spine) on a slow turn, dressed over the chest and round the hips in
  sculpted blush-silk blooms with gilded hearts and leaves (`src/world/flowers.js`) that open as it forms.
  Figures dissolve into each other through rose dust. With reduced motion there is no world and the space closes.
- **Floating social gems**: rose-quartz Instagram and Facebook buttons fixed at the right edge, arriving one by
  one once the visitor starts scrolling, then floating and catching a glint.
- **Swipe nudges**: the treatment cards lean left and spring back, and the top review card swings out and back,
  the first time each comes into view (once more, gentler, if nobody has touched them).
- **First-visit portal** (`src/portal.js`): "Sound on?" first (large recommended yes, smaller no), then the
  language, detected from the device and picked after a five-second countdown that can be paused. A
  `?lang=` link skips the language step; `?intro` shows the portal again. The portal sits over the dark 3D
  world with the stone turning alone; entering dissolves it into the hero's entrance.
- **Premiere** (`src/premiere.js`): after the portal the screen goes dark with dust drifting in a beam of
  light; "Bella Bayar" writes itself letter by letter in champagne light, a glint crosses it and "presents"
  follows. The name lifts away and the dark opens like an iris from her face, so the portrait arrives first and
  the BE BEAUTY title after it. A tap or key fast-forwards it. Returning visitors get the shorter hero entrance.
- **Seamless chapters** (2026-10-28): where neighbouring sections change colour they leave extra room
  (`--tone-gap`), and the colour eases across it in many stops, so no band or line shows. The hero and the
  approach scene both end in the same night colour, the approach photos fade out at their bottom edge in
  WebGL (`data-gl-fade`) so the page's own colour carries on, its progress line bows out, and the studio map
  melts in through a long eased fade on a still wrapper.
- **The award**: after "presents", a laurel wreath grows round 2026 over "Best Beauty Salon", Stockholm Beauty
  Week (October 2026), with the jury's motivation, before the dark opens on the hero.
- **Pages** (2026-10-28, approved by the user on the condition that the home page stays exactly as it is):
  About Bella (`om/`: the award, her story, awards and education, a gallery), Treatments (`behandlingar/`: the
  full menu per group with its figure and prices), Academy (`akademi/`: courses and Corporate Wellness) and
  Contact (`kontakt/`: the studios map, hours, email and Instagram). Page changes happen under a satin curtain
  without reloading, so the 3D world, stone and sound continue; on other pages the stone floats beside the
  title and the ribbon rides the edge from the start. With reduced motion, links load pages normally.
- **The Hudterapeuten magazine** (`src/magazine/`): the first time the cover is fully in view it lifts off the
  page, bursts open with its pages fanning, riffles back and shuts, landing exactly as the photo it started as.
  Each leaf is simulated paper (flicked, rising against gravity, falling over the spine, a small bounce, an edge
  that drags and flaps), with glossy light, a curved gutter and shadows from the leaf above. The inside pages are
  editorial layouts painted from Bella's photos with text greyed into bars, made to be glimpsed, not read.
- **Sound** (`src/sound.js`), composed live with Web Audio: an ambient pad through four chords, an air layer
  that follows scroll speed, crystal chimes for the stone's chapters and the treatment cards, a silk swish for
  thrown review cards. A header toggle mutes it; returning visitors who chose sound hear it from their first tap.
- **Fallbacks**: without WebGL the page keeps its photos and blended colours; with reduced motion there is no
  world, pinning or countdown animation; the portal still asks, without effects.
