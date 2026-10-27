import { copy, DEFAULT_LANG, LANGS } from './content.js';
import { lookup } from './i18n-lookup.js';
import { links } from './links.js';

const STORAGE_KEY = 'bebeauty-lang';
const listeners = new Set();
let current = DEFAULT_LANG;

function stored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function store(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage blocked (private mode etc.): the choice just isn't remembered.
  }
}

// ?lang=en in the URL wins, so an English link can be shared directly.
export function initialLang() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(fromUrl)) return fromUrl;
  const saved = stored();
  return LANGS.includes(saved) ? saved : DEFAULT_LANG;
}

export function currentLang() {
  return current;
}

export function onLangChange(fn) {
  listeners.add(fn);
}

export function setLang(lang, { persist = true } = {}) {
  if (!LANGS.includes(lang)) return;
  current = lang;
  const strings = copy[lang];
  const hrefs = links(lang);

  document.documentElement.lang = lang;
  document.title = strings.meta.title;

  for (const el of document.querySelectorAll('[data-i18n]')) {
    const value = lookup(strings, el.dataset.i18n);
    if (value !== undefined) el.innerHTML = value;
  }

  for (const el of document.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(',')) {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      const value = lookup(strings, key);
      if (value !== undefined) el.setAttribute(attr, value);
    }
  }

  // Email subjects depend on language.
  for (const el of document.querySelectorAll('[data-link]')) el.href = hrefs[el.dataset.link];

  for (const btn of document.querySelectorAll('[data-lang]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
  }

  if (persist) store(lang);
  for (const fn of listeners) fn(lang);
}

export function initI18n() {
  for (const btn of document.querySelectorAll('[data-lang]')) {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  }
  const lang = initialLang();
  if (lang !== DEFAULT_LANG) setLang(lang, { persist: false });
}
