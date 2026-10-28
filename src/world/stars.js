import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, NormalBlending, Points, ShaderMaterial, Vector3 } from 'three';

// A quiet universe through the depth of the whole page: small stars with a
// bright core and a soft halo, each twinkling at its own pace. Most are faint
// and far; a few brighter ones carry a fine four-point glint. They hang almost
// still, drifting only as slowly as a night sky, and brighten and part a
// little around a finger.

const vertexShader = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  attribute float aTone;
  uniform float uTime;
  uniform vec3 uPointer;
  uniform float uPixelRatio;
  uniform float uScale;
  varying float vAlpha;
  varying float vTone;
  varying float vGlint;
  void main() {
    vec3 p = position;
    float t = uTime * (0.015 + aSeed * 0.02);
    p.x += sin(t + aSeed * 40.0) * 0.04;
    p.y += cos(t * 0.8 + aSeed * 23.0) * 0.05;
    vec3 d = p - uPointer;
    float f = exp(-dot(d.xy, d.xy) / 0.9);
    p.xy += normalize(d.xy + 1e-4) * f * 0.07;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * uScale / -mv.z;
    // Twinkling: a slow swell and a quicker shimmer, out of step for every star.
    float swell = 0.5 + 0.5 * sin(uTime * (0.35 + aSeed * 0.6) + aSeed * 31.0);
    float shimmer = 0.5 + 0.5 * sin(uTime * (1.7 + aSeed * 2.3) + aSeed * 57.0);
    float twinkle = 0.35 + 0.65 * swell * (0.75 + 0.25 * shimmer);
    vAlpha = mix(0.95, 0.55, smoothstep(9.0, 5.5, -mv.z)) * twinkle * (1.0 + f * 0.9);
    vTone = aTone;
    vGlint = smoothstep(0.9, 1.0, aSeed);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uRose;
  uniform vec3 uChampagne;
  uniform vec3 uCore;
  varying float vAlpha;
  varying float vTone;
  varying float vGlint;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c);
    if (r2 > 0.25) discard;
    float core = exp(-r2 * 95.0);
    float halo = exp(-r2 * 22.0) * 0.3;
    // The brightest few: two fine rays of light, fading out from the core.
    float rays = vGlint * (exp(-abs(c.x) * 70.0) + exp(-abs(c.y) * 70.0)) * exp(-r2 * 34.0) * 0.55;
    vec3 tint = mix(uRose, uChampagne, vTone);
    vec3 color = mix(tint, uCore, clamp(core + rays * 0.6, 0.0, 1.0));
    gl_FragColor = vec4(color, (core + halo + rays) * vAlpha);
    #include <colorspace_fragment>
  }
`;

export function createStars() {
  const uniforms = {
    uTime: { value: 0 },
    uPointer: { value: new Vector3(0, 0, -99) },
    uPixelRatio: { value: 1 },
    uScale: { value: 8 },
    uRose: { value: new Color('#f1aeb0') },
    uChampagne: { value: new Color('#f2cfa8') },
    uCore: { value: new Color('#fffaf6') },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });
  const points = new Points(new BufferGeometry(), material);
  points.frustumCulled = false;

  return {
    points,
    uniforms,
    // In dark sections the stars add their light, like a night sky; on blush,
    // normal blending keeps them as soft rose glints.
    setDark(dark) {
      material.blending = dark ? AdditiveBlending : NormalBlending;
    },
    build({ total, k, count, halfWidthAt }) {
      const position = new Float32Array(count * 3);
      const seed = new Float32Array(count);
      const size = new Float32Array(count);
      const tone = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const z = -4 + Math.random() * 6.5;
        position[i * 3] = (Math.random() * 2.3 - 1.15) * halfWidthAt(z);
        position[i * 3 + 1] = -Math.random() * total * k;
        position[i * 3 + 2] = z;
        seed[i] = Math.random();
        // Mostly small; the glinting few (seed > 0.9) a little larger.
        size[i] = (6 + Math.random() ** 3 * 9) * (seed[i] > 0.9 ? 1.8 : 1);
        tone[i] = Math.random();
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(position, 3));
      geometry.setAttribute('aSeed', new BufferAttribute(seed, 1));
      geometry.setAttribute('aSize', new BufferAttribute(size, 1));
      geometry.setAttribute('aTone', new BufferAttribute(tone, 1));
      points.geometry.dispose();
      points.geometry = geometry;
    },
  };
}
