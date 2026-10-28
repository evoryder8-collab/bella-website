import { Color, ExtrudeGeometry, Group, Mesh, MeshPhysicalMaterial, PointLight, Shape } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// A rose-quartz gua sha stone: the classic curved "wing" with a concave
// sculpting edge and a soft scalloped comb at one end, extruded with a deep
// bevel and smoothed into a pebble. With transmission it refracts whatever is behind it
// (the portrait, the photos, the atmosphere); on weak GPUs it falls back to a
// polished translucent finish.

// The outline, anticlockwise from the rounded end: the high back, the comb's
// soft scallop, then the long concave edge that sculpts. Drawn as one closed
// curve through these points, so it has no corner anywhere: nothing a face
// could catch on.
const OUTLINE = [
  [-1.08, 0.06], [-0.98, 0.36], [-0.66, 0.58], [-0.16, 0.66], [0.36, 0.57], [0.72, 0.39],
  [0.93, 0.2], [0.99, 0.04], [0.95, -0.07], [0.9, -0.13], [0.86, -0.22], [0.74, -0.33],
  [0.46, -0.38], [0.14, -0.31], [-0.2, -0.26], [-0.52, -0.32], [-0.84, -0.31], [-1.03, -0.17],
];
// Curve segments per stretch between two points (there are 18).
export const STONE_SEGMENTS = 12;

export function stoneShape() {
  const s = new Shape();
  const n = OUTLINE.length;
  const at = (i) => OUTLINE[(i + n) % n];
  s.moveTo(...OUTLINE[0]);
  // A closed Catmull-Rom curve, as Béziers: smooth through every point and the join.
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    s.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  return s;
}

export function createQuartz({ transmission }) {
  let geometry = new ExtrudeGeometry(stoneShape(), {
    // About 5 mm on a 9 cm stone, like a real gua sha: a slim body with a softly rounded edge.
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.05,
    bevelSegments: 8,
    curveSegments: STONE_SEGMENTS,
  });
  // Merge the cap and bevel vertices so normals are shared: a smooth pebble, not facets.
  geometry.deleteAttribute('uv');
  geometry.deleteAttribute('normal');
  geometry = mergeVertices(geometry, 1e-4);
  geometry.computeVertexNormals();
  geometry.center();
  geometry.scale(0.5, 0.5, 0.5);

  // Pale, milky rose quartz: frosted enough to soften what it refracts, with a
  // polished clear coat on top.
  const material = new MeshPhysicalMaterial({
    color: new Color('#fde7e6'),
    roughness: transmission ? 0.22 : 0.2,
    metalness: 0,
    ior: 1.54,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    iridescence: 0.14,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [200, 480],
    specularIntensity: 0.9,
    specularColor: new Color('#fff4f2'),
    emissive: new Color('#ffb1b4'),
    emissiveIntensity: 0.03,
    envMapIntensity: 1.1,
    ...(transmission
      ? { transmission: 1, thickness: 0.12, attenuationColor: new Color('#f4b4ba'), attenuationDistance: 1.1 }
      : { transparent: true, opacity: 0.88 }),
  });

  const mesh = new Mesh(geometry, material);
  const group = new Group();
  group.add(mesh);

  // Rose light carried by the stone, so the ribbon and pearls glow as it passes.
  // Behind the stone, so it lights its surroundings without a hot spot on its face.
  const light = new PointLight('#ffb3ae', 0, 3.2, 1.6);
  light.position.set(0, 0, -0.7);
  group.add(light);

  return { group, mesh, material, light };
}
