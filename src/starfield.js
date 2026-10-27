// Deep space behind the map's globe, painted once onto a canvas: field stars
// with real colour temperatures and a few bright ones with soft glows, the
// Milky Way as a tilted band of glow, dense faint stars and dark dust lanes,
// and faint rose and violet nebulae. Seeded, so it looks the same on every visit.

const STAR_COLOURS = ['#9bb0ff', '#aabfff', '#cad7ff', '#f8f7ff', '#f8f7ff', '#fff4ea', '#fff4ea', '#ffd2a1', '#ffcc6f'];

function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function paintStarfield(canvas) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const random = seeded(20261027);
  const gauss = () => Math.sqrt(-2 * Math.log(random() + 1e-9)) * Math.cos(2 * Math.PI * random());
  const size = Math.max(width, height);

  // The void: almost black, with a faint wine warmth towards the middle.
  const space = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.5, size * 0.85);
  space.addColorStop(0, '#140b14');
  space.addColorStop(0.6, '#07040a');
  space.addColorStop(1, '#020104');
  ctx.fillStyle = space;
  ctx.fillRect(0, 0, width, height);

  const glow = (x, y, radius, colour, alpha) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(${colour}, ${alpha})`);
    g.addColorStop(1, `rgba(${colour}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };

  // Nebulae.
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const colour = ['142, 70, 81', '120, 80, 150', '231, 163, 160', '70, 90, 160'][i % 4];
    glow(random() * width, random() * height, size * (0.18 + random() * 0.25), colour, 0.05 + random() * 0.05);
  }

  // The Milky Way: a tilted band across the frame.
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-0.55);
  const span = size * 1.5;
  const band = size * 0.09;
  for (let i = 0; i < 320; i++) {
    const colour = random() < 0.5 ? '205, 190, 255' : '255, 214, 200';
    glow((random() - 0.5) * span, gauss() * band, 18 + random() * 70, colour, 0.018 + random() * 0.03);
  }
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(255, 248, 240, ${0.15 + random() * 0.55})`;
    const r = random() * 0.7 + 0.2;
    ctx.beginPath();
    ctx.arc((random() - 0.5) * span, gauss() * band * 0.9, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Dust lanes darken the band's spine.
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 90; i++) {
    const x = (random() - 0.5) * span;
    const y = gauss() * band * 0.35;
    const r = 14 + random() * 46;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(4, 2, 6, 0.32)');
    g.addColorStop(1, 'rgba(4, 2, 6, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();

  // Field stars across everything, most faint, a few bright.
  ctx.globalCompositeOperation = 'lighter';
  const count = Math.round((width * height) / 650);
  for (let i = 0; i < count; i++) {
    const brightness = random() ** 3;
    const x = random() * width;
    const y = random() * height;
    const colour = STAR_COLOURS[Math.floor(random() * STAR_COLOURS.length)];
    ctx.globalAlpha = 0.25 + brightness * 0.75;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(x, y, 0.35 + brightness * 1.1, 0, Math.PI * 2);
    ctx.fill();
    if (brightness > 0.82) {
      ctx.globalAlpha = 1;
      glow(x, y, 2.5 + brightness * 5, '255, 240, 235', 0.22);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
