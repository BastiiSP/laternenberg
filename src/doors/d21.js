// Türchen 21 · Die längste Nacht – die Sonne hinter den Bergen hervorziehen
import './d21.css';

const SUN_X = 0.52; // Sonnenmitte, Anteil der Bildbreite
const SUN_Y0 = 0.625; // Start: hinter dem Kamm (Anteil der Bildhöhe)
const SUN_Y1 = 0.3; // Ziel: frei am Himmel
// Kammlinie der Berge im Bild (x, y als Anteile); alles darüber ist Himmel
const RIDGE = [[0, 0.58], [0.08, 0.575], [0.18, 0.566], [0.3, 0.56], [0.4, 0.557], [0.45, 0.551], [0.5, 0.564], [0.56, 0.572], [0.6, 0.563], [0.66, 0.578], [0.72, 0.583], [0.8, 0.575], [0.9, 0.551], [0.95, 0.56], [1, 0.57]];

const ss = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default {
  mount(root, ctx) {
    const { h, button } = ctx.ui;
    const { loop, clamp } = ctx.fx;
    const reduced = ctx.reducedMotion;
    let sparkleT = 0; // verzögerter Glitzerton: beim Zurücksetzen und Schließen löschen

    const stage = h('div', { class: 'd21-stage' });
    const world = h('div', { class: 'd21-world' });
    const img = h('img', { class: 'd21-img', src: ctx.img('d21-sonnenwende'), alt: 'Zwei Kaninchen auf einer Bank blicken über verschneite Berge', draggable: 'false' });
    const layer = (cls) => h('div', { class: `d21-layer ${cls}` });
    const night = layer('d21-night');
    const moonlit = layer('d21-moonlit');
    const dusk = layer('d21-dusk');
    const dawnsky = layer('d21-dawnsky');
    const warm = layer('d21-warm');

    // Sterne
    const stars = h('div', { class: 'd21-stars', 'aria-hidden': 'true' });
    for (let i = 0; i < 70; i++) {
      const s = 1.5 + Math.random() * 2;
      stars.append(h('i', { class: 'd21-star', style: { left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: `${s}px`, height: `${s}px`, animationDelay: `${-Math.random() * 4}s`, animationDuration: `${2.6 + Math.random() * 2.6}s` } }));
    }
    stars.append(h('i', { class: 'd21-meteor' }));

    // Wolken
    const cloudDefs = [
      { l: 6, t: 24, w: 50, hgt: 10 }, { l: 48, t: 16, w: 46, hgt: 9 },
      { l: 14, t: 38, w: 56, hgt: 8 }, { l: 60, t: 34, w: 40, hgt: 7 },
    ];
    const clouds = cloudDefs.map((c) => {
      const el = h('div', { class: 'd21-cloud', style: { left: `${c.l}%`, top: `${c.t}%`, width: `${c.w}%`, height: `${c.hgt}%`, opacity: 0 } },
        h('i', { style: { left: '0%', top: '30%', width: '55%', height: '70%' } }),
        h('i', { style: { left: '22%', top: '0%', width: '50%', height: '100%' } }),
        h('i', { style: { left: '48%', top: '25%', width: '52%', height: '75%' } }));
      return el;
    });

    // Sonne hinter dem Kamm
    const ridgePoly = `0% 0%, 100% 0%, ${RIDGE.slice().reverse().map(([x, y]) => `${x * 100}% ${y * 100}%`).join(', ')}`;
    const rays = h('div', { class: 'd21-rays' });
    const halo = h('div', { class: 'd21-halo' });
    const sunRed = h('div', { class: 'd21-sun red' });
    const sunGold = h('div', { class: 'd21-sun gold' });
    const sunWrap = h('div', { class: 'd21-sunwrap' }, rays, halo, sunRed, sunGold);
    const skyClip = h('div', { class: 'd21-skyclip', style: { clipPath: `polygon(${ridgePoly})`, webkitClipPath: `polygon(${ridgePoly})` } }, sunWrap);

    world.append(img, night, stars, moonlit, dusk, dawnsky, ...clouds, skyClip, warm);

    // Texte
    const mk = (cls, ...kids) => h('div', { class: `d21-text ${cls}` }, ...kids);
    const texts = [
      { el: mk('', h('h2', { class: 'display' }, 'Die längste Nacht'),
        h('p', {}, 'Am 21. Dezember ist Wintersonnenwende: bei uns auf der Nordhalbkugel der kürzeste Tag und die längste Nacht des Jahres.')), a: -1, b: 0.1 },
      { el: mk('big', h('p', {}, 'Noch ist es still. Nur die Sterne sind wach.')), a: 0.12, b: 0.34 },
      { el: mk('big', h('p', {}, 'Hinter den Bergen wird es schon violett.')), a: 0.37, b: 0.58 },
      { el: mk('big', h('p', {}, 'Das erste Gold liegt auf den Gipfeln.')), a: 0.61, b: 0.82 },
      { el: mk('big', h('p', {}, 'Gleich ist sie oben …')), a: 0.85, b: 0.995 },
    ];
    const finalText = mk('', h('h2', { class: 'display' }, 'Geschafft.'),
      h('p', {}, 'Die längste Nacht ist vorbei. Von jetzt an werden die Tage wieder länger – jeden Tag ein kleines bisschen.'));
    const hint = h('div', { class: 'd21-hint on' },
      h('svg', { class: 'd21-chev', viewBox: '0 0 24 24' }, h('path', { d: 'M5 15l7-7 7 7', fill: 'none', stroke: 'currentColor', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })),
      h('p', {}, 'Zieh die Sonne nach oben'));
    const hintP = hint.querySelector('p');
    const endBox = h('div', { class: 'd21-end' },
      button('Nochmal', () => reset(), { variant: 'ghost' }),
      button('Zurück zum Berg', () => ctx.close(), { variant: '' }));
    const ui = h('div', { class: 'd21-ui' }, ...texts.map((t) => t.el), finalText, hint, endBox);
    stage.append(world, ui);
    root.append(stage);

    // ---- Größen ----
    let W = 1; let H = 1; let travel = 1;
    function layout() {
      const r = root.getBoundingClientRect();
      const sw = r.width || 390; const sh = r.height || 844;
      W = Math.max(sw, (sh * 2) / 3);
      H = (W * 3) / 2;
      world.style.width = `${W}px`;
      world.style.height = `${H}px`;
      stage.style.setProperty('--W', `${W}px`);
      stage.style.setProperty('--sr', `${W * 0.15}px`);
      travel = (SUN_Y0 - SUN_Y1) * H * 0.82;
      render();
    }

    // ---- Zustand ----
    let pt = 0; // Ziel (Finger)
    let p = 0; // angezeigt (federt dem Ziel nach)
    let v = 0;
    let dragging = false;
    let done = false;
    let idleSince = performance.now();
    let lastTick = 0;
    const crossed = new Set();

    function render() {
      const q = clamp(p, 0, 1);
      const y = (SUN_Y0 + (SUN_Y1 - SUN_Y0) * q) * H;
      const sc = 1.25 - 0.25 * ss(0, 1, q);
      sunWrap.style.transform = `translate(${SUN_X * W}px, ${y}px) scale(${sc})`;
      night.style.opacity = String(1 - ss(0.05, 0.55, q));
      moonlit.style.opacity = String(0.95 * (1 - ss(0.1, 0.6, q)));
      dusk.style.opacity = String(ss(0.1, 0.4, q) * (1 - ss(0.6, 0.92, q)));
      dawnsky.style.opacity = String(ss(0.33, 0.85, q));
      warm.style.opacity = String(0.95 * ss(0.4, 1, q));
      stars.style.opacity = String(1 - ss(0.12, 0.5, q));
      const cl = ss(0.38, 0.8, q);
      clouds.forEach((c, i) => { c.style.opacity = String(clamp(cl * (0.7 + i * 0.1))); });
      rays.style.opacity = String(ss(0.28, 0.9, q));
      halo.style.opacity = String(0.3 + 0.7 * ss(0, 0.6, q));
      sunRed.style.opacity = String(1 - ss(0.15, 0.6, q));
      sunGold.style.opacity = String(ss(0.15, 0.6, q));
      if (!done) texts.forEach((t) => t.el.classList.toggle('on', q >= t.a && q <= t.b));
    }

    function updateHint(now) {
      const show = !done && !dragging && (p < 0.05 || now - idleSince > 3000);
      hint.classList.toggle('on', show);
      hintP.textContent = p < 0.05 ? 'Zieh die Sonne nach oben' : 'Noch ein Stück weiter nach oben';
    }

    function finish() {
      if (done) return;
      done = true;
      texts.forEach((t) => t.el.classList.remove('on'));
      hint.classList.remove('on');
      finalText.classList.add('on');
      endBox.classList.add('on');
      ctx.sfx.play('success');
      sparkleT = setTimeout(() => ctx.sfx.play('sparkle'), 450);
      ctx.ui.haptic(30);
      const r = sunGold.getBoundingClientRect();
      ctx.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 40, kind: 'star', colors: ['#fff3c4', '#ffd98a', '#ffb7a0', '#ffe9a8'], power: 260, gravity: 40, life: 1.8, size: 12 });
      ctx.complete();
    }

    function reset() {
      clearTimeout(sparkleT);
      done = false;
      pt = 0; p = 0; v = 0;
      crossed.clear();
      finalText.classList.remove('on');
      endBox.classList.remove('on');
      idleSince = performance.now();
      render();
    }

    const stop = loop((dt) => {
      if (document.hidden) return;
      if (reduced) {
        p += (pt - p) * Math.min(1, dt * 10);
      } else {
        const k = 70; const c = 11; // leicht unterdämpft: federt ein wenig nach
        v += (k * (pt - p) - c * v) * dt;
        p += v * dt;
      }
      if (p < 0) { p = 0; v = 0; }
      if (p > 1) { p = 1; v = 0; }
      const now = performance.now();
      if (!done) {
        // kleine Glockentöne beim Ziehen, höher je weiter oben
        if (Math.abs(p - lastTick) > 0.045) {
          lastTick = p;
          ctx.tone(330 + p * 700, { dur: 0.35, vol: 0.035, type: 'sine' });
        }
        for (const m of [0.33, 0.66]) {
          if (p >= m && !crossed.has(m)) { crossed.add(m); ctx.sfx.play('chime'); }
        }
        if (pt >= 1 && p > 0.995) finish();
        updateHint(now);
      }
      render();
    });

    // ---- Berührung: überall ziehen, auch mit dem Daumen unten ----
    let startY = 0; let startPt = 0; let lastY = 0; let lastT = 0; let vel = 0; let pid = null;
    const onDown = (e) => {
      if (done || e.target.closest?.('.d21-end')) return;
      dragging = true;
      pid = e.pointerId;
      try { stage.setPointerCapture(pid); } catch { /* egal */ }
      startY = lastY = e.clientY;
      startPt = pt;
      lastT = performance.now();
      vel = 0;
      stage.classList.add('drag');
      hint.classList.remove('on');
    };
    const onMove = (e) => {
      if (!dragging || e.pointerId !== pid) return;
      const now = performance.now();
      const dy = lastY - e.clientY;
      if (now > lastT) vel = 0.6 * vel + 0.4 * (dy / travel / ((now - lastT) / 1000));
      lastY = e.clientY; lastT = now;
      pt = clamp(startPt + (startY - e.clientY) / travel, 0, 1);
      idleSince = now;
      if (pt >= 0.985) { pt = 1; }
    };
    const onUp = (e) => {
      if (!dragging || (e && e.pointerId !== pid)) return;
      dragging = false;
      stage.classList.remove('drag');
      idleSince = performance.now();
      // Schwung mitnehmen, aber nie zurückfallen lassen
      if (vel > 0.2) pt = clamp(pt + Math.min(0.12, vel * 0.12), 0, 1);
      if (pt >= 0.97) pt = 1;
    };
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);

    const ro = new ResizeObserver(() => layout());
    ro.observe(root);
    layout();

    return () => {
      clearTimeout(sparkleT);
      stop();
      ro.disconnect();
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
    };
  },
};
