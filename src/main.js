import { initAwardFilm } from './award.js';
import { copy } from './content.js';
import { currentLang, initI18n } from './i18n.js';
import { initMotion, lockScroll, mountMotion, playIntro } from './motion.js';
import { initCarousel } from './carousel.js';
import { initDeck } from './deck.js';
import { drawLaurels } from './laurel.js';
import { initLinkInBio } from './linkinbio.js';
import { initMagazine } from './magazine.js';
import { initMap } from './map.js';
import { initPortal } from './portal.js';
import { playPremiere } from './premiere.js';
import { initTilt } from './tilt.js';
import { initRouter } from './router.js';
import { greet, isPlaying, onSoundChange, setMuted, soundPreference, startSound, tap } from './sound.js';
import { paintCssBackground } from './tones.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

paintCssBackground();
window.addEventListener('load', paintCssBackground);
new ResizeObserver(() => paintCssBackground()).observe(document.body);
initI18n();
initMenu();
initHeader();
initSatin();
initBookBar();
document.querySelector('[data-year]').textContent = new Date().getFullYear();
initSocials();
// Every button, and every link dressed as one, answers with a soft click.
document.addEventListener('click', (event) => event.target.closest?.('button, .btn, .social, .leave-go') && tap());

if (!reducedMotion) {
  initMotion();
  loadWorld();
  initTilt();
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
  initAwardFilm(document.querySelector('[data-award]'), { signal, reduced: reducedMotion });
  // The 3D treatment figures, each in its own sharp canvas, loaded ahead of time.
  const stages = document.querySelectorAll('[data-figure-stage]');
  if (stages.length && !reducedMotion) {
    import('./sculpture/index.js')
      .then(({ mountSculptures }) => !signal.aborted && mountSculptures(stages, { signal }))
      .catch((error) => console.warn('Treatment figures unavailable:', error));
  }
  drawLaurels(document.querySelector('main'));
  initLinkInBio(document.querySelector('main'), { signal });
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
    // Straight from the ritual, with sound: Bella says hello as her name appears.
    if (fromPortal) greet(currentLang(), { delay: 1.1 });
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
    // As they arrive, the gems become 3D gua sha stones (three.js loads only now).
    import('./socials3d.js')
      .then(({ initSocialStones }) => initSocialStones(dock))
      .catch(() => {});
  };
  window.addEventListener('scroll', summon, { passive: true });
  initLeave(dock);
}

// A gem never leaves the site on its own: a small card asks first, rising
// from the gem that was tapped, with Continue (the real link) and Cancel.
function initLeave(dock) {
  const card = document.querySelector('[data-leave]');
  if (!card?.showModal) return;
  const go = card.querySelector('[data-leave-go]');
  dock.addEventListener('click', (event) => {
    const gem = event.target.closest('.social');
    if (!gem) return;
    event.preventDefault();
    const network = gem.dataset.link;
    card.querySelector('[data-leave-title]').textContent = network === 'facebook' ? 'Facebook' : 'Instagram';
    card.querySelector('[data-leave-text]').textContent = copy[currentLang()].ui.leave[network];
    card.querySelector('[data-leave-icon]').innerHTML = gem.querySelector('svg')?.outerHTML ?? '';
    go.href = gem.href;
    const from = gem.getBoundingClientRect();
    card.style.setProperty('--from-x', `${Math.round(from.left + from.width / 2 - innerWidth / 2)}px`);
    card.style.setProperty('--from-y', `${Math.round(from.top + from.height / 2 - innerHeight / 2)}px`);
    card.showModal();
    go.focus();
  });
  go.addEventListener('click', () => card.close());
  // A tap on the dimmed page around the card cancels too.
  card.addEventListener('click', (event) => event.target === card && card.close());
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
    // The wordmark's foil catches the light differently as the page moves.
    if (!reducedMotion) header.style.setProperty('--sheen', `${(22 + 32 * Math.sin(y / 520)).toFixed(1)}%`);
    lastY = y;
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

// The header's satin catches the light: its sheen leans towards a nearby
// pointer, and blooms where a finger presses before easing back.
function initSatin() {
  const header = document.querySelector('[data-header]');
  const cloths = header.querySelectorAll('.sound-toggle, .lang-switch');
  const lean = (x, y) => {
    for (const el of cloths) {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--px', `${Math.max(-10, Math.min(110, ((x - r.left) / r.width) * 100)).toFixed(1)}%`);
      el.style.setProperty('--py', `${Math.max(-10, Math.min(110, ((y - r.top) / r.height) * 100)).toFixed(1)}%`);
    }
  };
  const rest = () => cloths.forEach((el) => el.style.removeProperty('--px') || el.style.removeProperty('--py'));
  header.addEventListener('pointermove', (event) => event.pointerType === 'mouse' && lean(event.clientX, event.clientY), { passive: true });
  header.addEventListener('pointerleave', rest);
  header.addEventListener(
    'pointerdown',
    (event) => {
      lean(event.clientX, event.clientY);
      if (event.pointerType !== 'mouse') setTimeout(rest, 900);
    },
    { passive: true },
  );
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
