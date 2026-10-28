import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';

// The body figure's dress, after an editorial flower shoot:
// - a bouquet of mostly white and pink flowers (roses, peonies, blossoms and
//   buds, with sage leaves tucked in) laid like a blanket across the chest, and
//   another over the hips;
// - one large heart-shaped leaf hanging from the small of the back, shaped to
//   the body's curves.
// All the petals are drawn in a few instanced batches. open(t) unfurls
// everything from closed buds (0) to full bloom (1).

const TAU = Math.PI * 2;

// A petal: a teardrop that cups across its width and curls back at the tip,
// tinted at the base (the material's colour multiplies it). Base at the origin,
// growing along +y.
function petalGeometry({ width = 0.62, cup = 0.32, curl = 0.9, ruffle = 0, base = '#eebcc2', tip = '#ffffff' } = {}) {
  const geometry = new PlaneGeometry(1, 1, 8, 14);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const from = new Color(base);
  const to = new Color(tip);
  const color = new Color();
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i) * 2; // -1..1 across
    const v = position.getY(i) + 0.5; // 0..1 along
    const half = width * Math.pow(Math.sin(Math.PI * Math.min(1, v * 0.92 + 0.04)), 0.75) * (1 - 0.2 * v);
    const x = u * half;
    const bow = cup * u * u * half + ruffle * Math.sin(u * 9 + v * 5) * v;
    const turn = curl * v * v * v;
    // The cup rises towards the heart (+z); the tip curls back, away from it.
    position.setXYZ(i, x, v * Math.cos(turn) - bow * Math.sin(turn) * 0.4, bow - v * Math.sin(turn) * 0.35);
    color.copy(from).lerp(to, Math.min(1, Math.pow(v, 0.55) * 1.1));
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

let kit = null;
const parts = () => {
  if (kit) return kit;
  const silk = (color) =>
    new MeshPhysicalMaterial({
      color,
      vertexColors: true,
      roughness: 0.5,
      sheen: 1,
      sheenRoughness: 0.35,
      sheenColor: new Color('#fff1ec'),
      clearcoat: 0.12,
      side: DoubleSide,
    });
  kit = {
    geometries: {
      petal: petalGeometry(),
      wide: petalGeometry({ width: 0.86, cup: 0.38, curl: 1.1, ruffle: 0.035 }),
      leaf: petalGeometry({ width: 0.3, cup: 0.16, curl: 0.45, base: '#c9d8bf', tip: '#ffffff' }),
      seed: new SphereGeometry(1, 10, 8),
    },
    materials: {
      white: silk('#fffaf8'),
      pink: silk('#f6b0bc'),
      rose: silk('#e98ca0'),
      sage: new MeshPhysicalMaterial({ color: '#8da587', vertexColors: true, roughness: 0.42, sheen: 0.6, sheenColor: new Color('#eaf5df'), clearcoat: 0.3, side: DoubleSide }),
      gold: new MeshPhysicalMaterial({ color: '#e2b47a', metalness: 1, roughness: 0.28, clearcoat: 0.5 }),
    },
  };
  return kit;
};

// Rings of petals: [count, lean from the axis when open (radians), length, twist, base radius].
const TYPES = {
  rose: { petal: 'petal', heart: 7, rings: [[5, 0.3, 0.42, 0, 0.02], [6, 0.7, 0.62, 0.4, 0.05], [8, 1.08, 0.8, 0.15, 0.08], [10, 1.36, 0.95, 0.55, 0.11]] },
  peony: { petal: 'wide', heart: 9, rings: [[6, 0.22, 0.36, 0, 0.02], [8, 0.52, 0.54, 0.3, 0.04], [10, 0.86, 0.7, 0.1, 0.07], [12, 1.16, 0.86, 0.5, 0.1], [14, 1.42, 0.98, 0.2, 0.13]] },
  blossom: { petal: 'wide', heart: 6, rings: [[5, 1.38, 0.8, 0, 0.03]] },
  bud: { petal: 'petal', heart: 0, rings: [[4, 0.12, 0.5, 0, 0.01], [5, 0.3, 0.64, 0.6, 0.02]] },
};

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

