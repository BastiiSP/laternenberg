// Klang: kleine synthetische Effekte (WebAudio) und ein Musikkanal (HTMLAudio).
// Alles startet erst nach der ersten Berührung – so verlangen es Handy-Browser.
import { store } from './store.js';

let ctx = null;
let master = null;
let noiseBuf = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = store.state.sound ? 0.9 : 0;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function unlockAudio() {
  ac();
}

function noise() {
  const c = ac();
  if (!c) return null;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** Ein einzelner Ton. Für eigene Melodien in Türchen nutzbar. */
export function tone(freq, { dur = 0.4, type = 'sine', vol = 0.2, at = 0, attack = 0.005, slide = 0 } = {}) {
  const c = ac();
  if (!c || !store.state.sound) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function bell(freq, { vol = 0.16, dur = 1.4, at = 0 } = {}) {
  tone(freq, { dur, vol, at, attack: 0.004 });
  tone(freq * 2.01, { dur: dur * 0.6, vol: vol * 0.35, at });
  tone(freq * 3.02, { dur: dur * 0.35, vol: vol * 0.15, at });
}

function hiss({ dur = 0.4, vol = 0.12, from = 400, to = 3000, at = 0, q = 0.8 } = {}) {
  const c = ac();
  const buf = noise();
  if (!c || !buf || !store.state.sound) return;
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };
export const NOTES = N;

const effects = {
  tap: () => tone(720, { dur: 0.07, vol: 0.08, slide: 0.7 }),
  tick: () => tone(1500, { dur: 0.03, vol: 0.05, type: 'triangle' }),
  pop: () => tone(380, { dur: 0.12, vol: 0.14, slide: 2.4 }),
  hop: () => tone(300, { dur: 0.14, vol: 0.1, slide: 1.9, type: 'triangle' }),
  chime: () => bell(N.E6, { vol: 0.12 }),
  bell: () => bell(N.C5, { vol: 0.16, dur: 2 }),
  sparkle: () => [N.E6, N.G6, 2093, 2637].forEach((f, i) => bell(f, { vol: 0.07, dur: 0.7, at: i * 0.07 })),
  success: () => [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => bell(f, { vol: 0.13, dur: 1.2, at: i * 0.11 })),
  fanfare: () => [N.G4, N.C5, N.E5, N.G5, N.C6, N.E6].forEach((f, i) => bell(f, { vol: 0.13, dur: 1.6, at: i * 0.13 })),
  wrong: () => { tone(220, { dur: 0.18, vol: 0.1, type: 'triangle', slide: 0.8 }); tone(180, { dur: 0.22, vol: 0.08, type: 'triangle', at: 0.09, slide: 0.8 }); },
  locked: () => { tone(140, { dur: 0.12, vol: 0.16, slide: 0.6 }); hiss({ dur: 0.08, vol: 0.06, from: 900, to: 300 }); },
  whoosh: () => hiss({ dur: 0.5, vol: 0.1, from: 300, to: 2400 }),
  page: () => hiss({ dur: 0.22, vol: 0.05, from: 2500, to: 900, q: 0.5 }),
  ignite: () => { hiss({ dur: 0.7, vol: 0.14, from: 500, to: 5000 }); [N.C5, N.G5, N.E6].forEach((f, i) => bell(f, { vol: 0.1, dur: 2.2, at: 0.25 + i * 0.12 })); },
  squeak: () => { tone(1200, { dur: 0.09, vol: 0.08, slide: 1.5, type: 'triangle' }); tone(1700, { dur: 0.1, vol: 0.07, slide: 0.8, type: 'triangle', at: 0.1 }); },
  hoot: () => { tone(420, { dur: 0.25, vol: 0.12, slide: 0.85 }); tone(380, { dur: 0.4, vol: 0.12, slide: 0.8, at: 0.32 }); },
  drop: () => tone(900, { dur: 0.18, vol: 0.1, slide: 0.4 }),
};

export const sfx = {
  /** Namen: tap, tick, pop, hop, chime, bell, sparkle, success, fanfare, wrong, locked, whoosh, page, ignite, squeak, hoot, drop */
  play(name) {
    try {
      effects[name]?.();
    } catch {
      /* Klang ist nie kritisch */
    }
  },
  tone,
  bell,
  hiss,
};

// ---------- Musik ----------
let current = null; // { el, vol }
const fadeTimers = new WeakMap(); // Fade-Zustand je Audioelement: ein neuer Track darf den Ausblender des alten nicht löschen

function fadeTo(el, target, ms, done) {
  clearInterval(fadeTimers.get(el));
  const start = el.volume;
  const t0 = performance.now();
  const id = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    el.volume = Math.max(0, Math.min(1, start + (target - start) * k));
    if (k >= 1) {
      clearInterval(id);
      if (fadeTimers.get(el) === id) fadeTimers.delete(el);
      done?.();
    }
  }, 40);
  fadeTimers.set(el, id);
}

