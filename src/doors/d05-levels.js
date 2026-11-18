// Boulder-Regeln und Daten: DOM-frei, in Node direkt prüfbar.

/** Größter Abstand zwischen beiden Händen (in Rasterfeldern). */
export const REACH = 2.5;
/** Größte Sprungweite eines Dynamos vom Absprung aus. */
export const DYNO_REACH = 4.5;
export const COLS = 7;

const CODES = {
  H: { t: 'henkel' },
  S: { t: 'henkel', start: true },
  T: { t: 'henkel', top: true },
  D: { t: 'henkel', dyno: true },
  l: { t: 'leiste' },
  '[': { t: 'seit', hand: 'L' },
  ']': { t: 'seit', hand: 'R' },
  o: { t: 'sloper' },
  x: { t: 'leiste', cross: true },
};

/** Wandbeschreibung → Griffe mit Koordinaten (x nach rechts, y nach oben, Start unten). */
export function parseLevel(def) {
  const rows = def.wall.length;
  const holds = [];
  let start = -1;
  let top = -1;
  let starts = 0;
  let tops = 0;
  def.wall.forEach((line, r) => {
    const cells = [...line.replace(/\s+/g, '')];
    if (cells.length !== COLS) throw new Error(`${def.id}: Zeile ${r + 1} hat ${cells.length} statt ${COLS} Spalten`);
    cells.forEach((ch, x) => {
      if (ch === '.') return;
      const c = CODES[ch];
      if (!c) throw new Error(`${def.id}: unbekannter Griff "${ch}"`);
      const h = { id: holds.length, x, y: rows - 1 - r, ...c };
      holds.push(h);
      if (c.start) { start = h.id; starts++; }
      if (c.top) { top = h.id; tops++; }
    });
  });
  if (starts !== 1 || tops !== 1) throw new Error(`${def.id}: genau ein Start und ein Top nötig`);
  return { ...def, rows, cols: COLS, holds, start: { L: start, R: start, pL: 0, pR: 0 }, top, ruleSet: new Set(def.rules || []) };
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const otherHand = (hand) => (hand === 'L' ? 'R' : 'L');
export const stateKey = (s) => `${s.L}.${s.R}.${s.pL}.${s.pR}`;
export const isTop = (lv, s) => s.L === lv.top && s.R === lv.top;
export const isCrossed = (lv, s) => lv.holds[s.L].x > lv.holds[s.R].x;

/**
 * Prüft einen Zug: Hand `hand` ('L'|'R') greift Griff `to`.
 * Ergebnis: { ok:true, kind:'move'|'match'|'dyno', next } oder { ok:false, reason }.
 * Zustand s: { L, R, pL, pR } – Griff je Hand und Sloper-Zähler (Züge der anderen Hand seit dem Greifen).
 */
export function tryMove(lv, s, hand, to) {
  if (hand !== 'L' && hand !== 'R') return { ok: false, reason: 'hand' };
  const H = lv.holds;
  const oh = otherHand(hand);
  const cur = s[hand];
  const oth = s[oh];
  const T = H[to];
  if (!T) return { ok: false, reason: 'none' };
  if (to === cur) return { ok: false, reason: s.L === s.R ? 'same-both' : 'same' };
  // Dynamo: beide Hände am Absprung, Ziel weiter weg als ein normaler Zug.
  if (lv.ruleSet.has('dyno') && s.L === s.R && H[cur].dyno && dist(H[cur], T) > REACH) {
    if (T.y <= H[cur].y) return { ok: false, reason: 'dyno-down' };
    if (dist(H[cur], T) > DYNO_REACH) return { ok: false, reason: 'dyno-far' };
    if (T.t !== 'henkel') return { ok: false, reason: 'dyno-catch' };
    return { ok: true, kind: 'dyno', next: { L: to, R: to, pL: 0, pR: 0 } };
  }
  // Die andere Hand hängt schon einen Zug lang am Sloper: Sie muss jetzt weiter.
  if (H[oth].t === 'sloper' && s['p' + oh] >= 1) return { ok: false, reason: 'sloper' };
  if (T.t === 'seit' && T.hand !== hand) return { ok: false, reason: 'side' };
  if (to === oth && T.t !== 'henkel') return { ok: false, reason: T.t === 'sloper' ? 'match-sloper' : 'match' };
  if (dist(T, H[oth]) > REACH) return { ok: false, reason: lv.ruleSet.has('dyno') ? 'far-dyno' : 'far' };
  const nL = hand === 'L' ? to : oth;
  const nR = hand === 'R' ? to : oth;
  if (H[nL].x > H[nR].x && !(H[nL].cross || H[nR].cross)) return { ok: false, reason: lv.ruleSet.has('cross') ? 'cross-x' : 'cross' };
  const next = { L: nL, R: nR, pL: 0, pR: 0 };
  next['p' + oh] = H[oth].t === 'sloper' ? s['p' + oh] + 1 : 0;
  return { ok: true, kind: to === oth ? 'match' : 'move', next };
}

/** Alle erlaubten Züge aus Zustand s. hand ist 'L', 'R' oder 'LR' (Dynamo). */
export function legalMoves(lv, s) {
  const out = [];
  const seen = new Set();
  for (const hand of ['L', 'R']) {
    for (const h of lv.holds) {
      const r = tryMove(lv, s, hand, h.id);
      if (!r.ok) continue;
      const k = stateKey(r.next) + r.kind;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ hand: r.kind === 'dyno' ? 'LR' : hand, to: h.id, kind: r.kind, next: r.next });
    }
  }
  return out;
}

