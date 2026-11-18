// Türchen 6 · Der Stiefel vor der Tür (Nikolaus)
// Bild, Frostschicht (Canvas) und alles Antippbare liegen in einem Weltcontainer 2:3, der
// den Bildschirm wie „cover“ füllt. Positionen sind Prozent der Welt.
import './d06.css';

const ANCHOR = 0.54; // Stiefel und beide Kaninchen liegen rechts von der Bildmitte

const POEM = [
  'Ein Stiefel stand vor einer Tür,',
  'bewacht von zwei Kaninchen, hier.',
  'Logan saß als Wachposten drin,',
  'das macht, so sagt er, großen Sinn.',
  'Lorelai hat die Möhre probiert,',
  'ganz streng und fachlich kontrolliert.',
  'Die Krümel dort im Schnee? Ganz klar:',
  'Die lagen schon vorher da. Ist wahr!',
  'Nun sind sie müde von der Wacht',
  'und wünschen dir ’ne gute Nacht.',
];

const TALK = {
  logan: [
    'Ich bewache die Mandarinen. Von innen. Das ist effizienter.',
    'Wachposten Logan meldet: alles ruhig. Und sehr gemütlich.',
    'Falls jemand fragt: Ich habe hier nur kurz gesessen.',
  ],
  lorelai: [
    'Qualitätskontrolle! Jede Möhre muss geprüft werden, sonst weiß man ja nie!',
    'Das war nur ein Probebiss. Eine Meinung muss man sich ja bilden.',
    'Ich bewache hier nur, ich esse nicht. Zwischendurch.',
  ],
};

