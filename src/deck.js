// Reviews as a stack of cards: drag the top card sideways (or use the buttons)
// and it flies off and slides in at the back. Without this script the cards
// are a plain swipeable row.

import { whoosh } from './sound.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const THROW = 90; // px of drag before a release counts as a throw

export function initDeck(root) {
  if (!root) return;
  const cards = [...root.querySelectorAll('[data-deck-card]')];
  const index = root.querySelector('[data-deck-index]');
  const order = cards.map((_, i) => i);
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

  root.classList.add('is-ready');

  const layout = () => {
    order.forEach((cardIndex, depth) => {
      const card = cards[cardIndex];
      const d = Math.min(depth, 3);
      const tilt = depth === 0 ? 0 : (depth % 2 ? 1 : -1) * 2.4;
      card.style.zIndex = String(cards.length - depth);
      card.style.transition = reducedMotion ? 'none' : `transform 0.7s ${ease}, opacity 0.5s ${ease}`;
      card.style.transform = `translate3d(0, ${d * 16}px, 0) scale(${1 - d * 0.05}) rotate(${tilt}deg)`;
      card.style.opacity = depth > 3 ? '0' : '1';
      card.setAttribute('aria-hidden', String(depth !== 0));
    });
    index.textContent = String(order[0] + 1).padStart(2, '0');
  };

  const advance = (direction) => {
    if (direction > 0) order.push(order.shift());
    else order.unshift(order.pop());
    layout();
  };

  // Fling the top card off to one side, then send it to the back of the stack.
  const toss = (card, direction) => {
    whoosh(0.8);
    if (reducedMotion) return advance(1);
    card.style.transition = `transform 0.45s ${ease}`;
    card.style.transform = `translate3d(${direction * 120}%, -4%, 0) rotate(${direction * 14}deg)`;
    setTimeout(() => advance(1), 260);
  };

  let drag = null;
  root.addEventListener('pointerdown', (event) => {
    const card = event.target.closest('[data-deck-card]');
    if (!card || cards[order[0]] !== card || event.button > 0) return;
    drag = { card, id: event.pointerId, x: event.clientX, dx: 0 };
    card.setPointerCapture(event.pointerId);
    card.style.transition = 'none';
  });
  root.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    drag.dx = event.clientX - drag.x;
    drag.card.style.transform = `translate3d(${drag.dx}px, 0, 0) rotate(${drag.dx * 0.06}deg)`;
  });
  const release = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const { card, dx } = drag;
    drag = null;
    if (Math.abs(dx) > THROW) toss(card, Math.sign(dx));
    else layout();
  };
  root.addEventListener('pointerup', release);
  // A vertical swipe hands the gesture to page scrolling, which cancels the pointer.
  root.addEventListener('pointercancel', release);

  root.querySelector('[data-deck-next]').addEventListener('click', () => toss(cards[order[0]], 1));
  root.querySelector('[data-deck-prev]').addEventListener('click', () => advance(-1));
  layout();
}
