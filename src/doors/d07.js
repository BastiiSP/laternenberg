// Türchen 7 · Waldkino
// Emoji-Filmrätsel zu Studio-Ghibli-Filmen auf einer selbstgebauten Leinwand.
import './d07.css';

const ROUNDS = 8;

// Emoji-Folgen: keine Bilder oder Figuren aus den Filmen, nur gängige Emojis.
// `not`: Titel, die zur Folge eindeutig NICHT passen (daraus werden die falschen Antworten gezogen).
const FILMS = {
  totoro: {
    title: 'Mein Nachbar Totoro', emoji: ['☔', '🚏', '🐱', '🚌', '🌳'],
    not: ['porco', 'laputa', 'chihiro', 'howl', 'mononoke', 'ponyo'],
    quip: 'Ein Bus, der eine Katze ist. Ich möchte bitte ein Monatsticket.',
    blurb: 'Ein Regenschirm, eine Bushaltestelle und ein sehr großer, sehr flauschiger Waldgeist.',
  },
  chihiro: {
    title: 'Chihiros Reise ins Zauberland', emoji: ['🛁', '🐉', '🚂', '👻'],
    not: ['porco', 'kiki', 'arrietty', 'katzen'],
    quip: 'Ein Badehaus für Geister. Ich nehme die Ruhe-Suite.',
    blurb: 'Ein Badehaus für Geister, ein Drache und eine Reise, die man nicht so schnell vergisst.',
  },
  howl: {
    title: 'Das wandelnde Schloss', emoji: ['👵', '🏰', '🔥', '🧙'],
    not: ['porco', 'arrietty', 'totoro'],
    quip: 'Ein Schloss, das einfach losläuft. So möchte ich auch manchmal Montage handhaben.',
    blurb: 'Ein Schloss auf Beinen und ein Feuerdämon, der es am Laufen hält.',
  },
  kiki: {
    title: 'Kikis kleiner Lieferservice', emoji: ['🧹', '🐱', '📦', '🥖'],
    not: ['mononoke', 'ponyo', 'porco', 'laputa'],
    quip: 'Lieferservice per Besen. Die Paketboten im Wald sind neidisch.',
    blurb: 'Eine junge Hexe, ein Besen, ein schwarzer Kater und eine Bäckerei.',
  },
  mononoke: {
    title: 'Prinzessin Mononoke', emoji: ['🐺', '🏹', '🦌', '🌲'],
    not: ['kiki', 'ponyo', 'arrietty', 'porco', 'howl', 'katzen', 'laputa'],
    quip: 'Waldgeister, Wölfe, große Gefühle. Wir Waldbewohner schauen das mit Respekt.',
    blurb: 'Wölfe, Waldgeister und ein großer Streit zwischen Mensch und Natur.',
  },
  ponyo: {
    title: 'Ponyo – Das große Abenteuer am Meer', emoji: ['🐠', '👦', '🌊', '🏠'],
    not: ['mononoke', 'howl', 'kiki'],
    quip: 'Ein Fisch mit großen Plänen. Ich kenne das, ich bin ein Kaninchen mit großen Plänen.',
    blurb: 'Ein Fischmädchen, ein Junge und eine ziemlich große Welle.',
  },
  laputa: {
    title: 'Das Schloss im Himmel', emoji: ['💎', '🤖', '🏝️', '☁️'],
    not: ['totoro', 'ponyo', 'kiki', 'mononoke', 'arrietty', 'katzen'],
    quip: 'Eine Insel zwischen den Wolken. Ich nehme das Zimmer mit Aussicht.',
    blurb: 'Eine Insel über den Wolken, ein Kristall und ein Roboter.',
  },
  porco: {
    title: 'Porco Rosso', emoji: ['✈️', '🐷', '🔴', '🕶️'],
    not: ['totoro', 'arrietty', 'mononoke', 'katzen', 'howl', 'ponyo'],
    quip: 'Ein Pilot mit Schnauze und Stil. Respekt, das kann nicht jeder.',
    blurb: 'Ein Pilot, der aussieht wie ein Schwein, ein rotes Flugzeug und die Adria.',
  },
  arrietty: {
    title: 'Arrietty – Die wundersame Welt der Borger', emoji: ['🔎', '👧', '🍬', '🏠'],
    not: ['mononoke', 'laputa', 'porco', 'howl'],
    quip: 'Winzige Leute, die sich leise etwas borgen. Ich schaue seitdem zweimal in den Zuckertopf.',
    blurb: 'Winzige Menschen unter dem Fußboden, die sich nur das Nötigste borgen.',
  },
  katzen: {
    title: 'Das Königreich der Katzen', emoji: ['🐱', '👑', '🎁', '👧'],
    not: ['mononoke', 'porco', 'laputa', 'ponyo', 'chihiro', 'arrietty'],
    quip: 'Ein ganzes Königreich voller Katzen. Wir Kaninchen verhandeln noch über ein Gegenstück.',
    blurb: 'Ein Katzenkönig, ein Reich voller Katzen und eine Menge Geschenke, die niemand bestellt hat.',
  },
};

