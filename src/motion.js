import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { copy } from './content.js';
import { currentLang, onLangChange } from './i18n.js';
import { lookup } from './i18n-lookup.js';
import { scrollRush } from './sound.js';
import { paintCssBackground } from './tones.js';

gsap.registerPlugin(ScrollTrigger);
// Phone address bars resize the viewport while scrolling; don't re-measure pins for that.
ScrollTrigger.config({ ignoreMobileResize: true });

let lenis = null;

// Smooth-scrolls to an element (or the top for <body>). Returns false when smooth
// scrolling is off, so the caller can fall back to the browser's own jump.
export function scrollToTarget(target) {
  if (!lenis) return false;
  lenis.scrollTo(target === document.body ? 0 : target, { duration: 1.6 });
  return true;
}

export function lockScroll(locked) {
  if (lenis) locked ? lenis.stop() : lenis.start();
}

// Jumps straight to the top, or to an element (behind the page curtain).
export function jumpToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

export function jumpTo(target) {
  if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
  else target.scrollIntoView();
}

export function initMotion() {
  // Lenis drives touch scrolling too (syncTouch). Native touch scrolling runs on
  // its own thread, a frame ahead of the WebGL world, which made the backdrop
  // and photos trail the text; with Lenis both move in the same frame. Sideways
  // scrollers (the treatment cards) keep their own native scrolling.
  lenis = new Lenis({ lerp: 0.09, syncTouch: true, syncTouchLerp: 0.085, touchInertiaExponent: 1.6, allowNestedScroll: true });
  lenis.on('scroll', ScrollTrigger.update);
  // How fast the page is moving, for the whoosh of a strong fling (a jump to
  // another place, like a page change, is not a fling).
  let lastY = 0;
  let lastT = 0;
  lenis.on('scroll', ({ scroll }) => {
    const t = performance.now();
    const moved = Math.abs(scroll - lastY);
    if (lastT && moved < innerHeight * 2) scrollRush((moved / Math.max(t - lastT, 8)) * 1000);
    lastY = scroll;
    lastT = t;
  });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // The footer is shared by every page, so its motion is set up once.
  footerMark();

  document.documentElement.classList.add('motion-ready');

  // Copy length changes with language and web fonts, so trigger positions move,
  // and with them where the section tones blend.
  ScrollTrigger.addEventListener('refresh', paintCssBackground);
  onLangChange(() => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

// The scroll scenes of the page in <main>. Each one skips itself when its
// elements aren't on this page. Returns a function that undoes them all, for
// when the page is swapped for another (src/router.js).
export function mountMotion() {
  const cleanups = [];
  const context = gsap.context(() => {
    heroSink();
    approachScene();
    textReveals();
    imageReveals();
    parallax();
    counters();
    stars();
    pressTilt();
    cleanups.push(quoteWords());
    timeline();
  });
  return () => {
    cleanups.forEach((cleanup) => cleanup?.());
    context.revert();
  };
}

// Reveals animate --reveal from 0 to 1. CSS turns it into a clip for plain
// images; src/world/media.js turns the same value into a liquid dissolve.
const reveal = (target, vars) => gsap.fromTo(target, { '--reveal': 0 }, { '--reveal': 1, ...vars });

// The hero's entrance, played once the visitor is in. After the premiere
// ("Bella Bayar presents") it is slower: the portrait comes out of the dark
// first and the title follows.
export function playIntro({ fromDark = false } = {}) {
  if (!document.querySelector('.hero-media')) return;
  const pace = fromDark ? 1.45 : 1;
  const tl = gsap.timeline({ delay: 0.1, defaults: { ease: 'expo.out' } });
  tl.add(reveal('.hero-media', { duration: 1.8 * pace, ease: 'power2.inOut' }))
    .fromTo('[data-hero-frame]', { scale: fromDark ? 1.4 : 1.25 }, { scale: 1, duration: 2.6 * pace }, 0.1)
    // y: 0 clears the pixel offset GSAP reads from the CSS starting transform.
    .fromTo('[data-hero-line]', { y: 0, yPercent: 110 }, { y: 0, yPercent: 0, duration: 1.4, stagger: 0.1 }, fromDark ? 1.5 : 0.55)
    .fromTo('[data-hero-fade]', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.08 }, fromDark ? 1.85 : 0.85);
}

function heroSink() {
  if (!document.querySelector('.hero-media')) return;
  // Hidden until the intro plays. Set inline, because the WebGL portrait reads
  // --reveal from the element's own style.
  gsap.set('.hero-media', { '--reveal': 0 });
  // Scrolling away, the portrait sinks a little behind the copy.
  gsap.to('[data-hero-frame]', {
    yPercent: 10,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
}

// Beauty. Balance. Glow. One pinned screen: each panel wipes up over the last.
function approachScene() {
  const stage = document.querySelector('[data-approach-stage]');
  if (!stage) return;
  const panels = gsap.utils.toArray('[data-approach-panel]', stage);
  const part = (panel, selector) => panel.querySelector(selector);

  gsap.fromTo(
    [part(panels[0], '.approach-word'), part(panels[0], '.approach-text')],
    { opacity: 0, yPercent: 40 },
    {
      opacity: 1,
      yPercent: 0,
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.12,
      scrollTrigger: { trigger: stage, start: 'top 65%', once: true },
    },
  );

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: stage,
      start: 'top top',
      end: () => `+=${window.innerHeight * 2.6}`,
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  tl.fromTo(part(panels[0], 'img'), { scale: 1.12 }, { scale: 1, duration: 0.8 });
  panels.slice(1).forEach((panel, i) => {
    const previous = panels[i];
    tl.to(part(previous, '.approach-copy'), { yPercent: -40, opacity: 0, duration: 0.5 })
      .fromTo(panel, { '--reveal': 0 }, { '--reveal': 1, duration: 1, ease: 'power1.inOut' }, '<0.1')
      .fromTo(part(panel, 'img'), { scale: 1.35 }, { scale: 1.02, duration: 1.3 }, '<')
      .fromTo([part(panel, '.approach-index'), part(panel, '.approach-word')], { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }, '<0.45')
      .fromTo(part(panel, '.approach-text'), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '<0.15')
      .to({}, { duration: 0.4 });
  });
  tl.fromTo('[data-approach-bar]', { scaleX: 0 }, { scaleX: 1, duration: tl.duration() }, 0);
  // The progress line bows out at the end, so no line crosses into the next section.
  tl.to('.approach-progress', { opacity: 0, duration: 0.35 }, tl.duration() - 0.35);
}

function textReveals() {
  if (!document.querySelector('[data-reveal]')) return;
  gsap.set('[data-reveal]', { opacity: 0, y: 32 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: (els) =>
      gsap.to(els, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, overwrite: true }),
  });
}

function imageReveals() {
  for (const el of gsap.utils.toArray('[data-reveal-image]')) {
    const img = el.querySelector('img');
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    tl.add(reveal(el, { duration: 1.9, ease: 'power2.inOut' }));
    if (img) tl.fromTo(img, { scale: 1.35 }, { scale: 1.14, duration: 2.2, ease: 'expo.out' }, 0.1);
  }
}

function parallax() {
  for (const img of gsap.utils.toArray('[data-parallax]')) {
    gsap.set(img, { scale: 1.14 });
    gsap.fromTo(
      img,
      { yPercent: -6 },
      {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  }
}

function counters() {
  for (const el of gsap.utils.toArray('[data-count]')) {
    const target = Number(el.dataset.count);
    const decimals = (el.dataset.count.split('.')[1] || '').length;
    const state = { n: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        // Keep whatever follows the number in the current language ("10+").
        const suffix = el.textContent.replace(/^[\d.,\s]+/, '');
        const format = new Intl.NumberFormat(currentLang() === 'sv' ? 'sv-SE' : 'en-GB', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
        gsap.fromTo(
          state,
          { n: 0 },
          {
            n: target,
            duration: 2.2,
            ease: 'expo.out',
            onUpdate: () => (el.textContent = format.format(state.n) + suffix),
            onComplete: () => (el.innerHTML = lookup(copy[currentLang()], el.dataset.i18n)),
          },
        );
      },
    });
  }
}

function stars() {
  if (!document.querySelector('[data-stars]')) return;
  gsap.fromTo(
    '[data-stars]',
    { width: '0%' },
    { width: '98%', duration: 2, ease: 'expo.out', scrollTrigger: { trigger: '[data-stars]', start: 'top 85%', once: true } },
  );
}

function pressTilt() {
  if (!document.querySelector('[data-tilt]')) return;
  gsap.fromTo(
    '[data-tilt]',
    { rotate: 16, yPercent: 30 },
    {
      rotate: 4,
      yPercent: 0,
      ease: 'none',
      scrollTrigger: { trigger: '.proof-images', start: 'top bottom', end: 'center 55%', scrub: true },
    },
  );
}

// Bella's quote lights up word by word as it scrolls through the screen.
function quoteWords() {
  const el = document.querySelector('[data-scrub-words]');
  if (!el) return;
  let tween = null;

  const build = () => {
    tween?.scrollTrigger?.kill();
    tween?.kill();
    const words = el.textContent.trim().split(/\s+/);
    el.replaceChildren(
      ...words.flatMap((word, i) => {
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = word;
        return i ? [' ', span] : [span];
      }),
    );
    tween = gsap.fromTo(
      el.querySelectorAll('.word'),
      { opacity: 0.16 },
      { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } },
    );
  };

  build();
  const stop = onLangChange(build);
  return () => {
    stop();
    tween?.scrollTrigger?.kill();
    tween?.kill();
  };
}

function timeline() {
  if (!document.querySelector('[data-timeline]')) return;
  gsap.fromTo(
    '[data-timeline]',
    { '--progress': 0 },
    { '--progress': 1, ease: 'none', scrollTrigger: { trigger: '[data-timeline]', start: 'top 75%', end: 'bottom 55%', scrub: true } },
  );
}

function footerMark() {
  gsap.fromTo(
    '.footer-mark',
    { xPercent: 8 },
    // Measured after the page's own scenes (which can add pinned scroll length above it).
    { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'bottom bottom', scrub: true, refreshPriority: -1 } },
  );
}
