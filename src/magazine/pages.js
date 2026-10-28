// The magazine's inside pages, painted on canvases: editorial layouts in the
// issue's lilac with Bella's photos and text greyed into soft bars. They are
// made to be glimpsed while the pages flip, not read.

import academy from '../images/academy.jpg';
import bellaStudio from '../images/bella-studio.jpg';
import guasha from '../images/guasha.jpg';
import heroBella from '../images/hero-bella.jpg';
import jury from '../images/jury-asia.jpg';
import paris from '../images/paris-championship.jpg';
import studio from '../images/studio.jpg';
import hands from '../images/treatment-hands.jpg';
import light from '../images/treatment-light.jpg';

const PAPER = '#fbf8f4';
const INK = 'rgb(58 47 69 / 0.4)';
const LILAC = '#9373c2';
const DISPLAY = '"Bodoni Moda", Didot, Georgia, serif';
const BODY = 'Jost, Futura, system-ui, sans-serif';

// Which layout each visible face gets, by leaf. Fronts are right-hand pages,
// backs left-hand ones; the cover's front is the real cover photo.
const FRONTS = [
  null,
  { layout: 'contents', photos: [studio] },
  { layout: 'opener', photos: [paris], word: 'Tävling' },
  { layout: 'split', photos: [guasha], word: 'Gua sha' },
  { layout: 'columns' },
  { layout: 'full', photos: [hands] },
  { layout: 'columns' },
  { layout: 'split', photos: [heroBella], word: 'Ansiktet' },
  { layout: 'grid', photos: [guasha, studio, bellaStudio, paris] },
  { layout: 'columns' },
  { layout: 'opener', photos: [light], word: 'Hudvård' },
];
const BACKS = [
  { layout: 'ad', photos: [light], word: 'Lyster' },
  { layout: 'full', photos: [bellaStudio] },
  { layout: 'columns' },
  { layout: 'grid', photos: [hands, academy, jury, heroBella] },
  { layout: 'interview', photos: [jury], word: 'Juryn' },
  { layout: 'opener', photos: [academy], word: 'Utbildning' },
  { layout: 'full', photos: [studio] },
  { layout: 'columns' },
  { layout: 'ad', photos: [guasha], word: 'Ritual' },
  { layout: 'full', photos: [bellaStudio] },
];

const random = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const idle = () => new Promise((resolve) => ('requestIdleCallback' in window ? requestIdleCallback(resolve, { timeout: 120 }) : setTimeout(resolve, 16)));

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img.decode().then(() => img);
}

// Draw an image filling a box, like object-fit: cover.
function fill(g, img, x, y, w, h) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  g.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

// Running text as soft bars, word by word, with short last lines between paragraphs.
function text(g, rng, x, y, w, bottom, size, color = INK) {
  g.fillStyle = color;
  const lead = size * 1.7;
  for (let line = y; line + size <= bottom; line += lead) {
    const last = rng() < 0.13;
    const end = last ? x + w * (0.3 + rng() * 0.5) : x + w;
    for (let wx = x; wx < end - size * 0.5; ) {
      const width = Math.min(size * (0.9 + rng() * 3.2), end - wx);
      g.fillRect(wx, line, width, size * 0.6);
      wx += width + size * 0.55;
    }
    if (last) line += lead * 0.6;
  }
}

function columns(g, rng, x, y, w, bottom, count, size) {
  const gap = size * 2.2;
  const width = (w - gap * (count - 1)) / count;
  for (let i = 0; i < count; i++) text(g, rng, x + i * (width + gap), y, width, bottom, size);
}

function kicker(g, label, x, y, size, color = LILAC) {
  g.fillStyle = color;
  g.font = `500 ${size}px ${BODY}`;
  g.letterSpacing = `${size * 0.22}px`;
  g.fillText(label.toUpperCase(), x, y);
  g.letterSpacing = '0px';
}

function headline(g, word, x, y, size, color = '#2d2236', italic = true) {
  g.fillStyle = color;
  g.font = `${italic ? 'italic ' : ''}400 ${size}px ${DISPLAY}`;
  g.fillText(word, x, y);
}

