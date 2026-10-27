# Be Beauty: content checklist

Everything below is a placeholder until Bella confirms or replaces it. All copy and
contact details live in [`src/content.js`](src/content.js), in Swedish (`sv`) and English (`en`).

## Contact details (`contact` in `src/content.js`)

- [ ] WhatsApp number: `46701740605` (a number from PTS's range reserved for fiction, so it never reaches anyone)
- [ ] Phone, shown and dialled: `+46 70 174 06 05`
- [ ] Email: `hej@bebeauty.example` (`.example` is a reserved domain)
- [ ] Studio address: `Exempelgatan 12, 114 35 Stockholm`
- [ ] Map pin coordinates: `[18.0786, 59.3368]` (Östermalm, placeholder)
- [ ] Opening hours: Tue–Fri 10–19, Sat 10–15, Sun–Mon closed (`contact.hours` in both languages)
- [ ] Pre-written WhatsApp message (`ui.whatsappMessage`)

## Treatments and prices

Durations and prices are in the `treatments` list at the top of `src/content.js`; names
and descriptions are under `treatments.items` in each language.

| # | Treatment | Duration | Price |
|---|---|---|---|
| 1 | Sculpting face massage | 60 min | 1 195 kr |
| 2 | Buccal sculpting | 75 min | 1 495 kr |
| 3 | Lymphatic drainage | 60 min | 995 kr |
| 4 | Gua sha treatment | 45 min | 850 kr |
| 5 | Be Beauty Signature | 90 min | 1 795 kr |

To add or remove a treatment, change both the list in `src/content.js` and the matching
`<li class="treatment">` rows in `index.html`.

## About Bella

- [ ] Bio (`about.lead`, `about.body1`, `about.body2`)
- [ ] Stats: 8+ years, 2 000+ treatments, 1 client at a time (`about.stat*`)
- [ ] Portrait: `src/images/about.jpg` is a stock stand-in, not Bella

## Reviews

- [ ] Three quotes and names (`reviews.items`). These are invented; replace them with real ones, used with the clients' permission.

## Photos

All photos are stand-ins from [Unsplash](https://unsplash.com), free to use under the
[Unsplash License](https://unsplash.com/license). Replace them with Bella's own photos when she has them,
keeping the same file names, or update the `src` in `index.html`.

| File | Use | Photographer | Unsplash photo |
|---|---|---|---|
| `src/images/hero.jpg` | Hero | Dominique Rivu | [rWwuf8yKw4Y](https://unsplash.com/photos/rWwuf8yKw4Y) |
| `src/images/about.jpg` | About Bella | manitosilk | [DSKNz2MZWW4](https://unsplash.com/photos/DSKNz2MZWW4) |
| `src/images/gallery-1.jpg` | Gallery | Anna Keibalo | [BJ7i-96glwM](https://unsplash.com/photos/BJ7i-96glwM) |
| `src/images/gallery-2.jpg` | Gallery | Ionela Mat | [16mHHrY3PUk](https://unsplash.com/photos/16mHHrY3PUk) |
| `src/images/gallery-3.jpg` | Gallery | Angélica Echeverry | [5KY5LP_zc44](https://unsplash.com/photos/5KY5LP_zc44) |
| `src/images/gallery-4.jpg` | Gallery | Mayur Roxan | [JnsuyfJrxQw](https://unsplash.com/photos/JnsuyfJrxQw) |
| `src/images/gallery-5.jpg` | Gallery | Kadarius Seegars | [Mxy5gokl8mE](https://unsplash.com/photos/Mxy5gokl8mE) |
| `src/images/gallery-6.jpg` | Gallery | Sunny Ng | [KVIlNRoGwxk](https://unsplash.com/photos/KVIlNRoGwxk) |

## Before launch

- [ ] Remove `<meta name="robots" content="noindex">` from `index.html`
- [ ] Decide on a domain
