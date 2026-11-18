import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/nunito';
import '@fontsource/caveat/600.css';
import './styles/base.css';
import './styles/map.css';
import './styles/door.css';

import { syncTime, unlockedDay, preview } from './core/time.js';
import { store } from './core/store.js';
import { createMap } from './map/map.js';
import { h, button, preload, img } from './core/ui.js';
import { unlockAudio, ambient, sfx, soundOn } from './core/audio.js';
import { bunny } from './core/bunnies.js';
import { wait, reducedMotion } from './core/fx.js';
import { openDoor } from './core/doors.js';

const app = document.getElementById('app');

async function boot() {
  if (preview.reset) {
    // Alles auf Anfang: gespeicherten Stand dieses Browsers löschen und ohne Vorschau neu laden.
    try {
      localStorage.removeItem('laternenberg-2026-v1');
    } catch {
      /* kein Speicher vorhanden: nichts zu löschen */
    }
    history.replaceState(null, '', location.pathname);
    location.reload();
    return;
  }
  const splash = h('div', { class: 'splash' });
  splash.innerHTML = `<svg class="l-svg" viewBox="0 0 48 66"><path d="M8.5 22 L24 9.5 L39.5 22 Z" fill="#232842"/><rect class="l-glass" x="12.5" y="22" width="23" height="27" rx="3.5"/><path class="l-flame" d="M24 44c-6-3.5-4.6-9.6 0-15 4.6 5.4 6 11.5 0 15z" fill="#ffb347"/><path class="l-core" d="M24 43c-3-2-2.4-5 0-8 2.4 3 3 6 0 8z" fill="#fff6cf"/><rect x="9" y="48.5" width="30" height="6" rx="2.5" fill="#232842"/></svg>`;
  app.append(splash);

  // Zeit holen und die Karte vorbereiten; nie länger als nötig warten.
  await Promise.all([
    Promise.race([syncTime(), wait(2600)]),
    Promise.race([Promise.all(['map-4-gipfel', 'map-1-tal'].map((n) => preload(img(n)))), wait(4000)]),
  ]);

  const map = createMap(app);
  if (preview.active) app.append(h('div', { class: 'preview-badge' }, 'VORSCHAU'));

  const day = unlockedDay();
  const firstVisit = !store.state.intro;

  if (preview.door) {
    map.scroller.scrollTop = 0;
    requestAnimationFrame(() => map.scrollToDay(Math.min(24, Math.max(1, preview.door)), { ms: 0 }));
    splash.classList.add('out');
    setTimeout(() => splash.remove(), 800);
    store.markOpened(preview.door);
    map.refresh();
    openDoor(preview.door, { onClose: () => map.refresh() });
    return;
  }

  if (firstVisit) {
    // Erster Besuch: oben am dunklen Gipfel beginnen, dann gemeinsam ins Tal hinunter.
    map.scroller.scrollTop = 0;
    const cover = h('div', { class: 'cover' },
      h('div', { class: 'duo-cover' }, bunny('lorelai', { size: 58 }), bunny('logan', { size: 58, flip: true })),
      h('p', { class: 'hand' }, 'Für Melli'),
      h('p', {}, day === 0
        ? 'Ein Berg, 24 Laternen und zwei Kaninchen, die schon ganz ungeduldig sind. Am 1. Dezember geht es los.'
        : 'Ein Berg, 24 Laternen und zwei Kaninchen, die schon auf dich warten. Jeden Tag darfst du ein Licht anzünden.'),
      button(day === 0 ? 'Schon mal umsehen' : 'Zum Berg', async () => {
        unlockAudio();
        if (soundOn()) ambient.start();
        sfx.play('sparkle');
        store.set({ intro: true });
        cover.classList.add('out');
        app.classList.remove('has-cover');
        setTimeout(() => cover.remove(), 1000);
        await wait(500);
        await map.scrollToDay(map.focusDay(), { ms: reducedMotion() ? 0 : 5200 });
        const el = map.lanternEl(map.focusDay());
        if (day === 0) map.say(el, 'Hier unten geht es los. Bis dahin: Tipp ruhig schon auf alles, was dir auffällt.', 'lorelai', { ms: 6000 });
        else map.say(el, 'Da bist du ja! Tipp die Laterne an.', 'lorelai', { ms: 5000 });
      }));
    app.append(cover);
    app.classList.add('has-cover');
  } else {
    requestAnimationFrame(() => map.scrollToDay(map.focusDay(), { ms: 0 }));
  }

  splash.classList.add('out');
  setTimeout(() => splash.remove(), 800);

  // Erste Berührung schaltet den Klang frei (Vorgabe der Handy-Browser).
  const firstTouch = () => {
    unlockAudio();
    if (soundOn()) ambient.start();
    window.removeEventListener('pointerdown', firstTouch);
  };
  window.addEventListener('pointerdown', firstTouch);
}

boot();
