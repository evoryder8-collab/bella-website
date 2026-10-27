# Be Beauty website: design

Approved in chat on 2026-10-27.

## Client

Bella, a face massage therapist with her own studio in Stockholm. Business name: **Be Beauty**.
Treatments: sculpting / buccal (intraoral) face massage, lymphatic drainage, gua sha and tool-based work.

## Goal

Present the brand. There is no online booking or shop. Visitors get in touch by **WhatsApp** (primary), phone / SMS or email.

## Tech

Changed on 2026-10-27 at the user's request from plain HTML to a Vite project, as a foundation for richer motion and effects later.

- One scrolling page built with **Vite**. **GSAP** (with ScrollTrigger) and **Lenis** handle motion and smooth scrolling. **MapLibre GL** draws the studio map with free OpenFreeMap tiles (no API key). **three.js** is deferred until a specific effect calls for it.
- Built by GitHub Actions (`.github/workflows/deploy.yml`) and published to GitHub Pages at `https://evoryder8-collab.github.io/bella-website/`. Vite's `base: './'` keeps every asset path relative.
- `<meta name="robots" content="noindex">` stays until the user says the site is launching.
- Fonts from Google Fonts: Bodoni Moda (display) and Jost (body).

## Files

- `index.html`: markup for every section. Elements carry `data-i18n="key"` (text), `data-i18n-attr="attr:key"` (attributes), `data-contact="key"` (contact details) or `data-link="name"` (hrefs).
- `vite.config.js`: a small plugin fills those hooks with the Swedish copy at build time, so the page has real text before JavaScript runs.
- `src/content.js`: every piece of copy in Swedish (`sv`) and English (`en`), plus the contact details. This is the single place to swap placeholder copy for real copy.
- `src/i18n.js`: language switching at runtime. `src/links.js`: WhatsApp, phone, SMS, email and map links.
- `src/main.js`: mobile menu, header, floating WhatsApp button, anchor links. `src/motion.js`: GSAP and Lenis. `src/map.js`: MapLibre, loaded only near the contact section.
- `src/styles.css`: design tokens on `:root`, layout and components.
- `src/images/`: stock photos copied into the repo (no hotlinking).
- `CONTENT.md`: checklist of every placeholder to replace, plus photo credits.

## Visual style: "Quiet luxe"

| Token | Value | Use |
| --- | --- | --- |
| ivory | `#FAF8F4` | page background |
| stone | `#D9D2C5` | panels, image backgrounds |
| gold | `#A88B5A` | hairline rules, small accents, labels |
| ink | `#141414` | text, primary buttons |

- Editorial layout with generous whitespace, numbered section labels (`01 — Behandlingar`) and thin gold dividers.
- Headings in Bodoni Moda, with italic accents. Body text in Jost.
- Motion: masked headline reveal and image wipe in the hero, fade-up text and clip-path image reveals on scroll, slow image parallax, a scrolling marquee of treatments, and a camera fly-in on the map. All of it is off under `prefers-reduced-motion`.
- Light theme only: the brand palette is the design, so there is no dark variant.

## Sections

1. **Header**: "Be Beauty" wordmark, section links, SV / EN switch, WhatsApp button. On phones the links collapse into a menu.
2. **Hero**: large serif headline, one line on sculpting face massage in Stockholm, "Boka via WhatsApp" button, hero photo.
3. **Treatments and prices** (`#behandlingar`): an editorial list of five placeholder treatments with duration, price in kr and a one-line description:
   Sculpting facial, Buccal sculpting, Lymphatic drainage, Gua sha facial, Signature (a combination).
4. **About Bella** (`#om`): portrait, short bio (training, approach, studio).
5. **Gallery** (`#galleri`): asymmetric grid of six photos.
6. **Reviews** (`#omdomen`): three client quotes in large italic serif.
7. **Contact** (`#kontakt`): primary WhatsApp button with a prefilled message in the current language, then phone, SMS, email, studio address with a Google Maps link, opening hours, and a MapLibre map of the studio.
8. **Footer**: wordmark, small print, year. A floating WhatsApp button shows on phones.

## Language

- Swedish by default, English via the SV / EN switch.
- The choice is remembered in `localStorage` (wrapped in try/catch) and sets `<html lang>`. `?lang=en` in the URL opens the English version directly.
- The WhatsApp prefilled message follows the current language.

## Placeholder content

- No visible "placeholder" labels on the page, so it reads as a real site for client feedback.
- Contact details are safe fakes: a phone number from PTS's range reserved for fiction (`+46 70 174 06 05`), an email on the reserved `.example` domain and a fictional street.
- `CONTENT.md` lists every placeholder to replace.

## Images

Free-licence stock photos (Unsplash / Pexels), listed to the user with source and size for approval before download, then copied into `images/` and resized for the web. Credits go in `CONTENT.md`.

## Out of scope

Online booking, shop, CMS, analytics, contact form, separate URLs per language, dark mode, three.js (for now).

## Testing

Preview locally in the browser at desktop and phone widths, in both languages. Check every link (WhatsApp, tel, sms, mailto, map, anchors), the language switch, the mobile menu and that there is no horizontal scroll at phone width. Then push to `main` and check the live GitHub Pages URL.
