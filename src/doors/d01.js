// Türchen 1 · Die erste Laterne
// Bilderbuch-Auftakt: Legende mit Kamerafahrt über d01-berg, Melli zündet die erste
// Laterne an (Finger halten), Überblendung auf d01-laterne, ein Glimmling schlüpft
// heraus und erklärt mit Lorelai und Logan die Spielregeln, zum Schluss Bastis Karte.
import './d01.css';

const ABORT = Symbol('abort');
const IMG_W = 1024;
const IMG_H = 1536;

// Bildpunkte (in Pixeln des 1024 × 1536-Bildes)
const BERG_LANTERN = { x: 690, y: 1205 }; // Glas der dunklen Laterne
const LAT_FLAME = { x: 840, y: 1128 }; // Flamme in d01-laterne
const GLIMM_TARGET = { x: 640, y: 690 }; // dort schwebt der Glimmling

// Kamerapunkte: x/y = Bildmitte (0..1), z = Zoom relativ zu „cover“
const V = {
  start: { x: 0.5, y: 0.06, z: 1.5 },
  p1: { x: 0.52, y: 0.2, z: 1.38 },
  p2: { x: 0.6, y: 0.38, z: 1.3 },
  p3: { x: 0.42, y: 0.56, z: 1.28 },
  p4: { x: 0.66, y: 0.77, z: 1.7 },
  p5: { x: 0.46, y: 0.78, z: 1.3 },
  p6: { x: 0.5, y: 0.66, z: 1.06 },
  hold: { x: 0.55, y: 0.8, z: 1.15 },
  latIn: { x: 0.8, y: 0.72, z: 1.4 },
  latWide: { x: 0.55, y: 0.62, z: 1.05 },
};

// Die Legende (Erzähler)
const STORY = [
  { text: 'Weit hinter dem letzten Dorf steht ein Berg, den man nur im Dezember findet.', view: V.p1, ms: 9000 },
  { text: 'Jedes Jahr, wenn die Nächte lang werden, schläft er ein. Dann wird es still an seinen Hängen. Und dunkel.', view: V.p2, ms: 8000 },
  { text: 'Wach wird er nur, wenn ihm jemand Abend für Abend ein Licht anzündet. Vierundzwanzig Stück, vom Tal bis zum Gipfel.', view: V.p3, ms: 8000 },
  { text: 'In jeder Laterne wohnt ein Glimmling. Er schläft, bis seine Laterne brennt. Danach ist er sehr wach.', view: V.p4, ms: 7000 },
  { text: 'Dieses Jahr hat sich der Berg jemanden ausgesucht.', view: V.p5, ms: 6000 },
  { text: 'Dich, Melli.', sub: 'Dieses Jahr bist du die Laternenanzünderin.', view: V.p6, ms: 6000, big: true },
];
const STORY_NOTES = [392, 440, 523.25, 587.33, 659.25, 783.99];

// Spielregeln, beiläufig erzählt
const TALK = [
  { who: 'glimm', text: 'Huch. Hell hier! Hallo – ich bin der Glimmling aus Laterne eins. Also quasi der Älteste am Berg. Um einen Tag.' },
  { who: 'lorelai', text: 'Erklär ihr, wie das hier läuft. Schnell. Ich hatte heute noch keinen Kaffee.' },
  { who: 'glimm', text: 'Ab jetzt wartet jeden Tag eine neue Laterne auf dich. Jedes Mal ein Stückchen weiter oben.' },
  { who: 'logan', text: 'Und die alten gehen nicht aus. Du kannst jederzeit zurück. Falls irgendwo Snacks waren, zum Beispiel.' },
  { who: 'glimm', text: 'Auf der Karte gibt’s noch mehr: Geheimnisse zum Antippen. Und jeden Tag versteckt sich einer von uns Glimmlingen.' },
  { who: 'lorelai', text: 'Alles, was du findest, kommt ins Fundbuch. Oben rechts. Ich führe es. Sehr streng.' },
  { who: 'logan', text: 'Sie hat mich schon zweimal eingetragen.' },
];
const NAMES = { glimm: 'Glimmling', lorelai: 'Lorelai', logan: 'Logan' };

