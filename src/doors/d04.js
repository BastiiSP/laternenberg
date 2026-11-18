// Türchen 4 · Das große Sofa-Quiz
// Quizshow mit Lorelai und Logan: neun Fragen zu Friends, How I Met Your Mother und Gilmore Girls.
import './d04.css';

const SHOW_NAMES = {
  friends: 'Friends',
  himym: 'How I Met Your Mother',
  gilmore: 'Gilmore Girls',
};

// Nur sicher belegte, eindeutige Fakten. Keine Dialogzitate.
const QUESTIONS = [
  {
    show: 'friends', mod: 'logan',
    q: 'In welchem Café hängen die Friends am liebsten auf dem orangefarbenen Sofa ab?',
    right: 'Central Perk', wrong: ['Monk’s Café', 'Starbucks', 'Café Sacher'],
    ask: 'Frage eins, Friends. Wir fangen gemütlich an, so wie es sich für uns gehört.',
    quip: 'Ein Sofa, auf dem immer Platz ist. Das ist die eigentliche Fantasie.',
  },
  {
    show: 'himym', mod: 'lorelai',
    q: 'Wie heißt die Kneipe, in der die Freunde in How I Met Your Mother fast jeden Abend landen?',
    right: 'MacLaren’s Pub', wrong: ['Central Perk', 'Moe’s Taverne', 'Cheers'],
    ask: 'How I Met Your Mother! Jede gute Geschichte braucht einen Stammplatz. Und Kaffee. Oder zwei.',
    quip: 'Eine Kneipe als zweites Wohnzimmer. Klingt vernünftig.',
  },
  {
    show: 'gilmore', mod: 'lorelai',
    q: 'In welchem Städtchen spielt Gilmore Girls?',
    right: 'Stars Hollow', wrong: ['Pawnee', 'Springfield', 'Twin Peaks'],
    ask: 'Gilmore Girls! Ich erkläre mich hiermit für befangen: Namensvetterin. Ich frage trotzdem ganz neutral. Ehrenwort.',
    quip: 'Ein Städtchen, in dem jeder jeden kennt. Ich kenne genau Logan, das reicht mir.',
  },
  {
    show: 'friends', mod: 'logan',
    q: 'Welchen Beruf hat Ross Geller?',
    right: 'Paläontologe', wrong: ['Koch', 'Zahnarzt', 'Zirkusdirektor'],
    ask: 'Zurück zu Friends. Berufe-Runde! Ich tippe bei mir auf Sofa-Beauftragter.',
    quip: 'Dinosaurier! Ich mag alles, was im Boden liegt. Möhren zum Beispiel.',
  },
  {
    show: 'himym', mod: 'lorelai',
    q: 'Was ist Ted Mosby von Beruf?',
    right: 'Architekt', wrong: ['Bäcker', 'Tierarzt', 'Pilot'],
    ask: 'Ted erzählt gern lange Geschichten. Meine Frage ist kürzer. Versprochen.',
    quip: 'Ein Architekt, der Häuser plant, aber bei der Liebe improvisiert. Das ist Dramaturgie, kein Vorwurf.',
  },
  {
    show: 'gilmore', mod: 'logan',
    q: 'Wo in Stars Hollow holt Lorelai Gilmore ihren Kaffee, so gut wie jeden Morgen?',
    right: 'Luke’s Diner', wrong: ['Central Perk', 'Monk’s Café', 'Moe’s Taverne'],
    ask: 'Gilmore-Frage. Lorelai sitzt schon auf der Armlehne und zappelt. Befangenheit, Lorelai. Wir hatten das.',
    quip: 'Ein Lokal, in dem der Kaffee nie ausgeht. Lorelai, nicke bitte nicht so heftig.',
  },
  {
    show: 'friends', mod: 'logan',
    q: 'Ross hat ein Haustier namens Marcel. Was für ein Tier ist das?',
    right: 'Ein Affe', wrong: ['Ein Kaninchen', 'Ein Papagei', 'Eine Schildkröte'],
    ask: 'Friends, Tierfrage! Ich bin Fachmann. Ich bin ja selbst eins.',
    quip: 'Ein Affe als Mitbewohner. Wir Kaninchen bleiben bei Möhren und weniger Verantwortung.',
  },
  {
    show: 'himym', mod: 'lorelai',
    q: 'Was klaut Ted gleich in der allerersten Folge für Robin?',
    right: 'Ein blaues Waldhorn', wrong: ['Eine goldene Posaune', 'Eine rote E-Gitarre', 'Ein grünes Akkordeon'],
    ask: 'Vorletzte Frage! Es geht um Romantik mit krimineller Energie.',
    quip: 'Ein geklautes Instrument als Liebesbeweis. Romantik ist Auslegungssache.',
  },
  {
    show: 'gilmore', mod: 'lorelai',
    q: 'Welche Universität besucht Rory Gilmore nach der Highschool?',
    right: 'Yale', wrong: ['Stanford', 'Sorbonne', 'Universität Heidelberg'],
    ask: 'Allerletzte Frage! Gilmore Girls. Ich bin weiterhin befangen und weiterhin bester Laune.',
    quip: 'Eine altehrwürdige Uni, viele Bücher, noch mehr Kaffee. Das ist praktisch Lorelai-Energie.',
  },
];

