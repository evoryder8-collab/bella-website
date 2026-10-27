import {
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  TextureLoader,
  Vector3,
  Vector4,
  WebGLRenderer,
} from 'three';

// "Sculpt the portrait": the hero photo is drawn by a shader, and a finger (or
// the mouse) moving across it pushes the image along the stroke like a gua sha
// stone, with a faint rose glow where it has just passed. The <img> underneath
// stays as the fallback and the accessible image.

const POINTS = 24; // recent stroke samples kept in a ring buffer
const RADIUS = 0.17; // influence of one sample, in screen heights
const DECAY = 1.1; // how much of a sample's strength fades per second
const FOCUS_Y = 0.18; // matches object-position: 50% 18% on .hero-img

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  #define POINTS ${POINTS}
  uniform sampler2D uImage;
  uniform vec4 uCover;
  uniform float uAspect;
  uniform float uTime;
  uniform vec4 uPoints[POINTS];
  uniform float uLife[POINTS];
  uniform vec3 uGlow;
  varying vec2 vUv;

  vec3 photo(vec2 uv) {
    return texture2D(uImage, uv * uCover.xy + uCover.zw).rgb;
  }

  void main() {
    vec2 p = vec2(vUv.x * uAspect, vUv.y);
    vec2 flow = vec2(0.0);
    float heat = 0.0;
    for (int i = 0; i < POINTS; i++) {
      float life = uLife[i];
      if (life <= 0.0) continue;
      vec2 d = p - vec2(uPoints[i].x * uAspect, uPoints[i].y);
      float w = exp(-dot(d, d) / ${(RADIUS * RADIUS).toFixed(4)}) * life;
      flow += uPoints[i].zw * w;
      heat += w;
    }
    float strength = length(flow);
    if (strength > 1.2) flow *= 1.2 / strength;
    heat = clamp(heat, 0.0, 1.0);

    // A slow breath, so the portrait is never quite still.
    vec2 breath = vec2(sin(uTime * 0.7 + vUv.y * 4.0), cos(uTime * 0.5 + vUv.x * 3.0)) * 0.0018;
    vec2 uv = vUv - flow * 0.07 + breath;
    vec2 split = flow * 0.012;
    vec3 color = vec3(photo(uv + split).r, photo(uv).g, photo(uv - split).b);
    color += uGlow * heat * 0.16;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export async function initHeroSculpt(hero) {
  const frame = hero.querySelector('[data-hero-frame]');
  const img = frame.querySelector('img');
  const hint = hero.querySelector('[data-hero-hint]');

  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  } catch {
    return; // No WebGL: the photo simply stays a photo.
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  // No colour space set: pixels go through untouched, so the canvas matches the <img>.
  const texture = await new TextureLoader().loadAsync(img.currentSrc || img.src);
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;

  const points = Array.from({ length: POINTS }, () => new Vector4(-10, -10, 0, 0));
  const life = new Array(POINTS).fill(0);
  const uniforms = {
    uImage: { value: texture },
    uCover: { value: new Vector4(1, 1, 0, 0) },
    uAspect: { value: 1 },
    uTime: { value: 0 },
    uPoints: { value: points },
    uLife: { value: life },
    uGlow: { value: new Vector3(0.95, 0.67, 0.67) },
  };
  const scene = new Scene();
  scene.add(
    new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ uniforms, vertexShader, fragmentShader, depthTest: false, depthWrite: false })),
  );
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const canvas = renderer.domElement;
  canvas.className = 'hero-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  frame.append(canvas);

  const imageAspect = texture.image.width / texture.image.height;
  const resize = () => {
    // Layout size, not the on-screen rect, which the intro zoom scales.
    const width = frame.clientWidth;
    const height = frame.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    uniforms.uAspect.value = aspect;
    // object-fit: cover in texture space, where v runs bottom to top.
    const sx = Math.min(1, aspect / imageAspect);
    const sy = Math.min(1, imageAspect / aspect);
    uniforms.uCover.value.set(sx, sy, (1 - sx) * 0.5, (1 - sy) * (1 - FOCUS_Y));
  };
  new ResizeObserver(resize).observe(frame);
  resize();

  // ---- Strokes ----
  let head = 0;
  let last = null;
  let touched = false;

  const stroke = (u, v) => {
    if (last) {
      const du = u - last.u;
      const dv = v - last.v;
      if (Math.hypot(du, dv) < 0.006) return;
      let vx = du * 14;
      let vy = dv * 14;
      const len = Math.hypot(vx, vy);
      if (len > 1.2) {
        vx *= 1.2 / len;
        vy *= 1.2 / len;
      }
      points[head].set(u, v, vx, vy);
      life[head] = 1;
      head = (head + 1) % POINTS;
    }
    last = { u, v };
  };

  const fromScreen = (x, y) => {
    const rect = frame.getBoundingClientRect();
    const u = (x - rect.left) / rect.width;
    const v = 1 - (y - rect.top) / rect.height;
    if (u < -0.1 || u > 1.1 || v < -0.1 || v > 1.1) {
      last = null;
      return;
    }
    if (!touched) {
      touched = true;
      hint?.classList.add('is-done');
    }
    stroke(u, v);
  };

  hero.addEventListener('pointermove', (event) => event.pointerType !== 'touch' && fromScreen(event.clientX, event.clientY));
  hero.addEventListener('pointerleave', () => (last = null));
  // Passive touch listeners: the page still scrolls, and scrolling itself drags the
  // finger up the portrait, which reads as a lift.
  const onTouch = (event) => fromScreen(event.touches[0].clientX, event.touches[0].clientY);
  hero.addEventListener('touchstart', (event) => ((last = null), onTouch(event)), { passive: true });
  hero.addEventListener('touchmove', onTouch, { passive: true });
  hero.addEventListener('touchend', () => (last = null), { passive: true });

  // One demonstration stroke, sweeping up across the face, unless someone is quicker.
  let demo = null;
  setTimeout(() => {
    if (!touched) demo = { start: performance.now(), duration: 1700 };
  }, 1400);
  const runDemo = (now) => {
    const k = Math.min(1, (now - demo.start) / demo.duration);
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    stroke(0.14 + 0.72 * e, 0.4 + 0.3 * e + Math.sin(e * Math.PI) * 0.08);
    if (k === 1 || touched) {
      demo = null;
      last = null;
    }
  };
  setTimeout(() => hint?.classList.add('is-done'), 8000);

  // ---- Render loop, only while the hero is on screen ----
  let raf = 0;
  let running = false;
  let visible = true;
  let previous = performance.now();

  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - previous) / 1000);
    previous = now;
    uniforms.uTime.value = now / 1000;
    if (demo) runDemo(now);
    for (let i = 0; i < POINTS; i++) if (life[i] > 0) life[i] = Math.max(0, life[i] - dt * DECAY);
    renderer.render(scene, camera);
  };
  const setRunning = (on) => {
    if (on === running) return;
    running = on;
    if (on) {
      previous = performance.now();
      raf = requestAnimationFrame(loop);
    } else cancelAnimationFrame(raf);
  };
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    setRunning(visible && !document.hidden);
  }).observe(hero);
  document.addEventListener('visibilitychange', () => setRunning(visible && !document.hidden));

  canvas.addEventListener('webglcontextlost', () => {
    hero.classList.remove('has-sculpt');
    setRunning(false);
  });

  renderer.render(scene, camera);
  requestAnimationFrame(() => hero.classList.add('has-sculpt'));
}
