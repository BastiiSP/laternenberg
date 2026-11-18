// Türchen 20 · „Daumenkino“: dieselbe Geschichte wie im Film, aus drei Bildern erzählt
// (Kamerafahrten, Wischblende, Schneeflug, Zwischentitel im Stummfilm-Stil, Klavierbegleitung).

const DUR = 35.2;
const T_A = 2.6; // Bild A beginnt
const T_B = 11.2; // Wischblende zu Bild B
const T_C = 21.4; // Weißblende, Bild C
const T_IRIS = 31.8;
const T_END = 33.0;

// Kamerafahrten: [Zeit seit Schnittbeginn, Zoom, Blickpunkt x, Blickpunkt y] (Anteile des Bildes)
const CAMS = {
  a: [[0, 1.05, 0.5, 0.48], [3.2, 1.3, 0.36, 0.44], [6.6, 1.9, 0.3, 0.41], [9.8, 2.3, 0.37, 0.37]],
  b: [[0, 1.2, 0.62, 0.46], [4, 1.55, 0.5, 0.45], [10, 2.25, 0.48, 0.46]],
  c: [[0, 2.0, 0.52, 0.8], [4, 1.6, 0.5, 0.72], [7.5, 1.4, 0.52, 0.62], [10.4, 1.9, 0.68, 0.52]],
};

const CAPS = [
  [3.2, 5.9, 'Oben am Hang. Lorelai hat einen Plan.'],
  [6.2, 8.6, '„Wir lehnen uns vor. Den Rest erledigt der Berg.“'],
  [9.0, 11.0, 'Logan hatte Bedenken. Und eine halbe Möhre.'],
  [12.0, 14.4, 'Die Abfahrt.'],
  [14.6, 17.4, 'Viel zu schnell.'],
  [17.6, 21.0, 'Ohren im Wind. Beide.'],
  [22.3, 23.9, 'FWUMPF.', 'big'],
  [24.6, 27.6, 'Beide tauchten wieder auf. Lachend.'],
  [28.0, 31.6, 'Die Laterne brannte noch.'],
];

