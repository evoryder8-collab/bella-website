# BE BEAUTY

Website for BE BEAUTY, Bella Bayar's face sculpting salon and academy in Stockholm. Swedish and English,
designed phone first.

Live preview: https://evoryder8-collab.github.io/bella-website/ (add `?lang=en` for English)

## Working on it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. `npm run build` writes the static site to `dist/`.

- Copy, contact details, studios and prices: [`src/content.js`](src/content.js). What Bella still needs to confirm: [`CONTENT.md`](CONTENT.md).
- Pages: the home page [`index.html`](index.html), plus [`om/`](om/index.html) (About Bella), [`behandlingar/`](behandlingar/index.html) (treatments and prices), [`akademi/`](akademi/index.html) (Academy and Corporate Wellness) and [`kontakt/`](kontakt/index.html) (studios, map, contact). [`linkinbio/`](linkinbio/index.html) is Bella's link in bio for Instagram (every way to reach her, the award, the magazine and the three methods in 3D); nothing on the site links to it. The header, menu, portal, footer and booking bar are shared from [`src/partials/`](src/partials), pulled in at build time by `vite.config.js`.
- Moving between pages: [`src/router.js`](src/router.js) fetches the next page and swaps its `<main>` under a satin curtain, so the 3D world and the music carry on; each page's scenes start and stop with it (`mountPage` in `src/main.js`, `mountMotion` in `src/motion.js`). Every page is also a real file that works on its own.
- Markup: [`index.html`](index.html) and the page folders. Elements with `data-i18n`, `data-contact` and `data-link` are filled from `src/content.js`, both at build time (`vite.config.js`) and when the language changes (`src/i18n.js`).
- Styles: [`src/styles.css`](src/styles.css), written phone first (base rules are the 375px layout).
- Motion (GSAP ScrollTrigger, Lenis): [`src/motion.js`](src/motion.js). Section colours that blend instead of cutting: [`src/tones.js`](src/tones.js).
- The 3D world (three.js, lazy-loaded) in [`src/world/`](src/world): one fixed WebGL scene behind the page with the rose-quartz stone (`quartz.js`), the satin ribbon (`ribbon.js`), a quiet starfield (`stars.js`), the scroll-graded backdrop (`atmosphere.js`) and every photo redrawn as liquid (`media.js`). `index.js` runs the scene and keeps the stone with the hero.
- First-visit ritual (sound, then the language with a five-second countdown, then the engraved stone to touch to enter; the first three visits): [`src/portal.js`](src/portal.js), the engraving in [`src/world/plate.js`](src/world/plate.js). Click the header's BE BEAUTY wordmark on the home page, or add `?intro` to any URL, to see it again.
- "Bella Bayar presents", the dark title card between the portal and the hero: [`src/premiere.js`](src/premiere.js).
- The Hudterapeuten cover that opens, riffles and shuts as a real magazine (three.js, loaded when the cover is near): [`src/magazine/`](src/magazine). `pages.js` paints the inside pages, `book.js` runs the paper physics.
- Soundscape, composed live with Web Audio (no audio files): [`src/sound.js`](src/sound.js).
- Treatment figures, sculpted in 3D: [`src/sculpture/`](src/sculpture), each drawn in its own canvas at the screen's full sharpness and prepared well before it scrolls into view; the flower dress and back leaf are in [`src/sculpture/flowers.js`](src/sculpture/flowers.js). The models in [`src/models/`](src/models) come from Blender's [Human Base Meshes](https://www.blender.org/download/demo-files/#assets) (CC0), baked into a bust and a full figure with Blender 5.2.
- Treatment carousel: [`src/carousel.js`](src/carousel.js). Review deck: [`src/deck.js`](src/deck.js).
- Studio map (MapLibre GL JS 6.12): a NASA Blue Marble globe in space (`src/starfield.js`) that flies down to the studio, then OpenFreeMap streets recoloured to the palette with 3D buildings: [`src/map.js`](src/map.js).

All motion, the 3D world and the map fly-in are skipped under `prefers-reduced-motion`; without WebGL the page shows its plain photos over the same blended colours.

## Deploying

Every push to `main` builds the site and publishes it to GitHub Pages through
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
