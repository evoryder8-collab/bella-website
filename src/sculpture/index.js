import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  PlaneGeometry,
  Points,
  Color,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  DirectionalLight,
  Scene,
  WebGLRenderer,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
} from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createDress } from './flowers.js';
import { magic } from '../sound.js';
import { stoneShape } from '../world/quartz.js';
import bustUrl from '../models/bust.glb?url';
import figureUrl from '../models/figure.glb?url';

// The treatment figures, sculpted in 3D and drawn where each
// [data-figure-stage] sits on the page:
// - Face: a rose-porcelain bust (from Blender's CC0 Human Base Meshes) that
//   turns slowly under a travelling light and dissolves into rose dust at the
//   chest.
// - Signature TCM: the same bust with acupressure points glowing on the face,
//   light flowing along the gua sha lift lines, and a small rose-quartz stone
//   gliding up the cheek.
// - Body: the full figure in rose bronze, after the classic Chinese
//   acupuncture statues, with meridians of light and points, on a slow turn,
//   dressed in a blanket of white and pink flowers across the chest, a bouquet
//   over the hips and one large leaf over the back, all opening as it forms.
// A stage marked data-figure="n" always shows that figure; the home page's
// follows the treatment group in view, and figures dissolve into each other.

// Reveal per second: a sculpture forms over about a second and a half, and
// leaves faster than it came.
const FORM = 0.7;
const LEAVE = 1.8;
const HOLD = 2.2; // seconds the body faces you before it starts to turn
// For Signature TCM the mirror rose gold deepens to satin, so the light on it glows.
const GOLD = new Color('#efc0b0');
const SATIN = new Color('#8a5550');

// Points and lines are given in the models' own metres, seen from the front
// (x across, y up from the bust's cut or the figure's feet), and laid onto the
// surface by casting rays at it. Pairs are mirrored left and right.
const mirror = (list) => list.flatMap(([x, y]) => (x ? [[x, y], [-x, y]] : [[x, y]]));
const mirrorLine = (line) => [line, line.map(([x, y]) => [-x, y])];

const BUST_POINTS = mirror([
  [0, 0.3937], // Baihui
  [0, 0.3046], // Yintang
  [0, 0.21], // Chengjiang
  [0.055, 0.298], // Taiyang
  [0.033, 0.2815], // Sibai
  [0.0358, 0.265], // Quanliao
  [0.01375, 0.2584], // Yingxiang
  [0.0264, 0.2238], // Dicang
  [0.0523, 0.2128], // Jiache
  [0.0385, 0.122], // Quepen
]);
const BUST_LINES = [
  // Jaw, cheek, under the eye, forehead and the lymph path down the neck.
  [[0.0011, 0.1924], [0.022, 0.1946], [0.0413, 0.2045], [0.055, 0.2183], [0.0627, 0.2348]],
  [[0.0099, 0.2529], [0.0275, 0.2573], [0.044, 0.2639], [0.0594, 0.2705]],
  [[0.0176, 0.2859], [0.0358, 0.2859], [0.0523, 0.2925]],
  [[0.002, 0.3255], [0.022, 0.3228], [0.0413, 0.3145], [0.0523, 0.3046]],
  [[0.0627, 0.232], [0.055, 0.188], [0.0468, 0.155], [0.0385, 0.1248]],
].flatMap(mirrorLine);
const STONE_PATH = BUST_LINES[2]; // up the cheek, on the right

