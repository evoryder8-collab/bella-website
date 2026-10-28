// All site copy and contact details live here. The facts come from Bella's own
// site and her Bokadirekt page (see docs/current-site-audit.md); CONTENT.md lists
// what still needs her confirmation. Copy values may contain simple inline HTML.

export const DEFAULT_LANG = 'sv';
export const LANGS = ['sv', 'en'];

export const contact = {
  bokadirekt: 'https://www.bokadirekt.se/places/be-beauty-face-sculpting-sthlm-130492',
  email: 'bebeautyfacesculpting@gmail.com',
  instagram: '@bebeauty_facesculpt',
  instagramUrl: 'https://www.instagram.com/bebeauty_facesculpt/',
  facebook: 'Facebook',
  facebookUrl: 'https://www.facebook.com/share/192DeLQmXT/',
};

// [longitude, latitude] for each studio, in the same order as copy.*.studios.items.
export const studios = [
  { id: 'vasastan', street: 'Västmannagatan 12', postcode: '111 24', coords: [18.052448, 59.337058] },
  { id: 'djurgarden', street: 'Jaktgatan 29', postcode: '115 47', coords: [18.088184, 59.358079] },
];

// Regular Bokadirekt prices (campaign prices left out). group: 0 face, 1 signature TCM, 2 body.
const treatments = [
  { group: 0, minutes: 60, price: 1495 },
  { group: 0, minutes: 75, price: 2395 },
  { group: 0, minutes: 60, price: 1895 },
  { group: 0, minutes: 75, price: 1895 },
  { group: 0, minutes: 45, price: 1895 },
  { group: 1, minutes: 90, price: 3495 },
  { group: 1, minutes: 90, price: 3495 },
  { group: 1, minutes: 60, price: 2395 },
  { group: 1, minutes: 75, price: 2895 },
  { group: 2, minutes: 75, price: 1895 },
  { group: 2, minutes: 75, price: 1895 },
  { group: 2, minutes: 120, price: 2395 },
];

export const treatmentGroups = treatments.map((t) => t.group);

const priceSv = (kr) => `${new Intl.NumberFormat('sv-SE').format(kr)} kr`;
const priceEn = (kr) => `SEK ${new Intl.NumberFormat('en-GB').format(kr)}`;

const withMeta = (items, price) =>
  items.map((item, i) => ({
    ...item,
    duration: `${treatments[i].minutes} min`,
    price: price(treatments[i].price),
  }));

const address = (i) => `${studios[i].street}<br>${studios[i].postcode} Stockholm`;

// Quoted as published on bebeautyfacesculptor.com, in both languages.
const reviews = [
  {
    quote:
      'Revolutionary! Absolutely wonderful. It felt amazing, that perfect mix of soothing and deep release! I saw visible results after just one session and I could feel the difference. I’m definitely coming back!',
    name: 'Malin G',
  },
  {
    quote:
      'Bella was magical! She explained everything and performed the treatment perfectly. I saw instant results and will definitely be coming back!',
    name: 'Stephanie I',
  },
  {
    quote:
      'I’ve tried many different ones before, but this team is on another level, they’re the best! Don’t think twice, just book it!',
    name: 'Jennie S',
  },
  {
    quote:
      'Truly the best massage I’ve ever experienced! My under-eye bags vanished as a bonus, and Bella is simply an amazing person: warm, skilled and full of positive energy.',
    name: 'Angelica L',
  },
  {
    quote: 'An incredibly relaxing and unique experience. So soothing, in a beautiful and calming environment.',
    name: 'Martina L',
  },
  {
    quote:
      'An absolutely wonderful experience! It’s been a long time since I felt this relaxed, and the result… wow! I’m already looking forward to my next treatment!',
    name: 'Linn G',
  },
];

