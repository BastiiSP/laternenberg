// Türchen 18 · Die Truhe mit drei Schlössern – Zahlenschloss, Rätselvers, Schalträtsel, dann das Finale.
import './d18.css';
import { LOCK_CODE, CODE_CLUES, LIGHT_START, LIGHT_GOAL, toggleLight, nextLightMove } from './d18-logic.js';

export { LOCK_CODE, CODE_CLUES, LIGHT_START, LIGHT_GOAL, toggleLight };
export { fitsClues } from './d18-logic.js';

const WORD = 'LATERNE';
const TILES = ['N', 'E', 'L', 'A', 'E', 'T', 'R'];
const VERSE = 'Ich trage Licht durch dunkle Nacht.\nEin kleines Haus hält es in Acht.\nAm Weg bin ich ein heller Schein.\nWie mag wohl mein Name sein?';

// Positionen im 2:3-Bild (Prozent), x/y der Vorhängeschlösser
const LOCKS = [
  { id: 'snow', mark: '❄', name: 'Schneeflocke', subtitle: 'Drei Räder, fünf Hinweise.', title: 'Drei Räder, ein Code.', x: 38.3, y: 70.8 },
  { id: 'moon', mark: '☾', name: 'Mond', subtitle: 'Ein Wort aus Licht.', title: 'Ein Wort aus Licht.', x: 50.2, y: 71.6 },
  { id: 'star', mark: '✦', name: 'Stern', subtitle: 'Neun Lichter, ein Schalter.', title: 'Neun Lichter, ein Schalter.', x: 61.9, y: 71.6 },
];
const HINTS = {
  snow: [
    'Fang bei „738“ an: Keine dieser drei Ziffern steckt im Code. Was heißt das für „780“?',
    'Die 6 ist nicht dabei, die 2 steht ganz rechts. Die 0 gehört nach links, und „614“ verrät dir die mittlere Ziffer.',
  ],
  moon: [
    'Gesucht ist etwas, das man durch die Nacht trägt und das sein Licht in einem kleinen Haus bewahrt.',
    'Das Wort hat sieben Buchstaben, beginnt mit L und endet mit E.',
  ],
  star: [
    'Die Reihenfolge deiner Tipps ist egal. Und kein Licht muss zweimal getippt werden.',
    'Ein Licht pulsiert: Das ist ein guter nächster Tipp. Nach jedem Tipp zeigt es dir den nächsten.',
  ],
};
const ANSWER = {
  snow: `Der Code lautet ${LOCK_CODE}. Die Räder drehen sich für dich.`,
  moon: `Das Wort lautet ${WORD}. Die Buchstaben ordnen sich für dich.`,
  star: 'Die Lichter schalten sich für dich ein.',
};
const CLUE_TEXT = [
  'Eine Ziffer stimmt und steht richtig.',
  'Eine Ziffer stimmt, steht aber falsch.',
  'Zwei Ziffern stimmen, beide stehen falsch.',
  'Keine Ziffer stimmt.',
  'Eine Ziffer stimmt, steht aber falsch.',
];
const MOTES = [[30, 54], [43, 50], [56, 47], [68, 44], [24, 62], [74, 58], [36, 66], [62, 63], [50, 56]];
const ROW = 52, RADIUS = 80;

