// The floating figure beside the treatments, one per group: a serene face
// (face), the same face mapped with acupressure points, qi flowing along its
// lift lines and a rose-quartz gua sha stone gliding up the cheek (signature
// TCM), and a traditional acupuncture figure with meridians and points, after
// the classic bronze statues (body). Line art draws itself in each time the
// group changes; points pulse and qi flows continuously. Purely decorative.

const MIRROR = 'matrix(-1 0 0 1 240 0)';

// Face line art; the numbers stagger the drawing.
const FACE = [
  [0, 'M82 96 C 77 132, 86 170, 105 196 C 113 207, 127 207, 135 196 C 154 170, 163 132, 158 96'],
  [1, 'M80 108 C 66 64, 94 30, 122 30 C 152 30, 178 60, 162 110'],
  [2, 'M82 98 C 62 132, 64 176, 74 218'],
  [2, 'M160 98 C 180 134, 176 178, 168 220'],
  [3, 'M122 30 C 112 44, 100 60, 96 84'],
  [4, 'M94 113 C 101 107, 110 107, 116 111'],
  [4, 'M124 111 C 130 107, 139 107, 146 113'],
  [5, 'M95 127 C 101 133, 110 133, 115 127'],
  [5, 'M125 127 C 130 133, 139 133, 145 127'],
  [6, 'M120 130 C 118 146, 114 155, 116 160 C 119 163, 124 162, 127 159'],
  [7, 'M108 179 C 113 174, 117 175, 120 178 C 123 175, 127 174, 132 179 C 127 187, 113 187, 108 179'],
  [8, 'M107 203 C 107 222, 103 236, 92 252 C 80 256, 66 260, 56 270'],
  [8, 'M133 203 C 133 222, 137 236, 148 252 C 160 256, 174 260, 184 270'],
];
const SPARKS = [
  [182, 64, 0],
  [58, 150, 2],
  [190, 184, 4],
];

// Signature TCM: lift lines and acupoints (Baihui, Yintang, Taiyang, Sibai,
// Yingxiang, Dicang, Jiache, Chengjiang).
const LIFT = 'M104 190 C 94 172, 90 152, 94 134 C 96 124, 92 114, 84 106';
const TCM_QI = [LIFT, 'M136 190 C 146 172, 150 152, 146 134 C 144 124, 148 114, 156 106', 'M100 100 C 110 94, 130 94, 140 100'];
const TCM_POINTS = [
  [122, 32, 0],
  [120, 113, 1],
  [86, 116, 2],
  [154, 116, 2],
  [105, 141, 3],
  [135, 141, 3],
  [112, 156, 4],
  [128, 156, 4],
  [107, 181, 5],
  [133, 181, 5],
  [91, 186, 6],
  [149, 186, 6],
  [120, 191, 7],
];
const STONE = 'M-11 2 C -8 -7, 5 -8, 11 -3 C 13 0, 10 5, 5 4 C 0 3, -5 7, -11 2 Z';

// Body: the right half of the figure (mirrored for the left), head and topknot.
const HALF =
  'M128 48 C 128 54, 129 58, 133 60 C 143 62, 155 63, 161 70 C 167 78, 169 96, 171 118 C 173 138, 177 156, 181 170 C 183 177, 180 184, 175 182 C 171 180, 169 172, 167 164 C 163 146, 161 124, 157 104 C 155 98, 153 96, 152 100 C 151 116, 147 130, 145 142 C 147 152, 151 160, 151 170 C 151 196, 149 226, 147 256 C 147 264, 151 270, 153 274 L 129 274 C 129 262, 130 240, 129 214 C 128 196, 126 184, 120 178';
const BODY_QI = ['M133 66 C 135 100, 137 130, 139 162 C 141 200, 139 236, 140 268', 'M157 74 C 165 100, 169 130, 177 172'];
const BODY_POINTS = [
  [134, 92, 1],
  [136, 122, 2],
  [138, 150, 3],
  [140, 198, 4],
  [139, 232, 5],
  [140, 262, 6],
  [161, 90, 2],
  [167, 120, 3],
  [173, 150, 4],
];
const REN_POINTS = [
  [120, 84, 0],
  [120, 108, 1],
  [120, 132, 2],
  [120, 156, 3],
];

