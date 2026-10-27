import { copy, DEFAULT_LANG, studios } from './content.js';

// Muted, light basemap with no API key, recoloured to the rose palette on load.
// Attribution is shown by MapLibre.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const ROSE = {
  background: '#f6e9e4',
  water: '#e6c6c1',
  green: '#efd9d1',
  building: '#ecd3cb',
  road: '#fff6f2',
  label: '#6b4a50',
  halo: '#f6e9e4',
};

// Loads MapLibre only when the studios section is close. The map shows both
// studios; the chips fly the camera to one. It is not draggable, so it never
// fights page scrolling.
export function initMap(container, chips) {
  if (!container) return;
  const near = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      near.disconnect();
      load(container, [...chips]).catch((error) => console.warn('Map unavailable:', error));
    },
    { rootMargin: '600px 0px' },
  );
  near.observe(container);
}

async function load(container, chips) {
  const [{ LngLatBounds, Map, Marker, setWorkerUrl }, { default: workerUrl }] = await Promise.all([
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
    import('maplibre-gl/dist/maplibre-gl.css'),
  ]);
  setWorkerUrl(workerUrl);

  const animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bounds = new LngLatBounds(studios[0].coords, studios[0].coords).extend(studios[1].coords);
  const overview = { padding: { top: 90, bottom: 60, left: 60, right: 140 }, pitch: animate ? 40 : 0, bearing: animate ? -12 : 0 };

  const map = new Map({
    container,
    style: STYLE_URL,
    bounds,
    fitBoundsOptions: { padding: 40 },
    interactive: false,
    attributionControl: { compact: true },
  });

  map.once('load', () => {
    tint(map);
    container.parentElement.classList.add('has-map');

    // Studio names are the same in both languages.
    const pins = studios.map((studio, i) => {
      const pin = document.createElement('span');
      pin.className = 'map-pin';
      pin.innerHTML = `<span class="map-pin-dot"></span><span class="map-pin-label">${copy[DEFAULT_LANG].studios.items[i].name}</span>`;
      // Anchor on the left edge, shifted so the 16px dot sits on the coordinate.
      new Marker({ element: pin, anchor: 'left', offset: [-8, 0] }).setLngLat(studio.coords).addTo(map);
      return pin;
    });

    const focus = (i) => {
      map.flyTo({
        center: studios[i].coords,
        zoom: 15.4,
        pitch: animate ? 55 : 0,
        bearing: animate ? (i ? 18 : -16) : 0,
        duration: animate ? 2800 : 0,
        essential: true,
      });
      pins.forEach((pin, j) => pin.classList.toggle('is-active', i === j));
      chips.forEach((chip, j) => chip.setAttribute('aria-pressed', String(i === j)));
    };
    for (const chip of chips) chip.addEventListener('click', () => focus(Number(chip.dataset.studio)));

    if (animate) flyInWhenVisible(container, () => map.fitBounds(bounds, { ...overview, duration: 3200, essential: true }));
    else map.fitBounds(bounds, { ...overview, duration: 0 });
  });
}

function flyInWhenVisible(container, fly) {
  const visible = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      visible.disconnect();
      fly();
    },
    { threshold: 0.45 },
  );
  visible.observe(container);
}

function tint(map) {
  const set = (id, property, value) => {
    try {
      map.setPaintProperty(id, property, value);
    } catch {
      // Not every layer supports every property; leave those as they are.
    }
  };
  for (const { id, type } of map.getStyle().layers) {
    if (type === 'background') set(id, 'background-color', ROSE.background);
    else if (type === 'fill' && /water/.test(id)) set(id, 'fill-color', ROSE.water);
    else if (type === 'fill' && /building/.test(id)) set(id, 'fill-color', ROSE.building);
    else if (type === 'fill' && /park|wood|grass|landcover|landuse/.test(id)) set(id, 'fill-color', ROSE.green);
    else if (type === 'line' && /water|river/.test(id)) set(id, 'line-color', ROSE.water);
    else if (type === 'line' && /road|highway|street|bridge|tunnel|path|rail/.test(id)) set(id, 'line-color', ROSE.road);
    else if (type === 'symbol') {
      set(id, 'text-color', ROSE.label);
      set(id, 'text-halo-color', ROSE.halo);
    }
  }
}
