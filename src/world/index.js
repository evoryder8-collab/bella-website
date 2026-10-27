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
    dpr: Math.min(window.devicePixelRatio, lowEnd ? 1 : coarse ? 1.6 : 1.75),
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
  const hero = document.querySelector('[data-hero]');
  const hint = hero.querySelector('[data-hero-hint]');
  const anchors = {
    portrait: document.querySelector('.hero-media'),
    glide: document.querySelector('[data-approach-stage]'),
    stroke: document.querySelector('.method-media'),
    orbit: document.querySelector('.rating-value'),
    finale: document.querySelector('.footer-mark'),
  };
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
    ribbon.build({ total, vh, k, step: q.step, boundaries, halfWidthAt });
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
  let lastKind = null;
  let lastTouchChime = 0;
  window.addEventListener('bb:pulse', () => (pulse = 1));

  const chapter = () => {
    let best = null;
    let bestScore = 0.3;
    for (const [kind, el] of Object.entries(anchors)) {
      if (!el) continue;
      const rect = boxOf(el);
      const overlap = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
      const score = overlap / Math.min(rect.height || 1, vh);
      if (score > bestScore) {
        bestScore = score;
        best = { kind, rect };
      }
    }
    return best;
  };

  const target = (active, now, t) => {
    // First-visit portal: the stone is presented alone, turning in the light.
    if (html.classList.contains('portal-open')) return { x: vw / 2, y: vh * 0.25, scale: q.coarse ? 0.62 : 0.72, glow: 0.45, follow: false };
    if (!active) return { x: vw + 180, y: vh * 0.4, scale: 0.45, glow: 0.03, follow: false };
    const { kind, rect } = active;
    const progress = (a) => MathUtils.clamp(a, 0, 1);
    switch (kind) {
      case 'portrait': {
        const touching =
          now - pointer.moved < 2200 &&
          pointer.x > rect.left - 40 &&
          pointer.x < rect.right + 40 &&
          pointer.y > rect.top - 40 &&
          pointer.y < rect.bottom + 40;
        if (touching) {
          hint?.classList.add('is-done');
          // On touch, hover the stone just above the fingertip so the finger never hides it.
          return { x: pointer.x, y: pointer.y - (q.coarse ? 70 : 0), scale: q.coarse ? 0.55 : 0.7, glow: 0.08, follow: true };
        }
        // Idle: a slow figure-of-eight over the cheek, a gua sha ritual on its own.
        return {
          x: rect.left + rect.width * (0.74 + 0.05 * Math.sin(t * 0.9)),
          y: rect.top + rect.height * (q.coarse ? 0.36 : 0.42) + rect.height * 0.04 * Math.sin(t * 1.3),
          scale: q.coarse ? 0.55 : 0.7,
          glow: 0.05,
          follow: false,
        };
      }
      case 'glide': {
        const p = progress(-rect.top / Math.max(1, rect.height - vh));
        return { x: vw * (0.16 + 0.68 * p), y: vh * (0.42 - 0.2 * p + 0.05 * Math.sin(p * Math.PI * 3)), scale: 0.6, glow: 0.12, follow: false };
      }
      case 'stroke': {
        const p = MathUtils.smoothstep((vh - rect.top) / (vh + rect.height), 0.3, 0.7);
        return { x: rect.left + rect.width * (0.25 + 0.45 * p), y: rect.top + rect.height * (0.82 - 0.62 * p), scale: 0.55, glow: 0.1, follow: false };
      }
      case 'orbit':
        return {
          x: Math.min(vw - 70, rect.left + rect.width * 0.9 + 40 * Math.cos(t * 0.8)),
          y: rect.top + rect.height * 0.45 + 16 * Math.sin(t * 0.8),
          scale: 0.48,
          glow: 0.35,
          follow: false,
        };
      case 'finale':
        return { x: vw / 2, y: rect.top - Math.min(80, vh * 0.1), scale: 0.62, glow: 0.6, follow: false };
      default:
        return { x: vw + 180, y: vh * 0.4, scale: 0.45, glow: 0.03, follow: false };
    }
  };

  const frame = (time, deltaTime) => {
    const dt = Math.min(0.05, deltaTime / 1000);
    const now = performance.now();
    elapsed += dt;
    const scrollY = window.scrollY;

    // Scroll speed bends the photos a little, like silk.
    const speed = (scrollY - lastScroll) / Math.max(dt, 1e-3);
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

    // Stone.
    const active = chapter();
    const goal = target(active, now, elapsed);
    const ease = 1 - Math.exp(-dt * (goal.follow ? 9 : 3.2));
    const px = stone.x;
    const py = stone.y;
    stone.x += (goal.x - stone.x) * ease;
    stone.y += (goal.y - stone.y) * ease;
    stone.vx = (stone.x - px) / Math.max(dt, 1e-3);
    stone.vy = (stone.y - py) / Math.max(dt, 1e-3);
    stone.scale += (goal.scale - stone.scale) * Math.min(1, dt * 3);
    stone.glow += (goal.glow + pulse * 0.9 - stone.glow) * Math.min(1, dt * 2.5);
    // A chime whenever the stone moves on to a new chapter, and as a finger leads it fast.
    const kind = portalOpen ? 'portal' : active?.kind ?? null;
    if (kind !== lastKind) {
      if (lastKind !== null && kind) chime(0.45);
      lastKind = kind;
    }
    const stoneSpeed = Math.hypot(stone.vx, stone.vy);
    if (goal.follow && stoneSpeed > 500 && now - lastTouchChime > 240) {
      lastTouchChime = now;
      chime(Math.min(0.7, stoneSpeed / 3000));
    }
    const portrait = active?.kind === 'portrait';
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

    // The stone (and, elsewhere, the finger) makes the photos flow.
    const stoneMoved = Math.hypot(stone.x - px, stone.y - py);
    if (stoneMoved > 0.4) media.stroke(stone.x, stone.y, stone.x - px, stone.y - py, goal.follow ? 1 : 0.55);
    if ((pointer.dx || pointer.dy) && !goal.follow) media.stroke(pointer.x, pointer.y, pointer.dx, pointer.dy, 1);
    pointer.dx = 0;
    pointer.dy = 0;

    media.update({ vw, vh, k, dt, bend });
    media.light(stone.x, stone.y, Math.min(1, 0.6 + stone.glow));

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