const line = ([delay, d], extra = '') => `<path class="ln" pathLength="1" style="--d: ${delay}" d="${d}" ${extra}/>`;
const qi = (d, extra = '') => `<path class="qi" pathLength="1" d="${d}" ${extra}/>`;
const point = ([x, y, delay]) => `<circle class="pt" style="--d: ${delay}" cx="${x}" cy="${y}" r="2.6"/>`;
// Points pulse with a CSS transform, which would replace a mirroring transform
// attribute, so mirrored points get mirrored coordinates instead.
const mirrored = ([x, y, delay]) => [240 - x, y, delay];

const face = () => FACE.map((entry) => line(entry)).join('');

const SVG = `
<svg viewBox="0 0 240 280" focusable="false">
  <defs>
    <linearGradient id="fg-line" gradientUnits="userSpaceOnUse" x1="40" y1="20" x2="200" y2="270">
      <stop offset="0" stop-color="#c98a8e"/><stop offset="0.5" stop-color="#8e4651"/><stop offset="1" stop-color="#d9a19d"/>
    </linearGradient>
    <linearGradient id="fg-bronze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3c9c1"/><stop offset="1" stop-color="#b9787a"/>
    </linearGradient>
    <linearGradient id="fg-quartz" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff1ef"/><stop offset="1" stop-color="#e7a3a0"/>
    </linearGradient>
  </defs>
  <g class="figure">
    ${face()}
    ${SPARKS.map(([x, y, delay]) => `<g transform="translate(${x} ${y})"><path class="spark" style="--d: ${delay}" d="M0 -6 L1.4 -1.4 L6 0 L1.4 1.4 L0 6 L-1.4 1.4 L-6 0 L-1.4 -1.4 Z"/></g>`).join('')}
  </g>
  <g class="figure">
    ${face()}
    ${TCM_QI.map((d) => qi(d)).join('')}
    ${TCM_POINTS.map(point).join('')}
    <path class="stone" d="${STONE}">
      <animateMotion dur="3.6s" repeatCount="indefinite" rotate="auto" keyPoints="0;1;1" keyTimes="0;0.75;1" calcMode="spline" keySplines="0.45 0 0.2 1;0 0 1 1" path="${LIFT}"/>
    </path>
  </g>
  <g class="figure">
    <ellipse class="ground" cx="120" cy="276" rx="46" ry="4"/>
    <path class="bronze" d="${HALF} L 120 48 Z"/>
    <path class="bronze" transform="${MIRROR}" d="${HALF} L 120 48 Z"/>
    ${line([0, HALF])}
    ${line([0, HALF], `transform="${MIRROR}"`)}
    <circle class="ln" pathLength="1" style="--d: 1" cx="120" cy="32" r="15"/>
    <circle class="ln" pathLength="1" style="--d: 2" cx="120" cy="12" r="5.5"/>
    ${line([2, 'M108 13 L132 11'])}
    ${qi('M120 64 L120 176')}
    ${BODY_QI.map((d) => qi(d) + qi(d, `transform="${MIRROR}"`)).join('')}
    ${[...REN_POINTS, ...BODY_POINTS, ...BODY_POINTS.map(mirrored)].map(point).join('')}
  </g>
</svg>`;

export function initFigures(stage) {
  if (!stage) return;
  stage.innerHTML = SVG;
  const figures = [...stage.querySelectorAll('.figure')];
  let current = -1;
  let seen = false;
  let wanted = 0;

  const show = (index) => {
    wanted = index;
    if (!seen || index === current || !figures[index]) return;
    current = index;
    figures.forEach((figure, i) => {
      figure.classList.toggle('is-active', i === index);
      figure.classList.remove('is-drawing');
    });
    void stage.getBoundingClientRect(); // restart the drawing animation
    figures[index].classList.add('is-drawing');
  };

  const visible = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    visible.disconnect();
    seen = true;
    show(wanted);
  }, { threshold: 0.4 });
  visible.observe(stage);

  document.addEventListener('treatmentgroup', (event) => show(event.detail));
}
