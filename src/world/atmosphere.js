import { CanvasTexture, Color, LinearFilter, Mesh, PlaneGeometry, ShaderMaterial, SRGBColorSpace, Vector2 } from 'three';
import { paintToneCanvas } from '../tones.js';

// The backdrop of the whole page: the tone gradient for the part of the page
// on screen, with slow drifting blooms of light, a glow that follows the
// finger and fine grain against banding. Drawn straight in clip space, behind
// everything, and opaque, so the quartz stone refracts it.

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTones;
  uniform vec2 uViewport;
  uniform float uScroll;
  uniform float uTotal;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uPointerPower;
  uniform float uDim;
  uniform float uPulse;
  uniform vec3 uNight;
  uniform vec3 uNightGlow;
  varying vec2 vUv;

  float bloom(vec2 p, vec2 c, float r) {
    vec2 d = p - c;
    return exp(-dot(d, d) / (r * r));
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    float y = (1.0 - vUv.y) * uViewport.y;
    float v = clamp((uScroll + y) / uTotal, 0.0, 1.0);
    vec3 base = texture2D(uTones, vec2(0.25, v)).rgb;
    vec3 glow = texture2D(uTones, vec2(0.75, v)).rgb;
    // While the portal is open the whole world sinks into a deep wine night.
    base = mix(base, uNight, uDim);
    glow = mix(glow, uNightGlow, uDim);

    float aspect = uViewport.x / uViewport.y;
    vec2 p = vec2(vUv.x * aspect, vUv.y);
    float t = uTime * 0.06;
    float drift = uScroll / uViewport.y;
    float light = 0.0;
    light += bloom(p, vec2(aspect * (0.18 + 0.12 * sin(t * 1.3)), 0.78 + 0.08 * cos(t + drift * 0.7)), 0.62);
    light += 0.8 * bloom(p, vec2(aspect * (0.86 + 0.08 * cos(t * 0.9)), 0.28 + 0.1 * sin(t * 1.1 + drift)), 0.58);
    light += 0.5 * bloom(p, vec2(aspect * (0.5 + 0.3 * sin(t * 0.7 + drift * 0.4)), 0.5 + 0.3 * cos(t * 0.5)), 0.8);
    light += uPointerPower * bloom(p, vec2(uPointer.x * aspect, uPointer.y), 0.32);

    light += uPulse * 1.4 * bloom(p, vec2(aspect * 0.5, 0.72), 0.7);
    vec3 color = mix(base, glow, clamp(light * 0.32, 0.0, 0.75));
    float vignette = smoothstep(1.25, 0.35, length(vUv - 0.5) * 1.6);
    color *= mix(0.9, 1.0, vignette);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
    gl_FragColor.rgb += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.022;
  }
`;

export function createAtmosphere() {
  const canvas = document.createElement('canvas');
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  // Row 0 of the canvas is the top of the page, and the shader reads it at v = 0.
  texture.flipY = false;

  const uniforms = {
    uTones: { value: texture },
    uViewport: { value: new Vector2(1, 1) },
    uScroll: { value: 0 },
    uTotal: { value: 1 },
    uTime: { value: 0 },
    uPointer: { value: new Vector2(0.5, 0.5) },
    uPointerPower: { value: 0 },
    uDim: { value: 0 },
    uPulse: { value: 0 },
    uNight: { value: new Color('#1a0d12') },
    uNightGlow: { value: new Color('#8a3a4b') },
  };
  const mesh = new Mesh(
    new PlaneGeometry(2, 2),
    new ShaderMaterial({ uniforms, vertexShader, fragmentShader, depthTest: false, depthWrite: false }),
  );
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;

  return {
    mesh,
    uniforms,
    // Re-read the section tones (after layout changes).
    repaint() {
      uniforms.uTotal.value = paintToneCanvas(canvas);
      texture.needsUpdate = true;
    },
  };
}
