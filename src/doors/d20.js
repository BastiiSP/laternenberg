// Türchen 20 · Hasenkino: Samtvorhang, Countdown, Film (oder Daumenkino), Abspann
import './d20.css';
import { soundOn } from '../core/audio.js';
import { createFilm } from './d20-film.js';

const VIDEO_URL = '/video/hasenkino.mp4';

const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5.2v13.6c0 .8.9 1.3 1.6.8l10.6-6.8c.6-.4.6-1.2 0-1.6L9.6 4.4C8.9 3.9 8 4.4 8 5.2z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.6" height="14" rx="1.4" fill="currentColor"/><rect x="13.4" y="5" width="4.6" height="14" rx="1.4" fill="currentColor"/></svg>';

/** Prüft per HEAD, ob unter url wirklich ein Video liegt (der Dev-Server liefert sonst HTML mit Status 200). */
async function videoExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (!res.ok) return false;
    return (res.headers.get('content-type') || '').toLowerCase().startsWith('video/');
  } catch {
    return false;
  }
}

const CREDITS = [
  { head: true, small: 'Ein Hasenkino-Film', text: 'Zwei Ohren im Wind' },
  { small: 'Lorelai', text: 'als sie selbst' },
  { small: 'Logan', text: 'als jemand, der es kommen sah' },
  { small: 'Regie', text: 'Lorelai (hat niemand gefragt)' },
  { small: 'Stunts', text: 'Logan' },
  { small: 'Kamera', text: 'ein Glimmling mit ruhiger Hand' },
  { small: 'Schlitten', text: 'Holz, sehr tapfer' },
  { small: 'Schnee', text: 'echter Schnee' },
  { small: 'Laterne', text: 'spielt sich selbst und brennt einfach weiter' },
  { small: 'Mond', text: 'in einer kleinen Nebenrolle' },
  { small: 'Windgeräusche', text: 'der Wind' },
  { small: 'Verpflegung', text: 'eine halbe Möhre (inzwischen eine viertel)' },
  { small: 'Kaffee für Lorelai', text: 'leider nicht im Budget' },
  { small: 'Besonderer Dank', text: 'an den Hang, der das alles mitgemacht hat' },
];