// A bouquet laid over a surface. at(x, y, side) finds the surface (point and
// normal); each flower is [x, y, type, colour, size] and each leaf
// [x, y, 'leaf', angle, size]; behind: lay them on the back.
export function createBouquet(at, flowers, { behind = false } = {}) {
  const { geometries, materials } = parts();
  const group = new Group();
  const pieces = new Map(); // "geometry/material" -> list of pieces
  const add = (geometry, material, piece) => {
    const key = `${geometry}/${material}`;
    if (!pieces.has(key)) pieces.set(key, []);
    pieces.get(key).push(piece);
  };

  const spin = new Quaternion();
  const turn = new Quaternion();
  flowers.forEach(([x, y, type, colour, size], i) => {
    const hit = at(x, y, behind ? -1 : 1);
    if (!hit) return;
    // Each flower sits on the surface, facing out along it, turned at random.
    const seed = (i * 2.399) % TAU;
    spin.setFromUnitVectors(AXIS, hit.normal);
    turn.setFromAxisAngle(AXIS, seed);
    const place = new Matrix4().compose(hit.point.clone().addScaledVector(hit.normal, size * 0.1), spin.clone().multiply(turn), new Vector3(size, size, size));
    if (type === 'leaf') {
      // For a leaf, the fourth value is the angle it reaches out at, on the surface.
      add('leaf', 'sage', { place, leaf: colour - seed });
      return;
    }
    const { petal, heart, rings } = TYPES[type];
    rings.forEach(([count, lean, length, twist, base], ring) => {
      for (let j = 0; j < count; j++) add(petal, colour, { place, ring, angle: (j / count) * TAU + twist, lean, length, base });
    });
    for (let s = 0; s < heart; s++) {
      const a = (s / heart) * TAU;
      add('seed', 'gold', { place, seed: [s ? Math.cos(a) * 0.05 : 0, s ? Math.sin(a) * 0.05 : 0, s ? 0.022 : 0.034] });
    }
  });

  const batches = [...pieces].map(([key, list]) => {
    const [geometry, material] = key.split('/');
    const mesh = new InstancedMesh(geometries[geometry], materials[material], list.length);
    mesh.frustumCulled = false;
    group.add(mesh);
    return { mesh, list };
  });

  const local = new Matrix4();
  const matrix = new Matrix4();
  const open = (t) => {
    for (const { mesh, list } of batches) {
      list.forEach((piece, i) => {
        if (piece.seed) {
          const [sx, sy, r] = piece.seed;
          local.makeScale(r * t + 1e-4, r * t + 1e-4, r * t + 1e-4).setPosition(sx, sy, 0.12);
        } else if (piece.leaf !== undefined) {
          petalMatrix(local, piece.leaf, 1.48, 0.12, 1.7 * Math.max(1e-3, t), 0.7, -0.05);
        } else {
          // The outer rings open first, the heart last.
          const k = Math.min(1, Math.max(0, t * 1.3 - piece.ring * 0.08));
          const grow = 0.35 + 0.65 * k;
          petalMatrix(local, piece.angle, 0.06 + piece.lean * k, piece.base * grow, piece.length * grow, piece.length * 0.6);
        }
        mesh.setMatrixAt(i, matrix.multiplyMatrices(piece.place, local));
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
  open(0);
  return { group, open };
}

// One large heart-shaped leaf over the back, hanging from the small of the
// back: its outline is laid onto the body by rays and lifted a little at the
// edges, with a pale midrib and veins. top: [x, y] where the stalk meets it.
export function createLeaf(at, { top = [0, 0.9], width = 0.27, height = 0.25 } = {}) {
  const { materials } = parts();
  const half = (v) => (width / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + v * 0.94)), 0.5) * (1 - (0.45 * Math.max(0, v - 0.35)) / 0.65);
  const planar = (u, v) => [top[0] + u * half(v), top[1] - v * height + height * 0.13 * (1 - Math.abs(u)) ** 2 * (1 - v) ** 3];

  // Cast a coarse grid of rays at the back, then smooth it finer.
  const NU = 9;
  const NV = 11;
  const coarse = [];
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const u = (i / (NU - 1)) * 2 - 1;
      const v = j / (NV - 1);
      const hit = at(...planar(u, v), -1);
      coarse.push(hit ? { p: hit.point.clone(), n: hit.normal.clone() } : null);
    }
  }
  // Rays that miss borrow the nearest one that hit.
  const hits = coarse.map((node, k) => (node ? k : -1)).filter((k) => k >= 0);
  if (!hits.length) return null;
  coarse.forEach((node, k) => {
    if (node) return;
    const near = hits.reduce((best, m) => {
      const d = Math.abs((m % NU) - (k % NU)) + Math.abs(Math.floor(m / NU) - Math.floor(k / NU));
      return d < best.d ? { m, d } : best;
    }, { m: hits[0], d: Infinity });
    coarse[k] = coarse[near.m];
  });
  const sample = (fu, fv, target, key) => {
    const x = fu * (NU - 1);
    const y = fv * (NV - 1);
    const i = Math.min(NU - 2, Math.floor(x));
    const j = Math.min(NV - 2, Math.floor(y));
    const a = x - i;
    const b = y - j;
    const node = (ii, jj) => coarse[jj * NU + ii][key];
    return target
      .copy(node(i, j))
      .multiplyScalar((1 - a) * (1 - b))
      .addScaledVector(node(i + 1, j), a * (1 - b))
      .addScaledVector(node(i, j + 1), (1 - a) * b)
      .addScaledVector(node(i + 1, j + 1), a * b);
  };

  const FU = 25;
  const FV = 31;
  const positions = new Float32Array(FU * FV * 3);
  const colors = new Float32Array(FU * FV * 3);
  const deep = new Color('#7c9775');
  const pale = new Color('#d9e6cf');
  const color = new Color();
  const p = new Vector3();
  const n = new Vector3();
  const stalk = sample(0.5, 0, new Vector3(), 'p');
  for (let j = 0; j < FV; j++) {
    for (let i = 0; i < FU; i++) {
      const fu = i / (FU - 1);
      const fv = j / (FV - 1);
      const u = fu * 2 - 1;
      sample(fu, fv, p, 'p');
      sample(fu, fv, n, 'n').normalize();
      // Lifted off the skin, more at the edges, like a real leaf resting there.
      p.addScaledVector(n, 0.004 + 0.012 * u * u + 0.006 * fv * fv).sub(stalk);
      const k = j * FU + i;
      p.toArray(positions, k * 3);
      const midrib = Math.exp(-u * u * 90);
      const veins = Math.pow(Math.abs(Math.sin((fv * 6.5 - Math.abs(u) * 2.2) * Math.PI)), 28) * (1 - Math.abs(u) * 0.8) * 0.75;
      color.copy(deep).lerp(pale, Math.min(1, Math.max(midrib, veins) * 0.85 + fv * 0.08));
      color.toArray(colors, k * 3);
    }
  }
  const index = [];
  for (let j = 0; j < FV - 1; j++) {
    for (let i = 0; i < FU - 1; i++) {
      const a = j * FU + i;
      index.push(a, a + FU, a + 1, a + 1, a + FU, a + FU + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();

  const mesh = new Mesh(geometry, materials.sage);
  const group = new Group();
  group.position.copy(stalk);
  group.add(mesh);
  // It unfurls from the stalk down.
  const open = (t) => group.scale.setScalar(Math.max(1e-3, t));
  open(0);
  return { group, open };
}
