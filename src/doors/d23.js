// Türchen 23 · 24 Laternen – das Lied
import './d23.css';
import { LIED } from '../content/lied.js';
import { soundOn, setSound } from '../core/audio.js';

const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5.2v13.6c0 .8.9 1.3 1.6.8l10.6-6.8c.6-.4.6-1.2 0-1.6L9.6 4.4C8.9 3.9 8 4.4 8 5.2z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.6" height="14" rx="1.4" fill="currentColor"/><rect x="13.4" y="5" width="4.6" height="14" rx="1.4" fill="currentColor"/></svg>';
const ICON_AGAIN = '<svg viewBox="0 0 24 24"><path d="M12 5a7 7 0 1 1-6.6 4.7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M12 1.5v7l-4.2-3.5z" fill="currentColor"/></svg>';

const fmt = (s) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

/** Prüft per HEAD, ob unter url wirklich eine Audiodatei liegt (der Dev-Server liefert sonst HTML). */
async function audioExists(url, signal) {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store', signal });
    if (!res.ok) return false;
    return (res.headers.get('content-type') || '').toLowerCase().startsWith('audio/');
  } catch {
    // Keine Antwort in der Zeit (oder offline): nicht als „fehlt“ werten. Das <audio>-Element meldet es selbst, falls die Datei wirklich fehlt.
    return true;
  }
}

