// Türchen 8 · Die Spieluhr
// Melli dreht die Kurbel; der eigens komponierte „Laternenwalzer“ spielt genau so schnell,
// wie sie dreht. Sichtbar: Stiftwalze, Kamm mit Zinken, tanzende Figürchen, Lichtpunkte.
import './d08.css';

// ---------------------------------------------------------------------------
// Der Laternenwalzer – eigene Komposition. C-Dur, 3/4-Takt, 24 Takte (A · B · A').
// Ein Hauch Wehmut: das geborgte f-Moll (As) in Takt 10 und der Schluss F → Fm → C.
// Einträge: [Takt (1-basiert), Schlag im Takt (0 … 2.5), MIDI-Ton, Länge in Schlägen]
// ---------------------------------------------------------------------------
const PHRASE_A = [
  [0, 76, 1.5], [1.5, 77, 0.5], [2, 79, 1], // E – F G
  [0, 84, 2], [2, 83, 1], //                   C – – H
  [0, 81, 1.5], [1.5, 79, 0.5], [2, 77, 1], // A – G F
  [0, 76, 1], [1, 74, 2], //                   E D – –
];
const barsOf = (phrase, startBar) => {
  // verteilt eine Phrase (Takte erkennbar am Schlag 0) ab startBar
  let bar = startBar - 1;
  return phrase.map(([beat, midi, len]) => {
    if (beat === 0) bar++;
    return [bar, beat, midi, len];
  });
};
const MELODY = [
  ...barsOf(PHRASE_A, 1),
  [5, 0, 76, 1.5], [5, 1.5, 79, 0.5], [5, 2, 83, 1],
  [6, 0, 88, 2], [6, 2, 86, 1],
  [7, 0, 84, 1.5], [7, 1.5, 81, 0.5], [7, 2, 77, 1],
  [8, 0, 79, 2], [8, 2, 83, 1],
  // B – weiter, sehnsüchtiger
  [9, 0, 81, 1], [9, 1, 84, 1], [9, 2, 89, 1],
  [10, 0, 84, 2], [10, 2, 80, 1],
  [11, 0, 79, 1.5], [11, 1.5, 76, 0.5], [11, 2, 79, 1],
  [12, 0, 81, 2], [12, 2, 76, 1],
  [13, 0, 77, 1], [13, 1, 81, 1], [13, 2, 86, 1],
  [14, 0, 86, 1.5], [14, 1.5, 84, 0.5], [14, 2, 83, 1],
  [15, 0, 84, 1.5], [15, 1.5, 83, 0.5], [15, 2, 81, 1],
  [16, 0, 79, 1], [16, 1, 77, 1], [16, 2, 74, 1],
  // A' – Heimkehr
  ...barsOf(PHRASE_A, 17),
  [21, 0, 76, 1.5], [21, 1.5, 79, 0.5], [21, 2, 83, 1],
  [22, 0, 88, 2], [22, 2, 84, 1],
  [23, 0, 80, 1.5], [23, 1.5, 79, 0.5], [23, 2, 77, 1],
  [24, 0, 76, 1.5], [24, 1.5, 74, 0.5], [24, 2, 72, 1], // E D C – Schluss auf dem Grundton
];
// Begleitstimme: Walzer-„Um-ta-ta“ – Grundton auf 1, Zweiklang auf 2 und 3.
const CHORDS = {
  C: [60, [64, 67]], Am: [57, [64, 69]], F: [53, [65, 69]], Fm: [53, [65, 68]],
  G: [55, [62, 67]], G7: [55, [65, 71]], Em: [52, [64, 67]], Dm: [50, [65, 69]],
};
const HARMONY = ['C', 'Am', 'F', 'G', 'Em', 'Am', 'F', 'G', 'F', 'Fm', 'C', 'Am', 'Dm', 'G', 'Am', 'G7', 'C', 'Am', 'F', 'G', 'Em', 'Am', 'Fm', 'C'];

const BEATS = 3;
const BARS = HARMONY.length; // 24
const LOOP = BARS * BEATS; // 72 Schläge = eine Walzenumdrehung

function buildEvents() {
  const ev = [];
  for (const [bar, beat, midi, len] of MELODY) ev.push({ t: (bar - 1) * BEATS + beat, midi, len, mel: true });
  HARMONY.forEach((name, i) => {
    const [root, dy] = CHORDS[name];
    const t0 = i * BEATS;
    if (i === BARS - 1) {
      // Schlussakkord, sanft gebrochen
      [48 + 12, 64, 67, 72].forEach((m, k) => ev.push({ t: t0 + k * 0.12, midi: m, len: 3, mel: false, last: true }));
      return;
    }
    ev.push({ t: t0, midi: root, len: 1, mel: false, bass: true });
    for (const b of [1, 2]) for (const m of dy) ev.push({ t: t0 + b, midi: m, len: 1, mel: false });
  });
  ev.sort((a, b) => a.t - b.t || a.midi - b.midi);
  return ev;
}

