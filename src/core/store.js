// Speicherstand im Browser. Fällt lautlos auf Arbeitsspeicher zurück, wenn localStorage
// fehlt oder gelöscht wurde – der Kalender funktioniert dann trotzdem vollständig.
import { preview } from './time.js';

const KEY = 'laternenberg-2026-v1';
const blank = () => ({ opened: {}, done: {}, found: {}, data: {}, sound: true, intro: false });

let state = blank();
let persistent = !preview.fresh;

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** Beschädigte oder fremde Daten abfangen, damit nie etwas wie `opened = null` übrig bleibt. */
function sanitize(raw) {
  const b = blank();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return b;
  return { ...b, ...raw, opened: obj(raw.opened), done: obj(raw.done), found: obj(raw.found), data: obj(raw.data), sound: raw.sound !== false, intro: !!raw.intro };
}

function load() {
  if (!persistent) return;
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    persistent = false; // Speicher gesperrt: nur im Arbeitsspeicher weiterarbeiten
    return;
  }
  if (!raw) return;
  try {
    state = sanitize(JSON.parse(raw));
  } catch {
    state = blank(); // kaputter Eintrag: neu anfangen, beim nächsten Speichern überschreiben
  }
}
load();

function save() {
  if (!persistent) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Speicher voll oder gesperrt: weiter ohne Speichern */
  }
}

export const store = {
  get state() {
    return state;
  },
  set(patch) {
    state = { ...state, ...patch };
    save();
  },
  isOpened: (day) => !!state.opened[day],
  isDone: (day) => !!state.done[day],
  markOpened(day) {
    if (state.opened[day]) return false;
    state.opened[day] = Date.now();
    save();
    return true;
  },
  markDone(day) {
    if (state.done[day]) return false;
    state.done[day] = Date.now();
    save();
    return true;
  },
  openedCount: () => Object.keys(state.opened).length,
  found: (id) => !!state.found[id],
  markFound(id) {
    if (state.found[id]) return false;
    state.found[id] = Date.now();
    save();
    return true;
  },
  /** Eigener kleiner Speicher je Türchen. */
  door(day) {
    const k = 'd' + day;
    return {
      get(key, fallback = null) {
        const v = state.data[k]?.[key];
        return v === undefined ? fallback : v;
      },
      set(key, value) {
        state.data[k] = { ...(state.data[k] || {}), [key]: value };
        save();
      },
    };
  },
  reset() {
    state = blank();
    save();
  },
};