const RIGHT = {
  lorelai: [
    'Richtig! Das war schnell. Fast so schnell wie ich nach dem zweiten Kaffee.',
    'Ja! Volltreffer. Ich würde applaudieren, aber ich halte meine Tasse.',
    'Genau! Du bist gefährlich gut. Ich notiere das.',
    'Richtig. Ich bin beeindruckt, und ich bin nur selten beeindruckt. Meistens bin ich koffeiniert.',
    'Bingo! Ein Punkt für dich und eine kleine Kaffeebohne für mich, aus Prinzip.',
    'Korrekt! Dein Sofa-Wissen ist beunruhigend gut.',
    'Stimmt! Ich wollte gerade selbst antworten. Es ist gut, dass ich Moderatorin bin.',
  ],
  logan: [
    'Richtig. Gemütlich gewusst.',
    'Jawoll. Dafür gibt es einen imaginären Keks. Ich esse ihn schon mal.',
    'Stimmt. Ich lehne mich zufrieden zurück, das Sofa auch.',
    'Genau so. Das war entspannt und trotzdem brillant.',
    'Richtig! Ich bin stolz. Ich sage das mit vollem Mund.',
    'Treffer. Das Sofa vibriert vor Anerkennung. Oder das bin ich beim Kauen.',
    'Korrekt. Ich klatsche, sobald ich die Pfoten frei habe.',
  ],
};

const WRONG = {
  lorelai: [
    'Nein, leider nicht. Aber der Kaffee schmeckt trotzdem.',
    'Autsch, knapp daneben. Okay, nicht knapp. Aber mutig!',
    'Falsch! Aber mit Stil, und das zählt bei mir halb.',
    'Nope. Keine Sorge, ich habe schon schlimmer geraten. Gestern. Beim Frühstück.',
    'Das war es nicht. Ich vermute einen akuten Koffeinmangel.',
    'Daneben! Ich reiche dir innerlich einen Espresso.',
    'Leider nein. Aber so wird ein Quiz erst spannend.',
  ],
  logan: [
    'Hm, nicht ganz. Macht nichts. Fehler sind wie Kekskrümel: Sie gehören zum Sofa.',
    'Leider falsch. Aber du siehst dabei gut aus.',
    'Nö. Ehrlich gesagt hätte ich auch geraten. Mit geschlossenen Augen. Im Liegen.',
    'Daneben. Kein Drama, wir haben noch Kekse.',
    'Falsch, aber sympathisch falsch.',
    'Das war es leider nicht. Atme durch, nimm einen Schluck Tee.',
    'Knapp vorbei ist auch vorbei. Aber ein schönes Vorbei.',
  ],
};

const INTRO = [
  { who: 'lorelai', text: 'Willkommen zum großen Sofa-Quiz! Neun Fragen, drei Serien, null Gnade. Ich habe Kaffee. Wir fangen an, sobald der Kaffee wirkt.' },
  { who: 'logan', text: 'Ich bin für die Kekse und die Moderation zuständig. In dieser Reihenfolge. Du musst nur auf das Sofa schauen und raten.' },
  { who: 'lorelai', text: 'Noch ein Hinweis: Bei den Gilmore-Fragen bin ich befangen, wegen Namensvetterin und so. Das ist kein Grund, mich zu disqualifizieren.' },
];

