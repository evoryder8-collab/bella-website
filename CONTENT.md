# BE BEAUTY: content checklist

Copy now comes from Bella's own site (bebeautyfacesculptor.com) and her Bokadirekt page, as read on
2026-10-27. Everything both sites said is recorded in [`docs/current-site-audit.md`](docs/current-site-audit.md).
All copy and contact details live in [`src/content.js`](src/content.js), in Swedish (`sv`) and English (`en`).

## For Bella to confirm

- [ ] Opening hours: Mon–Fri 09–19, Sat–Sun 10–19. These are the Västmannagatan hours on Bokadirekt; check that Jaktgatan keeps the same hours.
- [ ] Swedish copy. Her own site is in English, so the Swedish text is our translation. The Bokadirekt descriptions were the source for the treatments.
- [ ] Reviews. The six quotes are from her site and are shown in English in both languages, as published there.
- [ ] Academy: no new dates are listed yet ("Nya kursdatum släpps snart"). Interest goes to her email with a prefilled subject.
- [ ] Facebook links to the share link the user sent (`facebookUrl` in `src/content.js`, `https://www.facebook.com/share/192DeLQmXT/`); swap in her page's own address if she prefers.
- [ ] Whether to show a WhatsApp or phone number. None is published, so booking goes to Bokadirekt and contact goes to email and Instagram.
- [ ] The first-visit ritual copy (`portal` in `src/content.js`): "Ljud på?" with "BE BEAUTY är skapat för att upplevas med ljud. Mjukt, stilla och nära.", "Ja, med ljud" / "Rekommenderas" / "Nej tack", "Välj språk" with "Fortsätter på svenska", then "Ett naturligt ansiktslyft, för hand." while the stone loads. The stone is engraved "BE BEAUTY · Face sculpting · Stockholm". The music is her signature song "Late Night Polish" (`src/music`), at 40% volume on computers and 20% on phones.

