// Der Rahmen um jedes Türchen: lädt das Modul, baut Kopfzeile und Bühne,
// reicht dem Türchen sein Werkzeug (ctx) und räumt beim Schließen auf.
import { h, button, toast, typewriter, revealSeq, haptic, preload, img, html } from './ui.js';
import { sfx, music, ambient, tone, NOTES } from './audio.js';
import * as fx from './fx.js';
import { store } from './store.js';
import { bunny, bunnyFace, glimmling } from './bunnies.js';
import { DOORS, dateLabel } from '../content/meta.js';
import { nowMs, berlin, moon } from './time.js';

const loaders = import.meta.glob('../doors/d*.js');

let open = null; // { day, overlay, cleanups, onClose }

function loaderFor(day) {
  const key = `../doors/d${String(day).padStart(2, '0')}.js`;
  return loaders[key];
}

export function isDoorOpen() {
  return !!open;
}

/**
 * Öffnet Türchen `day`. origin: {x, y} Bildschirmpunkt der Laterne (für den Lichtschein).
 * onClose wird nach dem Schließen aufgerufen.
 */
export async function openDoor(day, { origin, onClose } = {}) {
  if (open) return;
  const meta = DOORS[day];
  const cleanups = [];
  const stage = h('div', { class: 'door-stage' });
  const closeBtn = h('button', { class: 'door-close', type: 'button', 'aria-label': 'Zurück zum Berg' },
    html('<svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'));
  const header = h('header', { class: 'door-head' },
    h('div', { class: 'door-head-text' },
      h('span', { class: 'door-date' }, dateLabel(day)),
      h('h1', { class: 'door-title' }, meta.title)),
    closeBtn);
  const overlay = h('section', { class: 'door', 'data-day': day, role: 'dialog', 'aria-label': meta.title }, stage, header);
  if (origin) {
    overlay.style.setProperty('--ox', origin.x + 'px');
    overlay.style.setProperty('--oy', origin.y + 'px');
  }
  document.body.appendChild(overlay);
  document.documentElement.classList.add('door-open');
  open = { day, overlay, cleanups, onClose };
  ambient.stop();

  try {
    history.pushState({ door: day }, '');
  } catch {
    /* kein Verlauf verfügbar */
  }
  closeBtn.addEventListener('click', () => {
    sfx.play('tap');
    closeDoor();
  });

  requestAnimationFrame(() => overlay.classList.add('in'));

  const ctx = {
    day,
    root: stage,
    title: meta.title,
    /** Markiert das Türchen als erlebt (einmalig, beliebig oft aufrufbar). */
    complete({ quiet = false } = {}) {
      const first = store.markDone(day);
      if (first && !quiet) toast(`✦ Laterne ${day} leuchtet jetzt am Berg`);
      return first;
    },
    get isDone() {
      return store.isDone(day);
    },
    close: () => closeDoor(),
    /** Eigener Speicher des Türchens: store.get(key, fallback), store.set(key, value) */
    store: store.door(day),
    /** Aufräumfunktion registrieren (Timer, Listener, Animationen). */
    onCleanup: (fn) => {
      if (open?.overlay === overlay) {
        cleanups.push(fn);
        return;
      }
      try {
        fn(); // Türchen ist schon geschlossen: sofort aufräumen
      } catch (e) {
        console.warn(e);
      }
    },
    /** Kopfzeile hell/dunkel bzw. ausblenden: 'light' | 'dark' | 'hidden' */
    setHeader(mode) {
      header.dataset.mode = mode;
    },
    sfx, music, tone, NOTES,
    fx,
    ui: { h, html, button, toast, typewriter, revealSeq, haptic, preload },
    img,
    bunny, bunnyFace, glimmling,
    time: { nowMs, berlin, moon },
    reducedMotion: fx.reducedMotion(),
  };

  const load = loaderFor(day);
  try {
    if (!load) throw new Error('Türchen fehlt');
    const mod = await load();
    if (open?.overlay !== overlay) return; // inzwischen geschlossen
    const off = await mod.default.mount(stage, ctx);
    if (typeof off === 'function') {
      if (open?.overlay === overlay) {
        cleanups.push(off);
      } else {
        // Während des Aufbaus geschlossen: Aufräumfunktion sofort ausführen.
        try {
          off();
        } catch (e) {
          console.warn(e);
        }
      }
    }
  } catch (err) {
    console.error(err);
    stage.replaceChildren(h('div', { class: 'door-error' },
      h('p', {}, 'Diese Laterne klemmt gerade ein bisschen.'),
      button('Noch einmal versuchen', () => location.reload())));
  }
}

export function closeDoor({ fromHistory = false } = {}) {
  if (!open) return;
  const { overlay, cleanups, onClose, day } = open;
  open = null;
  for (const fn of cleanups.splice(0)) {
    try {
      fn();
    } catch (e) {
      console.warn(e);
    }
  }
  music.stop({ fade: 400 });
  overlay.classList.remove('in');
  overlay.classList.add('out');
  document.documentElement.classList.remove('door-open');
  setTimeout(() => overlay.remove(), 520);
  if (!fromHistory) {
    try {
      if (history.state?.door) history.back();
    } catch {
      /* egal */
    }
  }
  onClose?.(day);
}

window.addEventListener('popstate', () => {
  if (open) closeDoor({ fromHistory: true });
});
