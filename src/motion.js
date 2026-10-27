import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { copy } from './content.js';
import { currentLang, onLangChange } from './i18n.js';
import { lookup } from './i18n-lookup.js';

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

export function initMotion() {
  // Lenis smooths wheel scrolling only; touch keeps the phone's native momentum.
  lenis = new Lenis({ lerp: 0.09 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  heroIntro();
  approachScene();
  textReveals();
  imageReveals();
  parallax();
  liftLines();
  counters();
  stars();
  pressTilt();
  quoteWords();
  timeline();
  footerMark();

  document.documentElement.classList.add('motion-ready');

  // Copy length changes with language and web fonts, so trigger positions move.
  onLangChange(() => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

function heroIntro() {
  const tl = gsap.timeline({ delay: 0.1, defaults: { ease: 'expo.out' } });
  tl.fromTo('.hero-media', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' })
    .fromTo('[data-hero-frame]', { scale: 1.25 }, { scale: 1, duration: 2.6 }, 0.1)
    // y: 0 clears the pixel offset GSAP reads from the CSS starting transform.
    .fromTo('[data-hero-line]', { y: 0, yPercent: 110 }, { y: 0, yPercent: 0, duration: 1.4, stagger: 0.1 }, 0.55)
    .fromTo('[data-hero-fade]', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.08 }, 0.85);

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
      .fromTo(panel, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.inOut' }, '<0.1')
      .fromTo(part(panel, 'img'), { scale: 1.35 }, { scale: 1.02, duration: 1.3 }, '<')
      .fromTo(part(panel, '.approach-word'), { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }, '<0.45')
      .fromTo(part(panel, '.approach-text'), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '<0.15')
      .to({}, { duration: 0.4 });
  });
  tl.fromTo('[data-approach-bar]', { scaleX: 0 }, { scaleX: 1, duration: tl.duration() }, 0);
}

function textReveals() {
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
    tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' });
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

// The gua sha strokes over the method photo draw themselves upward as you scroll.
function liftLines() {
  const paths = gsap.utils.toArray('[data-lift]');
  if (!paths.length) return;
  gsap.fromTo(
    paths,
    { strokeDashoffset: 1 },
    {
      strokeDashoffset: 0,
      ease: 'none',
      stagger: 0.25,
      scrollTrigger: { trigger: paths[0].closest('figure'), start: 'top 70%', end: 'bottom 45%', scrub: true },
    },
  );
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
  gsap.fromTo(
    '[data-stars]',
    { width: '0%' },
    { width: '98%', duration: 2, ease: 'expo.out', scrollTrigger: { trigger: '[data-stars]', start: 'top 85%', once: true } },
  );
}

function pressTilt() {
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
  onLangChange(build);
}

function timeline() {
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
    { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'bottom bottom', scrub: true } },
  );
}
