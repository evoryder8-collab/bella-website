import gsap from 'gsap';
import { Color, LinearFilter, Mesh, PlaneGeometry, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector2, Vector3, Vector4 } from 'three';

// Every photo marked data-gl-media is redrawn in WebGL exactly where the page
// lays it out. The DOM image stays for layout, alt text and the fallback, and
// turns invisible once its texture is ready. In WebGL a photo:
// - dissolves in organically from the bottom with a glowing rim (driven by the
//   same --reveal value GSAP animates for the CSS clip fallback),
// - flows like liquid under a finger or the quartz stone,
// - bends slightly with scroll speed,
// - catches a pool of rose light where the stone floats above it.

const POINTS = 12;
const LOAD_AHEAD = 1.5; // viewport heights

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
  uniform float uRadius;
  uniform vec4 uCover;
  uniform float uZoom;
  uniform float uShift;
  uniform float uReveal;
  uniform float uSeed;
  uniform vec4 uPoints[POINTS];
  uniform float uLife[POINTS];
  uniform vec3 uGlow;
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
    return texture2D(uImage, uv * uCover.xy + uCover.zw).rgb;
  }

  void main() {
    // Rounded corners, cut rather than blended so the plane stays opaque and
    // the stone can refract it.
    vec2 px = vUv * uSize;
    vec2 h = uSize * 0.5;
    vec2 q = abs(px - h) - (h - uRadius);
    if (length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius > 0.0) discard;

    float n = (noise(vUv * vec2(3.0, 4.0) + uSeed) + noise(vUv * 9.0 + uSeed) * 0.35) * 0.42 + vUv.y * 0.45;
    float threshold = uReveal * 1.3 - 0.14;
    if (n > threshold) discard;
    float rim = (1.0 - smoothstep(0.0, 0.06, threshold - n)) * step(uReveal, 0.999);

    float aspect = uSize.x / uSize.y;
    vec2 p = vec2(vUv.x * aspect, vUv.y);
    vec2 flow = vec2(0.0);
    float heat = 0.0;
    for (int i = 0; i < POINTS; i++) {
      float life = uLife[i];
      if (life <= 0.0) continue;
      vec2 d = p - vec2(uPoints[i].x * aspect, uPoints[i].y);
      float w = exp(-dot(d, d) / 0.045) * life;
      flow += uPoints[i].zw * w;
      heat += w;
    }
    float strength = length(flow);
    if (strength > 1.2) flow *= 1.2 / strength;

    vec2 uv = vUv - flow * 0.06;
    vec2 split = flow * 0.012;
    vec3 color = vec3(photo(uv + split).r, photo(uv).g, photo(uv - split).b);
    color += uGlow * clamp(heat, 0.0, 1.0) * 0.1;

    vec2 s = (vUv - uStone.xy) * vec2(aspect, 1.0);
    color += uGlow * exp(-dot(s, s) / 0.025) * 0.2 * uStone.z;

    color = mix(color, uGlow * 1.25, rim * 0.85);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export function createMedia(scene) {
  const loader = new TextureLoader();
  const geometry = new PlaneGeometry(1, 1, 24, 24);
  const glow = new Color('#f7b9b4');
  const items = [...document.querySelectorAll('[data-gl-media]')].map((container, order) => {
    const img = container.querySelector('img');
    const uniforms = {
      uImage: { value: null },
      uSize: { value: new Vector2(1, 1) },
      uRadius: { value: 0 },
      uCover: { value: new Vector4(1, 1, 0, 0) },
      uZoom: { value: 1 },
      uShift: { value: 0 },
      uReveal: { value: 1 },
      uSeed: { value: order * 7.3 },
      uPoints: { value: Array.from({ length: POINTS }, () => new Vector4(-9, -9, 0, 0)) },
      uLife: { value: new Array(POINTS).fill(0) },
      uGlow: { value: glow },
      uStone: { value: new Vector3() },
      uBend: { value: 0 },
    };
    const mesh = new Mesh(geometry, new ShaderMaterial({ uniforms, vertexShader, fragmentShader }));
    mesh.visible = false;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return {
      container,
      img,
      // The element GSAP zooms or parallaxes, whose transform the shader copies.
      source: container.querySelector('[data-parallax], [data-hero-frame]') || img,
      // The element whose --reveal drives the dissolve.
      revealEl: container.closest('[data-approach-panel]') || container,
      mesh,
      uniforms,
      z: order * 0.002,
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
    update({ vw, vh, k, dt, bend }) {
      for (const item of items) {
        const rect = item.container.getBoundingClientRect();
        item.rect = rect;
        const near = rect.bottom > -vh * LOAD_AHEAD && rect.top < vh * (1 + LOAD_AHEAD);
        if (item.state === 'idle' && near && rect.width > 0) load(item);
        const visible = item.state === 'ready' && rect.bottom > -20 && rect.top < vh + 20 && rect.width > 0;
        item.mesh.visible = visible;
        if (!visible) continue;

        const key = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
        if (key !== item.sizeKey) {
          item.sizeKey = key;
          fit(item, rect.width, rect.height);
        }
        const { uniforms } = item;
        item.mesh.position.set((rect.left + rect.width / 2 - vw / 2) * k, -(rect.top + rect.height / 2 - vh / 2) * k, item.z);
        item.mesh.scale.set(rect.width * k, rect.height * k, 1);
        uniforms.uSize.value.set(rect.width, rect.height);
        uniforms.uZoom.value = Number(gsap.getProperty(item.source, 'scale')) || 1;
        uniforms.uShift.value = (Number(gsap.getProperty(item.source, 'yPercent')) || 0) / 100;
        const reveal = parseFloat(item.revealEl.style.getPropertyValue('--reveal'));
        uniforms.uReveal.value = Number.isNaN(reveal) ? 1 : reveal;
        uniforms.uBend.value = bend;
        const life = uniforms.uLife.value;
        for (let i = 0; i < POINTS; i++) if (life[i] > 0) life[i] = Math.max(0, life[i] - dt * 1.1);
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
