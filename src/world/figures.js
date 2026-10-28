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
  PointLight,
  Raycaster,
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
import { createBouquet, createLeaf } from './flowers.js';
import { stoneShape } from './quartz.js';
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
// The dress: a blanket of mostly white and pink flowers across the chest and a
// bouquet over the hips ([x, y, type, colour, size], or [x, y, 'leaf', angle,
// size]), and one large leaf over the back.
const L = Math.PI;
const CHEST = [
  [-0.16, 1.215, 'bud', 'pink', 0.026],
  [-0.12, 1.235, 'blossom', 'white', 0.032],
  [-0.072, 1.238, 'rose', 'pink', 0.04],
  [-0.025, 1.232, 'blossom', 'white', 0.03],
  [0.02, 1.236, 'blossom', 'pink', 0.028],
  [0.065, 1.238, 'rose', 'white', 0.042],
  [0.115, 1.234, 'blossom', 'pink', 0.032],
  [0.158, 1.215, 'bud', 'white', 0.026],
  [-0.15, 1.172, 'rose', 'white', 0.05],
  [-0.096, 1.17, 'peony', 'white', 0.074],
  [-0.03, 1.19, 'rose', 'rose', 0.04],
  [0, 1.155, 'peony', 'pink', 0.05],
  [0.035, 1.195, 'blossom', 'white', 0.03],
  [0.098, 1.17, 'peony', 'pink', 0.074],
  [0.152, 1.172, 'rose', 'white', 0.05],
  [-0.135, 1.118, 'blossom', 'pink', 0.034],
  [-0.075, 1.112, 'rose', 'white', 0.046],
  [-0.025, 1.118, 'bud', 'rose', 0.026],
  [0.03, 1.112, 'rose', 'pink', 0.044],
  [0.085, 1.116, 'blossom', 'white', 0.034],
  [0.135, 1.12, 'rose', 'white', 0.04],
  [-0.185, 1.2, 'leaf', L * 0.95, 0.05],
  [0.185, 1.2, 'leaf', L * 0.05, 0.05],
  [-0.17, 1.12, 'leaf', L * 1.1, 0.045],
  [0.17, 1.12, 'leaf', -L * 0.1, 0.045],
  [-0.05, 1.095, 'leaf', -L * 0.6, 0.04],
  [0.06, 1.095, 'leaf', -L * 0.4, 0.04],
];
const HIPS = [
  [0, 0.825, 'peony', 'white', 0.082],
  [-0.06, 0.852, 'rose', 'pink', 0.05],
  [0.06, 0.852, 'rose', 'pink', 0.05],
  [-0.03, 0.892, 'blossom', 'white', 0.03],
  [0.032, 0.894, 'blossom', 'rose', 0.028],
  [0, 0.77, 'rose', 'pink', 0.042],
  [-0.105, 0.872, 'rose', 'white', 0.042],
  [0.105, 0.872, 'rose', 'white', 0.042],
  [-0.045, 0.79, 'blossom', 'white', 0.03],
  [0.045, 0.79, 'blossom', 'white', 0.03],
  [-0.14, 0.86, 'bud', 'pink', 0.026],
  [0.14, 0.86, 'bud', 'pink', 0.026],
  [-0.16, 0.84, 'leaf', L * 1.05, 0.045],
  [0.16, 0.84, 'leaf', -L * 0.05, 0.045],
  [0, 0.735, 'leaf', -L * 0.5, 0.045],
];
const BACK_LEAF = { top: [0, 0.905], width: 0.29, height: 0.25 };

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

