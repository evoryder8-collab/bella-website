// The page's colour story. Every section carries data-tone="light|rose|dark";
// neighbouring tones blend over part of a screen, so the page never changes
// colour at a hard edge. The same stops paint the CSS background (always) and
// the WebGL atmosphere (src/world/atmosphere.js) when it runs.

export const TONES = {
  light: { base: '#f6e9e4', glow: '#ffffff' },
  rose: { base: '#efd6cf', glow: '#f7c3bd' },
  dark: { base: '#24141a', glow: '#8e4651' },
};

// How far a blend reaches into a section: most of its padding on that side,
// so the colour changes in the space between chapters and never behind copy.
// (Where tones change, the sections have extra padding for this: --tone-gap in
// styles.css.) Full-bleed scenes without padding meet at their edge, where
// both fade to the same night colour.
const reach = (el, side) => (parseFloat(getComputedStyle(el)[side === 'top' ? 'paddingTop' : 'paddingBottom']) || 0) * 0.9;

const STEPS = 14;
const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

// Colour stops down the page, in document pixels: flat through each section,
// then an eased blend (many stops, so it has no visible start or end) into the
// next tone. A pinned section is measured by its pin spacer, which holds its
// full scroll length.
export function toneStops() {
  const scrollY = window.scrollY;
  const sections = [...document.querySelectorAll('[data-tone]')].map((el) => {
    const box = el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el;
    return { el, tone: TONES[el.dataset.tone], top: box.getBoundingClientRect().top + scrollY };
  });
  const total = document.documentElement.scrollHeight;
  const stops = [];
  sections.forEach((section, i) => {
    const prev = sections[i - 1];
    if (!prev) return stops.push({ at: 0, tone: section.tone });
    if (prev.tone === section.tone) return;
    const from = section.top - reach(prev.el, 'bottom');
    const to = Math.max(from, section.top + reach(section.el, 'top'));
    for (let step = 0; step <= STEPS; step++) {
      const t = ease(step / STEPS);
      stops.push({
        at: from + ((to - from) * step) / STEPS,
        tone: { base: mix(prev.tone.base, section.tone.base, t), glow: mix(prev.tone.glow, section.tone.glow, t) },
      });
    }
  });
  if (sections.length) stops.push({ at: total, tone: sections[sections.length - 1].tone });
  return { stops, total };
}

export function paintCssBackground() {
  const { stops } = toneStops();
  const gradient = stops.map(({ at, tone }) => `${tone.base} ${Math.round(at)}px`).join(', ');
  document.body.style.backgroundImage = `linear-gradient(to bottom, ${gradient})`;
  document.documentElement.classList.add('has-tones');
}

// A 2 x 1024 canvas: the left column is the base colour down the page, the
// right column the glow colour. Sampled by the atmosphere shader.
export function paintToneCanvas(canvas) {
  const { stops, total } = toneStops();
  canvas.width = 2;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  for (const [column, key] of [
    [0, 'base'],
    [1, 'glow'],
  ]) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    for (const { at, tone } of stops) gradient.addColorStop(Math.min(1, at / total), tone[key]);
    ctx.fillStyle = gradient;
    ctx.fillRect(column, 0, 1, canvas.height);
  }
  return total;
}
