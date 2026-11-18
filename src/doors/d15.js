// Türchen 15 · Das Brockengespenst
// Erst ein Gerücht aus dem Harz, dann das Experiment: Laterne in den Rücken der Wanderin
// ziehen, Nebel verdichten – bis ihr riesiger Schatten mit Glorie in der Nebelbank steht.
import './d15.css';

// ---------- Szene in Prozent des 2:3-Bildes (1024 × 1536) ----------
const FIG = { x: 50, feet: 79.2, h: 11 }; // Wanderin: Mitte, Fußlinie, Höhe (% der Bildhöhe)
const HEAD_U = 24 / 200; // Kopfmitte im Figurenraster (100 × 200)
const FOG_Y = 40; // Höhe, auf der der Kopf des Schattens in der Nebelbank landet
const BUNNY_POS = [
  { who: 'lorelai', x: 38.5, flip: false },
  { who: 'logan', x: 61.5, flip: true },
];

// Silhouette der Wanderin von hinten (Raster 100 × 200). Der rechte Arm winkt.
const P = {
  pom: 'M44.5 9a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0 -11 0Z',
  head: 'M38 26a12 12 0 1 0 24 0a12 12 0 1 0 -24 0Z',
  hat: 'M37.5 25 Q38 12 50 12 Q62 12 62.5 25 Z',
  body: 'M44 36 L56 36 Q66 37 70 40 Q75 43 75 53 L73 100 Q73 116 71 126 Q50 131 29 126 Q27 116 27 100 L25 53 Q25 43 30 40 Q34 37 44 36 Z',
  pack: 'M35 47 Q50 42 65 47 L65 95 Q50 100 35 95 Z',
  legs: 'M33.5 122 L48 122 L46.8 189 L35.5 189 Z M52 122 L66.5 122 L64.5 189 L53.2 189 Z',
  boots: 'M33 185 L47.5 185 L47.5 196 L30.5 196 Q30.5 189 33 185 Z M52.5 185 L67 185 Q69.5 189 69.5 196 L52.5 196 Z',
  armL: 'M26 44 Q18.5 47 17.5 58 L15.5 104 Q15 112.5 20 112.5 Q24.5 112.5 24.5 105 L27.5 64 Z',
  armR: 'M74 44 Q81.5 47 82.5 58 L84.5 104 Q85 112.5 80 112.5 Q75.5 112.5 75.5 105 L72.5 64 Z',
};
const PIVOT = { x: 75, y: 46 };
const BODY_PATHS = ['pom', 'head', 'hat', 'body', 'legs', 'boots', 'armL'];

const STORY = 'Auf dem Brocken, dem höchsten Berg im Harz, soll ein Gespenst umgehen. Riesengroß, aus Nebel gemacht, mit einem Regenbogen um den Kopf – und es macht angeblich jede Bewegung nach. Heute Nacht liegt auch am Laternenberg eine Nebelbank. Zeit, das Gerücht zu prüfen.';

