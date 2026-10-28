// How the phone is tilted, for the hero portrait's parallax (src/world/media.js):
// -1 to 1 on each screen axis, measured from however the phone is being held,
// a centre that slowly follows a new way of holding it. iPhones only share
// their motion after asking, and may only ask from a tap, so the question
// comes with the visitor's first tap (on a first visit, the sound choice).

const RANGE = 18; // degrees of tilt for the full effect
const RECENTRE = 0.002; // how quickly the rest position follows, per reading

const state = { x: 0, y: 0, active: false };
let rest = null;

export const tilt = () => state;

export function initTilt() {
  if (!('DeviceOrientationEvent' in window) || !matchMedia('(pointer: coarse)').matches) return;
  const listen = () => window.addEventListener('deviceorientation', turn, { passive: true });
  if (typeof DeviceOrientationEvent.requestPermission !== 'function') return listen();
  const ask = () =>
    DeviceOrientationEvent.requestPermission()
      .then((answer) => answer === 'granted' && listen())
      .catch(() => {});
  window.addEventListener('click', ask, { once: true, capture: true });
}

const clamp = (v) => Math.max(-1, Math.min(1, v));

function turn({ beta, gamma }) {
  if (beta == null || gamma == null) return;
  // Onto the screen's own axes, upright or on its side.
  const angle = screen.orientation?.angle ?? window.orientation ?? 0;
  let x = gamma;
  let y = beta;
  if (angle === 90) [x, y] = [beta, -gamma];
  else if (angle === -90 || angle === 270) [x, y] = [-beta, gamma];
  rest ??= { x, y };
  rest.x += (x - rest.x) * RECENTRE;
  rest.y += (y - rest.y) * RECENTRE;
  state.x = clamp((x - rest.x) / RANGE);
  state.y = clamp((y - rest.y) / RANGE);
  state.active = true;
}
