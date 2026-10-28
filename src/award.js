import { copy } from './content.js';
import { currentLang, onLangChange } from './i18n.js';
import { scrollToTarget } from './motion.js';
import { duckSong, isPlaying, onSoundChange } from './sound.js';
import { tilt } from './tilt.js';

// The award film, as on the Zoltan site: her Best Beauty Salon moment at
// Stockholm Beauty Week, in a vertical frame that floats tilted in 3D beside
// its title. As the visitor scrolls the section pins, and the frame straightens
// and grows until it fills the screen (the theatre dark round it, the header
// stepping aside), and the film plays; outside that stretch of scroll it rests
// under its cover. Leaving it takes little scrolling, and the frame answers the
// first of it. It plays out loud when the site's sound is on, the song
// dipping under it. A second after it starts, a glowing hint at its foot says
// that scrolling on leaves it. Browsers only grant real fullscreen to a tap, so
// a button offers that, and a tap on the frame from further away brings the
// visitor to it.

const SOURCES = {
  sharp: new URL('./media/award-1080.mp4', import.meta.url).href,
  light: new URL('./media/award-720.mp4', import.meta.url).href,
};
// Progress through the pinned section.
const GROW = [0.1, 0.4]; // floating frame → full screen
const PLAY = [0.3, 0.99]; // the film plays inside this stretch
const WATCH = 0.45; // where a tap on the frame takes the visitor
// Scrolling on from there, the frame lets go at once (a little smaller, its
// corners rounding, the dark lifting), so the scroll is felt straight away.
const LEAVE = [0.47, 1];
const HINT_AFTER = 1; // seconds of playing before the scroll hint glows in

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

