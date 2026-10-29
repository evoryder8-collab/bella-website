// The soundscape: Bella's own signature song, "Late Night Polish" (src/music),
// streamed and looping at 40% volume (20% on phones), with a breath of air (a
// recorded wind, looping) that rises with scrolling like moving through silk.
// Every effect is recorded (src/sfx): the user's own whooshes, button click,
// magazine riffle and sparkle for the 3D figures, and, from Freesound (CC0, see
// src/sfx/CREDITS.md), the ritual's breath, the magazine's cover closing, a
// cotton swish for the menu and the leave card, the social stones' knock and a
// soft tick for hovering on desktop. They load once sound
// starts. Bella's spoken greeting (src/voice, in English and Swedish) loads in
// the visitor's language as the ritual's stone is touched, and plays once as
// the site opens with the song dipping under her voice. Everything is silent
// until startSound() runs from a click
// (browsers only allow audio after a gesture), and every call before that is a
// no-op.

const STORAGE_KEY = 'bebeauty-sound';
const MASTER = 0.85; // everything together, when sound is on
// The song plays at 40% of full volume, and at half that on phones, where it
// still sounded too loud (through the master, hence the division).
const SONG = new URL('./music/late-night-polish.mp3', import.meta.url).href;
const SONG_LEVEL = (matchMedia('(pointer: coarse)').matches ? 0.2 : 0.4) / MASTER;

// Recorded sounds: two long whooshes and three short ones, each kind played in
// turn, and one take each of the rest.
const TAKES = {
  click: [new URL('./sfx/click.mp3', import.meta.url).href],
  riffle: [new URL('./sfx/pages-riffle.mp3', import.meta.url).href],
  magic: [new URL('./sfx/magic.mp3', import.meta.url).href],
  breath: [new URL('./sfx/breath.mp3', import.meta.url).href],
  cover: [new URL('./sfx/cover.mp3', import.meta.url).href],
  silk: [new URL('./sfx/silk.mp3', import.meta.url).href],
  stone: [new URL('./sfx/stone.mp3', import.meta.url).href],
  tick: [new URL('./sfx/tick.mp3', import.meta.url).href],
  air: [new URL('./sfx/air.mp3', import.meta.url).href],
  long: [new URL('./sfx/whoosh-long-a.mp3', import.meta.url).href, new URL('./sfx/whoosh-long-b.mp3', import.meta.url).href],
  short: [
    new URL('./sfx/whoosh-short-a.mp3', import.meta.url).href,
    new URL('./sfx/whoosh-short-b.mp3', import.meta.url).href,
    new URL('./sfx/whoosh-short-c.mp3', import.meta.url).href,
  ],
};

// Bella's greeting, by language: AAC (smaller and clearer for a voice), and the
// MP3 for a browser that can't decode it.
const VOICES = {
  en: [new URL('./voice/bella-intro-en.m4a', import.meta.url).href, new URL('./voice/bella-intro-en.mp3', import.meta.url).href],
  sv: [new URL('./voice/bella-intro-sv.m4a', import.meta.url).href, new URL('./voice/bella-intro-sv.mp3', import.meta.url).href],
};
const DUCK = 0.3; // the song's own level while she speaks
// The air's recording is a seamless 12 s loop with a quarter second of its own
// continuation either side, so the loop points sit clear of the file's edges.
const AIR_LOOP = [0.25, 12.25];
const AIR_REST = 0.008; // its level when still, and how much scrolling adds
const AIR_RUSH = 0.046;

let ctx = null;
let master = null;
let songLevel = null;
const voices = {};
let greeted = false;
let bus = null;
let song = null;
let airFilter = null;
let airGain = null;
let sfx = null;
let muted = false;
let pausing = 0;
let filmOn = false; // a film is playing out loud, and the song rests under it
let resting = 0;
const takes = Object.fromEntries(Object.keys(TAKES).map((kind) => [kind, []]));
const turns = Object.fromEntries(Object.keys(TAKES).map((kind) => [kind, 0]));
let magicHeard = false;
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

