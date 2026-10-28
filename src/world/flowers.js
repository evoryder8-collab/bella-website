import { BufferAttribute, Color, DoubleSide, Group, InstancedMesh, Matrix4, MeshPhysicalMaterial, Object3D, PlaneGeometry, SphereGeometry, Vector3 } from 'three';

// Sculpted blooms in blush silk with gilded centres and leaves, arranged like
// an editorial dress over the body figure's chest and hips. Each bloom is one
// instanced mesh of curved petals in rings: tight and upright at the heart,
// open and curling at the rim. open(t) unfurls them from a closed bud (0) to
// full bloom (1).

const DEEP = new Color('#b4505c');
const BLUSH = new Color('#f9d9d3');

// A petal: a teardrop that cups across its width and curls back at the tip,
// deep rose at the base fading to blush. Base at the origin, growing along +y.
function petalGeometry() {
  const geometry = new PlaneGeometry(1, 1, 8, 14);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const color = new Color();
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i) * 2; // -1..1 across
    const v = position.getY(i) + 0.5; // 0..1 along
    const width = 0.62 * Math.pow(Math.sin(Math.PI * Math.min(1, v * 0.92 + 0.04)), 0.75) * (1 - 0.2 * v);
    const x = u * width;
    const along = v;
    const cup = 0.32 * u * u * width;
    const curl = 0.9 * v * v * v;
    // The cup rises towards the heart (+z); the tip curls back, away from it.
    position.setXYZ(i, x, along * Math.cos(curl) - cup * Math.sin(curl) * 0.4, cup - along * Math.sin(curl) * 0.35);
    color.copy(DEEP).lerp(BLUSH, Math.min(1, Math.pow(v, 0.6) * 1.05));
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

let shared = null;
const parts = () =>
  (shared ??= {
    petal: petalGeometry(),
    silk: new MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.5,
      sheen: 1,
      sheenRoughness: 0.35,
      sheenColor: new Color('#ffe6df'),
      clearcoat: 0.15,
      iridescence: 0.12,
      side: DoubleSide,
    }),
    gold: new MeshPhysicalMaterial({ color: '#e2b47a', metalness: 1, roughness: 0.28, clearcoat: 0.5, side: DoubleSide }),
    seed: new SphereGeometry(1, 10, 8),
  });

// Rings: [petals, lean from the axis when open (radians), length, twist, base radius].
const RINGS = [
  [5, 0.3, 0.42, 0, 0.02],
  [6, 0.7, 0.62, 0.4, 0.05],
  [8, 1.08, 0.8, 0.15, 0.08],
  [10, 1.36, 0.95, 0.55, 0.11],
];
const LEAF_LEAN = 1.5;

const AXIS = new Vector3(0, 0, 1);
const out = new Vector3();
const up = new Vector3();
const face = new Vector3();
const across = new Vector3();
const size3 = new Vector3();

// A petal standing at angle a round the axis, leaning out by lean: it grows
// along "up", its cupped side faces the bloom's heart.
function petalMatrix(matrix, a, lean, base, length, width, z = 0) {
  out.set(Math.cos(a), Math.sin(a), 0);
  up.copy(AXIS).multiplyScalar(Math.cos(lean)).addScaledVector(out, Math.sin(lean));
  face.copy(AXIS).multiplyScalar(Math.sin(lean)).addScaledVector(out, -Math.cos(lean));
  across.crossVectors(up, face);
  matrix.makeBasis(across, up, face).scale(size3.set(width, length, width));
  return matrix.setPosition(out.x * base, out.y * base, z);
}

export function createBloom({ size = 1, leaves = 0, seed = 0 } = {}) {
  const { petal, silk, gold, seed: seedGeometry } = parts();
  const group = new Group();
  const count = RINGS.reduce((total, [n]) => total + n, 0);
  const petals = new InstancedMesh(petal, silk, count);
  petals.frustumCulled = false;
  group.add(petals);

  // A gilded heart of stamens.
  const heart = new InstancedMesh(seedGeometry, gold, 9);
  heart.frustumCulled = false;
  const place = new Object3D();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + seed;
    const r = i ? 0.045 : 0;
    place.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.12);
    place.scale.setScalar(i ? 0.022 : 0.034);
    place.updateMatrix();
    heart.setMatrixAt(i, place.matrix);
  }
  group.add(heart);

  // Gilded leaves reaching out from under the bloom.
  const leafMesh = leaves ? new InstancedMesh(petal, gold, leaves) : null;
  if (leafMesh) {
    leafMesh.frustumCulled = false;
    group.add(leafMesh);
  }

  const matrix = new Matrix4();
  const open = (t) => {
    let i = 0;
    RINGS.forEach(([n, lean, length, twist, base], ring) => {
      // The outer rings open first, the heart last.
      const local = Math.min(1, Math.max(0, t * 1.3 - (RINGS.length - 1 - ring) * 0.0 - ring * 0.08));
      for (let j = 0; j < n; j++) {
        const grow = 0.35 + 0.65 * local;
        petals.setMatrixAt(i++, petalMatrix(matrix, (j / n) * Math.PI * 2 + twist + seed, 0.06 + lean * local, base * grow, length * grow, length * 0.6));
      }
    });
    petals.instanceMatrix.needsUpdate = true;
    heart.scale.setScalar(Math.max(0.001, t));
    if (leafMesh) {
      for (let j = 0; j < leaves; j++) {
        const a = seed + 0.7 + (j / leaves) * Math.PI * 2 * 0.8;
        leafMesh.setMatrixAt(j, petalMatrix(matrix, a, LEAF_LEAN, 0.1, 1.25 * Math.max(0.001, t), 0.45, -0.04));
      }
      leafMesh.instanceMatrix.needsUpdate = true;
    }
  };
  open(0);
  group.scale.setScalar(size);
  return { group, open };
}
