// Türchen 11 · Ein Kerzenmoment – eine gezeichnete Kerze, sechs Atemzüge, ein Gedicht.
import './d11.css';

const LINES = [
  'Nichts muss jetzt passieren.',
  'Der Tag darf draußen warten.',
  'Schultern runter. Kiefer locker.',
  'Nur das Licht und du.',
  'Kein Gedanke muss zu Ende gedacht werden.',
  'So. Ganz in Ruhe.',
];

const POEM = [
  'Ein Docht, ein Funke, dann ein Licht,',
  'das nichts verlangt und nichts verspricht.',
  'Es zittert leicht und bleibt doch stehn,',
  'als hätt’ es Zeit, nicht fortzugehn.',
  'Der Abend wird ein kleines Haus –',
  'und draußen schneit die Welt sich aus.',
];

const IN_S = 4;
const OUT_S = 6;
const BREATHS = 6;

function makeNoise(seed = 0) {
  const p = Array.from({ length: 256 }, () => Math.random());
  return (x) => {
    x += seed;
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return p[i & 255] * (1 - u) + p[(i + 1) & 255] * u;
  };
}

function sprite(r, rgb) {
  const c = document.createElement('canvas');
  c.width = c.height = r * 2;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, `rgba(${rgb},1)`);
  gr.addColorStop(0.5, `rgba(${rgb},0.35)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, r * 2, r * 2);
  return c;
}

const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
const backOut = (x) => {
  const c = 1.4;
  x = Math.min(1, Math.max(0, x)) - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
};

export default {
  mount(root, ctx) {
    const { h, button, haptic } = ctx.ui;
    const { loop, fitCanvas, rand, lerp } = ctx.fx;
    const timers = new Set();
    const later = (fn, ms) => {
      const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
      timers.add(id);
    };
    ctx.setHeader('hidden');

    const canvas = h('canvas', { class: 'd11-canvas', 'aria-hidden': 'true' });
    const words = h('div', { class: 'd11-words', 'aria-live': 'polite' });
    const cue = h('div', { class: 'd11-cue' });
    const cueWord = h('p', { class: 'd11-cue-word' });
    const dots = h('div', { class: 'd11-dots' }, Array.from({ length: BREATHS }, () => h('span')));
    cue.append(cueWord, dots);
    const actions = h('div', { class: 'd11-actions' });
    root.append(canvas, words, cue, actions);
    root.classList.add('d11-root');

    // ---------- Zustand ----------
    let phase = 'dark'; // dark | igniting | ready | breath | poem | idle | out
    let lit = 0; // 0..1 Flammengröße
    let litTarget = 0;
    let ignitedAt = 0;
    let breath = 0; // 0..1
    let breathT = 0;
    let breathN = 0;
    let melt = 0; // wächst, solange die Kerze brennt
    let ember = 0; // Glut am Docht nach dem Auspusten
    let smokeOn = 0;
    let canTap = false;

    // ---------- Text ----------
    function say(text, { cls = '', hold = 0, fade = 900 } = {}) {
      const p = h('p', { class: `d11-line ${cls}`.trim() }, text);
      words.replaceChildren(p);
      requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('in')));
      if (hold) later(() => p.classList.remove('in'), hold);
      return p;
    }
    function clearWords() {
      for (const p of words.children) p.classList.remove('in');
    }

    function setActions(...btns) {
      actions.replaceChildren(...btns);
      actions.classList.toggle('in', btns.length > 0);
    }

    // ---------- Ablauf ----------
    function intro() {
      phase = 'dark';
      canTap = false;
      setActions();
      later(() => say('Wenn du magst, zünde dir jetzt eine echte Kerze an.'), 900);
      later(() => {
        const p = h('p', { class: 'd11-line d11-hint' }, 'Und dann tippe auf diesen Docht.');
        words.append(p);
        requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('in')));
        canTap = true;
      }, ctx.reducedMotion ? 1200 : 4200);
      later(() => { canTap = true; }, 1500);
    }

    function ignite() {
      if (phase !== 'dark' && phase !== 'out') return;
      const again = phase === 'out';
      phase = 'igniting';
      canTap = false;
      clearWords();
      setActions();
      ctx.sfx.hiss({ dur: 0.5, vol: 0.07, from: 700, to: 3800 });
      ctx.sfx.bell(392, { vol: 0.05, dur: 2.4, at: 0.35 });
      haptic(14);
      litTarget = 1;
      ignitedAt = performance.now();
      ember = 0;
      if (again) {
        later(() => idle(), 1600);
        return;
      }
      later(() => {
        phase = 'ready';
        say('Lass uns ein paar Mal atmen. Die Flamme atmet mit.');
      }, 2200);
      later(() => startBreath(), 6400);
    }

    function startBreath() {
      phase = 'breath';
      breathT = 0;
      breathN = 0;
      clearWords();
      cue.classList.add('in');
      lineFor(0);
    }

    function lineFor(n) {
      later(() => { if (phase === 'breath') say(LINES[n], { hold: (IN_S + OUT_S) * 1000 - 2200 }); }, 900);
    }

    function poem() {
      phase = 'poem';
      cue.classList.remove('in');
      clearWords();
      const box = h('div', { class: 'd11-poem' });
      const ls = POEM.map((t) => h('p', { class: 'd11-pline' }, t));
      // BASTI-STIMME
      const basti = h('p', { class: 'd11-basti hand' }, 'Schön, dass es dich gibt.');
      box.append(...ls, basti);
      later(() => {
        words.replaceChildren(box);
        [...ls, basti].forEach((el, i) => later(() => el.classList.add('in'), (ctx.reducedMotion ? 200 : 1700) * i + 300));
        later(() => {
          ctx.complete();
          idle();
        }, (ctx.reducedMotion ? 200 : 1700) * (ls.length + 1) + 1200);
      }, 1400);
    }

    function idle() {
      phase = 'idle';
      setActions(
        button('Noch einmal atmen', () => { setActions(); startBreath(); }, { variant: 'ghost small' }),
        button('Auspusten', () => blowOut(), { variant: 'ghost small' }));
    }

    function blowOut() {
      phase = 'out';
      setActions();
      ctx.sfx.hiss({ dur: 0.8, vol: 0.06, from: 1200, to: 300, q: 0.4 });
      litTarget = 0;
      ember = 1;
      smokeOn = 1;
      later(() => { smokeOn = 0; }, 2600);
      say('Gute Nacht, kleine Flamme.', { cls: 'd11-soft' });
      later(() => {
        const p = h('p', { class: 'd11-line d11-hint' }, 'Antippen zündet sie wieder an.');
        words.append(p);
        requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('in')));
        canTap = true;
      }, 2600);
    }

    canvas.addEventListener('pointerdown', () => {
      if (!canTap) return;
      if (phase === 'dark' || phase === 'out') ignite();
    });

    // ---------- Zeichnen ----------
    let W = 360, H = 740, g = null;
    let L = {};
    const fit = () => {
      const r = fitCanvas(canvas);
      W = r.w;
      H = r.h;
      g = r.ctx;
      const base = H * 0.885;
      const ch = Math.min(H * 0.22, 190);
      const cw = Math.min(W * 0.26, 104);
      L = { cx: W / 2, base, ch, cw, top: base - ch, fh: Math.min(ch * 0.5, 88) };
      const flameTop = L.top - 14 - L.fh * 1.3;
      root.style.setProperty('--d11-text-h', Math.max(160, flameTop - 24) + 'px');
      root.style.setProperty('--d11-base', base + 'px');
    };
    requestAnimationFrame(fit);
    window.addEventListener('resize', fit);

    const n1 = makeNoise(0), n2 = makeNoise(37), n3 = makeNoise(91);
    const smokeImg = sprite(32, '170,165,180');
    const smoke = [];
    const sparks = [];
    let gust = 0;
    let gustNext = 8;
    const drips = [
      { a: 0.38, len: 0.1, w: 0.075, grow: 0.9 },
      { a: 0.66, len: 0.05, w: 0.06, grow: 1.4 },
      { a: 0.2, len: 0.02, w: 0.05, grow: 0.6 },
    ];

    function tear(cx, base, w, hgt, dx) {
      g.beginPath();
      g.moveTo(cx, base + w * 0.32);
      g.bezierCurveTo(cx + w * 1.1, base + w * 0.28, cx + w * 0.95 + dx * 0.2, base - hgt * 0.36, cx + dx, base - hgt);
      g.bezierCurveTo(cx - w * 0.95 + dx * 0.2, base - hgt * 0.36, cx - w * 1.1, base + w * 0.28, cx, base + w * 0.32);
      g.closePath();
    }

    const stop = loop((dt, t) => {
      if (document.hidden || !g || !L.cx) return;

      // Zustände fortschreiben
      const k = litTarget > lit ? 1.4 : 4;
      lit += (litTarget - lit) * Math.min(1, dt * k);
      if (litTarget === 1 && lit > 0.995) lit = 1;
      if (litTarget === 0 && lit < 0.003) lit = 0;
      if (lit > 0.5) melt = Math.min(1, melt + dt / 90);
      if (ember > 0 && litTarget === 0) ember = Math.max(0, ember - dt / 3.5);
      if (phase === 'breath') {
        breathT += dt;
        const cyc = IN_S + OUT_S;
        const n = Math.floor(breathT / cyc);
        if (n !== breathN) {
          breathN = n;
          if (n < BREATHS) lineFor(n);
        }
        const tc = breathT - n * cyc;
        if (n >= BREATHS) {
          breath = Math.max(0, breath - dt);
          poem();
        } else {
          const inhale = tc < IN_S;
          breath = inhale ? ease(tc / IN_S) : 1 - ease((tc - IN_S) / OUT_S);
          const word = inhale ? 'einatmen' : 'ausatmen';
          if (cueWord.textContent !== word) {
            cueWord.textContent = word;
            cueWord.classList.remove('pulse');
            void cueWord.offsetWidth;
            cueWord.classList.add('pulse');
          }
          [...dots.children].forEach((d, i) => d.classList.toggle('on', i < n || (i === n && !inhale)));
        }
      } else {
        breath += (0 - breath) * Math.min(1, dt * 0.8);
      }

      // Böen
      gustNext -= dt;
      if (gustNext < 0) {
        gust = 1;
        gustNext = rand(7, 15);
      }
      gust = Math.max(0, gust - dt * 0.7);

      // Grow-in beim Anzünden
      const sinceIgn = (performance.now() - ignitedAt) / 1000;
      const grow = litTarget === 1 ? backOut(sinceIgn / 1.5) * lit : lit;

      const { cx, base, ch, cw, top, fh } = L;
      const rx = cw / 2;
      const ry = cw * 0.13;
      const f1 = n1(t * 1.6) - 0.5;
      const f2 = n2(t * 4.7) - 0.5;
      const f3 = n3(t * 11.3) - 0.5;
      const gustWave = gust * Math.sin(t * 13) * 0.8;
      const dx = (f1 * 9 + f2 * 4 + gustWave * 7) * (1 - breath * 0.35);
      const flick = 1 + f2 * 0.12 + f3 * 0.07 + gust * f3 * 0.3;
      const light = grow * (0.86 + f2 * 0.16 + f3 * 0.1 + breath * 0.32);
      const wickTop = top - 13;
      const fBase = wickTop + 4;
      const fH = fh * (0.8 + breath * 0.42) * flick * Math.max(0.0001, grow);
      const fW = (cw * 0.13) * (0.9 + breath * 0.16) * Math.max(0.0001, Math.min(1, grow * 1.2));
      const fy = fBase - fH * 0.45;

      // Raum
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#040309';
      g.fillRect(0, 0, W, H);
      // Tischfläche
      const tableY = base - ry * 0.4;
      const tg = g.createLinearGradient(0, tableY - 40, 0, H);
      tg.addColorStop(0, 'rgba(26,16,14,0)');
      tg.addColorStop(0.12, 'rgba(26,16,14,1)');
      tg.addColorStop(1, '#0a0608');
      g.fillStyle = tg;
      g.fillRect(0, tableY - 40, W, H - tableY + 40);

      // Lichthof, der den Raum färbt
      if (light > 0.002) {
        const R = Math.max(W, H) * (0.62 + light * 0.18);
        const rg = g.createRadialGradient(cx, fy, 0, cx, fy, R);
        rg.addColorStop(0, `rgba(255,176,96,${0.34 * light})`);
        rg.addColorStop(0.18, `rgba(226,120,56,${0.17 * light})`);
        rg.addColorStop(0.45, `rgba(120,50,40,${0.07 * light})`);
        rg.addColorStop(1, 'rgba(40,10,20,0)');
        g.fillStyle = rg;
        g.fillRect(0, 0, W, H);
        // Lichtfleck auf dem Tisch
        const lg = g.createRadialGradient(cx, base, 0, cx, base, cw * 2.6);
        lg.addColorStop(0, `rgba(255,170,90,${0.28 * light})`);
        lg.addColorStop(1, 'rgba(255,170,90,0)');
        g.save();
        g.translate(cx, base);
        g.scale(1, 0.28);
        g.translate(-cx, -base);
        g.fillStyle = lg;
        g.beginPath();
        g.arc(cx, base, cw * 2.6, 0, 6.283);
        g.fill();
        g.restore();
      }

      // Schatten unter der Kerze
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.beginPath();
      g.ellipse(cx, base + 2, rx * 1.12, ry * 1.25, 0, 0, 6.283);
      g.fill();

      // Kerzenkörper
      const bright = 0.16 + 0.84 * Math.min(1, light * 1.05);
      g.save();
      g.beginPath();
      g.moveTo(cx - rx, top);
      g.lineTo(cx - rx, base);
      g.ellipse(cx, base, rx, ry, 0, Math.PI, 0, true);
      g.lineTo(cx + rx, top);
      g.ellipse(cx, top, rx, ry, 0, 0, Math.PI);
      g.closePath();
      g.clip();
      const bg = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
      bg.addColorStop(0, '#7a6450');
      bg.addColorStop(0.22, '#d9c4a6');
      bg.addColorStop(0.45, '#f4e6cc');
      bg.addColorStop(0.75, '#cdb594');
      bg.addColorStop(1, '#5e4a3a');
      g.fillStyle = bg;
      g.fillRect(cx - rx - 2, top - ry - 2, cw + 4, ch + ry * 2 + 4);
      // durchscheinendes Wachs nahe der Flamme
      const sg = g.createLinearGradient(0, top - ry, 0, top + ch * 0.75);
      sg.addColorStop(0, `rgba(255,170,80,${0.55 * light})`);
      sg.addColorStop(0.35, `rgba(255,140,60,${0.18 * light})`);
      sg.addColorStop(1, 'rgba(255,140,60,0)');
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = sg;
      g.fillRect(cx - rx - 2, top - ry - 2, cw + 4, ch + ry * 2 + 4);
      g.globalCompositeOperation = 'source-over';
      // Wachstropfen
      for (const d of drips) {
        const ang = Math.PI * d.a;
        const x = cx + Math.cos(ang) * rx * 0.98;
        const y0 = top + Math.sin(ang) * ry;
        const len = ch * (d.len + melt * 0.22 * d.grow);
        const w = cw * d.w * Math.sin(ang);
        const dg = g.createLinearGradient(x - w, 0, x + w, 0);
        dg.addColorStop(0, 'rgba(200,180,150,0.9)');
        dg.addColorStop(0.4, 'rgba(255,246,228,0.95)');
        dg.addColorStop(1, 'rgba(170,148,120,0.9)');
        g.fillStyle = dg;
        g.beginPath();
        g.moveTo(x - w * 1.4, y0 - 1);
        g.bezierCurveTo(x - w, y0 + len * 0.3, x - w * 0.8, y0 + len * 0.8, x - w * 0.95, y0 + len);
        g.arc(x, y0 + len, w * 0.95, Math.PI, 0, true);
        g.bezierCurveTo(x + w * 0.8, y0 + len * 0.8, x + w, y0 + len * 0.3, x + w * 1.4, y0 - 1);
        g.closePath();
        g.fill();
      }
      // Gesamthelligkeit
      g.fillStyle = `rgba(4,3,9,${1 - bright})`;
      g.fillRect(cx - rx - 2, top - ry - 2, cw + 4, ch + ry * 2 + 4);
      g.restore();

      // Oberseite mit Wachssee
      const topG = g.createLinearGradient(0, top - ry, 0, top + ry);
      topG.addColorStop(0, '#e9d7b8');
      topG.addColorStop(1, '#fff3dc');
      g.fillStyle = topG;
      g.beginPath();
      g.ellipse(cx, top, rx, ry, 0, 0, 6.283);
      g.fill();
      const pool = Math.min(1, melt * 4 + (lit > 0.5 ? 0.15 : 0));
      if (pool > 0.01) {
        const pg = g.createRadialGradient(cx, top + ry * 0.1, 0, cx, top, rx * 0.8);
        pg.addColorStop(0, `rgba(255,200,120,${0.75 * pool})`);
        pg.addColorStop(0.7, `rgba(236,170,96,${0.55 * pool})`);
        pg.addColorStop(1, 'rgba(236,170,96,0)');
        g.fillStyle = pg;
        g.beginPath();
        g.ellipse(cx, top + ry * 0.06, rx * 0.82, ry * 0.76, 0, 0, 6.283);
        g.fill();
        // Spiegelung der Flamme im flüssigen Wachs
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = `rgba(255,236,190,${0.5 * pool * light})`;
        g.beginPath();
        g.ellipse(cx + dx * 0.3, top + ry * 0.3, fW * 0.9, ry * 0.18, 0, 0, 6.283);
        g.fill();
        g.globalCompositeOperation = 'source-over';
      }
      g.fillStyle = `rgba(4,3,9,${(1 - bright) * 0.85})`;
      g.beginPath();
      g.ellipse(cx, top, rx, ry, 0, 0, 6.283);
      g.fill();

      // Docht
      const wickBend = dx * 0.08;
      g.strokeStyle = '#1b1310';
      g.lineWidth = 2.4;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cx, top + ry * 0.1);
      g.quadraticCurveTo(cx + 0.5, top - 7, cx + 1.8 + wickBend, wickTop);
      g.stroke();
      const glowWick = Math.max(lit, ember);
      if (glowWick > 0.01) {
        g.globalCompositeOperation = 'lighter';
        const eg = g.createRadialGradient(cx + 1.8, wickTop + 1, 0, cx + 1.8, wickTop + 1, 6);
        eg.addColorStop(0, `rgba(255,120,40,${0.95 * glowWick})`);
        eg.addColorStop(1, 'rgba(255,60,20,0)');
        g.fillStyle = eg;
        g.beginPath();
        g.arc(cx + 1.8, wickTop + 1, 6, 0, 6.283);
        g.fill();
        g.globalCompositeOperation = 'source-over';
      }

      // Hinweis-Leuchten am dunklen Docht
      if ((phase === 'dark' || phase === 'out') && canTap && lit < 0.05) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
        const hg = g.createRadialGradient(cx, wickTop, 0, cx, wickTop, 34);
        hg.addColorStop(0, `rgba(255,200,130,${0.18 + 0.12 * pulse})`);
        hg.addColorStop(1, 'rgba(255,200,130,0)');
        g.fillStyle = hg;
        g.beginPath();
        g.arc(cx, wickTop, 34, 0, 6.283);
        g.fill();
      }

      // Flamme
      if (grow > 0.01) {
        const fx = cx + 1.5;
        g.globalCompositeOperation = 'lighter';
        // Halo
        const hR = fH * 1.9 + 20;
        const halo = g.createRadialGradient(fx + dx * 0.4, fy, 0, fx + dx * 0.4, fy, hR);
        halo.addColorStop(0, `rgba(255,190,110,${0.42 * light})`);
        halo.addColorStop(0.35, `rgba(255,140,60,${0.12 * light})`);
        halo.addColorStop(1, 'rgba(255,120,40,0)');
        g.fillStyle = halo;
        g.beginPath();
        g.arc(fx + dx * 0.4, fy, hR, 0, 6.283);
        g.fill();
        // äußere Flamme
        g.shadowColor = 'rgba(255,150,50,0.9)';
        g.shadowBlur = 16;
        tear(fx, fBase, fW * 1.25, fH * 1.06, dx * 1.15);
        const og = g.createRadialGradient(fx, fBase - fH * 0.22, 0, fx, fBase - fH * 0.3, fH * 0.95);
        og.addColorStop(0, 'rgba(255,214,140,0.9)');
        og.addColorStop(0.45, 'rgba(255,150,52,0.7)');
        og.addColorStop(0.8, 'rgba(230,90,24,0.35)');
        og.addColorStop(1, 'rgba(200,60,10,0)');
        g.fillStyle = og;
        g.fill();
        g.shadowBlur = 0;
        // mittlere Flamme
        tear(fx, fBase, fW * 0.92, fH * 0.86, dx * 0.95);
        const mg = g.createLinearGradient(0, fBase, 0, fBase - fH * 0.86);
        mg.addColorStop(0, 'rgba(255,200,110,0.25)');
        mg.addColorStop(0.2, 'rgba(255,226,150,0.85)');
        mg.addColorStop(0.75, 'rgba(255,170,70,0.55)');
        mg.addColorStop(1, 'rgba(255,140,50,0)');
        g.fillStyle = mg;
        g.fill();
        // blauer Fuß
        const bgr = g.createRadialGradient(fx, fBase + fW * 0.1, 0, fx, fBase + fW * 0.1, fW * 1.1);
        bgr.addColorStop(0, 'rgba(90,120,255,0.55)');
        bgr.addColorStop(1, 'rgba(60,80,220,0)');
        g.fillStyle = bgr;
        g.beginPath();
        g.ellipse(fx, fBase + fW * 0.1, fW * 1.1, fW * 0.75, 0, 0, 6.283);
        g.fill();
        g.globalCompositeOperation = 'source-over';
        // heller Kern
        tear(fx, fBase - fH * 0.05, fW * 0.55, fH * 0.5, dx * 0.5);
        const cg = g.createLinearGradient(0, fBase, 0, fBase - fH * 0.55);
        cg.addColorStop(0, 'rgba(255,250,235,0.15)');
        cg.addColorStop(0.25, 'rgba(255,252,240,0.92)');
        cg.addColorStop(1, 'rgba(255,240,200,0)');
        g.fillStyle = cg;
        g.fill();
        // dunkle Zone direkt um den Docht
        g.fillStyle = 'rgba(130,56,22,0.3)';
        g.beginPath();
        g.ellipse(fx, fBase - fH * 0.04, fW * 0.2, fH * 0.07, 0, 0, 6.283);
        g.fill();

        // seltene Fünkchen
        if (Math.random() < dt * 0.25 * grow) sparks.push({ x: fx + dx, y: fBase - fH, vx: rand(-8, 8), vy: rand(-40, -22), life: rand(0.8, 1.4), age: 0 });
      }
      if (sparks.length) {
        g.globalCompositeOperation = 'lighter';
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          s.age += dt;
          if (s.age > s.life) { sparks.splice(i, 1); continue; }
          s.x += s.vx * dt + Math.sin(t * 6 + i) * 0.3;
          s.y += s.vy * dt;
          g.fillStyle = `rgba(255,190,110,${0.8 * (1 - s.age / s.life)})`;
          g.beginPath();
          g.arc(s.x, s.y, 1.1, 0, 6.283);
          g.fill();
        }
        g.globalCompositeOperation = 'source-over';
      }

      // Rauch nach dem Auspusten
      if (smokeOn && Math.random() < dt * 22) smoke.push({ x: cx + 1.8, y: wickTop, age: 0, life: rand(2.5, 3.8), ph: rand(6.28), amp: rand(6, 16), r0: 2, r1: rand(14, 26), vy: rand(28, 40) });
      for (let i = smoke.length - 1; i >= 0; i--) {
        const s = smoke[i];
        s.age += dt;
        if (s.age > s.life) { smoke.splice(i, 1); continue; }
        const q = s.age / s.life;
        const x = s.x + Math.sin(s.ph + s.age * 2.2) * s.amp * q + q * q * 14;
        const y = s.y - s.vy * s.age;
        const r = lerp(s.r0, s.r1, q);
        g.globalAlpha = 0.16 * Math.sin(Math.PI * q);
        g.drawImage(smokeImg, x - r, y - r, r * 2, r * 2);
      }
      g.globalAlpha = 1;

      // Vignette
      const vg = g.createRadialGradient(cx, H * 0.55, Math.min(W, H) * 0.3, cx, H * 0.55, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.6)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
    });

    intro();

    return () => {
      stop();
      timers.forEach((id) => clearTimeout(id));
      window.removeEventListener('resize', fit);
      root.classList.remove('d11-root');
    };
  },
};