// Streamed rather than decoded whole (it is three minutes long), through the
// same master as everything else, so muting and fading treat it alike.
function buildSong() {
  song = new Audio(SONG);
  song.loop = true;
  song.preload = 'auto';
  songLevel = ctx.createGain();
  songLevel.gain.value = SONG_LEVEL;
  ctx.createMediaElementSource(song).connect(songLevel).connect(master);
  song.play().catch(() => {});
}

// The air: a gentle recorded wind, looping under everything, faded in once it
// has loaded. Its band brightens and widens as the page moves.
function buildAir() {
  airFilter = ctx.createBiquadFilter();
  airFilter.type = 'bandpass';
  airFilter.frequency.value = 900;
  airFilter.Q.value = 0.5;
  airGain = ctx.createGain();
  airGain.gain.value = 0;
  airFilter.connect(airGain).connect(bus);
}

function startAir(buffer) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  [source.loopStart, source.loopEnd] = AIR_LOOP;
  source.connect(airFilter);
  source.start(ctx.currentTime, AIR_LOOP[0]);
  airGain.gain.setTargetAtTime(AIR_REST, ctx.currentTime, 2);
}

export function startSound() {
  remember('on');
  // Always inside a tap: the award film (src/award.js) uses it to be allowed to play out loud later.
  window.dispatchEvent(new CustomEvent('bb:sound-gesture'));
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
  buildAir();
  loadTakes();

  buildSong();
  master.gain.setTargetAtTime(MASTER, ctx.currentTime, 1.5);
  muted = false;
  notify();

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      ctx.suspend();
      song.pause();
    } else if (!muted) {
      ctx.resume();
      if (!filmOn) song.play().catch(() => {});
    }
  });
}

export function setMuted(value) {
  muted = value;
  remember(value ? 'off' : 'on');
  if (ctx) {
    if (!value && ctx.state !== 'running') ctx.resume();
    master.gain.setTargetAtTime(value ? 0 : MASTER, ctx.currentTime, value ? 0.25 : 0.8);
    // The song rests once it has faded out, and carries on where it was.
    clearTimeout(pausing);
    if (value) pausing = setTimeout(() => muted && song.pause(), 1200);
    else if (!filmOn) song.play().catch(() => {});
  }
  notify();
}

export function declineSound() {
  remember('off');
  if (ctx) setMuted(true);
}

// Each take is decoded once, and where its loudest moment falls is noted, so a
// whoosh can be started early enough for that peak to land on the motion.
function loadTakes() {
  for (const [kind, urls] of Object.entries(TAKES)) {
    urls.forEach((url, i) =>
      fetch(url)
        .then((response) => response.arrayBuffer())
        .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
        .then((buffer) => (kind === 'air' ? startAir(buffer) : (takes[kind][i] = { buffer, peak: peakOf(buffer) })))
        .catch(() => {}),
    );
  }
}

// (Newer browsers also return a promise, rejected alongside the callback.)
const decode = (url) =>
  fetch(url)
    .then((response) => response.arrayBuffer())
    .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)?.catch(() => {})));

// Her greeting in the visitor's language only, fetched as soon as they touch
// the stone so it is ready by the time the site opens.
export function prepareGreeting(lang) {
  if (!ctx || !VOICES[lang] || voices[lang]) return;
  const [aac, mp3] = VOICES[lang];
  voices[lang] = decode(aac)
    .catch(() => decode(mp3))
    .catch(() => null);
}

// Bella says hello, once, `delay` seconds from now (or as soon as her voice
// has loaded): the song dips under her voice and rises again as she finishes.
// Only with sound on, and only in a language she has recorded.
export function greet(lang, { delay = 0 } = {}) {
  if (greeted || !isPlaying() || !VOICES[lang]) return;
  greeted = true;
  prepareGreeting(lang);
  const due = ctx.currentTime + delay;
  voices[lang].then((buffer) => {
    if (!buffer || !isPlaying()) return;
    const at = Math.max(ctx.currentTime, due);
    songLevel.gain.setTargetAtTime(SONG_LEVEL * DUCK, Math.max(ctx.currentTime, at - 0.6), 0.35);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(master);
    source.onended = () => !filmOn && songLevel.gain.setTargetAtTime(SONG_LEVEL, ctx.currentTime, 1.4);
    source.start(at);
  });
}

