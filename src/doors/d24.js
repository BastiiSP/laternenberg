// Türchen 24 · Der Gipfel (Heiligabend, Vollmond)
// 1. Panorama: Alle 24 Lichter zünden sich vom Tal bis zum Gipfel an (Zähler 1…24).
// 2. Vor der Gipfelhütte: dreimal anklopfen, die Tür geht auf.
// 3. In der Hütte (d24-huette): Lorelai und Logan, ein Brief von Basti.
// 4. Draußen: Polarlicht, Funkenregen, Vollmond, Hintergrundbild, „Der Berg bleibt“.
import './d24.css';

const ABORT = Symbol('abort');
const IMG_W = 1024;
const IMG_H = 1536;

// Die 24 Laternen am Weg im Panorama (Bildpixel), vom Tal bis zur Hütte
const PATH = [
  [378, 908], [487, 838], [547, 815], [463, 763], [377, 738], [315, 718],
  [402, 660], [470, 635], [570, 615], [638, 595], [595, 560], [520, 535],
  [425, 520], [383, 505], [470, 460], [600, 425], [657, 398], [713, 378],
  [780, 355], [855, 325], [755, 283], [672, 258], [740, 215], [720, 172],
];
const MOON = { x: 840, y: 125 };
const HUT = { x: 720, y: 175 };

const V = {
  start: { x: 0.42, y: 0.86, z: 1.32 },
  full: { x: 0.6, y: 0.3, z: 1.0 },
  hut: { x: 0.703, y: 0.115, z: 2.7 },
  outro: { x: 0.62, y: 0.16, z: 1.12 },
  inStart: { x: 0.6, y: 0.24, z: 1.45 },
  inEnd: { x: 0.46, y: 0.6, z: 1.12 },
};

const NAMES = { lorelai: 'Lorelai', logan: 'Logan' };
const TALK = [
  { who: 'lorelai', text: 'Da bist du ja! Wir haben gewartet. Geduldig. Logan hat nur drei Möhrenkekse gegessen.' },
  { who: 'logan', text: 'Vier. Aber der vierte war sehr klein. Der Tee ist fertig – Hafermilch steht daneben.' },
  { who: 'lorelai', text: 'Und auf dem Tisch liegt etwas für dich. Nicht von uns. Wir hätten dir Heu geschenkt.' },
];

// Brief in der Gipfelhütte.
const LETTER = [
  { t: 'Liebe Melli,', cls: 'hello' }, // BASTI-STIMME
  // BASTI-STIMME
  { t: 'jetzt bist du oben angekommen. Vierundzwanzig Laternen vom Tal bis zum Gipfel. Bei jeder habe ich an dich gedacht.' },
  // BASTI-STIMME
  { t: 'Ich wollte dir mit diesem Kalender jeden Tag eine kleine Freude machen. Etwas zum Lesen, zum Lächeln oder einfach für eine Pause mit Tee.' },
  // BASTI-STIMME
  { t: 'Ich bin so gern mit dir zusammen. Du bist mein Lieblingsmensch, und ich hoffe, das hast du beim Öffnen der Türchen gemerkt.' },
  // BASTI-STIMME
  { t: 'Ich liebe dich.' },
  // BASTI-STIMME
  { t: 'Frohe Weihnachten, Melli. Fühl dich fest umarmt.' },
  // BASTI-STIMME
  { t: 'Dein Basti', cls: 'last' },
];

/* ---------- kleine Helfer ---------- */

function makeFlow(stage) {
  let dead = false;
  const pend = new Set();
  const timers = new Set();
  const offs = new Set();
  const guard = (exec) => new Promise((resolve, reject) => {
    if (dead) return reject(ABORT);
    const entry = { reject };
    pend.add(entry);
    exec((v) => {
      pend.delete(entry);
      if (!dead) resolve(v);
    });
  });
  const flow = {
    get dead() {
      return dead;
    },
    wait: (ms) => guard((done) => {
      const t = setTimeout(done, ms);
      timers.add(t);
    }),
    /** Nächstes Antippen eines Elements (Standard: Bühne), nicht auf Knöpfen/Links. */
    tap: (el = stage) => guard((done) => {
      const on = (e) => {
        if (el === stage && e.target.closest('button, a')) return;
        off();
        offs.delete(off);
        done(e);
      };
      const off = () => el.removeEventListener('click', on);
      offs.add(off);
      el.addEventListener('click', on);
    }),
    tapOr(ms, el) {
      return Promise.race([flow.tap(el), flow.wait(ms).then(() => 'time')]);
    },
    kill() {
      dead = true;
      timers.forEach(clearTimeout);
      offs.forEach((f) => f());
      pend.forEach((p) => p.reject(ABORT));
      pend.clear();
    },
  };
  return flow;
}