// Bastis Karte
const CARD = {
  hello: 'Liebe Melli,', // BASTI-STIMME
  lines: [
    // BASTI-STIMME
    'ich hab dir einen Berg bauen lassen. Die Idee mit dem Adventskalender ist von mir – gebaut hat ihn eine sehr fleißige KI. Die Bauleitung hatten angeblich zwei Kaninchen.',
    // BASTI-STIMME
    'Er ist für den Dezember da: jeden Tag ein Licht für dich und ein kleiner Gedanke an dich.',
    // BASTI-STIMME
    'Bis morgen an der nächsten Laterne.',
  ],
  sign: 'Basti', // BASTI-STIMME
};

/* ---------- kleine Helfer ---------- */

/** Ablauf mit abbrechbaren Wartepunkten (Neustart, Überspringen, Schließen). */
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
    /** Nächstes Antippen der Bühne (nicht auf Knöpfen/Links). */
    tap: () => guard((done) => {
      const on = (e) => {
        if (e.target.closest('button, a')) return;
        stage.removeEventListener('click', on);
        offs.delete(off);
        done('tap');
      };
      const off = () => stage.removeEventListener('click', on);
      offs.add(off);
      stage.addEventListener('click', on);
    }),
    /** Antippen oder Zeit abgelaufen – was zuerst kommt. */
    tapOr(ms) {
      return Promise.race([flow.tap(), flow.wait(ms).then(() => 'time')]);
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

/** Kamera über einem Bild: Ausschnitt, Zoom und weiche Fahrten nur per transform. */
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
    /** Bildpunkt → Bühnenpunkt (für die Zielansicht). */
    toScreen(px, py, v = view) {
      const { s, tx, ty } = calc(v);
      return { x: tx + px * s, y: ty + py * s };
    },
  };
}

