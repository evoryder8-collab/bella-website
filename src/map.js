import { contact } from './content.js';

// Muted, light basemap with no API key. Attribution is shown by MapLibre.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

// Loads MapLibre only when the contact section is close, then eases the camera
// in on the studio once the map is actually on screen. The map is decorative
// (no dragging or zooming), so it never fights page scrolling.
export function initMap(container) {
  if (!container) return;
  const near = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      near.disconnect();
      load(container).catch((error) => console.warn('Map unavailable:', error));
    },
    { rootMargin: '600px 0px' },
  );
  near.observe(container);
}

async function load(container) {
  const [{ Map, Marker, setWorkerUrl }, { default: workerUrl }] = await Promise.all([
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
    import('maplibre-gl/dist/maplibre-gl.css'),
  ]);
  setWorkerUrl(workerUrl);

  const animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const map = new Map({
    container,
    style: STYLE_URL,
    center: contact.coords,
    zoom: animate ? 12.4 : 15,
    interactive: false,
    attributionControl: { compact: true },
  });

  map.once('load', () => {
    container.parentElement.classList.add('has-map');
    const pin = document.createElement('span');
    pin.className = 'map-pin';
    new Marker({ element: pin }).setLngLat(contact.coords).addTo(map);
    if (animate) flyInWhenVisible(map, container);
  });
}

function flyInWhenVisible(map, container) {
  const visible = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      visible.disconnect();
      map.flyTo({ center: contact.coords, zoom: 15.3, pitch: 50, bearing: -14, duration: 3600, essential: true });
    },
    { threshold: 0.45 },
  );
  visible.observe(container);
}
