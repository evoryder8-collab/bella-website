# Be Beauty

Website for Be Beauty, Bella's face massage studio in Stockholm. Swedish and English.

Live preview: https://evoryder8-collab.github.io/bella-website/ (add `?lang=en` for English)

## Working on it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. `npm run build` writes the static site to `dist/`.

- Copy and contact details: [`src/content.js`](src/content.js). What is still placeholder: [`CONTENT.md`](CONTENT.md).
- Markup: [`index.html`](index.html). Elements with `data-i18n`, `data-contact` and `data-link` are filled from `src/content.js`, both at build time (`vite.config.js`) and when the language changes (`src/i18n.js`).
- Styles: [`src/styles.css`](src/styles.css). Motion (GSAP, Lenis): [`src/motion.js`](src/motion.js). Studio map (MapLibre, OpenFreeMap tiles): [`src/map.js`](src/map.js).

## Deploying

Every push to `main` builds the site and publishes it to GitHub Pages through
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
