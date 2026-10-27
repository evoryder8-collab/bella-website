import { copy, DEFAULT_LANG, studios } from './content.js';
import { paintStarfield } from './starfield.js';

// The studios map (MapLibre GL JS 6.12, WebGL). It opens on the whole Earth as
// a globe in deep space: NASA Blue Marble imagery with an atmosphere rim and a
// starfield behind. When the section comes into view the camera flies down from
// orbit to the Vasastan studio, where the photo-real Earth hands over to the
// rose-tinted street map with 3D buildings, and then orbits slowly. The chips
// fly between the two studios. The map is not draggable, so it never fights
// page scrolling.

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
// Public-domain NASA imagery, served with CORS by NASA GIBS (up to zoom 8).
const EARTH_TILES =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg';
const ROSE = {
  background: '#f6e9e4',
  water: '#e6c6c1',
  green: '#efd9d1',
  building: '#ecd3cb',
  road: '#fff6f2',
  label: '#6b4a50',
  halo: '#f6e9e4',
};
const STREET = { zoom: 15.4, pitch: 58 };

// Loads MapLibre only when the studios section is close.
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
  const frame = container.parentElement;
  const space = frame.querySelector('[data-space]');
  paintStarfield(space);
  window.addEventListener('resize', () => paintStarfield(space));

  const [{ Map, Marker, setWorkerUrl }, { default: workerUrl }] = await Promise.all([
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
    import('maplibre-gl/dist/maplibre-gl.css'),
  ]);
  setWorkerUrl(workerUrl);

  const animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Zoomed out far enough that the whole globe floats inside the frame.
  const orbitZoom = Math.log2(Math.min(container.clientWidth, container.clientHeight) / 330) + 0.6;

  const map = new Map({
    container,
    style: STYLE_URL,
    center: animate ? [-20, 32] : studios[0].coords,
    zoom: animate ? orbitZoom : STREET.zoom - 0.6,
    interactive: false,
    attributionControl: { compact: true },
    // Transparent around the globe, so the starfield behind shows as space.
    canvasContextAttributes: { alpha: true },
  });

  map.on('style.load', () => {
    map.setProjection({ type: 'globe' });
    tint(map);
    // No country names over the Earth from orbit; place names appear as we come down.
    for (const { id, type } of map.getStyle().layers) if (type === 'symbol') map.setLayerZoomRange(id, 9, 24);
    addBuildings(map);
    map.addSource('earth', { type: 'raster', tiles: [EARTH_TILES], tileSize: 256, maxzoom: 8, attribution: 'Earth imagery: NASA Blue Marble' });
    map.addLayer({
      id: 'earth',
      type: 'raster',
      source: 'earth',
      paint: {
        'raster-opacity': ['interpolate', ['linear'], ['zoom'], 6.5, 1, 8.5, 0],
        'raster-contrast': 0.08,
        'raster-saturation': 0.06,
        'raster-fade-duration': 0,
      },
      maxzoom: 9,
    });
    // A thin atmosphere rim in orbit, gone by the time we reach the streets.
    map.setSky({
      // Clear in orbit so the starfield shows round the globe; blush near the ground.
      'sky-color': ['interpolate', ['linear'], ['zoom'], 0, 'rgba(246, 233, 228, 0)', 10, 'rgba(246, 233, 228, 0)', 13, ROSE.background],
      'horizon-color': ['interpolate', ['linear'], ['zoom'], 0, 'rgba(247, 211, 204, 0)', 10, 'rgba(247, 211, 204, 0)', 13, '#f7d3cc'],
      'fog-color': ['interpolate', ['linear'], ['zoom'], 0, 'rgba(246, 233, 228, 0)', 10, 'rgba(246, 233, 228, 0)', 13, ROSE.background],
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.7,
      'fog-ground-blend': 0.4,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.32, 5, 0.22, 8, 0],
    });
  });

  map.once('load', () => {
    frame.classList.add('has-map');

    // Studio names are the same in both languages.
    const pins = studios.map((studio, i) => {
      const pin = document.createElement('span');
      pin.className = 'map-pin';
      pin.innerHTML = `<span class="map-pin-dot"></span><span class="map-pin-label">${copy[DEFAULT_LANG].studios.items[i].name}</span>`;
      // Anchor on the left edge, shifted so the 16px dot sits on the coordinate.
      new Marker({ element: pin, anchor: 'left', offset: [-8, 0] }).setLngLat(studio.coords).addTo(map);
      return pin;
    });

    // Space and the pins follow the altitude: stars in orbit, pins near the ground.
    const altitude = () => {
      const zoom = map.getZoom();
      space.style.opacity = String(Math.min(1, Math.max(0, (5.5 - zoom) / 3)));
      const { lng, lat } = map.getCenter();
      space.style.transform = `translate3d(${(-lng * 0.35).toFixed(1)}px, ${(lat * 0.35).toFixed(1)}px, 0) scale(1.25)`;
      frame.classList.toggle('is-orbit', zoom < 10);
    };
    map.on('move', altitude);
    altitude();

    // A slow cinematic orbit round the studio once the camera has landed.
    let orbiting = false;
    const orbit = () => {
      if (!animate || !orbiting) return;
      map.rotateTo(map.getBearing() + 40, { duration: 30000, easing: (t) => t });
    };
    map.on('moveend', orbit);

    const focus = (i, duration) => {
      orbiting = false;
      map.stop();
      map.once('moveend', () => {
        orbiting = true;
        orbit();
      });
      map.flyTo({
        center: studios[i].coords,
        zoom: STREET.zoom,
        pitch: animate ? STREET.pitch : 0,
        bearing: animate ? (i ? 18 : -16) : 0,
        duration: animate ? duration : 0,
        curve: 1.5,
        essential: true,
      });
      pins.forEach((pin, j) => pin.classList.toggle('is-active', i === j));
      chips.forEach((chip, j) => chip.setAttribute('aria-pressed', String(i === j)));
    };
    for (const chip of chips) chip.addEventListener('click', () => focus(Number(chip.dataset.studio), 3200));

    if (!animate) return focus(0, 0);

    // Until the section is in view the Earth turns slowly in space.
    let turning = true;
    const turn = () => turning && map.easeTo({ center: [map.getCenter().lng + 30, 32], duration: 9000, easing: (t) => t });
    map.on('moveend', turn);
    turn();
    whenVisible(container, () => {
      turning = false;
      map.off('moveend', turn);
      focus(0, 8000);
    });
  });
}