export default {
  async mount(root, ctx) {
    const { h, button, haptic, revealSeq } = ctx.ui;
    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
      return t;
    };
    const stops = [];
    let alive = true;
    ctx.onCleanup(() => { alive = false; }); // schon vor dem ersten await: Schließen während des Ladens stoppt den Aufbau

    // ---------- Aufbau ----------
    const world = h('div', { class: 'd06-world no-select' });
    const bg = h('img', { class: 'd06-bg', src: ctx.img('d06-stiefel'), alt: 'Ein Stiefel voller Nüsse und Mandarinen vor einer Tür, darin ein graues Kaninchen, daneben ein schwarzes mit einer Möhre', draggable: 'false' });
    const glow = h('div', { class: 'd06-lantern-glow' });
    const frost = h('canvas', { class: 'd06-frost' });
    world.append(bg, glow);

    // Antippbare Figuren (erst nach dem Freilegen aktiv)
    const logan = h('button', { class: 'd06-hit d06-hit-logan', type: 'button', 'aria-label': 'Logan im Stiefel', style: 'left:38.5%;top:44%;width:19%;height:15%' });
    const lorelai = h('button', { class: 'd06-hit d06-hit-lorelai', type: 'button', 'aria-label': 'Lorelai mit der Möhre', style: 'left:72%;top:67%;width:34%;height:25%' });
    const boot = h('button', { class: 'd06-hit d06-hit-boot', type: 'button', 'aria-label': 'Der Stiefel', style: 'left:34%;top:72%;width:30%;height:14%' });
    const bubble = h('div', { class: 'd06-bubble bubble' });
    world.append(logan, lorelai, boot, bubble, frost);

    const hintPill = h('div', { class: 'd06-hint panel' }, 'Der Stiefel ist zugeschneit. Wisch mit dem Finger den Schnee weg.');
    const snowCv = h('canvas', { class: 'd06-snow' });

    // Gedichtkarte
    const lines = POEM.map((t) => h('p', { class: 'd06-line hand reveal' }, t));
    // BASTI-STIMME
    const bastiLine = h('p', { class: 'd06-basti reveal' }, 'Frohen Nikolaus, Melli. Schön, dass es dich gibt.');
    const thumb = h('img', { class: 'd06-thumb', src: '/img/wallpaper/stiefel.jpg', alt: 'Hintergrundbild: der Stiefel', loading: 'lazy' });
    const dl = h('a', { class: 'btn small', href: '/img/wallpaper/stiefel.jpg', download: 'stiefel-hintergrund.jpg' }, 'Als Hintergrund speichern');
    const dlHint = h('p', { class: 'd06-dlhint' }, 'Öffnet sich nur das Bild: lange drücken → „Bild sichern“.');
    const toggle = h('button', { class: 'd06-toggle', type: 'button', 'aria-expanded': 'true' },
      h('span', { class: 'd06-toggle-title' }, 'Der Wachbericht'),
      h('span', { class: 'd06-toggle-label' }, h('span', { class: 'd06-toggle-open' }, 'Bild ansehen'), h('span', { class: 'd06-toggle-shut' }, 'Lesen'), h('span', { class: 'd06-toggle-arrow', 'aria-hidden': 'true' }, '⌄')));
    const body = h('div', { class: 'd06-card-body' },
      h('p', { class: 'd06-sig' }, 'Bericht der Stiefelwache. Gezeichnet: Lorelai und Logan. Nicht amtlich.'),
      h('div', { class: 'd06-poem' }, ...lines),
      bastiLine,
      h('div', { class: 'd06-dl' }, thumb, h('div', { class: 'd06-dl-text' }, dl, dlHint)),
      button('Zurück zum Berg', () => ctx.close(), { variant: 'ghost small' }));
    const card = h('section', { class: 'd06-card card' }, toggle, body);
    toggle.addEventListener('click', () => {
      const closed = card.classList.toggle('closed');
      toggle.setAttribute('aria-expanded', String(!closed));
      ctx.sfx.play('page');
    });
    root.append(world, snowCv, hintPill, card);

    // ---------- Weltlayout ----------
    let ww = 0, wh = 0, wl = 0, wt = 0;
    function layout() {
      const W = root.clientWidth || 390;
      const H = root.clientHeight || 844;
      ww = Math.max(W, (H * 2) / 3);
      wh = ww * 1.5;
      wl = Math.min(0, Math.max(W - ww, W / 2 - ANCHOR * ww));
      wt = (H - wh) / 2;
      world.style.cssText = `width:${ww}px;height:${wh}px;left:${wl}px;top:${wt}px;--u:${ww / 100}px`;
    }
    layout();

    // ---------- Frostschicht ----------
    const fctx = frost.getContext('2d');
    const dpr = ctx.fx.dpr();
    function sizeFrost() {
      frost.width = Math.round(ww * dpr);
      frost.height = Math.round(wh * dpr);
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    sizeFrost();
    const CW = ww; // logische Größe der Frostschicht (bleibt fest)
    const CH = wh;

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function paintFrost(image) {
      const c = fctx;
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, CW, CH);
      // unscharfes Abbild des Bildes (Verkleinern und Hochziehen)
      if (image) {
        const t = document.createElement('canvas');
        t.width = 26;
        t.height = 39;
        t.getContext('2d').drawImage(image, 0, 0, 26, 39);
        c.imageSmoothingEnabled = true;
        c.imageSmoothingQuality = 'high';
        c.drawImage(t, 0, 0, CW, CH);
      } else {
        c.fillStyle = '#8c9ad0';
        c.fillRect(0, 0, CW, CH);
      }
      // milchiger Frost darüber
      c.fillStyle = 'rgba(214, 226, 248, 0.78)';
      c.fillRect(0, 0, CW, CH);
      const vg = c.createRadialGradient(CW / 2, CH * 0.52, CW * 0.1, CW / 2, CH * 0.52, CH * 0.62);
      vg.addColorStop(0, 'rgba(255,255,255,0)');
      vg.addColorStop(1, 'rgba(250,252,255,0.62)');
      c.fillStyle = vg;
      c.fillRect(0, 0, CW, CH);
      // Schneekörnchen
      for (let i = 0; i < 2600; i++) {
        c.fillStyle = `rgba(255,255,255,${rnd(0.12, 0.5)})`;
        c.beginPath();
        c.arc(rnd(0, CW), rnd(0, CH), rnd(0.6, 2.6), 0, 6.283);
        c.fill();
      }
      // Eiskristalle
      c.lineCap = 'round';
      for (let i = 0; i < 70; i++) {
        const x = rnd(0, CW);
        const y = rnd(0, CH);
        const r = rnd(10, 34);
        const rot = rnd(0, 1.05);
        c.strokeStyle = `rgba(255,255,255,${rnd(0.28, 0.6)})`;
        c.lineWidth = rnd(0.8, 1.6);
        for (let k = 0; k < 6; k++) {
          const a = rot + (k * Math.PI) / 3;
          const ex = x + Math.cos(a) * r;
          const ey = y + Math.sin(a) * r;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(ex, ey);
          c.moveTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55);
          c.lineTo(x + Math.cos(a) * r * 0.55 + Math.cos(a + 0.9) * r * 0.32, y + Math.sin(a) * r * 0.55 + Math.sin(a + 0.9) * r * 0.32);
          c.moveTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55);
          c.lineTo(x + Math.cos(a) * r * 0.55 + Math.cos(a - 0.9) * r * 0.32, y + Math.sin(a) * r * 0.55 + Math.sin(a - 0.9) * r * 0.32);
          c.stroke();
        }
      }
    }
    const image = await ctx.ui.preload(ctx.img('d06-stiefel'));
    if (!alive) return;
    paintFrost(image);

    // ---------- Freirubbeln ----------
    const R = () => CW * 0.05; // Pinselradius
    let last = null;
    let revealed = false;
    let touched = false;
    let progress = 0;
    let lastSnd = 0;
    let lastPuff = 0;
    const tiny = document.createElement('canvas');
    tiny.width = 36;
    tiny.height = 54;
    const tctx = tiny.getContext('2d', { willReadFrequently: true });

    function stroke(x, y, fromX, fromY) {
      const c = fctx;
      c.globalCompositeOperation = 'destination-out';
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.strokeStyle = 'rgba(0,0,0,0.45)';
      c.lineWidth = R() * 2.5;
      c.beginPath();
      c.moveTo(fromX ?? x, fromY ?? y);
      c.lineTo(x, y);
      c.stroke();
      c.strokeStyle = 'rgba(0,0,0,1)';
      c.lineWidth = R() * 1.7;
      c.beginPath();
      c.moveTo(fromX ?? x, fromY ?? y);
      c.lineTo(x, y);
      c.stroke();
      c.globalCompositeOperation = 'source-over';
    }

    // Stichprobe: verkleinertes Abbild der Frostschicht, Alpha nur im sichtbaren Bereich
    function measure() {
      const W = root.clientWidth;
      const H = root.clientHeight;
      const head = 58;
      tctx.clearRect(0, 0, 36, 54);
      tctx.drawImage(frost, 0, 0, 36, 54);
      const d = tctx.getImageData(0, 0, 36, 54).data;
      const x0 = Math.max(0, Math.floor(((-wl) / ww) * 36));
      const x1 = Math.min(35, Math.ceil(((W - wl) / ww) * 36));
      const y0 = Math.max(0, Math.floor(((head - wt) / wh) * 54));
      const y1 = Math.min(53, Math.ceil(((H - wt) / wh) * 54));
      let sum = 0;
      let n = 0;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          sum += d[(y * 36 + x) * 4 + 3];
          n++;
        }
      }
      return n ? 1 - sum / n / 255 : 0;
    }

    function local(e) {
      const r = frost.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * CW, y: ((e.clientY - r.top) / r.height) * CH };
    }

    function check() {
      if (revealed) return;
      progress = measure();
      if (progress >= 0.6) reveal();
    }

    const onDown = (e) => {
      if (revealed) return;
      if (!touched) {
        touched = true;
        hintPill.classList.add('gone');
        demoStop?.();
      }
      world.setPointerCapture?.(e.pointerId);
      const p = local(e);
      last = p;
      stroke(p.x, p.y);
      scratchFx(e);
    };
    const onMove = (e) => {
      if (revealed || !last) return;
      const p = local(e);
      stroke(p.x, p.y, last.x, last.y);
      last = p;
      scratchFx(e);
    };
    const onUp = () => {
      if (!last) return;
      last = null;
      check();
    };
    function scratchFx(e) {
      const now = performance.now();
      if (now - lastSnd > 120) {
        lastSnd = now;
        ctx.sfx.hiss({ dur: 0.18, vol: 0.035, from: 3200, to: 1700, q: 0.4 });
      }
      if (now - lastPuff > 70) {
        lastPuff = now;
        ctx.fx.burst(e.clientX, e.clientY, { count: 2, kind: 'dot', colors: ['#ffffff', '#e4edff'], power: 50, gravity: 150, life: 0.7, size: 4 });
      }
    }
    world.addEventListener('pointerdown', onDown);
    world.addEventListener('pointermove', onMove);
    world.addEventListener('pointerup', onUp);
    world.addEventListener('pointercancel', onUp);
    const poll = setInterval(() => {
      if (!revealed && last) check();
    }, 350);

    // kleine Vorführung: ein Lichtpunkt wischt eine Schlangenlinie frei
    const orb = h('div', { class: 'd06-orb' });
    world.append(orb);
    let demoStop = null;
    function demo() {
      if (touched || revealed || !alive) return;
      let t0 = 0;
      let prev = null;
      const dur = 2.6;
      const stopLoop = ctx.fx.loop((dt, now) => {
        if (!t0) t0 = now;
        const k = Math.min(1, (now - t0) / dur);
        const e = k * k * (3 - 2 * k);
        const x = (0.26 + 0.5 * e) * CW;
        const y = (0.5 + 0.1 * Math.sin(e * 9.4) - 0.02 * e) * CH;
        orb.style.opacity = '1';
        orb.style.transform = `translate(${x}px, ${y}px)`;
        if (prev) stroke(x, y, prev.x, prev.y);
        prev = { x, y };
        if (k >= 1) {
          demoStop();
        }
      });
      demoStop = () => {
        stopLoop();
        orb.style.opacity = '0';
        demoStop = null;
        if (!touched && !revealed) later(demo, 2600);
      };
    }
    later(demo, 1100);

    // ---------- Aufdecken ----------
    function reveal() {
      if (revealed) return;
      revealed = true;
      last = null;
      clearInterval(poll);
      demoStop?.();
      hintPill.classList.add('gone');
      frost.classList.add('melt');
      ctx.sfx.play('sparkle');
      haptic(20);
      const r = root.getBoundingClientRect();
      ctx.fx.burst(r.left + r.width * 0.5, r.top + r.height * 0.5, { count: 38, kind: 'star', power: 260, life: 1.4, size: 9 });
      later(() => { frost.remove(); }, 1900);
      later(() => {
        ctx.sfx.play('bell');
        for (const el of [logan, lorelai, boot]) el.classList.add('live');
        glow.classList.add('on');
        const snow = new ctx.fx.Snow(snowCv, { density: 0.55, wind: 14 });
        snow.start();
        stops.push(() => snow.destroy());
        ctx.complete();
      }, 1200);
      later(() => {
        card.classList.add('in');
        revealSeq(lines, { gap: 520 }).then(() => revealSeq([bastiLine], { gap: 0 }));
      }, 2600);
    }

    // „Überspringen“ nur, wenn das Türchen schon einmal erlebt wurde
    if (ctx.isDone) {
      const skip = button('Gleich freilegen', () => { skip.remove(); reveal(); }, { variant: 'small ghost' });
      skip.classList.add('d06-skip');
      root.append(skip);
    }

    // ---------- Figuren antippen ----------
    const idx = { logan: 0, lorelai: 0 };
    function talk(who, el, x, y) {
      if (!revealed) return;
      const lines = TALK[who];
      const text = lines[idx[who]++ % lines.length];
      bubble.replaceChildren(h('span', { class: 'who' }, who === 'logan' ? 'Logan' : 'Lorelai'), text);
      // waagerecht so setzen, dass die Blase ganz auf dem Bildschirm bleibt
      const half = bubble.offsetWidth / 2;
      const sw = root.clientWidth;
      const cx = Math.min(sw - 10 - half, Math.max(10 + half, wl + (x / 100) * ww));
      bubble.style.left = cx - wl + 'px';
      bubble.style.top = y + '%';
      bubble.classList.remove('show');
      // eslint-disable-next-line no-unused-expressions
      bubble.offsetWidth;
      bubble.classList.add('show');
      clearTimeout(talk.t);
      talk.t = setTimeout(() => bubble.classList.remove('show'), 5000);
      ctx.sfx.play(who === 'logan' ? 'squeak' : 'hop');
      haptic(12);
      ctx.fx.burstAt(el, { count: 10, kind: 'star', power: 150, life: 0.9, size: 7 });
      el.classList.remove('wiggle');
      // eslint-disable-next-line no-unused-expressions
      el.offsetWidth;
      el.classList.add('wiggle');
    }
    logan.addEventListener('click', () => talk('logan', logan, 34, 33));
    lorelai.addEventListener('click', () => talk('lorelai', lorelai, 62, 50));
    boot.addEventListener('click', () => {
      if (!revealed) return;
      ctx.sfx.play('sparkle');
      ctx.fx.burstAt(boot, { count: 14, kind: 'spark', power: 180, life: 1.0, size: 6 });
    });

    const ro = new ResizeObserver(layout);
    ro.observe(root);

    return () => {
      alive = false;
      for (const t of timers) clearTimeout(t);
      clearInterval(poll);
      clearTimeout(talk.t);
      demoStop?.();
      stops.forEach((s) => s());
      ro.disconnect();
    };
  },
};
