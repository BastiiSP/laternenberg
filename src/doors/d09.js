// Türchen 9 · Die dunkelste Nacht (Neumond)
// Bild, Wolke, Lichtinseln und Namensschilder liegen in EINER Welt im Seitenverhältnis 2:3,
// die den Bereich unter der Kopfzeile wie „cover“ füllt. Alle Positionen sind Anteile der Welt.
// Die Welt ist breiter als der Handybildschirm: Wer die Laterne an den Rand schiebt, schaut weiter.
import './d09.css';

// x, y: Mittelpunkt des Schläfers im Bild (Anteil Breite/Höhe), r: Fundradius (Anteil der Weltbreite)
export const SLEEPERS = [
  { name: 'Fuchs', x: .137, y: .572, r: .105, note: 392,
    line: 'Der Fuchs hat sich unter der Tanne eingerollt. Der Schwanz ist die Decke, die Nase der Wecker – beides auf stumm.',
    hint: 'Links unten, unter den schweren Tannenzweigen.' },
  { name: 'Eule', x: .857, y: .098, r: .085, note: 440,
    line: 'Die Eule schläft sitzend auf ihrem Ast. Sehr professionell. Nachtaktiv ist sie heute nur im Prinzip.',
    hint: 'Ganz oben rechts, auf dem dicken Ast.' },
  { name: 'Reh', x: .340, y: .332, r: .085, note: 523,
    line: 'Das Reh steht zwischen den Stämmen und träumt im Stehen. Es sieht nach einem guten Traum aus.',
    hint: 'In der Mitte links, zwischen den hohen Stämmen.' },
  { name: 'Igel', x: .381, y: .872, r: .095, note: 587,
    line: 'Der Igel hat ein Nest aus Laub, das eindeutig wärmer aussieht als der ganze Rest vom Wald.',
    hint: 'Ganz unten, im runden Blätternest.' },
  { name: 'Lorelai & Logan', x: .733, y: .655, r: .135, note: 659,
    line: 'Zwei Kaninchen, eine Höhle, eine Laterne. Lorelai hat ausnahmsweise keine Meinung, Logan murmelt etwas von Karotten.',
    hint: 'Rechts unten, in der Wurzelhöhle.' },
];
export function isNear(p, sleeper, radius = sleeper.r) {
  return Math.hypot(p.x - sleeper.x, p.y - sleeper.y) < radius;
}
export function nextFound(found, index) {
  return new Set([...found, index]);
}

const DWELL = .42; // Sekunden im Licht, bis ein Schläfer „gefunden“ ist
const DARK = .955; // Deckkraft der Dunkelheit

