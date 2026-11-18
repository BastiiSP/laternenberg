// Gemeinsame Darstellung und Bedienung für Türchen 5, 14 und 19.
import { REACH, DYNO_REACH, COLS, parseLevel, otherHand, isTop, isCrossed, tryMove, legalMoves, solve, nextBeta } from './d05-levels.js';
import { gsap } from 'gsap';

// ======================================================================
// Teil 2 · Darstellung und Bedienung (nur Browser)
// ======================================================================

const TYPE_INFO = {
  henkel: { name: 'Henkel', text: 'Großer Griff. Beide Hände passen drauf – hier darfst du matchen.' },
  leiste: { name: 'Leiste', text: 'Schmale Kante. An dieser Rätselwand ist hier Platz für genau eine Hand.' },
  seit: { name: 'Seitgriff', text: 'Steht senkrecht. Nur die Hand, deren Buchstabe draufsteht (L oder R), kann daran ziehen.' },
  sloper: { name: 'Sloper', text: 'Rund und rutschig. An dieser Rätselwand muss die Hand beim übernächsten Zug wieder weg.' },
  cross: { name: 'Kreuzgriff ✕', text: 'Eine Markierung dieser Rätselwand für Kreuzzüge: Hängt eine Hand hier, darf die andere überkreuzen.' },
  dyno: { name: 'Absprung ⤒', text: 'Beide Hände hier, dann Sprung zu einem Henkel – an dieser Rätselwand bis knapp fünf Felder weit, nur nach oben.' },
  start: { name: 'Start', text: 'Mit Tape markiert. Hier hängen zu Beginn beide Hände.' },
  top: { name: 'Top ★', text: 'Beide Hände hier = geschafft.' },
};

export const RULE_CARDS = {
  reach: { title: 'Reichweite', text: 'An dieser Rätselwand kommt die freie Hand nur so weit, wie der Kreis um die andere Hand reicht.', types: [] },
  match: { title: 'Matchen', text: 'An dieser Rätselwand passen beide Hände nur auf einen Henkel – und am Top muss es sein.', types: ['henkel', 'top'] },
  nocross: { title: 'Links bleibt links', text: 'Die Hände überkreuzen nicht. Die linke bleibt links von der rechten.', types: [] },
  side: { title: 'Seitgriffe', text: 'An dieser Rätselwand hält ein Seitgriff nur für die Hand, deren Buchstabe draufsteht – manchmal liegt er auf der „falschen“ Seite.', types: ['seit'] },
  sloper: { title: 'Sloper', text: 'An dieser Rätselwand hält ein Sloper nur kurz: Beim übernächsten Zug muss die Hand dort wieder weg.', types: ['sloper'] },
  cross: { title: 'Kreuzgriff', text: 'Der Kreuzgriff ✕ ist eine Markierung dieser Rätselwand für Kreuzzüge: Hängt eine Hand dort, darf die andere Hand überkreuzen. Sonst gilt: Links bleibt links.', types: ['cross'] },
  dyno: { title: 'Dynamo', text: 'An dieser Rätselwand springst du so: Beide Hände am Absprung ⤒, dann einen Henkel weit über dir antippen.', types: ['dyno'] },
};

const HAND_NAME = { L: 'linke', R: 'rechte' };

function reasonText(reason, hand) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  switch (reason) {
    case 'same': return 'Da hängt die Hand doch schon.';
    case 'same-both': return 'Da hängen schon beide Hände.';
    case 'far': return pick(['Zu weit – so lange Arme hat hier niemand.', 'Zu weit. Die Arme sind schon am Anschlag.']);
    case 'far-dyno': return 'Zu weit für einen normalen Zug. Ohne Schwung wird das nichts.';
    case 'side': return `Der Seitgriff ist für die ${HAND_NAME[otherHand(hand)]} Hand – die ${HAND_NAME[hand]} rutscht da ab.`;
    case 'match': return 'Auf dieser Leiste ist nur Platz für eine Hand.';
    case 'match-sloper': return 'Auf dem Sloper hält nur eine Hand – und die kaum.';
    case 'sloper': return `Der Sloper rutscht! Erst muss die ${HAND_NAME[otherHand(hand)]} Hand da weg.`;
    case 'cross': return 'Nicht überkreuzen – das gibt einen Knoten.';
    case 'cross-x': return 'Überkreuzen geht nur, wenn eine Hand am Kreuzgriff ✕ hängt.';
    case 'dyno-down': return 'Dynamos gehen nach oben. Nach unten heißt das Abspringen.';
    case 'dyno-far': return 'Selbst mit Schwung zu weit.';
    case 'dyno-catch': return 'Ein Dynamo braucht hier einen Henkel zum Fangen.';
    default: return 'Das geht so nicht.';
  }
}

const QUIPS = {
  start: [
    [['logan', 'Welche Beta nehmen wir?'], ['lorelai', 'Sag du’s uns, du bist hier die Trainerin.']],
    [['lorelai', 'Ich hab die Beta schon gelesen. Also, ungefähr. Also, die Farbe.']],
    [['logan', 'Erste Reihe, weiche Matte. Ich bleib hier.']],
  ],
  firstMove: [[['lorelai', 'Füße! … ach nein, die macht sie ja selbst.']]],
  invalid: [
    [['logan', 'Der Griff läuft nicht weg. Wir auch nicht.']],
    [['lorelai', 'Andere Hand? Anderer Griff? Ich werf nur Ideen rein.']],
    [['logan', 'Erst lesen, dann greifen. Hab ich mal gehört.']],
  ],
  dead: [
    [['lorelai', 'Sackgasse. Ich sag’s nur, weil ich alles sage.']],
    [['logan', 'Rückgängig ist keine Schande. Rückgängig ist Taktik.']],
  ],
  side: [[['lorelai', 'Seitgriff. Will von der Seite angesprochen werden. Wie ich vor dem ersten Kaffee.']]],
  sloper: [[['lorelai', 'Ein Sloper. Wie eine Kaffeetasse ohne Henkel. Furchtbar.']]],
  cross: [[['logan', 'Überkreuzen. Mir knoten sich beim Zuschauen die Ohren.']]],
  dyno: [[['lorelai', 'Sie springt! Sie springt wirklich!'], ['logan', 'Ich hatte die Augen zu. War’s schön?']]],
  flash: [
    [['lorelai', 'Flash! Ich hatte nicht mal Zeit, Kaffee zu holen.']],
    [['logan', 'Saubere Beta. Ich klatsche mit den Ohren.']],
  ],
  top: [
    [['logan', 'Top ist Top. Hier zählt keiner nach.'], ['lorelai', 'Ich zähl nach. Aber ich sag nichts. Fast.']],
    [['lorelai', 'Top! Ich notiere das mit besonders ordentlichem Kreidestift.']],
  ],
  betaReady: [[['logan', 'Ich hätte da eine Idee. Der Knopf mit dem Stern.']]],
  betaUsed: [[['lorelai', 'Beta holen ist kein Schummeln. Das ist Trainingslehre.']]],
  restart: [
    [['logan', 'Neuer Versuch, neues Chalk.']],
    [['lorelai', 'Von vorn. Profis machen das ständig. Glaub ich.']],
  ],
  chalk: [[['logan', 'Krieg ich auch Chalk? Für die Pfoten. Oder als Snack.']]],
};

