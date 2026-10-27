import { BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, MeshPhysicalMaterial, Vector3 } from 'three';

// A satin ribbon that runs the full height of the page, the thread the camera
// follows as you scroll. In the hero it sweeps in front of the portrait; after
// that it weaves between the edges and crosses at section changes, behind the
// photos and the copy. It ripples on its own and parts around a finger.

const WIDTH = 0.3;
const ACROSS = 5; // vertices across the ribbon
const CURL = 0.9; // radians the surface turns across its width, like folded satin

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createRibbon() {
  const uniforms = { uTime: { value: 0 }, uPointer: { value: new Vector3(0, 0, -99) } };
  const material = new MeshPhysicalMaterial({
    color: new Color('#e2a0a4'),
    roughness: 0.34,
    sheen: 1,
    sheenColor: new Color('#ffc7c2'),
    sheenRoughness: 0.24,
    clearcoat: 0.6,
    clearcoatRoughness: 0.18,
    side: DoubleSide,
    envMapIntensity: 0.9,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform vec3 uPointer;\nattribute float aLength;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        transformed += objectNormal * sin(uTime * 0.8 + aLength * 2.6) * 0.045;
        vec3 away = transformed - uPointer;
        float push = exp(-dot(away.xy, away.xy) / 0.45);
        transformed.xy += normalize(away.xy + 1e-4) * push * 0.32;
        transformed.z += push * 0.35;`,
      );
  };

  const mesh = new Mesh(new BufferGeometry(), material);
  mesh.frustumCulled = false;

  return {
    mesh,
    uniforms,

    // total: page height (px), vh: viewport height (px), k: world units per px
    // at z = 0, boundaries: where each section after the first starts (px),
    // halfWidthAt(z): half the visible width at depth z.
    build({ total, vh, k, step, boundaries, halfWidthAt }) {
      // Through each chapter the ribbon rides one edge of the screen, clear of the
      // copy; it sweeps across only in the gap between chapters.
      const sideAt = (y) => {
        let side = 1;
        boundaries.forEach((b, i) => {
          if (i === 0) return; // hero to the pinned scene: stays on the right
          side += (i % 2 ? -2 : 2) * smooth(b - vh * 0.1, b + vh * 0.16, y);
        });
        return side;
      };
      const points = [];
      for (let y = -0.4 * vh; y <= total + 0.4 * vh; y += step) {
        let z = -1.6 + Math.sin(y / (vh * 0.95) + 1.2) * 0.95;
        let nx = sideAt(y) * (1.0 + 0.05 * Math.sin(y / (vh * 0.37)));
        // Hero: one diagonal sweep in front of the portrait, then back behind the photos.
        const hero = 1 - smooth(vh * 0.55, vh * 0.95, y);
        nx = nx * (1 - hero) + (-1.25 + 2.45 * smooth(vh * 0.12, vh * 0.8, y)) * hero;
        z = z * (1 - hero) + 0.7 * hero;
        // Placed so the point crosses the centre of the screen exactly when page
        // position y does; at other depths it then drifts with natural parallax
        // either side of that moment instead of slipping further off down the page.
        points.push({ p: new Vector3(nx * halfWidthAt(z), -(y - vh / 2) * k, z), twist: (y / (vh * 0.8)) * Math.PI });
      }

      const count = points.length;
      const position = new Float32Array(count * ACROSS * 3);
      const normal = new Float32Array(count * ACROSS * 3);
      const uv = new Float32Array(count * ACROSS * 2);
      const length = new Float32Array(count * ACROSS);
      const forward = new Vector3();
      const side = new Vector3();
      const up = new Vector3();
      const face = new Vector3();
      const zAxis = new Vector3(0, 0, 1);
      let travelled = 0;

      points.forEach(({ p, twist }, i) => {
        const prev = points[Math.max(0, i - 1)].p;
        const next = points[Math.min(count - 1, i + 1)].p;
        forward.subVectors(next, prev).normalize();
        side.crossVectors(forward, zAxis).normalize();
        up.crossVectors(side, forward);
        side.multiplyScalar(Math.cos(twist)).addScaledVector(up, Math.sin(twist));
        face.crossVectors(side, forward).normalize();
        if (i) travelled += p.distanceTo(prev);
        for (let j = 0; j < ACROSS; j++) {
          const a = j / (ACROSS - 1) - 0.5;
          const o = (i * ACROSS + j) * 3;
          // A shallow curl across the width, so the sheen rolls across the satin.
          const lift = -a * a * WIDTH * 0.35;
          const turn = a * CURL;
          position[o] = p.x + side.x * a * WIDTH + face.x * lift;
          position[o + 1] = p.y + side.y * a * WIDTH + face.y * lift;
          position[o + 2] = p.z + side.z * a * WIDTH + face.z * lift;
          normal[o] = face.x * Math.cos(turn) + side.x * Math.sin(turn);
          normal[o + 1] = face.y * Math.cos(turn) + side.y * Math.sin(turn);
          normal[o + 2] = face.z * Math.cos(turn) + side.z * Math.sin(turn);
          uv[(i * ACROSS + j) * 2] = j / (ACROSS - 1);
          uv[(i * ACROSS + j) * 2 + 1] = i / (count - 1);
          length[i * ACROSS + j] = travelled;
        }
      });

      const index = [];
      for (let i = 0; i < count - 1; i++) {
        for (let j = 0; j < ACROSS - 1; j++) {
          const a = i * ACROSS + j;
          const b = a + ACROSS;
          index.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }

      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(position, 3));
      geometry.setAttribute('normal', new BufferAttribute(normal, 3));
      geometry.setAttribute('uv', new BufferAttribute(uv, 2));
      geometry.setAttribute('aLength', new BufferAttribute(length, 1));
      geometry.setIndex(index);
      mesh.geometry.dispose();
      mesh.geometry = geometry;
    },
  };
}
