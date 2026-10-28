import gsap from 'gsap';
import { laurel } from './laurel.js';
import { chime, whoosh } from './sound.js';

// Between the first-visit portal and the page. The screen goes dark, with dust
// drifting in a beam of light; "Bella Bayar" writes itself letter by letter in
// champagne light, a glint runs across it and "presents" follows. The name
// gives way to a laurel wreath that grows around 2026, over "Best Beauty
// Salon", Stockholm Beauty Week, with the jury's words. Then the dark opens like
// an iris from her face: the portrait comes first, then the BE BEAUTY title
// (onReveal starts the hero's own entrance). A tap or key fast-forwards it.

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
  const wreath = stage.querySelector('[data-premiere-laurel]');
  wreath.innerHTML = laurel('premiere-gold');
  const award = stage.querySelector('[data-premiere-award]');
  const awardText = award.querySelectorAll('p, .premiere-seal-year');
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
    .call(() => chime(0.45, 1174.66), null, 1.95)
    // The name lifts away; the laurel grows around the award.
    .to(letters, { opacity: 0, yPercent: -35, filter: 'blur(12px)', duration: 0.9, ease: 'power2.in', stagger: { each: 0.035, from: 'center' } }, 3.1)
    .to(['[data-premiere-line]', '[data-premiere-presents]'], { opacity: 0, y: -10, duration: 0.7, ease: 'power2.in' }, 3.15)
    .set(award, { opacity: 1 }, 3.7)
    .fromTo(wreath.querySelectorAll('.laurel-stem'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut' }, 3.7)
    .fromTo(
      wreath.querySelectorAll('.laurel-leaf'),
      { scale: 0, opacity: 0, transformOrigin: '0% 50%' },
      // Both branches grow from the stem's foot up at the same time (19 leaves each).
      { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(2)', stagger: (i) => (i % 19) * 0.05 },
      3.85,
    )
    .call(() => chime(0.55, 739.99), null, 3.9)
    .fromTo(awardText, { opacity: 0, y: 14, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.3, ease: 'expo.out', stagger: 0.22 }, 4.15)
    .call(() => chime(0.5, 987.77), null, 4.4)
    .to(award, { opacity: 0, y: -14, filter: 'blur(10px)', duration: 0.8, ease: 'power2.in' }, 6.3)
    // The dark opens on her portrait.
    .call(() => whoosh(0.7), null, 6.75)
    .call(onReveal, null, 6.75)
    .to(stage, { '--glow': 1, duration: 0.6, ease: 'power1.out' }, 6.75)
    .to(stage, { '--iris': reach, duration: 2.4, ease: 'power2.inOut' }, 6.8);

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
