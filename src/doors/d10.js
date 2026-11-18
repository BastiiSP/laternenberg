// Türchen 10 · Lorelais Kaffeewagen (Logikrätsel in zwei Runden)
import './d10.css';

// Die sichtbaren Zettel und die Prüflogik verwenden dieselben strukturierten Hinweise.
export const ROUNDS = [
  {
    title: 'Die verschwundenen Zettel',
    guests: ['Fuchs', 'Eule', 'Igel'],
    drinks: ['Hafer-Cappuccino', 'Espresso', 'Chai mit Hafermilch'],
    extras: ['Hafermilchschaum-Herz', 'Kakaopulver', 'Zimt'],
    clues: [
      { text: 'Die Eule bestellt Espresso.', type: 'guestDrink', a: 'Eule', b: 'Espresso' },
      { text: 'Der Igel trinkt Chai mit Hafermilch.', type: 'guestDrink', a: 'Igel', b: 'Chai mit Hafermilch' },
      { text: 'Zum Espresso gehört Kakaopulver.', type: 'drinkExtra', a: 'Espresso', b: 'Kakaopulver' },
      { text: 'Auf den Chai kommt Zimt.', type: 'drinkExtra', a: 'Chai mit Hafermilch', b: 'Zimt' },
    ],
    nudge: 'Wenn Eule und Igel ihre Getränke haben, bleibt für den Fuchs nur eine Sorte übrig.',
  },
  {
    title: 'Noch eine Runde, bitte',
    guests: ['Fuchs', 'Eule', 'Igel', 'Reh'],
    drinks: ['Hafer-Cappuccino', 'Espresso', 'Chai mit Hafermilch', 'Lupinenkaffee'],
    extras: ['Hafermilchschaum-Herz', 'Kakaopulver', 'Zimt', 'Vanille'],
    clues: [
      { text: 'Der Fuchs bestellt keinen Espresso.', type: 'guestNotDrink', a: 'Fuchs', b: 'Espresso' },
      { text: 'Der Fuchs bestellt keinen Chai.', type: 'guestNotDrink', a: 'Fuchs', b: 'Chai mit Hafermilch' },
      { text: 'Die Eule bestellt keinen Chai.', type: 'guestNotDrink', a: 'Eule', b: 'Chai mit Hafermilch' },
      { text: 'Die Eule bestellt keinen Lupinenkaffee.', type: 'guestNotDrink', a: 'Eule', b: 'Lupinenkaffee' },
      { text: 'Der Igel bestellt keinen Espresso.', type: 'guestNotDrink', a: 'Igel', b: 'Espresso' },
      { text: 'Der Igel bestellt keinen Lupinenkaffee.', type: 'guestNotDrink', a: 'Igel', b: 'Lupinenkaffee' },
      { text: 'Das Reh trinkt Lupinenkaffee.', type: 'guestDrink', a: 'Reh', b: 'Lupinenkaffee' },
      { text: 'Zum Espresso gehört Kakaopulver.', type: 'drinkExtra', a: 'Espresso', b: 'Kakaopulver' },
      { text: 'Zum Chai gehört Zimt.', type: 'drinkExtra', a: 'Chai mit Hafermilch', b: 'Zimt' },
      { text: 'Der Lupinenkaffee bekommt Vanille.', type: 'drinkExtra', a: 'Lupinenkaffee', b: 'Vanille' },
    ],
    nudge: 'Das Reh hat seinen Lupinenkaffee sicher. Welche Getränke bleiben für die anderen übrig?',
  },
];

