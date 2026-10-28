import {
  CanvasTexture,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { STONE_SEGMENTS, stoneShape } from './world/quartz.js';

// The floating social links as small rose-quartz gua sha stones, each with its
// network's mark inlaid in deep rose gold on both faces. They stand where the
// links are, turning slowly and bobbing as if held in water, turn to face a
// mouse or finger that comes near, and follow the links' own arrival
// (src/styles.css) once the page is first scrolled. The links stay underneath
// for clicks, focus and screen readers, and keep their gems without WebGL.

const FOV = 30;
const PAD = 26; // px of canvas round the dock: room to turn and float
const LENGTH = 1.3; // a stone's length, in link widths
const SPIN = 0.42; // radians a second

// The mark (a 24-unit simple-icons path) in white, to tint as rose gold.
function mark(path) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  g.translate(size / 2, size / 2);
  g.scale(size / 26, size / 26);
  g.translate(-12, -12);
  g.fillStyle = '#fff';
  g.fill(new Path2D(path));
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const ease = (from, to, rate, dt) => from + (to - from) * Math.min(1, dt * rate);

export function initSocialStones(dock) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return;
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
  renderer.toneMapping = NeutralToneMapping;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = 'socials-stage';
  canvas.setAttribute('aria-hidden', 'true');
  dock.prepend(canvas);

  const scene = new Scene();
  scene.environment = new PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;
  const key = new DirectionalLight('#fff3ec', 1.5);
  key.position.set(-2, 3, 4);
  scene.add(key);
  const camera = new PerspectiveCamera(FOV, 1, 1, 4000);

  // The gua sha of the world, stood upright and smoothed into a pebble.
  let geometry = new ExtrudeGeometry(stoneShape(), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 8, curveSegments: STONE_SEGMENTS });
  geometry.deleteAttribute('uv');
  geometry.deleteAttribute('normal');
  geometry = mergeVertices(geometry, 1e-4);
  geometry.computeVertexNormals();
  geometry.center();
  geometry.rotateZ(Math.PI / 2);
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const tall = max.y - min.y;
  const wide = max.x - min.x;
  const face = max.z + 0.004;
  const plane = new PlaneGeometry(1, 1);

  const stones = [...dock.querySelectorAll('.social')].map((link, i) => {
    const group = new Group();
    const quartz = new MeshPhysicalMaterial({
      color: '#f0b9b8',
      roughness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      iridescence: 0.3,
      iridescenceIOR: 1.3,
      sheen: 0.4,
      sheenColor: '#ffe8e4',
      emissive: '#ff9aa2',
      emissiveIntensity: 0.05,
      envMapIntensity: 1.6,
      transparent: true,
    });
    group.add(new Mesh(geometry, quartz));
    const path = link.querySelector('svg path')?.getAttribute('d');
    const gold = path
      ? new MeshPhysicalMaterial({ map: mark(path), color: '#a3584f', metalness: 0.7, roughness: 0.28, envMapIntensity: 1.3, transparent: true, depthWrite: false })
      : null;
    if (gold) {
      for (const side of [1, -1]) {
        const inlay = new Mesh(plane, gold);
        inlay.position.z = side * face;
        inlay.rotation.y = side > 0 ? 0 : Math.PI;
        inlay.scale.setScalar(wide * 0.8);
        group.add(inlay);
      }
    }
    scene.add(group);
    const state = { link, group, quartz, gold, phase: i * 2.1, spin: i * 1.3, near: false, lift: 0 };
    const near = (value) => () => (state.near = value);
    link.addEventListener('pointerenter', near(true));
    link.addEventListener('pointerleave', near(false));
    link.addEventListener('focus', near(true));
    link.addEventListener('blur', near(false));
    return state;
  });
  dock.classList.add('is-3d');

  let width = 0;
  let height = 0;
  const resize = () => {
    const box = dock.getBoundingClientRect();
    width = box.width + PAD * 2;
    height = box.height + PAD * 2;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // One unit is one CSS pixel at the depth the stones stand in.
    camera.position.z = height / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  let last = performance.now();
  let time = 0;
  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (document.hidden || getComputedStyle(dock).visibility === 'hidden') return;
    time += dt;
    const box = dock.getBoundingClientRect();
    for (const stone of stones) {
      const { link, group } = stone;
      const r = link.getBoundingClientRect();
      const size = link.offsetWidth || 46;
      // Follows the link's own arrival (it flies in small from the right).
      const arrive = r.width / size;
      const opacity = Number(getComputedStyle(link).opacity);
      stone.lift = ease(stone.lift, stone.near ? 1 : 0, 6, dt);
      const bob = reduced ? 0 : Math.sin(time * 0.9 + stone.phase) * 3.5;
      group.position.set(r.left + r.width / 2 - box.left + PAD - width / 2, height / 2 - (r.top + r.height / 2 - box.top + PAD) + bob, 0);
      group.scale.setScalar(((size * LENGTH) / tall) * arrive * (1 + stone.lift * 0.12));
      // A slow turn; near a finger or mouse it settles face-on, mark forward.
      if (stone.near || reduced) stone.spin = ease(stone.spin, Math.round(stone.spin / Math.PI) * Math.PI, 7, dt);
      else stone.spin += SPIN * dt;
      group.rotation.set(reduced ? 0 : Math.sin(time * 0.7 + stone.phase) * 0.14, stone.spin, reduced ? 0 : Math.sin(time * 0.5 + stone.phase) * 0.09);
      stone.quartz.opacity = opacity;
      if (stone.gold) stone.gold.opacity = opacity;
    }
    renderer.render(scene, camera);
  };
  requestAnimationFrame(frame);
}
