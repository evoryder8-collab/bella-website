import { copy } from './content.js';
import { currentLang, initI18n } from './i18n.js';
import { initMotion, lockScroll, mountMotion, playIntro } from './motion.js';
import { initCarousel } from './carousel.js';
import { initDeck } from './deck.js';
import { drawLaurels } from './laurel.js';
import { initMagazine } from './magazine.js';
import { initMap } from './map.js';
import { initPortal } from './portal.js';
import { playPremiere } from './premiere.js';
import { initRouter } from './router.js';
import { isPlaying, onSoundChange, setMuted, soundPreference, startSound } from './sound.js';
import { paintCssBackground } from './tones.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

paintCssBackground();
window.addEventListener('load', paintCssBackground);
new ResizeObserver(() => paintCssBackground()).observe(document.body);
initI18n();
initMenu();
initHeader();
initBookBar();
document.querySelector('[data-year]').textContent = new Date().getFullYear();
initSocials();

if (!reducedMotion) {
  initMotion();
  loadWorld();
}

// Each page's own pieces start here, and stop when the router swaps the page
// for another; with reduced motion, links simply load the next page.
if (reducedMotion) mountPage();
else initRouter({ mount: mountPage });

function mountPage({ entering = false } = {}) {
  const controller = new AbortController();
  const { signal } = controller;
  initCarousel(document.querySelector('[data-carousel]'), document.querySelector('[data-chips]'), { signal });
  initDeck(document.querySelector('[data-deck]'), { signal });
  initMap(document.querySelector('[data-map]'), document.querySelectorAll('[data-studio]'), { signal });
  drawLaurels(document.querySelector('main'));
  let stopMotion = null;
  if (!reducedMotion) {
    stopMotion = mountMotion();
    initMagazine(document.querySelector('[data-magazine]'), { signal });
    // Arriving on the home page from another page: its hero plays its entrance.
    if (entering) playIntro();
  }
  return () => {
    controller.abort();
    stopMotion?.();
  };
}

// The page waits behind the portal on a first visit; its entrance plays once
// the visitor is in.
const portalOpen = document.documentElement.classList.contains('portal-open');
if (portalOpen) lockScroll(true);
initSoundToggle(portalOpen);
initPortal({
  onEnter: ({ fromPortal }) => {
    if (reducedMotion || !fromPortal) {
      document.querySelector('[data-premiere]')?.remove();
      lockScroll(false);
      if (!reducedMotion) playIntro();
      return;
    }
    // Straight from the portal: "Bella Bayar presents", then the dark opens on the hero.
    playPremiere({
      onReveal: () => {
        lockScroll(false);
        playIntro({ fromDark: true });
      },
    });
  },
});

function initSoundToggle(portalOpen) {
  const toggle = document.querySelector('[data-sound-toggle]');
  const render = (on) => {
    toggle.setAttribute('aria-pressed', String(on));
    toggle.classList.toggle('is-playing', on);
  };
  onSoundChange(render);
  toggle.addEventListener('click', () => (isPlaying() ? setMuted(true) : startSound()));

  // Browsers only start audio after a gesture, so a returning visitor who chose
  // sound hears it from their first tap or key press (unless that tap is the toggle).
  if (portalOpen || soundPreference() !== 'on') return;
  render(true);
  const arm = (event) => {
    if (event.target.closest?.('[data-sound-toggle]')) return;
    window.removeEventListener('pointerdown', arm);
    window.removeEventListener('keydown', arm);
    startSound();
  };
  window.addEventListener('pointerdown', arm);
  window.addEventListener('keydown', arm);
}

// The floating social gems arrive only once the visitor starts scrolling (a
// swipe of a finger is enough), so the first screen stays uncluttered.
function initSocials() {
  const dock = document.querySelector('[data-socials]');
  if (!dock) return;
  const start = window.scrollY;
  const summon = () => {
    if (Math.abs(window.scrollY - start) < 24) return;
    dock.classList.add('is-summoned');
    window.removeEventListener('scroll', summon);
  };
  window.addEventListener('scroll', summon, { passive: true });
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

// The phone booking bar appears once the hero (which has its own button) is
// mostly gone, steps aside while you read downwards, and comes back when you
// scroll up or pause.
function initBookBar() {
  const bar = document.querySelector('[data-book-bar]');
  let lastY = window.scrollY;
  let reading = false;
  let pause = 0;
  const show = () => bar.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.6 && !reading);
  const update = () => {
    const y = window.scrollY;
    if (y > lastY + 3) reading = true;
    else if (y < lastY - 3) reading = false;
    lastY = y;
    clearTimeout(pause);
    pause = setTimeout(() => {
      reading = false;
      show();
    }, 900);
    show();
  };
  window.addEventListener('scroll', update, { passive: true });
  show();
}

// The 3D world (three.js) loads after the page is up, so it never delays the
// first paint; until then, and without WebGL, the page is complete without it.
function loadWorld() {
  if (navigator.connection?.saveData) return;
  const start = () =>
    import('./world/index.js')
      .then(({ initWorld }) => initWorld())
      .catch((error) => console.warn('3D world unavailable:', error));
  const whenIdle = () => ('requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 2500 }) : setTimeout(start, 600));
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
}
