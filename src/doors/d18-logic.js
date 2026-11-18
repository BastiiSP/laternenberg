// Türchen 18 · Rätsel-Logik (ohne Oberfläche, per Node-Skript prüfbar).

export const LOCK_CODE = '042';
export const CODE_CLUES = [
  { guess: '682', right: 1, misplaced: 0 },
  { guess: '614', right: 0, misplaced: 1 },
  { guess: '206', right: 0, misplaced: 2 },
  { guess: '738', right: 0, misplaced: 0 },
  { guess: '780', right: 0, misplaced: 1 },
];

/** Passt der Code zu allen Hinweisen? (richtige Ziffer am richtigen Platz / richtige Ziffer am falschen Platz) */
export function fitsClues(code, clues = CODE_CLUES) {
  return clues.every(({ guess, right, misplaced }) => {
    let placed = 0, shared = 0;
    for (let i = 0; i < 3; i++) if (code[i] === guess[i]) placed++;
    for (const digit of '0123456789') shared += Math.min([...code].filter(x => x === digit).length, [...guess].filter(x => x === digit).length);
    return placed === right && shared - placed === misplaced;
  });
}

export const LIGHT_START = 294;
export const LIGHT_GOAL = 511;

/** Ein Tipp schaltet das Feld und seine direkten Nachbarn (oben, unten, links, rechts) um. */
export function toggleLight(board, index) {
  const row = Math.floor(index / 3), col = index % 3;
  let mask = 1 << index;
  if (row > 0) mask |= 1 << (index - 3);
  if (row < 2) mask |= 1 << (index + 3);
  if (col > 0) mask |= 1 << (index - 1);
  if (col < 2) mask |= 1 << (index + 1);
  return board ^ mask;
}

/** Kürzeste Zugzahl bis zum Ziel für jeden der 512 Zustände (Breitensuche vom Ziel aus; Züge sind selbstumkehrend). */
export function lightDistances() {
  const dist = new Array(512).fill(-1);
  dist[LIGHT_GOAL] = 0;
  const queue = [LIGHT_GOAL];
  for (let q = 0; q < queue.length; q++) {
    const cur = queue[q];
    for (let i = 0; i < 9; i++) {
      const next = toggleLight(cur, i);
      if (dist[next] < 0) { dist[next] = dist[cur] + 1; queue.push(next); }
    }
  }
  return dist;
}
const DIST = lightDistances();

/** Ein günstigster nächster Tipp (oder -1, wenn gelöst bzw. unlösbar). */
export function nextLightMove(board) {
  if (board === LIGHT_GOAL || DIST[board] < 0) return -1;
  for (let i = 0; i < 9; i++) if (DIST[toggleLight(board, i)] === DIST[board] - 1) return i;
  return -1;
}

/** Komplette kürzeste Zugfolge ab einem Zustand. */
export function solveLights(board) {
  const moves = [];
  let cur = board;
  while (cur !== LIGHT_GOAL) {
    const m = nextLightMove(cur);
    if (m < 0) return null;
    moves.push(m);
    cur = toggleLight(cur, m);
  }
  return moves;
}
