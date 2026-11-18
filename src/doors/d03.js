// Türchen 3 · Sieben Glimmlinge (Wimmelbild)
// Bild und alle Elemente darauf liegen in EINEM Weltcontainer im Seitenverhältnis 2:3,
// der den Bildschirm wie „cover“ füllt. Alle Positionen sind Prozent der Welt.
import './d03.css';

const ANCHOR = 0.4855; // Anteil der Welt in der Bildschirmmitte: Laterne (19 %) und Hütte (78 %) liegen gleich weit von den Rändern

// x, y: Mittelpunkt in % (Breite bzw. Höhe der Welt). win: Fenster, durch das ein Glimmling lugt.
// rest: Ruheplatz nach dem Fund. start: Punkt, an dem der Glimmling hervorspringt.
const SPOTS = [
  {
    id: 'stumpf', kind: 'peek',
    hit: { x: 42.4, y: 46.3, w: 11 },
    win: { x: 39.7, y: 44.1, w: 5.9, h: 4.4, round: '50% 50% 12% 12% / 62% 62% 12% 12%' },
    g: { w: 84, top: 30 },
    start: { x: 42.6, y: 46.5 }, rest: { x: 47.4, y: 49.6, w: 6.4 },
    say: 'Huch! Ich dachte, ich sehe aus wie ein Pilz.',
    hint: 'Hohle Baumstümpfe sind beliebte Zimmer.',
  },
  {
    id: 'stamm', kind: 'blink',
    hit: { x: 68.6, y: 51.6, w: 14 },
    win: { x: 64.2, y: 48.7, w: 8.8, h: 5.4, round: '50% 50% 35% 35% / 60% 60% 30% 30%' },
    g: { w: 58, top: 26 },
    start: { x: 68.6, y: 52 }, rest: { x: 66.2, y: 56.4, w: 6.4 },
    say: 'Ich habe nur kurz geblinzelt. Und du siehst das!',
    hint: 'Im liegenden Stamm blinzelt manchmal etwas.',
  },
  {
    id: 'laterne', kind: 'lantern',
    hit: { x: 19.4, y: 30.6, w: 17, h: 11 },
    start: { x: 19.4, y: 31 }, rest: { x: 24.6, y: 36.4, w: 6.6 },
    say: 'Das ist meine Laterne. Ich passe nur auf, dass sie warm bleibt.',
    hint: 'Leuchtet die Steinlaterne nicht verdächtig lebendig? Antippen.',
  },
  {
    id: 'eis', kind: 'ice',
    hit: { x: 69.5, y: 73.4, w: 20 },
    win: { x: 60, y: 70.2, w: 19, h: 6.8, round: '50%' },
    g: { w: 30, top: 8 },
    start: { x: 69.5, y: 73.6 }, rest: { x: 72.4, y: 76.4, w: 6.6 },
    say: 'Klopf, klopf! Hier unten ist es frisch, aber die Aussicht ist toll.',
    hint: 'Unter dem Eis schimmert etwas. Klopf mal an.',
  },
  {
    id: 'wurzeln', kind: 'peek',
    hit: { x: 21.6, y: 65.7, w: 14 },
    win: { x: 16.6, y: 63.6, w: 10.2, h: 4.2, round: '50% 50% 8% 8% / 80% 80% 8% 8%' },
    g: { w: 52, top: 34 },
    start: { x: 21.7, y: 66 }, rest: { x: 29.6, y: 70.4, w: 6.6 },
    say: 'Die Wurzeln sind mein Wohnzimmer. Komm rein! Ach nein, zu klein.',
    hint: 'Zwischen den dicken Wurzeln liegt eine kleine Höhle.',
  },
  {
    id: 'tanne', kind: 'fir',
    hit: { x: 63.4, y: 22.2, w: 17, h: 22 },
    start: { x: 63.4, y: 29 }, rest: { x: 59.2, y: 37.4, w: 6.6 },
    say: 'Plumps! Das war nicht geplant. Der Schnee auch nicht.',
    hint: 'Die große Tanne trägt viel Schnee. Tippe mehrmals darauf und schüttle sie.',
  },
  {
    id: 'huette', kind: 'hut',
    hit: { x: 77.7, y: 25.7, w: 9 },
    win: { x: 75.8, y: 24, w: 3.9, h: 3.7, round: '50% 50% 6% 6% / 60% 60% 6% 6%' },
    g: { w: 92, top: 14 },
    start: { x: 77.8, y: 26.2 }, rest: { x: 73.8, y: 33.4, w: 5.2 },
    say: 'Ich wohne hier nur zur Untermiete. Der Rauch riecht nach Tee.',
    hint: 'In der Hütte oben rechts brennt Licht. Wer wohnt dort?',
  },
];