export default {
  mount(root, ctx) {
    const { h, button } = ctx.ui;
    const reduced = ctx.reducedMotion;
    const timers = new Set();
    let gone = false;
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!gone) fn(); }, ms); timers.add(id); return id; };
    const pause = (ms) => new Promise(res => later(res, ms));

    // ---------- Bühne: Bild im 2:3-Behälter (füllt wie „cover“), Lichter sitzen auf den Bildstellen ----------
    const deco = h('div', { class: 'd18-deco', 'aria-hidden': 'true' },
      h('img', { class: 'd18-img', src: ctx.img('d18-truhe'), alt: '', draggable: 'false' }));
    [[67.3, 50, 150, 0], [50, 75, 330, -1.4], [38.3, 70.8, 70, -.6], [50.2, 71.6, 70, -1.1], [61.9, 71.6, 70, -2]].forEach(([x, y, size, delay], i) => {
      deco.append(h('i', { class: `d18-warm${i === 1 ? ' wide' : ''}`, style: { left: `${x}%`, top: `${y}%`, width: `${size}px`, height: `${size}px`, animationDelay: `${delay}s` } }));
    });
    MOTES.forEach(([x, y], i) => deco.append(h('i', { class: 'd18-mote', style: { left: `${x}%`, top: `${y}%`, animationDelay: `${-i * 1.3}s`, animationDuration: `${6 + (i % 4)}s` } })));
    const hotLayer = h('div', { class: 'd18-hots' });
    const art = h('div', { class: 'd18-art' }, deco, hotLayer);
    const artbox = h('div', { class: 'd18-artbox' }, art);
    const dim = h('div', { class: 'd18-dim', 'aria-hidden': 'true' });
    const screen = h('div', { class: 'd18-screen' });
    root.append(artbox, dim, screen);
    root.classList.add('d18-root');
    const setMode = (mode) => { root.dataset.d18 = mode; };

    // ---------- Zustand ----------
    let opened = ctx.store.get('opened', []);
    if (!Array.isArray(opened)) opened = [];
    opened = opened.filter(id => LOCKS.some(lock => lock.id === id));
    let chosen = null, attempts = 0, hintLevel = 0, justOpened = null, busy = false, opening = false;
    // Jede Ansicht (Menü, Rätsel, Finale) hat eine Nummer: verzögerte Aktionen einer alten Ansicht tun nichts mehr.
    let epoch = 0;
    const bind = () => { const e = epoch; return (fn, ms) => later(() => { if (e === epoch) fn(); }, ms); };
    let helpBox = null, panelEl = null, api = null, medalEl = null;
    const notice = (text) => { const el = screen.querySelector('.d18-notice'); if (el) { el.textContent = text; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } };
    const swap = (...els) => { screen.replaceChildren(...els); screen.scrollTop = 0; };
    const tick = () => { ctx.sfx.play('tick'); ctx.ui.haptic?.(8); };

    function openLock(id) {
      if (opening) return;
      opening = true;
      busy = true; // ab jetzt keine Eingaben und keine Navigation mehr
      const lt = bind();
      if (!opened.includes(id)) { opened.push(id); ctx.store.set('opened', opened); }
      justOpened = id;
      ctx.sfx.play('success');
      panelEl?.classList.add('unlocked');
      if (medalEl) ctx.fx.burstAt(medalEl, { count: 30, kind: 'spark', power: 260 });
      notice('Klick – das Schloss springt auf.');
      lt(() => { busy = false; opening = false; if (opened.length === LOCKS.length) showFinal(); else showMenu(); }, reduced ? 200 : 1500);
    }

    // ---------- Menü: die Truhe selbst, Schlösser als Tippflächen auf den Vorhängeschlössern ----------
    function buildHots() {
      hotLayer.replaceChildren(...LOCKS.map(lock => {
        const done = opened.includes(lock.id);
        const b = h('button', {
          type: 'button', class: `d18-hot${done ? ' done' : ''}`, disabled: done,
          style: { left: `${lock.x}%`, top: `${lock.y}%` },
          'aria-label': `${lock.name}: ${done ? 'geöffnet' : 'Rätsel öffnen'}`,
        }, h('i', { class: 'd18-hot-ring' }), h('i', { class: 'd18-hot-core' }), done ? h('b', { class: 'd18-hot-check' }, '✓') : null);
        if (lock.id === justOpened) b.classList.add('fresh');
        b.addEventListener('click', () => { if (!done) { ctx.sfx.play('tap'); showLock(lock.id); } });
        return b;
      }));
    }
    function showMenu() {
      epoch++;
      chosen = null; api = null; panelEl = null; medalEl = null;
      setMode('menu');
      buildHots();
      const left = LOCKS.length - opened.length;
      const fresh = justOpened && hotLayer.querySelector('.fresh');
      swap(
        h('div', { class: 'd18-head' },
          h('span', { class: 'd18-kicker' }, 'Drei Schlösser · Reihenfolge frei'),
          h('h2', { class: 'display' }, 'Die Truhe wartet.'),
          h('p', {}, 'Lorelai hat die Schlüssel „sicher verwahrt“. Die Schlösser lassen sich zum Glück auch ohne sie öffnen.')),
        h('div', { class: 'panel d18-foot' },
          h('div', { class: 'd18-pips', 'aria-hidden': 'true' }, LOCKS.map(l => h('span', { class: `d18-pip${opened.includes(l.id) ? ' on' : ''}` }, l.mark))),
          h('p', {}, opened.length === 0 ? 'Tippe auf eines der Schlösser an der Truhe.' : `Eins ist offen. Noch ${left === 1 ? 'ein Schloss' : `${left} Schlösser`}.`)));
      if (opened.length === 2) screen.querySelector('.d18-foot p').textContent = 'Eins ist noch zu. Du bist ganz nah dran.';
      if (opened.length === 3) screen.querySelector('.d18-foot p').textContent = 'Alle offen.';
      if (fresh) later(() => { ctx.fx.burstAt(fresh, { count: 26, kind: 'spark', power: 230 }); ctx.sfx.play('sparkle'); }, 250);
      justOpened = null;
    }

    // ---------- Hilfe: zwei Hinweisstufen, Auflösung auf Wunsch oder nach Fehlversuchen ----------
    function fail(text) {
      attempts++;
      ctx.sfx.play('wrong');
      notice(attempts >= 3 ? 'Knifflig, was? Die Auflösung ist jetzt da, wenn du magst.' : (text || 'Das Schloss rührt sich nicht. Ein Hinweis könnte helfen.'));
      updateHelp();
    }
    function updateHelp() {
      if (!helpBox || !chosen) return;
      const hints = HINTS[chosen];
      const canSolve = hintLevel >= 2 || attempts >= 3;
      helpBox.replaceChildren(...[
        hintLevel < 2
          ? button(`Hinweis ${hintLevel + 1} von 2`, () => { hintLevel++; updateHelp(); api?.onHint?.(hintLevel); }, { variant: 'ghost' })
          : null,
        ...hints.slice(0, hintLevel).map((text, i) => h('p', { class: 'd18-hint' }, h('b', {}, `Hinweis ${i + 1}`), text)),
        canSolve ? button('Auflösung zeigen', async () => {
          if (busy) return; busy = true;
          notice(ANSWER[chosen]);
          await api?.solve?.();
          busy = false; openLock(chosen);
        }, { variant: 'ghost' }) : null].filter(Boolean));
      helpBox.querySelectorAll('.d18-hint').forEach(el => el.classList.add('in'));
    }

    // ---------- Schneeflocke: Zahlenschloss mit Drehrädern ----------
    function makeWheel(index) {
      let pos = 0, drag = null, last = 0;
      const faces = Array.from({ length: 10 }, (_, d) => h('div', { class: 'd18-face', style: { transform: `rotateX(${-d * 36}deg) translateZ(${RADIUS}px)` } }, String(d)));
      const drum = h('div', { class: 'd18-drum' }, faces);
      const win = h('div', { class: 'd18-drum-win', tabindex: '0', role: 'spinbutton', 'aria-label': `Ziffer ${index + 1}`, 'aria-valuemin': '0', 'aria-valuemax': '9', 'aria-valuenow': '0' }, drum, h('i', { class: 'd18-drum-shade' }));
      const val = () => ((Math.round(pos) % 10) + 10) % 10;
      const apply = (anim, ms = 380) => {
        drum.style.transition = anim ? `transform ${ms}ms cubic-bezier(.25,1.35,.45,1)` : 'none';
        drum.style.transform = `translateZ(-${RADIUS}px) rotateX(${pos * 36}deg)`;
        faces.forEach((f, d) => f.classList.toggle('front', d === val()));
        win.setAttribute('aria-valuenow', String(val()));
      };
      const step = (dir) => { pos = Math.round(pos) + dir; apply(true); tick(); };
      win.addEventListener('pointerdown', (e) => {
        win.setPointerCapture?.(e.pointerId);
        drag = { y: e.clientY, pos, t: performance.now(), v: 0, py: e.clientY };
        last = val(); win.classList.add('grab');
      });
      win.addEventListener('pointermove', (e) => {
        if (!drag) return;
        pos = drag.pos - (e.clientY - drag.y) / ROW;
        const now = performance.now();
        drag.v = (drag.v * 0.6) + ((-(e.clientY - drag.py) / ROW) / Math.max(0.008, (now - drag.t) / 1000)) * 0.4;
        drag.py = e.clientY; drag.t = now;
        apply(false);
        if (val() !== last) { last = val(); tick(); }
      });
      const release = () => {
        if (!drag) return;
        const v = Math.max(-10, Math.min(10, drag.v));
        drag = null; win.classList.remove('grab');
        pos = Math.round(pos + v * 0.045);
        apply(true);
        if (val() !== last) tick();
      };
      win.addEventListener('pointerup', release);
      win.addEventListener('pointercancel', release);
      win.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); step(1); } else if (e.key === 'ArrowDown') { e.preventDefault(); step(-1); }
      });
      apply(false);
      const up = h('button', { type: 'button', class: 'd18-wstep', 'aria-label': `Ziffer ${index + 1} erhöhen`, onclick: () => step(1) }, h('i', { class: 'd18-chev up' }));
      const down = h('button', { type: 'button', class: 'd18-wstep', 'aria-label': `Ziffer ${index + 1} verringern`, onclick: () => step(-1) }, h('i', { class: 'd18-chev' }));
      return {
        el: h('div', { class: 'd18-wheel' }, up, win, down),
        win, val,
        spinTo(v, extra = 1) {
          const delta = ((v - val()) % 10 + 10) % 10;
          pos = Math.round(pos) + delta + extra * 10;
          apply(true, 1200);
        },
      };
    }
    function numberPuzzle() {
      const lt = bind();
      const wheels = [0, 1, 2].map(makeWheel);
      const row = h('div', { class: 'd18-wheels' }, wheels.map(w => w.el));
      const clues = h('ol', { class: 'd18-clues' }, CODE_CLUES.map((c, i) => h('li', { class: 'd18-clue' },
        h('span', { class: 'd18-ctiles', 'aria-label': `Versuch ${c.guess}` }, [...c.guess].map(d => h('b', {}, d))),
        h('span', { class: 'd18-ctext' }, h('i', { class: `d18-sym s${c.right ? 'f' : c.misplaced ? 'h' : 'n'}`, 'aria-hidden': 'true' }), CLUE_TEXT[i]))));
      const check = button('Schloss prüfen', () => {
        if (busy) return;
        const code = wheels.map(w => w.val()).join('');
        if (new Set(code).size < 3) { notice('Drei verschiedene Ziffern, bitte.'); row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake'); return; }
        if (code === LOCK_CODE) { wheels.forEach(w => w.win.classList.add('ok')); openLock('snow'); }
        else { row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake'); ctx.ui.haptic?.(30); fail(); }
      });
      check.classList.add('d18-check');
      api = {
        async solve() {
          const target = [...LOCK_CODE].map(Number);
          wheels.forEach((w, i) => lt(() => { w.spinTo(target[i], 1); ctx.sfx.play('whoosh'); }, i * 450));
          await pause(1700 + 900);
          wheels.forEach(w => w.win.classList.add('ok'));
        },
      };
      return h('div', { class: 'd18-puzzle' },
        h('p', { class: 'd18-lead' }, 'Lorelai hat schon fünfmal geraten und alles notiert. Gewonnen hat sie nicht. Jede Ziffer kommt im Code nur einmal vor.'),
        clues,
        h('div', { class: 'd18-lockbox' }, row),
        check);
    }

    // ---------- Mond: Rätselvers mit Buchstabenplättchen ----------
    function wordPuzzle() {
      const lt = bind();
      let picked = [];
      const slots = Array.from({ length: WORD.length }, () => h('button', { type: 'button', class: 'd18-slot', 'aria-label': 'leer' }));
      const slotRow = h('div', { class: 'd18-slots' }, slots);
      const tiles = TILES.map((letter, i) => h('button', { type: 'button', class: 'd18-tile', 'aria-label': `Buchstabe ${letter}` }, letter));
      const pool = h('div', { class: 'd18-tiles' }, tiles);
      const fly = (from, to, el) => {
        if (reduced || !from || !to || !el.animate) return;
        const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
        el.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(1.12) rotate(-8deg)` }, { transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.2,1.25,.4,1)' });
      };
      const paint = (flyFrom) => {
        slots.forEach((s, k) => {
          const i = picked[k];
          s.textContent = i == null ? '' : TILES[i];
          s.classList.toggle('full', i != null);
          s.setAttribute('aria-label', i == null ? 'leer' : `${TILES[i]} entfernen`);
        });
        tiles.forEach((t, i) => { t.classList.toggle('used', picked.includes(i)); t.disabled = picked.includes(i) || picked.length >= WORD.length; });
        if (flyFrom != null) fly(tiles[flyFrom], slots[picked.length - 1], slots[picked.length - 1]);
      };
      const add = (i) => {
        if (busy || picked.includes(i) || picked.length >= WORD.length) return;
        picked.push(i); tick(); paint(i); notice('');
        if (picked.length === WORD.length) lt(check, 420);
      };
      const check = async () => {
        const word = picked.map(k => TILES[k]).join('');
        if (word === WORD) {
          busy = true; // gelöst: keine Eingaben und keine Navigation mehr, bis das Schloss aufspringt
          slots.forEach((s, k) => lt(() => { s.classList.add('glow'); ctx.sfx.bell(520 + k * 70, { vol: 0.08, dur: 0.7 }); }, k * 110));
          lt(() => { busy = false; openLock('moon'); }, WORD.length * 110 + 150);
        } else {
          slotRow.classList.remove('shake'); void slotRow.offsetWidth; slotRow.classList.add('shake');
          fail('Das sind nicht die richtigen Buchstaben. Die Plättchen kehren zurück.');
          lt(() => { picked = []; paint(); }, 750);
        }
      };
      tiles.forEach((t, i) => t.addEventListener('click', () => add(i)));
      slots.forEach((s, k) => s.addEventListener('click', () => { if (busy || picked[k] == null) return; picked.splice(k, 1); ctx.sfx.play('tap'); paint(); }));
      paint();
      api = {
        async solve() {
          picked = []; paint();
          for (const letter of WORD) {
            const i = TILES.findIndex((t, k) => t === letter && !picked.includes(k));
            picked.push(i); ctx.sfx.play('tick'); paint(i);
            await pause(190);
          }
          await pause(500);
          slots.forEach(s => s.classList.add('glow'));
        },
      };
      return h('div', { class: 'd18-puzzle' },
        h('p', { class: 'd18-verse display' }, VERSE),
        h('p', { class: 'd18-lead' }, 'Tippe die Plättchen in der richtigen Reihenfolge.'),
        slotRow, pool,
        button('Alle zurücksetzen', () => { if (busy) return; picked = []; paint(); }, { variant: 'ghost' }));
    }

    // ---------- Stern: Schalträtsel 3×3 ----------
    function lightPuzzle() {
      const lt = bind();
      let board = LIGHT_START, moves = 0;
      const cells = Array.from({ length: 9 }, (_, i) => h('button', { type: 'button', class: 'd18-light', 'aria-label': `Licht ${i + 1}` },
        h('span', { class: 'd18-star' }, '✦')));
      const grid = h('div', { class: 'd18-grid', role: 'group', 'aria-label': 'Neun Lichter' }, cells);
      const counter = h('p', { class: 'd18-moves', role: 'status' });
      const paint = (stagger = []) => {
        cells.forEach((c, i) => {
          const on = !!(board & (1 << i));
          const delay = stagger.indexOf(i);
          c.style.transitionDelay = delay > 0 ? `${delay * 45}ms` : '0ms';
          c.classList.toggle('on', on);
          c.setAttribute('aria-label', `Licht ${i + 1}: ${on ? 'an' : 'aus'}`);
          c.classList.remove('hint');
        });
        counter.textContent = moves === 0 ? 'Alle neun Lichter sollen leuchten.' : `Tipps bisher: ${moves}`;
        if (hintLevel >= 2 && board !== LIGHT_GOAL) { const m = nextLightMove(board); if (m >= 0) cells[m].classList.add('hint'); }
      };
      const press = (i, auto = false) => {
        if (busy && !auto) return;
        const before = board;
        board = toggleLight(board, i);
        moves++;
        const changed = [i, ...[0, 1, 2, 3, 4, 5, 6, 7, 8].filter(k => k !== i && ((before ^ board) & (1 << k)))];
        paint(changed);
        cells[i].classList.remove('tap'); void cells[i].offsetWidth; cells[i].classList.add('tap');
        ctx.sfx.play('tick'); ctx.ui.haptic?.(10);
        if (board === LIGHT_GOAL) {
          cells.forEach((c, k) => lt(() => c.classList.add('glowy'), k * 70));
          if (!auto) {
            busy = true; // gelöst: keine Eingaben und keine Navigation mehr, bis das Schloss aufspringt
            lt(() => { busy = false; openLock('star'); }, 800);
          }
        } else if (!auto && moves >= 12 && attempts < 3) {
          attempts = 3; notice('Das Muster ist störrisch. Die Auflösung ist jetzt da, wenn du magst.'); updateHelp();
        }
      };
      cells.forEach((c, i) => c.addEventListener('click', () => press(i)));
      paint();
      api = {
        onHint() { paint(); },
        async solve() {
          for (let guard = 0; board !== LIGHT_GOAL && guard < 12; guard++) {
            const m = nextLightMove(board);
            if (m < 0) break;
            cells[m].classList.add('hint');
            await pause(520);
            press(m, true);
            await pause(380);
          }
          await pause(700);
        },
      };
      return h('div', { class: 'd18-puzzle' },
        h('p', { class: 'd18-lead' }, 'Ein Tipp schaltet das Licht und seine direkten Nachbarn um (oben, unten, links, rechts). Bring alle neun zum Leuchten.'),
        h('div', { class: 'd18-lockbox' }, grid), counter,
        button('Muster zurücksetzen', () => { if (busy) return; board = LIGHT_START; moves = 0; paint(); }, { variant: 'ghost' }));
    }

    // ---------- Rätselansicht ----------
    function showLock(id) {
      epoch++;
      chosen = id; attempts = 0; hintLevel = 0; busy = false; opening = false;
      setMode('lock');
      const lock = LOCKS.find(item => item.id === id);
      helpBox = h('div', { class: 'd18-help' });
      medalEl = h('div', { class: 'd18-medal', 'aria-hidden': 'true' }, lock.mark);
      const body = id === 'snow' ? numberPuzzle() : id === 'moon' ? wordPuzzle() : lightPuzzle();
      panelEl = h('div', { class: 'panel d18-panel' },
        medalEl,
        h('span', { class: 'd18-kicker' }, lock.name),
        h('h2', { class: 'display' }, lock.title),
        body,
        h('p', { class: 'd18-notice', role: 'status' }),
        helpBox);
      swap(
        h('div', { class: 'd18-top' }, button('‹  Zur Truhe', () => { if (!busy) showMenu(); }, { variant: 'small ghost' })),
        panelEl);
      updateHelp();
    }

    // ---------- Finale ----------
    function carrotSvg() {
      return ctx.ui.html(`
<svg class="d18-carrot-svg" viewBox="0 0 64 130" width="64" height="130" aria-hidden="true">
  <defs>
    <linearGradient id="d18cg" x1="0" x2="1"><stop offset="0" stop-color="#d08a14"/><stop offset=".42" stop-color="#ffe9a0"/><stop offset=".7" stop-color="#f4bd38"/><stop offset="1" stop-color="#b46f0c"/></linearGradient>
    <linearGradient id="d18cl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#b9a43c"/><stop offset="1" stop-color="#f1e08a"/></linearGradient>
  </defs>
  <path d="M32 40 C22 20 14 14 12 4 C22 8 30 18 32 30 C34 16 42 6 54 2 C50 14 40 24 34 40 Z" fill="url(#d18cl)"/>
  <path d="M30 38 C24 26 20 18 22 8 C28 16 32 26 32 38 Z" fill="#e8d27a"/>
  <path d="M32 126 C24 104 11 70 13 50 C15 34 49 34 51 50 C53 70 40 104 32 126 Z" fill="url(#d18cg)" stroke="#c28a1c" stroke-width="1"/>
  <g fill="none" stroke="#b97a10" stroke-width="1.6" stroke-linecap="round" opacity=".55"><path d="M20 58 q8 4 16 0"/><path d="M24 74 q7 3 13 0"/><path d="M27 92 q5 2 8 0"/></g>
  <path d="M21 52 C19 68 24 86 29 100" fill="none" stroke="#fffbe0" stroke-width="3" stroke-linecap="round" opacity=".75"/>
</svg>`);
    }
    function showFinal() {
      epoch++;
      chosen = null; api = null; panelEl = null; medalEl = null;
      setMode('final');
      hotLayer.replaceChildren();
      art.querySelector('.d18-fin')?.remove();
      // Bilder-genaue Teile: Innenraum und Deckelkopie auf der Deckelfläche des Bildes
      const interior = h('div', { class: 'd18-interior' }, h('i'));
      const lidCopy = h('div', { class: 'd18-lidcopy' });
      const beam = h('div', { class: 'd18-beam' });
      const halo = h('i', { class: 'd18-halo' });
      const carrot = h('div', { class: 'd18-carrot' }, h('div', { class: 'd18-carrot-in' }, carrotSvg()), h('i', { class: 'd18-tw a' }, '✦'), h('i', { class: 'd18-tw b' }, '✦'), h('i', { class: 'd18-tw c' }, '✦'));
      const fliers = [[24, 41], [35, 34], [58, 34.5], [68, 41], [29, 51], [66, 50]].map(([x, y], i) => {
        const g = ctx.glimmling({ size: 40, mood: i % 3 === 0 ? 'wow' : 'happy' });
        return h('span', { class: 'd18-flier', style: { left: `${x}%`, top: `${y}%` } }, h('span', { class: 'd18-flier-in', style: { animationDelay: `${-i * 0.7}s` } }, g));
      });
      const fin = h('div', { class: 'd18-fin' }, interior, halo, beam, lidCopy, carrot, fliers);
      art.append(fin);
      screen.replaceChildren();
      ctx.sfx.play('fanfare');
      later(() => ctx.complete(), 1300);
      if (!reduced) {
        const rect = interior.getBoundingClientRect();
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height * 0.4;
        later(() => ctx.fx.burst(cx, cy, { count: 46, kind: 'spark', power: 340, gravity: 40, life: 1.6, size: 6, up: 0.9 }), 650);
        later(() => ctx.fx.burst(cx, cy - 30, { count: 22, kind: 'star', power: 260, gravity: 30, life: 2, size: 9, up: 1 }), 1500);
        later(() => ctx.sfx.play('sparkle'), 1900);
        later(() => ctx.sfx.play('chime'), 3300);
        // Glimmlinge strömen aus der Truhe
        const art2 = art.getBoundingClientRect();
        fliers.forEach((f, i) => {
          const dx = ((50 - parseFloat(f.style.left)) * art2.width) / 100;
          const dy = ((60 - parseFloat(f.style.top)) * art2.height) / 100;
          f.animate([
            { transform: `translate(${dx}px, ${dy}px) scale(.15)`, opacity: 0 },
            { opacity: 1, offset: 0.25 },
            { transform: `translate(${dx * -0.12}px, ${dy * -0.2}px) scale(1.12)`, opacity: 1, offset: 0.8 },
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
          ], { duration: 2300 + i * 120, delay: 1100 + i * 190, easing: 'cubic-bezier(.2,.8,.25,1)', fill: 'backwards' });
        });
      }
      const note = h('div', { class: 'card d18-note' },
        h('span', { class: 'd18-tape', 'aria-hidden': 'true' }),
        h('span', { class: 'd18-kicker' }, 'In der Truhe'),
        h('h2', { class: 'display' }, 'Eine goldene Möhre!'),
        h('div', { class: 'd18-paper' },
          // BASTI-STIMME
          h('p', { class: 'd18-basti' }, 'Alle drei Schlösser geknackt – du knobelst wirklich großartig.'),
          // BASTI-STIMME
          h('p', { class: 'd18-basti' }, 'Schön, dass es dich gibt.'),
          // BASTI-STIMME
          h('p', { class: 'd18-sign' }, '– Basti')));
      const bun = (who, flip, quote, cls) => h('div', { class: `d18-bun ${cls}` },
        h('div', { class: 'bubble d18-say' }, h('span', { class: 'who' }, who === 'lorelai' ? 'Lorelai' : 'Logan'), quote),
        ctx.bunny(who, { size: 74, flip }));
      screen.append(
        note,
        h('div', { class: 'd18-fin-bottom' },
          h('div', { class: 'd18-bunnies' },
            bun('lorelai', false, 'Die Möhre gehört mir. Ich hab sie zuerst gesehen!', 'l'),
            bun('logan', true, 'Ich hab sie zuerst gerochen. Das zählt doppelt.', 'r')),
          h('div', { class: 'd18-fin-btns' },
            button('Zurück zum Berg', () => ctx.close()),
            button('Rätsel noch einmal', () => { opened = []; ctx.store.set('opened', opened); art.querySelector('.d18-fin')?.remove(); showMenu(); }, { variant: 'small ghost' }))));
    }

    if (opened.length === LOCKS.length) showFinal(); else showMenu();
    return () => { gone = true; timers.forEach(clearTimeout); timers.clear(); };
  },
};
