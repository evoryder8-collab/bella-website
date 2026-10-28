import {
  AdditiveBlending,
  CanvasTexture,
  CatmullRomCurve3,
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
import { createBloom } from './flowers.js';
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
//   dressed over the chest and hips in sculpted blooms that open as it forms.
// A stage marked data-figure="n" always shows that figure; the home page's
// follows the treatment group in view, and figures dissolve into each other.

const RISE = 1.6; // reveal per second
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
// Blooms over the chest, and a band of them round the hips, front and back:
// [x, y, size, gilded leaves, seed, from behind].
const DRESS = [
  [0.098, 1.172, 0.08, 2, 0.3],
  [-0.098, 1.172, 0.08, 2, 1.7],
  [0.142, 1.226, 0.036, 0, 2.2],
  [-0.142, 1.226, 0.036, 0, 0.9],
  [0, 0.82, 0.088, 3, 0.6],
  [0.058, 0.852, 0.055, 1, 2.9],
  [-0.058, 0.852, 0.055, 1, 4.1],
  [0, 0.895, 0.032, 0, 3.3],
  [0.132, 0.875, 0.05, 1, 5.2],
  [-0.132, 0.875, 0.05, 1, 1.2],
  [0.062, 0.795, 0.095, 2, 1.1, true],
  [-0.062, 0.795, 0.095, 2, 2.4, true],
  [0, 0.872, 0.046, 0, 0.2, true],
];

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
        // Forming and leaving: a grainy dissolve with a glowing edge.
        float grain = fgNoise(vObject * 160.0) * 0.4 + fgNoise(vObject * 38.0) * 0.6;
        float threshold = uReveal * 1.2 - 0.1;
        if (grain > threshold) discard;
        float burn = (1.0 - smoothstep(0.0, 0.12, threshold - grain)) * step(uReveal, 0.999);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float facing = abs(dot(normal, normalize(vViewPosition)));
        totalEmissiveRadiance += uRim * pow(1.0 - facing, 3.2) * 0.45 + uEdge * burn * 1.3;`,
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

function loadGeometry(loader, url) {
  return loader.loadAsync(url).then((gltf) => {
    let geometry = null;
    gltf.scene.traverse((child) => child.isMesh && !geometry && (geometry = child.geometry));
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
  const loader = new GLTFLoader();
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

    // The dress of blooms, each facing out along the body's surface.
    const blooms = [];
    for (const [x, y, size, leaves, seed, behind] of DRESS) {
      const hit = meridians.at(x, y, behind ? RAY_BACK : RAY_FRONT);
      if (!hit) continue;
      const bloom = createBloom({ size, leaves, seed });
      bloom.group.position.copy(hit.point).addScaledVector(hit.normal, size * 0.12);
      bloom.group.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), hit.normal);
      meridians.group.add(bloom.group);
      blooms.push(bloom);
    }

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

    const root = new Group();
    root.add(backGlow, bustPivot, bodyPivot, light, key);
    root.visible = false;
    scene.add(root);

    Object.assign(stage, {
      root,
      backGlow,
      light,
      key,
      bust: { pivot: bustPivot, material: porcelain.material, uniforms: porcelain.uniforms, height: bustHeight, width: halfWidth * 2 },
      body: { pivot: bodyPivot, uniforms: bronze.uniforms, height: bodyHeight, width: bodyBox.max.x - bodyBox.min.x },
      tcm,
      meridians,
      stone,
      stonePath,
      stoneNormals,
      blooms,
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

  const approach = (value, target, dt) => value + Math.sign(target - value) * Math.min(Math.abs(target - value), RISE * dt);

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

        // Turning: the bust sways (less for TCM, so the points face you), the
        // body turns all the way round; both lean towards a nearby finger.
        let lean = 0;
        if (pointerActive && pointer.y > rect.top - 120 && pointer.y < rect.bottom + 120) lean = ((pointer.x - (rect.left + rect.width / 2)) / vw) * 0.9;
        stage.lean = (stage.lean ?? 0) + (lean - (stage.lean ?? 0)) * Math.min(1, dt * 3);
        stage.bust.pivot.rotation.set(0.06 + Math.sin(time * 0.4) * 0.03, Math.sin(time * 0.32) * (0.42 - stage.reveal.tcm * 0.26) + stage.lean, 0);
        stage.body.pivot.rotation.set(0.04, time * 0.34 + stage.lean, 0);
        // Development only: hold the figure at an angle, to inspect it.
        if (import.meta.env.DEV && typeof window.__figureAngle === 'number') stage.body.pivot.rotation.y = stage.bust.pivot.rotation.y = window.__figureAngle;
        const float = Math.sin(time * 0.8) * rect.height * 0.012 * kz;
        stage.bust.pivot.position.y = float;
        stage.body.pivot.position.y = float;

        const shown = Math.max(stage.reveal.bust, stage.reveal.body);
        stage.backGlow.material.opacity = shown * 0.42;
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
        // The blooms unfurl as the figure forms (only re-posed while it changes).
        const bloom = Math.round(stage.reveal.body * 120) / 120;
        if (bloom !== stage.bloomed) {
          stage.bloomed = bloom;
          const eased = 1 - (1 - bloom) ** 3;
          for (const { open } of stage.blooms) open(eased);
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
