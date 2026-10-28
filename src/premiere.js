import gsap from 'gsap';
import { chime, whoosh } from './sound.js';

// Between the first-visit portal and the page. The screen goes dark, with dust
// drifting in a beam of light; "Bella Bayar" writes itself letter by letter in
// champagne light, a glint runs across it and "presents" follows. Then the name
// lifts away and the dark opens like an iris from her face: the portrait comes
// first, then the BE BEAUTY title (onReveal starts the hero's own entrance).
// A tap or key fast-forwards it.

export function playPremiere({ onReveal }) {
  const html = document.documentElement;
  const stage = document.querySelector('[data-premiere]');
  if (!stage) {
    onReveal();
    return;
  }
  const name = stage.querySelector('[data-premiere-name]');
  const letters = [...name.textContent].map((char) => {
    const span = document.createElement('span');
    span.className = 'premiere-letter';
    span.textContent = char === ' ' ? ' ' : char;
    return span;
  });
  name.replaceChildren(...letters);
  html.classList.add('is-premiere');
  const stopDust = dust(stage.querySelector('[data-premiere-dust]'));

  // The iris opens from Bella's face in the hero portrait.
  const face = document.querySelector('.hero-img').getBoundingClientRect();
  const ix = face.left + face.width * 0.5;
  const iy = Math.max(face.top + face.height * 0.3, innerHeight * 0.22);
  const reach = Math.hypot(Math.max(ix, innerWidth - ix), Math.max(iy, innerHeight - iy)) + 0.32 * Math.max(innerWidth, innerHeight);
  gsap.set(stage, { '--ix': `${ix}px`, '--iy': `${iy}px`, '--iris': 0, '--glow': 0 });

  const tl = gsap.timeline({
    onComplete: () => {
      stopDust();
      html.classList.remove('is-premiere');
      stage.remove();
    },
  });
  tl.fromTo(stage, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.out' }, 0)
    .fromTo(
      letters,
      { opacity: 0, yPercent: 45, scale: 1.18, filter: 'blur(14px)' },
      { opacity: 1, yPercent: 0, scale: 1, filter: 'blur(0px)', duration: 1.5, ease: 'expo.out', stagger: 0.075 },
      0.55,
    )
    .call(() => chime(0.7, 587.33), null, 0.7)
    .call(() => chime(0.5, 880), null, 1.25)
    .add(() => name.classList.add('is-lit'), 1.6)
    .fromTo('[data-premiere-line]', { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'expo.inOut' }, 1.5)
    .fromTo(
      '[data-premiere-presents]',
      { opacity: 0, letterSpacing: '1.3em', y: 8 },
      { opacity: 1, letterSpacing: '0.62em', y: 0, duration: 1.4, ease: 'expo.out' },
      1.8,
    )
    .call(() => chime(0.45, 1174.66), null, 2)
    // The name lifts away, and the dark opens on her portrait.
    .to(letters, { opacity: 0, yPercent: -35, filter: 'blur(12px)', duration: 0.9, ease: 'power2.in', stagger: { each: 0.035, from: 'center' } }, 3.5)
    .to(['[data-premiere-line]', '[data-premiere-presents]'], { opacity: 0, y: -10, duration: 0.7, ease: 'power2.in' }, 3.55)
    .call(() => whoosh(0.7), null, 3.9)
    .call(onReveal, null, 3.9)
    .to(stage, { '--glow': 1, duration: 0.6, ease: 'power1.out' }, 3.9)
    .to(stage, { '--iris': reach, duration: 2.4, ease: 'power2.inOut' }, 3.95);

  // Development only: pause and seek it, to inspect a moment.
  if (import.meta.env.DEV) window.__premiere = tl;

  const skip = () => tl.progress() < 0.95 && tl.timeScale(4);
  stage.addEventListener('pointerdown', skip, { once: true });
  window.addEventListener('keydown', skip, { once: true });
}

// Dust motes drifting up through a soft beam of light from above.
function dust(canvas) {
  const g = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const resize = () => {
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
  };
  resize();
  window.addEventListener('resize', resize);
  const motes = Array.from({ length: 80 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.4 + Math.random() ** 2 * 1.8,
    rise: 0.006 + Math.random() * 0.02,
    phase: Math.random() * Math.PI * 2,
  }));
  let frame = 0;
  let last = performance.now();
  let t = 0;
  const draw = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    const { width: w, height: h } = canvas;
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      m.y -= m.rise * dt;
      if (m.y < -0.03) m.y = 1.03;
      const x = m.x + Math.sin(t * 0.25 + m.phase) * 0.012;
      // Brighter inside the beam, which widens as it falls.
      const beam = Math.exp(-((x - 0.5) ** 2) / (0.012 + 0.05 * m.y));
      const alpha = (0.1 + 0.65 * beam) * (0.65 + 0.35 * Math.sin(t * 1.7 + m.phase * 3));
      g.fillStyle = `rgb(255 218 204 / ${alpha.toFixed(3)})`;
      g.beginPath();
      g.arc(x * w, m.y * h, m.r * dpr, 0, Math.PI * 2);
      g.fill();
    }
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
  };
}
