import gsap from 'gsap';
import { Color, LinearFilter, Mesh, PlaneGeometry, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector2, Vector3, Vector4 } from 'three';

// Every photo marked data-gl-media is redrawn in WebGL exactly where the page
// lays it out. The DOM image stays for layout, alt text and the fallback, and
// turns invisible once its texture is ready. In WebGL a photo:
// - dissolves in organically from the bottom with a glowing rim (driven by the
//   same --reveal value GSAP animates for the CSS clip fallback),
// - flows like liquid under a finger or the quartz stone,
// - bends slightly with scroll speed.
//
// Photos also marked data-gl-alive are living frames: their edge breathes and
// flows instead of being a fixed rectangle, a pearl rim of light travels round
// it, a rose aura glows outside it, a glint of light sweeps across the photo as
// it scrolls, and the whole frame tilts in 3D towards the finger. The hero
// portrait stays opaque (cut, not blended) so the stone can refract it.

const POINTS = 12;
const LOAD_AHEAD = 1.5; // viewport heights
const PAD = 56; // px drawn around a living frame, room for its aura and tilt

const vertexShader = /* glsl */ `
  uniform float uBend;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.y += sin(uv.x * 3.14159) * uBend * 0.03;
    p.z += sin(uv.y * 3.14159) * abs(uBend) * 0.05;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  #define POINTS ${POINTS}
  uniform sampler2D uImage;
  uniform vec2 uSize;
  uniform float uPad;
  uniform float uAlive;
  uniform float uRadius;
  uniform vec4 uCover;
  uniform float uZoom;
  uniform float uShift;
  uniform vec2 uTilt;
  uniform float uReveal;
  uniform float uSeed;
  uniform float uTime;
  uniform float uGlint;
  uniform float uBend;
  uniform vec4 uPoints[POINTS];
  uniform float uLife[POINTS];
  uniform vec3 uGlow;
  uniform vec3 uPearl;
  uniform vec3 uStone;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), u.x), u.y);
  }

  vec3 photo(vec2 uv) {
    uv = (uv - 0.5) / uZoom + 0.5;
    uv.y += uShift;
    uv += uTilt * 0.02;
    return texture2D(uImage, uv * uCover.xy + uCover.zw).rgb;
  }

  void main() {
    // Pixel position inside the photo box; the plane extends uPad beyond it.
    vec2 px = vUv * (uSize + 2.0 * uPad) - uPad;
    vec2 uv = px / uSize;
    vec2 h = uSize * 0.5;
    vec2 c = px - h;
    vec2 dir = normalize(c + 1e-4);

    // Distance to the frame's edge (negative inside). Living frames get a
    // deep rounding and an edge that slowly flows and wobbles with scroll speed.
    float radius = mix(uRadius, min(uSize.x, uSize.y) * 0.17, uAlive);
    vec2 q = abs(c) - (h - radius);
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
    float t = uTime + uSeed;
    float flowEdge = (noise(dir * 1.4 + vec2(t * 0.12, -t * 0.08)) - 0.5) + (noise(dir * 3.0 + vec2(-t * 0.16, t * 0.13)) - 0.5) * 0.35;
    d -= uAlive * (flowEdge * 8.0 + sin(dot(dir, vec2(0.8, 0.6)) * 3.0 + t * 1.3) * abs(uBend) * 10.0);

    // Reveal: an organic dissolve rising from the bottom, with a glowing rim.
    float n = (noise(uv * vec2(3.0, 4.0) + uSeed) + noise(uv * 9.0 + uSeed) * 0.35) * 0.42 + clamp(uv.y, 0.0, 1.0) * 0.45;
    float threshold = uReveal * 1.3 - 0.14;
    float revealed = step(n, threshold);
    float revealRim = (1.0 - smoothstep(0.0, 0.06, threshold - n)) * step(uReveal, 0.999);

    if (uAlive < 0.5) {
      // Plain frames are cut, not blended, so they stay opaque.
      if (d > 0.0 || revealed < 0.5) discard;
    }

    // Liquid strokes from the finger or the stone.
    float aspect = uSize.x / uSize.y;
    vec2 p = vec2(uv.x * aspect, uv.y);
    vec2 flow = vec2(0.0);
    float heat = 0.0;
    for (int i = 0; i < POINTS; i++) {
      float life = uLife[i];
      if (life <= 0.0) continue;
      vec2 e = p - vec2(uPoints[i].x * aspect, uPoints[i].y);
      float w = exp(-dot(e, e) / 0.045) * life;
      flow += uPoints[i].zw * w;
      heat += w;
    }
    float strength = length(flow);
    if (strength > 1.2) flow *= 1.2 / strength;

    vec2 suv = uv - flow * 0.06;
    vec2 split = flow * 0.012;
    vec3 color = vec3(photo(suv + split).r, photo(suv).g, photo(suv - split).b);
    color += uGlow * clamp(heat, 0.0, 1.0) * 0.1;

    vec2 s = (uv - uStone.xy) * vec2(aspect, 1.0);
    color += uGlow * exp(-dot(s, s) / 0.025) * 0.2 * uStone.z;

    // A glint of light, like glass catching a window, sweeps over as the photo scrolls by.
    float band = uv.x * 0.75 + uv.y * 0.55 - (uGlint * 2.6 - 0.6);
    color += uPearl * (exp(-band * band / 0.004) * 0.22 + exp(-band * band / 0.04) * 0.06) * uAlive;

    color = mix(color, uGlow * 1.25, revealRim * 0.85);

    if (uAlive < 0.5) {
      gl_FragColor = vec4(color, 1.0);
      #include <colorspace_fragment>
      return;
    }

    // Living frame: soft edge, pearl rim with a travelling highlight, rose aura outside.
    float inside = (1.0 - smoothstep(-1.2, 1.2, d)) * revealed;
    float edge = 1.0 - smoothstep(0.0, 2.6, abs(d));
    vec2 orbit = vec2(cos(t * 0.6), sin(t * 0.6));
    float travel = pow(max(dot(dir, orbit), 0.0), 6.0) + 0.35 * pow(max(dot(dir, -orbit), 0.0), 10.0);
    vec3 iridescence = 0.5 + 0.5 * cos(6.2831 * (dot(dir, vec2(0.35, 0.22)) + t * 0.05 + vec3(0.0, 0.33, 0.67)));
    vec3 rim = mix(uPearl, iridescence, 0.3);
    float rimStrength = edge * (0.35 + 0.9 * travel) * uReveal;
    float aura = exp(-max(d, 0.0) / 24.0) * step(0.0, d) * 0.42 * uReveal;

    vec3 outColor = mix(uGlow, color, inside);
    outColor = mix(outColor, rim, clamp(rimStrength, 0.0, 1.0));
    float alpha = max(inside, max(aura * (1.0 - inside), rimStrength));
    gl_FragColor = vec4(outColor, alpha);
    #include <colorspace_fragment>
  }
`;