export const copy = {
  sv: {
    meta: {
      title: 'BE BEAUTY · Face Sculpting i Stockholm med Bella Bayar',
      description:
        'BE BEAUTY är Bella Bayars Face Sculpting-studio i Stockholm: Femina Bella Est®, buckal massage, Gua Sha och lymfdränage. 4,9 av 5 på Bokadirekt. Studior i Vasastan och Norra Djurgården.',
    },
    ui: {
      skip: 'Hoppa till innehållet',
      menu: 'Meny',
      close: 'Stäng meny',
      langLabel: 'Språk',
      book: 'Boka tid',
      bookFull: 'Boka på Bokadirekt',
      barRating: '<strong>4,9</strong> av 5 · 478 betyg',
      allTreatments: 'Alla behandlingar och paket på Bokadirekt',
      prev: 'Föregående',
      next: 'Nästa',
      sound: 'Ljud',
      socials: 'Följ BE BEAUTY',
      instagram: 'BE BEAUTY på Instagram',
      facebook: 'BE BEAUTY på Facebook',
      // The card a social gem shows before leaving the site.
      leave: {
        instagram: 'Du är på väg till BE BEAUTY på Instagram. Den öppnas i en ny flik.',
        facebook: 'Du är på väg till BE BEAUTY på Facebook. Den öppnas i en ny flik.',
        go: 'Fortsätt',
        cancel: 'Avbryt',
      },
    },
    // The first-visit portal (src/portal.js), shown in the device's language.
    // Stockholm Beauty Week, October 2026; the jury's words are translated from English.
    premiere: {
      presents: 'presenterar',
      awardKicker: 'Stockholm Beauty Week',
      award: 'Bästa skönhetssalong',
      awardQuote: '”En sinnlig upplevelse bortom det vanliga, där öst möter väst. Inga nålar behövs.”',
    },
    portal: {
      soundTitle: 'Ljud på?',
      soundLead: 'BE BEAUTY är skapat för att upplevas med ljud. Mjukt, stilla och nära.',
      yes: 'Ja, med ljud',
      recommended: 'Rekommenderas',
      no: 'Nej tack, utan ljud',
      langTitle: 'Välj språk',
      langLead: 'Känn dig som hemma.',
      detected: 'Vi hittade svenska',
      auto: 'Fortsätter om {n}',
      paused: 'Pausat',
      pause: 'Pausa nedräkningen',
      resume: 'Fortsätt nedräkningen',
    },
    nav: {
      method: 'Metoden',
      treatments: 'Behandlingar',
      about: 'Om Bella',
      reviews: 'Omdömen',
      studios: 'Studior',
      home: 'Hem',
      academy: 'Akademi',
      contact: 'Kontakt',
    },
    hero: {
      eyebrow: 'Face Sculpting · Stockholm',
      lead: 'Naturligt ansiktslyft med Gua Sha, buckal massage och lymfdränage. Utan nålar, utan kirurgi.',
      founder: 'Grundat av Bella Bayar',
      cta: 'Boka tid',
      secondary: 'Se behandlingar',
      imageAlt: 'Bella Bayar, grundare av BE BEAUTY, i krämvit kavaj och spetsblus',
    },
    approach: {
      label: 'Vårt förhållningssätt',
      items: [
        {
          word: 'Beauty',
          text: 'Behandlingar som framhäver dina naturliga drag och respekterar din huds unika karaktär.',
          imageAlt: 'Bella visar en skulpterande ansiktsbehandling inför publik',
        },
        {
          word: 'Balance',
          text: 'Med Gua Sha, buckal massage och lymfdränage återställer vi harmonin i ansikte och kropp.',
          imageAlt: 'En Gua Sha-sten formar kindbenet under en behandling',
        },
        {
          word: 'Glow',
          text: 'Långvarig lyster och vitalitet. Resultat som syns och känns, inifrån och ut.',
          imageAlt: 'Närbild av Bella Bayar med lysande, strålande hy',
        },
      ],
    },
    method: {
      label: 'Bellas signaturmetod',
      title: 'Femina\u00a0<em>Bella\u00a0Est</em><sup>®</sup>',
      lead: 'En strukturerad och medveten ansiktsmassage som förenar skulpterande rörelser, meridianstimulering och lymfaktivering.',
      body: 'Rytmisk manuell massage, lymfdränage, akupressur, Gua Sha och vakuum arbetar tillsammans längs ansiktets meridianer. Ansiktets arkitektur lyfts, spänningar släpper och den inre balansen återställs: en naturlig facelift-effekt med mer spänst och klarare hy.',
      techniques: ['Gua Sha', 'Akupressur', 'Lymfdränage', 'Vakuum', 'Meridianer', 'Skulptering'],
      stage: 'I juni 2026 lärde Bella ut metoden som workshop på Asia Massage Championship i Tokyo.',
      cta: 'Boka Femina\u00a0Bella\u00a0Est · 1 495 kr',
      imageAlt: 'Bella arbetar med händerna längs en klients panna',
    },
    treatments: {
      label: 'Behandlingar',
      title: 'Välj din <em>behandling</em>',
      intro: 'Alla behandlingar är skapade av Bella och utförs av henne eller hennes certifierade team.',
      groups: ['Ansikte', 'Signatur TCM', 'Kropp'],
      pick: 'Välj en för att byta skulptur',
      swipe: 'Svep för fler',
      items: withMeta(
        [
          {
            name: 'Femina\u00a0Bella\u00a0Est<sup>®</sup> Gua Sha facelift',
            tag: 'Mest populär',
            description: 'Bellas egen metod: Gua Sha, akupressur, lymfdränage och vakuum för en naturlig facelift-effekt.',
          },
          {
            name: 'Sculpt & Buccal Facial',
            tag: 'Kundens favorit',
            description: 'Djuprengöring, skulpterande massage och buckal teknik inifrån munhålan, plus hårbotten, nacke och dekolletage.',
          },
          {
            name: 'Buckal massage & käkledsbehandling',
            tag: '',
            description: 'Mjukar upp spända käkmuskler inifrån och utifrån. För dig som pressar tänderna eller bär stress i käken.',
          },
          {
            name: 'Jaw Release + Femina\u00a0Bella\u00a0Est',
            tag: '',
            description: 'Släpper djupa spänningar i käke, ansikte och nacke och avslutas med Bellas signaturlyft.',
          },
          {
            name: 'Sculpt Facial med Bella',
            tag: 'Konsultation',
            description: 'En personlig Gua Sha-behandling där Bella läser av ansiktets struktur, spänningar och cirkulation.',
          },
          {
            name: 'Buccal Release & Sculpt Facial',
            tag: '',
            description: 'Avancerad Face Sculpting med intraoral buckal massage, fascia release, Gua Sha och lymfdränage.',
          },
          {
            name: 'Symmetry Sculpt Facial<sup>™</sup>',
            tag: '',
            description: 'Balanserar ansiktets muskulatur, fascia och konturer för en jämnare struktur och ett harmoniskt uttryck.',
          },
          {
            name: 'Bojin Acupressure Lift<sup>™</sup>',
            tag: '',
            description: 'Bojin-teknik med akupressur och meridianarbete som minskar puffighet och definierar käklinje och kindben.',
          },
          {
            name: 'Glow & Lymphatic Sculpt Facial',
            tag: '',
            description: 'Exfoliering, Gua Sha, lymfdränage och lystergivande hudvård för mindre svullnad och mer glöd.',
          },
          {
            name: 'Heart Space Gua Sha Release',
            tag: '',
            description: 'För dekolletage, bröstkorg, hals och axlar. Friare andning och bättre förutsättningar för ett ansiktslyft.',
          },
          {
            name: 'Abdominal Sculpt<sup>™</sup>',
            tag: '',
            description: 'Lymfdränage, Gua Sha och fascia release för magen. En lättare känsla och en mer definierad midja.',
          },
          {
            name: 'Gua Sha kropp & ansikte',
            tag: '2 timmar',
            description: 'Lymfatisk Gua Sha och koppning för kroppen, följt av en Gua Sha-facelift för ansiktet.',
          },
        ],
        priceSv,
      ),
    },
    proof: {
      label: 'I siffror',
      rating: '4,9',
      ratingLabel: 'av 5 i snittbetyg från <strong>478 betyg</strong> på Bokadirekt',
      stats: [
        { value: '10+', label: 'års erfarenhet' },
        { value: '3', label: 'salonger byggda' },
        { value: '3', label: 'juryuppdrag 2026' },
        { value: 'Silver', label: 'Europamästerskapen 2025' },
      ],
      press: 'På omslaget till tidningen <em>Hudterapeuten</em>',
      pressAlt: 'Omslaget till Hudterapeuten med Bella Bayar under en tävling',
      parisAlt: 'Bella med diplom och medalj på European Massage Championship i Paris',
    },
    about: {
      label: 'Om Bella',
      title: 'Bella <em>Bayar</em>',
      roles: 'Grundare · Face Sculptor · Utbildare · Hud- och spaterapeut',
      lead: 'Ursprungligen från Mongoliet, i dag i Stockholm. Internationellt erkänd ansiktsmassageterapeut, expert på buckal massage och grundare av BE BEAUTY Salon & Academy.',
      body1:
        'Resan började den dag Bella upptäckte Gua Sha och dess kraft för både inre och yttre hälsa. Då visste hon att det var hennes kall. Över tio år senare har hon byggt tre salonger och ett team av likasinnade terapeuter, tävlat i Europa- och världsmästerskap och utbildar i dag andra i holistisk ansiktsvård.',
      body2:
        'Hennes metod förenar österländsk energilära och meridianbalans med västerländsk kunskap om anatomi och hud. Huvud och ansikte är centrum för tankar, känslor och sinnen. Därför lyfter varje behandling inte bara ansiktet, utan också sinnet.',
      quote:
        'För mig handlar skönhet om mer än det vi ser. Det handlar om hur vi känner oss. Varje behandling är en chans att återställa balansen och återknyta till oss själva.',
      quoteBy: 'Bella Bayar',
      educationTitle: 'Utbildning',
      education: [
        'Hud- och spaterapeut, International Beauty School, Sverige',
        'CIDESCO, praktisk examination',
        'Buccal Massage & Gua Sha Facelift, Holistic Beauty School, Mongoliet',
        'Medlem i SHR, Sveriges Hudterapeuters Riksorganisation',
      ],
      awardsTitle: 'Utmärkelser och uppdrag',
      awards: [
        'Jurymedlem och workshopledare, Asia Massage Championship, Tokyo',
        'Jurymedlem, European Championship, Paris',
        'Jurymedlem, Asian Championship, Phuket',
        'Silver, Best Spa & Esthetics Massage, Europamästerskapen',
        'Topp 10, ansiktsmassage, Europamästerskapen',
        'Topp 10, världsmästerskapen i Köpenhamn',
        'Topp 10, ansiktsmassage, världsmästerskapen',
      ],
      team: 'I teamet: <strong>Nesii</strong>, <strong>Nomin</strong> och <strong>Iinga</strong>, certifierade Gua Sha Facelift-terapeuter som arbetar efter Bellas metoder.',
      imageAlt: 'Bella sitter i BE BEAUTYs studio i Stockholm',
      juryAlt: 'Bella som jurymedlem under Asia Massage Championship 2026',
    },
    reviews: {
      label: 'Omdömen',
      title: 'Vad våra <em>kunder</em> säger',
      hint: 'Svep kortet',
      readAll: 'Läs alla omdömen på Bokadirekt',
      items: reviews,
    },
    offers: {
      label: 'Academy & företag',
      academyTitle: 'BE BEAUTY <em>Academy</em>',
      academyLead: 'Tvådagarskurser med Bella i små grupper, för dig som vill arbeta med Face Sculpting.',
      courses: [
        {
          name: 'Lymphatic Gua Sha Face Lift',
          text: 'Lymfatiska tekniker, Gua Sha och manuell Face Sculpting för flöde, mindre svullnad och ett naturligt lyft.',
        },
        {
          name: 'Jaw Release',
          text: 'Käkens och nackens anatomi, massetern och tekniker för spänning, rörlighet och balans.',
        },
      ],
      academyMeta: '18 500 kr per kurs · 2 dagar · Små grupper',
      academyNote: 'Nya kursdatum släpps snart.',
      academyCta: 'Anmäl intresse',
      academySubject: 'Intresseanmälan: BE BEAUTY Academy',
      academyAlt: 'Bella undervisar i ansiktets anatomi framför en klass',
      corporateTitle: 'Corporate <em>Wellness</em><sup>™</sup>',
      corporateLead:
        'Ta hand om de som tar hand om ditt företag. Premiumupplevelser för återhämtning på arbetsplatsen, anpassade efter ditt team.',
      corporateCta: 'Kontakta oss',
      corporateSubject: 'Corporate Wellness',
    },
    studios: {
      label: 'Studior',
      title: 'Två studior <em>i Stockholm</em>',
      items: [
        { name: 'Vasastan', address: address(0) },
        { name: 'Norra Djurgården', address: address(1) },
      ],
      directions: 'Vägbeskrivning',
      hoursLabel: 'Öppettider',
      hours: 'Mån–fre 09–19<br>Lör–sön 10–19',
      contactLabel: 'Kontakt',
      mapAlt: 'Karta över BE BEAUTYs två studior i Stockholm',
      photoAlt: 'Bella i BE BEAUTYs rosa studio',
    },
    // The pages beyond the home page (om/, behandlingar/, akademi/, kontakt/).
    pages: {
      common: {
        seeTreatments: 'Se alla behandlingar',
        aboutBella: 'Läs om Bella',
      },
      about: {
        title: 'Om Bella Bayar · BE BEAUTY',
        description:
          'Bella Bayar, grundare av BE BEAUTY: Face Sculptor, utbildare och internationell jurymedlem. BE BEAUTY utsågs till Bästa skönhetssalong 2026 på Stockholm Beauty Week.',
        label: 'Om Bella',
        awardLabel: 'Utmärkelse',
        awardText: 'BE BEAUTY Face Sculpting utsågs till Bästa skönhetssalong 2026 på Stockholm Beauty Week.',
        awardBy: 'Juryns motivering',
        awardLine: 'Bästa skönhetssalong, Stockholm Beauty Week',
        storyLabel: 'Resan',
        storyTitle: 'Från Mongoliet till <em>Stockholm</em>',
        galleryLabel: 'Bella i bild',
        galleryTitle: 'Tävlingar, <em>scener</em> och studion',
        ctaTitle: 'Möt Bella <em>i studion</em>',
        ctaText: 'Boka en behandling i Vasastan eller på Norra Djurgården.',
      },
      treatments: {
        title: 'Behandlingar och priser · BE BEAUTY',
        description:
          'Alla BE BEAUTYs behandlingar med priser: Femina Bella Est®, buckal massage, Gua Sha, Signatur TCM och kroppsbehandlingar i Stockholm.',
        label: 'Behandlingar',
        heading: 'Alla <em>behandlingar</em>',
        note: 'Ordinarie priser från Bokadirekt. Paket och kampanjer hittar du där.',
        groupTitles: ['Skulptera <em>ansiktet</em>', 'Österländsk <em>visdom</em>', 'Hela <em>kroppen</em>'],
        groupLeads: [
          'Skulpterande ansiktsbehandlingar med Gua Sha, buckal massage och lymfdränage för ett naturligt lyft.',
          'Bellas signaturbehandlingar, där traditionell kinesisk medicin, meridianer och akupressur möter modern Face Sculpting.',
          'Gua Sha, lymfdränage och fascia release för kroppen, från bröstkorg och mage till kropp och ansikte i ett.',
        ],
        ctaTitle: 'Vet du inte <em>var du ska börja?</em>',
        ctaText: 'Boka Sculpt Facial med Bella, en personlig behandling där hon läser av ansiktets struktur, spänningar och cirkulation.',
      },
      academy: {
        title: 'BE BEAUTY Academy · Kurser i Face Sculpting',
        description:
          'Tvådagarskurser i Lymphatic Gua Sha Face Lift och Jaw Release med Bella Bayar i små grupper i Stockholm. Plus Corporate Wellness för företag.',
        label: 'Academy',
        teachLabel: 'Lär av Bella',
        teachTitle: 'Från tävlingsscenen <em>till din praktik</em>',
        teachText:
          'Bella sitter i juryn vid internationella mästerskap och lärde i juni 2026 ut sin metod som workshop på Asia Massage Championship i Tokyo. På kurserna delar hon samma tekniker, steg för steg.',
        coursesLabel: 'Kurser',
        coursesTitle: 'Två kurser, <em>två dagar</em>',
        corporateLabel: 'För företag',
      },
      contact: {
        title: 'Kontakt och studior · BE BEAUTY',
        description:
          'Hitta till BE BEAUTYs studior på Västmannagatan 12 i Vasastan och Jaktgatan 29 på Norra Djurgården. Boka på Bokadirekt eller mejla oss.',
        label: 'Kontakt',
        heading: 'Välkommen <em>in</em>',
        lead: 'Två studior i Stockholm, i Vasastan och på Norra Djurgården. Boka på Bokadirekt, eller skriv till oss om du har frågor.',
        writeLabel: 'Skriv till oss',
        writeTitle: 'Frågor är <em>alltid välkomna</em>',
        writeText: 'Om behandlingar, Academy eller Corporate Wellness: mejla oss eller skicka ett meddelande på Instagram.',
        email: 'Mejla oss',
      },
      // The link in bio (linkinbio/), in Bella's own voice. Not linked from the menus.
      links: {
        title: 'Bella Bayar · Kontakt och länkar · BE BEAUTY',
        description: 'Alla vägar till Bella Bayar och BE BEAUTY: bokning, Instagram, Facebook, mejl, Academy och två studior i Stockholm.',
        label: 'Länkar',
        hello: 'Så fint att du är här.',
        name: 'Bella <em>Bayar</em>',
        role: 'Face Sculptor · Grundare av BE BEAUTY Salon &amp; Academy · Stockholm',
        honours: ['Silver · Europamästerskapen 2025', 'Jury · Tokyo, Paris, Phuket', '4,9 ★ · 478 betyg', 'Skapare av Femina Bella Est®'],
        book: 'Boka hos Bella',
        bookSub: 'Bokadirekt · båda studiorna i Stockholm',
        pressLabel: 'På omslaget',
        methodsLabel: 'Tre vägar till lyster',
        methodsTitle: 'Ansikte, <em>Signatur TCM</em> och kropp',
        linksLabel: 'Kontakt och länkar',
        instagram: 'Studiolivet, resultat och tävlingar',
        facebook: 'Håll kontakten',
        email: 'Mejla mig',
        save: 'Spara min kontakt',
        saveText: 'Lägg till mig i dina kontakter',
        academy: 'Lär dig min metod på två dagar',
        corporate: 'Face sculpting för ditt team',
        siteLabel: 'På webbplatsen',
        treatments: 'Behandlingar och priser',
        treatmentsText: 'Alla behandlingar, alla priser',
        about: 'Om Bella',
        aboutText: 'Från Mongoliet till Stockholm',
        studiosLabel: 'Hitta studiorna',
        studiosTitle: 'Välkommen <em>in</em>',
        copy: 'Kopiera adress',
        copied: 'Kopierad',
        closing: 'Jag ser fram emot att <em>välkomna dig</em>.',
        closingSub: 'Vasastan och Norra Djurgården, Stockholm',
      },
    },
    footer: {
      sub: 'Face Sculpting Salon & Academy i Stockholm',
      top: 'Till toppen',
      rights: 'Alla rättigheter förbehållna.',
    },
  },

  en: {
    meta: {
      title: 'BE BEAUTY · Face sculpting in Stockholm with Bella Bayar',
      description:
        'BE BEAUTY is Bella Bayar’s face sculpting studio in Stockholm: Femina Bella Est®, buccal massage, gua sha and lymphatic drainage. Rated 4.9 out of 5 on Bokadirekt. Studios in Vasastan and Norra Djurgården.',
    },
    ui: {
      skip: 'Skip to content',
      menu: 'Menu',
      close: 'Close menu',
      langLabel: 'Language',
      book: 'Book now',
      bookFull: 'Book on Bokadirekt',
      barRating: '<strong>4.9</strong> of 5 · 478 ratings',
      allTreatments: 'All treatments and packages on Bokadirekt',
      prev: 'Previous',
      next: 'Next',
      sound: 'Sound',
      socials: 'Follow BE BEAUTY',
      instagram: 'BE BEAUTY on Instagram',
      facebook: 'BE BEAUTY on Facebook',
      leave: {
        instagram: 'You’re about to visit BE BEAUTY on Instagram. It opens in a new tab.',
        facebook: 'You’re about to visit BE BEAUTY on Facebook. It opens in a new tab.',
        go: 'Continue',
        cancel: 'Cancel',
      },
    },
    premiere: {
      presents: 'presents',
      awardKicker: 'Stockholm Beauty Week',
      award: 'Best Beauty Salon',
      awardQuote: '“A sensory experience beyond the ordinary, where East meets West. No needles needed.”',
    },
    portal: {
      soundTitle: 'Sound on?',
      soundLead: 'BE BEAUTY is made to be felt with sound. Soft, calm and close.',
      yes: 'Yes, with sound',
      recommended: 'Recommended',
      no: 'No thanks, keep it quiet',
      langTitle: 'Choose your language',
      langLead: 'Make yourself at home.',
      detected: 'We found English',
      auto: 'Continuing in {n}',
      paused: 'Paused',
      pause: 'Pause the countdown',
      resume: 'Resume the countdown',
    },
    nav: {
      method: 'The method',
      treatments: 'Treatments',
      about: 'About Bella',
      reviews: 'Reviews',
      studios: 'Studios',
      home: 'Home',
      academy: 'Academy',
      contact: 'Contact',
    },
    hero: {
      eyebrow: 'Face sculpting · Stockholm',
      lead: 'A natural facelift with gua sha, buccal massage and lymphatic drainage. No needles, no surgery.',
      founder: 'Founded by Bella Bayar',
      cta: 'Book now',
      secondary: 'See treatments',
      imageAlt: 'Bella Bayar, founder of BE BEAUTY, in a cream blazer and lace blouse',
    },
    approach: {
      label: 'Our approach',
      items: [
        {
          word: 'Beauty',
          text: 'Treatments that bring out your natural features while respecting what makes your skin unique.',
          imageAlt: 'Bella demonstrates a sculpting face treatment in front of an audience',
        },
        {
          word: 'Balance',
          text: 'Through gua sha, buccal massage and lymphatic drainage we restore harmony to face and body.',
          imageAlt: 'A gua sha stone sculpting the cheekbone during a treatment',
        },
        {
          word: 'Glow',
          text: 'Lasting radiance and vitality. Results you can see and feel, from the inside out.',
          imageAlt: 'Close-up of Bella Bayar with radiant, glowing skin',
        },
      ],
    },
    method: {
      label: 'Bella’s signature method',
      title: 'Femina\u00a0<em>Bella\u00a0Est</em><sup>®</sup>',
      lead: 'A structured, mindful facial massage that brings together sculpting movements, meridian stimulation and lymphatic activation.',
      body: 'Rhythmic manual massage, lymphatic drainage, acupressure, gua sha and vacuum work together along the meridians of the face. It lifts the facial architecture, releases tension and restores inner balance: a natural facelift effect with firmer, clearer skin.',
      techniques: ['Gua sha', 'Acupressure', 'Lymphatic drainage', 'Vacuum', 'Meridians', 'Sculpting'],
      stage: 'In June 2026 Bella taught the method as a workshop at the Asia Massage Championship in Tokyo.',
      cta: 'Book Femina\u00a0Bella\u00a0Est · SEK 1,495',
      imageAlt: 'Bella working her hands along a client’s forehead',
    },
    treatments: {
      label: 'Treatments',
      title: 'Choose your <em>treatment</em>',
      intro: 'Every treatment was created by Bella and is performed by her or her certified team.',
      groups: ['Face', 'Signature TCM', 'Body'],
      pick: 'Choose one to change the sculpture',
      swipe: 'Swipe for more',
      items: withMeta(
        [
          {
            name: 'Femina\u00a0Bella\u00a0Est<sup>®</sup> gua sha facelift',
            tag: 'Most popular',
            description: 'Bella’s own method: gua sha, acupressure, lymphatic drainage and vacuum for a natural facelift effect.',
          },
          {
            name: 'Sculpt & Buccal Facial',
            tag: 'Client favourite',
            description: 'Deep cleansing, sculpting massage and intraoral buccal technique, plus scalp, neck and décolleté.',
          },
          {
            name: 'Buccal massage & jaw treatment',
            tag: '',
            description: 'Softens tight jaw muscles from inside and out. For anyone who clenches or carries stress in the jaw.',
          },
          {
            name: 'Jaw Release + Femina\u00a0Bella\u00a0Est',
            tag: '',
            description: 'Releases deep tension in the jaw, face and neck, and finishes with Bella’s signature lift.',
          },
          {
            name: 'Sculpt Facial with Bella',
            tag: 'Consultation',
            description: 'A personal gua sha treatment in which Bella reads your facial structure, tension and circulation.',
          },
          {
            name: 'Buccal Release & Sculpt Facial',
            tag: '',
            description: 'Advanced face sculpting with intraoral buccal massage, fascia release, gua sha and lymphatic drainage.',
          },
          {
            name: 'Symmetry Sculpt Facial<sup>™</sup>',
            tag: '',
            description: 'Balances the muscles, fascia and contours of the face for a more even structure and harmonious expression.',
          },
          {
            name: 'Bojin Acupressure Lift<sup>™</sup>',
            tag: '',
            description: 'Bojin technique with acupressure and meridian work to reduce puffiness and define jawline and cheekbones.',
          },
          {
            name: 'Glow & Lymphatic Sculpt Facial',
            tag: '',
            description: 'Exfoliation, gua sha, lymphatic drainage and radiance-boosting skincare for less puffiness and more glow.',
          },
          {
            name: 'Heart Space Gua Sha Release',
            tag: '',
            description: 'For décolleté, chest, neck and shoulders. Freer breathing and a better foundation for a facial lift.',
          },
          {
            name: 'Abdominal Sculpt<sup>™</sup>',
            tag: '',
            description: 'Lymphatic drainage, gua sha and fascia release for the abdomen. A lighter feeling and a more defined waist.',
          },
          {
            name: 'Gua sha body & face',
            tag: '2 hours',
            description: 'Lymphatic gua sha and cupping for the body, followed by a gua sha facelift for the face.',
          },
        ],
        priceEn,
      ),
    },
    proof: {
      label: 'In numbers',
      rating: '4.9',
      ratingLabel: 'out of 5 on average from <strong>478 ratings</strong> on Bokadirekt',
      stats: [
        { value: '10+', label: 'years of experience' },
        { value: '3', label: 'salons built' },
        { value: '3', label: 'jury roles in 2026' },
        { value: 'Silver', label: 'European Championships 2025' },
      ],
      press: 'On the cover of <em>Hudterapeuten</em> magazine',
      pressAlt: 'Hudterapeuten magazine cover showing Bella Bayar at a competition',
      parisAlt: 'Bella with a certificate and medal at the European Massage Championship in Paris',
    },
    about: {
      label: 'About Bella',
      title: 'Bella <em>Bayar</em>',
      roles: 'Founder · Face sculptor · Educator · Licensed esthetician',
      lead: 'Originally from Mongolia, now based in Stockholm. An internationally recognised facial massage therapist, buccal massage expert and founder of BE BEAUTY Salon & Academy.',
      body1:
        'Her journey began the day she discovered gua sha and its power for both inner and outer health, and knew it was her calling. More than ten years later she has built three salons and a team of like-minded therapists, competed at European and World Championships, and now teaches others holistic facial care.',
      body2:
        'Her approach blends Eastern philosophies of energy flow and meridian balance with Western knowledge of anatomy and skin. The head and face hold our thoughts, emotions and senses, so every treatment lifts not just the face but the spirit.',
      quote:
        'For me, beauty is more than what we see. It’s how we feel. Every treatment is a chance to restore balance, release emotion and reconnect with ourselves.',
      quoteBy: 'Bella Bayar',
      educationTitle: 'Education',
      education: [
        'Licensed Skin & Spa Therapist, International Beauty School, Sweden',
        'CIDESCO practical examination',
        'Buccal Massage & Gua Sha Facelift, Holistic Beauty School, Mongolia',
        'Member of SHR, the Swedish association of skin therapists',
      ],
      awardsTitle: 'Awards and roles',
      awards: [
        'Jury member and workshop presenter, Asia Massage Championship, Tokyo',
        'Jury member, European Championship, Paris',
        'Jury member, Asian Championship, Phuket',
        'Silver, Best Spa & Esthetics Massage, European Championships',
        'Top 10, Facial Massage, European Championships',
        'Top 10, World Championship, Copenhagen',
        'Top 10, Facial Massage, World Championships',
      ],
      team: 'The team: <strong>Nesii</strong>, <strong>Nomin</strong> and <strong>Iinga</strong>, certified gua sha facelift therapists trained in Bella’s methods.',
      imageAlt: 'Bella seated in the BE BEAUTY studio in Stockholm',
      juryAlt: 'Bella as a jury member at the Asia Massage Championship 2026',
    },
    reviews: {
      label: 'Reviews',
      title: 'What our <em>clients</em> say',
      hint: 'Swipe the card',
      readAll: 'Read every review on Bokadirekt',
      items: reviews,
    },
    offers: {
      label: 'Academy & business',
      academyTitle: 'BE BEAUTY <em>Academy</em>',
      academyLead: 'Two-day courses with Bella in small groups, for anyone who wants to work with face sculpting.',
      courses: [
        {
          name: 'Lymphatic Gua Sha Face Lift',
          text: 'Lymphatic techniques, gua sha and manual face sculpting for flow, less puffiness and a natural lift.',
        },
        {
          name: 'Jaw Release',
          text: 'Jaw and neck anatomy, the masseter, and techniques for tension, mobility and balance.',
        },
      ],
      academyMeta: 'SEK 18,500 per course · 2 days · Small groups',
      academyNote: 'New course dates are coming soon.',
      academyCta: 'Register interest',
      academySubject: 'Interest: BE BEAUTY Academy',
      academyAlt: 'Bella teaching facial anatomy to a class',
      corporateTitle: 'Corporate <em>Wellness</em><sup>™</sup>',
      corporateLead:
        'Take care of the people who take care of your business. Premium workplace recovery experiences, tailored to your team.',
      corporateCta: 'Contact us',
      corporateSubject: 'Corporate Wellness',
    },
    studios: {
      label: 'Studios',
      title: 'Two studios <em>in Stockholm</em>',
      items: [
        { name: 'Vasastan', address: address(0) },
        { name: 'Norra Djurgården', address: address(1) },
      ],
      directions: 'Directions',
      hoursLabel: 'Opening hours',
      hours: 'Mon–Fri 9am–7pm<br>Sat–Sun 10am–7pm',
      contactLabel: 'Contact',
      mapAlt: 'Map of the two BE BEAUTY studios in Stockholm',
      photoAlt: 'Bella in the pink BE BEAUTY studio',
    },
    pages: {
      common: {
        seeTreatments: 'See all treatments',
        aboutBella: 'About Bella',
      },
      about: {
        title: 'About Bella Bayar · BE BEAUTY',
        description:
          'Bella Bayar, founder of BE BEAUTY: face sculptor, educator and international jury member. BE BEAUTY was named Best Beauty Salon 2026 at Stockholm Beauty Week.',
        label: 'About Bella',
        awardLabel: 'Award',
        awardText: 'BE BEAUTY Face Sculpting was named Best Beauty Salon 2026 at Stockholm Beauty Week.',
        awardBy: 'The jury',
        awardLine: 'Best Beauty Salon, Stockholm Beauty Week',
        storyLabel: 'The journey',
        storyTitle: 'From Mongolia to <em>Stockholm</em>',
        galleryLabel: 'Bella in pictures',
        galleryTitle: 'Championships, <em>stages</em> and the studio',
        ctaTitle: 'Meet Bella <em>in the studio</em>',
        ctaText: 'Book a treatment in Vasastan or Norra Djurgården.',
      },
      treatments: {
        title: 'Treatments and prices · BE BEAUTY',
        description:
          'Every BE BEAUTY treatment with prices: Femina Bella Est®, buccal massage, gua sha, Signature TCM and body treatments in Stockholm.',
        label: 'Treatments',
        heading: 'All <em>treatments</em>',
        note: 'Regular prices from Bokadirekt, where you will also find packages and offers.',
        groupTitles: ['Sculpt <em>the face</em>', 'Eastern <em>wisdom</em>', 'The whole <em>body</em>'],
        groupLeads: [
          'Sculpting facials with gua sha, buccal massage and lymphatic drainage for a natural lift.',
          'Bella’s signature treatments, where traditional Chinese medicine, meridians and acupressure meet modern face sculpting.',
          'Gua sha, lymphatic drainage and fascia release for the body, from chest and stomach to body and face in one.',
        ],
        ctaTitle: 'Not sure <em>where to start?</em>',
        ctaText: 'Book a Sculpt Facial with Bella, a personal treatment where she reads your face’s structure, tension and circulation.',
      },
      academy: {
        title: 'BE BEAUTY Academy · Face sculpting courses',
        description:
          'Two-day courses in Lymphatic Gua Sha Face Lift and Jaw Release with Bella Bayar, in small groups in Stockholm. Plus Corporate Wellness for companies.',
        label: 'Academy',
        teachLabel: 'Learn from Bella',
        teachTitle: 'From the championship stage <em>to your practice</em>',
        teachText:
          'Bella sits on the jury at international championships, and in June 2026 she taught her method as a workshop at the Asia Massage Championship in Tokyo. On her courses she shares the same techniques, step by step.',
        coursesLabel: 'Courses',
        coursesTitle: 'Two courses, <em>two days each</em>',
        corporateLabel: 'For companies',
      },
      contact: {
        title: 'Contact and studios · BE BEAUTY',
        description:
          'Find BE BEAUTY’s studios at Västmannagatan 12 in Vasastan and Jaktgatan 29 in Norra Djurgården. Book on Bokadirekt or email us.',
        label: 'Contact',
        heading: 'Welcome <em>in</em>',
        lead: 'Two studios in Stockholm, in Vasastan and Norra Djurgården. Book on Bokadirekt, or write to us with any questions.',
        writeLabel: 'Write to us',
        writeTitle: 'Questions are <em>always welcome</em>',
        writeText: 'About treatments, the Academy or Corporate Wellness: email us or send a message on Instagram.',
        email: 'Email us',
      },
      links: {
        title: 'Bella Bayar · Contact and links · BE BEAUTY',
        description: 'Every way to reach Bella Bayar and BE BEAUTY: booking, Instagram, Facebook, email, the Academy and two studios in Stockholm.',
        label: 'Links',
        hello: 'Lovely to see you here.',
        name: 'Bella <em>Bayar</em>',
        role: 'Face sculptor · Founder of BE BEAUTY Salon &amp; Academy · Stockholm',
        honours: ['Silver · European Championship 2025', 'Jury · Tokyo, Paris, Phuket', '4.9 ★ · 478 ratings', 'Creator of Femina Bella Est®'],
        book: 'Book with Bella',
        bookSub: 'Bokadirekt · both studios in Stockholm',
        pressLabel: 'On the cover',
        methodsLabel: 'Three ways to glow',
        methodsTitle: 'Face, <em>Signature TCM</em> and body',
        linksLabel: 'Contact and links',
        instagram: 'Studio life, results and championships',
        facebook: 'Stay in touch',
        email: 'Email me',
        save: 'Save my contact',
        saveText: 'Add me to your contacts',
        academy: 'Learn my method in two days',
        corporate: 'Face sculpting for your team',
        siteLabel: 'On the website',
        treatments: 'Treatments and prices',
        treatmentsText: 'Every treatment, every price',
        about: 'About Bella',
        aboutText: 'From Mongolia to Stockholm',
        studiosLabel: 'Find the studios',
        studiosTitle: 'Welcome <em>in</em>',
        copy: 'Copy address',
        copied: 'Copied',
        closing: 'I look forward to <em>welcoming you</em>.',
        closingSub: 'Vasastan and Norra Djurgården, Stockholm',
      },
    },
    footer: {
      sub: 'Face sculpting salon & academy in Stockholm',
      top: 'Back to top',
      rights: 'All rights reserved.',
    },
  },
};