const LAYOUTS = {
  full(g, w, h, rng, [photo]) {
    fill(g, photo, 0, 0, w, h);
    const shade = g.createLinearGradient(0, h * 0.7, 0, h);
    shade.addColorStop(0, 'rgb(20 12 24 / 0)');
    shade.addColorStop(1, 'rgb(20 12 24 / 0.55)');
    g.fillStyle = shade;
    g.fillRect(0, h * 0.7, w, h * 0.3);
    text(g, rng, w * 0.08, h * 0.9, w * 0.5, h * 0.95, w * 0.014, 'rgb(255 255 255 / 0.7)');
  },

  opener(g, w, h, rng, [photo], word) {
    const m = w * 0.08;
    fill(g, photo, 0, 0, w, h * 0.56);
    kicker(g, 'Tema', m, h * 0.62, w * 0.028);
    headline(g, word, m - w * 0.01, h * 0.62 + w * 0.15, w * 0.15);
    text(g, rng, m, h * 0.62 + w * 0.2, w * 0.7, h * 0.62 + w * 0.26, w * 0.022, 'rgb(58 47 69 / 0.6)');
    columns(g, rng, m, h * 0.62 + w * 0.31, w - 2 * m, h - m, 2, w * 0.014);
  },

  columns(g, w, h, rng) {
    const m = w * 0.08;
    const size = w * 0.014;
    g.fillStyle = LILAC;
    g.font = `400 ${w * 0.17}px ${DISPLAY}`;
    g.fillText('ABDEHLMNST'[Math.floor(rng() * 10)], m - w * 0.01, m + w * 0.13);
    text(g, rng, m + w * 0.15, m, w * 0.24 - w * 0.03, m + w * 0.15, size);
    const width = (w - 2 * m - size * 4.4) / 3;
    columns(g, rng, m, m + w * 0.17, w - 2 * m, h * 0.42, 3, size);
    // A pull quote across two columns.
    g.fillStyle = LILAC;
    g.font = `italic 400 ${w * 0.12}px ${DISPLAY}`;
    g.fillText('“', m, h * 0.5 + w * 0.06);
    for (let i = 0; i < 3; i++) g.fillRect(m + w * 0.08, h * 0.47 + i * w * 0.045, (width * 2 - w * 0.08) * (i === 2 ? 0.6 : 1), w * 0.022);
    text(g, rng, m + 2 * (width + size * 2.2), h * 0.44, width, h * 0.6, size);
    columns(g, rng, m, h * 0.63, w - 2 * m, h - m, 3, size);
  },

  split(g, w, h, rng, [photo], word) {
    const m = w * 0.08;
    fill(g, photo, 0, 0, w * 0.5, h);
    kicker(g, 'Metod', w * 0.56, m + w * 0.02, w * 0.026);
    headline(g, word, w * 0.56, m + w * 0.13, w * 0.09);
    text(g, rng, w * 0.56, m + w * 0.19, w * 0.36, m + w * 0.3, w * 0.02, 'rgb(58 47 69 / 0.6)');
    text(g, rng, w * 0.56, m + w * 0.36, w * 0.36, h - m, w * 0.014);
  },

  grid(g, w, h, rng, photos) {
    const m = w * 0.08;
    const gap = w * 0.03;
    const cell = (w - 2 * m - gap) / 2;
    headline(g, 'I fokus', m, m + w * 0.07, w * 0.08, '#2d2236', false);
    photos.forEach((photo, i) => {
      const x = m + (i % 2) * (cell + gap);
      const y = m + w * 0.13 + Math.floor(i / 2) * (cell * 1.1 + w * 0.12);
      fill(g, photo, x, y, cell, cell * 1.1);
      text(g, rng, x, y + cell * 1.1 + w * 0.025, cell, y + cell * 1.1 + w * 0.09, w * 0.013);
    });
  },

  interview(g, w, h, rng, [photo], word) {
    const m = w * 0.08;
    const r = w * 0.2;
    g.save();
    g.beginPath();
    g.arc(w / 2, m + r, r, 0, Math.PI * 2);
    g.clip();
    fill(g, photo, w / 2 - r, m, r * 2, r * 2);
    g.restore();
    g.textAlign = 'center';
    headline(g, word, w / 2, m + r * 2 + w * 0.14, w * 0.1);
    g.textAlign = 'start';
    let y = m + r * 2 + w * 0.22;
    while (y < h - m - w * 0.1) {
      text(g, rng, m, y, w - 2 * m, y + w * 0.02, w * 0.016, 'rgb(147 115 194 / 0.75)');
      y += w * 0.05;
      const end = Math.min(h - m, y + w * (0.1 + rng() * 0.08));
      columns(g, rng, m, y, w - 2 * m, end, 2, w * 0.014);
      y = end + w * 0.04;
    }
  },

  ad(g, w, h, rng, [photo], word) {
    fill(g, photo, 0, 0, w, h);
    const wash = g.createLinearGradient(0, 0, 0, h);
    wash.addColorStop(0, 'rgb(147 115 194 / 0.1)');
    wash.addColorStop(1, 'rgb(74 48 110 / 0.62)');
    g.fillStyle = wash;
    g.fillRect(0, 0, w, h);
    g.textAlign = 'center';
    headline(g, word, w / 2, h * 0.8, w * 0.2, '#fff');
    kicker(g, 'Be Beauty', w / 2 + w * 0.02, h * 0.87, w * 0.026, 'rgb(255 255 255 / 0.85)');
    g.textAlign = 'start';
  },

  contents(g, w, h, rng, [photo]) {
    const m = w * 0.08;
    headline(g, 'Innehåll', m, m + w * 0.11, w * 0.12, '#2d2236', false);
    g.fillStyle = LILAC;
    g.fillRect(m, m + w * 0.16, w * 0.12, w * 0.006);
    for (let i = 0; i < 7; i++) {
      const y = m + w * 0.26 + i * w * 0.12;
      headline(g, String(4 + i * 6), m, y + w * 0.05, w * 0.06, LILAC, false);
      text(g, rng, m + w * 0.14, y, w * 0.42, y + w * 0.07, w * 0.016);
    }
    fill(g, photo, w * 0.64, m + w * 0.24, w - m - w * 0.64, h * 0.42);
  },
};

