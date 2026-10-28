// The soundscape, mostly composed live with Web Audio: a slow ambient pad that
// drifts through four chords, a breath of "air" that rises with scrolling like
// moving through silk, and crystal chimes for the quartz stone. The whooshes are
// recorded (src/sfx, about 130 KB in all, with a button click, the magazine's
// riffle and a sparkle for the 3D figures) and load once sound starts. Everything
// is silent until startSound() runs from a click (browsers only allow audio
// after a gesture), and every call before that is a no-op.

const SCALE = [587.33, 659.26, 739.99, 880, 987.77, 1174.66]; // D major pentatonic, D5–D6
const CHORDS = [
  [146.83, 220.0, 277.18, 329.63, 369.99], // Dmaj9
  [123.47, 185.0, 220.0, 293.66, 329.63], // Bm11
  [98.0, 146.83, 185.0, 246.94, 329.63], // Gmaj9
  [110.0, 164.81, 246.94, 293.66, 369.99], // A9sus
];
const CHORD_SECONDS = 14;
const STORAGE_KEY = 'bebeauty-sound';

// Recorded sounds: two long whooshes and three short ones, each kind played in
// turn, and one take each of the rest.
const TAKES = {
  click: [new URL('./sfx/click.mp3', import.meta.url).href],
  riffle: [new URL('./sfx/pages-riffle.mp3', import.meta.url).href],
  magic: [new URL('./sfx/magic.mp3', import.meta.url).href],
  long: [new URL('./sfx/whoosh-long-a.mp3', import.meta.url).href, new URL('./sfx/whoosh-long-b.mp3', import.meta.url).href],
  short: [
    new URL('./sfx/whoosh-short-a.mp3', import.meta.url).href,
    new URL('./sfx/whoosh-short-b.mp3', import.meta.url).href,
    new URL('./sfx/whoosh-short-c.mp3', import.meta.url).href,
  ],
};

let ctx = null;
let master = null;
let bus = null;
let padFilter = null;
let airFilter = null;
let airGain = null;
let sfx = null;
let voices = [];
let muted = false;
const takes = Object.fromEntries(Object.keys(TAKES).map((kind) => [kind, []]));
const turns = Object.fromEntries(Object.keys(TAKES).map((kind) => [kind, 0]));
let magicHeard = false;
let lastChime = 0;
const listeners = new Set();

export function soundPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function remember(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Not remembered in private mode; the visitor is simply asked again next time.
  }
}

export const isPlaying = () => Boolean(ctx) && !muted;
export const onSoundChange = (fn) => listeners.add(fn);
const notify = () => listeners.forEach((fn) => fn(isPlaying()));

// A stereo reverb tail: decaying noise, generated rather than loaded.
function impulse(seconds, decay) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
  }
  return buffer;
}

function noiseBuffer(seconds) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < data.length; i++) {
    brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = brown * 3.5;
  }
  return buffer;
}

function buildPad() {
  padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 900;
  padFilter.Q.value = 0.6;
  padFilter.connect(bus);

  voices = CHORDS[0].map((frequency, i) => {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(0.05, ctx.currentTime, 2);
    // Each voice breathes at its own slow rate.
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 0.05 + i * 0.021;
    depth.gain.value = 0.025;
    lfo.connect(depth).connect(gain.gain);
    lfo.start();
    const oscillators = [
      ['sine', 0],
      ['triangle', 5],
      ['sine', -4],
    ].map(([type, cents]) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = frequency;
      osc.detune.value = cents;
      osc.connect(gain);
      osc.start();
      return osc;
    });
    gain.connect(padFilter);
    return { oscillators };
  });

  let chord = 0;
  setInterval(() => {
    if (!ctx || ctx.state !== 'running') return;
    chord = (chord + 1) % CHORDS.length;
    CHORDS[chord].forEach((frequency, i) => {
      for (const osc of voices[i].oscillators) osc.frequency.setTargetAtTime(frequency, ctx.currentTime, 2.5);
    });
  }, CHORD_SECONDS * 1000);
}