const INTER = {
  3: {
    who: 'logan',
    by: [
      'Null von drei. Das ist keine Niederlage, das ist ein Anlauf mit Ansage.',
      'Eins von drei. Ein Anfang! Rom wurde auch nicht an einem Tag gebaut. Sofas übrigens auch nicht.',
      'Zwei von drei. Solide, und das Sofa wippt anerkennend.',
      'Drei von drei! Ich bestelle sofort einen Keks zum Feiern. Vegan, versteht sich.',
    ],
  },
  6: {
    who: 'lorelai',
    by: (n) => {
      if (n <= 1) return `${n} von 6. Das Sofa ist trotzdem gemütlich, und drei Fragen sind noch übrig. Alles ist möglich.`;
      if (n <= 3) return `${n} von 6. Es kommt noch Bewegung ins Spiel, ich spüre es in meiner Tasse.`;
      if (n === 4) return '4 von 6. Das ist stark! Du sitzt offenbar richtig gut auf diesem Sofa.';
      return `${n} von 6! Ich benachrichtige die Jury. Es gibt keine Jury, aber ich benachrichtige sie.`;
    },
  },
};

const BREAKS = [
  'Kurze Werbepause: Logan isst einen Keks. Lorelai trinkt Kaffee. Danke für Ihre Aufmerksamkeit.',
  'Werbepause! Heute präsentiert von: Kaffee, Keksen und einem ziemlich weichen Sofa.',
];

