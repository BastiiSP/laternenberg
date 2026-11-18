// Türchen 12 · Das Puzzle vom Grat
// Echtes Puzzle mit 24 ineinandergreifenden Teilen (4 × 6). Teile liegen in einer
// Ablage unter dem Bild, werden aufs Feld gezogen und rasten großzügig ein.
import './d12.css';

const COLS = 4;
const ROWS = 6;
const N = COLS * ROWS;
const PAD = 0.32; // Rand für Nasen, in Zellenbreiten
const SEED = 20261212;
const TRAY_CELL = 54; // Zellengröße eines Teils in der Ablage (CSS-Pixel)
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1567.98];

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Umrisse aller Teile als Listen kubischer Bézier-Segmente in Zellkoordinaten. */
function makeShapes() {
  const rnd = mulberry32(SEED);
  const jit = (j) => (rnd() * 2 - 1) * j;
  const tab = (x0, y0, x1, y1) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const flip = rnd() < 0.5 ? 1 : -1;
    const nx = -dy * flip;
    const ny = dx * flip;
    const t = 0.095 + rnd() * 0.02;
    const b = jit(0.04);
    const c = jit(0.03);
    const d = jit(0.03);
    const P = (u, v) => [x0 + dx * u + nx * v, y0 + dy * u + ny * v];
    const p = [
      P(0, 0), P(0.2, 0), P(0.5 + b + d, -t + c), P(0.5 - t + b, t + c),
      P(0.5 - 2 * t + b - d, 3 * t + c), P(0.5 + 2 * t + b - d, 3 * t + c), P(0.5 + t + b, t + c),
      P(0.5 + b + d, -t + c), P(0.8, 0), P(1, 0),
    ];
    return [[p[0], p[1], p[2], p[3]], [p[3], p[4], p[5], p[6]], [p[6], p[7], p[8], p[9]]];
  };
  const line = (x0, y0, x1, y1) => [[[x0, y0], [x0, y0], [x1, y1], [x1, y1]]];
  const H = [];
  for (let r = 0; r <= ROWS; r++) {
    H[r] = [];
    for (let c = 0; c < COLS; c++) H[r][c] = r === 0 || r === ROWS ? line(c, r, c + 1, r) : tab(c, r, c + 1, r);
  }
  const V = [];
  for (let c = 0; c <= COLS; c++) {
    V[c] = [];
    for (let r = 0; r < ROWS; r++) V[c][r] = c === 0 || c === COLS ? line(c, r, c, r + 1) : tab(c, r, c, r + 1);
  }
  const rev = (segs) => segs.slice().reverse().map((s) => [s[3], s[2], s[1], s[0]]);
  const shapes = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) shapes.push([...H[r][c], ...V[c + 1][r], ...rev(H[r + 1][c]), ...rev(V[c][r])]);
  }
  return shapes;
}

function shapePath(segs, ox, oy, cell) {
  const p = new Path2D();
  const X = (pt) => (pt[0] - ox) * cell;
  const Y = (pt) => (pt[1] - oy) * cell;
  p.moveTo(X(segs[0][0]), Y(segs[0][0]));
  for (const s of segs) p.bezierCurveTo(X(s[1]), Y(s[1]), X(s[2]), Y(s[2]), X(s[3]), Y(s[3]));
  p.closePath();
  return p;
}

function shuffled(ids, seed) {
  const rnd = mulberry32(seed);
  const a = ids.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fallbackImage() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1536;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 1536);
  gr.addColorStop(0, '#16214a');
  gr.addColorStop(0.5, '#3b3f7a');
  gr.addColorStop(1, '#eef3ff');
  g.fillStyle = gr;
  g.fillRect(0, 0, 1024, 1536);
  return c;
}