export default {
  mount(root, ctx) {
    const { h, button } = ctx.ui;
    const reduced = ctx.reducedMotion;
    ctx.setHeader('dark');

    // ---------- Aufbau ----------
    const stage = h('div', { class: 'd09-stage no-select' });
    const view = h('div', { class: 'd09-view' });
    const world = h('div', { class: 'd09-world' });
    const picture = h('img', { class: 'd09-picture', src: ctx.img('d09-nachtwald'), alt: '', draggable: 'false' });
    const cloud = h('div', { class: 'd09-cloud', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
    const glows = h('div', { class: 'd09-glows', 'aria-hidden': 'true' });
    world.append(picture, cloud, glows);
    const snowCv = h('canvas', { class: 'd09-snow', 'aria-hidden': 'true' });
    const dark = h('canvas', { class: 'd09-dark', 'aria-hidden': 'true' });
    const over = h('div', { class: 'd09-over', 'aria-hidden': 'true' });
    view.append(world, snowCv, dark, over);

    const dots = SLEEPERS.map(() => h('i', {}, '✦'));
    const count = h('div', { class: 'd09-count', role: 'status', 'aria-live': 'polite' },
      h('span', { class: 'd09-dots' }, ...dots), h('span', { class: 'd09-count-t' }, '0 von 5'));
    const cue = h('div', { class: 'd09-cue', role: 'status', 'aria-live': 'polite' });
    const hintBtn = h('button', { class: 'd09-hint', type: 'button', 'aria-label': 'Hinweis: wo schläft der Nächste?' }, h('span', {}, 'Tipp'));
    const finale = h('div', { class: 'd09-final panel' });
    const intro = h('div', { class: 'd09-intro' },
      h('div', { class: 'd09-intro-card panel' },
        h('span', { class: 'd09-kicker' }, 'Nacht zum 9. Dezember 2026'),
        h('h2', { class: 'display' }, 'Die dunkelste Nacht'),
        h('p', {}, 'In dieser Nacht ist Neumond. Dunkler wird es in diesem Monat nicht. Im Wald schlafen fünf – und du hast nur eine Laterne.'),
        h('p', { class: 'd09-intro-sub' }, 'Führ das Licht mit dem Finger. Schieb es an den Rand, dann schaust du weiter.'),
        button('Laterne heben', () => start())));
    stage.append(view, count, cue, hintBtn, finale, intro);
    root.append(stage);

    // ---------- Zustand ----------
    let active = false;
    let done = false;
    let found = new Set();
    let pointerDown = false;
    let moved = false;
    let pointer = { x: 0, y: 0 };
    let down0 = { x: 0, y: 0 };
    let light = { x: 0, y: 0 };
    let lightOff = 0;
    let idleT = 99;
    let noFind = 0;
    let reveal = 0;
    let dwell = SLEEPERS.map(() => 0);
    let hintSpot = null; // { i, until }
    let V = { w: 1, h: 1 };
    let W = { w: 1, h: 1, ox: 0, oy: 0 };
    let cam = { x: 0, y: 0 };
    let camT = { x: 0, y: 0 };
    let gDark = null; let kDark = 1;
    let gSnow = null;
    let lastTransform = '';
    let cueTimer = 0;
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
    const listeners = [];
    const on = (el, type, fn, opts) => { el.addEventListener(type, fn, opts); listeners.push(() => el.removeEventListener(type, fn, opts)); };
    const flakes = Array.from({ length: 46 }, (_, i) => ({ x: (i * 0.6180339) % 1, y: (i * 0.3819) % 1, s: .5 + (i % 5) * .25, p: i * 1.7 }));

    // ---------- Layout ----------
    function layout() {
      const vw = Math.max(1, view.clientWidth), vh = Math.max(1, view.clientHeight);
      const prev = { fx: W.ox ? camT.x / W.ox : .5, fy: W.oy ? camT.y / W.oy : .5 };
      V = { w: vw, h: vh };
      const ww = Math.max(vw, (vh * 2) / 3), wh = ww * 1.5;
      W = { w: ww, h: wh, ox: ww - vw, oy: wh - vh };
      world.style.width = over.style.width = `${ww}px`;
      world.style.height = over.style.height = `${wh}px`;
      view.style.setProperty('--u', `${ww / 100}px`);
      camT = { x: W.ox * prev.fx, y: W.oy * prev.fy };
      cam = { ...camT };
      lastTransform = '';
      kDark = Math.min(ctx.fx.dpr(), 1.5);
      dark.width = Math.round(vw * kDark); dark.height = Math.round(vh * kDark);
      gDark = dark.getContext('2d'); gDark.setTransform(kDark, 0, 0, kDark, 0, 0);
      const ks = Math.min(ctx.fx.dpr(), 1.5);
      snowCv.width = Math.round(vw * ks); snowCv.height = Math.round(vh * ks);
      gSnow = snowCv.getContext('2d'); gSnow.setTransform(ks, 0, 0, ks, 0, 0);
      if (!light.x) light = { x: vw / 2, y: vh / 2 };
      pointer = { x: vw / 2, y: vh / 2 };
    }
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(view);

    const clampCam = (c) => { c.x = Math.max(0, Math.min(W.ox, c.x)); c.y = Math.max(0, Math.min(W.oy, c.y)); };
    const sleeperScreen = (s) => ({ x: s.x * W.w - cam.x, y: s.y * W.h - cam.y });
    function panTo(s, soft = true) {
      // Kamera so verschieben, dass der Schläfer gut sichtbar im Bild liegt
      const px = s.x * W.w, py = s.y * W.h;
      const mx = V.w * (soft ? .28 : .5), my = V.h * (soft ? .26 : .5);
      if (soft) {
        camT.x = Math.max(px - V.w + mx, Math.min(px - mx, camT.x));
        camT.y = Math.max(py - V.h + my, Math.min(py - my, camT.y));
      } else { camT.x = px - mx; camT.y = py - my; }
      clampCam(camT);
    }

    // ---------- Zeigen ----------
    const local = (e) => { const r = view.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    function setCue(html, ms = 6500, s = null) {
      // Hinweis dorthin, wo er das Gefundene nicht verdeckt
      const top = !s || sleeperScreen(s).y > V.h * .5;
      cue.classList.toggle('is-top', top);
      cue.replaceChildren(...html);
      cue.classList.remove('is-pop'); void cue.offsetWidth; cue.classList.add('is-pop', 'is-on');
      clearTimeout(cueTimer);
      if (ms) cueTimer = setTimeout(() => cue.classList.remove('is-on'), ms);
    }
    function start() {
      intro.classList.add('is-gone');
      later(() => intro.remove(), 600);
      active = true; idleT = 99; noFind = 0;
      ctx.sfx.play('ignite');
      stage.classList.add('is-lit');
      setCue([h('span', {}, 'Führ die Laterne langsam über den Wald und halt kurz inne, wenn etwas schimmert.')], 7000);
    }
    function discover(i) {
      if (found.has(i) || done) return;
      found = nextFound(found, i);
      noFind = 0; dwell[i] = 0; hintSpot = null;
      const s = SLEEPERS[i];
      const at = { left: `${s.x * 100}%`, top: `${s.y * 100}%` };
      glows.append(h('span', { class: 'd09-island', style: { ...at, width: `${s.r * 200}%` } }));
      const hold = h('span', { class: 'd09-spot', style: at },
        h('span', { class: 'd09-zzz' }, h('b', {}, 'z'), h('b', {}, 'z'), h('b', {}, 'Z')),
        h('span', { class: 'd09-tag', style: s.x > .8 ? { '--tx': '-80%', '--cx': '80%' } : s.x < .2 ? { '--tx': '-20%', '--cx': '20%' } : {} }, s.name));
      over.append(hold);
      dots[i].classList.add('on');
      count.querySelector('.d09-count-t').textContent = `${found.size} von 5`;
      count.classList.remove('pop'); void count.offsetWidth; count.classList.add('pop');
      setCue([h('b', {}, s.name), h('span', {}, ` ${s.line}`)], 7500, s);
      const sc = sleeperScreen(s);
      const r = view.getBoundingClientRect();
      ctx.fx.burst(r.left + sc.x, r.top + sc.y, { count: 14, kind: 'spark', colors: ['#ffe2a0', '#ffc062', '#fff4d6'], power: 90, gravity: -10, life: .9, size: 3 });
      ctx.sfx.bell?.(s.note, { vol: .06, dur: 1.2 });
      ctx.sfx.bell?.(s.note * 1.5, { vol: .03, dur: .9, at: .12 });
      if (s.name === 'Eule') later(() => ctx.sfx.play('hoot'), 250);
      if (s.name === 'Igel') later(() => ctx.sfx.play('squeak'), 250);
      ctx.ui.haptic(14);
      panTo(s);
      if (found.size === SLEEPERS.length) later(finish, 1500);
    }
    function showHint() {
      if (!active || done) return;
      const i = SLEEPERS.findIndex((_, n) => !found.has(n));
      if (i < 0) return;
      panTo(SLEEPERS[i], false);
      hintSpot = { i, until: performance.now() / 1000 + 5 };
      setCue([h('b', {}, 'Tipp'), h('span', {}, ` ${SLEEPERS[i].hint} Dort schimmert es schwach.`)], 6500, SLEEPERS[i]);
      ctx.sfx.play('tick');
    }
    function finish() {
      done = true; active = false; stage.classList.add('is-done');
      cue.classList.remove('is-on');
      ctx.sfx.play('chime');
      later(() => ctx.sfx.play('success'), 500);
      ctx.complete();
      camT = { x: W.ox / 2, y: W.oy / 2 };
      later(() => {
        finale.replaceChildren(
          h('h2', { class: 'display' }, 'Alle fünf schlafen'),
          h('p', {}, 'Der Wald dämmert auf, so weit es in einer Neumondnacht geht. Und der Mond? Der hat sich hinter die Wolke gesetzt. Neumond ist eben Neumond.'),
          h('div', { class: 'd09-final-btns' },
            button('Noch einmal leuchten', () => reset(), { variant: 'ghost small' }),
            button('Zurück zum Berg', () => ctx.close(), { variant: 'small' })));
        finale.classList.add('is-on');
      }, 2600);
    }
    function reset() {
      found = new Set(); done = false; active = true; reveal = 0; noFind = 0; idleT = 99; hintSpot = null;
      dwell = SLEEPERS.map(() => 0);
      glows.replaceChildren(); over.replaceChildren();
      dots.forEach((d) => d.classList.remove('on'));
      count.querySelector('.d09-count-t').textContent = '0 von 5';
      stage.classList.remove('is-done');
      finale.classList.remove('is-on');
      setCue([h('span', {}, 'Die Laterne brennt wieder. Wer schläft diesmal wo? Immer noch am selben Platz.')], 6000);
      ctx.sfx.play('ignite');
    }

    // ---------- Eingabe ----------
    on(hintBtn, 'click', showHint);
    on(hintBtn, 'pointerdown', (e) => e.stopPropagation());
    on(view, 'pointerdown', (e) => {
      if (!active) return;
      e.preventDefault();
      view.setPointerCapture?.(e.pointerId);
      pointerDown = true; moved = false; idleT = 0;
      pointer = local(e); down0 = { ...pointer };
      light = { x: pointer.x, y: pointer.y }; // beim Antippen sitzt das Licht genau unter dem Finger
      // direktes Antippen eines Schläfers zählt sofort
      const i = SLEEPERS.findIndex((s, n) => {
        if (found.has(n)) return false;
        const sc = sleeperScreen(s);
        return Math.hypot(pointer.x - sc.x, pointer.y - sc.y) < s.r * W.w * .8;
      });
      if (i >= 0) dwell[i] = DWELL * .55;
    });
    on(view, 'pointermove', (e) => {
      if (!pointerDown) return;
      pointer = local(e); idleT = 0;
      if (!moved && Math.hypot(pointer.x - down0.x, pointer.y - down0.y) > 8) moved = true;
    });
    const up = () => { pointerDown = false; moved = false; };
    on(view, 'pointerup', up);
    on(view, 'pointercancel', up);
    on(view, 'contextmenu', (e) => e.preventDefault());

    // ---------- Malen ----------
    function drawSnow(t, dt) {
      const g = gSnow; if (!g) return;
      g.clearRect(0, 0, V.w, V.h);
      g.fillStyle = '#f4f7ff';
      for (const f of flakes) {
        f.y += dt * (.035 + f.s * .035); f.x += Math.sin(t * .6 + f.p) * dt * .012;
        if (f.y > 1.02) { f.y = -.02; f.x = (f.x + .37) % 1; }
        g.globalAlpha = .55; g.beginPath(); g.arc(((f.x % 1) * V.w), f.y * V.h, f.s * 1.5, 0, 6.283); g.fill();
      }
      g.globalAlpha = 1;
    }
    const stop = ctx.fx.loop((dt, t) => {
      if (document.hidden || !gDark) return;
      const now = performance.now() / 1000;
      // Kamera: Randschub, Intro- und Finale-Drift
      if (active && pointerDown) {
        const zx = V.w * .22, zy = V.h * .2;
        const vx = pointer.x < zx ? -(1 - pointer.x / zx) : pointer.x > V.w - zx ? (pointer.x - (V.w - zx)) / zx : 0;
        const vy = pointer.y < zy ? -(1 - pointer.y / zy) : pointer.y > V.h - zy ? (pointer.y - (V.h - zy)) / zy : 0;
        camT.x += vx * 430 * dt; camT.y += vy * 380 * dt; clampCam(camT);
      } else if (!active && !done && !reduced) {
        camT.x = W.ox * (.5 + .5 * Math.sin(t * .1)); camT.y = W.oy * (.5 + .4 * Math.sin(t * .07 + 1));
      }
      const ce = reduced ? 1 : 1 - Math.exp(-dt * (hintSpot || done ? 3.2 : 5));
      cam.x += (camT.x - cam.x) * ce; cam.y += (camT.y - cam.y) * ce;
      const tr = `translate3d(${(-cam.x).toFixed(1)}px,${(-cam.y).toFixed(1)}px,0)`;
      if (tr !== lastTransform) { world.style.transform = over.style.transform = tr; lastTransform = tr; }

      // Licht
      if (pointerDown) idleT = 0; else idleT += dt;
      const wander = !active || idleT > 2.6;
      let tx, ty;
      const k = reduced ? 1 : 1 - Math.exp(-dt * 13);
      if (pointerDown && active) {
        lightOff += ((moved ? 52 : 0) - lightOff) * (1 - Math.exp(-dt * 10));
        tx = pointer.x; ty = pointer.y - lightOff;
      } else if (wander) {
        lightOff = 0;
        tx = V.w * (.5 + .27 * Math.sin(t * .43)); ty = V.h * (.5 + .3 * Math.sin(t * .31 + 1));
      } else { tx = light.x; ty = light.y; }
      const kk = wander && !pointerDown ? Math.min(1, dt * 2.2) : k;
      light.x += (tx - light.x) * kk; light.y += (ty - light.y) * kk;
      const strong = active && (pointerDown || idleT < 2.6);

      // Finden
      if (active && pointerDown) {
        SLEEPERS.forEach((s, i) => {
          if (found.has(i)) return;
          const sc = sleeperScreen(s);
          const inside = Math.hypot(light.x - sc.x, light.y - sc.y) < s.r * W.w * .62;
          dwell[i] = inside ? dwell[i] + dt : Math.max(0, dwell[i] - dt * 2);
          if (dwell[i] >= DWELL) discover(i);
        });
      } else dwell = dwell.map((d) => Math.max(0, d - dt * 2));
      if (active) {
        noFind += dt;
        if (noFind > 38 && found.size < 5) { showHint(); noFind = -22; }
      }
      if (done) reveal = Math.min(1, reveal + dt * (reduced ? 3 : .34));

      // Dunkelheit
      const g = gDark;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, V.w, V.h);
      const ease = reveal * reveal * (3 - 2 * reveal);
      if (ease < 1) {
        g.fillStyle = `rgba(2, 5, 15, ${DARK * (1 - ease)})`;
        g.fillRect(0, 0, V.w, V.h);
        g.globalCompositeOperation = 'destination-out';
        const flick = 1 + Math.sin(t * 13) * .018 + Math.sin(t * 7.3 + 1) * .015;
        const R = Math.min(V.w, V.h) * (strong ? .3 : .2) * flick * (done ? 1 + ease * 2 : 1);
        const a = strong ? 1 : .62;
        const grad = g.createRadialGradient(light.x, light.y, R * .05, light.x, light.y, R);
        grad.addColorStop(0, `rgba(0,0,0,${a})`);
        grad.addColorStop(.38, `rgba(0,0,0,${a * .88})`);
        grad.addColorStop(.7, `rgba(0,0,0,${a * .38})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad; g.fillRect(light.x - R, light.y - R, R * 2, R * 2);
        for (const i of found) {
          const s = SLEEPERS[i], sc = sleeperScreen(s);
          const ri = s.r * W.w * 1.15 * (1 + Math.sin(t * 1.3 + i) * .04);
          if (sc.x < -ri || sc.x > V.w + ri || sc.y < -ri || sc.y > V.h + ri) continue;
          const halo = g.createRadialGradient(sc.x, sc.y, ri * .1, sc.x, sc.y, ri);
          halo.addColorStop(0, 'rgba(0,0,0,.95)'); halo.addColorStop(.4, 'rgba(0,0,0,.78)'); halo.addColorStop(.72, 'rgba(0,0,0,.28)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = halo; g.fillRect(sc.x - ri, sc.y - ri, ri * 2, ri * 2);
        }
        if (hintSpot) {
          if (now > hintSpot.until) hintSpot = null;
          else {
            const s = SLEEPERS[hintSpot.i], sc = sleeperScreen(s);
            const left = hintSpot.until - now;
            const al = Math.min(1, left) * (.34 + .24 * Math.sin(t * 4.2));
            const ri = s.r * W.w * .95;
            const halo = g.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, ri);
            halo.addColorStop(0, `rgba(0,0,0,${al * 1.4})`); halo.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = halo; g.fillRect(sc.x - ri, sc.y - ri, ri * 2, ri * 2);
          }
        }
        // warmer Schein auf dem Bild und Flamme
        g.globalCompositeOperation = 'source-over';
        const warm = g.createRadialGradient(light.x, light.y, 0, light.x, light.y, R * .8);
        warm.addColorStop(0, `rgba(255,190,100,${.2 * a})`); warm.addColorStop(1, 'rgba(255,170,80,0)');
        g.fillStyle = warm; g.fillRect(light.x - R, light.y - R, R * 2, R * 2);
        if (active || !done) {
          const fl = g.createRadialGradient(light.x, light.y, 0, light.x, light.y, 15);
          fl.addColorStop(0, `rgba(255,248,222,${.95 * a})`); fl.addColorStop(.35, `rgba(255,214,140,${.55 * a})`); fl.addColorStop(1, 'rgba(255,190,100,0)');
          g.fillStyle = fl; g.beginPath(); g.arc(light.x, light.y, 15, 0, 6.283); g.fill();
          const dmax = Math.max(...dwell);
          if (dmax > .06 && active) {
            g.strokeStyle = 'rgba(255,230,170,.85)'; g.lineWidth = 2.2; g.lineCap = 'round';
            g.beginPath(); g.arc(light.x, light.y, 22, -Math.PI / 2, -Math.PI / 2 + (dmax / DWELL) * 6.283); g.stroke();
          }
        }
      }
      drawSnow(t, dt);
    });

    return () => {
      stop(); clearTimeout(cueTimer);
      timers.forEach(clearTimeout); timers.clear();
      listeners.forEach((off) => off());
      ro.disconnect();
    };
  },
};
