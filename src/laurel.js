// A laurel wreath in champagne gold, drawn as SVG: two mirrored branches of
// leaves round an open centre. Used by the premiere (src/premiere.js), where it
// grows leaf by leaf, and on the About page, where it is drawn at once.

// One branch of the laurel (the left; the right is its mirror image): a curved
// stem with pairs of leaves that grow larger towards the middle.
const STEM = [
  [150, 188],
  [72, 180],
  [26, 112],
  [54, 24],
];
const LEAF = 'M0 0 C 5 -5.5, 15 -5.5, 21 0 C 15 5.5, 5 5.5, 0 0 Z';

const bezier = (t) => {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  const d = [-3 * u * u, 3 * u * u - 6 * u * t, 6 * u * t - 3 * t * t, 3 * t * t];
  const sum = (weights, axis) => weights.reduce((total, weight, i) => total + weight * STEM[i][axis], 0);
  return { x: sum(w, 0), y: sum(w, 1), angle: (Math.atan2(sum(d, 1), sum(d, 0)) * 180) / Math.PI };
};

export function laurel(id = 'laurel-gold') {
  const leaves = [];
  for (let i = 0; i < 9; i++) {
    const t = 0.1 + i * 0.1;
    const { x, y, angle } = bezier(t);
    const size = 0.75 + Math.sin(t * Math.PI) * 0.45;
    for (const side of [-1, 1]) {
      leaves.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(angle + side * 38).toFixed(1)}) scale(${size.toFixed(2)})"><path class="laurel-leaf" fill="url(#${id})" d="${LEAF}"/></g>`);
    }
  }
  const tip = bezier(1);
  leaves.push(`<g transform="translate(${tip.x.toFixed(1)} ${tip.y.toFixed(1)}) rotate(${tip.angle.toFixed(1)}) scale(0.9)"><path class="laurel-leaf" fill="url(#${id})" d="${LEAF}"/></g>`);
  const [a, b, c, d] = STEM;
  const branch = `<path class="laurel-stem" pathLength="1" d="M${a} C${b} ${c} ${d}"/>${leaves.join('')}`;
  return `
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fbeee6"/><stop offset="0.55" stop-color="#e8c3b4"/><stop offset="1" stop-color="#c99183"/>
      </linearGradient>
    </defs>
    <g>${branch}</g>
    <g transform="matrix(-1 0 0 1 320 0)">${branch}</g>`;
}

// Fills every <svg data-laurel> on the page with a wreath.
export function drawLaurels(root = document) {
  root.querySelectorAll('svg[data-laurel]').forEach((svg, i) => (svg.innerHTML = laurel(`laurel-gold-${i}`)));
}
