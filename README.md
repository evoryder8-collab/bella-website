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
- Motion (GSAP ScrollTrigger, Lenis): [`src/motion.js`](src/motion.js).
- Hero "sculpt the portrait" shader (three.js, lazy-loaded): [`src/hero-sculpt.js`](src/hero-sculpt.js).
- Treatment carousel: [`src/carousel.js`](src/carousel.js). Review deck: [`src/deck.js`](src/deck.js).
- Studio map (MapLibre, OpenFreeMap tiles recoloured to the palette): [`src/map.js`](src/map.js).

All motion, the shader and the map fly-in are skipped under `prefers-reduced-motion`.

## Deploying

Every push to `main` builds the site and publishes it to GitHub Pages through
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
