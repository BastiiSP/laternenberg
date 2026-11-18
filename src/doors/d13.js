// Türchen 13 · Sternschnuppennacht
// Canvas-Himmel über dem Laternenberg. Sternschnuppen ziehen gemächlich vorbei;
// wer eine antippt, fängt einen von sieben Wünschen. Danach: die echten Geminiden.
import './d13.css';

// BASTI-STIMME – die sieben Wünsche
const WISHES = [
  'Ich wünsche dir trockene Finger, ruhige Füße und ein Projekt, das endlich fällt.', // BASTI-STIMME
  'Ich wünsche dir Abende zum Einkuscheln mit Decke, Kerzenlicht und einer Umarmung, die genau so lange dauert, wie du sie brauchst.', // BASTI-STIMME
  'Ich wünsche dir, dass du jeden Tag merkst, wie gern dich jemand hat. Kleiner Tipp: Er hat diesen Berg für dich erstellt.', // BASTI-STIMME
  'Ich wünsche dir ein Bad, das genau so lange warm bleibt, wie du drinbleiben willst.', // BASTI-STIMME
  'Ich wünsche dir Wanderwege mit Aussicht hinter jeder Kurve – und unterwegs immer meine Hand, die deine hält.', // BASTI-STIMME
  'Ich wünsche dir Kerzenlicht, eine Kanne Tee und einen Abend, an dem niemand etwas von dir will.', // BASTI-STIMME
  'Und ich wünsche dir, dass du bald eine echte Sternschnuppe siehst. Mindestens eine. Den Wunsch dazu behältst du für dich.', // BASTI-STIMME
];

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Satz zur Geminiden-Nacht, der zu jedem Öffnungsdatum passt. */
function nightLine(b) {
  const before = b.year < 2026 || (b.year === 2026 && (b.month < 12 || b.day < 13));
  if (before) return 'Merk dir die Nächte um den 14. Dezember: die davor und die danach sind beide gut.';
  if (b.year === 2026 && b.month === 12) {
    if (b.day === 13) return 'Heute Nacht und morgen Nacht lohnt sich der Blick nach oben: Das Maximum liegt am 14. Dezember tagsüber, dazwischen.';
    if (b.day === 14) return 'Heute Nacht lohnt sich der Blick nach oben noch einmal: Das Maximum war heute tagsüber, die Nacht danach ist so gut wie die davor.';
    if (b.day <= 20) return 'Der Höhepunkt ist vorbei, aber bis etwa zum 20. Dezember fliegen noch ein paar Nachzügler.';
  }
  if (b.year === 2026) return 'Für dieses Jahr ist der Strom vorbei. Im nächsten Dezember kommt er wieder, pünktlich zur gleichen Zeit.';
  return 'Im Dezember kommt er wieder, jedes Jahr rund um den 13. und 14.';
}