// Rays from in front of (or behind) the model onto its surface.
function surface(mesh) {
  const ray = new Raycaster();
  const origin = new Vector3();
  const direction = new Vector3();
  return (x, y, side = RAY_FRONT) => {
    origin.set(x, y, side * 2);
    direction.set(0, 0, -side);
    ray.set(origin, direction);
    const hit = ray.intersectObject(mesh, false)[0];
    if (!hit) return null;
    const normal = hit.face.normal.clone().transformDirection(mesh.matrixWorld);
    if (normal.z * side < 0) normal.negate();
    return { point: hit.point, normal };
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
function overlay(mesh, points, lines, { color, flash, pointColor, size, radius }) {
  const group = new Group();
  const at = surface(mesh);
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

export function createFigures(scene) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  let assets = null;
  let loading = null;
  let stages = [];
  let wanted = 0;
  document.addEventListener('treatmentgroup', (event) => (wanted = event.detail));

  const load = () =>
    (loading ??= Promise.all([loadGeometry(loader, bustUrl), loadGeometry(loader, figureUrl)])
      .then(([bust, figure]) => {
        assets = { bust, figure };
        stages.forEach(build);
      })
      .catch((error) => console.warn('Treatment figures unavailable:', error)));

  // Each stage gets its own sculptures (materials carry its reveal state).
  function build(stage) {
    if (stage.built || !assets) return;
    stage.built = true;
    const { bust, figure } = assets;
    const bustBox = bust.boundingBox;
    const bustHeight = bustBox.max.y - bustBox.min.y;
    const halfWidth = (bustBox.max.x - bustBox.min.x) / 2;

    const porcelain = sculpture(
      {
        // Polished rose gold: the studio light it reflects models the face.
        physical: {
          color: '#efc0b0',
          roughness: 0.2,
          metalness: 1,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          iridescence: 0.18,
          iridescenceIOR: 1.35,
          envMapIntensity: 1.15,
        },
        rim: '#f4a6a2',
      },
      { fadeLow: bustBox.min.y + bustHeight * 0.04, fadeHigh: bustBox.min.y + bustHeight * 0.36, side: halfWidth },
    );
    const bronze = sculpture({
      physical: {
        color: '#b97a6e',
        roughness: 0.3,
        metalness: 0.86,
        clearcoat: 0.35,
        clearcoatRoughness: 0.18,
        envMapIntensity: 1.25,
      },
      rim: '#ffb8a6',
    });

    const bustMesh = new Mesh(bust, porcelain.material);
    const bodyMesh = new Mesh(figure, bronze.material);
    porcelain.uniforms.uHeight.value = [bustBox.min.y + bustHeight * 0.18, bustBox.max.y];
    bronze.uniforms.uHeight.value = [figure.boundingBox.min.y, figure.boundingBox.max.y];
    for (const mesh of [bustMesh, bodyMesh]) mesh.updateMatrixWorld(true);

    // TCM: points and lift lines on the face, and the stone up the cheek.
    const tcm = overlay(bustMesh, BUST_POINTS, BUST_LINES, { color: '#c98760', flash: '#fff3e6', pointColor: '#fff6ee', size: 0.0034, radius: 0.0014 });
    const stoneGeometry = new ExtrudeGeometry(stoneShape(), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 5, curveSegments: 40 });
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
        const hit = tcm.at(STONE_PATH[j][0] + (STONE_PATH[j + 1][0] - STONE_PATH[j][0]) * t, STONE_PATH[j][1] + (STONE_PATH[j + 1][1] - STONE_PATH[j][1]) * t);
        if (hit) glide.push(hit);
      }
    }
    const stonePath = glide.length > 1 ? new CatmullRomCurve3(glide.map(({ point, normal }) => point.clone().addScaledVector(normal, 0.006))) : null;
    const stoneNormals = glide.map(({ normal }) => normal);
    tcm.group.add(stone);

    // Body: meridians and points on the bronze figure.
    const meridians = overlay(bodyMesh, BODY_POINTS, BODY_LINES, { color: '#ffcf9a', flash: '#fff4e2', pointColor: '#ffe7c4', size: 0.0085, radius: 0.0028 });

    // The dress, laid onto the body's surface.
    const dress = [createBouquet(meridians.at, CHEST), createBouquet(meridians.at, HIPS), createLeaf(meridians.at, BACK_LEAF)].filter(Boolean);
    for (const { group } of dress) meridians.group.add(group);

    // Each sculpture sits in its own turning group, centred on its height.
    const bustGroup = new Group();
    bustGroup.add(bustMesh, tcm.group);
    bustGroup.position.y = -(bustBox.min.y + bustHeight / 2);
    const bustPivot = new Group();
    bustPivot.add(bustGroup);
    const bodyBox = figure.boundingBox;
    const bodyHeight = bodyBox.max.y - bodyBox.min.y;
    const bodyGroup = new Group();
    bodyGroup.add(bodyMesh, meridians.group);
    bodyGroup.position.y = -(bodyBox.min.y + bodyHeight / 2);
    const bodyPivot = new Group();
    bodyPivot.add(bodyGroup);

    // A soft rose glow behind, so the sculpture separates from a pale page,
    // and a light that travels round it.
    const backGlow = new Sprite(new SpriteMaterial({ map: glow(), color: '#f2b2ab', transparent: true, opacity: 0, depthWrite: false }));
    backGlow.position.z = -0.4;
    const light = new PointLight('#ffe0d6', 0, 3, 1.4);
    // A soft key from the upper left that models the face.
    const key = new PointLight('#fff4ee', 0, 6, 1.2);

    // Sparkles round the sculpture, and a pool of light under the figure's feet.
    const spark = sparkles(46);
    const pedestal = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: glow(), color: '#ffb9a9', transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }));
    pedestal.rotation.x = -Math.PI / 2;

    const root = new Group();
    root.add(backGlow, bustPivot, bodyPivot, light, key, spark.points, pedestal);
    root.visible = false;
    scene.add(root);

    Object.assign(stage, {
      root,
      backGlow,
      light,
      key,
      spark,
      pedestal,
      clock: { bust: 0, body: 0 },
      angle: 0,
      bust: { pivot: bustPivot, material: porcelain.material, uniforms: porcelain.uniforms, height: bustHeight, width: halfWidth * 2 },
      body: { pivot: bodyPivot, uniforms: bronze.uniforms, height: bodyHeight, width: bodyBox.max.x - bodyBox.min.x },
      tcm,
      meridians,
      stone,
      stonePath,
      stoneNormals,
      dress,
      bloomed: -1,
      reveal: { bust: 0, tcm: 0, body: 0 },
      dispose() {
        scene.remove(root);
        root.traverse((child) => {
          child.material?.dispose();
          if (child.geometry && child.geometry !== bust && child.geometry !== figure) child.geometry.dispose();
        });
      },
    });
    stage.el.dataset.figureReady = '';
  }

  // Pick up the stages on this page; drop the ones that left with the last.
  const scan = () => {
    stages = stages.filter((stage) => {
      if (stage.el.isConnected) return true;
      stage.dispose?.();
      return false;
    });
    for (const el of document.querySelectorAll('[data-figure-stage]')) {
      if (stages.some((stage) => stage.el === el)) continue;
      const stage = { el, fixed: el.dataset.figure ? Number(el.dataset.figure) : null, seen: false };
      stages.push(stage);
      build(stage);
    }
  };
  scan();

  const approach = (value, target, dt) => value + Math.sign(target - value) * Math.min(Math.abs(target - value), (target > value ? FORM : LEAVE) * dt);
  const ease = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  return {
    refresh: scan,

    update({ vw, vh, k, dt, time, pointer, pointerActive, depth = 0.6, cameraZ }) {
      for (const stage of stages) {
        const rect = stage.el.getBoundingClientRect();
        const near = rect.bottom > -vh && rect.top < vh * 2 && rect.width > 0;
        if (near) load();
        if (!stage.root) continue;
        const visible = rect.bottom > -40 && rect.top < vh + 40 && rect.width > 0;
        stage.root.visible = visible;
        if (!visible) continue;
        // The figure assembles from rose dust the first time it is in view.
        if (!stage.seen && rect.top < vh * 0.85) stage.seen = true;
        const group = stage.fixed ?? wanted;
        const target = stage.seen ? { bust: group < 2 ? 1 : 0, tcm: group === 1 ? 1 : 0, body: group === 2 ? 1 : 0 } : { bust: 0, tcm: 0, body: 0 };
        // Dissolve out before the next figure forms.
        const leaving = (target.bust === 0 && stage.reveal.bust > 0) || (target.body === 0 && stage.reveal.body > 0);
        stage.reveal.bust = approach(stage.reveal.bust, target.bust && !(target.body === 0 && stage.reveal.body > 0.02) ? 1 : 0, dt);
        stage.reveal.body = approach(stage.reveal.body, target.body && !(stage.reveal.bust > 0.02) ? 1 : 0, dt);
        stage.reveal.tcm = approach(stage.reveal.tcm, target.tcm && stage.reveal.bust > 0.6 ? 1 : 0, dt * (leaving ? 2 : 0.8));

        // Screen place and size, at the sculpture's depth.
        const kz = (k * (cameraZ - depth)) / cameraZ;
        stage.root.position.set((rect.left + rect.width / 2 - vw / 2) * kz, -(rect.top + rect.height / 2 - vh / 2) * kz, depth);
        const fit = (part) => Math.min((rect.height * 0.94 * kz) / part.height, (rect.width * 0.9 * kz) / part.width);
        stage.bust.pivot.scale.setScalar(fit(stage.bust));
        stage.body.pivot.scale.setScalar(fit(stage.body));
        stage.bust.pivot.visible = stage.reveal.bust > 0;
        stage.body.pivot.visible = stage.reveal.body > 0;
        stage.bust.uniforms.uReveal.value = stage.reveal.bust;
        stage.body.uniforms.uReveal.value = stage.reveal.body;

        // Each sculpture's own clock starts when it begins to form, so it is
        // always presented facing you: the bust settles into a gentle sway,
        // the body holds still a moment, breathing, then eases into a turn.
        for (const part of ['bust', 'body']) stage.clock[part] = stage.reveal[part] > 0 ? stage.clock[part] + dt : 0;
        if (!stage.reveal.body) stage.angle = 0;
        stage.angle += 0.34 * ease(HOLD, HOLD + 2.6, stage.clock.body) * dt;
        let lean = 0;
        if (pointerActive && pointer.y > rect.top - 120 && pointer.y < rect.bottom + 120) lean = ((pointer.x - (rect.left + rect.width / 2)) / vw) * 0.9;
        stage.lean = (stage.lean ?? 0) + (lean - (stage.lean ?? 0)) * Math.min(1, dt * 3);
        const sway = ease(1.2, 3.4, stage.clock.bust) * (0.42 - stage.reveal.tcm * 0.26);
        stage.bust.pivot.rotation.set(0.06 + Math.sin(time * 0.4) * 0.03, Math.sin(stage.clock.bust * 0.32) * sway + stage.lean, 0);
        stage.body.pivot.rotation.set(0.04, stage.angle + Math.sin(stage.clock.body * 0.9) * 0.03 * (1 - ease(HOLD, HOLD + 2, stage.clock.body)) + stage.lean, 0);
        // Development only: hold the figure at an angle, to inspect it.
        if (import.meta.env.DEV && typeof window.__figureAngle === 'number') stage.body.pivot.rotation.y = stage.bust.pivot.rotation.y = window.__figureAngle;
        // Rising into place as it forms, then floating.
        const float = Math.sin(time * 0.8) * rect.height * 0.012 * kz;
        const arrive = (part) => (1 - ease(0, 1.8, stage.clock[part])) * rect.height * 0.05 * kz;
        stage.bust.pivot.position.y = float - arrive('bust');
        stage.body.pivot.position.y = float - arrive('body');
        const intro = (part) => Math.max(0, 1 - stage.clock[part] / 2.4) * stage.reveal[part];
        stage.bust.uniforms.uIntro.value = intro('bust');
        stage.body.uniforms.uIntro.value = intro('body');

        const shown = Math.max(stage.reveal.bust, stage.reveal.body);
        const flare = Math.max(intro('bust'), intro('body'));
        stage.spark.uniforms.uTime.value = time;
        stage.spark.uniforms.uOpacity.value = shown * (0.75 + flare * 0.8);
        stage.spark.points.scale.set(rect.height * kz * 1.1, rect.height * kz * 1.05, rect.height * kz * 1.1);
        stage.pedestal.material.opacity = stage.reveal.body * (0.55 + flare * 0.5);
        stage.pedestal.scale.setScalar(stage.body.width * fit(stage.body) * 1.9);
        stage.pedestal.position.set(0, -(rect.height * 0.94 * kz) / 2 + float, 0);
        stage.backGlow.material.opacity = shown * (0.42 + flare * 0.3);
        stage.backGlow.scale.setScalar(rect.height * kz * 1.15);
        const reach = rect.height * kz;
        stage.key.position.set(-reach * 1.1, reach * 0.5, reach * 0.55);
        stage.key.distance = reach * 5;
        stage.key.intensity = shown * 4.5;
        stage.light.intensity = shown * 1.4;
        const orbit = rect.height * kz * 0.6;
        stage.light.position.set(Math.cos(time * 0.7) * orbit, Math.sin(time * 0.45) * orbit * 0.5 + orbit * 0.3, Math.sin(time * 0.7) * orbit + orbit * 0.4);
        stage.light.distance = rect.height * kz * 3;

        const deep = stage.reveal.tcm;
        stage.bust.material.color.lerpColors(GOLD, SATIN, deep);
        stage.bust.material.roughness = 0.2 + deep * 0.16;
        stage.bust.material.envMapIntensity = 1.15 - deep * 0.3;
        stage.tcm.update(time, stage.reveal.tcm * stage.reveal.bust);
        stage.meridians.update(time, stage.reveal.body);
        // The dress unfurls as the figure forms (only re-posed while it changes).
        const bloom = Math.round(stage.reveal.body * 120) / 120;
        if (bloom !== stage.bloomed) {
          stage.bloomed = bloom;
          const eased = 1 - (1 - bloom) ** 3;
          for (const { open } of stage.dress) open(eased);
        }

        // The stone glides up the cheek, lifts away and starts again.
        if (stage.stonePath) {
          const cycle = (time % 3.4) / 3.4;
          const s = Math.min(1, cycle / 0.72);
          const eased = s * s * (3 - 2 * s);
          const at = stage.stonePath.getPointAt(eased);
          const tangent = stage.stonePath.getTangentAt(eased);
          const normal = stage.stoneNormals[Math.min(stage.stoneNormals.length - 1, Math.round(eased * (stage.stoneNormals.length - 1)))];
          stage.stone.position.copy(at).addScaledVector(normal, cycle > 0.72 ? (cycle - 0.72) * 0.05 : 0);
          const side = new Vector3().crossVectors(normal, tangent).normalize();
          stage.stone.matrix.makeBasis(tangent, side, normal);
          stage.stone.quaternion.setFromRotationMatrix(stage.stone.matrix);
          const visibleStone = cycle < 0.08 ? cycle / 0.08 : cycle > 0.72 ? Math.max(0, 1 - (cycle - 0.72) / 0.2) : 1;
          stage.stone.material.opacity = visibleStone * stage.reveal.tcm * stage.reveal.bust;
          stage.stone.visible = stage.stone.material.opacity > 0.01;
        }
      }
    },
  };
}