export default {
  async mount(root, ctx) {
    const { h, button, haptic } = ctx.ui;
    const { fx, sfx } = ctx;
    let alive = true;
    let local = []; // Aufräumen des aktuellen Aufbaus
    const teardown = () => {
      for (const fn of local.splice(0)) {
        try { fn(); } catch { /* egal */ }
      }
    };
    const later = (fn, ms) => {
      const id = setTimeout(() => alive && fn(), ms);
      local.push(() => clearTimeout(id));
    };

    const stage = h('div', { class: 'd12-stage no-select' });
    root.append(stage);

    const globals = [];
    const on = (target, type, fn, opts) => {
      target.addEventListener(type, fn, opts);
      globals.push(() => target.removeEventListener(type, fn, opts));
    };
    ctx.onCleanup(() => {
      alive = false;
      teardown();
      globals.forEach((fn) => fn());
    });

    const source = (await ctx.ui.preload(ctx.img('d12-puzzle'))) || fallbackImage();
    if (!alive) return undefined;
    const shapes = makeShapes();

    const readPlaced = () => {
      const arr = ctx.store.get('placed', []);
      return new Set(Array.isArray(arr) ? arr.filter((n) => Number.isInteger(n) && n >= 0 && n < N) : []);
    };

    let S = null; // Zustand des aktuellen Aufbaus

    function build() {
      teardown();
      stage.replaceChildren();
      stage.classList.remove('is-solving', 'is-solved');
      const placed = readPlaced();
      const solved = placed.size === N || ctx.store.get('solved', false) === true;

      const ghost = h('img', { class: 'd12-ghost', src: ctx.img('d12-puzzle'), alt: '', draggable: 'false' });
      const full = h('img', { class: 'd12-full', src: ctx.img('d12-puzzle'), alt: 'Gemaltes Bild: zwei Wanderer mit Rucksäcken auf einem verschneiten Grat, Polarlicht, Vollmond, ein See im Tal, zwei Kaninchen und eine Laterne', draggable: 'false' });
      const bed = h('canvas', { class: 'd12-bed' });
      const placedLayer = h('div', { class: 'd12-layer' });
      const awake = h('div', { class: 'd12-awake' },
        h('div', { class: 'd12-aurora' }, h('i'), h('i')),
        h('div', { class: 'd12-glow d12-glow-moon' }),
        h('div', { class: 'd12-glow d12-glow-lake' }),
        h('div', { class: 'd12-glow d12-glow-hut' }),
        h('div', { class: 'd12-glow d12-glow-lantern' }));
      const twinkle = h('canvas', { class: 'd12-twinkle' });
      const hint = h('div', { class: 'd12-hint' }, h('span', { class: 'd12-hint-arrow' }, '↑'), 'Zieh die Teile nach oben aufs Bild');
      const board = h('div', { class: 'd12-board' }, bed, placedLayer, ghost, full, awake, twinkle, hint);
      const top = h('div', { class: 'd12-top' }, board);

      const tray = h('div', { class: 'd12-tray' });
      const count = h('span', { class: 'chip d12-count' }, '');
      const previewBtn = button('Vorschau', () => togglePreview(), { variant: 'ghost small' });
      const helpBtn = button('Ein Teil für mich legen', () => helpPlace(), { variant: 'ghost small' });
      helpBtn.classList.add('d12-help');
      const controls = h('div', { class: 'd12-controls' }, count, previewBtn, helpBtn);
      const dock = h('div', { class: 'd12-dock' }, tray, controls);

      // BASTI-STIMME
      const caption = h('p', { class: 'hand d12-caption' }, 'In der Schweiz sind wir ein Paar geworden. Gemalt sieht das ungefähr so aus.');
      const again = button('Nochmal puzzeln', () => restart(), { variant: 'ghost small' });
      const end = h('div', { class: 'd12-end' }, caption, h('div', { class: 'd12-end-row' }, again));
      const bottom = h('div', { class: 'd12-bottom' }, dock, end);

      const dragLayer = h('div', { class: 'd12-drag' });
      stage.append(top, bottom, dragLayer);

      const pieces = [];
      for (let id = 0; id < N; id++) {
        const canvas = h('canvas', { class: 'd12-cv' });
        const wrap = h('div', { class: 'd12-pc' }, canvas);
        pieces.push({ id, c: id % COLS, r: Math.floor(id / COLS), canvas, wrap, slot: null, placed: placed.has(id) });
      }

      S = { placed, pieces, board, bed, placedLayer, tray, dock, end, ghost, full, awake, twinkle, hint, count, dragLayer, cell: 0, bx: 0, by: 0, solved, busy: false, drag: null, pending: null, previewTimer: 0, previewBtn, helpBtn };

      // Ablage in fester, gemischter Reihenfolge
      for (const id of shuffled(pieces.map((p) => p.id), SEED + 1)) {
        const p = pieces[id];
        if (p.placed) continue;
        const slot = h('div', { class: 'd12-slot', 'data-id': id });
        slot.piece = p;
        p.slot = slot;
        slot.append(p.wrap);
        tray.append(slot);
        slot.addEventListener('pointerdown', (e) => onSlotDown(e, slot));
      }
      for (const p of pieces) if (p.placed) placedLayer.append(p.wrap);

      layout(true);
      updateCount();
      if (solved) {
        ctx.complete({ quiet: true }); // gelöst gespeichert, aber noch nicht als erlebt markiert
        stage.classList.add('is-solved');
        full.classList.add('on');
        startAwake(false);
      } else if (placed.size === 0) {
        hint.classList.add('on');
      }
    }

    // ---------- Maße und Darstellung ----------
    function pieceSize() {
      return S.cell * (1 + 2 * PAD);
    }

    function layout(force = false) {
      if (!S) return;
      const top = S.board.parentElement;
      const w = top.clientWidth;
      const hh = top.clientHeight;
      const cell = Math.max(20, Math.floor(Math.min(w / COLS, hh / ROWS)));
      const bw = cell * COLS;
      const bh = cell * ROWS;
      Object.assign(S.board.style, { width: bw + 'px', height: bh + 'px', left: Math.round((w - bw) / 2) + 'px', top: Math.round(Math.max(0, (hh - bh) / 2)) + 'px' });
      if (!force && cell === S.cell) return;
      S.cell = cell;
      S.tScale = TRAY_CELL / cell;
      S.slotW = Math.round(TRAY_CELL * 1.34);
      S.tray.style.setProperty('--slot-w', S.slotW + 'px');
      renderBed();
      const size = pieceSize();
      for (const p of S.pieces) {
        renderPiece(p);
        p.wrap.style.width = size + 'px';
        p.wrap.style.height = size + 'px';
        if (p.placed) placeWrap(p);
        else if (p.slot && p.wrap.parentElement === p.slot) slotWrap(p);
      }
    }

    function renderBed() {
      const { cell, bed } = S;
      const k = fx.dpr();
      bed.width = cell * COLS * k;
      bed.height = cell * ROWS * k;
      const g = bed.getContext('2d');
      g.setTransform(k, 0, 0, k, 0, 0);
      g.clearRect(0, 0, cell * COLS, cell * ROWS);
      g.lineWidth = 1;
      g.strokeStyle = 'rgba(190, 205, 255, 0.13)';
      for (const segs of shapes) g.stroke(shapePath(segs, 0, 0, cell));
    }

    function renderPiece(p) {
      const { cell } = S;
      const size = pieceSize();
      const k = fx.dpr();
      const cv = p.canvas;
      cv.width = Math.ceil(size * k);
      cv.height = Math.ceil(size * k);
      const g = cv.getContext('2d');
      g.setTransform(k, 0, 0, k, 0, 0);
      g.clearRect(0, 0, size, size);
      const path = shapePath(shapes[p.id], p.c - PAD, p.r - PAD, cell);
      g.save();
      g.clip(path);
      g.imageSmoothingQuality = 'high';
      g.drawImage(source, (PAD - p.c) * cell, (PAD - p.r) * cell, COLS * cell, ROWS * cell);
      // Lichtkante oben links, Schattenkante unten rechts
      g.lineJoin = 'round';
      g.lineWidth = 2.2;
      g.save();
      g.translate(1.1, 1.1);
      g.strokeStyle = 'rgba(255, 250, 235, 0.38)';
      g.stroke(path);
      g.restore();
      g.save();
      g.translate(-1.1, -1.1);
      g.strokeStyle = 'rgba(10, 8, 30, 0.42)';
      g.stroke(path);
      g.restore();
      g.restore();
      g.lineWidth = 0.8;
      g.strokeStyle = 'rgba(20, 16, 44, 0.55)';
      g.stroke(path);
    }

    function placeWrap(p) {
      const { cell } = S;
      p.wrap.style.transform = `translate3d(${(p.c - PAD) * cell}px, ${(p.r - PAD) * cell}px, 0)`;
    }

    function slotWrap(p) {
      const size = pieceSize();
      const sw = S.slotW || 72;
      const sh = p.slot.clientHeight || 100;
      p.wrap.style.transform = `translate3d(${(sw - size) / 2}px, ${(sh - size) / 2}px, 0) scale(${S.tScale})`;
    }

    function updateCount() {
      S.count.textContent = `${S.placed.size} / ${N}`;
    }

    function save() {
      ctx.store.set('placed', [...S.placed]);
    }

    // ---------- Bewegung (sanftes Nachführen, eine Schleife für alles) ----------
    const flying = new Set();
    let stopAnim = null;
    function apply(f) {
      const size = pieceSize();
      f.el.style.transform = `translate3d(${f.x - size / 2}px, ${f.y - size / 2}px, 0) scale(${f.s})`;
    }
    function animate() {
      if (stopAnim) return;
      stopAnim = fx.loop((dt) => {
        for (const f of flying) {
          const k = 1 - Math.exp(-dt * f.rate);
          f.x += (f.tx - f.x) * k;
          f.y += (f.ty - f.y) * k;
          f.s += (f.ts - f.s) * k;
          if (f.onArrive && Math.abs(f.tx - f.x) < 0.5 && Math.abs(f.ty - f.y) < 0.5 && Math.abs(f.ts - f.s) < 0.004) {
            f.x = f.tx;
            f.y = f.ty;
            f.s = f.ts;
            apply(f);
            flying.delete(f);
            const cb = f.onArrive;
            f.onArrive = null;
            cb();
            continue;
          }
          apply(f);
        }
        if (!flying.size) {
          stopAnim();
          stopAnim = null;
        }
      });
    }
    globals.push(() => stopAnim?.());

    function stageXY(clientX, clientY) {
      const r = stage.getBoundingClientRect();
      return [clientX - r.left, clientY - r.top];
    }

    function boardCenter(p) {
      const sr = stage.getBoundingClientRect();
      const br = S.board.getBoundingClientRect();
      return [br.left - sr.left + (p.c + 0.5) * S.cell, br.top - sr.top + (p.r + 0.5) * S.cell];
    }

    function lift(p) {
      const sr = stage.getBoundingClientRect();
      const wr = p.slot.getBoundingClientRect();
      const x = wr.left - sr.left + wr.width / 2;
      const y = wr.top - sr.top + wr.height / 2;
      p.slot.classList.add('empty');
      S.dragLayer.append(p.wrap);
      p.wrap.classList.add('lifted');
      const f = { el: p.wrap, p, x, y, s: S.tScale, tx: x, ty: y, ts: S.tScale, rate: 30, onArrive: null };
      apply(f);
      flying.add(f);
      animate();
      return f;
    }

    // ---------- Ziehen ----------
    function liftOffset() {
      return S.cell * 0.5 + 24;
    }

    function onSlotDown(e, slot) {
      if (!S || S.busy || S.drag || S.pending || S.solved) return;
      if (!slot.piece || slot.classList.contains('empty')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      S.pending = { id: e.pointerId, x0: e.clientX, y0: e.clientY, slot, type: e.pointerType };
      if (e.pointerType === 'mouse') e.preventDefault();
    }

    function startDrag(e) {
      const { slot } = S.pending;
      const p = slot.piece;
      S.pending = null;
      const f = lift(p);
      f.ts = 1.07;
      f.rate = 26;
      S.drag = { f, p, id: e.pointerId };
      moveDrag(e);
      try { slot.releasePointerCapture?.(e.pointerId); } catch { /* egal */ }
      S.hint.classList.remove('on');
      sfx.play('tick');
      haptic(8);
    }

    function moveDrag(e) {
      const [x, y] = stageXY(e.clientX, e.clientY);
      const f = S.drag.f;
      f.tx = x;
      f.ty = y - liftOffset();
    }

    function drop() {
      const { f, p } = S.drag;
      S.drag = null;
      const [cx, cy] = boardCenter(p);
      const d = Math.hypot(f.x - cx, f.y - cy);
      if (d < S.cell * 0.55) snap(p, f, cx, cy);
      else sendBack(p, f);
    }

    function snap(p, f, cx, cy) {
      p.placed = true;
      S.placed.add(p.id);
      save();
      f.tx = cx;
      f.ty = cy;
      f.ts = 1;
      f.rate = 30;
      f.onArrive = () => settle(p);
      animate();
    }

    function settle(p) {
      p.wrap.classList.remove('lifted');
      S.placedLayer.append(p.wrap);
      placeWrap(p);
      p.wrap.classList.remove('flash');
      void p.wrap.offsetWidth;
      p.wrap.classList.add('flash');
      const slot = p.slot;
      p.slot = null;
      if (slot) {
        slot.classList.add('gone');
        later(() => slot.remove(), 360);
      }
      // Klick und ein kleiner Glockenton, der mit dem Fortschritt steigt
      sfx.tone(2100, { dur: 0.025, type: 'square', vol: 0.035 });
      sfx.tone(520, { dur: 0.07, type: 'triangle', vol: 0.09, slide: 0.55 });
      const note = PENTA[Math.min(PENTA.length - 1, Math.floor((S.placed.size / N) * PENTA.length))];
      sfx.bell(note, { vol: 0.045, dur: 0.9, at: 0.03 });
      haptic(14);
      const r = p.wrap.getBoundingClientRect();
      fx.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 12, power: 130, size: 3.4, life: 0.7, gravity: 60 });
      updateCount();
      if (S.placed.size === N) finale();
    }

    function sendBack(p, f) {
      const sr = stage.getBoundingClientRect();
      const r = p.slot.getBoundingClientRect();
      f.tx = r.left - sr.left + r.width / 2;
      f.ty = r.top - sr.top + r.height / 2;
      f.ts = S.tScale;
      f.rate = 13;
      sfx.play('drop');
      f.onArrive = () => {
        p.wrap.classList.remove('lifted');
        p.slot.append(p.wrap);
        slotWrap(p);
        p.slot.classList.remove('empty');
      };
      animate();
    }

    on(window, 'pointermove', (e) => {
      if (!S) return;
      if (S.drag && e.pointerId === S.drag.id) {
        moveDrag(e);
        return;
      }
      const pd = S.pending;
      if (!pd || e.pointerId !== pd.id) return;
      const dx = e.clientX - pd.x0;
      const dy = e.clientY - pd.y0;
      if (Math.hypot(dx, dy) < 7) return;
      if (pd.type === 'mouse' || Math.abs(dy) > Math.abs(dx) * 0.55) startDrag(e);
      else S.pending = null; // waagerecht: die Ablage scrollt
    });
    const end = (e) => {
      if (!S) return;
      if (S.drag && e.pointerId === S.drag.id) drop();
      if (S.pending && e.pointerId === S.pending.id) S.pending = null;
    };
    on(window, 'pointerup', end);
    on(window, 'pointercancel', (e) => {
      if (!S) return;
      if (S.drag && e.pointerId === S.drag.id) {
        const { f, p } = S.drag;
        S.drag = null;
        sendBack(p, f);
      }
      if (S.pending && e.pointerId === S.pending.id) S.pending = null;
    });
    // Senkrechtes Herausziehen aus der Ablage darf nicht scrollen.
    on(stage, 'touchmove', (e) => {
      if (!S) return;
      if (S.drag) {
        if (e.cancelable) e.preventDefault();
        return;
      }
      const pd = S.pending;
      const t = e.touches[0];
      if (pd && t) {
        const dx = t.clientX - pd.x0;
        const dy = t.clientY - pd.y0;
        if (e.cancelable && Math.abs(dy) > Math.abs(dx) * 0.55) e.preventDefault();
      }
    }, { passive: false });

    let resizeTimer = 0;
    on(window, 'resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => alive && !S?.drag && !flying.size && layout(), 160);
    });
    globals.push(() => clearTimeout(resizeTimer));

    // ---------- Vorschau und Hilfe ----------
    function togglePreview(force) {
      const show = force ?? !S.ghost.classList.contains('on');
      S.ghost.classList.toggle('on', show);
      S.previewBtn.classList.toggle('active', show);
      clearTimeout(S.previewTimer);
      if (show) {
        const t = setTimeout(() => alive && S && togglePreview(false), 4500);
        S.previewTimer = t;
        local.push(() => clearTimeout(t));
      }
    }

    function choosePiece() {
      const inTray = [...S.tray.children].map((s) => s.piece).filter((p) => p && !p.placed && !s_empty(p));
      if (!inTray.length) return null;
      const near = (p) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => {
        const c = p.c + dc;
        const r = p.r + dr;
        return c >= 0 && c < COLS && r >= 0 && r < ROWS && S.placed.has(r * COLS + c);
      });
      const edge = (p) => p.c === 0 || p.r === 0 || p.c === COLS - 1 || p.r === ROWS - 1;
      let pool = S.placed.size ? inTray.filter(near) : inTray.filter(edge);
      if (!pool.length) pool = inTray;
      const tr = S.tray.getBoundingClientRect();
      const visible = pool.find((p) => {
        const r = p.slot.getBoundingClientRect();
        return r.left >= tr.left - 4 && r.right <= tr.right + 4;
      });
      return visible || pool[0];
    }
    function s_empty(p) {
      return !p.slot || p.slot.classList.contains('empty');
    }

    async function helpPlace() {
      if (S.busy || S.drag || S.solved) return;
      const p = choosePiece();
      if (!p) return;
      S.busy = true;
      S.hint.classList.remove('on');
      const tray = S.tray;
      const target = p.slot.offsetLeft - (tray.clientWidth - p.slot.offsetWidth) / 2;
      tray.scrollTo({ left: Math.max(0, target), behavior: fx.reducedMotion() ? 'auto' : 'smooth' });
      await fx.wait(420);
      if (!alive || !S || p.placed) return;
      const f = lift(p);
      const [cx, cy] = boardCenter(p);
      sfx.play('whoosh');
      f.tx = cx;
      f.ty = cy;
      f.ts = 1.12;
      f.rate = 7;
      f.onArrive = () => {
        p.placed = true;
        S.placed.add(p.id);
        save();
        f.ts = 1;
        f.rate = 26;
        f.onArrive = () => {
          S.busy = false;
          settle(p);
        };
        flying.add(f);
        animate();
      };
      animate();
    }

    function restart() {
      sfx.play('page');
      ctx.store.set('placed', []);
      ctx.store.set('solved', false);
      flying.clear();
      build();
    }

    // ---------- Das Bild erwacht ----------
    async function finale() {
      S.solved = true;
      S.busy = true;
      ctx.store.set('solved', true);
      const first = ctx.complete({ quiet: true }); // schon beim Lösen als erlebt markieren, nicht erst nach der Animation
      togglePreview(false);
      const mine = S;
      await fx.wait(380);
      if (!alive || S !== mine) return;
      stage.classList.add('is-solving');
      S.full.classList.add('on');
      sfx.play('success');
      await fx.wait(900);
      if (!alive || S !== mine) return;
      startAwake(true);
      await fx.wait(900);
      if (!alive || S !== mine) return;
      stage.classList.add('is-solved');
      if (first) ctx.ui.toast(`✦ Laterne ${ctx.day} leuchtet jetzt am Berg`);
    }

    function startAwake(withBurst) {
      S.awake.classList.add('on');
      S.board.classList.add('awake');
      if (withBurst) {
        const br = S.board.getBoundingClientRect();
        const lx = br.left + br.width * 0.737;
        const ly = br.top + br.height * 0.745;
        fx.burst(lx, ly, { count: 40, power: 260, size: 5, life: 1.4, gravity: 70 });
        fx.burst(br.left + br.width * 0.55, br.top + br.height * 0.14, { count: 26, kind: 'star', colors: ['#bff7e6', '#74e3c4', '#c9c0ff', '#fff3c4'], power: 200, gravity: 30, life: 1.8, size: 9 });
        sfx.play('sparkle');
      }
      // Funkeln und leiser Schneefall über dem fertigen Bild
      const cv = S.twinkle;
      const rnd = mulberry32(SEED + 7);
      const stars = Array.from({ length: 34 }, () => ({ x: rnd(), y: rnd() * 0.3, ph: rnd() * 6.28, sp: 0.8 + rnd() * 1.6, s: 3 + rnd() * 5 }));
      const flakes = Array.from({ length: 46 }, () => ({ x: rnd(), y: rnd(), z: rnd(), sw: rnd() * 6.28 }));
      const reduce = fx.reducedMotion();
      const stop = fx.loop((dt, t) => {
        if (document.hidden) return;
        const { w, h: hh, ctx: g } = fitCanvas(cv);
        g.clearRect(0, 0, w, hh);
        g.globalCompositeOperation = 'lighter';
        for (const s of stars) {
          const a = Math.max(0, Math.sin(t * s.sp + s.ph)) ** 3;
          if (a < 0.02) continue;
          const x = s.x * w;
          const y = s.y * hh;
          const r = s.s * (0.6 + a * 0.6);
          g.globalAlpha = a * 0.9;
          g.fillStyle = '#fff6d8';
          g.beginPath();
          g.moveTo(x, y - r);
          g.quadraticCurveTo(x, y, x + r, y);
          g.quadraticCurveTo(x, y, x, y + r);
          g.quadraticCurveTo(x, y, x - r, y);
          g.quadraticCurveTo(x, y, x, y - r);
          g.fill();
        }
        g.globalCompositeOperation = 'source-over';
        if (!reduce) {
          for (const f of flakes) {
            f.y += (0.018 + f.z * 0.03) * dt;
            if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
            const x = (f.x + Math.sin(t * 0.7 + f.sw) * 0.01) * w;
            g.globalAlpha = 0.35 + f.z * 0.5;
            g.fillStyle = '#ffffff';
            g.beginPath();
            g.arc(x, f.y * hh, 0.6 + f.z * 1.5, 0, 6.283);
            g.fill();
          }
        }
        g.globalAlpha = 1;
      });
      local.push(stop);
    }

    const fitCanvas = (cv) => fx.fitCanvas(cv);

    build();
    return () => {};
  },
};
