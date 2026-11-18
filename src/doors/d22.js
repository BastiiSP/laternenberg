// Türchen 22 · Das Sternbild
// Fünf Sterne in M-Form: x, y sind Anteile der Sternbild-Fläche (0..1), die das Layout unter der
// Kopfzeile und über dem Textfeld einpasst. Reihenfolge der Linien ist egal.
import './d22.css';

export const STARS = [
  { x: 0, y: 1, name: 'Das erste Treffen' },
  { x: .25, y: 0, name: 'Der Harz' },
  { x: .5, y: .62, name: 'Die ersten Dates' },
  { x: .75, y: 0, name: 'Die Schweiz' },
  { x: 1, y: 1, name: 'Heute' },
];
export const EDGES = ['0-1', '1-2', '2-3', '3-4'];
export const edgeKey = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;

const NOTES = [523.25, 659.25, 783.99, 880, 1046.5];
const INTRO_LABEL = 'Berühr einen Stern und zieh eine Linie zum nächsten. Oder tipp zwei Sterne nacheinander an.';
const INTRO_HINT = 'Sternbilder nehmen es mit der Reihenfolge nicht so genau.';

export default {
  mount(root, ctx) {
    const { h, button } = ctx.ui;
    const reduced = ctx.reducedMotion;
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };

    // ---------- Aufbau ----------
    const stage = h('div', { class: 'd22-stage no-select' });
    const sky = h('div', { class: 'd22-sky' });
    const canvas = h('canvas', { class: 'd22-canvas', 'aria-hidden': 'true' });
    const labelLayer = h('div', { class: 'd22-labels' });
    const lbls = STARS.map((s, i) => {
      const inner = h('span', { class: 'd22-lbl-in' }, h('b', {}, s.name));
      // BASTI-STIMME
      if (i === 3) inner.append(h('small', {}, 'Hier sind wir ein Paar geworden.'));
      return h('div', { class: `d22-lbl d22-lbl-${i === 0 ? 'l' : i === 4 ? 'r' : 'c'} ${i === 1 || i === 3 ? 'up' : 'down'}` }, inner);
    });
    labelLayer.append(...lbls);
    // Tastatur und Screenreader: unsichtbare Knöpfe (Zeigerbedienung läuft über die Fläche)
    const keys = STARS.map((s, i) => {
      const b = h('button', { type: 'button', class: 'd22-key', 'aria-label': s.name });
      b.addEventListener('click', () => { if (!pointerActive) connect(i, false); });
      return b;
    });
    const probe = h('i', { class: 'd22-probe' });
    sky.append(canvas, labelLayer, ...keys, probe);
    const info = h('div', { class: 'panel d22-info' });
    stage.append(sky, info);
    root.append(stage);

    // ---------- Zustand ----------
    let W = 1, H = 1, g = null, k = 1;
    let pos = STARS.map(() => ({ x: 0, y: 0 }));
    let region = { x: 0, y: 0, w: 1, h: 1 };
    let links = new Map();      // Kante -> Startzeit
    let visited = new Set();
    let warm = STARS.map(() => 0);
    let selected = null;
    let pointerActive = false;
    let pointer = null;
    let done = false;
    let doneAt = 0;
    let hintEdge = null;
    let hintUntil = 0;
    let hintTimer = 0;
    let lastWrong = 0;
    let now = 0;
    const tiny = Array.from({ length: 150 }, (_, i) => ({ x: ((i * 73.137) % 100) / 100, y: ((i * 37.319 + 19) % 100) / 100, p: i * 1.73, r: .45 + (i % 5) * .24, big: i % 17 === 0 }));
    const sparkles = Array.from({ length: 26 }, (_, i) => ({ x: ((i * 39.17 + 12) % 100) / 100, y: ((i * 61.3 + 7) % 100) / 100, p: i * 2.7 }));
    let shoot = null; let nextShoot = 5;
    let bgGrad = null;

    const label = h('p', { class: 'd22-label', role: 'status', 'aria-live': 'polite' }, INTRO_LABEL);
    const hint = h('p', { class: 'd22-hint' }, INTRO_HINT);
    const segs = EDGES.map(() => h('i', {}));
    const progress = h('div', { class: 'd22-progress', role: 'img', 'aria-label': '0 von 4 Linien' }, ...segs);
    function setInfoPlay() {
      info.classList.remove('is-final');
      info.replaceChildren(h('span', { class: 'd22-kicker' }, 'Ein Himmel nur für heute'), label, hint, progress);
    }
    setInfoPlay();

    // ---------- Layout ----------
    function layout() {
      const r = sky.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      k = ctx.fx.dpr();
      canvas.width = Math.round(W * k); canvas.height = Math.round(H * k);
      g = canvas.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0);
      const headH = probe.offsetHeight || 58;
      const infoH = H < 780 ? 284 : 262;
      const marginX = Math.max(34, W * .09);
      const availTop = headH + 64, availBottom = H - infoH - 8;
      const rw = W - marginX * 2;
      const rh = Math.min(availBottom - availTop - 34, rw * 1.02);
      const top = availTop + 36 + Math.max(0, (availBottom - availTop - 34 - rh) / 2);
      region = { x: marginX, y: top, w: rw, h: rh };
      pos = STARS.map((s) => ({ x: region.x + s.x * rw, y: region.y + s.y * rh }));
      lbls.forEach((l, i) => { l.style.left = `${pos[i].x}px`; l.style.top = `${pos[i].y}px`; });
      keys.forEach((b, i) => { b.style.left = `${pos[i].x}px`; b.style.top = `${pos[i].y}px`; });
      bgGrad = g.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#050918'); bgGrad.addColorStop(.45, '#0b1534'); bgGrad.addColorStop(.8, '#16224a'); bgGrad.addColorStop(1, '#222b57');
    }

    // ---------- Malen ----------
    function aurora(t, boost) {
      const bands = [
        { y: .2, a: .1, hue: ['rgba(60,200,170,', 'rgba(90,150,220,'], f: 1.3, s: .12, amp: .035 },
        { y: .3, a: .08, hue: ['rgba(120,110,220,', 'rgba(60,180,190,'], f: 1.9, s: -.09, amp: .03 },
        { y: .14, a: .07, hue: ['rgba(80,220,150,', 'rgba(110,130,230,'], f: 2.4, s: .07, amp: .025 },
      ];
      for (const b of bands) {
        const a = b.a * (1 + boost * 1.1);
        const grad = g.createLinearGradient(0, H * (b.y - .16), 0, H * (b.y + .26));
        grad.addColorStop(0, `${b.hue[0]}0)`); grad.addColorStop(.35, `${b.hue[0]}${a})`); grad.addColorStop(.7, `${b.hue[1]}${a * .6})`); grad.addColorStop(1, `${b.hue[1]}0)`);
        g.fillStyle = grad;
        g.beginPath();
        const step = W / 14;
        const wob = (x) => Math.sin(x / W * Math.PI * b.f + t * b.s * 3) * H * b.amp + Math.sin(x / W * 9 + t * .3) * H * .008;
        for (let x = 0; x <= W + 1; x += step) g[x === 0 ? 'moveTo' : 'lineTo'](x, H * (b.y - .12) + wob(x));
        for (let x = W; x >= -1; x -= step) g.lineTo(x, H * (b.y + .2) + wob(x) * 1.3 + Math.sin(x / W * 5 + t * .2) * H * .02);
        g.closePath(); g.fill();
      }
    }
    function drawGlint(x, y, r, a, warmth) {
      const c = warmth > .5 ? '255,235,185' : '215,230,255';
      g.strokeStyle = `rgba(${c},${a * .75})`; g.lineWidth = 1.1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke();
      g.strokeStyle = `rgba(${c},${a * .35})`;
      const d = r * .55;
      g.beginPath(); g.moveTo(x - d, y - d); g.lineTo(x + d, y + d); g.moveTo(x - d, y + d); g.lineTo(x + d, y - d); g.stroke();
    }
    function edgePoints(key) { const [a, b] = key.split('-').map(Number); return [pos[a], pos[b]]; }
    function paint(t, dt) {
      if (!g) return;
      const tt = reduced ? 0 : t;
      const fin = done ? Math.min(1, (t - doneAt) / 3) : 0;
      g.globalAlpha = 1;
      g.fillStyle = bgGrad; g.fillRect(0, 0, W, H);
      aurora(tt, fin);
      for (const s of tiny) {
        const par = Math.sin(tt * .13 + s.p) * 1.5;
        const tw = .5 + .5 * Math.sin(tt * 1.1 + s.p);
        g.globalAlpha = .2 + .6 * tw;
        g.fillStyle = '#dbe8ff'; g.beginPath(); g.arc(s.x * W + par, s.y * H * .86, s.r, 0, 6.283); g.fill();
        if (s.big) { g.globalAlpha = .15 + .35 * tw; drawGlint(s.x * W + par, s.y * H * .86, 4 + tw * 2, 1, 0); }
      }
      g.globalAlpha = 1;
      // Sternschnuppe, selten
      if (!reduced) {
        if (!shoot && t > nextShoot) { shoot = { x: W * (.15 + Math.random() * .6), y: H * (.06 + Math.random() * .16), t0: t }; nextShoot = t + 9 + Math.random() * 9; }
        if (shoot) {
          const p = (t - shoot.t0) / 1.1;
          if (p > 1) shoot = null;
          else {
            const x = shoot.x + p * W * .28, y = shoot.y + p * H * .1;
            const grad = g.createLinearGradient(x, y, x - W * .1, y - H * .035);
            grad.addColorStop(0, `rgba(255,248,225,${.85 * (1 - p)})`); grad.addColorStop(1, 'rgba(255,248,225,0)');
            g.strokeStyle = grad; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x - W * .1, y - H * .035); g.stroke();
          }
        }
      }
      // Bergsilhouette
      g.fillStyle = '#070b1d';
      g.beginPath(); g.moveTo(0, H);
      g.lineTo(0, H * .86); g.lineTo(W * .12, H * .835); g.lineTo(W * .26, H * .87); g.lineTo(W * .42, H * .81); g.lineTo(W * .55, H * .85); g.lineTo(W * .7, H * .8); g.lineTo(W * .86, H * .855); g.lineTo(W, H * .83); g.lineTo(W, H); g.closePath(); g.fill();
      // Bloom des fertigen Sternbilds
      if (fin > 0) {
        const cx = region.x + region.w / 2, cy = region.y + region.h * .5;
        const R = Math.max(region.w, region.h) * .85;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
        gr.addColorStop(0, `rgba(255,220,150,${.2 * fin})`); gr.addColorStop(1, 'rgba(255,200,120,0)');
        g.fillStyle = gr; g.fillRect(cx - R, cy - R, R * 2, R * 2);
      }
      // Hinweis-Kante
      if (hintEdge && now < hintUntil) {
        const [a, b] = edgePoints(hintEdge);
        g.setLineDash([3, 9]); g.lineCap = 'round';
        g.strokeStyle = `rgba(255,236,190,${.25 + .3 * Math.sin(t * 4)})`; g.lineWidth = 2.4;
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.setLineDash([]);
      }
      // Linien
      for (const [key, t0] of links) {
        const [a, b] = edgePoints(key);
        const p = reduced ? 1 : Math.min(1, (t - t0) / .55);
        const e = 1 - Math.pow(1 - p, 3);
        const x2 = a.x + (b.x - a.x) * e, y2 = a.y + (b.y - a.y) * e;
        const pulse = done ? .8 + .2 * Math.sin(t * 1.6 + b.x * .01) : 1;
        g.lineCap = 'round';
        g.strokeStyle = `rgba(255,214,130,${.14 * pulse * (1 + fin * .8)})`; g.lineWidth = 15;
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(x2, y2); g.stroke();
        g.strokeStyle = `rgba(255,222,150,${.38 * pulse})`; g.lineWidth = 6;
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(x2, y2); g.stroke();
        g.strokeStyle = '#fff3cf'; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(x2, y2); g.stroke();
        if (p < 1) { // Funke an der Spitze
          const sg = g.createRadialGradient(x2, y2, 0, x2, y2, 14);
          sg.addColorStop(0, 'rgba(255,250,230,.95)'); sg.addColorStop(1, 'rgba(255,220,150,0)');
          g.fillStyle = sg; g.beginPath(); g.arc(x2, y2, 14, 0, 6.283); g.fill();
        } else if (done) { // ein Lichtpunkt wandert langsam über jede Linie
          const q = ((t * .12 + (b.x * .003)) % 1);
          const px = a.x + (b.x - a.x) * q, py = a.y + (b.y - a.y) * q;
          const sg = g.createRadialGradient(px, py, 0, px, py, 9);
          sg.addColorStop(0, `rgba(255,252,235,${.9 * fin})`); sg.addColorStop(1, 'rgba(255,230,170,0)');
          g.fillStyle = sg; g.beginPath(); g.arc(px, py, 9, 0, 6.283); g.fill();
        }
      }
      // Gummiband beim Ziehen
      if (pointerActive && selected !== null && pointer && !done) {
        const a = pos[selected];
        g.strokeStyle = 'rgba(255,236,190,.55)'; g.lineWidth = 2; g.lineCap = 'round'; g.setLineDash([2, 7]);
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(pointer.x, pointer.y); g.stroke(); g.setLineDash([]);
        const fg = g.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 24);
        fg.addColorStop(0, 'rgba(255,240,200,.45)'); fg.addColorStop(1, 'rgba(255,220,150,0)');
        g.fillStyle = fg; g.beginPath(); g.arc(pointer.x, pointer.y, 24, 0, 6.283); g.fill();
      }
      // Sterne
      STARS.forEach((s, i) => {
        const target = [...links.keys()].some((key) => key.split('-').map(Number).includes(i)) ? 1 : 0;
        warm[i] += (target - warm[i]) * Math.min(1, dt * 3);
        const w = warm[i];
        const x = pos[i].x, y = pos[i].y;
        const pu = .5 + .5 * Math.sin(tt * 1.7 + i * 1.3);
        const base = i === selected ? 1.25 : 1;
        const R = (30 + pu * 6 + w * 8 + fin * 6) * base;
        const gl = g.createRadialGradient(x, y, 0, x, y, R);
        gl.addColorStop(0, w > .5 ? `rgba(255,236,185,${.8 + .1 * pu})` : `rgba(215,232,255,${.7 + .1 * pu})`);
        gl.addColorStop(.35, w > .5 ? 'rgba(255,208,120,.3)' : 'rgba(170,200,255,.22)');
        gl.addColorStop(1, 'rgba(255,220,150,0)');
        g.fillStyle = gl; g.beginPath(); g.arc(x, y, R, 0, 6.283); g.fill();
        drawGlint(x, y, 15 + pu * 4 + w * 5 + fin * 4, 1, w);
        g.fillStyle = w > .5 ? '#fff6dc' : '#f3f8ff'; g.beginPath(); g.arc(x, y, 5.2 + w * 1.3, 0, 6.283); g.fill();
        if (i === selected && !done) {
          g.strokeStyle = `rgba(255,236,190,${.55 + .35 * Math.sin(t * 5)})`; g.lineWidth = 1.6;
          g.beginPath(); g.arc(x, y, 17 + Math.sin(t * 5) * 2.2, 0, 6.283); g.stroke();
        }
      });
      if (done) for (const s of sparkles) {
        g.globalAlpha = (.1 + .75 * (.5 + .5 * Math.sin(tt * 1.6 + s.p))) * fin;
        g.fillStyle = '#ffe9ad';
        const sx = region.x - 20 + s.x * (region.w + 40), sy = region.y - 40 + s.y * (region.h + 90);
        g.beginPath(); g.arc(sx, sy, 1.3, 0, 6.283); g.fill();
      }
      g.globalAlpha = 1;
    }
    let last = 0;
    const stop = ctx.fx.loop((dt, t) => {
      if (document.hidden) return;
      now = performance.now() / 1000;
      paint(t, dt);
    });

    // ---------- Spiellogik ----------
    function showName(i) {
      visited.add(i);
      lbls[i].classList.add('on');
      const s = STARS[i];
      label.replaceChildren(h('strong', {}, s.name));
      // BASTI-STIMME
      if (i === 3) label.append(h('span', { class: 'd22-sub' }, 'Hier sind wir ein Paar geworden.'));
    }
    function armIdle() {
      clearTimeout(hintTimer);
      if (done) return;
      hintTimer = setTimeout(() => {
        const open = EDGES.filter((e) => !links.has(e));
        if (!open.length) return;
        // bevorzugt eine Kante, die an den gewählten Stern anschließt
        const near = selected !== null ? open.filter((e) => e.split('-').map(Number).includes(selected)) : [];
        hintEdge = (near.length ? near : open)[0];
        hintUntil = performance.now() / 1000 + 7;
        hint.textContent = 'Zwischen zwei Sternen glimmt es leise. Verbinde sie.';
        armIdle();
      }, 14000);
    }
    function fx(i, count = 10) {
      const r = canvas.getBoundingClientRect();
      ctx.fx.burst(r.left + pos[i].x, r.top + pos[i].y, { count, kind: 'star', colors: ['#fff3cf', '#ffd98a', '#ffffff'], power: 70, gravity: -6, life: 1, size: 5 });
    }
    function connect(i, viaDrag) {
      if (done) return;
      if (selected === null) { selected = i; showName(i); ctx.sfx.play('tick'); armIdle(); return; }
      if (selected === i) { return; }
      const key = edgeKey(selected, i);
      if (EDGES.includes(key)) {
        if (!links.has(key)) {
          links.set(key, performance.now() / 1000);
          hintEdge = null; hint.textContent = INTRO_HINT;
          const n = links.size;
          ctx.sfx.bell?.(NOTES[n - 1], { vol: .09, dur: 1.6 });
          ctx.sfx.bell?.(NOTES[n - 1] * 2, { vol: .035, dur: 1, at: .05 });
          ctx.ui.haptic(14);
          fx(selected, 6); fx(i, 12);
          segs[n - 1].classList.add('on');
          progress.setAttribute('aria-label', `${n} von 4 Linien`);
        }
        selected = i; showName(i);
        if (links.size === EDGES.length) { finish(); return; }
        armIdle();
      } else if (viaDrag) {
        const nowMs = performance.now();
        if (nowMs - lastWrong > 2200) {
          lastWrong = nowMs;
          hint.textContent = 'Die beiden liegen nicht nebeneinander. Folge den Linien des M.';
          ctx.sfx.play('tick');
        }
      } else {
        hint.textContent = 'Die beiden liegen nicht nebeneinander. Folge den Linien des M.';
        selected = i; showName(i); ctx.sfx.play('tick'); armIdle();
      }
    }
    function finish() {
      done = true; doneAt = performance.now() / 1000; clearTimeout(hintTimer);
      selected = null; hintEdge = null;
      later(() => { ctx.sfx.play('sparkle'); ctx.complete(); }, 700);
      later(() => ctx.sfx.play('success'), 1300);
      STARS.forEach((_, i) => later(() => fx(i, 14), 500 + i * 380));
      lbls.forEach((l) => l.classList.add('on'));
      later(showFinal, 2400);
    }
    function showFinal() {
      const p = h('p', { class: 'd22-final-text' });
      // BASTI-STIMME
      const sig = h('p', { class: 'd22-sig hand' }, 'Schön, dass es dich gibt.');
      info.classList.add('is-final');
      info.replaceChildren(h('span', { class: 'd22-kicker' }, 'Fünf Sterne · vier Linien'),
        h('h2', { class: 'display' }, 'Sternbild M – wie Melli'),
        p, sig,
        h('div', { class: 'd22-btns' },
          button('Noch einmal zeichnen', restart, { variant: 'ghost small' }),
          button('Zurück zum Berg', () => ctx.close(), { variant: 'small' })));
      ctx.ui.typewriter(p, 'Es leuchtet ganz ohne Reihenfolge. Sternbilder nehmen das nicht so genau.', { speed: 34 }).then(() => sig.classList.add('on'));
    }
    function restart() {
      done = false; links = new Map(); visited = new Set(); selected = null; hintEdge = null;
      warm = STARS.map(() => 0);
      lbls.forEach((l) => l.classList.remove('on'));
      segs.forEach((s) => s.classList.remove('on'));
      progress.setAttribute('aria-label', '0 von 4 Linien');
      label.textContent = INTRO_LABEL; hint.textContent = INTRO_HINT;
      setInfoPlay(); armIdle();
    }

    // ---------- Eingabe ----------
    function hit(e) {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      let best = -1, dist = Infinity;
      pos.forEach((p, i) => { const d = Math.hypot(x - p.x, y - p.y); if (d < dist) { best = i; dist = d; } });
      return { i: dist <= 46 ? best : -1, x, y };
    }
    const down = (e) => {
      if (done) return;
      const { i, x, y } = hit(e);
      pointer = { x, y };
      if (i < 0) { return; }
      e.preventDefault();
      pointerActive = true;
      sky.setPointerCapture?.(e.pointerId);
      connect(i, false);
    };
    const move = (e) => {
      if (!pointerActive || done) return;
      const { i, x, y } = hit(e);
      pointer = { x, y };
      if (i >= 0 && i !== selected) connect(i, true);
    };
    const up = () => { pointerActive = false; pointer = null; };
    sky.addEventListener('pointerdown', down);
    sky.addEventListener('pointermove', move);
    sky.addEventListener('pointerup', up);
    sky.addEventListener('pointercancel', up);
    const ro = new ResizeObserver(layout);
    ro.observe(sky);
    layout(); armIdle();

    return () => {
      stop(); ro.disconnect();
      clearTimeout(hintTimer); timers.forEach(clearTimeout); timers.clear();
      sky.removeEventListener('pointerdown', down); sky.removeEventListener('pointermove', move);
      sky.removeEventListener('pointerup', up); sky.removeEventListener('pointercancel', up);
    };
  },
};