const BODY_POINTS = mirror([
  [0, 1.524], // Yintang
  [0, 1.367],
  [0, 1.17],
  [0, 1.0716],
  [0, 0.995],
  [0, 0.94],
  [0, 0.8856], // Ren vessel
  [0.06125, 0.995], // Tianshu
  [0.09625, 0.3825], // Zusanli
  [0.1203, 0.0719], // Jiexi
  [0.105, 0.1638], // Sanyinjiao
  [0.1422, 1.3056], // Zhongfu
  [0.328, 0.8966], // Neiguan
  [0.3806, 0.7653], // Hegu
]);
const RAY_FRONT = 1;
const RAY_BACK = -1;
const BODY_LINES = [
  { side: RAY_FRONT, points: Array.from({ length: 11 }, (_, i) => [0, 1.4 - i * 0.059]) }, // Ren
  { side: RAY_BACK, points: Array.from({ length: 13 }, (_, i) => [0, 1.6 - i * 0.062]) }, // Du, down the spine
  ...mirrorLine([
    [0.02625, 1.4806], [0.07, 1.3669], [0.09625, 1.17], [0.06125, 1.0278], [0.0525, 0.82],
    [0.083125, 0.645], [0.09625, 0.4372], [0.109375, 0.2403], [0.1203, 0.0719], [0.1378, 0.0063],
  ]).map((points) => ({ side: RAY_FRONT, points })), // Stomach
  ...mirrorLine([[0.1422, 1.3056], [0.2078, 1.1919], [0.2516, 1.0388], [0.3019, 0.9294], [0.3544, 0.8309], [0.3894, 0.7325]]).map(
    (points) => ({ side: RAY_FRONT, points }),
  ), // Lung, down the arms
];

// A soft round glow, drawn once.
let glowTexture = null;
const glow = () => {
  if (glowTexture) return glowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  glowTexture = new CanvasTexture(canvas);
  return glowTexture;
};

const noise = /* glsl */ `
  float fgHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float fgNoise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(fgHash(i), fgHash(i + vec3(1, 0, 0)), f.x), mix(fgHash(i + vec3(0, 1, 0)), fgHash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(fgHash(i + vec3(0, 0, 1)), fgHash(i + vec3(1, 0, 1)), f.x), mix(fgHash(i + vec3(0, 1, 1)), fgHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
`;

// A sculpture material: physically lit, with a rose rim of light, and a
// dissolve driven by uReveal (and, for the bust, by height and the shoulder
// cut) that burns away into glowing rose dust instead of a hard edge.
function sculpture(options, { fadeLow = -1, fadeHigh = -1, side = 9 } = {}) {
  const uniforms = {
    uReveal: { value: 0 },
    uHeight: { value: [0, 1] },
    uIntro: { value: 0 },
    uFade: { value: [fadeLow, fadeHigh] },
    uSide: { value: side },
    uRim: { value: new Color(options.rim) },
    uEdge: { value: new Color('#ffb7a8') },
  };
  const material = new MeshPhysicalMaterial(options.physical);
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObject;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObject = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vObject;
        uniform float uReveal;
        uniform vec2 uHeight;
        uniform float uIntro;
        uniform vec2 uFade;
        uniform float uSide;
        uniform vec3 uRim;
        uniform vec3 uEdge;
        ${noise}`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        // The bust's cut edges fade out softly in a fine screen-space dither.
        float fade = 1.0;
        if (uFade.y > 0.0) fade *= smoothstep(uFade.x, uFade.y, vObject.y);
        fade *= 1.0 - smoothstep(uSide * 0.7, uSide, abs(vObject.x));
        float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        if (dither > fade * 1.02) discard;
        // Forming and leaving: it materialises upwards from its base, the
        // edge a glowing line of rose-gold light with a fine grain.
        float grain = fgNoise(vObject * 160.0) * 0.4 + fgNoise(vObject * 38.0) * 0.6;
        float rise = clamp((vObject.y - uHeight.x) / (uHeight.y - uHeight.x), 0.0, 1.0) * 0.84 + grain * 0.16;
        float threshold = uReveal * 1.08 - 0.02;
        if (rise > threshold) discard;
        float burn = (1.0 - smoothstep(0.0, 0.045, threshold - rise)) * step(uReveal, 0.999);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float facing = abs(dot(normal, normalize(vViewPosition)));
        totalEmissiveRadiance += uRim * pow(1.0 - facing, 3.0) * (0.5 + uIntro * 1.2) + uEdge * burn * 3.2;`,
      );
  };
  return { material, uniforms };
}