// While a film plays out loud the song fades out and rests, keeping its
// place: phones stop it themselves when a film's sound starts, so the site does
// it gently first. When the film stops, is left or ends, the song carries on
// where it was and fades back in (unless the visitor has muted the site).
export function duckSong(on) {
  if (!ctx || on === filmOn) return;
  filmOn = on;
  const level = songLevel.gain;
  const now = ctx.currentTime;
  level.cancelScheduledValues(now);
  level.setValueAtTime(level.value, now);
  clearTimeout(resting);
  if (on) {
    level.setTargetAtTime(0, now, 0.25);
    resting = setTimeout(() => filmOn && song.pause(), 1200);
    return;
  }
  if (muted) return level.setValueAtTime(SONG_LEVEL, now);
  if (ctx.state !== 'running') ctx.resume();
  // From silence if a phone had stopped it, so it always rises smoothly.
  if (song.paused) level.setValueAtTime(0, now);
  song.play().catch(() => {});
  level.setTargetAtTime(SONG_LEVEL, now, 1.1);
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

// A soft click for every button pressed (once, though a button's own handler
// and the page-wide one may both ask for it).
let lastTap = -1;
export function tap() {
  if (!isPlaying() || ctx.currentTime - lastTap < 0.06) return;
  lastTap = ctx.currentTime;
  playTake('click', 0.55, { vary: 0.03 });
}

// The magazine's riffle, recorded, starting `startIn` seconds from now; the
// magazine's leaves are flicked in time with its pages.
export function riffle(startIn = 0) {
  // Kept low, 40% under its first level of 0.9, so it stays behind the pages.
  if (isPlaying()) playTake('riffle', 0.54, { startIn, vary: 0 });
}

// A sparkle as a new 3D figure forms, heard once per visit (until the page is
// reloaded), so it stays a little magic rather than a habit.
export function magic() {
  if (!magicHeard && isPlaying()) magicHeard = playTake('magic', 0.7, { vary: 0 });
}

// A whoosh: short for a card thrown aside or a fling of the page, long for the
// big transitions. Silent until the recordings have loaded (a moment after
// sound starts).
export function whoosh(strength = 1, { long = false, peakIn = 0, rate = 1 } = {}) {
  if (isPlaying()) playTake(long ? 'long' : 'short', strength, { peakIn, rate });
}

// The magazine's cover closing on its pages.
export function cover(strength = 1) {
  if (isPlaying()) playTake('cover', 0.5 * strength, { vary: 0.03 });
}

// A breath drawn in, its fullest `peakIn` seconds from now: the ritual's ring
// of light closing, just before the site opens.
export function breath(peakIn) {
  if (isPlaying()) playTake('breath', 0.62, { peakIn, vary: 0 });
}

// Cotton swishing through the air: the menu and the leave card opening.
export function silk(strength = 1) {
  if (isPlaying()) playTake('silk', 0.5 * strength, { vary: 0.06 });
}

// Two polished stones knocking, a little lower than the recording, for the
// rose-quartz social stones.
export function stone() {
  if (isPlaying()) playTake('stone', 0.42, { rate: 0.86, vary: 0.04 });
}

// The faintest tick as the pointer finds a control (desktop only, see main.js).
let lastTick = 0;
export function hoverTick() {
  if (!isPlaying() || ctx.currentTime - lastTick < 0.07) return;
  lastTick = ctx.currentTime;
  playTake('tick', 0.16, { vary: 0.05 });
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
  if (airGain.gain.value < AIR_REST * 0.5) return; // still loading, or fading in
  airGain.gain.setTargetAtTime(AIR_REST + energy * AIR_RUSH, now, 0.25);
  airFilter.frequency.setTargetAtTime(700 + energy * 2400, now, 0.3);
}
