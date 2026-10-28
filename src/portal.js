import { copy, LANGS } from './content.js';
import { savedLang, setLang } from './i18n.js';
import { laurel } from './laurel.js';
import { declineSound, prepareGreeting, startSound, whoosh } from './sound.js';

// The first-visit ritual: what BE BEAUTY is, said plainly, round the rose-quartz
// stone of the 3D world. Touching the stone starts the sound (that touch is the
// gesture browsers ask for), draws a ring of light round it and sends ripples
// out as the site opens; "Enter in silence" goes in quietly. The language
// starts as the device's (or a ?lang= link's) and the words change in place
// when the other is chosen. The head script decides whether it opens (first
// visit or ?intro); entering stores the visit, so returning visitors go
// straight in. On the home page the header's wordmark opens it again.

const ENTERED_KEY = 'bebeauty-entered';
const RING_MS = 700; // the ring of light takes this long to close round the stone
const RIPPLE_MS = 850; // then the ripples spread before the site opens

function remember() {
  try {
    localStorage.setItem(ENTERED_KEY, '1');
  } catch {
    // Without storage the ritual simply greets them again next time.
  }
}

// Swedish for anyone whose device prefers it, English for everyone else.
function detectLang() {
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language || ''];
  return preferred.some((tag) => tag.toLowerCase().startsWith('sv')) ? 'sv' : 'en';
}

const pulse = () => window.dispatchEvent(new CustomEvent('bb:pulse'));

// The wordmark, clicked on the home page, reloads it as a first visit sees it
// (elsewhere it simply leads home).
function replayFromWordmark() {
  document.querySelector('.wordmark')?.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (document.querySelector('main')?.dataset.page !== 'home') return;
    event.preventDefault();
    const url = new URL(location.href);
    url.hash = '';
    url.searchParams.set('intro', '');
    location.assign(url);
  });
}

export function initPortal({ onEnter }) {
  const html = document.documentElement;
  const portal = document.querySelector('[data-portal]');
  replayFromWordmark();
  if (!html.classList.contains('portal-open')) {
    portal.remove();
    onEnter({ fromPortal: false });
    return;
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get('lang');
  // A returning visitor sees it in the language they chose before.
  let lang = LANGS.includes(fromUrl) ? fromUrl : savedLang() ?? detectLang();
  // ?intro has done its work; the address goes back to the page's own.
  if (params.has('intro')) {
    params.delete('intro');
    const query = params.toString();
    history.replaceState(history.state, '', location.pathname + (query ? `?${query}` : '') + location.hash);
  }

  const letter = () => {
    const text = { ...copy[lang].portal, award: copy[lang].premiere.award, awardKicker: copy[lang].premiere.awardKicker };
    portal.lang = lang;
    for (const el of portal.querySelectorAll('[data-portal-text]')) el.textContent = text[el.dataset.portalText];
    for (const el of portal.querySelectorAll('[data-portal-html]')) el.innerHTML = text[el.dataset.portalHtml];
    for (const el of portal.querySelectorAll('[data-portal-label]')) el.setAttribute('aria-label', text[el.dataset.portalLabel]);
    for (const option of portal.querySelectorAll('[data-pick]')) option.setAttribute('aria-checked', String(option.dataset.pick === lang));
  };
  letter();
  portal.querySelector('[data-laurel]').innerHTML = laurel('ritual-gold');

  requestAnimationFrame(() => portal.classList.add('is-ready'));
  // The dialog itself takes focus, so no button wears a ring before it is chosen.
  portal.focus({ preventScroll: true });

  // Keep keyboard focus inside the ritual while it is open.
  portal.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = [...portal.querySelectorAll('button')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === portal)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  for (const option of portal.querySelectorAll('[data-pick]')) {
    option.addEventListener('click', () => {
      if (option.dataset.pick === lang) return;
      lang = option.dataset.pick;
      portal.classList.add('is-relettering');
      setTimeout(() => {
        letter();
        portal.classList.remove('is-relettering');
      }, 260);
    });
  }

  let entered = false;
  const leave = () => {
    // Keep the ritual on screen while it dissolves; the page and the world
    // (the stone flying to Bella, the light) start their entrance underneath.
    portal.classList.add('is-leaving');
    html.classList.remove('portal-open', 'portal-touched');
    window.scrollTo(0, 0);
    onEnter({ fromPortal: true });
    setTimeout(() => portal.remove(), 1300);
  };
  const enter = () => {
    setLang(lang);
    remember();
    if (reduced) return leave();
    portal.classList.add('is-entering');
    pulse();
    whoosh(0.85, { long: true, peakIn: 0.7 });
    setTimeout(leave, RIPPLE_MS);
  };

  // Touching the stone: the ring of light closes round it while it is held,
  // and a tap is enough, the ring closing on its own.
  const stone = portal.querySelector('[data-portal-stone]');
  let pressed = 0;
  const press = () => {
    if (entered) return;
    pressed ||= performance.now();
    portal.classList.add('is-pressing');
    html.classList.add('portal-touched');
  };
  const release = () => {
    if (entered) return;
    pressed = 0;
    portal.classList.remove('is-pressing');
    html.classList.remove('portal-touched');
  };
  stone.addEventListener('pointerdown', press);
  stone.addEventListener('pointerleave', release);
  stone.addEventListener('pointercancel', release);
  stone.addEventListener('click', () => {
    if (entered) return;
    entered = true;
    startSound();
    prepareGreeting(lang);
    press();
    const held = performance.now() - pressed;
    setTimeout(enter, reduced ? 0 : Math.max(0, RING_MS - held));
  });

  portal.querySelector('[data-portal-silence]').addEventListener('click', () => {
    if (entered) return;
    entered = true;
    declineSound();
    enter();
  });
}