function whenVisible(container, callback) {
  const visible = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      visible.disconnect();
      callback();
    },
    { threshold: 0.55 },
  );
  visible.observe(container);
}

// 3D buildings in blush, with a pale roof cap, lit from the south-west.
function addBuildings(map) {
  const firstLabel = map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id;
  const height = ['*', ['max', ['coalesce', ['get', 'render_height'], 6], 4], 1.4];
  const base = ['*', ['coalesce', ['get', 'render_min_height'], 0], 1.4];
  const filter = ['!=', ['get', 'hide_3d'], true];
  try {
    map.addLayer(
      {
        id: 'bb-buildings',
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 13.5,
        filter,
        paint: {
          'fill-extrusion-color': '#ecd2ca',
          'fill-extrusion-height': height,
          'fill-extrusion-base': base,
          'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 14.5, 0.92],
          'fill-extrusion-vertical-gradient': true,
        },
      },
      firstLabel,
    );
    map.addLayer(
      {
        id: 'bb-roofs',
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 13.5,
        filter,
        paint: {
          'fill-extrusion-color': '#fbefea',
          'fill-extrusion-height': ['+', height, 0.6],
          'fill-extrusion-base': height,
          'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 14.5, 0.95],
        },
      },
      firstLabel,
    );
    map.setLight({ anchor: 'map', color: '#fff3ee', intensity: 0.42, position: [1.3, 210, 35] });
  } catch (error) {
    console.warn('3D buildings unavailable:', error);
  }
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