function permutations(items) {
  if (items.length < 2) return [items.slice()];
  return items.flatMap((item, i) => permutations(items.filter((_, n) => n !== i)).map((tail) => [item, ...tail]));
}
export function matchesClues(round, assignment) {
  return round.clues.every((clue) => {
    const row = assignment[clue.a];
    if (clue.type === 'guestDrink') return row.drink === clue.b;
    if (clue.type === 'guestNotDrink') return row.drink !== clue.b;
    if (clue.type === 'guestExtra') return row.extra === clue.b;
    if (clue.type === 'drinkExtra') return Object.values(assignment).some((r) => r.drink === clue.a && r.extra === clue.b);
    throw new Error(`Unbekannter Hinweis: ${clue.type}`);
  });
}
export function solveRound(round) {
  const solutions = [];
  for (const drinks of permutations(round.drinks)) {
    for (const extras of permutations(round.extras)) {
      const assignment = Object.fromEntries(round.guests.map((guest, i) => [guest, { drink: drinks[i], extra: extras[i] }]));
      if (matchesClues(round, assignment)) solutions.push(assignment);
    }
  }
  return solutions;
}
export function countSatisfied(round, answer, solution) {
  return round.guests.filter((guest) => answer[guest]?.drink === solution[guest].drink && answer[guest]?.extra === solution[guest].extra).length;
}

// Gesichter der Gäste: Ausschnitte aus dem Bild (Mittelpunkt und Kantenlänge im 1024×1536-Original)
const CROPS = {
  Fuchs: { cx: 512, cy: 960, d: 250 },
  Eule: { cx: 700, cy: 1022, d: 235 },
  Igel: { cx: 910, cy: 1100, d: 215 },
};
const GLOWS = [[13.5, 40], [18, 37.6], [22.5, 35.4], [28, 36.8], [33.5, 38], [38.6, 37.9], [43, 37], [47, 38.4], [51.6, 38.8], [56.4, 37.9], [60.2, 38.3], [64.4, 37.5]];

const FAIL_LINES = [
  ['lorelai', 'Ich brauche Kaffee. Dringend. Und ihr braucht eine neue Zuordnung.'],
  ['logan', 'Die Gäste sind nicht sauer. Nur sehr, sehr leise enttäuscht.'],
  ['lorelai', 'Das war nicht ganz richtig. Ich sag es schnell, dann tut es weniger weh.'],
  ['logan', 'Kleiner Tipp von mir: Falsche Bestellungen esse ich notfalls auch.'],
  ['lorelai', 'Die Zettel haben eigentlich alles verraten. Lies sie noch mal. Schneller!'],
  ['logan', 'Ruhig bleiben. Der Schaum fällt schon nicht zusammen. Meistens.'],
];

