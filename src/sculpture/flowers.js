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

// The body figure's dress, after editorial flower shoots: a bandeau of many
// tightly packed flowers over the chest (white daisies, pink gerberas, pink and
// white pompom carnations, a few white roses) with straps of small flowers up
// over the shoulders, a matching floral bikini band over the hips, and one
// large heart-shaped leaf draped over the back. Every petal is drawn in a few
// instanced batches; open(t) unfurls it all from bud (0) to full bloom (1).

const TAU = Math.PI * 2;

// A petal: a teardrop that cups across its width and curls back at the tip,
// tinted from base to tip (the material's colour multiplies it). Base at the
// origin, growing along +y.
function petalGeometry({ width = 0.62, cup = 0.32, curl = 0.9, ruffle = 0, base = '#eebcc2', tip = '#ffffff' } = {}) {
  const geometry = new PlaneGeometry(1, 1, 6, 10);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const from = new Color(base);
  const to = new Color(tip);
  const color = new Color();
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i) * 2; // -1..1 across
    const v = position.getY(i) + 0.5; // 0..1 along
    const half = width * Math.pow(Math.sin(Math.PI * Math.min(1, v * 0.92 + 0.04)), 0.75) * (1 - 0.2 * v);
    const bow = cup * u * u * half + ruffle * Math.sin(u * 9 + v * 5) * v;
    const turn = curl * v * v * v;
    // The cup rises towards the heart (+z); the tip curls back, away from it.
    position.setXYZ(i, u * half, v * Math.cos(turn) - bow * Math.sin(turn) * 0.4, bow - v * Math.sin(turn) * 0.35);
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
  const silk = (color, roughness = 0.5) =>
    new MeshPhysicalMaterial({ color, vertexColors: true, roughness, sheen: 1, sheenRoughness: 0.35, sheenColor: new Color('#fff1ec'), clearcoat: 0.1, side: DoubleSide });
  kit = {
    geometries: {
      petal: petalGeometry(),
      ray: petalGeometry({ width: 0.2, cup: 0.12, curl: 0.18, base: '#f3ece2' }),
      frill: petalGeometry({ width: 0.55, cup: 0.25, curl: 0.5, ruffle: 0.09, base: '#e7a9b3' }),
      leaf: petalGeometry({ width: 0.3, cup: 0.16, curl: 0.45, base: '#c9d8bf' }),
      seed: new SphereGeometry(1, 12, 8),
    },
    materials: {
      white: silk('#fffaf6'),
      pink: silk('#f5a9ba'),
      magenta: silk('#d9577f'),
      sage: new MeshPhysicalMaterial({ color: '#8da587', vertexColors: true, roughness: 0.42, sheen: 0.6, sheenColor: new Color('#eaf5df'), clearcoat: 0.3, side: DoubleSide }),
      yolk: new MeshPhysicalMaterial({ color: '#e9b443', roughness: 0.6, sheen: 0.5, sheenColor: new Color('#fff2c4') }),
    },
  };
  return kit;
};

// Flower types. Rings of petals: [count, lean from the axis when open
// (radians), length, twist, base radius]; heart: a centre disc [radius, depth].
const TYPES = {
  daisy: { petal: 'ray', heart: [0.26, 0.12], rings: [[20, 1.46, 1, 0, 0.18], [18, 1.32, 0.86, 0.17, 0.16]] },
  pompom: {
    petal: 'frill',
    rings: [[8, 0.12, 0.34, 0, 0.02], [10, 0.38, 0.44, 0.3, 0.04], [13, 0.64, 0.52, 0.1, 0.06], [15, 0.9, 0.6, 0.45, 0.08], [17, 1.15, 0.66, 0.2, 0.1], [19, 1.38, 0.7, 0.6, 0.12]],
  },
  rose: { petal: 'petal', rings: [[5, 0.3, 0.42, 0, 0.02], [6, 0.7, 0.62, 0.4, 0.05], [8, 1.08, 0.8, 0.15, 0.08], [10, 1.36, 0.95, 0.55, 0.11]] },
  bud: { petal: 'petal', rings: [[4, 0.12, 0.5, 0, 0.01], [5, 0.3, 0.64, 0.6, 0.02]] },
};

// The mix, by weight, as in a florist's bandeau: mostly white and pink.
const MIX = [
  [30, 'daisy', 'white'],
  [20, 'daisy', 'pink'],
  [24, 'pompom', 'pink'],
  [8, 'pompom', 'white'],
  [7, 'pompom', 'magenta'],
  [11, 'rose', 'white'],
];

const random = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// Points packed in a staggered grid inside a region, jittered so the flowers
// never line up.
function pack(rng, inside, [x0, x1], [y0, y1], spacing) {
  const points = [];
  let row = 0;
  for (let y = y0; y <= y1; y += spacing * 0.86, row++) {
    for (let x = x0 + (row % 2) * spacing * 0.5; x <= x1; x += spacing) {
      const px = x + (rng() - 0.5) * spacing * 0.3;
      const py = y + (rng() - 0.5) * spacing * 0.3;
      if (inside(px, py)) points.push([px, py]);
    }
  }
  return points;
}

