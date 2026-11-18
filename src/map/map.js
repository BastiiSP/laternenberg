// Die Karte: ein Berg zum Hochscrollen, 24 Laternen, zwei Kaninchen und ein paar Geheimnisse.
import { h, html, toast, img, button } from '../core/ui.js';
import { sfx, ambient, unlockAudio, setSound, soundOn } from '../core/audio.js';
import { Snow, burst, loop, rand, pick, wait, clamp, reducedMotion, fitCanvas } from '../core/fx.js';
import { store } from '../core/store.js';
import { openDoor, isDoorOpen } from '../core/doors.js';
import { bunny, bunnyFace, glimmling, NAMES } from '../core/bunnies.js';
import { unlockedDay, isUnlocked, sleepsUntil, msUntil, moon, berlin, preview, nowMs, syncTime } from '../core/time.js';
import { DOORS, dateLabel } from '../content/meta.js';
import { QUIPS, LOCKED_LINES, GLIMM_LINES } from '../content/quips.js';
import { SECTIONS, LANTERNS, DUO_OFFSETS, GLIMM_SPOTS, SECRETS, WORLD_H, SEC_H, OVERLAP, FOOT, secTop, place } from './layout.js';

const LANTERN_SVG = `
<svg class="l-svg" viewBox="0 0 48 66" aria-hidden="true">
  <path d="M24 2.5a4.5 4.5 0 0 1 0 9" fill="none" stroke="#1b1f33" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M8.5 22 L24 9.5 L39.5 22 Z" fill="#232842" stroke="#0f1226" stroke-width="1.5" stroke-linejoin="round"/>
  <rect class="l-glass" x="12.5" y="22" width="23" height="27" rx="3.5"/>
  <path class="l-flame" d="M24 44c-6-3.5-4.6-9.6 0-15 4.6 5.4 6 11.5 0 15z"/>
  <path class="l-core" d="M24 43c-3-2-2.4-5 0-8 2.4 3 3 6 0 8z"/>
  <path d="M12.5 22v27M35.5 22v27M24 22v5M24 45v4" stroke="#0f1226" stroke-width="2" stroke-linecap="round" fill="none"/>
  <rect x="9" y="48.5" width="30" height="6" rx="2.5" fill="#232842" stroke="#0f1226" stroke-width="1.5"/>
  <rect x="21.5" y="54.5" width="5" height="9" fill="#1b1f33"/>
</svg>`;