export default {
  mount(root, ctx) {
    const { h, button } = ctx.ui;
    ctx.setHeader('dark');
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };

    // ---------- Gerüst ----------
    const stage = h('div', { class: 'd10-stage' });
    const art = h('div', { class: 'd10-art' },
      h('img', { class: 'd10-art-img', src: ctx.img('d10-kaffee'), alt: 'Lorelai und Logan am beleuchteten Kaffeewagen, davor Fuchs, Eule und Igel', draggable: 'false' }),
      ...GLOWS.map(([x, y], i) => h('i', { class: 'd10-bulb', style: { left: `${x}%`, top: `${y}%`, animationDelay: `${(i * 0.37) % 2.2}s` } })),
      h('i', { class: 'd10-steam', style: { left: '65%', top: '33%' } }),
      h('i', { class: 'd10-steam s2', style: { left: '67%', top: '35.5%' } }));
    const strip = h('div', { class: 'd10-strip is-big' }, art, h('div', { class: 'd10-strip-shade' }));
    const roundChip = h('span', { class: 'd10-round-chip' });
    strip.append(roundChip);
    const talkFace = h('span', { class: 'd10-face' });
    const talkWho = h('span', { class: 'who' });
    const talkText = h('span', { class: 'd10-say' });
    const talk = h('div', { class: 'd10-talk' }, talkFace, h('p', { class: 'bubble d10-bubble' }, talkWho, talkText));
    const scroll = h('div', { class: 'd10-scroll' });
    const feedback = h('p', { class: 'd10-feedback', role: 'status', 'aria-live': 'polite' });
    const bar = h('div', { class: 'd10-bar' }, feedback);
    stage.append(strip, talk, scroll, bar);
    root.append(stage);

    function say(who, text) {
      talkFace.replaceChildren(ctx.bunnyFace(who, { size: 46 }));
      talkWho.textContent = who === 'lorelai' ? 'Lorelai' : 'Logan';
      talkText.textContent = text;
      talk.classList.remove('is-pop'); void talk.offsetWidth; talk.classList.add('is-pop');
    }
    const avatar = (name, size = 40) => {
      const c = CROPS[name];
      if (c) {
        const k = size / c.d;
        return h('span', { class: 'd10-av', style: { width: `${size}px`, height: `${size}px`, backgroundImage: `url(${ctx.img('d10-kaffee')})`, backgroundSize: `${1024 * k}px auto`, backgroundPosition: `${-(c.cx - c.d / 2) * k}px ${-(c.cy - c.d / 2) * k}px` } });
      }
      const deer = ctx.ui.html(`<svg viewBox="0 0 60 60" width="${size}" height="${size}" aria-hidden="true">
        <g stroke="#d9b98a" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M18 18 L12 6 M15 12 L8 10 M42 18 L48 6 M45 12 L52 10"/></g>
        <ellipse cx="14" cy="26" rx="6" ry="9" transform="rotate(-35 14 26)" fill="#a8774a"/><ellipse cx="46" cy="26" rx="6" ry="9" transform="rotate(35 46 26)" fill="#a8774a"/>
        <ellipse cx="30" cy="36" rx="17" ry="19" fill="#b98a5a"/><ellipse cx="30" cy="44" rx="9" ry="8" fill="#e5cfa8"/>
        <path d="M21 31 q3 3 6 0 M33 31 q3 3 6 0" stroke="#3a2a1b" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="30" cy="42" rx="3.2" ry="2.4" fill="#3a2a1b"/></svg>`);
      return h('span', { class: 'd10-av d10-av-svg', style: { width: `${size}px`, height: `${size}px` } }, deer);
    };

    // ---------- Zustand ----------
    const solutionCache = ROUNDS.map((r) => solveRound(r)[0]);
    let phase = 'intro';
    let roundIndex = 0;
    let answer = {};
    let status = {};
    let selected = 0;
    let wrong = 0;
    let hintCount = 0;
    let busy = false; // Runde ist gelöst, Auswertung läuft: keine weiteren Eingaben
    let failIdx = 0;
    let ui = null;

    const complete = (g) => !!(answer[g]?.drink && answer[g]?.extra);

    // ---------- Intro ----------
    function showIntro() {
      phase = 'intro';
      strip.classList.add('is-big');
      bar.hidden = true;
      roundChip.textContent = '';
      say('lorelai', 'Zettel weg. Gäste da. Kaffee noch nicht. Du übernimmst, ja? Schnell, schnell, schnell.');
      scroll.replaceChildren(h('div', { class: 'd10-card d10-intro' },
        h('span', { class: 'd10-kicker' }, 'Am Waldweg'),
        h('h3', { class: 'display' }, 'Lorelais Kaffeewagen'),
        h('p', {}, 'Lorelai ist Baristin, und ihre Bestellzettel sind verschwunden. Ordne jedem Gast ein Getränk und ein Extra zu. Alles ist pflanzlich, versteht sich. Die Hinweiszettel verraten dir, wer was bekommt.'),
        button('Bestellungen sortieren', () => beginRound(0))));
      scroll.scrollTop = 0;
    }

    // ---------- Runde aufbauen ----------
    function beginRound(index) {
      phase = 'play'; roundIndex = index;
      answer = {}; status = {}; selected = 0; wrong = 0; hintCount = 0; busy = false;
      const round = ROUNDS[index];
      strip.classList.remove('is-big');
      bar.hidden = false;
      roundChip.textContent = `Runde ${index + 1} von 2 · ${round.title}`;
      say('lorelai', index === 0
        ? 'Such dir einen Gast aus, tipp sein Getränk und sein Extra an, und rette meinen Ruf.'
        : 'Vier Gäste. Vier Getränke. Vier Extras. Ich rechne lieber nicht mit meinem Puls.');

      const rows = {};
      const guestList = h('div', { class: 'd10-guests', role: 'list' }, round.guests.map((g, i) => {
        const sum = h('span', { class: 'd10-sum' });
        const badge = h('span', { class: 'd10-badge' });
        const el = h('button', { type: 'button', class: 'd10-guest', role: 'listitem' }, avatar(g, 42),
          h('span', { class: 'd10-gtext' }, h('strong', {}, g), sum), badge);
        el.addEventListener('click', () => { selected = i; ctx.sfx.play('tap'); sync(); });
        rows[g] = { el, sum, badge };
        return el;
      }));

      const chips = {};
      const chipGrid = (kind, items) => h('div', { class: 'd10-chips' }, items.map((item) => {
        const tag = h('em', { class: 'd10-chip-tag' });
        const el = h('button', { type: 'button', class: 'd10-chip', 'aria-pressed': 'false' }, h('span', {}, item), tag);
        el.addEventListener('click', () => pick(kind, item));
        chips[`${kind}:${item}`] = { el, tag, kind, item };
        return el;
      }));
      const chooserTitle = h('p', { class: 'd10-chooser-title' });
      const chooser = h('div', { class: 'd10-chooser' },
        chooserTitle,
        h('h4', {}, 'Getränk'), chipGrid('drink', round.drinks),
        h('h4', {}, 'Extra'), chipGrid('extra', round.extras));

      const noteEls = round.clues.map((clue, i) => {
        const el = h('button', { type: 'button', class: 'd10-note', 'aria-pressed': 'false', style: { '--rot': `${[-1.2, .8, -.5, 1.1][i % 4]}deg` } },
          h('span', { class: 'd10-pin' }), h('span', {}, clue.text));
        el.addEventListener('click', () => { const on = el.classList.toggle('is-done'); el.setAttribute('aria-pressed', on ? 'true' : 'false'); ctx.sfx.play('tick'); });
        return el;
      });
      const board = h('div', { class: 'd10-board' },
        h('h4', {}, 'Gefundene Hinweiszettel'),
        h('p', { class: 'd10-board-sub' }, 'Tippe einen Zettel an, um ihn abzuhaken.'),
        h('div', { class: 'd10-notes' }, noteEls));

      const hintBtn = button('Hinweis', () => giveHint(), { variant: 'ghost' });
      const serveBtn = button('Servieren', () => serve());
      const revealBtn = button('Eine Zuordnung verraten', () => reveal(), { variant: 'ghost small' });
      revealBtn.hidden = true;
      revealBtn.classList.add('d10-reveal');
      const actions = h('div', { class: 'd10-actions' }, hintBtn, serveBtn);
      bar.replaceChildren(feedback, revealBtn, actions);

      ui = { round, rows, chips, chooserTitle, noteEls, serveBtn, revealBtn, scrollChooser: chooser };
      scroll.replaceChildren(guestList, chooser, board);
      scroll.scrollTop = 0;
      sync();
    }

    // ---------- Anzeige abgleichen ----------
    function sync(message) {
      if (!ui) return;
      const { round, rows, chips } = ui;
      const guest = round.guests[selected];
      for (const g of round.guests) {
        const r = rows[g], a = answer[g] || {};
        r.el.classList.toggle('is-selected', g === guest);
        r.el.classList.toggle('is-ok', status[g] === 'ok');
        r.el.classList.toggle('is-no', status[g] === 'no');
        r.el.setAttribute('aria-current', g === guest ? 'true' : 'false');
        r.sum.replaceChildren(
          h('span', { class: a.drink ? 'set' : 'open' }, a.drink || 'Getränk offen'),
          h('span', { class: 'dot' }, ' · '),
          h('span', { class: a.extra ? 'set' : 'open' }, a.extra || 'Extra offen'));
        r.badge.textContent = status[g] === 'ok' ? 'zufrieden' : status[g] === 'no' ? 'grummelt' : '';
      }
      ui.chooserTitle.replaceChildren(h('span', {}, 'Bestellung für '), h('strong', {}, guest));
      for (const c of Object.values(chips)) {
        const owner = round.guests.find((g) => answer[g]?.[c.kind] === c.item);
        const mine = owner === guest;
        c.el.classList.toggle('is-picked', mine);
        c.el.classList.toggle('is-taken', !!owner && !mine);
        c.el.setAttribute('aria-pressed', mine ? 'true' : 'false');
        c.tag.textContent = owner && !mine ? owner : '';
      }
      const n = round.guests.filter(complete).length;
      const ready = n === round.guests.length;
      ui.serveBtn.classList.toggle('is-ready', ready);
      const solved = countSatisfied(round, answer, solutionCache[roundIndex]);
      ui.revealBtn.hidden = !(wrong >= 3 && solved < round.guests.length && !busy);
      feedback.textContent = message || (ready ? 'Das Tablett ist voll. Bereit zum Servieren?' : `${n} von ${round.guests.length} Bestellungen komplett`);
    }

    function pick(kind, item) {
      if (busy) return;
      const { round } = ui;
      const guest = round.guests[selected];
      const wasComplete = complete(guest);
      for (const g of round.guests) {
        if (g !== guest && answer[g]?.[kind] === item) { delete answer[g][kind]; status[g] = null; }
      }
      answer[guest] ??= {};
      if (answer[guest][kind] === item) delete answer[guest][kind]; // zweites Antippen nimmt zurück
      else answer[guest][kind] = item;
      status[guest] = null;
      ctx.sfx.play('tick');
      ctx.ui.haptic(8);
      sync();
      if (!wasComplete && complete(guest)) {
        const next = round.guests.findIndex((g, i) => i > selected && !complete(g));
        const any = next >= 0 ? next : round.guests.findIndex((g) => !complete(g));
        if (any >= 0) later(() => { selected = any; ctx.sfx.play('tap'); sync(); }, 380);
      }
    }

    function giveHint() {
      const { round, noteEls } = ui;
      hintCount++;
      const i = (hintCount - 1) % round.clues.length;
      noteEls.forEach((el, n) => el.classList.toggle('is-lit', n === i));
      noteEls[i].scrollIntoView({ block: 'center', behavior: ctx.reducedMotion ? 'auto' : 'smooth' });
      ctx.sfx.play('chime');
      say('lorelai', `Schau auf den Zettel: „${round.clues[i].text}“${hintCount === 1 ? ' ' + round.nudge : ''}`);
      later(() => noteEls[i]?.classList.remove('is-lit'), 4200);
    }

    function reveal() {
      if (busy || phase !== 'play') return;
      const { round } = ui;
      const sol = solutionCache[roundIndex];
      const first = round.guests.find((g) => answer[g]?.drink !== sol[g].drink || answer[g]?.extra !== sol[g].extra) || round.guests[0];
      for (const g of round.guests) {
        if (g === first) continue;
        for (const kind of ['drink', 'extra']) {
          if (answer[g]?.[kind] === sol[first][kind]) { delete answer[g][kind]; status[g] = null; }
        }
      }
      answer[first] = { ...sol[first] };
      status[first] = null;
      selected = round.guests.indexOf(first);
      const left = round.guests.length - countSatisfied(round, answer, sol);
      ctx.sfx.play('success');
      say('lorelai', `Na gut, eine verrate ich: ${first} bekommt ${answer[first].drink} mit ${answer[first].extra}. ${left > 0 ? 'Der Rest ist wieder dein Rätsel. Wenn es sein muss, verrate ich dir auch die nächste.' : 'Das war die letzte. Jetzt nur noch servieren!'}`);
      sync(left > 0 ? `${first} ist versorgt. ${left === 1 ? 'Eine Bestellung ist' : `${left} Bestellungen sind`} noch offen oder falsch.` : `${first} ist versorgt. Alles steht richtig, du kannst servieren.`);
    }

    // ---------- Servieren ----------
    function serve() {
      if (busy || phase !== 'play') return;
      const { round } = ui;
      const open = round.guests.filter((g) => !complete(g));
      if (open.length) {
        ctx.sfx.play('locked');
        selected = round.guests.indexOf(open[0]);
        say('lorelai', 'Moment, auf dem Tablett fehlt noch etwas. Ich kann nicht mit leeren Tassen servieren, das sieht unprofessionell aus.');
        sync(`${open.length === 1 ? 'Eine Bestellung ist' : `${open.length} Bestellungen sind`} noch offen.`);
        return;
      }
      const sol = solutionCache[roundIndex];
      round.guests.forEach((g) => { status[g] = answer[g].drink === sol[g].drink && answer[g].extra === sol[g].extra ? 'ok' : 'no'; });
      const happy = round.guests.filter((g) => status[g] === 'ok').length;
      stage.classList.add('is-serving');
      ctx.sfx.bell?.(660, { vol: .07, dur: .8 });
      later(() => stage.classList.remove('is-serving'), 900);
      if (happy < round.guests.length) {
        wrong++;
        ctx.sfx.play('wrong');
        ctx.ui.haptic(30);
        const [who, line] = FAIL_LINES[failIdx++ % FAIL_LINES.length];
        say(who, line);
        sync(`${happy} von ${round.guests.length} Gästen zufrieden.`);
        ui.rows && round.guests.forEach((g) => { if (status[g] === 'no') { const el = ui.rows[g].el; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); } });
        return;
      }
      busy = true;
      ui.serveBtn.disabled = true;
      sync();
      const forRound = roundIndex;
      later(() => { if (phase === 'play' && roundIndex === forRound) celebrate(); }, 650);
    }

    function celebrate() {
      const { round } = ui;
      phase = 'result';
      ctx.sfx.play(roundIndex === 0 ? 'success' : 'fanfare');
      ctx.fx.confetti?.({ count: roundIndex === 0 ? 60 : 110 });
      bar.hidden = true;
      const faces = h('div', { class: 'd10-happy' }, round.guests.map((g, i) => h('span', { class: 'd10-happy-one', style: { animationDelay: `${i * .12}s` } }, avatar(g, 54), h('em', {}, g))));
      if (roundIndex === 0) {
        say('logan', 'Ich war übrigens auch zufrieden. Ich habe nur nichts bestellt.');
        scroll.replaceChildren(h('div', { class: 'd10-card d10-result' },
          h('span', { class: 'd10-kicker' }, 'Alle drei zufrieden'),
          h('h3', { class: 'display' }, 'Der Wagen rollt weiter'),
          faces,
          h('p', {}, 'Dreimal Dampf, dreimal Lächeln, null Beschwerden. Lorelai wischt sich die Stirn mit einem Milchschaumlöffel ab.'),
          button('Runde 2 starten', () => beginRound(1))));
      } else {
        ctx.complete();
        say('lorelai', 'Ich habe jetzt endlich meinen Kaffee. Der Kaffeesatz kann Feierabend machen.');
        later(() => say('logan', 'Ich nehme noch ein Hafermilchschaum-Herz. Nur zur Qualitätskontrolle.'), 4200);
        scroll.replaceChildren(h('div', { class: 'd10-card d10-result' },
          h('span', { class: 'd10-kicker' }, 'Vier von vier zufrieden'),
          h('h3', { class: 'display' }, 'Kaffeesatz-Orakel'),
          faces,
          h('p', {}, 'Der Kaffeesatz sagt: Morgen wird wieder morgen. Er verlangt dafür erstaunlich viel Trinkgeld.'),
          button('Noch einmal spielen', () => { failIdx = 0; beginRound(0); }, { variant: 'ghost' }),
          button('Zurück zum Berg', () => ctx.close())));
      }
      scroll.scrollTop = 0;
    }

    showIntro();
    return () => { timers.forEach(clearTimeout); timers.clear(); };
  },
};