/** Breitensuche zum Top. Ergebnis: { moves, path:[{hand,to,kind,next}] } oder null (kein Weg). */
export function solve(lv, s = lv.start) {
  const startKey = stateKey(s);
  const prev = new Map([[startKey, null]]);
  const q = [s];
  for (let i = 0; i < q.length; i++) {
    const cur = q[i];
    if (isTop(lv, cur)) {
      const path = [];
      let k = stateKey(cur);
      while (prev.get(k)) {
        const p = prev.get(k);
        path.unshift(p.move);
        k = p.from;
      }
      return { moves: path.length, path };
    }
    const ck = stateKey(cur);
    for (const m of legalMoves(lv, cur)) {
      const k = stateKey(m.next);
      if (prev.has(k)) continue;
      prev.set(k, { from: ck, move: m });
      q.push(m.next);
    }
  }
  return null;
}

/** Ein einziger Hinweis; aus einer Sackgasse wird ausdrücklich der Ausweg genannt. */
export function nextBeta(lv, s) {
  if (isTop(lv, s)) return { kind: 'top' };
  const route = solve(lv, s);
  return route ? { kind: 'move', move: route.path[0], remaining: route.moves } : { kind: 'dead', action: 'undo-or-restart' };
}

/** Kennzahlen für das Prüfskript: erreichbare Stellungen, Sackgassen, Zahl idealer Wege. */
export function analyse(lv) {
  const dist0 = new Map([[stateKey(lv.start), 0]]);
  const ways = new Map([[stateKey(lv.start), 1]]);
  const states = new Map([[stateKey(lv.start), lv.start]]);
  const q = [lv.start];
  for (let i = 0; i < q.length; i++) {
    const cur = q[i];
    const k = stateKey(cur);
    for (const m of legalMoves(lv, cur)) {
      const nk = stateKey(m.next);
      if (!dist0.has(nk)) {
        dist0.set(nk, dist0.get(k) + 1);
        ways.set(nk, 0);
        states.set(nk, m.next);
        q.push(m.next);
      }
      if (dist0.get(nk) === dist0.get(k) + 1 && !isTop(lv, cur)) ways.set(nk, ways.get(nk) + ways.get(k));
    }
  }
  let dead = 0;
  let stuck = 0;
  for (const st of states.values()) {
    if (!legalMoves(lv, st).length) stuck++;
    if (!solve(lv, st)) dead++;
  }
  const topKey = stateKey({ L: lv.top, R: lv.top, pL: 0, pR: 0 });
  return { states: states.size, dead, stuck, optimalWays: ways.get(topKey) || 0 };
}

// Alle Boulder der Türchen 5, 14 und 19 als Daten.
// Wand: 7 Spalten, Zeilen von oben nach unten. Jede Zeile hat 7 Zeichen (Leerzeichen zählen nicht).
//   .  leer            H  Henkel (beide Hände, matchen erlaubt)
//   S  Start (Henkel, beide Hände beginnen hier)
//   T  Top (Henkel, beide Hände = geschafft)
//   l  Leiste (nur eine Hand)
//   [  Seitgriff für die linke Hand     ]  Seitgriff für die rechte Hand
//   o  Sloper (eine Hand, beim übernächsten Zug muss sie weiter)
//   x  Kreuzgriff (Leiste; hängt eine Hand hier, darf überkreuzt werden)
//   D  Absprung für den Dynamo (Henkel)
// Lösbarkeit und ideale Zugzahl prüft scripts/boulder-check.mjs per Breitensuche;
// das Türchen berechnet die ideale Zugzahl beim Laden selbst.