const ASK = {
  lorelai: [
    (n) => `Szene ${n}! Augen auf, Kaffee ab.`,
    () => 'Weiter im Programm. Die nächste Rolle ist schon eingelegt.',
    () => 'Achtung, die Emojis kommen. Bitte nicht blinzeln, ich wiederhole nichts. Ich wiederhole alles.',
    () => 'Nächster Film! Mein Tipp: erst schauen, dann denken, dann tippen. Ich mache es umgekehrt.',
    () => 'Ruhe im Saal! Das heißt: Logan, kau leiser.',
    (n) => `Szene ${n}. Der Projektor summt. Das ist ein gutes Zeichen. Oder ein Kabelbrand.`,
  ],
  logan: [
    (n) => `Szene ${n}. Ich habe es mir gemütlich gemacht, du auch? Dann geht es los.`,
    () => 'Nächste Rolle! Ich schaue mit halb geschlossenen Augen. Das ist Fachkompetenz.',
    () => 'Jetzt wird es spannend. Oder gemütlich. Meistens beides.',
    () => 'Emojis auf der Leinwand! Ich kann sie nicht lesen, aber sie sehen toll aus.',
    () => 'Bitte sehr, die nächste Szene. Das Popcorn ist alle. Ich weiß nicht, wie das passieren konnte.',
    (n) => `Szene ${n}. Die Sessel sind warm, der Schnee ist leise. Bitte sehr.`,
  ],
};

const RIGHT = {
  lorelai: [
    'Richtig! Du hast die Emojis gelesen wie ein Drehbuch.',
    'Genau der! Applaus, Applaus. Ich klatsche mit den Ohren.',
    'Volltreffer! Die Jury nickt. Die Jury bin ich.',
    'Ja! Das ging schneller als meine Kaffeemaschine.',
    'Richtig. Ich bin beeindruckt, und ich bin selten beeindruckt.',
    'Stimmt! Das hätte ich auch gewusst. Wahrscheinlich.',
    'Bingo! Ein Stern für dich auf der Hollywood-Lichtung.',
  ],
  logan: [
    'Richtig. Das war elegant, wie ein Kaninchen auf Schnee.',
    'Genau so. Ich lehne mich zufrieden zurück, der Baumstumpf auch.',
    'Stimmt! Dafür gibt es eine imaginäre Tüte Popcorn.',
    'Treffer. Ich bin gerührt. Und ein bisschen satt.',
    'Ja! Das war Kino. Wörtlich.',
    'Richtig, und ganz ohne Hast. So mag ich das.',
    'Korrekt. Die Leinwand strahlt, und das ist nicht nur der Projektor.',
  ],
};

const WRONG = {
  lorelai: [
    'Leider nein. Die Emojis waren aber auch gemein. Sag das nicht dem Vorführer.',
    'Daneben! Aber mit Haltung. Und genau das ist Kino.',
    'Falsch. Macht nichts, wir spulen zurück. Also nicht wirklich. Aber innerlich.',
    'Nope. Der Projektor hat sich verschluckt, das passiert.',
    'Knapp daneben ist auch Kino. Nur ohne Abspann.',
    'Das war es nicht. Aber die Auflösung steht ja schon auf der Leinwand.',
    'Autsch. Ich reiche dir innerlich eine Tasse Kaffee.',
  ],
  logan: [
    'Hm, nicht ganz. Kein Drama, der Film läuft ja weiter.',
    'Leider falsch. Aber sympathisch falsch.',
    'Nö. Ich hätte auch daneben gelegen, im Halbschlaf.',
    'Daneben. Ich reiche dir ein Stück imaginäres Popcorn.',
    'Das war es nicht. Atme durch, nimm einen Schluck Tee.',
    'Falsch, aber die Wahl war mutig.',
    'Knapp daneben. Der Sessel bleibt trotzdem warm.',
  ],
};