function makeCam(stage, wrap) {
  let view = { x: 0.5, y: 0.5, z: 1 };
  const calc = (v) => {
    const W = stage.clientWidth || innerWidth;
    const H = stage.clientHeight || innerHeight;
    const s = Math.max(W / IMG_W, H / IMG_H) * v.z;
    const iw = IMG_W * s;
    const ih = IMG_H * s;
    const tx = Math.min(0, Math.max(W - iw, W / 2 - v.x * iw));
    const ty = Math.min(0, Math.max(H - ih, H / 2 - v.y * ih));
    return { s, tx, ty };
  };
  return {
    set(v, ms = 0, ease = 'cubic-bezier(.45,.05,.25,1)') {
      view = v;
      const { s, tx, ty } = calc(v);
      if (!ms) {
        wrap.style.transition = 'none';
        // eslint-disable-next-line no-unused-expressions
        wrap.offsetWidth;
      } else {
        wrap.style.transition = `transform ${ms}ms ${ease}`;
      }
      wrap.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
    },
    refresh() {
      this.set(view, 0);
    },
  };
}

/** Gibt es das Lied schon? Vite liefert für fehlende Dateien evtl. HTML mit Status 200. */
async function songAvailable(signal) {
  try {
    const res = await fetch('/audio/lied.mp3', { method: 'HEAD', cache: 'no-store', signal });
    const type = res.headers.get('content-type') || '';
    return res.ok && type.startsWith('audio');
  } catch {
    return false;
  }
}

/** Mond-Satz, der auch beim späteren Wiederöffnen stimmt. */
function moonLine(time) {
  const b = time.berlin();
  const m = time.moon();
  const isEve = b.year === 2026 && b.month === 12 && b.day === 24;
  const before = b.year < 2026 || (b.year === 2026 && (b.month < 12 || b.day < 24));
  if (isEve && m.illum > 0.97) return 'Heute Nacht ist Vollmond – der echte. Schau mal aus dem Fenster.';
  if (before) return 'Am 24. Dezember 2026 steht der Vollmond über dem Berg.';
  return 'Am 24. Dezember 2026 stand der Vollmond über dem Berg.';
}

