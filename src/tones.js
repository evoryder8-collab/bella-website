// The page's colour story. Every section carries data-tone="light|rose|dark";
// neighbouring tones blend over part of a screen, so the page never changes
// colour at a hard edge. The same stops paint the CSS background (always) and
// the WebGL atmosphere (src/world/atmosphere.js) when it runs.

export const TONES = {
  light: { base: '#f6e9e4', glow: '#ffffff' },
  rose: { base: '#efd6cf', glow: '#f7c3bd' },
  dark: { base: '#24141a', glow: '#8e4651' },
};

// Half of each blend: most of a section's top padding, so the colour has fully
// changed before any copy starts and light text never sits on a light background.
const blendWidth = () => {
  const section = document.querySelector('.section');
  return Math.max(60, (section ? parseFloat(getComputedStyle(section).paddingTop) : 100) * 0.85);
};

// Sections in page order with their top edge in document pixels. A pinned
// section is measured by its pin spacer, which holds its full scroll length.
export function toneStops() {
  const scrollY = window.scrollY;
  const sections = [...document.querySelectorAll('[data-tone]')].map((el) => {
    const box = el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el;
    return { tone: TONES[el.dataset.tone], top: box.getBoundingClientRect().top + scrollY };
  });
  const total = document.documentElement.scrollHeight;
  const blend = blendWidth();
  const stops = [];
  sections.forEach((section, i) => {
    const next = sections[i + 1];
    const start = i === 0 ? 0 : section.top + blend;
    const end = next ? next.top - blend : total;
    stops.push({ at: start, tone: section.tone }, { at: Math.max(start, end), tone: section.tone });
  });
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
