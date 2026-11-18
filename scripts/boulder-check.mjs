// DOM-freier Nachweis für alle Boulder-Routen und die Ein-Zug-Hilfe.
import assert from 'node:assert/strict';
import { ALL_LEVELS, REACH, DYNO_REACH, parseLevel, stateKey, isTop, legalMoves, tryMove, nextBeta, analyse } from '../src/doors/d05-levels.js';

function inspect(def) {
  const lv = parseLevel(def);
  const startKey = stateKey(lv.start);
  const states = new Map([[startKey, lv.start]]);
  const edges = new Map();
  const fromStart = new Map([[startKey, 0]]);
  const queue = [lv.start];
  for (let i = 0; i < queue.length; i++) {
    const st = queue[i];
    const key = stateKey(st);
    const moves = legalMoves(lv, st);
    assert.equal(new Set(moves.map((m) => `${m.hand}:${m.to}:${stateKey(m.next)}`)).size, moves.length, `${def.id}: doppelter Zug`);
    edges.set(key, moves);
    for (const m of moves) {
      const hands = m.hand === 'LR' ? ['L', 'R'] : [m.hand];
      assert(hands.some((h) => {
        const result = tryMove(lv, st, h, m.to);
        return result.ok && stateKey(result.next) === stateKey(m.next);
      }), `${def.id}: ungültiger Übergang`);
      const target = lv.holds[m.to];
      const fixed = lv.holds[st[m.hand === 'L' ? 'R' : 'L']];
      if (m.kind === 'dyno') {
        assert.equal(st.L, st.R, `${def.id}: Dynamo ohne beide Hände am Absprung`);
        assert(lv.holds[st.L].dyno && target.t === 'henkel' && target.y > lv.holds[st.L].y, `${def.id}: Dynamo-Ziel`);
        assert(Math.hypot(target.x - lv.holds[st.L].x, target.y - lv.holds[st.L].y) <= DYNO_REACH, `${def.id}: Dynamo zu weit`);
      } else {
        assert(Math.hypot(target.x - fixed.x, target.y - fixed.y) <= REACH, `${def.id}: Reichweite überschritten`);
        assert(target.t !== 'seit' || target.hand === m.hand, `${def.id}: falsche Hand am Seitgriff`);
        assert(m.to !== st[m.hand === 'L' ? 'R' : 'L'] || target.t === 'henkel', `${def.id}: Match auf Nicht-Henkel`);
        const left = lv.holds[m.next.L];
        const right = lv.holds[m.next.R];
        assert(left.x <= right.x || left.cross || right.cross, `${def.id}: unerlaubtes Überkreuzen`);
      }
      const nk = stateKey(m.next);
      if (!states.has(nk)) {
        states.set(nk, m.next);
        fromStart.set(nk, fromStart.get(key) + 1);
        queue.push(m.next);
      }
    }
  }

  const topKeys = [...states].filter(([, st]) => isTop(lv, st)).map(([key]) => key);
  assert(topKeys.length > 0, `${def.id}: Top unerreichbar`);
  const reverse = new Map([...states.keys()].map((key) => [key, []]));
  for (const [key, moves] of edges) for (const m of moves) reverse.get(stateKey(m.next)).push(key);
  const toTop = new Map(topKeys.map((key) => [key, 0]));
  const backQueue = [...topKeys];
  for (let i = 0; i < backQueue.length; i++) {
    const key = backQueue[i];
    for (const parent of reverse.get(key)) if (!toTop.has(parent)) {
      toTop.set(parent, toTop.get(key) + 1);
      backQueue.push(parent);
    }
  }

  let dead = 0;
  for (const [key, st] of states) {
    const beta = nextBeta(lv, st);
    if (!toTop.has(key)) {
      dead++;
      assert.deepEqual(beta, { kind: 'dead', action: 'undo-or-restart' }, `${def.id}: Sackgassen-Hinweis`);
    } else if (isTop(lv, st)) {
      assert.equal(beta.kind, 'top');
    } else {
      assert.equal(beta.kind, 'move', `${def.id}: Beta fehlt für ${key}`);
      assert(edges.get(key).some((m) => m.hand === beta.move.hand && m.to === beta.move.to && stateKey(m.next) === stateKey(beta.move.next)), `${def.id}: Beta ist kein gültiger Zug`);
      assert.equal(toTop.get(stateKey(beta.move.next)), toTop.get(key) - 1, `${def.id}: Beta führt nicht näher ans Top`);
    }
  }

  // Unabhängige Zählung kürzester Folgen aus dem Start.
  const min = toTop.get(startKey);
  const ways = new Map([[startKey, 1]]);
  for (const [key] of [...states].sort(([a], [b]) => fromStart.get(a) - fromStart.get(b))) {
    const count = ways.get(key) || 0;
    for (const m of edges.get(key)) {
      const nk = stateKey(m.next);
      if (fromStart.get(nk) === fromStart.get(key) + 1) ways.set(nk, (ways.get(nk) || 0) + count);
    }
  }
  const optimal = topKeys.filter((key) => fromStart.get(key) === min).reduce((sum, key) => sum + (ways.get(key) || 0), 0);
  assert.equal(analyse(lv).dead, dead, `${def.id}: Statistik Sackgassen`);
  assert.equal(analyse(lv).optimalWays, optimal, `${def.id}: Statistik ideale Wege`);
  if (def.kind === 'boulder') assert.equal(optimal, 1, `${def.id}: Hauptboulder braucht eindeutige kürzeste Beta`);
  const path = [];
  let current = lv.start;
  while (!isTop(lv, current)) {
    const m = nextBeta(lv, current).move;
    path.push(`${m.hand}→(${lv.holds[m.to].x},${lv.holds[m.to].y})${m.kind === 'dyno' ? ' Dynamo' : ''}`);
    current = m.next;
  }
  if (def.id === 'd19-polarlicht') {
    assert(min >= 10, 'Projekt zu kurz');
    assert(path.some((step) => step.includes('Dynamo')), 'Dynamo fehlt in der Schlüssel-Beta');
  }
  return { min, states: states.size, dead, optimal, path: path.join(' · ') };
}

for (const [day, defs] of Object.entries(ALL_LEVELS)) {
  const mains = [];
  for (const def of defs) {
    const result = inspect(def);
    console.log(`${day} ${def.name}: min ${result.min} Züge, ${result.states} Zustände, ${result.dead} Sackgassen, ${result.optimal} ideale Beta(s)`);
    console.log(`  ${result.path}`);
    if (def.kind === 'boulder') mains.push(result);
  }
  if (day === '14') assert(mains.every((m) => m.dead > 0), 'Beide Überhang-Boulder brauchen Sackgassen');
  if (day === '5') assert(mains.every((m) => m.min >= 5 && m.min <= 7), 'Einführungsboulder außerhalb 5–7 Zügen');
}
console.log('Alle Routen und Beta-Hinweise geprüft.');
