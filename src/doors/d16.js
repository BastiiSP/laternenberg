// Türchen 16 · Badezeit – Seifenblasen, dann ein stiller Bademodus mit Kerzenschein, Dampf und Timer.
import './d16.css';

const BUBBLES = [
  'Einmal tief durchatmen.',
  'Der Berg hat heute Pause.',
  'Schultern runter. Kiefer locker.',
  'Sogar Lorelai wäre kurz still. Vielleicht.',
  'Ein bisschen Ruhe passt in jede Wanne.',
  'Nichts muss jetzt fertig werden.',
];
// x, y (% der Blasenfläche), Größe in px, Schwebedauer, Verzögerung
const SPOTS = [
  [8, 8, 70, 7.2, 0], [58, 4, 58, 6.1, -2.1], [30, 38, 78, 8.4, -4], [72, 42, 64, 6.8, -1.2],
  [6, 70, 60, 7.7, -3], [52, 74, 72, 7, -5.2],
];
const RAIL = [
  'Atme ruhig ein und aus.',
  'Lass die Schultern sinken.',
  'Das Wasser darf warten.',
  'Der Berg wartet gern.',
  'Nichts muss gerade sein.',
];
// Kerzenflammen und Laternen im Bild (Anteile an der Bildbreite/-höhe)
const GLOWS = [
  [15.6, 67.4, 52, 0], [20.8, 70.2, 52, -.7], [79, 74.6, 54, -1.4], [75, 77.8, 46, -.3], [79, 85.4, 54, -2], [73.4, 88.7, 46, -1.1],
  [24.8, 55.2, 34, -.5], [34, 55.5, 30, -1.7], [27.6, 41.4, 90, -.9], [9.5, 67.5, 80, -2.3], [88.8, 75.5, 84, -1.6], [10.7, 46.9, 130, -.2],
];
const pad = (n) => String(n).padStart(2, '0');
export const remainingMs = (end, now) => Math.max(0, end - now);

function makeNoise(seed = 0) {
  const p = Array.from({ length: 256 }, () => Math.random());
  return (x) => {
    x += seed;
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return p[i & 255] * (1 - u) + p[(i + 1) & 255] * u;
  };
}
function sprite(r, rgb, mid = 0.35) {
  const c = document.createElement('canvas');
  c.width = c.height = r * 2;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, `rgba(${rgb},1)`);
  gr.addColorStop(0.5, `rgba(${rgb},${mid})`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, r * 2, r * 2);
  return c;
}