const EVENTS = buildEvents();
const PITCHES = [...new Set(EVENTS.map((e) => e.midi))].sort((a, b) => a - b);
const TOOTH = new Map(PITCHES.map((m, i) => [m, i]));
for (const e of EVENTS) e.tooth = TOOTH.get(e.midi);

const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
const TAU = Math.PI * 2;

// Szenenpunkte im Bild d08-spieluhr (1024 × 1536)
const IMG = { w: 1024, h: 1536, box: [600, 880], lid: [650, 640], candle: [185, 850], lantern: [205, 380], diorama: [560, 860] };

export default {
  mount(root, ctx) {
    const { h, button } = ctx.ui;
    const { clamp, rand, dpr } = ctx.fx;
    const reduced = ctx.reducedMotion;

    // ------------------------------------------------------------- Aufbau
    const stage = h('div', { class: 'd08-stage no-select' });
    const scene = h('div', { class: 'd08-scene' });
    const bg = h('img', { class: 'd08-bg', src: ctx.img('d08-spieluhr'), alt: '', draggable: 'false' });
    const candle = h('div', { class: 'd08-candle' });
    const lantern = h('div', { class: 'd08-lantern' });
    const boxGlow = h('div', { class: 'd08-boxglow' });
    scene.append(bg, candle, lantern, boxGlow);

    const intro = h('p', { class: 'd08-intro' }, 'Dreh die Kurbel. Die Spieluhr spielt genau so schnell, wie du drehst.');

    const motes = h('canvas', { class: 'd08-motes', 'aria-hidden': 'true' });

    // Werk: Kamm und Stiftwalze
    const werkCanvas = h('canvas', { class: 'd08-werk-canvas', 'aria-label': 'Stiftwalze und Kamm der Spieluhr', role: 'img' });
    const werk = h('div', { class: 'd08-werk' }, werkCanvas, h('div', { class: 'd08-plaque' }, 'Laternenwalzer'));

    // Drehbühne mit den Figürchen
    const turntable = h('div', { class: 'd08-turntable' });
    const discSvg = ctx.ui.html(`<svg class="d08-disc" viewBox="0 0 160 80" aria-hidden="true">
      <defs>
        <linearGradient id="d08-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffe7a8"/><stop offset=".45" stop-color="#d9a64a"/><stop offset="1" stop-color="#7a5418"/>
        </linearGradient>
        <radialGradient id="d08-felt" cx="50%" cy="40%" r="60%">
          <stop offset="0" stop-color="#4a2a3e"/><stop offset="1" stop-color="#1e0f1c"/>
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="53" rx="76" ry="25" fill="#3a2410"/>
      <ellipse cx="80" cy="46" rx="76" ry="27" fill="url(#d08-brass)"/>
      <ellipse cx="80" cy="44" rx="66" ry="22" fill="url(#d08-felt)"/>
      <g class="d08-bulbs"></g>
    </svg>`);
    const bulbsG = discSvg.querySelector('.d08-bulbs');
    const bulbs = [];
    for (let i = 0; i < 12; i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', '2.6');
      c.setAttribute('fill', '#ffd98a');
      bulbsG.append(c);
      bulbs.push({ el: c, glow: 0 });
    }
    const figs = [
      { who: 'lorelai', wrap: h('div', { class: 'd08-fig' }, ctx.bunny('lorelai', { size: 58 })), off: 0 },
      { who: 'logan', wrap: h('div', { class: 'd08-fig' }, ctx.bunny('logan', { size: 58 })), off: Math.PI },
    ];
    turntable.append(discSvg, ...figs.map((f) => f.wrap));

    const autoBtn = button('Von selbst spielen', () => toggleAuto(), { variant: 'small ghost' });
    autoBtn.classList.add('d08-auto');
    const leftCol = h('div', { class: 'd08-left' }, turntable, autoBtn);

    // Kurbel
    const crank = h('div', { class: 'd08-crank', role: 'slider', 'aria-label': 'Kurbel – im Uhrzeigersinn drehen', 'aria-valuemin': '0', 'aria-valuemax': String(BARS), 'aria-valuenow': '0' });
    crank.append(ctx.ui.html(`<svg class="d08-crank-svg" viewBox="-100 -100 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="d08-rose" cx="40%" cy="35%" r="70%">
          <stop offset="0" stop-color="#ffeab0"/><stop offset=".5" stop-color="#c98e34"/><stop offset="1" stop-color="#5e3d10"/>
        </radialGradient>
        <linearGradient id="d08-arm" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#8a5c1c"/><stop offset=".45" stop-color="#ffe2a0"/><stop offset="1" stop-color="#a06c22"/>
        </linearGradient>
        <radialGradient id="d08-knob" cx="35%" cy="30%" r="75%">
          <stop offset="0" stop-color="#c98a5a"/><stop offset=".55" stop-color="#7a3f22"/><stop offset="1" stop-color="#3a1a0c"/>
        </radialGradient>
      </defs>
      <circle r="92" fill="rgba(255,190,110,.05)" stroke="rgba(255,210,150,.16)" stroke-width="1.5" stroke-dasharray="2 7"/>
      <g class="d08-hint"><path d="M 0 -84 A 84 84 0 1 1 -59 -60" fill="none" stroke="rgba(255,220,160,.75)" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 9"/>
        <path d="M -59 -60 l 13 -1 M -59 -60 l 2 12" stroke="rgba(255,220,160,.9)" stroke-width="3" stroke-linecap="round" fill="none" transform="rotate(-8 -59 -60)"/></g>
      <circle r="40" fill="url(#d08-rose)" stroke="#4a2e0c" stroke-width="2"/>
      <circle r="30" fill="none" stroke="rgba(80,45,10,.55)" stroke-width="1.2"/>
      <g class="d08-arm-g">
        <path d="M -9 4 L -7 -66 A 7 7 0 0 1 7 -66 L 9 4 A 9 9 0 0 1 -9 4 Z" fill="url(#d08-arm)" stroke="#5a3a0e" stroke-width="1.5"/>
        <circle r="12" fill="#e9c271" stroke="#6b4512" stroke-width="2"/>
        <circle r="4" fill="#6b4512"/>
        <circle cy="-66" r="23" fill="rgba(0,0,0,.28)" transform="translate(3 4)"/>
        <circle cy="-66" r="22" fill="url(#d08-knob)" stroke="#2a1206" stroke-width="1.5"/>
        <ellipse cx="-7" cy="-74" rx="7" ry="4.5" fill="rgba(255,235,210,.35)"/>
      </g>
    </svg>`));
    const armG = crank.querySelector('.d08-arm-g');
    const hintG = crank.querySelector('.d08-hint');

    const controls = h('div', { class: 'd08-controls' }, leftCol, crank);
    const lower = h('div', { class: 'd08-lower' }, werk, controls);

    // Zettel im Deckel
    const noteTab = h('button', { class: 'd08-notetab', type: 'button', 'aria-label': 'Zettel lesen' }, '✦ Zettel');
    const note = h('div', { class: 'd08-note card', role: 'button', tabindex: '0', 'aria-label': 'Zettel zusammenfalten' },
      h('p', { class: 'd08-note-head' }, 'Laternenwalzer · für Melli'),
      // BASTI-STIMME
      h('p', { class: 'd08-note-text hand' }, 'Diese kleine Melodie gibt es nirgendwo sonst auf der Welt. Sie gehört dir.'),
      // BASTI-STIMME
      h('p', { class: 'd08-note-sign hand' }, 'Basti'));

    stage.append(scene, motes, intro, lower, note, noteTab);
    root.append(stage);

    // ------------------------------------------------------------- Zustand
    let pos = -0.35; // Abspielposition in Schlägen (wächst stetig)
    let crankAngle = 0;
    let omega = 0; // Schwung nach dem Loslassen (rad/s)
    let speed = 0; // geglättete Schläge pro Sekunde (für Figürchen)
    let auto = false;
    let completed = false;
    let barsLit = ctx.isDone ? BARS : 0;
    let started = false;
    let boxEnv = 0;
    let ratchetAcc = 0;
    let backwardsHinted = false;
    const teeth = PITCHES.map(() => ({ amp: 0, glow: 0, t0: 0 }));
    const AUTO_OMEGA = (TAU * (132 / 60)) / BEATS; // ≈ 132 Schläge/min
    let nowS = 0;

    if (ctx.isDone) {
      autoBtn.classList.add('show');
      noteTab.classList.add('show');
    }

    // ------------------------------------------------------------- Klang
    function pluck(e) {
      const f = midiHz(e.midi);
      const low = e.midi < 62;
      if (e.mel) {
        const v = 0.11;
        ctx.tone(f, { dur: 2.4, vol: v, attack: 0.003 });
        ctx.tone(f * 2, { dur: 0.9, vol: v * 0.22, attack: 0.002 });
        ctx.tone(f * 3.01, { dur: 0.35, vol: v * 0.08, attack: 0.002 });
        ctx.tone(f * 5.4, { dur: 0.07, vol: v * 0.07, attack: 0.001 });
      } else {
        const v = e.bass ? 0.075 : e.last ? 0.06 : 0.04;
        const d = e.last ? 3.2 : low ? 1.8 : 1.2;
        ctx.tone(f, { dur: d, vol: v, attack: 0.003 });
        ctx.tone(f * 2, { dur: d * 0.5, vol: v * (low ? 0.6 : 0.25), attack: 0.002 });
        if (low) ctx.tone(f * 3, { dur: d * 0.3, vol: v * 0.3, attack: 0.002 });
      }
    }
    function ratchetClick() {
      ctx.tone(2300, { dur: 0.018, vol: 0.03, type: 'triangle', attack: 0.001 });
      ctx.tone(900, { dur: 0.03, vol: 0.02, type: 'square', attack: 0.001 });
    }

    // ------------------------------------------------------------- Abspielen
    function trigger(e) {
      pluck(e);
      const th = teeth[e.tooth];
      th.amp = e.mel ? 1 : 0.6;
      th.glow = 1;
      th.t0 = nowS;
      if (e.mel) boxEnv = Math.min(1.4, boxEnv + 0.4);
      spawnMote(e);
      const b = bulbs[(e.tooth * 5) % bulbs.length];
      b.glow = 1;
    }

    function advance(beats) {
      if (beats <= 0) return;
      beats = Math.min(beats, 0.75); // wilde Schwünge nicht zu Notenlawinen werden lassen
      const p0 = pos;
      const p1 = pos + beats;
      pos = p1;
      if (!started && p1 > 0) {
        started = true;
        hintG.classList.add('off');
      }
      // Ereignisse in (p0, p1] auslösen – auch über die Walzennaht hinweg
      const k0 = Math.floor(p0 / LOOP);
      const k1 = Math.floor(p1 / LOOP);
      for (let k = k0; k <= k1; k++) {
        const base = k * LOOP;
        for (const e of EVENTS) {
          const t = base + e.t;
          if (t > p0 && t <= p1) trigger(e);
        }
      }
      const bar = Math.floor(Math.max(0, p1) / BEATS);
      if (!completed && barsLit < BARS) barsLit = Math.max(barsLit, Math.min(BARS, bar));
      if (p1 > 4 && !intro.classList.contains('gone')) intro.classList.add('gone');
      crank.setAttribute('aria-valuenow', String(bar % BARS));
      if (!completed && p1 >= LOOP + 0.5) finishRun();
    }

    function finishRun() {
      completed = true;
      barsLit = BARS;
      ctx.complete();
      ctx.store.set('gehoert', true);
      setTimeout(() => {
        if (dead) return;
        ctx.sfx.play('sparkle');
        openNote(true);
        autoBtn.classList.add('show');
      }, 900);
    }

    // ------------------------------------------------------------- Zettel
    let noteOpen = false;
    function openNote(fromLid) {
      noteOpen = true;
      noteTab.classList.remove('show');
      note.classList.toggle('from-lid', !!fromLid);
      note.classList.add('show');
      ctx.sfx.play('page');
    }
    function closeNote() {
      if (!noteOpen) return;
      noteOpen = false;
      note.classList.remove('show');
      noteTab.classList.add('show');
      ctx.sfx.play('page');
    }
    note.addEventListener('click', closeNote);
    noteTab.addEventListener('click', () => openNote(false));

    function toggleAuto() {
      auto = !auto;
      autoBtn.textContent = auto ? 'Anhalten' : 'Von selbst spielen';
      autoBtn.classList.toggle('on', auto);
      if (auto) omega = 0;
    }

    // ------------------------------------------------------------- Kurbel
    let drag = null;
    function hub() {
      const r = crank.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: r.width / 200 };
    }
    function angleAt(e, c) {
      const dx = e.clientX - c.x;
      const dy = e.clientY - c.y;
      return { a: Math.atan2(dy, dx), r: Math.hypot(dx, dy) };
    }
    crank.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      crank.setPointerCapture?.(e.pointerId);
      const c = hub();
      const { a } = angleAt(e, c);
      drag = { id: e.pointerId, c, a, last: performance.now(), w: 0 };
      omega = 0;
      if (auto) toggleAuto();
      crank.classList.add('grab');
    });
    crank.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { a, r } = angleAt(e, drag.c);
      if (r < 12 * drag.c.s) {
        drag.a = a;
        return;
      }
      let d = a - drag.a;
      if (d > Math.PI) d -= TAU;
      if (d < -Math.PI) d += TAU;
      drag.a = a;
      const now = performance.now();
      const dt = Math.max(0.008, (now - drag.last) / 1000);
      drag.last = now;
      crankAngle += d;
      if (d > 0) {
        advance((d / TAU) * BEATS);
        drag.w = drag.w * 0.6 + (d / dt) * 0.4;
      } else {
        drag.w *= 0.5;
        ratchetAcc += -d;
        while (ratchetAcc > 0.3) {
          ratchetAcc -= 0.3;
          ratchetClick();
        }
        if (!backwardsHinted && crankAngle < -1.6 - 0) {
          backwardsHinted = true;
          ctx.ui.toast('Andersrum! Spieluhren sind da eigen.');
        }
      }
    });
    const release = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      // kurzer Schwung, wenn kräftig gedreht wurde
      omega = performance.now() - drag.last < 90 ? clamp(drag.w, 0, 9) : 0;
      drag = null;
      crank.classList.remove('grab');
    };
    crank.addEventListener('pointerup', release);
    crank.addEventListener('pointercancel', release);

    // ------------------------------------------------------------- Lichtpunkte
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    {
      const g = sprite.getContext('2d');
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,250,230,1)');
      grad.addColorStop(0.18, 'rgba(255,224,150,.9)');
      grad.addColorStop(0.5, 'rgba(255,170,70,.28)');
      grad.addColorStop(1, 'rgba(255,150,60,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    }
    let mctx = null;
    let mw = 0;
    let mh = 0;
    const parts = [];
    let werkRect = { left: 0, top: 0 };
    let stageRect = { left: 0, top: 0 };
    let layout = { W: 300, H: 180, x0: 20, x1: 280, toothX: [], yP: 80, cy: 118, R: 40, plateTop: 8, plateBot: 26 };

    function spawnMote(e) {
      if (parts.length > 140) parts.shift();
      const x = werkRect.left - stageRect.left + 8 + layout.toothX[e.tooth];
      const y = werkRect.top - stageRect.top + 8 + layout.yP;
      const hi = (e.midi - 50) / 40;
      parts.push({
        x, y,
        vx: rand(-14, 14),
        vy: -(e.mel ? rand(55, 95) : rand(30, 60)),
        life: e.mel ? rand(2.6, 3.8) : rand(1.4, 2.2),
        max: 0,
        size: e.mel ? rand(14, 22) : rand(8, 12),
        sway: rand(TAU),
        hue: hi,
      });
      parts[parts.length - 1].max = parts[parts.length - 1].life;
    }

    function drawMotes(dt, t) {
      if (!mctx) return;
      mctx.clearRect(0, 0, mw, mh);
      if (!parts.length) return;
      mctx.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        p.vy *= 1 - 0.25 * dt;
        p.x += (p.vx + Math.sin(t * 1.7 + p.sway) * 16) * dt;
        p.y += p.vy * dt;
        const k = p.life / p.max;
        const fadeIn = Math.min(1, (p.max - p.life) * 6);
        mctx.globalAlpha = Math.min(1, k * 1.4) * fadeIn * (0.55 + 0.45 * Math.sin(t * 9 + p.sway) ** 2);
        const s = p.size * (0.6 + 0.4 * k);
        mctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
      }
      mctx.globalAlpha = 1;
      mctx.globalCompositeOperation = 'source-over';
    }

    // ------------------------------------------------------------- Werk zeichnen
    let wctx = null;
    function measure() {
      stageRect = stage.getBoundingClientRect();
      // Lichtpunkte-Ebene
      const k = dpr();
      mw = Math.max(1, Math.round(stageRect.width));
      mh = Math.max(1, Math.round(stageRect.height));
      motes.width = mw * k;
      motes.height = mh * k;
      mctx = motes.getContext('2d');
      mctx.setTransform(k, 0, 0, k, 0, 0);
      // Werk
      const r = werkCanvas.getBoundingClientRect();
      werkRect = werk.getBoundingClientRect();
      const W = Math.max(1, Math.round(r.width));
      const H = Math.max(1, Math.round(r.height));
      werkCanvas.width = W * k;
      werkCanvas.height = H * k;
      wctx = werkCanvas.getContext('2d');
      wctx.setTransform(k, 0, 0, k, 0, 0);
      const x0 = 26;
      const x1 = W - 12;
      const n = PITCHES.length;
      const span = x1 - x0 - 22;
      const toothX = PITCHES.map((_, i) => x0 + 11 + (span * (i + 0.5)) / n);
      const R = H * 0.235;
      const cy = H * 0.64;
      const yP = cy - R * 0.93;
      layout = { W, H, x0, x1, toothX, yP, cy, R, plateTop: H * 0.05, plateBot: H * 0.16, tw: (span / n) * 0.66, thetaP: Math.asin(0.93) };
      // Bildausschnitt: Spieluhr im Bild mittig halten
      const sw = scene.clientWidth;
      const sh = scene.clientHeight;
      const s = Math.max(sw / IMG.w, sh / IMG.h) * 1.1;
      const iw = IMG.w * s;
      const ih = IMG.h * s;
      const left = clamp(sw / 2 - IMG.box[0] * s, sw - iw, 0);
      const top = clamp(sh * 0.6 - IMG.box[1] * s, sh - ih, 0);
      bg.style.width = iw + 'px';
      bg.style.height = ih + 'px';
      bg.style.transform = `translate(${left}px, ${top}px)`;
      const at = (el, [ix, iy]) => {
        el.style.left = left + ix * s + 'px';
        el.style.top = top + iy * s + 'px';
      };
      at(candle, IMG.candle);
      at(lantern, IMG.lantern);
      at(boxGlow, IMG.diorama);
      at(noteTab, IMG.lid);
      const lidX = left + IMG.lid[0] * s;
      const lidY = top + IMG.lid[1] * s;
      note.style.setProperty('--lid-x', lidX + 'px');
      note.style.setProperty('--lid-y', lidY + 'px');
      note.style.setProperty('--scene-h', sh + 'px');
    }

    // Verlaufsfarben einmal anlegen (bei jeder Größenänderung neu)
    let grads = null;
    function makeGrads() {
      const { cy, R, plateTop, plateBot, yP, W, H } = layout;
      const g = wctx;
      const cyl = g.createLinearGradient(0, cy - R, 0, cy + R);
      cyl.addColorStop(0, '#2a1c0a');
      cyl.addColorStop(0.12, '#6b4c1c');
      cyl.addColorStop(0.3, '#d6b066');
      cyl.addColorStop(0.4, '#fff1c4');
      cyl.addColorStop(0.52, '#d9a850');
      cyl.addColorStop(0.78, '#7a5620');
      cyl.addColorStop(1, '#1e1406');
      const plate = g.createLinearGradient(0, plateTop, 0, plateBot);
      plate.addColorStop(0, '#f2f5fb');
      plate.addColorStop(0.5, '#a6aec0');
      plate.addColorStop(1, '#5d6476');
      const tooth = g.createLinearGradient(0, plateBot, 0, yP);
      tooth.addColorStop(0, '#6f7789');
      tooth.addColorStop(0.35, '#dfe5f0');
      tooth.addColorStop(1, '#8b93a6');
      const velvet = g.createRadialGradient(W / 2, H * 0.55, 10, W / 2, H * 0.55, W * 0.7);
      velvet.addColorStop(0, '#2c1a2c');
      velvet.addColorStop(1, '#0e0811');
      grads = { cyl, plate, tooth, velvet };
    }

    function drawWerk(t) {
      if (!wctx) return;
      const g = wctx;
      const { W, H, x0, x1, toothX, yP, cy, R, plateTop, plateBot, tw, thetaP } = layout;
      if (!grads) makeGrads();
      g.clearRect(0, 0, W, H);
      g.fillStyle = grads.velvet;
      g.fillRect(0, 0, W, H);

      const pm = ((pos % LOOP) + LOOP) % LOOP;
      const thetaOf = (beat) => {
        const d = (((beat - pm) % LOOP) + LOOP) % LOOP;
        let th = thetaP - (d / LOOP) * TAU;
        if (th < -Math.PI) th += TAU;
        return th;
      };

      // Walze: Schatten, Körper, Ringe
      g.fillStyle = 'rgba(0,0,0,.45)';
      g.beginPath();
      g.ellipse((x0 + x1) / 2, cy + R + 5, (x1 - x0) / 2, 5, 0, 0, TAU);
      g.fill();
      g.fillStyle = grads.cyl;
      g.beginPath();
      g.roundRect(x0, cy - R, x1 - x0, R * 2, 6);
      g.fill();
      // Laufende Nahtlinien zeigen die Drehung auch zwischen den Stiften
      g.lineWidth = 1;
      for (let k = 0; k < 24; k++) {
        const th = thetaOf(k * 3 + 1.5);
        const c = Math.cos(th);
        if (c <= 0.05) continue;
        const y = cy - R * Math.sin(th);
        g.strokeStyle = `rgba(60,36,8,${0.12 + 0.18 * c})`;
        g.beginPath();
        g.moveTo(x0 + 3, y);
        g.lineTo(x1 - 3, y);
        g.stroke();
      }
      // Zahnrad links (Kante)
      g.fillStyle = '#5a3d12';
      g.fillRect(x0 - 9, cy - R - 2, 7, R * 2 + 4);
      for (let k = 0; k < 18; k++) {
        const th = thetaOf((k * LOOP) / 18);
        const c = Math.cos(th);
        if (c <= 0) continue;
        const y = cy - R * 1.05 * Math.sin(th);
        g.fillStyle = `rgba(${150 + 90 * c},${110 + 70 * c},${40 + 30 * c},1)`;
        g.fillRect(x0 - 13, y - 2 * c, 6, 4 * c + 0.6);
      }
      // Stifte
      for (const e of EVENTS) {
        const th = thetaOf(e.t);
        const c = Math.cos(th);
        if (c <= 0) continue;
        const x = toothX[e.tooth];
        const y = cy - R * Math.sin(th);
        const r = (e.mel ? 1.5 : 1.15) + 1.0 * c;
        g.fillStyle = `rgba(40,24,4,${0.5 * c})`;
        g.beginPath();
        g.arc(x + 0.6, y + 0.9, r, 0, TAU);
        g.fill();
        g.fillStyle = `rgb(${200 + 55 * c},${170 + 70 * c},${110 + 90 * c})`;
        g.beginPath();
        g.arc(x, y, r, 0, TAU);
        g.fill();
      }
      // Glanz auf der Walze
      g.fillStyle = 'rgba(255,248,220,.10)';
      g.fillRect(x0 + 4, cy - R * 0.62, x1 - x0 - 8, R * 0.16);

      // Kamm: Zinken
      for (let i = 0; i < toothX.length; i++) {
        const th = teeth[i];
        const x = toothX[i];
        const age = t - th.t0;
        th.amp *= Math.exp(-dtFrame * 3.2);
        th.glow *= Math.exp(-dtFrame * 2.2);
        const dx = reduced ? 0 : th.amp * 2.2 * Math.sin(age * 70) ;
        const top = plateBot - 2;
        const len = yP + 3 - top;
        // Bleigewichte unter den tiefen Zinken
        if (i < 7) {
          g.fillStyle = '#3c3d48';
          g.fillRect(x - tw / 2 - 0.5 + dx * 0.6, top + len * 0.55, tw + 1, len * 0.3);
        }
        g.fillStyle = grads.tooth;
        g.beginPath();
        g.moveTo(x - tw / 2, top);
        g.lineTo(x + tw / 2, top);
        g.lineTo(x + tw / 2 + dx, top + len - 2);
        g.quadraticCurveTo(x + dx, top + len + 1.5, x - tw / 2 + dx, top + len - 2);
        g.closePath();
        g.fill();
        if (th.glow > 0.02) {
          g.fillStyle = `rgba(255,196,100,${0.75 * th.glow})`;
          g.fill();
        }
      }
      // Kammplatte mit Schrauben
      g.fillStyle = 'rgba(0,0,0,.4)';
      g.fillRect(x0 - 2, plateBot, x1 - x0 + 4, 3);
      g.fillStyle = grads.plate;
      g.beginPath();
      g.roundRect(x0 - 4, plateTop, x1 - x0 + 8, plateBot - plateTop, 3);
      g.fill();
      for (const sx of [x0 + 10, (x0 + x1) / 2, x1 - 10]) {
        const sy = (plateTop + plateBot) / 2;
        g.fillStyle = '#7a8296';
        g.beginPath();
        g.arc(sx, sy, 3.6, 0, TAU);
        g.fill();
        g.strokeStyle = '#3e4352';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(sx - 2.4, sy - 1);
        g.lineTo(sx + 2.4, sy + 1);
        g.stroke();
      }
      // Leuchten an den Zinkenspitzen
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < toothX.length; i++) {
        const gl = teeth[i].glow;
        if (gl < 0.03) continue;
        const s = 26 * (0.5 + gl);
        g.globalAlpha = gl;
        g.drawImage(sprite, toothX[i] - s / 2, yP - s / 2, s, s);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';

      // Fortschritt: 24 Takte als Lichtpunkte unten
      const curBar = Math.floor(Math.max(0, pos) / BEATS) % BARS;
      const dotsY = H - 7;
      const gap = Math.min(11, (x1 - x0 - 10) / BARS);
      const dx0 = (x0 + x1) / 2 - (gap * (BARS - 1)) / 2;
      for (let b = 0; b < BARS; b++) {
        const lit = b < barsLit || (completed && true);
        const cur = started && b === curBar;
        g.fillStyle = cur ? '#fff1c4' : lit ? 'rgba(255,197,110,.95)' : 'rgba(255,220,170,.18)';
        g.beginPath();
        g.arc(dx0 + b * gap, dotsY, cur ? 2.6 : 1.8, 0, TAU);
        g.fill();
      }
    }

    // ------------------------------------------------------------- Figürchen
    let lastZ = [0, 0];
    function drawFigures(dt) {
      const r = turntable.clientWidth;
      const cx = r / 2;
      const cy = r * (44 / 160); // Mitte des Filzes (SVG 160 × 80)
      const rx = r * (50 / 160);
      const ry = r * (15 / 160);
      const phi = (pos / 12) * TAU;
      const moving = clamp(speed / 2.2, 0, 1);
      const beatFrac = ((pos % 1) + 1) % 1;
      const barFrac = ((pos % 3) + 3) % 3;
      figs.forEach((f, k) => {
        const a = phi + f.off;
        const depth = (Math.sin(a) + 1) / 2;
        const sc = 0.78 + 0.22 * depth;
        const x = cx + rx * Math.cos(a);
        const y = cy + ry * Math.sin(a);
        const flip = -Math.sin(a) < 0 ? -1 : 1;
        let hop = 0;
        if (!reduced && started) {
          if (f.who === 'lorelai') hop = 9 * moving * Math.abs(Math.sin(Math.PI * beatFrac));
          else hop = 12 * moving * Math.max(0, Math.sin((Math.PI * barFrac) / 1.5)) * (barFrac < 1.5 ? 1 : 0);
        }
        f.wrap.style.transform = `translate(${x}px, ${y - hop}px) translate(-50%, -88%) scale(${sc * flip}, ${sc})`;
        const z = depth > 0.5 ? 3 : 1;
        if (lastZ[k] !== z) {
          f.wrap.style.zIndex = z;
          lastZ[k] = z;
        }
      });
      // Lämpchen am Rand der Drehbühne
      bulbs.forEach((b, i) => {
        const a = phi + (i * TAU) / bulbs.length;
        const x = 80 + 71 * Math.cos(a);
        const y = 45 + 24.5 * Math.sin(a);
        b.glow *= Math.exp(-dt * 3);
        const depth = (Math.sin(a) + 1) / 2;
        b.el.setAttribute('cx', x.toFixed(1));
        b.el.setAttribute('cy', y.toFixed(1));
        b.el.setAttribute('opacity', (0.25 + 0.35 * depth + 0.6 * b.glow).toFixed(2));
        b.el.setAttribute('r', (1.8 + 0.9 * depth + 1.4 * b.glow).toFixed(1));
      });
    }

    // ------------------------------------------------------------- Schleife
    let dtFrame = 0.016;
    let lastPos = pos;
    const stopLoop = ctx.fx.loop((dt, t) => {
      if (document.hidden) return;
      dtFrame = dt;
      nowS = t;
      if (!drag) {
        let d = 0;
        if (auto) d = AUTO_OMEGA * dt;
        else if (omega > 0.05) {
          d = omega * dt;
          omega *= Math.exp(-dt * 4.5);
        } else omega = 0;
        if (d > 0) {
          crankAngle += d;
          advance((d / TAU) * BEATS);
        }
      }
      const inst = (pos - lastPos) / Math.max(dt, 0.001);
      lastPos = pos;
      speed += (inst - speed) * Math.min(1, dt * 6);
      armG.setAttribute('transform', `rotate(${((crankAngle * 180) / Math.PI).toFixed(2)})`);
      boxEnv *= Math.exp(-dt * 1.6);
      boxGlow.style.opacity = (0.15 + Math.min(1, boxEnv) * 0.75).toFixed(3);
      drawWerk(t);
      drawFigures(dt);
      drawMotes(dt, t);
    });

    // ------------------------------------------------------------- Größe
    const onResize = () => {
      measure();
      grads = null;
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(stage);
    onResize();
    let dead = false;

    return () => {
      dead = true;
      stopLoop();
      ro.disconnect();
    };
  },
};
