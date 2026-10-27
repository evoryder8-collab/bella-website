// The soundscape, composed live with Web Audio, so there are no audio files to
// load: a slow ambient pad that drifts through four chords, a breath of "air"
// that rises with scrolling like moving through silk, and crystal chimes for
// the quartz stone. Everything is silent until startSound() runs from a click
// (browsers only allow audio after a gesture), and every call before that is
// a no-op.

const SCALE = [587.33, 659.26, 739.99, 880, 987.77, 1174.66]; // D major pentatonic, D5–D6
const CHORDS = [
  [146.83, 220.0, 277.18, 329.63, 369.99], // Dmaj9
  [123.47, 185.0, 220.0, 293.66, 329.63], // Bm11
  [98.0, 146.83, 185.0, 246.94, 329.63], // Gmaj9
  [110.0, 164.81, 246.94, 293.66, 369.99], // A9sus
];
const CHORD_SECONDS = 14;
const STORAGE_KEY = 'bebeauty-sound';

let ctx = null;
let master = null;
let bus = null;
let padFilter = null;
let airFilter = null;
let airGain = null;
let voices = [];
let muted = false;
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

// A soft swish of silk, for a card thrown aside.
export function whoosh(strength = 1) {
  if (!isPlaying()) return;
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