export default {
  mount(root, ctx) {
    const { h, button } = ctx.ui;
    const fast = location.hash.includes('schnell');
    const minute = fast ? 1000 : 60000;
    const duration = (minutes) => minutes * minute;

    // ---------- Bühne: das Bild in einem 2:3-Behälter, der wie „cover“ füllt ----------
    const artbox = h('div', { class: 'd16-artbox', 'aria-hidden': 'true' });
    const art = h('div', { class: 'd16-art' },
      h('img', { class: 'd16-img', src: ctx.img('d16-bad'), alt: '', draggable: 'false' }));
    GLOWS.forEach(([x, y, size, delay]) => {
      art.append(h('i', { class: 'd16-glow', style: { left: `${x}%`, top: `${y}%`, width: `${size}px`, height: `${size}px`, animationDelay: `${delay}s` } }));
    });
    [[52, 47, 220, 0], [60, 40, 180, -6], [44, 52, 200, -12], [72, 45, 140, -3]].forEach(([x, y, size, delay], i) => {
      art.append(h('i', { class: `d16-puff d16-puff-${i % 2}`, style: { left: `${x}%`, top: `${y}%`, width: `${size}px`, height: `${size}px`, animationDelay: `${delay}s` } }));
    });
    artbox.append(art);
    const snowCanvas = h('canvas', { class: 'd16-snow', 'aria-hidden': 'true' });
    const shade = h('div', { class: 'd16-shade', 'aria-hidden': 'true' });
    const content = h('div', { class: 'd16-content' });
    const stage = h('div', { class: 'stage-fill d16-stage' }, content);
    root.append(artbox, snowCanvas, shade, stage);
    root.classList.add('d16-root');

    let snow = null;
    try {
      snow = new ctx.fx.Snow(snowCanvas, { density: 0.35, wind: 8 });
      snow.start();
    } catch { snow = null; }

    // ---------- Zustand ----------
    let timer = null, chordTimer = null, railTimer = null, wake = null;
    let stopped = false, end = 0, started = 0, soundOn = true, bath = null, bathStop = null;
    let popped = 0, completedByBubbles = false;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };

    const stopSound = () => { clearInterval(chordTimer); chordTimer = null; ctx.music.stop({ fade: 600 }); };
    const releaseWake = () => { const lock = wake; wake = null; try { lock?.release?.().catch(() => {}); } catch { /* egal */ } };
    async function requestWake() {
      if (stopped || !end || document.hidden || wake) return;
      try {
        const lock = (await navigator.wakeLock?.request('screen')) || null;
        if (stopped || !end || document.hidden || wake) lock?.release?.().catch(() => {});
        else {
          wake = lock;
          lock?.addEventListener?.('release', () => { if (wake === lock) wake = null; });
        }
      } catch { wake = null; }
    }
    function onVisibility() {
      if (document.hidden) releaseWake();
      else { requestWake(); if (end) tick(); }
    }
    document.addEventListener('visibilitychange', onVisibility);

    // ---------- Klangkulisse ----------
    function softChord() {
      if (document.hidden || stopped || !end || !soundOn) return;
      const groups = [[174.61, 261.63, 349.23], [196, 293.66, 392], [164.81, 246.94, 329.63]];
      const notes = groups[Math.floor(Date.now() / 6500) % groups.length];
      notes.forEach((freq, i) => ctx.tone(freq, { dur: 6.2, vol: 0.012, at: i * 0.12, attack: 1.6 }));
    }
    const startChords = () => { if (!chordTimer && !stopped && end) { softChord(); chordTimer = setInterval(softChord, 6500); } };
    let hasBathTrack = false;
    function playBathTrack() {
      const audio = ctx.music.play('/audio/bad.mp3', { loop: true, volume: 0.6, fade: 2400 });
      audio.addEventListener('error', startChords, { once: true });
    }
    async function startAudio() {
      let exists = false;
      try {
        const response = await fetch('/audio/bad.mp3', { method: 'HEAD' });
        exists = response.ok && /^audio\//i.test(response.headers.get('content-type') || '');
      } catch { /* offline oder nicht vorhanden */ }
      if (stopped || !end) return;
      hasBathTrack = exists;
      if (!exists) startChords();
      else if (soundOn) playBathTrack(); // „Klang aus“ gilt auch, wenn es während der Prüfung gewählt wurde; Einschalten holt es nach
    }
    function toggleSound(btn) {
      soundOn = !soundOn;
      const el = ctx.music.element;
      if (el) { if (soundOn) el.play().catch(() => {}); else el.pause(); }
      else if (soundOn && hasBathTrack && end && !stopped) playBathTrack();
      btn.textContent = soundOn ? 'Klang aus' : 'Klang an';
      btn.setAttribute('aria-pressed', soundOn ? 'false' : 'true');
    }
    // Klangschale: Grundton mit weichen Obertönen, lange Ausklingzeit
    function singingBowl() {
      const f = 196;
      ctx.sfx.bell(f, { vol: 0.15, dur: 6 });
      ctx.sfx.bell(f * 2.76, { vol: 0.05, dur: 4, at: 0.02 });
      ctx.sfx.bell(f * 5.4, { vol: 0.02, dur: 2.4, at: 0.04 });
      ctx.sfx.bell(f * 1.5, { vol: 0.05, dur: 5, at: 1.1 });
    }

    // ---------- Seifenblasen ----------
    function intro() {
      ctx.setHeader('dark');
      stage.classList.remove('d16-finishing');
      popped = 0;
      const field = h('div', { class: 'd16-field', role: 'group', 'aria-label': 'Seifenblasen' });
      const dots = h('div', { class: 'd16-dots', 'aria-hidden': 'true' }, BUBBLES.map(() => h('i')));
      const thought = h('p', { class: 'd16-thought', role: 'status' }, 'Tipp eine Seifenblase an.');
      const again = button('Neue Blasen', () => { content.classList.add('d16-swap'); later(() => { intro(); content.classList.remove('d16-swap'); }, 220); }, { variant: 'small' });
      again.classList.add('d16-again', 'ghost');
      again.hidden = true;
      let swapTimer = 0;
      const say = (text) => {
        thought.classList.remove('in');
        clearTimeout(swapTimer);
        swapTimer = setTimeout(() => { thought.textContent = text; thought.classList.add('in'); }, 140);
        timers.add(swapTimer);
      };
      BUBBLES.forEach((line, i) => {
        const [x, y, size, dur, delay] = SPOTS[i];
        const b = h('button', {
          class: 'd16-bubble', type: 'button', 'aria-label': `Seifenblase ${i + 1} zerplatzen lassen`,
          style: { left: `${x}%`, top: `${y}%`, width: `${size}px`, height: `${size}px`, '--d': `${dur}s`, '--dl': `${delay}s` },
        }, h('span', { class: 'd16-bub-in' }, h('i', { class: 'd16-bub-sheen' })));
        b.addEventListener('click', () => {
          if (b.disabled) return;
          b.disabled = true;
          const r = b.getBoundingClientRect();
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          b.classList.add('popped');
          ctx.sfx.play('pop');
          ctx.ui.haptic?.(12);
          ctx.fx.burst(cx, cy, { count: 18, kind: 'dot', colors: ['#ffd1f3', '#bfeaff', '#d9ccff', '#c9ffe6', '#ffffff'], power: 150, gravity: 60, life: 0.9, size: 4, up: 0.05 });
          dots.children[i].classList.add('on');
          popped++;
          if (popped >= BUBBLES.length) {
            say('Das war die letzte. Jetzt darf es richtig ruhig werden.');
            again.hidden = false;
            if (!completedByBubbles) { completedByBubbles = true; ctx.complete(); }
          } else say(line);
        });
        field.append(b);
      });
      field.append(again);
      const choices = h('div', { class: 'd16-choices' }, [10, 20, 30].map(n => button(`${n} Min`, () => start(n), { variant: 'ghost' })));
      content.replaceChildren(
        h('div', { class: 'd16-top' },
          h('span', { class: 'd16-eyebrow' }, 'Ein Moment nur für dich'),
          h('h2', { class: 'display' }, 'Heute gehört die Wanne dir.'),
          h('p', {}, 'Lass ein paar Seifenblasen zerplatzen, dann nimm dir deine Zeit.')),
        field,
        h('div', { class: 'panel d16-panel' },
          thought, dots,
          h('p', { class: 'd16-caption' }, 'Wie lange darf es sein?'),
          choices,
          button('Nur eine Minute Ruhe', () => start(1))));
      requestAnimationFrame(() => thought.classList.add('in'));
    }

    // ---------- Bademodus ----------
    function buildBath() {
      const canvas = h('canvas', { class: 'd16-bath-canvas', 'aria-hidden': 'true' });
      const clock = h('p', { class: 'display d16-clock', role: 'timer', 'aria-label': 'Verbleibende Zeit' }, '');
      const rail = h('p', { class: 'd16-rail in' }, RAIL[0]);
      const bar = h('i', { class: 'd16-bar-fill' });
      const soundBtn = button('Klang aus', () => toggleSound(soundBtn), { variant: 'small' });
      soundBtn.classList.add('d16-quiet');
      const endBtn = button('Bad beenden', () => finish(false), { variant: 'small' });
      endBtn.classList.add('d16-quiet');
      const layer = h('div', { class: 'd16-bath' },
        canvas,
        h('div', { class: 'd16-bath-mid' },
          h('i', { class: 'd16-breath', 'aria-hidden': 'true' }),
          h('span', { class: 'd16-eyebrow' }, 'Ein stiller Moment'),
          clock,
          h('div', { class: 'd16-bar', 'aria-hidden': 'true' }, bar),
          rail),
        h('div', { class: 'd16-bath-foot' }, soundBtn, endBtn));
      return { layer, canvas, clock, bar, rail, soundBtn };
    }

    function runBathCanvas(canvas) {
      const { loop, fitCanvas, rand } = ctx.fx;
      const steamSprite = sprite(64, '235,222,236', 0.5);
      const glowSprite = sprite(128, '255,150,60', 0.3);
      const emberSprite = sprite(10, '255,190,110', 0.6);
      const slow = ctx.reducedMotion ? 0.3 : 1;
      const noise = makeNoise(Math.random() * 100);
      let { w, h: hh } = fitCanvas(canvas);
      const puffs = Array.from({ length: 26 }, () => ({ x: rand(w), y: rand(hh), r: rand(46, 110), v: rand(10, 26), ph: rand(10), a: rand(0.08, 0.17) }));
      const embers = Array.from({ length: 14 }, () => ({ x: rand(w), y: rand(hh), v: rand(10, 28), ph: rand(20), s: rand(0.6, 1.4) }));
      const candles = [{ k: 0.5, h: 96, w: 26, o: 0 }, { k: 0.24, h: 52, w: 20, o: 5 }, { k: 0.77, h: 66, w: 22, o: 9 }];
      const onResize = () => { ({ w, h: hh } = fitCanvas(canvas)); };
      window.addEventListener('resize', onResize);
      const stopLoop = loop((dt, t) => {
        if (document.hidden) return;
        const fit = fitCanvas(canvas); w = fit.w; hh = fit.h;
        const g = fit.ctx;
        g.clearRect(0, 0, w, hh);
        const base = hh - Math.max(150, hh * 0.2);
        // Dampf
        g.globalCompositeOperation = 'source-over';
        for (const p of puffs) {
          p.y -= p.v * dt * slow;
          p.x += Math.sin(t * 0.35 + p.ph) * 9 * dt * slow;
          if (p.y < -p.r) { p.y = hh + p.r; p.x = rand(w); }
          const fadeIn = Math.min(1, (hh - p.y) / 120), fadeOut = Math.min(1, (p.y + p.r) / 200);
          g.globalAlpha = p.a * fadeIn * fadeOut * (0.7 + 0.3 * Math.sin(t * 0.5 + p.ph));
          const d = p.r * 2;
          g.drawImage(steamSprite, p.x - p.r, p.y - p.r, d, d);
        }
        // Kerzen
        g.globalCompositeOperation = 'lighter';
        for (const c of candles) {
          const cx = w * c.k;
          const n = noise(t * 2.2 + c.o), n2 = noise(t * 5.1 + c.o + 40);
          const flick = 0.78 + n * 0.3 + (n2 - 0.5) * 0.12;
          const top = base - c.h;
          g.globalAlpha = 0.5 * flick;
          const gr = (c.h > 80 ? 230 : 160) * (0.9 + n * 0.2);
          g.drawImage(glowSprite, cx - gr, top - 24 - gr, gr * 2, gr * 2);
          g.globalAlpha = 1;
          g.globalCompositeOperation = 'source-over';
          // Wachs
          const wg = g.createLinearGradient(cx - c.w / 2, 0, cx + c.w / 2, 0);
          wg.addColorStop(0, '#8a6244'); wg.addColorStop(0.45, '#f4d9ae'); wg.addColorStop(1, '#a87550');
          g.fillStyle = wg;
          g.beginPath(); g.roundRect(cx - c.w / 2, top, c.w, c.h, 4); g.fill();
          g.fillStyle = 'rgba(255,200,120,.55)';
          g.beginPath(); g.ellipse(cx, top + 1, c.w / 2 - 1, 3.2, 0, 0, 6.283); g.fill();
          // Flamme
          const fh = (c.h > 80 ? 40 : 30) * flick, fw = fh * 0.34, lean = (n - 0.5) * 8;
          g.fillStyle = '#ffb347';
          g.beginPath();
          g.moveTo(cx, top - 1);
          g.bezierCurveTo(cx - fw, top - fh * 0.3, cx - fw * 0.5 + lean * 0.3, top - fh * 0.8, cx + lean, top - fh);
          g.bezierCurveTo(cx + fw * 0.5 + lean * 0.3, top - fh * 0.8, cx + fw, top - fh * 0.3, cx, top - 1);
          g.fill();
          g.fillStyle = '#fff3c9';
          g.beginPath(); g.ellipse(cx + lean * 0.1, top - fh * 0.3, fw * 0.32, fh * 0.26, 0, 0, 6.283); g.fill();
          g.globalCompositeOperation = 'lighter';
        }
        // Glut-Funken
        for (const e of embers) {
          e.y -= e.v * dt * slow;
          e.x += Math.sin(t * 0.8 + e.ph) * 14 * dt * slow;
          if (e.y < -10) { e.y = base - 20; e.x = w * (0.2 + Math.random() * 0.6); }
          g.globalAlpha = 0.5 * Math.min(1, Math.max(0, (base - e.y) / 90)) * Math.min(1, e.y / 160) * (0.5 + 0.5 * Math.sin(t * 3 + e.ph));
          const s = 10 * e.s;
          g.drawImage(emberSprite, e.x - s, e.y - s, s * 2, s * 2);
        }
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      });
      return () => { stopLoop(); window.removeEventListener('resize', onResize); };
    }

    function tick() {
      if (!end || !bath) return;
      const now = Date.now();
      const left = remainingMs(end, now);
      const secs = Math.ceil(left / 1000);
      const text = `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
      if (bath.clock.textContent !== text) bath.clock.textContent = text;
      bath.bar.style.transform = `scaleX(${Math.min(1, Math.max(0, (now - started) / (end - started)))})`;
      if (!left) finish(true);
    }

    function start(minutes) {
      if (end) return;
      ctx.setHeader('hidden');
      if (snow) snow.paused = true;
      started = Date.now(); end = started + duration(minutes); soundOn = true;
      bath = buildBath();
      root.append(bath.layer);
      requestAnimationFrame(() => bath?.layer.classList.add('in'));
      bathStop = runBathCanvas(bath.canvas);
      let ri = 0;
      railTimer = setInterval(() => {
        if (!bath) return;
        bath.rail.classList.remove('in');
        later(() => { if (!bath) return; ri = (ri + 1) % RAIL.length; bath.rail.textContent = RAIL[ri]; bath.rail.classList.add('in'); }, 1400);
      }, 22000);
      timer = setInterval(tick, 400); tick(); requestWake(); startAudio();
    }

    function closeBath() {
      clearInterval(timer); timer = null;
      clearInterval(railTimer); railTimer = null;
      const b = bath; bath = null;
      if (b) {
        b.layer.classList.remove('in');
        later(() => { bathStop?.(); bathStop = null; b.layer.remove(); }, 1500);
      }
    }

    function finish(natural) {
      if (!end) return;
      const elapsed = Date.now() - started;
      end = 0;
      closeBath(); releaseWake(); stopSound();
      if (natural && soundOn) singingBowl();
      if (elapsed >= minute || natural) ctx.complete();
      showFinish(natural);
    }

    function showFinish(natural) {
      ctx.setHeader('dark');
      stage.classList.add('d16-finishing');
      if (snow) snow.paused = false;
      const rings = natural ? h('div', { class: 'd16-rings', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')) : null;
      content.replaceChildren(
        h('div', { class: 'd16-spacer' }, rings),
        h('div', { class: 'panel d16-panel d16-end' },
          h('span', { class: 'd16-eyebrow' }, natural ? 'Klangschale' : 'Auch gut'),
          h('h2', { class: 'display' }, natural ? 'Deine Zeit ist um.' : 'Für heute reicht das.'),
          h('p', {}, natural ? 'Lorelai nickt anerkennend. Logan war ohnehin schon entspannt.' : 'Lorelai nickt anerkennend. Ruhe ist Ruhe, egal wie lang.'),
          button('Noch einmal', intro),
          button('Zurück zum Berg', () => ctx.close(), { variant: 'ghost' })));
    }

    intro();

    return () => {
      const wasBathing = !!end, elapsed = end ? Date.now() - started : 0;
      stopped = true; end = 0;
      clearInterval(timer); clearInterval(railTimer);
      timers.forEach(clearTimeout); timers.clear();
      bathStop?.(); bathStop = null;
      stopSound(); releaseWake();
      snow?.destroy?.();
      document.removeEventListener('visibilitychange', onVisibility);
      if (wasBathing && elapsed >= minute) { try { ctx.complete({ quiet: true }); } catch { /* egal */ } }
    };
  },
};
