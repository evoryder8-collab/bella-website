import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { copy } from './content.js';
import { currentLang, setLang } from './i18n.js';
import { lookup } from './i18n-lookup.js';
import { jumpTo, jumpToTop, scrollToTarget } from './motion.js';
import { whoosh } from './sound.js';

// Moving between pages without reloading, so the 3D world, the stone and the
// music carry on. A satin curtain sweeps up over the page with the next page's
// name; behind it that page's HTML is fetched (every page is a real file,
// prerendered at build time, so each also works on its own), its <main> is
// swapped in and its scenes start; then the curtain lifts away. In-page links
// (#metoden) glide there instead. The header, menu and footer stay.

// The page each folder holds, for the curtain's title.
const PAGES = { '': 'home', om: 'about', behandlingar: 'treatments', akademi: 'academy', kontakt: 'contact' };
const NAMES = { home: 'nav.home', about: 'nav.about', treatments: 'nav.treatments', academy: 'nav.academy', contact: 'nav.contact' };

const pageOf = (url) => PAGES[url.pathname.split('/').filter(Boolean).pop()] ?? (url.pathname.endsWith('/') ? 'home' : null);

// mount() starts the current page and returns a function that stops it.
export function initRouter({ mount }) {
  let unmount = mount();
  let current = location.pathname;
  let busy = false;
  history.scrollRestoration = 'manual';

  // Shared links were written relative to the first page; pin them to full
  // URLs so they keep pointing at the right place once the address changes.
  for (const link of document.querySelectorAll('a[data-nav]')) link.setAttribute('href', link.href);
  markCurrent();

  const pages = new Map();
  const fetchPage = (url) => {
    if (!pages.has(url.pathname)) {
      const request = fetch(url.pathname).then((response) => {
        if (!response.ok) throw new Error(`${response.status} ${url.pathname}`);
        return response.text();
      });
      request.catch(() => pages.delete(url.pathname));
      pages.set(url.pathname, request);
    }
    return pages.get(url.pathname);
  };

  const curtain = createCurtain();

  const go = async (url, { push = true } = {}) => {
    if (busy) return;
    busy = true;
    try {
      const html = fetchPage(url);
      const page = pageOf(url);
      await curtain.cover(page === 'home' ? 'BE <em>BEAUTY</em>' : lookup(copy[currentLang()], NAMES[page]) ?? '');
      const doc = new DOMParser().parseFromString(await html, 'text/html');
      unmount();
      swap(doc, url);
      if (push) history.pushState(null, '', url.href);
      current = url.pathname;
      setLang(currentLang(), { persist: false });
      const target = url.hash && document.querySelector(url.hash);
      target ? jumpTo(target) : jumpToTop();
      unmount = mount({ entering: true });
      markCurrent();
      window.dispatchEvent(new CustomEvent('bb:page'));
      ScrollTrigger.refresh();
      await curtain.lift();
    } catch (error) {
      console.warn('Page change failed, loading normally:', error);
      location.href = url.href;
    } finally {
      busy = false;
    }
  };

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;

    if (url.pathname === location.pathname) {
      // Same page: glide to the anchor, or to the top.
      if (!url.hash && !link.hasAttribute('data-nav')) return;
      const target = !url.hash || url.hash === '#top' ? document.body : document.querySelector(url.hash);
      if (!target || !scrollToTarget(target)) return;
      event.preventDefault();
      history.replaceState(null, '', target === document.body ? location.pathname + location.search : url.hash);
      return;
    }
    if (!link.hasAttribute('data-nav') || !pageOf(url)) return;
    event.preventDefault();
    go(url);
  });

  window.addEventListener('popstate', () => {
    const url = new URL(location.href);
    if (url.pathname !== current) go(url, { push: false });
  });

  // Start fetching a page as soon as a finger or pointer reaches its link.
  const prefetch = (event) => {
    const link = event.target.closest?.('a[data-nav]');
    if (link) fetchPage(new URL(link.href)).catch(() => {});
  };
  document.addEventListener('pointerover', prefetch, { passive: true });
  document.addEventListener('touchstart', prefetch, { passive: true });
}

// Replaces <main> and the head's title and description keys with the new page's.
function swap(doc, url) {
  const next = doc.querySelector('main');
  // Its own relative paths (images, links) were written for its address.
  for (const el of next.querySelectorAll('[src], [href]')) {
    for (const attr of ['src', 'href']) {
      const value = el.getAttribute(attr);
      if (value && !/^(#|[a-z][a-z0-9+.-]*:)/i.test(value)) el.setAttribute(attr, new URL(value, url).href);
    }
  }
  document.querySelector('main').replaceWith(document.adoptNode(next));
  document.querySelector('title').dataset.i18n = doc.querySelector('title').dataset.i18n;
  document.querySelector('meta[name="description"]').dataset.i18nAttr = doc.querySelector('meta[name="description"]').dataset.i18nAttr;
}

// The nav link for the current page reads as current.
function markCurrent() {
  for (const link of document.querySelectorAll('a[data-nav]')) {
    const url = new URL(link.href);
    if (url.pathname === location.pathname && !url.hash) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

// A satin curtain: its top edge sweeps up with the middle leading, it holds
// with the page's name while the next page swaps in, then its bottom edge
// lifts away the same way.
function createCurtain() {
  const el = document.querySelector('[data-curtain]');
  const path = el.querySelector('[data-curtain-path]');
  const title = el.querySelector('[data-curtain-title]');
  const edge = { top: 100, topBend: 100, bottom: 100, bottomBend: 100 };
  const draw = () =>
    path.setAttribute('d', `M0 ${edge.top} Q50 ${edge.topBend} 100 ${edge.top} L100 ${edge.bottom} Q50 ${edge.bottomBend} 0 ${edge.bottom} Z`);

  return {
    cover(name) {
      title.innerHTML = name;
      Object.assign(edge, { top: 100, topBend: 100, bottom: 100, bottomBend: 100 });
      draw();
      el.classList.add('is-active');
      whoosh(0.6);
      return gsap
        .timeline({ onUpdate: draw })
        .to(edge, { topBend: -12, duration: 0.55, ease: 'power2.in' }, 0)
        .to(edge, { top: 0, duration: 0.75, ease: 'power3.inOut' }, 0)
        .to(edge, { topBend: 0, duration: 0.25, ease: 'power2.out' }, 0.55)
        .fromTo(title, { opacity: 0, y: 24, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6, ease: 'expo.out' }, 0.4)
        .then();
    },
    lift() {
      return gsap
        .timeline({ onUpdate: draw, onComplete: () => el.classList.remove('is-active') })
        .to(title, { opacity: 0, y: -18, filter: 'blur(6px)', duration: 0.4, ease: 'power2.in' }, 0.1)
        .to(edge, { bottomBend: -12, duration: 0.6, ease: 'power2.in' }, 0.2)
        .to(edge, { bottom: 0, duration: 0.85, ease: 'power3.inOut' }, 0.2)
        .to(edge, { bottomBend: 0, duration: 0.3, ease: 'power2.out' }, 0.8)
        .then();
    },
  };
}