const HINTS = {
  lorelai: [
    'Zwei Titel verlassen den Saal. Leise, auf Zehenspitzen.',
    'Zack, zwei Antworten sind raus. Die Türen quietschen kurz.',
    'Zwei weniger! Ich habe sie persönlich hinausbegleitet.',
  ],
  logan: [
    'Zwei Titel sind gegangen. Sie wollten ohnehin noch etwas essen.',
    'Es wird leerer im Saal. Zwei Plätze sind frei, nimm dir ruhig Zeit.',
    'Zwei Titel sind raus. Ich habe so getan, als hätte ich nichts gesehen.',
  ],
};

const INTRO = [
  { who: 'lorelai', text: 'Willkommen im Waldkino! Auf der Leinwand erscheinen Emojis, und du erkennst den Film. Ich habe die Vorführung übernommen.' },
  { who: 'logan', text: 'Ich habe das Popcorn übernommen. Und teilweise probiert. Acht Szenen, alles Studio Ghibli, vier Titel zur Auswahl.' },
  { who: 'lorelai', text: 'Wenn es klemmt, schicke ich zwei Titel aus dem Saal. Das nennt man Hinweis. Und jetzt: Licht aus, Projektor an!' },
];

const TITLES = [
  { min: 8, name: 'Ehren-Vorführerin des Waldkinos', who: 'lorelai', text: 'Acht von acht. Ich bin sprachlos, und der Projektor auch. Das Waldkino verneigt sich.' },
  { min: 6, name: 'Ghibli-Kennerin', who: 'logan', text: 'Das war stark. Das Waldkino ist stolz, und ich habe vor Rührung den Rest vom Popcorn gegessen.' },
  { min: 4, name: 'Stammgast in Reihe eins', who: 'lorelai', text: 'Solide! Du hast die Hälfte im Kasten, das ist ein sicherer Platz in der ersten Reihe.' },
  { min: 2, name: 'Gast mit Popcorn-Potenzial', who: 'logan', text: 'Ein guter Anfang. Das Schöne an Filmen: Sie laufen jederzeit wieder.' },
  { min: 0, name: 'Gemütliche Zuschauerin', who: 'lorelai', text: 'Dafür hast du den besten Platz im Saal gewählt: den bequemsten. Das ist auch eine Kunst.' },
];

const NAME = { lorelai: 'Lorelai', logan: 'Logan' };