const SVGNS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (f >= 0) {
    r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f;
  } else {
    r *= 1 + f; g *= 1 + f; b *= 1 + f;
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

/** Zeichnet einen Griff (Koordinaten in Zellen, Ursprung = Griffmitte). */
function drawHold(g, h, color, gid) {
  const fill = `url(#${gid})`;
  const edge = shade(color, -0.5);
  const dark = shade(color, -0.72);
  const lite = shade(color, 0.55);
  const shadow = 'rgba(8,6,18,.38)';
  const kind = h.cross ? 'cross' : h.t;
  if (kind === 'henkel') {
    // Henkel: dicker Klotz mit tiefer Mulde, in die die ganze Hand passt.
    s('ellipse', { cx: 0.05, cy: 0.13, rx: 0.4, ry: 0.25, fill: shadow }, g);
    s('path', { d: 'M-0.41 0.14 C-0.44 -0.2 -0.22 -0.33 0 -0.33 C0.22 -0.33 0.44 -0.2 0.41 0.14 C0.39 0.27 -0.39 0.27 -0.41 0.14 Z', fill, stroke: edge, 'stroke-width': 0.035 }, g);
    s('ellipse', { cx: 0, cy: -0.04, rx: 0.23, ry: 0.115, fill: dark }, g);
    s('path', { d: 'M-0.17 0.01 Q0 0.085 0.17 0.01', fill: 'none', stroke: 'rgba(255,255,255,.4)', 'stroke-width': 0.03, 'stroke-linecap': 'round' }, g);
    s('ellipse', { cx: -0.19, cy: -0.21, rx: 0.1, ry: 0.04, fill: 'rgba(255,255,255,.6)', transform: 'rotate(-18 -0.19 -0.21)' }, g);
  } else if (kind === 'leiste') {
    // Leiste: schmale Kante – Oberseite hell, Front dunkler.
    s('rect', { x: -0.32, y: -0.01, width: 0.7, height: 0.22, rx: 0.07, fill: shadow }, g);
    s('rect', { x: -0.36, y: -0.07, width: 0.72, height: 0.22, rx: 0.07, fill, stroke: edge, 'stroke-width': 0.035 }, g);
    s('rect', { x: -0.33, y: -0.1, width: 0.66, height: 0.1, rx: 0.05, fill: lite, stroke: edge, 'stroke-width': 0.025 }, g);
    s('path', { d: 'M-0.24 -0.065 L0.12 -0.065', stroke: 'rgba(255,255,255,.8)', 'stroke-width': 0.026, 'stroke-linecap': 'round' }, g);
  } else if (kind === 'seit') {
    // Seitgriff: senkrechte Walze mit Schlitz auf der Zugseite.
    const k = h.hand === 'L' ? 1 : -1;
    s('rect', { x: -0.13, y: -0.33, width: 0.3, height: 0.72, rx: 0.15, fill: shadow }, g);
    s('rect', { x: -0.16, y: -0.38, width: 0.32, height: 0.74, rx: 0.16, fill, stroke: edge, 'stroke-width': 0.035 }, g);
    s('path', { d: `M${0.045 * k} -0.22 L${0.045 * k} 0.2`, stroke: dark, 'stroke-width': 0.05, 'stroke-linecap': 'round' }, g);
    s('path', { d: `M${-0.07 * k} -0.24 L${-0.07 * k} 0.14`, stroke: 'rgba(255,255,255,.7)', 'stroke-width': 0.03, 'stroke-linecap': 'round' }, g);
  } else if (kind === 'sloper') {
    // Sloper: große, glatte Kuppe ohne jede Mulde.
    s('ellipse', { cx: 0.05, cy: 0.09, rx: 0.41, ry: 0.33, fill: shadow }, g);
    s('ellipse', { cx: 0, cy: 0, rx: 0.41, ry: 0.34, fill, stroke: edge, 'stroke-width': 0.035 }, g);
    s('ellipse', { cx: -0.1, cy: -0.14, rx: 0.2, ry: 0.1, fill: 'rgba(255,255,255,.35)' }, g);
    s('path', { d: 'M-0.26 0.1 Q0 0.2 0.26 0.1', fill: 'none', stroke: 'rgba(255,255,255,.28)', 'stroke-width': 0.025, 'stroke-linecap': 'round' }, g);
    for (const [cx, cy] of [[0.14, 0.02], [0.22, -0.06], [-0.2, 0.04], [0.04, 0.09]]) s('circle', { cx, cy, r: 0.018, fill: 'rgba(255,255,255,.5)' }, g);
  } else if (kind === 'cross') {
    // Kreuzgriff: X-förmig.
    s('g', { transform: 'translate(0.04 0.07)', opacity: 0.38 }, g).append(...[40, -40].map((a) => s('rect', { x: -0.36, y: -0.1, width: 0.72, height: 0.2, rx: 0.1, fill: '#080612', transform: `rotate(${a})` })));
    for (const a of [40, -40]) s('rect', { x: -0.36, y: -0.1, width: 0.72, height: 0.2, rx: 0.1, fill, stroke: edge, 'stroke-width': 0.035, transform: `rotate(${a})` }, g);
    s('circle', { r: 0.075, fill: lite, opacity: 0.8 }, g);
  }
}

function badge(g, label, x, y) {
  const r = 0.19;
  s('circle', { cx: x, cy: y, r, fill: 'rgba(14,16,40,.92)', stroke: 'rgba(255,255,255,.9)', 'stroke-width': 0.03 }, g);
  const ink = { fill: 'none', stroke: '#fff', 'stroke-width': 0.05, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  if (label === 'x') s('path', { d: `M${x - 0.07} ${y - 0.07} L${x + 0.07} ${y + 0.07} M${x + 0.07} ${y - 0.07} L${x - 0.07} ${y + 0.07}`, ...ink }, g);
  else if (label === 'up') s('path', { d: `M${x} ${y + 0.085} L${x} ${y - 0.085} M${x - 0.075} ${y - 0.01} L${x} ${y - 0.09} L${x + 0.075} ${y - 0.01}`, ...ink }, g);
  else if (label === 'wave') s('path', { d: `M${x - 0.09} ${y + 0.01} q0.045 -0.08 0.09 0 q0.045 0.08 0.09 0`, ...ink, 'stroke-width': 0.045 }, g);
  else {
    const tx = s('text', { x, y: y + 0.08, 'text-anchor': 'middle', 'font-size': 0.25, 'font-weight': 900, fill: '#fff', 'font-family': 'Nunito Variable, Nunito, sans-serif' }, g);
    tx.textContent = label;
  }
}

/** Kleine Griff-Vorschau für Legende und Regelkarten (eigenes SVG). */
function holdIcon(type, color) {
  const svg = s('svg', { viewBox: '-0.55 -0.55 1.1 1.1', width: 42, height: 42, class: 'd05-icon' });
  const gid = 'gi' + Math.random().toString(36).slice(2, 8);
  const defs = s('defs', {}, svg);
  const rg = s('radialGradient', { id: gid, cx: '35%', cy: '30%', r: '75%' }, defs);
  s('stop', { offset: '0', 'stop-color': shade(color, 0.5) }, rg);
  s('stop', { offset: '.55', 'stop-color': color }, rg);
  s('stop', { offset: '1', 'stop-color': shade(color, -0.4) }, rg);
  const g = s('g', {}, svg);
  const map = { henkel: { t: 'henkel' }, leiste: { t: 'leiste' }, seit: { t: 'seit', hand: 'L' }, sloper: { t: 'sloper' }, cross: { t: 'leiste', cross: true }, dyno: { t: 'henkel', dyno: true }, start: { t: 'henkel', start: true }, top: { t: 'henkel', top: true } };
  drawHold(g, map[type], color, gid);
  decorate(g, map[type]);
  return svg;
}

/** Zeichen und Markierungen je Griffart: Buchstabe, Symbol, Tape, Stern. */
function decorate(g, hd, withLabel = false) {
  if (hd.t === 'seit') badge(g, hd.hand, hd.hand === 'L' ? 0.3 : -0.3, -0.3);
  if (hd.t === 'sloper') badge(g, 'wave', 0.34, -0.26);
  if (hd.cross) badge(g, 'x', 0.34, -0.3);
  if (hd.dyno) badge(g, 'up', 0.34, -0.3);
  if (hd.start) tape(g, false, withLabel);
  if (hd.top) tape(g, true);
}

function tape(g, top, withLabel) {
  const font = 'Nunito Variable, Nunito, sans-serif';
  if (top) {
    s('rect', { x: -0.33, y: -0.56, width: 0.66, height: 0.17, rx: 0.025, fill: '#fff6dc', stroke: '#c58a26', 'stroke-width': 0.02, transform: 'rotate(-4)' }, g);
    const t = s('text', { x: 0, y: -0.43, 'text-anchor': 'middle', 'font-size': 0.135, 'font-weight': 900, fill: '#5a3a08', 'font-family': font, transform: 'rotate(-4)', 'letter-spacing': 0.02 }, g);
    t.textContent = 'TOP';
  } else {
    s('rect', { x: -0.3, y: 0.2, width: 0.3, height: 0.09, rx: 0.02, fill: '#f4f1e8', opacity: 0.95, transform: 'rotate(26 -0.15 0.245)' }, g);
    s('rect', { x: 0, y: 0.2, width: 0.3, height: 0.09, rx: 0.02, fill: '#f4f1e8', opacity: 0.95, transform: 'rotate(-26 0.15 0.245)' }, g);
    if (withLabel) {
      s('rect', { x: -0.31, y: 0.33, width: 0.62, height: 0.17, rx: 0.08, fill: 'rgba(14,16,40,.82)' }, g);
      const t = s('text', { x: 0, y: 0.455, 'text-anchor': 'middle', 'font-size': 0.115, 'font-weight': 900, fill: '#fff', 'font-family': font, 'letter-spacing': 0.02 }, g);
      t.textContent = 'START';
    }
  }
}

// ---------- Kletterfigur: Maße in Zellen ----------
const BODY = { sw: 0.19, upper: 0.57, fore: 0.57, torso: 0.64, thigh: 0.52, shin: 0.52, head: 0.2, ground: -2.25 };
const ARM = BODY.upper + BODY.fore;
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

/** Körperhaltung aus der Handposition (Zellen, y nach oben). */
function bodyFrom(p) {
  const midX = (p.lx + p.rx) / 2;
  const sx = midX;
  const reach = ARM * 0.93;
  const vL = Math.sqrt(Math.max(0, reach * reach - Math.pow(p.lx - (sx - BODY.sw), 2)));
  const vR = Math.sqrt(Math.max(0, reach * reach - Math.pow(p.rx - (sx + BODY.sw), 2)));
  let sy = Math.max(p.ly - vL, p.ry - vR);
  sy = Math.min(sy, Math.max(p.ly, p.ry) - 0.3);
  sy -= p.bob || 0;
  // Nicht tiefer als die Matte erlaubt: dann steht sie eben in der Hocke.
  sy = Math.max(sy, BODY.ground + 0.5 + BODY.torso);
  const sway = 0.13 * clampN(p.ly - p.ry, -1, 1);
  return { sx, sy, hx: sx + sway, hy: sy - BODY.torso };
}

function footTargets(p, phase = 0) {
  const b = bodyFrom(p);
  const diag = 0.2 * clampN(p.ry - p.ly, -1, 1);
  const fl = { x: b.hx - 0.34 - 0.05 * phase, y: Math.max(BODY.ground, b.hy - 0.86 + diag) };
  const fr = { x: b.hx + 0.34 + 0.05 * phase, y: Math.max(BODY.ground, b.hy - 0.86 - diag) };
  return { fl, fr };
}

function ik(P, T, a, b, sign) {
  const dx = T.x - P.x;
  const dy = T.y - P.y;
  const d = Math.hypot(dx, dy) || 0.0001;
  const base = Math.atan2(dy, dx);
  if (d >= a + b) return { x: P.x + (dx / d) * a, y: P.y + (dy / d) * a };
  const cosA = clampN((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const ang = base + sign * Math.acos(cosA);
  return { x: P.x + Math.cos(ang) * a, y: P.y + Math.sin(ang) * a };
}

/**
 * Baut ein komplettes Boulder-Türchen.
 * cfg: { theme: 'granit'|'ueberhang'|'polar', levels, intro:{title,text}, outro:{title,text,note},
 *        basics: true|false, quips: {…} }
 */
export function mountBoulder(root, ctx, cfg) {
  const { h, button } = ctx.ui;
  const fx = ctx.fx;
  const levels = cfg.levels.map((d) => {
    const lv = parseLevel(d);
    lv.ideal = solve(lv)?.moves ?? null;
    return lv;
  });
  const quips = { ...QUIPS, ...(cfg.quips || {}) };
  const saved = ctx.store.get('solved', {}) || {};
  // Flash = Top im allerersten Versuch dieses Boulders (ohne Neustart, Rückgängig, Beta-Hilfe).
  // Ob ein Boulder schon einmal versucht wurde, merkt sich der Türchen-Speicher (kann fehlen).
  const timers = new Set();
  const animations = new Set();
  const killAnimations = () => {
    for (const animation of animations) animation.kill();
    animations.clear();
    gsap.killTweensOf(pose);
  };
  const later = (fn, ms) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
    return t;
  };

  ctx.setHeader('dark');
  // ---------- Grundgerüst ----------
  const bg = h('div', { class: `d05-bg d05-theme-${cfg.theme}` },
    h('img', { class: 'd05-bg-img', src: ctx.img('d05-wand'), alt: '', draggable: 'false' }),
    h('div', { class: 'd05-bg-tint' }),
    cfg.theme === 'polar' ? h('div', { class: 'd05-aurora' }, h('i'), h('i'), h('i')) : null,
    cfg.theme === 'granit' ? h('div', { class: 'd05-lantern' }, h('div', { class: 'd05-lantern-glow' }), h('div', { class: 'd05-lantern-body' }, h('div', { class: 'd05-lantern-flame' }))) : null);

  const levelName = h('div', { class: 'd05-lvname display' });
  const levelSub = h('div', { class: 'd05-lvsub' });
  const moveNum = h('span', { class: 'd05-movenum' }, '0');
  const moveSub = h('span', { class: 'd05-movesub' }, '');
  const legendBtn = h('button', { class: 'd05-iconbtn', type: 'button', 'aria-label': 'Griffarten', 'aria-expanded': 'false' }, '?');
  const topbar = h('div', { class: 'd05-topbar' },
    h('div', { class: 'd05-lvinfo' }, levelName, levelSub),
    h('div', { class: 'd05-moves', 'aria-live': 'polite' }, moveNum, moveSub),
    legendBtn);

  const wall = h('div', { class: 'd05-wall no-select' });
  const svg = s('svg', { class: 'd05-svg' });
  wall.appendChild(svg);
  const mat = h('div', { class: 'd05-mat' });
  wall.appendChild(mat);
  const lorelai = ctx.bunny('lorelai', { size: 46 });
  const logan = ctx.bunny('logan', { size: 46, flip: true });
  const bunWrapL = h('div', { class: 'd05-bun d05-bun-l' }, lorelai);
  const bunWrapR = h('div', { class: 'd05-bun d05-bun-r' }, logan);
  wall.append(bunWrapL, bunWrapR);
  const say = h('div', { class: 'd05-say', 'aria-live': 'polite' });
  const topStack = h('div', { class: 'd05-topstack' });
  wall.append(topStack, say);
  const pill = h('div', { class: 'd05-pill', role: 'status' });
  wall.appendChild(pill);

  const betaBtn = h('button', { class: 'd05-beta', type: 'button' }, '✦ Beta zeigen');
  const undoBtn = h('button', { class: 'd05-ctl', type: 'button', 'aria-label': 'Zug zurück' },
    h('span', { class: 'd05-ctl-ico', html: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M9 7L4 12l5 5M4.5 12H15a5 5 0 0 1 0 10h-2" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
    h('span', { class: 'd05-ctl-lab' }, 'Zurück'));
  const resetBtn = h('button', { class: 'd05-ctl', type: 'button', 'aria-label': 'Neu starten' },
    h('span', { class: 'd05-ctl-ico', html: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
    h('span', { class: 'd05-ctl-lab' }, 'Neustart'));
  const handBtnL = h('button', { class: 'd05-hand', type: 'button', 'data-hand': 'L', 'aria-pressed': 'true' }, h('b', {}, 'L'), h('span', {}, 'linke Hand'));
  const handBtnR = h('button', { class: 'd05-hand', type: 'button', 'data-hand': 'R', 'aria-pressed': 'false' }, h('b', {}, 'R'), h('span', {}, 'rechte Hand'));
  const handToggle = h('div', { class: 'd05-handtoggle', role: 'group', 'aria-label': 'Welche Hand greift?' }, handBtnL, handBtnR);
  const controls = h('div', { class: 'd05-controls' }, undoBtn, handToggle, resetBtn);
  const legend = h('div', { class: 'd05-legend panel', hidden: true });
  const sheet = h('div', { class: 'd05-sheet' });

  const stage = h('div', { class: 'stage-fill d05-stage' }, bg, topbar, wall, betaBtn, controls, legend, sheet);
  root.append(stage);

  // ---------- Zustand ----------
  let li = 0; // aktueller Boulder
  let lv = null;
  let st = null;
  let hist = [];
  let sel = 'L';
  let busy = false;
  let playing = false;
  let restarts = 0;
  let attemptStarted = false;
  let flashOK = false; // bisher ein möglicher Flash
  let topPending = null; // Darstellung des Tops (einmalig), falls die Animation nicht zu Ende läuft
  let bestRemain = Infinity;
  let lastProgress = 0;
  let betaShown = false;
  let invalidRun = 0;
  let said = new Set();
  let layout = { cell: 40, ox: 0, oy: 0, w: 300, h: 500 };
  const pose = { lx: 3, ly: 0, rx: 3, ry: 0, flx: 2.6, fly: -1.6, frx: 3.4, fry: -1.6, bob: 0, cheer: 0, wave: 0 };
  let holdEls = [];
  let gHolds;
  let gFig;
  let reachRing;
  let dynoRing;
  let betaMark;
  const fig = {};

  const X = (x) => layout.ox + (x + 0.5) * layout.cell;
  const Y = (y) => layout.oy + (lv.rows - 1 - y + 0.5) * layout.cell;

  // ---------- Sprechblasen ----------
  let sayTimer = null;
  let sayQueue = [];
  function speak(lines) {
    sayQueue = lines.slice();
    clearTimeout(sayTimer);
    next();
    function next() {
      const line = sayQueue.shift();
      if (!line) {
        say.classList.remove('show');
        return;
      }
      const [who, text] = line;
      placeSay(who);
      say.replaceChildren(ctx.bunnyFace(who, { size: 34 }), h('div', { class: 'bubble' }, h('span', { class: 'who' }, who === 'lorelai' ? 'Lorelai' : 'Logan'), text));
      say.dataset.who = who;
      say.classList.remove('show');
      // eslint-disable-next-line no-unused-expressions
      say.offsetWidth;
      say.classList.add('show');
      const bun = who === 'lorelai' ? bunWrapL : bunWrapR;
      bun.classList.remove('hop');
      // eslint-disable-next-line no-unused-expressions
      bun.offsetWidth;
      bun.classList.add('hop');
      sayTimer = setTimeout(next, Math.max(2600, 1400 + text.length * 45));
    }
  }
  /** Sprechblase dorthin, wo sie am wenigsten verdeckt: oben/unten, links/rechts (je nach Griffen und Kletterfigur). */
  function placeSay(who) {
    if (!lv) return;
    const c = layout.cell;
    const bh = 104;
    const bw = Math.round(layout.w * 0.64);
    const matTop = Y(BODY.ground) + 0.05 * c;
    const bot1 = matTop - layout.bun * 0.55 - 2;
    const topY0 = 6 + (pill.classList.contains('show') ? pill.offsetHeight + 6 : 0);
    const b = bodyFrom(pose);
    const fig = {
      y0: Y(Math.max(pose.ly, pose.ry, b.sy + 0.6)) - 0.3 * c,
      y1: Y(Math.min(pose.fly, pose.fry)) + 0.2 * c,
      x0: X(Math.min(pose.lx, pose.rx, pose.flx, pose.frx)) - 0.35 * c,
      x1: X(Math.max(pose.lx, pose.rx, pose.flx, pose.frx)) + 0.35 * c,
    };
    const ov = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
    let best = null;
    for (const pos of ['bottom', 'top']) {
      for (const side of ['L', 'R']) {
        const y0 = pos === 'top' ? topY0 : bot1 - bh;
        const y1 = y0 + bh;
        const x0 = side === 'L' ? 8 : layout.w - 8 - bw;
        const x1 = x0 + bw;
        let score = (ov(y0, y1, fig.y0, fig.y1) * ov(x0, x1, fig.x0, fig.x1)) / 30 + (side === (who === 'lorelai' ? 'L' : 'R') ? 0 : 6);
        for (const hd of lv.holds) {
          const hx = X(hd.x);
          const hy = Y(hd.y);
          if (hx > x0 - 0.45 * c && hx < x1 + 0.45 * c && hy > y0 - 0.45 * c && hy < y1 + 0.45 * c) score += hd.top || hd.start ? 160 : 40;
        }
        if (!best || score < best.score - 0.5) best = { pos, side, score };
      }
    }
    say.classList.toggle('top', best.pos === 'top');
    say.style.width = bw + 'px';
    if (best.pos === 'top') {
      if (say.parentNode !== topStack) topStack.appendChild(say);
      say.style.bottom = '';
      say.style.left = '';
      say.style.right = '';
      say.style.alignSelf = best.side === 'L' ? 'flex-start' : 'flex-end';
      say.style.marginTop = topY0 - 6 + 'px';
    } else {
      if (say.parentNode !== wall) wall.appendChild(say);
      say.style.marginTop = '';
      say.style.alignSelf = '';
      say.style.bottom = layout.h - bot1 + 'px';
      say.style.left = best.side === 'L' ? '8px' : 'auto';
      say.style.right = best.side === 'R' ? '8px' : 'auto';
    }
    say.dataset.side = best.side;
  }
  function quip(kind, { once = false, chance = 1 } = {}) {
    const pool = quips[kind];
    if (!pool?.length) return false;
    if (once && said.has(kind)) return false;
    if (Math.random() > chance) return false;
    said.add(kind);
    speak(pool[Math.floor(Math.random() * pool.length)]);
    return true;
  }

  let pillTimer = null;
  function message(text, { tone = '' } = {}) {
    pill.textContent = text;
    pill.dataset.tone = tone;
    pill.classList.add('show');
    if (say.classList.contains('show') && say.classList.contains('top')) say.style.marginTop = pill.offsetHeight + 6 + 'px';
    clearTimeout(pillTimer);
    pillTimer = setTimeout(() => {
      pill.classList.remove('show');
      if (say.classList.contains('top')) say.style.marginTop = '0px';
    }, Math.max(2600, text.length * 60));
  }

  // ---------- Aufbau eines Boulders ----------
  function computeLayout() {
    const r = wall.getBoundingClientRect();
    // Von unten nach oben: Matte (0,95 Zellen), Boden bis zu den Füßen, Wandraster. Übrige Höhe bleibt oben frei (Platz für Sprechblasen).
    const needH = lv.rows + 1.75 + 0.95 + 0.1;
    const cell = Math.max(24, Math.min(r.width / (COLS + 0.3), r.height / needH, 58));
    layout = { cell, w: r.width, h: r.height, ox: (r.width - COLS * cell) / 2, oy: 0 };
    layout.oy = r.height - 0.95 * cell - (lv.rows + 1.75) * cell;
    svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    svg.setAttribute('width', r.width);
    svg.setAttribute('height', r.height);
    const matTop = Y(BODY.ground) + 0.05 * cell;
    mat.style.top = matTop + 'px';
    mat.style.height = Math.max(26, r.height - matTop) + 'px';
    const bunSize = Math.min(52, Math.max(38, cell * 1.05));
    layout.bun = bunSize;
    for (const bn of [lorelai, logan]) {
      bn.setAttribute('width', bunSize);
      bn.setAttribute('height', Math.round(bunSize * 0.9));
    }
    bunWrapL.style.top = bunWrapR.style.top = matTop - bunSize * 0.7 + 'px';
  }

  function buildWall() {
    svg.replaceChildren();
    const defs = s('defs', {}, svg);
    const gid = 'd05g' + li;
    const rg = s('radialGradient', { id: gid, cx: '35%', cy: '28%', r: '78%' }, defs);
    s('stop', { offset: '0', 'stop-color': shade(lv.color, 0.5) }, rg);
    s('stop', { offset: '.5', 'stop-color': lv.color }, rg);
    s('stop', { offset: '1', 'stop-color': shade(lv.color, -0.4) }, rg);
    const c = layout.cell;
    // Schraubenlöcher der Boulderwand: zeigen das Raster, ohne zu stören.
    const nuts = s('g', { class: 'd05-nuts' }, svg);
    for (let ry = 0; ry < lv.rows; ry++) for (let rx = 0; rx < COLS; rx++) {
      const nx = X(rx);
      const ny = Y(ry);
      s('circle', { cx: nx, cy: ny, r: Math.max(1.4, c * 0.04), class: 'd05-nut' }, nuts);
    }
    reachRing = s('circle', { class: 'd05-reach', r: REACH * c, cx: -999, cy: -999 }, svg);
    dynoRing = s('circle', { class: 'd05-dynoring', r: DYNO_REACH * c, cx: -999, cy: -999 }, svg);
    gHolds = s('g', { class: 'd05-holds' }, svg);
    holdEls = lv.holds.map((hd) => {
      const outer = s('g', { class: 'd05-hold', transform: `translate(${X(hd.x)} ${Y(hd.y)})`, 'data-id': hd.id, 'data-type': hd.cross ? 'cross' : hd.dyno ? 'dyno' : hd.t }, gHolds);
      s('circle', { class: 'd05-hold-glow', r: c * 0.58 }, outer);
      s('circle', { class: 'd05-hold-reach', r: c * 0.56 }, outer);
      const g = s('g', { transform: `scale(${c})` }, outer);
      if (hd.top) {
        s('circle', { r: 0.68, class: 'd05-topglow' }, g);
        s('circle', { r: 0.5, class: 'd05-topring' }, g);
      }
      drawHold(g, hd, lv.color, gid);
      decorate(g, hd, true);
      return outer;
    });
    betaMark = s('g', { class: 'd05-betamark', opacity: 0 }, svg);
    s('circle', { r: c * 0.62, class: 'd05-betaring' }, betaMark);
    const bt = s('text', { y: -c * 0.72, 'text-anchor': 'middle', class: 'd05-betalabel' }, betaMark);
    bt.textContent = '';
    gFig = s('g', { class: 'd05-climber' }, svg);
    buildFigure();
  }

  function buildFigure() {
    const c = layout.cell;
    const col = { pants: '#2f5961', pantsHi: '#3b707a', jacket: '#e2673f', jacketHi: '#f08a5a', skin: '#f1c7a3', beanie: '#74e3c4', pom: '#f6ecd9', shoe: '#2b2a44', hair: '#5a3a2e', bag: '#8a63d2' };
    const line = (stroke, w) => s('path', { fill: 'none', stroke, 'stroke-width': w * c, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, gFig);
    fig.shoeL = line(col.shoe, 0.15);
    fig.shoeR = line(col.shoe, 0.15);
    fig.legL = line(col.pants, 0.19);
    fig.legR = line(col.pants, 0.19);
    fig.torso = line(col.jacket, 0.44);
    fig.torsoHi = line(col.jacketHi, 0.1);
    fig.bag = s('g', {}, gFig);
    s('rect', { x: -0.13 * c, y: -0.1 * c, width: 0.26 * c, height: 0.24 * c, rx: 0.07 * c, fill: col.bag }, fig.bag);
    s('rect', { x: -0.14 * c, y: -0.13 * c, width: 0.28 * c, height: 0.07 * c, rx: 0.03 * c, fill: '#f6ecd9' }, fig.bag);
    s('circle', { cx: 0.03 * c, cy: -0.14 * c, r: 0.05 * c, fill: 'rgba(255,255,255,.85)' }, fig.bag);
    fig.armL = line(col.jacket, 0.15);
    fig.armR = line(col.jacket, 0.15);
    fig.foreL = line(col.skin, 0.12);
    fig.foreR = line(col.skin, 0.12);
    fig.handL = s('circle', { r: 0.085 * c, fill: '#fbf6ee' }, gFig);
    fig.handR = s('circle', { r: 0.085 * c, fill: '#fbf6ee' }, gFig);
    fig.head = s('g', {}, gFig);
    fig.pony = s('path', { class: 'd05-pony', d: `M0 ${0.05 * c} C${0.1 * c} ${0.25 * c} ${-0.08 * c} ${0.36 * c} ${0.04 * c} ${0.5 * c}`, fill: 'none', stroke: col.hair, 'stroke-width': 0.11 * c, 'stroke-linecap': 'round' }, fig.head);
    s('circle', { r: BODY.head * c, fill: col.hair }, fig.head);
    s('path', { d: `M${-0.22 * c} ${-0.02 * c} C${-0.24 * c} ${-0.3 * c} ${0.24 * c} ${-0.3 * c} ${0.22 * c} ${-0.02 * c} Z`, fill: col.beanie }, fig.head);
    s('rect', { x: -0.23 * c, y: -0.06 * c, width: 0.46 * c, height: 0.08 * c, rx: 0.04 * c, fill: shade(col.beanie, -0.2) }, fig.head);
    s('circle', { cy: -0.29 * c, r: 0.075 * c, fill: col.pom }, fig.head);
    fig.tagL = s('g', { class: 'd05-tag' }, gFig);
    s('circle', { r: 0.15 * c }, fig.tagL);
    const tl = s('text', { y: 0.06 * c, 'text-anchor': 'middle', 'font-size': 0.19 * c }, fig.tagL);
    tl.textContent = 'L';
    fig.tagR = s('g', { class: 'd05-tag' }, gFig);
    s('circle', { r: 0.15 * c }, fig.tagR);
    const tr = s('text', { y: 0.06 * c, 'text-anchor': 'middle', 'font-size': 0.19 * c }, fig.tagR);
    tr.textContent = 'R';
  }

  const P = (pt) => `${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  function drawFigure() {
    if (!lv || !fig.torso) return;
    const c = layout.cell;
    // Jubelhand: rechte Hand reißt es nach oben.
    const p = { ...pose };
    const b0 = bodyFrom(p);
    if (p.cheer > 0) {
      // Jubel: beide Arme hoch, ein kleines Wackeln hinterher.
      const wob = (p.wave || 0) * 0.1;
      p.lx += (b0.sx - 0.62 - p.lx) * p.cheer;
      p.ly += (b0.sy + 1.02 + wob - p.ly) * p.cheer;
      p.rx += (b0.sx + 0.62 - p.rx) * p.cheer;
      p.ry += (b0.sy + 1.02 - wob - p.ry) * p.cheer;
    }
    const b = b0;
    const px = (x, y) => ({ x: X(x), y: Y(y) });
    const S = px(b.sx, b.sy);
    const Hp = px(b.hx, b.hy);
    const shL = px(b.sx - BODY.sw, b.sy - 0.05);
    const shR = px(b.sx + BODY.sw, b.sy - 0.05);
    const hL = px(p.lx, p.ly);
    const hR = px(p.rx, p.ry);
    const eL = ik(shL, hL, BODY.upper * c, BODY.fore * c, -1);
    const eR = ik(shR, hR, BODY.upper * c, BODY.fore * c, 1);
    const hipL = px(b.hx - 0.13, b.hy + 0.02);
    const hipR = px(b.hx + 0.13, b.hy + 0.02);
    // Füße folgen dem Körper: nie weiter weg, als die Beine lang sind.
    const legMax = (BODY.thigh + BODY.shin) * c * 0.97;
    const leash = (hip, f) => {
      const dx = f.x - hip.x;
      const dy = f.y - hip.y;
      const d = Math.hypot(dx, dy);
      return d > legMax ? { x: hip.x + (dx / d) * legMax, y: hip.y + (dy / d) * legMax } : f;
    };
    const fL = leash(hipL, px(p.flx, p.fly));
    const fR = leash(hipR, px(p.frx, p.fry));
    const kL = ik(hipL, fL, BODY.thigh * c, BODY.shin * c, 1);
    const kR = ik(hipR, fR, BODY.thigh * c, BODY.shin * c, -1);
    fig.legL.setAttribute('d', `M${P(hipL)} L${P(kL)} L${P(fL)}`);
    fig.legR.setAttribute('d', `M${P(hipR)} L${P(kR)} L${P(fR)}`);
    fig.shoeL.setAttribute('d', `M${P({ x: fL.x + 0.08 * c, y: fL.y + 0.02 * c })} L${P({ x: fL.x - 0.1 * c, y: fL.y + 0.04 * c })}`);
    fig.shoeR.setAttribute('d', `M${P({ x: fR.x - 0.08 * c, y: fR.y + 0.02 * c })} L${P({ x: fR.x + 0.1 * c, y: fR.y + 0.04 * c })}`);
    fig.torso.setAttribute('d', `M${P(S)} L${P(Hp)}`);
    fig.torsoHi.setAttribute('d', `M${P({ x: Hp.x - 0.2 * c, y: Hp.y + 0.06 * c })} L${P({ x: Hp.x + 0.2 * c, y: Hp.y + 0.06 * c })}`);
    fig.bag.setAttribute('transform', `translate(${Hp.x.toFixed(1)} ${(Hp.y + 0.02 * c).toFixed(1)})`);
    fig.armL.setAttribute('d', `M${P(shL)} L${P(eL)}`);
    fig.armR.setAttribute('d', `M${P(shR)} L${P(eR)}`);
    fig.foreL.setAttribute('d', `M${P(eL)} L${P(hL)}`);
    fig.foreR.setAttribute('d', `M${P(eR)} L${P(hR)}`);
    fig.handL.setAttribute('cx', hL.x.toFixed(1));
    fig.handL.setAttribute('cy', hL.y.toFixed(1));
    fig.handR.setAttribute('cx', hR.x.toFixed(1));
    fig.handR.setAttribute('cy', hR.y.toFixed(1));
    const tilt = clampN((p.ry - p.ly) * 9 + (p.rx + p.lx - 2 * b.sx) * 6, -16, 16);
    fig.head.setAttribute('transform', `translate(${S.x.toFixed(1)} ${(S.y - 0.36 * c).toFixed(1)}) rotate(${tilt.toFixed(1)})`);
    // Handschilder L/R: nach außen versetzt, bei gematchten Händen nebeneinander.
    const same = Math.abs(p.lx - p.rx) < 0.05 && Math.abs(p.ly - p.ry) < 0.05;
    fig.tagL.setAttribute('transform', `translate(${(hL.x - (same ? 0.3 : 0.26) * c).toFixed(1)} ${(hL.y + 0.3 * c).toFixed(1)})`);
    fig.tagR.setAttribute('transform', `translate(${(hR.x + (same ? 0.3 : 0.26) * c).toFixed(1)} ${(hR.y + 0.3 * c).toFixed(1)})`);
    fig.tagL.classList.toggle('on', sel === 'L' && playing);
    fig.tagR.classList.toggle('on', sel === 'R' && playing);
  }

  // Zeichnen nur bei Zustands- oder Animationsänderung; keine dauerhafte Render-Schleife.
  const markDirty = () => { if (!document.hidden) drawFigure(); };

  function updateRings() {
    if (!lv || !st) return;
    const showing = playing && !busy;
    const stat = st[otherHand(sel)];
    const hs = lv.holds[stat];
    reachRing.setAttribute('cx', X(hs.x));
    reachRing.setAttribute('cy', Y(hs.y));
    reachRing.classList.toggle('on', showing);
    const canDyno = !!(lv.ruleSet.has('dyno') && st.L === st.R && lv.holds[st.L].dyno);
    dynoRing.setAttribute('cx', X(hs.x));
    dynoRing.setAttribute('cy', Y(hs.y));
    dynoRing.classList.toggle('on', showing && canDyno);
    handBtnL.setAttribute('aria-pressed', String(sel === 'L'));
    handBtnR.setAttribute('aria-pressed', String(sel === 'R'));
    // Dezent: Griffe, die jetzt erreichbar sind (kräftiger für die gewählte Hand).
    holdEls.forEach((el, id) => {
      let c1 = false;
      let c2 = false;
      if (showing) {
        c1 = tryMove(lv, st, sel, id).ok;
        c2 = !c1 && tryMove(lv, st, otherHand(sel), id).ok;
      }
      el.classList.toggle('r1', c1);
      el.classList.toggle('r2', c2);
    });
    // Sloper, der weg muss: Hand markieren.
    for (const hand of ['L', 'R']) {
      const onSloper = lv.holds[st[hand]].t === 'sloper';
      const btn = hand === 'L' ? handBtnL : handBtnR;
      btn.classList.toggle('urgent', onSloper && st['p' + hand] >= 1);
    }
    markDirty();
  }

  function updateCounter() {
    moveNum.textContent = String(hist.length);
    moveSub.textContent = lv.ideal ? `Züge · perfekt ${lv.ideal}` : 'Züge';
    undoBtn.disabled = !hist.length || !playing;
    resetBtn.disabled = !playing;
  }

  function snapPose() {
    const hl = lv.holds[st.L];
    const hr = lv.holds[st.R];
    Object.assign(pose, { lx: hl.x - (st.L === st.R ? 0.27 : 0), ly: hl.y, rx: hr.x + (st.L === st.R ? 0.27 : 0), ry: hr.y, bob: 0, cheer: 0, wave: 0 });
    const { fl, fr } = footTargets(pose);
    Object.assign(pose, { flx: fl.x, fly: fl.y, frx: fr.x, fry: fr.y });
    markDirty();
  }

  function startLevel(i, { teach = true } = {}) {
    li = i;
    lv = levels[i];
    st = { ...lv.start };
    hist = [];
    sel = 'L';
    restarts = 0;
    attemptStarted = false;
    flashOK = false;
    topPending = null;
    betaShown = false;
    invalidRun = 0;
    playing = false;
    busy = false;
    bestRemain = lv.ideal ?? Infinity;
    lastProgress = Date.now();
    betaBtn.classList.remove('show');
    stage.dataset.level = lv.id;
    const nBoulder = levels.filter((l) => l.kind === 'boulder');
    const bi = nBoulder.indexOf(lv);
    levelName.textContent = lv.name;
    levelSub.textContent = lv.kind === 'uebung' ? `Übung · Grad ${lv.grade}` : `Boulder ${bi + 1}/${nBoulder.length} · Grad ${lv.grade}`;
    killAnimations();
    computeLayout();
    buildWall();
    snapPose();
    buildLegend();
    updateCounter();
    updateRings();
    const cards = teach ? (lv.teach || []) : [];
    if (cards.length) showTeach(cards);
    else beginPlay();
  }

  function beginPlay() {
    playing = true;
    lastProgress = Date.now();
    clearHighlights();
    updateCounter();
    updateRings();
    if (hist.length === 0) later(() => { if (playing && !hist.length) quip('start', { chance: li === 0 ? 1 : 0.6 }); }, 6000);
  }

  function clearHighlights() {
    holdEls.forEach((el) => el.classList.remove('pulse'));
  }

  // ---------- Regelkarten ----------
  function showTeach(cardIds) {
    playing = false;
    updateCounter();
    updateRings();
    const cards = cardIds.map((id) => RULE_CARDS[id]).filter(Boolean);
    let k = 0;
    const show = () => {
      const card = cards[k];
      clearHighlights();
      holdEls.forEach((el, idx) => {
        const hd = lv.holds[idx];
        const type = hd.cross ? 'cross' : hd.dyno ? 'dyno' : hd.t;
        if (card.types.includes(type) || (card.types.includes('top') && hd.top)) el.classList.add('pulse');
      });
      reachRing.classList.toggle('on', cardIds[k] === 'reach');
      handToggle.classList.toggle('rule-focus', cardIds[k] === 'nocross');
      const icons = card.types.filter((t) => t !== 'top').slice(0, 1).map((t) => holdIcon(t, lv.color));
      sheet.replaceChildren(h('div', { class: 'd05-teach panel' },
        h('div', { class: 'd05-teach-head' }, ...icons, h('div', {},
          h('div', { class: 'd05-teach-kicker' }, lv.kind === 'uebung' ? 'Neue Regel · Übung' : 'Neue Regel'),
          h('h2', { class: 'display' }, card.title))),
        h('p', {}, card.text),
        button(k < cards.length - 1 ? 'Weiter' : 'Verstanden', () => {
          k++;
          if (k < cards.length) show();
          else {
            sheet.replaceChildren();
            sheet.classList.remove('show');
            handToggle.classList.remove('rule-focus');
            beginPlay();
          }
        }, { variant: 'small' })));
      sheet.classList.add('show');
    };
    show();
  }

  // ---------- Legende ----------
  function buildLegend() {
    const types = new Set();
    lv.holds.forEach((hd) => types.add(hd.cross ? 'cross' : hd.dyno ? 'dyno' : hd.t));
    types.add('start');
    types.add('top');
    const order = ['henkel', 'leiste', 'seit', 'sloper', 'cross', 'dyno', 'start', 'top'];
    const rules = ['reach', 'nocross', 'match', 'side', 'sloper', 'cross', 'dyno'].filter((r) => lv.ruleSet.has(r) && !['side', 'sloper', 'cross', 'dyno'].includes(r));
    legend.replaceChildren(
      h('div', { class: 'd05-legend-head' }, h('h2', { class: 'display' }, 'Griffe & Regeln dieser Wand'),
        h('button', { class: 'd05-iconbtn', type: 'button', 'aria-label': 'Schließen', onclick: () => toggleLegend(false) }, '×')),
      h('ul', { class: 'd05-legend-list' }, order.filter((t) => types.has(t)).map((t) => h('li', {}, holdIcon(t, lv.color),
        h('div', {}, h('b', {}, TYPE_INFO[t].name), h('span', {}, TYPE_INFO[t].text))))),
      h('ul', { class: 'd05-legend-rules' }, rules.map((r) => h('li', {}, h('b', {}, RULE_CARDS[r].title + ': '), RULE_CARDS[r].text))));
  }
  function toggleLegend(on) {
    const show = on ?? legend.hidden;
    legend.hidden = !show;
    legendBtn.setAttribute('aria-expanded', String(show));
  }
  legendBtn.addEventListener('click', () => {
    ctx.sfx.play('page');
    toggleLegend();
  });

  // ---------- Züge ----------
  function chalkAt(x, y, n = 9, power = 70) {
    const r = svg.getBoundingClientRect();
    fx.burst(r.left + X(x), r.top + Y(y), { kind: 'dot', colors: ['#ffffff', '#f3f5fb', '#e3e8f4'], count: n, power, gravity: -18, life: 0.9, size: 4, up: 0.1 });
  }

  function animateMove(prev, next, kind, hand) {
    busy = true;
    updateRings();
    const tl = gsap.timeline({ onUpdate: markDirty, onComplete: () => { animations.delete(tl); busy = false; updateRings(); } });
    animations.add(tl);
    const H = lv.holds;
    const off = next.L === next.R ? 0.27 : 0;
    const tgt = { lx: H[next.L].x - off, ly: H[next.L].y, rx: H[next.R].x + off, ry: H[next.R].y };
    if (kind === 'dyno') {
      ctx.sfx.play('whoosh');
      tl.to(pose, { bob: 0.38, duration: 0.28, ease: 'power2.in' });
      tl.to(pose, { lx: tgt.lx, ly: tgt.ly, rx: tgt.rx, ry: tgt.ry, duration: 0.42, ease: 'power3.out' });
      tl.to(pose, { bob: -0.25, duration: 0.2, ease: 'power2.out' }, '<');
      tl.to(pose, { bob: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      const after = { ...pose, ...tgt, bob: 0 };
      const ft = footTargets(after);
      tl.to(pose, { flx: ft.fl.x - 0.5, fly: ft.fl.y - 0.3, frx: ft.fr.x - 0.4, fry: ft.fr.y - 0.35, duration: 0.42, ease: 'power2.out' }, 0.3);
      tl.to(pose, { flx: ft.fl.x, fly: ft.fl.y, frx: ft.fr.x, fry: ft.fr.y, duration: 0.9, ease: 'elastic.out(1, 0.35)' }, 0.75);
      tl.call(() => {
        chalkAt(H[next.L].x, H[next.L].y, 16, 110);
        ctx.sfx.play('drop');
        ctx.ui.haptic(25);
      }, null, 0.7);
      return tl;
    }
    const keyX = hand === 'L' ? 'lx' : 'rx';
    const keyY = hand === 'L' ? 'ly' : 'ry';
    const from = { x: pose[keyX], y: pose[keyY] };
    const to = { x: tgt[keyX], y: tgt[keyY] };
    const ctrl = { x: (from.x + to.x) / 2 + (hand === 'L' ? -0.35 : 0.35), y: Math.max(from.y, to.y) + 0.45 };
    const prog = { t: 0 };
    const otherKX = hand === 'L' ? 'rx' : 'lx';
    tl.to(prog, {
      t: 1, duration: 0.46, ease: 'power2.inOut',
      onUpdate: () => {
        const t = prog.t;
        const u = 1 - t;
        pose[keyX] = u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x;
        pose[keyY] = u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y;
      },
    });
    tl.to(pose, { [otherKX]: tgt[otherKX], duration: 0.3, ease: 'power2.out' }, 0);
    tl.to(pose, { bob: -0.12, duration: 0.23, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0);
    tl.call(() => {
      chalkAt(to.x, to.y, 7, 55);
      ctx.sfx.play('tick');
      ctx.ui.haptic(10);
    }, null, 0.44);
    // Füße setzt sie selbst – erst der Fuß auf der Seite der greifenden Hand.
    const after = { ...pose, ...tgt, bob: 0 };
    const ft = footTargets(after, hist.length % 2);
    const order = hand === 'L' ? ['l', 'r'] : ['r', 'l'];
    order.forEach((f, i) => {
      const tx = f === 'l' ? ft.fl : ft.fr;
      const kx = f === 'l' ? 'flx' : 'frx';
      const ky = f === 'l' ? 'fly' : 'fry';
      const lift = Math.max(tx.y, pose[ky]) + 0.22;
      tl.to(pose, { [kx]: tx.x, duration: 0.3, ease: 'power1.inOut' }, 0.1 + i * 0.16);
      tl.to(pose, { [ky]: lift, duration: 0.15, ease: 'power1.out' }, 0.1 + i * 0.16);
      tl.to(pose, { [ky]: tx.y, duration: 0.15, ease: 'power1.in' }, 0.25 + i * 0.16);
    });
    return tl;
  }

  function nope(hand, holdId) {
    ctx.sfx.play('wrong');
    const hd = lv.holds[holdId];
    const kx = hand === 'L' ? 'lx' : 'rx';
    const ky = hand === 'L' ? 'ly' : 'ry';
    const dx = clampN(hd.x - pose[kx], -1, 1) * 0.2;
    const dy = clampN(hd.y - pose[ky], -1, 1) * 0.2;
    gsap.to(pose, { [kx]: `+=${dx}`, [ky]: `+=${dy}`, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.out', onUpdate: markDirty });
    const el = holdEls[holdId];
    el.classList.remove('shake');
    // eslint-disable-next-line no-unused-expressions
    el.getBBox();
    el.classList.add('shake');
    later(() => el.classList.remove('shake'), 500);
  }

  function attempt(holdId) {
    if (!playing || busy) return;
    toggleLegend(false);
    const rs = tryMove(lv, st, sel, holdId);
    const ro = tryMove(lv, st, otherHand(sel), holdId);
    let hand = null;
    let res = null;
    if (rs.ok) {
      hand = sel;
      res = rs;
    } else if (ro.ok) {
      hand = otherHand(sel);
      res = ro;
    }
    if (!res) {
      const reason = rs.reason === 'same' && !ro.ok ? ro.reason : rs.reason;
      const who = rs.reason === 'same' ? otherHand(sel) : sel;
      nope(who, holdId);
      message(reasonText(reason, who));
      invalidRun++;
      if (invalidRun === 3) quip('invalid');
      return;
    }
    invalidRun = 0;
    if (!attemptStarted) {
      attemptStarted = true;
      const tried = ctx.store.get('tried', {}) || {};
      flashOK = !tried[lv.id] && !saved[lv.id]; // nur der allererste Versuch kann ein Flash sein
      if (!tried[lv.id]) ctx.store.set('tried', { ...tried, [lv.id]: true });
    }
    ctx.sfx.play('pop');
    const prev = st;
    hist.push(prev);
    st = res.next;
    if (res.kind !== 'dyno') sel = otherHand(hand);
    hideBeta();
    updateCounter();
    const tl = animateMove(prev, st, res.kind, hand);
    afterMove(res, hand, tl);
  }

  function afterMove(res, hand, tl) {
    if (isTop(lv, st)) {
      // Der logische Abschluss (Speichern, Laterne) geschieht sofort und hängt nicht an der Animation.
      playing = false;
      updateCounter();
      const outcome = commitTop();
      const show = () => {
        if (topPending !== show) return; // schon gezeigt
        topPending = null;
        animations.delete(tl);
        busy = false;
        topOut(outcome);
      };
      topPending = show;
      tl.eventCallback('onComplete', show);
      return;
    }
    const remain = solve(lv, st);
    if (remain && remain.moves < bestRemain) {
      bestRemain = remain.moves;
      lastProgress = Date.now();
    }
    if (!remain) {
      later(() => {
        const stuck = !legalMoves(lv, st).length;
        message(stuck ? 'Hier geht kein Zug mehr. Einen Zug zurück?' : 'Sackgasse: Von hier kommt man nicht mehr zum Top.', { tone: 'warn' });
        undoBtn.classList.add('glow');
        betaBtn.classList.add('show');
        quip('dead', { chance: said.has('dead') ? 0.5 : 1 });
        said.add('dead');
      }, 650);
      return;
    }
    undoBtn.classList.remove('glow');
    const moved = lv.holds[res.next[hand === 'LR' ? 'L' : hand]];
    if (res.kind === 'dyno') later(() => quip('dyno', { once: true }), 700);
    else if (hist.length === 1) later(() => quip('firstMove', { once: true }), 600);
    else if (moved?.t === 'sloper') later(() => quip('sloper', { once: true }), 600);
    else if (moved?.t === 'seit') later(() => quip('side', { once: true }), 600);
    else if (isCrossed(lv, st)) later(() => quip('cross', { once: true }), 600);
    else if (hist.length === 4) later(() => quip('chalk', { once: true, chance: 0.5 }), 600);
  }

  /** Top erreicht: Ergebnis festhalten (Speicher, Laterne), ohne Animation. */
  function commitTop() {
    const moves = hist.length;
    const ideal = lv.ideal;
    const flash = flashOK;
    const perfect = moves === ideal;
    const prevSave = saved[lv.id] || {};
    saved[lv.id] = { best: Math.min(prevSave.best ?? Infinity, moves), flash: !!(prevSave.flash || flash), perfect: !!(prevSave.perfect || perfect) };
    ctx.store.set('solved', saved);
    if (levels.filter((l) => l.kind === 'boulder').every((l) => saved[l.id]) && ctx.complete({ quiet: true })) {
      later(() => ctx.ui.toast(`✦ Laterne ${ctx.day} leuchtet jetzt am Berg`), 2400);
    }
    return { moves, ideal, flash, perfect };
  }

  /** Darstellung des Tops: Jubel, Chalk, Ergebnisfenster. */
  function topOut({ moves, ideal, flash, perfect }) {
    const H = lv.holds[lv.top];
    ctx.sfx.play('fanfare');
    ctx.ui.haptic(40);
    const r = svg.getBoundingClientRect();
    const cx = r.left + X(H.x);
    const cy = r.top + Y(H.y);
    fx.burst(cx, cy, { kind: 'dot', colors: ['#ffffff', '#f3f5fb', '#e3e8f4'], count: 34, power: 160, gravity: -10, life: 1.4, size: 6, up: 0.2 });
    fx.burst(cx, cy, { kind: 'spark', count: 30, power: 260 });
    if (flash || perfect) later(() => fx.burst(cx, cy - 20, { kind: 'star', count: 18, power: 220, colors: ['#ffd98a', '#74e3c4', '#f6ecd9'] }), 300);
    const tlc = gsap.timeline({ onUpdate: markDirty });
    animations.add(tlc);
    tlc.to(pose, { cheer: 1, duration: 0.45, ease: 'back.out(2.2)' });
    tlc.to(pose, { bob: -0.28, duration: 0.2, ease: 'power2.out' }, 0);
    tlc.to(pose, { bob: 0, duration: 0.5, ease: 'bounce.out' }, 0.2);
    tlc.to(pose, { wave: 1, duration: 0.16, yoyo: true, repeat: 7, ease: 'sine.inOut' }, 0.5);
    chalkCloud(H);
    bunWrapL.classList.add('cheer');
    bunWrapR.classList.add('cheer');
    later(() => quip(flash ? 'flash' : 'top'), 500);
    later(() => {
      bunWrapL.classList.remove('cheer');
      bunWrapR.classList.remove('cheer');
      showResult(moves, ideal, flash, perfect);
    }, 1700);
  }

  function chalkCloud(H) {
    const c = layout.cell;
    const g = s('g', {}, svg);
    for (let i = 0; i < 12; i++) {
      const circ = s('circle', { class: 'd05-chalkcloud', cx: X(H.x) + fx.rand(-0.4, 0.4) * c, cy: Y(H.y) + fx.rand(-0.3, 0.5) * c, r: 0, opacity: 0 }, g);
      animations.add(gsap.to(circ, { attr: { r: c * fx.rand(0.3, 0.6) }, duration: 1.5, ease: 'power2.out', delay: i * 0.04 }));
      animations.add(gsap.fromTo(circ, { opacity: 0.9 }, { opacity: 0, duration: 1.4, ease: 'power1.in', delay: 0.15 + i * 0.04 }));
      animations.add(gsap.to(circ, { x: fx.rand(-1, 1) * c * 0.9, y: fx.rand(-1.1, 0.1) * c * 0.8, duration: 1.6, ease: 'power2.out', delay: i * 0.04 }));
    }
    later(() => g.remove(), 2400);
  }

  function showResult(moves, ideal, flash, perfect = false) {
    const last = li === levels.length - 1;
    const verdict = flash
      ? (perfect ? 'Flash ✦ – gleich im allerersten Versuch oben, und mit der perfekten Beta.' : `Flash ✦ – gleich im allerersten Versuch oben. Die perfekte Beta braucht ${ideal} Züge.`)
      : perfect
        ? `Perfekte Beta ✦ – ${ideal} Züge sind das Minimum. Ein Flash zählt nur beim allerersten Versuch.`
        : `Top in ${moves} Zügen. Die perfekte Beta braucht ${ideal}.`;
    const card = h('div', { class: 'd05-result panel' },
      h('div', { class: 'd05-result-top display' }, flash ? 'Flash!' : 'Top!'),
      h('p', {}, verdict),
      h('div', { class: 'd05-result-btns' },
        !perfect ? button('Nochmal', () => {
          sheet.classList.remove('show');
          startLevel(li, { teach: false });
        }, { variant: 'ghost small' }) : null,
        button(last ? 'Weiter' : 'Nächster Boulder', () => {
          sheet.classList.remove('show');
          if (last) finish();
          else startLevel(li + 1);
        })));
    clearTimeout(sayTimer);
    sayQueue = [];
    say.classList.remove('show');
    sheet.replaceChildren(card);
    sheet.classList.add('show');
  }

  function finish() {
    playing = false;
    updateRings();
    const rows = levels.filter((l) => l.kind === 'boulder').map((l) => {
      const sv = saved[l.id];
      return h('li', {}, h('span', {}, l.name), h('span', { class: 'd05-sum-val' }, sv ? ([sv.flash && 'Flash ✦', sv.perfect && 'Perfekte Beta ✦'].filter(Boolean).join(' · ') || `Top · ${sv.best} Züge`) : '–'));
    });
    sheet.replaceChildren(h('div', { class: 'd05-result d05-outro panel' },
      h('h2', { class: 'display' }, cfg.outro.title),
      h('p', {}, cfg.outro.text),
      cfg.outro.note ? h('p', { class: 'd05-note hand' }, cfg.outro.note) : null,
      h('ul', { class: 'd05-sum' }, rows),
      h('div', { class: 'd05-result-btns' },
        button('Nochmal klettern', () => {
          sheet.classList.remove('show');
          showIntro();
        }, { variant: 'ghost small' }),
        button('Zurück zum Berg', () => ctx.close()))));
    sheet.classList.add('show');
    later(() => fx.confetti({ count: 70 }), 200);
  }

  // ---------- Hilfe: Beta zeigen ----------
  function maybeOfferBeta() {
    if (!playing || betaBtn.classList.contains('show')) return;
    if (restarts >= 3 || Date.now() - lastProgress > 40000) {
      betaBtn.classList.add('show');
      quip('betaReady', { once: true });
    }
  }
  const betaTimer = setInterval(() => {
    if (!document.hidden) maybeOfferBeta();
  }, 1000);

  function hideBeta() {
    betaMark.setAttribute('opacity', 0);
    betaMark.classList.remove('on');
  }

  betaBtn.addEventListener('click', () => {
    if (!playing || busy) return;
    ctx.sfx.play('sparkle');
    flashOK = false;
    const beta = nextBeta(lv, st);
    if (beta.kind === 'dead') {
      message('Sackgasse: Rückgängig oder Neustart bringt dich wieder auf die Route.', { tone: 'warn' });
      undoBtn.classList.add('glow');
      resetBtn.classList.add('glow');
      return;
    }
    if (beta.kind !== 'move') return;
    const m = beta.move;
    const hd = lv.holds[m.to];
    betaMark.setAttribute('transform', `translate(${X(hd.x)} ${Y(hd.y)})`);
    const betaLabel = betaMark.querySelector('text');
    betaLabel.textContent = m.kind === 'dyno' ? 'Dynamo!' : m.hand === 'L' ? 'linke Hand' : 'rechte Hand';
    betaLabel.setAttribute('y', hd.y === lv.rows - 1 ? layout.cell * 0.94 : -layout.cell * 0.72);
    betaMark.setAttribute('opacity', 1);
    betaMark.classList.add('on');
    if (m.hand === 'L' || m.hand === 'R') sel = m.hand;
    updateRings();
    if (!betaShown) quip('betaUsed', { once: true });
    betaShown = true;
  });

  // ---------- Bedienung ----------
  function holdAt(clientX, clientY) {
    const r = svg.getBoundingClientRect();
    const x = clientX - r.left;
    const y = clientY - r.top;
    let best = -1;
    let bd = layout.cell * 0.85;
    lv.holds.forEach((hd) => {
      const d = Math.hypot(X(hd.x) - x, Y(hd.y) - y);
      if (d < bd) {
        bd = d;
        best = hd.id;
      }
    });
    return best;
  }
  const onWallDown = (e) => {
    if (!lv) return;
    const id = holdAt(e.clientX, e.clientY);
    if (id >= 0) {
      e.preventDefault();
      attempt(id);
    }
  };
  svg.addEventListener('pointerdown', onWallDown);

  const pickHand = (hand) => {
    if (sel === hand) return;
    sel = hand;
    ctx.sfx.play('tap');
    updateRings();
  };
  handBtnL.addEventListener('click', () => pickHand('L'));
  handBtnR.addEventListener('click', () => pickHand('R'));

  undoBtn.addEventListener('click', () => {
    if (!playing || busy || !hist.length) return;
    ctx.sfx.play('tap');
    const prev = hist.pop();
    // Welche Hand hat sich bewegt? Dann ist sie wieder dran.
    if (prev.L !== st.L && prev.R === st.R) sel = 'L';
    else if (prev.R !== st.R && prev.L === st.L) sel = 'R';
    st = prev;
    flashOK = false;
    hideBeta();
    undoBtn.classList.remove('glow');
    resetBtn.classList.remove('glow');
    const tgtL = lv.holds[st.L];
    const tgtR = lv.holds[st.R];
    const off = st.L === st.R ? 0.27 : 0;
    const after = { ...pose, lx: tgtL.x - off, ly: tgtL.y, rx: tgtR.x + off, ry: tgtR.y, bob: 0 };
    const ft = footTargets(after);
    busy = true;
    gsap.to(pose, { lx: after.lx, ly: after.ly, rx: after.rx, ry: after.ry, flx: ft.fl.x, fly: ft.fl.y, frx: ft.fr.x, fry: ft.fr.y, bob: 0, cheer: 0, duration: 0.38, ease: 'power2.inOut', onUpdate: markDirty, onComplete: () => { busy = false; updateRings(); } });
    updateCounter();
    updateRings();
  });

  resetBtn.addEventListener('click', () => {
    if (!playing || busy) return;
    ctx.sfx.play('whoosh');
    if (hist.length) {
      restarts++;
      flashOK = false;
      attemptStarted = false;
    }
    hist = [];
    st = { ...lv.start };
    sel = 'L';
    hideBeta();
    undoBtn.classList.remove('glow');
    resetBtn.classList.remove('glow');
    killAnimations();
    snapPose();
    updateCounter();
    updateRings();
    if (restarts === 1 || restarts === 3) quip('restart');
    maybeOfferBeta();
  });

  // ---------- Einstieg ----------
  function showIntro() {
    playing = false;
    if (!lv) {
      lv = levels[0];
      st = { ...lv.start };
      computeLayout();
      buildWall();
      snapPose();
      levelName.textContent = ctx.title;
      levelSub.textContent = 'Boulder-Rätsel';
      updateCounter();
    }
    updateRings();
    const chips = levels.map((l, i) => {
      const sv = saved[l.id];
      return h('button', { class: 'd05-chip' + (sv ? ' done' : ''), type: 'button', onclick: () => go(i, l.kind !== 'uebung' || !!l.teach) },
        h('span', { class: 'd05-chip-dot', style: { background: l.color } }),
        h('span', {}, l.name),
        h('small', {}, sv ? (sv.flash ? 'Flash ✦' : '✓') : l.kind === 'uebung' ? 'Übung' : l.grade));
    });
    const basics = cfg.basics ? h('ul', { class: 'd05-basics' },
      h('li', {}, 'Griff antippen: eine Hand greift hin. Die Füße setzt die Kletterin selbst.'),
      h('li', {}, 'Unten wählst du die Hand, falls beide könnten.'),
      h('li', {}, 'Ziel: beide Hände am Top ★.'),
      h('li', {}, 'Flash: gleich im allerersten Versuch oben – ohne Zurück, Neustart und Beta-Hilfe.'),
      h('li', {}, 'Perfekte Beta: mit der kleinstmöglichen Zugzahl.')) : null;
    const go = (i) => {
      ctx.sfx.play('tap');
      sheet.classList.remove('show');
      startLevel(i);
    };
    sheet.replaceChildren(h('div', { class: 'd05-intro panel' },
      h('h2', { class: 'display' }, cfg.intro.title),
      h('p', {}, cfg.intro.text),
      basics,
      h('div', { class: 'd05-chips' }, chips),
      button('Los geht’s', () => go(firstOpen()))));
    sheet.classList.add('show');
  }
  function firstOpen() {
    // Übungen nur beim ersten Mal; danach direkt zum ersten ungelösten Boulder.
    const i = levels.findIndex((l) => !saved[l.id]);
    return i < 0 ? 0 : i;
  }

  // ---------- Größe ----------
  const onResize = () => {
    if (!lv) return;
    const pend = topPending; // Top schon erreicht, Animation wird gleich abgebrochen: Darstellung trotzdem zeigen
    killAnimations();
    busy = false;
    computeLayout();
    buildWall();
    snapPose();
    updateRings();
    pend?.();
  };
  window.addEventListener('resize', onResize);

  // Zuerst Layout messen lassen
  const introFrame = requestAnimationFrame(() => { if (stage.isConnected) showIntro(); });

  // Test- und Prüfhilfe (nur lesend nutzen): aktueller Stand.
  stage.__boulder = {
    get state() { return { level: lv?.id, st, moves: hist.length, ideal: lv?.ideal, playing, busy, sel }; },
    holdPoint(id) {
      const r = svg.getBoundingClientRect();
      const hd = lv.holds[id];
      return { x: r.left + X(hd.x), y: r.top + Y(hd.y) };
    },
    solution() { return solve(lv, st)?.path.map((m) => ({ hand: m.hand, to: m.to, kind: m.kind })) || null; },
    illegal() {
      for (const hd of lv.holds) for (const hand of ['L', 'R']) { const r = tryMove(lv, st, hand, hd.id); if (!r.ok && r.reason !== 'same' && r.reason !== 'same-both') return { hand, to: hd.id, reason: r.reason }; }
      return null;
    },
  };

  return () => {
    clearInterval(betaTimer);
    cancelAnimationFrame(introFrame);
    timers.forEach(clearTimeout);
    clearTimeout(sayTimer);
    clearTimeout(pillTimer);
    killAnimations();
    window.removeEventListener('resize', onResize);
    svg.removeEventListener('pointerdown', onWallDown);
  };
}
