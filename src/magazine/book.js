import { CanvasTexture, DoubleSide, Group, Mesh, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, Texture, Vector2, Vector4, WebGLRenderer } from 'three';
import { paper } from '../sound.js';
import { paintPages } from './pages.js';

// The Hudterapeuten cover as a real magazine. It lifts off the page, bursts
// open with its pages fanning out, riffles back through them and shuts, landing
// exactly as the photo it started as. Every leaf is paper with physics: it is
// flicked, rises against gravity, falls over the spine, lands with a little
// bounce, and bends as it goes (the free edge drags behind, then flaps when the
// leaf lands). Leaves never pass through each other, the open gutter curves,
// glossy paper catches the light as it bends, and leaves cast shadows on the
// ones below. A small WebGL canvas exists only while it plays.

const LEAVES = 14;
const OPENED = 10; // the cover and nine pages swing open; four stay put
const COLS = 28;
const ROWS = 6;
const FOV = 30;
const STEP = 1 / 240;
const GRAVITY = 34;
const DRAG = 0.9;
const KICK = 0.09; // seconds a flick pushes for
const CURL_SPRING = 240;
const CURL_DAMPING = 8;
const CURL_DAMPING_AT_REST = 18;
const CURL_DRAG = 0.05;
const GUTTER = 0.3;
const THICKNESS = 0.45; // px per leaf
const RADIUS = 6; // the cover photo's CSS border radius

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalMatrix * normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  uniform vec2 uSize;
  uniform float uOpen;
  uniform vec2 uShadow;
  varying vec2 vUv;
  varying vec3 vNormal;

  const vec3 LIGHT = vec3(-0.3, 0.42, 0.86);

  void main() {
    vec2 q = abs(vUv * uSize - uSize * 0.5) - (uSize * 0.5 - ${RADIUS.toFixed(1)});
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - ${RADIUS.toFixed(1)};
    float alpha = 1.0 - smoothstep(-0.75, 0.75, d);
    if (alpha <= 0.0) discard;

    vec3 front = texture2D(uFront, vUv).rgb;
    vec3 back = texture2D(uBack, vec2(1.0 - vUv.x, vUv.y)).rgb;
    vec3 color = gl_FrontFacing ? front : back;

    // Lit so that paper lying flat shows its texture exactly as it is.
    vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    float shade = 0.4 + 0.6 * clamp(dot(n, LIGHT) / LIGHT.z, 0.0, 1.12);
    // Gloss that only appears where the paper bends away from flat.
    vec3 h = normalize(LIGHT + vec3(0.0, 0.0, 1.0));
    float sheen = max(pow(max(dot(n, h), 0.0), 30.0) - pow(h.z, 30.0), 0.0) * 0.45;
    // The gutter darkens while the magazine lies open, and a leaf just above casts a shadow.
    shade *= 1.0 - uOpen * 0.28 * exp(-vUv.x / 0.07);
    shade *= 1.0 - (gl_FrontFacing ? uShadow.x : uShadow.y) * (1.0 - 0.55 * vUv.x);

    gl_FragColor = vec4(color * shade + sheen, alpha);
  }