export function createMap(app) {
  const els = {};
  const lanternEls = [];
  let currentDay = unlockedDay();
  let quipIndex = Math.floor(rand(QUIPS.length));
  let bubbleTimer = null;
  let scrollAnim = null;

  // ---------- Aufbau ----------
  const world = h('div', { class: 'world', style: { aspectRatio: `1 / ${WORLD_H}` } });
  const scroller = h('div', { class: 'world-scroll' }, world);
  const snowCanvas = h('canvas', { class: 'snow-layer', 'aria-hidden': 'true' });
  app.append(scroller, snowCanvas);

  // Gemalte Abschnitte + Dunkelheit, die mit jeder Laterne weicht
  const shades = {};
  for (const sec of SECTIONS) {
    const top = (secTop(sec.s) / WORLD_H) * 100;
    const height = (SEC_H / WORLD_H) * 100;
    const style = { top: top + '%', height: height + '%' };
    const image = h('img', { class: `sec sec-${sec.s}`, src: img(sec.img), alt: '', decoding: 'async', draggable: 'false', style });
    const shade = h('div', { class: `sec-shade sec-${sec.s}`, style });
    shades[sec.s] = shade;
    world.append(image, shade);
  }
  world.append(h('div', { class: 'world-foot', style: { height: (FOOT / WORLD_H) * 100 + '%' } },
    h('p', { class: 'foot-line display' }, 'Für Melli.'),
    h('p', { class: 'foot-sub' }, 'Ein Berg voller Laternen – von Basti.')));

  // Himmel: Sterne, Polarlicht, Mond, Titel
  const sky = h('div', { class: 'sky', style: { height: ((SEC_H * 0.5) / WORLD_H) * 100 + '%' } });
  const stars = h('canvas', { class: 'stars', 'aria-hidden': 'true' });
  const aurora = h('div', { class: 'aurora', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
  const title = h('div', { class: 'world-title' },
    h('h1', { class: 'display' }, 'Der Laternenberg'),
    h('p', {}, '24 Lichter für Melli'));
  sky.append(aurora, stars, title);
  world.append(sky);

  const moonEl = h('button', { class: 'moon', type: 'button', 'aria-label': 'Der Mond' });
  {
    const m = SECRETS.find((x) => x.id === 'mond');
    Object.assign(moonEl.style, pct(place(m.s, m.x, m.y)));
  }
  world.append(moonEl);
  renderMoon();

  // Nebelbänder über den Nähten
  for (let s = 1; s <= 3; s++) {
    const y = ((secTop(s) + OVERLAP / 2) / WORLD_H) * 100;
    world.append(h('div', { class: 'fog', style: { top: y + '%' }, 'aria-hidden': 'true' }, h('i'), h('i')));
  }

  // Lichtteiche und Laternen
  const pools = h('div', { class: 'pools', 'aria-hidden': 'true' });
  const lanternLayer = h('div', { class: 'lanterns' });
  world.append(pools, lanternLayer);
  for (let day = 1; day <= 24; day++) {
    const p = pct(place(LANTERNS[day].s, LANTERNS[day].x, LANTERNS[day].y));
    const pool = h('i', { class: 'pool', style: p });
    pools.append(pool);
    const btn = h('button', { class: 'lantern', type: 'button', style: p, 'data-day': day },
      h('span', { class: 'l-halo' }), html(LANTERN_SVG), h('span', { class: 'l-tag' }, String(day)));
    if (day === 24) btn.classList.add('grand');
    btn.addEventListener('click', () => tapLantern(day));
    lanternLayer.append(btn);
    lanternEls[day] = { btn, pool };
  }

  // Geheimnisse
  const secretLayer = h('div', { class: 'secrets' });
  world.append(secretLayer);
  for (const sec of SECRETS) {
    if (sec.id === 'mond') continue;
    const b = h('button', { class: `secret secret-${sec.fx}`, type: 'button', style: pct(place(sec.s, sec.x, sec.y)), 'aria-label': 'Etwas zum Entdecken' });
    if (sec.fx === 'owl') b.append(h('i', { class: 'owl-eyes' }, h('b'), h('b')));
    b.addEventListener('click', () => tapSecret(sec, b));
    secretLayer.append(b);
  }
  moonEl.addEventListener('click', () => tapSecret(SECRETS.find((s) => s.id === 'mond'), moonEl));

  // Glimmling des Tages
  const glimmBtn = h('button', { class: 'glimm-hide', type: 'button', 'aria-label': 'Da leuchtet etwas' }, glimmling({ size: 30 }));
  world.append(glimmBtn);
  glimmBtn.addEventListener('click', tapGlimmling);

  // Kaninchen
  const duo = h('div', { class: 'duo' });
  const lorelai = h('button', { class: 'duo-b', type: 'button', 'aria-label': 'Lorelai' }, bunny('lorelai', { size: 46 }));
  const logan = h('button', { class: 'duo-b', type: 'button', 'aria-label': 'Logan' }, bunny('logan', { size: 46, flip: true }));
  duo.append(lorelai, logan);
  world.append(duo);
  lorelai.addEventListener('click', () => tapBunny());
  logan.addEventListener('click', () => tapBunny());

  // Sprechblase der Karte
  const bubble = h('div', { class: 'map-bubble bubble', role: 'status' });
  world.append(bubble);

  // Bedienleiste
  const soundBtn = h('button', { class: 'hud-btn', type: 'button', 'aria-label': 'Ton an oder aus' });
  const bookBtn = h('button', { class: 'hud-btn', type: 'button', 'aria-label': 'Fundbuch' },
    html('<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 5.5C6.5 4 9.5 4 12 5.8 14.5 4 17.5 4 20 5.5v13c-2.5-1.5-5.5-1.5-8 .3-2.5-1.8-5.5-1.8-8-.3z M12 5.8v13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>'));
  const hud = h('div', { class: 'hud' }, bookBtn, soundBtn);
  const todayBtn = h('button', { class: 'today-pill', type: 'button' });
  app.append(hud, todayBtn);
  renderSound();
  soundBtn.addEventListener('click', () => {
    unlockAudio();
    setSound(!soundOn());
    renderSound();
    if (soundOn()) {
      sfx.play('chime');
      ambient.start();
    } else ambient.stop();
  });
  bookBtn.addEventListener('click', () => {
    sfx.play('page');
    openBook();
  });
  todayBtn.addEventListener('click', () => {
    sfx.play('tap');
    scrollToDay(focusDay(), { ms: 900 });
  });

  // Countdown vor dem 1. Dezember
  const countdown = h('div', { class: 'countdown panel' });
  world.append(countdown);

  // ---------- Schnee und Sterne ----------
  const snow = new Snow(snowCanvas, { density: reducedMotion() ? 0.3 : 0.9, wind: 10 });
  snow.start();
  // Solange ein Türchen offen ist, ruhen Schnee und Kartenanimationen (spart Akku und Ruckler im Türchen).
  const doorWatch = new MutationObserver(() => {
    snow.paused = document.documentElement.classList.contains('door-open');
  });
  doorWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  const starList = [];
  let starCtx = null;
  let starSize = { w: 0, h: 0 };
  let shooting = null;
  function fitStars() {
    const f = fitCanvas(stars);
    starCtx = f.ctx;
    starSize = f;
    starList.length = 0;
    for (let i = 0; i < 70; i++) starList.push({ x: rand(f.w), y: rand(f.h * 0.92), r: rand(0.5, 1.6), p: rand(6.28), s: rand(0.6, 2.2) });
  }
  let nextShoot = performance.now() / 1000 + rand(6, 14);
  const stopStars = loop((dt, t) => {
    if (document.hidden || isDoorOpen() || scroller.scrollTop > scroller.clientHeight * 1.2) return;
    if (!starCtx) return;
    const { w, h: hh } = starSize;
    starCtx.clearRect(0, 0, w, hh);
    for (const s of starList) {
      starCtx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
      starCtx.fillStyle = '#fff';
      starCtx.beginPath();
      starCtx.arc(s.x, s.y, s.r, 0, 6.283);
      starCtx.fill();
    }
    if (!shooting && t > nextShoot && !reducedMotion()) {
      shooting = { x: rand(w * 0.2, w * 0.9), y: rand(hh * 0.05, hh * 0.4), life: 0 };
      nextShoot = t + rand(14, 32);
    }
    if (shooting) {
      shooting.life += dt;
      const k = shooting.life / 0.9;
      const x = shooting.x - k * 150;
      const y = shooting.y + k * 70;
      const g = starCtx.createLinearGradient(x, y, x + 70, y - 33);
      g.addColorStop(0, `rgba(255,255,255,${0.95 * (1 - k)})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      starCtx.globalAlpha = 1;
      starCtx.strokeStyle = g;
      starCtx.lineWidth = 2;
      starCtx.lineCap = 'round';
      starCtx.beginPath();
      starCtx.moveTo(x, y);
      starCtx.lineTo(x + 70, y - 33);
      starCtx.stroke();
      if (k >= 1) shooting = null;
    }
    starCtx.globalAlpha = 1;
  });

  // ---------- Zustand ----------
  function pct(p) {
    return { left: p.left + '%', top: p.top + '%' };
  }

  /** Die Laterne, um die es heute geht. */
  function focusDay() {
    return clamp(currentDay, 1, 24);
  }

  function refresh() {
    currentDay = unlockedDay();
    for (let day = 1; day <= 24; day++) {
      const { btn, pool } = lanternEls[day];
      const lit = store.isOpened(day);
      const ready = !lit && isUnlocked(day);
      btn.classList.toggle('lit', lit);
      btn.classList.toggle('ready', ready);
      btn.classList.toggle('locked', !lit && !ready);
      btn.classList.toggle('today', day === currentDay && ready);
      btn.classList.toggle('done', store.isDone(day));
      pool.classList.toggle('on', lit);
      btn.setAttribute('aria-label', lit ? `Laterne ${day}: ${DOORS[day].title}` : ready ? `Laterne ${day} anzünden` : `Laterne ${day}, noch verschlossen`);
    }
    for (const sec of SECTIONS) {
      const [a, b] = sec.days;
      let lit = 0;
      for (let d = a; d <= b; d++) if (store.isOpened(d)) lit++;
      const k = lit / (b - a + 1);
      shades[sec.s].style.opacity = String(0.62 * (1 - k) ** 1.4);
    }
    const total = store.openedCount();
    world.style.setProperty('--glow', String(total / 24));
    aurora.style.opacity = String(0.25 + 0.75 * (total / 24));
    world.classList.toggle('all-lit', total >= 24);
    placeDuo();
    placeGlimmling();
    renderCountdown();
    updateTodayPill();
  }

  function placeDuo(animate = false) {
    const day = focusDay();
    const L = LANTERNS[day];
    const [dx, dy] = DUO_OFFSETS[day];
    const side = dx < 0 ? -1 : 1;
    const p = place(L.s, L.x + dx, L.y + dy);
    duo.classList.toggle('asleep', currentDay === 0);
    duo.classList.toggle('left', side < 0);
    if (animate) duo.classList.add('hopping');
    duo.style.left = p.left + '%';
    duo.style.top = p.top + '%';
    if (animate) setTimeout(() => duo.classList.remove('hopping'), 1500);
    // schlafende Kaninchen vor dem 1. Dezember
    if ((currentDay === 0) !== duo.dataset.sleep) {
      duo.dataset.sleep = currentDay === 0 ? '1' : '';
      lorelai.replaceChildren(bunny('lorelai', { size: 46, sleeping: currentDay === 0 }));
      logan.replaceChildren(bunny('logan', { size: 46, flip: true, sleeping: currentDay === 0 }));
    }
  }

  function glimmKey() {
    const b = berlin();
    return `g-${b.year}-${b.month}-${b.day}`;
  }
  function placeGlimmling() {
    const b = berlin();
    const idx = (b.day * 7 + b.month * 3) % GLIMM_SPOTS.length;
    const spot = GLIMM_SPOTS[idx];
    Object.assign(glimmBtn.style, pct(place(spot.s, spot.x, spot.y)));
    glimmBtn.classList.toggle('found', store.found(glimmKey()));
  }

  function renderCountdown() {
    if (currentDay > 0) {
      countdown.hidden = true;
      return;
    }
    countdown.hidden = false;
    const ms = Math.max(0, msUntil(1));
    const d = Math.floor(ms / 864e5);
    const hrs = Math.floor((ms % 864e5) / 36e5);
    const mins = Math.floor((ms % 36e5) / 6e4);
    const p = place(1, 0.5, 0.985);
    countdown.style.top = p.top + '%';
    countdown.replaceChildren(
      h('p', { class: 'cd-top' }, 'Pssst. Der Berg schläft noch.'),
      h('p', { class: 'cd-num display' }, d > 0 ? `${d} ${d === 1 ? 'Tag' : 'Tage'}, ${hrs} Std.` : `${hrs} Std., ${mins} Min.`),
      h('p', { class: 'cd-sub' }, 'bis zur ersten Laterne am 1. Dezember'));
  }

  function renderMoon() {
    const m = moon();
    const r = 46;
    const k = m.illum;
    const rx = r * Math.abs(1 - 2 * k);
    const sweep = k > 0.5 ? 1 : 0;
    const lit = `M0 ${-r} A${r} ${r} 0 0 1 0 ${r} A${rx} ${r} 0 0 ${sweep} 0 ${-r} Z`;
    moonEl.innerHTML = `<svg viewBox="-60 -60 120 120" width="100%" height="100%"><defs><radialGradient id="mg"><stop offset="0" stop-color="#fffdf2"/><stop offset="1" stop-color="#f3e9c6"/></radialGradient></defs>
      <circle r="58" fill="rgba(255,245,210,.10)"/><circle r="${r}" fill="rgba(160,175,230,.16)"/>
      <path d="${lit}" fill="url(#mg)" transform="${m.waxing ? '' : 'scale(-1 1)'}"/>
      <circle cx="-12" cy="-10" r="7" fill="rgba(120,120,160,.12)"/><circle cx="14" cy="16" r="10" fill="rgba(120,120,160,.10)"/><circle cx="18" cy="-18" r="5" fill="rgba(120,120,160,.10)"/></svg>`;
  }

  function renderSound() {
    soundBtn.innerHTML = soundOn()
      ? '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  }

  // ---------- Sprechblase ----------
  function say(anchor, text, who = null, { ms = 3600, below = false } = {}) {
    const wr = world.getBoundingClientRect();
    const ar = anchor.getBoundingClientRect();
    const sr = app.getBoundingClientRect();
    const cx = ar.left + ar.width / 2 - wr.left;
    const half = Math.min(150, wr.width / 2 - 14);
    const left = clamp(cx, half + 10, wr.width - half - 10);
    bubble.replaceChildren(...(who ? [h('span', { class: 'who' }, NAMES[who] || who)] : []), text);
    // Platz prüfen: oben passt sie nicht unter die Leiste, unten nicht an den Rand → umklappen
    const bh = bubble.offsetHeight + 24;
    const topSpace = ar.top - (sr.top + 62);
    const bottomSpace = sr.bottom - ar.bottom - 16;
    if (!below && topSpace < bh && bottomSpace > topSpace) below = true;
    else if (below && bottomSpace < bh && topSpace > bottomSpace) below = false;
    bubble.style.left = left + 'px';
    bubble.style.setProperty('--tail', cx - left + 'px');
    bubble.classList.toggle('below', below);
    bubble.style.top = (below ? ar.bottom - wr.top + 12 : ar.top - wr.top - 12) + 'px';
    bubble.classList.remove('show');
    // eslint-disable-next-line no-unused-expressions
    bubble.offsetWidth;
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), ms);
  }

  // ---------- Antippen ----------
  async function tapLantern(day) {
    unlockAudio();
    if (soundOn()) ambient.start();
    const { btn } = lanternEls[day];
    if (!isUnlocked(day)) {
      sfx.play('locked');
      btn.classList.remove('nope');
      // eslint-disable-next-line no-unused-expressions
      btn.offsetWidth;
      btn.classList.add('nope');
      const n = sleepsUntil(day);
      const who = day % 2 ? 'lorelai' : 'logan';
      say(btn, LOCKED_LINES[day % LOCKED_LINES.length](n), who, { below: btn.getBoundingClientRect().top < 150 });
      return;
    }
    const r = btn.getBoundingClientRect();
    const origin = { x: r.left + r.width / 2, y: r.top + r.height * 0.5 };
    const first = store.markOpened(day);
    if (first) {
      btn.classList.add('igniting');
      sfx.play('ignite');
      burst(origin.x, origin.y, { count: 34, power: 260, life: 1.3 });
      refresh();
      await wait(reducedMotion() ? 150 : 620);
      btn.classList.remove('igniting');
    } else {
      sfx.play('chime');
      await wait(120);
    }
    openDoor(day, { origin, onClose: afterDoor });
  }

  function afterDoor() {
    refresh();
    if (soundOn()) ambient.start();
    if (store.openedCount() >= 24) setTimeout(() => say(lanternEls[24].btn, 'Alle 24 brennen. Schau dir das an.', 'lorelai', { ms: 5000 }), 900);
  }

  function tapBunny() {
    unlockAudio();
    sfx.play('hop');
    if (currentDay === 0) {
      say(duo, 'Zzz … noch nicht … erst im Dezember … zzz.', 'logan');
      return;
    }
    const [who, text] = QUIPS[quipIndex % QUIPS.length];
    quipIndex++;
    const el = who === 'lorelai' ? lorelai : logan;
    el.classList.remove('boing');
    // eslint-disable-next-line no-unused-expressions
    el.offsetWidth;
    el.classList.add('boing');
    say(duo, text, who, { ms: 4200 });
    if (store.markFound('hasen')) setTimeout(() => toast('✦ Ins Fundbuch eingetragen: Die zwei vom Berg'), 700);
  }

  function tapGlimmling() {
    unlockAudio();
    const key = glimmKey();
    if (store.found(key)) return;
    store.markFound(key);
    sfx.play('squeak');
    const r = glimmBtn.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, { count: 16, kind: 'star', power: 150, life: 1 });
    say(glimmBtn, pick(GLIMM_LINES), 'Glimmling', { below: r.top < 160 });
    glimmBtn.classList.add('caught');
    setTimeout(() => {
      glimmBtn.classList.remove('caught');
      glimmBtn.classList.add('found');
    }, 1300);
  }

  function tapSecret(sec, el) {
    unlockAudio();
    const first = store.markFound('s-' + sec.id);
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let text = sec.say;
    if (sec.fx === 'moon') {
      const m = moon();
      const p = Math.round(m.illum * 100);
      // Vollmond am 24.12.2026 (02:28 MEZ): Hinweis nur im passenden Zeitraum.
      const b = berlin();
      const beforeXmas = b.year < 2026 || (b.year === 2026 && (b.month < 12 || b.day < 24));
      const xmasHint = beforeXmas ? ' Am 24. Dezember 2026 ist Vollmond.'
        : b.year === 2026 && b.month === 12 && b.day <= 25 ? ' Heute ist Vollmond.' : '';
      text = `${m.name}, etwa ${p} % beleuchtet – ausgerechnet für heute. Schau raus, ob er sich daran hält.${xmasHint || (m.illum > 0.985 ? ' Voller wird er nicht.' : '')}`;
      sfx.play('bell');
    } else if (sec.fx === 'owl') {
      sfx.play('hoot');
      el.classList.remove('act');
      // eslint-disable-next-line no-unused-expressions
      el.offsetWidth;
      el.classList.add('act');
    } else if (sec.fx === 'steam' || sec.fx === 'chalk') {
      sfx.play('whoosh');
      burst(cx, cy, { count: 14, kind: 'dot', colors: ['rgba(255,255,255,.7)', 'rgba(220,225,255,.5)'], power: 60, gravity: -70, life: 1.8, size: 9, up: 0.6 });
    } else if (sec.fx === 'ripple' || sec.fx === 'crack') {
      sfx.play(sec.fx === 'crack' ? 'tick' : 'drop');
      el.classList.remove('act');
      // eslint-disable-next-line no-unused-expressions
      el.offsetWidth;
      el.classList.add('act');
    } else if (sec.fx === 'window') {
      sfx.play('tap');
      el.classList.toggle('dark');
    } else if (sec.fx === 'aurora') {
      sfx.play('sparkle');
      aurora.classList.remove('flare');
      // eslint-disable-next-line no-unused-expressions
      aurora.offsetWidth;
      aurora.classList.add('flare');
    }
    say(el, text, null, { ms: 4600, below: r.top < 170 });
    if (first) setTimeout(() => toast(`✦ Ins Fundbuch eingetragen: ${sec.name}`), 800);
  }

  // ---------- Fundbuch ----------
  function openBook() {
    const found = SECRETS.filter((s) => store.found('s-' + s.id)).length + (store.found('hasen') ? 1 : 0);
    const glimms = Object.keys(store.state.found).filter((k) => k.startsWith('g-')).length;
    const list = h('ul', { class: 'book-list' },
      h('li', { class: store.found('hasen') ? 'got' : '' }, h('b', {}, store.found('hasen') ? 'Die zwei vom Berg' : '???'), h('span', {}, store.found('hasen') ? 'Lorelai und Logan. Reden gern. Tipp sie ruhig öfter an.' : 'Zwei, die immer an deiner Laterne warten.')),
      ...SECRETS.map((s) => {
        const got = store.found('s-' + s.id);
        return h('li', { class: got ? 'got' : '' }, h('b', {}, got ? s.name : '???'), h('span', {}, got ? 'Entdeckt.' : s.hint));
      }));
    const sheet = h('div', { class: 'sheet' },
      h('div', { class: 'sheet-card' },
        h('h2', { class: 'display' }, 'Fundbuch'),
        h('p', { class: 'dim small' }, 'Der Berg hat mehr als Laternen. Wer herumtippt, findet Dinge.'),
        h('div', { class: 'book-stats' },
          h('div', {}, h('b', { class: 'display' }, `${store.openedCount()}/24`), h('span', {}, 'Laternen')),
          h('div', {}, h('b', { class: 'display' }, `${found}/${SECRETS.length + 1}`), h('span', {}, 'Geheimnisse')),
          h('div', {}, h('b', { class: 'display' }, String(glimms)), h('span', {}, 'Glimmlinge'))),
        h('p', { class: 'book-note' }, glimmling({ size: 22 }), 'Jeden Tag versteckt sich ein Glimmling an einer neuen Stelle am Berg.'),
        list,
        button('Zurück zum Berg', () => close())));
    const close = () => {
      sheet.classList.remove('in');
      setTimeout(() => sheet.remove(), 350);
    };
    sheet.addEventListener('click', (e) => {
      if (e.target === sheet) close();
    });
    app.append(sheet);
    requestAnimationFrame(() => sheet.classList.add('in'));
  }

  // ---------- Scrollen ----------
  function dayScrollTop(day) {
    const L = LANTERNS[day];
    const y = ((secTop(L.s) + L.y * SEC_H) / WORLD_H) * world.offsetHeight;
    return clamp(y - scroller.clientHeight * 0.6, 0, world.offsetHeight - scroller.clientHeight);
  }

  function scrollTo(top, { ms = 1200 } = {}) {
    scrollAnim?.();
    if (reducedMotion() || ms <= 0) {
      scroller.scrollTop = top;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const from = scroller.scrollTop;
      const t0 = performance.now();
      const stop = loop(() => {
        const k = clamp((performance.now() - t0) / ms);
        const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
        scroller.scrollTop = from + (top - from) * e;
        if (k >= 1) end();
      });
      const end = () => {
        stop();
        scrollAnim = null;
        scroller.removeEventListener('touchstart', end);
        scroller.removeEventListener('wheel', end);
        resolve();
      };
      scrollAnim = end;
      scroller.addEventListener('touchstart', end, { passive: true });
      scroller.addEventListener('wheel', end, { passive: true });
    });
  }

  function scrollToDay(day, opts) {
    return scrollTo(dayScrollTop(day), opts);
  }

  function updateTodayPill() {
    const day = focusDay();
    const { btn } = lanternEls[day];
    const r = btn.getBoundingClientRect();
    const ar = app.getBoundingClientRect();
    const above = r.bottom < ar.top + 70;
    const below = r.top > ar.bottom - 40;
    todayBtn.classList.toggle('show', (above || below) && !isDoorOpen());
    const label = currentDay === 0 ? 'Zum Tal' : store.isOpened(day) ? `Laterne ${day}` : `Heute: Laterne ${day}`;
    todayBtn.textContent = `${above ? '↑' : '↓'} ${label}`;
  }
  let pillQueued = false;
  scroller.addEventListener('scroll', () => {
    if (pillQueued) return;
    pillQueued = true;
    requestAnimationFrame(() => {
      pillQueued = false;
      updateTodayPill();
    });
  }, { passive: true });

  // ---------- Leben ----------
  const onResize = () => {
    fitStars();
    updateTodayPill();
  };
  window.addEventListener('resize', onResize);
  fitStars();
  refresh();

  // Mitternacht: neue Laterne ohne Neuladen
  function tick() {
    const before = currentDay;
    const now = unlockedDay();
    if (currentDay === 0) renderCountdown();
    if (now !== before) {
      refresh();
      placeDuo(true);
      if (!isDoorOpen()) {
        sfx.play('sparkle');
        toast(`✦ Laterne ${now} wartet auf dich`);
      }
    }
  }
  const ticker = setInterval(tick, 20_000);

  // Serverzeit erneut abgleichen (Rückkehr in den Vordergrund, sonst alle 10 Minuten), dann die Karte aktualisieren.
  async function resync() {
    if (!(await syncTime())) return;
    renderMoon();
    tick();
    refresh();
  }
  const resyncTimer = setInterval(resync, 10 * 60_000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      renderMoon();
      refresh();
      resync();
    }
  });

  return {
    scroller,
    refresh,
    scrollToDay,
    scrollTo,
    focusDay,
    lanternEl: (d) => lanternEls[d].btn,
    say,
    tapLantern,
    destroy() {
      clearInterval(ticker);
      clearInterval(resyncTimer);
      doorWatch.disconnect();
      stopStars();
      snow.destroy();
      window.removeEventListener('resize', onResize);
    },
    get preview() {
      return preview;
    },
    nowMs,
    dateLabel,
    bunnyFace,
  };
}
