import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { onLangChange } from './i18n.js';

gsap.registerPlugin(ScrollTrigger);

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
  lenis = new Lenis({ lerp: 0.09 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  heroIntro();
  textReveals();
  imageReveals();
  parallax();
  footerMark();

  document.documentElement.classList.add('motion-ready');

  // Copy length changes with language and web fonts, so trigger positions move.
  onLangChange(() => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

function heroIntro() {
  const frame = document.querySelector('.hero-media .frame');
  const tl = gsap.timeline({ delay: 0.15, defaults: { ease: 'expo.out' } });

  tl.fromTo(frame, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.7, ease: 'expo.inOut' })
    .fromTo(frame.querySelector('img'), { scale: 1.4 }, { scale: 1.14, duration: 2.4 }, 0.1)
    .fromTo('.hero-media', { '--outline': 0 }, { '--outline': 1, duration: 1.6 }, 1)
    // y: 0 clears the pixel offset GSAP reads from the CSS starting transform.
    .fromTo('[data-hero-line]', { y: 0, yPercent: 110 }, { y: 0, yPercent: 0, duration: 1.5, stagger: 0.12 }, 0.35)
    .fromTo('[data-hero-fade]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.3, stagger: 0.1 }, 0.75);
}

function textReveals() {
  gsap.set('[data-reveal]', { opacity: 0, y: 36 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: (els) =>
      gsap.to(els, { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out', stagger: 0.09, overwrite: true }),
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

function footerMark() {
  gsap.fromTo(
    '.footer-mark',
    { xPercent: 6 },
    { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'bottom bottom', scrub: true } },
  );
}