const BASIS = ['reach', 'match', 'nocross'];

export const D05 = [
  {
    id: 'd05-aufwaermer',
    kind: 'uebung',
    name: 'Aufwärmer',
    grade: '3',
    color: '#ffd04a',
    rules: [...BASIS],
    teach: ['reach', 'match', 'nocross'],
    wall: [
      '. . . T . . .',
      '. . . . . . .',
      '. . l . . . H',
      '. . . . . . .',
      '. . . S . . .',
    ],
  },
  {
    id: 'd05-teepause',
    kind: 'boulder',
    name: 'Teepause',
    grade: '4',
    color: '#ff8a3d',
    rules: [...BASIS, 'side'],
    teach: ['side'],
    wall: [
      '. . T . . . .',
      '. l . . . . .',
      'H . . . . . .',
      '. ] . . . . .',
      'l . . . l . H',
      '. . ] . . . .',
      'l . . . H . .',
      '. . S . . . .',
    ],
  },
  {
    id: 'd05-hafermilchschaum',
    kind: 'boulder',
    name: 'Hafermilchschaum',
    grade: '4+',
    color: '#4fc3f7',
    rules: [...BASIS, 'side'],
    wall: [
      '. . T . . . .',
      '. . . . H . .',
      '. . . . . . .',
      'H . . . [ . .',
      '. l . . . . l',
      '. . . . [ . .',
      'H . H . . l .',
      '. . . S . . .',
    ],
  },
];

const VOLL = [...BASIS, 'side', 'sloper', 'cross'];

export const D14 = [
  {
    id: 'd14-kaffeetasse',
    kind: 'uebung',
    name: 'Tasse ohne Henkel',
    grade: '4',
    color: '#9be15d',
    rules: VOLL,
    teach: ['sloper'],
    wall: [
      '. . . T . . .',
      '. . . . . . .',
      '. . o . . . .',
      '. . . . l . .',
      '. . l . . . .',
      '. . . S . . .',
    ],
  },
  {
    id: 'd14-knoten',
    kind: 'uebung',
    name: 'Knoten',
    grade: '4',
    color: '#f06292',
    rules: VOLL,
    teach: ['cross'],
    wall: [
      '. . T . . . .',
      '. . . . . . .',
      '. . ] . x . .',
      '. . . . . . .',
      '. . . S . . .',
    ],
  },
  {
    id: 'd14-kaffeesatz',
    kind: 'boulder',
    name: 'Kaffeesatz',
    grade: '5c',
    color: '#b388ff',
    rules: VOLL,
    wall: [
      '. . . . . T .',
      '. . . . . . .',
      '. H . . x . o',
      'l . H . . . .',
      '. . . . . . .',
      'o . . . . o .',
      '. ] . x . . x',
      'l . [ . . . .',
      '. . . S . . .',
    ],
  },
  {
    id: 'd14-schneewechte',
    kind: 'boulder',
    name: 'Schneewechte',
    grade: '6a',
    color: '#ff5a5a',
    rules: VOLL,
    wall: [
      '. . . T . . .',
      '. . . . . . l',
      'o . o . . x .',
      '. . . o . . [',
      '. l . . . . .',
      '. . . . [ . o',
      '. . . . . . .',
      '. . o . . l .',
      '. . . S . . .',
    ],
  },
];

const ALLES = [...VOLL, 'dyno'];

export const D19 = [
  {
    id: 'd19-sprungbrett',
    kind: 'uebung',
    name: 'Sprungbrett',
    grade: '5a',
    color: '#4dd0e1',
    rules: ALLES,
    teach: ['dyno'],
    wall: [
      '. . . T . . .',
      '. . . . . . .',
      '. . . . . . .',
      '. . . . . . .',
      '. . . D . . .',
      '. . . . . . .',
      '. . . S . . .',
    ],
  },
  {
    id: 'd19-polarlicht',
    kind: 'boulder',
    name: 'Polarlicht',
    grade: '6c+',
    color: '#ffd166',
    rules: ALLES,
    wall: [
      '. . . . . T .',
      '. . ] . . . .',
      '. o . . l . .',
      '. . H . . . l',
      '. l . . [ . .',
      '. . . . . . .',
      '. . . D . . .',
      '. . . . o . .',
      '. . . . . . H',
      'H . . . l . .',
      '. . . S . . .',
    ],
  },
];

export const ALL_LEVELS = { 5: D05, 14: D14, 19: D19 };