const ss = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function spline(keys, tt) {
  const n = keys.length;
  if (tt <= keys[0][0]) return keys[0].slice(1);
  if (tt >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (i < n - 2 && tt > keys[i + 1][0]) i++;
  const k0 = keys[Math.max(0, i - 1)];
  const k1 = keys[i];
  const k2 = keys[i + 1];
  const k3 = keys[Math.min(n - 1, i + 2)];
  const hh = k2[0] - k1[0];
  const u = (tt - k1[0]) / hh;
  const u2 = u * u;
  const u3 = u2 * u;
  return [1, 2, 3].map((c) => {
    const m1 = ((k2[c] - k0[c]) / Math.max(1e-6, k2[0] - k0[0])) * hh;
    const m2 = ((k3[c] - k1[c]) / Math.max(1e-6, k3[0] - k1[0])) * hh;
    return (2 * u3 - 3 * u2 + 1) * k1[c] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * k2[c] + (u3 - u2) * m2;
  });
}

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const BASS = [48, 41, 48, 43, 48, 45, 41, 43];
const CHORDS = [[60, 64, 67], [60, 65, 69], [60, 64, 67], [59, 62, 67], [60, 64, 67], [60, 64, 69], [60, 65, 69], [59, 62, 67]];

export function createFilm(host, ctx, { onEnd, onProgress } = {}) {
  const { h } = ctx.ui;
  const { loop, clamp } = ctx.fx;
  const reduced = ctx.reducedMotion;

  // ---------- Aufbau ----------
  const film = h('div', { class: 'd20-film' });
  const frames = h('div', { class: 'd20-frames' });
  const mkShot = (key, extra) => {
    const cam = h('div', { class: 'd20-cam' }, h('img', { src: ctx.img(`d20-${key}`), alt: '', draggable: 'false' }), extra);
    const shot = h('div', { class: `d20-shot d20-shot-${key}` }, cam);
    shot.style.visibility = 'hidden';
    return { key, shot, cam };
  };
  const lamp = h('div', { class: 'd20-lamp' });
  const A = mkShot('a');
  const B = mkShot('b');
  const C = mkShot('c', lamp);
  frames.append(A.shot, B.shot, C.shot);
  const fxCanvas = h('canvas', { class: 'd20-fxc' });
  const tint = h('div', { class: 'd20-tint' });
  const flash = h('div', { class: 'd20-flash' });
  const grainCv = h('canvas', { class: 'd20-grain', width: 90, height: 160 });
  const scratch = h('div', { class: 'd20-scratch' });
  const vig = h('div', { class: 'd20-vig' });
  const cap = h('div', { class: 'd20-cap', 'aria-live': 'polite' });
  const card = h('div', { class: 'd20-card' });
  film.append(frames, fxCanvas, tint, flash, cap, card, grainCv, scratch, vig);
  host.append(film);

  // ---------- Größen ----------
  let vw = 390;
  let vh = 844;
  let W = 563;
  let H = 844;
  let fxc = null;
  function layout() {
    const r = host.getBoundingClientRect();
    vw = r.width || 390;
    vh = r.height || 844;
    W = Math.max(vw, (vh * 2) / 3);
    H = (W * 3) / 2;
    for (const s of [A, B, C]) {
      s.cam.style.width = `${W}px`;
      s.cam.style.height = `${H}px`;
    }
    fxc = ctx.fx.fitCanvas(fxCanvas);
  }
  const ro = new ResizeObserver(layout);
  ro.observe(host);
  layout();

  // ---------- Zeit ----------
  let t = 0;
  let paused = true;
  let running = false;
  let ended = false;
  let fired = new Set();
  let beatAt = 0;
  let beatN = 0;

  // ---------- Partikel ----------
  const flakes = Array.from({ length: 78 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), s: Math.random() * 6 }));
  let puffs = [];
  function spawnPuffs() {
    for (let i = 0; i < 26; i++) {
      const life = 1.6 + Math.random() * 1.6;
      puffs.push({ x: vw * (0.12 + Math.random() * 0.76), y: vh * (0.62 + Math.random() * 0.2), r: 22 + Math.random() * 46, vr: 18 + Math.random() * 26, vy: -30 - Math.random() * 60, vx: (Math.random() - 0.5) * 80, life, max: life });
    }
  }

  function drawFx(dt) {
    if (!fxc) return;
    const { w, h: hh, ctx: g } = fxc;
    g.clearRect(0, 0, w, hh);
    const rush = t < T_C ? ss(11.4, 13, t) * (0.55 + 0.45 * ss(14, 19, t)) : 0;
    const calm = t >= T_C + 1.2 ? 0.6 : 1;
    const nowS = performance.now() / 1000;
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    for (const f of flakes) {
      const vx = -14 + Math.sin(nowS * 0.8 + f.s) * 8 - 980 * rush * (0.5 + f.z * 0.7);
      const vy = 26 + f.z * 40 - 360 * rush * (0.5 + f.z * 0.7);
      f.x += (vx * dt) / vw;
      f.y += (vy * dt) / vh;
      if (f.x < -0.05) { f.x = 1.05; f.y = Math.random(); }
      if (f.y > 1.05) { f.y = -0.05; f.x = Math.random(); }
      if (f.y < -0.05) { f.y = 1.05; f.x = Math.random(); }
      const len = 0.004 + 0.034 * rush * (0.5 + f.z);
      const x = f.x * w;
      const y = f.y * hh;
      g.globalAlpha = (0.3 + f.z * 0.6) * calm;
      g.lineWidth = 1 + f.z * 2.2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - vx * len, y - vy * len);
      g.stroke();
    }
    // Windstreifen
    if (rush > 0.05) {
      g.strokeStyle = 'rgba(235,240,255,1)';
      g.lineWidth = 1.4;
      for (let i = 0; i < 22; i++) {
        const k = (nowS * (1.4 + (i % 5) * 0.35) + i * 0.173) % 1;
        const x = (1.1 - k * 1.5) * w;
        const y = (((i * 0.6180339) % 1) * 1.1 + k * 0.45 - 0.1) * hh;
        g.globalAlpha = 0.28 * rush;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 130 * rush, y + 44 * rush);
        g.stroke();
      }
    }
    // Pulverschnee
    puffs = puffs.filter((p) => p.life > 0);
    for (const p of puffs) {
      p.life -= dt;
      p.r += p.vr * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 0.8 * dt;
      p.vy += 40 * dt;
      const a = clamp(p.life / p.max);
      const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, `rgba(250,250,255,${0.85 * a})`);
      grad.addColorStop(1, 'rgba(230,235,255,0)');
      g.globalAlpha = 1;
      g.fillStyle = grad;
      g.beginPath();
      g.arc(p.x, p.y, p.r, 0, 6.283);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  // ---------- Filmkorn ----------
  const gctx = grainCv.getContext('2d');
  let grainT = 0;
  function drawGrain(dt) {
    grainT -= dt;
    if (grainT > 0) return;
    grainT = 0.07;
    const im = gctx.createImageData(90, 160);
    const d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 40;
    }
    gctx.putImageData(im, 0, 0);
    if (Math.random() < 0.12) {
      scratch.style.left = `${Math.random() * 100}%`;
      scratch.style.opacity = String(0.15 + Math.random() * 0.3);
    } else if (Math.random() < 0.5) {
      scratch.style.opacity = '0';
    }
    tint.style.opacity = String(0.9 + Math.random() * 0.1);
  }

  // ---------- Kamera ----------
  function place(S, keys, rel, jit = 0, extraScale = 1) {
    const [s0, fx, fy] = spline(keys, rel);
    const s = s0 * extraScale;
    const px = vw * 0.5;
    const py = vh * 0.46;
    let x = px - fx * W * s;
    let y = py - fy * H * s;
    if (jit) {
      x += (Math.random() - 0.5) * jit * 2;
      y += (Math.random() - 0.5) * jit * 2;
    }
    x = Math.min(0, Math.max(vw - W * s, x));
    y = Math.min(0, Math.max(vh - H * s, y));
    S.cam.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
  }

  // ---------- Klang ----------
  const sfx = ctx.sfx;
  function musicStep() {
    const live = (t >= T_A && t < T_C - 0.2) || (t >= 24.2 && t < T_IRIS - 0.3);
    if (!live) { beatAt = t; return; }
    const rushing = t >= T_B && t < T_C;
    const stepLen = rushing ? 0.27 : t >= 24.2 ? 0.46 : 0.5;
    while (t >= beatAt) {
      const bar = Math.floor(beatN / 4) % 8;
      const b = beatN % 4;
      const bass = BASS[bar];
      const vol = rushing ? 0.065 : 0.05;
      if (b === 0 || b === 2) {
        ctx.tone(midi(b === 0 ? bass : bass + 7), { dur: stepLen * 1.5, vol, type: 'triangle' });
      } else {
        CHORDS[bar].forEach((m, i) => ctx.tone(midi(m), { dur: stepLen * 0.8, vol: vol * 0.55, type: 'triangle', at: i * 0.012 }));
      }
      if (b === 3 && !rushing && beatN % 8 === 7) ctx.tone(midi(CHORDS[bar][2] + 12), { dur: 0.5, vol: 0.04, type: 'sine' });
      beatN++;
      beatAt += stepLen;
    }
  }

  const EVENTS = [
    [0.05, () => sfx.play('page')],
    [T_A, () => sfx.play('page')],
    [3.2, () => sfx.play('tick')],
    [6.2, () => sfx.play('tick')],
    [9.0, () => sfx.play('tick')],
    [T_B, () => sfx.play('whoosh')],
    [11.6, () => sfx.hiss({ dur: 3, vol: 0.05, from: 300, to: 1800 })],
    [14.6, () => sfx.hiss({ dur: 2.8, vol: 0.07, from: 500, to: 2600 })],
    [17.6, () => sfx.hiss({ dur: 3.6, vol: 0.09, from: 800, to: 3600 })],
    [18.4, () => sfx.play('squeak')],
    [19.7, () => sfx.play('squeak')],
    [T_C, () => { ctx.tone(95, { dur: 0.55, vol: 0.3, slide: 0.45 }); sfx.hiss({ dur: 0.7, vol: 0.16, from: 3000, to: 300 }); spawnPuffs(); }],
    [22.9, () => sfx.play('pop')],
    [24.6, () => sfx.play('pop')],
    [25.3, () => sfx.play('squeak')],
    [25.7, () => sfx.play('squeak')],
    [26.2, () => sfx.play('squeak')],
    [28.2, () => sfx.play('chime')],
    [T_IRIS, () => sfx.play('whoosh')],
    [T_END + 0.2, () => sfx.play('bell')],
  ];

  // ---------- Darstellung ----------
  let lastCard = '';
  function setCard(html) {
    if (html === lastCard) return;
    lastCard = html;
    if (html) {
      card.innerHTML = html;
      card.classList.add('on');
    } else {
      card.classList.remove('on');
    }
  }
  let lastCap = '';
  function setCap(c) {
    const key = c ? c[2] : '';
    if (key === lastCap) return;
    lastCap = key;
    if (c) {
      cap.textContent = c[2];
      cap.className = `d20-cap on${c[3] ? ` ${c[3]}` : ''}`;
    } else {
      cap.className = 'd20-cap';
    }
  }

  function render() {
    // Karten
    if (t < T_A) {
      setCard('<div class="d20-card-in"><p class="d20-card-kicker">✦ Hasenkino zeigt ✦</p><p class="d20-card-title">Zwei Ohren im Wind</p><p class="d20-card-sub">Ein Stummfilm in drei Bildern</p></div>');
    } else if (t >= T_END) {
      setCard('<div class="d20-card-in"><p class="d20-card-title end">ENDE</p><p class="d20-card-sub">✦ ✦ ✦</p></div>');
    } else {
      setCard('');
    }

    // Bilder
    A.shot.style.visibility = t >= T_A && t < T_B + 1.2 ? 'visible' : 'hidden';
    place(A, CAMS.a, t - T_A);
    const bOn = t >= T_B && t < T_C + 0.05;
    B.shot.style.visibility = bOn ? 'visible' : 'hidden';
    if (bOn) {
      const x = ss(0, 1, (t - T_B) / 0.9) * 122;
      B.shot.style.clipPath = x >= 121 ? 'none' : `polygon(0 0, ${x}% 0, ${x - 22}% 100%, 0 100%)`;
      const amp = 1 + 7 * ss(12, 20, t);
      place(B, CAMS.b, t - T_B, reduced ? 0 : amp, 1.03);
    }
    const cOn = t >= T_C;
    C.shot.style.visibility = cOn ? 'visible' : 'hidden';
    if (cOn) {
      place(C, CAMS.c, t - T_C);
      frames.style.clipPath = t >= T_IRIS ? `circle(${(1 - ss(T_IRIS, T_END - 0.1, t)) * 90}% at 50% 56%)` : 'none';
      lamp.style.opacity = String(t > 27.6 ? 0.45 + 0.4 * Math.sin((t - 27.6) * 3.2) ** 2 : 0.3);
    } else {
      frames.style.clipPath = 'none';
    }
    flash.style.opacity = t >= T_C - 0.12 && t < T_C + 1.6 ? String(t < T_C ? ss(T_C - 0.12, T_C, t) : Math.pow(1 - ss(T_C, T_C + 1.6, t), 1.6)) : '0';
    // Zwischentitel
    setCap(t >= T_END ? null : CAPS.find((c) => t >= c[0] && t < c[1]) || null);
  }

  function tick(dt) {
    if (document.hidden) return;
    if (!paused) {
      t += dt;
      for (const [at, fn] of EVENTS) {
        if (t >= at && !fired.has(at)) {
          fired.add(at);
          try { fn(); } catch { /* Klang ist nie kritisch */ }
        }
      }
      musicStep();
      if (t >= DUR && !ended) {
        ended = true;
        paused = true;
        onEnd?.();
      }
    }
    render();
    drawFx(paused ? 0 : dt);
    drawGrain(dt);
    onProgress?.(clamp(t / DUR));
  }

  let stop = null;
  function ensureLoop() {
    if (!stop) stop = loop(tick);
  }

  return {
    start() {
      t = 0;
      ended = false;
      fired = new Set();
      beatAt = 0;
      beatN = 0;
      puffs = [];
      paused = false;
      running = true;
      lastCard = '__';
      lastCap = '__';
      layout();
      ensureLoop();
    },
    pause() { paused = true; },
    resume() { if (running && !ended) paused = false; },
    toggle() { if (paused) this.resume(); else this.pause(); return paused; },
    get paused() { return paused; },
    get ended() { return ended; },
    duration: DUR,
    destroy() {
      stop?.();
      stop = null;
      ro.disconnect();
      film.remove();
    },
  };
}