export function createMedia(scene) {
  const loader = new TextureLoader();
  const geometry = new PlaneGeometry(1, 1, 24, 24);
  const glow = new Color('#f2a7a4');
  const pearl = new Color('#fff6f1');
  const items = [...document.querySelectorAll('[data-gl-media]')].map((container, order) => {
    const img = container.querySelector('img');
    const alive = container.hasAttribute('data-gl-alive');
    const uniforms = {
      uImage: { value: null },
      uSize: { value: new Vector2(1, 1) },
      uPad: { value: alive ? PAD : 0 },
      uAlive: { value: alive ? 1 : 0 },
      uRadius: { value: 0 },
      uCover: { value: new Vector4(1, 1, 0, 0) },
      uZoom: { value: 1 },
      uShift: { value: 0 },
      uTilt: { value: new Vector2() },
      uReveal: { value: 1 },
      uSeed: { value: order * 7.3 },
      uTime: { value: 0 },
      uGlint: { value: 0 },
      uBend: { value: 0 },
      uPoints: { value: Array.from({ length: POINTS }, () => new Vector4(-9, -9, 0, 0)) },
      uLife: { value: new Array(POINTS).fill(0) },
      uGlow: { value: glow },
      uPearl: { value: pearl },
      uStone: { value: new Vector3() },
    };
    const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: alive, depthWrite: !alive });
    const mesh = new Mesh(geometry, material);
    mesh.visible = false;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return {
      container,
      img,
      alive,
      // The element GSAP zooms or parallaxes, whose transform the shader copies.
      source: container.querySelector('[data-parallax], [data-hero-frame]') || img,
      // The element whose --reveal drives the dissolve.
      revealEl: container.closest('[data-approach-panel]') || container,
      mesh,
      uniforms,
      z: order * 0.002 + (alive ? 0.05 : 0),
      tilt: new Vector2(),
      state: 'idle',
      head: 0,
      last: null,
      rect: null,
      sizeKey: '',
    };
  });

  const load = (item) => {
    item.state = 'loading';
    loader.load(item.img.currentSrc || item.img.src, (texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.minFilter = LinearFilter;
      texture.generateMipmaps = false;
      item.uniforms.uImage.value = texture;
      item.aspect = texture.image.width / texture.image.height;
      item.state = 'ready';
      item.sizeKey = '';
      item.container.dataset.glReady = '';
    });
  };

  // object-fit: cover with the image's own object-position, in texture space.
  const fit = (item, width, height) => {
    const style = getComputedStyle(item.img);
    const [px = 50, py = 50] = style.objectPosition.split(' ').map((v) => parseFloat(v));
    const aspect = width / height;
    const sx = Math.min(1, aspect / item.aspect);
    const sy = Math.min(1, item.aspect / aspect);
    item.uniforms.uCover.value.set(sx, sy, (1 - sx) * (px / 100), (1 - sy) * (1 - py / 100));
    item.uniforms.uRadius.value = parseFloat(getComputedStyle(item.container).borderTopLeftRadius) || 0;
  };

  const at = (x, y) => items.find(({ rect, state }) => state === 'ready' && rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);

  return {
    items,

    // Call once per frame, after scrolling has been applied.
    update({ vw, vh, k, dt, bend, time, pointer, pointerActive }) {
      for (const item of items) {
        const rect = item.container.getBoundingClientRect();
        item.rect = rect;
        const near = rect.bottom > -vh * LOAD_AHEAD && rect.top < vh * (1 + LOAD_AHEAD);
        if (item.state === 'idle' && near && rect.width > 0) load(item);
        const pad = item.uniforms.uPad.value;
        const visible = item.state === 'ready' && rect.bottom > -20 - pad && rect.top < vh + 20 + pad && rect.width > 0;
        item.mesh.visible = visible;
        if (!visible) continue;

        const key = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
        if (key !== item.sizeKey) {
          item.sizeKey = key;
          fit(item, rect.width, rect.height);
        }
        const { uniforms, mesh } = item;
        mesh.position.set((rect.left + rect.width / 2 - vw / 2) * k, -(rect.top + rect.height / 2 - vh / 2) * k, item.z);
        mesh.scale.set((rect.width + 2 * pad) * k, (rect.height + 2 * pad) * k, 1);
        uniforms.uSize.value.set(rect.width, rect.height);
        uniforms.uZoom.value = Number(gsap.getProperty(item.source, 'scale')) || 1;
        uniforms.uShift.value = (Number(gsap.getProperty(item.source, 'yPercent')) || 0) / 100;
        const reveal = parseFloat(item.revealEl.style.getPropertyValue('--reveal'));
        uniforms.uReveal.value = Number.isNaN(reveal) ? 1 : reveal;
        uniforms.uBend.value = bend;
        uniforms.uTime.value = time;
        const life = uniforms.uLife.value;
        for (let i = 0; i < POINTS; i++) if (life[i] > 0) life[i] = Math.max(0, life[i] - dt * 1.1);

        if (!item.alive) continue;
        // The glint crosses as the frame travels from the bottom of the screen to the top.
        uniforms.uGlint.value = 1 - (rect.top + rect.height / 2) / vh;
        // Tilt towards a nearby finger or mouse; otherwise sway gently and lean with scroll speed.
        let tx = Math.sin(time * 0.5 + uniforms.uSeed.value) * 0.035 + bend * 0.18;
        let ty = Math.cos(time * 0.4 + uniforms.uSeed.value) * 0.045;
        const leaning = pointerActive && pointer.x > rect.left - 80 && pointer.x < rect.right + 80 && pointer.y > rect.top - 80 && pointer.y < rect.bottom + 80;
        if (leaning) {
          ty = ((pointer.x - (rect.left + rect.width / 2)) / rect.width) * 0.32;
          tx = ((pointer.y - (rect.top + rect.height / 2)) / rect.height) * 0.26;
        }
        item.tilt.x += (tx - item.tilt.x) * Math.min(1, dt * 4);
        item.tilt.y += (ty - item.tilt.y) * Math.min(1, dt * 4);
        mesh.rotation.set(item.tilt.x, item.tilt.y, 0);
        uniforms.uTilt.value.set(item.tilt.y, -item.tilt.x);
      }
    },

    // A stroke through screen point (x, y), moving by (dx, dy) pixels.
    stroke(x, y, dx, dy, power = 1) {
      const item = at(x, y);
      if (!item) return;
      const { rect, uniforms } = item;
      const u = (x - rect.left) / rect.width;
      const v = 1 - (y - rect.top) / rect.height;
      const du = dx / rect.width;
      const dv = -dy / rect.height;
      if (Math.hypot(du, dv) < 0.002) return;
      let vx = du * 16 * power;
      let vy = dv * 16 * power;
      const len = Math.hypot(vx, vy);
      if (len > 1.2) {
        vx *= 1.2 / len;
        vy *= 1.2 / len;
      }
      uniforms.uPoints.value[item.head].set(u, v, vx, vy);
      uniforms.uLife.value[item.head] = Math.min(1, power);
      item.head = (item.head + 1) % POINTS;
    },

    // Where the stone floats (screen px) and how strongly its light falls.
    light(x, y, strength) {
      for (const { rect, uniforms, state } of items) {
        if (state !== 'ready' || !rect) continue;
        const inside = x >= rect.left - 40 && x <= rect.right + 40 && y >= rect.top - 40 && y <= rect.bottom + 40;
        uniforms.uStone.value.set((x - rect.left) / rect.width, 1 - (y - rect.top) / rect.height, inside ? strength : 0);
      }
    },
  };
}