`;

// A Gaussian-blurred rectangle (as CSS box-shadow draws one), where the
// magazine meets the page.
const shadowVertex = /* glsl */ `
  varying vec2 vPos;
  void main() {
    vPos = (modelMatrix * vec4(position, 1.0)).xy;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;

const shadowFragment = /* glsl */ `
  uniform vec4 uRect;
  uniform float uSigma;
  uniform float uAlpha;
  varying vec2 vPos;

  vec4 erf(vec4 x) {
    vec4 s = sign(x);
    vec4 a = abs(x);
    x = 1.0 + (0.278393 + (0.230389 + 0.078108 * (a * a)) * a) * a;
    x *= x;
    return s - s / (x * x);
  }

  void main() {
    vec4 i = 0.5 + 0.5 * erf(vec4(vPos - uRect.xy, vPos - uRect.zw) * (0.70710678 / uSigma));
    gl_FragColor = vec4(0.227, 0.122, 0.149, (i.z - i.x) * (i.w - i.y) * uAlpha);
  }
`;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOut = (t) => 1 - (1 - t) ** 3;
const random = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// When each leaf is flicked, and how hard (positive opens, negative closes).
function schedule() {
  const rng = random(73);
  const kicks = Array.from({ length: LEAVES }, () => []);
  kicks[0].push({ at: 0.12, speed: 12.6 });
  for (let i = 1; i < OPENED; i++) kicks[i].push({ at: 0.24 + (i - 1) * 0.036, speed: 14.6 + rng() * 1.2 });
  let at = 1.05;
  for (let i = OPENED - 1; i >= 1; i--) {
    kicks[i].push({ at, speed: -(14.2 + rng() * 1.4) });
    at += 0.08 - (OPENED - 1 - i) * 0.004;
  }
  kicks[0].push({ at: at + 0.16, speed: -11.4 });
  return kicks;
}

export async function createBook(figure, img) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = 'press-book';
  canvas.setAttribute('aria-hidden', 'true');

  const coverImage = new Image();
  coverImage.src = img.currentSrc || img.src;
  await coverImage.decode();
  const textureWidth = Math.min(512, Math.max(256, Math.round((img.offsetWidth * dpr) / 64) * 64));
  const { fronts, backs, blank } = await paintPages(textureWidth);

  const textures = [];
  const texture = (source) => {
    const map = source instanceof HTMLCanvasElement ? new CanvasTexture(source) : new Texture(source);
    map.anisotropy = 4;
    map.needsUpdate = true;
    renderer.initTexture(map);
    textures.push(map);
    return map;
  };
  const paperMap = texture(blank);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 1, 10);
  const group = new Group();
  scene.add(group);
  const open = { value: 0 };
  const size = new Vector2(1, 1);
  const leaves = schedule().map((kicks, i) => {
    const geometry = new PlaneGeometry(1, 1, COLS, ROWS);
    const uniforms = {
      uFront: { value: i === 0 ? texture(coverImage) : fronts[i] ? texture(fronts[i]) : paperMap },
      uBack: { value: backs[i] ? texture(backs[i]) : paperMap },
      uSize: { value: size },
      uOpen: open,
      uShadow: { value: new Vector2() },
    };
    const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: DoubleSide, alphaToCoverage: true });
    const mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    group.add(mesh);
    return { mesh, geometry, uniforms, kicks, phi: 0, omega: 0, curl: 0, curlV: 0, angles: new Float32Array((ROWS + 1) * (COLS + 1)) };
  });

  const shadowUniforms = { uRect: { value: new Vector4() }, uSigma: { value: 30 }, uAlpha: { value: 0.6 } };
  const shadow = new Mesh(
    new PlaneGeometry(1, 1),
    new ShaderMaterial({ uniforms: shadowUniforms, vertexShader: shadowVertex, fragmentShader: shadowFragment, transparent: true, depthWrite: false }),
  );
  shadow.renderOrder = -1;
  shadow.frustumCulled = false;
  scene.add(shadow);

  const dispose = () => {
    for (const { geometry, mesh } of leaves) {
      geometry.dispose();
      mesh.material.dispose();
    }
    shadow.geometry.dispose();
    shadow.material.dispose();
    textures.forEach((map) => map.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };

  function play() {
    const W = img.offsetWidth;
    const H = img.offsetHeight;
    if (!W || !H) {
      dispose();
      return Promise.resolve();
    }
    size.set(W, H);

    // The canvas reaches past the cover for the open spread, the rising
    // leaves and the shadow; the spine sits at its centre.
    const pad = { left: W + 80, right: 80, top: Math.round(H * 0.65), bottom: Math.round(Math.max(H * 0.3, 110)) };
    const cw = W + pad.left + pad.right;
    const ch = H + pad.top + pad.bottom;
    Object.assign(canvas.style, { left: `${img.offsetLeft - pad.left}px`, top: `${img.offsetTop - pad.top}px`, width: `${cw}px`, height: `${ch}px` });
    renderer.setSize(cw, ch, false);
    img.after(canvas);

    // One world unit is one CSS pixel at the depth of the closed cover.
    const top = LEAVES * THICKNESS;
    const distance = ch / 2 / Math.tan((FOV / 2) * (Math.PI / 180));
    camera.aspect = cw / ch;
    camera.position.set(0, 0, top + distance);
    camera.near = distance * 0.25;
    camera.far = distance + top + 400;
    camera.updateProjectionMatrix();
    const spine = { x: pad.left - cw / 2, y: ch / 2 - (pad.top + H / 2) };
    shadow.scale.set(cw * 1.2, ch * 1.2, 1);

    let time = 0;
    let lift = 0;
    let thump = 0;
    let thumpV = 0;
    const close = leaves[0].kicks[1];

    const land = (leaf, i, speed) => {
      if (speed < 3) return;
      if (i === 0 && leaf.kicks[1] === close && time > close.at) {
        thumpV -= 60;
        paper(1.1, 520);
      } else paper(0.25, 1100);
    };

    const step = () => {
      leaves.forEach((leaf, i) => {
        let force = -GRAVITY * Math.cos(leaf.phi) - DRAG * leaf.omega;
        for (const kick of leaf.kicks) {
          if (time < kick.at || time >= kick.at + KICK) continue;
          force += kick.speed / KICK;
          if (!kick.fired) {
            kick.fired = true;
            paper(i === 0 ? 0.9 : 0.45, i === 0 ? 2000 : 2600 + Math.random() * 900);
          }
        }
        leaf.omega += force * STEP;
        leaf.phi += leaf.omega * STEP;
        if (leaf.phi <= 0 || leaf.phi >= Math.PI) {
          const speed = Math.abs(leaf.omega);
          leaf.phi = leaf.phi <= 0 ? 0 : Math.PI;
          leaf.omega = speed < 0.4 ? 0 : -leaf.omega * 0.16;
          land(leaf, i, speed);
        }
        // The free edge drags behind the leaf's swing, then flaps when it lands.
        const resting = leaf.omega === 0;
        leaf.curlV += (CURL_SPRING * (-CURL_DRAG * leaf.omega - leaf.curl) - (resting ? CURL_DAMPING_AT_REST : CURL_DAMPING) * leaf.curlV) * STEP;
        leaf.curl += leaf.curlV * STEP;
      });
      thumpV += (-420 * thump - 26 * thumpV) * STEP;
      thump += thumpV * STEP;
      time += STEP;
    };

    const shape = () => {
      let left = 0;
      for (const leaf of leaves) left += (1 - Math.cos(leaf.phi)) / 2;
      open.value = clamp01(Math.min(left, LEAVES - left) / 1.2);

      // Bend angle at every vertex, from the bottom leaf up, each leaf resting
      // on the one below it, so they never pass through each other.
      for (let i = LEAVES - 1; i >= 0; i--) {
        const { phi, curl, angles } = leaves[i];
        const below = leaves[i + 1]?.angles;
        const gutter = GUTTER * open.value * Math.cos(phi);
        for (let r = 0; r <= ROWS; r++) {
          // The bottom corner leads, like a page lifted by its corner.
          const twist = 1 + 0.45 * (r / ROWS - 0.5);
          for (let j = 0; j <= COLS; j++) {
            const u = j / COLS;
            const k = r * (COLS + 1) + j;
            let a = phi + curl * twist * u ** 1.7 + gutter * (1 - u) ** 4;
            a = Math.min(Math.PI, Math.max(0, a));
            angles[k] = below ? Math.max(a, below[k]) : a;
          }
        }
      }

      // Lay each leaf out along its bent cross-section, hinged at the spine.
      let minX = 0;
      let maxX = W;
      const ds = W / COLS;
      const mid = (ROWS / 2) * (COLS + 1) + COLS / 2;
      leaves.forEach((leaf, i) => {
        const side = (1 - Math.cos(leaf.phi)) / 2;
        const z0 = ((LEAVES - i) * (1 - side) + (i + 1) * side) * THICKNESS;
        const positions = leaf.geometry.attributes.position.array;
        for (let r = 0; r <= ROWS; r++) {
          const y = (0.5 - r / ROWS) * H;
          let x = 0;
          let z = z0;
          for (let j = 0; j <= COLS; j++) {
            const k = r * (COLS + 1) + j;
            if (j > 0) {
              const a = (leaf.angles[k - 1] + leaf.angles[k]) / 2;
              x += ds * Math.cos(a);
              z += ds * Math.sin(a);
            }
            positions[k * 3] = x;
            positions[k * 3 + 1] = y;
            positions[k * 3 + 2] = z;
          }
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
        leaf.geometry.attributes.position.needsUpdate = true;
        leaf.geometry.computeVertexNormals();
        // Shade from the neighbouring leaf on each side while it hovers close.
        const gap = (other, sign) => (other ? (leaf.angles[mid] - other.angles[mid]) * sign : 9);
        const cast = (g) => 0.4 * smoothstep(0.01, 0.1, g) * (1 - smoothstep(0.12, 1.3, g));
        leaf.uniforms.uShadow.value.set(cast(gap(leaves[i - 1], -1)), cast(gap(leaves[i + 1], 1)));
      });

      // The magazine rises and tilts towards the viewer while it is open and
      // comes down with the cover as it shuts.
      const rise = easeOut(clamp01(time / 0.65));
      lift = time >= close.at ? rise * smoothstep(0, 1, (1 - Math.cos(leaves[0].phi)) / 2) : rise;
      group.position.set(spine.x, spine.y, lift * 0.2 * W + thump);
      group.rotation.set(-0.36 * lift, 0.1 * lift, 0.03 * lift);

      // Its shadow on the page: CSS's 0 30px 60px -24px once it lies flat,
      // softer and further off while it floats.
      const inset = 24 + 8 * lift;
      const drop = 30 + 30 * lift;
      shadowUniforms.uRect.value.set(spine.x + minX + inset, spine.y - H / 2 + inset - drop, spine.x + maxX - inset, spine.y + H / 2 - inset - drop);
      shadowUniforms.uSigma.value = 30 + 24 * lift;
      shadowUniforms.uAlpha.value = 0.6 * (1 - 0.4 * lift);
    };

    const settled = () =>
      time > close.at + 0.4 &&
      Math.abs(thump) < 0.05 &&
      Math.abs(thumpV) < 0.5 &&
      leaves.every((leaf) => leaf.omega === 0 && leaf.phi === 0 && Math.abs(leaf.curl) < 0.004 && Math.abs(leaf.curlV) < 0.05);

    return new Promise((resolve) => {
      let last = performance.now();
      let acc = 0;
      let frozen = false;
      // Development only: freeze the animation at a moment, to inspect it.
      if (import.meta.env.DEV) {
        window.__magazineSeek = (seconds) => {
          frozen = true;
          while (time < seconds) step();
          shape();
          renderer.render(scene, camera);
        };
      }
      const frame = (now) => {
        if (frozen) return;
        acc += Math.min((now - last) / 1000, 1 / 20);
        last = now;
        while (acc >= STEP) {
          step();
          acc -= STEP;
        }
        if (settled() || time > 8) {
          // Lay it down exactly flat, then hand back to the photo.
          for (const leaf of leaves) Object.assign(leaf, { phi: 0, omega: 0, curl: 0, curlV: 0 });
          thump = 0;
          time = Math.max(time, close.at);
          shape();
          renderer.render(scene, camera);
          figure.classList.replace('is-flipping', 'is-landing');
          setTimeout(() => {
            dispose();
            figure.classList.remove('is-landing');
            resolve();
          }, 600);
          return;
        }
        shape();
        renderer.render(scene, camera);
        requestAnimationFrame(frame);
      };
      shape();
      renderer.render(scene, camera);
      figure.classList.add('is-flipping');
      requestAnimationFrame(frame);
    });
  }

  return { play, dispose };
}