export default {
  mount(root, ctx) {
    const { h } = ctx.ui;
    const zeilen = LIED.zeilen || [];
    const timed = zeilen.some((z) => z.text) && zeilen.filter((z) => z.text).every((z) => typeof z.t === 'number');
    let dead = false;
    let audio = null;
    let userScrollUntil = 0;
    let activeIdx = -1;
    let playedSec = 0;
    let lastT = 0;
    let completed = false;
    let missingTimer = 0;
    let dragging = false;

    const stage = h('div', { class: 'd23-stage' });
    const bg = h('img', { class: 'd23-bg', src: ctx.img('d23-cover'), alt: '', draggable: 'false' });
    const motes = h('div', { class: 'd23-motes', 'aria-hidden': 'true' });
    for (let i = 0; i < 9; i++) {
      motes.append(h('i', { class: 'd23-mote', style: { left: `${6 + i * 11 + (i % 3) * 3}%`, animationDelay: `${-i * 1.1}s`, animationDuration: `${8 + (i % 4) * 1.6}s` } }));
    }
    const cover = h('img', { class: 'd23-cover', src: ctx.img('d23-cover'), alt: 'Cover: Lorelai und Logan blicken auf den Laternenberg', draggable: 'false' });
    const coverWrap = h('div', { class: 'd23-coverwrap' }, h('div', { class: 'd23-halo' }), cover);
    const titleBox = h('div', { class: 'd23-titlebox' },
      h('h2', { class: 'display d23-title' }, LIED.titel),
      h('p', { class: 'd23-sub' }, 'Ein Lied für die Laternenanzünderin'));

    // Liedtext
    const lines = [];
    const lyricsIn = h('div', { class: 'd23-lyrics-in' });
    zeilen.forEach((z, i) => {
      if (!z.text) {
        lyricsIn.append(h('div', { class: 'd23-gap' }));
        return;
      }
      const el = h('p', { class: 'd23-line' }, z.text);
      lines.push({ el, t: z.t, i });
      lyricsIn.append(el);
    });
    const lyrics = h('div', { class: 'd23-lyrics', tabindex: '-1', 'aria-label': 'Liedtext' }, lyricsIn);
    const note = h('div', { class: 'd23-note' });
    note.style.display = 'none';

    // Steuerung
    const playBtn = h('button', { class: 'd23-play', type: 'button', 'aria-label': 'Lied abspielen', html: ICON_PLAY });
    const range = h('input', { class: 'd23-range', type: 'range', min: '0', max: '1000', value: '0', step: '1', 'aria-label': 'Position im Lied' });
    const tNow = h('span', {}, '0:00');
    const tAll = h('span', {}, '–:––');
    const bar = h('div', { class: 'd23-bar' }, tNow, range, tAll);
    const ctrl = h('div', { class: 'd23-ctrl' }, bar, playBtn);
    const col = h('div', { class: 'd23-col' }, coverWrap, titleBox, note, lyrics, ctrl);
    stage.append(bg, h('div', { class: 'd23-shade' }), motes, col);
    root.append(stage);

    if (!timed) stage.classList.add('d23-read');
    const setPlaying = (on) => stage.classList.toggle('d23-playing', on);
    const setIcon = (state) => {
      playBtn.innerHTML = state === 'pause' ? ICON_PAUSE : state === 'again' ? ICON_AGAIN : ICON_PLAY;
      playBtn.setAttribute('aria-label', state === 'pause' ? 'Pause' : state === 'again' ? 'Noch einmal' : 'Lied abspielen');
    };

    function soundNote() {
      if (!audio) return;
      if (!soundOn()) {
        const chip = h('button', { class: 'd23-chip', type: 'button' }, 'Der Ton ist aus – tippen zum Einschalten');
        chip.addEventListener('click', () => setSound(true));
        note.replaceChildren(chip);
        note.style.display = '';
      } else {
        note.replaceChildren();
        note.style.display = 'none';
      }
    }
    const onKlang = () => {
      if (audio) audio.muted = !soundOn();
      soundNote();
    };
    window.addEventListener('klang', onKlang);

    // ---- Mitlaufender Text ----
    function scrollToLine(idx, smooth = true) {
      const l = lines[idx];
      if (!l) return;
      const top = l.el.offsetTop - lyrics.clientHeight / 2 + l.el.offsetHeight / 2;
      lyrics.scrollTo({ top: Math.max(0, top), behavior: smooth && !ctx.reducedMotion ? 'smooth' : 'auto' });
    }
    function updateLyrics(time, force) {
      if (!timed) return;
      let idx = -1;
      for (let i = 0; i < lines.length; i++) if (lines[i].t <= time + 0.15) idx = i;
      if (idx === activeIdx && !force) return;
      activeIdx = idx;
      lines.forEach((l, i) => {
        l.el.classList.toggle('on', i === idx);
        l.el.classList.toggle('past', i < idx);
      });
      if (performance.now() > userScrollUntil) {
        if (idx >= 0) scrollToLine(idx);
        else lyrics.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
    ['touchstart', 'wheel', 'pointerdown'].forEach((ev) => lyrics.addEventListener(ev, () => { userScrollUntil = performance.now() + 4500; }, { passive: true }));
    if (timed) {
      lines.forEach((l) => l.el.addEventListener('click', () => {
        if (!audio) return;
        audio.currentTime = l.t;
        userScrollUntil = 0;
        if (audio.paused) togglePlay();
        updateLyrics(l.t, true);
      }));
      updateLyrics(0, true);
    }
    const onResize = () => { if (timed && activeIdx >= 0) scrollToLine(activeIdx, false); };
    window.addEventListener('resize', onResize);

    // ---- Wiedergabe ----
    function refreshTime() {
      if (!audio) return;
      const d = audio.duration;
      const c = audio.currentTime;
      tNow.textContent = fmt(c);
      if (Number.isFinite(d) && d > 0) {
        tAll.textContent = fmt(d);
        if (!dragging) range.value = String(Math.round((c / d) * 1000));
        range.style.setProperty('--f', `${(c / d) * 100}%`);
      }
    }

    function finish(quiet) {
      if (completed) return;
      completed = true;
      ctx.complete({ quiet });
    }

    function togglePlay() {
      if (!audio) return;
      if (audio.ended) audio.currentTime = 0;
      if (audio.paused) {
        audio.muted = !soundOn();
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    }

    function setupAudio() {
      const el = h('audio', { preload: 'metadata', src: LIED.src });
      audio = el;
      el.setAttribute('playsinline', '');
      el.muted = !soundOn();
      stage.append(el);
      ctx.music.stop({ fade: 0 });
      // Nachlaufende Medienereignisse eines ersetzten oder entfernten Elements werden ignoriert.
      const on = (type, fn) => el.addEventListener(type, () => { if (audio === el && !dead) fn(); });
      on('loadedmetadata', refreshTime);
      on('durationchange', refreshTime);
      on('play', () => { setPlaying(true); setIcon('pause'); lastT = el.currentTime; soundNote(); });
      on('pause', () => { setPlaying(false); if (!el.ended) setIcon('play'); });
      on('ended', () => { setPlaying(false); setIcon('again'); finish(false); refreshTime(); });
      on('timeupdate', () => {
        const c = el.currentTime;
        const dt = c - lastT;
        if (dt > 0 && dt < 1.2 && !el.paused) playedSec += dt;
        lastT = c;
        if (playedSec >= 40) finish(false);
        refreshTime();
        updateLyrics(c);
      });
      on('seeked', () => { lastT = el.currentTime; updateLyrics(el.currentTime, true); });
      on('error', showMissing);
      playBtn.addEventListener('click', () => { ctx.sfx.play('tap'); togglePlay(); });
      range.addEventListener('input', () => {
        if (audio !== el) return;
        dragging = true;
        const d = el.duration;
        if (Number.isFinite(d) && d > 0) {
          tNow.textContent = fmt((range.value / 1000) * d);
          range.style.setProperty('--f', `${range.value / 10}%`);
        }
      });
      range.addEventListener('change', () => {
        dragging = false;
        if (audio !== el) return;
        const d = el.duration;
        if (Number.isFinite(d) && d > 0) el.currentTime = (range.value / 1000) * d;
        userScrollUntil = 0;
      });
      soundNote();
    }

    function showMissing() {
      if (audio) {
        const el = audio;
        audio = null; // zuerst entkoppeln, dann entladen: nachlaufende Ereignisse treffen keinen gültigen Zustand mehr
        el.pause();
        el.removeAttribute('src');
        el.load();
        el.remove();
      }
      setPlaying(false);
      stage.classList.add('d23-read', 'd23-missing');
      lines.forEach((l) => l.el.classList.remove('on', 'past'));
      lyrics.scrollTop = 0;
      ctrl.style.display = 'none';
      note.style.display = '';
      note.replaceChildren(h('div', { class: 'panel d23-tuning' },
        ctx.glimmling({ size: 40, mood: 'sleepy' }),
        h('p', {}, h('b', {}, 'Das Lied wird noch gestimmt.'), ' Bis es erklingt, kannst du den Text lesen.')));
      clearTimeout(missingTimer);
      missingTimer = setTimeout(() => finish(false), 14000);
    }

    playBtn.disabled = true;
    playBtn.style.opacity = '0.55';
    // Prüfung zeitlich begrenzen: ohne Antwort nach 4 s wird sie abgebrochen und das Lied trotzdem versucht.
    const checkCtrl = new AbortController();
    const checkTimer = setTimeout(() => checkCtrl.abort(), 4000);
    audioExists(LIED.src, checkCtrl.signal).then((ok) => {
      clearTimeout(checkTimer);
      if (dead) return;
      playBtn.disabled = false;
      playBtn.style.opacity = '';
      if (ok) setupAudio();
      else showMissing();
    });

    const onHide = () => { if (document.hidden && audio && !audio.paused) audio.pause(); };
    document.addEventListener('visibilitychange', onHide);

    return () => {
      dead = true;
      clearTimeout(checkTimer);
      checkCtrl.abort();
      clearTimeout(missingTimer);
      window.removeEventListener('klang', onKlang);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onHide);
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
    };
  },
};