const AXIS = new Vector3(0, 0, 1);
const out = new Vector3();
const up = new Vector3();
const face = new Vector3();
const across = new Vector3();
const size3 = new Vector3();

// A petal standing at angle a round the axis, leaning out by lean: it grows
// along "up", its cupped side faces the flower's heart.
function petalMatrix(matrix, a, lean, base, length, width, z = 0) {
  out.set(Math.cos(a), Math.sin(a), 0);
  up.copy(AXIS).multiplyScalar(Math.cos(lean)).addScaledVector(out, Math.sin(lean));
  face.copy(AXIS).multiplyScalar(Math.sin(lean)).addScaledVector(out, -Math.cos(lean));
  across.crossVectors(up, face);
  matrix.makeBasis(across, up, face).scale(size3.set(width, length, width));
  return matrix.setPosition(out.x * base, out.y * base, z);
}

// Flowers laid on a surface; at(x, y) gives { point, normal } there. Each
// flower: [x, y, type, colour, size].
function flowerBatches(at, flowers) {
  const { geometries, materials } = parts();
  const group = new Group();
  const pieces = new Map();
  const add = (geometry, material, piece) => {
    const key = `${geometry}/${material}`;
    if (!pieces.has(key)) pieces.set(key, []);
    pieces.get(key).push(piece);
  };
  const spin = new Quaternion();
  const turn = new Quaternion();
  flowers.forEach(([x, y, type, colour, size], i) => {
    const hit = at(x, y);
    if (!hit) return;
    // Facing out along the surface, each turned its own way, sitting a little
    // proud of the skin (larger flowers higher, so neighbours overlap).
    spin.setFromUnitVectors(AXIS, hit.normal);
    turn.setFromAxisAngle(AXIS, (i * 2.399) % TAU);
    const place = new Matrix4().compose(hit.point.clone().addScaledVector(hit.normal, size * (0.18 + (i % 3) * 0.07)), spin.clone().multiply(turn), new Vector3(size, size, size));
    const { petal, heart, rings } = TYPES[type];
    rings.forEach(([count, lean, length, twist, base], ring) => {
      for (let j = 0; j < count; j++) add(petal, colour, { place, ring, angle: (j / count) * TAU + twist, lean, length, base });
    });
    if (heart) add('seed', 'yolk', { place, heart });
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
        if (piece.heart) {
          const [r, depth] = piece.heart;
          local.makeScale(r * t + 1e-4, r * t + 1e-4, depth * t + 1e-4).setPosition(0, 0, 0.06);
        } else {
          // The outer rings open first, the heart last.
          const k = Math.min(1, Math.max(0, t * 1.3 - piece.ring * 0.07));
          const grow = 0.35 + 0.65 * k;
          petalMatrix(local, piece.angle, 0.06 + piece.lean * k, piece.base * grow, piece.length * grow, piece.length * 0.6);
        }
        mesh.setMatrixAt(i, matrix.multiplyMatrices(piece.place, local));
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
  return { group, open };
}

// The front of the dress, in the figure's own metres seen from the front.
function frontFlowers(rng) {
  const pick = () => {
    let r = rng() * MIX.reduce((total, [w]) => total + w, 0);
    for (const [w, type, colour] of MIX) if ((r -= w) <= 0) return [type, colour];
    return ['daisy', 'white'];
  };
  const flowers = [];
  const place = (points, spacing) => {
    for (const [x, y] of points) {
      const [type, colour] = pick();
      flowers.push([x, y, type, colour, spacing * (0.7 + rng() * 0.18)]);
    }
  };
  // Bandeau: a cup over each breast joined across the chest.
  const cup = (x, y, side) => ((x - side * 0.098) / 0.085) ** 2 + ((y - 1.17) / 0.076) ** 2 < 1;
  const bandeau = (x, y) => cup(x, y, 1) || cup(x, y, -1) || (Math.abs(x) < 0.1 && y > 1.125 && y < 1.215);
  place(pack(rng, bandeau, [-0.2, 0.2], [1.09, 1.25], 0.037), 0.037);
  // Straps of small flowers up over the shoulders.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const [type, colour] = i % 2 ? ['daisy', 'white'] : ['pompom', 'pink'];
      flowers.push([side * (0.134 + t * 0.006), 1.24 + t * 0.105, type, colour, 0.019 + (1 - t) * 0.005]);
    }
  }
  // Bikini: a band over the hips that narrows between the legs.
  const bikini = (x, y) => y > 0.758 && y < 0.89 && Math.abs(x) < 0.045 + ((y - 0.758) / 0.132) * 0.12;
  place(pack(rng, bikini, [-0.18, 0.18], [0.75, 0.9], 0.034), 0.034);
  return flowers;
}