export const music = {
  /** Spielt eine Audiodatei (z. B. '/audio/lied.mp3'). Gibt das <audio>-Element zurück. */
  play(src, { loop = true, volume = 0.7, fade = 900 } = {}) {
    this.stop({ fade: 200 });
    const el = new Audio(src);
    el.loop = loop;
    el.preload = 'auto';
    el.playsInline = true;
    el.muted = !store.state.sound;
    el.volume = fade ? 0 : volume;
    current = { el, vol: volume };
    el.play().then(() => {
      // Wurde der Track schon wieder ersetzt oder gestoppt, bevor das Abspielen begann: sicher anhalten.
      if (current?.el !== el) {
        clearInterval(fadeTimers.get(el));
        el.pause();
        return;
      }
      if (fade) fadeTo(el, volume, fade);
    }).catch(() => {});
    return el;
  },
  stop({ fade = 500 } = {}) {
    if (!current) return;
    const { el } = current;
    current = null;
    if (fade && !el.paused) fadeTo(el, 0, fade, () => el.pause());
    else el.pause();
  },
  get element() {
    return current?.el || null;
  },
};

// ---------- Wind auf dem Berg ----------
let wind = null;
export const ambient = {
  start() {
    const c = ac();
    const buf = noise();
    if (!c || !buf || wind) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 420;
    f.Q.value = 0.6;
    const g = c.createGain();
    g.gain.value = 0.0001;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = c.createGain();
    lg.gain.value = 220;
    lfo.connect(lg).connect(f.frequency);
    src.connect(f).connect(g).connect(master);
    src.start();
    lfo.start();
    g.gain.exponentialRampToValueAtTime(0.022, c.currentTime + 3);
    wind = { src, lfo, g };
  },
  stop() {
    if (!wind || !ctx) return;
    const { src, lfo, g } = wind;
    wind = null;
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    setTimeout(() => {
      try {
        src.stop();
        lfo.stop();
      } catch {
        /* schon gestoppt */
      }
    }, 900);
  },
};

export function soundOn() {
  return !!store.state.sound;
}

export function setSound(on) {
  store.set({ sound: !!on });
  if (master && ctx) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.05);
  if (current) current.el.muted = !on;
  document.querySelectorAll('audio, video').forEach((m) => {
    if (m.dataset.keepSound !== '1') m.muted = !on;
  });
  window.dispatchEvent(new CustomEvent('klang', { detail: { on: !!on } }));
}

// Im Hintergrund still sein, beim Zurückkommen weitermachen.
let pausedByHide = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (current && !current.el.paused) {
      current.el.pause();
      pausedByHide = true;
    }
    ctx?.suspend?.().catch(() => {});
  } else {
    if (pausedByHide && current) current.el.play().catch(() => {});
    pausedByHide = false;
    ctx?.resume?.().catch(() => {});
  }
});