export default {
  mount(root, ctx) {
    const { h, html, button, typewriter, toast } = ctx.ui;
    const { fx, sfx } = ctx;
    const { clamp, lerp } = fx;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    // ---------- Aufbau ----------
    const stage = h('div', { class: 'd15-stage no-select' });
    const box = h('div', { class: 'd15-box' });
    const bg = h('img', { class: 'd15-bg', src: ctx.img('d15-brocken'), alt: '', draggable: 'false' });
    const canvas = h('canvas', { class: 'd15-canvas', 'aria-hidden': 'true' });

    const figSvg = html(`
<svg class="d15-fig" viewBox="0 0 100 200" aria-label="Wanderin von hinten" role="img">
  <g class="d15-fig-body">
    ${BODY_PATHS.map((k) => `<path d="${P[k]}"/>`).join('')}
    <path class="d15-pack" d="${P.pack}"/>
  </g>
  <g class="d15-arm"><path d="${P.armR}"/></g>
</svg>`);
    const fig = h('div', { class: 'd15-figwrap' }, figSvg);

    const lantern = h('div', { class: 'd15-lantern', role: 'slider', 'aria-label': 'Laterne verschieben' },
      h('div', { class: 'd15-lglow' }),
      h('div', { class: 'd15-lring' }),
      html(`<svg class="d15-lsvg" viewBox="0 0 48 70" aria-hidden="true">
  <path d="M17 9 Q24 0 31 9" fill="none" stroke="#3b3550" stroke-width="3" stroke-linecap="round"/>
  <path d="M10 22 L24 10 L38 22 Z" fill="#2c2840"/>
  <rect x="13" y="22" width="22" height="30" rx="3.5" fill="rgba(255,226,160,.35)" stroke="#2c2840" stroke-width="2.5"/>
  <path class="d15-flame" d="M24 47c-6-3.5-4.6-9.6 0-15 4.6 5.4 6 11.5 0 15z" fill="#ffb347"/>
  <path d="M24 46c-3-2-2.4-5 0-8 2.4 3 3 6 0 8z" fill="#fff6cf"/>
  <rect x="9.5" y="51" width="29" height="6.5" rx="2.5" fill="#2c2840"/>
</svg>`),
      h('span', { class: 'd15-lhint' }, 'Zieh mich'));

    const bunnies = BUNNY_POS.map((b) => {
      const el = h('div', { class: 'd15-bunny' }, ctx.bunny(b.who, { size: 46, flip: b.flip }));
      el.style.left = b.x + '%';
      return el;
    });

    box.append(bg, fig, ...bunnies);
    stage.append(box, canvas, lantern);

    // Oberes Bedienfeld: Rückmeldung, Gespür-Anzeige, Nebelregler
    const msg = h('p', { class: 'd15-msg', 'aria-live': 'polite' }, '');
    const meter = h('div', { class: 'd15-meter', 'aria-hidden': 'true' }, ...[0, 1, 2, 3, 4].map(() => h('i')));
    const fogInput = h('input', { class: 'd15-range', type: 'range', min: '0', max: '100', value: '18', 'aria-label': 'Nebel' });
    const fogRow = h('label', { class: 'd15-fogrow' },
      html('<svg viewBox="0 0 32 20" width="30" height="19" aria-hidden="true"><path d="M8 18h17a6 6 0 0 0 0-12 8 8 0 0 0-15-1A6.5 6.5 0 0 0 8 18z" fill="currentColor"/></svg>'),
      h('span', { class: 'd15-foglabel' }, 'Nebel'),
      fogInput);
    const hintBox = h('div', { class: 'd15-hint' });
    const top = h('div', { class: 'd15-top panel' },
      h('div', { class: 'd15-toprow' }, msg, h('div', { class: 'd15-meterwrap' }, h('span', {}, 'Gespür'), meter)),
      fogRow, hintBox);
    stage.append(top);

    // Einleitung
    const storyP = h('p', { class: 'd15-story' });
    const goBtn = button('Ausprobieren', () => startExperiment(), {});
    goBtn.classList.add('d15-go');
    const intro = h('div', { class: 'd15-intro panel' },
      h('p', { class: 'd15-kicker' }, 'Ein Gerücht aus dem Harz'),
      storyP, goBtn);
    stage.append(intro);
    root.append(stage);

    // ---------- Layout: 2:3-Container füllt die Bühne wie „cover" ----------
    let L = { w: 1, h: 1, left: 0, top: 0, W: 1, H: 1 };
    let cv = null;
    function layout() {
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      let w = W;
      let hh = W * 1.5;
      if (hh < H) {
        hh = H;
        w = H / 1.5;
      }
      const left = clamp(W / 2 - 0.5 * w, W - w, 0);
      const topPx = clamp(H / 2 - 0.5 * hh, H - hh, 0);
      Object.assign(box.style, { width: w + 'px', height: hh + 'px', left: left + 'px', top: topPx + 'px' });
      L = { w, h: hh, left, top: topPx, W, H };
      // Figur
      const fh = (FIG.h / 100) * hh;
      Object.assign(fig.style, { height: fh + 'px', width: fh / 2 + 'px', left: FIG.x + '%', top: FIG.feet - FIG.h + '%' });
      for (const b of bunnies) b.style.top = FIG.feet - 4.6 + '%';
      cv = fx.fitCanvas(canvas);
      startPos();
      if (!dragged) placeLantern(start.x, start.y);
      else placeLantern(lan.x, lan.y);
    }
    // Container-% → Bühnen-Pixel
    const sx = (p) => L.left + (p / 100) * L.w;
    const sy = (p) => L.top + (p / 100) * L.h;
    const headPx = () => ({ x: sx(FIG.x), y: sy(FIG.feet - FIG.h + FIG.h * HEAD_U) });

    // ---------- Laterne ----------
    const start = { x: 0, y: 0 };
    const lan = { x: 0, y: 0 }; // Bühnen-Pixel (Mitte der Flamme)
    let dragged = false;
    let controls = false;
    function startPos() {
      start.x = clamp(sx(25), 40, L.W - 40);
      start.y = clamp(sy(88), 0, L.H - 56);
    }
    function bounds() {
      const tb = top.getBoundingClientRect();
      const sb = stage.getBoundingClientRect();
      return { minY: tb.bottom - sb.top + 34, maxY: L.H - 34, minX: 26, maxX: L.W - 26 };
    }
    function placeLantern(x, y) {
      const b = bounds();
      lan.x = clamp(x, b.minX, b.maxX);
      lan.y = clamp(y, b.minY, b.maxY);
      lantern.style.transform = `translate(${lan.x}px, ${lan.y}px)`;
    }
    let dragId = null;
    let grab = { dx: 0, dy: 0 };
    function onDown(e) {
      if (!controls || dragId !== null) return;
      if (e.target.closest('.d15-top, .d15-intro, .btn')) return;
      dragId = e.pointerId;
      stage.setPointerCapture?.(e.pointerId);
      const r = stage.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const onLantern = Math.hypot(px - lan.x, py - lan.y) < 46;
      // Auf die Laterne getippt: festhalten, wo gegriffen wurde. Sonst springt sie knapp über den Finger.
      grab = onLantern ? { dx: lan.x - px, dy: lan.y - py } : { dx: 0, dy: -38 };
      placeLantern(px + grab.dx, py + grab.dy);
      if (!dragged) {
        dragged = true;
        lantern.classList.add('moved');
      }
      lantern.classList.add('held');
      lastInput = performance.now();
      sfx.play('tick');
    }
    function onMove(e) {
      if (e.pointerId !== dragId) return;
      const r = stage.getBoundingClientRect();
      placeLantern(e.clientX - r.left + grab.dx, e.clientY - r.top + grab.dy);
      lastInput = performance.now();
    }
    function onUp(e) {
      if (e.pointerId !== dragId) return;
      dragId = null;
      lantern.classList.remove('held');
    }
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);

    let fog = 0.18;
    let fogShown = 0.18;
    let lastTick = 0;
    fogInput.addEventListener('input', () => {
      fog = +fogInput.value / 100;
      lastInput = performance.now();
      const step = Math.round(fog * 10);
      if (step !== lastTick) {
        lastTick = step;
        sfx.play('tick');
      }
    });

    // ---------- Sprites (einmal vorgerendert, weich gezeichnet über shadowBlur) ----------
    const SPR = 2.6; // Pixel je Rastereinheit
    const PAD = 40;
    function sprite(draw, { blur = 8, color = 'rgb(44,38,82)', fade = 0.56, end = 0.9 } = {}) {
      const c = document.createElement('canvas');
      c.width = 100 * SPR + PAD * 2;
      c.height = 200 * SPR + PAD * 2;
      const g = c.getContext('2d');
      g.setTransform(SPR, 0, 0, SPR, PAD - 5000, PAD);
      g.shadowOffsetX = 5000;
      g.shadowBlur = blur;
      g.shadowColor = color;
      g.fillStyle = '#000';
      draw(g);
      if (fade < 1) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.shadowColor = 'transparent';
        g.globalCompositeOperation = 'destination-in';
        const gr = g.createLinearGradient(0, PAD + 200 * SPR * fade, 0, PAD + 200 * SPR * end);
        gr.addColorStop(0, 'rgba(0,0,0,1)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, c.width, c.height);
        g.fillStyle = 'rgba(0,0,0,1)';
        g.fillRect(0, 0, c.width, PAD + 200 * SPR * fade);
      }
      return c;
    }
    const drawBody = (g) => BODY_PATHS.forEach((k) => g.fill(new Path2D(P[k])));
    const drawArm = (g) => g.fill(new Path2D(P.armR));
    const drawBunny = (g) => {
      const p = new Path2D();
      p.ellipse(50, 160, 31, 30, 0, 0, Math.PI * 2);
      p.moveTo(68, 122);
      p.ellipse(50, 122, 18, 17, 0, 0, Math.PI * 2);
      p.moveTo(48, 60);
      p.ellipse(40, 62, 8, 52, -0.07, 0, Math.PI * 2);
      p.moveTo(68, 60);
      p.ellipse(60, 62, 8, 52, 0.07, 0, Math.PI * 2);
      g.fill(p);
    };
    const spr = {
      bodySoft: sprite(drawBody, { blur: 28 }),
      bodySharp: sprite(drawBody, { blur: 11 }),
      armSoft: sprite(drawArm, { blur: 28, fade: 1 }),
      armSharp: sprite(drawArm, { blur: 11, fade: 1 }),
      bunny: sprite(drawBunny, { blur: 14, fade: 0.72, end: 0.98 }),
    };
    const puff = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, 'rgba(238,232,255,0.95)');
      gr.addColorStop(0.45, 'rgba(226,220,250,0.55)');
      gr.addColorStop(1, 'rgba(220,214,246,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 256, 256);
      return c;
    })();
    const puffs = Array.from({ length: 15 }, (_, i) => ({
      x: fx.rand(-0.2, 1.2),
      y: fx.rand(0.27, 0.6),
      r: fx.rand(0.22, 0.42),
      v: fx.rand(0.006, 0.018) * (i % 2 ? 1 : -1),
      a: fx.rand(0.5, 1),
    }));

    // ---------- Physik-light: wie gut passen Licht und Nebel? ----------
    const st = { qDir: 0, qDist: 0, qFog: 0, q: 0, high: true, sx: 0, d: 0 };
    function evaluate() {
      const hp = headPx();
      const dy = lan.y - hp.y; // > 0: Laterne liegt tiefer im Bild = hinter / unterhalb der Wanderin
      const fogPx = sy(FOG_Y);
      const d = Math.hypot(lan.x - hp.x, dy) / L.h;
      st.d = d;
      st.high = dy < 0.015 * L.h;
      if (st.high) {
        st.qDir = 0;
        st.sx = hp.x + (hp.x - lan.x) * 2;
      } else {
        st.sx = hp.x + ((hp.x - lan.x) / dy) * (hp.y - fogPx);
        st.qDir = clamp(1 - Math.abs(st.sx - sx(FIG.x)) / (0.45 * L.w));
        st.qDir = st.qDir * st.qDir * (3 - 2 * st.qDir) * 0.25 + st.qDir * 0.75;
      }
      if (d < 0.1) st.qDist = 0.6 + 0.4 * (d / 0.1);
      else if (d <= 0.3) st.qDist = 1;
      else st.qDist = Math.max(0.3, 1 - (d - 0.3) / 0.3);
      st.qFog = clamp((fog - 0.3) / 0.5);
      st.q = st.qDir * st.qDist * st.qFog;
    }

    // ---------- Rückmeldung ----------
    let msgKey = '';
    let msgPending = null;
    let msgTimer = 0;
    const MSG = {
      start: 'Zieh die Laterne – und mach den Nebel dichter.',
      high: 'Das Licht steht zu hoch: Dein Schatten fällt auf die Felsen, nicht in den Nebel.',
      side: 'Dein Schatten huscht seitlich am Nebel vorbei.',
      near: 'Fast! Der Schatten streift die Nebelbank – das Licht muss noch genauer in deinen Rücken.',
      far: 'Die Laterne ist zu weit weg, ihr Licht reicht kaum bis in den Nebel.',
      close: 'So nah blendet die Laterne vor allem dich selbst.',
      thin: 'Da ist etwas … aber der Nebel ist zu dünn, um es festzuhalten.',
      almost: 'Schon fast greifbar. Noch ein bisschen mehr Nebel.',
      good: 'Halt – da regt sich was im Nebel!',
    };
    function pickMsg() {
      if (!dragged && fog < 0.3) return 'start';
      if (st.high) return 'high';
      if (st.qDir < 0.5) return 'side';
      if (st.qDist < 0.75) return st.d < 0.1 ? 'close' : 'far';
      if (st.qDir < 0.86) return 'near';
      if (st.qFog < 0.5) return 'thin';
      if (st.qFog < 1) return 'almost';
      return 'good';
    }
    function updateMsg(now) {
      const k = pickMsg();
      if (k === msgKey) {
        msgPending = null;
        return;
      }
      if (msgPending !== k) {
        msgPending = k;
        msgTimer = now;
      }
      if (now - msgTimer > 380 || !msgKey) {
        msgKey = k;
        msgPending = null;
        msg.textContent = MSG[k];
      }
    }
    let meterLevel = 0;
    function updateMeter() {
      const lvl = Math.round(clamp(st.q * 0.75 + st.qDir * st.qDist * 0.25) * 5);
      if (lvl === meterLevel) return;
      if (lvl > meterLevel) ctx.tone(392 * Math.pow(1.19, lvl), { dur: 0.25, vol: 0.05, type: 'sine' });
      meterLevel = lvl;
      [...meter.children].forEach((d, i) => d.classList.toggle('on', i < lvl));
    }

    // ---------- Hilfe ----------
    let lastInput = performance.now();
    let expStart = 0;
    let hintLevel = 0;
    function showHint(level) {
      if (level <= hintLevel) return;
      hintLevel = level;
      hintBox.replaceChildren();
      if (level >= 1) {
        hintBox.append(h('p', { class: 'd15-hinttext' },
          h('b', {}, 'Bergführer-Tipp: '),
          'Bei echten Brockengespenstern steht die Sonne tief und genau im Rücken der Wandernden – und vor ihnen hängt dichter Nebel.'));
      }
      if (level >= 2) {
        const b = button('Zeig’s mir', () => autoSolve(), { variant: 'small ghost' });
        hintBox.append(b);
      }
      hintBox.classList.add('in');
      sfx.play('chime');
    }
    function autoSolve() {
      const hp = headPx();
      const from = { x: lan.x, y: lan.y, f: fog };
      const to = { x: hp.x, y: Math.min(hp.y + 0.2 * L.h, bounds().maxY), f: 1 };
      dragged = true;
      lantern.classList.add('moved');
      const t0 = performance.now();
      const stopA = fx.loop(() => {
        const k = clamp((performance.now() - t0) / 1600);
        const e = 1 - Math.pow(1 - k, 3);
        placeLantern(lerp(from.x, to.x, e), lerp(from.y, to.y, e));
        fog = lerp(from.f, to.f, e);
        fogInput.value = String(Math.round(fog * 100));
        if (k >= 1) stopA();
      });
      ctx.onCleanup(stopA);
    }

    // ---------- Ablauf ----------
    let phase = 'intro'; // intro | play | found | wave | bunnies | done
    let holdT = 0;
    let wave = 0; // 0..1 Winkphase-Gewicht
    let waveT = 0;
    let ghosts = 0; // Sichtbarkeit der Kaninchen-Schatten
    let wow = 0; // Staunen-Moment (Wabern)

    async function runIntro() {
      ctx.setHeader('dark');
      await fx.wait(450);
      await typewriter(storyP, STORY, { speed: 22 });
      goBtn.classList.add('in');
    }
    function startExperiment() {
      if (phase !== 'intro') return;
      phase = 'play';
      controls = true;
      intro.classList.add('out');
      later(() => intro.remove(), 600);
      top.classList.add('in');
      lantern.classList.add('ready');
      expStart = performance.now();
      lastInput = expStart;
      msgKey = 'start';
      msg.textContent = MSG.start;
    }

    let foundAt = 0;
    function found() {
      phase = 'found';
      foundAt = performance.now();
      controls = false;
      lantern.classList.remove('held');
      dragId = null;
      top.classList.add('solved');
      fogRow.classList.add('d15-gone');
      hintBox.classList.remove('in');
      meter.parentElement.classList.add('d15-gone');
      msg.replaceChildren(h('b', {}, '✦ Da ist es: dein Brockengespenst. '), 'Tipp es an – vielleicht ist es ja freundlich.');
      sfx.play('sparkle');
      ctx.sfx.hiss({ dur: 2.4, vol: 0.05, from: 300, to: 1200, q: 0.4 });
      [ctx.NOTES.C5, ctx.NOTES.G5, ctx.NOTES.E6].forEach((f, i) => ctx.sfx.bell(f, { vol: 0.08, dur: 2.8, at: 0.3 + i * 0.25 }));
      ctx.ui.haptic(30);
      stage.classList.add('found');
      later(() => ctx.complete(), 1200);
    }

    function onSceneTap(e) {
      if (phase !== 'found' || performance.now() - foundAt < 900) return;
      if (e.target.closest('.d15-top, .btn, .d15-card')) return;
      phase = 'wave';
      waveT = 0;
      figSvg.classList.add('waving');
      sfx.play('chime');
      msg.replaceChildren('Es winkt zurück. Natürlich – es macht ja alles nach, was du machst.');
      later(() => {
        figSvg.classList.remove('waving');
        phase = 'bunnies';
        msg.replaceChildren(h('b', {}, 'Moment. '), 'Seit wann hat dein Gespenst Begleitung? Mit … sehr langen Ohren?');
        sfx.play('whoosh');
      }, 3000);
      later(() => {
        bunnies.forEach((b, i) => later(() => {
          b.classList.add('in');
          sfx.play('hop');
        }, i * 380));
      }, 5600);
      later(() => dialog(), 6600);
    }
    stage.addEventListener('click', onSceneTap);

    const LINES = [
      ['lorelai', 'Buh! Wir sind die Gespenster-Gespenster.'],
      ['logan', 'Meine Ohren sehen im Nebel richtig gut aus. Lang. Elegant. Furchteinflößend.'],
      ['lorelai', 'Und der Regenbogen ist eindeutig um MEINEN Kopf.'],
      ['logan', 'Komisch. Bei mir auch.'],
    ];
    async function dialog() {
      for (const [who, text] of LINES) {
        if (!alive) return;
        const bub = h('div', { class: 'bubble d15-bubble' }, h('span', { class: 'who' }, who === 'lorelai' ? 'Lorelai' : 'Logan'), text);
        msg.replaceChildren(bub);
        sfx.play(who === 'lorelai' ? 'squeak' : 'pop');
        await fx.wait(fx.reducedMotion() ? 1800 : 1500 + text.length * 38);
      }
      if (!alive) return;
      msg.replaceChildren('Beide haben recht. Warum, steht auf der Karte.');
      const more = button('Was war das?', () => showCard(), { variant: 'small' });
      more.classList.add('d15-more');
      msg.append(more);
      phase = 'done';
    }

    function showCard() {
      if (stage.querySelector('.d15-card')) return;
      sfx.play('page');
      ctx.complete({ quiet: true });
      const card = h('div', { class: 'd15-cardwrap' },
        h('div', { class: 'card d15-card' },
          h('p', { class: 'd15-cardkick' }, 'Ganz echt'),
          h('h2', { class: 'display' }, 'Das Brockengespenst'),
          h('p', {}, 'Ein optisches Phänomen: Steht die Sonne tief im Rücken, fällt dein eigener Schatten auf Nebel oder Wolken vor dir. Er wirkt oft riesig – im Nebel kann das Auge kaum abschätzen, wie weit weg er ist.'),
          h('p', {}, 'Häufig umgibt seinen Kopf ein farbiger Lichtkranz, die ', h('b', {}, 'Glorie'), '. Sie entsteht an winzigen Wassertröpfchen im Nebel. Und: Jeder sieht die Glorie nur um den eigenen Schatten. Lorelai und Logan haben also beide recht.'),
          h('p', {}, 'Benannt ist das Gespenst nach dem Brocken im Harz. Johann Esaias Silberschlag hat es dort 1780 beschrieben.'),
          // BASTI-STIMME
          h('p', { class: 'hand d15-basti' }, 'Im Harz waren wir ja schon zusammen.'),
          h('div', { class: 'd15-cardbtns' },
            button('Zurück zum Berg', () => ctx.close()),
            button('Nochmal staunen', () => restart(), { variant: 'ghost small' }))));
      stage.append(card);
      requestAnimationFrame(() => card.classList.add('in'));
    }

    function restart() {
      stage.querySelector('.d15-cardwrap')?.remove();
      timers.splice(0).forEach(clearTimeout);
      bunnies.forEach((b) => b.classList.remove('in'));
      stage.classList.remove('found');
      top.classList.remove('solved');
      fogRow.classList.remove('d15-gone');
      meter.parentElement.classList.remove('d15-gone');
      ghosts = 0;
      wow = 0;
      holdT = 0;
      hintLevel = 0;
      hintBox.replaceChildren();
      hintBox.classList.remove('in');
      fog = 0.18;
      fogInput.value = '18';
      placeLantern(start.x, start.y);
      phase = 'play';
      controls = true;
      expStart = performance.now();
      lastInput = expStart;
      msgKey = 'start';
      msg.textContent = MSG.start;
    }

    // ---------- Zeichnen ----------
    let alive = true;
    function draw(dt, t) {
      if (!cv) return;
      const g = cv.ctx;
      const { w: W, h: H } = cv;
      g.clearRect(0, 0, W, H);
      fogShown = lerp(fogShown, fog, Math.min(1, dt * 5));
      const qs = st.q;

      // Nebelbank: Grundschleier + treibende Schwaden
      const fy0 = sy(22);
      const fy1 = sy(66);
      const band = g.createLinearGradient(0, fy0, 0, fy1);
      const ba = 0.12 + fogShown * 0.42;
      band.addColorStop(0, 'rgba(214,206,242,0)');
      band.addColorStop(0.35, `rgba(222,214,248,${ba})`);
      band.addColorStop(0.7, `rgba(214,206,242,${ba * 0.85})`);
      band.addColorStop(1, 'rgba(214,206,242,0)');
      g.fillStyle = band;
      g.fillRect(0, fy0, W, fy1 - fy0);
      for (const p of puffs) {
        if (!ctx.reducedMotion) p.x += p.v * dt;
        if (p.x > 1.35) p.x = -0.35;
        if (p.x < -0.35) p.x = 1.35;
        const r = p.r * L.w;
        g.globalAlpha = p.a * (0.08 + fogShown * 0.5);
        g.drawImage(puff, sx(p.x * 100) - r, sy(p.y * 100) - r * 0.55, r * 2, r * 1.1);
      }
      g.globalAlpha = 1;

      // Lichtkegel von der Laterne Richtung Schatten
      const hp = headPx();
      if (phase === 'play' || phase === 'intro') {
        const dx = hp.x - lan.x;
        const dy = hp.y - lan.y;
        const len = Math.hypot(dx, dy) || 1;
        const reach = L.h * 0.55;
        const ux = dx / len;
        const uy = dy / len;
        const ex = lan.x + ux * reach;
        const ey = lan.y + uy * reach;
        const spread = reach * 0.32;
        const gr = g.createLinearGradient(lan.x, lan.y, ex, ey);
        const ca = 0.16 * st.qDist * (phase === 'intro' ? 0.4 : 1);
        gr.addColorStop(0, `rgba(255,214,150,${ca})`);
        gr.addColorStop(1, 'rgba(255,214,150,0)');
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(lan.x, lan.y);
        g.lineTo(ex - uy * spread, ey + ux * spread);
        g.lineTo(ex + uy * spread, ey - ux * spread);
        g.closePath();
        g.fill();
      }

      // Das Gespenst
      if (phase !== 'play') wow = Math.min(1, wow + dt * 0.8);
      const strength = phase === 'play' || phase === 'intro' ? qs : 1;
      const lightK = st.qDir * st.qDist;
      const alpha = phase === 'play' || phase === 'intro'
        ? clamp(lightK * (0.12 + 0.88 * st.qFog)) * 0.78
        : 0.78;
      if (alpha > 0.01) {
        const wob = ctx.reducedMotion ? 0 : wow * (Math.sin(t * 1.3) * 0.02 + Math.sin(t * 2.1) * 0.01);
        const scale = (0.2 + 0.16 * strength) * (1 + wob);
        const figH = L.h * scale * 1.25;
        const figW = figH / 2;
        const k = figH / (200 * 1); // Pixel je Rastereinheit
        const headX = phase === 'play' || phase === 'intro' ? st.sx : sx(FIG.x);
        const swayX = ctx.reducedMotion ? 0 : wow * Math.sin(t * 0.7) * L.w * 0.006;
        const ox = headX - figW / 2 + swayX; // Ursprung des Figurenrasters
        const oy = sy(FOG_Y) - HEAD_U * figH;

        // Glorie: konzentrische Regenbogenringe um den Kopfschatten
        const gloryA = clamp((strength - 0.45) / 0.45) * alpha;
        if (gloryA > 0.01) {
          const cx = ox + 50 * k;
          const cy = oy + 25 * k;
          const pulse = 1 + (ctx.reducedMotion ? 0 : wow * Math.sin(t * 1.7) * 0.03);
          const R = 13 * k * 4.4 * pulse;
          const gr = g.createRadialGradient(cx, cy, 13 * k * 0.6, cx, cy, R);
          const ring = (o, c, a) => gr.addColorStop(o, `rgba(${c},${a})`);
          ring(0, '255,250,235', 0.55);
          ring(0.18, '255,244,214', 0.45);
          ring(0.26, '190,170,255', 0.18);
          ring(0.33, '120,170,255', 0.34);
          ring(0.4, '120,230,190', 0.34);
          ring(0.47, '255,236,130', 0.4);
          ring(0.54, '255,150,110', 0.36);
          ring(0.6, '220,120,190', 0.16);
          ring(0.67, '140,160,255', 0.2);
          ring(0.74, '130,225,190', 0.22);
          ring(0.81, '255,226,140', 0.22);
          ring(0.88, '255,150,120', 0.16);
          ring(1, '255,150,120', 0);
          g.globalAlpha = gloryA;
          g.globalCompositeOperation = 'screen';
          g.fillStyle = gr;
          g.beginPath();
          g.arc(cx, cy, R, 0, Math.PI * 2);
          g.fill();
          g.globalCompositeOperation = 'source-over';
        }

        // Schatten: weich (schwach) bis klar (stark)
        const sharp = clamp((strength - 0.35) / 0.6);
        const sw = (100 * SPR + PAD * 2) * (k / SPR);
        const sh = (200 * SPR + PAD * 2) * (k / SPR);
        const px = ox - PAD * (k / SPR);
        const py = oy - PAD * (k / SPR);
        g.globalAlpha = alpha * (1 - sharp);
        g.drawImage(spr.bodySoft, px, py, sw, sh);
        g.globalAlpha = alpha * sharp;
        g.drawImage(spr.bodySharp, px, py, sw, sh);
        // Winkender Arm
        let ang = 0;
        if (phase === 'wave') {
          waveT += dt;
          const up = clamp(waveT / 0.45) * clamp((2.8 - waveT) / 0.45);
          ang = -up * (2.35 + Math.sin(waveT * 9) * 0.28);
        }
        g.save();
        g.translate(ox + PIVOT.x * k, oy + PIVOT.y * k);
        g.rotate(ang);
        g.translate(-(ox + PIVOT.x * k), -(oy + PIVOT.y * k));
        g.globalAlpha = alpha * (1 - sharp);
        g.drawImage(spr.armSoft, px, py, sw, sh);
        g.globalAlpha = alpha * sharp;
        g.drawImage(spr.armSharp, px, py, sw, sh);
        g.restore();

        // Zwei kleinere Gespenster mit sehr langen Ohren
        if (phase === 'bunnies' || phase === 'done') ghosts = Math.min(1, ghosts + dt * 0.5);
        if (ghosts > 0) {
          const bk = k * 0.56;
          const bw = sw * 0.56;
          const bh = sh * 0.56;
          [-1, 1].forEach((side, i) => {
            const bob = ctx.reducedMotion ? 0 : Math.sin(t * 2 + i * 1.7) * 3;
            const bx = headX + side * L.w * 0.2 - 50 * bk - PAD * (bk / SPR);
            const byy = sy(FOG_Y + 7.5) - 120 * bk - PAD * (bk / SPR) + bob;
            g.globalAlpha = ghosts * 0.72;
            g.drawImage(spr.bunny, bx, byy, bw, bh);
          });
        }
        g.globalAlpha = 1;
      }
      // Rand-Licht an der Wanderin, je nachdem wie gut das Licht im Rücken steht
      fig.style.setProperty('--rim', (phase === 'play' ? lightK : 1).toFixed(2));
    }

    const stopLoop = fx.loop((dt, t) => {
      if (document.hidden || !alive) return;
      evaluate();
      if (phase === 'play') {
        updateMsg(performance.now());
        updateMeter();
        if (st.q >= 0.85) {
          holdT += dt;
          if (holdT > 0.6) found();
        } else holdT = Math.max(0, holdT - dt * 2);
        const now = performance.now();
        const idle = now - expStart;
        if (idle > (ctx.isDone ? 6000 : 25000)) showHint(1);
        if (idle > (ctx.isDone ? 12000 : 50000)) showHint(2);
      }
      draw(dt, t);
    });

    const onResize = () => layout();
    window.addEventListener('resize', onResize);
    layout();
    // Bild sicher laden, bevor die Rückmeldung startet
    if (!bg.complete) bg.addEventListener('load', () => layout(), { once: true });
    runIntro();

    return () => {
      alive = false;
      stopLoop();
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', onResize);
    };
  },
};
