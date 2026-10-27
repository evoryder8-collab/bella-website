import { copy } from './content.js';
import { currentLang, initI18n } from './i18n.js';
import { initMotion, lockScroll, scrollToTarget } from './motion.js';
import { initMap } from './map.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

initI18n();
initMenu();
initHeader();
initFab();
initAnchors();
initMap(document.querySelector('[data-map]'));
document.querySelector('[data-year]').textContent = new Date().getFullYear();

if (!reducedMotion) initMotion();

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
  matchMedia('(min-width: 1081px)').addEventListener('change', (event) => event.matches && setOpen(false));
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

function initFab() {
  const fab = document.querySelector('[data-fab]');
  const hero = document.querySelector('.hero');
  const contact = document.querySelector('#kontakt');
  const state = { pastHero: false, atContact: false };

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === hero) state.pastHero = !entry.isIntersecting;
      if (entry.target === contact) state.atContact = entry.isIntersecting;
    }
    fab.classList.toggle('is-visible', state.pastHero && !state.atContact);
  });
  observer.observe(hero);
  observer.observe(contact);
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