const shuffle = (a) => {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

const PROJECTOR = `
<svg class="d07-proj-svg" viewBox="0 0 70 50" width="62" height="44" aria-hidden="true">
  <circle cx="19" cy="14" r="12" fill="#6b4a2a" stroke="#d9a64f" stroke-width="2"/>
  <circle cx="19" cy="14" r="3.5" fill="#d9a64f"/>
  <circle cx="42" cy="12" r="10" fill="#6b4a2a" stroke="#d9a64f" stroke-width="2"/>
  <circle cx="42" cy="12" r="3" fill="#d9a64f"/>
  <rect x="8" y="24" width="46" height="20" rx="4" fill="#4b3320" stroke="#d9a64f" stroke-width="2"/>
  <rect x="53" y="30" width="12" height="8" rx="2" fill="#d9a64f"/>
  <rect x="13" y="30" width="3" height="8" rx="1" fill="#d9a64f" opacity=".7"/>
  <rect x="20" y="30" width="3" height="8" rx="1" fill="#d9a64f" opacity=".7"/>
  <rect x="27" y="30" width="3" height="8" rx="1" fill="#d9a64f" opacity=".7"/>
</svg>`;

export default {
  mount(root, ctx) {
    const { h, button, haptic } = ctx.ui;
    const timers = new Set();
    const bag = {};
    let typer = 0;
    let busy = false;

    const later = (fn, ms) => {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
      return t;
    };
    const draw = (key, arr) => {
      if (!bag[key] || !bag[key].length) bag[key] = shuffle(arr);
      return bag[key].pop();
    };

    // ---------- Aufbau ----------
    const stage = h('div', { class: 'stage-fill d07-stage' });
    const bg = h('img', { class: 'stage-bg d07-bg', src: ctx.img('d07-waldkino'), alt: '', draggable: 'false' });
    const shadeLight = h('div', { class: 'd07-shade d07-shade-light' });
    const shadeDark = h('div', { class: 'd07-shade d07-shade-dark' });
    const screen = h('div', { class: 'd07-screen' });
    stage.append(bg, shadeLight, shadeDark, screen);
    root.append(stage);

    let plan = [];
    let results = [];
    let score = 0;

    const setDim = (on) => stage.classList.toggle('dim', on);
    const swap = (...kids) => {
      screen.replaceChildren(...kids);
      screen.scrollTop = 0;
      screen.classList.remove('enter');
      // eslint-disable-next-line no-unused-expressions
      screen.offsetWidth;
      screen.classList.add('enter');
    };

    // ---------- Moderation ----------
    function makeTalker() {
      const face = h('div', { class: 'd07-face' });
      const who = h('span', { class: 'who' });
      const said = h('p', { class: 'd07-said' });
      const bubble = h('div', { class: 'd07-bubble', role: 'status', 'aria-live': 'polite' }, who, said);
      const el = h('div', { class: 'd07-talk' }, face, bubble);
      let current = null;
      let full = '';
      let vis = null;
      let hid = null;
      const finish = () => {
        clearInterval(typer);
        if (vis) {
          vis.textContent = full;
          hid.textContent = '';
        }
      };
      bubble.addEventListener('click', finish);
      function say(w, text, { anim = '' } = {}) {
        clearInterval(typer);
        if (current !== w) {
          current = w;
          face.replaceChildren(ctx.bunnyFace(w, { size: 58 }));
          face.classList.remove('pop');
          // eslint-disable-next-line no-unused-expressions
          face.offsetWidth;
          face.classList.add('pop');
          who.textContent = NAME[w];
        }
        if (anim) {
          face.classList.remove('hop', 'shake');
          // eslint-disable-next-line no-unused-expressions
          face.offsetWidth;
          face.classList.add(anim);
        }
        full = text;
        vis = h('span', { class: 'v' });
        hid = h('span', { class: 'x' }, text);
        said.replaceChildren(vis, hid);
        bubble.classList.remove('in');
        // eslint-disable-next-line no-unused-expressions
        bubble.offsetWidth;
        bubble.classList.add('in');
        if (ctx.reducedMotion) {
          finish();
          return;
        }
        let i = 0;
        typer = setInterval(() => {
          i = Math.min(text.length, i + 2);
          vis.textContent = text.slice(0, i);
          hid.textContent = text.slice(i);
          if (i >= text.length) clearInterval(typer);
        }, 20);
      }
      return { el, say };
    }

    function strip(list, current = -1) {
      return h('div', { class: 'd07-strip', 'aria-hidden': 'true' },
        Array.from({ length: ROUNDS }, (_, i) => h('i', {
          class: 'd07-cell' + (list[i] === true ? ' ok' : list[i] === false ? ' no' : '') + (i === current ? ' now' : ''),
        })));
    }

    // Leinwand mit Lichtkegel, Staub und Flackern
    function makeScreen() {
      const motes = h('div', { class: 'd07-motes' },
        Array.from({ length: 18 }, () => h('i', {
          class: 'd07-mote',
          style: {
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            '--s': `${1.5 + Math.random() * 2.6}px`,
            '--d': `${5 + Math.random() * 7}s`,
            '--w': `${-Math.random() * 9}s`,
            '--x': `${Math.round((Math.random() - 0.3) * 40)}px`,
          },
        })));
      const beam = h('div', { class: 'd07-beamwrap', 'aria-hidden': 'true' }, h('div', { class: 'd07-beam' }), motes);
      const label = h('span', { class: 'd07-label' });
      const emojis = h('div', { class: 'd07-emojis', 'aria-label': 'Emoji-Folge' });
      const capTitle = h('p', { class: 'd07-cap-title display' });
      const capSub = h('p', { class: 'd07-cap-sub' });
      const cap = h('div', { class: 'd07-cap' }, capTitle, capSub);
      const cloth = h('div', { class: 'd07-cloth' },
        h('div', { class: 'd07-grain' }), h('div', { class: 'd07-scratch a' }), h('div', { class: 'd07-scratch b' }),
        label, h('div', { class: 'd07-scene' }, emojis, cap), h('div', { class: 'd07-vig' }), h('div', { class: 'd07-flash' }));
      const proj = h('div', { class: 'd07-proj', 'aria-hidden': 'true', html: PROJECTOR });
      const wrap = h('div', { class: 'd07-wrap' }, cloth, beam, proj);
      return { wrap, cloth, emojis, label, cap, capTitle, capSub };
    }

    // ---------- Einstieg ----------
    function showIntro() {
      busy = false;
      setDim(false);
      score = 0;
      results = [];
      plan = shuffle(Object.keys(FILMS)).slice(0, ROUNDS);
      const talker = makeTalker();
      let n = 0;
      const best = ctx.store.get('best', 0);
      const title = h('div', { class: 'd07-intro-title' },
        h('span', { class: 'd07-kicker' }, 'Heute im Programm'),
        h('h2', { class: 'display' }, 'Waldkino'),
        h('p', { class: 'd07-sub' }, 'Das Emoji-Filmrätsel'),
        best > 0 ? h('p', { class: 'd07-best small' }, `Dein bisheriger Rekord: ${best} von ${ROUNDS}`) : null);
      const next = button('Weiter', () => {
        n++;
        if (n < INTRO.length) {
          talker.say(INTRO[n].who, INTRO[n].text, { anim: 'hop' });
          if (n === INTRO.length - 1) next.textContent = 'Film ab!';
        } else {
          showRound(0);
        }
      });
      swap(title, h('div', { class: 'd07-intro-bottom' }, talker.el, next));
      later(() => talker.say(INTRO[0].who, INTRO[0].text, { anim: 'hop' }), 450);
    }

    // ---------- Runde ----------
    function showRound(i) {
      busy = false;
      setDim(true);
      const id = plan[i];
      const film = FILMS[id];
      const mod = i % 2 === 0 ? 'lorelai' : 'logan';
      const talker = makeTalker();
      const scr = makeScreen();
      scr.label.textContent = `Szene ${i + 1} von ${ROUNDS}`;
      const pool = shuffle(film.not).slice(0, 3);
      const options = shuffle([id, ...pool]);
      let hinted = false;
      let answered = false;

      // Emojis laufen nacheinander ein
      film.emoji.forEach((e, k) => {
        const el = h('span', { class: 'd07-em', style: { '--k': k } }, e);
        scr.emojis.append(el);
        later(() => ctx.sfx.play('tick'), 350 + k * 420);
      });
      scr.emojis.style.setProperty('--n', film.emoji.length);
      later(() => ctx.sfx.hiss({ dur: 0.45, vol: 0.035, from: 220, to: 800 }), 80);

      const buttons = options.map((oid) => {
        const b = h('button', { class: 'd07-opt', type: 'button', 'data-id': oid },
          h('span', { class: 'd07-opt-text' }, FILMS[oid].title),
          h('span', { class: 'd07-mark', 'aria-hidden': 'true' }));
        b.addEventListener('click', () => answer(b, oid));
        return b;
      });

      function answer(b, oid) {
        if (answered) return;
        answered = true;
        const ok = oid === id;
        results[i] = ok;
        buttons.forEach((x) => {
          x.disabled = true;
          const xid = x.dataset.id;
          if (xid === id) {
            x.classList.add('right');
            x.querySelector('.d07-mark').textContent = '✓';
          } else if (x === b) {
            x.classList.add('wrong');
            x.querySelector('.d07-mark').textContent = '✗';
          } else x.classList.add('dim');
        });
        sCells.children[i].classList.add(ok ? 'ok' : 'no');
        scr.cloth.classList.add(ok ? 'win' : 'lose');
        scr.capTitle.textContent = film.title;
        scr.capSub.textContent = film.quip;
        scr.cap.classList.add('show');
        if (ok) {
          score++;
          ctx.sfx.play('chime');
          haptic(14);
          ctx.fx.burstAt(b, { count: 22, kind: 'star', power: 190 });
        } else {
          ctx.sfx.play('wrong');
          haptic(30);
          b.classList.add('shake');
        }
        talker.say(mod, draw(`${ok ? 'r' : 'w'}-${mod}`, (ok ? RIGHT : WRONG)[mod]), { anim: ok ? 'hop' : 'shake' });
        hintBtn.remove();
        row.append(next);
        next.classList.add('ready');
      }

      const hintBtn = button('Hinweis', () => {
        if (hinted || answered) return;
        hinted = true;
        const wrongs = buttons.filter((x) => x.dataset.id !== id);
        shuffle(wrongs).slice(0, 2).forEach((x) => {
          x.disabled = true;
          x.classList.add('gone');
        });
        hintBtn.disabled = true;
        ctx.sfx.play('whoosh');
        talker.say(mod, draw(`h-${mod}`, HINTS[mod]), { anim: 'hop' });
      }, { variant: 'ghost small' });
      hintBtn.classList.add('d07-hint');

      const next = button(i === ROUNDS - 1 ? 'Zum Abspann' : 'Nächste Szene', () => {
        if (busy) return;
        busy = true;
        if (i + 1 < ROUNDS) showRound(i + 1);
        else showFinal();
      });
      next.classList.add('d07-next');

      const row = h('div', { class: 'd07-row' }, hintBtn);
      const sCells = strip(results, i);
      const top = h('div', { class: 'd07-top' }, sCells);
      swap(top, scr.wrap, talker.el, h('div', { class: 'd07-options' }, buttons), row);
      later(() => { if (!answered && !hinted) talker.say(mod, draw(`a-${mod}`, ASK[mod])(i + 1)); }, 250); // nicht über Antwort- oder Hinweisfeedback legen
    }

    // ---------- Abspann ----------
    function showFinal() {
      busy = false;
      setDim(true);
      const total = results.filter(Boolean).length;
      const T = TITLES.find((t) => total >= t.min);
      const talker = makeTalker();
      try {
        if (total > ctx.store.get('best', 0)) ctx.store.set('best', total);
      } catch {
        /* Speicher kann fehlen */
      }
      ctx.complete();
      ctx.sfx.play(total >= 6 ? 'fanfare' : total >= 2 ? 'success' : 'bell');
      if (total >= 6) later(() => ctx.fx.confetti({ count: 100 }), 300);
      else later(() => ctx.fx.burst(innerWidth / 2, innerHeight * 0.25, { count: 28, kind: 'star' }), 300);

      const credits = h('div', { class: 'd07-credits' },
        h('span', { class: 'd07-kicker' }, 'Abspann'),
        h('p', { class: 'd07-bigscore display' }, `${total} von ${ROUNDS}`),
        strip(results),
        h('p', { class: 'd07-cert-line' }, 'Dein Titel im Waldkino:'),
        h('p', { class: 'd07-cert-title display' }, T.name));

      // Filmabend-Vorschlag: bevorzugt ein Film, der nicht erkannt wurde
      const missed = plan.filter((_, k) => results[k] === false);
      const list = [...shuffle(missed), ...shuffle(plan.filter((_, k) => results[k] !== false))];
      let idx = 0;
      const sugTitle = h('p', { class: 'd07-sug-title display' });
      const sugBlurb = h('p', { class: 'd07-sug-blurb' });
      const showSug = () => {
        const f = FILMS[list[idx]];
        sugTitle.textContent = f.title;
        sugBlurb.textContent = f.blurb;
      };
      showSug();
      const other = button('Anderer Vorschlag', () => {
        idx = (idx + 1) % list.length;
        showSug();
      }, { variant: 'small dark' });
      const card = h('div', { class: 'd07-night' },
        h('span', { class: 'd07-night-kicker' }, 'Dein Filmabend-Vorschlag'),
        sugTitle,
        sugBlurb,
        h('p', { class: 'd07-night-need' }, 'Du brauchst: eine Decke, Tee oder Hafer-Kakao, Popcorn (ohne Butter, dafür mit Salz oder Ahornsirup) und ein bisschen Dunkelheit.'),
        other);
      const again = button('Noch einmal spielen', () => showIntro(), { variant: 'ghost' });
      const back = button('Zurück zum Berg', () => ctx.close());
      swap(credits, talker.el, card, h('div', { class: 'd07-final-foot' }, back, again));
      later(() => talker.say(T.who, T.text, { anim: 'hop' }), 500);
    }

    showIntro();

    return () => {
      clearInterval(typer);
      timers.forEach(clearTimeout);
      timers.clear();
    };
  },
};
