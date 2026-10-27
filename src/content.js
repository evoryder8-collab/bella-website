// All site copy and contact details live here. See CONTENT.md for what is
// still placeholder. Copy values may contain simple inline HTML (<em>, <br>).

export const DEFAULT_LANG = 'sv';
export const LANGS = ['sv', 'en'];

export const contact = {
  // Placeholder number from PTS's range reserved for fiction (never assigned).
  whatsapp: '46701740605',
  phoneDisplay: '+46 70 174 06 05',
  phoneHref: '+46701740605',
  // Placeholder: .example is a reserved domain, so mail never reaches anyone.
  email: 'hej@bebeauty.example',
  street: 'Exempelgatan 12',
  postcode: '114 35',
  city: 'Stockholm',
  // [longitude, latitude] for the map pin (placeholder: Östermalm).
  coords: [18.0786, 59.3368],
};

const priceSv = (kr) => `${new Intl.NumberFormat('sv-SE').format(kr)} kr`;
const priceEn = (kr) => `SEK ${new Intl.NumberFormat('en-GB').format(kr)}`;

const treatments = [
  { minutes: 60, price: 1195 },
  { minutes: 75, price: 1495 },
  { minutes: 60, price: 995 },
  { minutes: 45, price: 850 },
  { minutes: 90, price: 1795 },
];

const address = `${contact.street}<br>${contact.postcode} ${contact.city}`;