export function initAwardFilm(section, { signal, reduced }) {
  if (!section) return;
  const pin = section.querySelector('.film-pin');
  const frame = section.querySelector('.film-frame');
  const video = section.querySelector('.film-video');
  const soundButton = section.querySelector('.film-sound');
  const soundLabel = section.querySelector('.film-sound-label');
  const fullButton = section.querySelector('.film-expand');
  const replay = section.querySelector('.film-replay');
  const bar = section.querySelector('.film-bar i');
  const root = document.documentElement;
  const on = (target, type, fn, options = {}) => target.addEventListener(type, fn, { ...options, signal });

  let wantSound = isPlaying();
  let playing = false;
  let inWindow = false;
  let ended = false;

  // The source suits the screen, and is set only once the film is near.
  const load = () => {
    if (video.src) return;
    const sharp = innerWidth * (devicePixelRatio || 1) >= 900 && !navigator.connection?.saveData;
    video.src = sharp ? SOURCES.sharp : SOURCES.light;
    video.preload = 'auto';
  };
  const near = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && (load(), near.disconnect()), { rootMargin: '1400px 0px' });
  near.observe(section);
  signal.addEventListener('abort', () => near.disconnect());

  // iOS lets a film play out loud later once it was started inside a tap, so
  // the tap that turns the site's sound on starts it muted and stops it at once.
  on(window, 'bb:sound-gesture', () => {
    wantSound = true;
    load();
    video.muted = true;
    video.play()?.catch(() => {});
    video.pause();
  });
  // Nothing plays outside its stretch of scroll, whatever asked it to (with
  // reduced motion there is none: the visitor plays it with its controls).
  if (!reduced) on(video, 'play', () => !inWindow && video.pause());

  const words = () => copy[currentLang()].awardFilm;
  const showSound = () => {
    const audible = !video.muted;
    soundButton.setAttribute('aria-pressed', String(audible));
    soundButton.classList.toggle('is-muted', !audible);
    soundLabel.textContent = audible ? words().soundOn : words().soundOff;
  };
  const setMuted = (muted) => {
    video.muted = muted;
    duckSong(!muted && playing);
    showSound();
  };
  const stopLang = onLangChange(showSound);
  signal.addEventListener('abort', stopLang);
  onSoundChange((sound) => {
    if (signal.aborted) return;
    wantSound = sound;
    if (playing) setMuted(!sound);
  });
  showSound();

  const play = async () => {
    if (playing || ended) return;
    load();
    playing = true;
    video.muted = !wantSound;
    try {
      await video.play();
    } catch {
      // Not allowed out loud without a tap: it plays muted and the sound button calls.
      video.muted = true;
      try {
        await video.play();
      } catch {
        playing = false;
      }
    }
    duckSong(!video.muted && playing);
    showSound();
  };
  const pause = () => {
    if (!playing) return;
    playing = false;
    video.pause();
    duckSong(false);
  };

  on(soundButton, 'click', () => {
    setMuted(!video.muted);
    if (!video.muted && video.paused && !ended) video.play().catch(() => {});
  });
  on(fullButton, 'click', () => {
    if (video.webkitEnterFullscreen && !document.fullscreenEnabled) return video.webkitEnterFullscreen();
    const bezel = frame.querySelector('.film-bezel');
    (bezel.requestFullscreen?.() || bezel.webkitRequestFullscreen?.())?.catch?.(() => {});
  });
  on(replay, 'click', () => {
    ended = false;
    replay.hidden = true;
    video.currentTime = 0;
    playing = false;
    play();
  });
  on(video, 'ended', () => {
    ended = true;
    playing = false;
    duckSong(false);
    replay.hidden = false;
  });
  // Its cover lies over it until it is really rolling in its stretch, and the
  // hint glows in a second later.
  const rolling = (value) => {
    section.classList.toggle('is-rolling', value);
    if (!value) section.classList.remove('is-hinting');
  };
  on(video, 'playing', () => inWindow && rolling(true));
  on(video, 'timeupdate', () => {
    if (video.duration) bar.style.transform = `scaleX(${(video.currentTime / video.duration).toFixed(4)})`;
    if (inWindow && video.currentTime >= HINT_AFTER) section.classList.add('is-hinting');
  });

  // A tap on the playing film pauses or resumes it; from further away it
  // brings the visitor to it, the tap itself letting it play out loud.
  on(frame, 'click', (event) => {
    if (event.target.closest('button')) return;
    if (inWindow) return video.paused ? ((playing = false), play()) : pause();
    if (reduced) return;
    wantSound = true;
    load();
    video.muted = true;
    video.play()?.catch(() => {});
    video.pause();
    if (ended) {
      ended = false;
      replay.hidden = true;
      video.currentTime = 0;
    }
    const box = section.getBoundingClientRect();
    const y = scrollY + box.top + (box.height - pin.clientHeight) * WATCH;
    if (!scrollToTarget(y)) scrollTo({ top: y, behavior: 'smooth' });
  });

  signal.addEventListener('abort', () => {
    pause();
    root.classList.remove('film-full', 'film-on');
  });

  // With reduced motion: a still frame with the film's own controls, no takeover.
  if (reduced) {
    section.classList.add('is-static');
    video.controls = true;
    return;
  }

  // ---- The scroll choreography ----
  let vw = 0;
  let vh = 0;
  let rect = {};
  let last = 0;
  const pointer = { x: 0, y: 0 };
  on(window, 'pointermove', (event) => {
    pointer.x = event.clientX / innerWidth - 0.5;
    pointer.y = event.clientY / innerHeight - 0.5;
  }, { passive: true });

  const measure = () => {
    vw = pin.clientWidth;
    vh = pin.clientHeight;
    const phone = vw < 760;
    const h0 = phone ? Math.min(vh * 0.56, 560) : Math.min(vh * 0.74, 680);
    // Full size: the whole height, or on a phone the whole width, at 9:16, so
    // the marks burned in at its top edge are never cropped.
    const W = Math.min(vw, (vh * 9) / 16);
    rect = { h0, w0: (h0 * 9) / 16, x0: phone ? 0 : Math.min(vw * 0.2, 300), y0: phone ? vh * 0.12 : 0, W, H: (W * 16) / 9, edge: W >= vw - 1 };
    update(last);
  };

  const update = (p) => {
    last = p;
    const k = ease(clamp((p - GROW[0]) / (GROW[1] - GROW[0])));
    const away = clamp((p - LEAVE[0]) / (LEAVE[1] - LEAVE[0]));
    const float = 1 - k;
    const motion = tilt();
    const lx = motion.active ? motion.x : pointer.x;
    const ly = motion.active ? motion.y : pointer.y;
    const s = frame.style;
    s.setProperty('--w', `${lerp(rect.w0, rect.W, k).toFixed(1)}px`);
    s.setProperty('--h', `${lerp(rect.h0, rect.H, k).toFixed(1)}px`);
    s.setProperty('--x', `${lerp(rect.x0, 0, k).toFixed(1)}px`);
    s.setProperty('--y', `${lerp(rect.y0, 0, k).toFixed(1)}px`);
    s.setProperty('--ry', `${(float * (-16 + lx * 14)).toFixed(2)}deg`);
    s.setProperty('--rx', `${(float * (6 - ly * 8)).toFixed(2)}deg`);
    s.setProperty('--r', `${(lerp(30, rect.edge ? 0 : 18, k) + away * (rect.edge ? 26 : 8)).toFixed(1)}px`);
    s.setProperty('--pad', `${lerp(10, 0, k).toFixed(1)}px`);
    section.style.setProperty('--k', k.toFixed(3));
    section.style.setProperty('--away', away.toFixed(3));
    // Only while it holds the screen: halfway through letting go the header comes back.
    const full = k > 0.98 && away < 0.5;
    root.classList.toggle('film-full', full);
    section.classList.toggle('is-full', full);

    const nowIn = p >= PLAY[0] && p <= PLAY[1];
    if (nowIn !== inWindow) {
      inWindow = nowIn;
      if (nowIn) play();
      else {
        pause();
        rolling(false);
      }
    }
  };

  // A quiet float while the frame waits.
  const idle = () => {
    if (signal.aborted) return;
    requestAnimationFrame(idle);
    if (last >= GROW[1]) return;
    const box = section.getBoundingClientRect();
    if (box.top < innerHeight && box.bottom > 0) update(last);
  };
  requestAnimationFrame(idle);

  const onScroll = () => {
    const box = section.getBoundingClientRect();
    const total = box.height - vh;
    // While the film holds the screen, the booking bar steps aside for it.
    root.classList.toggle('film-on', box.top < vh * 0.6 && box.bottom > vh * 0.4);
    update(total > 0 ? clamp(-box.top / total) : 0);
  };
  on(window, 'scroll', onScroll, { passive: true });
  on(window, 'resize', measure);
  measure();
  onScroll();
}