function paint(page, photos, width, height, rng, number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d');
  g.fillStyle = PAPER;
  g.fillRect(0, 0, width, height);
  if (!page) return canvas;
  LAYOUTS[page.layout](g, width, height, rng, photos, page.word);
  // Page number at the outer bottom corner.
  const right = number % 2 === 1;
  const onPhoto = page.layout === 'full' || page.layout === 'ad';
  g.fillStyle = onPhoto ? 'rgb(255 255 255 / 0.8)' : 'rgb(58 47 69 / 0.55)';
  g.font = `400 ${width * 0.024}px ${BODY}`;
  g.textAlign = right ? 'end' : 'start';
  g.fillText(String(number), right ? width * 0.94 : width * 0.06, height * 0.975);
  return canvas;
}

// Paints every face the visitor can see, a little at a time so scrolling stays
// smooth. Resolves to canvases by leaf: fronts (the cover's is left empty for
// the real cover) and backs, plus plain paper for the faces nobody sees.
export async function paintPages(width) {
  const height = Math.round(width * (809 / 573));
  await Promise.all([document.fonts.load(`italic 400 40px ${DISPLAY}`), document.fonts.load(`400 40px ${DISPLAY}`), document.fonts.load(`500 20px ${BODY}`)]).catch(() => {});
  const images = new Map();
  const load = (src) => images.get(src) ?? images.set(src, loadImage(src)).get(src);
  const rng = random(20260);
  const face = async (page, number) => {
    const photos = await Promise.all((page?.photos ?? []).map(load));
    await idle();
    return paint(page, photos, width, height, rng, number);
  };
  const fronts = [null];
  const backs = [];
  for (let i = 0; i < BACKS.length; i++) {
    backs[i] = await face(BACKS[i], 2 * i + 2);
    if (FRONTS[i + 1]) fronts[i + 1] = await face(FRONTS[i + 1], 2 * i + 3);
  }
  return { fronts, backs, blank: paint(null, [], 8, 8) };
}