const TITLES = [
  { min: 9, name: 'Sofa-Legende', who: 'lorelai', text: 'Neun von neun. Ich bin sprachlos. Das passiert mir zweimal im Jahr, und dann nur bei Kaffeemangel.' },
  { min: 7, name: 'Serien-Orakel', who: 'logan', text: 'Das war stark. Ich bin stolz, und das Sofa ist es auch. Das merkt man an den Federn.' },
  { min: 5, name: 'Stammgast auf dem Sofa', who: 'lorelai', text: 'Solide! Du kennst dich auf den Sofas dieser Welt aus. Mehr als die Hälfte, das ist ein Platz in der ersten Reihe.' },
  { min: 3, name: 'Couch-Kartoffel mit Potenzial', who: 'logan', text: 'Ein guter Anfang. Die Serien laufen zum Glück jederzeit wieder, das Sofa ist auch noch da.' },
  { min: 0, name: 'Frischer Sofa-Gast', who: 'lorelai', text: 'Das Sofa ist trotzdem bequem. Und wer weiß, vielleicht war heute einfach ein Tag ohne Kaffee.' },
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
    const stage = h('div', { class: 'stage-fill d04-stage' });
    const bg = h('img', { class: 'stage-bg d04-bg', src: ctx.img('d04-sofa'), alt: '', draggable: 'false' });
    const shadeLight = h('div', { class: 'd04-shade d04-shade-light' });
    const shadeDark = h('div', { class: 'd04-shade d04-shade-dark' });
    const spots = h('div', { class: 'd04-spots', 'aria-hidden': 'true' }, h('i', { class: 'd04-spot a' }), h('i', { class: 'd04-spot b' }));
    const screen = h('div', { class: 'd04-screen' });
    stage.append(bg, shadeLight, shadeDark, spots, screen);
    root.append(stage);

    let score = 0;
    let streak = 0;
    let results = []; // true | false je Frage

    const setDim = (on) => stage.classList.toggle('dim', on);

    // ---------- Moderation: Gesicht + Sprechblase ----------
    function makeTalker() {
      const face = h('div', { class: 'd04-face' });
      const who = h('span', { class: 'who' });
      const said = h('p', { class: 'd04-said' });
      const bubble = h('div', { class: 'd04-bubble', role: 'status', 'aria-live': 'polite' }, who, said);
      const el = h('div', { class: 'd04-talk' }, face, bubble);
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

      function say(who_, text, { anim = '' } = {}) {
        clearInterval(typer);
        if (current !== who_) {
          current = who_;
          face.replaceChildren(ctx.bunnyFace(who_, { size: 60 }));
          face.classList.remove('pop');
          // eslint-disable-next-line no-unused-expressions
          face.offsetWidth;
          face.classList.add('pop');
          who.textContent = NAME[who_];
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
      return { el, say, finish };
    }

    function pips(list, current = -1) {
      return h('div', { class: 'd04-pips', 'aria-hidden': 'true' },
        QUESTIONS.map((_, i) => h('i', {
          class: 'd04-pip' + (list[i] === true ? ' ok' : list[i] === false ? ' no' : '') + (i === current ? ' now' : ''),
        })));
    }

    const swap = (...kids) => {
      screen.replaceChildren(...kids);
      screen.scrollTop = 0;
      screen.classList.remove('enter');
      // eslint-disable-next-line no-unused-expressions
      screen.offsetWidth;
      screen.classList.add('enter');
    };

    // ---------- Einstieg ----------
    function showIntro() {
      busy = false;
      setDim(false);
      score = 0;
      streak = 0;
      results = [];
      const talker = makeTalker();
      let n = 0;
      const best = ctx.store.get('best', 0);
      const title = h('div', { class: 'd04-intro-title' },
        h('span', { class: 'd04-kicker' }, 'Heute live vom Sofa'),
        h('h2', { class: 'display' }, 'Das große Sofa-Quiz'),
        h('div', { class: 'd04-tags' },
          Object.entries(SHOW_NAMES).map(([k, v]) => h('span', { class: `d04-tag ${k}` }, v))),
        best > 0 ? h('p', { class: 'd04-best small' }, `Dein bisheriger Rekord: ${best} von 9`) : null);
      const next = button('Weiter', () => {
        n++;
        if (n < INTRO.length) {
          talker.say(INTRO[n].who, INTRO[n].text, { anim: 'hop' });
          if (n === INTRO.length - 1) next.textContent = 'Los geht’s!';
        } else {
          showQuestion(0);
        }
      });
      swap(title, h('div', { class: 'd04-intro-bottom' }, talker.el, next));
      later(() => talker.say(INTRO[0].who, INTRO[0].text, { anim: 'hop' }), 450);
    }

    // ---------- Frage ----------
    function showQuestion(i) {
      busy = false;
      setDim(true);
      const Q = QUESTIONS[i];
      const talker = makeTalker();
      const opts = shuffle([Q.right, ...Q.wrong]);
      const letters = ['A', 'B', 'C', 'D'];

      const card = h('div', { class: 'd04-q' },
        h('div', { class: 'd04-q-top' },
          h('span', { class: `d04-tag ${Q.show}` }, SHOW_NAMES[Q.show]),
          h('span', { class: 'd04-count' }, `Frage ${i + 1} von ${QUESTIONS.length}`)),
        h('p', { class: 'd04-q-text display' }, Q.q));

      const next = button(i === QUESTIONS.length - 1 ? 'Zur Auswertung' : 'Weiter', () => {
        if (busy) return;
        busy = true;
        const done = i + 1;
        if ((done === 3 || done === 6) && done < QUESTIONS.length) showInter(done);
        else if (done < QUESTIONS.length) showQuestion(done);
        else showFinal();
      });
      next.classList.add('d04-next');
      next.disabled = true;

      const buttons = opts.map((text, k) => {
        const b = h('button', { class: 'd04-ans', type: 'button' },
          h('span', { class: 'd04-letter' }, letters[k]),
          h('span', { class: 'd04-ans-text' }, text),
          h('span', { class: 'd04-mark', 'aria-hidden': 'true' }));
        b.addEventListener('click', () => answer(b, text));
        return b;
      });

      let answered = false;
      function answer(b, text) {
        if (answered) return;
        answered = true;
        const ok = text === Q.right;
        results[i] = ok;
        buttons.forEach((x) => {
          x.disabled = true;
          const t = x.querySelector('.d04-ans-text').textContent;
          if (t === Q.right) {
            x.classList.add('right');
            x.querySelector('.d04-mark').textContent = '✓';
          } else if (x === b) {
            x.classList.add('wrong');
            x.querySelector('.d04-mark').textContent = '✗';
          } else x.classList.add('dim');
        });
        const pip = progress.children[i];
        pip.classList.add(ok ? 'ok' : 'no');
        if (ok) {
          score++;
          streak++;
          ctx.sfx.play('chime');
          haptic(14);
          ctx.fx.burstAt(b, { count: 22, kind: 'star', power: 190 });
        } else {
          streak = 0;
          ctx.sfx.play('wrong');
          haptic(30);
          b.classList.add('shake');
        }
        scoreEl.textContent = `${score} ${score === 1 ? 'Punkt' : 'Punkte'}`;
        let msg = draw(ok ? `r-${Q.mod}` : `w-${Q.mod}`, (ok ? RIGHT : WRONG)[Q.mod]);
        if (!ok) msg += ` Richtig wäre „${Q.right}“ gewesen.`;
        msg += ' ' + Q.quip;
        if (ok && streak === 3) {
          msg = 'Drei richtige in Folge! ' + msg;
          ctx.fx.burst(innerWidth / 2, innerHeight * 0.3, { count: 34, kind: 'spark', power: 260 });
        }
        talker.say(Q.mod, msg, { anim: ok ? 'hop' : 'shake' });
        next.disabled = false;
        next.classList.add('ready');
      }

      const progress = pips(results, i);
      const scoreEl = h('span', { class: 'd04-score' }, `${score} ${score === 1 ? 'Punkt' : 'Punkte'}`);
      const top = h('div', { class: 'd04-top' }, progress, scoreEl);
      swap(top, talker.el, card, h('div', { class: 'd04-answers' }, buttons), h('div', { class: 'd04-foot' }, next));
      later(() => { if (!answered) talker.say(Q.mod, Q.ask); }, 250); // nicht über schon gezeigte Rückmeldung legen
    }

    // ---------- Zwischenstand ----------
    function showInter(done) {
      busy = false;
      const cfg = INTER[done];
      const part = results.slice(0, done).filter(Boolean).length;
      const talker = makeTalker();
      const text = typeof cfg.by === 'function' ? cfg.by(part) : cfg.by[part];
      ctx.sfx.play('bell');
      const card = h('div', { class: 'd04-inter' },
        h('span', { class: 'd04-kicker' }, 'Zwischenstand'),
        h('p', { class: 'd04-bigscore display' }, `${part} von ${done}`),
        pips(results),
        h('p', { class: 'd04-break' }, draw('breaks', BREAKS)));
      const next = button(done === 3 ? 'Weiter zu Frage 4' : 'Weiter zu Frage 7', () => {
        if (busy) return;
        busy = true;
        showQuestion(done);
      });
      swap(h('div', { class: 'd04-inter-wrap' }, card, talker.el), h('div', { class: 'd04-foot' }, next));
      later(() => talker.say(cfg.who, text, { anim: 'hop' }), 350);
    }

    // ---------- Auswertung ----------
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
      ctx.sfx.play(total >= 7 ? 'fanfare' : total >= 3 ? 'success' : 'bell');
      if (total >= 7) later(() => ctx.fx.confetti({ count: 110 }), 300);
      else if (total >= 3) later(() => ctx.fx.burst(innerWidth / 2, innerHeight * 0.3, { count: 30, kind: 'star' }), 300);

      const cert = h('div', { class: 'd04-cert' },
        h('span', { class: 'd04-kicker' }, 'Sofa-Urkunde'),
        h('p', { class: 'd04-bigscore display' }, `${total} von ${QUESTIONS.length}`),
        pips(results),
        h('p', { class: 'd04-cert-line' }, 'Hiermit wird dir der Titel verliehen:'),
        h('p', { class: 'd04-cert-title display' }, T.name),
        h('p', { class: 'd04-sign hand' }, 'Lorelai & Logan'));
      const again = button('Noch einmal spielen', () => showIntro(), { variant: 'ghost' });
      const back = button('Zurück zum Berg', () => ctx.close());
      swap(h('div', { class: 'd04-final' }, cert, talker.el), h('div', { class: 'd04-foot d04-final-foot' }, back, again));
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