const NOTE_ORDER = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'E6'];

export default {
  mount(root, ctx) {
    const { h, button, haptic } = ctx.ui;
    const { rand, pick, wait } = ctx.fx;
    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
      return t;
    };
    const intervals = [];

    // ---------- Aufbau ----------
    const world = h('div', { class: 'd03-world no-select' });
    const bg = h('img', { class: 'd03-bg', src: ctx.img('d03-lichtung'), alt: '', draggable: 'false' });
    const glow = h('div', { class: 'd03-lantern-glow' });
    const snowCv = h('canvas', { class: 'd03-snowcv' });
    world.append(bg, glow);

    const spotEls = new Map(); // id → { spot, hit, winEl, free }
    for (const s of SPOTS) {
      const rec = { spot: s, found: false };
      if (s.win) {
        const pg = ctx.glimmling({ size: 60, mood: s.kind === 'ice' ? 'sleepy' : 'happy' });
        const inner = h('div', { class: 'd03-pg', style: { left: '50%', top: s.g.top + '%', width: s.g.w + '%' } }, pg);
        rec.winEl = h('div', {
          class: `d03-win d03-k-${s.kind}`,
          style: { left: s.win.x + '%', top: s.win.y + '%', width: s.win.w + '%', height: s.win.h + '%', borderRadius: s.win.round },
        }, inner);
        world.append(rec.winEl);
      }
      rec.free = h('div', { class: 'd03-free', style: `left:${s.rest.x}%;top:${s.rest.y}%;--w:${s.rest.w}` },
        h('div', { class: 'd03-free-in' }, ctx.glimmling({ size: 60, mood: 'happy' })));
      world.append(rec.free);
      const hitStyle = { left: s.hit.x + '%', top: s.hit.y + '%', width: s.hit.w + '%' };
      if (s.hit.h) hitStyle.height = s.hit.h + '%';
      else hitStyle.aspectRatio = '1 / 1';
      rec.hit = h('button', { class: `d03-hit d03-hit-${s.id}`, type: 'button', 'aria-label': 'Verdächtige Stelle', style: hitStyle });
      rec.hit.addEventListener('click', (e) => {
        e.stopPropagation();
        onSpot(rec);
      });
      world.append(rec.hit);
      spotEls.set(s.id, rec);
    }
    world.append(snowCv);

    // Oberfläche
    const counter = h('div', { class: 'd03-counter' }, '0 von 7 gefunden');
    const intro = h('div', { class: 'd03-intro panel' }, 'Sieben Glimmlinge haben sich versteckt. Tippe auf verdächtige Stellen.');
    const top = h('div', { class: 'd03-top' }, counter, intro);
    const say = h('div', { class: 'd03-say' });
    const hintBtn = button('Kleiner Tipp', () => showHint(), { variant: 'small ghost' });
    hintBtn.classList.add('d03-hintbtn');
    const slots = SPOTS.map(() => h('span', { class: 'd03-slot' }, h('i', {}, '✦')));
    const tray = h('div', { class: 'd03-tray' }, ...slots);
    const bottom = h('div', { class: 'd03-bottom' }, say, hintBtn, tray);
    root.append(world, top, bottom);

    // ---------- Weltlayout (cover, 2:3) ----------
    function layout() {
      const W = root.clientWidth || 390;
      const H = root.clientHeight || 844;
      const ww = Math.max(W, (H * 2) / 3);
      const wh = ww * 1.5;
      const left = Math.min(0, Math.max(W - ww, W / 2 - ANCHOR * ww));
      const topPx = (H - wh) / 2;
      world.style.width = ww + 'px';
      world.style.height = wh + 'px';
      world.style.left = left + 'px';
      world.style.top = topPx + 'px';
      world.style.setProperty('--u', ww / 100 + 'px');
    }
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(root);

    // ---------- Zustand ----------
    const found = new Set();
    let finished = false;
    let lastProgress = performance.now();
    let hintTimer = 0;

    function setSay(text) {
      say.textContent = text;
      say.classList.remove('show');
      // eslint-disable-next-line no-unused-expressions
      say.offsetWidth;
      say.classList.add('show');
      clearTimeout(setSay.t);
      setSay.t = setTimeout(() => say.classList.remove('show'), 5200);
    }

    function center(el) {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function spark(xPct, yPct, big = false) {
      const s = h('span', { class: 'd03-spark' + (big ? ' big' : ''), style: { left: xPct + '%', top: yPct + '%' } }, '✦');
      world.append(s);
      later(() => s.remove(), 1100);
    }

    // ---------- Taps ----------
    function onSpot(rec) {
      if (finished || rec.found) return;
      const s = rec.spot;
      if (s.kind === 'fir') return shakeFir(rec);
      if (s.kind === 'lantern') {
        glow.classList.add('flare');
        later(() => glow.classList.remove('flare'), 900);
      }
      if (s.kind === 'ice') ctx.sfx.play('tick');
      find(rec);
    }

    let firTaps = 0;
    function shakeFir(rec) {
      firTaps++;
      haptic(14);
      ctx.sfx.hiss({ dur: 0.45, vol: 0.09, from: 2200, to: 700, q: 0.5 });
      world.classList.remove('jolt');
      // eslint-disable-next-line no-unused-expressions
      world.offsetWidth;
      world.classList.add('jolt');
      dropSnow(firTaps >= 3 ? 46 : 26);
      if (firTaps < 3) {
        setSay(firTaps === 1 ? 'Es rieselt. Da geht noch mehr!' : 'Da raschelt etwas in den Zweigen …');
        ctx.sfx.play('pop');
      } else {
        find(rec);
      }
    }

    // Schneeklumpen aus der Tanne
    let flakes = [];
    let stopSnow = null;
    function dropSnow(n) {
      const { w, h: hh, ctx: c } = ctx.fx.fitCanvas(snowCv);
      const f = SPOTS.find((s) => s.id === 'tanne').hit;
      const rx = ((f.x - f.w * 0.42) / 100) * w;
      const rw = ((f.w * 0.84) / 100) * w;
      const ry = ((f.y - f.h * 0.4) / 100) * hh;
      const rh = ((f.h * 0.8) / 100) * hh;
      for (let i = 0; i < n; i++) {
        flakes.push({ x: rand(rx, rx + rw), y: rand(ry, ry + rh), vx: rand(-14, 14), vy: rand(-10, 30), r: rand(1.6, 4.6), life: rand(1.0, 1.8), max: 1.8 });
      }
      if (stopSnow) return;
      stopSnow = ctx.fx.loop((dt) => {
        c.clearRect(0, 0, w, hh);
        flakes = flakes.filter((p) => p.life > 0);
        for (const p of flakes) {
          p.life -= dt;
          p.vy += 330 * dt;
          p.vx *= 1 - 0.8 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          c.globalAlpha = Math.max(0, Math.min(1, p.life / 0.6));
          c.fillStyle = '#f4f7ff';
          c.beginPath();
          c.arc(p.x, p.y, p.r, 0, 6.283);
          c.fill();
        }
        c.globalAlpha = 1;
        if (!flakes.length) {
          stopSnow();
          stopSnow = null;
          c.clearRect(0, 0, w, hh);
        }
      });
    }

    // Fehltipp: kleines Schneepüffchen
    world.addEventListener('click', (e) => {
      if (finished || e.target !== world && e.target !== bg) return;
      ctx.sfx.play('tick');
      const r = world.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      const dot = h('span', { class: 'd03-miss', style: { left: x + '%', top: y + '%' } });
      world.append(dot);
      later(() => dot.remove(), 700);
      ctx.fx.burst(e.clientX, e.clientY, { count: 5, kind: 'dot', colors: ['#ffffff', '#dfe8ff'], power: 60, gravity: 60, life: 0.5, size: 4 });
    });

    // ---------- Fund ----------
    function find(rec) {
      const s = rec.spot;
      rec.found = true;
      found.add(s.id);
      lastProgress = performance.now();
      hintBtn.classList.remove('show');
      intro.classList.add('gone');
      if (rec.winEl) rec.winEl.classList.add('gone');
      rec.hit.classList.add('gone');

      const n = found.size;
      const note = ctx.NOTES[NOTE_ORDER[n - 1]] || 880;
      ctx.sfx.bell(note, { vol: 0.13, dur: 1.5 });
      ctx.sfx.play('squeak');
      haptic(18);

      // Glimmling springt zum Ruheplatz
      const wr = world.getBoundingClientRect();
      const dx = ((s.start.x - s.rest.x) / 100) * wr.width;
      const dy = ((s.start.y - s.rest.y) / 100) * wr.height;
      const jump = wr.width * 0.07;
      rec.free.classList.add('on');
      rec.free.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0, offset: 0 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - jump}px) scale(1.35)`, opacity: 1, offset: 0.45 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 1 },
      ], { duration: ctx.reducedMotion ? 10 : 900, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'both' });
      later(() => spark(s.rest.x, s.rest.y - 2, true), 800);
      const c = center(rec.hit);
      ctx.fx.burst(c.x, c.y, { count: 22, kind: 'star', power: 200, life: 1.0, size: 8 });

      // Zähler, Ablage, Spruch
      counter.textContent = `${n} von 7 gefunden`;
      counter.classList.remove('pop');
      // eslint-disable-next-line no-unused-expressions
      counter.offsetWidth;
      counter.classList.add('pop');
      const slot = slots[n - 1];
      slot.classList.add('full');
      slot.append(ctx.glimmling({ size: 30, mood: 'happy' }));
      setSay(s.say);

      if (n === SPOTS.length) {
        finished = true;
        clearInterval(hintTimer);
        later(finale, 1500);
      }
    }

    // ---------- Aufblitzen & Hinweise ----------
    function flashOne() {
      if (document.hidden || finished) return;
      const open = SPOTS.filter((s) => !found.has(s.id) && s.win);
      if (!open.length) return;
      const s = pick(open);
      const rec = spotEls.get(s.id);
      rec.winEl.classList.add('flash');
      spark(s.win.x + s.win.w / 2, s.win.y + s.win.h / 2);
      later(() => rec.winEl.classList.remove('flash'), 1000);
    }
    intervals.push(setInterval(flashOne, 5600));
    later(flashOne, 2200);

    // „blinzelnder“ Glimmling im hohlen Stamm: nur ab und zu sichtbar
    const blinkRec = spotEls.get('stamm');
    function blink() {
      if (found.has('stamm') || document.hidden) return;
      blinkRec.winEl.classList.add('on');
      later(() => blinkRec.winEl.classList.remove('on'), 1250);
    }
    intervals.push(setInterval(blink, 6200));
    later(blink, 3800);

    const ringEl = h('div', { class: 'd03-hintring' });
    world.append(ringEl);
    function showHint() {
      const open = SPOTS.filter((s) => !found.has(s.id));
      if (!open.length) return;
      const s = pick(open);
      setSay(s.hint);
      ringEl.style.left = s.hit.x + '%';
      ringEl.style.top = s.hit.y + '%';
      ringEl.classList.remove('show');
      // eslint-disable-next-line no-unused-expressions
      ringEl.offsetWidth;
      ringEl.classList.add('show');
      hintBtn.classList.remove('show');
      lastProgress = performance.now() - 15000; // nächster Tipp nach ca. 25 s
    }
    hintTimer = setInterval(() => {
      if (!finished && !hintBtn.classList.contains('show') && performance.now() - lastProgress > 40000) hintBtn.classList.add('show');
    }, 1000);
    intervals.push(hintTimer);

    // ---------- Finale ----------
    function finale() {
      ctx.complete();
      ctx.sfx.play('fanfare');
      const veil = h('div', { class: 'd03-veil' });
      const dance = h('div', { class: 'd03-dance' });
      SPOTS.forEach((_, i) => {
        dance.append(h('div', { class: 'd03-dancer', style: `--a:${(i * 360) / SPOTS.length}deg;--i:${i}` },
          h('div', { class: 'd03-dancer-in' }, ctx.glimmling({ size: 52, mood: 'happy' }))));
      });
      const core = h('div', { class: 'd03-core' });
      const lines = [
        'Glimmlinge wohnen in Laternen und wachen auf, sobald eine brennt.',
        'Sie mögen Kerzenschein, Teedampf und leise Musik.',
        'Sie mögen keine Zugluft, keine Eile und keine kalten Laternen.',
      ];
      const card = h('div', { class: 'd03-card card' },
        h('h2', { class: 'display' }, 'Alle sieben!'),
        h('p', { class: 'd03-card-sub' }, 'Kleine Glimmling-Kunde'),
        h('ul', {}, ...lines.map((t) => h('li', {}, t))),
        button('Zurück zum Berg', () => ctx.close()));
      root.append(veil, core, dance, card);
      requestAnimationFrame(() => veil.classList.add('in'));
      later(() => card.classList.add('in'), 2600);
      let k = 0;
      intervals.push(setInterval(() => {
        if (document.hidden) return;
        const r = dance.getBoundingClientRect();
        ctx.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 10, kind: k++ % 2 ? 'star' : 'spark', power: 150, life: 1.2, size: 6 });
        const nt = ctx.NOTES[pick(['C5', 'E5', 'G5', 'C6', 'E6'])];
        ctx.sfx.bell(nt, { vol: 0.07, dur: 1.1 });
      }, 1100));
    }

    return () => {
      for (const t of timers) clearTimeout(t);
      intervals.forEach(clearInterval);
      clearTimeout(setSay.t);
      stopSnow?.();
      ro.disconnect();
    };
  },
};
