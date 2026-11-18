// Bewegung und Partikel: Schnee, Funken, Konfetti und kleine Rechenhelfer.

export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
export const dpr = () => Math.min(2, window.devicePixelRatio || 1);

/** Animationsschleife. fn(dt in Sekunden, t in Sekunden). Rückgabe: Stopp-Funktion. */
export function loop(fn) {
  let id = 0;
  let on = true;
  let last = performance.now();
  const tick = (now) => {
    if (!on) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    fn(dt, now / 1000);
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => {
    on = false;
    cancelAnimationFrame(id);
  };
}

/** Passt ein Canvas an seine CSS-Größe an. Gibt {w, h, ctx} in CSS-Pixeln zurück. */
export function fitCanvas(canvas) {
  const r = canvas.getBoundingClientRect();
  const k = dpr();
  const w = Math.max(1, Math.round(r.width));
  const h = Math.max(1, Math.round(r.height));
  if (canvas.width !== w * k || canvas.height !== h * k) {
    canvas.width = w * k;
    canvas.height = h * k;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(k, 0, 0, k, 0, 0);
  return { w, h, ctx };
}

/** Sanfter Schneefall auf einem Canvas. */
export class Snow {
  constructor(canvas, { density = 1, wind = 12, color = '255,255,255' } = {}) {
    this.canvas = canvas;
    this.density = density;
    this.wind = wind;
    this.color = color;
    this.flakes = [];
    this.stop = null;
    this.onResize = () => this.resize();
  }
  resize() {
    const { w, h, ctx } = fitCanvas(this.canvas);
    this.w = w;
    this.h = h;
    this.ctx = ctx;
    const target = Math.round(((w * h) / 9000) * this.density);
    while (this.flakes.length < target) this.flakes.push(this.make(true));
    this.flakes.length = Math.min(this.flakes.length, target);
  }
  make(anywhere) {
    const z = Math.random();
    return {
      x: rand(this.w || 400),
      y: anywhere ? rand(this.h || 800) : -8,
      z,
      r: 0.7 + z * 2.1,
      v: 18 + z * 46,
      sway: rand(Math.PI * 2),
      a: 0.35 + z * 0.55,
    };
  }
  start() {
    if (this.stop) return;
    this.resize();
    window.addEventListener('resize', this.onResize);
    this.stop = loop((dt, t) => {
      if (document.hidden || this.paused) return;
      const { ctx, w, h } = this;
      ctx.clearRect(0, 0, w, h);
      for (const f of this.flakes) {
        f.y += f.v * dt;
        f.x += (this.wind * (0.4 + f.z) + Math.sin(t * 0.9 + f.sway) * 9) * dt;
        if (f.y > h + 6) Object.assign(f, this.make(false));
        if (f.x > w + 6) f.x = -6;
        if (f.x < -6) f.x = w + 6;
        ctx.globalAlpha = f.a;
        ctx.fillStyle = `rgb(${this.color})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }
  destroy() {
    this.stop?.();
    this.stop = null;
    window.removeEventListener('resize', this.onResize);
  }
}

// ---------- Globale Partikelebene (liegt über allem, fängt keine Berührungen) ----------
let layer = null;
let lctx = null;
let parts = [];
let stopLayer = null;

function ensureLayer() {
  if (layer) return;
  layer = document.createElement('canvas');
  layer.className = 'fx-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  const fit = () => {
    const k = dpr();
    layer.width = innerWidth * k;
    layer.height = innerHeight * k;
    lctx = layer.getContext('2d');
    lctx.setTransform(k, 0, 0, k, 0, 0);
  };
  fit();
  window.addEventListener('resize', fit);
}

function run() {
  if (stopLayer) return;
  stopLayer = loop((dt) => {
    lctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => p.life > 0);
    for (const p of parts) {
      p.life -= dt;
      p.vy += p.g * dt;
      p.vx *= 1 - p.drag * dt;
      p.vy *= 1 - p.drag * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      const k = clamp(p.life / p.max);
      lctx.globalAlpha = p.fade ? k : 1;
      if (p.kind === 'spark') {
        lctx.globalCompositeOperation = 'lighter';
        const r = p.size * (0.4 + k * 0.6);
        const grad = lctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'rgba(255,170,60,0)');
        lctx.fillStyle = grad;
        lctx.beginPath();
        lctx.arc(p.x, p.y, r * 3, 0, 6.283);
        lctx.fill();
        lctx.globalCompositeOperation = 'source-over';
      } else if (p.kind === 'star') {
        lctx.save();
        lctx.translate(p.x, p.y);
        lctx.rotate(p.rot);
        lctx.fillStyle = p.color;
        const s = p.size * (0.5 + k * 0.5);
        lctx.beginPath();
        for (let i = 0; i < 4; i++) {
          lctx.rotate(Math.PI / 2);
          lctx.moveTo(0, 0);
          lctx.quadraticCurveTo(s * 0.18, s * 0.18, 0, s);
          lctx.quadraticCurveTo(-s * 0.18, s * 0.18, 0, 0);
        }
        lctx.fill();
        lctx.restore();
      } else {
        lctx.save();
        lctx.translate(p.x, p.y);
        lctx.rotate(p.rot);
        lctx.fillStyle = p.color;
        if (p.kind === 'dot') {
          lctx.beginPath();
          lctx.arc(0, 0, p.size / 2, 0, 6.283);
          lctx.fill();
        } else {
          lctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        lctx.restore();
      }
    }
    lctx.globalAlpha = 1;
    if (!parts.length) {
      stopLayer();
      stopLayer = null;
      lctx.clearRect(0, 0, innerWidth, innerHeight);
    }
  });
}

const WARM = ['#fff3c4', '#ffd98a', '#ffb347', '#ff9d3c'];
const FESTIVE = ['#ffd98a', '#ff9d3c', '#74e3c4', '#9a8cf0', '#f6ecd9', '#e86a7a'];

/** Funkenstoß an Bildschirmposition (clientX, clientY). kind: spark | star | dot | confetti */
export function burst(x, y, { count = 26, kind = 'spark', colors = WARM, power = 220, gravity = 120, life = 1.1, size = 5, up = 0.35 } = {}) {
  if (reducedMotion()) count = Math.ceil(count / 4);
  ensureLayer();
  for (let i = 0; i < count; i++) {
    const a = rand(Math.PI * 2);
    const v = rand(power * 0.25, power);
    const l = rand(life * 0.6, life);
    parts.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * up,
      g: gravity, drag: 1.6, life: l, max: l, size: rand(size * 0.6, size * 1.3),
      rot: rand(6.28), spin: rand(-6, 6), color: pick(colors), kind, fade: true,
    });
  }
  run();
}

/** Konfettiregen über den ganzen Bildschirm. */
export function confetti({ count = 90, colors = FESTIVE } = {}) {
  if (reducedMotion()) count = 16;
  ensureLayer();
  for (let i = 0; i < count; i++) {
    const l = rand(2.2, 4);
    parts.push({
      x: rand(innerWidth), y: rand(-innerHeight * 0.4, -10), vx: rand(-40, 40), vy: rand(60, 200),
      g: 90, drag: 0.5, life: l, max: l, size: rand(6, 11), rot: rand(6.28), spin: rand(-8, 8),
      color: pick(colors), kind: Math.random() < 0.25 ? 'star' : 'confetti', fade: true,
    });
  }
  run();
}

/** Funken an der Mitte eines Elements. */
export function burstAt(el, opts) {
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, opts);
}