// Light flowing along a line, which draws itself in with uReveal.
const lineVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const lineFragment = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform float uSeed;
  uniform vec3 uColor;
  uniform vec3 uFlash;
  varying vec2 vUv;
  void main() {
    if (vUv.x > uReveal * 1.1 - 0.05) discard;
    float p = fract(vUv.x - uTime * 0.32 + uSeed);
    float pulse = exp(-pow(p - 0.5, 2.0) * 90.0);
    gl_FragColor = vec4(mix(uColor, uFlash, pulse), (0.62 + 0.38 * pulse) * min(1.0, uReveal * 1.5));
  }
`;

// Rose-gold sparkles rising round a sculpture and twinkling.
const sparkVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float t = uTime * (0.05 + aSeed * 0.06) + aSeed * 7.0;
    p.y = fract(p.y + t) - 0.5;
    p.x += sin(uTime * 0.6 + aSeed * 30.0) * 0.04;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (0.5 + aSeed);
    vAlpha = smoothstep(0.5, 0.25, abs(p.y)) * (0.45 + 0.55 * sin(uTime * 2.2 + aSeed * 40.0));
  }
`;
const sparkFragment = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float star = max(0.0, 1.0 - d * 2.0);
    star = star * star + max(0.0, 1.0 - abs(c.x) * 14.0) * max(0.0, 1.0 - abs(c.y) * 2.4) * 0.5 + max(0.0, 1.0 - abs(c.y) * 14.0) * max(0.0, 1.0 - abs(c.x) * 2.4) * 0.5;
    gl_FragColor = vec4(uColor, star * vAlpha * uOpacity);
  }