function buildAir() {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(3);
  source.loop = true;
  airFilter = ctx.createBiquadFilter();
  airFilter.type = 'bandpass';
  airFilter.frequency.value = 900;
  airFilter.Q.value = 0.7;
  airGain = ctx.createGain();
  airGain.gain.value = 0.012;
  source.connect(airFilter).connect(airGain).connect(bus);
  source.start();
}

export function startSound() {
  remember('on');
  if (ctx) {
    setMuted(false);
    return;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(4.5, 2.6);
  const wet = ctx.createGain();
  wet.gain.value = 0.6;
  const dry = ctx.createGain();
  dry.gain.value = 0.55;
  reverb.connect(wet).connect(master);
  dry.connect(master);
  bus = ctx.createGain();
  bus.connect(dry);
  bus.connect(reverb);
  // The whooshes are mostly dry, with a little of the same room.
  sfx = ctx.createGain();
  sfx.gain.value = 0.42;
  sfx.connect(dry);
  const send = ctx.createGain();
  send.gain.value = 0.18;
  sfx.connect(send).connect(reverb);
  loadTakes();

  buildPad();
  buildAir();
  master.gain.setTargetAtTime(0.85, ctx.currentTime, 1.5);
  muted = false;
  notify();

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (!muted) ctx.resume();
  });
}

export function setMuted(value) {
  muted = value;
  remember(value ? 'off' : 'on');
  if (ctx) {
    if (!value && ctx.state !== 'running') ctx.resume();
    master.gain.setTargetAtTime(value ? 0 : 0.85, ctx.currentTime, value ? 0.25 : 0.8);
  }
  notify();
}

export function declineSound() {
  remember('off');
  if (ctx) setMuted(true);
}

// A struck crystal: inharmonic partials with long, shimmering decays.
export function chime(level = 1, note) {
  if (!isPlaying()) return;
  const now = ctx.currentTime;
  if (now - lastChime < 0.12) return;
  lastChime = now;
  const frequency = note ?? SCALE[Math.floor(Math.random() * SCALE.length)];
  const out = ctx.createGain();
  out.gain.value = 0.11 * level;
  out.connect(bus);
  [
    [1, 1, 3.2],
    [2.76, 0.42, 1.8],
    [5.4, 0.2, 1.1],
    [8.93, 0.08, 0.6],
  ].forEach(([ratio, gain, decay]) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.frequency.value = frequency * ratio;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    osc.connect(env).connect(out);
    osc.start(now);
    osc.stop(now + decay + 0.05);
  });
}

// A rising arpeggio, for entering the site.
export function bloom() {
  if (!isPlaying()) return;
  [0, 2, 3, 5].forEach((step, i) => setTimeout(() => {
    lastChime = 0;
    chime(0.8 - i * 0.12, SCALE[step]);
  }, i * 170));
}

// Each take is decoded once, and where its loudest moment falls is noted, so a
// whoosh can be started early enough for that peak to land on the motion.
function loadTakes() {
  for (const [kind, urls] of Object.entries(TAKES)) {
    urls.forEach((url, i) =>
      fetch(url)
        .then((response) => response.arrayBuffer())
        .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
        .then((buffer) => (takes[kind][i] = { buffer, peak: peakOf(buffer) }))
        .catch(() => {}),
    );
  }
}

function peakOf(buffer) {
  const data = buffer.getChannelData(0);
  const step = Math.floor(buffer.sampleRate * 0.01);
  let best = 0;
  let at = 0;
  for (let i = 0; i + step < data.length; i += step) {
    let sum = 0;
    for (let j = i; j < i + step; j++) sum += data[j] * data[j];
    if (sum > best) [best, at] = [sum, i];
  }
  return at / buffer.sampleRate;
}