- [ ] Bella's spoken greeting after the ritual, in her cloned voice (`src/voice`, AAC with an MP3 fallback, in the visitor's language). English: "Hi… I'm Bella. I'm so glad you're here. Welcome to BE BEAUTY… where your face is lifted naturally, by hand. Come in." Swedish (the second of the two takes supplied): "Hej, jag heter Bella. Vad fint att du är här. Välkommen till BE BEAUTY, där ditt ansikte lyfts naturligt, med handen. Kom in."
- [ ] The award film after the three pillars (`src/media`, from the user's "Bella Award Moment Salon - Vertical.mp4", cover at 0:30): "Utmärkelsen · 2026", "Stockholm Beauty Week.", "Scrolla för att se", "Prisutdelningen · 0:38" and "Scrolla vidare" (`awardFilm` in `src/content.js`).
- [ ] The "Bella Bayar presenterar" title card after the portal (`premiere` in `src/content.js`), with the Stockholm Beauty Week 2026 award ("Bästa skönhetssalong"). The jury's motivation is translated into Swedish from her English Instagram post of 19 October 2026.
- [ ] The link in bio (`linkinbio/`, `pages.links` in `src/content.js`) is written in her own voice ("Mejla mig", "Jag ser fram emot att välkomna dig"), and its honours read "Silver · Europamästerskapen 2025", "Jury · Tokyo, Paris, Phuket", "4,9 ★ · 478 betyg" and "Skapare av Femina Bella Est®". Its save-contact card holds her email, both studios, Instagram and the Bokadirekt link.
- [ ] The headings and short texts written for the new pages (`pages` in `src/content.js`), such as "Från Mongoliet till Stockholm" and the group introductions on the treatments page.
- [ ] The inside pages of the animated Hudterapeuten magazine are invented editorial layouts built from her own photos, with no readable article text (`src/magazine/pages.js`). If she has real pages from the issue and the right to show them, they can replace these.

## Contact (`contact` and `studios` in `src/content.js`)

- Booking: [Bokadirekt](https://www.bokadirekt.se/places/be-beauty-face-sculpting-sthlm-130492)
- Email: `bebeautyfacesculpting@gmail.com`
- Instagram: `@bebeauty_facesculpt`
- Vasastan: Västmannagatan 12, 111 24 Stockholm
- Norra Djurgården: Jaktgatan 29, 115 47 Stockholm

## Treatments and prices

Regular Bokadirekt prices; campaign prices that ended 31 October 2026 are left out. Durations and prices
are in the `treatments` list at the top of `src/content.js`; names and descriptions are under
`treatments.items` in each language. To add or remove a treatment, change that list, both languages and
the matching `<li class="t-card">` in `index.html`.

| # | Treatment | Group | Duration | Price |
|---|---|---|---|---|
| 1 | Femina Bella Est® Gua Sha facelift | Face | 60 min | 1 495 kr |
| 2 | Sculpt & Buccal Facial | Face | 75 min | 2 395 kr |
| 3 | Buccal massage & jaw treatment | Face | 60 min | 1 895 kr |
| 4 | Jaw Release + Femina Bella Est | Face | 75 min | 1 895 kr |
| 5 | Sculpt Facial with Bella (consultation) | Face | 45 min | 1 895 kr |
| 6 | Buccal Release & Sculpt Facial | Signature TCM | 90 min | 3 495 kr |
| 7 | Symmetry Sculpt Facial™ | Signature TCM | 90 min | 3 495 kr |
| 8 | Bojin Acupressure Lift™ | Signature TCM | 60 min | 2 395 kr |
| 9 | Glow & Lymphatic Sculpt Facial | Signature TCM | 75 min | 2 895 kr |
| 10 | Heart Space Gua Sha Release | Body | 75 min | 1 895 kr |
| 11 | Abdominal Sculpt™ | Body | 75 min | 1 895 kr |
| 12 | Gua Sha body & face | Body | 120 min | 2 395 kr |

Left out (all on Bokadirekt): lash and brow lifts, Gua Sha body 75 min, Gua Sha body & abdomen,
Yngre Imorgon™ and the other packages.

## Photos

All photos are Bella's own, downloaded from her site with the user's approval and resized for the web.
`treatment-hands.jpg` is cropped to remove a photographer watermark (iConstantine Photography). If the
originals are available without watermarks or in higher resolution, swap them in with the same file names.

| File | Use |
|---|---|
| `src/images/hero-bella-cutout.webp` | Home hero: Bella retouched, upscaled and cut out by the user (1600 × 2158, 148 KB, exported with Finalova's WebP encoder) |
| `src/images/hero-bella.jpg` | The original portrait, still used by the link in bio and the magazine's pages |
| `src/images/treatment-tokyo.jpg` | Approach: Balance (Bella demonstrating a face treatment at a championship workshop; framed to leave out a small gold photographer's logo in the corner, so Bella should confirm the credit) |
| `src/images/studio.jpg` | About and Contact pages, link in bio |
| `src/images/guasha.jpg` | Approach: Beauty |
| `src/images/glow-bella.jpg` | Approach: Glow (a close-up from the user's retouched portrait, on dusty rose with a soft bloom) |
| `src/images/treatment-light.jpg` | Link in bio and the magazine's pages |
| `src/images/treatment-hands.jpg` | Femina Bella Est |
| `src/images/paris-championship.jpg` | Proof: European Massage Championship |
| `src/images/hudterapeuten.jpg` | Proof: Hudterapeuten cover |
| `src/images/bella-studio.jpg` | About Bella |
| `src/images/jury-asia.jpg` | About: jury, Asia Massage Championship 2026 |
| `src/images/academy.jpg` | Academy card |

## Before launch

- [ ] Remove `<meta name="robots" content="noindex">` from `index.html`
- [ ] Decide on a domain (her current site is bebeautyfacesculptor.com)
