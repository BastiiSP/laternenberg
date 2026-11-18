// Türchen 2 · Die Teestube am Bach – Tee wählen, echte Ziehzeit, Vorlesegeschichte.
import './d02.css';

const TEAS = [
  {
    id: 'gipfel',
    name: 'Gipfelglück',
    desc: 'Grüntee, Minze und ein Hauch Bergluft. Macht wach, aber freundlich.',
    rgb: [168, 160, 58],
    wisdom: 'Wer langsam trinkt, kommt trotzdem oben an.',
  },
  {
    id: 'kamin',
    name: 'Kaminknistern',
    desc: 'Rooibos, Zimt und Orangenschale. Knistert nicht wirklich, fühlt sich aber so an.',
    rgb: [152, 50, 26],
    wisdom: 'Ein warmer Becher in kalten Händen ist auch eine Art Umarmung.',
  },
  {
    id: 'hase',
    name: 'Hasenpfote',
    desc: 'Kamille, Apfel, Löwenzahn. Lorelai sagt: schmeckt nach Wiese. Logan sagt: eben.',
    rgb: [212, 156, 44],
    wisdom: 'Manche Fragen beantwortet man am besten mit noch einer Tasse.',
  },
];

const STORY_TITLE = 'Der Glimmling im Teekessel';
const STORY = [
  'Es schneite so dicht, dass sogar der Bach leiser plätscherte. In der Teestube saß Logan auf dem dicken Kissen und wartete darauf, dass der Kessel pfiff.',
  'Aber der Kessel pfiff nicht. Er summte. Und zwar ziemlich schief. Lorelai hob den Deckel an. „Das ist kein Wasser“, sagte sie. „Das ist ein Glimmling. Und er badet in unserem Tee.“',
  'Der Glimmling winkte verlegen. Er habe sich oben in der Laterne erkältet, erklärte er, und nichts helfe so gut wie ein heißes Bad. Logan fand das vollkommen vernünftig. Lorelai fand, so etwas müsse man vorher ankündigen. Schriftlich.',
  'Also kochten sie neues Wasser im kleinen Topf. Logan stellte drei Tassen hin, dann eine vierte, winzige, aus der Puppenkiste. Lorelai murmelte etwas von Kaffee, setzte sich aber trotzdem dazu.',
  'Als der Glimmling trocken und warm auf dem Tassenrand saß, leuchtete er so hell, dass die ganze Teestube golden wurde. „Zum Dank“, piepste er, „hab ich euch ein bisschen Licht in den Tee gestreut.“',
  'Lorelai schnupperte misstrauisch. Es duftete nach Zimt, nach Schnee und ganz leise nach Glück. „Na gut“, sagte sie. „Aber nächstes Mal badest du im Kaffee.“ – „Bloß nicht“, sagte der Glimmling. „Dann schlaf ich ja nie wieder.“',
];

const BREW_MS = 180_000;
const REVEAL_AT = [0, 0.15, 0.31, 0.48, 0.65, 0.81];
const WATER = [206, 214, 208];