export const copy = {
  sv: {
    meta: {
      title: 'Be Beauty · Skulpterande ansiktsmassage i Stockholm',
      description:
        'Be Beauty är Bellas studio för skulpterande och buckal ansiktsmassage, lymfdränage och gua sha i Stockholm. Boka via WhatsApp.',
    },
    ui: {
      skip: 'Hoppa till innehållet',
      menu: 'Meny',
      close: 'Stäng meny',
      langLabel: 'Språk',
      book: 'Boka',
      whatsappFab: 'Boka via WhatsApp',
      whatsappMessage: 'Hej Bella! Jag vill gärna boka en behandling hos Be Beauty.',
    },
    nav: {
      treatments: 'Behandlingar',
      about: 'Om Bella',
      gallery: 'Galleri',
      reviews: 'Omdömen',
      contact: 'Kontakt',
    },
    hero: {
      eyebrow: 'Ansiktsmassage · Stockholm',
      line1: 'Skulpterat',
      line2: 'för <em>hand</em>',
      lead: 'Ansiktsmassage som lyfter, dränerar och återställer. En behandling i taget, i en lugn studio mitt i Stockholm.',
      cta: 'Boka via WhatsApp',
      secondary: 'Se behandlingar',
      scroll: 'Scrolla',
      imageAlt: 'Närbild av ett ansikte i mjukt ljus under en ansiktsbehandling',
    },
    marquee: ['Skulptering', 'Buckal massage', 'Lymfdränage', 'Gua sha', 'Lyft och lyster'],
    treatments: {
      label: '01 — Behandlingar',
      title: 'Behandlingar <em>och priser</em>',
      intro:
        'Varje behandling anpassas efter din hud och ditt ansikte. Alla behandlingar börjar med en kort konsultation och avslutas med råd du kan ta med dig hem.',
      note: 'Osäker på vad som passar dig? Skriv till mig på WhatsApp, så hjälper jag dig att välja.',
      items: [
        {
          name: 'Skulpterande ansiktsmassage',
          description: 'Djup, formande massage som definierar käklinje och kindben och ger ett lyft som syns direkt.',
        },
        {
          name: 'Buckal skulptering',
          description: 'Massage både utvändigt och inifrån munnen, för att nå de djupa musklerna kring käke och kinder.',
        },
        {
          name: 'Lymfdränage',
          description: 'Lätta, rytmiska grepp som minskar svullnad och ger huden ny lyster.',
        },
        {
          name: 'Gua sha-behandling',
          description: 'Gua sha-sten och verktyg som löser upp spänningar och sätter fart på cirkulationen.',
        },
        {
          name: 'Be Beauty Signature',
          description: 'Det bästa av allt: skulptering, buckalt arbete, lymfdränage och gua sha i en och samma behandling.',
        },
      ].map((item, i) => ({ ...item, duration: `${treatments[i].minutes} min`, price: priceSv(treatments[i].price) })),
    },
    about: {
      label: '02 — Om Bella',
      title: 'Händer <em>som lyssnar</em>',
      lead: 'Jag tror att ett ansikte mår bäst av tid, tålamod och händer som lyssnar.',
      body1:
        'Jag heter Bella och har specialiserat mig på skulpterande och buckal ansiktsmassage, lymfdränage och gua sha. Varje behandling bygger på anatomi och teknik, men lika mycket på lugn.',
      body2:
        'I min studio i Stockholm tar jag emot en klient i taget. Inga stressiga flöden, bara tid för dig. Målet är enkelt: att du går härifrån lättare än du kom.',
      signature: '— Bella',
      stat1Value: '8+',
      stat1Label: 'år av erfarenhet',
      stat2Value: '2 000+',
      stat2Label: 'behandlingar',
      stat3Value: '1',
      stat3Label: 'klient i taget',
      imageAlt: 'Bella i sin studio',
    },
    gallery: {
      label: '03 — Galleri',
      title: 'Från <em>studion</em>',
      quote: 'Lyft, lyster <em>och lugn.</em>',
      caption: 'Varje behandling är ett eget litet rum av tystnad, där ansiktet får vila och formas.',
      alt1: 'Händer som masserar ett ansikte under en behandling',
      alt2: 'Ansiktsmassage med gua sha-sten',
      alt3: 'Hand som vilar mot halsen och käklinjen',
      alt4: 'Behandlingsrum med bädd i varmt dagsljus',
      alt5: 'Flaska med ansiktsolja i bärnstensfärgat glas',
      alt6: 'Närbild av ett avslappnat ansikte med slutna ögon',
    },
    reviews: {
      label: '04 — Omdömen',
      title: 'Vad mina <em>klienter säger</em>',
      items: [
        { quote: 'Jag har aldrig sett min käklinje så tydlig. Bella har magiska händer.', name: 'Sara L.' },
        { quote: 'Lugnet i studion och omsorgen i varje detalj. Det här är min nya ritual.', name: 'Emma K.' },
        { quote: 'Svullnaden efter långa flygresor försvann efter en enda lymfbehandling.', name: 'Jonna P.' },
      ],
    },
    contact: {
      label: '05 — Kontakt',
      title: 'Boka <em>din tid</em>',
      lead: 'Det enklaste sättet att boka är via WhatsApp. Berätta vilken behandling du är intresserad av, så återkommer jag samma dag.',
      whatsapp: 'Skriv på WhatsApp',
      phoneLabel: 'Telefon',
      call: 'Ring',
      sms: 'Skicka sms',
      emailLabel: 'E-post',
      studioLabel: 'Studio',
      address,
      mapLink: 'Öppna i kartor',
      hoursLabel: 'Öppettider',
      hours: 'Tis–fre 10–19<br>Lör 10–15<br>Sön–mån stängt',
      mapAlt: 'Karta som visar var Be Beauty-studion ligger i Stockholm',
    },
    footer: {
      tagline: 'Skulpterande ansiktsmassage i Stockholm',
      top: 'Till toppen',
      rights: 'Alla rättigheter förbehållna.',
    },
  },

  en: {
    meta: {
      title: 'Be Beauty · Sculpting face massage in Stockholm',
      description:
        "Be Beauty is Bella's studio for sculpting and buccal face massage, lymphatic drainage and gua sha in Stockholm. Book on WhatsApp.",
    },
    ui: {
      skip: 'Skip to content',
      menu: 'Menu',
      close: 'Close menu',
      langLabel: 'Language',
      book: 'Book',
      whatsappFab: 'Book on WhatsApp',
      whatsappMessage: "Hi Bella! I'd like to book a treatment at Be Beauty.",
    },
    nav: {
      treatments: 'Treatments',
      about: 'About Bella',
      gallery: 'Gallery',
      reviews: 'Reviews',
      contact: 'Contact',
    },
    hero: {
      eyebrow: 'Face massage · Stockholm',
      line1: 'Sculpted',
      line2: 'by <em>hand</em>',
      lead: 'Face massage that lifts, drains and restores. One client at a time, in a quiet studio in the heart of Stockholm.',
      cta: 'Book on WhatsApp',
      secondary: 'View treatments',
      scroll: 'Scroll',
      imageAlt: 'Close-up of a face in soft light during a facial treatment',
    },
    marquee: ['Sculpting', 'Buccal massage', 'Lymphatic drainage', 'Gua sha', 'Lift and glow'],
    treatments: {
      label: '01 — Treatments',
      title: 'Treatments <em>and prices</em>',
      intro:
        'Every treatment is tailored to your skin and face. Each one starts with a short consultation and ends with advice you can take home.',
      note: "Not sure what suits you? Message me on WhatsApp and I'll help you choose.",
      items: [
        {
          name: 'Sculpting face massage',
          description: 'Deep, contouring massage that defines the jawline and cheekbones for a lift you can see straight away.',
        },
        {
          name: 'Buccal sculpting',
          description: 'Massage outside and inside the mouth to reach the deep muscles around the jaw and cheeks.',
        },
        {
          name: 'Lymphatic drainage',
          description: "Light, rhythmic strokes that reduce puffiness and bring back the skin's glow.",
        },
        {
          name: 'Gua sha treatment',
          description: 'Gua sha stones and tools that release tension and boost circulation.',
        },
        {
          name: 'Be Beauty Signature',
          description: 'The best of everything: sculpting, buccal work, lymphatic drainage and gua sha in one treatment.',
        },
      ].map((item, i) => ({ ...item, duration: `${treatments[i].minutes} min`, price: priceEn(treatments[i].price) })),
    },
    about: {
      label: '02 — About Bella',
      title: 'Hands <em>that listen</em>',
      lead: 'I believe a face does best with time, patience and hands that listen.',
      body1:
        "I'm Bella, and I specialise in sculpting and buccal face massage, lymphatic drainage and gua sha. Every treatment is grounded in anatomy and technique, and just as much in calm.",
      body2:
        "In my Stockholm studio I see one client at a time. No rushing, just time for you. The goal is simple: you leave feeling lighter than when you arrived.",
      signature: '— Bella',
      stat1Value: '8+',
      stat1Label: 'years of experience',
      stat2Value: '2,000+',
      stat2Label: 'treatments',
      stat3Value: '1',
      stat3Label: 'client at a time',
      imageAlt: 'Bella in her studio',
    },
    gallery: {
      label: '03 — Gallery',
      title: 'From <em>the studio</em>',
      quote: 'Lift, glow <em>and calm.</em>',
      caption: 'Every treatment is a small room of quiet, where the face can rest and be reshaped.',
      alt1: 'Hands massaging a face during a treatment',
      alt2: 'Face massage with a gua sha stone',
      alt3: 'A hand resting against the neck and jawline',
      alt4: 'Treatment room with a massage bed in warm daylight',
      alt5: 'A bottle of face oil in amber glass',
      alt6: 'Close-up of a relaxed face with closed eyes',
    },
    reviews: {
      label: '04 — Reviews',
      title: 'What <em>clients say</em>',
      items: [
        { quote: "I've never seen my jawline so defined. Bella has magic hands.", name: 'Sara L.' },
        { quote: 'The calm in the studio and the care in every detail. This is my new ritual.', name: 'Emma K.' },
        { quote: 'The puffiness from long flights was gone after a single drainage session.', name: 'Jonna P.' },
      ],
    },
    contact: {
      label: '05 — Contact',
      title: 'Book <em>your time</em>',
      lead: "The easiest way to book is on WhatsApp. Tell me which treatment you're interested in and I'll reply the same day.",
      whatsapp: 'Message on WhatsApp',
      phoneLabel: 'Phone',
      call: 'Call',
      sms: 'Send a text',
      emailLabel: 'Email',
      studioLabel: 'Studio',
      address,
      mapLink: 'Open in maps',
      hoursLabel: 'Opening hours',
      hours: 'Tue–Fri 10–19<br>Sat 10–15<br>Sun–Mon closed',
      mapAlt: 'Map showing where the Be Beauty studio is in Stockholm',
    },
    footer: {
      tagline: 'Sculpting face massage in Stockholm',
      top: 'Back to top',
      rights: 'All rights reserved.',
    },
  },
};
