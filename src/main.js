import { copy } from './content.js';
import { currentLang, initI18n } from './i18n.js';
import { initMotion, lockScroll, scrollToTarget } from './motion.js';
import { initCarousel } from './carousel.js';
import { initDeck } from './deck.js';
import { initMap } from './map.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

initI18n();
initMenu();
initHeader();
initBookBar();
initAnchors();
initCarousel(document.querySelector('[data-carousel]'), document.querySelector('[data-chips]'));
initDeck(document.querySelector('[data-deck]'));
initMap(document.querySelector('[data-map]'), document.querySelectorAll('[data-studio]'));
document.querySelector('[data-year]').textContent = new Date().getFullYear();

if (!reducedMotion) {
  initMotion();
  initSculpt();
}

function initMenu() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const label = toggle.querySelector('[data-i18n]');

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    lockScroll(open);
    // Point the screen-reader label at the matching key so a language switch keeps it right.
    label.dataset.i18n = open ? 'ui.close' : 'ui.menu';
    label.textContent = copy[currentLang()].ui[open ? 'close' : 'menu'];
    if (open) menu.querySelector('a').focus();
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  // Capture phase: close (and unlock scrolling) before the anchor handler scrolls.
  menu.addEventListener(
    'click',
    (event) => {
      if (event.target.closest('a')) setOpen(false);
    },
    true,
  );
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
  matchMedia('(min-width: 1080px)').addEventListener('change', (event) => event.matches && setOpen(false));
}

function initHeader() {
  const header = document.querySelector('[data-header]');
  let lastY = window.scrollY;

  const update = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    // Hide while scrolling down past the hero, show again on any scroll up.
    const menuOpen = document.body.classList.contains('menu-open');
    header.classList.toggle('is-hidden', !menuOpen && y > lastY && y > window.innerHeight * 0.6);
    lastY = y;
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

// The phone booking bar slides up once the hero (which has its own button) is mostly gone.
function initBookBar() {
  const bar = document.querySelector('[data-book-bar]');
  const update = () => bar.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.6);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initAnchors() {
  for (const link of document.querySelectorAll('a[href^="#"]')) {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href');
      const target = id === '#top' ? document.body : document.querySelector(id);
      if (!target || !scrollToTarget(target)) return;
      event.preventDefault();
      history.replaceState(null, '', id === '#top' ? location.pathname + location.search : id);
    });
  }
}

// three.js and the shader load after the page is up, so they never delay the first paint.
function initSculpt() {
  if (navigator.connection?.saveData) return;
  const hero = document.querySelector('[data-hero]');
  const start = () =>
    import('./hero-sculpt.js')
      .then(({ initHeroSculpt }) => initHeroSculpt(hero))
      .catch((error) => console.warn('Hero effect unavailable:', error));
  const whenIdle = () => ('requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 2500 }) : setTimeout(start, 600));
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
}