function sprite(r, rgb) {
  const c = document.createElement('canvas');
  c.width = c.height = r * 2;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, `rgba(${rgb},1)`);
  gr.addColorStop(0.45, `rgba(${rgb},0.42)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, r * 2, r * 2);
  return c;
}

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default {
  mount(root, ctx) {
    const { h, button, haptic } = ctx.ui;
    const { loop, fitCanvas, rand, clamp, lerp } = ctx.fx;
    const offs = [];
    const timers = new Set();
    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    };

    const bg = h('img', { class: 'stage-bg d02-bg', src: ctx.img('d02-teestube'), alt: '' });
    const shade = h('div', { class: 'stage-shade d02-shade' });
    const veil = h('div', { class: 'd02-veil' });
    root.append(bg, shade, veil);

    let view = null;
    let stopBrew = null;
    const show = (el) => {
      const old = view;
      if (old) {
        old.classList.add('d02-out');
        later(() => old.remove(), 450);
      }
      view = el;
      root.append(el);
      requestAnimationFrame(() => el.classList.add('d02-in'));
    };

    // ---------- 1. Auswahl ----------
    function choose() {
      stopBrew?.();
      stopBrew = null;
      root.classList.remove('d02-brewing');
      ctx.setHeader('dark');
      const cards = TEAS.map((t) =>
        h('button', { class: 'd02-tea', type: 'button', style: `--tea: rgb(${t.rgb})`, onclick: () => { ctx.sfx.play('tap'); haptic(); ready(t); } },
          h('span', { class: 'd02-swatch', 'aria-hidden': 'true' }),
          h('span', { class: 'd02-tea-text' },
            h('span', { class: 'd02-tea-name display' }, t.name),
            h('span', { class: 'd02-tea-desc' }, t.desc))));
      const el = h('div', { class: 'stage-scroll d02-view' },
        h('div', { class: 'd02-col' },
          h('div', { class: 'panel d02-pick' },
            h('p', { class: 'lead' }, 'Draußen schneit es, drinnen summt der Kessel. Logan hat schon Tassen hingestellt.'),
            h('p', { class: 'd02-ask display' }, 'Welcher Tee darf es sein?'),
            h('div', { class: 'd02-teas' }, cards))));
      show(el);
    }

    // ---------- 2. Echten Tee aufsetzen ----------
    function ready(tea) {
      const el = h('div', { class: 'stage-scroll d02-view' },
        h('div', { class: 'd02-col' },
          h('div', { class: 'panel d02-pick' },
            h('p', { class: 'chip' }, '✦ ' + tea.name),
            h('p', { class: 'lead' }, 'Mach dir am besten in echt auch einen Tee: Wasser heiß machen, Beutel in den Becher, aufgießen.'),
            h('p', { class: 'dim' }, 'Sobald deiner im Becher ist, lassen wir beide zusammen ziehen. Drei Minuten.'),
            h('div', { class: 'd02-btns' },
              button('Mein Tee ist im Becher', () => brew(tea)),
              button('Heute nur der hier', () => brew(tea), { variant: 'ghost small' })))));
      show(el);
    }

    // ---------- 3. Ziehzeit ----------
    function brew(tea) {
      root.classList.add('d02-brewing');
      const canvas = h('canvas', { class: 'd02-cup', 'aria-hidden': 'true' });
      const time = h('p', { class: 'd02-time display', 'aria-live': 'off' }, fmt(BREW_MS));
      const label = h('p', { class: 'd02-label' }, `${tea.name} zieht`);
      const story = h('div', { class: 'd02-story' },
        h('p', { class: 'd02-story-title display' }, STORY_TITLE));
      const paras = STORY.map((s) => h('p', { class: 'd02-para reveal' }, s));
      const hurry = button('Ich hab’s eilig', () => fastForward(), { variant: 'ghost small' });
      const el = h('div', { class: 'stage-fill d02-view d02-brew' },
        h('div', { class: 'd02-cupwrap' }, canvas),
        h('div', { class: 'd02-timer' }, time, label),
        story,
        h('div', { class: 'd02-foot' }, hurry));
      show(el);

      const startAt = Date.now();
      let fast = null; // { from, p0 }
      let done = false;
      let shown = 0;

      const progress = () => {
        const now = Date.now();
        if (fast) return clamp(fast.p0 + (1 - fast.p0) * ((now - fast.from) / 3500));
        return clamp((now - startAt) / BREW_MS);
      };

      function revealUpTo(p, stagger = 0) {
        let k = 0;
        while (shown < paras.length && p >= REVEAL_AT[shown]) {
          const para = paras[shown];
          story.append(para);
          later(() => {
            para.classList.add('in');
            story.scrollTo({ top: story.scrollHeight, behavior: 'smooth' });
          }, 30 + k * stagger);
          if (stagger === 0 && shown > 0) ctx.sfx.play('page');
          shown++;
          k++;
        }
      }

      function fastForward() {
        if (done || fast) return;
        fast = { from: Date.now(), p0: progress() };
        hurry.disabled = true;
        label.textContent = 'Schnelldurchlauf …';
        revealUpTo(1, 260);
      }

      function finish() {
        done = true;
        clearInterval(tick);
        time.textContent = '0:00';
        label.textContent = 'fertig gezogen';
        hurry.remove();
        ctx.sfx.bell(130.81, { vol: 0.2, dur: 4.5 });
        ctx.sfx.bell(196, { vol: 0.12, dur: 4, at: 0.03 });
        ctx.sfx.bell(261.63, { vol: 0.06, dur: 3, at: 0.05 });
        haptic(40);
        el.classList.add('d02-done');
        const again = button('Noch einen Tee', () => choose(), { variant: 'dark small' });
        const card = h('div', { class: 'card d02-result reveal' },
          h('p', { class: 'd02-gong display' }, 'Dein Tee ist fertig.'),
          h('p', { class: 'd02-wisdom' }, `„${tea.wisdom}“`),
          h('p', { class: 'small dim' }, '– alte Teestuben-Weisheit, vermutlich von Logan'),
          // BASTI-STIMME
          h('p', { class: 'd02-basti hand' }, 'Lass ihn dir schmecken. Ich denk an dich.'),
          h('div', { class: 'd02-btns' }, button('Zurück zum Berg', () => ctx.close()), again));
        story.append(card);
        later(() => {
          card.classList.add('in');
          story.scrollTo({ top: card.offsetTop - 12, behavior: 'smooth' });
        }, 400);
        ctx.complete();
      }

      const update = () => {
        if (done) return;
        const p = progress();
        const remain = fast ? BREW_MS * (1 - p) : BREW_MS - (Date.now() - startAt);
        time.textContent = fmt(remain);
        revealUpTo(p);
        if (p >= 1) finish();
      };
      const tick = setInterval(update, 250);
      const onVis = () => { if (!document.hidden) update(); };
      document.addEventListener('visibilitychange', onVis);
      update();

      // ---- Tasse, Dampf und Ring auf dem Canvas ----
      let W = 300, H = 340, g = null;
      const fit = () => {
        const r = fitCanvas(canvas);
        W = r.w;
        H = r.h;
        g = r.ctx;
      };
      requestAnimationFrame(fit);
      window.addEventListener('resize', fit);
      const steamImg = sprite(48, '255,248,236');
      const swirlImg = sprite(32, tea.rgb.join(','));
      const steam = [];
      let spawn = 0;
      const few = ctx.reducedMotion;
      const swirls = Array.from({ length: 7 }, (_, i) => ({ a: rand(6.28), d: rand(0.2, 1), s: rand(0.15, 0.4) * (i % 2 ? 1 : -1) }));

      const stop = loop((dt, t) => {
        if (document.hidden || !g) return;
        const p = progress();
        const S = W; // Tassenmaß
        const oy = H - S; // Tasse sitzt unten
        const X = (u) => u * S;
        const Y = (v) => oy + v * S;
        const strength = 1 - Math.exp(-3.2 * p);
        const col = WATER.map((c, i) => Math.round(lerp(c, tea.rgb[i], strength)));
        g.clearRect(0, 0, W, H);

        // warmer Lichtfleck hinter der Tasse
        const glow = g.createRadialGradient(X(0.5), Y(0.62), 0, X(0.5), Y(0.62), S * 0.62);
        glow.addColorStop(0, 'rgba(255,190,110,0.22)');
        glow.addColorStop(1, 'rgba(255,190,110,0)');
        g.fillStyle = glow;
        g.fillRect(0, 0, W, H);

        // Ring (Rückseite)
        const cx = X(0.5), cy = Y(0.81), rx = S * 0.46, ry = S * 0.115;
        const ring = (front) => {
          g.lineCap = 'round';
          g.lineWidth = 1.2;
          g.strokeStyle = 'rgba(255,214,150,0.18)';
          g.beginPath();
          if (front) g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
          else g.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
          g.stroke();
          const a0 = Math.PI / 2, a1 = a0 + Math.PI * 2 * p;
          g.lineWidth = 2.6;
          g.strokeStyle = 'rgba(255,200,110,0.92)';
          g.beginPath();
          let pen = false;
          for (let a = a0; a <= a1 + 0.0001; a += 0.04) {
            const isFront = Math.sin(a) >= 0;
            const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
            if (isFront === front) {
              if (!pen) { g.moveTo(x, y); pen = true; } else g.lineTo(x, y);
            } else pen = false;
          }
          g.stroke();
          if (Math.sin(a1) >= 0 === front && p > 0) {
            const hx = cx + Math.cos(a1) * rx, hy = cy + Math.sin(a1) * ry;
            const hg = g.createRadialGradient(hx, hy, 0, hx, hy, 12);
            hg.addColorStop(0, 'rgba(255,240,200,0.95)');
            hg.addColorStop(1, 'rgba(255,180,90,0)');
            g.fillStyle = hg;
            g.beginPath();
            g.arc(hx, hy, 12, 0, 6.283);
            g.fill();
          }
        };
        ring(false);

        // Untertasse
        g.fillStyle = 'rgba(20,8,2,0.35)';
        g.beginPath();
        g.ellipse(X(0.5), Y(0.835), S * 0.4, S * 0.09, 0, 0, 6.283);
        g.fill();
        let sg = g.createLinearGradient(X(0.1), 0, X(0.9), 0);
        sg.addColorStop(0, '#f3e6d0');
        sg.addColorStop(0.5, '#fbf3e4');
        sg.addColorStop(1, '#c9b394');
        g.fillStyle = sg;
        g.beginPath();
        g.ellipse(X(0.5), Y(0.81), S * 0.4, S * 0.09, 0, 0, 6.283);
        g.fill();
        g.strokeStyle = 'rgba(150,40,40,0.55)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.ellipse(X(0.5), Y(0.81), S * 0.36, S * 0.075, 0, 0, 6.283);
        g.stroke();

        // Henkel
        g.strokeStyle = '#e9dcc6';
        g.lineWidth = S * 0.032;
        g.beginPath();
        g.ellipse(X(0.79), Y(0.585), S * 0.065, S * 0.075, -0.2, -1.4, 1.6);
        g.stroke();

        // Tassenkörper
        g.beginPath();
        g.moveTo(X(0.23), Y(0.48));
        g.bezierCurveTo(X(0.23), Y(0.67), X(0.33), Y(0.79), X(0.5), Y(0.79));
        g.bezierCurveTo(X(0.67), Y(0.79), X(0.77), Y(0.67), X(0.77), Y(0.48));
        g.ellipse(X(0.5), Y(0.48), S * 0.27, S * 0.07, 0, 0, Math.PI);
        g.closePath();
        const bgc = g.createLinearGradient(X(0.23), 0, X(0.77), 0);
        bgc.addColorStop(0, '#fff7ea');
        bgc.addColorStop(0.35, '#f8ecd8');
        bgc.addColorStop(0.8, '#d6c0a0');
        bgc.addColorStop(1, '#a88e70');
        g.fillStyle = bgc;
        g.fill();
        // Beeren-Muster
        const berry = (u, v, r) => {
          g.fillStyle = '#b8323a';
          g.beginPath();
          g.arc(X(u), Y(v), S * r, 0, 6.283);
          g.fill();
          g.fillStyle = 'rgba(255,255,255,0.5)';
          g.beginPath();
          g.arc(X(u) - S * r * 0.35, Y(v) - S * r * 0.35, S * r * 0.3, 0, 6.283);
          g.fill();
        };
        g.fillStyle = '#5c7a45';
        for (const [u, v, a] of [[0.43, 0.63, -0.6], [0.55, 0.62, 0.5], [0.5, 0.67, 1.6]]) {
          g.save();
          g.translate(X(u), Y(v));
          g.rotate(a);
          g.beginPath();
          g.ellipse(0, 0, S * 0.04, S * 0.016, 0, 0, 6.283);
          g.fill();
          g.restore();
        }
        berry(0.47, 0.645, 0.016);
        berry(0.505, 0.635, 0.014);
        berry(0.49, 0.67, 0.013);

        // Rand
        g.fillStyle = '#efe2cc';
        g.beginPath();
        g.ellipse(X(0.5), Y(0.48), S * 0.27, S * 0.07, 0, 0, 6.283);
        g.fill();

        // Flüssigkeit
        g.save();
        g.beginPath();
        g.ellipse(X(0.5), Y(0.487), S * 0.248, S * 0.057, 0, 0, 6.283);
        g.clip();
        const lg = g.createLinearGradient(0, Y(0.43), 0, Y(0.545));
        lg.addColorStop(0, `rgb(${col.map((c) => c * 0.62).join(',')})`);
        lg.addColorStop(1, `rgb(${col.join(',')})`);
        g.fillStyle = lg;
        g.fillRect(X(0.2), Y(0.42), S * 0.6, S * 0.14);
        // Teefahnen, die sich vom Beutel aus verteilen
        if (strength < 0.97) {
          for (const s of swirls) {
            const ang = s.a + t * s.s;
            const d = (0.04 + 0.2 * Math.min(1, p * 4 + 0.15)) * s.d;
            const x = X(0.6) + Math.cos(ang) * S * d;
            const y = Y(0.49) + Math.sin(ang) * S * d * 0.24;
            g.globalAlpha = 0.5 * (1 - strength);
            const rr = S * (0.05 + 0.08 * p);
            g.drawImage(swirlImg, x - rr, y - rr * 0.45, rr * 2, rr * 0.9);
          }
          g.globalAlpha = 1;
        }
        // Lichtreflex
        g.globalAlpha = 0.28 + 0.05 * Math.sin(t * 1.3);
        g.fillStyle = '#fff6e0';
        g.beginPath();
        g.ellipse(X(0.42), Y(0.47), S * 0.09, S * 0.012, -0.05, 0, 6.283);
        g.fill();
        g.globalAlpha = 1;
        g.restore();
        // Innenkante
        g.strokeStyle = 'rgba(120,90,60,0.35)';
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(X(0.5), Y(0.487), S * 0.248, S * 0.057, 0, 0, 6.283);
        g.stroke();

        // Teebeutel-Faden und Etikett
        const swing = Math.sin(t * 1.1) * 0.07;
        g.strokeStyle = 'rgba(245,235,215,0.9)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(X(0.62), Y(0.49));
        g.quadraticCurveTo(X(0.72), Y(0.43), X(0.755), Y(0.455));
        g.quadraticCurveTo(X(0.79), Y(0.52), X(0.8) + swing * S * 0.2, Y(0.6));
        g.stroke();
        g.save();
        g.translate(X(0.8) + swing * S * 0.2, Y(0.6));
        g.rotate(swing);
        g.fillStyle = `rgb(${tea.rgb.map((c) => Math.min(255, c + 50)).join(',')})`;
        g.fillRect(-S * 0.03, 0, S * 0.06, S * 0.07);
        g.fillStyle = 'rgba(255,250,235,0.9)';
        g.font = `${Math.round(S * 0.04)}px serif`;
        g.textAlign = 'center';
        g.fillText('✦', 0, S * 0.048);
        g.restore();

        ring(true);

        // Dampf
        spawn += dt * (few ? 4 : 13) * (0.75 + 0.25 * Math.sin(t * 0.7));
        while (spawn > 1) {
          spawn--;
          steam.push({ x: X(rand(0.36, 0.64)), y: Y(0.47), age: 0, life: rand(2.6, 4.2), ph: rand(6.28), amp: rand(10, 26), r0: rand(6, 10), r1: rand(26, 44), vy: rand(30, 46) });
        }
        g.globalCompositeOperation = 'lighter';
        for (let i = steam.length - 1; i >= 0; i--) {
          const s = steam[i];
          s.age += dt;
          if (s.age > s.life) { steam.splice(i, 1); continue; }
          const k = s.age / s.life;
          const x = s.x + Math.sin(s.ph + s.age * 1.4 + t * 0.4) * s.amp * k;
          const y = s.y - s.vy * s.age * (1 - k * 0.25);
          const r = lerp(s.r0, s.r1, k);
          g.globalAlpha = 0.15 * Math.pow(Math.sin(Math.PI * k), 1.3);
          g.drawImage(steamImg, x - r, y - r, r * 2, r * 2);
        }
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      });

      stopBrew = () => {
        stop();
        clearInterval(tick);
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('resize', fit);
      };
    }

    choose();

    offs.push(() => stopBrew?.());
    return () => {
      offs.forEach((f) => f());
      timers.forEach((id) => clearTimeout(id));
    };
  },
};
