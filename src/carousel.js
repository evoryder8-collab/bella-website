// Treatments: a native scroll-snap track (so swiping feels like the phone's own),
// with group chips that jump through it, a progress line and a gentle fan of
// the upcoming cards.

import { chime } from './sound.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initCarousel(root, chipsRoot) {
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
    const group = cards[active].dataset.cardGroup;
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
  window.addEventListener('resize', schedule);
  for (const chip of chips) {
    chip.addEventListener('click', () => goTo(cards.find((card) => card.dataset.cardGroup === chip.dataset.group)));
  }
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reducedMotion ? 'auto' : 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reducedMotion ? 'auto' : 'smooth' }));
  update();
}