export default {
  mount(root, ctx) {
    const { h, button } = ctx.ui;
    const { loop } = ctx.fx;
    let dead = false;
    let phase = 'start'; // start | leader | film | credits | end
    let mode = 'film'; // 'video' | 'film'
    let video = null;
    let vbox = null;
    let vambient = null;
    let film = null;
    let filmEnded = false;
    let completed = false;
    let stopCredits = null;
    let snow = null;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); return id; };

    // ---------- Aufbau ----------
    const stage = h('div', { class: 'd20-stage' });
    const screen = h('div', { class: 'd20-screen' });
    const tap = h('div', { class: 'd20-tap', role: 'button', 'aria-label': 'Pause oder weiter' });
    const pauseIcon = h('div', { class: 'd20-pauseicon', html: ICON_PAUSE });
    const progressFill = h('i');
    const progress = h('div', { class: 'd20-progress' }, progressFill);

    // Countdown wie bei alten Filmrollen
    const num = h('div', { class: 'd20-num' }, '3');
    const sweep = h('div', { class: 'd20-sweep' });
    const leader = h('div', { class: 'd20-leader' },
      h('div', { class: 'd20-leader-in' }, h('div', { class: 'd20-ring' }), h('div', { class: 'd20-ring in' }), h('div', { class: 'd20-cross-h' }), h('div', { class: 'd20-cross-v' }), sweep, num),
      h('div', { class: 'd20-leader-note' }, 'Hasenkino'));

    // Vorhang
    const curtain = h('div', { class: 'd20-curtain' },
      h('div', { class: 'd20-drape l' }), h('div', { class: 'd20-drape r' }), h('div', { class: 'd20-valance' }));

    // Start: Leuchtreklame und großer Knopf
    const playBtn = h('button', { class: 'd20-play', type: 'button', 'aria-label': 'Vorhang auf, Film starten', html: ICON_PLAY });
    const start = h('div', { class: 'd20-start' },
      h('div', { class: 'd20-marquee' },
        h('div', { class: 'd20-bulbs' }), h('div', { class: 'd20-bulbs v' }),
        h('p', { class: 'd20-m-kicker' }, 'Heute im'),
        h('p', { class: 'd20-m-name' }, 'HASENKINO'),
        h('p', { class: 'd20-m-film' }, 'Zwei Ohren im Wind'),
        h('p', { class: 'd20-m-small' }, 'Eintritt: ein Lächeln')),
      h('div', { class: 'd20-playwrap' }, playBtn, h('span', { class: 'd20-play-label' }, 'Vorhang auf')));

    // Abspann
    const roll = h('div', { class: 'd20-roll' });
    CREDITS.forEach((c) => roll.append(h('div', { class: `d20-cr${c.head ? ' head' : ''}` }, h('small', {}, c.small), h('b', {}, c.text))));
    const final = h('div', { class: 'd20-final' },
      h('p', { class: 'big' }, 'Kein Kaninchen kam zu Schaden.'),
      h('p', { class: 'big', style: { marginTop: '10px', fontSize: '1.2rem', fontWeight: '480', color: 'var(--snow-dim)' } }, 'Eine Möhre allerdings schon.'),
      h('p', { class: 'orn' }, '✦ ✦ ✦'));
    roll.append(final);
    const snowCv = h('canvas', { class: 'd20-snowc' });
    const skipBtn = button('Überspringen', () => skipCredits(), { variant: 'ghost small' });
    skipBtn.classList.add('d20-skip');
    const credBtns = h('div', { class: 'd20-credit-btns' },
      button('Nochmal ansehen', () => replay(), { variant: 'ghost' }),
      button('Zurück zum Berg', () => ctx.close()));
    const credits = h('div', { class: 'd20-credits' }, snowCv, roll, skipBtn, credBtns);

    stage.append(screen, leader, tap, pauseIcon, progress, curtain, start, credits);
    root.append(stage);
    leader.classList.add('off');

    // ---------- Video oder Daumenkino ----------
    const videoReady = videoExists(VIDEO_URL).then((ok) => {
      // Die Medienwahl steht mit dem Start fest: eine später eintreffende Antwort ändert sie nicht mehr.
      if (dead || !ok || phase !== 'start') return false;
      video = h('video', { class: 'd20-video', playsinline: '', preload: 'metadata', poster: ctx.img('d20-a'), 'webkit-playsinline': '' });
      video.setAttribute('playsinline', '');
      video.muted = !soundOn();
      video.src = VIDEO_URL;
      video.addEventListener('error', onVideoError);
      video.addEventListener('ended', () => { if (phase === 'film') startCredits(); });
      video.addEventListener('timeupdate', () => {
        if (video.duration > 0) progressFill.style.transform = `scaleX(${video.currentTime / video.duration})`;
      });
      video.addEventListener('pause', () => { if (phase === 'film' && !video.ended) pauseIcon.classList.add('on'); });
      video.addEventListener('play', () => pauseIcon.classList.remove('on'));
      // Das Video hat schwarze Balken oben und unten (Inhalt 2:3 in einem 9:16-Bild): zuschneiden, Rest mit Ambient-Hintergrund füllen
      vbox = h('div', { class: 'd20-vidbox' }, video);
      vambient = h('img', { class: 'd20-ambient', src: ctx.img('d20-a'), alt: '', draggable: 'false' });
      screen.prepend(vambient, vbox);
      mode = 'video';
      return true;
    });

    const onKlang = (e) => { if (video) video.muted = !e.detail.on; };
    window.addEventListener('klang', onKlang);

    function onVideoError() {
      if (dead) return;
      // Video lässt sich nicht abspielen: dieselbe Geschichte als Daumenkino zeigen
      video?.remove();
      vbox?.remove();
      vambient?.remove();
      video = null;
      vbox = null;
      vambient = null;
      mode = 'film';
      if (phase === 'film') runFilm();
    }

    function runFilm() {
      // Läuft schon als Film: Bedienung und Fortschritt anschließen
      progress.classList.add('on');
      pauseIcon.classList.remove('on');
      if (mode === 'video' && video) {
        video.muted = !soundOn();
        video.currentTime = 0;
        const p = video.play();
        p?.catch(() => {
          // Browser verlangt eine Berührung: großer Knopf zum Weiterschauen
          const again = button('Film abspielen', () => { again.remove(); video?.play().catch(() => {}); }, { variant: '' });
          again.classList.add('d20-resume');
          stage.append(again);
        });
      } else {
        film?.destroy();
        film = createFilm(screen, ctx, {
          onEnd: () => { filmEnded = true; later(startCredits, 250); },
          onProgress: (v) => { progressFill.style.transform = `scaleX(${v})`; },
        });
        film.start();
      }
    }

    // ---------- Ablauf ----------
    function runLeader() {
      phase = 'leader';
      leader.classList.remove('off');
      progress.classList.remove('on');
      const steps = ['3', '2', '1'];
      let i = 0;
      const next = () => {
        if (i >= steps.length) {
          leader.classList.add('off');
          later(() => { phase = 'film'; ctx.setHeader('hidden'); runFilm(); }, 220);
          return;
        }
        num.textContent = steps[i];
        sweep.style.animation = 'none';
        // eslint-disable-next-line no-unused-expressions
        sweep.offsetWidth;
        sweep.style.animation = '';
        ctx.tone(i === 2 ? 880 : 520, { dur: i === 2 ? 0.28 : 0.16, vol: 0.09, type: 'sine' });
        i++;
        later(next, 1000);
      };
      next();
    }

    function openCurtain() {
      stage.classList.add('d20-open');
      start.classList.add('go');
      ctx.sfx.play('whoosh');
      ctx.sfx.hiss({ dur: 2.2, vol: 0.06, from: 160, to: 800, q: 0.4 });
      later(() => ctx.sfx.play('chime'), 1500);
    }

    async function onStart() {
      if (phase !== 'start') return;
      phase = 'leader';
      ctx.sfx.play('tap');
      // Video schon jetzt „freischalten“: Handys erlauben das spätere Abspielen nur nach einer Berührung.
      if (video) {
        const v = video;
        v.muted = true;
        v.play().then(() => { v.pause(); v.currentTime = 0; v.muted = !soundOn(); }).catch(() => { v.muted = !soundOn(); });
      }
      openCurtain();
      later(runLeader, 900);
    }
    playBtn.addEventListener('click', onStart);
    // Falls die Prüfung noch läuft: Knopf wartet kurz (nie lange)
    videoReady.catch(() => {});

    function togglePause() {
      if (phase !== 'film') return;
      if (mode === 'video' && video) {
        if (video.paused) video.play().catch(() => {}); else video.pause();
      } else if (film) {
        const nowPaused = film.toggle();
        pauseIcon.classList.toggle('on', nowPaused);
      }
    }
    tap.addEventListener('click', togglePause);

    // ---------- Abspann ----------
    function startCredits() {
      if (phase === 'credits' || phase === 'end' || dead) return;
      phase = 'credits';
      filmEnded = true;
      ctx.setHeader('dark');
      progress.classList.remove('on');
      pauseIcon.classList.remove('on');
      if (video && !video.paused) video.pause();
      credits.classList.add('on');
      skipBtn.classList.remove('off');
      credBtns.classList.remove('on');
      if (!snow) {
        snow = new ctx.fx.Snow(snowCv, { density: 0.6, wind: -10 });
        snow.start();
      }
      const vh = () => stage.getBoundingClientRect().height || 800;
      const finalY = () => vh() / 2 - (final.offsetTop + final.offsetHeight / 2);
      let y = vh();
      let fast = false;
      roll.style.transform = `translate3d(0, ${y}px, 0)`;
      const down = () => { fast = true; };
      const up = () => { fast = false; };
      credits.addEventListener('pointerdown', down);
      credits.addEventListener('pointerup', up);
      credits.addEventListener('pointercancel', up);
      const stop = loop((dt) => {
        if (document.hidden) return;
        const target = finalY();
        y -= (fast ? 190 : 62) * dt;
        if (y <= target) {
          y = target;
          roll.style.transform = `translate3d(0, ${y}px, 0)`;
          finishCredits();
          return;
        }
        roll.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      });
      stopCredits = () => {
        stop();
        credits.removeEventListener('pointerdown', down);
        credits.removeEventListener('pointerup', up);
        credits.removeEventListener('pointercancel', up);
        stopCredits = null;
      };
    }

    function finishCredits() {
      if (phase !== 'credits') return;
      phase = 'end';
      stopCredits?.();
      skipBtn.classList.add('off');
      credBtns.classList.add('on');
      if (!completed) {
        completed = true;
        ctx.complete();
      }
    }

    function skipCredits() {
      if (phase !== 'credits') return;
      // direkt ans Ende springen
      const vh = stage.getBoundingClientRect().height || 800;
      roll.style.transform = `translate3d(0, ${vh / 2 - (final.offsetTop + final.offsetHeight / 2)}px, 0)`;
      finishCredits();
    }

    function replay() {
      if (phase !== 'end') return;
      credits.classList.remove('on');
      credBtns.classList.remove('on');
      stopCredits?.();
      filmEnded = false;
      if (mode === 'video' && video) {
        video.pause();
        video.currentTime = 0;
        // Berührung liegt vor (Knopf): hier direkt neu starten, ohne erneuten Countdown
      }
      runLeader();
    }

    return () => {
      dead = true;
      timers.forEach(clearTimeout);
      timers.clear();
      window.removeEventListener('klang', onKlang);
      stopCredits?.();
      snow?.destroy();
      film?.destroy();
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      // Wer den Film gesehen hat, bekommt die Laterne auch ohne Abspann
      if (filmEnded && !completed) ctx.complete({ quiet: true });
    };
  },
};