// The next take of a kind (round-robin, so repeats never sound mechanical),
// a touch higher or lower each time, its peak `peakIn` seconds from now (or,
// with `startIn`, its very start then).
function playTake(kind, strength, { peakIn = 0, startIn, rate = 1, vary = 0.04 } = {}) {
  const ready = takes[kind].filter(Boolean);
  if (!ready.length) return false;
  const take = ready[turns[kind]++ % ready.length];
  const source = ctx.createBufferSource();
  source.buffer = take.buffer;
  source.playbackRate.value = rate * (1 - vary + Math.random() * vary * 2);
  const gain = ctx.createGain();
  gain.gain.value = strength;
  source.connect(gain).connect(sfx);
  const lead = startIn ?? peakIn - take.peak / source.playbackRate.value;
  source.start(ctx.currentTime + Math.max(0, lead));
  return true;
}

// A soft click for every button pressed.
export function tap() {
  if (isPlaying()) playTake('click', 0.55, { vary: 0.03 });
}

// The magazine's riffle, recorded, starting `startIn` seconds from now; the
// magazine's leaves are flicked in time with its pages. False when it can't
// play (sound off, or not loaded yet), so the leaves make their own sound.
export function riffle(startIn = 0) {
  return isPlaying() && playTake('riffle', 0.9, { startIn, vary: 0 });
}

// A sparkle as a new 3D figure forms, heard once per visit (until the page is
// reloaded), so it stays a little magic rather than a habit.
export function magic() {
  if (!magicHeard && isPlaying()) magicHeard = playTake('magic', 0.7, { vary: 0 });
}

// A whoosh: short for a card thrown aside or a fling of the page, long for the
// big transitions. Until the recordings have loaded, a swish of filtered noise.
export function whoosh(strength = 1, { long = false, peakIn = 0, rate = 1 } = {}) {
  if (!isPlaying()) return;
  if (playTake(long ? 'long' : 'short', strength, { peakIn, rate })) return;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(0.9);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.4;
  filter.frequency.setValueAtTime(380, now);
  filter.frequency.exponentialRampToValueAtTime(2600, now + 0.5);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.2 * strength, now + 0.08);
  env.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  source.connect(filter).connect(env).connect(bus);
  source.start(now);
}

// The flick of a magazine page; a low tone is the soft slap of it landing.
let crisp = null;
export function paper(strength = 1, tone = 2600) {
  if (!isPlaying()) return;
  const now = ctx.currentTime;
  if (!crisp) {
    crisp = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
    const data = crisp.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = crisp;
  source.playbackRate.value = 0.85 + Math.random() * 0.3;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(tone, now);
  filter.frequency.exponentialRampToValueAtTime(tone * 0.45, now + 0.16);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.09 * strength, now + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  source.connect(filter).connect(env).connect(bus);
  source.start(now);
  source.stop(now + 0.3);
}

// A strong fling of the page (speed in px per second) rushes past with a short
// whoosh, once per fling: louder and a little higher the faster it goes.
let flinging = false;
let lastFling = 0;
export function scrollRush(speed) {
  if (!isPlaying()) return;
  if (flinging) {
    if (speed < 900) flinging = false;
    return;
  }
  const now = ctx.currentTime;
  if (speed < 3400 || now - lastFling < 1) return;
  flinging = true;
  lastFling = now;
  whoosh(Math.min(1, 0.45 + (speed - 3400) / 6000), { rate: Math.min(1.12, 0.94 + speed / 40000) });
}

// 0 = still, 1 = scrolling fast: the air grows and brightens.
export function setScrollEnergy(energy) {
  if (!ctx) return;
  const now = ctx.currentTime;
  airGain.gain.setTargetAtTime(0.012 + energy * 0.06, now, 0.25);
  airFilter.frequency.setTargetAtTime(700 + energy * 2400, now, 0.3);
}

// Darker sections close the pad's filter a little, lighter ones open it.
export function setBrightness(brightness) {
  if (!ctx) return;
  padFilter.frequency.setTargetAtTime(520 + brightness * 900, ctx.currentTime, 1.2);
}
