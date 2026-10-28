// Treatments: a native scroll-snap track (so swiping feels like the phone's own),
// with group chips that jump through it, a progress line and a gentle fan of
// the upcoming cards.

import { chime, whoosh } from './sound.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initCarousel(root, chipsRoot, { signal } = {}) {
  if (!root) return;
  const track = root.querySelector('[data-track]');
  const cards = [...track.querySelectorAll('[data-card]')];
  const chips = [...chipsRoot.querySelectorAll('[data-group]')];
  const progress = document.querySelector('[data-progress]');
  const prev = document.querySelector('[data-prev]');
  const next = document.querySelector('[data-next]');

  const padding = () => parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0;
  const step = () => cards[1].offsetLeft - cards[0].offsetLeft;
  const goTo = (card) =>
    track.scrollTo({ left: card.offsetLeft - padding(), behavior: reducedMotion ? 'auto' : 'smooth' });

  let frame = 0;
  let lastActive = 0;
  let lastGroup = null;
  // A tapped chip holds its group while the track glides there, so the figure
  // doesn't flicker through the groups in between.
  let pinned = null;
  let unpin = 0;
  const update = () => {
    frame = 0;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    const at = (scrollLeft + padding() - cards[0].offsetLeft) / step();
    const active = Math.min(cards.length - 1, Math.max(0, Math.round(at)));
    // A soft tick of crystal as each card settles into place.
    if (active !== lastActive) {
      lastActive = active;
      chime(0.3);
    }

    progress.style.transform = `scaleX(${Math.min(1, (scrollLeft + clientWidth) / scrollWidth)})`;
    const group = pinned ?? cards[active].dataset.cardGroup;
    // The 3D figure (src/sculpture) follows the group in view.
    if (group !== lastGroup) {
      lastGroup = group;
      document.dispatchEvent(new CustomEvent('treatmentgroup', { detail: Number(group) }));
    }
    for (const chip of chips) chip.setAttribute('aria-pressed', String(chip.dataset.group === group));
    prev.disabled = scrollLeft <= 2;
    next.disabled = scrollLeft + clientWidth >= scrollWidth - 2;

    if (reducedMotion) return;
    cards.forEach((card, i) => {
      // 0 for the card at the snap point, 1 for the next one, and so on.
      const d = Math.max(-1, Math.min(3, i - at));
      const ahead = Math.max(0, d);
      card.style.transform = `translateY(${ahead * 10}px) rotate(${ahead * 1.6}deg) scale(${1 - Math.abs(d) * 0.045})`;
    });
  };
  const schedule = () => (frame ||= requestAnimationFrame(update));

  track.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { signal });
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      pinned = chip.dataset.group;
      clearTimeout(unpin);
      unpin = setTimeout(() => {
        pinned = null;
        schedule();
      }, 900);
      if (chip.getAttribute('aria-pressed') !== 'true') whoosh(0.45);
      goTo(cards.find((card) => card.dataset.cardGroup === chip.dataset.group));
      schedule();
    });
  }
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reducedMotion ? 'auto' : 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reducedMotion ? 'auto' : 'smooth' }));
  update();
  if (!reducedMotion) nudge(track, signal);
}

// The first time the cards come into view they lean to the left and spring
// back, saying "there is more this way"; a smaller second nudge follows if
// nobody has swiped yet. The track itself moves (not its scroll position), so
// scroll snapping never fights it.
function nudge(track, signal) {
  let touched = false;
  for (const type of ['pointerdown', 'touchstart', 'wheel']) {
    track.addEventListener(type, () => (touched = true), { passive: true, once: true });
  }

  const lean = (distance) =>
    track.animate(
      [
        { transform: 'translateX(0)', easing: 'cubic-bezier(0.45, 0, 0.2, 1)' },
        { transform: `translateX(${-distance}px)`, offset: 0.4, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
        { transform: `translateX(${distance * 0.12}px)`, offset: 0.76, easing: 'ease-in-out' },
        { transform: 'translateX(0)' },
      ],
      { duration: 1600 },
    );

  const seen = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      seen.disconnect();
      setTimeout(() => {
        if (touched) return;
        chime(0.25);
        lean(Math.min(96, track.clientWidth * 0.22));
        setTimeout(() => !touched && lean(Math.min(48, track.clientWidth * 0.11)), 3600);
      }, 450);
    },
    { threshold: 0.6 },
  );
  seen.observe(track);
  signal?.addEventListener('abort', () => seen.disconnect());
}