export default {
  mount(root, ctx) {
    const { h, button, haptic } = ctx.ui;
    const { fx, sfx } = ctx;
    const reduced = ctx.reducedMotion;

    let flow = null;
    let scene = null;
    let snow = null;
    let stopLoop = null;
    let resizeCams = [];

    const onResize = () => resizeCams.forEach((c) => c.refresh());
    window.addEventListener('resize', onResize);

    function teardown() {
      flow?.kill();
      flow = null;
      stopLoop?.();
      stopLoop = null;
      snow?.destroy();
      snow = null;
      resizeCams = [];
      scene?.remove();
      scene = null;
    }

    function start({ skip = false } = {}) {
      teardown();
      ctx.music.stop({ fade: 200 });
      flow = makeFlow(root);
      const f = flow;

      scene = h('div', { class: 'd01 no-select' });
      root.append(scene);

      // Bildebenen mit Kamera
      const bergWrap = h('div', { class: 'd01-cam' },
        h('img', { class: 'd01-img', src: ctx.img('d01-berg'), alt: '', draggable: 'false' }));
      const latWrap = h('div', { class: 'd01-cam d01-lat' },
        h('img', { class: 'd01-img', src: ctx.img('d01-laterne'), alt: '', draggable: 'false' }));
      const camB = makeCam(root, bergWrap);
      const camL = makeCam(root, latWrap);
      resizeCams = [camB, camL];

      // Licht der Laterne im Bergbild (wächst beim Halten)
      const glow = h('div', { class: 'd01-glow', style: { left: BERG_LANTERN.x + 'px', top: BERG_LANTERN.y + 'px' } });
      const flame = h('div', { class: 'd01-flame', style: { left: BERG_LANTERN.x + 'px', top: BERG_LANTERN.y + 18 + 'px' } });
      const ring = h('div', { class: 'd01-ring', style: { left: BERG_LANTERN.x + 'px', top: BERG_LANTERN.y - 40 + 'px' } });
      ring.innerHTML = '<svg viewBox="0 0 200 200"><circle class="d01-ring-bg" cx="100" cy="100" r="88"/><circle class="d01-ring-fg" cx="100" cy="100" r="88" pathLength="100"/></svg>';
      const ringFg = ring.querySelector('.d01-ring-fg');
      bergWrap.append(glow, flame, ring);

      const snowCanvas = h('canvas', { class: 'd01-snow', 'aria-hidden': 'true' });
      const vignette = h('div', { class: 'd01-vignette' });
      const flash = h('div', { class: 'd01-flash' });
      const shade = h('div', { class: 'd01-shade' });

      // Erzähltext
      const story = h('div', { class: 'd01-story', 'aria-live': 'polite' });
      // Sprechblasen
      const talk = h('div', { class: 'd01-talk', 'aria-live': 'polite' });
      // Fußzeile: Hinweis + Überspringen
      const hint = h('div', { class: 'd01-hint' }, 'weiter', h('span', { 'aria-hidden': 'true' }, ' ›'));
      const skipBtn = ctx.isDone && !skip
        ? button('Überspringen', () => start({ skip: true }), { variant: 'ghost small' })
        : null;
      if (skipBtn) skipBtn.classList.add('d01-skip');
      const holdHint = h('div', { class: 'd01-holdhint' }, 'Finger auf die Laterne legen – und halten');

      scene.append(bergWrap, latWrap, snowCanvas, vignette, shade, flash, story, talk, holdHint, hint);
      if (skipBtn) scene.append(skipBtn);

      snow = new fx.Snow(snowCanvas, { density: 0.9, wind: 9 });
      snow.start();

      const run = skip ? finale(true) : sequence();
      run.catch((e) => {
        if (e !== ABORT) console.error(e);
      });

      /* ---------- Szenen ---------- */

      async function sequence() {
        ctx.setHeader('hidden');
        camB.set(V.start, 0);
        await f.wait(60);
        camB.set(V.p1, reduced ? 0 : 9000);
        await f.wait(1100);

        for (let i = 0; i < STORY.length; i++) {
          const p = STORY[i];
          if (i > 0) camB.set(p.view, reduced ? 0 : p.ms);
          sfx.bell(STORY_NOTES[i], { vol: 0.05, dur: 2.4 });
          const total = showPara(p);
          const r = await f.tapOr(total + 250);
          if (r === 'tap') story.classList.add('all');
          hint.classList.add('show');
          await f.tap();
          sfx.play('page');
          hint.classList.remove('show');
          story.classList.add('out');
          await f.wait(420);
        }
        story.replaceChildren();
        story.classList.remove('out', 'all');
        await ignite();
      }

      function showPara(p) {
        story.classList.remove('out', 'all');
        story.classList.toggle('big', !!p.big);
        const words = p.text.split(' ');
        const line = h('p', { class: p.big ? 'display d01-big' : 'display d01-line' });
        words.forEach((w, i) => {
          line.append(h('span', { class: 'd01-w', style: { animationDelay: `${i * 70}ms` } }, w), ' ');
        });
        story.replaceChildren(line);
        let total = words.length * 70 + 700;
        if (p.sub) {
          story.append(h('p', { class: 'd01-sub', style: { animationDelay: `${total + 300}ms` } }, p.sub));
          total += 1300;
        }
        return total;
      }

      async function say(who, text) {
        const face = who === 'glimm' ? ctx.glimmling({ size: 42, mood: 'happy' }) : ctx.bunnyFace(who, { size: 44 });
        const row = h('div', { class: `d01-say d01-say-${who}` },
          h('div', { class: 'd01-face' }, face),
          h('div', { class: 'bubble d01-bubble' }, h('span', { class: 'who' }, NAMES[who]), text));
        const old = talk.firstElementChild;
        if (old) {
          old.classList.add('gone');
          setTimeout(() => old.remove(), 300);
        }
        talk.append(row);
        sfx.play(who === 'glimm' ? 'chime' : who === 'lorelai' ? 'squeak' : 'hop');
        requestAnimationFrame(() => row.classList.add('in'));
        return row;
      }
      function clearTalk() {
        [...talk.children].forEach((c) => {
          c.classList.add('gone');
          setTimeout(() => c.remove(), 300);
        });
      }

      async function ignite() {
        ctx.setHeader('dark');
        camB.set(V.hold, reduced ? 0 : 2600);
        await f.wait(reduced ? 200 : 2000);
        say('lorelai', 'Da ist sie! Finger drauf und festhalten. Loslassen geht auch – dauert dann nur länger.');
        ring.classList.add('show');
        holdHint.classList.add('show');
        await holdToLight();
        // Es brennt!
        ctx.complete();
        haptic(40);
        sfx.play('ignite');
        ring.classList.remove('show');
        holdHint.classList.remove('show');
        clearTalk();
        const pt = camB.toScreen(BERG_LANTERN.x, BERG_LANTERN.y);
        const r = root.getBoundingClientRect();
        const cx = r.left + pt.x;
        const cy = r.top + pt.y;
        fx.burst(cx, cy, { count: 70, kind: 'spark', power: 380, life: 1.6, size: 6 });
        fx.burst(cx, cy, { count: 22, kind: 'star', power: 300, life: 1.8, size: 12, colors: ['#fff3c4', '#ffd98a'] });
        flash.style.setProperty('--fx', pt.x + 'px');
        flash.style.setProperty('--fy', pt.y + 'px');
        flash.classList.add('on');
        await f.wait(380);
        camL.set(V.latIn, 0);
        latWrap.classList.add('show');
        await f.wait(260);
        flash.classList.remove('on');
        flash.classList.add('fade');
        camL.set(V.latWide, reduced ? 0 : 9000);
        await f.wait(1500);
        await meetGlimmling();
      }

      function holdToLight() {
        return new Promise((resolve, reject) => {
          let p = 0;
          let holding = false;
          let downAt = 0;
          let lastNote = 0;
          let sparkT = 0;
          let shownTip = false;
          const down = (e) => {
            if (e.target.closest('button, a')) return;
            e.preventDefault();
            holding = true;
            downAt = performance.now();
            ring.classList.add('active');
            sfx.hiss({ dur: 0.5, vol: 0.05, from: 300, to: 1400 });
          };
          const up = () => {
            if (!holding) return;
            holding = false;
            ring.classList.remove('active');
            if (performance.now() - downAt < 260 && p < 0.5 && !shownTip) {
              shownTip = true;
              holdHint.textContent = 'Länger halten – sie braucht einen Moment';
            }
          };
          const noMenu = (e) => e.preventDefault();
          const sc = scene;
          sc.addEventListener('pointerdown', down);
          window.addEventListener('pointerup', up);
          window.addEventListener('pointercancel', up);
          sc.addEventListener('contextmenu', noMenu);
          const off = () => {
            sc.removeEventListener('pointerdown', down);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', up);
            sc.removeEventListener('contextmenu', noMenu);
          };
          ctx.onCleanup(off);
          let prev = performance.now();
          stopLoop = fx.loop(() => {
            const now = performance.now();
            const dt = Math.min(0.25, (now - prev) / 1000);
            prev = now;
            if (f.dead) {
              off();
              stopLoop?.();
              stopLoop = null;
              reject(ABORT);
              return;
            }
            if (holding) p = Math.min(1, p + dt / 1.4);
            else p = Math.max(0, p - dt / 3.2);
            ringFg.style.strokeDashoffset = String(100 - p * 100);
            glow.style.opacity = String(0.08 + p * 0.85);
            glow.style.transform = `translate(-50%, -50%) scale(${0.55 + p * 0.6})`;
            flame.style.opacity = String(Math.max(0, (p - 0.45) / 0.55));
            if (holding) {
              const step = Math.floor(p * 8);
              if (step > lastNote) {
                lastNote = step;
                ctx.tone(330 * Math.pow(2, step / 7), { dur: 0.35, vol: 0.05, type: 'sine' });
                haptic(8);
              }
              sparkT -= dt;
              if (sparkT <= 0) {
                sparkT = 0.12;
                const pt = camB.toScreen(BERG_LANTERN.x, BERG_LANTERN.y);
                const r = root.getBoundingClientRect();
                fx.burst(r.left + pt.x + fx.rand(-26, 26), r.top + pt.y + fx.rand(-10, 30), { count: 2 + Math.round(p * 3), power: 90, gravity: -60, life: 0.9, size: 3.5, up: 0.6 });
              }
            } else if (p < 0.01) {
              lastNote = 0;
            }
            if (p >= 1) {
              off();
              stopLoop?.();
              stopLoop = null;
              glow.style.opacity = '1';
              flame.style.opacity = '1';
              resolve();
            }
          });
        });
      }

      async function meetGlimmling() {
        const g = glimmBox('d01-glimm');
        const inner = h('div', { class: 'd01-glimm-in' }, ctx.glimmling({ size: 170, mood: 'sleepy' }));
        g.append(inner);
        latWrap.append(g);
        await f.wait(40);
        g.classList.add('out');
        sfx.play('sparkle');
        // Funkenspur hinter dem Glimmling
        for (let i = 0; i < 7; i++) {
          await f.wait(260);
          const b = inner.getBoundingClientRect();
          fx.burst(b.left + b.width / 2, b.top + b.height * 0.6, { count: 4, power: 70, gravity: 40, life: 0.9, size: 3.5 });
        }
        await f.wait(900);
        // gähnt, wacht auf
        inner.replaceChildren(ctx.glimmling({ size: 170, mood: 'wow' }));
        g.classList.add('awake');
        sfx.play('pop');
        await f.wait(700);
        inner.replaceChildren(ctx.glimmling({ size: 170, mood: 'happy' }));

        for (const line of TALK) {
          say(line.who, line.text);
          if (line.who === 'glimm') {
            g.classList.remove('bob');
            // eslint-disable-next-line no-unused-expressions
            g.offsetWidth;
            g.classList.add('bob');
          }
          await f.wait(550);
          hint.classList.add('show');
          await f.tap();
          hint.classList.remove('show');
        }
        clearTalk();
        await finale(false);
      }

      async function finale(direct) {
        ctx.setHeader('dark');
        if (direct) {
          // Abkürzung: direkt zum Schlussbild
          latWrap.classList.add('show', 'instant');
          camL.set(V.latWide, 0);
          const g = glimmBox('d01-glimm out awake');
          g.append(h('div', { class: 'd01-glimm-in' }, ctx.glimmling({ size: 170, mood: 'happy' })));
          g.style.transition = 'none';
          latWrap.append(g);
        }
        hint.classList.remove('show');
        skipBtn?.remove();
        shade.classList.add('dim');
        await f.wait(direct ? 200 : 500);
        sfx.play('page');

        const card = h('div', { class: 'card d01-card' },
          h('div', { class: 'd01-card-top' }, lanternIcon(), h('span', {}, 'Eine Karte von Basti')),
          h('p', { class: 'hand d01-hello' }, CARD.hello),
          ...CARD.lines.map((t) => h('p', { class: 'hand d01-cline' }, t)),
          h('p', { class: 'hand d01-sign' }, CARD.sign));
        const actions = h('div', { class: 'd01-actions' },
          button('Zurück zum Berg', () => ctx.close()),
          button('Noch einmal von vorn', () => start(), { variant: 'ghost small' }));
        const wrap = h('div', { class: 'stage-scroll d01-cardwrap' }, h('div', { class: 'd01-cardcol' }, card, actions));
        scene.append(wrap);
        requestAnimationFrame(() => wrap.classList.add('in'));
        if (!direct) ctx.complete();
      }

      function glimmBox(cls) {
        const g = h('div', { class: cls, style: { left: LAT_FLAME.x + 'px', top: LAT_FLAME.y + 'px' } });
        g.style.setProperty('--dx', `${GLIMM_TARGET.x - LAT_FLAME.x}px`);
        g.style.setProperty('--dy', `${GLIMM_TARGET.y - LAT_FLAME.y}px`);
        return g;
      }

      function lanternIcon() {
        return ctx.ui.html('<svg class="d01-licon" viewBox="0 0 48 66" width="22" height="30" aria-hidden="true"><path d="M8.5 22 L24 9.5 L39.5 22 Z" fill="#5b5068"/><rect x="12.5" y="22" width="23" height="27" rx="3.5" fill="#ffd98a"/><path d="M24 44c-6-3.5-4.6-9.6 0-15 4.6 5.4 6 11.5 0 15z" fill="#ff9d3c"/><rect x="9" y="48.5" width="30" height="6" rx="2.5" fill="#5b5068"/></svg>');
      }
    }

    start();

    return () => {
      teardown();
      window.removeEventListener('resize', onResize);
    };
  },
};
