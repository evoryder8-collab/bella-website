import {
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  Mesh,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  NoColorSpace,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  TorusGeometry,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { laurel } from './laurel.js';

// Her silver from the 2025 European Massage Championship in Paris, as a medal
// of polished silver on a short wine satin ribbon, turning slowly by itself in
// place of the word (as on the Zoltan site, but not to be played with). Its
// faces are painted on a canvas, with a height map so the engraving catches
// the light: a laurel round "II" on the front, "Silver" and the category on
// the back. It draws only while on screen.

const TAU = Math.PI * 2;
const SERIF = '"Bodoni Moda", "Bodoni 72", Didot, Georgia, serif';
const SANS = 'Jost, Futura, "Avenir Next", system-ui, sans-serif';
const SPIN = 0.55; // radians a second

// The site's laurel (src/laurel.js), drawn in one colour as an image.
function laurelImage(fill) {
  const marks = laurel('m')
    .replace(/url\(#m\)/g, fill)
    // Its stems are styled by the page's stylesheet, which an image doesn't see.
    .replace(/class="laurel-stem"/g, `fill="none" stroke="${fill}" stroke-width="2.4"`);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">${marks}</svg>`)}`;
  return img.decode().then(() => img);
}

function arcText(g, text, r, mid, step) {
  const chars = [...text];
  let a = mid - (step * (chars.length - 1)) / 2;
  for (const ch of chars) {
    g.save();
    g.rotate(a + Math.PI / 2);
    g.fillText(ch, 0, -r);
    g.restore();
    a += step;
  }
}

// One face: its colour, or with `relief` a greyscale height map (white stands proud).
function paint(kind, relief, wreath) {
  const S = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const g = canvas.getContext('2d');
  g.translate(S / 2, S / 2);
  if (relief) {
    g.fillStyle = '#6a6a6a';
    g.fillRect(-S / 2, -S / 2, S, S);
  } else {
    const ground = g.createRadialGradient(-170, -230, 40, 0, 0, 600);
    ground.addColorStop(0, '#ffffff');
    ground.addColorStop(0.5, '#e6e9ed');
    ground.addColorStop(1, '#b3b8c0');
    g.fillStyle = ground;
    g.fillRect(-S / 2, -S / 2, S, S);
  }
  const ink = relief ? '#ffffff' : 'rgb(79 85 96 / 0.85)';
  g.strokeStyle = relief ? '#9a9a9a' : 'rgb(74 80 90 / 0.5)';
  g.lineWidth = 10;
  g.beginPath();
  g.arc(0, 0, 452, 0, TAU);
  g.stroke();
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (kind === 'front') {
    if (wreath) g.drawImage(wreath, -330, -230, 660, 412);
    g.font = `400 300px ${SERIF}`;
    g.fillText('II', 0, -20);
    g.font = `500 46px ${SANS}`;
    g.fillText('2025', 0, 205);
    g.font = `500 40px ${SANS}`;
    arcText(g, 'EUROPEAN MASSAGE CHAMPIONSHIP', 392, -Math.PI / 2, 0.06);
  } else {
    g.font = `italic 400 200px ${SERIF}`;
    g.fillText('Silver', 0, -60);
    g.font = `500 40px ${SANS}`;
    g.fillText('BEST SPA & ESTHETICS', 0, 92);
    g.fillText('MASSAGE', 0, 146);
    g.font = `italic 400 64px ${SERIF}`;
    g.fillText('Bella Bayar', 0, 262);
    g.font = `500 40px ${SANS}`;
    arcText(g, 'PARIS · FRANCE', 392, -Math.PI / 2, 0.075);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = relief ? NoColorSpace : SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Wine satin with fine rose-gold edges.
function ribbonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 8;
  const g = canvas.getContext('2d');
  const bands = [['#e7b3a5', 10], ['#f6e9e4', 4], ['#6a2433', 92], ['#f6e9e4', 4], ['#e7b3a5', 10]];
  let x = 0;
  for (const [colour, width] of bands) {
    g.fillStyle = colour;
    g.fillRect(x, 0, width, 8);
    x += width;
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mountMedal(stage, { signal }) {
  // Its lettering waits for the site's fonts and the laurel for its image, but
  // never long: past a second and a half it is drawn with what there is.
  const fonts = document.fonts ? Promise.all([`400 64px ${SERIF}`, `italic 400 64px ${SERIF}`, `500 32px ${SANS}`].map((font) => document.fonts.load(font))) : null;
  await Promise.race([fonts, wait(1500)]).catch(() => {});
  const [darkWreath, lightWreath] = (await Promise.race([Promise.all([laurelImage('#4f5560'), laurelImage('#ffffff')]), wait(1500)]).catch(() => null)) ?? [];
  if (signal.aborted) return;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NeutralToneMapping;
  const canvas = renderer.domElement;
  canvas.className = 'stat-medal-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);

  const scene = new Scene();
  scene.environment = new PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 1.35;
  const key = new DirectionalLight('#fff6f2', 2.8);
  key.position.set(-2, 3, 5);
  const rim = new DirectionalLight('#f2aaaa', 2.6);
  rim.position.set(3.5, 1, -3);
  scene.add(new HemisphereLight('#fff4ee', '#3a1520', 0.5), key, rim);
  const camera = new PerspectiveCamera(26, 1, 0.1, 60);

  // pivot (top of the ribbon) → swing → [ribbon, medal → its turn]
  const swing = new Group();
  swing.position.y = 1.32;
  scene.add(swing);
  const ribbon = new MeshPhysicalMaterial({ map: ribbonTexture(), roughness: 0.55, sheen: 0.6, sheenRoughness: 0.35, sheenColor: new Color('#ffe2dc'), side: DoubleSide });
  for (const side of [-1, 1]) {
    const length = 0.95;
    const geometry = new PlaneGeometry(0.46, length, 1, 12);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(((p.getY(i) + length / 2) / length) * Math.PI) * 0.05);
    geometry.computeVertexNormals();
    const strap = new Mesh(geometry, ribbon);
    strap.position.set(side * 0.24, -length / 2 + 0.12, -0.04);
    strap.rotation.z = -side * 0.2; // a V, meeting at the loop
    swing.add(strap);
  }
  const medal = new Group();
  medal.position.y = -1.95;
  swing.add(medal);
  const silver = new MeshPhysicalMaterial({ color: '#f2f4f7', metalness: 1, roughness: 0.14, clearcoat: 0.6, clearcoatRoughness: 0.08, envMapIntensity: 1.3 });
  const edge = new Mesh(new CylinderGeometry(1, 1, 0.12, 128, 1, true), silver);
  edge.rotation.x = Math.PI / 2;
  const bead = new Mesh(new TorusGeometry(1, 0.07, 24, 160), silver);
  const faceGeometry = new CircleGeometry(0.985, 128);
  const faceOf = (kind) =>
    new MeshPhysicalMaterial({
      map: paint(kind, false, darkWreath),
      bumpMap: paint(kind, true, lightWreath),
      bumpScale: 3,
      metalness: 0.85,
      roughness: 0.22,
      clearcoat: 0.5,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.3,
    });
  const front = new Mesh(faceGeometry, faceOf('front'));
  front.position.z = 0.06;
  const back = new Mesh(faceGeometry, faceOf('back'));
  back.position.z = -0.06;
  back.rotation.y = Math.PI;
  const loop = new Mesh(new TorusGeometry(0.14, 0.035, 16, 48), silver);
  loop.position.y = 1.12;
  loop.rotation.y = Math.PI / 2;
  medal.add(edge, bead, front, back, loop);

  // The whole medal and ribbon, about 3.3 units tall, fills the stage's height.
  const resize = () => {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.set(0, -0.08, 3.45 / 2 / Math.tan((camera.fov / 2) * (Math.PI / 180)));
    camera.updateProjectionMatrix();
  };
  const sizes = new ResizeObserver(resize);
  sizes.observe(stage);
  resize();

  let onScreen = false;
  const seen = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) start();
  });
  seen.observe(stage);

  let frame = 0;
  let previous = 0;
  let time = 0;
  const draw = (now) => {
    frame = 0;
    if (!onScreen || document.hidden || signal.aborted) return;
    const dt = Math.min(0.05, (now - previous) / 1000);
    previous = now;
    time += dt;
    // A slow, even turn, and the faintest sway on the ribbon.
    medal.rotation.y = time * SPIN;
    medal.rotation.x = Math.sin(time * 0.7) * 0.04;
    swing.rotation.z = Math.sin(time * 0.9) * 0.025;
    renderer.render(scene, camera);
    canvas.classList.add('is-drawn');
    frame = requestAnimationFrame(draw);
  };
  const start = () => {
    if (frame || signal.aborted) return;
    previous = performance.now();
    frame = requestAnimationFrame(draw);
  };
  document.addEventListener('visibilitychange', start, { signal });

  signal.addEventListener('abort', () => {
    cancelAnimationFrame(frame);
    sizes.disconnect();
    seen.disconnect();
    renderer.dispose();
    canvas.remove();
  });
}
