import { Color, ExtrudeGeometry, Group, Mesh, MeshPhysicalMaterial, PointLight, Shape } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// A rose-quartz gua sha stone: the classic curved "wing" with a concave
// sculpting edge and a notched comb at one end, extruded with a deep bevel and
// smoothed into a pebble. With transmission it refracts whatever is behind it
// (the portrait, the photos, the atmosphere); on weak GPUs it falls back to a
// polished translucent finish.

export function stoneShape() {
  const s = new Shape();
  s.moveTo(-1.0, 0.16);
  s.bezierCurveTo(-0.55, 0.64, 0.25, 0.6, 0.72, 0.3);
  s.bezierCurveTo(0.95, 0.17, 1.03, 0.02, 0.93, -0.1);
  s.bezierCurveTo(0.87, -0.05, 0.81, -0.07, 0.79, -0.15);
  s.bezierCurveTo(0.71, -0.31, 0.46, -0.37, 0.2, -0.31);
  s.bezierCurveTo(-0.14, -0.2, -0.45, -0.42, -0.8, -0.31);
  s.bezierCurveTo(-1.1, -0.21, -1.16, 0.05, -1.0, 0.16);
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
    curveSegments: 80,
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
