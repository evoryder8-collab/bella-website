import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';

// The house's name engraved on the stone while the first-visit ritual is open:
// BE BEAUTY as the header writes it (BE upright, BEAUTY in italic) with "Face
// sculpting · Stockholm" set to the same width beneath, cut in deep rose with
// a fine catch of light along each letter's lower edge so it reads on the pale
// quartz. Drawn once the site's fonts have loaded.

const WIDTH = 0.8; // in the stone's units (it is about 1.1 long)
const ASPECT = 0.36;
const SERIF = '"Bodoni Moda", "Bodoni 72", Didot, Georgia, serif';
const SANS = 'Jost, Futura, "Avenir Next", system-ui, sans-serif';

// A line of letters spaced by `tracking` (in ems), measured and drawn as one.
function spaced(g, text, font, size, tracking) {
  g.font = font;
  const widths = [...text].map((char) => g.measureText(char).width);
  const width = widths.reduce((sum, w) => sum + w, 0) + tracking * size * (widths.length - 1);
  return {
    width,
    draw(x, y, { stroke = true } = {}) {
      g.font = font;
      [...text].forEach((char, i) => {
        g.fillText(char, x, y);
        if (stroke) g.strokeText(char, x, y);
        x += widths[i] + tracking * size;
      });
    },
  };
}

function draw(canvas, eyebrow) {
  const g = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  g.clearRect(0, 0, w, h);
  g.textBaseline = 'alphabetic';

  // The name, sized to fill the plate.
  const name = (size) => {
    const be = spaced(g, 'BE', `400 ${size}px ${SERIF}`, size, 0.06);
    const beauty = spaced(g, 'BEAUTY', `italic 400 ${size}px ${SERIF}`, size, 0.06);
    const gap = size * 0.3;
    return { width: be.width + gap + beauty.width, draw: (x, y) => (be.draw(x, y), beauty.draw(x + be.width + gap, y)) };
  };
  const trial = name(100);
  const size = (100 * w * 0.9) / trial.width;
  const title = name(size);
  // The place, as wide as the name, small and widely spaced.
  const words = eyebrow.toUpperCase();
  const trialSmall = spaced(g, words, `500 100px ${SANS}`, 100, 0.3);
  const small = Math.min(h * 0.13, (100 * title.width) / trialSmall.width);
  const place = spaced(g, words, `500 ${small}px ${SANS}`, small, 0.3);

  // Every letter gets a hair more weight: the display serif's finest strokes
  // would otherwise vanish when the plate is drawn small (in Safari above all).
  g.lineJoin = 'round';
  const lines = (dy, paint) => {
    g.fillStyle = g.strokeStyle = paint;
    g.lineWidth = size * 0.028;
    title.draw((w - title.width) / 2, h * 0.55 + dy);
    g.lineWidth = small * 0.05;
    place.draw((w - place.width) / 2, h * 0.8 + dy);
  };
  lines(size * 0.022, 'rgb(255 246 242 / 0.6)');
  const ink = g.createLinearGradient(0, h * 0.15, 0, h * 0.85);
  ink.addColorStop(0, '#7c3443');
  ink.addColorStop(1, '#4a1826');
  lines(0, ink);
}

export function createPlate(eyebrow) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = Math.round(1024 * ASPECT);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  // Drawn over the stone rather than depth-tested against it: on phones the
  // depth buffer is too coarse for a plate this close to its face, which then
  // cuts through the letters. Nothing passes in front of the stone in the ritual.
  const material = new MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, opacity: 0, toneMapped: false });
  const mesh = new Mesh(new PlaneGeometry(WIDTH, WIDTH * ASPECT), material);
  mesh.renderOrder = 2;

  const fonts = document.fonts
    ? Promise.all([`400 64px ${SERIF}`, `italic 400 64px ${SERIF}`, `500 32px ${SANS}`].map((font) => document.fonts.load(font)))
    : Promise.resolve();
  // Drawn when the fonts arrive, or with what there is after two seconds.
  Promise.race([fonts, new Promise((resolve) => setTimeout(resolve, 2000))])
    .catch(() => {})
    .then(() => {
      draw(canvas, eyebrow);
      texture.needsUpdate = true;
    });

  return { mesh, material };
}