export default {
  mount(root, ctx) {
    const { h, button, haptic } = ctx.ui;
    const { fx, sfx } = ctx;
    const reduce = ctx.reducedMotion;
    let alive = true;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));

    const canvas = h('canvas', { class: 'd13-sky' });
    const bunnies = h('div', { class: 'd13-bunnies' }, ctx.bunny('lorelai', { size: 46 }), ctx.bunny('logan', { size: 46 }));
    const intro = h('div', { class: 'd13-intro panel' },
      h('p', {}, 'Über dem Laternenberg fallen heute Nacht Sterne. Basti hat in jede Sternschnuppe einen Wunsch für dich gesteckt.'),
      h('p', { class: 'd13-intro-do' }, 'Tippe sie an, bevor sie verglühen.'));
    const wishLabel = h('span', { class: 'd13-wish-label' });
    const wishText = h('p', { class: 'd13-wish-text' });
    const wish = h('div', { class: 'd13-wish' }, wishLabel, wishText, h('span', { class: 'd13-wish-tap' }, 'Tippen zum Einsammeln'));
    const slotEls = WISHES.map(() => h('span', { class: 'd13-slot' }));
    const slots = h('div', { class: 'd13-slots' }, h('span', { class: 'd13-slots-label' }, 'Wünsche'), h('div', { class: 'd13-slot-row' }, slotEls));
    const listBtn = button('Deine Wunschliste', () => showEnd(false), { variant: 'ghost small' });
    listBtn.classList.add('d13-listbtn');
    const echo = h('p', { class: 'd13-echo' });
    const endEl = h('div', { class: 'd13-end' });
    const stage = h('div', { class: 'd13-stage no-select' }, canvas, bunnies, intro, echo, wish, slots, listBtn, endEl);
    root.append(stage);
    ctx.setHeader('dark');

    let mode = 'play'; // play | end | free
    let caught = 0;
    let showing = false;
    let lastCatch = 0;
    let easy = 1; // wird nach langer Pause gemächlicher
    let clock = 0;
    let nextSpawn = 1.1;
    const shots = [];
    const ripples = [];

    if (ctx.isDone) {
      const skip = button('Gleich zur Wunschliste', () => { skip.remove(); finishAll(true); }, { variant: 'ghost small' });
      skip.classList.add('d13-skip');
      intro.append(skip);
    }

    // ---------- Himmel vorbereiten ----------
    let W = 0;
    let H = 0;
    let headH = 60;
    let skyLayer = null;
    let hillLayer = null;
    let twinkles = [];
    let lanterns = [];
    const rnd = mulberry32(1313);

    const ridgeY = (x) => H * 0.86 - Math.sin((x / W) * 2.6 + 0.4) * H * 0.035 - Math.sin((x / W) * 7.1) * H * 0.008;

    function paint() {
      const k = fx.dpr();
      const mk = () => {
        const c = document.createElement('canvas');
        c.width = Math.round(W * k);
        c.height = Math.round(H * k);
        const g = c.getContext('2d');
        g.setTransform(k, 0, 0, k, 0, 0);
        return [c, g];
      };
      const r = mulberry32(7);
      // Himmel
      const [sky, g] = mk();
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#03050f');
      gr.addColorStop(0.38, '#0b1233');
      gr.addColorStop(0.68, '#1c2257');
      gr.addColorStop(0.82, '#3a3470');
      gr.addColorStop(1, '#2a2350');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      // Milchstraße: schräges, weiches Band aus Sternenstaub
      g.save();
      g.translate(W * 0.5, H * 0.34);
      g.rotate(-0.55);
      const band = g.createLinearGradient(0, -H * 0.12, 0, H * 0.12);
      band.addColorStop(0, 'rgba(150,160,255,0)');
      band.addColorStop(0.5, 'rgba(170,165,255,0.10)');
      band.addColorStop(1, 'rgba(150,160,255,0)');
      g.fillStyle = band;
      g.fillRect(-H, -H * 0.12, H * 2, H * 0.24);
      for (let i = 0; i < 900; i++) {
        const x = (r() - 0.5) * H * 1.6;
        const y = (r() + r() + r() - 1.5) * H * 0.07;
        g.globalAlpha = 0.15 + r() * 0.35;
        g.fillStyle = '#dfe4ff';
        g.fillRect(x, y, 0.8, 0.8);
      }
      g.restore();
      g.globalAlpha = 1;
      // ruhige Sterne
      for (let i = 0; i < 260; i++) {
        const x = r() * W;
        const y = r() * H * 0.8;
        const s = r() < 0.9 ? 0.7 + r() * 0.6 : 1.4 + r();
        g.globalAlpha = 0.25 + r() * 0.5;
        g.fillStyle = r() < 0.15 ? '#ffe7c2' : '#e8edff';
        g.beginPath();
        g.arc(x, y, s / 2, 0, 6.283);
        g.fill();
      }
      g.globalAlpha = 1;
      // Horizontleuchten
      const glow = g.createRadialGradient(W * 0.5, H * 0.8, 0, W * 0.5, H * 0.8, W * 0.9);
      glow.addColorStop(0, 'rgba(255,170,120,0.16)');
      glow.addColorStop(1, 'rgba(255,170,120,0)');
      g.fillStyle = glow;
      g.fillRect(0, H * 0.4, W, H * 0.6);
      skyLayer = sky;

      // Berge
      const [hill, m] = mk();
      const range = (base, amp, seed, color) => {
        const rr = mulberry32(seed);
        m.fillStyle = color;
        m.beginPath();
        m.moveTo(0, H);
        let y = base;
        for (let x = 0; x <= W + 12; x += 12) {
          y += (rr() - 0.5) * amp;
          y = Math.max(base - amp * 2.2, Math.min(base + amp, y));
          m.lineTo(x, y);
        }
        m.lineTo(W, H);
        m.closePath();
        m.fill();
      };
      range(H * 0.7, H * 0.03, 11, '#1b1d47');
      // Der Laternenberg mit Gipfelhütte
      const px = W * 0.62;
      const py = H * 0.5;
      m.fillStyle = '#141638';
      m.beginPath();
      m.moveTo(-10, H);
      m.lineTo(-10, H * 0.78);
      m.bezierCurveTo(W * 0.2, H * 0.74, W * 0.42, H * 0.6, px - W * 0.05, py + H * 0.02);
      m.lineTo(px, py);
      m.lineTo(px + W * 0.05, py + H * 0.025);
      m.bezierCurveTo(W * 0.8, H * 0.6, W * 0.92, H * 0.7, W + 10, H * 0.74);
      m.lineTo(W + 10, H);
      m.closePath();
      m.fill();
      // Schneekante am Gipfel
      m.strokeStyle = 'rgba(200,210,255,0.16)';
      m.lineWidth = 1.2;
      m.beginPath();
      m.moveTo(px - W * 0.12, py + H * 0.06);
      m.lineTo(px, py);
      m.lineTo(px + W * 0.1, py + H * 0.055);
      m.stroke();
      // Hütte
      m.fillStyle = '#0f112c';
      m.fillRect(px - 7, py - 9, 14, 10);
      m.beginPath();
      m.moveTo(px - 10, py - 8);
      m.lineTo(px, py - 17);
      m.lineTo(px + 10, py - 8);
      m.fill();
      // Laternen am Zickzackweg
      lanterns = [];
      for (let i = 0; i < 24; i++) {
        const t = i / 23;
        const yy = H * 0.8 - t * (H * 0.8 - py - 4);
        const zig = Math.sin(t * Math.PI * 5) * W * 0.11 * (1 - t * 0.85);
        lanterns.push({ x: W * 0.36 + (px - W * 0.36) * t + zig, y: yy, ph: r() * 6.28 });
      }
      lanterns.push({ x: px + 3, y: py - 4, ph: 0, hut: true });
      // Vordergrund-Kamm
      m.fillStyle = '#080a1e';
      m.beginPath();
      m.moveTo(0, H);
      for (let x = 0; x <= W + 6; x += 6) m.lineTo(x, ridgeY(x));
      m.lineTo(W, H);
      m.closePath();
      m.fill();
      m.strokeStyle = 'rgba(190,200,255,0.12)';
      m.lineWidth = 1;
      m.beginPath();
      for (let x = 0; x <= W + 6; x += 6) (x ? m.lineTo(x, ridgeY(x)) : m.moveTo(x, ridgeY(x)));
      m.stroke();
      hillLayer = hill;

      twinkles = Array.from({ length: 46 }, () => ({ x: rnd() * W, y: rnd() * H * 0.62, s: 1.4 + rnd() * 2.2, ph: rnd() * 6.28, sp: 0.6 + rnd() * 1.8 }));

      // Kaninchen sitzen auf dem Kamm
      const bx = W * 0.14;
      bunnies.style.left = bx + 'px';
      bunnies.style.top = ridgeY(bx + 40) - 41 + 'px';
    }

    function resize() {
      const r = stage.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      headH = parseFloat(getComputedStyle(intro).top) || 60;
      paint();
    }

    // ---------- Sternschnuppen ----------
    function spawn() {
      const fromLeft = rnd() < 0.5;
      const ang = (0.32 + rnd() * 0.32) * (fromLeft ? 1 : -1);
      const speed = Math.max(130, Math.min(200, W * (0.36 + rnd() * 0.12))) * easy * (reduce ? 0.7 : 1);
      const x = fromLeft ? -20 + rnd() * W * 0.45 : W + 20 - rnd() * W * 0.45;
      const y = headH + 118 + rnd() * H * 0.2;
      const dir = fromLeft ? 1 : -1;
      shots.push({
        x, y, vx: Math.cos(ang) * speed * dir, vy: Math.abs(Math.sin(ang)) * speed,
        age: 0, len: 0, maxLen: 110 + rnd() * 50, life: 3.4 + rnd() * 0.8, dead: false, fade: 1,
      });
    }

    function hitTest(px, py) {
      let best = null;
      let bestD = Infinity;
      for (const s of shots) {
        if (s.dead || s.fade < 0.25) continue;
        const dHead = Math.hypot(px - s.x, py - s.y);
        // Abstand zum vorderen Teil des Schweifs
        const sp = Math.hypot(s.vx, s.vy) || 1;
        const ux = s.vx / sp;
        const uy = s.vy / sp;
        const L = s.len * 0.7;
        const t = Math.max(0, Math.min(L, (s.x - px) * ux + (s.y - py) * uy));
        const dTail = Math.hypot(px - (s.x - ux * t), py - (s.y - uy * t));
        const d = Math.min(dHead, dTail + 14);
        if ((dHead < 62 || dTail < 42) && d < bestD) {
          best = s;
          bestD = d;
        }
      }
      return best;
    }

    function onDown(e) {
      if (mode === 'end') return;
      if (e.target.closest('button, .d13-wish, .d13-end')) return;
      const r = stage.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const s = hitTest(x, y);
      if (!s) {
        ripples.push({ x, y, age: 0 });
        return;
      }
      s.dead = true;
      catchShot(s, e.clientX - (x - s.x), e.clientY - (y - s.y));
    }
    stage.addEventListener('pointerdown', onDown);

    function catchShot(s, cx, cy) {
      lastCatch = clock;
      easy = 1;
      haptic(12);
      fx.burst(cx, cy, { count: 18, kind: 'star', colors: ['#fffbe6', '#ffe19a', '#c9d4ff', '#bff7e6'], power: 170, gravity: 40, life: 1.2, size: 8 });
      fx.burst(cx, cy, { count: 14, power: 120, size: 3.5, life: 0.8, gravity: 30 });
      bunnies.classList.remove('cheer');
      void bunnies.offsetWidth;
      bunnies.classList.add('cheer');
      if (mode === 'free') {
        sfx.play('sparkle');
        echo.textContent = WISHES[Math.floor(Math.random() * WISHES.length)];
        echo.classList.remove('on');
        void echo.offsetWidth;
        echo.classList.add('on');
        return;
      }
      if (showing || caught >= WISHES.length) {
        sfx.play('chime');
        return;
      }
      const i = caught;
      const notes = [ctx.NOTES.C5, ctx.NOTES.D5, ctx.NOTES.E5, ctx.NOTES.G5, ctx.NOTES.A5, ctx.NOTES.C6, ctx.NOTES.E6];
      sfx.bell(notes[i], { vol: 0.12, dur: 1.6 });
      sfx.bell(notes[i] * 1.5, { vol: 0.06, dur: 1.2, at: 0.09 });
      sfx.hiss({ dur: 0.5, vol: 0.04, from: 3000, to: 8000 });
      showWish(i, cx, cy);
    }

    let wishTimer = 0;
    function showWish(i, cx, cy) {
      showing = true;
      intro.classList.add('small');
      wishLabel.textContent = `Wunsch ${i + 1} von ${WISHES.length}`;
      wishText.textContent = WISHES[i];
      const r = stage.getBoundingClientRect();
      wish.style.setProperty('--fx', `${cx - r.left - W / 2}px`);
      wish.style.setProperty('--fy', `${cy - r.top - H * 0.42}px`);
      wish.classList.remove('out');
      wish.classList.add('on');
      const read = Math.max(3600, 2200 + WISHES[i].length * 45);
      clearTimeout(wishTimer);
      wishTimer = setTimeout(() => alive && collect(), read);
    }

    function collect() {
      if (!showing) return;
      clearTimeout(wishTimer);
      const i = caught;
      const slot = slotEls[i];
      const sr = slot.getBoundingClientRect();
      const wr = wish.getBoundingClientRect();
      const dx = sr.left + sr.width / 2 - (wr.left + wr.width / 2);
      const dy = sr.top + sr.height / 2 - (wr.top + wr.height / 2);
      wish.style.setProperty('--tx', dx + 'px');
      wish.style.setProperty('--ty', dy + 'px');
      wish.classList.add('out');
      wish.classList.remove('on');
      caught++;
      later(() => {
        slot.classList.add('on');
        sfx.play('tick');
        fx.burstAt(slot, { count: 8, kind: 'star', size: 6, power: 70, gravity: 0, life: 0.6, colors: ['#fff3c4', '#ffd98a'] });
        showing = false;
        nextSpawn = Math.min(nextSpawn, clock + 0.8);
        if (caught >= WISHES.length) later(() => finishAll(false), 1100);
      }, 520);
    }
    wish.addEventListener('click', collect);

    // ---------- Ende: Wunschliste und echter Himmel ----------
    function finishAll(skipped) {
      for (let i = 0; i < WISHES.length; i++) slotEls[i].classList.add('on');
      caught = WISHES.length;
      showing = false;
      wish.classList.remove('on');
      showEnd(true, skipped);
    }

    function buildEnd() {
      const b = ctx.time.berlin();
      endEl.replaceChildren(
        h('div', { class: 'd13-end-inner' },
          h('section', { class: 'd13-card d13-list' },
            h('p', { class: 'd13-kicker' }, 'Gefangen'),
            h('h2', { class: 'display' }, 'Sieben Wünsche für dich'),
            h('ol', {}, WISHES.map((w) => h('li', {}, w)))),
          h('section', { class: 'd13-card d13-real' },
            h('p', { class: 'd13-kicker' }, 'Und jetzt in echt'),
            h('h2', { class: 'display' }, 'Die Geminiden'),
            h('p', {}, 'Jedes Jahr um den 13. und 14. Dezember erreicht der Sternschnuppenstrom der Geminiden seinen Höhepunkt – einer der stärksten des ganzen Jahres.'),
            h('p', { class: 'd13-when' }, nightLine(b)),
            h('ul', { class: 'd13-tips' },
              h('li', {}, 'Am besten spät abends, an einem dunklen Ort, weg von Straßenlaternen.'),
              h('li', {}, 'Warm einpacken, Tee mitnehmen, einfach nach oben schauen.'),
              h('li', {}, 'Gib deinen Augen 15 bis 20 Minuten, sich an die Dunkelheit zu gewöhnen – dann siehst du viel mehr.')),
            h('p', {}, '2026 ist der Mond in diesen Nächten nur eine schmale zunehmende Sichel, die schon am Abend untergeht. Er stört kaum.'),
            h('p', { class: 'd13-cloudy' }, 'Und wenn es bewölkt ist? Dann gilt der Himmel hier.')),
          h('div', { class: 'd13-end-btns' },
            button('Noch ein paar Sternschnuppen', () => freeSky()),
            button('Zurück zum Berg', () => ctx.close(), { variant: 'ghost' }))));
    }

    function showEnd(first, skipped = false) {
      mode = 'end';
      buildEnd();
      endEl.scrollTop = 0;
      stage.classList.add('is-end');
      stage.classList.remove('is-free');
      if (first) {
        if (!skipped) sfx.play('success');
        ctx.complete();
        const items = [...endEl.querySelectorAll('.d13-card, .d13-end-btns')];
        ctx.ui.revealSeq(items, { gap: 380 });
      } else {
        endEl.querySelectorAll('.d13-card, .d13-end-btns').forEach((el) => el.classList.add('reveal', 'in'));
      }
    }

    function freeSky() {
      mode = 'free';
      stage.classList.remove('is-end');
      stage.classList.add('is-free');
      nextSpawn = clock + 0.6;
    }

    // ---------- Zeichnen ----------
    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    const stop = fx.loop((dt, t) => {
      if (document.hidden) return;
      clock += dt;
      const { ctx: g } = fx.fitCanvas(canvas);
      g.drawImage(skyLayer, 0, 0, W, H);

      // funkelnde Sterne
      for (const s of twinkles) {
        const a = 0.35 + 0.65 * Math.max(0, Math.sin(t * s.sp + s.ph)) ** 2;
        g.globalAlpha = a;
        g.fillStyle = '#f3f5ff';
        g.beginPath();
        g.arc(s.x, s.y, s.s * 0.5, 0, 6.283);
        g.fill();
        if (s.s > 3 && a > 0.75) {
          g.globalAlpha = (a - 0.75) * 2;
          g.fillRect(s.x - s.s * 1.6, s.y - 0.4, s.s * 3.2, 0.8);
          g.fillRect(s.x - 0.4, s.y - s.s * 1.6, 0.8, s.s * 3.2);
        }
      }
      g.globalAlpha = 1;

      // Sternschnuppen erzeugen
      const playing = mode === 'free' || (mode === 'play' && caught < WISHES.length && !showing);
      if (playing && clock >= nextSpawn && shots.filter((s) => !s.dead).length < 2) {
        spawn();
        nextSpawn = clock + 1.5 + rnd() * 1.4;
      }
      if (mode === 'play' && clock - lastCatch > 14 && caught < WISHES.length) {
        easy = 0.72;
        intro.classList.add('nudge');
      } else if (easy === 1) {
        intro.classList.remove('nudge');
      }

      // Sternschnuppen zeichnen
      g.globalCompositeOperation = 'lighter';
      for (const s of shots) {
        if (s.dead) continue;
        s.age += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.len = Math.min(s.maxLen, s.len + Math.hypot(s.vx, s.vy) * dt * 0.9);
        const fin = s.age > s.life - 0.6 || s.y > H * 0.64 || s.x < -60 || s.x > W + 60;
        if (fin) s.fade -= dt * 1.6;
        else s.fade = Math.min(1, s.age * 4);
        if (s.fade <= 0) {
          s.dead = true;
          continue;
        }
        const sp = Math.hypot(s.vx, s.vy);
        const tx = s.x - (s.vx / sp) * s.len;
        const ty = s.y - (s.vy / sp) * s.len;
        const a = s.fade;
        const grad = g.createLinearGradient(s.x, s.y, tx, ty);
        grad.addColorStop(0, `rgba(255,248,225,${0.95 * a})`);
        grad.addColorStop(0.25, `rgba(255,210,150,${0.45 * a})`);
        grad.addColorStop(1, 'rgba(160,170,255,0)');
        g.strokeStyle = grad;
        g.lineCap = 'round';
        g.lineWidth = 7;
        g.globalAlpha = 0.22;
        g.beginPath();
        g.moveTo(s.x, s.y);
        g.lineTo(tx, ty);
        g.stroke();
        g.globalAlpha = 1;
        g.lineWidth = 2.2;
        g.stroke();
        const hg = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, 16);
        hg.addColorStop(0, `rgba(255,255,245,${a})`);
        hg.addColorStop(0.3, `rgba(255,226,170,${0.55 * a})`);
        hg.addColorStop(1, 'rgba(255,200,120,0)');
        g.fillStyle = hg;
        g.beginPath();
        g.arc(s.x, s.y, 16, 0, 6.283);
        g.fill();
      }
      for (let i = shots.length - 1; i >= 0; i--) if (shots[i].dead) shots.splice(i, 1);

      // Antipp-Ringe (Rückmeldung bei Fehlgriffen)
      for (const r of ripples) {
        r.age += dt;
        const k = r.age / 0.55;
        g.globalAlpha = Math.max(0, 1 - k) * 0.5;
        g.strokeStyle = '#c9d4ff';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(r.x, r.y, 8 + k * 26, 0, 6.283);
        g.stroke();
      }
      for (let i = ripples.length - 1; i >= 0; i--) if (ripples[i].age > 0.55) ripples.splice(i, 1);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';

      g.drawImage(hillLayer, 0, 0, W, H);
      // Laternen am Berg flackern
      g.globalCompositeOperation = 'lighter';
      for (const l of lanterns) {
        const f = 0.65 + 0.35 * Math.sin(t * 3.1 + l.ph) * Math.sin(t * 1.7 + l.ph * 2);
        const rr = l.hut ? 7 : 4.5;
        const lg = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, rr);
        lg.addColorStop(0, `rgba(255,214,140,${0.95 * f})`);
        lg.addColorStop(1, 'rgba(255,157,60,0)');
        g.fillStyle = lg;
        g.beginPath();
        g.arc(l.x, l.y, rr, 0, 6.283);
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';
    });

    return () => {
      alive = false;
      stop();
      clearTimeout(wishTimer);
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', onResize);
      stage.removeEventListener('pointerdown', onDown);
    };
  },
};
