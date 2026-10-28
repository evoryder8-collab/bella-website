import { copy, LANGS } from './content.js';
import { savedLang, setLang } from './i18n.js';
import { laurel } from './laurel.js';
import { declineSound, prepareGreeting, startSound, tap, whoosh } from './sound.js';

// The first visits' ritual, in three steps round the rose-quartz stone of the
// 3D world, which carries the house's name engraved on it (src/world/plate.js)
// and grows from an emblem above the questions to the centre of the last step:
//   1 · Sound on? A large "Yes, with sound" (recommended) and a smaller "No
//       thanks". That tap is the gesture browsers ask for before sound can start.
//   2 · The language. The visitor's own (the device's, a ?lang= link's or the
//       one they chose before) is lit and chosen after a five-second countdown.
//   3 · The stone, with what BE BEAUTY is in a line and her award, loading by
//       itself: a ring of light closes round it, then the site opens.
// The head script decides whether it opens (the first three visits, or
// ?intro); each entry is counted. On the home page the header's wordmark
// opens it again.

const ENTERED_KEY = 'bebeauty-entered'; // how many times the visitor has entered (and src/partials/head.html)
const LOAD_MS = 1600; // the last step's ring of light closes round the stone in this long
const RIPPLE_MS = 850; // then the ripples spread before the site opens
const WAIT = 5000; // the language is chosen for the visitor after this long

function remember() {
  try {
    localStorage.setItem(ENTERED_KEY, String((parseInt(localStorage.getItem(ENTERED_KEY), 10) || 0) + 1));
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
  const suggested = lang;
  // ?intro has done its work; the address goes back to the page's own.
  if (params.has('intro')) {
    params.delete('intro');
    const query = params.toString();
    history.replaceState(history.state, '', location.pathname + (query ? `?${query}` : '') + location.hash);
  }

  const text = () => ({ ...copy[lang].portal, award: copy[lang].premiere.award, awardKicker: copy[lang].premiere.awardKicker });
  const letter = () => {
    const words = text();
    portal.lang = lang;
    for (const el of portal.querySelectorAll('[data-portal-text]')) el.textContent = words[el.dataset.portalText];
    for (const el of portal.querySelectorAll('[data-portal-html]')) el.innerHTML = words[el.dataset.portalHtml];
    for (const el of portal.querySelectorAll('[data-portal-label]')) el.setAttribute('aria-label', words[el.dataset.portalLabel]);
  };
  letter();
  portal.querySelector('[data-laurel]').innerHTML = laurel('ritual-gold');

  // ---- The steps: one question on the screen at a time ----
  const panels = [...portal.querySelectorAll('[data-step-panel]')];
  let step = 'sound';
  const show = (name) => {
    step = name;
    portal.dataset.step = name;
    for (const panel of panels) panel.hidden = panel.dataset.stepPanel !== name;
    portal.setAttribute('aria-labelledby', `portal-${name}-title`);
    const first = portal.querySelector(`[data-step-panel="${name}"] button`);
    (first ?? portal).focus({ preventScroll: true });
  };
  // The question on screen falls away, then the next one rises.
  const go = (name, then) => {
    if (reduced) return show(name), then?.();
    portal.classList.add('is-stepping');
    setTimeout(() => {
      portal.classList.remove('is-stepping');
      show(name);
      then?.();
    }, 380);
  };

  requestAnimationFrame(() => portal.classList.add('is-ready'));
  // The dialog itself takes focus, so no button wears a ring before it is chosen.
  portal.focus({ preventScroll: true });

  // Keep keyboard focus inside the ritual while it is open.
  portal.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = [...portal.querySelectorAll('button')].filter((button) => button.tabIndex >= 0 && !button.closest('[hidden]'));
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

  // ---- 1 · Sound. The answer is the gesture browsers ask for before sound can start. ----
  for (const option of portal.querySelectorAll('[data-sound]')) {
    option.addEventListener('click', () => {
      if (step !== 'sound') return;
      if (option.dataset.sound === 'on') {
        startSound();
        tap();
      } else declineSound();
      go('lang', startCountdown);
    });
  }

  // ---- 2 · Language. The visitor's own is lit, filling as a five-second
  // countdown runs, and chosen when it ends; touching a choice or the keyboard
  // pauses it, and time in a hidden tab doesn't count. ----
  const choices = [...portal.querySelectorAll('[data-pick]')];
  const lit = choices.find((choice) => choice.dataset.pick === suggested);
  const digit = portal.querySelector('[data-countdown-n]');
  const arc = portal.querySelector('.ritual-clock-fill');
  const label = portal.querySelector('[data-countdown-label]');
  const toggle = portal.querySelector('[data-countdown-toggle]');
  let counting = false;
  let paused = false;
  let remaining = WAIT;
  let previous = 0;
  let frame = 0;
  const paintClock = () => {
    digit.textContent = String(Math.ceil(remaining / 1000));
    arc.style.strokeDashoffset = String(1 - remaining / WAIT);
    lit.style.setProperty('--p', (1 - remaining / WAIT).toFixed(3));
  };
  const paint = () => {
    const words = text();
    paintClock();
    label.textContent = paused ? words.paused : words.continuing;
    toggle.textContent = paused ? words.resume : words.pause;
    toggle.setAttribute('aria-pressed', String(paused));
    portal.classList.toggle('is-paused', paused);
  };
  const tick = (now) => {
    if (!counting) return;
    if (!paused && !document.hidden && previous) remaining = Math.max(0, remaining - (now - previous));
    previous = now;
    paintClock();
    if (remaining === 0) return choose(suggested);
    frame = requestAnimationFrame(tick);
  };
  function startCountdown() {
    lit.classList.add('is-suggested');
    counting = true;
    paint();
    frame = requestAnimationFrame(tick);
  }
  const pause = () => {
    if (!counting || paused) return;
    paused = true;
    paint();
  };
  toggle.addEventListener('click', () => {
    paused = !paused;
    previous = 0;
    paint();
    tap();
  });
  // A touch that starts just before the end still wins, even if it lifts later.
  for (const choice of choices) {
    choice.addEventListener('pointerdown', pause);
    choice.addEventListener('click', () => choose(choice.dataset.pick));
  }
  portal.addEventListener('keydown', (event) => step === 'lang' && (event.key === 'Tab' || event.key.startsWith('Arrow')) && pause());
  document.addEventListener('visibilitychange', () => (previous = 0));

  let chosen = false;
  function choose(pick) {
    if (chosen) return;
    chosen = true;
    counting = false;
    cancelAnimationFrame(frame);
    tap();
    lang = pick;
    setLang(lang);
    prepareGreeting(lang);
    go('stone', () => {
      letter();
      load();
    });
  }

  // ---- 3 · The stone. It loads by itself: the stone grows to the centre, the
  // ring of light closes slowly round it, and the site opens, the ripples
  // spreading as it does. ----
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
    if (entered) return;
    entered = true;
    remember();
    if (reduced) return leave();
    html.classList.add('portal-touched');
    portal.classList.add('is-entering');
    pulse();
    whoosh(0.85, { long: true, peakIn: 0.7 });
    setTimeout(leave, RIPPLE_MS);
  };
  function load() {
    if (reduced) return enter();
    portal.classList.add('is-loading');
    setTimeout(enter, LOAD_MS);
  }
}
