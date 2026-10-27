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
- Markup: [`index.html`](index.html). Elements with `data-i18n`, `data-contact` and `data-link` are filled from `src/content.js`, both at build time (`vite.config.js`) and when the language changes (`src/i18n.js`).
- Styles: [`src/styles.css`](src/styles.css), written phone first (base rules are the 375px layout).
- Motion (GSAP ScrollTrigger, Lenis): [`src/motion.js`](src/motion.js). Section colours that blend instead of cutting: [`src/tones.js`](src/tones.js).
- The 3D world (three.js, lazy-loaded) in [`src/world/`](src/world): one fixed WebGL scene behind the page with the rose-quartz stone (`quartz.js`), the satin ribbon (`ribbon.js`), pearl light (`pearls.js`), the scroll-graded backdrop (`atmosphere.js`) and every photo redrawn as liquid (`media.js`). `index.js` runs the scene and keeps the stone with the hero.
- First-visit portal, sound then language with a 5-second auto-pick: [`src/portal.js`](src/portal.js). Add `?intro` to any URL to see it again.
- Soundscape, composed live with Web Audio (no audio files): [`src/sound.js`](src/sound.js).
- Treatment carousel: [`src/carousel.js`](src/carousel.js). Review deck: [`src/deck.js`](src/deck.js).
- Studio map (MapLibre GL JS 6.12): a NASA Blue Marble globe in space (`src/starfield.js`) that flies down to the studio, then OpenFreeMap streets recoloured to the palette with 3D buildings: [`src/map.js`](src/map.js).

All motion, the 3D world and the map fly-in are skipped under `prefers-reduced-motion`; without WebGL the page shows its plain photos over the same blended colours.

## Deploying

Every push to `main` builds the site and publishes it to GitHub Pages through
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