// One large heart-shaped leaf over the back, hanging from the small of the
// back. It is draped like real foliage: laid on the outermost points of the
// body beneath it (bridging hollows, never sinking in), smoothed, and lifted a
// little more at the edges, with a pale midrib and veins.
function backLeaf(at, { top = [0, 0.915], width = 0.31, height = 0.215 } = {}) {
  const { materials } = parts();
  const half = (v) => (width / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + v * 0.94)), 0.5) * (1 - (0.45 * Math.max(0, v - 0.35)) / 0.65);
  const planar = (u, v) => [top[0] + u * half(v), top[1] - v * height + height * 0.13 * (1 - Math.abs(u)) ** 2 * (1 - v) ** 3];

  const NU = 33;
  const NV = 41;
  const xy = [];
  const depth = new Float32Array(NU * NV);
  const over = new Uint8Array(NU * NV); // 1 where there is body beneath the leaf
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const [x, y] = planar((i / (NU - 1)) * 2 - 1, j / (NV - 1));
      xy.push([x, y]);
      // Seen from behind, "outward" is towards -z.
      const hit = at(x, y, -1);
      depth[j * NU + i] = hit ? hit.point.z : NaN;
      over[j * NU + i] = hit ? 1 : 0;
    }
  }
  // Misses (past the body's edge) take the nearest row value.
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const k = j * NU + i;
      if (!Number.isNaN(depth[k])) continue;
      for (let r = 1; r < NU && Number.isNaN(depth[k]); r++) {
        for (const ii of [i - r, i + r]) if (ii >= 0 && ii < NU && !Number.isNaN(depth[j * NU + ii])) depth[k] = depth[j * NU + ii];
      }
      if (Number.isNaN(depth[k])) depth[k] = 0;
    }
  }
  const field = (source, radius, combine) => {
    const result = new Float32Array(source.length);
    for (let j = 0; j < NV; j++) {
      for (let i = 0; i < NU; i++) {
        let value = combine === 'min' ? Infinity : 0;
        let count = 0;
        for (let dj = -radius; dj <= radius; dj++) {
          for (let di = -radius; di <= radius; di++) {
            const ii = Math.min(NU - 1, Math.max(0, i + di));
            const jj = Math.min(NV - 1, Math.max(0, j + dj));
            const z = source[jj * NU + ii];
            if (combine === 'min') value = Math.min(value, z);
            else value += z;
            count++;
          }
        }
        result[j * NU + i] = combine === 'min' ? value : value / count;
      }
    }
    return result;
  };
  // Drape over the outermost points within about 3 cm, smooth, and never
  // come closer to the body than the drape.
  const drape = field(depth, 3, 'min');
  const smooth = field(field(drape, 2, 'mean'), 2, 'mean');

  const positions = new Float32Array(NU * NV * 3);
  const colors = new Float32Array(NU * NV * 3);
  const deep = new Color('#7c9775');
  const pale = new Color('#d9e6cf');
  const color = new Color();
  const stalk = new Vector3(...planar(0, 0), Math.min(smooth[(NU - 1) / 2], drape[(NU - 1) / 2]) - 0.008);
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const k = j * NU + i;
      const u = (i / (NU - 1)) * 2 - 1;
      const fv = j / (NV - 1);
      const z = Math.min(smooth[k], drape[k]) - 0.008 - 0.014 * u * u - 0.006 * fv * fv;
      positions.set([xy[k][0] - stalk.x, xy[k][1] - stalk.y, z - stalk.z], k * 3);
      const midrib = Math.exp(-u * u * 110);
      const veins = Math.pow(Math.abs(Math.sin((fv * 6.5 - Math.abs(u) * 2.2) * Math.PI)), 28) * (1 - Math.abs(u) * 0.8) * 0.75;
      color.copy(deep).lerp(pale, Math.min(1, Math.max(midrib, veins) * 0.85 + fv * 0.08));
      color.toArray(colors, k * 3);
    }
  }
  const index = [];
  for (let j = 0; j < NV - 1; j++) {
    for (let i = 0; i < NU - 1; i++) {
      const a = j * NU + i;
      // Only over the body: the leaf tucks in between the legs instead of bridging the gap.
      if (!over[a] || !over[a + 1] || !over[a + NU] || !over[a + NU + 1]) continue;
      // Facing outwards (towards -z, the back).
      index.push(a, a + 1, a + NU, a + 1, a + NU + 1, a + NU);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();

  const group = new Group();
  group.position.copy(stalk);
  group.add(new Mesh(geometry, materials.sage));
  // It unfurls from the stalk down.
  return { group, open: (t) => group.scale.setScalar(Math.max(1e-3, t)) };
}

// The whole dress; at(x, y, side) finds the body's surface from the front (1) or back (-1).
export function createDress(at) {
  const front = flowerBatches((x, y) => at(x, y, 1), frontFlowers(random(5150)));
  const leaf = backLeaf(at);
  const group = new Group();
  group.add(front.group, leaf.group);
  const open = (t) => {
    front.open(t);
    leaf.open(t);
  };
  open(0);
  return { group, open };
}