`;

function sparkles(count) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.32 + Math.random() * 0.22;
    positions.set([Math.cos(a) * r, Math.random(), Math.sin(a) * r * 0.6], i * 3);
    seeds[i] = Math.random();
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  const uniforms = { uTime: { value: 0 }, uSize: { value: 9 }, uPixelRatio: { value: Math.min(2, window.devicePixelRatio || 1) }, uOpacity: { value: 0 }, uColor: { value: new Color('#ffd9c8') } };
  const points = new Points(geometry, new ShaderMaterial({ uniforms, vertexShader: sparkVertex, fragmentShader: sparkFragment, transparent: true, depthWrite: false, blending: AdditiveBlending }));
  points.frustumCulled = false;
  return { points, uniforms };
}

// The surface of a model as seen straight from the front (side 1) or the back
// (side -1): the point and smooth normal under (x, y). Triangles are sorted
// into a grid of cells across x and y, so each lookup only tests the few
// beneath it, fast enough to lay hundreds of flowers, lines and points.
function surface(geometry, cell = 0.012) {
  const position = geometry.attributes.position.array;
  const normals = geometry.attributes.normal.array;
  const index = geometry.index.array;
  const { min, max } = geometry.boundingBox;
  const nx = Math.ceil((max.x - min.x) / cell) + 1;
  const ny = Math.ceil((max.y - min.y) / cell) + 1;
  const cells = Array.from({ length: nx * ny }, () => []);
  const cx = (x) => Math.min(nx - 1, Math.max(0, Math.floor((x - min.x) / cell)));
  const cy = (y) => Math.min(ny - 1, Math.max(0, Math.floor((y - min.y) / cell)));
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [index[t] * 3, index[t + 1] * 3, index[t + 2] * 3];
    const x0 = cx(Math.min(position[a], position[b], position[c]));
    const x1 = cx(Math.max(position[a], position[b], position[c]));
    const y0 = cy(Math.min(position[a + 1], position[b + 1], position[c + 1]));
    const y1 = cy(Math.max(position[a + 1], position[b + 1], position[c + 1]));
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) cells[j * nx + i].push(t);
  }
  return (x, y, side = RAY_FRONT) => {
    if (x < min.x || x > max.x || y < min.y || y > max.y) return null;
    let best = -Infinity;
    let hit = null;
    for (const t of cells[cy(y) * nx + cx(x)]) {
      const [a, b, c] = [index[t] * 3, index[t + 1] * 3, index[t + 2] * 3];
      const d = (position[b + 1] - position[c + 1]) * (position[a] - position[c]) + (position[c] - position[b]) * (position[a + 1] - position[c + 1]);
      if (Math.abs(d) < 1e-14) continue;
      const l1 = ((position[b + 1] - position[c + 1]) * (x - position[c]) + (position[c] - position[b]) * (y - position[c + 1])) / d;
      const l2 = ((position[c + 1] - position[a + 1]) * (x - position[c]) + (position[a] - position[c]) * (y - position[c + 1])) / d;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      const z = l1 * position[a + 2] + l2 * position[b + 2] + l3 * position[c + 2];
      if (z * side > best) {
        best = z * side;
        hit = [a, b, c, l1, l2, l3, z];
      }
    }
    if (!hit) return null;
    const [a, b, c, l1, l2, l3, z] = hit;
    const normal = new Vector3(
      l1 * normals[a] + l2 * normals[b] + l3 * normals[c],
      l1 * normals[a + 1] + l2 * normals[b + 1] + l3 * normals[c + 1],
      l1 * normals[a + 2] + l2 * normals[b + 2] + l3 * normals[c + 2],
    ).normalize();
    if (normal.z * side < 0) normal.z *= -1;
    return { point: new Vector3(x, y, z), normal: normal.normalize() };
  };
}

// The models are meshopt-compressed with quantized positions: decode them to
// plain floats in model metres (the node's transform undoes the quantization).
function loadGeometry(loader, url) {
  return loader.loadAsync(url).then((gltf) => {
    let mesh = null;
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((child) => child.isMesh && !mesh && (mesh = child));
    const source = mesh.geometry.attributes.position;
    const positions = new Float32Array(source.count * 3);
    for (let i = 0; i < source.count; i++) {
      positions[i * 3] = source.getX(i);
      positions[i * 3 + 1] = source.getY(i);
      positions[i * 3 + 2] = source.getZ(i);
    }
    let geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setIndex(mesh.geometry.index);
    geometry.applyMatrix4(mesh.matrixWorld);
    geometry = mergeVertices(geometry, 1e-5);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    return geometry;
  });
}

// The glowing acupoints and the flowing lines over a model.
function overlay(at, points, lines, { color, flash, pointColor, size, radius }) {
  const group = new Group();
  const lineUniforms = [];
  const pulses = [];
  const dot = new SphereGeometry(size, 12, 10);

  lines.forEach((line, i) => {
    const { side = RAY_FRONT, points: path } = Array.isArray(line) ? { points: line } : line;
    const samples = [];
    for (let j = 0; j < path.length - 1; j++) {
      for (let s = 0; s < 4; s++) {
        const t = s / 4;
        const hit = at(path[j][0] + (path[j + 1][0] - path[j][0]) * t, path[j][1] + (path[j + 1][1] - path[j][1]) * t, side);
        if (hit) samples.push(hit.point.addScaledVector(hit.normal, radius * 1.6));
      }
    }
    const end = at(...path[path.length - 1], side);
    if (end) samples.push(end.point.addScaledVector(end.normal, radius * 1.6));
    if (samples.length < 2) return;
    const uniforms = {
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uSeed: { value: i * 0.37 },
      uColor: { value: new Color(color) },
      uFlash: { value: new Color(flash) },
    };
    lineUniforms.push(uniforms);
    const tube = new TubeGeometry(new CatmullRomCurve3(samples), samples.length * 6, radius, 6, false);
    group.add(
      new Mesh(tube, new ShaderMaterial({ uniforms, vertexShader: lineVertex, fragmentShader: lineFragment, transparent: true, depthWrite: false, blending: AdditiveBlending })),
    );
  });

  points.forEach(([x, y], i) => {
    const hit = at(x, y);
    if (!hit) return;
    const marker = new Group();
    marker.position.copy(hit.point).addScaledVector(hit.normal, size * 0.6);
    const core = new Mesh(dot, new MeshBasicMaterial({ color: pointColor, transparent: true, opacity: 0 }));
    const halo = new Sprite(new SpriteMaterial({ map: glow(), color: flash, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }));
    halo.scale.setScalar(size * 6.5);
    marker.add(core, halo);
    group.add(marker);
    pulses.push({ marker, core, halo, phase: i * 0.55 });
  });

  return {
    group,
    at,
    update(time, reveal) {
      for (const uniforms of lineUniforms) {
        uniforms.uTime.value = time;
        uniforms.uReveal.value = reveal;
      }
      for (const { marker, core, halo, phase } of pulses) {
        const beat = Math.max(0, Math.sin(time * 1.6 - phase));
        marker.scale.setScalar(Math.max(0.001, reveal) * (1 + beat * 0.45));
        core.material.opacity = reveal;
        halo.material.opacity = reveal * (0.25 + beat * 0.45);
      }
    },
  };
}

// ---- The models: loaded once for every stage, with their surface lookups ----
let assets = null;
const loadAssets = () =>
  (assets ??= (() => {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    return Promise.all([loadGeometry(loader, bustUrl), loadGeometry(loader, figureUrl)]).then(([bust, figure]) => ({
      bust,
      figure,
      bustAt: surface(bust, 0.01),
      bodyAt: surface(figure, 0.015),
    }));
  })());

const approachTo = (value, target, dt) => value + Math.sign(target - value) * Math.min(Math.abs(target - value), (target > value ? FORM : LEAVE) * dt);
const ease = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const idle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 400 }) : setTimeout(fn, 30));

// Everything one stage shows, in a unit space: each sculpture is scaled to a
// height of about one, the camera frames 1.1 units of height.
function buildSet({ bust, figure, bustAt, bodyAt }) {
  const bustBox = bust.boundingBox;
  const bustHeight = bustBox.max.y - bustBox.min.y;
  const halfWidth = (bustBox.max.x - bustBox.min.x) / 2;

  const porcelain = sculpture(
    {
      // Polished rose gold: the studio light it reflects models the face.
      physical: { color: '#efc0b0', roughness: 0.2, metalness: 1, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.18, iridescenceIOR: 1.35, envMapIntensity: 1.15 },
      rim: '#f4a6a2',
    },
    { fadeLow: bustBox.min.y + bustHeight * 0.04, fadeHigh: bustBox.min.y + bustHeight * 0.36, side: halfWidth },
  );
  const bronze = sculpture({
    physical: { color: '#b97a6e', roughness: 0.3, metalness: 0.86, clearcoat: 0.35, clearcoatRoughness: 0.18, envMapIntensity: 1.25 },
    rim: '#ffb8a6',
  });
  porcelain.uniforms.uHeight.value = [bustBox.min.y + bustHeight * 0.18, bustBox.max.y];
  bronze.uniforms.uHeight.value = [figure.boundingBox.min.y, figure.boundingBox.max.y];
  const bustMesh = new Mesh(bust, porcelain.material);
  const bodyMesh = new Mesh(figure, bronze.material);

  // TCM: points and lift lines on the face, and the stone up the cheek.
  const tcm = overlay(bustAt, BUST_POINTS, BUST_LINES, { color: '#c98760', flash: '#fff3e6', pointColor: '#fff6ee', size: 0.0034, radius: 0.0014 });
  const stoneGeometry = new ExtrudeGeometry(stoneShape(), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 6, curveSegments: 48 });
  stoneGeometry.center();
  const stone = new Mesh(
    stoneGeometry,
    new MeshPhysicalMaterial({ color: '#f8c9c6', roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0.4, iridescenceIOR: 1.4, sheen: 1, sheenColor: '#ffffff', emissive: '#ff8f97', emissiveIntensity: 0.28, transparent: true, opacity: 0 }),
  );
  stone.scale.setScalar(0.028);
  const glide = [];
  for (let j = 0; j < STONE_PATH.length - 1; j++) {
    for (let s = 0; s < 6; s++) {
      const t = s / 6;
      const hit = bustAt(STONE_PATH[j][0] + (STONE_PATH[j + 1][0] - STONE_PATH[j][0]) * t, STONE_PATH[j][1] + (STONE_PATH[j + 1][1] - STONE_PATH[j][1]) * t);
      if (hit) glide.push(hit);
    }
  }
  const stonePath = glide.length > 1 ? new CatmullRomCurve3(glide.map(({ point, normal }) => point.clone().addScaledVector(normal, 0.006))) : null;
  const stoneNormals = glide.map(({ normal }) => normal);
  tcm.group.add(stone);

  // Body: meridians, points and the dress of flowers and the leaf.
  const meridians = overlay(bodyAt, BODY_POINTS, BODY_LINES, { color: '#ffcf9a', flash: '#fff4e2', pointColor: '#ffe7c4', size: 0.0085, radius: 0.0028 });
  const dress = createDress(bodyAt);
  meridians.group.add(dress.group);

  // Each sculpture turns about its own centre, scaled to a height of 0.94.
  const pivot = (content, box, height) => {
    const inner = new Group();
    inner.add(...content);
    inner.position.y = -(box.min.y + height / 2);
    const outer = new Group();
    outer.add(inner);
    outer.scale.setScalar(0.94 / height);
    return outer;
  };
  const bodyBox = figure.boundingBox;
  const bodyHeight = bodyBox.max.y - bodyBox.min.y;
  const bustPivot = pivot([bustMesh, tcm.group], bustBox, bustHeight);
  const bodyPivot = pivot([bodyMesh, meridians.group], bodyBox, bodyHeight);

  // A soft rose glow behind, a light that travels round, a key from the upper
  // left, sparkles, and a pool of light under the figure's feet.
  const backGlow = new Sprite(new SpriteMaterial({ map: glow(), color: '#f2b2ab', transparent: true, opacity: 0, depthWrite: false }));
  backGlow.position.z = -0.5;
  backGlow.scale.setScalar(1.25);
  const light = new PointLight('#ffe0d6', 0, 3, 1.4);
  const key = new PointLight('#fff4ee', 0, 6, 1.2);
  key.position.set(-1.1, 0.5, 0.55);
  const spark = sparkles(56);
  spark.points.scale.set(1.15, 1.1, 1.15);
  const pedestal = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: glow(), color: '#ffb9a9', transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }));
  pedestal.rotation.x = -Math.PI / 2;
  pedestal.scale.setScalar(((bodyBox.max.x - bodyBox.min.x) * 0.94 * 1.9) / bodyHeight);

  const root = new Group();
  root.add(backGlow, bustPivot, bodyPivot, light, key, spark.points, pedestal);
  return {
    root,
    backGlow,
    light,
    key,
    spark,
    pedestal,
    tcm,
    meridians,
    dress,
    stone,
    stonePath,
    stoneNormals,
    bust: { pivot: bustPivot, material: porcelain.material, uniforms: porcelain.uniforms },
    body: { pivot: bodyPivot, uniforms: bronze.uniforms },
  };
}

// One stage: its own canvas inside the [data-figure-stage] box, drawn at the
// screen's full sharpness, rendering only while it is on screen.
function createStage(el, { group, pointer, signal }) {
  const fixed = el.dataset.figure ? Number(el.dataset.figure) : null;
  let renderer = null;
  let set = null;
  let scene = null;
  let camera = null;
  let running = false;
  let onscreen = false;
  let frame = 0;
  let last = 0;
  let time = 0;
  let seen = false;
  let angle = 0;
  let lean = 0;
  let bloomed = -1;
  const clock = { bust: 0, body: 0 };
  const reveal = { bust: 0, tcm: 0, body: 0 };

  const resize = () => {
    if (!renderer) return;
    const { width, height } = el.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Fit 1.1 units of height, or the width of the body if the box is narrow.
    camera.position.z = Math.max(0.55, 0.36 / camera.aspect) / Math.tan((camera.fov / 2) * (Math.PI / 180));
    camera.updateProjectionMatrix();
  };

  // Built ahead of time, while the box is still well below the screen, with
  // every shader compiled, so a tap on a group starts its figure at once.
  const prepare = () => {
    if (renderer || signal.aborted) return;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    renderer.toneMapping = NeutralToneMapping;
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.className = 'figure-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    el.append(canvas);
    scene = new Scene();
    scene.environment = new PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.85;
    const sun = new DirectionalLight('#fff3ec', 1.6);
    sun.position.set(2, 4, 5);
    const rim = new DirectionalLight('#f2aaaa', 0.9);
    rim.position.set(-4, -1, 2);
    scene.add(sun, rim);
    camera = new PerspectiveCamera(28, 1, 0.1, 20);
    resize();
    start();
    loadAssets()
      .then((loaded) =>
        idle(() => {
          if (signal.aborted) return;
          set = buildSet(loaded);
          scene.add(set.root);
          // Compile every material now: show all the parts once, then hide them again.
          set.dress.open(1);
          return renderer.compileAsync(scene, camera).then(() => {
            set.dress.open(0);
            el.dataset.figureReady = '';
          });
        }),
      )
      .catch((error) => console.warn('Treatment figure unavailable:', error));
  };

  const render = (now) => {
    frame = 0;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    time += dt;
    if (set) update(dt);
    renderer.render(scene, camera);
    if (running) frame = requestAnimationFrame(render);
  };

  function update(dt) {
    const rect = el.getBoundingClientRect();
    // The figure forms the first time its box is well in view.
    if (!seen && rect.top < innerHeight * 0.85) seen = true;
    const g = fixed ?? group();
    const target = seen ? { bust: g < 2 ? 1 : 0, tcm: g === 1 ? 1 : 0, body: g === 2 ? 1 : 0 } : { bust: 0, tcm: 0, body: 0 };
    // The new figure starts forming at once while the old one dissolves.
    reveal.bust = approachTo(reveal.bust, target.bust, dt);
    reveal.body = approachTo(reveal.body, target.body, dt);
    reveal.tcm = approachTo(reveal.tcm, target.tcm && reveal.bust > 0.25 ? 1 : 0, dt * 1.4);
    const { bust, body } = set;
    bust.pivot.visible = reveal.bust > 0;
    body.pivot.visible = reveal.body > 0;
    bust.uniforms.uReveal.value = reveal.bust;
    body.uniforms.uReveal.value = reveal.body;

    // Always presented facing you: each sculpture's clock starts as it forms;
    // the bust settles into a sway, the body holds a moment, then turns.
    for (const part of ['bust', 'body']) clock[part] = reveal[part] > 0 ? clock[part] + dt : 0;
    if (!reveal.body) angle = 0;
    angle += 0.34 * ease(HOLD, HOLD + 2.6, clock.body) * dt;
    let reach = 0;
    if (performance.now() - pointer.at < 2500 && pointer.y > rect.top - 120 && pointer.y < rect.bottom + 120) reach = ((pointer.x - (rect.left + rect.width / 2)) / innerWidth) * 0.9;
    lean += (reach - lean) * Math.min(1, dt * 3);
    const sway = ease(1.2, 3.4, clock.bust) * (0.42 - reveal.tcm * 0.26);
    bust.pivot.rotation.set(0.06 + Math.sin(time * 0.4) * 0.03, Math.sin(clock.bust * 0.32) * sway + lean, 0);
    body.pivot.rotation.set(0.04, angle + Math.sin(clock.body * 0.9) * 0.03 * (1 - ease(HOLD, HOLD + 2, clock.body)) + lean, 0);
    if (import.meta.env.DEV && typeof window.__figureAngle === 'number') body.pivot.rotation.y = bust.pivot.rotation.y = window.__figureAngle;
    // Rising into place as it forms, then floating.
    const float = Math.sin(time * 0.8) * 0.012;
    const arrive = (part) => (1 - ease(0, 1.8, clock[part])) * 0.05;
    bust.pivot.position.y = float - arrive('bust');
    body.pivot.position.y = float - arrive('body');
    const intro = (part) => Math.max(0, 1 - clock[part] / 2.4) * reveal[part];
    bust.uniforms.uIntro.value = intro('bust');
    body.uniforms.uIntro.value = intro('body');

    const shown = Math.max(reveal.bust, reveal.body);
    const flare = Math.max(intro('bust'), intro('body'));
    set.spark.uniforms.uTime.value = time;
    set.spark.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    set.spark.uniforms.uOpacity.value = shown * (0.75 + flare * 0.8);
    set.pedestal.material.opacity = reveal.body * (0.55 + flare * 0.5);
    set.pedestal.position.y = -0.47 + float;
    set.backGlow.material.opacity = shown * (0.42 + flare * 0.3);
    set.key.intensity = shown * 4.5;
    set.light.intensity = shown * 1.4;
    set.light.position.set(Math.cos(time * 0.7) * 0.6, Math.sin(time * 0.45) * 0.3 + 0.18, Math.sin(time * 0.7) * 0.6 + 0.24);

    const deep = reveal.tcm;
    bust.material.color.lerpColors(GOLD, SATIN, deep);
    bust.material.roughness = 0.2 + deep * 0.16;
    bust.material.envMapIntensity = 1.15 - deep * 0.3;
    set.tcm.update(time, reveal.tcm * reveal.bust);
    set.meridians.update(time, reveal.body);
    // The dress unfurls as the figure forms (only re-posed while it changes).
    const bloom = Math.round(reveal.body * 120) / 120;
    if (bloom !== bloomed) {
      bloomed = bloom;
      set.dress.open(1 - (1 - bloom) ** 3);
    }

    // The stone glides up the cheek, lifts away and starts again.
    if (set.stonePath) {
      const cycle = (time % 3.4) / 3.4;
      const s = Math.min(1, cycle / 0.72);
      const eased = s * s * (3 - 2 * s);
      const normal = set.stoneNormals[Math.min(set.stoneNormals.length - 1, Math.round(eased * (set.stoneNormals.length - 1)))];
      const tangent = set.stonePath.getTangentAt(eased);
      set.stone.position.copy(set.stonePath.getPointAt(eased)).addScaledVector(normal, cycle > 0.72 ? (cycle - 0.72) * 0.05 : 0);
      set.stone.matrix.makeBasis(tangent, new Vector3().crossVectors(normal, tangent).normalize(), normal);
      set.stone.quaternion.setFromRotationMatrix(set.stone.matrix);
      const shownStone = cycle < 0.08 ? cycle / 0.08 : cycle > 0.72 ? Math.max(0, 1 - (cycle - 0.72) / 0.2) : 1;
      set.stone.material.opacity = shownStone * reveal.tcm * reveal.bust;
      set.stone.visible = set.stone.material.opacity > 0.01;
    }
  }

  // Prepared well ahead; drawn only while on screen.
  function start() {
    if (!onscreen || !renderer || running) return;
    running = true;
    last = performance.now();
    frame = requestAnimationFrame(render);
  }
  const near = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && prepare(), { rootMargin: '250% 0px' });
  near.observe(el);
  const onScreen = new IntersectionObserver(
    (entries) => {
      onscreen = entries.some((e) => e.isIntersecting);
      if (onscreen) {
        prepare();
        start();
      } else if (running) {
        running = false;
        cancelAnimationFrame(frame);
      }
    },
    { rootMargin: '40px 0px' },
  );
  onScreen.observe(el);
  const sizes = new ResizeObserver(resize);
  sizes.observe(el);

  return () => {
    near.disconnect();
    onScreen.disconnect();
    sizes.disconnect();
    running = false;
    cancelAnimationFrame(frame);
    if (!renderer) return;
    // Losing the context frees everything it held; the models stay loaded for the next page.
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}

// Starts every [data-figure-stage] on the page; the models begin loading now.
export function mountSculptures(stages, { signal }) {
  loadAssets().catch(() => {});
  let wanted = 0;
  document.addEventListener(
    'treatmentgroup',
    (event) => {
      if (event.detail !== wanted) magic();
      wanted = event.detail;
    },
    { signal },
  );
  const pointer = { x: -1, y: -1, at: -1e9 };
  const move = (x, y) => Object.assign(pointer, { x, y, at: performance.now() });
  window.addEventListener('pointermove', (event) => move(event.clientX, event.clientY), { passive: true, signal });
  window.addEventListener('touchmove', (event) => move(event.touches[0].clientX, event.touches[0].clientY), { passive: true, signal });
  const stops = [...stages].map((el) => createStage(el, { group: () => wanted, pointer, signal }));
  signal.addEventListener('abort', () => stops.forEach((stop) => stop()));
}
