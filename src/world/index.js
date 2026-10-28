import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DirectionalLight, Group, MathUtils, NeutralToneMapping, PerspectiveCamera, PMREMGenerator, Scene, WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createAtmosphere } from './atmosphere.js';
import { createMedia } from './media.js';
import { createPearls } from './pearls.js';
import { createQuartz } from './quartz.js';
import { createRibbon } from './ribbon.js';
import { chime, setBrightness, setScrollEnergy } from '../sound.js';

// One fixed WebGL world behind the whole page. The camera never moves; things
// anchored to the document (ribbon, pearls) sit in a group that slides up with
// the scroll, the photos are re-laid over their DOM boxes every frame, and the
// quartz stone flies between chapters in screen space.

const FOV = 35;
const CAMERA_Z = 8;
const STONE_Z = 1.9;

const pointer = { x: -1, y: -1, dx: 0, dy: 0, moved: -1e9 };

function watchPointer() {
  const move = (x, y) => {
    if (pointer.x >= 0) {
      pointer.dx += x - pointer.x;
      pointer.dy += y - pointer.y;
    }
    pointer.x = x;
    pointer.y = y;
    pointer.moved = performance.now();
  };
  window.addEventListener('pointermove', (e) => e.pointerType !== 'touch' && move(e.clientX, e.clientY), { passive: true });
  window.addEventListener(
    'touchstart',
    (e) => {
      pointer.x = -1;
      move(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: true },
  );
  window.addEventListener('touchmove', (e) => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
}

function quality() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
  return {
    coarse,
    // Phones draw at up to 2x for crisp sculptures; a slow device steps itself down (below).
    dpr: Math.min(window.devicePixelRatio, lowEnd ? 1 : coarse ? 2 : 1.75),
    transmission: lowEnd ? 0 : coarse ? 0.5 : 0.7,
    pearls: lowEnd ? 80 : coarse ? 140 : 230,
    step: coarse ? 26 : 18,
  };
}

export function initWorld() {
  const q = quality();
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch {
    return false;
  }
  renderer.setPixelRatio(q.dpr);
  renderer.toneMapping = NeutralToneMapping;
  renderer.transmissionResolutionScale = q.transmission || 0.5;
  const canvas = renderer.domElement;
  canvas.className = 'world-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
  camera.position.z = CAMERA_Z;

  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;
  const key = new DirectionalLight('#fff3ec', 1.6);
  key.position.set(2, 4, 5);
  const rim = new DirectionalLight('#f2aaaa', 0.9);
  rim.position.set(-4, -1, 2);
  scene.add(key, rim);

  const atmosphere = createAtmosphere();
  const media = createMedia(scene);
  const ribbon = createRibbon();
  const pearls = createPearls();
  const quartz = createQuartz({ transmission: q.transmission > 0 });
  const doc = new Group();
  doc.add(ribbon.mesh, pearls.points);
  scene.add(atmosphere.mesh, doc, quartz.group);

  const html = document.documentElement;
  atmosphere.uniforms.uDim.value = html.classList.contains('portal-open') ? 1 : 0;
  // What the stone belongs to on this page: the home page's portrait, or the
  // resting place beside another page's title. Found again on every page change.
  let hint = null;
  let portraitEl = null;
  let restEl = null;
  const findPage = () => {
    hint = document.querySelector('[data-hero-hint]');
    portraitEl = document.querySelector('.hero-media');
    restEl = document.querySelector('[data-stone-rest]');
  };
  findPage();
  const boxOf = (el) => (el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el).getBoundingClientRect();

  // ---- Layout: sizes, and everything built from the page height ----
  let vw = 1;
  let vh = 1;
  let k = 1;
  let sections = [];
  const halfWidthAt = (z) => Math.tan(MathUtils.degToRad(FOV / 2)) * (CAMERA_Z - z) * camera.aspect;

  const layout = () => {
    vw = canvas.clientWidth;
    vh = canvas.clientHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    k = (2 * Math.tan(MathUtils.degToRad(FOV / 2)) * CAMERA_Z) / vh;
    const total = document.documentElement.scrollHeight;
    atmosphere.repaint();
    sections = [...document.querySelectorAll('[data-tone]')].map((el) => ({ el, dark: el.dataset.tone === 'dark' }));
    const boundaries = sections.slice(1).map(({ el }) => boxOf(el).top + window.scrollY);
    ribbon.build({ total, vh, k, step: q.step, boundaries, halfWidthAt, sweep: Boolean(portraitEl?.isConnected) });
    pearls.build({ total, k, count: q.pearls, halfWidthAt });
    pearls.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  };
  let pending = 0;
  const relayout = () => {
    clearTimeout(pending);
    pending = setTimeout(layout, 120);
  };
  window.addEventListener('resize', relayout);
  ScrollTrigger.addEventListener('refresh', relayout);
  // A new page swapped in (src/router.js): its photos, sections and stone rest.
  window.addEventListener('bb:page', () => {
    findPage();
    media.refresh();
    layout();
  });
  // Late fonts, images or copy changes move the sections; re-measure when the page grows or shrinks.
  new ResizeObserver(relayout).observe(document.body);
  watchPointer();
  layout();

  // ---- The stone's choreography ----
  const stone = { x: vw + 200, y: vh * 0.3, vx: 0, vy: 0, scale: 0.5, glow: 0.03, rz: 0, spin: 0 };
  let lastScroll = window.scrollY;
  let bend = 0;
  let elapsed = 0;
  let frames = 0;
  let slow = 0;
  let degraded = false;
  let pulse = 0;
  let lastTouchChime = 0;
  window.addEventListener('bb:pulse', () => (pulse = 1));

  // The stone belongs to the hero: presented alone in the portal, then resting
  // by Bella's cheek and following a finger over her portrait. It leaves with
  // the hero as you scroll rather than following you down the page. On the
  // other pages it floats, turning slowly, beside the page's title.
  const target = (now, t) => {
    if (html.classList.contains('portal-open')) {
      const lang = html.classList.contains('portal-picking');
      return { x: vw / 2, y: vh * (lang ? 0.15 : 0.25), scale: (q.coarse ? 0.62 : 0.72) * (lang ? 0.8 : 1), glow: 0.45, follow: false, portrait: false };
    }
    if (!portraitEl?.isConnected) {
      const rest = restEl?.isConnected ? restEl.getBoundingClientRect() : null;
      if (!rest) return { x: vw + 220, y: vh * 0.3, scale: 0.4, glow: 0.05, follow: false, portrait: false };
      return {
        x: rest.left + rest.width / 2 + Math.sin(t * 0.6) * 6,
        y: rest.top + rest.height / 2 + Math.sin(t * 0.9) * 8,
        scale: q.coarse ? 0.42 : 0.52,
        glow: 0.12,
        follow: false,
        portrait: false,
      };
    }
    const rect = portraitEl.getBoundingClientRect();
    const scale = q.coarse ? 0.55 : 0.7;
    const touching =
      rect.bottom > vh * 0.35 &&
      now - pointer.moved < 2200 &&
      pointer.x > rect.left - 40 &&
      pointer.x < rect.right + 40 &&
      pointer.y > rect.top - 40 &&
      pointer.y < rect.bottom + 40;
    if (touching) {
      hint?.classList.add('is-done');
      // On touch, hover the stone just above the fingertip so the finger never hides it.
      return { x: pointer.x, y: pointer.y - (q.coarse ? 70 : 0), scale, glow: 0.08, follow: true, portrait: true };
    }
    // Idle: a slow figure-of-eight over the cheek, a gua sha ritual on its own.
    return {
      x: rect.left + rect.width * (0.74 + 0.05 * Math.sin(t * 0.9)),
      y: rect.top + rect.height * (q.coarse ? 0.36 : 0.42) + rect.height * 0.04 * Math.sin(t * 1.3),
      scale,
      glow: 0.05,
      follow: false,
      portrait: true,
    };
  };

  const frame = (time, deltaTime) => {
    const dt = Math.min(0.05, deltaTime / 1000);
    const now = performance.now();
    elapsed += dt;
    const scrollY = window.scrollY;

    // Scroll speed bends the photos a little, like silk.
    const scrolled = scrollY - lastScroll;
    const speed = scrolled / Math.max(dt, 1e-3);
    lastScroll = scrollY;
    bend += (MathUtils.clamp(speed / 3200, -1, 1) - bend) * Math.min(1, dt * 6);

    // Pointer in world space for the ribbon and pearls (doc group local).
    doc.position.y = scrollY * k;
    const idle = now - pointer.moved > 1800;
    if (pointer.x >= 0) {
      // At depth z the screen spans (CAMERA_Z - z) / CAMERA_Z times the z = 0 width.
      const at = (z) => {
        const f = (CAMERA_Z - z) / CAMERA_Z;
        return [(pointer.x - vw / 2) * k * f, -(pointer.y - vh / 2) * k * f - doc.position.y];
      };
      ribbon.uniforms.uPointer.value.set(...at(-1.2), 0);
      pearls.uniforms.uPointer.value.set(...at(-0.6), 0);
    }
    ribbon.uniforms.uTime.value = elapsed;
    pearls.uniforms.uTime.value = elapsed;

    const atmo = atmosphere.uniforms;
    atmo.uViewport.value.set(vw, vh);
    atmo.uScroll.value = scrollY;
    atmo.uTime.value = elapsed;
    if (pointer.x >= 0) atmo.uPointer.value.set(pointer.x / vw, 1 - pointer.y / vh);
    atmo.uPointerPower.value += ((idle ? 0 : 0.9) - atmo.uPointerPower.value) * Math.min(1, dt * 3);
    const portalOpen = html.classList.contains('portal-open');
    // The portal presents the stone alone; the ribbon arrives with the page.
    ribbon.mesh.visible = !portalOpen;
    atmo.uDim.value += ((portalOpen ? 1 : 0) - atmo.uDim.value) * Math.min(1, dt * (portalOpen ? 4 : 1.1));
    pulse *= Math.exp(-dt * 1.6);
    atmo.uPulse.value = pulse;

    const centre = sections.find(({ el }) => {
      const r = el.getBoundingClientRect();
      return r.top <= vh / 2 && r.bottom >= vh / 2;
    });
    const dark = Boolean(centre?.dark) || atmo.uDim.value > 0.5;
    pearls.setDark(dark);

    // Sound follows the world: air with scroll speed, a darker pad in dark chapters.
    if (frames % 4 === 0) {
      setScrollEnergy(Math.min(1, Math.abs(speed) / 2600));
      setBrightness(dark ? 0.15 : 1);
    }

    // Stone. Outside the portal it scrolls with the page like a thing placed
    // on it, and eases only the rest of the way.
    const goal = target(now, elapsed);
    if (!portalOpen) stone.y -= scrolled;
    const ease = 1 - Math.exp(-dt * (goal.follow ? 9 : 3.2));
    const px = stone.x;
    // Measured after the scroll shift, so only movement over the page counts as a stroke.
    const py = stone.y;
    stone.x += (goal.x - stone.x) * ease;
    stone.y += (goal.y - stone.y) * ease;
    stone.vx = (stone.x - px) / Math.max(dt, 1e-3);
    stone.vy = (stone.y - py) / Math.max(dt, 1e-3);
    stone.scale += (goal.scale - stone.scale) * Math.min(1, dt * 3);
    stone.glow += (goal.glow + pulse * 0.9 - stone.glow) * Math.min(1, dt * 2.5);
    // A chime as a finger leads the stone fast across the portrait.
    const stoneSpeed = Math.hypot(stone.vx, stone.vy);
    if (goal.follow && stoneSpeed > 500 && now - lastTouchChime > 240) {
      lastTouchChime = now;
      chime(Math.min(0.7, stoneSpeed / 3000));
    }
    const portrait = goal.portrait;
    stone.spin += dt * (portrait ? 0 : 0.45);
    stone.rz += ((portrait ? -0.55 : 0) - stone.rz) * Math.min(1, dt * 3);

    const kz = (k * (CAMERA_Z - STONE_Z)) / CAMERA_Z;
    const g = quartz.group;
    g.position.set((stone.x - vw / 2) * kz, -(stone.y - vh / 2) * kz, STONE_Z);
    g.scale.setScalar(stone.scale);
    g.rotation.set(
      0.45 + MathUtils.clamp(stone.vy * 0.0006, -0.5, 0.5) + Math.sin(elapsed * 0.7) * 0.08,
      stone.spin + (portrait ? Math.sin(elapsed * 0.5) * 0.5 : 0),
      stone.rz - MathUtils.clamp(stone.vx * 0.0006, -0.6, 0.6),
    );
    quartz.material.emissiveIntensity = stone.glow;
    quartz.light.intensity = 0.2 + stone.glow * 2.5;
    // Off screen the stone isn't drawn at all, which also skips the costly refraction pass.
    const stoneVisible = stone.y > -160 && stone.y < vh + 160;
    g.visible = stoneVisible;

    // The stone (and, elsewhere, the finger) makes the photos flow.
    const stoneMoved = Math.hypot(stone.x - px, stone.y - py);
    if (stoneVisible && stoneMoved > 0.4) media.stroke(stone.x, stone.y, stone.x - px, stone.y - py, goal.follow ? 1 : 0.55);
    if ((pointer.dx || pointer.dy) && !goal.follow) media.stroke(pointer.x, pointer.y, pointer.dx, pointer.dy, 1);
    pointer.dx = 0;
    pointer.dy = 0;

    media.update({ vw, vh, k, dt, bend, time: elapsed, pointer, pointerActive: pointer.x >= 0 && !idle });
    media.light(stone.x, stone.y, stoneVisible ? Math.min(1, 0.6 + stone.glow) : 0);

    renderer.render(scene, camera);

    // If the device can't keep up, render fewer pixels (once).
    frames++;
    if (frames > 30 && frames < 150 && dt > 1 / 38) slow++;
    if (!degraded && slow > 40) {
      degraded = true;
      renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.4));
      renderer.transmissionResolutionScale = 0.35;
      layout();
    }
  };

  gsap.ticker.add(frame);
  renderer.render(scene, camera);
  requestAnimationFrame(() => document.documentElement.classList.add('has-world'));

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    gsap.ticker.remove(frame);
    document.documentElement.classList.remove('has-world');
  });
  return true;
}