export default {
  mount(root, ctx) {
    const { h, button, haptic } = ctx.ui;
    const { fx, sfx } = ctx;
    const reduced = ctx.reducedMotion;

    let flow = null;
    let scene = null;
    let snow = null;
    let cams = [];
    let intervals = [];
    let hasSong = false;
    // Prüfung zeitlich begrenzt (4 s) und abbrechbar; sie blockiert nie den Ablauf.
    const songCtrl = new AbortController();
    const songTimer = setTimeout(() => songCtrl.abort(), 4000);
    const songCheck = songAvailable(songCtrl.signal).then((ok) => {
      clearTimeout(songTimer);
      hasSong = ok;
    });

    const onResize = () => cams.forEach((c) => c.refresh());
    window.addEventListener('resize', onResize);

    function clearIntervals() {
      intervals.forEach(clearInterval);
      intervals = [];
    }

    function teardown() {
      flow?.kill();
      flow = null;
      clearIntervals();
      snow?.destroy();
      snow = null;
      cams = [];
      scene?.remove();
      scene = null;
    }

    function start({ skip = false } = {}) {
      teardown();
      ctx.music.stop({ fade: 200 });
      flow = makeFlow(root);
      const f = flow;

      scene = h('div', { class: 'd24' });
      root.append(scene);

      /* ---------- Panorama mit Lichtern ---------- */
      const pan = h('div', { class: 'd24-cam' },
        h('img', { class: 'd24-img', src: ctx.img('d24-panorama'), alt: '', draggable: 'false' }));
      const dark = h('div', { class: 'd24-dark' });
      const aurora = h('div', { class: 'd24-aurora' }, h('i'), h('i'), h('i'));
      const moonGlow = h('div', { class: 'd24-moon', style: { left: MOON.x + 'px', top: MOON.y + 'px' } });
      pan.append(dark, aurora, moonGlow);
      const lights = PATH.map(([x, y], i) => {
        const el = h('div', { class: `d24-light${i === 23 ? ' hut' : ''}`, style: { left: x + 'px', top: y + 'px' } });
        pan.append(el);
        return el;
      });
      const camP = makeCam(root, pan);

      /* ---------- Hütte innen ---------- */
      const hut = h('div', { class: 'd24-cam d24-in' },
        h('img', { class: 'd24-img', src: ctx.img('d24-huette'), alt: '', draggable: 'false' }));
      const camH = makeCam(root, hut);
      cams = [camP, camH];

      const snowCanvas = h('canvas', { class: 'd24-snow', 'aria-hidden': 'true' });
      const shade = h('div', { class: 'd24-shade' });
      const flood = h('div', { class: 'd24-flood' });

      const caption = h('div', { class: 'd24-caption', 'aria-live': 'polite' });
      const counter = h('div', { class: 'd24-counter', 'aria-live': 'off' },
        h('b', { class: 'display' }, '0'), h('span', {}, 'Laternen'));
      const counterNum = counter.querySelector('b');
      const talk = h('div', { class: 'd24-talk', 'aria-live': 'polite' });
      const hint = h('div', { class: 'd24-hint' }, 'weiter', h('span', { 'aria-hidden': 'true' }, ' ›'));
      const skipBtn = ctx.isDone && !skip
        ? button('Überspringen', () => start({ skip: true }), { variant: 'ghost small' })
        : null;
      skipBtn?.classList.add('d24-skip');

      scene.append(pan, hut, snowCanvas, shade, caption, counter, talk, flood, hint);
      if (skipBtn) scene.append(skipBtn);

      snow = new fx.Snow(snowCanvas, { density: 0.8, wind: 10 });
      snow.start();

      const run = skip ? outro(true) : sequence();
      run.catch((e) => {
        if (e !== ABORT) console.error(e);
      });

      /* ---------- Ablauf ---------- */

      async function sequence() {
        ctx.setHeader('hidden');
        camP.set(V.start, 0);
        dark.style.opacity = '0.82';
        await f.wait(500);
        showCaption(
          h('span', { class: 'd24-kicker' }, '24. Dezember · Heiligabend'),
          h('p', { class: 'display d24-cap-big' }, 'Ein letztes Mal den Berg hinauf.'),
        );
        sfx.bell(392, { vol: 0.06, dur: 3 });
        await f.tapOr(3800);
        hideCaption();
        await f.wait(500);
        await lightPath();
        await toHut();
      }

      function showCaption(...kids) {
        caption.replaceChildren(...kids);
        caption.classList.remove('out');
        caption.classList.add('in');
      }
      function hideCaption() {
        caption.classList.remove('in');
        caption.classList.add('out');
      }

      async function lightPath() {
        counter.classList.add('show');
        // aufsteigende Pentatonik, ein Ton pro Laterne
        const scale = [0, 2, 4, 7, 9];
        for (let i = 0; i < 24; i++) {
          const [x, y] = PATH[i];
          const k = i / 23;
          camP.set({ x: x / IMG_W, y: y / IMG_H, z: 1.32 + k * 0.1 }, reduced ? 0 : 1700, 'cubic-bezier(.3,.1,.25,1)');
          await f.wait(i === 0 ? 700 : Math.round(620 - 330 * Math.sqrt(k)));
          lights[i].classList.add('on');
          counterNum.textContent = String(i + 1);
          counter.classList.remove('pop');
          // eslint-disable-next-line no-unused-expressions
          counter.offsetWidth;
          counter.classList.add('pop');
          const step = Math.floor(i * 0.6);
          const semi = 12 * Math.floor(step / 5) + scale[step % 5];
          sfx.bell(261.63 * Math.pow(2, semi / 12), { vol: 0.07, dur: 1.6 });
          dark.style.opacity = String(0.82 * Math.pow(1 - (i + 1) / 24, 1.2));
          if (i % 4 === 3) haptic(8);
        }
        // Gipfel erreicht
        ctx.complete();
        sfx.play('fanfare');
        haptic(30);
        const r = lights[23].getBoundingClientRect();
        fx.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 50, kind: 'star', power: 260, life: 1.8, size: 10, colors: ['#fff3c4', '#ffd98a', '#ffb347'] });
        aurora.classList.add('on');
        moonGlow.classList.add('on');
        camP.set(V.full, reduced ? 0 : 5000);
        await f.wait(1600);
        counter.classList.add('done');
        showCaption(
          h('p', { class: 'display d24-cap-big' }, 'Vierundzwanzig Laternen.'),
          h('p', { class: 'd24-cap-sub' }, 'Vom Tal bis zum Gipfel. Ganz oben brennt Licht in der Hütte.'),
        );
        await f.wait(1400);
        const go = button('Zur Hütte hinauf', null);
        go.classList.add('d24-go');
        caption.append(go);
        await f.tap(go);
        hideCaption();
        counter.classList.remove('show');
      }

      async function toHut() {
        sfx.play('whoosh');
        camP.set(V.hut, reduced ? 0 : 2400, 'cubic-bezier(.55,0,.6,1)');
        await f.wait(reduced ? 100 : 1500);
        const door = buildDoorScene();
        scene.insertBefore(door.el, shade);
        requestAnimationFrame(() => door.el.classList.add('in'));
        await f.wait(1000);
        ctx.setHeader('dark');
        await knock(door);
      }

      function buildDoorScene() {
        const leaf = h('div', { class: 'd24-leaf' },
          h('i', { class: 'd24-band b1' }), h('i', { class: 'd24-band b2' }),
          h('i', { class: 'd24-ringhandle' }));
        leaf.append(ctx.ui.html(`<svg class="d24-wreath" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="31" fill="none" stroke="#1f5a3e" stroke-width="15"/>
          <circle cx="50" cy="50" r="31" fill="none" stroke="#2f7a52" stroke-width="7" stroke-dasharray="3 6"/>
          <g fill="#d2434f"><circle cx="30" cy="34" r="4"/><circle cx="70" cy="36" r="4"/><circle cx="74" cy="62" r="4"/><circle cx="50" cy="81" r="4"/><circle cx="25" cy="62" r="4"/><circle cx="58" cy="19" r="3.4"/></g>
          <path d="M50 76 l-13 12 4 3 9-8 9 8 4-3z" fill="#c9505a"/><circle cx="50" cy="77" r="4.5" fill="#e0606b"/></svg>`));
        const frame = h('div', { class: 'd24-frame' }, h('div', { class: 'd24-inside' }), leaf);
        const bubble = h('div', { class: 'bubble d24-doorbubble' });
        frame.append(bubble);
        const lantern = ctx.ui.html('<svg class="d24-lantern" viewBox="0 0 48 66" aria-hidden="true"><path d="M8.5 22 L24 9.5 L39.5 22 Z" fill="#232842"/><rect x="12.5" y="22" width="23" height="27" rx="3.5" fill="#ffd98a"/><path class="d24-lflame" d="M24 44c-6-3.5-4.6-9.6 0-15 4.6 5.4 6 11.5 0 15z" fill="#ff9d3c"/><rect x="9" y="48.5" width="30" height="6" rx="2.5" fill="#232842"/></svg>');
        const prompt = h('div', { class: 'd24-prompt' },
          h('p', { class: 'display' }, 'Die Gipfelhütte.'),
          h('p', { class: 'd24-prompt-sub' }, 'Drinnen brennt Licht. Klopf an – dreimal.'),
          h('div', { class: 'd24-knocks' }, h('i'), h('i'), h('i')));
        const el = h('div', { class: 'd24-door' },
          h('div', { class: 'd24-sky' }),
          prompt,
          h('div', { class: 'd24-facade' },
            h('div', { class: 'd24-roof' }),
            h('div', { class: 'd24-win l' }), h('div', { class: 'd24-win r' }),
            h('div', { class: 'd24-sign display' }, 'Gipfelhütte')),
          h('div', { class: 'd24-ground' }, h('div', { class: 'd24-sill' })),
          h('div', { class: 'd24-lanternwrap' }, h('i', { class: 'd24-lglow' }), lantern),
          frame);
        return { el, frame, leaf, bubble, prompt, dots: [...prompt.querySelectorAll('.d24-knocks i')] };
      }

      async function knock(door) {
        let n = 0;
        while (n < 3) {
          await f.tap(door.el);
          n++;
          door.dots[n - 1].classList.add('on');
          door.leaf.classList.remove('knock');
          // eslint-disable-next-line no-unused-expressions
          door.leaf.offsetWidth;
          door.leaf.classList.add('knock');
          ctx.tone(92, { dur: 0.16, type: 'triangle', vol: 0.32, slide: 0.55 });
          ctx.tone(150, { dur: 0.06, type: 'square', vol: 0.03 });
          sfx.hiss({ dur: 0.07, vol: 0.07, from: 700, to: 200 });
          haptic(25);
          const roof = door.el.querySelector('.d24-roof').getBoundingClientRect();
          fx.burst(roof.left + roof.width * fx.rand(0.3, 0.7), roof.bottom, { count: 8, kind: 'dot', colors: ['#ffffff', '#e6ecff'], power: 60, gravity: 260, up: 0, life: 1.2, size: 4 });
          await f.wait(260);
        }
        await f.wait(700);
        door.bubble.replaceChildren(h('span', { class: 'who' }, 'Lorelai, von drinnen'), 'Wer da? … Ach, DU! Komm rein, schnell, es zieht!');
        door.bubble.classList.add('in');
        sfx.play('squeak');
        await f.wait(2200);
        door.bubble.classList.remove('in');
        // Tür geht auf
        door.frame.classList.add('open');
        door.prompt.classList.add('out');
        ctx.tone(170, { dur: 0.9, type: 'sawtooth', vol: 0.025, slide: 1.5 });
        sfx.play('whoosh');
        await f.wait(1300);
        // Hinein ins Licht
        const fr = door.frame.getBoundingClientRect();
        const sr = root.getBoundingClientRect();
        door.el.style.transformOrigin = `${fr.left - sr.left + fr.width / 2}px ${fr.top - sr.top + fr.height * 0.55}px`;
        door.el.classList.add('enter');
        flood.classList.add('on');
        sfx.play('chime');
        await f.wait(900);
        door.el.remove();
        pan.classList.add('gone');
        hut.classList.add('show');
        camH.set(V.inStart, 0);
        await f.wait(80);
        flood.classList.remove('on');
        camH.set(V.inEnd, reduced ? 0 : 9000);
        await inside();
      }

      async function inside() {
        // Ofen knistert leise
        intervals.push(setInterval(() => {
          if (Math.random() < 0.55) sfx.hiss({ dur: fx.rand(0.02, 0.06), vol: fx.rand(0.015, 0.04), from: fx.rand(1200, 3000), to: fx.rand(600, 1500), q: 2 });
        }, 260));
        await f.wait(2400);
        for (const line of TALK) {
          say(line.who, line.text);
          await f.wait(600);
          hint.classList.add('show');
          await f.tap();
          hint.classList.remove('show');
        }
        clearTalk();
        await f.wait(300);
        // Der Umschlag
        const env = h('button', { class: 'd24-envelope', type: 'button', 'aria-label': 'Brief öffnen' },
          h('span', { class: 'd24-env-back' }),
          h('span', { class: 'd24-env-paper' }),
          h('span', { class: 'd24-env-front' }, h('span', { class: 'hand' }, 'Für Melli')),
          h('span', { class: 'd24-env-flap' }),
          h('span', { class: 'd24-env-seal' }, '✦'));
        const envWrap = h('div', { class: 'd24-envwrap' }, env, h('p', { class: 'd24-envhint' }, 'Antippen zum Öffnen'));
        scene.append(envWrap);
        shade.classList.add('soft');
        sfx.play('sparkle');
        requestAnimationFrame(() => envWrap.classList.add('in'));
        await f.tap(env);
        env.classList.add('open');
        envWrap.classList.add('opening');
        sfx.play('page');
        await f.wait(950);
        envWrap.remove();
        await showLetter({ first: true });
        clearIntervals();
        await outro(false);
      }

      function say(who, text) {
        const row = h('div', { class: `d24-say d24-say-${who}` },
          h('div', { class: 'd24-face' }, ctx.bunnyFace(who, { size: 44 })),
          h('div', { class: 'bubble d24-bubble' }, h('span', { class: 'who' }, NAMES[who]), text));
        const old = talk.firstElementChild;
        if (old) {
          old.classList.add('gone');
          setTimeout(() => old.remove(), 300);
        }
        talk.append(row);
        sfx.play(who === 'lorelai' ? 'squeak' : 'hop');
        requestAnimationFrame(() => row.classList.add('in'));
      }
      function clearTalk() {
        [...talk.children].forEach((c) => {
          c.classList.add('gone');
          setTimeout(() => c.remove(), 300);
        });
      }

      /** Der Brief als Papierbogen; Absätze erscheinen nacheinander, Antippen zeigt alles. */
      function showLetter({ first }) {
        return new Promise((resolve, reject) => {
          const paras = LETTER.map((p) => h('p', { class: `d24-lp${p.cls ? ' ' + p.cls : ''}` }, p.t));
          const paper = h('article', { class: 'd24-letter' },
            h('div', { class: 'd24-letter-top' }, h('span', {}, 'Von Basti'), h('span', {}, 'Heiligabend 2026')),
            ...paras);
          const closeBtn = button(first ? 'Nach draußen schauen' : 'Brief schließen', () => {
            sheet.classList.remove('in');
            setTimeout(() => sheet.remove(), 500);
            resolve();
          }, { variant: first ? '' : 'ghost' });
          closeBtn.classList.add('d24-letter-btn');
          const col = h('div', { class: 'd24-lettercol' }, paper, closeBtn);
          const sheet = h('div', { class: 'stage-scroll d24-sheet' }, col);
          scene.append(sheet);
          requestAnimationFrame(() => sheet.classList.add('in'));

          let all = false;
          const showAll = () => {
            all = true;
            paras.forEach((p) => p.classList.add('in'));
            closeBtn.classList.add('in');
          };
          paper.addEventListener('click', showAll);
          (async () => {
            await f.wait(first ? 700 : 250);
            for (let i = 0; i < paras.length && !all; i++) {
              paras[i].classList.add('in');
              if (paras[i].classList.contains('last')) sfx.bell(523.25, { vol: 0.07, dur: 2.6 });
              await f.wait(first ? (i === 0 ? 900 : 1700) : 160);
            }
            showAll();
          })().catch((e) => {
            if (e === ABORT) reject(ABORT);
          });
        });
      }

      /* ---------- Finale draußen ---------- */
      async function outro(direct) {
        ctx.setHeader('dark');
        skipBtn?.remove();
        hint.classList.remove('show');
        clearIntervals();
        counter.classList.remove('show');
        hideCaption();
        // Panorama ganz hell, Polarlicht, Mond
        lights.forEach((l) => l.classList.add('on', 'still'));
        dark.style.transition = 'none';
        dark.style.opacity = '0';
        aurora.classList.add('on');
        moonGlow.classList.add('on');
        pan.classList.remove('gone');
        camP.set({ ...V.full, z: 1.04 }, 0);
        if (!direct) {
          flood.classList.add('cool', 'on');
          await f.wait(60);
        }
        hut.classList.remove('show');
        hut.classList.add('fast');
        flood.classList.remove('on');
        camP.set(V.outro, reduced ? 0 : 7000);
        shade.classList.remove('soft');
        shade.classList.add('final');
        sfx.play('bell');
        sfx.play('sparkle');
        sparkRain(direct ? 7000 : 11000);
        await f.wait(direct ? 400 : 1600);
        if (f.dead || !scene) return;
        finalPanel();
      }

      function sparkRain(ms) {
        if (reduced) return;
        const until = performance.now() + ms;
        const id = setInterval(() => {
          if (document.hidden) return;
          const left = until - performance.now();
          if (left <= 0) {
            clearInterval(id);
            return;
          }
          const r = root.getBoundingClientRect();
          fx.burst(r.left + fx.rand(r.width), r.top + fx.rand(-10, r.height * 0.35), {
            count: left > ms * 0.5 ? 4 : 2, kind: Math.random() < 0.3 ? 'star' : 'spark', power: 50, gravity: 70, up: 0, life: 2.4, size: 4,
            colors: ['#fff3c4', '#ffd98a', '#ffb347', '#bff5e6'],
          });
        }, 200);
        intervals.push(id);
      }

      function finalPanel() {
        const wallSrc = '/img/wallpaper/laternenberg.jpg';
        const thumb = h('button', { class: 'd24-thumb', type: 'button', 'aria-label': 'Hintergrundbild groß ansehen' },
          h('img', { src: wallSrc, alt: 'Der Laternenberg als Handy-Hintergrund', loading: 'lazy' }));
        thumb.addEventListener('click', () => {
          sfx.play('tap');
          openWallpaper(wallSrc);
        });
        const dl = h('a', { class: 'btn small d24-dl', href: wallSrc, download: 'laternenberg.jpg' }, 'Bild speichern');
        dl.addEventListener('click', () => sfx.play('tap'));

        const extra = h('div', { class: 'd24-extra' },
          button('Den Brief noch einmal lesen', () => {
            showLetter({ first: false }).catch(() => {});
          }, { variant: 'ghost small' }));
        const addSongButton = () => {
          let playing = false;
          const songBtn = button('Das Lied noch einmal hören', () => {
            if (playing) {
              ctx.music.stop({ fade: 600 });
              playing = false;
              songBtn.textContent = 'Das Lied noch einmal hören';
              return;
            }
            const el = ctx.music.play('/audio/lied.mp3', { loop: false, volume: 0.85, fade: 600 });
            playing = true;
            songBtn.textContent = 'Lied anhalten';
            el?.addEventListener('ended', () => {
              playing = false;
              songBtn.textContent = 'Das Lied noch einmal hören';
            });
          }, { variant: 'ghost small' });
          extra.append(songBtn);
        };
        // Das Lied-Knöpfchen kommt dazu, sobald die Prüfung durch ist (ggf. sofort); nie davor warten.
        songCheck.then(() => { if (!f.dead && hasSong) addSongButton(); });

        const panel = h('div', { class: 'panel d24-final' },
          h('h2', { class: 'display d24-final-title' }, 'Frohe Weihnachten, Melli.'),
          h('p', { class: 'd24-moonline' }, moonLine(ctx.time)),
          h('div', { class: 'd24-wall' },
            thumb,
            h('div', { class: 'd24-wall-text' },
              h('p', { class: 'd24-wall-title' }, 'Der Laternenberg für dein Handy'),
              dl,
              h('p', { class: 'd24-wall-hint' }, 'Klappt das nicht: Bild antippen, lange drücken, sichern.'))),
          extra,
          h('p', { class: 'd24-stay' }, 'Der Berg bleibt. Die Laternen brennen weiter – du kannst jederzeit zurückkommen.'),
          h('div', { class: 'd24-final-btns' },
            button('Zurück zum Berg', () => ctx.close()),
            button('Noch einmal von vorn', () => start(), { variant: 'ghost small' })));
        const wrap = h('div', { class: 'stage-scroll d24-finalwrap' }, h('div', { class: 'd24-spacer' }), panel);
        scene.append(wrap);
        requestAnimationFrame(() => wrap.classList.add('in'));
      }

      function openWallpaper(src) {
        const close = h('button', { class: 'd24-wp-close', type: 'button', 'aria-label': 'Schließen' },
          ctx.ui.html('<svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'));
        const box = h('div', { class: 'd24-wp' },
          h('img', { src, alt: 'Der Laternenberg als Handy-Hintergrund' }),
          h('p', { class: 'd24-wp-hint' }, 'Lange drücken → Bild sichern'),
          close);
        const shut = () => {
          sfx.play('tap');
          box.classList.remove('in');
          setTimeout(() => box.remove(), 350);
        };
        close.addEventListener('click', shut);
        scene.append(box);
        requestAnimationFrame(() => box.classList.add('in'));
      }
    }

    start();

    return () => {
      clearTimeout(songTimer);
      songCtrl.abort();
      teardown();
      window.removeEventListener('resize', onResize);
    };
  },
};
