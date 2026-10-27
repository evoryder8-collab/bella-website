import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, NormalBlending, Points, ShaderMaterial, Vector3 } from 'three';

// Pearl light: soft motes spread through the depth of the whole page. Near
// ones are large and faint like out-of-focus bokeh, far ones small and crisp.
// They drift, and swirl around a finger.

const vertexShader = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform vec3 uPointer;
  uniform float uPixelRatio;
  uniform float uScale;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float t = uTime * (0.12 + aSeed * 0.22);
    p.x += sin(t + aSeed * 40.0) * 0.16;
    p.y += cos(t * 0.8 + aSeed * 23.0) * 0.2;
    vec3 d = p - uPointer;
    float f = exp(-dot(d.xy, d.xy) / 0.7);
    p.xy += vec2(-d.y, d.x) * f * 0.55 + normalize(d.xy + 1e-4) * f * 0.2;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * uScale / -mv.z;
    vAlpha = mix(0.8, 0.22, smoothstep(9.0, 5.0, -mv.z)) * (0.6 + 0.4 * sin(uTime * 0.9 + aSeed * 31.0));
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uCore;
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, r);
    vec3 color = mix(uColor, uCore, smoothstep(0.24, 0.0, r));
    gl_FragColor = vec4(color, soft * vAlpha);
    #include <colorspace_fragment>
  }
`;

export function createPearls() {
  const uniforms = {
    uTime: { value: 0 },
    uPointer: { value: new Vector3(0, 0, -99) },
    uPixelRatio: { value: 1 },
    uScale: { value: 8 },
    uColor: { value: new Color('#f6c4c0') },
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
    // Brighter, additive light in dark sections reads as glow; on blush, normal blending reads as pearl.
    setDark(dark) {
      material.blending = dark ? AdditiveBlending : NormalBlending;
    },
    build({ total, k, count, halfWidthAt }) {
      const position = new Float32Array(count * 3);
      const seed = new Float32Array(count);
      const size = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const z = -4 + Math.random() * 6.5;
        position[i * 3] = (Math.random() * 2.3 - 1.15) * halfWidthAt(z);
        position[i * 3 + 1] = -Math.random() * total * k;
        position[i * 3 + 2] = z;
        seed[i] = Math.random();
        size[i] = 5 + Math.random() ** 3 * 26;
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(position, 3));
      geometry.setAttribute('aSeed', new BufferAttribute(seed, 1));
      geometry.setAttribute('aSize', new BufferAttribute(size, 1));
      points.geometry.dispose();
      points.geometry = geometry;
    },
  };
}
