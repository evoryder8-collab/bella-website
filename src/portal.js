import { copy, LANGS } from './content.js';
import { setLang } from './i18n.js';
import { declineSound, startSound } from './sound.js';

// The first-visit portal: "Sound on?" first, then the language, detected from
// the device and picked automatically after a five-second countdown (which can
// be paused). The head script decides whether it opens (first visit or ?intro);
// a ?lang= link skips the language step. Entering stores the visit, so
// returning visitors go straight in.

const ENTERED_KEY = 'bebeauty-entered';
const COUNTDOWN_MS = 5000;

function remember() {
  try {
    localStorage.setItem(ENTERED_KEY, '1');
  } catch {
    // Without storage the portal simply greets them again next time.
  }
}

// Swedish for anyone whose device prefers it, English for everyone else.
function detectLang() {
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language || ''];
  return preferred.some((tag) => tag.toLowerCase().startsWith('sv')) ? 'sv' : 'en';
}

const pulse = () => window.dispatchEvent(new CustomEvent('bb:pulse'));

export function initPortal({ onEnter }) {
  const html = document.documentElement;
  const portal = document.querySelector('[data-portal]');
  if (!html.classList.contains('portal-open')) {
    portal.remove();
    onEnter({ fromPortal: false });
    return;
  }

  const fromUrl = new URLSearchParams(location.search).get('lang');
  const linked = LANGS.includes(fromUrl) ? fromUrl : null;
  const detected = linked || detectLang();
  const text = copy[detected].portal;
  portal.lang = detected;
  for (const el of portal.querySelectorAll('[data-portal-text]')) el.textContent = text[el.dataset.portalText];

  const step = (name) => portal.querySelector(`[data-step="${name}"]`);
  const visibleStep = () => portal.querySelector('.portal-step:not([hidden])');
  requestAnimationFrame(() => portal.classList.add('is-ready'));
  portal.querySelector('.portal-yes').focus({ preventScroll: true });

  // Keep keyboard focus inside the portal while it is open.
  portal.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = [...visibleStep().querySelectorAll('button')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Fade one step out, then bring the next in (CSS staggers its children).
  const swap = (from, next) => {
    from.classList.add('is-leaving');
    setTimeout(() => {
      from.hidden = true;
      from.classList.remove('is-leaving');
      next();
    }, 550);
  };

  let entered = false;
  const enter = (lang) => {
    if (entered) return;
    entered = true;
    setLang(lang);
    remember();
    pulse();
    // Keep the portal on screen while it dissolves; the page and the world
    // (stone, light) start their entrance underneath at the same moment.
    portal.classList.add('is-leaving');
    html.classList.remove('portal-open', 'portal-picking');
    window.scrollTo(0, 0);
    onEnter({ fromPortal: true });
    setTimeout(() => portal.remove(), 1400);
  };

  const languageStep = () => {
    const lang = step('lang');
    lang.hidden = false;
    // The options sit in the middle of the screen; the stone rises above them.
    html.classList.add('portal-picking');
    const options = [...lang.querySelectorAll('[data-pick]')];
    const auto = options.find((option) => option.dataset.pick === detected);
    const bar = auto.querySelector('.portal-progress');
    const count = lang.querySelector('[data-portal-count]');
    const pause = lang.querySelector('[data-portal-pause]');
    const pauseLabel = lang.querySelector('[data-portal-pause-label]');
    lang.querySelector('[data-portal-detected]').textContent = text.detected;
    auto.classList.add('is-detected');
    auto.focus({ preventScroll: true });

    let remaining = COUNTDOWN_MS;
    let paused = false;
    let last = performance.now();
    let shown = -1;
    const render = () => {
      const seconds = Math.ceil(remaining / 1000);
      if (seconds !== shown || paused) count.textContent = paused ? text.paused : text.auto.replace('{n}', seconds);
      shown = paused ? -1 : seconds;
      bar.style.transform = `scaleX(${1 - remaining / COUNTDOWN_MS})`;
      pause.setAttribute('aria-pressed', String(paused));
      pauseLabel.textContent = paused ? text.resume : text.pause;
    };
    const tick = (now) => {
      if (entered) return;
      // Capped per frame, so time spent in a background tab doesn't count down.
      if (!paused) remaining -= Math.min(100, now - last);
      last = now;
      if (remaining <= 0) return enter(detected);
      render();
      requestAnimationFrame(tick);
    };
    render();
    requestAnimationFrame(tick);

    pause.addEventListener('click', () => {
      paused = !paused;
      render();
    });
    for (const option of options) option.addEventListener('click', () => enter(option.dataset.pick));
  };

  for (const button of portal.querySelectorAll('[data-sound-choice]')) {
    button.addEventListener('click', () => {
      if (button.dataset.soundChoice === 'on') {
        startSound();
      } else {
        declineSound();
      }
      pulse();
      swap(step('sound'), () => (linked ? enter(linked) : languageStep()));
    });
  }
}
